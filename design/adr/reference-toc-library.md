# Reference Table of Contents: prompt on open, remembered across campaigns

**Status:** Accepted

## Context

A Guide "Table of Contents" doc per sourcebook PDF (one `@[Title|Doc#Page]`
bullet per PDF bookmark) used to be made only by a bulk Settings → Reference
Tools button or a prompt on uploading a personal PDF. The bulk button
rewrote every existing TOC on each run, so any edits a GM made to one were
lost. Each campaign also had to scan the same sourcebook again, even though
the same PDF shows up in every campaign that uses its game system.

## Decision

- **Identity.** A PDF is identified by its `sourceKey`: the doc-blob-store
  key the viewer already loads it by (a Reference Library entry's manifest
  `file` path, or an uploaded document's `blobKey`). A TOC Guide doc gets
  this stamped on it as `tocSourceKey`. An older or hand-made TOC is also
  recognized by its title under the "Table of Contents" parent.
- **Never duplicate, never overwrite.** `domain/toc.js`'s `addReferenceToc`
  refuses when a TOC for that PDF already exists. Every generation path goes
  through it, and none of them rewrites an existing TOC.
- **Prompt on open.** Opening a PDF (`data-doc-open`) that has no TOC in
  this campaign asks, using `window.confirm`, whether to generate one. It
  only asks when a scan can actually run (PDF.js loaded, served over http).
  A "no" goes into `campaign.documents.tocDeclined`, so that campaign is
  never asked about that PDF again. Other campaigns are unaffected. The
  upload prompt records a "no" the same way.
- **Remembered app-wide.** Every scan that opened a PDF is stored in
  `appConfig.tocLibrary[sourceKey] = {docTitle, entries, scannedAt}`,
  including scans that found no bookmarks, so a PDF with nothing to scan is
  never offered again. `shell.js`'s `syncRememberedTocs()` adds each
  remembered TOC to any campaign whose Docs library shows that PDF and that
  hasn't declined it. It writes the TOC with that campaign's own title for
  the doc, so the mentions resolve even after a rename. It runs from
  `render()` but only acts when the campaign, its PDFs, or the remembered
  scans change.
- **Settings → General** has a "Create Guide TOCs for sourcebooks" link. It
  lists every PDF in the campaign's local Docs library with its status
  (✓ in Guide / no bookmarks / Create TOC) and offers a "Create all missing"
  action. Creating a TOC from here also clears an earlier decline. This
  replaces the old Reference Tools bulk button.

## Consequences

- A TOC is scanned once per browser, not once per campaign.
- A Guide TOC is never rewritten automatically. To get a fresh scan, the GM
  deletes the TOC; the remembered scan is then re-applied the next time the
  sync inputs change. (Deleting it from the app-wide `tocLibrary` isn't
  exposed in the UI yet.)
- `appConfig.tocLibrary` stays in this browser like the rest of
  `appConfig`. It isn't part of a campaign export, but the TOC Guide docs
  themselves are.
- Both new fields are additive defaults (`schema.js`), so older exports
  import unchanged.
