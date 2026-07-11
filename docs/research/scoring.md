# Repository scoring

Scores compare repositories for one stated LumenJS need. They are not global
quality rankings and must be accompanied by evidence and confidence.

## Scale

| Score | Meaning |
| ---: | --- |
| 0 | Not applicable or no usable evidence. |
| 1 | Poor fit; severe gaps or unacceptable risk. |
| 2 | Limited fit; useful ideas but substantial mismatch. |
| 3 | Credible fit; important gaps or adaptation cost remain. |
| 4 | Strong fit; demonstrated quality with manageable limitations. |
| 5 | Exceptional fit; authoritative or best demonstrated reference for this need. |

Half points are allowed when evidence falls clearly between anchors. A score
without a linked repository artifact is provisional.

## Dimensions

Each candidate is evaluated independently on:

| Dimension | Question |
| --- | --- |
| Relevance | Does it directly address the stated LumenJS need? |
| Technical quality | Are responsibilities, invariants, and failure behavior clear? |
| Simplicity | Can the useful idea be understood and adopted without disproportionate machinery? |
| Extensibility | Are boundaries explicit and combinations supported without patching internals? |
| Authoring/DX | Can creators and developers use, inspect, and diagnose it effectively? |
| Verification | Are tests, fixtures, benchmarks, CI, and reproducible examples meaningful? |
| Performance | Is performance measured and appropriate for the intended workload? |
| Portability | Is behavior validated across relevant browsers, devices, and environments? |
| Maintenance | Are releases, compatibility, documentation, and ownership healthy? |
| Adoption cost | How much code, coupling, dependency weight, and migration risk would adoption add? |
| Legal/provenance | Are license, ownership, assets, and redistribution sufficiently clear? |

`Adoption cost` and `Legal/provenance` are scored positively: 5 means low risk
or cost; 1 means high risk or cost.

## Confidence

| Confidence | Required evidence |
| --- | --- |
| Low | README, marketing, community reports, or incomplete inspection. |
| Medium | Source structure, license, tests, releases, and relevant implementation files inspected. |
| High | Pinned revision audited, important tests run or reproducible artifacts inspected, and conclusions cross-checked. |

Repository-level web inspection normally reaches medium confidence at best.
High confidence generally requires a local pinned checkout and execution.

## Decision labels

| Label | Meaning |
| --- | --- |
| Primary reference | Best current evidence to guide a LumenJS design area. |
| Secondary reference | Useful contrast or specialist source. |
| Spike candidate | Worth a focused experiment before deciding. |
| Dependency candidate | Potential direct dependency, pending high-confidence validation. |
| Concept only | Learn from behavior or ideas; do not adapt implementation. |
| Rejected | Known mismatch, maintenance, license, provenance, or complexity problem. |

No repository becomes a dependency candidate solely from a weighted score.

## Weighting profiles

Different needs use different weights. Unmentioned dimensions retain weight 1.

### Runtime core or renderer

- Technical quality, performance, portability, verification: weight 2.
- Simplicity, adoption cost: weight 1.5.

### Authoring tool

- Authoring/DX, extensibility, maintenance: weight 2.
- Portability, verification, adoption cost: weight 1.5.

### Data or simulation library

- Technical quality, verification, extensibility, legal/provenance: weight 2.
- Performance and maintenance: weight 1.5.

## Audit record

Every source-level scorecard records:

- repository and canonical URL;
- revision, tag, and audit date;
- declared license and relevant license boundaries;
- need being evaluated;
- evidence links to implementation, tests, CI, docs, and releases;
- dimension scores and confidence;
- strengths, failure modes, and unverified assumptions;
- decision label and concrete next validation step.

Use exact commit links when possible. A branch URL is acceptable only as an
explicitly temporary pointer.
