// oauth.js — "Continue with Google / Apple / Discord" (OAuth 2 authorization
// code; roadmap 3.1, Phase S1). A provider is offered only once its
// credentials are set (wrangler secrets):
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
//   DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET
//   APPLE_CLIENT_ID (the Services ID), APPLE_TEAM_ID, APPLE_KEY_ID,
//   APPLE_PRIVATE_KEY (the .p8 key file's text)
// Register the redirect URI <origin>/api/auth/oauth/<provider>/callback
// with the provider, once per environment.
//
//   GET    /api/auth/providers                    -> {oauth: [ids], passkeys: true}
//   GET    /api/auth/oauth/:p/start?deviceId=&name=   redirect to the provider
//   POST   /api/auth/oauth/:p/link                (signed in) -> {url}  connect to this account
//   GET    /api/auth/oauth/:p/callback?code&state     redirect back into the app, signed in
//   POST   /api/auth/oauth/apple/callback         Apple's form post, bounced to the GET
//   GET    /api/auth/identities                   (signed in) -> {identities}
//   DELETE /api/auth/identities/:p                (signed in) disconnect
//
// Apple differs in three ways, each handled here:
//   - It answers with a cross-site form POST (it offers nothing else when
//     the email is asked for). That POST is let through the origin check
//     for this one path, carries no cookie (the state cookie is Lax), and
//     only bounces the browser (303) to the GET callback on this origin,
//     where the state cookie does arrive and everything is checked as usual.
//   - Its client secret is a JWT signed with the team's ES256 key, made
//     fresh for each token request (`appleClientSecret`).
//   - It has no userinfo endpoint: who signed in comes from the ID token in
//     the token response (fetched directly from Apple over TLS, so its
//     signature needn't be re-checked; OIDC core 3.1.3.7), with its issuer,
//     audience, expiry and our nonce checked. The name comes only once, in
//     the first form post.
//
// The flow's state (CSRF state, PKCE verifier, this browser's device) rides
// in a short-lived signed cookie, SameSite=Lax because the provider sends
// the browser back from its own site. An email identity is always kept, so
// the email code stays the recovery path. A provider's address joins an
// existing account only if the provider says it's verified.

import { HttpError, json, readCookie } from './http.js';
import { base64url, fromBase64url, randomToken, signAccessToken, verifyAccessToken } from './crypto.js';
import { startSession, findOrCreateUser } from './auth.js';
import { audit } from './entitlements.js';

const iso = (ms) => new Date(ms).toISOString();
const STATE_COOKIE = 'gm_oauth';
const STATE_SECONDS = 600;

export const PROVIDERS = {
  google: {
    label: 'Google',
    authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    userinfo: 'https://openidconnect.googleapis.com/v1/userinfo',
    scope: 'openid email profile',
    env: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    profile: (p) => ({ subject: String(p.sub || ''), email: p.email, verified: p.email_verified === true || p.email_verified === 'true', name: p.name || null }),
  },
  discord: {
    label: 'Discord',
    authorize: 'https://discord.com/oauth2/authorize',
    token: 'https://discord.com/api/oauth2/token',
    userinfo: 'https://discord.com/api/users/@me',
    scope: 'identify email',
    env: ['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET'],
    profile: (p) => ({ subject: String(p.id || ''), email: p.email, verified: p.verified === true, name: p.global_name || p.username || null }),
  },
  apple: {
    label: 'Apple',
    authorize: 'https://appleid.apple.com/auth/authorize',
    token: 'https://appleid.apple.com/auth/token',
    scope: 'name email',
    env: ['APPLE_CLIENT_ID', 'APPLE_TEAM_ID', 'APPLE_KEY_ID', 'APPLE_PRIVATE_KEY'],
    formPost: true,
    pkce: false, // Apple documents none; the nonce in the ID token binds the flow instead
    idToken: true,
  },
};

export const APPLE_ISSUER = 'https://appleid.apple.com';

