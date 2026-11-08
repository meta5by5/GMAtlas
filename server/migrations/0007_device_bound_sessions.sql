-- Device-bound sessions (roadmap 3.2; design/adr/device-bound-sessions.md).
-- A session carries the public half of a key its browser generated and
-- can't export; every refresh must be signed with it, so the refresh
-- cookie alone can't renew the session anywhere else. proof_at is the
-- timestamp of the last proof accepted: each must be later (no replays).
-- Both NULL on a session from before this: it binds at its next refresh.
ALTER TABLE sessions ADD COLUMN bound_key TEXT;
ALTER TABLE sessions ADD COLUMN proof_at INTEGER;
