// worker.js — the GMAtlas service entry point (Cloudflare Workers module
// syntax; tests call the same `fetch`). `/api/*` is handled here; anything
// else goes to the static app (`env.ASSETS`), so the app and its API share
// one origin (roadmap 2.1: the refresh cookie can then be HttpOnly and
// SameSite=Strict, with no CORS at all).
//
// Bindings (wrangler.toml / secrets):
//   DB                   D1 database (migrations/)
//   ASSETS               static app assets (optional in tests)
//   ACCESS_TOKEN_SECRET  secret: HMAC key for access tokens
//   CODE_PEPPER          secret: mixed into stored sign-in code hashes
//   CERT_SIGNING_JWK     secret: ECDSA P-256 private JWK (npm run keygen)
//   CERT_KEY_ID          id of that key, pinned with its public half in the app
//   RESEND_API_KEY, MAIL_FROM   email delivery (or MAIL_MODE=log in development)

import { HttpError, json, errorResponse } from './http.js';
import { startEmailSignIn, verifyEmailSignIn, refreshSession, signOut, requireAuth } from './auth.js';
import { getMe, updateMe, listDevices, updateDevice, revokeDevice } from './account.js';
import { getCertificate, attestLicenses, deactivateLicense } from './entitlements.js';
import { importSigningKey } from './crypto.js';
import { mailerFrom } from './mail.js';

// [method, pattern, handler, needsAuth]
const ROUTES = [
  ['POST', /^\/api\/auth\/email\/start$/, startEmailSignIn, false],
  ['POST', /^\/api\/auth\/email\/verify$/, verifyEmailSignIn, false],
  ['POST', /^\/api\/auth\/refresh$/, refreshSession, false],
  ['POST', /^\/api\/auth\/signout$/, signOut, false],
  ['GET', /^\/api\/me$/, getMe, true],
  ['PATCH', /^\/api\/me$/, updateMe, true],
  ['GET', /^\/api\/devices$/, listDevices, true],
  ['PATCH', /^\/api\/devices\/([\w-]+)$/, updateDevice, true],
  ['DELETE', /^\/api\/devices\/([\w-]+)$/, revokeDevice, true],
  ['GET', /^\/api\/entitlements$/, getCertificate, true],
  ['POST', /^\/api\/entitlements\/attest$/, attestLicenses, true],
  ['DELETE', /^\/api\/entitlements\/licenses\/([\w-]+)$/, deactivateLicense, true],
];

/** Wraps the raw bindings with what handlers need: a clock, the mailer, and
 *  the signing key (imported once per isolate). */
function context(env) {
  let signingKey = null;
  const wrapped = {
    ...env,
    MAILER: env.MAILER || mailerFrom(env),
    certSigningKey: async () => (signingKey ||= await importSigningKey(JSON.parse(env.CERT_SIGNING_JWK))),
  };
  return { env: wrapped, now: env.now || (() => Date.now()) };
}

export async function handleApi(request, env) {
  const url = new URL(request.url);
  // State-changing calls from another site are refused outright (the
  // SameSite cookie already blocks them; this is the second lock).
  const origin = request.headers.get('origin');
  if (request.method !== 'GET' && origin && origin !== url.origin) {
    return errorResponse(new HttpError(403, 'bad_origin', 'Cross-site request refused.'));
  }
  const ctx = context(env);
  try {
    let allowed = null;
    for (const [method, pattern, handler, needsAuth] of ROUTES) {
      const m = pattern.exec(url.pathname);
      if (!m) continue;
      if (method !== request.method) { allowed = allowed || []; allowed.push(method); continue; }
      const params = m.slice(1);
      if (!needsAuth) return await handler(request, ctx, ...params);
      const caller = await requireAuth(request, ctx);
      return await handler(request, ctx, caller, ...params);
    }
    if (allowed) return json({ error: 'method_not_allowed' }, 405, { allow: allowed.join(', ') });
    return json({ error: 'not_found' }, 404);
  } catch (err) {
    return errorResponse(err);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handleApi(request, env);
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },
};
