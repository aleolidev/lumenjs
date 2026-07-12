import { deleteDB, openDB } from "idb";
import { canonicalJson, sha256, validateAndMigrateEnvelope } from "./save-envelope.js";

const snapshotsStore = "snapshots";
const pointersStore = "pointers";
const retention = 3;

export async function createGenerationStore(name, project) {
  const database = await openDB(name, 1, {
    upgrade(db) {
      const snapshots = db.createObjectStore(snapshotsStore, { keyPath: "id" });
      snapshots.createIndex("slot", "slot");
      db.createObjectStore(pointersStore);
    }
  });

  return {
    async save(slot, envelope, options = {}) {
      const validated = await validateAndMigrateEnvelope(project, envelope);
      const cleanEnvelope = validated.envelope;
      const payload = canonicalJson(cleanEnvelope);
      const checksum = await sha256(payload);
      const transaction = database.transaction(
        [snapshotsStore, pointersStore],
        "readwrite",
        options.durability ? { durability: options.durability } : undefined
      );
      let committed;
      try {
        const pointers = transaction.objectStore(pointersStore);
        const snapshots = transaction.objectStore(snapshotsStore);
        const previous = await pointers.get(slot);
        if (previous && !pointerHistory(previous, slot)) {
          throw new Error("Generation pointer metadata is corrupt");
        }
        const generation = (previous?.generation ?? 0) + 1;
        if (!Number.isSafeInteger(generation)) {
          throw new Error("Generation number exceeded the safe integer range");
        }
        const id = `${slot}:${generation}`;
        const snapshot = {
          id,
          slot,
          generation,
          parent: previous?.current ?? null,
          checksum,
          payload
        };
        await snapshots.add(snapshot);
        if (options.failBeforePointerForTest) throw new Error("Injected pre-pointer failure");
        const history = [id, ...(previous?.history ?? [])].slice(0, retention);
        await pointers.put({ current: id, generation, history }, slot);
        await transaction.done;
        committed = { generation, snapshotId: id, snapshotHash: cleanEnvelope.snapshotHash };
      } catch (error) {
        try {
          transaction.abort();
          await transaction.done;
        } catch {
          // The transaction rejection is expected when an operation aborts.
        }
        throw error;
      }
      try {
        if (options.corruptPointerBeforeCleanupForTest) {
          await database.put(
            pointersStore,
            { current: committed.snapshotId, generation: committed.generation, history: [] },
            slot
          );
        }
        if (options.failCleanupForTest) throw new Error("Injected retention cleanup failure");
        await removeExpired(database, slot);
        return { ...committed, retentionCleanup: "complete", retentionCleanupError: null };
      } catch (error) {
        return {
          ...committed,
          retentionCleanup: "deferred",
          retentionCleanupError: error instanceof Error ? error.message : String(error)
        };
      }
    },

    async load(slot) {
      const pointer = await database.get(pointersStore, slot);
      if (!pointer) return null;
      const history = pointerHistory(pointer, slot);
      if (!history) {
        return {
          envelope: null,
          generation: null,
          recovered: false,
          failures: [{ snapshotId: null, reason: "pointer" }]
        };
      }
      const failures = [];
      for (const id of history) {
        const stored = await database.get(snapshotsStore, id);
        if (!stored) {
          failures.push({ snapshotId: id, reason: "missing" });
          continue;
        }
        if (!validStoredSnapshot(stored, id, slot)) {
          failures.push({ snapshotId: id, reason: "record" });
          continue;
        }
        try {
          if ((await sha256(stored.payload)) !== stored.checksum) {
            failures.push({ snapshotId: id, reason: "checksum" });
            continue;
          }
          const result = await validateAndMigrateEnvelope(project, JSON.parse(stored.payload));
          return {
            ...result,
            generation: stored.generation,
            snapshotId: stored.id,
            recovered: stored.id !== pointer.current,
            failures
          };
        } catch (error) {
          failures.push({
            snapshotId: id,
            reason: "validation",
            message: error instanceof Error ? error.message : String(error)
          });
        }
      }
      return { envelope: null, generation: null, recovered: false, failures };
    },

    async inspect(slot) {
      const pointer = await database.get(pointersStore, slot);
      const all = await database.getAllFromIndex(snapshotsStore, "slot", slot);
      return {
        pointer: pointer ?? null,
        generations: all.sort((a, b) => a.generation - b.generation)
      };
    },

    async corruptCurrentForTest(slot, kind = "checksum") {
      const pointer = await database.get(pointersStore, slot);
      if (!pointer) throw new Error(`Slot '${slot}' does not exist`);
      if (kind === "pointer") {
        await database.put(pointersStore, { ...pointer, history: 42 }, slot);
        return;
      }
      if (kind === "pointer-order") {
        if (pointer.generation < 3) throw new Error("Pointer-order corruption needs generation 3");
        await database.put(
          pointersStore,
          {
            ...pointer,
            history: [
              pointer.current,
              `${slot}:${pointer.generation - 2}`,
              `${slot}:${pointer.generation - 1}`
            ]
          },
          slot
        );
        return;
      }
      if (kind === "missing") {
        await database.delete(snapshotsStore, pointer.current);
        return;
      }
      const stored = await database.get(snapshotsStore, pointer.current);
      if (kind === "record") {
        stored.payload = null;
        await database.put(snapshotsStore, stored);
        return;
      }
      if (kind === "record-generation") {
        stored.generation += 1;
        await database.put(snapshotsStore, stored);
        return;
      }
      stored.payload = `${stored.payload}corrupt`;
      await database.put(snapshotsStore, stored);
    },

    close() {
      database.close();
    },

    async destroy() {
      database.close();
      await deleteDB(name);
    }
  };
}

