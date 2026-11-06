// imageSrc.js — the one way a view gets a Gallery record's displayable
// source. A record keeps its bytes either inline (`dataUrl`, older records
// until store.js moves them) or in the blob store (`blobKey`, resolved
// from store.js's in-memory cache). The drawers and workspace render from
// state only and never import the store, so shell.js plugs the resolver in
// once at mount.

let resolveBlob = () => undefined;

export function setBlobResolver(fn) { resolveBlob = typeof fn === 'function' ? fn : () => undefined; }

/** A src usable in <img>/<video>/CSS url(), or '' when the bytes aren't on
 *  this device. */
export function imageSrc(img) {
  if (!img) return '';
  if (img.dataUrl) return img.dataUrl;
  return (img.blobKey && resolveBlob(img.blobKey)) || '';
}
