// apple.test.js — "Continue with Apple" (Phase S1 leftover): the form-post
// bounce through the origin check, the ES256 client secret, and the ID
// token checks, against a fake Apple that verifies the secret with the
// team's real public key.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeServer, browser, signIn } from './helpers.js';
import { base64url, fromBase64url } from '../src/crypto.js';
import { appleProfile } from '../src/oauth.js';

const ORIGIN = 'https://gmatlas.test';
const APPLE = 'https://appleid.apple.com';
const enc = new TextEncoder();
const dec = new TextDecoder();
const unsignedJwt = (claims) => `${base64url(enc.encode(JSON.stringify({ alg: 'RS256', kid: 'apple' })))}.${base64url(enc.encode(JSON.stringify(claims)))}.sig`;

async function teamKey() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  const b64 = btoa(String.fromCharCode(...der)).replace(/(.{64})/g, '$1\n');
  return { pem: `-----BEGIN PRIVATE KEY-----\n${b64}\n-----END PRIVATE KEY-----\n`, publicKey: pair.publicKey };
}

async function send(server, b, method, path, { cookie, origin, body } = {}) {
  const { default: worker } = await import('../src/worker.js');
  const headers = {};
  const cookies = [b.state.cookie ? `gm_refresh=${b.state.cookie}` : null, cookie].filter(Boolean).join('; ');
  if (cookies) headers.cookie = cookies;
  if (origin) headers.origin = origin;
  if (body) headers['content-type'] = 'application/x-www-form-urlencoded';
  const res = await worker.fetch(new Request(`${ORIGIN}${path}`, { method, headers, body }), server.env);
  for (const c of res.headers.getSetCookie()) {
    const m = /gm_refresh=([^;]*)/.exec(c || '');
    if (m) b.state.cookie = decodeURIComponent(m[1]) || null;
  }
  return res;
}

/** A fake Apple: issues codes at "consent", checks the client secret at the
 *  token endpoint, and answers with an ID token carrying the flow's nonce. */
async function fakeApple(server) {
  const { pem, publicKey } = await teamKey();
  Object.assign(server.env, { APPLE_CLIENT_ID: 'online.gmatlas.web', APPLE_TEAM_ID: 'TEAM123', APPLE_KEY_ID: 'KEY456', APPLE_PRIVATE_KEY: pem });
  const issued = new Map();
  const seen = { secrets: [] };
  server.env.OAUTH_FETCH = async (url, init = {}) => {
    assert.equal(url, `${APPLE}/auth/token`);
    const form = new URLSearchParams(init.body);
    const grant = issued.get(form.get('code'));
    const [h, p, s] = String(form.get('client_secret')).split('.');
    const header = JSON.parse(dec.decode(fromBase64url(h)));
    const claims = JSON.parse(dec.decode(fromBase64url(p)));
    const signed = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, fromBase64url(s), enc.encode(`${h}.${p}`));
    seen.secrets.push({ header, claims, signed });
    const okSecret = signed && header.alg === 'ES256' && header.kid === 'KEY456' && claims.iss === 'TEAM123' && claims.sub === 'online.gmatlas.web' && claims.aud === APPLE;
    if (!grant || !okSecret || form.has('code_verifier')) return new Response(JSON.stringify({ error: 'invalid_client' }), { status: 400 });
    return new Response(JSON.stringify({ access_token: 'at', id_token: unsignedJwt({ iss: APPLE, aud: grant.aud || 'online.gmatlas.web', exp: Math.floor(server.env.now() / 1000) + 600, nonce: grant.nonce, ...grant.person }) }), { status: 200 });
  };
  /** The browser's round trip: /start, Apple's page, Apple's form post, the bounce. */
  async function consent(b, person, { name, tamperNonce = false, aud, linkUrl, key } = {}) {
    const start = await send(server, b, 'GET', linkUrl || `/api/auth/oauth/apple/start?deviceId=${b.state.deviceId || ''}&name=Phone${key ? `&key=${key}` : ''}`);
    if (start.status !== 302) return { start };
    const to = new URL(start.headers.get('location'));
    const code = `a${issued.size}`;
    issued.set(code, { person, nonce: tamperNonce ? 'other' : to.searchParams.get('nonce'), aud });
    const stateCookie = /gm_oauth=([^;]*)/.exec(start.headers.get('set-cookie'))[1];
    const form = new URLSearchParams({ code, state: to.searchParams.get('state') });
    if (name) form.set('user', JSON.stringify({ name: { firstName: name[0], lastName: name[1] }, email: person.email }));
    // Apple's post arrives cross-site and, the state cookie being Lax, without it.
    const post = await send(server, b, 'POST', '/api/auth/oauth/apple/callback', { origin: APPLE, body: form.toString() });
    if (post.status !== 303) return { start, to, post };
    const back = await send(server, b, 'GET', post.headers.get('location'), { cookie: `gm_oauth=${stateCookie}` });
    return { start, to, post, back };
  }
  return { consent, seen };
}

