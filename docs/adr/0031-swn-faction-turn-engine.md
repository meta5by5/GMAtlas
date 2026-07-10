# ADR 0031 — SWN Faction Turn Engine

## Status

Accepted and implemented (2026-07-09). Supersedes `docs/adr/0011-swn-cwn-
content.md`'s copyright stance for factions specifically (see that ADR's
Status line) — every other piece of ADR 0011 is untouched. Builds on top
of `domain/factions.js`'s existing Force/Cunning/Wealth mini-game rather
than replacing it; extends the Faction entity type introduced there,
`domain/threads.js`'s Thread engine, and `docs/adr/0022`'s inline-prompt/
delegated-handler conventions.

## Context

Direct ask: "Design and build the interface for playing the SWN faction
turn mechanics leveraging the WHO-WHERE-WHAT-WHY-HOW tabs. Include all
the decision options and per-faction details as Faction Events records
tied to individual factions... This should allow an automated turn
sequence that can be advanced in full rounds for all factions or
step-by-step... The automation should allow faction events to happen
apart from the character events as a form of 'living world'." A follow-up
requested the Faction Log surface as "a window anchored to the left edge
and opens and resizes like the PDF viewer" rather than a normal drawer.

Before building anything, three scope questions were put to the user
directly (`AskUserQuestion`), because the existing `domain/factions.js`
mini-game had deliberately gone the OTHER way on the first of them:

1. **Content fidelity** — reuse SWN's real, named assets/tags/goals in
   full, or stay with ADR 0011's "original reimplementation, mechanic-
   shape only" posture? **Chosen: full transcription** (same "owned
   sourcebook in the Reference Library, transcribed for personal GM use"
   posture `docs/adr/0026`'s HOSTILE Locations gazetteer already used) —
   this explicitly reverses ADR 0011's more cautious call for factions.
2. **Automation depth** — fully autonomous, propose-then-confirm, or
   step-only? **Chosen: propose-then-confirm.** A "full round" or "step"
   computes every faction's turn (goal, action, targets, dice) as a
   review-first draft; nothing is committed until the GM accepts —
   matches Article II (the GM always retains creative authority) and the
   "not a background scheduler" posture `domain/factions.js`'s own header
   comment already established.
3. **Where does the Faction Log live** — a normal drawer, folded into
   Journal, or inspector-only? **Chosen: a new drawer**, then refined by
   the left-edge follow-up into its own fixed panel (see UI section
   below) rather than the standard tab-strip drawer.

The actual SWN Faction Turn ruleset (turn sequence, six stats, ~50+ named
assets across Force/Cunning/Wealth 1-8, 23 tags, 11 goals — the
sourcebook itself has 11, not the commonly-cited 9 — and the XP cost
table) was extracted directly from `assets/docs/Stars Without Number
Revised - Deluxe Edition.pdf` (pp.216-231, "Factions, Assets, and
Turns"/"Faction Actions"/"Faction Goals"/Cunning-Force-Wealth Asset
tables/"Faction Tags") via a throwaway `pdfjs-dist` Node script
(`npm install --no-save`, removed afterward — the same one-off technique
used for the Fomalhaut Settlement Zone gazetteer pass), not reconstructed
from memory.

## Decision

**Data — `src/data/swnFactionData.js` (new)**: full transcription, same
posture as `data/hostileUwpTables.js` (small, citable reference tables +
`findX()` helpers). `SWN_FORCE_ASSETS`/`SWN_CUNNING_ASSETS`/
`SWN_WEALTH_ASSETS` (24 each, 72 total, verified unique ids), stat lines
(hp/cost/tl/attack/counter) transcribed verbatim since they're the
mechanically load-bearing numbers; `special` ability text condensed to a
sentence (the same "condensed prose, not verbatim paragraphs" house style
ADR 0026 already used for HOSTILE). `SWN_FACTION_TAGS` (20, one —
Planetary Government — flagged `repeatable`), `SWN_FACTION_GOALS` (11,
each a `difficulty` FUNCTION of the acting faction's stats, matching the
book's own per-goal formulas), `SWN_XP_TABLE` (rating 1-8 →
{xpCost,hpValue}), `SWN_ASSET_MAINTENANCE` (the 4 assets the book
actually calls out a per-turn upkeep cost for), `SWN_AUTOMATIC_ASSET_
ABILITIES` (the ~5 simple dice-for-FacCreds abilities resolved
mechanically — see Scope below).

