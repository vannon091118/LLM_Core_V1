import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const llmEntryPath = path.join(ROOT, "LLM_ENTRY.md");

function fail(msg) {
  console.error(`LLM_ENTRY_CHECK_FAIL: ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(llmEntryPath)) {
  fail("LLM_ENTRY.md fehlt im Projekt-Root.");
}

const llmText = fs.readFileSync(llmEntryPath, "utf8");

const requiredPaths = [
  "kernel/store.js",
  "kernel/patches.js",
  "kernel/schema.js",
  "kernel/rng.js",
  "README.md"
];

for (const rel of requiredPaths) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    fail(`Pflichtdatei fehlt: ${rel}`);
  }
  if (!llmText.includes(rel)) {
    fail(`Pfad nicht in LLM_ENTRY referenziert: ${rel}`);
  }
}

const requiredAnchors = [
  "Pflicht-Lesereihenfolge",
  "createStore(",
  "dispatch(",
  "assertPatchesAllowed(",
  "sanitizeBySchema(",
  "runWithDeterminismGuard(",
  "getSignature(",
  "Projekt-Pruefung (Pflicht)",
  "npm run ack:llm-entry",
  "npm run check:llm-entry",
  "npm run trace:check",
  "npm test"
];

for (const anchor of requiredAnchors) {
  if (!llmText.includes(anchor)) {
    fail(`Pflichtanker fehlt in LLM_ENTRY: ${anchor}`);
  }
}

console.log("LLM_ENTRY_CHECK_OK");
