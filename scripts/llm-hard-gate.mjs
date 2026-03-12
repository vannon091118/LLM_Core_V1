import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const ENTRY = path.join(ROOT, "LLM_ENTRY.md");
const RECEIPT = path.join(ROOT, ".llm_entry_read_receipt.json");
const SECURITY_STATE = path.join(ROOT, ".core_security_state.json");

function fail(msg) {
  console.error(`LLM_HARD_GATE_FAIL: ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(ENTRY)) {
  fail("LLM_ENTRY.md fehlt.");
}

const entryText = fs.readFileSync(ENTRY, "utf8");
const challengeMatch = entryText.match(/^READ_CHALLENGE:\s*(.+)$/m);
if (!challengeMatch) {
  fail("READ_CHALLENGE fehlt in LLM_ENTRY.md.");
}
const expectedChallenge = challengeMatch[1].trim();
const expectedHash = crypto.createHash("sha256").update(entryText).digest("hex");

if (!fs.existsSync(RECEIPT)) {
  fail("Read-Receipt fehlt. Fuehre zuerst `npm run ack:llm-entry` aus.");
}

let receipt;
try {
  receipt = JSON.parse(fs.readFileSync(RECEIPT, "utf8"));
} catch {
  fail("Read-Receipt ist kein gueltiges JSON.");
}

if (receipt?.acknowledged !== true) {
  fail("Read-Receipt nicht bestaetigt.");
}
if (receipt?.challenge !== expectedChallenge) {
  fail("Read-Receipt Challenge passt nicht zu LLM_ENTRY.");
}
if (receipt?.llmEntrySha256 !== expectedHash) {
  fail("LLM_ENTRY wurde geaendert. Bitte erneut bestaetigen: `npm run ack:llm-entry`.");
}

try {
  execSync("node scripts/core-integrity-cage.mjs check", { cwd: ROOT, stdio: "pipe" });
} catch {
  fail("Core-Kaefig verletzt oder nicht initialisiert.");
}

if (!fs.existsSync(SECURITY_STATE)) {
  fail("Security-State fehlt. Fuehre `npm run secure:lock` aus.");
}

let sec;
try {
  sec = JSON.parse(fs.readFileSync(SECURITY_STATE, "utf8"));
} catch {
  fail("Security-State ist ungueltig.");
}

if (sec?.locked !== true) {
  fail("Core ist nicht im Lockdown-Modus.");
}

console.log("LLM_HARD_GATE_OK");
