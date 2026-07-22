> ARCHIVED 2026-07-21. This process has been executed — see
> `docs/adr/0042-design-doc-consolidation.md` for the decision it
> produced and `docs/_cleanup/REPORT.md` for the full account of what
> ran. Retained for history and as a reusable template for a future
> subsystem's doc consolidation; not itself a current design doc.

# Design-Doc Cleanup & Reconciliation — Build Prompt

> **How to use this document.** Hand this to a Claude Code session running
> inside your repo (`c:\Dev\GMAtlas` — Saga Atlas / GMAtlas). It is a
> self-contained instruction set to audit **every** design document in the
> project, verify each against the actual code, resolve conflicts, preserve
> the research learned during development, and produce one clean canonical
> doc set — **without destroying history** (superseded docs are archived and
> pointer-linked, never deleted).
>
> This is a documentation operation. It changes `.md`/`.txt`/design files and
> may write **new** ADRs; it does **not** change application source except to
> read it for verification. If a doc-vs-code conflict implies a code bug,
> record it — do not fix code in this pass.

---

## 0. Ground rules (non-negotiable)

1. **Work on a branch.** Create `docs/cleanup-reconciliation` (or similar)
   before any file move/edit. Nothing lands on the default branch without
   review. Commit in logical stages (inventory → verification → reconcile →
   archive → report) so each is reviewable and revertible.
2. **Archive, never delete.** Superseded or stale docs move to
   `docs/archive/<original-path>` (mirroring their original location) with
   their content intact. Deletion is never the mechanism — git history is a
   backstop, not the primary provenance record.
3. **ADRs are immutable history.** Do **not** rewrite the body of an existing
   ADR to change what it decided. The only edits permitted to a shipped ADR
   are (a) its `Status` line, to mark it `Superseded by <new doc>`, and (b)
   an optional one-line pointer at the top to the canonical successor.
   Everything else about a superseded ADR stays byte-for-byte as written.
4. **Preserve the research.** Several docs contain hard-won supplemental
   findings gathered during development (SWN/OSR community sentiment, the
   Blades-in-the-Dark progress-clock rationale, the "faction systems get
   redesigned twice" playtesting evidence, Gnome Stew's abstraction-over-
   precision guidance, the copyright/provider reasoning). This material is an
   asset, not clutter. It must survive into the canonical set (§6.4), not be
   lost when its host doc is archived.
5. **Scope doc is the design authority.** Where documents disagree about
   *intent*, `Additional scope concepts.txt` is the controlling statement
   and the canonical docs reflect it. Where documents disagree about
   *shipped behavior*, the **code** is the authority (§3).
6. **No `window.prompt()` / pure-domain / single-store / one-listener** and
   the rest of `CLAUDE.md`'s architectural rules are themselves canonical —
   reconcile other docs *to* them, and treat `CLAUDE.md` as a doc to clean
   up too (§6.1), not as untouchable.

---

## 1. Discovery — build a complete manifest

Enumerate every design/documentation artifact in the repo, not just `.md`:

- All `*.md` anywhere (`docs/`, repo root, `docs/adr/`, `docs/design/`,
  package subfolders, READMEs).
- Design material in other formats: `*.txt` (e.g.
  `Additional scope concepts.txt`), build-prompt files, and any
  `assets/docs/*` reference material referenced by the ADRs (note them; do
  not modify sourcebook PDFs).
- `CLAUDE.md` and any `DESIGN-*.md` / `*-prompt.md` at root.
- **`PROGRESS.md`** — per `DESIGN-NEW-FUNCTIONALITY.md`, this is the
  authoritative phase-by-phase **status** change-log. Treat it as the source
  of truth for *what shipped when* (the ADRs hold *why*). Do not archive it.
- **The `requirements/` Design Constitution** — a 77-document long-range
  vision reconciled in `docs/adr/0001-adopt-design-constitution.md`, with
  numbered **Articles** (e.g. II = GM retains creative authority, IX =
  extend via what exists, X = "the workspace changes, not the application").
  This sits **above** the individual ADRs as design law; the cleanup
  reconciles other docs *to* it and must not contradict it. Inventory it;
  do not rewrite it in this pass.
