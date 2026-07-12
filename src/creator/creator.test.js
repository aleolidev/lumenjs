import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rename,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { resolveEncounterContext } from "../modules/resolve-context.js";
import { createCreatorBackup, listCreatorBackups } from "./backup-store.js";
import { runCreatorCli } from "./cli.js";
import { exportCreatorProject } from "./export-project.js";
import { focusCreatorProject } from "./focus-project.js";
import { inspectCreatorProject } from "./inspect-project.js";
import {
  buildCreatorPlaytestModel,
  createFocusedPlaytestState,
  stepCreatorPlaytest
} from "./playtest-simulation.js";
import { renameCreatorProject } from "./rename-project.js";
import { inspectCreatorBackups, restoreCreatorProject } from "./restore-project.js";
import { scaffoldCreatorProject } from "./scaffold-project.js";
import { validateCreatorProject } from "./validate-project.js";
import { CreatorExportVerificationError, verifyCreatorExport } from "./verify-export.js";
import { withCreatorReadLock, withCreatorWriteLock } from "./write-lock.js";

const execute = promisify(execFile);
const repository = new URL("../../", import.meta.url);

test("clean-room scaffold is valid, original, and byte-deterministic", async () => {
  await withTemporaryDirectory(async (root) => {
    const left = path.join(root, "left");
    const right = path.join(root, "right");
    await scaffoldCreatorProject(left, { title: "Willowbound" });
    await scaffoldCreatorProject(right, { title: "Willowbound" });
    const generatedContents = await directoryContents(left);
    assert.deepEqual(generatedContents, await directoryContents(right));
    const exampleContents = await directoryContents(
      fileURLToPath(new URL("examples/willowbound/", repository))
    );
    assert.deepEqual(Object.keys(generatedContents), Object.keys(exampleContents));
    for (const relative of Object.keys(generatedContents)) {
      if (relative.endsWith(".json") || relative.endsWith(".tmj")) {
        assert.deepEqual(
          JSON.parse(generatedContents[relative]),
          JSON.parse(exampleContents[relative])
        );
      } else assert.equal(generatedContents[relative], exampleContents[relative]);
    }
    assert.equal(
      await readFile(path.join(left, ".gitignore"), "utf8"),
      "# Local Lumen creator recovery and temporary files.\n/.lumen/\n*.lumen-rename-*\n/.lumen-restore-files-*\n"
    );
    const validation = await validateCreatorProject(left);
    assert.equal(validation.valid, true, JSON.stringify(validation.diagnostics));
    const text = JSON.stringify(await directoryContents(left));
    for (const forbidden of ["first-light", "lantern-vale", "glintail", "sunberry", "Mira"]) {
      assert.equal(text.includes(forbidden), false, `scaffold contains '${forbidden}'`);
    }
    for (const title of ["Constructor", "Prototype"]) {
      const target = path.join(root, title.toLowerCase());
      const created = await scaffoldCreatorProject(target, { title });
      assert.equal(created.projectId, `journey-${title.toLowerCase()}`);
      assert.equal((await validateCreatorProject(target)).valid, true);
    }
    const trimmed = await scaffoldCreatorProject(path.join(root, "trimmed"), {
      title: "  Quiet Crossing  "
    });
    assert.equal(trimmed.projectId, "quiet-crossing");
    assert.equal((await validateCreatorProject(path.join(root, "trimmed"))).valid, true);
    const emoji = await scaffoldCreatorProject(path.join(root, "emoji"), {
      title: "Trail 👩‍🚀"
    });
    assert.equal(emoji.projectId, "trail");
    assert.equal((await validateCreatorProject(path.join(root, "emoji"))).valid, true);
  });
});

test("refuses a title without visible characters before touching the target", async () => {
  await withTemporaryDirectory(async (root) => {
    const target = path.join(root, "empty-title");
    for (const title of [
      "   ",
      "\u0000",
      "\u200b",
      "\n\t",
      "Visible\nInjected",
      "Visible\u2028Injected",
      "Visible\u061cInjected",
      "Visible\u200b"
    ]) {
      await assert.rejects(
        scaffoldCreatorProject(target, { title }),
        (error) =>
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "CREATOR_TITLE_INVALID"
      );
    }
    await assert.rejects(lstat(target), { code: "ENOENT" });
    assert.equal(
      (await readdir(root)).some((entry) => entry.includes(".lumen-create-")),
      false
    );
  });
});

test("refuses a non-empty scaffold target without changing it", async () => {
  await withTemporaryDirectory(async (root) => {
    const target = path.join(root, "occupied");
    await mkdir(target);
    await writeFile(path.join(target, "keep.txt"), "keep\n");
    const before = await directoryContents(target);
    await assert.rejects(scaffoldCreatorProject(target), /not empty/);
    assert.deepEqual(await directoryContents(target), before);
  });
});

test("failed scaffold commit restores an existing empty target", async () => {
  await withTemporaryDirectory(async (root) => {
    const target = path.join(root, "empty");
    await mkdir(target);
    await assert.rejects(
      scaffoldCreatorProject(target, { failBeforeCommitForTest: true }),
      /Injected scaffold commit failure/
    );
    const info = await lstat(target);
    assert.equal(info.isDirectory(), true);
    assert.deepEqual(await readdir(target), []);
    assert.equal(
      (await readdir(root)).some((entry) => entry.includes(".lumen-create-")),
      false
    );
  });
});

