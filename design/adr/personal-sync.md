# Personal sync: encrypted campaign rooms, a diffed sync base, device approval

**Status:** Accepted. Phase S2, first slice (S2a), of
`design/ACCOUNTS-SYNC-ROADMAP.md`. Built on the `server` branch, with its
core seams (`store.js`, `domain/syncCrypto.js`, `domain/syncOps.js` views)
on `main`.

## Context

S0 built the merge (`domain/syncOps.js`), and S1 built accounts. S2 makes
one user's campaigns the same on every device they sign in on. Decision D3
puts end-to-end encryption in from the first sync release, so a second
device can read nothing until key distribution works. That makes keys part
of the first slice, not a later one.

## Decision

1. **Keys** (`domain/syncCrypto.js`, pure WebCrypto; `core/syncKeys.js`
   holds them through `store.js`):
   - **Device key pair:** one ECDH P-256 pair per device. The private half
     is non-extractable and kept in IndexedDB (`syncKeys`, never synced).
     The public half is registered once with the server.
   - **Vault key:** one random 32-byte key per account.
     - It is wrapped to each approved device (ECDH-ES + HKDF + AES-GCM) and
       to a recovery key (HKDF + AES-GCM).
     - The recovery key is 20 random bytes as Crockford base32, shown once.
   - **Campaign key:** one random key per synced campaign, sealed with the
     vault key. It's per campaign so a table (S5) can share one campaign
     without the vault.
   - **Envelopes:** every op batch, snapshot and title is AES-GCM bound to
     its campaign id and purpose. The server stores only ciphertext,
     wrapped keys and metadata, titles included.
   - **The recovery key is emailed** to the account's address when sync
     is set up, and again whenever the GM asks for a replacement key, at
     the user's request.
     - It passes through the server once, in memory, and is never stored
       or logged.
     - This is a deliberate trade against strict end-to-end encryption:
       whoever controls that inbox can both sign in (email codes) and
       unlock synced campaigns. The server itself still holds nothing
       readable.
   - **Approval:**
     - A new device shows a 6-digit code derived from its public key.
     - An approved device sees the same code on Account › Devices and
       wraps the vault key to it. A server that swapped in its own key would
       show a different code.
     - Alternatively, the recovery key unlocks the device directly.
2. **The sync base** (`store.js`). Per synced campaign, `sync:<id>` holds:
   - **base:** the last-diffed document, without inline bytes;
   - **meta:** its clock tree;
   - **cursor:** the highest server seq applied;
   - **outbox:** unacknowledged batches.

   How changes are found:
   - Every write path is diffed base → live document, debounced 100 ms.
     That covers `update`, imports, renames, image moves, restores and
     rollbacks, so no call site records ops itself. `docs` is a map
     subclass that schedules the diff on every `set`.
   - A synced campaign's document and sync state are always written in one
     transaction, holding the latest of each. The stored base therefore
     never runs ahead of the stored document. A change saved just before a
     crash is found on the next load by the same diff.
   - Inline `data:` bytes are stripped before diffing. The record syncs at
     once, its `sha256:` blob key once the bytes move, and the bytes never
     (rule 6).
3. **The room** (`server/src/room.js` around `roomCore.js`): one Durable
   Object per campaign, with SQLite storage and hibernating WebSockets.
   - **Log:** it assigns each pushed batch a seq and acks it. It fans the
     batch out to other sockets, and acks a resent batch again instead of
     storing it twice.
   - **Catch-up:** sent in frames of at most 512 KB.
   - **Snapshots:** uploaded over HTTP (they outgrow a frame). The room
     asks for one every 1,000 ops.
     - Ops a snapshot covers are dropped only once they're 30 days old.
     - A device further behind than that gets `reset`: it pushes its
       outbox, then takes the snapshot.
   - **Who can connect:** sockets open with a 60-second ticket that names
     one campaign. The Worker re-checks the device and ownership on every
     upgrade.
4. **Wire protocol:** a simplification of roadmap 5.4 for one user.
   - There's a single `gm` partition, so a frame carries no partition name.
   - `hello {cursor}` gets `welcome`, the catch-up `ops`, then `caughtUp`.
   - Other frames: `push`/`ack`, `snapshotReq`, `reset`, `revoked`.
   - Partitions and the ACL arrive with tables (S5).
5. **Editing-time behaviour.** Incoming frames apply strictly in order, and
   wait while a text field in the campaign has focus. A remote change never
   re-renders the field being typed in, and lands when the field is left.
