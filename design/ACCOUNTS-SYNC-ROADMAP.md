# GMAtlas — Accounts, Sync, Licensing & Multiplayer Roadmap

**Status: Phase S0 built (2026-11-05, v0.98.0,
`design/adr/sync-groundwork.md`); S1–S6 proposed.** Each later phase becomes
an ADR in `design/adr/` when it is accepted, and the Design Constitution's
Part IV ("Multi-user access, authentication, or any cloud-hosted shared
campaign database") stays true until Phase S1 ships. Where S0 as built
differs from what this plan first said, the text below has been updated to
match.

Scope:
- Server-hosted sign-in.
- Fast multi-device sync, including simultaneous use.
- Shared multiplayer tables.
- Account-wide licensing with per-device opt-out.
- An admin panel for licenses and features.
- Moving local documents between instances without uploading them.
- The non-campaign "portal" screens (sign-in, account, store, help) with
  their own layout.

The campaign app itself stays what it is: one HTML document, one bundled
script, local-first, installable as a PWA, and fully usable signed out.

---

## 1. Goals and hard constraints

| # | Requirement | What it means in practice |
|---|---|---|
| G1 | Stays browser-based in its current form | Same single `index.html` + `dist/app.bundle.js`. The server *adds* sign-in, sync and a store; it never becomes the source of truth. Signed out = today's app, unchanged. |
| G2 | Seamless, fast multi-device sync, including simultaneous use | Every edit applies locally first, exactly as `store.update()` does today. Ops reach other open devices in under 250 ms (same region), and offline edits merge on reconnect without a "which copy wins" prompt. |
| G3 | Multiplayer sharing | A GM invites players to a *table*. Players see only what the GM reveals and edit only what is theirs. The server enforces this. |
| G4 | Builds on the existing license/module model | `src/data/licenses.js`, `isGameSystemActivated()`, the Rules Constitution and the `canAccessGameSystem()` seam in `src/domain/entitlements.js` stay the vocabulary. The account becomes a new *source* of ownership, not a new model. |
| G5 | Admin panel for license and feature management | A separate admin surface: users, devices, entitlements, products, feature flags, orders, redeem codes, audit log. |
| G6 | Local documents transfer between instances without breaking links and without touching the server | Document bytes (uploaded PDFs, gallery images, battlemap images, loaded sourcebooks) never pass through or rest on the server. Only their *metadata* syncs; the bytes move device-to-device or by file. |
| G7 | A license activated once applies everywhere until deactivated, with a per-device opt-out | Ownership lives on the account. Each device follows the account by default and may exclude licenses ("not installed here") or pin a focused set. |
| G8 | Familiar portal workflows with a layout distinct from campaigns | Sign-in, account, devices, store/cart, help and guides use conventional web-app patterns in their own stylesheet. They share the colour tokens, not the campaign cockpit layout. |

Non-goals: a cloud-first editor, server-side reading of campaign content,
hosting third-party sourcebook PDFs for download, and native apps.

---

## 2. Architecture at a glance

```
 Browser instance (any device)                    Server (one deployment)
 ┌───────────────────────────────────┐            ┌──────────────────────────────────┐
 │ index.html + app.bundle.js        │  HTTPS     │ /api/*  Worker (stateless)        │
 │  ├ campaign surface (cockpit.css) │──────────▶ │   auth, devices, entitlements,   │
 │  ├ portal surface   (portal.css)  │            │   store/checkout, invites, admin │
 │  └ core/                          │            │        │                         │
 │     store.js  ← only persistence  │            │        ▼  relational DB          │
 │     account.js (REST client)      │            │   users, devices, entitlements,  │
 │     sync.js    (socket transport) │  WSS       │   products, orders, audit, ...   │
 │  domain/ syncOps, licensing,      │──────────▶ │ Campaign room (one per campaign) │
 │          visibility (pure)        │            │   ordered encrypted op log,      │
 │ IndexedDB: kv + docBlobs          │            │   snapshots, presence, ACL       │
 └───────────────▲───────────────────┘            │ Account room (one per user)      │
                 │ WebRTC data channel            │   entitlement + device pushes,   │
                 │ (document bytes, peer to peer) │   personal-config op log         │
 ┌───────────────┴───────────────────┐            └──────────────────────────────────┘
 │ another instance                  │   signalling only ▲
 └───────────────────────────────────┘ ─────────────────┘
```

Three kinds of traffic, deliberately separated:
1. **REST** for things that are request/response (sign-in, checkout,
   invites, admin).
2. **One WebSocket per open scope** (the account, and the active campaign)
   for ordered, encrypted ops and presence.
3. **Peer-to-peer** for document bytes. The server only introduces the two
   peers.

### 2.1 Recommended hosting: Cloudflare Workers + Durable Objects + D1

| Need | Piece | Why it fits |
|---|---|---|
| Static app hosting | Workers static assets (or Pages) | Same origin as the API, so no CORS gymnastics and refresh tokens can be `HttpOnly` cookies. Replaces GitHub Pages for the hosted build. |
| Per-campaign real-time authority | One Durable Object per campaign (SQLite-backed storage) | A single-threaded room is exactly "one ordered op log per campaign". WebSocket hibernation means an idle table costs close to nothing. Each room is placed near its first user. |
| Per-user push channel | One Durable Object per account | Entitlement changes, device list, campaign list, personal-config sync. |
| Accounts, licensing, orders | D1 (SQLite) | Small relational data and simple queries. Also the admin panel's backing store. |
| Email codes | A transactional email API (Postmark, Resend, ...) | Passwordless sign-in. |
| Payments | Stripe Checkout + Stripe Tax, *or* a merchant of record (Paddle) | See decision D6. |

No object storage is needed, because no document bytes are stored (G6).
That one constraint removes the largest cost and liability line.

**Portability guard:** the server is a thin layer over a documented wire
protocol (section 5.4), and the merge logic is the same pure module the
client uses (`src/domain/syncOps.js`). A Node + Postgres + Redis
implementation of the same protocol is a contained rewrite of the server
only. The client never sees which one it talks to.

### 2.2 Repository layout

```
src/core/account.js       REST client: sign-in, session refresh, devices, entitlements, store
src/core/sync.js          WebSocket transport + outbox flushing; calls store.js, never IndexedDB
src/core/p2p.js           WebRTC document transfer (browser-only impure edge)
src/domain/syncOps.js     diff -> ops, apply ops, HLC clock, merge rules   (pure, shared with server)
src/domain/licensing.js   effective licenses from cert + device policy     (pure; entitlements.js stays beside it)
src/domain/visibility.js  partition projection, reveal/hide rules          (pure)
src/data/syncPolicy.js    path -> local | account | gm | table | player    (data)
src/data/features.js      feature-flag ids + defaults                      (data)
src/ui/portal/            portal surface: sign-in, account, devices, licenses, store, cart, help
styles/portal.css         portal layout (shares tokens.css)
admin.html + src/admin/   separate admin entry, own bundle (dist/admin.bundle.js)
server/                   Worker + Durable Objects + D1 migrations; own package.json (dev deps OK)
src/data/helpArticles.js  help-centre articles (Markdown subset, rendered by src/domain/helpCentre.js)
```

`scripts/build.js` gains a second entry point, `src/admin/main.js` →
`dist/admin.bundle.js`, so admin code never ships to ordinary users.
`server/` imports `src/domain/syncOps.js` and `src/domain/licensing.js`
directly. They are pure, so they run unchanged in Workers and in
`node --test`.

### 2.3 Branches

Server-side work lives on the long-lived **`server`** branch, so `main` keeps
shipping the core app while the server is built and tested.

| Work | Branch |
|---|---|
| Core features and fixes, including **all of Phase S0** (no server needed) and any `store.js`/domain seam a later phase needs | `main`, first |
| `server/`, `src/core/account.js` / `sync.js` / `p2p.js`, `src/ui/portal/` flows that call the API, `admin.html` / `src/admin/` | `server` |

- **`main` flows into `server`, never the reverse until a phase is ready.**
  Merge `main` into `server` (`git merge main`, not rebase, because it's a
  shared branch) after every core change worth having there, and at least
  before starting each server task. The trickle of core changes therefore
  never piles up into one big conflict.
- **A core change discovered while on `server`** (a missing store key, a
  domain bug) is made on `main` and merged across. It isn't committed on
  `server` alone, so the two never disagree about the core.
- **Shipping a phase:** when S1, S2, ... is done and verified, merge `server`
  into `main` (a pull request). New server code stays inert in the
  signed-out app (G1), so `main` remains deployable at every merge.
- Only `main` deploys to GitHub Pages. CI (`.github/workflows/test.yml`)
  runs `npm test` on pushes and pull requests to both branches, plus
  `server/`'s own tests on `server` once it has any.

---

## 3. Identity and sessions

### 3.1 Sign-in methods (familiar, passwordless-first)

1. **Email + one-time code** (6 digits, 10-minute expiry). This is the
   universal fallback and the account-recovery anchor.
2. **Passkeys (WebAuthn)**, offered right after the first sign-in ("Sign in
   faster next time").
3. **"Continue with Google / Apple / Discord"** (OAuth 2.1 + PKCE). Discord
   matters for this audience.

No passwords means no password storage, reset flow or breach liability. A
password option can be added later if users ask for it.

### 3.2 Sessions

- **Refresh token:** an `HttpOnly; Secure; SameSite=Strict` cookie scoped to
  `/api/auth`, rotated on every use. Reuse detection revokes the whole
  device session.
- **Access token:** short-lived (15 min), held in memory only, sent as
  `Authorization: Bearer`. A reload calls `/api/auth/refresh`.
- **Device record:** each instance (browser profile × origin) gets a
  `deviceId` and a non-extractable WebCrypto key pair generated on first
  sign-in. `store.js` persists the key handle; IndexedDB can hold
  `CryptoKey` objects. The device signs a server challenge at refresh, so a
  stolen cookie alone can't impersonate the device.

### 3.3 `file://` mode

Recommendation (D2): **signing in is supported only on the hosted `https`
origin.** Under `file://`:
- origins are opaque, so storage isolation is weak;
- passkeys and OAuth redirects don't work;
- cookies don't apply.

The double-click `file://` build stays exactly today's signed-out app. A
banner offers "Open the online version to sync", and the existing export
and import moves a campaign across. If `file://` sign-in proves essential,
a device-code flow (enter a code shown on another signed-in device) is the
fallback design, with the token kept in memory only.

---

## 4. Licensing and the modular component model

### 4.1 Today (unchanged vocabulary)

- `LICENSES` (`src/data/licenses.js`) is the registry of ownable books.
  Supplements ride on their game's license; open (CC-BY) licenses are always
  owned.
- `appConfig.licenses` holds install-wide ownership; `store.js` overlays it
  onto every doc's `settings.licenses`.
- A system is *in use* when it is owned and also picked, either as Module
  for Profile or in a Rules Constitution area (`isGameSystemActivated`).
- `canAccessGameSystem(appConfig, id)` in `entitlements.js` is the
  documented seam: "a real registration/subscription service replaces later
  without touching any call site".

### 4.2 What the account adds: three entitlement kinds, one resolution

| Kind | Examples | Granted by |
|---|---|---|
| **License** (existing ids) | `fiveleagues`, `hostile`, `swn` | Attestation, purchase, admin grant, redeem code |
| **Feature** (new, `src/data/features.js`) | `sync.devices`, `sync.tables`, `tables.maxPlayers:6`, `p2p.transfer`, `content.premiumPacks` | Product purchase, plan, admin grant, trial |
| **Module** (existing plugins and providers: Hex Crawl, Dungeon Crawl, Rules Constitution providers) | `plugin.hexcrawl` | Usually *implied* by a license or feature. Listed separately so the admin panel can switch one off for a user or roll it out by flag. |

Every entitlement row carries:
- `source`: one of `open | attested | purchase | grant | redeem | trial`
- `startsAt` and `endsAt` (null means perpetual)
- `revokedAt`
- the order or grant that created it

**Effective ownership on a device** is computed by one pure function in
`src/domain/licensing.js`:

```
effectiveLicenses(cert, devicePolicy, localAttestations, signedIn) =
  signedIn
    ? (cert.licenses ∪ OPEN) − devicePolicy.excluded            // focused mode: ∩ devicePolicy.only
    : (localAttestations ∪ OPEN)                                // exactly today's behaviour
```

`overlayProfileWith()` in `store.js` swaps `appConfig.licenses` for
`effectiveLicenses(...)`. Every existing reader (`isLicensed`,
`isGameSystemActivated`, Docs-library scoping, `isPackInUse`) keeps working
untouched. `canAccessGameSystem()` (`entitlements.js`, which stays the seam
for what an install may activate) reads the same certificate's allow/deny
map.

### 4.3 The entitlement certificate (works offline)

- `GET /api/entitlements` returns a compact payload: licenses, features,
  modules, `issuedAt`, `expiresAt` (30 days), `deviceId`, `accountId`. It is
  signed with the server's **ECDSA P-256** key, chosen for WebCrypto support
  in every current browser. The public key is pinned in the bundle and can
  be rotated via a `kid`.
- `store.js` caches the certificate. The client verifies it at boot and on
  every push.
- The account room pushes `entitlements.changed` the moment a purchase
  completes or an admin revokes something, so every open instance updates
  within a second. Closed instances refresh on next launch.
- When offline past `expiresAt`: a 14-day grace period with a banner, then
  paid **features** pause (sync, tables). Campaign data, open licenses and
  attested licenses keep working. Data is never locked away (Constitution
  rule 5 in spirit).

> Honesty note: anything enforced only inside a static JS bundle can be
> patched by a determined user. The certificate drives the *experience*.
> Real enforcement lives at the server-side choke points: the sync rooms
> (feature checks on connect), table size limits, premium content-pack
> downloads, and P2P transfer tickets for license-gated sourcebooks
> (section 6.4).

### 4.4 Per-device installation: privacy and focus (G7)

Every device record carries a **device policy**:
- `mode: 'follow' | 'focused'`
- `excluded: [licenseId]` (used in follow mode)
- `only: [licenseId]` (used in focused mode)

UI under Settings → Licenses, or Account → Devices → *this device*:
- Each license row gets a toggle, **"Installed on this device"** (default
  on). Off means the device behaves as if the license isn't owned. Its
  systems, Docs-library books, oracle content, Turn Steps and pull buttons
  disappear.
- A **"Focused install"** switch lists only the checked licenses. This is
  useful for a dedicated convention-table laptop.

The policy is stored both locally and on the server's device record, so the
admin panel and the user's other devices can see it. It is applied only on
that device, and it doesn't affect ownership.

A campaign that uses an excluded system still opens, and its data is
untouched. The affected areas render in the same "locked" state
`gameSystemActivationSection` already uses for entitlement-denied systems,
with an "Install on this device" button.

**Deactivate:** removing a license from the account (user action, refund or
admin revoke) drops it from the next certificate, so it disappears from
every instance. The campaign data it produced stays, matching how a stored
SWN pick is honoured today when the book is later un-owned.

### 4.5 Third-party books vs. things GMAtlas can sell (decision D4)

Most entries in `LICENSES` are other publishers' books (Modiphius,
Sine Nomine, Mongoose, ...). Their `text` is a *self-attestation* ("I own
... for my own personal GM reference"). Under accounts:
- **Attested licenses stay attestations.** Ticking "I own Five Leagues"
  creates an account entitlement with `source: 'attested'`. It now follows
  the user to every device, which is G7, but it isn't a sale. The existing
  checkbox becomes the account-level attestation, and the first sign-in
  offers to lift the install's current ticks into the account.
- **The store sells GMAtlas's own products only:** a sync plan, a tables
  plan, GMAtlas-original content packs, and publisher-licensed packs where
  an agreement exists. A future `verified` source can check proof of
  purchase (for example a DriveThruRPG order lookup) if a publisher requires
  it.
- **Third-party sourcebook PDFs must not be served from the public server**
  once it is multi-user, since that would be redistribution. Today's "Load
  from web server" (`assets/docs/`) becomes:
  - "Import my copy" (pick the file locally);
  - P2P from the user's own devices (section 6);
  - the server only for GMAtlas-owned or open (CC-BY) PDFs.

  The `LICENSES[*].docs` keys stay as the stable link identity, so
  mentions, the TOC library and the Mechanics Index keep resolving.

### 4.6 Licenses at a multiplayer table (decision D5)

- **Table content** (entities, scenes and journal the GM reveals) is
  readable by every member. A player doesn't need the GM's game licenses to
  see a revealed NPC statblock, the same model D&D Beyond uses for campaign
  content sharing.
- **Sourcebook PDFs are never shared** between accounts, not even P2P. Each
  person brings their own.
- **Features are per account but table-scoped:** the GM's `sync.tables`
  plan covers the table and its seat limit, so players need a free account
  only.
- Each product has an admin-editable `tableShareable` flag, so a future
  publisher deal can choose differently.

---

## 5. Synchronization

### 5.1 Why a field-level op log (not "upload the document", not a vendored CRDT)

Today every change is `store.update(fn)`. A pure mutator returns a new doc,
the store notifies subscribers, then it persists. That gives two snapshots,
`prev` and `next`, for every change, which is exactly what a diff needs.

**Choice: diff each update into field-level ops, merged by per-field
last-writer-wins (LWW) on a hybrid logical clock, with id-keyed
collections.**
- No domain module changes. The ~100 `store.update` call sites stay as they
  are.
- Zero dependencies, pure, and testable in `node --test`. The server runs
  the same code.
- It fits the data. Almost every collection is already an array of objects
  with stable ids (`<prefix>_<base36>_<rand>`; Constitution, "The campaign
  document"). Two GMs editing *different* fields or entities never
  conflict.

Rejected alternatives:
- **Whole-document upload:** slow on large campaigns, loses concurrent
  edits.
- **Automerge:** WASM, which is heavy and awkward under the bundler and
  `file://`.
- **Yjs as the source of truth:** it would need the campaign doc to *become*
  a Y.Doc, which means rewriting `store.js`'s contract and running a
  mirror. Yjs stays the planned escape hatch for one narrow case, real-time
  co-typing inside the *same* long text field (section 5.3). It would be
  vendored like PDF.js and used only for fields flagged `text: 'collab'` in
  `syncPolicy.js`.

### 5.2 The op model (`src/domain/syncOps.js`)

```
Op   = { p: Path, k: 'set' | 'del', v?: any, t: HLC }
Path = ['entities','items',{id:'npc_lq3k_x9'},'name']   // records addressed by id, never by index
HLC  = '<ms base36>.<counter base36>.<deviceId>'         // sorts as text; the device id breaks ties
```

- **`diffDoc(replica, next, {hlc, policy})` → Op[]** (built in S0)
  - Deep-compares, because `store.update()` hands over a full clone with
    no shared structure: about 8 ms for a ~1 MB campaign.
  - Arrays of records become per-record ops.
  - A record array's order is its own last-writer-wins register (the list
    of ids), sent only when the order actually changed. Records it doesn't
    list follow, sorted by id.
  - Any other array (tags included) and any scalar is one value. Add-wins
    sets for tags can come later if real use shows concurrent tag edits
    clashing.
- **`applyOps(replica, ops)` → replica:** pure. A replica is the document
  plus a clock tree recording when each path was last written.
  - The latest clock wins per path. A write to an ancestor keeps any newer
    descendant.
  - A record delete is absolute.
  - A container recreated only to hold newer values disappears again when
    they do.
  - Convergence is tested exhaustively for every three concurrent edits
    across 12 kinds of overlapping change, in every clock and delivery
    order, plus a random three-replica fuzzer with drifting clocks
    (section 14).
- **Paths are classified by `src/data/syncPolicy.js`:**
  - `local`: never leaves the device. `drawers` widths, open panels,
    `activeCampaignId`, bound file handle, scroll and collapse UI state.
  - `account`: the user's own devices. Rules Profiles, Turn Step Lists,
    `tocLibrary`, template edits, attestations, cart.
  - `gm`: the campaign's GM partition.
  - `table`: the shared partition.
  - `player:<uid>`: per-player.
  - `overlay`: never stored in the campaign at all (`store.get()` splices it
    in from appConfig).

  `table` and `player` (S5) are chosen per record by a `visibility` field,
  not by path. A test fails if a top-level campaign or appConfig key has no
  policy, so nothing is synced or leaked by accident. Bytes are kept out by
  `diffDoc` refusing any `data:` URL, not by a scope.

### 5.3 Editing-time behaviour (what the GM feels)

- **Local:** unchanged and instant. `store.update` still applies and
  notifies synchronously. `store.js` additionally appends the diff ops to a
  persisted **outbox** in the same IndexedDB transaction as the doc write.
  The existing rollback-on-persist-failure logic covers both.
- **Remote:** a new `store.applyRemote(partition, ops)` merges and persists,
  then notifies through the same `subscribe()` path. The render loop doesn't
  know where a change came from.
- **The field being typed in is never yanked.** If a remote op targets the
  path bound to `document.activeElement`, it is applied to the doc but that
  input isn't re-rendered until blur. The existing blur-commit and
  `beforeunload` force-blur machinery already defines that moment. If the
  local commit then loses LWW to a newer remote value, a small "Edited on
  *Laptop* moments ago — keep mine / take theirs" chip appears on that
  field, and nothing is silently dropped.
- **Long text** (journal, scene summary, notes): concurrent edits to the
  *same* field within a short window are kept as both versions, with a
  merge chip, until the Yjs escape hatch is adopted for those fields.
- **Presence:** avatars in the top bar show who's in the campaign and which
  panel or entity each person has open. A soft "*Sam* is editing" marker
  appears on an entity card. There are no hard locks.

### 5.4 Wire protocol (one WebSocket per scope)

```
C→S hello      { v:1, deviceId, scope:'campaign:<id>'|'account', cursors:{partition: lastSeq}, cert }
S→C welcome    { role, partitions:[...], snapshot?:{partition, seq, blobRef}, catchup:[{seq, env}] }
C→S push       { partition, batchId, env }            // env = encrypted, gzip'd Op[] (batched ≤100 ms)
S→C ack        { batchId, seq }
S→C ops        { partition, seq, env, from:deviceId } // fan-out to every other socket in the room
C↔S presence   { panel, entityId?, typing? }          // ephemeral, never stored
S→C snapshotReq{ partition, uptoSeq }                 // ask an online member to compact
C→S snapshot   { partition, uptoSeq, env }
S→C revoked    { reason }                             // membership or feature removed
```

- The room assigns a monotonically increasing `seq` per partition.
  Reconnect sends `cursors`, so only missing ops travel.
- The room enforces write ACL **per partition** (section 7.2) and feature
  checks (`sync.devices`, `sync.tables`, seat limit) from the D1 entitlement
  rows on connect. It never needs to read op contents.
- **Compaction:** every ~2,000 ops or 5 MB, the room asks an online member
  to upload an encrypted snapshot, then trims the ops below it. Cold open is
  then snapshot + tail.

### 5.5 End-to-end encryption (decision D3, recommended from day one)

- Each partition has a random AES-GCM key. Ops and snapshots are encrypted
  client-side, and the server stores and relays ciphertext only.
- **Key distribution:** each device has an ECDH key pair (section 3.2). A
  partition key is wrapped to every authorised device's public key, and new
  devices are approved by an existing device ("Approve *Phone* — code
  482 913"). A **recovery key** (shown once, printable) is the escape hatch
  when every device is lost.
- **Benefits:**
  - The server never holds readable campaign text, including
    transcriptions of third-party books.
  - The admin panel can't see campaign content even by mistake.
  - Breach and privacy exposure shrinks to account metadata.
- **Cost:** the server can't compact or search content (clients compact,
  see above), and losing every device *and* the recovery key loses the
  synced copy. Every device still keeps its full local copy, so this is a
  sync loss, not a data loss.

Designing the envelope in from S2 is cheap. Retrofitting encryption onto a
plaintext op log later is not.

### 5.6 Starting to sync an existing campaign

- **First device:** "Sync this campaign" uploads an encrypted snapshot as
  seq 0. The campaign's existing `meta.id` becomes its room id.
- **Another device:** Account → Campaigns lists synced campaigns, and "Open
  on this device" downloads snapshot + tail.
- **Same `meta.id` already present locally** (a campaign imported onto two
  devices before sync existed): offer
  - **Replace local with synced copy** (the local one goes to the backup
    slot first), or
  - **Keep both** (fork: the local copy gets a new id and title suffix "(this
    device)").

  An automatic merge is not offered here, because the two histories share
  no clock.
- **appConfig** (profiles, Turn Step Lists, TOC library, attestations) syncs
  through the **account room** as the `account` partition. With two
  devices' existing profiles, the first sync unions them by id and
  same-named defaults are de-duplicated by the existing backfill functions.

---

## 6. Local documents: transfer without upload (G6)

### 6.1 Content-addressed blobs (fixes "breaking links" at the root)

- Every stored byte payload is keyed by **`sha256:<hex>`** of its contents:
  uploaded library files, gallery originals and thumbnails, battlemap
  images, loaded sourcebook PDFs.
- The campaign doc stores only metadata: `{id, title, fileName, mime,
  bytes, blobKey: 'sha256:…', tags}`. Doc ids and `@mention` resolution
  (by doc id / name, and by `assets/docs/...` key for sourcebooks) are
  unchanged. A link therefore resolves on every instance whether or not the
  bytes are there.
- **Migration (rule 5, lossless):**
  - **Built in S0:** gallery images and videos and legacy inline `dataUrl`
    documents move into `docBlobs` under `sha256:` keys after every load,
    import and update. Every export puts them back inline, so export files
    keep their old shape. Without this, a synced campaign *would* upload
    images through the op log; as a side benefit every save is cheaper.
  - **Built in S3:** uploaded documents are hashed on import, and older ones
    are re-keyed by content in the background, with a per-device alias so the
    old key still resolves (`design/adr/document-transfer.md`).
- `diffDoc` refuses any `data:` URL in an op (built in S0, tested).

### 6.2 "Not on this device" UX

A document whose bytes are missing renders normally in lists and mentions,
with a small ☁̸ badge. Opening it shows a card:

> **Rulebook notes.pdf** isn't on this device yet.
> Available on: *Desktop · Chrome* (online now), *Laptop · Edge* (last seen 2 days ago)
> [Get it from Desktop] [Import file…]

A batch version is available as "Get all missing documents for this
campaign".

### 6.3 Transfer channels, in order of preference

1. **Peer-to-peer (WebRTC data channel)** between two of the user's own
   online instances. The account room relays only signalling (SDP and ICE
   candidates). Bytes go directly between devices, DTLS-encrypted, in 256 KB
   chunks with a SHA-256 check at the end.
   - **TURN** relay is used only if a direct path fails. TURN traffic is
     still DTLS-encrypted end to end, and is disclosed in Settings, with a
     "Direct connections only" toggle (decision D7).
2. **File bundle:** today's bulk library export/import, upgraded to carry
   `sha256` keys so an import rejoins existing links. This works fully
   offline, signed out and under `file://`.
3. **Re-import the same file:** importing any file whose hash matches a
   missing blob automatically fills that link.

### 6.4 License-gated documents across accounts

Within one account, P2P transfer of any of the user's own files is allowed.
Between accounts (a GM and players), sharing an *uploaded* document needs
the GM's explicit "Share with table" on that document. A Reference Library
sourcebook PDF (any key under a third-party `LICENSES[*].docs`) can't be
sent to another account at all.

The server enforces this by issuing **transfer tickets**: the signalling
relay refuses to pair two devices for a blob unless the ticket allows it.

---

## 7. Multiplayer tables

### 7.1 Roles

| Role | Can |
|---|---|
| **GM** (owner) | Everything; invite or remove; reveal or hide; transfer ownership |
| **Co-GM** | Everything in the GM partition except membership and ownership |
| **Player** | Read the `table` partition; write their own `player:<uid>` partition and the table "roll and chat" stream |
| **Viewer** | Read `table` only (stream audience, spectators) |

### 7.2 Partitions: how "players see only what's revealed" works with E2E

A campaign is several sync partitions, each with its own key and its own
server-side write ACL:

| Partition | Readers (hold the key) | Writers (server-enforced) | Contents |
|---|---|---|---|
| `gm` | GM, co-GMs | GM, co-GMs | The full campaign doc, as today |
| `table` | Every member | GM, co-GMs (+ players for the `rolls`/`chat` subpaths only) | A *projection*: revealed entities, the current scene, the public journal, the party sheet |
| `player:<uid>` | That player + GMs | That player + GMs | Their character, private notes, their asks to the GM |

- **Revealing** is a GM action: "Reveal to table" on an entity, scene,
  journal entry or field. The pure `visibility.js` projects that item from
  `gm` into `table` (with a `revealedFrom` id, so edits flow one way, GM →
  table). Hiding writes a tombstone to `table`. The domain gets one new
  field, `visibility: 'gm' | 'table'` on entities, journal entries and
  scenes. It defaults to `gm`, so nothing is ever shown by accident.
- **Players** run the same bundle in **player mode**. The campaign surface
  hides GM-only panels, and the WHO/WHERE/WHAT/WHY/HOW dashboard renders
  from the `table` projection. This is a profile of the existing UI, not a
  second app.
- **Invites:** "Share table" gives a link or 8-character code with a role,
  an expiry and a use limit. Opening the link goes to sign-in, then "Join
  *The Ashen Hand* as Player", then picking or creating a character.

### 7.3 Simultaneous play specifics

- **Dice and oracle rolls** are appended to `table/rolls` as their own
  ordered stream. The server `seq` gives everyone the same order. Rolls stay
  real randomness on the roller's device (Known non-issue: never make
  gameplay rolls deterministic), and the result is what syncs.
- **Turn and initiative state** (future Encounter Manager) is a single
  GM-owned register, so there's no contention.
- **Seat limit** is enforced at `hello` from the GM's `tables.maxPlayers`
  feature.

---

## 8. The portal surface: sign-in, account, store, help (G8)

### 8.1 One bundle, two surfaces

- `index.html` gains a second mount root: `<main data-portal hidden>`
  beside the campaign `[data-workspace]`.
- Hash routes `#/signin`, `#/account/*`, `#/store/*`, `#/cart`,
  `#/help/*` switch surfaces. Any other hash is the campaign. Back and
  forward buttons, deep links and "open in new tab" all behave as they do
  in other apps.
- `mountPortal()` registers **one delegated listener per event type on the
  portal root**. This is Constitution rule 4 applied per surface, and it
  needs a one-line amendment: "per surface root (campaign shell, portal,
  admin page)".
