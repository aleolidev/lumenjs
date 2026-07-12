import { randomUUID } from "node:crypto";
import { lstat, mkdir, readdir, rename, rm, rmdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function scaffoldCreatorProject(
  directory,
  { title = "New Lumen Journey", failBeforeCommitForTest = false } = {}
) {
  const normalizedTitle = typeof title === "string" ? title.trim() : "";
  if (
    !/[\p{L}\p{N}\p{P}\p{S}]/u.test(normalizedTitle) ||
    /\p{Cc}|\p{Zl}|\p{Zp}|\p{Bidi_Control}|[\u200b\u2060\ufeff]/u.test(normalizedTitle)
  ) {
    throw new CreatorScaffoldError(
      "CREATOR_TITLE_INVALID",
      "Project title must contain visible characters and no control or unsafe invisible characters."
    );
  }
  const target = path.resolve(directory);
  const projectId = slugify(normalizedTitle);
  const parent = path.dirname(target);
  const existing = await directoryState(target);
  if (existing === "non-empty") {
    throw new CreatorScaffoldError("CREATOR_TARGET_NOT_EMPTY", `Target '${target}' is not empty.`);
  }
  if (existing === "unsafe") {
    throw new CreatorScaffoldError(
      "CREATOR_TARGET_UNSAFE",
      `Target '${target}' must be a real directory or a missing path.`
    );
  }
  await mkdir(parent, { recursive: true });
  const staging = `${target}.lumen-create-${randomUUID()}`;
  let removedEmptyTarget = false;
  try {
    await mkdir(staging);
    const files = templateFiles(normalizedTitle, projectId);
    for (const [relative, content] of Object.entries(files)) {
      const destination = path.join(staging, relative);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, content, "utf8");
    }
    if (existing === "empty") {
      await rmdir(target);
      removedEmptyTarget = true;
    }
    if (failBeforeCommitForTest) throw new Error("Injected scaffold commit failure");
    await rename(staging, target);
    return { directory: target, projectId, files: Object.keys(files).sort() };
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    if (removedEmptyTarget) await mkdir(target, { recursive: true });
    throw error;
  }
}

export class CreatorScaffoldError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "CreatorScaffoldError";
    this.code = code;
  }
}