test("concurrent scaffolds use isolated staging and leave one valid project", async () => {
  await withTemporaryDirectory(async (root) => {
    const target = path.join(root, "project");
    const results = await Promise.allSettled([
      scaffoldCreatorProject(target, { title: "Willowbound" }),
      scaffoldCreatorProject(target, { title: "Willowbound" })
    ]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal((await validateCreatorProject(target)).valid, true);
    assert.equal(
      (await readdir(root)).some((entry) => entry.includes(".lumen-create-")),
      false
    );
  });
});

test("scaffold refuses a symlink target without changing its directory", async () => {
  await withTemporaryDirectory(async (root) => {
    const outside = path.join(root, "outside");
    const target = path.join(root, "project");
    await mkdir(outside);
    await symlink(outside, target);
    await assert.rejects(
      scaffoldCreatorProject(target),
      (error) =>
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "CREATOR_TARGET_UNSAFE"
    );
    assert.deepEqual(await readdir(outside), []);
  });
});

test("creator validation rejects a symlinked project root", async () => {
  await withTemporaryDirectory(async (root) => {
    const project = path.join(root, "project");
    const alias = path.join(root, "project-alias");
    await scaffoldCreatorProject(project, { title: "Willowbound" });
    await symlink(project, alias);
    const before = await directoryContents(project);
    const validation = await validateCreatorProject(alias);
    assert.equal(validation.valid, false);
    assert.equal(validation.diagnostics[0].code, "CREATOR_PROJECT_ROOT_UNSAFE");
    await assert.rejects(
      inspectCreatorBackups(alias),
      (error) =>
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "CREATOR_BACKUP_PATH_UNSAFE"
    );
    await assert.rejects(
      inspectCreatorBackups(path.join(root, "missing-project")),
      (error) =>
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "CREATOR_BACKUP_PROJECT_MISSING"
    );
    assert.deepEqual(await directoryContents(project), before);
  });
});

test("manifest discovery, inspection, and reference graph are deterministic", async () => {
  await withProject(async (project) => {
    const inspection = await inspectCreatorProject(project);
    assert.equal(inspection.valid, true);
    if (!inspection.summary) throw new Error("Expected a valid creator inspection");
    assert.deepEqual(inspection.summary.project, {
      id: "willowbound",
      title: "Willowbound",
      version: "0.1.0",
      startMap: "willow-crossing"
    });
    assert.equal(inspection.summary.maps.length, 2);
    assert.equal(inspection.summary.campaign.trainers, 1);
    assert.equal(inspection.summary.campaign.quests, 1);
    assert.deepEqual(inspection.summary.trainers[0], {
      id: "oren-trail-guide",
      party: ["bramblefin"],
      encounter: "workshop-prismole"
    });
    assert.equal(inspection.summary.quests[0].startsAt, "trail-ready");
    assert.deepEqual(inspection.summary.compatibility, {
      policy: "experimental-no-compatibility-promise",
      projectManifest: { source: "project.lumen.json", schemaVersion: 1 },
      maps: [
        {
          source: "maps/willow-crossing.tmj",
          format: "map",
          version: "1.10",
          tiledVersion: "1.12.2"
        },
        {
          source: "maps/starglass-workshop.tmj",
          format: "map",
          version: "1.10",
          tiledVersion: "1.12.2"
        }
      ],
      worlds: [
        { source: "worlds/willow-crossing.lumen.json", schemaVersion: 1 },
        { source: "worlds/starglass-workshop.lumen.json", schemaVersion: 1 }
      ],
      campaign: { source: "campaign/campaign.lumen.json", schemaVersion: 1 },
      locales: [
        { id: "en", source: "locales/en.json", schemaVersion: null },
        { id: "es", source: "locales/es.json", schemaVersion: null }
      ],
      contextContributions: [
        {
          id: "workshop-atmosphere",
          source: "modules/workshop-atmosphere.json",
          declarationVersion: 1,
          sourceFormat: "lumen-context-contribution-v1-experimental",
          optional: false,
          present: true
        },
        {
          id: "careful-traveler",
          source: "modules/careful-traveler.json",
          declarationVersion: 1,
          sourceFormat: "lumen-context-contribution-v1-experimental",
          optional: true,
          present: true
        }
      ]
    });
    assert.deepEqual(
      inspection.summary.graph.map((edge) => [edge.fromMap, edge.toMap]),
      [
        ["willow-crossing", "starglass-workshop"],
        ["starglass-workshop", "willow-crossing"]
      ]
    );
  });
});

test("coded diagnostics cover JSON, files, schemas, duplicates, Tiled types, and cross-map refs", async (context) => {
  /** @type {Array<[string, (project: string) => Promise<unknown>, string, string[]?]>} */
  const cases = [
    [
      "invalid JSON",
      async (project) => writeFile(path.join(project, "campaign/campaign.lumen.json"), "{"),
      "CREATOR_JSON_INVALID"
    ],
    [
      "null manifest",
      async (project) => writeFile(path.join(project, "project.lumen.json"), "null\n"),
      "CREATOR_SCHEMA_INVALID"
    ],
    [
      "null optional context",
      async (project) => writeFile(path.join(project, "modules/careful-traveler.json"), "null\n"),
      "CREATOR_SCHEMA_INVALID"
    ],
    [
      "missing file",
      async (project) => rm(path.join(project, "maps/starglass-workshop.tmj")),
      "CREATOR_FILE_MISSING"
    ],
    [
      "schema",
      async (project) =>
        mutateJson(project, "campaign/campaign.lumen.json", (value) => {
          value.creatures = [];
          delete value.schemaVersion;
          value["a/b~"] = true;
        }),
      "CREATOR_SCHEMA_INVALID",
      ["/schemaVersion", "/a~1b~0"]
    ],
    [
      "reserved inline message id",
      async (project) =>
        mutateJson(project, "campaign/campaign.lumen.json", (value) => {
          value.messages = { constructor: "Unsafe inherited key" };
        }),
      "CREATOR_SCHEMA_INVALID"
    ],
    [
      "duplicate creature move slot",
      async (project) =>
        mutateJson(project, "campaign/campaign.lumen.json", (value) => {
          value.creatures[0].moves.push(value.creatures[0].moves[0]);
        }),
      "CREATOR_SCHEMA_INVALID"
    ],
    [
      "reserved inventory id",
      async (project) =>
        mutateJson(project, "campaign/campaign.lumen.json", (value) => {
          value.inventory.constructor = 1;
        }),
      "CREATOR_SCHEMA_INVALID"
    ],
    [
      "invisible title schema",
      async (project) =>
        mutateJson(project, "project.lumen.json", (value) => {
          value.title = "\u200b";
        }),
      "CREATOR_SCHEMA_INVALID"
    ],
    [
      "mixed control title schema",
      async (project) =>
        mutateJson(project, "project.lumen.json", (value) => {
          value.title = "Visible\nInjected";
        }),
      "CREATOR_SCHEMA_INVALID"
    ],
    [
      "line separator title schema",
      async (project) =>
        mutateJson(project, "project.lumen.json", (value) => {
          value.title = "Visible\u2028Injected";
        }),
      "CREATOR_SCHEMA_INVALID"
    ],
    [
      "bidi control title schema",
      async (project) =>
        mutateJson(project, "project.lumen.json", (value) => {
          value.title = "Visible\u061cInjected";
        }),
      "CREATOR_SCHEMA_INVALID"
    ],
    [
      "invisible character name schema",
      async (project) =>
        mutateJson(project, "worlds/willow-crossing.lumen.json", (value) => {
          value.characters[0].name = " \u200b ";
        }),
      "CREATOR_SCHEMA_INVALID"
    ],
    [
      "invisible dialogue speaker schema",
      async (project) =>
        mutateJson(project, "campaign/campaign.lumen.json", (value) => {
          value.dialogue.nodes[0].speaker = "\t\u200b";
        }),
      "CREATOR_SCHEMA_INVALID"
    ],
    [
      "invisible localized message schema",
      async (project) =>
        mutateJson(project, "locales/es.json", (value) => {
          value[Object.keys(value)[0]] = " \n\u200b ";
        }),
      "CREATOR_SCHEMA_INVALID"
    ],
    [
      "malformed Tiled object schema",
      async (project) =>
        mutateJson(project, "maps/willow-crossing.tmj", (value) => {
          value.layers[1].objects[0] = null;
        }),
      "CREATOR_SCHEMA_INVALID"
    ],
    [
      "duplicate id",
      async (project) =>
        mutateJson(project, "campaign/campaign.lumen.json", (value) => {
          value.creatures[1].id = value.creatures[0].id;
        }),
      "CREATOR_ID_DUPLICATE"
    ],
    [
      "wrong Tiled type",
      async (project) =>
        mutateJson(project, "maps/willow-crossing.tmj", (value) => {
          value.layers[1].objects[0].type = "character";
        }),
      "CREATOR_TILED_OBJECT_TYPE"
    ],
    [
      "control-bearing Tiled type",
      async (project) =>
        mutateJson(project, "maps/willow-crossing.tmj", (value) => {
          value.layers[1].objects[0].type = "spawn\u001b";
        }),
      "CREATOR_TILED_OBJECT_TYPE"
    ],
    [
      "control-bearing duplicate Tiled name",
      async (project) =>
        mutateJson(project, "maps/willow-crossing.tmj", (value) => {
          const duplicate = structuredClone(value.layers[1].objects[0]);
          duplicate.id = 99;
          duplicate.name = "duplicate\u001b";
          value.layers[1].objects[1].name = duplicate.name;
          value.layers[1].objects.push(duplicate);
        }),
      "CREATOR_TILED_OBJECT_DUPLICATE"
    ],
    [
      "out-of-bounds Tiled object",
      async (project) =>
        mutateJson(project, "maps/willow-crossing.tmj", (value) => {
          value.layers[1].objects[0].x = value.width * value.tilewidth;
        }),
      "CREATOR_TILED_OBJECT_OUT_OF_BOUNDS"
    ],
    [
      "spawn inside collision",
      async (project) =>
        mutateJson(project, "maps/willow-crossing.tmj", (value) => {
          const objects = value.layers[1].objects;
          const spawn = objects.find((object) => object.name === "crossing-start");
          const collision = objects.find((object) => object.type === "collision");
          spawn.x = collision.x;
          spawn.y = collision.y;
        }),
      "CREATOR_SPAWN_COLLISION"
    ],
    [
      "transition inside collision",
      async (project) =>
        mutateJson(project, "maps/willow-crossing.tmj", (value) => {
          const objects = value.layers.flatMap((layer) => layer.objects ?? []);
          const transition = objects.find((object) => object.type === "transition");
          const collision = objects.find((object) => object.type === "collision");
          transition.x = collision.x;
          transition.y = collision.y;
        }),
      "CREATOR_TRANSITION_COLLISION"
    ],
    [
      "transition sharing character cell",
      async (project) =>
        mutateJson(project, "maps/willow-crossing.tmj", (value) => {
          const objects = value.layers.flatMap((layer) => layer.objects ?? []);
          const transition = objects.find((object) => object.type === "transition");
          const character = objects.find((object) => object.type === "character");
          transition.x = character.x;
          transition.y = character.y;
        }),
      "CREATOR_TRANSITION_OCCUPIED"
    ],
    [
      "ambiguous transition trigger cell",
      async (project) =>
        mutateJson(project, "worlds/willow-crossing.lumen.json", (value) => {
          value.transitions.push({ ...value.transitions[0], id: "second-workshop-entry" });
        }),
      "CREATOR_TRIGGER_CELL_AMBIGUOUS"
    ],
    [
      "ambiguous character trigger cell",
      async (project) =>
        mutateJson(project, "worlds/willow-crossing.lumen.json", (value) => {
          value.characters.push({ ...value.characters[0], id: "second-oren" });
        }),
      "CREATOR_TRIGGER_CELL_AMBIGUOUS"
    ],
    [
      "spawn sharing character cell",
      async (project) =>
        mutateJson(project, "maps/willow-crossing.tmj", (value) => {
          const objects = value.layers.flatMap((layer) => layer.objects ?? []);
          const spawn = objects.find((object) => object.type === "spawn");
          const character = objects.find((object) => object.type === "character");
          spawn.x = character.x;
          spawn.y = character.y;
        }),
      "CREATOR_SPAWN_OCCUPIED"
    ],
    [
      "broken cross-map ref",
      async (project) =>
        mutateJson(project, "worlds/willow-crossing.lumen.json", (value) => {
          value.transitions[0].targetSpawn = "absent-spawn";
        }),
      "CREATOR_TRANSITION_SPAWN_MISSING"
    ]
  ];
  for (const [name, mutate, code, expectedPointers = []] of cases) {
    await context.test(name, async () => {
      await withProject(async (project) => {
        await mutate(project);
        const result = await validateCreatorProject(project);
        assert.equal(result.valid, false);
        const diagnostic = result.diagnostics.find((item) => item.code === code);
        assert.ok(diagnostic, JSON.stringify(result.diagnostics));
        assert.ok(diagnostic.source);
        assert.ok(diagnostic.pointer);
        assert.ok(diagnostic.message);
        assert.ok(diagnostic.remedy);
        for (const pointer of expectedPointers) {
          assert.ok(
            result.diagnostics.some((item) => item.code === code && item.pointer === pointer),
            JSON.stringify(result.diagnostics)
          );
        }
        if (name.includes("control-bearing")) {
          assert.equal(diagnostic.message.includes("\u001b"), false);
          assert.equal(diagnostic.pointer.includes("\u001b"), false);
        }
      });
    });
  }
});

test("visible authoring text retains useful Unicode and line breaks", async () => {
  await withProject(async (project) => {
    await mutateJson(project, "worlds/willow-crossing.lumen.json", (value) => {
      value.characters[0].name = "Oren 🧭";
    });
    await mutateJson(project, "campaign/campaign.lumen.json", (value) => {
      value.dialogue.nodes[0].speaker = "Guía ✨";
      value.creatures[0].name = "Bramblefin 🌿";
    });
    await mutateJson(project, "locales/es.json", (value) => {
      value[Object.keys(value)[0]] = "Primera línea\nSegunda línea ✨";
    });
    const result = await validateCreatorProject(project);
    assert.equal(result.valid, true, JSON.stringify(result.diagnostics));
  });
});

test("rejects unsafe and symbolic-link sources", async (context) => {
  await context.test("unsafe traversal", async () => {
    await withProject(async (project) => {
      await mutateJson(project, "project.lumen.json", (value) => {
        value.sources.campaign = "../outside.json";
      });
      const result = await validateCreatorProject(project);
      assert.equal(result.valid, false);
      assert.ok(result.diagnostics.some((item) => item.code === "CREATOR_PATH_UNSAFE"));
    });
  });
  await context.test("reserved asset segment", async () => {
    await withProject(async (project) => {
      await mutateJson(project, "project.lumen.json", (value) => {
        value.sources.assets = ["assets/__proto__/icon.png", ".env"];
      });
      const result = await validateCreatorProject(project);
      assert.equal(result.valid, false);
      assert.equal(
        result.diagnostics.filter((item) => item.code === "CREATOR_PATH_UNSAFE").length,
        2
      );
    });
  });
  await context.test("control character", async () => {
    await withProject(async (project) => {
      await mutateJson(project, "project.lumen.json", (value) => {
        value.sources.campaign = "campaign/escape-\u001b.json";
      });
      const result = await validateCreatorProject(project);
      assert.equal(result.valid, false);
      assert.ok(result.diagnostics.some((item) => item.code === "CREATOR_PATH_UNSAFE"));
      const output = captureIo();
      assert.equal(await runCreatorCli(["validate", project], output.io), 1);
      assert.equal(output.stderr().includes("\u001b"), false);
    });
  });
  await context.test("cross-platform reserved paths", async () => {
    await withProject(async (project) => {
      await mutateJson(project, "project.lumen.json", (value) => {
        value.sources.campaign = "C:campaign.json";
        value.sources.assets = ["assets/aux.txt", "assets/a#b.png", "assets/a%b.png"];
      });
      const result = await validateCreatorProject(project);
      assert.equal(result.valid, false);
      assert.equal(
        result.diagnostics.filter((item) => item.code === "CREATOR_PATH_UNSAFE").length,
        4
      );
      const urlDiagnostics = result.diagnostics.filter(
        (item) => item.value === "assets/a#b.png" || item.value === "assets/a%b.png"
      );
      assert.equal(urlDiagnostics.length, 2);
      assert.ok(urlDiagnostics.every((item) => item.remedy.includes("# or %")));
    });
  });
  await context.test("portable case collision", async () => {
    await withProject(async (project) => {
      await mutateJson(project, "project.lumen.json", (value) => {
        value.sources.assets = ["locales/EN.json"];
      });
      const result = await validateCreatorProject(project);
      assert.equal(result.valid, false);
      assert.ok(result.diagnostics.some((item) => item.code === "CREATOR_PATH_COLLISION"));
    });
  });
  await context.test("portable Unicode normalization", async () => {
    await withProject(async (project) => {
      await mutateJson(project, "project.lumen.json", (value) => {
        value.sources.assets = ["assets/e\u0301.txt"];
      });
      const result = await validateCreatorProject(project);
      assert.equal(result.valid, false);
      assert.ok(result.diagnostics.some((item) => item.code === "CREATOR_PATH_UNSAFE"));
    });
  });
  await context.test("tool-reserved export and recovery paths", async () => {
    await withProject(async (project) => {
      await mutateJson(project, "project.lumen.json", (value) => {
        value.sources.assets = [
          "index.html",
          "SERVICE-WORKER.JS",
          "PROJECT.LUMEN.JSON",
          ".lumen/backups/0001/operation.json"
        ];
      });
      const result = await validateCreatorProject(project);
      assert.equal(result.valid, false);
      assert.equal(
        result.diagnostics.filter((item) => item.code === "CREATOR_PATH_RESERVED").length,
        3
      );
      assert.ok(result.diagnostics.some((item) => item.code === "CREATOR_PATH_UNSAFE"));
    });
  });
  await context.test("symlink", async () => {
    await withProject(async (project) => {
      const campaign = path.join(project, "campaign/campaign.lumen.json");
      const outside = path.join(path.dirname(project), "outside.json");
      await writeFile(outside, await readFile(campaign));
      await rm(campaign);
      await symlink(outside, campaign);
      const result = await validateCreatorProject(project);
      assert.equal(result.valid, false);
      assert.ok(result.diagnostics.some((item) => item.code === "CREATOR_PATH_SYMLINK"));
    });
  });
});

test("locale catalogs validate completeness, exclusivity, and default ownership", async (context) => {
  /** @type {Array<[string, (project: string) => Promise<unknown>, string]>} */
  const cases = [
    [
      "missing key",
      async (project) =>
        mutateJson(project, "locales/es.json", (value) => {
          delete value["ready-response"];
        }),
      "CREATOR_LOCALE_KEY_MISSING"
    ],
    [
      "extra key",
      async (project) =>
        mutateJson(project, "locales/es.json", (value) => {
          value["extra-message"] = "Extra";
        }),
      "CREATOR_LOCALE_KEY_EXTRA"
    ],
    [
      "character message reference",
      async (project) =>
        mutateJson(project, "worlds/willow-crossing.lumen.json", (value) => {
          value.characters[0].messageKey = "missing-message";
        }),
      "CREATOR_MESSAGE_MISSING"
    ],
    [
      "character dialogue reference",
      async (project) =>
        mutateJson(project, "worlds/willow-crossing.lumen.json", (value) => {
          value.characters[0].dialogue = "missing-dialogue";
        }),
      "CREATOR_DIALOGUE_NODE_MISSING"
    ],
    [
      "shared locale source",
      async (project) =>
        mutateJson(project, "project.lumen.json", (value) => {
          value.sources.locales.catalogs.es = value.sources.locales.catalogs.en;
        }),
      "CREATOR_LOCALE_SOURCE_DUPLICATE"
    ],
    [
      "mixed inline",
      async (project) =>
        mutateJson(project, "campaign/campaign.lumen.json", (value) => {
          value.messages = { "oren-welcome": "Mixed" };
        }),
      "CREATOR_LOCALIZATION_MIXED"
    ],
    [
      "missing default",
      async (project) =>
        mutateJson(project, "project.lumen.json", (value) => {
          value.sources.locales.default = "fr";
        }),
      "CREATOR_LOCALE_DEFAULT_MISSING"
    ]
  ];
  for (const [name, mutate, code] of cases) {
    await context.test(name, async () => {
      await withProject(async (project) => {
        await mutate(project);
        const result = await validateCreatorProject(project);
        assert.ok(
          result.diagnostics.some((item) => item.code === code),
          JSON.stringify(result.diagnostics)
        );
      });
    });
  }
  await context.test("inline character message reference", async () => {
    await withProject(async (project) => {
      const catalog = JSON.parse(await readFile(path.join(project, "locales/en.json"), "utf8"));
      await mutateJson(project, "project.lumen.json", (value) => {
        delete value.sources.locales;
      });
      await mutateJson(project, "campaign/campaign.lumen.json", (value) => {
        value.messages = catalog;
      });
      await mutateJson(project, "worlds/willow-crossing.lumen.json", (value) => {
        value.characters[0].messageKey = "missing-message";
      });
      const result = await validateCreatorProject(project);
      assert.ok(
        result.diagnostics.some((item) => item.code === "CREATOR_MESSAGE_MISSING"),
        JSON.stringify(result.diagnostics)
      );
    });
  });
});

test("trainer and quest authoring resolves every semantic reference", async (context) => {
  /** @typedef {{ trainers: Array<{ party: string[], encounter: string }>, quests: Array<{ titleKey: string, startsAt: string, completesAt: string }> }} CampaignAuthoringFixture */
  /** @type {Array<[string, (value: CampaignAuthoringFixture) => void, string]>} */
  const cases = [
    [
      "trainer party",
      (value) => {
        value.trainers[0].party[0] = "missing-creature";
      },
      "CREATOR_CREATURE_MISSING"
    ],
    [
      "trainer encounter",
      (value) => {
        value.trainers[0].encounter = "missing-encounter";
      },
      "CREATOR_ENCOUNTER_MISSING"
    ],
    [
      "quest message",
      (value) => {
        value.quests[0].titleKey = "missing-message";
      },
      "CREATOR_MESSAGE_MISSING"
    ],
    [
      "quest start",
      (value) => {
        value.quests[0].startsAt = "missing-dialogue";
      },
      "CREATOR_DIALOGUE_NODE_MISSING"
    ],
    [
      "quest completion",
      (value) => {
        value.quests[0].completesAt = "missing-encounter";
      },
      "CREATOR_ENCOUNTER_MISSING"
    ]
  ];
  for (const [name, mutate, code] of cases) {
    await context.test(name, async () => {
      await withProject(async (project) => {
        await mutateJson(project, "campaign/campaign.lumen.json", mutate);
        const result = await validateCreatorProject(project);
        assert.ok(result.diagnostics.some((item) => item.code === code));
      });
    });
  }
});

test("world encounter triggers validate references, Tiled type, and distinct cells", async (context) => {
  await context.test("missing campaign encounter", async () => {
    await withProject(async (project) => {
      await mutateJson(project, "worlds/starglass-workshop.lumen.json", (value) => {
        value.encounters[0].encounter = "missing-encounter";
      });
      const result = await validateCreatorProject(project);
      assert.ok(result.diagnostics.some((item) => item.code === "CREATOR_ENCOUNTER_MISSING"));
    });
  });
  await context.test("wrong Tiled encounter type", async () => {
    await withProject(async (project) => {
      await mutateJson(project, "maps/starglass-workshop.tmj", (value) => {
        value.layers[1].objects.find((item) => item.name === "workshop-prismole").type =
          "transition";
      });
      const result = await validateCreatorProject(project);
      assert.ok(result.diagnostics.some((item) => item.code === "CREATOR_TILED_OBJECT_TYPE"));
    });
  });
  await context.test("encounter sharing spawn cell", async () => {
    await withProject(async (project) => {
      await mutateJson(project, "maps/starglass-workshop.tmj", (value) => {
        const encounter = value.layers[1].objects.find((item) => item.name === "workshop-prismole");
        encounter.x = 64;
      });
      const result = await validateCreatorProject(project);
      assert.ok(result.diagnostics.some((item) => item.code === "CREATOR_GAMEPLAY_CELL_AMBIGUOUS"));
    });
  });
  await context.test("encounter outside map bounds", async () => {
    await withProject(async (project) => {
      await mutateJson(project, "maps/starglass-workshop.tmj", (value) => {
        value.layers[1].objects.find((item) => item.name === "workshop-prismole").x = 192;
      });
      const result = await validateCreatorProject(project);
      assert.ok(
        result.diagnostics.some((item) => item.code === "CREATOR_TILED_OBJECT_OUT_OF_BOUNDS")
      );
    });
  });
  await context.test("encounter inside collision", async () => {
    await withProject(async (project) => {
      await mutateJson(project, "maps/starglass-workshop.tmj", (value) => {
        value.layers[1].objects.push({
          id: 4,
          name: "encounter-wall",
          type: "collision",
          x: 96,
          y: 128,
          width: 32,
          height: 32
        });
      });
      const result = await validateCreatorProject(project);
      assert.ok(result.diagnostics.some((item) => item.code === "CREATOR_ENCOUNTER_COLLISION"));
    });
  });
});

test("dialogue authoring rejects ambiguous, disconnected, trapped, and conflicting graphs", async (context) => {
  /** @type {Array<[string, (value: any) => void, string]>} */
  const cases = [
    [
      "duplicate choice",
      (value) =>
        value.dialogue.nodes[0].choices.push(structuredClone(value.dialogue.nodes[0].choices[0])),
      "CREATOR_ID_DUPLICATE"
    ],
    [
      "disconnected node",
      (value) => {
        value.dialogue.start = value.dialogue.nodes[1].id;
      },
      "CREATOR_DIALOGUE_NODE_UNREACHABLE"
    ],
    [
      "trapped cycle",
      (value) => {
        for (const node of value.dialogue.nodes)
          for (const choice of node.choices) choice.next = value.dialogue.start;
      },
      "CREATOR_DIALOGUE_NO_EXIT"
    ],
    [
      "effect conflict",
      (value) => {
        const choice = value.dialogue.nodes
          .flatMap((node) => node.choices)
          .find((item) => item.effect === "close-dialogue");
        choice.creature = value.creatures[0].id;
      },
      "CREATOR_DIALOGUE_EFFECT_CONFLICT"
    ]
  ];
  for (const [name, mutate, code] of cases) {
    await context.test(name, async () => {
      await withProject(async (project) => {
        await mutateJson(project, "campaign/campaign.lumen.json", mutate);
        const result = await validateCreatorProject(project);
        assert.ok(result.diagnostics.some((item) => item.code === code));
      });
    });
  }
});

test("rename previews and applies every supported reference kind with immutable backup", async (context) => {
  /** @type {Array<[string, Record<string, string>, number]>} */
  const cases = [
    ["map", { kind: "map", from: "willow-crossing", to: "willow-glen" }, 4],
    [
      "spawn",
      { kind: "spawn", map: "starglass-workshop", from: "workshop-entry", to: "studio-entry" },
      3
    ],
    ["creature", { kind: "creature", from: "bramblefin", to: "bramblewing" }, 3],
    ["dialogue", { kind: "dialogue", from: "trail-ready", to: "trail-prepared" }, 4],
    [
      "dialogue-character",
      { kind: "dialogue", from: "crossing-welcome", to: "crossing-greeting" },
      3
    ],
    ["encounter", { kind: "encounter", from: "workshop-prismole", to: "studio-prismole" }, 4],
    ["message", { kind: "message", from: "ready-response", to: "trail-response" }, 4],
    ["message-character", { kind: "message", from: "oren-welcome", to: "oren-greeting" }, 4]
  ];
  for (const [name, operation, expectedChanges] of cases) {
    await context.test(name, async () => {
      await withProject(async (project) => {
        const before = await directoryContents(project);
        const preview = await renameCreatorProject(project, operation);
        assert.equal(preview.applied, false);
        assert.equal(preview.changes.length, expectedChanges);
        assert.deepEqual(await directoryContents(project), before);
        const applied = await renameCreatorProject(project, { ...operation, apply: true });
        assert.equal(applied.applied, true);
        assert.equal(applied.backupGeneration, 1);
        assert.equal((await validateCreatorProject(project)).valid, true);
        const backup = JSON.parse(
          await readFile(path.join(project, ".lumen/backups/0001/operation.json"), "utf8")
        );
        assert.deepEqual(backup.operation, applied.operation);
        assert.deepEqual(Object.keys(backup.hashes).sort(), applied.changedFiles);
      });
    });
  }
});

test("invalid rename is inert and a forced mid-commit failure restores bytes", async () => {
  await withProject(async (project) => {
    const before = await directoryContents(project);
    for (const [operation, code] of [
      [
        { kind: "spawn", from: "workshop-entry", to: "studio-entry" },
        "CREATOR_RENAME_MAP_REQUIRED"
      ],
      [
        { kind: "creature", from: "bramblefin", to: "bramblewing", map: "willow-crossing" },
        "CREATOR_RENAME_MAP_UNEXPECTED"
      ],
      [
        { kind: "spawn", from: "workshop-entry", to: "studio-entry", map: "constructor" },
        "CREATOR_RENAME_MAP_INVALID"
      ]
    ]) {
      await assert.rejects(
        renameCreatorProject(project, operation),
        (error) => error && typeof error === "object" && "code" in error && error.code === code
      );
    }
    await assert.rejects(
      renameCreatorProject(project, {
        kind: "map",
        from: "missing-map",
        to: "new-map",
        apply: true
      }),
      /definition.*exists/
    );
    await assert.rejects(
      renameCreatorProject(project, {
        kind: "creature",
        from: "bramblefin",
        to: "kitehare",
        apply: true
      }),
      /already exists/
    );
    assert.deepEqual(await directoryContents(project), before);
    await assert.rejects(
      renameCreatorProject(project, {
        kind: "map",
        from: "willow-crossing",
        to: "willow-glen",
        apply: true,
        failAfterFilesForTest: 1
      }),
      /Injected/
    );
    const after = await directoryContents(project);
    for (const [relative, value] of Object.entries(before))
      assert.equal(after[relative], value, relative);
    assert.equal((await validateCreatorProject(project)).valid, true);
  });
});

test("rename refuses a symlinked backup root without writing outside the project", async () => {
  await withProject(async (project, root) => {
    const outside = path.join(root, "outside-backups");
    await mkdir(outside);
    await mkdir(path.join(project, ".lumen"));
    await symlink(outside, path.join(project, ".lumen/backups"));
    await assert.rejects(
      renameCreatorProject(project, {
        kind: "encounter",
        from: "workshop-prismole",
        to: "studio-prismole",
        apply: true
      }),
      /must be a regular directory/
    );
    assert.deepEqual(await readdir(outside), []);
    assert.equal((await validateCreatorProject(project)).valid, true);
  });
});

test("backup listing and restore preview/apply preserve both pre-image and safety generation", async () => {
  await withProject(async (project) => {
    assert.deepEqual(await inspectCreatorBackups(project), []);
    await assert.rejects(
      restoreCreatorProject(project, Number.MAX_SAFE_INTEGER + 1),
      (error) =>
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "CREATOR_RESTORE_GENERATION_INVALID"
    );
    const original = await projectSourceContents(project);
    await renameCreatorProject(project, {
      kind: "encounter",
      from: "workshop-prismole",
      to: "studio-prismole",
      apply: true
    });
    const renamed = await projectSourceContents(project);
    assert.notDeepEqual(renamed, original);
    const listed = await inspectCreatorBackups(project);
    assert.equal(listed.length, 1);
    assert.equal(listed[0].generation, 1);
    assert.equal(listed[0].valid, true);

    const beforePreview = await directoryContents(project);
    const preview = await restoreCreatorProject(project, 1);
    assert.equal(preview.applied, false);
    assert.deepEqual(await directoryContents(project), beforePreview);

    const restored = await restoreCreatorProject(project, 1, { apply: true });
    assert.equal(restored.applied, true);
    assert.equal(restored.safetyGeneration, 2);
    assert.deepEqual(await projectSourceContents(project), original);
    assert.deepEqual(
      (await inspectCreatorBackups(project)).map((item) => item.generation),
      [2, 1]
    );
  });
});

test("concurrent creator backups reserve distinct complete generations", async () => {
  await withProject(async (project) => {
    const source = "locales/en.json";
    await mutateJson(project, source, (value) => {
      for (let index = 0; index < 5; index += 1)
        value[`before-${index}`] = `Concurrent message ${index}`;
    });
    const created = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        createCreatorBackup(
          project,
          {
            format: "lumen-creator-rename-v1-experimental",
            operation: {
              kind: "message",
              from: `before-${index}`,
              to: `after-${index}`,
              map: null
            },
            changedFiles: [source],
            changes: [
              {
                source,
                pointer: `/before-${index}`,
                before: `before-${index}`,
                after: `after-${index}`
              }
            ]
          },
          [source]
        )
      )
    );
    assert.deepEqual(
      created.map((item) => item.generation).sort((left, right) => left - right),
      [1, 2, 3, 4, 5]
    );
    const listed = await listCreatorBackups(project);
    assert.deepEqual(
      listed.map((item) => item.generation),
      [5, 4, 3, 2, 1]
    );
    assert.equal(
      listed.every((item) => item.valid),
      true
    );
  });
});

