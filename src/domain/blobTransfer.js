// blobTransfer.js — the pure half of device-to-device document transfer
// (design/ACCOUNTS-SYNC-ROADMAP.md 6.3, Phase S3 item 2; design/adr/
// document-transfer.md). What a device asks for, what it may hand out, how
// a file is cut into chunks and put back together, which device to ask, and
// the ICE settings. No DOM, no network: core/p2p.js does the WebRTC and the
// signalling, and calls these.
//
// Two kinds of key travel:
//   - content keys (`sha256:…`): uploads and gallery images; the receiver
//     checks the bytes against the key itself;
//   - sourcebook keys (a Reference Library book's `assets/docs/…` path, one
//     some license lists): the books of licenses this account owns. The key
//     says nothing about the bytes, so the sender announces their sha256 and
//     the receiver checks against that.
// Transfer is between one account's own devices (the campaign room admits
// only the owner's), so a book goes only where its license is owned anyway;
// it must never go to another account (roadmap 6.4).

import { missingDocuments } from './documents.js';
import { LICENSES } from '../data/licenses.js';
import { isLicensed } from '../data/rulesConstitution.js';

/** Bytes per data-channel message: 64 KiB is safe on every browser's
 *  SCTP implementation (the roadmap's 256 KB is not, on older Safari). */
export const CHUNK_BYTES = 64 * 1024;

const isContentKey = (k) => typeof k === 'string' && /^sha256:[0-9a-f]{64}$/.test(k);
const BOOK_KEYS = new Set(LICENSES.flatMap((l) => l.docs || []));
/** A Reference Library sourcebook's key: a path some license lists. */
export const isBookKey = (k) => typeof k === 'string' && BOOK_KEYS.has(k);
const isTransferKey = (k) => isContentKey(k) || isBookKey(k);
const isSha = (s) => typeof s === 'string' && /^[0-9a-f]{64}$/.test(s);
const galleryImages = (campaign) => (campaign && campaign.gallery && Array.isArray(campaign.gallery.images) ? campaign.gallery.images : []);
const isInline = (v) => typeof v === 'string' && v.startsWith('data:');

/** The sourcebooks of every license owned here (`settings.licenses`, with
 *  open licenses always owned), whether or not this campaign uses them:
 *  books are app-wide, not per campaign. */
export function ownedBookKeys(settings) {
  return LICENSES.filter((l) => isLicensed(settings, l.id)).flatMap((l) => l.docs || []);
}

/** Owned sourcebooks not stored here, in registry order. */
export function wantedBookKeys(settings, presentKeys) {
  const present = presentKeys || new Set();
  return [...new Set(ownedBookKeys(settings).filter((k) => !present.has(k)))];
}

/** Every key a device may hand out for this campaign, and nothing else:
 *  the content keys it points at (its uploads and gallery images:
 *  portraits, tokens, battlemaps) and the books of licenses owned here. */
export function servableKeys(campaign) {
  const keys = new Set();
  for (const d of ((campaign && campaign.documents && campaign.documents.library) || [])) {
    if (d && d.kind === 'file' && isContentKey(d.blobKey)) keys.add(d.blobKey);
  }
  for (const img of galleryImages(campaign)) if (isContentKey(img.blobKey)) keys.add(img.blobKey);
  for (const k of ownedBookKeys(campaign && campaign.settings)) keys.add(k);
  return keys;
}

/** Whether received bytes are what was asked for: a content key must name
 *  their hash (`contentKey`, `sha256:…` of the bytes); a book key must
 *  match the hash its sender announced. */
export function receivedBytesOk(key, contentKey, announcedSha) {
  if (isContentKey(key)) return contentKey === key;
  if (isBookKey(key)) return isSha(announcedSha) && contentKey === `sha256:${announcedSha}`;
  return false;
}

/** The content keys this campaign points at whose bytes aren't stored here
 *  (`presentKeys`): missing uploads first, then gallery images. */
export function wantedKeys(campaign, presentKeys) {
  const present = presentKeys || new Set();
  const out = [];
  const add = (k) => { if (isContentKey(k) && !present.has(k) && !out.includes(k)) out.push(k); };
  for (const d of missingDocuments(campaign, present)) add(d.blobKey);
  for (const img of galleryImages(campaign)) if (img.blobKey && !isInline(img.dataUrl)) add(img.blobKey);
  return out;
}

/** What to answer a device that asked for `wanted`: the keys this device
 *  both may hand out (this campaign points at them) and has. */
export function answerWant(wanted, servable, presentKeys) {
  const present = presentKeys || new Set();
  return [...new Set((wanted || []).filter((k) => isTransferKey(k) && servable.has(k) && present.has(k)))];
}

