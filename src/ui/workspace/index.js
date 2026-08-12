// workspace/index.js — the Storyboard's Composer and Navigator cards (the
// former WHO/WHERE/WHAT/WHY/HOW tabs were retired in favor of open/
// collapsible sections inside Composer; the suggestion/oracle logic that
// used to live on those tabs moved to copilotPanel.js — the Advisor —
// instead, see that file's own header comment). Editing dispatches through
// the shell's delegated handlers (change + click) so this stays a pure
// render function.

import { contextSummary } from '../../domain/context.js';
import { listThreads, THREAD_STATUSES, THREAD_STATUS_LABELS, THREAD_PRIORITIES } from '../../domain/threads.js';
import { ACTIVITIES } from '../../domain/activities.js';
import { listTagVocabulary, isSameDistrict, getEntity, listEntities, getContainingLocation, getContainedLocations, LOCATION_OBJECT_TYPES } from '../../domain/entities.js';
import { getCurrentWhereLocations, factionsPresentAt, factionsInRegion } from '../../domain/factionTurnEngine.js';
import { oracleLinkTagsFor } from '../../data/entityFieldOracleLinks.js';
import { buildMentionEditorHTML, richToolbarHTML, toolbarCollapsed } from '../mentionEditor.js';
import { renderFactionEvents } from '../drawers/factionEvents.js';
import { CONFLICT_STATUS_OPTIONS } from '../drawers/index.js';
import { openForeshadowing } from '../../domain/foreshadowing.js';
import { WORLD_FLAG_VALUES, WORLD_FLAG_VALUE_LABEL } from '../../domain/worldFlags.js';
import { composeNarrativeDraft, gatherSceneContext } from '../../domain/copilot.js';
import { getNpcSceneState } from '../../domain/scenes.js';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const INTENTS = ['Discovery', 'Travel', 'Social encounter', 'Investigation', 'Resource pressure', 'Combat pressure', 'Moral choice', 'Faction complication', 'Exploration hazard', 'Trade opportunity'];

// The title/lead stay fixed at the top of the card; only .workspace-card-body
// scrolls (styles/cockpit.css) — this is what lets Composer and Navigator
// each be independently scrolled to their own bottom on desktop/tablet,
// instead of one sharing a scrollbar with the other via position:sticky
// (which silently clips whichever content is taller than the viewport,
// a real reported bug — Navigator's bottom was unreachable until Composer
// was scrolled all the way down). `lead` is optional — a falsy value omits
// the paragraph entirely rather than rendering an empty one (Navigator has
// no lead, on direct request). The body's own inner wrapper
// (.workspace-card-body-inner) carries the normal right padding the card
// itself no longer does, so .workspace-card-body's scrollbar can sit right
// at the panel's edge (also direct request) without the actual text
// touching it.
function card(title, lead, body, extraClass) {
  const leadHtml = lead ? `<p class="lead">${lead}</p>` : '';
  return `<article class="workspace-card${extraClass ? ` ${extraClass}` : ''}"><h2>${title}</h2>${leadHtml}<div class="workspace-card-body"><div class="workspace-card-body-inner">${body}</div></div></article>`;
}

