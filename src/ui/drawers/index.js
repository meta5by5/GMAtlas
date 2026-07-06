// drawers/index.js — the tertiary-tier drawer contents (Journal, Oracle,
// Graph, Documents, Settings). Each is a pure render(doc) -> html string;
// interactions are handled by the shell's delegated event handlers.

import {
  SCENE_TABLES, buildGroupedOracleTree, filterOracleTree, tablesWithOverrides,
  hasOracleOverride, getOracleTags, isOracleTagLocked, listOracleTagVocabulary,
  filterOracleTreeByTags,
} from '../../domain/oracles.js';
import { oracleLinkTagsFor } from '../../data/entityFieldOracleLinks.js';
import {
  listEntities, getEntity, ENTITY_TYPES, TYPE_LABEL, listTagVocabulary, listEntityTagVocabulary,
  RELATIONSHIP_TYPES, RELATIONSHIP_TYPE_LABEL, isRelationshipFlagged,
} from '../../domain/entities.js';
import { parseStatsString, sortStatblockGroups, getStatblockTemplates } from '../../domain/statblocks.js';
import { listTemplates } from '../../domain/statblockTemplates.js';
import { buildGraph, computeLayout, nodeColor } from '../../domain/graph.js';
import { BUILD } from '../../core/buildInfo.js';
import { getDocument, listDocuments, listDocumentMentions, allDocumentTags, filterDocuments, listReferenceDocuments } from '../../domain/documents.js';
import { listPartyMembers, listPartyTrackers } from '../../domain/party.js';
import { COLONY_FIELDS, getColonyFields, listCrewRows, listLifeformEncounters } from '../../domain/colony.js';
import { getMarket, priceAt, listCargoManifest, listContracts } from '../../domain/trade.js';
import { COMMODITIES, findCommodity } from '../../data/commodities.js';
import { THREAD_STATUSES, THREAD_STATUS_LABELS, THREAD_PRIORITIES } from '../../domain/threads.js';
import { getPressureTrack } from '../../domain/factions.js';
import { getEnhancements, strainUsed, strainCapacity, isOverStrained } from '../../domain/enhancements.js';
import { getMechanicsIndex } from '../../domain/mechanicsIndex.js';
import { ENHANCEMENT_TYPES } from '../../data/enhancementTypes.js';
import { getGuideText } from '../../domain/guide.js';
import { buildMentionEditorHTML } from '../mentionEditor.js';
import { buildSessionRecap } from '../../domain/recap.js';
import { RULESETS, findRuleset, STARFORGED_PROGRESS_DIFFICULTIES, findProgressDifficulty } from '../../data/rulesets.js';
import { GEAR_TEMPLATE_SYSTEMS, findGearTemplate } from '../../data/gearTemplates.js';
import { GEAR_CATALOG, findCatalogItem } from '../../data/gearCatalog.js';
import { RULES_PROVIDERS, GAMEPLAY_AREAS, providerLabel } from '../../data/rulesConstitution.js';
import { GENRE_PACKS, bestiaryTerm } from '../../data/genrePacks.js';
import { ECONOMY_MODELS, economyTypesForModel } from '../../data/economyTypes.js';
import { DOCS_MANIFEST } from '../../data/docsManifest.js';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// "a Faction" / "an NPC" / "an Asset" — for the relationship-flag tooltip below.
const withArticle = (word) => (/^[aeiou]/i.test(word) ? `an ${word}` : `a ${word}`);

