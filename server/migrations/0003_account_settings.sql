-- 0003_account_settings.sql — account-wide settings every device shares
-- (Rules Profiles, Turn Step Lists, the TOC library, each synced
-- campaign's profile; design/adr/personal-sync.md "Account settings").
-- One encrypted record per account; the server can't read it.

CREATE TABLE account_settings (
  user_id     TEXT PRIMARY KEY REFERENCES users(id),
  sealed_key  TEXT NOT NULL,                   -- JSON: settings key sealed with the vault key
  env         TEXT NOT NULL,                   -- JSON: encrypted settings replica
  version     INTEGER NOT NULL,                -- +1 on every write; writes name the version they merged
  updated_by  TEXT,                            -- device that wrote it
  updated_at  TEXT NOT NULL
);
