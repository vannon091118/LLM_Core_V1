import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const ENTRY = path.join(ROOT, "LLM_ENTRY.md");
const RECEIPT = path.join(ROOT, ".llm_entry_read_receipt.json");

if (!fs.existsSync(ENTRY)) {
  console.error("ACK_FAIL: LLM_ENTRY.md fehlt.");
  process.exit(1);
}

const entryText = fs.readFileSync(ENTRY, "utf8");
const challengeMatch = entryText.match(/^READ_CHALLENGE:\s*(.+)$/m);
if (!challengeMatch) {
  console.error("ACK_FAIL: READ_CHALLENGE fehlt in LLM_ENTRY.md.");
  process.exit(1);
}

const challenge = challengeMatch[1].trim();
const llmEntrySha256 = crypto.createHash("sha256").update(entryText).digest("hex");

const receipt = {
  acknowledged: true,
  challenge,
  llmEntrySha256,
  acknowledgedAt: new Date().toISOString()
};

fs.writeFileSync(RECEIPT, JSON.stringify(receipt, null, 2), "utf8");
console.log("LLM_ENTRY_ACK_OK");
