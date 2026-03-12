import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const LOCK_FILE = path.join(ROOT, ".core_cage.lock.json");
const KERNEL_DIR = path.join(ROOT, "kernel");
const SECURITY_STATE_FILE = path.join(ROOT, ".core_security_state.json");

function fail(msg) {
  console.error(`CORE_CAGE_FAIL: ${msg}`);
  process.exit(1);
}

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function listKernelFiles() {
  if (!fs.existsSync(KERNEL_DIR)) fail("kernel/ fehlt.");
  const out = [];
  for (const name of fs.readdirSync(KERNEL_DIR)) {
    const abs = path.join(KERNEL_DIR, name);
    const rel = path.relative(ROOT, abs).replace(/\\/g, "/");
    if (fs.statSync(abs).isFile()) out.push(rel);
  }
  return out.sort();
}

function buildSnapshot() {
  const files = listKernelFiles();
  const hashes = {};
  for (const rel of files) {
    hashes[rel] = sha256File(path.join(ROOT, rel));
  }
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    files,
    hashes
  };
}

function initLock() {
  if (fs.existsSync(SECURITY_STATE_FILE)) {
    try {
      const sec = JSON.parse(fs.readFileSync(SECURITY_STATE_FILE, "utf8"));
      if (sec?.locked === true) {
        fail("Core ist gelockt. Erst bewusst entsperren (secure:unlock), dann neu initialisieren.");
      }
    } catch {
      fail("Security-State ungueltig.");
    }
  }
  const snap = buildSnapshot();
  fs.writeFileSync(LOCK_FILE, JSON.stringify(snap, null, 2), "utf8");
  console.log("CORE_CAGE_LOCK_OK");
}

function checkLock() {
  if (!fs.existsSync(LOCK_FILE)) fail("Lock fehlt. Fuehre zuerst `node scripts/core-integrity-cage.mjs init` aus.");
  const lock = JSON.parse(fs.readFileSync(LOCK_FILE, "utf8"));
  const current = buildSnapshot();
  const lockFiles = Array.isArray(lock.files) ? lock.files.slice().sort() : [];
  const currentFiles = current.files.slice().sort();

  if (JSON.stringify(lockFiles) !== JSON.stringify(currentFiles)) {
    fail("Kernel-Dateiliste wurde veraendert.");
  }
  for (const rel of currentFiles) {
    if (lock.hashes?.[rel] !== current.hashes[rel]) {
      fail(`Kernel-Datei geaendert: ${rel}`);
    }
  }
  console.log("CORE_CAGE_CHECK_OK");
}

const mode = String(process.argv[2] || "").trim();
if (mode === "init") initLock();
else if (mode === "check") checkLock();
else fail("Modus fehlt. Nutze: init | check");
