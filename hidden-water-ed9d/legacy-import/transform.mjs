// Pure transform from raw Access rows to the legacy_* rows (migration 0027). No I/O here so it
// can be tested; build.mjs reads the staging JSON and writes the SQL.
//
// Input rows keep Access's column names. Dates arrive as 'YYYY-MM-DD' (extract.ps1 converts them).

const text = (v) => String(v ?? '').trim();
const textOrNull = (v) => text(v) || null;
const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
const guidKey = (g) => text(g).replace(/[{}]/g, '').toLowerCase();

// Lines that are not goods: returns, payments on account, carrier/delivery charges, "bill"
// lines, and anything with a zero or negative quantity or price.
const ADJUSTMENT_NAME = /หักคืน|จ่ายก่อน|ค่าต้นทาง|ค่ารถ|โอนมา/;
export const lineKind = ({ name, unit, qty, price }) => {
  if (!(qty > 0) || !(price > 0)) return 'adjustment';
  if (text(unit) === 'บิล') return 'adjustment';
  return ADJUSTMENT_NAME.test(text(name)) ? 'adjustment' : 'product';
};

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const truthy = (v) => v === true || v === 1 || /^(true|1|-1)$/i.test(String(v));

const groupBy = (rows, keyOf) => {
  const map = new Map();
  for (const row of rows) {
    const k = keyOf(row);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(row);
  }
  return map;
};

