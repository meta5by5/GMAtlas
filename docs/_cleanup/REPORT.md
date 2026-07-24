# Design-doc cleanup — final report

Branch: `docs/cleanup-reconciliation`. Not merged to `main` — left for
human review, per `docs/cleanup-07-21/design-docs-cleanup-prompt.md` §0.1/
§8 (that prompt is itself archived at `docs/archive/cleanup-07-21/
design-docs-cleanup-prompt.md` now that it's been executed).

## What changed

**New canonical doc set:**
- `docs/design/LIVING-FACTION-ENGINE.md` — the faction subsystem's
  authoritative design, promoted from the `docs/cleanup-07-21/` input
  batch, verified against real code before acceptance, header rewritten
  to correct one internal inconsistency (it no longer claims to
  "supersede" ADR 0036, which is adopted wholesale — see conflicts.md #6).
- `docs/design/living-faction-engine-build-prompt.md` — kept as an active,
  not-yet-built implementation prompt (six phases), promoted from the same
  input batch, cross-references corrected to the new file locations.
- `docs/design/additional-scope-concepts.txt` — the primary scope-intent
  source, preserved verbatim (moved from `docs/cleanup-07-21/`, originally
  supplied mid-pass after I flagged it was missing — see "Blocker
  encountered" below).
- `docs/design/RESEARCH-AND-DECISIONS.md` — new provenance log; 7 findings
  extracted from ADR 0032/0036's own text (SWN/OSR community sentiment,
  Blades progress-clock precedent, the "redesigned twice" playtesting
  evidence, Gnome Stew's abstraction guidance, the mechanics-vs-expression
  copyright reasoning, the personal-use-vs-public-deploy distinction, and
  the oracle-content-sourcing convention), each with its source and which
  decision it justifies.
- `docs/adr/0042-design-doc-consolidation.md` — new ADR recording this
  cleanup itself: what's superseded, the six conflict resolutions and
  their authorities, what was archived.

**ADR Status-line edits (bodies untouched — immutable history):**
- `0007` → superseded by `0039` (LFS → Releases; found during discovery,
  outside the faction cluster).
- `0031`, `0032`, `0034`, `0035`, `0038` → design superseded by
  `docs/design/LIVING-FACTION-ENGINE.md` via `0042`; each also flagged for
  its own pre-Phase-12f "WHO/WHERE/WHAT tab" vocabulary where applicable.
- `0036` → **not** edited — adopted wholesale, confirmed via
  `conflicts.md` #6.

**`CLAUDE.md`:** one addition — a "Design docs map" subsection (5-item
priority order: `docs/design/*.md` → ADRs → `PROGRESS.md` → the
Constitution → `docs/archive/`). No stale claims found to fix (grepped for
"WHO/WHERE/WHAT/WHY tab" and faction-specific content — clean already,
Phase 12f's own work earlier this session had already kept it current).

**Archived (moved to `docs/archive/<original-path>`, banner + INDEX.md
entry each):**
- `docs/design/FACTION-CONFLICT.md` → `docs/archive/design/`
- `docs/design/faction-conflict-integration-plan.md` → `docs/archive/design/`
- `docs/design/faction-turn-engine-v2-prompt.md` → `docs/archive/design/`
- `docs/cleanup-07-21/design-docs-cleanup-prompt.md` → `docs/archive/cleanup-07-21/`
- New `docs/archive/INDEX.md` maps every archived doc (the 4 above plus
  the 3 pre-existing archive entries) and every superseded-ADR to its
  successor.

**One live-doc path correction:** `PROGRESS.md`'s 2026-07-13 Faction
Conflict entry now points at `FACTION-CONFLICT.md`'s archived location
(the one non-immutable doc with a stale reference — see "Link
verification" below).

## Blocker encountered and resolved

`Additional scope concepts.txt` — the document both the cleanup prompt and
the consolidated design treat as the controlling authority for design
intent (precedence rule 2, right after code) — did not exist anywhere in
the repository or the other accessible working directories when this pass
started. Flagged this to the user before proceeding rather than either
fabricating its content or silently treating the consolidated design's
paraphrase as ground truth. The user supplied the actual file
(`docs/cleanup-07-21/Additional scope concepts.txt`); every quote
attributed to it in the consolidated design was checked word-for-word
against the real file before this cleanup proceeded — all matched exactly
(two trivial typo-corrections, one marked elision). See
`docs/design/RESEARCH-AND-DECISIONS.md`'s sourcing and `docs/adr/0042`'s
Decision §4 for where this is recorded.

## Drift report summary (full detail: `docs/_cleanup/drift-report.md`)

Scope: the faction cluster (ADRs 0031/0032/0034/0035/0036/0038) and the
seeded W-tab-surface drift — per the cleanup prompt's own "Keep as-is"
category definition ("unrelated to the faction-design conflict"), the
other ~30 ADRs and the `requirements/` corpus were inventoried and
classified but not independently re-verified claim-by-claim (see
manifest.md's scope note).

- **13 load-bearing claims independently verified** against `src/` (grep +
  read, cited by exact file:line) — all matched the doc's description
  exactly. No claim was found to misdescribe current shipped behavior.
- **3 claims verified by direct authorship** (Phase 12f, Phase 13a/13b,
  and the orphaned Raise/Lower Reputation reducers were all built/
  discovered by me earlier in this same session) — confirmed with full
  certainty, not inferred.
- **Drifted-surface (not a behavior bug):** ADRs 0031 (2 refs), 0032
  (1 ref), 0038 (4 refs) use "WHO/WHERE/WHAT tab" language that predates
  Phase 12f's tab retirement. Every named function/block behind that
  language still exists and still renders — just inside a Dashboard
  section now, not a tab body. Not fixed in the ADR bodies (immutable);
  the canonical spec uses Dashboard-section/Co-Pilot vocabulary
  exclusively, confirmed by direct read (no "tab" language survived
  promotion).
- **Unshipped, correctly labeled as forward design in the source doc:**
  two-sided `event.impact`, per-decision editable dropdowns, system-wide
  round scope, `partyStanding`/`heat`, tag-driven faction membership,
  `factionBystandersFor` — all grepped, none exist yet, and the
  consolidated design never claimed otherwise (it's explicitly the
  *forward* design in its own front-matter).
- **Potential code follow-ups:** none beyond what the consolidated design
  itself already scopes as the six build-prompt phases — no
  load-bearing claim was found simply wrong about current behavior.

## Conflict resolutions (full detail: `docs/_cleanup/conflicts.md`)

The seeded 7 conflicts, each confirmed against current code (not
rediscovered blind) and resolved per the stated precedence order (code >
scope doc > newest ADR > `CLAUDE.md` > validated-over-unvalidated), plus
one additional conflict found during discovery (ADR 0007/0039, LFS →
Releases — outside the faction cluster, recorded for completeness).

## Cross-reference verification

- Re-ran the conflict cross-reference against the new canonical set: no
  contradiction found. `docs/design/LIVING-FACTION-ENGINE.md`'s header no
  longer claims to supersede ADR 0036 (the one inconsistency caught,
  fixed during promotion — see §6.2 above); every other cross-reference
  (ADR Status lines ↔ `docs/adr/0042` ↔ `docs/archive/INDEX.md` ↔ the
  canonical spec's own supersession claims) agrees.
- Grepped the full repo for markdown links and bare-path mentions of every
  moved/archived file. Zero real markdown hyperlinks (`](path)`) pointed
  at a moved path anywhere outside this cleanup's own working docs (which
  correctly reference the *old* paths as historical record of the move
  itself — not broken links). Two immutable ADR bodies (0036) and one
  editable status ledger (`PROGRESS.md`) contained plain-text/backtick
  path mentions, not clickable links; the ADR mentions are left as
  correct historical record (per §0.3, ADR bodies aren't rewritten), the
  one `PROGRESS.md` mention was corrected to the archived path.
- `node scripts/build.js` — clean, 77 modules, byte-identical bundle size
  to before this pass (confirms zero `src/` changes, as expected for a
  docs-only pass).
- `npm test` — 447/447 passing (unaffected, as expected).

## Remaining open items (not resolved by this pass — by design)

- The six build-prompt phases (`docs/design/living-faction-engine-build-
  prompt.md`) are not built. This pass is documentation reconciliation
  only, per its own non-goals (§9 of the now-archived cleanup prompt).
- `requirements/design-principles/`'s 77-document Constitution was
  inventoried as one corpus entry, not individually re-audited — this was
  an explicit instruction (§1: "Inventory it; do not rewrite it"), not an
  omission.
- Non-faction ADRs (0001–0030, 0033, 0037, 0039–0041) were classified but
  not independently drift-checked — none are implicated by the faction-
  design conflict; a full-repo drift audit unrelated to factions is new
  scope for a future pass, not something this one left undone.

## Manifest / working files (kept in branch history, not part of the live doc set)

`docs/_cleanup/manifest.md`, `docs/_cleanup/drift-report.md`,
`docs/_cleanup/conflicts.md`, this file. These answer "how was this
verified" for a reviewer of this branch; `docs/adr/0042` and
`docs/design/LIVING-FACTION-ENGINE.md` are the durable canonical record
going forward.
