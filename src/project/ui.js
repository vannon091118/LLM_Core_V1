import { render } from "./renderer.js";
import { CITY_ROADS, findDistrict, neighborsOpen } from "./city.map.js";
import { createCanvasFxController } from "./canvas.fx.js";

const LOADOUT_SLOTS = new Set(["MAIN_HAND", "OFF_HAND", "HEAD", "BODY", "UTILITY", "CHARM"]);
const UI_SIM_STEP_MS = 130;

function isUiSimActive(state) {
  return state.ui.screen === "GAME"
    && !state.game.over
    && ((state.game.transit.active && !state.game.encounter.active)
      || (state.game.combat.active && state.game.combat.phase === "ACTIVE"));
}

export function advanceUiSimDeterministic(store, acc, dt) {
  const dtMs = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  let nextAcc = acc + dtMs;
  let guard = 0;
  while (nextAcc + 1e-9 >= UI_SIM_STEP_MS && isUiSimActive(store.getState())) {
    store.dispatch({ type: "SIM_STEP", payload: {} });
    nextAcc -= UI_SIM_STEP_MS;
    guard += 1;
    if (guard > 64) break;
  }
  return nextAcc;
}

export function wireUi(root, store) {
  if (!root) {
    throw new Error("UI mount root missing");
  }
  if (typeof root.__sodCleanup === "function") {
    try {
      root.__sodCleanup();
    } catch (err) {
      console.warn("Previous UI cleanup failed", err);
    }
  }

  const uiMemory = root.__sodUiMemory || { selectedDistrictId: -1 };
  root.__sodUiMemory = uiMemory;
  const fx = createCanvasFxController();

  const dispatchType = (type) => store.dispatch({ type, payload: {} });
  const dispatchChoice = (choice) => store.dispatch({ type: "CHOOSE_ACTION", payload: { choice } });
  const dispatchTravel = (to) => store.dispatch({ type: "TRAVEL_TO", payload: { to } });
  const dispatchOpenDetail = (itemId) => store.dispatch({ type: "OPEN_ITEM_DETAIL", payload: { itemId } });
  const dispatchSelectCombatItem = (itemId, instanceId = "") => store.dispatch({ type: "SELECT_COMBAT_ITEM", payload: { itemId, instanceId } });
  const dispatchLoadout = (loadout) => store.dispatch({ type: "CHOOSE_LOADOUT", payload: { loadout } });
  const dispatchStance = (stance) => store.dispatch({ type: "CHANGE_STANCE", payload: { stance } });
  const dispatchResolveDecision = (mode, optionId) => store.dispatch({ type: "RESOLVE_ENCOUNTER", payload: { mode, optionId } });
  const dispatchRetreat = () => store.dispatch({ type: "RETREAT_FROM_COMBAT", payload: {} });
  const dispatchUseEmergency = () => store.dispatch({ type: "USE_EMERGENCY_ITEM", payload: {} });
  const dispatchCollectLoot = () => store.dispatch({ type: "COLLECT_COMBAT_LOOT", payload: {} });
  const dispatchOpenContainer = (containerId) => store.dispatch({ type: "OPEN_LOOT_CONTAINER", payload: { containerId } });
  const dispatchIntervention = (kind) => store.dispatch({ type: "INTERVENE", payload: { kind } });

  const dispatchEquipLoadout = (slot, itemId) => {
    if (!LOADOUT_SLOTS.has(slot)) return;
    if (!Number.isFinite(itemId) || itemId < 0) return;
    store.dispatch({ type: "EQUIP_LOADOUT", payload: { slot, itemId: Math.trunc(itemId) } });
  };

  const dispatchUnequipLoadout = (slot) => {
    if (!LOADOUT_SLOTS.has(slot)) return;
    store.dispatch({ type: "UNEQUIP_LOADOUT", payload: { slot } });
  };

  function attachMapHover(tree) {
    const mapCanvas = tree.querySelector('[data-city-map="1"]');
    const hintNode = tree.querySelector('[data-map-hint="1"]');
    const selectedNode = tree.querySelector('[data-map-selected="1"]');
    if (!mapCanvas || !hintNode || typeof mapCanvas._districtAt !== "function") return;

    if (Number.isFinite(uiMemory.selectedDistrictId)) {
      mapCanvas.dataset.selectedDistrict = String(uiMemory.selectedDistrictId);
    }

    const setHint = (districtId) => {
      if (districtId < 0) {
        const s = store.getState();
        hintNode.textContent = s.game.transit.active ? `Transit aktiv: ${s.game.transit.progress}%` : "Hover: District-Infos und Blockaden pruefen.";
        return;
      }
      const district = findDistrict(districtId);
      if (!district) return;
      const open = neighborsOpen(district.id)
        .map((id) => findDistrict(id)?.name ?? id)
        .join(", ");
      const blocked = CITY_ROADS
        .filter((r) => r.blocked && (r.a === district.id || r.b === district.id))
        .map((r) => findDistrict(r.a === district.id ? r.b : r.a)?.name ?? "?")
        .join(", ");
      hintNode.textContent = `District: ${district.name} // Open: ${open || "-"} // Blocked: ${blocked || "-"}`;
    };

    const setSelectedText = (districtId) => {
      if (!selectedNode) return;
      const district = districtId >= 0 ? findDistrict(districtId) : null;
      if (!district) {
        selectedNode.textContent = "Auswahl: kein District gewaehlt.";
        return;
      }
      const open = neighborsOpen(district.id)
        .map((id) => findDistrict(id)?.name ?? id)
        .join(", ");
      const blocked = CITY_ROADS
        .filter((r) => r.blocked && (r.a === district.id || r.b === district.id))
        .map((r) => findDistrict(r.a === district.id ? r.b : r.a)?.name ?? "?")
        .join(", ");
      selectedNode.textContent = `Auswahl: ${district.name} // Offen: ${open || "-"} // Blockiert: ${blocked || "-"}`;
    };

    const setSelection = (districtId) => {
      const normalized = Number.isFinite(districtId) ? districtId : -1;
      uiMemory.selectedDistrictId = normalized;
      mapCanvas.dataset.selectedDistrict = String(normalized);
      setSelectedText(normalized);
      if (normalized >= 0) setHint(normalized);
    };

    const selectDistrictAt = (x, y) => {
      const district = mapCanvas._districtAt(mapCanvas, x, y);
      setSelection(district ? district.id : -1);
    };

    mapCanvas.addEventListener("pointermove", (ev) => {
      const district = mapCanvas._districtAt(mapCanvas, ev.clientX, ev.clientY);
      const districtId = district ? district.id : -1;
      if (mapCanvas.dataset.hoverDistrict === String(districtId)) return;
      mapCanvas.dataset.hoverDistrict = String(districtId);
      setHint(districtId);
    });

    mapCanvas.addEventListener("pointerdown", (ev) => {
      selectDistrictAt(ev.clientX, ev.clientY);
    });

    mapCanvas.addEventListener("pointerleave", () => {
      if (mapCanvas.dataset.hoverDistrict === "-1") return;
      mapCanvas.dataset.hoverDistrict = "-1";
      setHint(-1);
    });

    setSelectedText(Number(mapCanvas.dataset.selectedDistrict ?? -1));
  }

  function mount() {
    const tree = render(store.getState());
    root.innerHTML = "";
    root.appendChild(tree);
    fx.attach(root, store.getState());

    const start = root.querySelector('[data-action="start"]');
    const acceptRules = root.querySelector('[data-action="accept-rules"]');
    const nextDialog = root.querySelector('[data-action="next-dialog"]');
    const menu = root.querySelectorAll('[data-action="menu"]');
    const choices = root.querySelectorAll("[data-choice]");
    const travels = root.querySelectorAll("[data-travel-to]");
    const openContainers = root.querySelectorAll("[data-open-container]");
    const openDetails = root.querySelectorAll("[data-item-detail]");
    const closeDetail = root.querySelector('[data-close-item-detail="1"]');
    const selectCombatItems = root.querySelectorAll("[data-select-combat-item]");
    const beginCombat = root.querySelector('[data-begin-combat="1"]');
    const retreatCombat = root.querySelector('[data-retreat-combat="1"]');
    const useEmergency = root.querySelector('[data-use-emergency="1"]');
    const collectCombatLoot = root.querySelector('[data-collect-combat-loot="1"]');
    const stanceButtons = root.querySelectorAll("[data-stance]");
    const resolveDecisionButtons = root.querySelectorAll("[data-resolve-mode]");
    const interventionButtons = root.querySelectorAll("[data-intervention]");
    const loadoutCards = root.querySelectorAll("[data-loadout-id]");
    const equipButtons = root.querySelectorAll("[data-equip-item]");
    const unequipButtons = root.querySelectorAll("[data-unequip-slot]");

    if (start) start.addEventListener("click", () => dispatchType("START_GAME"));
    if (acceptRules) acceptRules.addEventListener("click", () => dispatchType("ACCEPT_RULES"));
    if (nextDialog) nextDialog.addEventListener("click", () => dispatchType("NEXT_DIALOG"));
    for (const btn of menu) btn.addEventListener("click", () => dispatchType("BACK_TO_MENU"));

    for (const btn of choices) {
      btn.addEventListener("click", () => dispatchChoice(btn.getAttribute("data-choice")));
    }
    for (const btn of travels) {
      btn.addEventListener("click", () => dispatchTravel(Number(btn.getAttribute("data-travel-to"))));
    }
    for (const btn of openContainers) {
      btn.addEventListener("click", () => dispatchOpenContainer(btn.getAttribute("data-open-container")));
    }
    for (const btn of openDetails) {
      btn.addEventListener("click", () => dispatchOpenDetail(Number(btn.getAttribute("data-item-detail"))));
    }
    if (closeDetail) closeDetail.addEventListener("click", () => dispatchType("CLOSE_ITEM_DETAIL"));
    for (const btn of selectCombatItems) {
      btn.addEventListener("click", () => dispatchSelectCombatItem(
        Number(btn.getAttribute("data-select-combat-item")),
        String(btn.getAttribute("data-select-combat-item-instance") || "")
      ));
    }
    for (const btn of loadoutCards) {
      btn.addEventListener("click", () => dispatchLoadout(btn.getAttribute("data-loadout-id")));
    }
    if (beginCombat) beginCombat.addEventListener("click", () => dispatchType("BEGIN_COMBAT"));
    if (retreatCombat) retreatCombat.addEventListener("click", () => dispatchRetreat());
    if (useEmergency) useEmergency.addEventListener("click", () => dispatchUseEmergency());
    if (collectCombatLoot) collectCombatLoot.addEventListener("click", () => dispatchCollectLoot());
    for (const btn of stanceButtons) {
      btn.addEventListener("click", () => dispatchStance(btn.getAttribute("data-stance")));
    }
    for (const btn of resolveDecisionButtons) {
      btn.addEventListener("click", () => dispatchResolveDecision(btn.getAttribute("data-resolve-mode"), btn.getAttribute("data-resolve-option")));
    }
    for (const btn of interventionButtons) {
      btn.addEventListener("click", () => dispatchIntervention(btn.getAttribute("data-intervention")));
    }
    for (const btn of equipButtons) {
      btn.addEventListener("click", () => dispatchEquipLoadout(btn.getAttribute("data-equip-slot"), Number(btn.getAttribute("data-equip-item"))));
    }
    for (const btn of unequipButtons) {
      btn.addEventListener("click", () => dispatchUnequipLoadout(btn.getAttribute("data-unequip-slot")));
    }

    attachMapHover(tree);
  }

  const unsubscribe = store.subscribe(mount);
  mount();

  let rafId = 0;
  let destroyed = false;
  let lastTs = 0;
  let acc = 0;

  function tick(ts) {
    if (destroyed) return;
    if (!lastTs) lastTs = ts;
    const dt = ts - lastTs;
    acc += dt;
    lastTs = ts;

    const s = store.getState();
    fx.step(dt, s, uiMemory);
    acc = advanceUiSimDeterministic(store, acc, dt);
    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);

  const cleanup = () => {
    if (destroyed) return;
    destroyed = true;
    try {
      unsubscribe();
    } catch (err) {
      console.warn("UI unsubscribe failed", err);
    }
    try {
      fx.detach();
    } catch (err) {
      console.warn("FX detach failed", err);
    }
    if (rafId) cancelAnimationFrame(rafId);
  };
  root.__sodCleanup = cleanup;
}
