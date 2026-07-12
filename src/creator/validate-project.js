import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import { EncounterContextError, resolveEncounterContext } from "../modules/resolve-context.js";
import { tiledMapSchema } from "../project/schemas.js";
import {
  creatorCampaignSchema,
  creatorContextContributionSchema,
  creatorLocaleSchema,
  creatorManifestSchema,
  creatorWorldSchema
} from "./schemas.js";

const safePathRemedy =
  "Use an NFC, URL-safe relative path with visible portable segments; avoid dot-prefixed or reserved names and # or %.";
const ajv = new Ajv2020({ allErrors: true, strict: true, ownProperties: true });
const validators = {
  manifest: ajv.compile(creatorManifestSchema),
  map: ajv.compile(tiledMapSchema),
  world: ajv.compile(creatorWorldSchema),
  campaign: ajv.compile(creatorCampaignSchema),
  locale: ajv.compile(creatorLocaleSchema),
  context: ajv.compile(creatorContextContributionSchema)
};
const unreadableDocument = Symbol("unreadable-document");

export async function validateCreatorProject(directory) {
  const root = path.resolve(directory);
  const diagnostics = [];
  if (!(await validateProjectRoot(root, diagnostics))) return result(diagnostics);
  const manifest = await readJson(root, "project.lumen.json", diagnostics, "manifest");
  if (manifest === unreadableDocument) return result(diagnostics);
  validateManifestPaths(manifest, diagnostics);
  addSchemaDiagnostics(validators.manifest, manifest, "project.lumen.json", diagnostics);
  if (diagnostics.some(isError)) return result(diagnostics);

  const declared = declaredPaths(manifest);
  const loaded = {};
  for (const [kind, relative] of declared) {
    if (kind === "provenance" || kind === "asset") {
      await validateDeclaredFile(root, relative, diagnostics);
      continue;
    }
    if (kind === "optional-context" && !(await fileExists(root, relative))) continue;
    const value = await readJson(root, relative, diagnostics, kind);
    if (value !== unreadableDocument) loaded[relative] = value;
  }
  if (diagnostics.some(isError)) return result(diagnostics);

  addSchemaDiagnostics(
    validators.campaign,
    loaded[manifest.sources.campaign],
    manifest.sources.campaign,
    diagnostics
  );
  for (const entry of manifest.sources.maps) {
    addSchemaDiagnostics(validators.map, loaded[entry.map], entry.map, diagnostics);
    addSchemaDiagnostics(validators.world, loaded[entry.world], entry.world, diagnostics);
  }
  for (const relative of Object.values(manifest.sources.locales?.catalogs ?? {})) {
    addSchemaDiagnostics(validators.locale, loaded[relative], relative, diagnostics);
  }
  for (const entry of manifest.sources.contextModules ?? []) {
    if (Object.hasOwn(loaded, entry.source))
      addSchemaDiagnostics(validators.context, loaded[entry.source], entry.source, diagnostics);
  }
  if (diagnostics.some(isError)) return result(diagnostics);

  const context = validateSemantics(manifest, loaded, diagnostics);
  return result(
    diagnostics,
    diagnostics.some(isError) ? null : { root, manifest, loaded, declared, context }
  );
}

async function validateProjectRoot(root, diagnostics) {
  try {
    const info = await lstat(root);
    if (info.isSymbolicLink() || !info.isDirectory()) throw new Error("not a real directory");
    return true;
  } catch {
    diagnostics.push(
      diagnostic("CREATOR_PROJECT_ROOT_UNSAFE", "project.lumen.json", "/", {
        message: "Creator project root must be an existing real directory, not a symbolic link.",
        remedy: "Use the real project directory path before running creator tools."
      })
    );
    return false;
  }
}

