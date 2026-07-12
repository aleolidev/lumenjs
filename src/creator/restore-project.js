import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import {
  createCreatorBackup,
  fileHash,
  listCreatorBackups,
  restoreCreatorBackupFiles
} from "./backup-store.js";
import { validateCreatorProject } from "./validate-project.js";
import { withCreatorWriteLock } from "./write-lock.js";

export async function inspectCreatorBackups(directory) {
  const root = path.resolve(directory);
  return (await listCreatorBackups(root)).map((item) => ({
    generation: item.generation,
    valid: item.valid,
    issues: item.issues,
    operation: item.operation
      ? {
          format: item.operation.format ?? null,
          operation: item.operation.operation ?? null,
          changedFiles: item.operation.changedFiles ?? Object.keys(item.operation.hashes ?? {}),
          hashes: item.operation.hashes ?? {}
        }
      : null
  }));
}

export async function restoreCreatorProject(directory, generation, options = {}) {
  const root = path.resolve(directory);
  if (!Number.isSafeInteger(generation) || generation < 1) {
    throw new CreatorRestoreError(
      "CREATOR_RESTORE_GENERATION_INVALID",
      "Backup generation must be a positive integer."
    );
  }
  if (options.apply) {
    return withCreatorWriteLock(root, () =>
      restoreCreatorProjectUnlocked(root, generation, options)
    );
  }
  return restoreCreatorProjectUnlocked(root, generation, options);
}

async function restoreCreatorProjectUnlocked(root, generation, options) {
  const validation = await validateCreatorProject(root);
  if (!validation.valid || !validation.project) {
    throw new CreatorRestoreError(
      "CREATOR_RESTORE_PROJECT_INVALID",
      "Current project must validate before restore.",
      validation.diagnostics
    );
  }
  const backups = await listCreatorBackups(root);
  const selected = backups.find((item) => item.generation === generation);
  if (!selected) {
    throw new CreatorRestoreError(
      "CREATOR_RESTORE_GENERATION_MISSING",
      `Backup generation ${generation} does not exist.`
    );
  }
  if (!selected.valid || !selected.operation) {
    throw new CreatorRestoreError(
      "CREATOR_RESTORE_GENERATION_CORRUPT",
      `Backup generation ${generation} failed integrity checks: ${selected.issues.join("; ")}`
    );
  }
  const relatives = Object.keys(selected.operation.hashes).sort();
  const declared = new Set(validation.project.declared.map(([, relative]) => relative));
  const undeclared = relatives.find((relative) => !declared.has(relative));
  if (undeclared) {
    throw new CreatorRestoreError(
      "CREATOR_RESTORE_FILE_UNDECLARED",
      `Backup generation ${generation} owns undeclared current-project file '${undeclared}'.`
    );
  }
  const changes = [];
  for (const relative of relatives) {
    let currentHash;
    try {
      currentHash = await fileHash(path.join(root, relative));
    } catch {
      throw new CreatorRestoreError(
        "CREATOR_RESTORE_CURRENT_FILE_UNAVAILABLE",
        `Backup generation ${generation} cannot safely replace unavailable current file '${relative}'.`
      );
    }
    const backupHash = selected.operation.hashes[relative];
    if (currentHash !== backupHash) changes.push({ source: relative, currentHash, backupHash });
  }
  if (changes.length === 0) {
    throw new CreatorRestoreError(
      "CREATOR_RESTORE_NO_CHANGES",
      `Project already matches backup generation ${generation}.`
    );
  }
  await validateStagedRestore(root, validation.project, selected.directory, relatives);
  const preview = {
    format: "lumen-creator-restore-v1-experimental",
    generation,
    changedFiles: changes.map((item) => item.source),
    changes
  };
  if (!options.apply) return { applied: false, safetyGeneration: null, ...preview };

  const safety = await createCreatorBackup(
    root,
    {
      format: "lumen-creator-restore-safety-v1-experimental",
      operation: { kind: "restore-safety", targetGeneration: generation },
      changedFiles: relatives,
      changes: []
    },
    relatives
  );
  try {
    await restoreCreatorBackupFiles(root, selected.directory, relatives, {
      failAfterFilesForTest: options.failAfterFilesForTest
    });
    const finalValidation = await validateCreatorProject(root);
    if (!finalValidation.valid) {
      throw new CreatorRestoreError(
        "CREATOR_RESTORE_FINAL_INVALID",
        "Restored project failed final validation.",
        finalValidation.diagnostics
      );
    }
  } catch (error) {
    await restoreCreatorBackupFiles(root, safety.directory, relatives);
    throw error;
  }
  return {
    applied: true,
    safetyGeneration: safety.generation,
    safetyDirectory: path.relative(root, safety.directory),
    ...preview
  };
}

export class CreatorRestoreError extends Error {
  constructor(code, message, diagnostics = []) {
    super(message);
    this.name = "CreatorRestoreError";
    this.code = code;
    this.diagnostics = diagnostics;
  }
}

async function validateStagedRestore(root, project, backupDirectory, relatives) {
  const staging = await mkdtemp(path.join(path.dirname(root), ".lumen-restore-stage-"));
  try {
    for (const [kind, relative] of project.declared) {
      if (kind === "optional-context" && !project.loaded[relative]) continue;
      const destination = path.join(staging, relative);
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(path.join(root, relative), destination);
    }
    await restoreCreatorBackupFiles(staging, backupDirectory, relatives);
    const validation = await validateCreatorProject(staging);
    if (!validation.valid) {
      throw new CreatorRestoreError(
        "CREATOR_RESTORE_STAGED_INVALID",
        "Backup would produce an invalid project.",
        validation.diagnostics
      );
    }
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}
