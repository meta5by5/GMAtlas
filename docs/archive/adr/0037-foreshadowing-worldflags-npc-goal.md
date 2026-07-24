> Rejected-alternatives companion to `docs/adr/0037-foreshadowing-
> worldflags-npc-goal.md` — split out 2026-07-23 per `docs/adr/0042-
> design-doc-consolidation.md`'s ADR-cleanup extension. Preserved
> verbatim, never deleted.

# ADR 0037 — Rejected alternatives

## From "Alternatives Considered"

- **The spec's full branching scene graph.** Rejected — see the live
  ADR's Context section. Flagged explicitly rather than silently
  ignored, per this repo's "no two docs get to disagree about current
  reality" rule: `docs/archive/design/scene-story-integration-plan.md`
  records the mismatch so a future reader doesn't re-propose it without
  re-deriving why it doesn't fit.
- **Linking Foreshadowing/World State Flags to a scene or journal entry
  by id.** Rejected — no stable scene identity existed to link to at the
  time; free-text/`@mention` covers the same need without inventing one.
- **A fuller NPC Roster (role/status/disposition/voice notes) up front.**
  Rejected *at the time* as unvalidated scope — `currentGoal` alone
  answered the concrete "what does this NPC want" question the spec
  raised. **Update:** disposition (plus Motivation/Threat Rank/
  Challenges/Opportunities) shipped later as scene-scoped fields in
  `docs/adr/0041-scene-operating-model.md` Phase 13b — a different shape
  than a permanent NPC field (scene-scoped, not per-entity), but the same
  underlying need this alternative named. `role`/`status`/`voice notes`
  remain unbuilt.
- **A Co-Pilot signal surfacing the oldest open Foreshadowing entry**
  (mirroring `hotFaction`/`threadUnderPressure`). Postponed, not built as
  of this writing — still open.
