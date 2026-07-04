// shell.js — renders the cockpit from the store and wires ALL interaction
// through two delegated handlers (click + change). No per-element listeners, no
// global function reassignment, no timing hacks. Every mutation goes through a
// pure domain function via store.update().

import { store } from '../core/store.js';
import { CONTEXT_QUESTIONS } from '../core/schema.js';
import { contextSummary } from '../domain/context.js';
import { continueStory, applyStoryShift, rollOracle, addNote, patchContext, editContextText, logRoll, generateNpc } from '../domain/session.js';
import { addOracleEntry, updateOracleEntry, removeOracleEntry, resetOracleTable } from '../domain/oracles.js';
import { addThread, advanceThread, removeThread, setThreadStatus, setThreadPriority } from '../domain/threads.js';
import { rollAction, formatRollText, rollFlat, formatFlatRollText, rollTraveller, formatTravellerRollText } from '../domain/dice.js';
import {
  createEntity, updateEntity, addEntityTag, removeEntityTag, removeEntity, setActiveEntity, addRelationship, removeRelationship,
  getEntity, addEntityStatblockGroup, removeEntityStatblockGroup, setEntityStatblockField, addEntityStatblockField, removeEntityStatblockField,
  setEntityStatblockTrackValue, setEntityStatblockAttributeValue, updateRelationshipLabel, updateRelationshipType, updateRelationshipStrength,
} from '../domain/entities.js';
import {
  addDocument, updateDocument, removeDocument, getDocument, addDocumentTag, removeDocumentTag, renameDocument,
  openDocumentTab, closeDocumentTab, setActiveDocumentTab, resolveDocumentTab,
  listReferenceDocuments, renameRefDocument, addRefDocumentTag, removeRefDocumentTag,
} from '../domain/documents.js';
import { addPartyTracker, updatePartyTracker, stepPartyTracker, removePartyTracker } from '../domain/party.js';
import { setColonyField, addCrewRow, updateCrewRow, removeCrewRow } from '../domain/colony.js';
import { setGuideText } from '../domain/guide.js';
import { buildSessionRecap, formatSessionRecap } from '../domain/recap.js';
import { addTemplateSystem, addTemplateField, updateTemplateField, removeTemplateField, moveTemplateField } from '../domain/statblockTemplates.js';
import { universalSearch } from '../domain/search.js';
import { renderWorkspace } from './workspace/index.js';
import { renderCopilot } from './copilotPanel.js';
import { renderDrawer, formatBytes } from './drawers/index.js';
import { renderSearchPanel } from './searchPanel.js';

const QUESTION_LABELS = { who: 'WHO', where: 'WHERE', what: 'WHAT', why: 'WHY', how: 'HOW' };
// localStorage's shared per-origin quota is commonly 5-10MB for the WHOLE
// campaign document, not just one file — 5MB of raw file (~6.7MB once
// base64-encoded) is a conservative line under that, leaving room for the
// rest of the campaign and any other embedded uploads. Large, static
// rulebooks (the ones already in assets/docs/, several 20-60MB) belong in
// the Reference Library instead, which has no such limit.
const MAX_DOC_UPLOAD_BYTES = 5 * 1024 * 1024;
const DRAWERS = [
  { id: 'journal', glyph: '📖', label: 'Journal' },
  { id: 'oracle', glyph: '🎲', label: 'Oracle' },
  { id: 'entities', glyph: '☷', label: 'Cast' },
  { id: 'party', glyph: '👥', label: 'Party' },
  { id: 'colony', glyph: '🏛', label: 'Colony' },
  { id: 'guide', glyph: '📘', label: 'Guide' },
  { id: 'graph', glyph: '🔗', label: 'Graph' },
  { id: 'documents', glyph: '📄', label: 'Docs' },
  { id: 'settings', glyph: '⚙', label: 'Settings' },
];

// Tabbed drawer switching (2026-07-04 design review): multiple drawers can
// be pinned open at once (openDrawers), with one visible at a time
// (activeDrawer) — the founding brief wanted "drawers stack side by side";
// tabs were chosen as the tractable version of that (switch instantly
// between an already-open Journal and Oracle without losing either's
// scroll/filter state) without the layout complexity of true multi-pane
// side-by-side panels competing with the Co-Pilot/doc-viewer regions.
let openDrawers = [];
let activeDrawer = null;
let copilotOpen = false;
let root = null;
let oracleFilter = '';
let expandedOracleGroups = new Set(); // ephemeral UI state — never persisted
let docFilter = '';
let docTagFilters = new Set();
let docTagEditorOpen = new Set(); // ephemeral — which doc/ref cards' tag editors are expanded
let statblockAddOpen = false; // ephemeral — collapses the "+ Add a statblock" chip row behind a gear icon
let recapOpen = false; // ephemeral — collapses the "Previously on..." session recap panel
let castListCollapsed = false; // ephemeral — hides the Cast drawer's entity list, leaving just the active entity's inspector
let searchOpen = false; // ephemeral — Universal Search overlay
let searchQuery = '';
let oracleEditorOpen = new Set(); // ephemeral — which oracle tables' entry editors are expanded
let entitySearch = ''; // ephemeral — Cast drawer name/tag search
let entityTypeFilter = ''; // ephemeral — Cast drawer type filter ('' = all)

