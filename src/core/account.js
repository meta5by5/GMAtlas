// account.js — the browser's account client (design/ACCOUNTS-SYNC-ROADMAP.md
// sections 2.2, 3 and 4.3; Phase S1). REST calls to the GMAtlas service on
// the same origin (`/api/*`), and nothing else:
//   - networking only. What it keeps between visits (this browser's device
//     id, the signed-in user, the last signed certificate) goes through
//     store.updateAppConfig() into appConfig.account (sync scope 'local'),
//     so store.js stays the only persistence module (rule 2);
//   - the access token lives in this module's memory and is never stored.
//     A reload gets a fresh one from the HttpOnly refresh cookie;
//   - the certificate is verified against the pinned public keys before it
//     touches licensing (store.setCertificate), and it keeps working offline
//     until it expires (licensing.js certStatus).
//
// Signing in is only offered on an http(s) origin (roadmap 3.3, D2): under
// file:// there are no cookies or stable origin, so the client reports
// 'unavailable' and the double-click app stays exactly the signed-out app.
//
// `createAccountClient(deps)` builds an isolated client (tests drive one
// against the real Worker); `account` is the app's instance, started by
// main.js once the store has loaded.

import { CERT_PUBLIC_KEYS } from '../data/certKeys.js';
import { LICENSES } from '../data/licenses.js';
import { verifyCertificate, licensesToLiftIn } from '../domain/licensing.js';

/** Where the hosted, sign-in-capable GMAtlas lives, for copies that can't
 *  sign in themselves (file://, a static mirror): production. A dev deploy
 *  (server/scripts/site.js without --production) rewrites this line to
 *  the dev site, so dev never sends people to production or back. */
export const ACCOUNT_SERVICE_URL = 'https://gmatlas.online/';

const OWNABLE_IDS = LICENSES.filter((l) => !l.open).map((l) => l.id);

class AccountError extends Error {
  constructor(code, message, status = 0, data = null) {
    super(message || code);
    this.code = code;
    this.status = status;
    this.data = data;
  }
}
export { AccountError };

/** A readable device label from a user-agent string, e.g. "Windows · Chrome". */
export function describeDevice(userAgent) {
  const ua = String(userAgent || '');
  const platform = /Android/.test(ua) ? 'Android'
    : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
      : /Windows/.test(ua) ? 'Windows'
        : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
          : /CrOS/.test(ua) ? 'ChromeOS'
            : /Linux/.test(ua) ? 'Linux' : '';
  const browser = /Edg\//.test(ua) ? 'Edge'
    : /OPR\/|Opera/.test(ua) ? 'Opera'
      : /Firefox\/|FxiOS/.test(ua) ? 'Firefox'
        : /Chrome\/|CriOS/.test(ua) ? 'Chrome'
          : /Safari\//.test(ua) ? 'Safari' : '';
  const name = [platform, browser].filter(Boolean).join(' · ') || 'Browser';
  return { name, platform: platform || null };
}

// WebAuthn speaks ArrayBuffers; the server speaks base64url.
function toB64url(buf) {
  let bin = '';
  for (const b of new Uint8Array(buf)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64url(text) {
  const b64 = String(text).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0)).buffer;
}
/** The browser's passkey errors, in words (cancelling is the common one). */
function passkeyCancelled(err) {
  if (err && (err.name === 'NotAllowedError' || err.name === 'AbortError')) return new AccountError('passkey_cancelled', 'No passkey was used. Try again, or sign in with your email.');
  if (err && err.name === 'InvalidStateError') return new AccountError('passkey_exists', 'This device already has a passkey for your account.');
  return new AccountError('passkey_failed', (err && err.message) || 'The passkey didn’t work.');
}

const SIGNED_OUT = Object.freeze({ status: 'signed-out', user: null, device: null, cert: null, offline: false });

