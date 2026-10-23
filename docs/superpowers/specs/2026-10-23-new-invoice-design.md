# New Invoice slide-over + invoice backend — Design

**Date:** 2026-10-23
**Status:** Revised after owner review (box-price system, quantity rule); awaiting final confirmation
**Part:** B of 2. Builds on Part A (`2026-10-23-edit-product-slideover-design.md`), which creates
the stock tables that "Mark as paid" draws down.

## Problem

The owner designed a New Invoice screen (`InvoiceEdit.dc.html`, mockup folder "New
invoice-html"). Today the Invoices page (`views/admin/AdminInvoicesPage.vue`) shows
made-up rows from `utils/adminInvoices.js`, its "New invoice" button is disabled, and
there is no invoice table, endpoint or editor. The mockup's own prototype keeps invoices in
`localStorage`; none of that can ship.

The owner's instruction: **use mock-up data, but connect the screen to the Worker and
Cloudflare D1 correctly, ready for use.**

## What "mock data" means here

| Real, in D1 via the Worker | Mock, in the frontend |
|---|---|
| Invoices, their lines, numbering, status changes, stock draw-down, the list page | The **customer picker** (8 customers with price levels, from the mockup) and the **product picker** (the mockup's 17 variants, re-expressed as five box prices, pieces per box, box cost and stock in pieces; at least two are boxed, including the owner's 100-piece needle box 2000 / 1500 / 1200 / 1100 / 1000) |

The mock sources sit behind two composables, so swapping in real customers/products later
changes one file each. An invoice stores **snapshots** (customer name/contact/level; line
name/SKU/price/cost), so invoices created now stay valid when the pickers go real; there is
no foreign key to a customers table that does not exist yet.

**Production starts with zero invoices.** Fake invoices would pollute the books. A
local-only seed script (`hidden-water-ed9d/seed/dev-invoices.sql`, header says never run
with `--remote`) fills the list for development and screenshots.

Lines from the mock catalogue carry no `color_id`, so paying such an invoice does **not**
touch real stock. Lines that do reference a real `product_colors` row (once the picker is
real) draw it down. The code path is built and tested now.

## Decisions

| Question | Decision |
|---|---|
| Statuses | `draft → sent → paid`, plus `void`. **Overdue is derived** (sent and past due), never stored |
| Paid invoices | Locked. Not voidable in v1 (reversing stock needs its own design) |
| Deleting | None. Drafts and sent invoices can be **voided**; removed lines are soft-removed (`removed_at`) — owner's no-delete rule |
| Numbering | `INV-<year>-<4 digits>`, allocated by the server on first save from a per-year counter; the panel shows a non-reserving preview before that |
| Totals | The server recomputes subtotal/total from the lines on every write; it never trusts client totals |
| VAT | None (the mockup says "No VAT is added") |
| Prices on a line | **Per piece** = `roundHalfUp(box price at the line's level ÷ pieces per box, 2)`, the same maths as the website (`toPerPiece`). The catalogue supplies five **box** prices and pieces per box, as entered in Part A |
| Quantity | In pieces, sold by the box: a typed quantity rounds **up** to a whole box with a visible note, and the stepper moves by one box (same `clampTypedQty` / `stepQty` as the website). Products with no box size step by 1 |
| Level by quantity | Same fixed rule as the website: ≥ 50 pieces → Wholesale (L3), ≥ 20 → Small wholesale (L2), never below the customer's own level, falling back to a lower level when the reached one has no price. L4/L5 (Special A/B) come only from the customer's level. No per-product thresholds are stored |
| Stock rule | From the mockup: stock is reduced only on **Mark as paid**; drafts and sent invoices reserve nothing; going below zero warns, never blocks. Stock is counted in pieces |
| Auth | All routes admin-only via `isAdminRequest` |
| Panel | Right slide-over like Part A, `min(1180px, 96vw)`; "Add products" is a second, narrower drawer (`min(540px, 100%)`) above it, as in the mockup |
| Preview & print | **Not in this part.** It is a separate mockup screen (`InvoicePreview.dc.html`) you did not ask for; the footer button is omitted rather than left dead |
| Copy/language | EN / ไทย through `useAdminLang` and a new text util, as the Inventory page |

## Data model

New migration `hidden-water-ed9d/migrations/0024_invoices.sql`. Additive only.

```sql
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number TEXT NOT NULL UNIQUE,                 -- INV-2026-0043
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','sent','paid','void')),
    customer_ref TEXT,                           -- picker id; no FK (customers are mock)
    customer_name TEXT NOT NULL,
    customer_contact TEXT,
    customer_phone TEXT,
    price_level INTEGER NOT NULL DEFAULT 1 CHECK (price_level BETWEEN 1 AND 5),
    terms_days INTEGER NOT NULL DEFAULT 7,
    issued_on TEXT NOT NULL,                     -- YYYY-MM-DD, Bangkok date
    due_on TEXT NOT NULL,
    subtotal REAL NOT NULL DEFAULT 0,
    discount REAL NOT NULL DEFAULT 0,
    shipping REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    est_cost REAL NOT NULL DEFAULT 0,            -- sum(qty × unit_cost), internal margin only
    notes TEXT,
    sent_at TEXT, paid_at TEXT, voided_at TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status, issued_on);

CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    line_no INTEGER NOT NULL,
    color_id INTEGER,                            -- real stock row, NULL for mock lines
    item_ref TEXT,                               -- picker id of the variant
    name TEXT NOT NULL, name_th TEXT,
    variant_label TEXT, variant_label_th TEXT,
    sku TEXT,
    qty INTEGER NOT NULL CHECK (qty > 0),        -- pieces
    pieces_per_box INTEGER NOT NULL DEFAULT 1,   -- snapshot, for the box-multiple note
    unit_price REAL NOT NULL CHECK (unit_price >= 0),  -- per PIECE
    unit_cost REAL,                              -- per piece (box cost ÷ pieces per box)
    level_applied INTEGER,                       -- 1..5 the price came from
    price_overridden INTEGER NOT NULL DEFAULT 0, -- 1 = typed by hand ("Edited")
    line_total REAL NOT NULL,
    removed_at TEXT,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

CREATE TABLE IF NOT EXISTS invoice_counters (
    year INTEGER PRIMARY KEY,
    last_no INTEGER NOT NULL
);
```

Numbering uses one atomic statement,
`INSERT … ON CONFLICT(year) DO UPDATE SET last_no = last_no + 1 RETURNING last_no`.
RETURNING support on D1 is confirmed against the current Cloudflare docs when the plan is
written (the Worker's `AGENTS.md` requires that check). `schema.sql` and
`test/helpers/db.ts` get the same DDL.

## API (Worker)

| Route | Behaviour |
|---|---|
| `GET /invoices?status=&q=` | List rows `{id, number, status, customer_name, issued_on, due_on, total}` plus `summary {outstanding, overdue, paid_30d}`. Status filter `overdue` = sent and `due_on < today` |
| `GET /invoices/next-number` | Preview of the next number; reserves nothing |
| `GET /invoices/:id` | Header + non-removed lines |
| `POST /invoices` | Create a **draft**; allocates the number; returns `{id, number}` |
| `PUT /invoices/:id` | Replace header and lines of a **draft** (409 otherwise). Lines are upserted by `id`; lines missing from the payload are soft-removed |
| `POST /invoices/:id/send` | draft → sent. Requires a customer, ≥ 1 line, every qty ≥ 1 and price ≥ 0. Sets `sent_at` |
| `POST /invoices/:id/pay` | sent → paid and draw down stock (below) |
| `POST /invoices/:id/void` | draft or sent → void; sets `voided_at`. Paid → 409 |

**Validation (400):** customer name required; ≤ 200 lines; qty integer ≥ 1; price, discount,
shipping finite ≥ 0; `terms_days` in {0, 7, 15, 30}; discount ≤ subtotal; notes ≤ 2000
characters. `due_on = issued_on + terms_days`. Dates use the Bangkok calendar day
(UTC+7), not the server's.

**Pay, in one `env.DB.batch`, ordered so a replay is a no-op:**
1. For each line with a `color_id`: `UPDATE product_colors SET stock = stock − qty WHERE id = ?
   AND EXISTS (SELECT 1 FROM invoices WHERE id = ? AND status = 'sent')`.
2. A matching `INSERT INTO stock_movements … reason 'INVOICE_PAID', ref = <number>` under
   the same guard, `new_stock` read back from the row.
3. Last: `UPDATE invoices SET status = 'paid', paid_at = … WHERE id = ? AND status = 'sent'`.

Because the status flip is last, a second click or retry sees `paid` and every guarded
statement does nothing. The route then returns the invoice as it stands (idempotent
200), and 409 only for a status that cannot pay (draft, void).

## Frontend

```
components/admin/invoice-edit/
  InvoiceEditPanel.vue      slide-over shell, load/save, locked state, footer
  InvoiceStatusCard.vue     progress % + 5 checks (customer, items, qty/price, margin, stock)
  InvoiceSummaryCard.vue    subtotal/discount/shipping/total, internal margin
  InvoicePayCard.vue        stock note + Mark as paid
  InvoiceCustomerCard.vue   bill-to select, contact/level/outstanding strip
  InvoiceItemsCard.vue      line table, level/why/hint, price edit + reset, below-cost
  InvoiceProductDrawer.vue  the "Add products" drawer
utils/adminInvoiceEdit.js        pure pricing + totals + checklist (+ spec)
utils/adminInvoiceMock.js        the 8 customers and 17 variants from the mockup
utils/adminInvoiceText.js        EN/TH copy (+ key-parity spec)
composables/useInvoiceCustomers.js, useInvoiceCatalog.js   return {items, isPlaceholder}
composables/useInvoices.js       now fetches GET /invoices
```

**Wiring.** `AdminInvoicesPage` enables **New invoice** (opens the panel) and makes each row
open its invoice (drafts editable; sent/paid/void read-only, with Mark as paid on sent).
`useInvoices` loads from the Worker and sets `isPlaceholder = false`, which removes the
"preview data" banner; the SAMPLE rows in `adminInvoices.js` are removed. List mapping:
`amount = total`, `issuedAt/dueAt` from the two dates, status `overdue` derived. A **Void**
chip is added (voided invoices must stay findable). `api.js` gets
`listInvoices / getInvoice / saveInvoice / sendInvoice / payInvoice / voidInvoice`, with 401
handled like the inventory calls.

**Level numbering.** The mockup indexes levels from 0 (Retail = 0). The stored
`price_level` and `level_applied` are 1-based (L1 = Retail … L5 = Special B), matching
Part A's `price_1..5`; the mock customers are converted once, in `adminInvoiceMock.js`.

**Pricing rules (in `adminInvoiceEdit.js`, sharing `productPricing.js` helpers).** For a
line: `effective level = max(customer level, level the quantity unlocks)` using the fixed
20 / 50 rule above, then the lower-level fallback if that level has no price. Unit price is
`toPerPiece(box price at that level, pieces per box)` unless the staff member typed one
("Custom price"; the reset link returns to automatic). The "N more for <next level>" hint
counts pieces to the next of 20 / 50 and appears while not overridden. A quantity that is
not a whole number of boxes rounds up on blur with a note, like the website. Below-cost is
a warning on the line and a note in the checklist, never a block. Stock warnings use the
picker's stock in pieces. Status "Send" is disabled while the customer, items
or quantities/prices are invalid; the other checks are advisory.

**Mockup parts that depend on other screens.** "Browse customers" opens the Customers page in
a new tab. The mockup's "start from a customer page" hand-off (`localStorage` draft) is
replaced by an optional `customerRef` prop on the panel; nothing wires it yet.

## Testing

- **Worker** `test/invoices.spec.ts`: 401 without a session; create allocates sequential
  numbers across a year and restarts the sequence in a new year; client-sent totals are
  ignored; `PUT` only on drafts (409 on sent); soft-removed lines drop out of totals but stay
  in the table; `send` validation errors; **pay twice decrements stock once**; pay with a mock
  line (no `color_id`) changes no stock; stock can go negative and a movement is written;
  `void` allowed on draft/sent, refused on paid; the list's `overdue` filter and summary.
- **Frontend** `adminInvoiceEdit.spec.js`: level selection by quantity and customer level,
  override and reset, totals and margin, checklist states, and the owner's needle box
  (2000 / 1500 / 1200 / 1100 / 1000, 100 per box): a Retail customer ordering 100 pieces is
  priced at Wholesale, ฿12 per piece, total ฿1,200; typing 50 rounds up to 100; a
  product with no box size steps by 1. Text-key parity spec.
  The mapping in `useInvoices` is covered by extending `adminInvoices.spec.js`.
- **Manual:** local D1 + `wrangler dev` + Vite; create → send → pay through the panel with the
  seed script loaded; screenshots against the mockup at 1440 and 390 px.

## Rollout

Backup, migration 0024, Worker deploy, frontend deploy (same order as Part A). Part A's
migration 0023 must already be applied because `pay` references `product_colors` and
`stock_movements`.

## Out of scope

- Real customers table and real product picker (the swap points are the two composables).
- Preview & print (`InvoicePreview.dc.html`), PDF, emailing/LINE-sending an invoice.
- Reversing a paid invoice or partial payments.
- Linking an invoice to a website order.
- Payment recording beyond the status change (method, slip, reference).
