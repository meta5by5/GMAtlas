// shell.js — renders the cockpit from the store and wires ALL interaction
// through two delegated handlers (click + change). No per-element listeners, no
// global function reassignment, no timing hacks. Every mutation goes through a
// pure domain function via store.update().

import { store } from '../core/store.js';
import { CONTEXT_QUESTIONS } from '../core/schema.js';
import { contextSummary } from '../domain/context.js';
import { continueStory, applyStoryShift, rollOracle, addNote, patchContext, editContextText, logRoll } from '../domain/session.js';
import { addThread, advanceThread, removeThread } from '../domain/threads.js';
import { rollAction, formatRollText } from '../domain/dice.js';
import {
  createEntity, updateEntity, setEntityTags, removeEntity, setActiveEntity, addRelationship, removeRelationship,
  getEntity, setEntityStatblockKind, removeEntityStatblock, setEntityStatblockField, addEntityStatblockField, removeEntityStatblockField,
  toggleEntityStatblockFieldTrack, setEntityStatblockTrackValue,
} from '../domain/entities.js';
import { renderWorkspace } from './workspace/index.js';
import { renderCopilot } from './copilotPanel.js';
import { renderDrawer } from './drawers/index.js';

const QUESTION_LABELS = { who: 'WHO', where: 'WHERE', what: 'WHAT', why: 'WHY', how: 'HOW' };
const DRAWERS = [
  { id: 'journal', glyph: '📖', label: 'Journal' },
  { id: 'oracle', glyph: '🎲', label: 'Oracle' },
  { id: 'entities', glyph: '☷', label: 'Cast' },
  { id: 'graph', glyph: '🔗', label: 'Graph' },
  { id: 'documents', glyph: '📄', label: 'Docs' },
  { id: 'settings', glyph: '⚙', label: 'Settings' },
];

let openDrawer = null;
let copilotOpen = false;
let root = null;

export function mountShell(el) {
  root = el;
  el.innerHTML = `
    <div class="cockpit">
      <header class="mc-header">
        <div class="brand"><h1>Saga Atlas</h1><span class="tagline">Frictionless Empowerment</span></div>
        <div class="header-actions">
          <span class="campaign-title" data-open-settings title="Campaign settings"></span>
          <button class="btn ghost sm" data-continue-story title="Generate the next scene">▶ Scene</button>
        </div>
      </header>
      <nav class="mc-strip" aria-label="Context questions" data-strip role="tablist"></nav>
      <div class="mc-breadcrumb" data-breadcrumb></div>
      <main class="mc-workspace" data-workspace aria-live="polite"></main>
      <aside class="mc-copilot" data-copilot aria-label="Co-Pilot"><h2>Co-Pilot</h2><div data-copilot-body></div></aside>
      <nav class="mc-edge" aria-label="Drawers" data-edge></nav>
      <aside class="mc-drawer" data-drawer aria-label="Drawer">
        <div class="drawer-head"><h2 data-drawer-title>Drawer</h2><button class="icon-btn" data-close-drawer aria-label="Close">✕</button></div>
        <div class="mc-drawer-body" data-drawer-body></div>
      </aside>
    </div>
    <div class="toast" data-toast hidden></div>`;

  el.addEventListener('click', onClick);
  el.addEventListener('dblclick', onDblClick);
  el.addEventListener('change', onChange);
  el.addEventListener('input', onInput);
  el.addEventListener('dragstart', onDragStart);
  el.addEventListener('dragover', onDragOver);
  el.addEventListener('dragleave', onDragLeave);
  el.addEventListener('drop', onDrop);

  store.subscribe(render);
  render();
}

