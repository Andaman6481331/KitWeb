-- Community photos: one row is a single image with a credit line.
--
-- The third and last content type in this round. It feeds the Creator Gallery on
-- the KitCraft page, and the same rows can be filtered by product_id or project_id
-- to surface a customer gallery beside a product or an article — one table, several
-- views, the same shape as `projects` and `spotlights`.
--
-- Submissions are staff-entered for now. Public upload means moderation and abuse
-- handling, so `is_visible` exists from day one: it is the switch that makes open
-- submissions a small change later rather than a rewrite.

CREATE TABLE IF NOT EXISTS gallery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Same convention as products/projects: a bare R2 key, a filename with its own
    -- extension, or a full URL. The client resolves all three.
    image_key TEXT NOT NULL,
    caption TEXT,
    caption_th TEXT,
    -- Who made it. credit_handle is stored without the '@'; the client adds it.
    credit_name TEXT,
    credit_handle TEXT,
    credit_url TEXT,
    -- Optional links back into the catalog and the article archive. Nullable on
    -- purpose: most community photos credit a maker, not a specific SKU.
    product_id INTEGER,
    project_id INTEGER,
    is_visible INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gallery_visible ON gallery (is_visible, sort_order, id DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_product ON gallery (product_id);
