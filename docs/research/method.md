# Research method

## Goal

Build a broad, traceable body of evidence for what LumenJS needs to support and
which prior work is trustworthy enough to influence it.

"All projects" is treated as a systematic discovery goal, not a literal claim
of completeness. Private, removed, unindexed, and unknown projects cannot be
enumerated reliably.

## Evidence order

Prefer sources in this order:

1. Maintainer repositories, documentation, websites, release notes, and demos.
2. Published source code at a pinned revision.
3. Maintainer announcements and community documentation.
4. Independent reviews and community reports.

Material claims should use the strongest available source. Community claims
must not silently become facts.

## Inclusion

Include a reference when it contributes evidence in at least one dimension:

- historical or community impact;
- unusual breadth, depth, or polish;
- a distinctive gameplay or authoring system;
- strong engineering, testing, tooling, or documentation;
- a useful failure, constraint, or maintenance lesson.

Popularity alone is insufficient, and low popularity is not a reason to reject
a technically strong specialist project.

## Reference record

Each evaluated reference should eventually record:

- canonical name, URL, category, and discovery date;
- pinned version or revision when source code is inspected;
- activity and maintenance status;
- demonstrated capabilities and relevant implementation areas;
- strengths, limitations, and confidence in the assessment;
- license, provenance concerns, and allowed kind of influence;
- capabilities for which it is a candidate reference.

## Evaluation dimensions

Score dimensions independently rather than hiding trade-offs in one number:

- relevance;
- functional depth;
- technical quality;
- simplicity and comprehensibility;
- extensibility and composability;
- authoring experience;
- testing and observability;
- performance and portability;
- documentation and maintenance;
- dependency cost;
- license and provenance risk;
- confidence in available evidence.

Scores compare candidates within a capability. They are not universal quality
rankings.

## Legal separation

Classify influence as one of:

- product reference only;
- technical study;
- independently reimplemented concept;
- adapted implementation;
- directly reused code or asset.

The final two require explicit license compatibility, attribution, provenance,
and distribution review. A repository license does not establish that every
asset or dataset in the repository was legitimately contributed.

## Process

1. Expand the capability taxonomy from shipped projects.
2. Discover references using multiple query families and citation chaining.
3. Deduplicate forks, mirrors, abandoned copies, and derivative projects.
4. Evaluate candidates per capability and record rejected approaches.
5. Pin strong technical references to revisions.
6. Assign primary and secondary references per capability.
7. Validate important conclusions with prototypes before settling architecture.

Search queries, dates, and coverage gaps will be recorded when the large-scale
repository sweep begins.
