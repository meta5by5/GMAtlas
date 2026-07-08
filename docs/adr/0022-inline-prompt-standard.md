# ADR 0022 — A single standard for inline data entry, replacing window.prompt()

## Status

Implemented (2026-07-07), on direct user request: "as a general rule, do
not have popup windows for data entry. There are already existing
examples of buttons opening input fields. Please create a standard
approach and assure all similar inputs are done the same way."

## Context

This app already had two competing conventions for "a button needs one
more piece of text before it can act":

1. **Bespoke inline forms** — Party Tracker creation, the Trade drawer's
   "+ Contract" form, document/Reference Library rename, entity/document
   tag entry, mention relabeling. Each is its own small chunk of ephemeral
   state (`partyTrackerDraftName`, `docRenameOpen`, ...) and its own
   render branch, wired into the shared `onClick`/`onChange`/`onKeydown`
   handlers individually. This has been the preferred direction for a
   while — several `buildInfo.js` changelog entries call out replacing a
   `window.prompt()` with exactly this shape.
2. **`window.prompt()`** — still the fallback for anything nobody had
   gotten around to converting: WHO/WHY's "Introduce NPC"/"Set Objective"
   (`data-shift-prompt`), a statblock's "+ Field"/"+ Track", a custom
   ruleset name, "+ Thread", "+ Expedition", a document mention's page
   number (both the drag-and-drop path and the `@`-autocomplete path), an
   existing mention's page (Ctrl/Cmd+Click), and this same session's own
   freshly-added rich-text Link button. Nine call sites in total.

Bespoke inline forms don't generalize well to a one-off "just needs a
single string" case — Party Tracker's form has a name/type pair with
type-dependent sub-fields; a "+ Field" button just needs one word. Writing
a full bespoke form (state variable, render branch, click handler, Enter/
Escape wiring) for each of the nine remaining `window.prompt()` sites
would mean nine near-identical implementations of the same shape, which is
exactly what "assure all similar inputs are done the same way" is asking
not to happen.

## Decision

One generic mechanism, `openInlinePrompt(kind, opts)` /
`commitInlinePrompt()` / `closeInlinePrompt()` (`ui/shell.js`), replaces
every remaining `window.prompt()`. A single small floating field — label,
text input, ✓ submit, ✕ cancel — lives once in the static shell skeleton
(`mountShell()`'s initial HTML, `[data-inline-prompt]`), positioned via
`getBoundingClientRect()` next to whatever triggered it. This is the same
fixed-position/anchor-to-trigger technique `mentionSuggest`'s `@`-mention
popup already used, extended from "a list of choices" to "one line of free
text."

Each conversion needed at the trigger site is the same three-line shape:

```js
const el = hit('[data-whatever]');
if (el) { openInlinePrompt('some-kind', { label, placeholder, meta, anchorRect: el.getBoundingClientRect() }); return; }
```

`commitInlinePrompt()` is one function with a branch per `kind` — each
branch is exactly what that call site's `window.prompt()` used to do with
its return value, just reading `inlinePrompt.value`/`meta` instead of a
prompt's return string. `meta` carries whatever a kind's branch needs
beyond the typed text: a statblock group index, a live mention `<span>`,
a captured Selection `Range` (see below). Enter (in the shared `onKeydown`)
and clicking ✓ both call `commitInlinePrompt()`; Escape and ✕ both call
`closeInlinePrompt()`. Deliberately **no** close-on-blur — the input
losing focus to its own ✓/✕ buttons is a classic blur-before-click race,
and skipping close-on-blur entirely sidesteps it rather than working
around it with a timer (which this app's architecture already treats as
something to avoid).

Nine call sites converted, one existing helper adjusted to support the
one case that needed it:

- `data-shift-prompt` ("Introduce NPC", **"Set Objective"** — the one this
  batch was named for): `kind: 'shift-prompt'`, `meta: { name }`.
- A statblock's "+ Field"/"+ Track": `kind: 'statblock-add-field'` /
  `'statblock-add-track'`, `meta: { gi }` (the group index).
- Settings' custom ruleset name: `kind: 'template-system-add'`.
- WHY's "+ Thread"/"+ Expedition": `kind: 'thread-add'` /
  `'expedition-add'`.
- The rich-text toolbar's Link button (`docs/adr` — added this same
  session, before this rule was stated): `kind: 'ext-link'`. This one
  needed `wrapSelectionWithMarkup` (`ui/shell.js`) to accept an *explicit*
  `Range` argument instead of always reading `window.getSelection()`
  fresh — by the time the GM finishes typing a URL into the inline prompt
  and submits, focus has moved to the prompt's own `<input>`, so the live
  selection may no longer point at the field at all. The link button's
  `mousedown` handler now clones the current range *before* opening the
  prompt and hands it back via `meta.range`; every other toolbar command
  (bold/italic/...) is unaffected — they still act synchronously on
  `mousedown`, so they never needed this.
