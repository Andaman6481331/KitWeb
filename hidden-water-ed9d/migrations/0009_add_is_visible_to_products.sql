-- Add storefront visibility toggle to products (1 = shown, 0 = hidden)
ALTER TABLE products ADD COLUMN is_visible INTEGER DEFAULT 1;
