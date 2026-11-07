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
  synced-campaign index, snapshots, and 60-second socket tickets.
- **Browser:**
  - `src/core/sync.js` (transport) and `src/core/syncKeys.js`;
  - the sync base and outbox in `store.js`;
  - Account › Sync, and approval on Account › Devices.

## Layout

```
migrations/0001_accounts.sql  D1 schema (SQLite): users, identities, email_codes,
                              devices, sessions, entitlements, audit_log
migrations/0002_sync.sql      devices.ecdh_pub, vault_keys, campaigns (all ciphertext/metadata)
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
| D1 | `db_gmatlas` | `db_gmatlas_production` |
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

### Production (one-time setup, not done yet)

1. `npx wrangler d1 create db_gmatlas_production`, then paste its
   `database_id` into `[[env.production.d1_databases]]`.
2. `npm run secrets:production`. This sets the production secrets and
   writes `keys/cert-p1.public.json`. Commit that file, and add the key to
   `src/data/certKeys.js` (on `main`).
3. `npx wrangler secret put RESEND_API_KEY --env production`.
4. Make sure no other DNS record holds `gmatlas.online`; the first deploy
   creates its custom-domain record.
5. Merge to `main`, push, then run
   `npm run release:production -- --confirm gmatlas.online`.

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
