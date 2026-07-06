# ADR 0012 — Gear/Weapon entity sub-type + cumulative tag sub-filter

## Status

Accepted, implementation in progress. User-requested (2026-07-06):
"design an entity sub-type for gear and weapons that work similar to
NPC/Character sub-types where an item across systems would have stats for
each system as a game-specific attribute to apply in whatever rule-system
is active," plus an extensive cross-PDF gear/weapon/armor catalog with
tags, plus a cumulative tag sub-filter on the entity filters.

## Context

Every other stat-bearing concept in this app already has a home: NPCs pick
a Bestiary template (`data/statblockTemplates.js`), Characters pick one or
more ruleset sheets (`data/rulesets.js`, multiple simultaneous groups),
Vehicles get a fixed template. There is no equivalent for a physical
item — a weapon, a suit of armor, a piece of survival/medical/hacking
gear — as a first-class, linkable, taggable, cross-system-stated thing. An
NPC's "Notable Gear" field is free text; nothing about it is structured,
searchable by tag, or system-aware.

Two custody requirements shape the design:

1. **"Across systems" means simultaneous, not picked-once.** The user's own
   phrasing — "an item across systems would have stats for each system as
   a game-specific attribute to apply in whatever rule-system is active" —
   matches the **Character** sheet pattern (a Character can carry a
   Starforged sheet AND a 5PFH sheet at once, `entity.statblocks[]`), not
   the **Bestiary** pattern (an NPC picks exactly one template). A single
   "Snub Pistol" item entity should be able to hold Starforged stats, 5PFH
   stats, Traveller stats, Hostile stats, and SWN stats all at once, and
   whichever the campaign's active `settings.statRuleset` is determines
   which one is "the" relevant sheet at a glance — the others stay present,
   not discarded.
2. **A real sourcebook now exists for two systems ADR 0010 said had none.**
   `assets/docs/` now contains `Traveller-2e-Core-Rulebook.pdf` (git-tracked)
   and Stars Without Number's Deluxe Edition + Cities Without Number
   (present on disk, not yet git-tracked) — both arrived after ADR 0010
   declared "no sourcebook exists ... for either system" and after ADR 0002
   made the same claim. ADR 0010's own risk note anticipated exactly this:
   *"if a real Traveller or SWN sourcebook is ever added to `assets/docs/`,
   this content should be revisited against it rather than assumed
   accurate."* This ADR mines the real books for gear content rather than
   inventing more original content on top of ADR 0010's already-original
   character sheets — it does **not** redo ADR 0010's existing character
   stats, which is a separate, larger reconciliation left for its own pass.

## Decision

### 1. New entity type: `item`

`ENTITY_TYPES` (`domain/entities.js`) gains `'item'` (`TYPE_LABEL.item =
'Item'`), alongside npc/location/faction/asset/lore. This is the cheapest
possible way to make gear first-class: an Item entity gets tags, `@mention`
linking, relationships (`owns` already exists and now has a real use —
"NPC X owns Item Y"), Cast drawer listing, Graph nodes, and Universal
Search, all for free — none of that machinery cares what `type` string it
sees, it's already data-driven over `ENTITY_TYPES`.

### 2. New statblock kind: `gear`, structurally parallel to `character`