function validateManifestPaths(manifest, diagnostics) {
  const sources = manifest && typeof manifest === "object" ? manifest.sources : null;
  if (!sources || typeof sources !== "object") return;
  const candidates = [
    ...(Array.isArray(sources.maps)
      ? sources.maps.flatMap((entry, index) => [
          [entry?.map, `/sources/maps/${index}/map`],
          [entry?.world, `/sources/maps/${index}/world`]
        ])
      : []),
    [sources.campaign, "/sources/campaign"],
    [sources.provenance, "/sources/provenance"],
    ...(Array.isArray(sources.assets)
      ? sources.assets.map((value, index) => [value, `/sources/assets/${index}`])
      : []),
    ...(sources.locales?.catalogs && typeof sources.locales.catalogs === "object"
      ? Object.entries(sources.locales.catalogs).map(([locale, value]) => [
          value,
          `/sources/locales/catalogs/${locale}`
        ])
      : []),
    ...(Array.isArray(sources.contextModules)
      ? sources.contextModules.map((entry, index) => [
          entry?.source,
          `/sources/contextModules/${index}/source`
        ])
      : [])
  ];
  const reservedExportPaths = new Set(
    [
      "project.lumen.json",
      "index.html",
      "lumen-core.js",
      "offline.js",
      "playtest-browser.js",
      "playtest-simulation.js",
      "resolve-context.js",
      "service-worker.js",
      "lumen-export-manifest.json"
    ].map((value) => value.toLowerCase())
  );
  const portablePaths = new Map();
  for (const [value, pointer] of candidates) {
    if (typeof value === "string" && isUnsafeDeclaredPath(value)) {
      diagnostics.push(
        diagnostic("CREATOR_PATH_UNSAFE", "project.lumen.json", pointer, {
          value,
          message: "Declared path is unsafe.",
          remedy: safePathRemedy
        })
      );
    } else if (typeof value === "string") {
      const key = value.toLowerCase().normalize("NFC");
      const previous = portablePaths.get(key);
      if (reservedExportPaths.has(key)) {
        diagnostics.push(
          diagnostic("CREATOR_PATH_RESERVED", "project.lumen.json", pointer, {
            value,
            message: "Declared path is reserved for creator/export tooling.",
            remedy: "Choose a distinct project-owned source path."
          })
        );
      } else if (previous && previous.value !== value) {
        diagnostics.push(
          diagnostic("CREATOR_PATH_COLLISION", "project.lumen.json", pointer, {
            value,
            message: "Declared paths collide under portable case-insensitive identity.",
            remedy: "Give every distinct source a case-insensitively unique NFC path.",
            related: { source: "project.lumen.json", pointer: previous.pointer }
          })
        );
      } else if (!previous) portablePaths.set(key, { value, pointer });
    }
  }
}

