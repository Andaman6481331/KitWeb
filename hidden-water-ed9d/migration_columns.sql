-- Check and add columns individually
PRAGMA table_info(products);
-- I will run these in a way that doesn't fail the whole block if possible, but D1 --file is strict.
-- Actually, I'll just run them and see.
ALTER TABLE products ADD COLUMN price_2 REAL;
ALTER TABLE products ADD COLUMN price_3 REAL;
ALTER TABLE products ADD COLUMN price_4 REAL;
ALTER TABLE products ADD COLUMN price_5 REAL;
ALTER TABLE products ADD COLUMN price_1 REAL;
