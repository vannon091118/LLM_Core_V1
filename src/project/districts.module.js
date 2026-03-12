export const DISTRICT_PROFILE = [
  {
    id: 0,
    code: "hub_core",
    tier: 0,
    danger: 0,
    control: "SAFE",
    questHooks: ["q_secure_route"],
    containerIds: ["locker_alpha"],
    enemyPool: []
  },
  {
    id: 1,
    code: "old_gate",
    tier: 1,
    danger: 1,
    control: "CONTESTED",
    questHooks: ["q_secure_route"],
    containerIds: ["locker_alpha"],
    enemyPool: ["raider_ash"]
  },
  {
    id: 2,
    code: "flood_market",
    tier: 2,
    danger: 2,
    control: "CONTESTED",
    questHooks: ["q_secure_route", "q_trace_signal"],
    containerIds: ["locker_alpha", "cache_field"],
    enemyPool: ["raider_ash", "hunter_marek"]
  },
  {
    id: 3,
    code: "smoke_row",
    tier: 3,
    danger: 3,
    control: "HOSTILE",
    questHooks: ["q_trace_signal"],
    containerIds: ["cache_field"],
    enemyPool: ["hunter_marek", "scav_veil"]
  },
  {
    id: 4,
    code: "signal_heights",
    tier: 4,
    danger: 4,
    control: "HOSTILE",
    questHooks: ["q_trace_signal"],
    containerIds: ["cache_field", "vault_black"],
    enemyPool: ["scav_veil"]
  },
  {
    id: 5,
    code: "black_vault",
    tier: 5,
    danger: 5,
    control: "BOSS",
    questHooks: ["q_final_ascent"],
    containerIds: ["vault_black"],
    enemyPool: ["warden_nox"]
  },
  {
    id: 6,
    code: "relay_spine",
    tier: 4,
    danger: 4,
    control: "HOSTILE",
    questHooks: ["q_trace_signal", "q_final_ascent"],
    containerIds: ["cache_field", "vault_black"],
    enemyPool: ["scav_veil", "warden_nox"]
  }
];

export const DISTRICT_QUEST_LINKS = {
  q_secure_route: [0, 1, 2],
  q_trace_signal: [2, 3, 4, 6],
  q_final_ascent: [5, 6]
};