export function createAccountClient(options = {}) {
  const deps = {
    fetch: options.fetch || ((...args) => globalThis.fetch(...args)),
    baseUrl: options.baseUrl || '',
    publicKeys: options.publicKeys || CERT_PUBLIC_KEYS,
    location: options.location || globalThis.location,
    userAgent: options.userAgent !== undefined ? options.userAgent : (globalThis.navigator && globalThis.navigator.userAgent),
    locks: options.locks !== undefined ? options.locks : (globalThis.navigator && globalThis.navigator.locks),
    store: options.store || null,
    credentials: options.credentials || null, // tests: a WebAuthn stand-in
  };
  let state = { ...SIGNED_OUT, status: 'idle' };
  let accessToken = null;
  const listeners = new Set();

  function set(patch) {
    state = { ...state, ...patch };
    for (const fn of listeners) fn(state);
  }
  const saved = () => (deps.store.getAppConfig().account) || {};
  function save(patch) {
    deps.store.updateAppConfig((cfg) => ({ ...cfg, account: { ...(cfg.account || {}), ...patch } }));
  }

  /** Whether this page can sign in at all (an http(s) origin, not file://). */
  function available() {
    const loc = deps.location;
    return !!loc && (loc.protocol === 'https:' || loc.protocol === 'http:');
  }

  async function raw(method, path, body, token) {
    const headers = {};
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (token) headers.authorization = `Bearer ${token}`;
    let res;
    try {
      res = await deps.fetch(`${deps.baseUrl}${path}`, {
        method, headers, credentials: 'same-origin', cache: 'no-store',
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new AccountError('offline', 'Can’t reach the GMAtlas service. Check your connection and try again.');
    }
    const type = (res.headers.get('content-type') || '');
    // A static copy (GitHub Pages, a plain file server) answers /api with
    // its own 404 page, not JSON: there's no account service here.
    if (!type.includes('application/json')) {
      throw new AccountError('no_service', 'This copy of GMAtlas has no account service.', res.status);
    }
    const data = await res.json();
    if (!res.ok) throw new AccountError(data.error || 'error', data.message || 'Something went wrong.', res.status, data);
    return data;
  }

  // --- device-bound sessions (roadmap 3.2; design/adr/device-bound-sessions.md)
  // One P-256 key pair per browser, made on first need. Its private half is
  // non-extractable and kept in IndexedDB beside the sync keys (through
  // store.js); the public half goes with every sign-in, and every refresh
  // is signed with it, so the refresh cookie alone can't renew the session
  // anywhere else. Without WebCrypto (an insecure http origin) sessions just
  // aren't bound.
  const subtle = () => (globalThis.crypto && globalThis.crypto.subtle) || null;
  let sessionKeyLoad = null;
  let loadedSessionKey = null;
  function sessionKey() {
    if (!sessionKeyLoad) {
      const load = async () => {
        if (!deps.store || typeof deps.store.getSyncKeys !== 'function' || !subtle()) return null;
        const kept = (await deps.store.getSyncKeys()).sessionKey;
        if (kept && kept.privateKey && kept.publicJwk) return kept;
        const pair = await subtle().generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
        const jwk = await subtle().exportKey('jwk', pair.publicKey);
        const made = { privateKey: pair.privateKey, publicJwk: { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y } };
        await deps.store.setSyncKeys({ sessionKey: made });
        return made;
      };
      // Under a lock, so two tabs opening at once can't each make a key.
      sessionKeyLoad = (deps.locks ? deps.locks.request('gmatlas-session-key', load) : load())
        .then((k) => { loadedSessionKey = k; return k; })
        .catch(() => { sessionKeyLoad = null; return null; });
    }
    return sessionKeyLoad;
  }
  async function signProof(key, ts) {
    const sig = await subtle().sign({ name: 'ECDSA', hash: 'SHA-256' }, key.privateKey, new TextEncoder().encode(`gmatlas-refresh:v1:${ts}`));
    return { ts, sig: toB64url(sig) };
  }

  // Refreshes rotate the cookie, and presenting a rotated one ends the
  // session (reuse detection), so two tabs must never refresh at once. A
  // Web Lock serializes them across tabs; the second tab's request then
  // carries the cookie the first one just received.
  async function refreshNow() {
    const run = async () => {
      const key = await sessionKey();
      if (!key) return raw('POST', '/api/auth/refresh');
      try {
        return await raw('POST', '/api/auth/refresh', { deviceKey: key.publicJwk, proof: await signProof(key, Date.now()) });
      } catch (err) {
        // This device's clock is behind the last proof the server took:
        // sign once more just after it.
        const after = err && err.code === 'stale_proof' && err.data && err.data.after;
        if (!Number.isSafeInteger(after)) throw err;
        return raw('POST', '/api/auth/refresh', { deviceKey: key.publicJwk, proof: await signProof(key, after + 1) });
      }
    };
    const data = deps.locks ? await deps.locks.request('gmatlas-account-refresh', run) : await run();
    accessToken = data.accessToken;
    adopt(data);
    return data;
  }

  function adopt(data) {
    const patch = { status: 'signed-in', offline: false };
    if (data.user) patch.user = data.user;
    if (data.device) patch.device = data.device;
    set(patch);
    const keep = {};
    if (data.user) keep.user = data.user;
    if (data.device) { keep.device = data.device; keep.deviceId = data.device.id; }
    save(keep);
  }

  /** Back to the signed-out app: licenses fall back to this install's own
   *  ticks. The device id is kept so signing in again reuses its record. */
  function forget() {
    accessToken = null;
    deps.store.setCertificate(null);
    save({ user: null, device: null, cert: null });
    set({ ...SIGNED_OUT });
  }

  async function refreshOrForget() {
    try { await refreshNow(); } catch (err) {
      if (err.status === 401) forget();
      throw err;
    }
  }

  /** An authenticated call: refreshes the access token when missing or
   *  expired, once; a session the server has ended signs this browser out. */
  async function api(method, path, body) {
    if (!accessToken) await refreshOrForget();
    try {
      return await raw(method, path, body, accessToken);
    } catch (err) {
      if (err.status !== 401) throw err;
    }
    await refreshOrForget();
    try {
      return await raw(method, path, body, accessToken);
    } catch (err) {
      if (err.status === 401) forget();
      throw err;
    }
  }

  /** Verifies a signed certificate and, if it's genuine and for this
   *  device, makes it decide owned licenses. Returns the payload or null. */
  async function applyCertificate(cert) {
    const payload = await verifyCertificate(cert, deps.publicKeys);
    const deviceId = (state.device && state.device.id) || saved().deviceId;
    if (!payload || (deviceId && payload.deviceId !== deviceId)) return null;
    deps.store.setCertificate(payload);
    set({ cert: payload });
    return payload;
  }

  async function fetchCertificate() {
    const { cert } = await api('GET', '/api/entitlements');
    const payload = await applyCertificate(cert);
    if (!payload) throw new AccountError('bad_certificate', 'The license certificate from the server didn’t verify. Your licenses on this device are unchanged.');
    lastCertAt = Date.now();
    save({ cert });
    return payload;
  }

  /** Boot: restore the last session from appConfig.account (works offline,
   *  from the cached certificate), then confirm it with the server. */
  // The certificate is re-fetched every RENEW_MS while signed in, and on
  // coming back to the tab (at most every RENEW_MIN_MS), so an admin grant,
  // revoke or feature flag reaches an open app without a reload, and a
  // long-open tab never runs on an expiring certificate.
  const RENEW_MS = 10 * 60 * 1000;
  const RENEW_MIN_MS = 2 * 60 * 1000;
  let lastCertAt = 0;
  let renewing = false;
  async function renewCertificate(force = false) {
    if (state.status !== 'signed-in' || renewing) return;
    if (!force && Date.now() - lastCertAt < RENEW_MIN_MS) return;
    renewing = true;
    try { await fetchCertificate(); set({ offline: false }); } catch { /* kept the cached one */ } finally { renewing = false; }
  }
  let renewalStarted = false;
  function startRenewal() {
    if (renewalStarted) return;
    renewalStarted = true;
    if (globalThis.setInterval) {
      const timer = globalThis.setInterval(() => renewCertificate(true), RENEW_MS);
      if (timer && timer.unref) timer.unref(); // Node (tests) only
    }
    const doc = globalThis.document;
    if (doc && doc.addEventListener) doc.addEventListener('visibilitychange', () => { if (doc.visibilityState === 'visible') renewCertificate(); });
  }

  async function start(store) {
    if (store) deps.store = store;
    if (!available()) { set({ ...SIGNED_OUT, status: 'unavailable' }); return state; }
    startRenewal();
    sessionKey(); // ready before a "Continue with …" link is drawn
    const s = saved();
    if (!s.user) {
      // Back from "Continue with Google/Discord": the callback left a
      // session cookie; pick it up.
      const hash = (deps.location && deps.location.hash) || '';
      if (hash.startsWith('#/account/oauth/')) {
        set({ ...SIGNED_OUT, status: 'idle' });
        try { await refreshNow(); await fetchCertificate(); } catch { if (state.status !== 'signed-in') set({ ...SIGNED_OUT }); }
        return state;
      }
      set({ ...SIGNED_OUT });
      return state;
    }
    set({ status: 'signed-in', user: s.user, device: s.device || null, cert: null, offline: false });
    if (s.cert) await applyCertificate(s.cert);
    try {
      await refreshOrForget();
      await fetchCertificate();
    } catch (err) {
      // Unreachable or broken service: stay signed in on the cached
      // certificate and say so; a 401 has already signed us out.
      if (state.status === 'signed-in') set({ offline: true });
    }
    return state;
  }

  async function requestCode(email) {
    await raw('POST', '/api/auth/email/start', { email });
  }

  /** Finishes email sign-in (creating the account on first use) and loads
   *  the certificate. Resolves to `{newAccount}`. */
  async function verifyCode(email, code) {
    const key = await sessionKey();
    const data = await raw('POST', '/api/auth/email/verify', {
      email, code, device: describeDevice(deps.userAgent), deviceId: saved().deviceId || undefined,
      deviceKey: key ? key.publicJwk : undefined,
    });
    accessToken = data.accessToken;
    adopt(data);
    try { await fetchCertificate(); } catch { /* signed in; licenses retry on the next visit */ }
    return { newAccount: !!data.newAccount };
  }

  async function signOut() {
    try { await raw('POST', '/api/auth/signout'); } catch { /* offline: the session still ends here */ }
    forget();
  }

  async function updateProfile({ displayName }) {
    const { user } = await api('PATCH', '/api/me', { displayName });
    adopt({ user });
    return user;
  }

  async function listDevices() {
    return (await api('GET', '/api/devices')).devices;
  }

  async function renameDevice(id, name) {
    const { device } = await api('PATCH', `/api/devices/${encodeURIComponent(id)}`, { name });
    if (device.current) adopt({ device });
    return device;
  }

  /** Signs a device out everywhere; this one included, if it's this one. */
  async function revokeDevice(id) {
    const self = state.device && state.device.id === id;
    await api('DELETE', `/api/devices/${encodeURIComponent(id)}`);
    if (self) forget();
  }

  /** This device's install policy (roadmap 4.4). The policy travels inside
   *  the certificate, so a fresh one is fetched straight after. */
  async function setDevicePolicy(policy) {
    const { device } = await api('PATCH', `/api/devices/${encodeURIComponent(state.device.id)}`, { policy });
    adopt({ device });
    return fetchCertificate();
  }

  /** "I own these books", account-wide. */
  async function attest(licenseIds) {
    await api('POST', '/api/entitlements/attest', { licenses: licenseIds });
    return fetchCertificate();
  }

  /** Removes a license from the account and every device. */
  async function deactivate(licenseId) {
    await api('DELETE', `/api/entitlements/licenses/${encodeURIComponent(licenseId)}`);
    return fetchCertificate();
  }

  // --- passkeys and OAuth (server/src/passkeys.js, server/src/oauth.js) ----

  /** {oauth: [{id, label}], passkeys} this service offers. */
  async function providers() { return raw('GET', '/api/auth/providers'); }

  /** Where "Continue with <provider>" goes (a full-page navigation). */
  function oauthStartUrl(providerId) {
    const p = new URLSearchParams();
    const id = saved().deviceId;
    if (id) p.set('deviceId', id);
    p.set('name', describeDevice(deps.userAgent).name);
    // The session key, if it's ready (start() loads it); otherwise the
    // session binds at its first refresh.
    if (loadedSessionKey) p.set('key', `${loadedSessionKey.publicJwk.x}.${loadedSessionKey.publicJwk.y}`);
    return `${deps.baseUrl}/api/auth/oauth/${encodeURIComponent(providerId)}/start?${p}`;
  }

  /** Connects a provider to the signed-in account: resolves to the URL to
   *  navigate to. */
  async function linkProviderUrl(providerId) {
    const { url } = await api('POST', `/api/auth/oauth/${encodeURIComponent(providerId)}/link`, {});
    return `${deps.baseUrl}${url}`;
  }
  async function listIdentities() { return api('GET', '/api/auth/identities'); }
  async function unlinkProvider(providerId) { return api('DELETE', `/api/auth/identities/${encodeURIComponent(providerId)}`); }

  const webauthn = () => deps.credentials || (globalThis.navigator && globalThis.navigator.credentials);
  /** Whether this browser can use passkeys at all. */
  function passkeysSupported() {
    return !!((deps.credentials || globalThis.PublicKeyCredential) && webauthn() && typeof webauthn().create === 'function') && available();
  }

  async function addPasskey(name) {
    const opts = await api('POST', '/api/auth/passkeys/register/options', {});
    const pk = opts.publicKey;
    let cred;
    try {
      cred = await webauthn().create({
        publicKey: {
          ...pk,
          challenge: fromB64url(pk.challenge),
          user: { ...pk.user, id: fromB64url(pk.user.id) },
          excludeCredentials: (pk.excludeCredentials || []).map((c) => ({ ...c, id: fromB64url(c.id) })),
        },
      });
    } catch (err) { throw passkeyCancelled(err); }
    const r = cred.response;
    await api('POST', '/api/auth/passkeys/register', {
      challengeId: opts.challengeId,
      name: name || describeDevice(deps.userAgent).name,
      credential: {
        id: toB64url(cred.rawId), type: cred.type,
        transports: typeof r.getTransports === 'function' ? r.getTransports() : [],
        response: { clientDataJSON: toB64url(r.clientDataJSON), attestationObject: toB64url(r.attestationObject) },
      },
    });
  }

  /** Signs in with a passkey (no email). Resolves like verifyCode. */
  async function signInWithPasskey() {
    const opts = await raw('POST', '/api/auth/passkeys/login/options', {});
    let cred;
    try {
      cred = await webauthn().get({ publicKey: { ...opts.publicKey, challenge: fromB64url(opts.publicKey.challenge), allowCredentials: [] } });
    } catch (err) { throw passkeyCancelled(err); }
    const r = cred.response;
    const key = await sessionKey();
    const data = await raw('POST', '/api/auth/passkeys/login', {
      challengeId: opts.challengeId,
      device: describeDevice(deps.userAgent),
      deviceId: saved().deviceId || undefined,
      deviceKey: key ? key.publicJwk : undefined,
      credential: {
        id: toB64url(cred.rawId), type: cred.type,
        response: {
          clientDataJSON: toB64url(r.clientDataJSON), authenticatorData: toB64url(r.authenticatorData),
          signature: toB64url(r.signature), userHandle: r.userHandle ? toB64url(r.userHandle) : null,
        },
      },
    });
    accessToken = data.accessToken;
    adopt(data);
    await fetchCertificate();
    return { newAccount: false };
  }
  async function listPasskeys() { return api('GET', '/api/auth/passkeys'); }
  async function removePasskey(id) { return api('DELETE', `/api/auth/passkeys/${encodeURIComponent(id)}`); }

  /** This install's ticks that the account doesn't own yet. */
  function liftInCandidates() {
    if (state.status !== 'signed-in' || !state.cert) return [];
    return licensesToLiftIn(deps.store.getAppConfig().licenses, state.cert.licenses, OWNABLE_IDS);
  }

  return {
    start, available, requestCode, verifyCode, signOut, updateProfile,
    listDevices, renameDevice, revokeDevice, setDevicePolicy,
    attest, deactivate, fetchCertificate, liftInCandidates,
    providers, oauthStartUrl, linkProviderUrl, listIdentities, unlinkProvider,
    passkeysSupported, addPasskey, signInWithPasskey, listPasskeys, removePasskey,
    /** An authenticated call for other core clients (core/sync.js). */
    request: api,
    getState: () => state,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}

/** The app's account client. main.js calls account.start(store). */
export const account = createAccountClient();
