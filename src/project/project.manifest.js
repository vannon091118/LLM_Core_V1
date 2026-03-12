import { DEFAULT_RELEASE_PROFILE, featureFlagsForProfile } from "./release.profiles.js";

export const SCHEMA_VERSION = 1;

export const stateSchema = {
  type: "object",
  shape: {
    meta: {
      type: "object",
      shape: {
        seed: { type: "string", default: "core-seed", maxLen: 40 }
      }
    },
    ui: {
      type: "object",
      shape: {
        screen: { type: "enum", values: ["MAIN_MENU", "RULES", "LOADOUT_SELECTION", "DIALOG", "GAME"], default: "MAIN_MENU" },
        title: { type: "string", default: "SUBSTRATE", maxLen: 40 }
      }
    },
    app: {
      type: "object",
      shape: {
        firstStart: { type: "boolean", default: true },
        releaseProfile: { type: "enum", values: ["alpha", "beta", "rc"], default: DEFAULT_RELEASE_PROFILE },
        featureFlags: {
          type: "object",
          shape: {
            autoResolveEncounterTimeout: { type: "boolean", default: featureFlagsForProfile(DEFAULT_RELEASE_PROFILE).autoResolveEncounterTimeout },
            strictInfluenceDefeat: { type: "boolean", default: featureFlagsForProfile(DEFAULT_RELEASE_PROFILE).strictInfluenceDefeat },
            enableRaidIntervention: { type: "boolean", default: featureFlagsForProfile(DEFAULT_RELEASE_PROFILE).enableRaidIntervention }
          }
        }
      }
    },
    dialog: {
      type: "object",
      shape: {
        active: { type: "boolean", default: false },
        step: { type: "number", default: 0, int: true, min: 0, max: 9 }
      }
    },
    game: {
      type: "object",
      shape: {
        round: { type: "number", default: 0, int: true, min: 0, max: 9999 },
        archetype: { type: "string", default: "SURVIVOR", maxLen: 24 },
        archetypeTrait: { type: "string", default: "NONE", maxLen: 80 },
        maxHp: { type: "number", default: 10, int: true, min: 1, max: 99 },
        hp: { type: "number", default: 10, int: true, min: 0, max: 99 },
        supplies: { type: "number", default: 5, int: true, min: 0, max: 99 },
        morale: { type: "number", default: 5, int: true, min: 0, max: 99 },
        substrate: {
          type: "object",
          shape: {
            influence: { type: "number", default: 10, int: true, min: 0, max: 20 },
            influenceMax: { type: "number", default: 20, int: true, min: 1, max: 50 },
            zeroInfluenceTicks: { type: "number", default: 0, int: true, min: 0, max: 9999 },
            alivePct: { type: "number", default: 64, int: true, min: 0, max: 100 },
            lightPct: { type: "number", default: 56, int: true, min: 0, max: 100 },
            toxinPct: { type: "number", default: 18, int: true, min: 0, max: 100 },
            lineageControlPct: { type: "number", default: 32, int: true, min: 0, max: 100 },
            mutationLevel: { type: "number", default: 1, int: true, min: 0, max: 9 },
            lastIntervention: { type: "string", default: "", maxLen: 40 }
          }
        },
        over: { type: "boolean", default: false },
        panelMode: { type: "enum", values: ["KAMPF", "DIALOG", "PLUENDERN"], default: "DIALOG" },
        panelAnim: { type: "number", default: 0, int: true, min: 0, max: 9999 },
        playerDistrict: { type: "number", default: 0, int: true, min: 0, max: 20 },
        transit: {
          type: "object",
          shape: {
            active: { type: "boolean", default: false },
            from: { type: "number", default: 0, int: true, min: 0, max: 20 },
            to: { type: "number", default: 0, int: true, min: 0, max: 20 },
            progress: { type: "number", default: 0, int: true, min: 0, max: 100 },
            cooldown: { type: "number", default: 0, int: true, min: 0, max: 50 }
          }
        },
        encounter: {
          type: "object",
          shape: {
            active: { type: "boolean", default: false },
            required: { type: "enum", values: ["DECISION", "COMBAT"], default: "DECISION" },
            text: { type: "string", default: "", maxLen: 180 },
            decisionId: { type: "string", default: "", maxLen: 80 },
            ageTicks: { type: "number", default: 0, int: true, min: 0, max: 9999 },
            timeoutTicks: { type: "number", default: 6, int: true, min: 1, max: 99 },
            options: {
              type: "array",
              maxLen: 4,
              default: [],
              items: {
                type: "object",
                shape: {
                  id: { type: "string", default: "", maxLen: 40 },
                  label: { type: "string", default: "", maxLen: 60 },
                  mode: { type: "enum", values: ["DECISION", "COMBAT"], default: "DECISION" },
                  costText: { type: "string", default: "", maxLen: 80 },
                  gainText: { type: "string", default: "", maxLen: 80 },
                  riskText: { type: "string", default: "", maxLen: 80 },
                  hpDelta: { type: "number", default: 0, int: true, min: -20, max: 20 },
                  suppliesDelta: { type: "number", default: 0, int: true, min: -20, max: 20 },
                  moraleDelta: { type: "number", default: 0, int: true, min: -20, max: 20 },
                  ammoDelta: { type: "number", default: 0, int: true, min: -999, max: 999 },
                  medsDelta: { type: "number", default: 0, int: true, min: -999, max: 999 },
                  scrapDelta: { type: "number", default: 0, int: true, min: -999, max: 999 },
                  intelDelta: { type: "number", default: 0, int: true, min: -999, max: 999 },
                  creditsDelta: { type: "number", default: 0, int: true, min: -999, max: 999 },
                  progressDelta: { type: "number", default: 0, int: true, min: -100, max: 100 },
                  questProgressDelta: { type: "number", default: 0, int: true, min: -100, max: 100 }
                }
              }
            }
          }
        },
        loadout: {
          type: "object",
          shape: {
            slots: {
              type: "object",
              shape: {
                MAIN_HAND: { type: "number", default: -1, int: true, min: -1, max: 9999 },
                OFF_HAND: { type: "number", default: -1, int: true, min: -1, max: 9999 },
                HEAD: { type: "number", default: -1, int: true, min: -1, max: 9999 },
                BODY: { type: "number", default: -1, int: true, min: -1, max: 9999 },
                UTILITY: { type: "number", default: -1, int: true, min: -1, max: 9999 },
                CHARM: { type: "number", default: -1, int: true, min: -1, max: 9999 }
              }
            },
            quickUseItemIds: {
              type: "array",
              maxLen: 4,
              default: [],
              items: { type: "number", default: -1, int: true, min: -1, max: 9999 }
            },
            lastEquippedItemId: { type: "number", default: -1, int: true, min: -1, max: 9999 }
          }
        },
        resources: {
          type: "object",
          shape: {
            supplies: { type: "number", default: 5, int: true, min: 0, max: 999 },
            ammo: { type: "number", default: 0, int: true, min: 0, max: 999 },
            meds: { type: "number", default: 0, int: true, min: 0, max: 999 },
            scrap: { type: "number", default: 0, int: true, min: 0, max: 999 },
            intel: { type: "number", default: 0, int: true, min: 0, max: 999 },
            credits: { type: "number", default: 0, int: true, min: 0, max: 999 },
            keys: {
              type: "array",
              maxLen: 20,
              default: [],
              items: { type: "string", default: "", maxLen: 40 }
            }
          }
        },
        inventory: {
          type: "object",
          shape: {
            items: {
              type: "array",
              maxLen: 60,
              default: [],
              items: {
                type: "object",
                shape: {
                  id: { type: "number", default: 0, int: true, min: 0, max: 9999 },
                  instanceId: { type: "string", default: "", maxLen: 80 },
                  name: { type: "string", default: "", maxLen: 50 },
                  kind: { type: "string", default: "", maxLen: 20 },
                  effect: { type: "string", default: "", maxLen: 80 },
                  power: { type: "number", default: 0, int: true, min: 0, max: 99 },
                  flavor: { type: "string", default: "", maxLen: 220 },
                  slot: { type: "string", default: "", maxLen: 20 },
                  rarity: { type: "string", default: "COMMON", maxLen: 20 },
                  stackable: { type: "boolean", default: false },
                  qty: { type: "number", default: 1, int: true, min: 1, max: 99 }
                }
              }
            },
            stash: {
              type: "array",
              maxLen: 120,
              default: [],
              items: {
                type: "object",
                shape: {
                  id: { type: "number", default: 0, int: true, min: 0, max: 9999 },
                  qty: { type: "number", default: 1, int: true, min: 1, max: 99 }
                }
              }
            },
            capacity: { type: "number", default: 24, int: true, min: 1, max: 200 },
            detailItemId: { type: "number", default: -1, int: true, min: -1, max: 9999 },
            selectedCombatItemId: { type: "number", default: -1, int: true, min: -1, max: 9999 },
            selectedCombatItemInstanceId: { type: "string", default: "", maxLen: 80 },
            lootedDistricts: {
              type: "array",
              maxLen: 40,
              default: [],
              items: { type: "number", default: 0, int: true, min: 0, max: 9999 }
            },
            openedContainerIds: {
              type: "array",
              maxLen: 120,
              default: [],
              items: { type: "string", default: "", maxLen: 60 }
            }
          }
        },
        combat: {
          type: "object",
          shape: {
            active: { type: "boolean", default: false },
            phase: { type: "enum", values: ["NONE", "PREP", "ACTIVE", "RESOLVED"], default: "NONE" },
            enemyId: { type: "string", default: "", maxLen: 40 },
            enemyName: { type: "string", default: "", maxLen: 60 },
            enemyTier: { type: "number", default: 0, int: true, min: 0, max: 10 },
            enemyHp: { type: "number", default: 0, int: true, min: 0, max: 999 },
            enemyMaxHp: { type: "number", default: 0, int: true, min: 0, max: 999 },
            introText: { type: "string", default: "", maxLen: 220 },
            selectedItemPower: { type: "number", default: 0, int: true, min: 0, max: 99 },
            selectedItemKind: { type: "string", default: "", maxLen: 20 },
            stance: { type: "enum", values: ["AGGRESSIVE", "DEFENSIVE", "BALANCED"], default: "BALANCED" },
            logLines: {
              type: "array",
              maxLen: 8,
              default: [],
              items: { type: "string", default: "", maxLen: 120 }
            },
            pendingLootItemIds: {
              type: "array",
              maxLen: 6,
              default: [],
              items: { type: "number", default: 0, int: true, min: 0, max: 9999 }
            },
            turn: { type: "number", default: 0, int: true, min: 0, max: 999 },
            streak: { type: "number", default: 0, int: true, min: 0, max: 99 },
            damageDealt: { type: "number", default: 0, int: true, min: 0, max: 9999 },
            damageTaken: { type: "number", default: 0, int: true, min: 0, max: 9999 },
            emergencyUsed: { type: "boolean", default: false },
            emergencyPenalty: { type: "boolean", default: false },
            lastOutcome: { type: "enum", values: ["NONE", "WIN", "LOSE", "FLEE"], default: "NONE" },
            tick: { type: "number", default: 0, int: true, min: 0, max: 9999 }
          }
        },
        decisions: {
          type: "object",
          shape: {
            activeDecisionId: { type: "string", default: "", maxLen: 60 },
            chainId: { type: "string", default: "", maxLen: 60 },
            queue: {
              type: "array",
              maxLen: 24,
              default: [],
              items: { type: "string", default: "", maxLen: 60 }
            },
            history: {
              type: "array",
              maxLen: 120,
              default: [],
              items: {
                type: "object",
                shape: {
                  decisionId: { type: "string", default: "", maxLen: 60 },
                  optionId: { type: "string", default: "", maxLen: 60 },
                  outcome: { type: "string", default: "", maxLen: 20 },
                  round: { type: "number", default: 0, int: true, min: 0, max: 9999 }
                }
              }
            },
            lastOutcome: { type: "string", default: "NONE", maxLen: 20 }
          }
        },
        lootContainers: {
          type: "object",
          shape: {
            activeContainerId: { type: "string", default: "", maxLen: 60 },
            discovered: {
              type: "array",
              maxLen: 120,
              default: [],
              items: { type: "string", default: "", maxLen: 60 }
            },
            opened: {
              type: "array",
              maxLen: 120,
              default: [],
              items: { type: "string", default: "", maxLen: 60 }
            },
            sealed: {
              type: "array",
              maxLen: 120,
              default: [],
              items: { type: "string", default: "", maxLen: 60 }
            },
            pendingRewards: {
              type: "array",
              maxLen: 30,
              default: [],
              items: {
                type: "object",
                shape: {
                  containerId: { type: "string", default: "", maxLen: 60 },
                  itemIds: {
                    type: "array",
                    maxLen: 10,
                    default: [],
                    items: { type: "number", default: 0, int: true, min: 0, max: 9999 }
                  },
                  resources: {
                    type: "object",
                    shape: {
                      supplies: { type: "number", default: 0, int: true, min: 0, max: 999 },
                      ammo: { type: "number", default: 0, int: true, min: 0, max: 999 },
                      meds: { type: "number", default: 0, int: true, min: 0, max: 999 },
                      scrap: { type: "number", default: 0, int: true, min: 0, max: 999 },
                      intel: { type: "number", default: 0, int: true, min: 0, max: 999 },
                      credits: { type: "number", default: 0, int: true, min: 0, max: 999 }
                    }
                  }
                }
              }
            }
          }
        },
        quests: {
          type: "object",
          shape: {
            trackedQuestId: { type: "string", default: "", maxLen: 60 },
            active: {
              type: "array",
              maxLen: 20,
              default: [],
              items: {
                type: "object",
                shape: {
                  id: { type: "string", default: "", maxLen: 60 },
                  title: { type: "string", default: "", maxLen: 80 },
                  status: { type: "enum", values: ["ACTIVE", "COMPLETED", "FAILED"], default: "ACTIVE" },
                  progress: { type: "number", default: 0, int: true, min: 0, max: 100 },
                  goal: { type: "number", default: 1, int: true, min: 1, max: 100 }
                }
              }
            },
            completedIds: {
              type: "array",
              maxLen: 60,
              default: [],
              items: { type: "string", default: "", maxLen: 60 }
            },
            failedIds: {
              type: "array",
              maxLen: 60,
              default: [],
              items: { type: "string", default: "", maxLen: 60 }
            }
          }
        },
        winLose: {
          type: "object",
          shape: {
            state: { type: "enum", values: ["ONGOING", "WIN", "LOSE"], default: "ONGOING" },
            reason: { type: "string", default: "", maxLen: 120 },
            victoryPoints: { type: "number", default: 0, int: true, min: 0, max: 9999 },
            defeatTier: { type: "number", default: 0, int: true, min: 0, max: 10 },
            reachedAtRound: { type: "number", default: -1, int: true, min: -1, max: 9999 }
          }
        },
        stats: {
          type: "object",
          shape: {
            combatsStarted: { type: "number", default: 0, int: true, min: 0, max: 9999 },
            combatsWon: { type: "number", default: 0, int: true, min: 0, max: 9999 },
            combatsLost: { type: "number", default: 0, int: true, min: 0, max: 9999 },
            decisionsMade: { type: "number", default: 0, int: true, min: 0, max: 9999 },
            containersOpened: { type: "number", default: 0, int: true, min: 0, max: 9999 },
            questsCompleted: { type: "number", default: 0, int: true, min: 0, max: 9999 },
            distanceTraveled: { type: "number", default: 0, int: true, min: 0, max: 99999 },
            roundsSurvived: { type: "number", default: 0, int: true, min: 0, max: 99999 },
            damageDealtTotal: { type: "number", default: 0, int: true, min: 0, max: 99999 },
            damageTakenTotal: { type: "number", default: 0, int: true, min: 0, max: 99999 }
          }
        },
        flags: {
          type: "object",
          shape: {
            firstWeaponFound: { type: "boolean", default: false },
            firstCombatDone: { type: "boolean", default: false }
          }
        },
        lastChoice: { type: "string", default: "NONE", maxLen: 24 },
        lastEvent: { type: "string", default: "Keine Entscheidung getroffen.", maxLen: 160 },
        log: {
          type: "array",
          items: { type: "string", default: "" },
          default: [],
          maxLen: 16
        }
      }
    }
  }
};

