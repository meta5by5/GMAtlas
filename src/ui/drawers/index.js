// drawers/index.js — the tertiary-tier drawer contents (Journal, Oracle,
// Graph, Documents, Settings). Each is a pure render(doc) -> html string;
// interactions are handled by the shell's delegated event handlers.

import { SCENE_TABLES, buildGroupedOracleTree, filterOracleTree } from '../../domain/oracles.js';
import { listEntities, getEntity, ENTITY_TYPES, TYPE_LABEL, findByName, parseMentions, listTagVocabulary } from '../../domain/entities.js';
import { parseStatsString, sortStatblockGroups } from '../../domain/statblocks.js';
import { listTemplates } from '../../domain/statblockTemplates.js';
import { buildGraph, computeLayout, nodeColor } from '../../domain/graph.js';
import { BUILD } from '../../core/buildInfo.js';
import { getDocument, listDocuments, listDocumentMentions, parseDocumentMentions, allDocumentTags, filterDocuments, listReferenceDocuments } from '../../domain/documents.js';
import { listPartyMembers, listPartyTrackers } from '../../domain/party.js';
import { COLONY_FIELDS, getColonyFields, listCrewRows, listLifeformEncounters } from '../../domain/colony.js';
import { getGuideText } from '../../domain/guide.js';
import { buildSessionRecap } from '../../domain/recap.js';
import { RULESETS, findRuleset } from '../../data/rulesets.js';
import { RULES_PROVIDERS, GAMEPLAY_AREAS, providerLabel } from '../../data/rulesConstitution.js';
import { DOCS_MANIFEST } from '../../data/docsManifest.js';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderDrawer(id, doc, ui = {}) {
  switch (id) {
    case 'journal': return journal(doc, ui);
    case 'oracle': return oracle(doc, ui);
    case 'entities': return entities(doc, ui);
    case 'party': return party(doc);
    case 'colony': return colony(doc);
    case 'guide': return guide(doc);
    case 'settings': return settings(doc);
    case 'graph': return graph(doc);
    case 'documents': return documents(doc, ui);
    default: return `<p class="ws-placeholder">Drawer “${esc(id)}”.</p>`;
  }
}

function entities(doc, ui) {
  const items = listEntities(doc);
  const active = getEntity(doc, doc.entities && doc.entities.activeId);
  return `
    <div class="entity-add-row">
      ${ENTITY_TYPES.map((t) => `<button class="chip" data-entity-add="${t}">＋ ${TYPE_LABEL[t]}</button>`).join('')}
    </div>
    <div class="entity-cols">
      <div class="entity-list">
        ${items.length ? items.map((e) => `
          <button class="entity-list-row ${active && active.id === e.id ? 'sel' : ''}" draggable="true" data-drag-entity="${esc(e.id)}" data-drop-entity="${esc(e.id)}" data-entity-select="${esc(e.id)}" title="Drag onto another entity to link them, or onto Journal/context fields to mention them">
            <span class="entity-type-tag">${TYPE_LABEL[e.type] || 'Entity'}</span>
            <span class="entity-list-name">${esc(e.name) || '<em>Unnamed</em>'}</span>
            ${e.relationships && e.relationships.length ? `<span class="dim">🔗${e.relationships.length}</span>` : ''}
          </button>`).join('')
          : '<p class="ws-placeholder">No entities yet. Add one above, or type @Name in a note or situation to create one automatically.</p>'}
      </div>
      <div class="entity-inspector">${active ? inspector(doc, active, ui) : '<p class="dim small">Select an entity to edit.</p>'}</div>
    </div>`;
}