test("concurrent creator writes serialize before validation and commit", async () => {
  await withProject(async (project, root) => {
    const results = await Promise.allSettled([
      renameCreatorProject(project, {
        kind: "encounter",
        from: "workshop-prismole",
        to: "studio-prismole",
        apply: true
      }),
      renameCreatorProject(project, {
        kind: "encounter",
        from: "workshop-prismole",
        to: "gallery-prismole",
        apply: true
      })
    ]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    const rejected = results.find((result) => result.status === "rejected");
    assert.ok(rejected && rejected.status === "rejected");
    assert.equal(rejected.reason?.code, "CREATOR_WRITE_BUSY");
    assert.equal((await validateCreatorProject(project)).valid, true);
    assert.equal((await inspectCreatorBackups(project)).length, 1);
    assert.equal(
      (await readdir(root)).some((entry) => entry.endsWith(".lumen-write-lock")),
      false
    );
  });
});

test("creator locks share one reservation across filesystem aliases", async () => {
  await withProject(async (project, root) => {
    const alias = path.join(root, "project-alias");
    await symlink(project, alias);
    await withCreatorWriteLock(project, async () => {
      await assert.rejects(
        withCreatorWriteLock(alias, async () => {}),
        (error) =>
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "CREATOR_WRITE_BUSY"
      );
    });
  });
});

test("restore apply shares the creator write reservation", async () => {
  await withProject(async (project, root) => {
    await renameCreatorProject(project, {
      kind: "encounter",
      from: "workshop-prismole",
      to: "studio-prismole",
      apply: true
    });
    const before = await projectSourceContents(project);
    const lock = path.join(root, `.${path.basename(project)}.lumen-write-lock`);
    await mkdir(lock);
    try {
      await assert.rejects(
        restoreCreatorProject(project, 1, { apply: true }),
        (error) =>
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "CREATOR_WRITE_BUSY"
      );
    } finally {
      await rm(lock, { recursive: true, force: true });
    }
    assert.deepEqual(await projectSourceContents(project), before);
    assert.equal((await inspectCreatorBackups(project)).length, 1);
  });
});

test("an active export reader excludes creator writers without mutation", async () => {
  await withProject(async (project) => {
    const before = await projectSourceContents(project);
    const entered = Promise.withResolvers();
    const released = Promise.withResolvers();
    const reader = withCreatorReadLock(project, async () => {
      entered.resolve(undefined);
      await released.promise;
    });
    await entered.promise;
    await assert.rejects(
      renameCreatorProject(project, {
        kind: "encounter",
        from: "workshop-prismole",
        to: "studio-prismole",
        apply: true
      }),
      (error) =>
        error && typeof error === "object" && "code" in error && error.code === "CREATOR_WRITE_BUSY"
    );
    released.resolve(undefined);
    await reader;
    assert.deepEqual(await projectSourceContents(project), before);
    assert.deepEqual(await inspectCreatorBackups(project), []);
  });
});

test("noncanonical and unsafe backup generation names cannot poison numbering", async () => {
  await withProject(async (project) => {
    const backupRoot = path.join(project, ".lumen/backups");
    await mkdir(path.join(backupRoot, "00001"), { recursive: true });
    await mkdir(path.join(backupRoot, "9".repeat(40)), { recursive: true });
    const source = "modules/careful-traveler.json";
    await assert.rejects(
      createCreatorBackup(
        project,
        {
          format: "lumen-creator-rename-v1-experimental",
          operation: { kind: "message", from: "before", to: "after", map: null },
          changedFiles: [source],
          changes: [],
          note: "unexpected"
        },
        [source]
      ),
      (error) =>
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "CREATOR_BACKUP_RECORD_INVALID"
    );
    await assert.rejects(
      createCreatorBackup(
        project,
        {
          format: "lumen-creator-rename-v1-experimental",
          operation: { kind: "message", from: "before", to: "after", map: null },
          changedFiles: ["project.lumen.json"],
          changes: []
        },
        [source]
      ),
      (error) =>
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "CREATOR_BACKUP_RECORD_INVALID"
    );
    assert.deepEqual(await listCreatorBackups(project), []);
    const created = await createCreatorBackup(
      project,
      {
        format: "lumen-creator-rename-v1-experimental",
        operation: { kind: "message", from: "limited", to: "after", map: null },
        changedFiles: [source],
        changes: [
          {
            source,
            pointer: "/values/itemPolicy",
            before: "limited",
            after: "after"
          }
        ]
      },
      [source]
    );
    assert.equal(created.generation, 1);
    assert.deepEqual(
      (await listCreatorBackups(project)).map((item) => item.generation),
      [1]
    );
  });
});

test("forced restore failure rolls back byte-identical current sources", async () => {
  await withProject(async (project) => {
    await renameCreatorProject(project, {
      kind: "map",
      from: "willow-crossing",
      to: "willow-glen",
      apply: true
    });
    const renamed = await projectSourceContents(project);
    await assert.rejects(
      restoreCreatorProject(project, 1, { apply: true, failAfterFilesForTest: 1 }),
      /Injected restore commit failure/
    );
    assert.deepEqual(await projectSourceContents(project), renamed);
    assert.equal((await validateCreatorProject(project)).valid, true);
    assert.deepEqual(
      (await inspectCreatorBackups(project)).map((item) => item.generation),
      [2, 1]
    );
  });
});

test("restore-safety records can target only an earlier generation", async () => {
  await withProject(async (project) => {
    await renameCreatorProject(project, {
      kind: "encounter",
      from: "workshop-prismole",
      to: "studio-prismole",
      apply: true
    });
    await restoreCreatorProject(project, 1, { apply: true });
    await mutateJson(project, ".lumen/backups/0002/operation.json", (value) => {
      value.operation.targetGeneration = 2;
    });
    const backups = await inspectCreatorBackups(project);
    assert.equal(backups[0].generation, 2);
    assert.equal(backups[0].valid, false);
    await assert.rejects(restoreCreatorProject(project, 2, { apply: true }), /integrity checks/);
  });
});

test("restore refuses integrity-valid files outside the current declaration graph", async () => {
  await withProject(async (project) => {
    const relative = "notes.json";
    await writeFile(path.join(project, relative), '{"value":"before"}\n');
    await createCreatorBackup(
      project,
      {
        format: "lumen-creator-rename-v1-experimental",
        operation: { kind: "message", from: "before", to: "after", map: null },
        changedFiles: [relative],
        changes: [
          {
            source: relative,
            pointer: "/value",
            before: "before",
            after: "after"
          }
        ]
      },
      [relative]
    );
    await writeFile(path.join(project, relative), '{"value":"after"}\n');
    assert.equal((await inspectCreatorBackups(project))[0].valid, true);
    await assert.rejects(
      restoreCreatorProject(project, 1, { apply: true }),
      (error) =>
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "CREATOR_RESTORE_FILE_UNDECLARED"
    );
    assert.equal(await readFile(path.join(project, relative), "utf8"), '{"value":"after"}\n');
    assert.equal((await inspectCreatorBackups(project)).length, 1);
  });
});

test("restore refuses to recreate an absent optional source without a safety pre-image", async () => {
  await withProject(async (project) => {
    const relative = "modules/careful-traveler.json";
    await createCreatorBackup(
      project,
      {
        format: "lumen-creator-rename-v1-experimental",
        operation: { kind: "message", from: "limited", to: "after", map: null },
        changedFiles: [relative],
        changes: [
          {
            source: relative,
            pointer: "/values/itemPolicy",
            before: "limited",
            after: "after"
          }
        ]
      },
      [relative]
    );
    await rm(path.join(project, relative));
    assert.equal((await validateCreatorProject(project)).valid, true);
    await assert.rejects(
      restoreCreatorProject(project, 1, { apply: true }),
      (error) =>
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "CREATOR_RESTORE_CURRENT_FILE_UNAVAILABLE"
    );
    await assert.rejects(
      lstat(path.join(project, relative)),
      (error) => error && typeof error === "object" && "code" in error && error.code === "ENOENT"
    );
    assert.equal((await inspectCreatorBackups(project)).length, 1);
  });
});

test("corrupt backup records, paths, files, hashes, and symlinks cannot restore", async (context) => {
  /** @type {Array<[string, (project: string, root: string) => Promise<unknown>]>} */
  const cases = [
    [
      "operation JSON",
      async (project) => writeFile(path.join(project, ".lumen/backups/0001/operation.json"), "{")
    ],
    [
      "operation symlink",
      async (project, root) => {
        const operation = path.join(project, ".lumen/backups/0001/operation.json");
        const outside = path.join(root, "outside-operation.json");
        await copyFile(operation, outside);
        await rm(operation);
        await symlink(outside, operation);
      }
    ],
    [
      "files root symlink",
      async (project, root) => {
        const files = path.join(project, ".lumen/backups/0001/files");
        const outside = path.join(root, "outside-backup-files");
        await rename(files, outside);
        await symlink(outside, files);
      }
    ],
    [
      "unsupported operation record",
      async (project) =>
        mutateJson(project, ".lumen/backups/0001/operation.json", (value) => {
          value.format = "forged-backup-v1";
        })
    ],
    [
      "unexpected operation field",
      async (project) =>
        mutateJson(project, ".lumen/backups/0001/operation.json", (value) => {
          value.operation.note = "forged";
        })
    ],
    [
      "invalid operation semantics",
      async (project) =>
        mutateJson(project, ".lumen/backups/0001/operation.json", (value) => {
          value.operation.from = "../forged";
        })
    ],
    [
      "invalid change semantics",
      async (project) =>
        mutateJson(project, ".lumen/backups/0001/operation.json", (value) => {
          value.changes[0].after = "forged-destination";
        })
    ],
    [
      "unexpected change field",
      async (project) =>
        mutateJson(project, ".lumen/backups/0001/operation.json", (value) => {
          value.changes[0].note = "forged";
        })
    ],
    [
      "misdirected change pointer",
      async (project) =>
        mutateJson(project, ".lumen/backups/0001/operation.json", (value) => {
          value.changes[0].pointer = "/schemaVersion";
        })
    ],
    [
      "unexpected record field",
      async (project) =>
        mutateJson(project, ".lumen/backups/0001/operation.json", (value) => {
          value.note = "forged";
        })
    ],
    [
      "changed files mismatch",
      async (project) =>
        mutateJson(project, ".lumen/backups/0001/operation.json", (value) => {
          value.changedFiles = [];
        })
    ],
    [
      "unexpected generation file",
      async (project) => writeFile(path.join(project, ".lumen/backups/0001/note.txt"), "forged\n")
    ],
    [
      "unexpected backup file",
      async (project) =>
        writeFile(path.join(project, ".lumen/backups/0001/files/unexpected.json"), "{}\n")
    ],
    [
      "unexpected empty backup directory",
      async (project) => mkdir(path.join(project, ".lumen/backups/0001/files/empty"))
    ],
    [
      "unsafe path",
      async (project) =>
        mutateJson(project, ".lumen/backups/0001/operation.json", (value) => {
          value.hashes["../outside.json"] = "sha256-v1:bad";
        })
    ],
    [
      "control-character path",
      async (project) =>
        mutateJson(project, ".lumen/backups/0001/operation.json", (value) => {
          const relative = "escape-\u001b.json";
          value.hashes[relative] = `sha256-v1:${"0".repeat(64)}`;
          value.changedFiles.push(relative);
        })
    ],
    [
      "cross-platform reserved path",
      async (project) =>
        mutateJson(project, ".lumen/backups/0001/operation.json", (value) => {
          const relative = "aux.json";
          value.hashes[relative] = `sha256-v1:${"0".repeat(64)}`;
          value.changedFiles.push(relative);
        })
    ],
    [
      "portable case-colliding path",
      async (project) =>
        mutateJson(project, ".lumen/backups/0001/operation.json", (value) => {
          const relative = "CAMPAIGN/campaign.lumen.json";
          value.hashes[relative] = `sha256-v1:${"0".repeat(64)}`;
          value.changedFiles.push(relative);
        })
    ],
    [
      "missing file",
      async (project) =>
        rm(path.join(project, ".lumen/backups/0001/files/campaign/campaign.lumen.json"))
    ],
    [
      "hash mismatch",
      async (project) =>
        writeFile(
          path.join(project, ".lumen/backups/0001/files/campaign/campaign.lumen.json"),
          "{}\n"
        )
    ],
    [
      "symlink",
      async (project, root) => {
        const file = path.join(project, ".lumen/backups/0001/files/campaign/campaign.lumen.json");
        const outside = path.join(root, "outside-campaign.json");
        await writeFile(outside, "{}\n");
        await rm(file);
        await symlink(outside, file);
      }
    ]
  ];
  for (const [name, corrupt] of cases) {
    await context.test(name, async () => {
      await withProject(async (project, root) => {
        await renameCreatorProject(project, {
          kind: "encounter",
          from: "workshop-prismole",
          to: "studio-prismole",
          apply: true
        });
        await corrupt(project, root);
        const listed = await inspectCreatorBackups(project);
        assert.equal(listed[0].valid, false);
        if (["control-character path", "cross-platform reserved path"].includes(name))
          assert.ok(listed[0].issues.some((issue) => issue.includes("unsafe")));
        if (name === "portable case-colliding path")
          assert.ok(listed[0].issues.some((issue) => issue.includes("collide")));
        await assert.rejects(restoreCreatorProject(project, 1, { apply: true }), (error) => {
          assert.match(error instanceof Error ? error.message : String(error), /failed integrity/);
          if (name === "control-character path")
            assert.equal(
              (error instanceof Error ? error.message : String(error)).includes("\u001b"),
              false
            );
          return true;
        });
      });
    });
  }
});

test("focused playtest is deterministic, localized, collision-aware, and crosses both maps", async () => {
  await withProject(async (project) => {
    const before = await directoryContents(project);
    const focus = { map: "willow-crossing", spawn: "crossing-start", locale: "es" };
    const first = await focusCreatorProject(project, focus);
    const second = await focusCreatorProject(project, focus);
    assert.deepEqual(first, second);
    assert.equal(first.valid, true);
    if (!first.focus) throw new Error("Expected focused playtest state");
    assert.match(first.focus.query, /locale=es/);
    assert.deepEqual(await directoryContents(project), before);

    const validation = await validateCreatorProject(project);
    if (!validation.project) throw new Error("Expected validated creator project");
    const model = buildCreatorPlaytestModel(validation.project.manifest, validation.project.loaded);
    let state = createFocusedPlaytestState(model, focus);
    let result = stepCreatorPlaytest(model, state, "move-west");
    assert.equal(result.facts[0].type, "movement-blocked");
    state = result.state;
    for (const action of ["move-north", "move-east", "interact"]) {
      result = stepCreatorPlaytest(model, state, action);
      state = result.state;
    }
    assert.equal(result.facts[0].type, "character-spoke");
    assert.match(result.facts[0].message, /senderos de sauces/);
    for (const action of ["move-north", "move-east", "move-east", "move-east", "move-east"]) {
      result = stepCreatorPlaytest(model, state, action);
      state = result.state;
    }
    assert.equal(state.activeMapId, "starglass-workshop");
    assert.deepEqual(
      result.facts.map((fact) => fact.type),
      ["player-moved", "map-left", "map-entered"]
    );
    result = stepCreatorPlaytest(model, state, "move-south");
    assert.equal(result.state.activeMapId, "willow-crossing");
  });
});

test("unknown focused map, spawn, and locale fail before state", async () => {
  await withProject(async (project) => {
    /** @type {Array<[Record<string, string>, string]>} */
    const cases = [
      [{ map: "missing-map" }, "CREATOR_FOCUS_MAP_MISSING"],
      [{ map: "constructor" }, "CREATOR_FOCUS_MAP_MISSING"],
      [{ map: "willow-crossing", spawn: "missing-spawn" }, "CREATOR_FOCUS_SPAWN_MISSING"],
      [{ map: "willow-crossing", spawn: "constructor" }, "CREATOR_FOCUS_SPAWN_MISSING"],
      [{ locale: "fr" }, "CREATOR_FOCUS_LOCALE_MISSING"],
      [{ locale: "constructor" }, "CREATOR_FOCUS_LOCALE_MISSING"]
    ];
    for (const [focus, code] of cases) {
      const result = await focusCreatorProject(project, focus);
      assert.equal(result.valid, false);
      assert.equal(result.diagnostics[0].code, code);
      assert.equal(result.focus, null);
    }
  });
});

test("two encounter-context consumers resolve ownership and optional absence", async () => {
  await withProject(async (project, root) => {
    const validation = await validateCreatorProject(project);
    assert.equal(validation.valid, true);
    if (!validation.project) throw new Error("Expected validated context project");
    assert.deepEqual(
      validation.project.context.resolved.applied.map((item) => item.module),
      ["workshop-atmosphere", "careful-traveler"]
    );
    assert.equal(
      validation.project.context.resolved.ownership.terrain.module,
      "workshop-atmosphere"
    );
    assert.equal(
      validation.project.context.resolved.ownership.itemPolicy.module,
      "careful-traveler"
    );
    const focus = await focusCreatorProject(project);
    if (!focus.focus) throw new Error("Expected focused context");
    if (!focus.focus.context) throw new Error("Expected resolved focused context");
    assert.equal(focus.focus.context.hash, validation.project.context.resolved.hash);

    await rm(path.join(project, "modules/careful-traveler.json"));
    const optional = await validateCreatorProject(project);
    assert.equal(optional.valid, true, JSON.stringify(optional.diagnostics));
    if (!optional.project) throw new Error("Expected optional context project");
    assert.equal(optional.project.context.modules[1].present, false);
    assert.deepEqual(
      optional.project.context.resolved.applied.map((item) => item.module),
      ["workshop-atmosphere"]
    );
    const optionalInspection = await inspectCreatorProject(project);
    assert.equal(optionalInspection.summary?.compatibility.contextContributions[1].present, false);
    const exported = await exportCreatorProject(project, path.join(root, "optional-export"));
    assert.equal("modules/careful-traveler.json" in exported.manifest.files, false);
  });
});

test("encounter-context hash is canonical across nested object key order", () => {
  const contribution = (values) => [
    { module: "weather-module", source: "modules/weather.json", values }
  ];
  const left = resolveEncounterContext(
    contribution({ weather: { wind: { direction: "east", speed: 2 }, sky: "clear" } })
  );
  const right = resolveEncounterContext(
    contribution({ weather: { sky: "clear", wind: { speed: 2, direction: "east" } } })
  );
  assert.equal(left.hash, right.hash);
  assert.deepEqual(left.values, right.values);
  assert.equal(JSON.stringify(left.values), JSON.stringify(right.values));
});

test("encounter-context declarations reject conflicts, versions, IDs, values, and required absence", async (context) => {
  /** @type {Array<[string, (project: string) => Promise<unknown>, string]>} */
  const cases = [
    [
      "owner conflict",
      async (project) =>
        mutateJson(project, "modules/careful-traveler.json", (value) => {
          value.values.weather = "challenge-storm";
        }),
      "CREATOR_CONTEXT_OWNER_CONFLICT"
    ],
    [
      "unsupported version",
      async (project) =>
        mutateJson(project, "project.lumen.json", (value) => {
          value.sources.contextModules[0].version = 2;
        }),
      "CREATOR_CONTEXT_VERSION_UNSUPPORTED"
    ],
    [
      "duplicate id",
      async (project) =>
        mutateJson(project, "project.lumen.json", (value) => {
          value.sources.contextModules[1].id = value.sources.contextModules[0].id;
        }),
      "CREATOR_ID_DUPLICATE"
    ],
    [
      "empty values",
      async (project) =>
        mutateJson(project, "modules/workshop-atmosphere.json", (value) => {
          value.values = {};
        }),
      "CREATOR_SCHEMA_INVALID"
    ],
    [
      "invalid ownership key",
      async (project) =>
        mutateJson(project, "modules/workshop-atmosphere.json", (value) => {
          value.values[" "] = "ambiguous";
        }),
      "CREATOR_SCHEMA_INVALID"
    ],
    [
      "reserved ownership key",
      async (project) =>
        mutateJson(project, "modules/workshop-atmosphere.json", (value) => {
          value.values.constructor = "ambiguous";
        }),
      "CREATOR_SCHEMA_INVALID"
    ],
    [
      "required missing",
      async (project) => rm(path.join(project, "modules/workshop-atmosphere.json")),
      "CREATOR_FILE_MISSING"
    ]
  ];
  for (const [name, mutate, code] of cases) {
    await context.test(name, async () => {
      await withProject(async (project) => {
        await mutate(project);
        const result = await validateCreatorProject(project);
        assert.equal(result.valid, false);
        assert.ok(
          result.diagnostics.some((item) => item.code === code),
          JSON.stringify(result.diagnostics)
        );
      });
    });
  }
});

test("static export is reproducible, declared, and protects invalid or unowned destinations", async () => {
  await withProject(async (project, root) => {
    const authoredTitle = "</title><script>globalThis.lumenInjected=true</script><title>";
    await mutateJson(project, "project.lumen.json", (value) => {
      value.title = authoredTitle;
    });
    const output = path.join(root, "export");
    const first = await exportCreatorProject(project, output);
    const firstContents = await directoryContents(output);
    const second = await exportCreatorProject(project, output);
    assert.deepEqual(second.manifest, first.manifest);
    assert.deepEqual(await directoryContents(output), firstContents);
    assert.deepEqual(Object.keys(first.manifest.files).sort(), [
      "PROVENANCE.md",
      "campaign/campaign.lumen.json",
      "index.html",
      "locales/en.json",
      "locales/es.json",
      "lumen-core.js",
      "maps/starglass-workshop.tmj",
      "maps/willow-crossing.tmj",
      "modules/careful-traveler.json",
      "modules/workshop-atmosphere.json",
      "offline.js",
      "playtest-browser.js",
      "project.lumen.json",
      "resolve-context.js",
      "service-worker.js",
      "worlds/starglass-workshop.lumen.json",
      "worlds/willow-crossing.lumen.json"
    ]);
    const html = await readFile(path.join(output, "index.html"), "utf8");
    assert.equal(html.includes("<script>globalThis.lumenInjected=true</script>"), false);
    assert.match(
      html,
      /&lt;\/title&gt;&lt;script&gt;globalThis\.lumenInjected=true&lt;\/script&gt;&lt;title&gt;/
    );
    assert.equal(html.match(/<script type="module"/g)?.length, 2);
    const worker = await readFile(path.join(output, "service-worker.js"), "utf8");
    assert.match(worker, /const FORMAT = "lumen-static-export-v1-experimental"/);
    assert.match(worker, /const PREFIX = "lumen-export-willowbound-"/);
    assert.match(worker, /encodeURIComponent\(self\.registration\.scope\)/);
    assert.match(worker, /const CACHE = PREFIX \+ FORMAT \+ "-" \+ "0\.1\.0-[0-9a-f]{16}"/);
    const revision = worker.match(
      /const CACHE = PREFIX \+ FORMAT \+ "-" \+ "0\.1\.0-([0-9a-f]{16})"/
    )?.[1];
    assert.ok(revision);
    const baseHashes = { ...first.manifest.files };
    delete baseHashes["service-worker.js"];
    const sourceTemplate = worker.replace(revision, "__LUMEN_CACHE_REVISION__");
    const expectedRevision = createHash("sha256")
      .update(JSON.stringify(baseHashes))
      .update("\0")
      .update(sourceTemplate)
      .digest("hex")
      .slice(0, 16);
    assert.equal(revision, expectedRevision);
    assert.equal(worker.includes("__LUMEN_CACHE_REVISION__"), false);
    assert.match(worker, /\.\/lumen-export-manifest\.json/);
    assert.match(worker, /\.\/service-worker\.js/);
    assert.equal(worker.match(/"\.\/service-worker\.js"/g)?.length, 1);
    assert.match(worker, /key\.startsWith\(PREFIX\) && key !== CACHE/);
    assert.match(worker, /caches\.open\(CACHE\)[\s\S]*cache\.match/);
    assert.equal(worker.includes("caches.match(event.request"), false);
    assert.match(worker, /ignoreSearch: event\.request\.mode === "navigate"/);
    assert.match(worker, /url\.pathname === new URL\(self\.registration\.scope\)\.pathname/);
    assert.match(
      worker,
      /rootNavigation\) return cache\.match\(new URL\("\.\/index\.html", self\.registration\.scope\)\)/
    );
    assert.equal(worker.includes("skipWaiting"), false);
    await assert.rejects(
      exportCreatorProject(project, path.join(project, "dist")),
      /outside the source project/
    );
    const sourceAlias = path.join(root, "source-alias");
    await symlink(project, sourceAlias);
    await assert.rejects(
      exportCreatorProject(project, path.join(sourceAlias, "dist")),
      (error) =>
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "CREATOR_EXPORT_PATH_UNSAFE"
    );
    await assert.rejects(
      lstat(path.join(project, "dist")),
      (error) => error && typeof error === "object" && "code" in error && error.code === "ENOENT"
    );

    const beforeRollback = await directoryContents(output);
    await assert.rejects(
      exportCreatorProject(project, output, { failBeforeCommitForTest: true }),
      /Injected pre-commit export failure/
    );
    assert.deepEqual(await directoryContents(output), beforeRollback);
    assert.equal((await verifyCreatorExport(output)).valid, true);
    assert.equal(
      (await readdir(root)).some(
        (entry) =>
          entry.startsWith("export.lumen-export-") || entry.startsWith("export.lumen-backup-")
      ),
      false
    );

    await writeFile(path.join(project, "campaign/campaign.lumen.json"), "{");
    const beforeInvalid = await directoryContents(output);
    await assert.rejects(exportCreatorProject(project, output), /validation failed/i);
    assert.deepEqual(await directoryContents(output), beforeInvalid);
  });
});