`domain/statblocks.js`'s `makeStatblock(kind, rulesetId, templateId,
settings)` gains a `kind === 'gear'` branch:

```js
if (kind === 'gear') {
  const tpl = DEFAULT_GEAR_TEMPLATES[rulesetId] || DEFAULT_GEAR_TEMPLATES.hostile;
  const fields = tpl.fields.map(templateFieldToStatblockField); // reused, unchanged
  return { kind: 'gear', ruleset: rulesetId || 'hostile', fields };
}
```

Two deliberate choices here:

- **Discriminated by `ruleset` (like `character`), not `templateId` (like
  `npc`/`vehicle`).** This is what makes "add a group per system, keep them
  all" work automatically — `entities.js`'s existing "+ Add a statblock"
  dedup logic already keys character groups by `ruleset` and only offers
  systems not yet present; the exact same `presentRulesets`/dedup shape
  gets reused for `gear`, one line of near-duplicate code, not a new
  mechanism.
- **Field shape borrowed from Bestiary templates, not from
  `characterTemplate`'s `{stats, tracks}` shape.** A character's stats are
  homogeneous (rollable modifiers) and tracks are homogeneous (depleting
  resources) — gear stats are not: Damage and Traits are descriptive text,
  Tech Level and Cost are plain numbers, an Armor Rating might be a track,
  a to-hit bonus might be a rollable attribute. Bestiary's existing
  `{key, kind: 'text'|'attribute'|'track', rollMethod, format, max,
  target}` field shape already handles this heterogeneity — reusing it
  means zero new field-rendering code in `ui/drawers/index.js`, since a
  gear group's fields render through the exact same field-kind switch a
  Bestiary group's fields already do.

New `data/gearTemplates.js`, mirroring `data/statblockTemplates.js`
exactly (same `withDefaults()` helper, re-exported from there to avoid
duplication): `DEFAULT_GEAR_TEMPLATES` keyed by system id (`starforged`,
`5pfh`, `traveller`, `hostile`, `swn`) — five systems, not six; Planetfall
is a 5PFH supplement and reuses `5pfh`'s gear shape rather than getting its
own (confirmed during research — see Consequences). Each system's template
only defines the fields that system actually uses (Starforged has no
"Tech Level"; Traveller has no narrative "Bonus to Iron"), so a gear
group's shape genuinely varies system to system, matching the request's
"game-specific attribute."

### 3. `data/gearCatalog.js` — the extensive cross-PDF list

An array of catalog entries, each:

```js
{
  id: 'snub-pistol', name: 'Snub Pistol', category: 'weapon', // weapon | armor | gear
  tags: ['handgun', 'concealable'],
  stats: {
    starforged: { Bonus: '+1 to Iron when concealed', Notes: '...' },
    fivepfh: { Range: 'Short', Shots: 1, Traits: 'Pistol' },
    traveller: { Damage: '3d6-3', Range: 'Short', TL: 5, Cost: '150 Cr' },
    hostile: { Damage: '2d6', Range: 'Close', Ammo: 6, Traits: 'Concealable' },
    swn: { Damage: '1d6', Range: 'Close', Cost: '150cr' },
  },
}
```

Only systems the source material actually gives that item are present —
nothing is back-filled with invented numbers for a system that doesn't
cover it. Content mined from the actual PDFs already in this repo's
library: Ironsworn/Starforged rulebook + reference guide, 5PFH core +
Compendium (+ a Planetfall check), `HOSTILE-TECH2.pdf` + Marine Corps +
Tool Kit, the real Traveller 2e Core Rulebook, and the real SWN Deluxe
Edition (+ Cities Without Number) — five parallel research passes, one per
system, each reporting name/category/tags/stats/source-page so every
catalog entry is traceable back to a real page, not invented. Tags drawn
from one shared, pre-agreed vocabulary across all five passes (handgun,
rifle, shotgun, smg, heavy-weapon, melee, blade, blunt, explosive,
grenade, energy-weapon, launcher, improvised, light-armor, medium-armor,
heavy-armor, powered-armor, void-suit, shield, survival-gear,
medical-gear, tool, sensor, communication, hacking-gear, wetware, utility,
consumable, illegal, restricted) so the catalog reads as one consistent
system, not five independently-tagged lists stitched together.

### 4. Creating an Item from the catalog

New `createItemFromCatalog(campaign, catalogId)` (`domain/entities.js` or a
small new `domain/gear.js` — implementation detail, not architecturally
significant either way): creates an `item`-type entity, sets its `name`
and `tags` from the catalog entry, and adds one `gear` statblock group
**per system present in that entry's `stats`** — e.g. a catalog item with
Starforged/5PFH/Hostile data gets three gear groups at once, pre-filled,
the same "additive, never a replace" posture every other statblock-group
creation in this app already follows. UI: a "🎲 From Catalog" picker
alongside the Cast drawer's existing "+ NPC"/"+ Location"/etc. add-entity
chips — search/select a catalog entry, click, done. A GM can still add a
bare Item entity manually (no catalog) and build gear groups field-by-field
via the same "+ Add a statblock" mechanism every other entity type uses,
for homebrew gear the catalog doesn't cover.

### 5. Cumulative tag sub-filter on entity filters

The Cast drawer already has a type-filter chip row (`entityTypeFilter`)
and search box (`entitySearch`) — and the **Documents drawer already has
exactly the tag-sub-filter pattern this item asks for**
(`docTagFilters`/`docTagListOpen` in `ui/shell.js`, AND-semantics
multi-select chips, a collapse toggle for a long tag list). This ADR
reuses that pattern verbatim for entities rather than inventing a second
one:

- `entityTagFilters` (a `Set`, ephemeral UI state) + `entityTagListOpen`
  (collapse toggle) in `ui/shell.js`, mirroring `docTagFilters`/
  `docTagListOpen` field-for-field.
- New `listEntityTagVocabulary(campaign, { types, search })` in
  `domain/entities.js` — **cumulative** means computed from whichever
  entities the *type filter and search box already narrowed to*, not a
  static global tag list: switching the type filter to `item` shows only
  tags actually used by Item entities (handgun/rifle/armor/...); switching
  to `npc` shows NPC tags instead (`#character`, homebrew tags, ...);
  `All` shows the union. This is what "pulls up the tags allowed for that
  entity type" and "cumulative... based upon the selected entities in the
  filter" both ask for — the same live-computed-off-existing-entities
  posture `listTagVocabulary` (the per-entity tag-adding dropdown) already
  established, generalized from one entity type to the current filter's
  result set.
