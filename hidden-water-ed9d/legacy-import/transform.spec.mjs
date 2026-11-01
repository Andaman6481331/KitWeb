import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLegacy, lineKind, sqlLiteral, insertStatements, chunkStatements } from './transform.mjs';

const WINDOW = { from: '2025-10-13', to: '2026-10-13' };

const cust = (id, name, extra = {}) => ({ CustomerID: id, CodeName: `code${id}`, Name: name, PhoneNumber: '', LINEid: 'LINE Official', ...extra });
const prod = (guid, name, extra = {}) => ({ s_GUID: guid, CodeName: 'c', ProductName: ` ${name}`, VatName: 'grp', Unit: 'ห่อ', ...extra });
let nextId = 1;
const sale = (over) => ({
  ID: nextId++, CN: 'ร้านเอ', OrderNo: '60136', Date: '2026-08-21', ProductName: ' เข็มควัก', Num: 2, Price: 80,
  Unit: ' โหล', Type: 'Order', Pay: true, ...over,
});

const base = () => ({
  customers: [cust(1, 'ร้านเอ'), cust(2, 'ร้านบี'), cust(3, 'ร้านซ้ำ'), cust(4, 'ร้านซ้ำ'), cust(5, 'ไม่ได้ซื้อ')],
  products: [prod('{AAA}', 'เข็มควัก'), prod('{BBB}', 'ซ้ำ'), prod('{CCC}', 'ซ้ำ')],
  sales: [],
  vat: [],
});

test('keeps only the window and loads only customers who bought in it', () => {
  const d = base();
  d.sales = [
    sale({ Date: '2025-10-12' }), sale({ Date: '2025-10-13', OrderNo: '1' }),
    sale({ Date: '2026-10-13', OrderNo: '2', CN: 'ร้านบี' }), sale({ Date: '2026-10-14', OrderNo: '3' }),
  ];
  const out = buildLegacy(d, WINDOW);
  assert.deepEqual(out.invoices.map((i) => i.order_no).sort(), ['1', '2']);
  assert.deepEqual(out.customers.map((c) => c.name).sort(), ['ร้านบี', 'ร้านเอ']);
});

test('groups lines by order number, name and date, and splits a shared order number', () => {
  const d = base();
  d.sales = [
    sale({ OrderNo: '9', CN: 'ร้านเอ' }), sale({ OrderNo: '9', CN: 'ร้านเอ', Num: 1, Price: 10 }),
    sale({ OrderNo: '9', CN: 'ร้านบี' }),
  ];
  const out = buildLegacy(d, WINDOW);
  assert.equal(out.invoices.length, 2);
  const a = out.invoices.find((i) => i.customer_name === 'ร้านเอ');
  assert.equal(a.line_count, 2);
  assert.equal(a.total, 170);
  assert.match(a.id, /^LI-9-20260821-\d+$/);
  assert.notEqual(out.invoices[0].id, out.invoices[1].id);
});

test('invoice is paid only when every line is paid', () => {
  const d = base();
  d.sales = [sale({ OrderNo: '1' }), sale({ OrderNo: '1', Pay: false }), sale({ OrderNo: '2' })];
  const out = buildLegacy(d, WINDOW);
  assert.equal(out.invoices.find((i) => i.order_no === '1').paid, 0);
  assert.equal(out.invoices.find((i) => i.order_no === '2').paid, 1);
});

test('links the customer only on a unique exact name; ambiguous and unknown names stay snapshots', () => {
  const d = base();
  d.sales = [sale({ OrderNo: '1' }), sale({ OrderNo: '2', CN: 'ร้านซ้ำ' }), sale({ OrderNo: '3', CN: 'ไม่มีในระบบ' })];
  const out = buildLegacy(d, WINDOW);
  const by = (n) => out.invoices.find((i) => i.order_no === n);
  assert.equal(by('1').customer_id, 'LC-1');
  assert.equal(by('2').customer_id, null);
  assert.equal(by('3').customer_id, null);
  assert.equal(by('3').customer_name, 'ไม่มีในระบบ');
  // Both duplicate rows are still loaded; the unknown name is never made a customer.
  assert.deepEqual(out.customers.map((c) => c.id).sort(), ['LC-1', 'LC-3', 'LC-4']);
});

test('links a line to a legacy product only on a unique exact trimmed name', () => {
  const d = base();
  d.sales = [
    sale({ ProductName: ' เข็มควัก ' }), sale({ ProductName: 'ซ้ำ' }), sale({ ProductName: 'ไหมพรม นก no.1' }),
  ];
  const out = buildLegacy(d, WINDOW);
  const names = out.lines.map((l) => [l.product_name, l.legacy_product_id]);
  assert.deepEqual(names, [['เข็มควัก', 'LP-aaa'], ['ซ้ำ', null], ['ไหมพรม นก no.1', null]]);
  assert.equal(out.products.length, 3);
});

