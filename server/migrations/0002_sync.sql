-- 0002_sync.sql — personal sync (design/ACCOUNTS-SYNC-ROADMAP.md 5 and 10;
-- Phase S2). Everything here is either metadata or ciphertext: the server
-- can't read a campaign, its title, or any key.

-- Each device's ECDH public key (JWK text), set once on first sync use.
ALTER TABLE devices ADD COLUMN ecdh_pub TEXT;

-- The account's vault key, wrapped once per approved device (slot = the
-- device id) and once for the recovery key (slot = 'recovery').
CREATE TABLE vault_keys (
  user_id     TEXT NOT NULL REFERENCES users(id),
  slot        TEXT NOT NULL,
  wrapped     TEXT NOT NULL,                   -- JSON: the wrapped key
  wrapped_by  TEXT,                            -- device that wrapped it
  created_at  TEXT NOT NULL,
  PRIMARY KEY (user_id, slot)
);

-- Synced campaigns. The op log and snapshots live in each campaign's room
-- (a Durable Object); this is the index the Account page lists.
CREATE TABLE campaigns (
  id          TEXT PRIMARY KEY,                -- the campaign's meta.id
  owner_id    TEXT NOT NULL REFERENCES users(id),
  sealed_key  TEXT NOT NULL,                   -- JSON: campaign key sealed with the vault key
  meta_env    TEXT NOT NULL,                   -- JSON: encrypted {title}
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX campaigns_by_owner ON campaigns (owner_id);
