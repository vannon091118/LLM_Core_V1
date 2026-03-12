import { applyPatches, assertPatchesAllowed } from "../../src/kernel/patches.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function assertThrows(fn, label, match = null) {
  let err = null;
  try {
    fn();
  } catch (e) {
    err = e;
  }
  assert(!!err, `${label}: expected throw`);
  if (match) assert(match.test(String(err?.message || err)), `${label}: unexpected error '${err?.message || err}'`);
}

const base = {
  game: {
    hp: 10,
    resources: { supplies: 5 },
    log: []
  }
};

// 1) __proto__/constructor/prototype direct segments must throw.
for (const p of ["/__proto__/x", "/game/constructor/x", "/game/prototype/x"]) {
  assertThrows(
    () => assertPatchesAllowed([{ op: "set", path: p, value: 1 }], ["/game"]),
    `unsafe segment ${p}`,
    /Unsafe patch path segment/i
  );
}

// 2) Prefix escape attempts must throw (path not under allowed prefix).
for (const p of ["/gameX/hp", "/game_resources/supplies", "/game2/resources/supplies"]) {
  assertThrows(
    () => assertPatchesAllowed([{ op: "set", path: p, value: 1 }], ["/game"]),
    `prefix escape ${p}`,
    /Patch path not allowed/i
  );
}

// 3) Root container replace remains blocked.
assertThrows(
  () => assertPatchesAllowed([{ op: "set", path: "/game", value: { hp: 999 } }], ["/game"]),
  "root replace",
  /Root container replace blocked/i
);

// 4) Illegal path shapes must throw (traversal-like / malformed).
for (const p of ["/game//hp", "/", "game/hp"]) {
  assertThrows(
    () => assertPatchesAllowed([{ op: "set", path: p, value: 1 }], ["/game"]),
    `malformed ${p}`,
    /Unsafe patch path/i
  );
}

// 5) Traversal-like segment '..' may pass parser, but must not alter protected state keys.
// We require that it cannot mutate canonical target '/game/hp'.
{
  const patches = [{ op: "set", path: "/game/../hp", value: 0 }];
  assertPatchesAllowed(patches, ["/game"]);
  const next = applyPatches(base, patches);
  assert(next.game.hp === 10, "traversal-like segment must not mutate /game/hp");
}

// 6) JSON pointer encoded proto segment must remain non-polluting.
{
  const patches = [{ op: "set", path: "/game/~1__proto__/polluted", value: 1 }];
  assertPatchesAllowed(patches, ["/game"]);
  const next = applyPatches(base, patches);
  assert(next.game.hp === 10, "encoded proto path must not mutate canonical keys");
  assert(Object.prototype.polluted === undefined, "prototype pollution detected");
}

console.log("REDTEAM_PATH_HARDENING_OK");
