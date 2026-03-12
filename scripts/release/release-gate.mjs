import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const DOCS = path.join(ROOT, "docs");
const TODO_FILE = path.join(DOCS, "03_TODO_MASTERPLAN.md");
const CHANGELOG_FILE = path.join(DOCS, "01_CHANGELOG.md");
const VERSIONING_FILE = path.join(DOCS, "02_VERSIONING.md");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function runFullTest() {
  const run = spawnSync("npm", ["test"], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: "pipe"
  });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  assert(run.status === 0, "Release gate blocked: npm test is not green");
  assert((run.stdout || "").includes("FULL_PROJECT_VERIFICATION_OK"), "Release gate blocked: FULL_PROJECT_VERIFICATION_OK missing");
}

function latestVersionFromChangelog(changelogText) {
  const hits = [...changelogText.matchAll(/^###\s+\d{4}-\d{2}-\d{2}\s+-\s+(v[0-9][0-9a-zA-Z\.-]*)\s*$/gm)];
  return hits.length > 0 ? hits[hits.length - 1][1] : "";
}

function countOpenP1P2(todoText) {
  const lines = todoText.split(/\r?\n/);
  const sectionHeader = /^\d+\.\s+.*\((?:P1|P2|P1\/P2)\)/;
  let inP1P2 = false;
  let open = 0;
  for (const line of lines) {
    if (/^\d+\.\s+/.test(line)) {
      inP1P2 = sectionHeader.test(line);
      continue;
    }
    if (inP1P2 && /^-\s+\[\s\]\s+/.test(line)) {
      open += 1;
    }
  }
  return open;
}

function checkDocSync() {
  const changelog = fs.readFileSync(CHANGELOG_FILE, "utf8");
  const versioning = fs.readFileSync(VERSIONING_FILE, "utf8");
  const latest = latestVersionFromChangelog(changelog);
  assert(latest, "Release gate blocked: latest changelog version not found");
  assert(versioning.includes(latest), `Release gate blocked: ${latest} missing in docs/02_VERSIONING.md index`);
}

function checkOpenRisks() {
  const todo = fs.readFileSync(TODO_FILE, "utf8");
  const openCount = countOpenP1P2(todo);
  assert(openCount === 0, `Release gate blocked: open P1/P2 risks = ${openCount}`);
}

try {
  runFullTest();
  checkDocSync();
  checkOpenRisks();
  console.log("RELEASE_GATE_OK");
} catch (err) {
  console.error(String(err?.message || err));
  process.exit(1);
}
