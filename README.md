# Core: Problem -> Core -> All-in-One -> Ready

## Problem
LLM-Entwicklung ist schnell, aber oft chaotisch:
- Regeln sind unklar
- Änderungen sind schwer nachvollziehbar
- Releases beruhen auf Hoffnung statt Nachweis
- Nach ein paar Sessions entsteht Drift

## Core
Core ist der stabile Unterbau gegen genau dieses Chaos.

Core erzwingt:
- klare Vertraege (Schema, Actions, erlaubte Write-Pfade)
- patch-only Zustandsschreiben
- deterministische Guards
- harte Gates vor Abschluss
- lueckenlose Nachvollziehbarkeit

## All-in-One
Alles Wichtige ist direkt drin:
- `kernel/` -> Engine
- `scripts/` -> Setup, Gates, Release-Checks
- `tests/` -> Integritaet + Determinismus
- `LLM_ENTRY.md` -> Pflichtregeln fuer LLM
- `AGENTS.md` -> Auto-Core-Mode beim Projektscan
- `CHANGELOG.md` + `CHANGE_MATRIX.jsonl` -> Trace

## Ready
Arbeitsmodell:
- Nutzer schreibt nur im Chat
- LLM arbeitet im Core-Mode automatisch
- Pruefen, freigeben, nachvollziehen in einem System

Ergebnis:
- weniger Drift
- weniger Ratespiele
- schnellere Entwicklung mit stabiler Struktur
