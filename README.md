# LLM_Core_V1 (Standalone Kernel) - v1.4.0

**The Zero-Trust Deterministic State Machine for LLM-Driven Projects.**

LLM_Core_V1 is a high-security, deterministic kernel designed to provide a "safe cage" for logic executed by AI agents or complex simulations. It enforces strict contracts, prevents state corruption, and guarantees 100% reproducibility.

## Key Features (v1.4.0 "Next-Gen")

- **Zero-Trust Determinism Guard:** Actively blocks `Math.random`, `Date.now`, `performance.now`, and `crypto` during state transitions. Logic must use the provided `rng` streams.
- **Deep Immutability:** Automatically freezes state snapshots using `deepFreeze` (with TypedArray support) to prevent side-channel mutations.
- **Root-Replace Protection:** Physically blocks overwriting of top-level state containers, enforcing granular, schema-compliant patching.
- **Atomic Persistence Commit:** Ensures that state is only updated in memory after a successful storage driver write, preventing "split-brain" scenarios.
- **Scoped RNG Isolation:** Every action gets a unique, deterministic random seed based on its revision count and action type.
- **Red-Team Hardened:** Built-in protection against `__proto__` pollution and malformed patch paths.

## Quick Start

```javascript
import { createStore } from "./kernel/store.js";

const manifest = {
  SCHEMA_VERSION: 1,
  stateSchema: { type: "object", shape: { count: { type: "number", default: 0 } } },
  actionSchema: { INC: { type: "object", shape: {} } },
  mutationMatrix: { INC: ["/count"] }
};

const project = {
  reducer: (state, action) => action.type === "INC" 
    ? [{ op: "set", path: "/count", value: state.count + 1 }] 
    : []
};

const store = createStore(manifest, project);
store.dispatch({ type: "INC", payload: {} });
console.log(store.getState().count); // 1
```

## Security & Compliance

This repository enforces an `LLM_ENTRY` gate. Any AI agent working on this core must adhere to the protocols defined in `LLM_ENTRY.md`.

## License
AGPL-3.0 - (c) 2026 vannon091118
