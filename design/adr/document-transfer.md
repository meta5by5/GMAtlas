# Document transfer without upload (S3)

**Status:** Accepted in part. Item 1 (content keys and "not on this device")
and item 3 (hash-carrying bundles, hash-matched import) are built; item 2
(WebRTC transfer between a user's own devices) is next.

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

## Consequences

- One file is stored once per device, however many campaigns or documents
  point at it, and a link resolves on any device that has the bytes.
- Hashing reads the whole file once on import; for a large PDF that's a short
  pause, not a second copy.
- The alias record is per device and only ever grows by one entry per old
  upload.
- "Get it from <device>" on the card, and "Get all missing" over the network,
  come with item 2, which also needs each device to say which blobs it holds.