function inspector(doc, e, ui) {
  const others = listEntities(doc).filter((x) => x.id !== e.id);
  const rels = (e.relationships || []).map((r) => {
    const other = getEntity(doc, r.to);
    if (!other) return '';
    return `<span class="rel-chip">${esc(other.name) || 'Unnamed'}
      <input class="rel-label-input" data-entity-rel-label="${esc(r.to)}" value="${esc(r.label)}" placeholder="note (ally, rival…)" title="Edit this relationship's note">
      <button class="icon-btn" data-entity-unlink="${esc(r.to)}" title="Unlink">✕</button></span>`;
  }).join('');
  return `
    <div class="inspector-head">
      <input class="inspector-name" data-entity-field="name" value="${esc(e.name)}" placeholder="Name">
      <button class="icon-btn" data-entity-del="${esc(e.id)}" title="Delete entity">🗑</button>
    </div>
    <label class="field-label">Type
      <select data-entity-field="type">${ENTITY_TYPES.map((t) => `<option value="${t}" ${t === e.type ? 'selected' : ''}>${TYPE_LABEL[t]}</option>`).join('')}</select>
    </label>
    ${tagEditor(doc, e)}
    <label class="field-label">Overview (shared)
      <textarea data-entity-field="overview" rows="3" placeholder="What the party knows.">${esc(e.overview)}</textarea>
    </label>
    <label class="field-label">Revealed / hidden (GM)
      <textarea data-entity-field="revealed" rows="2" placeholder="Secrets, twists, true motives.">${esc(e.revealed)}</textarea>
    </label>
    ${statblockSection(e, doc, ui)}
    <div class="rel-block">
      <h4>Relationships</h4>
      <p class="dim small">Drag another entity onto this one (or vice versa) to link them.</p>
      <div class="rel-chips">${rels || '<span class="dim small">None yet.</span>'}</div>
      ${others.length ? `<div class="rel-add">
        <select data-entity-link-target>${others.map((o) => `<option value="${esc(o.id)}">${esc(o.name) || 'Unnamed'}</option>`).join('')}</select>
        <input data-entity-link-label placeholder="label (ally, rival…)">
        <button class="btn sm" data-entity-link-add>Link</button>
      </div>` : '<p class="dim small">Add another entity to create relationships.</p>'}
    </div>`;
}

// Tags as removable chips + a dropdown of tags already used by other
// entities of the same type (Phase 7's "tag fields as dropdowns" — a
// freeform tag typed for the first time joins that vocabulary for next
// time, via listTagVocabulary reading it live off existing entities rather
// than a separately-stored list). "+ New…" still takes a one-time freeform
// name via prompt, same ad-hoc-naming pattern as "+ Field"/"+ Track" above.
function tagEditor(doc, e) {
  const tags = e.tags || [];
  const chips = tags.map((t) => `
    <span class="tag-chip">${esc(t)}
      <button class="icon-btn" data-entity-tag-remove="${esc(t)}" title="Remove tag">✕</button>
    </span>`).join('');
  const vocab = listTagVocabulary(doc, e.type, e.id);
  return `
    <div class="tag-editor">
      <span class="field-label-static">Tags</span>
      <div class="tag-chips">${chips || '<span class="dim small">None yet.</span>'}</div>
      <div class="tag-add-row">
        <select data-entity-tag-select>
          <option value="">+ Add tag…</option>
          ${vocab.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join('')}
        </select>
        <button class="btn sm" data-entity-tag-new>+ New…</button>
      </div>
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
  const rows = sorted.map(({ group, index }) => statblockGroupBlock(e, group, index, doc)).join('');
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

function statblockGroupBlock(e, group, gi, doc) {
  if (group.kind === 'character') return characterSheetGroupBlock(group, gi, doc);
  const rows = group.fields.map((f, fi) => statblockFieldRow(f, gi, fi)).join('');
  // Bestiary is a subtype of NPC (like Character) — its label reflects that.
  const label = group.kind === 'vehicle' ? 'Vehicle Statblock' : `Bestiary (NPC) · ${esc(templateLabel(group.templateId, doc.settings))}`;
  return `<div class="statblock-block">
    <div class="statblock-head">
      <h4>${label}</h4>
      <button class="icon-btn" data-statblock-remove-group="${gi}" title="Remove this statblock">🗑</button>
    </div>
    ${attributeBadges(group.fields)}
    ${rows}
    <div class="statblock-add-row">
      <button class="chip" data-statblock-add-field="${gi}">＋ Field</button>
      <button class="chip" data-statblock-add-track-field="${gi}">＋ Track</button>
    </div>
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
  if (e.type !== 'npc' && e.type !== 'asset') return '';
  const presentRulesets = new Set(groups.filter((g) => g.kind === 'character').map((g) => g.ruleset));
  const presentTemplates = new Set(groups.filter((g) => g.kind === 'npc').map((g) => g.templateId));
  const hasVehicle = groups.some((g) => g.kind === 'vehicle');

  const charChips = e.type === 'npc' ? RULESETS.filter((r) => !presentRulesets.has(r.id))
    .map((r) => `<button class="chip" data-statblock-add="character" data-statblock-ruleset="${esc(r.id)}">＋ Character Sheet (${esc(r.label)})</button>`).join('') : '';
  const bestiaryChips = e.type === 'npc' ? listTemplates(doc.settings).filter((t) => t.id !== 'vehicle' && !presentTemplates.has(t.id))
    .map((t) => `<button class="chip" data-statblock-add="npc" data-statblock-template="${esc(t.id)}">＋ Bestiary: ${esc(t.label)}</button>`).join('') : '';
  const vehicleChip = e.type === 'asset' && !hasVehicle ? `<button class="chip" data-statblock-add="vehicle">＋ Vehicle Stats</button>` : '';

  const any = charChips || bestiaryChips || vehicleChip;
  if (!any) return '';
  return `<div class="statblock-add-choices" style="margin-top: var(--sp-2);">${charChips}${bestiaryChips}${vehicleChip}</div>`;
}

