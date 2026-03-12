# SoD Master Log (Append-Only, Lueckenlos)

Wichtig:
- Diese Datei wird nur erweitert, nie gekuerzt.
- Historie bleibt vollstaendig erhalten.

## Eintraege

### 2026-03-10 - v0.1.0
- Basisaufbau nach LLM_ENTRY mit mobilem Startscreen.
- Kernstruktur: `src/kernel/*`, `src/project/*`, `index.html`, `styles.css`.

### 2026-03-10 - v0.1.1
- Erststart-Flow: `Start -> RULES -> DIALOG -> GAME`.
- Regeln und atmosphaerischer Dialog eingebaut.

### 2026-03-10 - v0.1.2
- Doku-Policy aktualisiert:
  - `docs/` darf genau 3 Dateien enthalten.
  - Alle wichtigen Informationen muessen lueckenlos in diesen 3 Dateien stehen.
  - Doku wird fortgefuehrt, nicht geloescht.

### 2026-03-10 - v0.1.3
- Turn-based RPG Kern eingebaut.
- Jede Runde: Spielerentscheidung (`SCOUT`, `FORAGE`, `REST`).
- Seed-deterministische Trigger ueber Kernel-RNG + Rundenzahl.
- Stadtplan-Canvas im GAME-Screen gerendert.

### 2026-03-10 - v0.1.4
- Nach jeder Ingame-Aktion wird ein Platzhalter-Menuemodus gesetzt:
  - `KAMPF`
  - `DIALOG`
  - `PLUENDERN`
- Modus wird seed-deterministisch ueber den Trigger-Roll bestimmt.
- Encounter-Panel erhaelt eine leichte Zuklapp-Animation (`fold-in`).

### 2026-03-10 - v0.1.5
- Stadtkarte deutlich erweitert (grauer, realistischer Straßenplan).
- Blockierte Wege sichtbar; offene Straßen sind begehbar.
- Spielerpunkt bewegt sich langsam entlang der Straße zum Zielgebaeude.
- Waehrend Transit koennen seed-deterministische Zufallsevents triggern.
- Transit-Events blockieren Fortschritt bis `DECISION` oder `COMBAT` geloest ist.

### 2026-03-10 - v0.1.6
- Neues Modul: `inventory.module.js` (listenbasiertes Inventar ohne Icons).
- Standard-Items/Waffen/Ausruestung eingefuehrt und auf Distrikte verteilt.
- Erster Kampf ist hart gescriptet nach erstem Waffenfund (Rostklinge).
- Kampfmodul: PREP-Phase (Itemwahl) + ACTIVE-Phase (auto Ablauf).
- Dauerhafte Lebensbalken fuer Spieler (immer) und Gegner (im Kampf).
- Item-Detailfenster mit Canvas-Darstellung + atmosphaerischer Flavor-Text.

### 2026-03-11 - v0.1.7
- Core-Gate-Integrationspatch abgeschlossen (kein Bypass):
  - `CHOOSE_LOADOUT` ist jetzt ein eigener Startfluss ueber `actionSchema` + `mutationMatrix`.
  - UI-Loadoutkarten dispatchen nicht mehr `SELECT_COMBAT_ITEM`, sondern `CHOOSE_LOADOUT`.
  - Renderer-Loadoutkarten wurden auf Archetypen umgestellt (`SCAVENGER`, `FIGHTER`, `SURVIVOR`).
  - Reducer schreibt Archetyp, Trait und Startwerte patch-basiert in den State.
- Conformance-Smoke:
  - Syntax-Check (`node --check`) auf `src/*` erfolgreich.
  - Store-Dispatch-Simulation fuer Start->Rules->Dialog->Travel->Encounter/Combat erfolgreich ohne Mutation-Matrix-Fehler.
  - Keine nicht-deterministischen Quellen im `src` gefunden (`Math.random` / `Date.now` etc.).

### 2026-03-11 - v0.1.8
- Block 1 (Starting Loadout) erweitert:
  - Neuer UI-Screen `LOADOUT_SELECTION` zwischen `RULES` und `DIALOG`.
  - `CHOOSE_LOADOUT` ist jetzt Gate-gebunden nur in `LOADOUT_SELECTION` zulaessig.
  - Loadout-Choice startet direkt den Intro-Dialog (`DIALOG`) und setzt Archetyp + Trait + Startwerte.
- Block 2 (Combat-Teilpaket: Stances):
  - Neue Action `CHANGE_STANCE` mit Matrix-Pfadfreigabe.
  - Combat-State hat jetzt `stance` (`AGGRESSIVE`, `DEFENSIVE`, `BALANCED`).
  - PREP-UI zeigt Stance-Buttons; ACTIVE-Sim nutzt Stance-Modifikatoren auf Schaden/Gegenschaden.
- Checks:
  - Syntax-Check erfolgreich.
  - Smoke-Test: Startflow bis Kampf-PREP, Stance-Wechsel, Kampfstart erfolgreich.

### 2026-03-11 - v0.1.9
- LLM_ENTRY Gate-Test explizit ausgefuehrt:
  - Pflicht-Anker in Kernel/Manifest/Logic/Renderer vorhanden (`dispatch`, `applyPatches`, `assertPatchesAllowed`, `sanitizeBySchema`, `createRngStreams`, `simStep`, `render/draw`).
  - Determinismus-Repro geprueft: identische Action-Sequenz liefert identische Signature.
  - Verbotene Nicht-Deterministik geprueft: keine Treffer fuer `Math.random`, `Date.now`, `new Date`, `performance.now`.
- Block 2b (Combat-Erweiterung) umgesetzt:
  - Neue Actions: `RETREAT_FROM_COMBAT`, `COLLECT_COMBAT_LOOT`.
  - Combat bekommt `logLines` (letzte Treffer) und `pendingLootItemIds`.
  - Retreat ist jetzt regelbasiert als aktive Spieleraktion (nicht mehr auto).
  - Sieg setzt Loot zuerst auf pending; Aufnahme erfolgt per explizitem Collect-Action.
  - UI: Retreat-Button (zustandsabhaengig), Combat-Log-Anzeige, Loot-Collect-Button im RESOLVED-Zustand.
- Block 3 Start:
  - Encounter-Decision-Panel bietet jetzt Auswahl zwischen `Verhandeln` und `Eskalieren` statt Ein-Klick-Resolve.

### 2026-03-11 - v0.1.10
- Block 3 (Decision-System) erweitert von Placeholder zu Szenario-Optionen:
  - Encounter-State traegt jetzt `decisionId` und strukturierte `options`.
  - Optionen enthalten klar: `mode`, `costText`, `gainText`, `riskText` und Kern-Deltas (`hp/supplies/morale`).
  - SimStep zieht Decision-Szenarien jetzt aus `decisions.module.js` (`DECISION_CATALOG`).
  - UI rendert alle verfuegbaren Optionen als klickbare Kartenzeilen (nicht mehr nur 2 statische Buttons).
- Decision-Resolution erweitert:
  - `RESOLVE_ENCOUNTER` verarbeitet nun `optionId`.
  - Optionseffekte werden patch-basiert auf HP/Supplies/Morale angewendet.
  - Combat-Optionen eskalieren deterministisch in Kampf.
  - Decision-Telemetrie aktiv: `decisions.lastOutcome`, `decisions.history`, `stats.decisionsMade`.
- Content-Feinschliff:
  - Decision-Katalog auf spuerbare Kernressourcen-Effekte angepasst (HP/Supplies/Morale Trade-offs).
- Checks:
  - Syntax (`node --check`) erfolgreich.
  - Decision-Smoke erfolgreich (Optionen vorhanden, Effekte sichtbar, deterministisch reproduzierbar).

