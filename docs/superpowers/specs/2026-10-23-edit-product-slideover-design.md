# Edit Product slide-over — Design

**Date:** 2026-10-23
**Status:** Implemented on branch `feat/edit-product-slideover` (uncommitted). Migration 0023 and the Worker (version 15c74435) are live as of 2026-10-23; the frontend is not yet deployed to Pages
**Part:** A of 2 (Part B: `2026-10-23-new-invoice-design.md`, built after this one)

## Problem

The owner redesigned the Edit Product screen (`ProductEdit.dc.html`, mockup folder
"Edit product (opens from Add Edit)-html"). It models a product as **sizes → colors**:
a size carries five price levels and an optional factory cost; a color carries a SKU, a
stock count and a Show toggle. The live admin form
(`frontend/kitweb/src/components/admin-product-form.vue`) and the database know none of
that. Today:

- `products` has **no stock column**, and `stock_history` (migration 0002) was never
  applied to production.
- The 84 live variants are single free-text labels (`4.5"`, `# 7`, `#200 1x4`) stored as
  `product_images` rows with `attribute_type = 'variant_link'`. Each row carries its own
  `price_1..5`. There is no size/color split.
- `product_variants` (28 rows) and `variant_colors` (0 rows) are an abandoned earlier
  attempt. Some rows contradict the live labels (DE014). They are not read by the
  storefront and this design leaves them alone.

## How pricing works (unchanged, and now explicit in the editor)

Products are sold **by the box**. The admin enters the five **box prices** and the
**pieces per box**; the website derives everything else. Example from the owner: a
needle box holds 100 pieces, box prices 2000 / 1500 / 1200 / 1100 / 1000.

| | L1 | L2 | L3 | L4 | L5 |
|---|---|---|---|---|---|
| Admin enters (per box) | 2000 | 1500 | 1200 | 1100 | 1000 |
| Website shows (per piece = box ÷ 100) | 20 | 15 | 12 | 11 | 10 |

This is exactly what the storefront already does: `price_N` is a box price,
`products.moq` is the box size, per-piece is `roundHalfUp(box ÷ box size, 2)`
(`utils/productPricing.js`, mirrored in the Worker), the product page shows
"MOQ: 100", and the order dialog and cart step quantity by whole boxes
(`stepQty`, `clampTypedQty`: 50, 1 or 2 are not selectable, a typed 50 rounds up to 100).
**No storefront code changes in this part.** Only L1–L3 are customer-facing (tier by total
pieces: ≥ 20 → L2, ≥ 50 → L3, falling back to a lower level when one is unset); L4/L5
stay staff-only.

## Decisions

