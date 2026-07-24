> Rejected-alternatives companion to `docs/adr/0039-reference-library-
> release-hosting-and-story-options.md` — split out 2026-07-23 per
> `docs/adr/0042-design-doc-consolidation.md`'s ADR-cleanup extension.
> Preserved verbatim, never deleted.

# ADR 0039 — Rejected alternatives

## From "Alternatives Considered"

- **Part A: a runtime fallback (try local, catch a failed fetch, retry the
  Release URL).** Rejected — the build-time decision is simpler, requires
  zero new runtime error-handling paths in three different consumers, and
  produces an accurate `docsManifest.js` a GM can inspect directly if
  something looks wrong.
- **Part A: overload `file` itself to sometimes be a URL.** Rejected after
  catching it mid-implementation — `refOverrides` and `data-doc-open="ref:
  ${key}"` tab keys are keyed by `file`; repointing it at a URL would
  silently orphan a campaign's saved title/tag override for that PDF the
  moment its local copy went missing. Kept `file` as pure identity, added
  `src` as the resolved fetch target instead.
- **Part A: a full LFS history rewrite to reclaim storage quota.**
  Rejected for now — destructive (force-push, rewritten SHAs), not needed
  to fix the actual reported problem (bandwidth, not storage), and
  reversible-fix-first is the safer default. Named as a possible separate
  future step, not scheduled.
- **Part B: a bring-your-own-PDF flow for non-owner visitors.** Considered
  earlier in the session, superseded by direct confirmation of the
  Release-hosted-but-low-key model — every visitor's Reference Library
  now resolves the same way, owner or not.
- **Part B: folding Story Options into `advise()` itself** (one bigger
  function instead of two new ones). Rejected — `advise()`'s single-
  observation shape is already wired to the Co-Pilot panel UI; changing
  its return shape would be a breaking change to that UI for no reason,
  when a second, additive function serves the actually-different "give me
  several ranked options" need cleanly.
- **Part B: a WHAT-tab or Co-Pilot-panel version of the same list in this
  same pass.** Deferred (the live ADR's own Phase 2 section) — the direct
  complaint was specifically about WHY.
