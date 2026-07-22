# ADR 0042 — Design-doc cleanup: consolidate the Living Faction Engine design

## Status

Accepted. Documentation-only — no application source changed as part of
this decision (verification was read-only; see `docs/_cleanup/drift-
report.md` for what was checked).

## Context

By 2026-07-21 the faction subsystem's design history was spread across six
ADRs (0031/0032/0034/0035/0036/0038), three superseded/partial design docs
in `docs/design/` (`FACTION-CONFLICT.md`, `faction-conflict-integration-
plan.md`, `faction-turn-engine-v2-prompt.md`), and a separate scope
document (`Additional scope concepts.txt`) that had never been reconciled
against the shipped ADRs — it asked for five behavioral shifts that
directly reverse specific, deliberate scope cuts those ADRs recorded (see
below). Reading any one of these in isolation gave an incomplete or
contradictory picture of "what the faction engine actually does" and "what
it's supposed to do next."

Separately, Phase 12f (ADR 0040, 2026-07-16) retired the five WHO/WHERE/
WHAT/WHY/HOW workspace tabs in favor of a single Story Dashboard + an
always-visible Co-Pilot panel. Every ADR written before that date which
described a faction UI surface as living "on the WHO tab" / "on the WHERE
tab" (0031, 0032, 0038) became stale about *where* that behavior lives,
without becoming wrong about *what* it does.

This ADR records a documentation-reconciliation pass run against
`docs/cleanup-07-21/design-docs-cleanup-prompt.md`'s instructions: build a
full manifest of every design artifact in the repo, verify load-bearing
claims against the actual code, resolve the conflicts between the six
faction ADRs and the scope document, and produce one canonical faction
design doc — without deleting or rewriting any prior ADR's decision body.

## Decision

