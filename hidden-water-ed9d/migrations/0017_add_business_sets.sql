-- Business Sets: fixed wholesale bundles at fixed quantities. A set is a
-- shop-curated RFQ preset, not a SKU -- it has no stock and no cart path, and is
-- requested through the existing /rfq/submit pipeline as its component lines.
--
-- A junction table rather than a JSON column (as projects.product_ids uses):
-- these rows carry a quantity and get joined for price denormalization, which is
-- exactly what the JSON approach cannot do.

CREATE TABLE IF NOT EXISTS product_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_th TEXT,
    slug TEXT NOT NULL UNIQUE,
    cover_image_key TEXT,
    description TEXT,
    description_th TEXT,
    -- 1..3 only; price_4/price_5 are staff-only and never reach a customer total.
    price_tier INTEGER DEFAULT 1,
    discount_pct REAL DEFAULT 0,
    is_published INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_set_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    set_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    -- Optional: pins a specific variant, whose prices win over the parent's.
    variant_id INTEGER,
    -- Pieces, already snapped to an MOQ multiple by the admin editor.
    quantity INTEGER NOT NULL,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (set_id) REFERENCES product_sets(id) ON DELETE CASCADE,
    -- Deliberately no ON DELETE CASCADE: a deleted product must break the set
    -- loudly (is_incomplete) rather than silently shrink it.
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_product_sets_published
    ON product_sets (is_published, sort_order);
CREATE INDEX IF NOT EXISTS idx_product_set_items_set
    ON product_set_items (set_id);
