// syncCrypto.js — end-to-end encryption for sync (design/ACCOUNTS-SYNC-
// ROADMAP.md 5.5, decision D3). WebCrypto only, DOM-free, no stored state:
// callers (core/syncKeys.js, the tests) hold the keys. Shared by nothing on
// the server, which only ever sees the outputs.
//
// The key hierarchy:
//   device key pair  ECDH P-256, one per browser; the private half is
//                    generated non-extractable and never leaves IndexedDB
//   vault key        32 random bytes per account. Wrapped to every approved
//                    device's public key (ECDH-ES + HKDF + AES-GCM), and to
//                    the recovery key (HKDF + AES-GCM), and stored on the
//                    server only in those wrapped forms
//   campaign key     32 random bytes per synced campaign, sealed with the
//                    vault key (AES-GCM, bound to the campaign id). Per
//                    campaign so a table (Phase S5) can share one campaign
//                    without sharing the vault
//   envelope         AES-GCM ciphertext of a JSON value (op batches,
//                    snapshots, campaign titles), bound to its campaign id
//
// Every wrap/seal/envelope binds a context string as associated data, so a
// ciphertext moved to another slot (another campaign, another purpose)
// fails to decrypt rather than decrypting as the wrong thing.

const subtle = () => {
  const s = globalThis.crypto && globalThis.crypto.subtle;
  if (!s) throw new Error('This browser can’t do the encryption sync needs (WebCrypto is missing).');
  return s;
};
const enc = new TextEncoder();
const dec = new TextDecoder();

export function toBase64url(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64url(text) {
  const b64 = String(text).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function randomBytes(n) {
  return globalThis.crypto.getRandomValues(new Uint8Array(n));
}

const ECDH = { name: 'ECDH', namedCurve: 'P-256' };
const publicPart = (jwk) => ({ kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y });

/** A new device key pair: `{publicJwk, privateKey}`, the private key
 *  non-extractable (a CryptoKey IndexedDB can hold). */
export async function generateDeviceKeyPair() {
  const pair = await subtle().generateKey(ECDH, false, ['deriveBits']);
  const jwk = await subtle().exportKey('jwk', pair.publicKey);
  return { publicJwk: publicPart(jwk), privateKey: pair.privateKey };
}

/** Six digits from a device's public key, shown on both devices when one
 *  approves the other. A server that swapped in its own key would show a
 *  different code. */
export async function approvalCode(publicJwk) {
  const digest = new Uint8Array(await subtle().digest('SHA-256', enc.encode(`gmatlas-device:${publicJwk.x}.${publicJwk.y}`)));
  const n = ((digest[0] << 24) | (digest[1] << 16) | (digest[2] << 8) | digest[3]) >>> 0;
  return String(n % 1000000).padStart(6, '0');
}

async function hkdfAesKey(secretBytes, info, salt) {
  const base = await subtle().importKey('raw', secretBytes, 'HKDF', false, ['deriveKey']);
  return subtle().deriveKey({ name: 'HKDF', hash: 'SHA-256', salt, info: enc.encode(info) }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function aesSeal(key, bytes, aad) {
  const iv = randomBytes(12);
  const ct = await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(aad) }, key, bytes);
  return { iv: toBase64url(iv), ct: toBase64url(ct) };
}

async function aesOpen(key, box, aad) {
  return new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv: fromBase64url(box.iv), additionalData: enc.encode(aad) }, key, fromBase64url(box.ct)));
}

/** Wraps secret bytes (the vault key) so only the holder of the private
 *  key matching `recipientJwk` can open them. */
export async function wrapToDevice(secretBytes, recipientJwk, context) {
  const eph = await subtle().generateKey(ECDH, true, ['deriveBits']);
  const recipient = await subtle().importKey('jwk', publicPart(recipientJwk), ECDH, false, []);
  const shared = await subtle().deriveBits({ name: 'ECDH', public: recipient }, eph.privateKey, 256);
  const epk = publicPart(await subtle().exportKey('jwk', eph.publicKey));
  const salt = enc.encode(`${epk.x}.${recipientJwk.x}`);
  const key = await hkdfAesKey(new Uint8Array(shared), `gmatlas-wrap:${context}`, salt);
  return { v: 1, alg: 'ECDH-ES+A256GCM', epk, ...(await aesSeal(key, secretBytes, context)) };
}

