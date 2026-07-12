import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("third-party notice covers exact direct production dependencies", async () => {
  const manifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  const lock = JSON.parse(await readFile(path.join(root, "package-lock.json"), "utf8"));
  const notice = await readFile(path.join(root, "THIRD_PARTY_NOTICES.md"), "utf8");
  const audit = await readFile(
    path.join(root, "docs/phase-5f-dependency-provenance-completion-audit.md"),
    "utf8"
  );
  assert.deepEqual(Object.entries(manifest.dependencies), [["ajv", "8.20.0"]]);
  for (const [name, version] of Object.entries(manifest.dependencies)) {
    const installed = lock.packages[`node_modules/${name}`];
    const metadata = JSON.parse(
      await readFile(path.join(root, "node_modules", name, "package.json"), "utf8")
    );
    assert.equal(installed.version, version);
    assert.equal(metadata.version, version);
    assert.equal(metadata.license, installed.license);
    assert.match(
      notice,
      new RegExp(`\\| Ajv \\| ${escapeRegex(version)} \\| ${installed.license} \\|`)
    );
    assert.equal(metadata.repository, "ajv-validator/ajv");
    assert.match(notice, /https:\/\/github\.com\/ajv-validator\/ajv/);
  }
  assert.match(notice, /not\s+a substitute for those license texts/);
  assert.match(notice, /Apache License 2\.0/);
  assert.match(notice, /candidate remains unpublished/);

  for (const [location, value] of Object.entries(lock.packages)) {
    if (!location) continue;
    assert.match(value.resolved, /^https:\/\/registry\.npmjs\.org\//);
    assert.match(value.integrity, /^sha512-[A-Za-z0-9+/]+={0,2}$/);
    assert.equal(typeof value.license, "string");
    assert.notEqual(value.license.length, 0);
  }

  const production = Object.entries(lock.packages)
    .filter(([name, value]) => name.startsWith("node_modules/") && !value.dev)
    .map(([name, value]) => [name.slice("node_modules/".length), value.version, value.license]);
  assert.deepEqual(production, [
    ["ajv", "8.20.0", "MIT"],
    ["fast-deep-equal", "3.1.3", "MIT"],
    ["fast-uri", "3.1.3", "BSD-3-Clause"],
    ["json-schema-traverse", "1.0.0", "MIT"],
    ["require-from-string", "2.0.2", "MIT"]
  ]);
  for (const [name, version, license] of production) {
    assert.match(
      audit,
      new RegExp(
        `\\| ${escapeRegex(name)} \\| ${escapeRegex(version)} \\| ${escapeRegex(license)} \\|`
      )
    );
  }
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
