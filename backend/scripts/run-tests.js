/**
 * scripts/run-tests.js
 *
 * Runs every backend test file in its own isolated spawnSync subprocess.
 * This guarantees each file gets a fresh pool lifecycle and exits cleanly —
 * no shared singleton pool handles survive between files.
 *
 * Files run in dependency-safe order:
 *   1. Pure unit tests (no DB, no server)
 *   2. Mocked-DB tests (bookingModel mocks getConnection but imports pool)
 *   3. HTTP integration tests (real server + real pool)
 *   4. Analytics integration (real server + real pool, calls pool.end())
 *
 * Exit code = first non-zero child exit code, or 0 if all pass.
 */

const { spawnSync } = require("child_process");
const path = require("path");

const node = process.execPath;
const cwd = path.resolve(__dirname, "..");

// Files in run order — each gets its own isolated subprocess
const testFiles = [
  // Phase 1 — pure unit tests, no DB/server
  "tests/dateUtils.test.js",
  "tests/env.test.js",
  "tests/validators.test.js",
  // Phase 2 — mocked DB (imports pool singleton, pool.end not needed: no real connections made)
  "tests/bookingModel.test.js",
  // Phase 3 — HTTP + real DB pool (server.close() in test.after, pool stays alive for next file)
  "tests/app.test.js",
  "tests/search.test.js",
  // Phase 4 — HTTP + real DB pool, MUST run last: calls pool.end() in teardown
  "tests/adminAnalytics.test.js",
];

let overallExit = 0;

for (const file of testFiles) {
  const result = spawnSync(node, ["--test", file], {
    cwd,
    stdio: "inherit",
    env: process.env,
    timeout: 30000, // 30s per file — prevents any single file hanging forever
  });

  const code = result.status ?? 1;
  if (result.error) {
    // spawnSync error (e.g. timeout)
    process.stderr.write(`[run-tests] ${file}: ${result.error.message}\n`);
    overallExit = 1;
    break;
  }
  if (code !== 0) {
    overallExit = code;
    break; // fail fast
  }
}

process.exit(overallExit);
