# TODO + Masterplan (Substrate)

Datum: 2026-03-11
Status: aktive Arbeitsliste

## Quelle
- Kanonisch: diese Datei (`docs/03_TODO_MASTERPLAN.md`)
- Eingepflegter Snapshot: `docs_legacy_20260311/05_MASTERPLAN_MD1_PLAN.md`
- Integrationsquelle fuer Ausbau: `/root/LifexLab` (sim/worldgen/reducer Muster)

## Bereits abgeschlossen
- [x] Unified-Manifest + MutationMatrix + Store-Contract-Checks aktiv
- [x] Deterministische RNG-Streams im Sim-Pfad aktiv
- [x] Legacy-Adapter integriert (`src/project/unified.adapters.js`)
- [x] Release-Profile (`alpha/beta/rc`) mit Feature-Flags aktiv
- [x] Testkette aktiv: `smoke -> invariants -> stability -> drift -> gate-redteam`
- [x] Encounter-Katalog auf 12 Szenarien erweitert (laut Changelog v0.1.14)
- [x] Timeout/Auto-Resolve-Regel umgesetzt
- [x] Transit-Encounter jetzt weltzustandsgebunden gewichtet (Substrate Threat/Stability Modell aus Lifex-Prinzip abgeleitet)

## Offene Kernaufgaben (priorisiert)
1. Konsistenz von Ressourcenpfaden haerten
- [x] `game.supplies` und `game.resources.supplies` auf eine eindeutige Quelle vereinheitlichen
- [x] Regressionstest fuer Supply-Drift ergaenzen

2. Victory/Defeat-Pfade vollstaendig schliessen
- [x] Dominanzpfad implementieren und testbar machen
- [x] Symbiosepfad implementieren und testbar machen
- [x] Metamorphosepfad implementieren und testbar machen
- [x] Defeat-Regeln fuer Linienaussterben/Weltkollaps/Influence-Nullpfad haerten

3. Encounter/Outcome-Realitaet an UI-Vertrag angleichen
- [x] Outcome-Typen aus dem Decision-Katalog vollstaendig in Runtime anwenden (inkl. AMMO/INTEL/SCRAP/CREDITS/progress/QUEST_PROGRESS)
- [x] Trigger staerker an Weltzustand binden (Transit-Encounter ueber Threat/Stability + Substrate-Encounter-Pick)
- [x] 2-4 Entscheidungen pro Encounter als harte Mindestregel absichern

4. UI/UX Ausbau
- [ ] Onboarding-Sequenz (`INTRO -> BIND -> PLAY -> END`) abschliessen
- [ ] Dual-UI (`TACTICAL`/`ORGANIC`) auf identischen State absichern
- [ ] Encounter-/Intervention-UI auf klare CTA + Kosten/Nutzen finalisieren
- [ ] Optionale FX-Ausbaupunkte (Trefferarten, Parallax, Quality-Menue)

5. Testabdeckung erweitern
- [x] Abdeckung fuer bisher ungetestete Actions ergaenzen (`OPEN_LOOT_CONTAINER`, `UPDATE_QUEST`, `TRACK_STAT`, etc.)
- [x] Direkte Tests fuer `patches.js`, `schema.js`, `rng.js`, `renderer.js`, `ui.js` aufnehmen
- [x] Flaky-Risiko im Stability-Test reduzieren (wall-clock Grenzwert entkoppeln)

## Vollaudit-Backlog (alle fehlenden Schritte)
0. Kritische Kernel-Haertung (P0)
- [x] `getDoc()` gegen externe Mutation haerten (nur readonly/frozen Rueckgabe, kein Live-Objekt leaken)
- [x] Persistenz-Commit atomar machen (bei `driver.save`-Fehler kein in-memory Split-Brain)
- [x] Determinismus-Guard auf weitere Quellen erweitern (`crypto.getRandomValues`, `crypto.randomUUID`, etc.)
- [x] Startprofil-Lesen fail-closed machen (Persistenzfehler nicht nur warnen)

