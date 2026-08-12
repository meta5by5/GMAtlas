# GMAtlas — Functional Requirements v3

**This document replaces `requirements/Functional-Requirements-v2.md` and
`DESIGN-NEW-FUNCTIONALITY.md`.** Both are superseded — see "Cleanup" at the
very bottom of this file for where their content went. This is now the one
place functional design and the forward roadmap live together. Where an
older document (a legacy corpus, an ADR, a prior version of this file)
disagrees with this one, this one wins.

Companion documents, not duplicated here:
- **`design/adr/GMAtlas-Design-Constitution.md`** — the architecture-as-built
  reference (module map, the five non-negotiable engineering rules). Read
  it for *how the code is organized*; read this file for *what the app
  does and should do*.
- **`design/adr/deviations.md`** — a historical record of conflicts found in
  the prior spec version. The conflicts it lists in its Part I are resolved
  by this document (see the Terminology section and the Storyboard
  section below); it's kept as a record, not a live issue list.

## How to read this document

Every major section follows the same shape:
- **What this accomplishes** — the intent, in plain language.
- **How the design accomplishes it** — the current or target behavior.
- **What's missing** — a concrete gap, only where one exists, with the
  design steps to close it.
- **Recommendations** — informed by how comparable tools in the wider
  TTRPG-tool community (World Anvil, Kanka, LegendKeeper, Stargazer, Iron
  Vault, Foundry VTT and others) approach the same problem, and by what GMs
  say they actually want from these tools. Research here was conducted in
  English and should be treated as a starting perspective, not a survey —
  non-English-language TTRPG communities (French, German, Japanese, and
  others) exist and weren't directly sampled beyond a light pass.

Three sections (Storyboard Navigation, the Moves Menu, and the Entity
Dashboard) get the full four-part treatment in detail, because they're this
document's three stated priorities. Everything past them gets the same
shape but tighter treatment, since most of it is already built and stable —
padding a working feature out to the same length as a genuinely open design
question would bury the parts that actually need a decision.

---

## Priorities

In order:

1. **A dashboard for entity tracking** — characters, NPCs, Locations, gear,
   and factions all need one place a GM can browse, search, and jump from.
2. **The app works seamlessly on desktops, tablets, and phones** — not a
   desktop tool that degrades on a small screen, but one interaction model
   that reshapes itself per device.
3. **Disambiguate the changing terms and references** — the same panel has
   been called three different things across three documents. That stops
   here.

Within the roadmap items below, this is the intended build order:

1. User experience & navigation
   1. The Storyboard's panel model (Composer / Navigator / Advisor) and its
      responsive behavior down to a phone screen.
   2. The Moves menu, opened from an icon in the Navigator's corner.
2. Game mechanics
   1. The foundational data and oracle-engine additions.
   2. The Composer's NPC-generation and suggestion mechanics.

---

## Terminology

One panel has been called "Story Dashboard," "Narrative Composer," and
"Co-Pilot" at different points. That confusion ends now — these are the
permanent names:

| Name | What it is | Was previously called |
|---|---|---|
| **Storyboard** | The whole persistent workspace — the shell containing Composer, Navigator, and Advisor (desktop), or the tab menu that holds all of them one at a time (phone). | "Story Dashboard," "Mission Control" |
| **Composer** | Where the GM builds a scene: picks entities, writes or rolls narrative content. | "Story Dashboard" (the WHO/WHERE/WHAT/WHY/HOW sections) |
| **Navigator** | Where everything *except PC character sheets* is tracked — timers, meters, status — plus a "journal-quality" summary of the current scene's beats, at a glance. | "Narrative Composer" |
| **Advisor** | Ephemeral suggestions, warnings, oracle associations, and consequences that need a GM's yes/no before they touch a real record. | "Co-Pilot" |
| **Drawer** | Any of the secondary panels — Journal, Oracle, Cast, Faction Events, Trade, Guide, Documents, Gallery, Battlemap, Graph, Party, Colony, Settings. | (unchanged) |