// A character sheet groups the same field engine every other statblock uses
// into two sections — a compact row of core stats up top (single-number
// +/- spinners, Starforged/5PFH-style) and full-width resource meters below
// (Health, Spirit, Supply, ...) — purely a rendering split; stats are
// attribute fields, resources are track fields, both rollable the same way
// (double-click the value).
function characterSheetGroupBlock(group, gi, doc) {
  const ruleset = findRuleset(group.ruleset);
  const indexed = group.fields.map((f, fi) => ({ f, fi }));
  const stats = indexed.filter(({ f }) => f.group === 'stat');
  const resources = indexed.filter(({ f }) => f.group !== 'stat');
  return `<div class="statblock-block character-sheet">
    <div class="statblock-head">
      <h4>Character Sheet · ${esc(ruleset.label)}</h4>
      <button class="icon-btn" data-statblock-remove-group="${gi}" title="Remove this statblock">🗑</button>
    </div>
    ${stats.length ? `<div class="character-sheet-stats">${stats.map(({ f, fi }) => statblockFieldRow(f, gi, fi, { compact: true })).join('')}</div>` : ''}
    ${resources.length ? `<div class="character-sheet-resources">${resources.map(({ f, fi }) => statblockFieldRow(f, gi, fi)).join('')}</div>` : ''}
    <div class="statblock-add-row">
      <button class="chip" data-statblock-add-field="${gi}">＋ Field</button>
      <button class="chip" data-statblock-add-track-field="${gi}">＋ Track</button>
    </div>
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

// Takes a flat field list — callers pass one group's fields (per-group
// display in the inspector) or every group's fields flattened together
// (Party cards, Journal mention badges — see flattenStatblockFields).
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

/** Every field across every statblock group an entity has — used where a
 *  caller wants "all this entity's attributes" without caring which group
 *  they came from (Party roster cards, Journal @mention badges). */
function flattenStatblockFields(e) {
  return (e.statblocks || []).flatMap((g) => g.fields || []);
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
      <textarea data-journal-input rows="3" placeholder="Add a note, ruling, or clue… (drag an entity here to @mention it)"></textarea>
      <div class="drawer-note-actions">
        <button class="btn" data-journal-add>Add note</button>
        <button class="btn ghost" data-export-journal>Export</button>
      </div>
    </div>
    <div class="journal-list">
      ${entries.length ? entries.map((e) => `
        <div class="journal-entry">
          <div class="journal-meta">${new Date(e.createdAt).toLocaleString()} · ${esc(e.source || 'Journal')}
                <button class="icon-btn" data-journal-del="${esc(e.id)}" title="Delete" aria-label="Delete">✕</button>
              </div>
              ${(() => {
                const mentions = parseMentions(e.text || '');
                const badges = mentions.map((m) => {
                  const ent = findByName(doc, m);
                  return ent ? attributeBadges(flattenStatblockFields(ent)) : '';
                }).filter(Boolean).join('');
                return badges ? `<div class="journal-entity-badges">${badges}</div>` : '';
              })()}
    ${documentBadges(doc, e.text)}
              <div class="journal-text">${e.isHtml ? e.text : esc(e.text).replace(/\n/g, '<br>')}</div>
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
  const tree = buildGroupedOracleTree(SCENE_TABLES);
  const filtered = filterOracleTree(tree, filter);
  const forceOpen = !!filter.trim();
  const expanded = ui.expandedOracleGroups || new Set();

  const rows = filtered.map((cat) => oracleGroupRow(cat, forceOpen, expanded)).join('');
  return `
    <div class="oracle-toolbar">
      <input class="drawer-search" data-oracle-filter value="${esc(filter)}" placeholder="Search oracle tables…">
      <button class="btn ghost sm" data-oracle-collapse-all>Collapse all</button>
    </div>
    <div class="oracle-tree">
      ${rows || '<p class="ws-placeholder">No tables match that search.</p>'}
    </div>`;
}

