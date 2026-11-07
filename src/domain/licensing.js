// licensing.js — which licenses count as owned on THIS device
// (design/ACCOUNTS-SYNC-ROADMAP.md, section 4). Pure/DOM-free. store.js
// overlays the result onto every doc's `settings.licenses`, so every
// existing reader (isLicensed, isGameSystemActivated, Docs-library scoping,
// isPackInUse) works unchanged whatever the source of ownership.
//
// Today there is one source: the install's own ticks (`appConfig.licenses`,
// "I own this book"). Phase S1 adds a signed-in source: the account's
// entitlement certificate, narrowed by this device's install policy. This
// module is where the two meet, so the change lands in one place.
//
// entitlements.js stays the documented seam for what an install is ALLOWED
// to activate (canAccessGameSystem); this module answers what it OWNS.
//
// Open (CC-BY) licenses are always owned via isLicensed's `open` check and
// never appear here. Hiding one on a device ("focused install") needs
// isLicensed to honour an explicit exclusion; that arrives with S1's device
// policy, not before.

/** Device install policy (roadmap section 4.4). `follow`: everything the
 *  account owns, minus `excluded`. `focused`: only the ids in `only`. */
export const DEFAULT_DEVICE_POLICY = Object.freeze({ mode: 'follow', excluded: [], only: [] });

/** Owned licenses on this device, as the `{licenseId: true}` map
 *  `settings.licenses` has always been.
 *  - Signed out (no certificate): the install's own ticks, unchanged.
 *  - Signed in: the certificate's licenses, narrowed by the device policy.
 *    The install's ticks are lifted into the account at first sign-in
 *    (Phase S1), so they aren't merged in here. */
export function effectiveLicenses({ attested = {}, cert = null, devicePolicy = DEFAULT_DEVICE_POLICY } = {}) {
  if (!cert) {
    const out = {};
    for (const [id, owned] of Object.entries(attested || {})) out[id] = !!owned;
    return out;
  }
  const policy = devicePolicy || DEFAULT_DEVICE_POLICY;
  const excluded = new Set(policy.excluded || []);
  const only = new Set(policy.only || []);
  const out = {};
  for (const id of cert.licenses || []) {
    if (policy.mode === 'focused' ? !only.has(id) : excluded.has(id)) continue;
    out[id] = true;
  }
  return out;
}

/** The install's own ticks that the account doesn't own yet: what the
 *  first-sign-in "Bring this device's licenses into your account?" offers
 *  to attest. Open licenses and unknown ids are never offered. */
export function licensesToLiftIn(attested, certLicenses, ownableIds) {
  const owned = new Set(certLicenses || []);
  const ownable = new Set(ownableIds || []);
  return Object.entries(attested || {})
    .filter(([id, ticked]) => ticked && ownable.has(id) && !owned.has(id))
    .map(([id]) => id)
    .sort();
}

function fromBase64url(text) {
  const b64 = String(text).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** A signed certificate `{payload, sig}` (payload is the exact JSON text the
 *  server signed with ECDSA P-256) checked against the pinned public keys
 *  (data/certKeys.js). Resolves to the parsed payload, or null if the
 *  signature, the key id or the shape is wrong. Expiry is NOT checked here:
 *  certStatus() decides what an old certificate still allows. Deterministic
 *  and side-effect free; async only because WebCrypto is. */
export async function verifyCertificate(cert, publicKeys) {
  if (!cert || typeof cert.payload !== 'string' || typeof cert.sig !== 'string') return null;
  const subtle = globalThis.crypto && globalThis.crypto.subtle;
  if (!subtle) return null;
  let payload;
  try { payload = JSON.parse(cert.payload); } catch { return null; }
  if (!payload || payload.v !== 1 || !Array.isArray(payload.licenses)) return null;
  const jwk = (publicKeys || []).find((k) => k.kid === payload.kid);
  if (!jwk) return null;
  try {
    const key = await subtle.importKey('jwk', { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const ok = await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, fromBase64url(cert.sig), new TextEncoder().encode(cert.payload));
    return ok ? payload : null;
  } catch { return null; }
}

/** Where a certificate stands at `nowMs`: 'valid' until it expires, then
 *  'grace' for `graceDays`, then 'expired'. 'none' when there isn't one.
 *  Only paid features pause once expired; owned licenses and campaign data
 *  never do (roadmap section 4.3). */
export function certStatus(cert, nowMs, graceDays = 14) {
  if (!cert || !cert.expiresAt) return 'none';
  const expires = Date.parse(cert.expiresAt);
  if (nowMs < expires) return 'valid';
  return nowMs < expires + graceDays * 86400000 ? 'grace' : 'expired';
}
