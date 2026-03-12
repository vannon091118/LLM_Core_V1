import { applyPatches, assertPatchesAllowed } from "../../src/kernel/patches.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// 1) Prefix contract + deny foreign paths
{
  const allowed = ["/game/hp", "/game/log", "/game/stats"];
  assertPatchesAllowed(
    [
      { op: "set", path: "/game/hp", value: 7 },
      { op: "push", path: "/game/log", value: "ok" },
      { op: "inc", path: "/game/stats/combatsWon", amount: 1 }
    ],
    allowed
  );
  let failed = false;
  try {
    assertPatchesAllowed([{ op: "set", path: "/app/firstStart", value: false }], allowed);
  } catch {
    failed = true;
  }
  assert(failed, "assertPatchesAllowed must reject non-whitelisted path");
}

// 2) Unsafe path rejection (prototype pollution and malformed path)
{
  const allowed = ["/game"];
  for (const path of ["/game//hp", "/game/__proto__/x", "/game/prototype/x", "/game/constructor/x", "/"]) {
    let failed = false;
    try {
      assertPatchesAllowed([{ op: "set", path, value: 1 }], allowed);
    } catch {
      failed = true;
    }
    assert(failed, `unsafe path must fail: ${path}`);
  }
}

// 3) Root container replace must be blocked; scalar top-level set allowed
{
  let blocked = false;
  try {
    assertPatchesAllowed([{ op: "set", path: "/game", value: { hp: 1 } }], ["/game"]);
  } catch {
    blocked = true;
  }
  assert(blocked, "root object replacement must be blocked");

  assertPatchesAllowed([{ op: "set", path: "/game", value: 1 }], ["/game"]);
}

// 4) applyPatches immutable deep writes + ops behavior
{
  const base = {
    game: {
      hp: 5,
      log: ["a"],
      stats: { combatsWon: 1, combatsLost: 2 },
      nested: { a: { b: 1 }, keep: 9 }
    }
  };

  const next = applyPatches(base, [
    { op: "set", path: "/game/hp", value: 8 },
    { op: "inc", path: "/game/stats/combatsWon", amount: 2 },
    { op: "push", path: "/game/log", value: "b" },
    { op: "set", path: "/game/nested/a/b", value: 4 },
    { op: "del", path: "/game/stats/combatsLost" }
  ]);

  assert(base !== next, "applyPatches must return new root");
  assert(base.game !== next.game, "applyPatches must clone touched containers");
  assert(base.game.nested.keep === 9 && next.game.nested.keep === 9, "sibling keys must stay intact");
  assert(next.game.hp === 8, "set op failed");
  assert(next.game.stats.combatsWon === 3, "inc op failed");
  assert(!("combatsLost" in next.game.stats), "del op failed");
  assert(Array.isArray(next.game.log) && next.game.log.length === 2 && next.game.log[1] === "b", "push op failed");
  assert(base.game.log.length === 1, "base state must stay unchanged");
}

console.log("KERNEL_PATCHES_TARGET_OK");