function validateSemantics(manifest, loaded, diagnostics) {
  const mapEntries = uniqueById(
    manifest.sources.maps,
    "project.lumen.json",
    "/sources/maps",
    diagnostics
  );
  if (!mapEntries.has(manifest.startMap)) {
    diagnostics.push(
      diagnostic("CREATOR_START_MAP_MISSING", "project.lumen.json", "/startMap", {
        value: manifest.startMap,
        message: `Start map '${manifest.startMap}' is not declared.`,
        remedy: "Choose the id of a declared map."
      })
    );
  }

  const worlds = new Map();
  for (const [index, entry] of manifest.sources.maps.entries()) {
    const map = loaded[entry.map];
    const world = loaded[entry.world];
    if (entry.id !== world.mapId) {
      diagnostics.push(
        diagnostic("CREATOR_MAP_ID_MISMATCH", entry.world, "/mapId", {
          value: world.mapId,
          message: `World map id does not match manifest id '${entry.id}'.`,
          remedy: "Use the same stable map id in the manifest and world metadata.",
          related: { source: "project.lumen.json", pointer: `/sources/maps/${index}/id` }
        })
      );
    }
    if (entry.map !== world.mapSource) {
      diagnostics.push(
        diagnostic("CREATOR_MAP_SOURCE_MISMATCH", entry.world, "/mapSource", {
          value: world.mapSource,
          message: `World map source does not match '${entry.map}'.`,
          remedy: "Point mapSource at the map declared beside this world.",
          related: { source: "project.lumen.json", pointer: `/sources/maps/${index}/map` }
        })
      );
    }
    const objects = objectIndex(map, entry.map, diagnostics);
    const spawns = uniqueById(world.spawns, entry.world, "/spawns", diagnostics);
    uniqueById(world.characters, entry.world, "/characters", diagnostics);
    uniqueById(world.transitions, entry.world, "/transitions", diagnostics);
    if (!spawns.has(world.defaultSpawn)) {
      diagnostics.push(
        diagnostic("CREATOR_DEFAULT_SPAWN_MISSING", entry.world, "/defaultSpawn", {
          value: world.defaultSpawn,
          message: `Default spawn '${world.defaultSpawn}' is not declared.`,
          remedy: "Choose an id from this world's spawns array."
        })
      );
    }
    for (const [kind, items, expected] of [
      ["spawns", world.spawns, "spawn"],
      ["characters", world.characters, "character"],
      ["transitions", world.transitions, "transition"]
    ]) {
      for (const [itemIndex, item] of items.entries()) {
        validateObjectReference(
          objects,
          item.object,
          expected,
          map,
          entry,
          kind,
          itemIndex,
          diagnostics
        );
      }
    }
    validateDistinctTriggerCells(world.characters, "characters", objects, map, entry, diagnostics);
    validateDistinctTriggerCells(
      world.transitions,
      "transitions",
      objects,
      map,
      entry,
      diagnostics
    );
    worlds.set(entry.id, { entry, world, spawns });
  }

  for (const { entry, world } of worlds.values()) {
    for (const [index, transition] of world.transitions.entries()) {
      const target = worlds.get(transition.targetMap);
      if (!target) {
        diagnostics.push(
          diagnostic(
            "CREATOR_TRANSITION_MAP_MISSING",
            entry.world,
            `/transitions/${index}/targetMap`,
            {
              value: transition.targetMap,
              message: `Transition target map '${transition.targetMap}' is not declared.`,
              remedy: "Declare the target map or correct the stable map id."
            }
          )
        );
      } else if (!target.spawns.has(transition.targetSpawn)) {
        diagnostics.push(
          diagnostic(
            "CREATOR_TRANSITION_SPAWN_MISSING",
            entry.world,
            `/transitions/${index}/targetSpawn`,
            {
              value: transition.targetSpawn,
              message: `Target spawn '${transition.targetSpawn}' is missing from '${transition.targetMap}'.`,
              remedy: "Declare the spawn in the target world or correct targetSpawn.",
              related: { source: target.entry.world, pointer: "/spawns" }
            }
          )
        );
      }
    }
  }
  const messages = validateLocalization(manifest, loaded, diagnostics);
  for (const entry of manifest.sources.maps) {
    const world = loaded[entry.world];
    for (const [index, character] of world.characters.entries())
      validateMessage(
        messages,
        entry.world,
        `/characters/${index}/messageKey`,
        character.messageKey,
        diagnostics
      );
  }
  validateCampaignReferences(
    loaded[manifest.sources.campaign],
    manifest.sources.campaign,
    diagnostics,
    messages
  );
  return validateContextModules(manifest, loaded, diagnostics);
}

function validateDistinctTriggerCells(items, kind, objects, map, entry, diagnostics) {
  const cells = new Map();
  for (const [index, item] of items.entries()) {
    const object = objects.get(item.object);
    if (!object) continue;
    const cell = `${Math.floor(object.x / map.tilewidth)},${Math.floor(object.y / map.tileheight)}`;
    const previous = cells.get(cell);
    if (previous !== undefined) {
      diagnostics.push(
        diagnostic("CREATOR_TRIGGER_CELL_AMBIGUOUS", entry.world, `/${kind}/${index}/object`, {
          value: item.id,
          message: `Multiple ${kind} occupy one focused-playtest trigger cell.`,
          remedy: `Move each ${kind === "characters" ? "character" : "transition"} to a distinct cell.`,
          related: { source: entry.world, pointer: `/${kind}/${previous}/object` }
        })
      );
    } else cells.set(cell, index);
  }
}

function validateContextModules(manifest, loaded, diagnostics) {
  const entries = manifest.sources.contextModules ?? [];
  uniqueById(entries, "project.lumen.json", "/sources/contextModules", diagnostics);
  const modules = entries.map((entry) => ({
    id: entry.id,
    version: entry.version,
    source: entry.source,
    optional: entry.optional ?? false,
    present: Object.hasOwn(loaded, entry.source)
  }));
  const contributions = [];
  for (const [index, entry] of entries.entries()) {
    if (entry.version !== 1) {
      diagnostics.push(
        diagnostic(
          "CREATOR_CONTEXT_VERSION_UNSUPPORTED",
          "project.lumen.json",
          `/sources/contextModules/${index}/version`,
          {
            value: entry.version,
            message: `Context module '${entry.id}' uses unsupported version '${entry.version}'.`,
            remedy: "Migrate the contribution to version 1."
          }
        )
      );
      continue;
    }
    if (!Object.hasOwn(loaded, entry.source)) continue;
    const document = loaded[entry.source];
    contributions.push({
      module: entry.id,
      source: entry.source,
      values: document.values
    });
  }
  try {
    return { modules, resolved: resolveEncounterContext(contributions) };
  } catch (error) {
    if (error instanceof EncounterContextError) {
      diagnostics.push(
        diagnostic(error.code, error.source, "/values", {
          value: error.key,
          message: error.message,
          remedy: error.remedy,
          related: {
            source: error.previous.source,
            pointer: `/values/${error.key}`
          }
        })
      );
      return { modules, resolved: null };
    }
    throw error;
  }
}

