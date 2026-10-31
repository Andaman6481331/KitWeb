// The logic behind the admin Cash Sale page: what can be sold, how a cart adds up, and
// the small record of today's sales kept on the till's own browser. The page keeps the
// screen; everything here is plain data so adminCashSale.spec.js can check it.

import { englishName } from './adminCashSaleNamesEn';

// [name, typing shortcut, shown under "Frequent"]. The shortcut is the leading consonant of
// each syllable (preposed vowels เ แ โ ใ ไ skipped), so "กก" finds กรรไกร and "ขม" finds
// เข็มมุด. Several types can share one; all of them are listed.
const TYPES = [
  ['กรรไกร', 'กก', true], ['กระดาษ', 'กด'], ['กระพรวน', 'กพ'], ['กาวแท่ง', 'กท'], ['ก้านลูกโป่ง', 'กลป'],
  ['กล่อง', 'ก'], ['ก้ามปู', 'กป'], ['กากเพชร', 'กพ'], ['กำมะหยี่', 'กมห'], ['กิ๊ป', 'ก'], ['เกสร', 'กส'],
  ['กระดุม', 'กด', true], ['กระดิ่ง', 'กด'], ['เข็มมุด', 'ขม', true], ['เข็มสอย', 'ขส'], ['เข็มเนา', 'ขน'],
  ['เข็มควัก', 'ขค'], ['ด้ายหลอด', 'ดห'], ['ด้ายวีสปัน', 'ดวส'], ['ด้ายแกน', 'ดก'], ['ยางแผง', 'ยผ'],
  ['ยางม้วน', 'ยม'], ['ยางหลอด', 'ยห'], ['ริบบิ้น', 'รบ', true], ['ริบบิ้นซาติน', 'รบซต'],
  ['ริบบิ้นไนล่อน', 'รบนล'], ['ริบบิ้นผ้า', 'รบผ'], ['ริบบิ้นพับเหรียญ', 'รบพห'], ['ริบบิ้นฟาง', 'รบฟ'],
  ['ลวด', 'ล'], ['ลวดพันก้าน', 'ลพก'], ['ลวดต้น', 'ลต'], ['ลวดวง', 'ลว'], ['ไหมนก', 'หน', true],
  ['ไหมวีนัส', 'หวน'], ['ไหมเส้นใหญ่', 'หสห'], ['ไหมซัมเมอร์', 'หซม'], ['ไหมเบบี้', 'หบบ'],
  ['ไหมญีปุ่น', 'หญป'], ['ลูกปัด', 'ลป', true], ['ใบไม้', 'บม'], ['มีดคว้าน', 'มค'], ['เชือกเทียน', 'ชท'],
  ['ห่วงเงิน', 'หง'], ['ห่วงทอง', 'หท'],
  // Write-in rows: the cashier finishes the wording by hand on the receipt.
  ['อุปกรณ์จักร ............', ''], ['วัสดุ ......', ''],
];

export const CASH_TYPES = TYPES.map(([name, sc, freq]) => ({ name, sc, freq: Boolean(freq) }));

export const frequentTypes = (types = CASH_TYPES) => types.filter((t) => t.freq);

// An empty query lists everything. Otherwise a type matches when its name contains the text
// or its shortcut starts with it, and a shortcut typed in full comes first.
export const matchTypes = (query, types = CASH_TYPES) => {
  const s = String(query || '').trim().toLowerCase();
  if (!s) return types;
  return types
    .filter((t) => t.name.toLowerCase().includes(s) || (t.sc !== '' && t.sc.startsWith(s)))
    .sort((a, b) => (a.sc === s ? 0 : 1) - (b.sc === s ? 0 : 1));
};

// ---- money ----------------------------------------------------------------------------

const cents = (n) => Math.round(n * 100) / 100;

export const money = (n) => `฿${Number(n).toLocaleString('en-US', {
  minimumFractionDigits: cents(n) % 1 ? 2 : 0,
  maximumFractionDigits: 2,
})}`;

// Keep what a cashier types in a number box to a number: digits, one point, two decimals.
export const sanitizePrice = (raw) => String(raw)
  .replace(/[^0-9.]/g, '')
  .replace(/(\..*)\./g, '$1')
  .replace(/(\.\d\d).+/, '$1');
export const sanitizeQty = (raw) => String(raw).replace(/[^0-9]/g, '');

export const lineTotal = (line) => cents(line.price * line.qty);
export const cartTotal = (cart) => cents(cart.reduce((sum, l) => sum + l.price * l.qty, 0));
export const pieceCount = (cart) => cart.reduce((sum, l) => sum + l.qty, 0);

// Change owed. Cash short of the total is not a payment, so it owes nothing.
export const changeDue = (received, total) => (received >= total ? cents(received - total) : 0);

// One-tap amounts for "cash received": the exact total, then up to two banknotes that cover it.
export const quickAmounts = (total) => [
  { kind: 'exact', value: total },
  ...[100, 500, 1000].filter((v) => v > total).slice(0, 2).map((value) => ({ kind: 'note', value })),
];

