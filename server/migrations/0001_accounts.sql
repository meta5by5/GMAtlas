-- 0001_accounts.sql — accounts, devices, sessions, entitlements, audit
-- (design/ACCOUNTS-SYNC-ROADMAP.md sections 3, 4 and 10; Phase S1).
-- SQLite dialect: runs on Cloudflare D1 and on node:sqlite in the tests.
-- Times are ISO-8601 UTC strings; ids are random text.

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,          -- lower-cased
  display_name  TEXT,
  roles         TEXT NOT NULL DEFAULT '[]',    -- JSON array: owner | admin | support | content
  status        TEXT NOT NULL DEFAULT 'active',-- active | disabled
  created_at    TEXT NOT NULL
);

-- How a user can sign in. Email codes now; passkeys and OAuth later in S1.
CREATE TABLE identities (
  user_id     TEXT NOT NULL REFERENCES users(id),
  provider    TEXT NOT NULL,                   -- email | google | apple | discord
  subject     TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  PRIMARY KEY (provider, subject)
);

-- One-time sign-in codes. Only a hash is stored.
CREATE TABLE email_codes (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  code_hash   TEXT NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  expires_at  TEXT NOT NULL,
  used_at     TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX email_codes_by_email ON email_codes (email, created_at);

-- One row per browser instance (browser profile x origin) a user signs in on.
CREATE TABLE devices (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  name          TEXT NOT NULL,
  platform      TEXT,
  policy        TEXT NOT NULL DEFAULT '{"mode":"follow","excluded":[],"only":[]}',
  created_at    TEXT NOT NULL,
  last_seen_at  TEXT NOT NULL,
  revoked_at    TEXT
);
CREATE INDEX devices_by_user ON devices (user_id);

-- Refresh-token sessions, one per device sign-in. Tokens are stored hashed;
-- prev_hash is the token this one replaced, so reuse of a rotated token is
-- detected and ends the session.
CREATE TABLE sessions (
  id            TEXT PRIMARY KEY,
  device_id     TEXT NOT NULL REFERENCES devices(id),
  user_id       TEXT NOT NULL REFERENCES users(id),
  refresh_hash  TEXT NOT NULL UNIQUE,
  prev_hash     TEXT,
  expires_at    TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  revoked_at    TEXT
);
CREATE INDEX sessions_by_prev ON sessions (prev_hash);

-- What an account owns or may use (roadmap section 4.2).
CREATE TABLE entitlements (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  kind        TEXT NOT NULL,                   -- license | feature | module
  ref         TEXT NOT NULL,                   -- e.g. 'fiveleagues', 'sync.devices'
  value       TEXT,                            -- optional, e.g. a seat count
  source      TEXT NOT NULL,                   -- attested | purchase | grant | redeem | trial
  order_id    TEXT,
  starts_at   TEXT NOT NULL,
  ends_at     TEXT,                            -- NULL = perpetual
  revoked_at  TEXT,
  revoked_by  TEXT,
  note        TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX entitlements_by_user ON entitlements (user_id);

-- Append-only record of every entitlement change and admin action.
CREATE TABLE audit_log (
  id           TEXT PRIMARY KEY,
  at           TEXT NOT NULL,
  actor_id     TEXT,
  action       TEXT NOT NULL,
  target_kind  TEXT,
  target_id    TEXT,
  before_json  TEXT,
  after_json   TEXT,
  note         TEXT
);
