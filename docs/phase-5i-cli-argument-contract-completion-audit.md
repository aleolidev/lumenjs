# Phase 5I CLI argument-contract completion audit

Audit date: 2026-07-12.

| # | Acceptance criterion | Evidence | Result |
| --- | --- | --- | --- |
| 1 | Command-specific options | Declarative option sets cover all documented commands | Proven. |
| 2 | Required option values | Missing or option-shaped values exit 2 | Proven. |
| 3 | No duplicate ambiguity | Repeated options exit 2 | Proven. |
| 3a | Canonical generation | Scientific/alternate numeric syntax exits 2 | Proven. |
| 4 | Stable usage failure | Tests assert exact one-line stderr, empty stdout, and exit 2 for option errors, unknown commands, absent directories, and option-shaped directory omissions | Proven. |
| 5 | Valid behavior retained | Full Node gate and clean CLI workflow pass | Proven. |
| 6 | Installed candidate evidence | Packed tarball accepts workflow and rejects `--jsno` | Proven. |
| 7 | Required focus map | Omitted `--map` produces the exact usage message, exit 2, empty stdout; valid focused CLI behavior remains green | Proven. |
| 8 | Terminal-safe human interpolation | ESC-bearing command, option, and successful create path contain no raw ESC; a newline-bearing option remains one terminal line and exposes readable escaped code points | Proven. |

## Verification

- Current `npm run check` rerun: formatting, types, and 207/207 Node tests pass.
- `npm pack --dry-run --json`: 20 files, 39,169 packed bytes, 166,568
  unpacked bytes.
- A fresh temporary installation completed
  `create → validate → export → verify-export`.
- That installed executable rejected `validate project --jsno` with exit code 2
  and a single stable error message.
- The then-current installed shasum `4143d41c…` also rejects ESC-bearing commands and
  newline-bearing options with readable escaped code points and no injected
  terminal control/line.
- The then-current installed shasum `af6f2448…` rejects a command without a positional
  directory and an option-shaped directory omission with exact one-line stderr
  and exit 2, then passes Unicode create, validate, export, and verify-export.

## Decision

Phase 5I is complete. It closes ambiguity in the already documented command
surface without authorizing publication or promising long-lived CLI
compatibility.