export function mountShell(el) {
  root = el;
  el.innerHTML = `
    <div class="cockpit">
      <header class="mc-header">
        <div class="brand"><h1>GMAtlas</h1><span class="tagline">Frictionless Empowerment</span></div>
        <div class="header-actions">
          <button class="btn ghost sm" data-search-toggle title="Search everything (Cast, Journal, Oracle, Documents, Party, Colony) — Ctrl/Cmd+K">🔍 Search</button>
          <span class="campaign-title" data-open-settings title="Campaign settings"></span>
          <button class="btn ghost sm" data-continue-story title="Generate the next scene">▶ Scene</button>
        </div>
      </header>
      <nav class="mc-strip" aria-label="Context questions" data-strip role="tablist"></nav>
      <div class="mc-breadcrumb" data-breadcrumb></div>
      <main class="mc-workspace" data-workspace aria-live="polite"></main>
      <aside class="mc-copilot" data-copilot aria-label="Co-Pilot"><h2>Co-Pilot</h2><div data-copilot-body></div></aside>
      <div class="mc-doc-viewer" data-doc-viewer hidden>
        <div class="doc-viewer-tabs" data-doc-viewer-tabs></div>
        <div class="doc-viewer-empty" data-doc-viewer-empty hidden></div>
        <iframe data-doc-viewer-frame title="Document viewer"></iframe>
      </div>
      <div class="mc-search-overlay" data-search-overlay hidden aria-label="Universal Search">
        <div class="search-panel">
          <div class="search-panel-head">
            <input type="text" class="search-input" data-search-input placeholder="Search everything…" autocomplete="off">
            <button class="icon-btn" data-search-close aria-label="Close search">✕</button>
          </div>
          <div class="search-results" data-search-results></div>
        </div>
      </div>
      <nav class="mc-edge" aria-label="Drawers" data-edge></nav>
      <aside class="mc-drawer" data-drawer aria-label="Drawer">
        <div class="drawer-tabs" data-drawer-tabs></div>
        <div class="drawer-head"><h2 data-drawer-title>Drawer</h2><button class="icon-btn" data-close-drawer aria-label="Close">✕</button></div>
        <div class="mc-drawer-body" data-drawer-body></div>
      </aside>
    </div>
    <div class="toast" data-toast hidden></div>`;

  el.addEventListener('click', guarded(onClick));
  el.addEventListener('dblclick', guarded(onDblClick));
  el.addEventListener('change', guarded(onChange));
  el.addEventListener('input', guarded(onInput));
  el.addEventListener('dragstart', onDragStart);
  el.addEventListener('dragover', onDragOver);
  el.addEventListener('dragleave', onDragLeave);
  el.addEventListener('drop', onDrop);
  // Touch equivalent of the drag-and-drop above (see onTouchStart's comment)
  // — touchmove is NOT passive because it conditionally calls
  // preventDefault() once a drag actually engages, to stop the page from
  // scrolling under the finger while mid-drag; before that threshold, nothing
  // is prevented and an ordinary scroll/tap behaves exactly as it always did.
  el.addEventListener('touchstart', onTouchStart, { passive: true });
  el.addEventListener('touchmove', onTouchMove, { passive: false });
  el.addEventListener('touchend', onTouchEnd);
  el.addEventListener('touchcancel', onTouchEnd);
  // A small, deliberately short set (2026-07-04 review: "add shortcuts when
  // non-disruptive") — two near-universal conventions rather than a bound
  // shortcut for every action. On document, not root: Escape/Ctrl+K should
  // work regardless of what currently has focus, the same way they do in
  // comparable tools (VSCode, Slack, GitHub, Linear all bind Ctrl/Cmd+K to
  // search-like actions; Escape universally backs out of an overlay).
  document.addEventListener('keydown', guarded(onKeydown));

  // Safety net, not a new interaction route: every text/number field here
  // only commits on 'change' (fires on blur), so typing a value and then
  // refreshing/closing/switching tabs WITHOUT clicking away first silently
  // dropped the edit — the exact bug reported for statblock attribute values
  // and freshly-added statblock groups' fields. Blurring the focused field
  // fires its pending 'change' synchronously through the existing handler
  // above, so this reuses that logic rather than adding a second commit path.
  const flushFocusedField = () => {
    const el2 = document.activeElement;
    if (el2 && el2 !== document.body && typeof el2.blur === 'function') el2.blur();
  };
  window.addEventListener('beforeunload', flushFocusedField);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushFocusedField(); });

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
  if (hit('[data-close-drawer]')) return closeDrawerTab(activeDrawer);
  // Check the nested close ✕ before the tab button it sits inside — both
  // match `[data-drawer-tab]` via closest() otherwise (the ✕'s parent
  // button carries that attribute too), so close would never be reachable.
  const drawerTabClose = hit('[data-drawer-tab-close]');
  if (drawerTabClose) return closeDrawerTab(drawerTabClose.dataset.drawerTabClose);
  const drawerTab = hit('[data-drawer-tab]');
  if (drawerTab) { activeDrawer = drawerTab.dataset.drawerTab; return render(); }
  if (hit('[data-toggle-copilot]')) { copilotOpen = !copilotOpen; return render(); }
  if (hit('[data-open-settings]')) return toggleDrawer('settings');

  // --- Phase 9: Activity -> Rules Lens suggestion, apply as default ruleset ---
  const applyRuleset = hit('[data-apply-ruleset]');
  if (applyRuleset) {
    const id = applyRuleset.dataset.applyRuleset;
    store.update((d) => { d.settings.statRuleset = id; return d; });
    return toast(`Default ruleset set to ${id}`);
  }

  // --- Universal Search (Phase 8) ---
  if (hit('[data-search-toggle]')) {
    searchOpen = !searchOpen;
    if (!searchOpen) { searchQuery = ''; const inp = root.querySelector('[data-search-input]'); if (inp) inp.value = ''; }
    renderSearchOverlay();
    if (searchOpen) { const inp = root.querySelector('[data-search-input]'); if (inp) inp.focus(); }
    return;
  }
  if (hit('[data-search-close]')) {
    searchOpen = false; searchQuery = '';
    const inp = root.querySelector('[data-search-input]'); if (inp) inp.value = '';
    return renderSearchOverlay();
  }
  const searchResult = hit('[data-search-result]');
  if (searchResult) {
    const idx = Number(searchResult.dataset.searchResult);
    const item = universalSearch(store.get(), searchQuery)[idx];
    searchOpen = false; searchQuery = '';
    const inp = root.querySelector('[data-search-input]'); if (inp) inp.value = '';
    if (item && item.target) {
      const target = item.target;
      openDrawerTab(target.drawer);
      if (target.drawer === 'oracle') oracleFilter = target.oracleFilterText || '';
      if (target.entityId) store.update((d) => setActiveEntity(d, target.entityId));
      else if (target.docTabKey) store.update((d) => openDocumentTab(d, target.docTabKey));
      else render();
    } else render();
    return;
  }

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

  if (hit('[data-recap-toggle]')) { recapOpen = !recapOpen; return renderDrawerBody(); }
  if (hit('[data-cast-list-toggle]')) { castListCollapsed = !castListCollapsed; return renderDrawerBody(); }
  const typeFilterBtn = hit('[data-entity-type-filter]');
  if (typeFilterBtn) { entityTypeFilter = typeFilterBtn.dataset.entityTypeFilter; return renderDrawerBody(); }
  if (hit('[data-recap-save]')) {
    store.update((d) => addNote(d, formatSessionRecap(buildSessionRecap(d)), 'Session Recap'));
    return toast('Recap saved to Journal');
  }

  // --- graph node → open entity inspector ---
  const gNode = hit('[data-graph-node]');
  if (gNode) { openDrawerTab('entities'); store.update((d) => setActiveEntity(d, gNode.dataset.graphNode)); return; }

  // --- entities ---
  const openEnt = hit('[data-open-entity]');
  if (openEnt) { openDrawerTab('entities'); store.update((d) => setActiveEntity(d, openEnt.dataset.openEntity)); return; }
  const addEnt = hit('[data-entity-add]');
  if (addEnt) { openDrawerTab('entities'); store.update((d) => createEntity(d, { type: addEnt.dataset.entityAdd }).campaign); toast('Entity added'); return; }
  if (hit('[data-generate-npc]')) {
    openDrawerTab('entities');
    let name = '';
    store.update((d) => { const r = generateNpc(d); name = r.id && getEntity(r.campaign, r.id) ? getEntity(r.campaign, r.id).name : ''; return r.campaign; });
    return toast(name ? `Generated ${name}` : 'NPC generated');
  }
  const selEnt = hit('[data-entity-select]');
  if (selEnt) return store.update((d) => setActiveEntity(d, selEnt.dataset.entitySelect));
  const delEnt = hit('[data-entity-del]');
  if (delEnt) { store.update((d) => removeEntity(d, delEnt.dataset.entityDel)); return toast('Entity removed'); }
  const unlink = hit('[data-entity-unlink]');
  if (unlink) { const active = store.get().entities.activeId; return store.update((d) => removeRelationship(d, active, unlink.dataset.entityUnlink)); }
  const entTagRemove = hit('[data-entity-tag-remove]');
  if (entTagRemove) { const active = store.get().entities.activeId; return store.update((d) => removeEntityTag(d, active, entTagRemove.dataset.entityTagRemove)); }
  const entTagNew = hit('[data-entity-tag-new]');
  if (entTagNew) {
    const name = window.prompt('New tag:', '');
    if (name != null && name.trim()) {
      const active = store.get().entities.activeId;
      store.update((d) => addEntityTag(d, active, name.trim()));
    }
    return;
  }
  if (hit('[data-entity-link-add]')) {
    const active = store.get().entities.activeId;
    const target = root.querySelector('[data-entity-link-target]');
    const label = root.querySelector('[data-entity-link-label]');
    const type = root.querySelector('[data-entity-link-type]');
    if (active && target && target.value) { store.update((d) => addRelationship(d, active, target.value, (label && label.value.trim()) || 'linked', type && type.value)); toast('Linked'); }
    return;
  }

  // --- statblocks: add/remove whole groups; a group's own fields are only
  // ever value-edited from the entity view — shape/name/kind is Settings'
  // job (see drawers/index.js statblockGroupBlock). ------------------------
  const sbAdd = hit('[data-statblock-add]');
  if (sbAdd) {
    const active = store.get().entities.activeId;
    const kind = sbAdd.dataset.statblockAdd;
    const rulesetOrTemplateId = sbAdd.dataset.statblockRuleset || sbAdd.dataset.statblockTemplate;
    store.update((d) => addEntityStatblockGroup(d, active, kind, rulesetOrTemplateId));
    return toast('Statblock added');
  }
  const rmGroup = hit('[data-statblock-remove-group]');
  if (rmGroup) {
    const active = store.get().entities.activeId;
    store.update((d) => removeEntityStatblockGroup(d, active, Number(rmGroup.dataset.statblockRemoveGroup)));
    return toast('Statblock removed');
  }
  const sbAddField = hit('[data-statblock-add-field]');
  if (sbAddField) {
    const gi = Number(sbAddField.dataset.statblockAddField);
    const name = window.prompt('Field name:', '');
    if (name == null) return;
    const active = store.get().entities.activeId;
    return store.update((d) => addEntityStatblockField(d, active, gi, { key: name.trim() || 'New Field', value: '' }));
  }
  const sbAddTrack = hit('[data-statblock-add-track-field]');
  if (sbAddTrack) {
    const gi = Number(sbAddTrack.dataset.statblockAddTrackField);
    const name = window.prompt('Track name:', '');
    if (name == null) return;
    const active = store.get().entities.activeId;
    return store.update((d) => addEntityStatblockField(d, active, gi, { key: name.trim() || 'New Track', value: 0, max: 5, track: true }));
  }
  const trackSet = hit('[data-statblock-track-set]');
  if (trackSet) {
    const active = store.get().entities.activeId;
    const [gi, fi] = trackSet.dataset.statblockTrackSet.split('::').map(Number);
    const n = Number(trackSet.dataset.trackN);
    return store.update((d) => setEntityStatblockTrackValue(d, active, gi, fi, n));
  }
  const rollLabel = hit('[data-statblock-roll-label]');
  if (rollLabel) {
    const [gi, fi] = rollLabel.dataset.statblockRollLabel.split('::').map(Number);
    const active = store.get().entities.activeId;
    const e = getEntity(store.get(), active);
    const group = e && e.statblocks && e.statblocks[gi];
    const f = group && group.fields[fi];
    if (f) performFieldRoll(f, `${e.name || 'Unnamed'} — ${f.key || 'Stat'}`);
    return;
  }
  if (hit('[data-statblock-add-toggle]')) { statblockAddOpen = !statblockAddOpen; return renderDrawerBody(); }

  // --- oracle: collapsible groups + roll-whole-group -----------------------
  const oracleToggle = hit('[data-oracle-toggle]');
  if (oracleToggle) {
    const key = oracleToggle.dataset.oracleToggle;
    if (expandedOracleGroups.has(key)) expandedOracleGroups.delete(key); else expandedOracleGroups.add(key);
    return renderDrawerBody();
  }
  if (hit('[data-oracle-collapse-all]')) { expandedOracleGroups = new Set(); return renderDrawerBody(); }
  const rollGroupBtn = hit('[data-roll-group]');
  if (rollGroupBtn) {
    const path = rollGroupBtn.dataset.rollGroup.split('>');
    let text = '';
    store.update((d) => { const r = rollOracle(d, path, { group: true }); text = r.text; return r.campaign; });
    return toast('🎲 ' + text.split('\n').slice(-1)[0]);
  }

  // --- oracle: table entry editor (Phase 8) --------------------------------
  const oracleEditToggle = hit('[data-oracle-edit-toggle]');
  if (oracleEditToggle) {
    const key = oracleEditToggle.dataset.oracleEditToggle;
    if (oracleEditorOpen.has(key)) oracleEditorOpen.delete(key); else oracleEditorOpen.add(key);
    return renderDrawerBody();
  }
  const oracleEntryRemove = hit('[data-oracle-entry-remove]');
  if (oracleEntryRemove) {
    const [key, idx] = oracleEntryRemove.dataset.oracleEntryRemove.split('::');
    store.update((d) => removeOracleEntry(d, key.split('>'), Number(idx)));
    return renderDrawerBody();
  }
  const oracleEntryAdd = hit('[data-oracle-entry-add]');
  if (oracleEntryAdd) {
    const key = oracleEntryAdd.dataset.oracleEntryAdd;
    const input = oracleEntryAdd.previousElementSibling; // the sibling <input data-oracle-entry-new>
    const value = input && input.matches('[data-oracle-entry-new]') ? input.value.trim() : '';
    if (value) store.update((d) => addOracleEntry(d, key.split('>'), value));
    return renderDrawerBody();
  }
  const oracleReset = hit('[data-oracle-reset]');
  if (oracleReset) {
    const key = oracleReset.dataset.oracleReset;
    store.update((d) => resetOracleTable(d, key.split('>')));
    return renderDrawerBody();
  }

  // --- party ---
  if (hit('[data-party-tracker-add]')) {
    const name = window.prompt('Tracker name (e.g. "Credits", "Supply"):', '');
    if (name != null && name.trim()) { store.update((d) => addPartyTracker(d, { name: name.trim() })); toast('Tracker added'); }
    return;
  }
  const trkDel = hit('[data-party-tracker-remove]');
  if (trkDel) return store.update((d) => removePartyTracker(d, trkDel.dataset.partyTrackerRemove));
  const trkStep = hit('[data-party-tracker-step]');
  if (trkStep) return store.update((d) => stepPartyTracker(d, trkStep.dataset.partyTrackerStep, Number(trkStep.dataset.delta)));

  // --- colony ---
  if (hit('[data-colony-crew-add]')) { store.update((d) => addCrewRow(d, {})); return toast('Crew row added'); }
  const crewDel = hit('[data-colony-crew-remove]');
  if (crewDel) return store.update((d) => removeCrewRow(d, crewDel.dataset.colonyCrewRemove));

  // --- guide ---
  const guideSave = hit('[data-guide-save]');
  if (guideSave) {
    const ta = root.querySelector('[data-guide-input]');
    if (ta) { store.update((d) => setGuideText(d, ta.value)); toast('Guide saved'); }
    return;
  }

  // --- documents: open (viewer tabs), rename, tags ---------------------------
  const docOpen = hit('[data-doc-open]');
  if (docOpen) {
    if (docOpen.dataset.docOpen.startsWith('lib:')) {
      const entry = getDocument(store.get(), docOpen.dataset.docOpen.slice(4));
      if (entry && entry.kind !== 'file') { toast('Text notes open inline below — not a PDF file.'); return; }
    }
    const page = docOpen.dataset.docOpenPage ? Number(docOpen.dataset.docOpenPage) : undefined;
    store.update((d) => openDocumentTab(d, docOpen.dataset.docOpen, page));
    return;
  }
  const tabClose = hit('[data-doc-viewer-tab-close]');
  if (tabClose) { store.update((d) => closeDocumentTab(d, tabClose.dataset.docViewerTabClose)); return; }
  const tabSwitch = hit('[data-doc-viewer-tab]');
  if (tabSwitch) { store.update((d) => setActiveDocumentTab(d, tabSwitch.dataset.docViewerTab)); return; }
  const docRename = hit('[data-doc-rename]');
  if (docRename) {
    const id = docRename.dataset.docRename;
    const entry = getDocument(store.get(), id);
    const name = window.prompt('Rename document:', entry ? entry.title : '');
    if (name != null && name.trim()) { store.update((d) => renameDocument(d, id, name.trim())); toast('Renamed'); }
    return;
  }
  const refRename = hit('[data-ref-rename]');
  if (refRename) {
    const key = refRename.dataset.refRename;
    const current = listReferenceDocuments(store.get()).find((r) => r.key === key);
    const name = window.prompt('Rename entry (display name only — the file itself is untouched):', current ? current.title : '');
    if (name != null && name.trim()) { store.update((d) => renameRefDocument(d, key, name.trim())); toast('Renamed'); }
    return;
  }
  const tagToggle = hit('[data-doc-tag-toggle]');
  if (tagToggle) {
    const key = tagToggle.dataset.docTagToggle;
    if (docTagEditorOpen.has(key)) docTagEditorOpen.delete(key); else docTagEditorOpen.add(key);
    return renderDrawerBody();
  }
  const tagAdd = hit('[data-doc-tag-add]');
  if (tagAdd) {
    const id = tagAdd.dataset.docTagAdd;
    const input = root.querySelector(`[data-doc-tag-input="${id}"]`);
    if (input && input.value.trim()) { store.update((d) => addDocumentTag(d, id, input.value.trim())); input.value = ''; }
    return;
  }
  const tagRemove = hit('[data-doc-tag-remove]');
  if (tagRemove) {
    const [id, tag] = tagRemove.dataset.docTagRemove.split('::');
    return store.update((d) => removeDocumentTag(d, id, tag));
  }
  const refTagAdd = hit('[data-ref-tag-add]');
  if (refTagAdd) {
    const key = refTagAdd.dataset.refTagAdd;
    const input = root.querySelector(`[data-ref-tag-input="${key}"]`);
    if (input && input.value.trim()) { store.update((d) => addRefDocumentTag(d, key, input.value.trim())); input.value = ''; }
    return;
  }
  const refTagRemove = hit('[data-ref-tag-remove]');
  if (refTagRemove) {
    const [key, tag] = refTagRemove.dataset.refTagRemove.split('::');
    return store.update((d) => removeRefDocumentTag(d, key, tag));
  }
  const tagFilter = hit('[data-doc-tag-filter]');
  if (tagFilter) {
    const tag = tagFilter.dataset.docTagFilter;
    if (docTagFilters.has(tag)) docTagFilters.delete(tag); else docTagFilters.add(tag);
    return renderDrawerBody();
  }

  // --- settings: Bestiary statblock templates -------------------------------
  if (hit('[data-tpl-system-add]')) {
    const label = window.prompt('New game system name (e.g. "D&D 5e"):', '');
    if (label != null && label.trim()) { store.update((d) => addTemplateSystem(d, label.trim(), label.trim())); toast('System added'); }
    return;
  }
  const tplFieldAdd = hit('[data-tpl-field-add]');
  if (tplFieldAdd) return store.update((d) => addTemplateField(d, tplFieldAdd.dataset.tplFieldAdd));
  const tplFieldRemove = hit('[data-tpl-field-remove]');
  if (tplFieldRemove) {
    const [sys, idx] = tplFieldRemove.dataset.tplFieldRemove.split('::');
    return store.update((d) => removeTemplateField(d, sys, Number(idx)));
  }
  const tplFieldUp = hit('[data-tpl-field-up]');
  if (tplFieldUp) {
    const [sys, idx] = tplFieldUp.dataset.tplFieldUp.split('::');
    return store.update((d) => moveTemplateField(d, sys, Number(idx), -1));
  }
  const tplFieldDown = hit('[data-tpl-field-down]');
  if (tplFieldDown) {
    const [sys, idx] = tplFieldDown.dataset.tplFieldDown.split('::');
    return store.update((d) => moveTemplateField(d, sys, Number(idx), 1));
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

  const docAdd = hit('[data-doc-add]');
  if (docAdd) {
    const title = window.prompt('Document title:', '');
    if (title != null && title.trim()) {
      store.update((d) => addDocument(d, { title: title.trim(), content: '' }));
      toast('Document added');
    }
    return;
  }
  const docSave = hit('[data-doc-save]');
  if (docSave) {
    const id = docSave.dataset.docSave;
    const ta = root.querySelector(`[data-doc-content="${id}"]`);
    if (ta) { store.update((d) => updateDocument(d, id, { content: ta.value })); toast('Document saved'); }
    return;
  }
  const docDel = hit('[data-doc-delete]');
  if (docDel) {
    if (window.confirm('Delete this document?')) {
      store.update((d) => removeDocument(d, docDel.dataset.docDelete));
      toast('Document deleted');
    }
    return;
  }

  if (hit('[data-export-campaign]')) return download(`gmatlas-${stamp()}.json`, store.export());
  if (hit('[data-export-journal]')) return exportJournal();
  if (hit('[data-new-campaign]')) {
    if (window.confirm('Start a new campaign? Your current one stays exportable but will be replaced in this browser.')) {
      store.newCampaign(); toast('New campaign');
    }
    return;
  }
  if (hit('[data-bind-file]')) return store.bindFile().then(() => toast('Save file bound')).catch(() => {});
  if (hit('[data-restore-backup]')) {
    if (!window.confirm('Restore the last backup? This replaces the current campaign with the previous save — export the current one first if you want to keep it.')) return;
    const result = store.restoreBackup();
    return toast(result.ok ? 'Restored last backup' : `Couldn't restore backup — ${result.error && result.error.message}`);
  }
}

