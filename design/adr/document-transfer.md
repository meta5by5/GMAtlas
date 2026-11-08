# Document transfer without upload (S3)

**Status:** Accepted. Built: item 1 (content keys and "not on this
device"), item 2 (WebRTC transfer between a user's own devices, behind the
`p2p.transfer` feature) and item 3 (hash-carrying bundles, hash-matched
import), including sourcebook PDFs between one account's devices.

## Context

Personal sync (S2, `personal-sync.md`) carries a campaign's metadata to every
device, but by design no document bytes: rule 6 keeps every file off the
server. A document uploaded on one device therefore arrives on the others as a
link with nothing behind it. Before S3, uploads were also stored under their
document id, which only means anything on the device that made it, so the same
file brought in on two devices had two unrelated keys.

## Decision

1. **Every uploaded document is keyed by its contents**, `sha256:<hex>`, the
   same scheme S0 gave gallery images (`inlineBlobs.js`). A new upload hashes
   the file before it's added (`store.putContentBlob` / `contentKeyFor`).
2. **Older uploads are re-keyed in the background**, in the same pass that
   moves inline images (`store.js` `moveInlineBlobs` → `rekeyUploads`):
   - copy the bytes to the content key, record an alias (old key → content
     key, this device's own `blobAliases` record, never synced), then delete
     the old copy, so the bytes are never stored twice and never missing;
   - the campaign's `blobKey`, TOC Guide docs' `tocSourceKey` and
     `tocDeclined` move with it (`documents.js` `rekeyDocumentBlobs`), and so
     does the app-wide TOC library (`toc.js` `rekeyTocLibrary`);
   - `getDocBlob` resolves aliases and `listDocBlobKeys` counts an aliased key
     as present, so anything still holding the old key keeps working;
   - an upload whose bytes aren't on this device keeps its old key until they
     arrive (an old export's attachment re-keys as soon as it's stored).
3. **"Not on this device"** (roadmap 6.2): `documents.js`
   `missingDocuments(campaign, presentKeys)` lists uploads whose key isn't
   stored here. The Docs library badges each with ☁̸ and shows a count with
   **Import files…**; opening one shows a card with **Import file…** instead
   of the old "couldn't be loaded" message. Nothing is flagged until the
   stored-key listing has loaded.
4. **Importing matches by contents** (roadmap 6.3, "re-import the same
   file"; `classifyImportedFile`): a file whose bytes a document is missing
   fills that link whatever its name; one already here is skipped; anything
   else becomes a new document (Import File(s) only). On the card, a file with
   different contents asks first and then points the document at the new key.
5. **Bundles carry hashes.** The library export zip's `index.json` (version 3)
   gives each file's `sha256`; library-zip and campaign-bundle imports check
   it and skip a damaged file instead of storing it under the wrong key. Older
   zips (no hash) import as before.
6. **Device to device over WebRTC** (roadmap 6.3 channel 1; `core/p2p.js`
   for the network, `domain/blobTransfer.js` for the decisions):
   - **Who has what:** while a synced campaign is open on several devices,
     each asks the others which of its missing files they hold (`want` →
     `have`). A device answers only with files the open campaign points at
     (`servableKeys`: its uploads and gallery images) that it has.
   - **Signalling goes through the campaign room, not an account room**
     (roadmap 6.3 said account room; none exists, and the files belong to
     a campaign anyway). Every message is sealed with the campaign key, so
     the server sees only which device it's for, never SDP, addresses or
     file hashes. The room admits only the owner's devices, so transfer is
     within one account by construction. Each socket's ticket says whether
     the account has `p2p.transfer`; the room relays nothing for a socket
     without it, so the admin kill switch takes effect at each device's
     next reconnect.
   - **Transfer:** a data channel from the device that's missing the
     files; one file at a time, announced with its size, in 64 KiB chunks
     (not the roadmap's 256 KB, which older Safari can't take in one
     message) with backpressure; the receiver checks the whole file against
     its content key and stores nothing that doesn't match.
   - **Relay (TURN)** is offered by the server only when configured
     (`GET /api/p2p/ice`); it carries the DTLS-encrypted stream, never
     readable. **"Direct connections only"** (Account › Sync, decision D7)
     is per device (`appConfig.p2p.directOnly`, local) and makes the whole
     session direct: it drops relay servers here, asks the other device to
     do the same in the offer, and both ends drop relay candidates.
   - **UI:** the missing-document card's **Get it from …**, the Docs
     library's **Get N from …**, and the logo menu's **Get N missing files
     from …** (which also covers gallery images).
7. **Sourcebooks travel too, between one account's devices.** A Reference
   Library book is keyed by its catalog path (`assets/docs/…`), not its
   contents, and books are app-wide rather than per campaign:
   - **Which:** a device asks for the books of every license owned here
     that it doesn't hold (`wantedBookKeys`), alongside the open campaign's
     files, and hands out only owned licenses' books (`servableKeys`). Only
     paths some license lists count as book keys, so nothing else on the
     device can be named.
   - **Checking:** the key says nothing about the bytes, so the sender
     announces their sha256 in `meta` and the receiver stores nothing that
     doesn't match (`receivedBytesOk`). That catches damage, not a lying
     sender; the sender is the same account's own device.
   - **UI:** Settings › Licenses, beside Load / Import my copy: **⇄ Get from
     <device>** per book and **⇄ Get N from <device>** per license. The
     Docs library's counts stay about the campaign's own files.
   - Across accounts (tables, S5) a third-party book must never travel
     (roadmap 6.4); that needs the transfer tickets S5 brings.

## Consequences

- One file is stored once per device, however many campaigns or documents
  point at it, and a link resolves on any device that has the bytes.
- Hashing reads the whole file once on import; for a large PDF that's a short
  pause, not a second copy.
- The alias record is per device and only ever grows by one entry per old
  upload.
- Both devices must have the campaign open at once; there is no "send it
  when it comes online" queue.
- A sourcebook's hash is computed by its sender on every send (one read of
  the file); nothing records what a book's bytes should be, so two devices
  holding different printings of one book each keep their own.
- A device whose `p2p.transfer` is switched off mid-session keeps relaying
  until its socket reconnects (tickets last 60 s; sockets longer).
