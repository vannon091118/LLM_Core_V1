import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const MATRIX = path.join(ROOT, "CHANGE_MATRIX.jsonl");
const PKG = path.join(ROOT, "package.json");
const CHANGELOG = path.join(ROOT, "CHANGELOG.md");

const IGNORE_PREFIXES = [
  "reports/",
  ".core_",
  ".llm_entry_read_receipt.json",
  ".changelog_guard_state.json"
];

function sha256Text(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function sha256File(filePath) {
  return sha256Text(fs.readFileSync(filePath));
}

function fail(msg) {
  console.error(`CHANGE_MATRIX_FAIL: ${msg}`);
  process.exit(1);
}

function shouldIgnore(rel) {
  if (rel === "CHANGE_MATRIX.jsonl") return true;
  return IGNORE_PREFIXES.some((p) => rel.startsWith(p));
}

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const rel = path.relative(ROOT, abs).replace(/\\/g, "/");
    const st = fs.statSync(abs);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".git") continue;
      walk(abs, out);
    } else if (st.isFile()) {
      if (!shouldIgnore(rel)) out.push(rel);
    }
  }
  return out;
}

function snapshot() {
  const files = walk(ROOT).sort();
  const hashes = {};
  for (const rel of files) hashes[rel] = sha256File(path.join(ROOT, rel));
  const payload = JSON.stringify(hashes);
  return { files, hashes, snapshotSha256: sha256Text(payload) };
}

function readEntries() {
  if (!fs.existsSync(MATRIX)) return [];
  const lines = fs.readFileSync(MATRIX, "utf8").split(/\r?\n/).filter(Boolean);
  return lines.map((line, i) => {
    try { return JSON.parse(line); } catch { fail(`Ungueltige JSONL-Zeile ${i + 1}`); }
  });
}

function appendEntry(entry) {
  fs.appendFileSync(MATRIX, JSON.stringify(entry) + "\n", "utf8");
}

function diffFiles(prev = {}, next = {}) {
  const prevSet = new Set(Object.keys(prev));
  const nextSet = new Set(Object.keys(next));
  const added = [];
  const removed = [];
  const modified = [];
  for (const f of nextSet) {
    if (!prevSet.has(f)) added.push(f);
    else if (prev[f] !== next[f]) modified.push(f);
  }
  for (const f of prevSet) if (!nextSet.has(f)) removed.push(f);
  return { added: added.sort(), modified: modified.sort(), removed: removed.sort() };
}

function currentVersion() {
  if (!fs.existsSync(PKG)) fail("package.json fehlt.");
  const pkg = JSON.parse(fs.readFileSync(PKG, "utf8"));
  return String(pkg.version || "0.0.0");
}

function changelogHash() {
  if (!fs.existsSync(CHANGELOG)) fail("CHANGELOG.md fehlt.");
  return sha256File(CHANGELOG);
}

const mode = String(process.argv[2] || "").trim();
if (!["init", "record", "check"].includes(mode)) fail("Modus fehlt. Nutze: init | record | check");

const entries = readEntries();
const snap = snapshot();
const version = currentVersion();
const cHash = changelogHash();

if (mode === "init") {
  if (entries.length > 0) fail("Matrix existiert bereits. Nutze record/check.");
  appendEntry({
    id: 1,
    ts: new Date().toISOString(),
    version,
    changelogSha256: cHash,
    snapshotSha256: snap.snapshotSha256,
    changedFiles: { added: snap.files, modified: [], removed: [] },
    hashes: snap.hashes
  });
  console.log("CHANGE_MATRIX_INIT_OK");
  process.exit(0);
}

if (mode === "record") {
  if (entries.length === 0) fail("Matrix fehlt. Erst init ausfuehren.");
  const prev = entries[entries.length - 1];
  const changed = diffFiles(prev.hashes || {}, snap.hashes);
  appendEntry({
    id: Number(prev.id || entries.length) + 1,
    ts: new Date().toISOString(),
    version,
    changelogSha256: cHash,
    snapshotSha256: snap.snapshotSha256,
    changedFiles: changed,
    hashes: snap.hashes
  });
  console.log("CHANGE_MATRIX_RECORD_OK");
  process.exit(0);
}

// check
if (entries.length === 0) fail("Matrix fehlt. Erst init ausfuehren.");
const last = entries[entries.length - 1];
if (String(last.version) !== version) fail("Letzter Matrix-Eintrag hat andere Version als package.json.");
if (String(last.changelogSha256) !== cHash) fail("CHANGELOG ist nicht im letzten Matrix-Eintrag verankert.");
if (String(last.snapshotSha256) !== snap.snapshotSha256) fail("Code-Zustand nicht im letzten Matrix-Eintrag verankert.");
if (!last.changedFiles || !last.hashes) fail("Letzter Matrix-Eintrag unvollstaendig.");

console.log("CHANGE_MATRIX_CHECK_OK");