### 2026-03-11 - v0.1.11
- Win/Lose-Block (Beta-Zielpfade) integriert:
  - `winLose` wird jetzt aktiv durch Gameplay gesetzt (`state`, `reason`, `reachedAtRound`).
  - Lose-Reasons: `HP_ZERO`, `SUPPLIES_ZERO`, `MORALE_ZERO`.
  - Win-Reasons: `CENTRAL_HUB_ESCAPE`, `SURVIVAL_MASTER` (R30), `WARLORD_PATH`.
  - Endscreen nutzt jetzt echte Outcome-Daten + Stat-Zusammenfassung.
- Quest-Key-Item-Fluss vorbereitet:
  - Neue Key-Items: `Funkfrequenz-Chip` (id 11), `Kraftstoff-Kanister` (id 12).
  - District-Loot angepasst, damit die Key-Route sammelbar ist.
- Combat-/Stats-Integration erweitert:
  - `combatsStarted` wird bei Kampfstart inkrementiert.
  - `combatsWon`/`combatsLost` werden bei Kampfausgang gesetzt.
- Enemy-Type-Block gestartet (min. 4 Typen):
  - Typen im Spawn: `SCAVENGER`, `RAIDER`, `HUNTER`, `MUTANT`.
  - Verhalten aktiv:
    - `SCAVENGER` kann bei Low-HP fliehen.
    - `RAIDER` hat mehr Druckschaden.
    - `HUNTER` hat Crit-Chance.
    - `MUTANT` regeneriert periodisch.
  - Combat-UI zeigt jetzt Gegner-Typ.
- Checks:
  - Syntax erfolgreich.
  - Hard-Smoke mit Decision+Combat+Outcome erfolgreich.
  - Determinismus-Repro weiterhin erfolgreich.

### 2026-03-11 - v0.1.11a
- Zwischenstands-Sync auf interne Testziele ausgefuehrt:
  - `/storage/emulated/0/Download/SoD`
  - `/storage/emulated/0/Projects/SoD`
- Vor Sync: LLM-Konformitaet + Syntax + Gate-Smoke geprueft.
- Fuer Sync-Kopien wurden temporaere Test-Placeholders gesetzt (nur dort, nicht im Dev-Root):
  - geringere Encounter-Rate
  - sanfterer erster Script-Kampf
- Ziel: Zwischenstand testbar halten, waehrend Dev-Branch in `/root/SoD` voll weiterentwickelt wird.

### 2026-03-11 - v0.1.12
- Ressourcen-/Morale-Block erweitert (Loop-Stabilitaet):
  - Supplies-Cap (`15`) und Morale-Cap (`10`) in der Kernlogik aktiv.
  - Zeitdruck-Decay fuer Morale umgestellt:
    - Standard: `-1` alle 5 Runden
    - `SURVIVOR`-Trait: verlangsamt auf 10-Runden-Takt
  - Versorgungskrise-Mechanik aktiv:
    - Bei `supplies <= 0`: zusaetzlich `-1 HP` und `-1 Morale`.
- Decision-Skillchecks an Morale gekoppelt:
  - High Morale verbessert Erfolgswahrscheinlichkeit.
  - Low Morale verschlechtert sie.
  - Outcome wird als `SUCCESS`/`FAIL` in Decision-History protokolliert.
- Combat-Morale-Effekt aktiviert:
  - Hohe Moral gibt Offensivbonus, niedrige Moral Schadensmalus.
- Outcome-Validierung:
  - Nach den Anpassungen bleibt der Loop deterministisch und gate-konform.
  - Syntax- und Repro-Checks erfolgreich.

### 2026-03-11 - v0.1.13
- District/Loot-Block gestartet und angebunden:
  - `OPEN_LOOT_CONTAINER` jetzt aktiv im Reducer (vorher nur Schema/Matrix vorhanden).
  - Container werden districtbasiert verarbeitet (`DISTRICT_LOOT_CONTAINERS`).
  - Safe/Standard/Danger-Verhalten ueber Container-Typen:
    - `LOCKER` (niedriges Risiko)
    - `CACHE` (mittleres Risiko)
    - `VAULT` (hohes Risiko, als Hidden-Container behandelt)
  - Supply-Kosten beim Oeffnen aktiv; Loot/Resource-Drops werden patch-basiert eingetragen.
  - Risiko kann jetzt direkt Kampf triggern (deterministisch).
- Scout-Reveal integriert:
  - `SCOUT` kann Hidden-Container (`vault_black`) fuer den aktuellen District aufdecken.
- UI-Integration:
  - Neues `Scavenge Containers`-Panel im Game-Screen.
  - Container-Buttons dispatchen `OPEN_LOOT_CONTAINER`.
  - Bereits geoeffnete Container werden disabled angezeigt.
- Gate/Tests:
  - Manifest-Matrix fuer neue Pfade erweitert.
  - Syntax + deterministische Repro-Checks erfolgreich.
  - Scavenge-Smoke erfolgreich (Container-Open, Loot, Endstate-Handling).

### 2026-03-11 - v0.1.14
- Content-Block weiter ausgebaut:
  - Decision-Katalog auf `12` Szenarien erweitert (von 3).
  - Decision-Picking nutzt jetzt Filter nach Runde/District statt reinem Platzhalter-Pick.
- Item-Pool erweitert:
  - `ITEM_CATALOG` auf `22` Items ausgebaut (20+ Ziel erreicht).
  - Neue Waffen, Gear, Consumables und Quest-Item `Signal-Verstaerker` (id 21) hinzugefuegt.
  - Loot-Tabellen (`cache_field`, `vault_black`) auf neue Items erweitert.
- Key-Item-Route angepasst:
  - Keyset fuer Primary-Win jetzt `11, 12, 21`.
  - District-6-Loot auf `Signal-Verstaerker` umgestellt.
- Checks:
  - Syntax erfolgreich.
  - Determinismus bleibt intakt.

### 2026-03-11 - v0.1.15
- Balance-Feinschliff (Early/Midgame) umgesetzt:
  - Enemy-Scaling leicht entschärft (niedrigeres Level-Wachstum und Base-HP).
  - Encounter-Chance jetzt dynamisch statt statisch:
    - frueh niedriger, steigt mit District-Risiko und Rundenfortschritt.
  - Scripted Erstkampf wird nur getriggert, wenn HP-Schwelle passt (kein unfairer Hard-Block bei sehr low HP).
  - Scripted Erstgegner-HP reduziert.
- Smoke-Ergebnis nach Balance:
  - Alle 3 Archetypen erreichen im Testlauf stabil District 2 ohne sofortigen Hard-Defeat.

### 2026-03-11 - v0.1.16
- UX-/Endgame-Polish weitergefuehrt:
  - Top-HUD zeigt jetzt Zielfortschritt fuer alle 3 Siegpfade:
    - Keys/3 (Primary)
    - Runden/30 (Secondary)
    - Kills/10 + District 6 (Tertiary)
  - Kritische Ressourcen (`HP`, `SUPPLIES`, `MORALE`) markieren sich visuell im Danger-Zustand.
  - Endscreen-Reasontexte wurden von Rohcodes auf lesbare Defeat-/Victory-Beschreibungen umgestellt.
- Mobile-Readability verbessert:
  - Goal-Bar ist responsive und klappt auf kleinen Screens in eine 1-Spalten-Ansicht.
- Checks:
  - Syntax erfolgreich.
  - End-to-End Smoke erfolgreich (kein harter Block durch UI-Polish).

### 2026-03-11 - v0.1.17
- Regression/Hard-Block-Fix:
  - Decision-Pfade koennen jetzt keine `HP=0`-Zustaende mehr als `ONGOING` hinterlassen.
  - `RESOLVE_ENCOUNTER` setzt bei Endzustand sauber `winLose.*` + `over`.
  - Mutation-Matrix fuer diese neuen Writes in `RESOLVE_ENCOUNTER` erweitert.
- Fruehspiel-Hardblock entfernt:
  - Der vormals erzwungene Erstkampf nach Waffenfund wurde zu einem soften Intro-Event entschraerft.
