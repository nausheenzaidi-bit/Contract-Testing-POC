#!/usr/bin/env node

/**
 * ct — Contract Testing CLI
 *
 * Multi-protocol contract testing tool for CI/CD pipelines.
 * Supports GraphQL, REST, gRPC, and HTTP protocols.
 * Integrates with Microcks and Pact Broker.
 */

const { Command } = require("commander");
const path = require("path");
const fs = require("fs");

const program = new Command();

program
  .name("ct")
  .description("Contract Testing CLI — multi-protocol mock & contract testing for CI/CD")
  .version("1.0.0")
  .option("--config <path>", "path to config file", ".ct-config.json")
  .option("--json", "output results as JSON")
  .option("--junit <path>", "output results as JUnit XML to file")
  .option("--silent", "suppress non-essential output")
  .option("--microcks-url <url>", "Microcks base URL", process.env.MICROCKS_URL || "http://localhost:8585")
  .option("--pact-broker-url <url>", "Pact Broker base URL", process.env.PACT_BROKER_URL || "http://localhost:9292");

// Load config file if it exists
program.hook("preAction", (thisCommand) => {
  const configPath = path.resolve(thisCommand.opts().config);
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      const opts = thisCommand.opts();
      if (config.microcksUrl && !opts.microcksUrl) thisCommand.setOptionValue("microcksUrl", config.microcksUrl);
      if (config.pactBrokerUrl && !opts.pactBrokerUrl) thisCommand.setOptionValue("pactBrokerUrl", config.pactBrokerUrl);
    } catch {}
  }
});

// ── Register commands ──
require("./commands/mock.cjs")(program);
require("./commands/contract.cjs")(program);
require("./commands/test.cjs")(program);
require("./commands/pact.cjs")(program);
require("./commands/schema.cjs")(program);

program.parse(process.argv);
