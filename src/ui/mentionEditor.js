// mentionEditor.js — inline @mention rendering for contenteditable text
// surfaces (Journal compose box + entries, the Guide editor, WHO/WHERE/WHAT/
// WHY/HOW context fields). Replaces the earlier "plain textarea + a row of
// clickable badges underneath it" approach: a mention is now inline text —
// a clickable, editable span living exactly where it was typed, the way a
// hyperlink sits inline in a web page or an MS Word document. The stored
// model is unchanged (the same @Name / @[Name] / @[Label|Name#Page] plain
// text documents.js already parses/writes) — this module only builds the
// rich DOM from that text and reads it back.
//
// Editing the label is just editing text: the mention <span> is a normal
// (not contenteditable="false") inline element inside the editable
// container, so the browser lets the cursor move through it and typing
// changes its textContent like any other text. What's fixed is the span's
// data-mention-name/data-mention-page — serializeMentionEditor reads those,
// not the (possibly just-edited) visible label, for what the mention
// actually resolves to, so editing the label can never change the link.
// Navigating a mention (as opposed to editing its label) is Ctrl/Cmd+Click
// (see shell.js's onClick — a plain click needs to fall through to the
// browser's normal "place the cursor here" behavior, the same convention
// Word itself uses for editable hyperlinks).

import { scanMentionSpans, findDocumentTabByTitle } from '../domain/documents.js';
import { findByName } from '../domain/entities.js';

function escText(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escAttr(s) {
  return escText(s).replace(/"/g, '&quot;');
}

/** Build the contenteditable innerHTML for `text` — plain escaped runs plus
 *  one inline <span class="mention-link"> per mention, resolved against
 *  entities first (bare @Name/@[Name] default to entity semantics), then
 *  the document library. An unresolved mention still renders — plain text
 *  styling, no data-open-*, so Ctrl+Click has nothing to follow — so it's
 *  visibly "not linked yet" rather than silently indistinguishable from
 *  plain prose. */
export function buildMentionEditorHTML(doc, text) {
  const source = String(text || '');
  const spans = scanMentionSpans(source);
  if (!spans.length) return escText(source);
  let html = '';
  let last = 0;
  for (const { name, page, label, start, end } of spans) {
    html += escText(source.slice(last, start));
    const ent = findByName(doc, name);
    const foundDoc = ent ? null : findDocumentTabByTitle(doc, name);
    const display = label || (ent ? ent.name : (foundDoc ? foundDoc.title : name)) || name;
    let navAttrs = '';
    let linked = false;
    if (ent) { navAttrs = `data-open-entity="${escAttr(ent.id)}"`; linked = true; }
    else if (foundDoc && foundDoc.openable) { navAttrs = `data-doc-open="${escAttr(foundDoc.tabKey)}"${page ? ` data-doc-open-page="${page}"` : ''}`; linked = true; }
    html += `<span class="mention-link${linked ? ' mention-link-active' : ''}" data-mention-name="${escAttr(name)}" data-mention-page="${page || ''}" ${navAttrs} title="${linked ? 'Ctrl/Cmd+Click to open — click to edit this label' : 'Not linked to an entity or document'}">${escText(display)}</span>`;
    last = end;
  }
  html += escText(source.slice(last));
  return html;
}

/** Read a mention-editor container's current DOM back into the same plain
 *  @Name / @[Label|Name#Page] text buildMentionEditorHTML renders from — the
 *  form addNote/setGuideText/patchContext etc. already store. A mention
 *  span's label is omitted from the output (reverting to a plain @[Name])
 *  if it now matches the name exactly, same as relabelMention's own "clear
 *  by emptying" convention. */
export function serializeMentionEditor(container) {
  let out = '';
  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) { out += node.nodeValue; return; }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.tagName === 'BR') { out += '\n'; return; }
    if (node.classList && node.classList.contains('mention-link')) {
      const name = node.dataset.mentionName || '';
      const page = node.dataset.mentionPage ? Number(node.dataset.mentionPage) : null;
      const label = node.textContent.trim();
      const target = name + (page ? '#' + page : '');
      out += (label && label.toLowerCase() !== name.trim().toLowerCase()) ? `@[${label}|${target}]` : `@[${target}]`;
      return;
    }
    // Some browsers wrap each Enter-key line in a DIV/P instead of a BR —
    // treat entering one (after the first) as a line break.
    if ((node.tagName === 'DIV' || node.tagName === 'P') && out.length && !out.endsWith('\n')) out += '\n';
    for (const child of node.childNodes) walk(child);
  }
  for (const child of container.childNodes) walk(child);
  return out;
}

/** Insert an entity/document mention as a real inline <span> (not raw
 *  @[...] text) at the given Range inside a mention-editor container — used
 *  by drag-and-drop and the @-suggestion popup so the result is immediately
 *  a clickable/editable link, not text waiting for a future re-render to
 *  become one. The caller already knows exactly what was dragged/picked
 *  (an existing entity id or a resolved document tab key), so this takes
 *  the nav target directly rather than re-resolving it from `name`. Leaves
 *  the caret positioned right after the inserted mention (plus a trailing
 *  space), matching insertAtCursor's textarea behavior. */
export function insertMentionNode(range, { kind, entityId, tabKey, tabPage, name, page, label }) {
  const span = document.createElement('span');
  span.className = 'mention-link mention-link-active';
  span.dataset.mentionName = name;
  span.dataset.mentionPage = page || '';
  if (kind === 'entity') span.dataset.openEntity = entityId;
  else if (kind === 'doc') {
    span.dataset.docOpen = tabKey;
    if (tabPage) span.dataset.docOpenPage = tabPage;
  }
  span.title = 'Ctrl/Cmd+Click to open — click to edit this label';
  span.textContent = label || name;
  range.deleteContents();
  range.insertNode(span);
  const space = document.createTextNode(' ');
  span.after(space);
  const after = document.createRange();
  after.setStartAfter(space);
  after.collapse(true);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(after);
}
