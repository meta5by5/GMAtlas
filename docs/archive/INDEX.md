# Archive index

Every archived doc, its canonical successor, and why. Nothing here is
current — check the successor column for what's actually true today.
Built by `docs/adr/0042-design-doc-consolidation.md`; add a row here
whenever a future pass archives another doc (don't create a second index).

| Archived doc | Successor | Reason |
|---|---|---|
| `docs/archive/design/FACTION-CONFLICT.md` | `docs/adr/0036-faction-conflict.md` + `docs/design/LIVING-FACTION-ENGINE.md` §13 | Flat 18-field conflict schema superseded by the validated hero-path/add-depth split; demoted to an idea bank |
| `docs/archive/design/faction-conflict-integration-plan.md` | `docs/adr/0036-faction-conflict.md` | Transient build prompt; its decisions shipped as that ADR |
| `docs/archive/design/faction-turn-engine-v2-prompt.md` | `docs/adr/0035` (archived, see below) + `docs/design/living-faction-engine-build-prompt.md` (Phase 3) | Transient build prompt; pacing/missions/turn-UI shipped as that ADR, one still-open idea (decision dropdowns) carried into the new active build prompt |
| `docs/archive/design/GMAtlas_Scene_Story_Data_Model.md` | `docs/archive/design/scene-story-integration-plan.md` (its own reconciliation) + `docs/adr/0037` + `docs/adr/0041` | Generic tool-agnostic spec; its "Building this"/postponed items shipped as those two ADRs. Thread `type` taxonomy and the remaining NPC Roster fields (role/status/voice/plot_significance) never shipped — still open, flagged in the archived file's own banner |
| `docs/archive/design/scene-story-integration-plan.md` | `docs/adr/0037-foreshadowing-worldflags-npc-goal.md` + `docs/adr/0041-scene-operating-model.md` | Reconciliation plan; every "Building this" item shipped as 0037, the postponed "future NPC Roster pass" partially shipped as 0041 Phase 13b |
| `docs/archive/cleanup-07-21/design-docs-cleanup-prompt.md` | `docs/adr/0042-design-doc-consolidation.md` + `docs/_cleanup/REPORT.md` | This process's own instructions, now executed |
| `docs/archive/CLAUDE-2026-07-15.md` | `CLAUDE.md` (root) | Pre-Phase-12f/13 snapshot, archived during the 2026-07-15 doc rebaseline (pre-existing archive convention, unrelated to this pass) |
| `docs/archive/DESIGN-NEW-FUNCTIONALITY-2026-07-15.md` | `DESIGN-NEW-FUNCTIONALITY.md` (root) | Same 2026-07-15 rebaseline — its ~250-line phase-by-phase history collapsed to a short pointer in the live doc |
| `docs/archive/progress-log-2026-07.md` | `PROGRESS.md` (root) | Pre-2026-07-03 investigation notes/superseded discussion moved out of the live status ledger |

## Superseded ADRs — physically moved to `docs/archive/adr/`

**Convention changed 2026-07-23** (direct instruction, overriding this
doc's own earlier "ADRs are never physically moved" framing): an ADR
whose *design* is fully superseded, not just partially extended, moves to
`docs/archive/adr/<same filename>.md` with an ARCHIVED banner, exactly
like any other archived doc. A number is still never *reused*, but the
file itself can move. An ADR that's merely extended/reinforced (like
0036, below) stays in `docs/adr/` untouched.

| ADR | Now at | Superseded by | Scope |
|---|---|---|---|
| 0007 | `docs/archive/adr/0007-git-lfs-for-reference-library-pdfs.md` | `docs/adr/0039-reference-library-release-hosting-and-story-options.md` | Whole mechanism replaced (LFS → GitHub Releases) |
| 0031 | `docs/archive/adr/0031-swn-faction-turn-engine.md` | `docs/design/LIVING-FACTION-ENGINE.md` (via ADR 0042) | Design only — code almost entirely reused; automation depth + turn scope reversed |
| 0032 | `docs/archive/adr/0032-gmatlas-core-faction-provider.md` | `docs/design/LIVING-FACTION-ENGINE.md` (via ADR 0042) | Design only — provider seam reinforced, Reputation/Heat cut reversed |
| 0034 | `docs/archive/adr/0034-faction-membership-and-region-depth.md` | `docs/design/LIVING-FACTION-ENGINE.md` (via ADR 0042) | Design only — membership resolution extended with a tag-driven signal |
| 0035 | `docs/archive/adr/0035-faction-engine-pacing-missions-turn-ui.md` | `docs/design/LIVING-FACTION-ENGINE.md` (via ADR 0042) | Design only — turn scope + cross-faction impact reversed; retcon cut stays cancelled |
| 0038 | `docs/archive/adr/0038-location-faction-story.md` | `docs/design/LIVING-FACTION-ENGINE.md` (via ADR 0042) | Design only — presence machinery reused wholesale, Heat added alongside it |

**Not superseded, adopted wholesale, stays in `docs/adr/`:**
`docs/adr/0036-faction-conflict.md` — incorporated into `docs/design/
LIVING-FACTION-ENGINE.md` §13 by reference, not reversed. No Status-line
change, not moved.

## Rejected-alternatives companions — `docs/archive/adr/<same filename>.md`

**New pattern, 2026-07-23** (direct instruction): every *live* ADR in
`docs/adr/` (i.e. not already fully archived per the table above) has its
"Alternatives Considered" section — and any rejected-option comparison
narrated inline in Context/Decision prose — split out into a same-named
companion file in `docs/archive/adr/`, so the live ADR reads as pure
accepted architecture: what was built and why, not also what wasn't. The
live ADR's "Alternatives Considered" heading stays, now a one-line
pointer to its companion instead of the full content. Nothing is deleted
— every companion preserves the extracted text verbatim. Worked example:
`docs/adr/0030-starforged-starsmith-oracles.md` ↔ `docs/archive/adr/
0030-starforged-starsmith-oracles.md`. Not a table here (one row per ADR
would just restate "N ↔ N" 30+ times) — the rule is structural: if
`docs/adr/NNNN-*.md` exists and once had rejected content, its companion
is `docs/archive/adr/NNNN-*.md`.
