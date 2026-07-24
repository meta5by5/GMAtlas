# Living Faction Engine — Canonical Design

> **Status:** Accepted, 2026-07-21, via `docs/adr/0042-design-doc-
> consolidation.md`. This is the single authoritative description of the
> faction subsystem — the automated-yet-GM-authored "Living Faction Engine"
> built on the SWN Faction Turn ruleset (with a copyright-clean parallel
> provider) — describing both **current, code-verified reality** and the
> **agreed forward design**, clearly separated section by section. Every
> load-bearing "already exists" claim below was independently checked
> against `src/` before this doc was accepted — see `docs/_cleanup/
> drift-report.md` for the citations (kept in the cleanup branch history,
> not part of this doc set going forward).
>
> **Authority:** Where prior shipped ADRs and the evolved intent disagree,
> `docs/design/additional-scope-concepts.txt` is the controlling statement
> of intent (verified word-for-word against this document's quotes before
> acceptance), and this document reverses the relevant prior scope cuts
> explicitly. The reversals are enumerated in §3.
>
> **Supersedes the *design* of ADRs 0031, 0032, 0034, 0035, 0038** (now
> physically archived at `docs/archive/adr/`, preserved verbatim as the
> accurate historical record of what shipped at the time) — the shipped
> *code* those ADRs describe is almost entirely
> reused, per §2. **Does not supersede ADR 0036** (Faction Conflict) — its
> hero-path/add-depth design is adopted wholesale and incorporated by
> reference (§13); only wired to this design's new outputs, never
> reversed. Also incorporates and demotes to an idea-bank:
> `FACTION-CONFLICT.md`, `faction-conflict-integration-plan.md`,
> `faction-turn-engine-v2-prompt.md` (all archived under `docs/archive/`,
> pointer-linked from `docs/archive/INDEX.md`).
>
> **Companion docs:** `docs/design/living-faction-engine-build-prompt.md`
> turns §4–§14 into a self-contained implementation prompt (still not yet
> built, phases in §15). `docs/design/RESEARCH-AND-DECISIONS.md` carries
> the supplemental research (SWN/OSR community sentiment, the Blades
> progress-clock precedent, copyright/provider reasoning, oracle-content
> sourcing) that justified specific choices below, so it survives
> independently of any one host doc.
>
> **Reconciled with `DESIGN-NEW-FUNCTIONALITY.md` (DNF)** — `CLAUDE.md`'s
> core architectural rules are honored verbatim in §4; the material
> conclusion is that Phase 12f (2026-07-16) **retired the five W-tabs**,
> folding their content into a Story Dashboard + always-visible Co-Pilot —
> so every "WHO/WHERE/WHAT/WHY tab" reference in the source ADRs (including
> 0038) and in this document means a **Dashboard section / Co-Pilot
> control** now, not a tab (§14). The scene NPC Bystanders group §12.2
> feeds into is real, shipped code (Phase 13a/13b, ADR 0041), not a forward
> assumption — `scenes.js`'s `npcStates`/`bystanderIds`. Full reconciliation
> detail: §17.

---

## 1. Purpose and reading order

This is both an **analysis** of where the faction subsystem stands and a
**forward design** for what it should become. Part 1 (§2–§3) is the
analysis: what already exists, what the evolved intent asks for, and where
those collide. Part 2 (§4–§14) is the consolidated design: the invariants
to keep, the model, and each subsystem. Part 3 (§15–§16) is phasing and
risk. A separate companion file, `living-faction-engine-build-prompt.md`,
turns §4–§14 into a self-contained implementation prompt.

The single most important thing to understand before reading further:
**almost all of the machinery already exists.** The prior ADRs built a
faithful SWN turn engine, a provider-abstraction layer, a region-depth
presence query, a conflict entity, a pacing nudge, missions, a frozen
impact diff, and a narrative/read-aloud generator. The evolved intent does
not ask for a rewrite. It asks for five specific behavioral shifts (§3) on
top of that foundation, and this design is deliberately scoped to make
those shifts as reuse-heavy and additive as the prior passes were.

---

## 2. What exists today (inventory)

The following is a load-bearing map: the design in Part 2 reuses these by
name rather than reinventing them.

### 2.1 Architectural substrate

- **Pure domain layer** (`src/domain/*.js`): every mutator takes a
  `campaign`, returns a new one via `clone()`, is DOM-free and
  RNG-injectable, and is unit-tested headlessly under `node --test`.
- **Single persistence module** (`src/core/store.js`).
- **One delegated listener per DOM event type** in `src/ui/shell.js`; every
  interactive control is a `data-*` attribute resolved via
  `target.closest(...)`. No `window.prompt()`.
- **Additive, lazy-defaulted schema**: new fields are initialized on touch;
  no `migrate.js` step is needed for a plain default value/array.
- **Entity system** (`src/domain/entities.js`): typed entities, a generic
  typed-relationship graph (`addRelationship`/`removeRelationship`,
  `RELATIONSHIP_TYPE_TARGETS`, `getRelationshipBetween`), and per-type
  field ensurers (`ensureFactionFields`, `ensureLocationFields`, …).
- **Threads engine** (`src/domain/threads.js`): reusable segmented progress
  clocks ("pips"), already the backing for faction goal tracks and conflict
  escalation clocks, driven by generic `data-thread-adv`/`-back` controls.
