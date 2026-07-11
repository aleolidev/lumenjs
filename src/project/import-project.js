import { Ajv2020 } from "ajv/dist/2020.js";
import { manifestSchema, tiledMapSchema, worldSchema } from "./schemas.js";

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateManifest = ajv.compile(manifestSchema);
const validateMap = ajv.compile(tiledMapSchema);
const validateWorld = ajv.compile(worldSchema);

export function importProject(sources, paths = defaultPaths) {
  const errors = [
    ...structuralErrors(validateManifest, sources.manifest, paths.manifest),
    ...structuralErrors(validateMap, sources.map, paths.map),
    ...structuralErrors(validateWorld, sources.world, paths.world)
  ];
  if (errors.length > 0) return { valid: false, errors, world: null };

  const manifest = sources.manifest;
  const map = sources.map;
  const metadata = sources.world;
  if (manifest.sources.map !== metadata.mapSource) {
    errors.push(issue(paths.world, "/mapSource", metadata.mapSource, "does not match manifest"));
  }
  if (manifest.startMap !== metadata.mapId) {
    errors.push(
      issue(paths.manifest, "/startMap", manifest.startMap, "does not match world mapId")
    );
  }

  const objects = new Map();
  for (const layer of map.layers.filter((item) => item.type === "objectgroup")) {
    for (const object of layer.objects ?? []) {
      if (!object.name) continue;
      if (objects.has(object.name)) {
        errors.push(issue(paths.map, `/objects/${object.name}`, object.name, "is duplicated"));
      } else {
        objects.set(object.name, object);
      }
    }
  }

  const references = [
    ["/spawn", metadata.spawn, "spawn"],
    ["/character/object", metadata.character.object, "character"],
    ["/beacon/object", metadata.beacon.object, "beacon"],
    ["/bridge/deck", metadata.bridge.deck, "bridge"],
    ["/bridge/underpass", metadata.bridge.underpass, "underpass"],
    ["/transition/object", metadata.transition.object, "transition"],
    ["/transition/target", metadata.transition.target, "spawn"]
  ];
  for (const [pointer, name, type] of references) {
    const object = objects.get(name);
    if (!object) {
      errors.push(issue(paths.world, pointer, name, `references missing Tiled object '${name}'`));
    } else if (object.type !== type) {
      errors.push(issue(paths.world, pointer, name, `expects Tiled type '${type}'`));
    }
  }
  if (errors.length > 0) return { valid: false, errors, world: null };

  const cell = (name) => objectCell(objects.get(name), map);
  const rectangle = (name) => objectRectangle(objects.get(name), map);
  const collisions = [...objects.values()]
    .filter((object) => object.type === "collision")
    .map((object) => ({ id: object.name, ...objectRectangle(object, map) }));

  return {
    valid: true,
    errors: [],
    world: {
      project: {
        id: manifest.projectId,
        title: manifest.title,
        version: manifest.version,
        schemaVersion: manifest.schemaVersion
      },
      map: {
        id: metadata.mapId,
        width: map.width,
        height: map.height,
        tileSize: map.tilewidth,
        tiledVersion: map.tiledversion ?? "unknown"
      },
      spawn: cell(metadata.spawn),
      character: { ...cell(metadata.character.object), ...metadata.character },
      beacon: { ...cell(metadata.beacon.object), stateKey: metadata.beacon.stateKey },
      bridge: {
        deck: rectangle(metadata.bridge.deck),
        underpass: rectangle(metadata.bridge.underpass)
      },
      transition: {
        ...rectangle(metadata.transition.object),
        target: cell(metadata.transition.target)
      },
      collisions
    }
  };
}

export async function loadProject(baseUrl = "/first-light/") {
  const manifestPath = `${baseUrl}project.lumen.json`;
  const manifest = await fetchJson(manifestPath);
  const [map, world] = await Promise.all([
    fetchJson(`${baseUrl}${manifest.sources.map}`),
    fetchJson(`${baseUrl}${manifest.sources.world}`)
  ]);
  return importProject(
    { manifest, map, world },
    {
      manifest: manifestPath,
      map: `${baseUrl}${manifest.sources.map}`,
      world: `${baseUrl}${manifest.sources.world}`
    }
  );
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path}: HTTP ${response.status}`);
  return response.json();
}

function structuralErrors(validate, value, source) {
  if (validate(value)) return [];
  return (validate.errors ?? []).map((error) =>
    issue(source, error.instancePath || "/", error.params?.additionalProperty, error.message)
  );
}

function issue(source, pointer, objectId, message = "is invalid") {
  return { source, pointer, objectId: objectId ?? null, message };
}

function objectCell(object, map) {
  return {
    x: Math.floor(object.x / map.tilewidth),
    y: Math.floor(object.y / map.tileheight)
  };
}

function objectRectangle(object, map) {
  return {
    ...objectCell(object, map),
    width: Math.max(1, Math.ceil((object.width ?? map.tilewidth) / map.tilewidth)),
    height: Math.max(1, Math.ceil((object.height ?? map.tileheight) / map.tileheight))
  };
}

const defaultPaths = {
  manifest: "project.lumen.json",
  map: "lantern-vale.tmj",
  world: "world.lumen.json"
};
