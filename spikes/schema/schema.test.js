import assert from "node:assert/strict";
import test from "node:test";
import { validateProject } from "./validate.js";

const validProject = {
  schemaVersion: 1,
  modules: [{ id: "quests", version: "1.0.0" }],
  maps: [
    {
      id: "first-town",
      events: [{ id: "meet-guide", kind: "dialogue" }]
    }
  ]
};

test("validates core and module-owned data", () => {
  const result = validateProject(validProject, {
    quests: { quests: [{ id: "welcome", startEvent: "meet-guide" }] }
  });

  assert.deepEqual(result, { valid: true, errors: [] });
});

test("reports structural and semantic errors together", () => {
  const result = validateProject(
    { ...validProject, unexpected: true },
    { quests: { quests: [{ id: "welcome", startEvent: "missing-event" }] } }
  );

  assert.equal(result.valid, false);
  assert.match(result.errors[0]?.message ?? "", /additional properties/);
  assert.match(result.errors.at(-1)?.message ?? "", /unknown event/);
});

test("rejects data for a module that is not installed", () => {
  const result = validateProject(
    { ...validProject, modules: [] },
    {
      quests: { quests: [] }
    }
  );

  assert.equal(result.valid, false);
  assert.match(result.errors[0]?.message ?? "", /no installed module/);
});
