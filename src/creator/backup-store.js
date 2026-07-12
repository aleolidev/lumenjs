import { createHash } from "node:crypto";
import {
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rename,
  rm,
  writeFile
} from "node:fs/promises";
import path from "node:path";

export async function createCreatorBackup(root, record, relatives) {
  const backupRoot = await requireBackupRoot(root, { create: true });
  if (!backupRoot) throw new Error("Could not create creator backup root");
  const { generation, name, reservation } = await reserveGeneration(backupRoot);
  const directory = path.join(backupRoot, name);
  const staging = await mkdtemp(path.join(backupRoot, `.${name}-staging-`));
  try {
    const hashes = Object.create(null);
    for (const relative of [...relatives].sort()) {
      assertSafeRelative(relative);
      const source = path.join(root, relative);
      await requireRegularFile(source, `Source file '${relative}'`);
      const destination = path.join(staging, "files", relative);
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(source, destination);
      hashes[relative] = await fileHash(destination);
    }
    const operation = { ...record, generation, hashes };
    if (!isSupportedOperationRecord(operation)) {
      throw new CreatorBackupError(
        "CREATOR_BACKUP_RECORD_INVALID",
        "Backup operation record is not an exact supported tool-owned shape."
      );
    }
    await writeFile(path.join(staging, "operation.json"), json(operation), "utf8");
    await rename(staging, directory);
    return { generation, directory, hashes };
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  } finally {
    await rm(reservation, { recursive: true, force: true });
  }
}