| Question | Decision |
|---|---|
| Data model | **New additive tables** `product_sizes`, `product_colors`, `stock_movements`; the Worker **mirrors** them into the legacy fields the storefront reads, in the same D1 batch (owner's choice, 2026-10-23) |
| Price unit in the editor | **Per box**, the same unit the database and website already use. The mirror is therefore a straight copy: no conversion, no rounding drift |
| Pieces per box | One number per product, stored in the existing `products.moq` (the only box-size field the website reads). Shown as a main field in the Sizes card. Replaces the mockup's per-level MOQ row |
| Per-piece row | Read-only "Per piece ฿" row under the box prices, so the admin sees what the website will show |
| Price formula | Typing L5 fills L1–L4 as **×2, ×1.8, ×1.6, ×1.3** (200/180/160/130 %, owner-confirmed; the mockup's ×1.5 / ×1.1 are not used). Editable in "⚙ Price levels", remembered per browser |
| Quantity thresholds for levels | None stored. Quoting by quantity (Part B) reuses the website's fixed 20 / 50 rule so both always agree |
| Removing a size/color | **Archive** (`archived_at`), never DELETE. Matches the owner's rule that nothing leaves D1/R2 |
| "Save as draft" | Saves the product with `is_visible = 0`. "Update product" / "Add product" saves with the toggle as set |
| Panel | Right slide-over that covers the whole page (revised 2026-10-24; first built at `min(1180px, 96vw)` with a backdrop). The header starts with an "← Inventory" button, so there is no backdrop. Three columns from 1440px (status/categories sticky left, basic info + sizes in the middle, photos sticky right); from 900px two columns with the photos between basic info and sizes; below that one column |
| Copy/language | EN / ไทย via `useAdminLang` and a new text util, like the Inventory page; no `vue-i18n` keys |

## Data model

New migration `hidden-water-ed9d/migrations/0023_product_sizes_colors.sql`. Additive
only; applied with `wrangler d1 execute --remote --file` (never `migrations apply`; see
the deploy-workflow note). No `ON DELETE CASCADE` anywhere.

```sql
CREATE TABLE IF NOT EXISTS product_sizes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    label TEXT NOT NULL,              -- "25 g", '4.5"'
    label_th TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    box_cost REAL,                    -- factory cost per BOX, staff-only, optional
    price_1 REAL, price_2 REAL, price_3 REAL, price_4 REAL, price_5 REAL,  -- per BOX
    archived_at TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_sizes_label
    ON product_sizes(product_id, label) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS product_colors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    size_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    name_th TEXT,
    hex TEXT,                         -- swatch, "#c0392b"
    sku TEXT,
    stock INTEGER NOT NULL DEFAULT 0, -- in PIECES
    is_visible INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    archived_at TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (size_id) REFERENCES product_sizes(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_colors_sku
    ON product_colors(sku) WHERE sku IS NOT NULL AND archived_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_colors_name
    ON product_colors(size_id, name) WHERE archived_at IS NULL;

-- Every stock change, by hand or by an invoice. Replaces the never-applied stock_history.
CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    color_id INTEGER NOT NULL,
    change_amount INTEGER NOT NULL,   -- signed, pieces
    new_stock INTEGER NOT NULL,
    reason TEXT NOT NULL,             -- INITIAL | MANUAL_EDIT | INVOICE_PAID
    ref TEXT,                         -- invoice number for INVOICE_PAID
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (color_id) REFERENCES product_colors(id)
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_color ON stock_movements(color_id);
```

`schema.sql` and `test/helpers/db.ts` get the same DDL.

## Opening an existing product (legacy import, client side)

A product with no `product_sizes` rows is converted in the editor, in memory. Nothing is
written until the owner saves. Prices are copied as they are; nothing is divided.

- One **size per distinct variant label** among the product's `variant_link` images.
  Prices: that row's `price_1..5` when it sets any of L1–L3 (same rule as
  `variantsForCart`), else the product's base prices. Rows sharing a label (TO013 has two)
  become one size with several images.
- No variant images: one size labelled "Standard" from the base prices.
- Each imported size gets one color, "Standard" (stock 0, no hex, SKU auto).
- Pieces per box is read from the product's existing `moq` text.
- Variant rows with an empty label cannot be attributed to a size. They are carried
  through unchanged, so the mirror never rewrites them.
- A product that *does* have `product_sizes` rows loads them from
  `GET /products/:id/inventory` instead.

## Mirror rules (Worker, on save)

Runs inside the same `env.DB.batch` as the size/color upserts.

1. **Base prices.** `products.price_1..5` = the **first size's** box prices (lowest
   `sort_order`). Levels the size leaves blank write `0`, as the current save does.
   `products.price` (legacy) is written as today: `price_3 || price`.
2. **Variant rows.** For each image attributed to a specific size, the saved
   `product_images` row is `attribute_type = 'variant_link'`,
   `attribute_value = "<color> / <size>"` (or just `<size>` when the color is "all"), and
   `price_1..5` = that size's box prices. Images attributed to *all sizes* write
   `attribute_value = <color>` (or none) with `NULL` prices, so the storefront falls back to
   the base prices. Images attributed to nothing, or to a hidden color, are written as
   `attribute_type = 'gallery'`. Consequence: hiding a color moves its photos to the gallery,
   and showing it again does not bring the attribution back (the database keeps no
   size/color link for images), so the owner re-assigns those photos. The color row says so.
3. **Box size.** `products.moq` is written from the "Pieces per box" field. If the number
   is unchanged the original text (`"20"`, `"20 pcs"`) is kept byte for byte; if the owner
   changed it, `"<n> pcs"` is written. A blank field writes `NULL`; blank and 1 both mean
   "no box grouping" to the website (`parseMoq` falls back to 1).
4. **Untouched columns.** `products.sizes`, `colors` and `varieties` are not rewritten.
5. **Consequence worth knowing.** A size or color with no photo is invoiceable but not
   orderable on the website, exactly as variants are today. The status checklist shows this
   as a hint, not an error.
6. **One box size per product**, because the website has one `moq` per product. If sizes
   really differ in box count they need to be separate products (same as today).

## API (Worker)

All admin-only (`isAdminRequest`), CORS via the existing `corsResponse`.

- `GET /products/:id/inventory` → `{ sizes: [{ id, label, label_th, sort_order, box_cost,
  prices: [5], colors: [{ id, name, name_th, hex, sku, stock, is_visible, sort_order }] }] }`,
  archived rows omitted; `{ sizes: [] }` if never saved.
