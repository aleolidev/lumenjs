import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "lumen-release-candidate-"));

try {
  const packDirectory = path.join(temporaryRoot, "pack");
  const repackDirectory = path.join(temporaryRoot, "repack");
  const consumerDirectory = path.join(temporaryRoot, "consumer");
  const npmCache = path.join(temporaryRoot, "npm-cache");
  await mkdir(packDirectory);
  await mkdir(repackDirectory);
  await mkdir(consumerDirectory);
  await mkdir(npmCache);

  const { stdout: packOutput } = await execFileAsync(
    "npm",
    ["pack", "--json", "--pack-destination", packDirectory],
    { cwd: root, env: quietNpmEnvironment(npmCache) }
  );
  const [candidate] = JSON.parse(packOutput);
  if (candidate.name !== "lumenjs" || candidate.version !== "0.1.0") {
    throw new Error(`Unexpected package identity: ${candidate.name}@${candidate.version}`);
  }

  const { stdout: repackOutput } = await execFileAsync(
    "npm",
    ["pack", "--json", "--pack-destination", repackDirectory],
    { cwd: root, env: quietNpmEnvironment(npmCache) }
  );
  const [repacked] = JSON.parse(repackOutput);
  const firstBytes = await readFile(path.join(packDirectory, candidate.filename));
  const secondBytes = await readFile(path.join(repackDirectory, repacked.filename));
  const firstHash = createHash("sha256").update(firstBytes).digest("hex");
  const secondHash = createHash("sha256").update(secondBytes).digest("hex");
  if (firstHash !== secondHash || candidate.integrity !== repacked.integrity) {
    throw new Error("Repeated npm packing did not produce the same candidate bytes and integrity.");
  }
  for (const required of ["LICENSE", "README.md", "THIRD_PARTY_NOTICES.md", "bin/lumen.js"]) {
    if (!candidate.files.some((entry) => entry.path === required)) {
      throw new Error(`Packed candidate is missing ${required}.`);
    }
  }

  const tarball = path.join(packDirectory, candidate.filename);
  await execFileAsync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarball], {
    cwd: consumerDirectory,
    env: quietNpmEnvironment(npmCache)
  });
  const installedRoot = path.join(consumerDirectory, "node_modules", "lumenjs");
  const installedManifest = JSON.parse(
    await readFile(path.join(installedRoot, "package.json"), "utf8")
  );
  if (installedManifest.license !== "Apache-2.0" || installedManifest.private !== false) {
    throw new Error("Installed candidate does not expose the approved public license boundary.");
  }

  const cli = path.join(installedRoot, "bin", "lumen.js");
  const project = path.join(consumerDirectory, "clean-consumer");
  const output = path.join(consumerDirectory, "clean-consumer-web");
  await runCli(cli, ["create", project, "--name", "Clean Consumer"], npmCache);
  await runCli(cli, ["validate", project], npmCache);
  await runCli(cli, ["inspect", project, "--json"], npmCache);
  await runCli(
    cli,
    ["focus", project, "--map", "willow-crossing", "--spawn", "crossing-start"],
    npmCache
  );
  await runCli(cli, ["export", project, "--out", output], npmCache);
  await runCli(cli, ["verify-export", output], npmCache);

  process.stdout.write(
    `Verified ${candidate.name}@${candidate.version}: ${candidate.entryCount} reproducible packed files (${firstHash}), clean install, creator workflow, and export.\n`
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

async function runCli(cli, arguments_, npmCache) {
  await execFileAsync(process.execPath, [cli, ...arguments_], {
    cwd: root,
    env: quietNpmEnvironment(npmCache)
  });
}

function quietNpmEnvironment(npmCache) {
  return {
    ...process.env,
    npm_config_cache: npmCache,
    npm_config_update_notifier: "false"
  };
}
