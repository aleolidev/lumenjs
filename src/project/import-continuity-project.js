import { Ajv2020 } from "ajv/dist/2020.js";
import { importProject, validateProjectManifest } from "./import-project.js";
import { continuityWorldSchema, tiledMapSchema } from "./schemas.js";

const ajv = new Ajv2020({ allErrors: true, strict: true, ownProperties: true });
const validateMap = ajv.compile(tiledMapSchema);
const validateContinuityWorld = ajv.compile(continuityWorldSchema);

export function importContinuityProject(sources, paths = defaultPaths) {
  const primary = importProject(sources, paths);
  if (!primary.valid || !primary.world) {
    return { valid: false, errors: primary.errors, project: null, world: null };
  }
  if (!primary.world.campaign) {
    return {
      valid: false,
      errors: [
        issue(paths.manifest, "/sources/campaign", null, "is required for campaign continuity")
      ],
      project: null,
      world: null
    };
  }
  sources = structuredClone(sources);

  const declaredMaps = sources.manifest.sources.additionalMaps ?? [];
  const providedMaps = sources.additionalMaps ?? [];
  if (!Array.isArray(providedMaps)) {
    return {
      valid: false,
      errors: [
        issue(
          paths.manifest,
          "/sources/additionalMaps",
          providedMaps,
          "must be provided as an array"
        )
      ],
      project: null,
      world: null
    };
  }
  if (declaredMaps.length !== providedMaps.length) {
    return {
      valid: false,
      errors: [
        issue(
          paths.manifest,
          "/sources/additionalMaps",
          declaredMaps.length,
          `declares ${declaredMaps.length} maps but ${providedMaps.length} were provided`
        )
      ],
      project: null,
      world: null
    };
  }

  const errors = [];
  const primaryWorld = attachPrimaryContinuity(
    primary.world,
    sources.map,
    sources.world,
    paths.world,
    errors
  );
  const worlds = [primaryWorld];
  for (let index = 0; index < providedMaps.length; index += 1) {
    const entry = providedMaps[index];
    const declared = declaredMaps[index];
    const entryPaths = paths.additionalMaps?.[index] ?? {
      map: `additional-map-${index}.tmj`,
      world: `additional-world-${index}.lumen.json`
    };
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      errors.push(
        issue(paths.manifest, `/sources/additionalMaps/${index}`, entry, "has no provided sources")
      );
      continue;
    }
    if (
      entry.id !== declared.id ||
      entry.source?.id !== declared.id ||
      entry.source?.map !== declared.map ||
      entry.source?.world !== declared.world
    ) {
      errors.push(
        issue(
          paths.manifest,
          `/sources/additionalMaps/${index}`,
          entry.id ?? null,
          "does not match the declared map source"
        )
      );
      continue;
    }
    const structuralErrorCount = errors.length;
    errors.push(...structuralErrors(validateMap, entry.map, entryPaths.map));
    errors.push(...structuralErrors(validateContinuityWorld, entry.world, entryPaths.world));
    if (errors.length > structuralErrorCount) continue;
    if (entry.id !== entry.world.mapId) {
      errors.push(
        issue(entryPaths.world, "/mapId", entry.world.mapId, "does not match manifest map id")
      );
      continue;
    }
    if (entry.source.map !== entry.world.mapSource) {
      errors.push(
        issue(entryPaths.world, "/mapSource", entry.world.mapSource, "does not match manifest")
      );
      continue;
    }
    worlds.push(resolveContinuityWorld(primary.world.project, entry, entryPaths.world, errors));
  }

  const mapsById = Object.create(null);
  for (const world of worlds) {
    if (mapsById[world.map.id]) {
      errors.push(issue(paths.manifest, "/sources/additionalMaps", world.map.id, "is duplicated"));
    } else {
      mapsById[world.map.id] = world;
    }
  }
  for (const world of worlds) {
    for (const transition of world.mapTransitions) {
      const targetWorld = mapsById[transition.targetMap];
      if (!targetWorld) {
        errors.push(
          issue(
            transition.source,
            `${transition.pointer}/targetMap`,
            transition.targetMap,
            "references missing map"
          )
        );
      } else if (!targetWorld.spawnsById[transition.targetSpawn]) {
        errors.push(
          issue(
            transition.source,
            `${transition.pointer}/targetSpawn`,
            transition.targetSpawn,
            "references missing target spawn"
          )
        );
      }
    }
  }
  if (errors.length > 0) return { valid: false, errors, project: null, world: null };

  const project = {
    ...primary.world.project,
    startMapId: sources.manifest.startMap,
    campaign: primary.world.campaign,
    maps: worlds,
    mapsById
  };
  return { valid: true, errors: [], project, world: primaryWorld };
}

