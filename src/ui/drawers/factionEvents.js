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
import { factionsPresentAt, factionsAtLocation, getCurrentWhereLocations, getFactionGoalTrack, factionEventsByRound, getConflictEscalationTrack } from '../../domain/factionTurnEngine.js';
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

/** A clickable faction name — opens the Entity Editor (data-open-entity,
 *  the same universal mechanism every entity chip in the app already
 *  uses); `eventId`, when given, also carries data-open-entity-event so
 *  the Entity Editor can highlight/expand THAT specific turn's impact
 *  (direct request: clicking a faction name should show "the impact of
 *  the event on the faction," not just the faction in general). */
function factionNameLink(factionId, name, eventId) {
  if (!factionId) return esc(name || 'Unknown');
  const eventAttr = eventId ? ` data-open-entity-event="${esc(eventId)}"` : '';
  return `<button type="button" class="link-button" data-open-entity="${esc(factionId)}"${eventAttr}>${esc(name || 'Unnamed faction')}</button>`;
}

/** Structured "assets affected" (direct request — not buried in prose):
 *  reads the faction's own `impact` diff (computeImpact,
 *  factionTurnEngine.js), resolving each catalogId to its readable name
 *  via that faction's own provider. Empty string when there's nothing to
 *  show (a self-only action with no asset changes, or no impact data on
 *  an older pre-this-feature event). */
function assetsAffectedHtml(doc, faction, impact) {
  if (!impact || !faction) return '';
  const provider = factionProviderFor(doc, faction);
  const nameFor = (catalogId) => { const c = provider.findAssetAnyStat(catalogId); return c ? c.name : catalogId; };
  const lines = [
    ...(impact.assetsAdded || []).map((a) => `+ ${esc(nameFor(a.catalogId))} (new)`),
    ...(impact.assetsRemoved || []).map((a) => `− ${esc(nameFor(a.catalogId))} (lost)`),
    ...(impact.assetsChanged || []).map((a) => `${esc(nameFor(a.catalogId))}: ${a.hpBefore}→${a.hpAfter} HP${a.statusBefore !== a.statusAfter ? `, ${esc(a.statusBefore)}→${esc(a.statusAfter)}` : ''}`),
  ];
  if (!lines.length && !impact.hpDelta && !impact.facCredsDelta) return '';
  const statLine = (impact.hpDelta || impact.facCredsDelta)
    ? `<span class="dim small">${impact.hpDelta ? `${impact.hpDelta > 0 ? '+' : ''}${impact.hpDelta} HP ` : ''}${impact.facCredsDelta ? `${impact.facCredsDelta > 0 ? '+' : ''}${impact.facCredsDelta} FacCreds` : ''}</span>`
    : '';
  return `<div class="faction-event-impact">${statLine}${lines.length ? `<ul class="dim small">${lines.map((l) => `<li>${l}</li>`).join('')}</ul>` : ''}</div>`;
}

/** "The log of recent events for that location" (direct request) — every
 *  OTHER faction's activity there too, not just the one being reviewed,
 *  so the GM has situational context while deciding whether to accept a
 *  draft. Committed history only (a proposed-but-not-yet-committed draft
 *  isn't "recent events" yet). */
function recentEventsAtLocationHtml(doc, locationId, excludeEventId) {
  if (!locationId) return '';
  const recent = (doc.factionEvents || [])
    .filter((e) => e.locationId === locationId && e.id !== excludeEventId)
    .slice(-5).reverse();
  if (!recent.length) return '';
  const rows = recent.map((e) => `<p class="dim small">Turn ${e.turnNumber} — ${esc(e.factionName || 'Unknown')}: ${esc(e.narrative || ACTION_LABEL[e.action] || e.action)}</p>`).join('');
  return `<div class="faction-event-location-log"><span class="field-label-static">Recent events here</span>${rows}</div>`;
}

