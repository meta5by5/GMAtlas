// factionEvents.js — the SWN/GMAtlas Core Faction Turn Engine's left-anchored
// panel body (docs/adr/0031-swn-faction-turn-engine.md, its Faction Events
// location-pairing follow-up, and docs/adr/0032-gmatlas-core-faction-
// provider.md). Split out of drawers/index.js (already 2287+ lines before
// this feature) purely for size — the panel itself isn't part of the
// normal DRAWERS tab-stack mechanism (see shell.js's mc-faction-events
// skeleton/CSS, modeled on the doc viewer), so this file's one export is
// called directly from shell.js's render(), not through drawers/index.js's
// renderDrawer() switch.
//
// Propose-then-confirm: `factionEventsDrafts` (ephemeral UI state living
// in shell.js, never persisted) holds the current batch of proposed-but-
// not-committed turn drafts — a review list the GM reads before Commit
// All/Discard. The committed feed below it is the real, persisted
// `campaign.factionEvents`, filterable by faction AND by location (the
// WHO tab jumps here filtered by faction; WHERE jumps here filtered by
// location). Each entry is a Faction-Location pair: `coLocatedFactions`
// names every other faction present there (tagged ally/rival/neutral),
// and `witnessed` decides whether it renders as directly observed or as
// news from elsewhere.
//
// Faction Roster (docs/adr/0032): a new section between the Step/Full
// Round controls and the event feed. With no faction filter selected, a
// compact read-only list (name/HP/FacCreds/current goal + a "Manage"
// button); with one selected, the SAME editable `factionTurnSectionHtml`
// card the Cast inspector renders (imported from drawers/index.js, not
// duplicated) — every dropdown/button/status field live, right inside
// this panel. Only ever one faction's full card at a time, matching that
// function's own single-entity-card design.

import { listEntities, getEntity, computeFactionMaxHp } from '../../domain/entities.js';
import { factionProviderFor } from '../../data/factionRulesProviders.js';
import { factionTurnSectionHtml } from './index.js';
import { buildMentionEditorHTML } from '../mentionEditor.js';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const ACTION_LABEL = {
  attack: 'Attack', buyAsset: 'Buy Asset', sellAsset: 'Sell Asset', repairAssetOrFaction: 'Repair',
  refitAsset: 'Refit Asset', expandInfluence: 'Expand Influence', changeHomeworld: 'Change Homeworld',
  seizePlanet: 'Seize Planet', useAssetAbility: 'Use Asset Ability', none: 'No action', busy: 'In transit',
};

const STANCE_LABEL = { ally: 'Ally', rival: 'Rival', neutral: 'Neutral' };

function coLocatedChips(coLocatedFactions) {
  if (!coLocatedFactions || !coLocatedFactions.length) return '';
  const chips = coLocatedFactions.map((f) => `<span class="chip sm stance-${esc(f.stance)}">${esc(f.factionName)} <span class="dim small">(${esc(STANCE_LABEL[f.stance] || f.stance)})</span></span>`).join('');
  return `<div class="faction-event-colocated">${chips}</div>`;
}

/** One line per faction reaction (docs/adr/0032's regional response
 *  logging) — only ever present on a `scope:'faction-vs-world'` event. */
function responsesHtml(responses) {
  if (!responses || !responses.length) return '';
  const lines = responses.map((r) => `<p class="dim small faction-event-response">${esc(r.factionName)} ${esc(r.statement)}</p>`).join('');
  return `<div class="faction-event-responses">${lines}</div>`;
}

function draftRow(draft, doc) {
  const e = draft.event || {};
  const loc = e.locationId ? getEntity(doc, e.locationId) : null;
  return `<div class="thread-row">
    <span class="thread-name">${esc(draft.factionName || 'Unknown')} <span class="dim small">— ${esc(ACTION_LABEL[draft.action] || draft.action)}${e.outcome ? ` (${esc(e.outcome)})` : ''}${loc ? ` @ ${esc(loc.name)}` : ''}</span></span>
  </div>
  <p class="dim small">${esc(e.narrative || '')}${e.rollsSummary ? ` <span class="dim small">[${esc(e.rollsSummary)}]</span>` : ''}</p>
  ${coLocatedChips(e.coLocatedFactions)}
  ${responsesHtml(e.responses)}`;
}

/** A witnessed entry reads as directly observed (no framing needed — the
 *  narrative already reads that way); a non-witnessed one gets a "News
 *  from {location}:" prefix at display time only — the stored narrative
 *  text itself always stays clean/reusable. */
function framedNarrative(entry, locationName) {
  const narrative = esc(entry.narrative || '');
  if (entry.witnessed || !locationName) return narrative;
  return `<span class="faction-event-news-tag">News from ${esc(locationName)}:</span> ${narrative}`;
}

function eventEntryRow(entry, doc) {
  const loc = entry.locationId ? getEntity(doc, entry.locationId) : null;
  const readAloud = entry.readAloud
    ? `<div class="rich-field"><div class="mention-editor" contenteditable="true" data-faction-event-readaloud="${esc(entry.id)}" data-placeholder="Read-aloud text">${buildMentionEditorHTML(doc, entry.readAloud)}</div></div>`
    : `<button class="btn ghost sm" data-faction-event-expand-readaloud="${esc(entry.id)}">🎭 Expand to Read-Aloud</button>`;
  return `<div class="thread-row">
    <span class="thread-name">Turn ${entry.turnNumber} — ${esc(entry.factionName || 'Unknown')} <span class="dim small">— ${esc(ACTION_LABEL[entry.action] || entry.action)}${entry.outcome ? ` (${esc(entry.outcome)})` : ''}${loc ? ` @ ${esc(loc.name)}` : ''}</span></span>
    <span class="dim small">${new Date(entry.createdAt).toLocaleString()}</span>
  </div>
  <p class="dim small">${framedNarrative(entry, loc && loc.name)}${entry.rollsSummary ? ` <span class="dim small">[${esc(entry.rollsSummary)}]</span>` : ''}</p>
  ${coLocatedChips(entry.coLocatedFactions)}
  ${responsesHtml(entry.responses)}
  ${readAloud}`;
}