export async function loadContinuityProject(baseUrl = "/first-light/") {
  const manifestPath = `${baseUrl}project.lumen.json`;
  let manifest;
  try {
    manifest = await fetchJson(manifestPath);
  } catch (error) {
    return failedContinuityLoad(error);
  }
  const manifestErrors = validateProjectManifest(manifest, manifestPath);
  if (manifestErrors.length > 0) {
    return { valid: false, errors: manifestErrors, project: null, world: null };
  }
  if (!manifest.sources.campaign) {
    return {
      valid: false,
      errors: [
        issue(manifestPath, "/sources/campaign", null, "is required for campaign continuity")
      ],
      project: null,
      world: null
    };
  }
  const primaryMapPath = `${baseUrl}${manifest.sources.map}`;
  const primaryWorldPath = `${baseUrl}${manifest.sources.world}`;
  const campaignPath = `${baseUrl}${manifest.sources.campaign}`;
  let values;
  try {
    values = await Promise.all([
      fetchJson(primaryMapPath),
      fetchJson(primaryWorldPath),
      fetchJson(campaignPath),
      ...(manifest.sources.additionalMaps ?? []).flatMap((entry) => [
        fetchJson(`${baseUrl}${entry.map}`),
        fetchJson(`${baseUrl}${entry.world}`)
      ])
    ]);
  } catch (error) {
    return failedContinuityLoad(error);
  }
  const [map, world, campaign, ...additionalValues] = values;
  const additionalMaps = (manifest.sources.additionalMaps ?? []).map((source, index) => ({
    id: source.id,
    source,
    map: additionalValues[index * 2],
    world: additionalValues[index * 2 + 1]
  }));
  return importContinuityProject(
    { manifest, map, world, campaign, additionalMaps },
    {
      manifest: manifestPath,
      map: primaryMapPath,
      world: primaryWorldPath,
      campaign: campaignPath,
      additionalMaps: (manifest.sources.additionalMaps ?? []).map((entry) => ({
        map: `${baseUrl}${entry.map}`,
        world: `${baseUrl}${entry.world}`
      }))
    }
  );
}

function attachPrimaryContinuity(world, map, metadata, source, errors) {
  const objects = objectIndex(map, source, errors);
  const spawnsById = Object.assign(Object.create(null), { [metadata.spawn]: world.spawn });
  for (const [index, spawn] of (metadata.additionalSpawns ?? []).entries()) {
    if (Object.hasOwn(spawnsById, spawn.id)) {
      errors.push(issue(source, `/additionalSpawns/${index}/id`, spawn.id, "is duplicated"));
      continue;
    }
    const object = requireObject(
      objects,
      spawn.object,
      "spawn",
      map,
      source,
      `/additionalSpawns/${index}/object`,
      errors
    );
    if (object) spawnsById[spawn.id] = objectCell(object, map);
  }
  const transitionIds = new Set();
  const mapTransitions = (metadata.mapTransitions ?? []).flatMap((transition, index) => {
    if (transitionIds.has(transition.id)) {
      errors.push(issue(source, `/mapTransitions/${index}/id`, transition.id, "is duplicated"));
      return [];
    }
    transitionIds.add(transition.id);
    const object = requireObject(
      objects,
      transition.object,
      "transition",
      map,
      source,
      `/mapTransitions/${index}/object`,
      errors
    );
    return object
      ? [resolvedTransition(transition, object, map, source, `/mapTransitions/${index}`)]
      : [];
  });
  validateDistinctTransitionAreas(mapTransitions, errors);
  return { ...world, kind: "vale", spawnsById, mapTransitions };
}

