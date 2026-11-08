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

- **Admin v1** (`src/admin.js`, `design/adr/admin-v1.md`): roles (owner,
  admin, support, content), users, entitlements (grant, trial, end date,
  revoke, convert, bulk CSV), feature flags (kill switch, overrides,
  default, rollout; shipped in the certificate as `enabledFeatures`), and
  the audit log. Every write needs a note and is audited. The page is
  `/admin.html` on the service (its own bundle); make the first owner with
  `npm run admin:role -- --email you@example.com --role owner` (add
  `--env production` for production; sign in once first).

- **Passkeys** (`src/passkeys.js`, `src/webauthn.js`) and **Continue with
  Google / Discord** (`src/oauth.js`, PKCE); see
  `design/adr/passkeys-oauth.md`. Passkeys work as soon as this is
  deployed. A provider appears only once its secrets are set:
  1. Register an OAuth app with the provider. Redirect URI:
     `https://dev.gmatlas.online/api/auth/oauth/google/callback` (or
     `.../discord/callback`; production uses `https://gmatlas.online/...`).
     Google: Cloud Console › APIs & Services › Credentials › OAuth client
     (Web), scopes `openid email profile`. Discord: Developer Portal ›
     Applications › OAuth2, scopes `identify email`.
  2. `npx wrangler secret put GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
     (or `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`); add
     `--env production` for production.
- **Per-network limits:** 20 sign-in codes and 30 wrong codes per client IP
  per hour (`src/rateLimit.js`; IPs stored hashed), on top of the
  per-address limits.

- **"Import my copy":** the hosted service serves only openly licensed
  (CC-BY) sourcebook PDFs, and only those under 25 MiB (`scripts/site.js`);
  every other book is imported from the GM's own file. Running locally,
  Load still reads `assets/docs/`.
- **Help:** Account & sync articles (signing in, syncing, importing books).

Still to do in S1:
- Apple sign-in;
- device key pairs, plus the request-signing challenge they enable.

## Status: Phase S2 (personal sync) in progress

S2a is built (`design/adr/personal-sync.md`). The tests are
`test/sync.test.js` here, plus jsdom smoke runs of two and three browsers
against this Worker and room.
- **End-to-end encrypted campaign sync** between one user's devices:
  - per-device ECDH keys;
  - an account vault key, wrapped per device and to a recovery key;
  - per-campaign keys;
  - every op, snapshot and title encrypted in the browser.
- **One `CampaignRoom` Durable Object per campaign** (`src/room.js`,
  `src/roomCore.js`): an ordered op log, ack and fan-out, deduplicated
  resends, catch-up from a cursor in frames under 512 KB, and snapshots
  over HTTP with compaction.
- **REST** (`src/sync.js`): the vault and device approval, the
  synced-campaign index, snapshots, 60-second socket tickets, and the
  account settings record (`GET`/`PUT /api/account/settings`, versioned).
- **Presence-lite:** the room tells every open socket which devices have
  the campaign open (`{t:'presence', devices}`), on join and leave.
- **Browser:**
  - `src/core/sync.js` (transport) and `src/core/syncKeys.js`;
  - the sync base and outbox in `store.js`;
  - account settings sync (profiles, Storyboard positions, Turn Step
    Lists, TOC library);
  - a sync-status dot on the logo, "Also open on …" in the logo menu,
    and conflict chips with "Keep mine";
  - Account › Sync, and approval on Account › Devices.

- **The `sync.devices` gate:** sync writes are refused (403 `feature_off`)
  while the feature is off for the account; the app says so and stops.

S2 is complete apart from moving it to `main` (by pull request).

## Layout

```
migrations/0001_accounts.sql  D1 schema (SQLite): users, identities, email_codes,
                              devices, sessions, entitlements, audit_log
