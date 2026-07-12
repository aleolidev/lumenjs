import { resolveEncounterContext } from "../modules/resolve-context.js";
import { createGame } from "./lumen-core.js";

const status = requiredElement("playtest-status");
const mapView = requiredElement("map-view");
const diagnostics = requiredElement("playtest-diagnostics");
const message = requiredElement("playtest-message");
const dialoguePanel = requiredElement("dialogue-panel");
const dialogueSpeaker = requiredElement("dialogue-speaker");
const dialogueChoices = requiredElement("dialogue-choices");
const battlePanel = requiredElement("battle-panel");
const battleStatus = requiredElement("battle-status");
const battleHealth = requiredElement("battle-health");
const battleActions = requiredElement("battle-actions");
const battleFinish = requiredElement("battle-finish");

try {
  const manifest = await fetchJson("project.lumen.json");
  const exportManifest = await fetchJson("lumen-export-manifest.json");
  const loaded = { "project.lumen.json": manifest };
  for (const entry of manifest.sources.maps) {
    loaded[entry.map] = await fetchJson(entry.map);
    loaded[entry.world] = await fetchJson(entry.world);
  }
  loaded[manifest.sources.campaign] = await fetchJson(manifest.sources.campaign);
  for (const source of Object.values(manifest.sources.locales?.catalogs ?? {})) {
    loaded[source] = await fetchJson(source);
  }
  const contributions = [];
  for (const entry of manifest.sources.contextModules ?? []) {
    if (entry.optional && !Object.hasOwn(exportManifest.files, entry.source)) continue;
    const document = await fetchJson(entry.source);
    if (document)
      contributions.push({ module: entry.id, source: entry.source, values: document.values });
  }
  const context = resolveEncounterContext(contributions);
  const query = new URLSearchParams(location.search);
  const game = createGame({
    manifest,
    documents: loaded,
    focus: {
      map: query.get("map") || undefined,
      spawn: query.get("spawn") || undefined,
      locale: query.get("locale") || undefined
    }
  });
  let state = game.getState();
  if (state.locale !== "inline") document.documentElement.lang = state.locale;
  let facts = [];

  const actionButtons = [...document.querySelectorAll("[data-action]")];
  const dispatch = (action) => {
    const result = game.dispatch(typeof action === "string" ? coreAction(action) : action);
    state = result.state;
    facts = result.facts;
    render();
  };
  for (const button of actionButtons) {
    if (!(button instanceof HTMLElement)) continue;
    button.addEventListener("click", () => dispatch(button.dataset.action));
  }
  battleFinish.addEventListener("click", () => dispatch({ type: "finish-battle" }));
  const keys = {
    ArrowUp: "move-north",
    ArrowDown: "move-south",
    ArrowLeft: "move-west",
    ArrowRight: "move-east",
    KeyW: "move-north",
    KeyS: "move-south",
    KeyA: "move-west",
    KeyD: "move-east",
    Space: "interact"
  };
  addEventListener("keydown", (event) => {
    if (
      !keys[event.code] ||
      event.repeat ||
      event.isComposing ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.shiftKey ||
      event.defaultPrevented ||
      ownsKeyboardInput(event.target, event.code) ||
      state.dialogue ||
      state.battle
    )
      return;
    event.preventDefault();
    dispatch(keys[event.code]);
  });

  function render() {
    const map = game.getMap();
    const player = state.mapStates[state.activeMapId].player;
    const cells = Array.from({ length: map.height }, () => Array(map.width).fill("·"));
    for (const collision of map.collisions)
      for (let y = collision.y; y < collision.y + collision.height; y += 1)
        for (let x = collision.x; x < collision.x + collision.width; x += 1)
          if (cells[y]?.[x]) cells[y][x] = "#";
    for (const transition of map.transitions) cells[transition.y][transition.x] = ">";
    for (const encounter of map.encounters)
      if (!state.completedEncounters.includes(encounter.encounterId))
        cells[encounter.y][encounter.x] = "!";
    for (const character of map.characters) cells[character.y][character.x] = "C";
    cells[player.y][player.x] = "@";
    mapView.textContent = cells.map((row) => row.join(" ")).join("\n");
    status.textContent = `${game.projectId} · ${state.activeMapId} · ${state.locale}`;
    if (state.locale === "inline") message.removeAttribute("lang");
    else message.lang = state.locale;
    message.textContent =
      state.dialogue?.message ?? state.mapStates[state.activeMapId].message ?? "";
    dialoguePanel.hidden = !state.dialogue;
    dialogueSpeaker.textContent = state.dialogue?.speaker ?? "";
    dialogueChoices.replaceChildren();
    for (const choice of state.dialogue?.choices ?? []) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = choice.label;
      button.dataset.choice = choice.id;
      button.addEventListener("click", () => dispatch({ type: "choose", choiceId: choice.id }));
      dialogueChoices.append(button);
    }
    battlePanel.hidden = !state.battle;
    battleStatus.textContent = state.battle
      ? `${state.battle.ally.name} versus ${state.battle.enemy.name} · ${state.battle.outcome}`
      : "";
    battleHealth.textContent = state.battle
      ? `${state.battle.ally.name}: ${state.battle.ally.health}/${state.battle.ally.maxHealth} · ${state.battle.enemy.name}: ${state.battle.enemy.health}/${state.battle.enemy.maxHealth}`
      : "";
    battleActions.replaceChildren();
    for (const move of state.battle?.ally.moves ?? []) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `${move.name} · ${move.remainingUses}/${move.maxUses}`;
      button.disabled = state.battle?.outcome !== "active" || move.remainingUses < 1;
      button.addEventListener("click", () => dispatch({ type: "use-move", moveId: move.id }));
      battleActions.append(button);
    }
    battleFinish.hidden = !state.battle || state.battle.outcome === "active";
    for (const button of actionButtons)
      if (button instanceof HTMLButtonElement)
        button.disabled = Boolean(state.dialogue || state.battle);
    diagnostics.textContent = JSON.stringify(
      {
        state,
        context,
        recentFacts: facts
      },
      null,
      2
    );
  }

  render();
  document.documentElement.dataset.ready = "true";
} catch (error) {
  status.textContent = error instanceof Error ? error.message : String(error);
  document.documentElement.dataset.ready = "error";
}

/**
 * @param {string} action
 * @returns {import("../../dist-package/index.js").GameAction}
 */
function coreAction(action) {
  if (action === "interact" || action === "wait") return { type: action };
  const direction = action.startsWith("move-") ? action.slice(5) : "";
  if (!["north", "south", "west", "east"].includes(direction))
    throw new Error(`Invalid creator playtest action '${action}'`);
  return {
    type: "move",
    direction: /** @type {import("../../dist-package/index.js").Direction} */ (direction)
  };
}

async function fetchJson(relative) {
  const response = await fetch(relative);
  if (!response.ok) throw new Error(`Could not load ${relative}: HTTP ${response.status}`);
  return response.json();
}

function requiredElement(id) {
  const value = document.getElementById(id);
  if (!value) throw new Error(`Missing required element #${id}`);
  return value;
}

function ownsKeyboardInput(target, code) {
  if (!(target instanceof Element)) return false;
  if (target.closest("input, select, textarea")) return true;
  const editable = target.closest("[contenteditable]");
  if (editable && editable.getAttribute("contenteditable")?.toLowerCase() !== "false") return true;
  return code === "Space" && Boolean(target.closest("button, a, summary"));
}
