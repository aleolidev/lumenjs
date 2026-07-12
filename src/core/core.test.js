import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createGame } from "../../dist-package/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

for (const fixture of [
  {
    directory: "willowbound",
    projectId: "willowbound",
    targetMap: "starglass-workshop",
    message: "senderos de sauces",
    choiceId: "take-bramblefin",
    companionId: "bramblefin",
    nextNode: "trail-ready"
  },
  {
    directory: "tideglass-reach",
    projectId: "tideglass-reach",
    targetMap: "signal-tower",
    message: "cristal marino",
    choiceId: "take-kitehare",
    companionId: "gustling",
    nextNode: "tower-ready"
  }
]) {
  test(`${fixture.projectId} uses the TypeScript core for movement, interaction, transition, and save`, async () => {
    const options = await loadFixture(fixture.directory, "es");
    const game = createGame(options);
    assert.equal(game.projectId, fixture.projectId);
    assert.equal(game.getState().activeMapId, options.manifest.startMap);

    game.dispatch({ type: "move", direction: "north" });
    game.dispatch({ type: "move", direction: "east" });
    const interaction = game.dispatch({ type: "interact" });
    assert.equal(interaction.facts[0].type, "character-spoke");
    const message = interaction.state.mapStates[interaction.state.activeMapId].message;
    assert.ok(message);
    assert.match(message, new RegExp(fixture.message, "i"));
    assert.equal(interaction.state.dialogue?.choices.length, 2);
    assert.ok(interaction.state.dialogue?.choices.every((choice) => choice.label.length > 0));

    const choice = game.dispatch({ type: "choose", choiceId: fixture.choiceId });
    assert.deepEqual(choice.state.party, [fixture.companionId]);
    assert.equal(choice.state.dialogue?.nodeId, fixture.nextNode);
    assert.deepEqual(
      choice.facts.map((fact) => fact.type),
      ["dialogue-choice-selected", "companion-chosen", "dialogue-advanced"]
    );

    const save = game.createSave();
    const saved = game.getState();
    game.dispatch({ type: "choose", choiceId: "close-ready" });
    assert.notDeepEqual(game.getState(), saved);
    assert.deepEqual(game.restoreSave(save), saved);
    const close = game.dispatch({ type: "choose", choiceId: "close-ready" });
    assert.equal(close.state.dialogue, null);
    assert.deepEqual(close.state.party, [fixture.companionId]);

    game.dispatch({ type: "move", direction: "north" });
    let transition;
    for (let index = 0; index < 4; index += 1)
      transition = game.dispatch({ type: "move", direction: "east" });
    assert.equal(game.getState().activeMapId, fixture.targetMap);
    assert.ok(transition);
    assert.ok(transition.facts.some((fact) => fact.type === "map-entered"));
  });
}

test("save validation rejects cross-project and malformed state without mutation", async () => {
  const willow = createGame(await loadFixture("willowbound", "en"));
  const tideglass = createGame(await loadFixture("tideglass-reach", "en"));
  const before = tideglass.getState();
  assert.throws(() => tideglass.restoreSave(willow.createSave()), /different project identity/);
  assert.deepEqual(tideglass.getState(), before);

  const malformed = tideglass.createSave();
  malformed.snapshot.mapStates[malformed.snapshot.activeMapId].player.x = -1;
  assert.throws(() => tideglass.restoreSave(malformed), /Save player state is invalid/);
  assert.deepEqual(tideglass.getState(), before);

  const forgedMessage = tideglass.createSave();
  forgedMessage.snapshot.mapStates[forgedMessage.snapshot.activeMapId].message = "forged";
  assert.throws(() => tideglass.restoreSave(forgedMessage), /Save player state is invalid/);
  assert.deepEqual(tideglass.getState(), before);

  const extraField = tideglass.createSave();
  Object.assign(extraField.snapshot, { debug: true });
  assert.throws(() => tideglass.restoreSave(extraField), /unexpected fields/);
  assert.deepEqual(tideglass.getState(), before);

  const forgedParty = tideglass.createSave();
  forgedParty.snapshot.party = ["bramblefin"];
  assert.throws(() => tideglass.restoreSave(forgedParty), /Save snapshot is invalid/);
  assert.deepEqual(tideglass.getState(), before);

  const unreachableParty = tideglass.createSave();
  unreachableParty.snapshot.party = ["beacon-mite"];
  assert.throws(() => tideglass.restoreSave(unreachableParty), /Save snapshot is invalid/);
  assert.deepEqual(tideglass.getState(), before);

  tideglass.dispatch({ type: "move", direction: "north" });
  tideglass.dispatch({ type: "move", direction: "east" });
  tideglass.dispatch({ type: "interact" });
  const forgedDialogue = tideglass.createSave();
  assert.ok(forgedDialogue.snapshot.dialogue);
  forgedDialogue.snapshot.dialogue.message = "forged";
  const openBefore = tideglass.getState();
  assert.throws(() => tideglass.restoreSave(forgedDialogue), /Save dialogue state is invalid/);
  assert.deepEqual(tideglass.getState(), openBefore);
});

