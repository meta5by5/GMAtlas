# Campaign Wiki & Journal — Roadmap

**Status:** In progress. W0 was signed off, and W1 and W2 were built on
2026-11-08. W3 onward is still a proposal.

**Source:** `design/onetimecmd.md`. That file holds the requested scope and a
Claude chat's recommendations and build prompt.

**What this file does:** it maps that brief onto GMAtlas as the app actually
stands. It keeps the brief's goals and acceptance criteria. Where the brief
assumes architecture GMAtlas doesn't have, this file replaces it:
- Firebase or Firestore;
- a separate storage adapter;
- entity and link collections;
- D1 full-text search;
- MiniSearch;
- a Worker that holds Drive tokens.

Phases are W0–W6 for the wiki and D1–D4 for Google Drive. Each phase ends
with a review stop, as the brief asks.

## 1. The goal

A campaign wiki. Every entity, hex, dungeon, room, building and journal entry
can be read as a page, linked to the others, and reached from its place on a
map. The wiki, the maps and the journal are views of the same data, not three
systems kept in step.

## 2. Recon: what GMAtlas already has (the brief's Phase 0)

| Brief asks for | Already in GMAtlas | Gap |
|---|---|---|
| One graph of entities | `campaign.entities.items`, with types `npc, location, faction, asset, lore, item, conflict (Encounter), lifeform` (`domain/entities.js`) | No dungeon, room, building or floor types (see decision 3.3) |
| Typed links | `entity.relationships[]` `{to, label, type, strength}`, mirrored on both ends. Types: `linked, member_of, owns, controls, located_at, contains, allied_with, rival_of, bond, involves` | No `mentions` or `connects_to` type; no flag for links read from text |
| Nesting (parentId) | `located_at` / `contains` auto-mirror; `getContainingLocation` / `getContainedLocations` walk the location tree | Only locations nest; no breadcrumb or child list in the UI |
| `[[wikilinks]]` | `@Name` / `@[Multi Word]` / `@[label\|Name]` / `@[Title#12]` mentions with autocomplete (`ui/mentionEditor.js`). They resolve to an entity, then a document, then a map (`findByName`, `findDocumentTabByTitle`, `mapMentions.js`) | No `[[ ]]` syntax; no red link for a name that resolves to nothing |
| Backlinks | `linkMentions` links co-mentioned entities to each other ("appears with"), not to the page that mentions them | No "what mentions this" list; nothing records that a journal entry mentions an entity |
| Rename propagation | none | Mentions are by name, so renaming an entity silently breaks every `@[Old Name]` |
| Body / GM notes / player-known | `overview` (GM text), `revealed` (player-known text), per-type fields, statblocks | No GM-only blocks inside a text; no Player View |
| Hex binding | `setHexLocation(map,q,r,entityId)`, hex notes, threats, vertex Encounters (`domain/hexcrawls.js`) | Hex → page → back to hex isn't one loop |
| Dungeons → levels → rooms | Dungeon Crawl maps bound to a location (`setDungeonMapLocation`), floors via stairs (`listDungeonFloors`), merged rooms, tile notes (`domain/dungeonCrawls.js`) | A room or tile can't point to an entity; no page per room |
| Buildings → floors | none as a map; Battlemap icons can carry `entityId` (`domain/battlemaps.js`) | No building or floor structure |
| Journal | `campaign.journal[]` `{id, createdAt, source, text, isHtml}`; Composer scenes have scene numbers; the campaign timeline exists (`encounters.js campaignTimeline`) | No session number, in-world date or attendees on an entry; no per-entity session history |
| Search, quick switcher | `domain/search.js universalSearch` over entities, documents and more (client-side, zero-dep) | No Ctrl/Cmd+K switcher; no "recently viewed" |
| Graph view | `domain/graph.js` (whole campaign, force layout) | No neighbourhood view (depth 1–2) of one entity |
| Import / export JSON | `store.export()` / `import()`, lossless | No markdown export |
| Storage adapter, D1, sync | **store.js is the only persistence module** (rule 2). S2 sync already sends field-level ops to D1, sealed with the campaign key (`syncOps.js`) | **Nothing to build.** The brief's adapter already exists in the shape the rules require |

