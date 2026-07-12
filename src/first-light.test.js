import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { importContinuityProject } from "./project/import-continuity-project.js";
import { importProject } from "./project/import-project.js";
import { buildScene } from "./scene/build-scene.js";
import {
  createCampaignState,
  runCampaignReplay,
  stepCampaign
} from "./simulation/campaign-simulation.js";
import {
  createContinuityState,
  runContinuityReplay,
  stepContinuity
} from "./simulation/continuity-simulation.js";
import {
  createInitialState,
  hashState,
  runReplay,
  stepWorld
} from "./simulation/world-simulation.js";

const fixture = new URL("../public/first-light/", import.meta.url);
const testFixture = new URL("../tests/fixtures/first-light/", import.meta.url);
const sources = {
  manifest: await readJson("project.lumen.json"),
  map: await readJson("lantern-vale.tmj"),
  world: await readJson("world.lumen.json"),
  campaign: await readJson("campaign.lumen.json")
};
const imported = importProject(sources);
if (!imported.valid || !imported.world) throw new Error(JSON.stringify(imported.errors));
const world = imported.world;
const continuitySources = {
  ...sources,
  additionalMaps: [
    {
      id: "lantern-house",
      source: sources.manifest.sources.additionalMaps[0],
      map: await readJson("lantern-house.tmj"),
      world: await readJson("lantern-house.lumen.json")
    }
  ]
};
const continuityImported = importContinuityProject(continuitySources);
if (!continuityImported.valid || !continuityImported.project) {
  throw new Error(JSON.stringify(continuityImported.errors));
}
const continuityProject = continuityImported.project;

test("imports the structurally and semantically valid creator sources", () => {
  assert.equal(imported.valid, true);
  assert.equal(world.map.id, "lantern-vale");
  assert.deepEqual(world.spawn, { x: 2, y: 7 });
  assert.equal(world.collisions.length, 3);
  assert.equal(world.campaign.creatures.length, 3);
});

test("production assets are provenanced and test fixtures remain private", async () => {
  assert.deepEqual(await listFiles(fixture), [
    "assets/lantern-vale-atlas.png",
    "assets/mira.png",
    "assets/player.png",
    "campaign.lumen.json",
    "continuity-replay.json",
    "lantern-house.lumen.json",
    "lantern-house.tmj",
    "lantern-vale.tmj",
    "project.lumen.json",
    "world.lumen.json"
  ]);
  const records = {
    "public/first-light/assets/lantern-vale-atlas.png":
      "45b31f12488fd05b881e3c41b4af1803f46ea8a26b2de09a3dc638a9d7dab325",
    "public/first-light/assets/mira.png":
      "32ac3635cf396bf0d07f3dc33337dc2439f978bd7e9871e5709b191c3b29d543",
    "public/first-light/assets/player.png":
      "4bbf0ba43dd2018d8d4513ce80bfa403ddf6eda7e4c616556bcb97f91c3175d1",
    "docs/art-source/first-light/mira-chroma-source.png":
      "f19cbe0a4ac08f8ed2e2afd91a0c6719489b8034d8859ed5162fbe7ea95c843d",
    "docs/art-source/first-light/player-chroma-source.png":
      "e465ab6bf49d9ec0f72bf59bcee855f9dba347cd0056eae44becf89a1e817e37"
  };
  const provenance = await readFile(
    new URL("../docs/first-light-provenance.md", import.meta.url),
    "utf8"
  );
  for (const [relative, expected] of Object.entries(records)) {
    const bytes = await readFile(new URL(`../${relative}`, import.meta.url));
    const actual = createHash("sha256").update(bytes).digest("hex");
    assert.equal(actual, expected, relative);
    assert.ok(provenance.includes(`| \`${relative}\` | \`${expected}\` |`));
  }
  for (const name of [
    "campaign-loss-replay.json",
    "campaign-replay.json",
    "campaign.broken-dialogue.lumen.json",
    "campaign.broken-move.lumen.json",
    "replay.json",
    "save-v1.fixture.json",
    "world.broken.lumen.json"
  ]) {
    await readFile(new URL(name, testFixture));
    await assert.rejects(readFile(new URL(name, fixture)), { code: "ENOENT" });
  }
});

