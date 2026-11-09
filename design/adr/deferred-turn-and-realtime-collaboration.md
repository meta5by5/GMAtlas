# Deferred: TURN relay and real-time collaboration

**Status:** Deferred (2026-11-08), by the owner's decision. Nothing here is
built beyond what "Where it stands" lists. This ADR is the plan to pick up
from; it supersedes the build order in `design/ACCOUNTS-SYNC-ROADMAP.md` for
these items (the roadmap's S5 and the co-editing part of S6 point here).

## Context

S0–S3 are built: accounts, personal sync of one user's campaigns and
settings across their own devices, and device-to-device document transfer.
Two pieces were next in line:

- **A TURN relay for device-to-device transfer** (decision D7). Transfers
  need a direct path between the two devices today; a relay would carry the
  encrypted stream when there's none (a phone on mobile data, strict NATs).
- **Real-time collaboration:** more than one person in a campaign at once.
  That is multiplayer tables (roadmap S5: players, reveal-to-table,
  invites, roles, rolls and chat, full presence) and, later, co-typing in the
  same long text field (the Yjs escape hatch, roadmap 5.1/5.3, S6).

Both are postponed. The TURN relay needs a Cloudflare Realtime key and
ongoing bandwidth, and direct connections cover the common case (two devices
on the same network). Collaboration is the largest remaining phase, and the
single-GM product (sync, documents, store) is the priority; S4 store and
billing goes first, built provider-neutral.

## Decision

1. Neither is built now. Nothing in the app suggests otherwise:
   - the help article says transfers need the two devices to reach each
     other directly, and a failed connection says it couldn't connect;
   - the `tables` feature stays off by default and gates nothing;
   - no help article promises either.
2. The groundwork already in place stays. It is load-bearing for the plan
   below, and none of it costs anything while unused.
3. When either resumes, it follows the plan below, and this ADR is edited
   in place to say what was built (then retitled, not layered with notes).

## Where it stands

**TURN, already wired end to end except the key:**
- `server/src/p2p.js` `GET /api/p2p/ice` returns Cloudflare STUN, plus
  short-lived TURN credentials (4 h, minted per request through the
  Realtime API) only when `TURN_KEY_ID` and `TURN_KEY_API_TOKEN` are set.
- The client (`core/p2p.js`, `domain/blobTransfer.js`) already uses
  whatever servers it's given, and "Direct connections only" (per device,
  Account › Sync) already strips relays at both ends (`iceConfig`,
  `stripRelayCandidates`).
- Tested with a fake relay in the two-browser smoke run.

**Collaboration, groundwork only:**
- One encrypted campaign room per campaign (Durable Object, hibernating
  sockets) with a single `gm` partition, a seq-ordered op log, catch-up,
  snapshots and acks (`design/adr/personal-sync.md`).
- Per-field last-writer-wins merge on hybrid logical clocks, exhaustively
  tested for convergence (`domain/syncOps.js`).
- Conflict chips for an edit that lost a race; holding remote changes while
  a field has focus.
- Presence-lite: which of the owner's devices have the campaign open.
- `syncPolicy.js` already names the `table` and `player` scopes, chosen per
  record by a future `visibility` field.
- The `tables` feature flag exists (`data/features.js`, default off, phase
  S5).
- Campaign keys are per campaign, not per account, so a campaign can be
  shared without sharing the vault.

## Plan: TURN relay (small; about a day)

Preconditions: a Cloudflare Realtime TURN key (dashboard › Realtime › TURN
Server › Create; the deploy login's OAuth scopes can't create one), and
accepting TURN bandwidth past the free monthly allowance.

1. `npx wrangler secret put TURN_KEY_ID` and `TURN_KEY_API_TOKEN`, dev
   first; production only with a release.
2. Verify on dev from two real devices on different networks (a phone on
   mobile data and a desktop): the transfer connects, and Account › Sync
   says a relay may be used; with "Direct connections only" on, the same
   pair fails with the direct-only message.
3. Disclosure (D7): Account › Sync and the "syncing devices" help article
   say that a relay may carry the encrypted stream when a direct path
   fails, and that it can't read it. Put the relay sentences back in both
   places then (they were rewritten to "needs a direct connection" when
   this was deferred).
4. Admin: a usage line (TURN credentials minted per day) so the bill can't
   surprise. Optional: a per-account daily cap on credential requests.
5. Production: set the secrets with `--env production` during a release.

Acceptance: a transfer between two devices that can't reach each other
directly succeeds through the relay, byte for byte; "Direct connections
only" still guarantees no relay at either end.

