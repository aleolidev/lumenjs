export type Direction = "north" | "south" | "west" | "east";

export type GameAction =
  | { type: "move"; direction: Direction }
  | { type: "interact" }
  | { type: "choose"; choiceId: string }
  | { type: "use-move"; moveId: string }
  | { type: "finish-battle" }
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
  format: "lumen-game-state-v3-experimental";
  tick: number;
  locale: string;
  activeMapId: string;
  mapStates: Record<string, MapState>;
  dialogue: GameDialogue | null;
  party: string[];
  battle: GameBattle | null;
  completedEncounters: string[];
}

export interface GameBattleMove {
  id: string;
  name: string;
  power: number;
  remainingUses: number;
  maxUses: number;
}

export interface GameBattleParticipant {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  speed: number;
  moves: GameBattleMove[];
}

export interface GameBattle {
  mapId: string;
  triggerId: string;
  encounterId: string;
  outcome: "active" | "victory" | "defeat";
  ally: GameBattleParticipant;
  enemy: GameBattleParticipant;
}

export interface GameDialogueChoice {
  id: string;
  labelKey: string;
  label: string;
}

export interface GameDialogue {
  mapId: string;
  characterId: string;
  nodeId: string;
  speaker: string;
  messageKey: string;
  message: string;
  choices: GameDialogueChoice[];
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
  | { type: "dialogue-opened"; characterId: string; nodeId: string }
  | { type: "dialogue-choice-selected"; choiceId: string; nodeId: string }
  | { type: "companion-chosen"; creatureId: string }
  | { type: "dialogue-advanced"; nodeId: string }
  | { type: "dialogue-closed"; nodeId: string }
  | { type: "encounter-companion-required"; triggerId: string; encounterId: string }
  | { type: "encounter-started"; triggerId: string; encounterId: string }
  | {
      type: "battle-move-used";
      actor: "ally" | "enemy";
      creatureId: string;
      moveId: string;
      remainingUses: number;
    }
  | {
      type: "battle-damage-dealt";
      sourceId: string;
      targetId: string;
      amount: number;
      remainingHealth: number;
    }
  | { type: "battle-enemy-exhausted"; creatureId: string }
  | { type: "battle-won"; encounterId: string }
  | { type: "battle-lost"; encounterId: string }
  | { type: "battle-finished"; encounterId: string; outcome: "victory" | "defeat" }
  | { type: "battle-reset"; mapId: string; spawnId: string }
  | { type: "map-left"; mapId: string; transitionId: string }
  | { type: "map-entered"; mapId: string; spawnId: string; transitionId: string };

export interface StepResult {
  state: GameState;
  facts: GameFact[];
}

export interface GameSave {
  format: "lumen-game-save-v3-experimental";
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
    dialogue: string;
  }>;
  transitions: Array<{
    id: string;
    object: string;
    targetMap: string;
    targetSpawn: string;
  }>;
  encounters: Array<{ id: string; object: string; encounter: string }>;
}

export interface CampaignDocument {
  messages?: Record<string, string>;
  dialogue: {
    start: string;
    nodes: DialogueNode[];
  };
  moves: Array<{ id: string; name: string; power: number; uses: number }>;
  creatures: Array<{
    id: string;
    name: string;
    health: number;
    speed: number;
    moves: string[];
  }>;
  encounters: Array<{ id: string; creature: string }>;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  messageKey: string;
  choices: DialogueChoice[];
}

