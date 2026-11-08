-- 0006_passkeys.sql — passkey sign-in (WebAuthn; roadmap 3.1, Phase S1).
-- OAuth identities use 0001's identities table (provider google|discord).

CREATE TABLE passkeys (
  id            TEXT PRIMARY KEY,               -- the credential id, base64url
  user_id       TEXT NOT NULL REFERENCES users(id),
  public_key    TEXT NOT NULL,                  -- JSON: a public JWK (EC P-256 or RSA)
  alg           INTEGER NOT NULL,               -- COSE: -7 ES256, -257 RS256
  sign_count    INTEGER NOT NULL DEFAULT 0,
  transports    TEXT NOT NULL DEFAULT '[]',     -- JSON array, from the browser
  name          TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  last_used_at  TEXT
);
CREATE INDEX passkeys_by_user ON passkeys (user_id);

-- Single-use WebAuthn challenges, five minutes each.
CREATE TABLE webauthn_challenges (
  id          TEXT PRIMARY KEY,
  user_id     TEXT,                             -- set for registration
  purpose     TEXT NOT NULL,                    -- register | login
  challenge   TEXT NOT NULL,                    -- base64url
  expires_at  TEXT NOT NULL
);
