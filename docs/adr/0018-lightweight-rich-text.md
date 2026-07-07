# ADR 0018 — Lightweight rich text for large text fields, and a mention's own page-edit gesture

## Status

Implemented (2026-07-06), on direct user request (`docs/adr/next-request.md`,
the "revise any large textboxes" batch), including a correction mid-
implementation: the first read of "add an explanation how to edit the [page]
number" specced a double-click gesture; the user then directly clarified
(after testing the *currently shipped* tooltip) that the real ask is
Ctrl/Cmd+Click for editing and a plain click for opening, with the
existing tooltip's wording backwards. This ADR documents what was actually
built, not the intermediate double-click plan.

## Context

The v0.53 prototype's Guide/Journal fields used the browser's
`document.execCommand` (bold/italic/lists apply live, like a mini Word).
Asked directly which model to follow given `execCommand`'s cross-browser
quirks and its mismatch with this app's plain-text-plus-`@mention` storage
model (mentions are stored as plain `@[Name#Page]` text, not HTML — see
`ui/mentionEditor.js`), the user chose the lower-risk path: a small toolbar
that inserts lightweight Markdown-flavored markup, rendered richly for
display, the exact same "plain text is the source of truth, richly
rendered" shape `@mentions` already prove works here.

Separately, `next-request.md` asked to fix a **confirmed, currently-
shipped bug**: the mention tooltip (`mentionEditor.js`) claimed "Ctrl/
Cmd+Click to open — click to edit this label," but the actual click
handler (`ui/shell.js`'s `onClick`, `data-open-entity`/`data-doc-open`
branches) never checked `ctrlKey`/`metaKey` at all — a plain click always
navigated, and there was no distinct "edit" gesture for anything. The user
tested this directly and confirmed it doesn't work as described.

## Decision

**Markup**: `**bold**`, `*italic*`, `_underline_` (inline, may nest —
e.g. a mention inside bold text), plus line-leading `- ` (bullet) and
`N. ` (numbered, any digit — auto-numbering comes from the rendered
`<ol>`, not the literal digit typed) as block-level markers. Stored as
plain text exactly like `@mentions` already are — no new `isHtml`/raw-HTML
storage mode (confirmed dead code, stays that way).

**Parsing** (`src/domain/documents.js`, pure, DOM-free, alongside the
existing `scanMentions`/`parseDocumentMentionRefs` — untouched, since
those only ever care about the `@mention` shape):
- `parseTextBlocks(text)` splits into `{type:'text', text}` /
  `{type:'ul'|'ol', items:[...]}` blocks — consecutive `- `/`N. ` lines
  group into one list block; everything else accumulates into a text
  block (multi-line paragraphs stay one block, newlines preserved).
- `parseInlineNodes(text)` is a small recursive-descent scanner producing
  `{type:'text'|'mention'|'bold'|'italic'|'underline', ...}` nodes.
  Mentions are atomic leaves (a formatting boundary never splits one);
  bold/italic/underline content is parsed recursively, so mentions can
  nest inside them. A delimiter never matches across a line break
  (an unclosed `**` at a paragraph's end stays literal, not a bold run
  that swallows everything after it) — deliberately not a full Markdown
  engine (no headers/quotes/tables/links; only what the toolbar below
  actually inserts).