function resolveContinuityWorld(project, entry, source, errors) {
  const map = entry.map;
  const metadata = entry.world;
  const objects = objectIndex(map, source, errors);
  const spawnsById = Object.create(null);
  for (const [index, spawn] of metadata.spawns.entries()) {
    if (Object.hasOwn(spawnsById, spawn.id)) {
      errors.push(issue(source, `/spawns/${index}/id`, spawn.id, "is duplicated"));
      continue;
    }
    const object = requireObject(
      objects,
      spawn.object,
      "spawn",
      map,
      source,
      `/spawns/${index}/object`,
      errors
    );
    if (object) spawnsById[spawn.id] = objectCell(object, map);
  }
  const characterObject = metadata.character
    ? requireObject(
        objects,
        metadata.character.object,
        "character",
        map,
        source,
        "/character/object",
        errors
      )
    : null;
  const transitionIds = new Set();
  const mapTransitions = metadata.transitions.flatMap((transition, index) => {
    if (transitionIds.has(transition.id)) {
      errors.push(issue(source, `/transitions/${index}/id`, transition.id, "is duplicated"));
      return [];
    }
    transitionIds.add(transition.id);
    const object = requireObject(
      objects,
      transition.object,
      "transition",
      map,
      source,
      `/transitions/${index}/object`,
      errors
    );
    return object
      ? [resolvedTransition(transition, object, map, source, `/transitions/${index}`)]
      : [];
  });
  validateDistinctTransitionAreas(mapTransitions, errors);
  return {
    project,
    kind: metadata.kind,
    map: {
      id: metadata.mapId,
      width: map.width,
      height: map.height,
      tileSize: map.tilewidth,
      tiledVersion: map.tiledversion ?? "unknown"
    },
    spawn: spawnsById[metadata.defaultSpawn],
    defaultSpawnId: metadata.defaultSpawn,
    spawnsById,
    character: characterObject
      ? { ...objectCell(characterObject, map), ...metadata.character }
      : null,
    collisions: [...objects.values()]
      .filter((object) => object.type === "collision")
      .map((object) => ({ id: object.name, ...objectRectangle(object, map) })),
    mapTransitions
  };
}

function validateDistinctTransitionAreas(transitions, errors) {
  for (const [index, transition] of transitions.entries()) {
    const previous = transitions
      .slice(0, index)
      .find((candidate) => rectanglesOverlap(candidate, transition));
    if (previous)
      errors.push(
        issue(
          transition.source,
          `${transition.pointer}/object`,
          transition.id,
          `overlaps transition '${previous.id}'`
        )
      );
  }
}

