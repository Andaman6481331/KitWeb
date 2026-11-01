// Maps the Worker's /legacy/* rows (history imported from the old Access database) into the
// row shapes the Customers and Invoices pages already use, plus `source: 'legacy'` so the pages
// can tag them. Legacy rows are read-only history: no price level, no due date, no contact.
const BANGKOK_MIDNIGHT = 'T00:00:00+07:00';

const dayMs = (day) => (day ? Date.parse(`${day}${BANGKOK_MIDNIGHT}`) : null);
const dash = (v) => String(v || '').trim() || '—';

export const legacyCustomerRow = (c) => ({
  id: c.id,
  name: c.name,
  nameTh: c.name,
  contact: '—',
  phone: dash(c.phone),
  line: '—',
  segment: 'legacy',
  // Price levels are set by hand later; 0 keeps the New invoice picker working until then.
  level: 0,
  levelUnset: true,
  outstanding: Number(c.outstanding) || 0,
  orders: Number(c.orders) || 0,
  spent: Number(c.spent) || 0,
  lastOrderAt: dayMs(c.last_order_on),
  status: c.status,
  source: 'legacy',
});

export const legacyInvoiceRow = (i) => ({
  id: i.id,
  number: String(i.order_no),
  customer: i.customer_name,
  customerTh: i.customer_name,
  customerId: i.customer_id || null,
  status: i.paid ? 'paid' : 'unpaid',
  amount: Number(i.total) || 0,
  issuedAt: dayMs(i.sold_on),
  dueAt: null,
  lineCount: Number(i.line_count) || 0,
  accessType: i.access_type || '',
  source: 'legacy',
});

export const isLegacy = (row) => row?.source === 'legacy';