The underlying code modules don't need to be renamed — this is a rendered-
label change, not a refactor. Only the words a GM sees change.

---

## The Storyboard — Navigation, Panels & Responsive Layout

*A sequenced, independently-shippable build plan for this section lives in
`design/UX-ROADMAP.md` — this section describes the target behavior; that
document describes the order to build it in.*

### What this accomplishes

A GM should always know where to look for three different kinds of thing —
*building* the current scene, *tracking* what's currently true about it, and
*deciding* whether to accept a suggestion — without those three blending
into one undifferentiated screen. And that has to hold up identically
whether the GM is at a desk with two monitors or holding a phone.

### How the design accomplishes it

**The three panels, precisely:**

- **Composer** — all the choices that make a scene: which entities are
  present, and the narrative content behind them, generated from oracles or
  typed by hand.
- **Navigator** — every tracker that isn't a PC's own character sheet
  (timers, meters, status dials), plus a compact, journal-quality summary
  of the scene currently being built in the Composer — a single place to
  see the whole scene at a glance. A button here adds that summary straight
  to the Journal, and opens the Journal drawer into the tab group so the
  GM can see it land.
- **Advisor** — everything ephemeral: suggestions, warnings, oracle
  associations, and consequences that need explicit GM confirmation before
  they change anything real. Confirming a suggestion here is what actually
  writes it — into a Composer field, or onto a timer/meter in the
  Navigator.

**Desktop / tablet layout** (a screen wide enough for side-by-side panels):

- The left two-thirds of the workspace holds the Composer and the
  Navigator side by side — always visible together, never a drawer.
- The right third is shared between the Advisor and every open drawer.
  When more than one of those is open, they share a tab strip in that same
  space.
- The Advisor is a fixed, standalone panel in that right third **only when
  no drawer is open**. The moment a GM opens any drawer, the Advisor joins
  the same tab strip as an ordinary tab rather than staying pinned — a
  drawer would otherwise cover it entirely. It returns to being a
  standalone panel again once every drawer is closed.
- When the Advisor is sitting in that tab strip with a decision still
  waiting for the GM's attention, its tab is visibly flagged (a yellow
  highlight, or a star next to its name) — a pending decision must never
  go unnoticed just because it's buried behind other open tabs.

**Phone layout** (a screen too narrow for any of the above to share space):

- Exactly one panel is visible at a time, full-width.
- The Composer and Navigator — which share space on a larger screen — split
  into two separate tabs on a phone, since neither can be shown alongside
  the other.
- The tab menu becomes the *only* way panels are shown on a phone: Composer,
  Navigator, Advisor, and every drawer are all just tabs in one list. The
  Composer and Navigator tabs are pinned first, since they're used every
  scene; everything else follows behind them.
- A drawer opened on a phone behaves exactly like a drawer opened on
  desktop's tab strip, just full-screen instead of one-third-width.

**What does not change**: opening a drawer never hides the Composer/
Navigator pairing on desktop — only the Advisor's slot is contested. On
phone, moving between any two panels is always just switching tabs, never a
different navigation pattern for "the Storyboard" versus "a drawer."

### What's missing

None of the above exists yet as a built feature — this is a full relayout
of the current single "Story Dashboard + always-visible Co-Pilot" design.
Design steps, in build order:

1. **Rename** the three panels in the UI per the Terminology table — no
   data-shape change, label-only.
2. **Split the current single-column Dashboard** into two side-by-side
   regions (Composer / Navigator) on any viewport wide enough to show both;
   move the WHO/WHERE/WHAT/WHY/HOW editable sections into the Composer, and
   the pressure dials / scene-beat summary into the Navigator.
3. **Build the Navigator's scene summary and its "Send to Journal" control**
   — assembling the same kind of draft the app already builds for its live
   narrative preview, but framed as a journal-quality recap rather than a
   raw text block, plus the button that opens the Journal drawer.
4. **Make the Advisor's placement conditional**: standalone in the right
   third when no drawer is open; a tab in the shared strip, flagged when a
   decision is pending, the moment any drawer opens.
