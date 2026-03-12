import { createStore } from "../../src/kernel/store.js";
import { manifest } from "../../src/project/unified.manifest.js";
import { adaptLegacyAction } from "../../src/project/unified.adapters.js";
import { reducer, simStep } from "../../src/project/project.logic.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function memoryDriver(initialDoc = null) {
  let doc = initialDoc;
  return {
    load() { return doc; },
    save(next) { doc = next; }
  };
}

function makeStore(seed = "action-coverage", initialDoc = null) {
  const doc = initialDoc || {
    schemaVersion: manifest.SCHEMA_VERSION,
    updatedAt: 0,
    revisionCount: 0,
    state: { meta: { seed } }
  };
  return createStore(
    manifest,
    { reducer, simStep },
    { actionAdapter: adaptLegacyAction, storageDriver: memoryDriver(doc) }
  );
}

function bootToLoadout(store) {
  store.dispatch({ type: "START_GAME", payload: {} });
  store.dispatch({ type: "ACCEPT_RULES", payload: {} });
}

function bootToGame(store, loadout = "SURVIVOR") {
  bootToLoadout(store);
  store.dispatch({ type: "CHOOSE_LOADOUT", payload: { loadout } });
  store.dispatch({ type: "NEXT_DIALOG", payload: {} });
  store.dispatch({ type: "NEXT_DIALOG", payload: {} });
  store.dispatch({ type: "NEXT_DIALOG", payload: {} });
}

function baseDocWithGame(seed, gamePatch = {}, uiPatch = {}) {
  const st = makeStore(seed).getState();
  return {
    schemaVersion: manifest.SCHEMA_VERSION,
    updatedAt: 0,
    revisionCount: 0,
    state: {
      ...st,
      meta: { seed },
      ui: { ...st.ui, ...uiPatch },
      game: { ...st.game, ...gamePatch }
    }
  };
}

