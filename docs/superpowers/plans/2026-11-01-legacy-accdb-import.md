# Legacy Access import + Legacy tag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Load the last year of Access customers, invoices and products into D1 as read-only legacy data and show it, tagged Legacy, in the admin Customers and Invoices pages.

**Architecture:** Additive migration 0027 (four `legacy_*` tables) → local extract/transform/SQL-chunk scripts → admin-only read routes in the Worker (`src/legacy.ts`) → frontend composables map legacy rows into the existing page shapes with `source: 'legacy'`.

**Tech Stack:** Cloudflare Worker + D1 (vitest-pool-workers), Node ESM scripts (`node --test`), PowerShell ADO for Access, Vue 3 + vitest.

**Spec:** `docs/superpowers/specs/2026-11-01-legacy-accdb-import-design.md`

## Global Constraints

- Access file is read-only; nothing is ever deleted from D1/R2 (INSERT OR IGNORE only, no delete route).
- No link to web `products`; line→legacy product only on exact trimmed unique name match.
- Window 2025-10-13 .. 2026-10-13; staging data (PII) lives in a git-ignored folder.
- Do the dry run and get owner approval before any write to the remote D1.
- Worker routes go after the `3. PROTECTED ROUTES` admin gate in `src/index.ts`.

---

### Task 1: Migration + schema + test DDL
**Files:** Create `hidden-water-ed9d/migrations/0027_legacy_import.sql`; Modify `schema.sql`, `test/helpers/db.ts` (DDL + TABLES list).
**Produces:** tables `legacy_customers, legacy_products, legacy_invoices, legacy_invoice_lines` exactly as in the spec.
- [ ] Write DDL (`CREATE TABLE IF NOT EXISTS` + indexes) in the migration, mirror in schema.sql and db.ts.
- [ ] Run `npx vitest run test/cash-sale.spec.ts` to confirm helper still works.

### Task 2: Transform module (TDD)
**Files:** Create `hidden-water-ed9d/legacy-import/transform.mjs`, `transform.spec.mjs`.
**Produces:** `buildLegacy({customers, products, sales}, {from, to}) → {customers, products, invoices, lines, report}`, `sqlChunks(rows, maxStatements) → string[]`, `lineKind(line)`.
- [ ] Write specs (trim, window, grouping with shared order numbers, paid rule, adjustment detection, product link exact/ambiguous/none, SQL quoting, chunking, stable ids).
- [ ] Run `node --test legacy-import/` → fail; implement; pass.

### Task 3: Extract + build/verify scripts
**Files:** Create `legacy-import/extract.ps1`, `build.mjs`, `verify.mjs`, `.gitignore` entry for `legacy-import/staging/`.
- [ ] extract.ps1 writes staging/{customers,products,sales}.json from Access (read-only).
- [ ] build.mjs `--dry-run` prints the report; without it writes `staging/sql/NNN-*.sql`.
- [ ] Run extract + dry-run; show numbers to the owner (**gate: approval before any remote write**).

### Task 4: Worker `src/legacy.ts` + routes (TDD)
**Files:** Create `src/legacy.ts`, `test/legacy.spec.ts`; Modify `src/index.ts` (after protected gate), `test/helpers/db.ts` seed helper.
**Produces:** `listLegacyCustomers(db)`, `getLegacyCustomer(db,id)`, `listLegacyInvoices(db,{q,paid})`, `getLegacyInvoice(db,id)`; routes `GET /legacy/customers`, `/legacy/customers/:id`, `/legacy/invoices`, `/legacy/invoices/:id`.
- [ ] Specs → fail → implement → pass; run the full Worker suite.

### Task 5: Frontend data layer (TDD)
**Files:** Modify `services/api.js`, `composables/useCustomers.js`, `composables/useInvoices.js`, `utils/adminCustomers.js`, `utils/adminInvoices.js`; Create `utils/adminLegacy.js` + spec.
**Produces:** `legacyCustomerRow(c)`, `legacyInvoiceRow(i)`; rows carry `source:'legacy'`; `summarizeInvoices` ignores legacy.
- [ ] Specs → fail → implement → pass.

### Task 6: Frontend UI
**Files:** Modify `views/admin/AdminCustomersPage.vue`, `AdminInvoicesPage.vue`, `router/adminRoutes.js`, `utils/adminMockText.js` (+ parity spec); Create `views/admin/AdminLegacyInvoicePage.vue`, `components/admin/customers/LegacyCustomerPanel.vue`.
- [ ] Badge, Legacy chip, level "—", legacy customer panel, read-only legacy invoice view.
- [ ] Run frontend specs + build.

### Task 7: Local end-to-end + hand-off
- [ ] Apply migration and a sample chunk to local D1, run `wrangler dev`, check endpoints with curl.
- [ ] Update memory; report what remains (remote migration, remote load, deploy) for owner approval.