test("export replacement refuses corrupt and symlinked destinations without mutation", async () => {
  await withProject(async (project, root) => {
    const unowned = path.join(root, "unowned");
    await mkdir(unowned);
    await writeFile(path.join(unowned, "keep.txt"), "keep\n");
    await assert.rejects(exportCreatorProject(project, unowned), /not owned by LumenJS/);
    assert.deepEqual(await directoryContents(unowned), { "keep.txt": "keep\n" });

    const forged = path.join(root, "forged");
    await mkdir(forged);
    await writeFile(path.join(forged, "keep.txt"), "keep\n");
    await writeFile(
      path.join(forged, "lumen-export-manifest.json"),
      '{"format":"lumen-static-export-v1-experimental"}\n'
    );
    const forgedBefore = await directoryContents(forged);
    await assert.rejects(exportCreatorProject(project, forged), /not owned by LumenJS/);
    assert.deepEqual(await directoryContents(forged), forgedBefore);

    const corrupt = path.join(root, "corrupt-export");
    await exportCreatorProject(project, corrupt);
    await writeFile(path.join(corrupt, "index.html"), "changed\n");
    const corruptBefore = await directoryContents(corrupt);
    await assert.rejects(exportCreatorProject(project, corrupt), /not owned by LumenJS/);
    assert.deepEqual(await directoryContents(corrupt), corruptBefore);

    const validTarget = path.join(root, "valid-target");
    await exportCreatorProject(project, validTarget);
    const linked = path.join(root, "linked-export");
    await symlink(validTarget, linked);
    const targetBefore = await directoryContents(validTarget);
    await assert.rejects(exportCreatorProject(project, linked), /not owned by LumenJS/);
    assert.deepEqual(await directoryContents(validTarget), targetBefore);
  });
});

