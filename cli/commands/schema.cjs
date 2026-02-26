/**
 * ct schema — Schema management commands (multi-protocol).
 *
 * Subcommands:
 *   validate   Validate a schema file (GraphQL, OpenAPI, Protobuf)
 *   diff       Diff two schemas and detect breaking changes
 *   list       List operations from a schema
 *   convert    Convert between contract formats
 */

const fs = require("fs");
const path = require("path");

module.exports = function (program) {
  const schema = program.command("schema").description("Schema management (GraphQL, OpenAPI, Protobuf)");

  // ── ct schema validate ──
  schema
    .command("validate")
    .description("Validate a schema file")
    .requiredOption("-f, --file <path>", "path to schema file")
    .option("--type <type>", "schema type: graphql, openapi, proto", "auto")
    .action(async (opts) => {
      const globalOpts = program.opts();
      const filePath = path.resolve(opts.file);

      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
      }

      const ext = path.extname(filePath).toLowerCase();
      let detectedType = opts.type;
      if (detectedType === "auto") {
        if (ext === ".graphql" || ext === ".gql") detectedType = "graphql";
        else if (ext === ".json" || ext === ".yaml" || ext === ".yml") detectedType = "openapi";
        else if (ext === ".proto") detectedType = "proto";
        else {
          const content = fs.readFileSync(filePath, "utf8");
          if (content.includes("type Query") || content.includes("type Mutation")) detectedType = "graphql";
          else if (content.includes("openapi:") || content.includes('"openapi"')) detectedType = "openapi";
          else if (content.includes("syntax = ")) detectedType = "proto";
          else detectedType = "graphql";
        }
      }

      if (detectedType === "graphql") {
        try {
          const { buildSchema } = require("graphql");
          const sdl = fs.readFileSync(filePath, "utf8");
          const schema = buildSchema(sdl);
          const queryType = schema.getQueryType();
          const mutationType = schema.getMutationType();
          const queryCount = queryType ? Object.keys(queryType.getFields()).length : 0;
          const mutationCount = mutationType ? Object.keys(mutationType.getFields()).length : 0;
          const typeCount = Object.keys(schema.getTypeMap()).filter((n) => !n.startsWith("__")).length;

          if (globalOpts.json) {
            console.log(JSON.stringify({ valid: true, type: "graphql", queries: queryCount, mutations: mutationCount, types: typeCount }));
          } else {
            console.log(`✓ Valid GraphQL schema`);
            console.log(`  Types: ${typeCount}  Queries: ${queryCount}  Mutations: ${mutationCount}`);
          }
        } catch (err) {
          if (globalOpts.json) {
            console.log(JSON.stringify({ valid: false, type: "graphql", error: err.message }));
          } else {
            console.error(`✗ Invalid GraphQL schema: ${err.message}`);
          }
          process.exit(1);
        }
      } else if (detectedType === "openapi") {
        try {
          const content = fs.readFileSync(filePath, "utf8");
          let spec;
          if (ext === ".yaml" || ext === ".yml") {
            console.log("YAML parsing requires js-yaml — install it or use JSON format");
            process.exit(1);
          }
          spec = JSON.parse(content);

          const version = spec.openapi || spec.swagger || "unknown";
          const paths = Object.keys(spec.paths || {});
          let endpoints = 0;
          for (const p of paths) {
            endpoints += Object.keys(spec.paths[p]).filter((m) => ["get", "post", "put", "patch", "delete"].includes(m)).length;
          }

          if (globalOpts.json) {
            console.log(JSON.stringify({ valid: true, type: "openapi", version, paths: paths.length, endpoints }));
          } else {
            console.log(`✓ Valid OpenAPI spec (${version})`);
            console.log(`  Paths: ${paths.length}  Endpoints: ${endpoints}`);
          }
        } catch (err) {
          if (globalOpts.json) {
            console.log(JSON.stringify({ valid: false, type: "openapi", error: err.message }));
          } else {
            console.error(`✗ Invalid OpenAPI spec: ${err.message}`);
          }
          process.exit(1);
        }
      } else if (detectedType === "proto") {
        try {
          const protoLoader = require("@grpc/proto-loader");
          const packageDef = protoLoader.loadSync(filePath, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
          const serviceCount = Object.keys(packageDef).filter((k) => packageDef[k] && typeof packageDef[k] === "object").length;

          if (globalOpts.json) {
            console.log(JSON.stringify({ valid: true, type: "proto", definitions: serviceCount }));
          } else {
            console.log(`✓ Valid Protocol Buffers file`);
            console.log(`  Definitions: ${serviceCount}`);
          }
        } catch (err) {
          if (globalOpts.json) {
            console.log(JSON.stringify({ valid: false, type: "proto", error: err.message }));
          } else {
            console.error(`✗ Invalid .proto file: ${err.message}`);
          }
          process.exit(1);
        }
      }
    });

  // ── ct schema list ──
  schema
    .command("list")
    .description("List operations from a schema file")
    .requiredOption("-f, --file <path>", "path to schema file")
    .option("--type <type>", "schema type: graphql, openapi, proto", "auto")
    .action(async (opts) => {
      const globalOpts = program.opts();
      const filePath = path.resolve(opts.file);

      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
      }

      const ext = path.extname(filePath).toLowerCase();
      let detectedType = opts.type;
      if (detectedType === "auto") {
        if (ext === ".graphql" || ext === ".gql") detectedType = "graphql";
        else if (ext === ".json" || ext === ".yaml" || ext === ".yml") detectedType = "openapi";
        else if (ext === ".proto") detectedType = "proto";
        else detectedType = "graphql";
      }

      if (detectedType === "graphql") {
        try {
          const { buildSchema } = require("graphql");
          const sdl = fs.readFileSync(filePath, "utf8");
          const schema = buildSchema(sdl);
          const queryType = schema.getQueryType();
          const mutationType = schema.getMutationType();

          const operations = [];
          if (queryType) {
            for (const [name, field] of Object.entries(queryType.getFields())) {
              const args = (field.args || []).map((a) => `${a.name}: ${a.type}`);
              operations.push({ type: "query", name, returnType: field.type.toString(), args });
            }
          }
          if (mutationType) {
            for (const [name, field] of Object.entries(mutationType.getFields())) {
              const args = (field.args || []).map((a) => `${a.name}: ${a.type}`);
              operations.push({ type: "mutation", name, returnType: field.type.toString(), args });
            }
          }

          if (globalOpts.json) {
            console.log(JSON.stringify(operations));
          } else {
            console.log(`\n  Operations (${operations.length}):\n`);
            for (const op of operations) {
              const argsStr = op.args.length > 0 ? `(${op.args.join(", ")})` : "";
              console.log(`  ${op.type === "mutation" ? "M" : "Q"} ${op.name}${argsStr}: ${op.returnType}`);
            }
            console.log("");
          }
        } catch (err) {
          console.error(`✗ Failed to parse: ${err.message}`);
          process.exit(1);
        }
      } else if (detectedType === "openapi") {
        try {
          const spec = JSON.parse(fs.readFileSync(filePath, "utf8"));
          const operations = [];
          for (const [p, methods] of Object.entries(spec.paths || {})) {
            for (const [method, detail] of Object.entries(methods)) {
              if (!["get", "post", "put", "patch", "delete"].includes(method)) continue;
              operations.push({ method: method.toUpperCase(), path: p, summary: detail.summary || "" });
            }
          }

          if (globalOpts.json) {
            console.log(JSON.stringify(operations));
          } else {
            console.log(`\n  Endpoints (${operations.length}):\n`);
            for (const op of operations) {
              console.log(`  ${op.method.padEnd(7)} ${op.path}  ${op.summary}`);
            }
            console.log("");
          }
        } catch (err) {
          console.error(`✗ Failed: ${err.message}`);
          process.exit(1);
        }
      } else if (detectedType === "proto") {
        try {
          const protoLoader = require("@grpc/proto-loader");
          const packageDef = protoLoader.loadSync(filePath, { keepCase: true });
          const grpc = require("@grpc/grpc-js");
          const proto = grpc.loadPackageDefinition(packageDef);

          if (globalOpts.json) {
            console.log(JSON.stringify(Object.keys(packageDef)));
          } else {
            console.log(`\n  Definitions:\n`);
            for (const key of Object.keys(packageDef)) {
              console.log(`  ${key}`);
            }
            console.log("");
          }
        } catch (err) {
          console.error(`✗ Failed: ${err.message}`);
          process.exit(1);
        }
      }
    });
};