- **Story Dashboard + Co-Pilot** — the current workspace shell. Note: the
  five-lens WHO/WHERE/WHAT/WHY/HOW **tabs were retired by Phase 12f
  (2026-07-16, ADR 0040)**; their editable content is now open/collapsible
  **Dashboard sections** and every suggestion/oracle control lives in the
  always-visible **Co-Pilot panel**. The source faction ADRs (0031/0038)
  describe surfacing on "WHO/WHERE tabs" — read those as Dashboard
  sections/Co-Pilot now (§14). Plus Cast, the Entity Editor, `copilot.js`'s
  `advise()`, the oracle-table system (`data/tables.js`, `SCENE_TABLES`),
  and the scene/session generator (`src/domain/session.js`, `scenes.js`).
- **Scene Operating Model (Phase 13, in progress, ADR 0041)** — a scene
  now carries `scenes.js`'s `npcStates` with three groups: **Protagonists**
  (`#character`-tagged), **Antagonists** (other mentioned NPCs), and
  **Bystanders** (GM-added), each expandable to scene-scoped
  Disposition/Motivation/Threat Rank/Challenges/Opportunities, oracle-seeded
  with edits remembered via `oracles.overrides`. This is the pre-existing
  slot the faction Bystanders shift (§12) feeds into — not a new mechanism.

### 2.2 The faction subsystem, as shipped

| Area | Where | What it does today |
|---|---|---|
| SWN content | `data/swnFactionData.js` | 72 assets, 20 tags, 11 goals, XP table, maintenance, auto-abilities — full transcription, activation-gated. |
| Copyright-clean mirror | `data/gmatlasFactionData.js` | Field-for-field original-text mirror, same mechanics/numbers, ungated. |
| Provider registry | `data/factionRulesProviders.js` | `swn` / `gmatlascore` resolved via `factionProviderFor(campaign, faction)`; per-faction override + campaign default + hardcoded fallback. |
| Turn engine | `domain/factionTurnEngine.js` | 9 SWN actions, upkeep, goal pick, `proposeFactionTurn`/`advanceFactionTurnRound`/`commitFactionTurn` (propose-then-confirm), goal tracks via Threads. |
| Event log | `campaign.factionEvents[]` | Faction-Location paired events, frozen `coLocatedFactions`/`witnessed`, `scope` (self / faction-vs-faction / faction-vs-world), `responses`, `readAloud`, `impact`. |
| Impact | `event.impact` (ADR 0035) | Frozen once-computed diff of the **acting** faction's own before/after (HP/FacCreds/assets). No command log, no retcon. |
| Presence | `factionsAtLocation`, `factionsInRegion`, `isSameDistrict`, `getContainingLocation`/`getContainedLocations` | Who is active here / across the region containment tree, stance-tagged. |
| Membership | `getEntityFaction`, `setEntityFactionMembership` (ADR 0034) | `member_of` edge with derived "Unaligned" fallback; conquest flips a location's real membership. |
| Dossier | `getFactionDossier` | Read-only rollup of a faction's members, holdings, goal, allies/rivals, events. |
| Pacing | `settings.factionPacing`, `isFactionRoundDue`, `resetFactionPacing` | Scene-count nudge surfaced by Co-Pilot; never auto-commits. |
| Missions | `domain/missions.js`, `campaign.missions[]` | Faction-sourced jobs with `open→accepted→resolved`/`declined` CRUD. |
| Conflict | `'conflict'` entity type, `domain/factionConflicts.js` | Hero-path/add-depth split, escalation clock (Thread), quick-start generator, `suggestedConflictEscalations`, location-scoped faction picker. |
| Location story | `location.locationStory`, WHERE-tab digest (ADR 0038) | Auto-composed presence/conflict digest + GM-editable narrative field. |
| Narrative | `generateFactionResponses`, `expandEventReadAloud`, event `scope` | Deterministic read-aloud + per-affected-faction reactions on world-scope events. |
| WHAT hook | `pushEvent` → `context.what.threat` +1 | One-directional escalation nudge on witnessed faction-vs-world non-failures. |

### 2.3 Documented scope cuts still in force (before this design)

These were deliberate, defensible cuts at the time. §3 revisits the ones
the evolved intent overturns; the rest stand.

1. **Cross-faction impact cut** (0031/0035): an Attack's damage to the
   *defender's* assets is not folded into the attacker's `impact`.
2. **Seize Planet** is a single-turn HP-pool check, not per-asset siege
   bookkeeping.
3. **Turn scope** is the Active Location (Full Round), not the whole
   system.
4. **Only Threat is nudged** by faction activity; no Reputation feedback,
   no Heat/Hazard field.
5. **Retcon / replayable command log**: cancelled outright; `event.impact`
   is a frozen summary.
6. **Change Homeworld** is one turn regardless of distance.

---

## 3. Conflicts and resolutions (the evolved intent vs. the shipped design)

`Additional scope concepts.txt` restates the design intent after the ADRs
shipped. Read as a whole, it asks for **five behavioral shifts**. Each is
listed with the shipped decision it changes and the resolution adopted here.
Per direct decision, where the evolved intent conflicts with a prior cut,
the cut is reversed.

### 3.1 Automation: auto-decide **with** per-decision editable dropdowns

