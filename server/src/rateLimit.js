// rateLimit.js — counting events per client in a sliding window
// (rate_events, migration 0005). The client is a peppered hash of its IP,
// so raw addresses are never stored.

import { HttpError, clientIp } from './http.js';
import { sha256Hex } from './crypto.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** A stable, private key for the caller's IP. */
export async function clientKey(request, env) {
  return (await sha256Hex(`ip:${clientIp(request)}:${env.CODE_PEPPER}`)).slice(0, 32);
}

/** How many `bucket` events happened in the last `windowMs`. */
export async function countRecent(env, nowMs, bucket, windowMs) {
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM rate_events WHERE bucket = ? AND at > ?').bind(bucket, new Date(nowMs - windowMs).toISOString()).first();
  return row.n;
}

/** Records one event (and now and then sweeps rows older than a day). */
export async function record(env, nowMs, bucket) {
  await env.DB.prepare('INSERT INTO rate_events (bucket, at) VALUES (?, ?)').bind(bucket, new Date(nowMs).toISOString()).run();
  if (Math.random() < 0.02) await env.DB.prepare('DELETE FROM rate_events WHERE at < ?').bind(new Date(nowMs - DAY_MS).toISOString()).run();
}

/** Throws 429 `code` once `max` events are already in the window. */
export async function enforce(env, nowMs, bucket, max, windowMs, code, message) {
  if ((await countRecent(env, nowMs, bucket, windowMs)) >= max) throw new HttpError(429, code, message);
}