test("direct import roots fail diagnostically instead of throwing", () => {
  for (const value of [null, false, 0, "", []]) {
    const primary = importProject(value);
    assert.equal(primary.valid, false);
    assert.equal(primary.world, null);
    assert.ok(primary.errors.some((error) => error.pointer === "/"));

    const continuity = importContinuityProject(value);
    assert.equal(continuity.valid, false);
    assert.equal(continuity.project, null);
    assert.ok(continuity.errors.some((error) => error.pointer === "/"));
  }
});

test("direct imports ignore inherited required and optional source properties", () => {
  const inheritedTitle = Object.assign(
    Object.create({ title: sources.manifest.title }),
    structuredClone(sources.manifest)
  );
  delete inheritedTitle.title;
  const required = importProject({ ...sources, manifest: inheritedTitle });
  assert.equal(required.valid, false);
  assert.equal(required.world, null);
  assert.ok(required.errors.some((error) => error.pointer === "/title"));

  const inheritedCampaign = structuredClone(sources.manifest);
  inheritedCampaign.sources = Object.assign(
    Object.create({ campaign: sources.manifest.sources.campaign }),
    inheritedCampaign.sources
  );
  delete inheritedCampaign.sources.campaign;
  const campaign = importContinuityProject({
    ...continuitySources,
    manifest: inheritedCampaign
  });
  assert.equal(campaign.valid, false);
  assert.equal(campaign.project, null);
  assert.ok(campaign.errors.some((error) => error.pointer === "/sources/campaign"));

  const inheritedMaps = structuredClone(sources.manifest);
  inheritedMaps.sources = Object.assign(
    Object.create({ additionalMaps: sources.manifest.sources.additionalMaps }),
    inheritedMaps.sources
  );
  delete inheritedMaps.sources.additionalMaps;
  const maps = importContinuityProject({ ...continuitySources, manifest: inheritedMaps });
  assert.equal(maps.valid, false);
  assert.equal(maps.project, null);
  assert.ok(maps.errors.some((error) => error.pointer === "/sources/additionalMaps"));

  const noncloneable = importContinuityProject({ manifest: () => null });
  assert.equal(noncloneable.valid, false);
  assert.equal(noncloneable.project, null);
  assert.deepEqual(noncloneable.errors[0], {
    source: "project.lumen.json",
    pointer: "/",
    objectId: null,
    message: "project sources must contain cloneable data"
  });
});

test("a declared falsy campaign is invalid rather than treated as absent", () => {
  for (const campaign of [null, false, 0, ""]) {
    const result = importProject({ ...sources, campaign });
    assert.equal(result.valid, false);
    assert.equal(result.world, null);
    assert.ok(result.errors.some((error) => error.source === "campaign.lumen.json"));
  }
  const omitted = importProject({
    manifest: sources.manifest,
    map: sources.map,
    world: sources.world
  });
  assert.equal(omitted.valid, false);
  assert.ok(omitted.errors.some((error) => error.pointer === "/sources/campaign"));

  const undeclaredManifest = structuredClone(sources.manifest);
  delete undeclaredManifest.sources.campaign;
  const undeclared = importProject({ ...sources, manifest: undeclaredManifest });
  assert.equal(undeclared.valid, false);
  assert.ok(undeclared.errors.some((error) => error.pointer === "/sources/campaign"));
});

test("continuity requires a declared and provided campaign", () => {
  const manifest = structuredClone(sources.manifest);
  delete manifest.sources.campaign;
  const result = importContinuityProject({
    manifest,
    map: sources.map,
    world: sources.world,
    additionalMaps: continuitySources.additionalMaps
  });
  assert.equal(result.valid, false);
  assert.equal(result.project, null);
  assert.ok(
    result.errors.some(
      (error) =>
        error.pointer === "/sources/campaign" &&
        error.message.includes("required for campaign continuity")
    )
  );
});

