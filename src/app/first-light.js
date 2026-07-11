import { loadProject } from "../project/import-project.js";
import { createWebGpuRenderer } from "../render/webgpu-renderer.js";
import { buildScene } from "../scene/build-scene.js";
import {
  createCampaignState,
  runCampaignReplay,
  stepCampaign
} from "../simulation/campaign-simulation.js";
import { hashState } from "../simulation/world-simulation.js";

const canvas = requiredElement("scene", HTMLCanvasElement);
const status = requiredElement("status", HTMLElement);
const diagnosticsOutput = requiredElement("diagnostics", HTMLElement);
const message = requiredElement("message", HTMLElement);
const unsupported = requiredElement("unsupported", HTMLElement);
const replayButton = requiredElement("replay", HTMLButtonElement);
const visualModeButton = requiredElement("visual-mode", HTMLButtonElement);
const errorsElement = requiredElement("errors", HTMLElement);
const dialoguePanel = requiredElement("dialogue-panel", HTMLElement);
const dialogueSpeaker = requiredElement("dialogue-speaker", HTMLElement);
const dialogueText = requiredElement("dialogue-text", HTMLElement);
const dialogueChoices = requiredElement("dialogue-choices", HTMLElement);
const battlePanel = requiredElement("battle-panel", HTMLElement);
const battleActions = requiredElement("battle-actions", HTMLElement);
const battleLog = requiredElement("battle-log", HTMLElement);
const allyName = requiredElement("ally-name", HTMLElement);
const opponentName = requiredElement("opponent-name", HTMLElement);
const allyHealth = requiredElement("ally-health", HTMLMeterElement);
const opponentHealth = requiredElement("opponent-health", HTMLMeterElement);
const allyCreature = requiredElement("ally-creature", HTMLElement);
const opponentCreature = requiredElement("opponent-creature", HTMLElement);
const resultPanel = requiredElement("result-panel", HTMLElement);
const resultTitle = requiredElement("result-title", HTMLElement);
const resultText = requiredElement("result-text", HTMLElement);
const continueResult = requiredElement("continue-result", HTMLButtonElement);

const loaded = await loadProject();
if (!loaded.valid || !loaded.world?.campaign) {
  showErrors(loaded.errors);
  document.documentElement.dataset.ready = "error";
  throw new Error("First Light campaign validation failed");
}

const world = loaded.world;
let campaignState = createCampaignState(world);
let recentFacts = [];
let recentInput = null;
let visualMode = "classic";
const renderer = await createWebGpuRenderer(canvas);
let renderQueue = Promise.resolve();

if (renderer.status === "unsupported") {
  unsupported.hidden = false;
  status.textContent = "Campaign valid · WebGPU unavailable";
} else {
  status.textContent = "Campaign valid · WebGPU ready";
}

function campaignDispatch(action) {
  const result = stepCampaign(world, campaignState, action);
  campaignState = result.state;
  recentFacts = result.facts;
  recentInput = action;
  updateGameUi();
  scheduleRender();
  return {
    state: structuredClone(campaignState),
    facts: recentFacts,
    stateHash: hashState(campaignState)
  };
}

function dispatch(action) {
  return campaignDispatch({ type: "world", action });
}

function scheduleRender() {
  renderQueue = renderQueue.then(async () => {
    const sceneStarted = performance.now();
    const scene = buildScene(world, campaignState.world, { visualMode });
    const sceneBuildMs = performance.now() - sceneStarted;
    if (renderer.status === "ready") await renderer.render(scene, sceneBuildMs);
    updateDiagnostics(scene);
  });
  return renderQueue;
}

function updateGameUi() {
  const { mode } = campaignState;
  message.hidden = !campaignState.world.message || mode !== "world";
  message.textContent = campaignState.world.message ?? "";
  dialoguePanel.hidden = mode !== "dialogue";
  battlePanel.hidden = mode !== "battle";
  resultPanel.hidden = mode !== "result";
  if (mode === "dialogue") renderDialogue();
  if (mode === "battle") renderBattle();
  if (mode === "result") renderResult();
}

function renderDialogue() {
  const dialogue = campaignState.dialogue;
  if (!dialogue) throw new Error("Dialogue state is missing");
  const node = world.campaign.dialogue.nodesById[dialogue.nodeId];
  dialogueSpeaker.textContent = node.speaker;
  dialogueText.textContent = node.text;
  dialogueChoices.replaceChildren(
    ...node.choices.map((choice) =>
      actionButton(choice.label, () =>
        campaignDispatch({ type: "dialogue-choice", choice: choice.id })
      )
    )
  );
}

