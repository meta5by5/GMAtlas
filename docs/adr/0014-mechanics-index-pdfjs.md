# ADR 0014 — Game Mechanics Index: real PDF text scanning via vendored PDF.js

## Status

Accepted and implemented (2026-07-06), per `docs/adr/next-request.md`'s
2026-07-05/06 batch: "include a predetermined or automated creation of the
PDF and page number linked in the Guide as a table of contents for all of
the game mechanics such as strain, Supply, Momentum, etc.," plus "a button
in Settings for refreshing the items per active game system." The user was
asked directly whether to build this as a hand-curated data file or real
PDF text/page scanning, and chose the latter, explicitly accepting the
cost: a new client-side runtime dependency, breaking this app's default
zero-dependency-shipped-app policy (CLAUDE.md's Environment constraints).
This ADR records that carve-out and what it actually took to make work.

## Context

This app has no PDF text-extraction capability anywhere before this
feature, and is built around one hard constraint (`scripts/build.js`'s own
header comment): it must run by double-clicking `index.html` over `file://`
with no server, because `file://` blocks `<script type="module">` via CORS.
That constraint shaped every decision below, including one the team
(the user and I) got wrong on the first pass and had to correct after
testing against real files.

## Decision

**Vendor PDF.js's legacy UMD build, loaded as a classic script.**
`assets/vendor/pdfjs/pdf.min.js` + `pdf.worker.min.js` (pdfjs-dist 3.11.174,
Apache-2.0, license header preserved in the minified file) are checked into
the repo — not an npm dependency of the shipped app, no bundler involvement
— and loaded via a plain `<script src="./assets/vendor/pdfjs/pdf.min.js">`
tag in `index.html`, before the app bundle. A classic (non-module) script
isn't subject to the CORS restriction that motivated `scripts/build.js` in
the first place, so this needed zero bundler changes. It exposes
`window.pdfjsLib`.

**A real, separate architectural layer, not a domain module.** The scan
itself (`src/ui/mechanicsScan.js`) is inherently async and browser-only —
it can't live in `src/domain/` per this repo's rule 3 (pure, synchronous,
DOM-free). Only the plain-data result gets stored, via a genuinely pure
`src/domain/mechanicsIndex.js` (`getMechanicsIndex`/`setMechanicsIndex`,
tested headlessly in `tests/domain.test.js`) — the scan itself isn't
unit-tested (same honest caveat this repo already applies to Playwright:
no headless-PDF-rendering test harness exists here).

**`file://` cannot actually run this feature — discovered during
verification, not assumed up front.** The plan going in assumed the only
`file://` obstacle was the well-known "Chromium refuses to construct a
`Worker` from a `file://` origin" restriction, worked around by leaving
`GlobalWorkerOptions.workerSrc` unset so PDF.js self-selects its in-thread
"fake worker" fallback — verified working exactly as expected. But a
**second, more fundamental** restriction surfaced under real testing:
Chromium treats a `file://` page's XHR/fetch to another `file://` resource
as a cross-origin request from a "null" origin and blocks it outright, with
no client-side fallback (confirmed via a real browser smoke test, not
inferred) — this affects reading the PDF's bytes at all, before the Worker
question ever comes up. `scanMechanicsIndex()` now checks
`location.protocol === 'file:'` up front and throws one clear, actionable
error ("PDF scanning needs the app served over http(s) — run `npm run
serve`") instead of attempting and failing per PDF with N console CORS
errors and a confusing silent "0 terms found." Verified end to end:
`file://` now fails fast with zero console errors and a clear toast;
`http://localhost:8080` (`npm run serve`) completes a real multi-PDF scan
and produces clickable results.

**This is a real, narrow gap in an otherwise `file://`-first app** — every
other feature still works by double-clicking `index.html`; only the
Mechanics Index scan itself needs `npm run serve`. Settings' description
text says so plainly rather than leaving a GM to discover it via a failed
click.

**"Per active game system" scoping is a title-substring heuristic.**
`relevantDocs()` always includes Hostile-titled PDFs (this app's default
setting) plus whichever Reference Library PDF's title matches the active
`settings.statRuleset`'s provider label (`data/rulesConstitution.js`'s
`rulesetId` join) — falling back to scanning every PDF if the heuristic
matches nothing, so an unusual ruleset never silently scans zero documents.
Not exhaustive by design; a GM who wants a specific PDF scanned regardless
can already get it included by that same title match.

**Results reuse the existing document-viewer tab mechanism**, not a raw
`<a href>` new-tab link — a Mechanics Index entry is rendered as a
`data-doc-open="ref:<file>"` + `data-doc-open-page="<N>"` link, the exact
same click target a `@[Doc Name#12]` Guide/Journal mention already
produces, so clicking a term opens inline in this app's own PDF viewer tab
instead of a new browser tab.

**A curated term seed list** (`data/mechanicsTerms.js`, ~20 entries: Strain,
Supply, Momentum, Stress, Heat, Vow, Bonds, Faction Turn, ...) rather than
an open-ended dictionary scan — matches the request's own framing ("terms
like strain, Supply, Momentum, etc.") and keeps a scan's runtime bounded
(it stops looking for a term the moment it's found once, across all pages
of all in-scope PDFs).

**One bundler gap found and fixed along the way**:
`scripts/build.js`'s export-rewriting regex only recognized `export
function`/`export const`, not `export async function` — `scanMechanicsIndex`
was this repo's first async named export written as `export async function`
rather than the `export { name }` aggregate form every prior async export
used. Fixed by extending the regex (`scripts/build.js`, one line) rather
than rewriting the new code to dodge it, since the aggregate-export
workaround would have been a real backward-compat trap for the next
contributor to hit the same wall.

## Alternatives considered

- **Hand-curated data file, no PDF.js** (the alternative actually offered).
  Zero new dependencies, works identically under `file://` and `http://`,
  but page numbers go stale the moment a referenced PDF is replaced/
  re-paginated, and never improves without manual upkeep. Rejected per the
  user's explicit choice, with the tradeoff named up front.
- **`disableWorker`-style getDocument option** to force main-thread parsing
  uniformly. Not present as a documented option in the vendored pdfjs-dist
  version's API; the unset-`workerSrc` fallback achieves the identical
  behavior through PDF.js's own built-in fallback path, verified working.
- **Building the Mechanics Index at `npm run build` time** (Node-side,
  alongside `docsManifest.js`'s own generation, which already reads
  `assets/docs/` from the filesystem with no CORS concern at all). This
  would sidestep the `file://` restriction entirely. Not chosen for this
  pass because the request specifically asked for a **Settings button** a
  GM presses at will, which a build-time-only artifact can't offer — but
  it's a reasonable future direction if the `http://`-only requirement
  proves too limiting in practice; flagged here rather than silently
  discarded.

## Consequences

- A GM running purely via `file://` double-click sees a clear one-line
  explanation instead of a working feature — this is a real, narrow
  regression relative to "everything works over file://," scoped to
  exactly one feature and clearly communicated, not silently broken.
- `assets/vendor/pdfjs/` (~1.5MB total, two files) is now a permanent,
  version-pinned exception to the zero-runtime-dependency policy. CLAUDE.md's
  Environment constraints section is updated to point here rather than
  silently drift out of sync with what the code actually does.
- The curated term list and title-substring doc-scoping heuristic are both
  ordinary data, not mechanism — either can grow without touching
  `ui/mechanicsScan.js`.

## Related packs / ADRs

CLAUDE.md's "The bundler — why it exists, and the one gotcha" section (the
same `file://` CORS reasoning this ADR's `file://` finding extends one
layer further); ADR 0007 (Git LFS for Reference Library PDFs — the same
`assets/docs/` this feature reads).
