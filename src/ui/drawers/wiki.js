// drawers/wiki.js — the campaign wiki's views (design/WIKI-ROADMAP.md W2):
// the Wiki panel (every page, plus red links) and an entity's page in Read
// mode. Pure render(doc, ui) -> html like every other drawer; clicks go
// through shell.js's delegated handlers via data-wiki-* attributes.

import { ENTITY_TYPES, entityTypeLabel } from '../../domain/entities.js';
import {
  pageFor, playerSafe, wikiIndex, unresolvedLinks, splitGmBlocks, wikiLinksToMentions,
  PLACE_KINDS, PLACE_KIND_LABEL, entityVisibility,
} from '../../domain/wiki.js';
import { buildMentionEditorHTML } from '../mentionEditor.js';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// A text as the page shows it: GM blocks shaded (GM view only), both link
// syntaxes drawn as the app's usual mention links, unresolved ones red.
function textHtml(doc, text) {
  const runs = splitGmBlocks(text);
  if (!runs.length) return '';
  return runs.map((r) => `<div class="wiki-text${r.gm ? ' wiki-gm-block' : ''}">${r.gm ? '<span class="wiki-gm-tag">GM only</span>' : ''}${buildMentionEditorHTML(doc, wikiLinksToMentions(r.text))}</div>`).join('');
}

