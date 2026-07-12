import { createHash } from "node:crypto";
import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const markerName = "lumen-export-manifest.json";
const hashPattern = /^sha256-v1:[0-9a-f]{64}$/;
const versionPattern = /^\d+\.\d+\.\d+$/;
const idPattern = /^(?!(?:constructor|prototype)$)[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export async function verifyCreatorExport(directory) {
  const root = path.resolve(directory);
  await requireDirectory(root);
  const marker = path.join(root, markerName);
  await requireRegularFile(marker, "CREATOR_EXPORT_VERIFY_MANIFEST_MISSING");
  let manifest;
  try {
    manifest = JSON.parse(await readFile(marker, "utf8"));
  } catch {
    throw new CreatorExportVerificationError(
      "CREATOR_EXPORT_VERIFY_MANIFEST_JSON",
      "Export manifest must contain valid JSON."
    );
  }
  validateManifest(manifest);

  const declared = Object.keys(manifest.files).sort();
  const declaredDirectories = parentDirectories(declared);
  const actual = (await walkFiles(root, "", declaredDirectories))
    .filter((relative) => relative !== markerName)
    .sort();
  const missing = declared.filter((relative) => !actual.includes(relative));
  if (missing.length > 0) {
    throw new CreatorExportVerificationError(
      "CREATOR_EXPORT_VERIFY_FILE_MISSING",
      `Export is missing declared file '${missing[0]}'.`
    );
  }
  const unexpected = actual.filter((relative) => !declared.includes(relative));
  if (unexpected.length > 0) {
    throw new CreatorExportVerificationError(
      "CREATOR_EXPORT_VERIFY_FILE_UNEXPECTED",
      `Export contains unexpected file '${unexpected[0]}'.`
    );
  }

  const files = Object.create(null);
  for (const relative of declared) {
    const actualHash = await fileHash(path.join(root, relative));
    if (actualHash !== manifest.files[relative]) {
      throw new CreatorExportVerificationError(
        "CREATOR_EXPORT_VERIFY_HASH_MISMATCH",
        `Export file '${relative}' does not match its recorded SHA-256.`
      );
    }
    files[relative] = actualHash;
  }
  return {
    valid: true,
    format: manifest.format,
    projectId: manifest.projectId,
    projectVersion: manifest.projectVersion,
    files
  };
}

export class CreatorExportVerificationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "CreatorExportVerificationError";
    this.code = code;
    this.diagnostics = [];
  }
}

function validateManifest(value) {
  if (!isRecord(value) || value.format !== "lumen-static-export-v1-experimental") {
    throw new CreatorExportVerificationError(
      "CREATOR_EXPORT_VERIFY_FORMAT",
      "Export manifest format is unsupported."
    );
  }
  const keys = Object.keys(value).sort();
  if (keys.join("\n") !== ["files", "format", "projectId", "projectVersion"].join("\n")) {
    throw new CreatorExportVerificationError(
      "CREATOR_EXPORT_VERIFY_MANIFEST_SHAPE",
      "Export manifest must contain only format, projectId, projectVersion, and files."
    );
  }
  if (!idPattern.test(value.projectId ?? "") || !versionPattern.test(value.projectVersion ?? "")) {
    throw new CreatorExportVerificationError(
      "CREATOR_EXPORT_VERIFY_METADATA",
      "Export manifest project ID or version is invalid."
    );
  }
  if (!isRecord(value.files) || Object.keys(value.files).length === 0) {
    throw new CreatorExportVerificationError(
      "CREATOR_EXPORT_VERIFY_FILES",
      "Export manifest must declare at least one file."
    );
  }
  const portablePaths = new Set([markerName.toLowerCase()]);
  for (const [relative, hash] of Object.entries(value.files)) {
    if (!isSafeRelativePath(relative) || relative === markerName) {
      throw new CreatorExportVerificationError(
        "CREATOR_EXPORT_VERIFY_PATH_UNSAFE",
        `Export manifest path ${displayPath(relative)} is unsafe; require NFC portable URL-safe relative paths without hidden/reserved segments, #, or %.`
      );
    }
    const portablePath = relative.toLowerCase().normalize("NFC");
    if (portablePaths.has(portablePath)) {
      throw new CreatorExportVerificationError(
        "CREATOR_EXPORT_VERIFY_PATH_COLLISION",
        `Export manifest path ${displayPath(relative)} collides under portable case-insensitive identity.`
      );
    }
    portablePaths.add(portablePath);
    if (typeof hash !== "string" || !hashPattern.test(hash)) {
      throw new CreatorExportVerificationError(
        "CREATOR_EXPORT_VERIFY_HASH_INVALID",
        `Export manifest contains an invalid hash for '${relative}'.`
      );
    }
  }
}