5. **Build the phone breakpoint's all-tabs model**: Composer and Navigator
   become ordinary tabs (pinned first) instead of a side-by-side pairing;
   every other panel (Advisor, every drawer) joins the same tab list behind
   them.
6. **Retire** the current "at most one side panel visible" rule as it
   stands today, replacing it with the narrower version above (it governs
   the right-third tab strip and, on phone, the single visible panel — it
   never applies to the Composer/Navigator pairing on a larger screen).

Full drag-to-reposition panels, independently resizable (2×/3×) drawer
widths, and a drawer popping out into its own browser window remain
explicitly out of scope for this pass — the model above is deliberately the
smallest version that actually satisfies the mobile requirement. Revisit
only if real use of the fixed layout surfaces a genuine need for
repositioning, not the original speculative ask.

### Recommendations

- **Real-time capture during play, not just after.** GMs consistently say
  the tools that stick are the ones that let them log a new entity, thread,
  or consequence *live at the table* without breaking flow — not just
  structured prep beforehand. The Composer/Navigator split already sets
  this up (Composer for building, Navigator for what's now true); worth
  double-checking every common in-session action (a new NPC appearing, a
  clock ticking) takes one tap from wherever the GM currently is, not a
  trip to a different drawer.
- **Cross-linking is the single most-praised feature** across the
  campaign-wiki tools researched (Kanka, World Anvil, LegendKeeper) — a
  mention that's always clickable, in every direction, is exactly what
  makes a GM trust the tool enough to stop keeping notes elsewhere. GMAtlas
  already has this via `@mentions`; the recommendation is to make sure the
  new Navigator's scene summary keeps every mention live rather than
  flattening it to plain text when it's sent to the Journal.
- **A installable, offline-capable mobile experience is a real
  differentiator, not a nice-to-have** — Stargazer's popularity in the
  Ironsworn/Starforged community specifically cites free, mobile-friendly,
  installable-as-an-app as reasons GMs picked it over heavier
  alternatives. GMAtlas's local-first PWA approach is already aligned with
  this; the phone tab-menu design above is what actually cashes that in.

---

## The Moves Menu

### What this accomplishes

A GM needs to look up "what can this character actually do right now" fast,
mid-conversation with players — not hunt through a rulebook or a wiki page.
This is consistently the reason dedicated move-reference tools (Stargazer,
Iron Vault, the Foundry VTT implementations of Starforged) get used even by
GMs who otherwise run everything on paper.

### How the design accomplishes it

- A small icon — a running figure — sits in the top-right corner of the
  **Navigator**. Clicking it opens the Moves menu.
- The Moves menu is a collapsible tree of move groups (Starforged supplies
  the default action/move system; Five Parsecs From Home supplies combat
  moves), typeset to match the look of the Ironsworn/Starforged Reference
  Guide.
- Expanding a move shows its full detail. A move that references another
  move in its consequences (e.g. "Pay the Price") is a live link that jumps
  straight to that move.
- Every move has a roll button. Clicking it opens a small stat-picker;
  it rolls using the currently-selected entity's matching stat, or asks the
  GM to pick an entity first if none is selected.
- After a roll, its result posts to the Composer for resolution: any
  timers/meters it affects are identified there, with their proposed
  changes shown for the GM to approve or adjust, alongside a short
  drafted narration the GM can edit before an explicit Commit to the
  Journal.
- Switching the active ruleset never deletes a timer or meter that belonged
  to the old one — it's mapped onto its closest equivalent in the new
  system instead, so switching back later doesn't lose anything.

**A second, later increment** (after the icon-triggered menu above is
built and in use): the Advisor also surfaces move suggestions on its own —
after a move resolves, related moves that commonly follow it appear as
clickable links in the Advisor; opening the Moves menu while a scene is
active highlights whichever entries are common responses to that scene.
This is explicitly a follow-on, not part of the first build — the
icon-triggered menu has to exist and be used before "the Advisor guesses
what you need" is worth building on top of it.

### What's missing

Confirmed absent from the codebase entirely today — no move catalog, no
Moves UI, no per-move roll button exists anywhere. Design steps:

1. Author a Moves data catalog (Starforged action moves, 5PFH combat
   moves), shaped like the existing genre-pack/ruleset data files — data,
   not domain-layer code.
2. Build the Navigator's running-figure icon and the Moves menu popup it
   opens (collapsible tree, move detail view, cross-links between moves).
3. Wire the per-move roll button to a stat-picker that defaults to the
   currently-selected entity.
4. Build the roll → Composer resolution flow: affected timers/meters
   identified and shown for approval, a drafted narration line, an explicit
   Commit-to-Journal step.
5. Build the ruleset-switch remapping so an existing timer/meter maps to
   its nearest equivalent under a newly-active ruleset rather than
   vanishing.
6. Only after the above ships: add the Advisor's own move suggestions
   (post-roll related-move links, scene-open highlighting of common
   responses).

### Recommendations

- **Speed during play beats completeness.** Every popular Starforged
  reference tool researched optimizes hard for "find this move in under two
  seconds," even at the cost of a less complete presentation than the
  physical Reference Guide. Worth resisting the temptation to make the
  Moves menu as exhaustively cross-referenced as the Composer/Advisor — a
  flat, fast search-and-scroll experience beats a deep tree if the two ever
  trade off against each other.
- **Let the roll-result flow double as the "why did this happen" record.**
  Community feedback on tools like Iron Vault specifically praises rendering
  dice results as first-class journal content, not just a toast that
  disappears — the roll → Composer → Journal pipeline described above
  already does this; it's worth protecting that pipeline from ever being
  short-circuited by a "quick roll" shortcut that skips the Journal step.

---

## Entity Dashboard (Cast)

### What this accomplishes

A GM needs one place to find, at a glance, every character, NPC, location,
piece of gear, and faction in the campaign — searchable, filterable, and one
click from a full editor. This is the single most universally requested
feature across every campaign-management tool researched, under whatever
name each tool gives it (a "codex," a "compendium," "entities").

### How the design accomplishes it

The Cast drawer already is this dashboard: every entity type (character/
NPC, Location, Faction, Asset, Lore, Item — including gear, since gear is
modeled as Item entities carrying a gear statblock — and Conflict) is
browsable from one list, with type filter chips, a cumulative tag filter,
and free-text search across name/type/tags/overview. Clicking any entity
opens its full editor (identity, public Overview, GM-only Revealed field,
every type-specific card, statblocks, relationships).

### What's missing

Functionally this already covers the priority. What's genuinely missing is
framing — it reads as a filtered list, not a dashboard a GM would think to
open first. Design steps:

1. Add a lightweight summary strip at the top of Cast — a count per entity
   type (N characters, N NPCs, N locations, N factions, N gear items) — so
   the drawer answers "what does my campaign currently contain" at a
   glance before any filtering happens.
2. Surface Cast more prominently in navigation given its new priority-one
   status — it shouldn't sit behind the same number of clicks as a rarely-
   used drawer like Gallery or Battlemap.
3. Confirm gear (Item entities) are visually distinguishable from other
   assets in the type-chip filter — today "Item" and "Asset" are separate
   types, which already covers this, but worth a pass to make sure "gear"
   as a GM-facing word maps clearly onto one of them rather than requiring
   the GM to know the underlying type name.

### Recommendations

- **Flexible, GM-defined entity categories beat a rigid fixed list.**
  Kanka's specific advantage over more rigid competitors is letting a GM
  define whatever entity types actually make sense for their campaign.
  GMAtlas's fixed 7-type model (npc/location/faction/asset/lore/item/
  conflict) is narrower by design — worth keeping the fixed set (it's what
  makes relationships/statblocks/oracles type-aware without configuration)
  but leaning harder on the existing free-text tag system to give GMs the
  same flexibility Kanka's custom types provide, rather than adding more
  built-in types.
