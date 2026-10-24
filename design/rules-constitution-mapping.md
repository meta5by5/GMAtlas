# Rules Constitution: what each option switches

This is the reference for what every Rules Constitution option actually turns
on, and for which functionality is controlled by something else. It reflects
the model in `design/adr/licenses-and-rules-constitution.md` (v0.83.0).

## How a profile's rules are decided

| Layer | Where | Scope | What it decides |
|---|---|---|---|
| **Licenses** | Settings → Licenses | Whole install | Which sourcebooks you own (`src/data/licenses.js`). Owning one turns nothing on; it makes the game pickable and lists its PDFs with Load buttons. |
| **Module for Profile** | Settings → Modules → Game System Module | Per profile | The primary rules system: character sheets, default bestiary, and module-specific features (see "Functionality controlled by the Module for Profile" below). |
| **Rules Constitution** | Settings → Modules → Rules Constitution | Per profile | For each gameplay area: stay with the Module for Profile, or add an owned Game System or Supplement for that area only. |

A Game System is **in use** in a campaign when you own its license **and** it is
either the Module for Profile or picked in some area.

- **Open licenses:** Ironsworn, Ironsworn: Starforged and the D&D 5e SRD are
  CC-BY, so they're always owned. They're still only in use where designated.
- **Independent licenses:** each license stands alone. A Compendium never
  needs its core book.
- **Supplements share their game's license:** a game's supplements ride on
  its single license (all 14 Hostile books, Traveller's supplements, Starsmith
  under Starforged, Delve under Ironsworn).

| License | Sourcebooks | Grants |
|---|---|---|
| Ironsworn: Starforged (open) | Starforged rulebook, Reference guide, Starsmith Assets, Starsmith Expanded Oracles | Starforged |
| Ironsworn (open) | Rulebook, Delve, Assets Master Set | Ironsworn |
| Five Parsecs from Home: Core Rules | Five Parsecs From Home v3 | 5PFH |
| Five Parsecs from Home: Compendium (incl. Bug Hunt) | Compendium | 5PFH Compendium (standalone) |
| Five Parsecs from Home: Planetfall | Planetfall 1.2 | Planetfall (standalone) |
| Five Leagues: Core Rules | Five Leagues 3e, Warband Sheet | Five Leagues |
| Five Leagues: Compendium | Compendium | Five Leagues Compendium (content applies only while Five Leagues is in use) |
| Hostile | 14 books (setting, Marine Corps, Tool Kit, Tech, Alien Breeds, Colony Builder, Crew Expendable, Explorers, Shorts…) | Hostile |
| Stars Without Number | SWN Revised Deluxe | SWN |
| Cities Without Number | CWN Deluxe | none, comes along with SWN |
| Traveller | Core, High Guard, Great Rift 4 | Traveller |
| Intergalactic Space Trader | IST 01–03 | none, comes along with Traveller or Hostile |
| D&D 5e (open) | SRD 5.2.1, Monster Manual | D&D 5e |

**Docs library:** a campaign's Documents drawer, @-mention suggestions and
search have no default entries. They list only sourcebooks that are already
stored in this browser **and** whose license is owned **and** in use in that
campaign (or, for CWN/IST, whose related game is in use). Books get into
this browser from Settings → Licenses: Load once the license is activated,
then Overwrite (asks first, replaces the same copy). The Docs library itself
has no load controls. Existing links to other books still open them.

Every dropdown's first option is **Module for Profile (…)**. Picking it removes
the stored choice, so the area follows the module if the module changes. The
label shows what it resolves to; "→ X" means the module has no rules of its own
for that area, so X is used instead.

## Gameplay areas

**Turn Steps** (Campaign-panel tab, its Crew Tasks and its Navigator workflow
card) come **only** from the two areas marked ⏱ below: Campaign turn and
Colony management. Each area shows the Turn Steps of whatever game it
resolves to. A game in use only for another area never brings its Turn Steps,
and Settings → Modules hides the Turn Step and Crew Tasks sub-tabs entirely
for a profile with neither area assigned.

