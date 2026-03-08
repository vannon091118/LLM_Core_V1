export function applyPatches(baseState, patches) {
  let next = baseState;
  for (const p of patches) {
    next = _applyOne(next, p);
  }
  return next;
}

export function assertPatchesAllowed(patches, allowedPrefixes) {
  for (const p of patches) {
    const path = p.path;
    if (!allowedPrefixes.some(pref => path === pref || path.startsWith(pref.endsWith("/") ? pref : pref + "/"))) {
      throw new Error(`Patch path not allowed: ${path}`);
    }
  }
}

function _applyOne(state, p) {
  const op = p.op;
  const path = p.path;
  const parts = path.split("/").slice(1).map(unescapeJsonPointer);
  if (parts.length === 0) return state;

  const leafKey = parts[parts.length - 1];

  // Immutable path clone: keep sibling keys intact on deep writes.
  let out = cloneContainer(state);
  let srcCur = state;
  let outCur = out;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    const srcNext = srcCur?.[k];
    const cloned = cloneContainer(srcNext);
    outCur[k] = cloned;
    srcCur = srcNext;
    outCur = cloned;
  }

  const parent = outCur;
  const prevVal = srcCur?.[leafKey];

  if (op === "set") {
    parent[leafKey] = p.value;
  } else if (op === "inc") {
    const amt = typeof p.amount === "number" ? p.amount : 1;
    const base = (typeof prevVal === "number" && Number.isFinite(prevVal)) ? prevVal : 0;
    parent[leafKey] = base + amt;
  } else if (op === "push") {
    const arr = Array.isArray(prevVal) ? prevVal.slice() : [];
    arr.push(p.value);
    parent[leafKey] = arr;
  } else if (op === "del") {
    if (Array.isArray(parent)) parent.splice(Number(leafKey), 1);
    else delete parent[leafKey];
  } else {
    throw new Error(`Unknown patch op: ${op}`);
  }
  return out;
}

function cloneContainer(v) {
  if (Array.isArray(v)) return v.slice();
  if (v && v.buffer instanceof ArrayBuffer && v.byteLength !== undefined) {
    return new v.constructor(v);
  }
  if (v && typeof v === "object") return { ...v };
  // if path walks through missing, create object
  return {};
}

function unescapeJsonPointer(s) {
  return s.replace(/~1/g, "/").replace(/~0/g, "~");
}