- **`docs/archive/`** — an archive convention **already exists** here (e.g.
  `docs/archive/DESIGN-NEW-FUNCTIONALITY-2026-07-15.md`). Reuse it; match its
  naming (`<name>-<date>.md`) rather than inventing a parallel scheme.

Produce `docs/_cleanup/manifest.md`: one row per artifact with path, size,
last-modified, and a one-line "what it is" guess. This manifest is the
checklist the rest of the pass works through — every artifact must reach a
disposition (§7) by the end.

## 2. Classify each artifact

Assign every manifest row exactly one class:

- **ADR** — a numbered `docs/adr/NNNN-*.md` decision record. Immutable
  (§0.3). Historical truth about *why* a decision was made at a point in
  time.
- **Canonical design spec** — a living description of how a subsystem is
  meant to work *now* (e.g. a consolidated faction-engine design). These are
  the docs the cleanup **rewrites/merges** into the clean set.
- **Rules / constraints** — `CLAUDE.md` and anything defining repo-wide
  architectural law. Reconciled and kept authoritative.
- **Transient build prompt** — a doc written to drive a one-time
  implementation (e.g. `faction-turn-engine-v2-prompt.md`,
  `*-integration-plan.md`). Once its work has shipped, it is history →
  archive, with its still-relevant *decisions* lifted into a canonical spec
  or ADR first.
- **Research / validation note** — content whose value is the *findings*
  (community sentiment, external-source analysis). Its findings are
  extracted to the research log (§6.4) before its host doc is archived.
- **Superseded / stale** — flatly contradicted by a newer doc, the scope
  doc, or the code. Archive with a superseded-by pointer.
- **Keep as-is** — READMEs, contributor guides, etc. unrelated to the
  faction-design conflict. Leave untouched unless they contain stale claims.

Record the class in the manifest.

## 3. Code-verification pass (doc claims vs. reality)

For each **ADR** and **canonical design spec**, extract its load-bearing
claims about shipped behavior and check each against the actual source. This
is what distinguishes "the docs say X" from "the code does X."

- For every named function/field/module a doc asserts exists
  (`factionTurnEngine.js`'s `factionsInRegion`, `event.impact`'s shape,
  `factionRulesProviders.js`'s resolution order, `getEntityFaction`'s
  Unaligned fallback, `settings.factionPacing`, the `'conflict'` entity
  type, `location.locationStory`, …), confirm it is present and behaves as
  described. Grep the source; read the function.
- Classify each claim as **Verified** (code matches), **Drifted** (code
  differs from doc), or **Unshipped** (doc describes something absent from
  code).
- **Seed the drift hunt with the known big one:** Phase 12f (ADR 0040,
  2026-07-16) **retired the five WHO/WHERE/WHAT/WHY/HOW tabs**, folding their
  content into a Story Dashboard + always-visible Co-Pilot. Several faction
  ADRs (0031's WHO/WHERE surfacing, **0038**'s entire "WHERE tab / WHO tab"
  vocabulary) describe controls on tabs that **no longer exist as tabs**.
  These are not wrong about *behavior* but stale about *surface* — flag every
  "W-tab" reference in an ADR written before 2026-07-16 as Drifted-surface,
  and ensure the canonical spec describes Dashboard sections / Co-Pilot
  instead. Cross-check `PROGRESS.md` for the authoritative ship dates when
  deciding which docs predate the retirement.
- Produce `docs/_cleanup/drift-report.md`: a table of every Drifted/Unshipped
  claim with doc path + line, the asserted behavior, and what the code
  actually does. Cite exact source locations.
