// passkeys.test.js — passkeys (WebAuthn) and OAuth sign-in (Phase S1).
// A software authenticator (a real P-256 key, real CBOR, real signatures)
// drives the real verification; OAuth runs against a fake Google/Discord.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeServer, browser, signIn } from './helpers.js';
import { base64url, fromBase64url } from '../src/crypto.js';
import { decodeCbor, derToRaw } from '../src/webauthn.js';

const ORIGIN = 'https://gmatlas.test';
const RP_ID = 'gmatlas.test';
const enc = new TextEncoder();
const sha = async (b) => new Uint8Array(await crypto.subtle.digest('SHA-256', b));
const cat = (...parts) => { const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };

// --- a tiny CBOR encoder (test side only) ---------------------------------------------
function cbor(v) {
  const head = (major, n) => (n < 24 ? [major << 5 | n] : n < 256 ? [major << 5 | 24, n] : [major << 5 | 25, n >> 8, n & 255]);
  if (typeof v === 'number') return new Uint8Array(v >= 0 ? head(0, v) : head(1, -1 - v));
  if (typeof v === 'string') { const b = enc.encode(v); return cat(new Uint8Array(head(3, b.length)), b); }
  if (v instanceof Uint8Array) return cat(new Uint8Array(head(2, v.length)), v);
  if (v instanceof Map) return cat(new Uint8Array(head(5, v.size)), ...[...v].flatMap(([k, x]) => [cbor(k), cbor(x)]));
  throw new Error('unsupported');
}

/** A software passkey: P-256 key, a counter, discoverable. */
async function authenticator({ counter = true } = {}) {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  const credId = crypto.getRandomValues(new Uint8Array(16));
  let count = 0;
  let userHandle = null;
  const authData = async (withCred, rpId = RP_ID) => {
    count += counter ? 1 : 0;
    const flags = 0x01 | 0x04 | (withCred ? 0x40 : 0);
    const base = cat(await sha(enc.encode(rpId)), new Uint8Array([flags]), new Uint8Array([count >>> 24, (count >>> 16) & 255, (count >>> 8) & 255, count & 255]));
    if (!withCred) return base;
    const cose = new Map([[1, 2], [3, -7], [-1, 1], [-2, fromBase64url(jwk.x)], [-3, fromBase64url(jwk.y)]]);
    return cat(base, new Uint8Array(16), new Uint8Array([0, credId.length]), credId, cbor(cose));
  };
  const toDer = (raw) => {
    const int = (b) => { let i = 0; while (i < b.length - 1 && b[i] === 0) i++; let v = b.slice(i); if (v[0] & 0x80) v = cat(new Uint8Array([0]), v); return cat(new Uint8Array([2, v.length]), v); };
    const body = cat(int(raw.slice(0, 32)), int(raw.slice(32)));
    return cat(new Uint8Array([0x30, body.length]), body);
  };
  return {
    id: base64url(credId),
    async create(options, { origin = ORIGIN, rpId = RP_ID } = {}) {
      userHandle = options.user.id;
      const clientDataJSON = enc.encode(JSON.stringify({ type: 'webauthn.create', challenge: options.challenge, origin }));
      const attestationObject = cbor(new Map([['fmt', 'none'], ['attStmt', new Map()], ['authData', await authData(true, rpId)]]));
      return { id: base64url(credId), type: 'public-key', transports: ['internal'], response: { clientDataJSON: base64url(clientDataJSON), attestationObject: base64url(attestationObject) } };
    },
    async get(options, { origin = ORIGIN, tamper = false } = {}) {
      const clientDataJSON = enc.encode(JSON.stringify({ type: 'webauthn.get', challenge: options.challenge, origin }));
      const ad = await authData(false);
      const raw = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, pair.privateKey, cat(ad, await sha(clientDataJSON))));
      if (tamper) raw[5] ^= 1;
      return { id: base64url(credId), type: 'public-key', response: { clientDataJSON: base64url(clientDataJSON), authenticatorData: base64url(ad), signature: base64url(toDer(raw)), userHandle } };
    },
    rewind() { count = 0; },
  };
}