// ---- interaction --------------------------------------------------------
function onClick(ev) {
  const t = ev.target;
  const hit = (sel) => t.closest(sel);

  const q = hit('[data-question]');
  if (q) return store.update((d) => { d.context.active = q.dataset.question; return d; });

  const edge = hit('[data-drawer-open]');
  if (edge) return toggleDrawer(edge.dataset.drawerOpen);
  if (hit('[data-close-drawer]')) return toggleDrawer(null);
  if (hit('[data-toggle-copilot]')) { copilotOpen = !copilotOpen; return render(); }
  if (hit('[data-open-settings]')) return toggleDrawer('settings');

  if (hit('[data-continue-story]') || hit('[data-what-next]')) {
    store.update((d) => continueStory(d));
    return toast('Scene generated → Journal');
  }

  const shift = hit('[data-shift]');
  if (shift) { store.update((d) => applyStoryShift(d, shift.dataset.shift)); return toast(shift.dataset.shift); }

  const shiftPrompt = hit('[data-shift-prompt]');
  if (shiftPrompt) {
    const name = shiftPrompt.dataset.shiftPrompt;
    const val = window.prompt(name + ':', '');
    if (val != null && val.trim()) { store.update((d) => applyStoryShift(d, name, val.trim())); toast(name); }
    return;
  }

  const roll = hit('[data-roll]');
  if (roll) {
    const path = roll.dataset.roll.split('>');
    let text = '';
    store.update((d) => { const r = rollOracle(d, path); text = r.text; return r.campaign; });
    return toast('🎲 ' + text.split('\n').slice(-1)[0]);
  }

  if (hit('[data-journal-add]')) {
    const ta = root.querySelector('[data-journal-input]');
    const v = ta && ta.value.trim();
    if (v) { store.update((d) => addNote(d, v, 'Note')); toast('Note added'); }
    return;
  }
  const del = hit('[data-journal-del]');
  if (del) return store.update((d) => { d.journal = d.journal.filter((j) => j.id !== del.dataset.journalDel); return d; });

  // --- graph node → open entity inspector ---
  const gNode = hit('[data-graph-node]');
  if (gNode) { openDrawer = 'entities'; store.update((d) => setActiveEntity(d, gNode.dataset.graphNode)); return; }

  // --- entities ---
  const openEnt = hit('[data-open-entity]');
  if (openEnt) { openDrawer = 'entities'; store.update((d) => setActiveEntity(d, openEnt.dataset.openEntity)); return; }
  const addEnt = hit('[data-entity-add]');
  if (addEnt) { openDrawer = 'entities'; store.update((d) => createEntity(d, { type: addEnt.dataset.entityAdd }).campaign); toast('Entity added'); return; }
  const selEnt = hit('[data-entity-select]');
  if (selEnt) return store.update((d) => setActiveEntity(d, selEnt.dataset.entitySelect));
  const delEnt = hit('[data-entity-del]');
  if (delEnt) { store.update((d) => removeEntity(d, delEnt.dataset.entityDel)); return toast('Entity removed'); }
  const unlink = hit('[data-entity-unlink]');
  if (unlink) { const active = store.get().entities.activeId; return store.update((d) => removeRelationship(d, active, unlink.dataset.entityUnlink)); }
  if (hit('[data-entity-link-add]')) {
    const active = store.get().entities.activeId;
    const target = root.querySelector('[data-entity-link-target]');
    const label = root.querySelector('[data-entity-link-label]');
    if (active && target && target.value) { store.update((d) => addRelationship(d, active, target.value, (label && label.value.trim()) || 'linked')); toast('Linked'); }
    return;
  }

  // --- statblocks ---
  const sbAdd = hit('[data-statblock-add]');
  if (sbAdd) { const active = store.get().entities.activeId; store.update((d) => setEntityStatblockKind(d, active, sbAdd.dataset.statblockAdd)); return toast('Statblock added'); }
  if (hit('[data-statblock-remove]')) { const active = store.get().entities.activeId; store.update((d) => removeEntityStatblock(d, active)); return toast('Statblock removed'); }
  if (hit('[data-statblock-add-field]')) { const active = store.get().entities.activeId; return store.update((d) => addEntityStatblockField(d, active)); }
  if (hit('[data-statblock-add-track-field]')) { const active = store.get().entities.activeId; return store.update((d) => addEntityStatblockField(d, active, { key: 'New Track', value: 0, max: 5, track: true })); }
  const rmField = hit('[data-statblock-remove-field]');
  if (rmField) { const active = store.get().entities.activeId; return store.update((d) => removeEntityStatblockField(d, active, Number(rmField.dataset.statblockRemoveField))); }
  const toggleTrack = hit('[data-statblock-toggle-track]');
  if (toggleTrack) { const active = store.get().entities.activeId; return store.update((d) => toggleEntityStatblockFieldTrack(d, active, Number(toggleTrack.dataset.statblockToggleTrack))); }
  const trackSet = hit('[data-statblock-track-set]');
  if (trackSet) {
    const active = store.get().entities.activeId;
    const idx = Number(trackSet.dataset.statblockTrackSet);
    const n = Number(trackSet.dataset.trackN);
    return store.update((d) => setEntityStatblockTrackValue(d, active, idx, n));
  }

  if (hit('[data-thread-add]')) {
    const name = window.prompt('Thread name (e.g. "Find the medic"):', '');
    if (name != null && name.trim()) { store.update((d) => addThread(d, name.trim())); toast('Thread added'); }
    return;
  }
  const adv = hit('[data-thread-adv]');
  if (adv) return store.update((d) => advanceThread(d, adv.dataset.threadAdv, 1));
  const back = hit('[data-thread-back]');
  if (back) return store.update((d) => advanceThread(d, back.dataset.threadBack, -1));
  const tdel = hit('[data-thread-del]');
  if (tdel) return store.update((d) => removeThread(d, tdel.dataset.threadDel));

  if (hit('[data-export-campaign]')) return download(`saga-atlas-${stamp()}.json`, store.export());
  if (hit('[data-export-journal]')) return exportJournal();
  if (hit('[data-new-campaign]')) {
    if (window.confirm('Start a new campaign? Your current one stays exportable but will be replaced in this browser.')) {
      store.newCampaign(); toast('New campaign');
    }
    return;
  }
  if (hit('[data-bind-file]')) return store.bindFile().then(() => toast('Save file bound')).catch(() => {});
}

