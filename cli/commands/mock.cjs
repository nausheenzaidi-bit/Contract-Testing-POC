/**
 * ct mock — Mock server management commands
 *
 * Subcommands:
 *   import   Import schemas/contracts into Microcks
 *   status   Check mock server health
 *   list     List available services and operations
 *   expect   Set a mock expectation (variable-aware)
 */

const fs = require("fs");
const path = require("path");

module.exports = function (program) {
  const mock = program.command("mock").description("Mock server management");

  mock
    .command("import")
    .description("Import schema or contract into Microcks")
    .requiredOption("-f, --file <path>", "path to schema, OpenAPI spec, Postman collection, or Protobuf file")
    .option("--secondary", "import as secondary artifact (examples, not primary schema)")
    .option("--type <type>", "protocol type: graphql, openapi, grpc, postman", "auto")
    .action(async (opts) => {
      const globalOpts = program.opts();
      const microcksUrl = globalOpts.microcksUrl;
      const filePath = path.resolve(opts.file);

      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
      }

      const { request } = require("../lib/http-client.cjs");
      const boundary = `----CTUpload${Date.now()}`;
      const fileContent = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);

      let bodyParts = [
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`,
      ];
      const bodyBuffers = [Buffer.from(bodyParts[0]), fileContent, Buffer.from("\r\n")];

      if (opts.secondary) {
        const secondaryPart = `--${boundary}\r\nContent-Disposition: form-data; name="mainArtifact"\r\n\r\nfalse\r\n`;
        bodyBuffers.push(Buffer.from(secondaryPart));
      }

      bodyBuffers.push(Buffer.from(`--${boundary}--\r\n`));
      const payload = Buffer.concat(bodyBuffers);

      try {
        const res = await request("POST", `${microcksUrl}/api/artifact/upload`, {
          headers: {
            "content-type": `multipart/form-data; boundary=${boundary}`,
            "content-length": payload.length,
          },
          body: payload,
        });

        if (res.status < 300) {
          if (globalOpts.json) {
            console.log(JSON.stringify({ success: true, file: fileName, response: res.data }));
          } else {
            console.log(`✓ Imported ${fileName} into Microcks`);
          }
        } else {
          console.error(`✗ Import failed (${res.status}): ${typeof res.data === "string" ? res.data : JSON.stringify(res.data)}`);
          process.exit(1);
        }
      } catch (err) {
        console.error(`✗ Import failed: ${err.message}`);
        process.exit(1);
      }
    });

  mock
    .command("status")
    .description("Check Microcks server health")
    .action(async () => {
      const globalOpts = program.opts();
      const microcksUrl = globalOpts.microcksUrl;
      const { request } = require("../lib/http-client.cjs");

      try {
        const res = await request("GET", `${microcksUrl}/api/services?page=0&size=1`);
        const serviceCount = Array.isArray(res.data) ? res.data.length : 0;

        const allRes = await request("GET", `${microcksUrl}/api/services?page=0&size=200`);
        const total = Array.isArray(allRes.data) ? allRes.data.length : 0;

        const result = {
          status: "healthy",
          url: microcksUrl,
          services: total,
          responseTime: res.elapsed,
        };

        if (globalOpts.json) {
          console.log(JSON.stringify(result));
        } else {
          console.log(`✓ Microcks is healthy at ${microcksUrl}`);
          console.log(`  Services: ${total}`);
          console.log(`  Response time: ${res.elapsed}ms`);
        }
      } catch (err) {
        const result = { status: "unreachable", url: microcksUrl, error: err.message };
        if (globalOpts.json) {
          console.log(JSON.stringify(result));
        } else {
          console.error(`✗ Microcks unreachable at ${microcksUrl}: ${err.message}`);
        }
        process.exit(1);
      }
    });

  mock
    .command("list")
    .description("List all services and operations in Microcks")
    .option("--protocol <type>", "filter by protocol type: GRAPHQL, REST, GRPC, SOAP")
    .action(async (opts) => {
      const globalOpts = program.opts();
      const microcksUrl = globalOpts.microcksUrl;
      const { request } = require("../lib/http-client.cjs");

      try {
        const res = await request("GET", `${microcksUrl}/api/services?page=0&size=200`);
        let services = Array.isArray(res.data) ? res.data : [];

        if (opts.protocol) {
          services = services.filter((s) => s.type && s.type.toUpperCase().includes(opts.protocol.toUpperCase()));
        }

        if (globalOpts.json) {
          console.log(JSON.stringify(services.map((s) => ({
            name: s.name,
            version: s.version,
            type: s.type,
            operations: (s.operations || []).map((o) => o.name),
          }))));
        } else {
          console.log(`\n  Services (${services.length}):\n`);
          for (const svc of services) {
            console.log(`  ${svc.name} v${svc.version} [${svc.type}]`);
            for (const op of svc.operations || []) {
              console.log(`    → ${op.name}`);
            }
          }
          console.log("");
        }
      } catch (err) {
        console.error(`✗ Failed to list services: ${err.message}`);
        process.exit(1);
      }
    });

  mock
    .command("expect")
    .description("Set a mock expectation (variable-aware)")
    .requiredOption("-s, --service <name>", "service name")
    .requiredOption("-o, --operation <name>", "operation name")
    .requiredOption("-r, --response <json>", "response JSON (inline or @file)")
    .option("-v, --variables <json>", "match variables JSON")
    .option("--times <n>", "serve N times then expire", parseInt)
    .option("--ttl <ms>", "expire after N milliseconds", parseInt)
    .action(async (opts) => {
      const globalOpts = program.opts();
      let response;
      if (opts.response.startsWith("@")) {
        const fp = path.resolve(opts.response.slice(1));
        response = JSON.parse(fs.readFileSync(fp, "utf8"));
      } else {
        response = JSON.parse(opts.response);
      }

      let matchVariables = null;
      if (opts.variables) {
        matchVariables = JSON.parse(opts.variables);
      }

      const { request } = require("../lib/http-client.cjs");
      try {
        const res = await request("POST", `${globalOpts.microcksUrl.replace(":8585", ":4010")}/api/expectations`, {
          body: {
            serviceName: opts.service,
            operationName: opts.operation,
            response,
            matchVariables,
            times: opts.times || 0,
            ttlMs: opts.ttl || 0,
          },
        });

        if (globalOpts.json) {
          console.log(JSON.stringify(res.data));
        } else {
          console.log(`✓ Expectation set for ${opts.service}::${opts.operation}`);
        }
      } catch (err) {
        console.error(`✗ Failed: ${err.message}`);
        process.exit(1);
      }
    });
};
