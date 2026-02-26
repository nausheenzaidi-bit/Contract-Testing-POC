/**
 * ct pact — Pact Broker integration commands.
 *
 * Subcommands:
 *   publish       Publish Pact files to broker
 *   verify        Run provider verification against Pact contracts
 *   can-i-deploy  Check if a version is safe to deploy
 *   webhooks      List/manage Pact Broker webhooks
 */

const fs = require("fs");
const path = require("path");
const { request } = require("../lib/http-client.cjs");
const { report } = require("../lib/report.cjs");

module.exports = function (program) {
  const pact = program.command("pact").description("Pact Broker integration");

  // ── ct pact publish ──
  pact
    .command("publish")
    .description("Publish Pact contract files to broker")
    .requiredOption("-f, --file <path>", "path to Pact JSON file or directory of Pact files")
    .requiredOption("--consumer <name>", "consumer application name")
    .requiredOption("--consumer-version <version>", "consumer application version (e.g. git SHA)")
    .option("--tag <tags...>", "tags to apply (e.g. main, dev)")
    .option("--branch <branch>", "branch name")
    .action(async (opts) => {
      const globalOpts = program.opts();
      const brokerUrl = globalOpts.pactBrokerUrl;
      const filePath = path.resolve(opts.file);

      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
      }

      const files = [];
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        for (const f of fs.readdirSync(filePath)) {
          if (f.endsWith(".json")) files.push(path.join(filePath, f));
        }
      } else {
        files.push(filePath);
      }

      let allSuccess = true;
      for (const f of files) {
        try {
          const pactContent = JSON.parse(fs.readFileSync(f, "utf8"));
          const provider = pactContent.provider?.name || "unknown-provider";

          const publishUrl = `${brokerUrl}/pacts/provider/${encodeURIComponent(provider)}/consumer/${encodeURIComponent(opts.consumer)}/version/${encodeURIComponent(opts.consumerVersion)}`;

          const res = await request("PUT", publishUrl, {
            headers: { "content-type": "application/json" },
            body: pactContent,
          });

          if (res.status < 300) {
            if (!globalOpts.silent) console.log(`✓ Published ${path.basename(f)} (${opts.consumer} → ${provider})`);
          } else {
            console.error(`✗ Failed to publish ${path.basename(f)}: ${res.status}`);
            allSuccess = false;
          }

          if (opts.tag) {
            for (const tag of opts.tag) {
              await request("PUT", `${brokerUrl}/pacticipants/${encodeURIComponent(opts.consumer)}/versions/${encodeURIComponent(opts.consumerVersion)}/tags/${encodeURIComponent(tag)}`, {
                headers: { "content-type": "application/json" },
                body: {},
              });
            }
          }
        } catch (err) {
          console.error(`✗ Error publishing ${path.basename(f)}: ${err.message}`);
          allSuccess = false;
        }
      }

      if (globalOpts.json) {
        console.log(JSON.stringify({ success: allSuccess, filesPublished: files.length }));
      }
      process.exit(allSuccess ? 0 : 1);
    });

  // ── ct pact verify ──
  pact
    .command("verify")
    .description("Run provider verification against Pact contracts from broker")
    .requiredOption("-p, --provider <name>", "provider application name")
    .requiredOption("-u, --url <url>", "provider base URL to verify against")
    .option("--consumer-version-selectors <json>", "consumer version selectors as JSON")
    .option("--publish-results", "publish verification results back to broker")
    .option("--provider-version <version>", "provider version (required if --publish-results)")
    .action(async (opts) => {
      const globalOpts = program.opts();
      const brokerUrl = globalOpts.pactBrokerUrl;
      const suite = { name: `Pact Verify: ${opts.provider}`, tests: [], startTime: Date.now(), endTime: 0 };

      try {
        const pactsRes = await request("GET", `${brokerUrl}/pacts/provider/${encodeURIComponent(opts.provider)}/latest`);
        const pactLinks = pactsRes.data?._links?.pacts || [];

        if (pactLinks.length === 0 && pactsRes.data?.pacts) {
          for (const p of pactsRes.data.pacts) {
            pactLinks.push({ href: p._links?.self?.href || "", name: p._embedded?.consumer?.name || "unknown" });
          }
        }

        if (pactLinks.length === 0) {
          if (!globalOpts.silent) console.log(`No pacts found for provider "${opts.provider}"`);
          suite.endTime = Date.now();
          report(suite, globalOpts);
          process.exit(0);
        }

        for (const link of pactLinks) {
          const consumer = link.name || "unknown";
          const testName = `${consumer} → ${opts.provider}`;

          try {
            const pactRes = await request("GET", link.href);
            const interactions = pactRes.data?.interactions || [];

            for (const interaction of interactions) {
              const intName = `${testName}: ${interaction.description}`;
              const req = interaction.request || {};
              const expectedRes = interaction.response || {};

              try {
                const method = (req.method || "GET").toUpperCase();
                const testUrl = `${opts.url}${req.path || "/"}`;
                const start = Date.now();
                const res = await request(method, testUrl, {
                  headers: req.headers || {},
                  body: req.body,
                });
                const duration = Date.now() - start;

                const assertions = [];
                if (expectedRes.status) {
                  const pass = res.status === expectedRes.status;
                  assertions.push({ pass, message: pass ? `Status ${res.status} matches` : `Expected ${expectedRes.status}, got ${res.status}` });
                }
                if (expectedRes.headers) {
                  for (const [key, val] of Object.entries(expectedRes.headers)) {
                    const actual = res.headers[key.toLowerCase()];
                    const pass = actual && actual.includes(val);
                    assertions.push({ pass, message: pass ? `Header "${key}" matches` : `Header "${key}": expected "${val}", got "${actual}"` });
                  }
                }

                suite.tests.push({ name: intName, protocol: "pact", pass: assertions.every((a) => a.pass), duration, assertions });
              } catch (err) {
                suite.tests.push({ name: intName, protocol: "pact", pass: false, error: err.message, assertions: [] });
              }
            }
          } catch (err) {
            suite.tests.push({ name: testName, protocol: "pact", pass: false, error: err.message, assertions: [] });
          }
        }
      } catch (err) {
        suite.tests.push({ name: `Broker connection`, protocol: "pact", pass: false, error: err.message, assertions: [] });
      }

      suite.endTime = Date.now();
      const exitCode = report(suite, globalOpts);
      process.exit(exitCode);
    });

  // ── ct pact can-i-deploy ──
  pact
    .command("can-i-deploy")
    .description("Check if a version is safe to deploy")
    .requiredOption("-a, --pacticipant <name>", "application name")
    .requiredOption("--version <version>", "application version")
    .option("--to-environment <env>", "target environment")
    .option("--to <tag>", "target tag (e.g. production)")
    .action(async (opts) => {
      const globalOpts = program.opts();
      const brokerUrl = globalOpts.pactBrokerUrl;

      let url = `${brokerUrl}/can-i-deploy?pacticipant=${encodeURIComponent(opts.pacticipant)}&version=${encodeURIComponent(opts.version)}`;
      if (opts.toEnvironment) url += `&environment=${encodeURIComponent(opts.toEnvironment)}`;
      if (opts.to) url += `&to=${encodeURIComponent(opts.to)}`;

      try {
        const res = await request("GET", url);
        const canDeploy = res.data?.summary?.deployable || false;
        const reason = res.data?.summary?.reason || "";

        if (globalOpts.json) {
          console.log(JSON.stringify({ canDeploy, reason, details: res.data }));
        } else {
          if (canDeploy) {
            console.log(`\n  ✓ ${opts.pacticipant}@${opts.version} is safe to deploy`);
            if (reason) console.log(`    ${reason}`);
          } else {
            console.log(`\n  ✗ ${opts.pacticipant}@${opts.version} is NOT safe to deploy`);
            if (reason) console.log(`    ${reason}`);
          }
          console.log("");
        }

        process.exit(canDeploy ? 0 : 1);
      } catch (err) {
        console.error(`✗ can-i-deploy check failed: ${err.message}`);
        process.exit(1);
      }
    });
};
