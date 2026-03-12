# SoD System Status

## Projektstatus
- Name: `SoD`
- Basis: `LLM_ENTRY`-konformer Kernel
- UI: Endzeitliches Startmenue + Rules + Dialog + Turn-based Game
- Stand: Core-Gate-Integration fuer Beta-Loop aktiv

## Aktueller Flow
1. `MAIN_MENU` mit Archetyp-Loadoutwahl
2. Erststart -> `RULES`
3. Nach Bestaetigung -> `LOADOUT_SELECTION`
4. Nach Loadoutwahl -> `DIALOG`
5. Nach Dialog -> `GAME`
5. Reisen ueber Straßen mit langsamer Marker-Bewegung
6. Transit-Events (Decision oder Combat)
7. Combat PREP (Itemwahl) -> Combat ACTIVE (auto)

## Turn-Based Kern
- Pro Runde trifft der Spieler eine Entscheidung:
  - `SCOUT`
  - `FORAGE`
  - `REST`
- Jede Entscheidung triggert seed-deterministisch ein Ereignis.
- Werte: `HP`, `Vorrat`, `Moral`, `Runde`, `LastEvent`.
- Ende, wenn `HP <= 0` oder `Vorrat <= 0` oder `Moral <= 0`.
- Decision-Encounters laufen jetzt als strukturierte Szenarien mit Auswahloptionen.
- Ressourcenregeln erweitert:
  - Supplies-Cap: `15`
  - Morale-Cap: `10`
  - Morale-Decay: periodisch statt pro Aktion
  - Bei Supply-Null tritt zusaetzlicher HP/Morale-Verlust ein.

## Stadtkarte / Transit
- Karte mit mehreren Distrikten und Straßenkanten
- Blockierte Wege sind nicht nutzbar
- Marker laeuft schrittweise entlang der offenen Straßen
- Transit kann durch Zufallsevents unterbrochen werden
- District-Container sind angebunden und ueber UI pluenderbar.

## Inventar / Kampf
- Listenbasiertes Inventar (Name + Effekt)
- Distrikt-Loot verteilt Items/Waffen/Ausruestung
- Erster Kampf ist hart gescriptet nach dem Waffenfund
- Vor jedem Kampf: Itemwahl in PREP
- In PREP: Stance-Wahl (`AGGRESSIVE`, `DEFENSIVE`, `BALANCED`)
- Kampf laeuft danach automatisch im `SIM_STEP`
- Dauerhafter Spieler-Lebensbalken im GAME-Screen
- In ACTIVE: manueller Retreat moeglich (regelgebunden)
- Combat-Log (letzte Treffer) wird im Dashboard angezeigt
- Kampf-Loot kann als pending erscheinen und wird per Collect-Action uebernommen
- Gegner-Typen aktiv: `SCAVENGER`, `RAIDER`, `HUNTER`, `MUTANT` (mit Basis-Verhaltensunterschieden)
- Container-Risiko kann Kampf direkt triggern.

## LLM_ENTRY Gate-Test (2026-03-11)
- Anker-Check auf Pflichtdateien: bestanden
- Determinismus-Repro (gleiche Inputs => gleiche Signatur): bestanden
- Nicht-Determinismus-Suche (`Math.random`, `Date.now`, etc.): keine Treffer

## Decision-System Stand (2026-03-11)
- Encounter-State: `decisionId` + `options[]` mit:
  - `mode` (`DECISION`/`COMBAT`)
  - Kosten/Gewinn/Risiko-Text
  - Kern-Delta (`hp`, `supplies`, `morale`)
- Auswahl wird ueber `RESOLVE_ENCOUNTER` + `optionId` verarbeitet.
- Erfolgreiche Entscheidungen werden in `decisions.history` protokolliert.
- `stats.decisionsMade` wird bei jeder aufgeloesten Entscheidung hochgezaehlt.
- Decision-Erfolg ist Morale-abhaengig (Skillcheck, deterministisch ueber RNG-Streams).
- Decision-Katalog umfasst jetzt 12 Szenarien (frueh/mittel/spaet gewichtet ueber Filter).

