// portal/wiki.js — the campaign wiki as a portal page (#/wiki, #/wiki/<id>;
// design/WIKI-ROADMAP.md). Shows the wiki of the campaign open on this
// device, and only when that campaign's Rules Profile has the Wiki plugin
// on. A page reuses the in-campaign Read view (ui/drawers/wiki.js wikiPage),
// so the two can't drift; its links are re-routed here: a page link stays in
// the portal, while ✎ Edit, a new page and journal/Guide/map sources go back
// to the campaign.

import { store } from '../../core/store.js';
import { getEntity, createEntity, entityTypeLabel, ENTITY_TYPES } from '../../domain/entities.js';
import { wikiIndex, unresolvedLinks, setEntityAliases, setEntityVisibility, setPlaceKind, PLACE_KIND_LABEL } from '../../domain/wiki.js';
import { isModuleVisible } from '../../domain/rulesProfiles.js';
import { wikiPageWithOutline, isRedLinkSpan } from '../drawers/wiki.js';
import { openEntityInCampaign, openPanelInCampaign } from '../shell.js';

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Portal-only reading state; the campaign's own Read mode keeps its own.
const state = { playerView: false, search: '', redPick: null, settingsOpen: new Set() };
let repaint = () => {};

/** `paint(fresh)` from portal/index.js, called when the campaign changes
 *  while a wiki page is showing. */
export function bindWikiPortal(paint) {
  repaint = paint;
}

export function wikiEnabled() {
  return isModuleVisible(store.getActiveProfile(), 'wiki');
}

function campaignTitle(doc) {
  return (doc.meta && doc.meta.title) || 'Campaign';
}

function playerToggle() {
  const on = state.playerView;
  return `<button type="button" class="portal-btn${on ? ' is-on' : ''}" data-portal-wiki-player aria-pressed="${on}">👁 ${on ? 'Player View on' : 'Player View'}</button>`;
}

function offView(doc) {
  return `<div class="portal-article-wrap"><article class="portal-article">
    <h1>Wiki is off for ${esc(campaignTitle(doc))}</h1>
    <p>This campaign's Rules Profile has the Wiki plugin turned off. Turn it on in Settings › Modules › Visible plugins, or in Settings › Campaigns › Plugins.</p>
    <p><a href="#/">← Back to campaign</a></p>
  </article></div>`;
}

// The left nav's top-level sections: every entity type, then red links.
const RED = 'red-links';
const validSection = (s) => ENTITY_TYPES.includes(s) || s === RED;

function visibleRows(doc, search) {
  return wikiIndex(doc, { search }).filter((r) => !state.playerView || r.visibility === 'players');
}

