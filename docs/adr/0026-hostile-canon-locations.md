# ADR 0026 — HOSTILE canon locations: World Profile fields + gazetteer import

## Status

Accepted and implemented (2026-07-08), first pass. Extends ADR 0013/0025's
Location-field precedent with a new, independent field group; does not
change either.

**2026-07-08 follow-up (same day)**: three direct UI refinements, folded
into this ADR rather than a new one since they're the same feature —
(1) Star System became a `<select>` sourced from existing Location
entities tagged `#star` instead of free text, with the field label
showing `(#star)` so a GM knows where the options come from — a world's
star is now modeled by linking to another Location entity a GM creates
and tags, not by typing a descriptive string. This is a genuinely
different mental model from the canon import's `starSystem` strings
(e.g. "Wolf 359 (M6V Red Dwarf)"), which don't retroactively match
anything until a GM creates a matching `#star`-tagged Location — a known,
accepted tradeoff of the request as given, not a bug. (2) Trade Codes
became a dropdown-add (`data-entity-tradecode-add`, no `#` prefix on
options, matching the WHO/WHERE tag-picker's listbox *style* without its
two-panel candidate mechanism) plus removable chips, via two new small
domain functions (`addLocationTradeCode`/`removeLocationTradeCode`,
mirroring `addFactionAsset`/`removeFactionAsset` exactly) — replacing
the original comma-separated text input, since typo-free codes matter
for the `findTradeCode()` label lookup already driving the summary line
under it. Bases stayed a comma input (not part of the request). (3) Both
the Location card and World Profile card became collapsible, collapsed
by default (`ui.expandedLocationCard`/`ui.expandedWorldProfile`,
ephemeral Sets — same shape as `enhancementsSection`'s
`ui.expandedEnhancements`), so a Cast list full of imported worlds
doesn't default to a wall of open cards.

**2026-07-08 second follow-up (same day)**: the "known tradeoff, not a
bug" from the first follow-up above got resolved for real, plus four
more direct refinements — the canon import itself now recreates the
cross-references it previously only described in text:

1. **The import recreates stars and bases as real entities, in
   dependency order.** `data/hostileLocations.js` gained two new
   catalogs — `HOSTILE_BASES` (USSC/JASDF/DRW/MRA, tagged `#base`) and
   `HOSTILE_STARS` (one per world's star system, tagged `#star`, each
   with its own `starSystem` field set to ITS OWN name — the
   self-reference the World Profile UI now checks for). `domain/
   hostileLocations.js`'s `importHostileLocations()` imports Bases, then
   Stars, then the worlds themselves, in that order, so a world's
   `bases`/`starSystem` values already resolve to real entities by the
   time it's created — the "won't retroactively match" tradeoff the
   first follow-up flagged no longer applies for the canon data itself
   (it still applies to any Location a GM hand-enters without linking
   it). One star name (Tau Ceti's) collided with its own world's name;
   disambiguated to "Tau Ceti System" — a new domain test asserts no
   such collision exists across the whole catalog.
2. **`#planet`/`#orbit`/`#deepspace` tags**, one per world, from a new
   `locationKind` field on each `HOSTILE_LOCATIONS` entry: `orbit` for a
   body explicitly described as a moon orbiting a gas giant/brown dwarf
   rather than a system's primary (Forlorn, Prosperity), `deepspace` for
   an unclaimed/independent asteroid not orbiting a habitable world
   (LQ105, Exile, Rock 17, The Solomons), `planet` for the remaining 24.
3. **Field order**: Star System moved up between Hex and Zone (was
   below the coded `<select>`s); Hex is now `size="4" maxlength="4"`
   (hex codes are always exactly 4 digits).
4. **Every world's tags now include its zone AND its star** (previously
   only zone) — `importHostileLocations()`'s world pass tags
   `[hostile-canon, zone, starSystem, locationKind]`.