- **Cross-linking density is what separates a dashboard people actually
  trust from one they abandon.** Every entity in Cast should make it
  obvious, from the list view and not just the full editor, how connected
  it is — a relationship-count or "mentioned in N places" affordance in the
  summary strip would put GMAtlas's already-strong relationship model on
  equal footing with what LegendKeeper and Kanka lead with.

---

## Game Mechanics — Foundational Additions

### What this accomplishes

A handful of small, currently-missing pieces of data and one real algorithm
change unlock several later features and round out mechanics that are
already partially built.

### How the design accomplishes it, and what's missing

All of the following are additive to existing, working systems — none
requires a new subsystem:

- **Cast tag taxonomy**: `#character`/`#npc` plus `#antagonist` or
  `#bystander`; every NPC gets `#npc` automatically on creation. *Missing
  entirely* — a straightforward addition to the existing entity-creation
  tag logic.
- **Faction size at creation**, driving generated FacCreds/stat scaling to
  match. *Missing* — a new field plus a scaling formula on faction
  creation.
- **Regional faction-turn participation**: every faction present anywhere
  in a location's containment chain (system down to site) participates in
  that location's faction-turn calculation, not just factions with a
  direct presence at the exact site. *Partially built* — the region-
  presence query this needs already exists (`factionsInRegion`); it isn't
  yet wired into the faction-turn action-eligibility check itself.
