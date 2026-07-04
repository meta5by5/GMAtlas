# ADR 0002 — Adopt the Rules Constitution as a concrete elaboration of "genre-aware, not genre-locked"

## Status

Accepted

## Context

`requirements/initial design inputs/gameplay-goals.md` (a saved ChatGPT design discussion, since the
share link itself isn't fetchable — client-rendered pages don't survive a
plain HTTP fetch) makes one sharp architectural claim and backs it with a
concrete table:

> Saga Atlas should treat every tabletop RPG as a content provider rather
> than as the application itself.

It names six external systems as the initial "Rules Lens" roster —
Starforged, Traveller, Five Parsecs From Home, Hostile, Stars Without
Number (SWN), and Planetfall — and assigns each a specific gameplay area
it's best at (story structure, exploration, tactical combat, frontier
setting, sector generation, trade, colony management, factions, NPC
generation, discovery, horror, vehicles, crew relationships, reputation/
heat), while reserving four responsibilities — long-term campaign memory,
story continuity, rules switching, and the recommendation engine — for
Saga Atlas itself, never delegated to any ruleset. It also proposes
renaming PbtA/Starforged's "Moves" to "Activities" (system-neutral intent
descriptions), and lists a concrete set of "services" the platform should
automate rather than leave to manual GM bookkeeping: faction turns, trade,
discoveries, rumors, consequences, heat, travel, logistics, timers,
relationships, reminders, story continuity.

This is not a new principle — it's the same idea as Article III of the
Design Constitution (`docs/adr/0001`, pack 50: "Story is permanent. Rules
systems are lenses through which the story is experienced") and pack 24's
Activity Engine / Rules Lens split, already reflected in this repo's
"genre-aware, not genre-locked" rule (`CLAUDE.md`). What it adds that
wasn't there before is *specificity*: a named roster of six systems, a
concrete area-by-area assignment, and a legible line between "what a
ruleset provides" and "what the platform must never delegate."

Checked against the current codebase before deciding what to do: no code
anywhere hardcodes "Moves," "Vows," or "Bonds" as mechanics (`grep` for
these terms only turns up unrelated UI copy — "Move up/down" reorder
buttons — and oracle table content, which is data, not mechanics). So
there's no existing PbtA-specific terminology to migrate away from; the
principle is already structurally honored, just not yet made *visible* or
*concrete*.

## Decision

1. **Adopt the principle, not a rewrite.** No renaming of working code to
   match this document's vocabulary — same posture as ADR 0001. The six
   named systems and four platform-owned responsibilities are recorded as
   data (`src/data/rulesConstitution.js`: `RULES_PROVIDERS`,
   `GAMEPLAY_AREAS`), not hardcoded into any engine.

2. **Surface it, don't build it yet.** A read-only "Rules Constitution"
   table was added to Settings (`rulesConstitutionSection()` in
   `src/ui/drawers/index.js`) so a GM can see the intended division of
   labor today. It is explicitly *not* an Activity → Rules Lens
   recommender — that's Phase 9 (Activity-driven gameplay), already on the
   roadmap before this document arrived. Building the recommender now would
   be scope creep against a design review; the data model this ADR
   establishes is what Phase 9 will consume when its turn comes.

3. **Status-tag each provider honestly.** `RULES_PROVIDERS` marks each
   system's actual integration state (`integrated`, `default genre`,
   `not yet integrated`, `core`) rather than presenting all six as equally
   "supported" — Starforged and Five Parsecs From Home have character
   sheets (Phase 4); Planetfall has the Colony drawer; Hostile is the
   default genre and oracle-table flavor; Traveller and Stars Without
   Number have no data authored at all. (Correction, 2026-07-03: this
   entry originally said "Traveller is reference PDFs only" — the ruleset
   library review that day found no Traveller sourcebook anywhere in
   `assets/docs/`, so its status moved from `'reference only'` to
   `'not yet integrated'` in `rulesConstitution.js`, matching SWN. Per the
   "newer wins" rule in `CLAUDE.md`, this is the corrected, current claim —
   don't reintroduce "reference PDFs only" for Traveller.)

4. **Fold "services to automate" into the existing roadmap rather than
   inventing a parallel one.** Faction turns, trade, and colony automation
   map onto the original Design Constitution's "Living World Engine" (pack
   38) and "Scenario Engine" (pack 36), already deferred as long-horizon,
   lowest-priority work per pack 66. Heat/consequences/timers overlap
   directly with Phase 6's Narrative Trackers item (already in progress —
   see `PROGRESS.md`). Rumors and reminders don't yet have a home; noted in
   `DESIGN-NEW-FUNCTIONALITY.md`'s Phase 10 rather than given a new phase
   number, since none of them are ready to scope concretely yet.

5. **"Moves → Activities"**: no code change needed today (confirmed nothing
   hardcodes Moves), but recorded as a naming constraint for Phase 9 — when
   the Activity-driven HOW workspace is built, it must use activity verbs
   (Investigate, Negotiate, Travel, ...), never ruleset-specific move names.

## Alternatives Considered

- **Build the Activity → Rules Lens recommender now, using this document as
  the spec.** Rejected: Phase 9 isn't next in the priority order (pack 66:
  continuity > workflow > graph depth > storage > recommendations > UX >
  integrations > new features), and this document didn't change that
  ordering — it gave Phase 9 better source material, not new urgency.
- **Add Traveller/SWN as full `data/rulesets.js` entries now** (with
  character templates like Starforged/5PFH have). Rejected: this document
  positions Traveller and SWN primarily as *setting/procedural-generation*
  providers (sector generation, faction turns, trade tables), not
  character-sheet providers — forcing them into the existing
  character-template shape would misrepresent what they're actually for.
  `rulesConstitution.js` records the *intent*; the *data* (sector tables,
  faction-turn mechanics) is unauthored future work, honestly marked as such.
- **Ignore the document as redundant with Article III.** Rejected: the
  concrete area-by-area table and the "reserved to Saga Atlas" list are
  genuinely new information worth keeping queryable, even though the
  underlying principle isn't new.

## Consequences

**Positive:** the "genre-aware, not genre-locked" principle now has a
concrete, inspectable roster instead of being purely aspirational; a future
contributor building Phase 9 has a data file to start from instead of
re-deriving the area/provider mapping from a saved chat transcript.

**Negative / risk:** `rulesConstitution.js`'s provider list is a design
intention, not a commitment — Traveller and SWN having zero authored data
today means the table currently promises more than the app delivers for
those two systems (honestly flagged via `status`, but still worth
remembering before pointing a user at it as a feature list).

## Related Packs / Documents

`requirements/initial design inputs/gameplay-goals.md` (source), `docs/adr/0001` (Article III,
which this elaborates), packs 7/24 (Rules Lens / Activity Engine), pack 38
(Living World Engine — where faction-turn/trade automation eventually
belongs), pack 66 (backlog prioritization — why this doesn't reorder the
roadmap).