test("continuity requires exact declared additional-map sources", () => {
  for (const additionalMaps of [
    [],
    [...continuitySources.additionalMaps, continuitySources.additionalMaps[0]]
  ]) {
    const result = importContinuityProject({ ...continuitySources, additionalMaps });
    assert.equal(result.valid, false);
    assert.equal(result.project, null);
    assert.ok(result.errors.some((error) => error.pointer === "/sources/additionalMaps"));
  }

  const forged = structuredClone(continuitySources.additionalMaps);
  forged[0].source.map = "other.tmj";
  const result = importContinuityProject({ ...continuitySources, additionalMaps: forged });
  assert.equal(result.valid, false);
  assert.equal(result.project, null);
  assert.ok(result.errors.some((error) => error.pointer === "/sources/additionalMaps/0"));
});

test("manifest source paths are URL-safe and portably unique before discovery", () => {
  const unsafeManifest = structuredClone(sources.manifest);
  unsafeManifest.sources.campaign = "..\\escape.lumen.json";
  const unsafe = importContinuityProject({ ...continuitySources, manifest: unsafeManifest });
  assert.equal(unsafe.valid, false);
  assert.equal(unsafe.project, null);
  assert.ok(unsafe.errors.some((error) => error.pointer === "/sources/campaign"));

  const collidingManifest = structuredClone(sources.manifest);
  collidingManifest.sources.additionalMaps[0].map = "LANTERN-VALE.tmj";
  const colliding = importContinuityProject({
    ...continuitySources,
    manifest: collidingManifest
  });
  assert.equal(colliding.valid, false);
  assert.equal(colliding.project, null);
  assert.ok(
    colliding.errors.some(
      (error) =>
        error.pointer === "/sources/additionalMaps/0/map" &&
        error.message.includes("portable path identity")
    )
  );
});

test("imports both maps atomically and resolves cross-map spawns", () => {
  assert.equal(Object.getPrototypeOf(continuityProject.mapsById), null);
  assert.equal(Object.getPrototypeOf(continuityProject.mapsById["lantern-house"].spawnsById), null);
  assert.deepEqual(
    continuityProject.maps.map((map) => map.map.id),
    ["lantern-vale", "lantern-house"]
  );
  assert.deepEqual(continuityProject.mapsById["lantern-house"].spawn, { x: 4, y: 6 });
  const transition = continuityProject.mapsById["lantern-vale"].mapTransitions[0];
  assert.equal(transition.targetMap, "lantern-house");
  assert.deepEqual(
    continuityProject.mapsById[transition.targetMap].spawnsById[transition.targetSpawn],
    { x: 4, y: 6 }
  );
});

test("rejects a cross-map transition to a missing spawn before state exists", () => {
  const brokenWorld = structuredClone(continuitySources.additionalMaps[0].world);
  brokenWorld.transitions[0].targetSpawn = "missing-spawn";
  const result = importContinuityProject({
    ...continuitySources,
    additionalMaps: [{ ...continuitySources.additionalMaps[0], world: brokenWorld }]
  });
  assert.equal(result.valid, false);
  assert.equal(result.project, null);
  assert.ok(result.errors.some((error) => error.objectId === "missing-spawn"));
});

test("rejects duplicate continuity spawn and transition IDs before state", () => {
  const duplicatePrimary = structuredClone(continuitySources.world);
  duplicatePrimary.additionalSpawns.push(structuredClone(duplicatePrimary.additionalSpawns[0]));
  duplicatePrimary.mapTransitions.push(structuredClone(duplicatePrimary.mapTransitions[0]));
  const primaryResult = importContinuityProject({ ...continuitySources, world: duplicatePrimary });
  assert.equal(primaryResult.valid, false);
  assert.equal(primaryResult.project, null);
  assert.ok(primaryResult.errors.some((error) => error.pointer === "/additionalSpawns/1/id"));
  assert.ok(primaryResult.errors.some((error) => error.pointer === "/mapTransitions/1/id"));

  const duplicateSpawns = structuredClone(continuitySources.additionalMaps[0].world);
  duplicateSpawns.spawns.push(structuredClone(duplicateSpawns.spawns[0]));
  const spawnResult = importContinuityProject({
    ...continuitySources,
    additionalMaps: [{ ...continuitySources.additionalMaps[0], world: duplicateSpawns }]
  });
  assert.equal(spawnResult.valid, false);
  assert.equal(spawnResult.project, null);
  assert.ok(spawnResult.errors.some((error) => error.pointer === "/spawns/1/id"));

  const duplicateTransitions = structuredClone(continuitySources.additionalMaps[0].world);
  duplicateTransitions.transitions.push(structuredClone(duplicateTransitions.transitions[0]));
  const transitionResult = importContinuityProject({
    ...continuitySources,
    additionalMaps: [{ ...continuitySources.additionalMaps[0], world: duplicateTransitions }]
  });
  assert.equal(transitionResult.valid, false);
  assert.equal(transitionResult.project, null);
  assert.ok(transitionResult.errors.some((error) => error.pointer === "/transitions/1/id"));
});

