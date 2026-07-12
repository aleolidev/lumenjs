import { Ajv2020 } from "ajv/dist/2020.js";
import { campaignSchema, manifestSchema, tiledMapSchema, worldSchema } from "./schemas.js";

const ajv = new Ajv2020({ allErrors: true, strict: true, ownProperties: true });
const validateManifest = ajv.compile(manifestSchema);
const validateMap = ajv.compile(tiledMapSchema);
const validateWorld = ajv.compile(worldSchema);
const validateCampaign = ajv.compile(campaignSchema);

export function importProject(sources, paths = defaultPaths) {
  if (!sources || typeof sources !== "object" || Array.isArray(sources)) {
    return {
      valid: false,
      errors: [issue(paths.manifest, "/", sources ?? null, "project sources must be an object")],
      world: null
    };
  }
  try {
    sources = structuredClone(sources);
  } catch {
    return {
      valid: false,
      errors: [issue(paths.manifest, "/", null, "project sources must contain cloneable data")],
      world: null
    };
  }
  const errors = [
    ...validateProjectManifest(sources.manifest, paths.manifest),
    ...structuralErrors(validateMap, sources.map, paths.map),
    ...structuralErrors(validateWorld, sources.world, paths.world),
    ...(Object.hasOwn(sources, "campaign")
      ? structuralErrors(validateCampaign, sources.campaign, paths.campaign)
      : [])
  ];
  if (errors.length > 0) return { valid: false, errors, world: null };

  const manifest = sources.manifest;
  const map = sources.map;
  const metadata = sources.world;
  const campaign = Object.hasOwn(sources, "campaign") ? sources.campaign : null;
  const campaignDeclared = typeof manifest.sources.campaign === "string";
  const campaignProvided = Object.hasOwn(sources, "campaign");
  if (campaignDeclared !== campaignProvided) {
    errors.push(
      issue(
        paths.manifest,
        "/sources/campaign",
        manifest.sources.campaign ?? null,
        campaignDeclared
          ? "declares a campaign source that was not provided"
          : "does not declare the provided campaign source"
      )
    );
  }
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
    } else if (!objectOriginInside(object, map)) {
      errors.push(issue(paths.world, pointer, name, "references a Tiled object outside the map"));
    } else if (["spawn", "transition"].includes(type) && objectCellCollides(object, objects, map)) {
      errors.push(
        issue(paths.world, pointer, name, `references a ${type} inside authored collision`)
      );
    } else if (["spawn", "transition"].includes(type) && objectCellOccupied(object, objects, map)) {
      errors.push(issue(paths.world, pointer, name, `references an occupied ${type} cell`));
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

export function validateProjectManifest(value, source = "project.lumen.json") {
  const errors = structuralErrors(validateManifest, value, source);
  if (errors.length > 0) return errors;
  const declared = [
    ["/sources/map", value.sources.map],
    ["/sources/world", value.sources.world],
    ...(value.sources.campaign ? [["/sources/campaign", value.sources.campaign]] : []),
    ...(value.sources.additionalMaps ?? []).flatMap((entry, index) => [
      [`/sources/additionalMaps/${index}/map`, entry.map],
      [`/sources/additionalMaps/${index}/world`, entry.world]
    ])
  ];
  const owners = new Map();
  for (const [pointer, relative] of declared) {
    const portable = relative.toLowerCase();
    const previous = owners.get(portable);
    if (previous) {
      errors.push(
        issue(
          source,
          pointer,
          relative,
          `collides with the source declared at '${previous}' under portable path identity`
        )
      );
    } else owners.set(portable, pointer);
  }
  return errors;
}

export async function loadProject(baseUrl = "/first-light/") {
  const manifestPath = `${baseUrl}project.lumen.json`;
  let manifest;
  try {
    manifest = await fetchJson(manifestPath);
  } catch (error) {
    return failedProjectLoad(error);
  }
  const manifestErrors = validateProjectManifest(manifest, manifestPath);
  if (manifestErrors.length > 0) return { valid: false, errors: manifestErrors, world: null };
  let map;
  let world;
  let campaign;
  try {
    [map, world, campaign] = await Promise.all([
      fetchJson(`${baseUrl}${manifest.sources.map}`),
      fetchJson(`${baseUrl}${manifest.sources.world}`),
      manifest.sources.campaign
        ? fetchJson(`${baseUrl}${manifest.sources.campaign}`)
        : Promise.resolve(null)
    ]);
  } catch (error) {
    return failedProjectLoad(error);
  }
  return importProject(
    { manifest, map, world, ...(manifest.sources.campaign ? { campaign } : {}) },
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
  let response;
  try {
    response = await fetch(path);
  } catch (error) {
    throw new ProjectSourceLoadError(
      path,
      `Could not load ${path}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (!response.ok)
    throw new ProjectSourceLoadError(path, `Could not load ${path}: HTTP ${response.status}`);
  try {
    return await response.json();
  } catch (error) {
    throw new ProjectSourceLoadError(
      path,
      `Could not parse ${path}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

class ProjectSourceLoadError extends Error {
  constructor(source, message) {
    super(message);
    this.source = source;
  }
}

function failedProjectLoad(error) {
  return {
    valid: false,
    errors: [
      issue(
        error instanceof ProjectSourceLoadError ? error.source : "project.lumen.json",
        "/",
        null,
        error instanceof Error ? error.message : String(error)
      )
    ],
    world: null
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

function objectCell(object, map) {
  return {
    x: Math.floor(object.x / map.tilewidth),
    y: Math.floor(object.y / map.tileheight)
  };
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
  const nodesById = new Map(campaign.dialogue.nodes.map((node) => [node.id, node]));
  const starterIds = new Set(campaign.starters);
  const selectableStarters = new Set();
  const starterChoices = [];
  if (!nodeIds.has(campaign.dialogue.start))
    errors.push(
      issue(source, "/dialogue/start", campaign.dialogue.start, "references missing dialogue node")
    );
  for (const node of campaign.dialogue.nodes) {
    const choiceIds = new Set();
    for (const [choiceIndex, choice] of node.choices.entries()) {
      if (choiceIds.has(choice.id))
        errors.push(
          issue(
            source,
            `/dialogue/nodes/${node.id}/choices/${choiceIndex}/id`,
            choice.id,
            "is duplicated within the dialogue node"
          )
        );
      choiceIds.add(choice.id);
      if (choice.next && !nodeIds.has(choice.next))
        errors.push(
          issue(
            source,
            `/dialogue/nodes/${node.id}/choices/${choice.id}/next`,
            choice.next,
            "references missing dialogue node"
          )
        );
      if (choice.effect === "choose-companion") {
        if (!creatureIds.has(choice.creature))
          errors.push(
            issue(
              source,
              `/dialogue/nodes/${node.id}/choices/${choice.id}/creature`,
              choice.creature,
              "references missing creature"
            )
          );
        else if (!starterIds.has(choice.creature))
          errors.push(
            issue(
              source,
              `/dialogue/nodes/${node.id}/choices/${choice.id}/creature`,
              choice.creature,
              "must reference a declared starter"
            )
          );
        else starterChoices.push({ nodeId: node.id, creature: choice.creature });
      } else {
        if (choice.next)
          errors.push(
            issue(
              source,
              `/dialogue/nodes/${node.id}/choices/${choice.id}/next`,
              choice.next,
              "must be absent for close-dialogue"
            )
          );
        if (choice.creature)
          errors.push(
            issue(
              source,
              `/dialogue/nodes/${node.id}/choices/${choice.id}/creature`,
              choice.creature,
              "must be absent for close-dialogue"
            )
          );
      }
    }
  }
  const reachableNodes = new Set();
  const pendingNodes = [campaign.dialogue.start];
  while (pendingNodes.length > 0) {
    const nodeId = pendingNodes.shift();
    if (reachableNodes.has(nodeId)) continue;
    const node = nodesById.get(nodeId);
    if (!node) continue;
    reachableNodes.add(nodeId);
    for (const choice of node.choices) if (choice.next) pendingNodes.push(choice.next);
  }
  for (const node of campaign.dialogue.nodes)
    if (!reachableNodes.has(node.id))
      errors.push(
        issue(source, `/dialogue/nodes/${node.id}`, node.id, "is unreachable from dialogue.start")
      );
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
  for (const nodeId of reachableNodes)
    if (!terminatingNodes.has(nodeId))
      errors.push(
        issue(source, `/dialogue/nodes/${nodeId}`, nodeId, "cannot reach a closing dialogue choice")
      );
  for (const choice of starterChoices)
    if (reachableNodes.has(choice.nodeId)) selectableStarters.add(choice.creature);
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
    else if (!selectableStarters.has(starter))
      errors.push(issue(source, "/starters", starter, "has no companion choice"));
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
  if (campaign.starters.includes(campaign.encounter.creature))
    errors.push(
      issue(
        source,
        "/encounter/creature",
        campaign.encounter.creature,
        "must be distinct from the starter roster"
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
