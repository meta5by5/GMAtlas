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
import {
  putDeviceKey, getVault, createVault, approveDevice, getRecovery, putOwnWrap, resetVault, emailRecoveryKey, putRecovery,
  listCampaigns, createCampaign, updateCampaignMeta, deleteCampaign, getSnapshot, putSnapshot,
  issueTicket, openSocket, getAccountSettings, putAccountSettings,
} from './sync.js';

import {
  adminMe, searchUsers, getUser, setUserStatus, revokeSessions, setUserRoles,
  grantEntitlement, bulkGrant, revokeEntitlement, extendEntitlement, convertEntitlement,
  listFlags, putFlag, listAudit,
} from './admin.js';

// The Durable Object class must be exported from the Worker's entry module.
export { CampaignRoom } from './room.js';

// [method, pattern, handler, needsAuth]
/** GET /api/health -> which environment answered (deploy checks). */
async function health(request, { env }) {
  return json({ ok: true, env: env.GMATLAS_ENV || 'dev' });
}

const ROUTES = [
  ['GET', /^\/api\/health$/, health, false],
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
  // Personal sync (Phase S2)
  ['PUT', /^\/api\/devices\/key$/, putDeviceKey, true],
  ['GET', /^\/api\/vault$/, getVault, true],
  ['POST', /^\/api\/vault$/, createVault, true],
  ['DELETE', /^\/api\/vault$/, resetVault, true],
  ['PUT', /^\/api\/vault\/devices\/([\w-]+)$/, approveDevice, true],
  ['GET', /^\/api\/vault\/recovery$/, getRecovery, true],
  ['PUT', /^\/api\/vault\/mine$/, putOwnWrap, true],
  ['PUT', /^\/api\/vault\/recovery$/, putRecovery, true],
  ['POST', /^\/api\/vault\/recovery\/email$/, emailRecoveryKey, true],
  ['GET', /^\/api\/campaigns$/, listCampaigns, true],
  ['POST', /^\/api\/campaigns$/, createCampaign, true],
  ['PATCH', /^\/api\/campaigns\/([\w-]+)$/, updateCampaignMeta, true],
  ['DELETE', /^\/api\/campaigns\/([\w-]+)$/, deleteCampaign, true],
  ['GET', /^\/api\/campaigns\/([\w-]+)\/snapshot$/, getSnapshot, true],
  ['PUT', /^\/api\/campaigns\/([\w-]+)\/snapshot$/, putSnapshot, true],
  ['GET', /^\/api\/account\/settings$/, getAccountSettings, true],
  ['PUT', /^\/api\/account\/settings$/, putAccountSettings, true],
  ['POST', /^\/api\/sync\/ticket$/, issueTicket, true],
  // Admin v1 (src/admin.js; every handler checks the caller's role)
  ['GET', /^\/api\/admin\/me$/, adminMe, true],
  ['GET', /^\/api\/admin\/users$/, searchUsers, true],
  ['GET', /^\/api\/admin\/users\/([\w-]+)$/, getUser, true],
  ['POST', /^\/api\/admin\/users\/([\w-]+)\/status$/, setUserStatus, true],
  ['POST', /^\/api\/admin\/users\/([\w-]+)\/sessions\/revoke$/, revokeSessions, true],
  ['PUT', /^\/api\/admin\/users\/([\w-]+)\/roles$/, setUserRoles, true],
  ['POST', /^\/api\/admin\/users\/([\w-]+)\/entitlements$/, grantEntitlement, true],
  ['POST', /^\/api\/admin\/entitlements\/bulk$/, bulkGrant, true],
  ['POST', /^\/api\/admin\/entitlements\/([\w-]+)\/revoke$/, revokeEntitlement, true],
  ['POST', /^\/api\/admin\/entitlements\/([\w-]+)\/extend$/, extendEntitlement, true],
  ['POST', /^\/api\/admin\/entitlements\/([\w-]+)\/convert$/, convertEntitlement, true],
  ['GET', /^\/api\/admin\/flags$/, listFlags, true],
  ['PUT', /^\/api\/admin\/flags\/([\w.-]+)$/, putFlag, true],
  ['GET', /^\/api\/admin\/audit$/, listAudit, true],
  ['GET', /^\/api\/sync\/socket$/, openSocket, false],
];

// The imported signing key, cached per isolate (keyed by the secret's text,
// so a test or a rotated secret gets its own).
const signingKeys = new Map();
function signingKeyFor(jwkText) {
  if (!jwkText) throw new HttpError(500, 'not_configured', 'Certificate signing key is not configured.');
  if (!signingKeys.has(jwkText)) {
    const pending = Promise.resolve().then(() => importSigningKey(JSON.parse(jwkText)));
    pending.catch(() => signingKeys.delete(jwkText));
    signingKeys.set(jwkText, pending);
  }
  return signingKeys.get(jwkText);
}

/** Wraps the raw bindings with what handlers need: a clock, the mailer, and
 *  the signing key. */
function context(env) {
  const wrapped = {
    ...env,
    MAILER: env.MAILER || mailerFrom(env),
    certSigningKey: () => signingKeyFor(env.CERT_SIGNING_JWK),
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