- Balance-Feinschliff:
  - Doppelte Aktions-Supply-Kosten entfernt (`suppliesCost` reduziert), wodurch Runs weniger frueh an Vorrat kollabieren.
- Regression-Matrix (5 Seeds x 3 Archetypen):
  - Konsistenzfehler (`over=true` + `winLose=ONGOING`) auf `0` reduziert.
  - Erste stabile Siege ueber `SURVIVAL_MASTER` in der Matrix nachweisbar.

### 2026-03-11 - v0.1.18
- UI/UX Rework (LLM-konform, ohne Core-Bypass):
  - Ingame-Sprache atmosphaerischer gemacht (weniger Systemlabels, mehr Feld-/Survival-Ton).
  - Rundenaktionen als spielerische Action-Cards mit Flavor-Texten dargestellt.
  - Encounter-Optionen als klar lesbare, mehrzeilige Entscheidungskarten aufgebaut.
  - Story-/Event-Zeile visuell hervorgehoben, damit der Spielfluss lesbarer bleibt.
- Mobile-Optimierung:
  - Touch-Targets vergroessert (Buttons >= 50px/52px auf kleineren Screens).
  - Panel- und Typografie-Abstaende auf Mobilgeraete angepasst.
  - Goal-/Statusbereiche bleiben auf kleinen Viewports klar lesbar.
- Kleine Stabilitaetskorrektur im Renderer:
  - Endzustand deaktiviert jetzt auch alle neuen Interaktionsbuttons (Encounter/Container/Retreat/Loot).
- Checks:
  - Syntax erfolgreich.
  - Render-/State-Smoke erfolgreich.

### 2026-03-11 - v0.1.19
- Kontextfenster-System erweitert (spielnah statt Systemlast):
  - Neues Ingame-Panel `Kontextfenster` zeigt laufend:
    - Lage-Ton (`stabil`, `kritisch`, `Kontakt`, `Gefecht`, `Marsch`)
    - Fokusziel je nach Progress (Schluesselteile/Aschekreuz)
    - dynamische Empfehlung auf Basis von HP/Supplies/Morale/Combat/Transit
  - Panel ist read-only, ableitbar aus vorhandenem State (kein Core-Bypass, keine Zusatzpersistenz).
- Kartenkontext erweitert:
  - Hover-Hinweis zeigt jetzt auch `Risiko` und Anzahl `Feindtypen` pro District (aus District-Profilen).
- Mobile/UI-Feinschliff:
  - Kontext-Chips und Lauftexte auf kleinen Screens lesbarer skaliert.
- Checks:
  - Syntax-Check (`node --check` auf `src/*.js`) erfolgreich.
  - Determinismus-Signaturtest (identische Action-Sequenz) erfolgreich.
  - Non-Determinismus-Scan (`Math.random`, `Date.now`, `performance.now`) ohne Treffer.

### 2026-03-11 - v0.1.20
- UI auf Relevanzfluss umgestellt (weniger Systemoberflaeche):
  - Keine dauerhafte Anzeige von technischen Status-/Zielleisten.
  - Sichtbar ist jetzt nur das aktuell relevante Hauptpanel:
    - Kampfphase -> Kampfdashboard + Inventar
    - Begegnung -> Entscheidungsoptionen
    - Transit -> Transitpanel
    - Freie Phase -> Aktionen + Reise + Pluendern
- Kontextfenster vereinfacht:
  - Keine System-Moduscodes mehr, nur Lage/Fokus in Spielsprache.
- Check:
  - Syntax von `renderer.js` erfolgreich.

### 2026-03-11 - v0.1.21
- Bugfix Combat-Exit:
  - `COLLECT_COMBAT_LOOT` setzt nach dem Einsammeln die Combat-Phase auf `NONE`.
  - Damit bleibt der UI-Status nicht mehr in `RESOLVED` haengen (Soft-Lock behoben).
  - Mutation-Matrix fuer `COLLECT_COMBAT_LOOT` um `/game/combat/phase` erweitert.
- UI-Statusfenster neu geordnet:
  - Pro Ingame-Status genau ein zentrales Fenster:
    - `WORLD`
    - `TRANSIT`
    - `DIALOG` (Encounter)
    - `COMBAT`
  - Weltstatus fasst Aktionen, Routenwahl und Container in einem Panel zusammen.
- Canvas-/Wechselanimation:
  - Stadtkarte erhaelt eine leichte animierte Nebel-/Scan-Schicht.
  - Spielerpunkt pulsiert sichtbar.
  - Statusfenster-Wechsel nutzt eine klare Entry-Animation.
- Checks:
  - Syntaxcheck auf allen `src/*.js` bestanden.
  - Flow-Smoke bestanden (`FLOW_OK`, Combat-Phase endet bei `NONE`).

### 2026-03-11 - v0.1.22
- Combat-System erweitert (Spec-Block: Emergency Use):
  - Neue Action `USE_EMERGENCY_ITEM` im Manifest (Schema + Mutation Matrix).
  - Combat-State erweitert um:
    - `emergencyUsed`
    - `emergencyPenalty`
  - `BEGIN_COMBAT` setzt Emergency-Flags sauber zurueck.
  - `USE_EMERGENCY_ITEM` verbraucht im ACTIVE-Kampf ein Consumable und setzt Extrahieb-Penalty.
  - `SIM_STEP` verarbeitet die Penalty deterministisch als Doppelgegenschlag fuer den Tick.
- UI/Interaction:
  - Neuer Button im ACTIVE-Kampf: `Notfall-Item nutzen`.
  - Nach Nutzung wird der Button im laufenden Kampf gesperrt.
  - UI-Wiring in `ui.js` auf neue Action verdrahtet.
- Checks:
  - Syntaxcheck (`src/*.js`) bestanden.
  - Gate-Pruefung: Action in UI + ActionSchema + MutationMatrix vorhanden.

### 2026-03-11 - v0.1.23
- Core-Hardening (Audit-Luecken geschlossen):
  - `createWebDriver.save/load` schlucken Fehler nicht mehr; Persistenzfehler werden geworfen.
  - Migration-Fallback signalisiert jetzt Warnungen (statt lautloser Ruecksetzung).
  - Write-Gate blockiert top-level Container-Replacement (`set /rootObject {}`) ohne explizites Opt-in.
  - Determinismus-Guard im Kernel:
    - Blockiert `Math.random`, `Date.now`, `performance.now` waehrend Reducer/simStep.
- Semantik-Klarstellung:
  - Doc fuehrt jetzt `revisionCount` explizit als Revisionszaehler.
  - `updatedAt` wird weiterhin aus Kompatibilitaetsgruenden gespiegelt.
- Checks:
  - Syntaxcheck bestanden.
  - Prefix-Collision-Test blockiert wie erwartet.
  - Storage-Fehler-Test wirft wie erwartet.
  - Determinismus-Guard-Test blockiert nicht-deterministische Calls.

### 2026-03-11 - v0.1.24
- Kernel-Patch in SoD verifiziert und statusfest geschrieben:
  - Syntax-Check fuer gesamtes `src/` erfolgreich.
  - Determinismus-Repro weiterhin stabil (gleiche Inputs => gleiche Signatur).
  - Root-Container-Overwrite im Write-Gate blockiert.
  - Persistenzfehler werden sichtbar (Error statt Silent-Fail).
  - Migration-Reset liefert Warnsignal.
- Kernel-Status aktualisiert:
  - Hardening-Features aktiv und testbar.

### 2026-03-11 - v0.1.25
- UI/UX-Rework Kickoff (Tactical HUD + State-Komposition):
  - Renderer fuehrt jetzt einen expliziten View-Mode pro Spielzustand:
    - `EXPLORATION`, `TRANSIT`, `ENCOUNTER`, `COMBAT_PREP`, `COMBAT_ACTIVE`, `COMBAT_OUTCOME`, `OUTCOME`
  - GAME-Screen ist in klare Zonen aufgeteilt:
    - Sticky HUD
    - Missionsstatus
    - Situation Panel
    - Primary Zone (zustandsabhaengig)
    - Secondary Rail (einklappbar)