// Executes a statblock field's configured dice model (see ROLL_METHODS in
// drawers/index.js) and files the result to the Journal — shared by the
// track badge's double-click-to-roll and the attribute label's click-to-
// roll, so both entry points resolve identically. A field with
// rollMethod:'none' is silently a no-op (callers already gate on rollability
// via their own UI, this is just the last-line guard).
function performFieldRoll(f, label) {
  const method = f.rollMethod || 'none';
  if (method === 'none') return;
  if (method === 'flat') {
    const r = rollFlat(Number(f.value) || 0, { target: f.target || 6 });
    store.update((d) => logRoll(d, formatFlatRollText(label, r)));
    // 5PFH's d6+attribute breakdown, not just the combined total — a GM
    // reading the toast should see the die roll and the modifier separately,
    // the same way the Journal line (formatFlatRollText) already does.
    return toast(`🎲 d6(${r.die}) + ${r.value} = ${r.total} vs target ${r.target} → ${r.outcomeLabel}`);
  }
  if (method === 'traveller') {
    const r = rollTraveller(Number(f.value) || 0, { target: f.target || 8 });
    store.update((d) => logRoll(d, formatTravellerRollText(label, r)));
    return toast(`🎲 ${r.outcomeLabel} — ${r.total} vs target ${r.target}`);
  }
  const r = rollAction(Number(f.value) || 0);
  store.update((d) => logRoll(d, formatRollText(label, r)));
  toast(`🎲 ${r.outcomeLabel} — ${r.total} vs ${r.challenge1}, ${r.challenge2}${r.match ? ' (match)' : ''}`);
}