function rectanglesOverlap(left, right) {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

function resolvedTransition(transition, object, map, source, pointer) {
  return {
    id: transition.id,
    ...objectRectangle(object, map),
    targetMap: transition.targetMap,
    targetSpawn: transition.targetSpawn,
    facing: transition.facing ?? "south",
    source,
    pointer
  };
}

function objectIndex(map, source, errors) {
  const objects = new Map();
  for (const layer of map.layers.filter((item) => item.type === "objectgroup")) {
    for (const object of layer.objects ?? []) {
      if (!object.name) continue;
      if (objects.has(object.name)) {
        errors.push(issue(source, `/objects/${object.name}`, object.name, "is duplicated"));
      } else objects.set(object.name, object);
    }
  }
  return objects;
}

function requireObject(objects, id, type, map, source, pointer, errors) {
  const object = objects.get(id);
  if (!object) errors.push(issue(source, pointer, id, `references missing Tiled object '${id}'`));
  else if (object.type !== type)
    errors.push(issue(source, pointer, id, `expects Tiled type '${type}'`));
  else if (!objectOriginInside(object, map))
    errors.push(issue(source, pointer, id, "references a Tiled object outside the map"));
  else if (["spawn", "transition"].includes(type) && objectCellCollides(object, objects, map))
    errors.push(issue(source, pointer, id, `references a ${type} inside authored collision`));
  else if (["spawn", "transition"].includes(type) && objectCellOccupied(object, objects, map))
    errors.push(issue(source, pointer, id, `references an occupied ${type} cell`));
  else return object;
  return null;
}

function objectOriginInside(object, map) {
  return (
    object.x >= 0 &&
    object.y >= 0 &&
    object.x < map.width * map.tilewidth &&
    object.y < map.height * map.tileheight
  );
}

function objectCellCollides(object, objects, map) {
  const point = objectCell(object, map);
  return [...objects.values()]
    .filter((candidate) => candidate.type === "collision")
    .some((candidate) => contains(objectRectangle(candidate, map), point));
}

function objectCellOccupied(object, objects, map) {
  const point = objectCell(object, map);
  return [...objects.values()]
    .filter((candidate) => candidate !== object && ["character", "beacon"].includes(candidate.type))
    .some((candidate) => {
      const cell = objectCell(candidate, map);
      return cell.x === point.x && cell.y === point.y;
    });
}

function contains(rectangle, point) {
  return (
    point.x >= rectangle.x &&
    point.y >= rectangle.y &&
    point.x < rectangle.x + rectangle.width &&
    point.y < rectangle.y + rectangle.height
  );
}

function objectCell(object, map) {
  return { x: Math.floor(object.x / map.tilewidth), y: Math.floor(object.y / map.tileheight) };
}

function objectRectangle(object, map) {
  return {
    ...objectCell(object, map),
    width: Math.max(1, Math.ceil((object.width ?? map.tilewidth) / map.tilewidth)),
    height: Math.max(1, Math.ceil((object.height ?? map.tileheight) / map.tileheight))
  };
}

function structuralErrors(validate, value, source) {
  if (validate(value)) return [];
  return (validate.errors ?? []).map((error) =>
    issue(source, schemaPointer(error), error.params?.additionalProperty, error.message)
  );
}

function schemaPointer(error) {
  const property = error.params?.missingProperty ?? error.params?.additionalProperty;
  if (typeof property === "string") {
    const escaped = property.replaceAll("~", "~0").replaceAll("/", "~1");
    return `${error.instancePath}/${escaped}`;
  }
  return error.instancePath || "/";
}

function issue(source, pointer, objectId, message = "is invalid") {
  return { source, pointer, objectId: objectId ?? null, message };
}

async function fetchJson(path) {
  let response;
  try {
    response = await fetch(path);
  } catch (error) {
    throw new ContinuitySourceLoadError(
      path,
      `Could not load ${path}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (!response.ok)
    throw new ContinuitySourceLoadError(path, `Could not load ${path}: HTTP ${response.status}`);
  try {
    return await response.json();
  } catch (error) {
    throw new ContinuitySourceLoadError(
      path,
      `Could not parse ${path}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

class ContinuitySourceLoadError extends Error {
  constructor(source, message) {
    super(message);
    this.source = source;
  }
}

function failedContinuityLoad(error) {
  return {
    valid: false,
    errors: [
      issue(
        error instanceof ContinuitySourceLoadError ? error.source : "project.lumen.json",
        "/",
        null,
        error instanceof Error ? error.message : String(error)
      )
    ],
    project: null,
    world: null
  };
}

const defaultPaths = {
  manifest: "project.lumen.json",
  map: "lantern-vale.tmj",
  world: "world.lumen.json",
  campaign: "campaign.lumen.json",
  additionalMaps: []
};
