// drawers/index.js — the tertiary-tier drawer contents (Journal, Oracle,
// Graph, Documents, Settings). Each is a pure render(doc) -> html string;
// interactions are handled by the shell's delegated event handlers.

import { SCENE_TABLES, flattenKeys } from '../../domain/oracles.js';
import { listEntities, getEntity, ENTITY_TYPES, TYPE_LABEL } from '../../domain/entities.js';
import { buildGraph, computeLayout, nodeColor } from '../../domain/graph.js';
import { BUILD } from '../../core/buildInfo.js';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Flatten the oracle tables once into a searchable list of rollable leaves.
const LEAVES = flattenKeys(SCENE_TABLES).map((l) => ({
  path: l.path,
  label: l.path.join(' › '),
  count: l.values.length,
  key: l.path.join('>'),
  search: l.path.join(' ').toLowerCase(),
}));

export function renderDrawer(id, doc) {
  switch (id) {
    case 'journal': return journal(doc);
    case 'oracle': return oracle(doc);
    case 'entities': return entities(doc);
    case 'settings': return settings(doc);
    case 'graph': return graph(doc);
    case 'documents': return documents(doc);
    default: return `<p class="ws-placeholder">Drawer “${esc(id)}”.</p>`;
  }
}

function entities(doc) {
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
      <div class="entity-inspector">${active ? inspector(doc, active) : '<p class="dim small">Select an entity to edit.</p>'}</div>
    </div>`;
}

function inspector(doc, e) {
  const others = listEntities(doc).filter((x) => x.id !== e.id);
  const rels = (e.relationships || []).map((r) => {
    const other = getEntity(doc, r.to);
    return other ? `<span class="rel-chip">${esc(other.name) || 'Unnamed'} <span class="dim">(${esc(r.label)})</span> <button class="icon-btn" data-entity-unlink="${esc(r.to)}" title="Unlink">✕</button></span>` : '';
  }).join('');
  return `
    <div class="inspector-head">
      <input class="inspector-name" data-entity-field="name" value="${esc(e.name)}" placeholder="Name">
      <button class="icon-btn" data-entity-del="${esc(e.id)}" title="Delete entity">🗑</button>
    </div>
    <div class="field-row2">
      <label class="field-label">Type
        <select data-entity-field="type">${ENTITY_TYPES.map((t) => `<option value="${t}" ${t === e.type ? 'selected' : ''}>${TYPE_LABEL[t]}</option>`).join('')}</select>
      </label>
      <label class="field-label">Tags
        <input data-entity-field="tags" value="${esc((e.tags || []).join(', '))}" placeholder="comma, separated">
      </label>
    </div>
    <label class="field-label">Overview (shared)
      <textarea data-entity-field="overview" rows="3" placeholder="What the party knows.">${esc(e.overview)}</textarea>
    </label>
    <label class="field-label">Revealed / hidden (GM)
      <textarea data-entity-field="revealed" rows="2" placeholder="Secrets, twists, true motives.">${esc(e.revealed)}</textarea>
    </label>
    ${statblockSection(e)}
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

function statblockSection(e) {
  if (!e.statblock) {
    return `<div class="statblock-block">
      <div class="statblock-head"><h4>Statblock</h4></div>
      <div class="statblock-add-choices">
        <button class="chip" data-statblock-add="npc">＋ NPC stats</button>
        <button class="chip" data-statblock-add="vehicle">＋ Vehicle stats</button>
      </div>
    </div>`;
  }
  const rows = e.statblock.fields.map((f, i) => f.track ? trackRow(f, i) : textRow(f, i)).join('');
  return `<div class="statblock-block">
    <div class="statblock-head">
      <h4>${e.statblock.kind === 'vehicle' ? 'Vehicle Statblock' : 'Statblock'}</h4>
      <button class="icon-btn" data-statblock-remove title="Remove statblock">🗑</button>
    </div>
    ${rows}
    <div class="statblock-add-row">
      <button class="chip" data-statblock-add-field>＋ Field</button>
      <button class="chip" data-statblock-add-track-field>＋ Track</button>
    </div>
  </div>`;
}

function textRow(f, i) {
  return `
    <div class="statblock-row">
      <input class="statblock-key" data-statblock-key="${i}" value="${esc(f.key)}" placeholder="Field">
      <input class="statblock-val" data-statblock-val="${i}" value="${esc(f.value)}" placeholder="Value">
      <button class="icon-btn" data-statblock-toggle-track="${i}" title="Switch to a numeric click-to-set / roll track">#</button>
      <button class="icon-btn" data-statblock-remove-field="${i}" title="Remove field">✕</button>
    </div>`;
}

// Crew-Link-style numeric scale: a row of click-to-set boxes plus a value
// badge that rolls (d6 + value vs 2d10) on double-click.
function trackRow(f, i) {
  const max = f.max || 5;
  const value = Number(f.value) || 0;
  const boxes = Array.from({ length: max }, (_, k) => k + 1).map((n) => `
    <button type="button" class="track-box ${n <= value ? 'on' : ''}" data-statblock-track-set="${i}" data-track-n="${n}" aria-label="Set ${n}">${n}</button>`).join('');
  return `
    <div class="statblock-row track-row">
      <input class="statblock-key" data-statblock-key="${i}" value="${esc(f.key)}" placeholder="Field">
      <div class="track-widget">
        <div class="track-boxes">${boxes}</div>
        <button type="button" class="track-value-badge" data-statblock-roll="${i}" title="Double-click to roll: d6 + ${value} vs 2d10">${value}<small>/${max}</small></button>
      </div>
      <button class="icon-btn" data-statblock-toggle-track="${i}" title="Switch to a text field">Aa</button>
      <button class="icon-btn" data-statblock-remove-field="${i}" title="Remove field">✕</button>
    </div>`;
}

function journal(doc) {
  const entries = (doc.journal || []).slice().reverse();
  return `
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
          <div class="journal-text">${e.isHtml ? e.text : esc(e.text).replace(/\n/g, '<br>')}</div>
        </div>`).join('')
        : '<p class="ws-placeholder">No entries yet. Scenes and oracle rolls land here automatically.</p>'}
    </div>`;
}

function oracle(doc) {
  const filter = (doc.settings.ui.oracleFilter || '').toLowerCase();
  const list = filter ? LEAVES.filter((l) => l.search.includes(filter)) : LEAVES;
  const shown = list.slice(0, 300);
  return `
    <input class="drawer-search" data-oracle-filter value="${esc(doc.settings.ui.oracleFilter || '')}" placeholder="Search ${LEAVES.length} oracle tables…">
    <div class="oracle-list">
      ${shown.map((l) => `
        <div class="oracle-row">
          <span class="oracle-label">${esc(l.label)} <span class="dim">(${l.count})</span></span>
          <button class="icon-btn" data-roll="${esc(l.key)}" title="Roll" aria-label="Roll">🎲</button>
        </div>`).join('')}
      ${list.length > shown.length ? `<p class="dim small">…${list.length - shown.length} more — keep typing to narrow.</p>` : ''}
      ${!list.length ? '<p class="ws-placeholder">No tables match that search.</p>' : ''}
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
      <h3>Build</h3>
      <p class="dim small">Phase ${esc(BUILD.phase)} · v${esc(BUILD.version)} — ${esc(BUILD.label)}</p>
      <ul class="build-notes">${BUILD.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
    </div>`;
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

function clip(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

function documents(doc) {
  const n = (doc.documents.library || []).length;
  return `<p class="ws-placeholder">Document library (PDF handbooks) arrives in Phase 3. ${n} document${n === 1 ? '' : 's'} stored.</p>`;
}
