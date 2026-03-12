# Substrate Versioning + Dokumentationsprotokoll

Datum: 2026-03-11

## Kanonische Doku-Struktur (genau 3 Dateien)
1. `docs/01_CHANGELOG.md` (append-only, erweitertes Protokoll)
2. `docs/02_VERSIONING.md` (Regeln, Semantik, Versionsdisziplin)
3. `docs/03_TODO_MASTERPLAN.md` (Arbeits-TODO inkl. Masterplan)

## Dokumentationsregeln
- Doku wird fortgefuehrt, nicht geloescht.
- Historie bleibt im Changelog lueckenlos erhalten.
- Alte/abgeloeste Dokumente liegen nur noch in `docs_legacy_20260311/`.
- Aenderungen an Kernlogik muessen in Changelog und TODO sichtbar sein.

## Masterplan-Quellenregel
- Primare Arbeitsquelle ist `docs/03_TODO_MASTERPLAN.md`.
- Der eingepflegte Masterplan-Snapshot stammt aus `docs_legacy_20260311/05_MASTERPLAN_MD1_PLAN.md`.
- Externe Pfade (z. B. `/root/Fusion/...`) sind nicht mehr kanonisch.

## Kernel-/LLM-Integritaetsregeln
- Arbeiten nur ueber Manifest + Patch-Flow (`stateSchema`, `actionSchema`, `mutationMatrix`, reducer/simStep).
- Keine direkte State-Mutation ausserhalb von `applyPatches`.
- Write-Gate darf nicht umgangen werden.
- Keine nicht-deterministischen Quellen in Sim-Logik.

## Versionssemantik
- `updatedAt` ist Revisionszaehler (kein Zeitstempel).
- `revisionCount` ist der explizite Alias derselben Semantik.
- Persistenzfehler sind sichtbar zu machen, nicht still zu schlucken.

## Pflege-Check pro Iteration
- Changelog-Eintrag in `docs/01_CHANGELOG.md` ergaenzt.
- TODO/Masterplan-Status in `docs/03_TODO_MASTERPLAN.md` aktualisiert.
- Testkette (`npm test`) gruen dokumentiert.

## Dokumentenlandkarte (vollstaendig nachvollziehbar)
1. `docs/01_CHANGELOG.md`
- Zweck: lueckenlose Chronologie aller inhaltlichen und technischen Aenderungen.
- Pflicht bei jeder Iteration: neuer Eintrag mit Versionslabel, Kernpunkten, Teststatus.

2. `docs/02_VERSIONING.md`
- Zweck: Regeln, Prozess, Begriffe, Nachvollziehbarkeitskontrakt.
- Pflicht bei Prozessaenderungen: diese Datei anpassen.

3. `docs/03_TODO_MASTERPLAN.md`
- Zweck: aktueller Planungs- und Umsetzungsstand (offen/erledigt), Priorisierung, Integrationspakete.
- Pflicht bei Feature-/Fix-Arbeit: Status der betroffenen Aufgaben aktualisieren.

## Legacy-Mapping (alte -> neue Doku)
- `docs/01_MASTER_LOG.md` -> `docs/01_CHANGELOG.md`
- `docs/02_RULESET.md` -> `docs/02_VERSIONING.md`
- `docs/03_SYSTEM_STATUS.md` + `docs/04_TODO.md` + `docs/05_MASTERPLAN_MD1_PLAN.md` -> `docs/03_TODO_MASTERPLAN.md`
- Historische Originale bleiben in `docs_legacy_20260311/` erhalten.

## Reproduktionsprotokoll (technischer Nachweis)
Ausfuehrungsort: `/root/Substrate`

1. Syntax-Pruefung:
`bash -lc 'for f in $(rg --files src -g \"*.js\"); do node --check \"$f\" || exit 1; done; echo SYNTAX_OK'`

2. Vollstaendige Gate-Kette:
`npm test`

3. Erwartete Schluesselmarker:
- `ADAPTER_SMOKE_OK`
- `STORE_ADAPTER_INTEGRATION_OK`
- `INTERVENTIONS_OK`
- `RELEASE_PROFILE_OK`
- `INVARIANTS_OK`
- `STABILITY_OK`
- `DRIFT_SIGNATURE_OK`
- `GATE_REDTEAM_OK`
- `SEED_REPRO_MATRIX_OK`
- `PERSISTENCE_REPLAY_OK`
- `PATCH_TRACE_OK`
- `SEED_MATRIX_OK`
- `FUZZ_DETERMINISM_OK`
- `REDTEAM_PATH_HARDENING_OK`
- `CROSS_MODULE_CONTRACT_OK`
- `SYSTEM_PROOF_OK`
- `FULL_PROJECT_VERIFICATION_OK`

