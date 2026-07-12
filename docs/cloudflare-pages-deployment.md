# Cloudflare Pages deployment candidate

Status: prepared but not connected or deployed.

The repository production build is a static Vite site suitable for Cloudflare
Pages. No Cloudflare account, API token, project, domain, or environment secret
is recorded in this repository.

## Dashboard configuration

- Production branch: select the eventual protected release branch.
- Root directory: repository root.
- Build command: `npm run build`.
- Build output directory: `dist`.
- Node version: 22.
- Environment variables: none required by the current build.

Cloudflare's Git integration should be connected only after the repository has
a public remote and the owner has selected the production branch. Automatic
production and preview deployments may remain disabled until the first explicit
deployment approval.

`public/_headers` is copied into `dist/_headers`. It adds conservative static
security headers without overriding Cloudflare Pages' deployment-aware cache
defaults. The creator export's own service-worker cache remains project- and
content-scoped.

## Evidence required on the real origin

1. Build from a clean checkout using the locked Node/npm toolchain.
2. Confirm `/`, hashed Vite assets, JSON/TMJ sources, and `_headers` return the
   expected status, content type, and headers over HTTPS.
3. Exercise First Light and a generated creator export online and offline.
4. Deploy a changed export and prove the waiting-worker update behavior.
5. Roll back to the preceding deployment and prove clean-origin recovery.
6. Record the `pages.dev` origin, production branch, deployment IDs, browser
   matrix, findings, and remediation in a completion audit.

Until those checks run on an owner-connected origin, Cloudflare Pages is a
prepared target rather than a supported-hosting claim.
