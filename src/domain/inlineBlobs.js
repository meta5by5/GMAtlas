// inlineBlobs.js — which bytes in a campaign document still live inline as
// base64 `data:` URLs, and how to swap them for blob-store keys and back
// (design/ACCOUNTS-SYNC-ROADMAP.md, Phase S0 item 1). Pure/DOM-free: store.js
// does the hashing and IndexedDB writes, this module only says what to move
// and rewrites the document around the result.
//
// Two kinds of record carry inline bytes:
//   - Gallery images and videos (gallery.images[].dataUrl): every portrait,
//     token and battlemap background. These were always inline.
//   - Legacy uploaded documents (documents.library[] kind 'file' with a
//     `dataUrl`, from before the blob store existed).
// Once moved, a record carries `blobKey` instead. A moved library document
// is also flagged `inlineOnExport`, because a plain campaign export always
// carried it before and must keep doing so (migration rule 5). Gallery
// images are always re-inlined on export, for the same reason.

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

const isInline = (v) => typeof v === 'string' && v.startsWith('data:');
const galleryImages = (campaign) => (campaign && campaign.gallery && Array.isArray(campaign.gallery.images) ? campaign.gallery.images : []);
const libraryFiles = (campaign) => ((campaign && campaign.documents && Array.isArray(campaign.documents.library) ? campaign.documents.library : [])).filter((d) => d && d.kind === 'file');

/** Every record still holding inline bytes: `[{ref: {kind, id}, dataUrl}]`,
 *  `kind` being 'gallery' or 'doc'. Empty once everything has moved. */
export function listInlineBlobs(campaign) {
  const out = [];
  for (const img of galleryImages(campaign)) if (isInline(img.dataUrl)) out.push({ ref: { kind: 'gallery', id: img.id }, dataUrl: img.dataUrl });
  for (const doc of libraryFiles(campaign)) if (isInline(doc.dataUrl)) out.push({ ref: { kind: 'doc', id: doc.id }, dataUrl: doc.dataUrl });
  return out;
}

function findRecord(campaign, ref) {
  if (ref.kind === 'gallery') return galleryImages(campaign).find((x) => x.id === ref.id) || null;
  if (ref.kind === 'doc') return libraryFiles(campaign).find((x) => x.id === ref.id) || null;
  return null;
}

/** Points each moved record at its blob key and drops its inline copy.
 *  `moved` is `[{ref, dataUrl, blobKey}]`. A record only changes if it
 *  still holds the exact bytes that were stored, so applying this to a
 *  newer document than the one scanned (edits landed meanwhile) is safe,
 *  and a deleted record is simply skipped. */
export function applyMovedBlobs(campaign, moved) {
  const next = clone(campaign);
  for (const { ref, dataUrl, blobKey } of moved || []) {
    const rec = findRecord(next, ref);
    if (!rec || rec.dataUrl !== dataUrl || !blobKey) continue;
    rec.blobKey = blobKey;
    delete rec.dataUrl;
    if (ref.kind === 'doc') rec.inlineOnExport = true;
  }
  return next;
}

/** The blob keys an export has to put back inline. */
export function blobKeysToInline(campaign) {
  const keys = new Set();
  for (const img of galleryImages(campaign)) if (img.blobKey && !isInline(img.dataUrl)) keys.add(img.blobKey);
  for (const doc of libraryFiles(campaign)) if (doc.inlineOnExport && doc.blobKey) keys.add(doc.blobKey);
  return [...keys];
}

/** The document as an export file carries it: each moved record gets its
 *  `data:` URL back (`lookup(blobKey)` returns it, or nothing when the
 *  bytes aren't on this device) and loses its blob-store fields, so the
 *  file has exactly the shape older versions wrote and read. A record whose
 *  bytes aren't here keeps its `blobKey`, so its link survives. */
export function inlineBlobsForExport(campaign, lookup) {
  const keys = blobKeysToInline(campaign);
  if (!keys.length) return campaign;
  const next = clone(campaign);
  const restore = (rec) => {
    const dataUrl = lookup(rec.blobKey);
    if (!isInline(dataUrl)) return;
    rec.dataUrl = dataUrl;
    delete rec.blobKey;
    delete rec.inlineOnExport;
  };
  for (const img of galleryImages(next)) if (img.blobKey) restore(img);
  for (const doc of libraryFiles(next)) if (doc.inlineOnExport && doc.blobKey) restore(doc);
  return next;
}

/** The blob-store key for some bytes: `sha256:<hex>` of the content, so the
 *  same file gets the same key on every device. */
export function contentBlobKey(hexDigest) { return `sha256:${hexDigest}`; }
