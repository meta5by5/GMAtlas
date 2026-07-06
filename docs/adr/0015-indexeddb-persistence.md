# ADR 0015 — Persistence moved from localStorage to IndexedDB

## Status

Implemented (2026-07-06), on direct user request after a real save failure:
picking a Suggestion Lens chip threw `Setting the value of
'sagaatlas.campaign' exceeded the quota`. The user asked whether a full
Postgres backend + migration was the answer; this ADR records why that was
rejected in favor of a same-architecture, local-only storage swap instead.

## Context

`src/core/store.js`'s `persist()` writes the whole campaign document to a
single `localStorage` key on every `store.update()`. Browsers cap
`localStorage` at roughly 5-10MB per origin — small, and shared by the
entire document (not just one field), so a campaign with a few embedded
uploaded documents (base64'd directly into `campaign.json` — see
`domain/documents.js`'s `addDocument`) reaches it quickly. ADR 0005 already
made the one-slot backup write best-effort/non-fatal once this was first
diagnosed (2026-07-04), but that only protected against the backup
write's OWN doubled-copy requirement — it did nothing for a campaign whose
real, single copy is itself too large, which is exactly what happened
here: the error came from the PRIMARY write (`localStorage.setItem(
STORAGE_KEY, json)`), not the backup.

The user's proposed fix — a Postgres database plus a migration path — was
evaluated and rejected as disproportionate: it would require a running
server (breaking "double-click `index.html`, works offline," this app's
defining constraint), user accounts/auth, hosting, and an online/offline
sync-conflict strategy, none of which the actual problem (a storage quota,
not a lack of a network backend) needs. `IndexedDB` was chosen instead and
verified directly before committing to it (not assumed): a throwaway script
opened `gmatlas-test-db`, wrote a 1MB record, and read it back
successfully under both `file://` and `http://localhost:8080`, with
`navigator.storage.estimate()` reporting a ~3.2GB quota in this
environment — two to three orders of magnitude more headroom than
`localStorage`, using the exact same "no server, works offline, installed
as a PWA" architecture this app is built around.

A quick, independent stopgap shipped alongside this (not gated on it): each
uploaded document in the Documents drawer now shows an estimated size
badge, so a GM hitting this error today can immediately spot and
remove/relocate the large file without waiting on the storage migration.

## Decision

**`store.js` stays the only persistence module** — CLAUDE.md's
architectural rule #2 is reworded from "exactly one module touches
`localStorage`" to "exactly one module touches persistence," not repealed.

**`store.get()` stays fully synchronous.** It always reads an in-memory
`doc`, which remains authoritative regardless of backend. This is what let
the ~100 ordinary `store.update((d) => ...)` call sites across
`ui/shell.js` go completely untouched: `update()` still mutates `doc` and
calls `notify()` immediately (identical, instant UI feedback to before),
then persists to IndexedDB in the background. On the rare async persist
failure, it rolls `doc` back to the pre-mutation state and `notify()`s
again — unless a newer edit has already landed on top of this one, in
which case the newer edit is left alone rather than a stale rollback
clobbering it. Since there's no synchronous outcome to throw from anymore,
a new `store.onPersistError(fn)` subscription (parallel to the existing
`subscribe(fn)`) carries the failure to the UI; `ui/shell.js` wires it,
inside `mountShell()`, to the exact same "Couldn't save — ... Storage may
be full" toast wording the existing `guarded()` wrapper already used for a
synchronous throw. `guarded()` itself is unchanged and still catches
ordinary synchronous bugs — it just no longer happens to catch storage
failures, since those aren't synchronous exceptions anymore.

**Only the handful of call sites that already wanted a real, inline
success/failure signal became real `async` functions**: `store.import()`,
`store.restoreBackup()`, `store.newCampaign()`. Each already had explicit
error handling (a try/catch or a result-checking `if`); those call sites in
`ui/shell.js` now `await`/`.then()` them instead, with identical
user-facing wording. This was the deliberate scope boundary that kept the
migration a contained, mechanical change rather than an async rewrite of
the whole delegated-event-handler layer.

**Storage shape**: one IndexedDB database (`gmatlas`, version 1), one
object store (`kv`), two keys — `campaign` (the live document) and
`campaignBackup` (the one-slot pre-write backup ADR 0005 introduced).
IndexedDB stores structured-cloneable objects directly, so the manual
`JSON.stringify`/`parse` round-trip `persist()` used to do is gone entirely
(only `export()` still stringifies, for the JSON download).

**Migration is additive, never destructive (rule 5).** On first `load()`,
if IndexedDB has no `campaign` record yet, the exact pre-existing
localStorage + legacy-v0.53-key absorption logic
(`migrateDocument`/`migrateFromLegacyKeys`/`readLegacyKeys`, all untouched)
runs as a one-time fallback, and the result is written into IndexedDB. The
old `localStorage` keys are left in place afterward — never cleared, never
written to again — a free, zero-cost extra safety net now that IndexedDB's
quota isn't the constrained resource `localStorage`'s was. Verified via a
fresh browser context seeded with a legacy campaign in `localStorage`
before first load: the app picks it up, IndexedDB now holds it, the
original `localStorage` key is provably unchanged by a subsequent edit and
reload.

**`main.js`'s boot** (`store.load()` → `mountShell()`) is wrapped in an
async IIFE, not top-level `await` — the bundled output is a classic
`<script>`, not an ES module (`scripts/build.js`'s own reason for existing
at all), and classic scripts don't support top-level `await`.

**`storageInfo()` stays synchronous**, via an in-memory `backupMeta` cache
(byte size + exists) updated whenever a backup write completes, rather
than an async IndexedDB read on every Settings render. `campaignBytes` was
already computed from the in-memory `doc` and needed no change.

## Alternatives considered

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

## Consequences

- The specific failure that prompted this (`Setting the value of
  'sagaatlas.campaign' exceeded the quota`) is fixed at its root — verified
  directly with a 3MB Journal entry that would have failed under
  `localStorage`, saving successfully under both `file://` and `http://`.
- `store.js` is meaningfully more complex (real async control flow,
  IndexedDB's callback-based API wrapped in small Promise helpers) than
  the `localStorage.setItem` one-liner it replaced — an intentional,
  contained tradeoff given the size of the problem it solves.
- `store.js` still has no `node --test` coverage (it never did — it's
  inherently a browser-API module) and is verified via real-browser smoke
  tests, same as every other browser-only feature this session.
- IndexedDB is not literally unlimited — a pathological campaign could
  still, in principle, exceed it — but at ~1000x the old ceiling, this is
  no longer a realistic day-to-day concern the way the old 5-10MB limit
  was.

## Related packs / ADRs

ADR 0005 (best-effort backup write — the mechanism this ADR ports to
IndexedDB unchanged in spirit); CLAUDE.md's non-negotiable architectural
rule #2 (updated by this ADR, not violated) and its "bundler — why it
exists" section (the same file:// classic-script reasoning this ADR's
async-IIFE boot decision extends).
