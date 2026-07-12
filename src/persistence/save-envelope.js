const currentFormat = "lumen-save-v2";
const supportedSourceVersions = {
  "lumen-save-v1": "0.2.0"
};
const campaignWorldMessages = {
  "Glintail joined the party.": "victory",
  "Mira smiles as Glintail's new light joins your party.": "victory",
  "Mira welcomes you home. The trail will wait until you are ready.": "loss"
};

export function canonicalJson(value) {
  return JSON.stringify(sortValue(value));
}

export async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `sha256-v1:${[...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

export async function hashSnapshot(snapshot) {
  return sha256(canonicalJson(snapshot));
}

export async function createSaveEnvelope(project, snapshot, metadata) {
  const errors = validateContinuitySnapshot(project, snapshot);
  if (errors.length > 0) throw new SaveValidationError(errors);
  const cleanSnapshot = structuredClone(snapshot);
  const envelope = {
    format: currentFormat,
    saveFormatVersion: 2,
    projectId: project.id,
    projectVersion: project.version,
    saveId: metadata.saveId,
    createdAt: metadata.createdAt,
    snapshot: cleanSnapshot,
    snapshotHash: await hashSnapshot(cleanSnapshot)
  };
  const structural = validateEnvelopeStructure(envelope);
  if (structural.length > 0) throw new SaveValidationError(structural);
  return envelope;
}

export async function validateAndMigrateEnvelope(project, input) {
  const original = structuredClone(input);
  const structural = validateEnvelopeStructure(original);
  if (structural.length > 0) throw new SaveValidationError(structural);
  if (original.projectId !== project.id) {
    throw new SaveValidationError([issue("/projectId", `expected '${project.id}'`)]);
  }
  const expectedProjectVersion =
    original.format === currentFormat ? project.version : supportedSourceVersions[original.format];
  if (original.projectVersion !== expectedProjectVersion) {
    throw new SaveValidationError([
      issue(
        "/projectVersion",
        `expected project version '${expectedProjectVersion}' for '${original.format}'`
      )
    ]);
  }
  if (original.format === "lumen-save-v1") {
    const legacyStructural = validateLegacySnapshotStructure(original.snapshot);
    if (legacyStructural.length > 0) throw new SaveValidationError(legacyStructural);
  }
  const expectedHash = await hashSnapshot(original.snapshot);
  if (original.snapshotHash !== expectedHash) {
    throw new SaveValidationError([issue("/snapshotHash", "does not match the campaign snapshot")]);
  }

  let envelope = original;
  let migration = null;
  if (original.format === "lumen-save-v1") {
    const snapshot = migrateV1Snapshot(original.snapshot);
    envelope = await createSaveEnvelope(project, snapshot, {
      saveId: original.saveId,
      createdAt: original.createdAt
    });
    migration = { from: 1, to: 2, sourceFormat: original.format, resultingFormat: currentFormat };
  }
  const semantic = validateContinuitySnapshot(project, envelope.snapshot);
  if (semantic.length > 0) throw new SaveValidationError(semantic);
  return { envelope, migration };
}

export function migrateV1Snapshot(snapshot) {
  const legacy = structuredClone(snapshot);
  return {
    format: "lumen-campaign-state-v2",
    mode: legacy.mode,
    activeMapId: "lantern-vale",
    mapStates: { "lantern-vale": legacy.world },
    dialogue: legacy.dialogue,
    party: legacy.party,
    inventory: legacy.inventory,
    battle: legacy.battle,
    outcome: legacy.outcome
  };
}

export function projectV2SnapshotToV1(snapshot) {
  return {
    format: "lumen-campaign-state-v1",
    mode: snapshot.mode,
    world: snapshot.mapStates["lantern-vale"],
    dialogue: snapshot.dialogue,
    party: snapshot.party,
    inventory: snapshot.inventory,
    battle: snapshot.battle,
    outcome: snapshot.outcome
  };
}

export function validateContinuitySnapshot(project, snapshot) {
  const errors = [];
  if (!isRecord(snapshot)) return [issue("/snapshot", "must be an object")];
  exactKeys(
    snapshot,
    [
      "format",
      "mode",
      "activeMapId",
      "mapStates",
      "dialogue",
      "party",
      "inventory",
      "battle",
      "outcome"
    ],
    "/snapshot",
    errors
  );
  if (snapshot.format !== "lumen-campaign-state-v2")
    errors.push(issue("/snapshot/format", "must be v2"));
  if (!Object.hasOwn(project.mapsById, snapshot.activeMapId))
    errors.push(issue("/snapshot/activeMapId", "references an unknown map"));
  if (!isRecord(snapshot.mapStates) || !Object.hasOwn(snapshot.mapStates, snapshot.activeMapId)) {
    errors.push(issue("/snapshot/mapStates", "must contain the active map"));
  } else {
    for (const [mapId, state] of Object.entries(snapshot.mapStates)) {
      const world = Object.hasOwn(project.mapsById, mapId) ? project.mapsById[mapId] : null;
      const mapPointer = childPointer("/snapshot/mapStates", mapId);
      if (!world) errors.push(issue(mapPointer, "references an unknown map"));
      else validateWorldState(world, state, mapPointer, snapshot, errors);
    }
    if (!snapshot.mapStates[project.startMapId])
      errors.push(issue("/snapshot/mapStates", "must retain the project start map"));
    if (
      snapshot.outcome === null &&
      Object.keys(snapshot.mapStates).some((mapId) => mapId !== project.startMapId)
    )
      errors.push(issue("/snapshot/mapStates", "cannot contain secondary maps before a result"));
  }
  if (!["world", "dialogue", "battle", "result"].includes(snapshot.mode))
    errors.push(issue("/snapshot/mode", "is invalid"));
  if (
    !Array.isArray(snapshot.party) ||
    snapshot.party.some((id) => !Object.hasOwn(project.campaign.creaturesById, id)) ||
    new Set(snapshot.party).size !== snapshot.party.length ||
    snapshot.party.length > (project.campaign.encounter.recruitAfterVictory ? 2 : 1)
  ) {
    errors.push(issue("/snapshot/party", "must contain an authored-size set of unique creatures"));
  }
  if (
    !isRecord(snapshot.inventory) ||
    !Number.isInteger(snapshot.inventory.sunberry) ||
    snapshot.inventory.sunberry < 0 ||
    snapshot.inventory.sunberry > project.campaign.inventory.sunberry
  ) {
    errors.push(issue("/snapshot/inventory/sunberry", "must be within the authored inventory"));
  } else {
    exactKeys(snapshot.inventory, ["sunberry"], "/snapshot/inventory", errors);
    if (
      snapshot.battle === null &&
      snapshot.outcome === null &&
      snapshot.inventory.sunberry !== project.campaign.inventory.sunberry
    )
      errors.push(
        issue("/snapshot/inventory/sunberry", "must match the authored inventory before battle")
      );
  }
  if (snapshot.outcome !== null && !["victory", "loss"].includes(snapshot.outcome))
    errors.push(issue("/snapshot/outcome", "is invalid"));
  if (snapshot.mode === "result" && !["victory", "loss"].includes(snapshot.outcome))
    errors.push(issue("/snapshot/outcome", "is required in result mode"));
  if (["dialogue", "battle"].includes(snapshot.mode) && snapshot.outcome !== null)
    errors.push(issue("/snapshot/outcome", `must be null in ${snapshot.mode} mode`));
  if (Array.isArray(snapshot.party)) {
    const encounterCreature = project.campaign.encounter.creature;
    const starterIds = new Set(project.campaign.starters);
    const starters = snapshot.party.filter((id) => starterIds.has(id));
    if (snapshot.outcome === "victory" && !snapshot.party.includes(encounterCreature))
      errors.push(issue("/snapshot/party", "must contain the recruited encounter creature"));
    if (
      project.campaign.encounter.recruitAfterVictory &&
      snapshot.outcome !== "victory" &&
      snapshot.party.includes(encounterCreature)
    )
      errors.push(issue("/snapshot/party", "cannot contain the encounter creature before victory"));
    if (
      snapshot.outcome === "victory" &&
      project.campaign.encounter.recruitAfterVictory &&
      (snapshot.party.length !== 2 || starters.length !== 1)
    )
      errors.push(
        issue(
          "/snapshot/party",
          "must contain one starter and the recruited encounter creature after victory"
        )
      );
    if (snapshot.outcome === "loss" && (snapshot.party.length !== 1 || starters.length !== 1))
      errors.push(issue("/snapshot/party", "must contain the chosen starter after loss"));
    if (snapshot.mode === "battle" && (snapshot.party.length !== 1 || starters.length !== 1))
      errors.push(issue("/snapshot/party", "must contain the chosen starter during battle"));
  }
  validateDialogue(project, snapshot, errors);
  validateBattle(project, snapshot, errors);
  return errors;
}

export class SaveValidationError extends Error {
  constructor(issues) {
    super(issues.map((item) => `${item.pointer}: ${item.message}`).join("; "));
    this.name = "SaveValidationError";
    this.issues = issues;
  }
}

function validateEnvelopeStructure(value) {
  if (!isRecord(value)) return [issue("/", "must be an object")];
  const errors = [];
  exactKeys(
    value,
    [
      "format",
      "saveFormatVersion",
      "projectId",
      "projectVersion",
      "saveId",
      "createdAt",
      "snapshot",
      "snapshotHash"
    ],
    "",
    errors
  );
  if (!["lumen-save-v1", currentFormat].includes(value.format))
    errors.push(issue("/format", "is unsupported"));
  const expectedVersion = value.format === "lumen-save-v1" ? 1 : 2;
  if (value.saveFormatVersion !== expectedVersion)
    errors.push(issue("/saveFormatVersion", `must be ${expectedVersion}`));
  for (const key of ["projectId", "projectVersion", "saveId", "createdAt", "snapshotHash"]) {
    if (typeof value[key] !== "string" || value[key].length === 0)
      errors.push(issue(`/${key}`, "must be a non-empty string"));
  }
  if (typeof value.createdAt === "string" && !isCanonicalTimestamp(value.createdAt))
    errors.push(issue("/createdAt", "must be a canonical UTC timestamp"));
  if (!isRecord(value.snapshot)) errors.push(issue("/snapshot", "must be an object"));
  return errors;
}

function validateLegacySnapshotStructure(snapshot) {
  if (!isRecord(snapshot)) return [issue("/snapshot", "must be an object")];
  const errors = [];
  exactKeys(
    snapshot,
    ["format", "mode", "world", "dialogue", "party", "inventory", "battle", "outcome"],
    "/snapshot",
    errors
  );
  if (snapshot.format !== "lumen-campaign-state-v1")
    errors.push(issue("/snapshot/format", "must be the v1 campaign state"));
  return errors;
}

function validateWorldState(world, state, pointer, snapshot, errors) {
  if (!isRecord(state)) return errors.push(issue(pointer, "must be an object"));
  exactKeys(
    state,
    ["format", "tick", "player", "flags", "message", "transitions"],
    pointer,
    errors
  );
  if (state.format !== "lumen-first-light-state-v1")
    errors.push(issue(`${pointer}/format`, "is unsupported"));
  if (
    !isRecord(state.player) ||
    !Number.isInteger(state.player.x) ||
    !Number.isInteger(state.player.y)
  ) {
    errors.push(issue(`${pointer}/player`, "must contain integer coordinates"));
  } else {
    exactKeys(state.player, ["x", "y", "facing"], `${pointer}/player`, errors);
    if (!["north", "south", "west", "east"].includes(state.player.facing))
      errors.push(issue(`${pointer}/player/facing`, "is invalid"));
    if (
      state.player.x < 0 ||
      state.player.y < 0 ||
      state.player.x >= world.map.width ||
      state.player.y >= world.map.height
    ) {
      errors.push(issue(`${pointer}/player`, "is outside the map"));
    } else if (world.collisions.some((rectangle) => contains(rectangle, state.player))) {
      errors.push(issue(`${pointer}/player`, "is inside authored collision"));
    }
  }
  if (!Number.isInteger(state.tick) || state.tick < 0)
    errors.push(issue(`${pointer}/tick`, "must be a non-negative integer"));
  if (
    !isRecord(state.flags) ||
    Object.values(state.flags).some((value) => typeof value !== "boolean")
  )
    errors.push(issue(`${pointer}/flags`, "must contain boolean values"));
  else {
    const allowedFlags = new Set(world.beacon ? [world.beacon.stateKey] : []);
    if (world.beacon && !Object.hasOwn(state.flags, world.beacon.stateKey))
      errors.push(
        issue(childPointer(`${pointer}/flags`, world.beacon.stateKey), "is required for this map")
      );
    if (
      world.beacon &&
      state.flags[world.beacon.stateKey] === true &&
      (!Number.isInteger(state.tick) || state.tick < 1)
    )
      errors.push(
        issue(
          childPointer(`${pointer}/flags`, world.beacon.stateKey),
          "cannot be set before the first map tick"
        )
      );
    for (const key of Object.keys(state.flags))
      if (!allowedFlags.has(key))
        errors.push(issue(childPointer(`${pointer}/flags`, key), "is not authored for this map"));
  }
  if (state.message !== null && typeof state.message !== "string")
    errors.push(issue(`${pointer}/message`, "must be a string or null"));
  else if (typeof state.message === "string") {
    if (!Number.isInteger(state.tick) || state.tick < 1)
      errors.push(issue(`${pointer}/message`, "cannot exist before the first map tick"));
    const authoredMessages = new Set(
      [
        world.character?.messageBefore,
        world.character?.messageAfter,
        world.character?.message,
        world.character?.messageWithGlintail,
        ...Object.keys(campaignWorldMessages)
      ].filter((value) => typeof value === "string")
    );
    if (!authoredMessages.has(state.message))
      errors.push(issue(`${pointer}/message`, "must be a recognized campaign message"));
    else if (
      Object.hasOwn(campaignWorldMessages, state.message) &&
      campaignWorldMessages[state.message] !== snapshot.outcome
    )
      errors.push(issue(`${pointer}/message`, "does not match the campaign outcome"));
    else if (
      state.message === world.character?.messageWithGlintail &&
      (!Array.isArray(snapshot.party) || !snapshot.party.includes("glintail"))
    )
      errors.push(issue(`${pointer}/message`, "requires Glintail in the saved party"));
    if (world.beacon && state.flags?.[world.beacon.stateKey] !== true)
      errors.push(issue(`${pointer}/message`, "requires the authored beacon flag"));
  }
  if (!Number.isInteger(state.transitions) || state.transitions < 0)
    errors.push(issue(`${pointer}/transitions`, "must be a non-negative integer"));
  else if (Number.isInteger(state.tick) && state.transitions > state.tick)
    errors.push(issue(`${pointer}/transitions`, "cannot exceed the map tick count"));
}

function validateDialogue(project, snapshot, errors) {
  if (snapshot.mode !== "dialogue") {
    if (snapshot.dialogue !== null)
      errors.push(issue("/snapshot/dialogue", "must be null outside dialogue mode"));
    return;
  }
  if (!isRecord(snapshot.dialogue)) {
    errors.push(issue("/snapshot/dialogue", "is required in dialogue mode"));
    return;
  }
  exactKeys(snapshot.dialogue, ["nodeId"], "/snapshot/dialogue", errors);
  if (!Object.hasOwn(project.campaign.dialogue.nodesById, snapshot.dialogue.nodeId)) {
    errors.push(issue("/snapshot/dialogue/nodeId", "references an unknown dialogue node"));
    return;
  }
  if (Array.isArray(snapshot.party)) {
    const allowed = dialogueSelectionStates(project.campaign.dialogue).get(
      snapshot.dialogue.nodeId
    );
    if (!allowed?.has(snapshot.party.length > 0))
      errors.push(
        issue(
          "/snapshot/party",
          "does not match the reachable companion-selection state of the dialogue node"
        )
      );
  }
}

function dialogueSelectionStates(dialogue) {
  const states = new Map();
  /** @type {Array<[string, boolean]>} */
  const pending = [[dialogue.start, false]];
  while (pending.length > 0) {
    const current = pending.shift();
    if (!current) break;
    const [nodeId, selected] = current;
    const values = states.get(nodeId) ?? new Set();
    if (values.has(selected)) continue;
    values.add(selected);
    states.set(nodeId, values);
    const node = dialogue.nodesById[nodeId];
    for (const choice of node.choices) {
      if (choice.next)
        pending.push([choice.next, selected || choice.effect === "choose-companion"]);
    }
  }
  return states;
}

function validateBattle(project, snapshot, errors) {
  if (snapshot.battle === null) {
    if (snapshot.mode === "battle" || snapshot.mode === "result")
      errors.push(issue("/snapshot/battle", "is required in battle/result mode"));
    return;
  }
  if (!isRecord(snapshot.battle)) {
    errors.push(issue("/snapshot/battle", "must be an object or null"));
    return;
  }
  if (snapshot.mode === "dialogue" || (snapshot.mode === "world" && snapshot.outcome === null))
    errors.push(issue("/snapshot/battle", `must be null in ${snapshot.mode} mode before a result`));
  exactKeys(snapshot.battle, ["encounter", "turn", "ally", "opponent"], "/snapshot/battle", errors);
  if (snapshot.battle.encounter !== project.campaign.encounter.id)
    errors.push(issue("/snapshot/battle/encounter", "references an unknown encounter"));
  if (!Number.isInteger(snapshot.battle.turn) || snapshot.battle.turn < 0)
    errors.push(issue("/snapshot/battle/turn", "must be a non-negative integer"));
  else if (snapshot.outcome !== null && snapshot.battle.turn < 1)
    errors.push(issue("/snapshot/battle/turn", "must include a completed turn after an outcome"));
  validateBattleCreature(project, snapshot.battle.ally, "/snapshot/battle/ally", errors);
  validateBattleCreature(project, snapshot.battle.opponent, "/snapshot/battle/opponent", errors);
  validateBattleActionHistory(project, snapshot, errors);
  if (
    isRecord(snapshot.battle.ally) &&
    Array.isArray(snapshot.party) &&
    !snapshot.party.includes(snapshot.battle.ally.id)
  )
    errors.push(issue("/snapshot/battle/ally/id", "must belong to the saved party"));
  if (
    isRecord(snapshot.battle.ally) &&
    !project.campaign.starters.includes(snapshot.battle.ally.id)
  )
    errors.push(issue("/snapshot/battle/ally/id", "must be an authored starter"));
  if (
    isRecord(snapshot.battle.opponent) &&
    snapshot.battle.opponent.id !== project.campaign.encounter.creature
  )
    errors.push(issue("/snapshot/battle/opponent/id", "must match the encounter creature"));
  if (isRecord(snapshot.battle.ally) && isRecord(snapshot.battle.opponent)) {
    const allyDefeated = snapshot.battle.ally.health === 0;
    const opponentDefeated = snapshot.battle.opponent.health === 0;
    if (snapshot.mode === "battle" && (allyDefeated || opponentDefeated))
      errors.push(issue("/snapshot/battle", "cannot contain a defeated creature in battle mode"));
    if (snapshot.mode === "result" || (snapshot.mode === "world" && snapshot.outcome !== null)) {
      if (snapshot.outcome === "victory" && !opponentDefeated)
        errors.push(issue("/snapshot/battle/opponent/health", "must be zero after victory"));
      if (snapshot.outcome === "victory" && allyDefeated)
        errors.push(issue("/snapshot/battle/ally/health", "must be above zero after victory"));
      if (snapshot.outcome === "loss" && !allyDefeated)
        errors.push(issue("/snapshot/battle/ally/health", "must be zero after loss"));
      if (snapshot.outcome === "loss" && opponentDefeated)
        errors.push(issue("/snapshot/battle/opponent/health", "must be above zero after loss"));
    }
  }
}

function validateBattleActionHistory(project, snapshot, errors) {
  const battle = snapshot.battle;
  if (
    !isRecord(battle) ||
    !Number.isInteger(battle.turn) ||
    battle.turn < 0 ||
    !isRecord(battle.ally) ||
    !isRecord(battle.opponent) ||
    !isRecord(snapshot.inventory) ||
    !Number.isInteger(snapshot.inventory.sunberry)
  )
    return;
  const allyMoves = usedMoveCount(project, battle.ally);
  const opponentMoves = usedMoveCount(project, battle.opponent);
  if (allyMoves === null || opponentMoves === null) return;
  const itemsUsed = project.campaign.inventory.sunberry - snapshot.inventory.sunberry;
  if (!Number.isInteger(itemsUsed) || itemsUsed < 0) return;
  let expectedAllyActions = battle.turn;
  let expectedOpponentActions = battle.turn;
  if (snapshot.outcome === "victory" && battle.ally.speed >= battle.opponent.speed)
    expectedOpponentActions -= 1;
  if (snapshot.outcome === "loss" && battle.ally.speed < battle.opponent.speed)
    expectedAllyActions -= 1;
  if (allyMoves + itemsUsed !== expectedAllyActions)
    errors.push(
      issue(
        "/snapshot/battle/ally/moves",
        "move uses plus consumed battle items do not match the completed turn history"
      )
    );
  if (opponentMoves !== expectedOpponentActions)
    errors.push(
      issue("/snapshot/battle/opponent/moves", "move uses do not match the completed turn history")
    );
}

function usedMoveCount(project, creature) {
  if (!Object.hasOwn(project.campaign.creaturesById, creature.id)) return null;
  const definition = project.campaign.creaturesById[creature.id];
  if (!Array.isArray(creature.moves) || creature.moves.length !== definition.moves.length)
    return null;
  let used = 0;
  for (const [index, slot] of creature.moves.entries()) {
    const moveId = definition.moves[index];
    if (
      !isRecord(slot) ||
      slot.id !== moveId ||
      !Object.hasOwn(project.campaign.movesById, moveId) ||
      !Number.isInteger(slot.remaining)
    )
      return null;
    used += project.campaign.movesById[moveId].uses - slot.remaining;
  }
  return used;
}

function validateBattleCreature(project, creature, pointer, errors) {
  if (!isRecord(creature)) {
    errors.push(issue(pointer, "must be a battle creature"));
    return;
  }
  exactKeys(creature, ["id", "name", "health", "maxHealth", "speed", "moves"], pointer, errors);
  const definition = Object.hasOwn(project.campaign.creaturesById, creature.id)
    ? project.campaign.creaturesById[creature.id]
    : null;
  if (!definition) {
    errors.push(issue(`${pointer}/id`, "references an unknown creature"));
    return;
  }
  if (creature.name !== definition.name) errors.push(issue(`${pointer}/name`, "does not match"));
  if (creature.maxHealth !== definition.health)
    errors.push(issue(`${pointer}/maxHealth`, "does not match the creature definition"));
  if (
    !Number.isInteger(creature.health) ||
    creature.health < 0 ||
    creature.health > creature.maxHealth
  )
    errors.push(issue(`${pointer}/health`, "must be between zero and maxHealth"));
  if (creature.speed !== definition.speed)
    errors.push(issue(`${pointer}/speed`, "does not match the creature definition"));
  if (!Array.isArray(creature.moves)) {
    errors.push(issue(`${pointer}/moves`, "must be an array"));
    return;
  }
  if (creature.moves.length !== definition.moves.length)
    errors.push(issue(`${pointer}/moves`, "must match the creature move list"));
  for (const [index, move] of creature.moves.entries()) {
    const movePointer = `${pointer}/moves/${index}`;
    if (!isRecord(move)) {
      errors.push(issue(movePointer, "must be a move slot"));
      continue;
    }
    exactKeys(move, ["id", "remaining"], movePointer, errors);
    const expectedId = definition.moves[index];
    const definitionMove = Object.hasOwn(project.campaign.movesById, move.id)
      ? project.campaign.movesById[move.id]
      : null;
    if (move.id !== expectedId || !definitionMove)
      errors.push(issue(`${movePointer}/id`, "does not match the creature move list"));
    else if (
      !Number.isInteger(move.remaining) ||
      move.remaining < 0 ||
      move.remaining > definitionMove.uses
    )
      errors.push(issue(`${movePointer}/remaining`, "must be within the authored use limit"));
  }
}

function exactKeys(value, expected, pointer, errors) {
  const allowed = new Set(expected);
  for (const key of Object.keys(value))
    if (!allowed.has(key)) errors.push(issue(childPointer(pointer, key), "is not allowed"));
  for (const key of expected)
    if (!Object.hasOwn(value, key)) errors.push(issue(childPointer(pointer, key), "is required"));
}

function childPointer(pointer, key) {
  return `${pointer}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`;
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortValue(value[key])])
  );
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function contains(rectangle, point) {
  return (
    point.x >= rectangle.x &&
    point.y >= rectangle.y &&
    point.x < rectangle.x + rectangle.width &&
    point.y < rectangle.y + rectangle.height
  );
}

function isCanonicalTimestamp(value) {
  try {
    return new Date(value).toISOString() === value;
  } catch {
    return false;
  }
}

function issue(pointer, message) {
  return { source: "save", pointer: pointer || "/", message };
}
