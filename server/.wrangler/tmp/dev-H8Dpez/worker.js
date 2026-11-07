var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/http.js
var HttpError = class extends Error {
  static {
    __name(this, "HttpError");
  }
  constructor(status, code, message) {
    super(message || code);
    this.status = status;
    this.code = code;
  }
};
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
  });
}
__name(json, "json");
function errorResponse(err) {
  if (err instanceof HttpError) return json({ error: err.code, message: err.message }, err.status);
  console.error("unhandled server error", err);
  return json({ error: "server_error", message: "Something went wrong." }, 500);
}
__name(errorResponse, "errorResponse");
var MAX_BODY_BYTES = 16 * 1024;
async function readJson(request) {
  const type = request.headers.get("content-type") || "";
  if (!type.includes("application/json")) throw new HttpError(415, "unsupported_media_type", "Send JSON.");
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, "body_too_large", "Request body is too large.");
  let data;
  try {
    data = JSON.parse(text || "{}");
  } catch {
    throw new HttpError(400, "bad_json", "Request body is not valid JSON.");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new HttpError(400, "bad_json", "Request body must be a JSON object.");
  return data;
}
__name(readJson, "readJson");
function readCookie(request, name) {
  const header = request.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}
__name(readCookie, "readCookie");
function cookie(name, value, { maxAgeSeconds, path = "/api/auth" } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, "HttpOnly", "Secure", "SameSite=Strict"];
  if (maxAgeSeconds !== void 0) parts.push(`Max-Age=${maxAgeSeconds}`);
  return parts.join("; ");
}
__name(cookie, "cookie");

// src/crypto.js
var enc = new TextEncoder();
function base64url(bytes) {
  let bin = "";
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
__name(base64url, "base64url");
function fromBase64url(text) {
  const b64 = String(text).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - b64.length % 4) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
__name(fromBase64url, "fromBase64url");
function randomToken(bytes = 32) {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}
__name(randomToken, "randomToken");
function newId(prefix) {
  return `${prefix}_${randomToken(12)}`;
}
__name(newId, "newId");
function randomCode() {
  const max = 4294967296 - 4294967296 % 1e6;
  let n;
  do {
    n = crypto.getRandomValues(new Uint32Array(1))[0];
  } while (n >= max);
  return String(n % 1e6).padStart(6, "0");
}
__name(randomCode, "randomCode");
async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha256Hex, "sha256Hex");
function safeEqual(a, b) {
  const x = String(a);
  const y = String(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x.charCodeAt(i) || 0) ^ (y.charCodeAt(i) || 0);
  return diff === 0;
}
__name(safeEqual, "safeEqual");
async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
__name(hmacKey, "hmacKey");
async function signAccessToken(claims, secret, nowMs, ttlSeconds = 900) {
  const header = base64url(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const iat = Math.floor(nowMs / 1e3);
  const body = base64url(enc.encode(JSON.stringify({ ...claims, iat, exp: iat + ttlSeconds })));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(`${header}.${body}`));
  return `${header}.${body}.${base64url(sig)}`;
}
__name(signAccessToken, "signAccessToken");
async function verifyAccessToken(token, secret, nowMs) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  let ok = false;
  try {
    ok = await crypto.subtle.verify("HMAC", await hmacKey(secret), fromBase64url(sig), enc.encode(`${header}.${body}`));
  } catch {
    return null;
  }
  if (!ok) return null;
  let claims;
  try {
    claims = JSON.parse(new TextDecoder().decode(fromBase64url(body)));
  } catch {
    return null;
  }
  if (!claims || typeof claims.exp !== "number" || claims.exp * 1e3 <= nowMs) return null;
  return claims;
}
__name(verifyAccessToken, "verifyAccessToken");
function importSigningKey(privateJwk) {
  return crypto.subtle.importKey("jwk", privateJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}
__name(importSigningKey, "importSigningKey");
async function signCertificate(payloadObject, signingKey) {
  const payload = JSON.stringify(payloadObject);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, signingKey, enc.encode(payload));
  return { payload, sig: base64url(sig) };
}
__name(signCertificate, "signCertificate");

