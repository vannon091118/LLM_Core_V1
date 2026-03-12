import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const REPORT_DIR = path.join(ROOT, "reports");
const REPORT_FILE = path.join(REPORT_DIR, "core-system-proof.json");

const checks = [
  { id: "llm_gate", cmd: "npm run guard:llm", marker: "LLM_HARD_GATE_OK" },
  { id: "llm_entry_contract", cmd: "npm run check:llm-entry", marker: "LLM_ENTRY_CHECK_OK" },
  { id: "trace_contract", cmd: "npm run trace:check", marker: "CHANGE_MATRIX_CHECK_OK" },
  { id: "kernel_redteam", cmd: "npm run test:redteam", marker: "KERNEL DEFENSE ACTIVE" },
  { id: "kernel_stress", cmd: "npm run test:stress", marker: "Kernel caught the violation" },
  { id: "kernel_fuzz", cmd: "npm run test:fuzz", marker: "Kernel handled" },
  { id: "kernel_workers", cmd: "npm run test:workers", marker: "Kernel is Thread-Safe." },
  { id: "kernel_replay", cmd: "npm run test:replay", marker: "KERNEL_PERSISTENCE_REPLAY_OK" },
  { id: "kernel_determinism_sources", cmd: "npm run test:determinism-sources", marker: "KERNEL_DETERMINISM_SOURCES_OK" }
];

const result = {
  tool: "core-system-proof",
  version: 1,
  generatedAt: new Date().toISOString(),
  checks: [],
  ok: true
};

for (const check of checks) {
  try {
    const output = execSync(check.cmd, { cwd: ROOT, stdio: "pipe", encoding: "utf8" });
    const markerFound = output.includes(check.marker);
    const row = { id: check.id, cmd: check.cmd, marker: check.marker, markerFound, ok: markerFound };
    result.checks.push(row);
    if (!markerFound) result.ok = false;
  } catch (err) {
    result.checks.push({
      id: check.id,
      cmd: check.cmd,
      marker: check.marker,
      markerFound: false,
      ok: false,
      error: String(err?.message || err)
    });
    result.ok = false;
  }
}

fs.mkdirSync(REPORT_DIR, { recursive: true });
fs.writeFileSync(REPORT_FILE, JSON.stringify(result, null, 2), "utf8");

if (!result.ok) {
  console.error("CORE_SYSTEM_PROOF_FAIL");
  console.error(`Report: ${REPORT_FILE}`);
  process.exit(1);
}

console.log("CORE_SYSTEM_PROOF_OK");
console.log(`Report: ${REPORT_FILE}`);
