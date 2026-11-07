# server/ â€” GMAtlas accounts, sync and licensing service

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

Browser side (tested by `test/client.test.js`, which drives the real client
against this Worker, plus a jsdom smoke run of the built bundle):
- **`src/core/account.js`**, the REST client:
  - it keeps the device id, the user and the last signed certificate in
    `appConfig.account` (sync scope `local`) through `store.js`;
  - the access token stays in memory;
  - refreshes are serialized across tabs with a Web Lock, so rotation never
    trips reuse detection;
  - a remote sign-out drops the browser back to the signed-out app.
- **The certificate** is verified offline against the pinned key
  (`src/data/certKeys.js`) before `store.setCertificate()` lets it decide
  owned licenses. A forged or edited one is ignored, and offline the cached
  one keeps working.
- **Portal screens** (`src/ui/portal/account.js`):
  - `#/account/sign-in`: email, then code, then a name for a new account,
    then "bring this device's licenses?";
  - `#/account`: Profile, and sign out;
  - `#/account/devices`: rename, and remote sign-out;
  - `#/account/licenses`: owned licenses, this device's install policy,
    "I own this", and Deactivate.
- **Settings → Licenses** ticks attest to the account while signed in, and
  unticks deactivate (after a confirm).
- **Without the service:** under `file://` or on a static copy, the screens
  point to `https://dev.gmatlas.online` and make no calls.

Still to do in S1:
- passkeys and OAuth sign-in;
- device key pairs, plus the request-signing challenge they enable;
- the account menu in the campaign top bar (the gear menu has "Sign in" /
  "Account" for now), and a help article on accounts;
- admin v1;
- moving third-party PDF loading to "import my copy";
- a per-IP rate limit on code requests.

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
scripts/keygen.js             new certificate signing key pair (printed only)
scripts/secrets.js            generates all secrets: --local (.dev.vars) or --remote (Cloudflare)
scripts/site.js               builds the app and assembles ../_site for wrangler
keys/                         committed public halves of the certificate signing keys
test/                         node:sqlite D1 shim + end-to-end tests (server, and the
                              browser client src/core/account.js against it)
```

## Running it

- **Tests:** `npm test` (Node 22+; no dependencies, since `node:sqlite`
  stands in for D1).
- **Local server** (first time: `npm run secrets:local`, then
  `npm run migrate:local`): `npm run dev` builds the app into `../_site`
  (`scripts/site.js`, the same files the Pages deploy publishes) and runs
  `wrangler dev` (fetched on demand by `npx`) at `http://localhost:8787`, with
  the app and `/api` on one origin. Sign-in codes print to the console.
- **Deploying.** Live at `https://dev.gmatlas.online` (custom domain in
  `wrangler.toml`; `https://gmatlas.gmatlas-server.workers.dev` also still
  serves it), on the D1 database `db_gmatlas`. The one-time setup is done:
  - migrations applied (`npm run migrate:remote`);
  - secrets set (`npm run secrets:remote`, key `k1`, public half in
    `keys/cert-k1.public.json`);
  - email through Resend from `info@gmatlas.online` (`RESEND_API_KEY`).

  A live email sign-in has been run end to end. A later change ships with
  `npm run deploy`, plus `npm run migrate:remote` when a migration is added.
  On Windows PowerShell, use `npx.cmd`/`npm.cmd` if script execution is
  disabled.

### Rotating the signing key

Only if the private key is exposed. Set `CERT_KEY_ID` in `wrangler.toml` to
a new id (`k2`), run `npm run secrets:remote`, add the new public key to the
app beside the old one, and deploy both. Certificates signed with the old
key keep verifying until they expire (30 days); then drop the old key.

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