test("rejects overlapping continuity transition triggers before state", () => {
  const additionalMaps = structuredClone(continuitySources.additionalMaps);
  additionalMaps[0].world.transitions.push({
    ...additionalMaps[0].world.transitions[0],
    id: "second-house-exit"
  });
  const result = importContinuityProject({ ...continuitySources, additionalMaps });
  assert.equal(result.valid, false);
  assert.equal(result.project, null);
  assert.ok(
    result.errors.some(
      (error) => error.pointer === "/transitions/1/object" && error.message.includes("overlaps")
    )
  );
});

test("continuity diagnostics aggregate primary and later-map semantic failures", () => {
  const malformedAdditional = structuredClone(continuitySources.additionalMaps[0].world);
  delete malformedAdditional.kind;
  malformedAdditional.unexpected = true;
  malformedAdditional["a/b~"] = true;
  const malformed = importContinuityProject({
    ...continuitySources,
    additionalMaps: [{ ...continuitySources.additionalMaps[0], world: malformedAdditional }]
  });
  assert.equal(malformed.valid, false);
  assert.equal(malformed.project, null);
  assert.ok(malformed.errors.some((error) => error.pointer === "/kind"));
  assert.ok(malformed.errors.some((error) => error.pointer === "/unexpected"));
  assert.ok(malformed.errors.some((error) => error.pointer === "/a~1b~0"));

  const primary = structuredClone(continuitySources.world);
  primary.additionalSpawns.push(structuredClone(primary.additionalSpawns[0]));
  const additional = structuredClone(continuitySources.additionalMaps[0].world);
  additional.transitions[0].targetSpawn = "missing-spawn";
  const result = importContinuityProject({
    ...continuitySources,
    world: primary,
    additionalMaps: [{ ...continuitySources.additionalMaps[0], world: additional }]
  });
  assert.equal(result.valid, false);
  assert.equal(result.project, null);
  assert.ok(result.errors.some((error) => error.pointer === "/additionalSpawns/1/id"));
  assert.ok(result.errors.some((error) => error.objectId === "missing-spawn"));
});

