export const ITEM_CATALOG = [
  { id: 1, name: "Rostklinge", kind: "WEAPON", slot: "MAIN_HAND", rarity: "COMMON", stackable: false, maxStack: 1, tags: ["melee", "starter"], effect: "Nahkampf +2", power: 2, value: 10, flavor: "Eine stumpfe Klinge, aber in der Zone reicht stumpf oft aus." },
  { id: 2, name: "Rohrlanze", kind: "WEAPON", slot: "MAIN_HAND", rarity: "COMMON", stackable: false, maxStack: 1, tags: ["melee", "reach"], effect: "Nahkampf +1", power: 1, value: 9, flavor: "Rohr, Draht, Betonstaub. Haelt laenger als Vertrauen." },
  { id: 3, name: "Lederweste", kind: "GEAR", slot: "BODY", rarity: "COMMON", stackable: false, maxStack: 1, tags: ["armor", "light"], effect: "Schaden -1", power: 1, value: 11, flavor: "Mehr Flicken als Stoff, doch sie stoppt Splitter." },
  { id: 4, name: "Verbandskit", kind: "CONSUMABLE", slot: "NONE", rarity: "COMMON", stackable: true, maxStack: 5, tags: ["heal"], effect: "Heilt 3 HP", power: 3, value: 7, flavor: "Steril ist sie nicht. Wirksam ist sie trotzdem." },
  { id: 5, name: "Rationspack", kind: "CONSUMABLE", slot: "NONE", rarity: "COMMON", stackable: true, maxStack: 5, tags: ["supply"], effect: "Vorrat +2", power: 2, value: 6, flavor: "Kalt, trocken, salzig. Ueberleben schmeckt selten gut." },
  { id: 6, name: "Funksplitter", kind: "QUEST", slot: "NONE", rarity: "UNCOMMON", stackable: false, maxStack: 1, tags: ["quest", "intel"], effect: "Lore", power: 0, value: 0, flavor: "Ein Restsignal aus einer Zeit, in der Ordnung noch echt war." },
  { id: 7, name: "Schrotpatrone", kind: "RESOURCE", slot: "NONE", rarity: "COMMON", stackable: true, maxStack: 30, tags: ["ammo"], effect: "Munition +4", power: 4, value: 3, flavor: "Messing und Pulver. Laut, kurz, wirksam." },
  { id: 8, name: "Filtermaske", kind: "GEAR", slot: "HEAD", rarity: "UNCOMMON", stackable: false, maxStack: 1, tags: ["defense", "toxic"], effect: "Giftresistenz +1", power: 1, value: 13, flavor: "Der Filter rasselt, aber die Lunge bleibt ruhig." },
  { id: 9, name: "Werkzeugrolle", kind: "UTILITY", slot: "UTILITY", rarity: "UNCOMMON", stackable: false, maxStack: 1, tags: ["repair", "utility"], effect: "Container-Oeffnen +1", power: 1, value: 14, flavor: "Schluessel, Draht und Gewalt in Taschenformat." },
  { id: 10, name: "Phaenomarker", kind: "QUEST", slot: "NONE", rarity: "RARE", stackable: false, maxStack: 1, tags: ["quest", "signal"], effect: "Siegbedingung-Token", power: 0, value: 0, flavor: "Leuchtet nur, wenn du die Wahrheit beruehrst." },
  { id: 11, name: "Funkfrequenz-Chip", kind: "QUEST", slot: "NONE", rarity: "RARE", stackable: false, maxStack: 1, tags: ["quest", "key"], effect: "Schluesselteil 1/3", power: 0, value: 0, flavor: "Ein kodierter Chip mit den Resten alter Notfunkprotokolle." },
  { id: 12, name: "Kraftstoff-Kanister", kind: "QUEST", slot: "NONE", rarity: "RARE", stackable: false, maxStack: 1, tags: ["quest", "key"], effect: "Schluesselteil 2/3", power: 0, value: 0, flavor: "Gerettet aus einem verrosteten Depot. Ohne ihn startet kein Aggregat." },
  { id: 13, name: "Eisenstange", kind: "WEAPON", slot: "MAIN_HAND", rarity: "COMMON", stackable: false, maxStack: 1, tags: ["melee"], effect: "Nahkampf +1", power: 1, value: 8, flavor: "Alt, schwer, verlaesslich genug fuer den ersten Treffer." },
  { id: 14, name: "Kettenkeule", kind: "WEAPON", slot: "MAIN_HAND", rarity: "UNCOMMON", stackable: false, maxStack: 1, tags: ["melee", "impact"], effect: "Nahkampf +2", power: 2, value: 12, flavor: "Rostige Kette, aber jeder Schwung zaehlt doppelt." },
  { id: 15, name: "Machete", kind: "WEAPON", slot: "MAIN_HAND", rarity: "UNCOMMON", stackable: false, maxStack: 1, tags: ["melee", "slash"], effect: "Nahkampf +2", power: 2, value: 13, flavor: "Die Schneide ist stumpf, die Entschlossenheit nicht." },
  { id: 16, name: "Stimulant-Injektor", kind: "CONSUMABLE", slot: "NONE", rarity: "RARE", stackable: true, maxStack: 3, tags: ["buff"], effect: "Morale +2", power: 2, value: 11, flavor: "Kurz klarer Kopf, danach zittert die Hand." },
  { id: 17, name: "Militaer-Medpack", kind: "CONSUMABLE", slot: "NONE", rarity: "UNCOMMON", stackable: true, maxStack: 4, tags: ["heal"], effect: "Heilt 5 HP", power: 5, value: 12, flavor: "Versiegeltes Restmaterial aus besseren Zeiten." },
  { id: 18, name: "MRE-Pack", kind: "CONSUMABLE", slot: "NONE", rarity: "UNCOMMON", stackable: true, maxStack: 5, tags: ["supply"], effect: "Vorrat +3", power: 3, value: 9, flavor: "Trocken und salzig, aber der Magen bleibt still." },
  { id: 19, name: "Kevlar-Weste", kind: "GEAR", slot: "BODY", rarity: "UNCOMMON", stackable: false, maxStack: 1, tags: ["armor"], effect: "Schaden -2", power: 2, value: 15, flavor: "Schwerer als Leder, aber deutlich ruhiger im Feuer." },
  { id: 20, name: "Filterhelm", kind: "GEAR", slot: "HEAD", rarity: "RARE", stackable: false, maxStack: 1, tags: ["armor", "toxic"], effect: "Giftresistenz +2", power: 2, value: 16, flavor: "Die Sicht ist eng, die Lunge dankbar." },
  { id: 21, name: "Signal-Verstaerker", kind: "QUEST", slot: "NONE", rarity: "RARE", stackable: false, maxStack: 1, tags: ["quest", "key"], effect: "Schluesselteil 3/3", power: 0, value: 0, flavor: "Mit diesem Kern kann das Aschekreuz wieder senden." },
  { id: 22, name: "Alte Fotos", kind: "CONSUMABLE", slot: "NONE", rarity: "RARE", stackable: true, maxStack: 2, tags: ["morale"], effect: "Morale +3", power: 3, value: 10, flavor: "Verblasste Gesichter, die dich noch beim Namen kennen." }
];

