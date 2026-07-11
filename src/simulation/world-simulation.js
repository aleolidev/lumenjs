export const actions = ["move-north", "move-south", "move-west", "move-east", "interact", "wait"];

const movement = {
  "move-north": { x: 0, y: -1, facing: "north" },
  "move-south": { x: 0, y: 1, facing: "south" },
  "move-west": { x: -1, y: 0, facing: "west" },
  "move-east": { x: 1, y: 0, facing: "east" }
};

export function createInitialState(world) {
  return {
    format: "lumen-first-light-state-v1",
    tick: 0,
    player: { x: world.spawn.x, y: world.spawn.y, facing: "east" },
    flags: { [world.beacon.stateKey]: false },
    message: null,
    transitions: 0
  };
}

export function stepWorld(world, state, action) {
  if (!actions.includes(action)) throw new Error(`Invalid First Light action '${action}'`);
  const next = structuredClone(state);
  const facts = [];
  next.tick += 1;
  next.message = null;

  if (movement[action]) {
    const delta = movement[action];
    next.player.facing = delta.facing;
    const destination = { x: state.player.x + delta.x, y: state.player.y + delta.y };
    if (isWalkable(world, destination)) {
      next.player.x = destination.x;
      next.player.y = destination.y;
      facts.push({ type: "player-moved", ...destination });
      if (contains(world.transition, destination)) {
        next.player = { ...world.transition.target, facing: "east" };
        next.transitions += 1;
        facts.push({ type: "map-transition", id: "east-trail", target: "west-spawn" });
      }
    } else {
      facts.push({ type: "movement-blocked", ...destination });
    }
  } else if (action === "interact") {
    const target = facedCell(state.player);
    if (sameCell(target, world.character)) {
      const lit = next.flags[world.beacon.stateKey];
      next.message = lit ? world.character.messageAfter : world.character.messageBefore;
      if (!lit) {
        next.flags[world.beacon.stateKey] = true;
        facts.push({ type: "flag-changed", key: world.beacon.stateKey, value: true });
      }
      facts.push({ type: "character-spoke", id: world.character.object, message: next.message });
    } else {
      facts.push({ type: "interaction-empty", ...target });
    }
  }

  return { state: next, facts };
}

export function runReplay(world, replay) {
  if (replay.format !== "lumen-first-light-replay-v1") {
    throw new Error(`Unsupported replay format '${replay.format}'`);
  }
  if (replay.projectVersion !== world.project.version) {
    throw new Error(`Replay project version '${replay.projectVersion}' does not match world`);
  }
  let state = createInitialState(world);
  const facts = [];
  for (const action of replay.actions) {
    const result = stepWorld(world, state, action);
    state = result.state;
    facts.push(...result.facts);
  }
  return { state, facts, stateHash: hashState(state) };
}

export function hashState(state) {
  const value = JSON.stringify(state);
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a32-v1:${hash.toString(16).padStart(8, "0")}`;
}

function isWalkable(world, cell) {
  if (cell.x < 0 || cell.y < 0 || cell.x >= world.map.width || cell.y >= world.map.height) {
    return false;
  }
  if (sameCell(cell, world.character) || sameCell(cell, world.beacon)) return false;
  return !world.collisions.some((rectangle) => contains(rectangle, cell));
}

function facedCell(player) {
  const offsets = {
    north: { x: 0, y: -1 },
    south: { x: 0, y: 1 },
    west: { x: -1, y: 0 },
    east: { x: 1, y: 0 }
  };
  const offset = offsets[player.facing];
  return { x: player.x + offset.x, y: player.y + offset.y };
}

function sameCell(left, right) {
  return left.x === right.x && left.y === right.y;
}

function contains(rectangle, cell) {
  return (
    cell.x >= rectangle.x &&
    cell.y >= rectangle.y &&
    cell.x < rectangle.x + rectangle.width &&
    cell.y < rectangle.y + rectangle.height
  );
}