### ⏱ Campaign turn

| Option | Shown when | Switches on |
|---|---|---|
| Module for Profile | Always | The module's own campaign turn, if it has one: 5PFH → Starship, Five Leagues → Warband. Any other module → none. |
| Five Parsecs From Home | 5PFH owned and not the module | Campaign panel **Starship** tab, its Turn Steps and Crew Tasks; Navigator Starship workflow card; 5PFH sourcebook in the Docs library; 5PFH-tagged packs and templates. Replaces the module's own Turn Steps (one pick per area). |
| Five Leagues from the Borderlands | Five Leagues owned and not the module | Campaign panel **Warband** tab and its Turn Steps; Navigator Warband workflow card; Five Leagues sourcebooks in the Docs library; Five Leagues **Party trackers** (Gold Marks, Enemy Threat, Enemy Plans), which are auto-created and removed again when Five Leagues is no longer in use; Navigator read-only Five Leagues tracker section; Five Leagues-tagged packs and templates. |

### ⏱ Colony management

| Option | Shown when | Switches on |
|---|---|---|
| Module for Profile | Always | Nothing. No module carries colony rules. |
| Planetfall (Five Parsecs from Home) | Planetfall owned | Campaign panel **Colony** tab (colony sheet, encounters, Turn Step walkthrough); Navigator Colony workflow card; Planetfall-tagged packs and templates (e.g. Planetfall Lifeforms). |

### Character creation

| Option | Shown when | Switches on |
|---|---|---|
| Module for Profile | Always | The module's own character options only. |
| Five Leagues from the Borderlands: Compendium | Compendium owned **and** Five Leagues in use | The Compendium's extra **Origins** in the Five Leagues character sheet's Origin picker. A character that already has one keeps showing it if this is later turned off. |

### Bestiary & enemies

| Option | Shown when | Switches on |
|---|---|---|
| Module for Profile | Always | The module's own core enemy and creature packs. |
| Five Parsecs From Home: Compendium (Bug Hunt) | Compendium owned (standalone, no 5PFH needed) | The "5PFH Compendium Lifeforms & Enemies (Bug Hunt)" pack in Settings → Campaigns → Source Data; the Compendium in the Docs library. |
| Five Leagues from the Borderlands: Compendium | Compendium owned **and** Five Leagues in use | The "Five Leagues Enemies (Compendium)" pack in Settings → Campaigns → Source Data; the Compendium in the Docs library. |

### Factions

| Option | Shown when | Switches on |
|---|---|---|
| Module for Profile (→ GMAtlas Core) | Always | No module carries faction rules, so factions use the **GMAtlas Core** catalog. |
| Stars Without Number | SWN owned | Faction Turn Engine uses **SWN's** transcribed assets, tags and goals for every faction without its own per-faction override; SWN-tagged packs and templates; SWN (and an owned Cities Without Number) in the Docs library. |
| GMAtlas Core | Always (free) | Same as the default, but pinned explicitly. |

A per-faction provider override always beats this choice. A stored SWN choice
is honored even if SWN is later un-owned, so existing faction data never
silently switches catalogs.

### Frontier setting

| Option | Shown when | Switches on |
|---|---|---|
| Module for Profile | Always | Nothing extra. Sci-fi biomes still fall back to Hostile's list. |
| Hostile | Hostile owned | All 14 Hostile sourcebooks (and an owned Intergalactic Space Trader) in the Docs library; Hostile data packs (the Canon Locations gazetteer) in Settings → Campaigns → Source Data; Hostile's biome list for sci-fi campaigns. |

## Functionality controlled by something other than a gameplay area

### Controlled by the Module for Profile

