// helpers.js — a test harness: a D1-compatible database over node:sqlite
// with the real migrations applied, a captured mailer, a fixed clock, and
// a `call()` that drives the real Worker `fetch` like a browser would
// (keeping the refresh cookie between calls).
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import worker from '../src/worker.js';
import { CampaignRoom } from '../src/room.js';
import { generateSigningKeyPair } from '../src/crypto.js';

const MIGRATIONS = new URL('../migrations/', import.meta.url);

/** The subset of the D1 API the server uses. */
export function d1(sqlite) {
  const statement = (sql, args = []) => ({
    bind: (...values) => statement(sql, values),
    async first() { return sqlite.prepare(sql).get(...args) ?? null; },
    async all() { return { results: sqlite.prepare(sql).all(...args) }; },
    async run() { const r = sqlite.prepare(sql).run(...args); return { meta: { changes: r.changes } }; },
    _exec() { return sqlite.prepare(sql).run(...args); },
  });
  return {
    prepare: (sql) => statement(sql),
    async batch(statements) {
      sqlite.exec('BEGIN');
      try { const out = statements.map((s) => s._exec()); sqlite.exec('COMMIT'); return out; } catch (e) { sqlite.exec('ROLLBACK'); throw e; }
    },
  };
}

/** Durable Object storage over node:sqlite: `sql.exec(...).toArray()`,
 *  `transactionSync`, `deleteAll`. */
function roomStorage() {
  let db = new DatabaseSync(':memory:');
  return {
    sql: { exec: (query, ...args) => ({ toArray: () => db.prepare(query).all(...args) }) },
    transactionSync(fn) {
      db.exec('BEGIN');
      try { const out = fn(); db.exec('COMMIT'); return out; } catch (e) { db.exec('ROLLBACK'); throw e; }
    },
    async deleteAll() { db.close(); db = new DatabaseSync(':memory:'); },
  };
}

/** A hibernatable server-side socket stand-in: records what it's sent. */
export function fakeSocket() {
  return {
    inbox: [], closed: null, att: null,
    send(text) { if (this.closed) throw new Error('closed'); this.inbox.push(JSON.parse(text)); },
    close(code) { this.closed = code || 1000; },
    serializeAttachment(a) { this.att = a; },
    deserializeAttachment() { return this.att; },
    take() { const out = this.inbox; this.inbox = []; return out; },
  };
}

/** The CAMPAIGN_ROOMS namespace: one CampaignRoom per name, in memory. */
export function fakeRooms(env) {
  const rooms = new Map();
  const roomFor = (name) => {
    if (!rooms.has(name)) {
      const sockets = new Set();
      const ctx = {
        storage: roomStorage(),
        acceptWebSocket: (ws) => sockets.add(ws),
        getWebSockets: () => [...sockets].filter((s) => !s.closed),
      };
      rooms.set(name, new CampaignRoom(ctx, env));
    }
    return rooms.get(name);
  };
  return {
    idFromName: (name) => name,
    get: (name) => ({ fetch: (request) => roomFor(name).fetch(request) }),
    room: roomFor,
    /** Joins a room as `deviceId`: `send(frame)` delivers a client frame. */
    connect(name, deviceId) {
      const room = roomFor(name);
      const ws = fakeSocket();
      room.accept(ws, deviceId);
      ws.deliver = (frame) => room.webSocketMessage(ws, JSON.stringify(frame));
      return ws;
    },
  };
}

export async function makeServer() {
  const sqlite = new DatabaseSync(':memory:');
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) sqlite.exec(readFileSync(new URL(file, MIGRATIONS), 'utf8'));
  const mail = [];
  const clock = { ms: Date.parse('2026-11-06T12:00:00Z') };
  const keys = await generateSigningKeyPair();
  const env = {
    DB: d1(sqlite),
    ACCESS_TOKEN_SECRET: 'test-access-secret',
    CODE_PEPPER: 'test-pepper',
    CERT_SIGNING_JWK: JSON.stringify(keys.privateJwk),
    CERT_KEY_ID: 'k-test',
    MAILER: { async send(message) { mail.push(message); } },
    now: () => clock.ms,
  };
  env.CAMPAIGN_ROOMS = fakeRooms(env);
  return { env, sqlite, mail, clock, publicJwk: keys.publicJwk, rooms: env.CAMPAIGN_ROOMS };
}

/** A browser: remembers its refresh cookie and access token. */
export function browser(server, origin = 'https://gmatlas.test') {
  const state = { cookie: null, accessToken: null, deviceId: null };
  async function call(method, path, body, { headers = {}, auth = true } = {}) {
    const h = { ...headers };
    if (body !== undefined) h['content-type'] = 'application/json';
    if (state.cookie) h.cookie = `gm_refresh=${state.cookie}`;
    if (auth && state.accessToken) h.authorization = `Bearer ${state.accessToken}`;
    if (method !== 'GET' && !('origin' in h)) h.origin = origin;
    const res = await worker.fetch(new Request(`${origin}${path}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) }), server.env);
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      const value = decodeURIComponent(/gm_refresh=([^;]*)/.exec(setCookie)[1]);
      state.cookie = value || null;
    }
    const data = await res.json();
    if (data && data.accessToken) state.accessToken = data.accessToken;
    if (data && data.device && data.device.current) state.deviceId = data.device.id;
    return { status: res.status, data, setCookie };
  }
  return { state, call };
}

export const lastCode = (server, email) => /code is (\d{6})/.exec([...server.mail].reverse().find((m) => m.to === email.toLowerCase()).text)[1];

/** Signs a browser in by email code. */
export async function signIn(server, b, email, deviceName = 'Desktop · Chrome') {
  await b.call('POST', '/api/auth/email/start', { email });
  return b.call('POST', '/api/auth/email/verify', { email, code: lastCode(server, email), device: { name: deviceName }, deviceId: b.state.deviceId || undefined });
}