- The admin panel is a **separate page**, `admin.html` with
  `dist/admin.bundle.js`. It uses the same `portal.css` plus a few admin
  table styles, and it only works for accounts with an admin role. The
  server re-checks the role on every `/api/admin/*` call.

### 8.2 Distinct CSS, shared tokens

- `styles/portal.css` uses tier-1 and tier-2 tokens from `styles/tokens.css`
  (colours, `--sp-*`, type scale), so dark and light themes match. It
  **doesn't** import `cockpit.css` or the genre stylesheets.
- A portal page should look like a modern SaaS settings or store page, not
  a sci-fi or fantasy cockpit:
  - centred auth cards (max 400 px);
  - a left-nav + content layout for Account (max 960 px);
  - a product grid → product page → slide-over cart;
  - a help centre with a search bar, categories and an article view with a
    table of contents.
- All selectors are scoped under `.portal`. The surfaces never share layout
  classes, so a cockpit CSS change can't break checkout and vice versa.
- The top-right **account menu** is the one element present on both
  surfaces: avatar, sync status dot, Account, Devices, Store, Help, Sign
  out. It is the bridge between them.

### 8.3 Familiar workflows

| Flow | Steps (deliberately conventional) |
|---|---|
| **Sign in / sign up** (one flow) | Email → 6-digit code → done (new email = new account, name asked once). Or Continue with Google / Apple / Discord, or Use a passkey. After the first sign-in: "Add a passkey?" and "Bring this device's licenses and campaigns into your account?" |
| **Account → Profile** | Name, avatar, email (change = verify a code), connected sign-ins, passkeys |
| **Account → Devices** | List with name, browser, last seen and "This device". Rename, sign out remotely, per-device Installed Licenses (section 4.4), approve a new device's encryption key |
| **Account → Licenses** | Owned licenses by family (the same grouping as today's Licenses tab), each with its source (Purchased / Attested / Granted / Open) and a "Deactivate" action that confirms first |
| **Account → Billing** | Plan, next charge, invoices, "Manage payment method" (the provider's hosted portal) |
| **Account → Privacy & data** | Export everything, delete account (30-day grace), recovery key, "Direct connections only" |
| **Store** | Catalog grid → product page (what it unlocks, listed by license, feature and module) → Add to cart → slide-over cart → Checkout (hosted provider page) → return to "Thanks — unlocked on all your devices" |
| **Redeem code** | Account → Licenses → "Redeem a code" (Kickstarter backers, gifts, support grants) |
| **Help centre** | Search box first, categories (Getting started, Campaigns, Sync & devices, Tables, Licenses & billing, Troubleshooting), articles from `help/*.md`. Each campaign panel gets a small "?" that deep-links to its article |
| **Guides** | Step-by-step walkthroughs ("Run your first session", "Invite your players") as help articles with a progress checklist. The **in-campaign Guide drawer** (rules guides, sourcebook TOCs) stays separate. That one is game content, this one is product help |

Cart contents sync through the `account` partition, so a cart started on a
phone is there on the desktop, as in any store.

---

## 9. Admin panel (G5)

Separate page (`admin.html`), role-gated by the server.

| Area | Capabilities |
|---|---|
| **Users** | Search by email, name or id. Profile, sign-in methods, devices (with per-device policy, read-only), sessions (revoke), campaigns owned or joined (*metadata only*: title, size, members, last activity; E2E means content isn't visible) |
| **Entitlements** | Per user: grant or revoke a license, feature or module with an expiry and a required note; extend a trial; convert an attestation; bulk grant by CSV |
| **Products & catalog** | SKUs mapped to `{licenses[], features[], modules[]}`, price ids, `tableShareable`, active/hidden, sort order. Validation against `LICENSES` and `features.js` ids, so a typo can't create a ghost license |
| **Feature flags** | Default, per-user overrides, percentage rollout, kill switch (for example disable `p2p.transfer` globally). Shipped in the entitlement certificate |
| **Orders** | Mirror of provider orders and webhooks, refund link (a refund revokes the purchase entitlement through the webhook), failed-payment queue |
| **Redeem codes** | Generate batches with a grant, expiry and max uses; usage report |
| **Tables** | Campaign rooms: member counts, seat-limit overrides, force-close a room (abuse) |
| **Audit log** | Every admin write and every entitlement change, append-only: actor, action, target, before/after, note |
| **Admin roles** | Owner, Admin, Support (users + grants + trials, no refunds or catalog), Content (catalog + flags) |

**Deliberately absent:** any "view campaign contents" or "impersonate user"
tool. Support works from metadata, and the user can export a diagnostic
bundle themselves.

---

## 10. Server data model (D1)

```
users            id, email(unique), display_name, avatar, roles json, status, created_at
identities       user_id, provider(email|google|apple|discord), subject, created_at
passkeys         id, user_id, public_key, sign_count, transports, created_at
devices          id, user_id, name, platform, ecdh_pub, sign_pub, policy json, created_at, last_seen_at, revoked_at
sessions         id, device_id, refresh_hash, rotated_from, expires_at, revoked_at
entitlements     id, user_id, kind(license|feature|module), ref, value, source, order_id, grant_id,
                 starts_at, ends_at, revoked_at, revoked_by, note
products         sku, name, description, grants json, price_ref, table_shareable, active, sort
orders           id, user_id, provider, provider_ref, status, items json, total, currency, created_at
redeem_codes     code_hash, grants json, expires_at, max_uses, uses, batch, created_by
feature_flags    key, default_value, rollout json, overrides json, updated_by, updated_at
campaigns        id, owner_id, created_at, last_activity_at, member_count, approx_bytes   -- no content
memberships      campaign_id, user_id, role, joined_at, invited_by, removed_at
invites          code_hash, campaign_id, role, expires_at, max_uses, uses, created_by
wrapped_keys     partition_id, device_id, wrapped_key, wrapped_by_device, created_at
audit_log        id, at, actor_id, action, target_kind, target_id, before json, after json, note
```

Each campaign Durable Object's own SQLite holds:
- `ops(partition, seq, device_id, batch_id, env blob, at)`
- `snapshots(partition, upto_seq, env blob, at)`
- `presence` (in memory only)

---

## 11. Client persistence changes (`store.js` stays the only persistence module)

New `kv` keys, all owned by `store.js` (rule 2):

| Key | Contents |
|---|---|
| `device` | `deviceId`, non-extractable signing/ECDH `CryptoKey` handles, device policy |
| `entitlementCert` | Last verified certificate |
| `outbox:<campaignId>` / `outbox:account` | Unacknowledged op batches, written in the same transaction as the doc |
| `cursor:<campaignId>` / `cursor:account` | Last applied `seq` per partition |
| `partitionKeys` | Unwrapped partition keys, as non-extractable `CryptoKey`s |
| `blobAliases` | Old `blobKey` → `sha256:` key |

New public surface:
- `store.applyRemote(scope, partition, ops)`
- `store.outbox(scope)`
- `store.ackOutbox(scope, batchId)`
- `store.cursor(scope)`
- `store.setCursor(...)`
- `store.getDevice()` / `store.setDevicePolicy(policy)`
- `store.getCert()` / `store.setCert(cert)`

`account.js`, `sync.js` and `p2p.js` do networking only and call these. The
access token stays in memory and is never persisted.

The service worker (`sw.js`) must **bypass `/api/*` and WebSocket upgrades
entirely**: no caching, no offline fallback to `index.html`. Portal routes
are hash routes inside the cached shell, so they need no SW change.

---

## 12. Delivery phases

Each phase ships on its own and follows the Testing posture: pure domain
functions with `node --test` coverage first, then a thin view, then a jsdom
smoke run of the built bundle.

### S0 — Groundwork, no server (built, v0.98.0)

Recorded in `design/adr/sync-groundwork.md`.

1. Gallery images and videos (which battlemaps and portraits use) and
   legacy inline documents move into `docBlobs` under `sha256:` content
   keys. Exports re-inline them. Re-keying existing uploaded documents
   moved to S3.
2. `src/data/syncPolicy.js`, with a test that every top-level campaign and
   appConfig key is classified.
3. `src/domain/syncOps.js`: HLC, `diffDoc`, `applyOps`. Tests:
   - the exhaustive three-edit convergence test (62,208 cases);
   - a seeded three-replica fuzzer with drifting clocks;
   - local-apply exactness;
   - a 1 MB diff timing ceiling.
4. `src/domain/licensing.js` (`effectiveLicenses`, `certStatus`) beside
   `entitlements.js`. The store's overlay reads it, and signed-out output
   equals the install's ticks.
5. Portal surface: `portal.css`, hash router, `mountPortal()`, and the Help
   centre with eight articles. Reached from gear menu → Help & guides; works
   signed out and offline.
6. Constitution amended: rule 4 per surface root; new rule 6.

### S1 — Accounts and account-wide licensing

1. `server/` scaffold: Worker, D1 migrations, email-code + passkey + OAuth
   sign-in, sessions, devices. **Built**, apart from Apple sign-in
   (`design/adr/passkeys-oauth.md`).
2. `account.js`, the sign-in flow, Account → Profile / Devices / Licenses /
   Privacy.
3. Entitlement certificate: issue, verify, cache, account-room push.
   - Attestation lift-in at first sign-in.
   - Per-device Installed / Focused policy.
   - Deactivate.
4. Admin v1: users, entitlements (grant/revoke/trial), feature flags, audit
   log. **Built** (`design/adr/admin-v1.md`).
5. Third-party PDF handling change (section 4.5): "Import my copy" replaces
   public `assets/docs` loads for non-open licenses. **Built**
   (`domain/permissions.js` `referenceDocSource`; the hosted site ships
   open PDFs under 25 MiB only; the Monster Manual is now its own owned
   license, `dnd5e-mm`, since it isn't part of the CC-BY SRD).

### S2 — Personal sync across one user's devices

**In progress.** Slice S2a is built on the `server` branch
(`design/adr/personal-sync.md`):
- the campaign room, the wire protocol (simplified to one `gm` partition),
  the outbox and cursors, reconnect catch-up, and snapshots;
- all of item 2, with one key per campaign standing in for partition keys;
- "Sync this campaign", "Open on this device", and replace-or-keep-both;
- holding remote changes while a field is being typed in;
- appConfig sync: Rules Profiles, Turn Step Lists, the TOC library and
  each campaign's profile, as one encrypted, versioned account record over
  REST (polled every 30 s) rather than an account room;
- conflict chips (exact: each batch carries the sender's cursor),
  presence-lite from the campaign room, and the sync-status dot.

- the `sync.devices` gate (server refuses sync writes; the app says so).

S2 is built; it moves to `main` by pull request.

1. Campaign room and account room, the wire protocol, outbox and cursors,
   reconnect catch-up, compaction.
2. E2E: device key pairs, partition keys, new-device approval, recovery
   key.
3. "Sync this campaign", "Open on this device", the fork-or-replace
   collision prompt, appConfig sync through the account partition.
4. Active-field protection, conflict chips, presence-lite (which devices
   are online), sync-status dot.
5. Gate: `sync.devices` feature.

### S3 — Document transfer without upload

**Built** (`design/adr/document-transfer.md`), behind `p2p.transfer`
(off by default): uploads keyed by content with old keys aliased (the 6.1
S3 step), the badges and card, WebRTC transfer between the owner's open
devices (signalling sealed through the campaign room rather than an
account room; 64 KiB chunks; TURN only when configured; "Direct
connections only"), hash-matched re-import, and hash-carrying bundles.
Not yet: sourcebook PDFs device to device.

1. "Not on this device" badges and cards, and "Get all missing".
2. WebRTC P2P via account-room signalling, chunked with hash verification.
   TURN disclosure and the "Direct only" toggle.
3. Bundle export/import carries hash keys, and hash-matched re-imports
   fill links automatically.

### S4 — Store and billing

1. Products catalog, cart (account-synced), hosted checkout, webhooks →
   entitlements, receipts, Billing page.
2. Redeem codes; Orders, Products and Codes in admin.

### S5 — Multiplayer tables

1. Partitions `table` / `player:<uid>`, server write ACL, the
   `visibility.js` projection, and "Reveal to table" / "Hide" controls.
2. Invites, roles, seat limits, player mode of the campaign surface, full
   presence (who's looking at what), the `rolls`/`chat` stream.
3. Cross-account document sharing with transfer tickets (section 6.4).

### S6 — Hardening and polish

Load tests (50 concurrent tables, 6 players each), key rotation, abuse
limits, the Yjs escape hatch for co-typed long text *if* real use shows
it's needed, help-centre guides with checklists, and admin metrics.

---

## 13. Performance and reliability targets

| Measure | Target |
|---|---|
| Local edit → UI | Unchanged (synchronous, as today) |
| Edit → visible on another open device, same region | p50 < 250 ms, p95 < 600 ms (≤ 100 ms batching + one hop) |
| Reconnect after 1 hour offline, 300 local edits | < 1 s to upload and fully catch up |
| Cold open of a synced 1 MB campaign on a new device | < 2 s (snapshot + tail, gzip) |
| `diffDoc` per update, 1 MB doc | < 15 ms (≈ 8 ms measured in S0) |
| Server cost of an idle open table | ~0 (hibernated sockets) |
| Data loss on server outage | None. Every device holds a full local copy plus an outbox |

---

## 14. Testing strategy

- **Domain (`node --test`):**
  - syncOps convergence fuzzer, idempotency and commutativity;
  - every `syncPolicy` path classified, and the `data:` URL ban;
  - `effectiveLicenses` matrix (signed in/out × follow/focused × excluded ×
    expired certificate × grace period);
  - `visibility` projection (nothing `gm` ever appears in `table` without
    an explicit reveal);
  - blob alias migration.
- **Server:**
  - `server/` tests under the platform's local runtime (`wrangler dev` /
    Miniflare);
  - ACL tests (a player writing to `gm` gets rejected; a removed member's
    socket is closed);
  - certificate signing round-trip against the client verifier;
  - webhook → entitlement idempotency.
- **Multi-device smoke:**
  - two or three jsdom instances of the built bundle, each with its own
    `fake-indexeddb`, against a local server;
  - concurrent edits, offline-then-reconnect, a license revoked mid-session
    and disappearing from all instances, a per-device exclusion hiding a
    system on one instance only.
- **Manual:**
  - two real browsers plus a phone on the hosted build, for latency feel,
    passkeys, OAuth and WebRTC across NATs.

---

## 15. Decisions needed (with recommendations)

| # | Decision | Recommendation |
|---|---|---|
| D1 | Hosting platform | **Cloudflare Workers + Durable Objects + D1.** Alternative: Node + Postgres + Redis on a VPS (more ops work, same protocol) |
| D2 | Sign-in under `file://` | **No.** Signed-out only there; hosted `https` for accounts |
| D3 | End-to-end encryption | **Yes, from the first sync release (S2)**, with a recovery key |
| D4 | Third-party book licenses | **Attestation follows the account**; the store sells GMAtlas products only; no public serving of third-party PDFs |
| D5 | Does the GM's plan cover the table? | **Yes** for revealed content and table features; never for PDFs |
| D6 | Payments | **A merchant of record (Paddle)** if selling worldwide as a small operation (it handles VAT and sales tax); **Stripe Checkout + Stripe Tax** if more control is wanted |
| D7 | TURN relay for P2P | **On, disclosed**, with a "Direct connections only" toggle |
| D8 | Device limit per account | **None by default**; an admin-configurable per-product cap if abuse appears |

---

## 16. Rules this plan keeps and the amendments it needs

Kept as-is:
- Rule 1: one versioned campaign document. Partitions are replicas or
  projections of it, not new sources of truth.
- Rule 2: `store.js` is the only persistence module (new keys listed in
  section 11).
- Rule 3: domain purity. `syncOps`, `licensing` and `visibility` are pure.
- Rule 5: lossless migration (blob aliasing; signed-out behaviour
  byte-identical).

Amendments, made in the Constitution with S0:
1. **Rule 4:** one delegated listener per event type **per surface root**
   (campaign shell and portal now; the admin page in S1).
2. **New rule 6:** no document bytes leave the device through a server.
   Only metadata syncs; bytes move device to device or by file.

Still to do: **Part IV** keeps "Multi-user access, authentication ..." until
S1 ships, then moves the built parts into Part III.