## Win/Lose Stand (2026-03-11)
- Defeat wird mit Ursache geloggt (`HP_ZERO`, `SUPPLIES_ZERO`, `MORALE_ZERO`).
- Victory-Pfade sind im Logic-Contract eingebaut:
  - `CENTRAL_HUB_ESCAPE` (District 4 + 3 Key-Items)
  - `SURVIVAL_MASTER` (30 Runden)
  - `WARLORD_PATH` (10 Siege + District 6)
- Endscreen zeigt jetzt Outcome-Reasons und Kernstats.
- Endscreen nutzt lesbare Textbeschreibungen statt nur Reason-Codes.

## Progress-Hinweis
- Aktueller Branch ist deutlich naeher an Beta-Loop-Stabilitaet.
- Noch offen fuer Voll-Beta: Feintuning der Balance (weniger harte Frueh-Abbrueche) und finale UX-Polish.

## Balance-Stand (2026-03-11)
- Early-Game wurde entschaerft:
  - weichere Enemy-HP/Scaling
  - encounter-chance dynamisch statt pauschal
  - Scripted-First-Fight nur bei ausreichender Spieler-HP
- Interner Smoke zeigt besseren Progress bis Midgame (District 2 erreichbar fuer alle Archetypen).
- Regression nach Hard-Block-Fix:
  - Kein inkonsistenter Endzustand mehr (`over=true` bei `winLose=ONGOING` wurde behoben).
  - Forcierter Erstkampf entfernt (softes Intro-Event statt Auto-Kampf).
  - Matrixlaeufe zeigen erste reproduzierbare Survival-Siege.

## Content-Stand
- Item-Pool: 22 Items (20+ Ziel erreicht).
- Key-Items fuer Primary-Win: `Funkfrequenz-Chip` (11), `Kraftstoff-Kanister` (12), `Signal-Verstaerker` (21).

## UX-Stand (2026-03-11)
- HUD zeigt nur Kernressourcen und Standort (keine permanente System-/Zielleistenflut).
- Ressourcen mit kritischen Werten werden visuell hervorgehoben.
- Mobile-Darstellung ist auf kurze, relevante Panels reduziert.
- Ingame-Textfuehrung ist auf mehr Spielatmosphaere umgestellt (weniger Technik-/Systemsprache).
- Encounter-Optionen sind als lesbare Multi-Line-Choice-Karten gestaltet.
- Touch-Bedienung auf Mobile verbessert (groessere Buttons, dichtere aber klare Panel-Struktur).
- Neues Kontextfenster im GAME-Screen:
  - Zeigt laufende Lageeinschaetzung (stabil/kritisch/Kontakt/Gefecht/Marsch)
  - Zeigt Ziel-Fokus (Schluesselteile/Aschekreuz) und situative Empfehlung
  - Arbeitet rein aus vorhandenem State, ohne neue bypass-artige Sonderpfade.
- Karten-Hover zeigt zusaetzlich District-Risiko und Feindtypenzahl fuer bessere Routenplanung.
- Relevanz-Rendering aktiv:
  - UI zeigt pro Moment nur den benoetigten Bereich (Combat/Encounter/Transit/Free Phase).
  - Systemnahe Anzeigeelemente wurden reduziert, Fokus liegt auf aktuellem Spielfluss.
- Statusfenster-Architektur:
  - Ein Hauptfenster pro Ingame-Status (`WORLD`, `TRANSIT`, `DIALOG`, `COMBAT`).
  - In `WORLD` sind Aktionskarten, Routenwahl und Containerzugriff in einem konsistenten Fenster gebuendelt.
- Canvas-Animation aktiv:
  - Karte nutzt subtile bewegte Schichten und pulsierenden Spielerpunkt fuer mehr Bewegung im Blick.