1. Gameplay-Konsistenz (P1)
- [x] `CHOOSE_LOADOUT` korrigieren: `maxHp` mit Archetyp synchron setzen
- [x] Supply-Pfade vereinheitlichen (`game.supplies` vs `game.resources.supplies`)
- [x] Container-Endstate-Reihenfolge korrigieren (Drop zuerst, Defeat-Check danach)
- [x] Decision-Rewards vollstaendig anwenden (`AMMO`, `INTEL`, `SCRAP`, `CREDITS`, `progress`, `QUEST_PROGRESS`)
- [x] District-Risikoanzeige reparieren (`danger`/`risk` Feldangleichung)
- [x] `TRIGGER_RAID` in UI bei deaktiviertem FeatureFlag ausblenden/disabled + Grund

2. Datenmodell/Inventar (P1)
- [x] Stackable-Items mit Instanz-ID einfuehren (nicht nur Katalog-ID)
- [x] Combat-Select/Consume auf Instanz-ID umstellen
- [x] Migration fuer alte Saves ohne Instanz-ID definieren

3. Testluecken schliessen (P1/P2)
- [x] Action-Coverage auf 100% Manifest-Actions erweitern
- [x] Zieltests fuer `patches.js` (unsafe path, root replace, prefix checks) ergaenzen
- [x] Zieltests fuer `schema.js` (unknown key strip, serialisierbarkeit, safety limits) ergaenzen
- [x] Zieltests fuer `rng.js` (stream determinism / divergence) ergaenzen
- [x] Renderer/UI-Kontrakt-Tests (read-only, keine versteckten writes) ergaenzen
- [x] `store-adapter-integration` Travel-Assertion in echte Verhaltenspruefung umbauen
- [x] Stability-Schwellenwert hostunabhaengig machen (relative/seed-basierte Kriterien)
- [x] Vollprojekt-Verifikation als Pflichttest integriert (`FULL_PROJECT_VERIFICATION_OK`)
- [x] Canvas-FX Determinismus abgesichert (`DETERMINISM_CANVAS_OK`, seed-basierter RNG, kein globales `Math.random`)
- [x] UI-Timing-Determinismus abgesichert (`DETERMINISM_UI_TIMING_OK`, frame-segmentierungsstabil inkl. Fraktionszeit-Faelle)
- [x] Persistenz-Replay abgesichert (Save/Load-Zwischenstand == kontinuierlicher Lauf)
- [x] Patch-Trace-Vergleich fuer deterministische Action-Tapes ergaenzt
- [x] Seed-Matrix auf Profile + Multi-Seed erweitert (`SEED_MATRIX_OK`)
- [x] Property/Fuzz-Determinismus mit seed-fixer Action-Sequenz ergaenzt
- [x] Red-Team-Path-Haertung gegen Prefix-/Proto-/Malformed-Paths erweitert
- [x] Cross-Module-Kontraktpruefung fuer Manifest/Reducer/Adapter/Renderer/UI ergaenzt

4. Doku- und Governance-Konsistenz (P2)
- [x] Changelog-Altverweise einmalig als Legacy-Mapping dokumentieren
- [x] Masterplan-Quelle final internisieren (kein externer `/root/Fusion` Restbezug)
- [x] Projektname kanonisieren (`Substrate`) und konsistent in Doku/UI verwenden
- [x] `.LLM_ENTRY` und Runtime-Pfade bei jeder Strukturänderung synchron halten

5. Codepflege/Dead Paths (P3)
- [ ] Tote/alte Datenpfade bereinigen (`DECISION_TEMPLATES`, `DECISION_CHAIN_TEMPLATES`, `ENCOUNTER_TABLE` falls ungenutzt)
- [ ] Alte Renderer-Helfer bereinigen, wenn nicht mehr im aktiven Flow referenziert
- [ ] Nach Bereinigung Drift-/Gate-Signatur baseline neu dokumentieren

