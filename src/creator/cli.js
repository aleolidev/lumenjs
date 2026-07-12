import path from "node:path";
import { exportCreatorProject } from "./export-project.js";
import { focusCreatorProject } from "./focus-project.js";
import { inspectCreatorProject } from "./inspect-project.js";
import { renameCreatorProject } from "./rename-project.js";
import { inspectCreatorBackups, restoreCreatorProject } from "./restore-project.js";
import { scaffoldCreatorProject } from "./scaffold-project.js";
import { validateCreatorProject } from "./validate-project.js";
import { verifyCreatorExport } from "./verify-export.js";

export async function runCreatorCli(args, io = defaultIo) {
  const [command, directory, ...options] = args;
  if (!command || command === "help" || command === "--help" || command === "-h") {
    io.out(helpText);
    return 0;
  }
  if (!Object.hasOwn(commandOptions, command)) {
    io.err(`Unknown command '${terminalText(command)}'.\n`);
    return 2;
  }
  if (!directory || directory.startsWith("--")) {
    io.err("Missing project directory.\n");
    return 2;
  }
  const optionError = validateOptions(command, options);
  if (optionError) {
    io.err(`${terminalText(optionError)}\n`);
    return 2;
  }
  const json = options.includes("--json");
  try {
    if (command === "create") {
      const title = optionValue(options, "--name") ?? "New Lumen Journey";
      const value = await scaffoldCreatorProject(directory, { title });
      writeResult(
        io,
        json,
        value,
        `Created '${value.projectId}' in ${relative(value.directory)}.\n`
      );
      return 0;
    }
    if (command === "validate") {
      const value = await validateCreatorProject(directory);
      if (json)
        io.out(
          `${JSON.stringify({ valid: value.valid, diagnostics: value.diagnostics }, null, 2)}\n`
        );
      else if (value.valid) io.out(`Valid creator project: ${relative(path.resolve(directory))}\n`);
      else writeDiagnostics(io, value.diagnostics);
      return value.valid ? 0 : 1;
    }
    if (command === "inspect") {
      const value = await inspectCreatorProject(directory);
      if (!value.valid) {
        if (json)
          io.out(`${JSON.stringify({ valid: false, diagnostics: value.diagnostics }, null, 2)}\n`);
        else writeDiagnostics(io, value.diagnostics);
        return 1;
      }
      if (json) io.out(`${JSON.stringify(value.summary, null, 2)}\n`);
      else io.out(humanInspection(value.summary));
      return 0;
    }
    if (command === "export") {
      const output = optionValue(options, "--out");
      if (!output) {
        io.err("Missing required --out <directory>.\n");
        return 2;
      }
      const value = await exportCreatorProject(directory, output);
      writeResult(
        io,
        json,
        value,
        `Exported '${value.manifest.projectId}' to ${relative(value.output)}${
          value.backupCleanup === "deferred" ? " · old backup cleanup deferred" : ""
        }.\n`
      );
      return 0;
    }
    if (command === "rename") {
      const kind = optionValue(options, "--kind");
      const from = optionValue(options, "--from");
      const to = optionValue(options, "--to");
      if (!kind || !from || !to) {
        io.err("Rename requires --kind, --from, and --to.\n");
        return 2;
      }
      const value = await renameCreatorProject(directory, {
        kind,
        from,
        to,
        map: optionValue(options, "--map"),
        apply: options.includes("--apply")
      });
      if (json) io.out(`${JSON.stringify(value, null, 2)}\n`);
      else {
        io.out(`${value.applied ? "Applied" : "Preview"} ${kind} rename ${from} → ${to}\n`);
        for (const change of value.changes) io.out(`  ${change.source}${change.pointer}\n`);
        if (value.backupGeneration) io.out(`Backup generation: ${value.backupGeneration}\n`);
      }
      return 0;
    }
    if (command === "focus") {
      const map = optionValue(options, "--map");
      if (!map) {
        io.err("Focus requires --map <id>.\n");
        return 2;
      }
      const value = await focusCreatorProject(directory, {
        map,
        spawn: optionValue(options, "--spawn"),
        locale: optionValue(options, "--locale")
      });
      if (!value.valid) {
        if (json) io.out(`${JSON.stringify(value, null, 2)}\n`);
        else writeDiagnostics(io, value.diagnostics);
        return 1;
      }
      if (!value.focus) throw new Error("Focused playtest result is missing");
      if (json) io.out(`${JSON.stringify(value.focus, null, 2)}\n`);
      else
        io.out(
          `Focused playtest: ${value.focus.map}/${value.focus.spawn} · ${value.focus.locale}\nExport and open index.html${value.focus.query}\n`
        );
      return 0;
    }
    if (command === "backups") {
      const values = await inspectCreatorBackups(directory);
      if (json) io.out(`${JSON.stringify(values, null, 2)}\n`);
      else if (values.length === 0) io.out("No creator backups.\n");
      else {
        for (const value of values) {
          io.out(
            `Generation ${value.generation} · ${value.valid ? "valid" : "corrupt"} · ${
              value.operation?.operation?.kind ?? "unknown operation"
            }\n`
          );
        }
      }
      return values.every((value) => value.valid) ? 0 : 1;
    }
    if (command === "restore") {
      const generationValue = optionValue(options, "--generation");
      if (!generationValue) {
        io.err("Restore requires --generation <number>.\n");
        return 2;
      }
      const generation = Number(generationValue);
      if (!/^[1-9]\d*$/.test(generationValue) || !Number.isSafeInteger(generation)) {
        io.err("Restore generation must be a canonical positive safe integer.\n");
        return 2;
      }
      const value = await restoreCreatorProject(directory, generation, {
        apply: options.includes("--apply")
      });
      if (json) io.out(`${JSON.stringify(value, null, 2)}\n`);
      else
        io.out(
          `${value.applied ? "Restored" : "Restore preview"} generation ${value.generation} · ${
            value.changedFiles.length
          } files${value.safetyGeneration ? ` · safety generation ${value.safetyGeneration}` : ""}\n`
        );
      return 0;
    }
    if (command === "verify-export") {
      const value = await verifyCreatorExport(directory);
      if (json) io.out(`${JSON.stringify(value, null, 2)}\n`);
      else
        io.out(
          `Verified export: ${value.projectId} ${value.projectVersion} · ${Object.keys(value.files).length} files\n`
        );
      return 0;
    }
    io.err(`Unknown command '${terminalText(command)}'.\n`);
    return 2;
  } catch (error) {
    const value = {
      code:
        error && typeof error === "object" && "code" in error
          ? error.code
          : "CREATOR_INTERNAL_ERROR",
      message: error instanceof Error ? error.message : String(error),
      diagnostics:
        error && typeof error === "object" && "diagnostics" in error ? error.diagnostics : []
    };
    if (json) io.out(`${JSON.stringify({ valid: false, error: value }, null, 2)}\n`);
    else {
      io.err(`${terminalText(value.code)}: ${terminalText(value.message)}\n`);
      if (Array.isArray(value.diagnostics)) writeDiagnostics(io, value.diagnostics);
    }
    return 1;
  }
}

