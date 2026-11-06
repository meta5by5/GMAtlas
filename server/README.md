# server/ — GMAtlas accounts, sync and licensing service

Lives on the **`server`** branch only, until a roadmap phase is complete and
merged into `main`. The design is `design/ACCOUNTS-SYNC-ROADMAP.md`. Read
it, and `CLAUDE.md`'s "Branches" section, before working here.

## Status: Phase S1 in progress

Built and tested (`npm test`, 8 end-to-end tests against real SQL):
- **Email-code sign-in** (`src/auth.js`), which also creates the account on
  first use.
  - Codes are 6 digits, stored hashed, expire after 10 minutes, burn after
    5 wrong tries, and are limited to 5 requests per address per hour.
  - The answer is the same whether or not an account exists.
- **Sessions:**
  - 15-minute HS256 access tokens, kept in the client's memory;
  - a 60-day refresh token in an `HttpOnly; Secure; SameSite=Strict` cookie,
    rotated on every use;
  - replaying an already-rotated cookie ends the session;
  - sign-out, plus remote sign-out of any of your devices, take effect at
    once.
- **Devices** (`src/account.js`): one record per browser instance, with
  rename and the per-device install policy (`follow` minus `excluded`, or
  `focused` on `only`; roadmap 4.4), validated against the app's own
  `LICENSES`.
- **Entitlements** (`src/entitlements.js`):
  - "I own this book" attestations become account-wide;
  - deactivating a license removes it from every device;
  - every change is written to `audit_log`.
- **The entitlement certificate:** ECDSA P-256 signed, valid 30 days, and
  carrying the device's policy. The browser verifies it offline with a
  pinned public key.
- **Cross-site refusal:** state-changing requests from another origin get
  a 403, on top of the SameSite cookie.

Still to do in S1:
- passkeys and OAuth sign-in;
- device key pairs, plus the request-signing challenge they enable;
- the browser side (`src/core/account.js`, sign-in and account pages on the
  portal, the certificate feeding `effectiveLicenses`);
- admin v1;
- moving third-party PDF loading to "import my copy";
- a per-IP rate limit on code requests;
- deployment.

## Layout

```
migrations/0001_accounts.sql  D1 schema (SQLite): users, identities, email_codes,
                              devices, sessions, entitlements, audit_log
src/worker.js                 entry: routes /api/*, everything else to the static app
src/auth.js                   sign-in, refresh, sign-out, requireAuth
src/account.js                /api/me, /api/devices
src/entitlements.js           certificate, attest, deactivate
src/crypto.js                 WebCrypto only: tokens, hashes, HS256, ECDSA P-256
src/http.js, src/mail.js      helpers; mail provider adapters
scripts/keygen.js             new certificate signing key pair
test/                         node:sqlite D1 shim + end-to-end tests
```

## Running it

- **Tests:** `npm test` (Node 22+; no dependencies, since `node:sqlite`
  stands in for D1).
- **Local server:** `npm run dev` runs `wrangler dev`, fetched on demand by
  `npx`. Put `ACCESS_TOKEN_SECRET`, `CODE_PEPPER`, `CERT_SIGNING_JWK` (from
  `npm run keygen`) and `MAIL_MODE=log` in `server/.dev.vars`, which is
  gitignored. Then run `npm run migrate:local`.
- **Deploying:** not done yet. It needs:
  - a Cloudflare account;
  - a D1 database (its id goes in `wrangler.toml`);
  - the secrets listed at the top of `wrangler.toml`;
  - a mail sender.

## Ground rules

- The shipped browser app stays zero-dependency. This folder may add dev
  dependencies; it has none so far.
- Merge rules, sync protocol and license resolution live in the pure
  modules in `src/domain/` (`syncOps.js`, `licensing.js`), and the server
  imports `src/data/licenses.js` directly. The browser and this server
  share that code, so they can't drift.
- No document bytes are ever stored or relayed through here (Constitution
  rule 6). Only metadata, encrypted ops and signalling.
- Keeping current with core: `git merge main` regularly. Core fixes are made
  on `main`, never on this branch alone.
- CI (`.github/workflows/test.yml`) runs the core tests and this folder's
  `npm test` on every push to this branch.