export async function unwrapOnDevice(wrapped, privateKey, ownJwk, context) {
  if (!wrapped || wrapped.alg !== 'ECDH-ES+A256GCM') throw new Error('Unknown key wrapping.');
  const epk = await subtle().importKey('jwk', publicPart(wrapped.epk), ECDH, false, []);
  const shared = await subtle().deriveBits({ name: 'ECDH', public: epk }, privateKey, 256);
  const key = await hkdfAesKey(new Uint8Array(shared), `gmatlas-wrap:${context}`, enc.encode(`${wrapped.epk.x}.${ownJwk.x}`));
  return aesOpen(key, wrapped, context);
}

// --- recovery key ---------------------------------------------------------------

// Crockford base32: no I, L, O or U, so a hand-copied key reads back.
const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** A new recovery key: 20 random bytes as eight groups of four characters,
 *  e.g. `7K3M-…`. Shown once; never stored by GMAtlas. */
export function generateRecoveryKey() {
  const bytes = randomBytes(20);
  let bits = 0;
  let value = 0;
  let out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  return out.match(/.{4}/g).join('-');
}

/** The recovery key's bytes from what someone typed (any case, spaces or
 *  dashes, O/I/L read as 0/1/1), or null if it isn't one. */
export function parseRecoveryKey(text) {
  const clean = String(text || '').toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  if (!/^[0-9A-HJKMNP-TV-Z]{32}$/.test(clean)) return null;
  const out = new Uint8Array(20);
  let bits = 0;
  let value = 0;
  let i = 0;
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) { out[i++] = (value >>> (bits - 8)) & 255; bits -= 8; }
  }
  return out;
}

export async function wrapWithRecovery(secretBytes, recoveryBytes) {
  const key = await hkdfAesKey(recoveryBytes, 'gmatlas-recovery', enc.encode('gmatlas-recovery-v1'));
  return { v: 1, alg: 'HKDF+A256GCM', ...(await aesSeal(key, secretBytes, 'vault')) };
}

export async function unwrapWithRecovery(wrapped, recoveryBytes) {
  const key = await hkdfAesKey(recoveryBytes, 'gmatlas-recovery', enc.encode('gmatlas-recovery-v1'));
  return aesOpen(key, wrapped, 'vault');
}

// --- symmetric keys and envelopes ----------------------------------------------

/** An AES-GCM CryptoKey from 32 raw bytes. Non-extractable unless asked. */
export function importAesKey(rawBytes, extractable = false) {
  return subtle().importKey('raw', rawBytes, { name: 'AES-GCM' }, extractable, ['encrypt', 'decrypt']);
}

/** Seals a campaign key with the vault key, bound to the campaign id. */
export async function sealCampaignKey(campaignKeyBytes, vaultKey, campaignId) {
  return { v: 1, ...(await aesSeal(vaultKey, campaignKeyBytes, `campaign-key:${campaignId}`)) };
}

export function openCampaignKey(sealed, vaultKey, campaignId) {
  return aesOpen(vaultKey, sealed, `campaign-key:${campaignId}`);
}

/** Encrypts any JSON value for one campaign: `{v, iv, ct}`. `purpose`
 *  ('ops', 'snapshot', 'meta') is bound in, so one can't pose as another. */
export async function sealJson(key, value, campaignId, purpose) {
  return { v: 1, ...(await aesSeal(key, enc.encode(JSON.stringify(value)), `${purpose}:${campaignId}`)) };
}

export async function openJson(key, envelope, campaignId, purpose) {
  if (!envelope || envelope.v !== 1) throw new Error('Unknown envelope version.');
  return JSON.parse(dec.decode(await aesOpen(key, envelope, `${purpose}:${campaignId}`)));
}
