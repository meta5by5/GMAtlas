// copilotPanel.js — the Advisor, the app's "thinking," as a PURE function,
// plus every suggestion/oracle-generating control that used to live on the
// now-retired WHO/WHERE/WHAT/WHY/HOW tabs: the full Story Options list,
// both Suggestion Lens pickers (blind + scene-weighted), the Site Concept/
// Adventure Seed generators, and the Activity → Rules Lens suggestion. The
// Advisor is the one "active decision sandbox" — everywhere a GM goes to
// ask "what should happen next" — while the Composer and Navigator (ui/
// workspace/index.js) stay pure data display/entry. Every relocated piece
// keeps its exact original `data-*` attribute and shell.js handler — this
// is a markup relocation, not new wiring.

import { advise, buildStoryOptions } from '../domain/copilot.js';
import { suggestRulesLens } from '../domain/activities.js';
import { getEntity, proximityToLocation } from '../domain/entities.js';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// The "Shift Story" actions formerly on the WHAT tab's own action row —
// relocated verbatim (still routes through the same generic `data-shift`
// handler, shell.js).
const WHAT_ACTIONS = ['Reveal Clue', 'Complicate', 'Reward', 'Raise Threat', 'Lower Threat', 'Advance Time'];

// Suggestion Lens chip picker (docs/adr/0009-situation-engine-revisited.md,
// Decision item 3) — "What Happens Next?" opens this instead of generating
// immediately; `draw` is the fixed random draw from drawSuggestionLenses
// (session.js, via shell.js), not recomputed on every render. Generalized
// (docs/adr/0039 Phase 2) to take `open`/`draw` as plain params so both the
// blind draw (Quick Apply, below) and the scene-weighted draw (Suggest a
// Lens, below) can reuse the exact same rendering with separate ephemeral
// state — picking a lens is the identical action (suggestNextWithLens)
// either way, only which draw produced the offered chips differs.
function lensPickerHtml(open, draw, { intro = 'Pick a lens to steer what happens next, instead of generating blind:' } = {}) {
  if (!open) return '';
  const chips = (draw || []).map((l) => `<button class="chip" data-lens-pick="${esc(l.id)}" title="${l.kind === 'discovery' ? 'Discovery Lens' : 'Approach Lens'}">${esc(l.label)}</button>`).join('');
  return `<div class="lens-picker">
    <p class="dim small">${esc(intro)}</p>
    <div class="lens-picker-chips">${chips}</div>
  </div>`;
}

