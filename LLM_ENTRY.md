# LLM_ENTRY — Pflicht-Einstieg (Core Standalone)

Diese Datei ist fuer Projekt-Pruefungen verpflichtend.

Wenn du als LLM die unten genannten Dateien nicht gelesen hast, darfst du keine Code-Aenderung abschliessen.

READ_CHALLENGE: CORE_LLM_ENTRY_2026_HARD_GATE

## 0) Pflicht-Lesereihenfolge

1. `kernel/store.js`
2. `kernel/patches.js`
3. `kernel/schema.js`
4. `kernel/rng.js`
5. `README.md`

Stop-Regel:
- Wenn ein Pflichtpfad fehlt, abbrechen und Analyse liefern.
- Kein "Quick Fix" ohne Contract-Abgleich.

## 1) Pflicht-Anker im Kernel

- `createStore(`
- `dispatch(`
- `assertPatchesAllowed(`
- `sanitizeBySchema(`
- `runWithDeterminismGuard(`
- `getSignature(`

## 2) Verbindliche Regeln

- Jede State-Aenderung nur ueber `dispatch`.
- Reducer liefern nur `patches[]`.
- Jede Aktion braucht `actionSchema`.
- Jeder Write-Pfad braucht `mutationMatrix`.
- Keine nicht-deterministischen Quellen im Reducer-/simStep-Kontext.

## 3) Verboten

- Direkte State-Mutation.
- Logik, die `Math.random`, `Date`, `performance` oder `crypto.randomUUID` im Guard-Pfad nutzt.
- Schreiben auf nicht freigegebene Pfade.

## 4) Projekt-Pruefung (Pflicht)

Vor Abschluss:

1. `npm run ack:llm-entry`
2. `npm run check:llm-entry`
3. `npm run trace:check`
4. `npm test`

Ohne gruenen `check:llm-entry` gilt eine Pruefung als nicht bestanden.

## 5) Change-Trace Pflicht

- `CHANGELOG.md` ist Pflicht und darf nur erweitert werden (append-only Guard).
- `CHANGE_MATRIX.jsonl` ist Pflicht und verankert Version + Changelog + Code-Snapshot.
- Ohne gueltigen Matrix-/Changelog-Check ist keine Freigabe erlaubt.
