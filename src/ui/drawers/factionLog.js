// factionLog.js — the SWN Faction Turn Engine's left-anchored panel body
// (docs/adr/0031-swn-faction-turn-engine.md). Split out of drawers/index.js
// (already 2287+ lines before this feature) purely for size — the panel
// itself isn't part of the normal DRAWERS tab-stack mechanism (see
// shell.js's mc-faction-log skeleton/CSS, modeled on the doc viewer), so
// this file's one export is called directly from shell.js's render(),
// not through drawers/index.js's renderDrawer() switch.
//
// Propose-then-confirm: `factionLogDrafts` (ephemeral UI state living in
// shell.js, never persisted) holds the current batch of proposed-but-not-
// committed turn drafts — a review list the GM reads before Commit
// All/Discard. The committed feed below it is the real, persisted
// `campaign.factionLog`, filterable to one faction.

import { listEntities } from '../../domain/entities.js';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const ACTION_LABEL = {
  attack: 'Attack', buyAsset: 'Buy Asset', sellAsset: 'Sell Asset', repairAssetOrFaction: 'Repair',
  refitAsset: 'Refit Asset', expandInfluence: 'Expand Influence', changeHomeworld: 'Change Homeworld',
  seizePlanet: 'Seize Planet', useAssetAbility: 'Use Asset Ability', none: 'No action', busy: 'In transit',
};

function draftRow(draft, i) {
  const e = draft.event || {};
  return `<div class="thread-row">
    <span class="thread-name">${esc(draft.factionName || 'Unknown')} <span class="dim small">— ${esc(ACTION_LABEL[draft.action] || draft.action)}${e.outcome ? ` (${esc(e.outcome)})` : ''}</span></span>
  </div>
  <p class="dim small">${esc(e.narrative || '')}${e.rollsSummary ? ` <span class="dim small">[${esc(e.rollsSummary)}]</span>` : ''}</p>`;
}

function logEntryRow(entry) {
  return `<div class="thread-row">
    <span class="thread-name">Turn ${entry.turnNumber} — ${esc(entry.factionName || 'Unknown')} <span class="dim small">— ${esc(ACTION_LABEL[entry.action] || entry.action)}${entry.outcome ? ` (${esc(entry.outcome)})` : ''}</span></span>
    <span class="dim small">${new Date(entry.createdAt).toLocaleString()}</span>
  </div>
  <p class="dim small">${esc(entry.narrative || '')}${entry.rollsSummary ? ` <span class="dim small">[${esc(entry.rollsSummary)}]</span>` : ''}</p>`;
}

export function renderFactionLog(doc, { factionLogDrafts, factionLogFilterId } = {}) {
  const factions = listEntities(doc, 'faction');
  const log = Array.isArray(doc.factionLog) ? doc.factionLog : [];
  const filtered = factionLogFilterId ? log.filter((e) => e.factionId === factionLogFilterId) : log;
  const feed = filtered.slice().reverse();

  const draftsHtml = factionLogDrafts
    ? `<div class="faction-log-review">
        <h3>Reviewing ${factionLogDrafts.length} draft${factionLogDrafts.length === 1 ? '' : 's'}</h3>
        ${factionLogDrafts.map(draftRow).join('') || '<p class="dim small">Nothing proposed.</p>'}
        <div class="action-bar">
          <button class="btn primary sm" data-faction-log-commit ${factionLogDrafts.length ? '' : 'disabled'}>✓ Commit${factionLogDrafts.length > 1 ? ' All' : ''}</button>
          <button class="btn ghost sm" data-faction-log-discard>✕ Discard</button>
        </div>
      </div>`
    : '';

  return `
    <div class="faction-log-controls">
      <div class="faction-log-controls-row">
        <select data-faction-log-step-select>
          <option value="">— pick a faction to step —</option>
          ${factions.map((f) => `<option value="${esc(f.id)}">${esc(f.name || 'Unnamed faction')}</option>`).join('')}
        </select>
        <button class="btn ghost sm" data-faction-log-step-go>▶ Step</button>
        <button class="btn ghost sm" data-faction-log-full-round>▶▶ Full Round</button>
      </div>
      ${!factions.length ? '<p class="dim small">No Faction entities yet — tag an entity as a Faction in Cast first.</p>' : ''}
    </div>
    ${draftsHtml}
    <hr class="field-divider">
    <div class="faction-log-feed-head">
      <h3>Log</h3>
      <select data-faction-log-filter>
        <option value="">All factions</option>
        ${factions.map((f) => `<option value="${esc(f.id)}" ${factionLogFilterId === f.id ? 'selected' : ''}>${esc(f.name || 'Unnamed faction')}</option>`).join('')}
      </select>
    </div>
    ${feed.length ? feed.map(logEntryRow).join('') : '<p class="ws-placeholder">No faction turns committed yet — Step or Full Round above, then Commit.</p>'}`;
}
