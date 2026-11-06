// portal/index.js — the portal surface: the non-campaign screens (Help
// centre now; sign-in, account, store and cart in later phases), with
// their own layout and stylesheet (styles/portal.css), distinct from the
// campaign cockpit (design/ACCOUNTS-SYNC-ROADMAP.md section 8).
//
// Routing is the location hash, so Back/Forward, deep links and "open in
// new tab" behave as in any web app: `#/help` and `#/help/<slug>` show the
// portal; anything else shows the campaign. Rule 4 applies per surface
// root: one delegated listener per event type on the portal root, plus the
// one window `hashchange` listener that switches surfaces.

import { HELP_ARTICLES, HELP_CATEGORIES } from '../../data/helpArticles.js';
import { renderHelpMarkdown, searchHelp, parsePortalRoute } from '../../domain/helpCentre.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let portalRoot = null;
let appRoot = null;
let campaignTitle = 'GMAtlas';
let query = '';

export function mountPortal(portalEl, appEl) {
  portalRoot = portalEl;
  appRoot = appEl;
  portalEl.addEventListener('input', onInput);
  portalEl.addEventListener('click', onClick);
  window.addEventListener('hashchange', route);
  route();
}

function route() {
  const r = parsePortalRoute(location.hash);
  if (!r) {
    if (!portalRoot.hidden) document.title = campaignTitle;
    portalRoot.hidden = true;
    appRoot.hidden = false;
    return;
  }
  if (portalRoot.hidden) campaignTitle = document.title;
  appRoot.hidden = true;
  portalRoot.hidden = false;
  if (r.view === 'help') query = '';
  portalRoot.innerHTML = frame(r.view === 'article' ? articleView(r.slug) : helpHome());
  portalRoot.scrollTop = 0;
  const h1 = portalRoot.querySelector('h1');
  document.title = `${h1 ? h1.textContent : 'Help'} · GMAtlas Help`;
}

function onInput(e) {
  const search = e.target.closest('[data-help-search]');
  if (!search) return;
  query = search.value;
  const results = portalRoot.querySelector('[data-help-results]');
  if (results) results.innerHTML = query.trim() ? searchResults() : categoryGrid();
}

function onClick(e) {
  const jump = e.target.closest('[data-help-jump]');
  if (jump) {
    const target = portalRoot.querySelector(`#${CSS.escape(jump.dataset.helpJump)}`);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function frame(content) {
  return `
    <header class="portal-topbar">
      <a class="portal-brand" href="#/help">GMAtlas <span>Help</span></a>
      <nav class="portal-nav" aria-label="Portal">
        <a href="#/help" aria-current="page">Help centre</a>
      </nav>
      <a class="portal-back" href="#/">← Back to campaign</a>
    </header>
    <main class="portal-main">${content}</main>`;
}

const articlesIn = (categoryId) => HELP_ARTICLES.filter((a) => a.category === categoryId);
const categoryOf = (article) => HELP_CATEGORIES.find((c) => c.id === article.category) || { id: '', label: 'Help' };

function helpHome() {
  return `
    <section class="portal-hero">
      <h1>How can we help?</h1>
      <input class="portal-search" type="search" data-help-search placeholder="Search help articles" aria-label="Search help articles" autocomplete="off">
    </section>
    <div data-help-results>${categoryGrid()}</div>`;
}

function categoryGrid() {
  return `<div class="portal-card-grid">${HELP_CATEGORIES.map((c) => `
    <section class="portal-card">
      <h2>${esc(c.label)}</h2>
      <p class="portal-dim">${esc(c.summary)}</p>
      <ul class="portal-link-list">${articlesIn(c.id).map((a) => `<li><a href="#/help/${esc(a.slug)}">${esc(a.title)}</a></li>`).join('')}</ul>
    </section>`).join('')}</div>`;
}

function searchResults() {
  const hits = searchHelp(HELP_ARTICLES, query);
  if (!hits.length) return `<p class="portal-empty">No articles match “${esc(query.trim())}”. Try fewer or different words.</p>`;
  return `<ul class="portal-result-list" aria-label="Search results">${hits.map((a) => `
    <li><a href="#/help/${esc(a.slug)}"><strong>${esc(a.title)}</strong><span>${esc(categoryOf(a).label)} · ${esc(a.summary)}</span></a></li>`).join('')}</ul>`;
}

function articleView(slug) {
  const article = HELP_ARTICLES.find((a) => a.slug === slug);
  if (!article) {
    return `<div class="portal-article-wrap"><article class="portal-article"><h1>Article not found</h1><p>That help article doesn’t exist. <a href="#/help">Browse all help</a>.</p></article></div>`;
  }
  const category = categoryOf(article);
  const { html, headings } = renderHelpMarkdown(article.body);
  const related = articlesIn(category.id).filter((a) => a.slug !== slug);
  const toc = headings.filter((h) => h.level === 2);
  return `
    <nav class="portal-breadcrumb" aria-label="Breadcrumb"><a href="#/help">Help</a> › <span>${esc(category.label)}</span></nav>
    <div class="portal-article-wrap">
      <article class="portal-article">
        <h1>${esc(article.title)}</h1>
        <p class="portal-lede">${esc(article.summary)}</p>
        ${html}
      </article>
      <aside class="portal-aside">
        ${toc.length ? `<h2 class="portal-toc-title">On this page</h2><ul class="portal-toc">${toc.map((h) => `<li><button type="button" data-help-jump="${esc(h.id)}">${esc(h.text)}</button></li>`).join('')}</ul>` : ''}
        ${related.length ? `<h2>More in ${esc(category.label)}</h2><ul class="portal-link-list">${related.map((a) => `<li><a href="#/help/${esc(a.slug)}">${esc(a.title)}</a></li>`).join('')}</ul>` : ''}
      </aside>
    </div>`;
}
