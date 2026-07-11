import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { importProject } from "./project/import-project.js";
import { buildScene } from "./scene/build-scene.js";
import {
  createCampaignState,
  runCampaignReplay,
  stepCampaign
} from "./simulation/campaign-simulation.js";
import {
  createInitialState,
  hashState,
  runReplay,
  stepWorld
} from "./simulation/world-simulation.js";

const fixture = new URL("../public/first-light/", import.meta.url);
const sources = {
  manifest: await readJson("project.lumen.json"),
  map: await readJson("lantern-vale.tmj"),
  world: await readJson("world.lumen.json"),
  campaign: await readJson("campaign.lumen.json")
};
const imported = importProject(sources);
if (!imported.valid || !imported.world) throw new Error(JSON.stringify(imported.errors));
const world = imported.world;

test("imports the structurally and semantically valid creator sources", () => {
  assert.equal(imported.valid, true);
  assert.equal(world.map.id, "lantern-vale");
  assert.deepEqual(world.spawn, { x: 2, y: 7 });
  assert.equal(world.collisions.length, 3);
  assert.equal(world.campaign.creatures.length, 3);
});

test("reports missing campaign dialogue and move references with source pointers", async () => {
  const brokenDialogue = await readJson("campaign.broken-dialogue.lumen.json");
  const dialogueResult = importProject({ ...sources, campaign: brokenDialogue });
  assert.equal(dialogueResult.valid, false);
  assert.deepEqual(dialogueResult.errors[0], {
    source: "campaign.lumen.json",
    pointer: "/dialogue/start",
    objectId: "missing-node",
    message: "references missing dialogue node"
  });

  const brokenMove = await readJson("campaign.broken-move.lumen.json");
  const moveResult = importProject({ ...sources, campaign: brokenMove });
  assert.equal(moveResult.valid, false);
  assert.ok(moveResult.errors.some((error) => error.objectId === "missing-move"));
});

test("dialogue chooses a validated companion and closes back into the world", () => {
  const state = createCampaignState(world);
  state.world.player = { x: 4, y: 6, facing: "east" };
  let result = stepCampaign(world, state, { type: "world", action: "interact" });
  assert.equal(result.state.mode, "dialogue");
  result = stepCampaign(world, result.state, {
    type: "dialogue-choice",
    choice: "choose-embercub"
  });
  assert.deepEqual(result.state.party, ["embercub"]);
  result = stepCampaign(world, result.state, {
    type: "dialogue-choice",
    choice: "close-warning"
  });
  assert.equal(result.state.mode, "world");
});

test("battle rules explain item use, damage, victory, and recruitment", () => {
  const state = createCampaignState(world);
  state.party = ["embercub"];
  state.world.player = { x: 13, y: 7, facing: "east" };
  let result = stepCampaign(world, state, { type: "world", action: "move-east" });
  assert.equal(result.state.mode, "battle");
  result = stepCampaign(world, result.state, { type: "battle-item", item: "sunberry" });
  assert.equal(result.state.inventory.sunberry, 0);
  assert.ok(result.facts.some((fact) => fact.type === "item-used"));
  for (let index = 0; index < 4; index += 1) {
    result = stepCampaign(world, result.state, { type: "battle-move", move: "spark-step" });
  }
  assert.equal(result.state.mode, "result");
  assert.equal(result.state.outcome, "victory");
  assert.deepEqual(result.state.party, ["embercub", "glintail"]);
  assert.ok(result.facts.some((fact) => fact.type === "creature-recruited"));
  result = stepCampaign(world, result.state, { type: "continue-result" });
  assert.equal(result.state.mode, "world");
  assert.match(result.state.world.message, /Glintail/);
});

test("campaign replay reproduces world, dialogue, battle, facts, and hash", async () => {
  const replay = await readJson("campaign-replay.json");
  const first = runCampaignReplay(world, replay);
  const second = runCampaignReplay(world, replay);
  assert.deepEqual(first, second);
  assert.equal(first.stateHash, replay.expectedStateHash);
  assert.equal(first.state.mode, "world");
  assert.equal(first.state.outcome, "victory");
  assert.deepEqual(first.state.party, ["embercub", "glintail"]);
  assert.ok(first.facts.some((fact) => fact.type === "battle-ended"));
});

test("slower companion can lose and the loss replay is deterministic", async () => {
  const replay = await readJson("campaign-loss-replay.json");
  const result = runCampaignReplay(world, replay);
  assert.equal(result.stateHash, replay.expectedStateHash);
  assert.equal(result.state.mode, "result");
  assert.equal(result.state.outcome, "loss");
  assert.deepEqual(result.state.party, ["mossling"]);
  /** @type {any} */
  const finalFact = result.facts.at(-1);
  assert.ok(finalFact);
  assert.equal(finalFact.type, "battle-ended");
  assert.equal(finalFact.result, "loss");
});

