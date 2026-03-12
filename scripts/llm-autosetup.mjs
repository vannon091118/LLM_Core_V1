import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function run(cmd) {
  execSync(cmd, { cwd: ROOT, stdio: "inherit" });
}

function argValue(name) {
  const key = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(key));
  return hit ? hit.slice(key.length) : "";
}

const repo = argValue("repo");
const ref = argValue("ref");
const target = argValue("dir");

if (repo && target) {
  if (!fs.existsSync(target)) {
    run(`git clone ${repo} ${target}`);
  }
  if (ref) {
    run(`git -C ${target} fetch --all --tags`);
    run(`git -C ${target} checkout ${ref}`);
  }
}

run("node scripts/ack-llm-entry.mjs");
run("node scripts/core-integrity-cage.mjs init");

const statePath = path.join(ROOT, ".core_mode.state.json");

if (!fs.existsSync(path.join(ROOT, ".changelog_guard_state.json"))) {
  run("node scripts/changelog-append-guard.mjs init");
} else {
  run("node scripts/changelog-append-guard.mjs check");
}

if (!fs.existsSync(path.join(ROOT, "CHANGE_MATRIX.jsonl"))) {
  run("node scripts/change-matrix.mjs init");
} else {
  run("node scripts/change-matrix.mjs check");
}

run("node scripts/security-lockdown.mjs");
run("node scripts/llm-hard-gate.mjs");
run("node scripts/check-llm-entry.mjs");

fs.writeFileSync(
  statePath,
  JSON.stringify(
    {
      mode: "core",
      deterministic: true,
      cage: "active",
      readyAt: new Date().toISOString()
    },
    null,
    2
  ),
  "utf8"
);

console.log("CORE_MODE_READY");