function navHtml(doc, { section = '', outline = [] } = {}) {
  const genre = doc.settings && doc.settings.genrePack;
  const counts = new Map();
  for (const r of visibleRows(doc, '')) counts.set(r.type, (counts.get(r.type) || 0) + 1);
  const cur = (on) => (on ? ' aria-current="page"' : '');
  const item = (href, label, n, on) => `<li><a href="${href}"${cur(on)}><span>${esc(label)}</span><span class="portal-wiki-count">${n}</span></a></li>`;
  const red = state.playerView ? 0 : unresolvedLinks(doc).length;
  const outlineHtml = outline.length ? `<h2>On this page</h2><ul class="portal-toc">${outline.map((o) => `<li><button type="button" data-help-jump="${esc(o.id)}">${esc(o.title)}</button>${o.sub.length ? `<ul>${o.sub.map((s) => `<li><button type="button" data-help-jump="${esc(s.id)}">${esc(s.title)}</button></li>`).join('')}</ul>` : ''}</li>`).join('')}</ul>` : '';
  return `<nav class="portal-wiki-nav" aria-label="Wiki sections">
    <ul class="portal-wiki-sections">
      ${item('#/wiki', 'All pages', [...counts.values()].reduce((a, b) => a + b, 0), !section && !outline.length)}
    </ul>
    <h2>Sections</h2>
    <ul class="portal-wiki-sections">
      ${ENTITY_TYPES.map((t) => item(`#/wiki/section/${t}`, entityTypeLabel(t, genre), counts.get(t) || 0, section === t)).join('')}
      ${state.playerView ? '' : item(`#/wiki/section/${RED}`, 'Red links', red, section === RED)}
    </ul>
    ${outlineHtml}
  </nav>`;
}

function withNav(doc, nav, content) {
  return `<div class="portal-wiki">${navHtml(doc, nav)}<div class="portal-wiki-content">${content}</div></div>`;
}

function listHtml(section = '') {
  const doc = store.get();
  const rows = visibleRows(doc, state.search).filter((r) => !section || r.type === section);
  if (section === RED) rows.length = 0;
  const genre = doc.settings && doc.settings.genrePack;
  const byType = new Map();
  for (const r of rows) {
    if (!byType.has(r.type)) byType.set(r.type, []);
    byType.get(r.type).push(r);
  }
  const cards = [...byType]
    .sort((a, b) => entityTypeLabel(a[0], genre).localeCompare(entityTypeLabel(b[0], genre)))
    .map(([type, list]) => `<section class="portal-card">
      <h2>${esc(entityTypeLabel(type, genre))} <span class="portal-dim">${list.length}</span></h2>
      <ul class="portal-link-list">${list.map((r) => `<li><a href="#/wiki/${esc(r.id)}">${esc(r.name)}</a>${r.placeKind ? ` <span class="portal-dim">${esc(PLACE_KIND_LABEL[r.placeKind])}</span>` : ''}${!state.playerView && r.visibility === 'players' ? ' <span class="portal-dim" title="Shared with players">👁</span>' : ''}</li>`).join('')}</ul>
    </section>`).join('');
  const red = state.playerView || (section && section !== RED) ? [] : unresolvedLinks(doc);
  const redCard = red.length ? `<section class="portal-card">
      <h2>Red links <span class="portal-dim">${red.length}</span></h2>
      <p class="portal-dim">Linked to, but no page yet. Pick one to create it in the campaign.</p>
      <ul class="portal-link-list">${red.map((r) => `<li><button type="button" class="wiki-link wiki-redlink" data-wiki-redlink="${esc(r.name)}">${esc(r.name)}</button></li>`).join('')}</ul>
    </section>` : '';
  if (!cards && !redCard) {
    const why = state.search.trim() ? `No pages match “${esc(state.search.trim())}”.`
      : section === RED ? 'No red links: every link points at a page.'
        : state.playerView ? 'No pages here are shared with players yet.'
          : section ? 'No pages in this section yet.'
            : 'No pages yet. Every NPC, location, faction and other entity in the campaign is a page.';
    return `<p class="portal-empty">${why}</p>`;
  }
  return `<div class="portal-card-grid">${cards}${redCard}</div>`;
}

function redPickHtml(doc) {
  if (!state.redPick) return '';
  const genre = doc.settings && doc.settings.genrePack;
  return `<div class="wiki-redlink-pick" role="group" aria-label="Create a page">
    <span>Create “${esc(state.redPick)}” as</span>
    ${['npc', 'location', 'faction', 'asset', 'lore', 'item', 'conflict', 'lifeform'].map((t) => `<button type="button" class="chip sm" data-wiki-create-type="${t}">${esc(entityTypeLabel(t, genre))}</button>`).join('')}
    <button type="button" class="icon-btn" data-wiki-create-cancel aria-label="Cancel">✕</button>
  </div>`;
}

function sectionLabel(doc, section) {
  if (section === RED) return 'Red links';
  return entityTypeLabel(section, doc.settings && doc.settings.genrePack);
}

function indexView(section) {
  const doc = store.get();
  const s = validSection(section) && !(section === RED && state.playerView) ? section : '';
  currentSection = s;
  return withNav(doc, { section: s }, `
    <section class="portal-hero portal-wiki-hero">
      <h1>${s ? `${esc(sectionLabel(doc, s))} <span class="portal-dim">· ${esc(campaignTitle(doc))} wiki</span>` : `${esc(campaignTitle(doc))} wiki`}</h1>
      <div class="portal-wiki-bar">
        <input class="portal-search" type="search" data-portal-wiki-search value="${esc(state.search)}" placeholder="Search pages, aliases, tags" aria-label="Search the wiki" autocomplete="off">
        ${playerToggle()}
      </div>
    </section>
    ${redPickHtml(doc)}
    <div data-portal-wiki-results>${listHtml(s)}</div>`);
}

function pageView(id) {
  const doc = store.get();
  const e = getEntity(doc, id);
  if (!e) {
    return withNav(doc, {}, `<article class="portal-article"><h1>Page not found</h1><p>No page with that link in ${esc(campaignTitle(doc))}. <a href="#/wiki">Browse the wiki</a>.</p></article>`);
  }
  const ui = { wikiPlayerView: state.playerView, wikiRedLinkPick: state.redPick, wikiSettingsOpen: state.settingsOpen };
  const { html, outline } = wikiPageWithOutline(doc, e, ui);
  const hidden = state.playerView && e.visibility !== 'players';
  return withNav(doc, { section: hidden ? '' : e.type, outline }, `
    <nav class="portal-breadcrumb" aria-label="Breadcrumb"><a href="#/wiki">Wiki</a> › ${hidden ? '' : `<a href="#/wiki/section/${esc(e.type)}">${esc(sectionLabel(doc, e.type))}</a> › `}<span>${esc(hidden ? 'Hidden page' : e.name || 'Unnamed')}</span></nav>
    <div class="portal-wiki-page">${html}</div>`);
}

// The section the index is showing, so a search keeps to it.
let currentSection = '';

/** The content for a wiki route, inside the portal frame. */
export function wikiPortalView(route) {
  if (!wikiEnabled()) return offView(store.get());
  return route.view === 'wiki-page' ? pageView(route.id) : indexView(route.section || '');
}

function backToCampaign(then) {
  location.hash = '#/';
  then();
}

/** The portal root's click listener hands wiki clicks here; true when it
 *  handled one. */
export function onWikiClick(e) {
  const t = e.target;
  if (!t.closest('.portal-main')) return false;
  const span = t.closest('.wiki-page .mention-link');
  if (span && isRedLinkSpan(span) && !state.playerView) { state.redPick = span.dataset.mentionName || null; repaint(false); return true; }
  const go = t.closest('[data-open-entity], [data-wiki-open]');
  if (go) { e.preventDefault(); location.hash = `#/wiki/${go.dataset.openEntity || go.dataset.wikiOpen}`; return true; }
  if (t.closest('[data-portal-wiki-player], [data-wiki-player-view]')) { state.playerView = !state.playerView; state.redPick = null; repaint(false); return true; }
  const red = t.closest('[data-wiki-redlink]');
  if (red) { state.redPick = red.dataset.wikiRedlink; repaint(false); return true; }
  if (t.closest('[data-wiki-create-cancel]')) { state.redPick = null; repaint(false); return true; }
  const create = t.closest('[data-wiki-create-type]');
  if (create && state.redPick) {
    const name = state.redPick;
    state.redPick = null;
    let id = null;
    store.update((d) => { const r = createEntity(d, { type: create.dataset.wikiCreateType, name }); id = r.id; return r.campaign; });
    if (id) backToCampaign(() => openEntityInCampaign(id, { read: false }));
    return true;
  }
  const edit = t.closest('[data-wiki-edit]');
  if (edit) { backToCampaign(() => openEntityInCampaign(edit.dataset.wikiEdit, { read: false })); return true; }
  const settings = t.closest('[data-wiki-settings-toggle]');
  if (settings) {
    const id = settings.dataset.wikiSettingsToggle;
    if (state.settingsOpen.has(id)) state.settingsOpen.delete(id); else state.settingsOpen.add(id);
    repaint(false);
    return true;
  }
  if (t.closest('[data-wiki-source-journal]')) { backToCampaign(() => openPanelInCampaign('journal')); return true; }
  const guide = t.closest('[data-wiki-source-guide]');
  if (guide) { backToCampaign(() => openPanelInCampaign('guide', { guideId: guide.dataset.wikiSourceGuide })); return true; }
  const map = t.closest('[data-map-open]');
  if (map) { e.preventDefault(); backToCampaign(() => openPanelInCampaign(null, { mapKey: map.dataset.mapOpen })); return true; }
  return false;
}

export function onWikiInput(e, resultsRoot) {
  const search = e.target.closest('[data-portal-wiki-search]');
  if (!search) return false;
  state.search = search.value;
  const results = resultsRoot.querySelector('[data-portal-wiki-results]');
  if (results) results.innerHTML = listHtml(currentSection);
  return true;
}

export function onWikiChange(e) {
  const t = e.target;
  const aliases = t.closest('[data-wiki-aliases]');
  if (aliases) { store.update((d) => setEntityAliases(d, aliases.dataset.wikiAliases, t.value)); return true; }
  const vis = t.closest('[data-wiki-visibility]');
  if (vis) { store.update((d) => setEntityVisibility(d, vis.dataset.wikiVisibility, t.value)); return true; }
  const place = t.closest('[data-wiki-place-kind]');
  if (place) { store.update((d) => setPlaceKind(d, place.dataset.wikiPlaceKind, t.value)); return true; }
  return false;
}