// src/auth.js
var REFRESH_COOKIE = "gm_refresh";
var CODE_TTL_MS = 10 * 60 * 1e3;
var CODE_MAX_ATTEMPTS = 5;
var CODES_PER_EMAIL_PER_HOUR = 5;
var SESSION_TTL_MS = 60 * 24 * 60 * 60 * 1e3;
var iso = /* @__PURE__ */ __name((ms) => new Date(ms).toISOString(), "iso");
function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "bad_email", "Enter a valid email address.");
  return email;
}
__name(normalizeEmail, "normalizeEmail");
function codeHash(email, code, env) {
  return sha256Hex(`${email}:${code}:${env.CODE_PEPPER}`);
}
__name(codeHash, "codeHash");
async function startEmailSignIn(request, { env, now }) {
  const { email: raw } = await readJson(request);
  const email = normalizeEmail(raw);
  const since = iso(now() - 60 * 60 * 1e3);
  const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM email_codes WHERE email = ? AND created_at > ?").bind(email, since).first();
  if (recent.n >= CODES_PER_EMAIL_PER_HOUR) throw new HttpError(429, "too_many_codes", "Too many codes requested. Try again in an hour.");
  const code = randomCode();
  await env.DB.prepare("INSERT INTO email_codes (id, email, code_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)").bind(newId("code"), email, await codeHash(email, code, env), iso(now() + CODE_TTL_MS), iso(now())).run();
  await env.MAILER.send({
    to: email,
    subject: `Your GMAtlas sign-in code: ${code}`,
    text: `Your GMAtlas sign-in code is ${code}

It expires in 10 minutes. If you didn't ask for it, you can ignore this email.`
  });
  return json({ ok: true });
}
__name(startEmailSignIn, "startEmailSignIn");
function cleanDevice(device) {
  const name = String(device && device.name || "").trim().slice(0, 60) || "Browser";
  const platform = String(device && device.platform || "").trim().slice(0, 60) || null;
  return { name, platform };
}
__name(cleanDevice, "cleanDevice");
async function findOrCreateUser(env, email, nowIso) {
  const existing = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
  if (existing) {
    if (existing.status !== "active") throw new HttpError(403, "account_disabled", "This account is disabled.");
    return { user: existing, created: false };
  }
  const id = newId("usr");
  await env.DB.batch([
    env.DB.prepare("INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)").bind(id, email, nowIso),
    env.DB.prepare("INSERT INTO identities (user_id, provider, subject, created_at) VALUES (?, ?, ?, ?)").bind(id, "email", email, nowIso)
  ]);
  return { user: await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first(), created: true };
}
__name(findOrCreateUser, "findOrCreateUser");
async function issueSession(env, now, user, device) {
  const refresh = randomToken(32);
  const sessionId = newId("ses");
  await env.DB.prepare("INSERT INTO sessions (id, device_id, user_id, refresh_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(sessionId, device.id, user.id, await sha256Hex(refresh), iso(now() + SESSION_TTL_MS), iso(now())).run();
  const accessToken = await signAccessToken({ sub: user.id, did: device.id, sid: sessionId }, env.ACCESS_TOKEN_SECRET, now());
  return { accessToken, refresh };
}
__name(issueSession, "issueSession");
function publicUser(user) {
  return { id: user.id, email: user.email, displayName: user.display_name || null, roles: JSON.parse(user.roles || "[]") };
}
__name(publicUser, "publicUser");
function publicDevice(device, currentId) {
  return {
    id: device.id,
    name: device.name,
    platform: device.platform,
    policy: JSON.parse(device.policy),
    createdAt: device.created_at,
    lastSeenAt: device.last_seen_at,
    current: device.id === currentId
  };
}
__name(publicDevice, "publicDevice");
async function verifyEmailSignIn(request, { env, now }) {
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  const code = String(body.code || "").trim();
  const row = await env.DB.prepare("SELECT * FROM email_codes WHERE email = ? AND used_at IS NULL AND expires_at > ? ORDER BY created_at DESC LIMIT 1").bind(email, iso(now())).first();
  const wrong = new HttpError(400, "bad_code", "That code is wrong or has expired. Request a new one.");
  if (!row) throw wrong;
  if (row.attempts >= CODE_MAX_ATTEMPTS) throw new HttpError(429, "too_many_attempts", "Too many wrong codes. Request a new one.");
  await env.DB.prepare("UPDATE email_codes SET attempts = attempts + 1 WHERE id = ?").bind(row.id).run();
  if (!/^\d{6}$/.test(code) || !safeEqual(await codeHash(email, code, env), row.code_hash)) throw wrong;
  await env.DB.prepare("UPDATE email_codes SET used_at = ? WHERE id = ?").bind(iso(now()), row.id).run();
  const nowIso = iso(now());
  const { user, created } = await findOrCreateUser(env, email, nowIso);
  let device = null;
  if (body.deviceId) {
    device = await env.DB.prepare("SELECT * FROM devices WHERE id = ? AND user_id = ? AND revoked_at IS NULL").bind(String(body.deviceId), user.id).first();
  }
  if (!device) {
    const { name, platform } = cleanDevice(body.device);
    const id = newId("dev");
    await env.DB.prepare("INSERT INTO devices (id, user_id, name, platform, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)").bind(id, user.id, name, platform, nowIso, nowIso).run();
    device = await env.DB.prepare("SELECT * FROM devices WHERE id = ?").bind(id).first();
  } else {
    await env.DB.prepare("UPDATE devices SET last_seen_at = ? WHERE id = ?").bind(nowIso, device.id).run();
  }
  const { accessToken, refresh } = await issueSession(env, now, user, device);
  return json(
    { accessToken, newAccount: created, user: publicUser(user), device: publicDevice(device, device.id) },
    200,
    { "set-cookie": cookie(REFRESH_COOKIE, refresh, { maxAgeSeconds: SESSION_TTL_MS / 1e3 }) }
  );
}
__name(verifyEmailSignIn, "verifyEmailSignIn");
async function refreshSession(request, { env, now }) {
  const token = readCookie(request, REFRESH_COOKIE);
  const expired = new HttpError(401, "signed_out", "Please sign in again.");
  if (!token) throw expired;
  const hash = await sha256Hex(token);
  const session = await env.DB.prepare("SELECT * FROM sessions WHERE refresh_hash = ?").bind(hash).first();
  if (!session) {
    const reused = await env.DB.prepare("SELECT id FROM sessions WHERE prev_hash = ? AND revoked_at IS NULL").bind(hash).first();
    if (reused) await env.DB.prepare("UPDATE sessions SET revoked_at = ? WHERE id = ?").bind(iso(now()), reused.id).run();
    throw expired;
  }
  if (session.revoked_at || session.expires_at <= iso(now())) throw expired;
  const device = await env.DB.prepare("SELECT * FROM devices WHERE id = ?").bind(session.device_id).first();
  const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(session.user_id).first();
  if (!device || device.revoked_at || !user || user.status !== "active") throw expired;
  const next = randomToken(32);
  await env.DB.batch([
    env.DB.prepare("UPDATE sessions SET refresh_hash = ?, prev_hash = ?, expires_at = ? WHERE id = ?").bind(await sha256Hex(next), hash, iso(now() + SESSION_TTL_MS), session.id),
    env.DB.prepare("UPDATE devices SET last_seen_at = ? WHERE id = ?").bind(iso(now()), device.id)
  ]);
  const accessToken = await signAccessToken({ sub: user.id, did: device.id, sid: session.id }, env.ACCESS_TOKEN_SECRET, now());
  return json(
    { accessToken, user: publicUser(user), device: publicDevice(device, device.id) },
    200,
    { "set-cookie": cookie(REFRESH_COOKIE, next, { maxAgeSeconds: SESSION_TTL_MS / 1e3 }) }
  );
}
__name(refreshSession, "refreshSession");
async function signOut(request, { env, now }) {
  const token = readCookie(request, REFRESH_COOKIE);
  if (token) {
    await env.DB.prepare("UPDATE sessions SET revoked_at = ? WHERE refresh_hash = ? AND revoked_at IS NULL").bind(iso(now()), await sha256Hex(token)).run();
  }
  return json({ ok: true }, 200, { "set-cookie": cookie(REFRESH_COOKIE, "", { maxAgeSeconds: 0 }) });
}
__name(signOut, "signOut");
async function requireAuth(request, { env, now }) {
  const header = request.headers.get("authorization") || "";
  const claims = header.startsWith("Bearer ") ? await verifyAccessToken(header.slice(7), env.ACCESS_TOKEN_SECRET, now()) : null;
  const unauthorized = new HttpError(401, "signed_out", "Please sign in again.");
  if (!claims) throw unauthorized;
  const session = await env.DB.prepare("SELECT revoked_at FROM sessions WHERE id = ?").bind(claims.sid).first();
  if (!session || session.revoked_at) throw unauthorized;
  const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(claims.sub).first();
  const device = await env.DB.prepare("SELECT * FROM devices WHERE id = ?").bind(claims.did).first();
  if (!user || user.status !== "active" || !device || device.revoked_at) throw unauthorized;
  return { user, device };
}
__name(requireAuth, "requireAuth");

// ../src/data/licenses.js
var LICENSES = [
  {
    id: "starforged",
    label: "Ironsworn: Starforged",
    family: "Ironsworn",
    open: true,
    systems: ["starforged"],
    text: "Creative Commons (CC-BY 4.0) \u2014 the default sci-fi rules. Available to any campaign that designates it.",
    docs: [
      "assets/docs/Starforged/Ironsworn-Starforged-rulebook.pdf",
      "assets/docs/Starforged/Starforged-reference-guide.pdf",
      "assets/docs/Starforged/Starsmith-Assets-Mar-5-23.pdf",
      "assets/docs/Starforged/Starsmith-Expanded-Oracles-May-15-23.pdf"
    ]
  },
  {
    id: "ironsworn",
    label: "Ironsworn",
    family: "Ironsworn",
    open: true,
    systems: ["ironsworn"],
    text: "Creative Commons (CC-BY 4.0) \u2014 the default fantasy rules. Available to any campaign that designates it.",
    docs: [
      "assets/docs/ironsworn/Ironsworn-Rulebook.pdf",
      "assets/docs/ironsworn/ironsworn-delve-rulebook-spreads.pdf",
      "assets/docs/ironsworn/Ironsworn-Assets-Master-Set.pdf"
    ]
  },
  {
    id: "fivepfh",
    label: "Core Rules",
    family: "Five Parsecs from Home",
    systems: ["fivepfh"],
    text: "I own Five Parsecs from Home (3rd Edition core rules).",
    docs: ["assets/docs/5PFH/Five Parsecs From Home v3.pdf"]
  },
  {
    id: "fivepfh-compendium",
    label: "Compendium (incl. Bug Hunt)",
    family: "Five Parsecs from Home",
    systems: ["fivepfh-compendium"],
    text: "I own the Five Parsecs from Home Compendium \u2014 a standalone game (Bug Hunt) as well as 5PFH expansions \u2014 and will use its transcribed content for my own personal GM reference, not for redistribution.",
    docs: ["assets/docs/5PFH/Five Parsecs - Compendium Includes Bug Hunt.pdf"]
  },
  {
    id: "planetfall",
    label: "Planetfall",
    family: "Five Parsecs from Home",
    systems: ["planetfall"],
    text: "I own Five Parsecs: Planetfall \u2014 a standalone colony game.",
    docs: ["assets/docs/5PFH/Five Parsecs - Planetfall 1.2.pdf"]
  },
  {
    id: "fiveleagues",
    label: "Core Rules",
    family: "Five Leagues from the Borderlands",
    systems: ["fiveleagues"],
    text: "I own Five Leagues from the Borderlands (3rd Edition) and will use its transcribed content for my own personal GM reference, not for redistribution.",
    docs: [
      "assets/docs/5LFB/five-leagues-from-the-borderlands-3e.pdf",
      "assets/docs/5LFB/5LFB Warband Sheet US.pdf"
    ]
  },
  {
    id: "fiveleagues-compendium",
    label: "Compendium",
    family: "Five Leagues from the Borderlands",
    systems: ["fiveleagues-compendium"],
    text: "I own the Five Leagues from the Borderlands Compendium and will use its transcribed content (Enemy tables, new Origins) for my own personal GM reference, not for redistribution. Its content only applies to a campaign that also uses Five Leagues.",
    docs: ["assets/docs/5LFB/Five Leagues - Compendium_Final_Digital.pdf"]
  },
  {
    id: "hostile",
    label: "Hostile",
    family: "Hostile",
    systems: ["hostile"],
    text: "I own Hostile \u2014 the setting book and its supplements, all under this one license.",
    docs: [
      "assets/docs/Hostile/Hostile setting.pdf",
      "assets/docs/Hostile/Hostile_Introduction_to_HOSTILE3.pdf",
      "assets/docs/Hostile/Hostile_marinecorps8.pdf",
      "assets/docs/Hostile/Hostile_marine-sheet.pdf",
      "assets/docs/Hostile/Hostile_tool-kit9.pdf",
      "assets/docs/Hostile/HOSTILE-TECH2.pdf",
      "assets/docs/Hostile/Hostile_Alien-Breeds3.pdf",
      "assets/docs/Hostile/Hostile_colony-builder4.pdf",
      "assets/docs/Hostile/Hostile_Crew_Expendable3.pdf",
      "assets/docs/Hostile/Hostile_EXPLORERS-2.pdf",
      "assets/docs/Hostile/HOSTILE_SHORTS-001GhostShip.pdf",
      "assets/docs/Hostile/HOSTILE_SHORTS-002Snakehead.pdf",
      "assets/docs/Hostile/HOSTILE_SHORTS-003Repellant.pdf",
      "assets/docs/Hostile/HOSTILE_SHORTS-005OneOfUs.pdf"
    ]
  },
  {
    id: "swn",
    label: "Stars Without Number",
    family: "Without Number",
    systems: ["swn"],
    text: "I own Stars Without Number Revised (Deluxe Edition) and will use its transcribed faction content for my own personal GM reference, not for redistribution.",
    docs: ["assets/docs/WithoutNumber/Stars Without Number Revised - Deluxe Edition.pdf"]
  },
  {
    id: "cwn",
    label: "Cities Without Number",
    family: "Without Number",
    systems: [],
    alsoWith: ["swn"],
    text: "I own Cities Without Number (Deluxe Edition). No rules of its own in GMAtlas \u2014 its book comes along with Stars Without Number.",
    docs: ["assets/docs/WithoutNumber/CitiesWithoutNumber_Deluxe.pdf"]
  },
  {
    id: "traveller",
    label: "Traveller",
    family: "Traveller",
    systems: ["traveller"],
    text: "I own Traveller (2nd Edition) and its supplements, all under this one license.",
    docs: [
      "assets/docs/Traveller/Traveller-2e-Core-Rulebook.pdf",
      "assets/docs/Traveller/Traveller-2e-high-guard-2022-update.pdf",
      "assets/docs/Traveller/Traveller-2e-the-great-rift-book-4-deep-space-exploration-handbook.pdf"
    ]
  },
  {
    id: "ist",
    label: "Intergalactic Space Trader",
    family: "Intergalactic Space Trader",
    systems: [],
    alsoWith: ["traveller", "hostile"],
    text: "I own Intergalactic Space Trader. No rules of its own in GMAtlas \u2014 its trade books come along with Traveller or Hostile.",
    docs: [
      "assets/docs/Intergalactic Space Trader (IST) 01_PlanetEconomy.pdf",
      "assets/docs/Intergalactic Space Trader (IST) 02 Travel.pdf",
      "assets/docs/Intergalactic Space Trader (IST) 03_Trade.pdf"
    ]
  },
  {
    id: "dnd5e",
    label: "D&D 5e",
    family: "D&D 5e",
    open: true,
    systems: ["dnd5e"],
    text: "The System Reference Document is Creative Commons (CC-BY 4.0). Available to any campaign that designates D&D 5e.",
    docs: [
      "assets/docs/dnd5e/SRD_CC_v5.2.1.pdf",
      "assets/docs/dnd5e/Monster Manual.pdf"
    ]
  }
];

// src/account.js
var iso2 = /* @__PURE__ */ __name((ms) => new Date(ms).toISOString(), "iso");
var OWNABLE = new Set(LICENSES.filter((l) => !l.open).map((l) => l.id));
async function getMe(request, ctx, { user, device }) {
  return json({ user: publicUser(user), device: publicDevice(device, device.id) });
}
__name(getMe, "getMe");
async function updateMe(request, { env }, { user }) {
  const body = await readJson(request);
  const displayName = String(body.displayName ?? "").trim().slice(0, 60) || null;
  await env.DB.prepare("UPDATE users SET display_name = ? WHERE id = ?").bind(displayName, user.id).run();
  return json({ user: publicUser({ ...user, display_name: displayName }) });
}
__name(updateMe, "updateMe");
async function listDevices(request, { env }, { user, device }) {
  const { results } = await env.DB.prepare("SELECT * FROM devices WHERE user_id = ? AND revoked_at IS NULL ORDER BY last_seen_at DESC").bind(user.id).all();
  return json({ devices: results.map((d) => publicDevice(d, device.id)) });
}
__name(listDevices, "listDevices");
function cleanPolicy(policy) {
  if (!policy || typeof policy !== "object") throw new HttpError(400, "bad_policy", "Policy must be an object.");
  const mode = policy.mode === "focused" ? "focused" : policy.mode === "follow" ? "follow" : null;
  if (!mode) throw new HttpError(400, "bad_policy", "Policy mode must be 'follow' or 'focused'.");
  const ids = /* @__PURE__ */ __name((list) => {
    if (list === void 0) return [];
    if (!Array.isArray(list) || list.length > 100) throw new HttpError(400, "bad_policy", "License lists must be arrays.");
    const unknown = list.filter((id) => !OWNABLE.has(id));
    if (unknown.length) throw new HttpError(400, "unknown_license", `Unknown license: ${unknown.join(", ")}`);
    return [...new Set(list)];
  }, "ids");
  return { mode, excluded: ids(policy.excluded), only: ids(policy.only) };
}
__name(cleanPolicy, "cleanPolicy");
async function ownDevice(env, user, id) {
  const device = await env.DB.prepare("SELECT * FROM devices WHERE id = ? AND user_id = ? AND revoked_at IS NULL").bind(id, user.id).first();
  if (!device) throw new HttpError(404, "not_found", "No such device.");
  return device;
}
__name(ownDevice, "ownDevice");
async function updateDevice(request, { env }, { user, device: current }, id) {
  const device = await ownDevice(env, user, id);
  const body = await readJson(request);
  const name = body.name === void 0 ? device.name : String(body.name).trim().slice(0, 60) || device.name;
  const policy = body.policy === void 0 ? JSON.parse(device.policy) : cleanPolicy(body.policy);
  await env.DB.prepare("UPDATE devices SET name = ?, policy = ? WHERE id = ?").bind(name, JSON.stringify(policy), id).run();
  return json({ device: publicDevice({ ...device, name, policy: JSON.stringify(policy) }, current.id) });
}
__name(updateDevice, "updateDevice");
async function revokeDevice(request, { env, now }, { user }, id) {
  await ownDevice(env, user, id);
  const at = iso2(now());
  await env.DB.batch([
    env.DB.prepare("UPDATE devices SET revoked_at = ? WHERE id = ?").bind(at, id),
    env.DB.prepare("UPDATE sessions SET revoked_at = ? WHERE device_id = ? AND revoked_at IS NULL").bind(at, id)
  ]);
  return json({ ok: true });
}
__name(revokeDevice, "revokeDevice");

// src/entitlements.js
var iso3 = /* @__PURE__ */ __name((ms) => new Date(ms).toISOString(), "iso");
var OWNABLE2 = new Set(LICENSES.filter((l) => !l.open).map((l) => l.id));
var CERT_TTL_MS = 30 * 24 * 60 * 60 * 1e3;
var ACTIVE = "revoked_at IS NULL AND starts_at <= ? AND (ends_at IS NULL OR ends_at > ?)";
async function activeEntitlements(env, userId, nowIso) {
  const { results } = await env.DB.prepare(`SELECT * FROM entitlements WHERE user_id = ? AND ${ACTIVE}`).bind(userId, nowIso, nowIso).all();
  return results;
}
__name(activeEntitlements, "activeEntitlements");
async function audit(env, at, actorId, action, targetKind, targetId, before, after, note = null) {
  await env.DB.prepare("INSERT INTO audit_log (id, at, actor_id, action, target_kind, target_id, before_json, after_json, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(newId("aud"), at, actorId, action, targetKind, targetId, before === null ? null : JSON.stringify(before), after === null ? null : JSON.stringify(after), note).run();
}
__name(audit, "audit");
function certificatePayload({ user, device, entitlements, nowMs, keyId }) {
  const refs = /* @__PURE__ */ __name((kind) => [...new Set(entitlements.filter((e) => e.kind === kind).map((e) => e.ref))].sort(), "refs");
  return {
    v: 1,
    kid: keyId,
    accountId: user.id,
    deviceId: device.id,
    licenses: refs("license"),
    features: refs("feature"),
    modules: refs("module"),
    policy: JSON.parse(device.policy),
    issuedAt: iso3(nowMs),
    expiresAt: iso3(nowMs + CERT_TTL_MS)
  };
}
__name(certificatePayload, "certificatePayload");
async function getCertificate(request, { env, now }, { user, device }) {
  const entitlements = await activeEntitlements(env, user.id, iso3(now()));
  const payload = certificatePayload({ user, device, entitlements, nowMs: now(), keyId: env.CERT_KEY_ID });
  return json({ cert: await signCertificate(payload, await env.certSigningKey()) });
}
__name(getCertificate, "getCertificate");
async function attestLicenses(request, { env, now }, { user }) {
  const body = await readJson(request);
  if (!Array.isArray(body.licenses) || body.licenses.length > 100) throw new HttpError(400, "bad_licenses", "Send {licenses: [ids]}.");
  const unknown = body.licenses.filter((id) => !OWNABLE2.has(id));
  if (unknown.length) throw new HttpError(400, "unknown_license", `Unknown or open license: ${unknown.join(", ")}`);
  const at = iso3(now());
  const owned = new Set((await activeEntitlements(env, user.id, at)).filter((e) => e.kind === "license").map((e) => e.ref));
  const added = [...new Set(body.licenses)].filter((id) => !owned.has(id));
  for (const id of added) {
    const entId = newId("ent");
    await env.DB.prepare("INSERT INTO entitlements (id, user_id, kind, ref, source, starts_at, created_at) VALUES (?, ?, 'license', ?, 'attested', ?, ?)").bind(entId, user.id, id, at, at).run();
    await audit(env, at, user.id, "entitlement.attest", "entitlement", entId, null, { ref: id, source: "attested" });
  }
  return json({ added, licenses: [...owned, ...added].sort() });
}
__name(attestLicenses, "attestLicenses");
async function deactivateLicense(request, { env, now }, { user }, licenseId) {
  const at = iso3(now());
  const rows = (await activeEntitlements(env, user.id, at)).filter((e) => e.kind === "license" && e.ref === licenseId);
  if (!rows.length) throw new HttpError(404, "not_found", "That license isn\u2019t active on this account.");
  for (const row of rows) {
    await env.DB.prepare("UPDATE entitlements SET revoked_at = ?, revoked_by = ? WHERE id = ?").bind(at, user.id, row.id).run();
    await audit(env, at, user.id, "entitlement.deactivate", "entitlement", row.id, { ref: row.ref, source: row.source }, null);
  }
  return json({ ok: true, deactivated: licenseId });
}
__name(deactivateLicense, "deactivateLicense");

// src/mail.js
function logMailer() {
  return { async send(message) {
    console.log(`[mail to ${message.to}] ${message.subject}`);
  } };
}
__name(logMailer, "logMailer");
function resendMailer(apiKey, from) {
  return {
    async send({ to, subject, text }) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({ from, to, subject, text })
      });
      if (!res.ok) throw new Error(`mail send failed: ${res.status}`);
    }
  };
}
__name(resendMailer, "resendMailer");
function mailerFrom(env) {
  if (env.MAIL_MODE === "log") return logMailer();
  if (env.RESEND_API_KEY) return resendMailer(env.RESEND_API_KEY, env.MAIL_FROM);
  return { async send() {
    throw new Error("No mail provider configured (set MAIL_MODE=log or RESEND_API_KEY).");
  } };
}
__name(mailerFrom, "mailerFrom");