- HUD/Progress modernisiert:
  - Neue HUD-Stat-Module mit kompakten Metern fuer Leben/Vorrat/Moral.
  - Neues Missionspanel mit Fortschritt fuer Escape/Survival/Warlord.
- Secondary UX:
  - Inventar + Lagebericht als `details/summary`-Module (collapsible) umgesetzt.
- Map/Action-Flow:
  - Karte bleibt in Exploration/Transit primar sichtbar.
  - Encounter/Combat werden als fokusierte Primarmodule priorisiert.
- Combat/Over-State-Guard:
  - Disable-Guard deckt nun auch Equip/Unequip-Interaktionen ab.
- Designsystem-Basis in `styles.css` erneuert:
  - Semantische Tokens (`bg/surface/text/ember/steel/danger/success`)
  - neue Grid-Zonen (`game-main-grid`, `primary-zone`, `secondary-zone`)
  - neue HUD-, Mission- und Collapsible-Komponenten
- Checks:
  - `node --check` bestanden (`renderer.js`, `ui.js`, `project.logic.js`, `project.manifest.js`, `main.js`)
  - Action-Smoke zuvor bereits gruen (`ACTION_SMOKE_OK`)

### 2026-03-11 - v0.1.26
- Doku-Update ausgefuehrt:
  - In `docs/03_SYSTEM_STATUS.md` wurden ein expliziter TODO-Block und ein Core-Gate-Check-Block ergaenzt.
- Core-Gate-Check erneut verifiziert:
  - LLM_ENTRY-Anker in Kernel/Manifest/Logic/Renderer/UI vorhanden.
  - Manifest-Contracts (`SCHEMA_VERSION`, `stateSchema`, `actionSchema`, `mutationMatrix`) vorhanden.
  - Alle zuvor toten Actions sind als Reducer-Cases implementiert.
  - Non-Determinismus-Scan in `src/` ohne Treffer in Projektlogik.
  - Repro-Signaturtest erfolgreich (`CORE_REPRO_OK`).
  - Syntaxcheck auf Kern-/Projektdateien erfolgreich.

### 2026-03-11 - v0.1.27
- Core-Sicherheits- und Gate-Nachhaertung abgeschlossen:
  - `src/kernel/patches.js`:
    - Prefix-Normalisierung/Validierung verstaerkt.
    - unsafe Pointer-Segmente (`__proto__`, `prototype`, `constructor`) werden aktiv blockiert.
    - root-container replacement via `set` auf Tiefe 1 wird geblockt.
  - `src/kernel/store.js`:
    - Determinismus-Guard blockiert jetzt neben `Math.random`/`Date.now` auch `Date()`/`new Date()`.
    - `performance.now`-Blockade robust fuer own/prototype descriptor.
  - `src/kernel/schema.js`:
    - TypedArrays durchlaufen den normalen, begrenzten Array-Sanitize-Pfad.
- Logic/Manifest/Gate-Abgleich:
  - `RESOLVE_DECISION_OUTCOME` synchronisiert `resources.supplies` und `game.supplies`.
  - `mutationMatrix.RESOLVE_DECISION_OUTCOME` um `/game/supplies` erweitert (kein Gate-Fehler mehr).
- UI-Hardening:
  - `wireUi` ist idempotent (unsubscribe + RAF-cleanup bei Re-Wiring).
  - Karten-Input auf Pointer-Events vereinheitlicht (kein Click+Touch-Doppelfeuer).
  - Equip/Unequip-Dispatch lokal validiert (nur gueltige Slots und Item-IDs).
  - Selected-District bleibt ueber Re-Mounts erhalten.
  - District-Hitbox auf mobile robuster (elliptischer, skalierter Trefferbereich).
- Verifikation:
  - `node --check` auf Kern-/Projektdateien: `PASS`.
  - Aktive Gate-Bypass-Tests: `PASS` (unsafe segment, unlisted path, root replace blockiert).
  - Determinismus-Test (`Date.now` in Reducer): `PASS` (Guard blockiert).
  - Drift-Check (identische Sequenz, doppelt ausgefuehrt): gleiche Signatur (`PASS`).
- Doku:
  - `docs/03_SYSTEM_STATUS.md` um Nachhaertungs-Block erweitert.
  - `docs/04_TODO.md` neu angelegt (abgeschlossen/offen sauber getrennt).

### 2026-03-11 - v0.1.28
- Combat-Renderer strukturell getrennt:
  - monolithisches Combat-Branching in dedizierte Builder zerlegt:
    - `buildCombatPrepPanel`
    - `buildCombatActivePanel`
    - `buildCombatOutcomePanel`
  - Timeline-Logik in `appendCombatTimeline` extrahiert.
  - `buildGame` mappt COMBAT-States direkt auf die passenden Builder.
- Ergebnis:
  - klarere State-Komposition und geringere Kopplung im Combat-Rendering.
- Re-Checks nach Umbau:
  - `node --check`: `PASS`
  - Gate-Smoke (`__proto__`, root replace): `PASS`
  - Drift-Signaturtest: `PASS` (`612d0a7a`)

### 2026-03-11 - v0.1.29
- Action/Encounter-UX auf primaeres CTA-Muster umgestellt:
  - Exploration (`worldStatusPanel`):
    - genau eine empfohlene Primaeraktion (Badge `Empfohlen`) wird hervorgehoben.
    - verbleibende Aktionen sind visuell sekundar.
  - Encounter:
    - genau eine primaere Option wird gesetzt (bevorzugt `DECISION`, sonst erste).
    - Fallback `Weiter` ist primaer statt ghost.
- Renderer/CSS-Erweiterung:
  - `decision-card.primary|secondary`, `encounter-option.primary|secondary`, `decision-badge`.
- Re-Checks:
  - `node --check`: `PASS`
  - Gate-Smoke: `PASS`
  - Drift-Signaturtest nach Refactor: `PASS` (`8c49d92d`)

### 2026-03-11 - v0.1.30
- Mobile-Route-Polish abgeschlossen:
  - Route-Cards zeigen Ziel, Risiko und Status (offen/blockiert).
  - Blockierte Verbindungen bleiben sichtbar und sauber disabled mit Grund.
  - District-Selection-Text erweitert (Risiko + offene/blockierte Kanten).
- Inventory-Polish abgeschlossen:
  - Item-Row in `inv-main` + `inv-actions` aufgeteilt.
  - Primäraktion pro Item klar priorisiert (`Als Kampfslot`).
  - Sekundäraktionen (`Detail`, `Ausrüsten`) bleiben verfügbar.
- LLM_ENTRY-Check erneut vollständig bestanden:
  - Pflichtanker in Kernel/Manifest/Logic/Renderer/UI vorhanden.
  - Gate-Bypass-Smoke bestanden.
  - Drift-Signatur stabil.
- Termux/Internal-Storage Sync:
  - Projekt nach `/storage/emulated/0/Download/SoD` synchronisiert.
  - Nachweisdatei erstellt: `SYNC_STATUS.txt` (Zeitstempel, Dateianzahl, Core-Hash).

### 2026-03-11 - v0.1.31
- Visuelles Rework-Fundament mit Canvas-FX integriert:
  - Neues Modul `src/project/canvas.fx.js` eingefuehrt.
  - FX-Pipeline:
    - Ambient Dust/Ember
    - Haze + Vignette
    - Marker-Bobbing + Trail
    - Transit Route Pulse
    - Combat Impact-Puffs + dosierter Shake
  - State-spezifische Atmosphaere ueber mode-basierte Tinting-Profile.
