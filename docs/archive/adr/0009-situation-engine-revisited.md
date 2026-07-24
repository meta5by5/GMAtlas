> Rejected-alternatives companion to `docs/adr/0009-situation-engine-
> revisited.md` — split out 2026-07-23 per `docs/adr/0042-design-doc-
> consolidation.md`'s ADR-cleanup extension, so the live ADR reads as pure
> accepted architecture. This file is never itself a decision record; it
> holds the "what was considered and rejected, and why" detail for the ADR
> above, preserved verbatim rather than deleted.

# ADR 0009 — Rejected alternatives

## From "Alternatives Considered"

- **Fold Expedition dials into `context.what`'s existing campaign-wide
  dials** (a sixth/seventh/eighth slider next to Resources/Reputation/
  Stress). Rejected — those dials are deliberately campaign-global (one
  value for the whole campaign at a time); an expedition is scoped to one
  Thread, and multiple expeditions could plausibly run in parallel (a
  survey team in the field while a separate salvage run is also underway).
  A per-Thread home is the only one of the two shapes that doesn't break
  under that case.
- **Store Discovery Quality's category as a field on Lore/discovery
  entities**, then have the Co-Pilot read it back later. Rejected — this is
  exactly the framing ADR 0008 already declined and the user redirected
  away from just now; a stored classification answers "what did this
  discovery already turn out to mean," not "what should happen next,"
  which is the actual ask.
- **Build Noncombat Resolution as a real resolution mechanic** (an explicit
  "choose your approach, then roll" UI competing with each ruleset's own
  skill list). Rejected for the same reason ADR 0008 originally gave (no
  dice-mechanic gap exists) — the redirected framing (a suggestion lens,
  not a resolution step) avoids inventing mechanics a ruleset already owns.
- **Give "Continue Story" the lens picker too, instead of only "What
  Happens Next?"** Rejected — the whole point of having two buttons is that
  one stays the fast, no-input path (today's unchanged behavior) and the
  other becomes the deliberate, GM-steered path; collapsing them back to
  identical behavior with an extra step would just relocate the "these do
  the same thing" problem instead of fixing it.

## Rejected option narrated inline in the original Decision section

The live ADR's Decision item 1 originally read: "**Expedition Structure —
reversed.** The user's direction: *"treat those four as trackers and not
lifecycle states"* — explicitly rejecting ADR 0008's "fold it into a
Thread's `Escalating` status" alternative **in favor of real, separate
numeric dials**. Scoped as: ..." The live ADR now states only that the
user's direction was real, separate numeric dials, not a stored lifecycle
status; the comparison against the rejected ADR 0008 alternative (bolded
above) lives here.
