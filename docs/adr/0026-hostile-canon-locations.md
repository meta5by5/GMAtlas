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
  - [ ] Fomalhaut Settlement Zone (FOM)
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