// Crew-Link-style "double-click a stat to roll": d6 + the track field's
// current value vs 2d10, filed to the Journal like any other roll.
function onDblClick(ev) {
  const rollTarget = ev.target.closest('[data-statblock-roll]');
  if (!rollTarget) return;
  ev.preventDefault();
  const idx = Number(rollTarget.dataset.statblockRoll);
  const active = store.get().entities.activeId;
  const e = getEntity(store.get(), active);
  const f = e && e.statblock && e.statblock.fields[idx];
  if (!f || !f.track) return;
  const r = rollAction(Number(f.value) || 0);
  const label = `${e.name || 'Unnamed'} — ${f.key || 'Stat'}`;
  store.update((d) => logRoll(d, formatRollText(label, r)));
  toast(`🎲 ${r.outcomeLabel} — ${r.total} vs ${r.challenge1}, ${r.challenge2}${r.match ? ' (match)' : ''}`);
}

function onChange(ev) {
  const t = ev.target;
  const ctx = t.closest('[data-ctx]');
  if (ctx) {
    const [key, field] = ctx.dataset.ctx.split('.');
    // Free-text fields route through editContextText so @mentions auto-link.
    if (t.tagName === 'TEXTAREA') return store.update((d) => editContextText(d, key, field, t.value));
    return store.update((d) => patchContext(d, key, { [field]: t.value }));
  }

  const ef = t.closest('[data-entity-field]');
  if (ef) {
    const active = store.get().entities.activeId;
    const field = ef.dataset.entityField;
    if (field === 'tags') return store.update((d) => setEntityTags(d, active, t.value));
    return store.update((d) => updateEntity(d, active, { [field]: t.value }));
  }

  const skey = t.closest('[data-statblock-key]');
  if (skey) { const active = store.get().entities.activeId; return store.update((d) => setEntityStatblockField(d, active, Number(skey.dataset.statblockKey), { key: t.value })); }
  const sval = t.closest('[data-statblock-val]');
  if (sval) { const active = store.get().entities.activeId; return store.update((d) => setEntityStatblockField(d, active, Number(sval.dataset.statblockVal), { value: t.value })); }

  const num = t.closest('[data-ctx-num]');
  if (num) { const [key, field] = num.dataset.ctxNum.split('.'); return store.update((d) => patchContext(d, key, { [field]: Number(t.value) })); }

  if (t.closest('[data-campaign-title-input]')) return store.update((d) => { d.meta.title = t.value; return d; });
  if (t.closest('[data-genre-input]')) return store.update((d) => { d.settings.genre = t.value; return d; });

  if (t.closest('[data-import-campaign]')) {
    const file = t.files && t.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try { store.import(reader.result); toast('Campaign imported'); } catch (e) { toast('Import failed'); } };
    reader.readAsText(file);
    return;
  }
}

