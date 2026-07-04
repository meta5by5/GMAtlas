# ADR 0001 — Adopt the Design Constitution, reconcile against the current build

## Status

Accepted

## Context

`requirements/` contains a 77-document "Saga Atlas Design Constitution"
(`design-principles-pack-01.md` through `-77.md`) plus a condensed
`SagaAtlas-Design-Constitution.zip` and a `design-principles-final-summary.md`.
This is a comprehensive, long-range vision for the product — naming and
speccing subsystems (Storage Kernel, Context Graph, Story Engine, Decision
Engine, Campaign Intelligence Engine, Activity Engine, Event Bus, Campaign
Director, Scenario Engine, Living World Engine), a full domain object model,
engineering process standards (ADRs, fitness functions, a testing pyramid,
documentation architecture), and deep narrative-design theory (a 7-state
Thread lifecycle, a campaign memory model, narrative patterns).

The current codebase (Phases 0–5) implements a real subset of this vision —
one campaign document, a pure domain layer, a three-tier UI, oracle tables,
entity relationships, statblocks, a Co-Pilot — but at a much smaller scale
than the corpus describes, and using its own (simpler, already-tested)
architecture in places where the corpus proposes something more elaborate
(e.g. a single `store.subscribe()` full-re-render model vs. the corpus's
typed Event Bus with partial/reactive updates).

The corpus itself is not fully internally consistent — it reads as having
been assembled across many sessions. Concretely, the four parallel research
passes that read all 77 packs for this ADR found:

- **Three different "ending" packs** (42, 50, 60) each read as an intended
  capstone/terminus, with packs beyond each functioning as later appendices.
- **No single canonical story-hierarchy** — Pack 02/05 use
  Campaign→Act→Mission→Scene→Beat→Moment; Pack 06 inserts an Objective level
  between Mission and Scene and drops Moment; Pack 12 drops Moment and adds
  no Objective. Four packs, three different hierarchies.
- **Two different Consequence state-machine vocabularies** — Pack 06:
  Pending→Escalating→Active→Resolved→Forgotten; Pack 13: Dormant→
  Building→Active→Escalated→Resolved. Same subsystem, different states.
- **"Context Graph" and "Knowledge Graph" drift** — Pack 55's glossary
  defines them as two distinct subsystems (Context Graph = live network of
  what's *currently relevant*; Knowledge Graph = searchable reference
  network spanning entities/journal/PDFs/maps/rules), but several other
  packs (50, 53) use "Context Graph" in ways that span both definitions.
- **Recommendation-subsystem naming drift** — "Campaign Intelligence
  Engine," "Decision Engine," "Story Engine," and "Co-Pilot" are each given
  their own pack and their own responsibilities, but pack 37's pipeline
  (Context Graph → Story Engine → Campaign Intelligence Engine → Decision
  Engine → Mission Control) is the only place that disambiguates how they
  relate; packs 25, 33, and 39 use them more loosely, closer to synonyms.
- **A genuine tension, not just drift**: Pack 35 recommends iframes as a
  valid "Level 2 — Embedded View" integration pattern generally; the
  existing `CLAUDE.md` (predating this review) has a hard rule against
  iframes specifically for Crew Link/Shipyard companion tools, citing an
  Android failure mode. Pack 11 separately (and specifically) recommends an
  embedded/iframe PDF viewer, which the codebase had already implemented in
  Phase 5 before this review — so the "PDF iframe" half of this was already
  resolved in practice; only the general-purpose "Level 2" framing needed a
  decision (see below).

Given the corpus is ~7,600 lines describing a mature end-state product,
implementing all of it now was explicitly out of scope for this review —
the task was to reconcile the design (terminology, priorities, and any
direct conflicts with existing hard-won constraints), publish a roadmap,
and recommend next steps, not to build Phase 6 immediately.

## Decision

1. **Adopt the ten Articles (pack 50) as the top-level governing
   principles**, cited in `CLAUDE.md`. Where a specific pack's mechanism
   conflicts with something already built, the Articles (not the pack) are
   the tie-breaker.

2. **Do not rename existing modules/concepts to match corpus terminology.**
   `src/domain/entities.js` stays "entities.js," not "ContextGraph.js." A
   terminology map lives in `CLAUDE.md` so a reader can translate between
   the two vocabularies. Renaming working, tested code to match a
   still-partially-inconsistent external spec is not worth the churn or
   risk.

