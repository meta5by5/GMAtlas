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
// Navigating a mention is a plain click (shell.js's onClick preventDefaults
// the browser's normal "place the cursor here" default so the click reaches
// the entity/doc-open handler instead); editing the label is arrow-keying
// the cursor into it, same as any other inline text. A document mention's
// PAGE (not its label) has its own edit path: Ctrl/Cmd+Click (shell.js's
// onClick again — a fixed data-mention-page attribute, not part of the
// editable label, so it needs a gesture distinct from both of those). This
// module's job is only to render the tooltip text describing all three
// (mentionTitle, below) and to build/read the DOM — the gestures themselves
// live in shell.js, next to the rest of this app's delegated click routing.

import { findDocumentTabByTitle, parseTextBlocks, parseInlineNodes } from '../domain/documents.js';
import { findByName } from '../domain/entities.js';

function escText(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escAttr(s) {
  return escText(s).replace(/"/g, '&quot;');
}

/** The tooltip text for a mention span — describes all three real gestures
 *  (see the module comment above): a plain click always opens; arrow-keying
 *  in always edits the label; Ctrl/Cmd+Click only exists for a document
 *  mention, to edit its page. Exported so shell.js's Ctrl/Cmd+Click handler
 *  and insertMentionNode (below) render identical wording — this was wrong
 *  before ADR 0018 (claimed "Ctrl/Cmd+Click to open — click to edit this
 *  label," which was backwards and non-functional, confirmed by direct user
 *  testing) and having one source for the text is what stops it drifting
 *  out of sync with the real behavior again. */
export function mentionTitle(linked, isDoc) {
  if (!linked) return 'Not linked to an entity or document';
  const base = 'Click to open — arrow-key the cursor in to edit this label.';
  return isDoc ? base + ' Ctrl/Cmd+Click to edit the page.' : base;
}

function renderMentionNode(doc, node) {
  const { name, page, label } = node;
  const ent = findByName(doc, name);
  const foundDoc = ent ? null : findDocumentTabByTitle(doc, name);
  const display = label || (ent ? ent.name : (foundDoc ? foundDoc.title : name)) || name;
  let navAttrs = '';
  let linked = false;
  let isDoc = false;
  if (ent) { navAttrs = `data-open-entity="${escAttr(ent.id)}"`; linked = true; }
  else if (foundDoc && foundDoc.openable) { navAttrs = `data-doc-open="${escAttr(foundDoc.tabKey)}"${page ? ` data-doc-open-page="${page}"` : ''}`; linked = true; isDoc = true; }
  return `<span class="mention-link${linked ? ' mention-link-active' : ''}" data-mention-name="${escAttr(name)}" data-mention-page="${page || ''}" ${navAttrs} title="${escAttr(mentionTitle(linked, isDoc))}">${escText(display)}</span>`;
}

function renderInlineNodes(doc, nodes) {
  let html = '';
  for (const node of nodes) {
    if (node.type === 'text') html += escText(node.text);
    else if (node.type === 'mention') html += renderMentionNode(doc, node);
    else if (node.type === 'bold') html += `<b>${renderInlineNodes(doc, node.children)}</b>`;
    else if (node.type === 'italic') html += `<i>${renderInlineNodes(doc, node.children)}</i>`;
    else if (node.type === 'underline') html += `<u>${renderInlineNodes(doc, node.children)}</u>`;
  }
  return html;
}

/** Build the contenteditable innerHTML for `text` — plain escaped runs,
 *  bold/italic/underline elements, list elements, and inline
 *  <span class="mention-link">s, resolved against entities first (bare
 *  @Name/@[Name] default to entity semantics), then the document library.
 *  An unresolved mention still renders — plain text styling, no
 *  data-open-*, so it's visibly "not linked yet" rather than silently
 *  indistinguishable from plain prose. */
export function buildMentionEditorHTML(doc, text) {
  const source = String(text || '');
  if (!source) return '';
  const blocks = parseTextBlocks(source);
  return blocks.map((block) => {
    if (block.type === 'ul') return `<ul>${block.items.map((item) => `<li>${renderInlineNodes(doc, parseInlineNodes(item))}</li>`).join('')}</ul>`;
    if (block.type === 'ol') return `<ol>${block.items.map((item) => `<li>${renderInlineNodes(doc, parseInlineNodes(item))}</li>`).join('')}</ol>`;
    return renderInlineNodes(doc, parseInlineNodes(block.text));
  }).join('\n');
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
    // Rich-text elements (ADR 0018) round-trip back to the same lightweight
    // markup buildMentionEditorHTML rendered them from — B/STRONG and
    // I/EM both accepted on read (a browser's own Bold/Italic keyboard
    // shortcuts, if a user's muscle memory reaches for Ctrl+B/Ctrl+I inside
    // one of these fields, insert those tags natively; this app never
    // renders EM/STRONG itself, only B/I/U, but reading them the same way
    // costs nothing and avoids a silently-dropped edit).
    if (node.tagName === 'B' || node.tagName === 'STRONG') { out += '**'; for (const c of node.childNodes) walk(c); out += '**'; return; }
    if (node.tagName === 'I' || node.tagName === 'EM') { out += '*'; for (const c of node.childNodes) walk(c); out += '*'; return; }
    if (node.tagName === 'U') { out += '_'; for (const c of node.childNodes) walk(c); out += '_'; return; }
    if (node.tagName === 'UL' || node.tagName === 'OL') {
      const marker = node.tagName === 'UL' ? '- ' : '1. ';
      const items = [...node.children].filter((c) => c.tagName === 'LI');
      items.forEach((li, i) => {
        if (i > 0) out += '\n';
        out += marker;
        for (const c of li.childNodes) walk(c);
      });
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

/** Shared toolbar markup for a rich-text-capable mention-editor field (ADR
 *  0018) — one small row of buttons that insert lightweight markup rather
 *  than live-formatting via execCommand (see the ADR for why). Callers wrap
 *  this and the target `.mention-editor` together in a `.rich-field`
 *  container; shell.js's data-rich-cmd handler (in its existing delegated
 *  mousedown listener — rule 4) finds the sibling editor via
 *  `closest('.rich-field')`, so this markup carries no field-specific
 *  wiring of its own and is safe to call identically from every site. */
export function richToolbarHTML() {
  return `<div class="rich-toolbar" data-rich-toolbar>
    <button type="button" class="icon-btn" data-rich-cmd="bold" title="Bold (**text**)"><b>B</b></button>
    <button type="button" class="icon-btn" data-rich-cmd="italic" title="Italic (*text*)"><i>I</i></button>
    <button type="button" class="icon-btn" data-rich-cmd="underline" title="Underline (_text_)"><u>U</u></button>
    <button type="button" class="icon-btn" data-rich-cmd="ul" title="Bullet list">☰•</button>
    <button type="button" class="icon-btn" data-rich-cmd="ol" title="Numbered list">☰1.</button>
  </div>`;
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
  span.title = mentionTitle(true, kind === 'doc');
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