export function buildLegacy({ customers, products, sales, vat = [] }, { from, to }) {
  const inWindow = sales.filter((s) => {
    const d = text(s.Date).slice(0, 10);
    return d >= from && d <= to;
  });

  // Customers: loaded when their Name is used by a sale in the window; linked only when unique.
  const soldNames = new Set(inWindow.map((s) => text(s.CN)));
  const byName = groupBy(customers, (c) => text(c.Name));
  const customerRows = [];
  for (const [name, rows] of byName) {
    if (!soldNames.has(name)) continue;
    for (const c of rows) {
      customerRows.push({
        id: `LC-${text(c.CustomerID)}`, access_ref: text(c.CustomerID), name,
        code_name: textOrNull(c.CodeName), phone: textOrNull(c.PhoneNumber), email: textOrNull(c.MAIL),
        address: textOrNull(c.Address), province: textOrNull([c.Aumpur, c.Province].map(text).filter(Boolean).join(' ')),
        tax_id: textOrNull(c.TAXid), vat_name: textOrNull(c.NameVat), branch: textOrNull(c.Office),
        transport: textOrNull(c.TransportSelect), line_note: textOrNull(c.LINEid), note: textOrNull(c.Note),
        status: 'unverified', merged_into: null,
      });
    }
  }
  const uniqueCustomer = new Map();
  for (const [name, rows] of byName) if (rows.length === 1) uniqueCustomer.set(name, `LC-${text(rows[0].CustomerID)}`);

  // Products: every Access product; a line links only to a uniquely named one.
  const productRows = products.map((p) => ({
    id: `LP-${guidKey(p.s_GUID)}`, access_ref: text(p.s_GUID), code_name: textOrNull(p.CodeName),
    name: text(p.ProductName), group_name: textOrNull(p.VatName), unit: textOrNull(p.Unit),
    cost: p.Cost == null || p.Cost === '' ? null : Number(p.Cost),
    price_1: numOrNull(p.Price1), price_2: numOrNull(p.Price2), price_3: numOrNull(p.Price3), price_4: numOrNull(p.Price4),
    on_sell: p['On Sell'] === undefined ? 1 : truthy(p['On Sell']) ? 1 : 0,
    note: textOrNull(p.Note),
  }));
  const productByName = groupBy(productRows, (p) => p.name);

  const vatByOrder = new Map();
  for (const v of vat) {
    const no = text(v.OrderNo), bill = text(v.VatBillNo);
    if (!no || !bill) continue;
    if (!vatByOrder.has(no)) vatByOrder.set(no, new Set());
    vatByOrder.get(no).add(bill);
  }

  // Invoices: one per (OrderNo, name, date). The suffix numbers the names sharing an order/date.
  const groups = groupBy(inWindow, (s) => `${text(s.OrderNo)}\u0000${text(s.CN)}\u0000${text(s.Date).slice(0, 10)}`);
  const namesPerOrderDate = groupBy([...groups.values()].map((g) => g[0]), (s) => `${text(s.OrderNo)}\u0000${text(s.Date).slice(0, 10)}`);
  const invoiceRows = [];
  const lineRows = [];
  for (const rows of groups.values()) {
    const first = rows[0];
    const orderNo = text(first.OrderNo), name = text(first.CN), day = text(first.Date).slice(0, 10);
    const siblings = namesPerOrderDate.get(`${orderNo}\u0000${day}`).map((s) => text(s.CN)).sort();
    const id = `LI-${orderNo}-${day.replace(/-/g, '')}-${siblings.indexOf(name) + 1}`;
    // Access reuses line IDs across orders and repeats some rows, so the ID alone does not give a
    // stable order. Ties are broken on the line's own content so the numbering never depends on
    // the order Access returned the rows in (the database key is invoice_id + line_no).
    const ordered = rows.slice().sort((a, b) => Number(a.ID) - Number(b.ID)
      || cmp(text(a.ProductName), text(b.ProductName)) || cmp(text(a.Unit), text(b.Unit))
      || cmp(Number(a.Num), Number(b.Num)) || cmp(Number(a.Price), Number(b.Price)));
    let total = 0;
    ordered.forEach((s, i) => {
      const qty = Number(s.Num) || 0, price = Number(s.Price) || 0;
      const productName = text(s.ProductName);
      const matches = productByName.get(productName);
      const lineTotal = money(qty * price);
      total += lineTotal;
      lineRows.push({
        access_id: Number(s.ID), invoice_id: id, line_no: i + 1, product_name: productName, unit: textOrNull(s.Unit),
        qty, unit_price: price, line_total: lineTotal, line_kind: lineKind({ name: productName, unit: s.Unit, qty, price }),
        paid: truthy(s.Pay) ? 1 : 0, legacy_product_id: matches && matches.length === 1 ? matches[0].id : null,
      });
    });
    const bills = vatByOrder.get(orderNo);
    invoiceRows.push({
      id, order_no: orderNo, customer_id: uniqueCustomer.get(name) ?? null, customer_name: name, sold_on: day,
      paid: ordered.every((s) => truthy(s.Pay)) ? 1 : 0, access_type: textOrNull(ordered[0].Type),
      vat_bill_no: bills ? [...bills].join(',') : null, total: money(total), line_count: ordered.length,
    });
  }
  invoiceRows.sort((a, b) => a.sold_on.localeCompare(b.sold_on) || a.id.localeCompare(b.id));
  lineRows.sort((a, b) => cmp(a.invoice_id, b.invoice_id) || a.line_no - b.line_no);
  const idUse = new Map();
  for (const l of lineRows) idUse.set(l.access_id, (idUse.get(l.access_id) || 0) + 1);

  const report = {
    window: { from, to },
    customers: customerRows.length,
    products: productRows.length,
    invoices: invoiceRows.length,
    lines: lineRows.length,
    total: money(lineRows.reduce((sum, l) => sum + l.line_total, 0)),
    paidInvoices: invoiceRows.filter((i) => i.paid).length,
    unlinkedCustomerInvoices: invoiceRows.filter((i) => !i.customer_id).length,
    unlinkedCustomerNames: new Set(invoiceRows.filter((i) => !i.customer_id).map((i) => i.customer_name)).size,
    ambiguousCustomerNames: [...byName].filter(([n, r]) => soldNames.has(n) && r.length > 1).map(([n]) => n),
    reusedLineIds: [...idUse.values()].filter((n) => n > 1).length,
    adjustmentLines: lineRows.filter((l) => l.line_kind === 'adjustment').length,
    linkedProductLines: lineRows.filter((l) => l.legacy_product_id).length,
    sharedOrderNumbers: [...groupBy(invoiceRows, (i) => i.order_no)].filter(([, r]) => r.length > 1).length,
  };
  return { customers: customerRows, products: productRows, invoices: invoiceRows, lines: lineRows, report };
}

function numOrNull(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export const sqlLiteral = (v) => {
  if (v == null) return 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  return `'${String(v).replace(/\0/g, '').replace(/'/g, "''")}'`;
};

export const insertStatements = (table, columns, rows) =>
  rows.map((r) => `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${columns.map((c) => sqlLiteral(r[c])).join(', ')});`);

export const chunkStatements = (statements, perChunk) => {
  const out = [];
  for (let i = 0; i < statements.length; i += perChunk) out.push(statements.slice(i, i + perChunk).join('\n') + '\n');
  return out;
};