function validateLocalization(manifest, loaded, diagnostics) {
  const campaign = loaded[manifest.sources.campaign];
  const config = manifest.sources.locales;
  if (campaign.messages && config) {
    diagnostics.push(
      diagnostic("CREATOR_LOCALIZATION_MIXED", manifest.sources.campaign, "/messages", {
        message: "Inline messages and locale catalogs cannot be used together.",
        remedy: "Move every message into the default locale and remove inline messages."
      })
    );
    return new Set(Object.keys(campaign.messages));
  }
  if (!campaign.messages && !config) {
    diagnostics.push(
      diagnostic("CREATOR_LOCALIZATION_MISSING", "project.lumen.json", "/sources/locales", {
        message: "The project declares neither inline messages nor locale catalogs.",
        remedy: "Declare sources.locales or add temporary inline campaign messages."
      })
    );
    return new Set();
  }
  if (!config) return new Set(Object.keys(campaign.messages));
  const localesBySource = new Map();
  for (const [locale, relative] of Object.entries(config.catalogs)) {
    const previous = localesBySource.get(relative);
    if (previous)
      diagnostics.push(
        diagnostic(
          "CREATOR_LOCALE_SOURCE_DUPLICATE",
          "project.lumen.json",
          `/sources/locales/catalogs/${locale}`,
          {
            value: relative,
            message: `Locale '${locale}' shares catalog '${relative}' with '${previous}'.`,
            remedy: "Give every locale its own declared catalog file.",
            related: {
              source: "project.lumen.json",
              pointer: `/sources/locales/catalogs/${previous}`
            }
          }
        )
      );
    else localesBySource.set(relative, locale);
  }
  if (!Object.hasOwn(config.catalogs, config.default)) {
    diagnostics.push(
      diagnostic(
        "CREATOR_LOCALE_DEFAULT_MISSING",
        "project.lumen.json",
        "/sources/locales/default",
        {
          value: config.default,
          message: `Default locale '${config.default}' has no declared catalog.`,
          remedy: "Declare a catalog for the default locale or select a declared locale."
        }
      )
    );
    return new Set();
  }
  const expected = new Set(Object.keys(loaded[config.catalogs[config.default]]));
  for (const [locale, relative] of Object.entries(config.catalogs)) {
    const catalog = loaded[relative];
    for (const key of expected) {
      if (!Object.hasOwn(catalog, key)) {
        diagnostics.push(
          diagnostic("CREATOR_LOCALE_KEY_MISSING", relative, "/", {
            value: key,
            message: `Locale '${locale}' is missing message key '${key}'.`,
            remedy: "Translate the missing default-locale key."
          })
        );
      }
    }
    for (const key of Object.keys(catalog)) {
      if (!expected.has(key)) {
        diagnostics.push(
          diagnostic("CREATOR_LOCALE_KEY_EXTRA", relative, `/${key}`, {
            value: key,
            message: `Locale '${locale}' contains extra message key '${key}'.`,
            remedy: "Add the key to the default locale or remove it from this catalog."
          })
        );
      }
    }
  }
  return expected;
}