test("rejects malformed, out-of-bounds, and colliding referenced Tiled objects", () => {
  const malformedMap = structuredClone(sources.map);
  malformedMap.layers.find((layer) => layer.type === "objectgroup").objects[0] = null;
  const malformed = importProject({ ...sources, map: malformedMap });
  assert.equal(malformed.valid, false);
  assert.equal(malformed.world, null);
  assert.ok(malformed.errors.some((error) => error.pointer.includes("/objects/0")));

  const primaryMap = structuredClone(sources.map);
  const primarySpawn = primaryMap.layers
    .flatMap((layer) => layer.objects ?? [])
    .find((object) => object.name === sources.world.spawn);
  primarySpawn.x = primaryMap.width * primaryMap.tilewidth;
  const primary = importProject({ ...sources, map: primaryMap });
  assert.equal(primary.valid, false);
  assert.equal(primary.world, null);
  assert.ok(primary.errors.some((error) => error.pointer === "/spawn"));

  const additionalMap = structuredClone(continuitySources.additionalMaps[0].map);
  const additionalSpawn = additionalMap.layers
    .flatMap((layer) => layer.objects ?? [])
    .find((object) => object.name === "house-entry");
  additionalSpawn.y = additionalMap.height * additionalMap.tileheight;
  const additional = importContinuityProject({
    ...continuitySources,
    additionalMaps: [{ ...continuitySources.additionalMaps[0], map: additionalMap }]
  });
  assert.equal(additional.valid, false);
  assert.equal(additional.project, null);
  assert.ok(additional.errors.some((error) => error.pointer === "/spawns/0/object"));

  const collidingMap = structuredClone(sources.map);
  const primaryObjects = collidingMap.layers.flatMap((layer) => layer.objects ?? []);
  const collidingSpawn = primaryObjects.find((object) => object.name === sources.world.spawn);
  const collision = primaryObjects.find((object) => object.type === "collision");
  collidingSpawn.x = collision.x;
  collidingSpawn.y = collision.y;
  const colliding = importProject({ ...sources, map: collidingMap });
  assert.equal(colliding.valid, false);
  assert.equal(colliding.world, null);
  assert.ok(colliding.errors.some((error) => error.pointer === "/spawn"));

  const collidingTransitionMap = structuredClone(sources.map);
  const transitionObjects = collidingTransitionMap.layers.flatMap((layer) => layer.objects ?? []);
  const collidingTransition = transitionObjects.find((object) => object.type === "transition");
  const transitionCollision = transitionObjects.find((object) => object.type === "collision");
  collidingTransition.x = transitionCollision.x;
  collidingTransition.y = transitionCollision.y;
  const primaryTransition = importProject({ ...sources, map: collidingTransitionMap });
  assert.equal(primaryTransition.valid, false);
  assert.equal(primaryTransition.world, null);
  assert.ok(primaryTransition.errors.some((error) => error.pointer === "/transition/object"));

  const collidingAdditionalMap = structuredClone(continuitySources.additionalMaps[0].map);
  const additionalObjects = collidingAdditionalMap.layers.flatMap((layer) => layer.objects ?? []);
  const additionalTransition = additionalObjects.find((object) => object.type === "transition");
  const additionalCollision = additionalObjects.find((object) => object.type === "collision");
  additionalTransition.x = additionalCollision.x;
  additionalTransition.y = additionalCollision.y;
  const continuityTransition = importContinuityProject({
    ...continuitySources,
    additionalMaps: [{ ...continuitySources.additionalMaps[0], map: collidingAdditionalMap }]
  });
  assert.equal(continuityTransition.valid, false);
  assert.equal(continuityTransition.project, null);
  assert.ok(continuityTransition.errors.some((error) => error.pointer === "/transitions/0/object"));

  const occupiedAdditionalMap = structuredClone(continuitySources.additionalMaps[0].map);
  const occupiedAdditionalObjects = occupiedAdditionalMap.layers.flatMap(
    (layer) => layer.objects ?? []
  );
  const occupiedAdditionalTransition = occupiedAdditionalObjects.find(
    (object) => object.type === "transition"
  );
  const occupiedAdditionalCharacter = occupiedAdditionalObjects.find(
    (object) => object.type === "character"
  );
  occupiedAdditionalTransition.x = occupiedAdditionalCharacter.x;
  occupiedAdditionalTransition.y = occupiedAdditionalCharacter.y;
  const occupiedContinuity = importContinuityProject({
    ...continuitySources,
    additionalMaps: [{ ...continuitySources.additionalMaps[0], map: occupiedAdditionalMap }]
  });
  assert.equal(occupiedContinuity.valid, false);
  assert.equal(occupiedContinuity.project, null);
  assert.ok(occupiedContinuity.errors.some((error) => error.pointer === "/transitions/0/object"));

  const occupiedTransitionMap = structuredClone(sources.map);
  const occupiedObjects = occupiedTransitionMap.layers.flatMap((layer) => layer.objects ?? []);
  const occupiedTransition = occupiedObjects.find((object) => object.type === "transition");
  const occupiedCharacter = occupiedObjects.find((object) => object.type === "character");
  occupiedTransition.x = occupiedCharacter.x;
  occupiedTransition.y = occupiedCharacter.y;
  const occupied = importProject({ ...sources, map: occupiedTransitionMap });
  assert.equal(occupied.valid, false);
  assert.equal(occupied.world, null);
  assert.ok(occupied.errors.some((error) => error.pointer === "/transition/object"));

  const occupiedSpawnMap = structuredClone(sources.map);
  const occupiedSpawnObjects = occupiedSpawnMap.layers.flatMap((layer) => layer.objects ?? []);
  const occupiedSpawn = occupiedSpawnObjects.find((object) => object.name === sources.world.spawn);
  const spawnCharacter = occupiedSpawnObjects.find((object) => object.type === "character");
  occupiedSpawn.x = spawnCharacter.x;
  occupiedSpawn.y = spawnCharacter.y;
  const occupiedPrimarySpawn = importProject({ ...sources, map: occupiedSpawnMap });
  assert.equal(occupiedPrimarySpawn.valid, false);
  assert.equal(occupiedPrimarySpawn.world, null);
  assert.ok(occupiedPrimarySpawn.errors.some((error) => error.pointer === "/spawn"));
});

