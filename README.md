# LLM_Core_V1 (Kernel Core)

Ein deterministisches, contract-basiertes Kernel-Framework zur Erzwingung von Datenintegrität und Sicherheits-Invarianten in LLM-gesteuerten Applikationen.

## 🛡️ Kern-Philosophie
Dieser Kernel wurde entwickelt, um die Ausführung von Code (insbesondere durch LLMs generiert) in einer kontrollierten Umgebung zu sichern. Er basiert auf einem **"Strict Contract Enforcement"** Modell:
- **Keine direkten Mutationen:** Zustandsänderungen sind nur über deterministische Patches möglich.
- **Write-Gate Validation:** Die `mutationMatrix` definiert explizit, welche Action welche Pfade im State beschreiben darf.
- **Recursive Sanitizing:** Jede Änderung wird gegen ein striktes `stateSchema` validiert, um Prototype-Pollution und Daten-Drift zu verhindern.

## 🚀 Features
- **Centralized Store:** Einziger Einstiegspunkt für alle Zustandsänderungen.
- **Path-Level Security:** Validierung von Patch-Operationen auf Pfad-Ebene.
- **Deterministischer RNG:** Seed-basierte Zufallsströme für reproduzierbare Simulationen.
- **JSON-Serialisierbarkeit:** Erzwingt einen flachen, serialisierbaren State ohne versteckte Logik (keine Klassen/Instanzen im State).

## 🏗️ Implementierungen
- [LLM_Safe_BioLab_Sim](https://github.com/vannon091118/LLM_Safe_BioLab_Sim) - Die Referenz-Simulation und Beispiel-Implementierung.

## 📄 Lizenz
Dieses Projekt ist unter der **GNU Affero General Public License v3 (AGPL-3.0)** lizenziert. Dies bedeutet, dass jede Software, die diesen Kernel nutzt und über ein Netzwerk interagiert, ebenfalls unter der AGPL lizenziert werden muss. Siehe [LICENSE](./LICENSE) für den vollständigen Text.

---
*Hinweis: Dieser Kernel enthält eine versteckte `.LLM_ENTRY.md` Steuerungsdatei für LLM-Agenten.*