## Plan: real-time collaboration (large; roadmap S5, then S6 co-typing)

Preconditions: S4 settled (tables are a paid feature, `tables.maxPlayers`
comes from a product), and a decision on whether players need their own
accounts (the roadmap says yes: sign-in, then join).

Build in this order; each step lands with pure domain tests first, then a
thin UI and a multi-browser headless run, like S2 and S3.

1. **Visibility in the domain** (`domain/visibility.js`, pure).
   - A `visibility: 'gm' | 'table'` field on entities, journal entries and
     scenes. It defaults to `gm` and migrates as absent = `gm`, so nothing
     is ever shown by accident.
   - `projectTable(campaign)` produces the table partition's document:
     revealed records with `revealedFrom` ids, the current scene, the
     public journal and the party sheet.
   - "Reveal to table" and "Hide" controls. Hiding writes a tombstone to
     `table`.
   - Tests: nothing GM-only ever appears in the projection, field by field.
2. **Partitions in the room.**
   - `gm`, `table` and `player:<uid>`, each with its own seq, op log,
     snapshots and AES-GCM key.
   - A write ACL per partition, enforced by the room from the membership
     row on every push: players write only `player:<self>` and the
     `table/rolls` and `table/chat` subpaths.
   - The wire protocol gains the partition name, as roadmap 5.4 specifies.
3. **Membership, invites and keys.**
   - Server: the `memberships` and `invites` tables (roadmap section 10).
   - "Share table" makes a link or 8-character code with a role (co-GM,
     player, viewer), an expiry and a use limit.
   - Joining wraps the `table` key, and the player's own `player:<uid>`
     key, to the player's devices. This is the device key pairs from S2,
     extended across accounts.
   - Removing a member rotates the `table` key.
   - The seat limit (`tables.maxPlayers`) is enforced at `hello`.
4. **Player mode.**
   - The same bundle renders from the `table` projection, with GM-only
     panels hidden.
   - The player gets a character sheet in their own partition, and their
     asks to the GM.
   - This is a profile of the existing UI, not a second app.
5. **Rolls and chat.**
   - Seq-ordered `table/rolls` and `table/chat` streams.
   - Rolls stay real randomness on the roller's device, and only the result
     syncs (Known non-issues: never deterministic).
6. **Full presence.**
   - Avatars showing who's in the campaign and which panel or entity each
     person has open.
   - A soft "*Sam* is editing" marker on an entity card; no hard locks.
   - Presence is ephemeral room frames, never stored.
7. **Documents across accounts** (roadmap 6.4).
   - The GM's "Share with table" on an uploaded document issues transfer
     tickets; the signalling relay pairs two accounts' devices only for a
     ticketed blob.
   - A third-party sourcebook (any `LICENSES[*].docs` key) never crosses
     accounts. `blobTransfer.servableKeys` must stop offering book keys to
     another account's device.
8. **Co-typing the same long text field (S6, only if real use asks for
   it).**
   - Vendored Yjs (like PDF.js), used only for fields flagged
     `text: 'collab'` in `syncPolicy.js` (journal entries, scene summary,
     notes). The campaign doc stays the source of truth: a field's text is
     the Y.Text's string, and its updates travel as ops on that one path.
   - Until then, concurrent edits to one long field keep both versions with
     a merge chip, as today.
9. **Hardening (S6).**
   - Load tests: 50 concurrent tables, 6 players each.
   - Key rotation after a revoke.
   - Abuse limits on invites and chat.
   - An admin view of tables (member counts, force-close).

Acceptance (from the roadmap and the wiki brief's criteria):
- A player sees a revealed NPC and never an unrevealed one, nor any GM
  note. This is checked by a test that scans everything the player's
  devices receive.
- Two players' rolls appear in the same order on every screen.
- Removing a player cuts them off at once, and they can't read anything
  written after.
- A GM and a co-GM editing different fields at once both keep their edits;
  editing the same field shows a chip, never a silent loss.
- The seat limit is refused at join, with a message.

## Consequences

- Device-to-device transfer works only where the two devices can reach each
  other directly; the help article says so. "Direct connections only"
  stays in Account › Sync (it already keeps any future relay out), but
  changes nothing until a relay is configured.
- A campaign has one person in it at a time (on any number of their own
  devices). The `table`/`player` scopes and the `tables` flag stay unused.
- Nothing built since S0 needs undoing to resume: the room, the merge, the
  per-campaign keys and the policy scopes were all shaped for this.
- Until step 7 exists, sourcebooks can travel only between one account's
  devices; S5 must close that before any cross-account pairing ships.
