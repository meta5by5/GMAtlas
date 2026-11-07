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
6. **Starting to sync (roadmap 5.6):**
   - "Sync this campaign" registers the campaign and uploads a snapshot as
     seq 0.
   - "Open on this device" downloads the snapshot plus the tail.
   - If the same id already syncs from another device, the choices are:
     - *Use the synced copy:* the local copy goes to the backup slot, and
       its device-only paths are kept.
     - *Keep both:* the local copy gets a new id.
   - Stop syncing deletes the server copy. Other devices are told
     (`revoked`), and every device keeps its local copy.

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
  - **Sync status and conflicts:** a status dot on the campaign surface,
    and conflict chips for a lost last-writer-wins race.
  - **More of the data:** presence, and appConfig (Rules Profiles, Turn
    Step Lists) syncing through an account partition. Until then a newly
    opened campaign uses that device's first Rules Profile, and Turn Step
    slot assignments can point at lists the device doesn't have.
  - **Hardening:**
    - closing a revoked device's open socket at once;
    - rotating the vault key after a revoke;
    - splitting a single change larger than about 600 KB of text, which
      shows an error and stays local.
