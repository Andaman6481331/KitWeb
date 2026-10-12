-- Delivery is not part of the catalog total: staff quote it per order at the
-- carrier's real cost (no markup) and it is added to the order afterwards.
-- NULL = not quoted yet, 0 = no delivery charge, anything else = baht.
ALTER TABLE orders ADD COLUMN delivery_fee REAL;

-- Private key for the "view my order" link (thank-you page / LINE receipt). Order
-- numbers are only 5 random digits, so on their own they must not unlock an order.
ALTER TABLE orders ADD COLUMN view_key TEXT;

-- How the customer's message was matched: 'line-webhook' (automatic) or 'staff'
-- (someone pressed Mark confirmed). NULL while unconfirmed.
ALTER TABLE orders ADD COLUMN contact_confirmed_via TEXT;
