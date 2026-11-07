// passkeys.js — passkey sign-in (WebAuthn; roadmap 3.1, Phase S1).
// Discoverable credentials: signing in needs no email, the browser offers
// the account's passkey. The relying party is the site the request came
// to (dev.gmatlas.online or gmatlas.online), so each environment has its
// own passkeys.
//
//   POST   /api/auth/passkeys/register/options   (signed in) -> creation options
//   POST   /api/auth/passkeys/register           (signed in) {challengeId, credential, name}
//   POST   /api/auth/passkeys/login/options      -> request options
//   POST   /api/auth/passkeys/login              {challengeId, credential, device, deviceId}
//   GET    /api/auth/passkeys                    (signed in) -> {passkeys}
//   DELETE /api/auth/passkeys/:id                (signed in)

import { HttpError, json, readJson } from './http.js';
import { base64url, newId, randomToken } from './crypto.js';
import { verifyRegistration, verifyAssertion, WebAuthnError, ALGS } from './webauthn.js';
import { startSession } from './auth.js';
import { audit } from './entitlements.js';

const iso = (ms) => new Date(ms).toISOString();
const CHALLENGE_MS = 5 * 60 * 1000;
const MAX_PASSKEYS = 20;
const enc = new TextEncoder();

const site = (request) => { const u = new URL(request.url); return { origin: u.origin, rpId: u.hostname }; };
const userHandle = (userId) => base64url(enc.encode(userId));

async function newChallenge(env, now, purpose, userId = null) {
  const id = newId('wac');
  const challenge = randomToken(32);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM webauthn_challenges WHERE expires_at < ?').bind(iso(now())),
    env.DB.prepare('INSERT INTO webauthn_challenges (id, user_id, purpose, challenge, expires_at) VALUES (?, ?, ?, ?, ?)').bind(id, userId, purpose, challenge, iso(now() + CHALLENGE_MS)),
  ]);
  return { id, challenge };
}

/** Takes (and burns) a challenge: single use, unexpired, right purpose. */
async function takeChallenge(env, now, id, purpose, userId = null) {
  const row = await env.DB.prepare('SELECT * FROM webauthn_challenges WHERE id = ?').bind(String(id || '')).first();
  if (row) await env.DB.prepare('DELETE FROM webauthn_challenges WHERE id = ?').bind(row.id).run();
  if (!row || row.purpose !== purpose || row.expires_at <= iso(now()) || (userId && row.user_id !== userId)) {
    throw new HttpError(400, 'bad_challenge', 'That passkey request expired. Try again.');
  }
  return row;
}

const asHttp = (fn) => async (...args) => {
  try { return await fn(...args); } catch (err) {
    if (err instanceof WebAuthnError) throw new HttpError(400, err.code, err.message);
    throw err;
  }
};

export async function passkeyRegisterOptions(request, { env, now }, { user }) {
  const { id, challenge } = await newChallenge(env, now, 'register', user.id);
  const { rpId } = site(request);
  const { results } = await env.DB.prepare('SELECT id, transports FROM passkeys WHERE user_id = ?').bind(user.id).all();
  return json({
    challengeId: id,
    publicKey: {
      challenge,
      rp: { id: rpId, name: 'GMAtlas' },
      user: { id: userHandle(user.id), name: user.email, displayName: user.display_name || user.email },
      pubKeyCredParams: [{ type: 'public-key', alg: ALGS.ES256 }, { type: 'public-key', alg: ALGS.RS256 }],
      authenticatorSelection: { residentKey: 'required', requireResidentKey: true, userVerification: 'preferred' },
      attestation: 'none',
      excludeCredentials: results.map((p) => ({ type: 'public-key', id: p.id, transports: JSON.parse(p.transports) })),
      timeout: CHALLENGE_MS,
    },
  });
}

export const passkeyRegister = asHttp(async (request, { env, now }, { user }) => {
  const body = await readJson(request, 64 * 1024);
  const row = await takeChallenge(env, now, body.challengeId, 'register', user.id);
  const cred = await verifyRegistration(body.credential, { challenge: row.challenge, ...site(request) });
  const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM passkeys WHERE user_id = ?').bind(user.id).first();
  if (count.n >= MAX_PASSKEYS) throw new HttpError(400, 'too_many_passkeys', `At most ${MAX_PASSKEYS} passkeys per account.`);
  if (await env.DB.prepare('SELECT 1 AS x FROM passkeys WHERE id = ?').bind(cred.id).first()) throw new HttpError(409, 'passkey_exists', 'That passkey is already registered.');
  const transports = Array.isArray(body.credential.transports) ? body.credential.transports.filter((t) => typeof t === 'string').slice(0, 8) : [];
  const name = String(body.name || '').trim().slice(0, 60) || 'Passkey';
  const at = iso(now());
  await env.DB.prepare('INSERT INTO passkeys (id, user_id, public_key, alg, sign_count, transports, name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(cred.id, user.id, JSON.stringify(cred.jwk), cred.alg, cred.signCount, JSON.stringify(transports), name, at).run();
  await audit(env, at, user.id, 'passkey.add', 'passkey', cred.id, null, { name });
  return json({ ok: true, passkey: { id: cred.id, name, createdAt: at } });
});

export async function passkeyLoginOptions(request, { env, now }) {
  const { id, challenge } = await newChallenge(env, now, 'login');
  return json({ challengeId: id, publicKey: { challenge, rpId: site(request).rpId, userVerification: 'preferred', allowCredentials: [], timeout: CHALLENGE_MS } });
}

export const passkeyLogin = asHttp(async (request, { env, now }) => {
  const body = await readJson(request, 64 * 1024);
  const row = await takeChallenge(env, now, body.challengeId, 'login');
  const credId = String((body.credential && body.credential.id) || '');
  const stored = await env.DB.prepare('SELECT * FROM passkeys WHERE id = ?').bind(credId).first();
  const unknown = new HttpError(400, 'unknown_passkey', 'That passkey isn’t registered here. Sign in with your email, then add it again.');
  if (!stored) throw unknown;
  const result = await verifyAssertion(body.credential, { alg: stored.alg, jwk: JSON.parse(stored.public_key), signCount: stored.sign_count }, { challenge: row.challenge, ...site(request) });
  if (result.userHandle && result.userHandle !== stored.user_id) throw unknown;
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(stored.user_id).first();
  if (!user) throw unknown;
  await env.DB.prepare('UPDATE passkeys SET sign_count = ?, last_used_at = ? WHERE id = ?').bind(result.signCount, iso(now()), stored.id).run();
  const done = await startSession(env, now, user, body.device, body.deviceId);
  return json({ ...done.body, newAccount: false }, 200, { 'set-cookie': done.cookie });
});

export async function listPasskeys(request, { env }, { user }) {
  const { results } = await env.DB.prepare('SELECT id, name, created_at, last_used_at FROM passkeys WHERE user_id = ? ORDER BY created_at').bind(user.id).all();
  return json({ passkeys: results.map((p) => ({ id: p.id, name: p.name, createdAt: p.created_at, lastUsedAt: p.last_used_at })) });
}

export async function deletePasskey(request, { env, now }, { user }, id) {
  const row = await env.DB.prepare('SELECT * FROM passkeys WHERE id = ? AND user_id = ?').bind(id, user.id).first();
  if (!row) throw new HttpError(404, 'not_found', 'No such passkey.');
  await env.DB.prepare('DELETE FROM passkeys WHERE id = ?').bind(id).run();
  await audit(env, iso(now()), user.id, 'passkey.remove', 'passkey', id, { name: row.name }, null);
  return json({ ok: true });
}
