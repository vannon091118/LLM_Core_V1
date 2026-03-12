# SoD Ruleset (Projektpflicht)

## Dokumentationspflicht
- Die Doku wird immer fortgefuehrt, niemals geloescht.
- Der Ordner `docs/` hat genau 3 Dateien.
- `docs/01_MASTER_LOG.md` ist append-only und lueckenlos.

## LLM_ENTRY / Core Pflicht
- Arbeiten nur ueber Patch-Flow:
  1. `stateSchema`
  2. `actionSchema`
  3. `mutationMatrix`
  4. `reducer` (patch-only)
  5. `simStep` (falls noetig)
  6. `renderer/ui`
- Keine direkte State-Mutation ausserhalb von `applyPatches`.
- Write-Gate darf nie umgangen werden.
- Keine nicht-deterministischen Quellen in Sim-Logik.

## Ingame Regeln (Startphase)
1. SURVIVE
2. TRAUE NIEMANDEM
3. ENTSCHEIDUNGEN BLEIBEN FUER IMMER

## Turn-Based Entscheidungsregel
- Im GAME trifft der Spieler pro Runde genau eine Entscheidung.
- Erlaubte Entscheidungen:
  - `SCOUT`
  - `FORAGE`
  - `REST`
- Jede Entscheidung wird als `CHOOSE_ACTION` gepatcht.
- Trigger sind seed-deterministisch und werden nicht direkt mutiert.

## Ingame Panel-Varianten (Platzhalter)
- Nach jeder Runde wird genau ein Panel-Modus aktiv:
  - `KAMPF`
  - `DIALOG`
  - `PLUENDERN`
- Der Modus wird seed-deterministisch aus dem Trigger-Roll abgeleitet.
- Mechaniken sind aktuell bewusst Placeholder-Menues.

## Transit- und Ereignisregel
- Reisen erfolgt nur ueber offene Straßenkanten der Karte.
- Blockierte Straßen sind nicht nutzbar.
- Bewegung laeuft schrittweise im `SIM_STEP` (langsamer Lauf-Effekt).
- Waehrend Transit koennen seed-deterministische Events ausloesen.
- Event-Fortsetzung verlangt genau einen Modus:
  - `DECISION`
  - `COMBAT`

## Inventar- und Kampfregel
- Inventar ist listenbasiert (Name + Effekt), ohne Icons.
- Item-Details koennen geoeffnet werden und zeigen eine einfache Canvas-Karte.
- Zu Kampfbeginn gibt es eine PREP-Phase mit Itemauswahl.
- Danach laeuft der Kampf automatisch in `SIM_STEP`.
- Erster Kampf ist hart gescriptet nach erstem Waffenfund.