- **Faction event → opportunity/consequence pipeline**: a committed faction
  event should add a corresponding entry to the Advisor's opportunities/
  consequences, not just the faction event log. *Partially built* — the
  Advisor already surfaces witnessed faction events as an observation; a
  direct opportunity/consequence entry per event is the missing piece.
- **Trade dynamic transaction events**: a random success-impact roll (a
  needy customer, say) and a random consequence-impact roll (spoilage,
  corrosion, equipment failure, ship-system failure) layered onto buy/
  sell. *Missing* — two new small oracle tables plus a roll on each
  transaction.
- **Mission variable start time & duration**, with progress clocks that can
  represent either completion steps or a real timer whose triggering
  events are listed against clock progression. *Partially built* — Threads
  already support both a fill-based clock and a `kind` tag; missions don't
  yet use either for anything beyond their fixed deadline formula.
- **Oracle tag-combination rolling**: rolling "by tag" merges every same-
  tagged table's entries into one equally-weighted pool for that roll.
  *Missing* — today a tag only filters which separate tables are shown;
  this is a real addition to the oracle engine, additive alongside (not
  replacing) today's single-table and single-group rolling.
- **Move the Oracle Tags editor into Settings**, and stop showing tags in
  the Oracle drawer itself. *A relocation*, no data-shape change — tags
  already live on the campaign document.

### Recommendations

- **Weighted/tag-pooled oracle rolling is a genuine differentiator worth
  getting right** — most comparable tools treat random tables as static,
  single-source lookups; a same-tagged pool that blends multiple sources
  with equal weight is closer to how GMs actually improvise (pulling from
  "whichever table fits, not just the one I happened to click"). Worth
  making sure the pooled-roll result still records *which* underlying
  table/entry it came from, so the existing "roll, then remember my edits"
  mechanism keeps working unchanged.

---

## Game Mechanics — Composer NPC Generation & Suggestion Mechanics

### What this accomplishes

An NPC that shows up in a scene should already feel like it belongs there —
the right kind of person for a colony versus a starship versus a bar — with
minimal manual authoring, but without ever taking away a GM's ability to
hand-pick something specific.

### How the design accomplishes it

- NPCs not in `#party`/`#character` auto-populate into the Composer at
  scene start, rolled from NPC oracles and re-rolled automatically until
  the result fits both the scene and its intended role (Antagonist versus
  Bystander); more can be generated on demand.
- Hand-picking a specific field on a generated NPC locks that field against
  future rerolls of that same NPC; clearing the field releases the lock, so
  the next reroll treats it as unset again.
- Each generated NPC gets a small circular thumbnail with its name
  underneath (a generic gray silhouette when no image is set), with +/-
  controls to promote it into the permanent Cast list or discard it.