// One collapsible Dashboard section per former W-tab (docs/adr/0040 Phase
// 12f) — same toggle-button convention already established by
// `basesOfInfluenceHtml` in drawers/index.js (a `.section-head-row` +
// `▾/▸` toggle button + conditional body), not a new pattern. Collapsed
// state is ephemeral (`ui.expandedDashboardSections`, shell.js), default
// open on first load. The collapsed-state summary reuses `contextSummary`
// (domain/context.js) — the exact function that used to label the old tab
// strip buttons — stripped of HTML/mention-bracket markup and truncated,
// since it's plain header text here, not a rich field.
function dashboardSection(key, title, lead, bodyHtml, doc, ui) {
  const expanded = ((ui && ui.expandedDashboardSections) || new Set()).has(key);
  const rawSummary = contextSummary(doc.context, key)
    .replace(/<[^>]+>/g, ' ')
    .replace(/@\[([^\]|]+)(?:\|[^\]]*)?\]/g, '$1')
    .replace(/@([A-Za-z0-9_'-]+)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  const summary = rawSummary.length > 70 ? `${rawSummary.slice(0, 70)}…` : rawSummary;
  return `<section class="dashboard-section" data-dashboard-section="${esc(key)}">
    <div class="section-head-row">
      <button type="button" class="btn ghost sm dashboard-section-toggle" data-dashboard-section-toggle="${esc(key)}">${expanded ? '▾' : '▸'} ${esc(title)}</button>
      ${!expanded && summary ? `<span class="dim small dashboard-section-summary">${esc(summary)}</span>` : ''}
    </div>
    ${expanded ? `<p class="lead dashboard-section-lead">${esc(lead)}</p><div class="dashboard-section-body">${bodyHtml}</div>` : ''}
  </section>`;
}

function whoSectionBody(doc, ui) {
  return `
    ${summaryField('who', doc.context.who.summary, 'Party, NPCs, factions present…', doc, ui)}
    <div class="shift-actions">
      <button class="chip" data-shift-prompt="Introduce NPC">＋ Introduce NPC</button>
    </div>
    ${npcSceneGroupsBlock(doc, ui)}
    ${whoEntityPicker(doc, ui)}
    ${factionsActiveNearbyBlock(doc)}
    ${activeConflictLocationPicker(doc)}`;
}

// Shared label + 🎲-roll + editable-text row (docs/adr/0041 Phase 13a/13b)
// — used for both an NPC's 5 scene-scoped fields below and WHERE's
// Location Details sensory fields further down. `value` is whatever's
// currently rolled/typed; the roll button re-rolls from the field's
// mapped oracle table (session.js), the input commits an edit on blur/
// change, which — if the current value came from a roll — ALSO writes
// back through oracles.overrides (the "remembered" half).
function oracleFieldRow(label, value, rollAttr, fieldAttr) {
  return `<div class="oracle-field-row">
    <span class="field-label-static">${esc(label)}</span>
    <button type="button" class="icon-btn" ${rollAttr} title="Roll ${esc(label)}">🎲</button>
    <input type="text" class="thread-name-input" ${fieldAttr} value="${esc(value)}" placeholder="—">
  </div>`;
}

// One NPC's scene-scoped card (docs/adr/0041 Phase 13b) — collapsed to
// just its name chip by default (ui.expandedSceneNpcs, ephemeral),
// expanding to the already-existing permanent `currentGoal` field
// (entities.js, reused as-is) plus the 5 new scene-scoped fields
// (Disposition/Motivation/Threat Rank/Challenges/Opportunities), each
// oracle-seedable and edited in place. `removable` (Bystanders only —
// Protagonists/Antagonists are derived from WHO's own @mentions + the
// #character tag, not a GM-curated list, so there's nothing to remove
// them FROM) adds a ✕ that drops the NPC from this scene's bystander list
// without touching the entity itself.
function npcSceneCard(doc, ui, scene, npc, { removable = false } = {}) {
  const expanded = ((ui && ui.expandedSceneNpcs) || new Set()).has(npc.id);
  const state = getNpcSceneState(scene, npc.id);
  return `<div class="npc-scene-card">
    <div class="section-head-row">
      <button type="button" class="entity-chip" data-open-entity="${esc(npc.id)}">${esc(npc.name || 'Unnamed')}</button>
      <span class="npc-scene-card-actions">
        ${removable ? `<button type="button" class="icon-btn" data-scene-bystander-remove="${esc(npc.id)}" title="Remove from this scene">✕</button>` : ''}
        <button type="button" class="icon-btn" data-scene-npc-toggle="${esc(npc.id)}" title="${expanded ? 'Collapse' : 'Expand'}">${expanded ? '▾' : '▸'}</button>
      </span>
    </div>
    ${expanded ? `<div class="npc-scene-card-body">
      <label class="field-label sm">Current goal
        <input type="text" data-npc-current-goal="${esc(npc.id)}" value="${esc(npc.currentGoal || '')}" placeholder="What do they want right now?">
      </label>
      ${oracleFieldRow('Disposition', state.disposition.value, `data-scene-npc-roll="${esc(npc.id)}::disposition"`, `data-scene-npc-field="${esc(npc.id)}::disposition"`)}
      ${oracleFieldRow('Motivation', state.motivation.value, `data-scene-npc-roll="${esc(npc.id)}::motivation"`, `data-scene-npc-field="${esc(npc.id)}::motivation"`)}
      ${oracleFieldRow('Threat Rank', state.threatRank.value, `data-scene-npc-roll="${esc(npc.id)}::threatRank"`, `data-scene-npc-field="${esc(npc.id)}::threatRank"`)}
      ${oracleFieldRow('Challenges', state.challenges.value, `data-scene-npc-roll="${esc(npc.id)}::challenges"`, `data-scene-npc-field="${esc(npc.id)}::challenges"`)}
      ${oracleFieldRow('Opportunities', state.opportunities.value, `data-scene-npc-roll="${esc(npc.id)}::opportunities"`, `data-scene-npc-field="${esc(npc.id)}::opportunities"`)}
    </div>` : ''}
  </div>`;
}

// WHO's three scene-scoped NPC groups (docs/adr/0041 Phase 13b) —
// Protagonists (#character-tagged NPCs mentioned in WHO's Focus) /
// Antagonists (every other NPC mentioned in WHO's Focus) are DERIVED
// live from gatherSceneContext's whoEntities + the existing tag
// mechanism, never stored — the same "Focus text is the single source of
// truth for who's in the scene" convention WHO/WHERE's own redesign
// already established. Bystanders are the one GM-curated list (there's
// no safe existing query for "physically nearby but unmentioned"). All
// three need an active scene to hang per-NPC state on — before the first
// "Continue Story," there's nothing to track yet.
function npcSceneGroupsBlock(doc, ui) {
  const scenes = doc.scenes || [];
  if (!scenes.length) return '<div class="ws-placeholder">Continue Story (Advisor) to start a scene — NPC roles and scene-specific details track per scene.</div>';
  const scene = scenes[scenes.length - 1];
  const ctx = gatherSceneContext(doc);
  const protagonists = ctx.whoEntities.filter((e) => e.type === 'npc' && (e.tags || []).includes('character'));
  const antagonists = ctx.whoEntities.filter((e) => e.type === 'npc' && !(e.tags || []).includes('character'));
  const bystanderIds = scene.bystanderIds || [];
  const bystanders = bystanderIds.map((id) => getEntity(doc, id)).filter(Boolean);
  const bystanderCandidates = listEntities(doc, ['npc']).filter((n) => !bystanderIds.includes(n.id));

  const group = (label, hint, npcs, opts) => `<div class="workspace-mini-section npc-scene-group">
    <span class="field-label-static">${esc(label)} (${npcs.length})</span>
    <p class="dim small">${esc(hint)}</p>
    ${npcs.length ? npcs.map((n) => npcSceneCard(doc, ui, scene, n, opts)).join('') : '<p class="dim small">None yet.</p>'}
  </div>`;

  return `
    ${group('Protagonists', "NPCs mentioned in WHO's Focus, tagged #character.", protagonists)}
    ${group('Antagonists', "Every other NPC mentioned in WHO's Focus.", antagonists)}
    <div class="workspace-mini-section npc-scene-group">
      <span class="field-label-static">Bystanders (${bystanders.length})</span>
      <p class="dim small">Observers you've added to this scene — react to events, not directly involved.</p>
      ${bystanders.length ? bystanders.map((n) => npcSceneCard(doc, ui, scene, n, { removable: true })).join('') : '<p class="dim small">None yet.</p>'}
      ${bystanderCandidates.length ? `<select data-scene-bystander-add>
        <option value="">— add a bystander —</option>
        ${bystanderCandidates.map((n) => `<option value="${esc(n.id)}">${esc(n.name || 'Unnamed')}</option>`).join('')}
      </select>` : '<p class="dim small">No other NPCs exist yet to add.</p>'}
    </div>`;
}

// WHERE's docked-Faction-Events side panel (whole-card relocation, direct
// request — see factionEventsDockedInWhere's original comment history)
// keeps its exact logic, just returns a fragment now instead of wrapping
// a whole top-level view — `locationSummaryHeader`'s quick-reference strip
// renders inline at the top instead of in a special header-row slot (that
// slot doesn't exist anymore now that `dashboardSection` supplies the
// section's own header).
function whereSectionBody(doc, ui) {
  const body = `
    ${locationSummaryHeader(doc)}
    ${locationDetailsBlock(doc, ui)}
    ${summaryField('where', doc.context.where.summary, 'Location and immediate surroundings…', doc, ui)}
    ${whereLocationPicker(doc, ui)}
    ${currentLocationBanner(doc)}
    ${locationFactionsBlock(doc)}
    ${locationConflictsBlock(doc)}
    ${nearbyLocationsBlock(doc)}
    ${factionActivityHereBlock(doc)}
    ${locationStoryBlock(doc, ui)}`;
  if (!ui.factionEventsDockedInWhere) return body;
  const dockedPanel = renderFactionEvents(doc, {
    factionEventsDrafts: ui.factionEventsDrafts,
    factionEventsFactionFilterId: ui.factionEventsFactionFilterId,
    factionEventsLocationFilterId: ui.factionEventsLocationFilterId,
    factionEventsStepFactionId: ui.factionEventsStepFactionId,
    factionRoundHistoryOpen: ui.factionRoundHistoryOpen,
    conflictEscalationSuggestions: ui.conflictEscalationSuggestions,
    docked: true,
  });
  return `<div class="workspace-with-side">${body}<aside class="workspace-docked-panel">${dockedPanel}</aside></div>`;
}

// Location Details (docs/adr/0041 Phase 13a) — an expander (collapsed by
// default, ui.expandedLocationDetails) on each current WHERE location
// showing the hierarchy the request asked for: "[immediate location]
// at/on the [object type] in the [star system] [sector]." A location is
// never the star itself, only a system object or something finer inside
// one (a facility/building/street) — a modeling constraint on what a GM
// creates as a Location entity, not new schema. Every field here (Object
// type/Star system/Sector, plus Sights/Smells/Sounds below) is a plain
// flat field on the location entity itself (entities.js's
// ensureWorldProfileFields/ensureLocationFields) — no structural parent
// walk needed for the title, unlike locationSummaryHeader's own District
// field just above this block, which DOES walk one hop via
// getContainingLocation.
function locationDetailsBlock(doc, ui) {
  const whereLocations = getCurrentWhereLocations(doc);
  if (!whereLocations.length) return '';
  return whereLocations.map((loc) => {
    const expanded = ((ui && ui.expandedLocationDetails) || new Set()).has(loc.id);
    const title = [
      esc(loc.name || 'Unnamed'),
      loc.objectType ? `at/on the ${esc(loc.objectType)}` : '',
      loc.starSystem ? `in the ${esc(loc.starSystem)}` : '',
      loc.sector ? `— ${esc(loc.sector)} Sector` : '',
    ].filter(Boolean).join(' ');
    return `<div class="workspace-mini-section location-details">
      <div class="section-head-row">
        <button type="button" class="btn ghost sm" data-location-details-toggle="${esc(loc.id)}">${expanded ? '▾' : '▸'} Location Details</button>
      </div>
      ${expanded ? `
        <p class="location-details-title">${title}</p>
        <div class="field-row-3col">
          <label class="field-label sm">Object type
            <select data-location-field="${esc(loc.id)}::objectType">
              <option value="">— unset —</option>
              ${LOCATION_OBJECT_TYPES.map((t) => `<option value="${esc(t)}" ${t === loc.objectType ? 'selected' : ''}>${esc(t)}</option>`).join('')}
            </select>
          </label>
          <label class="field-label sm">Star system
            <input type="text" data-location-field="${esc(loc.id)}::starSystem" value="${esc(loc.starSystem || '')}" placeholder="Sol, Alpha Centauri…">
          </label>
          <label class="field-label sm">Sector
            <input type="text" data-location-field="${esc(loc.id)}::sector" value="${esc(loc.sector || '')}" placeholder="Outer Rim…">
          </label>
        </div>
        ${oracleFieldRow('Sights', loc.sights || '', `data-location-sensory-roll="${esc(loc.id)}::sights"`, `data-location-field="${esc(loc.id)}::sights"`)}
        ${oracleFieldRow('Smells', loc.smells || '', `data-location-sensory-roll="${esc(loc.id)}::smells"`, `data-location-field="${esc(loc.id)}::smells"`)}
        ${oracleFieldRow('Sounds', loc.sounds || '', `data-location-sensory-roll="${esc(loc.id)}::sounds"`, `data-location-field="${esc(loc.id)}::sounds"`)}
      ` : ''}
    </div>`;
  }).join('');
}

// Threat/Mystery/Stress/Resources/Reputation dials now live once, in the
// Dashboard's own header (below) — not duplicated here.
function whatSectionBody(doc, ui) {
  const c = doc.context.what;
  return `
    <div class="field-label">Situation
      <div class="rich-field">${richToolbarHTML('what:situation', toolbarCollapsed(doc, ui, 'what:situation'))}<div class="mention-editor" contenteditable="true" data-ctx="what.situation" data-placeholder="What is unresolved right now?">${buildMentionEditorHTML(doc, c.situation)}</div></div>
    </div>
    <label class="field-label">Intent
      <select data-ctx="what.intent">
        ${INTENTS.map((i) => `<option ${i === c.intent ? 'selected' : ''}>${i}</option>`).join('')}
      </select>
    </label>
    ${lastScene(doc, ui)}
    ${worldFlagsBlock(doc)}`;
}

function whySectionBody(doc, ui) {
  return `
    ${summaryField('why', doc.context.why.summary, 'The current goal or stakes…', doc, ui)}
    <div class="shift-actions">
      <button class="chip" data-shift-prompt="Set Objective">◎ Set Objective</button>
    </div>
    ${whyEntityPicker(doc, ui)}
    ${threadsBlock(doc)}
    ${foreshadowingBlock(doc)}`;
}

// Activity itself is edited once, in the Composer header (below); the
// Suggested Rules Lens it drives now lives in the Advisor (copilotPanel.js)
// alongside every other suggestion-generating control.
function howSectionBody(doc, ui) {
  return `
    ${summaryField('how', doc.context.how.summary, 'Exploration, combat, social, downtime…', doc, ui)}
    <div class="shift-actions">
      <button class="chip" data-shift="Advance Time">⏱ Advance Time</button>
    </div>`;
}

// The Storyboard's two persistent panels (design/UX-ROADMAP.md Step 2;
// terminology per requirements/functional-requirements-v3.md): Composer
// (build the scene — the 5 former WHO/WHERE/WHAT/WHY/HOW tabs, now open/
// collapsible `dashboardSection`s) and Navigator (everything tracked
// outside a PC's own sheet, plus a scene-at-a-glance summary). Previously
// one combined "Story Dashboard" card with an internal 2-column grid; now
// two real sibling cards so each can be addressed (and, on a narrow
// viewport, shown/hidden) independently. `.storyboard-grid` (styles/
// cockpit.css) lays them out side by side on desktop/tablet and stacks
// them on phone.
export function renderWorkspace(doc, ui) {
  return `<div class="storyboard-grid">${composerCard(doc, ui)}${navigatorCard(doc, ui)}</div>`;
}

function composerCard(doc, ui) {
  const activity = doc.context.how.activity || '';
  return card('Composer', '', `
    ${currentLocationBanner(doc)}
    <label class="field-label sm">Activity
      <select data-ctx="how.activity">
        <option value="">— none set —</option>
        ${ACTIVITIES.map((a) => `<option value="${a.id}" ${a.id === activity ? 'selected' : ''}>${esc(a.label)}</option>`).join('')}
      </select>
    </label>
    ${dashboardSection('who', 'WHO is here', 'People and factions in play.', whoSectionBody(doc, ui), doc, ui)}
    ${dashboardSection('where', 'WHERE it happens', 'The place the scene is set.', whereSectionBody(doc, ui), doc, ui)}
    ${dashboardSection('what', 'WHAT is happening', 'The active situation.', whatSectionBody(doc, ui), doc, ui)}
    ${dashboardSection('why', 'WHY they are here', 'The objective driving the party, tracked as progress clocks.', whySectionBody(doc, ui), doc, ui)}
    ${dashboardSection('how', 'HOW it plays', 'Mode and pacing for the current scene.', howSectionBody(doc, ui), doc, ui)}
  `);
}

// Sticky (`.navigator-card`, styles/cockpit.css) so it stays visible while
// Composer's sections scroll beside it.
function navigatorCard(doc, ui) {
  return card('Navigator', '', `
    ${narrativeComposerBlock(doc, ui)}
    ${dashboardTrackersBlock(doc)}
  `, 'navigator-card');
}

// Threat/Mystery/Stress/Resources/Reputation — moved out of the shared
// header (2026-07-23 mockup) to sit directly under the Narrative Composer
// in the right column, one full-width slider per row (not the 3-up grid
// the header used) so it reads as a compact tracker stack alongside the
// draft it's informing, not a separate dashboard region.
function dashboardTrackersBlock(doc) {
  const c = doc.context.what;
  const mystery = c.mystery == null ? 0 : c.mystery;
  const stress = c.stress == null ? 5 : c.stress;
  const resources = c.resources == null ? 5 : c.resources;
  const reputation = c.reputation == null ? 5 : c.reputation;
  const dial = (key, label, value) => `<label class="field-label sm dashboard-tracker">${esc(label)} <b class="metric">${value}/10</b>
    <input type="range" min="0" max="10" value="${value}" data-ctx-num="what.${key}">
  </label>`;
  return `<div class="dashboard-trackers">
    ${dial('threat', 'Threat', c.threat)}
    ${dial('mystery', 'Mystery', mystery)}
    ${dial('stress', 'Stress', stress)}
    ${dial('resources', 'Resources', resources)}
    ${dial('reputation', 'Reputation', reputation)}
  </div>`;
}

function summaryField(key, val, placeholder, doc, ui) {
  const toolbarKey = `${key}:summary`;
  return `<div class="field-label">Focus
    <div class="rich-field">${richToolbarHTML(toolbarKey, toolbarCollapsed(doc, ui, toolbarKey))}<div class="mention-editor" contenteditable="true" data-ctx="${key}.summary" data-placeholder="${esc(placeholder)}">${buildMentionEditorHTML(doc, val)}</div></div>
  </div>`;
}

// Shared candidates-panel renderer for WHERE/WHO's tag pickers — a
// <select size> listbox, same box aesthetic as the Location/NPC-Faction
// tag listbox right next to it (direct follow-up request: chips read as
// inconsistent with that listbox and take more vertical space). Picking
// an option inserts an @mention (the select's own change handler,
// shell.js) then resets back to the placeholder — same "pick, act, reset"
// shape as data-conflict-faction-link/data-where-faction-link, not a
// persistent filter selection like the tag listbox itself.
function candidateListbox(candidates, selectAttr, tagFilter, noun) {
  if (!candidates.length) return `<div class="ws-placeholder">${tagFilter ? `No ${noun} tagged #${esc(tagFilter)}.` : `No ${noun} yet.`}</div>`;
  return `<select size="${Math.min(8, Math.max(3, candidates.length))}" ${selectAttr}>
      <option value="">— insert into Focus —</option>
      ${candidates.map((e) => `<option value="${esc(e.id)}">${esc(e.name || 'Unnamed')}</option>`).join('')}
    </select>`;
}

// WHERE tab redesign ("USER CHANGES" batch): a Location tag listbox (not
// chips, per direct user request) filters a candidate panel of matching
// Locations. Per direct follow-up feedback, the earlier "Present Here"
// curated list (context.where.entityIds) was duplicative of the Focus
// field — a Location already belongs to the scene once it's mentioned in
// Focus text, so a second, separate present-here list was redundant
// bookkeeping. Picking a candidate now inserts a real @mention into Focus
// directly (data-insert-where-mention-select, handled in shell.js via
// insertMentionNode/serializeMentionEditor) instead of adding to a list.
// context.where.entityIds/addContextEntity/removeContextEntity (session.js)
// still exist (harmless, tested, generic) but are no longer driven from
// this UI.
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
  const candidatePanel = candidateListbox(candidates, 'data-insert-where-mention-select', tagFilter, 'Locations');

  return `
    <div class="entity-tag-picker">
      <div class="entity-tag-picker-row">
        <div class="entity-tag-picker-tags"><span class="field-label-static">Location tags</span>${tagListbox}</div>
        <div class="entity-tag-picker-candidates"><span class="field-label-static">Matching locations</span>${candidatePanel}</div>
      </div>
      <div class="entity-add-row"><button class="chip" data-where-add-location>＋ New Location</button></div>
    </div>`;
}

// WHO tab: the exact same tag-picker -> listbox -> select-to-mention
// pattern as WHERE's whereLocationPicker above, applied to people instead
// of places —
// NPC and Faction tags pooled together (not a separate type-filter chip
// row; kept as close to WHERE's own shape as possible, one type at a time
// was WHERE's whole design, this just widens "one type" to "two related
// ones"). "Introduce NPC" (the data-shift-prompt chip above this in
// whoSectionBody) is left as-is — narrating a brand-new introduction in
// prose is a different action from mentioning an entity that already
// exists.
function whoEntityPicker(doc, ui) {
  const tagFilter = ui.whoTagFilter || null;
  const vocab = [...new Set([...listTagVocabulary(doc, 'npc'), ...listTagVocabulary(doc, 'faction')])].sort((a, b) => a.localeCompare(b));
  const tagListbox = vocab.length
    ? `<select size="${Math.min(8, Math.max(3, vocab.length))}" data-who-tag-select>
        <option value="" ${!tagFilter ? 'selected' : ''}>— all tags —</option>
        ${vocab.map((t) => `<option value="${esc(t)}" ${t === tagFilter ? 'selected' : ''}>#${esc(t)}</option>`).join('')}
      </select>`
    : '<p class="ws-placeholder">No NPC/Faction tags yet — tag one in Cast to start filtering.</p>';

  const allPeople = (doc.entities.items || []).filter((e) => e.type === 'npc' || e.type === 'faction');
  const candidates = tagFilter ? allPeople.filter((e) => (e.tags || []).includes(tagFilter)) : allPeople;
  const candidatePanel = candidateListbox(candidates, 'data-insert-who-mention-select', tagFilter, 'NPCs/Factions');

  return `
    <div class="entity-tag-picker">
      <div class="entity-tag-picker-row">
        <div class="entity-tag-picker-tags"><span class="field-label-static">NPC/Faction tags</span>${tagListbox}</div>
        <div class="entity-tag-picker-candidates"><span class="field-label-static">Matching people</span>${candidatePanel}</div>
      </div>
      <div class="entity-add-row">
        <button class="chip" data-entity-add="npc">＋ New NPC</button>
        <button class="chip" data-entity-add="faction">＋ New Faction</button>
      </div>
    </div>`;
}

// WHY tab: the same tag-picker -> listbox -> select-to-mention pattern as
// WHO/WHERE above, applied to "who/what this objective is actually about"
// — NPCs, Factions, and Conflicts pooled together (docs/adr/0039). WHY had
// NO entity-selection UI at all before this (unlike WHO/WHERE, both
// upgraded earlier this session) — direct complaint this closes.
function whyEntityPicker(doc, ui) {
  const tagFilter = ui.whyTagFilter || null;
  const vocab = [...new Set([...listTagVocabulary(doc, 'npc'), ...listTagVocabulary(doc, 'faction'), ...listTagVocabulary(doc, 'conflict')])].sort((a, b) => a.localeCompare(b));
  const tagListbox = vocab.length
    ? `<select size="${Math.min(8, Math.max(3, vocab.length))}" data-why-tag-select>
        <option value="" ${!tagFilter ? 'selected' : ''}>— all tags —</option>
        ${vocab.map((t) => `<option value="${esc(t)}" ${t === tagFilter ? 'selected' : ''}>#${esc(t)}</option>`).join('')}
      </select>`
    : '<p class="ws-placeholder">No NPC/Faction/Conflict tags yet — tag one in Cast to start filtering.</p>';

  const allRelevant = (doc.entities.items || []).filter((e) => e.type === 'npc' || e.type === 'faction' || e.type === 'conflict');
  const candidates = tagFilter ? allRelevant.filter((e) => (e.tags || []).includes(tagFilter)) : allRelevant;
  const candidatePanel = candidateListbox(candidates, 'data-insert-why-mention-select', tagFilter, 'NPCs/Factions/Conflicts');

  return `
    <div class="entity-tag-picker">
      <div class="entity-tag-picker-row">
        <div class="entity-tag-picker-tags"><span class="field-label-static">NPC/Faction/Conflict tags</span>${tagListbox}</div>
        <div class="entity-tag-picker-candidates"><span class="field-label-static">Matching entities</span>${candidatePanel}</div>
      </div>
    </div>`;
}

// Faction Events tie-in (docs/adr/0031's Faction Events follow-up): a
// small, read-only summary + jump link, not a new place to enter data —
// same posture as the tag-jump chips elsewhere in this app. "Nearby" here
// means present anywhere in the region (factionsInRegion, factionTurnEngine.js
// — the full location containment tree, region-hop and all, not just a
// single district) of whichever Location(s) are currently @mentioned in
// WHERE's own Focus text (getCurrentWhereLocations) — the same "Focus
// text is the single source of truth for what's in the scene" reasoning
// the WHO/WHERE redesign already established, not a new structured
// pointer. Direct request follow-up: this block is also the ONE place a
// GM can manually say "this faction operates here" — via a `located_at`
// relationship (the generic relationship system, already surfaced in the
// Entity Editor's own Relationships block; factionsInRegion/
// factionsPresentAt already recognize it) — for factions with no SWN
// Faction Turn Engine presence fields set. The ✕ only appears on a
// faction whose presence at the PRIMARY current location is via that
// manual relationship — a homeworld/Base/asset/governed presence isn't
// removable from here, same "curated convenience, not a restriction"
// posture as the Conflict picker below.
function factionsActiveNearbyBlock(doc) {
  const whereLocations = getCurrentWhereLocations(doc);
  if (!whereLocations.length) return '';
  const primary = whereLocations[0];
  const seen = new Map();
  for (const loc of whereLocations) {
    for (const { faction } of factionsInRegion(doc, loc.id, { maxDepth: 6 })) {
      if (!seen.has(faction.id)) seen.set(faction.id, faction);
    }
  }
  const active = Array.from(seen.values());
  const manualHere = new Set((factionsPresentAt(doc, primary.id) || [])
    .filter((f) => (f.relationships || []).some((r) => r.type === 'located_at' && r.to === primary.id))
    .map((f) => f.id));
  const chips = active.map((f) => `<span class="entity-chip-row">
      <button type="button" class="entity-chip" data-faction-events-jump="${esc(f.id)}" title="Open Faction Events, filtered to ${esc(f.name || 'this faction')}">${esc(f.name || 'Unnamed faction')}</button>
      ${manualHere.has(f.id) ? `<button type="button" class="icon-btn" data-where-faction-unlink="${esc(primary.id)}::${esc(f.id)}" title="Remove — no longer operating here">✕</button>` : ''}
    </span>`).join('');
  const presentIds = new Set(active.map((f) => f.id));
  const linkable = listEntities(doc, ['faction']).filter((f) => !presentIds.has(f.id));
  return `
    <div class="workspace-mini-section">
      <span class="field-label-static">Factions active nearby</span>
      <div class="entity-chips">${chips || '<span class="dim small">None yet.</span>'}</div>
      ${linkable.length ? `<select data-where-faction-link="${esc(primary.id)}">
        <option value="">— faction operating here —</option>
        ${linkable.map((f) => `<option value="${esc(f.id)}">${esc(f.name) || 'Unnamed'}</option>`).join('')}
      </select>` : ''}
    </div>`;
}

/** Faction Conflict's Location (contested zone) picker — lives on WHO,
 *  not tucked inside the Conflict's own Entity Editor card, per direct
 *  request: scoping "which factions are eligible to link" is a WHO-tab
 *  concern, not an entity-detail-form concern. Renders only when a
 *  Conflict is the currently active/open entity (Cast/Entity Editor) —
 *  still just `data-entity-field="locationId"`, the same generic handler
 *  every other entity field already uses (it always targets whichever
 *  entity is active, regardless of which tab the control is rendered
 *  on), so no new shell.js wiring is needed for the field itself. */
function activeConflictLocationPicker(doc) {
  const active = getEntity(doc, doc.entities && doc.entities.activeId);
  if (!active || active.type !== 'conflict') return '';
  const locations = (doc.entities.items || []).filter((e) => e.type === 'location');
  return `
    <div class="workspace-mini-section">
      <label class="field-label">${esc(active.name || 'This conflict')} — Location (contested zone)
        <select data-entity-field="locationId">
          <option value="">— unset —</option>
          ${locations.map((l) => `<option value="${esc(l.id)}" ${active.locationId === l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}
        </select>
      </label>
      <p class="dim small">Scopes which factions are offered as "local" when linking this conflict's Involved factions.</p>
    </div>`;
}

// Same tie-in, from WHERE's side: the most recent committed Faction
// Events at the current location(s)/district, each jumping to the panel
// filtered to that location.
function factionActivityHereBlock(doc) {
  const whereLocations = getCurrentWhereLocations(doc);
  if (!whereLocations.length) return '';
  const whereIds = whereLocations.map((l) => l.id);
  const log = Array.isArray(doc.factionEvents) ? doc.factionEvents : [];
  const here = log.filter((e) => e.locationId && whereIds.some((id) => isSameDistrict(doc, e.locationId, id)));
  if (!here.length) return '';
  const recent = here.slice(-5).reverse();
  const rows = recent.map((e) => {
    const loc = getEntity(doc, e.locationId);
    return `<button type="button" class="entity-chip" data-faction-events-location-jump="${esc(e.locationId)}" title="Open Faction Events, filtered to ${esc(loc ? loc.name : 'this location')}">${esc(e.factionName || 'Unnamed faction')} — ${esc(e.narrative ? e.narrative.slice(0, 60) : ACTION_LABEL_FOR_WHERE[e.action] || e.action)}</button>`;
  }).join('');
  return `
    <div class="workspace-mini-section">
      <span class="field-label-static">Faction activity here</span>
      <div class="entity-chips">${rows}</div>
    </div>`;
}

// Read-only quick-awareness summary (direct request) — System/Star/Colony-
// Base/District for the PRIMARY current WHERE location (whereLocations[0],
// same "first is primary" convention factionsActiveNearbyBlock's add-
// select already uses). Deliberately reuses existing World Profile fields
// rather than inventing new schema: `zone` (free text, e.g. "Near Earth
// Zone") -> System, `starSystem` (confusingly labeled "Star System" in the
// World Profile card, but actually stores the NAME of a #star-tagged
// Location) -> Star, `bases[]` (curated base-name strings) -> Colony/Base,
// and the structural parent one hop up the contains/located_at entity
// graph (getContainingLocation — the same relationship isSameDistrict/
// getContainedLocations read) -> District, distinct from the `zone`/
// `starSystem` text fields since a Location may have one, both, or
// neither set up.
function locationSummaryHeader(doc) {
  const locs = getCurrentWhereLocations(doc);
  if (!locs.length) return '';
  const loc = locs[0];
  const district = getContainingLocation(doc, loc.id);
  const row = (label, value) => `<span class="location-summary-item"><span class="dim small">${esc(label)}</span> ${value ? esc(value) : '<span class="dim small">—</span>'}</span>`;
  return `<div class="location-summary" title="Quick reference for ${esc(loc.name || 'the current location')}">
    ${row('System', loc.zone)}
    ${row('Star', loc.starSystem)}
    ${row('Colony/Base', (loc.bases || []).join(', '))}
    ${row('District', district ? district.name : '')}
  </div>`;
}

// A persistent "this is what's selected" indicator (direct feedback,
// docs/adr/0038) — WHERE's own location "selection" is still just an
// @mention inserted into Focus (whereLocationPicker above; a past
// redesign deliberately removed a separate curated list as duplicative of
// that text), so this is read-only derived display, not a second storage
// mechanism — it just makes the already-real current location(s)
// (getCurrentWhereLocations) visible without having to read the Focus
// prose itself.
function currentLocationBanner(doc) {
  const locs = getCurrentWhereLocations(doc);
  if (!locs.length) return '';
  const chips = locs.map((l) => `<button type="button" class="entity-chip" data-open-entity="${esc(l.id)}" title="Open ${esc(l.name || 'Unnamed')}">${esc(l.name || 'Unnamed')}</button>`).join('');
  return `
    <div class="workspace-mini-section current-location-banner">
      <span class="field-label-static">📍 Current location</span>
      <div class="entity-chips">${chips}</div>
    </div>`;
}

// Read-only digest: factions actually present AT the current location(s)
// specifically (factionsPresentAt — the exact-location counterpart to
// WHO's region-wide factionsActiveNearbyBlock), each with a truncated
// Agenda snippet so "what is this faction doing here" reads at a glance
// without opening the Entity Editor.
function locationFactionsBlock(doc) {
  const whereLocations = getCurrentWhereLocations(doc);
  if (!whereLocations.length) return '';
  const seen = new Map();
  for (const loc of whereLocations) for (const f of factionsPresentAt(doc, loc.id)) if (!seen.has(f.id)) seen.set(f.id, f);
  const factions = Array.from(seen.values());
  if (!factions.length) return '';
  const rows = factions.map((f) => {
    const agenda = (f.agenda || '').replace(/<[^>]+>/g, ' ').trim();
    const snippet = agenda ? agenda.slice(0, 80) + (agenda.length > 80 ? '…' : '') : '';
    return `<div class="thread-row">
      <span class="thread-name"><button type="button" class="entity-chip" data-open-entity="${esc(f.id)}">${esc(f.name || 'Unnamed')}</button>${snippet ? ` <span class="dim small">— ${esc(snippet)}</span>` : ''}</span>
    </div>`;
  }).join('');
  return `<div class="threads">
    <div class="threads-head"><h3>Factions here</h3></div>
    ${rows}
  </div>`;
}

// Read-only digest: Conflicts (docs/adr/0036) whose `locationId` (the
// contested zone, set from this same WHO/WHERE pairing —
// activeConflictLocationPicker above) matches the current location(s).
function locationConflictsBlock(doc) {
  const whereLocations = getCurrentWhereLocations(doc);
  if (!whereLocations.length) return '';
  const whereIds = new Set(whereLocations.map((l) => l.id));
  const conflicts = listEntities(doc, ['conflict']).filter((c) => whereIds.has(c.locationId));
  if (!conflicts.length) return '';
  const statusLabel = Object.fromEntries(CONFLICT_STATUS_OPTIONS);
  const rows = conflicts.map((c) => `<div class="thread-row">
      <span class="thread-name"><button type="button" class="entity-chip" data-open-entity="${esc(c.id)}">${esc(c.name || 'Unnamed conflict')}</button> <span class="dim small">— ${esc(statusLabel[c.status] || c.status)}</span></span>
    </div>`).join('');
  return `<div class="threads">
    <div class="threads-head"><h3>Conflicts here</h3></div>
    ${rows}
  </div>`;
}

// Read-only jump list: every OTHER Location sharing the same immediate
// structural parent as the current one (getContainedLocations on
// getContainingLocation's result — i.e. its siblings, same "district"
// concept isSameDistrict already established one hop out) — a quick
// "what else is around here" reference so a GM can eyeball or jump to a
// nearby option without leaving WHERE. A Location with no parent set (no
// `located_at` edge yet) simply shows nothing, same posture as every
// other block here that's silent until there's real structure to show.
function nearbyLocationsBlock(doc) {
  const whereLocations = getCurrentWhereLocations(doc);
  if (!whereLocations.length) return '';
  const loc = whereLocations[0];
  const parent = getContainingLocation(doc, loc.id);
  if (!parent) return '';
  const siblings = getContainedLocations(doc, parent.id).filter((l) => l.id !== loc.id);
  if (!siblings.length) return '';
  const chips = siblings.map((l) => `<button type="button" class="entity-chip" data-open-entity="${esc(l.id)}" title="Open ${esc(l.name || 'Unnamed')}">${esc(l.name || 'Unnamed')}</button>`).join('');
  return `
    <div class="workspace-mini-section">
      <span class="field-label-static">Nearby locations (${esc(parent.name || 'Unnamed')})</span>
      <div class="entity-chips">${chips}</div>
    </div>`;
}

// Scene Summary, the Navigator card's top block — composeNarrativeDraft()
// (copilot.js) pulls WHO/WHERE/WHAT/WHY's current state plus whichever
// Story Options are checked (in the Advisor, copilotPanel.js) into one
// composed paragraph, recomputed fresh on every render. Deliberately NOT a
// real contenteditable — a live-recomputed field a GM was mid-edit in
// would get silently clobbered the moment anything else on the Composer
// changed (ticking a checkbox in the Advisor, editing a WHO field) — so
// this renders read-only (via the same buildMentionEditorHTML every rich
// field already uses, so @mentions still show as real badges) with
// Copy/Send-to-Journal actions instead; hand-polishing happens after Send,
// in the Journal note itself (a real editable field there). The Navigator
// card itself is pinned via CSS `position: sticky` (`.navigator-card`,
// styles/cockpit.css) so it stays visible while the GM scrolls Composer's
// sections beside it.
function narrativeComposerBlock(doc, ui) {
  const selected = (ui && ui.selectedStoryOptionIds) || new Set();
  const draft = composeNarrativeDraft(doc, { selectedOptionIds: Array.from(selected) });
  return `<div class="threads narrative-composer">
    <div class="threads-head"><h3>Scene Summary</h3></div>
    <p class="dim small">Reflects WHO/WHERE's Focus text live, plus whichever Story Options you check in the Advisor.</p>
    <div class="mention-editor narrative-composer-preview">${draft ? buildMentionEditorHTML(doc, draft) : '<span class="ws-placeholder">Nothing to compose yet — write something in WHO/WHERE\'s Focus field, or check a Story Option in the Advisor.</span>'}</div>
    <div class="shift-actions">
      <button class="chip" data-composer-copy title="Copy the draft to your clipboard">📋 Copy</button>
      <button class="chip" data-composer-journal title="Add the draft to the Journal">＋ Send to Journal</button>
    </div>
  </div>`;
}

// A GM's own free-text narrative note per Location — "Location Story"
// (docs/design/GMAtlas_Scene_Story_Data_Model.md via docs/adr/0038),
// mirrors Faction's Scenario Seed but bound to whichever Location(s) are
// currently mentioned in WHERE's Focus rather than the Cast-active
// entity — `data-entity-field` always targets `entities.activeId`
// (confirmed via activeConflictLocationPicker's own comment above), which
// isn't necessarily the WHERE-mentioned location, so this uses its own
// `data-location-story` attribute instead (shell.js's onFocusOut reads
// the location id straight off the element).
function locationStoryBlock(doc, ui) {
  const whereLocations = getCurrentWhereLocations(doc);
  if (!whereLocations.length) return '';
  return whereLocations.map((loc) => {
    const toolbarKey = `location:${loc.id}:story`;
    return `<div class="field-label">${esc(loc.name || 'Unnamed location')} — Location Story
      <div class="rich-field">${richToolbarHTML(toolbarKey, toolbarCollapsed(doc, ui, toolbarKey))}<div class="mention-editor" contenteditable="true" data-location-story="${esc(loc.id)}" data-placeholder="How are factions operating here? What's brewing?">${buildMentionEditorHTML(doc, loc.locationStory)}</div></div>
    </div>`;
  }).join('');
}

const ACTION_LABEL_FOR_WHERE = {
  attack: 'Attack', buyAsset: 'Buy Asset', sellAsset: 'Sell Asset', repairAssetOrFaction: 'Repair',
  refitAsset: 'Refit Asset', expandInfluence: 'Expand Influence', changeHomeworld: 'Change Homeworld',
  seizePlanet: 'Seize Planet', useAssetAbility: 'Use Asset Ability', none: 'No action', busy: 'In transit',
};

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

/** Foreshadowing tracking (docs/design/scene-story-integration-plan.md,
 *  scoped down from the Scene/Story spec's own highest-value-flagged
 *  feature) — "I just planted this, remind me to pay it off." Lives on
 *  WHY, next to Threads (both are "things to track and eventually pay
 *  off"), open-only (paid-off entries stay in the record but aren't
 *  shown here — same "don't clutter the live view with resolved things"
 *  posture Threads' own done-filtering already uses elsewhere). */
function foreshadowingBlock(doc) {
  const open = openForeshadowing(doc);
  const rows = open.map((f) => `<div class="thread-row">
      <span class="thread-name">${esc(f.text)}${f.payoffNote ? ` <span class="dim small">— ${esc(f.payoffNote)}</span>` : ''}</span>
      <span class="thread-actions">
        <button class="icon-btn" data-foreshadowing-paidoff="${esc(f.id)}" title="Mark paid off">✓</button>
        <button class="icon-btn" data-foreshadowing-remove="${esc(f.id)}" title="Remove">✕</button>
      </span>
    </div>`).join('');
  return `<div class="threads">
    <div class="threads-head"><h3>Foreshadowing</h3><span class="threads-head-actions"><button class="chip" data-foreshadowing-add>＋ Plant a detail</button></span></div>
    ${open.length ? rows : '<div class="ws-placeholder">Nothing planted yet — jot down anything you drop into a scene that you\'ll want to pay off later.</div>'}
  </div>`;
}

function worldFlagsBlock(doc) {
  const flags = doc.worldFlags || [];
  const rows = flags.map((f) => `<div class="thread-row">
      <span class="thread-name">${esc(f.description)}</span>
      <select class="thread-status-select" data-worldflag-value="${esc(f.id)}">
        ${WORLD_FLAG_VALUES.map((v) => `<option value="${esc(v)}" ${v === f.value ? 'selected' : ''}>${esc(WORLD_FLAG_VALUE_LABEL[v])}</option>`).join('')}
      </select>
      <input type="text" class="thread-name-input" data-worldflag-notes="${esc(f.id)}" value="${esc(f.notes)}" placeholder="Notes…">
      <span class="thread-actions">
        <button class="icon-btn" data-worldflag-remove="${esc(f.id)}" title="Remove">✕</button>
      </span>
    </div>`).join('');
  return `<div class="threads">
    <div class="threads-head"><h3>World State Flags</h3><span class="threads-head-actions"><button class="chip" data-worldflag-add>＋ Add fact</button></span></div>
    ${flags.length ? rows : '<div class="ws-placeholder">Nothing tracked yet — log a fact whose known/unknown state matters later (e.g. "does the party know X").</div>'}
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

// A <textarea>, not <input> — these can run to a full sentence or two, and
// starting at rows="1" then auto-growing (autoGrowSceneField, ui/shell.js,
// on input and once per render) up to a CSS-capped ~4 rows reads far
// better than either a cramped single line or a field that's always tall.
// Collapsed by default (ui.expandedSceneFields, ephemeral — same Set
// shape as drawers/index.js's expandedEnhancements) — clicking the label
// expands just that one field; WHAT's own section opens with all 7
// collapsed to their labels so it reads as a scannable list, not a wall
// of text boxes, until the GM picks one to look at.
function sceneField(scene, key, label, placeholder, ui) {
  const open = ((ui && ui.expandedSceneFields) || new Set()).has(`${scene.id}::${key}`);
  return `<div class="field-label sm">
    <span class="field-label-row">
      <button type="button" class="scene-field-toggle" data-scene-field-toggle="${esc(scene.id)}::${key}">${open ? '▾' : '▸'} ${esc(label)}</button>
      ${sceneFieldIcon(key)}
    </span>
    ${open ? `<textarea data-scene-field="${esc(scene.id)}::${key}" rows="1" placeholder="${esc(placeholder)}">${esc(scene[key] || '')}</textarea>` : ''}
  </div>`;
}

// Latest Scene split fields: Opening/Driver/Clue/Complication/Likely
// Consequence are real, individually-editable fields (domain/scenes.js),
// each linked to its own Oracle category; the combined `text` blob below
// is a DERIVED, read-only view recomposed from current field values on
// every edit (session.js's updateSceneField), not a second,
// independently-editable copy — editing a field updates it live. Opening
// holds the FULL line's content (not a fragment nested in a fixed
// template) — editing it directly rewrites what "Opening:" reads in the
// combined text below.
function lastScene(doc, ui) {
  const scenes = doc.scenes || [];
  if (!scenes.length) return '<div class="ws-placeholder">No scenes yet. Continue Story (Advisor) to generate the opening beat.</div>';
  const s = scenes[scenes.length - 1];
  return `<details class="last-scene" open>
    <summary>Latest: Scene ${s.number} — ${esc(s.summary)}</summary>
    <div class="last-scene-body">
      <pre class="scene-text">${esc(s.text)}</pre>
      <div class="scene-fields">
        ${sceneField(s, 'opening', 'Opening', 'What the party notices first…', ui)}
        ${sceneField(s, 'driver', 'Driver', "What's pushing this scene forward…", ui)}
        ${sceneField(s, 'clue', 'Clue', 'A detail that connects to the current thread…', ui)}
        ${sceneField(s, 'complication', 'Complication', 'What makes the obvious choice costly…', ui)}
        ${sceneField(s, 'decisionPoint', 'Decision point', 'What tradeoff does the party have to weigh…', ui)}
        ${sceneField(s, 'consequence', 'Likely consequence', 'What happens if nothing changes…', ui)}
        ${sceneField(s, 'situationLine', 'Current thread', 'The ongoing thread this scene connects to…', ui)}
      </div>
    </div>
  </details>`;
}