## Bugfix-Stand (2026-03-11)
- Combat-Soft-Lock behoben:
  - Nach `COLLECT_COMBAT_LOOT` wird `combat.phase` auf `NONE` gesetzt.
  - Dadurch bleibt der UI-Status nicht in `RESOLVED` stehen.

## Combat-Stand (2026-03-11)
- Emergency-Use ist als eigener Core-Gate-Pfad aktiv:
  - Action: `USE_EMERGENCY_ITEM`
  - Einsatz nur waehrend `combat.phase === ACTIVE`
  - Pro Kampf genau 1x nutzbar (`emergencyUsed`-Flag)
  - Folge: gegnerischer Extrahieb im naechsten Sim-Tick (`emergencyPenalty`)
- UI zeigt im ACTIVE-Kampf den Notfall-Button inkl. Sperrlogik nach Nutzung.

## Letzter Checklauf (2026-03-11)
- Syntax (`node --check` auf allen `src/*.js`): bestanden
- Determinismus-Repro (gleiche Action-Sequenz => gleiche Signature): bestanden
- Non-Determinismus-Scan (`Math.random`/`Date.now`/`performance.now`): keine Treffer

## Kernel-Hardening (2026-03-11)
- Persistenz:
  - Web-Driver schluckt Save/Load-Fehler nicht mehr.
  - Dispatch bricht bei Persistenzfehlern mit Error ab.
- Migration:
  - Invalides Migrationsergebnis fuehrt weiterhin zu Initial-Reset.
  - Reset wird jetzt via `console.warn` signalisiert.
- Write-Gate:
  - Top-level Container-Replacement wird standardmaessig blockiert.
- Determinismus:
  - Runtime-Guard blockiert nicht-deterministische Quellen im Reducer-/simStep-Lauf.
- Dokumentierte Semantik:
  - `updatedAt` ist Revisionszaehler.
  - `revisionCount` als expliziter Alias vorhanden.

## Kernel-Status (Neu)
- Status: `HARDENED_ACTIVE`
- Verifiziert:
  - `SYNTAX_OK` (gesamtes `src/`)
  - Determinismus-Repro (`same signature`) aktiv
  - Root-Overwrite-Block aktiv (`/entities` Test blockiert)
  - Storage-Fehler sichtbar (`QUOTA_EXCEEDED` propagiert)
  - Migration-Warnsignal aktiv (kein lautloser Reset mehr)

## Kernpfade
- `src/kernel/store.js`
- `src/kernel/patches.js`
- `src/kernel/schema.js`
- `src/project/project.manifest.js`
- `src/project/project.logic.js`
- `src/project/renderer.js`
- `src/project/ui.js`
- `src/project/city.map.js`
- `src/project/inventory.module.js`

## Wartungsregel
- Bei jeder Aenderung:
  - `docs/01_MASTER_LOG.md` um neuen Eintrag erweitern
  - `docs/03_SYSTEM_STATUS.md` aktualisieren, falls Flow/Status sich aendert

## Core-Check (2026-03-11)
- `CHOOSE_LOADOUT` ist in Manifest und Matrix vollstaendig verdrahtet.
- Alle Start-Archetypen laufen ueber denselben Patchkanal.
- Dispatch-Smoke-Test lief ohne `Patch path not allowed` Fehler.
- RNG-Pfade bleiben deterministisch ueber `rng.sim`, `rng.world`, `rng.cos`.

## UI/UX-Rework Status (2026-03-11)
- Status: `TACTICAL_HUD_ACTIVE` (Kickoff-Phase)
- Zielrichtung:
  - Weg von linearer Box-Kette hin zu zustandsgetriebener Komposition.
  - Primarentscheidungen vor Sekundaerdaten.

### Neuer UI-Datenfluss (Renderer)
- GAME-View nutzt jetzt explizite Modusableitung:
  - `EXPLORATION`, `TRANSIT`, `ENCOUNTER`, `COMBAT_PREP`, `COMBAT_ACTIVE`, `COMBAT_OUTCOME`, `OUTCOME`
