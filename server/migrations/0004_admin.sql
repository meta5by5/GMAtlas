-- 0004_admin.sql — admin v1 (design/ACCOUNTS-SYNC-ROADMAP.md section 9;
-- Phase S1 item 4). Roles already live on users.roles; entitlements and
-- the audit log are 0001's. This adds feature flags.

-- One row per flagged feature (ids from src/data/features.js). A feature
-- with no row uses its catalog default.
CREATE TABLE feature_flags (
  key           TEXT PRIMARY KEY,
  default_value INTEGER,                       -- 1 / 0, or NULL = catalog default
  rollout       INTEGER,                       -- 0..100 percent of accounts, or NULL
  kill          INTEGER NOT NULL DEFAULT 0,    -- 1 = off for everyone
  overrides     TEXT NOT NULL DEFAULT '{}',    -- JSON {userId: true|false}
  updated_by    TEXT,
  updated_at    TEXT NOT NULL
);

CREATE INDEX audit_by_at ON audit_log (at);
CREATE INDEX audit_by_target ON audit_log (target_id, at);
CREATE INDEX audit_by_actor ON audit_log (actor_id, at);
