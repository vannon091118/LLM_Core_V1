import { sanitizeBySchema } from "../../src/kernel/schema.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// 1) Unknown keys stripped + defaulting by shape
{
  const schema = {
    type: "object",
    shape: {
      hp: { type: "number", int: true, min: 0, max: 99, default: 10 },
      name: { type: "string", maxLen: 5, default: "anon" },
      flags: {
        type: "object",
        shape: {
          active: { type: "boolean", default: false }
        }
      }
    }
  };

  const out = sanitizeBySchema(
    { hp: 12.7, name: "verylong", flags: { active: true, hidden: 1 }, extra: "drop" },
    schema
  );

  assert(Object.keys(out).length === 3, "unknown top-level keys must be stripped");
  assert(out.hp === 12, "number int truncation failed");
  assert(out.name === "veryl", "string maxLen clamp failed");
  assert(out.flags.active === true && !("hidden" in out.flags), "unknown nested keys must be stripped");
}

// 2) Array safety limit must throw (DoS guard)
{
  const schema = { type: "array", items: { type: "number", default: 0 } };
  const fakeHuge = new Array(50 * 1024 * 1024 + 1);
  let failed = false;
  try {
    sanitizeBySchema(fakeHuge, schema);
  } catch {
    failed = true;
  }
  assert(failed, "array safety limit should throw on oversized array-like");
}

// 3) TypedArray conversion + maxLen clamp
{
  const schema = {
    type: "array",
    maxLen: 2,
    items: { type: "number", int: true, default: 0 }
  };
  const src = new Uint8Array([3, 4, 5]);
  const out = sanitizeBySchema(src, schema);
  assert(Array.isArray(out), "typed array should be converted to plain array");
  assert(out.length === 2 && out[0] === 3 && out[1] === 4, "typed array maxLen clamp failed");
}

// 4) Non-serializable/function drops to defaults through shape
{
  const schema = {
    type: "object",
    shape: {
      text: { type: "string", default: "x" },
      count: { type: "number", int: true, default: 1 }
    }
  };
  const out = sanitizeBySchema({ text: () => "bad", count: Number.NaN }, schema);
  assert(out.text === "x", "function should sanitize to string default");
  assert(out.count === 1, "NaN should sanitize to number default");
}

// 5) Unknown schema type should fallback to default/null
{
  const outA = sanitizeBySchema("x", { type: "mystery", default: "ok" });
  const outB = sanitizeBySchema("x", { type: "mystery" });
  assert(outA === "ok", "unknown type should return default");
  assert(outB === null, "unknown type without default should return null");
}

console.log("KERNEL_SCHEMA_TARGET_OK");
