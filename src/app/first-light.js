import { createGenerationStore } from "../persistence/generation-store.js";
import {
  createSaveEnvelope,
  SaveValidationError,
  validateAndMigrateEnvelope
} from "../persistence/save-envelope.js";
import { loadContinuityProject } from "../project/import-continuity-project.js";
import { createWebGpuRenderer } from "../render/webgpu-renderer.js";
import { buildScene } from "../scene/build-scene.js";
import {
  createContinuityState,
  runContinuityReplay,
  stepContinuity
} from "../simulation/continuity-simulation.js";
import { hashState } from "../simulation/world-simulation.js";

const element = (id) => {
  const value = document.getElementById(id);
  if (!value) throw new Error(`Missing required element #${id}`);
  return value;
};
const canvas = /** @type {HTMLCanvasElement} */ (element("scene"));
const status = element("status");
const diagnosticsOutput = element("diagnostics");
const message = element("message");
const unsupported = element("unsupported");
const dialoguePanel = element("dialogue-panel");
const dialogueSpeaker = element("dialogue-speaker");
const dialogueText = element("dialogue-text");
const dialogueChoices = element("dialogue-choices");
const battlePanel = element("battle-panel");
const battleActions = element("battle-actions");
const battleLog = element("battle-log");
const resultPanel = element("result-panel");
const saveStatus = element("save-status");
const importInput = /** @type {HTMLInputElement} */ (element("import-file"));
const importDialog = /** @type {HTMLDialogElement} */ (element("import-dialog"));
const importPreview = element("import-preview");
const confirmImportButton = /** @type {HTMLButtonElement} */ (element("confirm-import"));
const cancelImportButton = /** @type {HTMLButtonElement} */ (element("cancel-import"));

try {
  const loaded = await loadContinuityProject();
  if (!loaded.valid || !loaded.project) {
    showErrors(loaded.errors);
    document.documentElement.dataset.ready = "error";
  } else {
    await startFirstLight(loaded.project);
  }
} catch (error) {
  status.textContent = `First Light startup failed: ${
    error instanceof Error ? error.message : String(error)
  }`;
  document.documentElement.dataset.ready = "error";
}

