-- Order fulfilment tracking + LINE push diagnostics
ALTER TABLE orders ADD COLUMN tracking_number  TEXT;
ALTER TABLE orders ADD COLUMN line_push_failed INTEGER DEFAULT 0;