## Harmonisierung + Produktstandards (Zielerfuellung)
1. Produktkohärenz (UX + Gameplay)
- [ ] Einheitliche Begriffe und Statuslabels in UI, Log und Doku (`District`, `Risiko`, Outcomes, Siegpfade)
- [ ] Onboarding, Midgame und Endgame als durchgaengige Spielerreise absichern (keine toten Panels/CTAs)
- [ ] Fehlermeldungen und Disabled-Gründe konsistent nach Prioritaetsregeln darstellen

2. Qualitätsstandards (Engineering)
- [ ] P1/P2-TODO-Altlasten in eine releasefaehige Definition of Ready/Done ueberfuehren
- [x] Action-Coverage auf produktionsrelevante 100% anheben (alle nutzbaren Actions mit Erwartungen)
- [x] Renderer/UI-Kontrakt-Tests mit read-only Garantie ausbauen (keine versteckten Writes)

3. Betriebs- und Sicherheitsstandards
- [x] Stability-Test hostunabhaengig machen (keine wall-clock-abhängigen Grenzwerte)
- [x] Seed-Repro-Matrix fuer mehrere Profile (`alpha`, `beta`, `rc`) dokumentieren und automatisieren
- [x] Release-Gate definieren: kein Release ohne gruenen Volltest + Doku-Sync + offene P1/P2-Risiken = 0

4. Dokumentationsharmonisierung
- [ ] Traceability-Matrix zyklisch auf Ist-Stand trimmen (erledigte Punkte als verifiziert markieren)
- [x] Legacy-Mapping einmalig finalisieren und danach nur noch in 3 aktiven Doku-Dateien pflegen
- [ ] Masterplan-Fortschritt als quartalsweise Meilensteine mit klaren Abnahmekriterien strukturieren

## LifexLab-Integrationspakete (Masterplan-Verwirklichung)
1. Paket A: Dynamische Weltfelder aus Lifex-Weltmodell
- [ ] Substrate-Drift um gekoppelte Felder erweitern (Licht/Naehrstoff/Toxin-Balance statt isolierter Zufallsdrift)
- [ ] Deterministische Feldentwicklung pro Tick an `rngStreams` binden

2. Paket B: Lineage-Memory und adaptive Begegnungen
- [ ] Leichtgewichtige `lineageMemory`-Metrik einfuehren (Kontrolle, Toxin-Resistenz, Stabilitaet)
- [ ] Encounter-Optionen aus Memory-Werten gewichten (nicht nur Runde/District)

3. Paket C: Dominanz/Symbiose/Metamorphose real schliessen
- [ ] Dominanzpfad an `lineageControlPct` + Kampfserie koppeln (testbar)
- [ ] Symbiosepfad an stabile Fenster (`alive/light/toxin`) koppeln (zeitfensterbasiert)
- [ ] Metamorphosepfad an `mutationLevel` + Risiko-Handling koppeln

4. Paket D: Lifex-inspirierte Reifegates
- [ ] Zusatztests fuer Weltkollaps-/Drift-Extrema ausbauen
- [ ] Seed-Repro-Matrix fuer mehrere Weltprofile dokumentieren

## Definition of Done (naechste Iteration)
- [ ] Alle neuen Actions in Manifest + MutationMatrix dokumentiert
- [ ] Kein Write ausserhalb Patch-Gate
- [x] `npm test` vollstaendig gruen
- [x] Changelog und TODO synchron aktualisiert

## Traceability-Matrix (offene Punkte -> Code/Gates/Tests)
1. Decision-Rewards vollstaendig anwenden (verifiziert)
- Hauptcode: `src/project/project.logic.js` (`mapCatalogOption`, `RESOLVE_ENCOUNTER`)
- Datenquelle: `src/project/decisions.module.js`
- Gates: `mutationMatrix.RESOLVE_ENCOUNTER`
- Tests: `scripts/tests/invariants.mjs` + `scripts/tests/decision-rewards.mjs` (`DECISION_REWARDS_OK`)