// Escape: close whatever's topmost (search overlay > active drawer tab >
// mobile/tablet Co-Pilot sheet), always active even while a field has
// focus — the whole point is letting you back out of one. Ctrl/Cmd+K:
// open Universal Search from anywhere, matching the convention comparable
// tools already use for a search/command action.
function onKeydown(ev) {
  if (ev.key === 'Escape') {
    if (searchOpen) {
      searchOpen = false; searchQuery = '';
      const inp = root.querySelector('[data-search-input]'); if (inp) inp.value = '';
      return renderSearchOverlay();
    }
    if (activeDrawer) return closeDrawerTab(activeDrawer);
    if (copilotOpen) { copilotOpen = false; return render(); }
    return;
  }
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') {
    ev.preventDefault();
    searchOpen = true;
    renderSearchOverlay();
    const inp = root.querySelector('[data-search-input]'); if (inp) inp.focus();
  }
}

// Crew-Link-style "double-click a stat to roll" — track fields only
// (attribute fields roll via their label click, see onClick's
// data-statblock-roll-label handler above). A field with rollMethod:'none'
// (a plain progress bar, e.g. Health) never gets a roll button in the first
// place — see trackRow() in drawers/index.js.
function onDblClick(ev) {
  const rollTarget = ev.target.closest('[data-statblock-roll]');
  if (!rollTarget) return;
  ev.preventDefault();
  const [gi, fi] = rollTarget.dataset.statblockRoll.split('::').map(Number);
  const active = store.get().entities.activeId;
  const e = getEntity(store.get(), active);
  const group = e && e.statblocks && e.statblocks[gi];
  const f = group && group.fields[fi];
  if (!f || !f.track) return;
  performFieldRoll(f, `${e.name || 'Unnamed'} — ${f.key || 'Stat'}`);
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

  const tagSelect = t.closest('[data-entity-tag-select]');
  if (tagSelect) {
    if (!t.value) return;
    const active = store.get().entities.activeId;
    return store.update((d) => addEntityTag(d, active, t.value));
  }

  const ef = t.closest('[data-entity-field]');
  if (ef) {
    const active = store.get().entities.activeId;
    const field = ef.dataset.entityField;
    return store.update((d) => updateEntity(d, active, { [field]: t.value }));
  }

  const relLabel = t.closest('[data-entity-rel-label]');
  if (relLabel) { const active = store.get().entities.activeId; return store.update((d) => updateRelationshipLabel(d, active, relLabel.dataset.entityRelLabel, t.value)); }

  const relType = t.closest('[data-entity-rel-type]');
  if (relType) { const active = store.get().entities.activeId; return store.update((d) => updateRelationshipType(d, active, relType.dataset.entityRelType, t.value)); }

  const relStrength = t.closest('[data-entity-rel-strength]');
  if (relStrength) { const active = store.get().entities.activeId; return store.update((d) => updateRelationshipStrength(d, active, relStrength.dataset.entityRelStrength, t.value)); }

  const oev = t.closest('[data-oracle-entry-value]');
  if (oev) {
    const [key, idx] = oev.dataset.oracleEntryValue.split('::');
    return store.update((d) => updateOracleEntry(d, key.split('>'), Number(idx), t.value));
  }

  const sval = t.closest('[data-statblock-val]');
  if (sval) {
    const [gi, fi] = sval.dataset.statblockVal.split('::').map(Number);
    const active = store.get().entities.activeId;
    return store.update((d) => setEntityStatblockField(d, active, gi, fi, { value: t.value }));
  }
  const sattr = t.closest('[data-statblock-attr-val]');
  if (sattr) {
    const [gi, fi] = sattr.dataset.statblockAttrVal.split('::').map(Number);
    const active = store.get().entities.activeId;
    return store.update((d) => setEntityStatblockAttributeValue(d, active, gi, fi, t.value));
  }

  // --- party trackers ---
  const trkName = t.closest('[data-party-tracker-name]');
  if (trkName) return store.update((d) => updatePartyTracker(d, trkName.dataset.partyTrackerName, { name: t.value }));
  const trkKind = t.closest('[data-party-tracker-kind]');
  if (trkKind) return store.update((d) => updatePartyTracker(d, trkKind.dataset.partyTrackerKind, { kind: t.value }));
  const trkValue = t.closest('[data-party-tracker-value]');
  if (trkValue) return store.update((d) => updatePartyTracker(d, trkValue.dataset.partyTrackerValue, { value: Number(t.value) || 0 }));
  const trkMax = t.closest('[data-party-tracker-max]');
  if (trkMax) return store.update((d) => updatePartyTracker(d, trkMax.dataset.partyTrackerMax, { max: Number(t.value) || 1 }));

  // --- colony ---
  const colonyField = t.closest('[data-colony-field]');
  if (colonyField) return store.update((d) => setColonyField(d, colonyField.dataset.colonyField, t.value));
  const crewField = t.closest('[data-colony-crew-field]');
  if (crewField) {
    const [id, field] = crewField.dataset.colonyCrewField.split('::');
    return store.update((d) => updateCrewRow(d, id, { [field]: t.value }));
  }

  // --- settings: Bestiary statblock template field edits ---
  const tplKey = t.closest('[data-tpl-field-key]');
  if (tplKey) { const [sys, idx] = tplKey.dataset.tplFieldKey.split('::'); return store.update((d) => updateTemplateField(d, sys, Number(idx), { key: t.value })); }
  const tplKind = t.closest('[data-tpl-field-kind]');
  if (tplKind) { const [sys, idx] = tplKind.dataset.tplFieldKind.split('::'); return store.update((d) => updateTemplateField(d, sys, Number(idx), { kind: t.value })); }
  const tplRoll = t.closest('[data-tpl-field-rollmethod]');
  if (tplRoll) { const [sys, idx] = tplRoll.dataset.tplFieldRollmethod.split('::'); return store.update((d) => updateTemplateField(d, sys, Number(idx), { rollMethod: t.value })); }
  const tplFormat = t.closest('[data-tpl-field-format]');
  if (tplFormat) { const [sys, idx] = tplFormat.dataset.tplFieldFormat.split('::'); return store.update((d) => updateTemplateField(d, sys, Number(idx), { format: t.value })); }

  const threadStatus = t.closest('[data-thread-status]');
  if (threadStatus) return store.update((d) => setThreadStatus(d, threadStatus.dataset.threadStatus, t.value));
  const threadPriority = t.closest('[data-thread-priority]');
  if (threadPriority) return store.update((d) => setThreadPriority(d, threadPriority.dataset.threadPriority, t.value));
  const tplMax = t.closest('[data-tpl-field-max]');
  if (tplMax) { const [sys, idx] = tplMax.dataset.tplFieldMax.split('::'); return store.update((d) => updateTemplateField(d, sys, Number(idx), { max: Number(t.value) || 5 })); }
  const tplTarget = t.closest('[data-tpl-field-target]');
  if (tplTarget) { const [sys, idx] = tplTarget.dataset.tplFieldTarget.split('::'); return store.update((d) => updateTemplateField(d, sys, Number(idx), { target: Number(t.value) || 6 })); }

  const num = t.closest('[data-ctx-num]');
  if (num) { const [key, field] = num.dataset.ctxNum.split('.'); return store.update((d) => patchContext(d, key, { [field]: Number(t.value) })); }

  if (t.closest('[data-campaign-title-input]')) return store.update((d) => { d.meta.title = t.value; return d; });
  if (t.closest('[data-genre-input]')) return store.update((d) => { d.settings.genre = t.value; return d; });
  if (t.closest('[data-genre-pack-select]')) {
    store.update((d) => { d.settings.genrePack = t.value; return d; });
    return toast(`Genre Pack set to ${t.value}`);
  }
  if (t.closest('[data-settings-stat-ruleset]')) return store.update((d) => { d.settings.statRuleset = t.value; return d; });

  if (t.closest('[data-import-campaign]')) {
    const file = t.files && t.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try { store.import(reader.result); toast('Campaign imported'); } catch (e) { toast('Import failed'); } };
    reader.readAsText(file);
    return;
  }

  if (t.closest('[data-doc-upload]')) {
    const files = Array.from(t.files || []);
    if (!files.length) return;
    let done = 0;
    const total = files.length;
    for (const file of files) {
      // localStorage's shared per-origin quota (commonly 5-10MB, holding the
      // WHOLE campaign, not just this file) can't reliably hold a large
      // rulebook PDF base64-encoded — this used to fail silently (store.js's
      // persist() only logged a console.warn), so an upload like this could
      // look like it worked and then be gone on the next reload. Large,
      // static rulebooks belong in assets/docs/ (rebuilt into the
      // size-unlimited Reference Library) instead of embedded here.
      if (file.size > MAX_DOC_UPLOAD_BYTES) {
        done += 1;
        toast(`"${file.name}" (${formatBytes(file.size)}) is too big to store this way — add rulebook-sized PDFs to assets/docs/ and rebuild instead.`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          store.update((d) => addDocument(d, { kind: 'file', title: file.name, fileName: file.name, mimeType: file.type, dataUrl: reader.result }));
          done += 1;
          toast(done === total ? `Uploaded ${done} file${done === 1 ? '' : 's'}` : `Uploading… (${done}/${total})`);
        } catch (e) {
          done += 1;
          toast(`"${file.name}" couldn't be saved — browser storage is full. Add large rulebooks to assets/docs/ and rebuild instead.`);
        }
      };
      reader.readAsDataURL(file);
    }
    t.value = '';
    return;
  }
}

