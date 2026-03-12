# TODO-Stand (LLM_ENTRY-konform)

Datum: 2026-03-11

## Abgeschlossen
- [x] `EQUIP_LOADOUT` / `UNEQUIP_LOADOUT`
- [x] `APPLY_RESOURCE_DELTA`
- [x] `QUEUE_DECISION` / `RESOLVE_DECISION_OUTCOME`
- [x] `REGISTER_LOOT_CONTAINER`
- [x] `UPDATE_QUEST`
- [x] `SET_GAME_OUTCOME`
- [x] `TRACK_STAT`
- [x] Manifest-Gate-Abgleich fuer neue Patch-Pfade (`/game/supplies` bei `RESOLVE_DECISION_OUTCOME`)
- [x] UI-Lifecycle-Hardening (`wireUi` idempotent, kein doppelter RAF/Sub-Loop)
- [x] Input-Hardening (Pointer-Handling vereinheitlicht, Equip-Dispatch validiert)
- [x] Core-Gate/Bypass-Pruefung und Drift-Signaturtest

## Offen (naechste Iteration)
- [x] Combat-Renderer in klar getrennte Phasen-Renderer aufsplitten (`PREP`, `ACTIVE`, `OUTCOME`).
- [x] Action/Encounter-UI weiter auf 1 primaeres CTA pro Zustand reduzieren.
- [x] Mobile-Polish fuer Map/Route-Infos (Tap-Flow, Lesbarkeit, Hitbox-Feintuning).
- [x] Inventory-UX weiter strukturieren (Quick Slots, Status-Tags, Detail-Sheet-Flow).

## Naechster Ausbau (optional)
- [ ] Combat-FX um differenzierte Trefferarten erweitern (slash, blunt, crit) inkl. separater Farb- und Partikelprofile.
- [ ] Canvas-Layer mit leichter Parallax auf Geraete-Neigung/Pointer-Offset anreichern (mit mobile fallback).
- [ ] UI-Transitions weiter entkoppeln (zustandsbezogene transition tokens statt globaler Defaults).
- [ ] Einfaches Grafik-Qualitaetsmenue (Auto/Low/Medium/High) als UI-Toggle anbieten.

## Erweiterte TODO (Masterplan MD1 Umsetzung)
Quelle: `/root/Fusion/docs/MASTERPLAN_MD1.md`

### Phase 1: Kern-Architektur auf SUBSTRATE-Zielbild bringen
- [x] Unified-Manifest in diesem Projektstand anlegen (`stateSchema`, `actionSchema`, `mutationMatrix`).
- [x] Store strikt auf Patch-Gate + erlaubte Mutation-Pfade pruefen.
- [x] Deterministische RNG-Streams fuer alle Sim-Pfade erzwingen.
- [x] Basis-Sim-Schritt als klare Engine-Funktion kapseln (kein UI/IO im Tick).

### Phase 2: Weltmodell und Eingriffe nach MD1
- [x] Lebenswelt-Felder fuer `alive`, `light`, `toxin`, `lineage`, `traits` konsolidieren.
- [x] Einfluss-Ressource als primaere Spielerressource integrieren (Regen/Cap/Failsafe).
- [x] Interventionen aus MD1 als kanonische Actions aufnehmen:
- [x] `LIGHT_PULSE`, `NUTRIENT_INJECTION`, `TOXIN_ABSORB`, `STRENGTHEN_LINEAGE`, `TRIGGER_RAID`, `BUILD_BRIDGE`, `QUARANTINE_ZONE`.
- [x] Kosten/Risiko/Outcome in Config zentralisieren und testbar machen.

### Phase 3: Encounter-System auf 12 Kernszenarien erweitern
- [ ] Encounter-Katalog auf mindestens 12 Szenarien aus MD1 ausbauen.
- [ ] Trigger an Weltzustand koppeln (kein reines Zufalls-Only).
- [ ] Optionen mit 2-4 Entscheidungen pro Encounter vereinheitlichen.
- [x] Timeout/Auto-Resolve-Regel mit klaren Folgen einbauen.

### Phase 4: Sieg-/Niederlagenregeln vollstaendig
- [ ] Dominanzpfad implementieren und schwellwertbasiert testen.
- [ ] Symbiosepfad implementieren und zeitfensterbasiert testen.
- [ ] Metamorphosepfad (Evolutionsstufe) implementieren und testen.
- [ ] Niederlage fuer Linienaussterben, Weltkollaps und Einfluss-Nullpfad haerten.

### Phase 5: UI und Spielgefuehl
- [ ] Onboarding-Sequenz nach MD1 umsetzen (`INTRO` -> `BIND` -> `PLAY` -> `END`).
- [ ] Dual-UI (`TACTICAL`/`ORGANIC`) auf identischen State absichern.
- [ ] Encounter-Panel dezent, aber entscheidungsstark halten (klare CTA, klare Kosten).
- [ ] Visuelle Marker fuer Kolonien/Toxin/Raids/Mutationen schaerfen.

### Phase 6: Qualitaetsgates und Release-Reife
- [x] Testkette verbindlich: `smoke -> invariants -> stability -> drift -> gate-redteam`.
- [ ] Edge-Case-Tests erweitern (daueraktive Encounter, frueher Kollaps, Einfluss=0).
- [x] Legacy-Adapter fuer Alt-Actions (SoD/Lifex) erweitern und absichern.
- [x] Release-Profil `alpha/beta/rc` mit Feature-Flags vorbereiten.

### Phase 2.1: Legacy-Adapter/Tests (abgeschlossen)
- [x] Adapter-Layer `src/project/unified.adapters.js` mit Action-Mapping angelegt.
- [x] Store-Integration: Action-Adapter-Hook in `createStore` eingebaut.
- [x] Testskripte fuer Adapter und Store-Integration erstellt (`scripts/tests/*`).
- [x] `package.json` um `test:adapter`, `test:store-adapter`, `test` erweitert.
