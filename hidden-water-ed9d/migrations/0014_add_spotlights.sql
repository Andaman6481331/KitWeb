-- Color of the Month.
--
-- One row per color story. Exactly one is active at a time; the worker unsets the
-- others on write, and falls back to the newest row so the homepage band is never
-- empty. Products are linked explicitly (product_ids) rather than filtered on
-- products.colors, because that column is empty for every row in the live catalog
-- today — the worker still falls back to a colors match so this starts working on
-- its own once staff begin filling it in.

CREATE TABLE IF NOT EXISTS spotlights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    color_name TEXT NOT NULL,
    color_name_th TEXT,
    hex TEXT NOT NULL,
    blurb TEXT,
    blurb_th TEXT,
    product_ids TEXT DEFAULT '[]',
    is_active INTEGER DEFAULT 0,
    -- Drives the "August 2026" label, formatted per-locale on the client.
    starts_on DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_spotlights_active ON spotlights (is_active, starts_on DESC);
