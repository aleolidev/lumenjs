---
name: handoff
description: Save or resume a compact, pointer-based task handoff in notes/handoff. Use when context exceeds roughly 100k tokens, context is degrading or compacted, the user invokes $handoff, or a fresh task must resume prior work. Keep volatile state only; never copy repository content into a handoff.
---

# Handoff

Store local task state under `notes/handoff/<task-name>/`. The entire `notes/` directory is gitignored.

## Choose a mode

- `$handoff` or `$handoff <purpose>`: write the current task state.
- `$handoff resume <task-name>`: resume the newest handoff for that task.
- `$handoff list`: list task names and their newest handoff.
- In a fresh task with no active work, treat bare `$handoff` as resume-newest.

Do not claim an exact token count unless the runtime exposes one. Write proactively when context is near 100k tokens, after compaction, or when continuity is at risk.

## Name the task

Assign a short lowercase hyphenated slug. Reuse it for later handoffs of the same task. Accept an explicit name from the user.

Write files as `notes/handoff/<task-name>/<YYYY-MM-DD>-<NN>.md`, where `NN` is the next two-digit sequence number.

## Write

Record only state that a fresh task cannot recover cheaply from the repository:

- Goal and current status.
- Changed files and why they matter.
- Decisions, failed approaches, and blockers.
- Verification already run and its result.
- One concrete next step.

Use paths and commit hashes as pointers. Never paste source files, specifications, logs, diffs, or long reasoning. Prefer short declarative statements.

Before saving, verify that a fresh Codex task can continue using the handoff plus the current repository.

In LumenJS, also read `docs/central-development-todo.md` before writing. If the
current or previously resumed goal is complete, align the next step with the
first unblocked unchecked item in the active central goal. Record the central
goal and checkbox as pointers; do not copy the roadmap into the handoff. Do not
skip ahead or invent an isolated goal without recording the dependency or
blocker that justifies it.

After writing, return this prompt:

```text
Use $handoff resume <task-name> and continue the task.
```

## Resume

Read the newest handoff for the selected task. Then:

1. Read every referenced file again.
2. Inspect `git status`.
3. Treat repository state as authoritative when it differs from the note.
4. Continue from the recorded next step.

For LumenJS, read `docs/central-development-todo.md` after the referenced files.
Finish the handed-off goal first. When it is complete, continue with the first
unblocked unchecked item in the active central goal.

Never edit or delete old handoffs unless the user asks.
