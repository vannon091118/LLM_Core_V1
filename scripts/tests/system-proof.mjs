import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

const BLOCKS = [
  {
    name: "Kernel Contracts",
    scripts: [
      { file: "scripts/tests/kernel-patches-target.mjs", marker: "KERNEL_PATCHES_TARGET_OK" },
      { file: "scripts/tests/kernel-schema-target.mjs", marker: "KERNEL_SCHEMA_TARGET_OK" },
      { file: "scripts/tests/kernel-rng-target.mjs", marker: "KERNEL_RNG_TARGET_OK" }
    ]
  },
  {
    name: "State Mutation / Gate Integrity",
    scripts: [
      { file: "scripts/tests/gate-redteam.mjs", marker: "GATE_REDTEAM_OK" },
      { file: "scripts/tests/redteam-path-hardening.mjs", marker: "REDTEAM_PATH_HARDENING_OK" },
      { file: "scripts/tests/cross-module-contract.mjs", marker: "CROSS_MODULE_CONTRACT_OK" }
    ]
  },
  {
    name: "Action Coverage",
    scripts: [
      { file: "scripts/tests/action-coverage.mjs", marker: "ACTION_COVERAGE_OK" }
    ]
  },
  {
    name: "Renderer/UI Read-Only Contract",
    scripts: [
      { file: "scripts/tests/renderer-ui-contract.mjs", marker: "RENDERER_UI_CONTRACT_OK" },
      { file: "scripts/tests/determinism-canvas.mjs", marker: "DETERMINISM_CANVAS_OK" },
      { file: "scripts/tests/determinism-ui-timing.mjs", marker: "DETERMINISM_UI_TIMING_OK" }
    ]
  },
  {
    name: "Adapter/Travel Behavior",
    scripts: [
      { file: "scripts/tests/store-adapter-integration.mjs", marker: "STORE_ADAPTER_INTEGRATION_OK" },
      { file: "scripts/tests/adapter-smoke.mjs", marker: "ADAPTER_SMOKE_OK" }
    ]
  },
  {
    name: "Determinism / Replay / Drift",
    scripts: [
      { file: "scripts/tests/drift-signature.mjs", marker: "DRIFT_SIGNATURE_OK" },
      { file: "scripts/tests/persistence-replay.mjs", marker: "PERSISTENCE_REPLAY_OK" },
      { file: "scripts/tests/patch-trace.mjs", marker: "PATCH_TRACE_OK" },
      { file: "scripts/tests/seed-matrix.mjs", marker: "SEED_MATRIX_OK" },
      { file: "scripts/tests/fuzz-determinism.mjs", marker: "FUZZ_DETERMINISM_OK" },
      { file: "scripts/tests/stability.mjs", marker: "STABILITY_OK" }
    ]
  },
  {
    name: "Full Project Verification",
    scripts: [
      { file: "scripts/tests/full-project-verification.mjs", marker: "FULL_PROJECT_VERIFICATION_OK" }
    ]
  }
];

function runScript(file) {
  const res = spawnSync("node", [path.join(ROOT, file)], { encoding: "utf8" });
  return {
    status: res.status,
    stdout: res.stdout || "",
    stderr: res.stderr || ""
  };
}

console.log("=== SYSTEM PROOF: UNIFIED VERIFICATION ROUTINE ===\n");

let allPassed = true;
const results = [];

for (const block of BLOCKS) {
  console.log(`Block: ${block.name}`);
  const blockResults = [];
  for (const script of block.scripts) {
    process.stdout.write(`  - Running ${script.file} ... `);
    const run = runScript(script.file);
    const hasMarker = run.stdout.includes(script.marker);
    const success = run.status === 0 && hasMarker;
    
    if (success) {
      console.log(`[OK] (${script.marker})`);
    } else {
      console.log(`[FAIL]`);
      if (run.status !== 0) console.error(`    Exit Code: ${run.status}`);
      if (!hasMarker) console.error(`    Missing Marker: ${script.marker}`);
      if (run.stderr) console.error(`    Error: ${run.stderr.trim()}`);
      allPassed = false;
    }
    blockResults.push({ ...script, success });
  }
  results.push({ name: block.name, scripts: blockResults });
  console.log("");
}

console.log("=== FINAL SUMMARY ===");
results.forEach(b => {
  const total = b.scripts.length;
  const passed = b.scripts.filter(s => s.success).length;
  console.log(`${b.name.padEnd(40)}: ${passed}/${total} OK`);
});

if (allPassed) {
  console.log("\nSYSTEM_PROOF_OK");
  process.exit(0);
} else {
  console.error("\nSYSTEM_PROOF_FAILED");
  process.exit(1);
}
