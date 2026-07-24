> Rejected-alternatives companion to `docs/adr/0015-indexeddb-
> persistence.md` — split out 2026-07-23 per `docs/adr/0042-design-doc-
> consolidation.md`'s ADR-cleanup extension, so the live ADR reads as pure
> accepted architecture. This file is never itself a decision record; it
> holds the "what was considered and rejected, and why" detail for the ADR
> above, preserved verbatim rather than deleted.

# ADR 0015 — Rejected alternatives

## From "Alternatives considered"

- **Postgres + a server backend.** Rejected — see Context above. Solves a
  problem (a storage ceiling) with a solution sized for a different one
  (no shared backend at all), at the cost of this app's defining
  local-first/offline/zero-server properties.
- **Rewrite every `store.update()` call site to `async`/`await`.**
  Technically the "purest" async design, but would have touched ~100
  call sites across `ui/shell.js` for no behavioral gain over the
  optimistic-update-then-async-persist approach actually chosen — the
  in-memory-first design gives identical instant UI feedback with a much
  smaller, lower-risk diff.
- **Drop the one-slot backup entirely**, reasoning that IndexedDB's much
  bigger quota makes running out of room to double-write unlikely. Kept it
  instead — it costs little now that quota isn't scarce, and it's the
  existing restore-backup UI's only data source.

## Rejected option narrated inline in the original Context section

The live ADR's Context section originally read: "The user's proposed fix —
a Postgres database plus a migration path — was evaluated and rejected as
disproportionate: **it would require a running server (breaking
"double-click `index.html`, works offline," this app's defining
constraint), user accounts/auth, hosting, and an online/offline
sync-conflict strategy, none of which the actual problem (a storage quota,
not a lack of a network backend) needs.** `IndexedDB` was chosen instead
and verified directly before committing to it..." The live ADR now states
only that the Postgres/migration proposal was evaluated and rejected as
disproportionate to the actual problem; the detailed comparison against
that rejected alternative (bolded above) lives here.
