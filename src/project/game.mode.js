export function gameModeFromState(state) {
  if (!state || state.ui?.screen !== "GAME") return "MENU";
  if (state.game.over) return "OUTCOME";
  if (state.game.combat.active && state.game.combat.phase === "PREP") return "COMBAT_PREP";
  if (state.game.combat.active && state.game.combat.phase === "ACTIVE") return "COMBAT_ACTIVE";
  if (!state.game.combat.active && state.game.combat.phase === "RESOLVED") return "COMBAT_OUTCOME";
  if (state.game.encounter.active && state.game.encounter.required === "DECISION") return "ENCOUNTER";
  if (state.game.transit.active) return "TRANSIT";
  return "EXPLORATION";
}
