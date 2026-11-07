// auth.js — passwordless sign-in and sessions (roadmap section 3).
//
//   POST /api/auth/email/start   {email}                       -> mails a 6-digit code
//   POST /api/auth/email/verify  {email, code, device, deviceId?} -> access token + refresh cookie
//   POST /api/auth/refresh       (refresh cookie)              -> new access token, rotated cookie
//   POST /api/auth/signout       (refresh cookie)              -> ends this device's session
//
// Access tokens are short-lived (15 min) and live only in the client's
// memory. The refresh token is an HttpOnly cookie, stored server-side only
// as a hash and rotated on every use; presenting an already-rotated token
// means it was copied, so the whole session ends.

import { HttpError, json, readJson, readCookie, cookie } from './http.js';
import { newId, randomCode, randomToken, sha256Hex, safeEqual, signAccessToken, verifyAccessToken } from './crypto.js';
import { clientKey, enforce, record } from './rateLimit.js';

export const REFRESH_COOKIE = 'gm_refresh';
const CODE_TTL_MS = 10 * 60 * 1000;
const CODE_MAX_ATTEMPTS = 5;
const CODES_PER_EMAIL_PER_HOUR = 5;
const CODES_PER_IP_PER_HOUR = 20;
const WRONG_CODES_PER_IP_PER_HOUR = 30;
const HOUR_MS = 60 * 60 * 1000;
const SESSION_TTL_MS = 60 * 24 * 60 * 60 * 1000;

const iso = (ms) => new Date(ms).toISOString();

export function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'bad_email', 'Enter a valid email address.');
  return email;
}

function codeHash(email, code, env) {
  return sha256Hex(`${email}:${code}:${env.CODE_PEPPER}`);
}

