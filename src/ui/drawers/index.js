// drawers/index.js — the tertiary-tier drawer contents (Journal, Oracle,
// Graph, Documents, Settings). Each is a pure render(doc) -> html string;
// interactions are handled by the shell's delegated event handlers.

import {
  SCENE_TABLES, buildGroupedOracleTree, filterOracleTree, tablesWithOverrides, excludeFactionOracleTables,
  hasOracleOverride, getOracleTags, isOracleTagLocked, listOracleTagVocabulary,
  filterOracleTreeByTags,
} from '../../domain/oracles.js';
import { ORACLE_TABLE_SOURCES, ORACLE_GROUPS_FANTASY } from '../../data/oracleGroups.js';
import { oracleLinkTagsFor } from '../../data/entityFieldOracleLinks.js';
import {
  listEntities, filterEntities, getEntity, ENTITY_TYPES, TYPE_LABEL, entityTypeLabel, listTagVocabulary, listEntityTagVocabulary,
  RELATIONSHIP_TYPES, RELATIONSHIP_TYPE_LABEL, isRelationshipFlagged, computeFactionMaxHp,
  getSystemForLocation, getStarForLocation, getHexZoneForLocation, LOCATION_FANTASY_FIELD_ORACLE_PATH,
} from '../../domain/entities.js';
import { sortStatblockGroups, getStatblockTemplates } from '../../domain/statblocks.js';
import { listTemplates } from '../../domain/statblockTemplates.js';
import { buildGraph, computeLayout, nodeColor } from '../../domain/graph.js';
import { BUILD } from '../../core/buildInfo.js';
import { getDocument, listDocuments, listDocumentMentions, allDocumentTags, filterDocuments, listCampaignReferenceDocuments } from '../../domain/documents.js';
import { listPartyMembers, listPartyTrackers, gaugeWindow, listPartyHeadlineTracks } from '../../domain/party.js';
import { COLONY_FIELDS, getColonyFields, listCrewRows, listLifeformEncounters, CREW_ROLES, listColonyEncounters } from '../../domain/colony.js';
import { lifeformEncounterRangeLabel } from '../../domain/lifeforms.js';
import { getMarket, priceAt, listCargoManifest, listContracts } from '../../domain/trade.js';
import { COMMODITIES, findCommodity } from '../../data/commodities.js';
import { THREAD_STATUSES, THREAD_STATUS_LABELS, THREAD_PRIORITIES } from '../../domain/threads.js';
import { getPressureTrack } from '../../domain/factions.js';
import { getFactionGoalTrack, factionEventsByRound, getConflictEscalationTrack, factionsPresentAt } from '../../domain/factionTurnEngine.js';
import { generateConflictSeed } from '../../domain/factionConflicts.js';
import { factionProviderFor } from '../../data/factionRulesProviders.js';
import { getEnhancements, strainUsed, strainCapacity, isOverStrained } from '../../domain/enhancements.js';
import { getMechanicsIndex } from '../../domain/mechanicsIndex.js';
import { ENHANCEMENT_TYPES } from '../../data/enhancementTypes.js';
import { DICE_3D_THEMES, findDice3dTheme, DICE_3D_COLOR_PRESETS } from '../../data/dice3dThemes.js';
import { buildGuideTree, getActiveGuideDoc } from '../../domain/guide.js';
import { buildMentionEditorHTML, richToolbarHTML, richToolbarToggleHTML, toolbarCollapsed } from '../mentionEditor.js';
import { buildSessionRecap } from '../../domain/recap.js';
import { RULESETS, findRuleset, STARFORGED_PROGRESS_DIFFICULTIES, findProgressDifficulty } from '../../data/rulesets.js';
import { GEAR_TEMPLATE_SYSTEMS, findGearTemplate } from '../../data/gearTemplates.js';
import { GEAR_CATALOG, findCatalogItem } from '../../data/gearCatalog.js';
import { RULES_PROVIDERS, GAMEPLAY_AREAS, providerLabel, resolveProviderChoice, resolveActiveProviderChoice, isGameSystemActivated, isTurnStepSystemActive, matchesEnabledModule, isLicensed, isLicenseInUse, isPackInUse, licenseFor, licenseFamilies, licenseForDoc, isSupplementInUse, rulesConstitutionOptionIds, moduleProviderId } from '../../data/rulesConstitution.js';
import { CONTENT_PACKS_MANIFEST } from '../../data/contentPacksManifest.js';
import { CSS_TEMPLATES } from '../../data/cssTemplates.js';
import { SOURCEBOOK_INVENTORY } from '../../data/sourcebookInventory.js';
import { listGalleryImages, listGalleryTagVocabulary, getGalleryImage } from '../../domain/gallery.js';
import { listBattlemaps, getActiveBattlemap } from '../../domain/battlemaps.js';
import { BATTLEMAP_ICONS, findBattlemapIcon } from '../../data/battlemapIcons.js';
import { listHexMaps, getActiveHexMap, getHex, axialToPixel, hexVertexPoints, HEX_SIZE, ENCOUNTER_VERTEX_ORDER, hexEdgeMidpoints, edgeNeighbor } from '../../domain/hexcrawls.js';
import { HEXCRAWL_GEOGRAPHY_ICONS, findHexcrawlGeography, HEXCRAWL_THREAT_ICONS, findHexcrawlThreat } from '../../data/hexcrawlIcons.js';
import {
  listDungeonMaps, getActiveDungeonMap, getDungeonTile, computeDungeonAppendCells, computeMergeRectangle,
  listDungeonFloors, floorLabel, DUNGEON_GRID_SIZE,
} from '../../domain/dungeonCrawls.js';
import { DUNGEON_CRAWL_ARCHETYPES, ALL_DUNGEON_CRAWL_ARCHETYPES, findDungeonCrawlArchetype, findDungeonCrawlPack, DUNGEON_ROOM_FALLBACK_PALETTE, FLEXCRAWL_DYNAMIC_CONTENT_CATEGORIES } from '../../data/dungeonCrawlTiles.js';
import { DUNGEON_DRESSING_ICONS, findDungeonDressingIcon, DUNGEON_TILE_GRID_SIZE } from '../../data/dungeonCrawlDressing.js';
import { FIVE_LEAGUES_ORIGINS, FIVE_LEAGUES_COMPENDIUM_ORIGINS, findFiveLeaguesOrigin } from '../../data/fiveLeaguesOrigins.js';
import {
  FIVE_LEAGUES_CHARACTER_TYPES, findFiveLeaguesCharacterType,
  FIVE_LEAGUES_SKILLS,
  FIVE_LEAGUES_BACKGROUNDS, findFiveLeaguesBackground, availableFiveLeaguesBackgrounds,
  FIVE_LEAGUES_ARMOR_TYPES, findFiveLeaguesArmorType, FIVE_LEAGUES_ARMOR_TRAITS,
  FIVE_LEAGUES_WEAPON_TRAITS, FIVE_LEAGUES_WEAPON_CATALOG,
  FIVE_LEAGUES_GEAR_LOCATIONS, FIVE_LEAGUES_ITEM_CATALOG,
} from '../../data/fiveLeaguesCharacter.js';
import { FIVE_LEAGUES_SPELLS } from '../../data/fiveLeaguesSpells.js';
import { listFiveLeaguesSelfWeapons, parseFiveLeaguesWeaponDamage } from '../../domain/fiveLeagues.js';
import { findFiveLeaguesEnemyTrait } from '../../data/fiveLeaguesEnemyTraits.js';
import { findLocationTypeIcon } from '../../data/locationTypeIcons.js';
import { getSector, listTouchedSectors, adjacentSectors, deriveSectorIcon, generateMissionHooks, gridSizeOf, countInvestigationSites, MAX_INVESTIGATION_SITES, worldTrackerAttentionItems } from '../../domain/worldTracker.js';
import { WORLD_TRACKER_ICONS, findWorldTrackerIcon } from '../../data/worldTrackerIcons.js';
import { GENRE_PACKS, bestiaryTerm } from '../../data/genrePacks.js';
import { ECONOMY_MODELS, economyTypesForModel } from '../../data/economyTypes.js';
import { biomesForGenrePack } from '../../data/biomes.js';
import {
  STARPORT_CLASSES, WORLD_SIZES, ATMOSPHERES, HYDROGRAPHICS, POPULATIONS, GOVERNMENTS, LAW_LEVELS, BASES, TRADE_CODES, findTradeCode,
} from '../../data/hostileUwpTables.js';
import { HOSTILE_LOCATIONS_META } from '../../data/hostileLocationsMeta.js';
import { DOCS_MANIFEST } from '../../data/docsManifest.js';
import { REFERENCE_LIBRARY_MANIFEST } from '../../data/referenceLibraryManifest.js';
import { GATEABLE_MODULES } from '../../core/schema.js';
import { drawerMeta, POSITION_ASSIGNABLE_IDS } from '../drawerMeta.js';
import { resolvePositionContentId } from '../../domain/rulesProfiles.js';
import { getCurrentTurnStep } from '../../domain/turnSteps.js';
import { crewTaskRows } from '../../domain/crewTasks.js';
import { canAccessGameSystem } from '../../domain/entitlements.js';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Phase A audit: BIOMES (data/biomes.js) is still tagged by the OLD
// per-Game-System ids ('hostile'/'cyberpunk'/'fantasy'), not the newer
// umbrella Genre Pack ids — 'hostile' biomes are genuinely Hostile-book-
// specific terrain, not generic-sci-fi. Now that a sci-fi campaign's own
// settings.genrePack is the shared 'sci-fi-generic' pack rather than
// 'hostile' directly, biomesForGenrePack(doc.settings.genrePack) alone
// would return nothing for every sci-fi campaign — resolved through the
// Rules Constitution's own 'frontier-setting' choice instead when the
// broader pack is the sci-fi one (defaults to 'hostile', matching exactly
// what every existing campaign already saw before this restructuring);
// any other genre pack (cyberpunk/fantasy/dnd5e) passes through unchanged.
function resolveBiomeGenrePackId(doc) {
  const genrePack = doc.settings.genrePack || 'sci-fi-generic';
  if (genrePack === 'sci-fi-generic') return resolveActiveProviderChoice(doc, 'frontier-setting') || 'hostile';
  return genrePack;
}

// "a Faction" / "an NPC" / "an Asset" — for the relationship-flag tooltip below.
const withArticle = (word) => (/^[aeiou]/i.test(word) ? `an ${word}` : `a ${word}`);

// Wraps a <input type="number"> with +/- stepper buttons — direct
// follow-up request: "use this number counter textbox as the default for
// all textboxes used for numbers," generalizing the pattern Party
// Trackers' own counter fields established, no native spin-arrow chrome
// (see .party-tracker-value-input's own CSS comment). Both buttons sit
// AFTER the field, "+" then "-" (direct follow-up request — previously "+"
// sat before the field and "-" after it). Deliberately generic and
// DOM-only: the buttons don't know or need to know what the input commits
// to — a click nudges the wrapped input's OWN value by ±1 (clamped to
// whatever min/max attributes it already carries) and dispatches a real
// 'change' AND 'input' event on it (shell.js's data-num-step handler), so
// whichever data-* commit attribute the input already has fires exactly
// as if the GM had typed the new value and blurred it — no new per-field
// wiring needed at any of this helper's call sites, only wrapping the
// existing <input> markup.
// Exported for workspace/index.js's Navigator workflow cards (direct
// follow-up request: "include the Campaign Turn field with the Campaign
// Workflow addition to Navigator... bundled together wherever deployed")
// — reused verbatim rather than re-implemented, so the ＋/－ buttons behave
// identically in both places (same generic [data-num-step] delegated
// handler already drives every other numStepper in the app).
export function numStepper(inputHtml) {
  return `<span class="num-stepper">
    ${inputHtml}
    <button type="button" class="icon-btn num-stepper-btn" data-num-step="1" tabindex="-1" title="+1">＋</button>
    <button type="button" class="icon-btn num-stepper-btn" data-num-step="-1" tabindex="-1" title="-1">−</button>
  </span>`;
}

export function renderDrawer(id, doc, ui = {}) {
  switch (id) {
    case 'journal': return journal(doc, ui);
    case 'oracle': return oracle(doc, ui);
    case 'cast': return entities(doc, ui);
    case 'entity-detail': return entityDetail(doc, ui);
    case 'party': return party(doc, ui);
    case 'colony': return colony(doc, ui);
    case 'trade': return trade(doc, ui);
    case 'guide': return guide(doc, ui);
    case 'settings': return settings(doc, ui);
    case 'graph': return graph(doc, ui);
    case 'documents': return documents(doc, ui);
    case 'gallery': return gallery(doc, ui);
    case 'battlemap': return battlemap(doc, ui);
    case 'hexcrawl': return hexcrawl(doc, ui);
    case 'dungeoncrawl': return dungeoncrawl(doc, ui);
    case 'world-tracker': return worldTracker(doc, ui);
    default: return `<p class="ws-placeholder">Drawer “${esc(id)}”.</p>`;
  }
}

// Sorted by label (Asset/Faction/Location/Lore/NPC), not ENTITY_TYPES'
// declaration order — that order still governs "+ Add" button placement and
// statblock-add-choices elsewhere, just not this filter row. A function, not
// a module-level constant, since the label (and therefore the sort order)
// is genre-aware (entityTypeLabel) — Fantasy (generic)'s "Monster" sorts
// differently than "Lifeform" would.
function entityTypesByLabel(genrePackId) {
  return [...ENTITY_TYPES].sort((a, b) => entityTypeLabel(a, genrePackId).localeCompare(entityTypeLabel(b, genrePackId)));
}

// The Cast drawer: list-only — search, type filter, "Generate…" (its head,
// see shell.js's headExtraForDrawer), draggable/clickable rows. No inline
// inspector (that moved to its own "Entity Detail" tab, entityDetail()
// below). Cast is an ordinary drawer tab (docs/adr/0032 removed the anchor-
// beside-another-drawer mechanism it used to open into). Clicking a row
// opens Entity Detail (data-open-entity, same as a mention link or a
// relationship chip); dragging one (from anywhere on the row, not just the
// ⠿ handle — see the CSS) links/mentions on desktop, and on touch can
// instead be dragged onto another tab (switches to it) or the header
// (reveals Mission Control) mid-drag — see shell.js's onTouchMove.
export function entities(doc, ui) {
  const allItems = listEntities(doc);
  const typeFilter = ui.entityTypeFilter || '';
  const search = ui.entitySearch || '';
  const activeTags = ui.entityTagFilters || new Set();
  // Pure, shared with shell.js's data-entity-del handler (so deleting the
  // active entity while Cast is filtered lands on the next entity Cast
  // ITSELF still shows, not just the first one in the whole campaign).
  const items = filterEntities(doc, { types: typeFilter ? [typeFilter] : null, search, tags: [...activeTags] });
  const active = getEntity(doc, doc.entities && doc.entities.activeId);
  const typeChips = ['', ...entityTypesByLabel(doc.settings.genrePack)].map((t) => `
    <button class="chip sm ${typeFilter === t ? 'active' : ''}" data-entity-type-filter="${t}">${t ? entityTypeLabel(t, doc.settings.genrePack) : 'All'}</button>`).join('');
  return `
    <input class="drawer-search" data-entity-search value="${esc(ui.entitySearch || '')}" placeholder="Search Cast by name or tag…">
    <div class="entity-type-filter-row">${typeChips}</div>
    ${entityTagFilterRow(doc, ui, typeFilter, search)}
    ${catalogPickerBlock(ui)}
    <div class="entity-list">
      ${items.length ? items.map((e) => `
        <button class="entity-list-row ${active && active.id === e.id ? 'sel' : ''}" draggable="true" data-drag-entity="${esc(e.id)}" data-drop-entity="${esc(e.id)}" data-open-entity="${esc(e.id)}" title="Click to open · drag anywhere on the row to link with another entity, or onto Journal/context fields to mention">
          <span class="entity-drag-handle" aria-hidden="true">⠿</span>
          <span class="entity-type-tag">${entityTypeLabel(e.type, doc.settings.genrePack) || 'Entity'}</span>
          <span class="entity-list-name">${esc(e.name) || '<em>Unnamed</em>'}</span>
          ${e.relationships && e.relationships.length ? `<span class="dim">🔗${e.relationships.length}</span>` : ''}
        </button>`).join('')
        : (allItems.length ? '<p class="ws-placeholder">No entities match that search/filter.</p>' : '<p class="ws-placeholder">No entities yet. Add one above, or type @Name in a note or situation to create one automatically.</p>')}
    </div>`;
}

// Cumulative tag sub-filter (ADR 0012) — mirrors the Documents drawer's
// docTagFilters/docTagListOpen pattern exactly, generalized from documents
// to entities: the chip list is whatever tags the CURRENT type filter/search
// already narrowed to (listEntityTagVocabulary), so it updates live as the
// type filter changes rather than showing every tag in the campaign at once.
// AND semantics — picking more tags narrows further, same as Documents.
function entityTagFilterRow(doc, ui, typeFilter, search) {
  const vocab = listEntityTagVocabulary(doc, { types: typeFilter ? [typeFilter] : undefined, search });
  if (!vocab.length) return '';
  const activeTags = ui.entityTagFilters || new Set();
  const listOpen = !!ui.entityTagListOpen;
  const chips = vocab.map((t) => `<button class="chip sm ${activeTags.has(t) ? 'active' : ''}" data-entity-tag-filter="${esc(t)}">#${esc(t)}</button>`).join('');
  return `<div class="entity-tag-filter">
    <button class="btn ghost sm" data-entity-tag-list-toggle>${listOpen ? '▾' : '▸'} Tags (${vocab.length})${activeTags.size ? ` · ${activeTags.size} active` : ''}</button>
    ${listOpen ? `<div class="entity-tag-filter-row">${chips}</div>` : ''}
  </div>`;
}

// The "+ Item (from catalog)" inline picker (ADR 0012) — opened via the
// Cast drawer head's Generate… select (data-entity-generate="catalog-item",
// shell.js). A search box plus a flat list (not grouped by category — the
// catalog is small enough that a flat scroll is fine) of matching
// data/gearCatalog.js entries; clicking one creates the Item entity via
// createItemFromCatalog and closes the picker.
function catalogPickerBlock(ui) {
  if (!ui.catalogPickerOpen) return '';
  const q = (ui.catalogSearch || '').trim().toLowerCase();
  const items = GEAR_CATALOG.filter((c) => !q || [c.name, c.category, ...(c.tags || [])].join(' ').toLowerCase().includes(q));
  const rows = items.map((c) => `
    <button class="catalog-item-row" data-catalog-add="${esc(c.id)}" title="Add ${esc(c.name)} as a new Item entity">
      <span class="catalog-item-name">${esc(c.name)}</span>
      <span class="dim small">${esc(c.category)}</span>
      <span class="catalog-item-tags">${(c.tags || []).map((t) => `<span class="chip sm">${esc(t)}</span>`).join('')}</span>
    </button>`).join('');
  return `<div class="catalog-picker">
    <div class="catalog-picker-head">
      <input class="drawer-search" data-catalog-search value="${esc(ui.catalogSearch || '')}" placeholder="Search the gear/weapon/armor catalog…" autofocus>
      <button class="icon-btn" data-catalog-picker-close title="Close" aria-label="Close">✕</button>
    </div>
    <div class="catalog-picker-list">
      ${rows || '<p class="ws-placeholder">No catalog items match that search.</p>'}
    </div>
  </div>`;
}

// "Find entity to link" — a searchable alternative to the plain <select>
// picker below it in the Relationships section, mainly for a long Cast
// (a native dropdown has no search of its own) and for compact/phone
// widths specifically, where Cast can't be open side-by-side with the
// Entity Editor to drag from the way desktop can (design/UX-ROADMAP.md
// Steps 4/5 made the drawer the one visible panel there). Deliberately
// tap-to-link, not drag-to-link — cross-panel touch drag is one of the
// more fragile mobile interactions to get right without a real device to
// verify it on, and a floating list the GM can just tap an entity in
// reaches the same "link this to the open entity" outcome with one fewer
// gesture regardless of device. Positioned as a smaller window over the
// top half of the panel (styles/cockpit.css's `.rel-picker`), so the
// Relationships section stays visible in spirit even though tapping here
// doesn't need it to be reachable underneath. Uses the same shared
// filterEntities() Cast's own search bar does, so "find X" behaves
// identically everywhere it's asked.
function relPickerBlock(doc, e, ui) {
  if (!ui.relPickerOpen) return '';
  const q = ui.relPickerFilter || '';
  const items = filterEntities(doc, { search: q }).filter((x) => x.id !== e.id);
  const rows = items.map((x) => `
    <button class="catalog-item-row" data-rel-picker-pick="${esc(x.id)}" title="Link ${esc(x.name) || 'Unnamed'} to ${esc(e.name) || 'this entity'}">
      <span class="entity-type-tag">${entityTypeLabel(x.type, doc.settings.genrePack) || 'Entity'}</span>
      <span class="catalog-item-name">${esc(x.name) || '<em>Unnamed</em>'}</span>
      <span class="catalog-item-tags">${(x.tags || []).map((t) => `<span class="chip sm">${esc(t)}</span>`).join('')}</span>
    </button>`).join('');
  return `<div class="rel-picker">
    <div class="catalog-picker-head">
      <input class="drawer-search" data-rel-picker-search value="${esc(q)}" placeholder="Find an entity to link…" autofocus>
      <button class="icon-btn" data-rel-picker-close title="Close" aria-label="Close">✕</button>
    </div>
    <div class="catalog-picker-list">
      ${rows || '<p class="ws-placeholder">No entities match that search.</p>'}
    </div>
  </div>`;
}

// Entity Detail (2026-07-05 restructure): the name/type/tags/overview/
// statblocks/relationships form Cast used to show inline, now its own tab —
// opened only by clicking an entity somewhere (never picked from the edge
// nav directly; see shell.js's DRAWER_META/openDrawerTab('entity-detail')).
function entityDetail(doc, ui) {
  const active = getEntity(doc, doc.entities && doc.entities.activeId);
  if (!active) return '<p class="dim small">Click an entity anywhere (Cast, a mention, a relationship, the graph, ...) to see it here.</p>';
  // The whole editor is a relationship drop target, not just the
  // Relationships section specifically — dragging an entity from Cast (or
  // anywhere else draggable, e.g. a WHO/WHERE chip) and dropping it
  // anywhere over this tab links it to whichever entity is currently open,
  // the same addRelationship() an explicit drop on a Cast row already used.
  return `<div class="entity-inspector" data-drop-entity="${esc(active.id)}">${inspector(doc, active, ui)}</div>`;
}

// Finds the "Bond: <otherName>" track field entities.js's ensureBondTrack
// auto-creates on a Starforged character sheet, if this entity has one —
// {gi, field}, gi being the statblock group's index (for the "view in
// Character Sheet" jump button below), or null if no such track exists
// (no Starforged sheet, or this bond predates one being added).
function bondFieldFor(e, otherName) {
  if (!Array.isArray(e.statblocks)) return null;
  const key = `Bond: ${otherName}`;
  for (let gi = 0; gi < e.statblocks.length; gi++) {
    const g = e.statblocks[gi];
    if (g.kind !== 'character' || g.ruleset !== 'starforged') continue;
    const field = g.fields.find((f) => f.key === key);
    if (field) return { gi, field };
  }
  return null;
}

// A field's 🔮 "jump to relevant Oracle(s)" link (docs/adr/0016-oracle-
// tags-and-field-links.md) — right-aligned next to the field's label, only
// rendered when data/entityFieldOracleLinks.js has an entry for this
// "entityType.field" key. Clicking it (shell.js's data-oracle-field-link
// handler) opens the Oracle drawer pre-filtered to every table carrying
// any of the field's linked tags.
function oracleLinkIcon(entityType, field) {
  const tags = oracleLinkTagsFor(entityType, field);
  if (!tags) return '';
  return `<button class="icon-btn icon-mono" data-oracle-field-link="${entityType}.${field}" title="Jump to relevant Oracle table(s): ${tags.map((t) => esc(t)).join(', ')}" aria-label="Jump to relevant Oracle tables">🔮</button>`;
}

// A field label + its optional 🔮 link, right-aligned on the same line —
// replaces a bare `<label class="field-label">Text ...` opening tag for
// exactly the fields data/entityFieldOracleLinks.js links; every other
// field is untouched.
// `hint` is an optional trailing bit of text (e.g. "(#star)") rendered in
// its own span with text-transform:none — .field-label's own uppercase
// styling would otherwise shout a tag reference that's meant to read as
// a literal, lowercase tag name (docs/adr/0026 follow-up).
// `extra` (direct follow-up request: "move the open/close arrow to the
// editor icons to the right-aligned of the field label") is the rich-text
// toolbar's own collapse toggle (richToolbarToggleHTML) for a caller whose
// field is a rich-text editor — rendered last so it clumps with
// oracleLinkIcon at the row's right edge (.field-label-row .icon-btn's own
// margin-left:auto), instead of sitting on the editor box itself.
function fieldLabelRow(text, entityType, field, hint, extra = '') {
  return `<span class="field-label-row">${esc(text)}${hint ? ` <span class="field-label-hint">${esc(hint)}</span>` : ''}${oracleLinkIcon(entityType, field)}${extra}</span>`;
}

// Collapsible "?" tip icons ("USER CHANGES" QoL batch) — replaces an
// always-visible `<p class="dim small">` instructional paragraph under a
// section's title with a collapsed-by-default toggle next to that title,
// so a returning GM isn't re-reading the same explanatory prose every
// time. `key` is a stable per-instance string (unique across the whole
// app, since `ui.helpOpen` is one flat Set) — `helpToggle` renders the
// icon, `helpBody` renders the same trusted HTML the paragraph always
// held, shown only once its key is in `ui.helpOpen`.
export function helpToggle(key) {
  return `<button type="button" class="icon-btn help-icon" data-help-toggle="${esc(key)}" title="Help" aria-label="Help">?</button>`;
}
function helpBody(key, html, ui) {
  return (ui.helpOpen && ui.helpOpen.has(key)) ? `<p class="dim small help-text">${html}</p>` : '';
}

// An <h3>/<h4> section title plus its "?" toggle, right-aligned on the
// same line — the shape every Settings group (and any other section-level
// header) uses to pair with helpBody below it. `extra` (optional) is more
// icon-button HTML inserted before the "?" toggle, same convention as
// workspace/index.js's dashboardSection headerExtra — e.g. the Ruleset
// Profile Editor's "+ New Profile"/Rename icons.
function sectionHeadRow(tag, title, key, extra = '') {
  return `<div class="section-head-row"><${tag}>${esc(title)}</${tag}><span class="entity-chip-row">${extra}${helpToggle(key)}</span></div>`;
}

function inspector(doc, e, ui) {
  const others = listEntities(doc).filter((x) => x.id !== e.id);
  const relTypeOptions = (selected) => RELATIONSHIP_TYPES.map((t) => `<option value="${t}" ${t === selected ? 'selected' : ''}>${RELATIONSHIP_TYPE_LABEL[t]}</option>`).join('');
  const rels = (e.relationships || []).map((r) => {
    const other = getEntity(doc, r.to);
    if (!other) return '';
    const flagged = isRelationshipFlagged(doc, r, e.type);
    // Strength/weight (and the Bond progress it can stand in for) is a
    // measure of an evolving social bond — it only makes sense between the
    // "actor" entity types (NPC/Faction, same pair RELATIONSHIP_TYPE_MUTUAL
    // already restricts allied_with/rival_of/bond to); a Location, some
    // Lore, or an Asset can be OWNED, LOCATED AT, etc., but doesn't have a
    // "how strong is this" dial of its own, so the control doesn't render
    // at all for those rather than showing a number that means nothing.
    const isActorType = (t) => t === 'npc' || t === 'faction';
    const showStrength = isActorType(e.type) && isActorType(other.type);
    // A Bond's progress lives on the character sheet's own track field, not
    // this relationship (see entities.js's ensureBondTrack) — a read-only
    // value plus a jump button replaces the generic strength input for
    // exactly the bond that field belongs to, so there's one source of
    // truth for the number, not two independently-editable ones.
    const bond = showStrength && r.type === 'bond' ? bondFieldFor(e, other.name) : null;
    const strengthOrBond = !showStrength ? '' : (bond
      ? `<span class="rel-bond-value" title="Bond progress — tracked on the Character Sheet below, not editable here">${bond.field.value}<small>/${bond.field.max}</small></span>
         <button type="button" class="icon-btn" data-view-bond-track="${bond.gi}" title="View in Character Sheet">↧</button>`
      : numStepper(`<input type="number" class="rel-strength-input" data-entity-rel-strength="${esc(r.to)}" min="0" max="10" value="${Number(r.strength) || 0}" title="Strength/weight 0-10">`));
    return `<span class="rel-chip ${flagged ? 'rel-flagged' : ''}">${flagged ? `<span class="rel-flag" title="Flagged: ${RELATIONSHIP_TYPE_LABEL[r.type]} doesn't usually apply between ${withArticle(entityTypeLabel(e.type, doc.settings.genrePack))} entity and ${withArticle(entityTypeLabel(other.type, doc.settings.genrePack))} entity — nothing changed, just worth a review">⚠</span>` : ''}<select class="rel-type-select" data-entity-rel-type="${esc(r.to)}" title="Relationship type">${relTypeOptions(r.type)}</select>
      <button type="button" class="rel-chip-name" data-open-entity="${esc(other.id)}" title="Open ${esc(other.name) || 'Unnamed'}">${esc(other.name) || 'Unnamed'}</button>
      <input class="rel-label-input" data-entity-rel-label="${esc(r.to)}" value="${esc(r.label)}" placeholder="note (ally, rival…)" title="Edit this relationship's note">
      ${strengthOrBond}
      <button class="icon-btn" data-entity-unlink="${esc(r.to)}" title="Remove link" aria-label="Remove link">✕</button></span>`;
  }).join('');
  // A #character-tagged NPC is a Party member (see the Party tab's own
  // "#character" filter) — Deepen (a from-scratch flavor-roll flourish for
  // an NPC the GM is inventing on the fly) and Revealed/hidden (the GM's
  // secret notes on someone the PLAYER already controls openly) don't
  // apply to a player character the same way they do to an antagonist or
  // bystander NPC, so both are hidden once this tag is present.
  const isPartyCharacter = e.type === 'npc' && (e.tags || []).some((t) => t.toLowerCase() === 'character');
  // Overview now defaults COLLAPSED (direct follow-up request: "Default
  // the character sheet section to be open, but all other sections to be
  // collapsed when the entity record is opened" — supersedes the earlier
  // "Overview defaults open" decision below). ui.collapsedOverview's own
  // toggle handler (shell.js's data-overview-toggle) is a plain has/
  // delete/add flip either way, so membership now reads as "explicitly
  // EXPANDED" instead of "explicitly collapsed" — no handler change needed.
  const overviewOpen = (ui.collapsedOverview || new Set()).has(e.id);
  const relKey = `entityRelationships:${e.id}`;
  const relCollapsed = isPartySectionCollapsed(ui, relKey, true);
  const relAddHtml = others.length
    ? `<div class="rel-add">
        <select data-entity-link-type>${relTypeOptions('linked')}</select>
        <select data-entity-link-target>${others.map((o) => `<option value="${esc(o.id)}">${esc(o.name) || 'Unnamed'}</option>`).join('')}</select>
        <input data-entity-link-label placeholder="label (ally, rival…)">
        <button class="btn sm" data-entity-link-add title="Link" aria-label="Link">🔗 Link</button>
        <button class="btn ghost sm" data-rel-picker-open title="Search Cast for an entity to link"><span class="icon-mono">🔍</span> Find entity to link</button>
      </div>${relPickerBlock(doc, e, ui)}`
    : '<p class="dim small">Add another entity to create relationships.</p>';
  const relBodyHtml = `
      <p class="dim small">Drag another entity's ⠿ handle onto this one (or vice versa), pick one below, or find one to link.</p>
      <div class="rel-chips">${rels || '<span class="dim small">None yet.</span>'}</div>
      ${relAddHtml}`;
  const relBlockHtml = `<div class="rel-block">
      ${partySectionHeaderHtml(relKey, 'Relationships', relCollapsed)}
      ${relCollapsed ? '' : relBodyHtml}
    </div>`;
  return `
    <div class="inspector-head">
      <input class="inspector-name" data-entity-field="name" value="${esc(e.name)}" placeholder="Name">
      ${e.type === 'npc' && !isPartyCharacter ? `<button class="icon-btn" data-deepen-npc="${esc(e.id)}" title="Roll a Stereotype/Want/Complication and add it to this NPC's Overview">🎲 Deepen</button>` : ''}
      <button class="icon-btn" data-entity-del="${esc(e.id)}" title="Delete entity">🗑</button>
    </div>
    ${isFiveLeaguesAberrationEntity(e) ? '<p class="fiveleagues-enemy-subtitle">Aberration</p>' : ''}
    <div class="inspector-photo-row">
      ${entityPhotoHtml(doc, e)}
      <div class="inspector-photo-fields">
        <div class="field-label">
          <span class="field-label-row">
            <button type="button" class="section-toggle" data-overview-toggle="${esc(e.id)}">${overviewOpen ? '▾' : '▸'} Overview</button>
            ${oracleLinkIcon(e.type, 'overview')}
            ${overviewOpen ? richToolbarToggleHTML(`entity:${e.id}:overview`, toolbarCollapsed(doc, ui, `entity:${e.id}:overview`)) : ''}
          </span>
          ${overviewOpen ? `<div class="rich-field">${richToolbarHTML(`entity:${e.id}:overview`, toolbarCollapsed(doc, ui, `entity:${e.id}:overview`), { includeToggle: false })}<div class="mention-editor" contenteditable="true" data-entity-field="overview" data-placeholder="What the party knows.">${buildMentionEditorHTML(doc, e.overview)}</div></div>` : ''}
        </div>
      </div>
    </div>
    ${characterSheetSectionHtml(e, doc, ui)}
    ${nonCharacterStatblockCardsHtml(e, doc, ui)}
    ${inactiveStatblocksHtml(e, doc)}
    ${isPartyCharacter ? '' : `<div class="revealed-block">
      <span class="field-label-row">
        <button class="section-toggle" data-reveal-toggle="${esc(e.id)}">${e.revealedOpen ? '▾' : '▸'} Revealed / hidden (GM)</button>
        ${oracleLinkIcon(e.type, 'revealed')}
        ${e.revealedOpen ? richToolbarToggleHTML(`entity:${e.id}:revealed`, toolbarCollapsed(doc, ui, `entity:${e.id}:revealed`)) : ''}
      </span>
      ${e.revealedOpen ? `<div class="rich-field">${richToolbarHTML(`entity:${e.id}:revealed`, toolbarCollapsed(doc, ui, `entity:${e.id}:revealed`), { includeToggle: false })}<div class="mention-editor" contenteditable="true" data-entity-field="revealed" data-placeholder="Secrets, twists, true motives.">${buildMentionEditorHTML(doc, e.revealed)}</div></div>` : ''}
    </div>`}
    <hr class="field-divider">
    ${npcSection(e)}
    ${factionSection(doc, e, ui)}
    ${conflictSection(doc, e, ui)}
    ${fantasyLocationFieldsSection(doc, e, ui)}
    ${worldProfileSection(doc, e, ui)}
    ${worldDemographicsSection(doc, e, ui)}
    ${dungeonCrawlLinksSection(doc, e)}
    ${entityConfigurationSectionHtml(doc, e, ui)}
    ${relBlockHtml}`;
}

// The Type <select> + tag editor + tag chip list.
function entityTypeTagsRowHtml(doc, e, ui) {
  return `
    <div class="inspector-type-tags-row">
      <label class="field-label inspector-type-field">Type
        <select data-entity-field="type">${ENTITY_TYPES.map((t) => `<option value="${t}" ${t === e.type ? 'selected' : ''}>${entityTypeLabel(t, doc.settings.genrePack)}</option>`).join('')}</select>
      </label>
      <div class="tag-editor">${tagEditorHead(doc, e, ui)}</div>
    </div>
    ${tagEditorList(doc, e, ui)}`;
}

// Direct follow-up request: "move tags above Relationships in the entity
// editor" — every entity type now renders Type/Tags in the SAME position
// (right before Relationships, inspector()'s own return), under the same
// collapsed-by-default header (this used to fork three ways by entity
// type: inline at the top for Faction/Conflict/Lore/Location under a
// collapsed "Tags" header, at the top of the statblock section —
// un-collapsible — for NPC/Asset/Lifeform, and inline at the top for Item;
// that three-way split is gone, one position and one collapse behavior for
// every type). A LATER direct follow-up renamed the header from "Tags" to
// "Configuration" and folded the "+Field"/"+Track"/"+ Add a Statblock"
// admin controls (statblockAddControlsHtml, previously their own
// always-visible row directly under the statblock cards) into this same
// section — Type/Tags and "add a statblock" are both configuration-y,
// occasional actions a GM reaches for far less often than reading/editing
// the statblocks/fields themselves, so they now share one collapsed
// section instead of two separate ones.
function entityConfigurationSectionHtml(doc, e, ui) {
  const key = `entityConfiguration:${e.id}`;
  const collapsed = isPartySectionCollapsed(ui, key, true);
  const body = collapsed ? '' : `${entityTypeTagsRowHtml(doc, e, ui)}${statblockAddControlsHtml(e, doc, ui)}`;
  return `${partySectionHeaderHtml(key, 'Configuration', collapsed)}${body}`;
}

// NPC "current goal" (docs/design/scene-story-integration-plan.md) — one
// free-text field, the smallest possible version of the Scene/Story
// spec's fuller NPC Roster (role/status/disposition/voice notes, all
// postponed as not-yet-validated). Mirrors a Faction's own Agenda field
// one section up, just plain text rather than a rich mention field since
// this is meant as a quick "what are they after right now" jot, not prose.
function npcSection(e) {
  if (e.type !== 'npc') return '';
  return `
    <div class="faction-card">
      <label class="field-label">Current goal
        <input data-entity-field="currentGoal" value="${esc(e.currentGoal)}" placeholder="What are they after right now?">
      </label>
    </div>`;
}

// Faction card template (2026-07-03 ruleset review) — HQ/leadership/a
// scenario-seed hook, shown only for faction-type entities (the fields
// still exist harmlessly if an entity is retyped away from faction, same as
// statblocks aren't stripped on a type change). Phase 10 adds an Agenda
// field and a Pressure Track (domain/factions.js — a Thread tagged
// kind: 'faction-pressure', same "reuse Threads instead of a second
// mechanism" pattern the Trade drawer's Contracts already use) — opt-in
// per faction, not auto-created, so a faction nobody's tracking doesn't
// clutter the WHY question's thread list.
function factionSection(doc, e, ui) {
  if (e.type !== 'faction') return '';
  const track = getPressureTrack(doc, e.id);
  // Direct follow-up request: "make the section headers such as 'Conflict'
  // and 'Relationships'... use the same collapseable format used on the
  // Campaign panel" — same partySectionHeaderHtml/isPartySectionCollapsed
  // mechanism as the Relationships/Tags headers. Default COLLAPSED (a
  // later direct follow-up superseded the original default-open decision:
  // "Default the character sheet section to be open, but all other
  // sections to be collapsed when the entity record is opened").
  const cardKey = `entityFactionCard:${e.id}`;
  const cardCollapsed = isPartySectionCollapsed(ui, cardKey, true);
  const cardBodyHtml = `
      <label class="field-label">${fieldLabelRow('HQ', 'faction', 'hq')}
        <input data-entity-field="hq" value="${esc(e.hq)}" placeholder="Where they operate from">
      </label>
      <label class="field-label">${fieldLabelRow('Leadership', 'faction', 'leadership')}
        <input data-entity-field="leadership" value="${esc(e.leadership)}" placeholder="Who's in charge">
      </label>
      <div class="field-label">${fieldLabelRow('Scenario seed', 'faction', 'scenarioSeed', null, richToolbarToggleHTML(`entity:${e.id}:scenarioSeed`, toolbarCollapsed(doc, ui, `entity:${e.id}:scenarioSeed`)))}
        <div class="rich-field">${richToolbarHTML(`entity:${e.id}:scenarioSeed`, toolbarCollapsed(doc, ui, `entity:${e.id}:scenarioSeed`), { includeToggle: false })}<div class="mention-editor" contenteditable="true" data-entity-field="scenarioSeed" data-placeholder="A one-paragraph hook this faction can drop into a session.">${buildMentionEditorHTML(doc, e.scenarioSeed)}</div></div>
      </div>
      <div class="field-label">${fieldLabelRow('Agenda', 'faction', 'agenda', null, richToolbarToggleHTML(`entity:${e.id}:agenda`, toolbarCollapsed(doc, ui, `entity:${e.id}:agenda`)))}
        <div class="rich-field">${richToolbarHTML(`entity:${e.id}:agenda`, toolbarCollapsed(doc, ui, `entity:${e.id}:agenda`), { includeToggle: false })}<div class="mention-editor" contenteditable="true" data-entity-field="agenda" data-placeholder="What is this faction actively pursuing right now?">${buildMentionEditorHTML(doc, e.agenda)}</div></div>
      </div>
      ${diplomacyFieldsHtml(e)}
      ${factionStatsHtml(e)}
      ${factionPressureHtml(e, track)}`;
  return `
    <div class="faction-card">
      ${partySectionHeaderHtml(cardKey, 'Faction card', cardCollapsed)}
      ${cardCollapsed ? '' : cardBodyHtml}
    </div>
    ${factionTurnSectionHtml(doc, e, ui)}`;
}

export const CONFLICT_STATUS_OPTIONS = [
  ['cold', 'Cold'], ['simmering', 'Simmering'], ['active', 'Active'], ['escalated', 'Escalated'], ['open_war', 'Open War'], ['resolved', 'Resolved'],
];

/** Faction Conflict (Living Faction Engine, docs/design/faction-
 *  conflict-integration-plan.md) — validated against GM-community
 *  sentiment before being scoped this way. The "hero path" below is
 *  always visible and alone is a usable conflict: status, the escalation
 *  clock (a Thread, same pip UI as a faction's goal track — deliberately
 *  the single most prominent element, matching Blades in the Dark's own
 *  beloved clock pattern), the stated-vs-root cause gap (two one-line
 *  fields, the highest-narrative-value/lowest-bookkeeping idea in the
 *  whole design), a third-party casualty line, and session hooks. Every
 *  faction "involved" is just the existing relationship system (a new
 *  `involves` type) — no bespoke id-array. Everything else (deep
 *  history, irreversible facts, per-faction posture, information
 *  asymmetry, party leverage, GM notes) lives behind an explicit "Add
 *  depth" toggle a GM opens only if a conflict earns it. */
function conflictSection(doc, e, ui) {
  if (e.type !== 'conflict') return '';
  const involvedFactions = (e.relationships || []).filter((r) => r.type === 'involves').map((r) => getEntity(doc, r.to)).filter(Boolean);
  const track = getConflictEscalationTrack(doc, e.id);
  const pips = track ? Array.from({ length: track.segments }, (_, i) => `<span class="pip ${i < track.filled ? 'on' : ''}"></span>`).join('') : '';
  const clockHtml = track
    ? `<div class="thread-row">
        <span class="thread-name">Escalation <span class="dim small">${track.filled}/${track.segments}</span></span>
        <span class="thread-clock">${pips}</span>
        <span class="thread-actions">
          <button class="icon-btn" data-thread-adv="${esc(track.id)}" title="Escalate">＋</button>
          <button class="icon-btn" data-thread-back="${esc(track.id)}" title="De-escalate">－</button>
        </span>
      </div>`
    : `<button class="btn ghost sm" data-conflict-start-clock="${esc(e.id)}">▶ Start Escalation Clock</button>`;
  const hookRows = (e.sessionHooks || []).map((h) => `<div class="thread-row">
      <span class="thread-name"><label><input type="checkbox" data-conflict-hook-toggle="${esc(e.id)}::${esc(h.id)}" ${h.used ? 'checked' : ''}> <span class="${h.used ? 'dim small' : ''}">${esc(h.text)}</span></label></span>
      <span class="thread-actions"><button class="icon-btn" data-conflict-hook-remove="${esc(e.id)}::${esc(h.id)}" title="Remove">✕</button></span>
    </div>`).join('');
  const depthOpen = (ui.expandedConflictDepth || new Set()).has(e.id);
  // Location (contested zone) is set from WHO's own tab, not here (direct
  // request — scoping "which factions are eligible" is a WHO-tab
  // concern), via workspace/index.js's activeConflictLocationPicker; this
  // card just READS e.locationId to scope the "Involved" faction picker
  // below to whoever's actually PRESENT there (factionsPresentAt, Living
  // Faction Engine Phase A). The generic Relationships block further down
  // can still link ANY faction regardless (Article II — this dropdown is
  // a curated convenience, not a restriction).
  const localFactions = e.locationId ? factionsPresentAt(doc, e.locationId) : listEntities(doc, 'faction');
  const involvedIds = new Set(involvedFactions.map((f) => f.id));
  const linkableFactions = localFactions.filter((f) => !involvedIds.has(f.id));
  // Direct follow-up request: "make the section headers such as 'Conflict'
  // and 'Relationships'... use the same collapseable format used on the
  // Campaign panel" — default COLLAPSED, same reasoning factionSection's
  // own "Faction card" header above now uses.
  const conflictKey = `entityConflict:${e.id}`;
  const conflictCollapsed = isPartySectionCollapsed(ui, conflictKey, true);
  const conflictBodyHtml = `
      <label class="field-label">Status
        <select data-entity-field="status">${CONFLICT_STATUS_OPTIONS.map(([v, l]) => `<option value="${v}" ${e.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      </label>
      ${e.locationId ? '' : '<p class="dim small">Set this conflict\'s Location on the WHO tab to narrow the faction picker below to local factions.</p>'}
      ${clockHtml}
      <div class="faction-assets">
        <span class="field-label-static">Involved</span>
        <span class="faction-asset-list">${involvedFactions.map((f) => `<button type="button" class="entity-chip" data-open-entity="${esc(f.id)}">${esc(f.name) || 'Unnamed'}</button>`).join('') || '<span class="dim small">None yet.</span>'}</span>
        <select data-conflict-faction-link="${esc(e.id)}">
          <option value="">${e.locationId ? '— add a local faction —' : '— add a faction —'}</option>
          ${linkableFactions.map((f) => `<option value="${esc(f.id)}">${esc(f.name) || 'Unnamed'}</option>`).join('')}
        </select>
      </div>
      ${!e.locationId ? '<p class="dim small">Set a Location above to narrow this list to factions actually present there.</p>' : (!linkableFactions.length ? '<p class="dim small">No other factions present at this location yet — link one from Relationships below if it belongs anyway.</p>' : '')}
      <label class="field-label">What people say it's about
        <input data-entity-field="statedCause" value="${esc(e.statedCause)}" placeholder="The public story">
      </label>
      <label class="field-label">What's actually driving it
        <input data-entity-field="rootCause" value="${esc(e.rootCause)}" placeholder="The real reason">
      </label>
      <label class="field-label">Why the gap matters
        <input data-entity-field="causeGapHook" value="${esc(e.causeGapHook)}" placeholder="What happens if the party notices">
      </label>
      <label class="field-label">Someone innocent gets hurt regardless
        <input data-entity-field="thirdPartyCasualty" value="${esc(e.thirdPartyCasualty)}" placeholder="Who, and how">
      </label>
      <button class="btn ghost sm" data-conflict-quickstart="${esc(e.id)}">🎲 Quick-start</button>
      <div class="faction-assets">
        <span class="field-label-static">Session hooks</span>
      </div>
      ${hookRows || '<p class="dim small">None yet.</p>'}
      <div class="rel-add">
        <input data-conflict-hook-input="${esc(e.id)}" placeholder="New session hook…">
        <button class="btn ghost sm" data-conflict-hook-add="${esc(e.id)}">+ Add</button>
      </div>
      <button class="section-toggle" data-conflict-depth-toggle="${esc(e.id)}">${depthOpen ? '▾' : '▸'} Add depth</button>
      ${depthOpen ? conflictDepthHtml(doc, e, ui, involvedFactions) : ''}`;
  return `
    <div class="faction-card">
      ${partySectionHeaderHtml(conflictKey, 'Encounter', conflictCollapsed)}
      ${conflictCollapsed ? '' : conflictBodyHtml}
    </div>`;
}

function conflictDepthHtml(doc, e, ui, involvedFactions) {
  const factRows = (e.irreversibleFacts || []).map((f) => `<p class="dim small">• ${esc(f.summary)}${f.consequence ? ` — <i>${esc(f.consequence)}</i>` : ''}</p>`).join('');
  const postureRows = involvedFactions.map((f) => {
    const p = (e.factionPostures || []).find((x) => x.factionId === f.id) || { cohesion: 5, notes: '' };
    return `<div class="thread-row">
      <span class="thread-name">${esc(f.name)} <span class="dim small">— cohesion</span> ${numStepper(`<input type="number" min="0" max="10" class="rel-strength-input" data-conflict-posture-field="${esc(e.id)}::${esc(f.id)}::cohesion" value="${Number(p.cohesion) || 0}">`)}</span>
      <span class="thread-actions"><button class="icon-btn" data-conflict-posture-remove="${esc(e.id)}::${esc(f.id)}" title="Remove posture">✕</button></span>
    </div>
    <input data-conflict-posture-field="${esc(e.id)}::${esc(f.id)}::notes" value="${esc(p.notes)}" placeholder="Dependency, doctrine, public vs. private goal — in your own words">`;
  }).join('');
  const asym = e.informationAsymmetry;
  const asymHtml = asym
    ? `<label class="field-label">Who holds it
        <select data-conflict-asymmetry-field="${esc(e.id)}::holderFactionId">
          <option value="">— unset —</option>
          ${involvedFactions.map((f) => `<option value="${esc(f.id)}" ${asym.holderFactionId === f.id ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}
        </select>
      </label>
      <input data-conflict-asymmetry-field="${esc(e.id)}::whatTheyKnow" value="${esc(asym.whatTheyKnow)}" placeholder="What they know">
      <input data-conflict-asymmetry-field="${esc(e.id)}::impactIfRevealed" value="${esc(asym.impactIfRevealed)}" placeholder="What happens if the party reveals it">
      ${asym.revealed
        ? '<p class="dim small">✓ Revealed.</p>'
        : `<button class="btn ghost sm" data-conflict-asymmetry-reveal="${esc(e.id)}">Reveal</button>`}
      <button class="btn ghost sm" data-conflict-asymmetry-clear="${esc(e.id)}">Clear</button>`
    : `<button class="btn ghost sm" data-conflict-asymmetry-add="${esc(e.id)}">+ Add Information Asymmetry</button>`;
  return `
    <div class="field-label">${fieldLabelRow('Deep root', 'conflict', 'deepRootSummary', null, richToolbarToggleHTML(`entity:${e.id}:deepRootSummary`, toolbarCollapsed(doc, ui, `entity:${e.id}:deepRootSummary`)))}
      <div class="rich-field">${richToolbarHTML(`entity:${e.id}:deepRootSummary`, toolbarCollapsed(doc, ui, `entity:${e.id}:deepRootSummary`), { includeToggle: false })}<div class="mention-editor" contenteditable="true" data-entity-field="deepRootSummary" data-placeholder="What started this, long before the party got involved.">${buildMentionEditorHTML(doc, e.deepRootSummary)}</div></div>
    </div>
    <div class="field-label">${fieldLabelRow('Precipitating incident', 'conflict', 'precipitatingIncident', null, richToolbarToggleHTML(`entity:${e.id}:precipitatingIncident`, toolbarCollapsed(doc, ui, `entity:${e.id}:precipitatingIncident`)))}
      <div class="rich-field">${richToolbarHTML(`entity:${e.id}:precipitatingIncident`, toolbarCollapsed(doc, ui, `entity:${e.id}:precipitatingIncident`), { includeToggle: false })}<div class="mention-editor" contenteditable="true" data-entity-field="precipitatingIncident" data-placeholder="The recent, smaller thing that actually lit the fuse.">${buildMentionEditorHTML(doc, e.precipitatingIncident)}</div></div>
    </div>
    <div class="field-label">${fieldLabelRow('Last de-escalation attempt', 'conflict', 'lastDeescalationAttempt', null, richToolbarToggleHTML(`entity:${e.id}:lastDeescalationAttempt`, toolbarCollapsed(doc, ui, `entity:${e.id}:lastDeescalationAttempt`)))}
      <div class="rich-field">${richToolbarHTML(`entity:${e.id}:lastDeescalationAttempt`, toolbarCollapsed(doc, ui, `entity:${e.id}:lastDeescalationAttempt`), { includeToggle: false })}<div class="mention-editor" contenteditable="true" data-entity-field="lastDeescalationAttempt" data-placeholder="Who tried to fix this, why it failed, who got blamed.">${buildMentionEditorHTML(doc, e.lastDeescalationAttempt)}</div></div>
    </div>
    <div class="faction-assets"><span class="field-label-static">Irreversible facts</span></div>
    ${factRows || '<p class="dim small">None yet.</p>'}
    <div class="rel-add">
      <input data-conflict-fact-summary="${esc(e.id)}" placeholder="What happened (can't be undone)">
      <input data-conflict-fact-consequence="${esc(e.id)}" placeholder="What it means going forward">
      <button class="btn ghost sm" data-conflict-fact-add="${esc(e.id)}">+ Add</button>
    </div>
    ${involvedFactions.length ? `<div class="faction-assets"><span class="field-label-static">Faction postures</span></div>${postureRows}` : ''}
    <div class="faction-assets"><span class="field-label-static">Information asymmetry</span></div>
    ${asymHtml}
    <label class="field-label">Party leverage
      <input data-entity-field="partyLeverage" value="${esc(e.partyLeverage)}" placeholder="Information, an asset, or an NPC neither faction controls">
    </label>
    <div class="field-label">${fieldLabelRow('GM notes', 'conflict', 'gmNotes', null, richToolbarToggleHTML(`entity:${e.id}:gmNotes`, toolbarCollapsed(doc, ui, `entity:${e.id}:gmNotes`)))}
      <div class="rich-field">${richToolbarHTML(`entity:${e.id}:gmNotes`, toolbarCollapsed(doc, ui, `entity:${e.id}:gmNotes`), { includeToggle: false })}<div class="mention-editor" contenteditable="true" data-entity-field="gmNotes" data-placeholder="Anything else worth remembering.">${buildMentionEditorHTML(doc, e.gmNotes)}</div></div>
    </div>`;
}

// SWN/GMAtlas Core Faction Turn Engine (docs/adr/0031, docs/adr/0032) — a
// second, deeper card below the existing stats/pressure-track card above
// (kept, untouched): real HP/FacCreds/XP, Homeworld + Bases of Influence
// (real Location references, same dropdown-of-existing-entities pattern
// worldDemographicsSection's Bases field already established), the
// structured Assets list (a provider's catalog — NOT the free-text
// `assets` chip list above — zero collision), Faction Tags, and the
// current Goal + its Thread-backed progress clock (getFactionGoalTrack,
// mirroring getPressureTrack exactly). Every catalog lookup resolves
// through this faction's own provider (factionProviderFor — its own
// `rulesProvider` override, else the campaign default, else SWN), so this
// card renders identically whichever provider a faction uses — exported
// (unlike this file's other section renderers) so factionEvents.js's
// Faction Roster can render the exact same live, editable card inline
// without duplicating any of this markup/logic. Attack isn't offered as a
// direct button here — it inherently needs picking a rival faction/asset
// pair, which the Faction Events panel's turn-review flow already does as
// part of proposing a full turn; every other action (buy/sell/repair/
// refit/expand/change homeworld/use ability/stealth toggle) is a quick,
// immediate, single-click GM action here instead. HP/FacCreds/XP/
// Homeworld use `data-faction-field` (an explicit faction id baked into
// the attribute, mirroring `data-faction-stat`) rather than the generic
// `data-entity-field` (which only ever resolves against Cast's single
// "active entity") — this card needs to work correctly for a faction that
// ISN'T the one currently open in Cast, since the Faction Roster below
// can show any faction on demand.
//
// Which ruleset provider a faction uses is set in Settings only (Rules
// Constitution's campaign-wide default) — there's no per-faction override
// control on this card (there was one; removed on direct request so a GM
// isn't offered two places to change the same thing). This is now the
// Entity Editor's card ONLY — "everything about a faction" lives here, per
// direct request — Faction Events no longer renders it at all; instead it
// shows a narrower current-activity/social-political summary
// (factionEvents.js's own factionActivitySummaryHtml) with a link back to
// this full card (data-open-entity, the same universal "open this entity's
// full editor" mechanism every other entity chip in the app already uses).
// Bases of Influence — collapsed under its own toggle by default once
// any exist (direct request: a populated list is reference clutter most
// of the time; an empty one should show its "expand influence to" picker
// right away since that's the only way to get a first base at all).
// `ui.basesOfInfluenceToggled` tracks entities whose state has been
// explicitly flipped AWAY from that data-driven default — same inverted-
// tracking shape as `collapsedOverview` (open by default, tracks explicit
// closes) — so `open` XORs the toggle against "has any bases" rather than
// reading a single fixed default the way expandedWorldProfile/
// expandedWorldDemographics do. Each base chip now also has a ✕
// (data-faction-base-remove) — a plain list-edit, not a mechanical action
// (no FacCred refund, no dice), for correcting a mis-added base.
function basesOfInfluenceHtml(doc, e, ui, locations) {
  const bases = e.basesOfInfluence || [];
  const hasBases = bases.length > 0;
  const toggled = (ui && ui.basesOfInfluenceToggled) || new Set();
  const dataDefaultOpen = !hasBases;
  const open = toggled.has(e.id) ? !dataDefaultOpen : dataDefaultOpen;
  const chips = bases.map((b) => {
    const l = locations.find((x) => x.id === b.locationId);
    const homeworldBtn = b.locationId !== e.homeworldId ? ` <button type="button" class="icon-btn" data-faction-base-homeworld="${esc(e.id)}::${esc(b.locationId)}" title="Make Homeworld">🏠</button>` : '';
    return `<span class="chip sm">${esc(l ? l.name : 'unknown')} (${b.hp}/${b.maxHp} HP)${homeworldBtn} <button type="button" class="icon-btn" data-faction-base-remove="${esc(e.id)}::${esc(b.locationId)}" title="Remove Base of Influence">✕</button></span>`;
  }).join('');
  return `
    <div class="faction-assets">
      <h4 class="section-head-row"><button type="button" class="btn ghost sm" data-bases-toggle="${esc(e.id)}">${open ? '▾' : '▸'} Bases of Influence${hasBases ? ` (${bases.length})` : ''}</button></h4>
      ${open ? `
      <span class="faction-asset-list">${chips || '<span class="dim small">None yet.</span>'}</span>
      <select data-faction-base-add="${esc(e.id)}">
        <option value="">— expand influence to —</option>
        ${locations.filter((l) => !bases.some((b) => b.locationId === l.id)).map((l) => `<option value="${esc(l.id)}">${esc(l.name)}</option>`).join('')}
      </select>` : ''}
    </div>`;
}

export function factionTurnSectionHtml(doc, e, ui = {}) {
  if (e.type !== 'faction') return '';
  const focusEventId = ui && ui.entityDetailFocusEventId;
  const maxHp = computeFactionMaxHp(e);
  const locations = listEntities(doc, 'location');
  const provider = factionProviderFor(doc, e);
  const goalTrack = e.currentGoalId ? getFactionGoalTrack(doc, e.id) : null;
  const tagChips = (e.factionTags || []).map((id) => {
    const tag = provider.findTag(id);
    return `<span class="chip sm" title="${esc(tag ? tag.effect : '')}">${esc(tag ? tag.name : id)} <button type="button" class="icon-btn" data-faction-tag-remove="${esc(e.id)}::${esc(id)}" title="Remove">✕</button></span>`;
  }).join('');
  const availableTags = provider.tags.filter((t) => !t.repeatable && !(e.factionTags || []).includes(t.id));
  const assetOptions = [];
  for (const statType of ['force', 'cunning', 'wealth']) {
    for (const a of provider.assets[statType]) {
      if (a.rating <= (e[statType] || 0) && a.cost <= (e.facCreds || 0)) assetOptions.push({ statType, ...a });
    }
  }
  const assetRows = (e.factionAssets || []).map((fa) => {
    const catalog = provider.findAssetAnyStat(fa.catalogId) || { name: fa.catalogId, hp: fa.hp, rating: '?' };
    const loc = locations.find((l) => l.id === fa.locationId);
    const refitOptions = (provider.assets[fa.statType] || []).filter((o) => o.id !== fa.catalogId && o.rating <= (e[fa.statType] || 0));
    return `<div class="thread-row">
      <span class="thread-name">${esc(catalog.name)} <span class="dim small">(${esc(fa.statType)} ${catalog.rating}, ${fa.hp}/${catalog.hp} HP${fa.status === 'assembling' ? ', assembling' : ''}${fa.stealthed ? ', stealthed' : ''}${fa.missedMaintenance ? ', ⚠ missed upkeep' : ''})</span> <span class="dim small">— ${esc(loc ? loc.name : 'unknown world')}</span></span>
      <span class="thread-actions">
        <button class="icon-btn" data-faction-fa-stealth="${esc(e.id)}::${esc(fa.id)}" title="${fa.stealthed ? 'Unstealth' : 'Stealth'}">${fa.stealthed ? '🕶' : '👁'}</button>
        <button class="icon-btn" data-faction-fa-repair="${esc(e.id)}::${esc(fa.id)}" title="Repair">✚</button>
        ${catalog.hasAction ? `<button class="icon-btn" data-faction-fa-ability="${esc(e.id)}::${esc(fa.id)}" title="Use Asset Ability">⚙</button>` : ''}
        <button class="icon-btn" data-faction-fa-sell="${esc(e.id)}::${esc(fa.id)}" title="Sell">✕</button>
      </span>
      ${refitOptions.length ? `<select data-faction-fa-refit="${esc(e.id)}::${esc(fa.id)}">
        <option value="">— refit into —</option>
        ${refitOptions.map((o) => `<option value="${esc(o.id)}">${esc(o.name)} (${fa.statType} ${o.rating}, ${o.cost} FacCred${o.cost === 1 ? '' : 's'})</option>`).join('')}
      </select>` : ''}
    </div>`;
  }).join('');
  const goalPips = goalTrack ? Array.from({ length: goalTrack.segments }, (_, i) => `<span class="pip ${i < goalTrack.filled ? 'on' : ''}"></span>`).join('') : '';
  const busy = !!(e.busyUntilTurn && e.busyUntilTurn > (doc.factionTurnNumber || 0));
  const seizeLoc = e.seizeProgress ? locations.find((l) => l.id === e.seizeProgress.locationId) : null;
  const governedNames = (e.governedLocationIds || []).map((id) => { const l = locations.find((x) => x.id === id); return l ? l.name : 'an unnamed world'; });
  return `
    <div class="faction-card">
      <h4>Faction Turn (${esc(provider.label)})</h4>
      <div class="faction-stats-row">
        <label class="field-label">HP ${numStepper(`<input type="number" min="0" max="${maxHp}" data-faction-field="${esc(e.id)}::hp" value="${Number(e.hp) || 0}">`)} <span class="dim small">/ ${maxHp}</span></label>
        <label class="field-label">FacCreds ${numStepper(`<input type="number" min="0" data-faction-field="${esc(e.id)}::facCreds" value="${Number(e.facCreds) || 0}">`)}</label>
        <label class="field-label">XP ${numStepper(`<input type="number" min="0" data-faction-field="${esc(e.id)}::xp" value="${Number(e.xp) || 0}">`)}</label>
      </div>
      ${busy ? `<p class="dim small">🚀 In transit until turn ${e.busyUntilTurn}.</p>` : ''}
      ${e.seizeProgress ? `<div class="thread-row">
        <span class="thread-name">Seizing ${esc(seizeLoc ? seizeLoc.name : 'a world')} <span class="dim small">— ${e.seizeProgress.remainingHp} HP resistance remains</span></span>
        <span class="thread-actions"><button class="btn ghost sm" data-faction-fa-siege="${esc(e.id)}">▶ Press the Siege</button></span>
      </div>` : ''}
      <label class="field-label">${fieldLabelRow('Homeworld', 'faction', 'homeworldId')}
        <select data-faction-field="${esc(e.id)}::homeworldId">
          <option value="">— unset —</option>
          ${locations.map((l) => `<option value="${esc(l.id)}" ${e.homeworldId === l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}
        </select>
      </label>
      ${basesOfInfluenceHtml(doc, e, ui, locations)}
      <div class="faction-assets">
        <span class="field-label-static">Tags</span>
        <span class="faction-asset-list">${tagChips || '<span class="dim small">None yet.</span>'}</span>
        <select data-faction-tag-add="${esc(e.id)}">
          <option value="">— add a tag (max 2) —</option>
          ${availableTags.map((t) => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('')}
        </select>
      </div>
      ${governedNames.length ? `<div class="faction-assets">
        <span class="field-label-static">Governed Worlds</span>
        <span class="faction-asset-list">${governedNames.map((n) => `<span class="chip sm">${esc(n)}</span>`).join('')}</span>
      </div>` : ''}
      <label class="field-label">${fieldLabelRow('Goal', 'faction', 'currentGoalId')}
        <select data-faction-goal-select="${esc(e.id)}">
          <option value="">— none —</option>
          ${provider.goals.map((g) => `<option value="${esc(g.id)}" ${e.currentGoalId === g.id ? 'selected' : ''} title="${esc(g.description)}">${esc(g.name)}</option>`).join('')}
        </select>
      </label>
      ${goalTrack ? `<div class="thread-row thread-status-${esc(goalTrack.status)} ${goalTrack.done ? 'done' : ''}">
        <span class="thread-name">${esc(provider.findGoal(e.currentGoalId) ? provider.findGoal(e.currentGoalId).description : '')}</span>
        <span class="thread-clock" title="${goalTrack.filled}/${goalTrack.segments}">${goalPips}</span>
        <span class="thread-actions">
          <button class="icon-btn" data-thread-adv="${esc(goalTrack.id)}" title="Advance">＋</button>
          <button class="icon-btn" data-thread-back="${esc(goalTrack.id)}" title="Set back">－</button>
        </span>
      </div>` : ''}
      <div class="faction-assets">
        <span class="field-label-static">Assets (${esc(provider.label)})</span>
      </div>
      ${assetRows || '<p class="dim small">No structured assets yet.</p>'}
      <select data-faction-buyasset-add="${esc(e.id)}">
        <option value="">— buy an asset —</option>
        ${assetOptions.map((a) => `<option value="${esc(a.statType)}::${esc(a.id)}">${esc(a.name)} (${a.statType} ${a.rating}, ${a.cost} FacCred${a.cost === 1 ? '' : 's'})</option>`).join('')}
      </select>
      ${!e.homeworldId ? '<p class="dim small">Set a Homeworld above before buying assets.</p>' : ''}
    </div>
    ${factionTurnHistoryHtml(doc, e, focusEventId)}`;
}

// Living Faction Engine Phase D: "the log of all turns across the
// campaign involving the faction" — direct request, reached by clicking a
// faction's name anywhere in Faction Events (data-open-entity, this same
// entity editor). Reuses factionEventsByRound's factionId filter (the
// SAME grouping the Round History browser uses, not a second query) so a
// GM sees this faction's whole history grouped by round, most recent
// first. `focusEventId` (threaded from shell.js's entityDetailFocusEventId,
// set only when arriving via a specific turn's name link) highlights that
// one entry and expands its "impact of this event" detail inline — every
// other entry stays a compact one-liner.
function factionTurnHistoryHtml(doc, e, focusEventId) {
  const rounds = factionEventsByRound(doc, { factionId: e.id });
  if (!rounds.length) return '';
  const provider = factionProviderFor(doc, e);
  const rows = rounds.map(({ turnNumber, events }) => {
    const entries = events.map((ev) => {
      const focused = focusEventId && ev.id === focusEventId;
      const loc = ev.locationId ? getEntity(doc, ev.locationId) : null;
      const impactLine = focused && ev.impact ? factionImpactSummary(provider, ev.impact) : '';
      return `<div class="thread-row${focused ? ' focused' : ''}">
        <span class="thread-name">${esc(ACTION_LABEL_FOR_HISTORY[ev.action] || ev.action)}${ev.outcome ? ` (${esc(ev.outcome)})` : ''}${loc ? ` @ ${esc(loc.name)}` : ''} <span class="dim small">${esc(ev.narrative || '')}</span></span>
      </div>${impactLine}`;
    }).join('');
    return `<div class="faction-turn-history-round"><span class="field-label-static">Turn ${turnNumber}</span>${entries}</div>`;
  }).join('');
  return `
    <div class="faction-card">
      <h4>Turn History</h4>
      ${rows}
    </div>`;
}

const ACTION_LABEL_FOR_HISTORY = {
  attack: 'Attack', buyAsset: 'Buy Asset', sellAsset: 'Sell Asset', repairAssetOrFaction: 'Repair',
  refitAsset: 'Refit Asset', expandInfluence: 'Expand Influence', changeHomeworld: 'Change Homeworld',
  seizePlanet: 'Seize Planet', useAssetAbility: 'Use Asset Ability', none: 'No action', busy: 'In transit',
};

function factionImpactSummary(provider, impact) {
  const nameFor = (catalogId) => { const c = provider.findAssetAnyStat(catalogId); return c ? c.name : catalogId; };
  const lines = [
    ...(impact.assetsAdded || []).map((a) => `+ ${esc(nameFor(a.catalogId))} (new)`),
    ...(impact.assetsRemoved || []).map((a) => `− ${esc(nameFor(a.catalogId))} (lost)`),
    ...(impact.assetsChanged || []).map((a) => `${esc(nameFor(a.catalogId))}: ${a.hpBefore}→${a.hpAfter} HP`),
  ];
  const stat = `${impact.hpDelta ? `${impact.hpDelta > 0 ? '+' : ''}${impact.hpDelta} HP ` : ''}${impact.facCredsDelta ? `${impact.facCredsDelta > 0 ? '+' : ''}${impact.facCredsDelta} FacCreds` : ''}`;
  return `<p class="dim small">Impact of this turn: ${stat || 'no change'}${lines.length ? ` — ${lines.join('; ')}` : ''}</p>`;
}

// Direct follow-up request: "For all fantasy Location entity types,
// create a robust list of location-defining fields that map to oracles
// so they can be autopopulated. Include fields considered popular,
// helpful and story-building across most internet TTRPG sources." Nine
// fields (domain/entities.js's LOCATION_FANTASY_FIELD_ORACLE_PATH), each
// rolled from — or typed over, with the edit written back to — its own
// real oracle table (session.js's rollLocationFantasyField/
// editLocationFantasyField; the mechanism is a direct sibling of the
// existing Sights/Smells/Sounds sensory fields, same "roll icon + text +
// clear" row, data/tables-fantasy-full.js's real tables underneath).
// Gated on the fantasy genre pack alone (every fantasy Location gets
// these, unlike World Profile's #World-tag opt-in above — a settlement/
// site descriptor set is relevant to essentially any fantasy Location,
// not just a special subset of them).
const FANTASY_LOCATION_FIELD_LABELS = {
  settlementType: 'Settlement Type',
  notableFeature: 'Notable Feature',
  authority: 'Ruling Authority',
  currentTrouble: 'Current Trouble',
  currentProject: 'Current Project',
  localColor: 'Local Color',
  tradeResource: 'Trade & Resources',
  realmType: 'Realm Type',
  danger: 'Danger',
};
// Same markup/classes as workspace/index.js's own oracleFieldRow (Sights/
// Smells/Sounds) — not imported from there (private to that module) —
// so a fantasy Location's new descriptor rows read as visually identical
// to the sensory rows every Location already has, just scoped to the
// Entity Editor instead of the WHERE workspace tab.
function fantasyOracleFieldRow(label, value, locId, field) {
  return `<div class="oracle-field-row">
    <span class="field-label-static">${esc(label)}</span>
    <button type="button" class="icon-btn" data-location-fantasy-roll="${esc(locId)}::${field}" title="Roll ${esc(label)}">🎲</button>
    <textarea class="thread-name-input oracle-field-textarea" rows="1" data-location-fantasy-field="${esc(locId)}::${field}" placeholder="—">${esc(value)}</textarea>
    ${value ? `<button type="button" class="icon-btn" data-location-fantasy-clear="${esc(locId)}::${field}" title="Clear ${esc(label)}">✕</button>` : ''}
  </div>`;
}
function fantasyLocationFieldsSection(doc, e, ui = {}) {
  if (e.type !== 'location') return '';
  if ((doc.settings && doc.settings.genrePack) !== 'fantasy') return '';
  const key = `entityFantasyLocation:${e.id}`;
  const open = !isPartySectionCollapsed(ui, key, true);
  return `
    <div class="faction-card">
      ${partySectionHeaderHtml(key, 'Location Details', !open)}
      ${open ? `
      <p class="dim small">Popular fantasy location-generator fields — roll 🎲 any one from its own real oracle table, or type your own.</p>
      ${Object.keys(LOCATION_FANTASY_FIELD_ORACLE_PATH).map((field) => fantasyOracleFieldRow(FANTASY_LOCATION_FIELD_LABELS[field], e[field] || '', e.id, field)).join('')}
      ` : ''}
    </div>`;
}

// World Profile (UWP) card (docs/adr/0026-hostile-canon-locations.md,
// 2026-07-08 third follow-up; System/Star/Hex/Zone reworked per direct
// follow-up request — "just use the Relationships for setting the
// choice... list it in the world profile for any location"): the
// physical/astrographic half of a Location's Universal World Profile —
// a read-only System/Star summary (any Location — getSystemForLocation/
// getStarForLocation, entities.js, a pure relationship-graph read, not a
// separately picked/stored field), then Hex/Zone (editable ONLY for a
// Location tagged #system or #star — they don't mean anything for a
// plain world/room/building), then World Size/Atmosphere/Biome/
// Hydrographics for everything else. Biome (ADR 0025) lives here too —
// still the same field feeding domain/trade.js's biomeBiasAt(), only its
// UI position moved. Collapsed by default (ui.expandedWorldProfile,
// ephemeral — same Set shape as enhancementsSection's own
// ui.expandedEnhancements).
//
// Direct follow-up request: "Associate all the world profile and
// demographics fields and sections under a Location entity type to the
// scifi genre and add a protected tag for Location types called World
// that adds those sections and fields to the entity record." This
// REPLACES the old "renders whenever this Location has any UWP data set,
// OR whenever the active frontier-setting provider is Hostile" heuristic
// — which, since resolveActiveProviderChoice(doc,'frontier-setting')
// resolves to 'hostile' for every campaign regardless of genre pack
// (Hostile is its ONLY provider, always activated), actually meant this
// card rendered collapsed on every Location in every genre, fantasy
// included. Now gated on BOTH: the genre pack genuinely being sci-fi,
// AND the Location explicitly carrying the #World protected tag
// (isLocationWorldTagged below) — a GM deliberately marks a Location as
// "this is a planet/system/station-scale World," rather than every
// Location quietly carrying planetary demographics fields it will never
// use. migrate.js's own backfill adds #World to any Location that
// already had real UWP/Demographics data (or was #system/#star tagged,
// which used to auto-show this card on its own) before this shipped, so
// no existing campaign's already-visible data goes dark.
//
// Hex/Zone can be set on EITHER a #system or #star Location, but "only
// one can be correct and the #star wins out" (direct quote) — a #system's
// OWN Hex/Zone only shows/is editable when its related Star
// (findRelatedStar, via getHexZoneForLocation) has NEITHER set; once the
// Star has either, the System's fields become a read-only display of the
// Star's values instead, with a note pointing at where to actually edit
// them. A #star's own Hex/Zone is always directly editable — it's the
// one source of truth once it exists. World Size/Atmosphere/Biome/
// Hydrographics/gas-giant are hidden for a #system OR #star Location
// either way (neither has a surface); worldDemographicsSection below
// hides itself entirely for the same reason.
function isScifiGenrePack(doc) {
  const pack = (doc.settings && doc.settings.genrePack) || 'sci-fi-generic';
  return pack === 'sci-fi-generic' || pack === 'hostile';
}
function isLocationWorldTagged(e) {
  return Array.isArray(e.tags) && e.tags.some((t) => /^world$/i.test(String(t).trim()));
}
function worldProfileSection(doc, e, ui = {}) {
  if (e.type !== 'location') return '';
  if (!isLocationWorldTagged(e) || !isScifiGenrePack(doc)) return '';
  const isStarTagged = (e.tags || []).includes('star');
  const isSystemTagged = (e.tags || []).includes('system');
  // Direct follow-up request: "use the same collapseable format used on
  // the Campaign panel" — converted from its own bespoke ui.expandedWorldProfile
  // Set to the shared mechanism; `open` is kept as the same derived boolean
  // so the rest of this function (built around ${open ? ... : ''}) needs no
  // other changes. Same default-collapsed behavior as before.
  const worldProfileKey = `entityWorldProfile:${e.id}`;
  const open = !isPartySectionCollapsed(ui, worldProfileKey, true);
  const codeSelect = (field, label, table, value) => `
    <label class="field-label">${fieldLabelRow(label, 'location', field)}
      <select data-entity-field="${field}">
        <option value="" ${!value ? 'selected' : ''}>— unset —</option>
        ${table.map((t) => `<option value="${esc(t.code)}" ${value === t.code ? 'selected' : ''}>${esc(t.code)} — ${esc(t.label)}</option>`).join('')}
      </select>
    </label>`;
  const biomes = biomesForGenrePack(resolveBiomeGenrePackId(doc));
  const system = getSystemForLocation(doc, e.id);
  const star = getStarForLocation(doc, e.id);
  const hexZone = (isSystemTagged || isStarTagged) ? getHexZoneForLocation(doc, e.id) : null;
  const overriddenBy = hexZone && hexZone.overriddenBy;
  return `
    <div class="faction-card">
      ${partySectionHeaderHtml(worldProfileKey, 'World Profile (UWP)', !open)}
      ${open ? `
      <p class="dim small">HOSTILE's own Universal World Profile format — reference only, doesn't affect Trade pricing. See Settings → Trade Economy Model for the full digit-meaning legend.</p>
      ${(system && system.id !== e.id) || (star && star.id !== e.id) ? `<div class="location-summary">
        ${system && system.id !== e.id ? `<span class="location-summary-item"><span class="location-summary-label"><span class="dim small">System</span> <button type="button" class="entity-chip" data-open-entity="${esc(system.id)}">${esc(system.name || 'Unnamed')}</button></span></span>` : ''}
        ${star && star.id !== e.id ? `<span class="location-summary-item"><span class="location-summary-label"><span class="dim small">Star</span> <button type="button" class="entity-chip" data-open-entity="${esc(star.id)}">${esc(star.name || 'Unnamed')}</button></span></span>` : ''}
      </div>` : ''}
      ${(isSystemTagged || isStarTagged) ? `
      <div class="faction-stats-row">
        <label class="field-label">${fieldLabelRow('Hex', 'location', 'hex')}
          ${overriddenBy
            ? `<input value="${esc(hexZone.hex)}" disabled title="Overridden by ${esc(overriddenBy.name || 'Unnamed')}'s own Hex">`
            : `<input data-entity-field="hex" value="${esc(e.hex)}" placeholder="0704" size="4" maxlength="4">`}
        </label>
        <label class="field-label">${fieldLabelRow('Zone', 'location', 'zone')}
          ${overriddenBy
            ? `<input value="${esc(hexZone.zone)}" disabled title="Overridden by ${esc(overriddenBy.name || 'Unnamed')}'s own Zone">`
            : `<input data-entity-field="zone" value="${esc(e.zone)}" placeholder="Near Earth Zone">`}
        </label>
      </div>
      ${overriddenBy ? `<p class="dim small">Hex/Zone overridden by its Star, <button type="button" class="entity-chip" data-open-entity="${esc(overriddenBy.id)}">${esc(overriddenBy.name || 'Unnamed')}</button> — edit them there instead.</p>` : ''}
      ` : ''}
      ${(isSystemTagged || isStarTagged) ? '<p class="dim small">This Location is a system or star — planet-only fields are hidden.</p>' : `
      ${codeSelect('worldSize', 'World Size', WORLD_SIZES, e.worldSize)}
      ${codeSelect('atmosphere', 'Atmosphere', ATMOSPHERES, e.atmosphere)}
      <label class="field-label">${fieldLabelRow('Biome', 'location', 'biome')}
        <select data-entity-field="biome">
          <option value="" ${!e.biome ? 'selected' : ''}>— unset —</option>
          ${biomes.map((b) => `<option value="${esc(b.id)}" ${e.biome === b.id ? 'selected' : ''}>${esc(b.label)}</option>`).join('')}
        </select>
      </label>
      ${codeSelect('hydrographics', 'Hydrographics', HYDROGRAPHICS, e.hydrographics)}
      <label class="chip sm"><input type="checkbox" data-entity-field="gasGiant" ${e.gasGiant ? 'checked' : ''}> Gas giant present in system</label>
      `}
      ` : ''}
    </div>`;
}

// World Demographics card (docs/adr/0026, third follow-up): the
// developed/governed half of a Location's profile — Starport, Bases,
// then (visually separated) Tech Level + Law Level, Trade Codes, Economy
// (the ADR 0013/0025 developmentLevel field, relabeled — still the same
// field feeding domain/trade.js's developmentLevelBiasAt(), only the
// display label changed), Population, Government. Hidden entirely for a
// #system/#star-tagged Location (same gate worldProfileSection uses for
// its own planet-only fields) — neither has a starport, bases,
// population, government, tech level, law level, trade codes, or economy
// of its own.
function worldDemographicsSection(doc, e, ui = {}) {
  if (e.type !== 'location') return '';
  if (!isLocationWorldTagged(e) || !isScifiGenrePack(doc)) return '';
  if ((e.tags || []).includes('system') || (e.tags || []).includes('star')) return '';
  // Direct follow-up request: "use the same collapseable format used on
  // the Campaign panel" — same conversion worldProfileSection's own
  // comment above already explains; `open`/default-collapsed behavior
  // unchanged.
  const worldDemoKey = `entityWorldDemographics:${e.id}`;
  const open = !isPartySectionCollapsed(ui, worldDemoKey, true);
  const codeSelect = (field, label, table, value) => `
    <label class="field-label">${fieldLabelRow(label, 'location', field)}
      <select data-entity-field="${field}">
        <option value="" ${!value ? 'selected' : ''}>— unset —</option>
        ${table.map((t) => `<option value="${esc(t.code)}" ${value === t.code ? 'selected' : ''}>${esc(t.code)} — ${esc(t.label)}</option>`).join('')}
      </select>
    </label>`;
  const baseLocations = listEntities(doc).filter((l) => l.type === 'location' && (l.tags || []).includes('base'));
  const devTypes = economyTypesForModel(doc.settings.tradeEconomyModel || 'hostile');
  const tradeCodeChips = (e.tradeCodes || []).map((c) => `
    <span class="chip sm">${esc((findTradeCode(c) || {}).label || c)} <button type="button" class="icon-btn" data-entity-tradecode-remove="${esc(e.id)}::${esc(c)}" title="Remove">✕</button></span>`).join('');
  const baseChips = (e.bases || []).map((b) => `
    <span class="chip sm">${esc(b)} <button type="button" class="icon-btn" data-entity-base-remove="${esc(e.id)}::${esc(b)}" title="Remove">✕</button></span>`).join('');
  return `
    <div class="faction-card">
      ${partySectionHeaderHtml(worldDemoKey, 'World Demographics', !open)}
      ${open ? `
      ${codeSelect('starport', 'Starport', STARPORT_CLASSES, e.starport)}
      <div class="faction-assets">
        <span class="field-label-static">${fieldLabelRow('Bases', 'location', 'bases', '(#base)')}</span>
        <span class="faction-asset-list">${baseChips || '<span class="dim small">None yet.</span>'}</span>
        <select data-entity-base-add="${esc(e.id)}">
          <option value="">— add a base —</option>
          ${baseLocations.map((l) => `<option value="${esc(l.name)}">${esc(l.name)}</option>`).join('')}
        </select>
        ${!baseLocations.length ? '<p class="dim small">No Locations tagged #base yet.</p>' : ''}
      </div>
      <hr class="field-divider">
      <div class="faction-stats-row">
        <label class="field-label">${fieldLabelRow('Tech Level', 'location', 'techLevel')}
          <input data-entity-field="techLevel" value="${esc(e.techLevel)}" placeholder="12">
        </label>
        <label class="field-label">${fieldLabelRow('Law Level', 'location', 'lawLevel')}
          <select data-entity-field="lawLevel">
            <option value="" ${!e.lawLevel ? 'selected' : ''}>— unset —</option>
            ${LAW_LEVELS.map((t) => `<option value="${esc(t.code)}" ${e.lawLevel === t.code ? 'selected' : ''}>${esc(t.code)} — ${esc(t.label)}</option>`).join('')}
          </select>
        </label>
      </div>
      <div class="faction-assets">
        <span class="field-label-static">${fieldLabelRow('Trade Codes', 'location', 'tradeCodes')}</span>
        <span class="faction-asset-list">${tradeCodeChips || '<span class="dim small">None yet.</span>'}</span>
        <select data-entity-tradecode-add="${esc(e.id)}">
          <option value="">— add a trade code —</option>
          ${TRADE_CODES.map((t) => `<option value="${esc(t.code)}">${esc(t.label)}</option>`).join('')}
        </select>
      </div>
      <label class="field-label">${fieldLabelRow('Economy', 'location', 'developmentLevel')}
        <select data-entity-field="developmentLevel">
          <option value="" ${!e.developmentLevel ? 'selected' : ''}>— unset —</option>
          ${devTypes.map((t) => `<option value="${esc(t.id)}" ${e.developmentLevel === t.id ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}
        </select>
      </label>
      ${codeSelect('population', 'Population', POPULATIONS, e.population)}
      ${codeSelect('government', 'Government', GOVERNMENTS, e.government)}
      <p class="dim small">Economy biases Trade prices for this Location (Settings → Trade Economy Model has the full dial reference) — leave unset to price as before.</p>
      ` : ''}
    </div>`;
}

// Direct follow-up request: "When creating the link, the map should be a
// link entry in the entity record. From the entity record, you should see
// the mapname listed as a link and clicking the link should navigate to
// the map." A Dungeon Crawl map's own locationEntityId (domain/
// dungeonCrawls.js's setDungeonMapLocation) is a one-way pointer, map ->
// entity — rather than also storing a redundant back-reference on the
// entity (another thing to keep in sync, another way migration could
// drop data), this computes the reverse lookup live at render time, same
// "single source of truth, derive the other direction" posture
// getContainingLocation/proximityToLocation already use elsewhere. Shows
// EVERY map pointing here, not just one — a multi-floor dungeon's
// several floors all share the same locationEntityId by design
// (createDungeonFloorBelowStairs), and each is its own real map worth
// jumping straight to.
function dungeonCrawlLinksSection(doc, e) {
  if (e.type !== 'location') return '';
  const maps = ((doc.dungeonCrawls && doc.dungeonCrawls.maps) || []).filter((m) => m.locationEntityId === e.id);
  if (!maps.length) return '';
  return `
    <div class="faction-card">
      <span class="field-label-static">Dungeon Maps</span>
      <span class="entity-chip-row">
        ${maps.map((m) => `<button type="button" class="entity-chip" data-open-dungeoncrawl-map="${esc(m.id)}" title="Open ${esc(m.name)} in Dungeon Crawl">🗺 ${esc(m.name)}</button>`).join('')}
      </span>
    </div>`;
}

// Diplomacy Engine fields (docs/adr/0009-situation-engine-revisited.md,
// Decision item 2) — three free-text fields alongside HQ/Leadership/Agenda
// above, same shape and creation-time application (entities.js's
// ensureFactionFields). A natural HOW-workspace "Negotiate" Co-Pilot hook
// was named in the ADR as a future follow-on, not committed to here.
function diplomacyFieldsHtml(e) {
  return `
    <label class="field-label">${fieldLabelRow('Fear', 'faction', 'fear')}
      <input data-entity-field="fear" value="${esc(e.fear)}" placeholder="What this faction is afraid of">
    </label>
    <label class="field-label">${fieldLabelRow('Need', 'faction', 'need')}
      <input data-entity-field="need" value="${esc(e.need)}" placeholder="What this faction needs">
    </label>
    <label class="field-label">${fieldLabelRow('Secret', 'faction', 'secret')}
      <input data-entity-field="secret" value="${esc(e.secret)}" placeholder="A secret about this faction (GM-facing)">
    </label>`;
}

// Force/Cunning/Wealth + Assets (2026-07-06, docs/adr/0011-swn-cwn-content.md):
// an original re-implementation of the three-stat-plus-growing-Assets-list
// concept Stars Without Number's own faction subsystem is best known for —
// see entities.js's ensureFactionFields for why these specific stats/scale.
function factionStatsHtml(e) {
  const stat = (key, label) => `
    <label class="field-label faction-stat">${label}
      ${numStepper(`<input type="number" min="0" max="10" data-faction-stat="${esc(e.id)}::${key}" value="${Number(e[key]) || 0}">`)}
    </label>`;
  const assets = (e.assets || []).map((a, i) => `
    <span class="chip sm faction-asset-chip">${esc(a)} <button type="button" class="icon-btn" data-faction-asset-remove="${esc(e.id)}::${i}" title="Remove asset">✕</button></span>`).join('');
  return `
    <div class="faction-stats-row">${stat('force', 'Force')}${stat('cunning', 'Cunning')}${stat('wealth', 'Wealth')}</div>
    <div class="faction-assets">
      <span class="field-label-static">Assets</span>
      <span class="faction-asset-list">${assets || '<span class="dim small">None yet.</span>'}</span>
      <button class="icon-btn" data-faction-asset-roll="${esc(e.id)}" title="Roll a Faction Asset and add it">🎲 ＋Asset</button>
    </div>`;
}

function factionPressureHtml(e, track) {
  // Two rolls, two flavors: Faction Activity (Hostile-flavored corporate
  // skullduggery, this app's default) and Faction Action (original content
  // inspired by Stars Without Number's faction-turn convention — a more
  // strategic/macro move rather than a narrative beat) — both ordinary
  // oracle tables, not a genre-pack swap, so a GM running any campaign can
  // reach for whichever fits the moment. "Resolve Turn" (2026-07-06) rolls
  // the stat-based mini-game (domain/factions.js's resolveFactionTurn)
  // against this faction's own Force/Cunning/Wealth — a single-faction turn,
  // distinct from the Journal drawer's bulk "Advance Faction Turns".
  const rollBtns = `
    <button class="icon-btn" data-roll="Corporate Powers>Faction Activity" title="Roll Faction Activity">🎲</button>
    <button class="icon-btn" data-roll="Stars Without Number>Faction Action" title="Roll Faction Action (SWN-inspired)">🎲²</button>
    <button class="icon-btn" data-faction-turn-resolve="${esc(e.id)}" title="Resolve one stat-based turn for this faction (Force/Cunning/Wealth check)">▶ Turn</button>`;
  const head = `<div class="faction-pressure-head"><span class="field-label-static">Pressure Track</span><span class="faction-pressure-rolls">${rollBtns}</span></div>`;
  if (!track) return `${head}<button class="chip" data-faction-pressure-add="${esc(e.id)}">＋ Pressure Track</button>`;
  const pips = Array.from({ length: track.segments }, (_, i) => `<span class="pip ${i < track.filled ? 'on' : ''}"></span>`).join('');
  return `${head}
    <div class="thread-row thread-status-${esc(track.status)} thread-priority-${esc(track.priority)} ${track.done ? 'done' : ''}">
      <span class="thread-clock" title="${track.filled}/${track.segments}">${pips}</span>
      <select class="thread-status-select" data-thread-status="${esc(track.id)}" title="Narrative lifecycle stage">
        ${THREAD_STATUSES.map((s) => `<option value="${s}" ${s === track.status ? 'selected' : ''}>${esc(THREAD_STATUS_LABELS[s])}</option>`).join('')}
      </select>
      <span class="thread-actions">
        <button class="icon-btn" data-thread-adv="${esc(track.id)}" title="Advance">＋</button>
        <button class="icon-btn" data-thread-back="${esc(track.id)}" title="Set back">－</button>
      </span>
    </div>`;
}

// Strain vs capacity, rendered as the SAME counter/track widget Health, XP,
// Momentum and every other statblock track use (direct request — this
// previously had its own bespoke fill-bar) — the exact .statblock-row
// .track-row/.track-widget/.track-boxes/.track-value-badge shape, just
// built from plain <span>s instead of trackRow()'s <button>s, since Strain
// is read-only here (a derived sum of installed enhancements' costs, never
// a value the GM sets directly the way a real track field is). Sharing the
// markup means it automatically picks up every track-row layout fix
// (label width, box size, vertical centering) instead of needing its own
// copy kept in sync by hand. Exceeding capacity is still only ever a
// visible flag (the badge turns the same --danger red .over-strain
// already uses elsewhere) — never an automatic penalty.
function strainMeter(used, cap, over) {
  const boxes = Array.from({ length: Math.max(cap, 0) }, (_, k) => k + 1)
    .map((n) => `<span class="track-box ${n <= used ? 'on' : ''}" aria-hidden="true">${n}</span>`).join('');
  return `<div class="statblock-row track-row">
    <span class="statblock-key">Strain</span>
    <div class="track-widget ${over ? 'over-strain' : ''}" title="Strain: ${used}/${cap}${over ? ' — over capacity' : ''}">
      <div class="track-boxes">${boxes}</div>
    </div>
  </div>`;
}

// Enhancements (renamed from "Cybernetics" 2026-07-06, docs/adr/next-
// request.md — originally 2026-07-06, docs/adr/0011-swn-cwn-content.md,
// Cities Without Number's best-known subsystem, an original
// re-implementation, see domain/enhancements.js): NPC-only (a
// Faction/Location/Asset/Lore entity has no body to augment). Collapsed by
// default (expandedEnhancements, ephemeral — a GM working a busy NPC list
// doesn't need this open on every card), living under the statblock section
// now rather than above it. A running Strain total against a capacity, an
// installed-enhancement chip list each tagged with its type
// (data/enhancementTypes.js — Cybernetics/Wetware/Psionics/
// Gene-Modification), and a small inline add form. The 🎲 button rolls the
// Augmentation > Cyberware Concept oracle table straight into the name
// draft (ui.enhancementDraft, shell.js) instead of the Journal — each roll
// overwrites the draft until "Install" commits it, same "oracle rolls
// flavor, the GM commits the real record" split as the Faction Asset roll,
// just landing in the field instead of requiring a copy/paste.
function enhancementsSection(e, ui) {
  if (e.type !== 'npc') return '';
  const items = getEnhancements(e);
  const used = strainUsed(e);
  const cap = strainCapacity(e);
  const open = (ui.expandedEnhancements || new Set()).has(e.id);
  const draftName = (ui.enhancementDraft && ui.enhancementDraft[e.id]) || '';
  const chips = items.map((c) => `
    <span class="chip sm enhancement-chip ${isOverStrained(e) ? 'over-strain' : ''}" title="${esc(c.notes)}">${esc(c.name)} <small>(${esc(c.type || 'cybernetics')} · ${c.strain})</small> <button type="button" class="icon-btn" data-enhancement-remove="${esc(e.id)}::${esc(c.id)}" title="Remove">✕</button></span>`).join('');
  return `
    <div class="enhancements-card">
      <h4>
        <button class="section-toggle" data-enhancements-toggle="${esc(e.id)}">${open ? '▾' : '▸'} Enhancements (${items.length})</button>
        <button class="icon-btn" data-roll-into-enhancement="${esc(e.id)}" title="Roll a Cyberware Concept into the name field below">🎲</button>
      </h4>
      ${open ? `
      ${strainMeter(used, cap, isOverStrained(e))}
      <div class="enhancement-list">${chips || '<span class="dim small">None installed.</span>'}</div>
      <div class="enhancement-add">
        <input data-enhancement-name-input="${esc(e.id)}" placeholder="Enhancement name" value="${esc(draftName)}">
        <select data-enhancement-type-input="${esc(e.id)}">${ENHANCEMENT_TYPES.map((t) => `<option value="${t.id}">${esc(t.label)}</option>`).join('')}</select>
        ${numStepper(`<input type="number" min="0" data-enhancement-strain-input="${esc(e.id)}" placeholder="Strain" value="1">`)}
        <button class="btn sm" data-enhancement-install="${esc(e.id)}">＋ Install</button>
      </div>` : ''}
    </div>`;
}

// An entity's Gallery thumbnail (Phase 11, docs/adr/0021-gallery.md) —
// left-aligned beside Type/Tags, per the request. Resolves e.thumbnailId
// through the Gallery (never stores image data on the entity itself, the
// same "reference by id" shape Colony's crew roster already uses); no
// thumbnail yet shows a small upload button instead (a hidden file input,
// same shape Documents' own "Upload file(s)" control already uses).
function entityPhotoHtml(doc, e) {
  const img = e.thumbnailId ? getGalleryImage(doc, e.thumbnailId) : null;
  if (img) {
    // Direct follow-up request: clicking the thumbnail shows the full-size
    // image. data-open-image-lightbox carries no value — shell.js reads the
    // src/alt straight off the clicked <img> itself (it's already inline in
    // the DOM as a data: URL) rather than duplicating potentially-large
    // image data into a second attribute.
    // Direct follow-up request: the old "Replace" text button is a bare
    // pencil icon (✎, the same glyph every other rename/edit control in
    // this app uses) — moved off the thumbnail into normal flow at one
    // point, then a LATER direct follow-up put it back as an overlay
    // badge at the thumbnail's own 5-o'clock position (see .photo-edit-btn
    // in cockpit.css for the exact placement math).
    return `<div class="inspector-photo">
      <div class="inspector-photo-edit-overlay">
        <button type="button" class="gallery-thumb-circle-btn" title="View full size">
          <img class="gallery-thumb-circle" data-open-image-lightbox src="${esc(img.dataUrl)}" alt="${esc(e.name || 'Entity')} thumbnail">
        </button>
        <label class="icon-btn photo-edit-btn file-btn" title="Replace photo">✎<input type="file" accept="image/*" data-entity-photo-upload="${esc(e.id)}" hidden></label>
      </div>
    </div>`;
  }
  // Unassigned still reserves the same reduced column width (.inspector-photo
  // CSS) as the assigned state above, via a dashed placeholder box —
  // previously this was just a small floating button with no reserved
  // space, which made the layout jump once a photo was added.
  return `<div class="inspector-photo">
    <label class="inspector-photo-empty file-btn">＋ Photo<input type="file" accept="image/*" data-entity-photo-upload="${esc(e.id)}" hidden></label>
  </div>`;
}

// Tags as removable chips + a single auto-committing input (Phase 7's "tag
// fields as dropdowns", unified 2026-07-04 with the Documents drawer's tag
// UX — that one input+datalist pattern is now the one tag-entry design used
// everywhere: picking a suggestion from the datalist or typing a new one and
// tabbing/Enter-ing away both commit immediately, no separate "+ Add"/"+
// New…" click required). The datalist is scoped to this entity's own type
// (listTagVocabulary reads it live off existing entities of that type, not
// a separately-stored list) — a freeform tag typed for the first time joins
// that vocabulary for next time.
// Direct follow-up request: Tags moved onto the SAME row as Type instead of
// stacking below it (tagEditorHead, beside Type's own <select> — see
// inspector()'s .inspector-type-tags-row), with the chosen-tags chip list
// now a collapsible block on the row below (tagEditorList), toggled by
// clicking the "Tags" label itself — split into two functions so the
// caller can place the head inline with Type while the list still spans
// the full .inspector-photo-fields width underneath. Defaults expanded
// (ui.collapsedEntityTags tracks entities explicitly collapsed, inverse-
// tracked the same way Overview's own collapse state already is).
// Direct follow-up request: "the tag field needs a dropdown listing the
// protected and entity-specific options for consistency" — a real
// <select> alongside the existing free-text input, same "blank
// placeholder option, immediately commits on change, resets to blank
// afterward" convention worldDemographicsSection's own "— add a base —"/
// "— add a trade code —" selects already use (data-entity-base-add/
// data-entity-tradecode-add, shell.js) — not a NEW pattern, the SAME one
// applied here for consistency, per the request's own wording. Lists the
// exact same vocabulary the datalist already offers (protected tags,
// this entity type's genre-specific seeds, AND every tag already used on
// another entity of this type — listTagVocabulary's own existing
// "own tags excluded" rule means an entity never sees a tag it already
// has in either control) — a datalist's own browser-native affordance
// (type to filter, or click the arrow on desktop) stays for typing a
// brand-new custom tag; the <select> is the reliable, always-fully-
// visible-on-click alternative for picking a KNOWN one, since datalist
// support/behavior is inconsistent across browsers and especially mobile.
// Protected tags (isProtectedEntityTag, below) get a 🔒 prefix in the
// dropdown's own display label only — the committed value (shell.js's
// data-entity-tag-select handler) is always the clean tag text.
function tagEditorHead(doc, e, ui) {
  const expanded = !((ui.collapsedEntityTags || new Set()).has(e.id));
  const vocab = listTagVocabulary(doc, e.type, e.id);
  const selectOptions = vocab.map((t) => `<option value="${esc(t)}">${isProtectedEntityTag(t) ? '🔒 ' : ''}${esc(t)}</option>`).join('');
  return `
    <div class="tag-editor-head">
      <button type="button" class="field-label-static tag-editor-toggle" data-entity-tags-toggle="${esc(e.id)}" title="${expanded ? 'Hide' : 'Show'} tags">${expanded ? '▾' : '▸'} Tags</button>
      <span class="tag-editor-add-row">
        <select class="tag-editor-select" data-entity-tag-select="${esc(e.id)}" title="Pick a protected or suggested tag">
          <option value="" selected disabled>+ Add tag…</option>
          ${selectOptions}
        </select>
        <input class="doc-tag-input" data-entity-tag-input list="entity-tag-list" placeholder="or type a custom tag…">
        <datalist id="entity-tag-list">${vocab.map((t) => `<option value="${esc(t)}">`).join('')}</datalist>
      </span>
    </div>`;
}
// Direct follow-up request: "for tags that are protected, like character,
// add a lock icon and prompt user if it is removed from the entity" —
// mechanically special tags this app's own domain logic keys off of by
// exact string (party.js's #character, similar to #vehicle/#starship
// elsewhere), where removing it has a real consequence beyond just
// dropping a label. Case-insensitive, matching every other tag comparison
// in this app. A LATER direct follow-up ("When creating a new encounter as
// a conflict entity, add the type of encounter as a non-editable,
// protected tag") extended this to every Hexcrawl Encounter label too
// (Monster Lair, Bandits / Raiders, ...) — checked dynamically against
// HEXCRAWL_THREAT_ICONS rather than duplicated into the fixed list, so a
// future catalog addition is automatically protected too. Exported so
// shell.js's tag-remove handler can gate its own confirm the same way.
// 'world' (direct follow-up request) is the newest addition — same
// "removing it has a real consequence" rationale: it's what shows a
// Location's World Profile (UWP)/World Demographics cards at all (see
// isLocationWorldTagged below), not just a descriptive flavor tag.
const PROTECTED_ENTITY_TAGS = ['character', 'world'];
export function isProtectedEntityTag(tag) {
  const clean = String(tag || '').toLowerCase();
  if (PROTECTED_ENTITY_TAGS.includes(clean)) return true;
  return HEXCRAWL_THREAT_ICONS.some((i) => i.label.toLowerCase() === clean);
}

function tagEditorList(doc, e, ui) {
  const expanded = !((ui.collapsedEntityTags || new Set()).has(e.id));
  if (!expanded) return '';
  const tags = e.tags || [];
  const chips = tags.map((t) => {
    const protectedTag = isProtectedEntityTag(t);
    return `
    <span class="tag-chip ${protectedTag ? 'tag-chip-protected' : ''}">
      ${protectedTag ? '<span class="tag-chip-lock" title="Protected — removing this asks first">🔒</span>' : ''}
      <button type="button" class="tag-chip-jump" data-entity-tag-jump="${esc(t)}" title="Filter Cast by #${esc(t)}">${esc(t)}</button>
      <button class="icon-btn" data-entity-tag-remove="${esc(t)}" title="Remove tag">✕</button>
    </span>`;
  }).join('');
  return `<div class="tag-chips">${chips || '<span class="dim small">None yet.</span>'}</div>`;
}

// An entity's statblocks are an ARRAY of groups (entity.statblocks) — several
// can coexist (e.g. both a Starforged and a 5PFH character sheet), each
// rendered as its own row, sorted per sortStatblockGroups (Settings' system
// registration order). Adding a group is additive (statblockAddChoices);
// removing one is a single explicit action per group — there is no
// "toggle/switch" that replaces one group's data with another's.
//
// "+ Field"/"+ Track" (one picker per existing group, so the GM chooses
// which group to extend) and the whole Enhancements section now live here
// too, consolidated under this one gear-icon toggle (direct request) —
// previously +Field/+Track sat always-visible under every single group
// card, and Enhancements was its own always-visible section regardless of
// this toggle's state; both are secondary/setup actions a GM reaches for
// far less often than just reading or rolling a field, so they're tucked
// behind "Add a Statblock or Attribute" (collapsed by default,
// ui.statblockAddOpen) alongside the existing "add a whole new statblock
// group" chips, instead of competing for attention with the fields
// themselves.
// Direct follow-up request: "move character sheet section right below the
// thumbnail and above 'Revealed / hidden (GM)'" — renders just the
// Character Sheet group(s) (kind: 'character'; there's normally at most
// one, but this handles more than one the same defensive way every other
// sortStatblockGroups-based function here does), reusing statblockGroupBlock
// (which already dispatches kind:'character' to characterSheetGroupBlock)
// so there's exactly one place that knows how to render a Character Sheet
// card, just two call sites now instead of one.
function characterSheetSectionHtml(e, doc, ui = {}, opts = {}) {
  const sorted = sortStatblockGroups(e.statblocks || [], doc.settings);
  // group.archived (direct follow-up request — removing the protected
  // "character" tag archives rather than deletes its Character Sheet)
  // hides it from view here; re-adding the tag (shell.js) clears the flag.
  return sorted.filter(({ group }) => group.kind === 'character' && !group.archived)
    .map(({ group, index }) => statblockGroupBlock(e, group, index, doc, ui, opts)).join('');
}

// Direct follow-up request: "any statblocks that are selected must be
// added under the last statblock added under thumbnail" — every OTHER
// statblock group (Bestiary/Vehicle/Gear; anything sortStatblockGroups
// doesn't rank as 'character') now renders immediately after
// characterSheetSectionHtml (inspector()'s own return), right under the
// thumbnail alongside Character Sheet, instead of much further down past
// Faction/Conflict/World Profile/etc. — a newly-added group lands right
// there too, since this reads the live entity.statblocks on every render.
function nonCharacterStatblockCardsHtml(e, doc, ui = {}, opts = {}) {
  const sorted = sortStatblockGroups(e.statblocks || [], doc.settings);
  // group.archived (direct follow-up request: "Don't allow both a
  // bestiary and a character sheet at the same time... swap... if the
  // Character tag is added/removed") — same hide-don't-delete filter
  // characterSheetSectionHtml's own !group.archived already uses, now
  // symmetric: a Bestiary ('npc') group gets archived while #character
  // is active, so it stays out of view here until the tag is removed and
  // ensureAutoStatblock swaps it back. Vehicle/Gear groups never carry
  // this flag at all, so they're unaffected either way.
  return sorted.filter(({ group }) => group.kind !== 'character' && !group.archived)
    .map(({ group, index }) => statblockGroupBlock(e, group, index, doc, ui, opts)).join('');
}

// Statblocks kept but inactive (archived) by the Bestiary <-> Character
// swap (ensureAutoStatblock): an edited Bestiary on an NPC that became a
// Character, or a Character Sheet on one that stopped being one. Listed
// here rather than hidden, each with the usual remove control, so every
// statblock an entity holds is visible and removable.
function inactiveStatblocksHtml(e, doc) {
  const sorted = sortStatblockGroups(e.statblocks || [], doc.settings).filter(({ group }) => group.archived);
  if (!sorted.length) return '';
  const rows = sorted.map(({ group, index }) => {
    const why = group.kind === 'character'
      ? 'Kept from when this was a Party Character — re-add the character tag to use it again.'
      : 'Kept from before this NPC became a Character, because it has your edits. A Character doesn\'t use a ' + bestiaryTerm(doc.settings.genrePack) + ' statblock.';
    return '<div class="statblock-inactive-row"><span><b>' + statblockGroupLabel(group, doc) + '</b> <span class="chip sm">inactive</span><br><span class="dim small">' + esc(why) + '</span></span>'
      + '<button class="icon-btn" data-statblock-remove-group="' + index + '" title="Remove this statblock">🗑</button></div>';
  }).join('');
  return '<div class="statblock-inactive"><h4 class="dim small">Inactive statblocks</h4>' + rows + '</div>';
}

// The "+Field"/"+Track" (one picker per existing group), "+ Add a whole
// new statblock group" chips, and Enhancements — direct follow-up request
// moved these out from directly under the statblock cards (which moved up
// near the thumbnail — see nonCharacterStatblockCardsHtml above) and into
// the Configuration section (entityConfigurationSectionHtml, below)
// alongside Type/Tags, consolidated under ONE collapsed-by-default header
// instead of two.
function statblockAddControlsHtml(e, doc, ui = {}) {
  const groups = e.statblocks || [];
  const sorted = sortStatblockGroups(groups, doc.settings);
  const addChoices = statblockAddChoices(e, groups, doc);
  // Direct follow-up request (Bestiary/Character swap): an archived group
  // isn't shown as a card at all (nonCharacterStatblockCardsHtml/
  // characterSheetSectionHtml's own !archived filters) — offering to add
  // a Field/Track to it here, where the GM can't even see its current
  // fields, would be confusing.
  const fieldAddRows = sorted.filter(({ group }) => !group.archived).map(({ group, index }) => `
    <div class="statblock-add-row">
      <span class="dim small">${statblockGroupLabel(group, doc)}</span>
      <button class="chip" data-statblock-add-field="${index}">＋ Field</button>
      <button class="chip" data-statblock-add-track-field="${index}">＋ Track</button>
    </div>`).join('');
  const enhancements = enhancementsSection(e, ui);
  const open = !!ui.statblockAddOpen;
  if (!(addChoices || fieldAddRows || enhancements)) return '';
  return `<div class="statblock-add-toggle-row">
      <button class="icon-btn" data-statblock-add-toggle title="${open ? 'Hide statblock options' : 'Add a Statblock or Attribute'}">⚙</button>
      <span class="dim small">Add a Statblock or Attribute</span>
    </div>
    ${open ? `${fieldAddRows}${addChoices}${enhancements}` : ''}`;
}

// Shared by statblockGroupBlock/characterSheetGroupBlock's own headers AND
// the consolidated "+ Field"/"+ Track" picker under Add a Statblock or
// Attribute (statblockSection, below) — one label-computing place instead
// of three copies drifting apart.
function statblockGroupLabel(group, doc) {
  if (group.kind === 'character') return `Character Sheet · ${esc(findRuleset(group.ruleset).label)}`;
  if (group.kind === 'vehicle') return 'Vehicle Statblock';
  if (group.kind === 'gear') return `Gear Stats · ${esc(findGearTemplate(group.ruleset).label)}`;
  // Bestiary (or LifeForm, genre-dependent — see bestiaryTerm) is a subtype
  // of NPC (like Character) internally (group.kind stays the literal string
  // 'npc' — statblocks.js/this file's own presentTemplates check rely on
  // that exact value) but reads oddly labeled "(NPC)" to a GM looking at a
  // monster's stat block — direct follow-up request changed the DISPLAYED
  // suffix to "(Creature)", then (another direct follow-up, matching
  // entityTypeLabel's own Fantasy-genre "Bestiary" entity-type rename) to
  // "(Bestiary)". Only appended when it would say something the term
  // itself doesn't already — bestiaryTerm returns literally "Bestiary" for
  // the Fantasy/D&D 5e genre packs, so appending "(Bestiary)" there too
  // would read as "Bestiary (Bestiary)"; Sci-Fi/Cyberpunk's own "LifeForm"
  // term still gets the qualifier, since "LifeForm (Bestiary)" says
  // something new.
  const term = bestiaryTerm(doc.settings.genrePack);
  const suffix = term === 'Bestiary' ? '' : ' (Bestiary)';
  return `${term}${suffix} · ${esc(templateLabel(group.templateId, doc.settings))}`;
}

function statblockGroupBlock(e, group, gi, doc, ui = {}, opts = {}) {
  if (group.kind === 'character') return characterSheetGroupBlock(e, group, gi, doc, ui, opts);
  if (group.templateId === 'fiveleagues-lifeform') return fiveLeaguesEnemyStatblockHtml(e, group, gi, doc, ui, opts);
  const key = `${e.id}::${gi}`;
  // Direct follow-up request: "Default the character sheet section to be
  // open, but all other sections to be collapsed when the entity record is
  // opened" — collapsed BY DEFAULT now (inverted from the open-by-default
  // this used to share with characterSheetGroupBlock's own identical
  // formula just below); membership in the SAME ui.collapsedStatblockGroups
  // Set/toggle mechanism now reads as "explicitly expanded" for a
  // Bestiary/Vehicle/Gear group instead of "explicitly collapsed" —
  // data-statblock-group-toggle's click handler (shell.js) is a plain
  // has/delete/add toggle either way, so this flip needs no handler change.
  const collapsed = !(ui.collapsedStatblockGroups && ui.collapsedStatblockGroups.has(key));
  // Direct follow-up request: "the 'LifeForm (NPC) · Starforged' statblock
  // should put the editable stat field pill on the top row like other
  // statblocks" — attribute-kind fields (a Bestiary template's rollable
  // modifiers, e.g. Combat/Danger) get their own compact top row, same
  // split characterSheetGroupBlock uses. Split on f.attribute directly (not
  // f.group === 'stat', characterSheetGroupBlock's own split key) since
  // that field-level marker is a character-sheet-template-only concept —
  // a Bestiary field never carries it — while f.attribute is universal
  // (statblockFieldRow's own dispatch key). Direct follow-up request ("all
  // statblocks should be viewable at one time within the panel"): every
  // remaining field (track or plain text) is ALSO rendered compact now,
  // wrapped in the same .character-sheet-resources flex-wrap row the stats
  // row uses — content-sized pills (attrRow/trackRow/textRow's own compact
  // CSS) packed side by side instead of one full-width row per field. Still
  // fully editable either way — opts.compact only changes CSS sizing, never
  // removes the live input.
  const indexed = group.fields.map((f, fi) => ({ f, fi }));
  const stats = indexed.filter(({ f }) => f.attribute);
  // Direct follow-up request: "make Armor/Notes and Special fields share
  // the width of the row 50/50" — the Planetfall Lifeform template's own
  // two free-text fields (statblockTemplates.js) get a dedicated half-and-
  // half row instead of flowing as auto-width pills alongside Toughness in
  // the general .character-sheet-resources wrap; only when BOTH are
  // actually present (a GM who's removed one via Settings' template
  // editor falls back to the normal flow rather than a single lonely
  // half-width box).
  const HALF_ROW_KEYS = ['Armor / Notes', 'Special'];
  const halfRowFields = indexed.filter(({ f }) => !f.attribute && HALF_ROW_KEYS.includes(f.key));
  const usesHalfRow = halfRowFields.length === HALF_ROW_KEYS.length;
  const rest = indexed.filter(({ f }) => !f.attribute && !(usesHalfRow && HALF_ROW_KEYS.includes(f.key)));
  return `<div class="statblock-block">
    <div class="statblock-head">
      <button class="icon-btn statblock-collapse-toggle" data-statblock-group-toggle="${key}" title="${collapsed ? 'Expand' : 'Collapse'}">${collapsed ? '▸' : '▾'}</button>
      <h4>${statblockGroupLabel(group, doc)}</h4>
      ${statblockMoveButtonsHtml(gi)}
      <button class="icon-btn" data-statblock-remove-group="${gi}" title="Remove this statblock">🗑</button>
    </div>
    ${collapsed ? '' : `
    ${stats.length ? `<div class="character-sheet-stats">${stats.map(({ f, fi }) => statblockFieldRow(f, gi, fi, { ...opts, compact: true })).join('')}</div>` : ''}
    ${rest.length ? `<div class="character-sheet-resources">${rest.map(({ f, fi }) => statblockFieldRow(f, gi, fi, { ...opts, compact: true })).join('')}</div>` : ''}
    ${usesHalfRow ? `<div class="statblock-half-row">${halfRowFields.map(({ f, fi }) => statblockFieldRow(f, gi, fi, { ...opts, compact: true })).join('')}</div>` : ''}`}
  </div>`;
}

// Direct follow-up request: "update the bestiary 5lfb statblock to
// rename 'combat skill' to 'combat' and 'toughness' to 'tough' and
// convert to same '+1' format as 'tough' on character sheet for 5lfb,
// and format 'damage' use a '+0/+0' format... those fields must be
// narrow to fit on one row in this sequence: Speed, Combat, Damage,
// Tough, and Armor. The[n] show Num as a number field with the +/-
// format followed by the 'Ranged' field the width of the rest of the
// panel. Below that, include the Traits or Aber[r]ant [Aberration]
// Traits as separate lines where the title is in bold just like in the
// rulebook... With each trait, make it a tooltip link to show the
// definition of the trait. Put the description in the Overview field.
// If the entity is an 'Aber[r]ation' put a small subtitle under the name
// stating 'Aberration' and only then include the MP and Reward Rating
// fields." A bespoke renderer for the 'fiveleagues-lifeform' Bestiary
// template specifically (statblockGroupBlock's own dispatch above),
// rather than extending the generic one — this template's own real-
// rulebook column layout (p.152) doesn't fit the generic attribute-row/
// resource-row split at all.
//
// Every field below is looked up BY NAME via statblockFieldByKey, trying
// the new short key first and falling back to the original long one —
// this app's ~121-entity core/Compendium Bestiary content packs (already
// imported into real campaigns) were built under the ORIGINAL key names
// ('Combat Skill', 'Toughness', 'Num.') and are never retroactively
// renamed (this app's own "migration never drops data" rule, and
// renaming a template never touches an already-created entity's own
// field array anyway) — both old and newly-created entities render
// identically here. The single-number pills (Tough/Num) read/write the
// field's raw `value` directly through the SAME generic attribute-value
// setter attrRow already uses (data-statblock-attr-val), regardless of
// whether that field's own stored `kind` happens to be 'attribute' (new)
// or 'track'/'text' (old) — this bespoke view never delegates to
// attrRow/trackRow/textRow's own kind-dispatch, so the stored kind simply
// doesn't matter to it.
function statblockFieldByKey(group, ...keys) {
  const fields = group.fields || [];
  for (const key of keys) {
    const idx = fields.findIndex((f) => String(f.key || '').toLowerCase() === key.toLowerCase());
    if (idx !== -1) return { f: fields[idx], fi: idx };
  }
  return null;
}

// True once the entity has ANY 'fiveleagues-lifeform' Bestiary group
// whose MP field has a non-zero max — the real rulebook's own Aberration
// Table entries are exactly the subset of this template that was ever
// given a real Monster Points pool at all (p.182-186); an ordinary Enemy
// Table creature's MP field stays at its template default (max: 0). No
// separate "is this an Aberration" tag/flag needed — this is already a
// stable, content-driven signal that works for every already-imported
// entity without any migration.
function isFiveLeaguesAberrationEntity(e) {
  const groups = (e && e.statblocks) || [];
  return groups.some((g) => {
    if (g.templateId !== 'fiveleagues-lifeform') return false;
    const mp = statblockFieldByKey(g, 'MP');
    return !!(mp && Number(mp.f.max) > 0);
  });
}

// A plain signed-number pill (e.g. "+3"), independent of the field's own
// stored `kind` — see this section's own doc comment above.
function fiveLeaguesEnemySignedPillHtml(label, found, gi, opts) {
  if (!found) return '';
  const { f, fi } = found;
  const key = opts.entityId ? `${opts.entityId}::${gi}::${fi}` : `${gi}::${fi}`;
  const value = Number(f.value) || 0;
  return `<div class="statblock-row attr-row attr-row-compact">
    <span class="statblock-key" title="Not rollable">${esc(label)}</span>
    <input type="text" inputmode="numeric" class="attr-val-input" data-statblock-attr-val="${key}" value="${esc(formatAttrValue(value, 'sign'))}" aria-label="${esc(label)} value">
  </div>`;
}

// Direct follow-up request: "format 'damage' use a '+0/+0' format using
// two numbers with appended '+' and '/' separator to look the same as
// the handbook" — two small number inputs (Overcome Armor / Overcome
// Toughness, p.43) that combine into that exact real string on edit
// (shell.js's own data-fiveleagues-enemy-damage-part change handler),
// written back through the plain generic value setter every text field
// already uses (data-statblock-val) — the field itself stays `kind:
// 'text'` in storage the whole time, same free-text shape a Weapon row's
// own `damage` column already uses, just edited through two separate
// boxes instead of one.
function fiveLeaguesEnemyDamagePillHtml(found, gi, opts) {
  if (!found) return '';
  const { f, fi } = found;
  const key = opts.entityId ? `${opts.entityId}::${gi}::${fi}` : `${gi}::${fi}`;
  const { overcomeArmor, overcomeToughness } = parseFiveLeaguesWeaponDamage(f.value);
  return `<div class="statblock-row attr-row attr-row-compact fiveleagues-enemy-damage">
    <span class="statblock-key">Damage</span>
    <span class="fiveleagues-enemy-damage-inputs" data-fiveleagues-enemy-damage-key="${key}">
      <input type="number" class="attr-val-input" data-fiveleagues-enemy-damage-part="armor" value="${overcomeArmor}" title="Overcome Armor" aria-label="Damage, Overcome Armor">
      <span class="fiveleagues-enemy-damage-sep">/</span>
      <input type="number" class="attr-val-input" data-fiveleagues-enemy-damage-part="toughness" value="${overcomeToughness}" title="Overcome Toughness" aria-label="Damage, Overcome Toughness">
    </span>
  </div>`;
}

// A full-width free-text field (Ranged) — same markup/binding as
// textRow's own non-compact shape, just inlined here since this bespoke
// layout needs it to flex-grow alongside the narrow Num pill on the same
// row rather than stack as its own full block.
function fiveLeaguesEnemyWideTextFieldHtml(label, found, gi, opts) {
  if (!found) return '';
  const { f, fi } = found;
  const key = opts.entityId ? `${opts.entityId}::${gi}::${fi}` : `${gi}::${fi}`;
  return `<div class="statblock-row text-row fiveleagues-enemy-wide-field">
    <span class="statblock-key">${esc(label)}</span>
    <input class="statblock-val" data-statblock-val="${key}" value="${esc(f.value)}" placeholder="${esc(label)}">
  </div>`;
}

function fiveLeaguesEnemyStatblockHtml(e, group, gi, doc, ui = {}, opts = {}) {
  const key = `${e.id}::${gi}`;
  const collapsed = !(ui.collapsedStatblockGroups && ui.collapsedStatblockGroups.has(key));
  const speed = statblockFieldByKey(group, 'Speed');
  const combat = statblockFieldByKey(group, 'Combat', 'Combat Skill');
  const damage = statblockFieldByKey(group, 'Damage');
  const tough = statblockFieldByKey(group, 'Tough', 'Toughness');
  const armor = statblockFieldByKey(group, 'Armor');
  const num = statblockFieldByKey(group, 'Num', 'Num.');
  const ranged = statblockFieldByKey(group, 'Ranged');
  const mp = statblockFieldByKey(group, 'MP');
  const rewardRating = statblockFieldByKey(group, 'Reward Rating');
  const traits = statblockFieldByKey(group, 'Traits');
  const isAberration = !!(mp && Number(mp.f.max) > 0);
  // Direct follow-up request: "include the Traits or Aberrant [Aberration]
  // Traits as separate lines where the title is in bold just like in the
  // rulebook... make it a tooltip link to show the definition of the
  // trait" — the field itself stays one free-text, comma-separated
  // string to type into (matching the book's own "Traits: X, Y, Z" stat-
  // block convention), rendered as a read-only preview of bold-titled
  // lines below the input; findFiveLeaguesEnemyTrait searches BOTH the
  // Universal Enemy Traits and Aberration Traits catalogs together, so
  // nothing here needs to branch on isAberration — an unrecognized name
  // (a homebrew trait, a typo, a Compendium-only one this app doesn't
  // catalog) still renders as a plain bold line with no tooltip.
  const traitNames = traits ? String(traits.f.value || '').split(',').map((s) => s.trim()).filter(Boolean) : [];
  const traitsListHtml = traitNames.length ? `<div class="fiveleagues-enemy-traits-list">
    ${traitNames.map((name) => {
      const def = findFiveLeaguesEnemyTrait(name);
      return `<p class="fiveleagues-enemy-trait-line"><b class="fiveleagues-enemy-trait-name" ${def ? `title="${esc(def.text)}"` : ''}>${esc(name)}</b></p>`;
    }).join('')}
  </div>` : '';
  return `<div class="statblock-block fiveleagues-enemy-block">
    <div class="statblock-head">
      <button class="icon-btn statblock-collapse-toggle" data-statblock-group-toggle="${key}" title="${collapsed ? 'Expand' : 'Collapse'}">${collapsed ? '▸' : '▾'}</button>
      <h4>${statblockGroupLabel(group, doc)}</h4>
      ${statblockMoveButtonsHtml(gi)}
      <button class="icon-btn" data-statblock-remove-group="${gi}" title="Remove this statblock">🗑</button>
    </div>
    ${collapsed ? '' : `
    <div class="character-sheet-stats">
      ${fiveLeaguesEnemyAttrPillHtml(speed, gi, opts)}
      ${fiveLeaguesEnemySignedPillHtml('Combat', combat, gi, opts)}
      ${fiveLeaguesEnemyDamagePillHtml(damage, gi, opts)}
      ${fiveLeaguesEnemySignedPillHtml('Tough', tough, gi, opts)}
      ${fiveLeaguesEnemyAttrPillHtml(armor, gi, opts)}
    </div>
    <div class="fiveleagues-enemy-num-ranged-row">
      ${fiveLeaguesEnemySignedPillHtml('Num', num, gi, opts)}
      ${fiveLeaguesEnemyWideTextFieldHtml('Ranged', ranged, gi, opts)}
    </div>
    ${isAberration ? `<div class="character-sheet-resources fiveleagues-enemy-aberration-stats">
      ${mp ? statblockFieldRow(mp.f, gi, mp.fi, { ...opts, compact: true }) : ''}
      ${rewardRating ? statblockFieldRow(rewardRating.f, gi, rewardRating.fi, { ...opts, compact: true }) : ''}
    </div>` : ''}
    <div class="fiveleagues-enemy-traits">
      <label class="field-label">Traits
        ${traits ? `<input class="statblock-val" data-statblock-val="${opts.entityId ? `${opts.entityId}::` : ''}${gi}::${traits.fi}" value="${esc(traits.f.value)}" placeholder="Comma-separated, e.g. Undead, Counter Attack">` : ''}
      </label>
      ${traitsListHtml}
    </div>`}
  </div>`;
}
// Calls the SAME attrRow() the Character Sheet's own compact stat row
// uses, directly — Speed/Armor/MP are already `kind:'attribute'` in both
// old and new data (this template's own 'Speed'/'Armor' keys were never
// renamed), so there's no reason to duplicate that rendering here; a
// thin null-guard wrapper since a GM-customized template (Settings) could
// have removed one of these fields entirely.
function fiveLeaguesEnemyAttrPillHtml(found, gi, opts) {
  if (!found) return '';
  return attrRow(found.f, gi, found.fi, { ...opts, compact: true });
}

function templateLabel(templateId, settings) {
  const found = listTemplates(settings).find((t) => t.id === templateId);
  return found ? found.label : templateId;
}

// The "+ Add" row at the bottom of the statblocks section — offers whatever
// character-sheet rulesets / Bestiary templates / vehicle stats aren't
// already present as a group, so adding one is always additive, never a
// replace/toggle. Character Sheet and Bestiary are both NPC subtypes (an
// NPC either plays as a full PC-style character or as a Bestiary creature —
// or both at once); Vehicle Stats is an Asset subtype. Lifeform (direct
// follow-up request adding it as a peer entity type) gets the exact same
// options an NPC does — structurally it's a creature/beast, same shape a
// Bestiary template already covers, just not filed under "Non-Player
// Character." Other entity types (Faction, Location, Lore, Conflict) get
// no statblock options — they aren't statblocked concepts.
function statblockAddChoices(e, groups, doc) {
  const isNpcLike = e.type === 'npc' || e.type === 'lifeform';
  if (!isNpcLike && e.type !== 'asset' && e.type !== 'item') return '';
  const presentRulesets = new Set(groups.filter((g) => g.kind === 'character').map((g) => g.ruleset));
  const presentTemplates = new Set(groups.filter((g) => g.kind === 'npc').map((g) => g.templateId));
  const presentGearSystems = new Set(groups.filter((g) => g.kind === 'gear').map((g) => g.ruleset));
  const hasVehicle = groups.some((g) => g.kind === 'vehicle');

  const charChips = isNpcLike ? RULESETS.filter((r) => !presentRulesets.has(r.id))
    .map((r) => `<button class="chip" data-statblock-add="character" data-statblock-ruleset="${esc(r.id)}">＋ Character Sheet (${esc(r.label)})</button>`).join('') : '';
  const bestiaryChips = isNpcLike ? listTemplates(doc.settings).filter((t) => t.id !== 'vehicle' && !presentTemplates.has(t.id))
    .map((t) => `<button class="chip" data-statblock-add="npc" data-statblock-template="${esc(t.id)}">＋ ${bestiaryTerm(doc.settings.genrePack)}: ${esc(t.label)}</button>`).join('') : '';
  const vehicleChip = e.type === 'asset' && !hasVehicle ? `<button class="chip" data-statblock-add="vehicle">＋ Vehicle Stats</button>` : '';
  // Gear groups (ADR 0012, Item entities) are discriminated by ruleset like
  // Character sheets — offer whichever systems aren't already present, so
  // an item can carry Starforged AND 5PFH AND Traveller stats at once.
  const gearChips = e.type === 'item' ? GEAR_TEMPLATE_SYSTEMS.filter((id) => !presentGearSystems.has(id))
    .map((id) => `<button class="chip" data-statblock-add="gear" data-statblock-ruleset="${esc(id)}">＋ Gear Stats (${esc(findGearTemplate(id).label)})</button>`).join('') : '';

  const any = charChips || bestiaryChips || vehicleChip || gearChips;
  if (!any) return '';
  return `<div class="statblock-add-choices" style="margin-top: var(--sp-2);">${charChips}${bestiaryChips}${vehicleChip}${gearChips}</div>`;
}

// A character sheet groups the same field engine every other statblock uses
// into two sections — core stats up top (single-number +/- spinners,
// Starforged/5PFH-style) and resource meters below (Health, Spirit,
// Supply, ...) — purely a rendering split; stats are attribute fields,
// resources are track fields, both rollable the same way (double-click the
// value). Both rows render every field compact (direct follow-up request —
// "all statblocks should be viewable at one time within the panel"): a
// content-sized pill per field, wrapped so the whole sheet packs into view
// without a full-width row per field forcing a long scroll.
function characterSheetGroupBlock(e, group, gi, doc, ui = {}, opts = {}) {
  const key = `${e.id}::${gi}`;
  // Open by default (unlike the generic statblockGroupBlock's own,
  // now-inverted formula just above) — direct follow-up request: "Default
  // the character sheet section to be open, but all other sections to be
  // collapsed."
  const collapsed = !!(ui.collapsedStatblockGroups && ui.collapsedStatblockGroups.has(key));
  // Two linked direct follow-up requests: (1) "Remove the up/down arrows
  // for the character sheet if there is just one character sheet" —
  // reordering is only meaningful when there's a second VISIBLE Character
  // Sheet group to swap places with (an entity carrying two rulesets'
  // sheets at once, per CLAUDE.md's own documented case). (2) "Do not show
  // the name of the character sheet if the only character sheet" — the
  // "Character Sheet · {ruleset}" heading is only useful for telling
  // several of them apart; with just one, the Statblocks section's own
  // surrounding label already says what this card is. Both gated on the
  // SAME count, computed fresh off e.statblocks itself rather than
  // threaded through opts, so it can't drift out of sync with whatever
  // characterSheetSectionHtml actually renders.
  const characterSheetCount = (e.statblocks || []).filter((g) => g.kind === 'character' && !g.archived).length;
  const ruleset = findRuleset(group.ruleset);
  const indexed = group.fields.map((f, fi) => ({ f, fi }));
  // D&D 5e-style (direct request) — group.sections (set by makeStatblock
  // when the ruleset's own characterTemplate declares `sections`, see
  // data/rulesets.js) renders each as its own labeled, collapsible block
  // via the same partySectionHeaderHtml/isPartySectionCollapsed mechanism
  // the Campaign/Party panels and entity-editor sections already use —
  // real named groupings (Ability Scores/Saves/Skills/Combat/...) instead
  // of the old binary stat/resource split below, which every OTHER
  // ruleset (Starforged/5PFH/Traveller — no `sections` on their own
  // templates) still uses completely unchanged.
  const bodyHtml = Array.isArray(group.sections)
    ? group.sections.map((sec) => {
        const fields = indexed.filter(({ f }) => f.section === sec.id);
        if (!fields.length) return '';
        const sectionKey = `entityStatblockSection:${e.id}:${gi}:${sec.id}`;
        const sectionCollapsed = isPartySectionCollapsed(ui, sectionKey, false);
        return `
          ${partySectionHeaderHtml(sectionKey, sec.label, sectionCollapsed)}
          ${sectionCollapsed ? '' : `<div class="character-sheet-resources">${fields.map(({ f, fi }) => statblockFieldRow(f, gi, fi, { ...opts, compact: true, ruleset: group.ruleset })).join('')}</div>`}`;
      }).join('') + (group.ruleset === 'dnd5e' ? characterSheetAttacksHtml(group, gi) : '')
    : (() => {
        const stats = indexed.filter(({ f }) => f.group === 'stat');
        const resources = indexed.filter(({ f }) => f.group !== 'stat');
        return `
          ${stats.length ? `<div class="character-sheet-stats">${stats.map(({ f, fi }) => statblockFieldRow(f, gi, fi, { ...opts, compact: true, ruleset: group.ruleset })).join('')}</div>` : ''}
          ${resources.length ? `<div class="character-sheet-resources">${resources.map(({ f, fi }) => statblockFieldRow(f, gi, fi, { ...opts, compact: true, ruleset: group.ruleset })).join('')}</div>` : ''}
          ${['5pfh', 'fiveleagues'].includes(group.ruleset) ? characterSheetWeaponsAndGearHtml(group, gi) : ''}
          ${group.ruleset === 'fiveleagues' ? fiveLeaguesCharacterSheetExtrasHtml(e, group, gi, doc, ui) : ''}`;
      })();
  // D&D 5e PDF character-sheet import (direct request, phase 4) — only
  // offered on a dnd5e Character Sheet group; a real file input hidden
  // behind a plain button label, same "label wraps a hidden file input"
  // pattern every other file-upload control in this app already uses
  // (e.g. Settings' own "Import Campaign JSON").
  const pdfImportBtn = group.ruleset === 'dnd5e'
    ? `<label class="btn ghost sm file-btn" title="Import a D&D Beyond character sheet PDF export">Import from PDF<input type="file" accept=".pdf,application/pdf" data-dnd5e-import-pdf="${gi}" hidden></label>`
    : '';
  return `<div class="statblock-block character-sheet" data-statblock-group="${gi}">
    <div class="statblock-head">
      <button class="icon-btn statblock-collapse-toggle" data-statblock-group-toggle="${key}" title="${collapsed ? 'Expand' : 'Collapse'}">${collapsed ? '▸' : '▾'}</button>
      ${characterSheetCount > 1 ? `<h4>Character Sheet · ${esc(ruleset.label)}</h4>` : ''}
      ${pdfImportBtn}
      ${characterSheetCount > 1 ? statblockMoveButtonsHtml(gi) : ''}
      <button class="icon-btn" data-statblock-remove-group="${gi}" title="Remove this statblock">🗑</button>
    </div>
    ${collapsed ? '' : bodyHtml}
  </div>`;
}

// Direct follow-up request: "Add an up & down arrow to the left of the
// delete icon for each statblock so it can be reordered" — shared by both
// statblockGroupBlock and characterSheetGroupBlock's own headers, same
// "one place instead of two copies drifting apart" posture as
// statblockGroupLabel just above. data-statblock-move-group carries
// "gi::direction"; moveEntityStatblockGroup (shell.js/domain/entities.js)
// is a bounds-checked no-op past either end of the array, so no disabled
// state is needed here — clicking past an end simply does nothing.
function statblockMoveButtonsHtml(gi) {
  return `<span class="statblock-move-buttons">
    <button class="icon-btn" data-statblock-move-group="${gi}::up" title="Move up">▲</button>
    <button class="icon-btn" data-statblock-move-group="${gi}::down" title="Move down">▼</button>
  </span>`;
}

// D&D 5e's own Attacks table (direct request) — same real-<table> pattern
// as 5PFH's characterSheetWeaponsAndGearHtml just above, addressed by
// plain array index (attackIndex), just its own column set (Name/Hit/
// Damage/Notes rather than Weapon/Range/Shots/Damage/Traits).
function characterSheetAttacksHtml(group, gi) {
  const attacks = group.attacks || [];
  const attackRows = attacks.map((a, ai) => `
    <tr>
      <td><input type="text" data-statblock-attack-field="${gi}::${ai}::name" value="${esc(a.name)}" placeholder="Attack"></td>
      <td><input type="text" data-statblock-attack-field="${gi}::${ai}::hit" value="${esc(a.hit)}" placeholder="+5"></td>
      <td><input type="text" data-statblock-attack-field="${gi}::${ai}::damage" value="${esc(a.damage)}" placeholder="1d8+3 Slashing"></td>
      <td><input type="text" data-statblock-attack-field="${gi}::${ai}::notes" value="${esc(a.notes)}" placeholder="Notes"></td>
      <td class="statblock-weapon-remove-cell"><button type="button" class="icon-btn statblock-weapon-remove-btn" data-statblock-attack-remove="${gi}::${ai}" title="Remove attack">🗑</button></td>
    </tr>`).join('');
  return `
    <div class="statblock-weapons">
      <h4>Attacks</h4>
      <table class="statblock-weapon-table">
        <thead><tr><th class="statblock-weapon-col-name">Attack</th><th>Hit</th><th>Damage/Type</th><th class="statblock-weapon-col-traits">Notes</th><th></th></tr></thead>
        <tbody>${attackRows}</tbody>
      </table>
      <button type="button" class="btn ghost sm" data-statblock-attack-add="${gi}">＋ Attack</button>
    </div>`;
}

// Weapon table + Gear (design/adr/rules-profiles-multi-campaign.md, direct
// follow-up request) — 5PFH and Five Leagues character sheets only
// (ruleset gate in the caller above; Five Leagues' own sheet has the same
// Weapon/Gear shape, p.15/Deep Below Warband Sheet, and reuses this Gear
// field for its free-text Skills list too — see rulesets.js's own note),
// matching the Core rulebook's own character sheet layout (Weapon/Range/
// Shots/Damage/Traits columns, a Gear line below). 5PFH keeps the original
// single-row <table> (same pattern Trade's .trade-market-table already
// uses for editable tabular data — <input>s inside <td>s). Five Leagues has
// two extra columns (Catalog quick-fill, Location) that left no room for
// readable headers in that same single row, so it gets its own two-row-
// per-weapon card layout instead (direct follow-up request: "use two rows
// where Weapon name is wide enough... Move traits and location and the
// delete icon to a second row"). Both addressed by plain array index
// (weaponIndex), not a generated id, same convention statblock fields
// already use.
function characterSheetWeaponsAndGearHtml(group, gi) {
  const weapons = group.weapons || [];
  const isFiveLeagues = group.ruleset === 'fiveleagues';
  const traitsListId = `five-leagues-weapon-traits-${gi}`;
  const gearFieldHtml = `
    <label class="field-label statblock-gear-field">Gear
      <textarea rows="2" data-statblock-gear="${gi}" placeholder="Gear…">${esc(group.gear || '')}</textarea>
    </label>`;

  if (isFiveLeagues) {
    const weaponCards = weapons.map((w, wi) => `
      <div class="statblock-weapon-card">
        <div class="statblock-weapon-row1">
          <input type="text" class="statblock-weapon-name-input" data-statblock-weapon-field="${gi}::${wi}::name" value="${esc(w.name)}" placeholder="Weapon name">
          <input type="text" data-statblock-weapon-field="${gi}::${wi}::range" value="${esc(w.range)}" placeholder="Rng">
          <input type="text" data-statblock-weapon-field="${gi}::${wi}::shots" value="${esc(w.shots)}" placeholder="Shots">
          <input type="text" data-statblock-weapon-field="${gi}::${wi}::damage" value="${esc(w.damage)}" placeholder="Dmg">
        </div>
        <div class="statblock-weapon-row2">
          <input type="text" data-statblock-weapon-field="${gi}::${wi}::traits" value="${esc(w.traits)}" placeholder="Traits" list="${traitsListId}">
          <select data-statblock-weapon-field="${gi}::${wi}::location" title="Carried in">${FIVE_LEAGUES_GEAR_LOCATIONS.map((l) => `<option value="${esc(l.key)}" ${(w.location || 'self') === l.key ? 'selected' : ''}>${esc(l.label)}</option>`).join('')}</select>
          <button type="button" class="icon-btn statblock-weapon-remove-btn" data-statblock-weapon-remove="${gi}::${wi}" title="Remove weapon">🗑</button>
        </div>
      </div>`).join('');
    // Direct follow-up request: "remove the 'category' weapon picker and
    // use that selection approach as part of the '+ Weapon' button... the
    // choice of that selection would then create the weapon record
    // populated with that selected weapon and its stats" — the per-row
    // Catalog <select> (quick-filling an EXISTING row) is gone; picking a
    // catalog weapon here instead creates a brand new, already-filled row
    // (addFiveLeaguesWeaponFromCatalog, shell.js), same "+ Add from
    // catalog… next to + Custom X" shape the Items table below already
    // established for its own catalog.
    const catalogOptions = FIVE_LEAGUES_WEAPON_CATALOG.map((w) => `<option value="${esc(w.key)}">${esc(w.label)}</option>`).join('');
    return `
      <div class="statblock-weapons">
        <h4>Weapons</h4>
        <div class="statblock-weapon-headrow">
          <span class="statblock-weapon-name-head">Weapon</span><span>Rng</span><span>Shots</span><span>Dmg</span>
        </div>
        <div class="statblock-weapon-list">${weaponCards}</div>
        <datalist id="${traitsListId}">${FIVE_LEAGUES_WEAPON_TRAITS.map((t) => `<option value="${esc(t.label)}">`).join('')}</datalist>
        <div class="five-leagues-item-add-row">
          <select data-fiveleagues-weapon-catalog-add="${gi}" title="Add from Weapons catalog…">
            <option value="">+ Add from Weapons catalog…</option>
            ${catalogOptions}
          </select>
          <button type="button" class="btn ghost sm" data-statblock-weapon-add="${gi}">＋ Custom Weapon</button>
        </div>
      </div>
      ${gearFieldHtml}`;
  }

  const weaponRows = weapons.map((w, wi) => `
    <tr>
      <td><input type="text" data-statblock-weapon-field="${gi}::${wi}::name" value="${esc(w.name)}" placeholder="Weapon"></td>
      <td><input type="text" data-statblock-weapon-field="${gi}::${wi}::range" value="${esc(w.range)}" placeholder="Range"></td>
      <td><input type="text" data-statblock-weapon-field="${gi}::${wi}::shots" value="${esc(w.shots)}" placeholder="Shots"></td>
      <td><input type="text" data-statblock-weapon-field="${gi}::${wi}::damage" value="${esc(w.damage)}" placeholder="Damage"></td>
      <td><input type="text" data-statblock-weapon-field="${gi}::${wi}::traits" value="${esc(w.traits)}" placeholder="Traits"></td>
      <td class="statblock-weapon-remove-cell"><button type="button" class="icon-btn statblock-weapon-remove-btn" data-statblock-weapon-remove="${gi}::${wi}" title="Remove weapon">🗑</button></td>
    </tr>`).join('');
  return `
    <div class="statblock-weapons">
      <h4>Weapons</h4>
      <table class="statblock-weapon-table">
        <thead><tr>
          <th class="statblock-weapon-col-name">Weapon</th><th>Range</th><th>Shots</th><th>Damage</th><th class="statblock-weapon-col-traits">Traits</th>
          <th></th></tr></thead>
        <tbody>${weaponRows}</tbody>
      </table>
      <button type="button" class="btn ghost sm" data-statblock-weapon-add="${gi}">＋ Weapon</button>
    </div>
    ${gearFieldHtml}`;
}

// Direct follow-up request: "update the character sheet for 5lfb to track
// character type, skills, origins, background, armor, gear storage in
// self, backpack or stash, weapon traits, and spells (hidden if a spell
// casting class is not selected for that character or NPC) per the
// ruleset." One function per tracked thing, concatenated by this wrapper
// in the order they appear on the sheet; `ui` threads through for the
// Character Type/Origin info-toggle (below) and the Items table's
// per-row Notes toggle (fiveLeaguesItemsSectionHtml).
function fiveLeaguesCharacterSheetExtrasHtml(e, group, gi, doc, ui) {
  return `
    ${fiveLeaguesTypeAndOriginRowHtml(e, doc, ui)}
    ${fiveLeaguesBackgroundSectionHtml(e)}
    ${fiveLeaguesSkillsSectionHtml(e)}
    ${fiveLeaguesArmorSectionHtml(e)}
    ${fiveLeaguesItemsSectionHtml(group, gi, e, ui)}
    ${fiveLeaguesSpellsSectionHtml(e)}`;
}

// Direct follow-up request: "The descriptive text for 'character type' and
// 'origin' should be hidden and connected to a question mark tool tip that
// has a different presentation than usual by expanding/collapsing where
// the text exists right now (instead to the usual floating tool tip
// display since it would be too small to see all the text). Also move
// those two fields to the same row and have just one set of text viewable
// at a time for each tooltip." Character Type (p.14) and Origin (data/
// fiveLeaguesOrigins.js, pp.15-19) now share one row; each select gets a
// small "?" button instead of always-visible description text underneath
// it — clicking one expands an in-place panel (never a floating hover
// tooltip — the real trait text is far too long to fit one) right where
// that text used to sit. `ui.fiveLeaguesInfoOpen` is a single ephemeral
// value, not a per-field Set, so opening one's panel always closes the
// other's — "just one set of text viewable at a time." Picking Mystic
// (Character Type) is what unhides the Spells section far below (p.45)
// and forces Background to Mystic (see that section's own comment).
function fiveLeaguesTypeAndOriginRowHtml(e, doc, ui) {
  const openKey = (ui && ui.fiveLeaguesInfoOpen) || null;

  const currentType = e.fiveLeaguesCharacterType || '';
  const type = currentType ? findFiveLeaguesCharacterType(currentType) : null;
  const typeOptions = FIVE_LEAGUES_CHARACTER_TYPES.map((t) => `<option value="${esc(t.key)}" ${t.key === currentType ? 'selected' : ''}>${esc(t.label)}</option>`).join('');
  const typeInfoKey = `${e.id}::characterType`;

  // Direct follow-up request: "update 5LFB origins to expand also to
  // include the origins from Compendium if that is enabled license" — the
  // Compendium's own extra Origins (data/fiveLeaguesOrigins.js's
  // FIVE_LEAGUES_COMPENDIUM_ORIGINS) only appear as SELECTABLE options once
  // the profile picks the Compendium for Rules Constitution -> Character
  // creation; an entity that already has one set keeps showing it via
  // findFiveLeaguesOrigin (which always checks both lists) even if the
  // supplement is later turned back off.
  const compendiumActive = isSupplementInUse(doc, 'fiveleagues-compendium', 'character-creation');
  const availableOrigins = compendiumActive ? [...FIVE_LEAGUES_ORIGINS, ...FIVE_LEAGUES_COMPENDIUM_ORIGINS] : FIVE_LEAGUES_ORIGINS;
  const currentOrigin = e.fiveLeaguesOrigin || '';
  const origin = currentOrigin ? findFiveLeaguesOrigin(currentOrigin) : null;
  const originOptions = availableOrigins.map((o) => `<option value="${esc(o.key)}" ${o.key === currentOrigin ? 'selected' : ''}>${esc(o.label)}</option>`).join('');
  const originInfoKey = `${e.id}::origin`;

  const typePanel = type ? `<p class="dim small">${esc(type.text)}</p>` : '';
  // Most origins get a single bracketed skill ("+1 [Speech]"); Deep Kin's
  // own Compendium text grants +1 to three skills at once, and Elriki's
  // own text is explicit that it gets no skill bonus at all (skillExpertise
  // null) — both read naturally off the same free-text field without a
  // second shape-specific field.
  const skillExpertiseText = origin && origin.skillExpertise ? ` · Skill expertise: +1 [${esc(origin.skillExpertise)}] Proficiency Tests` : '';
  const originPanel = origin ? `
    <p class="dim small">Background: ${esc(origin.background)}${skillExpertiseText}</p>
    <ul class="five-leagues-origin-traits">
      ${origin.traits.map((t) => `<li><b>${esc(t.name)}</b> — ${esc(t.text)}</li>`).join('')}
    </ul>` : '';

  return `<div class="five-leagues-type-origin-row">
    <label class="field-label">Character Type
      <span class="five-leagues-info-row">
        <select data-entity-five-leagues-character-type="${esc(e.id)}">
          <option value="">— None —</option>
          ${typeOptions}
        </select>
        <button type="button" class="icon-btn five-leagues-info-toggle ${openKey === typeInfoKey ? 'open' : ''}" data-fiveleagues-info-toggle="${esc(typeInfoKey)}" title="About this Character Type" ${type ? '' : 'disabled'}>?</button>
      </span>
    </label>
    <label class="field-label">Origin
      <span class="five-leagues-info-row">
        <select data-entity-five-leagues-origin="${esc(e.id)}">
          <option value="">— None —</option>
          ${originOptions}
        </select>
        <button type="button" class="icon-btn five-leagues-info-toggle ${openKey === originInfoKey ? 'open' : ''}" data-fiveleagues-info-toggle="${esc(originInfoKey)}" title="About this Origin" ${origin ? '' : 'disabled'}>?</button>
      </span>
    </label>
  </div>
  ${openKey === typeInfoKey && typePanel ? `<div class="five-leagues-info-panel">${typePanel}</div>` : ''}
  ${openKey === originInfoKey && originPanel ? `<div class="five-leagues-info-panel">${originPanel}</div>` : ''}`;
}

// Backgrounds (pp.19-23) — which ones are selectable depends on both the
// entity's Origin (above) and Character Type (above-above): a Mystic
// character type forces/locks this to 'mystic' outright (p.21), otherwise
// the options are whatever availableFiveLeaguesBackgrounds (data/
// fiveLeaguesCharacter.js) says this Origin allows or requires.
function fiveLeaguesBackgroundSectionHtml(e) {
  const originKey = e.fiveLeaguesOrigin || '';
  const typeKey = e.fiveLeaguesCharacterType || '';
  const forced = typeKey === 'mystic';
  const allowedKeys = availableFiveLeaguesBackgrounds(originKey, typeKey);
  const current = e.fiveLeaguesBackground || '';
  const options = allowedKeys.map((key) => {
    const bg = findFiveLeaguesBackground(key);
    return bg ? `<option value="${esc(bg.key)}" ${bg.key === current ? 'selected' : ''}>${esc(bg.label)}</option>` : '';
  }).join('');
  const bg = current ? findFiveLeaguesBackground(current) : null;
  return `<div class="five-leagues-background">
    <label class="field-label">Background
      <select data-entity-five-leagues-background="${esc(e.id)}" ${forced ? 'disabled' : ''}>
        <option value="">— None —</option>
        ${options}
      </select>
    </label>
    ${forced ? `<p class="dim small">Mystics must select the Mystic background, regardless of origin (p.21).</p>` : ''}
    ${bg && !forced ? `<p class="dim small">${esc(bg.text)}</p>` : ''}
  </div>`;
}

// The 12 named Skills (p.23) — a plain has/doesn't checklist (see data/
// fiveLeaguesCharacter.js's own doc comment on why the real +2 Proficiency
// Test bonus isn't automated here); each checkbox's tooltip is the Skill's
// own "Uses" text from the real Skills Table.
function fiveLeaguesSkillsSectionHtml(e) {
  const known = Array.isArray(e.fiveLeaguesSkills) ? e.fiveLeaguesSkills : [];
  const boxes = FIVE_LEAGUES_SKILLS.map((s) => `
    <label class="five-leagues-chip" title="${esc(s.uses)}">
      <input type="checkbox" data-entity-five-leagues-skill="${esc(e.id)}::${esc(s.key)}" ${known.includes(s.key) ? 'checked' : ''}>
      ${esc(s.label)}
    </label>`).join('');
  // Direct follow-up request: "Move the text '(+2 on a relevant
  // Proficiency Test, p.52)' to a tooltip" — a plain hover tooltip is fine
  // here (unlike Character Type/Origin's own expand/collapse panel above),
  // since this text is short enough to fit a floating tooltip.
  return `<div class="five-leagues-skills">
    <p class="field-label">Skills <span class="five-leagues-hint" title="+2 on a relevant Proficiency Test, p.52">ⓘ</span></p>
    <div class="five-leagues-chip-list">${boxes}</div>
  </div>`;
}

// Body Armor (p.62) — the <select> drives the Character Sheet's own
// numeric Armor stat field directly (domain/fiveLeagues.js's
// setEntityFiveLeaguesArmorBody); Shield/Helmet are reference-only
// booleans (their real benefit is situational — see that same function's
// doc comment); Fine/Fey Steel are optional Improved Armor traits.
function fiveLeaguesArmorSectionHtml(e) {
  const armor = e.fiveLeaguesArmor || {};
  const currentBody = armor.bodyType || '';
  const bodyOptions = FIVE_LEAGUES_ARMOR_TYPES.map((a) => `<option value="${esc(a.key)}" ${a.key === currentBody ? 'selected' : ''}>${esc(a.label)} (Armor ${a.armor})</option>`).join('');
  const bodyInfo = currentBody ? findFiveLeaguesArmorType(currentBody) : null;
  const improvements = Array.isArray(armor.improvements) ? armor.improvements : [];
  const improvementChips = FIVE_LEAGUES_ARMOR_TRAITS.map((t) => `
    <label class="five-leagues-chip" title="${esc(t.text)}">
      <input type="checkbox" data-entity-five-leagues-armor-improvement="${esc(e.id)}::${esc(t.key)}" ${improvements.includes(t.key) ? 'checked' : ''}>
      ${esc(t.label)}
    </label>`).join('');
  return `<div class="five-leagues-armor">
    <label class="field-label">Body Armor
      <select data-entity-five-leagues-armor-body="${esc(e.id)}">
        <option value="">— None selected —</option>
        ${bodyOptions}
      </select>
    </label>
    ${bodyInfo && bodyInfo.note ? `<p class="dim small">${esc(bodyInfo.note)}</p>` : ''}
    <div class="five-leagues-chip-list">
      <label class="five-leagues-chip" title="Characters with a shield receive +1 to Armor against ranged attacks, and may Parry against melee strikes — situational, so not folded into the Armor stat above.">
        <input type="checkbox" data-entity-five-leagues-armor-flag="${esc(e.id)}::shield" ${armor.shield ? 'checked' : ''}> Shield
      </label>
      <label class="five-leagues-chip" title="If a character wearing a helmet rolls a double on the post-game Injury Table, they are knocked out instead of suffering the Injury — the helmet is Damaged either way.">
        <input type="checkbox" data-entity-five-leagues-armor-flag="${esc(e.id)}::helmet" ${armor.helmet ? 'checked' : ''}> Helmet
      </label>
      ${improvementChips}
    </div>
  </div>`;
}

// Items table (pp.63-65) — a sibling to the Weapons table above for
// non-weapon gear, same Location tracking (self/backpack/stash, p.59).
// group.items is created by domain/statblocks.js's own makeStatblock for
// every fresh fiveleagues sheet, but an OLDER entity's sheet (created
// before this feature existed) may not have it yet — `|| []` covers that
// the same way characterSheetWeaponsAndGearHtml's own `group.weapons`
// already does.
//
// Direct follow-up request: "because the Party panel width is limited, the
// item 'notes' field should be an icon that opens/collapses the notes
// field on a second line" — the always-visible Notes <input> column is
// now a 📝 toggle button (data-fiveleagues-item-notes-toggle, keyed
// `${e.id}::${gi}::${ii}`, `ui.fiveLeaguesItemNotesOpen` — a Set, several
// rows can be open at once, unlike the single-value Character Type/Origin
// toggle above); its own title previews the existing text even collapsed,
// and a filled-but-collapsed row's icon gets a visual accent (`.has-
// notes`) so a GM never loses track of which rows actually have notes. A
// second <tr> (colspan across every column) holds the real textarea only
// while that row's toggle is open.
function fiveLeaguesItemsSectionHtml(group, gi, e, ui) {
  const items = group.items || [];
  const openNotes = (ui && ui.fiveLeaguesItemNotesOpen) || new Set();
  const rows = items.map((it, ii) => {
    const notesKey = `${e.id}::${gi}::${ii}`;
    const isOpen = openNotes.has(notesKey);
    const hasNotes = !!(it.notes && String(it.notes).trim());
    const notesRow = isOpen ? `
    <tr class="five-leagues-item-notes-row">
      <td colspan="4"><textarea rows="2" data-statblock-item-field="${gi}::${ii}::notes" placeholder="Notes…">${esc(it.notes)}</textarea></td>
    </tr>` : '';
    return `
    <tr>
      <td><input type="text" data-statblock-item-field="${gi}::${ii}::name" value="${esc(it.name)}" placeholder="Item"></td>
      <td><select data-statblock-item-field="${gi}::${ii}::location">${FIVE_LEAGUES_GEAR_LOCATIONS.map((l) => `<option value="${esc(l.key)}" ${(it.location || 'self') === l.key ? 'selected' : ''}>${esc(l.label)}</option>`).join('')}</select></td>
      <td class="five-leagues-item-notes-cell"><button type="button" class="icon-btn five-leagues-item-notes-toggle ${hasNotes ? 'has-notes' : ''}" data-fiveleagues-item-notes-toggle="${esc(notesKey)}" title="${hasNotes ? esc(it.notes) : 'Notes'}">📝</button></td>
      <td class="statblock-weapon-remove-cell"><button type="button" class="icon-btn statblock-weapon-remove-btn" data-statblock-item-remove="${gi}::${ii}" title="Remove item">🗑</button></td>
    </tr>${notesRow}`;
  }).join('');
  const catalogOptions = FIVE_LEAGUES_ITEM_CATALOG.map((it) => `<option value="${esc(it.key)}">${esc(it.label)}</option>`).join('');
  return `<div class="statblock-weapons five-leagues-items">
    <h4>Items <span class="dim small">(Backpack holds 8, shared across the whole warband; Stash is unlimited, kept at a settlement — p.59)</span></h4>
    <table class="statblock-weapon-table">
      <thead><tr><th class="statblock-weapon-col-name">Item</th><th>Location</th><th>Notes</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="five-leagues-item-add-row">
      <select data-fiveleagues-item-catalog-add="${gi}" title="Add from Items catalog…">
        <option value="">+ Add from Items catalog…</option>
        ${catalogOptions}
      </select>
      <button type="button" class="btn ghost sm" data-statblock-item-add="${gi}">＋ Custom Item</button>
    </div>
  </div>`;
}

// Spells (pp.45-50) — hidden entirely unless Character Type is 'mystic'
// (p.45: "A Mystic is a spell-casting character"), the literal "hidden if
// a spell casting class is not selected" from the request. A known spell's
// own real Incantation/Target/Duration shows inline; its full Effect text
// is the row's tooltip so the list stays scannable.
function fiveLeaguesSpellsSectionHtml(e) {
  if ((e.fiveLeaguesCharacterType || '') !== 'mystic') return '';
  const known = Array.isArray(e.fiveLeaguesSpells) ? e.fiveLeaguesSpells : [];
  const rows = FIVE_LEAGUES_SPELLS.map((s) => `
    <label class="five-leagues-spell-row" title="${esc(s.effect)}">
      <input type="checkbox" data-entity-five-leagues-spell="${esc(e.id)}::${esc(s.key)}" ${known.includes(s.key) ? 'checked' : ''}>
      <span class="five-leagues-spell-name">${esc(s.label)}${s.simple ? ' *' : ''}</span>
      <span class="dim small">Incant. ${esc(s.incantation)} · ${esc(s.target)} · ${esc(s.duration)}</span>
    </label>`).join('');
  return `<div class="five-leagues-spells">
    <p class="field-label">Known Spells <span class="dim small">(Mystics only, p.45-50 · * = Simple, no Strand cost on a success)</span></p>
    <div class="five-leagues-spell-list">${rows}</div>
  </div>`;
}

// A field's kind decides which widget it gets: attribute (a rollable
// modifier, e.g. Edge/Combat) → a single signed number with +/- (attrRow,
// no 1-5 track boxes — that's how Starforged/5PFH sheets actually present
// stats); track (a depleting resource, e.g. Health/Hull) → the click-to-set
// scale (trackRow); anything else → plain text (textRow).
function statblockFieldRow(f, gi, fi, opts) {
  if (f.attribute) return attrRow(f, gi, fi, opts);
  // Direct follow-up request: "Change Will, XP and Luck to number fields
  // instead of trackers" — scoped to the Five Leagues ruleset specifically
  // (its characterTemplate's only tracks ARE Will/Luck/XP, p.53), not a
  // general change to every other ruleset's own tracks (Starforged
  // Momentum, 5PFH HP, ...), which keep the usual click-to-set box row.
  if (f.track) return (opts.ruleset === 'fiveleagues') ? numberFieldRow(f, gi, fi, opts) : trackRow(f, gi, fi, opts);
  return textRow(f, gi, fi, opts);
}

// "EDGE +3" (sign, default) / "SPEED 3\"" (inches, 5PFH-style) / "3" (plain)
// — see FIELD_FORMATS. Anything non-numeric (a disposition word, an
// already-formatted string) renders as-is, with no affix applied.
function formatAttrValue(v, format = 'sign') {
  const n = Number(v);
  const finite = v !== '' && v != null && Number.isFinite(n);
  if (!finite) return String(v == null ? '' : v);
  if (format === 'inches') return `${n}"`;
  if (format === 'plain') return String(n);
  return (n >= 0 ? '+' : '') + n;
}


// A field's name, kind (track/attribute/text), and existence are template-
// driven (set in Settings — see statblockTemplateEditor) — the entity view
// only edits the VALUE. No per-field rename/format-toggle/remove controls
// here by design (Settings owns those); "+ Field"/"+ Track" below still let
// you add an ad-hoc one-off field, named via a prompt since there's no
// inline rename afterward.
function textRow(f, gi, fi, opts = {}) {
  // Same opts.entityId scoping trackRow/attrRow already carry — a plain
  // text field (e.g. Bestiary's "Notable Gear") reachable from the Party
  // Roster's expanded card needs it too, or an edit there would silently
  // apply to whichever entity happens to be active in the Entity Editor
  // instead of the entity actually on screen (a real bug this fixes).
  const key = opts.entityId ? `${opts.entityId}::${gi}::${fi}` : `${gi}::${fi}`;
  return `
    <div class="statblock-row ${opts.compact ? 'text-row-compact' : ''}">
      <span class="statblock-key">${esc(f.key)}</span>
      <input class="statblock-val" data-statblock-val="${key}" value="${esc(f.value)}" placeholder="Value">
    </div>`;
}

// Crew-Link-style numeric scale: a row of click-to-set boxes, double-click
// anywhere on the row to roll (d6 + value vs 2d10). `compact` renders it
// as a narrow stat pill (character sheet's top stat row) instead of the
// full-width statblock row. Direct follow-up request ("for all trackers
// in the app do not display the subtotal on the end of the tracker...
// that subtotal is used separately as in the Party Tracker header row of
// the NPC"): the trailing numeric value-badge is gone — the box row
// itself already shows the fill count AND the max (its own box count)
// visually, so a bare repeated number added nothing once the SAME value
// is already shown elsewhere (partyMemberHeadlineCounters' Health/
// Momentum counters). The double-click-to-roll trigger moves from that
// removed badge onto .track-widget itself (data-statblock-roll), so
// rolling still works exactly the same way, just without a dedicated
// visible number to carry it.
function trackRow(f, gi, fi, opts = {}) {
  const max = f.max || 5;
  const value = Number(f.value) || 0;
  // opts.entityId lets a caller OUTSIDE the Entity Editor (the Party Roster
  // — direct follow-up request: "clicking a stat should roll") render a
  // roll/set control for a specific entity rather than whichever one
  // happens to be active there; parseStatblockKey (shell.js) falls back to
  // the active Entity Editor entity when it's omitted, so every existing
  // Entity Editor call site (no entityId passed) is unaffected.
  const key = opts.entityId ? `${opts.entityId}::${gi}::${fi}` : `${gi}::${fi}`;
  const boxes = Array.from({ length: max }, (_, k) => k + 1).map((n) => `
    <button type="button" class="track-box ${n <= value ? 'on' : ''}" data-statblock-track-set="${key}" data-track-n="${n}" aria-label="Set ${n}">${n}</button>`).join('');
  // rollMethod undefined defaults to rollable (action) for backward
  // compatibility with fields created before Bestiary templates existed
  // (Health/Hull tracks, manually-added "+Track" fields); explicit 'none'
  // (a Bestiary progress-bar field) opts out of the roll button entirely.
  const method = f.rollMethod || 'action';
  const rollable = method !== 'none';
  const rollTitle = rollMethodTitle(method, value, f.target).replace('Click', 'Double-click');
  const widgetAttrs = rollable
    ? ` data-statblock-roll="${key}" title="${esc(rollTitle)}"`
    : ` title="Progress track — not rollable"`;
  return `
    <div class="statblock-row track-row ${opts.compact ? 'track-row-compact' : ''}">
      <span class="statblock-key">${esc(f.key)}</span>
      <div class="track-widget"${widgetAttrs}>
        <div class="track-boxes">${boxes}</div>
      </div>
    </div>`;
}

// Direct follow-up request: "Change Will, XP and Luck to number fields
// instead of trackers" — a plain, directly-editable numeric <input> (no
// click-to-set boxes) with the field's own `max` shown as a "/ N" suffix
// when it has one, bound through the same generic data-statblock-val
// handler every plain text field already uses (it just assigns whatever
// string is typed to `.value`, with no attribute/track-specific
// assumptions — getFiveLeaguesStat's own Number(...)||0 read handles the
// rest). Only ever reached for the fiveleagues ruleset (see
// statblockFieldRow above); every other ruleset's own tracks are
// unaffected.
// Direct follow-up request: "change the Luck, Will and XP fields in the
// 5LFB character sheet to a currency field format" — this app's own
// established "currency" shape (Party Trackers' currency-kind rows,
// partyTrackerRow above) is a plain number input plus a separate ＋/－
// stepper pair, not a bare typed-in box; wrapping this field's existing
// <input> in numStepper (the same generic helper the Party Tracker Size
// field and every other "number counter textbox" in the app already uses)
// gets the identical look/interaction for free — the wrapped input still
// carries its own data-statblock-val, so the stepper's shared data-num-step
// click handler (shell.js) nudges it and fires a real change event through
// the exact same commit path typing a value and blurring already used.
// Direct follow-up request: "drop the '/' separator and the last number.
// Just show the label, the textfield and the +-. Also, locate the +-
// under the textbox." The "/ max" suffix is gone — the field's own `max`
// attribute is kept on the <input> itself (still clamps typing/stepping,
// still honors an Origin's willMaxOverride/luckMaxOverride), just no
// longer shown as separate text. The ＋/－ buttons now stack BELOW the
// input instead of beside it — styles/cockpit.css's own .number-row-
// compact .num-stepper override (a 2-column grid: the input spans both
// columns on row 1, the two buttons auto-place into row 2) does this with
// zero markup change, so numStepper's own generic 3-child shape (input,
// ＋, −) stays identical for every OTHER call site (Party Tracker Size,
// Navigator workflow cards).
function numberFieldRow(f, gi, fi, opts = {}) {
  const key = opts.entityId ? `${opts.entityId}::${gi}::${fi}` : `${gi}::${fi}`;
  const value = Number(f.value) || 0;
  const hasMax = f.max != null && f.max !== '';
  return `
    <div class="statblock-row number-row ${opts.compact ? 'number-row-compact' : ''}">
      <span class="statblock-key">${esc(f.key)}</span>
      <span class="number-row-input-wrap">
        ${numStepper(`<input type="number" inputmode="numeric" class="attr-val-input" data-statblock-val="${key}" value="${value}" min="0" ${hasMax ? `max="${esc(f.max)}"` : ''} aria-label="${esc(f.key)} value">`)}
      </span>
    </div>`;
}

// A rollable stat/modifier (Edge, Combat, Speed, ...): a directly-editable,
// numerically-validated value — not +/- steppers, not a 1-5 click-to-set
// meter (that's for depleting resources, see trackRow). The LABEL itself is
// the roll trigger (click "EDGE" to roll it with this field's configured
// dice model — see ROLL_METHODS / rollMethodTitle below); a field with
// rollMethod 'none' (e.g. an inches-formatted Speed) gets a plain, non-
// clickable label instead. `format` (sign/inches/plain — FIELD_FORMATS)
// is rendered directly in the input's text (e.g. "+3", `3"`) so the affix
// reads as part of the value the way a real character sheet shows it — it's
// still purely cosmetic: setStatblockAttributeValue strips any non-digit/
// non-minus characters back out, so the stored value and any dice roll stay
// numeric-only regardless of what's displayed.
// Direct follow-up request: "shorten the stat field descriptions for
// 'combat skill' to 'combat' and 'toughness' to 'tough' to keep all six
// statblock fields on one line" — display-only, scoped to the compact
// Five Leagues stat row specifically; the field's own `key` (what every
// lookup — getFiveLeaguesStat, the combat dice rolls — actually reads) is
// never touched.
function fiveLeaguesCompactStatLabel(key) {
  if (key === 'Combat Skill') return 'Combat';
  if (key === 'Toughness') return 'Tough';
  return key;
}
function attrRow(f, gi, fi, opts = {}) {
  const value = Number(f.value) || 0;
  const format = f.format || 'sign';
  const method = f.rollMethod || 'none';
  const rollable = method !== 'none';
  const key = opts.entityId ? `${opts.entityId}::${gi}::${fi}` : `${gi}::${fi}`;
  const compactFiveLeagues = opts.compact && opts.ruleset === 'fiveleagues';
  const displayKey = compactFiveLeagues ? fiveLeaguesCompactStatLabel(f.key) : f.key;
  const label = rollable
    ? `<button type="button" class="statblock-key statblock-key-roll" data-statblock-roll-label="${key}" title="${esc(rollMethodTitle(method, value, f.target))}">${esc(displayKey)}</button>`
    : `<span class="statblock-key" title="Not rollable">${esc(displayKey)}</span>`;
  // Direct follow-up request: "narrow the padding around the text and
  // number of the statblocks for the 5LFB character sheet so that all six
  // fields fit on one row" — an earlier fix already shortened Combat
  // Skill/Toughness's own labels for this exact goal, but 6 pills' own
  // generic .attr-row-compact padding (0.5rem each side) still added up to
  // more fixed overhead than the row had room for. attr-row-compact-
  // fiveleagues is a tighter-padding modifier scoped to just this ruleset's
  // compact stat row — Starforged/5PFH's own compact attribute pills
  // (Edge/Heart, ...) are unaffected.
  return `
    <div class="statblock-row attr-row ${opts.compact ? 'attr-row-compact' : ''} ${compactFiveLeagues ? 'attr-row-compact-fiveleagues' : ''}">
      ${label}
      <input type="text" inputmode="numeric" class="attr-val-input" data-statblock-attr-val="${key}" value="${esc(formatAttrValue(value, format))}" aria-label="${esc(f.key)} value">
    </div>`;
}

// Hover text for the label-click roll trigger — mirrors ROLL_METHODS' dice
// model per id. Shared vocabulary with shell.js's performFieldRoll, which
// actually executes the roll (kept here since it's purely display text).
function rollMethodTitle(method, value, target) {
  if (method === 'action') return `Click to roll: d6 + ${value} vs 2d10 (Starforged/Ironsworn)`;
  if (method === 'flat') return `Click to roll: d6 + ${value} vs target ${target || 6} (5PFH)`;
  if (method === 'traveller') return `Click to roll: 2d6 + ${value} vs target ${target || 8} (Traveller)`;
  return '';
}

// "Previously on..." — one click composes a recap from the timeline, recent
// journal, open threads, and the Co-Pilot's current read, so a returning GM
// re-orients in ten seconds (Phase 6, pack 76's "Narrative Recall"). Pure
// read — buildSessionRecap never mutates; "Save as Journal note" is the only
// action that writes anything, and it's explicit.
function recapPanel(doc) {
  const recap = buildSessionRecap(doc);
  const lastTime = recap.lastTime.length
    ? `<ul class="recap-list">${recap.lastTime.map((j) => `<li>${esc(plainText(j.text))}</li>`).join('')}</ul>`
    : '<p class="dim small">No journal entries yet.</p>';
  const threads = recap.openThreads.length
    ? `<ul class="recap-list">${recap.openThreads.map((t) => `<li>${esc(t.name)} <span class="dim">(${t.filled}/${t.segments})</span></li>`).join('')}</ul>`
    : '<p class="dim small">No open threads.</p>';
  const entityChips = recap.relevantEntities.length
    ? `<div class="entity-chips">${recap.relevantEntities.map((e) => `<button class="entity-chip" data-open-entity="${esc(e.id)}">${esc(e.name)}</button>`).join('')}</div>`
    : '<p class="dim small">None tracked yet.</p>';

  return `
    <div class="recap-panel">
      <h4>Last time</h4>
      ${lastTime}
      <h4>Open threads</h4>
      ${threads}
      ${recap.objective ? `<h4>Objective</h4><p>${esc(recap.objective)}</p>` : ''}
      <h4>Relevant</h4>
      ${entityChips}
      <h4>Pressure</h4>
      <p class="dim small">Threat ${recap.pressure.threat}/10 · Mystery ${recap.pressure.mystery}/10</p>
      <h4>Recommended</h4>
      <p>${esc(recap.recommendedNext.observation)}</p>
      <button class="btn sm" data-recap-save>Save as Journal note</button>
    </div>`;
}

function plainText(s) { return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }

function journal(doc, ui = {}) {
  const entries = (doc.journal || []).slice().reverse();
  const recapOpen = !!ui.recapOpen;
  // Collapsed by default (direct follow-up request — was open by default);
  // same collapsible-section-header look as Party/Colony's own sections
  // (.party-section-toggle) instead of a plain button, for visual
  // consistency across the app's collapsible sections.
  const actionsOpen = !!ui.journalActionsOpen;
  return `
    <button class="btn ghost recap-toggle" data-recap-toggle>${recapOpen ? '▾' : '▸'} Previously on…</button>
    ${recapOpen ? recapPanel(doc) : ''}
    <div class="drawer-note">
      <span class="field-label-row">${richToolbarToggleHTML('journal:new', toolbarCollapsed(doc, ui, 'journal:new'))}</span>
      <div class="rich-field">${richToolbarHTML('journal:new', toolbarCollapsed(doc, ui, 'journal:new'), { includeToggle: false })}<div class="mention-editor" contenteditable="true" data-journal-input data-placeholder="Add a note, ruling, or clue… (drag an entity here, or type @, to mention it)">${buildMentionEditorHTML(doc, ui.journalDraftText || '')}</div></div>
      <div class="statblock-head" style="margin-top: var(--sp-3);">
        <button type="button" class="party-section-toggle" data-journal-actions-toggle>${actionsOpen ? '▾' : '▸'} Actions</button>
      </div>
      <div class="drawer-note-actions" data-journal-actions-body ${actionsOpen ? '' : 'hidden'}>
        <button class="btn" data-journal-add>Add note</button>
        <button class="btn ghost" data-export-journal>Export</button>
        <button class="btn ghost" data-generate-mission title="Roll a job: payout/deadline scaled by the current Threat, plus a complication">🎲 Generate Mission</button>
        <button class="btn ghost" data-advance-faction-turns title="Advance every tracked faction's pressure by one tick and roll a rumor for each">🎲 Advance Faction Turns</button>
        <button class="btn ghost" data-generate-creature title="Roll a creature concept: origin, movement, trait, and threat">🎲 Creature Concept</button>
        <button class="btn ghost" data-generate-site title="Roll a site concept: a feature, a danger, and a wonder">🎲 Site Concept</button>
        <button class="btn ghost" data-generate-seed title="Roll an adventure seed: a hook, a twist, and a complication">🎲 Adventure Seed</button>
      </div>
    </div>
    <div class="journal-list">
      ${entries.length ? entries.map((e) => journalEntryRow(doc, e, ui)).join('')
        : '<p class="ws-placeholder">No entries yet. Scenes and oracle rolls land here automatically.</p>'}
    </div>`;
}

// A journal entry is read-only display by default; the ✎ icon (next to the
// existing ✕ delete) swaps it for a real mention-editor, same rich-text/
// @mention capability every other field in this app has — it auto-saves on
// blur (onFocusOut's data-journal-edit branch), so "✓ Done" just closes edit
// mode rather than being a separate save step.
function journalEntryRow(doc, e, ui) {
  const editing = (ui.journalEditOpen || new Set()).has(e.id);
  const body = editing
    ? `<div class="rich-field">${richToolbarHTML(`journal:${e.id}`, toolbarCollapsed(doc, ui, `journal:${e.id}`), { includeToggle: false })}<div class="mention-editor" contenteditable="true" data-journal-edit="${esc(e.id)}">${buildMentionEditorHTML(doc, e.text)}</div></div>`
    : `<div class="journal-text mention-text">${e.isHtml ? e.text : buildMentionEditorHTML(doc, e.text)}</div>`;
  return `
        <div class="journal-entry">
          <div class="journal-meta">
                <span>${new Date(e.createdAt).toLocaleString()} · ${esc(e.source || 'Journal')}</span>
                <span class="journal-meta-actions">
                  ${editing ? richToolbarToggleHTML(`journal:${e.id}`, toolbarCollapsed(doc, ui, `journal:${e.id}`)) : ''}
                  <button class="icon-btn" data-journal-edit-toggle="${esc(e.id)}" title="${editing ? 'Done editing' : 'Edit'}" aria-label="Edit">${editing ? '✓' : '✎'}</button>
                  <button class="icon-btn" data-journal-del="${esc(e.id)}" title="Delete" aria-label="Delete">✕</button>
                </span>
              </div>
              ${body}
        </div>`;
}

// Grouped, collapsible, searchable oracle tree — categories and groups
// render as native <details>-styled rows (see oracleGroupRow), forced open
// while a search filter is active or the group is in `ui.expandedOracleGroups`
// (ephemeral UI state owned by shell.js, since re-rendering on every roll
// would otherwise reset native <details> open/closed state).
function oracle(doc, ui) {
  const filter = ui.oracleFilter || '';
  const tagFilter = ui.oracleTagFilter || null;
  // Direct bug report: "The new oracle groups for Ironsworn do not show in
  // the Oracle panel. They should show when the default ruleset is
  // Ironsworn." The Ironsworn Oracle groups live only in
  // FANTASY_FULL_TABLES, keyed off genrePack, not statRuleset — a
  // genrePack that drifted (or a pre-existing profile that picked
  // Ironsworn before shell.js's own stat-ruleset handler learned to sync
  // Genre Pack for it too) would otherwise show no Ironsworn content at
  // all, not just mis-grouped content. Fall back to 'fantasy' directly
  // whenever the active ruleset is Ironsworn, regardless of what
  // settings.genrePack itself currently says.
  const genrePack = (doc.settings && doc.settings.statRuleset) === 'ironsworn' ? 'fantasy' : (doc.settings && doc.settings.genrePack);
  const rawTables = tablesWithOverrides(doc.oracles && doc.oracles.overrides, genrePack);
  // Settings -> Factions tab's "Allow Faction-related Oracles" checkbox —
  // pruned from the browse tree only (Faction Events/Faction Conflict roll
  // from rawTables/tablesWithOverrides() directly elsewhere, unaffected).
  const tables = doc.settings && doc.settings.factionOraclesEnabled === false ? excludeFactionOracleTables(rawTables) : rawTables;
  // Direct follow-up request: "adjust the sci-fi genre to fantasy
  // equivalents for oracle section header and subheader descriptions" —
  // the fantasy pack gets its own genre-appropriate grouping/labeling
  // (ORACLE_GROUPS_FANTASY, data/oracleGroups.js) instead of the default,
  // sci-fi-worded ORACLE_GROUPS every other pack still uses.
  const tree = buildGroupedOracleTree(tables, genrePack === 'fantasy' ? ORACLE_GROUPS_FANTASY : undefined);
  // A field's 🔮 link (docs/adr/0016-oracle-tags-and-field-links.md) sets
  // oracleTagFilter instead of the free-text oracleFilter — the two modes
  // are mutually exclusive (typing in the search box clears the tag
  // filter, shell.js), so only one prune pass ever runs.
  const filtered = (tagFilter && tagFilter.length) ? filterOracleTreeByTags(tree, doc, tagFilter) : filterOracleTree(tree, filter);
  const forceOpen = !!filter.trim() || !!(tagFilter && tagFilter.length);
  const expanded = ui.expandedOracleGroups || new Set();
  const editorOpen = ui.oracleEditorOpen || new Set();
  const tagEditorOpen = ui.oracleTagEditorOpen || new Set();

  const rows = filtered.map((cat) => oracleGroupRow(doc, cat, forceOpen, expanded, editorOpen, tagEditorOpen, tables)).join('');
  const tagBadge = (tagFilter && tagFilter.length)
    ? `<div class="oracle-tag-filter-badge">Filtered by: ${tagFilter.map((t) => esc(t)).join(', ')} <button class="icon-btn" data-oracle-tag-filter-clear title="Clear filter">✕</button></div>`
    : '';
  // Direct follow-up request: "If an oracle link is selected on the
  // Navigator panel and the oracle panel is activated, route the output
  // of the oracles to append to the scene summary on the Navigator" —
  // ui.oracleRouteToNavigator (shell.js) is only ever true right after a
  // Navigator-panel 🔮/chip opened this drawer; a visible banner here so
  // a GM rolling isn't surprised their result landed on Scene Summary
  // instead of its normal Journal entry. Switching to any other drawer
  // tab, or closing and reopening this one, clears the flag (shell.js's
  // openDrawerTab/closeDrawerTab) — this banner disappears right along
  // with it, same render pass.
  const routeBanner = ui.oracleRouteToNavigator
    ? '<div class="oracle-tag-filter-badge oracle-route-banner">🧭 Rolls here append to the Navigator\'s Scene Summary instead of the Journal, until you leave this tab.</div>'
    : '';
  return `
    <div class="oracle-toolbar">
      <input class="drawer-search" data-oracle-filter value="${esc(filter)}" placeholder="Search oracle tables…">
      <button class="btn ghost sm" data-oracle-collapse-all>Collapse all</button>
    </div>
    ${tagBadge}
    ${routeBanner}
    <div class="oracle-tree">
      ${rows || '<p class="ws-placeholder">No tables match that search.</p>'}
    </div>`;
}

// Each table row's own entries editor (Phase 8, "oracle table editor") is
// collapsed behind an ✎ toggle by default, same footprint-saving pattern as
// the statblock "+ Add" row and Documents' tag editor — most tables are
// looked at to roll, not to edit, so the row stays compact until asked.
function oracleTableEditor(doc, node, key) {
  const entries = node.values;
  const rows = entries.map((v, i) => `
    <div class="oracle-entry-row">
      <input class="oracle-entry-input" data-oracle-entry-value="${esc(key)}::${i}" value="${esc(v)}">
      <button class="icon-btn" data-oracle-entry-remove="${esc(key)}::${i}" title="Remove entry">✕</button>
    </div>`).join('');
  const overridden = hasOracleOverride(doc, node.path);
  return `
    <div class="oracle-editor">
      ${rows}
      <div class="oracle-entry-add">
        <input class="oracle-entry-input" data-oracle-entry-new="${esc(key)}" placeholder="Add an entry…">
        <button class="icon-btn" data-oracle-entry-add="${esc(key)}" title="Add entry">＋</button>
      </div>
      ${overridden ? `<button class="btn ghost sm" data-oracle-reset="${esc(key)}">↺ Reset to default</button>` : ''}
    </div>`;
}

// Oracle tags (docs/adr/0016-oracle-tags-and-field-links.md) are hidden by
// default — revealed only via the 🏷 icon next to ✎, same "collapsed until
// asked" posture as the entries editor above. Locked tags (referenced by
// an entity-field link, data/entityFieldOracleLinks.js) show a 🔒 instead
// of a ✕ — visible, not hidden, so a GM understands why it's stuck rather
// than wondering where the remove button went (same "flag, don't silently
// drop" posture Phase 7's relationship-flagging already established).
function oracleTagEditor(doc, node, key, tables) {
  const tags = getOracleTags(doc, node.path);
  const vocab = listOracleTagVocabulary(doc, tables);
  const chips = tags.map((t) => {
    const locked = isOracleTagLocked(t);
    return `<span class="tag-chip">${esc(t)} ${locked
      ? `<span class="icon-btn" title="Locked — used by an entity field link">🔒</span>`
      : `<button class="icon-btn" data-oracle-tag-remove="${esc(key)}::${esc(t)}" title="Remove tag">✕</button>`}</span>`;
  }).join('');
  return `
    <div class="tag-editor oracle-tag-editor">
      <div class="tag-editor-head">
        <span class="field-label-static">Tags</span>
        <input class="doc-tag-input" data-oracle-tag-input="${esc(key)}" list="oracle-tag-list" placeholder="add tag…">
      </div>
      <datalist id="oracle-tag-list">${vocab.map((t) => `<option value="${esc(t)}">`).join('')}</datalist>
      <div class="tag-chips">${chips || '<span class="dim small">None yet.</span>'}</div>
    </div>`;
}

function oracleGroupRow(doc, node, forceOpen, expanded, editorOpen, tagEditorOpen, tables) {
  const key = node.path ? node.path.join('>') : node.label;
  const open = forceOpen || expanded.has(key);
  if (node.kind === 'table') {
    const editing = editorOpen.has(key);
    const taggingOpen = tagEditorOpen.has(key);
    return `
      <div class="oracle-row-wrap">
        <div class="oracle-row">
          <span class="oracle-label">${esc(node.label)} <span class="dim">(${node.values.length})</span></span>
          <span class="oracle-row-actions">
            <button class="icon-btn" data-oracle-tag-toggle-editor="${esc(key)}" title="${taggingOpen ? 'Hide tags' : 'Tags'}" aria-label="Tags">🏷</button>
            <button class="icon-btn" data-oracle-edit-toggle="${esc(key)}" title="${editing ? 'Close editor' : 'Edit entries'}" aria-label="Edit entries">✎</button>
            <button class="icon-btn" data-roll="${esc(key)}" title="Roll" aria-label="Roll">🎲</button>
          </span>
        </div>
        ${taggingOpen ? oracleTagEditor(doc, node, key, tables) : ''}
        ${editing ? oracleTableEditor(doc, node, key) : ''}
      </div>`;
  }
  const childRows = node.children.map((c) => oracleGroupRow(doc, c, forceOpen, expanded, editorOpen, tagEditorOpen, tables)).join('');
  const rollGroupBtn = node.kind === 'group'
    ? `<button class="icon-btn" data-roll-group="${esc(key)}" title="Roll every table in this group" aria-label="Roll group">🎲🎲</button>` : '';
  // Source suffix is a display-only lookup keyed by the top-level SCENE_TABLES
  // key (node.path.length === 1) — never touches node.label/path themselves,
  // which rollGroup dispatch and filterOracleTree search still key off of.
  const source = node.kind === 'group' && node.path && node.path.length === 1 ? ORACLE_TABLE_SOURCES[node.path[0]] : null;
  return `
    <div class="oracle-group ${node.kind}">
      <button class="oracle-group-head" data-oracle-toggle="${esc(key)}">
        <span class="oracle-toggle-caret">${open ? '▾' : '▸'}</span>
        <span class="oracle-group-label">${esc(node.label)}${source ? ` <span class="dim">(${esc(source)})</span>` : ''}</span>
      </button>
      ${rollGroupBtn}
      ${open ? `<div class="oracle-group-children">${childRows}</div>` : ''}
    </div>`;
}

// Settings tabs (UX batch) — the 12 sections below were one long scroll;
// grouped here into 4 topical tabs (a purely cosmetic regrouping, no
// section's own content/behavior changed). ui.settingsTab is ephemeral,
// default 'general'. Each tab's content array is evaluated lazily (a
// thunk, not a pre-rendered string) so switching tabs doesn't pay the
// cost of rendering the other three.
// Settings restructuring (ruleset-grouped tabs, direct follow-up request):
// 'turn-steps'/'crew-tasks'/'genre-rules' folded into 'ruleset-profile-
// editor' (label "Rulesets") as its own internal sub-tab bar — see
// rulesetsSection(). Tab id kept as-is (only the label changed) so nothing
// that jumps here directly (data-settings-tab="ruleset-profile-editor")
// needs updating. New 'factions' tab carries Faction Pacing (moved from
// General) plus the new Faction-oracles-visibility checkbox.
const SETTINGS_TABS = [
  { id: 'general', label: 'General' },
  { id: 'dice', label: 'Dice' },
  { id: 'campaigns', label: 'Campaigns' },
  // Direct follow-up request: "Change the term reference of ruleset to
  // Module" — tab id kept as-is (ruleset-profile-editor), only the label
  // changed, same posture as the earlier phase-tracking-field rename note
  // just below (src/core/buildInfo.js's own precedent: nothing that jumps
  // here directly by id needs updating when only a display label moves).
  { id: 'ruleset-profile-editor', label: 'Modules' },
  { id: 'trade-economy', label: 'Trade & Economy' },
  { id: 'factions', label: 'Factions' },
  { id: 'reference-tools', label: 'Reference Tools' },
  { id: 'licenses', label: 'Licenses' },
];

// The Rulesets tab's own internal sub-tab bar (new precedent — reuses the
// same `settings-tab-bar` CSS class World Tracker/Colony already use at
// drawer-top-level, just nested one level deeper here).
const RULESETS_SUB_TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'turn-steps', label: 'Turn Step' },
  { id: 'crew-tasks', label: 'Crew Tasks' },
];

function settings(doc, ui = {}) {
  const info = ui.storageInfo || { campaignBytes: 0, hasBackup: false, backupBytes: 0 };
  const activeTab = SETTINGS_TABS.some((t) => t.id === ui.settingsTab) ? ui.settingsTab : 'general';
  const tabBar = `<div class="settings-tab-bar">${SETTINGS_TABS.map((t) => `
    <button class="btn ghost sm ${t.id === activeTab ? 'active' : ''}" data-settings-tab="${t.id}" aria-selected="${t.id === activeTab}">${esc(t.label)}</button>`).join('')}</div>`;

  const sections = {
    general: () => `
      <div class="settings-group">
        ${sectionHeadRow('h3', 'Data Management', 'settings-data')}
        ${helpBody('settings-data', "Everything is stored in this browser. Export a backup or bind a file in a OneDrive-synced folder. Imported documents (Documents drawer's \"Import File(s)\") live in this browser's own local storage, separate from the campaign file itself — check \"Include DOC library\" below to carry them along when moving to another device.", ui)}
        <label class="chip sm"><input type="checkbox" data-export-include-attachments ${ui.exportIncludeAttachments ? 'checked' : ''}> Include DOC library related to this campaign in this export</label>
        <p class="dim small">${ui.exportIncludeAttachments
          ? (ui.exportAttachmentsPreview ? `${ui.exportAttachmentsPreview.count} file${ui.exportAttachmentsPreview.count === 1 ? '' : 's'}, ${formatBytes(ui.exportAttachmentsPreview.bytes)} — this export will be that much larger.` : 'Checking what’s on this device…')
          : 'Off by default: keeps the export small. Turn on when moving to a new device so imported documents open there too.'}</p>
        <div class="btn-col">
          <button class="btn" data-export-campaign>Export Campaign JSON</button>
          <label class="btn ghost file-btn">Import Campaign JSON<input type="file" accept=".json,application/json" data-import-campaign hidden></label>
          <button class="btn ghost" data-bind-file>Bind Save File / OneDrive</button>
        </div>
        <p class="dim small storage-usage">Campaign size: ${formatBytes(info.campaignBytes)}${info.hasBackup ? ` · backup: ${formatBytes(info.backupBytes)}` : ' · no backup saved yet'}</p>
        ${info.hasBackup ? `<button class="btn ghost" data-restore-backup title="Replaces the current campaign with the last save that persisted before this one">↺ Restore last backup</button>` : ''}
      </div>
      <div class="settings-group">
        <h4 style="margin-top: var(--sp-3);">Export/Import Docs separately</h4>
        <p class="dim small">Import/Export PDFs in the active Doc Library live in this browser's own storage, separate from the campaign file — bundle them as a zip to carry to another browser.</p>
        <div class="btn-col">
          <button class="btn ghost" data-ref-library-export title="Download every imported Reference Library doc, plus your title/tag edits, as one zip">⬇ Export Library</button>
          <label class="btn ghost file-btn">⬆ Import Library<input type="file" data-ref-library-import accept=".zip,.json,application/zip,application/json" hidden></label>
        </div>
      </div>
      ${contentPackSection(ui)}
      <div class="settings-group">
        ${sectionHeadRow('h3', 'Editor preferences', 'settings-editor')}
        <label class="chip sm"><input type="checkbox" data-settings-toolbar-default ${doc.settings.toolbarCollapsedByDefault ? 'checked' : ''}> Rich-text formatting toolbars start collapsed</label>
        <p class="dim small">Every field's own toolbar (Journal, Overview, Guide, …) still has its own ▸/▾ icon to override this per-field for the rest of the session.</p>
      </div>
      <div class="settings-group">
        ${sectionHeadRow('h3', 'Companion tools', 'settings-companion')}
        ${helpBody('settings-companion', "GMAtlas tracks character sheets in-app, ruleset-aware. For full character-building wizards this app doesn't replicate, the community Crew Link tool is one Ironsworn/Starforged option:", ui)}
        <div class="btn-col">
          <a class="btn ghost" href="https://starforged-crew-link.scottbenton.dev" target="_blank" rel="noreferrer">Open Crew Link ↗</a>
        </div>
        <p class="dim small">Opens in a new tab — never embedded, so it can't get stuck behind an in-app frame.</p>
      </div>
      <div class="settings-group">
        <h3>Build</h3>
        <p class="dim small">v${esc(BUILD.version)} — ${esc(BUILD.label)}</p>
      </div>`,
    dice: () => dice3dSettingsSection(doc, ui),
    campaigns: () => campaignsSection(doc, ui),
    'ruleset-profile-editor': () => rulesetsSection(doc, ui),
    'trade-economy': () => `
      <p class="dim small">Trade Economy Model moved to <b>Rulesets</b> — it's a Rules Profile setting now.</p>`,
    factions: () => factionsSettingsSection(doc, ui),
    'reference-tools': () => `
      ${mechanicsIndexSection(doc, ui)}
      ${tocSection(doc, ui)}`,
    licenses: () => licensesSection(doc, ui),
  };

  return `${tabBar}${sections[activeTab]()}`;
}

// --- Settings: Bestiary statblock templates (the "future-state" field-
// manifest engine: game system, field kind, roll method, and sort order,
// each editable here — see domain/statblockTemplates.js). ------------------
const ROLL_METHODS = [
  { id: 'none', label: 'None (no roll)' },
  { id: 'action', label: 'Starforged/Ironsworn (d6 + value vs 2d10)' },
  { id: 'flat', label: 'Five Parsecs from Home (d6 + value vs target)' },
  { id: 'traveller', label: 'Traveller (2d6 + value vs target)' },
  { id: 'd20', label: 'D&D 5e (d20 + value, no fixed target)' },
  { id: 'd20-score', label: 'D&D 5e Ability Score (d20 + score modifier)' },
  // Add more models here (and in domain/dice.js) as other planned systems —
  // 5PFH Planetfall, Stars Without Number — get authored roll mechanics.
];
const FIELD_KINDS = [
  { id: 'text', label: 'Text' },
  { id: 'attribute', label: 'Attribute (editable stat)' },
  { id: 'track', label: 'Track (progress bar)' },
];
const FIELD_FORMATS = [
  { id: 'sign', label: '+/- (Starforged-style, "+3")' },
  { id: 'inches', label: 'Inches (5PFH Speed-style, 3")' },
  { id: 'plain', label: 'Plain number ("3")' },
];

// Rules Constitution (docs/adr/0002, docs/adr/0032): which external
// ruleset (or GMAtlas Core) is the GM's chosen content provider per
// gameplay area. Every row now renders a real `<select>` — but only the
// Factions row's choice actually changes app behavior right now
// (data/factionRulesProviders.js reads the exact same settings key); every
// other row just records a stated preference for the still-future Phase 9
// Activity -> Rules Lens recommender, called out explicitly below so a GM
// doesn't assume the whole table is already live.
// Ruleset Profile Editor (design/adr/rules-profiles-multi-campaign.md):
// reusing rulesConstitutionSection/tradeEconomyModelSection verbatim below
// for every ruleset field a Rules Profile now owns instead of the campaign
// document. Those two functions only ever read `doc.settings.*`; wrapping
// the profile draft BEING EDITED (which may not be the active campaign's
// own profile, and may hold unsaved edits) into a doc-shaped object lets
// them run completely unmodified.
function profileAsSettingsDoc(doc, profile) {
  return { ...doc, settings: { ...doc.settings, ...profile.ruleset } };
}

// The Dice settings tab (direct follow-up request: "add a settings tab for
// selecting dice type and color options that can be configurable") — the
// 3D-animation on/off toggle (moved out of General's own catch-all group,
// see its own comment history there) plus a theme <select>, a row of
// quick-pick color swatches (direct follow-up request: "add dice color
// options including maroon, pink and dark green" — DICE_3D_COLOR_PRESETS,
// data/dice3dThemes.js), and a native color picker for anything else.
// Theme options come straight from data/dice3dThemes.js (each a real
// vendored dice-box theme folder — adding a theme means one entry there,
// never a change here); dice3dColor stays '' (this theme's own built-in
// default color) until a GM actually picks one, and the native picker's
// value falls back to a sane visible default (#2e8555, dice-box's own
// stock default) rather than showing a browser's default black when
// nothing's been chosen yet.
function dice3dSettingsSection(doc, ui) {
  const currentTheme = findDice3dTheme(doc.settings.dice3dTheme);
  const currentColor = (doc.settings.dice3dColor || '').toLowerCase();
  return `
    <div class="settings-group">
      ${sectionHeadRow('h3', '3D Dice', 'settings-dice3d')}
      <label class="chip sm"><input type="checkbox" data-settings-dice3d ${doc.settings.dice3dEnabled ? 'checked' : ''}> Roll animated 3D dice</label>
      ${helpBody('settings-dice3d', "The same physics-based 3D dice module Iron Fellowship/Crew-Link uses, for statblock rolls, the floating dice roller, single-table Oracle draws, and Colony's Lifeform Encounters roll. Only works when this app is served over http(s) (npm run serve) — a file:// double-click always falls back to the instant 2D result, same as this app's PDF-scanning features. Turn this off if the ~1s animation slows down rapid-fire rolling; the outcome is identical either way.", ui)}
      <label class="field-label">Dice type
        <select data-settings-dice3d-theme>${DICE_3D_THEMES.map((t) => `<option value="${esc(t.id)}" ${t.id === currentTheme.id ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}</select>
      </label>
      <label class="field-label">Dice color
        <div class="dice3d-color-swatches">
          ${DICE_3D_COLOR_PRESETS.map((c) => `<button type="button" class="dice3d-color-swatch ${c.hex.toLowerCase() === currentColor ? 'active' : ''}" style="background:${esc(c.hex)}" data-dice3d-color-preset="${esc(c.hex)}" title="${esc(c.label)}" ${currentTheme.supportsColor ? '' : 'disabled'} aria-label="${esc(c.label)}"></button>`).join('')}
        </div>
        <input type="color" data-settings-dice3d-color value="${esc(doc.settings.dice3dColor || '#2e8555')}" ${currentTheme.supportsColor ? '' : 'disabled'}>
      </label>
      ${currentTheme.supportsColor
        ? '<p class="dim small">Applies to the currently selected dice type.</p>'
        : `<p class="dim small">${esc(currentTheme.label)} uses its own fixed printed look and ignores color — pick Default, Smooth, Gemstone, or Rust to use this.</p>`}
    </div>`;
}

// Settings restructuring (direct instruction): a single campaign switcher
// dropdown replaces the old flat .campaign-row list (picking an option
// switches the active campaign immediately, same action the old "Switch"
// button ran); Rename/Delete act on whichever campaign is active. Below
// it, module-visibility checkboxes for the active campaign's OWN assigned
// profile, grouped and filtered by that profile's Game System Ruleset —
// edits the same profile.moduleEnabled the Rulesets tab's own flat
// checklist does (both are kept, per the confirmed answer), through its
// own independent draft (ui.activeProfileDraft, not tied to whichever
// profile the Rulesets tab's "Profile Name" picker currently shows).
function campaignsSection(doc, ui) {
  const campaigns = ui.campaigns || [];
  const profiles = ui.profiles || [];
  const draft = ui.newCampaignDraft || { title: '', profileId: '' };
  const activeCampaign = campaigns.find((c) => c.active) || null;

  const switcherRow = `
    <div class="campaign-switcher-row">
      <label class="field-label sm">Campaign
        <select data-campaign-switcher-select>
          ${campaigns.map((c) => `<option value="${esc(c.id)}" ${c.active ? 'selected' : ''}>${esc(c.title)}</option>`).join('')}
        </select>
      </label>
      <button type="button" class="icon-btn" data-campaign-form-toggle title="New Campaign">＋</button>
      ${activeCampaign ? `<button type="button" class="icon-btn" data-campaign-rename="${esc(activeCampaign.id)}" title="Rename &quot;${esc(activeCampaign.title)}&quot;">✎</button>` : ''}
      ${activeCampaign && campaigns.length > 1 ? `<button type="button" class="icon-btn danger" data-campaign-delete="${esc(activeCampaign.id)}" title="Downloads a backup, then deletes this campaign and all its data">✕</button>` : ''}
    </div>`;

  const profilePicker = activeCampaign ? `
    <label class="field-label sm campaign-profile-picker">Profile *
      <select data-campaign-reassign-profile="${esc(activeCampaign.id)}" required>
        ${profiles.map((p) => `<option value="${esc(p.id)}" ${p.id === activeCampaign.profileId ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
      </select>
    </label>` : '';

  const newCampaignForm = ui.campaignFormOpen ? `
    <div class="new-campaign-form">
      <label class="field-label sm">New campaign title
        <input data-new-campaign-title value="${esc(draft.title)}" placeholder="New Campaign">
      </label>
      <label class="field-label sm">Rules Profile *
        <select data-new-campaign-profile required>
          ${profiles.map((p) => `<option value="${esc(p.id)}" ${(draft.profileId || ui.activeProfileId) === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
        </select>
      </label>
      <button class="btn" data-campaign-create>+ Create Campaign</button>
    </div>` : '';

  // The Campaign dropdown leads, so everything below it reads as belonging
  // to the active campaign: its Profile, then its CSS Style Template, then
  // Plugins and Source Data. Renaming is the dropdown row's own ✎ (no
  // separate Title field). The old free-text "Setting" field is gone — it
  // drove nothing (settings.genre is still kept in the schema, unused).
  const cssTemplatePicker = `
    <label class="field-label sm">CSS Style Template
      <select data-campaign-css-template>${CSS_TEMPLATES.map((t) => `<option value="${esc(t.id)}" ${t.id === (doc.meta.cssTemplate || 'default') ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}</select>
    </label>`;

  return `
    <div class="settings-group">
      ${sectionHeadRow('h3', 'Campaigns', 'settings-campaigns')}
      ${helpBody('settings-campaigns', "Pick the campaign to work on — everything below applies to it. Each campaign is fully independent (its own Cast, Journal, scenes, ...) and is assigned one Rules Profile — change which one with the Profile dropdown at any time; reassigning never touches that campaign's own data, it only changes which module/visible-plugins/Storyboard-positions it reads. Rename with ✎, add with ＋. Edit a profile's own contents in Modules.", ui)}
      ${campaigns.length ? switcherRow : '<p class="dim small">No campaigns yet.</p>'}
      ${newCampaignForm}
      ${profilePicker}
      ${cssTemplatePicker}
    </div>
    ${campaignModuleChecksSection(ui)}
    ${sourceDataSection(doc, ui)}`;
}

// The module-specific subheader grouping (direct instruction): "Campaign"/
// "World" (GATEABLE_MODULES' colony/world-tracker) only for a Five Parsecs
// From Home profile, "Hexcrawl" only for Five Leagues from Borderlands —
// checked against the profile's own Game System Module (statRuleset)
// directly (RULESETS ids '5pfh'/'fiveleagues'), not the broader Genre-Pack-
// level matchesProfileRuleset used for packs/templates/turn-step-lists,
// since "Module = Five Parsecs From Home" means the specific active
// module, not just "any sci-fi profile." "Trade"/"Battlemap"/"Graph"/
// "Faction Events" always show, regardless of module. Direct follow-up
// request ("change the term reference of ruleset to Module... rename
// 'modules' used presently for trade, battlemap, etc to 'plugins'"): this
// function/its own data-module-* attributes and GATEABLE_MODULES/
// moduleEnabled (schema.js) all keep their internal names — only the
// user-facing labels below changed, same "swap the LABEL only" posture as
// bestiaryTerm/locationHierarchyTerms.
function campaignModuleChecksSection(ui) {
  const activeProfile = (ui.profiles || []).find((p) => p.id === ui.activeProfileId);
  const draft = ui.activeProfileDraft;
  if (!activeProfile || !draft) return '';
  const dirty = !!ui.activeProfileDraftDirty;
  const statRuleset = draft.ruleset.statRuleset;
  const check = (id) => `
    <label class="chip sm"><input type="checkbox" data-module-enabled-toggle="${id}" data-module-profile-id="${esc(activeProfile.id)}" ${draft.moduleEnabled[id] !== false ? 'checked' : ''}> ${esc((drawerMeta(id) || {}).label || id)}</label>`;
  const rulesetSpecific = [
    statRuleset === '5pfh' ? `${check('colony')}${check('world-tracker')}` : '',
    statRuleset === 'fiveleagues' ? check('hexcrawl') : '',
  ].join('');
  return `
    <div class="settings-group">
      ${sectionHeadRow('h3', 'Plugins', 'settings-campaign-modules')}
      ${helpBody('settings-campaign-modules', "Which plugins this campaign's own assigned profile shows — the same setting as the Modules tab's own \"Visible plugins\" checklist, just grouped by module here.", ui)}
      ${rulesetSpecific ? `<h4>Module-specific</h4><div class="module-enable-checks">${rulesetSpecific}</div>` : ''}
      <h4>General Plugins</h4>
      <div class="module-enable-checks">${check('trade')}${check('battlemap')}${check('graph')}${check('faction-events')}</div>
      ${profileDraftSaveBar(activeProfile, dirty)}
    </div>`;
}

// Ruleset Profile Editor (design/adr/rules-profiles-multi-campaign.md,
// direct follow-up request): select a profile, then edit everything it
// owns — ruleset fields, Rules Constitution/Game System Activation, which
// modules are visible, and what fills the Storyboard's three positions.
// Edits a DRAFT (shell.js's profileDrafts, threaded through as
// ui.profileDraft/ui.profileDraftDirty) — nothing applies to any real
// campaign until Save is clicked (data-profile-draft-save); Discard
// Changes (data-profile-draft-cancel) reverts the form to the last-saved
// value. Every campaign using this profile picks up a saved edit
// immediately (store.updateProfile's notify() re-renders the whole shell),
// since a profile is shared state, not per-campaign-duplicated.
// Shared by Ruleset Profile Editor and the Turn Step tab — both edit the
// SAME draft (shell.js's profileDrafts), so one Save/Discard bar covers
// edits made from either tab. Only shown once an edit has actually been
// made — hidden again the instant it's Saved or Discarded (direct
// follow-up request).
function profileDraftSaveBar(editingProfile, dirty) {
  if (!dirty || !editingProfile) return '';
  return `
    <div class="settings-group profile-draft-bar dirty">
      <p class="dim small">● Unsaved changes. Editing "${esc(editingProfile.name)}" — nothing below applies to any campaign until you Save.</p>
      <div class="btn-col-row">
        <button class="btn" data-profile-draft-save="${esc(editingProfile.id)}">Save Profile</button>
        <button class="btn ghost" data-profile-draft-cancel="${esc(editingProfile.id)}">Discard Changes</button>
      </div>
    </div>`;
}

// Which RULESETS id each Genre Pack's own "Game System Ruleset" dropdown
// decorates with a "Default (...)" label prefix (direct instruction:
// "Include default called 'Default (Starforged)' if Genre is SciFi" /
// "...'Default (Ironsworn)' if Genre is Fantasy" — corrected from the
// request's own "Ironforged" to the real published system, confirmed via
// AskUserQuestion). Display-only — never changes the stored statRuleset
// value itself, just how that one option's own label reads for this
// Genre Pack. Cyberpunk/dnd5e aren't listed — not asked for, so they get
// no forced default, same plain option label as every other entry.
const DEFAULT_RULESET_FOR_GENRE = { 'sci-fi-generic': 'starforged', fantasy: 'ironsworn' };

// The Rules Profiles picker sits above the Modules tab's Profile / Turn
// Step / Crew Tasks buttons, since every sub-tab edits the profile chosen here.
function rulesProfilePickerSection(doc, ui) {
  const profiles = ui.profiles || [];
  const editingProfile = profiles.find((p) => p.id === ui.editingProfileId) || profiles[0];
  const profilePickerHeaderExtra = `
    <button type="button" class="icon-btn" data-profile-create title="New Profile — clones the one currently selected below">📄＋</button>
    ${editingProfile ? `<button type="button" class="icon-btn" data-profile-rename="${esc(editingProfile.id)}" title="Rename &quot;${esc(editingProfile.name)}&quot;">✎</button>` : ''}`;
  const profilePicker = `
    <div class="settings-group">
      ${sectionHeadRow('h3', 'Rules Profiles', 'settings-profiles-list', profilePickerHeaderExtra)}
      ${helpBody('settings-profiles-list', "A Rules Profile bundles which plugins are visible, what fills the Storyboard's three positions, and the module (genre pack, stat system, trade economy, Rules Constitution, Game System Activation). Shared across every campaign that picks it.", ui)}
      <label class="field-label sm">Profile Name
        <select data-profile-select>
          ${profiles.map((p) => `<option value="${esc(p.id)}" ${editingProfile && p.id === editingProfile.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
        </select>
      </label>
    </div>`;
  return profilePicker;
}

function rulesetProfileEditorSection(doc, ui) {
  const profiles = ui.profiles || [];
  const editingProfile = profiles.find((p) => p.id === ui.editingProfileId) || profiles[0];
  const draft = ui.profileDraft;
  if (!editingProfile || !draft) return '';

  const dirty = !!ui.profileDraftDirty;
  const saveBar = profileDraftSaveBar(editingProfile, dirty);

  const pseudoDoc = profileAsSettingsDoc(doc, draft);
  const genreGroup = `
    <div class="settings-group">
      ${sectionHeadRow('h3', 'Genre Pack', 'settings-genre-pack')}
      ${helpBody('settings-genre-pack', 'Which oracle table set the whole campaign rolls against (Continue Story, Oracle drawer, Generate NPC, Universal Search) — genre-aware, not genre-locked, so this is a data swap, not a different engine.', ui)}
      <label class="field-label">Genre Pack
        <select data-genre-pack-select>
          ${GENRE_PACKS.map((p) => `<option value="${p.id}" ${p.id === (draft.ruleset.genrePack || 'sci-fi-generic') ? 'selected' : ''}>${esc(p.label)}</option>`).join('')}
        </select>
      </label>
    </div>`;

  const activeGenrePackId = draft.ruleset.genrePack || 'sci-fi-generic';
  const defaultRulesetId = DEFAULT_RULESET_FOR_GENRE[activeGenrePackId];
  const gameSystemRulesetGroup = `
    <div class="settings-group">
      ${sectionHeadRow('h3', 'Game System Module', 'settings-statsystem')}
      ${helpBody('settings-statsystem', 'Creates entity stat templates aligned to the chosen rule system.', ui)}
      <label class="field-label">Module for Profile
        <select data-settings-stat-ruleset>
          ${RULESETS.map((r) => `<option value="${r.id}" ${r.id === (draft.ruleset.statRuleset || 'starforged') ? 'selected' : ''}>${esc(r.id === defaultRulesetId ? `Default (${r.label})` : r.label)}</option>`).join('')}
        </select>
      </label>
      ${(() => {
        const activeRuleset = findRuleset(draft.ruleset.statRuleset || 'starforged');
        if (!activeRuleset.doc) {
          return `<p class="dim small">No sourcebook in this repo's library — ${esc(activeRuleset.label)}'s stats here are original content, not a transcription.</p>`;
        }
        return `
          <p class="dim small">Reference: <a href="${activeRuleset.doc}" target="_blank" rel="noreferrer">${esc(activeRuleset.label)} PDF</a> — load it from Settings → Licenses.</p>`;
      })()}
      <label class="field-label">Party Roster headline fields
        <input data-settings-party-headline-fields value="${esc((draft.ruleset.partyHeadlineFields || []).join(', '))}" placeholder="Health, Momentum" title="Comma-separated track-field names (matched case-insensitively) shown as small counters on a collapsed Party Roster member row — differs per module, since a Five Parsecs from Home sheet has no field literally named &quot;Momentum.&quot;">
      </label>
    </div>`;

  const positionSelect = (slot, label) => {
    const current = resolvePositionContentId(draft, slot);
    return `
    <label class="field-label sm">${esc(label)}
      <select data-storyboard-position-select="${slot}">
        ${POSITION_ASSIGNABLE_IDS.map((id) => `<option value="${esc(id)}" ${current === id ? 'selected' : ''}>${esc((drawerMeta(id) || {}).label || id)}</option>`).join('')}
      </select>
    </label>`;
  };
  const positionsGroup = `
    <div class="settings-group">
      ${sectionHeadRow('h3', 'Storyboard positions', 'settings-positions')}
      ${helpBody('settings-positions', "What fills each of the Storyboard's three always-visible positions. Anything not currently assigned to a position is reachable from the top navigation instead.", ui)}
      ${positionSelect('composer', 'Left side (default Composer)')}
      ${positionSelect('navigator', 'Middle section (default Navigator)')}
      ${positionSelect('advisor', 'Right side (default Advisor)')}
    </div>`;

  const moduleChecks = GATEABLE_MODULES.map((id) => `
    <label class="chip sm"><input type="checkbox" data-module-enabled-toggle="${id}" ${draft.moduleEnabled[id] !== false ? 'checked' : ''}> ${esc((drawerMeta(id) || {}).label || id)}</label>`).join('');
  const modulesGroup = `
    <div class="settings-group">
      ${sectionHeadRow('h3', 'Visible plugins', 'settings-modules')}
      ${helpBody('settings-modules', 'Plugins a campaign on this profile can see. Party and every other plugin not listed here always stays visible.', ui)}
      <div class="module-enable-checks">${moduleChecks}</div>
    </div>`;

  return `${saveBar}${genreGroup}${gameSystemRulesetGroup}${positionsGroup}
    ${statblockTemplateEditor(pseudoDoc)}
    ${modulesGroup}
    ${tradeEconomyModelSection(pseudoDoc, ui)}
    ${rulesConstitutionSection(pseudoDoc, ui)}
`;
}

// Settings restructuring: the Rulesets tab's own internal sub-tab bar —
// 'turn-steps'/'crew-tasks' moved in from their own former top-level tabs.
// Both still share the SAME profile draft as the 'profile' sub-tab's own
// Save/Discard bar (profileDraftSaveBar, shown once per tab switch same as
// before this restructuring).
// Which Turn-Step game systems the profile being edited actually assigns to
// a Turn-Step gameplay area (isTurnStepSystemActive) — drives which Modules
// sub-tabs, Turn Step Lists, and slot assignments show.
const TURN_STEP_SLOT_SYSTEMS = { colony: 'planetfall', starship: 'fivepfh', warband: 'fiveleagues' };
function profileTurnStepSystems(doc, ui) {
  const settings = ui.profileDraft ? profileAsSettingsDoc(doc, ui.profileDraft).settings : doc.settings;
  return Object.values(TURN_STEP_SLOT_SYSTEMS).filter((id) => isTurnStepSystemActive({ settings }, id));
}
function profileUsesCrewTasks(doc, ui, systems) {
  const draft = ui.profileDraft;
  if (draft && draft.crewTasks && (draft.crewTasks.tasks || []).length) return true;
  return (doc.turnStepLists || []).some((l) => systems.includes(l.ruleset)
    && (l.groups || []).some((g) => (g.steps || []).some((st) => st.showCrewTasks)));
}

function rulesetsSection(doc, ui) {
  const systems = profileTurnStepSystems(doc, ui);
  const visible = RULESETS_SUB_TABS.filter((t) => t.id === 'profile'
    || (t.id === 'turn-steps' && systems.length)
    || (t.id === 'crew-tasks' && systems.length && profileUsesCrewTasks(doc, ui, systems)));
  const activeSub = visible.some((t) => t.id === ui.rulesetsSubTab) ? ui.rulesetsSubTab : 'profile';
  const subTabBar = visible.length < 2 ? '' : `<div class="settings-tab-bar">${visible.map((t) => `
    <button class="btn ghost sm ${t.id === activeSub ? 'active' : ''}" data-rulesets-subtab="${t.id}" aria-selected="${t.id === activeSub ? 'true' : 'false'}">${esc(t.label)}</button>`).join('')}</div>`;
  const body = activeSub === 'turn-steps' ? turnStepsSettingsSection(doc, ui, systems)
    : activeSub === 'crew-tasks' ? crewTasksSettingsSection(doc, ui)
    : rulesetProfileEditorSection(doc, ui);
  return `${rulesProfilePickerSection(doc, ui)}${subTabBar}${body}`;
}

// Phase B (Settings navigation + entitlement stub): both the Rules
// Constitution dropdowns below and gameSystemActivationSection default to
// showing only the active profile's own Genre Pack's Game Systems (the
// literal "defaults to the same Genre Pack but offer to access All Genre
// Packs" behavior), sharing this ONE "Show all Genre Packs" state
// (ui.showAllGenrePacksInRpe, shell.js) rather than each section carrying
// its own toggle that could disagree. A provider already CHOSEN for an
// area is always kept visible in that area's own dropdown even when
// scoping would otherwise hide it (a stale choice from a since-switched
// Genre Pack, or an old campaign) — collapsing the scope should never
// silently disappear the GM's actual current selection.
function activeGenrePackId(doc) { return doc.settings.genrePack || 'sci-fi-generic'; }

// Every area's dropdown leads with "Module for Profile" (value '' — the
// stored pick is removed, so it follows the module if the profile's module
// later changes), labeled with what that resolves to for this area; then
// any OWNED Game System/Supplement that can fill the area (a supplement
// only while its parent system is in use). See design/rules-constitution-
// mapping.md for what each option actually switches.
function rulesConstitutionSection(doc, ui) {
  const showAll = !!(ui && ui.showAllGenrePacksInRpe);
  const packId = activeGenrePackId(doc);
  const inActivePack = (p) => { const gs = RULES_PROVIDERS[p]; return !gs || gs.genrePackId === packId; };
  const moduleLabel = findRuleset(doc.settings.statRuleset || 'starforged').label;
  const rows = GAMEPLAY_AREAS.map((area) => {
    const chosen = resolveProviderChoice(doc.settings, area.id);
    const unsetChoices = { ...(doc.settings.rulesProviderChoices || {}) };
    delete unsetChoices[area.id];
    const moduleEffect = resolveActiveProviderChoice({ settings: { ...doc.settings, rulesProviderChoices: unsetChoices } }, area.id);
    const moduleSuffix = moduleEffect && moduleEffect !== moduleProviderId(doc.settings) ? ` → ${providerLabel(moduleEffect)}` : '';
    const moduleOption = `<option value="" ${chosen ? '' : 'selected'}>Module for Profile (${esc(moduleLabel)}${esc(moduleSuffix)})</option>`;
    const extra = rulesConstitutionOptionIds(doc.settings, area.id)
      .filter((p) => showAll || p === chosen || inActivePack(p))
      .map((p) => `<option value="${esc(p)}" ${chosen === p ? 'selected' : ''}>${esc(providerLabel(p))}</option>`).join('');
    return `
    <tr>
      <td>${esc(area.area)}</td>
      <td><select data-rules-provider-choice="${esc(area.id)}">${moduleOption}${extra}</select></td>
    </tr>`;
  }).join('');
  const legend = Object.entries(RULES_PROVIDERS).map(([id, p]) => `
    <li><b>${esc(p.label)}</b> — <span class="dim small">${esc(p.status)}.</span></li>`).join('');
  const activePackLabel = (GENRE_PACKS.find((p) => p.id === packId) || {}).label || packId;
  return `
    <div class="settings-group">
      ${sectionHeadRow('h3', 'Rules Constitution', 'settings-rules-constitution')}
      ${helpBody('settings-rules-constitution', "What this profile actually uses, area by area. Every row starts on the Module for Profile; pick another owned game system or supplement to add it for just that area — e.g. a Compendium's Origins under Character creation without its enemies under Bestiary. Only books ticked in Licenses appear here, and owning a book turns nothing on until it's picked.", ui)}
      <label class="chip sm"><input type="checkbox" data-rpe-show-all-genre-packs ${showAll ? 'checked' : ''}> Show all Genre Packs</label>
      <p class="dim small">Providers and Game Systems below default to <b>${esc(activePackLabel)}</b> — check the box to see every Genre Pack's own.</p>
      <div class="tablewrap-narrow">
        <table class="rules-constitution-table">
          <thead><tr><th>Gameplay area</th><th>Provider</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <ul class="rules-provider-legend">${legend}</ul>
    </div>`;
}

// Turn Step Lists (direct follow-up request: "create an inventory of Turn
// Step List profiles managed in Settings") — a standalone, shared
// appConfig.turnStepLists inventory (domain/turnStepLists.js), decoupled
// from Rules Profiles: this tab manages the inventory itself (pick/create/
// rename/delete a named list) plus which list backs each Campaign-panel
// tab (campaign.turnStepSlotAssignments), instead of editing "the current
// profile's one list" the way it used to. Edits apply INSTANTLY (no
// Save/Discard draft — turnStepLists aren't profile content any more, so
// the Ruleset Profile Editor's shared draft doesn't apply here). Step text
// stays a plain textarea (the same `@[Label|Target]` document-mention
// syntax the seed content already uses) — display-side rendering in the
// Campaign panel is what turns it into real clickable links
// (buildMentionEditorHTML), so no rich editor is needed here. Groups
// collapse by default so the tab doesn't open to an overwhelming wall of
// fields; only steps reorder within their own group — the groups
// themselves, and which group a step belongs to, are fixed by the seed
// data (or however the GM authored them), matching this feature's
// confirmed scope.
function turnStepsSettingsSection(doc, ui, systems = []) {
  // Only this profile's own Turn-Step systems' lists (a GM's own untagged list always shows).
  const lists = (doc.turnStepLists || []).filter((l) => !l.ruleset || systems.includes(l.ruleset));
  const editingId = lists.some((l) => l.id === ui.editingTurnStepListId) ? ui.editingTurnStepListId : (lists[0] && lists[0].id);
  const editingList = lists.find((l) => l.id === editingId) || null;
  const groups = (editingList && editingList.groups) || [];
  const expanded = (ui && ui.expandedTurnStepGroups) || new Set();
  const assignments = doc.turnStepSlotAssignments || { colony: null, starship: null, warband: null };

  // Both the "Editing" list-switcher and the per-tab assignments only offer
  // the selected profile's own Turn-Step systems' lists (filtered above),
  // and only the tabs those systems drive are listed below.
  const visibleLists = lists;
  const listOptions = visibleLists.map((l) => `<option value="${esc(l.id)}" ${l.id === editingId ? 'selected' : ''}>${esc(l.name)}</option>`).join('');
  const slotOptions = (slot) => `<option value="">— None —</option>${lists.map((l) => `<option value="${esc(l.id)}" ${assignments[slot] === l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}`;

  // "Move to"/"Branches to" pickers (direct follow-up request: "assign
  // them to categories, move them between categories, connect or move
  // categories to sub categories") both pick from the SAME list's other
  // categories — branchTo is literally "this step, once reached, jumps
  // Next into category X" (domain/turnSteps.js's advanceTurnStep), so
  // "connect a category as a sub-category of another" is done by setting
  // the LAST step of the parent category's branchTo to the sub-category,
  // same mechanism the seed content itself uses (see
  // turnStepListPlanetfall.js's own pf6/pf8).
  const categoryOptions = (selected, excludeId) => groups.filter((g) => g.id !== excludeId)
    .map((g) => `<option value="${esc(g.id)}" ${g.id === selected ? 'selected' : ''}>${esc(g.label)}</option>`).join('');

  // "Move to"/"Branches to" (direct follow-up request: "revise... to be
  // right-aligned icons that open a dropdown on the next row if clicked
  // into edit mode. This keeps the icon button motif for making changes")
  // — each is its own independently-toggleable icon (ui.turnStepMoveEditOpen/
  // turnStepBranchEditOpen, keyed by the step's full listId::groupId::
  // stepId), same "icon reveals its real control on the row below" shape
  // this app already uses elsewhere (statblock's gear toggle, a category's
  // own expand arrow).
  const moveEditOpen = (ui && ui.turnStepMoveEditOpen) || new Set();
  const branchEditOpen = (ui && ui.turnStepBranchEditOpen) || new Set();

  const groupBlocks = groups.map((g) => {
    const isOpen = expanded.has(g.id);
    const stepRows = g.steps.map((s, i) => {
      const stepKey = `${editingId}::${g.id}::${esc(s.id)}`;
      const moveOpen = moveEditOpen.has(stepKey);
      const branchOpen = branchEditOpen.has(stepKey);
      const branchLabel = s.branchTo ? (groups.find((x) => x.id === s.branchTo) || {}).label : null;
      return `
      <div class="turn-step-row">
        <div class="turn-step-order">
          <button type="button" class="icon-btn" data-turn-step-move="${editingId}::${g.id}::${i}::-1" title="Move up" ${i === 0 ? 'disabled' : ''}>▴</button>
          <button type="button" class="icon-btn" data-turn-step-move="${editingId}::${g.id}::${i}::1" title="Move down" ${i === g.steps.length - 1 ? 'disabled' : ''}>▾</button>
        </div>
        <textarea rows="2" data-turn-step-text="${editingId}::${g.id}::${esc(s.id)}">${esc(s.text)}</textarea>
        <label class="turn-step-crew-tasks-toggle dim small" title="Attach Colony's Crew Tasks box to this step (direct follow-up request — reusable for any step, not just Daily Life 2)">
          <input type="checkbox" data-turn-step-crew-tasks="${editingId}::${g.id}::${esc(s.id)}" ${s.showCrewTasks ? 'checked' : ''}> Crew Tasks
        </label>
        <span class="turn-step-row-actions">
          <button type="button" class="icon-btn ${moveOpen ? 'active' : ''}" data-turn-step-move-toggle="${stepKey}" title="Move to a different category">📂</button>
          <button type="button" class="icon-btn ${branchOpen || branchLabel ? 'active' : ''}" data-turn-step-branch-toggle="${stepKey}" title="${branchLabel ? `Branches to ${branchLabel}` : 'Branches to…'}">🔀</button>
        </span>
        ${moveOpen ? `<label class="dim small turn-step-edit-row">Move to
          <select data-turn-step-move-category="${editingId}::${g.id}::${esc(s.id)}">
            <option value="">— stay in ${esc(g.label)} —</option>
            ${categoryOptions(null, g.id)}
          </select>
        </label>` : ''}
        ${branchOpen ? `<label class="dim small turn-step-edit-row">Branches to
          <select data-turn-step-branch-to="${editingId}::${g.id}::${esc(s.id)}">
            <option value="">— none —</option>
            ${categoryOptions(s.branchTo, null)}
          </select>
        </label>` : ''}
      </div>`;
    }).join('');
    return `
      <div class="settings-group">
        <h4 class="section-head-row">
          <button type="button" class="btn ghost sm" data-turn-step-group-toggle="${esc(g.id)}">${isOpen ? '▾' : '▸'} ${esc(g.label)} (${g.steps.length})</button>
          <span class="entity-chip-row">
            <button type="button" class="icon-btn" data-turnstepgroup-rename="${editingId}::${esc(g.id)}" title="Rename this category">✎</button>
            <button type="button" class="icon-btn" data-turnstep-add="${editingId}::${esc(g.id)}" title="Add a step to this category">＋ Step</button>
          </span>
        </h4>
        ${isOpen ? `<div class="turn-step-list">${stepRows}</div>` : ''}
      </div>`;
  }).join('');

  // Direct follow-up request: "Turn Step Lists" is now its own collapsible
  // section (default open); "Colony Tab Uses"/"Starship Tab Uses" moved out
  // into a separate, always-visible "Turn Step Assignments" section below
  // it, so picking which list backs which Campaign-panel tab doesn't
  // require expanding the (potentially long) list-editing UI first.
  const listsCollapsed = !!ui.turnStepListsCollapsed;
  return `
    <div class="settings-group">
      <h3 class="section-head-row">
        <button type="button" class="btn ghost sm" data-turnsteplists-section-toggle>${listsCollapsed ? '▸' : '▾'} Turn Step Lists</button>
        <span class="entity-chip-row">
          <button type="button" class="icon-btn" data-turnsteplist-create title="New Turn Step List">＋</button>
          ${editingList ? `<button type="button" class="icon-btn" data-turnsteplist-rename="${esc(editingId)}" title="Rename this list">✎</button>
          <button type="button" class="icon-btn" data-turnsteplist-delete="${esc(editingId)}" title="Delete this list">🗑</button>` : ''}
          ${helpToggle('settings-turn-steps')}
        </span>
      </h3>
      ${listsCollapsed ? '' : `
      ${helpBody('settings-turn-steps', "A shared, named inventory of reorderable campaign-turn workflows (direct follow-up request) — not tied to one Rules Profile. The Campaign panel's Colony/Starship tabs each walk through whichever list is assigned to them (see Turn Step Assignments below), following a step's own \"Branches to\" pick into another category in the SAME list automatically once reached. Create as many lists/categories/steps as you like; edits here apply instantly.", ui)}
      ${lists.length ? `<label class="field-label sm">Editing<select data-turnsteplist-select>${listOptions}</select></label>` : '<p class="dim small">No Turn Step Lists yet.</p>'}
      ${editingList && editingList.name === '5PFH' ? `<button class="btn ghost" data-turnsteplist-load-default="${esc(editingId)}::5pfh">Reload Five Parsecs from Home Default Steps</button>` : ''}
      ${editingList && editingList.name === 'Planetfall' ? `<button class="btn ghost" data-turnsteplist-load-default="${esc(editingId)}::planetfall">Reload Planetfall Default Steps</button>` : ''}
      ${editingList && editingList.name === 'Five Leagues' ? `<button class="btn ghost" data-turnsteplist-load-default="${esc(editingId)}::fiveleagues">Reload Five Leagues Default Steps</button>` : ''}
      ${editingList ? `<button class="btn ghost" data-turnstepgroup-add="${esc(editingId)}">＋ Category</button>` : ''}
      `}
    </div>
    ${listsCollapsed ? '' : (groups.length ? groupBlocks : (editingList ? '<div class="settings-group"><p class="dim small">No categories yet — add one above.</p></div>' : ''))}
    <div class="settings-group">
      <h3>Turn Step Assignments</h3>
      <p class="dim small">Which Turn Step List backs each Campaign-panel tab.</p>
      <div class="field-row2">
        ${systems.includes('planetfall') ? `<label class="field-label sm">Colony tab uses<select data-turnstep-slot-assign="colony">${slotOptions('colony')}</select></label>` : ''}
        ${systems.includes('fivepfh') ? `<label class="field-label sm">Starship tab uses<select data-turnstep-slot-assign="starship">${slotOptions('starship')}</select></label>` : ''}
        ${systems.includes('fiveleagues') ? `<label class="field-label sm">Warband tab uses<select data-turnstep-slot-assign="warband">${slotOptions('warband')}</select></label>` : ''}
      </div>
    </div>`;
}

// Crew Tasks tab (design/adr/rules-profiles-multi-campaign.md, direct
// follow-up request) — structural copy of turnStepsSettingsSection just
// above, minus the group-nesting layer: Crew Tasks is a flat list (jobs
// picked independently each campaign turn, not stepped through in
// sequence), so there's no group-toggle wrapper, just one flat reorderable
// list of tasks. Same shared draft/Save/Discard flow (profileDraftSaveBar).
function crewTasksSettingsSection(doc, ui) {
  const profiles = ui.profiles || [];
  const editingProfile = profiles.find((p) => p.id === ui.editingProfileId) || profiles[0];
  const draft = ui.profileDraft;
  if (!editingProfile || !draft) {
    return `<div class="settings-group"><p class="dim small">Select a profile in Modules first.</p></div>`;
  }
  const dirty = !!ui.profileDraftDirty;
  const tasks = (draft.crewTasks && draft.crewTasks.tasks) || [];

  const taskRows = tasks.map((t, i) => `
    <div class="turn-step-row">
      <div class="turn-step-order">
        <button type="button" class="icon-btn" data-crew-task-move="${i}::-1" title="Move up" ${i === 0 ? 'disabled' : ''}>▴</button>
        <button type="button" class="icon-btn" data-crew-task-move="${i}::1" title="Move down" ${i === tasks.length - 1 ? 'disabled' : ''}>▾</button>
      </div>
      <div class="crew-task-settings-row-body">
        <p class="dim small">${esc(t.label)}</p>
        <textarea rows="2" data-crew-task-text="${esc(t.id)}">${esc(t.text)}</textarea>
      </div>
    </div>`).join('');

  return `
    ${profileDraftSaveBar(editingProfile, dirty)}
    <div class="settings-group">
      ${sectionHeadRow('h3', 'Crew Tasks', 'settings-crew-tasks')}
      ${helpBody('settings-crew-tasks', "A Rules Profile's own reorderable list of crew jobs — Colony's Crew Tasks box (\"Daily Life\" step 2) picks from these. Empty by default; load the 5PFH jobs below, or type your own.", ui)}
      <p class="dim small">Editing "${esc(editingProfile.name)}".</p>
      <button class="btn ghost" data-crew-tasks-load-default>Load Five Parsecs from Home Default Crew Tasks</button>
    </div>
    ${tasks.length ? `<div class="settings-group"><div class="turn-step-list">${taskRows}</div></div>` : '<div class="settings-group"><p class="dim small">No crew tasks yet for this profile.</p></div>'}`;
}

// Living Faction Engine Phase B: how many scenes pass before Co-Pilot
// nudges "consider a faction round" — a plain number input, same pattern
// as every other small numeric Settings field (statRuleset's sibling
// dropdowns). Never disables the manual Step/Full Round buttons; this
// only tunes the reminder's cadence (0 turns the nudge off entirely,
// since isFactionRoundDue's >= comparison is always true against a 0
// threshold — a GM who never wants the reminder can set it here).
function factionPacingSection(doc) {
  const p = (doc.settings && doc.settings.factionPacing) || { scenesPerRound: 3, scenesSinceLastRound: 0 };
  return `
    <div class="settings-group">
      <h4>Faction Pacing</h4>
      <label class="field-label">Scenes per faction round
        ${numStepper(`<input type="number" min="0" data-faction-pacing-scenes-per-round value="${Number(p.scenesPerRound) || 0}">`)}
      </label>
      <p class="dim small">The Advisor suggests a Step or Full Round in Faction Events once this many scenes have passed since the last one committed (currently ${Number(p.scenesSinceLastRound) || 0} since). Set to 0 to turn the reminder off.</p>
    </div>`;
}

// New Factions tab (Settings restructuring): Faction Pacing moved in from
// General, plus a new checkbox gating the Factions/Corporate Powers (or
// fantasy's Faction Turns)/Faction Encounter oracle table groups out of the
// Oracle drawer's browse tree (domain/oracles.js's excludeFactionOracleTables)
// — campaign-scoped (doc.settings.factionOraclesEnabled), instant-apply,
// same posture as Faction Pacing's own field right above it.
function factionsSettingsSection(doc, ui) {
  const enabled = doc.settings.factionOraclesEnabled !== false;
  return `
    ${factionPacingSection(doc)}
    <div class="settings-group">
      ${sectionHeadRow('h3', 'Faction Oracles', 'settings-faction-oracles')}
      ${helpBody('settings-faction-oracles', "Hides the Factions/Corporate Powers (or Faction Turns)/Faction Encounter oracle table groups from the Oracle drawer's browse tree. Faction Events and Faction Conflict's own quick-start generator still work regardless — this only affects whether you can browse/roll them directly from the Oracle drawer.", ui)}
      <label class="chip sm"><input type="checkbox" data-faction-oracles-enabled-toggle ${enabled ? 'checked' : ''}> Allow Faction-related Oracles</label>
    </div>`;
}

// Licenses (design/adr/licenses-and-rules-constitution.md): one row per
// license in data/licenses.js, grouped under its product line. The checkbox
// is install-wide ownership (appConfig.licenses, written straight through
// store.updateAppConfig — no profile Save); an open (CC-BY) license has no
// checkbox. Every sourcebook PDF the license covers is listed under it with
// its own Load button (fetches the PDF from the web server into this
// install's document store) and its authoring status from Sourcebook
// Inventory. Owning a license turns nothing on: its PDFs reach a campaign's
// Docs library only while the campaign's profile designates one of its game
// systems (isLicenseInUse).
const LICENSE_FILE_TITLES = new Map([...REFERENCE_LIBRARY_MANIFEST, ...DOCS_MANIFEST].map((d) => [d.file, d.title]));
const inventoryByBasename = new Map(SOURCEBOOK_INVENTORY.map((e) => [e.file.split('/').pop(), e]));
function sourcebookInventoryFor(file) {
  return SOURCEBOOK_INVENTORY.find((e) => e.file === file) || inventoryByBasename.get(file.split('/').pop()) || null;
}

function licenseDocRow(file, owned, ui) {
  const title = LICENSE_FILE_TITLES.get(file) || file.split('/').pop();
  const loaded = (ui.refDocBlobKeys || new Set()).has(file);
  const loading = (ui.licenseDocLoading || new Set()).has(file);
  const inv = sourcebookInventoryFor(file);
  const status = inv ? (inv.status + (inv.note ? ' — ' + inv.note : '')) : 'not yet reviewed';
  const canLoad = owned && ui.canLoadReference;
  let action = '';
  if (loading) action = '<button type="button" class="btn ghost sm" disabled>Loading…</button>';
  else if (loaded) {
    action = '<span class="dim small" title="Stored in this browser — shown in the Docs library of every campaign that uses this game">☁ Loaded</span>'
      + (canLoad ? ' <button type="button" class="btn ghost sm" data-license-doc-reload="' + esc(file) + '" title="Replace the copy in this browser with a fresh one from the server (never a second copy)">↻ Overwrite</button>' : '');
  } else if (canLoad) action = '<button type="button" class="btn ghost sm" data-license-doc-load="' + esc(file) + '">⬇ Load</button>';
  return `
        <li class="license-doc-row"><span class="license-doc-title" title="${esc(status)}">📄 ${esc(title)}</span> ${action}</li>`;
}

// A license's content/data packs (data/contentPacksManifest.js — the ones
// whose supplement, or else game system, this license grants), listed under
// its sourcebooks. Import pulls the pack from the web server into the ACTIVE
// campaign — the same action as Settings -> Campaigns -> Source Data — and
// needs the license owned. Safe to repeat: existing names are skipped.
function licensePacksHtml(doc, lic, owned, ui) {
  const packs = CONTENT_PACKS_MANIFEST.filter((pk) => { const l = licenseFor(pk.supplement || pk.ruleset); return l && l.id === lic.id; });
  if (!packs.length) return '';
  const contentImporting = ui.contentPackImporting || new Set();
  const dataImporting = ui.dataPackImporting || new Set();
  const rows = packs.map((pk) => {
    const isData = pk.kind === 'data-pack';
    const busy = (isData ? dataImporting : contentImporting).has(pk.id);
    const attr = isData ? 'data-data-pack-import' : 'data-content-pack-import';
    const btn = owned && ui.canLoadReference
      ? '<button type="button" class="btn ghost sm" ' + attr + '="' + esc(pk.id) + '" ' + (busy ? 'disabled' : '') + ' title="Import into the current campaign (skips anything already there by name)">' + (busy ? 'Importing…' : '⬇ Import') + '</button>'
      : '';
    return '<li class="license-doc-row"><span class="license-doc-title" title="' + esc(pk.description || '') + '">' + (isData ? '🗺️ ' : '🐾 ') + esc(pk.title) + '</span> ' + btn + '</li>';
  }).join('');
  return '<p class="dim small license-packs-head">Content packs</p><ul class="license-doc-list">' + rows + '</ul>';
}

function licenseRow(doc, lic, ui) {
  const entitlements = (ui && ui.entitlements) || {};
  if (!lic.open && !canAccessGameSystem({ entitlements }, lic.id)) {
    return `
      <div class="license-row"><p class="dim small game-system-locked"><input type="checkbox" disabled> 🔒 <b>${esc(lic.label)}</b> — not available on this install.</p></div>`;
  }
  const owned = isLicensed(doc.settings, lic.id);
  const control = lic.open
    ? '<span class="chip sm license-open-badge">Open license</span>'
    : '<input type="checkbox" data-license-toggle="' + esc(lic.id) + '" ' + (owned ? 'checked' : '') + '>';
  const inUse = isLicenseInUse(doc.settings, lic.id)
    ? ' <span class="chip sm" title="This campaign\'s profile designates it — its sourcebooks are in the Docs library">In this campaign</span>'
    : '';
  const docs = lic.docs.map((f) => licenseDocRow(f, owned, ui)).join('');
  const stored = ui.refDocBlobKeys || new Set();
  const notLoaded = lic.docs.filter((f) => !stored.has(f)).length;
  const loadAll = owned && ui.canLoadReference && notLoaded > 1
    ? '<button type="button" class="btn ghost sm license-load-all" data-license-load-all="' + esc(lic.id) + '">⬇ Load all (' + notLoaded + ')</button>'
    : '';
  const extra = lic.id === 'hostile' && owned ? hostileWorldInformationSection(doc, ui) : '';
  const packs = licensePacksHtml(doc, lic, owned, ui);
  return `
      <div class="license-row">
        <p><label>${control} <b>${esc(lic.label)}</b>${inUse} — <span class="dim small">${esc(lic.text)}</span></label></p>
        ${loadAll}
        <ul class="license-doc-list">${docs}</ul>
        ${packs}
        ${extra}
      </div>`;
}

function gameSystemActivationSection(doc, ui) {
  return licenseFamilies().map((family) => `
    <div class="settings-group game-system-family">
      <h4>${esc(family.label)}</h4>
      ${family.licenses.map((lic) => licenseRow(doc, lic, ui)).join('')}
    </div>`).join('');
}

// Content Packs (domain/contentPack.js): export/import just Entities/Guide
// docs/Journal entries as a portable, additive file — distinct from the
// whole-campaign JSON export/import right above it (which REPLACES the
// current campaign), so this lives directly beneath it in the same "Data"
// area of the General tab rather than a separate tab of its own. The three
// checkboxes are ephemeral UI state (ui.contentPackFlags, shell.js) — which
// sections the next Export click includes; unchecked means "not in this
// file at all," not "export an empty list."
// Importing the shipped content/data packs into a campaign lives in
// Settings -> Campaigns -> Source Data (sourceDataSection); this is just the
// export/import controls.
function contentPackSection(ui) {
  const flags = ui.contentPackFlags || { entities: false, guide: false, journal: false };
  return `
    <div class="settings-group">
      ${sectionHeadRow('h3', 'Selective Content Import/Export', 'settings-content-packs')}
      ${helpBody('settings-content-packs', 'Export just Entities, Guide docs, and/or Journal entries as a portable file, then import it into another campaign — additive, unlike the whole-campaign export above. Entities skip anything that already exists by name (safe to import the same pack twice, or several overlapping packs); Guide docs and Journal entries always import fresh, no dedup.', ui)}
      <div class="content-pack-checks">
        <label class="chip sm"><input type="checkbox" data-content-pack-flag="entities" ${flags.entities ? 'checked' : ''}> Entities</label>
        <label class="chip sm"><input type="checkbox" data-content-pack-flag="guide" ${flags.guide ? 'checked' : ''}> Guide docs</label>
        <label class="chip sm"><input type="checkbox" data-content-pack-flag="journal" ${flags.journal ? 'checked' : ''}> Journal entries</label>
      </div>
      <div class="btn-col">
        <button class="btn" data-export-content-pack>Export Content Pack</button>
        <label class="btn ghost file-btn">Import Content Pack<input type="file" accept=".json,application/json" data-import-content-pack hidden></label>
      </div>
    </div>`;
}

// Settings -> Campaigns -> Source Data: preload game data into THIS campaign.
// Lists every content pack (lifeforms/enemies under assets/content-packs/)
// and data pack (Hostile's canon-location zones under assets/data-packs/)
// whose sourcebook's license is owned and in use by the campaign's profile
// (isPackInUse — the same test that scopes the Docs library), grouped by
// license, each with its own Import. Every import is additive and skips
// entities that already exist by name, so re-running one is harmless.
// Each Hostile zone imports on its own (data-data-pack-import).
function sourceDataSection(doc, ui) {
  const contentImporting = ui.contentPackImporting || new Set();
  const dataImporting = ui.dataPackImporting || new Set();
  const packs = CONTENT_PACKS_MANIFEST.filter((pk) => isPackInUse(doc.settings, pk));
  const groups = new Map();
  for (const pk of packs) {
    const lic = licenseFor(pk.supplement || pk.ruleset);
    const label = lic.family === lic.label ? lic.label : lic.family + ': ' + lic.label;
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(pk);
  }
  const row = (pk) => {
    const isData = pk.kind === 'data-pack';
    const busy = (isData ? dataImporting : contentImporting).has(pk.id);
    const attr = isData ? 'data-data-pack-import' : 'data-content-pack-import';
    const kindLabel = isData ? 'Locations' : 'Lifeforms & enemies';
    return `<li class="source-data-row">
        <span><b>${esc(pk.title)}</b> <span class="chip sm">${kindLabel}</span><br><span class="dim small">${esc(pk.description || '')}</span></span>
        <button type="button" class="btn ghost sm" ${attr}="${esc(pk.id)}" ${busy ? 'disabled' : ''}>${busy ? 'Importing…' : 'Import'}</button>
      </li>`;
  };
  const body = [...groups.entries()].map(([label, list]) => `
      <h4>${esc(label)}</h4>
      <ul class="rules-provider-legend source-data-list">${list.map(row).join('')}</ul>`).join('');
  return `
    <div class="settings-group">
      ${sectionHeadRow('h3', 'Source Data', 'settings-source-data')}
      ${helpBody('settings-source-data', "Preload game data into this campaign from the sourcebooks it uses — lifeforms and enemies as Cast entities, Hostile's canon worlds and stations as Locations. Only packs whose license you own (Settings → Licenses) and whose game system this campaign's profile designates are listed. Imports add to the campaign and skip anything that already exists by name, so it's safe to run one again. Needs the app served over http(s) (npm run serve).", ui)}
      ${body || '<p class="dim small">No source data for this campaign\'s game systems — own a license in Settings → Licenses and designate its game system in Settings → Modules.</p>'}
    </div>`;
}

// Licenses tab: the license list (gameSystemActivationSection above — every
// sourcebook with its Load button and authoring status) followed by a
// read-only list of every installable pack under /assets/ (data/
// contentPacksManifest.js), grouped by game system. licenseStatus exists so
// a future server-verified entitlement check has somewhere real to write
// its answer, not enforced here today.
function licensesSection(doc, ui) {
  // Ownership is install-wide (appConfig.licenses via the overlay on doc.settings),
  // so this reads plain doc — no profile draft involved. Each license row
  // lists its own sourcebooks AND content packs (gameSystemActivationSection).
  return `
    <div class="settings-group">
      ${sectionHeadRow('h3', 'Licenses', 'settings-licenses')}
      ${helpBody('settings-licenses', "Each license is granted by owning its sourcebook, and stands on its own — a Compendium never needs its core book. Tick the ones you own (applies to every campaign on this install); open licenses need no tick. Owning a license turns nothing on: a campaign gets a license's rules, Turn Steps, and sourcebooks in its Docs library only once its profile designates that game system — as its Module for Profile, or in the Rules Constitution (Modules tab). Load stores a sourcebook in this install for offline use; a content pack's Import adds its lifeforms/locations to the current campaign.", ui)}
    </div>
    ${gameSystemActivationSection(doc, ui)}`;
}

// Trade Economy Model (docs/adr/0013-trade-economy-types.md): a Location's
// economy type is an ordinary tag (tagEditor above already suggests the
// active model's labels for Location entities — entities.js's
// listTagVocabulary), not a new structured field, so this section is just a
// model switch plus a read-only reference list, the same
// pattern rulesConstitutionSection above already uses. Only one model is
// active at a time; switching it changes future tag SUGGESTIONS only — a
// Location already tagged from the other model keeps working, since
// trade.js's economyBiasAt checks both models regardless of which is active.
// Direct follow-up request: "Make 'Trade Economy Model' and 'Biomes
// (Sci-Fi (generic))' into section headers that are collapsed by
// default." Both now use the same generic collapsible-header mechanism
// the Navigator workflow groups just adopted (ui.collapsedActorGroups
// Set + data-actor-group-toggle, shell.js's handler is already fully
// generic — no new wiring needed) rather than sectionHeadRow's own plain
// static <h3>, which has no collapse concept at all. Each piece built as
// its own flat `const` first, not nested inside another template
// literal's ${} — scripts/build.js's regex-based bundler doesn't reliably
// track nested-backtick depth (see dashboardTrackersBlock's own note).
function tradeEconomyModelSection(doc, ui) {
  const active = doc.settings.tradeEconomyModel || 'hostile';
  const collapsedSet = (ui && ui.collapsedActorGroups) || new Set();
  const sectionKey = 'settings:trade-economy';
  const sectionCollapsed = !collapsedSet.has(sectionKey);
  const headRow = `<div class="section-head-row">
      <button type="button" class="field-label-static actor-group-toggle" data-actor-group-toggle="${esc(sectionKey)}">${sectionCollapsed ? '▸' : '▾'} Trade Economy Model</button>
      <span class="entity-chip-row">${helpToggle('settings-trade-economy')}</span>
    </div>`;
  const modelSelect = `
    <label class="field-label">Model
      <select data-trade-economy-model-select>
        ${ECONOMY_MODELS.map((m) => `<option value="${m.id}" ${m.id === active ? 'selected' : ''}>${esc(m.label)}</option>`).join('')}
      </select>
    </label>`;
  // 'none' (direct follow-up request) hides and collapses everything below
  // the model switch itself — this app is a sandbox for one ruleset or a
  // mix, not every feature always on, so a profile that doesn't use the
  // Trade Economy Model mechanic shouldn't show its reference lists at all.
  if (active === 'none') {
    const bodyHtml = sectionCollapsed ? '' : `
      ${helpBody('settings-trade-economy', "Set a Location's Development Level (on its Location card) to one of these to bias its market prices beyond the manual supply/demand dials — unset Locations are unaffected. \"None\" turns this mechanic off entirely for this profile; a Location already tagged from when a model was active keeps working if you switch a model back on.", ui)}
      ${modelSelect}`;
    return `
    <div class="settings-group">
      ${headRow}
      ${bodyHtml}
    </div>`;
  }
  const types = economyTypesForModel(active);
  const rows = types.map((t) => `
    <li><b>${esc(t.label)}</b> — <span class="dim small">scarcity ${t.scarcity}/10, manufacturing ${t.manufacturing}/10.</span> ${esc(t.description)}</li>`).join('');
  const biomes = biomesForGenrePack(resolveBiomeGenrePackId(doc));
  const biomeRows = biomes.map((b) => `
    <li><b>${esc(b.label)}</b> — <span class="dim small">water ${b.resourceScarcity.water}, fuel ${b.resourceScarcity.fuel}, food ${b.resourceScarcity.food}, ore ${b.resourceScarcity.ore}, tech ${b.resourceScarcity.tech}, luxury ${b.resourceScarcity.luxury} (/10).</span> ${esc(b.description)}</li>`).join('');
  const biomesLabel = (GENRE_PACKS.find((p) => p.id === (doc.settings.genrePack || 'sci-fi-generic')) || {}).label || 'active pack';
  const biomesKey = 'settings:trade-economy-biomes';
  const biomesCollapsed = !collapsedSet.has(biomesKey);
  const biomesHeadRow = `<div class="section-head-row">
      <button type="button" class="field-label-static actor-group-toggle" data-actor-group-toggle="${esc(biomesKey)}">${biomesCollapsed ? '▸' : '▾'} Biomes (${esc(biomesLabel)})</button>
    </div>`;
  const biomesBodyHtml = biomesCollapsed ? '' : `
      <p class="dim small">Set a Location's Biome (on its Location card) to one of these to bias prices by resource type, independent of and compounding with Development Level. Dials are 0-10, 0 = locally abundant/cheap, 10 = scarce/expensive.</p>
      <ul class="rules-provider-legend">${biomeRows}</ul>`;
  const bodyHtml = sectionCollapsed ? '' : `
      ${helpBody('settings-trade-economy', 'Set a Location\'s Development Level (on its Location card) to one of these to bias its market prices beyond the manual supply/demand dials — unset Locations are unaffected. Only one model is active at a time, but a Location already tagged the old way (a matching tag instead of the field) keeps working if you switch.', ui)}
      ${modelSelect}
      <ul class="rules-provider-legend">${rows}</ul>
      ${biomesHeadRow}
      ${biomesBodyHtml}`;
  return `
    <div class="settings-group">
      ${headRow}
      ${bodyHtml}
    </div>`;
}

// HOSTILE Canon Locations (docs/adr/0026-hostile-canon-locations.md): a
// UWP reference legend, gated to the Hostile genre pack — the Universal
// World Profile format is Cepheus Engine/HOSTILE-specific, not a generic
// sci-fi concept the way Trade Economy Model/Biome above are. Importing
// the zones themselves lives in Settings -> Campaigns -> Source Data. This
// reference is a collapsed "World Information" section (ui.collapsedActorGroups
// / data-actor-group-toggle) under the Hostile license on the Licenses tab.
// Hostile's own reference, rendered under the Hostile license row once
// that license is owned (licenseRow above).
function hostileWorldInformationSection(doc, ui) {
  const key = 'settings:hostile-world-information';
  const collapsedSet = (ui && ui.collapsedActorGroups) || new Set();
  const collapsed = !collapsedSet.has(key);
  const headRow = `<div class="section-head-row">
      <button type="button" class="field-label-static actor-group-toggle" data-actor-group-toggle="${esc(key)}">${collapsed ? '▸' : '▾'} World Information</button>
    </div>`;
  if (collapsed) return headRow;
  const starportRows = STARPORT_CLASSES.map((s) => `
    <li><b>${esc(s.code)} — ${esc(s.label)}</b> <span class="dim small">${esc(s.description)}</span></li>`).join('');
  const baseRows = BASES.map((b) => `
    <li><b>${esc(b.code)}</b> — <span class="dim small">${esc(b.label)}: ${esc(b.description)}</span></li>`).join('');
  const tradeCodeRows = TRADE_CODES.map((t) => `
    <li><b>${esc(t.label)}</b> <span class="dim small">(${esc(t.code)})</span> — <span class="dim small">${esc(t.description)}</span></li>`).join('');
  const bodyHtml = `
    <p class="dim small" style="margin-top: var(--sp-3);">The HOSTILE Settings sourcebook's own world gazetteer — ${HOSTILE_LOCATIONS_META.worldCount} worlds, ${HOSTILE_LOCATIONS_META.starCount} star systems, and ${HOSTILE_LOCATIONS_META.baseCount} bases authored so far (${esc(HOSTILE_LOCATIONS_META.zoneLabel)}), more zones queued. Importing creates a real, fully-editable Location entity per world/star/base (bases and stars first, so every world's references resolve); already-imported ones (matched by name) are skipped, so it's safe to re-run after a new zone is added. Fetches the data pack over the network at click time — needs <code>npm run serve</code> (won't work opened directly as a <code>file://</code> page).</p>
    <h4>Starport Classes</h4>
    <ul class="rules-provider-legend">${starportRows}</ul>
    <h4>Bases</h4>
    <ul class="rules-provider-legend">${baseRows}</ul>
    <h4>Trade Codes</h4>
    <ul class="rules-provider-legend">${tradeCodeRows}</ul>`;
  return `${headRow}${bodyHtml}`;
}

// Game Mechanics Index (docs/adr/0014-mechanics-index-pdfjs.md): a Settings
// trigger for the async PDF.js scan (ui/mechanicsScan.js) that populates
// the Guide drawer's clickable term -> page list below. Just the button and
// a status line here — the actual results render in the Guide, alongside
// the freeform reference text they're meant to accompany.
function mechanicsIndexSection(doc, ui) {
  const entries = getMechanicsIndex(doc);
  const scanning = !!(ui && ui.mechanicsScanning);
  return `
    <div class="settings-group">
      ${sectionHeadRow('h3', 'Game Mechanics Index', 'settings-mechanics-index')}
      ${helpBody('settings-mechanics-index', "Scans the Reference Library's PDFs relevant to your active stat module (plus Hostile's own core material) for terms like Strain, Supply, Momentum, and links each to the page it turns up on, in the Guide drawer below.", ui)}
      <button class="btn ghost" data-mechanics-scan ${scanning ? 'disabled' : ''}>${scanning ? 'Scanning…' : '🔄 Refresh Mechanics Index'}</button>
      <p class="dim small">${entries.length ? `${entries.length} term(s) indexed.` : 'Not scanned yet.'}</p>
      <p class="dim small">Needs the app served over http(s) (<code>npm run serve</code>) — reading local PDFs is blocked when running straight off <code>file://</code>.</p>
    </div>`;
}

// Reference Library Table of Contents generation ("USER CHANGES" batch,
// docs/adr/0020): a Settings trigger for the async PDF.js outline scan
// (ui/tocScan.js) that writes a real Guide document per source PDF with
// bookmarks, nested under a "Table of Contents" parent doc. Same
// button/status-line shape as Game Mechanics Index just above it.
function tocSection(doc, ui) {
  const scanning = !!(ui && ui.tocScanning);
  const tocParent = ((doc.guide && doc.guide.docs) || []).find((d) => !d.parentId && d.title === 'Table of Contents');
  const childCount = tocParent ? (doc.guide.docs || []).filter((d) => d.parentId === tocParent.id).length : 0;
  return `
    <div class="settings-group">
      ${sectionHeadRow('h3', 'Reference Table of Contents', 'settings-toc')}
      ${helpBody('settings-toc', 'Scans every PDF in your library (Reference Library plus your own uploads) for its real bookmarks and writes a linked table of contents for each into the Guide, under a "Table of Contents" entry.', ui)}
      <button class="btn ghost" data-toc-scan ${scanning ? 'disabled' : ''}>${scanning ? 'Scanning…' : '📑 Generate Reference Table of Contents'}</button>
      <p class="dim small">${childCount ? `${childCount} document(s) indexed.` : 'Not generated yet.'}</p>
      <p class="dim small">Needs the app served over http(s) (<code>npm run serve</code>) — reading local PDFs is blocked when running straight off <code>file://</code>.</p>
    </div>`;
}

// Settings restructuring: filters by the PROFILE BEING EDITED, fixing a
// real pre-existing drift the research pass flagged — this used to read
// doc.settings.genrePack (the active campaign's own genre), which could
// disagree with whatever profile a GM was mid-editing elsewhere in this
// same tab. `doc` here is already profileAsSettingsDoc(realDoc, draft)
// from the caller, so doc.settings.* (genrePack/statRuleset/
// rulesProviderChoices/gameSystemActivations) all correctly reflect the
// draft already — no separate `draft` param needed any more now that the
// list filter (direct follow-up request: "Limit the 'Statblock Templates
// (LifeForm)' options to only those that belong to the module of the game
// system and other game system modules that might be enabled in the
// 'Rules Constitution'") is matchesEnabledModule (data/
// rulesConstitution.js), which only ever reads doc.settings.
function statblockTemplateEditor(doc) {
  const templates = listTemplates(doc.settings).filter((t) => matchesEnabledModule(t.ruleset, doc.settings));
  const systems = templates.map((t) => `
    <details class="tpl-system">
      <summary>${esc(t.label)} <span class="dim small">(${t.fields.length} field${t.fields.length === 1 ? '' : 's'})</span></summary>
      <div class="tpl-field-list">
        ${t.fields.map((f, i) => templateFieldRow(t.id, f, i, t.fields.length)).join('') || '<p class="dim small">No fields yet.</p>'}
      </div>
      <button class="chip sm" data-tpl-field-add="${esc(t.id)}">＋ Field</button>
    </details>`).join('');

  const term = bestiaryTerm(doc.settings.genrePack);
  return `
    <div class="settings-group">
      <h3 title="Per-system NPC/creature field manifests — game system, field kind (attribute badge vs track/progress-bar), roll method, and sort order. An NPC picks one template from its statblock's &quot;${esc(term)} template&quot; selector.">Statblock Templates (${esc(term)})</h3>
      <div class="tpl-system-list">${systems}</div>
      <button class="btn ghost sm" data-tpl-system-add>＋ Game system</button>
    </div>`;
}

function templateFieldRow(systemId, f, i, count) {
  const key = `${systemId}::${i}`;
  const rollMethod = f.rollMethod || 'none';
  return `
    <div class="tpl-field-row">
      <input class="tpl-field-key-input" data-tpl-field-key="${key}" value="${esc(f.key)}" placeholder="Field name">
      <select data-tpl-field-kind="${key}">
        ${FIELD_KINDS.map((k) => `<option value="${k.id}" ${k.id === f.kind ? 'selected' : ''}>${k.label}</option>`).join('')}
      </select>
      ${f.kind !== 'text' ? `
        <select data-tpl-field-rollmethod="${key}">
          ${ROLL_METHODS.map((m) => `<option value="${m.id}" ${m.id === rollMethod ? 'selected' : ''}>${m.label}</option>`).join('')}
        </select>
        ${f.kind === 'attribute' ? `
        <select data-tpl-field-format="${key}">
          ${FIELD_FORMATS.map((fmt) => `<option value="${fmt.id}" ${fmt.id === (f.format || 'sign') ? 'selected' : ''}>${fmt.label}</option>`).join('')}
        </select>` : ''}
        ${f.kind === 'track' ? `<label class="tpl-field-max">Max ${numStepper(`<input type="number" min="1" data-tpl-field-max="${key}" value="${f.max || 5}">`)}</label>` : ''}
        ${(rollMethod === 'flat' || rollMethod === 'traveller') ? `<label class="tpl-field-max">Target ${numStepper(`<input type="number" min="1" data-tpl-field-target="${key}" value="${f.target || (rollMethod === 'traveller' ? 8 : 6)}">`)}</label>` : ''}
      ` : ''}
      <span class="tpl-field-actions">
        <button class="icon-btn" data-tpl-field-up="${key}" title="Move up" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button class="icon-btn" data-tpl-field-down="${key}" title="Move down" ${i === count - 1 ? 'disabled' : ''}>↓</button>
        <button class="icon-btn" data-tpl-field-remove="${key}" title="Remove field">✕</button>
      </span>
    </div>`;
}

// Expanded Party Roster card: reuses statblockSection() WHOLESALE (the
// exact same interactive Entity Editor rendering — collapse/remove-group,
// +Field/+Track, Enhancements, click-to-roll) rather than a separate
// read-only summary, per direct request ("match the conventions of the
// Composer... clicking a stat should roll that stat with modifier per the
// rules appropriate to that statblock"). The ONLY thing that changes vs.
// the Entity Editor's own call is opts.entityId — trackRow/attrRow thread
// it into their data-statblock-* keys so a click here resolves against
// THIS card's entity even though it's very likely not the Entity Editor's
// currently-active one (see shell.js's parseStatblockKey).
// Expanded Party Roster card (direct follow-up correction — reversing the
// earlier "reuse statblockSection() wholesale" approach after trying it):
// every field's PILL renders as a small "button-like box" — the stat's
// name on the first line, its current value on the second. An attribute
// pill is click-to-ROLL only, never editable directly ("that only
// happens in the entity editor" — still true for attributes). A track
// pill's click TOGGLES its own tracker open below instead
// (partyStatTrackExpansion) — and a later direct follow-up request
// ("make the tracker editable... in the party roster as well as entity
// editor") made THAT expanded view genuinely editable, the one exception
// to "read-only here" — its boxes are the same click-to-set control
// trackRow's own Entity Editor view uses. A new dedicated
// data-party-stat-roll (shell.js) reuses performFieldRoll, the
// exact same roll logic attrRow/trackRow's own triggers call, just without
// any of their edit affordances riding along with it.
// Direct follow-up request: "narrow the button-only statblock fields...
// so that all five attribute fields fit on one line and then all five
// tracker counters fit on one line" — attribute-kind and track-kind
// fields now render as TWO separate .party-stat-pills rows (a plain-text
// field, e.g. "Notable Gear", gets a third, since it's neither) instead of
// one mixed row, which is what actually forced wrapping before (9+ pills
// competing for one line, not 5). A track pill's click shows its full
// box-row view (partyStatTrackExpansion) directly below the tracks row —
// "the tracker for that one tracker is displayed in the next row." Direct
// follow-up request: "it should disappear if clicked again or be replaced
// with another tracker if another field is picked" — at most ONE
// expansion is ever open at a time app-wide (ui.expandedPartyStatField, a
// single nullable key, not a Set), so picking a different track field
// swaps the open one instead of stacking a second below it.
function partyMemberStatblocks(e, doc, ui, opts = {}) {
  const sorted = sortStatblockGroups(e.statblocks, doc.settings);
  const openKey = (ui && ui.expandedPartyStatField) || null;
  // Direct follow-up request: "remove the description of the character
  // sheet... in the dropdown of the entity on the Party panel if there is
  // only one character sheet on the entity" — same count/reasoning as
  // characterSheetGroupBlock's own identical suppression in the Entity
  // Editor: the "Character Sheet · {ruleset}" label only earns its keep
  // telling several of them apart. Scoped to kind:'character' groups only
  // — a Bestiary/Vehicle/Gear group's own label is untouched regardless.
  const characterSheetCount = (e.statblocks || []).filter((g) => g.kind === 'character' && !g.archived).length;
  // Inactive (archived) groups aren't part of the sheet — the Entity Editor
  // lists those separately, where they can be removed.
  return sorted.filter(({ group }) => !group.archived).map(({ group, index: gi }) => {
    const fields = (group.fields || []).map((f, fi) => ({ f, fi }));
    const attrs = fields.filter(({ f }) => f.attribute);
    const tracks = fields.filter(({ f }) => f.track);
    const other = fields.filter(({ f }) => !f.attribute && !f.track);
    const pillOpts = { compact: opts.compact, ruleset: group.ruleset };
    const attrPills = attrs.map(({ f, fi }) => partyStatPill(f, e.id, gi, fi, pillOpts)).join('');
    const trackPills = tracks.map(({ f, fi }) => partyStatPill(f, e.id, gi, fi, { ...pillOpts, expanded: openKey === `${e.id}::${gi}::${fi}` })).join('');
    const otherPills = other.map(({ f, fi }) => partyStatPill(f, e.id, gi, fi, pillOpts)).join('');
    const openTrack = tracks.find(({ fi }) => openKey === `${e.id}::${gi}::${fi}`);
    if (!attrPills && !trackPills && !otherPills) return '';
    // Direct follow-up request: "Remove the title of the statblock in the
    // combat tracker (to save space)" — opts.compact (set only by the
    // Combat Tracker's own call site) drops the group label entirely; the
    // Party Roster's own expanded card (opts.compact unset) is unaffected.
    const hideLabel = opts.compact || (group.kind === 'character' && characterSheetCount <= 1);
    return `<div class="party-stat-group">
      ${hideLabel ? '' : `<div class="party-stat-group-label">${esc(statblockGroupLabel(group, doc))}</div>`}
      ${attrPills ? `<div class="party-stat-pills">${attrPills}</div>` : ''}
      ${trackPills ? `<div class="party-stat-pills">${trackPills}</div>` : ''}
      ${otherPills ? `<div class="party-stat-pills">${otherPills}</div>` : ''}
      ${openTrack ? `<div class="party-stat-track-expansions">${partyStatTrackExpansion(openTrack.f, e.id, gi, openTrack.fi)}</div>` : ''}
    </div>`;
  }).join('');
}

// One stat's read-only box — label/value shape and rollability mirror
// attrRow/trackRow's own conventions exactly (attribute default rollMethod
// 'none', track default 'action' for backward compatibility with fields
// predating Bestiary templates — see CLAUDE.md's own note on this), just
// rendered as a plain <button>/<span> instead of an <input> or a row of
// click-to-set boxes. A plain text field (e.g. "Notable Gear") has no roll
// concept at all — shown the same way but never interactive. A track
// field's click is now a TOGGLE (opts.expanded/data-party-stat-toggle,
// direct follow-up request: "clicking... acts as a toggle") instead of a
// roll — rolling moves into the expanded view itself (partyStatTrackExpansion
// below) rather than double-click-on-the-pill, which would fire both the
// toggle (click) and the roll (dblclick) off the same interaction.
// Attribute fields are unaffected — still single-click-to-roll, no
// expansion concept applies to them.
function partyStatPill(f, entityId, gi, fi, opts = {}) {
  const key = `${entityId}::${gi}::${fi}`;
  const value = f.attribute ? esc(formatAttrValue(Number(f.value) || 0, f.format || 'sign'))
    : f.track ? esc(String(Number(f.value) || 0))
    : esc(f.value || '—');
  // Direct follow-up request: "narrow the statblock displayed in the
  // combat tracker for five leagues statblock by renaming 'combat skill'
  // to 'combat' and 'toughtness' to 'tough'... so all six blocks are on
  // the same row" — same fiveLeaguesCompactStatLabel helper the Entity
  // Editor's own compact stat row (attrRow) already uses, reused here for
  // the Combat Tracker's card (opts.compact, set only by its own call
  // site in shell.js's renderCombatTrackerPanel — the Party Roster's own
  // expanded card is unaffected, still shows the real field name). The
  // full name still shows in the title tooltip either way.
  const displayKey = (opts.compact && opts.ruleset === 'fiveleagues') ? fiveLeaguesCompactStatLabel(f.key) : f.key;
  if (f.track) {
    // Direct follow-up request: a tracker (Health/Spirit/Supply — longer
    // names) reads as one row (label beside its value, wide as needed)
    // instead of the narrow stacked-square block an attribute pill
    // (Edge/Shadow — a single letter's worth of value) uses — "treat those
    // statblocks as a different type," the SAME .party-stat-pill base
    // (border/background/click behavior) but a distinct .party-stat-pill-
    // track modifier for the row layout/width.
    const cls = `party-stat-pill party-stat-pill-track${opts.expanded ? ' party-stat-pill-expanded' : ''}`;
    return `<button type="button" class="${cls}" data-party-stat-toggle="${key}" title="${esc(f.key)}: click to ${opts.expanded ? 'hide' : 'show'} the tracker">
      <span class="party-stat-pill-label">${esc(displayKey)}</span>
      <span class="party-stat-pill-value">${value}</span>
    </button>`;
  }
  const method = f.rollMethod || 'none';
  const rollable = f.attribute && method !== 'none';
  if (rollable) {
    return `<button type="button" class="party-stat-pill" data-party-stat-roll="${key}" title="Roll ${esc(f.key)}">
      <span class="party-stat-pill-label">${esc(displayKey)}</span>
      <span class="party-stat-pill-value">${value}</span>
    </button>`;
  }
  return `<span class="party-stat-pill party-stat-pill-static" title="${esc(f.key)} — not rollable">
    <span class="party-stat-pill-label">${esc(displayKey)}</span>
    <span class="party-stat-pill-value">${value}</span>
  </span>`;
}

// A toggled-open track pill's full box-row view. Direct follow-up
// request ("make the tracker editable to adjust... trackers in the party
// roster as well as entity editor") reverses the earlier read-only
// design here — the boxes are now the SAME click-to-set <button>s
// trackRow's own Entity Editor view uses (data-statblock-track-set,
// entity-scoped via the 3-part key parseStatblockKey already handles),
// not plain read-only <span>s. Direct follow-up request ("for all
// trackers in the app do not display the subtotal on the end of the
// tracker... that subtotal is used separately as in the Party Tracker
// header row of the NPC"): still no trailing value badge — the SAME
// value is already shown in partyMemberHeadlineCounters, right above on
// the member row. Double-click-to-roll (data-statblock-roll, the same
// trigger/handler track-value-badge elsewhere uses) stays on
// .track-widget itself, same as trackRow.
function partyStatTrackExpansion(f, entityId, gi, fi) {
  const key = `${entityId}::${gi}::${fi}`;
  const max = f.max || 5;
  const value = Number(f.value) || 0;
  const boxes = Array.from({ length: max }, (_, k) => k + 1).map((n) => `
    <button type="button" class="track-box ${n <= value ? 'on' : ''}" data-statblock-track-set="${key}" data-track-n="${n}" aria-label="Set ${n}">${n}</button>`).join('');
  const method = f.rollMethod || 'action';
  const rollable = method !== 'none';
  const widgetAttrs = rollable
    ? ` data-statblock-roll="${key}" title="${esc(f.key)}: double-click to roll"`
    : ` title="${esc(f.key)}: not rollable"`;
  return `<div class="party-stat-track-expansion">
    <span class="party-stat-track-expansion-label">${esc(f.key)}</span>
    <div class="track-widget"${widgetAttrs}>
      <div class="track-boxes party-stat-track-boxes">${boxes}</div>
    </div>
  </div>`;
}

// Small right-aligned counter on a collapsed Party Roster row — direct
// follow-up request: "the Health and momentum numbers need to be the
// single value total that is at the end of the counter" (a plain number,
// not the row-of-boxes this used to render). Which fields surface here is
// entirely GM-configured (settings.partyHeadlineFields, Settings → Stat
// system — "GM picks per-ruleset which fields surface"), since a field
// literally named "Momentum" only exists under some rulesets. Direct
// follow-up request: "whatever is added to 'Party Roster headline fields'
// should be checked as a statblock and displayed if present in any of the
// enabled character sheets" — listPartyHeadlineTracks (domain/party.js)
// now matches ANY field kind, not just tracks, so this has to format/roll
// each kind the way its own normal row does (formatAttrValue + attribute's
// own rollMethod-defaults-to-'none' convention for an attribute, same
// value-or-'—' fallback partyStatPill already uses for plain text) rather
// than assuming every match is a plain number. Reuses the SAME
// data-statblock-roll double-click-to-roll trigger trackRow's own badge
// uses for every rollable kind here (not attrRow's click-the-label
// convention — no room in a small badge for two different trigger
// gestures), entity-scoped via the "entityId::gi::fi" key shape
// (parseStatblockKey, shell.js); onDblClick's own handler reads whichever
// field this resolves to and rolls it correctly regardless of kind.
function partyMemberHeadlineCounters(doc, e) {
  const fields = listPartyHeadlineTracks(doc, e);
  if (!fields.length) return '';
  const counters = fields.map(({ f, gi, fi }) => {
    const key = `${e.id}::${gi}::${fi}`;
    const isText = !f.attribute && !f.track;
    const display = f.attribute ? formatAttrValue(Number(f.value) || 0, f.format || 'sign')
      : f.track ? String(Number(f.value) || 0)
      : (f.value || '—');
    const method = f.rollMethod || (f.attribute ? 'none' : 'action');
    const rollable = !isText && method !== 'none';
    const valueEl = rollable
      ? `<button type="button" class="track-value-badge party-headline-value" data-statblock-roll="${key}" title="${esc(f.key)}: double-click to roll">${esc(display)}</button>`
      : `<span class="track-value-badge track-value-badge-static party-headline-value" title="${esc(f.key)}${isText ? '' : ': not rollable'}">${esc(display)}</span>`;
    return `<span class="party-headline-counter">
      <span class="party-headline-counter-label">${esc(f.key)}</span>
      ${valueEl}
    </span>`;
  }).join('');
  return `<div class="party-headline-counters">${counters}</div>`;
}

// A tracker's kind (meter/counter/currency) is fixed for its lifetime (see
// domain/party.js's addPartyTracker/updatePartyTracker) and never shown as
// its own label — boxes vs. a +/- number already say which one it is, so
// naming it again ("Meter"/"Counter") was redundant. A Starforged counter's
// difficulty rank (also creation-time-only) isn't inferable from the
// format, so it still gets a small badge — just without the kind word
// glued onto it.
function partyTrackerRow(t, editOpen) {
  const rank = t.difficulty && findProgressDifficulty(t.difficulty);
  const body = t.kind === 'meter' ? `
    <div class="track-boxes party-tracker-boxes">${Array.from({ length: t.max || 5 }, (_, k) => k + 1).map((n) => `
      <button type="button" class="track-box ${n <= t.value ? 'on' : ''}" data-party-tracker-box="${esc(t.id)}" data-track-n="${n}" aria-label="Set ${n}">${n}</button>`).join('')}</div>`
    : t.kind === 'gauge' ? `
    <div class="track-boxes party-tracker-boxes party-tracker-gauge" title="Momentum: -6 to +10 — the visible 10 boxes slide to keep the current value (and 0, where possible) in view">${gaugeWindow(t.value, t.min ?? -6, t.max ?? 10, 10).map((n) => `
      <button type="button" class="track-box ${n === t.value ? 'on' : ''} ${n === 0 ? 'gauge-zero' : ''}" data-party-tracker-gauge-box="${esc(t.id)}" data-track-n="${n}" aria-label="Set ${n}" title="${n === 0 ? 'Reset (0)' : n}">${n}</button>`).join('')}</div>`
    : `
    <span class="party-tracker-counter">
      <input class="party-tracker-value-input" type="number" data-party-tracker-value="${esc(t.id)}" value="${t.value}">
      <button class="icon-btn" data-party-tracker-step="${esc(t.id)}" data-delta="1" title="+1">＋</button>
      <button class="icon-btn" data-party-tracker-step="${esc(t.id)}" data-delta="-1" title="-1">−</button>
    </span>`;
  // Direct follow-up request: the name reads as a plain, fully-sized label
  // by default (no truncation, no input-box chrome) and the ✕ remove
  // button is hidden — both only appear while the section's shared pencil
  // toggle (Party Trackers header, data-party-trackers-edit-toggle) is on,
  // instead of every row always carrying its own always-editable input +
  // always-visible delete button.
  const nameEl = editOpen
    ? `<input class="party-tracker-name-input" data-party-tracker-name="${esc(t.id)}" value="${esc(t.name)}" placeholder="Tracker name">`
    : `<span class="party-tracker-name-label">${esc(t.name) || '<em>Untitled</em>'}</span>`;
  return `
    <div class="party-tracker-row ${editOpen ? '' : 'party-tracker-row-view'}">
      ${nameEl}
      ${rank ? `<span class="party-tracker-kind-label" title="Starforged progress track difficulty — fixed once created">${esc(rank.label)}</span>` : ''}
      ${body}
      ${editOpen ? `<button class="icon-btn" data-party-tracker-remove="${esc(t.id)}" title="Remove">✕</button>` : ''}
    </div>`;
}

// The "+ Tracker" creation form — a small inline group (name + type, no
// popup) that replaces the old window.prompt() flow. The type select's
// 'change' event re-renders this to swap in whichever type-specific field
// applies: a box-count for a meter ("usually 5 or 10 in Starforged"), or a
// Starforged difficulty rank for a counter (only offered when the
// campaign's stat ruleset is actually Starforged — a Troublesome/Epic rank
// means nothing under any other system).
function partyTrackerAddForm(ui, isStarforged) {
  const kind = ui.partyTrackerDraftKind || 'meter';
  return `
    <div class="party-tracker-add-form">
      <input type="text" class="party-tracker-draft-name" data-party-tracker-draft-name value="${esc(ui.partyTrackerDraftName || '')}" placeholder="Tracker name (e.g. Credits, Supply)">
      <select data-party-tracker-draft-kind>
        <option value="meter" ${kind === 'meter' ? 'selected' : ''}>Meter (progress bar)</option>
        <option value="counter" ${kind === 'counter' ? 'selected' : ''}>Counter</option>
        <option value="currency" ${kind === 'currency' ? 'selected' : ''}>Currency</option>
      </select>
      ${kind === 'meter' ? `
        <label class="party-tracker-draft-size">Size ${numStepper(`<input type="number" min="1" max="40" class="party-tracker-draft-max-input" data-party-tracker-draft-max value="5">`)}</label>` : ''}
      ${kind === 'counter' && isStarforged ? `
        <select data-party-tracker-draft-difficulty title="Starforged progress track difficulty — steps by this rank's tick count instead of +1">
          <option value="">No difficulty (plain +1)</option>
          ${STARFORGED_PROGRESS_DIFFICULTIES.map((d) => `<option value="${d.id}">${d.label}</option>`).join('')}
        </select>` : ''}
      <button class="btn sm" data-party-tracker-create>Create</button>
      <button class="icon-btn" data-party-tracker-add-cancel title="Cancel">✕</button>
    </div>`;
}

// --- Party: #character roster (live entity filter) + free-form trackers ----
// A member card's name toggles the statblock badges collapsed/expanded
// (ui.expandedPartyMembers, ephemeral — collapsed by default, same Set
// shape used throughout this session); a dedicated icon, right-aligned
// on the same row, opens the full entity editor instead (data-open-entity
// no longer sits on the whole card — clicking anywhere used to open the
// editor, which fought with wanting a plain collapse click on the name).
// Thumbnail matches WHO's own Actor thumbnails exactly (.actor-thumb-photo/
// -empty — Composer conventions, direct request), just click-to-open
// instead of click-to-expand-scene-details (this card's own name button
// already owns the collapse/expand interaction).
function partyMemberThumb(doc, e) {
  const img = e.thumbnailId ? getGalleryImage(doc, e.thumbnailId) : null;
  const inner = img
    ? `<img class="actor-thumb-photo" src="${esc(img.dataUrl)}" alt="">`
    : `<span class="actor-thumb-photo actor-thumb-photo-empty" aria-hidden="true">${esc((e.name || '?').trim().charAt(0).toUpperCase() || '?')}</span>`;
  // draggable/data-drag-entity (direct follow-up request — "just like the
  // Party Roster"): the SAME ENTITY_DRAG_TYPE Cast's own entity list rows
  // already carry, so a Party member can be dragged straight into the
  // Combat Initiative Tracker (shell.js).
  return `<button type="button" class="actor-thumb party-member-thumb-btn" draggable="true" data-drag-entity="${esc(e.id)}" data-open-entity="${esc(e.id)}" title="Open in entity editor">${inner}</button>`;
}

// Shared Assets' entity-linked vehicles (direct follow-up request: "needs
// to be a thumbnail like other NPC entity thumbnails") — same .actor-thumb-
// wrap/-circle/-photo/-name/-badge shape as partyMemberThumb/WHO's own
// Actor thumbnails, just with a remove badge instead of an expand one
// (nothing to expand — a Shared Asset isn't a scene actor).
function sharedAssetVehicleThumb(doc, entityId) {
  const a = getEntity(doc, entityId);
  if (!a) return '';
  const img = a.thumbnailId ? getGalleryImage(doc, a.thumbnailId) : null;
  const photo = img
    ? `<img class="actor-thumb-photo" src="${esc(img.dataUrl)}" alt="">`
    : `<span class="actor-thumb-photo actor-thumb-photo-empty" aria-hidden="true">${esc((a.name || '?').trim().charAt(0).toUpperCase() || '?')}</span>`;
  return `<div class="actor-thumb-wrap">
    <div class="actor-thumb-circle">
      <button type="button" class="actor-thumb" data-open-entity="${esc(entityId)}" title="${esc(a.name || 'Unnamed')}">${photo}</button>
      <button type="button" class="actor-thumb-badge actor-thumb-badge-remove" data-party-shared-asset-entity-remove="${esc(entityId)}" title="Remove from Shared Assets">✕</button>
    </div>
    <span class="actor-thumb-name">${esc(a.name || 'Unnamed')}</span>
  </div>`;
}

// Party's Starship section (direct follow-up request) — a single-entity
// reference, #vehicle-filtered, exclusively tagged #starship (enforced by
// domain/party.js's setPartyStarship/clearPartyStarship, not just this UI).
// Rendered directly under Party Roster. Direct follow-up request ("format
// the Starship entity record on Party to use the same formatting as the
// Characters under the Party Roster to show the statblocks") — reuses
// partyMemberCard(entity, doc, ui) verbatim (it's already entity-type-
// agnostic: thumb/name-toggle/headline counters/open-entity button, plus
// its statblocks when expanded via partyMemberStatblocks — nothing in it
// assumes 'npc'), instead of the earlier bespoke read-only thumbnail-only
// row this section used before statblocks were ever shown here.
//
// Direct follow-up request: "dedicate to scifi (generic) genre. It is
// specific to 5PFH, but could be used for other games like Traveller" —
// unconditionally visible before this, even in a Fantasy/D&D 5e/Five
// Leagues campaign where "Starship" makes no sense. Scoped to the whole
// sci-fi-generic Genre Pack (data/genrePacks.js — 5PFH/Traveller/
// Starforged/SWN/Planetfall/Hostile all live inside it), not narrowed to
// 5PFH specifically — same Genre-Pack-scoping posture Phase B's Rules
// Constitution/Game System Activation sections already established,
// applied here rather than only there.
function partyStarshipSectionHtml(doc, ui) {
  if ((doc.settings.genrePack || 'sci-fi-generic') !== 'sci-fi-generic') return '';
  const entityId = doc.party && doc.party.starshipEntityId;
  const entity = entityId ? getEntity(doc, entityId) : null;
  const collapsed = isPartySectionCollapsed(ui, 'starship', true);
  const headerExtra = entity
    ? '<button type="button" class="icon-btn" data-party-starship-remove title="Remove starship">🗑</button>'
    : '<button class="chip" data-entity-picker-open="party-starship">＋ Select Starship</button>';
  return `
    ${partySectionHeaderHtml('starship', 'Starship', collapsed, headerExtra)}
    ${collapsed ? '' : (entity ? partyMemberCard(entity, doc, ui) : '<p class="ws-placeholder">No starship yet — pick a #vehicle Asset entity above.</p>')}`;
}

// Party's Relationships section (direct follow-up request: "add a
// Relationships section similar to how used on Entity Editor. This treats
// the Party as an entity for the mapping purposes") — same .rel-chip/
// .rel-add markup/RELATIONSHIP_TYPES vocabulary the Entity Editor's own
// Relationships block uses, retargeted to campaign.party.relationships
// (domain/party.js) instead of one entity's own array; no strength/bond/
// flagged-mismatch nuance here (Party has no "type" for those checks to
// key off), just the core add/edit/remove/find flow.
function partyRelationshipsSectionHtml(doc, ui) {
  const relTypeOptions = (selected) => RELATIONSHIP_TYPES.map((t) => `<option value="${t}" ${t === selected ? 'selected' : ''}>${RELATIONSHIP_TYPE_LABEL[t]}</option>`).join('');
  const others = listEntities(doc);
  const rels = ((doc.party && doc.party.relationships) || []).map((r) => {
    const other = getEntity(doc, r.to);
    if (!other) return '';
    return `<span class="rel-chip">
      <select class="rel-type-select" data-party-rel-type="${esc(r.to)}" title="Relationship type">${relTypeOptions(r.type)}</select>
      <button type="button" class="rel-chip-name" data-open-entity="${esc(other.id)}" title="Open ${esc(other.name) || 'Unnamed'}">${esc(other.name) || 'Unnamed'}</button>
      <input class="rel-label-input" data-party-rel-label="${esc(r.to)}" value="${esc(r.label)}" placeholder="note (ally, rival…)" title="Edit this relationship's note">
      ${numStepper(`<input type="number" class="rel-strength-input" data-party-rel-strength="${esc(r.to)}" min="0" max="10" value="${Number(r.strength) || 0}" title="Strength/weight 0-10">`)}
      <button class="icon-btn" data-party-unlink="${esc(r.to)}" title="Remove link" aria-label="Remove link">✕</button></span>`;
  }).join('');
  const collapsed = isPartySectionCollapsed(ui, 'relationships', true);
  return `
    ${partySectionHeaderHtml('relationships', 'Relationships', collapsed)}
    ${collapsed ? '' : `
    <p class="dim small">The Party's own relationships to other Cast entities (direct follow-up request — the Party treated as an entity for mapping purposes). Pick one below to link.</p>
    <div class="rel-chips">${rels || '<span class="dim small">None yet.</span>'}</div>
    ${others.length ? `<div class="rel-add">
      <select data-party-link-type>${relTypeOptions('linked')}</select>
      <select data-party-link-target>${others.map((o) => `<option value="${esc(o.id)}">${esc(o.name) || 'Unnamed'}</option>`).join('')}</select>
      <input data-party-link-label placeholder="label (ally, rival…)">
      <button class="btn sm" data-party-link-add title="Link" aria-label="Link">🔗 Link</button>
    </div>` : '<p class="dim small">Add an entity in Cast first.</p>'}`}`;
}

// Direct follow-up request: "Remove the arrow opening the Entity Editor in
// the Party record since the thumbnail opens the entity editor" — the
// standalone ↗ button was fully redundant with partyMemberThumb's own
// data-open-entity (every other Actor thumbnail in the app — WHO, Shared
// Assets — already opens the entity editor on click with no second
// control beside it). A follow-up to THAT request ("add a 'x' removal
// where the arrow... was") puts a real action in that now-empty spot
// instead — leaving the Party (removes the #character tag, same
// confirm+archive behavior as doing it from the Entity Editor's own tag
// chips, just addressed by this row's own id — shell.js's
// data-party-member-remove handler).
export function partyMemberCard(e, doc, ui, opts = {}) {
  const open = (ui.expandedPartyMembers || new Set()).has(e.id);
  return `
    <div class="party-member-card">
      <div class="party-member-row">
        ${partyMemberThumb(doc, e)}
        <button type="button" class="party-member-name" data-party-member-toggle="${esc(e.id)}">${open ? '▾' : '▸'} ${esc(e.name) || '<em>Unnamed</em>'}</button>
        ${partyMemberHeadlineCounters(doc, e)}
        <button class="icon-btn" data-party-member-remove="${esc(e.id)}" title="Remove from Party" aria-label="Remove from Party">✕</button>
      </div>
      ${open ? partyMemberStatblocks(e, doc, ui, opts) : ''}
    </div>`;
}

// Direct follow-up request: "the weapon selection is important... Display
// in the statblock box in the combat tracker the active weapon selected.
// have this be a link to select from a list of possible weapons in the
// entity's worn gear (not backpack or stash). the selection will become
// the active weapon used to determine ranged/melee rules." Rendered by
// the Combat Tracker's own row (shell.js's renderCombatTrackerPanel,
// right inside the same .combat-tracker-card-wrap partyMemberCard above
// renders into, so it visually reads as part of "the statblock box")
// for EVERY row, not just the current Attacker — a persisted, always-
// visible/changeable property of the character, not a per-roll question.
// listFiveLeaguesSelfWeapons (domain/fiveLeagues.js) already excludes
// Backpack/Stash entirely, so every option here is legal to pick; "—
// Unarmed —" is always offered too, since fighting bare-handed is a real,
// valid choice (p.60's own Unarmed profile), not an error state.
export function fiveLeaguesActiveWeaponSelectHtml(entity, entryId) {
  const selfWeapons = listFiveLeaguesSelfWeapons(entity);
  const activeIdx = entity.fiveLeaguesActiveWeaponIndex;
  const options = selfWeapons.map(({ index, weapon }) => `<option value="${index}" ${index === activeIdx ? 'selected' : ''}>${esc(weapon.name || `Weapon ${index + 1}`)}</option>`).join('');
  return `<div class="combat-tracker-active-weapon">
    <label class="field-label sm">Weapon
      <select data-combat-tracker-active-weapon="${esc(entryId)}">
        <option value="">— Unarmed —</option>
        ${options}
      </select>
    </label>
  </div>`;
}

// Party drawer's own collapsible section headers (direct follow-up
// request: "Make Party Roster header collapseable as well as... Party
// Trackers, Shared Assets, Cargo Manifest and Contracts"). Same XOR-
// against-a-default shape as workspace/index.js's collapsibleThumbGroup
// (not imported directly — drawers/index.js can't import FROM workspace/
// index.js without a circular dependency, since that module already
// imports from this one) — ui.collapsedPartySections (shell.js) holds
// keys TOGGLED AWAY from their own default, so Party Roster (default
// open) and the other four (default collapsed) share one Set with
// opposite defaults; shell.js resets it on a genuine fresh Party-drawer
// open only, not a mere tab re-focus.
function isPartySectionCollapsed(ui, key, defaultCollapsed) {
  const toggled = ((ui && ui.collapsedPartySections) || new Set()).has(key);
  return defaultCollapsed ? !toggled : toggled;
}
function partySectionHeaderHtml(key, title, collapsed, headerExtra = '') {
  return `<div class="statblock-head" style="margin-top: var(--sp-4);">
    <button type="button" class="party-section-toggle" data-party-section-toggle="${esc(key)}">${collapsed ? '▸' : '▾'} ${esc(title)}</button>
    ${headerExtra}
  </div>`;
}

function party(doc, ui = {}) {
  const members = listPartyMembers(doc);
  const trackers = listPartyTrackers(doc);
  const memberCards = members.map((e) => partyMemberCard(e, doc, ui)).join('');

  const isStarforged = ((doc.settings && doc.settings.statRuleset) || 'starforged') === 'starforged';
  const trackersEditOpen = !!ui.partyTrackersEditOpen;
  const trackerRows = trackers.map((t) => partyTrackerRow(t, trackersEditOpen)).join('');
  const party_ = doc.party || {};
  const sharedGearKey = 'party:sharedGear';
  const sharedAssetChips = (party_.sharedAssets || []).map((a, i) => `
    <span class="chip sm">${esc(a)} <button type="button" class="icon-btn" data-party-shared-asset-remove="${i}" title="Remove">✕</button></span>`).join('');
  // Real Asset entities (vehicles, from the "+Vehicle" picker) — distinct
  // from the free-text chips below, these render as real photo thumbnails
  // (direct follow-up request: "needs to be a thumbnail like other NPC
  // entity thumbnails") and open the Entity Editor.
  const sharedAssetVehicleThumbs = (party_.sharedAssetIds || []).map((id) => sharedAssetVehicleThumb(doc, id)).join('');
  // Direct follow-up request: "Hide the cargo manifest unless there is a
  // vehicle under shared assets" — sharedAssetIds is entity-type-agnostic
  // (vehicles/items/assets all land in the same list, see commitEntityPickerPick's
  // own comment on this), so this checks each linked entity's own #vehicle
  // tag directly rather than assuming every id in the list is a vehicle.
  const hasSharedVehicle = (party_.sharedAssetIds || []).some((id) => {
    const linked = getEntity(doc, id);
    return linked && (linked.tags || []).includes('vehicle');
  });

  // Direct follow-up request: "by default, the section headers for [Campaign
  // and Party] should all be collapsed" — every OTHER Party section shares
  // this collapsed-by-default baseline (still per-section toggleable, and
  // the panel title's own collapse-all/expand-all still works the same
  // way). The Party members themselves always show (direct follow-up
  // request: "removing the Party Roster subheader to always show party
  // members") — their "Party" header is a plain label, not a collapse
  // toggle, carrying the ＋ picker for Character-tagged NPCs (pick an NPC
  // to tag #character, or create one already tagged Character).
  const trackersCollapsed = isPartySectionCollapsed(ui, 'trackers', true);
  const sharedAssetsCollapsed = isPartySectionCollapsed(ui, 'sharedAssets', true);
  const sharedGearCollapsed = isPartySectionCollapsed(ui, 'sharedGear', true);
  const membersHead = '<div class="statblock-head party-members-head"><h4>Party</h4>'
    + '<button class="icon-btn" data-entity-picker-open="party-add-character" title="Add a Character — pick an existing NPC to tag #character, or create a new one already tagged Character. Tagging an NPC #character in Cast, or dragging one in here, does the same.">＋</button></div>';

  return `
    ${membersHead}
    <div class="party-member-list" data-drop-party>
      ${memberCards || '<p class="ws-placeholder">No party members yet. Add one with ＋, tag an existing NPC #character in Cast, or drag one in here.</p>'}
    </div>
    ${partyStarshipSectionHtml(doc, ui)}
    ${partySectionHeaderHtml('trackers', 'Party Trackers', trackersCollapsed, `${ui.partyTrackerAddOpen ? '' : '<button class="icon-btn" data-party-tracker-add-toggle title="Add tracker">＋</button>'}<button class="icon-btn" data-party-trackers-edit-toggle title="${trackersEditOpen ? 'Done editing' : 'Edit trackers (rename, remove)'}">${trackersEditOpen ? '💾' : '✎'}</button>`)}
    ${trackersCollapsed ? '' : `
    ${ui.partyTrackerAddOpen ? partyTrackerAddForm(ui, isStarforged) : ''}
    <div class="party-tracker-list">
      ${trackerRows || '<p class="ws-placeholder">No trackers yet — add one for credits, supply, or any shared resource.</p>'}
    </div>`}
    ${partySectionHeaderHtml('sharedGear', 'Shared Gear', sharedGearCollapsed, richToolbarToggleHTML(sharedGearKey, toolbarCollapsed(doc, ui, sharedGearKey)))}
    ${sharedGearCollapsed ? '' : `<div class="rich-field">${richToolbarHTML(sharedGearKey, toolbarCollapsed(doc, ui, sharedGearKey), { includeToggle: false })}<div class="mention-editor" contenteditable="true" data-party-field="sharedGear" data-placeholder="A shared toolkit, the ship's medkit, anything not tied to one character…">${buildMentionEditorHTML(doc, party_.sharedGear)}</div></div>`}
    ${partySectionHeaderHtml('sharedAssets', 'Shared Assets', sharedAssetsCollapsed, `<button class="chip" data-entity-picker-open="party-shared-asset">＋ Shared Asset</button>`)}
    ${sharedAssetsCollapsed ? '' : `
    ${sharedAssetVehicleThumbs ? `<div class="actor-thumb-row">${sharedAssetVehicleThumbs}</div>` : ''}
    <div class="entity-chips">${sharedAssetChips || (sharedAssetVehicleThumbs ? '' : '<span class="dim small">None yet.</span>')}</div>
    <div class="entity-add-row"><input class="doc-tag-input" data-party-shared-asset-input placeholder="Add a shared asset…"></div>`}
    ${hasSharedVehicle ? cargoManifestSection(doc, ui, { collapsible: true }) : ''}
    ${partyRelationshipsSectionHtml(doc, ui)}`;
}

// --- Colony: 5PFH Planetfall turn sheet + crew roster + lifeform filter ----
function colonyFieldHtml(doc, ui, fields, f) {
  const v = fields[f.key];
  if (f.type === 'textarea') {
    const toolbarKey = `colony:${f.key}`;
    // Direct request: Colony's rich-text fields (Condition Notes/Notes —
    // Enemy Information/Mission Data were converted to number fields per a
    // later direct follow-up request, "like Grunts") start with their
    // formatting toolbar collapsed regardless of the app-wide "Formatting
    // toolbars start collapsed" setting — force the default to true here
    // (reusing toolbarCollapsed's own session-override XOR logic unchanged)
    // rather than touching that global setting, which every OTHER rich
    // field in the app still respects.
    const collapsed = toolbarCollapsed({ ...doc, settings: { ...doc.settings, toolbarCollapsedByDefault: true } }, ui, toolbarKey);
    // Real bug, direct report: a <label> wrapping a <button> (the toggle)
    // makes the browser treat that button as the label's implicitly-
    // associated control — clicking ANYWHERE in the label (including
    // directly on the contenteditable .mention-editor below) also
    // synthesizes a click on the toggle, which explains "clicking the
    // textbox... activates the texteditor menu to open and close but
    // doesn't allow selecting and adding text" (the toggle's own click
    // handler triggers a full render(), tearing down the very node the
    // click just tried to focus). Plain <div> instead — every other
    // corner-toggle-converted field already uses <div>/<span>, this was
    // the one holdout still using <label> with no CSS depending on the tag.
    return `<div class="field-label"><span class="field-label-row">${esc(f.label)}${richToolbarToggleHTML(toolbarKey, collapsed)}</span><div class="rich-field">${richToolbarHTML(toolbarKey, collapsed, { includeToggle: false })}<div class="mention-editor" contenteditable="true" data-colony-field="${f.key}">${buildMentionEditorHTML(doc, v)}</div></div></div>`;
  }
  if (f.type === 'number') {
    return `<label class="field-label">${esc(f.label)}${numStepper(`<input type="number" data-colony-field="${f.key}" value="${esc(v == null ? '' : v)}">`)}</label>`;
  }
  return `<label class="field-label">${esc(f.label)}<input type="text" data-colony-field="${f.key}" value="${esc(v == null ? '' : v)}"></label>`;
}

// Turn Step widget (design/adr/rules-profiles-multi-campaign.md, direct
// follow-up request): ◂/▸ walks getCurrentTurnStep's live position for the
// given SLOT ('colony'/'starship'/'warband' — direct follow-up request:
// the Campaign panel's tabs each walk their own assigned Turn Step List
// independently) — quietly shows "—" with both arrows disabled when that
// slot has no list assigned, rather than erroring or showing an irrelevant
// control. Next stays enabled even once hasNext goes false (the true end
// of the workflow) — direct follow-up request: shell.js's click handler
// catches that case and asks "Do you want to start the next Campaign
// Turn?" instead of just no-op'ing a disabled button.
const TURN_STEP_NAV_ATTRS = {
  colony: ['data-turn-step-prev', 'data-turn-step-next'],
  starship: ['data-starship-turn-step-prev', 'data-starship-turn-step-next'],
  warband: ['data-warband-turn-step-prev', 'data-warband-turn-step-next'],
};
function colonyTurnStepWidgetHtml(currentStep, slot = 'colony') {
  const [prevAttr, nextAttr] = TURN_STEP_NAV_ATTRS[slot] || TURN_STEP_NAV_ATTRS.colony;
  return `
    <label class="field-label">Turn Step
      <span class="turn-step-nav">
        <button type="button" class="icon-btn" ${prevAttr} title="Previous Step" ${currentStep && currentStep.hasPrev ? '' : 'disabled'}>◂</button>
        <b class="turn-step-current">${currentStep ? `${esc(currentStep.group.label)} ${currentStep.index + 1}/${currentStep.total}` : '—'}</b>
        <button type="button" class="icon-btn" ${nextAttr} title="${currentStep && !currentStep.hasNext ? 'Start the next Campaign Turn' : 'Next Step'}" ${currentStep ? '' : 'disabled'}>▸</button>
      </span>
    </label>`;
}

// Crew Tasks box (design/adr/rules-profiles-multi-campaign.md) — rendered
// for any Turn Step flagged showCrewTasks. Tasks come from the active Rules
// Profile's crewTasks.tasks; each row's pick is per-campaign play state
// (crewTaskProgress.assignments, reset every Campaign Turn).
// Crew Tasks: one row per Party member — pick their task, read its rules
// (shown right under the row once picked), then ▶ Start performs it: the
// task and its rules go to the Journal (without leaving this panel) and the
// member is marked done for this Campaign Turn, so it can't run twice.
function crewTaskBoxHtml(doc, ui) {
  const tasks = (doc.crewTasks && doc.crewTasks.tasks) || [];
  if (!tasks.length) {
    return '<div class="crew-task-box"><h4>Crew Tasks</h4><p class="dim small">No crew tasks configured for this Rules Profile yet — add some in Settings → Modules → Crew Tasks.</p></div>';
  }
  const rows = crewTaskRows(doc);
  if (!rows.length) {
    return '<div class="crew-task-box"><h4>Crew Tasks</h4><p class="dim small">No Party members yet — add Characters on the Party panel to assign them tasks.</p></div>';
  }
  const body = rows.map(({ member, taskId, task, done }) => {
    const options = '<option value="">Pick a task…</option>' + tasks.map((t) => '<option value="' + esc(t.id) + '" ' + (t.id === taskId ? 'selected' : '') + '>' + esc(t.label) + '</option>').join('');
    const action = done
      ? '<span class="chip sm crew-task-done" title="Already performed this Campaign Turn">✓ Done</span>'
      : '<button type="button" class="btn ghost sm" data-crew-task-start="' + esc(member.id) + '" ' + (task ? '' : 'disabled') + ' title="' + (task ? 'Resolve ' + esc(task.label) + ' — logs it to the Journal' : 'Pick a task first') + '">▶ Start</button>';
    const rules = task ? '<tr class="crew-task-rules-row"><td colspan="3"><div class="crew-task-description">' + buildMentionEditorHTML(doc, task.text) + '</div></td></tr>' : '';
    return '<tr class="' + (done ? 'crew-task-row-done' : '') + '"><td class="crew-task-member">' + esc(member.name || 'Unnamed') + '</td>'
      + '<td><select data-crew-task-assign="' + esc(member.id) + '" ' + (done ? 'disabled' : '') + ' aria-label="Task for ' + esc(member.name || 'Unnamed') + '">' + options + '</select></td>'
      + '<td class="crew-task-action">' + action + '</td></tr>' + rules;
  }).join('');
  return `
    <div class="crew-task-box">
      <h4>Crew Tasks</h4>
      <ol class="crew-task-steps dim small">
        <li>Pick a task for each crew member.</li>
        <li>▶ Start resolves it — its rules and result go to the Journal.</li>
        <li>Each crew member performs one task per Campaign Turn (✓ Done until the next turn).</li>
      </ol>
      <table class="crew-task-table">
        <thead><tr><th>Crew member</th><th>Task</th><th></th></tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
}

// A Crew Roster row's character slot (direct follow-up request: "replace
// the dropdowns of character names to use a thumbnail just like displayed
// in the Protagonists section on the Composer" — the role dropdown right
// next to it is untouched). Same .actor-thumb-wrap/-circle/-photo/-name/
// -badge markup Composer's own actorThumb (workspace/index.js) uses —
// duplicated here rather than imported, since drawers/index.js can't
// import FROM workspace/index.js without a circular dependency (that
// module already imports from this one). Unassigned shows a plain "+"
// circle opening the same picker the Crew Roster header's ＋ uses, scoped to just this row
// (colony-crew-assign::<rowId>) instead of adding a new one; assigned
// shows the real photo (click opens the entity editor, same as any other
// Composer thumbnail) plus a small remove badge that unassigns just this
// row's character — leaving the row and its role alone — distinct from
// the row's own separate, confirmed "remove this row entirely" button. A
// filled thumb is also draggable (direct follow-up request — "needs to
// also work from the Crew Roster" for the Combat Initiative Tracker),
// same ENTITY_DRAG_TYPE Cast/Party Roster's own thumbnails already carry.
function crewCharacterThumb(doc, rowId, characterId) {
  const entity = characterId ? getEntity(doc, characterId) : null;
  if (!entity) {
    return `<button type="button" class="actor-thumb actor-thumb-add" data-entity-picker-open="colony-crew-assign::${esc(rowId)}" title="Select a character">＋</button>`;
  }
  const img = entity.thumbnailId ? getGalleryImage(doc, entity.thumbnailId) : null;
  const photo = img
    ? `<img class="actor-thumb-photo" src="${esc(img.dataUrl)}" alt="">`
    : `<span class="actor-thumb-photo actor-thumb-photo-empty" aria-hidden="true">${esc((entity.name || '?').trim().charAt(0).toUpperCase() || '?')}</span>`;
  return `<div class="actor-thumb-wrap">
    <div class="actor-thumb-circle">
      <button type="button" class="actor-thumb" draggable="true" data-drag-entity="${esc(entity.id)}" data-open-entity="${esc(entity.id)}" title="${esc(entity.name || 'Unnamed')}">${photo}</button>
      <button type="button" class="actor-thumb-badge actor-thumb-badge-remove" data-colony-crew-unassign="${esc(rowId)}" title="Unassign">✕</button>
    </div>
    <span class="actor-thumb-name">${esc(entity.name || 'Unnamed')}</span>
  </div>`;
}

// A Lifeform Encounters row's thumbnail (direct follow-up request: "add a
// #lifeform thumbnail... between the index number and the text field. This
// replaces the '+' and its functionality at the end of the row") — same
// crewCharacterThumb shape immediately above: unassigned shows a dashed
// "+" circle opening the existing colony-encounter::<rowId> entity picker
// (shell.js's renderEntityPickerOverlay prepends a "Create New Lifeform"
// option there — the Generating Lifeforms, p.146, roll path); assigned
// shows the real photo (click opens the entity editor) plus a remove badge
// reusing the already-wired data-colony-encounter-detach handler (clears
// just this row's entityId, leaving its note and the row itself alone). A
// filled thumb is also draggable (direct follow-up request — "should also
// drag-drop onto the combat tracker or the dice roller"), same
// ENTITY_DRAG_TYPE Cast/Party Roster/Crew Roster's own thumbnails carry.
function lifeformEncounterThumb(doc, rowId, entityId) {
  const entity = entityId ? getEntity(doc, entityId) : null;
  if (!entity) {
    return `<button type="button" class="actor-thumb actor-thumb-add" data-entity-picker-open="colony-encounter::${esc(rowId)}" title="Select or generate a Lifeform">＋</button>`;
  }
  const img = entity.thumbnailId ? getGalleryImage(doc, entity.thumbnailId) : null;
  const photo = img
    ? `<img class="actor-thumb-photo" src="${esc(img.dataUrl)}" alt="">`
    : `<span class="actor-thumb-photo actor-thumb-photo-empty" aria-hidden="true">${esc((entity.name || '?').trim().charAt(0).toUpperCase() || '?')}</span>`;
  return `<div class="actor-thumb-wrap">
    <div class="actor-thumb-circle">
      <button type="button" class="actor-thumb" draggable="true" data-drag-entity="${esc(entity.id)}" data-open-entity="${esc(entity.id)}" title="${esc(entity.name || 'Unnamed')}">${photo}</button>
      <button type="button" class="actor-thumb-badge actor-thumb-badge-remove" data-colony-encounter-detach="${esc(rowId)}" title="Detach entity">✕</button>
    </div>
    <span class="actor-thumb-name">${esc(entity.name || 'Unnamed')}</span>
  </div>`;
}

// The Colony tab (direct follow-up request — "the Colony panel" renamed
// "Campaign," gains a Colony/Starship tab pair; "all the current
// functionality remains on the Colony tab"): everything this panel already
// did — Colony Name, Campaign Turn/Turn Step (now explicitly slot
// 'colony', driven by whichever Turn Step List is assigned to it), Colony
// Turn Sheet, Crew Roster, Lifeform Encounters — unchanged, just extracted
// out of the old colony() into its own function so colony() (below) can
// dispatch between this and starshipTabHtml.
function colonyTabHtml(doc, ui = {}) {
  const fields = getColonyFields(doc);
  const crew = listCrewRows(doc);
  const lifeforms = listLifeformEncounters(doc);

  // Colony Name is rendered separately, above the Turn Sheet header (direct
  // follow-up request) — always visible regardless of the Turn Sheet's own
  // collapsed state, so it stays out of the grid below entirely.
  const nameField = COLONY_FIELDS.find((f) => f.key === 'name');
  const nameFieldHtml = nameField ? colonyFieldHtml(doc, ui, fields, nameField) : '';

  const currentStep = getCurrentTurnStep(doc, 'colony');
  // Step Text — rendered through the exact same mention-link machinery
  // Journal/Guide/Colony's own rich fields already use, so a doc link in
  // it is a real clickable [data-doc-open] span; data-turn-step-text-body on
  // the wrapper is how shell.js tells THIS doc link apart from every other
  // one in the app, to open it in the right-two-section position instead
  // of the default. "Start" is a placeholder — the step's own ruleset is
  // TBD, this just acknowledges the click honestly.
  const stepTextHtml = currentStep ? `
    <div class="turn-step-text-row">
      <div class="turn-step-text-body" data-turn-step-text-body>${buildMentionEditorHTML(doc, currentStep.step.text)}</div>
      <button type="button" class="btn ghost sm" data-turn-step-start title="Log this step to the Journal">▶ Start</button>
    </div>` : '';
  // Crew Tasks box (design/adr/rules-profiles-multi-campaign.md, direct
  // follow-up request: "make the Crew Tasks a reusable functionality for
  // other Turn Steps to be added later") — attached via a step's own
  // showCrewTasks flag (turnSteps.js's setTurnStepShowCrewTasks, toggled
  // per step in Settings > Turn Step) rather than a hardcoded step id, so
  // any step — existing or GM-typed later — can carry the box, not just
  // dl2. Below Step Text, still inside .colony-fields (spans full width,
  // .colony-fields .crew-task-box's own grid-column rule).
  const crewTaskBox = currentStep && currentStep.step.showCrewTasks ? crewTaskBoxHtml(doc, ui) : '';
  // Campaign Turn + the Turn Step widget sit right next to each other in
  // one spanning flex row (.colony-turn-row) that packs them close together
  // by actual content width, not a 1fr grid column each (that pinned Turn
  // Step to the 50% column line regardless of how narrow Campaign Turn's
  // own content was, leaving a big dead gap between them — direct
  // follow-up request: "move the Turn Step button more to the left, aligned
  // to Campaign Turn"), followed by Step Text. Direct follow-up request
  // ("move Campaign Turn, Turn Step and the... turn step description above
  // the Colony Turn Sheet section header"): this whole cluster (below,
  // campaignTurnRowHtml) now renders BEFORE the collapsible "Colony Turn
  // Sheet" header instead of inside its .colony-fields grid — so the
  // current turn/step/description stays visible even with that section
  // collapsed. fieldRows (Campaign Milestones onward) is what's left inside
  // the collapsible grid.
  const fieldRows = COLONY_FIELDS.filter((f) => f.key !== 'name' && f.key !== 'campaignTurn').map((f) => colonyFieldHtml(doc, ui, fields, f)).join('');
  const campaignTurnField = COLONY_FIELDS.find((f) => f.key === 'campaignTurn');
  const campaignTurnRowHtml = `
    <div class="colony-turn-row">
      ${colonyFieldHtml(doc, ui, fields, campaignTurnField)}
      ${colonyTurnStepWidgetHtml(currentStep)}
    </div>
    <hr class="field-divider">
    ${stepTextHtml}
    ${crewTaskBox}`;

  const crewRows = crew.map((row) => `
    <div class="colony-crew-row">
      ${crewCharacterThumb(doc, row.id, row.characterId)}
      <select data-colony-crew-field="${esc(row.id)}::role">
        <option value="">— Role —</option>
        ${CREW_ROLES.map((r) => `<option value="${esc(r.id)}" ${r.id === row.role ? 'selected' : ''}>${esc(r.label)}</option>`).join('')}
      </select>
      <button class="icon-btn" data-colony-crew-remove="${esc(row.id)}" title="Remove">✕</button>
    </div>`).join('');

  const lifeformRows = lifeforms.map((e) => `
    <button class="entity-chip" data-open-entity="${esc(e.id)}">${esc(e.name) || 'Unnamed'}</button>`).join('');

  // Encounters log (direct follow-up request — "follow the rules and
  // workflow for Encounters in the 5PFH Planetfall rules"): a fixed 10
  // GM-authored rows (direct follow-up request: "default to 10 rows",
  // matching the physical rulebook table — no more add/remove-row controls,
  // just a permanent numbered grid backfilled by migrate.js/seeded by
  // schema.js), each row now reproducing the rulebook's own three-column
  // "Campaign Lifeform Encounters table" shape (direct follow-up request):
  // a fixed % range (lifeformEncounterRangeLabel, domain/lifeforms.js —
  // the SAME ranges the header's own 🎲 roller resolves against), the 1-10
  // index, a Composer-style thumbnail (lifeformEncounterThumb, below —
  // replaces the old trailing "+"/entity-chip pair) and the free-text
  // note. Distinct from the always-on #lifeform/type filter below
  // (listLifeformEncounters), which stays untouched as a separate
  // "everything tagged/typed Lifeform" view.
  const encounters = listColonyEncounters(doc);
  const encounterRows = encounters.map((row, i) => `
    <div class="colony-encounter-row">
      <span class="colony-encounter-range">${esc(lifeformEncounterRangeLabel(i))}</span>
      <span class="colony-encounter-index">${i + 1}.</span>
      ${lifeformEncounterThumb(doc, row.id, row.entityId)}
      <textarea rows="1" data-colony-encounter-field="${esc(row.id)}::note" placeholder="Encounter…">${esc(row.note)}</textarea>
    </div>`).join('');

  // Direct follow-up request: "by default, the section headers for [Campaign
  // and Party] should all be collapsed" — every Colony-tab section now
  // shares that same collapsed-by-default baseline (previously all four
  // defaulted open; the panel already force-collapsed them on every open/
  // tab-switch regardless, so this just makes that the real resting state
  // too, not just a forced one).
  const turnSheetCollapsed = isPartySectionCollapsed(ui, 'colonyTurnSheet', true);
  const campaignGuideCollapsed = isPartySectionCollapsed(ui, 'campaignGuide', false);
  const crewRosterCollapsed = isPartySectionCollapsed(ui, 'crewRoster', true);
  const lifeformEncountersCollapsed = isPartySectionCollapsed(ui, 'lifeformEncounters', true);
  return `
    ${nameFieldHtml}
    ${partySectionHeaderHtml('campaignGuide', 'Campaign Guide', campaignGuideCollapsed)}
    ${campaignGuideCollapsed ? '' : campaignTurnRowHtml}
    ${partySectionHeaderHtml('colonyTurnSheet', 'Colony Turn Sheet', turnSheetCollapsed, helpToggle('colony-turn-sheet'))}
    ${helpBody('colony-turn-sheet', 'Five Parsecs from Home Planetfall campaign-turn tracker.', ui)}
    ${turnSheetCollapsed ? '' : `<div class="colony-fields">${fieldRows}</div>`}
    ${partySectionHeaderHtml('crewRoster', 'Crew Roster', crewRosterCollapsed, '<button class="icon-btn" data-entity-picker-open="colony-crew" title="Add a crew member" aria-label="Add a crew member">＋</button>')}
    ${crewRosterCollapsed ? '' : `<div class="colony-crew-list">${crewRows || '<p class="ws-placeholder">No crew rows yet.</p>'}</div>`}
    ${partySectionHeaderHtml('lifeformEncounters', 'Lifeform Encounters', lifeformEncountersCollapsed, '<button type="button" class="icon-btn" data-lifeform-encounter-roll title="Roll D100 on the Campaign Lifeform Encounters table (Planetfall p.146)">🎲</button>')}
    ${lifeformEncountersCollapsed ? '' : `
    <div class="colony-encounter-list">
      ${encounterRows}
    </div>
    <p class="dim small">All Lifeform entities in Cast:</p>
    <div class="entity-chips">
      ${lifeformRows || '<p class="ws-placeholder">No lifeform encounters tracked yet — tag a Cast entity #lifeform.</p>'}
    </div>`}`;
}

// The Starship tab (direct follow-up request — plays the base 5PFH game,
// distinct from Colony's own Planetfall content): a thumbnail+name row for
// the single #starship-tagged entity (Party's own Starship section, below,
// is the canonical place that ASSIGNS it — see partyStarshipSectionHtml —
// this tab just displays/edits whatever's currently assigned, same
// "reference by id" shape Colony's own Crew Roster already uses for
// entities), plus its own independent Campaign Turn (party.
// starshipCampaignTurn — direct follow-up request: a separate counter, no
// Planetfall accrual) and Turn Step widget (slot 'starship').
function starshipThumbnailRowHtml(doc) {
  const entityId = doc.party && doc.party.starshipEntityId;
  const entity = entityId ? getEntity(doc, entityId) : null;
  const photoHtml = entity
    ? (() => {
        const img = entity.thumbnailId ? getGalleryImage(doc, entity.thumbnailId) : null;
        const inner = img
          ? `<img class="gallery-thumb-circle" src="${esc(img.dataUrl)}" alt="">`
          : `<span class="gallery-thumb-circle gallery-thumb-circle-empty" aria-hidden="true">${esc((entity.name || '?').trim().charAt(0).toUpperCase() || '?')}</span>`;
        return `<div class="inspector-photo"><button type="button" class="gallery-thumb-circle-btn" data-open-entity="${esc(entity.id)}" title="Open ${esc(entity.name || 'Unnamed')}">${inner}</button></div>`;
      })()
    : `<div class="inspector-photo"><button type="button" class="inspector-photo-empty" data-entity-picker-open="party-starship" title="Select a starship">＋ Select Starship</button></div>`;
  return `
    <div class="inspector-photo-row">
      ${photoHtml}
      <div class="inspector-photo-fields">
        <label class="field-label">Starship Name
          <input type="text" data-starship-name-field value="${esc(entity ? entity.name : '')}" placeholder="${entity ? 'Unnamed' : 'No starship selected'}" ${entity ? '' : 'disabled'}>
        </label>
      </div>
    </div>`;
}
function starshipTabHtml(doc, ui = {}) {
  const currentStep = getCurrentTurnStep(doc, 'starship');
  const turn = (doc.party && doc.party.starshipCampaignTurn) || 0;
  // Step Text (direct follow-up request: "add the Turn Step description
  // field under the Campaign Turn row on Starship tab") — same
  // mention-linked rendering/markup Colony's own stepTextHtml uses
  // (data-turn-step-text-body on the wrapper is how shell.js opens a doc
  // link from it in the right-two-section position), just its own
  // data-starship-turn-step-start attribute so its "Start" click doesn't
  // collide with Colony's.
  const stepTextHtml = currentStep ? `
    <div class="turn-step-text-row">
      <div class="turn-step-text-body" data-turn-step-text-body>${buildMentionEditorHTML(doc, currentStep.step.text)}</div>
      <button type="button" class="btn ghost sm" data-starship-turn-step-start title="Log this step to the Journal">▶ Start</button>
    </div>` : '';
  // Direct follow-up request: "Put the Campaign Turn row and Turn Step
  // description row under a 'Campaign Header' section header on the
  // Starship tab like on the Colony tab" — same partySectionHeaderHtml
  // wrapper Colony's own campaignTurnRowHtml uses, under its own
  // 'starshipCampaignGuide' key so the two tabs' collapsed states stay
  // independent (each tab already keeps its own turn/step state separate —
  // starshipCampaignTurn vs colony's campaignTurn — this follows the same
  // "same label, separate state" pattern).
  const campaignGuideCollapsed = isPartySectionCollapsed(ui, 'starshipCampaignGuide', false);
  return `
    ${starshipThumbnailRowHtml(doc)}
    ${partySectionHeaderHtml('starshipCampaignGuide', 'Campaign Guide', campaignGuideCollapsed)}
    ${campaignGuideCollapsed ? '' : `
    <div class="colony-turn-row">
      <label class="field-label">Campaign Turn
        ${numStepper(`<input type="number" data-starship-campaign-turn value="${turn}">`)}
      </label>
      ${colonyTurnStepWidgetHtml(currentStep, 'starship')}
    </div>
    <hr class="field-divider">
    ${stepTextHtml}
    ${currentStep && currentStep.step.showCrewTasks ? crewTaskBoxHtml(doc, ui) : ''}`}`;
}

// The Warband tab (Five Leagues from the Borderlands) — same Campaign
// Turn counter + Turn Step widget shape as starshipTabHtml above, but with
// NO thumbnail/entity-picker row: a warband is the whole roster (already
// visible via Cast/Party), not one reference-by-id entity like the
// Starship tab's single #starship-tagged ship.
function warbandTabHtml(doc, ui = {}) {
  const currentStep = getCurrentTurnStep(doc, 'warband');
  const turn = (doc.party && doc.party.warbandCampaignTurn) || 0;
  const stepTextHtml = currentStep ? `
    <div class="turn-step-text-row">
      <div class="turn-step-text-body" data-turn-step-text-body>${buildMentionEditorHTML(doc, currentStep.step.text)}</div>
      <button type="button" class="btn ghost sm" data-warband-turn-step-start title="Log this step to the Journal">▶ Start</button>
    </div>` : '';
  const campaignGuideCollapsed = isPartySectionCollapsed(ui, 'warbandCampaignGuide', false);
  return `
    ${partySectionHeaderHtml('warbandCampaignGuide', 'Campaign Guide', campaignGuideCollapsed)}
    ${campaignGuideCollapsed ? '' : `
    <div class="colony-turn-row">
      <label class="field-label">Campaign Turn
        ${numStepper(`<input type="number" data-warband-campaign-turn value="${turn}">`)}
      </label>
      ${colonyTurnStepWidgetHtml(currentStep, 'warband')}
    </div>
    <hr class="field-divider">
    ${stepTextHtml}
    ${currentStep && currentStep.step.showCrewTasks ? crewTaskBoxHtml(doc, ui) : ''}`}`;
}

// The Campaign panel (direct follow-up request: "Rename the Colony panel
// to Campaign and add two right-aligned links/buttons that enable separate
// tabs of content... Colony and Starship") — same click-based internal
// tab-strip pattern World Tracker/Settings already use, right-aligned per
// the request (a modifier on the shared .settings-tab-bar class). Each tab
// is a Turn Step walkthrough, so it shows only while its system is what a
// Turn-Step gameplay area resolves to (isTurnStepSystemActive — Colony via
// Colony management, Starship/Warband via Campaign turn). If the selected
// tab becomes hidden this way, falls back to whichever tab is still visible.
const COLONY_PANEL_TABS = [
  { id: 'colony', label: 'Colony', system: 'planetfall' },
  { id: 'starship', label: 'Starship', system: 'fivepfh' },
  { id: 'warband', label: 'Warband', system: 'fiveleagues' },
];
const COLONY_PANEL_TAB_RENDERERS = { colony: colonyTabHtml, starship: starshipTabHtml, warband: warbandTabHtml };
function colony(doc, ui = {}) {
  // Turn-Step tabs follow what Campaign turn / Colony management actually resolve to.
  const visibleTabs = COLONY_PANEL_TABS.filter((t) => isTurnStepSystemActive(doc, t.system));
  if (!visibleTabs.length) return '<p class="ws-placeholder">Colony, Starship, and Warband are all currently deactivated — enable Planetfall, Five Parsecs from Home, and/or Five Leagues from Borderlands under Settings → Licenses → Game System Activation.</p>';
  const activeTab = visibleTabs.some((t) => t.id === ui.colonyPanelTab) ? ui.colonyPanelTab : visibleTabs[0].id;
  const tabBar = visibleTabs.length > 1 ? `<div class="settings-tab-bar align-right">${visibleTabs.map((t) => `
    <button class="btn ghost sm ${t.id === activeTab ? 'active' : ''}" data-colony-panel-tab="${t.id}" aria-selected="${t.id === activeTab}">${esc(t.label)}</button>`).join('')}</div>` : '';
  return `${tabBar}${(COLONY_PANEL_TAB_RENDERERS[activeTab] || colonyTabHtml)(doc, ui)}`;
}

// --- Trade: Merchant Rules Lens (ADR 0003/0004) -----------------------------
// A market view per selected Location, the party's shared cargo manifest,
// and a Contracts board — contracts ARE Threads (domain/trade.js's
// listContracts filters campaign.threads by kind: 'contract'), so their
// clock/status/priority controls below are the exact same data-thread-*
// attributes the WHY workspace's own Threads block already wires up in
// shell.js — no new click handlers needed for those.
function marketTable(location) {
  const market = getMarket(location);
  const rows = COMMODITIES.map((c) => {
    const m = market[c.id];
    const price = priceAt(location, c.id);
    return `<tr>
      <td>${esc(c.label)}</td>
      <td>${numStepper(`<input type="number" min="0" max="100" class="trade-dial-input" data-trade-dial="${esc(location.id)}::${c.id}::supply" value="${m.supply}">`)}</td>
      <td>${numStepper(`<input type="number" min="0" max="100" class="trade-dial-input" data-trade-dial="${esc(location.id)}::${c.id}::demand" value="${m.demand}">`)}</td>
      <td class="trade-price">${price}</td>
      <td class="trade-buy-sell">
        ${numStepper(`<input type="number" min="1" value="1" class="trade-qty-input" data-trade-qty="${c.id}">`)}
        <button class="chip sm" data-trade-buy="${esc(location.id)}::${c.id}">Buy</button>
        <button class="chip sm" data-trade-sell="${esc(location.id)}::${c.id}">Sell</button>
      </td>
    </tr>`;
  }).join('');
  return `<table class="trade-market-table">
    <thead><tr><th>Commodity</th><th>Supply</th><th>Demand</th><th>Price</th><th>Trade</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

// Inline "+ Contract" creation form (a text field, not a window.prompt()
// popup — same convention Party Trackers established) — patron/origin/
// destination are optional entity pickers (a contract can exist before a
// route is decided; domain/trade.js's estimatePayout falls back to a flat
// default when they're blank).
function contractAddForm(locations, npcs) {
  return `<div class="trade-contract-add-form">
    <input type="text" class="trade-contract-draft-name" data-trade-contract-draft-name placeholder="Contract name">
    <input type="text" class="trade-contract-draft-type" data-trade-contract-draft-type placeholder="Type (e.g. Courier)">
    <select data-trade-contract-draft-patron>
      <option value="">— Patron (NPC) —</option>
      ${npcs.map((n) => `<option value="${esc(n.id)}">${esc(n.name) || 'Unnamed'}</option>`).join('')}
    </select>
    <select data-trade-contract-draft-origin>
      <option value="">— Origin —</option>
      ${locations.map((l) => `<option value="${esc(l.id)}">${esc(l.name) || 'Unnamed'}</option>`).join('')}
    </select>
    <select data-trade-contract-draft-destination>
      <option value="">— Destination —</option>
      ${locations.map((l) => `<option value="${esc(l.id)}">${esc(l.name) || 'Unnamed'}</option>`).join('')}
    </select>
    ${numStepper(`<input type="number" min="0" class="trade-contract-draft-payout" data-trade-contract-draft-payout placeholder="Payout" value="50">`)}
    <button class="btn sm" data-trade-contract-create>Create</button>
    <button class="icon-btn" data-trade-contract-add-cancel title="Cancel">✕</button>
  </div>`;
}

// A contract's name toggles the row collapsed to just its name (default
// collapsed — a Contracts board can get long; UX batch, ui.expandedContracts,
// same ephemeral Set shape used throughout this session). Collapsed, only
// the name + payout show; everything else (route, clock, status/priority,
// the new description/conflict/opportunity flavor fields, actions) is
// behind the toggle.
function contractRow(doc, c, ui) {
  const open = (ui.expandedContracts || new Set()).has(c.id);
  const pips = Array.from({ length: c.segments }, (_, i) => `<span class="pip ${i < c.filled ? 'on' : ''}"></span>`).join('');
  const patron = c.patronId && getEntity(doc, c.patronId);
  const origin = c.originId && getEntity(doc, c.originId);
  const destination = c.destinationId && getEntity(doc, c.destinationId);
  return `<div class="trade-contract-row thread-status-${esc(c.status)} thread-priority-${esc(c.priority)} ${c.done ? 'done' : ''}">
    <div class="trade-contract-head">
      <button type="button" class="trade-contract-name" data-contract-toggle="${esc(c.id)}">${open ? '▾' : '▸'} ${esc(c.name)}</button>
      ${c.type ? `<span class="chip sm">${esc(c.type)}</span>` : ''}
      <span class="trade-contract-payout">💰 ${c.payout}</span>
    </div>
    ${open ? `
    <div class="trade-contract-route">
      ${patron ? `<button class="entity-chip" data-open-entity="${esc(patron.id)}" title="Patron">${esc(patron.name) || 'Unnamed'}</button>` : '<span class="dim small">No patron set</span>'}
      ${origin || destination ? `<span class="dim small">${origin ? esc(origin.name) || 'Unnamed' : '?'} → ${destination ? esc(destination.name) || 'Unnamed' : '?'}</span>` : ''}
    </div>
    <label class="field-label sm">Description
      <textarea data-contract-field="${esc(c.id)}::description" rows="1" placeholder="What the job actually is…">${esc(c.description)}</textarea>
    </label>
    <label class="field-label sm">Conflict
      <textarea data-contract-field="${esc(c.id)}::conflict" rows="1" placeholder="What's working against the party…">${esc(c.conflict)}</textarea>
    </label>
    <label class="field-label sm">Opportunity
      <textarea data-contract-field="${esc(c.id)}::opportunity" rows="1" placeholder="What upside exists beyond the payout…">${esc(c.opportunity)}</textarea>
    </label>
    <span class="thread-clock" title="${c.filled}/${c.segments}">${pips}</span>
    <select class="thread-status-select" data-thread-status="${esc(c.id)}" title="Narrative lifecycle stage">
      ${THREAD_STATUSES.map((s) => `<option value="${s}" ${s === c.status ? 'selected' : ''}>${esc(THREAD_STATUS_LABELS[s])}</option>`).join('')}
    </select>
    <select class="thread-priority-select" data-thread-priority="${esc(c.id)}" title="Priority">
      ${THREAD_PRIORITIES.map((p) => `<option value="${p}" ${p === c.priority ? 'selected' : ''}>${p[0].toUpperCase()}${p.slice(1)}</option>`).join('')}
    </select>
    <span class="thread-actions">
      <button class="icon-btn" data-thread-adv="${esc(c.id)}" title="Advance">＋</button>
      <button class="icon-btn" data-thread-back="${esc(c.id)}" title="Set back">－</button>
      <button class="icon-btn" data-thread-del="${esc(c.id)}" title="Remove">✕</button>
    </span>
    ` : ''}
  </div>`;
}

// Cargo Manifest + Contracts (docs/adr/0003/0004) — extracted so both
// trade() and party() can render them identically (UX batch: "show Cargo
// Manifest and Contracts on Party too, for ease of access"). Both read
// party-wide data (listCargoManifest/listContracts aren't location-
// scoped), and every control inside (data-trade-buy, data-thread-*,
// data-trade-contract-*) is already read by attribute selector in
// shell.js, not container-scoped — rendering this markup a second time
// in a different drawer needs zero new handler code.
// `collapsible` (direct follow-up request, Party drawer only — "Make...
// Cargo Manifest and Contracts [collapsible]" alongside Party Roster/
// Trackers/Shared Assets) defaults false so trade()'s own call sites
// below are completely unaffected — the Trade drawer never asked to
// collapse these, only Party did, and both drawers share this exact
// markup (see the comment above trade()'s own calls).
function cargoManifestSection(doc, ui, { collapsible = false } = {}) {
  const manifest = listCargoManifest(doc);
  const collapsed = collapsible && isPartySectionCollapsed(ui, 'cargoManifest', true);
  const header = collapsible
    ? partySectionHeaderHtml('cargoManifest', 'Cargo Manifest', collapsed)
    : '<div class="statblock-head" style="margin-top: var(--sp-4);"><h4>Cargo Manifest</h4></div>';
  if (collapsed) return header;
  return `${header}
    <div class="trade-manifest-list">
      ${manifest.length ? manifest.map((row) => {
        const c = findCommodity(row.commodityId);
        return `<div class="trade-manifest-row"><span>${esc(c ? c.label : row.commodityId)}</span><b>${row.qty}</b></div>`;
      }).join('') : '<p class="ws-placeholder">No cargo yet — buy something from a Location\'s market on the Trade drawer.</p>'}
    </div>`;
}

// Direct follow-up request: "change 'Contracts' to 'Quests' on the Party
// panel for 'Fantasy (generic)' genre" — genre-aware, same "data label
// swap keyed by genrePack" posture as entityTypeLabel/bestiaryTerm, not a
// second parallel concept (Threads' own `kind: 'contract'` data shape is
// completely unchanged, only this display label). Scoped to the Party
// panel specifically, per the request's own wording — the Trade drawer's
// own Contracts section (this same function, `collapsible: false`) always
// reads "Contracts" regardless of genre, since Trade's Merchant framing
// (buy/sell markets, supply/demand) doesn't shift the same way.
function contractsLabel(genrePackId) {
  return genrePackId === 'fantasy' ? 'Quests' : 'Contracts';
}

// Direct follow-up request: "Move quests from Party panel to the
// Navigator" — exported so workspace/index.js's Navigator can render it
// too; party() itself no longer calls this at all. Still shared verbatim
// with trade()'s own (non-collapsible) call site below — same function,
// same markup, same already-generic (not container-scoped) data-trade-*/
// data-thread-* handlers, just one more caller.
export function contractsSection(doc, ui, { collapsible = false } = {}) {
  const locations = listEntities(doc, ['location']);
  const npcs = listEntities(doc, ['npc']);
  const contracts = listContracts(doc);
  const collapsed = collapsible && isPartySectionCollapsed(ui, 'contracts', true);
  const label = collapsible ? contractsLabel(doc.settings.genrePack) : 'Contracts';
  const headerActions = `<div class="trade-contract-head-actions">
        <button class="chip" data-trade-generate-contract title="Roll the Contract Type oracle table into a new contract">🎲 Generate</button>
        ${ui.tradeContractAddOpen ? '' : `<button class="chip" data-trade-contract-add-toggle>＋ ${esc(label.replace(/s$/, ''))}</button>`}
      </div>`;
  const header = collapsible
    ? partySectionHeaderHtml('contracts', label, collapsed, headerActions)
    : `<div class="statblock-head" style="margin-top: var(--sp-4);">
      <h4>${esc(label)}</h4>
      ${headerActions}
    </div>`;
  if (collapsed) return header;
  return `${header}
    ${ui.tradeContractAddOpen ? contractAddForm(locations, npcs) : ''}
    <div class="trade-contract-list">
      ${contracts.length ? contracts.map((c) => contractRow(doc, c, ui)).join('') : `<p class="ws-placeholder">No ${esc(label.toLowerCase())} yet — generate one, or add one manually.</p>`}
    </div>`;
}

function trade(doc, ui = {}) {
  const allLocations = listEntities(doc, ['location']);
  // Location tag filter (UX batch) — narrows the Location <select>
  // below, same idea as the Cast drawer's own tag filter chips, just a
  // single-select dropdown here since Trade only needs to pick ONE
  // Location at a time (no cumulative multi-tag filter needed).
  const tagVocab = listTagVocabulary(doc, 'location');
  const tagFilter = tagVocab.includes(ui.tradeLocationTagFilter) ? ui.tradeLocationTagFilter : '';
  const locations = tagFilter ? allLocations.filter((l) => (l.tags || []).includes(tagFilter)) : allLocations;
  const selectedId = ui.tradeLocationId && locations.some((l) => l.id === ui.tradeLocationId) ? ui.tradeLocationId : '';
  const selectedLocation = selectedId ? getEntity(doc, selectedId) : null;

  return `
    <div class="statblock-head"><h4>Merchant — Market</h4></div>
    <p class="dim small">Supply/demand at each Location drive price — buying drains supply and raises the next price there, selling floods it and lowers it, so two Locations never agree.</p>
    ${tagVocab.length ? `<label class="field-label">Filter by tag
      <select data-trade-location-tag-filter>
        <option value="">— all tags —</option>
        ${tagVocab.map((t) => `<option value="${esc(t)}" ${t === tagFilter ? 'selected' : ''}>#${esc(t)}</option>`).join('')}
      </select>
    </label>` : ''}
    <label class="field-label">Location
      <select data-trade-location>
        <option value="">— choose a Location —</option>
        ${locations.map((l) => `<option value="${esc(l.id)}" ${l.id === selectedId ? 'selected' : ''}>${esc(l.name) || 'Unnamed'}</option>`).join('')}
      </select>
    </label>
    ${selectedLocation ? marketTable(selectedLocation)
      : (locations.length ? '<p class="ws-placeholder">Pick a Location to see its market.</p>' : '<p class="ws-placeholder">No Locations match that tag.</p>')}
    ${cargoManifestSection(doc)}
    ${contractsSection(doc, ui)}`;
}

// --- Guide: a tree of freeform reference documents (docs/adr/0017) --------
// The active doc's title + editor render above the tree, same "one thing
// open at a time, pick from the list to switch" shape Entity Detail/Cast
// already use — the tree itself (below) is just for organizing/navigating,
// not a second place to edit text.
function guide(doc, ui = {}) {
  const active = getActiveGuideDoc(doc);
  const tree = buildGuideTree(doc);
  const renameOpen = ui.guideRenameOpen || new Set();
  const activeRenaming = renameOpen.has(active.id);
  const titleEl = activeRenaming
    ? `<input class="doc-rename-input" data-guide-rename-input="${esc(active.id)}" value="${esc(active.title)}" autofocus>`
    : `<input class="guide-title-input" data-guide-title-input value="${esc(active.title)}" placeholder="Untitled">`;
  return `
    ${helpBody('guide-intro', 'A table of contents for the campaign — <code>@Name</code> links a Cast entity, <code>@[Doc Name]</code> references a document (<code>@[Doc Name#12]</code> or <code>@[Doc Name p.12]</code> jumps to a page). Click a mention to open it; arrow-key the cursor into it to edit its label. Saves automatically. Drag a document below to reorganize the tree.', ui)}
    <div class="guide-doc-head">${titleEl}${richToolbarToggleHTML(`guide:${active.id}`, toolbarCollapsed(doc, ui, `guide:${active.id}`))}</div>
    <div class="rich-field">${richToolbarHTML(`guide:${active.id}`, toolbarCollapsed(doc, ui, `guide:${active.id}`), { includeToggle: false })}<div class="mention-editor guide-editor" contenteditable="true" data-guide-input data-guide-active="${esc(active.id)}" data-placeholder="Colony Builder — see @[5PFH Planetfall p.12] for the turn sheet.&#10;Meet @Captain Reyes in Docking Bay 3.">${buildMentionEditorHTML(doc, active.text)}</div></div>
    ${mechanicsIndexList(doc)}
    <div class="guide-tree-section">
      <div class="guide-tree-head">
        <h4>Guide Documents</h4>
        <button class="chip" data-guide-add-root title="Add a new top-level Guide document">＋ Root doc</button>
      </div>
      <div class="guide-tree-drop-root" data-drop-guide-node="__root__" title="Drag a document here to make it top-level">📄 Top level</div>
      <div class="guide-tree">${tree.map((node) => guideTreeRow(node, ui, active.id, 0)).join('')}</div>
    </div>`;
}

function guideTreeRow(node, ui, activeId, depth) {
  const expandedSet = ui.expandedGuideNodes || new Set();
  const renameOpen = ui.guideRenameOpen || new Set();
  const expanded = expandedSet.has(node.id);
  const renaming = renameOpen.has(node.id);
  const hasChildren = node.children.length > 0;
  const titleEl = renaming
    ? `<input class="doc-rename-input" data-guide-rename-input="${esc(node.id)}" value="${esc(node.title)}" autofocus>`
    : `<button type="button" class="guide-node-title ${node.id === activeId ? 'sel' : ''}" data-guide-node-select="${esc(node.id)}">${esc(node.title)}</button>`;
  const row = `
    <div class="guide-tree-row" style="padding-left: ${depth * 1.1}rem" draggable="true" data-drag-guide-node="${esc(node.id)}" data-drop-guide-node="${esc(node.id)}">
      <span class="entity-drag-handle" aria-hidden="true">⠿</span>
      ${hasChildren ? `<button type="button" class="guide-node-caret" data-guide-node-toggle="${esc(node.id)}">${expanded ? '▾' : '▸'}</button>` : '<span class="guide-node-caret-spacer"></span>'}
      ${titleEl}
      <span class="guide-node-actions">
        <button class="icon-btn" data-guide-node-rename="${esc(node.id)}" title="${renaming ? 'Save' : 'Rename'}" aria-label="Rename">${renaming ? '💾' : '✎'}</button>
        <button class="icon-btn" data-guide-node-add-child="${esc(node.id)}" title="Add a child document" aria-label="Add child">＋</button>
        <button class="icon-btn" data-guide-node-delete="${esc(node.id)}" title="Delete" aria-label="Delete">🗑</button>
      </span>
    </div>`;
  const childRows = (hasChildren && expanded) ? node.children.map((c) => guideTreeRow(c, ui, activeId, depth + 1)).join('') : '';
  return row + childRows;
}

// Game Mechanics Index (docs/adr/0014-mechanics-index-pdfjs.md) — the
// results of Settings' "🔄 Refresh Mechanics Index" PDF.js scan, as
// clickable page-anchored links reusing the SAME document-viewer tab
// mechanism a Guide/Journal @[Doc Name#12] mention already opens (ref:<file>
// + a page number) rather than a raw <a href> new-tab link, so a term click
// opens inline like every other document reference in this app.
function mechanicsIndexList(doc) {
  const entries = getMechanicsIndex(doc);
  if (!entries.length) return '';
  const rows = entries.map((e) => `
    <li><a href="#" class="doc-card-title-link" data-doc-open="ref:${esc(e.docFile)}" data-doc-open-page="${e.page}"><b>${esc(e.term)}</b> — ${esc(e.docTitle)} p.${e.page}</a></li>`).join('');
  return `
    <div class="guide-mechanics-index">
      <h4>Game Mechanics Index</h4>
      <ul class="build-notes">${rows}</ul>
    </div>`;
}

// Fixed layout coordinate space (matches computeLayout's default) — a large
// campaign's graph can have far more links than fit legibly at 1:1, so the
// SVG's viewBox (not these dimensions) is what actually zooms/pans; see
// shell.js's GRAPH_W/GRAPH_H (kept in sync with these two numbers), onWheel,
// onGraphMouseDown/Move/Up, and the data-graph-zoom buttons below.
function graph(doc, ui = {}) {
  // Direct follow-up request: "do not display any entities unless they
  // have an existing relationship" — buildGraph's own `degree` (a node's
  // relationship count) is already exactly what's needed; filtered here,
  // before computeLayout, so an isolated entity never enters the
  // force-directed layout at all (not just hidden after the fact).
  const gRaw = buildGraph(doc);
  const g = { nodes: gRaw.nodes.filter((n) => n.degree > 0), edges: gRaw.edges };
  if (!g.nodes.length) {
    return '<p class="ws-placeholder">No entities with a relationship yet. Link two entities (drag one onto another, or use "Find entity to link" in the Entity Editor) and they\'ll appear here as a graph.</p>';
  }
  const W = 600, H = 520;
  const pos = computeLayout(g, { width: W, height: H });
  const active = doc.entities && doc.entities.activeId;
  const view = ui.graphView || { scale: 1, x: 0, y: 0 };
  const viewBox = `${view.x.toFixed(1)} ${view.y.toFixed(1)} ${(W / view.scale).toFixed(1)} ${(H / view.scale).toFixed(1)}`;

  const edges = g.edges.map((e) => {
    const a = pos.get(e.a), b = pos.get(e.b);
    if (!a || !b) return '';
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    return `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" class="graph-edge"/>
      ${e.label ? `<text x="${mx.toFixed(1)}" y="${my.toFixed(1)}" class="graph-edge-label">${esc(e.label)}</text>` : ''}`;
  }).join('');

  // Graph filter ("USER CHANGES" QoL batch): highlights/dims rather than
  // removes matching nodes — a node's position depends on the WHOLE graph
  // (buildGraph/computeLayout, a force-directed layout), so hiding nodes
  // would reshuffle everything else on every keystroke; dimming leaves the
  // layout stable while still making a searched-for entity easy to spot in
  // a cluster.
  const filter = (ui.graphFilter || '').trim().toLowerCase();
  const nodes = g.nodes.map((n) => {
    const p = pos.get(n.id); if (!p) return '';
    const r = 9 + Math.min(10, n.degree * 2);
    const matches = filter ? n.name.toLowerCase().includes(filter) : null;
    const stateClass = matches === null ? '' : matches ? ' graph-node-match' : ' graph-node-dim';
    return `<g class="graph-node ${active === n.id ? 'sel' : ''}${stateClass}" data-graph-node="${esc(n.id)}" tabindex="0">
      <title>${esc(n.name)} · ${entityTypeLabel(n.type, doc.settings.genrePack)} · ${n.degree} link${n.degree === 1 ? '' : 's'}</title>
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r}" fill="${nodeColor(n.type)}"/>
      <text x="${p.x.toFixed(1)}" y="${(p.y + r + 12).toFixed(1)}" class="graph-node-label">${esc(clip(n.name, 18))}</text>
    </g>`;
  }).join('');

  const legend = ENTITY_TYPES.map((t) => `<span class="graph-legend-item"><span class="dot" style="background:${nodeColor(t)}"></span>${entityTypeLabel(t, doc.settings.genrePack)}</span>`).join('');

  return `
    <p class="dim small">Click a node to open it.</p>
    <div class="graph-legend">${legend}</div>
    <div class="graph-toolbar">
      <button class="icon-btn" data-graph-zoom="in" title="Zoom in">＋</button>
      <button class="icon-btn" data-graph-zoom="out" title="Zoom out">－</button>
      <button class="icon-btn" data-graph-zoom="reset" title="Reset zoom/pan">⟲</button>
      <input class="drawer-search" data-graph-filter value="${esc(ui.graphFilter || '')}" placeholder="Find in graph…">
      ${helpToggle('graph-toolbar-tip')}
    </div>
    ${helpBody('graph-toolbar-tip', 'Scroll to zoom, drag to pan — useful once a campaign has a lot of links. Type a name above to highlight it in a busy cluster.', ui)}
    <svg class="graph-svg" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Relationship graph — scroll to zoom, drag to pan">
      <g class="graph-edges">${edges}</g>
      <g class="graph-nodes">${nodes}</g>
    </svg>`;
}

function clip(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

export function formatBytes(n) {
  n = Number(n) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// Tag editor is collapsed behind the 🏷 toggle by default (small-footprint
// ask) — chips render smaller than a regular chip (.doc-tag-chip) when it's
// open; see the sizing in cockpit.css rather than here. The input commits on
// its own (shell.js's onChange/onKeydown) — picking a suggestion from the
// datalist or typing a new tag and tabbing/Enter-ing away both add it, no
// separate "+" click needed (Settings' entity tag editor already worked this
// way; this brings docs in line with it).
function docTagEditor(d) {
  const chips = (d.tags || []).map((t) => `
    <span class="doc-tag-chip">#${esc(t)} <button class="icon-btn" data-doc-tag-remove="${esc(d.id)}::${esc(t)}" title="Remove tag">✕</button></span>`).join('');
  return `
    <div class="doc-card-tags">
      ${chips}
      <input class="doc-tag-input" data-doc-tag-input="${esc(d.id)}" list="doc-tag-list" placeholder="add tag… (Enter/Tab to commit)">
    </div>`;
}

// Same shape as docTagEditor but for a Reference Library entry (keyed by its
// DOCS_MANIFEST file path, not a document id) — addRefDocumentTag/
// removeRefDocumentTag in domain/documents.js are the read-only-manifest
// equivalent of addDocumentTag/removeDocumentTag.
function refTagEditor(r) {
  const chips = (r.tags || []).map((t) => `
    <span class="doc-tag-chip">#${esc(t)} <button class="icon-btn" data-ref-tag-remove="${esc(r.key)}::${esc(t)}" title="Remove tag">✕</button></span>`).join('');
  return `
    <div class="doc-card-tags">
      ${chips}
      <input class="doc-tag-input" data-ref-tag-input="${esc(r.key)}" list="doc-tag-list" placeholder="add tag… (Enter/Tab to commit)">
    </div>`;
}

// Each entry's name is a link that opens the in-app viewer (PDFs) instead
// of a separate "Open" button; file size/type is dropped from the display
// (kept only as a tooltip) — both per PROGRESS.md's design ask. Renaming
// only ever touches the display title (data-doc-rename), never the
// underlying file/content. The tag icon sits left of the rename pencil and
// toggles docTagEditor/refTagEditor open/closed (ui.docTagEditorOpen, a Set
// of doc ids / ref keys — ephemeral, not persisted) instead of always
// rendering the tag row, to keep each card's default footprint small.
// Direct follow-up request: "Allow sort and filter option on the doc
// library. Default the sort to ASC alphabetical." — applied per-list
// (Notes, uploaded files, Reference Library each sort independently,
// same section order as before) rather than merging the uploaded-files/
// Reference-Library sections into one interleaved list, since they
// already render via two differently-shaped row templates (lib:/ref:
// prefixes, different rename/delete semantics). A ref doc has no
// createdAt at all (a static catalog entry, not a per-campaign record),
// so a 'date-*' sort leaves it in title order via the tie-break below —
// never undefined-vs-undefined arbitrary order.
function sortDocEntries(list, sortKey) {
  const sorted = list.slice();
  const byTitle = (a, b) => String(a.title || '').localeCompare(String(b.title || ''));
  if (sortKey === 'title-desc') sorted.sort((a, b) => byTitle(b, a));
  else if (sortKey === 'date-newest') sorted.sort((a, b) => (a.createdAt && b.createdAt ? b.createdAt.localeCompare(a.createdAt) : 0) || byTitle(a, b));
  else if (sortKey === 'date-oldest') sorted.sort((a, b) => (a.createdAt && b.createdAt ? a.createdAt.localeCompare(b.createdAt) : 0) || byTitle(a, b));
  else sorted.sort(byTitle); // 'title-asc', and the default for an unrecognized value
  return sorted;
}
// Sort lives behind one icon button (data-doc-sort-menu-toggle) opening this
// list (data-doc-sort-pick); the button's face shows the current order. There
// is no "Show" filter: nothing in the app creates Docs notes any more (only
// Import File(s) adds entries), so every record always shows — any notes left
// over from older campaigns still render in their own Notes section.
const DOC_SORT_OPTIONS = [
  { value: 'title-asc', label: 'Title (A → Z)', icon: 'A↓' },
  { value: 'title-desc', label: 'Title (Z → A)', icon: 'Z↓' },
  { value: 'date-newest', label: 'Date Added (newest)', icon: '🕒↓' },
  { value: 'date-oldest', label: 'Date Added (oldest)', icon: '🕒↑' },
];
function docSortMenuHtml(sortKey, open) {
  const current = DOC_SORT_OPTIONS.find((o) => o.value === sortKey) || DOC_SORT_OPTIONS[0];
  const menu = open
    ? '<div class="hexcrawl-menu doc-sort-menu" role="menu">' + DOC_SORT_OPTIONS.map((o) => '<button type="button" role="menuitem" data-doc-sort-pick="' + o.value + '" class="' + (o.value === sortKey ? 'selected' : '') + '">' + o.icon + ' ' + esc(o.label) + '</button>').join('') + '</div>'
    : '';
  return '<div class="hexcrawl-menu-wrap doc-sort-wrap"><button type="button" class="hexcrawl-menu-btn" data-doc-sort-menu-toggle aria-haspopup="menu" aria-expanded="' + open + '" aria-label="Sort" title="Sort: ' + esc(current.label) + '">⇅<span class="hexcrawl-menu-caret">' + current.icon + '</span></button>' + menu + '</div>';
}

function documents(doc, ui = {}) {
  const search = ui.docFilter || '';
  const activeTags = ui.docTagFilters || new Set();
  const tagEditorOpen = ui.docTagEditorOpen || new Set();
  const renameOpen = ui.docRenameOpen || new Set();
  const tagListOpen = !!ui.docTagListOpen;
  const sortKey = ui.docSort || 'title-asc';
  const items = filterDocuments(doc, { search, tags: [...activeTags] });
  // An uploaded FILE (kind:'file', a real PDF) is an openable document same
  // as any bundled Reference Library one — it renders in that same section
  // now (direct follow-up request: "it should just be included in the
  // Reference Library and not a separate section"), not the top list. A
  // NOTE (kind:'note', free text with no underlying file) is categorically
  // different — nothing to "open," just an editable text block — and stays
  // in its own top section.
  const noteItems = sortDocEntries(items.filter((d) => d.kind !== 'file'), sortKey);
  const uploadedFileItems = items.filter((d) => d.kind === 'file');
  const mentions = listDocumentMentions(doc);
  const storedRefKeys = ui.refDocBlobKeys || new Set();
  const allTags = allDocumentTags(doc, storedRefKeys);
  // The Reference Library shares the same search box + tag-filter chips as
  // the notes list above it (one search, one set of filters, two lists) —
  // it was rendered unconditionally before, so typing in the search box
  // visibly filtered the top list but silently left every reference doc on
  // screen.
  const requiredTags = [...activeTags].map((t) => t.toLowerCase());
  const q = search.trim().toLowerCase();
  const refDocs = listCampaignReferenceDocuments(doc, storedRefKeys).filter((r) => {
    if (requiredTags.length && !requiredTags.every((t) => (r.tags || []).includes(t))) return false;
    if (!q) return true;
    return [r.title, ...(r.tags || [])].join(' ').toLowerCase().includes(q);
  });

  const rows = noteItems.map((d) => {
    // Direct follow-up request — the size badge is gone (was previously
    // shown next to an uploaded file's title, taken from its embedded
    // dataUrl); Settings' own storage-usage line (formatBytes(info.
    // campaignBytes) above) is still where overall quota pressure shows.
    const titleEl = renameOpen.has(d.id)
      ? `<input class="doc-rename-input" data-doc-rename-input="${esc(d.id)}" value="${esc(d.title)}" placeholder="Untitled document" autofocus>`
      : `<span class="doc-card-title-static" data-drag-document="lib:${esc(d.id)}" draggable="true" title="Drag into a note or context field to insert a @ pointer">${esc(d.title || 'Untitled document')}</span>`;
    return `
    <div class="doc-card">
      <div class="doc-card-head">
        <span class="doc-card-title-group">${titleEl}</span>
        <div class="doc-card-actions">
          ${richToolbarToggleHTML(`doc:${d.id}`, toolbarCollapsed(doc, ui, `doc:${d.id}`))}
          <button class="icon-btn" data-doc-tag-toggle="${esc(d.id)}" title="Tags">🏷</button>
          <button class="icon-btn" data-doc-rename="${esc(d.id)}" title="${renameOpen.has(d.id) ? 'Save' : 'Rename entry'}">${renameOpen.has(d.id) ? '💾' : '✎'}</button>
          <button class="icon-btn" data-doc-delete="${esc(d.id)}" title="Delete document">✕</button>
        </div>
      </div>
      <div class="rich-field">${richToolbarHTML(`doc:${d.id}`, toolbarCollapsed(doc, ui, `doc:${d.id}`), { includeToggle: false })}<div class="mention-editor doc-content-input" contenteditable="true" data-doc-content="${esc(d.id)}" data-placeholder="Store notes, references, or handout text here…">${buildMentionEditorHTML(doc, d.content)}</div></div>
      <div class="drawer-note-actions"><button class="btn sm" data-doc-save="${esc(d.id)}">Save</button></div>
      ${tagEditorOpen.has(d.id) ? docTagEditor(d) : ''}
    </div>`;
  }).join('');
  const mentionSummary = mentions.length ? `<p class="dim small">Mentioned in Journal or dashboard fields: ${mentions.map((m) => esc(m.name)).join(', ')}</p>` : '';

  function uploadedFileRowHtml(d) {
    return `
    <div class="doc-card ref-doc-card">
      <div class="doc-card-head">
        ${renameOpen.has(d.id)
          ? `<input class="doc-rename-input" data-doc-rename-input="${esc(d.id)}" value="${esc(d.title)}" placeholder="Untitled document" autofocus>`
          : `<a href="#" class="doc-card-title-link" data-doc-open="lib:${esc(d.id)}" data-drag-document="lib:${esc(d.id)}" draggable="true" title="Open in viewer">${esc(d.title || d.fileName)}</a>`}
        <div class="doc-card-actions">
          <button class="icon-btn" data-doc-tag-toggle="${esc(d.id)}" title="Tags">🏷</button>
          <button class="icon-btn" data-doc-rename="${esc(d.id)}" title="${renameOpen.has(d.id) ? 'Save' : 'Rename entry'}">${renameOpen.has(d.id) ? '💾' : '✎'}</button>
          <button class="icon-btn" data-doc-delete="${esc(d.id)}" title="Delete document">✕</button>
        </div>
      </div>
      ${tagEditorOpen.has(d.id) ? docTagEditor(d) : ''}
    </div>`;
  }

  // Direct follow-up request: "create a bulk export/import to transfer the
  // library records and docs themselves from one browser to another" — a
  // doc whose bytes are imported into this browser's own IndexedDB doc-
  // blob store (store.js) is portable regardless of what's on disk;
  // ui.refDocBlobKeys (populated async, shell.js's openDrawerTab) is what
  // that "☁ Imported" badge below reads.
  const blobKeys = ui.refDocBlobKeys || new Set();
  function refRowHtml(r) {
    return `
    <div class="doc-card ref-doc-card">
      <div class="doc-card-head">
        ${renameOpen.has(r.key)
          ? `<input class="doc-rename-input" data-ref-rename-input="${esc(r.key)}" value="${esc(r.title)}" placeholder="Untitled document" autofocus>`
          : `<a href="#" class="doc-card-title-link" data-doc-open="ref:${esc(r.key)}" data-drag-document="ref:${esc(r.key)}" draggable="true" title="${esc(r.ext.toUpperCase())} · ${formatBytes(r.sizeBytes)} — open in viewer, or drag into a note or context field to insert a @ pointer">${esc(r.title)}</a>`}
        <div class="doc-card-actions">
          ${blobKeys.has(r.key) ? '<span class="ref-doc-blob-badge" title="Imported into this browser — portable via Export Library, works even if the file isn\'t on disk here">☁</span>' : ''}
          <button class="icon-btn" data-doc-tag-toggle="${esc(r.key)}" title="Tags">🏷</button>
          <button class="icon-btn" data-ref-rename="${esc(r.key)}" title="${renameOpen.has(r.key) ? 'Save' : 'Rename entry'}">${renameOpen.has(r.key) ? '💾' : '✎'}</button>
          <button class="icon-btn" data-ref-delete="${esc(r.key)}" title="Remove from Reference Library">✕</button>
        </div>
      </div>
      ${tagEditorOpen.has(r.key) ? refTagEditor(r) : ''}
    </div>`;
  }
  // Direct bug report: sorting the Docs library used to sort uploaded My
  // Files and Reference Library entries SEPARATELY, then always render
  // every uploaded file before every ref doc regardless of sort — so a
  // newly-uploaded file (or any uploaded file) stayed pinned at the top
  // of the merged Reference Library section no matter what sort was
  // chosen. Both kinds already share one visual section (an earlier
  // direct follow-up request folded them together on purpose), so they
  // need one combined sort, not two independent ones stacked. Tagging
  // each with __kind here is just bookkeeping to pick the right row
  // template below — never part of the sort comparison itself.
  const mergedRefSection = sortDocEntries([
    ...uploadedFileItems.map((d) => ({ ...d, __kind: 'file' })),
    ...refDocs.map((r) => ({ ...r, __kind: 'ref' })),
  ], sortKey);
  const refSectionRows = mergedRefSection.map((d) => (d.__kind === 'file' ? uploadedFileRowHtml(d) : refRowHtml(d))).join('');

  return `
    <datalist id="doc-tag-list">${allTags.map((t) => `<option value="${esc(t)}">`).join('')}</datalist>
    <div class="drawer-note">
      ${helpBody('documents-intro', 'A note is free text stored here; an imported file (see "Import File(s)" below) joins the Reference Library, alongside the bundled rulebooks. Drag either into a note or context field to insert a @ pointer.', ui)}
    </div>
    <div class="doc-search-row">
      <input class="drawer-search" data-doc-filter value="${esc(search)}" placeholder="Search name or tag…">
      ${docSortMenuHtml(sortKey, !!ui.docSortMenuOpen)}
    </div>
    ${allTags.length ? `
    <button class="btn ghost sm" data-doc-tag-list-toggle>${tagListOpen ? '▾' : '▸'} Tags (${allTags.length})</button>
    ${tagListOpen ? `<div class="doc-tag-filter-chips">
      ${allTags.map((t) => `<button class="chip sm ${activeTags.has(t) ? 'active' : ''}" data-doc-tag-filter="${esc(t)}">#${esc(t)}</button>`).join('')}
    </div>` : ''}` : ''}
    ${mentionSummary}
    ${noteItems.length ? `
    <div class="statblock-head"><h4>Notes</h4></div>
    <div class="doc-list">${rows}</div>` : ''}
    <div class="statblock-head" style="margin-top: var(--sp-4);"><h4>Reference Library</h4>${helpToggle('documents-reflib')}</div>
    ${helpBody('documents-reflib', 'This campaign\'s sourcebooks: only those whose license you own (Settings → Licenses) and whose game system this campaign\'s profile designates (Module for Profile or Rules Constitution), plus anything you import yourself. "Import File(s)" reads real files off your device into this browser\'s own storage: a filename matching a catalog entry joins the Reference Library so it opens even when assets/docs/ is empty on this machine; anything else becomes a new personal document (no size limit). Bulk "Export Library"/"Import Library" (a zip of every such doc, to carry to another browser) live in Settings → General → Data.', ui)}
    <div class="drawer-note ref-doc-transfer-row">
      <label class="btn ghost sm file-btn">📥 Import File(s)<input type="file" data-ref-doc-import multiple hidden></label>
    </div>
    <div class="doc-list">${refSectionRows || '<p class="dim small">No sourcebooks loaded for this campaign\'s game systems yet.</p>'}</div>`;
}

// Gallery (Phase 11, docs/adr/0021-gallery.md): a tagged image collection,
// separate from Documents — search/tag-filter shape copied verbatim from
// Documents' own (data-doc-filter/data-doc-tag-list-toggle/data-doc-tag-
// filter above), just with a "gallery" prefix on each data attribute. A
// 'thumbnail'-kind image renders circular (the common TTRPG look asked
// for); a 'original'-kind image (only exists when its sibling thumbnail
// needed resizing) renders as a plain rectangular card, so both halves of
// a resized pair are visibly distinct without needing a text label.
function gallery(doc, ui = {}) {
  const search = ui.galleryFilter || '';
  const activeTags = ui.galleryTagFilters || new Set();
  const tagListOpen = !!ui.galleryTagListOpen;
  const allTags = listGalleryTagVocabulary(doc);
  const images = listGalleryImages(doc, { search, tags: [...activeTags] });

  // Upload, direct from the Gallery itself (previously the only way in was
  // through an entity's own "+ Photo" — this is a real, owner-less upload,
  // entityId: null). A resize happens immediately on file selection
  // (ui.galleryUploadDraft holds the result, not the raw File — same
  // client-side canvas resize battlemap backgrounds/entity photos already
  // use), but the actual addGalleryImages commit waits for the GM to
  // confirm a friendly display name — an inline form, not a popup, per
  // this app's standing "no window.prompt() for data entry" rule.
  const draft = ui.galleryUploadDraft;
  const uploadForm = draft ? `
    <div class="gallery-upload-form">
      <img class="gallery-upload-preview" src="${esc(draft.thumbDataUrl)}" alt="Upload preview">
      <div class="gallery-upload-fields">
        <label class="field-label">Friendly name
          <input type="text" data-gallery-upload-name value="${esc(draft.name)}" placeholder="e.g. Captain Reyes">
        </label>
        <div class="entity-add-row">
          <button type="button" class="btn primary sm" data-gallery-upload-confirm>Add to Gallery</button>
          <button type="button" class="btn ghost sm" data-gallery-upload-cancel>Cancel</button>
        </div>
      </div>
    </div>` : `
    <div class="gallery-toolbar">
      <label class="chip">🖼 Upload image<input type="file" accept="image/*" hidden data-gallery-upload-select></label>
    </div>`;

  const cards = images.map((img) => {
    const owner = img.entityId ? getEntity(doc, img.entityId) : null;
    const tagChips = (img.tags || []).map((t) => {
      const locked = img.lockedTag && t.toLowerCase() === img.lockedTag.toLowerCase();
      return `<span class="tag-chip ${locked ? 'tag-chip-locked' : ''}">${locked ? '🔒 ' : ''}${esc(t)}${locked ? '' : `<button class="icon-btn" data-gallery-tag-remove="${esc(img.id)}::${esc(t)}" title="Remove tag" aria-label="Remove tag">✕</button>`}</span>`;
    }).join('');
    return `
    <div class="gallery-card">
      <img class="${img.kind === 'thumbnail' ? 'gallery-thumb-circle' : 'gallery-original-img'}" src="${esc(img.dataUrl)}" alt="${esc(img.title || img.lockedTag || 'Gallery image')}">
      <div class="gallery-card-meta">
        <span class="dim small">${img.kind === 'thumbnail' ? 'Thumbnail' : 'Original'}${owner ? ` · ${esc(owner.name || 'Unnamed')}` : ''}</span>
        <div class="tag-chips">${tagChips}</div>
      </div>
      <button class="icon-btn" data-gallery-delete="${esc(img.id)}" title="Delete image" aria-label="Delete image">✕</button>
    </div>`;
  }).join('');

  return `
    ${uploadForm}
    <datalist id="gallery-tag-list">${allTags.map((t) => `<option value="${esc(t)}">`).join('')}</datalist>
    <input class="drawer-search" data-gallery-filter value="${esc(search)}" placeholder="Search by title or tag…">
    ${allTags.length ? `
    <button class="btn ghost sm" data-gallery-tag-list-toggle>${tagListOpen ? '▾' : '▸'} Tags (${allTags.length})</button>
    ${tagListOpen ? `<div class="doc-tag-filter-chips">
      ${allTags.map((t) => `<button class="chip sm ${activeTags.has(t) ? 'active' : ''}" data-gallery-tag-filter="${esc(t)}">#${esc(t)}</button>`).join('')}
    </div>` : ''}` : ''}
    <div class="gallery-grid">
      ${images.length ? cards : '<p class="ws-placeholder">No images yet — upload one above, or add a photo from any entity\'s inspector.</p>'}
    </div>`;
}

// Planetfall Grid Battlemap (Phase 11, docs/adr/0023-planetfall-grid-
// battlemap.md): named maps, each an optional Gallery-sourced background
// plus freeform-placed icons (annotations from the built-in set, or
// combatant tokens linking a real Cast entity — art from that entity's own
// Gallery thumbnail). Placement/repositioning is native HTML5 drag-and-drop
// (shell.js's existing entity-drag system, extended with a new MIME type
// for repositioning an already-placed icon) plus a click-to-arm-then-
// click-to-place path for the built-in icon palette — see shell.js's
// onClick/onDragStart/onDrop for the actual interaction wiring; this
// function only ever renders the current state.
function battlemap(doc, ui = {}) {
  const helpKey = 'battlemap-intro';
  const maps = listBattlemaps(doc);
  const active = getActiveBattlemap(doc);

  const head = `${sectionHeadRow('h3', 'Planetfall Grid Battlemap', helpKey)}
    ${helpBody(helpKey, 'Upload or pick a background image, then place icons (hazards, doors, notes — from the palette below) or drag a Cast entity onto the map to place a combatant token. Drag any placed icon to reposition it; click a token to open its entity, click an annotation to edit its note.', ui)}
    <div class="battlemap-tabs">
      ${maps.map((m) => `<button type="button" class="btn ghost sm ${active && active.id === m.id ? 'active' : ''}" data-battlemap-select="${esc(m.id)}">${esc(m.name)}</button>`).join('')}
      <button type="button" class="chip sm" data-battlemap-add>＋ New Map</button>
    </div>`;

  if (!active) return `${head}<p class="ws-placeholder">No maps yet — create one to get started.</p>`;

  const bg = active.backgroundImageId ? getGalleryImage(doc, active.backgroundImageId) : null;
  // Only Gallery images tagged "battlemap" are offered as a pickable
  // background — an upload made through THIS drawer (below) is
  // auto-tagged with it, the same "auto-tag + lock" convention an entity
  // photo upload already uses for its own type tag, so the picker never
  // gets cluttered with unrelated entity portraits.
  const pickableImages = listGalleryImages(doc, { tags: ['battlemap'] }).filter((img) => img.kind === 'thumbnail');

  const palette = BATTLEMAP_ICONS.map((i) => `
    <button type="button" class="chip sm ${ui.battlemapPlacingIcon === i.key ? 'active' : ''}" data-battlemap-palette-pick="${esc(i.key)}" title="${esc(i.label)}">${i.glyph} ${esc(i.label)}</button>`).join('');

  const markers = active.icons.map((icon) => {
    const posStyle = `left:${(icon.x * 100).toFixed(2)}%;top:${(icon.y * 100).toFixed(2)}%`;
    const ref = `${active.id}::${icon.id}`;
    if (icon.kind === 'annotation') {
      const def = findBattlemapIcon(icon.iconKey);
      return `<div class="battlemap-icon" draggable="true" data-drag-battlemap-icon="${esc(ref)}" data-battlemap-icon-edit="${esc(ref)}" style="${posStyle}" title="${esc(icon.note || (def ? def.label : ''))}">
        <span class="battlemap-icon-glyph">${def ? def.glyph : '❓'}</span>
        <button type="button" class="icon-btn battlemap-icon-remove" data-battlemap-icon-remove="${esc(ref)}" aria-label="Remove">✕</button>
      </div>`;
    }
    const ent = icon.entityId ? getEntity(doc, icon.entityId) : null;
    const thumb = ent && ent.thumbnailId ? getGalleryImage(doc, ent.thumbnailId) : null;
    const name = ent ? (ent.name || 'Unnamed') : (icon.label || 'Unknown');
    return `<div class="battlemap-icon battlemap-token" draggable="true" data-drag-battlemap-icon="${esc(ref)}" ${ent ? `data-open-entity="${esc(ent.id)}"` : ''} style="${posStyle}" title="${esc(name)}">
      ${thumb ? `<img class="battlemap-token-img" src="${esc(thumb.dataUrl)}" alt="${esc(name)}">` : `<span class="battlemap-token-fallback">${esc((name[0] || '?').toUpperCase())}</span>`}
      <button type="button" class="icon-btn battlemap-icon-remove" data-battlemap-icon-remove="${esc(ref)}" aria-label="Remove">✕</button>
    </div>`;
  }).join('');

  // Pan/zoom camera (UX batch, ephemeral — same reset-on-open convention
  // as Graph's own zoom): the world layer (background+grid+icons) sits
  // inside a fixed-size, overflow:hidden viewport at its own 1:1 size,
  // and gets transform: translate(x,y) scale(scale) applied — icons keep
  // their existing 0-1-fraction-of-this-box positioning unchanged, they
  // pan/zoom for free since they share the transformed parent. shell.js's
  // wheel/drag handlers write this transform directly to the live DOM
  // during interaction (updateBattlemapWorldTransform); this inline style
  // is only the value on a fresh render.
  const cam = ui.battlemapCamera || { scale: 1, x: 0, y: 0 };
  return `${head}
    <div class="battlemap-toolbar">
      <input class="battlemap-name-input" data-battlemap-rename="${esc(active.id)}" value="${esc(active.name)}" placeholder="Map name">
      <button type="button" class="icon-btn" data-battlemap-remove="${esc(active.id)}" title="Delete this map" aria-label="Delete map">✕</button>
      <label class="chip sm">🖼 Background<input type="file" accept="image/*" data-battlemap-bg-upload="${esc(active.id)}" hidden></label>
      ${pickableImages.length ? `<select data-battlemap-bg-select="${esc(active.id)}">
        <option value="">— pick existing image —</option>
        ${pickableImages.map((img) => `<option value="${esc(img.id)}" ${active.backgroundImageId === img.id ? 'selected' : ''}>${esc(img.title || img.id)}</option>`).join('')}
      </select>` : ''}
      <label class="chip sm"><input type="checkbox" data-battlemap-grid-toggle="${esc(active.id)}" ${active.gridEnabled ? 'checked' : ''}> Grid</label>
      ${active.gridEnabled ? numStepper(`<input type="number" class="battlemap-grid-size-input" min="10" max="200" value="${active.gridSize}" data-battlemap-grid-size="${esc(active.id)}" title="Grid cell size (px)">`) : ''}
      <span class="battlemap-camera-controls">
        <button type="button" class="icon-btn" data-battlemap-camera-zoom="out" title="Zoom out">－</button>
        <button type="button" class="icon-btn" data-battlemap-camera-zoom="in" title="Zoom in">＋</button>
        <button type="button" class="icon-btn" data-battlemap-camera-reset title="Reset view">⟲</button>
      </span>
    </div>
    <div class="battlemap-palette">${palette}</div>
    <div class="battlemap-viewport ${ui.battlemapPlacingIcon ? 'placing' : ''}" data-battlemap-canvas="${esc(active.id)}" data-drop-battlemap="${esc(active.id)}">
      <div class="battlemap-world" style="transform:translate(${cam.x}px,${cam.y}px) scale(${cam.scale});${bg ? `background-image:url('${esc(bg.dataUrl)}');` : ''}${active.gridEnabled ? `--battlemap-grid-size:${active.gridSize}px;` : ''}">
        ${!bg ? '<p class="ws-placeholder battlemap-placeholder">No background set — upload or pick an image above.</p>' : ''}
        ${active.gridEnabled ? '<div class="battlemap-grid-overlay"></div>' : ''}
        ${markers}
      </div>
    </div>`;
}

// --- Hexcrawl — a genre-agnostic hex-grid overworld map --------------------
// Distinct from both battlemap() above (tactical, gridless, fixed-size
// fractional canvas) and worldTracker() below (strategic, but a fixed 6x6
// SQUARE grid, Planetfall-specific). Reuses Battlemap's own pan/zoom-
// camera and armed-palette-icon interaction shape (shell.js), generalized
// off Battlemap's 0-1-fraction-of-a-fixed-box coordinate system to real
// pixel positions on an unbounded plane (domain/hexcrawls.js's axialToPixel/
// pixelToAxial), since a hexcrawl must genuinely scroll past any fixed
// extent. HEX_SIZE is the center-to-vertex pixel radius at camera scale 1 —
// tuned so a typical drawer-body width shows roughly a 10-hex-wide view by
// default, and the camera's own [0.5, 6]-style zoom range lets a GM shrink
// that down to roughly 30 hexes wide.
const HEX_W = Math.sqrt(3) * HEX_SIZE;
const HEX_H = 2 * HEX_SIZE;
// Direct follow-up request: "increase the geography icon to fill the hex
// so it is visible when the location icon is selected" — sized relative
// to HEX_SIZE (not a fixed CSS rem value) so it stays proportionate to
// the hex itself if that constant ever changes.
const HEX_GEO_GLYPH_SIZE = HEX_SIZE * 1.4;
// clip-path is the same six points for every hex (only the div's own
// left/top position differs per hex) — computed once, not per-cell.
const HEX_CLIP_PATH = (() => {
  const cx = HEX_W / 2; const cy = HEX_H / 2;
  const pts = hexVertexPoints(HEX_SIZE).map((p) => `${(cx + p.x).toFixed(1)}px ${(cy + p.y).toFixed(1)}px`);
  return `polygon(${pts.join(', ')})`;
})();
// Direct follow-up request: "have hex lines around all edges of the hex"
// — a CSS border on a clip-path'd div is unreliable at shared edges
// (neighboring hex-cells' own rectangular bounding boxes overlap at their
// clipped-away corners, and paint order can hide one side's line under
// the next hex's opaque fill). An SVG <polygon> sidesteps this entirely —
// its stroke always draws cleanly along the exact vertices regardless of
// neighboring shapes, and its own fill IS the Geography solid-color layer
// (direct follow-up request), so this replaces both the old CSS
// background-color-by-class approach AND the border in one shape. Same
// six points as the clip-path above, formatted as SVG's "x,y x,y ..."
// list instead of CSS's "x y, x y, ...".
const HEX_SVG_POINTS = (() => {
  const cx = HEX_W / 2; const cy = HEX_H / 2;
  return hexVertexPoints(HEX_SIZE).map((p) => `${(cx + p.x).toFixed(1)},${(cy + p.y).toFixed(1)}`).join(' ');
})();
// Vertex icons sit INSET from the hex's true corners (0.72 of the way from
// center to vertex) so they stay fully inside the clipped hex shape rather
// than being cut off right at its edge.
const HEX_VERTEX_INSET = 0.72;
// Direct follow-up request (river/lake overlays) — edge midpoints in the
// SAME local box-space HEX_SVG_POINTS/HEX_CLIP_PATH already use (offset
// from cx,cy, not the hex's own world-space center), for drawing river
// paths/the lake circle INSIDE the .hex-shape SVG alongside the polygon —
// computed once, not per-cell, same posture as those two.
const HEX_EDGE_MIDPOINTS_LOCAL = (() => {
  const cx = HEX_W / 2; const cy = HEX_H / 2;
  return hexEdgeMidpoints(HEX_SIZE).map((p) => ({ x: cx + p.x, y: cy + p.y }));
})();

// ~30% of the hex's own area as a circle (direct follow-up request: "fill
// 30% of the hex") — hex area for a regular hexagon with center-to-vertex
// radius HEX_SIZE is 1.5*sqrt(3)*HEX_SIZE^2; solve pi*r^2 = 0.3*that area.
const HEX_LAKE_RADIUS = Math.sqrt((0.3 * 1.5 * Math.sqrt(3) * HEX_SIZE * HEX_SIZE) / Math.PI);

/** The lake's own irregular blob OUTLINE — direct follow-up request: "The
 *  lakes must be irregular shaped blobs that look more like natural
 *  bodies of water, not circles. Each lake should be a different shape."
 *  9 points ringed around the lake's stored offset center, each at a
 *  seeded radius (0.72x-1.28x HEX_LAKE_RADIUS, so the AVERAGE area still
 *  targets ~30% of the hex per the original request even though no two
 *  lakes' own `seed` produce the same wobble), threaded into a smooth
 *  CLOSED path via the same "quadratic through points" technique
 *  riverMeanderPoints/smoothPathD already use for a river's own wiggle. */
function hexLakeBlobPoints(cx, cy, lake) {
  const rad = (lake.offsetAngle * Math.PI) / 180;
  const dist = lake.offsetDist * HEX_SIZE;
  const lx = cx + Math.cos(rad) * dist;
  const ly = cy + Math.sin(rad) * dist;
  const M = 9;
  const pts = [];
  for (let i = 0; i < M; i++) {
    const a = (i / M) * Math.PI * 2;
    const h = hashFrac(lake.seed * 31.7 + i * 5.13);
    const r = HEX_LAKE_RADIUS * (0.72 + h * 0.56);
    pts.push({ x: lx + Math.cos(a) * r, y: ly + Math.sin(a) * r });
  }
  return pts;
}

// Closed-loop counterpart to smoothPathD (river paths are open) — wraps
// back to the first point instead of ending with a straight line, so a
// lake's own outline has no visible seam.
function smoothClosedPathD(pts) {
  const n = pts.length;
  const midOf = (i) => { const j = (i + 1) % n; return { x: (pts[i].x + pts[j].x) / 2, y: (pts[i].y + pts[j].y) / 2 }; };
  const start = midOf(n - 1);
  let d = `M${start.x.toFixed(1)},${start.y.toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const m = midOf(i);
    d += ` Q${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)} ${m.x.toFixed(1)},${m.y.toFixed(1)}`;
  }
  return `${d} Z`;
}

/** The lake overlay itself — rendered INSIDE .hex-shape, above the
 *  Geography fill/polygon but still under the actual .hex-cell
 *  click-target div and center Location icon (DOM order — this <svg> is
 *  a sibling BEFORE .hex-cell; the lake has no click behavior of its own,
 *  so unlike rivers it doesn't need a second on-top hit layer). */
function hexLakeSvgHtml(hex, cx, cy) {
  if (!hex.lake) return '';
  return `<path class="hex-lake" d="${smoothClosedPathD(hexLakeBlobPoints(cx, cy, hex.lake))}" />`;
}

// --- Roads (direct follow-up request: "Create a road overlay that
// duplicates the river functionality using a brown line for a road that
// connects to locations, not lakes or oceans") -----------------------------
// Mirrors riverSegmentGeometry/hexRiverSvgHtml/hexRiverHitSvgHtml below
// almost exactly — the only real differences are the sentinel ('location'
// instead of 'lake', resolving to the hex's own fixed center point rather
// than an offset lake blob) and the total absence of an ocean-mouth-style
// widening (roads never target Ocean geography the way rivers do).

function roadSegmentGeometry(hex, cx, cy) {
  const endPoint = (end) => (end === 'location' ? (hex.locationEntityId ? { x: cx, y: cy } : null) : HEX_EDGE_MIDPOINTS_LOCAL[end]);
  return (hex.roads || []).map((seg, index) => {
    const a = endPoint(seg.from); const b = endPoint(seg.to);
    if (!a || !b) return null;
    const pts = riverMeanderPoints(a, b, seg.seed);
    return { index, d: smoothPathD(pts) };
  }).filter(Boolean);
}

/** Renders every road segment on this hex — narrow brown meandering
 *  strokes between two edge midpoints (or an edge and the hex's own
 *  center, when `to`/`from` is the 'location' sentinel and a Location is
 *  actually linked here — same "stays connected wherever the target ends
 *  up, stops rendering until it exists again" posture hexLakeSvgHtml/
 *  riverSegmentGeometry already use for 'lake'). Purely decorative
 *  (pointer-events:none via CSS) — see hexRoadHitSvgHtml for the actual
 *  clickable layer. */
function hexRoadSvgHtml(hex, cx, cy) {
  return roadSegmentGeometry(hex, cx, cy).map((s) => `<path class="hex-road" d="${s.d}" />`).join('');
}

/** Same "arm the Road tool to make existing lines clickable, click one to
 *  prompt removal" posture as hexRiverHitSvgHtml — see its own doc comment
 *  for why this needs a separate on-top svg rather than reusing the
 *  decorative one. */
function hexRoadHitSvgHtml(hex, cx, cy, armed, mapId, q, r) {
  if (!armed) return '';
  const segs = roadSegmentGeometry(hex, cx, cy);
  if (!segs.length) return '';
  return segs.map((s) => `<path class="hex-road-hit" d="${s.d}" data-hex-road="${esc(mapId)}::${q}::${r}::${s.index}" />`).join('');
}

// A cheap deterministic 0-1 pseudo-random hash (no dependency, no state) —
// river meander points (below) need SEVERAL independent-looking random
// values derived from one stored seed (domain/hexcrawls.js), not just one.
function hashFrac(x) {
  const v = Math.sin(x * 12.9898) * 43758.5453;
  return v - Math.floor(v);
}

/** A river segment's full meander path — direct follow-up request: "the
 *  river anchor... is making a curved line that must change to an
 *  irregular waving, meandering line that is more natural to a river."
 *  The original single-control-point quadratic (one smooth arc) reads as
 *  a curve, not a meander — this instead walks 3 intermediate points
 *  along the A-B line, each displaced perpendicular by a seeded amount
 *  and ALTERNATING side (left-right-left), then threads a smooth path
 *  through all of them via the standard "quadratic-through-points"
 *  technique (each point as a Bezier control, ending at the midpoint to
 *  the next one) — the classic cheap way to get a natural-looking wavy
 *  line through several waypoints without sharp corners. Returns the
 *  point LIST (not just the `d` string) so callers needing a "which way
 *  is the river approaching from" direction (the ocean-mouth funnel,
 *  below) have a real nearby point to work from instead of one shared
 *  midpoint. */
function riverMeanderPoints(a, b, seed) {
  const dx = b.x - a.x; const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len; const py = dx / len;
  const N = 3;
  const pts = [a];
  for (let i = 1; i <= N; i++) {
    const t = i / (N + 1);
    const bx = a.x + dx * t; const by = a.y + dy * t;
    const h = hashFrac(seed * 17.13 + i * 3.71);
    const sign = i % 2 === 0 ? 1 : -1;
    const mag = (0.1 + h * 0.16) * len;
    pts.push({ x: bx + px * mag * sign, y: by + py * mag * sign });
  }
  pts.push(b);
  return pts;
}

function smoothPathD(pts) {
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mid = { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 };
    d += ` Q${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)} ${mid.x.toFixed(1)},${mid.y.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  d += ` L${last.x.toFixed(1)},${last.y.toFixed(1)}`;
  return d;
}

// Shared by hexRiverSvgHtml (visible, decorative — stays in the
// background .hex-shape svg, BEFORE .hex-cell in DOM order) and
// hexRiverHitSvgHtml (the clickable hit-paths, rendered in their OWN svg
// positioned identically but AFTER .hex-cell — see that function's own
// doc comment for why they can't share one svg element).
function riverSegmentGeometry(doc, mapId, q, r, hex, cx, cy) {
  const lakePt = hex.lake ? hexLakeSvgPoint(cx, cy, hex.lake) : null;
  const endPoint = (end) => (end === 'lake' ? lakePt : HEX_EDGE_MIDPOINTS_LOCAL[end]);
  const isOceanMouth = (end) => {
    if (end === 'lake') return false;
    const nb = edgeNeighbor(q, r, end);
    const nbHex = getHex(doc, mapId, nb.q, nb.r);
    return nbHex.geography === 'ocean';
  };
  return (hex.rivers || []).map((seg, index) => {
    const a = endPoint(seg.from); const b = endPoint(seg.to);
    if (!a || !b) return null;
    const pts = riverMeanderPoints(a, b, seg.seed);
    return { index, d: smoothPathD(pts), pts, mouthFrom: isOceanMouth(seg.from), mouthTo: isOceanMouth(seg.to) };
  }).filter(Boolean);
}

/** Renders every river segment on this hex — narrow blue meandering
 *  strokes between two edge midpoints (or an edge and the lake, when
 *  `to`/`from` is the 'lake' sentinel). A segment whose edge borders a
 *  NEIGHBORING hex painted 'ocean' gets a widened funnel at that end
 *  (direct follow-up request: "Rivers connecting to the ocean will have a
 *  wider endpoint... representing the mouth of the river"). Purely
 *  decorative (pointer-events:none via CSS) — see hexRiverHitSvgHtml for
 *  the actual clickable layer. */
function hexRiverSvgHtml(doc, mapId, q, r, hex, cx, cy) {
  const segs = riverSegmentGeometry(doc, mapId, q, r, hex, cx, cy);
  return segs.map((s) => {
    const mouthA = s.mouthFrom ? riverMouthHtml(s.pts[0], s.pts[1]) : '';
    const mouthB = s.mouthTo ? riverMouthHtml(s.pts[s.pts.length - 1], s.pts[s.pts.length - 2]) : '';
    return `<path class="hex-river" d="${s.d}" />${mouthA}${mouthB}`;
  }).join('');
}

/** Direct follow-up request: "when the river icon is selected, any river
 *  lines already placed should be selectable and clicking a line should
 *  prompt to remove it." A separate, EMPTY-until-armed svg positioned
 *  identically to (and reusing the exact same path geometry as)
 *  hexRiverSvgHtml's own decorative one, but rendered as a DOM sibling
 *  AFTER .hex-cell (same "must paint on top to actually receive the
 *  click" reasoning as .hex-vertex/.hex-edge) — the decorative svg can't
 *  double as the hit target itself because it sits BEFORE .hex-cell,
 *  which would silently swallow the click the same bug this same request
 *  turn found and fixed for .hex-edge. Each hit path is much WIDER
 *  (invisible) than the 3px visible stroke, so it's actually clickable;
 *  only rendered at all while the River tool is armed (`ui.
 *  hexcrawlPlacingIcon.layer === 'river'`), same as the pending-start
 *  highlight on .hex-edge. */
function hexRiverHitSvgHtml(doc, mapId, q, r, hex, cx, cy, armed) {
  if (!armed) return '';
  const segs = riverSegmentGeometry(doc, mapId, q, r, hex, cx, cy);
  if (!segs.length) return '';
  return segs.map((s) => `<path class="hex-river-hit" d="${s.d}" data-hex-river="${esc(mapId)}::${q}::${r}::${s.index}" />`).join('');
}

// Same offset math as hexLakeSvgHtml, factored out so hexRiverSvgHtml can
// find the lake's own local-space point without re-deriving it.
function hexLakeSvgPoint(cx, cy, lake) {
  const rad = (lake.offsetAngle * Math.PI) / 180;
  const dist = lake.offsetDist * HEX_SIZE;
  return { x: cx + Math.cos(rad) * dist, y: cy + Math.sin(rad) * dist };
}

/** A widened funnel at a river's ocean-mouth end — a filled triangle
 *  fanning out from the endpoint back toward the meander's own nearest
 *  waypoint (so it widens INTO the hex along the curve's actual approach
 *  direction, reading as the river mouth opening onto the sea) rather
 *  than a variable-width stroke, which SVG can't do without a much
 *  heavier path-outline approach. */
function riverMouthHtml(end, nearWaypoint) {
  const dx = end.x - nearWaypoint.x; const dy = end.y - nearWaypoint.y;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len; const py = dx / len;
  const spread = HEX_SIZE * 0.26;
  const p1 = { x: end.x + px * spread, y: end.y + py * spread };
  const p2 = { x: end.x - px * spread, y: end.y - py * spread };
  const back = { x: end.x - (dx / len) * spread * 1.4, y: end.y - (dy / len) * spread * 1.4 };
  return `<polygon class="hex-river-mouth" points="${p1.x.toFixed(1)},${p1.y.toFixed(1)} ${back.x.toFixed(1)},${back.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}" />`;
}

// Direct follow-up request: pen-and-ink art (geo.iconArt, from
// hexcrawlIcons.js) replaces the plain emoji glyph when a biome has real
// crops available. A LATER direct follow-up ("Add a sea button... waves
// similar to the other geography graphics") added `svgArt` — a
// hand-authored inline SVG pattern for a biome with no matching source
// crop at all (raw markup, not a file reference, so no <img> involved);
// checked before the plain iconArt/glyph fallback. `water`/`ice` (neither
// svgArt nor iconArt) fall back to their emoji glyph, same rendering rule
// the palette/select still use.
function hexGeoGlyphHtml(geo, geoVariant) {
  if (Array.isArray(geo.iconArt) && geo.iconArt.length) {
    const file = geo.iconArt[geoVariant % geo.iconArt.length] || geo.iconArt[0];
    return `<img class="hex-geo-glyph hex-geo-glyph-img" src="./assets/hexcrawl-icons/${esc(file)}" alt="" style="width:${HEX_GEO_GLYPH_SIZE.toFixed(1)}px;height:${HEX_GEO_GLYPH_SIZE.toFixed(1)}px">`;
  }
  if (geo.svgArt) {
    return `<svg class="hex-geo-glyph hex-geo-glyph-svg" width="${HEX_GEO_GLYPH_SIZE.toFixed(1)}" height="${HEX_GEO_GLYPH_SIZE.toFixed(1)}" viewBox="-32 -32 64 64">${geo.svgArt}</svg>`;
  }
  return `<span class="hex-geo-glyph" style="font-size:${HEX_GEO_GLYPH_SIZE.toFixed(1)}px">${geo.glyph}</span>`;
}

// Hexcrawl palette: one compact row of icon buttons. Geography, Locations
// and Overlays each open a small menu (data-hexcrawl-menu-toggle /
// data-hexcrawl-pick, shell.js); picking an entry arms it for clicking hexes,
// and the button then shows that entry's icon. "None" disarms. Encounter is
// a plain toggle (nothing to choose) that arms the generic 'unknown'
// Location key, filling the next open corner like any Location. Only one
// thing is ever armed (ui.hexcrawlPlacingIcon), and only one menu is open
// (ui.hexcrawlPaletteMenu). Each button's usage guidance is its tooltip.
const HEXCRAWL_OVERLAY_ITEMS = [
  { key: 'river', glyph: '🏞️', label: 'River' },
  { key: 'lake', glyph: '🫧', label: 'Lake' },
  { key: 'road', glyph: '🛣️', label: 'Road' },
];
function hexcrawlMenuButton(ui, { kind, icon, label, title, items, armedKey }) {
  const open = ui.hexcrawlPaletteMenu === kind;
  const armedItem = items.find((i) => i.key === armedKey);
  const face = armedItem ? armedItem.glyph : icon;
  const menu = open ? `
      <div class="hexcrawl-menu" role="menu">
        <button type="button" role="menuitem" data-hexcrawl-pick="${kind}::" class="${armedItem ? '' : 'selected'}">— None</button>
        ${items.map((i) => `<button type="button" role="menuitem" data-hexcrawl-pick="${kind}::${esc(i.key)}" class="${i.key === armedKey ? 'selected' : ''}">${i.glyph} ${esc(i.label)}</button>`).join('')}
      </div>` : '';
  return `
    <div class="hexcrawl-menu-wrap">
      <button type="button" class="hexcrawl-menu-btn ${armedItem ? 'active' : ''}" data-hexcrawl-menu-toggle="${kind}" aria-haspopup="menu" aria-expanded="${open}" aria-label="${esc(label)}" title="${esc(label + (armedItem ? ' — ' + armedItem.label + ' armed' : '') + '. ' + title)}">${face}<span class="hexcrawl-menu-caret">▾</span></button>${menu}
    </div>`;
}

function hexcrawlPalette(ui) {
  const armed = ui.hexcrawlPlacingIcon;
  const geoKey = armed && armed.layer === 'geography' ? armed.key : null;
  const quickEncounterArmed = !!(armed && armed.layer === 'threat' && armed.key === 'unknown');
  const threatKey = armed && armed.layer === 'threat' && !quickEncounterArmed ? armed.key : null;
  const overlayKey = armed && ['river', 'lake', 'road'].includes(armed.layer) ? armed.layer : null;
  return `
    ${hexcrawlMenuButton(ui, { kind: 'geography', icon: '🗺️', label: 'Geography', title: 'Pick a terrain, then click a hex to paint it.', items: HEXCRAWL_GEOGRAPHY_ICONS, armedKey: geoKey })}
    ${hexcrawlMenuButton(ui, { kind: 'threat', icon: '📍', label: 'Locations', title: 'Pick a Location, then click a hex — it fills the next open corner, clockwise from top-right. With a Location armed, clicking a filled corner prompts to remove it.', items: HEXCRAWL_THREAT_ICONS, armedKey: threatKey })}
    <button type="button" class="hexcrawl-menu-btn ${quickEncounterArmed ? 'active' : ''}" data-hexcrawl-arm-quick-encounter aria-pressed="${quickEncounterArmed}" aria-label="Encounter" title="Encounter${quickEncounterArmed ? ' — armed (click again to stop)' : ''}. Adds an encounter of unknown type to the next open corner of the hex you click; set its actual type later from the Encounter entity it links to.">⚔️<span class="hexcrawl-menu-caret">＋</span></button>
    ${hexcrawlMenuButton(ui, { kind: 'overlay', icon: '〰️', label: 'Overlays', title: 'River: click one border, then another, to draw a segment; clicking a line prompts to remove it. Lake: click a hex to add one (remove it from Hex Detail). Road: like River, but connects to a hex\'s own Location.', items: HEXCRAWL_OVERLAY_ITEMS, armedKey: overlayKey })}`;
}

function hexcrawlGrid(doc, mapId, ui) {
  // Direct bug report (bisected to Firefox for Android specifically —
  // same code/data renders fine in Chrome) — shell.js's own hexcrawlRange
  // module-level default doc comment has the full story on why this
  // fallback shrank from a 17x17 (289-hex) default to 11x11 (121).
  const range = ui.hexcrawlRange || { qMin: -5, qMax: 5, rMin: -5, rMax: 5 };
  const riverToolArmed = !!(ui.hexcrawlPlacingIcon && ui.hexcrawlPlacingIcon.layer === 'river');
  const roadToolArmed = !!(ui.hexcrawlPlacingIcon && ui.hexcrawlPlacingIcon.layer === 'road');
  const threatToolArmed = !!(ui.hexcrawlPlacingIcon && ui.hexcrawlPlacingIcon.layer === 'threat');
  const cells = [];
  for (let r = range.rMin; r <= range.rMax; r++) {
    for (let q = range.qMin; q <= range.qMax; q++) {
      const hex = getHex(doc, mapId, q, r);
      const center = axialToPixel(q, r, HEX_SIZE);
      const geo = hex.geography ? findHexcrawlGeography(hex.geography) : null;
      const loc = hex.locationEntityId ? getEntity(doc, hex.locationEntityId) : null;
      const locThumb = loc && loc.thumbnailId ? getGalleryImage(doc, loc.thumbnailId) : null;
      // Direct follow-up request: a Location's own picked locationTypeIcon
      // (entityLocationTypeIconPickerHtml, 5LFB-only) renders here as a
      // fallback UNDER a real Gallery thumbnail but ABOVE the plain
      // initial-letter fallback.
      const locTypeIcon = loc && !locThumb && loc.locationTypeIcon ? findLocationTypeIcon(loc.locationTypeIcon) : null;
      const centerHtml = loc
        ? `<button type="button" class="hex-center hex-center-filled" data-hex-center="${esc(mapId)}::${q}::${r}" title="${esc(loc.name || 'Unnamed')}">
            ${locThumb ? `<img class="hex-center-img" src="${esc(locThumb.dataUrl)}" alt="">`
              : locTypeIcon ? `<span class="hex-center-type-icon" title="${esc(locTypeIcon.label)}">${locTypeIcon.glyph}</span>`
              : `<span class="hex-center-fallback">${esc((loc.name || '?').trim().charAt(0).toUpperCase() || '?')}</span>`}
          </button>`
        : `<button type="button" class="hex-center hex-center-empty" data-hex-center="${esc(mapId)}::${q}::${r}" title="Link a Location">＋</button>`;
      // .hex-vertex buttons are DOM siblings of .hex-cell (see the CSS
      // comment) — positioned in .hexcrawl-world's own coordinate space,
      // same as the cell itself, so their left/top is the hex's world
      // CENTER (not the cell's own local box) plus the vertex offset.
      const vertexHtml = hexVertexPoints(HEX_SIZE * HEX_VERTEX_INSET).map((p, i) => {
        const threatKey = hex.threats[i];
        const t = threatKey ? findHexcrawlThreat(threatKey) : null;
        const vx = (center.x + p.x).toFixed(1); const vy = (center.y + p.y).toFixed(1);
        // Direct follow-up request: "Revise the encounter buttons/icons to
        // add a clickable link to each encounter and map it to a Conflict
        // entity record (or option to add a new one) similar to how
        // Location works" — a filled corner now opens (or offers to link)
        // a Conflict entity, same posture as the hex CENTER's own Location
        // link; removal moved to the Hex Detail panel's own "✕ Clear" per
        // row (same split Lake already uses: map click only ever adds/
        // links, Hex Detail is where you remove).
        const linkedConflictId = t ? hex.vertexConflicts[i] : null;
        const linkedConflict = linkedConflictId ? getEntity(doc, linkedConflictId) : null;
        const title = !t ? '' : threatToolArmed ? `${esc(t.label)} — click to remove`
          : linkedConflict ? `${esc(t.label)} — ${esc(linkedConflict.name || 'Unnamed')} (click to open)` : `${esc(t.label)} — click to link an Encounter`;
        return `<button type="button" class="hex-vertex ${t ? 'hex-vertex-filled' : ''}" data-hex-vertex="${esc(mapId)}::${q}::${r}::${i}" style="left:${vx}px;top:${vy}px" title="${title}">${t ? t.glyph : ''}</button>`;
      }).join('');
      // Direct follow-up request (river feature): "clicking one side/
      // border of the hex and then another." Edge buttons are DOM
      // siblings of .hex-cell too, same world-space positioning
      // convention as .hex-vertex above, but at each edge's own midpoint
      // (hexEdgeMidpoints) instead of a corner — no inset needed (unlike
      // vertices, they don't need to dodge the clip-path'd corner cut-off,
      // since an edge midpoint already sits well inside the shape).
      const riverStart = ui.hexcrawlRiverStart;
      // Direct follow-up request (road feature): "duplicates the river
      // functionality" — River and Road are mutually exclusive armed
      // tools (hexcrawlPlacingIcon carries only one layer at a time), so
      // at most one of riverStart/roadStart is ever non-null; the pending-
      // start highlight/title below checks whichever applies.
      const roadStart = ui.hexcrawlRoadStart;
      const pendingStart = riverStart || roadStart;
      const edgeHtml = hexEdgeMidpoints(HEX_SIZE).map((p, i) => {
        const ex = (center.x + p.x).toFixed(1); const ey = (center.y + p.y).toFixed(1);
        // Direct bug report: "when clicking a river end point and then
        // clicking another edge, no river is inserted." Root cause: every
        // border is a physical edge of TWO hexes, and this loop renders
        // it TWICE — once from each side — perfectly overlapping on
        // screen. An earlier fix that picked ONE "canonical" owner per
        // border broke a DIFFERENT way: it could split a single hex's 6
        // borders across different owning hexes independently, so two
        // clicks the GM intended as "two edges of the SAME hex" could
        // resolve to two DIFFERENT unrelated hexes. The real fix: each
        // button now carries BOTH hexes that physical border could mean
        // (itself, q,r,i — and its neighbor across that edge, via
        // edgeNeighbor) instead of picking a winner. shell.js's
        // placeRiverEdgeClick resolves the ACTUAL target hex by finding
        // whichever hex is common between the two clicks' own candidate
        // pairs, so it's correct regardless of which of the two
        // overlapping buttons the browser happens to hit.
        const nb = edgeNeighbor(q, r, i);
        const isPendingStart = pendingStart && pendingStart.candidates && pendingStart.candidates.some((c) => (c.q === q && c.r === r && c.edge === i) || (c.q === nb.q && c.r === nb.r && c.edge === nb.edge));
        const pendingLabel = roadStart ? 'Road' : 'River';
        return `<button type="button" class="hex-edge ${isPendingStart ? 'hex-edge-pending' : ''}" data-hex-edge="${esc(mapId)}::${q}::${r}::${i}::${nb.q}::${nb.r}::${nb.edge}" style="left:${ex}px;top:${ey}px" title="${isPendingStart ? `${pendingLabel} starts here — click another border to finish this segment` : ''}"></button>`;
      }).join('');
      const cellLeft = (center.x - HEX_W / 2).toFixed(1); const cellTop = (center.y - HEX_H / 2).toFixed(1);
      const active = ui.hexcrawlSelectedHex && ui.hexcrawlSelectedHex.q === q && ui.hexcrawlSelectedHex.r === r;
      // Two layers at the same position: an SVG polygon purely for the
      // visual shape (solid Geography fill + border lines on all 6
      // edges, pointer-events:none so clicks pass through to the hit-test
      // div below), and the actual clip-path'd click target (kept for
      // correct hex-shaped hit-testing — a click on this div's own
      // transparent, clipped-away rectangle corners never fires at all).
      // The Lake circle and River paths (direct follow-up request) render
      // in this SAME svg, in LOCAL box-space (HEX_EDGE_MIDPOINTS_LOCAL,
      // not world-space) — above the Geography polygon fill, below the
      // actual .hex-cell click target/center icon that follow, same
      // "overlay independent of the terrain underneath" layering the
      // request itself describes.
      const shapeCx = HEX_W / 2; const shapeCy = HEX_H / 2;
      // Direct bug report: "the river anchor / selector is not working
      // consistently" — root cause was DOM order: .hex-edge buttons used
      // to render BEFORE .hex-cell, so .hex-cell (painted on top,
      // covering almost the whole hex via its own clip-path) silently
      // swallowed most edge clicks before they ever reached the button
      // underneath. Edges now render AFTER .hex-cell, same position in
      // the stacking order as .hex-vertex, which never had this problem.
      // The river hit-path svg (hexRiverHitSvgHtml) has the identical
      // requirement and moves for the identical reason.
      cells.push(`
        <svg class="hex-shape" style="left:${cellLeft}px;top:${cellTop}px" width="${HEX_W.toFixed(1)}" height="${HEX_H.toFixed(1)}">
          <polygon points="${HEX_SVG_POINTS}" fill="${geo ? geo.color : 'var(--hex-default-fill)'}" class="hex-shape-outline ${active ? 'active' : ''}" />
          ${hexLakeSvgHtml(hex, shapeCx, shapeCy)}
          ${hexRiverSvgHtml(doc, mapId, q, r, hex, shapeCx, shapeCy)}
          ${hexRoadSvgHtml(hex, shapeCx, shapeCy)}
        </svg>
        <div class="hex-cell" style="left:${cellLeft}px;top:${cellTop}px;width:${HEX_W.toFixed(1)}px;height:${HEX_H.toFixed(1)}px;clip-path:${HEX_CLIP_PATH}"
             data-hex-select="${esc(mapId)}::${q}::${r}">
          ${geo ? hexGeoGlyphHtml(geo, hex.geoVariant) : ''}
          ${centerHtml}
        </div>
        ${riverToolArmed ? `<svg class="hex-shape hex-river-hit-layer" style="left:${cellLeft}px;top:${cellTop}px" width="${HEX_W.toFixed(1)}" height="${HEX_H.toFixed(1)}">${hexRiverHitSvgHtml(doc, mapId, q, r, hex, shapeCx, shapeCy, riverToolArmed)}</svg>` : ''}
        ${roadToolArmed ? `<svg class="hex-shape hex-road-hit-layer" style="left:${cellLeft}px;top:${cellTop}px" width="${HEX_W.toFixed(1)}" height="${HEX_H.toFixed(1)}">${hexRoadHitSvgHtml(hex, shapeCx, shapeCy, roadToolArmed, mapId, q, r)}</svg>` : ''}
        ${edgeHtml}
        ${vertexHtml}`);
    }
  }
  return cells.join('');
}

function hexDetailPanel(doc, mapId, ui) {
  const sel = ui.hexcrawlSelectedHex;
  if (!sel) return '';
  const hex = getHex(doc, mapId, sel.q, sel.r);
  const loc = hex.locationEntityId ? getEntity(doc, hex.locationEntityId) : null;
  // Rows shown in ENCOUNTER_VERTEX_ORDER's own narrative sequence (top-right,
  // clockwise — "the sequence the encounters are experienced in the hex,"
  // direct follow-up request), not raw array index order, even though the
  // clear button still addresses the real vertex index underneath.
  // Direct follow-up request: "add a clickable link to each encounter and
  // map it to a Conflict entity record... similar to how Location works"
  // — the linked Conflict (if any) shows as a real chip here too, same
  // discoverability the Location row above already has, alongside the
  // vertex button's own click-to-open on the map itself.
  const threatRows = ENCOUNTER_VERTEX_ORDER.map((i, seq) => {
    const threatKey = hex.threats[i];
    const t = threatKey ? findHexcrawlThreat(threatKey) : null;
    const linkedConflict = t && hex.vertexConflicts[i] ? getEntity(doc, hex.vertexConflicts[i]) : null;
    return `<div class="hex-detail-threat-row">
      <span class="dim small">Location ${seq + 1}</span>
      <span>${t ? `${t.glyph} ${esc(t.label)}` : '—'}</span>
      ${linkedConflict ? `<button type="button" class="chip sm" data-open-entity="${esc(linkedConflict.id)}">${esc(linkedConflict.name || 'Unnamed')}</button>` : ''}
      ${t ? `<button type="button" class="icon-btn" data-hex-detail-threat-clear="${esc(mapId)}::${sel.q}::${sel.r}::${i}" title="Clear">✕</button>` : ''}
    </div>`;
  }).join('');
  return `
    <div class="settings-group hex-detail-panel">
      <div class="section-head-row"><h3>Hex (${sel.q}, ${sel.r})</h3>
        <button type="button" class="icon-btn" data-hex-detail-close title="Close">✕</button>
      </div>
      <label class="field-label">Geography
        <select data-hex-detail-geography="${esc(mapId)}::${sel.q}::${sel.r}">
          <option value="">— none —</option>
          ${HEXCRAWL_GEOGRAPHY_ICONS.map((i) => `<option value="${esc(i.key)}" ${hex.geography === i.key ? 'selected' : ''}>${i.glyph} ${esc(i.label)}</option>`).join('')}
        </select>
      </label>
      <div class="field-label">Location
        ${loc
          ? `<div class="entity-chip-row"><button type="button" class="chip" data-open-entity="${esc(loc.id)}">${esc(loc.name || 'Unnamed')}</button>
              <button type="button" class="icon-btn" data-hex-detail-location-clear="${esc(mapId)}::${sel.q}::${sel.r}" title="Unlink">✕</button></div>`
          : `<button type="button" class="btn ghost sm" data-hex-detail-location-pick="${esc(mapId)}::${sel.q}::${sel.r}">＋ Link Location</button>`}
      </div>
      <div class="field-label">Locations (6 corners)${threatRows}</div>
      <div class="field-label">Lake
        ${hex.lake
          ? `<button type="button" class="btn ghost sm" data-hex-detail-lake-clear="${esc(mapId)}::${sel.q}::${sel.r}">Remove Lake</button>`
          : `<button type="button" class="btn ghost sm" data-hex-detail-lake-add="${esc(mapId)}::${sel.q}::${sel.r}">＋ Add Lake</button>`}
      </div>
      <div class="field-label">Rivers (${hex.rivers.length} segment${hex.rivers.length === 1 ? '' : 's'})
        ${hex.rivers.length
          ? `<button type="button" class="btn ghost sm" data-hex-detail-rivers-clear="${esc(mapId)}::${sel.q}::${sel.r}">Clear rivers on this hex</button>`
          : '<span class="dim small">None yet — arm the River tool and click two of this hex\'s borders.</span>'}
      </div>
      <div class="field-label">Roads (${hex.roads.length} segment${hex.roads.length === 1 ? '' : 's'})
        ${hex.roads.length
          ? `<button type="button" class="btn ghost sm" data-hex-detail-roads-clear="${esc(mapId)}::${sel.q}::${sel.r}">Clear roads on this hex</button>`
          : '<span class="dim small">None yet — arm the Road tool and click two of this hex\'s borders.</span>'}
      </div>
      <label class="field-label">Notes
        <textarea rows="3" data-hex-detail-notes="${esc(mapId)}::${sel.q}::${sel.r}" placeholder="Notes…">${esc(hex.notes || '')}</textarea>
      </label>
    </div>`;
}

function hexcrawl(doc, ui = {}) {
  const helpKey = 'hexcrawl-intro';
  const maps = listHexMaps(doc);
  const active = getActiveHexMap(doc);

  // Direct follow-up request: "remove the subtitle 'Hexcrawl' below the
  // section header" — this panel's own h3 used to repeat the drawer
  // chrome's own <h2 data-drawer-title> ("Hexcrawl"), reading as a
  // pointless duplicate (unlike Battlemap's own equivalent title, which
  // says something the drawer chrome doesn't: "Planetfall Grid
  // Battlemap"). Keeps just the help toggle.
  const head = `<div class="section-head-row"><span class="entity-chip-row">${helpToggle(helpKey)}</span></div>
    ${helpBody(helpKey, "Pick a Geography or Location icon below, then click a hex to paint it — a Location icon fills the next open corner automatically and offers to link (or create) a Conflict entity for the encounter that happens there, since one place can see many encounters over time. River: click one border, then another, to draw a segment between them; it keeps going into the next hex, and clicking an existing river line prompts to remove it. Lake: click a hex to add one, or click again for a new shape — rivers can connect to it from any border; remove one from the Hex Detail panel. Road: works just like River, but connects to a hex's own linked Location instead of a lake or the ocean. Click a hex's center to link a Location entity — click it again to open that entity. Click anywhere else on a hex to see/edit its details below the map. Scroll to pan, wheel to zoom.", ui)}
    <div class="battlemap-tabs">
      ${maps.map((m) => `<button type="button" class="btn ghost sm ${active && active.id === m.id ? 'active' : ''}" data-hexcrawl-select="${esc(m.id)}">${esc(m.name)}</button>`).join('')}
      <button type="button" class="chip sm" data-hexcrawl-add>＋ New Map</button>
    </div>`;

  if (!active) return `${head}<p class="ws-placeholder">No hex maps yet — create one to get started.</p>`;

  const cam = ui.hexcrawlCamera || { scale: 1, x: 0, y: 0 };
  return `${head}
    <div class="battlemap-toolbar">
      <span class="hexcrawl-map-name">${esc(active.name)}</span>
      <button type="button" class="icon-btn" data-hexcrawl-rename-open="${esc(active.id)}" title="Rename map">✎</button>
      <button type="button" class="icon-btn" data-hexcrawl-remove="${esc(active.id)}" title="Delete this map" aria-label="Delete map">✕</button>
      <span class="battlemap-camera-controls">
        <button type="button" class="icon-btn" data-hexcrawl-camera-zoom="out" title="Zoom out">－</button>
        <button type="button" class="icon-btn" data-hexcrawl-camera-zoom="in" title="Zoom in">＋</button>
        <button type="button" class="icon-btn" data-hexcrawl-camera-reset title="Reset view">⟲</button>
      </span>
    </div>
    <div class="hexcrawl-palette">${hexcrawlPalette(ui)}</div>
    <div class="hexcrawl-viewport ${ui.hexcrawlPlacingIcon ? 'placing' : ''}" data-hexcrawl-canvas="${esc(active.id)}">
      <div class="hexcrawl-world" style="transform:translate(${cam.x}px,${cam.y}px) scale(${cam.scale})">
        ${hexcrawlGrid(doc, active.id, ui)}
      </div>
    </div>
    ${hexDetailPanel(doc, active.id, ui)}`;
}

// --- Dungeon Crawl (direct follow-up request: a 6x6 tile-grid randomizer
// matching FlexTale's FlexCrawl Toolkit, built from the real owned PDF +
// sample tile images under requirements/FlexTale/ — see data/
// dungeonCrawlTiles.js's own doc comment for sourcing detail and
// domain/dungeonCrawls.js's for the grid/rotation math) -------------------
// Distinct from both battlemap() (freeform 0-1 fractional canvas) and
// hexcrawl() (unbounded pan/zoom hex grid) above: a FIXED 6x6 square grid
// that fits on screen outright, same "no camera needed" posture as
// worldTrackerGrid just below. Built one Tile at a time from an empty
// board via three ephemeral (not persisted) UI states read off `ui`:
// `dungeonCrawlPending` ({mapId,x,y,archetypeKey,rotation} — a Tile picked
// but not yet committed, shown with its 4 corner-rotate buttons + a center
// commit button) and `dungeonCrawlSelected` ({mapId,x,y} — a committed
// Tile whose details are open below the grid).
// Direct follow-up request: "The floor levels dropdown should be an icon
// of several stacked rectangles representing levels or floors. the
// dropdown would appear when clicking the icon." A real native <select>
// is kept underneath (same onChange handler, same data attribute, every
// OS's own accessible picker) — only its visible presentation changes: an
// absolutely-positioned, fully transparent <select> sits over a small
// decorative "stacked rectangles" glyph, so a click/tap anywhere on the
// icon opens the real dropdown (styles/cockpit.css's .dc-floor-icon).
function dcFloorStackIconSvg() {
  return `<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
    <rect x="3" y="3.5" width="14" height="5" rx="1.1" fill="none" stroke="currentColor" stroke-width="1.6"/>
    <rect x="6" y="10" width="14" height="5" rx="1.1" fill="none" stroke="currentColor" stroke-width="1.6"/>
    <rect x="9" y="16.5" width="14" height="5" rx="1.1" fill="none" stroke="currentColor" stroke-width="1.6"/>
  </svg>`;
}

function dungeoncrawl(doc, ui = {}) {
  const maps = listDungeonMaps(doc);
  const active = getActiveDungeonMap(doc);
  // Direct follow-up request: "The tooltip must be on the top row right-
  // aligned from the title 'Dungeon Crawl'" — the toggle itself now lives
  // in shell.js's headExtraForDrawer (same relocation Guide/Documents
  // already use), right beside the drawer chrome's own title; this is
  // just the text it reveals, same as those two.
  const head = helpBody('dungeoncrawl-intro', 'Click the glowing + to place the next Tile — the very first one is always an Entrance; every one after that picks a random Tile from the current pack and shows it pending. Touch any of its 4 corners to rotate it 90°, then click its center to commit. Double-click (or long-press on mobile) an already-placed Tile to reopen it for re-rotating. Click a placed Tile once to see a bigger, zoomable view of it below the grid — handy for reading secret-door and encounter-zone markings. "Merge Tiles" lets you select two or more already-placed, adjacent Tiles forming a rectangle and combine them into one bigger Room. The tile format (Pack) is chosen once, when the map is created, and can\'t be changed afterward. "Link Location" ties this map to a real Cast Location (or creates a new one) — once linked, the Location appears below as a chip; click it to open that entity\'s own record, where this map in turn appears as a link back. A Stairs Down Tile\'s own detail panel can create — and later jump back to — a linked floor below it; once a dungeon has more than one floor, the stacked-rectangles icon opens a Floor switcher. The Dressing dropdown arms a door/secret door/portcullis/stairs/pillar/tree trunk/chest/campfire marker — click a placed Tile (small grid or the big view below) to drop it on that Tile\'s own invisible 12x12 grid (each square = 5\', the book\'s own real Tile scale); DOUBLE-click a placed marker, then confirm, to remove it.', ui);

  if (!maps.length) {
    return `${head}
    <div class="battlemap-toolbar">
      <button type="button" class="btn ghost sm" data-dungeoncrawl-add>＋ New Map</button>
    </div>
    <p class="ws-placeholder">No Dungeon Crawl maps yet — create one to get started.</p>`;
  }
  if (!active) return head; // unreachable in practice (maps.length>0 implies getActiveDungeonMap resolves one), defensive only

  const mergeMode = !!ui.dungeonCrawlMergeMode;
  const mergeSelection = ui.dungeonCrawlMergeSelection || new Set();
  const mergeRect = mergeMode ? computeMergeRectangle([...mergeSelection].map((k) => { const [x, y] = k.split(',').map(Number); return { x, y }; })) : null;
  // Direct follow-up request: "link map records to a location using the
  // look up feature... allow multiple map grids as different floors
  // related to the same map that you can select from a drop down." The
  // Floor icon only appears once this map actually HAS siblings — a
  // brand-new, never-floor-split map shows no switcher at all rather than
  // a pointless single-option one. Direct follow-up request: "The name of
  // the floor must be editable" — each floor option now shows that
  // floor's own real (already freely renamable, via the pencil icon)
  // name, with its structural Ground Floor/Floor N/B-N label alongside
  // for orientation, rather than just the generic structural label alone.
  const linkedLocation = active.locationEntityId ? getEntity(doc, active.locationEntityId) : null;
  const floors = listDungeonFloors(doc, active.floorGroupId);
  const floorIcon = floors.length > 1
    ? `<label class="icon-btn dc-floor-icon" title="Switch floor — same dungeon, a different level of it">
        ${dcFloorStackIconSvg()}
        <select class="dc-floor-select-native" data-dungeoncrawl-floor-select="${esc(active.id)}">
          ${floors.map((f) => `<option value="${esc(f.id)}" ${f.id === active.id ? 'selected' : ''}>${esc(f.name)} (${esc(floorLabel(f.floorIndex))})</option>`).join('')}
        </select>
      </label>`
    : '';
  const armedDressing = ui.dungeonCrawlArmedDressing || '';
  const dressingOptions = DUNGEON_DRESSING_ICONS.map((d) => `<option value="${esc(d.key)}" ${d.key === armedDressing ? 'selected' : ''}>${d.glyph} ${esc(d.label)}</option>`).join('');
  // Direct follow-up request: "Replace the chips showing the maps with a
  // dropdown selecting the active map. Next to the dropdown is a pencil
  // icon to edit the map name. To the right of that is the Dressing
  // dropdown and an icon showing Merge for merging the tiles." — those
  // four, in that exact order; Floor/+New/Delete (not part of that
  // explicit sequence) trail after Merge rather than breaking it up.
  const mapOptions = maps.map((m) => `<option value="${esc(m.id)}" ${m.id === active.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('');
  return `${head}
    <div class="battlemap-toolbar">
      <select data-dungeoncrawl-select title="Switch map">${mapOptions}</select>
      <button type="button" class="icon-btn" data-dungeoncrawl-rename-open="${esc(active.id)}" title="Rename map">✎</button>
      <select data-dungeoncrawl-dressing-arm title="Pick a dungeon-dressing object, then click a placed Tile to drop it on its 12x12 grid">
        <option value="">＋ Dressing…</option>
        ${dressingOptions}
      </select>
      <button type="button" class="icon-btn ${mergeMode ? 'active' : ''}" data-dungeoncrawl-merge-toggle title="${mergeMode ? 'Merge mode on — select two or more adjacent placed Tiles forming a rectangle, then confirm' : 'Merge Tiles — select two or more adjacent placed Tiles forming a rectangle and combine them into one bigger Room'}">${mergeMode ? '✓' : '⊞'}</button>
      ${floorIcon}
      <button type="button" class="icon-btn" data-dungeoncrawl-add title="New Map">＋</button>
      <button type="button" class="icon-btn" data-dungeoncrawl-remove="${esc(active.id)}" title="Delete this map" aria-label="Delete map">🗑</button>
      ${mergeMode && mergeRect ? `<button type="button" class="btn sm" data-dungeoncrawl-merge-commit="${esc(active.id)}">✓ Merge ${mergeSelection.size} Tiles into a Room</button>` : ''}
      ${mergeMode ? `<button type="button" class="btn ghost sm" data-dungeoncrawl-merge-cancel>✕ Cancel</button>` : ''}
    </div>
    <div class="entity-chip-row dc-location-row">
      ${linkedLocation
        ? `<button type="button" class="entity-chip" data-open-entity="${esc(linkedLocation.id)}" title="Open ${esc(linkedLocation.name || 'Unnamed')}">📍 ${esc(linkedLocation.name || 'Unnamed')}</button>
           <button type="button" class="icon-btn" data-dungeoncrawl-location-unlink="${esc(active.id)}" title="Unlink Location">✕</button>`
        : `<button type="button" class="chip sm" data-dungeoncrawl-location-link="${esc(active.id)}" title="Link this map to a Cast Location (or create one)">📍 ＋ Link Location</button>`}
    </div>
    ${mergeMode ? `<p class="dim small">${mergeSelection.size === 0 ? 'Click two or more adjacent, already-placed Tiles to select them.' : mergeRect ? `${mergeSelection.size} Tiles selected — forms a valid ${mergeRect.w}×${mergeRect.h} rectangle.` : `${mergeSelection.size} Tiles selected — must form a solid rectangle with no gaps before they can be merged.`}</p>` : ''}
    ${armedDressing ? `<p class="dim small">Click anywhere on a placed Tile (small grid or the big view below) to drop a ${esc((findDungeonDressingIcon(armedDressing) || {}).label || armedDressing)} there — it snaps to the nearest 5' square. Double-click (then confirm) a placed dressing icon to remove it.</p>` : ''}
    <div class="dungeoncrawl-grid">${dungeoncrawlCells(doc, active, ui)}</div>
    ${dungeoncrawlTileDetail(doc, active, ui)}`;
}

function dungeoncrawlCells(doc, map, ui) {
  const pending = ui.dungeonCrawlPending && ui.dungeonCrawlPending.mapId === map.id ? ui.dungeonCrawlPending : null;
  const appendCells = pending ? [] : computeDungeonAppendCells(map, ALL_DUNGEON_CRAWL_ARCHETYPES);
  const appendSet = new Set(appendCells.map((c) => `${c.x},${c.y}`));
  const pack = findDungeonCrawlPack(map.pack);
  const selected = ui.dungeonCrawlSelected && ui.dungeonCrawlSelected.mapId === map.id ? ui.dungeonCrawlSelected : null;
  const mergeMode = !!ui.dungeonCrawlMergeMode;
  const mergeSelection = ui.dungeonCrawlMergeSelection || new Set();
  let out = '';
  for (let y = 0; y < DUNGEON_GRID_SIZE; y++) {
    for (let x = 0; x < DUNGEON_GRID_SIZE; x++) {
      const k = `${x},${y}`;
      const isPending = pending && pending.x === x && pending.y === y;
      const tile = getDungeonTile(doc, map.id, x, y);
      // A cell covered by a merged Room (domain/dungeonCrawls.js's
      // mergeDungeonTilesIntoRoom) renders ONCE, at its own top-left
      // (anchor) corner, spanning the Room's full footprint via plain CSS
      // Grid column/row spans — every OTHER cell it covers is skipped
      // entirely (not even an empty placeholder), and CSS Grid's own
      // auto-placement algorithm flows the rest of the board around that
      // span correctly on its own.
      if (tile && tile.room) {
        if (tile.room.x !== x || tile.room.y !== y) continue; // not the anchor — already covered by it
        const isSel = selected && selected.x === x && selected.y === y;
        out += `<button type="button" class="dungeoncrawl-cell filled dc-room ${isSel ? 'sel' : ''}" style="grid-column:span ${tile.room.w};grid-row:span ${tile.room.h};aspect-ratio:${tile.room.w}/${tile.room.h};" data-dungeoncrawl-cell="${map.id},${x},${y}" title="Room (${tile.room.w}×${tile.room.h})">
          ${dungeonBigRoomArtHtml(pack)}
        </button>`;
        continue;
      }
      if (isPending) {
        const arch = findDungeonCrawlArchetype(pending.archetypeKey);
        out += `<div class="dungeoncrawl-cell pending" data-dungeoncrawl-cell="${map.id},${x},${y}">
          ${dungeonTileArtHtml(arch, pack, pending.rotation)}
          <button type="button" class="dc-corner dc-corner-tl" data-dungeoncrawl-rotate="${map.id},${x},${y}" title="Rotate 90°" aria-label="Rotate"></button>
          <button type="button" class="dc-corner dc-corner-tr" data-dungeoncrawl-rotate="${map.id},${x},${y}" title="Rotate 90°" aria-label="Rotate"></button>
          <button type="button" class="dc-corner dc-corner-bl" data-dungeoncrawl-rotate="${map.id},${x},${y}" title="Rotate 90°" aria-label="Rotate"></button>
          <button type="button" class="dc-corner dc-corner-br" data-dungeoncrawl-rotate="${map.id},${x},${y}" title="Rotate 90°" aria-label="Rotate"></button>
          <button type="button" class="dc-commit" data-dungeoncrawl-commit="${map.id},${x},${y}" title="Commit this Tile" aria-label="Commit">✓</button>
          <button type="button" class="dc-reroll" data-dungeoncrawl-reroll="${map.id},${x},${y}" title="Pick a different random Tile" aria-label="Reroll">🎲</button>
          <button type="button" class="dc-cancel" data-dungeoncrawl-cancel="${map.id},${x},${y}" title="Cancel" aria-label="Cancel">✕</button>
        </div>`;
      } else if (tile) {
        const arch = findDungeonCrawlArchetype(tile.archetypeKey);
        const isSel = selected && selected.x === x && selected.y === y;
        const isMergeSel = mergeMode && mergeSelection.has(k);
        const title = arch ? `${arch.label}${arch.stairs ? ' (Stairs Down)' : ''}` : '';
        // A plain <div> (not <button>, like every OTHER filled cell here)
        // — direct follow-up request's dressing icons each need their own
        // nested, independently-clickable remove button (dungeon
        // DressingOverlayHtml below), and a <button> can't legally contain
        // another <button>. role="button"/tabindex keep it keyboard-
        // reachable despite not being a real button element.
        out += `<div class="dungeoncrawl-cell filled ${isSel ? 'sel' : ''} ${isMergeSel ? 'merge-sel' : ''}" role="button" tabindex="0" data-dungeoncrawl-cell="${map.id},${x},${y}" title="${esc(title)}">
          ${arch ? dungeonTileArtHtml(arch, pack, tile.rotation) : ''}
          ${dungeonDressingOverlayHtml(tile, map.id, x, y)}
        </div>`;
      } else if (appendSet.has(k) && !mergeMode) {
        out += `<button type="button" class="dungeoncrawl-cell append" data-dungeoncrawl-append="${map.id},${x},${y}" title="Place the next Tile here">＋</button>`;
      } else {
        // Direct follow-up request: "allow an unused cell in dungeon crawl
        // to be selected from a double click or long press on mobile to
        // add another tile where an entrance is not automatically
        // apparent in the case of a secret door being revealed through
        // gameplay and now there might be an adjacent chamber or tunnel."
        // computeDungeonAppendCells only ever offers the "+" handle next
        // to an already-OPEN edge (appendSet above) — a cell behind a
        // Tile's own CLOSED edge (exactly the secret-door case) has no
        // other way in at all without this. A single click/tap still does
        // nothing here (the shared dcCell handler, shell.js, only reacts
        // to the SAME double-click/long-press gesture the reactivate-a-
        // placed-Tile flow already uses), so an ordinary empty cell stays
        // inert until the GM deliberately double-clicks/long-presses it.
        out += `<div class="dungeoncrawl-cell empty" role="button" tabindex="0" data-dungeoncrawl-cell="${map.id},${x},${y}" title="Double-click (or long-press on mobile) to place a Tile here — e.g. a passage revealed by a secret door"></div>`;
      }
    }
  }
  return out;
}

/** Renders one Tile's art, rotated, sized to fill its parent (the small
 *  grid cell's own absolute-inset:0 layering, see .dungeoncrawl-tile-art)
 *  — an <img> for the `dungeon` pack's real extracted Player-side photo
 *  art, or a generated inline <svg> for the two procedural packs (`cave`/
 *  `forest`) — see data/dungeonCrawlTiles.js's own doc comment for why
 *  those two have no real source art to extract from. The Entrance
 *  Archetype (data/dungeonCrawlTiles.js's DUNGEON_CRAWL_ENTRANCE_ARCHETYPE)
 *  always renders procedurally regardless of pack — nothing in the real
 *  book defines one, so there's no photo art for it to use even under the
 *  `dungeon` pack. Either way the WHOLE element is rotated via a plain CSS
 *  transform, mirroring the book's own "physically rotate the printed
 *  square card" model (p.51) exactly. */
function dungeonTileArtHtml(archetype, pack, rotation) {
  if (!archetype) return '';
  const rot = Number(rotation) || 0;
  if (archetype.entrance) {
    return `<div class="dungeoncrawl-tile-art" style="transform:rotate(${rot}deg)">${dungeonEntranceSvg(pack)}</div>`;
  }
  if (pack.kind === 'image') {
    return `<img class="dungeoncrawl-tile-art" src="./${pack.imageDir}/${esc(archetype.key)}.png" alt="${esc(archetype.label)}" style="transform:rotate(${rot}deg)">`;
  }
  return `<div class="dungeoncrawl-tile-art" style="transform:rotate(${rot}deg)">${dungeonProceduralTileSvg(archetype, pack)}</div>`;
}

/** The big, zoomable Tile Detail view's own art — direct follow-up
 *  request: "allow zoom capability to read markings like secret doors and
 *  color coded encounter zones." For the `dungeon` pack this swaps in the
 *  real Full/GM-side image (pack.imageFullDir, much higher resolution than
 *  the small grid art) instead of the Player-side one, since that's the
 *  version that actually carries those markings; the two procedural packs
 *  have no separate "full" asset at all (their SVG is already generated
 *  fresh and scales to any size with zero quality loss), so they just
 *  reuse the exact same render as the small grid cell. Sized to fill
 *  whatever box the caller gives it (no absolute positioning, unlike
 *  dungeonTileArtHtml above) since the Tile Detail panel controls its own
 *  zoom level via a plain CSS width percentage on the PARENT element. */
function dungeonTileDetailArtHtml(archetype, pack, rotation) {
  if (!archetype) return '';
  const rot = Number(rotation) || 0;
  if (archetype.entrance) {
    return `<div class="dc-detail-art-inner" style="transform:rotate(${rot}deg)">${dungeonEntranceSvg(pack)}</div>`;
  }
  if (pack.kind === 'image') {
    const dir = pack.imageFullDir || pack.imageDir;
    const ext = pack.imageFullDir ? 'jpg' : 'png';
    return `<img class="dc-detail-art-inner" src="./${dir}/${esc(archetype.key)}.${ext}" alt="${esc(archetype.label)}" style="transform:rotate(${rot}deg)">`;
  }
  return `<div class="dc-detail-art-inner" style="transform:rotate(${rot}deg)">${dungeonProceduralTileSvg(archetype, pack)}</div>`;
}

// Direct follow-up request: "have an invisible 1" grid overlay to each tile
// that will allow graphic objects to snap to the grid... doors, secret
// doors, porcullis, stairs up or down, pillars, tree trunks, chests,
// campfires... This would also be seen on the enlarged image in the lower
// section below the map." Renders every dressing object already placed on
// this Tile (tile.dressing, domain/dungeonCrawls.js) as a small glyph
// absolutely-positioned by percentage (gx/gy out of data/
// dungeonCrawlDressing.js's DUNGEON_TILE_GRID_SIZE) — percentage, not a
// pixel offset, is what makes the EXACT SAME markup/data read correctly at
// both the tiny grid cell's own size AND the Tile Detail panel's big
// zoomed view, no separate "detail view" variant needed. Each one is its
// own small button (data-dungeoncrawl-dressing-remove) so clicking it
// removes it — shell.js's placement click handlers (both the small grid's
// dcCell and the big view's own data-dungeoncrawl-detail-place) are
// checked AFTER this more specific target, so clicking an existing icon
// never also places a new one underneath it.
function dungeonDressingOverlayHtml(tile, mapId, x, y) {
  const items = (tile && Array.isArray(tile.dressing)) ? tile.dressing : [];
  if (!items.length) return '';
  return items.map((d) => {
    const icon = findDungeonDressingIcon(d.iconKey);
    if (!icon) return '';
    const leftPct = ((d.gx + 0.5) / DUNGEON_TILE_GRID_SIZE) * 100;
    const topPct = ((d.gy + 0.5) / DUNGEON_TILE_GRID_SIZE) * 100;
    return `<button type="button" class="dc-dressing-icon${icon.secret ? ' secret' : ''}" style="left:${leftPct.toFixed(2)}%;top:${topPct.toFixed(2)}%;" data-dungeoncrawl-dressing-remove="${mapId},${x},${y},${esc(d.id)}" title="${esc(icon.label)} — double-click, then confirm, to remove">${icon.glyph}</button>`;
  }).join('');
}

// Generic edges/chamber/stairs -> SVG renderer shared by BOTH procedural
// packs (`cave`/`forest`) — only `pack.palette`'s three colors differ
// between them, so re-skinning a map between them (or even back to
// `dungeon`) never touches a placed Tile's own stored layout.
function dungeonProceduralTileSvg(archetype, pack) {
  const { edges, chamber, stairs } = archetype;
  const { floor, wall, decor } = pack.palette;
  const half = chamber ? 34 : 15;
  const lo = 50 - half; const hi = 50 + half;
  const armPath = (dir) => {
    if (dir === 'N') return `M${lo},${lo} L${hi},${lo} L${hi},0 L${lo},0 Z`;
    if (dir === 'S') return `M${lo},${hi} L${hi},${hi} L${hi},100 L${lo},100 Z`;
    if (dir === 'E') return `M${hi},${lo} L100,${lo} L100,${hi} L${hi},${hi} Z`;
    return `M${lo},${lo} L0,${lo} L0,${hi} L${lo},${hi} Z`; // W
  };
  let arms = '';
  for (const dir of ['N', 'E', 'S', 'W']) { if (edges[dir]) arms += `<path d="${armPath(dir)}" fill="${floor}"/>`; }
  const dot = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="4.5" fill="${decor}"/>`;
  const decorDots = dot(10, 10) + dot(90, 10) + dot(10, 90) + dot(90, 90);
  const stairsMark = stairs
    ? `<g stroke="${wall}" stroke-width="2.2" stroke-linecap="round"><line x1="38" y1="42" x2="62" y2="42"/><line x1="40" y1="48" x2="60" y2="48"/><line x1="42" y1="54" x2="58" y2="54"/><line x1="44" y1="60" x2="56" y2="60"/></g>`
    : '';
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
    <rect x="0" y="0" width="100" height="100" fill="${wall}"/>
    <path d="M${lo},${lo} L${hi},${lo} L${hi},${hi} L${lo},${hi} Z" fill="${floor}"/>
    ${arms}${decorDots}${stairsMark}
  </svg>`;
}

// The Entrance Archetype's own art (data/dungeonCrawlTiles.js's
// DUNGEON_CRAWL_ENTRANCE_ARCHETYPE) — direct follow-up request: "start the
// first tile with an entrance such as a door, cave, or stairs." Reuses the
// same floor/wall palette every procedural Tile does (`pack.palette`, or
// DUNGEON_ROOM_FALLBACK_PALETTE for the `dungeon` pack, which has no
// `palette` of its own since it normally uses real photo art instead), but
// always draws its own icon rather than delegating to
// dungeonProceduralTileSvg — the icon itself is pack-specific (a stone
// doorway/cave mouth/flight of steps, one per pack, matching the user's own
// 3 named examples) rather than driven by edges/chamber/stairs flags the
// way an ordinary Archetype's art is.
function dungeonEntranceSvg(pack) {
  const palette = pack.palette || DUNGEON_ROOM_FALLBACK_PALETTE;
  const { floor, wall } = palette;
  const half = 15; const lo = 50 - half; const hi = 50 + half;
  const westArm = `M${lo},${lo} L0,${lo} L0,${hi} L${lo},${hi} Z`;
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
    <rect x="0" y="0" width="100" height="100" fill="${wall}"/>
    <path d="M${lo},${lo} L${hi},${lo} L${hi},${hi} L${lo},${hi} Z" fill="${floor}"/>
    <path d="${westArm}" fill="${floor}"/>
    ${dungeonEntranceIconSvg(pack.key, wall, floor)}
  </svg>`;
}

function dungeonEntranceIconSvg(packKey, wall, floor) {
  if (packKey === 'cave') {
    // A jagged, irregular cave-mouth opening.
    return `<path d="M35,30 Q40,15 50,18 Q60,14 66,28 Q72,40 62,46 Q50,52 40,45 Q30,40 35,30 Z" fill="${floor}" stroke="${wall}" stroke-width="2"/>`;
  }
  if (packKey === 'forest') {
    // A short flight of steps up to the surface/clearing.
    return `<g fill="none" stroke="${wall}" stroke-width="2.6" stroke-linecap="round">
      <line x1="30" y1="58" x2="48" y2="58"/>
      <line x1="38" y1="48" x2="56" y2="48"/>
      <line x1="46" y1="38" x2="64" y2="38"/>
      <line x1="54" y1="28" x2="72" y2="28"/>
    </g>`;
  }
  // `dungeon` (and the fallback for any future pack) — a simple arched
  // stone doorway.
  return `<path d="M38,58 L38,32 Q38,16 50,16 Q62,16 62,32 L62,58" fill="none" stroke="${wall}" stroke-width="3.2"/>
    <line x1="50" y1="18" x2="50" y2="58" stroke="${wall}" stroke-width="1.6"/>`;
}

// A merged multi-Tile Room's own art (domain/dungeonCrawls.js's
// mergeDungeonTilesIntoRoom) — direct follow-up request: "replace them
// with a larger tile that gives a bigger room." There's no real source art
// for an arbitrarily-sized merged footprint (every real Archetype image is
// exactly one Tile square), so this always renders as a plain floor-
// colored rectangle with corner decoration, regardless of which pack is
// active — `dungeon` falls back to DUNGEON_ROOM_FALLBACK_PALETTE since it
// has no `palette` of its own. Deliberately simple/undetailed (no wall
// openings drawn) since a merged Room no longer corresponds to any one
// Archetype's own connector layout — its TRUE outer openings still work
// for Tile-append purposes (domain/dungeonCrawls.js's own doc comment
// explains why), they're just not re-drawn here.
function dungeonBigRoomArtHtml(pack) {
  const { floor, wall, decor } = pack.palette || DUNGEON_ROOM_FALLBACK_PALETTE;
  const dot = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="3" fill="${decor}"/>`;
  return `<div class="dungeoncrawl-tile-art dc-room-art">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none">
      <rect x="0" y="0" width="100" height="100" fill="${wall}"/>
      <rect x="4" y="4" width="92" height="92" rx="2" fill="${floor}"/>
      ${dot(10, 10)}${dot(90, 10)}${dot(10, 90)}${dot(90, 90)}
    </svg>
  </div>`;
}

// Direct follow-up request: "Below the enlarged map tile picture needs to
// be a key explaining the color and number coding used in the tiles to
// represent encounter options per FlexTale." Real source: FlexCrawl
// Toolkit's own Table 18 (data/dungeonCrawlTiles.js's own doc comment has
// the full citation/extraction detail). Only the `dungeon` pack's own
// "Full"/GM-side image actually carries these real color-coded markers —
// this app's two procedural packs (`cave`/`forest`) are original
// stylized art with none of that real licensed detail, so the legend
// only ever renders alongside the pack it's actually true of.
function dungeonContentLegendHtml(pack) {
  if (pack.kind !== 'image') return '';
  return `<div class="dc-content-legend">
    <p class="field-label sm">Dynamic Content Key <span class="five-leagues-hint" title="FlexCrawl Toolkit, Table 18 (p.82) — each colored box is ONE of up to 6 possible locations for that category's content on this Tile; a box existing doesn't mean that content is actually present, only that it COULD be. To find out, roll a d6 per category you want to check — a result matching a box's own printed number says that's where it is.">ⓘ</span></p>
    <div class="dc-content-legend-rows">
      ${FLEXCRAWL_DYNAMIC_CONTENT_CATEGORIES.map((c) => `
        <div class="dc-content-legend-row">
          <span class="dc-content-legend-swatch" style="background:${c.swatch}" aria-hidden="true"></span>
          <span class="dc-content-legend-label">${esc(c.label)}</span>
          <span class="dim small">${esc(c.description)}</span>
        </div>`).join('')}
      <div class="dc-content-legend-row">
        <span class="dc-content-legend-swatch dc-content-legend-secret" aria-hidden="true">S</span>
        <span class="dc-content-legend-label">Secret Door</span>
        <span class="dim small">A door or passage not shown on the Player map — only visible here, on the Full/GM view.</span>
      </div>
    </div>
  </div>`;
}

function dungeoncrawlTileDetail(doc, map, ui) {
  const sel = ui.dungeonCrawlSelected && ui.dungeonCrawlSelected.mapId === map.id ? ui.dungeonCrawlSelected : null;
  if (!sel) return '';
  const tile = getDungeonTile(doc, map.id, sel.x, sel.y);
  if (!tile) return '';
  const pack = findDungeonCrawlPack(map.pack);
  // A merged Room has no single Archetype/rotation to show — a distinct,
  // simpler detail branch: notes (reusing the anchor cell's own `notes`
  // field as the whole Room's shared notes) plus Un-merge/Remove instead
  // of Rotate/Remove.
  if (tile.room) {
    return `<div class="settings-group dungeoncrawl-tile-detail">
      <h3>Room (${tile.room.w}×${tile.room.h}) at (${sel.x},${sel.y})</h3>
      <div class="dc-detail-viewport"><div class="dc-detail-art" style="width:100%;">${dungeonBigRoomArtHtml(pack)}</div></div>
      <label class="field-label">Notes</label>
      <textarea class="oracle-field-textarea" rows="2" data-dungeoncrawl-tile-notes="${map.id},${sel.x},${sel.y}" placeholder="Secrets, traps, encounters here…">${esc(tile.notes || '')}</textarea>
      <div class="btn-col">
        <button type="button" class="btn ghost sm" data-dungeoncrawl-unmerge-room="${map.id},${sel.x},${sel.y}">↩ Un-merge back into individual Tiles</button>
        <button type="button" class="btn ghost sm" data-dungeoncrawl-remove-room="${map.id},${sel.x},${sel.y}">✕ Remove this Room</button>
      </div>
    </div>`;
  }
  const arch = findDungeonCrawlArchetype(tile.archetypeKey);
  const zoom = Math.max(1, Math.min(4, Number(ui.dungeonCrawlDetailZoom) || 1));
  // Direct follow-up request: "allow multiple map grids as different
  // floors... create on the fly when selecting yes when promoted after
  // clicking on a tile that has a down staircase" — only a Stairs Down
  // Tile gets this row at all; already-linked just navigates (switches the
  // active map), unlinked offers to create one (the actual confirm prompt
  // + creation is shell.js's data-dungeoncrawl-create-floor handler, kept
  // out of this pure render function).
  const floorBtn = arch && arch.stairs
    ? tile.linkedFloorMapId
      ? `<button type="button" class="btn ghost sm" data-dungeoncrawl-goto-floor="${esc(tile.linkedFloorMapId)}">⬇ Go to Floor Below</button>`
      : `<button type="button" class="btn ghost sm" data-dungeoncrawl-create-floor="${map.id},${sel.x},${sel.y}">⬇ Create Floor Below</button>`
    : '';
  return `<div class="settings-group dungeoncrawl-tile-detail">
    <h3>Tile (${sel.x},${sel.y}) — ${esc(arch ? arch.label : 'Unknown')}</h3>
    <div class="dc-detail-viewport">
      <div class="dc-detail-art" data-dungeoncrawl-detail-place="${map.id},${sel.x},${sel.y}" style="width:${zoom * 100}%;">
        ${arch ? dungeonTileDetailArtHtml(arch, pack, tile.rotation) : ''}
        ${dungeonDressingOverlayHtml(tile, map.id, sel.x, sel.y)}
      </div>
    </div>
    <div class="dc-detail-zoom-controls">
      <button type="button" class="icon-btn" data-dc-detail-zoom="out" title="Zoom out">－</button>
      <span class="dim small">${Math.round(zoom * 100)}%</span>
      <button type="button" class="icon-btn" data-dc-detail-zoom="in" title="Zoom in">＋</button>
      <button type="button" class="icon-btn" data-dc-detail-zoom-reset title="Reset zoom">⟲</button>
    </div>
    ${dungeonContentLegendHtml(pack)}
    <p class="dim small">Rotation: ${tile.rotation}°${arch && arch.stairs ? ' · Stairs Down' : ''}${arch && arch.chamber ? ' · Chamber' : ''}${arch && arch.entrance ? ' · Entrance' : ''}</p>
    <label class="field-label">Notes</label>
    <textarea class="oracle-field-textarea" rows="2" data-dungeoncrawl-tile-notes="${map.id},${sel.x},${sel.y}" placeholder="Secrets, traps, encounters here…">${esc(tile.notes || '')}</textarea>
    <div class="btn-col">
      ${floorBtn}
      <button type="button" class="btn ghost sm" data-dungeoncrawl-reactivate="${map.id},${sel.x},${sel.y}">↻ Re-rotate this Tile</button>
      <button type="button" class="btn ghost sm" data-dungeoncrawl-remove-tile="${map.id},${sel.x},${sel.y}">✕ Remove this Tile</button>
    </div>
  </div>`;
}

// --- World Tracker (requirements/PLANETFALL_world_tracker.md) -------------
// Strategic 6x6 sector map — distinct from the TACTICAL battlemap() above
// (different layout model entirely: fixed integer grid cells here vs.
// battlemap's freeform 0-1 fractional placement, so no shared markup/CSS).
// Plain click-based internal tab strip, exactly SETTINGS_TABS' own pattern
// — no pan/zoom camera needed since the grid is fixed-size and small
// enough to fit on screen outright.
// Sectors first, and the default tab (direct follow-up request — this is
// where the actual play happens; Actions is secondary). 'actions' was
// 'overview' before its own direct-follow-up rename.
const WORLD_TRACKER_TABS = [
  { id: 'sectors', label: 'Sectors' },
  { id: 'actions', label: 'Actions' },
  { id: 'features', label: 'Features' },
  { id: 'missions', label: 'Missions' },
  { id: 'notes', label: 'Notes' },
];

const WT_CORNERS = ['top_left', 'top_right', 'bottom_left', 'bottom_right'];
const WT_FEATURE_KINDS = [
  { kind: 'alien_site', label: 'Alien Site' },
  { kind: 'enemy_camp', label: 'Enemy Camp' },
  { kind: 'resource_node', label: 'Resource Node' },
  { kind: 'milestone_site', label: 'Milestone Site' },
];
function wtFeatureLabel(kind) { return (WT_FEATURE_KINDS.find((f) => f.kind === kind) || {}).label || kind; }

function worldTracker(doc, ui = {}) {
  const activeTab = WORLD_TRACKER_TABS.some((t) => t.id === ui.worldTrackerTab) ? ui.worldTrackerTab : 'sectors';
  const tabBar = `<div class="settings-tab-bar">${WORLD_TRACKER_TABS.map((t) => `
    <button class="btn ghost sm ${t.id === activeTab ? 'active' : ''}" data-world-tracker-tab="${t.id}" aria-selected="${t.id === activeTab}">${esc(t.label)}</button>`).join('')}</div>`;
  const sections = {
    sectors: () => worldTrackerSectorsTab(doc, ui),
    actions: () => worldTrackerActionsTab(doc),
    features: () => worldTrackerFeaturesTab(doc, ui),
    missions: () => worldTrackerMissionsTab(doc),
    notes: () => worldTrackerNotesTab(doc),
  };
  return `${tabBar}${sections[activeTab]()}`;
}

// Direct request: surface each pending decision as a step in the tool's
// own UI (the GM shouldn't have to notice by clicking through Sectors/
// Missions on their own) — never decide it for them, only point at it;
// every item below still needs the GM to click something to act.
function worldTrackerAttentionSection(doc) {
  const items = worldTrackerAttentionItems(doc);
  if (!items.length) return `
    <div class="settings-group">
      <h3>What needs your attention</h3>
      <p class="dim small">Nothing pending right now.</p>
    </div>`;
  const rows = items.map((item) => {
    if (item.kind === 'home-base') {
      return `<div class="doc-card">
        <div class="doc-card-head"><span><b>${esc(item.label)}</b></span><button class="btn ghost sm" data-home-base-roll>🎲 Roll</button></div>
        <p class="dim small">${esc(item.detail)}</p>
      </div>`;
    }
    if (item.kind === 'investigation-sites') {
      return `<div class="doc-card">
        <div class="doc-card-head"><span><b>${esc(item.label)}</b></span><button class="btn ghost sm" data-world-tracker-tab="sectors">Go to Sectors</button></div>
        <p class="dim small">${esc(item.detail)}</p>
      </div>`;
    }
    // 'mission'
    return `<div class="doc-card">
      <div class="doc-card-head"><span><b>${esc(item.label)}</b></span>${worldTrackerMissionRunButton(item)}</div>
      <p class="dim small">${esc(item.detail)}</p>
    </div>`;
  }).join('');
  return `
    <div class="settings-group">
      <h3>What needs your attention</h3>
      <div class="doc-list">${rows}</div>
    </div>`;
}

function worldTrackerActionsTab(doc) {
  const fields = getColonyFields(doc);
  const turn = Number(fields.campaignTurn) || 0;
  const milestones = Math.max(0, Math.min(7, Number(fields.campaignMilestones) || 0));
  const hb = doc.worldTracker && doc.worldTracker.homeBaseSector;
  return `
    ${worldTrackerAttentionSection(doc)}
    <div class="settings-group">
      <h3>Campaign Progress</h3>
      <p>Turn <b>${turn}</b> <button class="btn ghost sm" data-world-turn-advance title="Advance to the next turn — also clears any camp's 'moved from' marker">End Turn ▸</button></p>
      <p>Milestones <span class="num-stepper"><button type="button" class="icon-btn num-stepper-btn" data-world-milestone-dec title="-1">−</button> <b>${milestones} / 7</b> <button type="button" class="icon-btn num-stepper-btn" data-world-milestone-inc title="+1">＋</button></span></p>
      <p class="dim small">Shared with Colony's own Turn Sheet (Campaign Turn/Campaign Milestones) — editing either place updates the same value.</p>
    </div>
    <div class="settings-group">
      <h3>Home Base</h3>
      ${hb ? `<p>Sector <b>${hb.x},${hb.y}</b></p>` : `<p class="dim small">Not set yet.</p>`}
      <div class="btn-col"><button class="btn ghost sm" data-home-base-roll>🎲 Roll Home Base (1d6 × 1d6)</button></div>
      <p class="dim small">Or open a sector in the Sectors tab and use "Set as Home Base."</p>
    </div>
    <div class="settings-group">
      <h3>Reset</h3>
      <p class="dim small">Clears every sector, the home base, and the world-level notes — starts the grid over from scratch. This cannot be undone.</p>
      <button class="btn ghost" data-world-tracker-reset>🗑 Reset World Tracker</button>
    </div>`;
}

function worldTrackerGrid(doc, ui) {
  const gridSize = gridSizeOf(doc);
  const hb = doc.worldTracker && doc.worldTracker.homeBaseSector;
  const selected = ui.worldTrackerSelectedSector;
  let cells = '';
  for (let y = 1; y <= gridSize; y++) {
    for (let x = 1; x <= gridSize; x++) {
      const sector = getSector(doc, x, y);
      const isHome = !!(hb && hb.x === x && hb.y === y);
      const iconKey = sector.overlayIcon || deriveSectorIcon(sector, isHome);
      const icon = iconKey ? findWorldTrackerIcon(iconKey) : null;
      const corners = WT_CORNERS.map((c) => {
        const label = sector.cornerLabels.find((l) => l.corner === c);
        return `<span class="wt-corner wt-corner-${c}">${label ? esc(label.text) : ''}</span>`;
      }).join('');
      const isSelected = !!(selected && selected.x === x && selected.y === y);
      cells += `<button type="button" class="wt-sector wt-sector-${sector.state} ${isSelected ? 'active' : ''}" style="--wt-resource:${sector.resourceLevel || 0};--wt-hazard:${sector.hazardLevel || 0}" data-sector-select="${x},${y}" title="Sector ${x},${y} — ${sector.state}">
        ${corners}
        ${icon ? `<span class="wt-sector-icon">${esc(icon.glyph)}</span>` : ''}
      </button>`;
    }
  }
  return `<div class="wt-grid" style="--wt-grid-size:${gridSize}">${cells}</div>`;
}

function worldTrackerMigratePicker(doc, ui, x, y, feature) {
  if (!ui.worldTrackerMigrateOpen || !ui.worldTrackerMigrateOpen.has(feature.id)) return '';
  const targets = adjacentSectors(x, y, gridSizeOf(doc));
  return `<div class="wt-migrate-picker">
    <span class="dim small">Migrate to:</span>
    ${targets.map((c) => `<button class="btn ghost sm" data-feature-migrate-to data-from-x="${x}" data-from-y="${y}" data-feature-id="${esc(feature.id)}" data-to-x="${c.x}" data-to-y="${c.y}">${c.x},${c.y}</button>`).join('')}
  </div>`;
}

// A traditional "hidden/not visible" icon — eye outline crossed by a
// diagonal slash — replacing the 🙈 "see-no-evil monkey" emoji that used to
// mark a feature "Mark undiscovered" (direct follow-up request: it read as
// a joke/animal glyph, not "hidden"). Direct follow-up request ("use these
// icons for viewed and unviewed for the discovered/undiscovered states")
// paired it with a matching plain-eye SVG (same viewBox/stroke, just the
// outline plus a pupil, no slash) — icon now reflects the feature's CURRENT
// state (open eye = discovered/viewed, slashed eye = undiscovered/
// unviewed), not the action a click performs; the button's own title still
// names that action either way.
const EYE_SLASH_ICON = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2.5 12S6 6 12 6c1.6 0 3 .4 4.3 1M21.5 12s-1.2 2.1-3.2 3.8M9.8 9.9a3 3 0 0 0 4.3 4.3"/><path d="M2.5 2.5l19 19"/></svg>';
const EYE_ICON = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="3"/></svg>';

// Direct follow-up request: "add a two-row, expandable Description
// textbox with editor that can be accessed by clicking on the feature
// listed from Features tab" — the feature's own label is now a toggle
// (reusing the shared partySectionHeaderHtml-style Set, isPartySectionCollapsed,
// under a per-feature key so each feature's Description opens/closes
// independently) rather than plain text; collapsed by default, matching
// "accessed by clicking" (not shown up front). The textarea itself reuses
// .oracle-field-textarea's existing scrollHeight-based auto-grow (shell.js's
// onInput) starting at 2 rows, and commits via the same data-sector-coord +
// change-event pattern the sibling Sector Notes field already uses.
function worldTrackerFeatureRow(doc, ui, sx, sy, f, { withSector = false } = {}) {
  const descKey = `wtFeatureDesc:${f.id}`;
  const descOpen = !isPartySectionCollapsed(ui, descKey, true);
  return `
    <div class="doc-card wt-feature-card">
      <div class="doc-card-head">
        <button type="button" class="wt-feature-label-toggle" data-party-section-toggle="${esc(descKey)}" title="${descOpen ? 'Hide' : 'Show'} Description">${withSector ? `Sector ${sx},${sy} — ` : ''}${esc(wtFeatureLabel(f.kind))}${f.discovered ? '' : ' <span class="dim small">(undiscovered)</span>'}${f.movedFrom ? ` <span class="dim small">(moved from ${f.movedFrom.x},${f.movedFrom.y})</span>` : ''}</button>
        <div class="doc-card-actions">
          <button class="icon-btn" data-feature-discover-toggle="${esc(f.id)}" data-sector-coord="${sx},${sy}" title="${f.discovered ? 'Mark undiscovered' : 'Mark discovered'}">${f.discovered ? EYE_ICON : EYE_SLASH_ICON}</button>
          ${f.mobile ? `<button class="icon-btn" data-feature-migrate-toggle="${esc(f.id)}" title="Migrate to an adjacent sector">➤</button>` : ''}
          <button class="icon-btn" data-feature-remove="${esc(f.id)}" data-sector-coord="${sx},${sy}" title="Remove">✕</button>
        </div>
      </div>
      ${descOpen ? `<textarea rows="2" class="oracle-field-textarea" data-sector-feature-notes="${esc(f.id)}" data-sector-coord="${sx},${sy}" placeholder="Description…">${esc(f.notes || '')}</textarea>` : ''}
      ${f.mobile ? worldTrackerMigratePicker(doc, ui, sx, sy, f) : ''}
    </div>`;
}

function worldTrackerSectorDetail(doc, ui, x, y) {
  const sector = getSector(doc, x, y);
  const hb = doc.worldTracker && doc.worldTracker.homeBaseSector;
  const isHome = !!(hb && hb.x === x && hb.y === y);
  const cornerRows = WT_CORNERS.map((c) => {
    const label = sector.cornerLabels.find((l) => l.corner === c);
    return `<div class="wt-corner-row">
      <span class="dim small">${esc(c.replace('_', ' '))}</span>
      <span>${label ? esc(label.text) : '—'}</span>
      <button class="icon-btn" data-corner-label-edit="${x},${y}:${c}" title="Edit">✎</button>
      ${label ? `<button class="icon-btn" data-corner-label-remove="${x},${y}:${c}" title="Remove">✕</button>` : ''}
    </div>`;
  }).join('');
  const featureRows = sector.features.map((f) => worldTrackerFeatureRow(doc, ui, x, y, f)).join('');
  const iconOptions = WORLD_TRACKER_ICONS.map((i) => `<option value="${i.key}" ${sector.overlayIcon === i.key ? 'selected' : ''}>${esc(i.label)}</option>`).join('');

  const investigationCount = countInvestigationSites(doc);
  const atInvestigationCap = investigationCount >= MAX_INVESTIGATION_SITES;
  // Direct follow-up request: "make 'Corner Labels', Notes, Features,
  // Overlay Icon titles... section headers using the same collapsing
  // format as Campaign panel" — same partySectionHeaderHtml/
  // isPartySectionCollapsed pattern Campaign/Party's own sections already
  // use (one shared toggle Set despite its collapsedPartySections name).
  // One GM-wide preference per section (not per-sector — matches Corner
  // Labels' own prior single ui.worldTrackerCornerLabelsOpen behavior,
  // now folded into this same mechanism instead of a bespoke flag).
  const overlayIconOpen = !isPartySectionCollapsed(ui, 'wtSectorOverlayIcon', false);
  const featuresOpen = !isPartySectionCollapsed(ui, 'wtSectorFeatures', false);
  const notesOpen = !isPartySectionCollapsed(ui, 'wtSectorNotes', false);
  const cornerLabelsOpen = !isPartySectionCollapsed(ui, 'wtSectorCornerLabels', true);
  return `
    <div class="settings-group wt-sector-detail">
      <h3>Sector ${x},${y}${isHome ? ' 🏠' : ''}</h3>
      <p>State: <b>${esc(sector.state)}</b></p>
      ${sector.state === 'unexplored' ? `
      <div class="btn-col-row">
        <button class="icon-btn ${sector.investigationSite ? 'active' : ''}" data-sector-investigation-toggle="${x},${y}" title="Investigation site (p.53 &quot;?&quot; marker)" ${!sector.investigationSite && atInvestigationCap ? 'disabled' : ''}>❓</button>
        <button class="btn ghost sm" data-sector-investigation-random="${x},${y}" title="Roll 1d6 × 1d6 to randomly pick an unexplored sector to mark" ${atInvestigationCap ? 'disabled' : ''}>🎲 Random</button>
      </div>
      <p class="dim small">${investigationCount} / ${MAX_INVESTIGATION_SITES} marked</p>` : ''}
      <div class="btn-col-row">
        ${sector.state === 'unexplored' ? `<button class="btn ghost sm" data-sector-reveal="${x},${y}">Reveal</button>` : ''}
        ${sector.state === 'explored' ? `<button class="btn ghost sm" data-sector-survey="${x},${y}">Survey</button>` : ''}
        ${!isHome ? `<button class="btn ghost sm" data-home-base-set="${x},${y}">Set as Home Base</button>` : ''}
      </div>
      ${sector.state !== 'unexplored' ? `
        <div class="field-row-2col">
          <label class="field-label">Resource level${numStepper(`<input type="number" min="0" data-sector-resource-level="${x},${y}" value="${sector.resourceLevel == null ? '' : sector.resourceLevel}">`)}</label>
          <label class="field-label">Hazard level${numStepper(`<input type="number" min="0" data-sector-hazard-level="${x},${y}" value="${sector.hazardLevel == null ? '' : sector.hazardLevel}">`)}</label>
        </div>
        ${sector.resourceHarvested ? '<p class="dim small">(harvested)</p>' : `<button class="btn ghost sm" data-sector-harvest="${x},${y}">Mark Harvested</button>`}` : ''}
      ${partySectionHeaderHtml('wtSectorOverlayIcon', 'Overlay Icon', !overlayIconOpen)}
      ${overlayIconOpen ? `
      <label class="field-label">Manual override (blank = automatic)
        <select data-sector-overlay-icon data-sector-coord="${x},${y}">
          <option value="">— Automatic —</option>
          ${iconOptions}
        </select>
      </label>` : ''}
      ${partySectionHeaderHtml('wtSectorFeatures', 'Features', !featuresOpen)}
      ${featuresOpen ? `
      <div class="wt-feature-buttons">
        ${WT_FEATURE_KINDS.map((f) => `<button class="btn ghost sm" data-sector-add-feature="${x},${y}" data-feature-kind="${f.kind}">+ ${esc(f.label)}</button>`).join('')}
      </div>
      ${featureRows || '<p class="dim small">No features yet.</p>'}` : ''}
      ${partySectionHeaderHtml('wtSectorNotes', 'Notes', !notesOpen)}
      ${notesOpen ? `<textarea rows="3" data-sector-notes="${x},${y}" placeholder="Sector notes…">${esc(sector.notes)}</textarea>` : ''}
      ${partySectionHeaderHtml('wtSectorCornerLabels', 'Corner Labels', !cornerLabelsOpen)}
      ${cornerLabelsOpen ? cornerRows : ''}
    </div>`;
}

function worldTrackerSectorsTab(doc, ui) {
  const selected = ui.worldTrackerSelectedSector;
  return `
    <div class="settings-group">${worldTrackerGrid(doc, ui)}</div>
    ${selected ? worldTrackerSectorDetail(doc, ui, selected.x, selected.y) : '<p class="dim small">Tap a sector to see its detail.</p>'}`;
}

function worldTrackerFeaturesTab(doc, ui) {
  const sectors = listTouchedSectors(doc).filter((s) => s.features.length);
  if (!sectors.length) return '<p class="dim small">No features placed yet — add one from a sector\'s detail (Sectors tab).</p>';
  const rows = sectors.flatMap((s) => s.features.map((f) => worldTrackerFeatureRow(doc, ui, s.x, s.y, f, { withSector: true }))).join('');
  return `<div class="doc-list">${rows}</div>`;
}

// Every hook here is a CURRENTLY AVAILABLE mission (generateMissionHooks
// recomputes live from sector/feature state — direct question answered:
// this is an options list, not a completion log). "Run this" logs the
// choice to the Journal AND resolves the underlying signal (see the data
// file's own `resolve` field comment) — reveal/survey advance the
// sector's state, discover marks the specific feature — which is what
// actually retires that exact hook from this list afterward; nothing here
// tracks "completed missions" as its own record.
// Shared by the Missions tab and the Overview checklist below — one
// markup source for "Run this" so both surfaces resolve a hook through
// the exact same shell.js data-mission-hook-run handler.
function worldTrackerMissionRunButton(h) {
  return `<button class="btn ghost sm" data-mission-hook-run data-x="${h.x}" data-y="${h.y}" data-mission-type="${esc(h.missionType)}" data-reason="${esc(h.reason)}" data-signal="${esc(h.signal)}" ${h.featureId ? `data-feature-id="${esc(h.featureId)}"` : ''}>Run this ▸</button>`;
}

function worldTrackerMissionsTab(doc) {
  const hooks = generateMissionHooks(doc);
  if (!hooks.length) return '<p class="dim small">No mission hooks available right now — reveal a marked investigation site, explore a sector, or add a feature to generate one.</p>';
  const rows = hooks.map((h) => `
    <div class="doc-card">
      <div class="doc-card-head">
        <span>Sector ${h.x},${h.y} — <b>${esc(h.missionType)}</b></span>
        ${worldTrackerMissionRunButton(h)}
      </div>
      <p class="dim small">${esc(h.reason)}</p>
    </div>`).join('');
  return `<div class="doc-list">${rows}</div>`;
}

function worldTrackerNotesTab(doc) {
  const wt = doc.worldTracker || {};
  return `<div class="settings-group">
    <h3>World Notes</h3>
    <textarea rows="8" data-worldtracker-notes placeholder="Campaign-wide scratchpad…">${esc(wt.notes || '')}</textarea>
  </div>`;
}
