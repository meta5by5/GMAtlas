-- 0005_rate_limits.sql — per-client rate limiting (Phase S1): sign-in code
-- requests and wrong-code guesses per IP, on top of the per-email limits.
-- The bucket holds a peppered hash of the IP, never the address itself.
-- Rows older than a day are swept as new ones are written.

CREATE TABLE rate_events (
  bucket  TEXT NOT NULL,   -- e.g. 'code:<ip hash>', 'guess:<ip hash>'
  at      TEXT NOT NULL
);
CREATE INDEX rate_events_by_bucket ON rate_events (bucket, at);
CREATE INDEX rate_events_by_at ON rate_events (at);
