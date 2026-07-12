# Phase 5 owner and external-evidence checklist

Status: updated on 2026-07-12 after approving Apache-2.0, npm as the package
channel, and Cloudflare Pages as the hosting target. This document authorizes
candidate preparation, not publication, deployment, compatibility promises,
device claims, or operated services.

The local distribution increments are tracked in
`phase-5-distribution-progress-audit.md`. The following roadmap outcomes cannot
be completed from repository evidence alone.

| Outcome | Required owner/external input | Minimum evidence before claiming completion |
| --- | --- | --- |
| LumenJS licensing | Apache-2.0 approved | Root license, package/lock metadata, notices, README, and dependency/content review are locally aligned |
| Public package identity | `lumenjs@0.1.0` and `github.com/aleolidev/lumenjs` selected; no registry reservation yet | Registry ownership, Trusted Publishing after initial package bootstrap, clean consumer fixture, explicit approval, and rollback/deprecation plan |
| Public static hosting | Cloudflare Pages selected; build and headers prepared without an account connection | HTTPS deployment proves MIME types, headers, relative navigation, service-worker scope, cache/update/offline behavior, rollback, and clean-origin recovery |
| Installable PWA | Creator supplies owned/provenanced application icons and intended app metadata | Valid manifest, 192/512 icon pipeline, install/update tests on target browsers and devices |
| Physical-device coverage | Owner funds and prioritizes OS/browser/device/input/audio tiers | Recorded real sessions for touch, viewport/safe area, gamepad/remapping, audio routing/interruption, storage/offline, WebGPU device-loss recovery, performance, and thermal/battery as applicable |
| Assistive technology | Owner selects supported browser/OS/AT combinations | Keyboard and screen-reader sessions with findings and remediation; semantic emulation alone is insufficient |
| Long-lived compatibility | At least one independently maintained creator project and a chosen support window | Upgrade fixtures, deprecation/migration policy, missing-module behavior, supported-version matrix |
| Artifact authenticity | Owner selects release authority, keys/OIDC, retention, and incident process | Signed release provenance verified by a clean consumer; co-located hashes alone are insufficient |
| Operated services | Named sustainable owner for privacy, moderation, abuse, failure, cost, and longevity | Service specification, data lifecycle, threat/failure review, monitoring, shutdown/export plan |

## Safe next actions after decisions

1. Write a narrow specification for only the selected outcome.
2. Add original/provenanced fixtures and failure cases before implementation.
3. Keep publication and credentials behind explicit approvals.
4. Run the portable CI, package-install, relevant real-device or service gates,
   and a requirement-by-requirement completion audit.

Until then, the correct state is the unpublished public experimental candidate
documented by the progress audit, not a partially implied release or support
promise.
