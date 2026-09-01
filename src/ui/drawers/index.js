// drawers/index.js — the tertiary-tier drawer contents (Journal, Oracle,
// Graph, Documents, Settings). Each is a pure render(doc) -> html string;
// interactions are handled by the shell's delegated event handlers.

import {
  SCENE_TABLES, buildGroupedOracleTree, filterOracleTree, tablesWithOverrides,
  hasOracleOverride, getOracleTags, isOracleTagLocked, listOracleTagVocabulary,
  filterOracleTreeByTags,
} from '../../domain/oracles.js';
import { ORACLE_TABLE_SOURCES } from '../../data/oracleGroups.js';
import { oracleLinkTagsFor } from '../../data/entityFieldOracleLinks.js';
import {
  listEntities, filterEntities, getEntity, ENTITY_TYPES, TYPE_LABEL, listTagVocabulary, listEntityTagVocabulary,
  RELATIONSHIP_TYPES, RELATIONSHIP_TYPE_LABEL, isRelationshipFlagged, computeFactionMaxHp,
  getSystemForLocation, getStarForLocation, getHexZoneForLocation,
} from '../../domain/entities.js';
import { parseStatsString, sortStatblockGroups, getStatblockTemplates } from '../../domain/statblocks.js';
import { listTemplates } from '../../domain/statblockTemplates.js';
import { buildGraph, computeLayout, nodeColor } from '../../domain/graph.js';
import { BUILD } from '../../core/buildInfo.js';
import { getDocument, listDocuments, listDocumentMentions, allDocumentTags, filterDocuments, listReferenceDocuments } from '../../domain/documents.js';
import { listPartyMembers, listPartyTrackers, gaugeWindow, listPartyHeadlineTracks } from '../../domain/party.js';
import { COLONY_FIELDS, getColonyFields, listCrewRows, listLifeformEncounters, CREW_ROLES, listColonyEncounters } from '../../domain/colony.js';
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
import { buildGuideTree, getActiveGuideDoc } from '../../domain/guide.js';
import { buildMentionEditorHTML, richToolbarHTML, toolbarCollapsed } from '../mentionEditor.js';
import { buildSessionRecap } from '../../domain/recap.js';
import { RULESETS, findRuleset, STARFORGED_PROGRESS_DIFFICULTIES, findProgressDifficulty } from '../../data/rulesets.js';
import { GEAR_TEMPLATE_SYSTEMS, findGearTemplate } from '../../data/gearTemplates.js';
import { GEAR_CATALOG, findCatalogItem } from '../../data/gearCatalog.js';
import { RULES_PROVIDERS, GAMEPLAY_AREAS, providerLabel, resolveProviderChoice, isGameSystemActivated } from '../../data/rulesConstitution.js';
import { SOURCEBOOK_INVENTORY } from '../../data/sourcebookInventory.js';
import { listGalleryImages, listGalleryTagVocabulary, getGalleryImage } from '../../domain/gallery.js';
import { listBattlemaps, getActiveBattlemap } from '../../domain/battlemaps.js';
import { BATTLEMAP_ICONS, findBattlemapIcon } from '../../data/battlemapIcons.js';
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
import { GATEABLE_MODULES } from '../../core/schema.js';
import { drawerMeta, POSITION_ASSIGNABLE_IDS } from '../drawerMeta.js';
import { resolvePositionContentId } from '../../domain/rulesProfiles.js';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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
function numStepper(inputHtml) {
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
    case 'world-tracker': return worldTracker(doc, ui);
    default: return `<p class="ws-placeholder">Drawer “${esc(id)}”.</p>`;
  }
}

