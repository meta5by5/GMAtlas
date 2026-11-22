// factions.js — the Factions panel (design/FACTION-ROADMAP.md U3, F1) and
// the entity peek popover (U2). The panel takes the right-nav slot and the
// `faction-events` drawer id the Faction Events panel had, so saved layouts
// keep working; that panel's whole body (Classic SWN turn controls, roster,
// missions, encounters, round history and the event log) lives on under the
// History tab. Tabs appear progressively: Overview, Factions and History
// always; Web with two or more factions; Plans once an objective exists;
// Conflicts once a Conflict exists. Review and Assets & Territory arrive with
// phases F4 and F7.
//
// Pure render: every control is a data-* attribute handled by shell.js.

import { listEntities, getEntity, entityTypeLabel } from '../../domain/entities.js';
import {
  factionProfile, standing, standingBreakdown, stanceLabel, factionObjectives, currentFactionTurn,
} from '../../domain/factionProfile.js';
import { factionsState } from '../../domain/factionState.js';
import { factionsPresentAt } from '../../domain/factionTurnEngine.js';
import {
  BEHAVIOR_AXES, CAPABILITIES, CAPABILITY_BANDS, STATE_KEYS, STATE_BANDS, METHODS, MEMORY_KINDS,
  FACTION_SIZES, REACH_LEVELS, factionFlavorFor,
} from '../../data/factionOracles.js';
import { STANCE_LEVELS, TRUST_MIN, TRUST_MAX } from '../../data/factionRelations.js';
import { CONFLICT_STAGES, CONFLICT_MAX_STAGE } from '../../data/conflictLadder.js';
import { FACTION_VERBS } from '../../data/factionVerbs.js';
import { renderFactionEvents } from './factionEvents.js';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const strip = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const TERRITORY = ['controls', 'owns', 'occupies', 'claims', 'contests', 'protects', 'influences', 'blockades'];
const verb = (id) => (FACTION_VERBS.find((v) => v.id === id) || { label: id }).label;

/** The tabs this campaign has earned, in order. */
export function factionsPanelTabs(doc) {
  const factions = listEntities(doc, ['faction']);
  const tabs = [{ id: 'overview', label: 'Overview' }, { id: 'factions', label: `Factions (${factions.length})` }];
  if (factions.length >= 2) tabs.push({ id: 'web', label: 'Web' });
  if (factionsState(doc).objectives.length) tabs.push({ id: 'plans', label: 'Plans' });
  if (listEntities(doc, ['faction-conflict']).length) tabs.push({ id: 'conflicts', label: 'Conflicts' });
  tabs.push({ id: 'history', label: 'History' });
  return tabs;
}

/** A faction chip that opens the peek, with stance toward the party as a
 *  glyph, number and label (never color alone, U1). */
export function factionStanceChip(doc, f, { toId = 'party' } = {}) {
  const s = stanceLabel(standing(doc, f.id, toId).value);
  return `<button type="button" class="entity-chip fx-chip fx-stance-${s.n < 0 ? 'neg' : s.n > 0 ? 'pos' : 'zero'}" data-entity-peek="${esc(f.id)}" title="${esc(f.name || 'Unnamed')}: ${esc(s.label)} toward ${toId === 'party' ? 'the party' : 'them'}">${esc(f.name || 'Unnamed')} <span class="fx-stance-text">${esc(s.text)}</span></button>`;
}

function stanceBadge(doc, fromId, toId) {
  const st = standing(doc, fromId, toId);
  const s = stanceLabel(st.value);
  return `<span class="fx-stance fx-stance-${s.n < 0 ? 'neg' : s.n > 0 ? 'pos' : 'zero'}" title="${esc(s.label)}${st.pinned ? ' (pinned)' : ''}">${esc(s.text)}${st.pinned ? ' 📌' : ''}</span>`;
}

function progressText(thread) {
  if (!thread) return '';
  return `${thread.filled}/${thread.segments}`;
}

function currentSign(thread) {
  if (!thread || !Array.isArray(thread.signs) || !thread.filled) return '';
  return thread.signs[Math.min(thread.filled, thread.signs.length) - 1] || '';
}

// --------------------------------------------------------------------------
// Overview (static sections in F1).

