export type Direction = "north" | "south" | "west" | "east";

export type GameAction =
  | { type: "move"; direction: Direction }
  | { type: "interact" }
  | { type: "wait" };

export interface Cell {
  x: number;
  y: number;
}

export interface PlayerState extends Cell {
  facing: Direction;
}

export interface MapState {
  player: PlayerState;
  message: string | null;
}

export interface GameState {
  format: "lumen-game-state-v1-experimental";
  tick: number;
  locale: string;
  activeMapId: string;
  mapStates: Record<string, MapState>;
}

export type GameFact =
  | ({ type: "movement-blocked" } & Cell)
  | ({ type: "player-moved" } & Cell)
  | ({ type: "interaction-empty" } & Cell)
  | {
      type: "character-spoke";
      characterId: string;
      messageKey: string;
      message: string;
    }
  | { type: "map-left"; mapId: string; transitionId: string }
  | { type: "map-entered"; mapId: string; spawnId: string; transitionId: string };

export interface StepResult {
  state: GameState;
  facts: GameFact[];
}

export interface GameSave {
  format: "lumen-game-save-v1-experimental";
  projectId: string;
  projectVersion: string;
  snapshot: GameState;
}

export interface ProjectManifest {
  projectId: string;
  version: string;
  startMap: string;
  sources: {
    maps: Array<{ id: string; map: string; world: string }>;
    campaign: string;
    locales?: { default: string; catalogs: Record<string, string> };
  };
}

export interface TiledObject {
  name?: string;
  type?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface TiledMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: Array<{ type: string; objects?: TiledObject[] }>;
}

export interface WorldDocument {
  defaultSpawn: string;
  spawns: Array<{ id: string; object: string }>;
  characters: Array<{
    id: string;
    object: string;
    name: string;
    messageKey: string;
  }>;
  transitions: Array<{
    id: string;
    object: string;
    targetMap: string;
    targetSpawn: string;
  }>;
}

export interface CampaignDocument {
  messages?: Record<string, string>;
}

export type ProjectDocuments = Record<string, unknown>;

export interface CreateGameOptions {
  manifest: ProjectManifest;
  documents: ProjectDocuments;
  focus?: { map?: string; spawn?: string; locale?: string };
}

export interface Game {
  readonly projectId: string;
  readonly projectVersion: string;
  dispatch(action: GameAction): StepResult;
  getState(): GameState;
  getMap(mapId?: string): GameMap;
  createSave(): GameSave;
  restoreSave(value: unknown): GameState;
}

export interface GameCharacter extends Cell {
  id: string;
  messageKey: string;
}

export interface GameTransition extends Cell {
  id: string;
  targetMap: string;
  targetSpawn: string;
}

export interface GameCollision extends Cell {
  width: number;
  height: number;
}

export interface GameMap {
  id: string;
  width: number;
  height: number;
  defaultSpawn: string;
  spawns: Record<string, Cell>;
  characters: GameCharacter[];
  transitions: GameTransition[];
  collisions: GameCollision[];
}

interface RuntimeModel {
  projectId: string;
  projectVersion: string;
  startMap: string;
  defaultLocale: string;
  mapsById: Record<string, GameMap>;
  catalogs: Record<string, Record<string, string>>;
}

const movement: Record<Direction, Cell> = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
  east: { x: 1, y: 0 }
};

export function createGame(options: CreateGameOptions): Game {
  const model = buildModel(options.manifest, options.documents);
  let state = createState(model, options.focus);

  return {
    projectId: model.projectId,
    projectVersion: model.projectVersion,
    dispatch(action) {
      const result = step(model, state, action);
      state = result.state;
      return clone(result);
    },
    getState() {
      return clone(state);
    },
    getMap(mapId = state.activeMapId) {
      const map = model.mapsById[mapId];
      if (!map) throw new TypeError(`Map '${mapId}' is not declared`);
      return clone(map);
    },
    createSave() {
      return {
        format: "lumen-game-save-v1-experimental",
        projectId: model.projectId,
        projectVersion: model.projectVersion,
        snapshot: clone(state)
      };
    },
    restoreSave(value) {
      const snapshot = validateSave(model, value);
      state = snapshot;
      return clone(state);
    }
  };
}

