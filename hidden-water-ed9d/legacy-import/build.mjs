// Turns staging/*.json (from extract.ps1) into chunked INSERT OR IGNORE files under staging/sql/.
//   node legacy-import/build.mjs --dry-run     print the report only, write nothing
//   node legacy-import/build.mjs               write staging/sql/NNN-*.sql and staging/expected.json
// Flags: --from YYYY-MM-DD --to YYYY-MM-DD (default: the last year of data, 2025-10-13 .. 2026-10-13).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLegacy, insertStatements, chunkStatements } from './transform.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const staging = path.join(here, 'staging');
const args = process.argv.slice(2);
const flag = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const dryRun = args.includes('--dry-run');
const PER_FILE = 400;

const read = (file) => JSON.parse(fs.readFileSync(path.join(staging, file), 'utf8'));
const data = { customers: read('customers.json'), products: read('products.json'), sales: read('sales.json'), vat: read('vat.json') };
const out = buildLegacy(data, { from: flag('--from', '2025-10-13'), to: flag('--to', '2026-10-13') });

const accessTotal = data.sales
  .filter((s) => s.Date >= out.report.window.from && s.Date <= out.report.window.to)
  .reduce((sum, s) => sum + (Number(s.Num) || 0) * (Number(s.Price) || 0), 0);
out.report.accessTotal = Math.round(accessTotal * 100) / 100;
out.report.totalsMatch = Math.abs(out.report.accessTotal - out.report.total) < 1;

console.log(JSON.stringify(out.report, null, 2));
if (dryRun) process.exit(0);

const tables = [
  ['customers', 'legacy_customers', ['id', 'access_ref', 'name', 'code_name', 'phone', 'email', 'address', 'province', 'tax_id', 'vat_name', 'branch', 'transport', 'line_note', 'note', 'status', 'merged_into'], out.customers],
  ['products', 'legacy_products', ['id', 'access_ref', 'code_name', 'name', 'group_name', 'unit', 'cost', 'price_1', 'price_2', 'price_3', 'price_4', 'on_sell', 'note'], out.products],
  ['invoices', 'legacy_invoices', ['id', 'order_no', 'customer_id', 'customer_name', 'sold_on', 'paid', 'access_type', 'vat_bill_no', 'total', 'line_count'], out.invoices],
  ['lines', 'legacy_invoice_lines', ['access_id', 'invoice_id', 'line_no', 'product_name', 'unit', 'qty', 'unit_price', 'line_total', 'line_kind', 'paid', 'legacy_product_id'], out.lines],
];
const sqlDir = path.join(staging, 'sql');
fs.rmSync(sqlDir, { recursive: true, force: true });
fs.mkdirSync(sqlDir, { recursive: true });
let n = 0;
for (const [label, table, columns, rows] of tables) {
  for (const chunk of chunkStatements(insertStatements(table, columns, rows), PER_FILE)) {
    n += 1;
    fs.writeFileSync(path.join(sqlDir, `${String(n).padStart(3, '0')}-${label}.sql`), chunk);
  }
}
fs.writeFileSync(path.join(staging, 'expected.json'), JSON.stringify(out.report, null, 2));
console.log(`\nWrote ${n} SQL files to ${sqlDir}`);
