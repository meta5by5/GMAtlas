// copilotPanel.js — renders the Co-Pilot from the pure advise() function and
// exposes its suggestions as one-click actions (roll the suggested oracle,
// apply a quick shift). The advisor itself stays UI-free and swappable.

import { advise, buildStoryOptions } from '../domain/copilot.js';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Condensed Story Options (docs/adr/0039 Phase 2) — the top 3 (after
// filtering out anything accepted/dismissed — dismissedStoryOptionIds,
// shell.js) of WHY's own full ranked list (buildStoryOptions, same
// function, just fetched deeper so a dismissal reveals the next-ranked
// option instead of just shrinking the list), so a GM working any tab
// sees "what's cumulatively suggested" without switching to WHY. Reuses
// WHY's own data-story-option-roll/-journal/-dismiss attributes verbatim
// (shell.js's handlers already recompute buildStoryOptions and look the
// option up by id, so they don't care which DOM location triggered them)
// — zero new wiring needed for this card beyond reading `ui`.
function storyOptionsCard(doc, ui) {
  const dismissed = (ui && ui.dismissedStoryOptionIds) || new Set();
  const options = buildStoryOptions(doc, { limit: 12 }).filter((o) => !dismissed.has(o.id)).slice(0, 3);
  if (!options.length) return '';
  const rows = options.map((o) => `<div class="copilot-story-option">
      <p><b>${esc(o.label)}</b> — ${esc(o.detail)}</p>
      <span class="copilot-quick">
        <button class="chip sm" data-story-option-roll="${esc(o.oracleGroup)}>${esc(o.oracleTable)}" data-story-option-id="${esc(o.id)}" title="Roll ${esc(o.oracleGroup)} → ${esc(o.oracleTable)} for inspiration">🔮 Roll</button>
        <button class="chip sm" data-story-option-journal="${esc(o.id)}" title="Add to Journal">＋ Journal</button>
        <button class="icon-btn" data-story-option-dismiss="${esc(o.id)}" title="Dismiss">✕</button>
      </span>
    </div>`).join('');
  return `
    <div class="copilot-card">
      <h3>Story Options</h3>
      <p class="dim small">Who/where/why, combined — see WHY for the full list.</p>
      ${rows}
    </div>`;
}

export function renderCopilot(doc, ui) {
  const a = advise(doc);
  return `
    <div class="copilot-card"><h3>I noticed…</h3><p>${esc(a.observation)}</p>
      ${a.hotFactionId ? `<button class="copilot-action" data-generate-faction-mission="${esc(a.hotFactionId)}">📋 Generate mission from ${esc(a.hotFactionName)}</button>` : ''}
    </div>
    ${storyOptionsCard(doc, ui)}
    <div class="copilot-card"><h3>If nothing changes…</h3><p>${esc(a.consequence)}</p></div>
    <div class="copilot-card"><h3>Opportunity</h3><p>${esc(a.opportunity)}</p></div>
    <div class="copilot-card">
      <h3>Suggested oracle</h3>
      <button class="copilot-action" data-roll="${esc(a.suggestedOraclePath.join('>'))}">🎲 ${esc(a.suggestedOracle)}</button>
    </div>
    <div class="copilot-card">
      <h3>Quick apply</h3>
      <div class="copilot-quick">
        ${a.quickActions.map((q) => `<button class="chip" data-shift="${esc(q)}">⚡ ${esc(q)}</button>`).join('')}
        <button class="chip" data-continue-story title="Generate the next scene">▶ Scene</button>
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
