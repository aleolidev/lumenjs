# Phase 5L locked CI-toolchain specification

Status: authorized on 2026-07-12 from portable-CI supply-chain review.

## Observed gap

CI installed dependencies from the lockfile, but invoked Playwright through
plain `npx`. If the local executable were unexpectedly absent, npx could attempt
to fetch a different package instead of failing at the reproducible boundary.

## Acceptance criteria

1. Browser installation resolves only the locally installed locked Playwright.
2. Missing local tooling fails instead of downloading a fallback package.
   npm resolves through Corepack to the exact declared package-manager version.
3. All GitHub Actions remain pinned to full commit SHAs.
4. Workflow permissions remain read-only for repository contents.
5. The workflow continues to run the single portable `npm run ci` lane.
6. Publication credentials, permissions, and workflows are not introduced.
7. Checkout does not persist the implicit GitHub token in local Git
   configuration because verification performs no authenticated Git operation.
8. The hosted runner names an explicit Ubuntu release family rather than
   following `ubuntu-latest` across unreviewed major-image changes.