- Renderer/UI-Integration:
  - `mapPanel` auf Doppel-Canvas (`map` + `fx`) umgestellt.
  - `game-shell` traegt `data-game-mode` fuer state-driven Visuals.
  - `ui.js` fuehrt FX im bestehenden RAF-Tick mit `attach/step/detach`.
- CSS/Motion-Modernisierung:
  - state-sensitive Overlays, weichere Panel/Card-Transitions,
  - route-card hover-lift, combat meter transition,
  - `prefers-reduced-motion` fallback.
- Sicherung:
  - Kernel/Store/Determinismus unangetastet.
  - `node --check` inkl. neuem Modul: `PASS`.
  - Gate-Bypass-Smoke: `PASS`.
  - Drift-Signaturtest: `PASS` (`8c49d92d`).

### 2026-03-11 - v0.1.32
- Phase-1 Masterplan-Haertung umgesetzt:
  - `src/project/unified.manifest.js` eingefuehrt und in `main.js` verdrahtet.
  - Store-Contract-Checks gehaertet:
    - Manifest muss `actionSchema` + `mutationMatrix` konsistent liefern.
    - Jede dispatchte Action braucht expliziten `mutationMatrix`-Eintrag.
  - Determinismus verbessert:
    - Scoped RNG-Streams fuer `reducer` und `simStep`.
  - Sim-Step in dedizierte Engine-Funktion gekapselt (reiner Engine-Einstieg).
- Phase-2 Start (Legacy-Adapter + Tests):
  - `src/project/unified.adapters.js` angelegt (Legacy -> kanonische Action-Namen).
  - Store nutzt Adapter-Hook vor Action-Validierung.
  - Tests hinzugefuegt:
    - `scripts/tests/adapter-smoke.mjs`
    - `scripts/tests/store-adapter-integration.mjs`
  - npm-Skripte erweitert:
    - `test:adapter`
    - `test:store-adapter`
    - `test`
- Verifikation:
  - `node --check` fuer geaenderte Kern-/Projektdateien: `PASS`.

### 2026-03-11 - v0.1.33
- Masterplan Phase-2 Kernfeatures integriert:
  - `game.substrate` State im Manifest erweitert (Einfluss + Weltwerte).
  - Neue Action `INTERVENE` mit 7 Interventionsarten eingefuehrt.
  - Reducer wendet Kosten/Effekte ueber zentrale Intervention-Config an.
  - `SIM_STEP` fuehrt deterministische Substrate-Drift + Einfluss-Regen aus.
- UI/UX:
  - HUD zeigt Einflusswert.
  - Weltstatus bietet direkte Interventionsbuttons mit Kosten und Sperrlogik.
- Legacy-Adapter:
  - Legacy-Namen fuer Interventionen auf `INTERVENE` gemappt.
- Tests:
  - Neuer Test `scripts/tests/interventions.mjs`.
  - `npm test` erweitert um Interventionslauf.

### 2026-03-11 - v0.2.1
- Release-Profile mit Feature-Flags eingefuehrt:
  - Neue Profile: `alpha`, `beta`, `rc`.
  - Neue Action: `SET_RELEASE_PROFILE` (manifest- und gate-konform).
  - Runtime-Profilauflösung in `main.js` ueber `?profile=` oder `localStorage` vorbereitet.
- Feature-Flag-Wirkung in Core-Logik aktiviert:
  - `enableRaidIntervention` blockiert `TRIGGER_RAID` im `alpha`-Profil.
  - `autoResolveEncounterTimeout` steuert Timeout-Autoresolve im `SIM_STEP`.
  - `strictInfluenceDefeat` verkuerzt den Influence-Nullpfad (profilbasiert) ueber Endstate-Check.
- Encounter-Timeout-Verhalten gehaertet:
  - Aktive Encounter altern jetzt in `SIM_STEP` ueber `ageTicks`.
  - Bei Timeout wird je nach Profil auto-resolved oder offen gehalten.
- Neue Testabdeckung:
  - `scripts/tests/release-profile.mjs` (Profile defaults, Raid-Block in alpha, Timeout-Autoresolve rc/alpha).
  - `package.json` Smoke-Kette erweitert um `test:release-profile`.

### 2026-03-11 - v0.2.2
- Doku final auf 3 aktive Dateien konsolidiert:
  - `docs/01_CHANGELOG.md`
  - `docs/02_VERSIONING.md`
  - `docs/03_TODO_MASTERPLAN.md`
- Masterplan in TODO integriert und externe, nicht verifizierbare Quellpfade als nicht-kanonisch markiert.
- Historische Zusatzdokumente in `docs_legacy_20260311/` belassen (kein Informationsverlust).
- Doku-Governance vereinheitlicht: laufende Pflege nur ueber Changelog + TODO + Versioning.
- Historische Changelog-Eintraege duerfen fruehere Dateinamen enthalten (z. B. `03_SYSTEM_STATUS.md`, `04_TODO.md`) und gelten als Legacy-Historie.

### 2026-03-11 - v0.2.3
- LifexLab-Integration gestartet (`/root/LifexLab` als Referenz fuer Welt-/Sim-Muster).
- Transit-Encounter-Logik von Zufalls-only auf weltzustandsgebundene Gewichtung erweitert:
  - neues `Threat/Stability`-Signal aus `alivePct`, `lightPct`, `toxinPct`, `mutationLevel`, `lineageControlPct`.
  - Encounter-Chance und Combat-Bias leiten sich jetzt deterministisch aus dem Substrate-Zustand ab.
  - Bestehende Substrate-Encounter-Pipeline (`pickSubstrateEncounterId` / `encounterById`) ist aktiv im Transitfluss eingebunden.
- TODO/Masterplan um konkrete LifexLab-Integrationspakete A-D erweitert.

### 2026-03-11 - v0.2.4
- P0-Gate-Haertung weiter umgesetzt:
  - `store.getDoc()` liefert jetzt einen gefrorenen Snapshot statt internem Live-Dokument.
  - `dispatch` committet atomar: erst `save(nextDoc)`, dann in-memory Swap + emit.
  - Determinismus-Guard erweitert um `crypto.getRandomValues` und `crypto.randomUUID`.
  - Runtime-Profil-Lesen in `main.js` auf fail-closed umgestellt.
- Red-Team-Tests erweitert:
  - readonly/anti-leak Test fuer `getDoc()`.
  - atomarer Save-Fehler-Test (`SAVE_FAIL`).
  - Non-Determinismus-Tests fuer `crypto.*` Quellen.
- Gesamte Testkette weiterhin gruen (`npm test`).

### 2026-03-11 - v0.2.5
- TODO-Abarbeitung (LLM_ENTRY-konform) weitergefuehrt mit P1-Kernfixes:
  - `CHOOSE_LOADOUT` setzt jetzt `maxHp` konsistent mit dem Archetyp.
  - Supplies-Konsistenz gehaertet: betroffene Actions synchronisieren jetzt `game.supplies` und `game.resources.supplies` ueber einen gemeinsamen Pfad.
  - Container-Flow korrigiert: Endstate-Pruefung nach Loot-Drops (nicht nur nach Kostenstand).
- Manifest-Gates erweitert fuer neue erlaubte Pfade:
  - `CHOOSE_LOADOUT` um `/game/maxHp` und `/game/resources/supplies`.
  - `BEGIN_COMBAT`, `RETREAT_FROM_COMBAT`, `USE_EMERGENCY_ITEM`, `RESOLVE_ENCOUNTER` um `/game/resources/supplies`.
- Testhaertung:
  - Adapter-Integration prueft jetzt `FIGHTER`-Loadout inkl. `maxHp/hp` und Supply-Sync.
  - Invariants pruefen dauerhaft `game.supplies === game.resources.supplies`.
  - Gesamte Testkette bleibt gruen (`npm test`).

