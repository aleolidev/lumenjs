const actions = ["move-north", "move-south", "move-west", "move-east", "interact", "wait"];
const movement = {
  "move-north": { x: 0, y: -1, facing: "north" },
  "move-south": { x: 0, y: 1, facing: "south" },
  "move-west": { x: -1, y: 0, facing: "west" },
  "move-east": { x: 1, y: 0, facing: "east" }
};

/** @param {Record<string, unknown> | null} context */
export function buildCreatorPlaytestModel(manifest, loaded, context = null) {
  const mapsById = Object.create(null);
  for (const entry of manifest.sources.maps) {
    const map = loaded[entry.map];
    const world = loaded[entry.world];
    const objects = new Map();
    for (const layer of map.layers.filter((item) => item.type === "objectgroup")) {
      for (const object of layer.objects ?? []) if (object.name) objects.set(object.name, object);
    }
    const cell = (name) => {
      const object = objects.get(name);
      return { x: Math.floor(object.x / map.tilewidth), y: Math.floor(object.y / map.tileheight) };
    };
    mapsById[entry.id] = {
      id: entry.id,
      width: map.width,
      height: map.height,
      spawns: Object.fromEntries(world.spawns.map((spawn) => [spawn.id, cell(spawn.object)])),
      defaultSpawn: world.defaultSpawn,
      characters: world.characters.map((character) => ({
        ...character,
        ...cell(character.object)
      })),
      transitions: world.transitions.map((transition) => ({
        ...transition,
        ...cell(transition.object)
      })),
      collisions: [...objects.values()]
        .filter((object) => object.type === "collision")
        .map((object) => ({
          x: Math.floor(object.x / map.tilewidth),
          y: Math.floor(object.y / map.tileheight),
          width: Math.max(1, Math.ceil((object.width ?? map.tilewidth) / map.tilewidth)),
          height: Math.max(1, Math.ceil((object.height ?? map.tileheight) / map.tileheight))
        }))
    };
  }
  const localeConfig = manifest.sources.locales;
  const catalogs = localeConfig
    ? Object.fromEntries(
        Object.entries(localeConfig.catalogs).map(([locale, source]) => [locale, loaded[source]])
      )
    : { inline: loaded[manifest.sources.campaign].messages };
  return {
    format: "lumen-creator-playtest-model-v1-experimental",
    projectId: manifest.projectId,
    startMap: manifest.startMap,
    defaultLocale: localeConfig?.default ?? "inline",
    mapsById,
    catalogs,
    context
  };
}

export function createFocusedPlaytestState(model, focus = {}) {
  const mapId = focus.map ?? model.startMap;
  const map = Object.hasOwn(model.mapsById, mapId) ? model.mapsById[mapId] : null;
  if (!map)
    throw focusError("CREATOR_FOCUS_MAP_MISSING", "map", mapId, "Choose a declared map id.");
  const spawnId = focus.spawn ?? map.defaultSpawn;
  const spawn = Object.hasOwn(map.spawns, spawnId) ? map.spawns[spawnId] : null;
  if (!spawn)
    throw focusError(
      "CREATOR_FOCUS_SPAWN_MISSING",
      "spawn",
      spawnId,
      "Choose a spawn declared by the focused map."
    );
  const locale = focus.locale ?? model.defaultLocale;
  if (!Object.hasOwn(model.catalogs, locale))
    throw focusError(
      "CREATOR_FOCUS_LOCALE_MISSING",
      "locale",
      locale,
      "Choose a locale declared by the project."
    );
  return {
    format: "lumen-creator-playtest-state-v1-experimental",
    tick: 0,
    locale,
    activeMapId: mapId,
    mapStates: { [mapId]: { player: { ...spawn, facing: "south" }, message: null } }
  };
}

export function stepCreatorPlaytest(model, state, action) {
  if (!actions.includes(action)) throw new Error(`Invalid creator playtest action '${action}'`);
  const next = structuredClone(state);
  next.tick += 1;
  const map = model.mapsById[next.activeMapId];
  const mapState = next.mapStates[next.activeMapId];
  mapState.message = null;
  const facts = [];
  if (movement[action]) {
    const delta = movement[action];
    mapState.player.facing = delta.facing;
    const destination = {
      x: mapState.player.x + delta.x,
      y: mapState.player.y + delta.y
    };
    if (!walkable(map, destination)) {
      facts.push({ type: "movement-blocked", ...destination });
      return { state: next, facts };
    }
    mapState.player.x = destination.x;
    mapState.player.y = destination.y;
    facts.push({ type: "player-moved", ...destination });
    const transition = map.transitions.find(
      (item) => item.x === destination.x && item.y === destination.y
    );
    if (transition) {
      const target = Object.hasOwn(model.mapsById, transition.targetMap)
        ? model.mapsById[transition.targetMap]
        : null;
      if (!target) throw new Error(`Validated transition map '${transition.targetMap}' is missing`);
      const spawn = Object.hasOwn(target.spawns, transition.targetSpawn)
        ? target.spawns[transition.targetSpawn]
        : null;
      if (!spawn)
        throw new Error(`Validated transition target '${transition.targetSpawn}' is missing`);
      if (!next.mapStates[target.id]) next.mapStates[target.id] = { player: null, message: null };
      next.mapStates[target.id].player = { ...spawn, facing: delta.facing };
      next.activeMapId = target.id;
      facts.push(
        { type: "map-left", mapId: map.id, transitionId: transition.id },
        {
          type: "map-entered",
          mapId: target.id,
          spawnId: transition.targetSpawn,
          transitionId: transition.id
        }
      );
    }
  } else if (action === "interact") {
    const faced = facedCell(mapState.player);
    const character = map.characters.find((item) => item.x === faced.x && item.y === faced.y);
    if (!character) facts.push({ type: "interaction-empty", ...faced });
    else {
      const text = model.catalogs[next.locale][character.messageKey];
      mapState.message = text;
      facts.push({
        type: "character-spoke",
        characterId: character.id,
        messageKey: character.messageKey,
        message: text
      });
    }
  }
  return { state: next, facts };
}

export function hashCreatorPlaytestState(state) {
  const value = JSON.stringify(state);
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a32-v1:${hash.toString(16).padStart(8, "0")}`;
}

export class CreatorFocusError extends Error {
  constructor(diagnostic) {
    super(diagnostic.message);
    this.name = "CreatorFocusError";
    this.code = diagnostic.code;
    this.diagnostics = [diagnostic];
  }
}

function focusError(code, pointer, value, remedy) {
  return new CreatorFocusError({
    code,
    severity: "error",
    source: "focus",
    pointer: `/${pointer}`,
    value,
    message: `Focused ${pointer} '${value}' is not available.`,
    remedy,
    related: null
  });
}

function walkable(map, cell) {
  if (cell.x < 0 || cell.y < 0 || cell.x >= map.width || cell.y >= map.height) return false;
  if (map.characters.some((item) => item.x === cell.x && item.y === cell.y)) return false;
  return !map.collisions.some(
    (item) =>
      cell.x >= item.x &&
      cell.y >= item.y &&
      cell.x < item.x + item.width &&
      cell.y < item.y + item.height
  );
}

function facedCell(player) {
  const delta = {
    north: { x: 0, y: -1 },
    south: { x: 0, y: 1 },
    west: { x: -1, y: 0 },
    east: { x: 1, y: 0 }
  }[player.facing];
  return { x: player.x + delta.x, y: player.y + delta.y };
}