## 3. Decisions (the brief vs. the Constitution)

### 3.1 No new storage layer
The brief's `StorageAdapter`, separate `entities` / `links` collections and
SQL tables would break rule 1 (one campaign document) and rule 2 (only
`store.js` touches persistence). They aren't needed:
- the wiki reads and writes the existing document through `store.update()`;
- multi-device sync already rides S2's ops.

### 3.2 Links stay on the entity; backlinks are computed
Relationships stay where they are. "What mentions this" is not stored. A new
pure `domain/wiki.js` derives it by scanning the texts that can hold mentions:
- entity fields;
- journal entries;
- Composer scenes;
- hex and tile notes.

A stored "inferred" link would go stale with every edit. A derived index
can't, and it costs nothing to sync. It is built once per render, memoised on
the document's identity.

### 3.3 Dungeons, rooms, buildings and floors are Locations, not new types
Each is a `location` entity with a **place kind**, a new field:
`region | hex | site | building | dungeon | floor | level | room | other`.
- Nesting uses the existing `located_at` / `contains`.
- The fantasy and sci-fi terms come from the genre pack, as
  `LOCATION_HIERARCHY_TERMS` already does.

This keeps every location feature working for them (WHERE, sensory fields,
proximity, faction presence) and avoids a schema type explosion. `event` and
`journal_entry` stay what they are: Encounters, scenes and journal entries.

### 3.4 Link syntax: `[[ ]]` as another way to type a mention
Typing `[[Name]]` or `[[Name|shown text]]` becomes the same mention node as
`@[Name]` / `@[shown text|Name]`. Both syntaxes are accepted and stored the
same way, so nothing existing changes meaning. (Note: the brief puts the
display text second, `[[Name|display]]`; GMAtlas's `@[...]` puts the label
first. The parser handles each in its own order.)

### 3.5 Mentions keep resolving by name; renames rewrite them
Switching mentions to ids would touch every stored text and every export
(rule 5). Instead, a rename rewrites `@[Old]` / `[[Old]]` to the new name
everywhere, in one `store.update()`. The old name is kept as an **alias**
(`entity.aliases[]`, new), so text written elsewhere or imported later still
resolves. A failed write rolls back like any other.

### 3.6 Player View is a lens, not a second copy
In the Entity Editor, `overview` is "What the party knows" and `revealed` is
"Revealed / hidden (GM)": secrets, twists, true motives. So a toggle in the
wiki shows, for entities set to `'players'`:
- `overview`, minus its `:::gm … :::` blocks;
- links in it only to pages that are themselves shared;
- a short whitelist of public infobox facts.

It hides:
- `revealed`, every other GM field, aliases and relationship notes;
- backlinks and sessions;
- entities marked GM-only (`visibility: 'gm'`, the default, which matches
  today, where nothing is shown to players).

One pure function, `playerSafe(campaign, entityId)`, is the only way any
player-facing output is made. That covers the Player View, markdown export,
Drive sharing (D4) and later S5 tables. It is built from a whitelist, so a
GM field added later stays hidden until it's named there. A test scans its
output for GM text.