// Story Options (docs/adr/0039) — buildStoryOptions() (copilot.js) combines
// whoever's in scene (WHO's @mentions + WHERE's present factions), WHERE's
// Conflicts-here, and WHY's own Threads/Foreshadowing/World Flags into a
// ranked, CUMULATIVE list — every row is a distinct angle the GM can act
// on. 🔮 rolls that option's linked Oracle table for real inspiration (the
// existing rollOracle); ＋ Journal drops the option's own text straight
// into the session log; ✕ dismisses without acting on it — all three add
// the option's id to dismissedStoryOptionIds (shell.js, ephemeral) so it
// makes room for the next-ranked option instead of lingering (fetched from
// a deeper pool than what's shown, so a dismissal always has a "next" to
// reveal). The checkbox marks an option "in play" for the Narrative
// Composer (ui/workspace/index.js) — `selectedStoryOptionIds`, shared
// ephemeral state read by both panels off the same `ui` bag. Formerly
// WHY-tab-only and condensed-to-3 here; docs/adr/0040 Phase 12f made this
// the one full copy, now that there's no WHY tab to hold the "full list."
function storyOptionsBlock(doc, ui, { limit = 8 } = {}) {
  const dismissed = (ui && ui.dismissedStoryOptionIds) || new Set();
  const selected = (ui && ui.selectedStoryOptionIds) || new Set();
  const options = buildStoryOptions(doc, { limit: Math.max(12, limit * 2) }).filter((o) => !dismissed.has(o.id)).slice(0, limit);
  const rows = options.map((o) => `<div class="thread-row story-option-row">
      <span class="thread-name">
        <input type="checkbox" data-story-option-select="${esc(o.id)}" ${selected.has(o.id) ? 'checked' : ''} title="Include in the Navigator's scene summary">
        ${o.entityId ? `<button type="button" class="entity-chip" data-open-entity="${esc(o.entityId)}">${esc(o.label)}</button>` : esc(o.label)}
        <span class="dim small">— ${esc(o.detail)}</span>
      </span>
      <span class="thread-actions">
        <button class="icon-btn" data-story-option-roll="${esc(o.oracleGroup)}>${esc(o.oracleTable)}" data-story-option-id="${esc(o.id)}" title="Roll ${esc(o.oracleGroup)} → ${esc(o.oracleTable)} for inspiration">🔮</button>
        <button class="icon-btn" data-story-option-journal="${esc(o.id)}" title="Add to Journal">＋</button>
        <button class="icon-btn" data-story-option-dismiss="${esc(o.id)}" title="Dismiss">✕</button>
      </span>
    </div>`).join('');
  return `
    <div class="copilot-card">
      <h3>Story Options</h3>
      <p class="dim small">Who/where/why, combined — check one to weave it into the Navigator's scene summary.</p>
      ${options.length ? rows : '<p class="dim small">Nothing to suggest yet — mention someone in WHO, set a Location in WHERE, or open a Conflict/Thread/Foreshadowing entry.</p>'}
    </div>`;
}

// Weighted Suggestion Lens draw (docs/adr/0039 Phase 2) — a second entry
// point into the exact same lens-picker → suggestNextWithLens flow Quick
// Apply's "What Happens Next?" offers below, just drawn with
// `sceneContext` (gatherSceneContext, via shell.js's data-why-lens-suggest
// handler) so a Conflict/faction/Negotiate-activity currently in play
// gives matching lenses (e.g. negotiation, violence, politics) better odds
// of being offered — never a GUARANTEE, still a random draw, just no
// longer context-blind. Separate ephemeral state
// (ui.whyLensPickerOpen/whyLensDraw) from the blind draw below so the two
// pickers never interfere with each other.
function suggestLensBlock(ui) {
  return `
    <div class="copilot-card">
      <h3>Suggest a Lens</h3>
      <p class="dim small">Weighted toward who/what is currently in scene.</p>
      <button class="chip" data-why-lens-suggest title="Draw lens chips weighted toward who/what is currently in scene">🎭 Suggest a Lens</button>
      ${lensPickerHtml(ui.whyLensPickerOpen, ui.whyLensDraw, { intro: 'Pick a lens to steer what happens next:' })}
    </div>`;
}

// GM inspiration for moving the activity forward — reuses the existing
// oracle-driven Site Concept (feature/danger/wonder) and Adventure Seed
// (hook/twist/complication) generators verbatim (domain/worldbuilding.js)
// rather than inventing a second one. Direct follow-up (2026-07-23): these
// used to roll straight into the Journal with no review step; now the
// roll lands in ephemeral `ui.inspirationDrafts` (never persisted) and
// renders right here as an editable draft — same "preview, then explicit
// commit" posture as the Navigator's own Scene Summary Copy/Send-to-Journal.
function inspirationDraftCard(kind, draft) {
  if (!draft) return '';
  return `<div class="inspiration-draft">
    <textarea data-inspiration-field="${kind}" rows="4">${esc(draft)}</textarea>
    <div class="copilot-quick">
      <button class="chip sm" data-inspiration-copy="${kind}" title="Copy to clipboard">📋 Copy</button>
      <button class="chip sm" data-inspiration-journal="${kind}" title="Add to Journal">＋ Send to Journal</button>
      <button class="icon-btn" data-inspiration-dismiss="${kind}" title="Discard">✕</button>
    </div>
  </div>`;
}