test("dialogue actions enforce mode, choice identity, and isolated snapshots", async () => {
  const game = createGame(await loadFixture("willowbound", "en"));
  assert.throws(
    () => game.dispatch({ type: "choose", choiceId: "take-bramblefin" }),
    /No dialogue/
  );
  game.dispatch({ type: "move", direction: "north" });
  game.dispatch({ type: "move", direction: "east" });
  const opened = game.dispatch({ type: "interact" });
  assert.ok(opened.state.dialogue);
  opened.state.dialogue.choices[0].label = "mutated";
  const isolated = game.getState();
  assert.ok(isolated.dialogue);
  assert.notEqual(isolated.dialogue.choices[0].label, "mutated");
  const before = game.getState();
  assert.throws(
    () => game.dispatch({ type: "move", direction: "north" }),
    /Dialogue must be closed/
  );
  assert.throws(() => game.dispatch({ type: "choose", choiceId: "constructor" }), /not available/);
  assert.deepEqual(game.getState(), before);
});

test("save validation keeps companion state on a reachable dialogue branch", async () => {
  const options = await loadFixture("willowbound", "en");
  const campaign = /** @type {import("./index.js").CampaignDocument} */ (
    options.documents[options.manifest.sources.campaign]
  );
  campaign.dialogue.nodes[0].choices[0].next = "bramble-only";
  campaign.dialogue.nodes.push({
    id: "bramble-only",
    speaker: "Oren",
    messageKey: "ready-response",
    choices: [{ id: "close-bramble", labelKey: "ready-response", effect: "close-dialogue" }]
  });
  const game = createGame(options);
  game.dispatch({ type: "move", direction: "north" });
  game.dispatch({ type: "move", direction: "east" });
  game.dispatch({ type: "interact" });
  game.dispatch({ type: "choose", choiceId: "take-bramblefin" });
  const forged = game.createSave();
  forged.snapshot.party = ["kitehare"];
  const before = game.getState();
  assert.throws(() => game.restoreSave(forged), /Save dialogue state is invalid/);
  assert.deepEqual(game.getState(), before);
});

for (const fixture of [
  {
    directory: "willowbound",
    choiceId: "take-bramblefin",
    moveId: "reed-rush",
    encounterId: "workshop-prismole",
    enemyId: "prismole"
  },
  {
    directory: "tideglass-reach",
    choiceId: "take-kitehare",
    moveId: "skybound-hop",
    encounterId: "tower-beacon-mite",
    enemyId: "beacon-mite"
  }
]) {
  test(`${fixture.directory} completes its own deterministic encounter`, async () => {
    const game = createGame(await loadFixture(fixture.directory, "en"));
    reachSecondMap(game, fixture.choiceId);
    const started = game.dispatch({ type: "move", direction: "east" });
    assert.equal(started.state.battle?.encounterId, fixture.encounterId);
    assert.equal(started.state.battle?.enemy.id, fixture.enemyId);
    assert.deepEqual(
      started.facts.map((fact) => fact.type),
      ["player-moved", "encounter-started"]
    );
    started.state.battle.enemy.name = "mutated";
    assert.notEqual(game.getState().battle?.enemy.name, "mutated");
    const first = game.dispatch({ type: "use-move", moveId: fixture.moveId });
    assert.deepEqual(
      first.facts.slice(0, 4).map((fact) => fact.type),
      ["battle-move-used", "battle-damage-dealt", "battle-move-used", "battle-damage-dealt"]
    );
    const saved = game.createSave();
    const firstRemainder = finishActiveBattle(game, fixture.moveId);
    const firstVictory = game.getState();
    assert.equal(firstVictory.battle?.outcome, "victory");
    game.restoreSave(saved);
    const secondRemainder = finishActiveBattle(game, fixture.moveId);
    assert.deepEqual(secondRemainder, firstRemainder);
    assert.deepEqual(game.getState(), firstVictory);
    const finished = game.dispatch({ type: "finish-battle" });
    assert.equal(finished.state.battle, null);
    assert.deepEqual(finished.state.completedEncounters, [fixture.encounterId]);
    game.dispatch({ type: "move", direction: "west" });
    const crossed = game.dispatch({ type: "move", direction: "east" });
    assert.equal(crossed.state.battle, null);
    assert.ok(crossed.facts.every((fact) => fact.type !== "encounter-started"));
  });
}

