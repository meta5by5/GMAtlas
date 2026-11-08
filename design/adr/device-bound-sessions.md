# Device-bound sessions: refreshes signed by a key the browser can't export

**Status:** Accepted. Built on the `server` branch (roadmap 3.2, an S1
leftover).

## Context

A session is an HttpOnly refresh cookie (60 days, rotated on every use) plus
a 15-minute access token held in memory. Rotation catches a copied cookie
once both copies are used, but whoever uses a stolen cookie *first* keeps the
session. Roadmap 3.2 asks for each device to hold a non-extractable key pair
and sign at refresh, so a stolen cookie alone can't impersonate the device.

## Decision

1. **One key per browser** (`core/account.js`):
   - an ECDSA P-256 pair, made on first need;
   - the private half is non-extractable and lives in the device-keys
     IndexedDB record beside the sync keys (`syncKeys.sessionKey`, through
     `store.js`; rule 2);
   - it is made under a Web Lock, so two tabs opening at once can't each
     make one.
2. **Binding.** Every sign-in sends the public half:
   - `deviceKey` in the email-code and passkey sign-in bodies;
   - `key=<x>.<y>` on a "Continue with …" link, carried in the signed state
     cookie;
   - the new session row stores it (`sessions.bound_key`).
3. **Proof at refresh.** Every refresh carries `proof: {ts, sig}`, an ECDSA
   signature over `gmatlas-refresh:v1:<ts>`.
   - **The server's check:** on a bound session, the signature must verify
     against the bound key, and `ts` must be later than the last accepted
     (`sessions.proof_at`).
   - **Clocks don't matter:** `ts` is only ever compared with the previous
     one, never with the server's clock. A device whose clock is behind
     gets `409 stale_proof {after}` and signs once more with `after + 1`.
   - **What's refused:** a missing proof, a bad one, or one from another
     key gets `401 device_proof`. The session itself is left alone and the
     cookie isn't rotated, so the real device carries on and a thief can't
     sign it out.
   - **Refreshes are already serialized across tabs** by the refresh lock,
     so their `ts` values come in order.
4. **Existing sessions bind themselves.** A session from before this (or
   from a browser without WebCrypto) has no key. It refreshes as before
   until its first refresh that carries a key and a valid proof, which binds
   it (trust on first use). Nobody is signed out by the change.
5. **The admin page** (`admin.html`) shares the app's session, so it signs
   with the app's key. It reads the key through `store.js`
   `readDeviceKeys()` (read-only, no campaign load) and never makes one.

## Consequences

- A copied refresh cookie can't renew a bound session from another browser,
  and a captured proof can't be replayed. Malware running inside the
  browser profile itself can still use the key; nothing at this layer stops
  that.
- Clearing the site's data drops the key together with the cookie. If only
  the IndexedDB record were lost, that browser's next refresh is refused
  and it signs in again.
- An insecure `http://` origin other than localhost has no WebCrypto, so its
  sessions stay unbound. Production is https only.
- The admin bundle now includes `store.js` and what it imports (about
  0.9 MB instead of about 0.1 MB); it is loaded only by admins.
- Before the sign-in that made a key, an already-open sign-in page's
  "Continue with …" link may lack it. That session binds at its first
  refresh instead.
- Deploying needs migration `0007_device_bound_sessions.sql`
  (`npm run migrate:remote` before `npm run deploy`).
