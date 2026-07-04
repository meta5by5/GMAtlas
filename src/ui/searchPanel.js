// searchPanel.js — renders Universal Search results from the pure
// universalSearch() function. Click handling lives in shell.js's delegated
// click handler, same as every other panel; this module only formats HTML.

import { universalSearch } from '../domain/search.js';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderSearchPanel(doc, query) {
  const q = String(query || '').trim();
  if (!q) return '<p class="ws-placeholder">Type to search Cast, Journal, Oracle tables, Documents, Party, and Colony — all at once.</p>';
  const results = universalSearch(doc, q);
  if (!results.length) return `<p class="ws-placeholder">No matches for "${esc(q)}".</p>`;
  let out = '';
  let lastCategory = null;
  results.forEach((item, i) => {
    if (item.category !== lastCategory) { out += `<h4 class="search-group-head">${esc(item.category)}</h4>`; lastCategory = item.category; }
    out += `<button class="search-result-row" data-search-result="${i}">
      <span class="search-result-label">${esc(item.label)}</span>
      ${item.sublabel ? `<span class="search-result-sub dim small">${esc(item.sublabel)}</span>` : ''}
    </button>`;
  });
  return out;
}