function pointerHistory(pointer, slot) {
  if (
    !pointer ||
    typeof pointer !== "object" ||
    typeof pointer.current !== "string" ||
    !Number.isSafeInteger(pointer.generation) ||
    pointer.generation < 1 ||
    pointer.current !== `${slot}:${pointer.generation}`
  )
    return null;
  const history = pointer.history === undefined ? [pointer.current] : pointer.history;
  const prefix = `${slot}:`;
  if (
    !Array.isArray(history) ||
    history.length === 0 ||
    history.length > retention ||
    history[0] !== pointer.current ||
    history.some((id, index) => {
      if (typeof id !== "string" || !id.startsWith(prefix)) return true;
      const generation = Number(id.slice(prefix.length));
      return (
        !Number.isSafeInteger(generation) ||
        generation < 1 ||
        generation !== pointer.generation - index ||
        id !== `${slot}:${generation}`
      );
    }) ||
    new Set(history).size !== history.length
  )
    return null;
  return history;
}

function validStoredSnapshot(stored, id, slot) {
  const prefix = `${slot}:`;
  const generation = id.startsWith(prefix) ? Number(id.slice(prefix.length)) : Number.NaN;
  return (
    stored &&
    typeof stored === "object" &&
    !Array.isArray(stored) &&
    Object.keys(stored).sort().join("\n") ===
      ["checksum", "generation", "id", "parent", "payload", "slot"].join("\n") &&
    stored.id === id &&
    stored.slot === slot &&
    Number.isSafeInteger(generation) &&
    generation > 0 &&
    stored.generation === generation &&
    stored.parent === (generation === 1 ? null : `${slot}:${generation - 1}`) &&
    typeof stored.payload === "string" &&
    typeof stored.checksum === "string" &&
    /^sha256-v1:[0-9a-f]{64}$/u.test(stored.checksum)
  );
}

async function removeExpired(database, slot) {
  const transaction = database.transaction([snapshotsStore, pointersStore], "readwrite");
  try {
    const pointer = await transaction.objectStore(pointersStore).get(slot);
    const retainedIds = pointerHistory(pointer, slot);
    if (!retainedIds) throw new Error("Generation pointer metadata is corrupt during cleanup");
    const index = transaction.objectStore(snapshotsStore).index("slot");
    let cursor = await index.openCursor(slot);
    while (cursor) {
      if (!retainedIds.includes(cursor.value.id)) await cursor.delete();
      cursor = await cursor.continue();
    }
    await transaction.done;
  } catch (error) {
    try {
      transaction.abort();
      await transaction.done;
    } catch {
      // The transaction rejection is expected when cleanup aborts.
    }
    throw error;
  }
}