**Rendering/round-trip** (`ui/mentionEditor.js`): `buildMentionEditorHTML`
now runs text through `parseTextBlocks` → `parseInlineNodes` → real
`<b>`/`<i>`/`<u>`/`<ul><li>`/`<ol><li>` elements (mentions unchanged, still
`<span class="mention-link">`). `serializeMentionEditor` walks that DOM
back to the same markup text — `UL`/`OL` become `- `/`1. `-prefixed lines
(one per `LI`, joined by `\n`), `B`/`I`/`U` (and native `STRONG`/`EM`, in
case a user's own Ctrl+B/Ctrl+I muscle memory reaches the field) wrap
their serialized children in the matching delimiter pair.

**Toolbar** (`richToolbarHTML()`, `ui/mentionEditor.js`): one shared row —
B / I / U / bullet-list / numbered-list — rendered above each target
field, wrapped together in a `.rich-field` container. Buttons are handled
in `ui/shell.js`'s **existing** delegated `mousedown` listener (rule 4 —
no new listener type; `onMouseDown` already existed for graph-pan and the
mention-suggest-item race, this is one more `data-*` branch on it), using
`mousedown` + `preventDefault()` specifically so the button click never
steals focus/selection away from the field it's formatting (a well-known
pattern for "this button acts on a different element's live selection").
Bold/italic/underline wrap the current `Range` in literal delimiter text
nodes (or insert an empty pair with the caret between them, if nothing is
selected); the list buttons use `Selection.modify('extend', 'backward',
'lineboundary')` (Chromium/WebKit, this app's target browsers) to find the
current visual line's start without this app needing its own line-break-
aware DOM walk across a contenteditable's mixed text-node/`<br>`/`<div>`
shapes, then toggle the marker there.

**Six fields gain the toolbar**: Journal compose, Guide editor, WHAT's
Situation, WHO/WHERE/WHY/HOW's Focus (all already `.mention-editor` —
just wrapped in `.rich-field` + `richToolbarHTML()`, no storage change).
**NPC/Faction/etc.'s "Overview (shared)" is the one real conversion**:
was a plain `<textarea data-entity-field="overview">` (shared by every
entity type, zero `@mention` support) — now a `.mention-editor`
contenteditable div, a genuine capability upgrade. Its commit moves from
`onChange`'s generic `data-entity-field` branch (reads `t.value`, which a
contenteditable div doesn't have) to a new `onFocusOut` branch mirroring
Guide's own blur-commit — every other `data-entity-field` is untouched.

**Mention page-editing + the tooltip fix**: `ui/shell.js`'s `onClick`
`data-doc-open` branch now checks `ev.ctrlKey || ev.metaKey` **only** when
the target is an actual `.mention-link` (not the Documents drawer's own
`data-doc-open` card links, which share the attribute but carry no
`data-mention-page`) — Ctrl/Cmd+Click calls `editMentionPage()`
(`window.prompt`, updates `data-mention-page`/`data-doc-open-page`
directly on the live span, then dispatches a synthetic `focusout` so the
enclosing field's existing blur-commit reads it back — no separate store-
write path to keep in sync), a plain click still navigates exactly as
before. `mentionTitle(linked, isDoc)` (`mentionEditor.js`, exported so
`insertMentionNode` and the render path never drift out of sync again)
replaces the wrong tooltip with one accurate sentence per case: unresolved
mentions unchanged ("Not linked..."); every linked mention states click-
to-open and arrow-key-to-edit-the-label; a document mention only
additionally states Ctrl/Cmd+Click edits the page (entities have no page
concept, so they don't get that clause).

## Alternatives considered

- **Live `execCommand` formatting** (what v0.53 did). Rejected per the
  user's explicit choice — cross-browser inconsistency, and a fundamental
  mismatch with plain-text-as-source-of-truth.
- **Double-click to edit a mention's page.** The first plan spec'd this
  (`onDblClick`, already used for statblock-roll). Rejected mid-
  implementation once the user directly tested the shipped tooltip and
  clarified the intended gesture is Ctrl/Cmd+Click, not double-click —
  which also turned out to be the better-engineered choice on its own
  merits: double-click can't be distinguished from an ordinary single
  click until the *second* click event has already fired (browsers set
  `event.detail` retroactively), so avoiding a double-click/navigate
  conflict on a `data-doc-open` mention would have required an artificial
  ~200ms delay on every ordinary single-click open — a real UX cost paid
  on the common case to serve a rare one. Ctrl/Cmd+Click has no such
  ambiguity (known synchronously at mousedown) and reclaims a modifier
  that was already advertised (wrongly) and otherwise a dead no-op.
- **True nested lists** (e.g. lettered sub-items live inside their parent
  numbered item). Rejected as disproportionate for a "lightweight, not a
  full Markdown engine" feature — `parseTextBlocks` supports one flat
  list level. The one place source content actually wanted nesting (the
  Mission Steps' post-battle a-q sub-steps and deployment
  sub-considerations, see the new Guide content below) is instead pulled
  into its own clearly-labeled list directly below the numbered step that
  refers to it. This also sidesteps a real rendering bug a naive
  block-interruption approach would hit: breaking a single logical
  numbered list into two separate `<ol>` elements makes the second one
  restart at "1." (browsers never auto-continue an `<ol>`'s numbering
  across two separate elements) — exactly the kind of broken numbering
  this whole request was raised to fix in the first place.
- **A live import/seed button** ("Import 5PFH Campaign Turn Sequence" in
  Settings) instead of hand-delivered paste-able text for the new Guide
  content. Rejected — campaign data is a GM's own
  (Article VIII, "campaign data is sacred"), and a specific ruleset's
  procedural content baked into permanent app code as a button contradicts
  "genre-aware, not genre-locked" (CLAUDE.md) the same way a hardcoded
  statblock field would. `docs/guide-content/5pfh-campaign-turn-sequence.txt`
  is the durable, versioned copy of that content instead — the GM pastes
  it into a new Guide document themselves (one paste, one blur — the
  existing "type raw `@[...]` text, save, it renders richly" flow every
  other mention-editor field already uses, no new mechanism needed).

## Consequences

- A GM can now bold/italicize/underline/list text in six previously-plain
  fields, and Overview gained full `@mention` support it never had.
- The mention tooltip finally describes real behavior; a document
  mention's page number has an edit path for the first time (previously
  fixed forever at whatever page it was first linked at).
