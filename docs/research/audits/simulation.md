# Simulation audits

Audit date: 2026-07-11.

## Summary

| Candidate | Pin | Best role | Reference / dependency | Confidence |
| --- | --- | --- | --- | --- |
| Pokémon Showdown | [`3597493`](https://github.com/smogon/pokemon-showdown/tree/3597493f51aa774995594904c0b763992e4939ff) | Rule coverage, deterministic input logs, protocols, tests | 9/10 / 3/10 | Medium |
| pkmn/engine | [`388b610`](https://github.com/pkmn/engine/tree/388b6109b14154f07b3f3ee9d67f34871127c4c2) | Compact kernel, fixed RNG, differential testing, WASM | 9/10 / 2/10 | Medium |
| boardgame.io | [`a3bab59`](https://github.com/boardgameio/boardgame.io/tree/a3bab596d84c41d6efbbfd94e49f9ad2a12bfef1) | Reducers, action logs, plugin state, redaction, networking | 7.5/10 / 3.5/10 | Medium |

None should be a LumenJS core dependency.

## Pokémon Showdown

Pinned HEAD: `3597493f51aa774995594904c0b763992e4939ff`.
Stable comparison: [`v0.11.10`](https://github.com/smogon/pokemon-showdown/releases/tag/v0.11.10),
commit `995b43201a2705b1cc1e707fadac239c3ddcf8ac`.

Evidence:

- [architecture](https://github.com/smogon/pokemon-showdown/blob/3597493f51aa774995594904c0b763992e4939ff/ARCHITECTURE.md)
- [battle stream](https://github.com/smogon/pokemon-showdown/blob/3597493f51aa774995594904c0b763992e4939ff/sim/battle-stream.ts)
- [seedable PRNG](https://github.com/smogon/pokemon-showdown/blob/3597493f51aa774995594904c0b763992e4939ff/sim/prng.ts)
- [simulation protocol](https://github.com/smogon/pokemon-showdown/blob/3597493f51aa774995594904c0b763992e4939ff/sim/SIM-PROTOCOL.md)
- [decision/input-log tests](https://github.com/smogon/pokemon-showdown/blob/3597493f51aa774995594904c0b763992e4939ff/test/sim/decisions.js)
- [MIT server/simulator license](https://github.com/smogon/pokemon-showdown/blob/3597493f51aa774995594904c0b763992e4939ff/LICENSE)

Strengths:

- Initial seed, teams, and validated choices form a reproducible input log.
- Input log is distinct from presentation protocol and visibility channels.
- Very broad interaction tests and generation/ruleset coverage.
- Expressive prioritized event and mod system.

Risks:

- Generic event bubbling and handler lookup are flexible but costly and hard to
  explain; they should not be copied indiscriminately.
- Simulator, data, server, and Pokémon semantics are deeply connected.
- The separately licensed client is AGPL-3.0 and must not be conflated with the
  MIT server/simulator.
- Code licensing does not grant rights to Pokémon data, names, or other IP.

Decision: rules, replay, protocol, redaction, and coverage oracle. No direct
runtime dependency.

## pkmn/engine

Pinned HEAD: `388b6109b14154f07b3f3ee9d67f34871127c4c2`.
No stable `v0.1` exists at the audited point.

Evidence:

- [status and scope](https://github.com/pkmn/engine/blob/388b6109b14154f07b3f3ee9d67f34871127c4c2/README.md)
- [design](https://github.com/pkmn/engine/blob/388b6109b14154f07b3f3ee9d67f34871127c4c2/docs/DESIGN.md)
- [testing and benchmarks](https://github.com/pkmn/engine/blob/388b6109b14154f07b3f3ee9d67f34871127c4c2/docs/TESTING.md)
- [TypeScript protocol](https://github.com/pkmn/engine/blob/388b6109b14154f07b3f3ee9d67f34871127c4c2/src/pkg/protocol.ts)
- [WASM loader](https://github.com/pkmn/engine/blob/388b6109b14154f07b3f3ee9d67f34871127c4c2/src/pkg/addon/wasm.ts)
- [license](https://github.com/pkmn/engine/blob/388b6109b14154f07b3f3ee9d67f34871127c4c2/LICENSE)

Strengths:

- Minimal opaque state with `update` and legal-choice queries.
- Serializable embedded RNG and exact fixed RNG frames for tests.
- Structured binary event protocol separated from textual presentation.
- Differential tests, fuzzing, regression fixtures, and controlled benchmarks.
- Real browser WASM boundary.

Risks:

- Invalid low-level choices can cause undefined behavior; author-facing APIs
  need validation above this boundary.
- Heavy development, breaking APIs, incomplete generations, and intentionally
  excluded custom rules and broader RPG mechanics.
- Zig/WASM complicates author extensibility and development workflow.
- Benchmark claims apply to narrow low-level playout scenarios.

Decision: primary specialized reference for kernel boundaries, fixed RNG,
differential testing, compact logs, and future WASM isolation. Not a base.

## boardgame.io

Pinned HEAD: `a3bab596d84c41d6efbbfd94e49f9ad2a12bfef1`.
Latest audited release: [`v0.50.2`](https://github.com/boardgameio/boardgame.io/releases/tag/v0.50.2),
commit `2945c30e536517cf819e000f33d9d08bacaac297`.

Evidence:

- [state reducer](https://github.com/boardgameio/boardgame.io/blob/a3bab596d84c41d6efbbfd94e49f9ad2a12bfef1/src/core/reducer.ts)
- [random plugin](https://github.com/boardgameio/boardgame.io/blob/a3bab596d84c41d6efbbfd94e49f9ad2a12bfef1/src/plugins/random/random.ts)
- [plugin lifecycle](https://github.com/boardgameio/boardgame.io/blob/a3bab596d84c41d6efbbfd94e49f9ad2a12bfef1/src/plugins/main.ts)
- [player filtering/redaction](https://github.com/boardgameio/boardgame.io/blob/a3bab596d84c41d6efbbfd94e49f9ad2a12bfef1/src/master/filter-player-view.ts)
- [license](https://github.com/boardgameio/boardgame.io/blob/a3bab596d84c41d6efbbfd94e49f9ad2a12bfef1/LICENSE)

Strengths:

- Reducer-like actions over game/context/plugin state.
- Persisted seedable RNG and client prediction safeguards.
- Explicit plugin setup/API/enhance/flush/validate/player-view lifecycle.
- Turn, phase, undo/redo, deltalog, redaction, storage, lobby, and networking
  provide useful product-level contrasts.

Risks:

- Large gap between published release and current branch.
- Default seed can originate from wall-clock time.
- Plugin ordering, wrappers, reverse flushing, Redux, networking, and server
  layers are excessive for a simulation kernel.
- Logs are not automatically a self-contained, versioned replay.

Decision: conceptual reference for authoritative actions, plugin state, player
views, and networking boundaries. Not a dependency.

## Simulation direction

The evidence supports a synchronous simulation boundary with:

- serializable state and explicit validated choices/actions;
- named, versioned, serializable PRNG streams;
- fixed/scripted RNG for tests;
- structured output facts separate from presentation;
- versioned replay input containing initial state/data hashes, engine/schema and
  module versions, seed, and ordered inputs;
- optional snapshots for seeking, never as the only replay representation;
- precomputed effect dispatch where possible instead of a universal dynamic
  bubbling bus;
- a JavaScript-first kernel until profiling demonstrates a WASM need.

This is a direction for later prototypes, not a settled public API.