// ---- cart -----------------------------------------------------------------------------

// The same type at the same price is one line, so keying it twice raises the quantity.
export const addLine = (cart, line) => {
  const same = cart.find((l) => l.name === line.name && l.price === line.price);
  if (!same) return [...cart, line];
  return cart.map((l) => (l === same ? { ...l, qty: l.qty + line.qty } : l));
};

export const removeLine = (cart, k) => cart.filter((l) => l.k !== k);

// Taking a line below one piece removes it.
export const setLineQty = (cart, k, qty) => (qty < 1
  ? removeLine(cart, k)
  : cart.map((l) => (l.k === k ? { ...l, qty } : l)));

// Puts a removed line back where it was (lines are numbered in the order they were keyed).
export const restoreLine = (cart, line) => [...cart, line].sort((a, b) => a.k - b.k);

// ---- saving ---------------------------------------------------------------------------

// What POST /cashsales takes: one entry per line with its quantity. The Worker works the total
// out itself. clientId stays the same on a retry, so a sale that was saved but whose answer
// never arrived is not saved twice.
export const newClientId = () => globalThis.crypto.randomUUID();

export const salePayload = (cart, { clientId, received = null, note = '', copyLang = 'th' }) => ({
  client_id: clientId,
  items: cart.map((l) => {
    const english = englishName(l.name);
    return {
      name: l.name,
      name_en: english === l.name ? null : english,
      price: l.price,
      qty: l.qty,
      custom: Boolean(l.custom),
    };
  }),
  received,
  note,
  copy_lang: copyLang,
});

// A sale as the Worker returns it, in the shape the page keeps and prints from.
export const saleFromRecord = (r) => ({
  ref: r.invoice_ref,
  orderId: r.id,
  savedAt: r.sold_at,
  items: r.items.map((i) => ({ name: i.name, price: i.unit_price, qty: i.quantity })),
  total: r.total_amount,
  received: r.received_amount || 0,
  note: r.note || '',
  copyLang: r.copy_lang === 'en' ? 'en' : 'th',
});

// YYYY-MM-DD in this device's own time, the day to ask the Worker for.
export const localDay = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const pad2 = (n) => String(n).padStart(2, '0');

// INV-YYMMDD-XXXXXX, the last part being the start of the saved order's id.
export const invoiceRef = (date, orderId) =>
  `INV-${pad2(date.getFullYear() % 100)}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`
  + `-${String(orderId).replace(/-/g, '').slice(0, 6).toUpperCase()}`;

export const clockTime = (date) => `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

// ---- today's sales, kept in this browser -------------------------------------------------

export const SALES_KEY = 'kc-cash-sales';
export const LAST_PRICES_KEY = 'kc-cash-last';
export const COPY_LANG_KEY = 'kc-cash-copy-lang';
export const HISTORY_LIMIT = 50;

// Storage can throw (private windows) or be missing (prerender); the page works without it.
export const readJson = (key, fallback, storage = globalThis.localStorage) => {
  try {
    const value = JSON.parse(storage.getItem(key) || 'null');
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
};

export const writeJson = (key, value, storage = globalThis.localStorage) => {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // the history simply isn't kept
  }
};

export const pushSale = (sales, sale) => [sale, ...sales].slice(0, HISTORY_LIMIT);

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const todaysSales = (sales, now = new Date()) => sales.filter((s) => sameDay(new Date(s.savedAt), now));
export const salesTotal = (sales) => cents(sales.reduce((sum, s) => sum + s.total, 0));

// ---- new product names -------------------------------------------------------------------
// A cashier can add a name that is not in the list. Every such name is recorded here, with
// no limit (unlike the sales history), so it can be added to TYPES in the code later.

export const NEW_NAMES_KEY = 'kc-cash-new-names';
export const NAME_MAX = 60;

export const cleanName = (raw) => String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);

const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();

// The names in the record, shaped like the built-in types so search and the cart treat them alike.
export const customTypes = (records) => records.map((r) => ({ name: r.name, sc: '', freq: false, custom: true }));

// Records a new name. A name already in the list, or already recorded, adds nothing and
// comes back as the existing type, so it can simply be picked.
// Returns { records, type, isNew }, or { records, type: null } for an empty name.
export const addNewName = (records, raw, now = new Date(), types = CASH_TYPES) => {
  const name = cleanName(raw);
  if (!name) return { records, type: null, isNew: false };
  const known = types.find((t) => sameName(t.name, name));
  if (known) return { records, type: known, isNew: false };
  const kept = records.find((r) => sameName(r.name, name));
  if (kept) return { records, type: customTypes([kept])[0], isNew: false };
  const record = { name, addedAt: now.toISOString(), uses: 0 };
  return { records: [record, ...records], type: customTypes([record])[0], isNew: true };
};

// Counts a recorded name going into a cart (other names are ignored).
export const bumpNameUse = (records, name) => records.map((r) => (r.name === name ? { ...r, uses: (r.uses || 0) + 1 } : r));