function draftRow(draft, doc) {
  const e = draft.event || {};
  const loc = e.locationId ? getEntity(doc, e.locationId) : null;
  const faction = getEntity(doc, draft.factionId);
  return `<div class="thread-row">
    <span class="thread-name">${factionNameLink(draft.factionId, draft.factionName)} <span class="dim small">— ${esc(ACTION_LABEL[draft.action] || draft.action)}${e.outcome ? ` (${esc(e.outcome)})` : ''}${loc ? ` @ ${esc(loc.name)}` : ''}</span></span>
  </div>
  <p class="dim small">${esc(e.narrative || '')}${e.rollsSummary ? ` <span class="dim small">[${esc(e.rollsSummary)}]</span>` : ''}</p>
  ${assetsAffectedHtml(doc, faction, e.impact)}
  ${coLocatedChips(e.coLocatedFactions)}
  ${responsesHtml(e.responses)}
  ${recentEventsAtLocationHtml(doc, e.locationId, e.id)}`;
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
  const faction = getEntity(doc, entry.factionId);
  const readAloud = entry.readAloud
    ? `<div class="rich-field"><div class="mention-editor" contenteditable="true" data-faction-event-readaloud="${esc(entry.id)}" data-placeholder="Read-aloud text">${buildMentionEditorHTML(doc, entry.readAloud)}</div></div>`
    : `<button class="btn ghost sm" data-faction-event-expand-readaloud="${esc(entry.id)}">🎭 Expand to Read-Aloud</button>`;
  return `<div class="thread-row">
    <span class="thread-name">Turn ${entry.turnNumber} — ${factionNameLink(entry.factionId, entry.factionName, entry.id)} <span class="dim small">— ${esc(ACTION_LABEL[entry.action] || entry.action)}${entry.outcome ? ` (${esc(entry.outcome)})` : ''}${loc ? ` @ ${esc(loc.name)}` : ''}</span></span>
    <span class="dim small">${new Date(entry.createdAt).toLocaleString()}</span>
  </div>
  <p class="dim small">${framedNarrative(entry, loc && loc.name)}${entry.rollsSummary ? ` <span class="dim small">[${esc(entry.rollsSummary)}]</span>` : ''}</p>
  ${assetsAffectedHtml(doc, faction, entry.impact)}
  ${coLocatedChips(entry.coLocatedFactions)}
  ${responsesHtml(entry.responses)}
  ${readAloud}`;
}

/** Deduplicated stance-tagged chips for every OTHER faction present at
 *  `locationId` right now — the "social and political ramifications"
 *  half of the activity summary below, computed live (not a frozen
 *  snapshot like a committed event's own coLocatedFactions). Reuses
 *  coLocatedChips' exact chip markup. */
function liveStanceChips(doc, factionId, locationId) {
  if (!locationId) return '';
  const seen = new Map();
  for (const entry of factionsAtLocation(doc, factionId, locationId)) {
    if (!seen.has(entry.faction.id)) seen.set(entry.faction.id, { factionName: entry.faction.name || 'Unnamed faction', stance: entry.stance });
  }
  return coLocatedChips(Array.from(seen.values()));
}

/** The Faction Events version of a faction's card — deliberately narrow:
 *  current activity (goal + progress, busy/seizing status, HP/FacCreds as
 *  read-only context) and social/political ramifications (live stance
 *  toward whoever else is at the same Active Location, plus this
 *  faction's own recent event history) — NOT the full stat sheet (HP/
 *  FacCreds/XP inputs, Homeworld, Bases, Tags, buy/sell/repair/refit
 *  asset controls), which is the Entity Editor's job exclusively
 *  (drawers/index.js's factionTurnSectionHtml, reached here via "Open in
 *  Entity Editor →" — data-open-entity, the same universal mechanism
 *  every other entity chip in the app already uses). Direct request:
 *  "Factions should display everything... in the Entities Editor, but
 *  Faction Events should only include the details about the current
 *  activities and social and political ramifications." */