function renderBattle() {
  const battle = campaignState.battle;
  if (!battle) throw new Error("Battle state is missing");
  const { ally, opponent } = battle;
  allyName.textContent = `${ally.name} · ${ally.health}/${ally.maxHealth}`;
  opponentName.textContent = `${opponent.name} · ${opponent.health}/${opponent.maxHealth}`;
  allyHealth.max = ally.maxHealth;
  allyHealth.value = ally.health;
  opponentHealth.max = opponent.maxHealth;
  opponentHealth.value = opponent.health;
  paintCreature(allyCreature, ally.id);
  paintCreature(opponentCreature, opponent.id);
  battleLog.textContent = describeFacts(recentFacts) || "Choose your companion's action.";
  const moveButtons = ally.moves.map((slot) => {
    const move = world.campaign.movesById[slot.id];
    const button = actionButton(`${move.name} · ${slot.remaining} uses`, () =>
      campaignDispatch({ type: "battle-move", move: slot.id })
    );
    button.disabled = slot.remaining < 1;
    return button;
  });
  const itemButton = actionButton(`Sunberry · ${campaignState.inventory.sunberry}`, () =>
    campaignDispatch({ type: "battle-item", item: "sunberry" })
  );
  itemButton.disabled = campaignState.inventory.sunberry < 1;
  battleActions.replaceChildren(...moveButtons, itemButton);
}

function renderResult() {
  const victory = campaignState.outcome === "victory";
  resultTitle.textContent = victory ? "Glintail joins your light" : "The trail sends you home";
  resultText.textContent = victory
    ? "Your companion prevailed. Glintail has joined the party."
    : "Your companion needs rest. You can return and try again in a new playthrough.";
}

function updateDiagnostics(scene) {
  const value = {
    project: {
      id: world.project.id,
      version: world.project.version,
      schemaVersion: world.project.schemaVersion,
      mapId: world.map.id
    },
    input: recentInput,
    simulation: {
      state: campaignState.world,
      campaign: campaignState,
      stateHash: hashState(campaignState),
      recentFacts
    },
    scene: { itemCount: scene.items.length, ...scene.semantics },
    renderer: renderer.diagnostics
  };
  diagnosticsOutput.textContent = JSON.stringify(value, null, 2);
  window.firstLight.diagnostics = value;
}

const keyActions = {
  ArrowUp: "move-north",
  KeyW: "move-north",
  ArrowDown: "move-south",
  KeyS: "move-south",
  ArrowLeft: "move-west",
  KeyA: "move-west",
  ArrowRight: "move-east",
  KeyD: "move-east",
  Space: "interact"
};

window.addEventListener("keydown", (event) => {
  const action = keyActions[event.code];
  if (!action || event.repeat || campaignState.mode !== "world") return;
  event.preventDefault();
  dispatch(action);
});
window.addEventListener("resize", () => scheduleRender());

replayButton.addEventListener("click", async () => {
  const response = await fetch("/first-light/campaign-replay.json");
  const replay = await response.json();
  const result = runCampaignReplay(world, replay);
  campaignState = result.state;
  recentFacts = result.facts;
  recentInput = { type: "canonical-campaign-replay" };
  updateGameUi();
  message.hidden = false;
  message.textContent = `Campaign replay complete · ${result.stateHash}`;
  await scheduleRender();
});

visualModeButton.addEventListener("click", async () => {
  visualMode = visualMode === "classic" ? "enhanced" : "classic";
  visualModeButton.textContent = `Visual mode: ${visualMode === "classic" ? "Classic" : "Enhanced"}`;
  visualModeButton.setAttribute("aria-pressed", String(visualMode === "enhanced"));
  recentInput = { type: "visual-mode-changed" };
  await scheduleRender();
});

continueResult.addEventListener("click", () => campaignDispatch({ type: "continue-result" }));

window.firstLight = {
  world,
  get state() {
    return structuredClone(campaignState.world);
  },
  get campaignState() {
    return structuredClone(campaignState);
  },
  diagnostics: /** @type {FirstLightDiagnostics} */ ({}),
  dispatch,
  campaignDispatch,
  async settled() {
    await renderQueue;
  }
};

updateGameUi();
await scheduleRender();
document.documentElement.dataset.ready = "true";

function actionButton(label, listener) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", listener);
  return button;
}

function paintCreature(element, creatureId) {
  const creature = world.campaign.creaturesById[creatureId];
  element.style.setProperty("--creature-main", creature.colors[0]);
  element.style.setProperty("--creature-accent", creature.colors[1]);
}

function describeFacts(facts) {
  return facts
    .filter((fact) => fact.type === "move-used" || fact.type === "item-used")
    .map((fact) => {
      if (fact.type === "item-used") return `Sunberry restored ${fact.healed} health.`;
      const move = world.campaign.movesById[fact.move];
      return `${move.name} dealt ${fact.damage} damage.`;
    })
    .join(" ");
}

function showErrors(errors) {
  errorsElement.hidden = false;
  status.textContent = "Project validation failed";
  const list = errorsElement.querySelector("ul");
  for (const error of errors) {
    const item = document.createElement("li");
    item.textContent = `${error.source}${error.pointer}: ${error.message}`;
    list?.append(item);
  }
}

/**
 * @template {Element} T
 * @param {string} id
 * @param {{ new (...args: any[]): T }} elementType
 * @returns {T}
 */
function requiredElement(id, elementType) {
  const element = document.getElementById(id);
  if (!(element instanceof elementType)) throw new Error(`Missing required element #${id}`);
  return element;
}