- Kompositionsreihenfolge:
  1. Sticky HUD
  2. Missionsstatus
  3. Situation Panel
  4. Primary Zone (state-driven)
  5. Secondary Rail (collapsible)

### UI-Komponentenstand
- Aktiv:
  - Tactical HUD mit Metern fuer Leben/Vorrat/Moral.
  - Mission Progress Panel fuer Escape/Survival/Warlord.
  - Secondary Rail mit einklappbaren Modulen (Inventar/Lagebericht).
  - Zonenlayout (`game-main-grid`, `primary-zone`, `secondary-zone`).
- Beibehalten:
  - Kernel/Store/Patch-Gate unveraendert.
  - Determinismus- und Manifest-Contracts unveraendert.

### Interaktionsstatus
- Equip/Unequip ist in over-state jetzt ebenfalls sicher deaktiviert.
- SIM_STEP-Dispatch bleibt getaktet und an GAME/over-Guard gebunden.

### Verifizierte Checks
- `node --check`:
  - `src/project/renderer.js`
  - `src/project/ui.js`
  - `src/project/project.logic.js`
  - `src/project/project.manifest.js`
  - `src/main.js`

## Phase-1/2 Update (2026-03-11, v0.1.32)
- Manifest/Store:
  - `src/project/unified.manifest.js` als einheitlicher Manifest-Einstieg aktiv.
  - `createStore` validiert Manifest-Contracts (jede Action braucht Matrix-Eintrag).
- Determinismus:
  - Scoped RNG pro Ausfuehrungsphase (`reducer:*`, `simStep:*`) aktiv.
- Sim-Engine:
  - `simStep` als Wrapper auf dedizierte Engine-Funktion gekapselt.
- Legacy-Adapter:
  - `src/project/unified.adapters.js` mappt Legacy-Action-Namen auf kanonische Actions.
  - Adapter-Hook im Store aktiv (`actionAdapter`).
- Tests:
  - `scripts/tests/adapter-smoke.mjs`
  - `scripts/tests/store-adapter-integration.mjs`
  - npm-Skripte: `test:adapter`, `test:store-adapter`, `test`

## Phase-2 Feature-Update (2026-03-11, v0.1.33)
- Substrate-State aktiv:
  - `influence`, `influenceMax`, `zeroInfluenceTicks`
  - `alivePct`, `lightPct`, `toxinPct`, `lineageControlPct`, `mutationLevel`
- Neue kanonische Action:
  - `INTERVENE` mit 7 Typen (`LIGHT_PULSE`, `NUTRIENT_INJECTION`, `TOXIN_ABSORB`, `STRENGTHEN_LINEAGE`, `TRIGGER_RAID`, `BUILD_BRIDGE`, `QUARANTINE_ZONE`)
- Laufzeit:
  - `SIM_STEP` aktualisiert Substrate-Drift und Einfluss-Regeneration deterministisch.
- UI:
  - Einfluss-Meter in Top-HUD.
  - Interventions-Bedienung im Weltstatus-Panel.
- Tests:
  - `scripts/tests/interventions.mjs` hinzugefuegt.
- Action-Smoke weiterhin OK (`ACTION_SMOKE_OK`).

## TODO (UI/UX + Core) (2026-03-11)
- [ ] Combat-Renderer in 3 klare Teilmodule trennen (`PREP`, `ACTIVE`, `OUTCOME`).
- [ ] Encounter-Decision-Cards auf ein primäres CTA-Muster pro Zustand reduzieren.
- [ ] Route/Threat-Panel auf Mobile ohne Hover-Abhängigkeit finalisieren (Tap-Info).
- [ ] Inventory als Quick-Slots + Liste mit klaren Status-Tags (`equipped`, `selected`, `consumable`) schärfen.
- [ ] Secondary-Rail (Log/Inventar) mit standardmäßig kompakter Ansicht feinjustieren.
- [ ] Disabled-States überall mit klarer Begründungstextzeile ergänzen.
- [ ] Microcopy für Situation/Action-Cards auf kurze, konsistente Form bringen.

