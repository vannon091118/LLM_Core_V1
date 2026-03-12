export const DEFAULT_RELEASE_PROFILE = "beta";

export const RELEASE_PROFILES = {
  alpha: {
    autoResolveEncounterTimeout: false,
    strictInfluenceDefeat: false,
    enableRaidIntervention: false
  },
  beta: {
    autoResolveEncounterTimeout: true,
    strictInfluenceDefeat: false,
    enableRaidIntervention: true
  },
  rc: {
    autoResolveEncounterTimeout: true,
    strictInfluenceDefeat: true,
    enableRaidIntervention: true
  }
};

export function normalizeReleaseProfile(raw) {
  const key = String(raw || "").trim().toLowerCase();
  return RELEASE_PROFILES[key] ? key : DEFAULT_RELEASE_PROFILE;
}

export function featureFlagsForProfile(profile) {
  const p = normalizeReleaseProfile(profile);
  return { ...RELEASE_PROFILES[p] };
}

export function resolveProfileFromRuntime(search = "", stored = "") {
  const query = String(search || "");
  const m = query.match(/[?&]profile=(alpha|beta|rc)\b/i);
  if (m?.[1]) return normalizeReleaseProfile(m[1]);
  return normalizeReleaseProfile(stored);
}