function overviewHtml(doc) {
  const factions = listEntities(doc, ['faction']);
  if (!factions.length) {
    return `<div class="fx-empty">
      <p><b>No factions yet.</b> Factions are the powers that move while the party is busy elsewhere.</p>
      <div class="action-bar">
        <button type="button" class="btn primary sm" data-fx-generate-trio>🎲 Generate a starting trio</button>
        <button type="button" class="btn ghost sm" data-fx-generate-one>🎲 Generate one faction</button>
        <button type="button" class="btn ghost sm" data-fx-new>＋ New faction</button>
      </div>
      <p class="dim small">A trio is three factions whose goals collide, so the status quo is already under strain. Everything generated is editable.</p>
    </div>`;
  }
  const conflicts = listEntities(doc, ['faction-conflict']).filter((c) => c.conflictStatus !== 'resolved')
    .sort((a, b) => (b.stage || 1) - (a.stage || 1));
  const plans = factionsState(doc).objectives.filter((o) => o.status === 'active').map((o) => {
    const full = factionObjectives(doc, o.factionId).find((x) => x.id === o.id);
    return full;
  }).filter(Boolean).sort((a, b) => ((b.thread && b.thread.filled / b.thread.segments) || 0) - ((a.thread && a.thread.filled / a.thread.segments) || 0));
  const byStance = factions.map((f) => ({ f, v: standing(doc, f.id, 'party').value })).sort((a, b) => a.v - b.v);
  const events = (Array.isArray(doc.factionEvents) ? doc.factionEvents : []).slice(-4).reverse();
  const section = (title, body) => `<section class="fx-ov-section"><h4>${title}</h4>${body}</section>`;
  return `
    <div class="fx-ov-head"><span class="dim small">Faction turn ${currentFactionTurn(doc)}</span>
      <span class="fx-ov-actions"><button type="button" class="btn ghost sm" data-fx-generate-one>🎲 Generate</button><button type="button" class="btn ghost sm" data-fx-new>＋ New</button></span></div>
    ${conflicts.length ? section('Escalating', conflicts.slice(0, 4).map((c) => `<div class="fx-row">⚔ <button type="button" class="entity-chip" data-entity-peek="${esc(c.id)}">${esc(c.name || 'Unnamed conflict')}</button>
      <span class="dim small">${esc((CONFLICT_STAGES[(c.stage || 1) - 1] || {}).label || '')} (${c.stage || 1}/${CONFLICT_MAX_STAGE})</span></div>`).join('')) : ''}
    ${plans.length ? section('Plans in motion', plans.slice(0, 5).map((o) => `<div class="fx-row">
      <button type="button" class="entity-chip" data-entity-peek="${esc(o.factionId)}">${esc((getEntity(doc, o.factionId) || {}).name || 'Unnamed')}</button>
      <span>${esc(o.title)}</span> <span class="dim small">${esc(progressText(o.thread))}</span>
      ${o.thread ? `<button type="button" class="btn ghost sm" data-fx-advance-project="${esc(o.thread.id)}" title="Advance: fill the next segment and reveal its Sign">${esc(verb('advance'))}</button>` : ''}
      ${currentSign(o.thread) ? `<div class="dim small fx-sign">Sign: ${esc(currentSign(o.thread))}</div>` : ''}</div>`).join('')) : ''}
    ${section('Standing with the party', `<div class="entity-chips">${byStance.map(({ f }) => factionStanceChip(doc, f)).join('')}</div>`)}
    ${events.length ? section('Recent events', events.map((e) => `<div class="fx-row dim small">• ${esc(e.factionName || 'A faction')}: ${esc(strip(e.narrative || e.action || '').slice(0, 90))}</div>`).join('')) : ''}`;
}

// --------------------------------------------------------------------------
// Directory.

