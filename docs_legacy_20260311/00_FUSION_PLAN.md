# SoD Fusion Plan (2026-03-11)

## Ziel
Kombination der staerksten Teile aus allen Download-Projekten in eine einheitliche, LLM_ENTRY-konforme Arbeitsbasis.

## Quellprojekte
1. SoD
2. LLM_KERNEL_UNIVERSAL_AUDITED_2026-03-08
3. LLM_KERNEL_UNIVERSAL_CORE_2026-03-08
4. LLM_KERNEL_UNIVERSAL_CORE_FINAL_2026-03-08
5. LifexLightLab_v10_LLM_SECURED_2026-03-08
6. LifexLightLab_root_reconstruct_2026-03-08

## Kombinationsstrategie
1. Basis: SoD (aktuellster Gameplay/UI-Stand, Manifest + Docs + hardened Kernel)
2. Kernel-Vergleich: Audited/Core/Core_Final gegen SoD Kernel diffen und nur sicherheitsrelevante Verbesserungen uebernehmen
3. Test-Merge: Invariant/Smoke/Stability/Red-Team-Skripte in ein gemeinsames Testpaket ueberfuehren
4. Render/Motion: Lifex-Atmosphaerik selektiv als optionale visuelle Layer uebernehmen (ohne Kernlogik anzufassen)
5. Abschluss: Gate-Check + Drift-Check + Sync

## Phase Plan
- Phase A: Core Matrix
  - Hash-Vergleich aller Kernel-Dateien
  - Delta-Liste mit Risiko-Klasse (high/medium/low)
- Phase B: Testvereinheitlichung
  - scripts/tests vereinheitlichen
  - Standardlauf: smoke -> invariants -> stability -> drift
- Phase C: UI/Renderer Harmonisierung
  - SoD Renderer bleibt führend
  - Lifex-Effekte nur als optionale FX-Layer
- Phase D: Release Snapshot
  - CORE_COPY aktualisieren
  - SYNC_STATUS und CORE_HASH ausgeben

## Hard Gates
- Keine Writes ausserhalb Patch-Gate
- Keine nicht-deterministische Sim-Logik
- Manifest-Kontrakte vor jeder neuen Action
- Jede Integration endet mit drift-signature check