function factionActivitySummaryHtml(doc, f, activeLocationId) {
  const provider = factionProviderFor(doc, f);
  const goal = f.currentGoalId ? provider.findGoal(f.currentGoalId) : null;
  const goalTrack = f.currentGoalId ? getFactionGoalTrack(doc, f.id) : null;
  const goalPips = goalTrack ? Array.from({ length: goalTrack.segments }, (_, i) => `<span class="pip ${i < goalTrack.filled ? 'on' : ''}"></span>`).join('') : '';
  const busy = !!(f.busyUntilTurn && f.busyUntilTurn > (doc.factionTurnNumber || 0));
  const seizeLoc = f.seizeProgress ? getEntity(doc, f.seizeProgress.locationId) : null;
  const maxHp = computeFactionMaxHp(f);
  const stanceChips = liveStanceChips(doc, f.id, activeLocationId);
  const recent = (doc.factionEvents || []).filter((e) => e.factionId === f.id).slice(-3).reverse();
  const recentHtml = recent.length
    ? recent.map((e) => `<p class="dim small">Turn ${e.turnNumber} — ${esc(e.narrative || ACTION_LABEL[e.action] || e.action)}</p>`).join('')
    : '<p class="dim small">No activity logged yet.</p>';
  return `<div class="faction-card">
    <h4>${esc(f.name || 'Unnamed faction')} <span class="dim small">— ${Number(f.hp) || 0}/${maxHp} HP, ${Number(f.facCreds) || 0} FacCred${Number(f.facCreds) === 1 ? '' : 's'}</span></h4>
    ${goal ? `<div class="thread-row thread-status-${esc(goalTrack ? goalTrack.status : '')} ${goalTrack && goalTrack.done ? 'done' : ''}">
      <span class="thread-name">Pursuing: ${esc(goal.name)} <span class="dim small">${esc(goal.description || '')}</span></span>
      ${goalTrack ? `<span class="thread-clock" title="${goalTrack.filled}/${goalTrack.segments}">${goalPips}</span>` : ''}
    </div>` : '<p class="dim small">No current goal.</p>'}
    ${busy ? `<p class="dim small">🚀 In transit until turn ${f.busyUntilTurn}.</p>` : ''}
    ${f.seizeProgress ? `<p class="dim small">⚔ Seizing ${esc(seizeLoc ? seizeLoc.name : 'a world')} — ${f.seizeProgress.remainingHp} HP resistance remains.</p>` : ''}
    ${stanceChips ? `<div class="faction-assets"><span class="field-label-static">Relations here</span>${stanceChips}</div>` : ''}
    <div class="faction-assets">
      <span class="field-label-static">Recent activity</span>
      ${recentHtml}
    </div>
    <button type="button" class="btn ghost sm" data-open-entity="${esc(f.id)}">✎ Open in Entity Editor →</button>
  </div>`;
}

/** No faction filter selected: a compact read-only roster — listing only
 *  `activeFactions` (whoever's actually present at WHERE's own current
 *  Active Location, per `factionsPresentAt`), not every faction in the
 *  campaign — with a "Manage" button per faction, which sets the faction
 *  filter (same state the WHO/WHERE jump chips and the faction filter
 *  dropdown already drive) to show its activity summary above. Management
 *  stays available for a faction reached via a filter/jump even if it's
 *  since left the Active Location — only the LISTED roster is
 *  location-scoped, not an already-open card. */