async function addPasskey(b, key, name = 'Laptop') {
  const opts = (await b.call('POST', '/api/auth/passkeys/register/options', {})).data;
  return b.call('POST', '/api/auth/passkeys/register', { challengeId: opts.challengeId, credential: await key.create(opts.publicKey), name });
}
async function passkeySignIn(b, key, how = {}) {
  const opts = (await b.call('POST', '/api/auth/passkeys/login/options', {})).data;
  return b.call('POST', '/api/auth/passkeys/login', { challengeId: opts.challengeId, credential: await key.get(opts.publicKey, how), device: { name: 'Phone · Safari' } });
}

test('webauthn helpers: CBOR decode, DER signatures', () => {
  const { value } = decodeCbor(cbor(new Map([['a', 1], [-2, new Uint8Array([9])], [3, -7]])));
  assert.equal(value.get('a'), 1);
  assert.deepEqual([...value.get(-2)], [9]);
  assert.equal(value.get(3), -7);
  const raw = new Uint8Array(64).fill(7);
  raw[0] = 0x80; raw[32] = 0;
  const int = (b) => { let v = b; while (v.length > 1 && v[0] === 0) v = v.slice(1); if (v[0] & 0x80) v = cat(new Uint8Array([0]), v); return cat(new Uint8Array([2, v.length]), v); };
  const body = cat(int(raw.slice(0, 32)), int(raw.slice(32)));
  assert.deepEqual([...derToRaw(cat(new Uint8Array([0x30, body.length]), body))], [...raw]);
});

test('passkeys: add one signed in, then sign in with it alone; tampering, other sites, replays and clones are refused', async () => {
  const server = await makeServer();
  const desk = browser(server);
  await signIn(server, desk, 'gm@example.com');
  const key = await authenticator();
  const opts = (await desk.call('POST', '/api/auth/passkeys/register/options', {})).data;
  assert.equal(opts.publicKey.rp.id, RP_ID);
  assert.equal(opts.publicKey.authenticatorSelection.residentKey, 'required');
  assert.equal((await desk.call('POST', '/api/auth/passkeys/register', { challengeId: opts.challengeId, credential: await key.create(opts.publicKey, { origin: 'https://evil.test' }) })).data.error, 'bad_passkey', 'another origin');
  assert.equal((await desk.call('POST', '/api/auth/passkeys/register', { challengeId: opts.challengeId, credential: await key.create(opts.publicKey) })).data.error, 'bad_challenge', 'a challenge is single use');
  const opts2 = (await desk.call('POST', '/api/auth/passkeys/register/options', {})).data;
  assert.equal((await desk.call('POST', '/api/auth/passkeys/register', { challengeId: opts2.challengeId, credential: await key.create(opts2.publicKey, { rpId: 'evil.test' }) })).data.error, 'bad_passkey', 'another relying party');
  const added = await addPasskey(desk, key, 'MacBook Touch ID');
  assert.equal(added.status, 200);
  assert.equal((await addPasskey(desk, key)).data.error, 'passkey_exists');
  assert.deepEqual((await desk.call('GET', '/api/auth/passkeys')).data.passkeys.map((p) => p.name), ['MacBook Touch ID']);
  assert.equal((await browser(server).call('POST', '/api/auth/passkeys/register/options', {})).status, 401, 'adding one needs a signed-in account');

  const phone = browser(server);
  const ok = await passkeySignIn(phone, key);
  assert.equal(ok.status, 200);
  assert.equal(ok.data.user.email, 'gm@example.com');
  assert.ok(ok.setCookie.includes('gm_refresh='), 'a session, same as email sign-in');
  assert.equal((await phone.call('GET', '/api/me')).status, 200);
  assert.ok((await desk.call('GET', '/api/auth/passkeys')).data.passkeys[0].lastUsedAt);

  assert.equal((await passkeySignIn(browser(server), key, { tamper: true })).data.error, 'bad_passkey', 'a bad signature');
  assert.equal((await passkeySignIn(browser(server), key, { origin: 'https://evil.test' })).data.error, 'bad_passkey');
  key.rewind();
  assert.match((await passkeySignIn(browser(server), key)).data.message, /copied/, 'a counter going backwards: a cloned key');
  const stranger = await authenticator();
  assert.equal((await passkeySignIn(browser(server), stranger)).data.error, 'unknown_passkey');

  server.sqlite.prepare("UPDATE users SET status = 'disabled'").run();
  const fresh = await authenticator({ counter: false });
  server.sqlite.prepare("UPDATE users SET status = 'active'").run();
  await addPasskey(desk, fresh, 'Key without a counter');
  assert.equal((await passkeySignIn(browser(server), fresh)).status, 200, 'an authenticator with no counter (always 0) works');
  server.sqlite.prepare("UPDATE users SET status = 'disabled'").run();
  assert.equal((await passkeySignIn(browser(server), fresh)).data.error, 'account_disabled', 'a disabled account can’t use its passkey');
  server.sqlite.prepare("UPDATE users SET status = 'active'").run();

  const id = (await desk.call('GET', '/api/auth/passkeys')).data.passkeys[0].id;
  assert.equal((await desk.call('DELETE', `/api/auth/passkeys/${id}`)).status, 200);
  assert.equal((await desk.call('GET', '/api/auth/passkeys')).data.passkeys.length, 1);
});

