# ADR 0032 — GMAtlas Core Faction Provider, Game System Activation, Event Scope/Response Logging, Read-Aloud Narrative, WHAT-tab Consequence Hook

## Status

Accepted and implemented (2026-07-10). Extends `docs/adr/0031-swn-faction-
turn-engine.md` (the SWN Faction Turn Engine this ADR adds a second content
provider to) and revises `docs/adr/0011-swn-cwn-content.md`'s copyright
posture once more — 0031 already partially superseded 0011 "for factions
specifically" by transcribing SWN's real content; this ADR doesn't reverse
that, but adds a Game System Activation gate 0031 didn't have, plus a fully
original, ungated alternative provider. Also touches `docs/adr/0002-rules-
constitution.md` (Rules Constitution moves from a read-only reference table
to real per-area dropdowns).

## Context

Direct ask, four parts, arrived across two rounds of the same request:

1. **Faction Events completeness** — "The Faction Events tab should have
   all the options, flags and status visible that is involved in the SWN
   faction management system. Everything should be editable and have
   dropdowns where SWN presents options." Real gaps existed against ADR
   0031's own scope: no UI for Refit Asset or Change Homeworld (the domain
   functions existed, nothing called them), no way to see/toggle an
   asset's Stealthed flag, and `governedLocationIds`/`seizeProgress`/
   `busyUntilTurn`/`missedMaintenance` — all real schema fields — had no
   visible surface anywhere. The Faction Events panel itself only ever
   showed the event feed, never a faction's live state.
2. **Copyright** — "as well as make a GMAtlas Core version that duplicates
   but does not violate copyright. Both systems should be switchable in
   the settings under Rules Constitution, which should have dropdowns of
   Providers for each Gameplay Area." ADR 0031's "owned sourcebook,
   transcribed for personal GM use" posture is fine for a purely local
   tool, but this app also deploys to GitHub Pages — public distribution,
   not personal use — so that posture doesn't hold by default for anyone
   who isn't the original author.
3. **Follow-up, on direct request**: every new status/flag must also feed
   a GM-editable, read-aloud-able narrative, framed by proximity to the
   party (witnessed vs. news); the "official game functionality" (SWN's
   transcribed content) must sit behind an explicit activation gate in
   Settings, with a note that "this needs to be connected to a licensing
   activation module" later; the committed event feed must classify
   self/faction-vs-faction/faction-vs-world decisions and log a response
   statement for every affected faction, not just the acting one — the
   named case being a 5PFH-style "an invasion forces the party to flee,
   and every local faction's activity is affected" scenario; faction
   activity must ripple into the WHAT tab (oracles/threat/etc.), not stay
   siloed in its own panel.

Scope confirmed via `AskUserQuestion` across two rounds: GMAtlas Core is a
full 1:1 mechanical mirror of SWN's faction content (same ratings/HP/cost/
dice/difficulty formulas — mechanics and numbers aren't copyrightable
expression — but every name and all flavor/special-ability/tag/goal text is
original writing, never a paraphrase of SWN's own wording); Rules
Constitution gets a dropdown on every one of its 19 gameplay areas, even
though 18 of them have exactly one non-functional provider today (a
recorded preference for the still-future Phase 9 Activity → Rules Lens
work, not a live engine for those areas); provider choice is a campaign-
wide default (`settings.rulesProviderChoices.factions`) with a per-faction
override (`faction.rulesProvider`), mirroring the existing `settings.
statRuleset` + per-entity-ruleset pattern already used for character
sheets; the SWN activation gate defaults OFF for a fresh campaign (GMAtlas
Core is the effective, safe default) but is grandfathered ON for any
campaign that already has real SWN faction-turn data, so nothing already
built anywhere breaks; the read-aloud generator is a deterministic,
template-composed paragraph (the same technique `domain/scenes.js` already
uses to build scene text from rolled fragments) — no AI call, this app is
offline-first and zero-dependency.

## Decision

