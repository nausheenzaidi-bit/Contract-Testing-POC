const fs = require("fs");
const path = require("path");

const inputPath =
  process.env.MOCK_SCENARIOS_PATH ||
  path.join(__dirname, "custom-mock-scenarios.json");
const outputPath =
  process.env.MOCK_SCENARIOS_OUT_PATH ||
  path.join(__dirname, "custom-mock-scenarios.generated.json");

const raw = fs.readFileSync(inputPath, "utf8");
const scenarios = JSON.parse(raw);

function toEmptyResponse(response) {
  if (!response || typeof response !== "object") {
    return response;
  }
  if (Array.isArray(response)) {
    return [];
  }
  const out = {};
  for (const [key, value] of Object.entries(response)) {
    if (value && typeof value === "object") {
      out[key] = toEmptyResponse(value);
    } else if (Array.isArray(value)) {
      out[key] = [];
    } else {
      out[key] = value === null ? null : null;
    }
  }
  return out;
}

for (const [operationName, scenariosByName] of Object.entries(
  scenarios.operations || {},
)) {
  const success = scenariosByName.success;
  if (!success) {
    continue;
  }

  if (!scenariosByName.empty) {
    scenariosByName.empty = toEmptyResponse(success);
  }

  if (!scenariosByName.error) {
    scenariosByName.error = {
      __httpStatus: 200,
      errors: [{ message: "Auto-generated mock error" }],
    };
  }

  scenarios.operations[operationName] = scenariosByName;
}

fs.writeFileSync(outputPath, JSON.stringify(scenarios, null, 2));
// eslint-disable-next-line no-console
console.log(`Wrote ${outputPath}`);
