import { randomUUID } from "node:crypto";
import { copyFile, mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createCreatorBackup, restoreCreatorBackupFiles } from "./backup-store.js";
import { validateCreatorProject } from "./validate-project.js";
import { withCreatorWriteLock } from "./write-lock.js";

const supportedKinds = new Set(["map", "spawn", "creature", "dialogue", "encounter", "message"]);
const stableId = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const reservedIds = new Set(["constructor", "prototype"]);

export async function renameCreatorProject(directory, options) {
  const root = path.resolve(directory);
  validateOptions(options);
  if (options.apply) {
    return withCreatorWriteLock(root, () => renameCreatorProjectUnlocked(root, options));
  }
  return renameCreatorProjectUnlocked(root, options);
}

async function renameCreatorProjectUnlocked(root, options) {
  const validation = await validateCreatorProject(root);
  if (!validation.valid || !validation.project) {
    throw new CreatorRenameError(
      "CREATOR_RENAME_INVALID_PROJECT",
      "Source project must validate before rename.",
      validation.diagnostics
    );
  }
  const transformed = transform(validation.project, options);
  if (transformed.changes.length === 0)
    throw new CreatorRenameError(
      "CREATOR_RENAME_NO_CHANGES",
      `No '${options.kind}' id '${options.from}' was found.`
    );
  await validateStagedProject(root, validation.project, transformed.documents);
  const preview = {
    format: "lumen-creator-rename-v1-experimental",
    operation: normalizedOperation(options),
    changedFiles: [...transformed.documents.keys()].sort(),
    changes: transformed.changes
  };
  if (!options.apply) return { applied: false, backupGeneration: null, ...preview };

  const backup = await createCreatorBackup(root, preview, transformed.documents.keys());
  const temporaries = [];
  try {
    let committed = 0;
    for (const [relative, value] of transformed.documents) {
      const target = path.join(root, relative);
      const temporary = `${target}.lumen-rename-${randomUUID()}`;
      temporaries.push(temporary);
      await writeFile(temporary, json(value), { encoding: "utf8", flag: "wx" });
      await rename(temporary, target);
      committed += 1;
      if (options.failAfterFilesForTest === committed)
        throw new Error("Injected rename commit failure");
    }
    const finalValidation = await validateCreatorProject(root);
    if (!finalValidation.valid)
      throw new CreatorRenameError(
        "CREATOR_RENAME_FINAL_INVALID",
        "Renamed project failed final validation.",
        finalValidation.diagnostics
      );
  } catch (error) {
    for (const temporary of temporaries) await rm(temporary, { force: true });
    await restoreCreatorBackupFiles(root, backup.directory, transformed.documents.keys());
    throw error;
  }
  return {
    applied: true,
    backupGeneration: backup.generation,
    backupDirectory: path.relative(root, backup.directory),
    ...preview
  };
}

export class CreatorRenameError extends Error {
  constructor(code, message, diagnostics = []) {
    super(message);
    this.name = "CreatorRenameError";
    this.code = code;
    this.diagnostics = diagnostics;
  }
}