/** No faction filter selected: a compact read-only roster (name/HP/
 *  FacCreds/current goal + a "Manage" button per faction, which sets the
 *  faction filter — same state the WHO/WHERE jump chips and the faction
 *  filter dropdown already drive). A filter IS selected: the one full,
 *  live-editable Faction Turn card for that faction (drawers/index.js's
 *  factionTurnSectionHtml, reused verbatim — every dropdown/button on it
 *  already carries its own explicit faction id, so it works correctly
 *  here regardless of which entity is "active" in Cast). */
function renderFactionRoster(doc, factionEventsFactionFilterId) {
  const factions = listEntities(doc, 'faction');
  if (!factions.length) return '';
  const selected = factionEventsFactionFilterId ? factions.find((f) => f.id === factionEventsFactionFilterId) : null;
  if (selected) {
    return `<div class="faction-roster">
      <div class="faction-roster-head"><h3>Faction Roster</h3><button class="btn ghost sm" data-faction-events-roster-clear>← All factions</button></div>
      ${factionTurnSectionHtml(doc, selected)}
    </div>`;
  }
  const rows = factions.map((f) => {
    const maxHp = computeFactionMaxHp(f);
    const goal = f.currentGoalId ? factionProviderFor(doc, f).findGoal(f.currentGoalId) : null;
    return `<div class="thread-row">
      <span class="thread-name">${esc(f.name || 'Unnamed faction')} <span class="dim small">— ${Number(f.hp) || 0}/${maxHp} HP, ${Number(f.facCreds) || 0} FacCred${Number(f.facCreds) === 1 ? '' : 's'}${goal ? `, pursuing ${esc(goal.name)}` : ''}</span></span>
      <span class="thread-actions"><button class="btn ghost sm" data-faction-events-roster-manage="${esc(f.id)}">Manage →</button></span>
    </div>`;
  }).join('');
  return `<div class="faction-roster">
    <h3>Faction Roster</h3>
    ${rows}
  </div>`;
}

export function renderFactionEvents(doc, { factionEventsDrafts, factionEventsFactionFilterId, factionEventsLocationFilterId } = {}) {
  const factions = listEntities(doc, 'faction');
  const locations = listEntities(doc, 'location');
  const log = Array.isArray(doc.factionEvents) ? doc.factionEvents : [];
  const filtered = log
    .filter((e) => !factionEventsFactionFilterId || e.factionId === factionEventsFactionFilterId || (e.coLocatedFactions || []).some((c) => c.factionId === factionEventsFactionFilterId))
    .filter((e) => !factionEventsLocationFilterId || e.locationId === factionEventsLocationFilterId);
  const feed = filtered.slice().reverse();

  const draftsHtml = factionEventsDrafts
    ? `<div class="faction-events-review">
        <h3>Reviewing ${factionEventsDrafts.length} draft${factionEventsDrafts.length === 1 ? '' : 's'}</h3>
        ${factionEventsDrafts.map((d) => draftRow(d, doc)).join('') || '<p class="dim small">Nothing proposed.</p>'}
        <div class="action-bar">
          <button class="btn primary sm" data-faction-events-commit ${factionEventsDrafts.length ? '' : 'disabled'}>✓ Commit${factionEventsDrafts.length > 1 ? ' All' : ''}</button>
          <button class="btn ghost sm" data-faction-events-discard>✕ Discard</button>
        </div>
      </div>`
    : '';

  return `
    <div class="faction-events-controls">
      <div class="faction-events-controls-row">
        <select data-faction-events-step-select>
          <option value="">— pick a faction to step —</option>
          ${factions.map((f) => `<option value="${esc(f.id)}">${esc(f.name || 'Unnamed faction')}</option>`).join('')}
        </select>
        <button class="btn ghost sm" data-faction-events-step-go>▶ Step</button>
        <button class="btn ghost sm" data-faction-events-full-round>▶▶ Full Round</button>
      </div>
      ${!factions.length ? '<p class="dim small">No Faction entities yet — tag an entity as a Faction in Cast first.</p>' : ''}
    </div>
    ${draftsHtml}
    <hr class="field-divider">
    ${renderFactionRoster(doc, factionEventsFactionFilterId)}
    <hr class="field-divider">
    <div class="faction-events-feed-head">
      <h3>Events</h3>
      <select data-faction-events-faction-filter>
        <option value="">All factions</option>
        ${factions.map((f) => `<option value="${esc(f.id)}" ${factionEventsFactionFilterId === f.id ? 'selected' : ''}>${esc(f.name || 'Unnamed faction')}</option>`).join('')}
      </select>
      <select data-faction-events-location-filter>
        <option value="">All locations</option>
        ${locations.map((l) => `<option value="${esc(l.id)}" ${factionEventsLocationFilterId === l.id ? 'selected' : ''}>${esc(l.name || 'Unnamed location')}</option>`).join('')}
      </select>
    </div>
    ${feed.length ? feed.map((e) => eventEntryRow(e, doc)).join('') : '<p class="ws-placeholder">No faction turns committed yet — Step or Full Round above, then Commit.</p>'}`;
}
