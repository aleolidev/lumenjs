# Experimental release policy

Status: candidate policy; no release has occurred.

## Channel and support

- The first candidate is `lumenjs@0.1.0` under npm dist-tag `next`.
- Only the `lumen` executable is a consumer surface. There is no public engine
  import, module API, schema compatibility guarantee, or stable export format.
- Node.js 22 is the only declared runtime line for this candidate.
- Support is best effort for the newest `0.1.x` release on `next`. A later
  candidate may change experimental commands and formats with documented notes.

## Release gate

An authorized release must come from the exact public Git repository. The
manual `publish.yml` workflow requires the literal confirmation
`publish-lumenjs@0.1.0`, the `npm-production` environment, portable CI, and the
clean tarball consumer check before `npm publish --tag next`. After the initial
package exists, npm Trusted Publishing should authorize that exact workflow and
generate provenance; no long-lived npm token belongs in GitHub or this
repository.

## Failure and rollback

If a candidate is defective:

1. stop or reject any staged release before approval;
2. move `next` back to the last verified version when one exists;
3. deprecate the defective version with a concise actionable message;
4. publish a verified patch instead of overwriting an immutable npm version;
5. use npm unpublish only when registry policy and a security/legal incident
   require it; and
6. record the affected versions, consumer remedy, and compatibility impact.

Cloudflare Pages rollback is independent: restore the preceding immutable
deployment, then verify service-worker update and clean-origin recovery on the
real HTTPS origin.