5. **Bases now works exactly like Trade Codes**: a dropdown-add
   (`data-entity-base-add`) plus removable chips, via two new domain
   functions `addLocationBase`/`removeLocationBase` (mirroring
   `addLocationTradeCode`/`removeLocationTradeCode` exactly) — but
   sourced from `#base`-tagged Location entities (dynamic) rather than
   the static `BASES` table Trade Codes still uses, matching how Star
   System already sources from `#star`-tagged entities. The old
   comma-input for Bases is gone.
6. **`(#star)`/`(#base)` label hints render lowercase**, not shouted by
   `.field-label`'s uppercase styling — `fieldLabelRow()` gained an
   optional 4th `hint` parameter rendered in a new
   `.field-label-hint { text-transform: none; }` span (styles/
   cockpit.css), leaving the rest of the label's uppercase treatment
   untouched.
7. **A self-referencing Star System hides the planet-only fields.**
   When `e.starSystem === e.name` (true only for a `HOSTILE_STARS`
   entity, self-referencing by construction), `worldProfileSection`
   renders only Hex/Star System/Zone/Tech Level and a short explanatory
   note — Starport through the gas giant checkbox (including the new
   Bases/Trade Codes dropdowns) are hidden, since a star isn't itself a
   world with a starport or an atmosphere.

**2026-07-08 third follow-up (same day)**: the card layout got a full
redesign into two purpose-named cards, and the import now recreates a
real orbit relationship instead of relying on the `starSystem` string
alone.