3. **Keep Context Graph and Knowledge Graph merged** (as `entities.js` +
   `documents.js` already effectively do) rather than splitting them into
   two formal subsystems. Pack 55's split is a Level 3+ maturity concern
   (per pack 39's ladder); this repo is at Level 1–2. Revisit if/when
   Universal Search (Phase 8 on the roadmap) needs the distinction.

4. **Do not adopt the full 6-level story hierarchy** (Act/Mission/
   Objective/Scene/Beat/Moment) or a formal Consequence entity/state
   machine yet. The current breadcrumb (scene-level, capped at 6 entries)
   and the `threat`/`mystery` numeric dials are deliberately simpler and
   already shipped/tested. **If/when a formal Consequence entity is built**
   (see roadmap Phase 6), adopt pack 13's state names — Dormant → Building →
   Active → Escalated → Resolved — because "Dormant" then matches Thread's
   own Dormant state (pack 77), giving one consistent vocabulary across the
   two systems instead of importing pack 06's separate five-state
   vocabulary too.

5. **Clarify, don't relitigate, the iframe rule.** Two different surfaces,
   two different rules, both correct: (a) first-party PDF/document viewing
   — an in-app iframe panel is fine and was already built this way in
   Phase 5, matching pack 11; (b) third-party companion tools (Crew Link,
   Shipyard) — new tab only, never embedded, per the documented Android
   failure mode. Pack 35's general "Level 2 — Embedded View" framing is
   accepted for case (a) and explicitly not extended to case (b).

6. **Do not build an Event Bus now.** The existing `store.subscribe()` /
   full-re-render model is simpler, already tested, and has not hit any of
   pack 32's named "Refactor Triggers" (the same bug reappearing, state
   existing in multiple places, features requiring workarounds). Adopting
   a typed pub/sub with ordering/batching/partial-reactive-update
   guarantees is a legitimate future upgrade, not a current necessity —
   tracked as a watch item, not a roadmap phase.

7. **Adopt an ADR practice going forward** (pack 51's template, this
   document being the first instance) for architecturally significant
   changes, and reprioritize the open backlog using pack 66's ranking
   (campaign continuity > Mission Control workflow > Context Graph >
   storage reliability > story recommendations > UX refinements >
   integrations > new features) — see `PROGRESS.md` for the resulting
   phase plan.

## Alternatives Considered

- **Rewrite the domain layer to match the corpus's object model and engine
  names literally** (Storage Kernel, Context Graph class, Story Engine
  class, etc.). Rejected: high risk/high churn for a rename with no
  behavior change, and the corpus itself isn't consistent enough to copy
  verbatim without first making its own internal decisions (which this ADR
  now makes for our purposes only).
- **Ignore the corpus and keep the existing architecture unchanged.**
  Rejected: the corpus contains genuinely high-value, concrete features not
  yet built (richer Threads, Narrative Trackers, session recap/Narrative
  Recall, Universal Search) that directly serve the existing "Frictionless
  Empowerment" principle this repo already commits to — treating 7,600
  lines of design work as inert reference material would waste it.
- **Implement the full corpus immediately as one large phase.** Rejected:
  disproportionate to the request (a design review + roadmap, not a build
  sprint) and against the corpus's own guidance (pack 58: "architecture
  evolves by refinement... not replacement"; pack 66: prioritize
  continuity work before new features).

## Consequences

**Positive:** a clear, written translation layer between two vocabularies
prevents future confusion (mine or a contributor's) about whether "the
Context Graph" or "the Story Engine" exists in this codebase. The
prioritized roadmap (`PROGRESS.md`) gives concrete, traceable next steps
instead of "77 packs of things we could do." The ADR practice gives future
architecturally-significant decisions a paper trail, per pack 51/59.

**Negative / risk:** the terminology map will drift out of date as the
codebase evolves faster than this document is updated — treat it as a
snapshot, verify against `src/` before trusting it (same caution `CLAUDE.md`
already asks for regarding the corpus itself). Choosing not to build the
Event Bus or split Context/Knowledge Graph now means a future contributor
proposing either should re-derive whether a Refactor Trigger has actually
fired, rather than assuming this ADR's "not yet" is still current.

## Related Packs

01 (vision), 39 (maturity model — used to calibrate scope), 50 (the ten
Articles), 51 (this ADR's own template), 55 (glossary — Context Graph vs.
Knowledge Graph), 58 (evolution by refinement), 63 (fitness functions —
referenced from `CLAUDE.md`'s non-negotiable-rules section), 66 (backlog
prioritization — drives the `PROGRESS.md` phase ordering), 35 (iframe
integration levels), 11 (PDF integration — already implemented pre-review).
