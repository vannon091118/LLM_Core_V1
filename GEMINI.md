# GEMINI Context: Substrate

## Projekt-Übersicht
**Substrate** (ehemals SoD) ist ein hochgradig strukturiertes **Contract-System**-Projekt. Es basiert auf einem strikten Kernel-Ansatz mit deterministischer Simulation, Patch-Only Mutationen und einer manifest-gesteuerten Architektur.

### Kern-Technologien
- **Runtime:** Browser (JavaScript, CSS, HTML5 Canvas)
- **Kernel:** Eigene Implementierung in `src/kernel` (Store, Patches, RNG, Schema, Persistence)
- **Logik:** Reducer-basierte Zustandsänderungen in `src/project/project.logic.js`
- **Tests:** Node.js (ESM) mit einer umfangreichen, markerbasierten Validierungskette

### Architektur & Verträge
Das Projekt folgt dem **"Strict Contract Enforcement"** Prinzip:
1.  **Write-Gate Validation:** State-Änderungen sind *ausschließlich* über `dispatch` und Patches erlaubt.
2.  **Mutation Matrix:** Jede Aktion muss explizit in `src/project/project.manifest.js` freigeschaltete Pfade (`mutationMatrix`) besitzen.
3.  **Schema-Enforcement:** Der State wird nach jedem Schritt gegen das `stateSchema` sanitisiert.
4.  **Deterministische Simulation:** Kein `Math.random`, `Date.now` oder andere nicht-deterministische Quellen in der Kernlogik. RNG kommt ausschließlich aus `rngStreams`.
5.  **Pure Renderer:** Der Renderer (`src/project/renderer.js`) ist read-only und darf niemals den State mutieren oder `dispatch` aufrufen.

---

## Entwicklung & Betrieb

### Wichtige Befehle
- **Entwicklungsserver:** `npm run dev` (startet `python3 -m http.server 4173`)
- **Vollständige Testkette:** `npm test` (führt alle Block-Tests und `system-proof.mjs` aus)
- **System-Nachweis:** `node scripts/tests/system-proof.mjs` (validiert alle Marker-Blöcke)
- **Release-Gate:** `npm run gate:release` (prüft Volltestkette und offene P1/P2-Risiken)

### Verifikations-Marker
Das System nutzt Marker zur Validierung. Eine Änderung gilt erst als belegt, wenn der entsprechende Marker (z. B. `SYSTEM_PROOF_OK`, `FULL_PROJECT_VERIFICATION_OK`) ausgegeben wird.

---

## Konventionen & Standards

### Dokumentations-Gate (3-Dateien-Regel)
Die Dokumentation ist auf genau 3 kanonische Dateien beschränkt:
1.  `docs/01_CHANGELOG.md` (Lückenloses Protokoll, append-only)
2.  `docs/02_VERSIONING.md` (Regeln, Semantik, Versionsindex)
3.  `docs/03_TODO_MASTERPLAN.md` (Aktuelle Arbeitsliste & Masterplan)

### Integrations-Workflow
Jede Erweiterung muss zwingend in dieser Reihenfolge erfolgen:
1.  `stateSchema` erweitern
2.  `actionSchema` erweitern
3.  `mutationMatrix` erweitern
4.  Reducer/SimStep implementieren (Patch-only)
5.  Renderer/UI anpassen
6.  Tests validieren (Marker prüfen)

---

## Wichtige Pfade
- `/src/kernel/`: Stabiler Kern (Store, Patches, RNG)
- `/src/project/`: Projekt-Logik, Manifeste und UI
- `/scripts/tests/`: Umfangreiche Test-Suite
- `/.LLM_ENTRY.md`: Verpflichtender Einstiegs-Gate für LLMs

**HINWEIS:** Behandle `Substrate` niemals als "Framework zum Erraten". Lies immer die Verträge in den Manifesten, bevor du Code änderst.