- **Evolved intent:** turns are "fully automated … without GM interaction"
  so "players see and feel the impact," **and** decisions are "displayed in
  dropdowns that give the GM creative authority to manually change the
  decisions before committing."
- **Shipped decision:** propose-then-confirm, but the review unit is a
  *whole draft* — accept or discard; a full round is all-or-nothing.
- **Conflict:** the two statements in the scope doc read as contradictory
  only if "automated" is taken to mean "un-editable." It does not. The
  reconciliation the doc itself supplies is: **automate every decision, then
  expose each as an editable control before a single commit.**
- **Resolution (adopted):** the engine still auto-computes every faction's
  entire turn (goal, action, target, dice), but the review surface exposes
  **each decision as its own dropdown** — Goal, Action, Target, and (where
  relevant) Asset — pre-selected to the engine's automated choice. Changing
  a dropdown re-proposes that faction's turn (and, within a round, every
  subsequent faction, since the chain depends on prior results — see §6.4)
  against a scratch clone, re-rolling only what the new choice requires. A
  single **Commit** applies the (possibly-edited) chain. This supersedes the
  whole-draft accept/discard model while keeping Article II (the GM always
  retains creative authority) and the "nothing touches the real campaign
  until commit" invariant intact. See §6.

### 3.2 Cross-faction & point-in-time impact (**reversal of cut 2.3.1**)

- **Evolved intent:** "an attack on Faction B by Faction A might damage
  vehicles owned by Faction B which should be determined by assessing the
  assets owned by Faction B and applying consequences to the assets," and
  turn calculations "must factor in point-in-time Entity details for
  Location, Asset, NPC and other Faction entity records."
- **Shipped decision:** cross-faction impact explicitly cut; Seize Planet
  approximated as an HP pool.
- **Resolution (adopted, reversing the cut):** an Attack (and any
  two-sided action) assesses the **defender's actual `factionAssets` at
  resolution time** — their specific HP, type, and stealth — and applies
  consequences to specific assets, not a generic pool. Both sides' diffs
  are computed **once, at propose time** (both faction states are already
  in the scratch clone there) and frozen onto the event as a two-sided
  `impact` object (§7). Crucially, this does **not** reopen the cancelled
  retcon/command-log design: a two-sided frozen diff is still frozen and
  never replayed. The reversal is architecturally cheap precisely because
  the acting-and-target states already co-exist inside `attack()`'s scratch
  clone. See §7.

### 3.3 System-wide turns + off-world news cascade (**reversal of cut 2.3.3**)

- **Evolved intent:** "Make Faction Turn calculations for all involved or
  nearby factions in the system." Turns "are only calculated for the local
  system"; off-world factions "are considered as not evolving in a way that
  affects the story," but "news of factions on other worlds could be
  incorporated as something eventually cascading into the local system."
- **Shipped decision:** Full Round is scoped to the Active Location.
- **Resolution (adopted):** a Full Round processes **every faction present
  in the local system** (via a system-level `factionsInRegion` walk, §8.1),
  not just the single Active Location. Factions with no local presence
  (off-world homeworld, no local assets/members/governance) are **excluded
  from turn calculation** and instead feed a lightweight **off-world news
  cascade** (§9): an occasional oracle-driven news item that can surface as
  a rumor, a Threat nudge, or a future hook — never a full simulated turn.

### 3.4 Bidirectional Faction Reputation loop (**reversal/extension of cut 2.3.4**)

- **Evolved intent:** "Player actions and scene outcomes should affect
  subsequent Faction Turns, relationships, and future opportunities and
  challenges between the players and the faction (i.e. Faction
  Reputation)." Outcomes are "committed and applied to NPC and Location
  Entity records such as Heat trackers, colony ownership, assets owned."
- **Shipped decision:** a one-directional `context.what.threat` +1 nudge;
  no reputation, no Heat field.
- **Resolution (adopted):** introduce a **per-faction party-standing**
  value and a **Heat** field on Locations/NPCs (§10, §11). Scene outcomes
  feed *into* factions via a new `applySceneOutcomeToFactions` hook
  (standing shifts, Heat accrual); faction standing then feeds *out* into
  the turn heuristic (targeting/appetite weighting) and mission generation.
  This closes the loop the scope doc describes without a background
  scheduler — the feedback is applied at scene-resolution and read at
  propose-time.

### 3.5 First-class NPC↔Faction binding and scene Bystanders

- **Evolved intent:** "NPCs are all tied to Factions as indicated in the
  Entity tags that map to Faction Entity types. NPCs of the same faction
  can be in different roles." During a conflict, "NPCs of the rival faction
  could be in the Bystanders … additional challenge or opportunity to the
  scene."
- **Shipped decision:** `getEntityFaction` derives membership with an
  "Unaligned" fallback (0034), but nothing binds NPCs by tag or surfaces
  rival NPCs into scene composition.
- **Resolution (adopted):** formalize tag→faction resolution so an NPC's
  faction tag *is* a membership signal (§12.1), and add
  `factionBystandersFor(campaign, locationId, …)` feeding the scene
  generator's Bystanders slot with rival-faction NPCs present at/near the
  active location, especially when a conflict is live there (§12.2). Same
  NPC, different `role` free-text, is preserved.

