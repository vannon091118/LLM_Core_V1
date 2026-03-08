# LLM_Core_V1

> Self-enforcing contracts for LLM-assisted development.  
> Built in 6 days. On a Samsung S10. By someone who plays too much WoW.

---

## Was ist das?

Ein Kernel der LLMs zwingt, deinen Code zu lesen bevor sie ihn anfassen.

Kein Framework das du 3 Monate studieren musst. Kein Vertrauen in "die KI macht's schon." Stattdessen: mechanische Enforcement. Wer nicht spurt, kriegt einen Error. Jedes Mal. Ohne Ausnahme.

---

## Das Problem

LLMs verlieren nach wenigen Sessions den Kontext. Normal. Bekannt. Unbefriedigend.

**Lösung (alle anderen):** Mehr Kontext kaufen. Bessere Prompts schreiben. Hoffen.  
**Lösung (dieser Kernel):** Der Code schmiert sich selbst ab. Lautlos. Mechanisch.

---

## Wie es funktioniert

Drei Gates. Keine Umgehung.

**1. Write-Gate**  
Kein direkter State-Write möglich. Nur über `store.dispatch()`. Punkt.

**2. Mutation Matrix**  
Jede Action hat eine Whitelist erlaubter Schreibpfade. Wer außerhalb schreibt, kriegt:  
`Error: Patch path not allowed: /dein/pfad`

**3. Sanitizer**  
Nach jedem Dispatch. Schema-konform. Undeclared fields? Weg. Lautlos. Dokumentiert.

---

## Schnellstart

```js
import { createStore } from './kernel/store.js';

const manifest = {
  SCHEMA_VERSION: 1,
  stateSchema: {
    type: "object",
    shape: {
      meta: { type: "object", shape: { seed: { type: "string", default: "my-seed" } } },
      counter: { type: "number", default: 0 }
    }
  },
  actionSchema: {
    INCREMENT: { type: "object", shape: {} }
  },
  mutationMatrix: {
    INCREMENT: ["/counter"]
  }
};

const project = {
  reducer: (state, action) => {
    if (action.type === "INCREMENT") {
      return [{ op: "set", path: "/counter", value: state.counter + 1 }];
    }
    return [];
  }
};

const store = createStore(manifest, project);
store.dispatch({ type: "INCREMENT" });
console.log(store.getState().counter); // 1
```

---

## Kernel Files

| File | Funktion |
|------|----------|
| `store.js` | Einziger Write-Entry. Drei Gates. Kein Bypass. |
| `patches.js` | Patch-Engine + Mutation Matrix Enforcement |
| `schema.js` | Auto-Sanitizer. Löscht was nicht drin sein sollte. |
| `rng.js` | Deterministischer RNG. Kein `Math.random()`. Nie. |
| `hash32.js` | FNV-1a Hashing für State-Signaturen |
| `stableStringify.js` | Deterministisches JSON für Reproduzierbarkeit |
| `persistence.js` | Platform-agnostischer Storage-Driver |
| `LLM_ENTRY.md` | Der Vertrag. LLMs lesen das zuerst. |

---

## Verifiziert gegen

- Prototype Pollution (`/__proto__/polluted`) → **BLOCKIERT**
- Path Traversal (`/data/../meta/seed`) → **BLOCKIERT**
- Logic Injection (Getter als Value) → **NEUTRALISIERT**
- Fuzzing (NaN, Infinity, null, {}) → **6/6 ÜBERLEBT**
- 8 parallele Worker-Threads → **KEIN GLOBAL LEAK**
- Cross-LLM: ChatGPT, Claude, Gemini → **REPRODUZIERBAR**

---

## Warum AGPL-3.0?

Weil MIT bedeutet: Amazon baut drauf. Du siehst nix. Legal. Danke, tschüss.

AGPL bedeutet: Wer's kommerziell nutzen will, muss zu mir. Nicht umgekehrt.

---

## Demo / Stress-Test

→ [LLM_Safe_BioLab_Sim](https://github.com/vannon091118/LLM_Safe_BioLab_Sim)

Eine vollständige Biosphären-Simulation (GoL × Darwin × Licht) auf diesem Kernel.  
1472 Zeilen. 34 Versionen. 6 Tage. Gleicher Kern. Kein Zusammenbruch.

---

## License

**AGPL-3.0** — Open source für alle. Kommerziell nur mit Absprache.

---

*Gebaut von einem WoW-Spieler der keine 20€ für ChatGPT Pro zahlen wollte.*  
*Hat trotzdem funktioniert.*
