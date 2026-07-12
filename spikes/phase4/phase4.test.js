import assert from "node:assert/strict";
import test from "node:test";
import { resolveContextContributions } from "./context-contributions.js";
import { resolveCreatureComposition } from "./creature-composition.js";
import { resolveAuthoredThreat } from "./scaling-policy.js";

test("battlefield and challenge scenarios share ordered context without branching", () => {
  const contributions = [
    {
      module: "tideglass-battlefield",
      version: 1,
      source: "tideglass/arena.json",
      values: { terrain: "tidal-glass", weather: "salt-rain" }
    },
    {
      module: "cinder-vow",
      version: 1,
      source: "cinder/vow.json",
      values: { itemPolicy: "disabled", recoveryPolicy: "limited" }
    }
  ];
  const first = resolveContextContributions(contributions);
  const second = resolveContextContributions(structuredClone(contributions));
  assert.deepEqual(first, second);
  assert.match(first.hash, /^fnv1a32-v1:/);
  assert.equal(first.ownership.terrain.module, "tideglass-battlefield");
  assert.equal(first.ownership.itemPolicy.module, "cinder-vow");
  assert.deepEqual(contributions[0].values, { terrain: "tidal-glass", weather: "salt-rain" });
});

test("context ownership and versions fail before resolved state", () => {
  assert.throws(
    () =>
      resolveContextContributions([
        { module: "one", version: 1, source: "one.json", values: { weather: "rain" } },
        { module: "two", version: 1, source: "two.json", values: { weather: "sun" } }
      ]),
    (error) =>
      error instanceof Error &&
      "code" in error &&
      error.code === "CONTEXT_OWNER_CONFLICT" &&
      "remedy" in error &&
      Boolean(error.remedy)
  );
  assert.throws(
    () =>
      resolveContextContributions([
        { module: "future", version: 2, source: "future.json", values: {} }
      ]),
    (error) =>
      error instanceof Error && "code" in error && error.code === "CONTEXT_VERSION_UNSUPPORTED"
  );
});

test("open-world scaling remains sufficient as authored data", () => {
  const regions = [
    {
      id: "longroad-north",
      bands: [
        { id: "north-calm", fromMilestone: 0, threat: "calm", level: 2 },
        { id: "north-awake", fromMilestone: 3, threat: "awake", level: 6 }
      ]
    }
  ];
  assert.deepEqual(resolveAuthoredThreat(regions, "longroad-north", 4), {
    regionId: "longroad-north",
    milestone: 4,
    threat: "awake",
    encounterLevel: 6,
    sourceBand: "north-awake"
  });
  assert.throws(() => resolveAuthoredThreat(regions, "missing", 0), /Unknown authored region/);
});

test("creature composition keeps identity, rules, visuals, and provenance separate", () => {
  const creature = resolveCreatureComposition([
    {
      slot: "identity",
      module: "mosaic-core",
      source: "identity.json",
      value: { id: "rillfox", name: "Rillfox" }
    },
    { slot: "body", module: "mosaic-shapes", source: "body.json", value: { shape: "low-runner" } },
    {
      slot: "marking",
      module: "mosaic-marks",
      source: "mark.json",
      value: { pattern: "river-speckle" }
    },
    {
      slot: "temperament",
      module: "mosaic-temperaments",
      source: "temperament.json",
      value: { nature: "curious" }
    },
    { slot: "moves", module: "mosaic-moves", source: "moves.json", value: ["brook-dash"] }
  ]);
  assert.equal(creature.id, "rillfox");
  assert.equal(creature.provenance.body.module, "mosaic-shapes");
  assert.deepEqual(creature.moves, ["brook-dash"]);
  assert.throws(
    () =>
      resolveCreatureComposition([
        { slot: "identity", module: "one", source: "one", value: {} },
        { slot: "identity", module: "two", source: "two", value: {} }
      ]),
    /multiple owners/
  );
});
