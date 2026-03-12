import { execSync } from "node:child_process";

const steps = [
  "npm run ack:llm-entry",
  "npm run check:project",
  "npm run test:system-proof",
  "npm run changelog:seal"
];

for (const cmd of steps) {
  try {
    execSync(cmd, { stdio: "inherit" });
  } catch {
    console.error(`RELEASE_GATE_FAIL at step: ${cmd}`);
    process.exit(1);
  }
}

console.log("CORE_RELEASE_GATE_OK");
