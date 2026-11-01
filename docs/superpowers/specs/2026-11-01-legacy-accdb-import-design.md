# Legacy Access import + Legacy tag in admin — Design

**Date:** 2026-11-01
**Status:** Approved by the owner in chat (scope, separate legacy tables, legacy products, no product-level views)
**Source:** `D:\Kitcharoen\KIT Base.accdb` (read-only, never modified). Extends the plan in memory `acdb-customer-migration`.

## Problem

The shop's real customers and a year of sales live in the old Access database. The admin
Invoices and Customers pages still show made-up placeholder rows, and D1 has no shop
customers (its `customers` table is website logins). The owner wants the last year of
invoices and customers loaded into D1 and shown in the admin pages tagged **Legacy**,
**without linking to the 145 web products**. Each legacy invoice must still show which
products it contained.

## Decisions

| Question | Decision |
|---|---|
| Window | 2025-10-13 .. 2026-10-13 (the Access data ends 2026-10-13) |
| Where invoices live | **Separate legacy tables**, not the planned `invoices` table (its per-piece prices, levels, stock and numbering do not fit Access data) |
| Products | `legacy_products` (all 2,071 Access products, reference only) and `legacy_invoice_lines.product_name` kept exactly as typed |
| Line → product link | `legacy_product_id` only on an exact trimmed name match (about 62% of lines). Names that are ambiguous (6 duplicate product names) or unmatched stay unlinked. **No guessing, no auto-created products** |
| Customers in the window | Customers matched by exact trimmed `Customers.Name`, status `unverified`, price level unset |
| Unmatched / ambiguous sales names | The invoice keeps the name as a snapshot, `customer_id` NULL. Never imported as a new customer (owner's rule) |
| Invoice grain | One legacy invoice per (OrderNo, customer name, date): about 3,200 invoices. 164 order numbers are shared by several names |
| Order types | All (Order, Adm, Base, User); kept in `access_type` |
| Non-product lines | Returns, payments on account, carrier cost ("หักคืน", "จ่ายก่อน", "ค่าต้นทาง", unit `บิล`, or qty/price ≤ 0): `line_kind = 'adjustment'`; every other line `'product'`. Lines are kept as-is, totals include them |
| Status | Only `paid` / `unpaid` (Access `Pay`); an invoice is paid when every line is paid. No due date, so never "overdue" |
| Never delete | Loader is `INSERT OR IGNORE` only. No delete route. Customers get `status` (`unverified/confirmed/merged/archived`) and `merged_into` for the later merge feature |
| LINE field | Access `LINEid` holds labels ("LINE", "LINE Official"), not IDs. Stored in `line_note`, never shown as a LINE handle |
| Sensitive data | Staging JSON/SQL contains phone numbers and addresses: written under a git-ignored folder, never committed |

## Data model — migration `0027_legacy_import.sql` (additive, safe to run twice)

```sql
legacy_customers(id TEXT PK 'LC-<CustomerID>', access_ref TEXT UNIQUE, name, code_name, phone,
  email, address, province, tax_id, vat_name, branch, transport, line_note, note,
  status TEXT DEFAULT 'unverified' CHECK (...), merged_into TEXT, imported_at)
legacy_products(id TEXT PK 'LP-<n>', access_ref TEXT UNIQUE (s_GUID), code_name, name,
  group_name (Access VatName), unit, cost, price_1..price_4, on_sell, note)
legacy_invoices(id TEXT PK 'LI-<OrderNo>-<yyyymmdd>-<n>', order_no, customer_id (nullable),
  customer_name, sold_on 'YYYY-MM-DD', paid INTEGER, access_type, vat_bill_no,
  total REAL, line_count INTEGER, UNIQUE(order_no, customer_name, sold_on))
legacy_invoice_lines(id INTEGER PK, access_id INTEGER (Sell Transection.ID, reused by Access across orders, so not unique), UNIQUE(invoice_id, line_no), invoice_id,
  line_no, product_name, unit, qty REAL, unit_price REAL, line_total REAL,
  line_kind TEXT, paid INTEGER, legacy_product_id TEXT)
```

Indexes on `legacy_invoices(sold_on)`, `(customer_id)`, `legacy_invoice_lines(invoice_id)`,
`(legacy_product_id)`. Same DDL goes into `schema.sql` and `test/helpers/db.ts`.
There is no foreign key to `products`, `customers` or `invoices`.

## Import pipeline (`hidden-water-ed9d/legacy-import/`, run by hand)

1. `extract.ps1` — read-only ADO read of Access into `staging/*.json` (git-ignored).
2. `build.mjs` — pure functions in `transform.mjs` (unit-tested) turn the JSON into rows and
   write chunked `staging/sql/NNN-*.sql` (`INSERT OR IGNORE`, 400 statements per file).
   `--dry-run` writes nothing but prints: counts per table, window, ฿ total vs the Access
   total, shared-order cases, adjustment lines, unlinked-name counts, ambiguous names.
3. Owner approves the dry-run numbers. D1 backup first (see memory `deploy-workflow`).
4. Apply each chunk with `wrangler d1 execute product-db --remote --file=…`, in order.
5. `verify.mjs` queries D1 and compares row counts and `SUM(line_total)` to the dry-run.
   Re-running the load must add zero rows.

## Worker API (admin-only, after the protected-routes gate; `src/legacy.ts`)

| Route | Returns |
|---|---|
| `GET /legacy/customers` | `[{id,name,phone,status,orders,spent,outstanding,last_order_on}]` aggregated from legacy invoices |
| `GET /legacy/customers/:id` | the customer's full fields, their invoices, and `top_products` (name, unit, lines, qty) |
| `GET /legacy/invoices?q=&paid=` | `[{id,order_no,customer_id,customer_name,sold_on,paid,total,line_count,access_type}]` |
| `GET /legacy/invoices/:id` | the invoice plus its lines (each with `legacy_product_id` and, when linked, the product's group name) |

Read-only: no write route exists. Unknown id → 404.

## Frontend

- `api.js`: `listLegacyCustomers / getLegacyCustomer / listLegacyInvoices / getLegacyInvoice`.
- `useCustomers` / `useInvoices` load the legacy rows and map them to the existing row shapes
  with `source: 'legacy'`. The made-up SAMPLE rows are removed and `isPlaceholder` becomes
  false (the "preview data" banner goes). Customers added this visit stay in-memory, as today.
- **Legacy badge** on rows of both lists; a **Legacy** filter chip.
- Customers: `level` is unset for legacy rows and shows "—"; type chip unset; contact shown as "—";
  LINE column blank. Orders / Spent / Last order / Outstanding come from the legacy invoices.
  Clicking a legacy customer opens a read-only **Legacy details** panel: address, tax ID, VAT
  name, e-mail, transport, note, top products and the invoice list.
- Invoices: number shown as "Order 60136" + Legacy badge; status chips Paid / Unpaid for
  legacy rows; due date blank. The summary cards (outstanding / overdue / paid 30 days)
  **exclude legacy rows**.
- A legacy invoice opens a read-only **Legacy invoice view** (route `admin-legacy-invoice`)
  listing every line as typed (name, unit, qty, price, total, adjustment lines marked) and
  the Legacy badge. It never opens the New-invoice editor.
- The New-invoice customer picker reads `useCustomers`, so it now lists legacy customers
  with level 0 (Retail). Level is chosen manually per the earlier decision.
- All copy through the existing EN/TH text utils with key-parity specs.

## Testing

- `transform.spec.mjs` (Node test runner): name trimming, window filter, invoice grouping incl.
  shared order numbers, paid rule, line_kind, product link (exact / ambiguous / none), SQL
  quoting of Thai text and quotes, chunking, idempotent ids.
- Worker `legacy.spec.ts`: 401 without a session; list aggregates (orders, spent, outstanding);
  detail returns lines in order and linked product group; customer detail top products;
  404s; `q` and `paid` filters; no write method accepted.
- Frontend specs: row mapping, badge/filter, summary excludes legacy, text-key parity.
- Manual: dry-run numbers vs the Access totals; local D1 load; screenshots of both pages.

## Out of scope

Customer merge UI, product-level legacy views, linking legacy products to web products,
editing legacy data, importing older than the window, Vat bill detail beyond `vat_bill_no`.