## Core-Gate Check (2026-03-11)
- Status: `PASS`
- Anker vorhanden:
  - `dispatch`, `applyPatches`, `assertPatchesAllowed`, `getState`, `sanitizeBySchema`, `createRngStreams`, `simStep`, `render/draw`.
- Manifest-Contracts vorhanden:
  - `SCHEMA_VERSION`, `stateSchema`, `actionSchema`, `mutationMatrix`.
- Dead-Action-Implementierungen vorhanden:
  - `EQUIP_LOADOUT`, `UNEQUIP_LOADOUT`, `APPLY_RESOURCE_DELTA`, `QUEUE_DECISION`,
    `RESOLVE_DECISION_OUTCOME`, `REGISTER_LOOT_CONTAINER`, `UPDATE_QUEST`,
    `SET_GAME_OUTCOME`, `TRACK_STAT`.
- Determinismus:
  - Non-Determinismus-Scan in Projektlogik ohne Treffer.
  - Kernel-Guard vorhanden (`Math.random`, `Date.now`, `performance.now` blockiert im Lauf).
  - Repro-Check erfolgreich (`CORE_REPRO_OK`).
- Syntax:
  - `node --check` auf Core/Project-Dateien erfolgreich.

## Core-Gate Check (2026-03-11, Nachhaertung)
- Status: `PASS`
- Gate-Hardening:
  - `src/kernel/patches.js`:
    - unsafe JSON-Pointer-Segmente (`__proto__`, `prototype`, `constructor`) werden geblockt.
    - root-container replacement per `set` auf Tiefe 1 wird geblockt.
    - erlaubte Prefixe werden normalisiert/validiert.
  - `src/kernel/store.js`:
    - Determinismus-Guard blockiert jetzt zusaetzlich `new Date()`/`Date()`.
    - `performance.now` wird auf eigener Instanz oder Prototyp robust abgefangen.
  - `src/kernel/schema.js`:
    - TypedArrays laufen durch den normalen Array-Sanitize-Pfad inkl. `maxLen`.
- Manifest/Gate-Abgleich:
  - `RESOLVE_DECISION_OUTCOME` schreibt wieder legal nach `/game/supplies` (Prefix in `mutationMatrix` nachgezogen).
- UI-Gate/Flow-Hardening:
  - `src/project/ui.js` ist jetzt idempotent (`unsubscribe` + `cancelAnimationFrame` bei Remount).
  - Pointer-Input fuer die Karte vereinheitlicht (kein Click+Touch-Doppelfeuer mehr).
  - Equip/Unequip-Dispatch wird lokal validiert (nur gueltige Slots/Item-IDs).
- Aktive Bypass-Tests:
  - `PASS`: unsafe path segment wird geblockt.
  - `PASS`: unlisted path wird geblockt.
  - `PASS`: root container replace wird geblockt.
  - `PASS`: erlaubter leaf-path bleibt erlaubt.
- Drift/Determinismus:
  - `PASS`: deterministischer Signature-Lauf mit identischer Action-Sequenz (`runFlow`) ist stabil.
  - `PASS`: gezielter `Date.now`-Bypassversuch wird vom Guard blockiert.

## Renderer-Status (2026-03-11, Combat Split)
- Combat-UI ist jetzt explizit in drei Builder getrennt:
  - `buildCombatPrepPanel`
  - `buildCombatActivePanel`
  - `buildCombatOutcomePanel`
- Timeline-Rendering ist als eigener Helper extrahiert (`appendCombatTimeline`) und wird nur in `ACTIVE`/`OUTCOME` angehaengt.
- `buildGame` routet COMBAT-States direkt auf die entsprechenden Panel-Builder (kein monolithischer Combat-Branch mehr).
- Verifikation:
  - `node --check`: `PASS`
  - Gate-Smoke (`unsafe segment`, `root replace`): `PASS`
  - Drift-Signatur (`runFlow` x2): `PASS` (`612d0a7a`)

