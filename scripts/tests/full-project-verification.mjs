import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const SRC_DIR = path.join(ROOT, "src");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function walkJs(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkJs(abs));
      continue;
    }
    if (entry.isFile() && abs.endsWith(".js")) out.push(abs);
  }
  return out;
}

function toPosixRel(abs) {
  return path.relative(ROOT, abs).split(path.sep).join("/");
}

function syntaxCheck(absFile) {
  const run = spawnSync("node", ["--check", absFile], { encoding: "utf8" });
  if (run.status !== 0) {
    throw new Error(`Syntax check failed: ${toPosixRel(absFile)}\n${run.stderr || run.stdout || ""}`);
  }
}

function parseRelativeImports(sourceText) {
  const specs = [];
  const patterns = [
    /import\s+[^"']*?from\s*["']([^"']+)["']/g,
    /import\s*["']([^"']+)["']/g,
    /export\s+[^"']*?from\s*["']([^"']+)["']/g
  ];
  for (const re of patterns) {
    for (const m of sourceText.matchAll(re)) {
      const spec = String(m[1] || "").trim();
      if (spec.startsWith(".")) specs.push(spec);
    }
  }
  return specs;
}

function resolveImport(fromAbs, spec) {
  const base = path.resolve(path.dirname(fromAbs), spec);
  const candidates = [base, `${base}.js`, path.join(base, "index.js")];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return path.resolve(c);
  }
  return null;
}

function buildReachable(entryAbsList) {
  const reachable = new Set();
  const queue = [...entryAbsList];
  while (queue.length > 0) {
    const cur = path.resolve(queue.shift());
    if (reachable.has(cur)) continue;
    if (!fs.existsSync(cur)) continue;
    reachable.add(cur);
    const text = fs.readFileSync(cur, "utf8");
    const imports = parseRelativeImports(text);
    for (const spec of imports) {
      const resolved = resolveImport(cur, spec);
      if (resolved && resolved.startsWith(SRC_DIR)) queue.push(resolved);
    }
  }
  return reachable;
}

function hasAny(text, needles) {
  for (const needle of needles) {
    if (text.includes(needle)) return needle;
  }
  return "";
}

const srcFiles = walkJs(SRC_DIR).map((p) => path.resolve(p)).sort();
assert(srcFiles.length > 0, "No source files found under src/");

for (const f of srcFiles) syntaxCheck(f);

const requiredEntryFiles = [
  "src/kernel/store.js",
  "src/kernel/patches.js",
  "src/project/unified.manifest.js",
  "src/project/project.manifest.js",
  "src/kernel/schema.js",
  "src/kernel/rng.js",
  "src/project/project.logic.js",
  "src/project/unified.adapters.js",
  "src/project/release.profiles.js",
  "src/project/renderer.js",
  "src/project/ui.js",
  "src/main.js"
].map((rel) => path.join(ROOT, rel));

for (const req of requiredEntryFiles) {
  assert(fs.existsSync(req), `Required LLM_ENTRY file missing: ${toPosixRel(req)}`);
}

const reachabilityEntries = [
  path.join(ROOT, "src/main.js"),
  path.join(ROOT, "src/project/project.logic.js"),
  path.join(ROOT, "src/project/project.manifest.js"),
  path.join(ROOT, "src/kernel/store.js")
];

const standaloneAllowlist = {
  "src/kernel/physics.js": "Standalone constants module; intentionally not wired into runtime yet."
};

const reachable = buildReachable(reachabilityEntries);
const unreachable = srcFiles
  .map(toPosixRel)
  .filter((rel) => !reachable.has(path.join(ROOT, rel)) && !standaloneAllowlist[rel]);

assert(
  unreachable.length === 0,
  `Unreachable source files without allowlist entry:\n- ${unreachable.join("\n- ")}`
);

const forbiddenInProjectRuntime = ["Math.random(", "Date.now(", "new Date(", "crypto.getRandomValues(", "crypto.randomUUID("];
const projectRuntimeFiles = srcFiles.filter((abs) => {
  const rel = toPosixRel(abs);
  return rel.startsWith("src/project/") || rel === "src/main.js";
});
for (const abs of projectRuntimeFiles) {
  const text = fs.readFileSync(abs, "utf8");
  const badToken = hasAny(text, forbiddenInProjectRuntime);
  assert(!badToken, `Determinism violation in ${toPosixRel(abs)}: found '${badToken}'`);
}

const unifiedManifestModule = await import(pathToFileURL(path.join(ROOT, "src/project/unified.manifest.js")).href);
const manifest = unifiedManifestModule.manifest;
assert(manifest && typeof manifest === "object", "unified manifest export missing");
assert(manifest.actionSchema && manifest.mutationMatrix, "manifest contract missing actionSchema/mutationMatrix");

const actionKeys = Object.keys(manifest.actionSchema);
const matrixKeys = Object.keys(manifest.mutationMatrix);
for (const a of actionKeys) {
  assert(Array.isArray(manifest.mutationMatrix[a]), `mutationMatrix missing action key: ${a}`);
}
for (const m of matrixKeys) {
  assert(actionKeys.includes(m), `mutationMatrix contains unknown action key: ${m}`);
}

const matrixErrors = [];
for (const [action, paths] of Object.entries(manifest.mutationMatrix)) {
  if (!Array.isArray(paths)) {
    matrixErrors.push(`${action}: mutationMatrix value is not an array`);
    continue;
  }
  for (const p of paths) {
    if (typeof p !== "string" || !p.startsWith("/")) {
      matrixErrors.push(`${action}: invalid path '${String(p)}'`);
      continue;
    }
    const top = p.split("/").filter(Boolean)[0];
    if (!top) {
      matrixErrors.push(`${action}: invalid root path '${p}'`);
      continue;
    }
    const shape = manifest.stateSchema?.shape;
    if (!shape || !(top in shape)) {
      matrixErrors.push(`${action}: top-level path '${p}' not found in stateSchema`);
    }
  }
}
assert(matrixErrors.length === 0, `mutationMatrix/stateSchema mismatch:\n- ${matrixErrors.join("\n- ")}`);

console.log("FULL_PROJECT_VERIFICATION_OK");