test("reports source-linked structural errors before producing a world", () => {
  const result = importProject({
    ...sources,
    manifest: { ...sources.manifest, unexpected: true }
  });
  assert.equal(result.valid, false);
  assert.equal(result.world, null);
  assert.equal(result.errors[0].source, "project.lumen.json");
  assert.match(result.errors[0].message, /additional properties/);
});

test("reports a missing stable Tiled object and its Lumen source pointer", async () => {
  const broken = await readJson("world.broken.lumen.json");
  const result = importProject({ ...sources, world: broken });
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors[0], {
    source: "world.lumen.json",
    pointer: "/spawn",
    objectId: "missing-spawn",
    message: "references missing Tiled object 'missing-spawn'"
  });
});

test("accepts validated movement and rejects collision deterministically", () => {
  const initial = createInitialState(world);
  const moved = stepWorld(world, initial, "move-north");
  assert.deepEqual(moved.state.player, { x: 2, y: 6, facing: "north" });

  const againstBounds = { ...initial, player: { x: 0, y: 0, facing: "west" } };
  const blocked = stepWorld(world, againstBounds, "move-west");
  assert.deepEqual(blocked.state.player, { x: 0, y: 0, facing: "west" });
  assert.equal(blocked.facts[0].type, "movement-blocked");
  assert.throws(() => stepWorld(world, initial, "teleport"), /Invalid First Light action/);
});

test("speaking to Mira lights the beacon and emits structured facts", () => {
  const state = {
    ...createInitialState(world),
    player: { x: 4, y: 6, facing: "east" }
  };
  const result = stepWorld(world, state, "interact");
  assert.equal(result.state.flags[world.beacon.stateKey], true);
  assert.equal(result.state.message, world.character.messageBefore);
  assert.deepEqual(
    result.facts.map((fact) => fact.type),
    ["flag-changed", "character-spoke"]
  );
});

test("the east trail emits a transition and returns to spawn", () => {
  const state = {
    ...createInitialState(world),
    player: { x: 13, y: 7, facing: "east" }
  };
  const result = stepWorld(world, state, "move-east");
  assert.deepEqual(result.state.player, { ...world.spawn, facing: "east" });
  assert.equal(result.state.transitions, 1);
  const transition = result.facts.at(-1);
  assert.ok(transition);
  assert.equal(transition.type, "map-transition");
});

test("canonical replay reproduces the same state hash and fact sequence", async () => {
  const replay = await readJson("replay.json");
  const first = runReplay(world, replay);
  const second = runReplay(world, replay);
  assert.deepEqual(first, second);
  assert.equal(first.stateHash, replay.expectedStateHash);
  assert.deepEqual(first.facts, replay.expectedFacts);
  assert.equal(first.stateHash, hashState(first.state));
});

test("bridge semantics place the player below or above the deck explicitly", () => {
  const under = createInitialState(world);
  under.player = { x: 9, y: 5, facing: "south" };
  const underScene = buildScene(world, under);
  assert.equal(underScene.semantics.playerUnderBridge, true);
  assert.ok(underScene.semantics.bridgeDepth > underScene.semantics.playerDepth);

  const on = createInitialState(world);
  on.player = { x: 9, y: 3, facing: "east" };
  const onScene = buildScene(world, on);
  assert.equal(onScene.semantics.playerOnBridge, true);
  assert.ok(onScene.semantics.playerDepth > onScene.semantics.bridgeDepth);
});

test("scene declares textured top-down 2.5D with sprites and simple 3D", () => {
  const scene = buildScene(world, createInitialState(world));
  assert.equal(scene.projection, "top-down-three-quarter-v1");
  assert.equal(scene.camera.pitchDegrees, 38);
  assert.equal(scene.semantics.texturedItemCount, scene.items.length);
  assert.equal(scene.semantics.spriteCount, 3);
  assert.equal(scene.semantics.simple3dCount, 1);
  assert.ok(scene.items.every((item) => item.texture));

  const enhanced = buildScene(world, createInitialState(world), { visualMode: "enhanced" });
  assert.equal(enhanced.visualMode, "enhanced");
  assert.equal(enhanced.semantics.visualMode, "enhanced");
});

async function readJson(name) {
  return JSON.parse(await readFile(new URL(name, fixture), "utf8"));
}