test("export replacement preserves a valid destination owned by another project", async () => {
  await withProject(async (project, root) => {
    const otherProject = path.join(root, "other-project");
    await scaffoldCreatorProject(otherProject, { title: "Other Journey" });
    const output = path.join(root, "other-export");
    await exportCreatorProject(otherProject, output);
    const before = await directoryContents(output);
    await assert.rejects(
      exportCreatorProject(project, output),
      (error) =>
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "CREATOR_EXPORT_DESTINATION_PROJECT_MISMATCH"
    );
    assert.deepEqual(await directoryContents(output), before);
    assert.equal((await verifyCreatorExport(output)).projectId, "other-journey");
  });
});

test("post-commit export backup cleanup failure preserves the new valid export", async () => {
  await withProject(async (project, root) => {
    const output = path.join(root, "export");
    await exportCreatorProject(project, output);
    const result = await exportCreatorProject(project, output, {
      failBackupCleanupForTest: true
    });
    assert.equal(result.backupCleanup, "deferred");
    assert.equal(result.backupCleanupError, "Injected export backup cleanup failure");
    assert.equal((await verifyCreatorExport(output)).valid, true);
    const backups = (await readdir(root)).filter((entry) =>
      entry.startsWith("export.lumen-backup-")
    );
    assert.equal(backups.length, 1);
    assert.equal((await verifyCreatorExport(path.join(root, backups[0]))).valid, true);
  });
});