// Live feedback that must NOT trigger a full re-render (keeps focus/caret).
function onInput(ev) {
  const t = ev.target;
  const num = t.closest('[data-ctx-num]');
  if (num) { const lbl = num.previousElementSibling || num.parentElement.querySelector('.metric'); if (lbl && lbl.classList.contains('metric')) lbl.textContent = `${t.value}/10`; return; }

  const of = t.closest('[data-oracle-filter]');
  if (of) { oracleFilter = t.value; renderDrawerBody(); restoreFocus('[data-oracle-filter]'); }
}

let oracleFilter = '';

function toggleDrawer(id) { openDrawer = openDrawer === id ? null : id; if (openDrawer === 'oracle') oracleFilter = ''; render(); }

// ---- drag-and-drop: entity → entity (relate) or entity → text (mention) --
// Native HTML5 DnD, delegated at the root like everything else. A custom
// MIME type keeps this from reacting to unrelated drags (e.g. file drops).
const ENTITY_DRAG_TYPE = 'application/x-saga-entity';

function onDragStart(ev) {
  const src = ev.target.closest('[data-drag-entity]');
  if (!src) return;
  ev.dataTransfer.setData(ENTITY_DRAG_TYPE, src.dataset.dragEntity);
  ev.dataTransfer.effectAllowed = 'link';
}

function onDragOver(ev) {
  if (!ev.dataTransfer.types.includes(ENTITY_DRAG_TYPE)) return;
  const target = ev.target.closest('[data-drop-entity], [data-journal-input], textarea[data-ctx]');
  if (target) { ev.preventDefault(); target.classList.add('drop-hover'); }
}

function onDragLeave(ev) {
  const target = ev.target.closest('.drop-hover');
  if (target) target.classList.remove('drop-hover');
}

function onDrop(ev) {
  const id = ev.dataTransfer.getData(ENTITY_DRAG_TYPE);
  if (!id) return;

  const dropEnt = ev.target.closest('[data-drop-entity]');
  if (dropEnt) {
    ev.preventDefault();
    dropEnt.classList.remove('drop-hover');
    const targetId = dropEnt.dataset.dropEntity;
    if (targetId && targetId !== id) { store.update((d) => addRelationship(d, id, targetId, 'linked')); toast('Linked'); }
    return;
  }

  const dropText = ev.target.closest('[data-journal-input], textarea[data-ctx]');
  if (dropText) {
    ev.preventDefault();
    dropText.classList.remove('drop-hover');
    const ent = getEntity(store.get(), id);
    if (ent) {
      const name = ent.name || 'Unnamed';
      insertAtCursor(dropText, (/\s/.test(name) ? `@[${name}] ` : `@${name} `));
      dropText.dispatchEvent(new Event('change', { bubbles: true }));
      toast(`Mentioned ${name}`);
    }
  }
}