export const actionSchema = {
  START_GAME: { type: "object", shape: {} },
  SET_RELEASE_PROFILE: {
    type: "object",
    shape: {
      profile: { type: "enum", values: ["alpha", "beta", "rc"], default: DEFAULT_RELEASE_PROFILE }
    }
  },
  ACCEPT_RULES: { type: "object", shape: {} },
  NEXT_DIALOG: { type: "object", shape: {} },
  CHOOSE_LOADOUT: {
    type: "object",
    shape: {
      loadout: { type: "enum", values: ["SCAVENGER", "FIGHTER", "SURVIVOR"], default: "SURVIVOR" }
    }
  },
  CHOOSE_ACTION: {
    type: "object",
    shape: {
      choice: { type: "enum", values: ["SCOUT", "FORAGE", "REST"], default: "SCOUT" }
    }
  },
  INTERVENE: {
    type: "object",
    shape: {
      kind: {
        type: "enum",
        values: [
          "LIGHT_PULSE",
          "NUTRIENT_INJECTION",
          "TOXIN_ABSORB",
          "STRENGTHEN_LINEAGE",
          "TRIGGER_RAID",
          "BUILD_BRIDGE",
          "QUARANTINE_ZONE"
        ],
        default: "LIGHT_PULSE"
      }
    }
  },
  TRAVEL_TO: {
    type: "object",
    shape: {
      to: { type: "number", default: 0, int: true, min: 0, max: 20 }
    }
  },
  OPEN_ITEM_DETAIL: {
    type: "object",
    shape: {
      itemId: { type: "number", default: -1, int: true, min: -1, max: 9999 }
    }
  },
  CLOSE_ITEM_DETAIL: { type: "object", shape: {} },
  SELECT_COMBAT_ITEM: {
    type: "object",
    shape: {
      itemId: { type: "number", default: -1, int: true, min: -1, max: 9999 },
      instanceId: { type: "string", default: "", maxLen: 80 }
    }
  },
  BEGIN_COMBAT: { type: "object", shape: {} },
  CHANGE_STANCE: {
    type: "object",
    shape: {
      stance: { type: "enum", values: ["AGGRESSIVE", "DEFENSIVE", "BALANCED"], default: "BALANCED" }
    }
  },
  RETREAT_FROM_COMBAT: { type: "object", shape: {} },
  USE_EMERGENCY_ITEM: { type: "object", shape: {} },
  COLLECT_COMBAT_LOOT: { type: "object", shape: {} },
  RESOLVE_ENCOUNTER: {
    type: "object",
    shape: {
      mode: { type: "enum", values: ["DECISION", "COMBAT"], default: "DECISION" },
      optionId: { type: "string", default: "", maxLen: 40 }
    }
  },
  EQUIP_LOADOUT: {
    type: "object",
    shape: {
      slot: { type: "enum", values: ["MAIN_HAND", "OFF_HAND", "HEAD", "BODY", "UTILITY", "CHARM"], default: "MAIN_HAND" },
      itemId: { type: "number", default: -1, int: true, min: -1, max: 9999 }
    }
  },
  UNEQUIP_LOADOUT: {
    type: "object",
    shape: {
      slot: { type: "enum", values: ["MAIN_HAND", "OFF_HAND", "HEAD", "BODY", "UTILITY", "CHARM"], default: "MAIN_HAND" }
    }
  },
  APPLY_RESOURCE_DELTA: {
    type: "object",
    shape: {
      supplies: { type: "number", default: 0, int: true, min: -999, max: 999 },
      ammo: { type: "number", default: 0, int: true, min: -999, max: 999 },
      meds: { type: "number", default: 0, int: true, min: -999, max: 999 },
      scrap: { type: "number", default: 0, int: true, min: -999, max: 999 },
      intel: { type: "number", default: 0, int: true, min: -999, max: 999 },
      credits: { type: "number", default: 0, int: true, min: -999, max: 999 }
    }
  },
  QUEUE_DECISION: {
    type: "object",
    shape: {
      decisionId: { type: "string", default: "", maxLen: 60 },
      chainId: { type: "string", default: "", maxLen: 60 }
    }
  },
  RESOLVE_DECISION_OUTCOME: {
    type: "object",
    shape: {
      decisionId: { type: "string", default: "", maxLen: 60 },
      optionId: { type: "string", default: "", maxLen: 60 },
      outcome: { type: "enum", values: ["SUCCESS", "PARTIAL", "FAIL", "CRITICAL"], default: "SUCCESS" }
    }
  },
  REGISTER_LOOT_CONTAINER: {
    type: "object",
    shape: {
      containerId: { type: "string", default: "", maxLen: 60 },
      districtId: { type: "number", default: 0, int: true, min: 0, max: 9999 }
    }
  },
  OPEN_LOOT_CONTAINER: {
    type: "object",
    shape: {
      containerId: { type: "string", default: "", maxLen: 60 }
    }
  },
  UPDATE_QUEST: {
    type: "object",
    shape: {
      questId: { type: "string", default: "", maxLen: 60 },
      status: { type: "enum", values: ["ACTIVE", "COMPLETED", "FAILED"], default: "ACTIVE" },
      progress: { type: "number", default: 0, int: true, min: 0, max: 100 }
    }
  },
  SET_GAME_OUTCOME: {
    type: "object",
    shape: {
      state: { type: "enum", values: ["ONGOING", "WIN", "LOSE"], default: "ONGOING" },
      reason: { type: "string", default: "", maxLen: 120 }
    }
  },
  TRACK_STAT: {
    type: "object",
    shape: {
      statKey: {
        type: "enum",
        values: [
          "combatsStarted",
          "combatsWon",
          "combatsLost",
          "decisionsMade",
          "containersOpened",
          "questsCompleted",
          "distanceTraveled",
          "roundsSurvived",
          "damageDealtTotal",
          "damageTakenTotal"
        ],
        default: "decisionsMade"
      },
      amount: { type: "number", default: 1, int: true, min: -9999, max: 9999 }
    }
  },
  BACK_TO_MENU: { type: "object", shape: {} },
  SIM_STEP: { type: "object", shape: {} }
};

