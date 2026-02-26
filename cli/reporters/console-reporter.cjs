/**
 * Console reporter — human-readable CLI output with colors.
 */

const PASS = "\x1b[32m✓\x1b[0m";
const FAIL = "\x1b[31m✗\x1b[0m";
const SKIP = "\x1b[33m○\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";

function print(testSuite) {
  const { name, tests, startTime, endTime } = testSuite;
  const duration = endTime - startTime;
  const passed = tests.filter((t) => t.pass).length;
  const failed = tests.filter((t) => !t.pass).length;
  const skipped = tests.filter((t) => t.skipped).length;

  console.log("");
  console.log(`${BOLD}${CYAN}  Contract Testing: ${name}${RESET}`);
  console.log(`  ${DIM}${"─".repeat(50)}${RESET}`);

  for (const test of tests) {
    const icon = test.skipped ? SKIP : test.pass ? PASS : FAIL;
    const proto = test.protocol ? `${DIM}[${test.protocol}]${RESET} ` : "";
    const time = test.duration ? ` ${DIM}(${test.duration}ms)${RESET}` : "";
    console.log(`  ${icon} ${proto}${test.name}${time}`);

    if (!test.pass && test.assertions) {
      for (const a of test.assertions) {
        if (!a.pass) console.log(`    ${RED}→ ${a.message}${RESET}`);
      }
    }
    if (test.error) {
      console.log(`    ${RED}→ ${test.error}${RESET}`);
    }
  }

  console.log(`  ${DIM}${"─".repeat(50)}${RESET}`);
  const parts = [];
  if (passed > 0) parts.push(`${GREEN}${passed} passed${RESET}`);
  if (failed > 0) parts.push(`${RED}${failed} failed${RESET}`);
  if (skipped > 0) parts.push(`${YELLOW}${skipped} skipped${RESET}`);
  parts.push(`${DIM}${duration}ms${RESET}`);
  console.log(`  ${BOLD}Results:${RESET} ${parts.join(", ")}`);
  console.log("");
}

module.exports = { print };
