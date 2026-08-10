# ADR 0027 — Encounter Manager design + real Planetfall icon content

## Status

Proposed — a scoping/content pass, extending `docs/adr/0024-battlemap-
encounter-roadmap.md`'s 11b/11c/11e sub-phases with real source material
and a fuller Encounter Manager design. No code yet.

## Context

Follow-up clarifications on ADR 0024's sequence, from direct user request:

1. Two new battlemap icon sets should come from the actual Planetfall
   rulebook, not be invented: an **exploration/sector-tracking** set
   ("page 53") for the Grid Battlemap, and a **buildings** set ("p.99
   PDF / p.97 book TOC") for the room/asset-template item (11c).
2. **Encounter Manager** needs its combat/initiative mechanics to
   genuinely read from whichever ruleset is active per campaign (5PFH
   vs. SWN vs. others as they're added), switchable in Settings, one
   active at a time — not a single generic tracker with a cosmetic label.
3. **Interactive Maps** "should have layers" (re-raised after ADR 0024
   scoped multi-floor down to linked maps, not a layer stack).
4. **Mobile UX**: forms/tabs need more compact access on small screens.
5. **Shipyard**: a real reference URL was given
   (`https://ivan.sanchezortega.es/geomorph-shipyard/`), resolving the
   long-blocked "needs the tool's actual URL" item — but the live page
   didn't yield fetchable content (client-rendered, no server-side HTML),
   so its actual navigation/filtering design is still unresearched.

### Source material actually checked

`assets/docs/5PFH Planetfall 1.2.pdf` (this repo's existing Reference
Library PDF) was read directly via `pdftotext` for this ADR — the same
2-page front-matter offset the original Battlemap ask already flagged
(PDF page = printed/TOC page + 2) holds throughout:

- **Printed p.53 (PDF p.55), "Travel on the Map"/"Recording Map Factors"**:
  the campaign map's sector-marking legend — a home/colony sector (`H`
  or a star), Investigation Sites (`I` or `?`), a **Resource Level**
  value written into a sector (e.g. `R3`), a **Hazard Level** value
  (e.g. `H5`, distinct from the colony's plain `H` by always carrying a
  number), **Enemy Occupation** (a color or symbol per enemy type, the
  book leaves the exact symbol to the GM), an **Enemy Strongpoint**
  (`S`), and an **Ancient Sign** (`A`). This is a real, complete, small
  legend — enough to build a genuine icon set from, not a guess.
- **Printed p.97 (PDF p.99), "Buildings"**: the start of a long
  **Buildings table** (BP cost / prerequisites / effect per building).
  Spot-checking PDF pp.99–101 alone already surfaces a dozen+ named
  buildings (Academy, Adapted Protective Shield Installation, Advanced
  Manufacturing Plant, Advanced Medical Center, an unnamed Tier-1-
  equipment workshop, an unnamed infirmary, AI-Assisted School,
  Biological Adaptation Research Site, Bot Maintenance Bay, Civilian
  Market, Colony Shield Network, an augmentation-research building, a
  consumer-goods building, a partial-shields building) and the chapter
  continues for many pages beyond that — this is a genuinely large
  transcription task, not something to fully enumerate inside this ADR.
- **The Shipyard URL**: fetched, but returned no usable markup — almost
  certainly a client-side-rendered single-page app this environment's
  fetch tool can't execute. Its real navigation/filtering design is
  still unknown; the user was asked directly for a GitHub source link
  (a repo can be read directly) rather than guessing at one, per this
  assistant's standing rule against fabricating URLs.

## Decision

### Exploration/sector icon set (11b/11e support)

A new small icon set, genre-pack-scoped data (same posture as ADR 0023's
existing built-in annotation set — no real Planetfall artwork is traced
or reproduced, just a plain glyph substitute): Home/Colony, Investigation
Site, Resource Level (numbered), Hazard Level (numbered, visually
distinct from Home's plain glyph), Enemy Occupation, Enemy Strongpoint,
Ancient Sign. Numbered variants (Resource/Hazard) need a small value
input alongside icon placement, not just a fixed glyph — the one place
this set can't reuse ADR 0023's icon shape verbatim (`iconKey`/`note`
only); a `value` field on the icon is the natural addition. Lives
alongside — not replacing — the existing hazard/door/cover/etc. set;
which set is offered in the palette can follow the active genre pack
(`data/genrePacks.js`), the same swap mechanism oracle tables already use.

### Buildings icon set (11c support)

Deferred as its own content-authoring pass, not designed further here —
the source material is real but large (a many-page table), and
transcribing it accurately deserves a dedicated session the way the
HOSTILE Canon Locations gazetteer (`docs/adr/0026`) got one, not a
rushed subset. When it happens: same "data, not code" shape, each entry
citing its real page (matching `data/hostileLocations.js`'s established
citation convention), placeable via 11c's "Generate Room"/asset-placement
flow.

### Encounter Manager (expands ADR 0024's 11b)

Combat/initiative resolution is **ruleset-specific code, not one generic
tracker with a re-skinned label** — mirrors how `domain/dice.js` already
holds one function per mechanic (`rollAction`/`rollFlat`/`rollTraveller`)
and `domain/factions.js`'s SWN turn resolution already borrows SWN's real
d10+stat-vs-difficulty shape rather than genericizing it. Concretely:
a small per-ruleset resolver registry (same shape as `data/
rulesConstitution.js`'s provider table), each entry supplying its own
initiative-order rule and attack/damage resolution function; the
Encounter Manager UI reads `settings.statRuleset` (the existing
per-campaign selector, already used by the HOW workspace's Activity
picker) to pick which resolver is active — "one rulesystem at a time,"
per the explicit ask, matching how every other ruleset-aware feature in
this app already scopes. 5PFH's and SWN's actual resolver logic isn't
designed here — each needs its own reconciliation pass against that
system's real combat chapter (5PFH's Core rulebook; SWN's already-partially-
mined Revised Deluxe), the same discipline ADR 0010/0011 already used
before adding ruleset content.

### Interactive Maps "layers" — proposed interpretation

ADR 0024 declined a full pixel z-order layer *engine* as disproportionate
to this app's DOM/CSS rendering. Re-scoped here as **toggleable
visibility groups**, not a new rendering model: Background / Grid /
Annotations / Tokens / (11e's) Fog, each a simple show/hide boolean on
the map object — "hide all tokens to screen-share a clean map,"
"hide GM-only annotation notes," etc. This is a schema-and-UI-only
addition (a handful of booleans plus checkboxes), not a new engine. **This
is this ADR's own inference, not a confirmed requirement** — flagged
explicitly so it can be corrected if "layers" was meant differently
(e.g., stackable z-order editing, or literal drawing layers).

### Mobile UX (unscoped, small)

Noted, not designed here — "more compact access to forms and tabs" needs
its own look at which specific screens are cramped (this app already has
three responsive tiers per the 2026-07-04 pass) before it's actionable.
Tracked as an open backlog item, not a dedicated sub-phase.

### Shipyard — blocked on source material

Still blocked, but now on *research material* rather than *a URL at
all* — the live app isn't fetchable by this environment's tools; a real
GitHub source link (asked for directly) would unblock reading its actual
structure. Worth noting for later: "geomorph" in the name suggests a
tool for assembling modular deck-plan tiles, which — if true — overlaps
meaningfully with 11c's room/asset-template + procedural-generation
direction rather than needing a fourth separate tool; this is an
inference, not confirmed, and shouldn't be treated as settled until the
source is actually read.

## Consequences

- No code changes yet — this is a scoping/content-sourcing pass.
- The exploration icon set and Encounter Manager's per-ruleset resolver
  registry are both real, buildable next steps once 11a/11b get picked up
  again.
- The Buildings icon set is explicitly *not* ready to build — it needs
  its own dedicated transcription session first, flagged so it isn't
  mistaken for already-scoped work.
- Interactive Maps' "layers" interpretation is a stated assumption, not
  a confirmed decision — revisit if that reading is wrong.

## Related packs / ADRs

`docs/adr/0023-planetfall-grid-battlemap.md`, `docs/adr/0024-battlemap-
encounter-roadmap.md` (11b/11c/11e, which this extends);
`docs/adr/0026-hostile-canon-locations.md` (the citation-heavy content-
authoring precedent the Buildings set should follow); `docs/adr/0010-
traveller-swn-content.md`/`0011-swn-cwn-content.md` (the "read the real
book before adding ruleset mechanics" discipline the Encounter Manager's
resolvers should follow).
