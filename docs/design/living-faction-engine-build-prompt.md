# Living Faction Engine — Build Prompt

> **How to use this document.** This is a self-contained prompt for a Claude
> Code session (or any competent engineer) to evolve the existing SWN
> Faction Turn Engine in `c:\Dev\GMAtlas` (Saga Atlas / GMAtlas) into the
> "Living Faction Engine" described in
> `docs/design/LIVING-FACTION-ENGINE.md`. It assumes the reader has
> **not** seen the conversation that produced it.
>
> **Status:** not yet built (as of `docs/adr/0042-design-doc-
> consolidation.md`, 2026-07-21) — kept as an active build prompt, not
> archived.
>
> **Read first, in order:** (1) `CLAUDE.md` for this repo's non-negotiable
> architectural rules; (2) `docs/design/LIVING-FACTION-ENGINE.md`
> §2 (what already exists) and §3 (the five shifts and why prior scope cuts
> are reversed); (3) ADRs 0031/0032/0034/0035/0038 (Status lines point to
> the canonical doc above) and 0036 (adopted wholesale, not reversed) for
> the shipped code you are extending, not replacing.
>
> **Nothing here is speculative** — each item is a requirement, an explicit
> non-goal, or already-shipped context. Where a decision reverses a prior
> ADR, that is intentional and called out; do not "restore" the old
> behavior.
>
> **`DESIGN-NEW-FUNCTIONALITY.md` (DNF) has been reconciled** (see the
> consolidated design's §17). The load-bearing consequences for this build:
>
> - **The five W-tabs are retired** (Phase 12f, ADR 0040). The workspace is
>   a **Story Dashboard** of collapsible sections + an always-visible
>   **Co-Pilot** panel holding all suggestion/oracle controls. Wherever the
>   source ADRs (0031/0038) or this prompt say "WHO/WHERE/WHAT tab," build a
>   **Dashboard section / Co-Pilot control**. Do **not** add a W-tab.
> - **The scene NPC model already exists** (Phase 13b, ADR 0041):
>   `scenes.js`'s `npcStates` with Protagonists/Antagonists/**Bystanders
>   (GM-added)**, scene-scoped fields, `oracles.overrides` memory. Phase 6
>   feeds *that* Bystanders group — it does not add a new slot.
> - **`context.what.reputation` is a campaign-wide ambient value** with
>   **orphaned Raise/Lower Reputation `SHIFTS` reducers**. Per-faction
>   `partyStanding` (Phase 5) is new; wire its large swings to the ambient
>   value through the existing `applyShift` mechanism.
> - **No Heat/Hazard field exists** — `heat` (Phase 5) is genuinely new.
> - **`getFactionDossier` is built/tested but unwired** (DNF item 12e);
>   surface it on the faction card (Phase 5 UI) — an intended, free win.
> - Respect the **Design Constitution** (`requirements/`, ADR 0001) and its
>   Articles (II = GM authority; IX = extend via what exists; X = workspace-
>   not-app, already reversed by Phase 12 — inherit that, don't refight it).

## 0. Non-negotiable architecture (do not violate)

- `src/domain/*.js` stays pure and DOM-free: every mutator takes a
  `campaign`, returns a NEW one via `clone()`, and accepts an injected
  `rng`. No `Date.now()`/`Math.random()` inside a resolver.
- `src/core/store.js` is the only persistence module.
- `src/ui/shell.js` keeps exactly one delegated listener per DOM event type;
  every control is a `data-*` attribute read via `target.closest(...)`.
- No `window.prompt()`. New free-text uses the existing mention-editor
  rich-field convention.
- Additive schema is lazy-initialized (default on touch) — no `migrate.js`
  step for a plain default. A one-time grandfather step is used only where
  an existing field's *meaning* changes.
- Every new/changed domain function ships with `node --test` coverage,
  RNG-injected, no browser dependency.

The engine must import **no** `SWN_*` / `GMATLAS_*` constant directly —
every catalog/goal/tag/consequence lookup goes through
`factionProviderFor(campaign, faction)`. Treat any direct import as a bug.

---

## Phase 1 — Provider hardening (pure refactor, no behavior change)

**Goal:** make the Faction Rules Provider the single seam the whole engine
depends on, and widen it to carry the behavior later phases need.

- In `src/data/factionRulesProviders.js`, extend the provider shape with
  three new members, each with an SWN and GMAtlas Core default:
  - `assetConsequenceModel(defenderFaction, damage) -> [{assetId, hpBefore, hpAfter, destroyed}]`
    — maps dealt damage onto the defender's specific `factionAssets`
    (default: highest-current-HP-first until damage is spent; skip
    `stealthed` assets unless no others remain). Mechanics are shared
    (not copyrightable); only prose differs between providers.
  - `goalHeuristicWeights` — the stat/tag/goal weights the action-choice
    heuristic reads (extract the currently-inlined weights in
    `factionTurnEngine.js` into this, so behavior is byte-identical after
    the move).
  - `reputationHooks(actionId, outcome) -> partyStandingDelta` — optional;
    default table returns small ±1 deltas (see Phase 5), `0` when absent.
- Audit `factionTurnEngine.js`: confirm every catalog/goal/tag lookup already
  routes through `factionProviderFor`; move any remaining inlined weight or
  constant behind the provider.
- **Tests:** provider-shape completeness for both providers; the extracted
  heuristic weights reproduce the prior action choices across the existing
  seeded turn tests (no diff); `assetConsequenceModel` maps a known damage
  onto a known asset list deterministically and respects `stealthed`.

**Non-goal:** no new UI, no gameplay change. If any existing test changes
its expected output, the refactor is wrong.

---

## Phase 2 — Two-sided, point-in-time impact (reverses ADR 0031/0035 cut)

**Goal:** an Attack (and any two-sided action) assesses the defender's
actual assets at resolution and records both sides' losses, computed once
and frozen. This does **not** reintroduce the cancelled retcon/command-log
design — the diff stays a frozen summary, never replayed.

- `event.impact` becomes:
  ```
  { actor:   { factionId, hpDelta, facCredsDelta, assetsAdded, assetsRemoved, assetsChanged },
    targets: [ { factionId, hpDelta, facCredsDelta, assetsAdded, assetsRemoved, assetsChanged } ] }
  ```
  Self-scoped actions → `targets: []`. Attack → one target. Faction-vs-world
  → one target per faction that actually lost HP/assets.
- In `attack()` and `seizePlanet()`'s resistance tally: at resolution, read
  the defender's live `factionAssets` (`hp`, `assetType`, `stealthed`) and
  apply damage via the acting provider's `assetConsequenceModel`,
  decrementing per-asset HP and removing destroyed assets. The faction's
  derived max HP still bounds the exchange; the *record* now names the
  specific assets lost.
- Compute both sides' before/after inside the same function where both
  faction objects already co-exist in the scratch clone; attach the frozen
  two-sided `impact` at propose time. Mixed-provider correctness: each side
  resolves its **own** provider for its own catalog/consequence lookup.
- **Display/back-compat:** add a normalizer that lifts a legacy single-sided
  `impact` into `{ actor, targets: [] }` at display time only. Do not
  migrate stored events. (DNF is silent on `event.impact`; no conflict.)
- Entity Editor Turn History (`factionTurnSectionHtml`) now also renders
  turns where the faction was a *defender*, reading `impact.targets`.
- **Tests:** an Attack destroying a specific defender asset appears in
  `impact.targets` with correct per-asset `assetsRemoved`/`assetsChanged`;
  `stealthed` assets are spared per the model; a self-action has empty
  `targets`; the legacy-shape normalizer round-trips; a mixed-provider
  Attack resolves each side's catalog independently.

**Non-goal:** full multi-turn per-asset **siege bookkeeping** for Seize
Planet stays an approximation — assess assets for consequence application
only. (DNF authorizes no deeper SWN gameplay-area mechanics for now.)

---

## Phase 3 — Auto-decide with editable dropdowns (reverses ADR 0031 whole-draft model)

**Goal:** the engine still auto-computes every faction's full turn, but each
decision is exposed as an editable dropdown pre-selected to the automated
pick; a single Commit applies the (possibly-edited) chain. Article II is
preserved — nothing touches the real campaign until Commit.

- `proposeFactionTurn` additionally emits a `draft.decisions` record:
  ```
  { goal:   { chosenId, options:[{id,label,eligible,difficulty}] },
    action: { chosenId, options:[{id,label,eligible,reason}] },
    target: { chosenRef, options:[{ref,label,stance}] },   // when applicable
    asset:  { chosenId, options:[...] } }                  // buy/refit/etc.
  ```
  `options` lists every valid alternative with plain-language labels;
  ineligible options are flagged (rendered greyed, not hidden). The
  pre-selected value is always the engine's automated choice.
- New pure `reproposeWithOverride(campaign, factionId, field, value, {rng})`:
  re-runs that faction's proposal with `value` forced and everything
  downstream re-derived (a new action may invalidate the current target; a
  new target re-rolls the attack). Preserve already-rolled upstream results
  the override doesn't affect (don't reshuffle the goal when only the target
  changed). Recompute `impact` for the new draft.
- New pure `reproposeFrom(campaign, batch, k, {rng})`: within a Full Round,
  after editing faction *k*, re-propose factions *k+1…n* against the new
  chain; leave 0…k-1 untouched. Batch stays all-or-nothing at **commit**;
  it is now editable per-decision **before** commit.
- UI (`factionEvents.js`): replace the whole-draft accept row with per-
  decision `<select>`s carrying
  `data-faction-draft-decision="factionId::field"`. `shell.js`'s single
  `change` listener calls `reproposeWithOverride` (and `reproposeFrom` for
  the tail) and re-renders the pending batch. A single **Commit** applies the
  chain and calls `resetFactionPacing`.
- Keep the shipped guards: `scenesPerRound <= 0` is "off" via an explicit
  `!= null` check; every propose path (including `none`/`busy`) emits a
  decision record and an `impact` (a "no change" diff is valid).
- **Tests:** `proposeFactionTurn` emits a decisions record on every path;
  `reproposeWithOverride` forces the chosen value, re-derives downstream, and
  preserves unaffected upstream rolls; `reproposeFrom` recomputes only the
  tail; committing an edited batch applies the edited chain (not the
  original auto-picks).

---

## Phase 4 — System-wide rounds + off-world news (reverses ADR 0035 location-scope cut)

**Goal:** a Full Round processes every faction with presence in the local
system; off-world factions feed a news cascade instead of a turn.

- Full Round membership = a system-level `factionsInRegion` walk anchored at
  the system root (containment ancestor of the Active Location up to the
  `#star`/system node), stance-tagged. A faction counts as **local** if it
  has an asset, homeworld, Base of Influence, governed location, or
  `member_of` member anywhere in that subtree.
- Add a round-scope toggle `data-faction-round-scope="system|location"`
  (default `system`); `location` reproduces the shipped Active-Location
  round.
- **Off-world news** (`domain/factionNews.js` or folded into the engine):
  `generateOffworldNews(campaign, {rng})` picks an off-world faction weighted
  by relevance (rival-of-a-local, patron-of-a-local, or party-history) and
  rolls a new `SCENE_TABLES['Faction News']` group (original content, cited
  honestly) into a one-line news item stored as a `factionEvents` entry with
  `scope:'news'`, `witnessed:false`, **no `impact`**, no upkeep/goal run.
  It renders through the existing "News from {location}:" display path with
  no new feed UI. Optional `cascade:{condition,effect}` the Co-Pilot can
  surface if that faction later gains local presence — a flag, not a
  scheduler.
- Add an "🛰 Off-world news" control and a small per-Full-Round chance to
  surface one; never on a timer.
- **Tests:** the system walk includes a faction two structural hops away
  that the Active-Location set misses, and excludes a purely off-world
  faction; `generateOffworldNews` is pure/RNG-injectable, produces a
  `scope:'news'` event with no `impact`, and never mutates the chosen
  faction's stats.

---

## Phase 5 — Reputation + Heat (reverses ADR 0032 one-directional-nudge cut)

**Goal:** scene outcomes feed factions (standing, Heat); standing feeds
subsequent turns and missions. Close the loop at scene-resolution and
propose-time — no background scheduler.

- Schema (additive, lazy): `faction.partyStanding` (0–10 dial, default 5,
  reusing the existing relationship-strength convention — do **not** invent
  a new scale); `location.heat` and `npc.heat` (integer, default 0) added to
  the respective ensurers. **Confirmed against DNF:** no per-faction
  standing and no Heat/Hazard field exist today, so both are new. There
  **is** a campaign-wide ambient `context.what.reputation` with orphaned
  Raise/Lower Reputation `SHIFTS` reducers — do not duplicate it; instead
  (below) wire the per-faction loop's large swings into it via `applyShift`.
- `applySceneOutcomeToFactions(campaign, sceneOutcome, {rng})`, called from
  `session.js` at scene resolution alongside the existing pacing increment:
  shifts each touched faction's `partyStanding` by a small clamped delta
  (via provider `reputationHooks`), accrues `heat` on the scene Location and
  implicated NPCs, and may append a session hook when standing crosses a
  threshold. On a large/threshold-crossing swing, also call the existing
  `applyShift` with the Raise/Lower Reputation `SHIFTS` reducer to move the
  ambient `context.what.reputation` — reusing the shipped mechanism (and
  finally giving those orphaned reducers a driver), not adding a parallel
  ambient value.
- Outbound: the action-choice heuristic and auto-targeting read
  `partyStanding` — low standing weights aggression and party-aligned
  targeting; high standing weights cooperative outcomes and mission offers.
  `generateMission` uses standing to bias job-offer (high) vs. threat-hook
  (low).
- Heat decay: optional per-round `-1` toward 0 so Heat is a live signal.
- UI: a party-standing dial + Heat readout on the faction card — the same
  addition that surfaces `getFactionDossier` (DNF item 12e, built/unwired);
  Heat on the **WHERE Dashboard section** digest and the **WHO Dashboard
  section** nearby summary (not W-tabs — retired by Phase 12f); Co-Pilot
  standing/Heat observation branches (same priority-chain shape as
  `hotFaction`/`hotFactionGoal`).
- **Tests:** `applySceneOutcomeToFactions` shifts standing within clamp,
  accrues Heat, is pure; the heuristic's targeting/appetite changes with
  standing (low → more likely to target party-aligned; high → less);
  `generateMission` biases offer vs. threat by standing; Heat decays
  correctly and never below 0.

---

## Phase 6 — NPC↔Faction binding + scene Bystanders

**Goal:** NPC faction membership is tag-driven and first-class; rival NPCs
surface into scene composition as Bystanders, conflict-aware.

- Extend `getEntityFaction` ranking: explicit `member_of` edge → resolvable
  faction-typed tag (e.g. `#faction:<id>`) → derived "Unaligned." An NPC's
  `role` free-text is independent of its faction (same faction, different
  roles). Every faction-scoped view picks up tag-bound NPCs for free.
- `factionBystandersFor(campaign, locationId, {conflictAware=true})` (pure):
  returns NPCs whose faction is a **rival** (via `relationshipStanceBetween`,
  weighted by `partyStanding`) present at/near `locationId` via
  `factionsInRegion`; when a `'conflict'` entity is live at the location,
  prioritize opposing-side rival NPCs.
- **Feed the existing Phase 13b Bystanders group** — do not add a new slot.
  The scene model already has `scenes.js`'s `npcStates` with a GM-added
  **Bystanders** group (Protagonists/Antagonists/Bystanders), each NPC with
  scene-scoped Disposition/Motivation/Threat Rank/Challenges/Opportunities
  and `oracles.overrides` memory. `factionBystandersFor` **suggests** rival
  NPCs into that group, pre-seeding their scene fields from faction context.
  Offer, never auto-insert (Article II) — a GM accepts the suggestion the
  same way 13b already supports adding a Bystander. Surface the suggestion in
  the **WHO Dashboard section** (not a tab) when a conflict/rival presence is
  live at the current location.
- **Tests:** a faction-tagged NPC resolves to that faction via
  `getEntityFaction` without a `member_of` edge; `factionBystandersFor`
  returns only rival-faction NPCs in range, prioritizes conflict opponents,
  and returns none when only allies are present; the scene generator offers
  but does not force insertion.

---

## Cross-cutting: Conflict wiring (no dedicated phase)

ADR 0036's conflict entity, hero-path/add-depth split, escalation clock,
quick-start, and `suggestedConflictEscalations` are adopted unchanged. Only
wire them to the new outputs: system-wide rounds feed more events to
`suggestedConflictEscalations` (still GM-confirmed, one line per
event↔conflict match); a live conflict is the strongest Bystander signal
(Phase 6); two-sided impact (Phase 2) makes escalation suggestions fire on
real asset destruction. The flat 18-field `FACTION-CONFLICT.md` schema and
`power_symmetry`/`escalation_appetite` stay rejected/cut — the rich spec is
the idea bank for "Add depth" fields only.

---

## Global testing & verification requirements

- Every phase adds `node --test` domain coverage as listed; run the full
  suite after each phase and confirm no prior test regresses (Phase 1
  specifically must produce zero output diffs).
- Run `node scripts/build.js` after each phase; it must stay clean.
- Where a browser smoke pass matters (dropdown re-proposal, Bystander
  offering), note it for manual verification — do not claim it done if no
  browser automation is available in the build environment.
- Confirm the "no direct ruleset-constant import" invariant with a grep gate
  in CI or a test that fails if `factionTurnEngine.js` imports `SWN_*` or
  `GMATLAS_*` directly.

## Explicit non-goals (do not build this pass)

- The retcon / replayable command log — cancelled outright; two-sided frozen
  `impact` is the entire replacement.
- Multi-turn per-asset Seize Planet siege bookkeeping (approximation kept).
- A true no-gate autopilot (auto-apply without a commit review) — the chosen
  model keeps the commit gate; a no-gate mode is a separate future design.
- Change Homeworld distance/hex rule (one turn regardless, unchanged).
- A `community`/content-creator provider — Phase 1 builds the *seam*; no such
  provider is authored here.
- Calendar/date-based clocks — this app has none; the escalation clock stays
  the single conflict clock.