## Renderer-Status (2026-03-11, Primary CTA)
- Exploration-Action-Deck priorisiert jetzt genau eine primaere Aktion:
  - empfohlene Aktion wird oben als `primary` mit Badge (`Empfohlen`) gerendert.
  - restliche Aktionen werden als `secondary` visuell zurueckgenommen.
- Encounter-Decision-Flow behaelt genau eine primaere Option:
  - bevorzugt `DECISION`-Option, ansonsten erste Option.
  - Fallback `Weiter` ist als primaere Aktion markiert.
- Styling:
  - `decision-card.primary` / `decision-card.secondary`
  - `encounter-option.primary` / `encounter-option.secondary`
  - `decision-badge` fuer Primär-/Empfohlen-Markierung
- Verifikation:
  - `node --check`: `PASS`
  - Gate-Smoke (`unsafe segment`): `PASS`
  - Drift-Signatur nach UI-Refactor: `PASS` (`8c49d92d` bei identischer Sequenz)

## Renderer-Status (2026-03-11, Route + Inventory Polish)
- Map/Route (mobile-first):
  - Route-Buttons als Route-Cards mit Zielname, Risiko und Status (`Offen`/`Blockiert`).
  - Blockierte Routen sind sichtbar, aber deaktiviert mit Begründung.
  - District-Auswahltext zeigt jetzt Risiko + offene + blockierte Verbindungen.
- Inventory:
  - Reihen in zwei Zonen: Info-Block + Action-Block.
  - Primäraktion je Item ist klar (`Als Kampfslot` bzw. `Im Kampfslot`).
  - Sekundäraktionen (`Detail`, `Ausrüsten`) bleiben verfügbar, aber visuell zurückgenommen.
- Route-Patch-Check:
  - `TRAVEL_TO` blockiert ungültige/gesperrte Routen weiterhin im Reducer.
  - Smoke-Test: offene Route startet Transit, gesperrte Route bleibt ohne Transitstart.
- Verifikation:
  - `node --check`: `PASS`
  - Gate-Smoke: `PASS`
  - Drift-Signatur: `PASS` (`8c49d92d`)

## Renderer-Status (2026-03-11, Canvas FX Foundation)
- Neues Modul: `src/project/canvas.fx.js`
  - zentrale FX-Steuerung fuer atmosphaerisches Canvas-Rendering
  - zustandsbasierte Szenenmodi (`EXPLORATION`, `TRANSIT`, `ENCOUNTER`, `COMBAT_PREP`, `COMBAT_ACTIVE`, `OUTCOME`)
  - Ambient-Partikel (Staub/Glut), Haze, Vignette, Marker-Trail/Bobbing
  - Route-Pulse in Transit, District-Focus-Ring, Combat-Impact-Puffs
  - adaptive Qualitaetsstufen + `prefers-reduced-motion`-Beruecksichtigung
- DOM/Canvas-Integration:
  - `renderer.js` Map-Modul auf Layer-Stack umgestellt:
    - Basiskarte: `[data-city-map=\"1\"]`
    - FX-Layer: `[data-city-fx=\"1\"]`
  - `ui.js` koppelt `requestAnimationFrame`-Tick an FX-Controller (`attach/step/detach`)
  - Cleanup bleibt leak-sicher (unsubscribe + RAF-cancel + FX detach)
- Visuelles Motion-Update:
  - state-sensitive Screen-Overlays via `data-game-mode`
  - weichere Panel-/Card-/Route-Transitions
  - route-hover lift, combat meter transition, reduced-motion fallback
- Verifikation:
  - `node --check`: `PASS` (inkl. `canvas.fx.js`)
  - Gate-Smoke: `PASS`
  - Drift-Signatur: `PASS` (`8c49d92d`)
