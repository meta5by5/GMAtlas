// webauthn.js — the server half of passkeys, with WebCrypto only (no
// dependencies): a minimal CBOR decoder, COSE key -> JWK, and checking a
// registration (attestation "none": the authenticator isn't vouched for,
// only the key it made) and a sign-in assertion. WebAuthn Level 2, §7.1
// and §7.2, minus attestation statements.

import { base64url, fromBase64url } from './crypto.js';

const enc = new TextEncoder();
const dec = new TextDecoder();

export class WebAuthnError extends Error {
  constructor(message) { super(message); this.code = 'bad_passkey'; }
}
const fail = (msg) => { throw new WebAuthnError(msg); };

// --- CBOR (RFC 8949): the subset WebAuthn uses ----------------------------------

/** Decodes one CBOR item from `bytes` at `pos`: {value, end}. Maps come
 *  back as Map (COSE keys are integers). */
export function decodeCbor(bytes, pos = 0) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  function length(info) {
    if (info < 24) return info;
    if (info === 24) return view.getUint8(pos++);
    if (info === 25) { const v = view.getUint16(pos); pos += 2; return v; }
    if (info === 26) { const v = view.getUint32(pos); pos += 4; return v; }
    if (info === 27) { const v = Number(view.getBigUint64(pos)); pos += 8; return v; }
    return fail('Unsupported CBOR length.');
  }
  function item(depth) {
    if (depth > 16) fail('CBOR nested too deeply.');
    if (pos >= bytes.length) fail('CBOR ended early.');
    const head = bytes[pos++];
    const major = head >> 5;
    const info = head & 31;
    switch (major) {
      case 0: return length(info);
      case 1: return -1 - length(info);
      case 2: { const n = length(info); if (pos + n > bytes.length) fail('CBOR ended early.'); const v = bytes.slice(pos, pos + n); pos += n; return v; }
      case 3: { const n = length(info); if (pos + n > bytes.length) fail('CBOR ended early.'); const v = dec.decode(bytes.subarray(pos, pos + n)); pos += n; return v; }
      case 4: { const n = length(info); const out = []; for (let i = 0; i < n; i++) out.push(item(depth + 1)); return out; }
      case 5: { const n = length(info); const out = new Map(); for (let i = 0; i < n; i++) { const k = item(depth + 1); out.set(k, item(depth + 1)); } return out; }
      case 7:
        if (info === 20) return false;
        if (info === 21) return true;
        if (info === 22) return null;
        return fail('Unsupported CBOR value.');
      default: return fail('Unsupported CBOR type.');
    }
  }
  const value = item(0);
  return { value, end: pos };
}

// --- keys ------------------------------------------------------------------------

export const ALGS = { ES256: -7, RS256: -257 };

/** A COSE public key (Map) -> {alg, jwk}. Only ES256 (P-256) and RS256. */
export function coseToJwk(cose) {
  if (!(cose instanceof Map)) fail('Bad credential key.');
  const kty = cose.get(1);
  const alg = cose.get(3);
  if (kty === 2 && alg === ALGS.ES256) {
    if (cose.get(-1) !== 1) fail('Only P-256 keys are supported.');
    const x = cose.get(-2);
    const y = cose.get(-3);
    if (!(x instanceof Uint8Array) || !(y instanceof Uint8Array) || x.length !== 32 || y.length !== 32) fail('Bad P-256 key.');
    return { alg, jwk: { kty: 'EC', crv: 'P-256', x: base64url(x), y: base64url(y) } };
  }
  if (kty === 3 && alg === ALGS.RS256) {
    const n = cose.get(-1);
    const e = cose.get(-2);
    if (!(n instanceof Uint8Array) || !(e instanceof Uint8Array) || n.length < 256) fail('Bad RSA key.');
    return { alg, jwk: { kty: 'RSA', n: base64url(n), e: base64url(e), alg: 'RS256' } };
  }
  return fail('Unsupported passkey algorithm.');
}

/** An ES256 DER signature -> the raw r||s WebCrypto verifies. */
export function derToRaw(der) {
  const fixed = (int) => {
    let v = int;
    while (v.length > 32 && v[0] === 0) v = v.subarray(1);
    if (v.length > 32) fail('Bad signature.');
    const out = new Uint8Array(32);
    out.set(v, 32 - v.length);
    return out;
  };
  if (der[0] !== 0x30) fail('Bad signature.');
  let p = 2;
  if (der[1] & 0x80) p = 2 + (der[1] & 0x7f);
  if (der[p] !== 0x02) fail('Bad signature.');
  const rLen = der[p + 1];
  const r = der.subarray(p + 2, p + 2 + rLen);
  p = p + 2 + rLen;
  if (der[p] !== 0x02) fail('Bad signature.');
  const s = der.subarray(p + 2, p + 2 + der[p + 1]);
  const out = new Uint8Array(64);
  out.set(fixed(r), 0);
  out.set(fixed(s), 32);
  return out;
}

