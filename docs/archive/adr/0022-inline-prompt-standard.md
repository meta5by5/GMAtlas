> Rejected-alternatives companion to
> `docs/adr/0022-inline-prompt-standard.md` — split out 2026-07-23 per
> `docs/adr/0042-design-doc-consolidation.md`'s ADR-cleanup extension, so
> the live ADR reads as pure accepted architecture. This file is never
> itself a decision record; it holds the "what was considered and
> rejected, and why" detail for the ADR above, preserved verbatim rather
> than deleted.

# ADR 0022 — Rejected alternatives

## From "Alternatives Considered"

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

## Rejected option narrated inline in Context/Decision

The live ADR's Decision section, describing the no-close-on-blur choice,
originally ended: "Deliberately **no** close-on-blur — the input losing
focus to its own ✓/✕ buttons is a classic blur-before-click race, and
skipping close-on-blur entirely sidesteps it **rather than working around
it with a timer** (which this app's architecture already treats as
something to avoid)." The live ADR now states only that close-on-blur was
deliberately skipped to sidestep the race; the rejected alternative
(handling the same race with a timer-based workaround instead) — bolded
above — lives here.