migrations/0002_sync.sql      devices.ecdh_pub, vault_keys, campaigns (all ciphertext/metadata)
migrations/0003_account_settings.sql  account_settings (one encrypted, versioned record per account)
migrations/0004_admin.sql     feature_flags; audit_log indexes
migrations/0005_rate_limits.sql  rate_events (per-client sign-in limits)
migrations/0006_passkeys.sql  passkeys, webauthn_challenges
src/passkeys.js, src/webauthn.js  passkey sign-in (WebCrypto + a small CBOR decoder)
src/oauth.js                  Continue with Google / Discord (PKCE)
src/admin.js                  /api/admin/*: users, entitlements, flags, audit (role-checked)
src/features.js               feature flags: load, resolve per account, requireFeature
scripts/admin-role.js         set an admin role from the command line (first owner)
src/worker.js                 entry: routes /api/*, everything else to the static app;
                              exports the CampaignRoom Durable Object
src/sync.js                   vault, synced-campaign index, snapshots, socket tickets
src/room.js, src/roomCore.js  CampaignRoom: the per-campaign encrypted op log
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
## Environments: dev and production

Two separate deployments, each with its own Worker, D1 database, campaign
rooms, signing key, secrets and accounts (`wrangler.toml`):

| | dev | production |
|---|---|---|
| URL | `https://dev.gmatlas.online` | `https://gmatlas.online` |
| Worker | `gmatlas` | `gmatlas-production` |
| D1 | `db_gmatlas` | `db_gmatlas_prod` |
| Cert key | `k1` | `p1` |
| Ships with | `npm run deploy` (any branch) | `npm run release:production -- --confirm gmatlas.online` |

**Everyday deploys go to dev only.** `npm run deploy` (or `deploy:dev`)
builds the site for dev and deploys the default environment. Add
`npm run migrate:remote` when a migration is added. Nothing in the
everyday workflow can reach production.

**Production is a deliberate release** (`scripts/release.js`). It refuses
unless:
- you're on `main`, with a clean tree, exactly at `origin/main`;
- core and server tests pass;
- production is configured.

It then:
1. tags the release `prod-YYYYMMDD-HHMM` and pushes the tag;
2. applies migrations to the production database;
3. builds the site for production and deploys it.

`npm run release:check` runs the same checks without releasing. Server
work reaches `main` by pull request when a phase is complete
(`CLAUDE.md`, Branches), so production only ever runs merged, tagged code.

`GET /api/health` answers `{ok, env}`, so you can see which environment
served a request.

### Dev (set up)

Live at `https://dev.gmatlas.online`, with
`https://gmatlas.gmatlas-server.workers.dev` as a fallback. One-time setup,
done:
- migrations applied;
- secrets set (key `k1`, public half in `keys/cert-k1.public.json`);
- email through Resend from `info@gmatlas.online` (`RESEND_API_KEY`).

### Production (one-time setup)

Done:
- D1 `db_gmatlas_prod` created, its `database_id` in
  `[[env.production.d1_databases]]` (the release applies its migrations);
- `npm run secrets:production`: secrets set, key `p1` in
  `keys/cert-p1.public.json` and pinned in `src/data/certKeys.js`.

Still to do:
1. `npx wrangler secret put RESEND_API_KEY --env production`.
2. Make sure no other DNS record holds `gmatlas.online`; the first deploy
   creates its custom-domain record.
3. Merge to `main`, push, then run
   `npm run release:production -- --confirm gmatlas.online`.

`src/data/certKeys.js` pins only the production key, matching the app's
default service URL (`gmatlas.online`). `scripts/site.js` swaps in the dev
key for a dev build, so a certificate from one environment never unlocks
anything in the other.

On Windows PowerShell, use `npx.cmd`/`npm.cmd` if script execution is
disabled.

### Rotating the signing key

Only if the private key is exposed. Set that environment's `CERT_KEY_ID` in
`wrangler.toml` to a new id (`k2`, or `p2` for production), run
`npm run secrets:remote` (or `secrets:production`), add the new public key
to the app beside the old one, and deploy both. Certificates signed with the old
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
