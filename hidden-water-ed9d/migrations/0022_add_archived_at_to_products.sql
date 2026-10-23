-- Archive marker for the admin inventory page (restorable "delete").
-- Additive only: one nullable column, existing rows keep NULL (= not archived).
-- Archiving also sets is_visible = 0, so every storefront query that already
-- filters on is_visible keeps archived products off the site.
ALTER TABLE products ADD COLUMN archived_at TEXT;