function optionValue(options, name) {
  const index = options.indexOf(name);
  return index < 0 ? null : (options[index + 1] ?? null);
}

const commandOptions = {
  create: { values: ["--name"], flags: ["--json"] },
  validate: { values: [], flags: ["--json"] },
  inspect: { values: [], flags: ["--json"] },
  focus: { values: ["--map", "--spawn", "--locale"], flags: ["--json"] },
  rename: {
    values: ["--kind", "--from", "--to", "--map"],
    flags: ["--apply", "--json"]
  },
  backups: { values: [], flags: ["--json"] },
  restore: { values: ["--generation"], flags: ["--apply", "--json"] },
  export: { values: ["--out"], flags: ["--json"] },
  "verify-export": { values: [], flags: ["--json"] }
};

function validateOptions(command, options) {
  const schema = commandOptions[command];
  if (!schema) return null;
  const seen = new Set();
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    if (!schema.values.includes(option) && !schema.flags.includes(option)) {
      return `Unknown option '${option}' for '${command}'.`;
    }
    if (seen.has(option)) return `Duplicate option '${option}' for '${command}'.`;
    seen.add(option);
    if (schema.values.includes(option)) {
      const value = options[index + 1];
      if (!value || value.startsWith("--")) return `Missing value for '${option}'.`;
      index += 1;
    }
  }
  return null;
}

function writeResult(io, json, value, human) {
  io.out(json ? `${JSON.stringify(value, null, 2)}\n` : human);
}

function writeDiagnostics(io, diagnostics) {
  for (const item of diagnostics) {
    io.err(
      `${terminalText(item.code)} ${terminalText(item.source)}${terminalText(item.pointer)}: ${terminalText(item.message)}\n  Remedy: ${terminalText(item.remedy)}\n`
    );
  }
}

function humanInspection(summary) {
  return [
    `${summary.project.title} (${summary.project.id}) ${summary.project.version}`,
    `Start map: ${summary.project.startMap}`,
    `Maps: ${summary.maps.map((map) => `${map.id} ${map.width}×${map.height}`).join(", ")}`,
    `Transitions: ${summary.graph.length}`,
    `Campaign: ${summary.campaign.creatures} creatures, ${summary.campaign.dialogueNodes} dialogue nodes, ${summary.campaign.encounters} encounters`,
    `Compatibility: ${summary.compatibility.policy}`,
    `Declared files: ${summary.declaredFiles.length}`,
    ""
  ].join("\n");
}

function relative(value) {
  return terminalText(path.relative(process.cwd(), value) || ".");
}

function terminalText(value) {
  return String(value).replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, (character) => {
    return `\\u{${(character.codePointAt(0) ?? 0).toString(16).padStart(4, "0")}}`;
  });
}

const defaultIo = {
  out(value) {
    process.stdout.write(value);
  },
  err(value) {
    process.stderr.write(value);
  }
};

const helpText = `Experimental LumenJS creator tools\n\nUsage:\n  lumen create <directory> [--name <title>] [--json]\n  lumen validate <directory> [--json]\n  lumen inspect <directory> [--json]\n  lumen focus <directory> --map <id> [--spawn <id>] [--locale <id>] [--json]\n  lumen rename <directory> --kind <kind> --from <id> --to <id> [--map <id>] [--apply] [--json]\n  lumen backups <directory> [--json]\n  lumen restore <directory> --generation <number> [--apply] [--json]\n  lumen export <directory> --out <directory> [--json]\n  lumen verify-export <directory> [--json]\n`;
