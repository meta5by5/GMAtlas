> Rejected-alternatives companion to
> `docs/adr/0020-reference-toc-generation.md` — split out 2026-07-23 per
> `docs/adr/0042-design-doc-consolidation.md`'s ADR-cleanup extension, so
> the live ADR reads as pure accepted architecture. This file is never
> itself a decision record; it holds the "what was considered and
> rejected, and why" detail for the ADR above, preserved verbatim rather
> than deleted.

# ADR 0020 — Rejected alternatives

## From "Alternatives Considered"

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

## Rejected option narrated inline in Context/Decision

The live ADR's Decision section, describing the per-upload trigger,
originally ended: "...accepting scans just that one document
(`{onlyDoc: {title, source: dataUrl}}`), matching the user's explicit
"prompt the user... for the choice" answer **rather than firing
silently**." The live ADR now states only that the confirm prompt matches
the user's explicit answer; the rejected alternative (scanning
automatically and silently, with no `window.confirm` gate) — bolded above
— lives here.