- `POST /products` and `PUT /products/:id` accept an optional `inventory: { sizes }`
  block (the product's `moq` already travels in the existing payload). Without it they
  behave exactly as today. With it, sizes and colors are upserted by id, resolved for new
  rows by `(product_id, label)` and `(size_id, name)` inside the batch, and the mirror rules
  run. Sizes/colors present in the DB but absent from the payload are archived, not
  deleted. Each size and color carries a client `ref` (unique within the request). Each image
  carries `size_ref` (null = all sizes) and `color_name` (null = all colors); the Worker
  resolves them to the label it writes. An image of a legacy variant whose label cannot be
  matched to a size is sent as `passthrough: true` with its original `attribute_type`,
  `attribute_value` and `price_1..5`, and is written back unchanged. `inventory.base_prices`
  (optional, five numbers) overrides "first size's prices" for the product-level base prices;
  the editor sends it for a legacy product with variants until the owner edits the first
  size's prices, so an untouched save never moves the base prices the storefront falls back to.
- **Stock is sent with its loaded value**: each color sends `stock` and `stock_loaded`. The
  Worker computes `delta = stock − stock_loaded`, runs `UPDATE … SET stock = stock + delta`,
  and writes a `MANUAL_EDIT` movement (`INITIAL` for new colors) when the delta is not zero.
  A sale that lands between "open editor" and "save" is therefore not overwritten.
- Validation → 400: label required and ≤ 60 chars; ≥ 1 size and ≥ 1 color per size; ≤ 30 sizes,
  ≤ 40 colors per size and ≤ 200 colors per product;
  prices and box cost finite and ≥ 0; pieces per box an integer ≥ 1 when given; stock an
  integer. SKU already used → **409** naming the SKU; the batch rolls back.

## Frontend

The panel keeps `AdminInventoryPage`'s contract (`open`, `product`, `categories`; emits
`close`, `saved`, `session-expired`) so the page needs no change beyond the import.

```
components/admin/product-edit/
  ProductEditPanel.vue      slide-over shell, load/save, dirty guard, footer
  ProductStatusCard.vue     completeness % + checklist (4 items from the mockup)
  ProductCategoriesCard.vue category chips + SKU base (aside)
  ProductSwitch.vue         the on/off switch used for "Display on website" and colors' Show
  ProductBasicInfo.vue      names EN/TH, description, attribute, usage (EN/TH toggle)
  ProductImages.vue         grid, ★ Main, per-image size/color attribution, drop zone
  ProductSizesPricing.vue   size cards, level grid, colors table, ⚙ Price levels
utils/adminProductEdit.js   pure logic (below) + adminProductEdit.spec.js
utils/adminProductEditText.js   EN/TH copy (+ key-parity spec, like adminMockText)
```

`admin-product-form.vue` is removed once the panel replaces it (git keeps the history).

### Mockup → implementation

| Mockup element | Implementation |
|---|---|
| Sidebar: Product status (progress bar + 4 checks) | Computed: name+description, main image, all five box prices and pieces per box filled, stock+SKU on every color |
| Display on website switch | `is_visible` |
| Categories & SKU: chips (first = brown, generates SKU), "+ Add category", SKU base | Chips + select over the existing `categories` prop. New product: SKU fetched from `/products/next-sku` when the first category is chosen, editable. Existing product: read-only |
| Basic info: name, description, attribute, usage | As mockup, plus Thai name and the EN/TH toggle (below) |
| Images: ★ Main, "All sizes · Red" caption, dashed Add box | One grid. ★ Main is `products.image_key`. Caption is a size select + color select. Upload uses the existing `processProductImage` → `api.uploadImage`; a large preview opens on click as today |
| Sizes, colors & pricing: ⚙ Price levels, + Add size | As mockup |
| Size header: Size/pack, Factory cost, margin, Total stock | Factory cost is per box. Margin = `(L5 − cost) ÷ L5`, hidden without a cost. Total stock = sum of the size's colors (pieces); the card also shows the product total |
| Level grid: L1–L5 names, multipliers, price row | Names: Retail, Small wholesale, Wholesale, Special A, Special B. Sub-labels ×2 / ×1.8 / ×1.6 / ×1.3 / "start here". The price row is **Price ฿ per box**; typing L5 fills L1–L4 (grey "auto" cells); typing in an auto cell makes it manual |
| *(mockup MOQ row)* | Replaced by a read-only **Per piece ฿** row (box ÷ pieces per box, 2 dp) |
| ⚙ Price levels | Opens the existing formula dialog, restyled; default 200 / 180 / 160 / 130 |
| Colors table: swatch, SKU, Stock, Show | Add/edit/archive colors. Default SKU `<product SKU>-<SIZE>-<COL>` (`NE004-25G-RED`), editable. Stock column is in pieces |
| Footer: Cancel · Save as draft · Update product | As mockup; "Add product" for new products. Closing with unsaved edits asks first |

