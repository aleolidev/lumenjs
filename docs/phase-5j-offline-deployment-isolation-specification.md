# Phase 5J offline deployment-isolation specification

Status: authorized on 2026-07-12 from multi-deployment cache review.

## Observed gap

Cache cleanup was namespaced by project ID but CacheStorage is shared across an
origin. Two copies of one project under different paths could therefore treat
each other's revisions as obsolete and delete them during activation.

## Acceptance criteria

1. Cache ownership includes both project identity and registration scope.
2. Revision cleanup can delete only caches owned by that exact deployment, and
   fetches consult only that deployment's active cache.
3. Two same-project exports under different paths retain distinct caches.
4. Chromium, Firefox, and WebKit exercise the two-deployment scenario.
5. Content revisions, ordinary offline behavior, and non-forced activation are
   unchanged.
6. No cross-origin, hosting, or installable-PWA claim is added.
