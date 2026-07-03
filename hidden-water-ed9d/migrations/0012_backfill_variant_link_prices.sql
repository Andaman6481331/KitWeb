-- One-time backfill: copy existing product_variants price tiers into their
-- paired product_images row (matched by image_key + product_id), then collapse
-- the old 'size'/'color'/'variant' attribute_type values into a single 'variant_link'.
-- Rows where all 5 backfilled tiers are 0 (unpriced placeholder variants) are left
-- NULL so the storefront falls back to the product's base price instead of showing ฿0.

UPDATE product_images
SET
  price_1 = (SELECT CASE WHEN v.price_1 = 0 AND v.price_2 = 0 AND v.price_3 = 0 AND v.price_4 = 0 AND v.price_5 = 0 THEN NULL ELSE v.price_1 END
             FROM product_variants v WHERE v.image_key = product_images.image_key AND v.product_id = product_images.product_id),
  price_2 = (SELECT CASE WHEN v.price_1 = 0 AND v.price_2 = 0 AND v.price_3 = 0 AND v.price_4 = 0 AND v.price_5 = 0 THEN NULL ELSE v.price_2 END
             FROM product_variants v WHERE v.image_key = product_images.image_key AND v.product_id = product_images.product_id),
  price_3 = (SELECT CASE WHEN v.price_1 = 0 AND v.price_2 = 0 AND v.price_3 = 0 AND v.price_4 = 0 AND v.price_5 = 0 THEN NULL ELSE v.price_3 END
             FROM product_variants v WHERE v.image_key = product_images.image_key AND v.product_id = product_images.product_id),
  price_4 = (SELECT CASE WHEN v.price_1 = 0 AND v.price_2 = 0 AND v.price_3 = 0 AND v.price_4 = 0 AND v.price_5 = 0 THEN NULL ELSE v.price_4 END
             FROM product_variants v WHERE v.image_key = product_images.image_key AND v.product_id = product_images.product_id),
  price_5 = (SELECT CASE WHEN v.price_1 = 0 AND v.price_2 = 0 AND v.price_3 = 0 AND v.price_4 = 0 AND v.price_5 = 0 THEN NULL ELSE v.price_5 END
             FROM product_variants v WHERE v.image_key = product_images.image_key AND v.product_id = product_images.product_id)
WHERE EXISTS (
  SELECT 1 FROM product_variants v WHERE v.image_key = product_images.image_key AND v.product_id = product_images.product_id
);

UPDATE product_images SET attribute_type = 'variant_link' WHERE attribute_type IN ('size', 'color', 'variant');
