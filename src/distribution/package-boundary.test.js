import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const execFileAsync = promisify(execFile);

test("public experimental package contains the CLI closure without library entry points", async () => {
  const manifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  const lock = JSON.parse(await readFile(path.join(root, "package-lock.json"), "utf8"));
  assert.equal(manifest.private, false);
  assert.equal(manifest.version, "0.1.0");
  assert.equal("exports" in manifest, false);
  assert.equal("main" in manifest, false);
  assert.equal("module" in manifest, false);
  assert.equal(manifest.license, "Apache-2.0");
  assert.deepEqual(manifest.publishConfig, { access: "public", tag: "next" });
  assert.deepEqual(manifest.engines, { node: ">=22.0.0" });
  assert.equal(manifest.packageManager, "npm@11.6.1");
  assert.deepEqual(manifest.bin, { lumen: "./bin/lumen.js" });
  assert.deepEqual(Object.keys(manifest.dependencies), ["ajv"]);
  for (const lifecycle of ["preinstall", "install", "postinstall", "prepare"]) {
    assert.equal(Object.hasOwn(manifest.scripts, lifecycle), false);
  }
  for (const [location, value] of Object.entries(lock.packages)) {
    if (location && !value.dev) assert.notEqual(value.hasInstallScript, true);
  }
  assert.deepEqual(lock.packages[""], {
    name: manifest.name,
    version: manifest.version,
    license: manifest.license,
    dependencies: manifest.dependencies,
    bin: { lumen: "bin/lumen.js" },
    devDependencies: manifest.devDependencies,
    engines: manifest.engines
  });

  const visited = new Set();
  await visitLocalImports("bin/lumen.js", visited);
  assert.ok(visited.has("src/project/schemas.js"));
  const runtimeAssets = [
    ["src/creator/playtest-browser.js", "./playtest-browser.js"],
    ["src/creator/playtest-simulation.js", "./playtest-simulation.js"],
    ["src/modules/resolve-context.js", "../modules/resolve-context.js"]
  ];
  const exporter = await readFile(path.join(root, "src/creator/export-project.js"), "utf8");
  for (const [, relative] of runtimeAssets) assert.ok(exporter.includes(`new URL("${relative}"`));
  assert.deepEqual(
    [...manifest.files].sort(),
    [
      ...new Set([...visited, ...runtimeAssets.map(([asset]) => asset), "THIRD_PARTY_NOTICES.md"])
    ].sort()
  );
});

test("npm dry-run inventory is the exact public experimental candidate boundary", async () => {
  const cache = await mkdtemp(path.join(os.tmpdir(), "lumen-pack-cache-"));
  try {
    const { stdout } = await execFileAsync(
      "npm",
      ["pack", "--dry-run", "--json", "--cache", cache],
      {
        cwd: root,
        env: { ...process.env, npm_config_update_notifier: "false" }
      }
    );
    const [candidate] = JSON.parse(stdout);
    const paths = candidate.files.map((entry) => entry.path).sort();
    assert.equal(candidate.entryCount, paths.length);
    assert.equal(candidate.files.find((entry) => entry.path === "bin/lumen.js").mode, 0o755);
    assert.ok(
      candidate.files
        .filter((entry) => entry.path !== "bin/lumen.js")
        .every((entry) => entry.mode === 0o644)
    );
    assert.deepEqual(candidate.bundled, []);
    assert.deepEqual(paths, [
      "LICENSE",
      "README.md",
      "THIRD_PARTY_NOTICES.md",
      "bin/lumen.js",
      "package.json",
      "src/creator/backup-store.js",
      "src/creator/cli.js",
      "src/creator/export-project.js",
      "src/creator/focus-project.js",
      "src/creator/inspect-project.js",
      "src/creator/playtest-browser.js",
      "src/creator/playtest-simulation.js",
      "src/creator/rename-project.js",
      "src/creator/restore-project.js",
      "src/creator/scaffold-project.js",
      "src/creator/schemas.js",
      "src/creator/validate-project.js",
      "src/creator/verify-export.js",
      "src/creator/write-lock.js",
      "src/modules/resolve-context.js",
      "src/project/schemas.js"
    ]);
  } finally {
    await rm(cache, { recursive: true, force: true });
  }
});

test("portable CI resolves only the locked local toolchain and pinned actions", async () => {
  const workflow = await readFile(path.join(root, ".github/workflows/ci.yml"), "utf8");
  assert.match(workflow, /permissions:\n {2}contents: read/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /runs-on: ubuntu-24\.04/);
  assert.equal(workflow.includes("ubuntu-latest"), false);
  assert.match(workflow, /npm ci --ignore-scripts/);
  assert.match(workflow, /node-version: 22/);
  assert.match(workflow, /corepack enable npm/);
  assert.match(workflow, /npx --no-install playwright install/);
  assert.match(workflow, /npm run ci/);
  const actions = [...workflow.matchAll(/uses:\s+([^\s#]+)/g)].map((match) => match[1]);
  assert.deepEqual(actions, [
    "actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd",
    "actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e",
    "actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a"
  ]);
  for (const action of actions) assert.match(action, /^[^@]+@[0-9a-f]{40}$/);
});

async function visitLocalImports(relative, visited) {
  if (visited.has(relative)) return;
  visited.add(relative);
  const source = await readFile(path.join(root, relative), "utf8");
  const directory = path.posix.dirname(relative);
  for (const match of source.matchAll(
    /(?:from\s+|import\s*|import\s*\(\s*)["'](\.{1,2}\/[^"']+)["']/g
  )) {
    const dependency = path.posix.normalize(path.posix.join(directory, match[1]));
    await visitLocalImports(dependency, visited);
  }
}