test('trims unit and product name, numbers lines in Access order and rounds totals', () => {
  const d = base();
  d.sales = [sale({ ID: 50, Num: 3, Price: 33.333 }), sale({ ID: 40, ProductName: ' ก ' })];
  const out = buildLegacy(d, WINDOW);
  assert.deepEqual(out.lines.map((l) => [l.access_id, l.line_no]), [[40, 1], [50, 2]]);
  assert.equal(out.lines[1].unit, 'โหล');
  assert.equal(out.lines[1].line_total, 100);
});

test('keeps every line even when Access reuses a line ID across orders or repeats a row', () => {
  const d = base();
  d.sales = [
    sale({ ID: 7, OrderNo: '1', CN: 'ร้านเอ', ProductName: 'ก' }),
    sale({ ID: 7, OrderNo: '2', CN: 'ร้านบี', ProductName: 'ข' }),
    sale({ ID: 8, OrderNo: '1', CN: 'ร้านเอ', ProductName: 'ค' }),
    sale({ ID: 8, OrderNo: '1', CN: 'ร้านเอ', ProductName: 'ค' }),
  ];
  const out = buildLegacy(d, WINDOW);
  assert.equal(out.lines.length, 4);
  assert.equal(out.report.lines, 4);
  assert.equal(out.report.reusedLineIds, 2);
  // (invoice_id, line_no) is the key the database enforces, so it must be unique.
  assert.equal(new Set(out.lines.map((l) => `${l.invoice_id}#${l.line_no}`)).size, 4);
  // Same input in a different order gives the same numbering.
  const shuffled = buildLegacy({ ...d, sales: d.sales.slice().reverse() }, WINDOW);
  const key = (o) => o.lines.map((l) => `${l.invoice_id}#${l.line_no}:${l.product_name}`).sort();
  assert.deepEqual(key(shuffled), key(out));
});

test('classifies adjustment lines', () => {
  assert.equal(lineKind({ name: 'ไหมพรม', unit: 'ห่อ', qty: 1, price: 50 }), 'product');
  assert.equal(lineKind({ name: 'จ่ายก่อน', unit: 'บิล', qty: 1, price: -20000 }), 'adjustment');
  assert.equal(lineKind({ name: 'เข็ม หักคืน', unit: 'ห่อ', qty: 3, price: -15 }), 'adjustment');
  assert.equal(lineKind({ name: 'ค่ารถจ้างส่ง', unit: 'ครั้ง', qty: 1, price: 100 }), 'adjustment');
  assert.equal(lineKind({ name: 'ฝาก', unit: 'ชิ้น', qty: 2, price: 0 }), 'adjustment');
  assert.equal(lineKind({ name: 'โอนมา', unit: 'ห่อ', qty: -1, price: 5550 }), 'adjustment');
});

test('attaches VAT bill numbers by order number', () => {
  const d = base();
  d.sales = [sale({ OrderNo: '7' }), sale({ OrderNo: '8' })];
  d.vat = [{ OrderNo: '7', VatBillNo: '10121' }, { OrderNo: '7', VatBillNo: '10121' }];
  const out = buildLegacy(d, WINDOW);
  assert.equal(out.invoices.find((i) => i.order_no === '7').vat_bill_no, '10121');
  assert.equal(out.invoices.find((i) => i.order_no === '8').vat_bill_no, null);
});

test('report totals match the lines', () => {
  const d = base();
  d.sales = [sale({}), sale({ OrderNo: '2', Num: 1, Price: 5 })];
  const out = buildLegacy(d, WINDOW);
  assert.equal(out.report.lines, 2);
  assert.equal(out.report.total, 165);
  assert.equal(out.report.unlinkedCustomerInvoices, 0);
});

test('sqlLiteral quotes text, handles null and numbers', () => {
  assert.equal(sqlLiteral("ร้าน O'Neil"), "'ร้าน O''Neil'");
  assert.equal(sqlLiteral(null), 'NULL');
  assert.equal(sqlLiteral(12.5), '12.5');
  assert.equal(sqlLiteral(true), '1');
  assert.equal(sqlLiteral('a\0b'), "'ab'");
});

test('insertStatements are INSERT OR IGNORE and chunking keeps order', () => {
  const rows = [{ id: 'a', n: 1 }, { id: 'b', n: null }];
  const stmts = insertStatements('t', ['id', 'n'], rows);
  assert.equal(stmts[0], "INSERT OR IGNORE INTO t (id, n) VALUES ('a', 1);");
  assert.equal(stmts[1], "INSERT OR IGNORE INTO t (id, n) VALUES ('b', NULL);");
  const chunks = chunkStatements(Array.from({ length: 5 }, (_, i) => `s${i};`), 2);
  assert.deepEqual(chunks, ['s0;\ns1;\n', 's2;\ns3;\n', 's4;\n']);
});