**Data — `src/data/gmatlasFactionData.js` (new)**: a field-for-field
mirror of `swnFactionData.js` — `GMATLAS_FORCE_ASSETS`/
`GMATLAS_CUNNING_ASSETS`/`GMATLAS_WEALTH_ASSETS` (24 each, same order, so
every SWN entry has a positional GMAtlas counterpart with identical
`rating/hp/cost/tl/attack/counter/permission/hasAction`), `GMATLAS_
FACTION_TAGS` (20, one repeatable, identical mechanical effects), `GMATLAS_
FACTION_GOALS` (11, identical `difficulty` functions/`countable`
criteria), `GMATLAS_ASSET_MAINTENANCE`/`GMATLAS_AUTOMATIC_ASSET_ABILITIES`
(same formulas, new asset ids), plus parallel `findGmatlas*` helpers
matching `findSwn*`'s signatures exactly. `assetType` category labels
(Military Unit/Special Forces/Facility/Starship/Tactic/Logistics Facility)
and the engine's own action-id vocabulary (Attack/Buy Asset/Seize Planet/
...) are generic mechanical terms, kept identical on purpose — only asset/
tag/goal names and `special`/`effect`/`description` prose are original.
Verified: no id collisions within GMAtlas's own catalog, no id/name
collision against SWN's, and position-for-position mechanical equality
against SWN across all three asset lists and all 11 goals.

