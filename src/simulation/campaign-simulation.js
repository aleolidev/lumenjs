import { createInitialState, hashState, stepWorld } from "./world-simulation.js";

/** @returns {any} */
export function createCampaignState(world) {
  if (!world.campaign) throw new Error("Campaign data is required");
  return {
    format: "lumen-campaign-state-v1",
    mode: "world",
    world: createInitialState(world),
    dialogue: null,
    party: [],
    inventory: structuredClone(world.campaign.inventory),
    battle: null,
    outcome: null
  };
}

export function stepCampaign(world, state, action) {
  if (!world.campaign) throw new Error("Campaign data is required");
  if (!action || typeof action !== "object" || typeof action.type !== "string") {
    throw new Error("Campaign actions must be typed objects");
  }
  if (state.mode === "world") return stepCampaignWorld(world, state, action);
  if (state.mode === "dialogue") return stepDialogue(world, state, action);
  if (state.mode === "battle") return stepBattle(world, state, action);
  if (state.mode === "result") return continueAfterResult(state, action);
  throw new Error(`No actions are valid in campaign mode '${state.mode}'`);
}

function continueAfterResult(state, action) {
  if (action.type !== "continue-result") {
    throw new Error(`Expected continue-result action, received '${action.type}'`);
  }
  const next = structuredClone(state);
  next.mode = "world";
  next.world.message =
    next.outcome === "victory"
      ? "Mira smiles as Glintail's new light joins your party."
      : "Mira welcomes you home. The trail will wait until you are ready.";
  return {
    state: next,
    facts: [{ type: "campaign-returned", outcome: next.outcome }]
  };
}

export function runCampaignReplay(world, replay) {
  if (replay.format !== "lumen-campaign-replay-v1") {
    throw new Error(`Unsupported campaign replay format '${replay.format}'`);
  }
  if (replay.projectVersion !== world.project.version) {
    throw new Error(`Replay project version '${replay.projectVersion}' does not match world`);
  }
  let state = createCampaignState(world);
  const facts = [];
  for (const action of replay.actions) {
    const result = stepCampaign(world, state, action);
    state = result.state;
    facts.push(...result.facts);
  }
  return { state, facts, stateHash: hashState(state) };
}

function stepCampaignWorld(world, state, action) {
  if (action.type !== "world") throw new Error(`Expected world action, received '${action.type}'`);
  const result = stepWorld(world, state.world, action.action);
  const next = { ...structuredClone(state), world: result.state };
  /** @type {Array<Record<string, any>>} */
  const facts = [...result.facts];
  const spokeToMira = facts.some((fact) => fact.type === "character-spoke");
  if (spokeToMira && next.party.length === 0) {
    next.mode = "dialogue";
    next.dialogue = { nodeId: world.campaign.dialogue.start };
    facts.push({ type: "dialogue-opened", node: next.dialogue.nodeId });
  }
  const crossedTrail = facts.some((fact) => fact.type === "map-transition");
  if (crossedTrail && next.party.length > 0 && !next.outcome) {
    next.mode = "battle";
    next.battle = createBattle(world, next.party[0]);
    facts.push({
      type: "battle-started",
      encounter: world.campaign.encounter.id,
      ally: next.battle.ally.id,
      opponent: next.battle.opponent.id
    });
  }
  return { state: next, facts };
}

function stepDialogue(world, state, action) {
  if (action.type !== "dialogue-choice") {
    throw new Error(`Expected dialogue-choice action, received '${action.type}'`);
  }
  const node = world.campaign.dialogue.nodesById[state.dialogue.nodeId];
  const choice = node.choices.find((item) => item.id === action.choice);
  if (!choice) throw new Error(`Invalid dialogue choice '${action.choice}'`);
  const next = structuredClone(state);
  /** @type {Array<Record<string, any>>} */
  const facts = [{ type: "dialogue-choice", node: node.id, choice: choice.id }];
  if (choice.effect === "choose-companion") {
    next.party = [choice.creature];
    facts.push({ type: "companion-chosen", creature: choice.creature });
  }
  if (choice.next) {
    next.dialogue = { nodeId: choice.next };
    facts.push({ type: "dialogue-advanced", node: choice.next });
  } else {
    next.mode = "world";
    next.dialogue = null;
    facts.push({ type: "dialogue-closed" });
  }
  return { state: next, facts };
}

function stepBattle(world, state, action) {
  if (!state.battle) throw new Error("Battle state is missing");
  if (action.type !== "battle-move" && action.type !== "battle-item") {
    throw new Error(`Expected battle action, received '${action.type}'`);
  }
  const next = structuredClone(state);
  const battle = next.battle;
  /** @type {Array<Record<string, any>>} */
  const facts = [];
  const allyAction = () => {
    if (action.type === "battle-item") {
      if (action.item !== "sunberry" || next.inventory.sunberry < 1) {
        throw new Error(`Unavailable battle item '${action.item}'`);
      }
      next.inventory.sunberry -= 1;
      const before = battle.ally.health;
      battle.ally.health = Math.min(battle.ally.maxHealth, battle.ally.health + 8);
      facts.push({
        type: "item-used",
        item: "sunberry",
        creature: battle.ally.id,
        healed: battle.ally.health - before,
        health: battle.ally.health
      });
    } else {
      useMove(world, battle.ally, battle.opponent, action.move, facts);
    }
  };
  const opponentAction = () => {
    const enemyMove = battle.opponent.moves[battle.turn % battle.opponent.moves.length];
    useMove(world, battle.opponent, battle.ally, enemyMove.id, facts);
  };

  if (battle.ally.speed >= battle.opponent.speed) {
    allyAction();
    if (battle.opponent.health > 0) opponentAction();
  } else {
    opponentAction();
    if (battle.ally.health > 0) allyAction();
  }
  battle.turn += 1;

  if (battle.opponent.health === 0) finishBattle(world, next, "victory", facts);
  else if (battle.ally.health === 0) finishBattle(world, next, "loss", facts);
  return { state: next, facts };
}

function createBattle(world, allyId) {
  return {
    encounter: world.campaign.encounter.id,
    turn: 0,
    ally: battleCreature(world, allyId),
    opponent: battleCreature(world, world.campaign.encounter.creature)
  };
}

function battleCreature(world, id) {
  const creature = world.campaign.creaturesById[id];
  return {
    id,
    name: creature.name,
    health: creature.health,
    maxHealth: creature.health,
    speed: creature.speed,
    moves: creature.moves.map((moveId) => ({
      id: moveId,
      remaining: world.campaign.movesById[moveId].uses
    }))
  };
}

function useMove(world, actor, target, moveId, facts) {
  const slot = actor.moves.find((move) => move.id === moveId);
  if (!slot || slot.remaining < 1)
    throw new Error(`Move '${moveId}' is unavailable for '${actor.id}'`);
  const move = world.campaign.movesById[moveId];
  slot.remaining -= 1;
  const damage = Math.min(target.health, move.power);
  target.health -= damage;
  facts.push({
    type: "move-used",
    actor: actor.id,
    target: target.id,
    move: moveId,
    damage,
    targetHealth: target.health,
    remainingUses: slot.remaining
  });
  if (target.health === 0) facts.push({ type: "creature-defeated", creature: target.id });
}

function finishBattle(world, state, result, facts) {
  state.mode = "result";
  state.outcome = result;
  if (result === "victory" && world.campaign.encounter.recruitAfterVictory) {
    const recruited = world.campaign.encounter.creature;
    if (!state.party.includes(recruited)) state.party.push(recruited);
    facts.push({ type: "creature-recruited", creature: recruited });
  }
  facts.push({ type: "battle-ended", result });
}
