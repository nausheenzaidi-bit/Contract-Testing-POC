#!/usr/bin/env node

const SERVER = process.env.MOCK_SERVER_URL || "http://localhost:4010";

async function post(path, body) {
  const res = await fetch(`${SERVER}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

function pretty(obj) {
  return JSON.stringify(obj, null, 2);
}

async function cmdGenerate(operationName, scenarioType) {
  const data = await post("/api/ai/generate", { operationName, scenarioType });
  if (data.error) { console.error("Error:", data.error); process.exit(1); }
  console.log(`\n${data.description}\n`);
  console.log(pretty(data.scenario));
}

async function cmdSuggest(operationName) {
  const data = await post("/api/ai/suggest", { operationName });
  if (data.error) { console.error("Error:", data.error); process.exit(1); }
  console.log(`\nSuggested scenarios for ${data.operationName}:\n`);
  for (const s of data.suggestions) {
    console.log(`  ${s.label.padEnd(20)} (${s.type.padEnd(18)}) ${s.description}`);
  }
}

async function cmdChat(message) {
  const data = await post("/api/ai/chat", { message });
  console.log(`\n${data.reply}\n`);
  for (const s of data.scenarios || []) {
    console.log(`--- ${s.scenarioType} ---`);
    console.log(pretty(s.scenario));
    console.log();
  }
}

async function cmdStatus() {
  const res = await fetch(`${SERVER}/api/ai/status`);
  const data = await res.json();
  console.log("\nAI Engine Status:");
  console.log(`  Provider : ${data.provider}`);
  console.log(`  Enabled  : ${data.enabled}`);
  console.log(`  Model    : ${data.model || "N/A (heuristic mode)"}`);
  console.log();
}

async function cmdGenerateAll() {
  const metaRes = await fetch(`${SERVER}/meta`);
  const meta = await metaRes.json();
  const ops = meta.operations || [];

  const types = ["success", "empty", "not-found", "boundary"];
  let total = 0;

  for (const op of ops) {
    console.log(`\n══ ${op.operationName} ══`);
    for (const t of types) {
      const data = await post("/api/ai/generate", { operationName: op.operationName, scenarioType: t });
      if (data.error) {
        console.log(`  [${t}] skipped: ${data.error}`);
      } else {
        const save = await post("/api/ai/save", {
          operationName: op.operationName,
          scenarioName: `ai-${t}`,
          data: data.scenario,
        });
        console.log(`  [${t}] ${save.saved ? "saved" : "failed"}`);
        total++;
      }
    }
  }
  console.log(`\nDone. Generated & saved ${total} scenarios.`);
}

const [,, cmd, ...args] = process.argv;

const USAGE = `
ai-mock-cli -- AI Mock Scenario Generator

Usage:
  node ai-mock-cli.cjs generate <operationName> <scenarioType>
  node ai-mock-cli.cjs suggest  <operationName>
  node ai-mock-cli.cjs chat     "<message>"
  node ai-mock-cli.cjs generate-all
  node ai-mock-cli.cjs status

Scenario types: success, empty, error, not-found, unauthorized,
                forbidden, boundary, partial, timeout, rate-limited,
                validation-error, internal-error

Environment:
  MOCK_SERVER_URL  (default: http://localhost:4010)
`;

(async () => {
  try {
    switch (cmd) {
      case "generate":
        if (args.length < 2) { console.error("Usage: generate <operationName> <scenarioType>"); process.exit(1); }
        await cmdGenerate(args[0], args[1]);
        break;
      case "suggest":
        if (args.length < 1) { console.error("Usage: suggest <operationName>"); process.exit(1); }
        await cmdSuggest(args[0]);
        break;
      case "chat":
        if (args.length < 1) { console.error("Usage: chat \"<message>\""); process.exit(1); }
        await cmdChat(args.join(" "));
        break;
      case "generate-all":
        await cmdGenerateAll();
        break;
      case "status":
        await cmdStatus();
        break;
      default:
        console.log(USAGE);
        break;
    }
  } catch (e) {
    console.error("Failed to connect to mock server at", SERVER);
    console.error(e.message);
    process.exit(1);
  }
})();
