> Rejected-alternatives companion to `docs/adr/0018-lightweight-rich-text.md`
> — split out 2026-07-23 per `docs/adr/0042-design-doc-consolidation.md`'s
> ADR-cleanup extension, so the live ADR reads as pure accepted
> architecture. This file is never itself a decision record; it holds the
> "what was considered and rejected, and why" detail for the ADR above,
> preserved verbatim rather than deleted.

# ADR 0018 — Rejected alternatives

## From "Alternatives Considered"

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
