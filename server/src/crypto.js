// crypto.js — the server's cryptography, on WebCrypto only, so it runs the
// same on Cloudflare Workers and Node (tests).
//   - random ids and tokens
//   - SHA-256 hashing (codes and refresh tokens are stored hashed)
//   - HS256 access tokens (15 minutes, held in memory by the client)
//   - ECDSA P-256 signatures for the entitlement certificate, which the
//     browser verifies offline with the pinned public key (roadmap 4.3)

const enc = new TextEncoder();

export function base64url(bytes) {
  let bin = '';
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64url(text) {
  const b64 = String(text).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function randomToken(bytes = 32) {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

/** A short prefixed id, e.g. `usr_3kq9...`. */
export function newId(prefix) {
  return `${prefix}_${randomToken(12)}`;
}

/** A uniformly random 6-digit code. */
export function randomCode() {
  const max = 4294967296 - (4294967296 % 1000000);
  let n;
  do { n = crypto.getRandomValues(new Uint32Array(1))[0]; } while (n >= max);
  return String(n % 1000000).padStart(6, '0');
}

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time comparison of two equal-purpose strings. */
export function safeEqual(a, b) {
  const x = String(a);
  const y = String(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x.charCodeAt(i) || 0) ^ (y.charCodeAt(i) || 0);
  return diff === 0;
}

// --- access tokens (HS256 JWT) ---------------------------------------------

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signAccessToken(claims, secret, nowMs, ttlSeconds = 900) {
  const header = base64url(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const iat = Math.floor(nowMs / 1000);
  const body = base64url(enc.encode(JSON.stringify({ ...claims, iat, exp: iat + ttlSeconds })));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(`${header}.${body}`));
  return `${header}.${body}.${base64url(sig)}`;
}

/** The token's claims, or null if it is malformed, forged or expired. */
export async function verifyAccessToken(token, secret, nowMs) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  let ok = false;
  try {
    ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromBase64url(sig), enc.encode(`${header}.${body}`));
  } catch { return null; }
  if (!ok) return null;
  let claims;
  try { claims = JSON.parse(new TextDecoder().decode(fromBase64url(body))); } catch { return null; }
  if (!claims || typeof claims.exp !== 'number' || claims.exp * 1000 <= nowMs) return null;
  return claims;
}

// --- entitlement certificate (ECDSA P-256) ----------------------------------

/** Imports the signing key from its private JWK (a secret in production). */
export function importSigningKey(privateJwk) {
  return crypto.subtle.importKey('jwk', privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

export function importVerifyKey(publicJwk) {
  return crypto.subtle.importKey('jwk', publicJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
}

/** `{payload, sig}`: the payload is the exact JSON text that was signed, so
 *  the client verifies those bytes rather than a re-serialization. */
export async function signCertificate(payloadObject, signingKey) {
  const payload = JSON.stringify(payloadObject);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signingKey, enc.encode(payload));
  return { payload, sig: base64url(sig) };
}

export async function verifyCertificate(cert, verifyKey) {
  try {
    return await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, verifyKey, fromBase64url(cert.sig), enc.encode(cert.payload));
  } catch { return false; }
}

/** A fresh P-256 key pair as JWKs, for `npm run keygen`. */
export async function generateSigningKeyPair() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  return { privateJwk, publicJwk };
}