function renderFactionRoster(doc, factionEventsFactionFilterId, activeFactions, activeLocationId) {
  const allFactions = listEntities(doc, 'faction');
  const selected = factionEventsFactionFilterId ? allFactions.find((f) => f.id === factionEventsFactionFilterId) : null;
  if (selected) {
    return `<div class="faction-roster">
      <div class="faction-roster-head"><h3>Faction Roster</h3><button class="btn ghost sm" data-faction-events-roster-clear>← All factions</button></div>
      ${factionActivitySummaryHtml(doc, selected, activeLocationId)}
    </div>`;
  }
  if (!activeFactions.length) return '';
  const rows = activeFactions.map((f) => {
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

const MISSION_STATUS_LABEL = { open: 'Open', accepted: 'Accepted', resolved: 'Resolved', declined: 'Declined' };

/** Living Faction Engine Phase C: persisted missions (campaign.missions[],
 *  domain/missions.js) — a hot faction's activity turned into something
 *  the party can actually accept/decline/resolve, not just Co-Pilot
 *  narration. Every mission is listed regardless of source (a GM can also
 *  generate a source-less one via the existing Journal button) — the
 *  source-faction chip is blank for those. Status changes are a single
 *  click (Article II: the GM decides, nothing here auto-advances a
 *  mission's status). */
function renderMissionsSection(doc) {
  const missions = Array.isArray(doc.missions) ? doc.missions : [];
  if (!missions.length) return '';
  const rows = missions.slice().reverse().map((m) => {
    const faction = m.sourceFactionId ? getEntity(doc, m.sourceFactionId) : null;
    const actions = m.status === 'open'
      ? `<button class="btn ghost sm" data-mission-status="${esc(m.id)}::accepted">Accept</button><button class="btn ghost sm" data-mission-status="${esc(m.id)}::declined">Decline</button>`
      : m.status === 'accepted'
        ? `<button class="btn ghost sm" data-mission-status="${esc(m.id)}::resolved">Resolve</button>`
        : '';
    return `<div class="thread-row">
      <span class="thread-name">${esc(m.title || 'New job available')} <span class="dim small">— danger ${m.danger}/10, payout ${m.payout}, ${m.deadlineDays} day${m.deadlineDays === 1 ? '' : 's'}${faction ? `, from ${esc(faction.name)}` : ''} <span class="chip sm">${esc(MISSION_STATUS_LABEL[m.status] || m.status)}</span></span></span>
      <span class="thread-actions">${actions}<button class="icon-btn" data-mission-remove="${esc(m.id)}" title="Remove">✕</button></span>
    </div>
    ${m.complication ? `<p class="dim small">Complication: ${esc(m.complication)}</p>` : ''}`;
  }).join('');
  return `<div class="faction-roster">
    <h3>Missions</h3>
    ${rows}
  </div>`;
}

const CONFLICT_STATUS_LABEL_SHORT = { cold: 'Cold', simmering: 'Simmering', active: 'Active', escalated: 'Escalated', open_war: 'Open War', resolved: 'Resolved' };

/** Faction Conflict (Living Faction Engine) — a compact list, mirroring
 *  the Roster/Missions sections above; full management (the escalation
 *  clock, cause fields, session hooks, "Add depth") lives on the
 *  conflict's own Entity Editor card (drawers/index.js's
 *  conflictSection) — clicking a conflict's name opens it, same
 *  data-open-entity mechanism as everywhere else. Kept this narrow
 *  deliberately, same reasoning as the Faction Roster's own activity
 *  summary: Faction Events surfaces what's current, the Entity Editor
 *  holds everything. */
function renderConflictsSection(doc) {
  const conflicts = listEntities(doc, 'conflict');
  if (!conflicts.length) return '';
  const rows = conflicts.map((c) => {
    const track = getConflictEscalationTrack(doc, c.id);
    return `<div class="thread-row">
      <span class="thread-name">${factionNameLink(c.id, c.name || 'Unnamed conflict')} <span class="dim small">— ${esc(CONFLICT_STATUS_LABEL_SHORT[c.status] || c.status)}${track ? `, escalation ${track.filled}/${track.segments}` : ''}</span></span>
    </div>`;
  }).join('');
  return `<div class="faction-roster">
    <h3>Conflicts</h3>
    ${rows}
  </div>`;
}

/** Round History (direct request: "I want to see the history of faction
 *  turns per round") — every committed round, most recent first, each
 *  expandable to every faction's turn that round. A read-only browsing
 *  view, collapsed by default (a campaign can accumulate many rounds) —
 *  no retcon or editing here, just history. */
function renderRoundHistoryToggle(open) {
  return `<button class="btn ghost sm" data-faction-round-history-toggle>${open ? '▾' : '▸'} Round History</button>`;
}

function renderRoundHistory(doc, open) {
  if (!open) return '';
  const rounds = factionEventsByRound(doc);
  if (!rounds.length) return '<p class="dim small">No faction turns committed yet.</p>';
  const rows = rounds.map(({ turnNumber, events }) => {
    const entries = events.map((e) => {
      const loc = e.locationId ? getEntity(doc, e.locationId) : null;
      return `<div class="thread-row">
        <span class="thread-name">${factionNameLink(e.factionId, e.factionName, e.id)} <span class="dim small">— ${esc(ACTION_LABEL[e.action] || e.action)}${e.outcome ? ` (${esc(e.outcome)})` : ''}${loc ? ` @ ${esc(loc.name)}` : ''}</span></span>
      </div>`;
    }).join('');
    return `<div class="faction-turn-history-round"><span class="field-label-static">Turn ${turnNumber}</span>${entries}</div>`;
  }).join('');
  return `<div class="faction-roster">${rows}</div>`;
}

/** `docked` (default false) is true only when this same pure render
 *  function is called a SECOND way — from workspace/index.js's WHERE view,
 *  after the GM moves the whole card there via its own down-arrow (direct
 *  request). Docked mode adds its own heading (the drawer normally
 *  supplies "Faction Events" as chrome this function never renders) plus
 *  an up-arrow that pops it back to the drawer tab group; un-docked mode
 *  (the normal drawer body) gets the small down-arrow instead. Whichever
 *  mode is active, the card only ever renders in ONE place at a time —
 *  shell.js closes the drawer tab the moment it's docked, and re-opens it
 *  the moment it's undocked (see data-faction-events-dock/-undock). */
/** Faction Turn × Conflict escalation suggestions (docs/adr/0036 follow-
 *  up): computed right after a commit (suggestedConflictEscalations,
 *  shell.js), rendered right where the draft review used to be — a
 *  dismissible, one-click "did this affect a tracked conflict?" prompt.
 *  Escalate/Dismiss are both handled in shell.js; this is pure display. */
function conflictEscalationSuggestionsHtml(suggestions) {
  if (!suggestions || !suggestions.length) return '';
  const rows = suggestions.map((s) => `<div class="thread-row">
      <span class="thread-name">${esc(s.factionName || 'A faction')}'s move may affect <b>${esc(s.conflictName)}</b> <span class="dim small">${esc(s.narrative || '')}</span></span>
      <span class="thread-actions">
        <button class="btn ghost sm" data-conflict-escalation-apply="${esc(s.conflictId)}::${esc(s.eventId)}">⚡ Escalate</button>
        <button class="icon-btn" data-conflict-escalation-dismiss="${esc(s.conflictId)}::${esc(s.eventId)}" title="Dismiss">✕</button>
      </span>
    </div>`).join('');
  return `<div class="faction-events-review">
    <h3>This may affect a tracked conflict</h3>
    ${rows}
  </div>`;
}

export function renderFactionEvents(doc, { factionEventsDrafts, factionEventsFactionFilterId, factionEventsLocationFilterId, factionEventsStepFactionId, factionRoundHistoryOpen = false, conflictEscalationSuggestions, docked = false } = {}) {
  const allFactions = listEntities(doc, 'faction');
  const locations = listEntities(doc, 'location');
  // "Active Location" — WHERE's own current Focus @mention(s), the same
  // single source of truth getCurrentWhereLocations already established
  // for the WHO/WHERE Faction Events tie-in chips. Everything below that
  // manages/lists factions (Step, Roster) scopes to whoever's actually
  // present there (factionsPresentAt, Living Faction Engine Phase A) —
  // not every faction in the campaign — per direct request; the committed
  // Events feed below defaults its own location filter to it too, but
  // isn't restricted to only it (a GM can still browse other locations'
  // history there).
  const activeLocation = getCurrentWhereLocations(doc)[0] || null;
  const activeFactions = activeLocation ? factionsPresentAt(doc, activeLocation.id) : [];
  const stepSelected = factionEventsStepFactionId ? activeFactions.find((f) => f.id === factionEventsStepFactionId) : null;

  const log = Array.isArray(doc.factionEvents) ? doc.factionEvents : [];
  // The location filter defaults to the Active Location until the GM
  // explicitly touches the dropdown this session (null/undefined —
  // shell.js's ephemeral factionEventsLocationFilterId starts unset, not
  // '') — '' once explicitly chosen means a deliberate "All locations",
  // not "not yet decided," so it's never silently overridden back.
  const locationFilterTouched = factionEventsLocationFilterId != null;
  const effectiveLocationFilterId = locationFilterTouched ? factionEventsLocationFilterId : (activeLocation ? activeLocation.id : '');
  const filtered = log
    .filter((e) => !factionEventsFactionFilterId || e.factionId === factionEventsFactionFilterId || (e.coLocatedFactions || []).some((c) => c.factionId === factionEventsFactionFilterId))
    .filter((e) => !effectiveLocationFilterId || e.locationId === effectiveLocationFilterId);
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

  // Priority: no Faction entities at all beats "no Active Location" beats
  // "Active Location set, but nothing of note is present there yet."
  const controlsNotice = !allFactions.length
    ? '<p class="dim small">No Faction entities yet — tag an entity as a Faction in Cast first.</p>'
    : !activeLocation
      ? '<p class="dim small">⚠ Select a Location on the WHERE tab first — Faction Events scopes to whoever\'s active there.</p>'
      : !activeFactions.length
        ? `<p class="dim small">No factions active at ${esc(activeLocation.name)} yet.</p>`
        : '';

  const dockRow = docked
    ? `<div class="faction-events-dock-row"><h3>⚔ Faction Events</h3><button type="button" class="icon-btn" data-faction-events-undock title="Pop back to the Faction Events tab" aria-label="Pop back to the Faction Events tab">⬆</button></div>`
    : `<div class="faction-events-dock-row"><button type="button" class="icon-btn" data-faction-events-dock title="Move to the WHERE workspace" aria-label="Move to the WHERE workspace">⬇</button></div>`;

  return `
    ${dockRow}
    <div class="faction-events-controls">
      <div class="faction-events-controls-row">
        <select data-faction-events-step-select ${activeFactions.length ? '' : 'disabled'}>
          <option value="">— pick a faction to step —</option>
          ${activeFactions.map((f) => `<option value="${esc(f.id)}" ${stepSelected && stepSelected.id === f.id ? 'selected' : ''}>${esc(f.name || 'Unnamed faction')}</option>`).join('')}
        </select>
        <button class="btn ghost sm" data-faction-events-step-go>▶ Step</button>
        <button class="btn ghost sm" data-faction-events-full-round>▶▶ Full Round</button>
      </div>
      ${stepSelected ? `<p class="dim small">Selected: <strong>${esc(stepSelected.name || 'Unnamed faction')}</strong></p>` : ''}
      ${controlsNotice}
    </div>
    ${draftsHtml}
    ${conflictEscalationSuggestionsHtml(conflictEscalationSuggestions)}
    <hr class="field-divider">
    ${renderFactionRoster(doc, factionEventsFactionFilterId, activeFactions, activeLocation ? activeLocation.id : null)}
    <hr class="field-divider">
    ${renderMissionsSection(doc)}
    <hr class="field-divider">
    ${renderConflictsSection(doc)}
    <hr class="field-divider">
    ${renderRoundHistoryToggle(factionRoundHistoryOpen)}
    ${renderRoundHistory(doc, factionRoundHistoryOpen)}
    <hr class="field-divider">
    <div class="faction-events-feed-head">
      <h3>Events</h3>
      <select data-faction-events-faction-filter>
        <option value="">All factions</option>
        ${allFactions.map((f) => `<option value="${esc(f.id)}" ${factionEventsFactionFilterId === f.id ? 'selected' : ''}>${esc(f.name || 'Unnamed faction')}</option>`).join('')}
      </select>
      <select data-faction-events-location-filter>
        <option value="">All locations</option>
        ${locations.map((l) => `<option value="${esc(l.id)}" ${effectiveLocationFilterId === l.id ? 'selected' : ''}>${esc(l.name || 'Unnamed location')}</option>`).join('')}
      </select>
    </div>
    ${feed.length ? feed.map((e) => eventEntryRow(e, doc)).join('') : '<p class="ws-placeholder">No faction turns committed yet — Step or Full Round above, then Commit.</p>'}`;
}