### 3.6 Items that carry forward unchanged

- **Modularity/provider swap** (0032) is not a conflict — it is *reinforced*
  as a first-class pillar (§5) and is the seam through which "SWN-exact" and
  "generic + content-creator" rulesets coexist.
- **Retcon stays cancelled** (cut 2.3.5). The two-sided impact of §3.2 is
  explicitly *not* a reopening of it.
- **Seize Planet's** per-asset siege depth (cut 2.3.2) is *partially*
  reopened only insofar as §3.2 requires point-in-time asset assessment for
  the *consequence* application; the multi-turn siege *bookkeeping* remains
  a documented approximation unless a later phase asks otherwise (DNF
  authorizes no deeper SWN gameplay-area mechanics for now — §17).
- **Change Homeworld** distance rule (cut 2.3.6) stays cut.

---

## 4. Architectural invariants (non-negotiable, from `CLAUDE.md`)

Everything in Part 2 is designed to obey these. They are quoted from the
rules recoverable via `faction-turn-engine-v2-prompt.md`:

1. **Pure domain layer.** Every new/changed function in `src/domain/*.js`
   takes a `campaign`, returns a new one via `clone()`, is DOM-free, and
   accepts an injected `rng`. No hidden globals, no `Date.now()` inside a
   resolver.
2. **Single storage module.** Persistence stays in `src/core/store.js`.
3. **One delegated listener per DOM event type** in `shell.js`; every new
   control is a `data-*` attribute read via `target.closest(...)`.
4. **No `window.prompt()`** — new free-text entry uses the existing
   mention-editor/rich-field convention.
5. **Additive, lazy-defaulted schema** — no `migrate.js` step for a plain
   default; a one-time grandfather step only where an existing field's
   *meaning* changes (as 0032 did for the SWN activation gate).
6. **Everything RNG-injectable and headlessly testable** — new behavior
   ships with `node --test` domain tests, no browser dependency.

Any design element below that would violate one of these is wrong and
should be redesigned, not excepted.

---

## 5. Pillar: the Faction Rules Provider (modularity)

The scope doc's first requirement is that "the SWN specific functionality …
must be modular and allow for swapping out with another faction module that
performs the same capabilities without breaking any other app features or
dependencies," with the end state being "SWN-exact rules and a duplicate
generic version that doesn't violate copyright and incorporates more ideas
and content from content creators."

The provider registry (0032) already delivers the core of this. This design
**formalizes it as the one seam** the entire engine depends on, and widens
it to carry the new behavior:

- **Provider interface** (`factionRulesProviders.js`) — the uniform shape a
  provider must supply. Extended from the shipped
  `assets`/`tags`/`goals`/`maintenance`/`autoAbilities`/`find*` to also
  supply, or default:
  - `assetConsequenceModel` — how damage maps onto specific defender assets
    (§7.2). SWN/GMAtlas Core share the mechanical model; a future provider
    may override.
  - `goalHeuristicWeights` — the stat/tag/goal weighting the action-choice
    heuristic uses, so a provider can tune "how this ruleset's factions
    behave" without engine edits.
  - `reputationHooks` — optional per-provider mapping of action outcomes to
    party-standing deltas (§10), defaulting to a generic table when absent.
- **Resolution order (unchanged):** faction's own `rulesProvider` → campaign
  `settings.rulesProviderChoices.factions` → hardcoded fallback.
- **Mixed-provider correctness (unchanged, extended):** two-sided actions
  (§7) resolve **each** faction's own provider independently, so an SWN
  faction can attack a GMAtlas Core one and each side's asset catalog and
  consequence model come from its own provider.
- **Third provider slot (new, forward-looking):** the registry is designed
  so a `community` provider (content-creator material, original or
  properly-licensed) can be registered with the same interface and gated
  the same way SWN is, satisfying "incorporates more ideas and content from
  content creators." No such provider is built in this pass; the seam is.
- **The engine imports no `SWN_*` or `GMATLAS_*` constant directly** —
  every catalog/goal/tag/consequence lookup goes through
  `factionProviderFor`. This is the invariant that makes the module
  swappable "without breaking any other app features."

---

## 6. The turn engine: auto-decide + editable dropdowns

### 6.1 What a "turn" produces

For each processed faction, `proposeFactionTurn` computes, against a scratch
clone, the full SWN turn sequence: pay upkeep → pick/continue a goal →
choose an action via the provider-weighted heuristic → select targets → roll
dice → resolve. This is **unchanged** from the shipped engine except that it
now emits a structured **decision record** alongside the resolved draft:

```
draft.decisions = {
  goal:   { chosenId, options: [{id, label, eligible, difficulty}] },
  action: { chosenId, options: [{id, label, eligible, reason}] },
  target: { chosenRef, options: [{ref, label, stance}] },   // when applicable
  asset:  { chosenId, options: [...] }                       // buy/refit/etc.
}
```

