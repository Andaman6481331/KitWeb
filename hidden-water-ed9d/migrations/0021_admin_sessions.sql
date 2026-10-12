-- Admin login sessions. Only the SHA-256 hash of the session token is stored;
-- the raw token lives in the admin's browser only. Rows expire after 12 hours
-- (expires_at is epoch milliseconds, matching Date.now()).
CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL
);