function inspirationBlock(ui) {
  const drafts = (ui && ui.inspirationDrafts) || {};
  return `
    <div class="copilot-card">
      <h3>Need inspiration?</h3>
      <div class="copilot-quick">
        <button class="chip" data-generate-site-draft title="Roll a site concept: a feature, a danger, and a wonder">🎲 Site Concept</button>
        <button class="chip" data-generate-seed-draft title="Roll an adventure seed: a hook, a twist, and a complication">🎲 Adventure Seed</button>
      </div>
      ${inspirationDraftCard('site', drafts.site)}
      ${inspirationDraftCard('seed', drafts.seed)}
    </div>`;
}

// The Advisor's "stage, then apply" mechanic (direct follow-up request —
// see shell.js's advisorOracleResults/advisorDrafts declaration comment for
// the full 4-step flow): an editable textarea a GM can type into freely,
// plus an "Apply" button that sends its CURRENT text to one specific
// Composer field (context.what.situation or Latest Scene's consequence
// field) — shared by suggestedOraclesBlock and consequenceOraclesBlock
// below rather than each building its own editor+apply markup.
function advisorDraftEditor(draftKey, ui, { placeholder, applyLabel }) {
  const value = (ui && ui.advisorDrafts && ui.advisorDrafts[draftKey]) || '';
  return `<div class="advisor-suggestion-editor">
    <textarea class="advisor-suggestion-input" data-advisor-draft-input="${esc(draftKey)}" rows="2" placeholder="${esc(placeholder)}">${esc(value)}</textarea>
    <button class="chip sm" data-advisor-draft-apply="${esc(draftKey)}" ${value.trim() ? '' : 'disabled'} title="Apply the text above to ${esc(applyLabel)}">➜ Apply to ${esc(applyLabel)}</button>
  </div>`;
}

// Scene Details' own oracle-tag-linked fields and their display labels —
// matches shell.js's SUGGEST_ORACLES_SCENE_FIELDS/SCENE_FIELD_LABELS
// exactly (a small local copy rather than a cross-import, same posture as
// every other small fixed-vocabulary constant in this file).
const SCENE_FIELD_LABELS = { opening: 'Opening', driver: 'Driver', clue: 'Clue', complication: 'Complication', consequence: 'Likely consequence' };

