# Changelog

## 1.4.0 - 2026-03-12

- Auto-Core-Mode nach Clone/Merge ueber Git-Hooks:
  - `.githooks/post-checkout`
  - `.githooks/post-merge`
  - `scripts/hook-core-mode.mjs`
- Hook-Aktivierung fuer bestehende Klone:
  - `scripts/enable-git-hooks.mjs`
  - `npm run hooks:enable`
- Security-Lockdown erweitert:
  - schuetzt jetzt auch Hook-Dateien und Hook-Skripte
- Doku aktualisiert auf Clone-First-Workflow mit:
  - `git clone --config core.hooksPath=.githooks ...`

## 1.3.0 - 2026-03-12

- Changelog-Pflicht jetzt hart verankert:
  - append-only Guard (`scripts/changelog-append-guard.mjs`)
- Neue Change-Matrix-Pflicht:
  - `CHANGE_MATRIX.jsonl` als nachvollziehbare Aenderungsmatrix
  - Script `scripts/change-matrix.mjs` mit `init|record|check`
- Projektpruefung erweitert:
  - `trace:check` (changelog + matrix) ist Pflicht in `test` und `check:project`
- Core-Mode initialisiert/validiert jetzt:
  - Changelog-Guard
  - Change-Matrix
- Security-Lockdown erweitert um Schutz der Change-Trace-Skripte und Artefakte.

## 1.2.0 - 2026-03-12

- LLM Auto-Setup fuer Core-Mode:
  - `scripts/llm-autosetup.mjs`
  - Marker: `CORE_MODE_READY`
- Lokaler Security-Lockdown:
  - `scripts/security-lockdown.mjs`
  - `scripts/security-unlock.mjs` (nur mit Sicherheitsphrase)
- Deterministischer Core-Kaefig erweitert:
  - `scripts/core-integrity-cage.mjs` blockt Re-Init im Lockdown
- Hard-Gate prueft jetzt zusaetzlich:
  - aktiven Core-Kaefig
  - aktiven Security-Lockdown
- Neue Scripts:
  - `core:mode`
  - `secure:lock`
  - `secure:unlock`
  - `cage:init`
  - `cage:check`

## 1.1.0 - 2026-03-11

- Core bleibt projektunabhaengig, aber Projektpruefung wurde standardisiert.
- Neues Hard-Gate-Setup fuer LLM-Workflows:
  - `ack:llm-entry`
  - `guard:llm`
  - `check:llm-entry`
- Neuer Determinismus-Test:
  - `tests/kernel_determinism_sources.mjs`
- Neue wiederverwendbare Replay-Harness:
  - `tests/utils/scenario-harness.mjs`
- Neuer standardisierter Verifikationsreport:
  - `scripts/system-proof.mjs`
  - Report-Ausgabe in `reports/core-system-proof.json`
- Neues Release-Gate:
  - `scripts/release-gate.mjs`
  - Script: `npm run gate:release`
- Neue Projekt-Template-Struktur:
  - `templates/project-gate/*`
