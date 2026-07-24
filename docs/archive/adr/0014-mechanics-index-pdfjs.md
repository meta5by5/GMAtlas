> Rejected-alternatives companion to `docs/adr/0014-mechanics-index-
> pdfjs.md` — split out 2026-07-23 per `docs/adr/0042-design-doc-
> consolidation.md`'s ADR-cleanup extension, so the live ADR reads as pure
> accepted architecture. This file is never itself a decision record; it
> holds the "what was considered and rejected, and why" detail for the ADR
> above, preserved verbatim rather than deleted.

# ADR 0014 — Rejected alternatives

## From "Alternatives considered"

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