function validateCampaignReferences(campaign, source, diagnostics, messages) {
  const moves = uniqueById(campaign.moves, source, "/moves", diagnostics);
  const creatures = uniqueById(campaign.creatures, source, "/creatures", diagnostics);
  const encounters = uniqueById(campaign.encounters, source, "/encounters", diagnostics);
  const trainers = uniqueById(campaign.trainers, source, "/trainers", diagnostics);
  const quests = uniqueById(campaign.quests, source, "/quests", diagnostics);
  const nodes = uniqueById(campaign.dialogue.nodes, source, "/dialogue/nodes", diagnostics);
  if (!nodes.has(campaign.dialogue.start)) {
    diagnostics.push(
      referenceDiagnostic(
        "CREATOR_DIALOGUE_NODE_MISSING",
        source,
        "/dialogue/start",
        campaign.dialogue.start,
        "/dialogue/nodes"
      )
    );
  }
  for (const [index, node] of campaign.dialogue.nodes.entries()) {
    validateMessage(
      messages,
      source,
      `/dialogue/nodes/${index}/messageKey`,
      node.messageKey,
      diagnostics
    );
    uniqueById(node.choices, source, `/dialogue/nodes/${index}/choices`, diagnostics);
    for (const [choiceIndex, choice] of node.choices.entries()) {
      const pointer = `/dialogue/nodes/${index}/choices/${choiceIndex}`;
      validateMessage(messages, source, `${pointer}/labelKey`, choice.labelKey, diagnostics);
      if (choice.next && !nodes.has(choice.next))
        diagnostics.push(
          referenceDiagnostic(
            "CREATOR_DIALOGUE_NODE_MISSING",
            source,
            `${pointer}/next`,
            choice.next,
            "/dialogue/nodes"
          )
        );
      if (choice.effect === "choose-companion" && !creatures.has(choice.creature))
        diagnostics.push(
          referenceDiagnostic(
            "CREATOR_CREATURE_MISSING",
            source,
            `${pointer}/creature`,
            choice.creature,
            "/creatures"
          )
        );
      if (choice.effect === "close-dialogue" && (choice.next || choice.creature))
        diagnostics.push(
          diagnostic("CREATOR_DIALOGUE_EFFECT_CONFLICT", source, pointer, {
            value: choice.id,
            message: `Close-dialogue choice '${choice.id}' cannot declare next or creature.`,
            remedy: "Remove next and creature, or choose the effect that owns those fields."
          })
        );
    }
  }
  const dialogueById = new Map(campaign.dialogue.nodes.map((node) => [node.id, node]));
  const reachableNodes = new Set();
  const pendingNodes = [campaign.dialogue.start];
  while (pendingNodes.length > 0) {
    const nodeId = pendingNodes.shift();
    if (reachableNodes.has(nodeId)) continue;
    const node = dialogueById.get(nodeId);
    if (!node) continue;
    reachableNodes.add(nodeId);
    for (const choice of node.choices) if (choice.next) pendingNodes.push(choice.next);
  }
  const terminatingNodes = new Set(
    campaign.dialogue.nodes
      .filter((node) => node.choices.some((choice) => !choice.next))
      .map((node) => node.id)
  );
  let terminationChanged = true;
  while (terminationChanged) {
    terminationChanged = false;
    for (const node of campaign.dialogue.nodes) {
      if (
        !terminatingNodes.has(node.id) &&
        node.choices.some((choice) => choice.next && terminatingNodes.has(choice.next))
      ) {
        terminatingNodes.add(node.id);
        terminationChanged = true;
      }
    }
  }
  for (const [index, node] of campaign.dialogue.nodes.entries()) {
    if (!reachableNodes.has(node.id))
      diagnostics.push(
        diagnostic("CREATOR_DIALOGUE_NODE_UNREACHABLE", source, `/dialogue/nodes/${index}/id`, {
          value: node.id,
          message: `Dialogue node '${node.id}' is unreachable from dialogue.start.`,
          remedy: "Add a reachable next reference or remove the disconnected node."
        })
      );
    else if (!terminatingNodes.has(node.id))
      diagnostics.push(
        diagnostic("CREATOR_DIALOGUE_NO_EXIT", source, `/dialogue/nodes/${index}`, {
          value: node.id,
          message: `Dialogue node '${node.id}' cannot reach a closing choice.`,
          remedy: "Add a path to a choice without next."
        })
      );
  }
  for (const [index, creature] of campaign.creatures.entries()) {
    for (const move of creature.moves)
      if (!moves.has(move))
        diagnostics.push(
          referenceDiagnostic(
            "CREATOR_MOVE_MISSING",
            source,
            `/creatures/${index}/moves`,
            move,
            "/moves"
          )
        );
  }
  for (const [index, encounter] of campaign.encounters.entries()) {
    if (!creatures.has(encounter.creature))
      diagnostics.push(
        referenceDiagnostic(
          "CREATOR_CREATURE_MISSING",
          source,
          `/encounters/${index}/creature`,
          encounter.creature,
          "/creatures"
        )
      );
  }
  for (const [index, trainer] of campaign.trainers.entries()) {
    for (const creature of trainer.party) {
      if (!creatures.has(creature))
        diagnostics.push(
          referenceDiagnostic(
            "CREATOR_CREATURE_MISSING",
            source,
            `/trainers/${index}/party`,
            creature,
            "/creatures"
          )
        );
    }
    if (!encounters.has(trainer.encounter))
      diagnostics.push(
        referenceDiagnostic(
          "CREATOR_ENCOUNTER_MISSING",
          source,
          `/trainers/${index}/encounter`,
          trainer.encounter,
          "/encounters"
        )
      );
  }
  for (const [index, quest] of campaign.quests.entries()) {
    validateMessage(messages, source, `/quests/${index}/titleKey`, quest.titleKey, diagnostics);
    validateMessage(messages, source, `/quests/${index}/summaryKey`, quest.summaryKey, diagnostics);
    if (!nodes.has(quest.startsAt))
      diagnostics.push(
        referenceDiagnostic(
          "CREATOR_DIALOGUE_NODE_MISSING",
          source,
          `/quests/${index}/startsAt`,
          quest.startsAt,
          "/dialogue/nodes"
        )
      );
    if (!encounters.has(quest.completesAt))
      diagnostics.push(
        referenceDiagnostic(
          "CREATOR_ENCOUNTER_MISSING",
          source,
          `/quests/${index}/completesAt`,
          quest.completesAt,
          "/encounters"
        )
      );
  }
  void trainers;
  void quests;
}