// --- OAuth ----------------------------------------------------------------------------

function fakeProviders(server, people) {
  const issued = new Map();
  server.env.GOOGLE_CLIENT_ID = 'g-id'; server.env.GOOGLE_CLIENT_SECRET = 'g-secret';
  server.env.DISCORD_CLIENT_ID = 'd-id'; server.env.DISCORD_CLIENT_SECRET = 'd-secret';
  server.env.OAUTH_FETCH = async (url, init = {}) => {
    if (/token$/.test(url)) {
      const form = new URLSearchParams(init.body);
      const grant = issued.get(form.get('code'));
      const okSecret = form.get('client_secret') === (grant && grant.provider === 'google' ? 'g-secret' : 'd-secret');
      const challenge = grant && base64url(await sha(enc.encode(form.get('code_verifier') || '')));
      if (!grant || !okSecret || challenge !== grant.challenge) return new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 });
      return new Response(JSON.stringify({ access_token: `at-${form.get('code')}` }), { status: 200 });
    }
    const grant = issued.get(String(init.headers.authorization).replace('Bearer at-', ''));
    return new Response(JSON.stringify(grant ? grant.profile : {}), { status: grant ? 200 : 401 });
  };
  /** The browser's round trip: /start, the provider's consent screen, /callback. */
  return async function consent(b, providerId, who, { linkUrl, tamperState = false } = {}) {
    const start = await rawGet(b, linkUrl || `/api/auth/oauth/${providerId}/start?deviceId=${b.state.deviceId || ''}&name=Desk`);
    if (start.status !== 302) return start;
    const to = new URL(start.headers.get('location'));
    const code = `c${issued.size}`;
    issued.set(code, { provider: providerId, challenge: to.searchParams.get('code_challenge'), profile: people[who] });
    const stateCookie = /gm_oauth=([^;]*)/.exec(start.headers.get('set-cookie'))[1];
    return rawGet(b, `/api/auth/oauth/${providerId}/callback?code=${code}&state=${tamperState ? 'nope' : to.searchParams.get('state')}`, `gm_oauth=${stateCookie}`);
  };
}

async function rawGet(b, path, extraCookie) {
  const { default: worker } = await import('../src/worker.js');
  const cookies = [b.state.cookie ? `gm_refresh=${b.state.cookie}` : null, extraCookie].filter(Boolean).join('; ');
  const res = await worker.fetch(new Request(`${ORIGIN}${path}`, { headers: cookies ? { cookie: cookies } : {} }), b.server.env);
  for (const c of res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')]) {
    const m = /gm_refresh=([^;]*)/.exec(c || '');
    if (m) b.state.cookie = decodeURIComponent(m[1]) || null;
  }
  return res;
}