// Live feedback that must NOT trigger a full re-render (keeps focus/caret).
function onInput(ev) {
  const t = ev.target;
  const num = t.closest('[data-ctx-num]');
  if (num) { const lbl = num.previousElementSibling || num.parentElement.querySelector('.metric'); if (lbl && lbl.classList.contains('metric')) lbl.textContent = `${t.value}/10`; return; }

  const of = t.closest('[data-oracle-filter]');
  if (of) { oracleFilter = t.value; renderDrawerBody(); restoreFocus('[data-oracle-filter]'); return; }

  const df = t.closest('[data-doc-filter]');
  if (df) { docFilter = t.value; renderDrawerBody(); restoreFocus('[data-doc-filter]'); return; }

  const esrch = t.closest('[data-entity-search]');
  if (esrch) { entitySearch = t.value; renderDrawerBody(); restoreFocus('[data-entity-search]'); return; }

  // The search input lives in the static header skeleton, not inside a
  // drawer body that gets replaced wholesale — only its results list needs
  // updating, so focus/caret never needs restoring in the first place.
  const si = t.closest('[data-search-input]');
  if (si) { searchQuery = t.value; renderSearchOverlay(); }
}

// Edge-tab click: closes if it's the currently-active tab (matches the old
// single-drawer toggle behavior for the common case), otherwise opens it as
// a new tab (or just switches to it if already pinned open) — never resets
// an already-open tab's own filter state, only a newly-opened one's.
function toggleDrawer(id) {
  if (activeDrawer === id) return closeDrawerTab(id);
  openDrawerTab(id);
  render();
}