async function verifySignature(alg, jwk, signature, data) {
  if (alg === ALGS.ES256) {
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, derToRaw(signature), data);
  }
  if (alg === ALGS.RS256) {
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    return crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, data);
  }
  return false;
}

// --- shared checks -----------------------------------------------------------------

const sha256 = async (bytes) => new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
const sameBytes = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const bytesOf = (b64, name) => { try { return fromBase64url(String(b64 || '')); } catch { return fail(`Bad ${name}.`); } };

function checkClientData(clientDataBytes, { type, challenge, origin }) {
  let data;
  try { data = JSON.parse(dec.decode(clientDataBytes)); } catch { fail('Bad client data.'); }
  if (data.type !== type) fail('Wrong ceremony type.');
  if (data.challenge !== challenge) fail('The passkey answered a different challenge.');
  if (data.origin !== origin) fail('The passkey was used on another site.');
  if (data.crossOrigin === true) fail('Cross-origin passkey use is not allowed.');
  return data;
}

/** Splits authenticator data: rpIdHash, flags, signCount and, when
 *  present, the attested credential (id + COSE key). */
export function parseAuthData(authData) {
  if (authData.length < 37) fail('Bad authenticator data.');
  const view = new DataView(authData.buffer, authData.byteOffset, authData.byteLength);
  const out = {
    rpIdHash: authData.subarray(0, 32),
    flags: authData[32],
    signCount: view.getUint32(33),
    up: !!(authData[32] & 0x01),
    uv: !!(authData[32] & 0x04),
  };
  if (authData[32] & 0x40) {
    if (authData.length < 55) fail('Bad authenticator data.');
    const idLen = view.getUint16(53);
    out.credentialId = authData.slice(55, 55 + idLen);
    const { value } = decodeCbor(authData, 55 + idLen);
    out.credentialKey = value;
  }
  return out;
}

async function checkAuthData(auth, rpId) {
  if (!sameBytes(auth.rpIdHash, await sha256(enc.encode(rpId)))) fail('The passkey belongs to another site.');
  if (!auth.up) fail('The passkey didn’t confirm you were present.');
}

// --- ceremonies -------------------------------------------------------------------

/** Checks a registration (navigator.credentials.create() result) and
 *  returns the credential to store: {id, alg, jwk, signCount}. */
export async function verifyRegistration(credential, { challenge, origin, rpId }) {
  const r = (credential && credential.response) || {};
  checkClientData(bytesOf(r.clientDataJSON, 'client data'), { type: 'webauthn.create', challenge, origin });
  const { value: att } = decodeCbor(bytesOf(r.attestationObject, 'attestation'));
  if (!(att instanceof Map) || !(att.get('authData') instanceof Uint8Array)) fail('Bad attestation.');
  const auth = parseAuthData(att.get('authData'));
  await checkAuthData(auth, rpId);
  if (!auth.credentialId) fail('The passkey didn’t include its key.');
  const id = base64url(auth.credentialId);
  if (credential.id && credential.id !== id) fail('Credential id mismatch.');
  const { alg, jwk } = coseToJwk(auth.credentialKey);
  return { id, alg, jwk, signCount: auth.signCount };
}

/** Checks a sign-in assertion (navigator.credentials.get() result) against
 *  the stored key. Returns {signCount, userHandle}. */
export async function verifyAssertion(credential, stored, { challenge, origin, rpId }) {
  const r = (credential && credential.response) || {};
  const clientData = bytesOf(r.clientDataJSON, 'client data');
  checkClientData(clientData, { type: 'webauthn.get', challenge, origin });
  const authData = bytesOf(r.authenticatorData, 'authenticator data');
  const auth = parseAuthData(authData);
  await checkAuthData(auth, rpId);
  const signed = new Uint8Array(authData.length + 32);
  signed.set(authData, 0);
  signed.set(await sha256(clientData), authData.length);
  const ok = await verifySignature(stored.alg, stored.jwk, bytesOf(r.signature, 'signature'), signed);
  if (!ok) fail('The passkey’s signature didn’t check out.');
  // A counter that doesn't go up (when the authenticator keeps one) means a
  // cloned key.
  if (stored.signCount > 0 && auth.signCount <= stored.signCount) fail('This passkey may have been copied. Remove it and add it again.');
  return { signCount: auth.signCount, userHandle: r.userHandle ? dec.decode(bytesOf(r.userHandle, 'user handle')) : null };
}