- Filtering itself is AND across selected tags (an entity must carry every
  selected tag), matching the Documents drawer's existing semantics —
  narrows further as more tags are picked, not the reverse.
- Clearing/changing the type filter resets `entityTagFilters` (a tag valid
  under the old type filter may not exist under the new one) — same
  precedent as switching drawers resetting `docTagFilters`.

## Alternatives Considered

- **Model gear as a statblock `kind` on the existing `asset` entity type**
  instead of a new `item` type. Rejected — `asset` already means "Vehicle
  Stats," and conflating "a starship" and "a snub pistol" under one type
  would break the existing Vehicle-only `statblockAddChoices` scoping and
  muddy the Cast drawer's type filter (a GM filtering "Asset" wanting
  ships would also see every pistol). A new `item` type costs one array
  entry and is unambiguous.
- **One gear template shared across all systems** (a single universal
  field set: Damage/Range/Traits/Cost) instead of per-system templates.
  Rejected — Starforged genuinely has no numeric damage to put in a
  "Damage" field (its combat is narrative), and forcing every system into
  one shape is exactly the "genre-locked" mistake `CLAUDE.md` warns
  against; per-system templates (already proven by Bestiary) let each
  system's real shape show through.
- **Pick-one-template like Bestiary, instead of multiple-simultaneous like
  Character.** Rejected per Context point 1 above — the user's own
  wording is explicit that an item should carry every system's stats at
  once, not force a choice.
- **Fold "wetware" gear into the existing `domain/cybernetics.js` Strain
  system** (installing a Wetware-tagged Item auto-adds a `cyberware[]`
  entry). Deferred, not adopted now — cybernetics.js already models
  *installed* cyberware as a growing list on the wearer, a different
  concept from a catalog of purchasable/lootable items sitting in the
  world. A future link (dragging a `wetware`-tagged Item onto a Character
  offers "Install as cyberware?") is a plausible small follow-on, named
  here so it isn't lost, not built as part of this ADR.

## Consequences

**Positive:** gear/weapons/armor become real, taggable, cross-system-stated
entities using almost entirely existing machinery — one new entity type,
one new statblock kind (reusing Bestiary's field renderer verbatim), and
one new catalog-driven creation action. The tag sub-filter reuses a
pattern this app already validated in the Documents drawer rather than
inventing a second tag-filtering UI. Five independent PDF research passes
each cite real page numbers, so the catalog is auditable against its
sources rather than another layer of original-content-labeled invention.

**Negative/risk:** an extensive catalog is still a bounded sample (roughly
20-35 items per system, not a full transcription of any book's equipment
chapter) — "extensive" here means representative and useful, not
exhaustive; more can be added later as ordinary data, the same "content,
not code" posture every oracle table already has. The Traveller/SWN
sourcebook discrepancy this ADR surfaced (Context point 2) is flagged but
not fixed here — ADR 0010's existing *character* content still needs its
own reconciliation pass against the real books, tracked separately.

## Related Packs / Documents

`docs/adr/0010-traveller-swn-content.md` (the stale "no sourcebook" claim
this ADR's Context section surfaces, without redoing that ADR's scope).
`data/statblockTemplates.js` (the Bestiary field-shape and `withDefaults()`
helper this ADR reuses). `data/rulesets.js` (the multi-simultaneous-group
Character pattern this ADR's gear-group discriminator copies).
`ui/shell.js`'s `docTagFilters`/`docTagListOpen` (the tag-sub-filter
pattern this ADR reapplies verbatim to entities). `domain/cybernetics.js`
(a related but distinct mechanism — installed cyberware vs. a catalog of
items — deliberately not merged, see Alternatives Considered).
