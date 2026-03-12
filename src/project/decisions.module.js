export const DECISION_OUTCOMES = [
  "SUCCESS",
  "PARTIAL",
  "FAIL",
  "CRITICAL"
];

export const DECISION_TAGS = [
  "DIPLOMACY",
  "STEALTH",
  "FORCE",
  "TECH",
  "SURVIVAL"
];

export const DECISION_CATALOG = [
  {
    id: "checkpoint_bribe",
    title: "Kontrollpunkt verhandeln",
    prompt: "Eine Miliz sperrt die Route. Zahlen, bluffen oder durchbrechen?",
    minRound: 0,
    maxRound: 12,
    districtMin: 0,
    districtMax: 3,
    tags: ["DIPLOMACY", "SURVIVAL"],
    difficulty: 2,
    options: [
      { id: "pay", label: "Bestechen", costs: { SUPPLIES: 2 }, rewards: { MORALE: 1, progress: 20 } },
      { id: "bluff", label: "Bluff", costs: { MORALE: 1 }, rewards: { SUPPLIES: 1, INTEL: 1, progress: 15 } },
      { id: "force", label: "Gewalt", costs: { HP: 1, SUPPLIES: 1, AMMO: 2 }, rewards: { SCRAP: 2, progress: 10 } }
    ]
  },
  {
    id: "collapsed_tunnel",
    title: "Eingestuerzter Tunnel",
    prompt: "Der Tunnel ist dicht. Umweg oder riskante Bergung?",
    minRound: 0,
    maxRound: 30,
    districtMin: 1,
    districtMax: 6,
    tags: ["TECH", "SURVIVAL"],
    difficulty: 3,
    options: [
      { id: "clear", label: "Freiraeumen", costs: { SUPPLIES: 1, SCRAP: 1 }, rewards: { SUPPLIES: 1, progress: 25 } },
      { id: "climb", label: "Klettern", costs: { HP: 1 }, rewards: { MORALE: 1, progress: 15, INTEL: 1 } },
      { id: "retreat", label: "Rueckzug", costs: { MORALE: 1 }, rewards: { HP: 1, progress: 5 } }
    ]
  },
  {
    id: "signal_tower",
    title: "Notsignal auf Turm",
    prompt: "Ein altes Notsignal lockt Jager. Ignorieren oder sichern?",
    minRound: 4,
    maxRound: 30,
    districtMin: 2,
    districtMax: 6,
    tags: ["STEALTH", "TECH"],
    difficulty: 4,
    options: [
      { id: "jam", label: "Signal stoeren", costs: { SUPPLIES: 1, INTEL: 1, SCRAP: 2 }, rewards: { MORALE: 1, QUEST_PROGRESS: 1 } },
      { id: "ambush", label: "Hinterhalt", costs: { HP: 1, AMMO: 3 }, rewards: { SUPPLIES: 2, CREDITS: 5, QUEST_PROGRESS: 1 } },
      { id: "ignore", label: "Ignorieren", costs: { MORALE: 1 }, rewards: { SUPPLIES: 1 } }
    ]
  },
  {
    id: "desperate_trader",
    title: "Verzweifelter Haendler",
    prompt: "Ein Haendler bietet eine Klinge gegen Vorrat an.",
    minRound: 1,
    maxRound: 20,
    districtMin: 1,
    districtMax: 5,
    tags: ["DIPLOMACY", "SURVIVAL"],
    difficulty: 2,
    options: [
      { id: "trade", label: "Handeln", costs: { SUPPLIES: 2 }, rewards: { MORALE: 1, progress: 10 } },
      { id: "decline", label: "Ablehnen", costs: {}, rewards: { MORALE: 0 } },
      { id: "threaten", label: "Drohung", costs: { MORALE: 1 }, rewards: { SUPPLIES: 1, SCRAP: 1 } }
    ]
  },
  {
    id: "wounded_survivor",
    title: "Verwundeter Ueberlebender",
    prompt: "Eine Person blutet aus und bittet um Hilfe.",
    minRound: 0,
    maxRound: 30,
    districtMin: 0,
    districtMax: 6,
    tags: ["SURVIVAL", "DIPLOMACY"],
    difficulty: 2,
    options: [
      { id: "help", label: "Helfen", costs: { SUPPLIES: 1 }, rewards: { MORALE: 2 } },
      { id: "ignore", label: "Ignorieren", costs: { MORALE: 1 }, rewards: {} },
      { id: "rob", label: "Ausrauben", costs: { MORALE: 2 }, rewards: { SUPPLIES: 2 } }
    ]
  },
  {
    id: "blocked_toll",
    title: "Wegzoll",
    prompt: "Eine Gang verlangt Zoll fuer den Durchgang.",
    minRound: 3,
    maxRound: 30,
    districtMin: 2,
    districtMax: 6,
    tags: ["FORCE", "DIPLOMACY"],
    difficulty: 3,
    options: [
      { id: "pay_toll", label: "Zahlen", costs: { SUPPLIES: 2 }, rewards: { MORALE: 1 } },
      { id: "sneak", label: "Schleichen", costs: { HP: 1 }, rewards: { SUPPLIES: 1 } },
      { id: "break_line", label: "Durchbrechen", costs: { HP: 1, MORALE: 1 }, rewards: { SCRAP: 2 } }
    ]
  },
  {
    id: "scavenger_tip",
    title: "Tip aus der Asche",
    prompt: "Ein Schrottsammler verkauft dir einen Loot-Hinweis.",
    minRound: 0,
    maxRound: 30,
    districtMin: 1,
    districtMax: 6,
    tags: ["SURVIVAL", "TECH"],
    difficulty: 1,
    options: [
      { id: "buy_tip", label: "Hinweis kaufen", costs: { SUPPLIES: 1 }, rewards: { SUPPLIES: 2, MORALE: 1 } },
      { id: "walk", label: "Weitergehen", costs: {}, rewards: {} }
    ]
  },
  {
    id: "ambush_warning",
    title: "Warnung vor Hinterhalt",
    prompt: "Eine Stimme aus dem Rauch warnt vor einer Falle vor dir.",
    minRound: 5,
    maxRound: 30,
    districtMin: 2,
    districtMax: 6,
    tags: ["STEALTH", "SURVIVAL"],
    difficulty: 3,
    options: [
      { id: "avoid", label: "Ausweichen", costs: { SUPPLIES: 1 }, rewards: { MORALE: 1 } },
      { id: "disarm", label: "Entschaerfen", costs: { HP: 1 }, rewards: { SUPPLIES: 2 } },
      { id: "push_through", label: "Durchziehen", costs: { HP: 2 }, rewards: { SCRAP: 2 } }
    ]
  },
  {
    id: "corpse_choice",
    title: "Leiche am Strassenrand",
    prompt: "Ein frischer Koerper. Alles liegt noch da.",
    minRound: 0,
    maxRound: 30,
    districtMin: 1,
    districtMax: 6,
    tags: ["SURVIVAL", "FORCE"],
    difficulty: 1,
    options: [
      { id: "loot_body", label: "Durchsuchen", costs: { MORALE: 2 }, rewards: { SUPPLIES: 2 } },
      { id: "leave_body", label: "Liegen lassen", costs: {}, rewards: { MORALE: 1 } }
    ]
  },
  {
    id: "safehouse_offer",
    title: "Safehouse-Angebot",
    prompt: "Ein Wachposten bietet Schlafplatz gegen Vorrat.",
    minRound: 6,
    maxRound: 30,
    districtMin: 2,
    districtMax: 6,
    tags: ["DIPLOMACY", "SURVIVAL"],
    difficulty: 2,
    options: [
      { id: "rest_paid", label: "Bleiben", costs: { SUPPLIES: 2 }, rewards: { HP: 2, MORALE: 2 } },
      { id: "decline_rest", label: "Ablehnen", costs: {}, rewards: {} }
    ]
  },
  {
    id: "intel_trade",
    title: "Intel-Handel",
    prompt: "Ein Funker will Vorrat fuer Positionsdaten.",
    minRound: 8,
    maxRound: 30,
    districtMin: 3,
    districtMax: 6,
    tags: ["TECH", "DIPLOMACY"],
    difficulty: 3,
    options: [
      { id: "buy_intel", label: "Intel kaufen", costs: { SUPPLIES: 2 }, rewards: { MORALE: 1, INTEL: 2 } },
      { id: "snatch_radio", label: "Funkgeraet reissen", costs: { MORALE: 2 }, rewards: { SCRAP: 2 } }
    ]
  },
  {
    id: "distress_signal",
    title: "Hilferuf im Aether",
    prompt: "Ein altes Notsignal bittet um Evakuierung.",
    minRound: 10,
    maxRound: 30,
    districtMin: 3,
    districtMax: 6,
    tags: ["TECH", "SURVIVAL"],
    difficulty: 4,
    options: [
      { id: "investigate", label: "Signal folgen", costs: { HP: 1 }, rewards: { MORALE: 2, SUPPLIES: 1 } },
      { id: "ignore_signal", label: "Signal ignorieren", costs: { MORALE: 1 }, rewards: {} },
      { id: "trace_and_strike", label: "Quelle stuermen", costs: { HP: 1, MORALE: 1 }, rewards: { SUPPLIES: 2, SCRAP: 1 } }
    ]
  }
];
