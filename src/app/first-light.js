import { loadProject } from "../project/import-project.js";
import { createWebGpuRenderer } from "../render/webgpu-renderer.js";
import { buildScene } from "../scene/build-scene.js";
import {
  createInitialState,
  hashState,
  runReplay,
  stepWorld
} from "../simulation/world-simulation.js";

const canvas = requiredElement("scene", HTMLCanvasElement);
const status = requiredElement("status", HTMLElement);
const diagnosticsOutput = requiredElement("diagnostics", HTMLElement);
const message = requiredElement("message", HTMLElement);
const unsupported = requiredElement("unsupported", HTMLElement);
const replayButton = requiredElement("replay", HTMLButtonElement);
const visualModeButton = requiredElement("visual-mode", HTMLButtonElement);
const errorsElement = requiredElement("errors", HTMLElement);

const loaded = await loadProject();
if (!loaded.valid || !loaded.world) {
  showErrors(loaded.errors);
  document.documentElement.dataset.ready = "error";
  throw new Error("First Light project validation failed");
}

const world = loaded.world;
let state = createInitialState(world);
let recentFacts = [];
let recentInput = null;
let visualMode = "classic";
const renderer = await createWebGpuRenderer(canvas);
let renderQueue = Promise.resolve();

if (renderer.status === "unsupported") {
  unsupported.hidden = false;
  status.textContent = "Project valid · WebGPU unavailable";
} else {
  status.textContent = "Project valid · WebGPU ready";
}

function dispatch(action) {
  const result = stepWorld(world, state, action);
  state = result.state;
  recentFacts = result.facts;
  recentInput = action;
  message.hidden = !state.message;
  message.textContent = state.message ?? "";
  scheduleRender();
  return { state, facts: recentFacts, stateHash: hashState(state) };
}

function scheduleRender() {
  renderQueue = renderQueue.then(async () => {
    const sceneStarted = performance.now();
    const scene = buildScene(world, state, { visualMode });
    const sceneBuildMs = performance.now() - sceneStarted;
    if (renderer.status === "ready") await renderer.render(scene, sceneBuildMs);
    updateDiagnostics(scene);
  });
  return renderQueue;
}

function updateDiagnostics(scene) {
  const value = {
    project: {
      id: world.project.id,
      version: world.project.version,
      schemaVersion: world.project.schemaVersion,
      mapId: world.map.id,
      tiledVersion: world.map.tiledVersion
    },
    input: recentInput,
    simulation: { state, stateHash: hashState(state), recentFacts },
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
  if (!action || event.repeat) return;
  event.preventDefault();
  dispatch(action);
});
window.addEventListener("resize", () => scheduleRender());

replayButton.addEventListener("click", async () => {
  const response = await fetch("/first-light/replay.json");
  const replay = await response.json();
  const result = runReplay(world, replay);
  state = result.state;
  recentFacts = result.facts;
  recentInput = "canonical-replay";
  message.hidden = false;
  message.textContent = `Replay complete · ${result.stateHash}`;
  await scheduleRender();
});

visualModeButton.addEventListener("click", async () => {
  visualMode = visualMode === "classic" ? "enhanced" : "classic";
  visualModeButton.textContent = `Visual mode: ${visualMode === "classic" ? "Classic" : "Enhanced"}`;
  visualModeButton.setAttribute("aria-pressed", String(visualMode === "enhanced"));
  recentInput = "visual-mode-changed";
  await scheduleRender();
});

window.firstLight = {
  world,
  get state() {
    return structuredClone(state);
  },
  diagnostics: /** @type {FirstLightDiagnostics} */ ({}),
  dispatch,
  async settled() {
    await renderQueue;
  }
};

await scheduleRender();
document.documentElement.dataset.ready = "true";

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
