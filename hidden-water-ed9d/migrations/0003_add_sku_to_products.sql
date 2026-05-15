-- Migration: Add sku column to products
ALTER TABLE products ADD COLUMN sku TEXT;
CREATE UNIQUE INDEX idx_products_sku ON products(sku);