**Provider registry — `src/data/factionRulesProviders.js` (new)**:
`FACTION_RULES_PROVIDERS` maps `'swn'`/`'gmatlascore'` to a uniform shape
(`assets`/`tags`/`goals`/`maintenance`/`autoAbilities`/`findAssetAnyStat`/
`findTag`/`findGoal`). `factionProviderId(campaign, faction)` resolution
order: the faction's own `rulesProvider` wins, else `campaign.settings.
rulesProviderChoices.factions`, else `'swn'` (the hardcoded fallback keeps
every pre-existing campaign/test's behavior unchanged by default).
`factionProviderFor` resolves the same to the full provider object.

**Engine — `domain/factionTurnEngine.js`**: every catalog lookup
(`buyAsset`/`sellAsset`/`repairAssetOrFaction`/`refitAsset`/`seizePlanet`/
`useAssetAbility`/`payFactionUpkeep`/`candidateActions`/`autoArgs`/
`pickGoalIfNone`/`ensureFactionGoalTrack`/`advanceGoalProgress`) now
resolves `factionProviderFor(campaign, faction)` instead of importing
`SWN_*` constants directly. `attack` is the one function touching two
factions at once — attacker and defender each resolve their OWN provider
independently, so a mixed-provider campaign (per the per-faction-override
decision) can have an SWN faction attack a GMAtlas Core one, or vice
versa, each side's catalog lookup always using its own faction's choice.
The shared HP-by-rating table (`entities.js`'s `computeFactionMaxHp`, this
file's own inlined copy) is a generic numeric progression, not SWN-
specific content — unchanged, used as-is by both providers.

**New engine functions**: `toggleAssetStealth(campaign, {factionId,
factionAssetId})` — a manual flag flip, no dice/cost/event (SWN normally
sets Stealth via specific assets/tags; this exposes it as a directly
editable status per the "everything editable" ask). Event `scope`
(`ACTION_SCOPE` lookup: `self` for every internal action, `faction-vs-
faction` for Attack, `faction-vs-world` for Expand Influence/Seize
Planet). `generateFactionResponses(campaign, event, rng)` — for a
`faction-vs-world` event only, one `{factionId, factionName, stance,
statement}` per co-located faction, picked from a small stance-keyed
template table, stored as `event.responses` (not separate top-level
`factionEvents` entries, so the feed doesn't multiply N-per-world-event);
generic over any event shape (`locationId`/`coLocatedFactions`/`scope`),
not hardcoded to the 9 SWN actions, so a future non-faction-turn "world
event" generator could reuse it. `expandEventReadAloud(campaign, event)` —
a pure, RNG-free template composer producing a 2-4 sentence paragraph from
fields already on the event (action, outcome, location, witnessed-vs-news
framing, co-located stances, `responses`), stored on-demand as `event.
readAloud` via `setEventReadAloud` (also used for the GM's own hand-edits
afterward). WHAT-tab hook: `pushEvent` (the one funnel every committed
event passes through) nudges `context.what.threat` by +1 (clamped at 10,
mirroring `session.js`'s `continueStory()` "consequences gently escalate"
heuristic exactly) for any event that's `faction-vs-world`, `witnessed`,
and not `outcome:'failure'`. `copilot.js`'s `advise()` gained one matching
observation branch (same priority-chain shape as the existing `hotFaction`/
`hotFactionGoal` signals) naming the most recent such event.

**Game System Activation — `data/rulesConstitution.js` +
`settings.gameSystemActivations`**: `RULES_PROVIDERS.swn` gained
`requiresActivation: true` and `activationText` (the acknowledgment copy).
`isGameSystemActivated(campaign, systemId)` is the one function every call
site goes through — a provider with no `requiresActivation` flag is always
activated; today this is a plain boolean read, explicitly documented as
the seam a real licensing check replaces later (per the direct "connected
to a licensing activation module" note) — no auth/license backend was
built in this pass, since this is a static, local-first PWA with nothing
to check against yet. `schema.js` defaults `settings.gameSystemActivations
= { swn: false }` for every new campaign. `migrate.js`'s `migrateDocument`
gained a one-time grandfather step: a doc with no explicit `settings.
gameSystemActivations` AND real pre-existing SWN Faction Turn Engine usage
(any `factionEvents.length`, or a faction entity with `hp`/`currentGoalId`/
`factionAssets.length` set — fields that only ever existed under SWN
before this pass) gets `gameSystemActivations.swn` set to `true`; a doc
that already has an explicit value is left alone. Enforcement happens at
the point of *choosing* SWN (the per-faction Rules Provider `<select>` and
the Settings Factions-row `<select>` both omit the SWN option when not
activated), never at the point of rendering already-existing data — an old
campaign's SWN-based factions keep working exactly as before regardless of
the activation checkbox.

**Rules Constitution UI (`ui/drawers/index.js`)**: `GAMEPLAY_AREAS` gained
a stable kebab-case `id` per row; `resolveProviderChoice(settings, areaId)`
returns the GM's explicit choice or that area's own first-listed provider.
`rulesConstitutionSection` now renders a real `<select>` per row (options
gated by `isGameSystemActivated`) instead of static chips, with a note
that only the Factions row changes real behavior today. A new "Game
System Activation" group (checkbox + `activationText` per
`requiresActivation` provider) sits directly beneath it.

**Faction Turn card (`ui/drawers/index.js`'s `factionTurnSectionHtml`,
now exported)**: header/labels/dropdowns all read through the faction's
resolved provider. New Rules Provider `<select>` (campaign default / SWN /
GMAtlas Core, SWN option gated). New visible status: Governed Worlds
(read-only chips — SWN has no "give up government" action to wire),
Seize Progress (a "▶ Press the Siege" button calling `seizePlanet`
directly), Busy/Transit (a status line), per-asset missed-maintenance
warning badge. New actions wired to existing-but-previously-unreachable
engine functions: Refit (a dropdown per asset), Change Homeworld (a 🏠
button on each non-current Base of Influence chip), Stealth toggle (an
icon button per asset). HP/FacCreds/XP/Homeworld switched from the
generic `data-entity-field` (which only ever resolves against Cast's
single "active entity") to a new `data-faction-field="id::field"`
attribute carrying an explicit faction id (mirroring the existing
`data-faction-stat` pattern) — required so this card renders correctly
for a faction that ISN'T the one currently open in Cast, needed by:

**Faction Events panel (`ui/drawers/factionEvents.js`)**: a new "Faction
Roster" section between the Step/Full Round controls and the event feed.
No faction filter selected → a compact read-only list (name/HP/FacCreds/
current goal + a "Manage →" button per faction). A filter selected → that
one faction's FULL `factionTurnSectionHtml` card, imported directly from
`drawers/index.js` (not duplicated) — every dropdown/button/status field
above, live and editable, without leaving the panel. Only ever one
faction's full card at a time, matching that function's own single-
entity-card design. Committed events gained `scope`/`responses` display
(a small chip/line per response) and a "🎭 Expand to Read-Aloud" button —
once generated, the panel renders `event.readAloud` as an editable
mention-editor field (same rich-field convention every other narrative
field in this app already uses), so a GM can hand-tune it before reading
it to the table; the terse `narrative` line stays the compact feed
summary either way.

**shell.js**: new `change` handlers (`data-faction-field`, `data-faction-
provider-select`, `data-faction-fa-refit`, `data-rules-provider-choice`,
`data-game-system-activate`) and `click` handlers (`data-faction-fa-
stealth`, `data-faction-base-homeworld`, `data-faction-fa-siege`,
`data-faction-events-roster-manage`/`-clear`, `data-faction-event-expand-
readaloud`) — all additive, every existing generic handler (`data-entity-
field`, etc.) untouched. The read-aloud field's blur-commit joins
`onFocusOut`'s existing per-field-type branches (same shape as the
journal/guide/context rich-field commits already there).

## Scope, called out explicitly

- **No real licensing backend.** `isGameSystemActivated` is a boolean
  settings read today — the documented seam for "later, connect to a
  licensing activation module," not that module itself.
- **No general "world event"/hazard generator.** The 5PFH-style "alien
  invasion forces the party to flee, and every local faction's activity is
  affected" case was the shape `generateFactionResponses`/the WHAT-tab
  hook must generalize to, not a feature built in this pass — both
  functions are written generically enough (reading `locationId`/
  `coLocatedFactions`/`scope` off any event) for a future non-faction-turn
  event generator to reuse, but no such generator exists yet.
- **Only Threat is nudged**, not Reputation or a Hazard tracker — no
  Hazard/Heat field exists in this schema (`context.what` has threat/
  mystery/resources/reputation/stress only), and there's no defensible
  rule yet for which faction outcomes should swing Reputation specifically
  — a scope cut, not an oversight.
- **Regional responses are logged inline on the parent event**
  (`event.responses`), not as separate `factionEvents` entries — keeps the
  committed feed from multiplying N-per-world-event while still giving
  every affected faction a real, individually-attributed reaction.
- **Governed Worlds has no removal control** — SWN itself has no "give up
  government" action to wire one to; it's status-only, matching the
  book's own scope.

## Consequences

- A GM who never touches Faction Events, never activates SWN, and never
  opens Rules Constitution sees almost no behavior change: `'swn'` remains
  the hardcoded fallback provider, and an existing campaign with real SWN
  faction data is grandfathered activated automatically.
- A GM starting a brand-new campaign, or deploying this app publicly, gets
  a safe, ungated, original-content faction system by default, with SWN
  available as an explicit, acknowledged opt-in.
- `domain/factionTurnEngine.js` grew substantially (provider indirection
  throughout, event scope/response logging, read-aloud generation, a WHAT-
  tab hook) while staying pure/DOM-free/RNG-injectable — 401 total domain+
  migrate tests (up from 381), covering both providers' data integrity,
  provider resolution order (including a mixed-provider Attack), the new
  engine functions, and all three grandfather-migration paths.

## Related packs / ADRs

`docs/adr/0031-swn-faction-turn-engine.md` (the engine this extends),
`docs/adr/0011-swn-cwn-content.md` (the copyright posture this ADR adds an
activation gate to, on top of 0031's partial supersession), `docs/adr/
0002-rules-constitution.md` (the reference table this ADR turns into real
dropdowns), `docs/adr/0022-inline-prompt-standard.md` (the rich-field/
mention-editor conventions the read-aloud field follows).