1. **Two cards, redistributed fields.** The old `locationSection`
   (Development Level/Biome) and `worldProfileSection` (the UWP fields)
   are gone, replaced by two new cards with every field re-sorted by
   theme: **World Profile (UWP)** — Hex, Star System, and Zone on one
   row, then World Size, Atmosphere, Biome, Hydrographics, and Gas Giant
   (physical/astrographic facts) — and **World Demographics** —
   Starport, Bases, a visual divider, then Tech Level and Law Level on
   one row, Trade Codes, Economy, Population, and Government (developed/
   governed facts). Biome (ADR 0025) and Economy (renamed from
   "Development level," still the same `developmentLevel` field feeding
   `domain/trade.js`'s bias functions — display label only) both moved
   card without any change to their underlying storage or Trade-pricing
   behavior. Gas Giant wasn't named in either of the requested field
   lists; rather than silently dropping a working control, it was kept
   and placed at the end of World Profile as the closest thematic fit
   (a system-level astrographic fact) — flagged here in case that
   placement should move.
2. **A self-referencing star now hides ALL of World Demographics**
   (the whole card returns `''`), not just Tech Level — a star has no
   starport, bases, population, government, trade codes, or economy any
   more than it has a tech level. Within World Profile, a star also now
   hides World Size/Atmosphere/Biome/Hydrographics/Gas Giant, showing
   only Hex/Star System/Zone — this widens the very first follow-up's
   narrower "hide the field list from that draft" scope to match the
   new card boundaries.
3. **The import now links every world to its star as a real
   relationship**, not just via the `starSystem` string.
   `domain/hostileLocations.js`'s `importHostileLocations()` gained a
   final pass, after all three catalogs land, that calls the existing
   `addRelationship(campaign, worldId, starId, 'orbits', 'located_at')`
   for every `HOSTILE_LOCATIONS` entry — idempotent (`addRelationship`
   no-ops on an already-linked pair) and unconditional (runs even for
   worlds that already existed from an earlier import), so re-running
   import after a later zone lands still backfills any missing link.
4. **The star name is no longer duplicated as a tag on the world** —
   `hostile-canon`/zone/`locationKind` remain, but the relationship
   above is now the single source of truth for "which star does this
   world orbit," not a tag string that could drift out of sync with the
   real `starSystem` field.

**2026-07-08 fourth follow-up (same day)**: on request to recommend and
then apply the clearest way to represent the Zone > Star > World > Base
containment hierarchy in the entity tracker and the Graph. Recommendation
given and accepted: reuse the existing Relationships/Graph mechanism
rather than invent a new hierarchy concept, using a consistent two-type
pattern across every pair (no separate "orbits" type, and no different
treatment for a `#deepspace`/`#orbit` system-object vs. a `#planet` —
the tags already carry that distinction for filtering).

1. **`RELATIONSHIP_TYPES` gained `contains`** (`entities.js`,
   `RELATIONSHIP_TYPE_LABEL.contains = 'Contains'`), alongside the
   existing `located_at`. Left unconstrained in
   `RELATIONSHIP_TYPE_TARGETS` (like `linked`/`allied_with`/etc.) since
   a "contains" edge is reasonable from a Location to any entity type,
   not just another Location.
2. **The Relationships add-row now asks for the type before the
   target** (`inspector()`, `drawers/index.js`) — swapped the two
   `<select>`s' DOM order; `data-entity-link-add`'s handler already read
   both by attribute selector, not tab/DOM order, so no shell.js change
   was needed.
3. **A new `HOSTILE_ZONES` catalog** (`data/hostileLocations.js`, one
   entry so far: "Near Earth Zone", tagged `#zone`) sits above stars in
   the hierarchy — import order is now Bases, Zones, Stars, then
   Worlds.
4. **`domain/hostileLocations.js`'s new `linkContains(campaign,
   parentName, childName)`** replaces the previous follow-up's
   single-purpose `orbits`/`located_at` loop: it sets the parent's edge
   to `type: 'contains'`/`label: 'Contains'` (via `addRelationship`)
   and then explicitly retypes/relabels the child's mirrored edge to
   `type: 'located_at'`/`label: 'Located At'` (via
   `updateRelationshipType`/`updateRelationshipLabel` — the mirror
   `_link` creates on its own defaults to generic `'linked'`, which
   isn't what "Located At" needs). Called for every Zone→Star, Star→
   World, and World→Base pair after all four catalogs land: Zone
   -Contains-> Star -Contains-> World -Contains-> Base, with the
   reverse edge on each pair reading Located At. A Base entity (e.g.
   USSC) ends up with one Located At edge per world it has a presence
   at, since the same canonical Base entity is referenced by several
   worlds' `bases` arrays — this is an ordinary many-edges-from-one-
   entity relationship, not a new mechanism.
5. Verified via a rewritten domain test (asserting the exact
   type/label on both sides of the Zone↔Star, Star↔World, and
   World↔Base pairs, 334 total) plus a jsdom smoke test confirming the
   same chain end to end and the Relationships row's new field order.

**2026-07-09 fifth follow-up — JSON-pack conversion**: on request to
"Convert the Locations database done in javascript into a gamesystem
specific import JSON file that does not delete existing content." The
catalog itself (`HOSTILE_BASES`/`HOSTILE_ZONES`/`HOSTILE_STARS`/
`HOSTILE_LOCATIONS`, ~1000 lines of plain data, no functions) moved out of
bundled JS entirely into `assets/data-packs/hostile-near-earth-zone.json`
— `{ zones, bases, stars, locations }`, an exact structural export of the
four arrays with no reshaping — fetched only at import-click time rather
than shipped in every page load's JS bundle.

1. **`domain/hostileLocations.js`'s `importHostileLocations(campaign)`
   became `importHostileLocations(campaign, pack)`** — its own dedup-by-
   name and `linkContains` relationship-building logic is byte-for-byte
   unchanged, it just reads `pack.bases`/`pack.zones`/`pack.stars`/
   `pack.locations` instead of the four module-level constants it used to
   import statically. A missing/malformed section (not an array) is
   treated as empty rather than throwing, so a partial or hand-edited pack
   degrades gracefully instead of crashing the whole import. This keeps
   the module exactly as pure/synchronous/DOM-free as before (rule 3) —
   it has no idea its data now comes from a fetch, only that it's handed
   a plain object.
2. **New `src/ui/hostileLocationsFetch.js`** (not `domain/`, since
   `fetch()` is neither pure nor synchronous) does the actual network
   call, mirroring `ui/mechanicsScan.js`'s already-established pattern
   for this exact constraint: `file://` is a hard no (Chromium treats a
   `file://` page's `fetch()` to another `file://` resource as
   cross-origin and blocks it outright), so it checks `location.protocol`
   up front and throws a clear "needs `npm run serve`" message rather
   than attempting and failing per-request. Every other feature in this
   app still works over a plain `file://` double-click; this one joins
   Mechanics Index/TOC scan as the exceptions.
