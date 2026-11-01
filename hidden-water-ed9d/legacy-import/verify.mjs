// Compares D1 against staging/expected.json after a load.
//   node legacy-import/verify.mjs --remote      (or --local [--persist-to <dir>])
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const expected = JSON.parse(fs.readFileSync(path.join(here, 'staging', 'expected.json'), 'utf8'));
const argv = process.argv.slice(2);
const persist = argv.includes('--persist-to') ? ['--persist-to', argv[argv.indexOf('--persist-to') + 1]] : [];
const target = argv.includes('--local') ? ['--local', ...persist] : ['--remote'];

const query = (sql) => {
  const raw = execFileSync('npx', ['wrangler', 'd1', 'execute', 'product-db', ...target, '--json', '--command', `"${sql}"`],
    { cwd: path.join(here, '..'), encoding: 'utf8', shell: true });
  return JSON.parse(raw)[0].results[0];
};

const got = {
  customers: query('SELECT COUNT(*) AS v FROM legacy_customers').v,
  products: query('SELECT COUNT(*) AS v FROM legacy_products').v,
  invoices: query('SELECT COUNT(*) AS v FROM legacy_invoices').v,
  lines: query('SELECT COUNT(*) AS v FROM legacy_invoice_lines').v,
  total: Math.round(query('SELECT SUM(line_total) AS v FROM legacy_invoice_lines').v * 100) / 100,
  adjustmentLines: query("SELECT COUNT(*) AS v FROM legacy_invoice_lines WHERE line_kind = 'adjustment'").v,
  linkedProductLines: query('SELECT COUNT(*) AS v FROM legacy_invoice_lines WHERE legacy_product_id IS NOT NULL').v,
};
let ok = true;
for (const key of Object.keys(got)) {
  const same = Math.abs(got[key] - expected[key]) < 0.01;
  if (!same) ok = false;
  console.log(`${same ? 'OK  ' : 'FAIL'} ${key}: D1 ${got[key]} vs expected ${expected[key]}`);
}
process.exit(ok ? 0 : 1);
