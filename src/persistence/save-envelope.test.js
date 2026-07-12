import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { importContinuityProject } from "../project/import-continuity-project.js";
import { createContinuityState, stepContinuity } from "../simulation/continuity-simulation.js";
import { createInitialState, hashState } from "../simulation/world-simulation.js";
import {
  canonicalJson,
  createSaveEnvelope,
  hashSnapshot,
  projectV2SnapshotToV1,
  SaveValidationError,
  validateAndMigrateEnvelope
} from "./save-envelope.js";

const fixture = new URL("../../public/first-light/", import.meta.url);
const testFixture = new URL("../../tests/fixtures/first-light/", import.meta.url);
const manifest = await readJson("project.lumen.json");
const imported = importContinuityProject({
  manifest,
  map: await readJson("lantern-vale.tmj"),
  world: await readJson("world.lumen.json"),
  campaign: await readJson("campaign.lumen.json"),
  additionalMaps: [
    {
      id: "lantern-house",
      source: manifest.sources.additionalMaps[0],
      map: await readJson("lantern-house.tmj"),
      world: await readJson("lantern-house.lumen.json")
    }
  ]
});
if (!imported.project) throw new Error(JSON.stringify(imported.errors));
const project = imported.project;

test("canonical JSON and SHA-256 are stable across object key order", async () => {
  assert.equal(canonicalJson({ z: 1, a: { y: 2, x: 3 } }), '{"a":{"x":3,"y":2},"z":1}');
  assert.equal(await hashSnapshot({ b: 2, a: 1 }), await hashSnapshot({ a: 1, b: 2 }));
});

test("creates and validates a strict portable v2 envelope", async () => {
  const state = createContinuityState(project);
  const envelope = await createSaveEnvelope(project, state, {
    saveId: "journey",
    createdAt: "2026-07-11T01:02:03.000Z"
  });
  const result = await validateAndMigrateEnvelope(project, JSON.parse(JSON.stringify(envelope)));
  assert.deepEqual(result.envelope, envelope);
  assert.equal(result.migration, null);

  const replay = await readJson("campaign-replay.json", testFixture);
  for (let count = 1; count <= replay.actions.length; count += 1) {
    const replayState = applyActions(state, replay.actions.slice(0, count));
    await createSaveEnvelope(project, replayState, {
      saveId: `replay-${count}`,
      createdAt: "2026-07-11T01:02:03.000Z"
    });
  }
  const lossReplay = await readJson("campaign-loss-replay.json", testFixture);
  await createSaveEnvelope(project, applyActions(state, lossReplay.actions), {
    saveId: "loss-replay",
    createdAt: "2026-07-11T01:02:03.000Z"
  });
  const continuityReplay = await readJson("continuity-replay.json");
  for (let count = 1; count <= continuityReplay.actions.length; count += 1) {
    const replayState = applyActions(state, continuityReplay.actions.slice(0, count));
    await createSaveEnvelope(project, replayState, {
      saveId: `continuity-${count}`,
      createdAt: "2026-07-11T01:02:03.000Z"
    });
  }
  await assert.rejects(
    createSaveEnvelope(project, state, { saveId: "", createdAt: "" }),
    /must be a non-empty string/
  );
  await assert.rejects(
    createSaveEnvelope(project, state, { saveId: "journey", createdAt: "yesterday" }),
    /must be a canonical UTC timestamp/
  );
  const inheritedFormat = Object.assign(
    Object.create({ format: state.format }),
    structuredClone(state)
  );
  delete inheritedFormat.format;
  await assert.rejects(
    createSaveEnvelope(project, inheritedFormat, {
      saveId: "inherited-format",
      createdAt: "2026-07-11T01:02:03.000Z"
    }),
    /snapshot\/format: is required/
  );
});

test("rejects identity, hash, structural, and semantic failures", async () => {
  const envelope = await createSaveEnvelope(project, createContinuityState(project), {
    saveId: "journey",
    createdAt: "2026-07-11T01:02:03.000Z"
  });
  await assert.rejects(
    validateAndMigrateEnvelope(project, { ...envelope, projectId: "other" }),
    SaveValidationError
  );
  await assert.rejects(
    validateAndMigrateEnvelope(project, { ...envelope, snapshotHash: "sha256-v1:bad" }),
    /does not match/
  );
  await assert.rejects(
    validateAndMigrateEnvelope(project, { ...envelope, surprise: true }),
    /not allowed/
  );
  await assert.rejects(
    validateAndMigrateEnvelope(project, { ...envelope, "a/b~": true }),
    (error) =>
      error instanceof SaveValidationError &&
      error.issues.some((item) => item.pointer === "/a~1b~0")
  );
  const invalid = structuredClone(envelope);
  invalid.snapshot.activeMapId = "missing-map";
  invalid.snapshotHash = await hashSnapshot(invalid.snapshot);
  await assert.rejects(validateAndMigrateEnvelope(project, invalid), /unknown map/);
});