function templateFiles(title, projectId) {
  const manifest = {
    schemaVersion: 1,
    projectId,
    title,
    version: "0.1.0",
    startMap: "willow-crossing",
    sources: {
      maps: [
        {
          id: "willow-crossing",
          map: "maps/willow-crossing.tmj",
          world: "worlds/willow-crossing.lumen.json"
        },
        {
          id: "starglass-workshop",
          map: "maps/starglass-workshop.tmj",
          world: "worlds/starglass-workshop.lumen.json"
        }
      ],
      campaign: "campaign/campaign.lumen.json",
      provenance: "PROVENANCE.md",
      locales: {
        default: "en",
        catalogs: { en: "locales/en.json", es: "locales/es.json" }
      },
      contextModules: [
        {
          id: "workshop-atmosphere",
          version: 1,
          source: "modules/workshop-atmosphere.json"
        },
        {
          id: "careful-traveler",
          version: 1,
          source: "modules/careful-traveler.json",
          optional: true
        }
      ],
      assets: []
    }
  };
  const crossingObjects = [
    tiledObject(1, "crossing-start", "spawn", 64, 160),
    tiledObject(2, "workshop-return", "spawn", 96, 160),
    tiledObject(3, "oren-guide", "character", 128, 128),
    tiledObject(4, "workshop-door", "transition", 224, 96),
    tiledObject(5, "west-stone", "collision", 32, 160)
  ];
  const workshopObjects = [
    tiledObject(1, "workshop-entry", "spawn", 64, 128),
    tiledObject(2, "crossing-door", "transition", 64, 160)
  ];
  const crossingWorld = {
    schemaVersion: 1,
    mapId: "willow-crossing",
    mapSource: "maps/willow-crossing.tmj",
    defaultSpawn: "crossing-start",
    spawns: [
      { id: "crossing-start", object: "crossing-start" },
      { id: "workshop-return", object: "workshop-return" }
    ],
    characters: [{ id: "oren", object: "oren-guide", name: "Oren", messageKey: "oren-welcome" }],
    transitions: [
      {
        id: "enter-workshop",
        object: "workshop-door",
        targetMap: "starglass-workshop",
        targetSpawn: "workshop-entry"
      }
    ]
  };
  const workshopWorld = {
    schemaVersion: 1,
    mapId: "starglass-workshop",
    mapSource: "maps/starglass-workshop.tmj",
    defaultSpawn: "workshop-entry",
    spawns: [{ id: "workshop-entry", object: "workshop-entry" }],
    characters: [],
    transitions: [
      {
        id: "return-crossing",
        object: "crossing-door",
        targetMap: "willow-crossing",
        targetSpawn: "workshop-return"
      }
    ]
  };
  const campaign = {
    schemaVersion: 1,
    dialogue: {
      start: "crossing-welcome",
      nodes: [
        {
          id: "crossing-welcome",
          speaker: "Oren",
          messageKey: "oren-welcome",
          choices: [
            {
              id: "take-bramblefin",
              labelKey: "choose-bramblefin",
              effect: "choose-companion",
              creature: "bramblefin",
              next: "trail-ready"
            },
            {
              id: "take-kitehare",
              labelKey: "choose-kitehare",
              effect: "choose-companion",
              creature: "kitehare",
              next: "trail-ready"
            }
          ]
        },
        {
          id: "trail-ready",
          speaker: "Oren",
          messageKey: "ready-response",
          choices: [{ id: "close-ready", labelKey: "ready-response", effect: "close-dialogue" }]
        }
      ]
    },
    moves: [
      { id: "reed-rush", name: "Reed Rush", power: 4, uses: 5 },
      { id: "skybound-hop", name: "Skybound Hop", power: 5, uses: 4 }
    ],
    creatures: [
      { id: "bramblefin", name: "Bramblefin", health: 18, speed: 5, moves: ["reed-rush"] },
      { id: "kitehare", name: "Kitehare", health: 16, speed: 7, moves: ["skybound-hop"] },
      { id: "prismole", name: "Prismole", health: 20, speed: 4, moves: ["reed-rush"] }
    ],
    encounters: [{ id: "workshop-prismole", creature: "prismole" }],
    trainers: [
      {
        id: "oren-trail-guide",
        name: "Oren",
        party: ["bramblefin"],
        encounter: "workshop-prismole"
      }
    ],
    quests: [
      {
        id: "find-starglass",
        titleKey: "quest-starglass-title",
        summaryKey: "quest-starglass-summary",
        startsAt: "trail-ready",
        completesAt: "workshop-prismole"
      }
    ],
    inventory: { trailTea: 1 }
  };
  return {
    "project.lumen.json": json(manifest),
    "maps/willow-crossing.tmj": json(tiledMap(9, 7, crossingObjects)),
    "maps/starglass-workshop.tmj": json(tiledMap(6, 6, workshopObjects)),
    "worlds/willow-crossing.lumen.json": json(crossingWorld),
    "worlds/starglass-workshop.lumen.json": json(workshopWorld),
    "campaign/campaign.lumen.json": json(campaign),
    "locales/en.json": json({
      "oren-welcome": "The willow paths remember every careful traveler.",
      "choose-bramblefin": "Travel with Bramblefin",
      "choose-kitehare": "Travel with Kitehare",
      "ready-response": "We will follow the starglass trail.",
      "quest-starglass-title": "Find the fallen starglass",
      "quest-starglass-summary": "Follow Oren's trail to the workshop and meet Prismole."
    }),
    "locales/es.json": json({
      "oren-welcome": "Los senderos de sauces recuerdan a cada viajero cuidadoso.",
      "choose-bramblefin": "Viajar con Bramblefin",
      "choose-kitehare": "Viajar con Kitehare",
      "ready-response": "Seguiremos el sendero de cristal estelar.",
      "quest-starglass-title": "Encuentra el cristal estelar caído",
      "quest-starglass-summary": "Sigue el sendero de Oren hasta el taller y conoce a Prismole."
    }),
    "modules/workshop-atmosphere.json": json({
      format: "lumen-context-contribution-v1-experimental",
      values: { terrain: "starglass-floor", weather: "indoor-glimmer" }
    }),
    "modules/careful-traveler.json": json({
      format: "lumen-context-contribution-v1-experimental",
      values: { itemPolicy: "limited", recoveryPolicy: "careful" }
    }),
    ".gitignore":
      "# Local Lumen creator recovery and temporary files.\n/.lumen/\n*.lumen-rename-*\n/.lumen-restore-files-*\n",
    "README.md": `# ${title}\n\nExperimental LumenJS creator project.\n\nValidate with \`lumen validate .\`.\n\nLocal recovery generations under \`.lumen/\` are ignored by Git; use \`lumen backups .\` to inspect them.\n`,
    "PROVENANCE.md": `# ${title} provenance\n\nRecord the source, license, and adaptations for every external asset or reference.\n\nThe scaffold prose and placeholder geometry were created for LumenJS.\n`
  };
}

function tiledMap(width, height, objects) {
  return {
    type: "map",
    version: "1.10",
    tiledversion: "1.12.2",
    orientation: "orthogonal",
    renderorder: "right-down",
    width,
    height,
    tilewidth: 32,
    tileheight: 32,
    infinite: false,
    layers: [
      {
        id: 1,
        name: "ground",
        type: "tilelayer",
        width,
        height,
        data: Array(width * height).fill(1)
      },
      { id: 2, name: "objects", type: "objectgroup", objects }
    ]
  };
}

function tiledObject(id, name, type, x, y) {
  return { id, name, type, x, y, width: 32, height: 32 };
}

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function slugify(value) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!/^[a-z]/.test(slug)) return `journey-${slug || "project"}`;
  if (["constructor", "prototype"].includes(slug)) return `journey-${slug}`;
  return slug;
}

async function directoryState(directory) {
  try {
    const info = await lstat(directory);
    if (info.isSymbolicLink() || !info.isDirectory()) return "unsafe";
    return (await readdir(directory)).length === 0 ? "empty" : "non-empty";
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT")
      return "missing";
    throw error;
  }
}