test('OAuth: offered only when configured; Google/Discord sign-in creates or joins by verified email; PKCE and state checked; connect and disconnect', async () => {
  const server = await makeServer();
  const mk = () => Object.assign(browser(server), { server });
  assert.deepEqual((await mk().call('GET', '/api/auth/providers')).data.oauth, [], 'nothing configured, nothing offered');
  assert.equal((await rawGet(mk(), '/api/auth/oauth/google/start')).status, 404);
  const consent = fakeProviders(server, {
    ana: { sub: 'g-ana', email: 'Ana@Example.com', email_verified: true, name: 'Ana' },
    gm: { sub: 'g-gm', email: 'gm@example.com', email_verified: true, name: 'Game Master' },
    sneaky: { sub: 'g-sneak', email: 'gm@example.com', email_verified: false },
    disc: { id: '42', email: 'gm@example.com', verified: true, global_name: 'GM' },
  });
  assert.deepEqual((await mk().call('GET', '/api/auth/providers')).data.oauth.map((p) => p.id), ['google', 'discord']);

  // A new person: an account is made, named from Google, signed in.
  const a = mk();
  const res = await consent(a, 'google', 'ana');
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), '/#/account/oauth/new');
  const refreshed = await a.call('POST', '/api/auth/refresh');
  assert.equal(refreshed.status, 200, 'the callback left a working session');
  assert.equal(refreshed.data.user.email, 'ana@example.com');
  assert.equal(refreshed.data.user.displayName, 'Ana');
  assert.equal(server.sqlite.prepare("SELECT COUNT(*) AS n FROM identities WHERE provider = 'email' AND subject = 'ana@example.com'").get().n, 1, 'the email identity is kept as the recovery path');

  // An existing email account: joined only through a verified address.
  const desk = mk();
  await signIn(server, desk, 'gm@example.com');
  assert.equal((await consent(mk(), 'google', 'sneaky')).headers.get('location'), '/#/account/sign-in/error/unverified');
  const back = await consent(mk(), 'google', 'gm');
  assert.equal(back.headers.get('location'), '/#/account/oauth/back');
  assert.equal(server.sqlite.prepare('SELECT COUNT(*) AS n FROM users').get().n, 2, 'no duplicate account');

  // The browser keeps its device record across sign-in methods.
  const devicesBefore = server.sqlite.prepare('SELECT COUNT(*) AS n FROM devices').get().n;
  await consent(desk, 'google', 'gm');
  assert.equal(server.sqlite.prepare('SELECT COUNT(*) AS n FROM devices').get().n, devicesBefore, 'same device id reused');

  // State and PKCE.
  assert.equal((await consent(mk(), 'google', 'gm', { tamperState: true })).headers.get('location'), '/#/account/sign-in/error/expired');
  assert.equal((await rawGet(mk(), '/api/auth/oauth/google/callback?error=access_denied')).headers.get('location'), '/#/account/sign-in/error/cancelled');

  // Connect Discord from the account page, then sign in with it; disconnect.
  await desk.call('POST', '/api/auth/refresh');
  const { url } = (await desk.call('POST', '/api/auth/oauth/discord/link', {})).data;
  assert.equal((await consent(mk(), 'discord', 'disc', { linkUrl: url })).headers.get('location'), '/#/account/security/linked');
  assert.deepEqual((await desk.call('GET', '/api/auth/identities')).data.identities.map((i) => i.provider).sort(), ['discord', 'email', 'google']);
  assert.equal((await consent(mk(), 'discord', 'disc')).headers.get('location'), '/#/account/oauth/back');
  const { url: again } = (await (async () => { const x = mk(); await signIn(server, x, 'ana@example.com'); return x.call('POST', '/api/auth/oauth/discord/link', {}); })()).data;
  assert.equal((await consent(mk(), 'discord', 'disc', { linkUrl: again })).headers.get('location'), '/#/account/security/error/taken', 'one Discord account can’t join two GMAtlas accounts');
  assert.equal((await desk.call('DELETE', '/api/auth/identities/email')).data.error, 'keep_email');
  assert.equal((await desk.call('DELETE', '/api/auth/identities/discord')).status, 200);

  // A disabled account can't come back through OAuth.
  server.sqlite.prepare("UPDATE users SET status = 'disabled' WHERE email = 'gm@example.com'").run();
  assert.equal((await consent(mk(), 'google', 'gm')).headers.get('location'), '/#/account/sign-in/error/disabled');
});
