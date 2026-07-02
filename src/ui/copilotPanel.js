// copilotPanel.js — renders the Co-Pilot from the pure advise() function and
// exposes its suggestions as one-click actions (roll the suggested oracle,
// apply a quick shift). The advisor itself stays UI-free and swappable.

import { advise } from '../domain/copilot.js';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderCopilot(doc) {
  const a = advise(doc);
  return `
    <div class="copilot-card"><h3>I noticed…</h3><p>${esc(a.observation)}</p></div>
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
      </div>
    </div>`;
}
