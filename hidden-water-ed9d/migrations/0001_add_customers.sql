-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    business_name TEXT,
    owner_name TEXT,
    phone TEXT,
    tax_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add customer_id to orders
-- Note: SQLite doesn't support adding foreign keys to existing tables easily, 
-- but for D1 we can add the column and use it.
-- ALREADY APPLIED: ALTER TABLE orders ADD COLUMN customer_id TEXT REFERENCES customers(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