### 2026-03-11 - v0.2.6
- Dokumentation auf volle Nachvollziehbarkeit erweitert:
  - `02_VERSIONING.md` um Dokumentenlandkarte, Legacy-Mapping, Reproduktionsprotokoll, DoD-Dokukontrakt und Audit-Trail-Format erweitert.
  - `03_TODO_MASTERPLAN.md` um Traceability-Matrix (offene Punkte -> Code/Gates/Tests) erweitert.
  - Verifizierten Ist-Stand explizit dokumentiert (P0/P1-Fixes + gruene Testkette).
- Ziel: Jeder offene oder erledigte Punkt ist jetzt eindeutig auf betroffene Dateien, Gate-Kontext und Testnachweis rueckfuehrbar.

### 2026-03-11 - v0.2.7
- Verifikationsstandard auf "unwiderlegbar" angehoben:
  - Neuer Vollprojekt-Test `scripts/tests/full-project-verification.mjs`.
  - `npm test` um `test:full-project` erweitert.
  - `.LLM_ENTRY.md` um verpflichtenden Nachweisblock inkl. Marker `FULL_PROJECT_VERIFICATION_OK` erweitert.
- Neue Vollprojekt-Pruefungen:
  - Syntaxcheck fuer alle `src/**/*.js`.
  - Existenzpruefung aller Pflichtdateien aus der LLM_ENTRY-Lesereihenfolge.
  - Reachability-Check fuer `src` (keine unerklaerten toten Dateien; explizite Allowlist-Regel).
  - `actionSchema` <-> `mutationMatrix` Konsistenz (beidseitig).
  - `mutationMatrix`-Top-Level-Pfade gegen `stateSchema` abgesichert.
  - Determinismus-Scan fuer `project.logic.js` gegen verbotene Quellen.

### 2026-03-11 - v0.2.8
- Determinismus-Redteam-Zyklus (Beweis -> aktive Widerlegung -> Root Cause -> Fix -> Regressionstest) abgeschlossen.
- Aktiver Gegenbeweis gefunden:
  - `src/project/canvas.fx.js` nutzte direkt `Math.random` in `spawnParticle` und `spawnImpact`, dadurch gleiche State-Inputs aber unterschiedliche FX-Ausgaben bei variierendem globalen RNG.
- Minimale Ursache:
  - Nicht-seeded, globaler Zufallszugriff in FX-Spawns.
- Fix ohne Core-Aenderungen:
  - `canvas.fx` auf lokalen deterministischen seed-basierten RNG umgestellt (aus `state.meta.seed` abgeleitet), direkte `Math.random`-Nutzung entfernt.
- Neue Regressionstests:
  - `scripts/tests/determinism-canvas.mjs`:
    - garantiert: kein `Math.random` in `canvas.fx`.
    - garantiert: identische FX-Signatur trotz unterschiedlichem globalen `Math.random` bei gleicher Seed+State.
    - garantiert: unterschiedliche Signatur bei unterschiedlichem Seed.
  - `full-project-verification` Determinismus-Scan von nur `project.logic.js` auf alle Runtime-Projektmodule (`src/project/*` + `src/main.js`) erweitert.
- Verifikation:
  - `npm test` gruen inkl. `DETERMINISM_CANVAS_OK` und `FULL_PROJECT_VERIFICATION_OK`.

### 2026-03-11 - v0.2.9
- Adversarial-Determinismus-Loop (UI-Timing) durchgefuehrt, ohne Core-Aenderungen.
- Erfolgreicher Gegenbeweis 1 (Timing-Segmentierung):
  - Repro: gleiche Gesamtzeit (`260ms`) aber unterschiedliche Frame-Schnitte (`[129,131]` vs `[130,130]`) fuehrten zu unterschiedlichen Signaturen.
  - Ursache: `ui.js` dispatchte pro Frame maximal einen `SIM_STEP` (`if (acc >= 130)`), wodurch Frame-Segmentierung wirksam wurde.
  - Fix: deterministischer Catch-up-Loop als Hilfsfunktion `advanceUiSimDeterministic` (mehrere Steps pro Tick moeglich).
- Erfolgreicher Gegenbeweis 2 (fraktionale Segmentierung nach erstem Fix):
  - Repro: gleiche Gesamtzeit (`130.2ms`) aber unterschiedlich segmentiert (`[43.4,43.4,43.4]` vs `[130.2]`) divergierte wegen per-Frame-Rundung.
  - Ursache: frueherer Fix rundete `dt` pro Frame (`Math.round(dt)`), wodurch Segmentierung wieder Einfluss bekam.
  - Fix: Rundung entfernt; float-akkumuliert mit Epsilon-Schwelle im Catch-up-Loop.
- Neue Absicherung:
  - Neuer Test `scripts/tests/determinism-ui-timing.mjs` (`DETERMINISM_UI_TIMING_OK`) deckt beide Gegenbeweise ab.
  - Testkette erweitert: `npm test` enthaelt jetzt `test:determinism-ui-timing`.
- Re-Validierung:
  - Gesamte Kette gruen inkl. `DETERMINISM_CANVAS_OK`, `DETERMINISM_UI_TIMING_OK`, `FULL_PROJECT_VERIFICATION_OK`.

### 2026-03-11 - v0.2.10
- TODO P1-Punkt umgesetzt: Decision-Rewards werden im Runtime-Encounter vollstaendig angewendet.
- `RESOLVE_ENCOUNTER` verarbeitet jetzt neben HP/SUPPLIES/MORALE auch:
  - `AMMO`, `MEDS`, `SCRAP`, `INTEL`, `CREDITS`
  - `progress` (auf `game.transit.progress`)
  - `QUEST_PROGRESS` (auf aktive Quest in `game.quests.active`, bevorzugt `trackedQuestId`)
- Encounter-Option-Schema erweitert, damit die neuen Reward-Deltas sanitizing-stabil im State verbleiben.
- Mutation-Gates fuer `RESOLVE_ENCOUNTER` erweitert (Ressourcenpfade, Transit-Progress, Quest-Active).
- Neuer Regressionstest:
  - `scripts/tests/decision-rewards.mjs` (`DECISION_REWARDS_OK`) prueft Ressourcendeltas + progress + quest-progress.
- Testkette aktualisiert:
  - `npm test` enthaelt jetzt `test:decision-rewards`.
- Verifikation:
  - `npm test` gruen inkl. `DECISION_REWARDS_OK`.

### 2026-03-11 - v0.2.11
- TODO P1-Punkt umgesetzt: District-Risikoanzeige (`danger`/`risk`) angeglichen.
- Renderer nutzt jetzt ein einheitliches Risk-Resolver-Verfahren:
  - Prioritaet: `profile.risk` -> `profile.danger` -> numerischer Fallback aus District-ID.
- Betroffene UI-Stellen:
  - Travel-Route-Karten (`Risiko ...`)
  - Map-Hover-Hinweis (`District ... Risiko ...`)
  - Map-Auswahl-Hinweis (`Auswahl ... Risiko ...`)
- Neuer Regressionstest:
  - `scripts/tests/district-risk.mjs` (`DISTRICT_RISK_OK`) prueft die Feld-Prioritaet und alle District-Profile.
- Testkette aktualisiert:
  - `npm test` enthaelt jetzt `test:district-risk`.
- Verifikation:
  - `npm test` gruen inkl. `DISTRICT_RISK_OK`.

### 2026-03-11 - v0.2.12
- TODO P1-Punkt umgesetzt: `TRIGGER_RAID`-UI respektiert Feature-Flag sauber.
- Renderer-Interventionslogik erweitert:
  - zentrale Guard-Funktion `interventionDisabledReason(state, kind, cost, ...)`.
  - `TRIGGER_RAID` wird bei deaktiviertem `enableRaidIntervention` disabled und mit Grund versehen.
  - bestehende Sperrgruende (Game-over/Combat/Transit/Encounter) und Influence-Grenzen bleiben erhalten.