async function walkFiles(root, relative, declaredDirectories, portablePaths = new Set()) {
  const directory = path.join(root, relative);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => compareText(left.name, right.name))) {
    const childRelative = relative ? path.posix.join(relative, entry.name) : entry.name;
    if (!isSafeRelativePath(childRelative)) {
      throw new CreatorExportVerificationError(
        "CREATOR_EXPORT_VERIFY_PATH_UNSAFE",
        `Export filesystem path ${displayPath(childRelative)} is unsafe.`
      );
    }
    const portablePath = childRelative.toLowerCase().normalize("NFC");
    if (portablePaths.has(portablePath)) {
      throw new CreatorExportVerificationError(
        "CREATOR_EXPORT_VERIFY_PATH_COLLISION",
        `Export filesystem path ${displayPath(childRelative)} collides under portable case-insensitive identity.`
      );
    }
    portablePaths.add(portablePath);
    const child = path.join(root, childRelative);
    const info = await lstat(child);
    if (info.isSymbolicLink()) {
      throw new CreatorExportVerificationError(
        "CREATOR_EXPORT_VERIFY_SYMLINK",
        `Export contains symbolic link '${childRelative}'.`
      );
    }
    if (info.isDirectory()) {
      if (!declaredDirectories.has(childRelative)) {
        throw new CreatorExportVerificationError(
          "CREATOR_EXPORT_VERIFY_DIRECTORY_UNEXPECTED",
          `Export contains unexpected directory '${childRelative}'.`
        );
      }
      files.push(...(await walkFiles(root, childRelative, declaredDirectories, portablePaths)));
    } else if (info.isFile()) files.push(childRelative);
    else {
      throw new CreatorExportVerificationError(
        "CREATOR_EXPORT_VERIFY_FILE_TYPE",
        `Export contains unsupported file type '${childRelative}'.`
      );
    }
  }
  return files;
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
  return directories;
}

async function requireDirectory(directory) {
  try {
    const info = await lstat(directory);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("not-directory");
  } catch {
    throw new CreatorExportVerificationError(
      "CREATOR_EXPORT_VERIFY_DIRECTORY",
      "Export directory must be a real directory."
    );
  }
}

async function requireRegularFile(file, code) {
  try {
    const info = await lstat(file);
    if (info.isSymbolicLink()) {
      throw new CreatorExportVerificationError(
        "CREATOR_EXPORT_VERIFY_SYMLINK",
        `Export contains symbolic link '${path.basename(file)}'.`
      );
    }
    if (!info.isFile()) throw new Error("not-file");
  } catch (error) {
    if (error instanceof CreatorExportVerificationError) throw error;
    throw new CreatorExportVerificationError(code, "Export manifest must be a regular file.");
  }
}

async function fileHash(file) {
  return `sha256-v1:${createHash("sha256")
    .update(await readFile(file))
    .digest("hex")}`;
}

function isSafeRelativePath(value) {
  const segments = typeof value === "string" ? value.split("/") : [];
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !/[\p{C}\p{Zl}\p{Zp}]/u.test(value) &&
    !path.isAbsolute(value) &&
    value === value.replaceAll("\\", "/") &&
    path.posix.normalize(value) === value &&
    !value.startsWith("../") &&
    !value.includes("/../") &&
    segments.every((segment) => !isUnsafePathSegment(segment))
  );
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

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function displayPath(value) {
  return JSON.stringify(value).replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, (character) => {
    return `\\u{${(character.codePointAt(0) ?? 0).toString(16).padStart(4, "0")}}`;
  });
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
