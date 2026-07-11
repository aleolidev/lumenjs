import { deleteDB, openDB } from "idb";

export async function createSaveStore(name) {
  const db = await openDB(name, 1, {
    upgrade(database) {
      database.createObjectStore("snapshots", { keyPath: "id" });
      database.createObjectStore("pointers");
    }
  });

  return {
    async save(saveId, state, { durability = "default" } = {}) {
      const parent = await db.get("pointers", saveId);
      const generation = (parent?.generation ?? 0) + 1;
      const payload = JSON.stringify(state);
      const checksum = await sha256(payload);
      const snapshot = {
        id: `${saveId}:${generation}`,
        saveId,
        generation,
        parent: parent?.snapshotId ?? null,
        formatVersion: 1,
        checksum,
        payload
      };
      const options =
        durability === "strict"
          ? { durability: /** @type {const} */ ("strict") }
          : durability === "relaxed"
            ? { durability: /** @type {const} */ ("relaxed") }
            : undefined;
      const transaction = db.transaction(["snapshots", "pointers"], "readwrite", options);
      await Promise.all([
        transaction.objectStore("snapshots").put(snapshot),
        transaction.objectStore("pointers").put({ snapshotId: snapshot.id, generation }, saveId),
        transaction.done
      ]);
      return snapshot.id;
    },

    async load(saveId) {
      const pointer = await db.get("pointers", saveId);
      let snapshotId = pointer?.snapshotId;
      while (snapshotId) {
        const snapshot = await db.get("snapshots", snapshotId);
        if (!snapshot) return null;
        if (snapshot.checksum === (await sha256(snapshot.payload))) {
          return {
            state: JSON.parse(snapshot.payload),
            generation: snapshot.generation,
            recovered: snapshot.id !== pointer.snapshotId
          };
        }
        snapshotId = snapshot.parent;
      }
      return null;
    },

    async corruptCurrentForTest(saveId) {
      const pointer = await db.get("pointers", saveId);
      const snapshot = await db.get("snapshots", pointer.snapshotId);
      snapshot.payload = `${snapshot.payload}corrupt`;
      await db.put("snapshots", snapshot);
    },

    close() {
      db.close();
    },

    async destroy() {
      db.close();
      await deleteDB(name);
    }
  };
}

async function sha256(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
