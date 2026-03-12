# WEITERARBEITSPLAN

Datum: 2026-03-11
Hauptträger: /root/Substrate

## Nächster Entwicklungspfad

1. Stabilitätsausbau
- Testkette auf Zielzustand erweitern: smoke -> invariants -> stability -> drift -> gate-redteam.
- Fehlende Teststufen als Skripte ergänzen und in `npm test` integrieren.

2. Masterplan-Feature-Vervollständigung
- Encounter-Katalog auf mindestens 12 Kernszenarien finalisieren.
- Trigger vollständig weltzustandsgebunden machen.
- Siegpfade Dominanz, Symbiose, Metamorphose vollständig implementieren und absichern.

3. UI-Rework für neues Spielprofil
- Onboarding-Pfad (`INTRO -> BIND -> PLAY -> END`) schließen.
- Dual-UI (`TACTICAL`/`ORGANIC`) auf gleichen State fixieren.
- Encounter- und Intervention-UI auf klare CTA + Kosten/Nutzen-Transparenz finalisieren.

4. Release- und Versionsdisziplin
- Release-Profile (`alpha`, `beta`, `rc`) mit Feature-Flags anlegen.
- Versioning- und Statusdateien pro Iteration synchron halten.

## Offene technische Lücken
- Vollständige Drift-/Stability-Teststufen fehlen noch als verbindlicher Standardlauf.
- Nicht alle Masterplan-Siegpfade sind vollständig testbar implementiert.
- Einige UX-Polish-Themen sind noch als TODO offen.

## Empfohlene Prioritäten
1. Test-/Gate-Vollständigkeit herstellen.
2. Sieg-/Niederlagenpfade vollständig schließen.
3. Encounter-Qualität und UI-Rework finalisieren.
4. Release-Profile für v1 vorbereiten.

## Definition of Done je nächste Iteration
- Alle neu eingeführten Actions sind im Manifest + MutationMatrix sauber abgedeckt.
- Kein Write außerhalb des Patch-Gates.
- Testkette läuft vollständig grün.
- Determinismus-Repro bleibt stabil.
- Doku (`Status`, `Todo`, `Versioning`) ist synchron aktualisiert.