function validateMessage(messages, source, pointer, value, diagnostics) {
  if (!messages.has(value))
    diagnostics.push(
      referenceDiagnostic("CREATOR_MESSAGE_MISSING", source, pointer, value, "/messages")
    );
}

function referenceDiagnostic(code, source, pointer, value, relatedPointer) {
  return diagnostic(code, source, pointer, {
    value,
    message: `Reference '${value}' does not exist.`,
    remedy: "Declare the referenced id or correct this value.",
    related: { source, pointer: relatedPointer }
  });
}

function objectIndex(map, source, diagnostics) {
  const objects = new Map();
  for (const layer of map.layers.filter((item) => item.type === "objectgroup")) {
    for (const object of layer.objects ?? []) {
      if (!object.name) continue;
      if (objects.has(object.name)) {
        diagnostics.push(
          diagnostic("CREATOR_TILED_OBJECT_DUPLICATE", source, "/layers", {
            value: object.name,
            message: "A Tiled object name is duplicated.",
            remedy: "Give every referenced Tiled object a unique stable name."
          })
        );
      } else objects.set(object.name, object);
    }
  }
  return objects;
}

function validateObjectReference(objects, name, expected, map, entry, kind, index, diagnostics) {
  const object = objects.get(name);
  const pointer = `/${kind}/${index}/object`;
  if (!object) {
    diagnostics.push(
      diagnostic("CREATOR_TILED_OBJECT_MISSING", entry.world, pointer, {
        value: name,
        message: `Tiled object '${name}' is missing from '${entry.map}'.`,
        remedy: `Create a uniquely named '${expected}' object in Tiled or correct this reference.`,
        related: { source: entry.map, pointer: "/layers" }
      })
    );
  } else if (object.type !== expected) {
    diagnostics.push(
      diagnostic("CREATOR_TILED_OBJECT_TYPE", entry.world, pointer, {
        value: name,
        message: `Referenced Tiled object has the wrong type; expected '${expected}'.`,
        remedy: `Set the Tiled object type to '${expected}'.`,
        related: { source: entry.map, pointer: "/layers" }
      })
    );
  } else if (
    object.x < 0 ||
    object.y < 0 ||
    object.x >= map.width * map.tilewidth ||
    object.y >= map.height * map.tileheight
  ) {
    diagnostics.push(
      diagnostic("CREATOR_TILED_OBJECT_OUT_OF_BOUNDS", entry.world, pointer, {
        value: name,
        message: `Tiled object '${name}' is outside '${entry.map}'.`,
        remedy: "Move the referenced object inside the declared map bounds.",
        related: { source: entry.map, pointer: `/objects/${name}` }
      })
    );
  } else if (
    ["spawn", "transition"].includes(expected) &&
    objectCellCollides(object, objects, map)
  ) {
    diagnostics.push(
      diagnostic(`CREATOR_${expected.toUpperCase()}_COLLISION`, entry.world, pointer, {
        value: name,
        message: `${expected === "spawn" ? "Spawn" : "Transition"} '${name}' is inside authored collision.`,
        remedy: `Move the ${expected} to a walkable map cell.`,
        related: { source: entry.map, pointer: `/objects/${name}` }
      })
    );
  } else if (
    ["spawn", "transition"].includes(expected) &&
    objectCellOccupied(object, objects, map)
  ) {
    diagnostics.push(
      diagnostic(`CREATOR_${expected.toUpperCase()}_OCCUPIED`, entry.world, pointer, {
        value: name,
        message: `${expected === "spawn" ? "Spawn" : "Transition"} '${name}' shares a character cell.`,
        remedy: `Move the ${expected} to an unoccupied walkable map cell.`,
        related: { source: entry.map, pointer: `/objects/${name}` }
      })
    );
  }
}

