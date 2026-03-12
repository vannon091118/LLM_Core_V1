import { districtRiskValue } from "../../src/project/renderer.js";
import { DISTRICT_PROFILE } from "../../src/project/districts.module.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

for (const p of DISTRICT_PROFILE) {
  const v = districtRiskValue(p, p.id);
  assert(v === p.danger, `risk resolver mismatch for district ${p.id}: got ${v}, expected danger ${p.danger}`);
}

assert(districtRiskValue({ risk: 7, danger: 2 }, 3) === 7, "explicit risk must have priority over danger");
assert(districtRiskValue({ danger: 4 }, 3) === 4, "danger fallback missing");
assert(districtRiskValue({}, 4) === 6, "numeric district fallback broken");

console.log("DISTRICT_RISK_OK");