3. **`src/data/hostileLocationsMeta.js`** (new, tiny) keeps just four
   numbers — world/star/base counts and the zone label — as bundled JS,
   hand-maintained, so Settings' legend text ("30 worlds, 30 star
   systems, and 4 bases authored so far...") can render before the real
   pack is ever fetched, without a network round-trip just to describe
   what the import button will do.
4. **`src/data/hostileLocations.js` (the old JS data file) is deleted**
   — its content lives on, verbatim, as the JSON pack; its two unused-
   outside-itself helper functions (`findHostileLocation`/`findHostileStar`/
   `findHostileBase`/`findHostileZone`) were dropped rather than ported,
   since nothing outside that file ever called them.
5. **Nothing about the dedup-by-name safety or the Contains/Located-At
   relationship-linking changed** — per the direct request's "does not
   delete existing content," an already-imported world/star/zone/base is
   still skipped, never overwritten, and re-running the import after a
   future zone is appended to the JSON pack is exactly as safe as before.
6. Verified via 5 new/updated domain tests (345 total — tests now read
   the JSON pack directly off disk with plain `fs`, standing in for the
   `fetch()` a real browser does, and pass it explicitly to
   `importHostileLocations`) plus two jsdom smoke tests: one confirming
   the `file://` guard's error message and a real HTTP fetch-then-import
   round trip against a local static server (65 entities created, Earth's
   `starSystem` correctly resolved to "The Sun"), and a second confirming
   Settings' legend text and import button still render correctly from
   the new small metadata file.

**2026-07-09 sixth follow-up — Fomalhaut Settlement Zone**: the second
zone on this ADR's rollout checklist, per the direct request "create the
importable location database for FOMALHAUT SETTLEMENT ZONE."

1. **24 worlds, 24 stars, 1 zone**, transcribed from `assets/docs/Hostile
   setting.pdf`'s FOM World Data table (p.29), star catalog (pp.50-53),
   and the "Outer Rim Worlds - Highlights" page (p.75). FOM is Outer Rim
   material, not Core — the book gives it no per-world Planetology/
   Development prose the way every NEZ world got (pages 54-74); only four
   FOM entries get real descriptive text, all sourced from the Highlights
   page: Fomalhaut (the system itself — three named gas giants, an ICO
   "free zone" gone lawless), Medusa (an explicitly-named moon of a gas
   giant around Ross 780, hence `locationKind: 'orbit'`), LR210 (the
   outermost of three super-hot super-Earths around 82 Eridani), and
   LR203 (orbiting the flare star EV Lacertae). The other 20 worlds get
   the same honest "cataloged with minimal detail beyond its World Data
   table entry" summary this ADR already used for six sparse NEZ worlds,
   built only from their own UWP decode (trade codes, star type) — no
   invented lore.
2. **No bases catalog entries.** NEZ's USSC/JASDF/DRW/MRA assignments
   (Earth, Armstrong, Tau Ceti, etc.) came from per-world prose naming a
   specific national base — FOM's zone map only shows generic "Space
   Force Base"/"MRA Base" icon categories with no per-world national
   attribution decodable from the extracted text, so every FOM world's
   `bases` stays `[]` rather than guessing.