function openDrawerTab(id) {
  if (!id) return;
  if (!openDrawers.includes(id)) {
    openDrawers = [...openDrawers, id];
    if (id === 'oracle') oracleFilter = '';
    if (id === 'documents') { docFilter = ''; docTagFilters = new Set(); docTagEditorOpen = new Set(); }
  }
  activeDrawer = id;
}

function closeDrawerTab(id) {
  openDrawers = openDrawers.filter((d) => d !== id);
  if (activeDrawer === id) activeDrawer = openDrawers[openDrawers.length - 1] || null;
  render();
}

// ---- drag-and-drop: entity → entity (relate) or entity → text (mention) --
// Native HTML5 DnD, delegated at the root like everything else. A custom
// MIME type keeps this from reacting to unrelated drags (e.g. file drops).
const ENTITY_DRAG_TYPE = 'application/x-saga-entity';
const DOCUMENT_DRAG_TYPE = 'application/x-saga-document';

function onDragStart(ev) {
  const entitySrc = ev.target.closest('[data-drag-entity]');
  if (entitySrc) {
    ev.dataTransfer.setData(ENTITY_DRAG_TYPE, entitySrc.dataset.dragEntity);
    ev.dataTransfer.effectAllowed = 'link';
    return;
  }

  const docSrc = ev.target.closest('[data-drag-document]');
  if (docSrc) {
    ev.dataTransfer.setData(DOCUMENT_DRAG_TYPE, docSrc.dataset.dragDocument);
    ev.dataTransfer.effectAllowed = 'copy';
  }
}

