import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifestPath = path.join(root, "src/architecture/layers.json");
const matrixPath = path.join(root, "docs/research/executable-capability-matrix.md");
const taxonomyPath = path.join(root, "docs/research/capabilities.md");

test("production imports obey the recorded private layer graph", async () => {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.equal(manifest.version, 1);
  const ownership = new Map();
  for (const [layer, definition] of Object.entries(manifest.layers)) {
    for (const rootPath of definition.roots) ownership.set(rootPath, layer);
  }
  const ignored = new Set(manifest.ignoredProductionFiles);
  const violations = [];
  for (const [layer, definition] of Object.entries(manifest.layers)) {
    for (const rootPath of definition.roots) {
      for (const file of await productionFiles(path.join(root, rootPath))) {
        const relative = portable(path.relative(root, file));
        if (ignored.has(relative)) continue;
        const source = await readFile(file, "utf8");
        for (const specifier of importSpecifiers(source)) {
          if (!specifier.startsWith(".")) continue;
          const target = portable(path.relative(root, path.resolve(path.dirname(file), specifier)));
          const targetLayer = layerFor(target, ownership);
          if (targetLayer && !definition.allow.includes(targetLayer))
            violations.push(`${relative}: ${layer} must not import ${targetLayer} (${specifier})`);
        }
        if (layer === "core") {
          for (const specifier of importSpecifiers(source))
            if (specifier.startsWith("node:"))
              violations.push(`${relative}: core must not import Node built-in ${specifier}`);
        }
      }
    }
  }
  assert.deepEqual(violations, []);
});

test("the private layer graph is acyclic and deterministic systems reject platform leakage", async () => {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const graph = new Map(
    Object.entries(manifest.layers).map(([layer, definition]) => [
      layer,
      definition.allow.filter((dependency) => dependency !== layer)
    ])
  );
  assertAcyclic(graph);

  /** @type {Array<[string, RegExp]>} */
  const forbidden = [
    ["DOM global", /\b(?:document|window|navigator)\s*[.[]/],
    ["ambient fetch", /\bfetch\s*\(/],
    ["ambient storage", /\b(?:localStorage|sessionStorage|indexedDB)\b/],
    ["ambient clock", /\b(?:Date\.now|performance\.now)\s*\(/],
    ["ambient randomness", /\b(?:Math\.random|crypto\.randomUUID)\s*\(/],
    ["mutable global", /\bglobalThis\s*\[[^\]]+\]\s*=|\bglobalThis\.[\w$]+\s*=/]
  ];
  const violations = [];
  for (const layer of ["core", "simulation", "modules"]) {
    for (const rootPath of manifest.layers[layer].roots) {
      for (const file of await productionFiles(path.join(root, rootPath))) {
        const source = await readFile(file, "utf8");
        for (const [name, pattern] of forbidden)
          if (pattern.test(source))
            violations.push(`${portable(path.relative(root, file))}: forbidden ${name}`);
      }
    }
  }
  assert.deepEqual(violations, []);
});

test("the executable matrix owns every capability taxonomy bullet exactly once", async () => {
  const taxonomy = await readFile(taxonomyPath, "utf8");
  const matrix = await readFile(matrixPath, "utf8");
  const capabilities = taxonomy
    .split("## Open classification questions")[0]
    .split("\n")
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim());
  const matrixCapabilities = [...matrix.matchAll(/^\| (CAP-[A-Z]+-\d{2}) \| ([^|]+) \|/gm)].map(
    ([, id, capability]) => ({ id, capability: capability.trim() })
  );
  assert.ok(capabilities.length > 50, "taxonomy extraction must remain meaningful");
  assert.equal(new Set(matrixCapabilities.map(({ id }) => id)).size, matrixCapabilities.length);
  assert.deepEqual(
    matrixCapabilities.map(({ capability }) => capability),
    capabilities
  );
});

test("every mandatory central goal has an executable-matrix assignment", async () => {
  const matrix = await readFile(matrixPath, "utf8");
  const assignments = new Set();
  for (const line of matrix.split("\n").filter((candidate) => candidate.startsWith("| CAP-"))) {
    const goalCell = line.split("|")[7];
    for (const goal of goalCell.matchAll(/\d{1,2}/g)) assignments.add(Number(goal[0]));
  }
  for (let goal = 7; goal <= 20; goal += 1)
    assert.ok(assignments.has(goal), `Goal ${goal} has no capability assignment`);
});

async function productionFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await productionFiles(file)));
    else if (/\.(?:js|ts)$/.test(entry.name) && !entry.name.endsWith(".test.js")) result.push(file);
  }
  return result;
}

function importSpecifiers(source) {
  return [...source.matchAll(/(?:import|export)\s+(?:[^"']+?\s+from\s+)?["']([^"']+)["']/g)].map(
    ([, specifier]) => specifier
  );
}

function layerFor(target, ownership) {
  for (const [rootPath, layer] of ownership)
    if (target === rootPath || target.startsWith(`${rootPath}/`)) return layer;
  return null;
}

function portable(value) {
  return value.split(path.sep).join("/");
}

function assertAcyclic(graph) {
  const visiting = new Set();
  const visited = new Set();
  const visit = (layer, pathToLayer) => {
    if (visiting.has(layer))
      throw new Error(`Layer cycle: ${[...pathToLayer, layer].join(" -> ")}`);
    if (visited.has(layer)) return;
    visiting.add(layer);
    for (const dependency of graph.get(layer) ?? []) visit(dependency, [...pathToLayer, layer]);
    visiting.delete(layer);
    visited.add(layer);
  };
  for (const layer of graph.keys()) visit(layer, []);
}