6. **Sync is on by default** whenever a GM is signed in (`core/sync.js`
   `autoSync`):
   - The first device sets up the vault without asking.
   - Every campaign whose content has been edited starts syncing. The
     store's `edited` flag ignores device-only state and the app's own
     housekeeping, so blank campaigns stay local.
   - Campaigns from the account's other devices are downloaded.
   - A fresh device opens the most recently changed synced campaign
     instead of its blank one.
   - Exceptions:
     - campaigns stopped on purpose (`syncOptOut`);
     - synced campaigns deleted on that device (`appConfig.syncDeclined`);
     - id collisions, which wait for the GM's choice.
   - It re-runs at boot, at sign-in, when campaigns are added or first
     edited, and when the tab comes back into view or back online.
7. **Starting to sync by hand (roadmap 5.6):**
   - "Sync this campaign" registers the campaign and uploads a snapshot as
     seq 0.
   - "Open on this device" downloads the snapshot plus the tail.
   - If the same id already syncs from another device, the choices are:
     - *Use the synced copy:* the local copy goes to the backup slot, and
       its device-only paths are kept.
     - *Keep both:* the local copy gets a new id.
   - Stop syncing deletes the server copy. Other devices are told
     (`revoked`), and every device keeps its local copy.
8. **Account settings** (`domain/accountSettings.js`, `account_settings`
   table): the settings every device of the account shares.
   - What: Rules Profiles (Storyboard positions, modules, ruleset, crew
     tasks), the Turn Step List inventory, the Reference TOC library, and
     which profile each synced campaign uses (`campaignProfiles`). A device
     speaks only for the campaigns it syncs; other entries are carried over.
   - How: one record per account, encrypted with a settings key sealed by
     the vault key (context `~account`). It holds a replica (document plus
     per-field clocks), merged with the same `syncOps` as campaigns. The
     store keeps `syncAccount` (base, clocks, outbox, server version).
   - Writes name the version they merged (`baseVersion`). A stale write is
     refused (409 `version_conflict`); the device re-fetches, merges and
     retries, so concurrent edits on two devices both survive.
   - When: before campaigns in every sync-by-default pass (so arriving
     campaigns get the account's profile and lists), 1.5 s after a change
     here, and every 30 s while the app is in view over http(s). Polling
     is cheap: `?known=<version>` answers `unchanged` without the record.
   - A device's first join keeps everything the account has and adds what
     only this device has. A local profile or list folds into the account's
     same-named one, instead of duplicating, when it has the same content or
     is still exactly the app's own seed; campaigns pointing at it are moved
     over. Same-named records edited on both sides are both kept.
9. **Conflicts, presence and the status dot:**
   - *Conflict chips* (`domain/syncConflicts.js`): last-writer-wins still
     decides every race; a chip appears only when an edit of mine lost.
     That is an incoming op on an overlapping path that is newer (or
     deletes a record mine edited inside), from a device that hadn't seen
     mine. "Hadn't seen" is exact: every pushed batch carries the sender's
     cursor (`{ops, seen}` inside the encryption), and my batches learn
     their seq on ack (kept 15 minutes, at most 300). The `meta.updatedAt`
     stamp is ignored. The chip offers "Keep mine" (my value written back
     as a new edit, which then wins everywhere) or "Keep theirs". A record
     deleted elsewhere can't be restored by id (tombstones are absolute),
     so that chip only says so. Older clients' batches (a bare op array,
     no `seen`) are read, and only my unacked edits are checked against
     them.
   - *Presence-lite:* the room sends `{t:'presence', devices}` to every
     caught-up socket on each hello and each close. The logo menu shows
     "Also open on …", naming devices from `GET /api/devices`.
   - *Status dot:* on the logo's planet (so it survives compact headers):
     green live, blue syncing, amber offline or awaiting approval, red
     error; hidden signed out. It and the chip repaint in place; a sync
     status change never re-renders the campaign.

## Consequences

- The server can't read, search or compact campaign content. Clients
  upload snapshots when asked.
- Losing every device *and* the recovery key loses the synced copy, not
  the data: every device keeps its full local copy. Reset sync is the
  escape hatch.
- **What a synced campaign costs on each change:**
  - a deep diff, about 8 ms on a 1 MB campaign;
  - an `applyOps` over the batch;
  - one combined write of the document and sync state.

  The sync state holds a second copy of the document (the base). Structural
  sharing in `update()` is the lever if this ever matters.
- **Not yet built:**
  - **Conflicts:** chips are in memory only (gone on reload), and cover
    campaigns, not account settings.
  - **More of the data:** full presence (who is looking at what) is S5.
    Account settings arrive within 30 s (or on returning to the tab), not
    live like campaign changes.
  - **The `sync.devices` gate**, which needs admin feature flags.
  - **Hardening:**
    - closing a revoked device's open socket at once;
    - rotating the vault key after a revoke;
    - splitting a single change larger than about 600 KB of text, which
      shows an error and stays local.
