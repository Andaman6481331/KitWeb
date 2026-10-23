// Invoices page logic and its PLACEHOLDER data. There is no invoice backend yet, so
// invoiceRows() returns made-up rows dated relative to "now". When the real thing
// exists, replace invoiceRows (see composables/useInvoices.js) and keep the rest.
const DAY_MS = 24 * 60 * 60 * 1000;

export const INVOICE_STATUSES = ['paid', 'sent', 'overdue', 'draft'];

// issuedDaysAgo / dueInDays are relative to now; a negative dueInDays is already late.
const SAMPLE = [
  ['INV-2026-0112', 'Baan Ruam Mit Kindergarten', 'โรงเรียนอนุบาลบ้านรวมมิตร', 'sent', 18450, 4, 10],
  ['INV-2026-0111', 'Wat Sampeng Activity Group', 'กลุ่มกิจกรรมวัดสำเพ็ง', 'paid', 6200, 9, -2],
  ['INV-2026-0110', 'Lanna Handmade Co.', 'ลานนา แฮนด์เมด', 'overdue', 32900, 41, -11],
  ['INV-2026-0109', 'Khun Malee (Retail)', 'คุณมาลี (ปลีก)', 'paid', 1280, 12, -5],
  ['INV-2026-0108', 'Suan Dok Craft Club', 'ชมรมงานฝีมือสวนดอก', 'draft', 9750, 1, 14],
  ['INV-2026-0107', 'Thai Ribbon Wholesale', 'ไทยริบบิ้น ค้าส่ง', 'sent', 54300, 7, 7],
  ['INV-2026-0106', 'Rose Garden Florist', 'โรสการ์เด้น ฟลอริสต์', 'paid', 15600, 22, -8],
  ['INV-2026-0105', 'Phuket Bead Studio', 'ภูเก็ต บีด สตูดิโอ', 'overdue', 8420, 36, -6],
  ['INV-2026-0104', 'Chiang Mai Quilt Circle', 'วงควิลท์เชียงใหม่', 'paid', 22100, 28, -14],
  ['INV-2026-0103', 'Sunrise Learning Center', 'ศูนย์การเรียนซันไรส์', 'sent', 11900, 2, 12],
  ['INV-2026-0102', 'Khun Anan (Retail)', 'คุณอนันต์ (ปลีก)', 'draft', 640, 0, 14],
  ['INV-2026-0101', 'Bangkok Costume Atelier', 'ห้องเสื้อกรุงเทพ คอสตูม', 'paid', 47850, 55, -25],
];

export const invoiceRows = (now = Date.now()) => SAMPLE.map(([id, customer, customerTh, status, amount, issuedDaysAgo, dueInDays]) => ({
  id,
  customer,
  customerTh,
  status,
  amount,
  issuedAt: now - issuedDaysAgo * DAY_MS,
  dueAt: now + dueInDays * DAY_MS,
}));

export const filterInvoices = (rows, { query, status }) => {
  const q = query.trim().toLowerCase();
  return rows.filter((r) =>
    (status === 'all' || r.status === status) &&
    (!q || r.id.toLowerCase().includes(q) || r.customer.toLowerCase().includes(q) || r.customerTh.toLowerCase().includes(q))
  );
};

// sort: { key: 'issued'|'amount'|'customer', dir: 'asc'|'desc' }
export const sortInvoices = (rows, sort, lang) => {
  const sign = sort.dir === 'asc' ? 1 : -1;
  const name = (r) => (lang === 'th' ? r.customerTh : r.customer);
  const compare = {
    issued: (a, b) => a.issuedAt - b.issuedAt,
    amount: (a, b) => a.amount - b.amount,
    customer: (a, b) => name(a).localeCompare(name(b), lang === 'th' ? 'th' : 'en'),
  }[sort.key] || (() => 0);
  return rows.slice().sort((a, b) => sign * compare(a, b) || a.id.localeCompare(b.id));
};

export const summarizeInvoices = (rows, now = Date.now()) => {
  const open = rows.filter((r) => r.status === 'sent' || r.status === 'overdue');
  const late = rows.filter((r) => r.status === 'overdue');
  const paid = rows.filter((r) => r.status === 'paid' && now - r.issuedAt <= 30 * DAY_MS);
  const sum = (list) => list.reduce((total, r) => total + r.amount, 0);
  return {
    outstanding: sum(open), outstandingCount: open.length,
    overdue: sum(late), overdueCount: late.length,
    paidRecently: sum(paid), paidRecentlyCount: paid.length,
  };
};

export const invoiceStatusChips = (rows) => [{ key: 'all', count: rows.length }].concat(
  INVOICE_STATUSES.map((key) => ({ key, count: rows.filter((r) => r.status === key).length }))
);
