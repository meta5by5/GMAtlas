// workspace/index.js — the Adaptive Workspace. One interactive view per context
// question. Editing dispatches through the shell's delegated handlers (change +
// click) so this stays a pure render function.

import { listShifts } from '../../domain/context.js';
import { listThreads, THREAD_STATUSES, THREAD_STATUS_LABELS, THREAD_PRIORITIES } from '../../domain/threads.js';
import { ACTIVITIES, suggestRulesLens } from '../../domain/activities.js';
import { listTagVocabulary, getEntity } from '../../domain/entities.js';
import { oracleLinkTagsFor } from '../../data/entityFieldOracleLinks.js';
import { buildMentionEditorHTML, richToolbarHTML } from '../mentionEditor.js';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const INTENTS = ['Discovery', 'Travel', 'Social encounter', 'Investigation', 'Resource pressure', 'Combat pressure', 'Moral choice', 'Faction complication', 'Exploration hazard', 'Trade opportunity'];

// The "Shift Story" actions surfaced on the WHAT view — the manual control layer.
const WHAT_ACTIONS = ['Reveal Clue', 'Complicate', 'Reward', 'Raise Threat', 'Lower Threat', 'Advance Time'];

function card(title, lead, body) {
  return `<article class="workspace-card"><h2>${title}</h2><p class="lead">${lead}</p>${body}</article>`;
}

// Suggestion Lens chip picker (docs/adr/0009-situation-engine-revisited.md,
// Decision item 3) — "What Happens Next?" opens this instead of generating
// immediately; ui.lensDraw is the fixed random draw from drawSuggestionLenses
// (session.js, via shell.js), not recomputed on every render.
function lensPickerHtml(ui) {
  if (!ui || !ui.lensPickerOpen) return '';
  const chips = (ui.lensDraw || []).map((l) => `<button class="chip" data-lens-pick="${esc(l.id)}" title="${l.kind === 'discovery' ? 'Discovery Lens' : 'Approach Lens'}">${esc(l.label)}</button>`).join('');
  return `<div class="lens-picker">
    <p class="dim small">Pick a lens to steer what happens next, instead of generating blind:</p>
    <div class="lens-picker-chips">${chips}</div>
  </div>`;
}

const VIEWS = {
  what(doc, ui) {
    const c = doc.context.what;
    const resources = c.resources == null ? 5 : c.resources;
    const reputation = c.reputation == null ? 5 : c.reputation;
    const stress = c.stress == null ? 5 : c.stress;
    return card('WHAT is happening', 'The active situation — your primary workspace.', `
      <div class="field-label">Situation
        <div class="rich-field">${richToolbarHTML()}<div class="mention-editor" contenteditable="true" data-ctx="what.situation" data-placeholder="What is unresolved right now?">${buildMentionEditorHTML(doc, c.situation)}</div></div>
      </div>
      <div class="field-row">
        <label class="field-label">Intent
          <select data-ctx="what.intent">
            ${INTENTS.map((i) => `<option ${i === c.intent ? 'selected' : ''}>${i}</option>`).join('')}
          </select>
        </label>
        <label class="field-label">Threat <b class="metric">${c.threat}/10</b>
          <input type="range" min="0" max="10" value="${c.threat}" data-ctx-num="what.threat">
        </label>
        <label class="field-label">Mystery <b class="metric">${c.mystery}/10</b>
          <input type="range" min="0" max="10" value="${c.mystery}" data-ctx-num="what.mystery">
        </label>
      </div>
      <div class="field-row-3col">
        <label class="field-label">Resources <b class="metric">${resources}/10</b>
          <input type="range" min="0" max="10" value="${resources}" data-ctx-num="what.resources">
        </label>
        <label class="field-label">Reputation <b class="metric">${reputation}/10</b>
          <input type="range" min="0" max="10" value="${reputation}" data-ctx-num="what.reputation">
        </label>
        <label class="field-label">Stress <b class="metric">${stress}/10</b>
          <input type="range" min="0" max="10" value="${stress}" data-ctx-num="what.stress">
        </label>
      </div>
      <div class="action-bar">
        <button class="btn primary" data-continue-story>▶ Continue Story</button>
        <button class="btn" data-what-next>What Happens Next?</button>
      </div>
      ${lensPickerHtml(ui)}
      <div class="shift-actions" aria-label="Shift story">
        ${WHAT_ACTIONS.map((a) => `<button class="chip" data-shift="${esc(a)}">⚡ ${esc(a)}</button>`).join('')}
      </div>
      ${lastScene(doc)}`);
  },

  who(doc) {
    return card('WHO is here', 'People and factions in play.', `
      ${summaryField('who', doc.context.who.summary, 'Party, NPCs, factions present…', doc)}
      <div class="shift-actions">
        <button class="chip" data-shift-prompt="Introduce NPC">＋ Introduce NPC</button>
      </div>
      ${entityList(doc, ['npc', 'faction'])}`);
  },

  where(doc, ui) {
    return card('WHERE it happens', 'The place the scene is set.', `
      ${summaryField('where', doc.context.where.summary, 'Location and immediate surroundings…', doc)}
      ${whereLocationPicker(doc, ui)}`);
  },

  why(doc) {
    return card('WHY they are here', 'The objective driving the party, tracked as progress clocks.', `
      ${summaryField('why', doc.context.why.summary, 'The current goal or stakes…', doc)}
      <div class="shift-actions">
        <button class="chip" data-shift-prompt="Set Objective">◎ Set Objective</button>
      </div>
      ${threadsBlock(doc)}`);
  },

  how(doc) {
    const activity = doc.context.how.activity || '';
    return card('HOW it plays', 'Mode, pacing, and the Rules Lens it suggests.', `
      <label class="field-label">Activity
        <select data-ctx="how.activity">
          <option value="">— none set —</option>
          ${ACTIVITIES.map((a) => `<option value="${a.id}" ${a.id === activity ? 'selected' : ''}>${esc(a.label)}</option>`).join('')}
        </select>
      </label>
      ${rulesLensSuggestion(doc, activity)}
      ${summaryField('how', doc.context.how.summary, 'Exploration, combat, social, downtime…', doc)}
      <div class="shift-actions">
        <button class="chip" data-shift="Advance Time">⏱ Advance Time</button>
      </div>`);
  },
};