### Features the mockup lacks, and where they go

- **Pieces per box:** a labelled field at the top of the Sizes card ("Pieces per box —
  customers can only order whole boxes"), with the example "100 → website shows ฿20 per
  piece" computed live from L1.
- **Thai content:** a Thai name input beside the English name; one EN | ไทย toggle on the
  Basic info card switches description, attribute and usage text, as the current form does.
- **Usage:** the mockup's free textarea becomes today's picker (12 usage types, each with an
  example text) in the same slot, because the storefront reads `usage` as
  `[{type, example}]` JSON.
- **Archive:** an Archive button in the footer for existing products. The panel emits
  `archive`; the Inventory page closes the panel and runs its existing typed-confirmation,
  Undo-able archive flow. Restore stays where it is (the Archived view); the panel never opens
  an archived product.
- **Errors and success:** `alert()` is replaced by the `adm-toast` pattern; 401 still
  emits `session-expired`.

### Pure logic in `adminProductEdit.js`

`importLegacy(product)`, `recomputeAuto(size, multipliers)`, `marginPct(size)`,
`colorSku(productSku, sizeLabel, colorName)`, `completeness(draft)`,
`buildPayload(draft)` (including `size_ref`/`color_ref`, `moq` text handling and the stock
basis), `isDirty(draft, original)`. Per-piece maths reuses `toPerPiece` / `parseMoq` from
`productPricing.js` rather than a second copy. All unit-tested without the DOM.

## Testing

- **Frontend (vitest):** the functions above, including the owner's example: box prices
  2000 / 1500 / 1200 / 1100 / 1000 with 100 pieces per box show 20 / 15 / 12 / 11 / 10 per
  piece, the formula from L5 = 1000 gives 2000 / 1800 / 1600 / 1300, and the built payload
  carries the box prices unchanged and `moq` "100 pcs".
- **Worker (vitest-pool-workers):** `test/product-inventory.spec.ts` — 401 without a
  session; `GET /inventory` empty and populated; `PUT` with an inventory block creates
  sizes/colors and mirrors box prices into `products.price_N` and the variant rows; an
  untouched import re-saves identical values (including an unchanged `moq` string); stock
  delta is not clobbered by a concurrent change; SKU clash → 409 and nothing written;
  removed size/color is archived, never deleted; a `PUT` without `inventory` behaves as
  before; per-piece price read through the existing Worker `perPiecePrice` equals the
  editor's "Per piece" figure.
- **Manual (per the local-testing recipe in memory):** local D1 from a prod export,
  `wrangler dev`, Vite with `VITE_API_URL`; open an old product, save untouched, confirm
  the storefront price range from `getPriceRange` is unchanged; on a 100-per-box product
  confirm the product page, order dialog and cart step by 100; Playwright screenshots
  against the mockup at 1440 and 390 px.

## Rollout

Backup (`wrangler d1 export product-db --remote`), then migration 0023
(`d1 execute --file`), Worker deploy, frontend build + Pages deploy. Worker before
frontend, migration before Worker. (The wrangler login must be refreshed first; the
remote token had expired when this was written.)

## Out of scope

- The storefront reading the new tables (it keeps reading the mirrored legacy fields).
- Showing L4/L5 on the website (they stay staff-only) and any change to its 20 / 50
  quantity tiers.
- Different box sizes per size within one product (the website supports one `moq` per
  product).
- Showing real stock on the Inventory list (its stock filters and badges stay as they are;
  the `GET /products` payload is not changed).
- A restore UI for archived sizes/colors (rows are kept; restore is a database action for
  now).

## Risks

- `PUT /products/:id` still replaces a product's `product_images` rows on every save
  (existing behaviour; R2 files are untouched). Left as is.
- The new foreign keys mean the old hard-delete route `DELETE /products/:id` now fails for
  any product that has sizes (a safe side effect, since the owner's rule is that nothing is
  removed). Products without sizes can still be hard-deleted by that route, as before.
- Mirror drift is the main hazard. It is now a plain copy of box prices, covered by the
  Worker tests above and the untouched-save manual check, and it lives in one function.
