export const ENEMY_ARCHETYPES = [
  "RAIDER",
  "HUNTER",
  "SCAV",
  "BOSS"
];

export const ENEMY_CATALOG = [
  {
    id: "raider_ash",
    name: "Asche-Raeuber",
    archetype: "RAIDER",
    districtTier: 1,
    hp: 8,
    attackMin: 1,
    attackMax: 3,
    armor: 0,
    speed: 2,
    moraleDamage: 0,
    drops: { itemIds: [7], resources: { SUPPLIES: 0, AMMO: 2, MEDS: 0, SCRAP: 1, INTEL: 0, CREDITS: 1 } }
  },
  {
    id: "hunter_marek",
    name: "Strassenschlaeger Marek",
    archetype: "HUNTER",
    districtTier: 2,
    hp: 10,
    attackMin: 2,
    attackMax: 4,
    armor: 1,
    speed: 2,
    moraleDamage: 1,
    drops: { itemIds: [1], resources: { SUPPLIES: 1, AMMO: 1, MEDS: 0, SCRAP: 2, INTEL: 0, CREDITS: 2 } }
  },
  {
    id: "scav_veil",
    name: "Veil-Sammler",
    archetype: "SCAV",
    districtTier: 3,
    hp: 12,
    attackMin: 2,
    attackMax: 5,
    armor: 1,
    speed: 3,
    moraleDamage: 1,
    drops: { itemIds: [8, 9], resources: { SUPPLIES: 2, AMMO: 2, MEDS: 1, SCRAP: 3, INTEL: 1, CREDITS: 3 } }
  },
  {
    id: "warden_nox",
    name: "Warden Nox",
    archetype: "BOSS",
    districtTier: 5,
    hp: 20,
    attackMin: 3,
    attackMax: 6,
    armor: 2,
    speed: 2,
    moraleDamage: 2,
    drops: { itemIds: [10], resources: { SUPPLIES: 3, AMMO: 4, MEDS: 2, SCRAP: 5, INTEL: 4, CREDITS: 10 } }
  }
];