export const LOADOUT_SLOTS = [
  "MAIN_HAND",
  "OFF_HAND",
  "HEAD",
  "BODY",
  "UTILITY",
  "CHARM"
];

export const RESOURCE_TYPES = [
  "SUPPLIES",
  "AMMO",
  "MEDS",
  "SCRAP",
  "INTEL",
  "CREDITS"
];

export const LOOT_CONTAINER_CATALOG = [
  {
    id: "locker_alpha",
    type: "LOCKER",
    rarity: "COMMON",
    minRoll: 0,
    maxRoll: 60,
    guaranteedItemIds: [4],
    possibleItemIds: [5, 7],
    resourceDrops: { SUPPLIES: 1, AMMO: 2, MEDS: 0, SCRAP: 1, INTEL: 0, CREDITS: 0 }
  },
  {
    id: "cache_field",
    type: "CACHE",
    rarity: "UNCOMMON",
    minRoll: 35,
    maxRoll: 90,
    guaranteedItemIds: [],
    possibleItemIds: [2, 3, 8, 9, 13, 14, 17, 18, 19],
    resourceDrops: { SUPPLIES: 2, AMMO: 3, MEDS: 1, SCRAP: 2, INTEL: 1, CREDITS: 3 }
  },
  {
    id: "vault_black",
    type: "VAULT",
    rarity: "RARE",
    minRoll: 80,
    maxRoll: 100,
    guaranteedItemIds: [10],
    possibleItemIds: [8, 9, 15, 16, 20, 21, 22],
    resourceDrops: { SUPPLIES: 4, AMMO: 5, MEDS: 2, SCRAP: 5, INTEL: 3, CREDITS: 8 }
  }
];

const LOOT_BY_DISTRICT = {
  1: 1,
  2: 11,
  3: 4,
  4: 2,
  5: 12,
  6: 21
};

export const DISTRICT_LOOT_CONTAINERS = {
  1: ["locker_alpha"],
  2: ["locker_alpha", "cache_field"],
  3: ["cache_field"],
  4: ["cache_field"],
  5: ["vault_black"],
  6: ["vault_black"]
};

export function itemById(id) {
  return ITEM_CATALOG.find((i) => i.id === id);
}

export function districtLootItemId(districtId) {
  return LOOT_BY_DISTRICT[districtId] ?? null;
}

export function lootContainerById(containerId) {
  return LOOT_CONTAINER_CATALOG.find((c) => c.id === containerId);
}