function rulesLensSuggestion(doc, activity) {
  if (!activity) return '';
  const suggestion = suggestRulesLens(activity);
  if (!suggestion) return '';
  const current = doc.settings.statRuleset || 'starforged';
  const chips = suggestion.providers.map((p) => {
    const applyBtn = p.rulesetId
      ? (p.rulesetId === current
        ? '<span class="dim small">(current)</span>'
        : `<button class="chip sm" data-apply-ruleset="${esc(p.rulesetId)}" title="${esc(p.note || '')}">Use as default ▸</button>`)
      : `<span class="dim small" title="${esc(p.note || '')}">(${esc(p.status || 'reference only')})</span>`;
    return `<span class="rules-lens-row"><span class="chip sm rules-provider-chip">${esc(p.label || p.id)}</span> ${applyBtn}</span>`;
  }).join('');
  return `<div class="rules-lens-suggestion">
    <span class="dim small">Suggested Rules Lens for ${esc(suggestion.area)}:</span>
    <div class="rules-lens-chips">${chips}</div>
  </div>`;
}

function summaryField(key, val, placeholder, doc) {
  return `<div class="field-label">Focus
    <div class="rich-field">${richToolbarHTML()}<div class="mention-editor" contenteditable="true" data-ctx="${key}.summary" data-placeholder="${esc(placeholder)}">${buildMentionEditorHTML(doc, val)}</div></div>
  </div>`;
}

