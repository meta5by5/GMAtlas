// http.js — request/response helpers shared by every route.

export class HttpError extends Error {
  /** `extra`: more fields for the error body (e.g. {after} on stale_proof). */
  constructor(status, code, message, extra = null) {
    super(message || code);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

export function errorResponse(err) {
  if (err instanceof HttpError) return json({ ...(err.extra || {}), error: err.code, message: err.message }, err.status);
  console.error('unhandled server error', err);
  return json({ error: 'server_error', message: 'Something went wrong.' }, 500);
}

const MAX_BODY_BYTES = 16 * 1024;

/** The request's JSON body as an object. Rejects non-JSON, oversized or
 *  non-object bodies with 400/413. `max` (characters) defaults to 16 KB. */
export async function readJson(request, max = MAX_BODY_BYTES) {
  const type = request.headers.get('content-type') || '';
  if (!type.includes('application/json')) throw new HttpError(415, 'unsupported_media_type', 'Send JSON.');
  const text = await request.text();
  if (text.length > max) throw new HttpError(413, 'body_too_large', 'Request body is too large.');
  let data;
  try { data = JSON.parse(text || '{}'); } catch { throw new HttpError(400, 'bad_json', 'Request body is not valid JSON.'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400, 'bad_json', 'Request body must be a JSON object.');
  return data;
}

export function readCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

/** A Set-Cookie value. Defaults suit the refresh token: HttpOnly, Secure,
 *  SameSite=Strict, scoped to the auth routes only. */
export function cookie(name, value, { maxAgeSeconds, path = '/api/auth' } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, 'HttpOnly', 'Secure', 'SameSite=Strict'];
  if (maxAgeSeconds !== undefined) parts.push(`Max-Age=${maxAgeSeconds}`);
  return parts.join('; ');
}

export function clientIp(request) {
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
}
