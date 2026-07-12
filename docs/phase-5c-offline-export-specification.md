# Phase 5C offline static-export specification

Status: authorized on 2026-07-12 after local artifact inspection and current
standards review.

## Evidence boundary

The Web Application Manifest specification defines launch and presentation
metadata, while current Chromium install promotion expects named 192px and
512px icons. LumenJS has no creator icon/provenance pipeline, so this increment
does not claim installability or generate placeholder brand art.

Service workers provide `install`, `activate`, and `fetch` lifecycle events and
can support offline behavior. The exported worker therefore caches the exact
verified bundle, uses a content-derived cache version, removes only older caches
owned by the same project deployment scope, and takes control after activation. It deliberately
does not call `skipWaiting()`: updates wait for existing pages to close so an
active playtest cannot mix old document code with newly activated resources.

Sources:

- https://www.w3.org/TR/appmanifest/
- https://www.w3.org/TR/service-workers/
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable

## Acceptance criteria

1. Every export includes deterministic `offline.js` and `service-worker.js`.
2. The worker pre-caches the complete exported inventory including the integrity
   manifest and itself.
3. The cache name changes when project content/version changes.
4. Activation deletes only superseded caches for the same project and scope.
   Updates do not force activation over an open page; a dedicated local static
   host proves waiting, activation after client closure, and cleanup.
5. Same-origin GET requests consult only the active deployment cache, with query-insensitive
   navigation fallback; other requests are untouched.
6. Registration or first-install failure leaves the online playtest usable and
   observable; the bootstrap must not wait indefinitely on `ready` after an
   installing worker becomes `redundant`.
7. Chromium serves cached resources with network emulation offline; Firefox
   completes an offline reload; WebKit proves worker control and Cache Storage
   population. Playwright WebKit's offline mode bypasses the worker, so no
   automated WebKit offline-navigation claim is made.
8. Export verification covers the offline files and all inherited gates pass.
9. No PWA installability, physical-device, or update-service claim is made.
10. an offline navigation to the exact deployment-scope root falls back to the
    cached `index.html`; unrelated missing paths still reach the network and do
    not acquire implicit SPA routing semantics.
11. cache revision hashes both the exported resource hashes and the complete
    worker template with a non-circular placeholder. The template carries the
    export-manifest format identity as well as cache policy. The format is also
    an explicit cache-name component, so a format or policy/code-only worker
    change cannot reuse and mutate the active cache while waiting.