// "Suggested oracles" history stack (direct follow-up request: "whenever
// anything is added to the Advisor, place it as a new entry in a box at
// the top... move previous entries down. Show three entries plus
// collapsed boxes for three before that"). Two triggers push onto the
// same ui.suggestedOracleEntries array (shell.js's pushSuggestedOracleEntry
// — newest first, capped at 6): WHAT's "Suggest oracles" button/Intent-
// Scene-Details auto-trigger, and WHERE's Location details "Regional
// faction activity" 💡. Each entry is a fixed draw at the moment it was
// added (not recomputed on render) — the first 3 render as open boxes,
// the next 3 as native <details> so a GM can still expand one to look up
// what an older suggestion was without it competing for space by default.
// Direct follow-up request: "each [suggested oracle] must map to one of
// the fields under [Scene Details] such that clicking the checkmark
// appends that to the mapped field. If a field is not mapped to an actual
// field in Composer, then add as an entry to Journal." Every entry's own
// `paths` is now an array of `{path, target}` items (session.js's
// drawSuggestedOracles/drawFactionActivityOracles) — target is whichever
// Scene Details field shares a tag with that specific table, or null when
// none does (e.g. WHERE's #faction/#agenda draw). Rolling a chip
// (data-advisor-oracle-roll) shows the result as plain text with a ✓
// (data-advisor-result-accept) rather than committing anywhere on its own
// ("roll, review, check off, then Apply" via the per-field editors below);
// the checkmark's own accept target is read PER ITEM now (shell.js's
// data-advisor-result-accept branches on 'journal' -> straight to a new
// Journal note, anything else -> that field's advisorDrafts staging area).
function suggestedOracleEntryChips(entry, ui) {
  const results = (ui && ui.advisorOracleResults) || {};
  return `<div class="copilot-quick">${entry.paths.map((item) => {
    const path = item.path;
    const target = item.target || 'journal';
    const targetLabel = target === 'journal' ? 'the Journal' : `the ${SCENE_FIELD_LABELS[target] || target} draft below`;
    const key = path.join('>');
    const result = results[key];
    if (result) {
      return `<span class="advisor-oracle-result" title="${esc(path.join(' > '))}">
        <span class="advisor-oracle-result-text">${esc(result)}</span>
        <button type="button" class="icon-btn" data-advisor-result-accept="${esc(key)}" data-advisor-draft-target="${esc(target)}" title="Add to ${esc(targetLabel)}">✓</button>
      </span>`;
    }
    return `<button class="chip sm" data-advisor-oracle-roll="${esc(key)}" data-advisor-result-key="${esc(key)}" title="Roll ${esc(path.join(' > '))}">🔮 ${esc(path.join(' > '))}</button>`;
  }).join('')}</div>`;
}
// One draft editor per Scene Details field actually targeted by a chip
// currently on screen (open or collapsed) — dynamic rather than one fixed
// "Situation" editor, since a single batch can span several fields (e.g.
// one chip mapping to Driver, another to Clue). A field with no chip
// targeting it right now gets no editor; as soon as a relevant suggestion
// appears its editor shows up, ready for a checkmark OR direct typing.
function suggestedOracleFieldEditors(entries, ui) {
  const targets = new Set();
  for (const e of entries) for (const item of e.paths) if (item.target) targets.add(item.target);
  return SUGGEST_ORACLES_SCENE_FIELDS
    .filter((field) => targets.has(field))
    .map((field) => advisorDraftEditor(field, ui, {
      placeholder: `Check an oracle result below to stage it here, or type your own — then Apply to send it to ${SCENE_FIELD_LABELS[field]}.`,
      applyLabel: SCENE_FIELD_LABELS[field],
    })).join('');
}
const SUGGEST_ORACLES_SCENE_FIELDS = ['opening', 'driver', 'clue', 'complication', 'consequence'];
function suggestedOraclesBlock(ui) {
  const entries = (ui && ui.suggestedOracleEntries) || [];
  if (!entries.length) {
    return `
    <div class="copilot-card">
      <h3>Suggested oracles</h3>
      <p class="dim small">Nothing suggested yet — click "Suggest oracles" on WHAT, or 💡 next to a Location's Regional faction activity on WHERE.</p>
    </div>`;
  }
  const open = entries.slice(0, 3);
  const older = entries.slice(3, 6);
  return `
    <div class="copilot-card">
      <h3>Suggested oracles</h3>
      ${open.map((e) => `<div class="advisor-history-entry">
        <div class="advisor-history-entry-head dim small">${esc(e.label)}</div>
        ${suggestedOracleEntryChips(e, ui)}
      </div>`).join('')}
      ${older.map((e) => `<details class="advisor-history-entry advisor-history-entry-collapsed">
        <summary class="dim small">${esc(e.label)}</summary>
        ${suggestedOracleEntryChips(e, ui)}
      </details>`).join('')}
      ${suggestedOracleFieldEditors(entries, ui)}
    </div>`;
}