## Nachvollziehbarkeitskontrakt (DoD fuer Doku)
Eine Iteration gilt nur dann als voll dokumentiert, wenn alle Punkte erfuellt sind:
- Code-Aenderung vorhanden (betroffene Dateien).
- Manifest-/Gate-Konformitaet geprueft (bei Action-/State-Aenderungen).
- Testnachweis vorhanden (`npm test` oder begruendete Teilmenge).
- Changelog-Eintrag vorhanden.
- TODO-Status synchronisiert (offen/erledigt).

## Audit-Trail-Format fuer neue Changelog-Eintraege
Empfohlenes Minimalschema pro Eintrag:
- Version + Datum
- Was wurde geaendert?
- Welche Gates/Vertraege waren betroffen?
- Welche Tests liefen und mit welchem Ergebnis?
- Welche TODO-Punkte wurden bewegt?

## Voll-Trace seit Entwicklungsbeginn (100% Nachvollziehbarkeit)
Stichtag dieser Zusammenfassung: 2026-03-11

### Scope
- Startpunkt der Entwicklung: `2026-03-10`.
- Vollhistorie: `docs/01_CHANGELOG.md` (append-only).
- Steuerstand offen/erledigt: `docs/03_TODO_MASTERPLAN.md`.
- Legacy-Quellen: `docs_legacy_20260311/*` (read-only, nicht mehr kanonisch).

### Vollstaendigkeitskriterium
Eine Entwicklungsetappe ist nur dann als nachvollziehbar markiert, wenn alle 4 Belege vorhanden sind:
1. Versionsereignis im Changelog (Datum + Versionslabel + inhaltliche Aenderung)
2. Betroffener Planstatus im TODO/Masterplan (offen/verifiziert)
3. Kontraktbezug (Manifest/Gates/Determinismus, sofern betroffen)
4. Repro-Nachweis (`npm test` bzw. explizite Marker)

