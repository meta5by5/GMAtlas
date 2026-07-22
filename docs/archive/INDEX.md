# Archive index

Every archived doc, its canonical successor, and why. Nothing here is
current — check the successor column for what's actually true today.
Built by `docs/adr/0042-design-doc-consolidation.md`; add a row here
whenever a future pass archives another doc (don't create a second index).

| Archived doc | Successor | Reason |
|---|---|---|
| `docs/archive/design/FACTION-CONFLICT.md` | `docs/adr/0036-faction-conflict.md` + `docs/design/LIVING-FACTION-ENGINE.md` §13 | Flat 18-field conflict schema superseded by the validated hero-path/add-depth split; demoted to an idea bank |
| `docs/archive/design/faction-conflict-integration-plan.md` | `docs/adr/0036-faction-conflict.md` | Transient build prompt; its decisions shipped as that ADR |
| `docs/archive/design/faction-turn-engine-v2-prompt.md` | `docs/adr/0035-faction-engine-pacing-missions-turn-ui.md` + `docs/design/living-faction-engine-build-prompt.md` (Phase 3) | Transient build prompt; pacing/missions/turn-UI shipped as that ADR, one still-open idea (decision dropdowns) carried into the new active build prompt |
| `docs/archive/cleanup-07-21/design-docs-cleanup-prompt.md` | `docs/adr/0042-design-doc-consolidation.md` + `docs/_cleanup/REPORT.md` | This process's own instructions, now executed |
| `docs/archive/CLAUDE-2026-07-15.md` | `CLAUDE.md` (root) | Pre-Phase-12f/13 snapshot, archived during the 2026-07-15 doc rebaseline (pre-existing archive convention, unrelated to this pass) |
| `docs/archive/DESIGN-NEW-FUNCTIONALITY-2026-07-15.md` | `DESIGN-NEW-FUNCTIONALITY.md` (root) | Same 2026-07-15 rebaseline — its ~250-line phase-by-phase history collapsed to a short pointer in the live doc |
| `docs/archive/progress-log-2026-07.md` | `PROGRESS.md` (root) | Pre-2026-07-03 investigation notes/superseded discussion moved out of the live status ledger |

## Superseded ADRs (Status-line pointer only — body untouched, stays in `docs/adr/`)

ADRs are never physically moved to `docs/archive/` — their number is a
stable reference. A superseded ADR's `Status` line points to its
successor instead; listed here for discoverability.

| ADR | Superseded by | Scope of supersession |
|---|---|---|
| `docs/adr/0007-git-lfs-for-reference-library-pdfs.md` | `docs/adr/0039-reference-library-release-hosting-and-story-options.md` | Whole mechanism replaced (LFS → GitHub Releases) |
| `docs/adr/0031-swn-faction-turn-engine.md` | `docs/design/LIVING-FACTION-ENGINE.md` (via ADR 0042) | Design only — code almost entirely reused; automation depth + turn scope reversed |
| `docs/adr/0032-gmatlas-core-faction-provider.md` | `docs/design/LIVING-FACTION-ENGINE.md` (via ADR 0042) | Design only — provider seam reinforced, Reputation/Heat cut reversed |
| `docs/adr/0034-faction-membership-and-region-depth.md` | `docs/design/LIVING-FACTION-ENGINE.md` (via ADR 0042) | Design only — membership resolution extended with a tag-driven signal |
| `docs/adr/0035-faction-engine-pacing-missions-turn-ui.md` | `docs/design/LIVING-FACTION-ENGINE.md` (via ADR 0042) | Design only — turn scope + cross-faction impact reversed; retcon cut stays cancelled |
| `docs/adr/0038-location-faction-story.md` | `docs/design/LIVING-FACTION-ENGINE.md` (via ADR 0042) | Design only — presence machinery reused wholesale, Heat added alongside it |

**Not superseded, adopted wholesale:** `docs/adr/0036-faction-conflict.md`
— incorporated into `docs/design/LIVING-FACTION-ENGINE.md` §13 by
reference, not reversed. No Status-line change.