1. **New canonical faction spec**: `docs/design/LIVING-FACTION-ENGINE.md`
   (promoted from `docs/cleanup-07-21/LIVING-FACTION-ENGINE-CONSOLIDATED-
   DESIGN.md`, verified against `docs/_cleanup/drift-report.md` before
   promotion — no unverified claim was carried forward as fact). It
   describes the faction subsystem's **current, verified shipped
   behavior** and the **agreed forward design**, clearly separated, and is
   the authoritative reference going forward — supersedes ADRs 0031, 0032,
   0034, 0035, and 0038 as the *design* authority (their *code* is almost
   entirely reused, per the new doc's §2).
2. **ADR 0036 (Faction Conflict) is adopted wholesale, not superseded** —
   its hero-path/add-depth split, validated against SWN/OSR/Blades-in-the-
   Dark community sentiment, stands unchanged and is incorporated into the
   canonical spec by reference (§13).
3. **Six conflict resolutions**, precedence order (from `Additional scope
   concepts.txt` — the controlling statement of forward intent — over an
   older shipped ADR, over the newest ADR, over an older ADR, with
   `CLAUDE.md`'s architectural law absolute throughout): automation depth
   (auto-decide + editable dropdowns, not whole-draft accept), cross-
   faction impact (two-sided frozen diff, reversing the 0031/0035 cut),
   turn scope (system-wide with an off-world news cascade, reversing the
   0035 cut), Reputation/Heat (a new per-faction `partyStanding` + `heat`
   fields, wired to the *existing* ambient `context.what.reputation`
   rather than duplicating it), NPC↔faction binding (tag-driven membership
   added alongside the existing `member_of` edge), and the flat
   `FACTION-CONFLICT.md` schema (stays rejected in favor of ADR 0036's
   validated split). Full detail and citations: `docs/_cleanup/
   conflicts.md`.
4. **`Additional scope concepts.txt` is preserved** at `docs/design/
   additional-scope-concepts.txt` — every quote attributed to it in the
   canonical spec was independently checked against this file (word for
   word, two trivial typo-corrections aside) before this ADR was accepted.
5. **`docs/design/living-faction-engine-build-prompt.md`** (promoted from
   the same `cleanup-07-21` batch) is kept as an active, not-yet-built
   implementation prompt for the six phases the canonical spec describes.
6. **Research provenance preserved**: `docs/design/RESEARCH-AND-
   DECISIONS.md` (new) carries forward the community-sentiment findings
   and other supplemental research that justified ADR 0036's simplification
   and other design choices, so archiving their host docs loses nothing.
7. **W-tab surface drift**: ADRs 0031/0032/0038 are not rewritten (ADR
   bodies are immutable, `CLAUDE.md` §0.3/repo convention) — their "WHO/
   WHERE/WHAT tab" language is left as the accurate historical record of
   what shipped *at the time*. `docs/design/LIVING-FACTION-ENGINE.md`
   describes every current UI surface in Dashboard-section/Co-Pilot terms
   only, and is the doc a reader should trust for current vocabulary.
8. **One additional supersession found during discovery, outside the
   faction cluster**: ADR 0007 (Git LFS for the Reference Library) is
   superseded by ADR 0039 (Release-hosted assets) — LFS bandwidth ran out
   in practice. Recorded here since it surfaced during this same pass,
   even though it isn't a faction-subsystem item.

## Archived (moved, not deleted — `docs/archive/<original-path>`, banner +
`docs/archive/INDEX.md` entry each)

- `docs/design/FACTION-CONFLICT.md` — superseded by ADR 0036 §13 / the
  canonical spec §13; demoted to an idea-bank for "Add depth" fields.
- `docs/design/faction-conflict-integration-plan.md` — its decisions
  shipped as ADR 0036.
- `docs/design/faction-turn-engine-v2-prompt.md` — the "clean turn-
  processing UI" it drove shipped as ADR 0035; its still-open per-decision-
  dropdown idea is carried into `docs/design/living-faction-engine-build-
  prompt.md` Phase 3.
- `docs/cleanup-07-21/design-docs-cleanup-prompt.md` — this pass's own
  instructions, now executed; `docs/_cleanup/REPORT.md` is the durable
  record of what it produced.

## Alternatives considered

- **Rewrite the six faction ADRs in place to reflect the new design.**
  Rejected — violates this repo's own "ADRs are immutable history" rule
  (`CLAUDE.md`, and this cleanup's own ground rule 0.3); an ADR records a
  decision *at the time it was made*, and rewriting 0031's body to
  describe two-sided impact would make it lie about what actually shipped
  in July.
- **Leave the six ADRs standing with no consolidation.** Rejected — a
  reader hitting 0031 first has no way to discover that 0032/0034/0035/
  0038 modify its behavior, or that a scope document exists which reverses
  specific cuts it made. The fragmentation was the actual problem this ADR
  fixes.
- **Delete the superseded `docs/design/` docs instead of archiving.**
  Rejected outright by the cleanup's own ground rules (archive, never
  delete — git history is a backstop, not the primary provenance record).

## Consequences

- A reader of any faction ADR (0031/0032/0034/0035/0038) should now check
  `docs/design/LIVING-FACTION-ENGINE.md` for current status before trusting
  the ADR's own description of what's shipped or what's next — the ADRs
  answer "why was this decided," the canonical spec answers "what's true
  now and what's coming."
- `docs/_cleanup/manifest.md`/`drift-report.md`/`conflicts.md` are the
  working notes behind this ADR; kept in the branch history, not part of
  the canonical doc set going forward (they answer "how was this
  verified," not "what's the current design").
- Future faction-subsystem work (the six build-prompt phases) should update
  `docs/design/LIVING-FACTION-ENGINE.md`'s "current reality" section as
  each phase ships, the same way `docs/adr/0040`/`0041` were updated
  in-place with "Implemented" markers as their own phases landed — this
  keeps the canonical doc from drifting the same way the six original ADRs
  did.

## Related

`docs/adr/0031-swn-faction-turn-engine.md`, `0032-gmatlas-core-faction-
provider.md`, `0034-faction-membership-and-region-depth.md`,
`0035-faction-engine-pacing-missions-turn-ui.md`,
`0036-faction-conflict.md`, `0038-location-faction-story.md` (all
partially or wholly consolidated), `0040-story-dashboard.md` (the W-tab
retirement this drift report cross-checks against), `0041-scene-
operating-model.md` (the Bystanders slot the canonical spec reuses),
`0007`/`0039` (the LFS→Releases supersession found during discovery).
