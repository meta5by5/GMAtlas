// zip.js — a minimal, hand-rolled ZIP reader/writer (STORE method only, no
// deflate/compression) so the Reference Library's bulk export can produce a
// real .zip of separate, individually-openable files plus one index.json,
// instead of one opaque JSON blob of base64 data URLs. No third-party
// library — this app ships zero-dependency (CLAUDE.md); PDFs are already
// internally compressed, so storing them uncompressed in the zip costs
// nothing meaningful in size while keeping this file small and correct.
//
// Deliberately pure byte-in/byte-out (Uint8Array, not Blob/File) — no DOM
// dependency at all — so it's directly testable under plain Node, even
// though it lives in src/ui/ (a browser-facing feature, imageResize.js's
// own precedent for a self-contained ui/ utility) rather than src/domain/
// (this isn't campaign logic, just a file format). Callers convert to/from
// Blob at the actual download/file-read boundary.

// --- CRC32 (IEEE 802.3 polynomial) — standard reflected-table algorithm ---
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// A fixed DOS date/time (2026-01-01 00:00:00) — the exact timestamp on a
// zip entry has no bearing on this app's own read path (readZip below
// never looks at it) and isn't worth the complexity of deriving a real one.
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

function utf8Bytes(str) { return new TextEncoder().encode(str); }

function u16(view, offset, value) { view.setUint16(offset, value, true); }
function u32(view, offset, value) { view.setUint32(offset, value, true); }

/** `files`: [{name, data: Uint8Array}] — `name` may contain `/` as a path
 *  separator (a real folder in the resulting archive). Returns one
 *  concatenated Uint8Array — the complete .zip file's bytes. */
export function buildZip(files) {
  const localChunks = [];
  const centralChunks = [];
  let offset = 0;

  for (const { name, data } of files) {
    const nameBytes = utf8Bytes(name);
    const crc = crc32(data);
    const local = new ArrayBuffer(30);
    const lv = new DataView(local);
    u32(lv, 0, 0x04034b50);       // local file header signature
    u16(lv, 4, 20);                // version needed
    u16(lv, 6, 0);                 // flags
    u16(lv, 8, 0);                 // method: 0 = store
    u16(lv, 10, DOS_TIME);
    u16(lv, 12, DOS_DATE);
    u32(lv, 14, crc);
    u32(lv, 18, data.length);      // compressed size == uncompressed (store)
    u32(lv, 22, data.length);
    u16(lv, 26, nameBytes.length);
    u16(lv, 28, 0);                // extra field length
    localChunks.push(new Uint8Array(local), nameBytes, data);

    const central = new ArrayBuffer(46);
    const cv = new DataView(central);
    u32(cv, 0, 0x02014b50);       // central directory header signature
    u16(cv, 4, 20);                // version made by
    u16(cv, 6, 20);                // version needed
    u16(cv, 8, 0);
    u16(cv, 10, 0);
    u16(cv, 12, DOS_TIME);
    u16(cv, 14, DOS_DATE);
    u32(cv, 16, crc);
    u32(cv, 20, data.length);
    u32(cv, 24, data.length);
    u16(cv, 28, nameBytes.length);
    u16(cv, 30, 0);                // extra length
    u16(cv, 32, 0);                // comment length
    u16(cv, 34, 0);                // disk number start
    u16(cv, 36, 0);                // internal attrs
    u32(cv, 38, 0);                // external attrs
    u32(cv, 42, offset);           // offset of local header
    centralChunks.push(new Uint8Array(central), nameBytes);

    offset += local.byteLength + nameBytes.length + data.length;
  }

  const centralStart = offset;
  const centralSize = centralChunks.reduce((sum, c) => sum + c.length, 0);
  const end = new ArrayBuffer(22);
  const ev = new DataView(end);
  u32(ev, 0, 0x06054b50);   // end of central directory signature
  u16(ev, 4, 0);
  u16(ev, 6, 0);
  u16(ev, 8, files.length);
  u16(ev, 10, files.length);
  u32(ev, 12, centralSize);
  u32(ev, 16, centralStart);
  u16(ev, 20, 0);           // comment length

  const total = offset + centralSize + end.byteLength;
  const out = new Uint8Array(total);
  let pos = 0;
  for (const chunk of [...localChunks, ...centralChunks, new Uint8Array(end)]) { out.set(chunk, pos); pos += chunk.length; }
  return out;
}

/** Reads a STORE-method zip's central directory (found by scanning
 *  backward for the end-of-central-directory signature, the standard/
 *  correct way — never assumes entries are read in a fixed order or that
 *  there's no trailing comment) and returns [{name, data: Uint8Array}].
 *  Throws if the bytes don't look like a zip, or contain a compressed
 *  (non-STORE) entry this reader can't decompress. */
export function readZip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocdOffset = -1;
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocdOffset = i; break; }
  }
  if (eocdOffset < 0) throw new Error('Not a valid zip file (no end-of-central-directory record found)');
  const entryCount = view.getUint16(eocdOffset + 10, true);
  const centralStart = view.getUint32(eocdOffset + 16, true);

  const out = [];
  let pos = centralStart;
  for (let i = 0; i < entryCount; i++) {
    if (view.getUint32(pos, true) !== 0x02014b50) throw new Error('Corrupt zip central directory');
    const method = view.getUint16(pos + 10, true);
    const compressedSize = view.getUint32(pos + 20, true);
    const nameLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    const localOffset = view.getUint32(pos + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(pos + 46, pos + 46 + nameLen));
    if (method !== 0) throw new Error(`"${name}" uses zip compression this reader doesn't support (STORE-only)`);

    const localNameLen = view.getUint16(localOffset + 26, true);
    const localExtraLen = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    out.push({ name, data: bytes.slice(dataStart, dataStart + compressedSize) });

    pos += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}