function pemToDer(pem) {
  const b64 = String(pem).replace(/-----[^-]+-----/g, '').replace(/\\n/g, '').replace(/\s+/g, '');
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/** Apple's client secret: a five-minute ES256 JWT from the team, about the
 *  Services ID, signed with the team's key. */
export async function appleClientSecret(env, nowMs) {
  const key = await crypto.subtle.importKey('pkcs8', pemToDer(env.APPLE_PRIVATE_KEY), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const enc = new TextEncoder();
  const iat = Math.floor(nowMs / 1000);
  const header = base64url(enc.encode(JSON.stringify({ alg: 'ES256', kid: env.APPLE_KEY_ID })));
  const body = base64url(enc.encode(JSON.stringify({ iss: env.APPLE_TEAM_ID, iat, exp: iat + 300, aud: APPLE_ISSUER, sub: env.APPLE_CLIENT_ID })));
  // WebCrypto's ECDSA signature is already the raw r||s that JWS wants.
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${header}.${body}`));
  return `${header}.${body}.${base64url(sig)}`;
}

/** Who an Apple ID token says signed in, or null if it isn't for us, has
 *  expired, or doesn't carry this flow's nonce. */
export function appleProfile(idToken, { clientId, nonce, nowMs, name = null }) {
  let claims;
  try { claims = JSON.parse(new TextDecoder().decode(fromBase64url(String(idToken || '').split('.')[1] || ''))); } catch { return null; }
  if (!claims || claims.iss !== APPLE_ISSUER || claims.aud !== clientId) return null;
  if (typeof claims.exp !== 'number' || claims.exp * 1000 <= nowMs) return null;
  if (!nonce || claims.nonce !== nonce) return null;
  return {
    subject: String(claims.sub || ''),
    email: claims.email,
    verified: claims.email_verified === true || claims.email_verified === 'true',
    name,
  };
}

/** The name in Apple's first form post (`user` = {name: {firstName, lastName}}). */
function appleName(userField) {
  try {
    const n = (JSON.parse(userField || '{}') || {}).name || {};
    return [n.firstName, n.lastName].filter((s) => typeof s === 'string' && s.trim()).join(' ').slice(0, 60) || null;
  } catch { return null; }
}

const configured = (env, id) => !!(PROVIDERS[id] && PROVIDERS[id].env.every((k) => env[k]));
const provider = (env, id) => {
  if (!PROVIDERS[id]) throw new HttpError(404, 'unknown_provider', 'Unknown sign-in provider.');
  if (!configured(env, id)) throw new HttpError(404, 'provider_off', `${PROVIDERS[id].label} sign-in isn’t set up here.`);
  return PROVIDERS[id];
};
const redirectUri = (request, id) => `${new URL(request.url).origin}/api/auth/oauth/${id}/callback`;

function stateCookie(value, maxAge) {
  return `${STATE_COOKIE}=${encodeURIComponent(value)}; Path=/api/auth/oauth; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function redirect(location, cookies = []) {
  const headers = new Headers({ location, 'cache-control': 'no-store' });
  for (const c of cookies) headers.append('set-cookie', c);
  return new Response(null, { status: 302, headers });
}

async function pkceChallenge(verifier) {
  return base64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
}

export async function listProviders(request, { env }) {
  return json({ oauth: Object.keys(PROVIDERS).filter((id) => configured(env, id)).map((id) => ({ id, label: PROVIDERS[id].label })), passkeys: true });
}

export async function oauthStart(request, { env, now }, id) {
  const p = provider(env, id);
  const url = new URL(request.url);
  let linkTo = null;
  const link = url.searchParams.get('link');
  if (link) {
    const claims = await verifyAccessToken(link, env.ACCESS_TOKEN_SECRET, now());
    if (!claims || claims.typ !== 'oauth-link' || claims.p !== id) throw new HttpError(400, 'bad_link', 'That connect link expired. Try again from your account page.');
    linkTo = claims.sub;
  }
  const state = randomToken(16);
  const verifier = randomToken(32);
  const nonce = p.idToken ? randomToken(16) : null;
  const cookieValue = await signAccessToken({
    typ: 'oauth', p: id, st: state, v: verifier, n: nonce,
    did: (url.searchParams.get('deviceId') || '').slice(0, 80) || null,
    dn: (url.searchParams.get('name') || '').slice(0, 60) || null,
    lt: linkTo,
  }, env.ACCESS_TOKEN_SECRET, now(), STATE_SECONDS);
  const auth = new URL(p.authorize);
  auth.searchParams.set('response_type', 'code');
  auth.searchParams.set('client_id', env[p.env[0]]);
  auth.searchParams.set('redirect_uri', redirectUri(request, id));
  auth.searchParams.set('scope', p.scope);
  auth.searchParams.set('state', state);
  if (p.pkce !== false) {
    auth.searchParams.set('code_challenge', await pkceChallenge(verifier));
    auth.searchParams.set('code_challenge_method', 'S256');
  }
  if (nonce) auth.searchParams.set('nonce', nonce);
  if (p.formPost) auth.searchParams.set('response_mode', 'form_post');
  if (id === 'google') auth.searchParams.set('prompt', 'select_account');
  return redirect(auth.toString(), [stateCookie(cookieValue, STATE_SECONDS)]);
}

/** A two-minute ticket that lets the browser's top-level navigation to
 *  /start connect the provider to the signed-in account. */
export async function oauthLink(request, { env, now }, { user }, id) {
  provider(env, id);
  const ticket = await signAccessToken({ typ: 'oauth-link', sub: user.id, p: id }, env.ACCESS_TOKEN_SECRET, now(), 120);
  return json({ url: `/api/auth/oauth/${id}/start?link=${encodeURIComponent(ticket)}` });
}

/** Apple's form post: carries no cookie, so it checks nothing itself and
 *  only bounces the browser to the GET callback on this origin, where the
 *  state cookie arrives and every check runs. The name rides along (Apple
 *  sends it only the first time). */
export async function oauthFormPost(request, ctx, id) {
  if (!PROVIDERS[id] || !PROVIDERS[id].formPost) throw new HttpError(404, 'not_found', 'Not found.');
  const form = new URLSearchParams(await request.text().catch(() => ''));
  const to = new URLSearchParams();
  for (const k of ['code', 'state', 'error']) if (form.get(k)) to.set(k, form.get(k).slice(0, 2048));
  // Apple's "the user cancelled" is error=user_cancelled_authorize.
  if (to.get('error') === 'user_cancelled_authorize') to.set('error', 'access_denied');
  const name = appleName(form.get('user'));
  if (name) to.set('name', name);
  return new Response(null, { status: 303, headers: { location: `/api/auth/oauth/${id}/callback?${to}`, 'cache-control': 'no-store' } });
}

export async function oauthCallback(request, ctx, id) {
  const { env, now } = ctx;
  const back = (hash, cookies = []) => redirect(`/#${hash}`, [stateCookie('', 0), ...cookies]);
  const failTo = (reason) => back(`/account/sign-in/error/${encodeURIComponent(reason)}`);
  try {
    const p = provider(env, id);
    const url = new URL(request.url);
    if (url.searchParams.get('error')) return failTo(url.searchParams.get('error') === 'access_denied' ? 'cancelled' : 'provider');
    const claims = await verifyAccessToken(readCookie(request, STATE_COOKIE), env.ACCESS_TOKEN_SECRET, now());
    if (!claims || claims.typ !== 'oauth' || claims.p !== id || claims.st !== url.searchParams.get('state')) return failTo('expired');

    const fetcher = env.OAUTH_FETCH || fetch;
    const form = {
      grant_type: 'authorization_code', code: url.searchParams.get('code') || '', redirect_uri: redirectUri(request, id),
      client_id: env[p.env[0]],
      client_secret: id === 'apple' ? await appleClientSecret(env, now()) : env[p.env[1]],
    };
    if (p.pkce !== false) form.code_verifier = claims.v;
    const tokenRes = await fetcher(p.token, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams(form).toString(),
    });
    const token = await tokenRes.json().catch(() => ({}));
    let info;
    if (p.idToken) {
      if (!tokenRes.ok || !token.id_token) return failTo('provider');
      info = appleProfile(token.id_token, { clientId: env[p.env[0]], nonce: claims.n, nowMs: now(), name: url.searchParams.get('name') });
      if (!info || !info.subject) return failTo('provider');
    } else {
      if (!tokenRes.ok || !token.access_token) return failTo('provider');
      const infoRes = await fetcher(p.userinfo, { headers: { authorization: `Bearer ${token.access_token}`, accept: 'application/json' } });
      info = p.profile(await infoRes.json().catch(() => ({})));
      if (!infoRes.ok || !info.subject) return failTo('provider');
    }

    const at = iso(now());
    const identity = await env.DB.prepare('SELECT user_id FROM identities WHERE provider = ? AND subject = ?').bind(id, info.subject).first();

    // Connecting to the signed-in account (from Account › Sign-in methods).
    if (claims.lt) {
      if (identity && identity.user_id !== claims.lt) return back('/account/security/error/taken');
      if (!identity) {
        await env.DB.prepare('INSERT INTO identities (user_id, provider, subject, created_at) VALUES (?, ?, ?, ?)').bind(claims.lt, id, info.subject, at).run();
        await audit(env, at, claims.lt, 'identity.link', 'identity', `${id}:${info.subject}`, null, { provider: id });
      }
      return back('/account/security/linked');
    }

    let user;
    let created = false;
    if (identity) {
      user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(identity.user_id).first();
    } else {
      // A new identity joins (or creates) the account for its email, but
      // only an address the provider has verified.
      if (!info.email || !info.verified) return failTo('unverified');
      const email = String(info.email).trim().toLowerCase();
      ({ user, created } = await findOrCreateUser(env, email, at));
      await env.DB.prepare('INSERT INTO identities (user_id, provider, subject, created_at) VALUES (?, ?, ?, ?)').bind(user.id, id, info.subject, at).run();
      if (created && info.name) {
        await env.DB.prepare('UPDATE users SET display_name = ? WHERE id = ?').bind(String(info.name).slice(0, 60), user.id).run();
        user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first();
      }
      await audit(env, at, user.id, 'identity.link', 'identity', `${id}:${info.subject}`, null, { provider: id, via: 'sign-in' });
    }
    if (!user || user.status !== 'active') return failTo('disabled');
    const done = await startSession(env, now, user, { name: claims.dn || `${p.label} sign-in` }, claims.did);
    return back(created ? '/account/oauth/new' : '/account/oauth/back', [done.cookie]);
  } catch (err) {
    if (err instanceof HttpError && err.code === 'account_disabled') return failTo('disabled');
    if (err instanceof HttpError && (err.code === 'provider_off' || err.code === 'unknown_provider')) return failTo('provider');
    throw err;
  }
}

export async function listIdentities(request, { env }, { user }) {
  const { results } = await env.DB.prepare('SELECT provider, created_at FROM identities WHERE user_id = ? ORDER BY created_at').bind(user.id).all();
  return json({ identities: results.map((i) => ({ provider: i.provider, createdAt: i.created_at })), available: Object.keys(PROVIDERS).filter((id) => configured(env, id)) });
}

export async function unlinkIdentity(request, { env, now }, { user }, id) {
  if (id === 'email') throw new HttpError(400, 'keep_email', 'Your email always signs you in; it can’t be removed.');
  const result = await env.DB.prepare('DELETE FROM identities WHERE user_id = ? AND provider = ?').bind(user.id, id).run();
  if (!result.meta.changes) throw new HttpError(404, 'not_found', 'That sign-in method isn’t connected.');
  await audit(env, iso(now()), user.id, 'identity.unlink', 'identity', id, { provider: id }, null);
  return json({ ok: true });
}
