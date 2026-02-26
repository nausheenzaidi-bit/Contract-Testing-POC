/**
 * JUnit XML reporter — standard format for CI/CD systems (Jenkins, GitHub Actions, etc.)
 */

const fs = require("fs");

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toXml(testSuite) {
  const { name, tests, startTime, endTime } = testSuite;
  const passed = tests.filter((t) => t.pass).length;
  const failed = tests.filter((t) => !t.pass).length;
  const skipped = tests.filter((t) => t.skipped).length;
  const duration = ((endTime - startTime) / 1000).toFixed(3);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<testsuites name="${escapeXml(name)}" tests="${tests.length}" failures="${failed}" skipped="${skipped}" time="${duration}">\n`;
  xml += `  <testsuite name="${escapeXml(name)}" tests="${tests.length}" failures="${failed}" skipped="${skipped}" time="${duration}" timestamp="${new Date(startTime).toISOString()}">\n`;

  for (const test of tests) {
    const testTime = ((test.duration || 0) / 1000).toFixed(3);
    xml += `    <testcase name="${escapeXml(test.name)}" classname="${escapeXml(test.protocol || "unknown")}" time="${testTime}">\n`;

    if (test.skipped) {
      xml += `      <skipped/>\n`;
    } else if (!test.pass) {
      const failedAssertions = (test.assertions || []).filter((a) => !a.pass);
      const msg = failedAssertions.map((a) => a.message).join("; ") || test.error || "Test failed";
      xml += `      <failure message="${escapeXml(msg)}">${escapeXml(msg)}</failure>\n`;
    }

    if (test.assertions && test.assertions.length > 0) {
      xml += `      <system-out><![CDATA[\n`;
      for (const a of test.assertions) {
        xml += `${a.pass ? "✓" : "✗"} ${a.message}\n`;
      }
      xml += `]]></system-out>\n`;
    }

    xml += `    </testcase>\n`;
  }

  xml += `  </testsuite>\n`;
  xml += `</testsuites>\n`;
  return xml;
}

function writeToFile(testSuite, filePath) {
  const xml = toXml(testSuite);
  fs.writeFileSync(filePath, xml, "utf8");
  return filePath;
}

module.exports = { toXml, writeToFile };
