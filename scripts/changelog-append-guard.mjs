import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const CHANGELOG = path.join(ROOT, "CHANGELOG.md");
const STATE = path.join(ROOT, ".changelog_guard_state.json");

function sha256(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function fail(msg) {
  console.error(`CHANGELOG_GUARD_FAIL: ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(CHANGELOG)) fail("CHANGELOG.md fehlt.");

const mode = String(process.argv[2] || "").trim();
const current = fs.readFileSync(CHANGELOG, "utf8");

if (mode === "init") {
  const st = {
    version: 1,
    initializedAt: new Date().toISOString(),
    hash: sha256(current),
    length: current.length,
    content: current
  };
  fs.writeFileSync(STATE, JSON.stringify(st, null, 2), "utf8");
  console.log("CHANGELOG_GUARD_INIT_OK");
  process.exit(0);
}

if (!["check", "seal"].includes(mode)) fail("Modus fehlt. Nutze: init | check | seal");
if (!fs.existsSync(STATE)) fail("Guard-State fehlt. Fuehre `node scripts/changelog-append-guard.mjs init` aus.");

let st;
try {
  st = JSON.parse(fs.readFileSync(STATE, "utf8"));
} catch {
  fail("Guard-State ist ungueltig.");
}

const prev = String(st.content || "");
if (current.length < prev.length) {
  fail("CHANGELOG wurde verkuerzt.");
}

const prevLines = prev.split(/\r?\n/);
const curLines = current.split(/\r?\n/);
let i = 0;
for (const line of curLines) {
  if (i < prevLines.length && line === prevLines[i]) i++;
}
if (i < prevLines.length) {
  fail("CHANGELOG wurde nicht nur erweitert (mindestens eine alte Zeile fehlt/ist geaendert).");
}

if (mode === "seal") {
  const next = {
    ...st,
    sealedAt: new Date().toISOString(),
    hash: sha256(current),
    length: current.length,
    content: current
  };
  fs.writeFileSync(STATE, JSON.stringify(next, null, 2), "utf8");
  console.log("CHANGELOG_GUARD_SEAL_OK");
  process.exit(0);
}

console.log("CHANGELOG_GUARD_CHECK_OK");
