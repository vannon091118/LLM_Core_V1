import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const STATE_FILE = path.join(ROOT, ".core_security_state.json");
const REQUIRED_PHRASE = "I_UNDERSTAND_I_CAN_BREAK_CORE";
const provided = String(process.env.CORE_UNLOCK_PHRASE || "").trim();

function fail(msg) {
  console.error(`CORE_UNLOCK_FAIL: ${msg}`);
  process.exit(1);
}

if (provided !== REQUIRED_PHRASE) {
  fail("Falsche oder fehlende Sicherheitsphrase.");
}

if (!fs.existsSync(STATE_FILE)) {
  fail("Kein Security-State gefunden.");
}

const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
const files = Array.isArray(state.criticalFiles) ? state.criticalFiles : [];
const dirs = Array.isArray(state.criticalDirs) ? state.criticalDirs : [];

function tryChattr(flag, absPath) {
  try {
    execSync(`chattr ${flag} "${absPath}"`, { stdio: "ignore" });
  } catch {}
}

for (const rel of files) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  tryChattr("-i", abs);
  fs.chmodSync(abs, 0o644);
}

for (const rel of dirs) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  tryChattr("-i", abs);
  fs.chmodSync(abs, 0o755);
}

const next = {
  ...state,
  locked: false,
  unlockedAt: new Date().toISOString()
};
fs.writeFileSync(STATE_FILE, JSON.stringify(next, null, 2), "utf8");

console.log("CORE_UNLOCK_OK");
