export function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

export function createMemoryDriver(initialDoc = null) {
  let doc = initialDoc;
  return {
    load() { return doc; },
    save(next) { doc = next; }
  };
}

export function runActionSequence(store, actions) {
  for (const action of actions) {
    store.dispatch(action);
  }
}

export function assertReplayParity(a, b, label = "replay") {
  assert(a.signature === b.signature, `${label}: signature mismatch`);
  assert(a.revisionCount === b.revisionCount, `${label}: revision mismatch`);
  assert(a.snapshot === b.snapshot, `${label}: snapshot mismatch`);
}