// Sorted by label (Asset/Faction/Location/Lore/NPC), not ENTITY_TYPES'
// declaration order — that order still governs "+ Add" button placement and
// statblock-add-choices elsewhere, just not this filter row.
const ENTITY_TYPES_BY_LABEL = [...ENTITY_TYPES].sort((a, b) => TYPE_LABEL[a].localeCompare(TYPE_LABEL[b]));

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
  const typeChips = ['', ...ENTITY_TYPES_BY_LABEL].map((t) => `
    <button class="chip sm ${typeFilter === t ? 'active' : ''}" data-entity-type-filter="${t}">${t ? TYPE_LABEL[t] : 'All'}</button>`).join('');
  return `
    <input class="drawer-search" data-entity-search value="${esc(ui.entitySearch || '')}" placeholder="Search Cast by name or tag…">
    <div class="entity-type-filter-row">${typeChips}</div>
    ${entityTagFilterRow(doc, ui, typeFilter, search)}
    ${catalogPickerBlock(ui)}
    <div class="entity-list">
      ${items.length ? items.map((e) => `
        <button class="entity-list-row ${active && active.id === e.id ? 'sel' : ''}" draggable="true" data-drag-entity="${esc(e.id)}" data-drop-entity="${esc(e.id)}" data-open-entity="${esc(e.id)}" title="Click to open · drag anywhere on the row to link with another entity, or onto Journal/context fields to mention">
          <span class="entity-drag-handle" aria-hidden="true">⠿</span>
          <span class="entity-type-tag">${TYPE_LABEL[e.type] || 'Entity'}</span>
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
      <span class="entity-type-tag">${TYPE_LABEL[x.type] || 'Entity'}</span>
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
function fieldLabelRow(text, entityType, field, hint) {
  return `<span class="field-label-row">${esc(text)}${hint ? ` <span class="field-label-hint">${esc(hint)}</span>` : ''}${oracleLinkIcon(entityType, field)}</span>`;
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
    return `<span class="rel-chip ${flagged ? 'rel-flagged' : ''}">${flagged ? `<span class="rel-flag" title="Flagged: ${RELATIONSHIP_TYPE_LABEL[r.type]} doesn't usually apply between ${withArticle(TYPE_LABEL[e.type] || e.type)} entity and ${withArticle(TYPE_LABEL[other.type] || other.type)} entity — nothing changed, just worth a review">⚠</span>` : ''}<select class="rel-type-select" data-entity-rel-type="${esc(r.to)}" title="Relationship type">${relTypeOptions(r.type)}</select>
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
  // Overview defaults OPEN (unlike most of this session's new
  // collapsibles) — it's an entity's core identifying summary, the first
  // thing a GM wants on opening one, not a rarely-needed detail; the
  // Set here tracks which entities have been explicitly COLLAPSED
  // (inverse of the usual "tracks expanded" convention), matching
  // journalActionsOpen's same "!== closed" default-open shape.
  const overviewOpen = !((ui.collapsedOverview || new Set()).has(e.id));
  return `
    <div class="inspector-head">
      <input class="inspector-name" data-entity-field="name" value="${esc(e.name)}" placeholder="Name">
      ${e.type === 'npc' && !isPartyCharacter ? `<button class="icon-btn" data-deepen-npc="${esc(e.id)}" title="Roll a Stereotype/Want/Complication and add it to this NPC's Overview">🎲 Deepen</button>` : ''}
      <button class="icon-btn" data-entity-del="${esc(e.id)}" title="Delete entity">🗑</button>
    </div>
    <div class="inspector-photo-row">
      ${entityPhotoHtml(doc, e)}
      <div class="inspector-photo-fields">
        <label class="field-label">Type
          <select data-entity-field="type">${ENTITY_TYPES.map((t) => `<option value="${t}" ${t === e.type ? 'selected' : ''}>${TYPE_LABEL[t]}</option>`).join('')}</select>
        </label>
        ${tagEditor(doc, e)}
      </div>
    </div>
    <div class="field-label">
      <span class="field-label-row">
        <button type="button" class="section-toggle" data-overview-toggle="${esc(e.id)}">${overviewOpen ? '▾' : '▸'} Overview</button>
        ${oracleLinkIcon(e.type, 'overview')}
      </span>
      ${overviewOpen ? `
      <div class="rich-field">${richToolbarHTML(`entity:${e.id}:overview`, toolbarCollapsed(doc, ui, `entity:${e.id}:overview`))}<div class="mention-editor" contenteditable="true" data-entity-field="overview" data-placeholder="What the party knows.">${buildMentionEditorHTML(doc, e.overview)}</div></div>
      ${isPartyCharacter ? '' : `<div class="revealed-block">
        <button class="section-toggle" data-reveal-toggle="${esc(e.id)}">${e.revealedOpen ? '▾' : '▸'} Revealed / hidden (GM)</button>
        ${oracleLinkIcon(e.type, 'revealed')}
        ${e.revealedOpen ? `<div class="rich-field">${richToolbarHTML(`entity:${e.id}:revealed`, toolbarCollapsed(doc, ui, `entity:${e.id}:revealed`))}<div class="mention-editor" contenteditable="true" data-entity-field="revealed" data-placeholder="Secrets, twists, true motives.">${buildMentionEditorHTML(doc, e.revealed)}</div></div>` : ''}
      </div>`}` : ''}
    </div>
    ${npcSection(e)}
    ${factionSection(doc, e, ui)}
    ${conflictSection(doc, e, ui)}
    ${worldProfileSection(doc, e, ui)}
    ${worldDemographicsSection(doc, e, ui)}
    ${statblockSection(e, doc, ui)}
    <div class="rel-block">
      <h4>Relationships</h4>
      <p class="dim small">Drag another entity's ⠿ handle onto this one (or vice versa), pick one below, or find one to link.</p>
      <div class="rel-chips">${rels || '<span class="dim small">None yet.</span>'}</div>
      ${others.length ? `<div class="rel-add">
        <select data-entity-link-type>${relTypeOptions('linked')}</select>
        <select data-entity-link-target>${others.map((o) => `<option value="${esc(o.id)}">${esc(o.name) || 'Unnamed'}</option>`).join('')}</select>
        <input data-entity-link-label placeholder="label (ally, rival…)">
        <button class="btn sm" data-entity-link-add title="Link" aria-label="Link">🔗 Link</button>
        <button class="btn ghost sm" data-rel-picker-open title="Search Cast for an entity to link"><span class="icon-mono">🔍</span> Find entity to link</button>
      </div>${relPickerBlock(doc, e, ui)}` : '<p class="dim small">Add another entity to create relationships.</p>'}
    </div>`;
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
  return `
    <div class="faction-card">
      <h4>Faction card</h4>
      <label class="field-label">${fieldLabelRow('HQ', 'faction', 'hq')}
        <input data-entity-field="hq" value="${esc(e.hq)}" placeholder="Where they operate from">
      </label>
      <label class="field-label">${fieldLabelRow('Leadership', 'faction', 'leadership')}
        <input data-entity-field="leadership" value="${esc(e.leadership)}" placeholder="Who's in charge">
      </label>
      <div class="field-label">${fieldLabelRow('Scenario seed', 'faction', 'scenarioSeed')}
        <div class="rich-field">${richToolbarHTML(`entity:${e.id}:scenarioSeed`, toolbarCollapsed(doc, ui, `entity:${e.id}:scenarioSeed`))}<div class="mention-editor" contenteditable="true" data-entity-field="scenarioSeed" data-placeholder="A one-paragraph hook this faction can drop into a session.">${buildMentionEditorHTML(doc, e.scenarioSeed)}</div></div>
      </div>
      <div class="field-label">${fieldLabelRow('Agenda', 'faction', 'agenda')}
        <div class="rich-field">${richToolbarHTML(`entity:${e.id}:agenda`, toolbarCollapsed(doc, ui, `entity:${e.id}:agenda`))}<div class="mention-editor" contenteditable="true" data-entity-field="agenda" data-placeholder="What is this faction actively pursuing right now?">${buildMentionEditorHTML(doc, e.agenda)}</div></div>
      </div>
      ${diplomacyFieldsHtml(e)}
      ${factionStatsHtml(e)}
      ${factionPressureHtml(e, track)}
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
  return `
    <div class="faction-card">
      <h4>Conflict</h4>
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
      ${depthOpen ? conflictDepthHtml(doc, e, ui, involvedFactions) : ''}
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
    <div class="field-label">${fieldLabelRow('Deep root', 'conflict', 'deepRootSummary')}
      <div class="rich-field">${richToolbarHTML(`entity:${e.id}:deepRootSummary`, toolbarCollapsed(doc, ui, `entity:${e.id}:deepRootSummary`))}<div class="mention-editor" contenteditable="true" data-entity-field="deepRootSummary" data-placeholder="What started this, long before the party got involved.">${buildMentionEditorHTML(doc, e.deepRootSummary)}</div></div>
    </div>
    <div class="field-label">${fieldLabelRow('Precipitating incident', 'conflict', 'precipitatingIncident')}
      <div class="rich-field">${richToolbarHTML(`entity:${e.id}:precipitatingIncident`, toolbarCollapsed(doc, ui, `entity:${e.id}:precipitatingIncident`))}<div class="mention-editor" contenteditable="true" data-entity-field="precipitatingIncident" data-placeholder="The recent, smaller thing that actually lit the fuse.">${buildMentionEditorHTML(doc, e.precipitatingIncident)}</div></div>
    </div>
    <div class="field-label">${fieldLabelRow('Last de-escalation attempt', 'conflict', 'lastDeescalationAttempt')}
      <div class="rich-field">${richToolbarHTML(`entity:${e.id}:lastDeescalationAttempt`, toolbarCollapsed(doc, ui, `entity:${e.id}:lastDeescalationAttempt`))}<div class="mention-editor" contenteditable="true" data-entity-field="lastDeescalationAttempt" data-placeholder="Who tried to fix this, why it failed, who got blamed.">${buildMentionEditorHTML(doc, e.lastDeescalationAttempt)}</div></div>
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
    <div class="field-label">${fieldLabelRow('GM notes', 'conflict', 'gmNotes')}
      <div class="rich-field">${richToolbarHTML(`entity:${e.id}:gmNotes`, toolbarCollapsed(doc, ui, `entity:${e.id}:gmNotes`))}<div class="mention-editor" contenteditable="true" data-entity-field="gmNotes" data-placeholder="Anything else worth remembering.">${buildMentionEditorHTML(doc, e.gmNotes)}</div></div>
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
// UI position moved. Renders for any Location entity that has at least
// one of these fields set, is tagged #system/#star, OR whenever the
// active genre pack is Hostile (so a GM can start filling one in even
// before the canon import has run). Collapsed by default
// (ui.expandedWorldProfile, ephemeral — same Set shape as
// enhancementsSection's ui.expandedEnhancements).
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
function worldProfileSection(doc, e, ui = {}) {
  if (e.type !== 'location') return '';
  const isStarTagged = (e.tags || []).includes('star');
  const isSystemTagged = (e.tags || []).includes('system');
  const hasAny = e.hex || e.zone || e.worldSize || e.atmosphere || e.biome || e.hydrographics || e.gasGiant || isStarTagged || isSystemTagged;
  if (!hasAny && doc.settings.genrePack !== 'hostile') return '';
  const open = (ui.expandedWorldProfile || new Set()).has(e.id);
  const codeSelect = (field, label, table, value) => `
    <label class="field-label">${fieldLabelRow(label, 'location', field)}
      <select data-entity-field="${field}">
        <option value="" ${!value ? 'selected' : ''}>— unset —</option>
        ${table.map((t) => `<option value="${esc(t.code)}" ${value === t.code ? 'selected' : ''}>${esc(t.code)} — ${esc(t.label)}</option>`).join('')}
      </select>
    </label>`;
  const biomes = biomesForGenrePack(doc.settings.genrePack || 'hostile');
  const system = getSystemForLocation(doc, e.id);
  const star = getStarForLocation(doc, e.id);
  const hexZone = (isSystemTagged || isStarTagged) ? getHexZoneForLocation(doc, e.id) : null;
  const overriddenBy = hexZone && hexZone.overriddenBy;
  return `
    <div class="faction-card">
      <h4><button class="section-toggle" data-world-profile-toggle="${esc(e.id)}">${open ? '▾' : '▸'} World Profile (UWP)</button></h4>
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
  if ((e.tags || []).includes('system') || (e.tags || []).includes('star')) return '';
  const hasAny = e.starport || (e.bases && e.bases.length) || e.techLevel || e.lawLevel ||
    (e.tradeCodes && e.tradeCodes.length) || e.developmentLevel || e.population || e.government;
  if (!hasAny && doc.settings.genrePack !== 'hostile') return '';
  const open = (ui.expandedWorldDemographics || new Set()).has(e.id);
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
      <h4><button class="section-toggle" data-world-demographics-toggle="${esc(e.id)}">${open ? '▾' : '▸'} World Demographics</button></h4>
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
    return `<div class="inspector-photo">
      <button type="button" class="gallery-thumb-circle-btn" title="View full size">
        <img class="gallery-thumb-circle" data-open-image-lightbox src="${esc(img.dataUrl)}" alt="${esc(e.name || 'Entity')} thumbnail">
      </button>
      <label class="btn ghost sm file-btn">Replace<input type="file" accept="image/*" data-entity-photo-upload="${esc(e.id)}" hidden></label>
    </div>`;
  }
  // Unassigned still reserves the same 40%-of-row width (.inspector-photo
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
function tagEditor(doc, e) {
  const tags = e.tags || [];
  const chips = tags.map((t) => `
    <span class="tag-chip">
      <button type="button" class="tag-chip-jump" data-entity-tag-jump="${esc(t)}" title="Filter Cast by #${esc(t)}">${esc(t)}</button>
      <button class="icon-btn" data-entity-tag-remove="${esc(t)}" title="Remove tag">✕</button>
    </span>`).join('');
  const vocab = listTagVocabulary(doc, e.type, e.id);
  return `
    <div class="tag-editor">
      <div class="tag-editor-head">
        <span class="field-label-static">Tags</span>
        <input class="doc-tag-input" data-entity-tag-input list="entity-tag-list" placeholder="add tag…">
      </div>
      <datalist id="entity-tag-list">${vocab.map((t) => `<option value="${esc(t)}">`).join('')}</datalist>
      <div class="tag-chips">${chips || '<span class="dim small">None yet.</span>'}</div>
    </div>`;
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
function statblockSection(e, doc, ui = {}, opts = {}) {
  const groups = e.statblocks || [];
  const sorted = sortStatblockGroups(groups, doc.settings);
  const rows = sorted.map(({ group, index }) => statblockGroupBlock(e, group, index, doc, ui, opts)).join('');
  const addChoices = statblockAddChoices(e, groups, doc);
  const fieldAddRows = sorted.map(({ group, index }) => `
    <div class="statblock-add-row">
      <span class="dim small">${statblockGroupLabel(group, doc)}</span>
      <button class="chip" data-statblock-add-field="${index}">＋ Field</button>
      <button class="chip" data-statblock-add-track-field="${index}">＋ Track</button>
    </div>`).join('');
  const enhancements = enhancementsSection(e, ui);
  const open = !!ui.statblockAddOpen;
  const toggle = (addChoices || fieldAddRows || enhancements)
    ? `<div class="statblock-add-toggle-row">
        <button class="icon-btn" data-statblock-add-toggle title="${open ? 'Hide statblock options' : 'Add a Statblock or Attribute'}">⚙</button>
        <span class="dim small">Add a Statblock or Attribute</span>
      </div>
      ${open ? `${fieldAddRows}${addChoices}${enhancements}` : ''}`
    : '';
  return `${rows}${toggle}`;
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
  // of NPC (like Character) — its label reflects that.
  return `${bestiaryTerm(doc.settings.genrePack)} (NPC) · ${esc(templateLabel(group.templateId, doc.settings))}`;
}

function statblockGroupBlock(e, group, gi, doc, ui = {}, opts = {}) {
  if (group.kind === 'character') return characterSheetGroupBlock(e, group, gi, doc, ui, opts);
  const key = `${e.id}::${gi}`;
  const collapsed = !!(ui.collapsedStatblockGroups && ui.collapsedStatblockGroups.has(key));
  // Direct follow-up request: "the 'LifeForm (NPC) · Starforged' statblock
  // should put the editable stat field pill on the top row like other
  // statblocks" — attribute-kind fields (a Bestiary template's rollable
  // modifiers, e.g. Combat/Danger) now get the SAME compact top-row
  // treatment characterSheetGroupBlock already gives a character sheet's
  // stats, instead of sitting mixed into the same full-width vertical
  // list as track/text fields. Split on f.attribute directly (not
  // f.group === 'stat', characterSheetGroupBlock's own split key) since
  // that field-level marker is a character-sheet-template-only concept —
  // a Bestiary field never carries it — while f.attribute is universal
  // (statblockFieldRow's own dispatch key). Still fully editable — opts
  // .compact only changes CSS sizing (attrRow's own narrow pill styling),
  // never removes the live input.
  const indexed = group.fields.map((f, fi) => ({ f, fi }));
  const stats = indexed.filter(({ f }) => f.attribute);
  const rest = indexed.filter(({ f }) => !f.attribute);
  return `<div class="statblock-block">
    <div class="statblock-head">
      <button class="icon-btn statblock-collapse-toggle" data-statblock-group-toggle="${key}" title="${collapsed ? 'Expand' : 'Collapse'}">${collapsed ? '▸' : '▾'}</button>
      <h4>${statblockGroupLabel(group, doc)}</h4>
      <button class="icon-btn" data-statblock-remove-group="${gi}" title="Remove this statblock">🗑</button>
    </div>
    ${collapsed ? '' : `
    ${attributeBadges(group.fields)}
    ${stats.length ? `<div class="character-sheet-stats">${stats.map(({ f, fi }) => statblockFieldRow(f, gi, fi, { ...opts, compact: true })).join('')}</div>` : ''}
    ${rest.map(({ f, fi }) => statblockFieldRow(f, gi, fi, opts)).join('')}`}
  </div>`;
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
// into two sections — a compact row of core stats up top (single-number
// +/- spinners, Starforged/5PFH-style) and full-width resource meters below
// (Health, Spirit, Supply, ...) — purely a rendering split; stats are
// attribute fields, resources are track fields, both rollable the same way
// (double-click the value).
function characterSheetGroupBlock(e, group, gi, doc, ui = {}, opts = {}) {
  const key = `${e.id}::${gi}`;
  const collapsed = !!(ui.collapsedStatblockGroups && ui.collapsedStatblockGroups.has(key));
  const ruleset = findRuleset(group.ruleset);
  const indexed = group.fields.map((f, fi) => ({ f, fi }));
  const stats = indexed.filter(({ f }) => f.group === 'stat');
  const resources = indexed.filter(({ f }) => f.group !== 'stat');
  return `<div class="statblock-block character-sheet" data-statblock-group="${gi}">
    <div class="statblock-head">
      <button class="icon-btn statblock-collapse-toggle" data-statblock-group-toggle="${key}" title="${collapsed ? 'Expand' : 'Collapse'}">${collapsed ? '▸' : '▾'}</button>
      <h4>Character Sheet · ${esc(ruleset.label)}</h4>
      <button class="icon-btn" data-statblock-remove-group="${gi}" title="Remove this statblock">🗑</button>
    </div>
    ${collapsed ? '' : `
    ${stats.length ? `<div class="character-sheet-stats">${stats.map(({ f, fi }) => statblockFieldRow(f, gi, fi, { ...opts, compact: true })).join('')}</div>` : ''}
    ${resources.length ? `<div class="character-sheet-resources">${resources.map(({ f, fi }) => statblockFieldRow(f, gi, fi, opts)).join('')}</div>` : ''}`}
  </div>`;
}

// A field's kind decides which widget it gets: attribute (a rollable
// modifier, e.g. Edge/Combat) → a single signed number with +/- (attrRow,
// no 1-5 track boxes — that's how Starforged/5PFH sheets actually present
// stats); track (a depleting resource, e.g. Health/Hull) → the click-to-set
// scale (trackRow); anything else → plain text (textRow).
function statblockFieldRow(f, gi, fi, opts) {
  if (f.attribute) return attrRow(f, gi, fi, opts);
  if (f.track) return trackRow(f, gi, fi, opts);
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

// Takes one statblock group's fields — the inspector and the Party roster
// (see partyMemberStatblocks) both render one badge row per group, never
// flattened across groups, so a two-ruleset character still reads as two
// distinguishable rows instead of one undifferentiated mass of numbers.
function attributeBadges(fields) {
  fields = fields || [];
  // If there's a Stats row, parse and render it in the requested order.
  const statsField = fields.find((f) => f && String(f.key || '').toLowerCase().startsWith('stats'));
  if (statsField && statsField.value) {
    try {
      const parsed = parseStatsString(statsField.value);
      if (parsed.ordered && parsed.ordered.length) {
        const html = parsed.ordered.map((s) => `
          <div class="attr-badge">
            <div class="attr-key">${esc(String(s.key || '').toUpperCase())}</div>
            <div class="attr-val">${esc(formatAttrValue(s.value))}</div>
          </div>`).join('');
        return `<div class="attribute-badges">${html}</div>`;
      }
    } catch (e) { /* fallthrough */ }
  }

  const attrs = fields.filter((f) => f && f.attribute);
  if (!attrs.length) return '';
  const html = attrs.map((f) => `
    <div class="attr-badge">
      <div class="attr-key">${esc(String(f.key || '').toUpperCase())}</div>
      <div class="attr-val">${esc(formatAttrValue(f.value, f.format))}</div>
    </div>`).join('');
  return `<div class="attribute-badges">${html}</div>`;
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
    <div class="statblock-row">
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
function attrRow(f, gi, fi, opts = {}) {
  const value = Number(f.value) || 0;
  const format = f.format || 'sign';
  const method = f.rollMethod || 'none';
  const rollable = method !== 'none';
  const key = opts.entityId ? `${opts.entityId}::${gi}::${fi}` : `${gi}::${fi}`;
  const label = rollable
    ? `<button type="button" class="statblock-key statblock-key-roll" data-statblock-roll-label="${key}" title="${esc(rollMethodTitle(method, value, f.target))}">${esc(f.key)}</button>`
    : `<span class="statblock-key" title="Not rollable">${esc(f.key)}</span>`;
  return `
    <div class="statblock-row attr-row ${opts.compact ? 'attr-row-compact' : ''}">
      ${label}
      <input type="text" inputmode="numeric" class="attr-val-input" data-statblock-attr-val="${key}" value="${esc(formatAttrValue(value, format))}" aria-label="${esc(f.key)} value">
    </div>`;
}

// Hover text for the label-click roll trigger — mirrors ROLL_METHODS' dice
// model per id. Shared vocabulary with shell.js's performFieldRoll, which
// actually executes the roll (kept here since it's purely display text).
function rollMethodTitle(method, value, target) {
  if (method === 'action') return `Click to roll: d6 + ${value} vs 2d10 (Starforged)`;
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
  // Defaults OPEN (unlike this session's other new collapsibles) — "Add
  // note" lives in here, the single most common Journal action, so
  // hiding it by default would cost every GM an extra click on the
  // drawer's most frequent workflow. The toggle still exists for anyone
  // who wants the row out of the way once they've seen it.
  const actionsOpen = ui.journalActionsOpen !== false;
  return `
    <button class="btn ghost recap-toggle" data-recap-toggle>${recapOpen ? '▾' : '▸'} Previously on…</button>
    ${recapOpen ? recapPanel(doc) : ''}
    <div class="drawer-note">
      <div class="rich-field">${richToolbarHTML('journal:new', toolbarCollapsed(doc, ui, 'journal:new'))}<div class="mention-editor" contenteditable="true" data-journal-input data-placeholder="Add a note, ruling, or clue… (drag an entity here, or type @, to mention it)"></div></div>
      <button class="btn ghost sm" data-journal-actions-toggle>${actionsOpen ? '▾' : '▸'} Actions</button>
      ${actionsOpen ? `<div class="drawer-note-actions">
        <button class="btn" data-journal-add>Add note</button>
        <button class="btn ghost" data-export-journal>Export</button>
        <button class="btn ghost" data-generate-mission title="Roll a job: payout/deadline scaled by the current Threat, plus a complication">🎲 Generate Mission</button>
        <button class="btn ghost" data-advance-faction-turns title="Advance every tracked faction's pressure by one tick and roll a rumor for each">🎲 Advance Faction Turns</button>
        <button class="btn ghost" data-generate-creature title="Roll a creature concept: origin, movement, trait, and threat">🎲 Creature Concept</button>
        <button class="btn ghost" data-generate-site title="Roll a site concept: a feature, a danger, and a wonder">🎲 Site Concept</button>
        <button class="btn ghost" data-generate-seed title="Roll an adventure seed: a hook, a twist, and a complication">🎲 Adventure Seed</button>
      </div>` : ''}
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
    ? `<div class="rich-field">${richToolbarHTML(`journal:${e.id}`, toolbarCollapsed(doc, ui, `journal:${e.id}`))}<div class="mention-editor" contenteditable="true" data-journal-edit="${esc(e.id)}">${buildMentionEditorHTML(doc, e.text)}</div></div>`
    : `<div class="journal-text mention-text">${e.isHtml ? e.text : buildMentionEditorHTML(doc, e.text)}</div>`;
  return `
        <div class="journal-entry">
          <div class="journal-meta">
                <span>${new Date(e.createdAt).toLocaleString()} · ${esc(e.source || 'Journal')}</span>
                <span class="journal-meta-actions">
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
  const tables = tablesWithOverrides(doc.oracles && doc.oracles.overrides, doc.settings && doc.settings.genrePack);
  const tree = buildGroupedOracleTree(tables);
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
  return `
    <div class="oracle-toolbar">
      <input class="drawer-search" data-oracle-filter value="${esc(filter)}" placeholder="Search oracle tables…">
      <button class="btn ghost sm" data-oracle-collapse-all>Collapse all</button>
    </div>
    ${tagBadge}
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
const SETTINGS_TABS = [
  { id: 'general', label: 'General' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'ruleset-profile-editor', label: 'Ruleset Profile Editor' },
  { id: 'genre-rules', label: 'Genre & Rules' },
  { id: 'trade-economy', label: 'Trade & Economy' },
  { id: 'reference-tools', label: 'Reference Tools' },
];

function settings(doc, ui = {}) {
  const info = ui.storageInfo || { campaignBytes: 0, hasBackup: false, backupBytes: 0 };
  const activeTab = SETTINGS_TABS.some((t) => t.id === ui.settingsTab) ? ui.settingsTab : 'general';
  const tabBar = `<div class="settings-tab-bar">${SETTINGS_TABS.map((t) => `
    <button class="btn ghost sm ${t.id === activeTab ? 'active' : ''}" data-settings-tab="${t.id}" aria-selected="${t.id === activeTab}">${esc(t.label)}</button>`).join('')}</div>`;

  const sections = {
    general: () => `
      <div class="settings-group">
        <h3>Campaign</h3>
        <label class="field-label">Title
          <input data-campaign-title-input value="${esc(doc.meta.title)}">
        </label>
        <label class="field-label">Setting
          <input data-genre-input value="${esc(doc.settings.genre || '')}" placeholder="Hostile, generic sci-fi, …">
        </label>
        <p class="dim small">A free-text flavor label — doesn't change any oracle content. See Campaigns for which campaigns exist and which Rules Profile each uses.</p>
      </div>
      <div class="settings-group">
        ${sectionHeadRow('h3', 'Data (local-first)', 'settings-data')}
        ${helpBody('settings-data', "Everything is stored in this browser. Export a backup or bind a file in a OneDrive-synced folder. Imported documents (Documents drawer's \"Import File(s)\") live in this browser's own local storage, separate from the campaign file itself — check \"Include attached files\" below to carry them along when moving to another device.", ui)}
        <label class="chip sm"><input type="checkbox" data-export-include-attachments ${ui.exportIncludeAttachments ? 'checked' : ''}> Include attached files in this export</label>
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
        <p class="dim small" style="margin-top: var(--sp-3);">Reference Library docs imported via "Import File(s)" (Documents drawer) live in this browser's own storage, separate from the campaign file — bundle them as a zip to carry to another browser:</p>
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
      ${factionPacingSection(doc)}
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
        <p class="dim small">Phase ${esc(BUILD.phase)} · v${esc(BUILD.version)} — ${esc(BUILD.label)}</p>
      </div>`,
    campaigns: () => campaignsSection(doc, ui),
    'ruleset-profile-editor': () => rulesetProfileEditorSection(doc, ui),
    'genre-rules': () => `
      <p class="dim small">Genre Pack, Stat System, Rules Constitution, and Game System Activation moved to <b>Ruleset Profile Editor</b> — they're a Rules Profile's own settings now, shared across every campaign that uses it.</p>
      ${statblockTemplateEditor(doc)}
      ${sourcebookInventorySection(ui)}`,
    'trade-economy': () => `
      <p class="dim small">Trade Economy Model moved to <b>Ruleset Profile Editor</b> — it's a Rules Profile setting now.</p>
      ${hostileCanonLocationsSection(doc, ui)}`,
    'reference-tools': () => `
      ${mechanicsIndexSection(doc, ui)}
      ${tocSection(doc, ui)}`,
  };

  return `${tabBar}${sections[activeTab]()}`;
}

// --- Settings: Bestiary statblock templates (the "future-state" field-
// manifest engine: game system, field kind, roll method, and sort order,
// each editable here — see domain/statblockTemplates.js). ------------------
const ROLL_METHODS = [
  { id: 'none', label: 'None (no roll)' },
  { id: 'action', label: 'Starforged (d6 + value vs 2d10)' },
  { id: 'flat', label: '5PFH (d6 + value vs target)' },
  { id: 'traveller', label: 'Traveller (2d6 + value vs target)' },
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
// ruleset (or Saga Atlas itself) is the GM's chosen content provider per
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

function campaignsSection(doc, ui) {
  const campaigns = ui.campaigns || [];
  const profiles = ui.profiles || [];
  const draft = ui.newCampaignDraft || { title: '', profileId: '' };

  const campaignRows = campaigns.map((c) => `
    <div class="campaign-row${c.active ? ' active' : ''}">
      <span class="campaign-row-title">${esc(c.title)}</span>
      <label class="field-label sm campaign-profile-picker">Profile
        <select data-campaign-reassign-profile="${esc(c.id)}">
          ${profiles.map((p) => `<option value="${esc(p.id)}" ${p.id === c.profileId ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
        </select>
      </label>
      ${c.active ? '<span class="chip sm">Active</span>' : `<button class="btn ghost sm" data-campaign-switch="${esc(c.id)}">Switch</button>`}
      <button class="btn ghost sm" data-campaign-rename="${esc(c.id)}">Rename</button>
    </div>`).join('');

  return `
    <div class="settings-group">
      ${sectionHeadRow('h3', 'Campaigns', 'settings-campaigns')}
      ${helpBody('settings-campaigns', "Each campaign is fully independent (its own Cast, Journal, scenes, ...) and is assigned one Rules Profile — change which one with the Profile dropdown at any time; reassigning never touches that campaign's own data, it only changes which ruleset/visible-modules/Storyboard-positions it reads. Edit a profile's own contents in Ruleset Profile Editor.", ui)}
      <div class="campaign-list">${campaignRows || '<p class="dim small">No campaigns yet.</p>'}</div>
      <div class="new-campaign-form">
        <label class="field-label sm">New campaign title
          <input data-new-campaign-title value="${esc(draft.title)}" placeholder="New Campaign">
        </label>
        <label class="field-label sm">Rules Profile
          <select data-new-campaign-profile>
            ${profiles.map((p) => `<option value="${esc(p.id)}" ${(draft.profileId || ui.activeProfileId) === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
          </select>
        </label>
        <button class="btn" data-campaign-create>+ Create Campaign</button>
      </div>
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
function rulesetProfileEditorSection(doc, ui) {
  const profiles = ui.profiles || [];
  const editingProfile = profiles.find((p) => p.id === ui.editingProfileId) || profiles[0];

  const profilePickerHeaderExtra = `
    <button type="button" class="icon-btn" data-profile-create title="New Profile — clones the one currently selected below">📄＋</button>
    ${editingProfile ? `<button type="button" class="icon-btn" data-profile-rename="${esc(editingProfile.id)}" title="Rename &quot;${esc(editingProfile.name)}&quot;">✎</button>` : ''}`;
  const profilePicker = `
    <div class="settings-group">
      ${sectionHeadRow('h3', 'Rules Profiles', 'settings-profiles-list', profilePickerHeaderExtra)}
      ${helpBody('settings-profiles-list', "A Rules Profile bundles which modules are visible, what fills the Storyboard's three positions, and the ruleset (genre pack, stat system, trade economy, Rules Constitution, Game System Activation). Shared across every campaign that picks it.", ui)}
      <label class="field-label sm">Editing
        <select data-profile-select>
          ${profiles.map((p) => `<option value="${esc(p.id)}" ${editingProfile && p.id === editingProfile.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
        </select>
      </label>
    </div>`;

  const draft = ui.profileDraft;
  if (!editingProfile || !draft) return profilePicker;

  const dirty = !!ui.profileDraftDirty;
  // Only shown once an edit has actually been made — hidden again the
  // instant it's Saved or Discarded (direct follow-up request).
  const saveBar = !dirty ? '' : `
    <div class="settings-group profile-draft-bar dirty">
      <p class="dim small">● Unsaved changes. Editing "${esc(editingProfile.name)}" — nothing below applies to any campaign until you Save.</p>
      <div class="btn-col-row">
        <button class="btn" data-profile-draft-save="${esc(editingProfile.id)}">Save Profile</button>
        <button class="btn ghost" data-profile-draft-cancel="${esc(editingProfile.id)}">Discard Changes</button>
      </div>
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
      ${positionSelect('composer', 'Composer')}
      ${positionSelect('navigator', 'Navigator')}
      ${positionSelect('advisor', 'Advisor')}
    </div>`;

  const moduleChecks = GATEABLE_MODULES.map((id) => `
    <label class="chip sm"><input type="checkbox" data-module-enabled-toggle="${id}" ${draft.moduleEnabled[id] !== false ? 'checked' : ''}> ${esc((drawerMeta(id) || {}).label || id)}</label>`).join('');
  const modulesGroup = `
    <div class="settings-group">
      ${sectionHeadRow('h3', 'Visible modules', 'settings-modules')}
      ${helpBody('settings-modules', 'Modules a campaign on this profile can see. Party and every other module not listed here always stays visible.', ui)}
      <div class="module-enable-checks">${moduleChecks}</div>
    </div>`;

  const pseudoDoc = profileAsSettingsDoc(doc, draft);
  const rulesetGroup = `
    <div class="settings-group">
      ${sectionHeadRow('h3', 'Genre Pack', 'settings-genre-pack')}
      ${helpBody('settings-genre-pack', 'Which oracle table set the whole campaign rolls against (Continue Story, Oracle drawer, Generate NPC, Universal Search) — genre-aware, not genre-locked, so this is a data swap, not a different engine.', ui)}
      <label class="field-label">Genre Pack
        <select data-genre-pack-select>
          ${GENRE_PACKS.map((p) => `<option value="${p.id}" ${p.id === (draft.ruleset.genrePack || 'hostile') ? 'selected' : ''}>${esc(p.label)}</option>`).join('')}
        </select>
      </label>
    </div>
    <div class="settings-group">
      ${sectionHeadRow('h3', 'Stat system', 'settings-statsystem')}
      ${helpBody('settings-statsystem', 'Creates entity stat templates aligned to the chosen rule system.', ui)}
      <label class="field-label">Default ruleset
        <select data-settings-stat-ruleset>
          ${RULESETS.map((r) => `<option value="${r.id}" ${r.id === (draft.ruleset.statRuleset || 'starforged') ? 'selected' : ''}>${esc(r.label)}</option>`).join('')}
        </select>
      </label>
      ${(() => {
        const activeRuleset = findRuleset(draft.ruleset.statRuleset || 'starforged');
        return activeRuleset.doc
          ? `<p class="dim small">Reference: <a href="${activeRuleset.doc}" target="_blank" rel="noreferrer">${esc(activeRuleset.label)} PDF</a></p>`
          : `<p class="dim small">No sourcebook in this repo's library — ${esc(activeRuleset.label)}'s stats here are original content, not a transcription.</p>`;
      })()}
      <label class="field-label">Party Roster headline fields
        <input data-settings-party-headline-fields value="${esc((draft.ruleset.partyHeadlineFields || []).join(', '))}" placeholder="Health, Momentum">
      </label>
      <p class="dim small">Comma-separated track-field names (matched case-insensitively) shown as small counters on a collapsed Party Roster member row — differs per ruleset, since a 5PFH sheet has no field literally named "Momentum."</p>
    </div>
    ${tradeEconomyModelSection(pseudoDoc, ui)}
    ${rulesConstitutionSection(pseudoDoc, ui)}`;

  return `${profilePicker}${saveBar}${positionsGroup}${modulesGroup}${rulesetGroup}`;
}

function rulesConstitutionSection(doc, ui) {
  const rows = GAMEPLAY_AREAS.map((area) => {
    const chosen = resolveProviderChoice(doc.settings, area.id);
    const options = area.providers
      .filter((p) => isGameSystemActivated(doc, p))
      .map((p) => `<option value="${esc(p)}" ${chosen === p ? 'selected' : ''}>${esc(providerLabel(p))}</option>`).join('');
    return `
    <tr>
      <td>${esc(area.area)}</td>
      <td><select data-rules-provider-choice="${esc(area.id)}">${options}</select></td>
    </tr>`;
  }).join('');
  const legend = Object.entries(RULES_PROVIDERS).map(([id, p]) => `
    <li><b>${esc(p.label)}</b> — <span class="dim small">${esc(p.status)}.</span></li>`).join('');
  return `
    <div class="settings-group">
      ${sectionHeadRow('h3', 'Rules Constitution', 'settings-rules-constitution')}
      ${helpBody('settings-rules-constitution', 'Every ruleset is a content provider, not the application — Saga Atlas owns the campaign; each system contributes only what it does best for a given gameplay area. Only the Factions row changes real app behavior today — every other row records your intended provider for a future Rules Lens recommender (Phase 9).', ui)}
      <div class="tablewrap-narrow">
        <table class="rules-constitution-table">
          <thead><tr><th>Gameplay area</th><th>Provider</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <ul class="rules-provider-legend">${legend}</ul>
      ${gameSystemActivationSection(doc)}
    </div>`;
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

// Game System Activation (docs/adr/0032): a real, owned-sourcebook
// transcription (SWN's Faction Turn Engine today — the RULES_PROVIDERS
// entry with `requiresActivation: true`) sits behind an explicit opt-in,
// since this app also deploys publicly (GitHub Pages), where "personal
// reference to a book you own" doesn't hold by default. A fresh checkbox
// list, not folded into the table above, since it's a one-time compliance
// gate rather than a per-area preference. `isGameSystemActivated` (data/
// rulesConstitution.js) is the seam a real licensing check would replace
// this boolean read with later.
function gameSystemActivationSection(doc) {
  const gated = Object.entries(RULES_PROVIDERS).filter(([, p]) => p.requiresActivation);
  if (!gated.length) return '';
  const rows = gated.map(([id, p]) => `
    <p><label><input type="checkbox" data-game-system-activate="${esc(id)}" ${isGameSystemActivated(doc, id) ? 'checked' : ''}>
      <span class="dim small">${esc(p.activationText || `Activate ${p.label} content.`)}</span></label></p>`).join('');
  return `
    <div class="settings-group">
      <h4>Game System Activation</h4>
      ${rows}
    </div>`;
}

// Content Packs (domain/contentPack.js): export/import just Entities/Guide
// docs/Journal entries as a portable, additive file — distinct from the
// whole-campaign JSON export/import right above it (which REPLACES the
// current campaign), so this lives directly beneath it in the same "Data"
// area of the General tab rather than a separate tab of its own. The three
// checkboxes are ephemeral UI state (ui.contentPackFlags, shell.js) — which
// sections the next Export click includes; unchecked means "not in this
// file at all," not "export an empty list."
function contentPackSection(ui) {
  const flags = ui.contentPackFlags || { entities: false, guide: false, journal: false };
  return `
    <div class="settings-group">
      ${sectionHeadRow('h3', 'Content Packs', 'settings-content-packs')}
      ${helpBody('settings-content-packs', 'Export just Entities, Guide docs, and/or Journal entries as a portable file, then import it into another campaign — always additive (new ids, never dedups or replaces), unlike the whole-campaign export above.', ui)}
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

// Sourcebook Inventory: "what third-party content is available for use in
// the Core" — a curated per-PDF status (data/sourcebookInventory.js) joined
// against DOCS_MANIFEST (the auto-generated Reference Library scan) for its
// real title/link, same read-only `<ul class="rules-provider-legend">`
// shape as Rules Constitution/Trade Economy Model above. A manifest entry
// with no curated status yet (e.g. a PDF just dropped into assets/docs/
// and not rebuilt-and-reviewed) still shows, flagged "not yet reviewed" —
// nothing silently disappears just because this list wasn't updated for it.
function sourcebookInventorySection(ui) {
  const byFile = Object.fromEntries(SOURCEBOOK_INVENTORY.map((s) => [s.file, s]));
  const rows = DOCS_MANIFEST.map((d) => {
    const s = byFile[d.file] || { status: 'not yet reviewed' };
    return `<li><b>${esc(d.title)}</b> — <span class="dim small">${esc(s.status)}.</span>${s.note ? ` ${esc(s.note)}` : ''}</li>`;
  }).join('');
  return `
    <div class="settings-group">
      ${sectionHeadRow('h3', 'Sourcebook Inventory', 'settings-sourcebook-inventory')}
      ${helpBody('settings-sourcebook-inventory', 'Every real PDF in the Reference Library (assets/docs/), and what\'s actually been authored from it so far — a sourcebook can sit in the library a long time before becoming in-app content, or ever. Per the copyright posture behind every ruleset addition here, "integrated"/"authored" content is always an original re-implementation of well-known concepts, never a transcription of a book\'s actual text or tables.', ui)}
      <ul class="rules-provider-legend">${rows}</ul>
    </div>`;
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
function tradeEconomyModelSection(doc, ui) {
  const active = doc.settings.tradeEconomyModel || 'hostile';
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
    return `
    <div class="settings-group">
      ${sectionHeadRow('h3', 'Trade Economy Model', 'settings-trade-economy')}
      ${helpBody('settings-trade-economy', "Set a Location's Development Level (on its Location card) to one of these to bias its market prices beyond the manual supply/demand dials — unset Locations are unaffected. \"None\" turns this mechanic off entirely for this profile; a Location already tagged from when a model was active keeps working if you switch a model back on.", ui)}
      ${modelSelect}
    </div>`;
  }
  const types = economyTypesForModel(active);
  const rows = types.map((t) => `
    <li><b>${esc(t.label)}</b> — <span class="dim small">scarcity ${t.scarcity}/10, manufacturing ${t.manufacturing}/10.</span> ${esc(t.description)}</li>`).join('');
  const biomes = biomesForGenrePack(doc.settings.genrePack || 'hostile');
  const biomeRows = biomes.map((b) => `
    <li><b>${esc(b.label)}</b> — <span class="dim small">water ${b.resourceScarcity.water}, fuel ${b.resourceScarcity.fuel}, food ${b.resourceScarcity.food}, ore ${b.resourceScarcity.ore}, tech ${b.resourceScarcity.tech}, luxury ${b.resourceScarcity.luxury} (/10).</span> ${esc(b.description)}</li>`).join('');
  return `
    <div class="settings-group">
      ${sectionHeadRow('h3', 'Trade Economy Model', 'settings-trade-economy')}
      ${helpBody('settings-trade-economy', 'Set a Location\'s Development Level (on its Location card) to one of these to bias its market prices beyond the manual supply/demand dials — unset Locations are unaffected. Only one model is active at a time, but a Location already tagged the old way (a matching tag instead of the field) keeps working if you switch.', ui)}
      ${modelSelect}
      <ul class="rules-provider-legend">${rows}</ul>
      <h4>Biomes (${esc((GENRE_PACKS.find((p) => p.id === (doc.settings.genrePack || 'hostile')) || {}).label || 'active pack')})</h4>
      <p class="dim small">Set a Location's Biome (on its Location card) to one of these to bias prices by resource type, independent of and compounding with Development Level. Dials are 0-10, 0 = locally abundant/cheap, 10 = scarce/expensive.</p>
      <ul class="rules-provider-legend">${biomeRows}</ul>
    </div>`;
}

// HOSTILE Canon Locations (docs/adr/0026-hostile-canon-locations.md): the
// import button plus a UWP reference legend, gated to the Hostile genre
// pack — the Universal World Profile format is Cepheus Engine/HOSTILE-
// specific, not a generic sci-fi concept the way Trade Economy Model/
// Biome above are. The import itself is additive/idempotent (dedup by
// name, domain/hostileLocations.js), so no confirmation dialog is needed
// — matches the "Advance Faction Turns" bulk-action button's shape. The
// catalog itself is fetched at click time now (docs/adr/0026 JSON-pack
// addendum, ui/hostileLocationsFetch.js) rather than read from bundled
// JS — HOSTILE_LOCATIONS_META's few counts are the only piece of it still
// shipped as JS, so this legend text doesn't need a network round-trip
// just to describe what importing will do.
function hostileCanonLocationsSection(doc, ui = {}) {
  if ((doc.settings.genrePack || 'hostile') !== 'hostile') return '';
  const starportRows = STARPORT_CLASSES.map((s) => `
    <li><b>${esc(s.code)} — ${esc(s.label)}</b> <span class="dim small">${esc(s.description)}</span></li>`).join('');
  const baseRows = BASES.map((b) => `
    <li><b>${esc(b.code)}</b> — <span class="dim small">${esc(b.label)}: ${esc(b.description)}</span></li>`).join('');
  const tradeCodeRows = TRADE_CODES.map((t) => `
    <li><b>${esc(t.label)}</b> <span class="dim small">(${esc(t.code)})</span> — <span class="dim small">${esc(t.description)}</span></li>`).join('');
  const importing = !!ui.hostileLocationsImporting;
  return `
    <div class="settings-group">
      ${sectionHeadRow('h3', 'HOSTILE Canon Locations', 'settings-hostile-locations')}
      <p class="dim small">The HOSTILE Settings sourcebook's own world gazetteer — ${HOSTILE_LOCATIONS_META.worldCount} worlds, ${HOSTILE_LOCATIONS_META.starCount} star systems, and ${HOSTILE_LOCATIONS_META.baseCount} bases authored so far (${esc(HOSTILE_LOCATIONS_META.zoneLabel)}), more zones queued. Importing creates a real, fully-editable Location entity per world/star/base (bases and stars first, so every world's references resolve); already-imported ones (matched by name) are skipped, so it's safe to re-run after a new zone is added. Fetches the data pack over the network at click time — needs <code>npm run serve</code> (won't work opened directly as a <code>file://</code> page).</p>
      <button class="btn ghost" data-hostile-locations-import ${importing ? 'disabled' : ''}>${importing ? 'Importing…' : '🌍 Import HOSTILE Canon Locations'}</button>
      <h4>Starport Classes</h4>
      <ul class="rules-provider-legend">${starportRows}</ul>
      <h4>Bases</h4>
      <ul class="rules-provider-legend">${baseRows}</ul>
      <h4>Trade Codes</h4>
      <ul class="rules-provider-legend">${tradeCodeRows}</ul>
    </div>`;
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
      ${helpBody('settings-mechanics-index', "Scans the Reference Library's PDFs relevant to your active stat ruleset (plus Hostile's own core material) for terms like Strain, Supply, Momentum, and links each to the page it turns up on, in the Guide drawer below.", ui)}
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

function statblockTemplateEditor(doc) {
  const templates = listTemplates(doc.settings);
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
      <h3>Statblock Templates (${esc(term)})</h3>
      <p class="dim small">Per-system NPC/creature field manifests — game system, field kind (attribute badge vs track/progress-bar), roll method, and sort order. An NPC picks one template from its statblock's "${esc(term)} template" selector.</p>
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
function partyMemberStatblocks(e, doc, ui) {
  const sorted = sortStatblockGroups(e.statblocks, doc.settings);
  const openKey = (ui && ui.expandedPartyStatField) || null;
  return sorted.map(({ group, index: gi }) => {
    const fields = (group.fields || []).map((f, fi) => ({ f, fi }));
    const attrs = fields.filter(({ f }) => f.attribute);
    const tracks = fields.filter(({ f }) => f.track);
    const other = fields.filter(({ f }) => !f.attribute && !f.track);
    const attrPills = attrs.map(({ f, fi }) => partyStatPill(f, e.id, gi, fi)).join('');
    const trackPills = tracks.map(({ f, fi }) => partyStatPill(f, e.id, gi, fi, { expanded: openKey === `${e.id}::${gi}::${fi}` })).join('');
    const otherPills = other.map(({ f, fi }) => partyStatPill(f, e.id, gi, fi)).join('');
    const openTrack = tracks.find(({ fi }) => openKey === `${e.id}::${gi}::${fi}`);
    if (!attrPills && !trackPills && !otherPills) return '';
    return `<div class="party-stat-group">
      <div class="party-stat-group-label">${esc(statblockGroupLabel(group, doc))}</div>
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
  if (f.track) {
    const cls = `party-stat-pill${opts.expanded ? ' party-stat-pill-expanded' : ''}`;
    return `<button type="button" class="${cls}" data-party-stat-toggle="${key}" title="${esc(f.key)}: click to ${opts.expanded ? 'hide' : 'show'} the tracker">
      <span class="party-stat-pill-label">${esc(f.key)}</span>
      <span class="party-stat-pill-value">${value}</span>
    </button>`;
  }
  const method = f.rollMethod || 'none';
  const rollable = f.attribute && method !== 'none';
  if (rollable) {
    return `<button type="button" class="party-stat-pill" data-party-stat-roll="${key}" title="Roll ${esc(f.key)}">
      <span class="party-stat-pill-label">${esc(f.key)}</span>
      <span class="party-stat-pill-value">${value}</span>
    </button>`;
  }
  return `<span class="party-stat-pill party-stat-pill-static" title="${esc(f.key)} — not rollable">
    <span class="party-stat-pill-label">${esc(f.key)}</span>
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
// not the row-of-boxes this used to render). Which track fields surface
// here is entirely GM-configured (settings.partyHeadlineFields, Settings →
// Stat system — "GM picks per-ruleset which fields surface"), since a
// field literally named "Momentum" only exists under some rulesets.
// Reuses the SAME data-statblock-roll double-click-to-roll trigger
// trackRow's own badge uses, entity-scoped via the "entityId::gi::fi" key
// shape (parseStatblockKey, shell.js).
function partyMemberHeadlineCounters(doc, e) {
  const tracks = listPartyHeadlineTracks(doc, e);
  if (!tracks.length) return '';
  const counters = tracks.map(({ f, gi, fi }) => {
    const value = Number(f.value) || 0;
    const key = `${e.id}::${gi}::${fi}`;
    const method = f.rollMethod || 'action';
    const rollable = method !== 'none';
    const valueEl = rollable
      ? `<button type="button" class="track-value-badge party-headline-value" data-statblock-roll="${key}" title="${esc(f.key)}: double-click to roll">${value}</button>`
      : `<span class="track-value-badge track-value-badge-static party-headline-value" title="${esc(f.key)}: not rollable">${value}</span>`;
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
  return `<button type="button" class="actor-thumb party-member-thumb-btn" data-open-entity="${esc(e.id)}" title="Open in entity editor">${inner}</button>`;
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

function partyMemberCard(e, doc, ui) {
  const open = (ui.expandedPartyMembers || new Set()).has(e.id);
  return `
    <div class="party-member-card">
      <div class="party-member-row">
        ${partyMemberThumb(doc, e)}
        <button type="button" class="party-member-name" data-party-member-toggle="${esc(e.id)}">${open ? '▾' : '▸'} ${esc(e.name) || '<em>Unnamed</em>'}</button>
        ${partyMemberHeadlineCounters(doc, e)}
        <button class="icon-btn" data-open-entity="${esc(e.id)}" title="Open in entity editor" aria-label="Open in entity editor">↗</button>
      </div>
      ${open ? partyMemberStatblocks(e, doc, ui) : ''}
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

  // Direct follow-up request: Party Roster starts open; the other four
  // sections here start collapsed — see isPartySectionCollapsed's own
  // comment for the fresh-open-vs-tab-refocus distinction.
  const rosterCollapsed = isPartySectionCollapsed(ui, 'roster', false);
  const trackersCollapsed = isPartySectionCollapsed(ui, 'trackers', true);
  const sharedAssetsCollapsed = isPartySectionCollapsed(ui, 'sharedAssets', true);

  return `
    ${partySectionHeaderHtml('roster', 'Party Roster', rosterCollapsed, '<button class="chip" data-party-add-character>＋ Add NPC</button>')}
    ${rosterCollapsed ? '' : `
    <p class="dim small">NPC entities tagged <code>#character</code> — tag an NPC in the Cast drawer to add one you already made, or add one here.</p>
    <div class="party-member-list">
      ${memberCards || '<p class="ws-placeholder">No party members yet. Add one above, or tag an existing NPC #character in Cast.</p>'}
    </div>`}
    ${partySectionHeaderHtml('trackers', 'Party Trackers', trackersCollapsed, `${ui.partyTrackerAddOpen ? '' : '<button class="icon-btn" data-party-tracker-add-toggle title="Add tracker">＋</button>'}<button class="icon-btn" data-party-trackers-edit-toggle title="${trackersEditOpen ? 'Done editing' : 'Edit trackers (rename, remove)'}">${trackersEditOpen ? '💾' : '✎'}</button>`)}
    ${trackersCollapsed ? '' : `
    ${ui.partyTrackerAddOpen ? partyTrackerAddForm(ui, isStarforged) : ''}
    <div class="party-tracker-list">
      ${trackerRows || '<p class="ws-placeholder">No trackers yet — add one for credits, supply, or any shared resource.</p>'}
    </div>`}
    <div class="statblock-head" style="margin-top: var(--sp-4);"><h4>Shared Gear</h4></div>
    <div class="rich-field">${richToolbarHTML(sharedGearKey, toolbarCollapsed(doc, ui, sharedGearKey))}<div class="mention-editor" contenteditable="true" data-party-field="sharedGear" data-placeholder="A shared toolkit, the ship's medkit, anything not tied to one character…">${buildMentionEditorHTML(doc, party_.sharedGear)}</div></div>
    ${partySectionHeaderHtml('sharedAssets', 'Shared Assets', sharedAssetsCollapsed, '<button class="chip" data-entity-picker-open="party-vehicle">＋ Vehicle</button>')}
    ${sharedAssetsCollapsed ? '' : `
    ${sharedAssetVehicleThumbs ? `<div class="actor-thumb-row">${sharedAssetVehicleThumbs}</div>` : ''}
    <div class="entity-chips">${sharedAssetChips || (sharedAssetVehicleThumbs ? '' : '<span class="dim small">None yet.</span>')}</div>
    <div class="entity-add-row"><input class="doc-tag-input" data-party-shared-asset-input placeholder="Add a shared asset…"></div>`}
    ${cargoManifestSection(doc, ui, { collapsible: true })}
    ${contractsSection(doc, ui, { collapsible: true })}`;
}

// --- Colony: 5PFH Planetfall turn sheet + crew roster + lifeform filter ----
function colony(doc, ui = {}) {
  const fields = getColonyFields(doc);
  const crew = listCrewRows(doc);
  const characters = listEntities(doc, ['npc']);
  const lifeforms = listLifeformEncounters(doc);

  const fieldRows = COLONY_FIELDS.map((f) => {
    const v = fields[f.key];
    if (f.type === 'textarea') {
      const toolbarKey = `colony:${f.key}`;
      // Direct request: Colony's rich-text fields (four of them, back to
      // back) start with their formatting toolbar collapsed regardless of
      // the app-wide "Formatting toolbars start collapsed" setting — force
      // the default to true here (reusing toolbarCollapsed's own session-
      // override XOR logic unchanged) rather than touching that global
      // setting, which every OTHER rich field in the app still respects.
      const collapsed = toolbarCollapsed({ ...doc, settings: { ...doc.settings, toolbarCollapsedByDefault: true } }, ui, toolbarKey);
      return `<label class="field-label">${esc(f.label)}<div class="rich-field">${richToolbarHTML(toolbarKey, collapsed)}<div class="mention-editor" contenteditable="true" data-colony-field="${f.key}">${buildMentionEditorHTML(doc, v)}</div></div></label>`;
    }
    if (f.type === 'number') {
      return `<label class="field-label">${esc(f.label)}${numStepper(`<input type="number" data-colony-field="${f.key}" value="${esc(v == null ? '' : v)}">`)}</label>`;
    }
    return `<label class="field-label">${esc(f.label)}<input type="text" data-colony-field="${f.key}" value="${esc(v == null ? '' : v)}"></label>`;
  }).join('');

  const crewRows = crew.map((row) => `
    <div class="colony-crew-row">
      <select data-colony-crew-field="${esc(row.id)}::characterId">
        <option value="">— Character —</option>
        ${characters.map((c) => `<option value="${esc(c.id)}" ${c.id === row.characterId ? 'selected' : ''}>${esc(c.name) || 'Unnamed'}</option>`).join('')}
      </select>
      <select data-colony-crew-field="${esc(row.id)}::role">
        <option value="">— Role —</option>
        ${CREW_ROLES.map((r) => `<option value="${esc(r.id)}" ${r.id === row.role ? 'selected' : ''}>${esc(r.label)}</option>`).join('')}
      </select>
      <button class="icon-btn" data-colony-crew-remove="${esc(row.id)}" title="Remove">✕</button>
    </div>`).join('');

  const lifeformRows = lifeforms.map((e) => `
    <button class="entity-chip" data-open-entity="${esc(e.id)}">${esc(e.name) || 'Unnamed'}</button>`).join('');

  // Encounters log (direct follow-up request — "follow the rules and
  // workflow for Encounters in the 5PFH Planetfall rules"): up to 10
  // GM-authored rows, each a free-text note plus an optional chip linking
  // a specific Lifeform entity once identified in play. Distinct from the
  // always-on #lifeform/type filter below (listLifeformEncounters), which
  // stays untouched as a separate "everything tagged/typed Lifeform" view.
  const encounters = listColonyEncounters(doc);
  const encounterRows = encounters.map((row) => {
    const linked = row.entityId ? getEntity(doc, row.entityId) : null;
    const chip = linked
      ? `<button type="button" class="entity-chip" data-open-entity="${esc(linked.id)}">${esc(linked.name) || 'Unnamed'}</button>`
      : '';
    return `<div class="colony-encounter-row">
      <input type="text" data-colony-encounter-field="${esc(row.id)}::note" value="${esc(row.note)}" placeholder="Encounter…">
      ${chip}
      <button type="button" class="icon-btn" data-entity-picker-open="colony-encounter::${esc(row.id)}" title="Attach a Lifeform entity">＋</button>
      <button type="button" class="icon-btn" data-colony-encounter-remove="${esc(row.id)}" title="Remove row">✕</button>
    </div>`;
  }).join('');

  const turnSheetCollapsed = isPartySectionCollapsed(ui, 'colonyTurnSheet', false);
  return `
    ${partySectionHeaderHtml('colonyTurnSheet', 'Colony Turn Sheet', turnSheetCollapsed, helpToggle('colony-turn-sheet'))}
    ${helpBody('colony-turn-sheet', '5PFH Planetfall campaign-turn tracker.', ui)}
    ${turnSheetCollapsed ? '' : `<div class="colony-fields">${fieldRows}</div>`}
    <div class="statblock-head" style="margin-top: var(--sp-4);"><h4>Crew Roster</h4><button class="chip" data-entity-picker-open="colony-crew">＋ Crew</button></div>
    <div class="colony-crew-list">
      ${crewRows || '<p class="ws-placeholder">No crew rows yet.</p>'}
    </div>
    <div class="statblock-head" style="margin-top: var(--sp-4);">
      <h4>Lifeform Encounters</h4>
      ${encounters.length < 10 ? '<button type="button" class="icon-btn" data-colony-encounter-add title="Add an encounter row (up to 10)">＋</button>' : ''}
    </div>
    <div class="colony-encounter-list">
      ${encounterRows || '<p class="ws-placeholder">No encounters logged yet.</p>'}
    </div>
    <p class="dim small">All Lifeform entities in Cast:</p>
    <div class="entity-chips">
      ${lifeformRows || '<p class="ws-placeholder">No lifeform encounters tracked yet — tag a Cast entity #lifeform.</p>'}
    </div>`;
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

function contractsSection(doc, ui, { collapsible = false } = {}) {
  const locations = listEntities(doc, ['location']);
  const npcs = listEntities(doc, ['npc']);
  const contracts = listContracts(doc);
  const collapsed = collapsible && isPartySectionCollapsed(ui, 'contracts', true);
  const headerActions = `<div class="trade-contract-head-actions">
        <button class="chip" data-trade-generate-contract title="Roll the Contract Type oracle table into a new contract">🎲 Generate</button>
        ${ui.tradeContractAddOpen ? '' : '<button class="chip" data-trade-contract-add-toggle>＋ Contract</button>'}
      </div>`;
  const header = collapsible
    ? partySectionHeaderHtml('contracts', 'Contracts', collapsed, headerActions)
    : `<div class="statblock-head" style="margin-top: var(--sp-4);">
      <h4>Contracts</h4>
      ${headerActions}
    </div>`;
  if (collapsed) return header;
  return `${header}
    ${ui.tradeContractAddOpen ? contractAddForm(locations, npcs) : ''}
    <div class="trade-contract-list">
      ${contracts.length ? contracts.map((c) => contractRow(doc, c, ui)).join('') : '<p class="ws-placeholder">No contracts yet — generate one, or add one manually.</p>'}
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
    <div class="guide-doc-head">${titleEl}</div>
    <div class="rich-field">${richToolbarHTML(`guide:${active.id}`, toolbarCollapsed(doc, ui, `guide:${active.id}`))}<div class="mention-editor guide-editor" contenteditable="true" data-guide-input data-guide-active="${esc(active.id)}" data-placeholder="Colony Builder — see @[5PFH Planetfall p.12] for the turn sheet.&#10;Meet @Captain Reyes in Docking Bay 3.">${buildMentionEditorHTML(doc, active.text)}</div></div>
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
  const g = buildGraph(doc);
  if (!g.nodes.length) {
    return '<p class="ws-placeholder">No entities yet. Add a cast (or type @Name in a note) and their relationships appear here as a graph.</p>';
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
      <title>${esc(n.name)} · ${TYPE_LABEL[n.type] || n.type} · ${n.degree} link${n.degree === 1 ? '' : 's'}</title>
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r}" fill="${nodeColor(n.type)}"/>
      <text x="${p.x.toFixed(1)}" y="${(p.y + r + 12).toFixed(1)}" class="graph-node-label">${esc(clip(n.name, 18))}</text>
    </g>`;
  }).join('');

  const legend = ENTITY_TYPES.map((t) => `<span class="graph-legend-item"><span class="dot" style="background:${nodeColor(t)}"></span>${TYPE_LABEL[t]}</span>`).join('');

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
function documents(doc, ui = {}) {
  const search = ui.docFilter || '';
  const activeTags = ui.docTagFilters || new Set();
  const tagEditorOpen = ui.docTagEditorOpen || new Set();
  const renameOpen = ui.docRenameOpen || new Set();
  const tagListOpen = !!ui.docTagListOpen;
  const items = filterDocuments(doc, { search, tags: [...activeTags] });
  // An uploaded FILE (kind:'file', a real PDF) is an openable document same
  // as any bundled Reference Library one — it renders in that same section
  // now (direct follow-up request: "it should just be included in the
  // Reference Library and not a separate section"), not the top list. A
  // NOTE (kind:'note', free text with no underlying file) is categorically
  // different — nothing to "open," just an editable text block — and stays
  // in its own top section.
  const noteItems = items.filter((d) => d.kind !== 'file');
  const uploadedFileItems = items.filter((d) => d.kind === 'file');
  const mentions = listDocumentMentions(doc);
  const allTags = allDocumentTags(doc);
  // The Reference Library shares the same search box + tag-filter chips as
  // the notes list above it (one search, one set of filters, two lists) —
  // it was rendered unconditionally before, so typing in the search box
  // visibly filtered the top list but silently left every reference doc on
  // screen.
  const requiredTags = [...activeTags].map((t) => t.toLowerCase());
  const q = search.trim().toLowerCase();
  const refDocs = listReferenceDocuments(doc).filter((r) => {
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
          <button class="icon-btn" data-doc-tag-toggle="${esc(d.id)}" title="Tags">🏷</button>
          <button class="icon-btn" data-doc-rename="${esc(d.id)}" title="${renameOpen.has(d.id) ? 'Save' : 'Rename entry'}">${renameOpen.has(d.id) ? '💾' : '✎'}</button>
          <button class="icon-btn" data-doc-delete="${esc(d.id)}" title="Delete document">✕</button>
        </div>
      </div>
      <div class="rich-field">${richToolbarHTML(`doc:${d.id}`, toolbarCollapsed(doc, ui, `doc:${d.id}`))}<div class="mention-editor doc-content-input" contenteditable="true" data-doc-content="${esc(d.id)}" data-placeholder="Store notes, references, or handout text here…">${buildMentionEditorHTML(doc, d.content)}</div></div>
      <div class="drawer-note-actions"><button class="btn sm" data-doc-save="${esc(d.id)}">Save</button></div>
      ${tagEditorOpen.has(d.id) ? docTagEditor(d) : ''}
    </div>`;
  }).join('');
  const mentionSummary = mentions.length ? `<p class="dim small">Mentioned in Journal or dashboard fields: ${mentions.map((m) => esc(m.name)).join(', ')}</p>` : '';

  const uploadedFileRows = uploadedFileItems.map((d) => `
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
    </div>`).join('');

  // Direct follow-up request: "create a bulk export/import to transfer the
  // library records and docs themselves from one browser to another" — a
  // doc whose bytes are imported into this browser's own IndexedDB doc-
  // blob store (store.js) is portable regardless of what's on disk;
  // ui.refDocBlobKeys (populated async, shell.js's openDrawerTab) is what
  // that "☁ Imported" badge below reads.
  const blobKeys = ui.refDocBlobKeys || new Set();
  const refRows = refDocs.map((r) => `
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
    </div>`).join('');

  return `
    <datalist id="doc-tag-list">${allTags.map((t) => `<option value="${esc(t)}">`).join('')}</datalist>
    <div class="drawer-note">
      ${helpBody('documents-intro', 'A note is free text stored here; an imported file (see "Import File(s)" below) joins the Reference Library, alongside the bundled rulebooks. Drag either into a note or context field to insert a @ pointer.', ui)}
    </div>
    <input class="drawer-search" data-doc-filter value="${esc(search)}" placeholder="Search by name or tag…">
    ${allTags.length ? `
    <button class="btn ghost sm" data-doc-tag-list-toggle>${tagListOpen ? '▾' : '▸'} Tags (${allTags.length})</button>
    ${tagListOpen ? `<div class="doc-tag-filter-chips">
      ${allTags.map((t) => `<button class="chip sm ${activeTags.has(t) ? 'active' : ''}" data-doc-tag-filter="${esc(t)}">#${esc(t)}</button>`).join('')}
    </div>` : ''}` : ''}
    ${mentionSummary}
    ${noteItems.length ? `
    <div class="statblock-head"><h4>Notes</h4></div>
    <div class="doc-list">${rows}</div>` : ''}
    ${(uploadedFileItems.length || refDocs.length) ? `
    <div class="statblock-head" style="margin-top: var(--sp-4);"><h4>Reference Library</h4>${helpToggle('documents-reflib')}</div>
    ${helpBody('documents-reflib', 'Bundled rulebooks and setting docs from <code>assets/docs/</code>, plus anything you import — refreshed on every build. "Import File(s)" reads real files off your device into this browser\'s own storage: a filename matching a catalog entry joins the Reference Library so it opens even when assets/docs/ is empty on this machine; anything else becomes a new personal document (no size limit). Bulk "Export Library"/"Import Library" (a zip of every such doc, to carry to another browser) live in Settings → General → Data.', ui)}
    <div class="drawer-note ref-doc-transfer-row">
      <label class="btn ghost sm file-btn">📥 Import File(s)<input type="file" data-ref-doc-import multiple hidden></label>
    </div>
    <div class="doc-list">${uploadedFileRows}${refRows}</div>` : ''}`;
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

// --- World Tracker (requirements/PLANETFALL_world_tracker.md) -------------
// Strategic 6x6 sector map — distinct from the TACTICAL battlemap() above
// (different layout model entirely: fixed integer grid cells here vs.
// battlemap's freeform 0-1 fractional placement, so no shared markup/CSS).
// Plain click-based internal tab strip, exactly SETTINGS_TABS' own pattern
// — no pan/zoom camera needed since the grid is fixed-size and small
// enough to fit on screen outright.
const WORLD_TRACKER_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'sectors', label: 'Sectors' },
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
  const activeTab = WORLD_TRACKER_TABS.some((t) => t.id === ui.worldTrackerTab) ? ui.worldTrackerTab : 'overview';
  const tabBar = `<div class="settings-tab-bar">${WORLD_TRACKER_TABS.map((t) => `
    <button class="btn ghost sm ${t.id === activeTab ? 'active' : ''}" data-world-tracker-tab="${t.id}" aria-selected="${t.id === activeTab}">${esc(t.label)}</button>`).join('')}</div>`;
  const sections = {
    overview: () => worldTrackerOverview(doc),
    sectors: () => worldTrackerSectorsTab(doc, ui),
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

function worldTrackerOverview(doc) {
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

function worldTrackerFeatureRow(doc, ui, sx, sy, f, { withSector = false } = {}) {
  return `
    <div class="doc-card wt-feature-card">
      <div class="doc-card-head">
        <span>${withSector ? `Sector ${sx},${sy} — ` : ''}${esc(wtFeatureLabel(f.kind))}${f.discovered ? '' : ' <span class="dim small">(undiscovered)</span>'}${f.movedFrom ? ` <span class="dim small">(moved from ${f.movedFrom.x},${f.movedFrom.y})</span>` : ''}</span>
        <div class="doc-card-actions">
          <button class="icon-btn" data-feature-discover-toggle="${esc(f.id)}" data-sector-coord="${sx},${sy}" title="${f.discovered ? 'Mark undiscovered' : 'Mark discovered'}">${f.discovered ? '🙈' : '👁'}</button>
          ${f.mobile ? `<button class="icon-btn" data-feature-migrate-toggle="${esc(f.id)}" title="Migrate to an adjacent sector">➤</button>` : ''}
          <button class="icon-btn" data-feature-remove="${esc(f.id)}" data-sector-coord="${sx},${sy}" title="Remove">✕</button>
        </div>
      </div>
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
  const cornerLabelsOpen = !!ui.worldTrackerCornerLabelsOpen;
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
        <label class="field-label">Resource level${numStepper(`<input type="number" data-sector-resource-level="${x},${y}" value="${sector.resourceLevel == null ? '' : sector.resourceLevel}">`)}</label>
        ${sector.resourceHarvested ? '<p class="dim small">(harvested)</p>' : `<button class="btn ghost sm" data-sector-harvest="${x},${y}">Mark Harvested</button>`}
        <label class="field-label">Hazard level${numStepper(`<input type="number" data-sector-hazard-level="${x},${y}" value="${sector.hazardLevel == null ? '' : sector.hazardLevel}">`)}</label>` : ''}
      <h4>Overlay Icon</h4>
      <label class="field-label">Manual override (blank = automatic)
        <select data-sector-overlay-icon data-sector-coord="${x},${y}">
          <option value="">— Automatic —</option>
          ${iconOptions}
        </select>
      </label>
      <h4>Features</h4>
      <div class="wt-feature-buttons">
        ${WT_FEATURE_KINDS.map((f) => `<button class="btn ghost sm" data-sector-add-feature="${x},${y}" data-feature-kind="${f.kind}">+ ${esc(f.label)}</button>`).join('')}
      </div>
      ${featureRows || '<p class="dim small">No features yet.</p>'}
      <h4>Notes</h4>
      <textarea rows="3" data-sector-notes="${x},${y}" placeholder="Sector notes…">${esc(sector.notes)}</textarea>
      <h4 class="section-head-row"><button type="button" class="btn ghost sm" data-sector-corner-labels-toggle>${cornerLabelsOpen ? '▾' : '▸'} Corner Labels</button></h4>
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
