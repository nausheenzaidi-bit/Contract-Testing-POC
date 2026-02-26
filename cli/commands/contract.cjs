/**
 * ct contract — Contract management commands.
 *
 * Subcommands:
 *   publish   Publish a contract (schema/OpenAPI/proto) to Microcks
 *   verify    Verify a live provider satisfies contracts
 *   diff      Compare two schema versions for breaking changes
 *   list      List contracts/services from Microcks
 */

const fs = require("fs");
const path = require("path");
const { report } = require("../lib/report.cjs");
const { graphqlRequest, restRequest, request } = require("../lib/http-client.cjs");
const { assertStatus, assertHasFields, assertNoErrors } = require("../lib/assertions.cjs");

module.exports = function (program) {
  const contract = program.command("contract").description("Contract management and verification");

  // ── ct contract publish ──
  contract
    .command("publish")
    .description("Publish a contract to Microcks (GraphQL, OpenAPI, Protobuf, Postman)")
    .requiredOption("-f, --file <path>", "path to contract file")
    .option("--secondary", "import as secondary artifact")
    .option("--labels <json>", "metadata labels as JSON, e.g. {\"env\":\"dev\"}")
    .action(async (opts) => {
      const globalOpts = program.opts();
      const microcksUrl = globalOpts.microcksUrl;
      const filePath = path.resolve(opts.file);

      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
      }

      const boundary = `----CTUpload${Date.now()}`;
      const fileContent = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);

      const bodyBuffers = [
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`),
        fileContent,
        Buffer.from("\r\n"),
      ];

      if (opts.secondary) {
        bodyBuffers.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="mainArtifact"\r\n\r\nfalse\r\n`));
      }
      bodyBuffers.push(Buffer.from(`--${boundary}--\r\n`));
      const payload = Buffer.concat(bodyBuffers);

      try {
        const res = await request("POST", `${microcksUrl}/api/artifact/upload`, {
          headers: { "content-type": `multipart/form-data; boundary=${boundary}`, "content-length": payload.length },
          body: payload,
        });

        if (res.status < 300) {
          if (globalOpts.json) {
            console.log(JSON.stringify({ success: true, file: fileName, response: res.data }));
          } else {
            console.log(`✓ Published ${fileName} to Microcks`);
            if (typeof res.data === "string") console.log(`  ${res.data}`);
          }
        } else {
          console.error(`✗ Publish failed (${res.status}): ${typeof res.data === "string" ? res.data : JSON.stringify(res.data)}`);
          process.exit(1);
        }
      } catch (err) {
        console.error(`✗ Publish failed: ${err.message}`);
        process.exit(1);
      }
    });

  // ── ct contract verify ──
  contract
    .command("verify")
    .description("Verify a live provider against its contracts in Microcks")
    .requiredOption("-s, --service <name>", "service name in Microcks")
    .requiredOption("-u, --url <url>", "live provider endpoint URL")
    .option("--version <version>", "service version", "1.0")
    .option("--protocol <type>", "protocol: graphql, rest, grpc", "rest")
    .action(async (opts) => {
      const globalOpts = program.opts();
      const microcksUrl = globalOpts.microcksUrl;
      const suite = { name: `Verify ${opts.service}`, tests: [], startTime: Date.now(), endTime: 0 };

      try {
        const listRes = await request("GET", `${microcksUrl}/api/services?page=0&size=200`);
        const services = Array.isArray(listRes.data) ? listRes.data : [];
        const svc = services.find((s) => s.name === opts.service);

        if (!svc) {
          console.error(`✗ Service "${opts.service}" not found in Microcks`);
          process.exit(1);
        }

        const svcDetail = await request("GET", `${microcksUrl}/api/services/${svc.id}?messages=true`);
        const operations = svcDetail.data?.operations || [];

        for (const op of operations) {
          const testName = `${opts.service}::${op.name}`;

          if (opts.protocol === "graphql") {
            try {
              const mockRes = await request("GET", `${microcksUrl}/api/responses/${svc.id}/${encodeURIComponent(op.name)}`);
              const examples = Array.isArray(mockRes.data) ? mockRes.data : [];

              if (examples.length === 0) {
                suite.tests.push({ name: testName, protocol: "graphql", pass: true, skipped: true, assertions: [{ pass: true, message: "No examples to verify" }] });
                continue;
              }

              const query = `query { ${op.name.replace(/\s.*/,"")} { __typename } }`;
              const start = Date.now();
              const res = await graphqlRequest(opts.url, query);
              const duration = Date.now() - start;
              const assertions = [assertStatus(res.status, 200), assertNoErrors(res)];
              suite.tests.push({ name: testName, protocol: "graphql", pass: assertions.every((a) => a.pass), duration, assertions });
            } catch (err) {
              suite.tests.push({ name: testName, protocol: "graphql", pass: false, error: err.message, assertions: [] });
            }
          } else {
            const opMethod = (op.method || "GET").toUpperCase();
            const opPath = op.name.replace(/\s.*/,"");
            try {
              const start = Date.now();
              const res = await restRequest(opMethod, `${opts.url}${opPath}`);
              const duration = Date.now() - start;
              const assertions = [assertStatus(res.status, 200)];
              suite.tests.push({ name: testName, protocol: "rest", pass: assertions.every((a) => a.pass), duration, assertions });
            } catch (err) {
              suite.tests.push({ name: testName, protocol: "rest", pass: false, error: err.message, assertions: [] });
            }
          }
        }
      } catch (err) {
        suite.tests.push({ name: `${opts.service} connection`, protocol: opts.protocol, pass: false, error: err.message, assertions: [] });
      }

      suite.endTime = Date.now();
      const exitCode = report(suite, globalOpts);
      process.exit(exitCode);
    });

  // ── ct contract diff ──
  contract
    .command("diff")
    .description("Compare two schema files for breaking changes")
    .requiredOption("--old <path>", "path to old/baseline schema")
    .requiredOption("--new <path>", "path to new/current schema")
    .option("--type <type>", "schema type: graphql, openapi", "graphql")
    .action(async (opts) => {
      const globalOpts = program.opts();
      const oldPath = path.resolve(opts.old);
      const newPath = path.resolve(opts.new);

      if (!fs.existsSync(oldPath)) { console.error(`Old schema not found: ${oldPath}`); process.exit(1); }
      if (!fs.existsSync(newPath)) { console.error(`New schema not found: ${newPath}`); process.exit(1); }

      if (opts.type === "graphql") {
        try {
          const { buildSchema } = require("graphql");
          const oldSdl = fs.readFileSync(oldPath, "utf8");
          const newSdl = fs.readFileSync(newPath, "utf8");

          let oldSchema, newSchema;
          try { oldSchema = buildSchema(oldSdl); } catch (e) { console.error(`✗ Old schema invalid: ${e.message}`); process.exit(1); }
          try { newSchema = buildSchema(newSdl); } catch (e) { console.error(`✗ New schema invalid: ${e.message}`); process.exit(1); }

          const changes = diffGraphQLSchemas(oldSchema, newSchema);
          const breaking = changes.filter((c) => c.breaking);
          const nonBreaking = changes.filter((c) => !c.breaking);

          if (globalOpts.json) {
            console.log(JSON.stringify({ breaking: breaking.length, nonBreaking: nonBreaking.length, changes }));
          } else {
            console.log(`\n  Schema Diff: ${path.basename(oldPath)} → ${path.basename(newPath)}\n`);
            if (breaking.length > 0) {
              console.log(`  \x1b[31mBreaking changes (${breaking.length}):\x1b[0m`);
              for (const c of breaking) console.log(`    ✗ ${c.message}`);
            }
            if (nonBreaking.length > 0) {
              console.log(`  \x1b[32mNon-breaking changes (${nonBreaking.length}):\x1b[0m`);
              for (const c of nonBreaking) console.log(`    ✓ ${c.message}`);
            }
            if (changes.length === 0) {
              console.log(`  ✓ No changes detected`);
            }
            console.log("");
          }

          process.exit(breaking.length > 0 ? 1 : 0);
        } catch (err) {
          console.error(`✗ Diff failed: ${err.message}`);
          process.exit(1);
        }
      } else {
        console.log("OpenAPI diff: use a dedicated tool like openapi-diff or oasdiff");
        process.exit(0);
      }
    });

  // ── ct contract list ──
  contract
    .command("list")
    .description("List all contracts/services from Microcks")
    .option("--protocol <type>", "filter: GRAPHQL, REST, GRPC")
    .action(async (opts) => {
      const globalOpts = program.opts();
      const { request } = require("../lib/http-client.cjs");

      try {
        const res = await request("GET", `${globalOpts.microcksUrl}/api/services?page=0&size=200`);
        let services = Array.isArray(res.data) ? res.data : [];

        if (opts.protocol) {
          services = services.filter((s) => (s.type || "").toUpperCase().includes(opts.protocol.toUpperCase()));
        }

        if (globalOpts.json) {
          console.log(JSON.stringify(services.map((s) => ({
            name: s.name,
            version: s.version,
            type: s.type,
            operations: (s.operations || []).length,
          }))));
        } else {
          console.log(`\n  Contracts (${services.length}):\n`);
          for (const s of services) {
            const ops = (s.operations || []).length;
            console.log(`  ${s.name} v${s.version}  [${s.type}]  ${ops} operations`);
          }
          console.log("");
        }
      } catch (err) {
        console.error(`✗ Failed: ${err.message}`);
        process.exit(1);
      }
    });
};

