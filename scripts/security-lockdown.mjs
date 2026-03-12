import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const STATE_FILE = path.join(ROOT, ".core_security_state.json");

const CRITICAL_FILES = [
  ".githooks/post-checkout",
  ".githooks/post-merge",
  "LLM_ENTRY.md",
  "CHANGELOG.md",
  "CHANGE_MATRIX.jsonl",
  "package.json",
  "kernel/hash32.js",
  "kernel/index.js",
  "kernel/patches.js",
  "kernel/persistence.js",
  "kernel/physics.js",
  "kernel/rng.js",
  "kernel/schema.js",
  "kernel/stableStringify.js",
  "kernel/store.js",
  "scripts/ack-llm-entry.mjs",
  "scripts/check-llm-entry.mjs",
  "scripts/changelog-append-guard.mjs",
  "scripts/change-matrix.mjs",
  "scripts/core-integrity-cage.mjs",
  "scripts/enable-git-hooks.mjs",
  "scripts/hook-core-mode.mjs",
  "scripts/llm-autosetup.mjs",
  "scripts/llm-hard-gate.mjs",
  "scripts/release-gate.mjs",
  "scripts/system-proof.mjs",
  "scripts/security-lockdown.mjs",
  "scripts/security-unlock.mjs"
];

const CRITICAL_DIRS = ["kernel", "scripts", ".githooks"];

function fail(msg) {
  console.error(`CORE_LOCKDOWN_FAIL: ${msg}`);
  process.exit(1);
}

function ensureExists(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) fail(`Fehlt: ${rel}`);
  return abs;
}

function tryChattr(flag, absPath) {
  try {
    execSync(`chattr ${flag} "${absPath}"`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const immutableApplied = [];
for (const rel of CRITICAL_FILES) {
  const abs = ensureExists(rel);
  fs.chmodSync(abs, 0o444);
  if (tryChattr("+i", abs)) immutableApplied.push(rel);
}

for (const rel of CRITICAL_DIRS) {
  const abs = ensureExists(rel);
  fs.chmodSync(abs, 0o555);
  tryChattr("+i", abs);
}

const state = {
  version: 1,
  locked: true,
  lockedAt: new Date().toISOString(),
  criticalFiles: CRITICAL_FILES,
  criticalDirs: CRITICAL_DIRS,
  immutableApplied
};
fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");

console.log("CORE_LOCKDOWN_OK");
