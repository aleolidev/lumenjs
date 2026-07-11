# Capability classification

The current direction is a small core with shareable modules and beginner-safe
presets. This classification tests that direction without defining its API.

Every capability will later be assigned to one or more of these roles:

| Role | Meaning |
| --- | --- |
| Core | Minimal runtime coordination required by nearly every project. |
| Contract | Stable boundary shared by interchangeable implementations. |
| Official module | Maintained reusable implementation for the standard experience. |
| Optional module | Reusable but unnecessary for most projects. |
| Project extension | Rules or content specific to one game. |
| Tooling | Authoring, validation, debugging, build, or publishing support. |
| External service | Networked capability with an independent operational lifecycle. |

## Constraints

- Modularity must not burden beginners; presets should provide coherent defaults.
- A module must not exist solely to make the directory tree look clean.
- Dependencies and required capabilities must be explicit.
- Runtime and editor extensions need compatible data and validation contracts.
- Modules must not communicate through mutable global state.
- Replacement boundaries require at least two real implementations or another
  demonstrated reason for interchangeability.
- Network features should remain optional and degrade safely when unavailable.
- Project content and protected intellectual property remain outside the engine.

## Questions to answer with evidence

- Which facilities are truly universal enough for the core?
- Which systems need cross-module contracts?
- Can modules extend both runtime and editor without duplicating schemas?
- How are configuration, migrations, ordering, and compatibility represented?
- What can be tree-shaken or loaded on demand?
- Which extension points are necessary for real fangame systems?
- Which apparent extension points introduce complexity without practical value?
