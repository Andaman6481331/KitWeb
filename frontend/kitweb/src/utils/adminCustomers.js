// Customers page logic and its PLACEHOLDER data. There is no customer backend wired to
// the admin yet, so customerRows() returns made-up businesses with obviously fake
// phone numbers. When the real thing exists, replace customerRows (see
// composables/useCustomers.js) and keep the rest.
const DAY_MS = 24 * 60 * 60 * 1000;

export const CUSTOMER_SEGMENTS = ['retail', 'wholesale', 'school', 'temple'];

// lastOrderDaysAgo is relative to now.
const SAMPLE = [
  ['C-1001', 'Baan Ruam Mit Kindergarten', 'โรงเรียนอนุบาลบ้านรวมมิตร', '081-000-1001', 'ruammit.kg', 'school', 14, 186400, 4],
  ['C-1002', 'Wat Sampeng Activity Group', 'กลุ่มกิจกรรมวัดสำเพ็ง', '081-000-1002', 'watsampeng', 'temple', 9, 74200, 11],
  ['C-1003', 'Lanna Handmade Co.', 'ลานนา แฮนด์เมด', '082-000-1003', 'lanna.handmade', 'wholesale', 22, 412900, 2],
  ['C-1004', 'Khun Malee', 'คุณมาลี', '083-000-1004', 'malee.craft', 'retail', 5, 6240, 19],
  ['C-1005', 'Suan Dok Craft Club', 'ชมรมงานฝีมือสวนดอก', '084-000-1005', 'suandok.club', 'retail', 7, 15980, 8],
  ['C-1006', 'Thai Ribbon Wholesale', 'ไทยริบบิ้น ค้าส่ง', '085-000-1006', 'thairibbon', 'wholesale', 31, 689500, 1],
  ['C-1007', 'Rose Garden Florist', 'โรสการ์เด้น ฟลอริสต์', '086-000-1007', 'rosegarden.bkk', 'wholesale', 12, 98700, 6],
  ['C-1008', 'Phuket Bead Studio', 'ภูเก็ต บีด สตูดิโอ', '087-000-1008', 'phuketbeads', 'retail', 3, 11450, 33],
  ['C-1009', 'Sunrise Learning Center', 'ศูนย์การเรียนซันไรส์', '088-000-1009', 'sunrise.learn', 'school', 18, 143300, 3],
  ['C-1010', 'Wat Pa Sukhothai', 'วัดป่าสุโขทัย', '089-000-1010', 'watpa.sukhothai', 'temple', 4, 22800, 27],
  ['C-1011', 'Khun Anan', 'คุณอนันต์', '090-000-1011', 'anan.sewing', 'retail', 2, 1860, 52],
  ['C-1012', 'Bangkok Costume Atelier', 'ห้องเสื้อกรุงเทพ คอสตูม', '091-000-1012', 'bkk.costume', 'wholesale', 26, 538400, 5],
];

export const customerRows = (now = Date.now()) => SAMPLE.map(
  ([id, name, nameTh, phone, line, segment, orders, spent, lastOrderDaysAgo]) => ({
    id, name, nameTh, phone, line, segment, orders, spent,
    lastOrderAt: now - lastOrderDaysAgo * DAY_MS,
  })
);

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
    recent: (a, b) => a.lastOrderAt - b.lastOrderAt,
  }[sort.key] || (() => 0);
  return rows.slice().sort((a, b) => sign * compare(a, b) || a.id.localeCompare(b.id));
};

export const customerSegmentChips = (rows) => [{ key: 'all', count: rows.length }].concat(
  CUSTOMER_SEGMENTS.map((key) => ({ key, count: rows.filter((r) => r.segment === key).length }))
);

// First letter of up to two words, for the avatar circle.
export const initials = (name) => {
  const letters = String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => Array.from(w)[0]);
  return letters.length ? letters.join('').toUpperCase() : '?';
};
