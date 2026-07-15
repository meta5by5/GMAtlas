// workspace/index.js — the Adaptive Workspace. One interactive view per context
// question. Editing dispatches through the shell's delegated handlers (change +
// click) so this stays a pure render function.

import { listShifts } from '../../domain/context.js';
import { listThreads, THREAD_STATUSES, THREAD_STATUS_LABELS, THREAD_PRIORITIES } from '../../domain/threads.js';
import { ACTIVITIES, suggestRulesLens } from '../../domain/activities.js';
import { listTagVocabulary, isSameDistrict, getEntity, listEntities, getContainingLocation, getContainedLocations } from '../../domain/entities.js';
import { getCurrentWhereLocations, factionsPresentAt, factionsInRegion } from '../../domain/factionTurnEngine.js';
import { oracleLinkTagsFor } from '../../data/entityFieldOracleLinks.js';
import { buildMentionEditorHTML, richToolbarHTML, toolbarCollapsed } from '../mentionEditor.js';
import { renderFactionEvents } from '../drawers/factionEvents.js';
import { CONFLICT_STATUS_OPTIONS } from '../drawers/index.js';
import { openForeshadowing } from '../../domain/foreshadowing.js';
import { WORLD_FLAG_VALUES, WORLD_FLAG_VALUE_LABEL } from '../../domain/worldFlags.js';
import { buildStoryOptions } from '../../domain/copilot.js';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const INTENTS = ['Discovery', 'Travel', 'Social encounter', 'Investigation', 'Resource pressure', 'Combat pressure', 'Moral choice', 'Faction complication', 'Exploration hazard', 'Trade opportunity'];

// The "Shift Story" actions surfaced on the WHAT view — the manual control layer.
const WHAT_ACTIONS = ['Reveal Clue', 'Complicate', 'Reward', 'Raise Threat', 'Lower Threat', 'Advance Time'];

function card(title, lead, body) {
  return `<article class="workspace-card"><h2>${title}</h2><p class="lead">${lead}</p>${body}</article>`;
}

// WHERE-only variant: title+lead on the left, a read-only quick-awareness
// summary top-right on the SAME row (direct request) — everywhere else
// uses plain card() (title/lead stacked, no right-side slot); special-cased
// here rather than widening card() itself, since no other tab needs a
// header-row slot and this keeps every other view's markup untouched.
function cardWithHeaderRight(title, lead, headerRight, body) {
  return `<article class="workspace-card">
    <div class="workspace-card-head-row">
      <div class="workspace-card-head-text"><h2>${title}</h2><p class="lead">${lead}</p></div>
      ${headerRight}
    </div>
    ${body}
  </article>`;
}

