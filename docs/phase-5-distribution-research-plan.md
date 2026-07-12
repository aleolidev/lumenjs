# Phase 5 distribution research plan

Status: research opened after the Phase 4 completion decision on 2026-07-12.
No package, update, PWA, or compatibility promise is authorized.

## Product question

Which distribution risks can be reduced around the artifacts LumenJS already
produces, before introducing publishing infrastructure or operated services?

## Opening evidence (historical snapshot)

The following was true when Phase 5 research opened. Current outcomes live in
`phase-5-distribution-progress-audit.md`; this section is retained to explain
why the ordered trials were authorized.

- Creator export is deterministic and records SHA-256 for every declared source
  and generated runtime file.
- There is no command that verifies a received export against that manifest.
- Project provenance is required, validated, and included in static export.
- The npm package is private version `0.0.0`; consumer publishing is not ready.
- There is no service worker, install manifest, update channel, package signing,
  physical-device matrix, or long-lived compatibility policy.
- Portable browser tests cover keyboard/button interaction and narrow viewports,
  but not real touch, gamepad, offline lifecycle, or installation.

## Ordered trials

1. **5A — received-export integrity.** Verify format, paths, exact file inventory,
   regular-file ownership, and every recorded SHA-256 offline.
2. **Packaging readiness.** Inspect the actual npm tarball before selecting
   package exports, license, names, or a release version.
3. **PWA/update lifecycle.** Research install/offline/update behavior only after
   the static artifact has a verifiable boundary.
4. **Physical devices.** Define a funded device matrix before claiming touch,
   gamepad, performance, or offline coverage.
5. **Compatibility.** Gather at least one independently maintained project
   before promising long-lived creator or module compatibility.

Operated trading, PvP, cloud synchronization, gifts, and leaderboards remain
outside this plan.

## Decision gates

- Every increment addresses an observed artifact or deployment failure.
- Verification is offline, deterministic, and inert.
- Unsafe paths, symlinks, missing files, unexpected files, and changed bytes
  fail with actionable codes.
- No cryptographic authenticity claim is made from an unsigned hash manifest.
- Publishing and compatibility remain deferred until licensing and independent
  consumer evidence exist.
