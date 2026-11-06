# Sync groundwork: content-addressed images, field-level ops, the licensing seam, the portal surface

**Status:** Accepted (v0.98.0). Phase S0 of `design/ACCOUNTS-SYNC-ROADMAP.md`.

## Context

The roadmap adds sign-in, multi-device sync and multiplayer tables (Phases
S1–S6). Some of what those need has no server dependency and is worth
having first:
- Gallery images and videos were stored inline in the campaign document as
  `data:` URLs. Syncing that document would send every image through the
  server, against the roadmap's rule that bytes never go there.
- Every save also cloned and wrote all of those bytes.
- Sync needs a merge that converges, which is the riskiest piece. It's best
  built and tested before anything depends on it.

## Decision

1. **Images move to the blob store under a content key.** `store.js` moves
   inline gallery bytes and legacy inline uploaded documents into
   `docBlobs`, keyed `sha256:<hex>` of the bytes, after every load, import
   and update. `domain/inlineBlobs.js` (pure) decides what moves and
   rewrites the document.
   - A move only lands on a record that still holds the exact bytes stored,
     and any failure leaves the bytes inline.
   - An in-memory `blobKey → data: URL` cache keeps rendering
     (`ui/imageSrc.js`) and `export()` synchronous. It is warmed before a
     campaign is first shown.
   - Every export puts the bytes back inline and drops the blob fields, so
     export files keep exactly the shape older versions write and read.
   - Uploaded documents already in the blob store keep their existing keys.
     Re-keying them by content waits for Phase S3, the first thing that
     needs it.
2. **Every stored path has a sync scope** (`data/syncPolicy.js`): `local`,
   `account`, `gm` or `overlay`. A test fails if a top-level campaign or
   appConfig key is unclassified.
3. **Field-level ops with a convergent merge** (`domain/syncOps.js`, pure,
   to be shared with the server).
   - **Ops and clocks:** `diffDoc` turns a change into set/delete ops on
     paths. Arrays of records are addressed by id. Every op is stamped
     with a hybrid logical clock.
   - **Merging:** `applyOps` merges ops in any order, with duplicates, by
     last writer wins per path.
   - **Deletes:** a record delete is absolute.
   - **Order:** a record array's order is its own register of ids.
   - **Never synced:** ops never include `local`/`overlay` paths or
     `data:` URLs.
   - **Covered by:**
     - a random three-replica fuzzer with drifting clocks;
     - an exhaustive test of every three concurrent edits across 12 kinds
       of overlapping change, in every clock and delivery order (62,208
       cases), which caught four real divergences during development;
     - a check that applying a change's own ops reproduces it exactly.
4. **`domain/licensing.js` answers which licenses are owned on this
   device.**
   - **Signed out**, the answer is exactly the install's own ticks, so
     behaviour is unchanged. `store.js`'s profile overlay reads it.
   - **Signed in (S1):** the account's signed certificate, narrowed by the
     device's install policy, will slot in here.
   - `entitlements.js` stays the seam for what an install may activate.
5. **The portal surface.** `#/help` routes show `src/ui/portal/` instead of
   the campaign, with its own stylesheet (`styles/portal.css`, sharing only
   `tokens.css`). The Help centre's articles are data
   (`data/helpArticles.js`), rendered by `domain/helpCentre.js` with every
   string escaped and only in-app or https links. Gear menu → **Help &
   guides** opens it.
6. **Constitution amendments.**
   - Rule 4 becomes one delegated listener per event type *per surface
     root*.
   - New rule 6: no document bytes leave the device through a server.

## Consequences

- Campaign documents shrink by the size of their images, and every save
  gets cheaper. The first load after upgrading moves existing images once,
  in the background.
- An image whose bytes aren't in this browser renders empty but keeps its
  link. With exports re-inlining, that only happens if the browser's blob
  store is cleared on its own.
- `diffDoc` must deep-compare, because `store.update()` hands it a full
  clone with no shared structure. On a ~1 MB campaign it takes about
  8 ms per change, about 1.4× the clone `update()` already does. That's
  acceptable for S2; structural sharing in `update()` is the lever if it
  ever isn't.
- Plain string arrays (tags) are single values: concurrent tag edits on
  two devices keep the later one. Add-wins sets can replace that if real
  use shows conflicts.
- Hiding an *open* license on one device (a focused install) needs
  `isLicensed` to honour an exclusion. It arrives with S1's device policy.
