import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const logicPath = path.join(ROOT, "src/project/project.logic.js");
const manifestPath = path.join(ROOT, "src/project/unified.manifest.js");
const adaptersPath = path.join(ROOT, "src/project/unified.adapters.js");
const rendererPath = path.join(ROOT, "src/project/renderer.js");
const uiPath = path.join(ROOT, "src/project/ui.js");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const { manifest } = await import(pathToFileURL(manifestPath).href);
const actionKeys = Object.keys(manifest.actionSchema).sort();
const matrixKeys = Object.keys(manifest.mutationMatrix).sort();

assert(actionKeys.length > 0, "actionSchema empty");
assert(matrixKeys.length > 0, "mutationMatrix empty");
assert(actionKeys.join("|") === matrixKeys.join("|"), "actionSchema <-> mutationMatrix key mismatch");

const logicSrc = fs.readFileSync(logicPath, "utf8");
const reducerCases = [...logicSrc.matchAll(/case\s+"([A-Z_]+)"\s*:/g)].map((m) => m[1]);
const reducerSet = new Set(reducerCases);
for (const action of actionKeys) {
  assert(reducerSet.has(action), `reducer missing case for action '${action}'`);
}

const adaptersSrc = fs.readFileSync(adaptersPath, "utf8");
const adapterEntries = [...adaptersSrc.matchAll(/([A-Z_]+)\s*:\s*\{\s*type:\s*"([A-Z_]+)"/g)]
  .map((m) => ({ legacy: m[1], target: m[2] }));
assert(adapterEntries.length > 0, "legacy adapter map entries not found");
for (const entry of adapterEntries) {
  assert(manifest.actionSchema[entry.target], `adapter target action missing in actionSchema: ${entry.legacy} -> ${entry.target}`);
}

const rendererSrc = fs.readFileSync(rendererPath, "utf8");
assert(!/store\.dispatch\s*\(/.test(rendererSrc), "renderer must not dispatch");
assert(!/\bstate\.[\w.[\]'"]+\s*=(?!=)/.test(rendererSrc), "renderer must not assign state.*");

const uiSrc = fs.readFileSync(uiPath, "utf8");
assert(!/\bstate\.[\w.[\]'"]+\s*=(?!=)/.test(uiSrc), "ui must not assign state.*");
assert(/store\.dispatch\s*\(/.test(uiSrc), "ui should dispatch via store, not mutate state");

console.log("CROSS_MODULE_CONTRACT_OK");
