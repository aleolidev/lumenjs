# Phase 5 distribution progress audit

Audit date: 2026-07-12.

Phase 5 is active. This document distinguishes locally proven hardening from
roadmap outcomes that require owner decisions, independent consumers, services,
or physical hardware. It is not a Phase 5 completion claim.
The exact remaining inputs and evidence gates are listed in
`phase-5-owner-decision-checklist.md`.

| Roadmap area | Current authoritative evidence | Status |
| --- | --- | --- |
| Consumer packaging | Exact 21-entry Apache-2.0 `lumenjs@0.1.0` CLI tarball; clean install workflow | Proven as unpublished candidate. |
| CLI argument contract | Known, non-duplicate options with required values | Proven for documented commands. |
| CI dependency resolution | Locked local Playwright; SHA-pinned actions; read-only contents | Proven for portable workflow. |
| Received artifact integrity | Exact manifest inventory, paths, types, SHA-256 | Proven, not authentic. |
| Export replacement ownership | Only verified exports of the same project may be replaced | Proven. |
| Project provenance | Required declared Markdown included in export | Proven only for presence/transport. |
| Dependency provenance | Ajv direct notice plus resolved transitive snapshot | Proven as current inventory. |
| Update behavior | Content-versioned/scoped caches; no forced activation | Proven on local static host in three engines. |
| Offline behavior | Chromium offline fetch, Firefox reload, WebKit cache/control | Proven with engine qualifications. |
| Public static hosting | Cloudflare Pages build and headers prepared; no connected origin | Missing deployment evidence. |
| PWA installation | No app manifest or creator-owned 192/512 icons | Deferred; not installable. |
| Touch input | Three-engine taps/44px targets in creator export and First Light | Proven in emulation only. |
| Audio, gamepad, and remapping | Deferred since the scoped Phase 2 decision; no runtime boundary or physical sessions | Not specified or authorized. |
| Physical devices | No attached/funded device matrix | Missing external evidence. |
| Assistive technology | Local semantics/keyboard assertions only; no selected OS/browser/AT sessions | Missing external evidence. |
| Compatibility visibility | Exact accepted source versions in `inspect` | Proven experimentally. |
| Long-lived compatibility | No independent maintained project/support window | Not authorized. |
| Public npm release | Apache-2.0 `lumenjs@0.1.0`; name was unclaimed at the recorded check; clean consumer workflow | Prepared locally; registry ownership, Git remote, Trusted Publishing, and approval remain. |
| Authenticity/signing | Unsigned co-located hash manifest | Not authorized. |
| Operated services | No funding/ownership/privacy/moderation/longevity model | Remain external. |

## Verification baseline

- formatting and type checking pass;
- 211/211 Node tests pass;
- 81/81 portable browser tests pass across Chromium, Firefox, and WebKit;
- the headed Chromium WebGPU gate passes;
- the Vite production build and `git diff --check` pass;
- `npm pack --dry-run --json` selects 21 entries and includes the license and third-party
  notice; and
- a clean temporary tarball installation completed create, validate, inspect,
  localized focus, rename preview/apply, backup listing, restore preview/apply,
  nested export, and exact received-export verification.

## Decision

Phases 5A–5M and the local public-candidate preparation are complete as
experimental increments. Phase 5 as a whole is not complete: connected public
hosting, installability, real-device evidence, registry publication, public
compatibility, and any service lifecycle remain unresolved.
Continue only with internal safety, reproducibility, diagnostics, and evidence
work that does not preempt those decisions.