test("rejects reserved IDs and invisible authored text before state", () => {
  const manifestResult = importProject({
    ...sources,
    manifest: { ...sources.manifest, projectId: "constructor" }
  });
  assert.equal(manifestResult.valid, false);
  assert.equal(manifestResult.world, null);
  assert.ok(manifestResult.errors.some((error) => error.pointer === "/projectId"));

  const continuityResult = importContinuityProject({
    ...continuitySources,
    manifest: {
      ...continuitySources.manifest,
      sources: {
        ...continuitySources.manifest.sources,
        additionalMaps: [
          { ...continuitySources.manifest.sources.additionalMaps[0], id: "prototype" }
        ]
      }
    }
  });
  assert.equal(continuityResult.valid, false);
  assert.equal(continuityResult.project, null);

  const invisibleTitle = importProject({
    ...sources,
    manifest: { ...sources.manifest, title: "\u200b" }
  });
  assert.equal(invisibleTitle.valid, false);
  assert.equal(invisibleTitle.world, null);
  assert.ok(invisibleTitle.errors.some((error) => error.pointer === "/title"));

  const mixedControlTitle = importProject({
    ...sources,
    manifest: { ...sources.manifest, title: "Visible\nInjected" }
  });
  assert.equal(mixedControlTitle.valid, false);
  assert.equal(mixedControlTitle.world, null);
  assert.ok(mixedControlTitle.errors.some((error) => error.pointer === "/title"));
  const lineSeparatorTitle = importProject({
    ...sources,
    manifest: { ...sources.manifest, title: "Visible\u2028Injected" }
  });
  assert.equal(lineSeparatorTitle.valid, false);
  assert.equal(lineSeparatorTitle.world, null);
  assert.ok(lineSeparatorTitle.errors.some((error) => error.pointer === "/title"));
  const bidiControlTitle = importProject({
    ...sources,
    manifest: { ...sources.manifest, title: "Visible\u061cInjected" }
  });
  assert.equal(bidiControlTitle.valid, false);
  assert.equal(bidiControlTitle.world, null);
  assert.ok(bidiControlTitle.errors.some((error) => error.pointer === "/title"));
  assert.equal(
    importProject({
      ...sources,
      manifest: { ...sources.manifest, title: "First Light 👩‍🚀" }
    }).valid,
    true
  );

  const invisibleCharacter = structuredClone(sources.world);
  invisibleCharacter.character.name = " \u200b ";
  const characterResult = importProject({ ...sources, world: invisibleCharacter });
  assert.equal(characterResult.valid, false);
  assert.equal(characterResult.world, null);
  assert.ok(characterResult.errors.some((error) => error.pointer === "/character/name"));

  const invisibleDialogue = structuredClone(sources.campaign);
  invisibleDialogue.dialogue.nodes[0].text = "\t\u200b";
  const dialogueResult = importProject({ ...sources, campaign: invisibleDialogue });
  assert.equal(dialogueResult.valid, false);
  assert.equal(dialogueResult.world, null);
  assert.ok(dialogueResult.errors.some((error) => error.pointer === "/dialogue/nodes/0/text"));

  const visibleUnicode = structuredClone(sources.campaign);
  visibleUnicode.dialogue.nodes[0].text = "Primera línea\nSegunda línea ✨";
  visibleUnicode.creatures[0].name = "Embercub 🔥";
  assert.equal(importProject({ ...sources, campaign: visibleUnicode }).valid, true);
});