2. District-Risikoanzeige reparieren (verifiziert)
- Hauptcode: `src/project/renderer.js` + `src/project/districts.module.js`
- Gates: keine neuen Write-Pfade (read-only Rendering)
- Tests: `scripts/tests/district-risk.mjs` (`DISTRICT_RISK_OK`)

3. TRIGGER_RAID UI-Sperrlogik (verifiziert)
- Hauptcode: `src/project/renderer.js`, `src/project/ui.js`, `src/project/project.logic.js`
- Gates: keine neuen Pfade notwendig (UI-Darstellung), Logik bereits feature-flag-gebunden
- Tests: `scripts/tests/release-profile.mjs` + `scripts/tests/raid-ui-flag.mjs` (`RAID_UI_FLAG_OK`)

4. Supply-Drift-Regression (verifiziert)
- Hauptcode: `src/project/project.logic.js` (zentrale `syncedSuppliesPatches`-Nutzung in allen Supply-Write-Pfaden)
- Gates: bestehende Pfade unveraendert (nur Testhaertung)
- Tests: `scripts/tests/supply-drift.mjs` (`SUPPLY_DRIFT_OK`)

5. Encounter-Optionen 2-4 Mindestregel (verifiziert)
- Hauptcode: `src/project/project.logic.js` (`normalizeEncounterOptions`, `pickDecisionScenario`, `encounterById`)
- Gates: keine neuen Write-Pfade (reine Encounter-Option-Aufbereitung)
- Tests: `scripts/tests/encounter-options.mjs` (`ENCOUNTER_OPTIONS_MIN_OK`)

6. Stackable-Items mit Instanz-ID
- Hauptcode: `src/project/project.manifest.js`, `src/project/project.logic.js`, `src/project/renderer.js`, `src/project/ui.js`
- Gates: `actionSchema`/`mutationMatrix` ggf. erweitern
- Tests: Inventar-/Combat-Selektions- und Verbrauchstests

7. Victory/Defeat-Pfade (verifiziert)
- Hauptcode: `src/project/project.logic.js` (`evaluateEndState`, Substrate-Felder in Endstate-Aufrufen aus `CHOOSE_ACTION`/`simStep`)
- Gates: keine neuen Action-/Write-Pfade (bestehende Endstate-Pfade genutzt)
- Tests: `scripts/tests/victory-defeat-paths.mjs` (`VICTORY_DEFEAT_PATHS_OK`)

8. Action-Coverage 100%
- [x] Hauptcode: `scripts/tests/*`
- [x] Gates: n/a
- [x] Tests: neue/erweiterte Tests je ungetesteter Action

9. Kernel-Zieltests (`patches/schema/rng`)
- [x] Hauptcode: `scripts/tests/*`
- [x] Zielmodule: `src/kernel/patches.js`, `src/kernel/schema.js`, `src/kernel/rng.js`
- [x] Tests: neue dedizierte Dateien mit Contract-Checks

10. Stability-Flake reduzieren
- [x] Hauptcode: `scripts/tests/stability.mjs`
- [x] Gates: n/a
- [x] Tests: Laufzeitkriterium auf hostunabhaengige Metrik umstellen

11. Inventory-Instanzmodell (verifiziert)
- Hauptcode: `src/project/project.manifest.js`, `src/project/project.logic.js`, `src/project/ui.js`, `src/project/renderer.js`
- Gates: `SELECT_COMBAT_ITEM` + `CHOOSE_LOADOUT` + `BEGIN_COMBAT` um Instanz-Selektionspfade erweitert
- Tests: `scripts/tests/inventory-instance.mjs` (`INVENTORY_INSTANCE_OK`)