**Schema — Faction entity** (`entities.js`'s new `ensureFactionTurnFields`,
called from the existing `ensureFactionFields`, same lazy-default shape
already proven twice for World Profile/Diplomacy Engine fields): `hp`
(current; max is always DERIVED via `computeFactionMaxHp()` — `4 +
hpValue(force)+hpValue(cunning)+hpValue(wealth)` — never stored, so it
can't drift out of sync with the three base stats), `facCreds`, `xp`,
`homeworldId`/`basesOfInfluence` (real Location entity references, same
dropdown-of-existing-entities pattern HOSTILE's `#star`/`#base` fields
established), `factionAssets` (a NEW structured array — the existing
free-text `assets` chip list and its 🎲 roll button from ADR 0011 are
untouched, zero collision), `factionTags`, `governedLocationIds`
(Planetary Government's repeatable-per-world case, kept structurally
separate from `factionTags` per the book's own note), `currentGoalId`,
`seizeProgress`, `busyUntilTurn`. **Top-level campaign**: `factionLog: []`
and `factionTurnNumber: 0` (additive, no migration step needed — confirmed
via `schema.js`/`migrate.js`'s existing deep-merge-default pattern).
`setFactionStat` (ADR 0011) now also clamps `hp` down (never up) if a
lowered stat drops the derived max — Repair Asset/Faction is the only way
to raise it back.

**Goal progress reuses Threads**, not a new mechanism: a `kind:'faction-
goal', factionId, goalId` Thread (`domain/factionTurnEngine.js`'s
`ensureFactionGoalTrack`/`getFactionGoalTrack`, mirroring `domain/
factions.js`'s Pressure Track exactly), `segments` = the goal's computed
difficulty. `advanceGoalProgress()` applies whatever delta matches the
active goal's countable criteria (assets-destroyed-by-type, HP damage
dealt, FacCreds spent, Expand Influence/Seize Planet completions) —
completing it awards `xp += segments` and clears `currentGoalId`. Renders
automatically in the WHY tab's existing unfiltered thread list (the same
way the Pressure Track already does) and in the Faction inspector's own
card.

**Domain engine — `src/domain/factionTurnEngine.js` (new file,
`domain/factions.js` left completely untouched)**: all 9 SWN actions
built, not a subset — `attack`, `buyAsset`, `sellAsset`,
`repairAssetOrFaction`, `refitAsset`, `expandInfluence`, `changeHomeworld`,
`seizePlanet`, `useAssetAbility` — plus `payFactionUpkeep`
(income/maintenance), `pickGoalIfNone`, and the propose/commit pair:
`proposeFactionTurn`/`proposeFactionStep`/`advanceFactionTurnRound` compute
a full draft (goal check, action choice via a stat/tag/goal-weighted
heuristic, targets, every die roll) against a SCRATCH clone and return it
for review — nothing touches the real campaign until `commitFactionTurn`
hands back the draft's own already-fully-resolved `resultCampaign`. A
full round chains each faction's proposal against the PREVIOUS faction's
`resultCampaign` (so later drafts already reflect earlier ones in the
same batch) — by design this makes a round's drafts an all-or-nothing
batch for this pass: "Commit All" applies the chain; there's no partial
per-faction accept once a round has been proposed (re-run for a fresh
batch instead). `Attack`'s stat math: the attacking asset's OWN category
(Force/Cunning/Wealth) supplies the attacker's bonus; the Attack line's
named `vs` stat supplies the defender's — transcribed exactly per the
book's own worked example (a Cyberninja unit adds Cunning to attack, the
target adds whichever stat the attack targets).

**Co-Pilot**: `factionsWithGoalNearCompletion()` mirrors
`factionsUnderPressure()` exactly (same ≥75%-filled threshold), new branch
in `copilot.js`'s `advise()` priority chain right beside the existing
`hotFaction` check.

## UI

**Faction inspector** (`ui/drawers/index.js`'s `factionSection`, extended,
not replaced — ADR 0011's stats/pressure-track card stays exactly as it
was): a new "Faction Turn (SWN)" card with HP/FacCreds/XP (editable number
inputs, first plain-number `data-entity-field`s in the app — `shell.js`'s
generic handler gained a `t.type === 'number'` coercion branch for this),
a Homeworld dropdown, Bases of Influence + Tags (dropdown-add/chip-remove,
the same pattern World Profile's Bases/Trade Codes already established),
a Goal picker + its Thread-backed clock, and the structured Assets list
with Repair/Use Ability/Sell buttons. **Attack is deliberately NOT a
direct inspector button** — picking a rival faction/asset pair is
inherently a two-sided decision better made in the turn-review flow below,
not a single-click action on one faction's own card.

**Faction Log — a left-anchored, auto-resizing panel, NOT the normal
`DRAWERS`/`EDGE_ORDER` tab-stack**, per the direct follow-up request. Modeled
directly on the in-app PDF/document viewer (`.mc-doc-viewer`), which turned
out to already be a separate fixed-position element (`position:fixed;
left:0; right:calc(var(--edge-w) + var(--viewer-overlap,0px))`,
toggled via a `hidden` attribute, resizing live via `sidePanelInsetPx(doc)`
whenever a drawer opens/closes/collapses beside it) rather than a
`DRAWERS` entry at all — the Faction Log panel (`.mc-faction-log`) copies
that exact shape with its own `--factionlog-overlap` var (same
`sidePanelInsetPx` helper, reused not duplicated), toggled by a new "⚔
Factions" header button (`data-faction-log-toggle`) and its own ✕, with
its body rendered by a new `src/ui/drawers/factionLog.js` (split out of
the already-2287-line `drawers/index.js` purely for size — called
directly from `shell.js`'s `render()`, not through `renderDrawer()`'s
switch, since the panel isn't part of that dispatch). Contents: Step
(pick one faction, propose its single draft) / Full Round (propose every
eligible faction, chained) controls, a review list of the current
drafts (Commit All / Discard), and the committed, reverse-chronological
`factionLog` feed with a per-faction filter dropdown.

## Scope, called out explicitly

- **Seize Planet** is a single-turn HP-pool check against total
  unstealthed rival HP at a location, continued via `seizeProgress`
  across turns — not the book's full multi-turn siege bookkeeping tracked
  per specific asset.
- **Change Homeworld** always takes exactly one turn to transit — the
  book's "+1 turn per hex of distance" isn't modeled, since most
  Locations in a non-Hostile genre pack carry no hex coordinate at all
  (HOSTILE's own gazetteer worlds do, via ADR 0026's World Profile, but
  this feature isn't Hostile-specific).
- **Use Asset Ability** mechanically resolves only the ~5 simple,
  self-contained dice-for-FacCreds abilities (Harvesters, Postech
  Industry, Venture Capital, Pretech Manufactory, Commodities Broker).
  Every other asset's special text (Blackmail, Lobbyists, Seductress,
  Monopoly's forced sale, Treachery's side-switch, ...) is surfaced
  verbatim for the GM to adjudicate directly — simulating all ~20 bespoke
  effects in code was out of scope for this pass, and matches SWN's own
  stated design philosophy that the system "is not meant to be a
  standalone game that doesn't require GM involvement."
- **Expand Influence's contested roll** applies a flat 1d6 hit to the new
  Base for any rival that beats the Cunning contest, rather than letting
  that rival choose a specific asset to strike with — a deliberately
  simple stand-in for a full targeted counter-attack.
- **A full round's drafts commit as one all-or-nothing batch** (see
  Domain engine above) — no partial per-faction accept/reject within an
  already-proposed round.

## Alternatives considered

- **Keep ADR 0011's original-reimplementation posture, invent new asset/
  tag/goal names.** Rejected per the user's explicit, direct choice after
  the fidelity question was put to them — "include all the decision
  options" plus the follow-up confirmation both point at the real book's
  content, not an original substitute.
- **Fully autonomous turn resolution (no review step).** Rejected — a
  true background simulation with no GM checkpoint contradicts Article II
  and this app's standing "GM-triggered bulk action, not a scheduler"
  posture for faction turns specifically.
- **Fold the Faction Log into the existing Journal, or inspector-only, no
  campaign-wide feed.** Rejected per the user's own stated preference —
  a dedicated, filterable feed reads better for "what did every faction do
  this round" than mixed-in session notes or hunting through each
  faction's own card one at a time.
- **A normal `DRAWERS` tab-stack entry for the Faction Log.** Superseded
  mid-build by the direct "anchor it to the left edge, resize like the PDF
  viewer" follow-up — implemented as its own fixed panel instead (see UI
  above).

## Consequences

- A GM who never touches this system sees zero behavior change — every
  new field is additive/lazy-defaulted, `domain/factions.js`'s existing
  mini-game is untouched, and the new "⚔ Factions" header button plus
  Faction Turn inspector card are simply new, ignorable surface area.
- `domain/factionTurnEngine.js` is a genuinely large new domain module
  (9 actions, propose/commit, goal tracking) — kept pure/DOM-free/RNG-
  injectable throughout, same discipline as every other domain module, so
  `node --test` covers all of it headlessly (30 new tests: data-table
  integrity, field defaults, each action's happy/failure path, the
  propose→commit round-trip, a full round's chaining/turn-number
  bookkeeping, and the Co-Pilot hook).
- The three scoped-down pieces above are real gaps against a 1:1 SWN
  implementation, not oversights — a future pass could deepen Seize
  Planet's siege bookkeeping or simulate more `useAssetAbility` effects if
  a GM finds the GM-adjudicated fallback too manual in practice.

## Related packs / ADRs

`docs/adr/0011-swn-cwn-content.md` (the Force/Cunning/Wealth mini-game this
extends), `docs/adr/0026-hostile-canon-locations.md` (the "transcribe an
owned sourcebook for personal GM use" precedent this ADR's content-fidelity
decision follows), `docs/adr/0022-inline-prompt-standard.md` (the
delegated-handler/no-`window.prompt()` conventions this UI follows).
