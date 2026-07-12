# Minimum TypeScript core specification

Status: implemented and proven by the completion audit.

## Product slice

The first importable LumenJS core must let an application:

1. create a game from a validated creator-project manifest and its loaded JSON
   documents;
2. start on a declared map and spawn;
3. move through bounded maps with authored collision;
4. interact with a faced character and receive localized text plus structured
   facts;
5. follow authored transitions between maps; and
6. create and restore a project-bound serializable save.

This is the smallest slice already exercised by two distinct creator projects:
Willowbound and Tideglass Reach. First Light remains a specialized research
consumer until it can adopt this slice without losing its campaign behavior.

## Public boundary

The initial public boundary is one TypeScript entry point:

- `createGame(options)` creates an isolated game session;
- `game.dispatch(action)` applies one synchronous deterministic action;
- `game.getState()` returns an isolated snapshot;
- `game.getMap()` returns an isolated render-facing map snapshot;
- `game.createSave()` returns a project-bound portable value; and
- `game.restoreSave(value)` validates identity and state before replacing the
  session state.

Actions, state, facts, source documents, options, saves, and the session shape
are exported TypeScript types. JavaScript consumers receive compiled ESM and
TypeScript consumers receive declarations. Consumers never need TypeScript at
runtime.

## Deliberate exclusions

- no public renderer, scene-item, battle, creature, module, CLI, or persistence
  adapter contract;
- no filesystem or fetch policy in the core;
- no mutable global state;
- no acceptance of unvalidated arbitrary project documents;
- no compatibility promise beyond the experimental package version; and
- no npm publication until both consumers use the built package entry point.

The creator validator remains the authority for source diagnostics. The core
performs defensive boundary checks, but does not duplicate the complete schema
and source-linked diagnostic system.

## Acceptance evidence

1. Strict TypeScript builds compiled ESM and declarations.
2. Willowbound and Tideglass Reach each create independent sessions through the
   public entry point.
3. Both games prove movement, character interaction, map transition, save, and
   restore using their own source data.
4. Cross-project and malformed saves are rejected without mutating live state.
5. A clean packed-package consumer imports `lumenjs` without repository paths.
6. Existing CLI, browser, and First Light checks remain green.
