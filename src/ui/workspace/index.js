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
import { isSameDistrict, getEntity, listEntities, LOCATION_OBJECT_TYPES, getSystemForLocation, getStarForLocation, getHexZoneForLocation, getEntityFaction } from '../../domain/entities.js';
import { getCurrentWhereLocations, factionsInRegion, factionPresenceReasons } from '../../domain/factionTurnEngine.js';
import { oracleLinkTagsFor } from '../../data/entityFieldOracleLinks.js';
import { buildMentionEditorHTML, richToolbarHTML, richToolbarToggleHTML, toolbarCollapsed } from '../mentionEditor.js';
import { renderFactionEvents } from '../drawers/factionEvents.js';
import { CONFLICT_STATUS_OPTIONS, helpToggle } from '../drawers/index.js';
import { getGalleryImage } from '../../domain/gallery.js';
import { openForeshadowing } from '../../domain/foreshadowing.js';
import { WORLD_FLAG_VALUES, WORLD_FLAG_VALUE_LABEL } from '../../domain/worldFlags.js';
import { composeNarrativeDraft } from '../../domain/copilot.js';
import { getNpcSceneState } from '../../domain/scenes.js';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Companion to imported helpToggle (drawers/index.js) — that module keeps
// its own helpBody private, so this is a local equivalent reading the same
// shared, flat `ui.helpOpen` Set. `text` is already-escaped/trusted HTML,
// matching helpBody's own contract.
function wsHelpBody(key, text, ui) {
  return (ui && ui.helpOpen && ui.helpOpen.has(key)) ? `<p class="dim small help-text">${text}</p>` : '';
}

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
function dashboardSection(key, title, lead, bodyHtml, doc, ui, headerExtra = '') {
  const expanded = ((ui && ui.expandedDashboardSections) || new Set()).has(key);
  const rawSummary = contextSummary(doc.context, key)
    .replace(/<[^>]+>/g, ' ')
    .replace(/@\[([^\]|]+)(?:\|[^\]]*)?\]/g, '$1')
    .replace(/@([A-Za-z0-9_'-]+)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  const summary = rawSummary.length > 70 ? `${rawSummary.slice(0, 70)}…` : rawSummary;
  const helpKey = `dash:${key}`;
  return `<section class="dashboard-section" data-dashboard-section="${esc(key)}">
    <div class="section-head-row">
      <button type="button" class="dashboard-section-toggle" data-dashboard-section-toggle="${esc(key)}">${expanded ? '▾' : '▸'} ${esc(title)}</button>
      <span class="entity-chip-row">
        ${headerExtra}
        ${expanded && lead ? helpToggle(helpKey) : ''}
        ${!expanded && summary ? `<span class="dim small dashboard-section-summary">${esc(summary)}</span>` : ''}
      </span>
    </div>
    ${expanded ? `${wsHelpBody(helpKey, esc(lead), ui)}<div class="dashboard-section-body">${bodyHtml}</div>` : ''}
  </section>`;
}

// WHO's three top-level "add" actions, as icons right-aligned on the "WHO
// is here" section header row (direct follow-up request, replacing the
// old text-chip row inside the body) — passed as dashboardSection's
// headerExtra so they're reachable even collapsed. "Introduce NPC"
// (data-who-introduce-npc, shell.js) is unchanged in behavior — its own
// one-field inline prompt: typing an existing NPC's name (plain text or
// @Name/@[Name]) adds THAT entity to whichever Actor group its #character
// tag routes it to; typing a name matching no NPC creates a brand-new one
// and adds it the same way — "select from list and/or @ mentions," direct
// quote. "New NPC"/"New Faction" (data-entity-add) now open a blank
// entity straight into the Entity Editor (direct follow-up request —
// "start new Entity Editors with the appropriate type") instead of a
// silent background create-and-toast.
function whoHeaderExtra() {
  return `
    <button type="button" class="icon-btn" data-who-introduce-npc title="Introduce NPC — select from Cast or type an @mention">🔎＋</button>
    <button type="button" class="icon-btn" data-entity-add="npc" title="New NPC — opens a blank Entity Editor">🧑＋</button>
    <button type="button" class="icon-btn" data-entity-add="faction" title="New Faction — opens a blank Entity Editor">🏛＋</button>`;
}

function whoSectionBody(doc, ui) {
  return `
    ${npcSceneGroupsBlock(doc, ui)}
    ${factionsActiveNearbyBlock(doc, ui)}
    ${assetsPresentBlock(doc, ui)}
    ${activeConflictLocationPicker(doc)}`;
}

// Shared label + 🎲-roll + editable-text row (docs/adr/0041 Phase 13a/13b)
// — used for both an NPC's 5 scene-scoped fields below and WHERE's
// Location Details sensory fields further down. `value` is whatever's
// currently rolled/typed; the roll button re-rolls from the field's
// mapped oracle table (session.js), the input commits an edit on blur/
// change, which — if the current value came from a roll — ALSO writes
// back through oracles.overrides (the "remembered" half). `clearAttr`
// (direct follow-up request — "add x to clear text in the oracle fields
// for the popup window from the thumbnail arrow, e.g., Disposition") is a
// click handler that blanks the field the same way typing it empty and
// blurring would; only rendered once there's actually text to clear.
function oracleFieldRow(label, value, rollAttr, fieldAttr, clearAttr) {
  return `<div class="oracle-field-row">
    <span class="field-label-static">${esc(label)}</span>
    <button type="button" class="icon-btn" ${rollAttr} title="Roll ${esc(label)}">🎲</button>
    <input type="text" class="thread-name-input" ${fieldAttr} value="${esc(value)}" placeholder="—">
    ${value ? `<button type="button" class="icon-btn" ${clearAttr} title="Clear ${esc(label)}">✕</button>` : ''}
  </div>`;
}

// Read-only, mention-style thumbnail for an NPC "Actor" (Protagonists/
// Antagonists/Bystanders — WHO redesign, replacing the old always-visible
// name-chip rows AND the free-text Focus mention-editor). The photo
// itself only opens the entity (data-open-entity, same as any other
// mention click); the expand-scene-details and remove controls are
// separate sibling buttons overlaid on the photo's upper-left/upper-right
// edge as small badges (per reference mockup), not nested inside the
// photo's own button (nested buttons are invalid HTML and would fight
// the photo's click). `kind` ('protagonist'|'antagonist'|'bystander')
// picks which data-scene-*-remove attribute the remove badge carries and
// is also the thumbnail's drag-source kind (data-drag-actor, shell.js) —
// dragging the whole wrap onto another group's [data-drop-actor-group]
// moves the NPC there (scenes.js's moveSceneActor), no restriction by
// #character tag or which group it started in.
function actorThumb(doc, npc, kind, { expandable = false, expanded = false } = {}) {
  const img = npc.thumbnailId ? getGalleryImage(doc, npc.thumbnailId) : null;
  const photo = img
    ? `<img class="actor-thumb-photo" src="${esc(img.dataUrl)}" alt="">`
    : `<span class="actor-thumb-photo actor-thumb-photo-empty" aria-hidden="true">${esc((npc.name || '?').trim().slice(0, 1).toUpperCase())}</span>`;
  const removeAttr = kind === 'protagonist' ? 'data-scene-protagonist-remove'
    : kind === 'antagonist' ? 'data-scene-antagonist-remove' : 'data-scene-bystander-remove';
  return `<div class="actor-thumb-wrap" draggable="true" data-drag-actor="${esc(kind)}::${esc(npc.id)}">
    <div class="actor-thumb-circle">
      <button type="button" class="actor-thumb" data-open-entity="${esc(npc.id)}" title="${esc(npc.name || 'Unnamed')}">${photo}</button>
      ${expandable ? `<button type="button" class="actor-thumb-badge actor-thumb-badge-expand" data-scene-npc-toggle="${esc(npc.id)}" title="${expanded ? 'Collapse scene details' : 'Scene details'}">${expanded ? '▾' : '▸'}</button>` : ''}
      <button type="button" class="actor-thumb-badge actor-thumb-badge-remove" ${removeAttr}="${esc(npc.id)}" title="Remove from this scene">✕</button>
    </div>
    <span class="actor-thumb-name">${esc(npc.name || 'Unnamed')}</span>
  </div>`;
}

// Simple, read-only, mention-style thumbnail (photo + name) for entities
// OUTSIDE WHO's own Actor system — WHERE's System row, Factions active
// nearby, Assets present. Same visual language as actorThumb above
// (direct request: "thumbnails like those used for NPCs") but without the
// scene-actor-specific drag/expand-badge machinery, since none of these
// are "actors in a scene" that move between groups. `removeAttrHtml`, if
// given, is a FULL pre-built `attr="value"` string (not just an attribute
// name) since callers need different shapes — a plain
// data-scene-asset-remove="id", vs Factions' compound
// data-where-faction-unlink="locId::factionId".
function entityThumb(doc, entity, { removeAttrHtml = '', expandAttrHtml = '', expanded = false, topLabel = '' } = {}) {
  const img = entity.thumbnailId ? getGalleryImage(doc, entity.thumbnailId) : null;
  const photo = img
    ? `<img class="actor-thumb-photo" src="${esc(img.dataUrl)}" alt="">`
    : `<span class="actor-thumb-photo actor-thumb-photo-empty" aria-hidden="true">${esc((entity.name || '?').trim().slice(0, 1).toUpperCase())}</span>`;
  return `<div class="actor-thumb-wrap">
    ${topLabel ? `<span class="actor-thumb-toplabel">${esc(topLabel)}</span>` : ''}
    <div class="actor-thumb-circle">
      <button type="button" class="actor-thumb" data-open-entity="${esc(entity.id)}" title="${esc(entity.name || 'Unnamed')}">${photo}</button>
      ${expandAttrHtml ? `<button type="button" class="actor-thumb-badge actor-thumb-badge-expand" ${expandAttrHtml} title="${expanded ? 'Collapse details' : 'Details'}">${expanded ? '▾' : '▸'}</button>` : ''}
      ${removeAttrHtml ? `<button type="button" class="actor-thumb-badge actor-thumb-badge-remove" ${removeAttrHtml} title="Remove">✕</button>` : ''}
    </div>
    <span class="actor-thumb-name">${esc(entity.name || 'Unnamed')}</span>
  </div>`;
}

// Location details' top-label (direct follow-up request): "District" or
// "Site" printed right above the thumbnail circle, tag-driven off the
// entity's own #district/#site tag — the same two tags addSceneLocation
// (scenes.js) already treats as their own "one at a time" type. Any other
// tag (or no tag) gets no label, same as before.
function locationTypeTopLabel(entity) {
  const tags = entity.tags || [];
  if (tags.includes('district')) return 'District';
  if (tags.includes('site')) return 'Site';
  return '';
}

// Shared collapsible-group shell for WHO's five thumbnail groups
// (Protagonists/Antagonists/Bystanders/Factions active nearby/Assets
// present, direct follow-up request) plus WHERE's Nearby locations — a
// header (collapse toggle + optional "+"/other controls + "?" help) plus
// a body that collapses away entirely rather than just visually hiding.
// Default expanded (ui.collapsedActorGroups, shell.js — an empty Set,
// matching every WHO group's prior always-expanded behavior), UNLESS
// `defaultCollapsed` is given (Nearby locations, direct follow-up
// request: "be a collapsed section... by default") — the Set is then read
// inverted (present in the Set means the GM explicitly opened it, same
// "tracks explicit action" shape basesOfInfluenceToggled already
// established for an analogous default-open-when-empty flip), so the one
// shared toggle handler still works unmodified for both directions. The
// toggle button carries .field-label-static directly (not .btn/
// .dashboard-section-toggle) so its font stays IDENTICAL to before this
// became clickable — direct request ("without changing the current font
// style") — styles/cockpit.css resets just its button-chrome (background/
// border/padding/cursor), not its type styling. `dropGroup`, if given,
// marks this as a drag target — `dropAttr` (default 'data-drop-actor-
// group', WHO's own Actor groups, moveSceneActor's drag-between-groups)
// lets a DIFFERENT caller opt into a different attribute name/semantic
// instead (direct follow-up request: "allow drag of entities into
// sections designed to load and list them... adding NPCs to WHO... and
// Locations to WHERE" — WHERE's Location Details group uses
// 'data-drop-location-group' so it isn't mistaken for one of WHO's own
// protagonist/antagonist/bystander kinds).
function collapsibleThumbGroup(ui, { key, label, count, helpKey, hint, dropGroup, dropAttr = 'data-drop-actor-group', headerExtra, body, defaultCollapsed = false }) {
  const toggled = ((ui && ui.collapsedActorGroups) || new Set()).has(key);
  const collapsed = defaultCollapsed ? !toggled : toggled;
  return `<div class="workspace-mini-section npc-scene-group"${dropGroup ? ` ${dropAttr}="${esc(dropGroup)}"` : ''}>
    <div class="section-head-row">
      <button type="button" class="field-label-static actor-group-toggle" data-actor-group-toggle="${esc(key)}">${collapsed ? '▸' : '▾'} ${esc(label)} (${count})</button>
      <span class="entity-chip-row">
        ${headerExtra || ''}
        ${helpToggle(helpKey)}
      </span>
    </div>
    ${wsHelpBody(helpKey, esc(hint), ui)}
    ${collapsed ? '' : body}
  </div>`;
}

// An expanded NPC's scene-scoped detail body (the already-existing
// permanent `currentGoal` field, entities.js, reused as-is, plus the 5
// scene-scoped fields — Disposition/Motivation/Threat Rank/Challenges/
// Opportunities — each oracle-seedable and edited in place). Split out
// from the thumbnail itself (actorThumb, above) so the thumbnail row
// stays compact and a detail body, when toggled open, renders full-width
// below the whole row instead of cramped inside one flex item.
function npcSceneDetailBody(doc, ui, scene, npc) {
  const state = getNpcSceneState(scene, npc.id);
  return `<div class="npc-scene-card npc-scene-card-detail">
    <div class="section-head-row">
      <button type="button" class="entity-chip" data-open-entity="${esc(npc.id)}">${esc(npc.name || 'Unnamed')}</button>
      <button type="button" class="icon-btn" data-scene-npc-toggle="${esc(npc.id)}" title="Collapse">▾</button>
    </div>
    <div class="npc-scene-card-body">
      <label class="field-label sm">Current goal
        <input type="text" data-npc-current-goal="${esc(npc.id)}" value="${esc(npc.currentGoal || '')}" placeholder="What do they want right now?">
      </label>
      ${oracleFieldRow('Disposition', state.disposition.value, `data-scene-npc-roll="${esc(npc.id)}::disposition"`, `data-scene-npc-field="${esc(npc.id)}::disposition"`, `data-scene-npc-field-clear="${esc(npc.id)}::disposition"`)}
      ${oracleFieldRow('Motivation', state.motivation.value, `data-scene-npc-roll="${esc(npc.id)}::motivation"`, `data-scene-npc-field="${esc(npc.id)}::motivation"`, `data-scene-npc-field-clear="${esc(npc.id)}::motivation"`)}
      ${oracleFieldRow('Threat Rank', state.threatRank.value, `data-scene-npc-roll="${esc(npc.id)}::threatRank"`, `data-scene-npc-field="${esc(npc.id)}::threatRank"`, `data-scene-npc-field-clear="${esc(npc.id)}::threatRank"`)}
      ${oracleFieldRow('Challenges', state.challenges.value, `data-scene-npc-roll="${esc(npc.id)}::challenges"`, `data-scene-npc-field="${esc(npc.id)}::challenges"`, `data-scene-npc-field-clear="${esc(npc.id)}::challenges"`)}
      ${oracleFieldRow('Opportunities', state.opportunities.value, `data-scene-npc-roll="${esc(npc.id)}::opportunities"`, `data-scene-npc-field="${esc(npc.id)}::opportunities"`, `data-scene-npc-field-clear="${esc(npc.id)}::opportunities"`)}
    </div>
  </div>`;
}

// WHO's three scene-scoped Actor groups (docs/adr/0041 Phase 13b; WHO
// redesign, direct follow-up request — Focus's free-text @mention editor
// is gone, along with the old "derive Protagonists/Antagonists by parsing
// it" mechanism). All three — Protagonists/Antagonists/Bystanders — are
// now equally GM-curated id lists on the current scene (scenes.js), each
// with its own "+" entity picker (data-entity-picker-open="protagonist"|
// "antagonist"|"bystander", shell.js) filtered to NPCs (Protagonists to
// #character-tagged NPCs, Antagonists to everyone else, Bystanders to any
// NPC) and its own remove control on every thumbnail. All three need an
// active scene to hang per-NPC state on — before the first "Continue
// Story," there's nothing to track yet.
function npcSceneGroupsBlock(doc, ui) {
  const scenes = doc.scenes || [];
  if (!scenes.length) return '<div class="ws-placeholder">Continue Story (Advisor) to start a scene — NPC roles and scene-specific details track per scene.</div>';
  const scene = scenes[scenes.length - 1];
  const protagonists = (scene.protagonistIds || []).map((id) => getEntity(doc, id)).filter(Boolean);
  const antagonists = (scene.antagonistIds || []).map((id) => getEntity(doc, id)).filter(Boolean);
  const bystanders = (scene.bystanderIds || []).map((id) => getEntity(doc, id)).filter(Boolean);
  const expandedSet = (ui && ui.expandedSceneNpcs) || new Set();

  const group = (key, label, singular, hint, npcs, kind) => collapsibleThumbGroup(ui, {
    key, label, count: npcs.length, helpKey: key, hint, dropGroup: kind,
    headerExtra: `<button type="button" class="icon-btn" data-entity-picker-open="${esc(kind)}" title="Add ${esc(singular)}">＋</button>`,
    body: `${npcs.length ? `<div class="actor-thumb-row">${npcs.map((n) => actorThumb(doc, n, kind, { expandable: true, expanded: expandedSet.has(n.id) })).join('')}</div>` : '<p class="dim small">None yet.</p>'}
      ${npcs.filter((n) => expandedSet.has(n.id)).map((n) => npcSceneDetailBody(doc, ui, scene, n)).join('')}`,
  });

  return `
    ${group('who:protagonists', 'Protagonists', 'a Protagonist', "PCs and close allies — pick from NPCs tagged #character, or drag one in from another group.", protagonists, 'protagonist')}
    ${group('who:antagonists', 'Antagonists', 'an Antagonist', 'Opposition and complicating NPCs in this scene — or drag one in from another group.', antagonists, 'antagonist')}
    ${group('who:bystanders', 'Bystanders', 'a Bystander', "Observers you've added to this scene — react to events, not directly involved. Drag any Actor here, including a #character NPC, to demote them to a bystander.", bystanders, 'bystander')}`;
}

// WHERE's Site Description/Immediate Surroundings (direct follow-up
// request: "Wire 'Change Location' to some new fields that include a Site
// description and Immediate surroundings... Reintroduce that
// functionality below the Location Details thumbnails and map each field
// to oracles... This would replace FOCUS and be used in its place when
// building the Scene Summary") — two first-class context.where fields
// (schema.js), each its own row. Direct follow-up corrections reshaped
// this from the first version: (1) "text fields should be visible...
// where just the editor menu is collapsed as usual" — the field itself is
// ALWAYS rendered (no whole-row expand/collapse); only the formatting-
// toolbar row collapses. (2) "clicking the oracle... generates an
// alert... but the value is not added" — the 🔮 icon is a direct roll-
// and-fill (data-where-field-roll, session.js's rollWhereDetailField, same
// immediate-replace convention as a Location's Sights/Smells/Sounds —
// rollLocationSensoryField), not a jump-to-browse link; an oracle table
// with no matching tag simply renders no icon at all (oracleLinkTagsFor
// still gates whether one exists). (3) "reapply the same arrow... but
// only collapse the editor menu and not the textbox too" — the toolbar
// toggle is richToolbarToggleHTML (mentionEditor.js), same as WHAT/WHY/HOW.
// A later direct follow-up ("apply that arrow architecture to all text
// editors") retired that function's earlier pencil glyph in favor of the
// same ◂ (collapsed) / ▾ (expanded) arrow pair used here from the start,
// so this call site needed no further change — it already matches. Label
// text and the icon group are two separate spans (field-label-text/
// field-label-actions) rather than relying on the icon-being-first-child
// CSS trick, so the icons stay right-aligned regardless of how many are
// present.
function whereDetailField(fieldKey, label, val, placeholder, doc, ui) {
  const toolbarKey = `where:${fieldKey}`;
  const collapsed = toolbarCollapsed(doc, ui, toolbarKey);
  const tags = oracleLinkTagsFor('where', fieldKey);
  const oracleIcon = tags
    ? `<button type="button" class="icon-btn icon-mono" data-where-field-roll="${fieldKey}" title="Roll ${tags.map(esc).join(', ')} and fill this field">🔮</button>`
    : '';
  return `<div class="field-label sm">
    <span class="field-label-row">
      <span class="field-label-text">${esc(label)}</span>
      <span class="field-label-actions">${oracleIcon}${richToolbarToggleHTML(toolbarKey, collapsed)}</span>
    </span>
    <div class="rich-field">${richToolbarHTML(toolbarKey, collapsed, { includeToggle: false })}<div class="mention-editor" contenteditable="true" data-ctx="where.${fieldKey}" data-placeholder="${esc(placeholder)}">${buildMentionEditorHTML(doc, val)}</div></div>
  </div>`;
}
function whereDetailFieldsBlock(doc, ui) {
  const w = doc.context.where || {};
  return `<div class="threads where-detail-fields">
    ${whereDetailField('siteDescription', 'Site Description', w.siteDescription, 'e.g. Settlement edge…', doc, ui)}
    ${whereDetailField('surroundings', 'Immediate Surroundings', w.surroundings, 'e.g. Inside a building…', doc, ui)}
  </div>`;
}

// WHERE's docked-Faction-Events side panel (whole-card relocation, direct
// request — see factionEventsDockedInWhere's original comment history)
// keeps its exact logic, just returns a fragment now instead of wrapping
// a whole top-level view. The System/Star/Colony-Base/District quick-
// reference strip that used to render inline at the top of this section
// (a special header-row slot that doesn't exist anymore now that
// `dashboardSection` supplies the section's own header) now lives inside
// `whereLocationHierarchyBlock` instead — direct request, grouped under
// WHERE rather than its own separate block.
function whereSectionBody(doc, ui) {
  const body = `
    ${whereLocationHierarchyBlock(doc, ui)}
    ${whereDetailFieldsBlock(doc, ui)}
    ${locationFactionsBlock(doc, ui)}
    ${locationConflictsBlock(doc)}
    ${factionActivityHereBlock(doc)}`;
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

// A Location Details entry's expanded detail body (Location type — the
// old "Object type" label, renamed per direct request — plus Sights/
// Smells/Sounds, plus — direct follow-up request — the old standalone
// "Location Story" section's own rich-text field, merged in here and
// relabeled "Regional faction activity" ("merge the 'Location Story' text
// field as part of the dropdown opened by the thumbnail arrow... remove
// Location Story as a separate section"). Same underlying
// loc.locationStory field/data-location-story attribute/placeholder as
// before, just relocated and re-headed; its own 💡 (data-suggest-faction-
// oracles) draws a #faction/#agenda oracle set (session.js's
// drawFactionActivityOracles) and pushes it onto the Advisor's Suggested
// oracles history stack (shell.js's pushSuggestedOracleEntry,
// copilotPanel.js). Split out from its thumbnail row for the same reason
// npcSceneDetailBody is split from actorThumb: the thumbnail row stays
// compact, the body renders full-width below the whole row when toggled
// open. Sector is dropped entirely (direct request — it's the Zone
// tied to the #system, shown once in row 1, not per-location).
function locationDetailBody(doc, ui, loc) {
  const toolbarKey = `location:${loc.id}:story`;
  return `<div class="npc-scene-card npc-scene-card-detail">
    <div class="section-head-row">
      <button type="button" class="entity-chip" data-open-entity="${esc(loc.id)}">${esc(loc.name || 'Unnamed')}</button>
      <button type="button" class="icon-btn" data-location-details-toggle="${esc(loc.id)}" title="Collapse">▾</button>
    </div>
    <div class="npc-scene-card-body">
      <label class="field-label sm">Location type
        <select data-location-field="${esc(loc.id)}::objectType">
          <option value="">— unset —</option>
          ${LOCATION_OBJECT_TYPES.map((t) => `<option value="${esc(t)}" ${t === loc.objectType ? 'selected' : ''}>${esc(t)}</option>`).join('')}
        </select>
      </label>
      ${oracleFieldRow('Sights', loc.sights || '', `data-location-sensory-roll="${esc(loc.id)}::sights"`, `data-location-field="${esc(loc.id)}::sights"`, `data-location-sensory-clear="${esc(loc.id)}::sights"`)}
      ${oracleFieldRow('Smells', loc.smells || '', `data-location-sensory-roll="${esc(loc.id)}::smells"`, `data-location-field="${esc(loc.id)}::smells"`, `data-location-sensory-clear="${esc(loc.id)}::smells"`)}
      ${oracleFieldRow('Sounds', loc.sounds || '', `data-location-sensory-roll="${esc(loc.id)}::sounds"`, `data-location-field="${esc(loc.id)}::sounds"`, `data-location-sensory-clear="${esc(loc.id)}::sounds"`)}
      <div class="field-label sm">
        <span class="field-label-row">
          <span class="field-label-static">Regional faction activity</span>
          ${richToolbarToggleHTML(toolbarKey, toolbarCollapsed(doc, ui, toolbarKey))}
          <button type="button" class="icon-btn" data-suggest-faction-oracles="${esc(loc.id)}" title="Suggest relevant oracles in the Advisor">💡</button>
        </span>
        <div class="rich-field">${richToolbarHTML(toolbarKey, toolbarCollapsed(doc, ui, toolbarKey), { includeToggle: false })}<div class="mention-editor" contenteditable="true" data-location-story="${esc(loc.id)}" data-placeholder="How are factions operating here? What's brewing?">${buildMentionEditorHTML(doc, loc.locationStory)}</div></div>
      </div>
    </div>
  </div>`;
}

// WHERE's location hierarchy (direct follow-up requests, several rounds):
// Current Location's System/Star quick reference AND every other
// current location's Sights/Smells/Sounds details, CONSOLIDATED into one
// block instead of two separately-rendered pieces reading as "two
// different location tracking mechanisms." WHERE no longer has a Focus
// field or a tag/candidate-listbox picker either — like WHO's own
// Actors before it, "the current location(s)" is now the current scene's
// own curated list (scene.locationIds, scenes.js) via getCurrentWhereLocations,
// not text scanned for @mentions; the first entry is "the" primary
// location everywhere that concept is used.
//
// Two always-present sections (direct follow-up request): "System" (row
// 1) and "Location details" below it — never conditionally hidden on
// each other, so the System section is reachable even from a totally
// empty scene.
//
// Row 1 is the System: a thumbnail (entityThumb, "like the NPC
// thumbnail") left-aligned, with the resolved Star's name and "(Zone)
// Hex" (getHexZoneForLocation) in a two-line block to its right,
// vertically centered against the thumbnail. System/Star stay
// relationship-graph reads (getSystemForLocation/getStarForLocation,
// entities.js — "just use the Relationships for setting the choice"),
// never a stored/picked field themselves — but SETTING one up now goes
// through "New Location" (data-where-add-location, shell.js) instead of
// only a manual Relationships edit: it lists existing #system-tagged
// Locations to pick from, or — none exist — prompts to create one
// (scenes.js's setSceneSystem does the actual pick/link/replace, still
// landing on a real located_at edge or a self-#system-tagged anchor
// under the hood). The resolved row keeps its "🔗" too, for manually
// fixing/undoing the edge directly. With no System yet, the row is a
// blank thumbnail (actor-thumb-photo-empty, same visual language an NPC
// with no photo already uses) carrying a "+" instead of an initial
// letter, wired to that same New Location control.
//
// Below it, "Location details" is a sixth collapsible thumbnail group
// (collapsibleThumbGroup, "formatted like Protagonists") — ONE "+" (icon-
// only, "like the approach for NPCs" — direct follow-up request replacing
// the earlier "Pick location" text chip plus two separate role-specific
// Colony-Base/District "+"s with a single control) adds a Location entity
// to the scene's curated list (excluding #star/#system-tagged ones — those
// belong to row 1, not here) — MINUS whichever entry already appears as
// System/Star in row 1, so nothing repeats. addSceneLocation (scenes.js)
// enforces "ONE entity of each type" purely off the entity's own tags —
// picking a second #district (or #site, or #colony) swaps out the first
// rather than accumulating both; Colony-Base/District's own dedicated
// colonyBaseId/districtId fields are retired from this UI as a result
// (left inert in the schema, migration rule 5) — the tag-driven list is
// now the one mechanism for all of them. Each thumbnail carries a small
// top label (locationTypeTopLabel, above) reading "District" or "Site"
// when that tag applies, "for quick clarification" (direct request) —
// nothing else gets one. Each thumbnail also expands (locationDetailBody)
// to reveal Location type + Sights/Smells/Sounds; every entry's "✕"
// (data-scene-location-remove) drops it from the curated list.
function whereLocationHierarchyBlock(doc, ui) {
  const whereLocations = getCurrentWhereLocations(doc);
  if (!(doc.scenes || []).length) return '<div class="ws-placeholder">Continue Story (Advisor) to start a scene — Location tracking is per scene.</div>';
  const primary = whereLocations[0] || null;
  const system = primary ? getSystemForLocation(doc, primary.id) : null;
  const star = primary ? getStarForLocation(doc, primary.id) : null;

  // Row 1 (the System section) always renders now, even before any
  // scene location exists at all — "New Location" (below) is the one
  // entry point into picking or creating the scene's System, so it has
  // to be reachable from the very first, fully-empty state too, not only
  // once a Location Details anchor already exists.
  let systemRow;
  if (system) {
    const hz = getHexZoneForLocation(doc, system.id);
    const zoneHex = [hz.zone ? `(${esc(hz.zone)})` : '', hz.hex ? esc(hz.hex) : ''].filter(Boolean).join(' ');
    // The System's own name moved off the thumbnail (direct follow-up
    // request) — a plain photo/circle, no name underneath — to a new
    // first line in the info block, above the Star name; the thumbnail
    // itself grows to fill that block's full height (three lines: System/
    // Star/Zone+Hex) via CSS stretch instead of staying the small fixed
    // NPC-thumbnail size.
    const img = system.thumbnailId ? getGalleryImage(doc, system.thumbnailId) : null;
    const photo = img
      ? `<img class="actor-thumb-photo" src="${esc(img.dataUrl)}" alt="">`
      : `<span class="actor-thumb-photo actor-thumb-photo-empty" aria-hidden="true">${esc((system.name || '?').trim().slice(0, 1).toUpperCase())}</span>`;
    systemRow = `<div class="location-hierarchy-row">
      <div class="location-hierarchy-thumb">
        <button type="button" class="actor-thumb" data-open-entity="${esc(system.id)}" title="${esc(system.name || 'Unnamed')}">${photo}</button>
      </div>
      <div class="location-hierarchy-info">
        <div class="location-hierarchy-system">${esc(system.name || 'Unnamed')}</div>
        <div class="location-hierarchy-star">${star ? esc(star.name || 'Unnamed') : '<span class="dim small">No Star linked</span>'}</div>
        <div class="location-hierarchy-zonehex dim small">${zoneHex || '—'}</div>
      </div>
      <button type="button" class="icon-btn" data-location-edit-relationships="${esc(primary.id)}" title="Edit System/Star via Relationships (Cast)">🔗</button>
    </div>`;
  } else {
    systemRow = `<div class="location-hierarchy-row">
      <div class="actor-thumb-wrap">
        <div class="actor-thumb-circle">
          <button type="button" class="actor-thumb" data-where-add-location title="Select or create the System">
            <span class="actor-thumb-photo actor-thumb-photo-empty" aria-hidden="true">＋</span>
          </button>
        </div>
        <span class="actor-thumb-name">Select System</span>
      </div>
    </div>`;
  }

  const skipIds = new Set([system && system.id, star && star.id].filter(Boolean));
  const entries = whereLocations.filter((l) => !skipIds.has(l.id));

  const expandedSet = (ui && ui.expandedLocationDetails) || new Set();
  const thumbs = entries.map((loc) => entityThumb(doc, loc, {
    removeAttrHtml: `data-scene-location-remove="${esc(loc.id)}"`,
    expandAttrHtml: `data-location-details-toggle="${esc(loc.id)}"`,
    expanded: expandedSet.has(loc.id),
    topLabel: locationTypeTopLabel(loc),
  })).join('');

  const locationDetailsGroup = collapsibleThumbGroup(ui, {
    key: 'where:location-details', label: 'Location details', count: entries.length,
    helpKey: 'where:location-details',
    hint: 'Locations in the current scene, not counting the System above — one per type (picking a second #district or #site replaces the first). Drag a Location entity in from Cast to add it the same way.',
    headerExtra: `<button type="button" class="icon-btn" data-entity-picker-open="location-current" title="Add a Location">＋</button>`,
    // Direct follow-up request: "allow drag of entities into sections
    // designed to load and list them... Locations to 'WHERE it happens'"
    // — a Cast entity row's own drag (data-drag-entity, ENTITY_DRAG_TYPE)
    // dropped here adds it the same way the "+" picker does
    // (completeLocationEntityDrop, shell.js); a dedicated attribute name
    // (not WHO's own data-drop-actor-group) since "current" isn't one of
    // WHO's protagonist/antagonist/bystander kinds.
    dropGroup: 'current', dropAttr: 'data-drop-location-group',
    body: `${entries.length ? `<div class="actor-thumb-row">${thumbs}</div>` : '<p class="dim small">None yet.</p>'}
      ${entries.filter((l) => expandedSet.has(l.id)).map((l) => locationDetailBody(doc, ui, l)).join('')}`,
  });

  return `
    <div class="workspace-mini-section current-location-banner">${systemRow}</div>
    ${locationDetailsGroup}`;
}

// Direct follow-up request: "Add a '+' icon button to the 'WHAT is
// happening' section row that adds a Conflict entity as a chip under the
// Situation textbox." Same header-row "+" convention whoHeaderExtra above
// already established, opening the shared entity-picker overlay
// (data-entity-picker-open="what-conflict", shell.js) filtered to Conflict
// entities instead of a bespoke picker.
function whatHeaderExtra() {
  return `<button type="button" class="icon-btn" data-entity-picker-open="what-conflict" title="Attach a Conflict">＋</button>`;
}

// A Conflict chip attached to WHAT (context.what.entityIds — the exact
// same generic entityIds array/addContextEntity/removeContextEntity every
// other context question already has, WHAT just never had a picker
// writing to it before this). Direct follow-up request: "When click on
// the chip, it opens a box with fields from the Conflict entity record...
// clicking the title of the Conflict opens the entity editor to that
// record. otherwise the chip just opens the box" — the chip itself
// (data-what-conflict-toggle) only ever toggles the detail box; the
// title INSIDE that box (data-open-entity) is the one thing that opens
// the real Entity Editor.
function whatConflictsBlock(doc, ui) {
  const ids = (doc.context.what && doc.context.what.entityIds) || [];
  const conflicts = ids.map((id) => getEntity(doc, id)).filter((e) => e && e.type === 'conflict');
  if (!conflicts.length) return '';
  const expandedSet = (ui && ui.expandedWhatConflicts) || new Set();
  const chips = conflicts.map((c) => `
    <button type="button" class="entity-chip ${expandedSet.has(c.id) ? 'active' : ''}" data-what-conflict-toggle="${esc(c.id)}" title="${esc(c.name) || 'Unnamed'}">${esc(c.name) || 'Unnamed'}</button>`).join('');
  const bodies = conflicts.filter((c) => expandedSet.has(c.id)).map((c) => whatConflictDetailBody(c)).join('');
  return `<div class="workspace-mini-section">
    <div class="entity-chips">${chips}</div>
    ${bodies}
  </div>`;
}

// Exact field order per direct request: Conflict status, "What people say
// it's about" (statedCause), "What's actually driving it" (rootCause),
// "Why the gap matters" (causeGapHook), "Someone innocent gets hurt
// regardless" (thirdPartyCasualty), then the session hooks list. Every
// input commits through data-conflict-field="<entityId>::<field>"
// (shell.js) — a NEW entity-scoped attribute, not the Entity Editor's own
// data-entity-field (which always targets doc.entities.activeId, the
// WRONG entity here — the GM is looking at WHAT, not Cast). Session hooks
// reuse the Entity Editor's own conflict-hook attributes verbatim
// (data-conflict-hook-toggle/-remove/-input/-add), which already carry
// an explicit entity id the same way.
function whatConflictDetailBody(c) {
  const hookRows = (c.sessionHooks || []).map((h) => `<div class="thread-row">
      <span class="thread-name"><label><input type="checkbox" data-conflict-hook-toggle="${esc(c.id)}::${esc(h.id)}" ${h.used ? 'checked' : ''}> <span class="${h.used ? 'dim small' : ''}">${esc(h.text)}</span></label></span>
      <span class="thread-actions"><button class="icon-btn" data-conflict-hook-remove="${esc(c.id)}::${esc(h.id)}" title="Remove">✕</button></span>
    </div>`).join('');
  return `<div class="npc-scene-card npc-scene-card-detail">
    <div class="section-head-row">
      <button type="button" class="entity-chip" data-open-entity="${esc(c.id)}">${esc(c.name) || 'Unnamed'}</button>
      <span class="entity-chip-row">
        <button type="button" class="icon-btn" data-what-conflict-remove="${esc(c.id)}" title="Detach from WHAT (does not delete the Conflict)">✕</button>
      </span>
    </div>
    <div class="npc-scene-card-body">
      <label class="field-label sm">Status
        <select data-conflict-field="${esc(c.id)}::status">${CONFLICT_STATUS_OPTIONS.map(([v, l]) => `<option value="${esc(v)}" ${c.status === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
      </label>
      <label class="field-label sm">What people say it's about
        <input data-conflict-field="${esc(c.id)}::statedCause" value="${esc(c.statedCause)}" placeholder="The public story">
      </label>
      <label class="field-label sm">What's actually driving it
        <input data-conflict-field="${esc(c.id)}::rootCause" value="${esc(c.rootCause)}" placeholder="The real reason">
      </label>
      <label class="field-label sm">Why the gap matters
        <input data-conflict-field="${esc(c.id)}::causeGapHook" value="${esc(c.causeGapHook)}" placeholder="What happens if the party notices">
      </label>
      <label class="field-label sm">Someone innocent gets hurt regardless
        <input data-conflict-field="${esc(c.id)}::thirdPartyCasualty" value="${esc(c.thirdPartyCasualty)}" placeholder="Who, and how">
      </label>
      <span class="field-label-static">Session hooks</span>
      ${hookRows || '<p class="dim small">None yet.</p>'}
      <div class="rel-add">
        <input data-conflict-hook-input="${esc(c.id)}" placeholder="New session hook…">
        <button class="btn ghost sm" data-conflict-hook-add="${esc(c.id)}">+ Add</button>
      </div>
    </div>
  </div>`;
}

// Threat/Mystery/Stress/Resources/Reputation dials now live once, in the
// Dashboard's own header (below) — not duplicated here.
function whatSectionBody(doc, ui) {
  const c = doc.context.what;
  return `
    <div class="field-label">
      <span class="field-label-row">Situation${richToolbarToggleHTML('what:situation', toolbarCollapsed(doc, ui, 'what:situation'))}</span>
      <div class="rich-field">${richToolbarHTML('what:situation', toolbarCollapsed(doc, ui, 'what:situation'), { includeToggle: false })}<div class="mention-editor" contenteditable="true" data-ctx="what.situation" data-placeholder="What is unresolved right now?">${buildMentionEditorHTML(doc, c.situation)}</div></div>
    </div>
    ${whatConflictsBlock(doc, ui)}
    <label class="field-label">Intent
      <select data-ctx="what.intent">
        ${INTENTS.map((i) => `<option ${i === c.intent ? 'selected' : ''}>${i}</option>`).join('')}
      </select>
    </label>
    <div class="shift-actions">
      <button class="chip" data-suggest-oracles title="Suggest Oracle tables in the Advisor, based on Intent and Scene Details"><span class="icon-mono">🔮</span> Suggest oracles</button>
    </div>
    ${lastScene(doc, ui)}
    ${worldFlagsBlock(doc)}`;
}

function whySectionBody(doc, ui) {
  return `
    ${summaryField('why', doc.context.why.summary, 'The current goal or stakes…', doc, ui)}
    <div class="shift-actions">
      <button class="chip" data-shift-prompt="Set Objective">◎ Set Objective</button>
    </div>
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
// two real sibling cards so each can be addressed (and, at a compact
// viewport, shown/hidden) independently. `.storyboard-grid` (styles/
// cockpit.css) lays them out side by side — desktop only now.
//
// Compact widths — phone AND tablet (design/UX-ROADMAP.md Steps 4/5): this
// whole render is hidden by CSS and shell.js skips calling it at all
// (isCompactTab()) — Composer and Navigator instead render via their own
// exported *BodyHtml functions below, as permanently-pinned tabs sharing
// the same panel drawers use, so each is reachable on its own instead of
// requiring a very long scroll past whichever card is taller (the bug
// two-column position:sticky had, and the bug plain stacking still had —
// a phone user could reach Composer but Navigator was effectively
// unreachable below it; tablet has the same "no room for 3 columns plus a
// drawer side by side" problem desktop doesn't, so it gets the identical
// treatment rather than a third, separate layout).
//
// Rules Profiles (design/adr/rules-profiles-multi-campaign.md): which
// content fills Composer/Navigator/Advisor is now a per-profile choice, not
// fixed to this file's own two bodies below — shell.js owns resolving a
// position's assigned content id (built-in, or any other module) and
// assembling the two-column grid, since that dispatch needs renderDrawer()
// (drawers/index.js) and renderCopilot() (copilotPanel.js) alongside these,
// which this file can't import without a circular dependency (drawers/
// index.js already imports this file's dashboardSection helpers indirectly
// via factionEvents.js). `positionCardHtml` below is the shared chrome
// shell.js wraps ANY position's content in, built-in or not.
export function positionCardHtml(title, body, extraClass) {
  return card(title, '', body, extraClass);
}

export function composerBodyHtml(doc, ui) {
  const activity = doc.context.how.activity || '';
  return `
    <label class="field-label sm">Activity
      <select data-ctx="how.activity">
        <option value="">— none set —</option>
        ${ACTIVITIES.map((a) => `<option value="${a.id}" ${a.id === activity ? 'selected' : ''}>${esc(a.label)}</option>`).join('')}
      </select>
    </label>
    ${dashboardSection('who', 'WHO is here', 'People and factions in play.', whoSectionBody(doc, ui), doc, ui, whoHeaderExtra())}
    ${dashboardSection('where', 'WHERE it happens', 'The place the scene is set.', whereSectionBody(doc, ui), doc, ui)}
    ${dashboardSection('what', 'WHAT is happening', 'The active situation.', whatSectionBody(doc, ui), doc, ui, whatHeaderExtra())}
    ${dashboardSection('why', 'WHY they are here', 'The objective driving the party, tracked as progress clocks.', whySectionBody(doc, ui), doc, ui)}
    ${dashboardSection('how', 'HOW it plays', 'Mode and pacing for the current scene.', howSectionBody(doc, ui), doc, ui)}
  `;
}

export function navigatorBodyHtml(doc, ui) {
  return `
    ${narrativeComposerBlock(doc, ui)}
    ${dashboardTrackersBlock(doc)}
  `;
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

// WHERE/WHY's free-text Focus field (rich @mention editor) — WHO used to
// share this too, but no longer has a Focus field at all (direct follow-
// up request: entity selection in WHO happens exclusively through each
// Actor group's own "+" picker, never by typing into a textbox).
function summaryField(key, val, placeholder, doc, ui) {
  const toolbarKey = `${key}:summary`;
  return `<div class="field-label">
    <span class="field-label-row">Focus${richToolbarToggleHTML(toolbarKey, toolbarCollapsed(doc, ui, toolbarKey))}</span>
    <div class="rich-field">${richToolbarHTML(toolbarKey, toolbarCollapsed(doc, ui, toolbarKey), { includeToggle: false })}<div class="mention-editor" contenteditable="true" data-ctx="${key}.summary" data-placeholder="${esc(placeholder)}">${buildMentionEditorHTML(doc, val)}</div></div>
  </div>`;
}


// A Factions active nearby entry's expanded detail body (direct follow-up
// request — parity with NPCs' own scene-detail expand): read-only
// Agenda/Fear/Need/HQ snippets, the same real entity fields
// locationFactionsBlock already truncates for its own quick digest, shown
// here in full since this IS the "view details" affordance.
function factionDetailBody(faction) {
  const strip = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const rows = [['Agenda', faction.agenda], ['Fear', faction.fear], ['Need', faction.need], ['HQ', faction.hq]]
    .filter(([, v]) => strip(v));
  return `<div class="npc-scene-card npc-scene-card-detail">
    <div class="section-head-row">
      <button type="button" class="entity-chip" data-open-entity="${esc(faction.id)}">${esc(faction.name || 'Unnamed')}</button>
      <button type="button" class="icon-btn" data-faction-nearby-toggle="${esc(faction.id)}" title="Collapse">▾</button>
    </div>
    <div class="npc-scene-card-body">
      ${rows.length ? rows.map(([label, v]) => `<div class="field-label sm">${esc(label)}<div class="dim small">${esc(strip(v))}</div></div>`).join('')
        : '<p class="dim small">No Agenda/Fear/Need/HQ set yet — add it in Cast.</p>'}
    </div>
  </div>`;
}

// Faction Events tie-in (docs/adr/0031's Faction Events follow-up),
// redesigned as one of WHO's five collapsible thumbnail groups (direct
// follow-up request). "Active nearby" pools THREE sources now: present
// anywhere in the region (factionsInRegion, factionTurnEngine.js — the
// full location containment tree, region-hop and all) of whichever
// Location(s) are currently @mentioned in WHERE's own Focus text
// (getCurrentWhereLocations); a manual `located_at` relationship (the
// generic relationship system, already surfaced in the Entity Editor's
// own Relationships block) for factions with no SWN Faction Turn Engine
// presence fields set; and whichever faction each of the current scene's
// own Actors (Protagonists/Antagonists/Bystanders, WHO) individually
// belongs to (getEntityFaction), skipping the synthetic "Unaligned"
// placeholder that resolves for an NPC with no member_of edge. Every
// thumbnail now carries the SAME ▸/▾ expand + "✕" NPCs' own thumbnails do
// (direct follow-up request) — "✕" dismisses from THIS scene's view
// (scenes.js's dismissedFactionIds/addSceneDismissedFaction) rather than
// literally unlinking a relationship, since most of these are DERIVED,
// not a stored list (there's nothing to "remove" for a region-present
// faction) — "curated convenience, not a restriction." The old inline
// "+ faction operating here" <select> is now a header "+" icon (direct
// follow-up request — "work like the (+) add buttons for other
// sections") opening the shared entityPicker overlay
// (data-entity-picker-open="where-faction-link:<locId>"); picking one
// still creates the same real located_at relationship, and additionally
// clears any stale dismissal so a deliberate re-add isn't immediately
// hidden again.
function factionsActiveNearbyBlock(doc, ui) {
  const scenes = doc.scenes || [];
  const scene = scenes[scenes.length - 1];
  if (!scene) return '';
  const whereLocations = getCurrentWhereLocations(doc);
  const primary = whereLocations[0] || null;
  const seen = new Map();
  if (primary) {
    for (const loc of whereLocations) {
      for (const { faction } of factionsInRegion(doc, loc.id, { maxDepth: 6 })) {
        if (!seen.has(faction.id)) seen.set(faction.id, faction);
      }
    }
  }
  const actorIds = [...(scene.protagonistIds || []), ...(scene.antagonistIds || []), ...(scene.bystanderIds || [])];
  for (const id of actorIds) {
    const faction = getEntityFaction(doc, id);
    if (faction && faction.id && !seen.has(faction.id)) seen.set(faction.id, faction);
  }
  const dismissed = new Set(scene.dismissedFactionIds || []);
  const active = Array.from(seen.values()).filter((f) => !dismissed.has(f.id));
  const expandedSet = (ui && ui.expandedFactionsNearby) || new Set();
  const thumbs = active.map((f) => entityThumb(doc, f, {
    removeAttrHtml: `data-scene-faction-dismiss="${esc(f.id)}"`,
    expandAttrHtml: `data-faction-nearby-toggle="${esc(f.id)}"`,
    expanded: expandedSet.has(f.id),
  })).join('');
  return collapsibleThumbGroup(ui, {
    key: 'who:factions-nearby', label: 'Factions active nearby', count: active.length,
    helpKey: 'who:factions-nearby',
    hint: "Present in the region, manually linked here, or a faction one of this scene's Protagonists/Antagonists/Bystanders belongs to.",
    headerExtra: primary ? `<button type="button" class="icon-btn" data-entity-picker-open="where-faction-link:${esc(primary.id)}" title="Link a faction operating here">＋</button>` : '',
    body: `${active.length ? `<div class="actor-thumb-row">${thumbs}</div>` : '<p class="dim small">None yet.</p>'}
      ${active.filter((f) => expandedSet.has(f.id)).map((f) => factionDetailBody(f)).join('')}`,
  });
}

// "Assets present" (direct follow-up request) — the fourth GM-curated
// scene list (scenes.js's assetIds, same shape as Bystanders), for
// #asset-TYPE entities (ships, gear caches, vehicles, ...) physically
// present in the current scene. Displayed as thumbnails like WHO's Actors
// and Factions above; needs an active scene to hang the list on, same gate
// npcSceneGroupsBlock uses.
function assetsPresentBlock(doc, ui) {
  const scenes = doc.scenes || [];
  if (!scenes.length) return '';
  const scene = scenes[scenes.length - 1];
  const assets = (scene.assetIds || []).map((id) => getEntity(doc, id)).filter(Boolean);
  const thumbs = assets.map((a) => entityThumb(doc, a, { removeAttrHtml: `data-scene-asset-remove="${esc(a.id)}"` })).join('');
  return collapsibleThumbGroup(ui, {
    key: 'who:assets-present', label: 'Assets present', count: assets.length,
    helpKey: 'who:assets-present', hint: 'Ships, gear caches, and other #asset entities present in this scene.',
    headerExtra: `<button type="button" class="icon-btn" data-entity-picker-open="asset" title="Add an Asset">＋</button>`,
    body: assets.length ? `<div class="actor-thumb-row">${thumbs}</div>` : '<p class="dim small">None yet.</p>',
  });
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

// Read-only digest: every faction linked to the current location(s) by ANY
// relationship type or structural presence signal (factionPresenceReasons,
// factionTurnEngine.js — Homeworld/Base of Influence/Governs/Member Of/
// Asset here, plus any `relationships` edge straight to the location
// whatever its type) — direct follow-up request: "List all factions...
// with any relationship type link related to locations under Location
// Details," broadening this digest beyond factionsPresentAt's own narrower
// structural+located_at-only check (factionsPresentAt itself is untouched,
// still used by its other callers). Each thumbnail's topLabel (the same
// small tag Location details' own thumbnails use for District/Site) shows
// WHY that faction is linked, joined "·" when more than one reason
// applies — "Member Of" instead of an earlier invented generic "Owns",
// per a follow-up correction (factionPresenceReasons' own comment).
// Direct follow-up request: renamed "Factions here" -> "Factions present
// here," and reformatted from a bare heading into the SAME collapsible-
// group shell ("Location details" above it, WHO's Factions active nearby)
// instead of its own plain `.threads` block — count badge, help icon,
// collapsed state remembered the same way.
function locationFactionsBlock(doc, ui) {
  const whereLocations = getCurrentWhereLocations(doc);
  if (!whereLocations.length) return '';
  const locationIds = whereLocations.map((l) => l.id);
  const factions = listEntities(doc, 'faction')
    .map((f) => ({ faction: f, reasons: factionPresenceReasons(doc, f, locationIds) }))
    .filter((x) => x.reasons.length);
  if (!factions.length) return '';
  const thumbs = factions.map(({ faction, reasons }) => entityThumb(doc, faction, {
    topLabel: reasons.join(' · '),
  })).join('');
  return collapsibleThumbGroup(ui, {
    key: 'where:factions-here', label: 'Factions present here', count: factions.length,
    helpKey: 'where:factions-here',
    hint: 'Every faction linked to the current Location Details by any relationship type, or by a structural presence signal (Homeworld, Base of Influence, Governs, Member Of, an active Asset here).',
    body: `<div class="actor-thumb-row">${thumbs}</div>`,
  });
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
// Direct follow-up correction (reversing part of the previous entry below
// after the user clarified intent): Scene Summary IS now a real editable
// field, not a pure read-only live recompute — ui.sceneSummaryOverride
// (shell.js, ephemeral, never persisted, same "never" as inspirationDrafts/
// advisorDrafts) holds the GM's own edited/frozen text once set; while it's
// still null (nothing typed, Reload never clicked), this keeps showing the
// live WHO/WHERE/Story-Options recompute exactly as before, so a GM who
// never touches this field sees no change at all. Clear blanks the override
// outright; Reload explicitly re-pulls the CURRENT live recompute into the
// override (an explicit one-time sync, not a mode switch back to
// perpetual auto-tracking — that would silently clobber whatever the GM
// just typed on the very next unrelated render, the exact risk this field
// was originally built read-only to avoid).
function narrativeComposerBlock(doc, ui) {
  const selected = (ui && ui.selectedStoryOptionIds) || new Set();
  const liveDraft = composeNarrativeDraft(doc, { selectedOptionIds: Array.from(selected) });
  const override = ui && ui.sceneSummaryOverride;
  const draft = override !== null && override !== undefined ? override : liveDraft;
  const helpKey = 'nav:scene-summary';
  return `<div class="threads narrative-composer">
    <div class="threads-head"><h3>Scene Summary</h3>${helpToggle(helpKey)}</div>
    ${wsHelpBody(helpKey, "Reflects WHO/WHERE's Focus text live, plus whichever Story Options you check in the Advisor — until you edit it directly or click Reload, after which it's yours to keep editing.", ui)}
    <div class="mention-editor narrative-composer-preview" contenteditable="true" data-scene-summary-field data-placeholder="Nothing to compose yet — write something in WHO/WHERE's Focus field, check a Story Option in the Advisor, or type your own.">${buildMentionEditorHTML(doc, draft)}</div>
    <div class="shift-actions">
      <button class="chip" data-composer-copy title="Copy the current text to your clipboard">📋 Copy</button>
      <button class="chip" data-composer-journal title="Add the current text to the Journal">＋ Send to Journal</button>
      <button class="chip" data-composer-clear title="Blank this field">🗑 Clear</button>
      <button class="chip" data-composer-reload title="Pull WHO/WHERE's current Focus text and checked Story Options back in, replacing what's here now">🔄 Reload</button>
    </div>
  </div>`;
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
  return `<button class="icon-btn icon-mono" data-oracle-field-link="scene.${field}" title="Jump to relevant Oracle table(s): ${tags.map(esc).join(', ')}" aria-label="Jump to relevant Oracle tables">🔮</button>`;
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
// each linked to its own Oracle category. scene.text (the combined
// narrative, recomposed from these same fields on every edit —
// session.js's updateSceneField) is still kept and used elsewhere (the
// Journal, session recap) but is no longer rendered here as its own
// read-only block (direct follow-up request — it just duplicated what
// these editable fields already show, one narrative twice over). Opening
// holds the FULL line's content (not a fragment nested in a fixed
// template) — editing it directly rewrites what "Opening:" reads in the
// derived text used elsewhere.
// The heading below is deliberately computed live from context.what.intent
// and context.where.siteDescription/surroundings rather than read from the
// scene's own frozen s.summary (set once at generateScene() time) — a GM
// editing Site Description/Immediate Surroundings mid-scene expects the
// heading to reflect that edit immediately, not just future scenes.
function sceneDetailsSummary(doc) {
  const what = (doc.context && doc.context.what) || {};
  const where = (doc.context && doc.context.where) || {};
  const location = [where.siteDescription, where.surroundings].filter(Boolean).join(' — ') || 'the current location';
  const intent = what.intent || 'Discovery';
  return `${intent} at ${location}`;
}

function lastScene(doc, ui) {
  const scenes = doc.scenes || [];
  if (!scenes.length) return '<div class="ws-placeholder">No scenes yet. Continue Story (Advisor) to generate the opening beat.</div>';
  const s = scenes[scenes.length - 1];
  return `<details class="last-scene" open>
    <summary>Scene Details ${s.number} — ${esc(sceneDetailsSummary(doc))}</summary>
    <div class="last-scene-body">
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
