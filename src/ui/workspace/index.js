// workspace/index.js — the Adaptive Workspace. One interactive view per context
// question. Editing dispatches through the shell's delegated handlers (change +
// click) so this stays a pure render function.

import { listShifts } from '../../domain/context.js';
import { listThreads } from '../../domain/threads.js';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const INTENTS = ['Discovery', 'Travel', 'Social encounter', 'Investigation', 'Resource pressure', 'Combat pressure', 'Moral choice', 'Faction complication', 'Exploration hazard', 'Trade opportunity'];

// The "Shift Story" actions surfaced on the WHAT view — the manual control layer.
const WHAT_ACTIONS = ['Reveal Clue', 'Complicate', 'Reward', 'Raise Threat', 'Lower Threat', 'Advance Time'];

function card(title, lead, body) {
  return `<article class="workspace-card"><h2>${title}</h2><p class="lead">${lead}</p>${body}</article>`;
}

const VIEWS = {
  what(doc) {
    const c = doc.context.what;
    return card('WHAT is happening', 'The active situation — your primary workspace.', `
      <label class="field-label">Situation
        <textarea data-ctx="what.situation" rows="4" placeholder="What is unresolved right now?">${esc(c.situation)}</textarea>
      </label>
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
      <div class="action-bar">
        <button class="btn primary" data-continue-story>▶ Continue Story</button>
        <button class="btn" data-what-next>What Happens Next?</button>
      </div>
      <div class="shift-actions" aria-label="Shift story">
        ${WHAT_ACTIONS.map((a) => `<button class="chip" data-shift="${esc(a)}">⚡ ${esc(a)}</button>`).join('')}
      </div>
      ${lastScene(doc)}`);
  },

  who(doc) {
    return card('WHO is here', 'People and factions in play.', `
      ${summaryField('who', doc.context.who.summary, 'Party, NPCs, factions present…')}
      <div class="shift-actions">
        <button class="chip" data-shift-prompt="Introduce NPC">＋ Introduce NPC</button>
      </div>
      ${entityList(doc, ['npc', 'faction'])}`);
  },

  where(doc) {
    return card('WHERE it happens', 'The place the scene is set.', `
      ${summaryField('where', doc.context.where.summary, 'Location and immediate surroundings…')}
      <div class="shift-actions">
        <button class="chip" data-shift-prompt="Change Location">↳ Change Location</button>
      </div>
      ${entityList(doc, ['location'])}`);
  },

  why(doc) {
    return card('WHY they are here', 'The objective driving the party, tracked as progress clocks.', `
      ${summaryField('why', doc.context.why.summary, 'The current goal or stakes…')}
      <div class="shift-actions">
        <button class="chip" data-shift-prompt="Set Objective">◎ Set Objective</button>
      </div>
      ${threadsBlock(doc)}`);
  },

  how(doc) {
    return card('HOW it plays', 'Mode and pacing.', `
      ${summaryField('how', doc.context.how.summary, 'Exploration, combat, social, downtime…')}
      <div class="shift-actions">
        <button class="chip" data-shift="Advance Time">⏱ Advance Time</button>
      </div>`);
  },
};

function summaryField(key, val, placeholder) {
  return `<label class="field-label">Focus
    <textarea data-ctx="${key}.summary" rows="2" placeholder="${esc(placeholder)}">${esc(val)}</textarea>
  </label>`;
}

function entityList(doc, types) {
  const items = (doc.entities.items || []).filter((e) => types.includes(e.type));
  const addBtns = types.map((t) => `<button class="chip" data-entity-add="${t}">＋ ${t.charAt(0).toUpperCase() + t.slice(1)}</button>`).join('');
  const chips = items.length
    ? `<div class="entity-chips">${items.map((e) => `<button class="entity-chip" draggable="true" data-open-entity="${esc(e.id)}" data-drag-entity="${esc(e.id)}" data-drop-entity="${esc(e.id)}" title="Click to open · drag onto another entity to link, or onto a text field to mention">${esc(e.name || 'Unnamed')}${e.relationships && e.relationships.length ? ` <span class="dim">🔗${e.relationships.length}</span>` : ''}</button>`).join('')}</div>`
    : `<div class="ws-placeholder">No ${types.join('/')} yet. Add one, or type <b>@Name</b> in the situation to create it automatically.</div>`;
  return `${chips}<div class="entity-add-row">${addBtns}</div>`;
}

function threadsBlock(doc) {
  const threads = listThreads(doc);
  const rows = threads.map((t) => {
    const pips = Array.from({ length: t.segments }, (_, i) =>
      `<span class="pip ${i < t.filled ? 'on' : ''}"></span>`).join('');
    return `<div class="thread-row ${t.done ? 'done' : ''}">
      <span class="thread-name">${esc(t.name)}</span>
      <span class="thread-clock" title="${t.filled}/${t.segments}">${pips}</span>
      <span class="thread-actions">
        <button class="icon-btn" data-thread-adv="${esc(t.id)}" title="Advance">＋</button>
        <button class="icon-btn" data-thread-back="${esc(t.id)}" title="Set back">－</button>
        <button class="icon-btn" data-thread-del="${esc(t.id)}" title="Remove">✕</button>
      </span>
    </div>`;
  }).join('');
  return `<div class="threads">
    <div class="threads-head"><h3>Threads</h3><button class="chip" data-thread-add>＋ New thread</button></div>
    ${threads.length ? rows : '<div class="ws-placeholder">No threads yet. Add a clock for each open question or looming danger.</div>'}
  </div>`;
}

function lastScene(doc) {
  const scenes = doc.scenes || [];
  if (!scenes.length) return '<div class="ws-placeholder">No scenes yet. Continue Story to generate the opening beat.</div>';
  const s = scenes[scenes.length - 1];
  return `<details class="last-scene" open>
    <summary>Latest: Scene ${s.number} — ${esc(s.summary)}</summary>
    <pre class="scene-text">${esc(s.text)}</pre>
  </details>`;
}

export function renderWorkspace(doc, active) {
  return (VIEWS[active] || VIEWS.what)(doc);
}