- A Bystander can convert into a full NPC/Antagonist, auto-generating stats
  from its tag profile at the moment of conversion (a colonist, spacer,
  merchant, or bounty-hunter-style profile, drawn from the existing tag
  vocabulary).
- A small lightbulb icon next to any entity or WHO/WHERE/WHAT/WHY/HOW field
  loads relevant Moves into the Advisor — the same connective tissue the
  Moves Menu provides on demand, surfaced proactively here.
- Clicking an empty or already-populated Composer field surfaces fitting
  oracle suggestions in the Advisor, filtered by the scene's current NPCs,
  location, and open trackers.
- An auto-assessed "obvious goal" is proposed at scene start for the GM to
  confirm or edit; secondary goals and generated hazards/opportunities are
  filtered for relevance against it (a forest-fire encounter shouldn't
  surface on an airless moon); a hazard may complicate the primary goal but
  must never invalidate it outright.

### What's missing

All of the above is new work. The closest existing building block is the
already-shipped scene-scoped NPC grouping (Protagonists/Antagonists/
Bystanders, each with five oracle-seedable fields) — this phase extends
that mechanism rather than replacing it. Design steps:

1. Build the roll-until-fits generator and wire it to scene start for
   Antagonist/Bystander slots.
2. Add per-field lock/unlock state to a generated NPC, respected by future
   rerolls.
3. Build the thumbnail card (portrait, name, promote/discard controls).
4. Build Bystander → NPC/Antagonist conversion with tag-driven stat
   generation.
5. Wire the lightbulb affordance to the Moves Menu (depends on the Moves
   Menu existing).
6. Build the oracle-suggestion-on-field-click behavior in the Advisor.
7. Build the auto-assessed goal proposal and its relevance filter over
   generated hazards/opportunities.

### Recommendations

