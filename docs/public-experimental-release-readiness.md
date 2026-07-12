# Public experimental release readiness

Status: public GitHub repository and Cloudflare Pages site deployed; npm package
remains unpublished.

## Approved decisions

- Project license: Apache-2.0.
- Candidate product: the `lumen` creator CLI plus a minimum TypeScript core;
  its two-game gates pass, while publication remains a separate owner decision.
- Candidate package identity: `lumenjs@0.1.0`.
- Candidate npm channel: `next`.
- Public hosting: Cloudflare Pages at <https://lumenjs.pages.dev>.
- Internal schemas, context modules, runtime structure, and export formats stay
  experimental and carry no long-lived compatibility promise.

The exact source identity is `github.com/aleolidev/lumenjs`, and package
metadata records that repository, issue tracker, and README homepage. The
unscoped npm name returned `E404` on 2026-07-12. That is only a point-in-time
availability check; npm does not reserve the name until an authorized publish.

## Locally provable release gates

- The package carries `LICENSE`, Apache metadata, README, and third-party notices.
- `npm run check:release` packs and installs into a clean temporary consumer,
  compiles a TypeScript import, imports from JavaScript, and exercises the CLI
  without publishing.
- The package exposes the `lumen` executable and one experimental ESM entry
  point with TypeScript declarations.
- The manual release-candidate workflow has read-only repository permissions and
  uploads an unpublished tarball for seven days. It contains no registry token,
  OIDC permission, or `npm publish` command.
- Willowbound and Tideglass Reach run movement, localized interaction, map
  transition, and save/restore as distinct core consumers; their static web
  exports run the same compiled core in Chromium, Firefox, and WebKit.
- The Vite build carries Cloudflare Pages headers into `dist`.

## Owner-connected gates

Before publishing, the owner must confirm registry ownership, configure npm
Trusted Publishing for GitHub user `aleolidev`, repository `lumenjs`, workflow
`publish.yml`, environment `npm-production`, and allowed action `npm publish`,
then approve the release. Because a brand-new npm package has no settings page,
the initial `0.1.0` publication may require an owner-authenticated bootstrap;
Trusted Publishing can govern later releases after the package exists.

Cloudflare Pages is connected to the protected `main` branch with GitHub access
limited to `lumenjs`. The core HTTPS, security-header, asset, and First Light
checks are recorded in `cloudflare-pages-deployment.md`; extended offline,
update, rollback, and clean-origin evidence remains separate.

Physical-device, assistive-technology, independent-project, compatibility-window,
and operated-service gates remain separate. This candidate does not make those
claims.