test("continuity state crosses both maps and preserves party-aware meaning", async () => {
  const replay = await readJson("campaign-replay.json", testFixture);
  let state = createContinuityState(continuityProject);
  for (const action of replay.actions) {
    state = stepContinuity(continuityProject, state, action).state;
  }
  for (const action of ["move-north", "move-north", "move-east", "move-north"]) {
    state = stepContinuity(continuityProject, state, { type: "world", action }).state;
  }
  assert.equal(state.activeMapId, "lantern-house");
  assert.deepEqual(Object.keys(state.mapStates), ["lantern-vale", "lantern-house"]);

  let result;
  for (const action of ["move-north", "move-north", "move-east", "move-north", "interact"]) {
    result = stepContinuity(continuityProject, state, { type: "world", action });
    state = result.state;
  }
  assert.match(state.mapStates["lantern-house"].message, /Three lights/);
  assert.ok(result);
  assert.equal(result.facts.at(-1).message, state.mapStates["lantern-house"].message);

  for (const action of ["move-south", "move-west", "move-south", "move-south"]) {
    state = stepContinuity(continuityProject, state, { type: "world", action }).state;
  }
  assert.equal(state.activeMapId, "lantern-vale");
  assert.deepEqual(state.mapStates["lantern-vale"].player, {
    x: 3,
    y: 5,
    facing: "south"
  });
});

test("canonical continuity replay crosses both maps with fixed facts and hash", async () => {
  const replay = await readJson("continuity-replay.json");
  const first = runContinuityReplay(continuityProject, replay);
  const second = runContinuityReplay(continuityProject, replay);
  assert.deepEqual(first, second);
  assert.equal(first.stateHash, replay.expectedStateHash);
  assert.equal(first.state.activeMapId, "lantern-vale");
  assert.deepEqual(
    first.facts.filter((fact) => fact.type === "map-left" || fact.type === "map-entered"),
    [
      { type: "map-left", mapId: "lantern-vale", transitionId: "enter-lantern-house" },
      {
        type: "map-entered",
        mapId: "lantern-house",
        spawnId: "house-entry",
        transitionId: "enter-lantern-house"
      },
      { type: "map-left", mapId: "lantern-house", transitionId: "leave-lantern-house" },
      {
        type: "map-entered",
        mapId: "lantern-vale",
        spawnId: "house-return",
        transitionId: "leave-lantern-house"
      }
    ]
  );
});

test("reports missing campaign dialogue and move references with source pointers", async () => {
  const brokenDialogue = await readJson("campaign.broken-dialogue.lumen.json", testFixture);
  const dialogueResult = importProject({ ...sources, campaign: brokenDialogue });
  assert.equal(dialogueResult.valid, false);
  assert.deepEqual(dialogueResult.errors[0], {
    source: "campaign.lumen.json",
    pointer: "/dialogue/start",
    objectId: "missing-node",
    message: "references missing dialogue node"
  });

  const brokenMove = await readJson("campaign.broken-move.lumen.json", testFixture);
  const moveResult = importProject({ ...sources, campaign: brokenMove });
  assert.equal(moveResult.valid, false);
  assert.ok(moveResult.errors.some((error) => error.objectId === "missing-move"));
});