async function startFirstLight(project) {
  let continuityState = createContinuityState(project);
  let recentFacts = [];
  let recentInput = null;
  let visualMode = "classic";
  let storageResult = null;
  let pendingImport = null;
  let importCommitPending = false;
  const renderer = await createWebGpuRenderer(canvas);
  let store;
  try {
    store = await createGenerationStore("lumen-first-light-v2", project);
  } catch (error) {
    renderer.destroy();
    throw error;
  }
  let resourcesClosed = false;
  addEventListener("pagehide", (event) => {
    if (event instanceof PageTransitionEvent && event.persisted) return;
    if (resourcesClosed) return;
    resourcesClosed = true;
    store.close();
    renderer.destroy();
  });
  let renderQueue = Promise.resolve();

  const storageCapabilities = await readStorageCapabilities();
  status.textContent = `Campaign valid · WebGPU ${renderer.status === "ready" ? "ready" : "unavailable"}`;
  unsupported.hidden = renderer.status !== "unsupported";

  function campaignDispatch(action) {
    const result = stepContinuity(project, continuityState, action);
    continuityState = result.state;
    recentFacts = result.facts;
    recentInput = action;
    updateGameUi();
    scheduleRender();
    return resultForTests();
  }

  function dispatch(action) {
    return campaignDispatch({ type: "world", action });
  }

  function scheduleRender() {
    renderQueue = renderQueue.then(async () => {
      const activeWorld = project.mapsById[continuityState.activeMapId];
      const activeState = continuityState.mapStates[continuityState.activeMapId];
      const started = performance.now();
      const scene = buildScene(activeWorld, activeState, { visualMode });
      const sceneBuildMs = performance.now() - started;
      if (renderer.status === "ready") await renderer.render(scene, sceneBuildMs);
      updateDiagnostics(scene);
    });
    return renderQueue;
  }

  function updateGameUi() {
    const active = continuityState.mapStates[continuityState.activeMapId];
    message.hidden = !active.message || continuityState.mode !== "world";
    message.textContent = active.message ?? "";
    dialoguePanel.hidden = continuityState.mode !== "dialogue";
    battlePanel.hidden = continuityState.mode !== "battle";
    resultPanel.hidden = continuityState.mode !== "result";
    for (const button of worldActionButtons) button.disabled = continuityState.mode !== "world";
    if (continuityState.mode === "dialogue") renderDialogue();
    if (continuityState.mode === "battle") renderBattle();
    if (continuityState.mode === "result") renderResult();
  }

  function renderDialogue() {
    const dialogue = continuityState.dialogue;
    const node = project.campaign.dialogue.nodesById[dialogue.nodeId];
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
    const { ally, opponent } = continuityState.battle;
    element("ally-name").textContent = `${ally.name} · ${ally.health}/${ally.maxHealth}`;
    element("opponent-name").textContent =
      `${opponent.name} · ${opponent.health}/${opponent.maxHealth}`;
    const allyHealth = /** @type {HTMLMeterElement} */ (element("ally-health"));
    const opponentHealth = /** @type {HTMLMeterElement} */ (element("opponent-health"));
    allyHealth.max = ally.maxHealth;
    allyHealth.value = ally.health;
    opponentHealth.max = opponent.maxHealth;
    opponentHealth.value = opponent.health;
    paintCreature(element("ally-creature"), ally.id);
    paintCreature(element("opponent-creature"), opponent.id);
    battleLog.textContent = describeFacts(recentFacts) || "Choose your companion's action.";
    const buttons = ally.moves.map((slot) => {
      const move = project.campaign.movesById[slot.id];
      const button = actionButton(`${move.name} · ${slot.remaining} uses`, () =>
        campaignDispatch({ type: "battle-move", move: slot.id })
      );
      button.disabled = slot.remaining < 1;
      return button;
    });
    const item = actionButton(`Sunberry · ${continuityState.inventory.sunberry}`, () =>
      campaignDispatch({ type: "battle-item", item: "sunberry" })
    );
    item.disabled = continuityState.inventory.sunberry < 1;
    battleActions.replaceChildren(...buttons, item);
  }

  function renderResult() {
    const victory = continuityState.outcome === "victory";
    element("result-title").textContent = victory
      ? "Glintail joins your light"
      : "The trail sends you home";
    element("result-text").textContent = victory
      ? "Your companion prevailed. Glintail has joined the party."
      : "Your companion needs rest. You can return and try again in a new playthrough.";
  }

  async function saveJourney() {
    const envelope = await createSaveEnvelope(project, continuityState, {
      saveId: "journey",
      createdAt: new Date().toISOString()
    });
    const result = await store.save("journey", envelope, { durability: "strict" });
    storageResult = { operation: "save", ok: true, ...result };
    announce(
      result.retentionCleanup === "deferred"
        ? `Journey saved · generation ${result.generation} · old-generation cleanup deferred`
        : `Journey saved · generation ${result.generation}`
    );
    await scheduleRender();
    return result;
  }

  async function loadJourney() {
    const result = await store.load("journey");
    if (!result?.envelope) {
      storageResult = { operation: "load", ok: false, failures: result?.failures ?? [] };
      announce("No valid journey could be loaded");
      await scheduleRender();
      return result;
    }
    continuityState = structuredClone(result.envelope.snapshot);
    storageResult = {
      operation: "load",
      ok: true,
      generation: result.generation,
      snapshotHash: result.envelope.snapshotHash,
      recovered: result.recovered,
      migration: "migration" in result ? result.migration : null,
      failures: result.failures
    };
    updateGameUi();
    announce(
      result.recovered
        ? `Recovered journey from generation ${result.generation}`
        : `Journey loaded · generation ${result.generation}`
    );
    await scheduleRender();
    return result;
  }

  async function prepareImport(value) {
    const result = await validateAndMigrateEnvelope(project, value);
    pendingImport = result;
    const snapshot = result.envelope.snapshot;
    importPreview.textContent = [
      `Project: ${result.envelope.projectId} ${result.envelope.projectVersion}`,
      `Format: ${value.format} → ${result.envelope.format}`,
      `Active map: ${snapshot.activeMapId}`,
      `Party: ${snapshot.party.join(", ") || "none"}`,
      `Migration: ${result.migration ? "required" : "not required"}`
    ].join("\n");
    importDialog.showModal();
    return result;
  }

  async function confirmImport() {
    if (!pendingImport) throw new Error("No validated import is pending");
    const prepared = pendingImport;
    pendingImport = null;
    importCommitPending = true;
    confirmImportButton.disabled = true;
    cancelImportButton.disabled = true;
    let result;
    try {
      result = await store.save("journey", prepared.envelope, { durability: "strict" });
    } catch (error) {
      pendingImport = prepared;
      throw error;
    } finally {
      importCommitPending = false;
      confirmImportButton.disabled = false;
      cancelImportButton.disabled = false;
    }
    continuityState = structuredClone(prepared.envelope.snapshot);
    storageResult = { operation: "import", ok: true, ...result, migration: prepared.migration };
    importDialog.close();
    updateGameUi();
    announce(
      result.retentionCleanup === "deferred"
        ? `Imported journey · generation ${result.generation} · old-generation cleanup deferred`
        : `Imported journey · generation ${result.generation}`
    );
    await scheduleRender();
    return result;
  }

  async function exportJourney({ download = true } = {}) {
    const envelope = await createSaveEnvelope(project, continuityState, {
      saveId: "journey",
      createdAt: new Date().toISOString()
    });
    const json = `${JSON.stringify(envelope, null, 2)}\n`;
    const filename = `${project.id}-journey.lumen-save.json`;
    if (download) {
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    }
    storageResult = {
      operation: "export",
      ok: true,
      filename,
      snapshotHash: envelope.snapshotHash
    };
    announce(`Export ready · ${filename}`);
    await scheduleRender();
    return { envelope, json, filename };
  }

  function updateDiagnostics(scene) {
    const activeState = continuityState.mapStates[continuityState.activeMapId];
    const value = {
      project: {
        id: project.id,
        version: project.version,
        schemaVersion: project.schemaVersion,
        mapId: continuityState.activeMapId
      },
      input: recentInput,
      simulation: {
        state: activeState,
        campaign: continuityState,
        stateHash: hashState(continuityState),
        recentFacts
      },
      continuity: {
        activeMapId: continuityState.activeMapId,
        visitedMaps: Object.keys(continuityState.mapStates)
      },
      storage: { capabilities: storageCapabilities, lastResult: storageResult },
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
  const worldActionButtons = [...document.querySelectorAll("[data-world-action]")].filter(
    (value) => value instanceof HTMLButtonElement
  );
  for (const button of worldActionButtons) {
    button.addEventListener("click", () => {
      const action = button.dataset.worldAction;
      if (action && continuityState.mode === "world") dispatch(action);
    });
  }
  window.addEventListener("keydown", (event) => {
    const action = keyActions[event.code];
    if (
      !action ||
      event.repeat ||
      event.isComposing ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.shiftKey ||
      event.defaultPrevented ||
      ownsKeyboardInput(event.target, event.code) ||
      continuityState.mode !== "world" ||
      importDialog.open
    )
      return;
    event.preventDefault();
    dispatch(action);
  });
  window.addEventListener("resize", scheduleRender);

  element("visual-mode").addEventListener("click", async () => {
    visualMode = visualMode === "classic" ? "enhanced" : "classic";
    element("visual-mode").textContent =
      `Visual mode: ${visualMode === "classic" ? "Classic" : "Enhanced"}`;
    element("visual-mode").setAttribute("aria-pressed", String(visualMode === "enhanced"));
    await scheduleRender();
  });
  element("replay").addEventListener("click", () => {
    void applyContinuityReplay();
  });
  element("continue-result").addEventListener("click", () =>
    campaignDispatch({ type: "continue-result" })
  );
  element("save").addEventListener("click", storageEvent("save", saveJourney));
  element("load").addEventListener("click", storageEvent("load", loadJourney));
  element("export").addEventListener(
    "click",
    storageEvent("export", () => exportJourney())
  );
  element("import").addEventListener("click", () => importInput.click());
  importInput.addEventListener("change", async () => {
    const file = importInput.files?.[0];
    if (!file) return;
    try {
      await prepareImport(JSON.parse(await file.text()));
    } catch (error) {
      storageResult = {
        operation: "import",
        ok: false,
        message: error instanceof Error ? error.message : String(error),
        errors: error instanceof SaveValidationError ? error.issues : []
      };
      announce("Import rejected · the current journey was not changed");
      await scheduleRender();
    } finally {
      importInput.value = "";
    }
  });
  confirmImportButton.addEventListener("click", storageEvent("import", confirmImport));
  cancelImportButton.addEventListener("click", () => {
    pendingImport = null;
    importDialog.close();
  });
  importDialog.addEventListener("cancel", (event) => {
    if (importCommitPending) {
      event.preventDefault();
      return;
    }
    pendingImport = null;
  });

  window.firstLight = {
    project,
    get world() {
      return project.mapsById[continuityState.activeMapId];
    },
    get state() {
      return structuredClone(continuityState.mapStates[continuityState.activeMapId]);
    },
    get campaignState() {
      return structuredClone(continuityState);
    },
    diagnostics: /** @type {FirstLightDiagnostics} */ ({}),
    dispatch,
    campaignDispatch,
    saveJourney,
    loadJourney,
    exportJourney,
    prepareImport,
    confirmImport,
    inspectStore: () => store.inspect("journey"),
    corruptCurrentForTest: (kind) => store.corruptCurrentForTest("journey", kind),
    async settled() {
      await renderQueue;
    }
  };

  updateGameUi();
  await scheduleRender();
  document.documentElement.dataset.ready = "true";

  function resultForTests() {
    return {
      state: structuredClone(continuityState),
      facts: recentFacts,
      stateHash: hashState(continuityState)
    };
  }
  function actionButton(label, listener) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", listener);
    return button;
  }
  function paintCreature(target, creatureId) {
    const creature = project.campaign.creaturesById[creatureId];
    target.style.setProperty("--creature-main", creature.colors[0]);
    target.style.setProperty("--creature-accent", creature.colors[1]);
  }
  function describeFacts(facts) {
    return facts
      .filter((fact) => fact.type === "move-used" || fact.type === "item-used")
      .map((fact) =>
        fact.type === "item-used"
          ? `Sunberry restored ${fact.healed} health.`
          : `${project.campaign.movesById[fact.move].name} dealt ${fact.damage} damage.`
      )
      .join(" ");
  }
  function announce(value) {
    saveStatus.textContent = value;
  }
  function ownsKeyboardInput(target, code) {
    if (!(target instanceof Element)) return false;
    if (target.closest("input, select, textarea")) return true;
    const editable = target.closest("[contenteditable]");
    if (editable && editable.getAttribute("contenteditable")?.toLowerCase() !== "false")
      return true;
    return code === "Space" && Boolean(target.closest("button, a, summary"));
  }
  function storageEvent(operation, action) {
    return () => {
      action().catch(async (error) => {
        storageResult = {
          operation,
          ok: false,
          message: error instanceof Error ? error.message : String(error),
          errors: error instanceof SaveValidationError ? error.issues : []
        };
        announce(
          `${operation[0].toUpperCase()}${operation.slice(1)} failed · no state was changed`
        );
        await scheduleRender();
      });
    };
  }
  async function applyContinuityReplay() {
    let result;
    try {
      const response = await fetch("/first-light/continuity-replay.json");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      result = runContinuityReplay(project, await response.json());
    } catch (error) {
      announce(
        `Continuity replay failed · ${
          error instanceof Error ? error.message : String(error)
        } · no state was changed`
      );
      return;
    }
    continuityState = result.state;
    recentFacts = result.facts;
    recentInput = { type: "canonical-continuity-replay" };
    updateGameUi();
    announce(`Continuity replay complete · ${result.stateHash}`);
    try {
      await scheduleRender();
    } catch (error) {
      announce(
        `Continuity replay applied · render failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
  async function readStorageCapabilities() {
    if (!navigator.storage) return { persisted: null, quota: null, usage: null };
    const [persisted, estimate] = await Promise.all([
      readCapability(() => navigator.storage.persisted?.()),
      readCapability(() => navigator.storage.estimate?.())
    ]);
    return {
      persisted: persisted ?? null,
      quota: estimate?.quota ?? null,
      usage: estimate?.usage ?? null
    };
  }
  async function readCapability(read) {
    try {
      return (await read()) ?? null;
    } catch {
      return null;
    }
  }
}

function showErrors(errors) {
  element("errors").hidden = false;
  status.textContent = "Project validation failed";
  const list = element("errors").querySelector("ul");
  for (const error of errors) {
    const item = document.createElement("li");
    item.textContent = `${error.source}${error.pointer}: ${error.message}`;
    list?.append(item);
  }
}