function plainSnippet(text, max = 160) {
  const s = String(text || '')
    .replace(/\[\[([^\[\]|\n]+)(?:\|([^\[\]\n]+))?\]\]/g, (m, a, b) => b || a)
    .replace(/@\[(?:([^\]|]*)\|)?([^\]]+?)(?:\s*(?:#|p\.?)\s*\d+)?\]/g, (m, label, name) => label || name)
    .replace(/^\s*:::\s*(gm)?\s*$/gim, '')
    .replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function visibilityBadge(v) {
  return v === 'players'
    ? '<span class="wiki-badge wiki-badge-shared" title="Players can see this page">👁 Shared</span>'
    : '<span class="wiki-badge" title="Only the GM sees this page">GM only</span>';
}

function playerViewToggle(ui) {
  const on = !!ui.wikiPlayerView;
  return `<button type="button" class="btn ghost sm${on ? ' active' : ''}" data-wiki-player-view aria-pressed="${on}" title="${on ? 'Back to the GM view' : 'See pages as players would: shared pages only, no GM text'}">👁 ${on ? 'Player View on' : 'Player View'}</button>`;
}

/** Inline "create a page for this red link" chooser, shown in place of a
 *  popup (CLAUDE.md: never window.prompt). */
function redLinkChooser(doc, name) {
  if (!name) return '';
  const genre = doc.settings && doc.settings.genrePack;
  return `<div class="wiki-redlink-pick" role="group" aria-label="Create a page">
    <span>Create “${esc(name)}” as</span>
    ${ENTITY_TYPES.map((t) => `<button type="button" class="chip sm" data-wiki-create-type="${t}">${esc(entityTypeLabel(t, genre))}</button>`).join('')}
    <button type="button" class="icon-btn" data-wiki-create-cancel title="Cancel" aria-label="Cancel">✕</button>
  </div>`;
}

function entityLink(id, name) {
  return `<button type="button" class="wiki-link" data-open-entity="${esc(id)}">${esc(name || 'Unnamed')}</button>`;
}

// Where a backlink's text lives, as something to click when the app can
// open that place, or plain text when it can't.
function sourceHtml(src) {
  switch (src.kind) {
    case 'entity': return entityLink(src.id, src.label);
    case 'journal': return `<button type="button" class="wiki-link" data-wiki-source-journal="${esc(src.id)}">${esc(src.label)}</button>`;
    case 'guide': return `<button type="button" class="wiki-link" data-wiki-source-guide="${esc(src.id)}">📘 ${esc(src.label)}</button>`;
    case 'hex': return `<button type="button" class="wiki-link" data-map-open="map:hexcrawl:${esc(src.mapId)}">⬡ ${esc(src.label)}</button>`;
    case 'tile': return `<button type="button" class="wiki-link" data-map-open="map:dungeoncrawl:${esc(src.mapId)}">🧱 ${esc(src.label)}</button>`;
    case 'battlemap': return `<button type="button" class="wiki-link" data-map-open="map:battlemap:${esc(src.mapId)}">🗺 ${esc(src.label)}</button>`;
    default: return `<span>${esc(src.label)}</span>`;
  }
}

const SOURCE_GROUP_LABEL = {
  entity: 'Pages', journal: 'Journal', scene: 'Scenes', composer: 'Composer', thread: 'Threads',
  guide: 'Guide', document: 'Documents', hex: 'Hexcrawl', tile: 'Dungeon Crawl', battlemap: 'Battlemap',
};

function section(title, body) {
  return body ? `<section class="wiki-section"><h3>${esc(title)}</h3>${body}</section>` : '';
}

function linkList(items, extra = () => '') {
  if (!items.length) return '';
  return `<ul class="wiki-list">${items.map((i) => `<li>${entityLink(i.id, i.name)}${extra(i)}</li>`).join('')}</ul>`;
}

function infoboxHtml(page) {
  if (!page.infobox.length) return '';
  return `<aside class="wiki-infobox"><dl>${page.infobox.map((f) => `<dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd>`).join('')}</dl></aside>`;
}

function breadcrumbHtml(page) {
  if (!page.breadcrumb.length) return '';
  return `<nav class="wiki-breadcrumb" aria-label="Where this is">${page.breadcrumb.map((b) => entityLink(b.id, b.name)).join('<span aria-hidden="true">›</span>')}<span aria-hidden="true">›</span><span>${esc(page.name)}</span></nav>`;
}

function relationsHtml(page, withNotes) {
  return page.relations.map((g) => `<div class="wiki-rel-group"><h4>${esc(g.label)}</h4>${linkList(g.items, (i) => (withNotes && i.label ? ` <span class="dim small">— ${esc(i.label)}</span>` : ''))}</div>`).join('');
}

function pageSettingsHtml(doc, e, ui) {
  const open = ui.wikiSettingsOpen && ui.wikiSettingsOpen.has(e.id);
  const vis = entityVisibility(e);
  const placeSelect = e.type === 'location'
    ? `<label class="field-label">Place kind
        <select data-wiki-place-kind="${esc(e.id)}">
          <option value="" ${!e.placeKind ? 'selected' : ''}>—</option>
          ${PLACE_KINDS.map((k) => `<option value="${k}" ${e.placeKind === k ? 'selected' : ''}>${esc(PLACE_KIND_LABEL[k])}</option>`).join('')}
        </select></label>`
    : '';
  return `<div class="wiki-settings">
    <button type="button" class="section-toggle" data-wiki-settings-toggle="${esc(e.id)}" aria-expanded="${!!open}">${open ? '▾' : '▸'} Page settings</button>
    ${open ? `<div class="wiki-settings-body">
      <label class="field-label">Also known as <span class="field-label-hint">(comma-separated)</span>
        <input data-wiki-aliases="${esc(e.id)}" value="${esc((e.aliases || []).join(', '))}" placeholder="Other names this page answers to"></label>
      <label class="field-label">Who can see this page
        <select data-wiki-visibility="${esc(e.id)}">
          <option value="gm" ${vis === 'gm' ? 'selected' : ''}>GM only</option>
          <option value="players" ${vis === 'players' ? 'selected' : ''}>Shared with players</option>
        </select></label>
      ${placeSelect}
      <p class="dim small">Link pages by typing <code>[[Name]]</code>, <code>[[Name|shown text]]</code> or <code>@Name</code>. Put GM-only text between a line <code>:::gm</code> and a line <code>:::</code>.</p>
    </div>` : ''}
  </div>`;
}

function pageBar(e, ui, crumbs) {
  return `<div class="wiki-page-bar">
    ${crumbs || '<span></span>'}
    <span class="wiki-page-actions">${playerViewToggle(ui)}<button type="button" class="btn ghost sm" data-wiki-edit="${esc(e.id)}" title="Edit this entity">✎ Edit</button></span>
  </div>`;
}

/** An entity's page in Read mode — the GM's view, or the player-safe one
 *  while Player View is on. */
export function wikiPage(doc, e, ui = {}) {
  if (ui.wikiPlayerView) return playerPage(doc, e, ui);
  const page = pageFor(doc, e.id);
  const journalById = new Map((doc.journal || []).map((j) => [j.id, j]));
  const groups = new Map();
  for (const src of page.linkedFrom) {
    if (!groups.has(src.kind)) groups.set(src.kind, []);
    groups.get(src.kind).push(src);
  }
  const linkedFromHtml = [...groups].map(([kind, list]) => `<div class="wiki-rel-group"><h4>${esc(SOURCE_GROUP_LABEL[kind] || kind)}</h4><ul class="wiki-list">${list.map((s) => `<li>${sourceHtml(s)}</li>`).join('')}</ul></div>`).join('');
  const sessionsHtml = page.sessions.length
    ? `<ol class="wiki-sessions">${page.sessions.map((s) => {
      const j = journalById.get(s.id);
      return `<li><button type="button" class="wiki-link" data-wiki-source-journal="${esc(s.id)}">${esc(String(s.createdAt || '').slice(0, 10))}</button> <span class="dim small">${esc(j ? j.source || '' : '')}</span><div class="wiki-snippet">${esc(plainSnippet(j && j.text))}</div></li>`;
    }).join('')}</ol>`
    : '';
  const overview = textHtml(doc, e.overview || '');
  const secrets = (e.revealed || '').trim()
    ? `<div class="wiki-text wiki-gm-block"><span class="wiki-gm-tag">GM notes</span>${buildMentionEditorHTML(doc, wikiLinksToMentions(e.revealed))}</div>`
    : '';
  return `<article class="wiki-page" data-wiki-page="${esc(e.id)}">
    ${pageBar(e, ui, breadcrumbHtml(page))}
    <header class="wiki-title">
      <h2>${esc(page.name)}</h2>
      <div class="wiki-sub">${esc(page.typeLabel)}${page.placeKind ? ` · ${esc(PLACE_KIND_LABEL[page.placeKind])}` : ''} ${visibilityBadge(page.visibility)}</div>
      ${page.aliases.length ? `<div class="wiki-aka dim small">Also known as ${page.aliases.map(esc).join(', ')}</div>` : ''}
    </header>
    ${redLinkChooser(doc, ui.wikiRedLinkPick)}
    <div class="wiki-layout">
      <div class="wiki-main">
        ${overview || '<p class="dim small">Nothing written yet. ✎ Edit to add an overview.</p>'}
        ${secrets}
        ${section('Contains', linkList(page.children, (c) => (c.placeKind ? ` <span class="dim small">${esc(PLACE_KIND_LABEL[c.placeKind])}</span>` : '')))}
        ${section('Here', linkList(page.here))}
        ${section('Relationships', relationsHtml(page, true))}
        ${section('Linked from', linkedFromHtml)}
        ${section('Appears in sessions', sessionsHtml)}
      </div>
      ${infoboxHtml(page)}
    </div>
    ${pageSettingsHtml(doc, e, ui)}
  </article>`;
}

function playerPage(doc, e, ui) {
  const safe = playerSafe(doc, e.id);
  if (!safe) {
    return `<article class="wiki-page wiki-player" data-wiki-page="${esc(e.id)}">
      ${pageBar(e, ui, '')}
      <p class="wiki-hidden-note">🔒 Players can’t see this page. Share it in ✎ Edit's page settings, or turn Player View off.</p>
    </article>`;
  }
  const crumbs = safe.breadcrumb.length ? breadcrumbHtml({ ...safe }) : '';
  const overview = safe.overview ? `<div class="wiki-text">${buildMentionEditorHTML(doc, wikiLinksToMentions(safe.overview))}</div>` : '';
  return `<article class="wiki-page wiki-player" data-wiki-page="${esc(e.id)}">
    ${pageBar(e, ui, crumbs)}
    <header class="wiki-title">
      <h2>${esc(safe.name)}</h2>
      <div class="wiki-sub">${esc(safe.typeLabel)}${safe.placeKind ? ` · ${esc(PLACE_KIND_LABEL[safe.placeKind])}` : ''} <span class="wiki-badge wiki-badge-shared">👁 Player View</span></div>
    </header>
    <div class="wiki-layout">
      <div class="wiki-main">
        ${overview || '<p class="dim small">Nothing shared yet.</p>'}
        ${section('Contains', linkList(safe.children))}
        ${section('Here', linkList(safe.here))}
        ${section('Relationships', relationsHtml(safe, false))}
      </div>
      ${infoboxHtml(safe)}
    </div>
  </article>`;
}

/** The 📖 button on the Entity Editor's head row that switches to Read. */
export function wikiReadButton(e) {
  return `<button type="button" class="icon-btn" data-wiki-read="${esc(e.id)}" title="Read this as a wiki page">📖 Read</button>`;
}

/** The Wiki panel: every page (or, in Player View, every shared page),
 *  searchable and filterable by type, plus the red links waiting for pages. */
export function wikiPanel(doc, ui = {}) {
  const genre = doc.settings && doc.settings.genrePack;
  const player = !!ui.wikiPlayerView;
  const rows = wikiIndex(doc, { search: ui.wikiSearch || '', type: ui.wikiType || '' }).filter((r) => !player || r.visibility === 'players');
  const byType = new Map();
  for (const r of rows) {
    if (!byType.has(r.type)) byType.set(r.type, []);
    byType.get(r.type).push(r);
  }
  const groupsHtml = [...byType].sort((a, b) => entityTypeLabel(a[0], genre).localeCompare(entityTypeLabel(b[0], genre))).map(([type, list]) => `
    <div class="wiki-index-group">
      <h4>${esc(entityTypeLabel(type, genre))} <span class="dim small">${list.length}</span></h4>
      <ul class="wiki-list">${list.map((r) => `<li>
        <button type="button" class="wiki-link" data-wiki-open="${esc(r.id)}">${esc(r.name)}</button>
        ${r.placeKind ? `<span class="dim small">${esc(PLACE_KIND_LABEL[r.placeKind])}</span>` : ''}
        ${!player && r.visibility === 'players' ? '<span class="wiki-badge wiki-badge-shared" title="Shared with players">👁</span>' : ''}
        ${!player && r.linkCount ? `<span class="dim small" title="Places that link here">↩ ${r.linkCount}</span>` : ''}
      </li>`).join('')}</ul>
    </div>`).join('');
  const red = player ? [] : unresolvedLinks(doc);
  const redHtml = red.length ? `<div class="wiki-index-group wiki-redlinks">
      <h4>Red links <span class="dim small">${red.length}</span></h4>
      <p class="dim small">Linked to, but no page yet.</p>
      <ul class="wiki-list">${red.map((r) => `<li><button type="button" class="wiki-link wiki-redlink" data-wiki-redlink="${esc(r.name)}" title="Create this page">${esc(r.name)}</button> <span class="dim small">${r.sources.map((s) => esc(s.label)).join(', ')}</span></li>`).join('')}</ul>
    </div>` : '';
  const typeOptions = ['', ...ENTITY_TYPES].map((t) => `<option value="${t}" ${(ui.wikiType || '') === t ? 'selected' : ''}>${t ? esc(entityTypeLabel(t, genre)) : 'All types'}</option>`).join('');
  return `<div class="wiki-index">
    <div class="wiki-index-bar">
      <input class="drawer-search" data-wiki-search value="${esc(ui.wikiSearch || '')}" placeholder="Search pages, aliases, tags…">
      <select data-wiki-type aria-label="Type">${typeOptions}</select>
      ${playerViewToggle(ui)}
    </div>
    ${ui.wikiRedLinkPick ? redLinkChooser(doc, ui.wikiRedLinkPick) : ''}
    ${groupsHtml || `<p class="dim small">${player ? 'No pages are shared with players yet.' : 'No pages match.'}</p>`}
    ${redHtml}
  </div>`;
}

// Re-exported for the shell's red-link click: is this mention span a link
// that resolves to nothing at all?
export function isRedLinkSpan(span) {
  return !!span && !span.hasAttribute('data-open-entity') && !span.hasAttribute('data-doc-open') && !span.hasAttribute('data-map-open') && !span.hasAttribute('data-mention-upload-needed');
}
