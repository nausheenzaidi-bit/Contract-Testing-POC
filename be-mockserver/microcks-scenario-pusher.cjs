/**
 * AI-to-Microcks bridge.
 * Updates Microcks mock responses directly in MongoDB so the GraphQL
 * endpoint immediately serves the AI-generated scenario.
 */

const microcksClient = require("./microcks-client.cjs");

async function pushScenarioToMicrocks({ serviceName, version = "1.0", operationName, scenarioName, queryStr, variables, responseData }) {
  const responseContent = responseData.data ? responseData : { data: responseData };

  // Directly update the "default" example in Microcks' MongoDB.
  // This is the only reliable way to change what Microcks actually serves.
  const dbResult = await microcksClient.updateMockResponse(
    serviceName, version, operationName, responseContent
  );

  return {
    success: dbResult.success,
    scenarioName,
    message: dbResult.success
      ? `Scenario "${scenarioName}" for ${operationName} applied to Microcks (${serviceName} v${version})`
      : `Failed to update Microcks response (matched: ${dbResult.matched})`,
  };
}

async function pushMultipleScenarios(serviceName, version, scenarios) {
  const results = [];
  for (const s of scenarios) {
    const result = await pushScenarioToMicrocks({
      serviceName,
      version,
      operationName: s.operationName,
      scenarioName: s.scenarioName || s.scenarioType,
      queryStr: s.testQuery || s.queryStr || "",
      variables: s.testVariables || s.variables || {},
      responseData: s.scenario || s.responseData || {},
    });
    results.push(result);
  }
  return results;
}

module.exports = {
  pushScenarioToMicrocks,
  pushMultipleScenarios,
};