function insertAtCursor(field, text) {
  const start = field.selectionStart != null ? field.selectionStart : field.value.length;
  const end = field.selectionEnd != null ? field.selectionEnd : field.value.length;
  field.value = field.value.slice(0, start) + text + field.value.slice(end);
  const pos = start + text.length;
  try { field.setSelectionRange(pos, pos); } catch { /* not a text field with selection support */ }
  field.focus();
}

// ---- rendering ----------------------------------------------------------
function render() {
  const doc = store.get();
  if (!doc || !root) return;

  root.querySelector('.campaign-title').textContent = doc.meta.title;

  const strip = root.querySelector('[data-strip]');
  strip.innerHTML = CONTEXT_QUESTIONS.map((k) => {
    const sel = doc.context.active === k;
    return `<button class="mc-q" data-question="${k}" role="tab" aria-selected="${sel}">
      <span class="q-key">${QUESTION_LABELS[k]}</span>
      <span class="q-val">${escapeHtml(contextSummary(doc.context, k)) || '—'}</span>
    </button>`;
  }).join('');

  const bc = root.querySelector('[data-breadcrumb]');
  const crumbs = doc.timeline.length ? doc.timeline : [{ label: doc.meta.title }, { label: `Scene ${doc.scenes.length}` }];
  bc.innerHTML = crumbs.map((c, i) => `${i ? '<span class="sep">▸</span>' : ''}<span class="crumb">${escapeHtml(c.label || '')}</span>`).join(' ');

  root.querySelector('[data-workspace]').innerHTML = renderWorkspace(doc, doc.context.active);
  root.querySelector('[data-copilot-body]').innerHTML = renderCopilot(doc);
  root.querySelector('[data-copilot]').dataset.open = String(copilotOpen);

  const linkCount = Math.round(((doc.entities.items || []).reduce((s, e) => s + ((e.relationships || []).length), 0)) / 2);
  const badges = { journal: doc.journal.length || '', entities: (doc.entities.items || []).length || '', graph: linkCount || '' };
  const edge = root.querySelector('[data-edge]');
  edge.innerHTML = DRAWERS.map((d) => {
    const badge = badges[d.id] || '';
    return `<button data-drawer-open="${d.id}" aria-expanded="${openDrawer === d.id}" title="${d.label}">
      <span class="glyph">${d.glyph}</span><b>${d.label}</b>${badge ? `<span class="badge">${badge}</span>` : ''}
    </button>`;
  }).join('') + `<button data-toggle-copilot title="Co-Pilot"><span class="glyph">💡</span><b>Co-Pilot</b></button>`;

  const drawer = root.querySelector('[data-drawer]');
  drawer.dataset.open = String(!!openDrawer);
  const meta = DRAWERS.find((d) => d.id === openDrawer);
  drawer.querySelector('[data-drawer-title]').textContent = meta ? meta.label : 'Drawer';
  drawer.style.setProperty('--drawer-w', (doc.drawers.widths[openDrawer] || 420) + 'px');
  renderDrawerBody();
}

function renderDrawerBody() {
  const doc = store.get();
  const body = root && root.querySelector('[data-drawer-body]');
  if (body) body.innerHTML = openDrawer ? renderDrawer(openDrawer, doc, oracleFilter) : '';
}

// ---- helpers ------------------------------------------------------------
function toast(msg) {
  const el = root.querySelector('[data-toast]');
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.classList.remove('show'); el.hidden = true; }, 2200);
}

function restoreFocus(sel) {
  const el = root.querySelector(sel);
  if (el) { const v = el.value; el.focus(); try { el.setSelectionRange(v.length, v.length); } catch {} }
}

function exportJournal() {
  const doc = store.get();
  const text = (doc.journal || []).map((e) => `${new Date(e.createdAt).toLocaleString()} — ${e.source}\n${stripHtml(e.text)}`).join('\n\n');
  download(`saga-atlas-journal-${stamp()}.txt`, text || 'No journal entries.');
}

function download(name, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function stamp() { return new Date().toISOString().slice(0, 19).replace(/:/g, '-'); }
function stripHtml(s) { return String(s || '').replace(/<[^>]+>/g, ''); }
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