function transform(project, options) {
  const manifest = structuredClone(project.manifest);
  const documents = new Map([["project.lumen.json", manifest]]);
  for (const [relative, value] of Object.entries(project.loaded)) {
    if (relative !== "project.lumen.json") documents.set(relative, structuredClone(value));
  }
  const changes = [];
  const change = (source, pointer, object, key, value) => {
    if (object[key] !== options.from) return;
    changes.push({ source, pointer, before: options.from, after: value });
    object[key] = value;
  };
  const worlds = manifest.sources.maps.map((entry) => ({
    entry,
    source: entry.world,
    value: documents.get(entry.world)
  }));
  const campaignSource = manifest.sources.campaign;
  const campaign = documents.get(campaignSource);

  if (options.kind === "map") {
    const definitions = manifest.sources.maps.filter((entry) => entry.id === options.from);
    requireSingleDefinition(
      definitions,
      manifest.sources.maps.some((entry) => entry.id === options.to),
      options
    );
    for (const [index, entry] of manifest.sources.maps.entries())
      change("project.lumen.json", `/sources/maps/${index}/id`, entry, "id", options.to);
    change("project.lumen.json", "/startMap", manifest, "startMap", options.to);
    for (const { entry, source, value } of worlds) {
      if (entry.id === options.to) change(source, "/mapId", value, "mapId", options.to);
      for (const [index, transition] of value.transitions.entries())
        change(source, `/transitions/${index}/targetMap`, transition, "targetMap", options.to);
    }
  } else if (options.kind === "spawn") {
    const owner = worlds.find(({ entry }) => entry.id === options.map);
    if (!owner)
      throw new CreatorRenameError(
        "CREATOR_RENAME_MAP_MISSING",
        `Map '${options.map}' is not declared.`
      );
    const definitions = owner.value.spawns.filter((spawn) => spawn.id === options.from);
    requireSingleDefinition(
      definitions,
      owner.value.spawns.some((spawn) => spawn.id === options.to),
      options
    );
    for (const [index, spawn] of owner.value.spawns.entries())
      change(owner.source, `/spawns/${index}/id`, spawn, "id", options.to);
    change(owner.source, "/defaultSpawn", owner.value, "defaultSpawn", options.to);
    for (const { source, value } of worlds) {
      for (const [index, transition] of value.transitions.entries()) {
        if (transition.targetMap === options.map)
          change(
            source,
            `/transitions/${index}/targetSpawn`,
            transition,
            "targetSpawn",
            options.to
          );
      }
    }
  } else if (options.kind === "creature") {
    const definitions = campaign.creatures.filter((item) => item.id === options.from);
    requireSingleDefinition(
      definitions,
      campaign.creatures.some((item) => item.id === options.to),
      options
    );
    for (const [index, item] of campaign.creatures.entries())
      change(campaignSource, `/creatures/${index}/id`, item, "id", options.to);
    for (const [nodeIndex, node] of campaign.dialogue.nodes.entries())
      for (const [choiceIndex, choice] of node.choices.entries())
        change(
          campaignSource,
          `/dialogue/nodes/${nodeIndex}/choices/${choiceIndex}/creature`,
          choice,
          "creature",
          options.to
        );
    for (const [index, encounter] of campaign.encounters.entries())
      change(campaignSource, `/encounters/${index}/creature`, encounter, "creature", options.to);
    for (const [trainerIndex, trainer] of campaign.trainers.entries())
      for (const [partyIndex] of trainer.party.entries())
        change(
          campaignSource,
          `/trainers/${trainerIndex}/party/${partyIndex}`,
          trainer.party,
          partyIndex,
          options.to
        );
  } else if (options.kind === "dialogue") {
    const definitions = campaign.dialogue.nodes.filter((item) => item.id === options.from);
    requireSingleDefinition(
      definitions,
      campaign.dialogue.nodes.some((item) => item.id === options.to),
      options
    );
    change(campaignSource, "/dialogue/start", campaign.dialogue, "start", options.to);
    for (const [index, node] of campaign.dialogue.nodes.entries()) {
      change(campaignSource, `/dialogue/nodes/${index}/id`, node, "id", options.to);
      for (const [choiceIndex, choice] of node.choices.entries())
        change(
          campaignSource,
          `/dialogue/nodes/${index}/choices/${choiceIndex}/next`,
          choice,
          "next",
          options.to
        );
    }
    for (const [index, quest] of campaign.quests.entries())
      change(campaignSource, `/quests/${index}/startsAt`, quest, "startsAt", options.to);
    for (const { source, value } of worlds)
      for (const [index, character] of value.characters.entries())
        change(source, `/characters/${index}/dialogue`, character, "dialogue", options.to);
  } else if (options.kind === "encounter") {
    const definitions = campaign.encounters.filter((item) => item.id === options.from);
    requireSingleDefinition(
      definitions,
      campaign.encounters.some((item) => item.id === options.to),
      options
    );
    for (const [index, encounter] of campaign.encounters.entries())
      change(campaignSource, `/encounters/${index}/id`, encounter, "id", options.to);
    for (const [index, trainer] of campaign.trainers.entries())
      change(campaignSource, `/trainers/${index}/encounter`, trainer, "encounter", options.to);
    for (const [index, quest] of campaign.quests.entries())
      change(campaignSource, `/quests/${index}/completesAt`, quest, "completesAt", options.to);
    for (const { source, value } of worlds)
      for (const [index, encounter] of value.encounters.entries())
        change(source, `/encounters/${index}/encounter`, encounter, "encounter", options.to);
  } else if (options.kind === "message") {
    const config = manifest.sources.locales;
    if (!config)
      throw new CreatorRenameError(
        "CREATOR_RENAME_LOCALES_REQUIRED",
        "Message rename requires locale catalogs."
      );
    const defaultCatalog = documents.get(config.catalogs[config.default]);
    requireSingleDefinition(
      Object.hasOwn(defaultCatalog, options.from) ? [options.from] : [],
      Object.hasOwn(defaultCatalog, options.to),
      options
    );
    for (const relative of Object.values(config.catalogs)) {
      const catalog = documents.get(relative);
      changes.push({
        source: relative,
        pointer: `/${options.from}`,
        before: options.from,
        after: options.to
      });
      const value = catalog[options.from];
      delete catalog[options.from];
      catalog[options.to] = value;
    }
    for (const { source, value } of worlds)
      for (const [index, character] of value.characters.entries())
        change(source, `/characters/${index}/messageKey`, character, "messageKey", options.to);
    for (const [nodeIndex, node] of campaign.dialogue.nodes.entries()) {
      change(
        campaignSource,
        `/dialogue/nodes/${nodeIndex}/messageKey`,
        node,
        "messageKey",
        options.to
      );
      for (const [choiceIndex, choice] of node.choices.entries())
        change(
          campaignSource,
          `/dialogue/nodes/${nodeIndex}/choices/${choiceIndex}/labelKey`,
          choice,
          "labelKey",
          options.to
        );
    }
    for (const [index, quest] of campaign.quests.entries()) {
      change(campaignSource, `/quests/${index}/titleKey`, quest, "titleKey", options.to);
      change(campaignSource, `/quests/${index}/summaryKey`, quest, "summaryKey", options.to);
    }
  }
  for (const [relative, value] of [...documents]) {
    if (!changes.some((item) => item.source === relative)) documents.delete(relative);
    else documents.set(relative, value);
  }
  changes.sort((left, right) =>
    compareText(`${left.source}:${left.pointer}`, `${right.source}:${right.pointer}`)
  );
  return { documents, changes };
}