const cases = {
  START_GAME() {
    const s = makeStore("a-start");
    s.dispatch({ type: "START_GAME", payload: {} });
    assert(s.getState().ui.screen === "RULES", "START_GAME should open RULES on first start");
  },
  SET_RELEASE_PROFILE() {
    const s = makeStore("a-profile");
    s.dispatch({ type: "SET_RELEASE_PROFILE", payload: { profile: "alpha" } });
    assert(s.getState().app.releaseProfile === "alpha", "SET_RELEASE_PROFILE should set profile");
  },
  ACCEPT_RULES() {
    const s = makeStore("a-rules");
    s.dispatch({ type: "START_GAME", payload: {} });
    s.dispatch({ type: "ACCEPT_RULES", payload: {} });
    assert(s.getState().ui.screen === "LOADOUT_SELECTION", "ACCEPT_RULES should open loadout screen");
  },
  NEXT_DIALOG() {
    const s = makeStore("a-dialog");
    bootToLoadout(s);
    s.dispatch({ type: "CHOOSE_LOADOUT", payload: { loadout: "SURVIVOR" } });
    const step0 = s.getState().dialog.step;
    s.dispatch({ type: "NEXT_DIALOG", payload: {} });
    assert(s.getState().dialog.step === step0 + 1, "NEXT_DIALOG should advance step while dialog active");
  },
  BACK_TO_MENU() {
    const s = makeStore("a-menu");
    bootToGame(s);
    s.dispatch({ type: "BACK_TO_MENU", payload: {} });
    assert(s.getState().ui.screen === "MAIN_MENU", "BACK_TO_MENU should switch to MAIN_MENU");
  },
  CHOOSE_LOADOUT() {
    const s = makeStore("a-loadout");
    bootToLoadout(s);
    s.dispatch({ type: "CHOOSE_LOADOUT", payload: { loadout: "FIGHTER" } });
    const st = s.getState();
    assert(st.ui.screen === "DIALOG", "CHOOSE_LOADOUT should enter DIALOG");
    assert(st.game.inventory.items.length > 0, "CHOOSE_LOADOUT should seed inventory");
  },
  CHOOSE_ACTION() {
    const s = makeStore("a-choice");
    bootToGame(s);
    const beforeRound = s.getState().game.round;
    s.dispatch({ type: "CHOOSE_ACTION", payload: { choice: "REST" } });
    assert(s.getState().game.round === beforeRound + 1, "CHOOSE_ACTION should advance round");
  },
  INTERVENE() {
    const s = makeStore("a-intervene");
    bootToGame(s);
    s.dispatch({ type: "INTERVENE", payload: { kind: "LIGHT_PULSE" } });
    assert(s.getState().game.substrate.lastIntervention === "LIGHT_PULSE", "INTERVENE should set lastIntervention");
  },
  TRAVEL_TO() {
    const s = makeStore("a-travel");
    bootToGame(s);
    s.dispatch({ type: "TRAVEL_TO", payload: { to: 1 } });
    assert(s.getState().game.transit.active === true, "TRAVEL_TO should activate transit");
  },
  OPEN_ITEM_DETAIL() {
    const s = makeStore("a-open-item");
    bootToGame(s);
    const itemId = s.getState().game.inventory.items[0]?.id ?? -1;
    s.dispatch({ type: "OPEN_ITEM_DETAIL", payload: { itemId } });
    assert(s.getState().game.inventory.detailItemId === itemId, "OPEN_ITEM_DETAIL should set detail item id");
  },
  CLOSE_ITEM_DETAIL() {
    const s = makeStore("a-close-item");
    bootToGame(s);
    const itemId = s.getState().game.inventory.items[0]?.id ?? -1;
    s.dispatch({ type: "OPEN_ITEM_DETAIL", payload: { itemId } });
    s.dispatch({ type: "CLOSE_ITEM_DETAIL", payload: {} });
    assert(s.getState().game.inventory.detailItemId === -1, "CLOSE_ITEM_DETAIL should reset detail item id");
  },
  SELECT_COMBAT_ITEM() {
    const s = makeStore("a-select-item");
    bootToGame(s);
    const item = s.getState().game.inventory.items[1] || s.getState().game.inventory.items[0];
    s.dispatch({ type: "SELECT_COMBAT_ITEM", payload: { itemId: item.id, instanceId: item.instanceId || "" } });
    assert(s.getState().game.inventory.selectedCombatItemId === item.id, "SELECT_COMBAT_ITEM should set selected item id");
  },
  BEGIN_COMBAT() {
    const doc = baseDocWithGame("a-begin-combat", {
      over: false,
      combat: {
        active: true,
        phase: "PREP",
        enemyId: "RAIDER",
        enemyName: "Raider",
        enemyTier: 1,
        enemyHp: 6,
        enemyMaxHp: 6,
        introText: "x",
        selectedItemPower: 0,
        selectedItemKind: "",
        stance: "BALANCED",
        logLines: [],
        pendingLootItemIds: [],
        turn: 0,
        streak: 0,
        damageDealt: 0,
        damageTaken: 0,
        emergencyUsed: false,
        emergencyPenalty: false,
        lastOutcome: "NONE",
        tick: 0
      },
      inventory: {
        items: [{ id: 4, instanceId: "it_4_1", name: "Verbandskit", kind: "CONSUMABLE", effect: "Heilt 3 HP", power: 3, flavor: "", slot: "NONE", rarity: "COMMON", stackable: true, qty: 1 }],
        selectedCombatItemId: 4,
        selectedCombatItemInstanceId: "it_4_1",
        detailItemId: -1,
        lootedDistricts: [],
        openedContainerIds: [],
        stash: [],
        capacity: 24
      }
    }, { screen: "GAME" });
    const s = makeStore("a-begin-combat", doc);
    s.dispatch({ type: "BEGIN_COMBAT", payload: {} });
    assert(s.getState().game.combat.phase === "ACTIVE", "BEGIN_COMBAT should start active phase");
  },
  CHANGE_STANCE() {
    const doc = baseDocWithGame("a-stance", {
      over: false,
      combat: { active: true, phase: "PREP", stance: "BALANCED" }
    }, { screen: "GAME" });
    const s = makeStore("a-stance", doc);
    s.dispatch({ type: "CHANGE_STANCE", payload: { stance: "AGGRESSIVE" } });
    assert(s.getState().game.combat.stance === "AGGRESSIVE", "CHANGE_STANCE should update stance");
  },
  RETREAT_FROM_COMBAT() {
    const doc = baseDocWithGame("a-retreat", {
      over: false,
      hp: 8,
      supplies: 8,
      resources: { supplies: 8, ammo: 0, meds: 0, scrap: 0, intel: 0, credits: 0, keys: [] },
      combat: { active: true, phase: "ACTIVE", enemyHp: 11, enemyMaxHp: 20, lastOutcome: "NONE" }
    }, { screen: "GAME" });
    const s = makeStore("a-retreat", doc);
    s.dispatch({ type: "RETREAT_FROM_COMBAT", payload: {} });
    assert(s.getState().game.combat.active === false, "RETREAT_FROM_COMBAT should end combat activity");
  },
  USE_EMERGENCY_ITEM() {
    const doc = baseDocWithGame("a-emergency", {
      over: false,
      hp: 5,
      combat: { active: true, phase: "ACTIVE", emergencyUsed: false, emergencyPenalty: false },
      inventory: {
        items: [{ id: 4, instanceId: "it_4_1", name: "Verbandskit", kind: "CONSUMABLE", effect: "Heilt 3 HP", power: 3, flavor: "", slot: "NONE", rarity: "COMMON", stackable: true, qty: 1 }],
        selectedCombatItemId: 4,
        selectedCombatItemInstanceId: "it_4_1",
        detailItemId: -1,
        lootedDistricts: [],
        openedContainerIds: [],
        stash: [],
        capacity: 24
      }
    }, { screen: "GAME" });
    const s = makeStore("a-emergency", doc);
    s.dispatch({ type: "USE_EMERGENCY_ITEM", payload: {} });
    assert(s.getState().game.combat.emergencyUsed === true, "USE_EMERGENCY_ITEM should set emergencyUsed");
  },
  COLLECT_COMBAT_LOOT() {
    const doc = baseDocWithGame("a-collect", {
      over: false,
      combat: { pendingLootItemIds: [4], phase: "RESOLVED", active: false }
    }, { screen: "GAME" });
    const s = makeStore("a-collect", doc);
    const before = s.getState().game.inventory.items.length;
    s.dispatch({ type: "COLLECT_COMBAT_LOOT", payload: {} });
    const after = s.getState();
    assert(after.game.combat.pendingLootItemIds.length === 0, "COLLECT_COMBAT_LOOT should clear pending loot");
    assert(after.game.inventory.items.length >= before, "COLLECT_COMBAT_LOOT should not reduce inventory");
  },
  RESOLVE_ENCOUNTER() {
    const doc = baseDocWithGame("a-enc", {
      over: false,
      encounter: {
        active: true,
        required: "DECISION",
        text: "x",
        decisionId: "d1",
        ageTicks: 0,
        timeoutTicks: 6,
        options: [{ id: "opt1", label: "Opt", mode: "DECISION", costText: "", gainText: "", riskText: "", hpDelta: 0, suppliesDelta: 0, moraleDelta: 0, ammoDelta: 0, medsDelta: 0, scrapDelta: 0, intelDelta: 0, creditsDelta: 0, progressDelta: 0, questProgressDelta: 0 }]
      }
    }, { screen: "GAME" });
    const s = makeStore("a-enc", doc);
    s.dispatch({ type: "RESOLVE_ENCOUNTER", payload: { mode: "DECISION", optionId: "opt1" } });
    assert(s.getState().game.encounter.active === false, "RESOLVE_ENCOUNTER should close encounter");
  },
  EQUIP_LOADOUT() {
    const s = makeStore("a-equip");
    bootToGame(s, "FIGHTER");
    s.dispatch({ type: "EQUIP_LOADOUT", payload: { slot: "MAIN_HAND", itemId: 1 } });
    assert(s.getState().game.loadout.slots.MAIN_HAND === 1, "EQUIP_LOADOUT should set slot item");
  },
  UNEQUIP_LOADOUT() {
    const s = makeStore("a-unequip");
    bootToGame(s, "FIGHTER");
    s.dispatch({ type: "EQUIP_LOADOUT", payload: { slot: "MAIN_HAND", itemId: 1 } });
    s.dispatch({ type: "UNEQUIP_LOADOUT", payload: { slot: "MAIN_HAND" } });
    assert(s.getState().game.loadout.slots.MAIN_HAND === -1, "UNEQUIP_LOADOUT should clear slot");
  },
  APPLY_RESOURCE_DELTA() {
    const s = makeStore("a-resource");
    bootToGame(s);
    const beforeAmmo = s.getState().game.resources.ammo;
    s.dispatch({ type: "APPLY_RESOURCE_DELTA", payload: { ammo: 2, supplies: 1 } });
    assert(s.getState().game.resources.ammo === beforeAmmo + 2, "APPLY_RESOURCE_DELTA should change ammo");
  },
  QUEUE_DECISION() {
    const s = makeStore("a-queue");
    bootToGame(s);
    s.dispatch({ type: "QUEUE_DECISION", payload: { decisionId: "dq1", chainId: "c1" } });
    assert(s.getState().game.decisions.queue.includes("dq1"), "QUEUE_DECISION should append decision id");
  },
  RESOLVE_DECISION_OUTCOME() {
    const s = makeStore("a-resolve-decision");
    bootToGame(s);
    s.dispatch({ type: "QUEUE_DECISION", payload: { decisionId: "dq2", chainId: "c1" } });
    s.dispatch({ type: "RESOLVE_DECISION_OUTCOME", payload: { decisionId: "dq2", optionId: "x", outcome: "SUCCESS" } });
    assert(s.getState().game.decisions.lastOutcome === "SUCCESS", "RESOLVE_DECISION_OUTCOME should set lastOutcome");
  },
  REGISTER_LOOT_CONTAINER() {
    const s = makeStore("a-register-container");
    bootToGame(s);
    s.dispatch({ type: "REGISTER_LOOT_CONTAINER", payload: { districtId: 1, containerId: "locker_alpha" } });
    assert(s.getState().game.lootContainers.activeContainerId === "1:locker_alpha", "REGISTER_LOOT_CONTAINER should set active id");
  },
  OPEN_LOOT_CONTAINER() {
    const doc = baseDocWithGame("a-open-container", {
      over: false,
      playerDistrict: 1,
      transit: { active: false, from: 1, to: 1, progress: 0, cooldown: 0 },
      encounter: { active: false, required: "DECISION", text: "", decisionId: "", ageTicks: 0, timeoutTicks: 6, options: [] },
      combat: { active: false, phase: "NONE", pendingLootItemIds: [] },
      lootContainers: { activeContainerId: "", discovered: [], opened: [], sealed: [], pendingRewards: [] }
    }, { screen: "GAME" });
    const s = makeStore("a-open-container", doc);
    s.dispatch({ type: "OPEN_LOOT_CONTAINER", payload: { containerId: "1:locker_alpha" } });
    const st = s.getState();
    assert(st.game.lootContainers.activeContainerId === "1:locker_alpha", "OPEN_LOOT_CONTAINER should set active id");
    assert(st.game.lootContainers.opened.includes("1:locker_alpha"), "OPEN_LOOT_CONTAINER should open locker_alpha on district 1");
  },
  UPDATE_QUEST() {
    const s = makeStore("a-quest");
    bootToGame(s);
    s.dispatch({ type: "UPDATE_QUEST", payload: { questId: "q1", status: "ACTIVE", progress: 20 } });
    assert(s.getState().game.quests.trackedQuestId === "q1", "UPDATE_QUEST should set trackedQuestId");
  },
  SET_GAME_OUTCOME() {
    const s = makeStore("a-outcome");
    bootToGame(s);
    s.dispatch({ type: "SET_GAME_OUTCOME", payload: { state: "LOSE", reason: "TEST" } });
    assert(s.getState().game.winLose.state === "LOSE", "SET_GAME_OUTCOME should set winLose state");
  },
  TRACK_STAT() {
    const s = makeStore("a-track-stat");
    bootToGame(s);
    const before = s.getState().game.stats.decisionsMade;
    s.dispatch({ type: "TRACK_STAT", payload: { statKey: "decisionsMade", amount: 2 } });
    assert(s.getState().game.stats.decisionsMade === before + 2, "TRACK_STAT should increment selected stat");
  },
  SIM_STEP() {
    const s = makeStore("a-sim-step");
    bootToGame(s);
    const beforeRev = s.getDoc().revisionCount;
    s.dispatch({ type: "SIM_STEP", payload: {} });
    assert(s.getDoc().revisionCount === beforeRev + 1, "SIM_STEP should dispatch through store revision flow");
  }
};

const manifestActions = Object.keys(manifest.actionSchema).sort();
const caseActions = Object.keys(cases).sort();
assert(JSON.stringify(caseActions) === JSON.stringify(manifestActions), `action case mismatch. missing or extra: manifest=${manifestActions.join(",")}, cases=${caseActions.join(",")}`);

for (const actionType of manifestActions) {
  cases[actionType]();
}

console.log("ACTION_COVERAGE_OK");