- A document mention's page number — three sites, one shared
  `applyMentionPage(mentionEl, input)`:
  - Ctrl/Cmd+Click an *existing* mention (`editMentionPage`) — anchored to
    that mention's own `getBoundingClientRect()`.
  - Dropping a document onto a text field (`onDrop`), and picking a
    document from the `@`-autocomplete popup (`chooseMentionSuggestItem`)
    — both used to ask for a page *before* inserting anything. They now
    insert the mention pageless immediately (`insertMentionNode` — now
    returns the span it created, so a caller has a live node to anchor to)
    and open the inline prompt as an optional follow-up positioned at the
    mention's own location. Leaving it blank or hitting Escape/✕ leaves
    the pageless mention exactly as inserted — the same end result the old
    "leave blank in the popup" path had, just reordered (insert, then
    optionally refine) instead of (ask, then insert).

## Alternatives considered

- **A bespoke inline form per remaining site**, matching the Party
  Tracker/Contract precedent exactly. Rejected — nine near-identical
  single-string forms is the opposite of "done the same way"; a shared
  mechanism for the shared shape (one line of text, submit/cancel) is a
  smaller, more consistent surface, while the genuinely multi-field forms
  (Party Tracker, Contract) correctly stay bespoke, since they aren't this
  shape at all.
- **A modal/dialog element** (`<dialog>` or a full-screen overlay) instead
  of a small anchored popup. Rejected — the explicit ask was against
  *popup windows*; a small field anchored right next to its trigger reads
  as part of the page, the same way this app's other inline forms already
  do, not as an interruption.
- **Closing on blur**, matching how some existing bespoke forms behave.
  Rejected due to the blur-before-click race against the prompt's own ✓/✕
  buttons; Escape/✕/✓ are unambiguous and cost nothing in practice since
  the prompt is small and rarely left open by accident.

## Consequences

- Every text-entry interaction in this app now either uses this one inline
  prompt or one of the pre-existing bespoke multi-field inline forms —
  `window.prompt()` no longer appears anywhere in `src/` outside of
  comments describing its removal.
- A tenth call site in the future (anything that just needs "click a
  button, type one line, go") is three lines at the trigger and one
  branch in `commitInlinePrompt()`, not a new state variable and render
  branch.
- `window.confirm()` (delete confirmations) is unaffected and out of scope
  — the user's ask was specifically about *data entry* popups, not
  yes/no confirmations, which are a different interaction (a decision,
  not a value) and weren't named in the request.

## Related packs / ADRs

`docs/adr/0018-lightweight-rich-text.md` (the Link button this ADR also
converts was added as part of the Phase 11 external-links work, in the
same session, before this rule was stated as a general one).

## 2026-07-08 addendum: optional multi-field support

Direct follow-up: the Link button should ask for a link *description* as
well as the URL, and display that description — not just clicking "insert"
with an empty or manually-typed label.

`openInlinePrompt(kind, opts)` gained an optional `opts.fields` array
(`{key, label, placeholder, value}[]`). Nine of the ten kinds still pass a
flat `label`/`placeholder`/`value` and get exactly the original one-field
behavior — `openInlinePrompt` synthesizes a one-item `fields` array under
a fixed `'value'` key internally, so none of those call sites or
`commitInlinePrompt`'s existing branches (which read `values.value`)
needed to change. Only `ext-link` now passes an explicit two-item array
(`label`, then `url`); `commitInlinePrompt` reads `values.label`/
`values.url` for that one kind. `renderInlinePrompt` loops the array
instead of assuming one input; Enter/Escape (`onKeydown`) match on the
now-plural `[data-inline-prompt-field]` selector so either field submits
or cancels the whole prompt, not just a first/only one.

Submitting now calls a new `insertExtLinkMarkup(field, range, label, url)`
instead of reusing `wrapSelectionWithMarkup` — a real, distinct operation,
not a cosmetic rename: `wrapSelectionWithMarkup` wraps whatever text is
*already selected* with fixed open/close markers, which only ever worked
because the old flow had no separate description input (the selection
itself was the label, or the field opened empty needing a manual inline
edit). Now that the GM types a description into its own field, that string
may not match the original selection at all — or a link might be inserted
with no selection to begin with — so `insertExtLinkMarkup` always replaces
whatever `range` covered with the literal `[label](url)` text. As a
convenience default (not a requirement), a real selection's text still
pre-fills the description field, matching the "select text, then link it"
gesture other editors use — editable before submit, same as any other
field's starting value.
