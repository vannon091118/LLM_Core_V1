import { sanitizeBySchema } from "../../src/kernel/schema.js";
import { stateSchema } from "../../src/project/project.manifest.js";
import { featureFlagsForProfile } from "../../src/project/release.profiles.js";
import { interventionDisabledReason } from "../../src/project/renderer.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function makeState(profile, influence = 10) {
  const s = sanitizeBySchema({}, stateSchema);
  s.app.releaseProfile = profile;
  s.app.featureFlags = featureFlagsForProfile(profile);
  s.game.substrate.influence = influence;
  s.game.over = false;
  s.game.transit.active = false;
  s.game.encounter.active = false;
  s.game.combat.active = false;
  return s;
}

{
  const alpha = makeState("alpha", 10);
  const reason = interventionDisabledReason(alpha, "TRIGGER_RAID", 4, false, "");
  assert(/deaktiviert/i.test(reason), "alpha must disable TRIGGER_RAID with reason");
}

{
  const beta = makeState("beta", 10);
  const reason = interventionDisabledReason(beta, "TRIGGER_RAID", 4, false, "");
  assert(reason === "", "beta should allow TRIGGER_RAID when influence is enough");
}

{
  const betaLow = makeState("beta", 1);
  const reason = interventionDisabledReason(betaLow, "TRIGGER_RAID", 4, false, "");
  assert(/Zu wenig Einfluss/i.test(reason), "insufficient influence reason missing");
}

{
  const alphaBlocked = makeState("alpha", 10);
  const reason = interventionDisabledReason(alphaBlocked, "LIGHT_PULSE", 1, true, "Aktion gesperrt");
  assert(reason === "Aktion gesperrt", "base disabled reason must have priority");
}

console.log("RAID_UI_FLAG_OK");
