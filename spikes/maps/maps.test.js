import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { importMap } from "./import-map.js";

const fixtures = new URL("./fixtures/", import.meta.url);

test("imports Tiled geometry and typed Lumen metadata without merging sources", async () => {
  const result = await importMap(
    new URL("town.tmj", fixtures),
    new URL("town.lumen.json", fixtures)
  );

  assert.deepEqual(result.events, [
    {
      id: "meet-guide",
      position: { x: 1, y: 1 },
      kind: "dialogue",
      dialogueId: "welcome"
    }
  ]);
  assert.equal(result.source.version, "1.12.2");
});

test("fails clearly when typed metadata references a removed map object", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "lumen-map-spike-"));
  const metadata = path.join(directory, "town.lumen.json");
  await writeFile(
    metadata,
    JSON.stringify({
      schemaVersion: 1,
      mapId: "first-town",
      source: "town.tmj",
      events: { missing: { kind: "dialogue", dialogueId: "welcome" } }
    })
  );

  await assert.rejects(importMap(new URL("town.tmj", fixtures), metadata), /missing Tiled event/);
});