export async function startEmailSignIn(request, { env, now }) {
  const { email: raw } = await readJson(request);
  const email = normalizeEmail(raw);
  // Per client as well as per address, so one machine can't mail codes to
  // a long list of addresses.
  const ipBucket = `code:${await clientKey(request, env)}`;
  await enforce(env, now(), ipBucket, CODES_PER_IP_PER_HOUR, HOUR_MS, 'too_many_codes', 'Too many sign-in codes requested from this network. Try again in an hour.');
  const since = iso(now() - 60 * 60 * 1000);
  const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM email_codes WHERE email = ? AND created_at > ?').bind(email, since).first();
  if (recent.n >= CODES_PER_EMAIL_PER_HOUR) throw new HttpError(429, 'too_many_codes', 'Too many codes requested. Try again in an hour.');
  const code = randomCode();
  await record(env, now(), ipBucket);
  await env.DB.prepare('INSERT INTO email_codes (id, email, code_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(newId('code'), email, await codeHash(email, code, env), iso(now() + CODE_TTL_MS), iso(now())).run();
  await env.MAILER.send({
    to: email,
    subject: `Your GMAtlas sign-in code: ${code}`,
    text: `Your GMAtlas sign-in code is ${code}\n\nIt expires in 10 minutes. If you didn't ask for it, you can ignore this email.`,
  });
  // Same answer whether or not an account exists for this address.
  return json({ ok: true });
}

function cleanDevice(device) {
  const name = String((device && device.name) || '').trim().slice(0, 60) || 'Browser';
  const platform = String((device && device.platform) || '').trim().slice(0, 60) || null;
  return { name, platform };
}

async function findOrCreateUser(env, email, nowIso) {
  const existing = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
  if (existing) {
    if (existing.status !== 'active') throw new HttpError(403, 'account_disabled', 'This account is disabled.');
    return { user: existing, created: false };
  }
  const id = newId('usr');
  await env.DB.batch([
    env.DB.prepare('INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)').bind(id, email, nowIso),
    env.DB.prepare('INSERT INTO identities (user_id, provider, subject, created_at) VALUES (?, ?, ?, ?)').bind(id, 'email', email, nowIso),
  ]);
  return { user: await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first(), created: true };
}

async function issueSession(env, now, user, device) {
  const refresh = randomToken(32);
  const sessionId = newId('ses');
  await env.DB.prepare('INSERT INTO sessions (id, device_id, user_id, refresh_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(sessionId, device.id, user.id, await sha256Hex(refresh), iso(now() + SESSION_TTL_MS), iso(now())).run();
  const accessToken = await signAccessToken({ sub: user.id, did: device.id, sid: sessionId }, env.ACCESS_TOKEN_SECRET, now());
  return { accessToken, refresh };
}

export function publicUser(user) {
  return { id: user.id, email: user.email, displayName: user.display_name || null, roles: JSON.parse(user.roles || '[]') };
}

export function publicDevice(device, currentId) {
  return {
    id: device.id, name: device.name, platform: device.platform,
    policy: JSON.parse(device.policy), createdAt: device.created_at, lastSeenAt: device.last_seen_at,
    current: device.id === currentId,
  };
}

export async function verifyEmailSignIn(request, { env, now }) {
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  const code = String(body.code || '').trim();
  const row = await env.DB.prepare('SELECT * FROM email_codes WHERE email = ? AND used_at IS NULL AND expires_at > ? ORDER BY created_at DESC LIMIT 1')
    .bind(email, iso(now())).first();
  const wrong = new HttpError(400, 'bad_code', 'That code is wrong or has expired. Request a new one.');
  // Wrong guesses are counted per client too, so guessing across many
  // addresses (5 tries each) is capped as well.
  const guessBucket = `guess:${await clientKey(request, env)}`;
  await enforce(env, now(), guessBucket, WRONG_CODES_PER_IP_PER_HOUR, HOUR_MS, 'too_many_attempts', 'Too many wrong codes from this network. Try again in an hour.');
  if (!row) { await record(env, now(), guessBucket); throw wrong; }
  if (row.attempts >= CODE_MAX_ATTEMPTS) throw new HttpError(429, 'too_many_attempts', 'Too many wrong codes. Request a new one.');
  await env.DB.prepare('UPDATE email_codes SET attempts = attempts + 1 WHERE id = ?').bind(row.id).run();
  if (!/^\d{6}$/.test(code) || !safeEqual(await codeHash(email, code, env), row.code_hash)) { await record(env, now(), guessBucket); throw wrong; }
  await env.DB.prepare('UPDATE email_codes SET used_at = ? WHERE id = ?').bind(iso(now()), row.id).run();

  const nowIso = iso(now());
  const { user, created } = await findOrCreateUser(env, email, nowIso);
  // Signing in again on the same browser reuses its device record.
  let device = null;
  if (body.deviceId) {
    device = await env.DB.prepare('SELECT * FROM devices WHERE id = ? AND user_id = ? AND revoked_at IS NULL').bind(String(body.deviceId), user.id).first();
  }
  if (!device) {
    const { name, platform } = cleanDevice(body.device);
    const id = newId('dev');
    await env.DB.prepare('INSERT INTO devices (id, user_id, name, platform, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, user.id, name, platform, nowIso, nowIso).run();
    device = await env.DB.prepare('SELECT * FROM devices WHERE id = ?').bind(id).first();
  } else {
    await env.DB.prepare('UPDATE devices SET last_seen_at = ? WHERE id = ?').bind(nowIso, device.id).run();
  }
  const { accessToken, refresh } = await issueSession(env, now, user, device);
  return json(
    { accessToken, newAccount: created, user: publicUser(user), device: publicDevice(device, device.id) },
    200,
    { 'set-cookie': cookie(REFRESH_COOKIE, refresh, { maxAgeSeconds: SESSION_TTL_MS / 1000 }) },
  );
}

export async function refreshSession(request, { env, now }) {
  const token = readCookie(request, REFRESH_COOKIE);
  const expired = new HttpError(401, 'signed_out', 'Please sign in again.');
  if (!token) throw expired;
  const hash = await sha256Hex(token);
  const session = await env.DB.prepare('SELECT * FROM sessions WHERE refresh_hash = ?').bind(hash).first();
  if (!session) {
    // An already-rotated token coming back means it was copied: end that session.
    const reused = await env.DB.prepare('SELECT id FROM sessions WHERE prev_hash = ? AND revoked_at IS NULL').bind(hash).first();
    if (reused) await env.DB.prepare('UPDATE sessions SET revoked_at = ? WHERE id = ?').bind(iso(now()), reused.id).run();
    throw expired;
  }
  if (session.revoked_at || session.expires_at <= iso(now())) throw expired;
  const device = await env.DB.prepare('SELECT * FROM devices WHERE id = ?').bind(session.device_id).first();
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(session.user_id).first();
  if (!device || device.revoked_at || !user || user.status !== 'active') throw expired;

  const next = randomToken(32);
  await env.DB.batch([
    env.DB.prepare('UPDATE sessions SET refresh_hash = ?, prev_hash = ?, expires_at = ? WHERE id = ?')
      .bind(await sha256Hex(next), hash, iso(now() + SESSION_TTL_MS), session.id),
    env.DB.prepare('UPDATE devices SET last_seen_at = ? WHERE id = ?').bind(iso(now()), device.id),
  ]);
  const accessToken = await signAccessToken({ sub: user.id, did: device.id, sid: session.id }, env.ACCESS_TOKEN_SECRET, now());
  return json(
    { accessToken, user: publicUser(user), device: publicDevice(device, device.id) },
    200,
    { 'set-cookie': cookie(REFRESH_COOKIE, next, { maxAgeSeconds: SESSION_TTL_MS / 1000 }) },
  );
}

export async function signOut(request, { env, now }) {
  const token = readCookie(request, REFRESH_COOKIE);
  if (token) {
    await env.DB.prepare('UPDATE sessions SET revoked_at = ? WHERE refresh_hash = ? AND revoked_at IS NULL').bind(iso(now()), await sha256Hex(token)).run();
  }
  return json({ ok: true }, 200, { 'set-cookie': cookie(REFRESH_COOKIE, '', { maxAgeSeconds: 0 }) });
}

/** The signed-in caller, from the bearer access token. Checks the session
 *  and device are still live, so a remote sign-out takes effect at once
 *  rather than when the token expires. */
export async function requireAuth(request, { env, now }) {
  const header = request.headers.get('authorization') || '';
  const claims = header.startsWith('Bearer ') ? await verifyAccessToken(header.slice(7), env.ACCESS_TOKEN_SECRET, now()) : null;
  const unauthorized = new HttpError(401, 'signed_out', 'Please sign in again.');
  // A socket ticket (typ 'ws') is not an access token.
  if (!claims || claims.typ) throw unauthorized;
  const session = await env.DB.prepare('SELECT revoked_at FROM sessions WHERE id = ?').bind(claims.sid).first();
  if (!session || session.revoked_at) throw unauthorized;
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(claims.sub).first();
  const device = await env.DB.prepare('SELECT * FROM devices WHERE id = ?').bind(claims.did).first();
  if (!user || user.status !== 'active' || !device || device.revoked_at) throw unauthorized;
  return { user, device };
}
