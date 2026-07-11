import { Ajv2020 } from "ajv/dist/2020.js";
import { campaignSchema, manifestSchema, tiledMapSchema, worldSchema } from "./schemas.js";

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateManifest = ajv.compile(manifestSchema);
const validateMap = ajv.compile(tiledMapSchema);
const validateWorld = ajv.compile(worldSchema);
const validateCampaign = ajv.compile(campaignSchema);

export function importProject(sources, paths = defaultPaths) {
  const errors = [
    ...structuralErrors(validateManifest, sources.manifest, paths.manifest),
    ...structuralErrors(validateMap, sources.map, paths.map),
    ...structuralErrors(validateWorld, sources.world, paths.world),
    ...(sources.campaign
      ? structuralErrors(validateCampaign, sources.campaign, paths.campaign)
      : [])
  ];
  if (errors.length > 0) return { valid: false, errors, world: null };

  const manifest = sources.manifest;
  const map = sources.map;
  const metadata = sources.world;
  const campaign = sources.campaign ?? null;
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
  if (campaign) validateCampaignReferences(campaign, paths.campaign, errors);
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
      collisions,
      campaign: campaign ? resolveCampaign(campaign) : null
    }
  };
}

export async function loadProject(baseUrl = "/first-light/") {
  const manifestPath = `${baseUrl}project.lumen.json`;
  const manifest = await fetchJson(manifestPath);
  const [map, world, campaign] = await Promise.all([
    fetchJson(`${baseUrl}${manifest.sources.map}`),
    fetchJson(`${baseUrl}${manifest.sources.world}`),
    manifest.sources.campaign
      ? fetchJson(`${baseUrl}${manifest.sources.campaign}`)
      : Promise.resolve(null)
  ]);
  return importProject(
    { manifest, map, world, ...(campaign ? { campaign } : {}) },
    {
      manifest: manifestPath,
      map: `${baseUrl}${manifest.sources.map}`,
      world: `${baseUrl}${manifest.sources.world}`,
      campaign: manifest.sources.campaign
        ? `${baseUrl}${manifest.sources.campaign}`
        : "campaign.lumen.json"
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
  world: "world.lumen.json",
  campaign: "campaign.lumen.json"
};

function validateCampaignReferences(campaign, source, errors) {
  const unique = (items, kind) => {
    const ids = new Set();
    for (const item of items) {
      if (ids.has(item.id))
        errors.push(issue(source, `/${kind}/${item.id}`, item.id, "is duplicated"));
      ids.add(item.id);
    }
    return ids;
  };
  const moveIds = unique(campaign.moves, "moves");
  const creatureIds = unique(campaign.creatures, "creatures");
  const nodeIds = unique(campaign.dialogue.nodes, "dialogue/nodes");
  if (!nodeIds.has(campaign.dialogue.start))
    errors.push(
      issue(source, "/dialogue/start", campaign.dialogue.start, "references missing dialogue node")
    );
  for (const node of campaign.dialogue.nodes) {
    for (const choice of node.choices) {
      if (choice.next && !nodeIds.has(choice.next))
        errors.push(
          issue(
            source,
            `/dialogue/nodes/${node.id}/choices/${choice.id}/next`,
            choice.next,
            "references missing dialogue node"
          )
        );
      if (choice.effect === "choose-companion" && !creatureIds.has(choice.creature))
        errors.push(
          issue(
            source,
            `/dialogue/nodes/${node.id}/choices/${choice.id}/creature`,
            choice.creature,
            "references missing creature"
          )
        );
    }
  }
  for (const creature of campaign.creatures) {
    for (const move of creature.moves) {
      if (!moveIds.has(move))
        errors.push(
          issue(source, `/creatures/${creature.id}/moves`, move, "references missing move")
        );
    }
  }
  for (const starter of campaign.starters) {
    if (!creatureIds.has(starter))
      errors.push(issue(source, "/starters", starter, "references missing creature"));
  }
  if (!creatureIds.has(campaign.encounter.creature))
    errors.push(
      issue(
        source,
        "/encounter/creature",
        campaign.encounter.creature,
        "references missing creature"
      )
    );
}

function resolveCampaign(campaign) {
  return {
    ...structuredClone(campaign),
    movesById: Object.fromEntries(campaign.moves.map((move) => [move.id, move])),
    creaturesById: Object.fromEntries(
      campaign.creatures.map((creature) => [creature.id, creature])
    ),
    dialogue: {
      ...structuredClone(campaign.dialogue),
      nodesById: Object.fromEntries(campaign.dialogue.nodes.map((node) => [node.id, node]))
    }
  };
}