- **Character sheets:** the template on every `#character` NPC, including new Protagonists created from WHO.
- **Default Bestiary statblock** for new NPCs. Starforged, 5PFH, Five Leagues and D&D 5e have their own; the rest use the generic one.
- **Starforged only:** the Navigator pressure dials (Threat, Mystery, Stress, Resources, Reputation) and the Party Momentum/Supply trackers.
- **Five Leagues only:** the attacker/defender flow in the Combat Tracker, Five Leagues location tag seeds and type icons, and the Hexcrawl plugin checkbox.
- **5PFH only:** the Colony and World Tracker plugin checkboxes in the Campaign's Plugins section.
- **Ironsworn only:** swaps the Oracle drawer and Helpful Oracles to the fantasy tables.
- **Genre Pack:** auto-synced when the module changes; it can still be overridden afterwards.
- **Reference Library:** the Ruleset Guide's default documents and the Game Mechanics Index scan target.

### Controlled by the Genre Pack

- Oracle tables, Helpful Oracles, and the Location tag vocabulary.
- Terminology: "Bestiary/LifeForm" and System/Star vs Realm/Ruler.
- The World Profile (UWP) card, shown for sci-fi campaigns on `#World`-tagged Locations.
- Biome lists for non-sci-fi campaigns.

### Controlled by Plugins (Settings → Modules → Visible plugins)

These show or hide whole panels and don't involve licensing: Colony, World
Tracker, Trade, Battlemap, Hexcrawl, Dungeon Crawl, Graph, Faction Events.

### Other per-profile or per-campaign settings

- **Trade Economy Model:** Location economy types and price bias.
- **Turn Step List assignments:** which list backs each Campaign-panel tab.
- **Party roster headline fields** and **Storyboard positions.**

### Settings → Campaigns → Source Data

Preloads game data into the current campaign, one pack at a time: lifeforms
and enemies from `assets/content-packs/` as Cast entities, and Hostile's
canon locations (`assets/data-packs/hostile-near-earth-zone.json`,
`hostile-fomalhaut-settlement-zone.json`) as Locations. A pack is listed only
when its sourcebook's license is owned **and** in use in this campaign, which
is the same test as the Docs library. Imports add to the campaign and skip
anything that already exists by name.

| Pack | Sourcebook license |
|---|---|
| Planetfall Lifeforms | Planetfall |
| Five Parsecs from Home Lifeforms & Enemies | Five Parsecs from Home: Core Rules |
| 5PFH Compendium Lifeforms & Enemies (Bug Hunt) | Five Parsecs from Home: Compendium |
| Five Leagues Enemies (core) | Five Leagues: Core Rules |
| Five Leagues Enemies (Compendium) | Five Leagues: Compendium |
| D&D 5e SRD Monsters | D&D 5e (open) |
| HOSTILE — Near Earth Zone, Fomalhaut Settlement Zone | Hostile |

### Install-wide

- **Licenses:** ownership; every sourcebook's Load button (stores the PDF in this install for offline use) and its Sourcebook Inventory authoring status; which packs the Licenses tab lists. Hostile's World Information reference shows under the Hostile license once it's owned.
- **Entitlements:** whether this install may own a book at all. Locked books are shown with 🔒.

### Not switched by anything

- **Activity → Suggested Rules Lens** (HOW Activity plus the Advisor card). It only *suggests* a module and has its own provider lists.
- **Platform features:** the GMAtlas Core platform itself (journal, scenes, entities, campaign memory, continuity, search).

## Areas removed from the Rules Constitution

These rows existed before v0.82.0 but never switched any functionality:
Story structure, Exploration, Tactical combat, Sector generation, World
generation, Trade, NPC generation, Discovery, Horror, Vehicle rules, Crew
relationships, Reputation & Heat, Long-term campaign memory, Story continuity,
Rules switching, Recommendation engine.

Any old choice stored for them stays in profile data, unused. The Activity
recommender keeps its own copy of the relevant suggestions.