function objectCellCollides(object, objects, map) {
  const point = {
    x: Math.floor(object.x / map.tilewidth),
    y: Math.floor(object.y / map.tileheight)
  };
  return [...objects.values()]
    .filter((candidate) => candidate.type === "collision")
    .some((candidate) => {
      const rectangle = {
        x: Math.floor(candidate.x / map.tilewidth),
        y: Math.floor(candidate.y / map.tileheight),
        width: Math.max(1, Math.ceil((candidate.width ?? map.tilewidth) / map.tilewidth)),
        height: Math.max(1, Math.ceil((candidate.height ?? map.tileheight) / map.tileheight))
      };
      return (
        point.x >= rectangle.x &&
        point.y >= rectangle.y &&
        point.x < rectangle.x + rectangle.width &&
        point.y < rectangle.y + rectangle.height
      );
    });
}

function objectCellOccupied(object, objects, map) {
  const point = {
    x: Math.floor(object.x / map.tilewidth),
    y: Math.floor(object.y / map.tileheight)
  };
  return [...objects.values()]
    .filter((candidate) => candidate !== object && candidate.type === "character")
    .some(
      (candidate) =>
        Math.floor(candidate.x / map.tilewidth) === point.x &&
        Math.floor(candidate.y / map.tileheight) === point.y
    );
}

function uniqueById(items, source, pointer, diagnostics) {
  const values = new Map();
  for (const [index, item] of items.entries()) {
    if (values.has(item.id)) {
      diagnostics.push(
        diagnostic("CREATOR_ID_DUPLICATE", source, `${pointer}/${index}/id`, {
          value: item.id,
          message: `Stable id '${item.id}' is duplicated.`,
          remedy: "Give each item in this collection a unique stable id.",
          related: { source, pointer: `${pointer}/${values.get(item.id)}/id` }
        })
      );
    } else values.set(item.id, index);
  }
  return values;
}

async function readJson(root, relative, diagnostics, kind) {
  const safe = await safeFile(root, relative, diagnostics);
  if (!safe) return unreadableDocument;
  try {
    return JSON.parse(await readFile(safe, "utf8"));
  } catch (error) {
    diagnostics.push(
      diagnostic("CREATOR_JSON_INVALID", relative, "/", {
        message: `Could not parse ${kind} JSON: ${error instanceof Error ? error.message : String(error)}`,
        remedy: "Correct the JSON syntax and run validation again."
      })
    );
    return unreadableDocument;
  }
}

async function validateDeclaredFile(root, relative, diagnostics) {
  await safeFile(root, relative, diagnostics);
}

