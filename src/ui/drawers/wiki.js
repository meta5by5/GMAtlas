// drawers/wiki.js — the campaign wiki's views (design/WIKI-ROADMAP.md W2):
// the Wiki panel (every page, plus red links) and an entity's page in Read
// mode. Pure render(doc, ui) -> html like every other drawer; clicks go
// through shell.js's delegated handlers via data-wiki-* attributes.

import { ENTITY_TYPES, entityTypeLabel } from '../../domain/entities.js';
import {
  pageFor, playerSafe, recordSections, wikiIndex, unresolvedLinks, splitGmBlocks, wikiLinksToMentions,
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

const NONE = '<span class="wiki-none">{none}</span>';
const secId = (id) => `wiki-sec-${id}`;

function refHtml(r) {
  return r.id ? entityLink(r.id, r.name) : esc(r.name);
}

function fieldValueHtml(doc, f) {
  if (f.empty) return NONE;
  switch (f.kind) {
    case 'long': return textHtml(doc, f.value) || NONE;
    case 'ref': return refHtml(f.value);
    case 'refs': return f.value.map(refHtml).join(', ');
    case 'list': return `<span class="wiki-chips">${f.value.map((v) => `<span class="wiki-chip">${esc(v)}</span>`).join('')}</span>`;
    case 'items':
    case 'object': return `<ul class="wiki-items">${f.value.map((v) => `<li>${esc(v)}</li>`).join('')}</ul>`;
    default: return esc(f.value);
  }
}

const WIDE_KINDS = new Set(['long', 'items', 'object']);

/** The full record as cards, one per section, every field shown and unset
 *  ones as {none}. */
function recordHtml(doc, sections) {
  return `<div class="wiki-record">${sections.map((s) => `<section class="wiki-record-card" id="${secId(s.id)}">
      <h4>${esc(s.title)}</h4>
      ${s.fields.length ? `<dl class="wiki-fields">${s.fields.map((f) => `<div class="wiki-field${WIDE_KINDS.has(f.kind) ? ' wide' : ''}${f.empty ? ' is-empty' : ''}"><dt>${esc(f.label)}</dt><dd>${fieldValueHtml(doc, f)}</dd></div>`).join('')}</dl>` : `<p>${NONE}</p>`}
    </section>`).join('')}</div>`;
}

// A page is a list of parts; the page draws them and the portal's left nav
// lists them, so the two can't disagree.
function part(id, title, body, sub) {
  return body ? { id, title, html: `<section class="wiki-section" id="${secId(id)}"><h3>${esc(title)}</h3>${body}</section>`, sub: sub || [] } : null;
}

function gmParts(doc, e, ui) {
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
  const record = recordSections(doc, e.id) || [];
  const parts = [
    part('overview', 'Overview', textHtml(doc, e.overview || '') || `<p>${NONE}</p>`),
    part('gm-notes', 'GM notes', (e.revealed || '').trim()
      ? `<div class="wiki-text wiki-gm-block"><span class="wiki-gm-tag">GM only</span>${buildMentionEditorHTML(doc, wikiLinksToMentions(e.revealed))}</div>`
      : `<p>${NONE}</p>`),
    part('details', 'Details', recordHtml(doc, record), record.map((s) => ({ id: s.id, title: s.title }))),
    part('contains', 'Contains', linkList(page.children, (c) => (c.placeKind ? ` <span class="dim small">${esc(PLACE_KIND_LABEL[c.placeKind])}</span>` : ''))),
    part('here', 'Here', linkList(page.here)),
    part('relationships', 'Relationships', relationsHtml(page, true)),
    part('linked-from', 'Linked from', linkedFromHtml),
    part('sessions', 'Appears in sessions', sessionsHtml),
  ].filter(Boolean);
  const html = `<article class="wiki-page" data-wiki-page="${esc(e.id)}">
    ${pageBar(e, ui, breadcrumbHtml(page))}
    <header class="wiki-title">
      <h2>${esc(page.name)}</h2>
      <div class="wiki-sub">${esc(page.typeLabel)}${page.placeKind ? ` · ${esc(PLACE_KIND_LABEL[page.placeKind])}` : ''} ${visibilityBadge(page.visibility)}</div>
      ${page.aliases.length ? `<div class="wiki-aka dim small">Also known as ${page.aliases.map(esc).join(', ')}</div>` : ''}
    </header>
    ${redLinkChooser(doc, ui.wikiRedLinkPick)}
    <div class="wiki-layout">
      <div class="wiki-main">${parts.map((p) => p.html).join('')}</div>
      ${infoboxHtml(page)}
    </div>
    ${pageSettingsHtml(doc, e, ui)}
  </article>`;
  return { html, parts };
}

function playerParts(doc, e, ui) {
  const safe = playerSafe(doc, e.id);
  if (!safe) {
    return {
      parts: [],
      html: `<article class="wiki-page wiki-player" data-wiki-page="${esc(e.id)}">
      ${pageBar(e, ui, '')}
      <p class="wiki-hidden-note">🔒 Players can’t see this page. Share it in ✎ Edit's page settings, or turn Player View off.</p>
    </article>`,
    };
  }
  const crumbs = safe.breadcrumb.length ? breadcrumbHtml({ ...safe }) : '';
  const parts = [
    part('overview', 'Overview', safe.overview ? `<div class="wiki-text">${buildMentionEditorHTML(doc, wikiLinksToMentions(safe.overview))}</div>` : `<p>${NONE}</p>`),
    part('details', 'Details', safe.record.length ? recordHtml(doc, safe.record) : '', safe.record.map((s) => ({ id: s.id, title: s.title }))),
    part('contains', 'Contains', linkList(safe.children)),
    part('here', 'Here', linkList(safe.here)),
    part('relationships', 'Relationships', relationsHtml(safe, false)),
  ].filter(Boolean);
  const html = `<article class="wiki-page wiki-player" data-wiki-page="${esc(e.id)}">
    ${pageBar(e, ui, crumbs)}
    <header class="wiki-title">
      <h2>${esc(safe.name)}</h2>
      <div class="wiki-sub">${esc(safe.typeLabel)}${safe.placeKind ? ` · ${esc(PLACE_KIND_LABEL[safe.placeKind])}` : ''} <span class="wiki-badge wiki-badge-shared">👁 Player View</span></div>
    </header>
    <div class="wiki-layout">
      <div class="wiki-main">${parts.map((p) => p.html).join('')}</div>
      ${infoboxHtml(safe)}
    </div>
  </article>`;
  return { html, parts };
}

/** An entity's page in Read mode with its outline: `{html, outline}`, the
 *  outline being `[{id, title, sub: [{id, title}]}]` with ids as the
 *  section element ids (the portal's left nav lists it). */
export function wikiPageWithOutline(doc, e, ui = {}) {
  const { html, parts } = ui.wikiPlayerView ? playerParts(doc, e, ui) : gmParts(doc, e, ui);
  return { html, outline: parts.map((p) => ({ id: secId(p.id), title: p.title, sub: p.sub.map((s) => ({ id: secId(s.id), title: s.title })) })) };
}

/** An entity's page in Read mode — the GM's view, or the player-safe one
 *  while Player View is on. */
export function wikiPage(doc, e, ui = {}) {
  return wikiPageWithOutline(doc, e, ui).html;
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