/** Which device to fetch from: the one holding the most of `wanted`
 *  (ties to the first that answered). `haves` is Map deviceId -> Set. */
export function chooseSource(haves, wanted) {
  let best = null;
  let bestCount = 0;
  for (const [device, keys] of haves || []) {
    const n = (wanted || []).filter((k) => keys.has(k)).length;
    if (n > bestCount) { best = device; bestCount = n; }
  }
  return best;
}

/** Byte ranges [start, end) covering `size`. */
export function chunkRanges(size, chunk = CHUNK_BYTES) {
  const out = [];
  for (let start = 0; start < size; start += chunk) out.push([start, Math.min(size, start + chunk)]);
  return out;
}

/** Collects one incoming file's chunks. `add(bytes)` returns false if the
 *  sender overruns the size it announced; `complete()` once every byte is
 *  in; `bytes()` the joined result. */
export function createAssembler({ size }) {
  const parts = [];
  let received = 0;
  return {
    add(bytes) {
      const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      if (received + b.length > size) return false;
      parts.push(b);
      received += b.length;
      return true;
    },
    received: () => received,
    complete: () => received === size,
    bytes() {
      const out = new Uint8Array(received);
      let at = 0;
      for (const p of parts) { out.set(p, at); at += p.length; }
      return out;
    },
  };
}

/** A data-channel control message, or null if it isn't one we know. Binary
 *  messages are chunks; every text message is one of these. */
export function parseControl(text) {
  let m;
  try { m = JSON.parse(text); } catch { return null; }
  if (!m || typeof m !== 'object') return null;
  if (m.t === 'get' && isTransferKey(m.key)) return { t: 'get', key: m.key };
  if (m.t === 'meta' && isTransferKey(m.key) && Number.isSafeInteger(m.size) && m.size >= 0) {
    return { t: 'meta', key: m.key, size: m.size, mime: typeof m.mime === 'string' ? m.mime : '', sha: isSha(m.sha) ? m.sha : null };
  }
  if (m.t === 'end' && isTransferKey(m.key)) return { t: 'end', key: m.key };
  if (m.t === 'nope' && isTransferKey(m.key)) return { t: 'nope', key: m.key };
  if (m.t === 'done') return { t: 'done' };
  return null;
}

/** A sealed signalling message's body, or null. `k` is its kind. */
export function parseSignal(body) {
  if (!body || typeof body !== 'object' || typeof body.k !== 'string') return null;
  const keys = Array.isArray(body.keys) ? body.keys.filter(isTransferKey).slice(0, 2000) : [];
  switch (body.k) {
    case 'want': case 'have': return { k: body.k, keys };
    case 'offer': case 'answer': return typeof body.sid === 'string' && typeof body.sdp === 'string' ? { k: body.k, sid: body.sid, sdp: body.sdp, direct: body.direct === true } : null;
    case 'ice': return typeof body.sid === 'string' ? { k: 'ice', sid: body.sid, c: body.c || null } : null;
    case 'bye': return typeof body.sid === 'string' ? { k: 'bye', sid: body.sid } : null;
    default: return null;
  }
}

/** The RTCPeerConnection configuration. "Direct connections only" drops
 *  every relay (turn:/turns:) server, so bytes can only go device to
 *  device; STUN stays, since it only helps find a direct path. */
export function iceConfig(iceServers, { directOnly = false } = {}) {
  const servers = [];
  for (const s of iceServers || []) {
    const urls = (Array.isArray(s.urls) ? s.urls : [s.urls]).filter((u) => typeof u === 'string');
    const kept = directOnly ? urls.filter((u) => !/^turns?:/i.test(u)) : urls;
    if (kept.length) servers.push({ ...s, urls: kept });
  }
  return { iceServers: servers };
}

/** A relayed (TURN) ICE candidate: "… typ relay …". A direct-only session
 *  drops these from the other side too, since either end's relay carries
 *  the whole connection. */
export function isRelayCandidate(candidate) {
  const line = typeof candidate === 'string' ? candidate : (candidate && candidate.candidate) || '';
  return /\styp\s+relay(\s|$)/.test(line);
}

/** An SDP with its relay candidate lines removed (direct-only sessions). */
export function stripRelayCandidates(sdp) {
  return String(sdp || '').split(/\r?\n/).filter((l) => !(l.startsWith('a=candidate:') && isRelayCandidate(l))).join('\r\n');
}

/** Whether a relay may be used with these servers and this setting. */
export function relayPossible(iceServers, { directOnly = false } = {}) {
  return !directOnly && (iceServers || []).some((s) => (Array.isArray(s.urls) ? s.urls : [s.urls]).some((u) => /^turns?:/i.test(String(u))));
}