test('Apple: offered once configured; form post bounced through the origin check; ES256 secret; ID token checked', async () => {
  const server = await makeServer();
  const mk = () => Object.assign(browser(server), { server });
  assert.ok(!(await mk().call('GET', '/api/auth/providers')).data.oauth.some((p) => p.id === 'apple'), 'not offered until configured');
  const { consent, seen } = await fakeApple(server);
  assert.ok((await mk().call('GET', '/api/auth/providers')).data.oauth.some((p) => p.id === 'apple' && p.label === 'Apple'));

  // A new person, with Apple's one-time name.
  const phone = mk();
  const r = await consent(phone, { sub: 'apl-1', email: 'Rae@Example.com', email_verified: 'true' }, { name: ['Rae', 'Doe'] });
  assert.equal(r.to.origin + r.to.pathname, `${APPLE}/auth/authorize`);
  assert.equal(r.to.searchParams.get('response_mode'), 'form_post');
  assert.equal(r.to.searchParams.get('scope'), 'name email');
  assert.ok(r.to.searchParams.get('nonce'), 'a nonce binds the ID token to this flow');
  assert.ok(!r.to.searchParams.has('code_challenge'), 'no PKCE: Apple documents none');
  assert.equal(r.post.status, 303, 'Apple’s cross-site post is let through, and only bounces');
  assert.ok(!r.post.headers.get('set-cookie'), 'the bounce sets nothing');
  assert.equal(r.back.status, 302);
  assert.equal(r.back.headers.get('location'), '/#/account/oauth/new');
  assert.ok(seen.secrets.at(-1).signed, 'the client secret is signed with the team key');
  assert.equal(seen.secrets.at(-1).claims.exp - seen.secrets.at(-1).claims.iat, 300);
  const me = await phone.call('POST', '/api/auth/refresh');
  assert.equal(me.data.user.email, 'rae@example.com');
  assert.equal(me.data.user.displayName, 'Rae Doe', 'named from Apple’s first post');

  // Coming back (Apple sends no name the second time), from a browser that
  // names its session key: the new session is bound to it.
  const x = 'A'.repeat(43);
  const y = 'B'.repeat(43);
  assert.equal((await consent(mk(), { sub: 'apl-1', email: 'rae@example.com', email_verified: true }, { key: `${x}.${y}` })).back.headers.get('location'), '/#/account/oauth/back');
  assert.deepEqual(JSON.parse(server.sqlite.prepare('SELECT bound_key FROM sessions ORDER BY created_at DESC, rowid DESC LIMIT 1').get().bound_key), { kty: 'EC', crv: 'P-256', x, y });
  assert.equal(server.sqlite.prepare('SELECT COUNT(*) AS n FROM users').get().n, 1);

  // The ID token must carry this flow's nonce and be for this app.
  assert.equal((await consent(mk(), { sub: 'apl-1', email: 'rae@example.com', email_verified: true }, { tamperNonce: true })).back.headers.get('location'), '/#/account/sign-in/error/provider');
  assert.equal((await consent(mk(), { sub: 'apl-1', email: 'rae@example.com', email_verified: true }, { aud: 'someone.else' })).back.headers.get('location'), '/#/account/sign-in/error/provider');
  // An unverified address doesn't join an account.
  assert.equal((await consent(mk(), { sub: 'apl-2', email: 'rae@example.com', email_verified: false })).back.headers.get('location'), '/#/account/sign-in/error/unverified');

  // Cancelling on Apple's page.
  const cancel = await send(server, mk(), 'POST', '/api/auth/oauth/apple/callback', { origin: APPLE, body: 'error=user_cancelled_authorize&state=x' });
  assert.equal(cancel.status, 303);
  assert.equal((await send(server, mk(), 'GET', cancel.headers.get('location'))).headers.get('location'), '/#/account/sign-in/error/cancelled');

  // The origin exception is exactly Apple, exactly this path.
  assert.equal((await send(server, mk(), 'POST', '/api/auth/oauth/apple/callback', { origin: 'https://evil.test', body: 'code=x' })).status, 403);
  assert.equal((await send(server, mk(), 'POST', '/api/auth/oauth/google/callback', { origin: APPLE, body: 'code=x' })).status, 403);
  assert.equal((await send(server, mk(), 'POST', '/api/auth/email/start', { origin: APPLE, body: 'x' })).status, 403);

  // Hide My Email: connect Apple to an existing account first, then sign in with it.
  const desk = mk();
  await signIn(server, desk, 'gm@example.com');
  const { url } = (await desk.call('POST', '/api/auth/oauth/apple/link', {})).data;
  const linked = await consent(mk(), { sub: 'apl-relay', email: 'x1y2@privaterelay.appleid.com', email_verified: true, is_private_email: true }, { linkUrl: url });
  assert.equal(linked.back.headers.get('location'), '/#/account/security/linked');
  const relay = mk();
  assert.equal((await consent(relay, { sub: 'apl-relay', email: 'x1y2@privaterelay.appleid.com', email_verified: true })).back.headers.get('location'), '/#/account/oauth/back');
  assert.equal((await relay.call('POST', '/api/auth/refresh')).data.user.email, 'gm@example.com');
});

test('appleProfile: issuer, audience, expiry and nonce', () => {
  const now = Date.UTC(2026, 10, 8);
  const ok = { iss: APPLE, aud: 'cid', exp: now / 1000 + 60, nonce: 'n1', sub: 's', email: 'a@b.c', email_verified: 'true' };
  assert.deepEqual(appleProfile(unsignedJwt(ok), { clientId: 'cid', nonce: 'n1', nowMs: now, name: 'A' }), { subject: 's', email: 'a@b.c', verified: true, name: 'A' });
  assert.equal(appleProfile(unsignedJwt({ ...ok, iss: 'https://evil.test' }), { clientId: 'cid', nonce: 'n1', nowMs: now }), null);
  assert.equal(appleProfile(unsignedJwt({ ...ok, exp: now / 1000 - 1 }), { clientId: 'cid', nonce: 'n1', nowMs: now }), null);
  assert.equal(appleProfile(unsignedJwt(ok), { clientId: 'cid', nonce: null, nowMs: now }), null, 'no nonce, no sign-in');
  assert.equal(appleProfile('garbage', { clientId: 'cid', nonce: 'n1', nowMs: now }), null);
});