3. **A second JSON pack file, not one growing file.** New `assets/
   data-packs/hostile-fomalhaut-settlement-zone.json`, exact same
   `{zones, bases, stars, locations}` shape as the Near Earth Zone pack —
   kept as its own file (rather than appended into `hostile-near-earth-
   zone.json`) so each zone stays independently reviewable/citable and
   future zones don't risk merge conflicts in one large file.
   `ui/hostileLocationsFetch.js`'s `fetchHostileLocationsPack()` now
   fetches every URL in a `PACK_URLS` array and concatenates each pack's
   four arrays before returning — `domain/hostileLocations.js`'s
   `importHostileLocations()` needed zero changes, since it already just
   loops whatever arrays it's handed. Settings keeps its one **"🌍 Import
   HOSTILE Canon Locations"** button, now covering both zones at once;
   adding Capella/New Concessions/EZ6/EZ9 later only means appending
   another URL to `PACK_URLS` and another file, no UI change.
4. **`Fomalhaut` (the world) and `Fomalhaut System` (its star) disambig-
   uated** exactly like Tau Ceti's precedent (2026-07-08 follow-up) — the
   star's `starSystem` self-references its own name, "Fomalhaut System",
   not "Fomalhaut", so it never collides with the world entity sharing
   the real star's name.
5. **`HOSTILE_LOCATIONS_META` updated** to the combined total (54 worlds,
   54 stars, 4 bases, zone label naming both zones) — still the one
   piece of the catalog shipped as bundled JS, so Settings' legend text
   doesn't need a network round-trip just to render.
6. Verified via 4 new domain tests (354 total): the FOM pack's shape (24/
   24/1/0), no name collisions between the FOM and NEZ packs, a
   FOM-pack-alone import (creates every entity, links Zone->Star->World
   containment), and a merged-pack import producing the union of both
   zones' entities — matching exactly what the real fetch-and-merge does.
7. Extracted the sourcebook's text for this pass via a throwaway
   `pdfjs-dist` Node script (installed with `--no-save`, not a permanent
   dependency — CLAUDE.md's environment-constraints exception for a
   dev-only one-off tool) run against the vendored PDF.js's own legacy
   Node build, since no PDF page-rendering tool was available in this
   environment; the output was discarded after this pass, no artifact
   committed.

## Context

Direct ask: "Make a robust and fully detailed locations database for
Hostile by closely examining the Hostile Settings PDF and building a
detailed and comprehensive entities database of all worlds and
destinations like starbases, asteroid colonies and related capitals or
colonies. Be sure to capture all attributes of each location and if
attribute fields are not available for everything then add any
unavailable attributes to the Entity Locations template, and add the
detail retroactively."

`assets/docs/Hostile setting.pdf` (321 pages) turned out to contain a
full Cepheus Engine/Traveller-style gazetteer: 108 named worlds/stations
across the setting's zones (Near Earth Zone, Fomalhaut Settlement Zone,
Capella Extraction Zone, New Concessions Zone), each with a UWP
(Universal World Profile) stat line — hex, starport class, world size,
atmosphere, hydrographics, population, government, law level, tech
level, bases, trade codes, gas-giant flag — plus a star system name and
classification, and (for most worlds) a "Planetology"/"Development"
prose write-up covering environment, colonial history, controlling
corporation, population figure, and hooks. None of this existed as
entity fields anywhere in this codebase; a Location's only structured
fields before this ADR were ADR 0013's `developmentLevel` and ADR 0025's
`biome`, both Trade-pricing inputs, not descriptive/reference data.

Four scoping questions (via `AskUserQuestion`, all "Recommended" chosen)
resolved the design:

1. **Import, not read-only reference or auto-seed.** A Settings button
   bulk-creates real, fully-editable Location entities in the GM's
   current campaign — matches "build an entities database" literally,
   and nothing is forced on a campaign that doesn't want it.
2. **A full UWP "World Profile" card** — ~13 new optional Location
   fields, same additive/blank-by-default posture ADR 0013/0025 already
   established.