// src/worker.js
var ROUTES = [
  ["POST", /^\/api\/auth\/email\/start$/, startEmailSignIn, false],
  ["POST", /^\/api\/auth\/email\/verify$/, verifyEmailSignIn, false],
  ["POST", /^\/api\/auth\/refresh$/, refreshSession, false],
  ["POST", /^\/api\/auth\/signout$/, signOut, false],
  ["GET", /^\/api\/me$/, getMe, true],
  ["PATCH", /^\/api\/me$/, updateMe, true],
  ["GET", /^\/api\/devices$/, listDevices, true],
  ["PATCH", /^\/api\/devices\/([\w-]+)$/, updateDevice, true],
  ["DELETE", /^\/api\/devices\/([\w-]+)$/, revokeDevice, true],
  ["GET", /^\/api\/entitlements$/, getCertificate, true],
  ["POST", /^\/api\/entitlements\/attest$/, attestLicenses, true],
  ["DELETE", /^\/api\/entitlements\/licenses\/([\w-]+)$/, deactivateLicense, true]
];
var signingKeys = /* @__PURE__ */ new Map();
function signingKeyFor(jwkText) {
  if (!jwkText) throw new HttpError(500, "not_configured", "Certificate signing key is not configured.");
  if (!signingKeys.has(jwkText)) {
    const pending = Promise.resolve().then(() => importSigningKey(JSON.parse(jwkText)));
    pending.catch(() => signingKeys.delete(jwkText));
    signingKeys.set(jwkText, pending);
  }
  return signingKeys.get(jwkText);
}
__name(signingKeyFor, "signingKeyFor");
function context(env) {
  const wrapped = {
    ...env,
    MAILER: env.MAILER || mailerFrom(env),
    certSigningKey: /* @__PURE__ */ __name(() => signingKeyFor(env.CERT_SIGNING_JWK), "certSigningKey")
  };
  return { env: wrapped, now: env.now || (() => Date.now()) };
}
__name(context, "context");
async function handleApi(request, env) {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  if (request.method !== "GET" && origin && origin !== url.origin) {
    return errorResponse(new HttpError(403, "bad_origin", "Cross-site request refused."));
  }
  const ctx = context(env);
  try {
    let allowed = null;
    for (const [method, pattern, handler, needsAuth] of ROUTES) {
      const m = pattern.exec(url.pathname);
      if (!m) continue;
      if (method !== request.method) {
        allowed = allowed || [];
        allowed.push(method);
        continue;
      }
      const params = m.slice(1);
      if (!needsAuth) return await handler(request, ctx, ...params);
      const caller = await requireAuth(request, ctx);
      return await handler(request, ctx, caller, ...params);
    }
    if (allowed) return json({ error: "method_not_allowed" }, 405, { allow: allowed.join(", ") });
    return json({ error: "not_found" }, 404);
  } catch (err) {
    return errorResponse(err);
  }
}
__name(handleApi, "handleApi");
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return handleApi(request, env);
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("Not found", { status: 404 });
  }
};

// ../../../Users/bstep/AppData/Local/npm-cache/_npx/c943b712072b77c4/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../Users/bstep/AppData/Local/npm-cache/_npx/c943b712072b77c4/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-FRvZiR/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// ../../../Users/bstep/AppData/Local/npm-cache/_npx/c943b712072b77c4/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-FRvZiR/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default,
  handleApi
};
//# sourceMappingURL=worker.js.map
