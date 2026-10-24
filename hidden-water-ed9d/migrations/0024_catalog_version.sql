-- Catalogue version for the storefront's one-hour browser cache.
-- Every successful admin write to products, projects or gallery adds 1 to the single
-- row; the storefront appends the number to its cached reads (?v=), so an edit
-- reaches customers on their next page view instead of when the cache expires.
-- Additive only: one new table, nothing existing is touched. Safe to run twice.
-- Apply with `wrangler d1 execute product-db --remote --file=migrations/0024_catalog_version.sql`.
CREATE TABLE IF NOT EXISTS catalog_version (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL DEFAULT 1
);

INSERT OR IGNORE INTO catalog_version (id, version) VALUES (1, 1);
