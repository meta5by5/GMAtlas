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
 *  sign in themselves (file://, a static mirror). */
export const ACCOUNT_SERVICE_URL = 'https://dev.gmatlas.online/';

const OWNABLE_IDS = LICENSES.filter((l) => !l.open).map((l) => l.id);

class AccountError extends Error {
  constructor(code, message, status = 0) {
    super(message || code);
    this.code = code;
    this.status = status;
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
    if (!res.ok) throw new AccountError(data.error || 'error', data.message || 'Something went wrong.', res.status);
    return data;
  }

  // Refreshes rotate the cookie, and presenting a rotated one ends the
  // session (reuse detection), so two tabs must never refresh at once. A
  // Web Lock serializes them across tabs; the second tab's request then
  // carries the cookie the first one just received.
  async function refreshNow() {
    const run = () => raw('POST', '/api/auth/refresh');
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
    save({ cert });
    return payload;
  }

  /** Boot: restore the last session from appConfig.account (works offline,
   *  from the cached certificate), then confirm it with the server. */
  async function start(store) {
    if (store) deps.store = store;
    if (!available()) { set({ ...SIGNED_OUT, status: 'unavailable' }); return state; }
    const s = saved();
    if (!s.user) { set({ ...SIGNED_OUT }); return state; }
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
    const data = await raw('POST', '/api/auth/email/verify', {
      email, code, device: describeDevice(deps.userAgent), deviceId: saved().deviceId || undefined,
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

  /** This install's ticks that the account doesn't own yet. */
  function liftInCandidates() {
    if (state.status !== 'signed-in' || !state.cert) return [];
    return licensesToLiftIn(deps.store.getAppConfig().licenses, state.cert.licenses, OWNABLE_IDS);
  }

  return {
    start, available, requestCode, verifyCode, signOut, updateProfile,
    listDevices, renameDevice, revokeDevice, setDevicePolicy,
    attest, deactivate, fetchCertificate, liftInCandidates,
    /** An authenticated call for other core clients (core/sync.js). */
    request: api,
    getState: () => state,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}

/** The app's account client. main.js calls account.start(store). */
export const account = createAccountClient();
