// copilotPanel.js — the app's "thinking", as a PURE function, PLUS (as of
// docs/adr/0040 Phase 12f) every suggestion/oracle-generating control that
// used to live on the now-retired WHO/WHERE/WHAT/WHY/HOW tabs: the full
// Story Options list, both Suggestion Lens pickers (blind + scene-weighted),
// the Site Concept/Adventure Seed generators, and the Activity → Rules
// Lens suggestion. Co-Pilot is now the one "active decision sandbox" —
// everywhere a GM goes to ask "what should happen next" — while the
// Dashboard (ui/workspace/index.js) stays pure data display/entry. Every
// relocated piece keeps its exact original `data-*` attribute and shell.js
// handler — this is a markup relocation, not new wiring.

import { advise, buildStoryOptions } from '../domain/copilot.js';
import { suggestRulesLens } from '../domain/activities.js';

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
        <input type="checkbox" data-story-option-select="${esc(o.id)}" ${selected.has(o.id) ? 'checked' : ''} title="Include in the Narrative Composer draft">
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
      <p class="dim small">Who/where/why, combined — check one to weave it into the Narrative Composer.</p>
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
// commit" posture as the Narrative Composer's own Copy/Send-to-Journal.
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

export function renderCopilot(doc, ui) {
  const a = advise(doc);
  return `
    <div class="copilot-card"><h3>I noticed…</h3><p>${esc(a.observation)}</p>
      ${a.hotFactionId ? `<button class="copilot-action" data-generate-faction-mission="${esc(a.hotFactionId)}">📋 Generate mission from ${esc(a.hotFactionName)}</button>` : ''}
    </div>
    ${storyOptionsBlock(doc, ui)}
    ${suggestLensBlock(ui)}
    <div class="copilot-card"><h3>If nothing changes…</h3><p>${esc(a.consequence)}</p></div>
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