// "If nothing changes…" (direct follow-up request — named alongside
// "Suggested oracles" as an example of a section that should "always
// [have] relevant oracle selections... displayed"): previously a static
// paragraph with no oracle mechanism at all. "🎲 Suggest oracles" draws a
// fresh table-path list via drawConsequenceOracles (session.js — the same
// tag-linked draw mechanism as WHAT's own "Suggest oracles," keyed off
// Latest Scene's consequence field's own oracle tags) into
// ui.advisorConsequenceDraw (shell.js, on-demand, not auto-triggered);
// each chip shares the exact same roll/review/check-off/Apply flow as
// Suggested oracles above, staging into advisorDrafts.consequence and
// applying to Latest Scene's own consequence field.
function consequenceOraclesBlock(doc, ui, observedConsequence) {
  const draw = ui && ui.advisorConsequenceDraw;
  const results = (ui && ui.advisorOracleResults) || {};
  const chips = (draw || []).map((path) => {
    const key = path.join('>');
    const result = results[key];
    if (result) {
      return `<span class="advisor-oracle-result" title="${esc(path.join(' > '))}">
        <span class="advisor-oracle-result-text">${esc(result)}</span>
        <button type="button" class="icon-btn" data-advisor-result-accept="${esc(key)}" data-advisor-draft-target="consequence" title="Append to the draft below">✓</button>
      </span>`;
    }
    return `<button class="chip sm" data-advisor-oracle-roll="${esc(key)}" data-advisor-result-key="${esc(key)}" title="Roll ${esc(path.join(' > '))}">🔮 ${esc(path.join(' > '))}</button>`;
  }).join('');
  const editor = advisorDraftEditor('consequence', ui, {
    placeholder: "Check an oracle result below to stage it here, or type your own — then Apply to send it to Scene Details' Likely consequence.",
    applyLabel: 'Likely consequence',
  });
  return `
    <div class="copilot-card">
      <h3>If nothing changes…</h3>
      <p>${esc(observedConsequence)}</p>
      ${draw
        ? (chips ? `<div class="copilot-quick">${chips}</div>` : '<p class="dim small">No linked oracle tables found — tag one #consequence-related, or set a Scene Details field first.</p>')
        : `<button class="chip sm" data-advisor-consequence-draw title="Draw oracle tables relevant to Likely consequence">🎲 Suggest oracles</button>`}
      ${editor}
    </div>`;
}

// Activity → Rules Lens suggestion (docs/adr/0002/0009) — formerly on the
// HOW tab next to the Activity select itself; the select now lives on the
// Dashboard header (ui/workspace/index.js), this suggestion card reads the
// same `doc.context.how.activity` directly.
function rulesLensBlock(doc) {
  const activity = doc.context.how.activity || '';
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
  return `
    <div class="copilot-card">
      <h3>Suggested Rules Lens</h3>
      <p class="dim small">For ${esc(suggestion.area)}:</p>
      <div class="rules-lens-chips">${chips}</div>
    </div>`;
}

// "Located at <Location>" (direct follow-up request: "when clicking a
// Location thumbnail, display a list of NPCs and sub-locations in the
// Advisor... if there are any NPCs 'Located at' that location or a sub-
// location that is also 'Located at' (i.e. iterative proximity)").
// ui.locationProximity (shell.js) only stores the clicked Location's id —
// entities.js's proximityToLocation is recomputed fresh here on every
// render (not a frozen snapshot) so the list stays accurate as the GM adds
// things to the scene; already-added NPCs/sub-locations are filtered out
// the same way Nearby locations excludes them, since adding one again
// would just be a confusing no-op click. Click-to-add (confirmed over
// drag-and-drop) — an NPC routes through the same #character tag check
// Introduce NPC's create path uses, a sub-location adds straight to
// Location details.
function locationProximityBlock(doc, ui) {
  const prox = ui && ui.locationProximity;
  if (!prox) return '';
  const loc = getEntity(doc, prox.locationId);
  if (!loc) return '';
  const { locations, npcs } = proximityToLocation(doc, prox.locationId);
  const scenes = doc.scenes || [];
  const scene = scenes[scenes.length - 1];
  const inScene = scene
    ? new Set([...(scene.protagonistIds || []), ...(scene.antagonistIds || []), ...(scene.bystanderIds || []), ...(scene.locationIds || [])])
    : new Set();
  const npcsLeft = npcs.filter((n) => !inScene.has(n.id));
  const locsLeft = locations.filter((l) => !inScene.has(l.id));
  if (!npcsLeft.length && !locsLeft.length) return '';
  const npcChips = npcsLeft.map((n) => `<button type="button" class="entity-chip" data-proximity-add-npc="${esc(n.id)}" title="Add ${esc(n.name || 'Unnamed')} to WHO">${esc(n.name || 'Unnamed')}</button>`).join('');
  const locChips = locsLeft.map((l) => `<button type="button" class="entity-chip" data-proximity-add-location="${esc(l.id)}" title="Add ${esc(l.name || 'Unnamed')} to Location details">${esc(l.name || 'Unnamed')}</button>`).join('');
  return `
    <div class="copilot-card">
      <h3>Located at ${esc(loc.name || 'Unnamed')}</h3>
      <p class="dim small">NPCs and sub-locations located there, or under one of its sub-locations — click to add to the scene.</p>
      ${npcsLeft.length ? `<div class="entity-chips">${npcChips}</div>` : ''}
      ${locsLeft.length ? `<div class="entity-chips">${locChips}</div>` : ''}
    </div>`;
}

