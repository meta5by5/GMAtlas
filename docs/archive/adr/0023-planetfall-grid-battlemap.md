> Rejected-alternatives companion to
> `docs/adr/0023-planetfall-grid-battlemap.md` — split out 2026-07-23 per
> `docs/adr/0042-design-doc-consolidation.md`'s ADR-cleanup extension, so
> the live ADR reads as pure accepted architecture. This file is never
> itself a decision record; it holds the "what was considered and
> rejected, and why" detail for the ADR above, preserved verbatim rather
> than deleted.

# ADR 0023 — Rejected alternatives

## From "Alternatives Considered"

- **SVG or `<canvas>` pixel rendering** for the map surface. Rejected in
  scoping — absolutely-positioned DOM elements let placement/dragging
  reuse this app's existing HTML5 DnD system directly; SVG would need its
  own drag-node logic distinct from the relationship graph's (which
  re-runs a force layout on drag, not free placement), and `<canvas>`
  would need hand-built hit-testing, drag handling, and tooltips instead
  of native DOM element events.
- **A new mousedown/mousemove/mouseup drag-threshold system** for
  repositioning placed icons (to distinguish a click from a drag).
  Rejected — native HTML5 `draggable` plus a plain click already coexist
  correctly on the same element elsewhere in this codebase (Cast's entity
  rows), so reusing that proven combination needed no new interaction
  primitive at all.
- **A real drag gesture for placing annotation icons from the palette**
  (matching how tokens are placed from Cast). Rejected — click-to-arm-
  then-click-to-place is simpler to build, is friendlier on touch devices
  (no drag gesture at all), and there's no benefit to a third drag-source
  type when the two-click alternative is strictly easier for both the
  code and the GM.
- **A separate, parallel image-upload path for map backgrounds** instead
  of the Gallery. Rejected per the scoping decision — one image pipeline
  for everything (thumbnails, tokens, and now backgrounds) is simpler to
  maintain than a second one, and a battlemap background genuinely
  benefits from being resizable/reusable the same way any other Gallery
  image is.
- **A fixed, non-toggleable grid always drawn over every map.** Rejected
  — the original ask's own placement description ("freeform... not grid-
  locked") reads as the grid being a visual reference only, and making it
  optional (rather than mandatory) costs nothing while directly serving
  the scoping decision to design this as shared groundwork for Interactive
  Maps' own planned grid/hex overlay with snap-to-grid.
