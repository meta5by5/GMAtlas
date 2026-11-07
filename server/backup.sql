PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE IF NOT EXISTS "d1_migrations"(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(1,'0001_accounts.sql','2026-11-07 03:20:50');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(2,'0002_sync.sql','2026-11-07 17:09:19');
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,          -- lower-cased
  display_name  TEXT,
  roles         TEXT NOT NULL DEFAULT '[]',    -- JSON array: owner | admin | support | content
  status        TEXT NOT NULL DEFAULT 'active',-- active | disabled
  created_at    TEXT NOT NULL
);
INSERT INTO "users" ("id","email","display_name","roles","status","created_at") VALUES('usr_fMTMyCuXoWkBpWrx','gmatlasonline@gmail.com',NULL,'[]','active','2026-11-07T03:49:39.738Z');
INSERT INTO "users" ("id","email","display_name","roles","status","created_at") VALUES('usr_EHpPOv5mhSThB3rb','meta5by5@gmail.com','Reven','[]','active','2026-11-07T04:13:04.751Z');
CREATE TABLE identities (
  user_id     TEXT NOT NULL REFERENCES users(id),
  provider    TEXT NOT NULL,                   -- email | google | apple | discord
  subject     TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  PRIMARY KEY (provider, subject)
);
INSERT INTO "identities" ("user_id","provider","subject","created_at") VALUES('usr_fMTMyCuXoWkBpWrx','email','gmatlasonline@gmail.com','2026-11-07T03:49:39.738Z');
INSERT INTO "identities" ("user_id","provider","subject","created_at") VALUES('usr_EHpPOv5mhSThB3rb','email','meta5by5@gmail.com','2026-11-07T04:13:04.751Z');
CREATE TABLE email_codes (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  code_hash   TEXT NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  expires_at  TEXT NOT NULL,
  used_at     TEXT,
  created_at  TEXT NOT NULL
);
INSERT INTO "email_codes" ("id","email","code_hash","attempts","expires_at","used_at","created_at") VALUES('code_h4b-3rkQDgNxqWmH','gmatlasonline@gmail.com','4a77d5c9a13d959049c20c963a28a4ab057a8e58020874bfad2e68d378b4768a',1,'2026-11-07T03:58:02.440Z','2026-11-07T03:49:39.684Z','2026-11-07T03:48:02.440Z');
INSERT INTO "email_codes" ("id","email","code_hash","attempts","expires_at","used_at","created_at") VALUES('code_6elMq4GQp6-9grf_','meta5by5@gmail.com','edeccc49ba098516fe9c07d0c382773a07a38b4598f8f792195adbf2651ac65b',1,'2026-11-07T04:22:44.340Z','2026-11-07T04:13:04.721Z','2026-11-07T04:12:44.340Z');
INSERT INTO "email_codes" ("id","email","code_hash","attempts","expires_at","used_at","created_at") VALUES('code_B5_Q_IcS-HCpIIEq','meta5by5@gmail.com','9cc035e6944d010cbadbcad945b624e1314db578d362c1ee8fd5983039cb6564',1,'2026-11-07T04:27:04.961Z','2026-11-07T04:17:50.791Z','2026-11-07T04:17:04.961Z');
CREATE TABLE devices (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  name          TEXT NOT NULL,
  platform      TEXT,
  policy        TEXT NOT NULL DEFAULT '{"mode":"follow","excluded":[],"only":[]}',
  created_at    TEXT NOT NULL,
  last_seen_at  TEXT NOT NULL,
  revoked_at    TEXT
, ecdh_pub TEXT);
INSERT INTO "devices" ("id","user_id","name","platform","policy","created_at","last_seen_at","revoked_at","ecdh_pub") VALUES('dev_qU2VS6EyuUUjMJbg','usr_fMTMyCuXoWkBpWrx','Live check','node','{"mode":"follow","excluded":[],"only":[]}','2026-11-07T03:49:39.738Z','2026-11-07T03:49:40.276Z',NULL,NULL);
INSERT INTO "devices" ("id","user_id","name","platform","policy","created_at","last_seen_at","revoked_at","ecdh_pub") VALUES('dev_01ae-ZV2i1XKIeTt','usr_EHpPOv5mhSThB3rb','Windows · Chrome','Windows','{"mode":"follow","excluded":[],"only":[]}','2026-11-07T04:13:04.751Z','2026-11-07T21:27:54.356Z',NULL,NULL);
INSERT INTO "devices" ("id","user_id","name","platform","policy","created_at","last_seen_at","revoked_at","ecdh_pub") VALUES('dev_il1pBrdUSCGmUGnO','usr_EHpPOv5mhSThB3rb','Android · Firefox','Android','{"mode":"follow","excluded":[],"only":[]}','2026-11-07T04:17:50.825Z','2026-11-07T17:09:35.264Z',NULL,NULL);
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
INSERT INTO "sessions" ("id","device_id","user_id","refresh_hash","prev_hash","expires_at","created_at","revoked_at") VALUES('ses_ogEGeLkg-rvrcNm7','dev_qU2VS6EyuUUjMJbg','usr_fMTMyCuXoWkBpWrx','08611534a2f9e6fa8989bb6e80dcb99c304e4980a2ef91889ae181f4d2434875','72cbf331fbd4e541cbbddb79210e2e7a74677eddf603a4d40129dc1ec7a68f55','2027-01-06T03:49:40.276Z','2026-11-07T03:49:39.931Z','2026-11-07T03:49:40.575Z');
INSERT INTO "sessions" ("id","device_id","user_id","refresh_hash","prev_hash","expires_at","created_at","revoked_at") VALUES('ses_DXPiIDy2iu9K3e_C','dev_01ae-ZV2i1XKIeTt','usr_EHpPOv5mhSThB3rb','a0a045c22a64c6c22e7034c035e27220ef9dacced17647f49467d666407ad67b','340dde75ee4756be22ae8c46eaa0d5261a245beb58cbcf1d41d9fef27e17a205','2027-01-06T21:27:54.356Z','2026-11-07T04:13:04.851Z',NULL);
INSERT INTO "sessions" ("id","device_id","user_id","refresh_hash","prev_hash","expires_at","created_at","revoked_at") VALUES('ses_k8mNRCi5whRTcjc8','dev_il1pBrdUSCGmUGnO','usr_EHpPOv5mhSThB3rb','1705e820734fae5401e9b0dbda929d73484e05b7940a70bc98c2933e714a83f7','4ed13dc89e2144b17da8fa821408d9d2907ca71deda596ed2049cd098e96ebea','2027-01-06T17:09:35.264Z','2026-11-07T04:17:50.905Z',NULL);
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
INSERT INTO "entitlements" ("id","user_id","kind","ref","value","source","order_id","starts_at","ends_at","revoked_at","revoked_by","note","created_at") VALUES('ent_9eNBKU-wpUyLEIZi','usr_EHpPOv5mhSThB3rb','license','fivepfh',NULL,'attested',NULL,'2026-11-07T04:13:20.967Z',NULL,NULL,NULL,NULL,'2026-11-07T04:13:20.967Z');
INSERT INTO "entitlements" ("id","user_id","kind","ref","value","source","order_id","starts_at","ends_at","revoked_at","revoked_by","note","created_at") VALUES('ent_LavYZQQrY0IH_npA','usr_EHpPOv5mhSThB3rb','license','hostile',NULL,'attested',NULL,'2026-11-07T04:13:20.967Z',NULL,NULL,NULL,NULL,'2026-11-07T04:13:20.967Z');
INSERT INTO "entitlements" ("id","user_id","kind","ref","value","source","order_id","starts_at","ends_at","revoked_at","revoked_by","note","created_at") VALUES('ent_JE8j1A4zzDdSfGuJ','usr_EHpPOv5mhSThB3rb','license','planetfall',NULL,'attested',NULL,'2026-11-07T04:13:20.967Z',NULL,NULL,NULL,NULL,'2026-11-07T04:13:20.967Z');
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
INSERT INTO "audit_log" ("id","at","actor_id","action","target_kind","target_id","before_json","after_json","note") VALUES('aud_HotCLMDS3q1t2qpI','2026-11-07T04:13:20.967Z','usr_EHpPOv5mhSThB3rb','entitlement.attest','entitlement','ent_9eNBKU-wpUyLEIZi',NULL,'{"ref":"fivepfh","source":"attested"}',NULL);
INSERT INTO "audit_log" ("id","at","actor_id","action","target_kind","target_id","before_json","after_json","note") VALUES('aud_Beif34ass4rvyu6X','2026-11-07T04:13:20.967Z','usr_EHpPOv5mhSThB3rb','entitlement.attest','entitlement','ent_LavYZQQrY0IH_npA',NULL,'{"ref":"hostile","source":"attested"}',NULL);
INSERT INTO "audit_log" ("id","at","actor_id","action","target_kind","target_id","before_json","after_json","note") VALUES('aud_1Tii7aUAXBs3X5pP','2026-11-07T04:13:20.967Z','usr_EHpPOv5mhSThB3rb','entitlement.attest','entitlement','ent_JE8j1A4zzDdSfGuJ',NULL,'{"ref":"planetfall","source":"attested"}',NULL);
CREATE TABLE vault_keys (
  user_id     TEXT NOT NULL REFERENCES users(id),
  slot        TEXT NOT NULL,
  wrapped     TEXT NOT NULL,                   -- JSON: the wrapped key
  wrapped_by  TEXT,                            -- device that wrapped it
  created_at  TEXT NOT NULL,
  PRIMARY KEY (user_id, slot)
);
CREATE TABLE campaigns (
  id          TEXT PRIMARY KEY,                -- the campaign's meta.id
  owner_id    TEXT NOT NULL REFERENCES users(id),
  sealed_key  TEXT NOT NULL,                   -- JSON: campaign key sealed with the vault key
  meta_env    TEXT NOT NULL,                   -- JSON: encrypted {title}
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('d1_migrations',2);
CREATE INDEX email_codes_by_email ON email_codes (email, created_at);
CREATE INDEX devices_by_user ON devices (user_id);
CREATE INDEX sessions_by_prev ON sessions (prev_hash);
CREATE INDEX entitlements_by_user ON entitlements (user_id);
CREATE INDEX campaigns_by_owner ON campaigns (owner_id);
