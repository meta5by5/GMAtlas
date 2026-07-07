# ADR 0020 — Reference Library Table of Contents generation from real PDF bookmarks

## Status

Implemented (2026-07-06), on direct user request (`docs/adr/next-request.md`'s
"USER CHANGES" batch, "DOC MANAGEMENT" section).

## Context

The user asked for a one-time-or-ongoing feature: "extract tables of
contents with links to the pages referenced for each doc in the library
and generate a Guide entry... create the table of contents with page
links on each addition of a new document." This app already has one
PDF.js-backed scanning feature — the Game Mechanics Index (`docs/adr/0014-
mechanics-index-pdfjs.md`, `ui/mechanicsScan.js`) — but it does a full-text
search for curated terms; PDF.js's `getOutline()` (its native bookmark/
table-of-contents API) is never called anywhere in this app before this
ADR. This is new integration, not a reuse of existing outline code.

Per direct clarification, the feature needed to run two ways: a manual
Settings button (rescanning the whole library, matching Mechanics Index's
existing non-incremental "replace the whole result" shape) **and**
automatically per upload — but gated behind a `window.confirm` prompt at
upload time, not silent or fully automatic.

## Decision

**Layering** (same domain/ui split `mechanicsIndex.js`/`mechanicsScan.js`
already established, for the same reason — a real PDF scan is async and
browser-only, which architectural rule 3 forbids in `src/domain/`):
- `ui/tocScan.js` — the async PDF.js half. `scanAndGenerateToc(store,
  {onlyDoc})` walks a PDF's `getOutline()` tree (recursively, depth-
  tagged), resolving each entry's `dest` (a named destination needing
  `getDestination()`, or an explicit destination array already) to a real
  page number via `getPageIndex()` — 0-based, +1'd to match this app's
  existing 1-based `@[Title#N]` mention convention (confirmed against
  `mechanicsScan.js`'s own 1-based page loop). Shares that module's
  one-time PDF.js worker setup (`configureWorker`, now exported) and its
  `file://` restriction (Chromium blocks a `file://` page from reading
  another `file://` resource's bytes — this feature needs `npm run
  serve`, exactly like Mechanics Index).
- `domain/toc.js` — pure, testable, no PDF.js/DOM: `buildTocText(entries,
  docTitle)` turns one document's flat, depth-tagged outline entries into
  this app's existing lightweight list markup (ADR 0018) — one `- ` bullet
  per entry wrapping a real `@[Title|DocTitle#Page]` mention, with depth
  conveyed by a repeated em-dash prefix INSIDE the bullet's text rather
  than true nested lists (this app's list renderer is intentionally one
  level deep; a rulebook's 3-4 level bookmark tree still reads fine this
  way). `generateReferenceToc(campaign, scanResults)` find-or-creates a
  top-level "Table of Contents" Guide doc, then for each scanned document
  with at least one resolved bookmark, find-or-creates a CHILD doc by
  title under it and overwrites its text — idempotent: re-running updates
  in place instead of duplicating, matching Mechanics Index's own
  "full rescan, replace" precedent. A document with no bookmarks is
  skipped, not written as an empty Guide doc.

**Manual trigger**: a Settings "📑 Generate Reference Table of Contents"
button (`tocSection`, `drawers/index.js`, mirroring `mechanicsIndexSection`'s
exact button/status-line shape) scans the WHOLE combined library —
Reference Library PDFs (`assets/docs/`) plus any uploaded `'file'`-kind
document — every time.

**Per-upload trigger**: right after a successful upload
(`shell.js`'s upload handler), for a `.pdf` file only, `window.confirm`
asks "Generate a Table of Contents entry for "<name>"?" — accepting scans
just that one document (`{onlyDoc: {title, source: dataUrl}}`), matching
the user's explicit "prompt the user... for the choice" answer rather than
firing silently.

## Alternatives considered

- **True nested Guide lists for a multi-level bookmark tree.** Rejected —
  this app's list renderer is deliberately one level deep (ADR 0018); the
  em-dash depth prefix conveys structure without needing a new nesting
  mechanism.
- **A live "Import" button seeding hardcoded content**, considered and
  rejected for the earlier 5PFH Guide-content ask (ADR 0018) for the same
  reason it doesn't apply here either — moot for THIS feature specifically,
  since the whole point is generating content from the GM's own PDFs, not
  shipping any fixed content in app code.
- **Scanning only the Reference Library**, matching the button's name
  literally. Rejected in favor of also including uploaded PDFs — "each doc
  in the library" (the user's own phrasing) reads as the combined library,
  not just the bundled reference set, and the per-upload path already
  needs to handle an uploaded file's bytes (a `data:` URL) directly, so
  supporting that source for the manual scan too was no extra work.

## Consequences

- A GM can generate a real, page-linked table of contents for any PDF with
  bookmarks — most professionally-typeset rulebooks have them — without
  hand-transcribing page numbers.
- A PDF with no bookmarks (common for scanned or hand-assembled documents)
  is silently skipped, not an error — the manual scan's toast reports how
  many were skipped so this isn't invisible.
- Like Mechanics Index, this one feature needs `npm run serve`; every
  other feature in this app still works over a plain `file://` double-click.

## Related packs / ADRs

`docs/adr/0014-mechanics-index-pdfjs.md` (the PDF.js integration and
domain/ui layering this mirrors); `docs/adr/0017-multi-doc-guide-tree.md`
(the Guide tree `createGuideDoc`/`setGuideDocText` this writes into);
`docs/adr/0018-lightweight-rich-text.md` (the list-markup format the
generated TOC content is written in).