export const mutationMatrix = {
  START_GAME: ["/ui/screen", "/app/firstStart"],
  SET_RELEASE_PROFILE: ["/app/releaseProfile", "/app/featureFlags/autoResolveEncounterTimeout", "/app/featureFlags/strictInfluenceDefeat", "/app/featureFlags/enableRaidIntervention", "/game/lastEvent", "/game/log"],
  ACCEPT_RULES: ["/ui/screen", "/dialog/active", "/dialog/step"],
  NEXT_DIALOG: ["/ui/screen", "/dialog/active", "/dialog/step"],
  CHOOSE_LOADOUT: ["/ui/screen", "/dialog/active", "/dialog/step", "/game/inventory/items", "/game/inventory/selectedCombatItemId", "/game/inventory/selectedCombatItemInstanceId", "/game/maxHp", "/game/hp", "/game/supplies", "/game/resources/supplies", "/game/morale", "/game/archetype", "/game/archetypeTrait", "/game/lastChoice", "/game/lastEvent", "/game/log"],
  CHOOSE_ACTION: ["/game/round", "/game/hp", "/game/supplies", "/game/morale", "/game/substrate/influence", "/game/substrate/zeroInfluenceTicks", "/game/substrate/alivePct", "/game/substrate/lightPct", "/game/substrate/toxinPct", "/game/substrate/lineageControlPct", "/game/substrate/mutationLevel", "/game/over", "/game/winLose/state", "/game/winLose/reason", "/game/winLose/reachedAtRound", "/game/panelMode", "/game/panelAnim", "/game/lastChoice", "/game/lastEvent", "/game/log", "/game/resources/supplies", "/game/stats/roundsSurvived", "/game/lootContainers/discovered"],
  INTERVENE: ["/game/substrate/influence", "/game/substrate/zeroInfluenceTicks", "/game/substrate/alivePct", "/game/substrate/lightPct", "/game/substrate/toxinPct", "/game/substrate/lineageControlPct", "/game/substrate/mutationLevel", "/game/substrate/lastIntervention", "/game/lastEvent", "/game/log"],
  TRAVEL_TO: ["/game/transit/active", "/game/transit/from", "/game/transit/to", "/game/transit/progress", "/game/transit/cooldown", "/game/panelMode", "/game/panelAnim", "/game/lastEvent", "/game/log", "/game/stats/distanceTraveled"],
  OPEN_ITEM_DETAIL: ["/game/inventory/detailItemId"],
  CLOSE_ITEM_DETAIL: ["/game/inventory/detailItemId"],
  SELECT_COMBAT_ITEM: ["/game/inventory/items", "/game/inventory/selectedCombatItemId", "/game/inventory/selectedCombatItemInstanceId"],
  BEGIN_COMBAT: ["/game/combat/phase", "/game/combat/logLines", "/game/combat/selectedItemPower", "/game/combat/selectedItemKind", "/game/combat/emergencyUsed", "/game/combat/emergencyPenalty", "/game/lastEvent", "/game/log", "/game/inventory/items", "/game/inventory/selectedCombatItemId", "/game/inventory/selectedCombatItemInstanceId", "/game/hp", "/game/supplies", "/game/resources/supplies", "/game/combat/turn", "/game/combat/damageDealt", "/game/combat/damageTaken", "/game/stats/combatsStarted"],
  CHANGE_STANCE: ["/game/combat/stance", "/game/lastEvent", "/game/log"],
  RETREAT_FROM_COMBAT: ["/game/combat/phase", "/game/combat/active", "/game/combat/lastOutcome", "/game/hp", "/game/supplies", "/game/resources/supplies", "/game/over", "/game/winLose/state", "/game/winLose/reason", "/game/winLose/reachedAtRound", "/game/lastEvent", "/game/log", "/game/panelMode", "/game/panelAnim"],
  USE_EMERGENCY_ITEM: ["/game/hp", "/game/supplies", "/game/resources/supplies", "/game/morale", "/game/inventory/items", "/game/combat/emergencyUsed", "/game/combat/emergencyPenalty", "/game/lastEvent", "/game/log"],
  COLLECT_COMBAT_LOOT: ["/game/inventory/items", "/game/combat/pendingLootItemIds", "/game/combat/phase", "/game/lastEvent", "/game/log"],
  RESOLVE_ENCOUNTER: ["/game/encounter/active", "/game/encounter/text", "/game/encounter/decisionId", "/game/encounter/ageTicks", "/game/encounter/timeoutTicks", "/game/encounter/options", "/game/lastEvent", "/game/log", "/game/panelMode", "/game/panelAnim", "/game/hp", "/game/supplies", "/game/resources/supplies", "/game/resources/ammo", "/game/resources/meds", "/game/resources/scrap", "/game/resources/intel", "/game/resources/credits", "/game/morale", "/game/transit/progress", "/game/quests/active", "/game/over", "/game/winLose/state", "/game/winLose/reason", "/game/winLose/reachedAtRound", "/game/combat/active", "/game/combat/phase", "/game/combat/enemyId", "/game/combat/enemyName", "/game/combat/enemyTier", "/game/combat/enemyHp", "/game/combat/enemyMaxHp", "/game/combat/introText", "/game/combat/tick", "/game/combat/logLines", "/game/combat/pendingLootItemIds", "/game/combat/lastOutcome", "/game/decisions/history", "/game/decisions/lastOutcome", "/game/stats/decisionsMade"],
  EQUIP_LOADOUT: ["/game/loadout/slots/MAIN_HAND", "/game/loadout/slots/OFF_HAND", "/game/loadout/slots/HEAD", "/game/loadout/slots/BODY", "/game/loadout/slots/UTILITY", "/game/loadout/slots/CHARM", "/game/loadout/lastEquippedItemId"],
  UNEQUIP_LOADOUT: ["/game/loadout/slots/MAIN_HAND", "/game/loadout/slots/OFF_HAND", "/game/loadout/slots/HEAD", "/game/loadout/slots/BODY", "/game/loadout/slots/UTILITY", "/game/loadout/slots/CHARM"],
  APPLY_RESOURCE_DELTA: ["/game/resources/supplies", "/game/resources/ammo", "/game/resources/meds", "/game/resources/scrap", "/game/resources/intel", "/game/resources/credits", "/game/supplies"],
  QUEUE_DECISION: ["/game/decisions/activeDecisionId", "/game/decisions/chainId", "/game/decisions/queue", "/game/lastEvent", "/game/log"],
  RESOLVE_DECISION_OUTCOME: ["/game/decisions/activeDecisionId", "/game/decisions/history", "/game/decisions/lastOutcome", "/game/decisions/queue", "/game/supplies", "/game/resources/supplies", "/game/resources/ammo", "/game/resources/meds", "/game/resources/scrap", "/game/resources/intel", "/game/resources/credits", "/game/stats/decisionsMade", "/game/lastEvent", "/game/log"],
  REGISTER_LOOT_CONTAINER: ["/game/lootContainers/activeContainerId", "/game/lootContainers/discovered", "/game/inventory/openedContainerIds", "/game/lastEvent", "/game/log"],
  OPEN_LOOT_CONTAINER: ["/game/lootContainers/activeContainerId", "/game/lootContainers/opened", "/game/lootContainers/sealed", "/game/lootContainers/pendingRewards", "/game/inventory/items", "/game/inventory/openedContainerIds", "/game/resources/supplies", "/game/resources/ammo", "/game/resources/meds", "/game/resources/scrap", "/game/resources/intel", "/game/resources/credits", "/game/stats/containersOpened", "/game/lastEvent", "/game/log", "/game/supplies", "/game/hp", "/game/over", "/game/winLose/state", "/game/winLose/reason", "/game/winLose/reachedAtRound", "/game/combat/active", "/game/combat/phase", "/game/combat/enemyId", "/game/combat/enemyName", "/game/combat/enemyTier", "/game/combat/enemyHp", "/game/combat/enemyMaxHp", "/game/combat/introText", "/game/combat/tick", "/game/combat/logLines", "/game/combat/pendingLootItemIds", "/game/combat/lastOutcome", "/game/panelMode", "/game/panelAnim"],
  UPDATE_QUEST: ["/game/quests/trackedQuestId", "/game/quests/active", "/game/quests/completedIds", "/game/quests/failedIds", "/game/stats/questsCompleted", "/game/lastEvent", "/game/log"],
  SET_GAME_OUTCOME: ["/game/winLose/state", "/game/winLose/reason", "/game/winLose/reachedAtRound", "/game/over", "/game/lastEvent", "/game/log"],
  TRACK_STAT: ["/game/stats/combatsStarted", "/game/stats/combatsWon", "/game/stats/combatsLost", "/game/stats/decisionsMade", "/game/stats/containersOpened", "/game/stats/questsCompleted", "/game/stats/distanceTraveled", "/game/stats/roundsSurvived", "/game/stats/damageDealtTotal", "/game/stats/damageTakenTotal"],
  BACK_TO_MENU: ["/ui/screen", "/dialog/active"],
  SIM_STEP: ["/game/transit/progress", "/game/transit/active", "/game/transit/cooldown", "/game/playerDistrict", "/game/encounter/active", "/game/encounter/required", "/game/encounter/text", "/game/encounter/decisionId", "/game/encounter/ageTicks", "/game/encounter/timeoutTicks", "/game/encounter/options", "/game/lastEvent", "/game/log", "/game/panelMode", "/game/panelAnim", "/game/inventory/items", "/game/inventory/lootedDistricts", "/game/flags/firstWeaponFound", "/game/flags/firstCombatDone", "/game/combat/active", "/game/combat/phase", "/game/combat/enemyId", "/game/combat/enemyName", "/game/combat/enemyTier", "/game/combat/enemyHp", "/game/combat/enemyMaxHp", "/game/combat/introText", "/game/combat/tick", "/game/combat/logLines", "/game/combat/pendingLootItemIds", "/game/combat/emergencyPenalty", "/game/combat/lastOutcome", "/game/hp", "/game/over", "/game/resources/supplies", "/game/resources/ammo", "/game/resources/meds", "/game/resources/scrap", "/game/resources/intel", "/game/resources/credits", "/game/lootContainers/discovered", "/game/quests/active", "/game/winLose/state", "/game/winLose/reason", "/game/winLose/reachedAtRound", "/game/stats/distanceTraveled", "/game/stats/combatsWon", "/game/stats/combatsLost", "/game/substrate/influence", "/game/substrate/zeroInfluenceTicks", "/game/substrate/alivePct", "/game/substrate/lightPct", "/game/substrate/toxinPct", "/game/substrate/lineageControlPct", "/game/substrate/mutationLevel"]
};

export const manifest = {
  SCHEMA_VERSION,
  stateSchema,
  actionSchema,
  mutationMatrix
};
