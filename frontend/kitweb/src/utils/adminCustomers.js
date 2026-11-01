// Customers page logic and its PLACEHOLDER data. There is no customer backend wired to
// the admin yet, so customerRows() returns made-up businesses with obviously fake
// phone numbers. When the real thing exists, replace customerRows (see
// composables/useCustomers.js) and keep the rest.
const DAY_MS = 24 * 60 * 60 * 1000;

export const CUSTOMER_SEGMENTS = ['retail', 'wholesale', 'school', 'temple'];

// contact is the person to ask for; level is the price level (0 Retail ... 4 Special B)
// that sets the starting price on this customer's invoices; outstanding is the unpaid balance.
// lastOrderDaysAgo is relative to now.
const SAMPLE = [
  ['C-1001', 'Baan Ruam Mit Kindergarten', 'โรงเรียนอนุบาลบ้านรวมมิตร', 'Khun Ploy', '081-000-1001', 'ruammit.kg', 'school', 1, 6480, 14, 186400, 4],
  ['C-1002', 'Wat Sampeng Activity Group', 'กลุ่มกิจกรรมวัดสำเพ็ง', 'Khun Dao', '081-000-1002', 'watsampeng', 'temple', 1, 0, 9, 74200, 11],
  ['C-1003', 'Lanna Handmade Co.', 'ลานนา แฮนด์เมด', 'Khun Somsri', '082-000-1003', 'lanna.handmade', 'wholesale', 3, 12800, 22, 412900, 2],
  ['C-1004', 'Khun Malee', 'คุณมาลี', 'Khun Malee', '083-000-1004', 'malee.craft', 'retail', 0, 0, 5, 6240, 19],
  ['C-1005', 'Suan Dok Craft Club', 'ชมรมงานฝีมือสวนดอก', 'Khun Mai', '084-000-1005', 'suandok.club', 'retail', 1, 4930, 7, 15980, 8],
  ['C-1006', 'Thai Ribbon Wholesale', 'ไทยริบบิ้น ค้าส่ง', 'Khun Nok', '085-000-1006', 'thairibbon', 'wholesale', 4, 0, 31, 689500, 1],
  ['C-1007', 'Rose Garden Florist', 'โรสการ์เด้น ฟลอริสต์', 'Khun Ratree', '086-000-1007', 'rosegarden.bkk', 'wholesale', 2, 0, 12, 98700, 6],
  ['C-1008', 'Phuket Bead Studio', 'ภูเก็ต บีด สตูดิโอ', 'Khun Nok', '087-000-1008', 'phuketbeads', 'retail', 2, 0, 3, 11450, 33],
  ['C-1009', 'Sunrise Learning Center', 'ศูนย์การเรียนซันไรส์', 'Khun Dao', '088-000-1009', 'sunrise.learn', 'school', 1, 0, 18, 143300, 3],
  ['C-1010', 'Wat Pa Sukhothai', 'วัดป่าสุโขทัย', 'Khun Somchai', '089-000-1010', 'watpa.sukhothai', 'temple', 0, 0, 4, 22800, 27],
  ['C-1011', 'Khun Anan', 'คุณอนันต์', 'Khun Anan', '090-000-1011', 'anan.sewing', 'retail', 0, 0, 2, 1860, 52],
  ['C-1012', 'Bangkok Costume Atelier', 'ห้องเสื้อกรุงเทพ คอสตูม', 'Khun Ploy', '091-000-1012', 'bkk.costume', 'wholesale', 3, 0, 26, 538400, 5],
];

export const customerRows = (now = Date.now()) => SAMPLE.map(
  ([id, name, nameTh, contact, phone, line, segment, level, outstanding, orders, spent, lastOrderDaysAgo]) => ({
    id, name, nameTh, contact, phone, line, segment, level, outstanding, orders, spent,
    lastOrderAt: now - lastOrderDaysAgo * DAY_MS,
  })
);

const normalize = (name) => String(name || '').trim().toLowerCase();

// True when another customer already has this name, in either language.
export const isDuplicateName = (rows, name) => {
  const wanted = normalize(name);
  return wanted !== '' && rows.some((r) => normalize(r.name) === wanted || normalize(r.nameTh) === wanted);
};

// Builds the row for the Add customer form. Missing phone/LINE show as a dash, and a new
// customer starts with no orders (lastOrderAt null). Wholesale levels (2 and up) are
// filed under the Wholesale type so the type filter still makes sense.
export const newCustomer = (rows, form) => {
  const typed = Number(form.level);
  const level = Number.isInteger(typed) && typed >= 0 && typed <= 4 ? typed : 1;
  const highest = rows.reduce((max, r) => Math.max(max, parseInt(String(r.id).replace(/\D/g, ''), 10) || 0), 1000);
  const name = String(form.name || '').trim();
  const clean = (v) => String(v || '').trim() || '—';
  return {
    id: `C-${highest + 1}`, name, nameTh: name, contact: clean(form.contact), phone: clean(form.phone), line: '—',
    segment: level >= 2 ? 'wholesale' : 'retail', level, outstanding: 0, orders: 0, spent: 0, lastOrderAt: null,
  };
};

export const filterCustomers = (rows, { query, segment }) => {
  const q = query.trim().toLowerCase();
  return rows.filter((r) =>
    (segment === 'all' || r.segment === segment) &&
    (!q || [r.name.toLowerCase(), r.nameTh.toLowerCase(), r.phone, r.line.toLowerCase()].some((v) => v.includes(q)))
  );
};

// sort: { key: 'name'|'orders'|'spent'|'recent', dir: 'asc'|'desc' }
export const sortCustomers = (rows, sort, lang) => {
  const sign = sort.dir === 'asc' ? 1 : -1;
  const name = (r) => (lang === 'th' ? r.nameTh : r.name);
  const compare = {
    name: (a, b) => name(a).localeCompare(name(b), lang === 'th' ? 'th' : 'en'),
    orders: (a, b) => a.orders - b.orders,
    spent: (a, b) => a.spent - b.spent,
    recent: (a, b) => (a.lastOrderAt || 0) - (b.lastOrderAt || 0),
  }[sort.key] || (() => 0);
  return rows.slice().sort((a, b) => sign * compare(a, b) || a.id.localeCompare(b.id));
};

// A Legacy chip (customers imported from the old Access database) appears once any exist.
export const customerSegmentChips = (rows) => {
  const chips = [{ key: 'all', count: rows.length }].concat(
    CUSTOMER_SEGMENTS.map((key) => ({ key, count: rows.filter((r) => r.segment === key).length }))
  );
  const legacy = rows.filter((r) => r.segment === 'legacy').length;
  if (legacy) chips.push({ key: 'legacy', count: legacy });
  return chips;
};

// First letter of up to two words, for the avatar circle.
export const initials = (name) => {
  const letters = String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => Array.from(w)[0]);
  return letters.length ? letters.join('').toUpperCase() : '?';
};