- Neuer Regressionstest:
  - `scripts/tests/raid-ui-flag.mjs` (`RAID_UI_FLAG_OK`) prueft:
    - alpha: `TRIGGER_RAID` deaktiviert mit Grund,
    - beta: `TRIGGER_RAID` aktiv (bei genug Einfluss),
    - Influence-Reasoning und Prioritaet der Basis-Sperrgruende.
- Testkette aktualisiert:
  - `npm test` enthaelt jetzt `test:raid-ui-flag`.
- Verifikation:
  - `npm test` gruen inkl. `RAID_UI_FLAG_OK`.

### 2026-03-11 - v0.2.13
- TODO-Harmonisierung auf Zielsetzung und Produktstandards erweitert.
- `docs/03_TODO_MASTERPLAN.md` angepasst:
  - Encounter/Outcome-Punkt konsistent als erledigt markiert (inkl. erweiterter Reward-Semantik).
  - Neuer Block `Harmonisierung + Produktstandards` mit messbaren Qualitaets-/Betriebs-/Dokuzielen.
  - Traceability-Matrix fuer zuletzt abgeschlossene P1-Punkte auf verifizierten Stand aktualisiert.
  - Abschnitt `Aktueller verifizierter Stand` auf realen Ist-Stand erweitert (Decision-Rewards, District-Risk, Raid-UI-Flag).
- Ziel: TODO als produktionsnahe Steuerdatei mit klaren Standards und nachvollziehbarer Abnahme weiterfuehren.

### 2026-03-11 - v0.2.14
- TODO-Fortschritt weiter abgearbeitet (ohne Core-Aenderungen):
  - Offener Punkt `Regressionstest fuer Supply-Drift` geschlossen.
  - Offener Punkt `2-4 Entscheidungen pro Encounter als harte Mindestregel` geschlossen.
- Runtime-Haertung fuer Encounter-Optionen:
  - `src/project/project.logic.js` erhaelt `normalizeEncounterOptions(...)` als zentralen Guard.
  - Decision-Options werden nun in `pickDecisionScenario` und `encounterById` auf 2..4 eindeutige Optionen normalisiert.
  - Fallback fuellt bei Unterdeckung deterministisch mit Wait-Optionen auf.
- Neue Regressionstests:
  - `scripts/tests/supply-drift.mjs` (`SUPPLY_DRIFT_OK`): prueft Sync von `game.supplies` und `game.resources.supplies` ueber gemischte realistische Write-Pfade.
  - `scripts/tests/encounter-options.mjs` (`ENCOUNTER_OPTIONS_MIN_OK`): prueft 2..4-Regel und eindeutige Option-IDs in aktiven Decision-Encountern.
- Testkette erweitert:
  - `package.json` um `test:supply-drift` und `test:encounter-options` erweitert.
  - `npm test` fuehrt beide neuen Pflichttests in der Standardkette aus.

### 2026-03-11 - v0.2.15
- Dokumentation auf volle Nachvollziehbarkeit seit Entwicklungsbeginn erweitert.
- `docs/02_VERSIONING.md` um Voll-Trace-Abschnitt ergaenzt:
  - Scope/Regeln fuer 100%-Nachvollziehbarkeit,
  - vollstaendiger historischer Versionsindex (`v0.1.0` bis `v0.2.15`) mit Zeilenreferenzen in `docs/01_CHANGELOG.md`,
  - explizite Beweisfuehrung (Anzahl Eintraege) und feste Verifizierungsroutine fuer Folgeiterationen.
- `docs/03_TODO_MASTERPLAN.md` synchronisiert:
  - Doku/Governance-Punkt `Changelog-Altverweise ...` auf erledigt gesetzt.
  - Dokumentationsharmonisierungspunkt `Legacy-Mapping ... finalisieren` auf erledigt gesetzt.
- Ziel: lueckenlose Auditierbarkeit vom Projektstart (`2026-03-10`) bis zum aktuellen Stand in den 3 kanonischen Doku-Dateien.

### 2026-03-11 - v0.2.16
- TODO-Block `Victory/Defeat-Pfade` abgeschlossen (LLM_ENTRY-konform, ohne Core-Aenderungen).
- Neue Endpfade in `evaluateEndState` umgesetzt:
  - `DOMINANCE_PATH`
  - `SYMBIOSIS_PATH`
  - `METAMORPHOSIS_PATH`
  - zusaetzliche Defeat-Haertung: `LINEAGE_EXTINCTION`
- Kausaler Fix zur Wirksamkeit der neuen Pfade:
  - Gegenbeweis im ersten Testlauf: Pfade feuerten nicht, obwohl Logik vorhanden war.
  - Ursache: relevante Substrate-Felder wurden in Endstate-Aufrufen (`CHOOSE_ACTION`/`simStep`) nicht vollstaendig an `evaluateEndState` uebergeben.
  - Fix: `lightPct`, `toxinPct`, `lineageControlPct`, `mutationLevel` in beiden Endstate-Aufrufen verdrahtet.
- Neue Regression:
  - `scripts/tests/victory-defeat-paths.mjs` (`VICTORY_DEFEAT_PATHS_OK`) validiert alle 4 neuen Regeln reproduzierbar.
- Testkette erweitert:
  - `package.json` um `test:victory-defeat-paths` erweitert und in `npm test` aufgenommen.
- Verifikation:
  - `npm test` vollstaendig gruen inkl. `VICTORY_DEFEAT_PATHS_OK` und `FULL_PROJECT_VERIFICATION_OK`.

### 2026-03-11 - v0.2.17
- TODO-Block `Datenmodell/Inventar (P1)` abgeschlossen.
- Instanzmodell fuer Inventar eingefuehrt (ohne Core-Aenderungen):
  - Item-Schema erweitert um `instanceId`.
  - Inventory-State erweitert um `selectedCombatItemInstanceId`.
  - `SELECT_COMBAT_ITEM` akzeptiert jetzt optional `instanceId` (neben `itemId` fuer Legacy-Kompatibilitaet).
- Combat-Select/Consume auf Instanzbasis umgestellt:
  - Auswahl priorisiert `instanceId`, fallback auf `itemId`.
  - Verbrauch entfernt exakt die selektierte Instanz (nicht nur erste passende Katalog-ID).
- Migration fuer alte Saves umgesetzt:
  - Legacy-Items ohne `instanceId` werden deterministisch mit Fallback-IDs (`legacy_<id>_<index>`) normalisiert.
  - UI/Renderer senden und markieren Combat-Selection jetzt instanzbasiert.
- Gate-Erweiterungen:
  - Manifest/MutationMatrix um neue Instanzpfade erweitert (inkl. `SELECT_COMBAT_ITEM`-Write auf normalisierte `inventory.items`).
- Neue Regression:
  - `scripts/tests/inventory-instance.mjs` (`INVENTORY_INSTANCE_OK`) validiert:
    - neue Runs erzeugen Instanz-IDs,
    - Legacy-Save-Normalisierung,
    - selektive Consumable-Nutzung nach Instanz.
- Verifikation:
  - `npm test` vollstaendig gruen inkl. `INVENTORY_INSTANCE_OK` und `FULL_PROJECT_VERIFICATION_OK`.

### 2026-03-11 - v0.2.18
- TODO-Block `Testabdeckung / Action-Coverage` abgeschlossen.
- Neuer Vollabdeckungstest fuer Manifest-Actions:
  - `scripts/tests/action-coverage.mjs` (`ACTION_COVERAGE_OK`)
  - prueft Vollstaendigkeit gegen `actionSchema` (keine fehlenden/extra Cases)
  - fuehrt erwartungsbasierte Szenarien fuer jede Action aus (inkl. ehemals ungetesteter Pfade wie `OPEN_LOOT_CONTAINER`, `UPDATE_QUEST`, `TRACK_STAT`).