export function renderDrawer(id, doc, ui = {}) {
  switch (id) {
    case 'journal': return journal(doc, ui);
    case 'oracle': return oracle(doc, ui);
    case 'cast': return entities(doc, ui);
    case 'entity-detail': return entityDetail(doc, ui);
    case 'party': return party(doc, ui);
    case 'colony': return colony(doc);
    case 'trade': return trade(doc, ui);
    case 'guide': return guide(doc, ui);
    case 'settings': return settings(doc, ui);
    case 'graph': return graph(doc, ui);
    case 'documents': return documents(doc, ui);
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
// below). Cast is a real drawer like any other (2026-07-06 restructure) —
// openable as a normal tab or anchored beside whichever drawer IS active
// (anchored by default, via shell.js's toggleCastDrawer, so an entity can
// still be dragged into Journal/Guide without losing sight of the list).
// Clicking a row opens Entity Detail (data-open-entity, same as a mention
// link or a relationship chip); dragging one (from anywhere on the row, not
// just the ⠿ handle — see the CSS) still links/mentions same as always.
export function entities(doc, ui) {
  const allItems = listEntities(doc);
  const typeFilter = ui.entityTypeFilter || '';
  const search = (ui.entitySearch || '').trim().toLowerCase();
  const activeTags = ui.entityTagFilters || new Set();
  const requiredTags = [...activeTags].map((t) => t.toLowerCase());
  const items = allItems.filter((e) => {
    if (typeFilter && e.type !== typeFilter) return false;
    if (requiredTags.length && !requiredTags.every((t) => (e.tags || []).some((et) => et.toLowerCase() === t))) return false;
    if (!search) return true;
    return [e.name, TYPE_LABEL[e.type] || '', e.type, ...(e.tags || [])].join(' ').toLowerCase().includes(search);
  });
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
  return `<button class="icon-btn" data-oracle-field-link="${entityType}.${field}" title="Jump to relevant Oracle table(s): ${tags.map((t) => esc(t)).join(', ')}" aria-label="Jump to relevant Oracle tables">🔮</button>`;
}

// A field label + its optional 🔮 link, right-aligned on the same line —
// replaces a bare `<label class="field-label">Text ...` opening tag for
// exactly the fields data/entityFieldOracleLinks.js links; every other
// field is untouched.
function fieldLabelRow(text, entityType, field) {
  return `<span class="field-label-row">${esc(text)}${oracleLinkIcon(entityType, field)}</span>`;
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
      : `<input type="number" class="rel-strength-input" data-entity-rel-strength="${esc(r.to)}" min="0" max="10" value="${Number(r.strength) || 0}" title="Strength/weight 0-10">`);
    return `<span class="rel-chip ${flagged ? 'rel-flagged' : ''}">${flagged ? `<span class="rel-flag" title="Flagged: ${RELATIONSHIP_TYPE_LABEL[r.type]} doesn't usually apply between ${withArticle(TYPE_LABEL[e.type] || e.type)} entity and ${withArticle(TYPE_LABEL[other.type] || other.type)} entity — nothing changed, just worth a review">⚠</span>` : ''}<button type="button" class="rel-chip-name" data-open-entity="${esc(other.id)}" title="Open ${esc(other.name) || 'Unnamed'}">${esc(other.name) || 'Unnamed'}</button>
      <select class="rel-type-select" data-entity-rel-type="${esc(r.to)}" title="Relationship type">${relTypeOptions(r.type)}</select>
      <input class="rel-label-input" data-entity-rel-label="${esc(r.to)}" value="${esc(r.label)}" placeholder="note (ally, rival…)" title="Edit this relationship's note">
      ${strengthOrBond}
      <button class="icon-btn" data-entity-unlink="${esc(r.to)}" title="Remove link" aria-label="Remove link">✕</button></span>`;
  }).join('');
  return `
    <div class="inspector-head">
      <input class="inspector-name" data-entity-field="name" value="${esc(e.name)}" placeholder="Name">
      ${e.type === 'npc' ? `<button class="icon-btn" data-deepen-npc="${esc(e.id)}" title="Roll a Stereotype/Want/Complication and add it to this NPC's Overview">🎲 Deepen</button>` : ''}
      <button class="icon-btn" data-entity-del="${esc(e.id)}" title="Delete entity">🗑</button>
    </div>
    <label class="field-label">Type
      <select data-entity-field="type">${ENTITY_TYPES.map((t) => `<option value="${t}" ${t === e.type ? 'selected' : ''}>${TYPE_LABEL[t]}</option>`).join('')}</select>
    </label>
    ${tagEditor(doc, e)}
    <label class="field-label">${fieldLabelRow('Overview (shared)', e.type, 'overview')}
      <textarea data-entity-field="overview" rows="3" placeholder="What the party knows.">${esc(e.overview)}</textarea>
    </label>
    <div class="revealed-block">
      <button class="btn ghost sm" data-reveal-toggle="${esc(e.id)}">${e.revealedOpen ? '▾' : '▸'} Revealed / hidden (GM)</button>
      ${oracleLinkIcon(e.type, 'revealed')}
      ${e.revealedOpen ? `<textarea data-entity-field="revealed" rows="2" placeholder="Secrets, twists, true motives.">${esc(e.revealed)}</textarea>` : ''}
    </div>
    ${factionSection(doc, e)}
    ${statblockSection(e, doc, ui)}
    ${enhancementsSection(e, ui)}
    <div class="rel-block">
      <h4>Relationships</h4>
      <p class="dim small">Drag another entity's ⠿ handle onto this one (or vice versa), or pick one below, to link them.</p>
      <div class="rel-chips">${rels || '<span class="dim small">None yet.</span>'}</div>
      ${others.length ? `<div class="rel-add">
        <select data-entity-link-target>${others.map((o) => `<option value="${esc(o.id)}">${esc(o.name) || 'Unnamed'}</option>`).join('')}</select>
        <select data-entity-link-type>${relTypeOptions('linked')}</select>
        <input data-entity-link-label placeholder="label (ally, rival…)">
        <button class="btn sm" data-entity-link-add title="Link" aria-label="Link">🔗 Link</button>
      </div>` : '<p class="dim small">Add another entity to create relationships.</p>'}
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
function factionSection(doc, e) {
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
      <label class="field-label">${fieldLabelRow('Scenario seed', 'faction', 'scenarioSeed')}
        <textarea data-entity-field="scenarioSeed" rows="2" placeholder="A one-paragraph hook this faction can drop into a session.">${esc(e.scenarioSeed)}</textarea>
      </label>
      <label class="field-label">${fieldLabelRow('Agenda', 'faction', 'agenda')}
        <textarea data-entity-field="agenda" rows="2" placeholder="What is this faction actively pursuing right now?">${esc(e.agenda)}</textarea>
      </label>
      ${diplomacyFieldsHtml(e)}
      ${factionStatsHtml(e)}
      ${factionPressureHtml(e, track)}
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
      <input type="number" min="0" max="10" data-faction-stat="${esc(e.id)}::${key}" value="${Number(e[key]) || 0}">
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
        <button class="btn ghost sm" data-enhancements-toggle="${esc(e.id)}">${open ? '▾' : '▸'} Enhancements (${items.length})</button>
        <button class="icon-btn" data-roll-into-enhancement="${esc(e.id)}" title="Roll a Cyberware Concept into the name field below">🎲</button>
      </h4>
      ${open ? `
      <p class="dim small ${isOverStrained(e) ? 'over-strain' : ''}">Strain: ${used}/${cap}${isOverStrained(e) ? ' — over capacity' : ''}</p>
      <div class="enhancement-list">${chips || '<span class="dim small">None installed.</span>'}</div>
      <div class="enhancement-add">
        <input data-enhancement-name-input="${esc(e.id)}" placeholder="Enhancement name" value="${esc(draftName)}">
        <select data-enhancement-type-input="${esc(e.id)}">${ENHANCEMENT_TYPES.map((t) => `<option value="${t.id}">${esc(t.label)}</option>`).join('')}</select>
        <input type="number" min="0" data-enhancement-strain-input="${esc(e.id)}" placeholder="Strain" value="1">
        <button class="btn sm" data-enhancement-install="${esc(e.id)}">＋ Install</button>
      </div>` : ''}
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
    <span class="tag-chip">${esc(t)}
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
// "toggle/switch" that replaces one group's data with another's. The add
// row itself is collapsed behind a gear icon (ui.statblockAddOpen) so it
// doesn't dominate the inspector once several rulesets/templates exist.
function statblockSection(e, doc, ui = {}) {
  const groups = e.statblocks || [];
  const sorted = sortStatblockGroups(groups, doc.settings);
  const rows = sorted.map(({ group, index }) => statblockGroupBlock(e, group, index, doc, ui)).join('');
  const addChoices = statblockAddChoices(e, groups, doc);
  const open = !!ui.statblockAddOpen;
  const toggle = addChoices
    ? `<div class="statblock-add-toggle-row">
        <button class="icon-btn" data-statblock-add-toggle title="${open ? 'Hide statblock options' : 'Add a statblock'}">⚙</button>
        <span class="dim small">Add a statblock</span>
      </div>
      ${open ? addChoices : ''}`
    : '';
  return `${rows}${toggle}`;
}

function statblockGroupBlock(e, group, gi, doc, ui = {}) {
  if (group.kind === 'character') return characterSheetGroupBlock(e, group, gi, doc, ui);
  const key = `${e.id}::${gi}`;
  const collapsed = !!(ui.collapsedStatblockGroups && ui.collapsedStatblockGroups.has(key));
  const rows = group.fields.map((f, fi) => statblockFieldRow(f, gi, fi)).join('');
  // Bestiary (or LifeForm, genre-dependent — see bestiaryTerm) is a subtype
  // of NPC (like Character) — its label reflects that. Gear (ADR 0012,
  // Item entities) is discriminated by `ruleset` like Character, not
  // `templateId` like Bestiary/Vehicle.
  const label = group.kind === 'vehicle' ? 'Vehicle Statblock'
    : group.kind === 'gear' ? `Gear Stats · ${esc(findGearTemplate(group.ruleset).label)}`
    : `${bestiaryTerm(doc.settings.genrePack)} (NPC) · ${esc(templateLabel(group.templateId, doc.settings))}`;
  return `<div class="statblock-block">
    <div class="statblock-head">
      <button class="icon-btn statblock-collapse-toggle" data-statblock-group-toggle="${key}" title="${collapsed ? 'Expand' : 'Collapse'}">${collapsed ? '▸' : '▾'}</button>
      <h4>${label}</h4>
      <button class="icon-btn" data-statblock-remove-group="${gi}" title="Remove this statblock">🗑</button>
    </div>
    ${collapsed ? '' : `
    ${attributeBadges(group.fields)}
    ${rows}
    <div class="statblock-add-row">
      <button class="chip" data-statblock-add-field="${gi}">＋ Field</button>
      <button class="chip" data-statblock-add-track-field="${gi}">＋ Track</button>
    </div>`}
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
// or both at once); Vehicle Stats is an Asset subtype. Other entity types
// (Faction, Location, Lore) get no statblock options — they aren't stat-
// blocked concepts.
function statblockAddChoices(e, groups, doc) {
  if (e.type !== 'npc' && e.type !== 'asset' && e.type !== 'item') return '';
  const presentRulesets = new Set(groups.filter((g) => g.kind === 'character').map((g) => g.ruleset));
  const presentTemplates = new Set(groups.filter((g) => g.kind === 'npc').map((g) => g.templateId));
  const presentGearSystems = new Set(groups.filter((g) => g.kind === 'gear').map((g) => g.ruleset));
  const hasVehicle = groups.some((g) => g.kind === 'vehicle');

  const charChips = e.type === 'npc' ? RULESETS.filter((r) => !presentRulesets.has(r.id))
    .map((r) => `<button class="chip" data-statblock-add="character" data-statblock-ruleset="${esc(r.id)}">＋ Character Sheet (${esc(r.label)})</button>`).join('') : '';
  const bestiaryChips = e.type === 'npc' ? listTemplates(doc.settings).filter((t) => t.id !== 'vehicle' && !presentTemplates.has(t.id))
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
function characterSheetGroupBlock(e, group, gi, doc, ui = {}) {
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
    ${stats.length ? `<div class="character-sheet-stats">${stats.map(({ f, fi }) => statblockFieldRow(f, gi, fi, { compact: true })).join('')}</div>` : ''}
    ${resources.length ? `<div class="character-sheet-resources">${resources.map(({ f, fi }) => statblockFieldRow(f, gi, fi)).join('')}</div>` : ''}
    <div class="statblock-add-row">
      <button class="chip" data-statblock-add-field="${gi}">＋ Field</button>
      <button class="chip" data-statblock-add-track-field="${gi}">＋ Track</button>
    </div>`}
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
  return textRow(f, gi, fi);
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
function textRow(f, gi, fi) {
  return `
    <div class="statblock-row">
      <span class="statblock-key">${esc(f.key)}</span>
      <input class="statblock-val" data-statblock-val="${gi}::${fi}" value="${esc(f.value)}" placeholder="Value">
    </div>`;
}

// Crew-Link-style numeric scale: a row of click-to-set boxes plus a value
// badge that rolls (d6 + value vs 2d10) on double-click. `compact` renders
// it as a narrow stat pill (character sheet's top stat row) instead of the
// full-width statblock row.
function trackRow(f, gi, fi, opts = {}) {
  const max = f.max || 5;
  const value = Number(f.value) || 0;
  const boxes = Array.from({ length: max }, (_, k) => k + 1).map((n) => `
    <button type="button" class="track-box ${n <= value ? 'on' : ''}" data-statblock-track-set="${gi}::${fi}" data-track-n="${n}" aria-label="Set ${n}">${n}</button>`).join('');
  // rollMethod undefined defaults to rollable (action) for backward
  // compatibility with fields created before Bestiary templates existed
  // (Health/Hull tracks, manually-added "+Track" fields); explicit 'none'
  // (a Bestiary progress-bar field) opts out of the roll button entirely.
  const method = f.rollMethod || 'action';
  const rollable = method !== 'none';
  const rollTitle = rollMethodTitle(method, value, f.target).replace('Click', 'Double-click');
  const badge = rollable
    ? `<button type="button" class="track-value-badge" data-statblock-roll="${gi}::${fi}" title="${esc(rollTitle)}">${value}<small>/${max}</small></button>`
    : `<span class="track-value-badge track-value-badge-static" title="Progress track — not rollable">${value}<small>/${max}</small></span>`;
  return `
    <div class="statblock-row track-row ${opts.compact ? 'track-row-compact' : ''}">
      <span class="statblock-key">${esc(f.key)}</span>
      <div class="track-widget">
        <div class="track-boxes">${boxes}</div>
        ${badge}
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
  const label = rollable
    ? `<button type="button" class="statblock-key statblock-key-roll" data-statblock-roll-label="${gi}::${fi}" title="${esc(rollMethodTitle(method, value, f.target))}">${esc(f.key)}</button>`
    : `<span class="statblock-key" title="Not rollable">${esc(f.key)}</span>`;
  return `
    <div class="statblock-row attr-row ${opts.compact ? 'attr-row-compact' : ''}">
      ${label}
      <input type="text" inputmode="numeric" class="attr-val-input" data-statblock-attr-val="${gi}::${fi}" value="${esc(formatAttrValue(value, format))}" aria-label="${esc(f.key)} value">
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
  return `
    <button class="btn ghost recap-toggle" data-recap-toggle>${recapOpen ? '▾' : '▸'} Previously on…</button>
    ${recapOpen ? recapPanel(doc) : ''}
    <div class="drawer-note">
      <div class="mention-editor" contenteditable="true" data-journal-input data-placeholder="Add a note, ruling, or clue… (drag an entity here, or type @, to mention it)"></div>
      <div class="drawer-note-actions">
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
      ${entries.length ? entries.map((e) => `
        <div class="journal-entry">
          <div class="journal-meta">${new Date(e.createdAt).toLocaleString()} · ${esc(e.source || 'Journal')}
                <button class="icon-btn" data-journal-del="${esc(e.id)}" title="Delete" aria-label="Delete">✕</button>
              </div>
              <div class="journal-text mention-text">${e.isHtml ? e.text : buildMentionEditorHTML(doc, e.text)}</div>
        </div>`).join('')
        : '<p class="ws-placeholder">No entries yet. Scenes and oracle rolls land here automatically.</p>'}
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
  return `
    <div class="oracle-group ${node.kind}">
      <button class="oracle-group-head" data-oracle-toggle="${esc(key)}">
        <span class="oracle-toggle-caret">${open ? '▾' : '▸'}</span>
        <span class="oracle-group-label">${esc(node.label)}</span>
      </button>
      ${rollGroupBtn}
      ${open ? `<div class="oracle-group-children">${childRows}</div>` : ''}
    </div>`;
}

function settings(doc, ui = {}) {
  const info = ui.storageInfo || { campaignBytes: 0, hasBackup: false, backupBytes: 0 };
  return `
    <div class="settings-group">
      <h3>Campaign</h3>
      <label class="field-label">Title
        <input data-campaign-title-input value="${esc(doc.meta.title)}">
      </label>
    </div>
    <div class="settings-group">
      <h3>Data (local-first)</h3>
      <p class="dim small">Everything is stored in this browser. Export a backup or bind a file in a OneDrive-synced folder.</p>
      <div class="btn-col">
        <button class="btn" data-export-campaign>Export Campaign JSON</button>
        <label class="btn ghost file-btn">Import Campaign JSON<input type="file" accept=".json,application/json" data-import-campaign hidden></label>
        <button class="btn ghost" data-bind-file>Bind Save File / OneDrive</button>
        <button class="btn ghost" data-new-campaign>New Campaign</button>
      </div>
      <p class="dim small storage-usage">Campaign size: ${formatBytes(info.campaignBytes)}${info.hasBackup ? ` · backup: ${formatBytes(info.backupBytes)}` : ' · no backup saved yet'}</p>
      ${info.hasBackup ? `<button class="btn ghost" data-restore-backup title="Replaces the current campaign with the last save that persisted before this one">↺ Restore last backup</button>` : ''}
      <p class="dim small">A browser's storage for this app is commonly 5-10MB total. Large uploaded documents are the usual reason this fills up — move big rulebooks into <code>assets/docs/</code> (via a rebuild) instead, which has no such limit.</p>
    </div>
    <div class="settings-group">
      <h3>Genre lens</h3>
      <label class="field-label">Setting
        <input data-genre-input value="${esc(doc.settings.genre || '')}" placeholder="Hostile, generic sci-fi, …">
      </label>
      <p class="dim small">A free-text flavor label — doesn't change any oracle content.</p>
      <label class="field-label">Genre Pack
        <select data-genre-pack-select>
          ${GENRE_PACKS.map((p) => `<option value="${p.id}" ${p.id === (doc.settings.genrePack || 'hostile') ? 'selected' : ''}>${esc(p.label)}</option>`).join('')}
        </select>
      </label>
      <p class="dim small">Which oracle table set the whole campaign rolls against (Continue Story, Oracle drawer, Generate NPC, Universal Search) — genre-aware, not genre-locked, so this is a data swap, not a different engine.</p>
    </div>
    <div class="settings-group">
      <h3>Stat system</h3>
      <label class="field-label">Default ruleset
        <select data-settings-stat-ruleset>
          ${RULESETS.map((r) => `<option value="${r.id}" ${r.id === (doc.settings.statRuleset || 'starforged') ? 'selected' : ''}>${esc(r.label)}</option>`).join('')}
        </select>
      </label>
      <p class="dim small">Creates entity stat templates aligned to the chosen rule system.</p>
      ${(() => {
        const activeRuleset = findRuleset(doc.settings.statRuleset || 'starforged');
        return activeRuleset.doc
          ? `<p class="dim small">Reference: <a href="${activeRuleset.doc}" target="_blank" rel="noreferrer">${esc(activeRuleset.label)} PDF</a></p>`
          : `<p class="dim small">No sourcebook in this repo's library — ${esc(activeRuleset.label)}'s stats here are original content, not a transcription.</p>`;
      })()}
    </div>
    ${statblockTemplateEditor(doc)}
    ${rulesConstitutionSection()}
    ${tradeEconomyModelSection(doc)}
    ${mechanicsIndexSection(doc, ui)}
    <div class="settings-group">
      <h3>Companion tools</h3>
      <p class="dim small">GMAtlas tracks character sheets in-app, ruleset-aware. For full character-building wizards this app doesn't replicate, the community Crew Link tool is one Ironsworn/Starforged option:</p>
      <div class="btn-col">
        <a class="btn ghost" href="https://starforged-crew-link.scottbenton.dev" target="_blank" rel="noreferrer">Open Crew Link ↗</a>
      </div>
      <p class="dim small">Opens in a new tab — never embedded, so it can't get stuck behind an in-app frame.</p>
    </div>
    <div class="settings-group">
      <h3>Build</h3>
      <p class="dim small">Phase ${esc(BUILD.phase)} · v${esc(BUILD.version)} — ${esc(BUILD.label)}</p>
      <ul class="build-notes">${BUILD.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
    </div>`;
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

// Read-only reference table: which external ruleset (or Saga Atlas itself)
// is the intended content provider per gameplay area — the "Rules
// Constitution" (requirements/initial design inputs/gameplay-goals.md, docs/adr/0002). Not yet an
// engine (that's Phase 9's Activity -> Rules Lens work); for now this just
// makes the design principle visible to the GM, the same way the Build
// panel below makes the changelog visible.
function rulesConstitutionSection() {
  const rows = GAMEPLAY_AREAS.map(({ area, providers }) => `
    <tr>
      <td>${esc(area)}</td>
      <td>${providers.map((p) => `<span class="chip sm rules-provider-chip">${esc(providerLabel(p))}</span>`).join(' ')}</td>
    </tr>`).join('');
  const legend = Object.entries(RULES_PROVIDERS).map(([id, p]) => `
    <li><b>${esc(p.label)}</b> — <span class="dim small">${esc(p.status)}.</span> ${esc(p.note)}</li>`).join('');
  return `
    <div class="settings-group">
      <h3>Rules Constitution</h3>
      <p class="dim small">Every ruleset is a content provider, not the application — Saga Atlas owns the campaign; each system contributes only what it does best for a given gameplay area. Reference only today; becomes an Activity → Rules Lens recommender in a future phase.</p>
      <div class="tablewrap-narrow">
        <table class="rules-constitution-table">
          <thead><tr><th>Gameplay area</th><th>Provider(s)</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <ul class="rules-provider-legend">${legend}</ul>
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
function tradeEconomyModelSection(doc) {
  const active = doc.settings.tradeEconomyModel || 'hostile';
  const types = economyTypesForModel(active);
  const rows = types.map((t) => `
    <li><b>${esc(t.label)}</b> — <span class="dim small">scarcity ${t.scarcity}/10, manufacturing ${t.manufacturing}/10.</span> ${esc(t.description)}</li>`).join('');
  return `
    <div class="settings-group">
      <h3>Trade Economy Model</h3>
      <label class="field-label">Model
        <select data-trade-economy-model-select>
          ${ECONOMY_MODELS.map((m) => `<option value="${m.id}" ${m.id === active ? 'selected' : ''}>${esc(m.label)}</option>`).join('')}
        </select>
      </label>
      <p class="dim small">Tag a Location with one of these to bias its market prices beyond the manual supply/demand dials — untagged Locations are unaffected. Only one model is active at a time, but a Location already tagged from the other model keeps working if you switch.</p>
      <ul class="rules-provider-legend">${rows}</ul>
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
      <h3>Game Mechanics Index</h3>
      <p class="dim small">Scans the Reference Library's PDFs relevant to your active stat ruleset (plus Hostile's own core material) for terms like Strain, Supply, Momentum, and links each to the page it turns up on, in the Guide drawer below.</p>
      <button class="btn ghost" data-mechanics-scan ${scanning ? 'disabled' : ''}>${scanning ? 'Scanning…' : '🔄 Refresh Mechanics Index'}</button>
      <p class="dim small">${entries.length ? `${entries.length} term(s) indexed.` : 'Not scanned yet.'}</p>
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
        ${f.kind === 'track' ? `<label class="tpl-field-max">Max <input type="number" min="1" data-tpl-field-max="${key}" value="${f.max || 5}"></label>` : ''}
        ${(rollMethod === 'flat' || rollMethod === 'traveller') ? `<label class="tpl-field-max">Target <input type="number" min="1" data-tpl-field-target="${key}" value="${f.target || (rollMethod === 'traveller' ? 8 : 6)}"></label>` : ''}
      ` : ''}
      <span class="tpl-field-actions">
        <button class="icon-btn" data-tpl-field-up="${key}" title="Move up" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button class="icon-btn" data-tpl-field-down="${key}" title="Move down" ${i === count - 1 ? 'disabled' : ''}>↓</button>
        <button class="icon-btn" data-tpl-field-remove="${key}" title="Remove field">✕</button>
      </span>
    </div>`;
}

// A Party roster card shows one row per statblock GROUP, not every group's
// fields flattened together — a character carrying both a Starforged and a
// 5PFH sheet otherwise reads as one undifferentiated pile of numbers with
// no way to tell which system a given stat belongs to. Each row gets a
// small label naming its ruleset/Bestiary template, mirroring how the
// Entity Inspector's own character-sheet-stats row already stays on one
// line per system.
function partyMemberStatblocks(e, doc) {
  const sorted = sortStatblockGroups(e.statblocks, doc.settings);
  const templates = getStatblockTemplates(doc.settings);
  return sorted.map(({ group }) => {
    const badges = attributeBadges(group.fields);
    if (!badges) return '';
    const label = group.kind === 'character' ? findRuleset(group.ruleset).label
      : (templates[group.templateId] || {}).label || (group.kind === 'vehicle' ? 'Vehicle' : bestiaryTerm(doc.settings.genrePack));
    return `<div class="party-stat-group">
      <div class="party-stat-group-label">${esc(label)}</div>
      ${badges}
    </div>`;
  }).join('');
}

// A tracker's kind (meter/counter/currency) is fixed for its lifetime (see
// domain/party.js's addPartyTracker/updatePartyTracker) and never shown as
// its own label — boxes vs. a +/- number already say which one it is, so
// naming it again ("Meter"/"Counter") was redundant. A Starforged counter's
// difficulty rank (also creation-time-only) isn't inferable from the
// format, so it still gets a small badge — just without the kind word
// glued onto it.
function partyTrackerRow(t) {
  const rank = t.difficulty && findProgressDifficulty(t.difficulty);
  const body = t.kind === 'meter' ? `
    <div class="track-boxes party-tracker-boxes">${Array.from({ length: t.max || 5 }, (_, k) => k + 1).map((n) => `
      <button type="button" class="track-box ${n <= t.value ? 'on' : ''}" data-party-tracker-box="${esc(t.id)}" data-track-n="${n}" aria-label="Set ${n}">${n}</button>`).join('')}</div>` : `
    <span class="party-tracker-counter">
      <button class="icon-btn" data-party-tracker-step="${esc(t.id)}" data-delta="-1" title="-1">−</button>
      <input class="party-tracker-value-input" type="number" data-party-tracker-value="${esc(t.id)}" value="${t.value}">
      <button class="icon-btn" data-party-tracker-step="${esc(t.id)}" data-delta="1" title="+1">＋</button>
    </span>`;
  return `
    <div class="party-tracker-row">
      <input class="party-tracker-name-input" data-party-tracker-name="${esc(t.id)}" value="${esc(t.name)}" placeholder="Tracker name">
      ${rank ? `<span class="party-tracker-kind-label" title="Starforged progress track difficulty — fixed once created">${esc(rank.label)}</span>` : ''}
      ${body}
      <button class="icon-btn" data-party-tracker-remove="${esc(t.id)}" title="Remove">✕</button>
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
        <label class="party-tracker-draft-size">Size <input type="number" min="1" max="40" class="party-tracker-draft-max-input" data-party-tracker-draft-max value="5"></label>` : ''}
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
function party(doc, ui = {}) {
  const members = listPartyMembers(doc);
  const trackers = listPartyTrackers(doc);
  const memberCards = members.map((e) => `
    <div class="party-member-card" data-open-entity="${esc(e.id)}">
      <div class="party-member-name">${esc(e.name) || '<em>Unnamed</em>'}</div>
      ${partyMemberStatblocks(e, doc)}
    </div>`).join('');

  const isStarforged = ((doc.settings && doc.settings.statRuleset) || 'starforged') === 'starforged';
  const trackerRows = trackers.map(partyTrackerRow).join('');

  return `
    <div class="statblock-head"><h4>Party Roster</h4></div>
    <p class="dim small">NPC entities tagged <code>#character</code> — tag an NPC in the Cast drawer to add them here.</p>
    <div class="party-member-list">
      ${memberCards || '<p class="ws-placeholder">No party members yet. In Cast, add an NPC and tag it #character.</p>'}
    </div>
    <div class="statblock-head" style="margin-top: var(--sp-4);"><h4>Party Trackers</h4>${ui.partyTrackerAddOpen ? '' : '<button class="chip" data-party-tracker-add-toggle>＋ Tracker</button>'}</div>
    ${ui.partyTrackerAddOpen ? partyTrackerAddForm(ui, isStarforged) : ''}
    <div class="party-tracker-list">
      ${trackerRows || '<p class="ws-placeholder">No trackers yet — add one for credits, supply, or any shared resource.</p>'}
    </div>`;
}

// --- Colony: 5PFH Planetfall turn sheet + crew roster + lifeform filter ----
function colony(doc) {
  const fields = getColonyFields(doc);
  const crew = listCrewRows(doc);
  const characters = listEntities(doc, ['npc']);
  const vehicles = listEntities(doc, ['asset']);
  const lifeforms = listLifeformEncounters(doc);

  const fieldRows = COLONY_FIELDS.map((f) => {
    const v = fields[f.key];
    if (f.type === 'textarea') {
      return `<label class="field-label">${esc(f.label)}<textarea data-colony-field="${f.key}" rows="2">${esc(v || '')}</textarea></label>`;
    }
    return `<label class="field-label">${esc(f.label)}<input type="${f.type === 'number' ? 'number' : 'text'}" data-colony-field="${f.key}" value="${esc(v == null ? '' : v)}"></label>`;
  }).join('');

  const crewRows = crew.map((row) => `
    <div class="colony-crew-row">
      <select data-colony-crew-field="${esc(row.id)}::characterId">
        <option value="">— Character —</option>
        ${characters.map((c) => `<option value="${esc(c.id)}" ${c.id === row.characterId ? 'selected' : ''}>${esc(c.name) || 'Unnamed'}</option>`).join('')}
      </select>
      <select data-colony-crew-field="${esc(row.id)}::assetId">
        <option value="">— Vehicle/Asset —</option>
        ${vehicles.map((a) => `<option value="${esc(a.id)}" ${a.id === row.assetId ? 'selected' : ''}>${esc(a.name) || 'Unnamed'}</option>`).join('')}
      </select>
      <input class="colony-crew-role-input" data-colony-crew-field="${esc(row.id)}::role" value="${esc(row.role)}" placeholder="Role">
      <button class="icon-btn" data-colony-crew-remove="${esc(row.id)}" title="Remove">✕</button>
    </div>`).join('');

  const lifeformRows = lifeforms.map((e) => `
    <button class="entity-chip" data-open-entity="${esc(e.id)}">${esc(e.name) || 'Unnamed'}</button>`).join('');

  return `
    <div class="statblock-head"><h4>Colony Turn Sheet</h4></div>
    <p class="dim small">5PFH Planetfall campaign-turn tracker.</p>
    <div class="colony-fields">${fieldRows}</div>
    <div class="statblock-head" style="margin-top: var(--sp-4);"><h4>Crew Roster</h4><button class="chip" data-colony-crew-add>＋ Crew</button></div>
    <div class="colony-crew-list">
      ${crewRows || '<p class="ws-placeholder">No crew rows yet.</p>'}
    </div>
    <div class="statblock-head" style="margin-top: var(--sp-4);"><h4>Lifeform Encounters</h4></div>
    <p class="dim small">Live filter over entities tagged <code>#lifeform</code>.</p>
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
      <td><input type="number" min="0" max="100" class="trade-dial-input" data-trade-dial="${esc(location.id)}::${c.id}::supply" value="${m.supply}"></td>
      <td><input type="number" min="0" max="100" class="trade-dial-input" data-trade-dial="${esc(location.id)}::${c.id}::demand" value="${m.demand}"></td>
      <td class="trade-price">${price}</td>
      <td class="trade-buy-sell">
        <input type="number" min="1" value="1" class="trade-qty-input" data-trade-qty="${c.id}">
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
    <input type="number" min="0" class="trade-contract-draft-payout" data-trade-contract-draft-payout placeholder="Payout" value="50">
    <button class="btn sm" data-trade-contract-create>Create</button>
    <button class="icon-btn" data-trade-contract-add-cancel title="Cancel">✕</button>
  </div>`;
}

function contractRow(doc, c) {
  const pips = Array.from({ length: c.segments }, (_, i) => `<span class="pip ${i < c.filled ? 'on' : ''}"></span>`).join('');
  const patron = c.patronId && getEntity(doc, c.patronId);
  const origin = c.originId && getEntity(doc, c.originId);
  const destination = c.destinationId && getEntity(doc, c.destinationId);
  return `<div class="trade-contract-row thread-status-${esc(c.status)} thread-priority-${esc(c.priority)} ${c.done ? 'done' : ''}">
    <div class="trade-contract-head">
      <span class="trade-contract-name">${esc(c.name)}</span>
      ${c.type ? `<span class="chip sm">${esc(c.type)}</span>` : ''}
      <span class="trade-contract-payout">💰 ${c.payout}</span>
    </div>
    <div class="trade-contract-route">
      ${patron ? `<button class="entity-chip" data-open-entity="${esc(patron.id)}" title="Patron">${esc(patron.name) || 'Unnamed'}</button>` : '<span class="dim small">No patron set</span>'}
      ${origin || destination ? `<span class="dim small">${origin ? esc(origin.name) || 'Unnamed' : '?'} → ${destination ? esc(destination.name) || 'Unnamed' : '?'}</span>` : ''}
    </div>
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
  </div>`;
}

function trade(doc, ui = {}) {
  const locations = listEntities(doc, ['location']);
  const npcs = listEntities(doc, ['npc']);
  const selectedId = ui.tradeLocationId && locations.some((l) => l.id === ui.tradeLocationId) ? ui.tradeLocationId : '';
  const selectedLocation = selectedId ? getEntity(doc, selectedId) : null;
  const manifest = listCargoManifest(doc);
  const contracts = listContracts(doc);

  return `
    <div class="statblock-head"><h4>Merchant — Market</h4></div>
    <p class="dim small">Supply/demand at each Location drive price — buying drains supply and raises the next price there, selling floods it and lowers it, so two Locations never agree.</p>
    <label class="field-label">Location
      <select data-trade-location>
        <option value="">— choose a Location —</option>
        ${locations.map((l) => `<option value="${esc(l.id)}" ${l.id === selectedId ? 'selected' : ''}>${esc(l.name) || 'Unnamed'}</option>`).join('')}
      </select>
    </label>
    ${selectedLocation ? marketTable(selectedLocation)
      : (locations.length ? '<p class="ws-placeholder">Pick a Location to see its market.</p>' : '<p class="ws-placeholder">No Locations yet — add one in Cast first.</p>')}
    <div class="statblock-head" style="margin-top: var(--sp-4);"><h4>Cargo Manifest</h4></div>
    <div class="trade-manifest-list">
      ${manifest.length ? manifest.map((row) => {
        const c = findCommodity(row.commodityId);
        return `<div class="trade-manifest-row"><span>${esc(c ? c.label : row.commodityId)}</span><b>${row.qty}</b></div>`;
      }).join('') : '<p class="ws-placeholder">No cargo yet — buy something from a Location\'s market above.</p>'}
    </div>
    <div class="statblock-head" style="margin-top: var(--sp-4);">
      <h4>Contracts</h4>
      <div class="trade-contract-head-actions">
        <button class="chip" data-trade-generate-contract title="Roll the Contract Type oracle table into a new contract">🎲 Generate</button>
        ${ui.tradeContractAddOpen ? '' : '<button class="chip" data-trade-contract-add-toggle>＋ Contract</button>'}
      </div>
    </div>
    ${ui.tradeContractAddOpen ? contractAddForm(locations, npcs) : ''}
    <div class="trade-contract-list">
      ${contracts.length ? contracts.map((c) => contractRow(doc, c)).join('') : '<p class="ws-placeholder">No contracts yet — generate one, or add one manually.</p>'}
    </div>`;
}

// --- Guide: one freeform reference document (table of contents) ------------
function guide(doc) {
  const text = getGuideText(doc);
  return `
    <p class="dim small">A table of contents for the campaign — <code>@Name</code> links a Cast entity, <code>@[Doc Name]</code> references a document (<code>@[Doc Name#12]</code> or <code>@[Doc Name p.12]</code> jumps to a page). Click a mention to open it; arrow-key the cursor into it to edit its label. Saves automatically.</p>
    <div class="mention-editor guide-editor" contenteditable="true" data-guide-input data-placeholder="Colony Builder — see @[5PFH Planetfall p.12] for the turn sheet.&#10;Meet @Captain Reyes in Docking Bay 3.">${buildMentionEditorHTML(doc, text)}</div>
    ${mechanicsIndexList(doc)}`;
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

  const nodes = g.nodes.map((n) => {
    const p = pos.get(n.id); if (!p) return '';
    const r = 9 + Math.min(10, n.degree * 2);
    return `<g class="graph-node ${active === n.id ? 'sel' : ''}" data-graph-node="${esc(n.id)}" tabindex="0">
      <title>${esc(n.name)} · ${TYPE_LABEL[n.type] || n.type} · ${n.degree} link${n.degree === 1 ? '' : 's'}</title>
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r}" fill="${nodeColor(n.type)}"/>
      <text x="${p.x.toFixed(1)}" y="${(p.y + r + 12).toFixed(1)}" class="graph-node-label">${esc(clip(n.name, 18))}</text>
    </g>`;
  }).join('');

  const legend = ENTITY_TYPES.map((t) => `<span class="graph-legend-item"><span class="dot" style="background:${nodeColor(t)}"></span>${TYPE_LABEL[t]}</span>`).join('');

  return `
    <p class="dim small">${g.nodes.length} entit${g.nodes.length === 1 ? 'y' : 'ies'} · ${g.edges.length} link${g.edges.length === 1 ? '' : 's'}. Click a node to open it.</p>
    <div class="graph-legend">${legend}</div>
    <div class="graph-toolbar">
      <button class="icon-btn" data-graph-zoom="in" title="Zoom in">＋</button>
      <button class="icon-btn" data-graph-zoom="out" title="Zoom out">－</button>
      <button class="icon-btn" data-graph-zoom="reset" title="Reset zoom/pan">⟲</button>
      <span class="dim small">Scroll to zoom, drag to pan — useful once a campaign has a lot of links.</span>
    </div>
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

// Estimated decoded size of a base64 data: URI — good enough for a GM
// judging which uploaded document is the one to remove/move to assets/docs/
// when localStorage's quota gets hit (store.js), not meant to be exact.
function dataUrlBytes(dataUrl) {
  const base64 = String(dataUrl || '').split(',')[1] || '';
  if (!base64) return 0;
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor(base64.length * 0.75) - padding);
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
  const mentions = listDocumentMentions(doc);
  const allTags = allDocumentTags(doc);
  // The Reference Library shares the same search box + tag-filter chips as
  // the uploaded/note library above it (one search, one set of filters, two
  // lists) — it was rendered unconditionally before, so typing in the search
  // box visibly filtered the top list but silently left every reference doc
  // on screen.
  const requiredTags = [...activeTags].map((t) => t.toLowerCase());
  const q = search.trim().toLowerCase();
  const refDocs = listReferenceDocuments(doc).filter((r) => {
    if (requiredTags.length && !requiredTags.every((t) => (r.tags || []).includes(t))) return false;
    if (!q) return true;
    return [r.title, ...(r.tags || [])].join(' ').toLowerCase().includes(q);
  });

  const rows = items.map((d) => {
    // An uploaded file's dataUrl is embedded directly in campaign.json, the
    // usual reason localStorage's quota gets hit (see store.js) — showing
    // its size right here (not just on hover) is what actually lets a GM
    // spot which upload to remove/move to assets/docs/ when that happens.
    const sizeBadge = d.kind === 'file' && d.dataUrl ? `<span class="dim small doc-size-badge">${formatBytes(dataUrlBytes(d.dataUrl))}</span>` : '';
    const titleEl = renameOpen.has(d.id)
      ? `<input class="doc-rename-input" data-doc-rename-input="${esc(d.id)}" value="${esc(d.title)}" placeholder="Untitled document" autofocus>`
      : (d.kind === 'file'
        ? `<a href="#" class="doc-card-title-link" data-doc-open="lib:${esc(d.id)}" data-drag-document="lib:${esc(d.id)}" draggable="true" title="Open in viewer — ${formatBytes(dataUrlBytes(d.dataUrl))}">${esc(d.title || d.fileName)}</a>`
        : `<span class="doc-card-title-static" data-drag-document="lib:${esc(d.id)}" draggable="true" title="Drag into a note or context field to insert a @ pointer">${esc(d.title || 'Untitled document')}</span>`);
    return `
    <div class="doc-card">
      <div class="doc-card-head">
        <span class="doc-card-title-group">${titleEl}${sizeBadge}</span>
        <div class="doc-card-actions">
          <button class="icon-btn" data-doc-tag-toggle="${esc(d.id)}" title="Tags">🏷</button>
          <button class="icon-btn" data-doc-rename="${esc(d.id)}" title="${renameOpen.has(d.id) ? 'Save' : 'Rename entry'}">${renameOpen.has(d.id) ? '💾' : '✎'}</button>
          <button class="icon-btn" data-doc-delete="${esc(d.id)}" title="Delete document">✕</button>
        </div>
      </div>
      ${d.kind === 'file' ? '' : `
      <textarea class="doc-content-input" data-doc-content="${esc(d.id)}" rows="6" placeholder="Store notes, references, or handout text here…">${esc(d.content || '')}</textarea>
      <div class="drawer-note-actions"><button class="btn sm" data-doc-save="${esc(d.id)}">Save</button></div>`}
      ${tagEditorOpen.has(d.id) ? docTagEditor(d) : ''}
    </div>`;
  }).join('');
  const mentionSummary = mentions.length ? `<p class="dim small">Mentioned in notes: ${mentions.map((m) => esc(m.name)).join(', ')}</p>` : '';

  const refRows = refDocs.map((r) => `
    <div class="doc-card ref-doc-card">
      <div class="doc-card-head">
        ${renameOpen.has(r.key)
          ? `<input class="doc-rename-input" data-ref-rename-input="${esc(r.key)}" value="${esc(r.title)}" placeholder="Untitled document" autofocus>`
          : `<a href="#" class="doc-card-title-link" data-doc-open="ref:${esc(r.key)}" data-drag-document="ref:${esc(r.key)}" draggable="true" title="${esc(r.ext.toUpperCase())} · ${formatBytes(r.sizeBytes)} — open in viewer, or drag into a note or context field to insert a @ pointer">${esc(r.title)}</a>`}
        <div class="doc-card-actions">
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
      <label class="btn ghost file-btn">Upload file(s)<input type="file" data-doc-upload multiple hidden></label>
      <p class="dim small">Drag a document into a note or context field to insert a @ pointer.</p>
    </div>
    <input class="drawer-search" data-doc-filter value="${esc(search)}" placeholder="Search by name or tag…">
    ${allTags.length ? `
    <button class="btn ghost sm" data-doc-tag-list-toggle>${tagListOpen ? '▾' : '▸'} Tags (${allTags.length})</button>
    ${tagListOpen ? `<div class="doc-tag-filter-chips">
      ${allTags.map((t) => `<button class="chip sm ${activeTags.has(t) ? 'active' : ''}" data-doc-tag-filter="${esc(t)}">#${esc(t)}</button>`).join('')}
    </div>` : ''}` : ''}
    ${mentionSummary}
    <div class="doc-list">
      ${rows}
    </div>
    ${refDocs.length ? `
    <div class="statblock-head" style="margin-top: var(--sp-4);"><h4>Reference Library</h4></div>
    <p class="dim small">Bundled rulebooks and setting docs from <code>assets/docs/</code> — refreshed on every build.</p>
    <div class="doc-list">${refRows}</div>` : ''}`;
}