function directoryHtml(doc, ui) {
  const q = String(ui.factionsSearch || '').toLowerCase();
  const factions = listEntities(doc, ['faction'])
    .filter((f) => !q || [f.name, f.factionType, f.drive, f.motivation].some((v) => String(v || '').toLowerCase().includes(q)));
  const cards = factions.map((f) => {
    const p = factionProfile(f);
    const obj = factionObjectives(doc, f.id).find((o) => o.status === 'active');
    return `<div class="fx-card">
      <div class="fx-card-head"><button type="button" class="fx-card-name" data-fx-detail="${esc(f.id)}">${esc(f.name || 'Unnamed faction')}</button>${stanceBadge(doc, f.id, 'party')}</div>
      <div class="dim small">${esc([p.factionType, p.drive && `Drive: ${p.drive}`, p.motivation].filter(Boolean).join(' · ') || 'No profile yet')}</div>
      ${obj ? `<div class="small">${esc(obj.title)} <span class="dim">${esc(progressText(obj.thread))}</span></div>` : ''}
      ${p.muted || p.paused || p.excluded ? `<div class="dim small">${[p.muted && 'muted', p.paused && 'paused', p.excluded && 'excluded'].filter(Boolean).join(' · ')}</div>` : ''}
    </div>`;
  }).join('');
  return `<div class="fx-dir-head"><input type="search" class="fx-search" data-fx-search value="${esc(ui.factionsSearch || '')}" placeholder="Search factions…" aria-label="Search factions">
    <button type="button" class="btn ghost sm" data-fx-new>＋ New</button><button type="button" class="btn ghost sm" data-fx-generate-one>🎲</button></div>
    <div class="fx-cards">${cards || '<p class="dim small">No match.</p>'}</div>`;
}

// --------------------------------------------------------------------------
// The web: a directional matrix (row regards column), a list on a phone.

function breakdownHtml(doc, fromId, toId) {
  const a = getEntity(doc, fromId);
  const toName = toId === 'party' ? 'the party' : ((getEntity(doc, toId) || {}).name || 'Unnamed');
  const blocks = ['stance', 'trust'].map((field) => {
    const bd = standingBreakdown(doc, fromId, toId, field);
    const shown = field === 'stance' ? stanceLabel(bd.value).text : `${bd.value > 0 ? '+' : ''}${bd.value}`;
    const lines = bd.lines.map((l) => `<li><span class="fx-bd-delta">${l.total > 0 ? '+' : ''}${l.total}</span> ${esc(l.reason)}${l.count > 1 ? ` <span class="dim">×${l.count}</span>` : ''}
      <span class="dim small">${l.decay !== 'none' ? `fades ${esc(l.decay)}` : ''}${Number.isFinite(l.newestAge) && l.newestAge > 0 ? ` · ${l.newestAge} turn${l.newestAge === 1 ? '' : 's'} ago` : ''}</span></li>`).join('');
    const range = field === 'stance' ? STANCE_LEVELS.map((s) => s.n) : Array.from({ length: TRUST_MAX - TRUST_MIN + 1 }, (_, i) => TRUST_MIN + i);
    return `<div class="fx-bd-block">
      <div class="fx-bd-head"><b>${field === 'stance' ? 'Stance' : 'Trust'}</b> ${esc(shown)}${bd.pinned ? ` <span class="dim small">(pinned; the Ledger says ${bd.derived > 0 ? '+' : ''}${bd.derived})</span>` : ''}</div>
      ${lines ? `<ul class="fx-bd-lines">${lines}</ul>` : '<p class="dim small">Nothing recorded yet.</p>'}
      <div class="fx-bd-actions">
        <button type="button" class="btn ghost sm" data-fx-nudge="${esc(fromId)}::${esc(toId)}::${field}::-1" title="Record a −1 change">−1</button>
        <button type="button" class="btn ghost sm" data-fx-nudge="${esc(fromId)}::${esc(toId)}::${field}::1" title="Record a +1 change">+1</button>
        <label class="small">Pin <select data-fx-pin="${esc(fromId)}::${esc(toId)}::${field}">
          <option value="">— not pinned —</option>
          ${range.map((n) => `<option value="${n}" ${bd.pinned && bd.value === n ? 'selected' : ''}>${n > 0 ? '+' : ''}${n}${field === 'stance' ? ` ${esc(stanceLabel(n).label)}` : ''}</option>`).join('')}
        </select></label>
      </div>
    </div>`;
  }).join('');
  return `<div class="fx-breakdown"><div class="fx-bd-title">How <b>${esc((a && a.name) || 'Unnamed')}</b> regards <b>${esc(toName)}</b></div>${blocks}</div>`;
}