- Adversarial-Nachweis im selben Zyklus:
  - Gegenbeweis im ersten Lauf: `RETREAT_FROM_COMBAT`-Case war falsch parametrisiert (Guard-Schwelle).
  - Minimale Ursache: Testzustand `enemyHp` lag auf Blockgrenze.
  - Fix: Testbedingung auf gueltigen Retreat-Zustand angepasst.
- Testkette erweitert:
  - `package.json` um `test:action-coverage` erweitert und in `npm test` integriert.
- Verifikation:
  - `npm test` vollstaendig gruen inkl. `ACTION_COVERAGE_OK` und `FULL_PROJECT_VERIFICATION_OK`.

### 2026-03-11 - v0.2.19
- TODO-Block `Kernel-Zieltests (patches/schema/rng)` abgeschlossen (ohne Core-Aenderungen).
- Neue Contract-Tests hinzugefuegt:
  - `scripts/tests/kernel-patches-target.mjs` (`KERNEL_PATCHES_TARGET_OK`)
    - prueft erlaubte Prefix-Pfade, unsafe-path-Block (`__proto__`, `constructor`, malformed paths), Root-Container-Replace-Block, immutable Patch-Anwendung und Op-Verhalten (`set/inc/push/del`).
  - `scripts/tests/kernel-schema-target.mjs` (`KERNEL_SCHEMA_TARGET_OK`)
    - prueft unknown-key-strip, typed-array-normalisierung, maxLen-Clamp, Fallback auf Defaults bei nicht-serialisierbaren Werten, Safety-Limits fuer uebergrosse Arrays.
  - `scripts/tests/kernel-rng-target.mjs` (`KERNEL_RNG_TARGET_OK`)
    - prueft Determinismus gleicher Seeds, Divergenz unterschiedlicher Seeds/Scopes, Bereichsgrenzen fuer `int`/`f01` und Helper-Konsistenz.
- Adversarial-Fix im Testzyklus:
  - Gegenbeweis im ersten Schema-Testlauf: Oversize-Fall war kein echtes Array und umging den Array-Guard.
  - Minimale Ursache: Testinput falsch typisiert.
  - Fix: Oversize-Repro auf echtes Sparse-Array ueber Safety-Limit umgestellt.
- Testkette erweitert:
  - `package.json`: `test:kernel-patches-target`, `test:kernel-schema-target`, `test:kernel-rng-target` in `npm test` integriert.
- Verifikation:
  - `npm test` vollstaendig gruen inkl. `KERNEL_PATCHES_TARGET_OK`, `KERNEL_SCHEMA_TARGET_OK`, `KERNEL_RNG_TARGET_OK`, `FULL_PROJECT_VERIFICATION_OK`.

### 2026-03-11 - v0.2.20
- TODO-Block `Renderer/UI-Kontrakt-Tests` abgeschlossen.
- Neuer Kontrakt-Test hinzugefuegt:
  - `scripts/tests/renderer-ui-contract.mjs` (`RENDERER_UI_CONTRACT_OK`)
  - statischer Read-only-Scan fuer `renderer.js`/`ui.js` (keine direkten `state.*`-Writes, keine mutierenden Array-Operationen auf State-Pfaden, kein `store.dispatch` im Renderer),
  - Verhaltenstest fuer `advanceUiSimDeterministic` (inaktive States -> keine Dispatches, aktive States -> nur `SIM_STEP`, deterministische Step-Anzahl, Guard-Cap).
- Adversarial-Testhygiene im Zyklus:
  - Gegenbeweise in den ersten Regex-Versionen (False Positives) aktiv widerlegt.
  - Minimale Ursache: zu breite statische Muster.
  - Fix: zeilenbasierte, strengere Kontraktmuster.
- Testkette erweitert:
  - `package.json`: `test:renderer-ui-contract` in `npm test` integriert.
- Verifikation:
  - `npm test` vollstaendig gruen inkl. `RENDERER_UI_CONTRACT_OK` und `FULL_PROJECT_VERIFICATION_OK`.

### 2026-03-11 - v0.2.21
- TODO-Punkt `store-adapter-integration` Travel-Assertion auf echte Verhaltenspruefung umgebaut.
- `scripts/tests/store-adapter-integration.mjs` erweitert:
  - nicht nur `transit.active`-Toggle,
  - sondern valide Travel-Startparameter (`from/to/progress/cooldown`),
  - Legacy-`STEP_SIMULATION`-Pfad fuer echte Fortschrittsdynamik,
  - Arrival-Nachweis am Ziel-District unter Encounter/Combat-Zwischenfaellen.
- Ziel: Adapter-Mapping fuer Bewegung und Tick-Simulation vertraglich als End-to-End-Verhalten absichern.
- Verifikation:
  - `STORE_ADAPTER_INTEGRATION_OK` und `npm test` vollstaendig gruen (inkl. `FULL_PROJECT_VERIFICATION_OK`).

### 2026-03-11 - v0.2.22
- TODO-Block `Stability hostunabhaengig` abgeschlossen.
- `scripts/tests/stability.mjs` von wall-clock-Schwellwert auf hostunabhaengige Repro-Kriterien umgestellt:
  - entfernt: zeitbasierte Grenzwerte (`Date.now`-Dauercheck),
  - neu: seed-basierter Doppel-Laufvergleich auf Signatur/Snapshot,
  - neu: Konsistenz-Nachweis fuer `dispatchCount`, `eventCount`, `revisionCount`,
  - neu: Divergenz-Check fuer abweichenden Seed.
- Ziel: Flaky-Risiko durch Host-Leistung eliminiert, Stability als deterministischer Contract messbar gemacht.
- Verifikation:
  - `STABILITY_OK` und `npm test` vollstaendig gruen inkl. `FULL_PROJECT_VERIFICATION_OK`.

### 2026-03-11 - v0.2.24
- Unified Verification Routine & Hard Test Integration abgeschlossen.
- Neue Master-Pruefroutine: `scripts/tests/system-proof.mjs` (`SYSTEM_PROOF_OK`).
  - Aggregiert alle Kernel-, State-, Action-, Renderer-, Adapter- und Determinismus-Tests.
  - Validiert Marker-Ausgabe pro Block und stellt die Volltestkette sicher.
- Zusätzliche harte Tests integriert und verifiziert:
  - `scripts/tests/persistence-replay.mjs` (`PERSISTENCE_REPLAY_OK`):
    - Gleicher Seed + Actions + Save/Load-Zwischenstand führt zu identischem Endzustand/Signatur (Memory- und File-Driver).
  - `scripts/tests/patch-trace.mjs` (`PATCH_TRACE_OK`):
    - Verifiziert identische Patch-Sequenzen bei gleichem Seed; Divergenz nur bei RNG-Beteiligung/Seed-Wechsel.
  - `scripts/tests/seed-matrix.mjs` (`SEED_MATRIX_OK`):
    - Prueft Signaturen, Snapshots und Revisionen über mehrere Profile (`alpha`, `beta`, `rc`) und Seeds.
  - `scripts/tests/fuzz-determinism.mjs` (`FUZZ_DETERMINISM_OK`):
    - Seed-fixe zufällige Action-Sequenzen (500+ Steps) auf Determinismus und Invarianten geprüft.
  - `scripts/tests/redteam-path-hardening.mjs` (`REDTEAM_PATH_HARDENING_OK`):
    - Erweiterte Prüfung gegen `__proto__`, root replace, prefix escaping und nested writes.
  - `scripts/tests/cross-module-contract.mjs` (`CROSS_MODULE_CONTRACT_OK`):
    - Statische und strukturelle Prüfung von Manifest, Reducer-Abdeckung, Adapter-Mapping und Read-only Renderer/UI.
- Verifikation:
  - `npm test` vollständig grün inkl. `SYSTEM_PROOF_OK` und `FULL_PROJECT_VERIFICATION_OK`.
  - Alle neuen Marker isoliert und in der Kette erfolgreich nachgewiesen.
  - Keine Core-Änderungen notwendig; bestehende Gates erwiesen sich als robust.
