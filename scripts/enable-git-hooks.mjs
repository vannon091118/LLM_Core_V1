import { execSync } from "node:child_process";

try {
  execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
} catch {
  console.error("GIT_HOOKS_ENABLE_FAIL: Kein Git-Repository.");
  process.exit(1);
}

execSync("git config core.hooksPath .githooks", { stdio: "inherit" });
console.log("GIT_HOOKS_ENABLE_OK");
