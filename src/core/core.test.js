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
    message: "senderos de sauces"
  },
  {
    directory: "tideglass-reach",
    projectId: "tideglass-reach",
    targetMap: "signal-tower",
    message: "cristal marino"
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

    const save = game.createSave();
    const saved = game.getState();
    game.dispatch({ type: "move", direction: "north" });
    assert.notDeepEqual(game.getState(), saved);
    assert.deepEqual(game.restoreSave(save), saved);

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
});

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
