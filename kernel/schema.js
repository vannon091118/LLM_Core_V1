export function sanitizeBySchema(value, schema) {
  return _sanitize(value, schema);
}

const MAX_SAFE_LENGTH = 50 * 1024 * 1024; // 50M items limit

function _sanitize(v, s) {
  if (!s) return v;
  switch (s.type) {
    case "string": {
      const out = typeof v === "string" ? v : (s.default ?? "");
      if (typeof s.maxLen === "number") return out.slice(0, s.maxLen);
      return out.slice(0, 1024 * 1024); // Hard cap 1MB for uncapped strings
    }
    case "number": {
      let out = (typeof v === "number" && Number.isFinite(v)) ? v : (s.default ?? 0);
      if (typeof s.min === "number") out = Math.max(s.min, out);
      if (typeof s.max === "number") out = Math.min(s.max, out);
      if (s.int) out = Math.trunc(out);
      return out;
    }
    case "boolean":
      return typeof v === "boolean" ? v : (s.default ?? false);
    case "enum": {
      const allowed = Array.isArray(s.values) ? s.values : [];
      const out = v;
      if (allowed.includes(out)) return out;
      return s.default ?? (allowed[0] ?? null);
    }
    case "array": {
      const isTyped = v && v.buffer instanceof ArrayBuffer && v.byteLength !== undefined;
      const arr = (Array.isArray(v) || isTyped) ? v : (Array.isArray(s.default) ? s.default : []);
      
      // HARDENING: DoS Protection
      if (arr.length > MAX_SAFE_LENGTH) {
        // Return empty or default instead of crashing, or throw controlled error
        // Throwing is safer to signal contract breach
        throw new Error(`Array length exceeds safety limit (${MAX_SAFE_LENGTH})`);
      }

      const itemSchema = s.items;
      
      // HARDENING: Re-allocate TypedArrays to strip hidden properties
      if (isTyped && !itemSchema) {
        return new v.constructor(v);
      }
      
      const maxLen = typeof s.maxLen === "number" ? s.maxLen : Infinity;
      const effectiveLen = Math.min(maxLen, MAX_SAFE_LENGTH);
      
      const out = Array.from(arr.slice(0, effectiveLen)).map(x => _sanitize(x, itemSchema));
      return out;
    }
    case "object": {
      const shape = s.shape;
      const src = (v && typeof v === "object" && !Array.isArray(v)) ? v : (s.default ?? {});
      
      // HARDENING: Block blackbox objects
      if (!shape) return {};

      const out = {};
      for (const key of Object.keys(shape)) {
        out[key] = _sanitize(src[key], shape[key]);
      }
      return out;
    }
    default:
      // HARDENING: Reject unknown types
      return s.default ?? null;
  }
}