test("rejects ambiguous campaign identities and invalid dialogue reachability", () => {
  const duplicateStarters = structuredClone(sources.campaign);
  duplicateStarters.starters[1] = duplicateStarters.starters[0];
  assert.equal(importProject({ ...sources, campaign: duplicateStarters }).valid, false);

  const duplicateMoves = structuredClone(sources.campaign);
  duplicateMoves.creatures[0].moves[1] = duplicateMoves.creatures[0].moves[0];
  assert.equal(importProject({ ...sources, campaign: duplicateMoves }).valid, false);

  const duplicateChoices = structuredClone(sources.campaign);
  duplicateChoices.dialogue.nodes[0].choices[1].id =
    duplicateChoices.dialogue.nodes[0].choices[0].id;
  const choiceResult = importProject({ ...sources, campaign: duplicateChoices });
  assert.equal(choiceResult.valid, false);
  assert.ok(choiceResult.errors.some((error) => error.message.includes("duplicated")));

  const starterEncounter = structuredClone(sources.campaign);
  starterEncounter.encounter.creature = starterEncounter.starters[0];
  const encounterResult = importProject({ ...sources, campaign: starterEncounter });
  assert.equal(encounterResult.valid, false);
  assert.ok(encounterResult.errors.some((error) => error.pointer === "/encounter/creature"));

  const encounterChoice = structuredClone(sources.campaign);
  encounterChoice.dialogue.nodes[0].choices[0].creature = encounterChoice.encounter.creature;
  const encounterChoiceResult = importProject({ ...sources, campaign: encounterChoice });
  assert.equal(encounterChoiceResult.valid, false);
  assert.ok(
    encounterChoiceResult.errors.some((error) =>
      error.message.includes("must reference a declared starter")
    )
  );

  const unreachableStarter = structuredClone(sources.campaign);
  unreachableStarter.dialogue.nodes[0].choices[1].creature = unreachableStarter.starters[0];
  const unreachableResult = importProject({ ...sources, campaign: unreachableStarter });
  assert.equal(unreachableResult.valid, false);
  assert.ok(
    unreachableResult.errors.some((error) => error.message.includes("no companion choice"))
  );

  const disconnectedDialogue = structuredClone(sources.campaign);
  disconnectedDialogue.dialogue.start = disconnectedDialogue.dialogue.nodes[1].id;
  const disconnectedResult = importProject({ ...sources, campaign: disconnectedDialogue });
  assert.equal(disconnectedResult.valid, false);
  assert.ok(disconnectedResult.errors.some((error) => error.message.includes("is unreachable")));
  assert.ok(
    disconnectedResult.errors.some((error) => error.message.includes("no companion choice"))
  );

  const trappedDialogue = structuredClone(sources.campaign);
  for (const node of trappedDialogue.dialogue.nodes)
    for (const choice of node.choices) choice.next = trappedDialogue.dialogue.start;
  const trappedResult = importProject({ ...sources, campaign: trappedDialogue });
  assert.equal(trappedResult.valid, false);
  assert.ok(
    trappedResult.errors.some((error) =>
      error.message.includes("cannot reach a closing dialogue choice")
    )
  );

  const contradictoryClose = structuredClone(sources.campaign);
  const closeChoice = contradictoryClose.dialogue.nodes[1].choices[0];
  closeChoice.next = contradictoryClose.dialogue.start;
  closeChoice.creature = contradictoryClose.starters[0];
  const closeResult = importProject({ ...sources, campaign: contradictoryClose });
  assert.equal(closeResult.valid, false);
  assert.equal(
    closeResult.errors.filter((error) => error.message.includes("absent for close-dialogue"))
      .length,
    2
  );
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
  const replay = await readJson("campaign-replay.json", testFixture);
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
  const replay = await readJson("campaign-loss-replay.json", testFixture);
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
  assert.equal(result.errors[0].pointer, "/unexpected");
  assert.match(result.errors[0].message, /additional properties/);
});

test("reports a missing stable Tiled object and its Lumen source pointer", async () => {
  const broken = await readJson("world.broken.lumen.json", testFixture);
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
  const replay = await readJson("replay.json", testFixture);
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

async function readJson(name, base = fixture) {
  return JSON.parse(await readFile(new URL(name, base), "utf8"));
}

async function listFiles(root, prefix = "") {
  const files = [];
  for (const entry of await readdir(new URL(prefix || ".", root), { withFileTypes: true })) {
    const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory()) files.push(...(await listFiles(root, `${relative}/`)));
    else files.push(relative);
  }
  return files.sort();
}
