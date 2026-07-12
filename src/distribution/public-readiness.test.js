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

test("Apache-2.0 candidate metadata is public while engine modules stay internal", async () => {
  const manifest = await readJson("package.json");
  const license = await readFile(path.join(root, "LICENSE"), "utf8");
  const readiness = await readFile(
    path.join(root, "docs/public-experimental-release-readiness.md"),
    "utf8"
  );
  assert.equal(manifest.name, "lumenjs");
  assert.equal(manifest.version, "0.1.0");
  assert.equal(manifest.private, false);
  assert.equal(manifest.license, "Apache-2.0");
  assert.deepEqual(manifest.publishConfig, { access: "public", tag: "next" });
  assert.deepEqual(manifest.repository, {
    type: "git",
    url: "git+https://github.com/aleolidev/lumenjs.git"
  });
  assert.deepEqual(manifest.bin, { lumen: "./bin/lumen.js" });
  assert.equal(manifest.exports["."].types, "./dist-package/index.d.ts");
  assert.equal(manifest.exports["."].import, "./dist-package/index.js");
  assert.equal("main" in manifest, false);
  assert.match(license, /Apache License\s+Version 2\.0, January 2004/);
  assert.match(readiness, /minimum TypeScript core/);
  assert.match(readiness, /no long-lived compatibility promise/);
  assert.match(readiness, /npm package\s+remains unpublished/);
  assert.match(readiness, /https:\/\/lumenjs\.pages\.dev/);
  const policy = await readFile(path.join(root, "docs/experimental-release-policy.md"), "utf8");
  assert.match(policy, /npm dist-tag `next`/);
  assert.match(policy, /no public engine\s+import, module API/);
  assert.match(policy, /move `next` back to the last verified version/);
});

test("release workflow creates an unpublished candidate without registry authority", async () => {
  const workflow = await readFile(
    path.join(root, ".github/workflows/release-candidate.yml"),
    "utf8"
  );
  assert.match(workflow, /workflow_dispatch/);
  assert.match(workflow, /permissions:\n {2}contents: read/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /npm run check:release/);
  assert.match(workflow, /npm pack --pack-destination release-artifact/);
  assert.equal(workflow.includes("npm publish"), false);
  assert.equal(workflow.includes("id-token: write"), false);
  assert.equal(workflow.includes("NODE_AUTH_TOKEN"), false);
  for (const action of workflow.matchAll(/uses:\s+([^\s#]+)/g)) {
    assert.match(action[1], /^[^@]+@[0-9a-f]{40}$/);
  }
});

test("npm publishing workflow is manual, exact, and contains no stored credential", async () => {
  const workflow = await readFile(path.join(root, ".github/workflows/publish.yml"), "utf8");
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /publish-lumenjs@0\.1\.0/);
  assert.match(workflow, /environment: npm-production/);
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /npm run ci/);
  assert.match(workflow, /npm run check:release/);
  assert.match(workflow, /npm publish --tag next/);
  assert.equal(workflow.includes("NODE_AUTH_TOKEN"), false);
  assert.equal(workflow.includes("NPM_TOKEN"), false);
  assert.equal(workflow.includes("pull_request"), false);
  assert.equal(workflow.includes("push:"), false);
  for (const action of workflow.matchAll(/uses:\s+([^\s#]+)/g)) {
    assert.match(action[1], /^[^@]+@[0-9a-f]{40}$/);
  }
});

test("Cloudflare Pages deployment is static, secret-free, and carries headers", async () => {
  const headers = await readFile(path.join(root, "public/_headers"), "utf8");
  const deployment = await readFile(path.join(root, "docs/cloudflare-pages-deployment.md"), "utf8");
  assert.match(headers, /X-Frame-Options: DENY/);
  assert.match(headers, /X-Content-Type-Options: nosniff/);
  assert.match(headers, /Permissions-Policy:/);
  assert.match(headers, /\/first-light\/\*\.tmj\s+Content-Type: application\/json/);
  assert.match(deployment, /Build command: `npm run build`/);
  assert.match(deployment, /Build output directory: `dist`/);
  assert.match(deployment, /Environment variables: none required/);
  assert.match(deployment, /https:\/\/lumenjs\.pages\.dev/);
  assert.match(deployment, /Core connected hosting is proven/);
});

test("Willowbound and Tideglass Reach are distinct valid creator consumers", async () => {
  for (const project of ["willowbound", "tideglass-reach"]) {
    await execFileAsync(process.execPath, ["bin/lumen.js", "validate", `examples/${project}`], {
      cwd: root
    });
  }
  const willow = await readJson("examples/willowbound/project.lumen.json");
  const tideglass = await readJson("examples/tideglass-reach/project.lumen.json");
  assert.notEqual(willow.projectId, tideglass.projectId);
  assert.notEqual(willow.title, tideglass.title);
  assert.notEqual(willow.startMap, tideglass.startMap);
  const willowMaps = new Set(willow.sources.maps.map((entry) => entry.id));
  assert.ok(tideglass.sources.maps.every((entry) => !willowMaps.has(entry.id)));
  const willowCampaign = await readJson("examples/willowbound/campaign/campaign.lumen.json");
  const tideglassCampaign = await readJson("examples/tideglass-reach/campaign/campaign.lumen.json");
  const willowCreatures = new Set(willowCampaign.creatures.map((entry) => entry.id));
  assert.ok(tideglassCampaign.creatures.every((entry) => !willowCreatures.has(entry.id)));

  const temporary = await mkdtemp(path.join(os.tmpdir(), "lumen-tideglass-consumer-"));
  try {
    const focus = await execFileAsync(
      process.execPath,
      [
        "bin/lumen.js",
        "focus",
        "examples/tideglass-reach",
        "--map",
        "tideglass-shore",
        "--spawn",
        "crossing-start",
        "--locale",
        "es"
      ],
      { cwd: root }
    );
    assert.match(focus.stdout, /tideglass-shore\/crossing-start · es/);
    const output = path.join(temporary, "web");
    await execFileAsync(
      process.execPath,
      ["bin/lumen.js", "export", "examples/tideglass-reach", "--out", output],
      { cwd: root }
    );
    const verified = await execFileAsync(
      process.execPath,
      ["bin/lumen.js", "verify-export", output],
      { cwd: root }
    );
    assert.match(verified.stdout, /tideglass-reach 0\.1\.0 · 17 files/);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

async function readJson(relative) {
  return JSON.parse(await readFile(path.join(root, relative), "utf8"));
}
