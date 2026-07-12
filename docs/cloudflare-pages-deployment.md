# Cloudflare Pages deployment

Status: connected and deployed; core production-origin checks passed on
2026-07-12.

The repository production build is a static Vite site suitable for Cloudflare
Pages. The public production origin is <https://lumenjs.pages.dev>, built from
the protected `main` branch of `github.com/aleolidev/lumenjs`. No Cloudflare
account identifier, API token, custom domain, or environment secret is recorded
in this repository.

## Dashboard configuration

- Production branch: `main`.
- Root directory: repository root.
- Build command: `npm run build`.
- Build output directory: `dist`.
- Node version: 22.
- Environment variables: none required by the current build.

Cloudflare's Git integration is restricted to the `lumenjs` repository.
Production builds run automatically for `main`.

`public/_headers` is copied into `dist/_headers`. It adds conservative static
security headers without overriding Cloudflare Pages' deployment-aware cache
defaults. The creator export's own service-worker cache remains project- and
content-scoped.

## Production-origin evidence

The initial deployment built commit `76635c4` with Node 22.22.0 and npm 11.6.1.
The Cloudflare build completed successfully and the following checks passed:

- `/` returned HTTPS 200 and `text/html; charset=utf-8`;
- the hashed JavaScript asset returned HTTPS 200 and
  `application/javascript`;
- `first-light/project.lumen.json` returned HTTPS 200 and `application/json`;
- the configured security headers were present on the origin;
- First Light loaded in Chromium with campaign validation and WebGPU ready; and
- the GitHub App installation was limited to `aleolidev/lumenjs`.

The initial origin check found `.tmj` files served as
`application/octet-stream`. The deployment configuration now declares them as
`application/json; charset=utf-8`; the automatic deployment of this change must
be checked before closing the hosting gate.

## Remaining extended hosting evidence

1. Build from a clean checkout using the locked Node/npm toolchain.
2. Confirm `/`, hashed Vite assets, JSON/TMJ sources, and `_headers` return the
   expected status, content type, and headers over HTTPS.
3. Exercise First Light and a generated creator export online and offline.
4. Deploy a changed export and prove the waiting-worker update behavior.
5. Roll back to the preceding deployment and prove clean-origin recovery.
6. Record the `pages.dev` origin, production branch, deployment IDs, browser
   matrix, findings, and remediation in a completion audit.

Core connected hosting is proven. Generated creator-export offline/update
behavior, rollback, clean-origin recovery, and the broader browser matrix remain
extended evidence gates and are not implied by the initial deployment.