- **Do not fix code.** If a drift implies a real bug (e.g. the
  off-by-default `scenesPerRound <= 0` guard, or a claimed cross-faction
  impact that isn't there), record it in the drift report under a
  "Potential code follow-ups" heading for a separate pass.

The canonical set (§6) must describe **verified reality plus the agreed
forward design**, never an unverified doc claim.

## 4. Conflict & staleness detection

Cross-reference all classified docs and list every contradiction in
`docs/_cleanup/conflicts.md`. Seed it with the known conflicts (already
analysed — confirm each against the current tree, don't rediscover blind):

1. **Automation depth** — ADR 0031 chose propose-then-confirm (whole-draft
   accept); the scope doc wants automated decisions in *editable dropdowns*
   changed before a single commit. Resolution: auto-decide + per-decision
   dropdowns (scope doc wins).
2. **Cross-faction impact** — ADR 0031/0035 explicitly cut it; the scope doc
   requires an attack to assess and damage the defender's actual assets.
   Resolution: reversed (scope doc wins); still a frozen once-computed diff,
   **not** a reopening of the cancelled retcon/command-log design.
3. **Turn scope** — ADR 0035 scopes a round to the Active Location; the scope
   doc wants all local-system factions, with off-world "news cascade."
   Resolution: reversed (scope doc wins).
4. **Reputation/Heat** — ADR 0032 shipped a one-directional Threat nudge and
   no Heat field; the scope doc wants a bidirectional reputation loop and
   Heat committed to NPC/Location records. Resolution: extended (scope doc
   wins).
5. **NPC↔faction binding / Bystanders** — ADR 0034's derived Unaligned
   fallback vs. the scope doc's tag-driven membership and rival-NPC
   Bystanders in scenes. Resolution: strengthened (scope doc wins).
6. **Conflict schema** — `FACTION-CONFLICT.md`'s flat 18-field schema vs. ADR
   0036's validated hero-path/add-depth split. Resolution: 0036's split is
   canonical; the rich spec is demoted to an "idea bank" research note.
7. **AI-generated constraint docs** — `DESIGN-NEW-FUNCTIONALITY.md` has been
   read and reconciled (see the consolidated faction design's §17). Its
   material consequence is the **W-tab retirement** (conflict-source for the
   surface drift above), plus confirmation that per-faction reputation and
   Heat are new (not duplicates of ambient `context.what.reputation`/no Heat
   field) and that the scene NPC-groups (Phase 13b) are the existing home for
   faction Bystanders. Carry these into the canonical spec. For any *other*
   AI-authored design doc found, apply the same test: verify each constraint
   against the scope doc and code; where it conflicts, the scope doc/code
   wins and the constraint is recorded as superseded with rationale.

For each conflict, record: the documents involved, the specific claims, the
resolution, and which authority decided it (scope doc / code / newest ADR).

## 5. Reconciliation rules (how ties break)

Apply in this precedence order when two sources disagree:

1. **Code** wins on questions of *what currently ships*.
2. **`Additional scope concepts.txt`** wins on questions of *intended
   design / forward direction*.
3. **The newest ADR** wins over an older ADR on a shipped decision (ADRs
   supersede forward).
4. **`CLAUDE.md` architectural law** is absolute for *how* anything is built
   (purity, single store, delegated listeners, no `window.prompt`, additive
   schema).
5. A **validated/research-backed** decision (e.g. 0036's community-validated
   hero-path split) wins over an unvalidated earlier sketch of the same
   feature.

When a resolution reverses a prior shipped decision, the canonical doc must
say so explicitly and cite why — never silently flip a documented choice.

## 6. Produce the canonical set

Target doc architecture (create/merge into these; adjust names to match repo
convention where one already exists):

### 6.1 `CLAUDE.md` (reconciled, kept authoritative)
Ensure it states the current architectural law with no stale faction-
specific claims. If it references removed/renamed concepts, correct those
(this is a rules doc, not an ADR — it may be edited in place). Add a short
"Design docs map" pointing to the canonical specs below.

### 6.2 `docs/design/LIVING-FACTION-ENGINE.md` (canonical faction spec)
The single authoritative description of the faction subsystem as it is
*meant to work*, merging ADRs 0031/0032/0034/0035/0036/0038, the conflict
spec, and the resolved conflicts from §4/§5. If a
`LIVING-FACTION-ENGINE-CONSOLIDATED-DESIGN.md` already exists in the repo,
promote/rename it here and true it up against the §3 drift report (replace
any forward-design assertion that the code contradicts with the verified
state plus a clearly-marked "Planned" section). This doc describes current
reality *and* the agreed forward design, with the two clearly separated.

### 6.3 `docs/adr/NNNN-design-doc-consolidation.md` (new superseding ADR)
A new ADR, next number in sequence, recording *this cleanup itself* as a
decision: what was consolidated, which prior ADRs are now superseded by the
canonical spec (list them), the six conflict resolutions and their
authorities (§4), and what was archived. This is how ADR discipline is
honored — the consolidation is itself a dated, immutable decision record,
and the old ADRs get their `Status` line updated to point here.

### 6.4 `docs/design/RESEARCH-AND-DECISIONS.md` (provenance log)
The rescue vessel for supplemental learnings so archiving their host docs
loses nothing. Capture, with source attribution: the SWN/OSR community
sentiment and where it came from, the Blades progress-clock rationale, the
"redesigned twice" playtesting evidence, Gnome Stew's abstraction guidance,
the copyright/provider reasoning, the SWN-sourcebook transcription
provenance, and any oracle-table sourcing. Each entry: the finding, its
source, and which design decision it justifies. This is the "improved design
concepts based on information learned from supplemental resources during the
development process" made durable and discoverable.

### 6.5 Build prompts
Keep any *not-yet-built* build prompt (e.g.
`living-faction-engine-build-prompt.md`) as an active doc. Archive any build
prompt whose work has **shipped** (verified via §3) after confirming its
still-relevant decisions live in 6.2/6.3.

## 7. Archive & pointer-link

For every doc classed Superseded, Transient-and-shipped, or Research-note-
extracted:

- Move it to `docs/archive/<original-relative-path>`.
- Prepend a short banner: `> ARCHIVED <date>. Superseded by <canonical
  doc>. Retained for history; not current.` (For ADRs, this is the
  `Status`-line edit only — the ADR file **stays in `docs/adr/`**, it is not
  physically moved, since its number is a stable reference.)
- Create `docs/archive/INDEX.md` mapping each archived doc → its canonical
  successor and one-line reason, so nothing becomes unfindable.

Every manifest row (§1) must end with a recorded disposition: Canonical /
Kept-as-is / Archived / ADR-status-updated. No artifact left unclassified.

## 8. Final report & verification

- `docs/_cleanup/REPORT.md`: what changed, the canonical set, the archive
  index, the drift report summary (including any "potential code follow-ups"
  surfaced but deliberately not fixed), and any remaining open reconcile
  items. (The `DESIGN-NEW-FUNCTIONALITY.md` reconcile is already **closed** —
  §17 of the consolidated faction design records it; carry its conclusions
  in, don't reopen them.)
- Verify no canonical doc contradicts another (re-run the §4 cross-reference
  against the *new* set — it must come back empty).
- Verify no internal doc links are broken by the moves (grep for relative
  links into archived paths; update them to the canonical target or the
  archive location as appropriate).
- Run `node scripts/build.js` (or the repo's build/test entry) to confirm no
  doc move broke a docs-referencing build step; report the result.
- Do **not** merge to the default branch. Leave the branch and REPORT.md for
  human review.

## 9. Explicit non-goals

- No application source changes (verification is read-only; code follow-ups
  are recorded, not applied).
- No deletion of any doc (archive + pointer only).
- No rewriting of an ADR's decision body (Status line + top pointer only).
- No new design *decisions* invented during cleanup — this pass reconciles
  and records existing/agreed decisions; a genuinely new design question
  goes to the human, not resolved unilaterally in a canonical doc.
