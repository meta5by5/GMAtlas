# Admin v1: roles, users, entitlements, feature flags, audit

**Status:** Accepted (Phase S1 item 4, `server` branch).

## Context

The roadmap (`design/ACCOUNTS-SYNC-ROADMAP.md` section 9) calls for a
role-gated admin panel, kept apart from what ordinary users download. S1
needs four of its areas: users, entitlements, feature flags and the audit
log. Products, orders and redeem codes come with the store (S4); tables
with multiplayer (S5). The `sync.devices` gate (S2 item 5) needed feature
flags to exist.

## Decision

1. **A separate page, a separate bundle.** `admin.html` loads
   `dist/admin.bundle.js`, built by `scripts/build.js`'s second entry
   (`src/admin/main.js`); none of it is in `app.bundle.js`. It ships only
   beside the service (`server/scripts/site.js`), not to the static Pages
   copy, and the service worker never caches it.
2. **It borrows the app's session.** Same origin, so the HttpOnly refresh
   cookie works. It uses the real account client (`src/core/account.js`)
   with an in-memory stand-in for the store, and the same cross-tab Web Lock
   around refreshes, so it never trips refresh-token reuse detection.
   Signing in happens in the app.
3. **The server decides everything.** Every `/api/admin/*` handler
   (`server/src/admin.js`) checks the caller's role for the permission it
   needs; the page only hides what the role can't use.

   | Role | Users | Grants and trials | Flags | Roles | Audit |
   |---|---|---|---|---|---|
   | owner | read, write | yes | read, write | yes | read |
   | admin | read, write | yes | read, write | no | read |
   | support | read, write | yes | read | no | read |
   | content | no | no | read, write | no | read |

   The first owner is set from the command line (`npm run admin:role`,
   `server/scripts/admin-role.js`); after that, owners manage roles in the
   panel. There's always at least one owner.
4. **Every write needs a note and is audited** with before/after, actor and
   target (`audit_log`, append-only). Ties within a millisecond keep
   insertion order.
5. **Users:** search by email, name or id; the account's metadata
   (identities, devices and their install policy, sessions, entitlements,
   sync set-up, synced campaign ids and dates). Disable or re-enable
   (disabling signs the account out everywhere at once), revoke one session
   or all. No campaign contents, titles or impersonation: they're
   end-to-end encrypted, and support works from metadata.
6. **Entitlements:** grant a license, feature or module, or a trial (which
   needs an end date); set a new end date; revoke; convert an attestation
   into a grant. Ids are checked against the app's own catalogs
   (`LICENSES`, `src/data/features.js`, `GATEABLE_MODULES`), so a typo can't
   create a ghost entitlement. Bulk grant takes CSV
   (`email,kind,ref[,endsAt]`), checks every line first, and grants all or
   nothing; a dry run only checks.
7. **Feature flags** (`feature_flags`; resolution in the pure, shared
   `src/domain/features.js`): per catalog feature, in order: kill switch,
   per-account override, a `feature` entitlement, the flag's default (else
   the catalog's), then a percentage rollout by a stable hash of the
   account id. The result goes into the certificate as `enabledFeatures`
   (a certificate without it falls back to catalog defaults).
8. **`sync.devices` is the first gated feature.** The server refuses sync
   writes when it's off (setting up the vault, registering a campaign, a
   socket ticket, uploading settings: 403 `feature_off`); reading your own
   synced data stays allowed. The app shows "Sync is turned off for this
   account" (logo dot, Account › Sync) and stops syncing; local data is
   untouched.
9. **Changes reach open apps** because the app re-fetches its certificate
   every 10 minutes and on returning to the tab (at most every 2 minutes).

## Consequences

- A grant, revoke or flag change takes up to 10 minutes to reach an open
  app; a push through an account room would make it immediate.
- The audit log's "Older" paging is by timestamp, so entries sharing the
  boundary millisecond can be skipped between pages.
- Not built yet: products, orders, redeem codes (S4); tables (S5); admin
  metrics (S6); sign-in methods beyond email codes (passkeys, OAuth).
