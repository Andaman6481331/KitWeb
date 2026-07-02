-- Add a general product "attribute" field (EN + TH), shown after description on the storefront
ALTER TABLE products ADD COLUMN attribute TEXT;
ALTER TABLE products ADD COLUMN attribute_th TEXT;
