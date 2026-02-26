/**
 * ct test — Run contract tests against mock or live endpoints.
 *
 * Subcommands:
 *   graphql  Test GraphQL endpoints
 *   rest     Test REST/HTTP endpoints
 *   grpc     Test gRPC endpoints
 *   run      Run test suite from a YAML/JSON config file
 */

const fs = require("fs");
const path = require("path");
const { report } = require("../lib/report.cjs");
const { graphqlRequest, restRequest, request } = require("../lib/http-client.cjs");
const { assertStatus, assertHasFields, assertNoErrors, assertMatchesContract } = require("../lib/assertions.cjs");

module.exports = function (program) {
  const test = program.command("test").description("Run contract tests against endpoints");

  // ── ct test graphql ──
  test
    .command("graphql")
    .description("Test a GraphQL endpoint")
    .requiredOption("-u, --url <url>", "GraphQL endpoint URL")
    .requiredOption("-q, --query <query>", "GraphQL query (inline or @file)")
    .option("-v, --variables <json>", "variables as JSON", "{}")
    .option("--expect-status <code>", "expected HTTP status", (v) => parseInt(v, 10), 200)
    .option("--expect-fields <fields>", "comma-separated fields to assert exist")
    .option("--expect-no-errors", "assert no GraphQL errors")
    .option("--name <name>", "test name", "GraphQL test")
    .action(async (opts) => {
      const globalOpts = program.opts();
      const suite = { name: opts.name, tests: [], startTime: Date.now(), endTime: 0 };

      let query = opts.query;
      if (query.startsWith("@")) {
        query = fs.readFileSync(path.resolve(query.slice(1)), "utf8");
      }

      const variables = JSON.parse(opts.variables);

      try {
        const start = Date.now();
        const res = await graphqlRequest(opts.url, query, variables);
        const duration = Date.now() - start;

        const assertions = [];
        assertions.push(assertStatus(res.status, opts.expectStatus));
        if (opts.expectNoErrors) assertions.push(assertNoErrors(res));
        if (opts.expectFields) {
          const fields = opts.expectFields.split(",").map((f) => f.trim());
          assertions.push(...assertHasFields(res.data?.data || res.data, fields));
        }

        const allPass = assertions.every((a) => a.pass);
        suite.tests.push({ name: opts.name, protocol: "graphql", pass: allPass, duration, assertions });
      } catch (err) {
        suite.tests.push({ name: opts.name, protocol: "graphql", pass: false, error: err.message, assertions: [] });
      }

      suite.endTime = Date.now();
      const exitCode = report(suite, globalOpts);
      process.exit(exitCode);
    });

  // ── ct test rest ──
  test
    .command("rest")
    .description("Test a REST/HTTP endpoint")
    .requiredOption("-u, --url <url>", "endpoint URL")
    .option("-m, --method <method>", "HTTP method", "GET")
    .option("-b, --body <json>", "request body (inline or @file)")
    .option("-H, --header <headers...>", "headers as key:value pairs")
    .option("--expect-status <code>", "expected HTTP status", (v) => parseInt(v, 10), 200)
    .option("--expect-fields <fields>", "comma-separated fields to assert exist")
    .option("--expect-content-type <type>", "expected content-type header")
    .option("--name <name>", "test name", "REST test")
    .action(async (opts) => {
      const globalOpts = program.opts();
      const suite = { name: opts.name, tests: [], startTime: Date.now(), endTime: 0 };

      const headers = {};
      if (opts.header) {
        for (const h of opts.header) {
          const [key, ...rest] = h.split(":");
          headers[key.trim()] = rest.join(":").trim();
        }
      }

      let body;
      if (opts.body) {
        if (opts.body.startsWith("@")) {
          body = JSON.parse(fs.readFileSync(path.resolve(opts.body.slice(1)), "utf8"));
        } else {
          body = JSON.parse(opts.body);
        }
      }

      try {
        const start = Date.now();
        const res = await restRequest(opts.method, opts.url, { headers, body });
        const duration = Date.now() - start;

        const assertions = [];
        assertions.push(assertStatus(res.status, opts.expectStatus));

        if (opts.expectFields) {
          const fields = opts.expectFields.split(",").map((f) => f.trim());
          const data = typeof res.data === "object" ? res.data : {};
          assertions.push(...assertHasFields(data, fields));
        }

        if (opts.expectContentType) {
          const ct = res.headers["content-type"] || "";
          const pass = ct.includes(opts.expectContentType);
          assertions.push({ pass, message: pass ? `Content-Type contains "${opts.expectContentType}"` : `Content-Type "${ct}" does not contain "${opts.expectContentType}"` });
        }

        const allPass = assertions.every((a) => a.pass);
        suite.tests.push({ name: opts.name, protocol: "rest", pass: allPass, duration, assertions });
      } catch (err) {
        suite.tests.push({ name: opts.name, protocol: "rest", pass: false, error: err.message, assertions: [] });
      }

      suite.endTime = Date.now();
      const exitCode = report(suite, globalOpts);
      process.exit(exitCode);
    });

  // ── ct test grpc ──
  test
    .command("grpc")
    .description("Test a gRPC endpoint")
    .requiredOption("-u, --url <host:port>", "gRPC server address")
    .requiredOption("--proto <path>", "path to .proto file")
    .requiredOption("--service <name>", "gRPC service name")
    .requiredOption("--method <name>", "gRPC method name")
    .option("-d, --data <json>", "request payload as JSON", "{}")
    .option("--expect-fields <fields>", "comma-separated fields to assert exist")
    .option("--name <name>", "test name", "gRPC test")
    .action(async (opts) => {
      const globalOpts = program.opts();
      const suite = { name: opts.name, tests: [], startTime: Date.now(), endTime: 0 };

      try {
        const grpc = require("@grpc/grpc-js");
        const protoLoader = require("@grpc/proto-loader");

        const protoPath = path.resolve(opts.proto);
        if (!fs.existsSync(protoPath)) throw new Error(`Proto file not found: ${protoPath}`);

        const packageDef = protoLoader.loadSync(protoPath, {
          keepCase: true,
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true,
        });

        const proto = grpc.loadPackageDefinition(packageDef);
        const ServiceClass = findService(proto, opts.service);
        if (!ServiceClass) throw new Error(`Service "${opts.service}" not found in proto`);

        const client = new ServiceClass(opts.url, grpc.credentials.createInsecure());
        const requestData = JSON.parse(opts.data);

        const start = Date.now();
        const response = await new Promise((resolve, reject) => {
          if (typeof client[opts.method] !== "function") {
            return reject(new Error(`Method "${opts.method}" not found on service "${opts.service}"`));
          }
          client[opts.method](requestData, (err, res) => {
            if (err) reject(err);
            else resolve(res);
          });
        });
        const duration = Date.now() - start;

        const assertions = [];
        assertions.push({ pass: true, message: "gRPC call succeeded" });

        if (opts.expectFields) {
          const fields = opts.expectFields.split(",").map((f) => f.trim());
          assertions.push(...assertHasFields(response, fields));
        }

        const allPass = assertions.every((a) => a.pass);
        suite.tests.push({ name: opts.name, protocol: "grpc", pass: allPass, duration, assertions });

        client.close();
      } catch (err) {
        suite.tests.push({ name: opts.name, protocol: "grpc", pass: false, error: err.message, assertions: [] });
      }

      suite.endTime = Date.now();
      const exitCode = report(suite, globalOpts);
      process.exit(exitCode);
    });

  // ── ct test run ── (run a full test suite from a config file)
  test
    .command("run")
    .description("Run a test suite from a JSON config file")
    .requiredOption("-f, --file <path>", "path to test suite JSON file")
    .action(async (opts) => {
      const globalOpts = program.opts();
      const filePath = path.resolve(opts.file);

      if (!fs.existsSync(filePath)) {
        console.error(`Test suite file not found: ${filePath}`);
        process.exit(1);
      }

      const config = JSON.parse(fs.readFileSync(filePath, "utf8"));
      const suite = {
        name: config.name || path.basename(filePath),
        tests: [],
        startTime: Date.now(),
        endTime: 0,
      };

      for (const tc of config.tests || []) {
        const testResult = { name: tc.name, protocol: tc.protocol, pass: false, assertions: [], duration: 0 };

        try {
          const start = Date.now();
          let res;

          if (tc.protocol === "graphql") {
            let query = tc.query;
            if (query.startsWith("@")) query = fs.readFileSync(path.resolve(query.slice(1)), "utf8");
            res = await graphqlRequest(tc.url, query, tc.variables || {});
          } else if (tc.protocol === "grpc") {
            testResult.name = tc.name;
            testResult.protocol = "grpc";
            testResult.pass = false;
            testResult.assertions = [{ pass: false, message: "gRPC in suite: use ct test grpc directly" }];
            suite.tests.push(testResult);
            continue;
          } else {
            res = await restRequest(tc.method || "GET", tc.url, { headers: tc.headers || {}, body: tc.body });
          }

          testResult.duration = Date.now() - start;

          const contract = tc.expect || {};
          testResult.assertions = assertMatchesContract(res, contract);
          testResult.pass = testResult.assertions.every((a) => a.pass);
        } catch (err) {
          testResult.error = err.message;
        }

        suite.tests.push(testResult);
      }

      suite.endTime = Date.now();
      const exitCode = report(suite, globalOpts);
      process.exit(exitCode);
    });

  // ── ct test verify-all ── (auto-discover all services from Microcks and test each)
  test
    .command("verify-all")
    .description("Auto-discover all services from Microcks and verify every operation")
    .option("--microcks-url <url>", "Microcks base URL (overrides global)")
    .option("--version <version>", "service version", "1.0")
    .option("--max-ops <n>", "max operations to test per service (0 = all)", (v) => parseInt(v, 10), 0)
    .action(async (opts) => {
      const globalOpts = program.opts();
      const microcksUrl = opts.microcksUrl || globalOpts.microcksUrl;
      const suite = { name: "All Services Verification", tests: [], startTime: Date.now(), endTime: 0 };

      try {
        const listRes = await request("GET", `${microcksUrl}/api/services?page=0&size=200`);
        const services = Array.isArray(listRes.data) ? listRes.data : [];

        if (services.length === 0) {
          console.error("No services found in Microcks");
          process.exit(1);
        }

        if (!globalOpts.silent && !globalOpts.json) {
          console.log(`\n  Discovered ${services.length} services in Microcks\n`);
        }

        for (const svc of services) {
          const svcName = svc.name;
          const svcVersion = svc.version || opts.version;
          const operations = svc.operations || [];
          const opsToTest = opts.maxOps > 0 ? operations.slice(0, opts.maxOps) : operations;
          const gqlUrl = `${microcksUrl}/graphql/${encodeURIComponent(svcName)}/${encodeURIComponent(svcVersion)}`;

          for (const op of opsToTest) {
            const opName = op.name;
            const testName = `${svcName}::${opName}`;
            const isMutation = opName.startsWith("create") || opName.startsWith("update") ||
              opName.startsWith("delete") || opName.startsWith("set") || opName.startsWith("add") ||
              opName.startsWith("remove") || opName.startsWith("send") || opName.startsWith("flush") ||
              opName.startsWith("publish") || opName.startsWith("block") || opName.startsWith("upsert") ||
              opName.startsWith("expire") || opName.startsWith("link") || opName.startsWith("unlink") ||
              opName.startsWith("award") || opName.startsWith("revoke") || opName.startsWith("credit") ||
              opName.startsWith("debit") || opName.startsWith("dismiss") || opName.startsWith("invoke") ||
              opName.startsWith("claim") || opName.startsWith("report") || opName.startsWith("start") ||
              opName.startsWith("stop") || opName.startsWith("prepare");
            const keyword = isMutation ? "mutation" : "query";
            const query = `${keyword} ${opName} { ${opName} { __typename } }`;

            try {
              const start = Date.now();
              const res = await graphqlRequest(gqlUrl, query);
              const duration = Date.now() - start;

              const assertions = [];
              assertions.push(assertStatus(res.status, 200));
              assertions.push(assertNoErrors(res));

              const allPass = assertions.every((a) => a.pass);
              suite.tests.push({ name: testName, protocol: "graphql", pass: allPass, duration, assertions });
            } catch (err) {
              suite.tests.push({ name: testName, protocol: "graphql", pass: false, error: err.message, assertions: [] });
            }
          }
        }
      } catch (err) {
        suite.tests.push({ name: "Microcks connection", protocol: "graphql", pass: false, error: err.message, assertions: [] });
      }

      suite.endTime = Date.now();
      const exitCode = report(suite, globalOpts);
      process.exit(exitCode);
    });
};

function findService(proto, serviceName) {
  for (const key of Object.keys(proto)) {
    const val = proto[key];
    if (val && val.service) return val;
    if (typeof val === "object" && val !== null) {
      const found = findService(val, serviceName);
      if (found) return found;
    }
    if (key === serviceName && typeof val === "function") return val;
  }
  return null;
}
