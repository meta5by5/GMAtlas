# ADR 0005 — The one-slot localStorage backup write is best-effort, not fatal

## Status

Accepted

## Context

`src/core/store.js`'s `persist()` is the only function in the app that
touches `localStorage` (rule 2 in `CLAUDE.md`). Before every save, it wrote
a full copy of the *previous* campaign document to a one-slot backup key
(`sagaatlas.campaign.backup`), then wrote the new document to the real key
(`sagaatlas.campaign`). Both writes lived inside one `try/catch`: if either
one threw, the whole save was treated as failed and rolled back.

This was fine while a campaign stayed small. Once a campaign's serialized
size crossed roughly half of `localStorage`'s per-origin quota (commonly
hit by embedding uploaded PDFs as base64 data URLs — the exact case
`MAX_DOC_UPLOAD_BYTES` already guards against for a *single* oversized
upload, but not against several moderate ones accumulating), the backup
write — which momentarily needs quota for both the outgoing and incoming
copies of the campaign at once — started throwing `QuotaExceededError`
before the real save ever ran. Because that error was fatal, **every**
subsequent save silently failed, not just the backup: clicking to select a
Cast entity, editing a field, anything that calls `store.update()`.

Confirmed via a live user report (`Failed to execute 'setItem' on
'Storage': Setting the value of 'sagaatlas.campaign.backup' exceeded the
quota`, initially observed as "filtering the Cast list works, but selecting
an entity does nothing") and reproduced deterministically: forcing only
the backup key's `setItem` to throw, while leaving the real campaign key's
write to succeed, reproduced the exact symptom — and confirmed selecting
an entity now succeeds (and survives a reload) once the backup write is no
longer allowed to block it.

A second, structural cause fed into this before this ADR's fix: `ui/
shell.js`'s delegated click/change/input/dblclick handlers all call
`store.update()` bare, with no `try/catch` at the call site. When
`persist()` threw, the exception propagated out of the handler with no
visible feedback — the state visibly rolled back via `notify()`'s
re-render, so a failed interaction looked exactly like a click that did
nothing. That part is fixed separately (a `guarded()` wrapper around the
one delegated-listener registration point, `ui/shell.js`), and stays
useful regardless of this ADR — it surfaces any future handler failure,
not just this one.

## Decision

`persist()`'s backup write is now wrapped in its own `try/catch`,
independent of the real save:

- If writing the backup throws, log a warning and continue — **do not**
  treat it as a failed save.
- The real campaign write (`STORAGE_KEY`) still runs, and its own
  success/failure is what `persist()`'s return value reflects.

No UI currently reads `BACKUP_KEY` back (verified: no restore action is
wired to it anywhere in `src/ui/`) — it exists as a safety net for a
future one-slot restore feature (see `PROGRESS.md`'s flagged UI/UX
assumption on in-session undo), not an active feature today. A skipped
backup costs nothing right now; a blocked real save costs everything.

## Alternatives Considered

- **Shrink or evict the backup before writing it** (e.g., only keep a
  backup under some size threshold, or delete `BACKUP_KEY` first to free
  its slot before writing the new one). Rejected for now: doesn't fully
  solve the problem (a large-enough campaign still can't hold two
  copies, backup or not), and adds complexity for a key nothing reads yet.
  Worth revisiting *if* a real restore-from-backup feature gets built and
  the one-slot design needs to get smarter about size.
- **Drop the backup mechanism entirely.** Rejected — it's cheap insurance
  when it fits, and pack 66's storage-reliability priority (`docs/adr/0001`)
  argues for keeping a safety net where one exists, not removing it because
  it doesn't always fit.

## Consequences

- Saves succeed for campaigns that would have fit before this bug started
  silently blocking them — no data loss from this bug going forward.
- A campaign large enough to make the backup skip becomes a one-way
  street until it shrinks (documents removed, etc.) — there's no longer a
  redundant previous-version copy to fall back to for saves made while
  skipping. This is judged acceptable: the real save always matters more
  than the backup of the previous one.
- This doesn't raise the *ceiling* on campaign size — a campaign that
  itself doesn't fit in one copy will still fail to save, and still throws
  (correctly) so `guarded()` can surface it. This ADR only removes the
  *self-inflicted* halving of that ceiling from keeping two copies.

## Related Packs

Pack 66 (storage reliability, ranked above recommendations/UX/integrations/
new features in priority) and Article VIII of the Constitution ("campaign
data is sacred", `docs/adr/0001`) — a silent save failure is exactly the
kind of violation Article VIII exists to rule out.