export interface DialogueChoice {
  id: string;
  labelKey: string;
  effect: "choose-companion" | "close-dialogue";
  creature?: string;
  next?: string;
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
  dialogue: string;
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

export interface GameEncounterTrigger extends Cell {
  id: string;
  encounterId: string;
}

export interface GameMap {
  id: string;
  width: number;
  height: number;
  defaultSpawn: string;
  spawns: Record<string, Cell>;
  characters: GameCharacter[];
  transitions: GameTransition[];
  encounters: GameEncounterTrigger[];
  collisions: GameCollision[];
}

interface MoveDefinition {
  id: string;
  name: string;
  power: number;
  uses: number;
}

interface CreatureDefinition {
  id: string;
  name: string;
  health: number;
  speed: number;
  moves: string[];
}

interface EncounterDefinition {
  id: string;
  creature: string;
}

interface RuntimeModel {
  projectId: string;
  projectVersion: string;
  startMap: string;
  defaultLocale: string;
  mapsById: Record<string, GameMap>;
  catalogs: Record<string, Record<string, string>>;
  dialogueById: Record<string, DialogueNode>;
  creatureIds: Set<string>;
  companionIds: Set<string>;
  movesById: Record<string, MoveDefinition>;
  creaturesById: Record<string, CreatureDefinition>;
  encountersById: Record<string, EncounterDefinition>;
  boundEncounterIds: Set<string>;
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
        format: "lumen-game-save-v3-experimental",
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
        dialogue: character.dialogue,
        ...cell(character.object)
      })),
      transitions: world.transitions.map((transition) => ({
        id: transition.id,
        targetMap: transition.targetMap,
        targetSpawn: transition.targetSpawn,
        ...cell(transition.object)
      })),
      encounters: world.encounters.map((encounter) => ({
        id: encounter.id,
        encounterId: encounter.encounter,
        ...cell(encounter.object)
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
    catalogs,
    dialogueById: Object.fromEntries(campaign.dialogue.nodes.map((node) => [node.id, node])),
    creatureIds: new Set(campaign.creatures.map((creature) => creature.id)),
    companionIds: new Set(
      campaign.dialogue.nodes.flatMap((node) =>
        node.choices.flatMap((choice) =>
          choice.effect === "choose-companion" && choice.creature ? [choice.creature] : []
        )
      )
    ),
    movesById: Object.fromEntries(campaign.moves.map((move) => [move.id, move])),
    creaturesById: Object.fromEntries(
      campaign.creatures.map((creature) => [creature.id, creature])
    ),
    encountersById: Object.fromEntries(
      campaign.encounters.map((encounter) => [encounter.id, encounter])
    ),
    boundEncounterIds: new Set(
      Object.values(mapsById).flatMap((map) => map.encounters.map((item) => item.encounterId))
    )
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
    format: "lumen-game-state-v3-experimental",
    tick: 0,
    locale,
    activeMapId: mapId,
    mapStates: { [mapId]: { player: { ...spawn, facing: "south" }, message: null } },
    dialogue: null,
    party: [],
    battle: null,
    completedEncounters: []
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

  if (action.type === "use-move") {
    useBattleMove(state, action.moveId, facts);
    return { state, facts };
  }
  if (action.type === "finish-battle") {
    finishBattle(model, state, facts);
    return { state, facts };
  }
  if (state.battle) throw new TypeError("Battle must be finished before another action");

  if (action.type === "choose") {
    chooseDialogue(model, state, action.choiceId, facts);
    return { state, facts };
  }
  if (state.dialogue) throw new TypeError("Dialogue must be closed before another action");

  if (action.type === "move") {
    const delta = movement[action.direction];
    if (!delta) throw new TypeError(`Invalid movement direction '${String(action.direction)}'`);
    mapState.player.facing = action.direction;
    const destination = { x: mapState.player.x + delta.x, y: mapState.player.y + delta.y };
    if (!walkable(map, destination)) {
      facts.push({ type: "movement-blocked", ...destination });
      return { state, facts };
    }
    const encounter = map.encounters.find(
      (item) => item.x === destination.x && item.y === destination.y
    );
    if (
      encounter &&
      !state.completedEncounters.includes(encounter.encounterId) &&
      state.party.length === 0
    ) {
      facts.push({
        type: "encounter-companion-required",
        triggerId: encounter.id,
        encounterId: encounter.encounterId
      });
      return { state, facts };
    }
    Object.assign(mapState.player, destination);
    facts.push({ type: "player-moved", ...destination });
    const transition = map.transitions.find(
      (item) => item.x === destination.x && item.y === destination.y
    );
    if (transition) enterTransition(model, state, action.direction, map, transition, facts);
    else if (encounter && !state.completedEncounters.includes(encounter.encounterId)) {
      state.battle = createBattle(model, map.id, encounter, state.party[0]);
      facts.push({
        type: "encounter-started",
        triggerId: encounter.id,
        encounterId: encounter.encounterId
      });
    }
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
      state.dialogue = renderDialogue(
        model,
        state.locale,
        map.id,
        character.id,
        character.dialogue
      );
      facts.push({
        type: "dialogue-opened",
        characterId: character.id,
        nodeId: state.dialogue.nodeId
      });
    }
  } else if (action.type !== "wait") {
    throw new TypeError(`Invalid game action '${String((action as { type?: unknown }).type)}'`);
  }
  return { state, facts };
}

function chooseDialogue(
  model: RuntimeModel,
  state: GameState,
  choiceId: string,
  facts: GameFact[]
) {
  if (!state.dialogue) throw new TypeError("No dialogue is open");
  requireText(choiceId, "choiceId");
  const current = model.dialogueById[state.dialogue.nodeId];
  const choice = current?.choices.find((item) => item.id === choiceId);
  if (!choice) throw new TypeError(`Dialogue choice '${choiceId}' is not available`);
  facts.push({ type: "dialogue-choice-selected", choiceId, nodeId: current.id });
  if (choice.effect === "choose-companion") {
    if (!choice.creature || !model.creatureIds.has(choice.creature))
      throw new TypeError(`Dialogue choice '${choiceId}' has an invalid companion`);
    state.party = [choice.creature];
    facts.push({ type: "companion-chosen", creatureId: choice.creature });
  }
  if (choice.effect === "close-dialogue" || !choice.next) {
    state.dialogue = null;
    facts.push({ type: "dialogue-closed", nodeId: current.id });
    return;
  }
  state.dialogue = renderDialogue(
    model,
    state.locale,
    state.dialogue.mapId,
    state.dialogue.characterId,
    choice.next
  );
  facts.push({ type: "dialogue-advanced", nodeId: state.dialogue.nodeId });
}

function renderDialogue(
  model: RuntimeModel,
  locale: string,
  mapId: string,
  characterId: string,
  nodeId: string
): GameDialogue {
  const node = model.dialogueById[nodeId];
  if (!node) throw new TypeError(`Dialogue node '${nodeId}' is not declared`);
  const catalog = model.catalogs[locale];
  const message = catalog[node.messageKey];
  if (typeof message !== "string")
    throw new TypeError(`Message '${node.messageKey}' is missing from locale '${locale}'`);
  return {
    mapId,
    characterId,
    nodeId,
    speaker: node.speaker,
    messageKey: node.messageKey,
    message,
    choices: node.choices.map((choice) => {
      const label = catalog[choice.labelKey];
      if (typeof label !== "string")
        throw new TypeError(`Message '${choice.labelKey}' is missing from locale '${locale}'`);
      return { id: choice.id, labelKey: choice.labelKey, label };
    })
  };
}

function createBattle(
  model: RuntimeModel,
  mapId: string,
  trigger: GameEncounterTrigger,
  companionId: string
): GameBattle {
  const encounter = model.encountersById[trigger.encounterId];
  const ally = model.creaturesById[companionId];
  const enemy = encounter ? model.creaturesById[encounter.creature] : null;
  if (!encounter || !ally || !enemy)
    throw new TypeError(`Encounter '${trigger.encounterId}' has invalid creature data`);
  return {
    mapId,
    triggerId: trigger.id,
    encounterId: encounter.id,
    outcome: "active",
    ally: createBattleParticipant(model, ally),
    enemy: createBattleParticipant(model, enemy)
  };
}

function createBattleParticipant(
  model: RuntimeModel,
  creature: CreatureDefinition
): GameBattleParticipant {
  return {
    id: creature.id,
    name: creature.name,
    health: creature.health,
    maxHealth: creature.health,
    speed: creature.speed,
    moves: creature.moves.map((moveId) => {
      const move = model.movesById[moveId];
      if (!move) throw new TypeError(`Creature '${creature.id}' has invalid move '${moveId}'`);
      return {
        id: move.id,
        name: move.name,
        power: move.power,
        remainingUses: move.uses,
        maxUses: move.uses
      };
    })
  };
}

function useBattleMove(state: GameState, moveId: string, facts: GameFact[]) {
  const battle = state.battle;
  if (!battle) throw new TypeError("No battle is active");
  if (battle.outcome !== "active") throw new TypeError("Battle result must be finished");
  requireText(moveId, "moveId");
  resolveBattleTurn(battle, moveId, facts);
}

function resolveBattleTurn(battle: GameBattle, moveId: string, facts: GameFact[]) {
  const allyMove = battle.ally.moves.find((move) => move.id === moveId);
  if (!allyMove) throw new TypeError(`Battle move '${moveId}' is not available`);
  if (allyMove.remainingUses < 1) throw new TypeError(`Battle move '${moveId}' is exhausted`);

  const allyFirst = battle.ally.speed >= battle.enemy.speed;
  if (allyFirst) {
    attack(battle.ally, battle.enemy, allyMove, "ally", facts);
    if (battle.enemy.health === 0) {
      settleBattle(battle, "victory", facts);
      return;
    }
    enemyAttack(battle, facts);
    if (battle.ally.health === 0) settleBattle(battle, "defeat", facts);
  } else {
    enemyAttack(battle, facts);
    if (battle.ally.health === 0) {
      settleBattle(battle, "defeat", facts);
      return;
    }
    attack(battle.ally, battle.enemy, allyMove, "ally", facts);
    if (battle.enemy.health === 0) settleBattle(battle, "victory", facts);
  }
}

function enemyAttack(battle: GameBattle, facts: GameFact[]) {
  const move = battle.enemy.moves.find((item) => item.remainingUses > 0);
  if (!move) {
    facts.push({ type: "battle-enemy-exhausted", creatureId: battle.enemy.id });
    return;
  }
  attack(battle.enemy, battle.ally, move, "enemy", facts);
}

function attack(
  source: GameBattleParticipant,
  target: GameBattleParticipant,
  move: GameBattleMove,
  actor: "ally" | "enemy",
  facts: GameFact[]
) {
  move.remainingUses -= 1;
  facts.push({
    type: "battle-move-used",
    actor,
    creatureId: source.id,
    moveId: move.id,
    remainingUses: move.remainingUses
  });
  const amount = Math.min(move.power, target.health);
  target.health -= amount;
  facts.push({
    type: "battle-damage-dealt",
    sourceId: source.id,
    targetId: target.id,
    amount,
    remainingHealth: target.health
  });
}

function settleBattle(battle: GameBattle, outcome: "victory" | "defeat", facts: GameFact[]) {
  battle.outcome = outcome;
  facts.push({
    type: outcome === "victory" ? "battle-won" : "battle-lost",
    encounterId: battle.encounterId
  });
}

function finishBattle(model: RuntimeModel, state: GameState, facts: GameFact[]) {
  const battle = state.battle;
  if (!battle) throw new TypeError("No battle is active");
  if (battle.outcome === "active") throw new TypeError("Active battle cannot be finished");
  facts.push({
    type: "battle-finished",
    encounterId: battle.encounterId,
    outcome: battle.outcome
  });
  if (battle.outcome === "victory") {
    state.completedEncounters.push(battle.encounterId);
  } else {
    const map = model.mapsById[battle.mapId];
    const spawn = map.spawns[map.defaultSpawn];
    state.mapStates[battle.mapId].player = { ...spawn, facing: "south" };
    facts.push({ type: "battle-reset", mapId: battle.mapId, spawnId: map.defaultSpawn });
  }
  state.battle = null;
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
  if (!isRecord(value) || value.format !== "lumen-game-save-v3-experimental")
    throw new TypeError("Save format is invalid");
  requireExactKeys(value, ["format", "projectId", "projectVersion", "snapshot"], "save");
  if (value.projectId !== model.projectId || value.projectVersion !== model.projectVersion)
    throw new TypeError("Save belongs to a different project identity");
  if (!isRecord(value.snapshot)) throw new TypeError("Save snapshot is invalid");
  const snapshot = clone(value.snapshot as unknown as GameState);
  requireExactKeys(
    snapshot as unknown as Record<string, unknown>,
    [
      "format",
      "tick",
      "locale",
      "activeMapId",
      "mapStates",
      "dialogue",
      "party",
      "battle",
      "completedEncounters"
    ],
    "save snapshot"
  );
  if (
    snapshot.format !== "lumen-game-state-v3-experimental" ||
    !Number.isInteger(snapshot.tick) ||
    snapshot.tick < 0 ||
    typeof snapshot.locale !== "string" ||
    !model.catalogs[snapshot.locale] ||
    typeof snapshot.activeMapId !== "string" ||
    !model.mapsById[snapshot.activeMapId] ||
    !isRecord(snapshot.mapStates) ||
    !Array.isArray(snapshot.party) ||
    snapshot.party.length > 1 ||
    snapshot.party.some((id) => typeof id !== "string" || !model.companionIds.has(id)) ||
    !Array.isArray(snapshot.completedEncounters) ||
    new Set(snapshot.completedEncounters).size !== snapshot.completedEncounters.length ||
    snapshot.completedEncounters.some(
      (id) => typeof id !== "string" || !model.boundEncounterIds.has(id)
    ) ||
    (snapshot.dialogue !== null && snapshot.battle !== null)
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
  validateSavedDialogue(model, snapshot);
  validateSavedBattle(model, snapshot);
  return snapshot;
}

function validateSavedBattle(model: RuntimeModel, snapshot: GameState) {
  if (snapshot.battle === null) return;
  if (!isRecord(snapshot.battle)) throw new TypeError("Save battle state is invalid");
  const map = model.mapsById[snapshot.battle.mapId];
  const trigger = map?.encounters.find((item) => item.id === snapshot.battle?.triggerId);
  const player = snapshot.mapStates[snapshot.activeMapId]?.player;
  if (
    !map ||
    map.id !== snapshot.activeMapId ||
    !trigger ||
    trigger.encounterId !== snapshot.battle.encounterId ||
    snapshot.completedEncounters.includes(trigger.encounterId) ||
    !player ||
    player.x !== trigger.x ||
    player.y !== trigger.y ||
    snapshot.party.length !== 1
  )
    throw new TypeError("Save battle state is invalid");
  const initial = createBattle(model, map.id, trigger, snapshot.party[0]);
  if (!reachableBattle(initial, snapshot.battle))
    throw new TypeError("Save battle state is invalid");
}

function reachableBattle(initial: GameBattle, target: GameBattle) {
  const expected = JSON.stringify(target);
  const pending = [initial];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const battle = pending.shift();
    if (!battle) continue;
    const serialized = JSON.stringify(battle);
    if (serialized === expected) return true;
    if (visited.has(serialized) || battle.outcome !== "active") continue;
    visited.add(serialized);
    for (const move of battle.ally.moves) {
      if (move.remainingUses < 1) continue;
      const next = clone(battle);
      resolveBattleTurn(next, move.id, []);
      pending.push(next);
    }
  }
  return false;
}

function validateSavedDialogue(model: RuntimeModel, snapshot: GameState) {
  if (snapshot.dialogue === null) return;
  if (!isRecord(snapshot.dialogue)) throw new TypeError("Save dialogue state is invalid");
  requireExactKeys(
    snapshot.dialogue as unknown as Record<string, unknown>,
    ["mapId", "characterId", "nodeId", "speaker", "messageKey", "message", "choices"],
    "save dialogue state"
  );
  const map = model.mapsById[snapshot.dialogue.mapId];
  const character = map?.characters.find((item) => item.id === snapshot.dialogue?.characterId);
  if (
    snapshot.dialogue.mapId !== snapshot.activeMapId ||
    !character ||
    !reachableDialogueState(
      model,
      character.dialogue,
      snapshot.dialogue.nodeId,
      snapshot.party[0] ?? ""
    )
  )
    throw new TypeError("Save dialogue state is invalid");
  const expected = renderDialogue(
    model,
    snapshot.locale,
    snapshot.dialogue.mapId,
    snapshot.dialogue.characterId,
    snapshot.dialogue.nodeId
  );
  if (JSON.stringify(snapshot.dialogue) !== JSON.stringify(expected))
    throw new TypeError("Save dialogue state is invalid");
}

function reachableDialogueState(
  model: RuntimeModel,
  start: string,
  target: string,
  targetCompanion: string
) {
  const pending = [{ nodeId: start, companion: "" }];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const state = pending.shift();
    if (!state) continue;
    const key = `${state.nodeId}\0${state.companion}`;
    if (visited.has(key)) continue;
    if (state.nodeId === target && state.companion === targetCompanion) return true;
    visited.add(key);
    const node = model.dialogueById[state.nodeId];
    for (const choice of node?.choices ?? []) {
      const companion =
        choice.effect === "choose-companion" && choice.creature ? choice.creature : state.companion;
      if (choice.effect === "close-dialogue" || !choice.next)
        pending.push({ nodeId: start, companion });
      else pending.push({ nodeId: choice.next, companion });
    }
  }
  return false;
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