3. **Condensed prose**, not verbatim paragraphs — a few GM-scannable
   sentences per world rather than the book's full multi-paragraph
   write-ups, so 108 (eventually) entities stay usable at the table.
4. **Incremental rollout** — build the mechanism once, then populate the
   canon data file zone by zone. The import action is idempotent (dedup
   by name), so each new zone's data just needs appending.

## Decision

**UWP was chosen because it's what the sourcebook itself already
uses** — this isn't a borrowed system needing an ADR-0010-style
copyright bridge (a naming suffix disclosing "not the source material,
just inspired by it"); it's HOSTILE's own real, owned content (the PDF
already lives in this repo's Reference Library), transcribed and
condensed for the GM's own offline use, the same way `data/gearCatalog.js`
already cites real sourcebook pages for its cross-system stat lines.

**Two new files, mirroring `data/economyTypes.js`'s exact posture**
(small, citable reference tables plus a data instance):

- `src/data/hostileUwpTables.js` — decode tables (`STARPORT_CLASSES`,
  `WORLD_SIZES`, `ATMOSPHERES`, `HYDROGRAPHICS`, `POPULATIONS`,
  `GOVERNMENTS`, `LAW_LEVELS`, `BASES`, `TRADE_CODES`), each
  `{code, label, description}` with a `findX(code)` helper. Tech Level
  is deliberately NOT a full digit table — the sourcebook states human
  space is uniformly ~TL12, variation is expressed through Trade Codes
  instead — so `techLevel` stays a plain free-text field.
- `src/data/hostileLocations.js` — the canon dataset,
  `HOSTILE_LOCATIONS`, one entry per world (id, name, zone, hex, every
  UWP field already decoded, star system, a condensed `summary`, and a
  `page` citation into the sourcebook). A header comment tracks rollout
  status as a living checklist. **This pass ships the Near Earth Zone —
  30 worlds** (Abyss, Armstrong, Attica, Aurora, Columbia, Crown,
  Cyclops, Defiance, Earth, Edo, Exile, Forlorn, Goldstone, Hamilton,
  Hiroshima, Inferno, Ixion, Jade Palace, Kibo, LQ105, Nevermind, New
  Tokyo, Olympus, Oppenheimer, Paydirt, Prosperity, Requiem, Rock 17,
  Tau Ceti, The Solomons). Six of these (Kibo, Forlorn, Exile, Paydirt,
  Goldstone, Requiem) have no dedicated write-up in the sourcebook
  beyond their World Data table row — their `summary` says so honestly
  rather than inventing detail.

**`ensureLocationFields` (entities.js) gained a new
`ensureWorldProfileFields` sub-call** — 13 new fields (`hex`, `zone`,
`starport`, `worldSize`, `atmosphere`, `hydrographics`, `population`,
`government`, `lawLevel`, `techLevel`, `bases: []`, `tradeCodes: []`,
`gasGiant: false`, `starSystem`), all blank/false/empty by default, at
the same two existing call sites (`_create`, `updateEntity`) — no new
wiring needed. Independent of `developmentLevel`/`biome`: a Location can
carry a UWP alongside, instead of, or without either — the UWP fields
are reference/descriptive, they never feed Trade's `priceAt()`.

**`src/domain/hostileLocations.js`'s `importHostileLocations(campaign)`**
— pure, loops `HOSTILE_LOCATIONS`, skips any name already present via
the existing `findByName()` (entities.js), and for each new one calls
`createEntity` + `updateEntity` to patch in every field plus
`tags: ['hostile-canon', zone]` and `overview: summary`. Mirrors
`createItemFromCatalog`'s exact "catalog entry in, real entity out"
shape. Returns `{campaign, createdIds}`. Safe to re-run after a future
zone is appended — already-imported worlds, including any a GM has
since hand-edited, are never touched again.

**UI**: `ui/drawers/index.js`'s new `worldProfileSection(doc, e)`
(mirroring `locationSection`'s "only render for this entity type"
shape) renders inside the existing Location card whenever a Location has
any World Profile field set, or whenever the active genre pack is
Hostile (so a GM can start filling one in without needing the import
first). Single-value coded fields (starport, size, atmosphere,
hydrographics, population, government, law level) are `<select>`s
populated from the new decode tables, same `— unset —`-first pattern as
`developmentLevel`/`biome`. `bases`/`tradeCodes` (genuinely multi-value)
are edited as a plain comma-separated `<input>`, with a small addition
to `shell.js`'s existing generic `data-entity-field` change handler
(already special-cased `type`) to split that CSV text into an array —
the same shape `entities.js`'s `setEntityTags` already uses for tags,
just inlined since this is the one place a text field feeds an array.
`gasGiant` is the app's first checkbox-backed `data-entity-field`; the
handler now reads `t.checked` instead of `t.value` when the control is
a checkbox — a small, general addition (works for any future boolean
field, not special-cased to this one).

A new Settings section, `hostileCanonLocationsSection`, gated on
`settings.genrePack === 'hostile'` (a new whole-section genre gate — no
exact precedent existed yet, since Trade Economy Model/Biome above it
are useful across every genre pack; UWP is Cepheus-Engine/HOSTILE-
specific). Holds the **"🌍 Import HOSTILE Canon Locations"** button
(wired in `shell.js` exactly like `data-advance-faction-turns` — no
confirmation dialog, since the action is additive/idempotent) plus a
reference legend for Starport Classes, Bases, and Trade Codes (the three
tables that most benefit from a description alongside the code — Size/
Atmosphere/Hydrographics/Population/Government/Law Level are already
legible directly in each dropdown's own `code — label` options).

## Alternatives considered

- **Auto-seed all 108 into every new Hostile-genre campaign.** Rejected
  — most automatic, but clutters a fresh campaign a GM might want empty,
  and isn't reversible without a bespoke "undo the seed" mechanism.
- **Read-only reference table only, no entity creation.** Rejected —
  doesn't satisfy "build an entities database" and leaves a GM
  hand-typing 30+ Locations to actually use any of this.
- **Merge World Profile into the existing "Location card" as one
  undifferentiated block.** Rejected in favor of a visually distinct
  sub-card — 13 fields is a lot to mix into the 2-field Development
  Level/Biome block without making that block's own "these two dials
  bias Trade" framing harder to scan.
- **Verbatim paragraph capture.** Rejected per the resolved scoping
  question — a full Planetology+Development paragraph pair runs several
  times longer per world than a usable at-the-table summary; the `page`
  citation lets a GM pull the original from the Reference Library when
  they want the full text.

## Consequences

- A GM who never imports or touches these fields sees zero behavior
  change — same "purely additive" posture every prior Location-field
  ADR in this codebase has held to.
- **Rollout checklist** (tracked at the top of
  `data/hostileLocations.js`, update there as each pass lands):
  - [x] Near Earth Zone (NEZ) — 30 worlds, this pass.
  - [x] Fomalhaut Settlement Zone (FOM) — 24 worlds, sixth follow-up
        (2026-07-09).
  - [ ] Capella Extraction Zone / New Concessions Zone (subsector codes
        observed in the source: CAP, EZ6, EZ9 — exact zone/subsector
        boundaries need confirming against the source text during that
        pass, since the book's own subsector-labeling turned out to be
        less uniform than Near Earth Zone's single `NEZ` tag).
  A future pass only needs to append entries to `data/hostileLocations.js`
  — the schema fields, UI, import action, and tests already cover any
  new entry with no further code changes.

## Related packs / ADRs

ADR 0013 (Location `developmentLevel`, the first structured Location
field), ADR 0025 (Location `biome`, the second — this ADR's `hasAny ||
genrePack==='hostile'` render gate and `ensureLocationFields` extension
directly follow its pattern), ADR 0012 (`gearCatalog.js`'s real-page-
citation discipline, followed here via each entry's `page`).