test("export refuses a project source with a creator mutation in progress", async () => {
  await withProject(async (project, root) => {
    const output = path.join(root, "blocked-export");
    const lock = path.join(root, `.${path.basename(project)}.lumen-write-lock`);
    await mkdir(lock);
    try {
      await assert.rejects(
        exportCreatorProject(project, output),
        (error) =>
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "CREATOR_WRITE_BUSY"
      );
    } finally {
      await rm(lock, { recursive: true, force: true });
    }
    await assert.rejects(
      lstat(output),
      (error) => error && typeof error === "object" && "code" in error && error.code === "ENOENT"
    );
  });
});

test("concurrent exports never share staging and leave one valid complete destination", async () => {
  await withProject(async (project, root) => {
    const output = path.join(root, "concurrent-export");
    const results = await Promise.allSettled(
      Array.from({ length: 4 }, () => exportCreatorProject(project, output))
    );
    assert.ok(results.some((result) => result.status === "fulfilled"));
    const verified = await verifyCreatorExport(output);
    assert.equal(verified.valid, true);
    assert.equal(verified.projectId, "willowbound");
    assert.deepEqual(
      (await readdir(root)).filter((entry) => entry.includes(".lumen-export-")),
      []
    );
    assert.deepEqual(
      (await readdir(root)).filter((entry) => entry.includes(".lumen-backup-")),
      []
    );
    assert.deepEqual(
      (await readdir(root)).filter((entry) => entry.endsWith(".lumen-export-lock")),
      []
    );
    assert.equal(
      (await readdir(root)).some(
        (entry) => entry.includes(".lumen-read-lock-") || entry.endsWith(".lumen-lock-gate")
      ),
      false
    );
  });
});

