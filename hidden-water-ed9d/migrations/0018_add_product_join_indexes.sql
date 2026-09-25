-- The /products endpoint runs a correlated subquery per product row against
-- product_categories and product_images. Neither table had an index on
-- product_id, so each subquery did a full table scan per row, reading
-- millions of rows to return a few hundred and blowing through the D1
-- daily operation limit.
CREATE INDEX IF NOT EXISTS idx_product_categories_product_id ON product_categories (product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images (product_id);

-- Same query also filters on p.category and sorts by p.created_at on every
-- call, with no index backing either — full scan/sort of the products table
-- every time, on top of the subquery cost above.
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products (created_at DESC);

-- GET /orders sorts by created_at on every call (admin's full list and a
-- customer's filtered one alike); customer_id is already indexed but
-- created_at was not.
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
