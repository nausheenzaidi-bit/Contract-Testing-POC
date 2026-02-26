/**
 * Unified reporting — routes output to the correct reporter based on CLI flags.
 */

const consoleReporter = require("../reporters/console-reporter.cjs");
const jsonReporter = require("../reporters/json-reporter.cjs");
const junitReporter = require("../reporters/junit-reporter.cjs");

function report(testSuite, opts) {
  if (opts.json) {
    jsonReporter.print(testSuite);
  } else if (!opts.silent) {
    consoleReporter.print(testSuite);
  }

  if (opts.junit) {
    junitReporter.writeToFile(testSuite, opts.junit);
    if (!opts.silent) console.log(`  JUnit report written to ${opts.junit}`);
  }

  const failed = testSuite.tests.filter((t) => !t.pass && !t.skipped).length;
  return failed === 0 ? 0 : 1;
}

module.exports = { report };