function webHtml(doc, ui) {
  const factions = listEntities(doc, ['faction']);
  const pair = ui.factionsWebPair || '';
  const [pf, pt] = pair.split('::');
  const cell = (a, b) => {
    if (a.id === b.id) return '<td class="fx-web-self" aria-hidden="true">—</td>';
    const st = standing(doc, a.id, b.id);
    const s = stanceLabel(st.value);
    const sel = pf === a.id && pt === b.id;
    return `<td><button type="button" class="fx-web-cell fx-stance-${s.n < 0 ? 'neg' : s.n > 0 ? 'pos' : 'zero'}${sel ? ' selected' : ''}" data-fx-web-pair="${esc(a.id)}::${esc(b.id)}" title="${esc(a.name)} → ${esc(b.name)}: ${esc(s.label)}"><span>${esc(s.glyph)} ${s.n > 0 ? '+' : ''}${s.n}</span>${st.pinned ? '📌' : ''}</button></td>`;
  };
  const head = `<tr><th class="dim small">regards →</th>${factions.map((f) => `<th><span class="fx-web-col">${esc(f.name || '?')}</span></th>`).join('')}<th>Party</th></tr>`;
  const rows = factions.map((a) => `<tr><th><button type="button" class="entity-chip" data-entity-peek="${esc(a.id)}">${esc(a.name || '?')}</button></th>${factions.map((b) => cell(a, b)).join('')}${cell(a, { id: 'party', name: 'the party' })}</tr>`).join('');
  const list = [];
  for (let i = 0; i < factions.length; i += 1) {
    for (let j = i + 1; j < factions.length; j += 1) {
      const a = factions[i]; const b = factions[j];
      list.push(`<div class="fx-web-pair"><b>${esc(a.name)}</b> ${stanceBadge(doc, a.id, b.id)} → <b>${esc(b.name)}</b>
        <button type="button" class="btn ghost sm" data-fx-web-pair="${esc(a.id)}::${esc(b.id)}">Why</button><br>
        <b>${esc(b.name)}</b> ${stanceBadge(doc, b.id, a.id)} → <b>${esc(a.name)}</b>
        <button type="button" class="btn ghost sm" data-fx-web-pair="${esc(b.id)}::${esc(a.id)}">Why</button></div>`);
    }
  }
  return `<p class="dim small">Each row shows how that faction regards each column. Tap a cell for the reasons.</p>
    <div class="fx-web-matrix"><table class="fx-web">${head}${rows}</table></div>
    <div class="fx-web-list">${list.join('')}</div>
    ${pf && pt && getEntity(doc, pf) ? breakdownHtml(doc, pf, pt) : ''}`;
}

// --------------------------------------------------------------------------
// Plans and Conflicts.

function plansHtml(doc) {
  const objs = factionsState(doc).objectives.map((o) => factionObjectives(doc, o.factionId).find((x) => x.id === o.id)).filter(Boolean);
  return objs.map((o) => {
    const f = getEntity(doc, o.factionId);
    const signs = (o.thread && o.thread.signs) || [];
    return `<div class="fx-plan">
      <div class="fx-plan-head"><button type="button" class="entity-chip" data-entity-peek="${esc(o.factionId)}">${esc((f && f.name) || 'Unnamed')}</button> <b>${esc(o.title)}</b>
        <span class="dim small">${esc(o.status)} · ${esc(progressText(o.thread))}</span>
        ${o.thread && !o.thread.done ? `<button type="button" class="btn ghost sm" data-fx-advance-project="${esc(o.thread.id)}">${esc(verb('advance'))}</button>` : ''}</div>
      ${signs.length ? `<ol class="fx-signs">${signs.map((s, i) => `<li class="${i < o.thread.filled ? 'seen' : ''}">${esc(s)}</li>`).join('')}</ol>` : ''}
      ${o.collidesWith ? `<div class="dim small">Collides with ${esc((getEntity(doc, o.collidesWith.factionId) || {}).name || 'another faction')}</div>` : ''}
    </div>`;
  }).join('') || '<p class="dim small">No objectives yet.</p>';
}

