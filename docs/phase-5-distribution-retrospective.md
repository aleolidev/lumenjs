# Phase 5 distribution retrospective (interim)

Retrospective date: 2026-07-12.

## What changed

- Distribution now has a verifiable received-artifact boundary rather than only
  a producer-side hash list.
- npm packaging moved from an accidental repository dump to a private minimal
  CLI candidate whose installed artifact was exercised end to end.
- Offline support uses the exported file inventory and waits through the normal
  service-worker update lifecycle instead of forcing a new worker over an open
  playtest.
- Device claims distinguish desktop clicks, touch emulation, browser-engine GPU,
  and physical hardware.
- Inspection shows current format versions while explicitly denying a future
  compatibility promise.
- Direct dependency license metadata is visible in the candidate tarball.

## What the trials caught

- The first package allowlist omitted `src/project/schemas.js`; a clean tarball
  installation exposed the missing transitive local import.
- Immediate `skipWaiting()` would have risked mixing an old open document with
  newly active cached resources; the generated worker now waits normally.
- `register()` can resolve before a first worker's `install` promise fails;
  waiting only on `navigator.serviceWorker.ready` then hangs indefinitely. The
  bootstrap now observes an installing worker becoming `redundant`, reports the
  offline failure, and leaves online play usable.
- The cache revision originally covered resource hashes and worker policy but
  not the export-manifest format explicitly. The generated worker now carries
  that format identity in its non-circular revision template and uses it
  directly in the cache name.
- Browser offline emulation is not equivalent across engines. WebKit's runner
  bypasses the worker in offline mode, so its evidence is cache/control rather
  than offline navigation.
- An attempted in-place worker-update trial confirmed that Vite served revised
  bytes through an uncached probe but did not expose the revised script through
  the browsers' special fixed-URL update check. The trial was removed rather
  than claiming a lifecycle that harness could not prove. A dedicated local
  static server then proved waiting, activation, and owned cleanup in all three
  engines; public-host/CDN behavior remains a deployment gate.
- Tiled version visibility corrected an assumed 1.11.2 to the fixture's actual
  1.12.2 declaration.
- A project-ID-only cache prefix allowed two deployments of the same project on
  one origin to delete each other's old revisions. Cache ownership now includes
  the service-worker registration scope.
- The experimental CLI previously ignored unknown options and could consume an
  option token as another option's value; command-specific validation now fails
  those cases as usage errors.
- A verified export of any project originally authorized destination
  replacement. Replacement now requires the same project ID and an atomic
  destination reservation.
- Source backup numbering was concurrent-safe before the source commits were.
  Create now uses UUID staging, while rename, restore, and export snapshots
  share one cooperative per-project reservation.
- Package globs made the measured tarball boundary vulnerable to silent growth;
  the manifest now equals the tested import/resource closure exactly.
- Global keyboard handlers originally also consumed Space owned by a focused
  button, duplicating its native activation. First Light and creator exports now
  separate focused control, editable/select, IME, and global movement input.

## Remaining decisions

Apache-2.0, the `lumenjs@0.1.0` candidate, and Cloudflare Pages are now selected.
Registry ownership, the exact Git remote, release approval, and a supported
compatibility window still require project-owner intent. Public hosting also
requires real HTTPS, header, scope, update, offline, and rollback evidence.
Installable PWA work requires
creator-owned icons and provenance. Physical-device and assistive-technology
claims—including gamepad/remapping and audio routing/interruption—require real
sessions and a separately accepted runtime specification. Operated services
require an explicit sustainable ownership model.