12. Action-Coverage 100% (verifiziert)
- Hauptcode: `scripts/tests/action-coverage.mjs`
- Gates: Vollstaendigkeitscheck gegen `actionSchema` + erwartungsbasierte Cases fuer jede Manifest-Action
- Tests: `scripts/tests/action-coverage.mjs` (`ACTION_COVERAGE_OK`)

13. Kernel-Zieltests (`patches`/`schema`/`rng`) (verifiziert)
- Hauptcode: `scripts/tests/kernel-patches-target.mjs`, `scripts/tests/kernel-schema-target.mjs`, `scripts/tests/kernel-rng-target.mjs`
- Gates: keine Core-Aenderung, reine Contract-Tests gegen bestehende Kernel-Regeln
- Tests: `KERNEL_PATCHES_TARGET_OK`, `KERNEL_SCHEMA_TARGET_OK`, `KERNEL_RNG_TARGET_OK`

14. Renderer/UI-Kontrakt (verifiziert)
- Hauptcode: `scripts/tests/renderer-ui-contract.mjs`
- Gates: read-only Kontrakt fuer `renderer.js`, keine versteckten Writes; `advanceUiSimDeterministic` nur legitime `SIM_STEP`-Dispatches
- Tests: `RENDERER_UI_CONTRACT_OK`

15. Store-Adapter Travel-Verhalten (verifiziert)
- Hauptcode: `scripts/tests/store-adapter-integration.mjs`
- Gates: keine neuen Pfade; Legacy-Adapter-Nachweis ueber echte Travel-Dynamik (`MOVE_TO_DISTRICT` + Legacy-`STEP_SIMULATION` + Ankunft)
- Tests: `STORE_ADAPTER_INTEGRATION_OK`

16. Stability hostunabhaengig (verifiziert)
- Hauptcode: `scripts/tests/stability.mjs`
- Gates: keine Core-Aenderung; wall-clock-Schwelle entfernt, ersetzt durch seed-/state-basierte Repro-Kriterien (Signature/Snapshot/Revision- und Event-Konsistenz)
- Tests: `STABILITY_OK`

17. Seed-Repro-Matrix Profile (`alpha`/`beta`/`rc`) (verifiziert)
- Hauptcode: `scripts/tests/seed-repro-matrix.mjs`
- Gates: keine Core-Aenderung; deterministische Repro-Pruefung je Profil mit gleicher Aktionsfolge und Seed-Divergenz
- Tests: `SEED_REPRO_MATRIX_OK`

18. Release-Gate (definiert)
- Hauptcode: `scripts/release/release-gate.mjs`, `package.json` (`gate:release`)
- Gate-Regel: blockiert Release ohne gruene Volltestkette (`npm test` + `FULL_PROJECT_VERIFICATION_OK`), Doku-Sync (`01_CHANGELOG`/`02_VERSIONING`) und offene P1/P2-Risiken = 0
- Tests: indirekt ueber `npm test` (Volltestmarker) + ausfuehrbar via `npm run gate:release`

19. Persistenz-Replay (verifiziert)
- Hauptcode: `scripts/tests/persistence-replay.mjs`
- Gates: keine Core-Aenderung; gleicher Seed + gleiche Aktionsfolge mit Save/Load-Zwischenstand == gleicher Endzustand/Signature
- Tests: `PERSISTENCE_REPLAY_OK`

20. Patch-Trace-Vergleich (verifiziert)
- Hauptcode: `scripts/tests/patch-trace.mjs`
- Gates: keine Core-Aenderung; gleicher Seed + identisches Action-Tape -> identischer Patch-Trace; Seed-Divergenz nur bei RNG- oder Vorzustands-Divergenz
- Tests: `PATCH_TRACE_OK`

