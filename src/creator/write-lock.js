import { randomUUID } from "node:crypto";
import { mkdir, readdir, realpath, rm } from "node:fs/promises";
import path from "node:path";

export async function withCreatorWriteLock(root, callback) {
  const canonicalRoot = await canonicalLockRoot(root);
  const paths = lockPaths(canonicalRoot);
  await withGate(paths.gate, async () => {
    const entries = await readdir(paths.parent);
    if (
      entries.includes(paths.writeName) ||
      entries.some((entry) => entry.startsWith(paths.readPrefix))
    )
      throw busy(root);
    await mkdir(paths.write);
  });
  try {
    return await callback();
  } finally {
    await rm(paths.write, { recursive: true, force: true });
  }
}

export async function withCreatorReadLock(root, callback) {
  const canonicalRoot = await canonicalLockRoot(root);
  const paths = lockPaths(canonicalRoot);
  const read = path.join(paths.parent, `${paths.readPrefix}${randomUUID()}`);
  await withGate(paths.gate, async () => {
    const entries = await readdir(paths.parent);
    if (entries.includes(paths.writeName)) throw busy(root);
    await mkdir(read);
  });
  try {
    return await callback();
  } finally {
    await rm(read, { recursive: true, force: true });
  }
}

async function canonicalLockRoot(root) {
  try {
    return await realpath(root);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT")
      return root;
    throw error;
  }
}

function lockPaths(root) {
  const parent = path.dirname(root);
  const base = `.${path.basename(root)}.lumen`;
  const writeName = `${base}-write-lock`;
  return {
    parent,
    gate: path.join(parent, `${base}-lock-gate`),
    writeName,
    write: path.join(parent, writeName),
    readPrefix: `${base}-read-lock-`
  };
}

async function withGate(gate, callback) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      await mkdir(gate);
      try {
        return await callback();
      } finally {
        await rm(gate, { recursive: true, force: true });
      }
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === "EEXIST"))
        throw error;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }
  throw new CreatorWriteLockError(
    "CREATOR_WRITE_BUSY",
    `Project lock gate '${gate}' remained busy.`
  );
}

function busy(root) {
  return new CreatorWriteLockError(
    "CREATOR_WRITE_BUSY",
    `Project '${root}' already has a conflicting creator operation in progress.`
  );
}

export class CreatorWriteLockError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "CreatorWriteLockError";
    this.code = code;
    this.diagnostics = [];
  }
}