test("rejects correctly rehashed malformed nested campaign state", async () => {
  const initial = createContinuityState(project);
  await rejectsSnapshotMutation(
    initial,
    (snapshot) => {
      snapshot.mapStates["a/b~"] = structuredClone(snapshot.mapStates["lantern-vale"]);
    },
    /mapStates\/a~1b~0: references an unknown map/
  );
  await rejectsSnapshotMutation(
    initial,
    (snapshot) => {
      snapshot.mapStates["lantern-vale"].flags["a/b~"] = false;
    },
    /flags\/a~1b~0: is not authored/
  );
  await rejectsSnapshotMutation(
    initial,
    (snapshot) => {
      snapshot.mapStates["lantern-vale"].player.facing = "up";
    },
    /player\/facing: is invalid/
  );
  await rejectsSnapshotMutation(
    initial,
    (snapshot) => {
      const collision = project.mapsById["lantern-vale"].collisions[0];
      snapshot.mapStates["lantern-vale"].player.x = collision.x;
      snapshot.mapStates["lantern-vale"].player.y = collision.y;
    },
    /player: is inside authored collision/
  );
  await rejectsSnapshotMutation(
    initial,
    (snapshot) => {
      snapshot.mapStates["lantern-vale"].flags.unknown = true;
    },
    /flags\/unknown: is not authored for this map/
  );
  await rejectsSnapshotMutation(
    initial,
    (snapshot) => {
      delete snapshot.mapStates["lantern-vale"].flags["beacon-lit"];
    },
    /flags\/beacon-lit: is required for this map/
  );
  await rejectsSnapshotMutation(
    initial,
    (snapshot) => {
      snapshot.mapStates["lantern-vale"].flags["beacon-lit"] = true;
    },
    /flags\/beacon-lit: cannot be set before the first map tick/
  );
  await rejectsSnapshotMutation(
    initial,
    (snapshot) => {
      snapshot.mapStates["lantern-vale"].flags["beacon-lit"] = true;
      snapshot.mapStates["lantern-vale"].message =
        project.mapsById["lantern-vale"].character.messageBefore;
    },
    /message: cannot exist before the first map tick/
  );
  await rejectsSnapshotMutation(
    initial,
    (snapshot) => {
      snapshot.mapStates["lantern-vale"].message = "forged message";
    },
    /message: must be a recognized campaign message/
  );
  await rejectsSnapshotMutation(
    initial,
    (snapshot) => {
      snapshot.mapStates["lantern-vale"].message = "Glintail joined the party.";
    },
    /message: does not match the campaign outcome/
  );
  await rejectsSnapshotMutation(
    initial,
    (snapshot) => {
      snapshot.mapStates["lantern-vale"].message =
        project.mapsById["lantern-vale"].character.messageBefore;
    },
    /message: requires the authored beacon flag/
  );
  await rejectsSnapshotMutation(
    initial,
    (snapshot) => {
      snapshot.mapStates["lantern-vale"].transitions = 1;
    },
    /transitions: cannot exceed the map tick count/
  );
  await rejectsSnapshotMutation(
    initial,
    (snapshot) => {
      snapshot.party = ["embercub", "embercub"];
    },
    /authored-size set of unique creatures/
  );
  await rejectsSnapshotMutation(
    initial,
    (snapshot) => {
      snapshot.party = ["embercub", "mossling", "glintail"];
    },
    /authored-size set of unique creatures/
  );
  await rejectsSnapshotMutation(
    initial,
    (snapshot) => {
      snapshot.party = ["glintail"];
    },
    /cannot contain the encounter creature before victory/
  );
  await rejectsSnapshotMutation(
    initial,
    (snapshot) => {
      snapshot.inventory.extra = 1;
    },
    /inventory\/extra: is not allowed/
  );
  await rejectsSnapshotMutation(
    initial,
    (snapshot) => {
      snapshot.inventory.sunberry = 2;
    },
    /must be within the authored inventory/
  );
  await rejectsSnapshotMutation(
    initial,
    (snapshot) => {
      snapshot.inventory.sunberry = 0;
    },
    /must match the authored inventory before battle/
  );
  await rejectsSnapshotMutation(
    initial,
    (snapshot) => {
      snapshot.mapStates["lantern-house"] = createInitialState(project.mapsById["lantern-house"]);
    },
    /mapStates: cannot contain secondary maps before a result/
  );
  await rejectsSnapshotMutation(
    initial,
    (snapshot) => {
      const house = createInitialState(project.mapsById["lantern-house"]);
      house.message = project.mapsById["lantern-house"].character.messageWithGlintail;
      snapshot.mapStates["lantern-house"] = house;
    },
    /message: requires Glintail in the saved party/
  );
  await rejectsSnapshotMutation(
    initial,
    (snapshot) => {
      snapshot.activeMapId = "lantern-house";
      snapshot.mapStates = {
        "lantern-house": createInitialState(project.mapsById["lantern-house"])
      };
    },
    /mapStates: must retain the project start map/
  );
  await rejectsSnapshotMutation(
    initial,
    (snapshot) => {
      snapshot.activeMapId = "constructor";
    },
    /activeMapId: references an unknown map/
  );
  await rejectsSnapshotMutation(
    initial,
    (snapshot) => {
      snapshot.mapStates.constructor = structuredClone(snapshot.mapStates["lantern-vale"]);
    },
    /mapStates\/constructor: references an unknown map/
  );
  await rejectsSnapshotMutation(
    initial,
    (snapshot) => {
      snapshot.party = ["constructor"];
    },
    /party: must contain an authored-size set of unique creatures/
  );
  await rejectsSnapshotMutation(
    initial,
    (snapshot) => {
      snapshot.mode = "dialogue";
      snapshot.dialogue = {};
    },
    /dialogue\/nodeId: is required/
  );
  await rejectsSnapshotMutation(
    initial,
    (snapshot) => {
      snapshot.mode = "dialogue";
      snapshot.dialogue = { nodeId: "constructor" };
    },
    /dialogue\/nodeId: references an unknown dialogue node/
  );
  await rejectsSnapshotMutation(
    initial,
    (snapshot) => {
      snapshot.mode = "dialogue";
      const start = project.campaign.dialogue.nodesById[project.campaign.dialogue.start];
      snapshot.dialogue = {
        nodeId: start.choices.find((choice) => choice.effect === "choose-companion").next
      };
    },
    /party: does not match the reachable companion-selection state/
  );
  await rejectsSnapshotMutation(
    initial,
    (snapshot) => {
      snapshot.mode = "dialogue";
      snapshot.dialogue = { nodeId: project.campaign.dialogue.start };
      snapshot.party = [project.campaign.starters[0]];
    },
    /party: does not match the reachable companion-selection state/
  );
  await rejectsSnapshotMutation(
    initial,
    (snapshot) => {
      snapshot.mode = "battle";
      snapshot.battle = {};
    },
    /battle\/encounter: is required/
  );

  const replay = await readJson("campaign-replay.json", testFixture);
  const battle = applyActions(initial, replay.actions.slice(0, 17));
  assert.equal(battle.mode, "battle");
  await rejectsSnapshotMutation(
    initial,
    (snapshot) => {
      snapshot.party = structuredClone(battle.party);
      snapshot.battle = structuredClone(battle.battle);
    },
    /battle: must be null in world mode before a result/
  );
  await rejectsSnapshotMutation(
    battle,
    (snapshot) => {
      snapshot.battle.ally.moves[0].remaining = 100;
    },
    /must be within the authored use limit/
  );
  await rejectsSnapshotMutation(
    battle,
    (snapshot) => {
      snapshot.battle.turn += 1;
    },
    /move uses plus consumed battle items do not match the completed turn history/
  );
  await rejectsSnapshotMutation(
    battle,
    (snapshot) => {
      snapshot.inventory.sunberry -= 1;
    },
    /move uses plus consumed battle items do not match the completed turn history/
  );
  await rejectsSnapshotMutation(
    battle,
    (snapshot) => {
      snapshot.party = {};
    },
    /party: must contain an authored-size set of unique creatures/
  );
  await rejectsSnapshotMutation(
    battle,
    (snapshot) => {
      snapshot.battle.opponent.id = "embercub";
    },
    /must match the encounter creature/
  );
  await rejectsSnapshotMutation(
    battle,
    (snapshot) => {
      snapshot.party = ["glintail"];
      snapshot.battle.ally.id = "glintail";
    },
    /ally\/id: must be an authored starter/
  );
  await rejectsSnapshotMutation(
    battle,
    (snapshot) => {
      snapshot.battle.ally.id = "constructor";
    },
    /ally\/id: references an unknown creature/
  );
  await rejectsSnapshotMutation(
    battle,
    (snapshot) => {
      snapshot.battle.ally.moves[0].id = "constructor";
    },
    /moves\/0\/id: does not match the creature move list/
  );
  await rejectsSnapshotMutation(
    battle,
    (snapshot) => {
      snapshot.battle.opponent.health = 0;
    },
    /cannot contain a defeated creature in battle mode/
  );
  await rejectsSnapshotMutation(
    battle,
    (snapshot) => {
      snapshot.mode = "result";
    },
    /outcome: is required in result mode/
  );
  await rejectsSnapshotMutation(
    battle,
    (snapshot) => {
      snapshot.mode = "result";
      snapshot.outcome = "victory";
    },
    /opponent\/health: must be zero after victory/
  );
  await rejectsSnapshotMutation(
    battle,
    (snapshot) => {
      snapshot.mode = "result";
      snapshot.outcome = "victory";
      snapshot.battle.ally.health = 0;
      snapshot.battle.opponent.health = 0;
    },
    /ally\/health: must be above zero after victory/
  );

  const victory = applyActions(initial, replay.actions);
  assert.equal(victory.mode, "world");
  await rejectsSnapshotMutation(
    victory,
    (snapshot) => {
      snapshot.battle.turn = 0;
    },
    /battle\/turn: must include a completed turn after an outcome/
  );
  await rejectsSnapshotMutation(
    victory,
    (snapshot) => {
      snapshot.party = ["glintail"];
    },
    /must contain one starter and the recruited encounter creature after victory/
  );
  await rejectsSnapshotMutation(
    victory,
    (snapshot) => {
      snapshot.battle.opponent.health = 1;
    },
    /opponent\/health: must be zero after victory/
  );
});

