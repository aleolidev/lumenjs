# Phase 5C offline static-export completion audit

Audit date: 2026-07-12.

| # | Acceptance criterion | Evidence | Result |
| --- | --- | --- | --- |
| 1 | Deterministic offline runtime | Repeated exact export plus file inventory | Proven. |
| 2 | Complete pre-cache | Generated worker inventory assertions | Proven. |
| 3 | Content-derived cache revision | Project-version mutation test | Proven. |
| 4 | Non-forced activation and owned cleanup | Three-engine static-host lifecycle | Proven locally. |
| 5 | Scoped fetch behavior | Generated worker request-policy assertion | Proven. |
| 6 | Observable non-fatal registration | Injected script-evaluation rejection plus a separate first-install failure reaching worker state `redundant`; both set `data-offline-ready=error` and remain playable in three engines | Proven. |
| 7 | Browser evidence calibrated by engine | Offline matrix plus three-engine update lifecycle | Proven as scoped. |
| 8 | Verification and inherited gates | Current 207 Node, 81 portable browser, headed GPU, build | Proven. |
| 9 | No install/device/service claim | Specification and README boundary | Proven. |
| 10 | Exact scope-root offline navigation | Firefox navigates offline from explicit `index.html` to the deployment folder URL and reaches ready state; worker fallback is pathname-equal to registration scope only | Proven. |
| 11 | Worker-policy-derived cache revision | Node test requires export format as an explicit cache-name component and independently reproduces the revision; the three-engine update lifecycle observes that format in the sole active cache name | Proven. |

## Verification record

- Current `npm run check`: formatting, types, and 207/207 Node tests pass.
- Current `npm run test:browser`: 81/81 portable tests pass across Chromium, Firefox,
  and WebKit; three GPU-only matrix entries skip as designed.
- `npm run test:gpu`: headed Chromium passes on the First Light fixture.
- `npm run build` and `git diff --check`: pass.

## Browser qualification

Chromium served cached export resources while its network emulation was offline.
Firefox completed a full offline navigation to the exact scope root. WebKit registered and controlled the
page and exposed the expected Cache Storage entries; Playwright WebKit's offline
mode bypassed the service worker, so this audit does not claim WebKit offline
navigation or physical-device coverage.

An attempted same-URL in-place update through Vite could fetch revised worker
bytes through an uncached probe, but Vite did not expose those bytes through the
browsers' special service-worker update request. A dedicated local static HTTP
fixture with `Cache-Control: no-store` removed that harness ambiguity. Chromium,
Firefox, and WebKit each observed the new worker waiting while the old client
remained open, two cache revisions, activation after that client closed, and
cleanup to the sole 0.1.1 cache.

## Scope confirmation

The export has a deterministic offline cache and a content-derived replacement
policy. It is not yet an installable PWA: no application manifest or
creator-owned 192/512 icons are generated. There is no remote update service,
publisher signature, physical-device claim, or long-lived cache compatibility
promise. The local no-store server proves browser lifecycle semantics, not CDN,
reverse-proxy, or public-host cache configuration.

The generated bootstrap also observes the installing worker rather than waiting
forever on `navigator.serviceWorker.ready`: a first install whose `install`
promise rejects becomes `redundant`, reports `data-offline-ready=error`, and
leaves the focused playtest usable in Chromium, Firefox, and WebKit.