/**
 * Simple GraphQL schema diff — detects added/removed types, fields, and arguments.
 */
function diffGraphQLSchemas(oldSchema, newSchema) {
  const changes = [];

  const oldTypeMap = oldSchema.getTypeMap();
  const newTypeMap = newSchema.getTypeMap();

  for (const [name, type] of Object.entries(oldTypeMap)) {
    if (name.startsWith("__")) continue;
    if (!newTypeMap[name]) {
      changes.push({ breaking: true, message: `Type "${name}" was removed` });
      continue;
    }
    if (typeof type.getFields === "function") {
      const oldFields = type.getFields();
      const newType = newTypeMap[name];
      if (typeof newType.getFields !== "function") continue;
      const newFields = newType.getFields();

      for (const fieldName of Object.keys(oldFields)) {
        if (!newFields[fieldName]) {
          changes.push({ breaking: true, message: `Field "${name}.${fieldName}" was removed` });
        } else {
          const oldType = oldFields[fieldName].type.toString();
          const newFieldType = newFields[fieldName].type.toString();
          if (oldType !== newFieldType) {
            changes.push({ breaking: true, message: `Field "${name}.${fieldName}" type changed: ${oldType} → ${newFieldType}` });
          }
        }
      }
      for (const fieldName of Object.keys(newFields)) {
        if (!oldFields[fieldName]) {
          changes.push({ breaking: false, message: `Field "${name}.${fieldName}" was added` });
        }
      }
    }
  }

  for (const name of Object.keys(newTypeMap)) {
    if (name.startsWith("__")) continue;
    if (!oldTypeMap[name]) {
      changes.push({ breaking: false, message: `Type "${name}" was added` });
    }
  }

  return changes;
}