test("concurrent exports share a source read reservation across distinct outputs", async () => {
  await withProject(async (project, root) => {
    const outputs = [path.join(root, "first-export"), path.join(root, "second-export")];
    const results = await Promise.all(
      outputs.map((output) => exportCreatorProject(project, output))
    );
    assert.equal(results.length, 2);
    for (const output of outputs) assert.equal((await verifyCreatorExport(output)).valid, true);
    assert.equal(
      (await readdir(root)).some(
        (entry) => entry.includes(".lumen-read-lock-") || entry.endsWith(".lumen-lock-gate")
      ),
      false
    );
  });
});

test("destination reservation prevents concurrent cross-project replacement", async () => {
  await withProject(async (project, root) => {
    const otherProject = path.join(root, "other-project");
    await scaffoldCreatorProject(otherProject, { title: "Other Journey" });
    const output = path.join(root, "shared-export");
    const results = await Promise.allSettled([
      exportCreatorProject(project, output),
      exportCreatorProject(otherProject, output)
    ]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    const rejected = results.find((result) => result.status === "rejected");
    assert.ok(rejected && rejected.status === "rejected");
    assert.ok(
      ["CREATOR_EXPORT_DESTINATION_BUSY", "CREATOR_EXPORT_DESTINATION_PROJECT_MISMATCH"].includes(
        rejected.reason?.code
      )
    );
    assert.ok(
      ["willowbound", "other-journey"].includes((await verifyCreatorExport(output)).projectId)
    );
    assert.equal(
      (await readdir(root)).some((entry) => entry.endsWith(".lumen-export-lock")),
      false
    );
  });
});

test("export destination reservations share identity across parent aliases", async () => {
  await withProject(async (project, root) => {
    const deployments = path.join(root, "deployments");
    const alias = path.join(root, "deployment-alias");
    await mkdir(deployments);
    await symlink(deployments, alias);
    const output = path.join(deployments, "site");
    const lock = `${output}.lumen-export-lock`;
    await mkdir(lock);
    try {
      await assert.rejects(
        exportCreatorProject(project, path.join(alias, "site")),
        (error) =>
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "CREATOR_EXPORT_DESTINATION_BUSY"
      );
    } finally {
      await rm(lock, { recursive: true, force: true });
    }
    await assert.rejects(
      lstat(output),
      (error) => error && typeof error === "object" && "code" in error && error.code === "ENOENT"
    );
  });
});

test("offline cache revision changes with exported project content", async () => {
  await withProject(async (project, root) => {
    const firstOutput = path.join(root, "first-export");
    const secondOutput = path.join(root, "second-export");
    await exportCreatorProject(project, firstOutput);
    await mutateJson(project, "project.lumen.json", (value) => {
      value.version = "0.1.1";
    });
    await exportCreatorProject(project, secondOutput);
    const firstWorker = await readFile(path.join(firstOutput, "service-worker.js"), "utf8");
    const secondWorker = await readFile(path.join(secondOutput, "service-worker.js"), "utf8");
    assert.notEqual(
      firstWorker.match(/const CACHE = PREFIX \+ FORMAT \+ "-" \+ "([^"]+)"/)?.[1],
      undefined
    );
    assert.notEqual(
      firstWorker.match(/const CACHE = PREFIX \+ FORMAT \+ "-" \+ "([^"]+)"/)?.[1],
      secondWorker.match(/const CACHE = PREFIX \+ FORMAT \+ "-" \+ "([^"]+)"/)?.[1]
    );
  });
});

test("received export verification is inert and rejects inventory, path, hash, and symlink failures", async (context) => {
  await withProject(async (project, root) => {
    const output = path.join(root, "export");
    await exportCreatorProject(project, output);
    const before = await directoryContents(output);
    const verified = await verifyCreatorExport(output);
    assert.equal(verified.valid, true);
    assert.equal(verified.projectId, "willowbound");
    assert.deepEqual(Object.keys(verified.files), Object.keys(verified.files).sort());
    assert.deepEqual(await directoryContents(output), before);
  });

  await context.test("unsafe manifest paths are identified safely", async () => {
    for (const relative of ["assets/a#b.png", "assets/a%b.png", "assets/a\u202Eb.png"]) {
      await withProject(async (project, root) => {
        const output = path.join(root, "export");
        await exportCreatorProject(project, output);
        await mutateJson(output, "lumen-export-manifest.json", (value) => {
          value.files[relative] = `sha256-v1:${"0".repeat(64)}`;
        });
        await assert.rejects(verifyCreatorExport(output), (error) => {
          if (!(error instanceof CreatorExportVerificationError)) return false;
          assert.equal(error.code, "CREATOR_EXPORT_VERIFY_PATH_UNSAFE");
          assert.ok(
            error.message.includes(
              relative.includes("\u202E") ? "\\u{202e}" : JSON.stringify(relative)
            )
          );
          assert.equal(error.message.includes("\u202E"), false);
          return true;
        });
      });
    }
  });

  /** @type {Array<{name: string, mutate: (output: string, root: string) => Promise<unknown>, code: string}>} */
  const cases = [
    {
      name: "invalid manifest JSON",
      mutate: async (output) => writeFile(path.join(output, "lumen-export-manifest.json"), "{"),
      code: "CREATOR_EXPORT_VERIFY_MANIFEST_JSON"
    },
    {
      name: "unsupported format",
      mutate: async (output) =>
        mutateJson(output, "lumen-export-manifest.json", (value) => {
          value.format = "unknown";
        }),
      code: "CREATOR_EXPORT_VERIFY_FORMAT"
    },
    {
      name: "unsafe path",
      mutate: async (output) =>
        mutateJson(output, "lumen-export-manifest.json", (value) => {
          value.files["../outside.txt"] = `sha256-v1:${"0".repeat(64)}`;
        }),
      code: "CREATOR_EXPORT_VERIFY_PATH_UNSAFE"
    },
    {
      name: "reserved path segment",
      mutate: async (output) =>
        mutateJson(output, "lumen-export-manifest.json", (value) => {
          value.files["__proto__/outside.txt"] = `sha256-v1:${"0".repeat(64)}`;
        }),
      code: "CREATOR_EXPORT_VERIFY_PATH_UNSAFE"
    },
    {
      name: "recovery path segment",
      mutate: async (output) =>
        mutateJson(output, "lumen-export-manifest.json", (value) => {
          value.files[".LUMEN/backups/0001/operation.json"] = `sha256-v1:${"0".repeat(64)}`;
        }),
      code: "CREATOR_EXPORT_VERIFY_PATH_UNSAFE"
    },
    {
      name: "directory-shaped manifest path",
      mutate: async (output) =>
        mutateJson(output, "lumen-export-manifest.json", (value) => {
          value.files["invented/"] = `sha256-v1:${"0".repeat(64)}`;
        }),
      code: "CREATOR_EXPORT_VERIFY_PATH_UNSAFE"
    },
    {
      name: "control-character manifest path",
      mutate: async (output) =>
        mutateJson(output, "lumen-export-manifest.json", (value) => {
          value.files["escape-\u001b.txt"] = `sha256-v1:${"0".repeat(64)}`;
        }),
      code: "CREATOR_EXPORT_VERIFY_PATH_UNSAFE"
    },
    {
      name: "cross-platform reserved manifest path",
      mutate: async (output) =>
        mutateJson(output, "lumen-export-manifest.json", (value) => {
          value.files["aux.txt"] = `sha256-v1:${"0".repeat(64)}`;
        }),
      code: "CREATOR_EXPORT_VERIFY_PATH_UNSAFE"
    },
    {
      name: "portable case-colliding manifest path",
      mutate: async (output) =>
        mutateJson(output, "lumen-export-manifest.json", (value) => {
          value.files["INDEX.html"] = value.files["index.html"];
        }),
      code: "CREATOR_EXPORT_VERIFY_PATH_COLLISION"
    },
    {
      name: "portable marker-colliding manifest path",
      mutate: async (output) =>
        mutateJson(output, "lumen-export-manifest.json", (value) => {
          value.files["LUMEN-EXPORT-MANIFEST.JSON"] = `sha256-v1:${"0".repeat(64)}`;
        }),
      code: "CREATOR_EXPORT_VERIFY_PATH_COLLISION"
    },
    {
      name: "unexpected manifest property",
      mutate: async (output) =>
        mutateJson(output, "lumen-export-manifest.json", (value) => {
          value.signature = "not-supported";
        }),
      code: "CREATOR_EXPORT_VERIFY_MANIFEST_SHAPE"
    },
    {
      name: "invalid hash",
      mutate: async (output) =>
        mutateJson(output, "lumen-export-manifest.json", (value) => {
          value.files["index.html"] = "sha256-v1:no";
        }),
      code: "CREATOR_EXPORT_VERIFY_HASH_INVALID"
    },
    {
      name: "missing file",
      mutate: async (output) => rm(path.join(output, "index.html")),
      code: "CREATOR_EXPORT_VERIFY_FILE_MISSING"
    },
    {
      name: "unexpected file",
      mutate: async (output) => writeFile(path.join(output, "unexpected.txt"), "unexpected\n"),
      code: "CREATOR_EXPORT_VERIFY_FILE_UNEXPECTED"
    },
    {
      name: "control-character filesystem path",
      mutate: async (output) => writeFile(path.join(output, "escape-\u001b.txt"), "unexpected\n"),
      code: "CREATOR_EXPORT_VERIFY_PATH_UNSAFE"
    },
    {
      name: "unexpected empty directory",
      mutate: async (output) => mkdir(path.join(output, "unexpected")),
      code: "CREATOR_EXPORT_VERIFY_DIRECTORY_UNEXPECTED"
    },
    {
      name: "changed bytes",
      mutate: async (output) => writeFile(path.join(output, "index.html"), "changed\n"),
      code: "CREATOR_EXPORT_VERIFY_HASH_MISMATCH"
    },
    {
      name: "symlink",
      mutate: async (output, root) => {
        await rm(path.join(output, "index.html"));
        await symlink(path.join(root, "outside.txt"), path.join(output, "index.html"));
      },
      code: "CREATOR_EXPORT_VERIFY_SYMLINK"
    }
  ];
  for (const { name, mutate, code } of cases) {
    await context.test(name, async () => {
      await withProject(async (project, root) => {
        const output = path.join(root, "export");
        await exportCreatorProject(project, output);
        await mutate(output, root);
        await assert.rejects(verifyCreatorExport(output), (error) => {
          if (!(error && typeof error === "object" && "code" in error && error.code === code))
            return false;
          if (name.includes("control-character") && error instanceof Error)
            assert.equal(error.message.includes("\u001b"), false);
          if (name === "portable case-colliding manifest path" && error instanceof Error)
            assert.ok(error.message.includes('"INDEX.html"'));
          if (name === "portable marker-colliding manifest path" && error instanceof Error)
            assert.ok(error.message.includes('"LUMEN-EXPORT-MANIFEST.JSON"'));
          return true;
        });
      });
    });
  }
});

