> Rejected-alternatives companion to `docs/adr/0028-multiuser-access-and-
> cloud-sync.md` — split out 2026-07-23 per `docs/adr/0042-design-doc-
> consolidation.md`'s ADR-cleanup extension, so the live ADR reads as pure
> accepted architecture. This file is never itself a decision record; it
> holds the "what was considered and rejected, and why" detail for the ADR
> above, preserved verbatim rather than deleted.

# ADR 0028 — Rejected alternatives

## From "Alternatives Considered"

- **Slot this in as the next committed phase**, same treatment as
  Phase 10/11. Rejected per direct user choice this session — the scope
  and irreversibility (once campaigns live in a shared backend with
  auth, walking that back is much harder than reverting a drawer) argue
  for a dedicated decision pass first.
- **Silently fold "Supabase sync" into the existing Sync Adapter
  backlog bullet** (`PROGRESS.md`'s "blocked on a decision about what
  backend to sync to" item) without flagging the auth/multi-tenancy
  half. Rejected — the request bundles a full public multi-user product
  (auth, dashboard, landing page, tiered access) with the sync backend
  choice; treating it as "the sync backend question is now answered,
  ship it" would understate how much else the multi-user half implies.

## Rejected option narrated inline in the original Context section

The live ADR's Context section originally read: "Recording that plainly,
rather than quietly slotting "add Supabase sync" into the same backlog as
the next drawer, is what this ADR is for — matching this repo's own
convention (`CLAUDE.md`: "when a design choice is ambiguous... write a
short ADR" for "a persistence-behavior change") of writing down a real
fork explicitly instead of discovering it mid-implementation." The live
ADR now states the same rationale without the "rather than quietly
slotting..." comparison; that rejected alternative is the same one
formally rejected under "Alternatives Considered" above (the "silently
fold into the Sync Adapter backlog" bullet).