function conflictsHtml(doc) {
  return listEntities(doc, ['faction-conflict']).map((c) => {
    const stage = c.stage || 1;
    const sides = (c.sides || []).map((sd) => getEntity(doc, sd.factionId)).filter(Boolean);
    return `<div class="fx-card">
      <div class="fx-card-head"><button type="button" class="fx-card-name" data-entity-peek="${esc(c.id)}">${esc(c.name || 'Unnamed conflict')}</button>
        <span class="dim small">${esc((CONFLICT_STAGES[stage - 1] || {}).label || '')} (${stage}/${CONFLICT_MAX_STAGE}) · ${esc(c.conflictStatus || 'active')}</span></div>
      <div class="fx-ladder-mini" aria-label="Stage ${stage} of ${CONFLICT_MAX_STAGE}">${CONFLICT_STAGES.map((s) => `<span class="${s.n <= stage ? 'on' : ''}"></span>`).join('')}</div>
      ${c.stakes ? `<div class="small">Stakes: ${esc(c.stakes)}</div>` : ''}
      ${sides.length ? `<div class="entity-chips">${sides.map((f) => factionStanceChip(doc, f)).join('')}</div>` : ''}
    </div>`;
  }).join('');
}

// --------------------------------------------------------------------------
// Faction detail (SRS 4.5's order; the first two sections start open).

const DETAIL_SECTIONS = [
  ['identity', 'Identity'], ['motivation', 'Motivation & Behavior'], ['faces', 'Leadership & Faces'], ['objectives', 'Objectives'],
  ['capabilities', 'Capabilities & State'], ['relationships', 'Relationships'], ['territory', 'Territory & Assets'],
  ['memory', 'Memory'], ['history', 'History'], ['controls', 'Turn controls'],
];

function textRow(id, path, label, value, placeholder = '') {
  return `<label class="fx-field"><span>${esc(label)}</span><input type="text" data-fx-profile="${esc(id)}::${path}" value="${esc(value)}" placeholder="${esc(placeholder)}"></label>`;
}

function bandSelect(id, path, label, value, bands, emptyLabel = '—') {
  return `<label class="fx-field fx-field-sm"><span>${esc(label)}</span><select data-fx-profile="${esc(id)}::${path}">
    <option value="">${esc(emptyLabel)}</option>${bands.map((b) => `<option value="${b.n}" ${value === b.n ? 'selected' : ''}>${b.n} ${esc(b.label)}</option>`).join('')}</select></label>`;
}