function requireSingleDefinition(definitions, collision, options) {
  if (definitions.length === 0)
    throw new CreatorRenameError(
      "CREATOR_RENAME_SOURCE_MISSING",
      `No '${options.kind}' definition '${options.from}' exists.`
    );
  if (definitions.length > 1)
    throw new CreatorRenameError(
      "CREATOR_RENAME_SOURCE_AMBIGUOUS",
      `More than one '${options.kind}' definition '${options.from}' exists.`
    );
  if (collision)
    throw new CreatorRenameError(
      "CREATOR_RENAME_DESTINATION_EXISTS",
      `A '${options.kind}' definition '${options.to}' already exists.`
    );
}

async function validateStagedProject(root, project, documents) {
  const staging = await mkdtemp(path.join(path.dirname(root), ".lumen-rename-stage-"));
  try {
    for (const [kind, relative] of project.declared) {
      if (kind === "optional-context" && !project.loaded[relative]) continue;
      const destination = path.join(staging, relative);
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(path.join(root, relative), destination);
    }
    for (const [relative, value] of documents)
      await writeFile(path.join(staging, relative), json(value));
    const validation = await validateCreatorProject(staging);
    if (!validation.valid)
      throw new CreatorRenameError(
        "CREATOR_RENAME_STAGED_INVALID",
        "Rename would produce an invalid project.",
        validation.diagnostics
      );
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

function validateOptions(options) {
  if (!supportedKinds.has(options.kind))
    throw new CreatorRenameError(
      "CREATOR_RENAME_KIND_INVALID",
      `Unsupported rename kind '${options.kind}'.`
    );
  if (!stableId.test(options.from) || !stableId.test(options.to))
    throw new CreatorRenameError(
      "CREATOR_RENAME_ID_INVALID",
      "Rename IDs must be stable lowercase kebab-case values."
    );
  if (reservedIds.has(options.from) || reservedIds.has(options.to))
    throw new CreatorRenameError(
      "CREATOR_RENAME_ID_RESERVED",
      "Rename IDs cannot use reserved object-property names."
    );
  if (options.from === options.to)
    throw new CreatorRenameError(
      "CREATOR_RENAME_NO_CHANGES",
      "Source and destination IDs are identical."
    );
  if (options.kind === "spawn" && !options.map)
    throw new CreatorRenameError(
      "CREATOR_RENAME_MAP_REQUIRED",
      "Spawn rename requires --map <id>."
    );
  if (options.kind !== "spawn" && options.map != null)
    throw new CreatorRenameError(
      "CREATOR_RENAME_MAP_UNEXPECTED",
      "Only spawn rename accepts --map <id>."
    );
  if (options.map != null && (!stableId.test(options.map) || reservedIds.has(options.map)))
    throw new CreatorRenameError(
      "CREATOR_RENAME_MAP_INVALID",
      "Rename map scope must be a non-reserved stable lowercase kebab-case ID."
    );
}

function normalizedOperation(options) {
  return { kind: options.kind, from: options.from, to: options.to, map: options.map ?? null };
}

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
