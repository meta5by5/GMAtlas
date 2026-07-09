# ADR 0028 — Multi-user public access + Supabase cloud sync (long-horizon, not started)

## Status

Proposed, long-horizon, **not started** — recorded per the user's
explicit choice (asked directly this session: commit this as next-phase
work, or record it as a separate initiative needing its own architecture
pass first — the user chose the latter). No code changes are implied by
this ADR; nothing should be built against it without a follow-up
decision session.

## Context

The request (`docs/adr/next-request.md`): Google authentication for
public access; a front-end dashboard to pick a campaign and manage
settings; a public landing page prompting login; a membership/access
framework gating individual modules (the base app, specific rules-system
content, the battlemap editor, etc.) per tier; and, separately, migration
to Supabase so a local instance auto-syncs in the background for
near-real-time multi-device access, with archival/restore designed to
minimize data loss from latency or storage issues.

This is not a feature addition — it's a different product shape than
what this repo currently is. `CLAUDE.md`'s Article VIII ("campaign data
is sacred") and its non-negotiable rule 2 ("Exactly one module touches
persistence... nothing else calls localStorage/indexedDB directly") were
written for, and have held for, a **static, local-first, zero-backend,
double-click-`index.html`, single-device-per-browser-profile** app. Every
non-negotiable rule in that file, and every ADR that's touched
persistence (0005's best-effort backup, 0015's IndexedDB migration),
assumed exactly one campaign document living in exactly one browser's
storage, with `store.js`'s synchronous `get()`/`update()` call shape
(~100-plus call sites in `shell.js` depend on updates applying
immediately, in-memory, before any network round trip). A hosted,
multi-user, authenticated, near-real-time-synced product is a genuine
architectural fork from that, not an extension of it.

Recording that plainly, rather than quietly slotting "add Supabase sync"
into the same backlog as the next drawer, is what this ADR is for —
matching this repo's own convention (`CLAUDE.md`: "when a design choice
is ambiguous... write a short ADR" for "a persistence-behavior change")
of writing down a real fork explicitly instead of discovering it
mid-implementation.

## Decision

**Recorded as intended, not committed.** This is real product direction,
not a hypothetical — but per the user's explicit choice, no
implementation starts until a dedicated architecture-decision session
resolves at least these questions (each has a real, non-obvious answer
this ADR doesn't presume):

1. **Source of truth.** Does the local IndexedDB document stay
   authoritative with Supabase as a best-effort background mirror
   (closest to today's guarantees — `store.update()` stays synchronous,
   offline play is fully unaffected, sync is additive), or does Supabase
   become authoritative with local storage demoted to a cache (a bigger
   change: `store.update()`'s synchronous contract would need to either
   become optimistic-with-reconciliation or actually change shape)?
   ADR 0015's IndexedDB migration is the closest precedent — it kept the
   sync call shape by making persistence itself the async part; the same
   pattern likely generalizes here, but that's a decision to make
   deliberately, not inherit by default.
2. **Conflict resolution.** Two devices editing the same campaign
   near-simultaneously need a real merge strategy. This app's domain
   layer is pure reducers over one whole-document snapshot — there is no
   field-level operational-transform or CRDT model anywhere in it today.
   Last-write-wins at the document level is the simplest option and may
   be acceptable for a mostly-single-GM-editing use case, but that's a
   real product decision (data loss on conflict vs. merge complexity),
   not a detail to default silently.
3. **Dependency posture.** A Supabase JS client would be this app's
   first genuine runtime dependency beyond the one explicit, version-
   pinned PDF.js exception (`docs/adr/0014`) — it would also mean the
   "any feature works from a plain `file://` double-click" guarantee no
   longer holds universally: an authenticated, synced campaign
   inherently needs network + a served origin (third-party auth
   providers don't work under `file://`). Whether that's scoped as "the
   whole app now assumes `npm run serve`/a real deploy" or "local-only
   mode keeps working exactly as today, sync is opt-in per campaign" is
   a real fork to decide, not an afterthought.
4. **Membership/tier gating.** Gating individual modules (rules-system
   content, the battlemap editor, etc.) behind an access tier needs a
   real entitlement model — this app currently has no concept of "this
   feature is unavailable" anywhere; every drawer/feature is unconditionally
   present. Scoping which features are ever gate-able, and where that
   check lives (client-only vs. server-enforced), is security-relevant
   (a client-only gate is trivially bypassable) and needs its own design.
5. **Auth provider scope.** "Google authentication" is one identity
   provider; whether that's the only one ever supported or a first
   instance of a broader auth system affects how much plumbing is worth
   building up front.

## Alternatives considered

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

## Consequences

- No code changes follow from this ADR by itself.
- The existing `PROGRESS.md`/`DESIGN-NEW-FUNCTIONALITY.md` "Sync adapter
  / shared campaign database — blocked on a decision" bullet is now
  answered on the *backend* question (Supabase) but still open on
  everything in the Decision section above — it should point here, not
  be marked done.
- If/when this gets picked up, expect it to start with its own
  architecture-decision ADR (analogous to ADR 0015's IndexedDB
  decision), not a jump straight to implementation.

## Related packs / ADRs

`docs/adr/0015-indexeddb-persistence.md` (the closest precedent for
changing persistence's async contract without breaking `store.js`'s
call-shape guarantees); `docs/adr/0014-mechanics-index-pdfjs.md` (this
repo's one prior exception to zero-dependency, and the `file://`
constraint it surfaced); `CLAUDE.md`'s Article VIII and non-negotiable
rule 2 (the local-first guarantees this ADR would need to deliberately,
not accidentally, change).
