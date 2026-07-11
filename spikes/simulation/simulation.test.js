import assert from "node:assert/strict";
import test from "node:test";
import { createSimulation, runReplay } from "./simulation.js";

const replay = {
  format: "lumen-spike-replay-v1",
  engineVersion: "spike",
  schemaVersion: 1,
  moduleVersions: { battle: "spike" },
  initialDataHash: "fixture-v1",
  seed: 0x12345678,
  inputs: [
    { player: "attack", rival: "guard" },
    { player: "attack", rival: "attack" }
  ]
};

test("the same replay produces identical state and facts", () => {
  assert.deepEqual(runReplay(replay), runReplay(replay));
});

test("different seeds change outcomes without changing valid choices", () => {
  const first = runReplay(replay);
  const second = runReplay({ ...replay, seed: replay.seed + 1 });
  assert.notDeepEqual(first, second);
});

test("scripted RNG makes edge cases exact", () => {
  const simulation = createSimulation({ seed: 1, scriptedRandom: [0.999] });
  const result = simulation.step(simulation.initialState(), {
    player: "attack",
    rival: "guard"
  });

  assert.deepEqual(result.events, [
    { type: "damage", actor: "player", target: "rival", damage: 3, roll: 0.999 },
    { type: "guard", actor: "rival" }
  ]);
});

test("invalid input is rejected before state transition", () => {
  const simulation = createSimulation({ seed: 1 });
  assert.throws(
    () =>
      simulation.step(simulation.initialState(), {
        player: "unknown",
        rival: "guard"
      }),
    /invalid action/
  );
});