### Historischer Versionsindex (vollstaendig, seit Beginn)
- `2026-03-10 - v0.1.0` -> `docs/01_CHANGELOG.md:9`
- `2026-03-10 - v0.1.1` -> `docs/01_CHANGELOG.md:13`
- `2026-03-10 - v0.1.2` -> `docs/01_CHANGELOG.md:17`
- `2026-03-10 - v0.1.3` -> `docs/01_CHANGELOG.md:23`
- `2026-03-10 - v0.1.4` -> `docs/01_CHANGELOG.md:29`
- `2026-03-10 - v0.1.5` -> `docs/01_CHANGELOG.md:37`
- `2026-03-10 - v0.1.6` -> `docs/01_CHANGELOG.md:44`
- `2026-03-11 - v0.1.7` -> `docs/01_CHANGELOG.md:52`
- `2026-03-11 - v0.1.8` -> `docs/01_CHANGELOG.md:63`
- `2026-03-11 - v0.1.9` -> `docs/01_CHANGELOG.md:76`
- `2026-03-11 - v0.1.10` -> `docs/01_CHANGELOG.md:90`
- `2026-03-11 - v0.1.11` -> `docs/01_CHANGELOG.md:107`
- `2026-03-11 - v0.1.11a` -> `docs/01_CHANGELOG.md:132`
- `2026-03-11 - v0.1.12` -> `docs/01_CHANGELOG.md:142`
- `2026-03-11 - v0.1.13` -> `docs/01_CHANGELOG.md:160`
- `2026-03-11 - v0.1.14` -> `docs/01_CHANGELOG.md:181`
- `2026-03-11 - v0.1.15` -> `docs/01_CHANGELOG.md:196`
- `2026-03-11 - v0.1.16` -> `docs/01_CHANGELOG.md:206`
- `2026-03-11 - v0.1.17` -> `docs/01_CHANGELOG.md:220`
- `2026-03-11 - v0.1.18` -> `docs/01_CHANGELOG.md:233`
- `2026-03-11 - v0.1.19` -> `docs/01_CHANGELOG.md:249`
- `2026-03-11 - v0.1.20` -> `docs/01_CHANGELOG.md:265`
- `2026-03-11 - v0.1.21` -> `docs/01_CHANGELOG.md:278`
- `2026-03-11 - v0.1.22` -> `docs/01_CHANGELOG.md:298`
- `2026-03-11 - v0.1.23` -> `docs/01_CHANGELOG.md:315`
- `2026-03-11 - v0.1.24` -> `docs/01_CHANGELOG.md:331`
- `2026-03-11 - v0.1.25` -> `docs/01_CHANGELOG.md:341`
- `2026-03-11 - v0.1.26` -> `docs/01_CHANGELOG.md:369`
- `2026-03-11 - v0.1.27` -> `docs/01_CHANGELOG.md:380`
- `2026-03-11 - v0.1.28` -> `docs/01_CHANGELOG.md:409`
- `2026-03-11 - v0.1.29` -> `docs/01_CHANGELOG.md:424`
- `2026-03-11 - v0.1.30` -> `docs/01_CHANGELOG.md:439`
- `2026-03-11 - v0.1.31` -> `docs/01_CHANGELOG.md:456`
- `2026-03-11 - v0.1.32` -> `docs/01_CHANGELOG.md:480`
- `2026-03-11 - v0.1.33` -> `docs/01_CHANGELOG.md:502`
- `2026-03-11 - v0.2.1` -> `docs/01_CHANGELOG.md:517`
- `2026-03-11 - v0.2.2` -> `docs/01_CHANGELOG.md:533`
- `2026-03-11 - v0.2.3` -> `docs/01_CHANGELOG.md:543`
- `2026-03-11 - v0.2.4` -> `docs/01_CHANGELOG.md:551`
- `2026-03-11 - v0.2.5` -> `docs/01_CHANGELOG.md:563`
- `2026-03-11 - v0.2.6` -> `docs/01_CHANGELOG.md:576`
- `2026-03-11 - v0.2.7` -> `docs/01_CHANGELOG.md:583`
- `2026-03-11 - v0.2.8` -> `docs/01_CHANGELOG.md:596`
- `2026-03-11 - v0.2.9` -> `docs/01_CHANGELOG.md:613`
- `2026-03-11 - v0.2.10` -> `docs/01_CHANGELOG.md:629`
- `2026-03-11 - v0.2.11` -> `docs/01_CHANGELOG.md:644`
- `2026-03-11 - v0.2.12` -> `docs/01_CHANGELOG.md:659`
- `2026-03-11 - v0.2.13` -> `docs/01_CHANGELOG.md:675`
- `2026-03-11 - v0.2.14` -> `docs/01_CHANGELOG.md:684`
- `2026-03-11 - v0.2.15` -> `docs/01_CHANGELOG.md:699`
- `2026-03-11 - v0.2.16` -> `docs/01_CHANGELOG.md:711`
- `2026-03-11 - v0.2.17` -> `docs/01_CHANGELOG.md:728`
- `2026-03-11 - v0.2.18` -> `docs/01_CHANGELOG.md:750`
- `2026-03-11 - v0.2.19` -> `docs/01_CHANGELOG.md:765`
- `2026-03-11 - v0.2.20` -> `docs/01_CHANGELOG.md:783`
- `2026-03-11 - v0.2.21` -> `docs/01_CHANGELOG.md:798`
- `2026-03-11 - v0.2.22` -> `docs/01_CHANGELOG.md:808`
- `2026-03-11 - v0.2.23` -> `docs/01_CHANGELOG.md:820`
- `2026-03-11 - v0.2.24` -> `docs/01_CHANGELOG.md:831`

## Reproduktions-Baselines (Rekonstruierbarkeit)
Jede Projektversion ist durch die Kombination aus Quellcode, Seed und Action-Tape deterministisch rekonstruierbar.

### Kanonischer Testlauf (`runFlow`)
- **Script:** `scripts/tests/drift-signature.mjs`
- **Seed:** `"seed-drift-a"`
- **Umfang:** 120 Ticks (Transit, Decision, Combat, Intervention)

| Version | Signatur (Baseline) | Status |
| :--- | :--- | :--- |
| v0.1.28 | `612d0a7a` | Historisch (Legacy) |
| v0.1.29 | `8c49d92d` | Historisch (UI Refactor) |
| v0.1.30 | `8c49d92d` | Historisch (Mobile Polish) |
| v0.1.31 | `8c49d92d` | Historisch (Canvas FX) |
| v0.2.24 | `2e5655e6` | Aktuell (P3 Bereinigt) |

### Beweisfuehrung fuer Vollstaendigkeit
- Anzahl Versionseintraege im Changelog: `59` (v0.1.0 bis v0.2.24 inklusive `v0.1.11a`).
- Alle Versionseintraege sind ueber den obigen Index direkt adressierbar.
- Die aktive Plan-/Risikosicht bleibt in `docs/03_TODO_MASTERPLAN.md` und muss pro Iteration mit dem Changelog synchronisiert werden.

### Verifizierungsroutine fuer künftige Iterationen
1. Neuen Changelog-Eintrag anhaengen (`docs/01_CHANGELOG.md`).
2. Betroffene TODO-Punkte synchronisieren (`docs/03_TODO_MASTERPLAN.md`).
3. Marker aus `npm test` festhalten.
4. Versionsindex in dieser Datei ergaenzen (neue Version + Changelog-Zeile).
