/**
 * JSON reporter — structured output for CI/CD parsing.
 */

function formatResults(testSuite) {
  const { name, tests, startTime, endTime } = testSuite;
  const passed = tests.filter((t) => t.pass).length;
  const failed = tests.filter((t) => !t.pass).length;
  const skipped = tests.filter((t) => t.skipped).length;

  return {
    suite: name,
    timestamp: new Date(startTime).toISOString(),
    duration: endTime - startTime,
    summary: { total: tests.length, passed, failed, skipped },
    tests: tests.map((t) => ({
      name: t.name,
      protocol: t.protocol,
      status: t.skipped ? "skipped" : t.pass ? "passed" : "failed",
      duration: t.duration || 0,
      assertions: t.assertions || [],
      error: t.error || null,
    })),
  };
}

function print(testSuite) {
  console.log(JSON.stringify(formatResults(testSuite), null, 2));
}

module.exports = { formatResults, print };
