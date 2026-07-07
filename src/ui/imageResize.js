// imageResize.js — the Gallery feature's browser-only image-resize step
// (Phase 11, docs/adr/0021-gallery.md): the first code in this app to
// touch canvas/Image/FileReader for actual pixel manipulation (Documents'
// own upload path stores a file's bytes verbatim, never redraws them).
// Deliberately NOT in src/domain/ — architectural rule 3 requires the
// domain layer stay pure/synchronous/DOM-free, and canvas/Image loading
// is neither; this hands domain/gallery.js plain {thumbDataUrl,
// originalDataUrl} data once resizing (if any) is done, the same
// domain/ui split ui/mechanicsScan.js and ui/tocScan.js already
// established for their own browser-only work (PDF.js there, Canvas here).

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode image'));
    img.src = dataUrl;
  });
}

/** Reads `file` and, only if either dimension exceeds `maxDim`, draws a
 *  scaled copy onto an offscreen canvas — otherwise the original bytes
 *  serve as the thumbnail unchanged (no redundant duplicate stored, per
 *  the "resized version... IF that file is too big" ask). Returns
 *  `{thumbDataUrl, originalDataUrl, resized}` — `originalDataUrl` is null
 *  when nothing was resized, since there's nothing separate to keep.
 *  PNGs stay PNG (their transparency matters for token-style art); every
 *  other type re-encodes as JPEG at a fixed quality, matching how most
 *  camera/phone photos already arrive. */
export async function loadAndMaybeResize(file, maxDim = 256) {
  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);
  if (img.width <= maxDim && img.height <= maxDim) {
    return { thumbDataUrl: dataUrl, originalDataUrl: null, resized: false };
  }
  const scale = maxDim / Math.max(img.width, img.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  const outMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const thumbDataUrl = canvas.toDataURL(outMime, 0.85);
  return { thumbDataUrl, originalDataUrl: dataUrl, resized: true };
}