export function renderCopilot(doc, ui) {
  const a = advise(doc);
  return `
    <div class="copilot-card"><h3>I noticed…</h3><p>${esc(a.observation)}</p>
      ${a.hotFactionId ? `<button class="copilot-action" data-generate-faction-mission="${esc(a.hotFactionId)}">📋 Generate mission from ${esc(a.hotFactionName)}</button>` : ''}
    </div>
    ${storyOptionsBlock(doc, ui)}
    ${locationProximityBlock(doc, ui)}
    ${suggestedOraclesBlock(ui)}
    ${suggestLensBlock(ui)}
    ${consequenceOraclesBlock(doc, ui, a.consequence)}
    <div class="copilot-card"><h3>Opportunity</h3><p>${esc(a.opportunity)}</p></div>
    ${inspirationBlock(ui)}
    <div class="copilot-card">
      <h3>Suggested oracle</h3>
      <button class="copilot-action" data-roll="${esc(a.suggestedOraclePath.join('>'))}">🎲 ${esc(a.suggestedOracle)}</button>
    </div>
    ${rulesLensBlock(doc)}
    <div class="copilot-card">
      <h3>Quick apply</h3>
      <div class="copilot-quick">
        <button class="btn primary sm" data-continue-story>▶ Continue Story</button>
        <button class="btn sm" data-what-next>What Happens Next?</button>
        <button class="btn sm" data-restart-story title="Start the narrative over — WHO/WHERE/WHAT/WHY/HOW, scenes, Journal, Threads, Foreshadowing, and World State Flags. Entities and their progress are untouched; for a full wipe use New Campaign in Settings.">↺ Restart Story</button>
      </div>
      ${lensPickerHtml(ui.lensPickerOpen, ui.lensDraw)}
      <div class="copilot-quick">
        ${a.quickActions.map((q) => `<button class="chip" data-shift="${esc(q)}">⚡ ${esc(q)}</button>`).join('')}
        <button class="chip" data-continue-story title="Generate the next scene">▶ Scene</button>
      </div>
      <div class="copilot-quick">
        ${WHAT_ACTIONS.map((act) => `<button class="chip sm" data-shift="${esc(act)}">⚡ ${esc(act)}</button>`).join('')}
      </div>
    </div>
    ${a.overlooked && a.overlooked.length ? `
    <div class="copilot-card copilot-overlooked">
      <h3>What did I overlook?</h3>
      <p class="dim small">Gone quiet — worth a scene, or explicitly marking Dormant/Archived if it's meant to fade:</p>
      <div class="entity-chips">${a.overlooked.map((name) => `<span class="chip sm">${esc(name)}</span>`).join('')}</div>
    </div>` : ''}
    ${a.flaggedRelationships && a.flaggedRelationships.length ? `
    <div class="copilot-card copilot-overlooked">
      <h3>Relationships to review</h3>
      <p class="dim small">A typed link whose target's type no longer matches — nothing was changed, just worth a look:</p>
      <div class="entity-chips">${a.flaggedRelationships.map((r) => `<span class="chip sm">⚠ ${esc(r)}</span>`).join('')}</div>
    </div>` : ''}`;
}