(An earlier draft of this decision had `overview` and `revealed` the wrong
way round. W2 follows the Entity Editor's labels.)

### 3.7 Search stays client-side and zero-dependency
D1's FTS5 can't help: synced text reaches the server sealed with the campaign
key, so the server can't read it. MiniSearch would be the app's second
runtime dependency. `universalSearch` is extended instead:
- aliases;
- page bodies;
- tags.

A token index is added only if a large campaign measures slow.

## 4. Phases

Every phase does the same three things, in the usual order:
- lands its pure domain logic with tests in `tests/domain.test.js` first;
- then a thin view;
- then a jsdom smoke run of the built bundle.

Each phase ends at a review stop.

### W0 — Recon sign-off
Section 2 and the decisions in section 3. **Stop: confirm 3.3–3.6 before
any schema change.**

### W1 — Model additions (schema, migration) — built 2026-11-08
Built as written below, plus three things:
- `unresolvedLinks` (the red links) and a "here" list on a place's page
  (who and what is located there);
- `rewriteLinks` is exported on its own;
- the Entity Editor's name field already renames through
  `renameEntityEverywhere`.

The text sources scanned are:
- entity fields;
- journal;
- scenes;
- the Composer;
- threads;
- Guide docs;
- text documents;
- hex, tile and battlemap notes.

Not done yet: `setDungeonRoomLocation` (W3).

- `entity.aliases[]`, `entity.visibility` (`'gm'` default),
  `entity.placeKind` (locations only). All are optional; old documents are
  untouched until edited (rule 5).
- New relationship types `connects_to` (doors, passages, stairs) and
  `appears_in`, with labels and the target-type rules.
- `domain/wiki.js`, all pure:
  - `pageFor(campaign, id)` gives the infobox fields by type, breadcrumb,
    children and relations grouped by type;
  - `mentionIndex(campaign)` gives mentions by entity, with the source
    (entity field, journal entry, scene, hex, tile);
  - `resolveLink(campaign, name)` checks names, then aliases, then documents,
    then maps;
  - `renameEntityEverywhere(campaign, id, newName)`.
- `[[ ]]` parsing beside `parseMentions` (entities.js) and
  `parseDocumentMentions` (documents.js).
- Tests: link parsing (both syntaxes, labels, page anchors), alias
  resolution, rename propagation through every text source, mention index,
  and an export → import round trip with the new fields.

### W2 — Wiki pages — built 2026-11-08
Built as written below, with these specifics:
- **The Wiki panel** (📜, in the edge nav like Cast, not gateable) lists
  every page by type. You can search names, aliases and tags and filter by
  type. It shows a 👁 badge on pages shared with players, a count of what
  links to each page, and a Red links list.
- **Entity tabs** gain 📖 Read and ✎ Edit. Following a link from a page or
  the Wiki panel opens the next page in Read mode.
- **"Linked from"** is grouped by where the link lives: pages, journal,
  scenes, Guide, maps and so on. Journal, Guide and map sources open where
  they are.
- **The red-link type picker** is an inline row of type buttons, not the
  text prompt.
- **Page settings** (aliases, visibility, place kind) sit at the foot of the
  page in the GM view.
- **Player View** is one switch, shared by the Wiki panel and every page.
- **Wiki is a plugin** (`GATEABLE_MODULES`), on by default for every
  profile. A profile saved before it existed counts as on.
- **The portal page** (direct request, 2026-11-08). The Wiki nav button opens
  the wiki as a portal page, `#/wiki` and `#/wiki/<entity id>`
  (`ui/portal/wiki.js`). On the hosted app, the Worker redirects `/wiki` to
  `/#/wiki`. It shows the campaign open on this device, or a notice when
  that campaign's profile has the Wiki off.
  - A page there is the same Read view.
  - Page links stay in the portal.
  - ✎ Edit, red-link page creation, and journal, Guide and map sources go
    back to the campaign.
  - The in-campaign Wiki panel still renders wherever a profile puts it in
    a Storyboard position.
- **Left nav and full record** (direct request, 2026-11-09).
  - The portal wiki has a left-hand menu of every top-level section: All
    pages, one per entity type (with counts, `#/wiki/section/<type>`), and
    Red links (GM only). On a page it adds "On this page", listing the
    page's sections and each record card. On a phone the menu becomes a
    scrolling strip of chips.
  - A page shows the entity's whole record as cards: Basics, the type's own
    sections, each statblock (with its weapons, items and attacks), and
    "Other fields" for anything the catalog doesn't name. Unset fields read
    `{none}`.
  - Which fields each type shows is data: `data/wikiRecordFields.js`. A
    genre-gated section (UWP outside fantasy, settlement fields in fantasy)
    still shows if it holds data. `domain/wiki.js recordSections()` builds
    it; Player View gets the same cards cut to the player whitelist.
  - **VitePress was considered and not adopted.** It builds a static site
    from Markdown files at build time with Vue and Vite. Wiki content lives
    in each browser's campaign document (encrypted when synced), so there
    is nothing for a build to read, and it would add a second toolset to a
    zero-dependency app. Its useful ideas (left sidebar, per-page outline,
    templated record layout) are built here instead.
- **The views** live in `ui/drawers/wiki.js`. The pure parts (GM blocks, `[[ ]]` →
  `@[ ]` display, `unlinkHidden`, `playerSafe`, `wikiIndex`) are in
  `domain/wiki.js`.

The original plan:
- A **Wiki** drawer panel, dispatched through `drawers/index.js` like every
  other panel. Each page is an entity tab: the 2026-11-08 one-tab-per-entity
  work, with a Read/Edit switch.
- The Read view has:
  - long-form typography;
  - an infobox;
  - a breadcrumb (location parent chain);
  - children;
  - "Linked from", grouped by relation and by source;
  - "Appears in sessions".
- Edit is the existing Entity Editor.
- Red links: an unresolved `[[Name]]` or `@[Name]` is shown in red. One
  click creates the page, with its type picked by the existing inline prompt
  (never `window.prompt`).
- `:::gm … :::` blocks are drawn as a shaded GM box. The Player View toggle
  sits in the page header.
- Mobile widths: one column, with the infobox above the body.
- Acceptance:
  - create an NPC, mention it in a journal entry and a room's notes, and both
    appear in its "Linked from";
  - rename it, and every link still resolves and shows the new name.

### W3 — Map binding
- **Hexcrawl.** A bound hex opens its page; an unbound hex offers "Make a
  page", which creates a `placeKind: hex` location and binds it. The page
  shows a mini hex map with that hex highlighted, plus "Show on map". A
  hex's notes stay where they are and show on its page.
- **Dungeons.** The dungeon map's bound location gets `placeKind: dungeon`.
  Each floor is a `level` location (`located_at` the dungeon). A room
  (merged tiles) or tile can bind to a `room` location, like a hex
  (`setDungeonRoomLocation`, new). Stairs between floors become `connects_to`
  between the levels.
- **Buildings and floors.** These are the same shape, on the Battlemap: a
  map bound to a `building` location, with `floor` children. Icons already
  carry `entityId`. A floor-switcher is the one new UI piece.
- **Entities placed in a place.** NPCs and items `located_at` a room or hex
  are listed on the map's side list and on the page.
- Acceptance: hex → its page → the dungeon inside → a room → "Show on map"
  back to the hex.

### W4 — Journal
- Optional fields on a journal entry: `sessionNumber`, `inWorldDate` (free
  text, plus a sortable key when it parses), `attendees[]` (Party member
  ids).
- A **Session** marker starts a numbered session; later entries take its
  number by default.
- Quick event capture: a one-line event becomes a journal entry with
  source `Event`.
- Each entity's "Appears in sessions" comes from `mentionIndex`.
- The campaign timeline (the Campaign panel) gains an in-world-date
  ordering beside scene order.

### W5 — Navigation
- A **Ctrl/Cmd+K quick switcher** over `universalSearch`, plus aliases and
  bodies (decision 3.7), with type, tag and visibility filters.
- Recently viewed (an ephemeral UI list, not in the document).
- A neighbourhood graph: `domain/graph.js` limited to one entity at depth 1
  or 2, shown on its page.

### W6 — Markdown export
- Export one page, or the whole wiki, as markdown:
  - one file per page, with front matter;
  - mentions become relative links;
  - files are zipped with the existing zip code used by library export.
- A GM copy, or a player copy through `playerSafe` (decision 3.6).
- Import of that markdown is **not** in scope; JSON stays the lossless
  format.

## 5. Google Drive backup and sharing (D1–D4)

The brief's Drive section, with two changes forced by the Constitution.

### 5.1 The browser does Drive work, not the Worker
Two of the brief's ideas don't fit GMAtlas:
- **Refresh tokens kept in a Worker, and cron backups with no tab open.**
  The Worker would have to read campaign content. It can't: synced content
  is sealed with the campaign key, and rule 6 keeps document bytes off our
  server.
- **What GMAtlas does instead.** Each device talks to Google directly:
  - it uses Google Identity Services' token client, scope `drive.file`;
  - tokens are short-lived and kept only in memory, so there are no refresh
    tokens to store;
  - backups run while the app is open: on a timer, on "Back up now", and
    at session end.
- **The cost.** Nothing backs up while every device is closed. With S2 sync,
  any open device can do it.

### 5.2 Folder layout, identity and incremental upload: as in the brief
- The folder layout is `GMAtlas/<Campaign>/…`. It holds:
  - `manifest.json`;
  - `entities/<type>/<slug>--<id>.md`;
  - `journal/`;
  - `images/<sha256>`;
  - `snapshots/`;
  - `Shared/`.
- Each file is tagged with `appProperties` (`gmatlasId`, `campaignId`,
  `kind`, `contentHash`). Files are found by that tag before one is created,
  so a retry never duplicates.
- Blobs are already keyed by sha256 (S0, S3a), so each image or document
  uploads once.
- Large files use resumable uploads, and their session URIs are kept in the
  app config so an upload can carry on.
- On 429, rate-limit 403 or 5xx responses, the app backs off with jitter,
  waits as long as `Retry-After` says, and runs at most three requests at a
  time.
- The job queue lives in the device's IndexedDB, through `store.js`, not in
  D1.

### 5.3 Phases
- **D1.** Connect Drive (consent, `drive.file`). A status panel shows the
  last backup, pending jobs, errors and quota (`about.get`). A
  "reconnect" banner appears when access is revoked; the queue keeps its
  jobs. `docs/google-setup.md` covers publishing the app "In production".
- **D2.** The backup queue, the folder layout, and snapshots (keep N).
  Restore from the manifest or a snapshot, into a new or existing campaign,
  with a dry-run preview.
- **D3.** Pull edits made on Drive (`changes.list` with a stored page token).
  The newer `updatedAt` wins. The other copy is kept as a conflict, using
  the existing S2 conflict chips.
- **D4.** Player-safe sharing. Exports go through `playerSafe` only, with a
  test that scans each export for GM content. They go to `Shared/All
  Players` or `Shared/<Player>`, with reader permission for that player's
  email. "Anyone with the link" is opt-in, with a warning. Revoking deletes
  the export, and the shares are recorded on the campaign. EXIF is stripped
  from shared images.

### 5.4 Overlap with S5
D4 and S5 (multiplayer tables, deferred in
`design/adr/deferred-turn-and-realtime-collaboration.md`) both show
players a player-safe view. Both must use the same `playerSafe`. Whichever
is built first builds it.

## 6. Out of scope

- Real-time co-editing of one page. This is deferred with S5's Yjs work.
  Until then, the last write wins, per field, through S2.
- Server-side search.
- Importing markdown edited outside the app, except D3's pull of Drive edits.

## 7. Acceptance (the brief's, mapped)

| Brief | Phase |
|---|---|
| NPC mentioned in a journal entry and a room description appears in both backlinks and session history | W2 + W4 |
| Rename keeps every link resolving and updates display text | W1 + W2 |
| Hex → page → dungeon → room → back to the hex on the map | W3 |
| Player View hides GM notes, `:::gm` blocks and GM-only entities | W2 (`playerSafe` test) |
| Export, clear, re-import with no data loss | W1 (round-trip test) |
| Tests for link parsing, rename propagation, backlink sync | W1 |
| Drive: resume without duplicates, Drive edits detected, revoke → reconnect, player share has no GM content, full restore on a fresh device | D1–D4 |