test("migrates the static v1 fixture without mutation or loss of Phase 2A meaning", async () => {
  const source = await readJson("save-v1.fixture.json", testFixture);
  const before = structuredClone(source);
  const result = await validateAndMigrateEnvelope(project, source);
  assert.deepEqual(source, before);
  assert.deepEqual(result.migration, {
    from: 1,
    to: 2,
    sourceFormat: "lumen-save-v1",
    resultingFormat: "lumen-save-v2"
  });
  assert.equal(result.envelope.projectVersion, "0.3.0");
  assert.deepEqual(projectV2SnapshotToV1(result.envelope.snapshot), source.snapshot);
  assert.equal(
    hashState(projectV2SnapshotToV1(result.envelope.snapshot)),
    hashState(source.snapshot)
  );

  const extendedSource = structuredClone(source);
  extendedSource.snapshot.surprise = true;
  extendedSource.snapshotHash = await hashSnapshot(extendedSource.snapshot);
  await assert.rejects(
    validateAndMigrateEnvelope(project, extendedSource),
    /snapshot\/surprise: is not allowed/
  );

  const unsupportedSource = structuredClone(source);
  unsupportedSource.projectVersion = "0.1.0";
  unsupportedSource.snapshotHash = await hashSnapshot(unsupportedSource.snapshot);
  await assert.rejects(
    validateAndMigrateEnvelope(project, unsupportedSource),
    /expected project version '0\.2\.0' for 'lumen-save-v1'/
  );
});

async function readJson(name, base = fixture) {
  return JSON.parse(await readFile(new URL(name, base), "utf8"));
}

function applyActions(initial, actions) {
  let state = structuredClone(initial);
  for (const action of actions) state = stepContinuity(project, state, action).state;
  return state;
}

async function rejectsSnapshotMutation(source, mutate, expected) {
  const snapshot = structuredClone(source);
  mutate(snapshot);
  const envelope = {
    format: "lumen-save-v2",
    saveFormatVersion: 2,
    projectId: project.id,
    projectVersion: project.version,
    saveId: "malformed",
    createdAt: "2026-07-11T01:02:03.000Z",
    snapshot,
    snapshotHash: await hashSnapshot(snapshot)
  };
  await assert.rejects(validateAndMigrateEnvelope(project, envelope), expected);
}