export async function listCreatorBackups(root) {
  const backupRoot = await requireBackupRoot(root, { create: false });
  if (!backupRoot) return [];
  const names = (await readdir(backupRoot))
    .filter((name) => parseGenerationName(name) !== null)
    .sort((left, right) => Number(right) - Number(left));
  const generations = [];
  for (const name of names) {
    const directory = path.join(backupRoot, name);
    const issues = [];
    let operation = null;
    let supportedOperation = false;
    try {
      const info = await lstat(directory);
      if (info.isSymbolicLink() || !info.isDirectory())
        throw new Error("is not a regular directory");
      const rootEntries = (await readdir(directory)).sort();
      if (rootEntries.join("\n") !== ["files", "operation.json"].join("\n"))
        issues.push("generation contains unexpected root entries");
      const operationFile = path.join(directory, "operation.json");
      await requireRegularFile(operationFile, "Backup operation record");
      operation = JSON.parse(await readFile(operationFile, "utf8"));
      supportedOperation = isSupportedOperationRecord(operation);
      if (!supportedOperation) issues.push("unsupported operation record");
      if (operation.generation !== parseGenerationName(name)) issues.push("generation mismatch");
      if (
        !operation.hashes ||
        typeof operation.hashes !== "object" ||
        Array.isArray(operation.hashes) ||
        Object.keys(operation.hashes).length === 0
      )
        issues.push("hashes missing");
      const hashFiles = Object.keys(operation.hashes ?? {}).sort();
      if (hasPortablePathCollision(hashFiles)) issues.push("backup paths collide portably");
      if (
        !Array.isArray(operation.changedFiles) ||
        JSON.stringify([...operation.changedFiles].sort()) !== JSON.stringify(hashFiles)
      )
        issues.push("changedFiles do not match hashes");
      try {
        const filesRoot = path.join(directory, "files");
        const filesRootInfo = await lstat(filesRoot);
        if (filesRootInfo.isSymbolicLink() || !filesRootInfo.isDirectory())
          throw new Error("files root is not a regular directory");
        const inventory = await walkBackupTree(filesRoot);
        if (JSON.stringify(inventory.files) !== JSON.stringify(hashFiles))
          issues.push("backup file inventory does not match hashes");
        const expectedDirectories = parentDirectories(hashFiles);
        if (JSON.stringify(inventory.directories) !== JSON.stringify(expectedDirectories))
          issues.push("backup directory inventory does not match hashes");
      } catch (error) {
        issues.push(`backup inventory: ${error instanceof Error ? error.message : String(error)}`);
      }
      for (const [relative, expected] of Object.entries(operation.hashes ?? {})) {
        try {
          assertSafeRelative(relative);
          if (typeof expected !== "string" || !/^sha256-v1:[0-9a-f]{64}$/.test(expected)) {
            throw new Error("invalid SHA-256 hash");
          }
          const backupFile = path.join(directory, "files", relative);
          await requireRegularFile(backupFile, `Backup file '${relative}'`);
          if ((await fileHash(backupFile)) !== expected) issues.push(`${relative}: hash mismatch`);
        } catch (error) {
          issues.push(
            error instanceof CreatorBackupError
              ? error.message
              : `${relative}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
      if (supportedOperation && operation.format === "lumen-creator-rename-v1-experimental")
        issues.push(...(await validateChangePreimages(directory, operation)));
    } catch (error) {
      issues.push(error instanceof Error ? error.message : String(error));
    }
    generations.push({
      generation: parseGenerationName(name),
      directory,
      valid: issues.length === 0,
      issues,
      operation
    });
  }
  return generations;
}

async function validateChangePreimages(directory, operation) {
  const issues = [];
  const documents = new Map();
  for (const change of operation.changes) {
    try {
      let document = documents.get(change.source);
      if (!document) {
        document = JSON.parse(await readFile(path.join(directory, "files", change.source), "utf8"));
        documents.set(change.source, document);
      }
      const value = readJsonPointer(document, change.pointer);
      const messageDefinition =
        operation.operation.kind === "message" && change.pointer === `/${operation.operation.from}`;
      if (value === missingPointer || (!messageDefinition && value !== change.before))
        issues.push("change pointer does not identify its recorded pre-image");
    } catch {
      issues.push("change pointer pre-image is unavailable");
    }
  }
  return issues;
}

const missingPointer = Symbol("missing-pointer");

function readJsonPointer(document, pointer) {
  if (typeof pointer !== "string" || !pointer.startsWith("/") || pointer.length < 2)
    return missingPointer;
  let value = document;
  for (const encoded of pointer.slice(1).split("/")) {
    if (/~(?![01])/u.test(encoded)) return missingPointer;
    const token = encoded.replaceAll("~1", "/").replaceAll("~0", "~");
    if (Array.isArray(value)) {
      if (!/^(?:0|[1-9]\d*)$/.test(token) || Number(token) >= value.length) return missingPointer;
      value = value[Number(token)];
    } else if (isRecord(value) && Object.hasOwn(value, token)) value = value[token];
    else return missingPointer;
  }
  return value;
}

async function walkBackupTree(root, relative = "") {
  const directory = relative ? path.join(root, relative) : root;
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  const directories = [];
  for (const entry of entries.sort((left, right) => compareText(left.name, right.name))) {
    const childRelative = relative ? path.posix.join(relative, entry.name) : entry.name;
    assertSafeRelative(childRelative);
    const child = path.join(root, childRelative);
    const info = await lstat(child);
    if (info.isSymbolicLink()) throw new Error(`symbolic link '${childRelative}'`);
    if (info.isDirectory()) {
      directories.push(childRelative);
      const nested = await walkBackupTree(root, childRelative);
      files.push(...nested.files);
      directories.push(...nested.directories);
    } else if (info.isFile()) files.push(childRelative);
    else throw new Error(`unsupported file type '${childRelative}'`);
  }
  return { files, directories };
}

function parentDirectories(files) {
  const directories = new Set();
  for (const file of files) {
    let directory = path.posix.dirname(file);
    while (directory !== ".") {
      directories.add(directory);
      directory = path.posix.dirname(directory);
    }
  }
  return [...directories].sort(compareText);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export async function restoreCreatorBackupFiles(root, directory, relatives, options = {}) {
  const staging = await mkdtemp(path.join(root, ".lumen-restore-files-"));
  const temporaryFiles = [];
  try {
    for (const relative of relatives) {
      assertSafeRelative(relative);
      const backupFile = path.join(directory, "files", relative);
      await requireRegularFile(backupFile, `Backup file '${relative}'`);
      const target = path.join(root, relative);
      const temporary = path.join(staging, relative);
      await mkdir(path.dirname(temporary), { recursive: true });
      await copyFile(backupFile, temporary);
      temporaryFiles.push([temporary, target]);
    }
    let committed = 0;
    for (const [temporary, target] of temporaryFiles) {
      await rename(temporary, target);
      committed += 1;
      if (options.failAfterFilesForTest === committed) {
        throw new Error("Injected restore commit failure");
      }
    }
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

export async function fileHash(file) {
  return `sha256-v1:${createHash("sha256")
    .update(await readFile(file))
    .digest("hex")}`;
}

async function reserveGeneration(backupRoot) {
  const entries = await readdir(backupRoot);
  let generation =
    Math.max(0, ...entries.map(parseGenerationName).filter((value) => value !== null)) + 1;
  while (true) {
    if (!Number.isSafeInteger(generation)) {
      throw new CreatorBackupError(
        "CREATOR_BACKUP_GENERATION_EXHAUSTED",
        "Creator backup generation exceeded the safe integer range."
      );
    }
    const name = String(generation).padStart(4, "0");
    const reservation = path.join(backupRoot, `.${name}-reservation`);
    try {
      await mkdir(reservation);
      return { generation, name, reservation };
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === "EEXIST")) {
        throw error;
      }
      generation += 1;
    }
  }
}

function parseGenerationName(name) {
  if (!/^\d{4,}$/.test(name)) return null;
  const generation = Number(name);
  if (!Number.isSafeInteger(generation) || generation < 1) return null;
  return String(generation).padStart(4, "0") === name ? generation : null;
}

async function requireBackupRoot(root, { create }) {
  try {
    const rootInfo = await lstat(root);
    if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) {
      throw new CreatorBackupError(
        "CREATOR_BACKUP_PATH_UNSAFE",
        "Project root must be a regular directory."
      );
    }
  } catch (error) {
    if (error instanceof CreatorBackupError) throw error;
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      throw new CreatorBackupError(
        "CREATOR_BACKUP_PROJECT_MISSING",
        "Creator project root does not exist."
      );
    }
    throw error;
  }
  const lumen = path.join(root, ".lumen");
  const backupRoot = path.join(lumen, "backups");
  for (const [directory, label] of [
    [lumen, ".lumen"],
    [backupRoot, ".lumen/backups"]
  ]) {
    try {
      const info = await lstat(directory);
      if (info.isSymbolicLink() || !info.isDirectory()) {
        throw new CreatorBackupError(
          "CREATOR_BACKUP_PATH_UNSAFE",
          `Project ${label} path must be a regular directory.`
        );
      }
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) {
        throw error;
      }
      if (!create) return null;
      await mkdir(directory, { recursive: true });
    }
  }
  return backupRoot;
}

function assertSafeRelative(relative) {
  const segments = typeof relative === "string" ? relative.split(/[\\/]/) : [];
  if (
    typeof relative !== "string" ||
    relative.length === 0 ||
    /[\p{C}\p{Zl}\p{Zp}]/u.test(relative) ||
    path.isAbsolute(relative) ||
    relative !== relative.replaceAll("\\", "/") ||
    path.posix.normalize(relative) !== relative ||
    segments.some(isUnsafePathSegment)
  ) {
    throw new CreatorBackupError("CREATOR_BACKUP_PATH_UNSAFE", "Backup path is unsafe.");
  }
}

function isUnsafePathSegment(segment) {
  return (
    ["", ".", "..", "__proto__", "constructor", "prototype"].includes(segment) ||
    segment.startsWith(".") ||
    segment !== segment.normalize("NFC") ||
    /[<>:"|?*#%]/.test(segment) ||
    /[. ]$/.test(segment) ||
    /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:[.]|$)/i.test(segment)
  );
}

function hasPortablePathCollision(relatives) {
  const keys = new Set();
  for (const relative of relatives) {
    const key = relative.toLowerCase().normalize("NFC");
    if (keys.has(key)) return true;
    keys.add(key);
  }
  return false;
}

const renameKinds = new Set(["map", "spawn", "creature", "dialogue", "encounter", "message"]);
const stableId = /^(?!(?:constructor|prototype)$)[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

function isSupportedOperationRecord(record) {
  if (
    !isRecord(record) ||
    !hasExactKeys(record, [
      "format",
      "operation",
      "changedFiles",
      "changes",
      "generation",
      "hashes"
    ]) ||
    !isRecord(record.operation) ||
    !Number.isSafeInteger(record.generation) ||
    record.generation < 1 ||
    !Array.isArray(record.changedFiles) ||
    !Array.isArray(record.changes) ||
    !isRecord(record.hashes)
  )
    return false;
  const hashFiles = Object.keys(record.hashes).sort();
  if (
    hashFiles.length === 0 ||
    record.changedFiles.some((relative) => typeof relative !== "string") ||
    JSON.stringify([...record.changedFiles].sort()) !== JSON.stringify(hashFiles) ||
    Object.values(record.hashes).some(
      (value) => typeof value !== "string" || !/^sha256-v1:[0-9a-f]{64}$/.test(value)
    )
  )
    return false;
  if (record.format === "lumen-creator-rename-v1-experimental") {
    return (
      hasExactKeys(record.operation, ["kind", "from", "to", "map"]) &&
      renameKinds.has(record.operation.kind) &&
      stableId.test(record.operation.from) &&
      stableId.test(record.operation.to) &&
      record.operation.from !== record.operation.to &&
      (record.operation.kind === "spawn"
        ? stableId.test(record.operation.map)
        : record.operation.map === null) &&
      hasValidRenameChanges(record)
    );
  }
  return (
    record.format === "lumen-creator-restore-safety-v1-experimental" &&
    hasExactKeys(record.operation, ["kind", "targetGeneration"]) &&
    record.operation.kind === "restore-safety" &&
    Number.isSafeInteger(record.operation.targetGeneration) &&
    record.operation.targetGeneration > 0 &&
    record.operation.targetGeneration < record.generation &&
    record.changes.length === 0
  );
}

function hasValidRenameChanges(record) {
  if (record.changes.length === 0) return false;
  const changedFiles = new Set(record.changedFiles);
  const seen = new Set();
  const referencedFiles = new Set();
  for (const change of record.changes) {
    if (
      !hasExactKeys(change, ["source", "pointer", "before", "after"]) ||
      typeof change.source !== "string" ||
      !changedFiles.has(change.source) ||
      typeof change.pointer !== "string" ||
      !change.pointer.startsWith("/") ||
      change.pointer.length < 2 ||
      change.before !== record.operation.from ||
      change.after !== record.operation.to
    )
      return false;
    const identity = `${change.source}\n${change.pointer}`;
    if (seen.has(identity)) return false;
    seen.add(identity);
    referencedFiles.add(change.source);
  }
  return (
    referencedFiles.size === changedFiles.size &&
    [...changedFiles].every((source) => referencedFiles.has(source))
  );
}

function hasExactKeys(value, expected) {
  return (
    isRecord(value) && Object.keys(value).sort().join("\n") === [...expected].sort().join("\n")
  );
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function requireRegularFile(file, label) {
  const info = await lstat(file);
  if (info.isSymbolicLink() || !info.isFile()) {
    throw new CreatorBackupError("CREATOR_BACKUP_PATH_UNSAFE", `${label} is not a regular file.`);
  }
}

export class CreatorBackupError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "CreatorBackupError";
    this.code = code;
  }
}

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}