21. Seed-Matrix erweitert (verifiziert)
- Hauptcode: `scripts/tests/seed-matrix.mjs`
- Gates: keine Core-Aenderung; Profile `alpha`/`beta`/`rc` x Multi-Seeds mit Signature/Snapshot/Revision/Event/Dispatch-Repro
- Tests: `SEED_MATRIX_OK`

22. Property/Fuzz-Determinismus (verifiziert)
- Hauptcode: `scripts/tests/fuzz-determinism.mjs`
- Gates: keine Core-Aenderung; seed-fixe Intent-Sequenz + identischer State-Seed -> identischer Endzustand/Signature
- Tests: `FUZZ_DETERMINISM_OK`

23. Red-Team-Path-Haertung (verifiziert)
- Hauptcode: `scripts/tests/redteam-path-hardening.mjs`
- Gates: prueft `__proto__/constructor/prototype`, Prefix-Escape, Root-Replace, malformed/traversal-artige Pfade und Non-Pollution
- Tests: `REDTEAM_PATH_HARDENING_OK`

24. Cross-Module-Kontrakt (verifiziert)
- Hauptcode: `scripts/tests/cross-module-contract.mjs`
- Gates: `actionSchema <-> mutationMatrix`, `actionSchema <-> reducer-case`, Adapter-Target-Existenz, Renderer/UI-Write-Kontrakt
- Tests: `CROSS_MODULE_CONTRACT_OK`

25. Vereinheitlichte Pruefschicht (verifiziert)
- Hauptcode: `package.json` Block-Skripte (`test:block:*`), `scripts/tests/system-proof.mjs`
- Gates: dedizierte Beweisbausteine bleiben einzeln ausfuehrbar; Volltest laeuft blockweise und prueft Struktur
- Tests: `SYSTEM_PROOF_OK`

## Aktueller verifizierter Stand (2026-03-11)
- P0-Haertung umgesetzt: `getDoc` readonly Snapshot, atomarer Save-Commit, `crypto.*` Determinismus-Block, fail-closed Profil-Read.
- P1-Gameplay umgesetzt: `maxHp`-Sync, `supplies`-Pfadkonsistenz, Container-Endstate-Reihenfolge, Decision-Rewards vollstaendig, District-Risk-Angleichung, `TRIGGER_RAID`-UI-Flag-Gate.
- Verifikation: `npm test` vollstaendig gruen (inkl. `DECISION_REWARDS_OK`, `DISTRICT_RISK_OK`, `RAID_UI_FLAG_OK`, `SUPPLY_DRIFT_OK`, `ENCOUNTER_OPTIONS_MIN_OK`, `VICTORY_DEFEAT_PATHS_OK`, `INVENTORY_INSTANCE_OK`, `ACTION_COVERAGE_OK`, `KERNEL_PATCHES_TARGET_OK`, `KERNEL_SCHEMA_TARGET_OK`, `KERNEL_RNG_TARGET_OK`, `RENDERER_UI_CONTRACT_OK`, `STABILITY_OK`, `SEED_REPRO_MATRIX_OK`, `SEED_MATRIX_OK`, `PERSISTENCE_REPLAY_OK`, `PATCH_TRACE_OK`, `FUZZ_DETERMINISM_OK`, `REDTEAM_PATH_HARDENING_OK`, `CROSS_MODULE_CONTRACT_OK`, `GATE_REDTEAM_OK`, `FULL_PROJECT_VERIFICATION_OK`, `SYSTEM_PROOF_OK`).
- Release-Gate-Status: `npm run gate:release` blockiert aktuell erwartungsgemaess mit `open P1/P2 risks = 0` (nach Abschluss der Verifikationsrunde).

## Masterplan-Zielbild (kompakt)
1. Lebende, deterministische Simulationswelt
2. Spieler-Eingriffe ueber Einfluss
3. Zustandsgetriebene Encounter mit echten Konsequenzen
4. Drei valide Siegpfade plus robuste Niederlagenregeln
5. Harte technische Integritaet ueber Manifest-, Patch- und Drift-Gates