`options` lists every *valid* alternative the GM could pick, each with a
plain-language label and an eligibility flag (greyed, not hidden, when
ineligible — so the GM sees why a thing can't be chosen). The pre-selected
value is always the engine's automated pick.

### 6.2 Editing a decision

Each dropdown is a `data-faction-draft-decision="factionId::field"` control.
On change, `shell.js`'s single `change` listener calls a pure
`reproposeWithOverride(campaign, factionId, field, value, { rng })` which
re-runs that faction's proposal with the chosen value **forced** and
everything downstream re-derived (a new action may invalidate the current
target; a new target re-rolls the attack). The result replaces that
faction's draft in the pending batch. Dice re-roll only for the parts the
override changes; an unchanged upstream decision keeps its already-rolled
result so a GM tweaking a target downstream doesn't reshuffle the goal pick.

### 6.3 Committing

A single **Commit** button applies the pending batch's chained
`resultCampaign` (the last faction's, which already reflects every prior
faction in the batch). `resetFactionPacing` fires here (Step or Full Round,
per the shipped simplification). This is the only point the real campaign
changes.

### 6.4 Chaining and re-proposal within a round

A Full Round chains each faction's proposal against the previous faction's
`resultCampaign`. When the GM overrides faction *k*'s decision, factions
*k+1…n* must be **re-proposed** against the new chain (their inputs
changed). This is the one genuinely new complexity versus the shipped
all-or-nothing batch, and it is required by §3.1's per-decision editing.
Implementation is a pure `reproposeFrom(campaign, batch, k, {rng})` that
recomputes the tail of the chain; the head (0…k-1) is untouched. The batch
remains all-or-nothing at **commit** (no partial per-faction accept), but is
now **editable per-decision before** commit.

### 6.5 Off-by-default and safety

- `scenesPerRound <= 0` remains "off," never "always due" (the shipped
  explicit `!= null` guard is kept — an easy off-by-default bug).
- Every propose path, including `none`/`busy`, still emits a decision record
  and an `impact` (a "did nothing" diff is a valid, useful answer).

---

## 7. Cross-faction & point-in-time impact

### 7.1 Two-sided frozen impact

`event.impact` becomes a **two-sided** object, still computed once at propose
time and frozen forever:

```
event.impact = {
  actor:   { factionId, hpDelta, facCredsDelta,
             assetsAdded, assetsRemoved, assetsChanged },
  targets: [ { factionId, hpDelta, facCredsDelta,
               assetsAdded, assetsRemoved, assetsChanged } ]   // 0..n
}
```

- Self-scoped actions (buy, refit, repair, expand, …) have an empty
  `targets` array — identical information to the shipped single-sided shape,
  just nested under `actor`.
- Attack fills exactly one `targets` entry (the defender). Faction-vs-world
  actions (Expand Influence / Seize Planet) fill one entry per faction that
  actually lost assets/HP in the resolution.
- Backward compatibility: readers guard on the new shape; pre-existing
  single-sided `impact` objects (older events) are read via a tiny
  normalizer that lifts them into `{ actor, targets: [] }` at *display*
  time. No migration of stored events. (DNF is silent on `event.impact` —
  it is a faction-subsystem concern covered by ADR 0035 — so nothing there
  constrains this shape; the two-sided reversal stands.)

### 7.2 Point-in-time asset consequence

`attack()` (and `seizePlanet()`'s resistance tally) stop treating the
defender as an HP pool for the purpose of *what gets damaged*. At resolution
they read the defender's actual `factionAssets` — each asset's current
`hp`, `assetType`, and `stealthed` flag — and the acting provider's
`assetConsequenceModel` maps the dealt damage onto specific assets
(highest-HP-first, or provider-defined), decrementing per-asset HP and
marking destroyed assets removed. The faction's derived HP still bounds the
exchange (SWN's rating-based max HP is unchanged), but the *record* of what
happened now names the vehicles/units lost, satisfying the scope doc's
worked example. Because both faction objects live in the same scratch clone
inside `attack()`, both sides' before/after are captured there for §7.1
with no new plumbing.

### 7.3 Explicitly still out (for this pass)

Multi-turn per-asset **siege bookkeeping** for Seize Planet remains an
approximation — §7.2 assesses assets for *consequence application*, not full
turn-by-turn siege state. Reopen only on request. (DNF confirms
Traveller/SWN gameplay-area mechanics beyond what ships are "unauthored,"
so nothing there requires deeper siege state now.)

---

## 8. System-wide turn scope

### 8.1 "The local system" as the turn boundary

A Full Round processes every faction with real presence in the **local
system** — resolved by a system-level `factionsInRegion` walk anchored at
the current system root (the containment ancestor of the Active Location up
to the system/`#star` node), tagged by stance to the anchor faction. This
replaces "factions at the Active Location" as the round's membership set.
"Involved or nearby factions in the system" = any faction with an asset,
homeworld, Base of Influence, governed location, or `member_of` member
anywhere in the system's containment subtree.

### 8.2 Local vs. off-world

- **Local** (has presence in the system subtree): runs a full turn.
- **Off-world** (homeworld and all presence outside the local system): does
  **not** run a turn — "not evolving in a way that affects the story" — and
  is instead eligible for the news cascade (§9).
- A faction straddling both (local assets + off-world homeworld) is
  **local** for turn purposes; its off-world holdings simply don't generate
  local events.

### 8.3 Step vs. Full Round

Step is unchanged (one chosen faction). Full Round's default membership is
now the system set (§8.1); a GM can still narrow it to the Active Location
via a scope toggle (`data-faction-round-scope="system|location"`,
default `system`) — the evolved intent wants system-wide as the default, but
a location-only round stays available for a GM running a tight scene.

---

## 9. Off-world news cascade

A lightweight subsystem, deliberately *not* the turn engine:

- `generateOffworldNews(campaign, { rng })` (new, in a small
  `domain/factionNews.js` or folded into `factionTurnEngine.js`) picks an
  off-world faction (weighted by campaign relevance — a rival, a patron of a
  local faction, a faction the party has history with) and rolls a small new
  `SCENE_TABLES['Faction News']` oracle group (original content) to produce
  a one-line **news item**: a rumor of an off-world move that *may* later
  matter locally.
- A news item is stored as a `factionEvents` entry with `scope: 'news'` and
  `witnessed: false`, rendered with the existing "News from {location}:"
  display prefix, so it flows through the same feed/filter/read-aloud
  machinery with zero new UI. It carries **no `impact`** (nothing local
  changed) and **does not** run upkeep/goals for that faction.
- Cascade hook: a news item may optionally set a **future local
  consequence** — a deferred Threat nudge or a seeded session hook — that
  fires if/when that off-world faction later gains local presence. Kept
  modest: a flag on the event (`cascade: { condition, effect }`) the
  Co-Pilot can surface, not a scheduler.
- Cadence: surfaced opportunistically (e.g., a small chance per committed
  Full Round, or a GM-triggered "🛰 Off-world news" button), never on a
  timer.

---

## 10. Faction Reputation (the feedback loop)

### 10.1 Storage

Add `faction.partyStanding` — a single dial reusing this app's existing
0–10 relationship-strength convention (5 = neutral; >5 favorable, <5
hostile), lazy-defaulted to 5. **Not** a new scale to relearn (the scope
doc / conflict-plan research both warn against inventing scales). Standing
is per-faction, tracking that faction's specific view of the party.

**Reconciled with DNF:** DNF confirms the app already has a *campaign-wide*
ambient `context.what.reputation` value, driven by **Raise/Lower Reputation
`SHIFTS` reducers** that DNF flags as currently orphaned (reachable from no
UI control — item 12d). So there is **no existing per-faction** reputation
field — `partyStanding` is genuinely new and complementary, not a
duplicate. The two are wired together rather than competing: when
`applySceneOutcomeToFactions` (§10.2) shifts a faction's `partyStanding`, a
large or threshold-crossing swing **also** nudges the ambient
`context.what.reputation` through the existing `applyShift`/`SHIFTS`
mechanism (Raise/Lower Reputation) — which has the happy side effect of
finally giving those orphaned reducers a live driver. Per-faction standing
answers "how does *this* faction feel about the party"; the ambient value
stays "the party's overall reputation in the world."

### 10.2 Inbound: scene outcomes → factions

`applySceneOutcomeToFactions(campaign, sceneOutcome, { rng })` — called at
scene resolution (from `session.js`, alongside the existing pacing
increment). Given a resolved scene tagged with the factions it touched and
whether the party helped/opposed each, it:

- shifts each touched faction's `partyStanding` by a small delta (±1,
  clamped 0–10), via the provider's `reputationHooks` when present;
- accrues **Heat** (§11) on the scene's Location and on directly-implicated
  NPCs when the party's action would draw faction attention;
- may append a session hook to a faction whose standing crossed a threshold
  ("they now consider you a threat / an ally").

### 10.3 Outbound: standing → subsequent turns

The action-choice heuristic and auto-targeting read `partyStanding`:

- A faction with **low** standing weights aggressive actions (Attack,
  Expand Influence into party-relevant locations) and is more willing to
  target party-aligned entities.
- A faction with **high** standing weights mission-offering / cooperative
  outcomes and avoids striking party-aligned targets.
- Mission generation (`generateMission`) uses standing to bias whether a
  hot faction's activity surfaces as a **job offer** (high) or a **threat
  hook** (low).

This is the concrete mechanism behind "players see and feel the impact":
what they did last session changes who moves against them next round.

---

## 11. Committing outcomes to NPC and Location records (Heat)

The scope doc requires turn/scene outcomes to be "committed and applied to
NPC and Location Entity records such as Heat trackers, colony ownership,
assets owned."

- **Colony ownership** and **assets owned** already commit (0034 conquest
  flip; `factionAssets` mutations). Kept.
- **Heat** is new: add a lazy-defaulted `heat` field (integer, default 0) to
  Location and NPC ensurers. Heat represents accumulated faction/party
  attention on a place or person. It is written by
  `applySceneOutcomeToFactions` (§10.2) and by faction turn commits that
  target a location/NPC, and read by the WHERE/WHO digests and the Co-Pilot
  ("this location is hot — factions are watching it"). Heat decays slowly
  (an optional per-round `-1` toward 0) so it's a live signal, not a
  ratchet. **Reconciled with DNF:** confirmed there is **no** existing
  Heat/Hazard field — `context.what` carries only
  threat/mystery/resources/reputation/stress (0032 said as much; DNF's
  reducer list corroborates it). `heat` is therefore a genuinely new
  per-entity field, not a duplicate of the ambient `stress`/`threat`
  values. It is deliberately per-Location/per-NPC (a *place* or *person*
  runs hot), which none of the existing ambient `context.what` values can
  express.
- All commits go through the existing generic `updateEntity`; no new mutator
  per field.

---

## 12. Faction ↔ NPC binding and scene Bystanders

### 12.1 Tag-driven membership

An NPC's faction affiliation may come from either a real `member_of` edge or
an **entity tag that names a faction** (e.g. `#faction:house-vantry`, or a
tag whose value resolves to a faction entity). `getEntityFaction` is
extended so a faction-typed tag is a first-class membership signal, ranked:
explicit `member_of` edge → resolvable faction tag → derived "Unaligned."
Same faction, different `role` free-text on the NPC, is preserved (an NPC's
role is its own field, not its faction). This makes "NPCs are all tied to
Factions … NPCs of the same faction can be in different roles" true by
construction, and every faction-scoped view (dossier, presence, Bystanders)
picks them up for free.

### 12.2 Bystanders in scene composition

`factionBystandersFor(campaign, locationId, { conflictAware = true })`
(new, pure) returns NPCs whose faction is a **rival** (by
`relationshipStanceBetween`, weighted by `partyStanding`) and who are
present at or near `locationId` via `factionsInRegion`. When a **conflict**
(`'conflict'` entity) is live at the location, rival-faction NPCs on the
opposing side are prioritized.

**Reconciled with DNF (reuse Phase 13b, don't invent a slot):** the scene
model already has a **Bystanders** NPC group on `scenes.js`'s `npcStates`
(ADR 0041 / Phase 13b) — Protagonists (`#character`-tagged) / Antagonists
(other mentioned) / **Bystanders (GM-added)**, each with scene-scoped
Disposition/Motivation/Threat Rank/Challenges/Opportunities and
`oracles.overrides` memory. So this shift is not a new scene-generator slot:
`factionBystandersFor` **suggests** rival-faction NPCs *into that existing
Bystanders group*, pre-seeding their scene fields from faction context (a
rival lieutenant arrives with a Motivation and Threat Rank already sensible).
This is exactly the roleplay hook the scope doc describes — drop a rival into
an otherwise unrelated scene — built by extending the shipped 13b group, not
paralleling it. Suggested, never auto-inserted (Article II); a GM adds the
offered Bystander the same way 13b already supports GM-added ones.

---

## 13. Conflict subsystem (carried forward, integrated)

ADR 0036's design stands and is adopted wholesale — it is the correctly
validated shape (hero-path always-visible, "Add depth" collapsed, one
escalation clock, one-click quick-start). The consolidation only wires it to
the shifts above:

- **Escalation suggestions** (`suggestedConflictEscalations`) already fire on
  commit. With system-wide rounds (§8) they now see more events per commit;
  the suggestion prompt lists one line per (event, conflict) match, still
  GM-confirmed, never auto-advanced.
- **Bystanders** (§12.2) become conflict-aware: a live conflict at a
  location is the strongest signal for surfacing rival NPCs.
- **Cross-faction impact** (§7) makes a conflict's escalation feel earned —
  an Attack that actually destroyed a named defender asset is a stronger
  escalation trigger than a bare HP tick.
- The flat 18-field `FACTION-CONFLICT.md` schema stays **rejected** in favor
  of the hero-path/add-depth split; `power_symmetry`/`escalation_appetite`
  stay **cut** (the scope doc does not ask for them and the research flagged
  them as spreadsheet-feeling). The rich spec remains the *idea bank* behind
  the "Add depth" fields.

---

## 14. UI surfaces (where each shift shows up)

No new tab — and, per DNF, **no W-tabs at all**: since Phase 12f (ADR 0040)
the workspace is a **Story Dashboard** of open/collapsible sections plus an
always-visible **Co-Pilot** panel that holds every suggestion/oracle
control. Every shift lands on an existing surface, additive, mapped to that
model:

- **Faction Events panel** (a Dashboard-docked panel, unchanged in
  placement) — the turn-review list gains **per-decision dropdowns** (§6) in
  place of the whole-draft accept row; a **round-scope toggle** (§8.3); the
  two-sided **assets-affected** display (§7.1) showing both attacker and
  defender losses; an **off-world news** control and news entries in the
  feed (§9). The Roster/Missions/Conflicts/Round-History sections are
  unchanged.
- **Entity Editor (faction card)** — gains a **party-standing** dial (§10),
  a **Reputation/Heat** readout, and (unchanged) the Turn History with
  focused-event highlight. The two-sided impact means a faction's Turn
  History now also shows turns where it was the *defender* (its own side of
  someone else's attack), read from `event.impact.targets`. This is also the
  natural home to finally surface `getFactionDossier` (DNF item 12e — built
  and tested, currently unwired): the standing/Heat/dossier readout is one
  addition, not several.
- **WHO Dashboard section** — the retired WHO tab's content is now a
  Dashboard section; "Factions active nearby" lives here. Add the
  **Bystanders** affordance (§12.2) that suggests rival NPCs into the
  existing Phase 13b `npcStates` **Bystanders** group when a conflict or
  rival presence is live at the current location.
- **WHERE Dashboard section** — the location digest (0038, now a Dashboard
  section not a tab) gains **Heat** (§11) and, when present, off-world
  **news** relevant to this location. `locationStory` and the
  presence/conflict blocks are unchanged.
- **Co-Pilot panel** — the reputation loop's outbound effects and the
  Threat nudge surface here as **standing/Heat-aware observation branches**
  (same priority-chain shape as the shipped `hotFaction`/`hotFactionGoal`
  signals) — the right home now that Phase 12f moved all suggestion controls
  into Co-Pilot. The one-click "Generate mission from them" and off-world
  news prompts live here too.

**Constitution note:** Phase 12f's tab retirement was itself recorded as an
explicit, escalating reversal of **Article X** ("the workspace changes, not
the application"). These faction surfaces inherit that decision — they are
Dashboard sections by construction, and must not reintroduce a W-tab.
**Article II** (GM retains creative authority) and **Article IX** (extend
via what exists) continue to govern, as in the source ADRs.

---

## 15. Phasing

Each phase is independently shippable and additive, mirroring the prior
ADR cadence. Phases are ordered by dependency, not necessity.

1. **Phase 1 — Provider hardening (§5).** Formalize the interface, add the
   `assetConsequenceModel`/`goalHeuristicWeights`/`reputationHooks` slots
   with SWN/GMAtlas Core defaults, prove the engine imports no ruleset
   constant directly. Pure refactor + tests; no behavior change.
2. **Phase 2 — Two-sided point-in-time impact (§7).** The §3.2 reversal.
   Highest-value single change; enables richer conflict escalation and Turn
   History without any UI redesign.
3. **Phase 3 — Auto-decide dropdowns (§6).** The §3.1 automation shift.
   Decision records, `reproposeWithOverride`, tail re-proposal, UI dropdowns.
4. **Phase 4 — System-wide rounds + off-world news (§8, §9).** The §3.3
   reversal + cascade.
5. **Phase 5 — Reputation + Heat (§10, §11).** The §3.4 loop; depends on the
   scene-resolution hook.
6. **Phase 6 — NPC binding + Bystanders (§12).** The §3.5 shift; depends on
   presence queries and (for prioritization) Phase 5's standing.

Conflict (§13) needs no dedicated phase — it is wiring already-shipped 0036
to the outputs of Phases 2–6.

## 16. Risks, open questions, and reconcile points

- **DNF reconciled (§17).** The formerly-open items are closed: no existing
  per-faction reputation or Heat field (both new, §10/§11); no flat-`impact`
  assumption (§7.1); no siege requirement (§7.3); nothing in DNF forbids
  §6's auto-decide model (Phase 12 shows DNF actively *reverses* prior
  automation-limiting articles when a direct request justifies it). The one
  live consequence is the **W-tab retirement** (§14) — verify no faction
  surface reintroduces a tab.
- **Re-proposal cost (§6.4).** Editing an early faction re-proposes the tail
  of a large system-wide round. For big campaigns this is more compute per
  edit than the shipped all-or-nothing batch. Mitigate by memoizing
  unchanged-input proposals; acceptable because it is pure and off the
  render path, but validate on the largest realistic campaign.
- **Reputation tuning (§10).** ±1 deltas and 0–10 clamping are a starting
  point; the outbound weighting (standing → aggression) is the part most
  likely to feel wrong at the table and should be a tunable provider weight,
  not a hardcoded curve.
- **Heat semantics (§11).** Decay rate and what exactly accrues Heat are
  judgment calls; keep them provider/settings-tunable and default gentle so
  Heat reads as a live temperature, not a punishment meter.
- **Off-world relevance weighting (§9).** "Which off-world faction's news
  matters" is subjective; anchor it to concrete signals (rival-of-a-local,
  patron-of-a-local, party-history) rather than a flat random pick.
- **Automation vs. Article II.** §6 keeps the commit gate, satisfying "GM
  retains creative authority" while delivering "fully automated"
  computation. If a future request wants a true no-gate autopilot, that is a
  *new* design (a toggle, per the option not chosen here), not a tweak to
  this one.

---

## 17. Reconciliation with `DESIGN-NEW-FUNCTIONALITY.md`

This design was checked against DNF (the roadmap doc) and the Design
Constitution (`requirements/`, ADR 0001) before acceptance; net result: no
reversal of any decision in this document, one significant surface
correction (Dashboard/Co-Pilot, not tabs — §14), and two "reuse the
shipped thing" tightenings (13b Bystanders §12.2, the ambient-reputation
wiring §10.1). See `docs/archive/design/LIVING-FACTION-ENGINE.md` for the
full finding-by-finding reconciliation table (every row there restates a
fact this doc already states in its own relevant section, above).

## Appendix A — Requirement → section traceability

| `Additional scope concepts.txt` statement | Addressed in |
|---|---|
| Modular, swappable faction module; SWN-exact + generic + creator content | §5 |
| Automated decisions shown in editable dropdowns, GM changes before commit | §3.1, §6 |
| NPCs tied to factions via tags; same faction, different roles | §3.5, §12.1 |
| Rival NPCs as scene Bystanders during conflict | §12.2, §13 |
| Turn calculations for all involved/nearby factions in the system | §3.3, §8 |
| Local-system turns only; off-world news cascades in | §8.2, §9 |
| Fully automated growth/conflict/opportunity so players feel impact | §6, §10 |
| Player/scene outcomes affect subsequent turns, relationships, reputation | §3.4, §10 |
| Outcomes committed to NPC/Location records (Heat, ownership, assets) | §11 |
| Point-in-time entity details; cross-faction asset consequences | §3.2, §7 |
