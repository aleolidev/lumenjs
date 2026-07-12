# Phase 3D focused-playtest completion audit

Audit date: 2026-07-12.

| # | Acceptance criterion | Evidence | Result |
| --- | --- | --- | --- |
| 1 | Deterministic focused initial state | Repeated focus equality and fixed hash | Proven. |
| 2 | Unknown references fail before state | Map/spawn/locale diagnostic matrix plus three-engine exported-page `?map=constructor` error with empty state diagnostics and no console error | Proven. |
| 3 | Movement/collision/interaction/locale/transitions | Browser-free route test | Proven. |
| 4 | Focus is source-inert | Full directory comparison | Proven. |
| 5 | CLI output and exit behavior | CLI focus tests | Proven. |
| 6 | Deterministic, safely generated export | Exact file/hash test plus a closing-title/script-shaped authored title that remains escaped text and creates no script element | Proven. |
| 7 | Three-browser focused playtest | Chromium, Firefox, WebKit route tests | Proven. |
| 8 | Narrow controls/live inspector | Portable viewport browser matrix | Proven. |
| 9 | Earlier gates remain green | 101 Node, 42 portable browser, headed GPU, build | Proven. |
| 10 | Experimental boundary | Specification and README | Proven. |
| 11 | Keyboard ownership | Exact focused-Space tick, composing-event inertia, and global movement in three engines | Proven. |
| 12 | Document language | Spanish root/message `lang` assertions in three engines | Proven. |
| 13 | Own-property focused references | Unknown-reference matrix includes `constructor` map/spawn/locale values; every initial and transition-target lookup uses own entries | Proven. |

## Scope confirmation

The focused simulator and export are experimental fixture tooling. They do not
replace First Light, establish a public module pair, or implement dialogue
choices, battles, trainer/quest runtime, animation, WebGPU reuse, saves, or a
visual editor.
