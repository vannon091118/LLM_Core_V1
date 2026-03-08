# LLM_ENTRY — Pflicht-Einstieg (READ FIRST)

**Diese Datei ist ein verpflichtender Kontroll- und Navigations-Gate.**

Wenn du (als LLM) nicht bereit bist, die unten genannten Kernel-Dateien **tatsächlich zu öffnen und zu lesen**, musst du **abbrechen** und stattdessen eine **Analyse** liefern (was du gefunden hast / was fehlt), **anstatt Code zu erzeugen**.

Dieses Projekt ist **kein “Framework zum Erraten”**, sondern ein **Contract-System**. Änderungen ohne Manifest-/Schema-/Matrix-Anpassung gelten als **defekt**, selbst wenn “es irgendwie läuft”.

---

## 0) Pflicht-Lesereihenfolge (nicht verhandelbar)

1. `src/kernel/store.js` — **einziger Write-Entry**
2. `src/kernel/patches.js` — Patch-Engine + Write-Gate
3. `src/project/project.manifest.js` — Contracts (Schema + Matrix)
4. `src/kernel/schema.js` — Schema-Enforcement / Sanitizing
5. `src/kernel/rng.js` — deterministische RNG-Streams
6. `src/project/project.logic.js` — Reducer + (optional) `simStep`
7. `src/project/renderer.js` — Pure Renderer (Read-only)
8. `src/project/ui.js` — UI-Wiring (keine Logik)

**Stop-Regel:** Wenn ein genannter Anker unten in deinem Checkout nicht existiert, **stoppe** und gib eine Analyse zurück, welche Datei/Anker abweicht (kein Code schreiben).

---

## 1) Kernel Core verstehen
→ `src/kernel/store.js`

**Anker (müssen gefunden werden):**
- `dispatch(`
- `applyPatches`
- `assertPatchesAllowed`
- `getState`

**Verbindliche Regeln:**
- Jede State-Veränderung läuft **ausschließlich** über `dispatch`.
- Reducer liefern **Patches zurück**, niemals direkte Mutationen.
- Nach jeder Patch-Anwendung erfolgt **Sanitizing** gegen `stateSchema`.

---

## 2) Patch-Only Mutations + Write-Gate verstehen
→ `src/kernel/patches.js`

**Anker:**
- `applyPatches(`
- `assertPatchesAllowed(`

**Verbindliche Regeln:**
- Es gibt **keine** erlaubte Mutation außerhalb von Patches.
- `assertPatchesAllowed` ist ein **Write-Gate**: nur Pfade aus der `mutationMatrix[actionType]` dürfen geschrieben werden.
- Wenn ein Patch-`path` nicht freigeschaltet ist, ist das **kein “kleiner Fix”**, sondern ein **Contract-Bruch**.

---

## 3) Manifest & Verträge verstehen
→ `src/project/project.manifest.js`

**Anker:**
- `stateSchema`
- `actionSchema`
- `mutationMatrix`
- `SCHEMA_VERSION`

**Verbindliche Regeln:**
- Jedes neue State-Feld **muss** im `stateSchema` stehen.
- Jede neue Action **muss** im `actionSchema` stehen.
- Jede neue schreibende Pfadgruppe **muss** in `mutationMatrix` freigeschaltet werden.
- Ohne Manifest-Änderung ist **keine** Erweiterung zulässig.

---

## 4) Sanitizer verstehen
→ `src/kernel/schema.js`

**Anker:**
- `sanitizeBySchema(`

**Verbindliche Regeln:**
- Der State wird nach jedem Step **gegen das Schema erzwungen**.
- Nicht definierte Keys werden entfernt.
- Daten müssen **JSON-serialisierbar** bleiben (kein Date, Map, Set, Functions, Klasseninstanzen).

---

## 5) Deterministische Simulation verstehen
→ `src/kernel/store.js` + `src/project/project.logic.js` + `src/kernel/rng.js`

> Hinweis: In diesem Projekt ist Simulation als deterministische Hook implementiert:
> `store.dispatch` ruft bei `SIM_STEP` optional `project.simStep(nextState, { rng: rngStreams })` auf.

**Anker:**
- `SIM_STEP`
- `simStep(`
- `createRngStreams(` / `rngStreams`

**Verbindliche Regeln:**
- Simulation ist deterministisch: **kein** `Math.random`, **kein** `Date.now`, **keine** systemzeitabhängige Logik.
- Alle Simulation-Änderungen erfolgen über **Patches** und werden durch die `mutationMatrix["SIM_STEP"]` gegated.
- RNG kommt ausschließlich aus den bereitgestellten Streams (`rngStreams`).

---

## 6) Renderer verstehen
→ `src/project/renderer.js`

**Anker:**
- `render(`
- `draw`

**Verbindliche Regeln:**
- Renderer liest State.
- Renderer verändert **niemals** State.
- **Keine Logik im UI** (keine Derived-State-Mutationen, keine versteckten Writes).

---

## Verbindlicher Feature-Integrations-Workflow (Reihenfolge erzwingend)

Jede Erweiterung muss **genau** in dieser Reihenfolge passieren:

1. **`stateSchema` erweitern** (`src/project/project.manifest.js`)
2. **`actionSchema` erweitern** (`src/project/project.manifest.js`)
3. **`mutationMatrix` erweitern** (`src/project/project.manifest.js`)
4. **Reducer implementieren** *(Patch-only)* (`src/project/project.logic.js` → `reducer`)
5. **`simStep` erweitern** *(falls notwendig)* (`src/project/project.logic.js` → `simStep`)
6. **Renderer/UI anpassen** (`src/project/renderer.js`, `src/project/ui.js`)

**Kein Schritt darf übersprungen werden.**

---

## Verboten (harte Stop-Liste)

- Direkte State-Mutation (außerhalb von `applyPatches`)
- Neue globale Variablen (besonders für State/Cache/RNG)
- Parallele Zustandsstrukturen (Shadow-State, UI-State als Wahrheit)
- Umgehung der Mutation-Matrix (Writes ohne freigeschaltete Pfade)
- Nicht deterministische Simulation (`Math.random`, `Date.now`, Timeouts als Logik)
- Logik im Renderer/UI
- Neue Felder ohne Schema-Eintrag
- “Quick fixes”, die Contracts umgehen (“nur kurz hier speichern…”)

---

## Definition of Done (DoD) — Änderung ist erst fertig, wenn …

- [ ] **Manifest aktualisiert:** `stateSchema` / `actionSchema` / `mutationMatrix` korrekt erweitert
- [ ] **Reducer patch-only:** keine direkten Mutationen, nur Patches
- [ ] **Write-Gate ok:** alle Patch-Pfade sind durch `mutationMatrix[actionType]` freigeschaltet
- [ ] **Sanitizing ok:** State bleibt schema-konform, keine fremden Keys, JSON-serialisierbar
- [ ] **Determinismus ok:** keine nicht-deterministischen Quellen, RNG nur über `rngStreams`
- [ ] **Renderer bleibt pure:** keine Writes, keine Logik
- [ ] **Repro:** gleiche Inputs → gleiche Outputs (Simulation & State)

---

## Ziel dieses Kontrollsystems

Dieses System stellt sicher, dass:

- der Kernel stabil bleibt,
- jede Erweiterung deterministisch bleibt,
- der Arbeitsstatus reproduzierbar ist,
- keine impliziten Nebenlogiken entstehen,
- LLMs nicht raten, sondern **lesen und integrieren**.

Wenn du diese Regeln nicht einhalten kannst oder zentrale Anker nicht findest:
**abbrechen + Analyse liefern (kein Code).**