// WHERE tab redesign ("USER CHANGES" batch): a Location tag listbox (not
// chips, per direct user request) filters a candidate panel of matching
// Locations; picking one adds it to context.where.entityIds — a schema
// field that already existed (schema.js) but was dead in the UI until now
// (the only prior reader was recap.js's "relevant entities" union). This
// replaces entityList(doc, ['location'])'s old "show literally every
// Location in the campaign" behavior; WHO's view (still entityList) is
// untouched — only WHERE was asked for.
function whereLocationPicker(doc, ui) {
  const tagFilter = ui.whereLocationTagFilter || null;
  const vocab = listTagVocabulary(doc, 'location');
  const tagListbox = vocab.length
    ? `<select size="${Math.min(8, Math.max(3, vocab.length))}" data-where-tag-select>
        <option value="" ${!tagFilter ? 'selected' : ''}>— all tags —</option>
        ${vocab.map((t) => `<option value="${esc(t)}" ${t === tagFilter ? 'selected' : ''}>#${esc(t)}</option>`).join('')}
      </select>`
    : '<p class="ws-placeholder">No Location tags yet — tag a Location in Cast to start filtering.</p>';

  const allLocations = (doc.entities.items || []).filter((e) => e.type === 'location');
  const candidates = tagFilter ? allLocations.filter((e) => (e.tags || []).includes(tagFilter)) : allLocations;
  const curatedIds = (doc.context.where && doc.context.where.entityIds) || [];
  const candidatePanel = candidates.length
    ? `<div class="entity-chips">${candidates.map((e) => `<button type="button" class="entity-chip" data-context-entity-add="where::${esc(e.id)}" title="Add to the present-here list" ${curatedIds.includes(e.id) ? 'disabled' : ''}>${esc(e.name || 'Unnamed')}</button>`).join('')}</div>`
    : `<div class="ws-placeholder">${tagFilter ? 'No Locations tagged #' + esc(tagFilter) + '.' : 'No Locations yet.'}</div>`;

  const curated = curatedIds.map((id) => getEntity(doc, id)).filter(Boolean);
  const curatedList = curated.length
    ? `<div class="entity-chips">${curated.map((e) => `<span class="entity-chip" draggable="true" data-open-entity="${esc(e.id)}" data-drag-entity="${esc(e.id)}" data-drop-entity="${esc(e.id)}" title="Click to open · drag onto another entity to link, or onto a text field to mention">${esc(e.name || 'Unnamed')}<button type="button" class="icon-btn" data-context-entity-remove="where::${esc(e.id)}" title="Remove from this scene" aria-label="Remove">✕</button></span>`).join('')}</div>`
    : '<div class="ws-placeholder">No locations added yet — pick a tag to find one.</div>';

  return `
    <div class="where-picker">
      <div class="where-picker-row">
        <div class="where-picker-tags"><span class="field-label-static">Location tags</span>${tagListbox}</div>
        <div class="where-picker-candidates"><span class="field-label-static">Matching locations</span>${candidatePanel}</div>
      </div>
      <span class="field-label-static">Present here</span>
      ${curatedList}
      <div class="entity-add-row"><button class="chip" data-where-add-location>＋ New Location</button></div>
    </div>`;
}

function entityList(doc, types) {
  const items = (doc.entities.items || []).filter((e) => types.includes(e.type));
  const addBtns = types.map((t) => `<button class="chip" data-entity-add="${t}">＋ ${t.charAt(0).toUpperCase() + t.slice(1)}</button>`).join('');
  const chips = items.length
    ? `<div class="entity-chips">${items.map((e) => `<button class="entity-chip" draggable="true" data-open-entity="${esc(e.id)}" data-drag-entity="${esc(e.id)}" data-drop-entity="${esc(e.id)}" title="Click to open · drag onto another entity to link, or onto a text field to mention">${esc(e.name || 'Unnamed')}${e.relationships && e.relationships.length ? ` <span class="dim">🔗${e.relationships.length}</span>` : ''}</button>`).join('')}</div>`
    : `<div class="ws-placeholder">No ${types.join('/')} yet. Add one, or type <b>@Name</b> in the situation to create it automatically.</div>`;
  return `${chips}<div class="entity-add-row">${addBtns}</div>`;
}

// Expedition trackers (docs/adr/0009-situation-engine-revisited.md,
// Decision item 1): a compact 3-slider block (Supplies/Exposure/Morale, 0-10,
// same range/neutral-midpoint as context.what's Resources/Reputation/Stress)
// on an expedition-tagged Thread's row, next to its clock — the Thread's own
// clock already IS the fourth ("Progress") dial, so it isn't duplicated here.
function expeditionDialsHtml(t) {
  const dial = (field, label) => `
    <label class="field-label sm">${label} <b class="metric">${t[field]}/10</b>
      <input type="range" min="0" max="10" value="${t[field]}" data-expedition-dial="${esc(t.id)}::${field}">
    </label>`;
  return `<div class="expedition-dials">${dial('supplies', 'Supplies')}${dial('exposure', 'Exposure')}${dial('morale', 'Morale')}</div>`;
}

function threadsBlock(doc) {
  const threads = listThreads(doc);
  const rows = threads.map((t) => {
    const pips = Array.from({ length: t.segments }, (_, i) =>
      `<span class="pip ${i < t.filled ? 'on' : ''}"></span>`).join('');
    return `<div class="thread-row thread-status-${esc(t.status)} thread-priority-${esc(t.priority)} ${t.done ? 'done' : ''}">
      <span class="thread-name">${esc(t.name)}</span>
      <span class="thread-clock" title="${t.filled}/${t.segments}">${pips}</span>
      <select class="thread-status-select" data-thread-status="${esc(t.id)}" title="Narrative lifecycle stage">
        ${THREAD_STATUSES.map((s) => `<option value="${s}" ${s === t.status ? 'selected' : ''}>${esc(THREAD_STATUS_LABELS[s])}</option>`).join('')}
      </select>
      <select class="thread-priority-select" data-thread-priority="${esc(t.id)}" title="Priority">
        ${THREAD_PRIORITIES.map((p) => `<option value="${p}" ${p === t.priority ? 'selected' : ''}>${p[0].toUpperCase()}${p.slice(1)}</option>`).join('')}
      </select>
      <span class="thread-actions">
        <button class="icon-btn" data-thread-adv="${esc(t.id)}" title="Advance">＋</button>
        <button class="icon-btn" data-thread-back="${esc(t.id)}" title="Set back">－</button>
        <button class="icon-btn" data-thread-del="${esc(t.id)}" title="Remove">✕</button>
      </span>
      ${t.kind === 'expedition' ? expeditionDialsHtml(t) : ''}
    </div>`;
  }).join('');
  return `<div class="threads">
    <div class="threads-head"><h3>Threads</h3><span class="threads-head-actions"><button class="chip" data-thread-add>＋ New thread</button><button class="chip" data-expedition-add>＋ Expedition</button></span></div>
    ${threads.length ? rows : '<div class="ws-placeholder">No threads yet. Add a clock for each open question or looming danger.</div>'}
  </div>`;
}

// A Scene's own 🔮 link — data/entityFieldOracleLinks.js's "scene.<field>"
// entries (added for this split, see the map's own comment), rendered here
// rather than importing drawers/index.js's identical-shaped oracleLinkIcon
// (the two UI modules don't otherwise depend on each other).
function sceneFieldIcon(field) {
  const tags = oracleLinkTagsFor('scene', field);
  if (!tags) return '';
  return `<button class="icon-btn" data-oracle-field-link="scene.${field}" title="Jump to relevant Oracle table(s): ${tags.map(esc).join(', ')}" aria-label="Jump to relevant Oracle tables">🔮</button>`;
}

function sceneField(scene, key, label, placeholder) {
  return `<label class="field-label sm">
    <span class="field-label-row">${esc(label)}${sceneFieldIcon(key)}</span>
    <input data-scene-field="${esc(scene.id)}::${key}" value="${esc(scene[key] || '')}" placeholder="${esc(placeholder)}">
  </label>`;
}

// Latest Scene split fields ("USER CHANGES" batch): sensory/driver/clue/
// complication are real, individually-editable fields now (domain/
// scenes.js), each linked to its own Oracle category; the combined `text`
// blob below is a DERIVED, read-only view recomposed from current field
// values on every edit (session.js's updateSceneField), not a second,
// independently-editable copy — editing a field updates it live.
function lastScene(doc) {
  const scenes = doc.scenes || [];
  if (!scenes.length) return '<div class="ws-placeholder">No scenes yet. Continue Story to generate the opening beat.</div>';
  const s = scenes[scenes.length - 1];
  return `<details class="last-scene" open>
    <summary>Latest: Scene ${s.number} — ${esc(s.summary)}</summary>
    <div class="scene-fields">
      ${sceneField(s, 'sensory', 'Opening detail', 'What the party notices first…')}
      ${sceneField(s, 'driver', 'Driver', "What's pushing this scene forward…")}
      ${sceneField(s, 'clue', 'Clue', 'A detail that connects to the current thread…')}
      ${sceneField(s, 'complication', 'Complication', 'What makes the obvious choice costly…')}
    </div>
    <pre class="scene-text">${esc(s.text)}</pre>
  </details>`;
}

export function renderWorkspace(doc, active, ui) {
  return (VIEWS[active] || VIEWS.what)(doc, ui);
}
