-- Editorial content: one "project" is a titled post with a cover image, body copy
-- and a set of linked products. It is the single content type behind the homepage's
-- Weekly Featured Project, the KitCraft article archive, and the "Tutorial" /
-- "Project Inspiration" blocks on a product page — one table, several views.
--
-- Also persists products.slug. Slugs were previously generated in the browser from
-- the product name, which collapsed to a bare "-42" for Thai-only names. Product
-- URLs are about to be prerendered, so the slug has to be stable and server-owned.

CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    title_th TEXT,
    slug TEXT NOT NULL UNIQUE,
    cover_image_key TEXT,
    excerpt TEXT,
    excerpt_th TEXT,
    body TEXT,
    body_th TEXT,
    video_url TEXT,
    -- JSON array of product ids, e.g. "[12,45]". Kept as JSON rather than a junction
    -- table because it is small, ordered, and only ever read as a whole.
    product_ids TEXT DEFAULT '[]',
    -- Exactly one row should have is_featured = 1; the API falls back to the newest
    -- published row when none is set, so the homepage slot is never empty.
    is_featured INTEGER DEFAULT 0,
    is_published INTEGER DEFAULT 1,
    published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_published
    ON projects (is_published, published_at DESC);

-- Persisted product slug (nullable; the API falls back to id when absent)
ALTER TABLE products ADD COLUMN slug TEXT;

CREATE INDEX IF NOT EXISTS idx_products_slug ON products (slug);
