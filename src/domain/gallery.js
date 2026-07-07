// gallery.js — the Gallery drawer's pure storage (Phase 11, docs/adr/
// 0021-gallery.md): a tagged image collection, separate from Documents
// (rulebooks/notes). An entity's thumbnail is just a pointer
// (entity.thumbnailId) at one of these images, not a copy of its data —
// the same "store once, reference by id" shape the Colony crew roster
// already uses for character/vehicle entities. The actual image-resize
// work (canvas/Image/FileReader) is inherently DOM-dependent and lives in
// ui/imageResize.js instead (architectural rule 3) — this module only
// ever receives already-resized plain data (dataUrl strings).

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

function ensure(campaign) {
  if (!campaign.gallery || typeof campaign.gallery !== 'object') campaign.gallery = {};
  if (!Array.isArray(campaign.gallery.images)) campaign.gallery.images = [];
  return campaign.gallery;
}

function newId() { return 'img_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

/** Adds one image (no resize happened — the upload was already ≤ the
 *  target dimension) or two (a resize happened — a `'thumbnail'` and its
 *  full-resolution `'original'`, linked via `pairId`) — matching
 *  ui/imageResize.js's `{thumbDataUrl, originalDataUrl}` shape directly
 *  (`originalDataUrl` is null when no resize was needed). Both entries
 *  are auto-tagged with `lockedTag` (an entity's type, e.g. `'npc'`) —
 *  see removeGalleryTag below for why it can never be stripped off.
 *  When `entityId` is given, the entity's `thumbnailId` is pointed at the
 *  new `'thumbnail'` record. Returns `{campaign, thumbnailId, originalId}`
 *  (`originalId` is null when no pair was created). */
export function addGalleryImages(campaign, { entityId = null, lockedTag, title = '', mimeType = 'image/png', thumbDataUrl, originalDataUrl = null } = {}) {
  const next = clone(campaign);
  const gallery = ensure(next);
  const now = new Date().toISOString();
  const thumbId = newId();
  let originalId = null;
  const tags = lockedTag ? [lockedTag] : [];
  if (originalDataUrl) {
    originalId = newId();
    gallery.images.push({ id: originalId, entityId, kind: 'original', pairId: thumbId, title, tags: [...tags], lockedTag, mimeType, dataUrl: originalDataUrl, createdAt: now, updatedAt: now });
  }
  gallery.images.push({ id: thumbId, entityId, kind: 'thumbnail', pairId: originalId, title, tags: [...tags], lockedTag, mimeType, dataUrl: thumbDataUrl, createdAt: now, updatedAt: now });
  if (entityId) {
    const e = (next.entities.items || []).find((x) => x.id === entityId);
    if (e) e.thumbnailId = thumbId;
  }
  return { campaign: next, thumbnailId: thumbId, originalId };
}

/** Removes one image record. If it was the active thumbnail for its
 *  entity, that pointer is cleared (the entity falls back to its "+
 *  Photo" upload prompt, not a dangling reference to a deleted image). If
 *  it was paired with another image (a resize-created original/thumbnail
 *  pair), the survivor's `pairId` is cleared rather than left pointing at
 *  nothing. */
export function removeGalleryImage(campaign, id) {
  const next = clone(campaign);
  const gallery = ensure(next);
  const removed = gallery.images.find((img) => img.id === id);
  gallery.images = gallery.images.filter((img) => img.id !== id);
  if (!removed) return next;
  if (removed.entityId) {
    const e = (next.entities.items || []).find((x) => x.id === removed.entityId);
    if (e && e.thumbnailId === id) e.thumbnailId = null;
  }
  if (removed.pairId) {
    const sibling = gallery.images.find((img) => img.id === removed.pairId);
    if (sibling) sibling.pairId = null;
  }
  return next;
}

/** Same append/dedupe shape as entities.js's addEntityTag/documents.js's
 *  addDocumentTag — a Gallery image's tags are ordinary and freeform,
 *  except for the one `lockedTag` every image already carries (see
 *  removeGalleryTag). */
export function addGalleryTag(campaign, id, tag) {
  const next = clone(campaign);
  const img = ensure(next).images.find((x) => x.id === id);
  const clean = String(tag || '').trim();
  if (!img || !clean) return next;
  if (!img.tags.some((t) => t.toLowerCase() === clean.toLowerCase())) img.tags.push(clean);
  return next;
}

/** Refuses to remove `image.lockedTag` — the "auto-assigned entity-type
 *  tag, locked from edit or delete" ask — a simple inline equality check
 *  rather than reaching into oracles.js's isOracleTagLocked (confirmed
 *  hardcoded to oracle-table paths/ENTITY_FIELD_ORACLE_LINKS, not a
 *  generic lock mechanism this module could reuse as-is). Every other tag
 *  removes normally. */
export function removeGalleryTag(campaign, id, tag) {
  const next = clone(campaign);
  const img = ensure(next).images.find((x) => x.id === id);
  if (!img) return next;
  const clean = String(tag || '').trim().toLowerCase();
  if (img.lockedTag && img.lockedTag.toLowerCase() === clean) return next;
  img.tags = img.tags.filter((t) => t.toLowerCase() !== clean);
  return next;
}

export function listGalleryImages(campaign, { search = '', tags = [] } = {}) {
  const q = String(search || '').trim().toLowerCase();
  const required = tags.map((t) => String(t || '').trim().toLowerCase()).filter(Boolean);
  const all = (campaign.gallery && campaign.gallery.images) || [];
  return all.filter((img) => {
    if (required.length && !required.every((t) => (img.tags || []).some((x) => x.toLowerCase() === t))) return false;
    if (!q) return true;
    return [img.title, ...(img.tags || [])].join(' ').toLowerCase().includes(q);
  });
}

/** Every distinct tag across the Gallery, sorted — same shape as
 *  entities.js's listTagVocabulary/documents.js's allDocumentTags. */
export function listGalleryTagVocabulary(campaign) {
  const set = new Set();
  for (const img of (campaign.gallery && campaign.gallery.images) || []) {
    for (const t of img.tags || []) set.add(t);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function setEntityThumbnail(campaign, entityId, imageId) {
  const next = clone(campaign);
  const e = (next.entities.items || []).find((x) => x.id === entityId);
  const img = ensure(next).images.find((x) => x.id === imageId && x.kind === 'thumbnail');
  if (e && img) e.thumbnailId = imageId;
  return next;
}

export function clearEntityThumbnail(campaign, entityId) {
  const next = clone(campaign);
  const e = (next.entities.items || []).find((x) => x.id === entityId);
  if (e) e.thumbnailId = null;
  return next;
}

export function getGalleryImage(campaign, id) {
  return ((campaign.gallery && campaign.gallery.images) || []).find((img) => img.id === id) || null;
}