function onDragOver(ev) {
  const types = ev.dataTransfer.types || [];
  if (!types.includes(ENTITY_DRAG_TYPE) && !types.includes(DOCUMENT_DRAG_TYPE)) return;
  const target = ev.target.closest('[data-drop-entity], [data-journal-input], textarea[data-ctx]');
  if (target) { ev.preventDefault(); target.classList.add('drop-hover'); }
}

function onDragLeave(ev) {
  const target = ev.target.closest('.drop-hover');
  if (target) target.classList.remove('drop-hover');
}

function onDrop(ev) {
  const entityId = ev.dataTransfer.getData(ENTITY_DRAG_TYPE);
  const documentId = ev.dataTransfer.getData(DOCUMENT_DRAG_TYPE);
  if (!entityId && !documentId) return;
  const target = ev.target.closest('[data-drop-entity], [data-journal-input], textarea[data-ctx]');
  if (!target) return;
  ev.preventDefault();
  target.classList.remove('drop-hover');
  completeDrop(target, { entityId, documentId });
}

// Shared by the mouse path (onDrop, native HTML5 DnD) and the touch path
// (onTouchEnd, below) — exactly one place decides what a drop actually
// does, so the two input methods can never quietly diverge.
function completeDrop(target, { entityId, documentId }) {
  const dropEnt = target.closest('[data-drop-entity]');
  if (dropEnt && entityId) {
    const targetId = dropEnt.dataset.dropEntity;
    if (targetId && targetId !== entityId) { store.update((d) => addRelationship(d, entityId, targetId, 'linked')); toast('Linked'); }
    return;
  }
  const dropText = target.closest('[data-journal-input], textarea[data-ctx]');
  if (dropText) {
    if (documentId) {
      const docEntry = getDocument(store.get(), documentId);
      if (docEntry) {
        const title = docEntry.title || 'Untitled document';
        insertAtCursor(dropText, (/\s/.test(title) ? `@[${title}] ` : `@${title} `));
        dropText.dispatchEvent(new Event('change', { bubbles: true }));
        return toast(`Referenced ${title}`);
      }
    }
    if (entityId) {
      const ent = getEntity(store.get(), entityId);
      if (ent) {
        const name = ent.name || 'Unnamed';
        insertAtCursor(dropText, (/\s/.test(name) ? `@[${name}] ` : `@${name} `));
        dropText.dispatchEvent(new Event('change', { bubbles: true }));
        toast(`Mentioned ${name}`);
      }
    }
  }
}

// ---- touch equivalent of the drag-and-drop above --------------------------
// HTML5 drag-and-drop's dragstart/dragover/drop events never fire for touch
// gestures on real mobile browsers (a well-known gap, not a bug in the code
// above) — so linking entities or mentioning one in a note has had no
// touch path at all until now. This recognizes the same gesture (press a
// data-drag-entity/data-drag-document handle, move, release over a
// data-drop-entity/text-field target) and feeds the exact same
// completeDrop() the mouse path uses, rather than a second interaction
// model with its own chance to drift out of sync.
const TOUCH_DRAG_THRESHOLD = 10; // px of finger movement before a touch counts as a drag, not a tap/scroll
let touchDrag = null;

function onTouchStart(ev) {
  const t = ev.target;
  const entitySrc = t.closest('[data-drag-entity]');
  const docSrc = !entitySrc && t.closest('[data-drag-document]');
  if (!entitySrc && !docSrc) return;
  const touch = ev.touches[0];
  touchDrag = {
    entityId: entitySrc ? entitySrc.dataset.dragEntity : null,
    documentId: docSrc ? docSrc.dataset.dragDocument : null,
    startX: touch.clientX, startY: touch.clientY,
    engaged: false, lastTarget: null, ghostEl: null,
  };
}

function onTouchMove(ev) {
  if (!touchDrag) return;
  const touch = ev.touches[0];
  const dx = touch.clientX - touchDrag.startX, dy = touch.clientY - touchDrag.startY;
  if (!touchDrag.engaged) {
    if (Math.hypot(dx, dy) < TOUCH_DRAG_THRESHOLD) return; // could still be a tap or a page scroll
    touchDrag.engaged = true;
    touchDrag.ghostEl = makeTouchDragGhost(touchDrag);
  }
  ev.preventDefault(); // only once actually dragging — a plain tap/scroll is never blocked
  if (touchDrag.ghostEl) { touchDrag.ghostEl.style.left = touch.clientX + 'px'; touchDrag.ghostEl.style.top = touch.clientY + 'px'; }
  const under = document.elementFromPoint(touch.clientX, touch.clientY);
  const dropTarget = under && under.closest('[data-drop-entity], [data-journal-input], textarea[data-ctx]');
  if (dropTarget !== touchDrag.lastTarget) {
    if (touchDrag.lastTarget) touchDrag.lastTarget.classList.remove('drop-hover');
    if (dropTarget) dropTarget.classList.add('drop-hover');
    touchDrag.lastTarget = dropTarget || null;
  }
}

function onTouchEnd() {
  if (!touchDrag) return;
  const drag = touchDrag;
  touchDrag = null;
  if (drag.ghostEl) drag.ghostEl.remove();
  if (drag.lastTarget) drag.lastTarget.classList.remove('drop-hover');
  if (!drag.engaged || !drag.lastTarget) return; // a tap, or released off any valid target
  completeDrop(drag.lastTarget, drag);
}