test("encounters require a companion and defeat resets for a retry", async () => {
  const noParty = createGame({
    ...(await loadFixture("willowbound", "en")),
    focus: { map: "starglass-workshop", spawn: "workshop-entry", locale: "en" }
  });
  const required = noParty.dispatch({ type: "move", direction: "east" });
  assert.equal(required.facts[0].type, "encounter-companion-required");
  assert.deepEqual(required.state.mapStates[required.state.activeMapId].player, {
    x: 2,
    y: 4,
    facing: "east"
  });

  const options = await loadFixture("willowbound", "en");
  const campaign = /** @type {import("./index.js").CampaignDocument} */ (
    options.documents[options.manifest.sources.campaign]
  );
  const bramblefin = campaign.creatures.find((creature) => creature.id === "bramblefin");
  assert.ok(bramblefin);
  bramblefin.health = 4;
  bramblefin.speed = 1;
  const game = createGame(options);
  reachSecondMap(game, "take-bramblefin");
  game.dispatch({ type: "move", direction: "east" });
  const lost = game.dispatch({ type: "use-move", moveId: "reed-rush" });
  assert.equal(lost.state.battle?.outcome, "defeat");
  assert.deepEqual(
    lost.facts.map((fact) => fact.type),
    ["battle-move-used", "battle-damage-dealt", "battle-lost"]
  );
  const reset = game.dispatch({ type: "finish-battle" });
  assert.equal(reset.state.battle, null);
  assert.deepEqual(reset.state.completedEncounters, []);
  assert.deepEqual(reset.state.mapStates[reset.state.activeMapId].player, {
    x: 2,
    y: 4,
    facing: "south"
  });
});

test("an exhausted enemy move skips deterministically without inventing another move", async () => {
  const options = await loadFixture("willowbound", "en");
  const campaign = /** @type {import("./index.js").CampaignDocument} */ (
    options.documents[options.manifest.sources.campaign]
  );
  const enemyMove = campaign.moves.find((move) => move.id === "reed-rush");
  assert.ok(enemyMove);
  enemyMove.uses = 1;
  const game = createGame(options);
  reachSecondMap(game, "take-kitehare");
  game.dispatch({ type: "move", direction: "east" });
  game.dispatch({ type: "use-move", moveId: "skybound-hop" });
  const exhausted = game.dispatch({ type: "use-move", moveId: "skybound-hop" });
  assert.ok(exhausted.facts.some((fact) => fact.type === "battle-enemy-exhausted"));
  assert.equal(exhausted.state.battle?.ally.health, 12);
});

test("battle saves reject forged or unreachable state without mutation", async () => {
  const game = createGame(await loadFixture("tideglass-reach", "en"));
  reachSecondMap(game, "take-kitehare");
  game.dispatch({ type: "move", direction: "east" });
  game.dispatch({ type: "use-move", moveId: "skybound-hop" });
  const before = game.getState();
  const forged = game.createSave();
  assert.ok(forged.snapshot.battle);
  forged.snapshot.battle.enemy.health -= 1;
  assert.throws(() => game.restoreSave(forged), /Save battle state is invalid/);
  assert.deepEqual(game.getState(), before);

  const completed = game.createSave();
  completed.snapshot.completedEncounters = ["tower-beacon-mite"];
  assert.throws(() => game.restoreSave(completed), /Save battle state is invalid/);
  assert.deepEqual(game.getState(), before);

  assert.throws(
    () => game.dispatch({ type: "move", direction: "west" }),
    /Battle must be finished/
  );
  assert.throws(() => game.dispatch({ type: "finish-battle" }), /Active battle cannot be finished/);
  assert.throws(() => game.dispatch({ type: "use-move", moveId: "constructor" }), /not available/);
  assert.deepEqual(game.getState(), before);
});

function reachSecondMap(game, choiceId) {
  game.dispatch({ type: "move", direction: "north" });
  game.dispatch({ type: "move", direction: "east" });
  game.dispatch({ type: "interact" });
  game.dispatch({ type: "choose", choiceId });
  game.dispatch({ type: "choose", choiceId: "close-ready" });
  game.dispatch({ type: "move", direction: "north" });
  for (let index = 0; index < 4; index += 1) game.dispatch({ type: "move", direction: "east" });
}

function finishActiveBattle(game, moveId) {
  const facts = [];
  while (game.getState().battle?.outcome === "active")
    facts.push(game.dispatch({ type: "use-move", moveId }).facts);
  return facts;
}

async function loadFixture(directory, locale) {
  const base = path.join(root, "examples", directory);
  const manifest = await readJson(path.join(base, "project.lumen.json"));
  /** @type {Record<string, unknown>} */
  const documents = {};
  for (const entry of manifest.sources.maps) {
    documents[entry.map] = await readJson(path.join(base, entry.map));
    documents[entry.world] = await readJson(path.join(base, entry.world));
  }
  documents[manifest.sources.campaign] = await readJson(path.join(base, manifest.sources.campaign));
  for (const source of Object.values(manifest.sources.locales?.catalogs ?? {}))
    documents[source] = await readJson(path.join(base, source));
  return { manifest, documents, focus: { locale } };
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}