async function safeFile(root, relative, diagnostics) {
  if (typeof relative !== "string" || isUnsafeDeclaredPath(relative)) {
    diagnostics.push(
      diagnostic("CREATOR_PATH_UNSAFE", "project.lumen.json", "/sources", {
        value: relative,
        message: "Declared path is unsafe.",
        remedy: safePathRemedy
      })
    );
    return null;
  }
  const target = path.resolve(root, relative);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) return null;
  try {
    const stat = await lstat(target);
    if (stat.isSymbolicLink()) {
      diagnostics.push(
        diagnostic("CREATOR_PATH_SYMLINK", relative, "/", {
          message: `Declared source '${relative}' is a symbolic link.`,
          remedy: "Replace the symlink with a regular project-owned file."
        })
      );
      return null;
    }
    if (!stat.isFile()) {
      diagnostics.push(
        diagnostic("CREATOR_PATH_NOT_FILE", relative, "/", {
          message: `Declared source '${relative}' is not a regular file.`,
          remedy: "Declare individual regular files; directory assets are not supported yet."
        })
      );
      return null;
    }
    const canonicalRoot = await realpath(root);
    const canonicalTarget = await realpath(target);
    if (
      canonicalTarget !== canonicalRoot &&
      !canonicalTarget.startsWith(`${canonicalRoot}${path.sep}`)
    )
      throw new Error("outside root");
    return target;
  } catch (_error) {
    diagnostics.push(
      diagnostic("CREATOR_FILE_MISSING", relative, "/", {
        message: `Declared source '${relative}' is missing or unavailable.`,
        remedy: "Create the file inside the project or correct its manifest path."
      })
    );
    return null;
  }
}

function isUnsafeDeclaredPath(relative) {
  const normalized = relative.replaceAll("\\", "/");
  const segments = normalized.split("/");
  return (
    relative.length === 0 ||
    /[\p{C}\p{Zl}\p{Zp}]/u.test(relative) ||
    path.isAbsolute(relative) ||
    relative !== normalized ||
    path.posix.normalize(relative) !== relative ||
    segments.some(isUnsafePathSegment)
  );
}

function isUnsafePathSegment(segment) {
  return (
    ["", ".", "..", "__proto__", "constructor", "prototype"].includes(segment) ||
    segment.startsWith(".") ||
    segment !== segment.normalize("NFC") ||
    /[<>:"|?*#%]/.test(segment) ||
    /[. ]$/.test(segment) ||
    /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:[.]|$)/i.test(segment)
  );
}

function declaredPaths(manifest) {
  return [
    ["manifest", "project.lumen.json"],
    ...manifest.sources.maps.flatMap((entry) => [
      ["map", entry.map],
      ["world", entry.world]
    ]),
    ["campaign", manifest.sources.campaign],
    ["provenance", manifest.sources.provenance],
    ...Object.values(manifest.sources.locales?.catalogs ?? {}).map((relative) => [
      "locale",
      relative
    ]),
    ...(manifest.sources.contextModules ?? []).map((entry) => [
      entry.optional ? "optional-context" : "context",
      entry.source
    ]),
    ...(manifest.sources.assets ?? []).map((asset) => ["asset", asset])
  ];
}

async function fileExists(root, relative) {
  try {
    await lstat(path.join(root, relative));
    return true;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function addSchemaDiagnostics(validate, value, source, diagnostics) {
  if (validate(value)) return;
  for (const error of validate.errors ?? []) {
    diagnostics.push(
      diagnostic("CREATOR_SCHEMA_INVALID", source, schemaPointer(error), {
        value: error.params?.additionalProperty ?? null,
        message: error.message ?? "Value does not match the experimental creator schema.",
        remedy: "Correct the value to match the reported schema constraint."
      })
    );
  }
}

function schemaPointer(error) {
  const property = error.params?.missingProperty ?? error.params?.additionalProperty;
  if (typeof property === "string") {
    const escaped = property.replaceAll("~", "~0").replaceAll("/", "~1");
    return `${error.instancePath}/${escaped}`;
  }
  return error.instancePath || "/";
}

function diagnostic(code, source, pointer, values) {
  return {
    code,
    severity: "error",
    source,
    pointer,
    value: values.value ?? null,
    message: values.message,
    remedy: values.remedy,
    related: values.related ?? null
  };
}

/** @param {any} project */
function result(diagnostics, project = null) {
  const sorted = diagnostics.sort((left, right) =>
    compareText(
      `${left.source}:${left.pointer}:${left.code}`,
      `${right.source}:${right.pointer}:${right.code}`
    )
  );
  return { valid: !sorted.some(isError), diagnostics: sorted, project };
}

function isError(item) {
  return item.severity === "error";
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
