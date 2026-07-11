import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { importProject } from "./project/import-project.js";
import { buildScene } from "./scene/build-scene.js";
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
  world: await readJson("world.lumen.json")
};
const imported = importProject(sources);
if (!imported.valid || !imported.world) throw new Error(JSON.stringify(imported.errors));
const world = imported.world;

test("imports the structurally and semantically valid creator sources", () => {
  assert.equal(imported.valid, true);
  assert.equal(world.map.id, "lantern-vale");
  assert.deepEqual(world.spawn, { x: 2, y: 7 });
  assert.equal(world.collisions.length, 3);
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
