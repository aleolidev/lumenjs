import { Ajv2020 } from "ajv/dist/2020.js";
import { projectSchema, questModuleSchema } from "./project.schema.js";

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateProjectShape = ajv.compile(projectSchema);
const validateQuestShape = ajv.compile(questModuleSchema);

export function validateProject(project, moduleData = {}) {
  const errors = [];

  if (!validateProjectShape(project)) {
    errors.push(...normalizeErrors("project", validateProjectShape.errors ?? undefined));
  }

  const installed = new Map(project.modules?.map((module) => [module.id, module]));
  const eventIds = new Set(
    project.maps?.flatMap((map) => map.events.map((event) => event.id)) ?? []
  );

  for (const [moduleId, data] of Object.entries(moduleData)) {
    if (!installed.has(moduleId)) {
      errors.push({ path: `modules.${moduleId}`, message: "module data has no installed module" });
      continue;
    }

    if (moduleId === "quests" && !validateQuestShape(data)) {
      errors.push(...normalizeErrors("moduleData.quests", validateQuestShape.errors ?? undefined));
    }

    if (moduleId === "quests") {
      for (const quest of data.quests ?? []) {
        if (!eventIds.has(quest.startEvent)) {
          errors.push({
            path: `moduleData.quests.${quest.id}.startEvent`,
            message: `unknown event ${quest.startEvent}`
          });
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function normalizeErrors(prefix, errors = []) {
  return errors.map((error) => ({
    path: `${prefix}${error.instancePath || "/"}`,
    message: error.message
  }));
}
