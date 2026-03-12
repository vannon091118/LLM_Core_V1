import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const STATE_FILE = path.join(ROOT, ".core_mode.state.json");
const RUN_LOCK = path.join(ROOT, ".core_mode_bootstrap.lock");
const DISABLE = String(process.env.CORE_HOOK_DISABLE || "").trim();

if (DISABLE === "1") process.exit(0);

// Avoid recursive/re-entrant runs from chained hooks.
if (fs.existsSync(RUN_LOCK)) process.exit(0);

// If core mode is already active, no-op.
if (fs.existsSync(STATE_FILE)) {
  try {
    const st = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    if (st?.mode === "core") process.exit(0);
  } catch {}
}

try {
  fs.writeFileSync(RUN_LOCK, String(Date.now()), "utf8");
  const r = spawnSync("node", ["scripts/llm-autosetup.mjs"], {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, CORE_HOOK_DISABLE: "1" }
  });
  if (r.status !== 0) process.exit(r.status || 1);
} finally {
  try { fs.unlinkSync(RUN_LOCK); } catch {}
}