function detailSectionBody(doc, f, key) {
  const p = factionProfile(f);
  const id = f.id;
  const flavor = factionFlavorFor(doc.settings && doc.settings.genrePack);
  if (key === 'identity') {
    return `${textRow(id, 'factionType', 'Type', p.factionType, 'e.g. Merchant guild')}
      ${textRow(id, 'publicFace', 'Public face', p.publicFace, 'How the world sees it')}
      ${textRow(id, 'hiddenAgenda', 'Hidden agenda', p.hiddenAgenda, 'What it hides (GM only)')}
      ${textRow(id, 'origin', 'Origin', p.origin)}
      <label class="fx-field fx-field-sm"><span>Size</span><select data-fx-profile="${esc(id)}::size"><option value="">—</option>${FACTION_SIZES.map((s) => `<option value="${s.id}" ${p.size === s.id ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}</select></label>
      <label class="fx-field fx-field-sm"><span>Reach</span><select data-fx-profile="${esc(id)}::reach">${(REACH_LEVELS[flavor] || REACH_LEVELS.generic).map((r, i) => `<option value="${i}" ${p.reach === i ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></label>`;
  }
  if (key === 'motivation') {
    const axes = BEHAVIOR_AXES.map((a) => `<label class="fx-axis"><span class="dim small">${esc(a.low)}</span>
      <input type="range" min="-2" max="2" step="1" value="${p.behavior[a.key]}" data-fx-profile="${esc(id)}::behavior.${a.key}" aria-label="${esc(a.label)}: ${esc(a.low)} to ${esc(a.high)}">
      <span class="dim small">${esc(a.high)}</span><b>${p.behavior[a.key] > 0 ? '+' : ''}${p.behavior[a.key]}</b></label>`).join('');
    const methods = METHODS.map((m) => `<label class="fx-method"><input type="checkbox" data-fx-method="${esc(id)}::${m.id}" ${p.methods.includes(m.id) ? 'checked' : ''}> ${esc(m.label)}</label>`).join('');
    return `${textRow(id, 'motivation', 'Motivation', p.motivation, 'e.g. Wealth')}
      ${textRow(id, 'drive', 'Drive', p.drive, 'One word: Hoard, Purify, Expand…')}
      ${textRow(id, 'ideology', 'Ideology', p.ideology)}
      ${textRow(id, 'fear', 'Fears', p.fear)}
      ${textRow(id, 'interests', 'Interests', p.interests.join(', '), 'Comma-separated')}
      ${textRow(id, 'taboos', 'Taboos', p.taboos.join('; '), 'Semicolon-separated')}
      <div class="fx-sub">Behavior</div><div class="fx-axes">${axes}</div>
      <div class="fx-sub">Preferred methods</div><div class="fx-methods">${methods}</div>`;
  }
  if (key === 'faces') {
    const faces = p.faceIds.map((nid) => getEntity(doc, nid)).filter(Boolean);
    return `${f.leadership ? `<p class="small">${esc(strip(f.leadership))}</p>` : ''}
      <div class="entity-chips">${faces.map((n) => `<span class="fx-face"><button type="button" class="entity-chip" data-entity-peek="${esc(n.id)}">${esc(n.name || 'Unnamed')}</button><button type="button" class="icon-btn" data-fx-face-remove="${esc(id)}::${esc(n.id)}" title="Remove as a face">✕</button></span>`).join('')}</div>
      <button type="button" class="btn ghost sm" data-entity-picker-open="fx-face:${esc(id)}">＋ add a face</button>`;
  }
  if (key === 'objectives') {
    const objs = factionObjectives(doc, id);
    return objs.map((o) => `<div class="fx-plan"><b>${esc(o.title)}</b> <span class="dim small">${esc(o.status)} · ${esc(progressText(o.thread))}</span>
      ${o.thread && !o.thread.done ? `<button type="button" class="btn ghost sm" data-fx-advance-project="${esc(o.thread.id)}">${esc(verb('advance'))}</button>` : ''}
      ${currentSign(o.thread) ? `<div class="dim small">Sign: ${esc(currentSign(o.thread))}</div>` : ''}</div>`).join('')
      || '<button type="button" class="btn ghost sm" data-fx-objective-add="' + esc(id) + '">＋ add an objective</button>';
  }
  if (key === 'capabilities') {
    return `<div class="fx-bands">${CAPABILITIES.map((c) => bandSelect(id, `capabilities.${c.key}`, c.label, p.capabilities[c.key], CAPABILITY_BANDS)).join('')}</div>
      <div class="fx-sub">State</div><div class="fx-bands">${STATE_KEYS.map((s) => bandSelect(id, `state.${s.key}`, s.label, p.state[s.key], STATE_BANDS)).join('')}</div>
      <label class="fx-field fx-field-sm"><span>Attention on the party (0–9)</span><input type="number" min="0" max="9" data-fx-profile="${esc(id)}::attention" value="${p.attention}"></label>`;
  }
  if (key === 'relationships') {
    const others = listEntities(doc, ['faction']).filter((o) => o.id !== id);
    const rows = [{ id: 'party', name: 'The party' }, ...others].map((o) => `<div class="fx-rel-row">
      <span class="fx-rel-name">${o.id === 'party' ? '<b>The party</b>' : `<button type="button" class="entity-chip" data-entity-peek="${esc(o.id)}">${esc(o.name || 'Unnamed')}</button>`}</span>
      <span class="small">regards: ${stanceBadge(doc, id, o.id)}</span>
      ${o.id !== 'party' ? `<span class="small dim">is regarded: ${stanceBadge(doc, o.id, id)}</span>` : ''}
      <button type="button" class="btn ghost sm" data-fx-web-pair="${esc(id)}::${esc(o.id)}">Why</button></div>`).join('');
    return rows;
  }
  if (key === 'territory') {
    const terr = (f.relationships || []).filter((r) => TERRITORY.includes(r.type)).map((r) => ({ r, e: getEntity(doc, r.to) })).filter((x) => x.e);
    return terr.length
      ? terr.map(({ r, e }) => `<div class="fx-row"><span class="small">${esc(r.type.replace('_', ' '))}</span> <button type="button" class="entity-chip" data-entity-peek="${esc(e.id)}">${esc(e.name || 'Unnamed')}</button> <span class="dim small">${esc(entityTypeLabel(e.type))}${r.hold ? ` · ${esc(r.hold)}` : ''}</span></div>`).join('')
      : '<p class="dim small">No territory yet. Link a Location from Cast (Controls, Claims, Occupies…).</p>';
  }
  if (key === 'memory') {
    return `${p.memories.map((m) => `<div class="fx-row"><span class="small">${esc((MEMORY_KINDS.find((k) => k.id === m.kind) || {}).label || m.kind)}</span> ${esc(m.text)} <span class="dim small">turn ${m.turn}</span>
      <button type="button" class="icon-btn" data-fx-memory-remove="${esc(id)}::${esc(m.id)}" title="Forget">✕</button></div>`).join('')}
      <button type="button" class="btn ghost sm" data-fx-memory-add="${esc(id)}">＋ add a memory</button>`;
  }
  if (key === 'history') {
    const log = (Array.isArray(doc.factionEvents) ? doc.factionEvents : []).filter((e) => e.factionId === id).slice(-8).reverse();
    return log.length ? log.map((e) => `<div class="fx-row dim small">• ${esc(strip(e.narrative || e.action || '').slice(0, 120))}</div>`).join('') : '<p class="dim small">Nothing recorded yet.</p>';
  }
  if (key === 'controls') {
    const chk = (k, label, hint) => `<label class="fx-method" title="${esc(hint)}"><input type="checkbox" data-fx-flag="${esc(id)}::${k}" ${p[k] ? 'checked' : ''}> ${esc(label)}</label>`;
    return `<label class="fx-field fx-field-sm"><span>On stage</span><select data-fx-profile="${esc(id)}::stage">
        ${[['auto', 'Automatic'], ['on', 'On stage'], ['off', 'Off stage']].map(([v, l]) => `<option value="${v}" ${p.stage === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <div class="fx-methods">${chk('paused', 'Paused', 'Takes no turns until unpaused')}${chk('excluded', 'Excluded from automatic turns', 'Acts only when you run it by hand')}${chk('muted', 'Muted', 'Acts, but its routine moves stay out of the digest')}</div>`;
  }
  return '';
}

function detailHtml(doc, f, ui) {
  const open = ui.factionsOpenSections || new Set(['identity', 'motivation']);
  const pair = ui.factionsWebPair || '';
  const [pf, pt] = pair.split('::');
  const sections = DETAIL_SECTIONS.map(([key, label]) => {
    const isOpen = open.has(key);
    let body = isOpen ? detailSectionBody(doc, f, key) : '';
    if (isOpen && key === 'relationships' && pf === f.id && pt) body += breakdownHtml(doc, pf, pt);
    return `<section class="fx-section${isOpen ? ' open' : ''}">
      <button type="button" class="fx-section-head" data-fx-section-toggle="${key}" aria-expanded="${isOpen}">${isOpen ? '▾' : '▸'} ${esc(label)}</button>
      ${isOpen ? `<div class="fx-section-body">${body}</div>` : ''}
    </section>`;
  }).join('');
  return `<div class="fx-detail-head">
      <button type="button" class="btn ghost sm" data-fx-detail="" title="Back to the list">← Factions</button>
      <h3>${esc(f.name || 'Unnamed faction')}</h3>${stanceBadge(doc, f.id, 'party')}
      <button type="button" class="btn ghost sm" data-open-entity="${esc(f.id)}" title="Open the full record in Cast">Open record</button>
    </div>
    ${sections}`;
}

// --------------------------------------------------------------------------

/** The Factions panel body. `ui` carries shell.js's ephemeral state and
 *  the Faction Events options (passed straight through to History). */
export function renderFactionsPanel(doc, ui = {}) {
  const tabs = factionsPanelTabs(doc);
  const detail = ui.factionsDetailId ? getEntity(doc, ui.factionsDetailId) : null;
  let tab = tabs.some((t) => t.id === ui.factionsTab) ? ui.factionsTab : 'overview';
  if (detail) tab = 'factions';
  const strip = `<div class="fx-tabs" role="tablist">${tabs.map((t) => `<button type="button" role="tab" class="fx-tab${t.id === tab ? ' active' : ''}" aria-selected="${t.id === tab}" data-fx-tab="${t.id}">${esc(t.label)}</button>`).join('')}</div>`;
  let body = '';
  if (detail && detail.type === 'faction') body = detailHtml(doc, detail, ui);
  else if (tab === 'factions') body = directoryHtml(doc, ui);
  else if (tab === 'web') body = webHtml(doc, ui);
  else if (tab === 'plans') body = plansHtml(doc);
  else if (tab === 'conflicts') body = conflictsHtml(doc);
  else if (tab === 'history') body = `<details class="fx-classic" ${ui.factionsClassicOpen ? 'open' : ''}><summary data-fx-classic-toggle>Classic SWN turn, roster and event log</summary>${renderFactionEvents(doc, ui.factionEventsOpts || {})}</details>`;
  else body = overviewHtml(doc);
  return `<div class="fx-panel">${strip}<div class="fx-body">${body}</div></div>`;
}

// --------------------------------------------------------------------------
// The peek popover (U2): one component for every entity chip.

export function entityPeekHtml(doc, id, { pinned = false } = {}) {
  const e = getEntity(doc, id);
  if (!e) return '';
  const lines = [];
  const actions = [];
  let summary = strip(e.overview || e.revealed || '');
  if (e.type === 'faction') {
    const p = factionProfile(e);
    summary = summary || p.publicFace || strip(e.agenda);
    lines.push(`<div class="small">${esc([p.factionType, p.drive && `Drive: ${p.drive}`].filter(Boolean).join(' · '))}</div>`);
    lines.push(`<div class="small">Toward the party: ${stanceBadge(doc, e.id, 'party')}</div>`);
    const obj = factionObjectives(doc, e.id).find((o) => o.status === 'active');
    if (obj) lines.push(`<div class="small">Now: ${esc(obj.title)} <span class="dim">${esc(progressText(obj.thread))}</span></div>`);
    actions.push(`<button type="button" class="btn ghost sm" data-fx-detail-open="${esc(e.id)}">Faction page</button>`);
    if (obj && obj.thread && !obj.thread.done) actions.push(`<button type="button" class="btn ghost sm" data-fx-advance-project="${esc(obj.thread.id)}">${esc(verb('advance'))}</button>`);
  } else if (e.type === 'npc' || e.type === 'lifeform') {
    const of = (e.relationships || []).filter((r) => r.type === 'member_of').map((r) => getEntity(doc, r.to)).filter((x) => x && x.type === 'faction');
    if (of.length) lines.push(`<div class="small">Member of: ${of.map((f) => `<button type="button" class="entity-chip" data-entity-peek="${esc(f.id)}">${esc(f.name)}</button>`).join(' ')}</div>`);
  } else if (e.type === 'location') {
    const here = factionsPresentAt(doc, e.id);
    if (here.length) lines.push(`<div class="small">Factions here: <span class="entity-chips">${here.map((f) => factionStanceChip(doc, f)).join('')}</span></div>`);
  } else if (e.type === 'faction-conflict') {
    const st = e.stage || 1;
    lines.push(`<div class="small">${esc((CONFLICT_STAGES[st - 1] || {}).label || '')} (${st}/${CONFLICT_MAX_STAGE}) · ${esc(e.conflictStatus || 'active')}</div>`);
    if (e.stakes) lines.push(`<div class="small">Stakes: ${esc(e.stakes)}</div>`);
  }
  return `<div class="entity-peek-card${pinned ? ' pinned' : ''}" role="dialog" aria-label="${esc(e.name || 'Entity')}">
    <div class="entity-peek-head"><span class="dim small">${esc(entityTypeLabel(e.type))}</span><b>${esc(e.name || 'Unnamed')}</b>
      <button type="button" class="icon-btn" data-peek-pin title="${pinned ? 'Unpin' : 'Pin: keep this open'}" aria-pressed="${pinned}">📌</button>
      <button type="button" class="icon-btn" data-peek-close title="Close" aria-label="Close">✕</button></div>
    ${summary ? `<p class="entity-peek-summary small">${esc(summary.slice(0, 220))}</p>` : ''}
    ${lines.join('')}
    <div class="entity-peek-actions"><button type="button" class="btn primary sm" data-open-entity="${esc(e.id)}">Open</button>${actions.join('')}</div>
  </div>`;
}