function buildModel(manifest: ProjectManifest, documents: ProjectDocuments): RuntimeModel {
  requireText(manifest?.projectId, "manifest.projectId");
  requireText(manifest?.version, "manifest.version");
  requireText(manifest?.startMap, "manifest.startMap");
  if (!Array.isArray(manifest?.sources?.maps) || manifest.sources.maps.length === 0)
    throw new TypeError("manifest.sources.maps must contain at least one map");

  const mapsById: Record<string, GameMap> = Object.create(null);
  for (const entry of manifest.sources.maps) {
    const map = requireDocument<TiledMap>(documents, entry.map);
    const world = requireDocument<WorldDocument>(documents, entry.world);
    const objects = new Map<string, TiledObject>();
    for (const layer of map.layers.filter((item) => item.type === "objectgroup"))
      for (const object of layer.objects ?? []) if (object.name) objects.set(object.name, object);
    const cell = (name: string): Cell => {
      const object = objects.get(name);
      if (!object) throw new TypeError(`Validated object '${name}' is missing from '${entry.map}'`);
      return {
        x: Math.floor(object.x / map.tilewidth),
        y: Math.floor(object.y / map.tileheight)
      };
    };
    mapsById[entry.id] = {
      id: entry.id,
      width: map.width,
      height: map.height,
      defaultSpawn: world.defaultSpawn,
      spawns: Object.fromEntries(world.spawns.map((spawn) => [spawn.id, cell(spawn.object)])),
      characters: world.characters.map((character) => ({
        id: character.id,
        messageKey: character.messageKey,
        ...cell(character.object)
      })),
      transitions: world.transitions.map((transition) => ({
        id: transition.id,
        targetMap: transition.targetMap,
        targetSpawn: transition.targetSpawn,
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
  if (!mapsById[manifest.startMap])
    throw new TypeError(`Start map '${manifest.startMap}' is not declared`);

  const localeConfig = manifest.sources.locales;
  const campaign = requireDocument<CampaignDocument>(documents, manifest.sources.campaign);
  const catalogs = localeConfig
    ? Object.fromEntries(
        Object.entries(localeConfig.catalogs).map(([locale, source]) => [
          locale,
          requireDocument<Record<string, string>>(documents, source)
        ])
      )
    : { inline: campaign.messages ?? {} };
  return {
    projectId: manifest.projectId,
    projectVersion: manifest.version,
    startMap: manifest.startMap,
    defaultLocale: localeConfig?.default ?? "inline",
    mapsById,
    catalogs
  };
}

function createState(model: RuntimeModel, focus: CreateGameOptions["focus"] = {}): GameState {
  const mapId = focus?.map ?? model.startMap;
  const map = model.mapsById[mapId];
  if (!map) throw new TypeError(`Focused map '${mapId}' is not available`);
  const spawnId = focus?.spawn ?? map.defaultSpawn;
  const spawn = map.spawns[spawnId];
  if (!spawn) throw new TypeError(`Focused spawn '${spawnId}' is not available in '${mapId}'`);
  const locale = focus?.locale ?? model.defaultLocale;
  if (!model.catalogs[locale]) throw new TypeError(`Focused locale '${locale}' is not available`);
  return {
    format: "lumen-game-state-v1-experimental",
    tick: 0,
    locale,
    activeMapId: mapId,
    mapStates: { [mapId]: { player: { ...spawn, facing: "south" }, message: null } }
  };
}

function step(model: RuntimeModel, current: GameState, action: GameAction): StepResult {
  if (!action || typeof action !== "object") throw new TypeError("Game actions must be objects");
  const state = clone(current);
  state.tick += 1;
  const map = model.mapsById[state.activeMapId];
  const mapState = state.mapStates[state.activeMapId];
  mapState.message = null;
  const facts: GameFact[] = [];

  if (action.type === "move") {
    const delta = movement[action.direction];
    if (!delta) throw new TypeError(`Invalid movement direction '${String(action.direction)}'`);
    mapState.player.facing = action.direction;
    const destination = { x: mapState.player.x + delta.x, y: mapState.player.y + delta.y };
    if (!walkable(map, destination)) {
      facts.push({ type: "movement-blocked", ...destination });
      return { state, facts };
    }
    Object.assign(mapState.player, destination);
    facts.push({ type: "player-moved", ...destination });
    const transition = map.transitions.find(
      (item) => item.x === destination.x && item.y === destination.y
    );
    if (transition) enterTransition(model, state, action.direction, map, transition, facts);
  } else if (action.type === "interact") {
    const faced = facedCell(mapState.player);
    const character = map.characters.find((item) => item.x === faced.x && item.y === faced.y);
    if (!character) facts.push({ type: "interaction-empty", ...faced });
    else {
      const message = model.catalogs[state.locale][character.messageKey];
      if (typeof message !== "string")
        throw new TypeError(
          `Message '${character.messageKey}' is missing from locale '${state.locale}'`
        );
      mapState.message = message;
      facts.push({
        type: "character-spoke",
        characterId: character.id,
        messageKey: character.messageKey,
        message
      });
    }
  } else if (action.type !== "wait") {
    throw new TypeError(`Invalid game action '${String((action as { type?: unknown }).type)}'`);
  }
  return { state, facts };
}

function enterTransition(
  model: RuntimeModel,
  state: GameState,
  facing: Direction,
  source: GameMap,
  transition: GameTransition,
  facts: GameFact[]
) {
  const target = model.mapsById[transition.targetMap];
  const spawn = target?.spawns[transition.targetSpawn];
  if (!target || !spawn) throw new TypeError(`Transition '${transition.id}' has an invalid target`);
  state.mapStates[target.id] = {
    player: { ...spawn, facing },
    message: null
  };
  state.activeMapId = target.id;
  facts.push(
    { type: "map-left", mapId: source.id, transitionId: transition.id },
    {
      type: "map-entered",
      mapId: target.id,
      spawnId: transition.targetSpawn,
      transitionId: transition.id
    }
  );
}

function validateSave(model: RuntimeModel, value: unknown): GameState {
  if (!isRecord(value) || value.format !== "lumen-game-save-v1-experimental")
    throw new TypeError("Save format is invalid");
  requireExactKeys(value, ["format", "projectId", "projectVersion", "snapshot"], "save");
  if (value.projectId !== model.projectId || value.projectVersion !== model.projectVersion)
    throw new TypeError("Save belongs to a different project identity");
  if (!isRecord(value.snapshot)) throw new TypeError("Save snapshot is invalid");
  const snapshot = clone(value.snapshot as unknown as GameState);
  requireExactKeys(
    snapshot as unknown as Record<string, unknown>,
    ["format", "tick", "locale", "activeMapId", "mapStates"],
    "save snapshot"
  );
  if (
    snapshot.format !== "lumen-game-state-v1-experimental" ||
    !Number.isInteger(snapshot.tick) ||
    snapshot.tick < 0 ||
    typeof snapshot.locale !== "string" ||
    !model.catalogs[snapshot.locale] ||
    typeof snapshot.activeMapId !== "string" ||
    !model.mapsById[snapshot.activeMapId] ||
    !isRecord(snapshot.mapStates)
  )
    throw new TypeError("Save snapshot is invalid");
  for (const [mapId, mapState] of Object.entries(snapshot.mapStates)) {
    const map = model.mapsById[mapId];
    if (!map || !isRecord(mapState) || !isRecord(mapState.player))
      throw new TypeError("Save map state is invalid");
    requireExactKeys(mapState, ["player", "message"], "save map state");
    const player = mapState.player;
    requireExactKeys(player, ["x", "y", "facing"], "save player state");
    const authoredMessages = new Set(Object.values(model.catalogs[snapshot.locale]));
    if (
      !Number.isInteger(player.x) ||
      !Number.isInteger(player.y) ||
      !Object.hasOwn(movement, String(player.facing)) ||
      !walkable(map, { x: Number(player.x), y: Number(player.y) }) ||
      !(mapState.message === null || authoredMessages.has(String(mapState.message)))
    )
      throw new TypeError("Save player state is invalid");
  }
  if (!snapshot.mapStates[snapshot.activeMapId]) throw new TypeError("Active save map is missing");
  return snapshot;
}

function walkable(map: GameMap, cell: Cell) {
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

function facedCell(player: PlayerState): Cell {
  const delta = movement[player.facing];
  return { x: player.x + delta.x, y: player.y + delta.y };
}

function requireDocument<T>(documents: ProjectDocuments, path: string): T {
  const value = documents[path];
  if (!isRecord(value)) throw new TypeError(`Required document '${path}' is missing or invalid`);
  return value as T;
}

function requireText(value: unknown, name: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`${name} is required`);
}

function requireExactKeys(value: Record<string, unknown>, expected: string[], name: string) {
  const actual = Object.keys(value).sort();
  const allowed = [...expected].sort();
  if (actual.length !== allowed.length || actual.some((key, index) => key !== allowed[index]))
    throw new TypeError(`${name} has unexpected fields`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
