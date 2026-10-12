-- Customer-initiated confirmation: a web order is only a request until the
-- customer sends their order number to the OA / WhatsApp, and staff then press
-- "Mark confirmed". NULL = still awaiting the customer's message.
ALTER TABLE orders ADD COLUMN contact_confirmed_at DATETIME;

-- Every order that already exists was handled under the old manual flow, so treat
-- it as confirmed. Without this the Manage Orders list would open with the whole
-- history flagged "Awaiting customer message".
UPDATE orders SET contact_confirmed_at = created_at WHERE contact_confirmed_at IS NULL;