// Suggestion Lens chip picker (docs/adr/0009-situation-engine-revisited.md,
// Decision item 3) — "What Happens Next?" opens this instead of generating
// immediately; `draw` is the fixed random draw from drawSuggestionLenses
// (session.js, via shell.js), not recomputed on every render. Generalized
// (docs/adr/0039 Phase 2) to take `open`/`draw` as plain params instead of
// always reading `ui.lensPickerOpen`/`ui.lensDraw` directly, so WHY's own
// scene-context-weighted picker below can reuse the exact same rendering
// with its own separate ephemeral state — picking a lens is the identical
// action (suggestNextWithLens) either way, only which draw produced the
// offered chips differs.
function lensPickerHtml(open, draw, { intro = 'Pick a lens to steer what happens next, instead of generating blind:' } = {}) {
  if (!open) return '';
  const chips = (draw || []).map((l) => `<button class="chip" data-lens-pick="${esc(l.id)}" title="${l.kind === 'discovery' ? 'Discovery Lens' : 'Approach Lens'}">${esc(l.label)}</button>`).join('');
  return `<div class="lens-picker">
    <p class="dim small">${esc(intro)}</p>
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
        <div class="rich-field">${richToolbarHTML('what:situation', toolbarCollapsed(doc, ui, 'what:situation'))}<div class="mention-editor" contenteditable="true" data-ctx="what.situation" data-placeholder="What is unresolved right now?">${buildMentionEditorHTML(doc, c.situation)}</div></div>
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
        <button class="btn ghost sm" data-continue-story title="Generate the next scene">▶ Scene</button>
      </div>
      ${lensPickerHtml(ui.lensPickerOpen, ui.lensDraw)}
      <div class="shift-actions" aria-label="Shift story">
        ${WHAT_ACTIONS.map((a) => `<button class="chip" data-shift="${esc(a)}">⚡ ${esc(a)}</button>`).join('')}
      </div>
      ${lastScene(doc, ui)}
      ${worldFlagsBlock(doc)}`);
  },

  who(doc, ui) {
    return card('WHO is here', 'People and factions in play.', `
      ${summaryField('who', doc.context.who.summary, 'Party, NPCs, factions present…', doc, ui)}
      <div class="shift-actions">
        <button class="chip" data-shift-prompt="Introduce NPC">＋ Introduce NPC</button>
      </div>
      ${whoEntityPicker(doc, ui)}
      ${factionsActiveNearbyBlock(doc)}
      ${activeConflictLocationPicker(doc)}`);
  },

  where(doc, ui) {
    const mainCard = cardWithHeaderRight('WHERE it happens', 'The place the scene is set.', locationSummaryHeader(doc), `
      ${summaryField('where', doc.context.where.summary, 'Location and immediate surroundings…', doc, ui)}
      ${whereLocationPicker(doc, ui)}
      ${currentLocationBanner(doc)}
      ${locationFactionsBlock(doc)}
      ${locationConflictsBlock(doc)}
      ${nearbyLocationsBlock(doc)}
      ${factionActivityHereBlock(doc)}
      ${storyInspirationBlock()}
      ${locationStoryBlock(doc, ui)}`);
    // Whole-card relocation (direct request): the Faction Events card can
    // move OUT of the drawer tab stack and dock here as a right column,
    // via its own down-arrow (data-faction-events-dock, shell.js) — the
    // SAME pure renderFactionEvents() the drawer normally shows, called a
    // second way with docked:true so it draws its own heading + an
    // up-arrow instead of relying on the drawer's chrome for a title.
    if (!ui.factionEventsDockedInWhere) return mainCard;
    const dockedPanel = renderFactionEvents(doc, {
      factionEventsDrafts: ui.factionEventsDrafts,
      factionEventsFactionFilterId: ui.factionEventsFactionFilterId,
      factionEventsLocationFilterId: ui.factionEventsLocationFilterId,
      factionEventsStepFactionId: ui.factionEventsStepFactionId,
      factionRoundHistoryOpen: ui.factionRoundHistoryOpen,
      conflictEscalationSuggestions: ui.conflictEscalationSuggestions,
      docked: true,
    });
    return `<div class="workspace-with-side">${mainCard}<aside class="workspace-docked-panel">${dockedPanel}</aside></div>`;
  },

  why(doc, ui) {
    return card('WHY they are here', 'The objective driving the party, tracked as progress clocks.', `
      ${summaryField('why', doc.context.why.summary, 'The current goal or stakes…', doc, ui)}
      <div class="shift-actions">
        <button class="chip" data-shift-prompt="Set Objective">◎ Set Objective</button>
      </div>
      ${whyEntityPicker(doc, ui)}
      ${storyOptionsBlock(doc, ui)}
      ${whyLensSuggestBlock(doc, ui)}
      ${threadsBlock(doc)}
      ${foreshadowingBlock(doc)}`);
  },

  how(doc, ui) {
    const activity = doc.context.how.activity || '';
    return card('HOW it plays', 'Mode, pacing, and the Rules Lens it suggests.', `
      <label class="field-label">Activity
        <select data-ctx="how.activity">
          <option value="">— none set —</option>
          ${ACTIVITIES.map((a) => `<option value="${a.id}" ${a.id === activity ? 'selected' : ''}>${esc(a.label)}</option>`).join('')}
        </select>
      </label>
      ${rulesLensSuggestion(doc, activity)}
      ${summaryField('how', doc.context.how.summary, 'Exploration, combat, social, downtime…', doc, ui)}
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
// ones"). "Introduce NPC" (the data-shift-prompt chip above this in who())
// is left as-is — narrating a brand-new introduction in prose is a
// different action from mentioning an entity that already exists.
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

// Read-only quick-awareness summary, top-right of WHERE's own header row
// (direct request) — System/Star/Colony-Base/District for the PRIMARY
// current WHERE location (whereLocations[0], same "first is primary"
// convention factionsActiveNearbyBlock's add-select already uses).
// Deliberately reuses existing World Profile fields rather than inventing
// new schema: `zone` (free text, e.g. "Near Earth Zone") -> System,
// `starSystem` (confusingly labeled "Star System" in the World Profile
// card, but actually stores the NAME of a #star-tagged Location) -> Star,
// `bases[]` (curated base-name strings) -> Colony/Base, and the
// structural parent one hop up the contains/located_at entity graph
// (getContainingLocation — the same relationship isSameDistrict/
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

// GM inspiration for moving the activity forward — reuses the existing
// oracle-driven Site Concept (feature/danger/wonder) and Adventure Seed
// (hook/twist/complication) generators verbatim (domain/worldbuilding.js,
// already wired to data-generate-site/-seed in shell.js, appends straight
// to the Journal) rather than inventing a second generator — this is
// just a second, WHERE-scoped entry point to the exact same buttons
// already available elsewhere (Article IX: extend via what exists).
function storyInspirationBlock() {
  return `
    <div class="workspace-mini-section">
      <span class="field-label-static">Need inspiration?</span>
      <div class="shift-actions">
        <button class="chip" data-generate-site title="Roll a site concept: a feature, a danger, and a wonder">🎲 Site Concept</button>
        <button class="chip" data-generate-seed title="Roll an adventure seed: a hook, a twist, and a complication">🎲 Adventure Seed</button>
      </div>
    </div>`;
}

// Story Options (docs/adr/0039) — buildStoryOptions() (copilot.js)
// combines whoever's in scene (WHO's @mentions + WHERE's present factions),
// WHERE's Conflicts-here, and WHY's own Threads/Foreshadowing/World Flags
// into a ranked, CUMULATIVE list (as opposed to advise()'s single-pick
// Co-Pilot observation) — every row is a distinct angle the GM can act on.
// 🔮 rolls that option's linked Oracle table for real inspiration (the
// existing rollOracle, same mechanism Site Concept/Adventure Seed use);
// ＋ Journal drops the option's own text straight into the session log;
// ✕ dismisses without acting on it. All three (docs/adr/0039 Phase 2)
// add the option's id to dismissedStoryOptionIds (shell.js, ephemeral,
// mirrors ADR 0036's dismissible-suggestion pattern) so it makes room for
// the next-ranked option instead of lingering — fetched from a deeper
// pool (limit 12) than what's actually shown (6) so there's a "next" to
// reveal. Nothing here is ever applied automatically (Article II).
function storyOptionsBlock(doc, ui) {
  const dismissed = (ui && ui.dismissedStoryOptionIds) || new Set();
  const options = buildStoryOptions(doc, { limit: 12 }).filter((o) => !dismissed.has(o.id)).slice(0, 6);
  const rows = options.map((o) => `<div class="thread-row story-option-row">
      <span class="thread-name">
        ${o.entityId ? `<button type="button" class="entity-chip" data-open-entity="${esc(o.entityId)}">${esc(o.label)}</button>` : esc(o.label)}
        <span class="dim small">— ${esc(o.detail)}</span>
      </span>
      <span class="thread-actions">
        <button class="icon-btn" data-story-option-roll="${esc(o.oracleGroup)}>${esc(o.oracleTable)}" data-story-option-id="${esc(o.id)}" title="Roll ${esc(o.oracleGroup)} → ${esc(o.oracleTable)} for inspiration">🔮</button>
        <button class="icon-btn" data-story-option-journal="${esc(o.id)}" title="Add to Journal">＋</button>
        <button class="icon-btn" data-story-option-dismiss="${esc(o.id)}" title="Dismiss">✕</button>
      </span>
    </div>`).join('');
  return `<div class="threads">
    <div class="threads-head"><h3>Story Options</h3></div>
    ${options.length ? rows : '<div class="ws-placeholder">Nothing to suggest yet — mention someone in WHO, set a Location in WHERE, or open a Conflict/Thread/Foreshadowing entry, and options will show up here.</div>'}
  </div>`;
}

// Suggestion Lens, weighted to the current scene (docs/adr/0039 Phase 2) —
// a second entry point into the exact same lens-picker → suggestNextWithLens
// flow WHAT's "What Happens Next?" already offers (session.js's
// drawSuggestionLenses/suggestNextWithLens are completely unchanged by
// this), just drawn with `sceneContext` (gatherSceneContext) so a Conflict/
// faction/Negotiate-activity currently in play gives matching lenses (e.g.
// negotiation, violence, politics) better odds of being offered — never a
// GUARANTEE, still a random draw, just no longer context-blind. Separate
// ephemeral state from WHAT's own ui.lensPickerOpen/lensDraw (shell.js) so
// the two pickers never interfere with each other.
function whyLensSuggestBlock(doc, ui) {
  return `
    <div class="workspace-mini-section">
      <button class="chip" data-why-lens-suggest title="Draw lens chips weighted toward who/what is currently in scene">🎭 Suggest a Lens</button>
      ${lensPickerHtml(ui.whyLensPickerOpen, ui.whyLensDraw, { intro: 'Weighted toward what’s currently in scene — pick a lens to steer what happens next:' })}
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
// expands just that one field; the WHAT tab opens with all 7 collapsed
// to their labels so it reads as a scannable list, not a wall of text
// boxes, until the GM picks one to look at.
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
  if (!scenes.length) return '<div class="ws-placeholder">No scenes yet. Continue Story to generate the opening beat.</div>';
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

export function renderWorkspace(doc, active, ui) {
  return (VIEWS[active] || VIEWS.what)(doc, ui);
}