test("CLI provides stable JSON and meaningful exit codes", async () => {
  await withTemporaryDirectory(async (root) => {
    const project = path.join(root, "project");
    const created = captureIo();
    assert.equal(
      await runCreatorCli(["create", project, "--name", "Willowbound", "--json"], created.io),
      0
    );
    assert.equal(JSON.parse(created.stdout()).projectId, "willowbound");

    const escapedPath = captureIo();
    assert.equal(
      await runCreatorCli(
        ["create", path.join(root, "escaped-\u001b-target"), "--name", "Safe Path"],
        escapedPath.io
      ),
      0
    );
    assert.equal(escapedPath.stdout().includes("\u001b"), false);
    assert.match(escapedPath.stdout(), /escaped-\\u\{001b\}-target/);

    const valid = captureIo();
    assert.equal(await runCreatorCli(["validate", project, "--json"], valid.io), 0);
    assert.deepEqual(JSON.parse(valid.stdout()), { valid: true, diagnostics: [] });

    const focused = captureIo();
    assert.equal(
      await runCreatorCli(
        [
          "focus",
          project,
          "--map",
          "willow-crossing",
          "--spawn",
          "crossing-start",
          "--locale",
          "es",
          "--json"
        ],
        focused.io
      ),
      0
    );
    assert.match(JSON.parse(focused.stdout()).stateHash, /^fnv1a32-v1:/);
    const invalidFocus = captureIo();
    assert.equal(
      await runCreatorCli(["focus", project, "--map", "missing-map", "--json"], invalidFocus.io),
      1
    );
    assert.equal(
      JSON.parse(invalidFocus.stdout()).diagnostics[0].code,
      "CREATOR_FOCUS_MAP_MISSING"
    );

    const preview = captureIo();
    assert.equal(
      await runCreatorCli(
        [
          "rename",
          project,
          "--kind",
          "encounter",
          "--from",
          "workshop-prismole",
          "--to",
          "studio-prismole",
          "--json"
        ],
        preview.io
      ),
      0
    );
    assert.equal(JSON.parse(preview.stdout()).applied, false);
    const applied = captureIo();
    assert.equal(
      await runCreatorCli(
        [
          "rename",
          project,
          "--kind",
          "encounter",
          "--from",
          "workshop-prismole",
          "--to",
          "studio-prismole",
          "--apply",
          "--json"
        ],
        applied.io
      ),
      0
    );
    assert.equal(JSON.parse(applied.stdout()).backupGeneration, 1);

    const backups = captureIo();
    assert.equal(await runCreatorCli(["backups", project, "--json"], backups.io), 0);
    assert.deepEqual(
      JSON.parse(backups.stdout()).map((item) => item.generation),
      [1]
    );
    const missingRestore = captureIo();
    assert.equal(
      await runCreatorCli(["restore", project, "--generation", "999", "--json"], missingRestore.io),
      1
    );
    assert.equal(
      JSON.parse(missingRestore.stdout()).error.code,
      "CREATOR_RESTORE_GENERATION_MISSING"
    );
    const restorePreview = captureIo();
    assert.equal(
      await runCreatorCli(["restore", project, "--generation", "1", "--json"], restorePreview.io),
      0
    );
    assert.equal(JSON.parse(restorePreview.stdout()).applied, false);
    const restoreApplied = captureIo();
    assert.equal(
      await runCreatorCli(
        ["restore", project, "--generation", "1", "--apply", "--json"],
        restoreApplied.io
      ),
      0
    );
    assert.equal(JSON.parse(restoreApplied.stdout()).safetyGeneration, 2);

    const exportedDirectory = path.join(root, "exported");
    const exported = captureIo();
    assert.equal(
      await runCreatorCli(["export", project, "--out", exportedDirectory, "--json"], exported.io),
      0
    );
    const verifiedJson = captureIo();
    assert.equal(
      await runCreatorCli(["verify-export", exportedDirectory, "--json"], verifiedJson.io),
      0
    );
    assert.equal(JSON.parse(verifiedJson.stdout()).valid, true);
    const verifiedHuman = captureIo();
    assert.equal(await runCreatorCli(["verify-export", exportedDirectory], verifiedHuman.io), 0);
    assert.match(verifiedHuman.stdout(), /^Verified export: willowbound 0\.1\.0 · \d+ files\n$/);

    await mutateJson(project, ".lumen/backups/0001/operation.json", (value) => {
      value.hashes["campaign/campaign.lumen.json"] = `sha256-v1:${"0".repeat(64)}`;
    });
    const corruptBackups = captureIo();
    assert.equal(await runCreatorCli(["backups", project, "--json"], corruptBackups.io), 1);
    assert.equal(JSON.parse(corruptBackups.stdout())[1].valid, false);
    const corruptRestore = captureIo();
    assert.equal(
      await runCreatorCli(["restore", project, "--generation", "1", "--json"], corruptRestore.io),
      1
    );
    assert.equal(
      JSON.parse(corruptRestore.stdout()).error.code,
      "CREATOR_RESTORE_GENERATION_CORRUPT"
    );

    await writeFile(path.join(project, "campaign/campaign.lumen.json"), "{");
    const invalid = captureIo();
    assert.equal(await runCreatorCli(["validate", project, "--json"], invalid.io), 1);
    assert.equal(JSON.parse(invalid.stdout()).valid, false);
    assert.equal(invalid.stderr(), "");

    const usage = captureIo();
    assert.equal(await runCreatorCli(["unknown", project], usage.io), 2);
    assert.equal(usage.stderr(), "Unknown command 'unknown'.\n");
    assert.equal(usage.stdout(), "");

    for (const args of [["validate"], ["validate", "--json"]]) {
      const missingDirectory = captureIo();
      assert.equal(await runCreatorCli(args, missingDirectory.io), 2);
      assert.equal(missingDirectory.stderr(), "Missing project directory.\n");
      assert.equal(missingDirectory.stdout(), "");
    }

    const escapedCommand = captureIo();
    assert.equal(await runCreatorCli(["unknown\u001b", project], escapedCommand.io), 2);
    assert.equal(escapedCommand.stderr().includes("\u001b"), false);
    assert.match(escapedCommand.stderr(), /unknown\\u\{001b\}/);

    const escapedOption = captureIo();
    assert.equal(await runCreatorCli(["validate", project, "--bad\u001b"], escapedOption.io), 2);
    assert.equal(escapedOption.stderr().includes("\u001b"), false);
    assert.match(escapedOption.stderr(), /--bad\\u\{001b\}/);

    const multilineOption = captureIo();
    assert.equal(
      await runCreatorCli(["validate", project, "--bad\ninjected"], multilineOption.io),
      2
    );
    assert.equal(multilineOption.stderr().split("\n").length, 2);
    assert.match(multilineOption.stderr(), /--bad\\u\{000a\}injected/);

    for (const [args, message] of [
      [["validate", project, "--jsno"], "Unknown option '--jsno' for 'validate'.\n"],
      [["export", project, "--out", "--json"], "Missing value for '--out'.\n"],
      [
        ["create", project, "--name", "One", "--name", "Two"],
        "Duplicate option '--name' for 'create'.\n"
      ],
      [
        ["restore", project, "--generation", "1e0"],
        "Restore generation must be a canonical positive safe integer.\n"
      ],
      [["focus", project, "--json"], "Focus requires --map <id>.\n"]
    ]) {
      const invalidOptions = captureIo();
      assert.equal(await runCreatorCli(args, invalidOptions.io), 2);
      assert.equal(invalidOptions.stderr(), message);
      assert.equal(invalidOptions.stdout(), "");
    }
  });
});

test("process wrapper reports stdout and exit behavior", async () => {
  const help = await execute(process.execPath, ["bin/lumen.js", "--help"], { cwd: repository });
  assert.match(help.stdout, /lumen create/);
  await assert.rejects(
    execute(process.execPath, ["bin/lumen.js", "validate", "missing-project", "--json"], {
      cwd: repository
    }),
    (error) => {
      if (!error || typeof error !== "object" || !("code" in error) || !("stdout" in error)) {
        throw new Error("Expected an execFile failure");
      }
      assert.equal(error.code, 1);
      assert.equal(JSON.parse(String(error.stdout)).valid, false);
      return true;
    }
  );
});

async function withProject(callback) {
  await withTemporaryDirectory(async (root) => {
    const project = path.join(root, "project");
    await scaffoldCreatorProject(project, { title: "Willowbound" });
    await callback(project, root);
  });
}

async function withTemporaryDirectory(callback) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "lumen-creator-test-"));
  try {
    await callback(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function mutateJson(root, relative, mutate) {
  const file = path.join(root, relative);
  const value = JSON.parse(await readFile(file, "utf8"));
  mutate(value);
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function directoryContents(directory, prefix = "") {
  const values = {};
  for (const entry of (await readdir(path.join(directory, prefix), { withFileTypes: true })).sort(
    (a, b) => a.name.localeCompare(b.name)
  )) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) Object.assign(values, await directoryContents(directory, relative));
    else values[relative] = await readFile(path.join(directory, relative), "utf8");
  }
  return values;
}

async function projectSourceContents(project) {
  const validation = await validateCreatorProject(project);
  if (!validation.project) throw new Error("Expected valid creator project");
  const values = {};
  for (const [kind, relative] of validation.project.declared) {
    if (kind === "optional-context" && !validation.project.loaded[relative]) continue;
    values[relative] = await readFile(path.join(project, relative), "utf8");
  }
  return values;
}

function captureIo() {
  const output = [];
  const errors = [];
  return {
    io: { out: (value) => output.push(value), err: (value) => errors.push(value) },
    stdout: () => output.join(""),
    stderr: () => errors.join("")
  };
}