function makeTouchDragGhost(drag) {
  const label = drag.entityId ? (getEntity(store.get(), drag.entityId) || {}).name : (getDocument(store.get(), drag.documentId) || {}).title;
  const el = document.createElement('div');
  el.className = 'touch-drag-ghost';
  el.textContent = label || (drag.entityId ? 'Entity' : 'Document');
  document.body.appendChild(el);
  return el;
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
  const badges = {
    journal: doc.journal.length || '', entities: (doc.entities.items || []).length || '', graph: linkCount || '',
    party: (doc.party && doc.party.trackers && doc.party.trackers.length) || '',
  };
  const edge = root.querySelector('[data-edge]');
  edge.innerHTML = DRAWERS.map((d) => {
    const badge = badges[d.id] || '';
    return `<button data-drawer-open="${d.id}" aria-expanded="${activeDrawer === d.id}" title="${d.label}">
      <span class="glyph">${d.glyph}</span><b>${d.label}</b>${badge ? `<span class="badge">${badge}</span>` : ''}
    </button>`;
  }).join('') + `<button data-toggle-copilot title="Co-Pilot"><span class="glyph">💡</span><b>Co-Pilot</b></button>`;

  const drawer = root.querySelector('[data-drawer]');
  drawer.dataset.open = String(openDrawers.length > 0);
  const meta = DRAWERS.find((d) => d.id === activeDrawer);
  drawer.querySelector('[data-drawer-title]').textContent = meta ? meta.label : 'Drawer';
  drawer.style.setProperty('--drawer-w', (doc.drawers.widths[activeDrawer] || 420) + 'px');
  // Tab strip — same pattern as the doc viewer's own tabs below: one pinned
  // drawer per tab, click to switch, ✕ to close without needing to make it
  // active first. Hidden entirely when only one (or zero) drawers are open,
  // so the common case looks identical to the old single-drawer UI.
  const drawerTabsEl = root.querySelector('[data-drawer-tabs]');
  drawerTabsEl.hidden = openDrawers.length < 2;
  drawerTabsEl.innerHTML = openDrawers.length < 2 ? '' : openDrawers.map((id) => {
    const m = DRAWERS.find((d) => d.id === id);
    return `<button class="drawer-tab ${id === activeDrawer ? 'active' : ''}" data-drawer-tab="${id}" title="${m ? m.label : id}">
      <span class="glyph">${m ? m.glyph : ''}</span><span class="drawer-tab-label">${m ? m.label : id}</span>
      <span class="drawer-tab-close" data-drawer-tab-close="${id}" aria-label="Close ${m ? m.label : id}">✕</span>
    </button>`;
  }).join('');
  renderDrawerBody();

  const viewer = root.querySelector('[data-doc-viewer]');
  const openTabs = (doc.documents && doc.documents.openTabs) || [];
  viewer.hidden = openTabs.length === 0;
  // Stop the viewer short of whatever drawer is currently open (it's always
  // the Documents drawer in practice, since that's the only place a
  // data-doc-open link exists) — the drawer sits at a higher z-index, so
  // without this the viewer's own controls (e.g. a tab's close button)
  // render underneath the drawer and become unclickable despite being
  // visible.
  viewer.style.setProperty('--viewer-overlap', activeDrawer ? `${doc.drawers.widths[activeDrawer] || 420}px` : '0px');
  if (openTabs.length) {
    const activeTab = doc.documents.activeTab && openTabs.includes(doc.documents.activeTab)
      ? doc.documents.activeTab : openTabs[openTabs.length - 1];
    viewer.querySelector('[data-doc-viewer-tabs]').innerHTML = openTabs.map((key) => {
      const resolved = resolveDocumentTab(doc, key);
      const title = resolved ? resolved.title : 'Document';
      return `<button class="doc-viewer-tab ${key === activeTab ? 'active' : ''}" data-doc-viewer-tab="${escapeHtml(key)}" title="${escapeHtml(title)}">
        <span class="doc-viewer-tab-title">${escapeHtml(title)}</span>
        <span class="doc-viewer-tab-close" data-doc-viewer-tab-close="${escapeHtml(key)}" aria-label="Close tab">✕</span>
      </button>`;
    }).join('');

    const resolvedActive = resolveDocumentTab(doc, activeTab);
    const frame = viewer.querySelector('[data-doc-viewer-frame]');
    const empty = viewer.querySelector('[data-doc-viewer-empty]');
    if (resolvedActive && resolvedActive.src) {
      frame.hidden = false;
      empty.hidden = true;
      if (frame.src !== resolvedActive.src) frame.src = resolvedActive.src;
    } else {
      // A resolved 'lib' entry with no dataUrl means the file never actually
      // saved (e.g. an old campaign that predates store.js's quota-rollback
      // fix) — show a message instead of a blank iframe.
      frame.hidden = true;
      frame.removeAttribute('src');
      empty.hidden = false;
      empty.textContent = resolvedActive
        ? `"${resolvedActive.title}" couldn't be loaded — it may have failed to save (browser storage limits). Try re-adding it, or for large rulebooks add the PDF to assets/docs/ and rebuild.`
        : 'This document is no longer available.';
    }
  }

  renderSearchOverlay();
}

// Lives outside the drawer/workspace update paths above since it's a
// header-level overlay, not a drawer — same "static skeleton, targeted
// update" approach as the doc viewer just above.
function renderSearchOverlay() {
  const overlay = root && root.querySelector('[data-search-overlay]');
  if (!overlay) return;
  overlay.hidden = !searchOpen;
  const resultsEl = overlay.querySelector('[data-search-results]');
  if (resultsEl) resultsEl.innerHTML = searchOpen ? renderSearchPanel(store.get(), searchQuery) : '';
}

function renderDrawerBody() {
  const doc = store.get();
  const body = root && root.querySelector('[data-drawer-body]');
  if (body) {
    body.innerHTML = activeDrawer ? renderDrawer(activeDrawer, doc, {
      oracleFilter, expandedOracleGroups, oracleEditorOpen, docFilter, docTagFilters, docTagEditorOpen, statblockAddOpen, recapOpen, castListCollapsed,
      entitySearch, entityTypeFilter, storageInfo: store.storageInfo(),
    }) : '';
  }
}

// A store.update() that fails to persist (most commonly localStorage quota
// exceeded — see store.js's persist()) rolls back and throws, by design
// (Article VIII: never show a change as "there" when it silently failed to
// save). But every delegated handler above calls store.update() bare, with
// no try/catch — an uncaught throw there used to mean the interaction just
// silently did nothing (the state visibly reverted via the rollback
// render(), and the actual error only ever reached the browser console,
// which most GMs never open). Wrapping dispatch here means ANY handler
// failure — not just this one cause — surfaces as a toast instead of a
// click that appears to do nothing. This is the single choke point every
// interaction already passes through (rule 4: one delegated listener per
// event type), so it's one wrapper, not one try/catch per call site.
function guarded(fn) {
  return function guardedHandler(ev) {
    try { return fn(ev); } catch (err) {
      console.error('Interaction failed:', err);
      toast(`Couldn't save — ${err && err.message ? err.message : 'an error occurred'}. Storage may be full; try exporting your campaign as a backup.`);
    }
  };
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
  download(`gmatlas-journal-${stamp()}.txt`, text || 'No journal entries.');
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
