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

function makeStore(initialDoc = null) {
  return createStore(
    manifest,
    { reducer, simStep },
    { actionAdapter: adaptLegacyAction, storageDriver: memoryDriver(initialDoc) }
  );
}

function bootToGame(store) {
  store.dispatch({ type: "START_GAME", payload: {} });
  store.dispatch({ type: "ACCEPT_RULES", payload: {} });
  store.dispatch({ type: "CHOOSE_LOADOUT", payload: { loadout: "SURVIVOR" } });
  store.dispatch({ type: "NEXT_DIALOG", payload: {} });
  store.dispatch({ type: "NEXT_DIALOG", payload: {} });
  store.dispatch({ type: "NEXT_DIALOG", payload: {} });
}

// 1) New inventories from loadout must contain stable instance ids.
{
  const s = makeStore();
  bootToGame(s);
  const items = s.getState().game.inventory.items;
  assert(items.length > 0, "loadout should provide items");
  for (const [idx, it] of items.entries()) {
    assert(typeof it.instanceId === "string" && it.instanceId.length > 0, `item ${idx} missing instanceId`);
  }
  assert(
    typeof s.getState().game.inventory.selectedCombatItemInstanceId === "string"
      && s.getState().game.inventory.selectedCombatItemInstanceId.length > 0,
    "loadout should set selectedCombatItemInstanceId"
  );
}

// 2) Legacy save migration path: selection + consume must work by instance id.
{
  const legacyDoc = {
    schemaVersion: manifest.SCHEMA_VERSION,
    updatedAt: 0,
    revisionCount: 0,
    state: {
      meta: { seed: "legacy-instance-seed" },
      ui: { screen: "GAME" },
      app: { firstStart: false },
      game: {
        over: false,
        hp: 8,
        maxHp: 10,
        supplies: 4,
        morale: 5,
        inventory: {
          items: [
            { id: 5, name: "Rationspack", kind: "CONSUMABLE", effect: "Vorrat +2", power: 2, slot: "NONE", rarity: "COMMON", stackable: true, qty: 1 },
            { id: 5, name: "Rationspack", kind: "CONSUMABLE", effect: "Vorrat +2", power: 2, slot: "NONE", rarity: "COMMON", stackable: true, qty: 1 }
          ],
          selectedCombatItemId: 5,
          selectedCombatItemInstanceId: "",
          detailItemId: -1
        },
        combat: { active: true, phase: "ACTIVE", emergencyUsed: false, emergencyPenalty: false }
      }
    }
  };

  const s = makeStore(legacyDoc);
  s.dispatch({ type: "SELECT_COMBAT_ITEM", payload: { itemId: 5, instanceId: "legacy_5_1" } });

  const afterSelect = s.getState();
  assert(afterSelect.game.inventory.items.every((it) => typeof it.instanceId === "string" && it.instanceId.length > 0), "legacy items must be normalized with instanceId");
  assert(afterSelect.game.inventory.selectedCombatItemInstanceId === "legacy_5_1", "selected instance id must be stored");

  s.dispatch({ type: "USE_EMERGENCY_ITEM", payload: {} });
  const afterUse = s.getState();
  assert(afterUse.game.inventory.items.length === 1, "one selected instance should be consumed");
  assert(afterUse.game.inventory.items[0].instanceId === "legacy_5_0", "remaining stack item should keep the non-selected legacy instance");
}

console.log("INVENTORY_INSTANCE_OK");
