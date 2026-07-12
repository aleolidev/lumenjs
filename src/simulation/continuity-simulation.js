import { createCampaignState, stepCampaign } from "./campaign-simulation.js";
import { createInitialState, hashState, stepWorld } from "./world-simulation.js";

/** @returns {any} */
export function createContinuityState(project) {
  const startWorld = project.mapsById[project.startMapId];
  const legacy = createCampaignState(startWorld);
  return {
    format: "lumen-campaign-state-v2",
    mode: legacy.mode,
    activeMapId: project.startMapId,
    mapStates: { [project.startMapId]: legacy.world },
    dialogue: legacy.dialogue,
    party: legacy.party,
    inventory: legacy.inventory,
    battle: legacy.battle,
    outcome: legacy.outcome
  };
}

export function stepContinuity(project, state, action) {
  if (!action || typeof action !== "object" || typeof action.type !== "string") {
    throw new Error("Continuity actions must be typed objects");
  }
  const activeWorld = project.mapsById[state.activeMapId];
  if (!activeWorld) throw new Error(`Active map '${state.activeMapId}' is unavailable`);

  if (state.mode !== "world" || activeWorld.kind === "vale") {
    const result = stepCampaign(activeWorld, toLegacyState(state), action);
    const next = fromLegacyState(state, result.state);
    if (next.mode === "world") return applyMapTransition(project, next, result.facts);
    return { state: next, facts: result.facts };
  }

  if (action.type !== "world") throw new Error(`Expected world action, received '${action.type}'`);
  const result = stepWorld(activeWorld, state.mapStates[state.activeMapId], action.action);
  const next = structuredClone(state);
  next.mapStates[next.activeMapId] = result.state;
  if (
    activeWorld.character &&
    result.facts.some((fact) => fact.type === "character-spoke") &&
    next.party.includes("glintail")
  ) {
    result.state.message = activeWorld.character.messageWithGlintail;
    const spoken = result.facts.find((fact) => fact.type === "character-spoke");
    if (spoken) spoken.message = result.state.message;
  }
  return applyMapTransition(project, next, result.facts);
}

export function runContinuityReplay(project, replay) {
  if (replay.format !== "lumen-continuity-replay-v2") {
    throw new Error(`Unsupported continuity replay format '${replay.format}'`);
  }
  if (replay.projectVersion !== project.version) {
    throw new Error(`Replay project version '${replay.projectVersion}' does not match project`);
  }
  let state = createContinuityState(project);
  const facts = [];
  for (const action of replay.actions) {
    const result = stepContinuity(project, state, action);
    state = result.state;
    facts.push(...result.facts);
  }
  return { state, facts, stateHash: hashState(state) };
}

function applyMapTransition(project, state, facts) {
  if (state.mode !== "world" || !facts.some((fact) => fact.type === "player-moved")) {
    return { state, facts };
  }
  const activeWorld = project.mapsById[state.activeMapId];
  const activeState = state.mapStates[state.activeMapId];
  const transition = activeWorld.mapTransitions.find((item) => contains(item, activeState.player));
  if (!transition) return { state, facts };

  const next = structuredClone(state);
  const sourceMapId = next.activeMapId;
  const targetWorld = project.mapsById[transition.targetMap];
  if (!next.mapStates[transition.targetMap]) {
    next.mapStates[transition.targetMap] = createInitialState(targetWorld);
  }
  next.activeMapId = transition.targetMap;
  next.mapStates[next.activeMapId].player = {
    ...targetWorld.spawnsById[transition.targetSpawn],
    facing: transition.facing
  };
  next.mapStates[next.activeMapId].message = null;
  return {
    state: next,
    facts: [
      ...facts,
      {
        type: "map-left",
        mapId: sourceMapId,
        transitionId: transition.id
      },
      {
        type: "map-entered",
        mapId: transition.targetMap,
        spawnId: transition.targetSpawn,
        transitionId: transition.id
      }
    ]
  };
}

function toLegacyState(state) {
  return {
    format: "lumen-campaign-state-v1",
    mode: state.mode,
    world: state.mapStates[state.activeMapId],
    dialogue: state.dialogue,
    party: state.party,
    inventory: state.inventory,
    battle: state.battle,
    outcome: state.outcome
  };
}

function fromLegacyState(previous, legacy) {
  const next = structuredClone(previous);
  next.mode = legacy.mode;
  next.mapStates[next.activeMapId] = legacy.world;
  next.dialogue = legacy.dialogue;
  next.party = legacy.party;
  next.inventory = legacy.inventory;
  next.battle = legacy.battle;
  next.outcome = legacy.outcome;
  return next;
}

function contains(rectangle, point) {
  return (
    point.x >= rectangle.x &&
    point.y >= rectangle.y &&
    point.x < rectangle.x + rectangle.width &&
    point.y < rectangle.y + rectangle.height
  );
}
