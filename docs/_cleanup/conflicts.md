# Design-doc cleanup — conflict register

Per `docs/cleanup-07-21/design-docs-cleanup-prompt.md` §4. The prompt seeds
this with 7 known conflicts, "already analysed — confirm each against the
current tree, don't rediscover blind." Confirmed against current `src/`
(see `drift-report.md` for the citations) plus one additional conflict
found during discovery (below the seeded 7).

## 1. Automation depth

- **Documents:** ADR 0031 (propose-then-confirm, whole-draft accept) vs.
  `Additional scope concepts.txt` line 3 ("Faction Turn decisions are
  automated, but are displayed in dropdowns that give the GM creative
  authority to manually change the decisions before committing").
- **Confirmed:** `proposeFactionTurn`/`commitFactionTurn` are whole-draft
  today — no `draft.decisions` field, no per-field dropdown (drift-report's
  Unshipped section). Scope doc line verified verbatim against the actual
  `.txt` file (not just the consolidated design's paraphrase).
- **Resolution:** auto-decide + per-decision editable dropdowns before a
  single commit (consolidated design §3.1/§6).
- **Authority:** scope doc (design intent) — precedence rule 2.

## 2. Cross-faction impact

- **Documents:** ADR 0031/0035 (cut: attacker-only `impact`) vs. scope doc
  line 19 ("an attack on Faction B by Faction A might damage vehicles
  owned by Faction B... applying consequences to the assets").
- **Confirmed:** `computeImpact` is single-sided today (drift-report,
  Verified section) — the cut is real and current.
- **Resolution:** two-sided, frozen at propose time (§3.2/§7) — explicitly
  **not** a reopening of the cancelled retcon/command-log design (that cut
  stands, confirmed nothing in the scope doc asks for a replayable log).
- **Authority:** scope doc — precedence rule 2.

## 3. Turn scope

- **Documents:** ADR 0035 (Full Round = Active Location only) vs. scope
  doc lines 9/11 ("Make Faction Turn calculations for all involved or
  nearby factions in the system"; off-world factions get a news cascade,
  not a full turn).
- **Confirmed:** `advanceFactionTurnRound`'s membership is whatever
  `factionIds` the caller passes (drift-report — grepped; `ui/shell.js`'s
  Full Round call site scopes it via `factionsPresentAt` at WHERE's Active
  Location today, matching the ADR 0035-described cut).
- **Resolution:** system-wide `factionsInRegion` walk as the default round
  membership, with a location-only toggle kept for a tight scene (§3.3/§8);
  off-world factions feed a news cascade (§9) instead of a turn.
- **Authority:** scope doc — precedence rule 2.

## 4. Reputation/Heat

- **Documents:** ADR 0032 (one-directional Threat nudge only) vs. scope
  doc lines 15/17 (bidirectional reputation loop; outcomes committed to
  NPC/Location records "such as Heat trackers").
- **Confirmed:** `context.what` has no per-faction reputation and no Heat
  field (drift-report, Verified section — exact field list from
  `schema.js`). The one-directional `pushEvent → context.what.threat +1`
  nudge is real and unchanged.
- **Resolution:** new `faction.partyStanding` (reuses the existing 0–10
  relationship-strength convention, not a new scale) + new `location.heat`/
  `npc.heat`; standing feeds turn heuristics and mission generation; large
  swings also nudge the *existing* ambient `context.what.reputation` via
  the *existing* `applyShift`/Raise-Lower-Reputation mechanism (confirmed
  orphaned, drift-report) rather than adding a second ambient value.
- **Authority:** scope doc — precedence rule 2. The "reuse the ambient
  mechanism, don't duplicate it" refinement is this cleanup's own
  application of precedence rule 5 (validated/existing mechanism over a
  fresh parallel one) on top of the scope doc's intent.

## 5. NPC↔faction binding / Bystanders

- **Documents:** ADR 0034 (derived-only membership, `member_of` edge or
  synthetic "Unaligned") vs. scope doc lines 5/7 (tag-driven membership;
  rival-faction NPCs as scene Bystanders).
- **Confirmed:** `getEntityFaction` checks only a `member_of` edge today
  (drift-report, Unshipped section — no tag-resolution branch exists).
  Scene Bystanders group exists (ADR 0041/Phase 13b, verified by direct
  authorship) but nothing currently populates it from faction-rivalry data.
- **Resolution:** tag-driven membership as a second resolution signal
  (ranked below an explicit `member_of` edge); `factionBystandersFor`
  *suggests* rival NPCs into the **existing** Phase 13b Bystanders group —
  confirmed this reuses rather than parallels the shipped slot (drift-
  report's authorship-verified row).
- **Authority:** scope doc — precedence rule 2, refined by precedence rule
  5 (reuse Phase 13b's validated slot instead of a new one).

## 6. Conflict schema

- **Documents:** `docs/design/FACTION-CONFLICT.md` (flat 18-field schema,
  `power_symmetry`/`escalation_appetite`) vs. ADR 0036 (hero-path/add-depth
  split, community-research-validated).
- **Confirmed:** ADR 0036 already documents this exact resolution in its
  own text (it names the flat spec and explains the simplification,
  citing SWN/Blades-in-the-Dark/Gnome Stew community sentiment). This
  conflict was resolved **before** this cleanup — the cleanup's job is
  only to make the demotion durable (archive the flat spec with a
  superseded-by pointer, migrate its research citations into
  `RESEARCH-AND-DECISIONS.md` so they survive the archive move).
- **Resolution:** ADR 0036's split is canonical; the flat spec is an idea
  bank for "Add depth" fields only.
- **Authority:** the newest ADR (0036) over an older design doc —
  precedence rule 3; also rule 5 (validated decision over an unvalidated
  sketch).

## 7. AI-generated constraint docs / `DESIGN-NEW-FUNCTIONALITY.md`

- **Documents:** DNF vs. the faction ADRs and the consolidated design.
- **Confirmed:** DNF (current, root `DESIGN-NEW-FUNCTIONALITY.md`) is
  already reconciled — the consolidated design's own §17 records this in
  detail, and this cleanup's drift report independently re-confirmed its
  three material findings (W-tab retirement, Phase 13b Bystanders slot,
  orphaned reputation reducers) against the actual code rather than just
  trusting §17's table.
- **Resolution:** closed, per the consolidated design's own instruction
  ("carry its conclusions in, don't reopen them" — `design-docs-cleanup-
  prompt.md` §8). No further action beyond what §17 already states.
- **Authority:** code + newest reconciliation — precedence rules 1 and 3.

## 8. (Found during discovery, not in the seeded 7) — Git LFS → Releases

- **Documents:** ADR 0007 ("Git LFS for the Reference Library's PDFs, with
  a history rewrite") vs. ADR 0039 (migrated the Reference Library to
  GitHub Release-hosted assets specifically *because* LFS bandwidth ran
  out — this session's own earlier work, same conversation history).
- **Confirmed:** `scripts/build.js`'s manifest generation and
  `.github/workflows/deploy-pages.yml` both reflect the Release-hosted
  approach (`releaseAssetUrl`, no `lfs: true` in checkout) — ADR 0007's
  LFS approach is no longer how the Reference Library ships.
- **Resolution:** ADR 0039 supersedes ADR 0007 outright (not a partial
  reversal — the LFS mechanism was replaced wholesale). ADR 0007's Status
  line gets a superseded-by-0039 pointer; no new decision needed here,
  0039 already records why.
- **Authority:** newest ADR over an older one — precedence rule 3.

## Cross-check: no new conflict introduced by this cleanup's own canonical set

Re-run after §6 (see `REPORT.md`'s verification section) — the canonical
`docs/design/LIVING-FACTION-ENGINE.md` must not, itself, contradict
`CLAUDE.md`, `DESIGN-NEW-FUNCTIONALITY.md`, `PROGRESS.md`, or ADR 0040/0041
(the two newest, both this session's own work and both directly verified
by authorship above).
