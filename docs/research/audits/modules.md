# Module distribution and trust audit

Audit date: 2026-07-11.

## Assignment

| Need | Primary reference | Decision |
| --- | --- | --- |
| Distribution | npm ESM packages | Use existing ecosystem; no custom package manager. |
| Resolution/reproducibility | `package-lock.json` + `npm ci` | One authoritative dependency graph. |
| Host compatibility | `peerDependencies` + Lumen manifest | Major-compatible public contract. |
| Official publishing | npm Trusted Publishing/OIDC + provenance | Required for first-party releases. |
| Browser hostile-code isolation | Cross-origin sandboxed iframe | Future high-trust-cost tier only. |
| Capability security model | Object capabilities / [Endo](https://github.com/endojs/endo) concepts | Reference; do not adopt SES yet. |

## Package contract

Use normal `package.json` fields including a closed `exports` map, `files`
allowlist, license, repository, ESM type, and engine range. A validated custom
`lumen` manifest may declare:

- module API version;
- runtime, editor, and worker entries;
- required and provided functional capabilities;
- requested sensitive permissions;
- schemas and migration entries.

The project dependency declaration and npm lock remain authoritative. Do not
create a second Lumen lockfile that can disagree with npm.

## Trust tiers

1. Official/reviewed code may run as direct ESM with explicitly injected
   capabilities.
2. Declarative content and registered effects are preferred for ordinary
   creator extensions.
3. Untrusted browser UI/code must not run in the main realm. Workers improve
   failure and performance isolation but retain powerful APIs such as `fetch`
   and are not security sandboxes. A hostile plugin needs an opaque/dedicated
   origin sandboxed iframe and a narrow message protocol.
4. Editor-side npm plugins are trusted code in the initial model. `node:vm` is
   explicitly not a security boundary and Node permissions protect primarily
   against accidents. Truly hostile editor code needs OS process/container
   isolation or a future audited SES design.

## Supply-chain gates

- `npm ci` against committed lock and integrity fields.
- Lifecycle scripts blocked by default and individually reviewed.
- `npm pack --dry-run` plus files allowlist.
- Advisory, signature, provenance, license, and repository checks.
- OIDC trusted publishing, staged release, approval, and 2FA.
- Generated SBOM and module inventory for release artifacts.
- Contract, migration, compatibility, CSP, missing-module, and uninstall tests.

Provenance proves where an artifact was built, not that its code is safe.
"Installable" never means "trusted".

## Compatibility and migration

Version the Lumen public SDK, individual capability contracts, and module-owned
data schemas separately. Before executing modules, preflight manifests, ranges,
capabilities, conflicts, schemas, and required migrations. Show the plan, back
up state, migrate incrementally, validate, and commit atomically.

## Evidence

- [npm package metadata](https://docs.npmjs.com/files/package.json/)
- [npm lockfiles](https://docs.npmjs.com/files/package-lock.json/)
- [`npm ci`](https://docs.npmjs.com/cli/commands/npm-ci/)
- [npm audit and signatures](https://docs.npmjs.com/cli/audit/)
- [trusted publishers](https://docs.npmjs.com/trusted-publishers/)
- [provenance](https://docs.npmjs.com/generating-provenance-statements/)
- [HTML iframe sandbox](https://html.spec.whatwg.org/multipage/iframe-embed-object.html)
- [Node `vm` warning](https://nodejs.org/api/vm.html)
- [Node permission-model scope](https://nodejs.org/api/permissions.html)

No plugin execution or sandbox mechanism is selected yet because no real module
contract exists. This audit constrains future design.