function oracleGroupRow(node, forceOpen, expanded) {
  const key = node.path ? node.path.join('>') : node.label;
  const open = forceOpen || expanded.has(key);
  if (node.kind === 'table') {
    return `
      <div class="oracle-row">
        <span class="oracle-label">${esc(node.label)} <span class="dim">(${node.values.length})</span></span>
        <button class="icon-btn" data-roll="${esc(key)}" title="Roll" aria-label="Roll">🎲</button>
      </div>`;
  }
  const childRows = node.children.map((c) => oracleGroupRow(c, forceOpen, expanded)).join('');
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

function settings(doc) {
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
    </div>
    <div class="settings-group">
      <h3>Genre lens</h3>
      <label class="field-label">Setting
        <input data-genre-input value="${esc(doc.settings.genre || '')}" placeholder="Hostile, generic sci-fi, …">
      </label>
      <p class="dim small">Genre-aware, not genre-locked — the engine is data-driven.</p>
    </div>
    <div class="settings-group">
      <h3>Stat system</h3>
      <label class="field-label">Default ruleset
        <select data-settings-stat-ruleset>
          ${RULESETS.map((r) => `<option value="${r.id}" ${r.id === (doc.settings.statRuleset || 'starforged') ? 'selected' : ''}>${esc(r.label)}</option>`).join('')}
        </select>
      </label>
      <p class="dim small">Creates entity stat templates aligned to the chosen rule system.</p>
      <p class="dim small">Reference:
        <a href="${findRuleset(doc.settings.statRuleset || 'starforged').doc}" target="_blank" rel="noreferrer">${esc(findRuleset(doc.settings.statRuleset || 'starforged').label)} PDF</a>
      </p>
    </div>
    ${statblockTemplateEditor(doc)}
    ${rulesConstitutionSection()}
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
// Constitution" (requirements/gameplay-goals.md, docs/adr/0002). Not yet an
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

  return `
    <div class="settings-group">
      <h3>Statblock Templates (Bestiary)</h3>
      <p class="dim small">Per-system NPC/creature field manifests — game system, field kind (attribute badge vs track/progress-bar), roll method, and sort order. An NPC picks one template from its statblock's "Bestiary template" selector.</p>
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

// --- Party: #character roster (live entity filter) + free-form trackers ----
function party(doc) {
  const members = listPartyMembers(doc);
  const trackers = listPartyTrackers(doc);
  const memberCards = members.map((e) => `
    <div class="party-member-card" data-open-entity="${esc(e.id)}">
      <div class="party-member-name">${esc(e.name) || '<em>Unnamed</em>'}</div>
      ${attributeBadges(flattenStatblockFields(e))}
    </div>`).join('');

  const trackerRows = trackers.map((t) => `
    <div class="party-tracker-row">
      <input class="party-tracker-name-input" data-party-tracker-name="${esc(t.id)}" value="${esc(t.name)}" placeholder="Tracker name">
      <select data-party-tracker-kind="${esc(t.id)}">
        <option value="meter" ${t.kind === 'meter' ? 'selected' : ''}>Meter</option>
        <option value="counter" ${t.kind === 'counter' ? 'selected' : ''}>Counter</option>
        <option value="currency" ${t.kind === 'currency' ? 'selected' : ''}>Currency</option>
      </select>
      ${t.kind === 'meter' ? `
        <span class="party-tracker-meter">
          <button class="icon-btn" data-party-tracker-step="${esc(t.id)}" data-delta="-1" title="-1">−</button>
          <b>${t.value}</b>/<input class="party-tracker-max-input" type="number" min="1" data-party-tracker-max="${esc(t.id)}" value="${t.max || 5}">
          <button class="icon-btn" data-party-tracker-step="${esc(t.id)}" data-delta="1" title="+1">＋</button>
        </span>` : `
        <span class="party-tracker-counter">
          <button class="icon-btn" data-party-tracker-step="${esc(t.id)}" data-delta="-1" title="-1">−</button>
          <input class="party-tracker-value-input" type="number" data-party-tracker-value="${esc(t.id)}" value="${t.value}">
          <button class="icon-btn" data-party-tracker-step="${esc(t.id)}" data-delta="1" title="+1">＋</button>
        </span>`}
      <button class="icon-btn" data-party-tracker-remove="${esc(t.id)}" title="Remove">✕</button>
    </div>`).join('');

  return `
    <div class="statblock-head"><h4>Party Roster</h4></div>
    <p class="dim small">NPC entities tagged <code>#character</code> — tag an NPC in the Cast drawer to add them here.</p>
    <div class="party-member-list">
      ${memberCards || '<p class="ws-placeholder">No party members yet. In Cast, add an NPC and tag it #character.</p>'}
    </div>
    <div class="statblock-head" style="margin-top: var(--sp-4);"><h4>Party Trackers</h4><button class="chip" data-party-tracker-add>＋ Tracker</button></div>
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

// --- Guide: one freeform reference document (table of contents) ------------
function guide(doc) {
  const text = getGuideText(doc);
  const mentions = parseMentions(text);
  const docMentions = parseDocumentMentions(text);
  return `
    <p class="dim small">A table of contents for the campaign — <code>@Name</code> links a Cast entity, <code>@[Doc Name]</code> references a document.</p>
    <textarea class="guide-editor" data-guide-input rows="16" placeholder="Colony Builder — see @[5PFH Planetfall] for the turn sheet.&#10;Meet @Captain Reyes in Docking Bay 3.">${esc(text)}</textarea>
    <div class="drawer-note-actions"><button class="btn" data-guide-save>Save</button></div>
    ${mentions.length || docMentions.length ? `<div class="document-badges" style="margin-top: var(--sp-3);">
      ${mentions.map((m) => `<span class="doc-badge">☷ ${esc(m)}</span>`).join('')}
      ${docMentions.map((m) => `<span class="doc-badge">📄 ${esc(m)}</span>`).join('')}
    </div>` : ''}`;
}

function graph(doc) {
  const g = buildGraph(doc);
  if (!g.nodes.length) {
    return '<p class="ws-placeholder">No entities yet. Add a cast (or type @Name in a note) and their relationships appear here as a graph.</p>';
  }
  const W = 600, H = 520;
  const pos = computeLayout(g, { width: W, height: H });
  const active = doc.entities && doc.entities.activeId;

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
    <svg class="graph-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Relationship graph">
      <g class="graph-edges">${edges}</g>
      <g class="graph-nodes">${nodes}</g>
    </svg>`;
}

function documentBadges(doc, text) {
  const names = parseDocumentMentions(text || '');
  if (!names.length) return '';
  const library = (doc.documents && doc.documents.library) || [];
  const badges = names.map((name) => {
    const entry = library.find((d) => String(d.title || '').trim().toLowerCase() === String(name || '').trim().toLowerCase());
    return entry ? `<div class="doc-badge">📄 ${esc(entry.title)}</div>` : '';
  }).filter(Boolean);
  return badges.length ? `<div class="document-badges">${badges.join('')}</div>` : '';
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
// open; see the sizing in cockpit.css rather than here.
function docTagEditor(d) {
  const chips = (d.tags || []).map((t) => `
    <span class="doc-tag-chip">#${esc(t)} <button class="icon-btn" data-doc-tag-remove="${esc(d.id)}::${esc(t)}" title="Remove tag">✕</button></span>`).join('');
  return `
    <div class="doc-card-tags">
      ${chips}
      <input class="doc-tag-input" data-doc-tag-input="${esc(d.id)}" list="doc-tag-list" placeholder="add tag…">
      <button class="icon-btn" data-doc-tag-add="${esc(d.id)}" title="Add tag">＋</button>
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
      <input class="doc-tag-input" data-ref-tag-input="${esc(r.key)}" list="doc-tag-list" placeholder="add tag…">
      <button class="icon-btn" data-ref-tag-add="${esc(r.key)}" title="Add tag">＋</button>
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
  const items = filterDocuments(doc, { search, tags: [...activeTags] });
  const mentions = listDocumentMentions(doc);
  const allTags = allDocumentTags(doc);
  const refDocs = listReferenceDocuments(doc);

  const rows = items.map((d) => {
    const titleLink = d.kind === 'file'
      ? `<a href="#" class="doc-card-title-link" data-doc-open="lib:${esc(d.id)}" data-drag-document="${esc(d.id)}" draggable="true" title="Open in viewer">${esc(d.title || d.fileName)}</a>`
      : `<span class="doc-card-title-static" data-drag-document="${esc(d.id)}" draggable="true" title="Drag into a note or context field to insert a @ pointer">${esc(d.title || 'Untitled document')}</span>`;
    return `
    <div class="doc-card">
      <div class="doc-card-head">
        ${titleLink}
        <div class="doc-card-actions">
          <button class="icon-btn" data-doc-tag-toggle="${esc(d.id)}" title="Tags">🏷</button>
          <button class="icon-btn" data-doc-rename="${esc(d.id)}" title="Rename entry">✎</button>
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

  const refRows = refDocs.map((r, i) => `
    <div class="doc-card ref-doc-card">
      <div class="doc-card-head">
        <a href="#" class="doc-card-title-link" data-doc-open="ref:${i}" title="${esc(r.ext.toUpperCase())} · ${formatBytes(r.sizeBytes)} — open in viewer">${esc(r.title)}</a>
        <div class="doc-card-actions">
          <button class="icon-btn" data-doc-tag-toggle="${esc(r.key)}" title="Tags">🏷</button>
          <button class="icon-btn" data-ref-rename="${esc(r.key)}" title="Rename entry">✎</button>
        </div>
      </div>
      ${tagEditorOpen.has(r.key) ? refTagEditor(r) : ''}
    </div>`).join('');

  return `
    <datalist id="doc-tag-list">${allTags.map((t) => `<option value="${esc(t)}">`).join('')}</datalist>
    <div class="drawer-note">
      <button class="btn" data-doc-add>Add note</button>
      <label class="btn ghost file-btn">Upload file(s)<input type="file" data-doc-upload multiple hidden></label>
      <p class="dim small">Drag a document into a note or context field to insert a @ pointer.</p>
    </div>
    <input class="drawer-search" data-doc-filter value="${esc(search)}" placeholder="Search by name or tag…">
    ${allTags.length ? `<div class="doc-tag-filter-chips">
      ${allTags.map((t) => `<button class="chip sm ${activeTags.has(t) ? 'active' : ''}" data-doc-tag-filter="${esc(t)}">#${esc(t)}</button>`).join('')}
    </div>` : ''}
    ${mentionSummary}
    <div class="doc-list">
      ${rows || '<p class="ws-placeholder">No documents match. Add a note, upload a file, or clear your search/tag filters.</p>'}
    </div>
    ${refDocs.length ? `
    <div class="statblock-head" style="margin-top: var(--sp-4);"><h4>Reference Library</h4></div>
    <p class="dim small">Bundled rulebooks and setting docs from <code>assets/docs/</code> — refreshed on every build.</p>
    <div class="doc-list">${refRows}</div>` : ''}`;
}
