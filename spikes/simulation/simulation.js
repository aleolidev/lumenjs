/**
 * @param {{ seed: number, scriptedRandom?: number[] }} options
 */
export function createSimulation({ seed, scriptedRandom = [] }) {
  const random = createRandom(seed, scriptedRandom);

  return {
    initialState() {
      return { turn: 0, actors: { player: 10, rival: 10 } };
    },

    choices(state, actor) {
      if (state.actors[actor] <= 0) return [];
      return ["attack", "guard"];
    },

    step(state, actions) {
      const next = structuredClone(state);
      const events = [];
      const order = ["player", "rival"];

      for (const actor of order) {
        const action = actions[actor];
        if (!this.choices(state, actor).includes(action)) {
          throw new Error(`invalid action ${action} for ${actor}`);
        }

        const target = actor === "player" ? "rival" : "player";
        if (action === "guard") {
          events.push({ type: "guard", actor });
          continue;
        }

        const roll = random.next();
        const guarded = actions[target] === "guard";
        const damage = Math.max(1, 2 + Math.floor(roll * 3) - Number(guarded));
        next.actors[target] = Math.max(0, next.actors[target] - damage);
        events.push({ type: "damage", actor, target, damage, roll });
      }

      next.turn += 1;
      return { state: next, events, randomState: random.state() };
    }
  };
}

function createRandom(seed, scripted) {
  let state = seed >>> 0;
  let index = 0;

  return {
    next() {
      if (index < scripted.length) return scripted[index++];
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      state >>>= 0;
      return state / 0x1_0000_0000;
    },
    state() {
      return { algorithm: "xorshift32-v1", state, scriptedIndex: index };
    }
  };
}

export function runReplay(replay) {
  const simulation = createSimulation({ seed: replay.seed });
  let state = simulation.initialState();
  const events = [];

  for (const actions of replay.inputs) {
    const result = simulation.step(state, actions);
    state = result.state;
    events.push(...result.events);
  }

  return { state, events };
}