- The new list renderer is intentionally one level deep — a real (if
  narrow) limitation if a future field's content actually needs nested
  lists; revisit then rather than speculatively building it now.
- `docs/guide-content/5pfh-campaign-turn-sequence.txt` holds the fully
  cross-referenced 5PFH Campaign Turn Sequence content, ready to paste.

## Related packs / ADRs

`docs/adr/0017-multi-doc-guide-tree.md` (the Guide tree this content is
authored into); the `@mention` system this extends
(`ui/mentionEditor.js`'s original header comment, `domain/documents.js`'s
`scanMentions`).

## Addendum (2026-07-06) — extended to the rest of "USER CHANGES"

The same next-request.md follow-up batch this ADR's own tooltip fix came
from ("USER CHANGES") also asked to finish rolling this mechanism out
everywhere, plus three small format extensions — incremental uses of the
exact machinery above, not new architecture, so they're recorded here
rather than as their own ADRs (`docs/adr/0019`/`0020` cover the two
genuinely new subsystems from that same batch — WHERE/Scene fields and
Table of Contents generation, respectively):

- **The five fields ADR 0018 missed**: an entity's `revealed` field,
  Faction's `scenarioSeed`/`agenda`, Colony's textarea-type fields, and a
  Document library note's content box all gained the same toolbar. Two of
  them (`scenarioSeed`/`agenda`) needed the identical `<label>`→`<div>`
  fix Overview already got, for the identical reason (a `fieldLabelRow` 🔮
  icon inside the same label as a now-non-labelable contenteditable div).
- **Journal entry editing**: a new ✎ icon per entry swaps its static
  render for a real mention-editor (`domain/session.js`'s new `editNote`,
  mirroring `addNote`'s mention-relinking); auto-saves on blur like every
  other field here.
- **Tab-indent, small/large text (`~text~`/`^large^`), and a table markup
  type** (a GFM-style pipe table, rendered left-aligned with thin borders
  by default; toolbar inserts a fixed skeleton only, no dedicated row/
  column UI, per explicit user choice) extend `parseTextBlocks`/
  `parseInlineNodes` and the toolbar with no change to the underlying
  "plain text markup, richly rendered" model this ADR established.
