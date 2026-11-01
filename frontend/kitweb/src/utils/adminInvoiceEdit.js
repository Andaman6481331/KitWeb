// Pure pricing, totals and checklist logic for the New invoice page. Nothing here
// touches the network or the database: the catalogue comes from adminInvoiceMock.js
// and the page keeps its state in memory, so this module only does the sums.

export const LEVEL_NAMES = {
  en: ['Retail', 'Small wholesale', 'Wholesale', 'Special A', 'Special B'],
  th: ['ราคาปลีก', 'ส่งรายย่อย', 'ราคาส่ง', 'พิเศษ A', 'พิเศษ B'],
};

// [background, text] for each level's badge.
export const LEVEL_COLORS = [
  ['#eeeae3', '#6b6358'], ['#e3eefa', '#2f6db5'], ['#e3f2ec', '#1f8a70'], ['#efe6fa', '#6b3fb0'], ['#fbe6ef', '#b8456b'],
];

// Each level is the anchor price times one of these (Retail is double the Special B price).
const MULTIPLIERS = [2, 1.8, 1.5, 1.1, 1];
// Only the first three levels unlock by quantity; the two Special levels are per customer.
const QTY_LEVELS = 3;
const LOW_STOCK = 10;

const money = (value) => Math.max(0, parseFloat(value) || 0);

export const priceAt = (variant, level) => (
  variant.manual && variant.manual[level] !== undefined
    ? variant.manual[level]
    : Math.round(variant.anchor * MULTIPLIERS[level])
);

// The best level this quantity earns on its own.
export const qtyLevel = (variant, qty) => {
  let level = 0;
  for (let i = 0; i < QTY_LEVELS; i += 1) if (qty >= variant.moq[i]) level = i;
  return level;
};

export const effectiveLevel = (variant, qty, customerLevel) => Math.max(customerLevel, qtyLevel(variant, qty));

// "N more for <next level>": null once Wholesale is reached or there is no quantity yet.
export const upsellHint = (variant, qty, level) => {
  if (!(qty > 0) || level >= QTY_LEVELS - 1) return null;
  const next = level + 1;
  return { level: next, more: variant.moq[next] - qty, price: priceAt(variant, next) };
};

export const stockState = (variant, qty) => {
  if (variant.stock === 0) return 'out';
  if (qty > variant.stock) return 'over';
  if (variant.stock <= LOW_STOCK) return 'low';
  return 'ok';
};

// line: { qty: string, override: string | null }
export const computeLine = (variant, line, customerLevel) => {
  const qty = parseInt(line.qty, 10) || 0;
  const level = effectiveLevel(variant, qty, customerLevel);
  const auto = priceAt(variant, level);
  const edited = line.override !== null && line.override !== undefined;
  const unit = edited ? (parseFloat(line.override) || 0) : auto;
  const stock = stockState(variant, qty);
  return {
    qty, level, auto, edited, unit, total: qty * unit,
    unlockedByQty: level > customerLevel,
    belowCost: unit > 0 && unit < variant.cost,
    bad: qty < 1 || unit <= 0,
    stock,
    shortOnStock: stock === 'out' || stock === 'over',
  };
};

// lines: [{ key, variantId, qty, override }], variants: { [id]: variant }
export const computeInvoice = ({ lines, variants, customerLevel, discount, shipping }) => {
  let subtotal = 0;
  let cost = 0;
  const counts = { over: 0, below: 0, bad: 0 };
  const computed = lines.map((line) => {
    const variant = variants[line.variantId];
    const c = computeLine(variant, line, customerLevel);
    subtotal += c.total;
    cost += c.qty * variant.cost;
    if (c.shortOnStock) counts.over += 1;
    if (c.belowCost) counts.below += 1;
    if (c.bad) counts.bad += 1;
    return { ...line, variant, ...c, qtyText: line.qty };
  });
  const off = money(discount);
  const ship = money(shipping);
  const net = Math.max(0, subtotal - off);
  const margin = net - cost;
  return {
    lines: computed, subtotal, discount: off, shipping: ship, net, total: net + ship, cost, margin,
    marginPct: net > 0 ? Math.round((margin / net) * 100) : 0,
    counts,
  };
};

// The five-step checklist in the sidebar. state: 'ok' | 'todo' (advice) | 'err' (blocks sending).
export const invoiceChecks = ({ hasCustomer, lineCount, counts }) => [
  { key: 'customer', state: hasCustomer ? 'ok' : 'todo', n: 0 },
  { key: 'items', state: lineCount ? 'ok' : 'todo', n: lineCount },
  { key: 'valid', state: counts.bad ? 'err' : 'ok', n: counts.bad },
  { key: 'margin', state: counts.below ? 'todo' : 'ok', n: counts.below },
  { key: 'stock', state: counts.over ? 'todo' : 'ok', n: counts.over },
];

export const canSend = ({ hasCustomer, lineCount, counts }) => hasCustomer && lineCount > 0 && counts.bad === 0;

// ISO dates (YYYY-MM-DD), computed in UTC so the result never shifts with the viewer's timezone.
export const dueDate = (issued, days) => {
  const [y, m, d] = issued.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

export const todayIso = (now = new Date()) => {
  // Bangkok calendar day, like the shop's receipts.
  const bangkok = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return bangkok.toISOString().slice(0, 10);
};

export const nextInvoiceNumber = (existing, year) => {
  const prefix = `INV-${year}-`;
  const highest = existing
    .filter((n) => n.startsWith(prefix))
    .reduce((max, n) => Math.max(max, parseInt(n.slice(prefix.length), 10) || 0), 0);
  return `${prefix}${String(highest + 1).padStart(4, '0')}`;
};
