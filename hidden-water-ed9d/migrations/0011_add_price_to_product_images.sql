-- Add per-image price tiers so a "VariantLink" image can carry its own price,
-- overriding the product's base price_1..5 when selected on the storefront.
-- NULL means "no override, use the product's base price" (0 is a legitimate real price).
ALTER TABLE product_images ADD COLUMN price_1 REAL;
ALTER TABLE product_images ADD COLUMN price_2 REAL;
ALTER TABLE product_images ADD COLUMN price_3 REAL;
ALTER TABLE product_images ADD COLUMN price_4 REAL;
ALTER TABLE product_images ADD COLUMN price_5 REAL;
