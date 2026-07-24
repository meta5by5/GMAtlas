> Rejected-alternatives companion to `docs/adr/0033-mobile-responsive-tab-
> unification.md` — split out 2026-07-23 per `docs/adr/0042-design-doc-
> consolidation.md`'s ADR-cleanup extension, so the live ADR reads as pure
> accepted architecture. This file is never itself a decision record; it
> holds the "what was considered and rejected, and why" detail for the ADR
> above, preserved verbatim rather than deleted.

# ADR 0033 — Rejected alternatives

## From "Alternatives Considered"

- **Literally merging the document viewer into `openDrawers`/
  `renderDrawer()`.** Rejected — would require rewriting its iframe
  reload-guard logic for a real risk of regressing a previously-fixed bug,
  for no functional difference over the simpler mutual-exclusivity
  approach actually shipped.
- **Keeping the anchor panel but auto-collapsing it below some width.**
  Rejected per the direct instruction that anchored windows shouldn't be
  used "in favor of just tab groups" — a conditional anchor would still
  need all the same removal work for the case that actually matters
  (phone width) while adding complexity for the desktop case that doesn't.

## Rejected option narrated inline in the original Decision section

The live ADR's Decision section originally read, in the document-viewer/
main-drawer mutual-exclusivity paragraph: "This is a real, known
trade-off: while reading a document, the drawer tab-stack is temporarily
inaccessible (previously it stayed visible beside the viewer). Accepted
because documents already have their own multi-tab reading experience
(open several at once, switch, close), and the alternative — a real
literal merge of the viewer into `openDrawers`/`renderDrawer()` — would
require rewriting the iframe's own careful reload-guard logic
(`lastDocViewerSrc`, a past-fixed real bug around blank-then-reload
sequencing) for no functional gain toward "every tab fits the window"."
The live ADR now states the trade-off was accepted without repeating the
rejected-merge comparison (bolded above); it is the same alternative
formally rejected under "Alternatives Considered" above.