- **Let the GM override without penalty, always.** The lock-on-manual-edit
  behavior above is the right instinct — the strongest complaint about
  "smart" GM tools generally is a system that keeps clobbering a
  hand-authored choice. Worth extending the same "locked once touched"
  guarantee to the goal-relevance filter too, so an intentionally
  off-theme hazard the GM wants (a forest fire on an airless moon, on
  purpose, because it's actually a holodeck) is never silently suppressed.

---

## Cast, Relationships & World State

### What this accomplishes

Every character, location, faction, and fact in the campaign needs to
connect to everything else it's actually related to — and those
connections need to stay meaningful (never silently "fixed" or dropped)
even as entities change over time.

### How the design accomplishes it

Fully built: typed, mirrored relationships with "flag, don't auto-correct"
integrity checking; `@mention` parsing/auto-linking (bare `@Name` and
bracketed `@[Label|Name#Page]`); automatic Bond-track creation between
eligible pairs; every entity resolves to a faction (real or a synthetic
"Unaligned"); lazy, additive, never-overwriting type-specific fields per
entity type; a deterministic force-directed relationship graph that renders
the same cast in the same layout across reloads; Threads (the general
progress-clock primitive, reused by five other subsystems via a `kind`
tag); a 4-state World Flags ledger; a private Foreshadowing plant/pay-off
list.

### What's missing

Nothing structurally — this is the most complete part of the app. The one
gap: Threads carry `status` and `priority` but not urgency or momentum
dials some comparable systems track. Not currently prioritized; noted for
awareness, not a design step.

### Recommendations

- **This is already ahead of most comparable tools on relationship
  integrity** — "flag, don't silently fix" is a genuinely rare guarantee;
  most wikis either force a rigid relationship type or let stale links rot
  invisibly. Worth highlighting this in any public-facing description of
  the app, since it's a real differentiator, not just an implementation
  detail.

---

## Factions, Trade, Missions, Enhancements, Expeditions

### What this accomplishes

The world should feel like it keeps moving on its own — factions pursue
goals, prices respond to supply and demand, jobs come with real stakes —
without ever taking a decision away from the GM.

### How the design accomplishes it

Fully built: a lightweight Faction Pressure Track mini-game; the full
SWN-style Faction Turn Engine (propose-then-confirm drafting, 9 named
actions, upkeep with an asset-loss rule, goal tracking, two interchangeable
content catalogs — one real-sourcebook-gated, one always-available
original); the first-class Conflict entity type with a permanent escalation
clock; Merchant Rules Lens trade pricing (demand/supply × development-level
× biome bias) with a buy-drains/sell-floods feedback loop; route-driven
Contract payouts; a pure danger-scaled Mission generator; genre-agnostic
Enhancement/Strain tracking where exceeding capacity is a visible flag
only, never an automatic penalty; Expedition trackers (Supplies/Exposure/
Morale on top of a Thread clock).

### What's missing

Covered above under "Game Mechanics — Foundational Additions" (faction
size scaling, regional faction-turn participation, the faction-event
opportunity/consequence pipeline, trade's dynamic transaction events,
mission timers) — not repeated here.

### Recommendations

- **The propose-then-confirm faction model is worth calling out
  specifically** — most comparable tools that attempt any kind of
  "automatic world simulation" either commit changes silently (which GMs
  distrust) or don't attempt simulation at all. A full draft the GM can
  review before committing is a genuinely uncommon middle ground worth
  preserving carefully as this system grows.

---

## Content Library — Guide, Documents, Rich Text, Gallery, Battlemap

### What this accomplishes

A GM's own reference material — house rules, maps, portraits, rulebook
PDFs — needs to live inside the same tool as the campaign itself, cross-
linked the same way everything else is, rather than scattered across a
folder of separate files.

### How the design accomplishes it

Fully built: a drag-and-drop-reparentable Guide document tree; a document
library plus a build-time-scanned, GM-overridable Reference Library; a
deliberately-not-full-Markdown rich text engine (bold/italic/underline,
sanitized links, sanitized inline color, lists, a minimal table), with
plain text always the one stored source of truth; PDF bookmark-outline and
term-index scanning into the Guide; pointer-based entity thumbnails with
auto-generated thumbnail/original pairs; named battlemaps with fractional
icon coordinates so they render correctly at any window size, pan/zoom, and
an optional grid.

### What's missing

Nothing prioritized in this pass. The previously-scoped battlemap
extensions (encounter overlays, procedural room templates, fog of war,
multi-map floors) and a gridless vessel-deckplan builder remain
unprioritized future work, not part of this roadmap.

### Recommendations

- **Real-time collaborative editing is the single feature LegendKeeper
  wins on hardest** against its competitors, per direct comparisons. It's a
  large architectural change (this app is currently single-user/local-
  first by design) and explicitly out of scope here — but worth knowing
  it's the most-cited gap category if multi-user support is ever revisited.

---

## Party & Colony

### What this accomplishes

A party's shared resources — credits, custom clocks, a colony's turn
sheet — need tracking that doesn't require re-deriving them from individual
character sheets every session.

### How the design accomplishes it

Fully built: a live `#character`-tag roster; free-form trackers with an
immutable kind (meter/counter/currency) and Starforged-difficulty-aware
tick stepping; a fixed 22-field 5PFH Planetfall turn sheet with an
id-referencing crew roster and a `#lifeform` live filter.

### What's missing

Nothing prioritized in this pass.

### Recommendations

None beyond what's already covered under the Entity Dashboard section
above — Party is effectively a specialized view over the same entity model.

---

## Cross-Cutting: Search, Import/Export, Rules Lens, Reference Tools

### What this accomplishes

A few utilities need to work the same way no matter which part of the app
a GM is in: finding anything by free text, moving a campaign or a slice of
one between machines, and getting pointed at the right rules system for
whatever's currently happening.

### How the design accomplishes it

Fully built: Universal Search across Cast/Journal/Oracle/Documents/Party/
Colony in a fixed category order; whole-campaign export/import (always
fully replaces); Content Pack export/import between separate campaigns
(always additive, fresh ids); curated bulk catalog import with name-
collision skip; Activity → Rules Lens suggestion via the Rules Constitution
provider registry; two on-demand PDF scan tools (Mechanics Index, Table-of-
Contents generation), both requiring an `http(s)` origin rather than
`file://`.

### What's missing

Universal Search today is a fixed-category-order substring match with a
hard result cap and no relevance ranking beyond category order, and there's
no persisted "saved search." Not currently prioritized; noted for
awareness.

### Recommendations

- **A single unified search that ranks by relevance, not just category
  order, is worth revisiting once Cast's dashboard framing (above) ships**
  — the two features reinforce each other; a GM who trusts Cast as "the"
  place to find an entity will expect Search to behave the same way.

---

## Data & Content Catalogs

### What this accomplishes

Every ruleset, genre, oracle table, and stat block needs to be swappable
content, never something hardcoded into the app's logic — this is what
lets GMAtlas support Starforged, Five Parsecs From Home, Hostile, Traveller,
Stars Without Number, and Planetfall side by side without one system's
vocabulary leaking into another's.

### How the design accomplishes it

Fully built: oracle tables across 3 genre packs; per-ruleset character and
Bestiary/gear statblock templates; a cross-system gear catalog; the Rules
Constitution provider registry; two mechanically-identical faction content
catalogs (one gated, one original); trade economy models, commodities, and
biomes; world-profile decode tables; suggestion lenses; enhancement types;
battlemap icons; a committed Reference Library manifest independent of
whether the PDF bytes are present on disk.

### What's missing

The Moves catalog (see "The Moves Menu" above) is the one net-new content
file this roadmap requires.

### Recommendations

- **Kanka's willingness to let a GM define arbitrary entity types** is the
  one place a purely data-driven catalog model like GMAtlas's could learn
  something — not by adding more built-in types, but by making sure the
  tag vocabulary genre packs seed is rich enough that "the kind of thing
  this is" rarely needs a brand-new type to express.

---

## Architecture & Non-Functional Requirements

### What this accomplishes

None of the above matters if a GM's campaign can be lost, corrupted, or
made to depend on a server that goes away. This section is about the
guarantees that hold regardless of which feature is being used.

### How the design accomplishes it

Fully built and non-negotiable (unchanged by anything in this roadmap —
see `design/adr/GMAtlas-Design-Constitution.md` for the full detail): one
versioned campaign document as the single source of truth; exactly one
persistence module (IndexedDB, with a one-slot backup and a lossless
legacy-`localStorage` fallback); a pure, DOM-free domain layer; exactly one
delegated event listener per browser event type; migration that never
drops data. Zero required backend or build step to run (a single HTML
document plus one bundled script); installable offline-first as a PWA;
deterministic testability via an injectable RNG, defaulting to real
randomness in play.

### What's missing

Nothing — this layer is stable and none of this roadmap's items require
changing it.

### Recommendations

- **This offline-first, zero-backend posture is a genuine, rare strength**
  worth protecting deliberately as new features land — every tool compared
  above (World Anvil, Kanka, LegendKeeper, Foundry VTT) requires an account
  and a live connection for at least some of its core value. A GM who can
  keep running a campaign through a bad internet day, or years after a
  service shuts down, is a real and uncommon promise. Every future design
  decision should be checked against whether it would quietly erode that.

---

## Cleanup

As of this document:

- `requirements/Functional-Requirements-v2.md` is superseded and has moved
  to `requirements/previous-design-principles/Functional-Requirements-v2.md`
  as reference material — its content is fully absorbed above, and the
  internal conflicts `design/adr/deviations.md` found in it (Part I,
  items 4–6, the Composer/Navigator naming swap and the drawer-visibility
  contradiction) are resolved by the Terminology and Storyboard sections
  above.
- `DESIGN-NEW-FUNCTIONALITY.md` is retired — its roadmap content (formerly
  "Phase 14" through "Phase 18") is fully absorbed into the sections above.
- `CLAUDE.md` now points here instead of at either superseded file.
