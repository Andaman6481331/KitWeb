# Edit Product Slide-over (Part A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old add/edit product panel with the owner's redesigned Edit Product slide-over (sizes → colors, five box-price levels, pieces per box, stock, SKU), backed by new D1 tables that the Worker mirrors into the legacy fields the storefront reads.

**Architecture:** Three additive D1 tables (`product_sizes`, `product_colors`, `stock_movements`). The Worker gains one self-contained module (`src/product-inventory.ts`) that validates the editor's `inventory` block, upserts sizes/colors/stock, archives anything removed, and mirrors box prices and image labels into `products.price_1..5` and `product_images` `variant_link` rows inside one `env.DB.batch`. The Vue side is a new panel (`components/admin/product-edit/*`) over a pure-logic util (`utils/adminProductEdit.js`) that owns import-from-legacy, formula, payload building and dirty checking.

**Tech Stack:** Cloudflare Worker (TypeScript) + D1, vitest with `@cloudflare/vitest-pool-workers`; Vue 3 `<script setup>` + vitest (`environment: 'node'`, specs are `src/**/*.spec.js`); `adm-*` design tokens in `assets/admin-ui.css`.

**Spec:** `docs/superpowers/specs/2026-10-23-edit-product-slideover-design.md` (Task 0 amends it first; read both).

**Execution status (2026-10-23):** Tasks 0-12 are done and verified locally: Worker suite 248 tests, frontend suite 290 tests, and a scripted browser run of 43 checks against a local Worker and throwaway D1 (the script lives outside the repo). Task 13 was run on 2026-10-23 after the owner's go-ahead, steps 1-3 only: backup `C:\Users\herby\product-db-pre-0023.sql` (145 products / 822 images / 28 orders), migration 0023 applied, Worker deployed as version 15c74435 (previous version 15157d9b). Step 4 (frontend to Pages) has **not** been run. After the first browser run, three cosmetic fixes were made that the plan text does not show: the header shows "Standard Inventory / Edit product" once, the SKU column is wider, and the size header fits on one row.

## Global Constraints

- **Nothing is ever deleted** from D1 or R2 by this feature: removed sizes/colors get `archived_at`; no `ON DELETE CASCADE`; no R2 calls.
- **Box prices, not per-piece prices, are what the editor and the database hold.** `products.moq` is the box size ("pieces per box"). Per piece = `toPerPiece(boxPrice, piecesPerBox)` (round half up, 2 dp). The mirror into `products.price_N` and variant rows is a plain copy. No storefront (public) code changes in this part.
- **Price formula:** typing L5 fills L1–L4 as **200 / 180 / 160 / 130 %** of L5 (×2, ×1.8, ×1.6, ×1.3). Levels are named Retail, Small wholesale, Wholesale, Special A, Special B. Stored levels are 1-based in the database, 0-based in JS arrays.
- **moq text:** unchanged number → keep the original text byte for byte; changed → `"<n> pcs"`; blank → `NULL`.
- **Validation (Worker, 400 unless noted):** size label required and ≤ 60 chars; ≤ 30 sizes; ≤ 40 colors per size and ≤ 200 per product; ≥ 1 size and ≥ 1 color per size; prices and factory cost finite and ≥ 0; stock an integer; SKU already used by another color → **409** naming the SKU.
- **Migrations are applied by hand** with `wrangler d1 execute --file`, never `migrations apply` (duplicate numeric prefixes exist). Production is **not touched** by this plan until the owner says go (Task 13).
- **Copy:** EN / ไทย through `useAdminLang` and a text util with a key-parity spec; no `vue-i18n` keys. No `alert()`; use the `adm-toast` pattern.
- **Frontend conventions:** `adm-*` tokens (`--adm-*`, defined on `.adm-shell`); utils are plain `.js` with `.spec.js` beside them; the panel keeps `AdminInventoryPage`'s contract (`open`, `product`, `categories`; emits `close`, `saved`, `session-expired`) plus a new `archive` event.
- **Commits:** the repo is on `main` and the owner has not asked for commits. Do **not** commit or push; every task ends with a test checkpoint instead. (If the owner later asks, one commit per task works.)
- **Worker tests need a Cloudflare login** because `wrangler.jsonc` has an `ai` binding. Until `wrangler login` is refreshed, run them with the untracked local config: `npx vitest run --config vitest.local.config.mts` from `hidden-water-ed9d/` (both `wrangler.localtest.jsonc` and `vitest.local.config.mts` already exist there and are listed in `.git/info/exclude`). Baselines on 2026-10-23: Worker 14 files / 185 tests; frontend 16 files / 212 tests, all passing.

---

## File Structure

**Worker (`hidden-water-ed9d/`)**

| File | Action | Responsibility |
|---|---|---|
| `migrations/0023_product_sizes_colors.sql` | create | The three tables and indexes |
| `schema.sql` | modify | Same DDL appended (the file is a reference copy) |
| `test/helpers/db.ts` | modify | Test DDL for the new tables + missing `products` columns |
| `src/product-inventory.ts` | create | Validation, mirror rules, statement building, read model, `InventoryError` |
| `src/index.ts` | modify | `GET /products/:id/inventory`; `inventory` block in `POST /products` and `PUT /products/:id`; `InventoryError` → HTTP |
| `test/product-inventory-logic.spec.ts` | create | Pure-function tests |
| `test/product-inventory.spec.ts` | create | HTTP + D1 tests |

**Frontend (`frontend/kitweb/src/`)**

| File | Action | Responsibility |
|---|---|---|
| `utils/adminProductEdit.js` + `.spec.js` | create | All pure logic: formula, moq, per piece, SKU, legacy import, draft, payload, completeness, dirty |
| `utils/adminProductEditText.js` + `.spec.js` | create | EN/ไทย copy + parity spec |
| `utils/adminInventoryText.js` | modify | `toastSaved` (EN + TH) |
| `services/api.js` | modify | `getProductInventory(id)` |
| `assets/admin-product-edit.css` | create | `.pe-*` styles for the panel |
| `components/admin/product-edit/ProductSwitch.vue` | create | Reusable on/off switch |
| `components/admin/product-edit/ProductStatusCard.vue` | create | Completeness bar + checklist |
| `components/admin/product-edit/ProductCategoriesCard.vue` | create | Category chips + SKU base |
| `components/admin/product-edit/ProductBasicInfo.vue` | create | Names, description, attribute, usage picker, EN/ไทย toggle |
| `components/admin/product-edit/ProductImages.vue` | create | Image grid, ★ Main, size/color attribution, drop zone |
| `components/admin/product-edit/ProductSizesPricing.vue` | create | Pieces per box, size cards, level grid, colors table, ⚙ Price levels |
| `components/admin/product-edit/ProductEditPanel.vue` | create | Slide-over shell: load/save, dirty guard, footer |
| `views/admin/AdminInventoryPage.vue` | modify | Use the new panel; handle `archive` and `saved` |
| `components/admin-product-form.vue` | delete | Replaced (git keeps the history) |

---

### Task 0: Amend the spec to match decisions made while planning

**Files:**
- Modify: `docs/superpowers/specs/2026-10-23-edit-product-slideover-design.md`

These are the places where planning against the real code changed or sharpened the spec. Fix the spec first so the plan and the spec agree.

- [ ] **Step 1: SKU uniqueness excludes archived colors** (otherwise re-adding a removed color with the same default SKU would clash with its archived row). In the migration block, replace

```
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_colors_sku
    ON product_colors(sku) WHERE sku IS NOT NULL;
```
with
```
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_colors_sku
    ON product_colors(sku) WHERE sku IS NOT NULL AND archived_at IS NULL;
```

- [ ] **Step 2: Validation line** — in the API section, replace `≤ 30 sizes and ≤ 40 colors per size;` with `≥ 1 size and ≥ 1 color per size; ≤ 30 sizes, ≤ 40 colors per size and ≤ 200 colors per product;`.

- [ ] **Step 3: Payload shape** — in the API section, replace the sentence `Images in the same request carry `size_ref` / `color_ref`.` with:

```
Each size and color carries a client `ref` (unique within the request). Each image carries
`size_ref` (null = all sizes) and `color_name` (null = all colors); the Worker resolves them
to the label it writes. An image of a legacy variant whose label cannot be matched to a size
is sent as `passthrough: true` with its original `attribute_type`, `attribute_value` and
`price_1..5`, and is written back unchanged. `inventory.base_prices` (optional, five
numbers) overrides "first size's prices" for the product-level base prices; the editor sends
it for a legacy product with variants until the owner edits the first size's prices, so an
untouched save never moves the base prices the storefront falls back to.
```

- [ ] **Step 4: Hidden colors** — in "Mirror rules" rule 2, append: `Consequence: hiding a color moves its photos to the gallery; showing it again does not bring the attribution back (the database keeps no size/color link for images), so the owner re-assigns those photos. The color row says so.`

- [ ] **Step 5: Components list** — in the Frontend tree, add after `ProductStatusCard.vue`:

```
  ProductCategoriesCard.vue category chips + SKU base (aside)
  ProductSwitch.vue         the on/off switch used for "Display on website" and colors' Show
```

- [ ] **Step 6: Archive wiring** — in "Features the mockup lacks", replace the Archive / Restore bullet with: `**Archive:** an Archive button in the footer for existing products. The panel emits `archive`; the Inventory page closes the panel and runs its existing typed-confirmation, Undo-able archive flow. Restore stays where it is (the Archived view); the panel never opens an archived product.`

- [ ] **Step 7: Verify** — run `grep -n "archived_at IS NULL;" docs/superpowers/specs/2026-10-23-edit-product-slideover-design.md` from the repo root; expected: the SKU index line is among the matches.

**Checkpoint:** spec edited; no tests involved.

---

### Task 1: Migration 0023, reference schema, test DDL

**Files:**
- Create: `hidden-water-ed9d/migrations/0023_product_sizes_colors.sql`
- Modify: `hidden-water-ed9d/schema.sql` (append)
- Modify: `hidden-water-ed9d/test/helpers/db.ts`

**Interfaces:**
- Produces: tables `product_sizes`, `product_colors`, `stock_movements` (columns exactly as below), available in every Worker test via `resetDb()`; plus the `products` columns `description_th`, `usage_th`, `attribute`, `attribute_th`, `slug` that `POST`/`PUT /products` already write and the test DDL lacked.

- [ ] **Step 1: Create the migration**

```sql
-- Sizes, colors and stock for the admin product editor. Additive only: no column the
-- storefront reads changes, nothing is deleted (removed sizes and colors are archived),
-- and there is no ON DELETE CASCADE. Apply with `wrangler d1 execute --remote --file`,
-- never `migrations apply` (see the deploy-workflow note).

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

- [ ] **Step 2: Append the same DDL (without the header comment) to `schema.sql`** after the `admin_sessions` block, preceded by the line `-- Sizes, colors and stock (migration 0023)`.

- [ ] **Step 3: Update `test/helpers/db.ts`.** In the `products` DDL, replace

```ts
		name_th TEXT, sku TEXT UNIQUE, moq TEXT,
		is_visible INTEGER DEFAULT 1,
		archived_at TEXT,
```
with
```ts
		name_th TEXT, sku TEXT UNIQUE, moq TEXT,
		description_th TEXT, usage_th TEXT, attribute TEXT, attribute_th TEXT, slug TEXT,
		is_visible INTEGER DEFAULT 1,
		archived_at TEXT,
```

Add these three entries to the end of the `DDL` array (after the `order_items` statement; add a comma after it):

```ts
	`CREATE TABLE IF NOT EXISTS product_sizes (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		product_id INTEGER NOT NULL, label TEXT NOT NULL, label_th TEXT,
		sort_order INTEGER NOT NULL DEFAULT 0, box_cost REAL,
		price_1 REAL, price_2 REAL, price_3 REAL, price_4 REAL, price_5 REAL,
		archived_at TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (product_id) REFERENCES products(id)
	)`,
	`CREATE UNIQUE INDEX IF NOT EXISTS idx_product_sizes_label
		ON product_sizes(product_id, label) WHERE archived_at IS NULL`,
	`CREATE TABLE IF NOT EXISTS product_colors (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		size_id INTEGER NOT NULL, name TEXT NOT NULL, name_th TEXT, hex TEXT, sku TEXT,
		stock INTEGER NOT NULL DEFAULT 0, is_visible INTEGER NOT NULL DEFAULT 1,
		sort_order INTEGER NOT NULL DEFAULT 0,
		archived_at TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (size_id) REFERENCES product_sizes(id)
	)`,
	`CREATE UNIQUE INDEX IF NOT EXISTS idx_product_colors_sku
		ON product_colors(sku) WHERE sku IS NOT NULL AND archived_at IS NULL`,
	`CREATE UNIQUE INDEX IF NOT EXISTS idx_product_colors_name
		ON product_colors(size_id, name) WHERE archived_at IS NULL`,
	`CREATE TABLE IF NOT EXISTS stock_movements (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		color_id INTEGER NOT NULL, change_amount INTEGER NOT NULL, new_stock INTEGER NOT NULL,
		reason TEXT NOT NULL, ref TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (color_id) REFERENCES product_colors(id)
	)`
```

and in `TABLES`, put the three new tables first so children drop before `products`:

```ts
const TABLES = [
	"stock_movements", "product_colors", "product_sizes",
	"order_items", "orders", "diy_products",
	"product_set_items", "product_sets", "product_variants", "product_images",
	"product_categories", "categories", "products", "admin_sessions"
];
```

- [ ] **Step 4: Run the existing Worker suite to prove the DDL change broke nothing**

Run (from `hidden-water-ed9d/`): `npx vitest run --config vitest.local.config.mts`
Expected: `Test Files 14 passed (14)`, `Tests 185 passed (185)`.

- [ ] **Step 5: Prove the migration file is valid SQL against a throwaway local D1**

Run (from `hidden-water-ed9d/`):
```
npx wrangler d1 execute product-db --local --persist-to ../.tmp-d1-check --file migrations/0023_product_sizes_colors.sql
```
Expected: `3 commands executed successfully` style output (counts statements) and no error. Then delete the throwaway folder: `rm -rf ../.tmp-d1-check`. (This fails on `REFERENCES products(id)` only if the `products` table is required at creation; SQLite does not require it, so it passes.)

**Checkpoint:** Worker suite 185/185 green; migration parses.

---

### Task 2: Worker module — validation and mirror rules (pure functions)

**Files:**
- Create: `hidden-water-ed9d/src/product-inventory.ts`
- Create: `hidden-water-ed9d/test/product-inventory-logic.spec.ts`

**Interfaces:**
- Produces (all exported from `src/product-inventory.ts`):
  - types `ColorInput`, `SizeInput`, `InventoryInput`, `MirroredImage`, `Checked<T>`
  - `validateInventory(raw: unknown): Checked<InventoryInput>`
  - `mirrorBasePrices(inv: InventoryInput): number[]` (five numbers, blanks as 0)
  - `mirrorImages(inv: InventoryInput, images: unknown[]): Checked<MirroredImage[]>`
  - constants `MAX_SIZES = 30`, `MAX_COLORS_PER_SIZE = 40`, `MAX_COLORS_TOTAL = 200`
  - class `InventoryError extends Error { status: 400 | 409 }` (used in Task 3)

- [ ] **Step 1: Write the failing tests** — `hidden-water-ed9d/test/product-inventory-logic.spec.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
	validateInventory, mirrorBasePrices, mirrorImages,
	MAX_SIZES, MAX_COLORS_PER_SIZE, MAX_COLORS_TOTAL
} from "../src/product-inventory";

const color = (over: Record<string, any> = {}) => ({
	ref: "c1", id: null, name: "Standard", name_th: null, hex: null, sku: "TE001-100-STA",
	stock: 0, stock_loaded: 0, is_visible: true, sort_order: 0, ...over
});
const size = (over: Record<string, any> = {}) => ({
	ref: "s1", id: null, label: "100 pcs", label_th: null, sort_order: 0, box_cost: null,
	prices: [2000, 1500, 1200, 1100, 1000], colors: [color()], ...over
});

function ok(raw: unknown) {
	const r = validateInventory(raw);
	if (!r.ok) throw new Error(`expected valid, got: ${r.error}`);
	return r.value;
}

describe("validateInventory — accepts", () => {
	it("normalises a clean payload", () => {
		const v = ok({
			sizes: [size({ label: "  25 g  ", box_cost: "", prices: [100], colors: [color({ sku: " A-1 ", hex: "#C0392B" })] })]
		});
		expect(v.sizes[0].label).toBe("25 g");
		expect(v.sizes[0].box_cost).toBeNull();
		expect(v.sizes[0].prices).toEqual([100, null, null, null, null]);
		expect(v.sizes[0].colors[0]).toMatchObject({ sku: "A-1", hex: "#C0392B", stock: 0, is_visible: true });
		expect(v.base_prices).toBeNull();
	});

	it("keeps stock_loaded for existing colors and forces 0 for new ones", () => {
		const v = ok({
			sizes: [size({ id: 7, colors: [
				color({ id: 9, ref: "c9", stock: 120, stock_loaded: 100 }),
				color({ ref: "c10", name: "Red", sku: "R", stock: 5, stock_loaded: 99 })
			] })]
		});
		expect(v.sizes[0].colors[0].stock_loaded).toBe(100);
		expect(v.sizes[0].colors[1].stock_loaded).toBe(0);
	});

	it("reads base_prices when the editor sends them", () => {
		const v = ok({ sizes: [size()], base_prices: [800, 0, null, null, null] });
		expect(v.base_prices).toEqual([800, 0, null, null, null]);
	});
});

describe("validateInventory — rejects with 400", () => {
	const twoSizes = (over: Record<string, any>) => [
		size(), size({ ref: "s2", label: "200 pcs", colors: [color({ ref: "c2", sku: "TE001-200-STA" })], ...over })
	];
	const manySizes = (n: number) => Array.from({ length: n }, (_, i) => size({
		ref: `s${i}`, label: `L${i}`, colors: [color({ ref: `c${i}`, sku: `SKU-${i}` })]
	}));
	const manyColors = (n: number, prefix = "k") => Array.from({ length: n }, (_, i) => color({
		ref: `${prefix}${i}`, name: `Color ${i}`, sku: `${prefix}-${i}`
	}));

	it.each([
		["no body", undefined],
		["sizes not an array", { sizes: "x" }],
		["no sizes", { sizes: [] }],
		[`more than ${MAX_SIZES} sizes`, { sizes: manySizes(MAX_SIZES + 1) }],
		["blank size label", { sizes: [size({ label: "   " })] }],
		["size label over 60 characters", { sizes: [size({ label: "x".repeat(61) })] }],
		["duplicate size labels", { sizes: twoSizes({ label: "100 pcs" }) }],
		["reused ref", { sizes: twoSizes({ ref: "s1" }) }],
		["bad size id", { sizes: [size({ id: 0 })] }],
		["negative price", { sizes: [size({ prices: [-1, 0, 0, 0, 0] })] }],
		["non-numeric price", { sizes: [size({ prices: ["abc", 0, 0, 0, 0] })] }],
		["more than five prices", { sizes: [size({ prices: [1, 2, 3, 4, 5, 6] })] }],
		["negative factory cost", { sizes: [size({ box_cost: -5 })] }],
		["size without colors", { sizes: [size({ colors: [] })] }],
		[`more than ${MAX_COLORS_PER_SIZE} colors in a size`, { sizes: [size({ colors: manyColors(MAX_COLORS_PER_SIZE + 1) })] }],
		[`more than ${MAX_COLORS_TOTAL} colors in a product`, { sizes: Array.from({ length: 6 }, (_, i) =>
			size({ ref: `s${i}`, label: `L${i}`, colors: manyColors(MAX_COLORS_PER_SIZE, `p${i}`) })) }],
		["blank color name", { sizes: [size({ colors: [color({ name: " " })] })] }],
		["duplicate color names in a size", { sizes: [size({ colors: [color(), color({ ref: "c2", sku: "B" })] })] }],
		["malformed hex", { sizes: [size({ colors: [color({ hex: "red" })] })] }],
		["SKU over 64 characters", { sizes: [size({ colors: [color({ sku: "S".repeat(65) })] })] }],
		["fractional stock", { sizes: [size({ colors: [color({ stock: 1.5 })] })] }],
		["text stock", { sizes: [size({ colors: [color({ stock: "5" })] })] }],
		["existing color without stock_loaded", { sizes: [size({ id: 3, colors: [color({ id: 4, stock_loaded: undefined })] })] }],
		["bad base_prices", { sizes: [size()], base_prices: [1, 2, "x", 4, 5] }]
	])("%s", (_label, raw) => {
		const r = validateInventory(raw);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.status).toBe(400);
	});
});

describe("validateInventory — SKU clashes inside one payload are 409", () => {
	it("names the SKU", () => {
		const r = validateInventory({
			sizes: [size({ colors: [color(), color({ ref: "c2", name: "Red", sku: "TE001-100-STA" })] })]
		});
		expect(r.ok).toBe(false);
		if (!r.ok) {
			expect(r.status).toBe(409);
			expect(r.error).toContain("TE001-100-STA");
		}
	});
});

describe("mirrorBasePrices", () => {
	it("copies the first size's box prices, blanks as 0", () => {
		const inv = ok({ sizes: [size({ prices: [2000, null, 1200, null, null] })] });
		expect(mirrorBasePrices(inv)).toEqual([2000, 0, 1200, 0, 0]);
	});

	it("uses the size with the lowest sort_order, not the first listed", () => {
		const inv = ok({ sizes: [
			size({ sort_order: 1, prices: [9, 9, 9, 9, 9] }),
			size({ ref: "s2", label: "B", sort_order: 0, prices: [1, 2, 3, 4, 5], colors: [color({ ref: "c2", sku: "B" })] })
		] });
		expect(mirrorBasePrices(inv)).toEqual([1, 2, 3, 4, 5]);
	});

	it("lets base_prices win when present", () => {
		const inv = ok({ sizes: [size()], base_prices: [800, null, null, null, null] });
		expect(mirrorBasePrices(inv)).toEqual([800, 0, 0, 0, 0]);
	});
});

describe("mirrorImages", () => {
	const inv = ok({ sizes: [
		size({ ref: "s1", label: "25 g", prices: [100, 90, 80, 70, 60], colors: [
			color({ ref: "c1", name: "Red", sku: "A" }),
			color({ ref: "c2", name: "Blue", sku: "B", is_visible: false })
		] }),
		size({ ref: "s2", label: "50 g", prices: [200, 180, 160, 140, 120], colors: [
			color({ ref: "c3", name: "Red", sku: "C" }),
			color({ ref: "c4", name: "Blue", sku: "D", is_visible: false })
		] })
	] });
	const one = (img: Record<string, any>) => {
		const r = mirrorImages(inv, [{ image_key: "k", ...img }]);
		if (!r.ok) throw new Error(r.error);
		return r.value[0];
	};

	it("labels a size + color image '<color> / <size>' with that size's box prices", () => {
		expect(one({ size_ref: "s1", color_name: "Red" })).toMatchObject({
			attribute_type: "variant_link", attribute_value: "Red / 25 g", prices: [100, 90, 80, 70, 60]
		});
	});

	it("labels a size-only image with just the size", () => {
		expect(one({ size_ref: "s2" })).toMatchObject({
			attribute_type: "variant_link", attribute_value: "50 g", prices: [200, 180, 160, 140, 120]
		});
	});

	it("labels an all-sizes color image with the color and no prices", () => {
		expect(one({ color_name: "Red" })).toMatchObject({
			attribute_type: "variant_link", attribute_value: "Red", prices: [null, null, null, null, null]
		});
	});

	it("writes an image that belongs to nothing as a gallery photo", () => {
		expect(one({})).toMatchObject({ attribute_type: "gallery", attribute_value: null, prices: [null, null, null, null, null] });
	});

	it("writes an image of a hidden color as a gallery photo", () => {
		expect(one({ size_ref: "s1", color_name: "Blue" })).toMatchObject({ attribute_type: "gallery", attribute_value: null });
		expect(one({ color_name: "Blue" })).toMatchObject({ attribute_type: "gallery" });
	});

	it("carries is_main through as 0 or 1", () => {
		expect(one({ is_main: true }).is_main).toBe(1);
		expect(one({}).is_main).toBe(0);
	});

	it("passes a legacy row through untouched", () => {
		expect(one({
			passthrough: true, attribute_type: "variant_link", attribute_value: "",
			price_1: 5, price_2: null, price_3: 0, price_4: undefined, price_5: "7"
		})).toMatchObject({
			attribute_type: "variant_link", attribute_value: "", prices: [5, null, 0, null, 7]
		});
	});

	it("fails on an unknown size or color", () => {
		expect(mirrorImages(inv, [{ image_key: "k", size_ref: "nope" }]).ok).toBe(false);
		expect(mirrorImages(inv, [{ image_key: "k", color_name: "Green" }]).ok).toBe(false);
		expect(mirrorImages(inv, [{ image_key: "k", size_ref: "s1", color_name: "Green" }]).ok).toBe(false);
	});

	it("skips an entry without an image key, like the existing save does", () => {
		const r = mirrorImages(inv, [{ image_key: "  " }, { size_ref: "s1" }, { image_key: "ok" }]);
		expect(r.ok && r.value.map((i) => i.image_key)).toEqual(["ok"]);
	});
});
```

- [ ] **Step 2: Run to verify it fails**

Run (from `hidden-water-ed9d/`): `npx vitest run --config vitest.local.config.mts test/product-inventory-logic.spec.ts`
Expected: FAIL — `Failed to resolve import "../src/product-inventory"`.

- [ ] **Step 3: Implement** — `hidden-water-ed9d/src/product-inventory.ts`:

```ts
// Sizes, colors and stock for the admin product editor.
//
// The editor models a product as sizes -> colors, but the storefront still reads the
// flat legacy fields (products.price_1..5 and the variant_link rows in product_images).
// Everything that turns the first shape into the second lives in this file, so there is
// one place to read when a price on the website looks wrong. Nothing here DELETEs a row:
// removed sizes and colors are archived (the owner's no-delete rule).

export const MAX_SIZES = 30;
export const MAX_COLORS_PER_SIZE = 40;
export const MAX_COLORS_TOTAL = 200;
const MAX_LABEL = 60;
const MAX_SKU = 64;
const LEVELS = 5;
// D1 allows at most 100 bound parameters per statement.
const IDS_PER_STATEMENT = 90;

export interface ColorInput {
	ref: string;
	id: number | null;
	name: string;
	name_th: string | null;
	hex: string | null;
	sku: string | null;
	stock: number;
	stock_loaded: number;
	is_visible: boolean;
	sort_order: number;
}

export interface SizeInput {
	ref: string;
	id: number | null;
	label: string;
	label_th: string | null;
	sort_order: number;
	box_cost: number | null;
	// Per BOX, level 1..5; null = not set.
	prices: (number | null)[];
	colors: ColorInput[];
}

export interface InventoryInput {
	sizes: SizeInput[];
	// Optional override for the product-level base prices (see mirrorBasePrices).
	base_prices: (number | null)[] | null;
}

export interface MirroredImage {
	image_key: string;
	is_main: 0 | 1;
	attribute_type: string | null;
	attribute_value: string | null;
	prices: (number | null)[];
}

export type Checked<T> = { ok: true; value: T } | { ok: false; status: 400 | 409; error: string };

/** A failure that should reach the caller as a plain 400/409 instead of a 500. */
export class InventoryError extends Error {
	status: 400 | 409;
	constructor(message: string, status: 400 | 409) {
		super(message);
		this.status = status;
	}
}

const fail = (error: string, status: 400 | 409 = 400): { ok: false; status: 400 | 409; error: string } =>
	({ ok: false, status, error });

const cleanText = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const nullableText = (v: unknown): string | null => cleanText(v) || null;

// null = blank, undefined = invalid. Accepts numbers and numeric strings; a price or cost
// is never negative.
function money(v: unknown): number | null | undefined {
	if (v === null || v === undefined || v === "") return null;
	const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
	return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function chunk<T>(items: T[], size = IDS_PER_STATEMENT): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
	return out;
}

const placeholders = (n: number) => new Array(n).fill("?").join(",");

function parsePrices(raw: unknown, what: string): { ok: true; value: (number | null)[] } | { ok: false; error: string } {
	const list = Array.isArray(raw) ? raw : [];
	if (list.length > LEVELS) return { ok: false, error: `${what} has more than ${LEVELS} prices` };
	const prices: (number | null)[] = [];
	for (let i = 0; i < LEVELS; i++) {
		const p = money(list[i]);
		if (p === undefined) return { ok: false, error: `${what}: level ${i + 1} must be a number of 0 or more` };
		prices.push(p);
	}
	return { ok: true, value: prices };
}

const optionalId = (v: unknown): number | null | undefined =>
	v === null || v === undefined ? null : Number.isInteger(v) && (v as number) > 0 ? (v as number) : undefined;

export function validateInventory(raw: unknown): Checked<InventoryInput> {
	const input = raw as any;
	if (!input || typeof input !== "object" || !Array.isArray(input.sizes)) return fail("inventory.sizes must be an array");
	if (input.sizes.length === 0) return fail("A product needs at least one size");
	if (input.sizes.length > MAX_SIZES) return fail(`A product can have at most ${MAX_SIZES} sizes`);

	const refs = new Set<string>();
	const labels = new Set<string>();
	const skus = new Set<string>();
	let colorTotal = 0;
	const sizes: SizeInput[] = [];

	for (let si = 0; si < input.sizes.length; si++) {
		const s = input.sizes[si];
		if (!s || typeof s !== "object") return fail("Each size must be an object");

		const ref = cleanText(s.ref);
		if (!ref || refs.has(ref)) return fail("Each size needs a unique ref");
		refs.add(ref);

		const label = cleanText(s.label);
		if (!label || label.length > MAX_LABEL) return fail(`A size label is required and can be at most ${MAX_LABEL} characters`);
		if (labels.has(label)) return fail(`Size "${label}" appears twice`);
		labels.add(label);

		const id = optionalId(s.id);
		if (id === undefined) return fail(`Size "${label}" has an invalid id`);

		const cost = money(s.box_cost);
		if (cost === undefined) return fail(`Factory cost of "${label}" must be a number of 0 or more`);

		const prices = parsePrices(s.prices, `Size "${label}"`);
		if (!prices.ok) return fail(prices.error);

		const rawColors = Array.isArray(s.colors) ? s.colors : [];
		if (rawColors.length === 0) return fail(`Size "${label}" needs at least one color`);
		if (rawColors.length > MAX_COLORS_PER_SIZE) return fail(`A size can have at most ${MAX_COLORS_PER_SIZE} colors`);
		colorTotal += rawColors.length;
		if (colorTotal > MAX_COLORS_TOTAL) return fail(`A product can have at most ${MAX_COLORS_TOTAL} colors`);

		const names = new Set<string>();
		const colors: ColorInput[] = [];
		for (let ci = 0; ci < rawColors.length; ci++) {
			const c = rawColors[ci];
			if (!c || typeof c !== "object") return fail("Each color must be an object");

			const cref = cleanText(c.ref);
			if (!cref || refs.has(cref)) return fail("Each color needs a unique ref");
			refs.add(cref);

			const name = cleanText(c.name);
			if (!name || name.length > MAX_LABEL) return fail(`A color name is required and can be at most ${MAX_LABEL} characters`);
			if (names.has(name)) return fail(`Color "${name}" appears twice in size "${label}"`);
			names.add(name);

			const cid = optionalId(c.id);
			if (cid === undefined) return fail(`Color "${name}" has an invalid id`);

			const hex = nullableText(c.hex);
			if (hex !== null && !/^#[0-9a-fA-F]{6}$/.test(hex)) return fail(`Color "${name}" has an invalid swatch color`);

			const sku = nullableText(c.sku);
			if (sku !== null) {
				if (sku.length > MAX_SKU) return fail(`SKU ${sku.slice(0, 20)}… is longer than ${MAX_SKU} characters`);
				if (skus.has(sku)) return fail(`SKU ${sku} is used twice in this product`, 409);
				skus.add(sku);
			}

			if (typeof c.stock !== "number" || !Number.isInteger(c.stock) || Math.abs(c.stock) > 1_000_000_000) {
				return fail(`Stock of "${name}" must be a whole number`);
			}
			let stockLoaded = 0;
			if (cid !== null) {
				if (typeof c.stock_loaded !== "number" || !Number.isInteger(c.stock_loaded)) {
					return fail(`Color "${name}" must say which stock it was edited from (stock_loaded)`);
				}
				stockLoaded = c.stock_loaded;
			}

			colors.push({
				ref: cref, id: cid, name, name_th: nullableText(c.name_th), hex, sku,
				stock: c.stock, stock_loaded: stockLoaded, is_visible: c.is_visible !== false,
				sort_order: Number.isInteger(c.sort_order) ? c.sort_order : ci
			});
		}

		sizes.push({
			ref, id, label, label_th: nullableText(s.label_th),
			sort_order: Number.isInteger(s.sort_order) ? s.sort_order : si,
			box_cost: cost, prices: prices.value, colors
		});
	}

	let basePrices: (number | null)[] | null = null;
	if (input.base_prices !== undefined && input.base_prices !== null) {
		const parsed = parsePrices(input.base_prices, "base_prices");
		if (!parsed.ok) return fail(parsed.error);
		basePrices = parsed.value;
	}

	return { ok: true, value: { sizes, base_prices: basePrices } };
}

/**
 * products.price_1..5 for the storefront: the first size's box prices (or the editor's
 * explicit base_prices), with blanks written as 0 exactly as the current save does.
 */
export function mirrorBasePrices(inv: InventoryInput): number[] {
	const first = [...inv.sizes].sort((a, b) => a.sort_order - b.sort_order)[0];
	return (inv.base_prices ?? first.prices).map((p) => p ?? 0);
}

const numberOrNull = (v: unknown): number | null => {
	if (v === null || v === undefined || v === "") return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
};

/**
 * product_images rows for the storefront. An image attributed to a size becomes a
 * variant_link row labelled "<color> / <size>" (or just "<size>") that carries the size's
 * box prices; an image attributed only to a color is labelled with the color and carries no
 * prices (so the base prices apply); everything else, including photos of a hidden color,
 * is a plain gallery photo. A legacy row the editor could not attribute is passed through.
 */
export function mirrorImages(inv: InventoryInput, images: unknown[]): Checked<MirroredImage[]> {
	const sizeByRef = new Map(inv.sizes.map((s) => [s.ref, s]));
	const out: MirroredImage[] = [];
	const noPrices = () => new Array<number | null>(LEVELS).fill(null);

	for (const raw of images) {
		const img = (raw ?? {}) as Record<string, unknown>;
		const key = typeof img.image_key === "string" ? img.image_key : "";
		if (!key.trim()) continue;
		const is_main: 0 | 1 = img.is_main ? 1 : 0;

		if (img.passthrough === true) {
			out.push({
				image_key: key, is_main,
				attribute_type: nullableText(img.attribute_type),
				attribute_value: typeof img.attribute_value === "string" ? img.attribute_value : null,
				prices: [1, 2, 3, 4, 5].map((n) => numberOrNull(img[`price_${n}`]))
			});
			continue;
		}

		const sizeRef = nullableText(img.size_ref);
		const colorName = nullableText(img.color_name);

		let size: SizeInput | null = null;
		if (sizeRef) {
			size = sizeByRef.get(sizeRef) ?? null;
			if (!size) return fail("An image points at a size that is not in this product");
		}

		let colorVisible = true;
		if (colorName) {
			const pool = size ? [size] : inv.sizes;
			const matches = pool.flatMap((s) => s.colors.filter((c) => c.name === colorName));
			if (matches.length === 0) return fail(`An image points at the color "${colorName}", which is not in this product`);
			// A color shown in at least one size keeps its photos on the website.
			colorVisible = matches.some((c) => c.is_visible);
		}

		if (!colorVisible || (!size && !colorName)) {
			out.push({ image_key: key, is_main, attribute_type: "gallery", attribute_value: null, prices: noPrices() });
		} else if (size) {
			out.push({
				image_key: key, is_main, attribute_type: "variant_link",
				attribute_value: colorName ? `${colorName} / ${size.label}` : size.label,
				prices: [...size.prices]
			});
		} else {
			out.push({ image_key: key, is_main, attribute_type: "variant_link", attribute_value: colorName, prices: noPrices() });
		}
	}

	return { ok: true, value: out };
}

// Database access, statement building and the read model are added in the next task.
export { chunk, placeholders };
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run --config vitest.local.config.mts test/product-inventory-logic.spec.ts`
Expected: PASS — all tests in the file green (about 45 including the `it.each` rows).

- [ ] **Step 5: Run the whole Worker suite**

Run: `npx vitest run --config vitest.local.config.mts`
Expected: `Test Files 15 passed (15)`; test count is 185 plus this file's.

**Checkpoint:** pure Worker logic done and tested; nothing wired to HTTP yet.

---

### Task 3: Worker — read model, statements, `GET /products/:id/inventory`, `PUT` with an inventory block

**Files:**
- Modify: `hidden-water-ed9d/src/product-inventory.ts` (append DB layer; remove the temporary export at the end)
- Modify: `hidden-water-ed9d/src/index.ts` (import; GET route; PUT handler; outer catch)
- Create: `hidden-water-ed9d/test/product-inventory.spec.ts`

**Interfaces:**
- Consumes (Task 2): `validateInventory`, `mirrorBasePrices`, `mirrorImages`, `InventoryError`, `Checked`, `InventoryInput`, `MirroredImage`, `chunk`, `placeholders`.
- Produces (exported from `src/product-inventory.ts`):
  - `interface ExistingInventory { sizeIds: Set<number>; colorSizes: Map<number, number> }`
  - `interface PreparedInventory { inventory: InventoryInput; existing: ExistingInventory; images: MirroredImage[] | null; basePrices: number[] }`
  - `loadExisting(db, productId): Promise<ExistingInventory>`
  - `prepareInventory(db, productId: number | null, rawInventory: unknown, rawImages: unknown): Promise<Checked<PreparedInventory>>` — does every check that can fail **before** the first write (validation, ownership, SKU clash, image resolution)
  - `inventoryStatements(db, productId, prepared): D1PreparedStatement[]`
  - `applyInventory(db, productId, prepared): Promise<void>` — runs the statements as one batch; maps unique-index failures to `InventoryError` (409)
  - `readInventory(db, productId)` → `{ sizes: [{ id, label, label_th, sort_order, box_cost, prices: (number|null)[5], colors: [{ id, name, name_th, hex, sku, stock, is_visible: boolean, sort_order }] }] }`
- HTTP: `GET /products/:id/inventory` (admin), `PUT /products/:id` accepts `inventory` (+ `images` with `size_ref`/`color_name`/`passthrough`).

- [ ] **Step 1: Write the failing tests** — `hidden-water-ed9d/test/product-inventory.spec.ts`:

```ts
import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { ADMIN_TEST_TOKEN, resetDb, seedProduct } from "./helpers/db";

const AUTH = { "Content-Type": "application/json", "Authorization": ADMIN_TEST_TOKEN };

const call = (method: string, path: string, body?: unknown, headers: Record<string, string> = AUTH) =>
	SELF.fetch(`https://example.com${path}`, {
		method, headers, body: body === undefined ? undefined : JSON.stringify(body)
	});

async function all(sql: string, ...binds: unknown[]): Promise<any[]> {
	return (await env.DB.prepare(sql).bind(...binds).all()).results as any[];
}
const productRow = async (id: number) => (await all("SELECT * FROM products WHERE id = ?", id))[0];
const inventoryOf = async (id: number) => (await (await call("GET", `/products/${id}/inventory`)).json()) as any;
const count = async (table: string) => (await all(`SELECT COUNT(*) AS n FROM ${table}`))[0].n as number;

const color = (over: Record<string, any> = {}) => ({
	ref: "c1", id: null, name: "Standard", name_th: null, hex: null, sku: "TE001-100-STA",
	stock: 0, stock_loaded: 0, is_visible: true, sort_order: 0, ...over
});
const size = (over: Record<string, any> = {}) => ({
	ref: "s1", id: null, label: "100 pcs", label_th: null, sort_order: 0, box_cost: null,
	prices: [2000, 1500, 1200, 1100, 1000], colors: [color()], ...over
});
const body = (over: Record<string, any> = {}) => ({
	name: "Needle", name_th: null, description: "A needle", category: "needles", categories: ["needles"],
	image_key: null, moq: "100 pcs", is_visible: true, images: [],
	inventory: { sizes: [size()], base_prices: null },
	...over
});
const put = (id: number, over: Record<string, any> = {}) => call("PUT", `/products/${id}`, body(over));

describe("GET /products/:id/inventory", () => {
	beforeEach(resetDb);

	it("needs an admin session", async () => {
		const id = await seedProduct();
		expect((await call("GET", `/products/${id}/inventory`, undefined, {})).status).toBe(401);
	});

	it("is empty for a product that has never been saved with sizes", async () => {
		const id = await seedProduct();
		expect(await inventoryOf(id)).toEqual({ sizes: [] });
	});
});

describe("PUT /products/:id with an inventory block", () => {
	beforeEach(resetDb);

	it("creates sizes and colors and mirrors the first size's box prices into the product", async () => {
		const id = await seedProduct({ sku: "TE001" });
		const res = await put(id);
		expect(res.status).toBe(200);

		const inv = await inventoryOf(id);
		expect(inv.sizes).toHaveLength(1);
		expect(inv.sizes[0]).toMatchObject({
			label: "100 pcs", box_cost: null, prices: [2000, 1500, 1200, 1100, 1000],
			colors: [{ name: "Standard", sku: "TE001-100-STA", stock: 0, is_visible: true }]
		});

		const p = await productRow(id);
		expect([p.price_1, p.price_2, p.price_3, p.price_4, p.price_5]).toEqual([2000, 1500, 1200, 1100, 1000]);
		expect(p.price).toBe(1200);
		expect(p.moq).toBe("100 pcs");
	});

	it("writes 0 for levels the size leaves blank, as the current save does", async () => {
		const id = await seedProduct();
		await put(id, { inventory: { sizes: [size({ prices: [2000, null, null, null, null] })] } });
		const p = await productRow(id);
		expect([p.price_1, p.price_2, p.price_3, p.price_4, p.price_5]).toEqual([2000, 0, 0, 0, 0]);
		expect((await inventoryOf(id)).sizes[0].prices).toEqual([2000, null, null, null, null]);
	});

	it("uses base_prices instead of the first size when the editor sends them", async () => {
		const id = await seedProduct();
		await put(id, { inventory: { sizes: [size({ prices: [900, 800, 700, 0, 0] })], base_prices: [800, 0, 0, 0, 0] } });
		const p = await productRow(id);
		expect([p.price_1, p.price_2, p.price_3]).toEqual([800, 0, 0]);
	});

	it("mirrors attributed images into variant rows with the right labels and prices", async () => {
		const id = await seedProduct();
		const inventory = { sizes: [
			size({ ref: "s1", label: "25 g", prices: [100, 90, 80, 70, 60], colors: [
				color({ ref: "c1", name: "Red", sku: "A" }),
				color({ ref: "c2", name: "Blue", sku: "B", is_visible: false })
			] }),
			size({ ref: "s2", label: "50 g", prices: [200, 180, 160, 140, 120], colors: [
				color({ ref: "c3", name: "Red", sku: "C" })
			] })
		] };
		const res = await put(id, { inventory, images: [
			{ image_key: "i1", size_ref: "s1", color_name: "Red" },
			{ image_key: "i2", size_ref: "s2", color_name: null },
			{ image_key: "i3", size_ref: null, color_name: "Red" },
			{ image_key: "i4", size_ref: null, color_name: null },
			{ image_key: "i5", size_ref: "s1", color_name: "Blue" },
			{ image_key: "i6", passthrough: true, attribute_type: "variant_link", attribute_value: "",
				price_1: 5, price_2: null, price_3: null, price_4: null, price_5: null },
			{ image_key: "i7", is_main: true }
		] });
		expect(res.status).toBe(200);

		const rows = await all(
			"SELECT image_key, attribute_type, attribute_value, is_main, price_1, price_2, price_5 FROM product_images WHERE product_id = ? ORDER BY id", id);
		expect(rows).toEqual([
			{ image_key: "i1", attribute_type: "variant_link", attribute_value: "Red / 25 g", is_main: 0, price_1: 100, price_2: 90, price_5: 60 },
			{ image_key: "i2", attribute_type: "variant_link", attribute_value: "50 g", is_main: 0, price_1: 200, price_2: 180, price_5: 120 },
			{ image_key: "i3", attribute_type: "variant_link", attribute_value: "Red", is_main: 0, price_1: null, price_2: null, price_5: null },
			{ image_key: "i4", attribute_type: "gallery", attribute_value: null, is_main: 0, price_1: null, price_2: null, price_5: null },
			{ image_key: "i5", attribute_type: "gallery", attribute_value: null, is_main: 0, price_1: null, price_2: null, price_5: null },
			{ image_key: "i6", attribute_type: "variant_link", attribute_value: "", is_main: 0, price_1: 5, price_2: null, price_5: null },
			{ image_key: "i7", attribute_type: "gallery", attribute_value: null, is_main: 1, price_1: null, price_2: null, price_5: null }
		]);
	});

	it("keeps the storefront's prices and the original moq text when an imported product is saved untouched", async () => {
		// A legacy product: base L1 800, moq "20", one variant with its own prices, one that inherits.
		const id = await seedProduct({ sku: "TE002", moq: "20", price_1: 800 });
		const addImage = (key: string, type: string, value: string, p1: number | null) =>
			env.DB.prepare(
				`INSERT INTO product_images (product_id, image_key, attribute_type, attribute_value, price_1)
				 VALUES (?, ?, ?, ?, ?)`).bind(id, key, type, value, p1).run();
		await addImage("v1", "variant_link", '4.5"', 900);
		await addImage("v2", "variant_link", "Plain", null);
		await addImage("g1", "gallery", "", null);

		// What the editor sends for an untouched import: one size per label (the inheriting
		// one gets a copy of the base prices), base_prices pinned to the old base, moq unchanged.
		const res = await put(id, {
			moq: "20",
			inventory: {
				sizes: [
					size({ ref: "s1", label: '4.5"', prices: [900, null, null, null, null], colors: [color({ ref: "c1", sku: "TE002-45-STA" })] }),
					size({ ref: "s2", label: "Plain", sort_order: 1, prices: [800, null, null, null, null], colors: [color({ ref: "c2", sku: "TE002-PLA-STA" })] })
				],
				base_prices: [800, 0, 0, 0, 0]
			},
			images: [
				{ image_key: "v1", size_ref: "s1", color_name: null },
				{ image_key: "v2", size_ref: "s2", color_name: null },
				{ image_key: "g1" }
			]
		});
		expect(res.status).toBe(200);

		const p = await productRow(id);
		expect(p.price_1).toBe(800);
		expect(p.moq).toBe("20");
		const rows = await all("SELECT image_key, attribute_type, attribute_value, price_1 FROM product_images WHERE product_id = ? ORDER BY id", id);
		expect(rows).toEqual([
			{ image_key: "v1", attribute_type: "variant_link", attribute_value: '4.5"', price_1: 900 },
			{ image_key: "v2", attribute_type: "variant_link", attribute_value: "Plain", price_1: 800 },
			{ image_key: "g1", attribute_type: "gallery", attribute_value: null, price_1: null }
		]);
	});

	it("applies a stock edit as a delta, so a sale made in the meantime is not overwritten", async () => {
		const id = await seedProduct({ sku: "TE001" });
		await put(id, { inventory: { sizes: [size({ colors: [color({ stock: 100, stock_loaded: 0 })] })] } });
		let inv = await inventoryOf(id);
		const colorId = inv.sizes[0].colors[0].id;
		expect(inv.sizes[0].colors[0].stock).toBe(100);
		expect(await all("SELECT change_amount, new_stock, reason FROM stock_movements WHERE color_id = ?", colorId))
			.toEqual([{ change_amount: 100, new_stock: 100, reason: "INITIAL" }]);

		// A sale lands while the editor is open (loaded 100, stock now 95)...
		await env.DB.prepare("UPDATE product_colors SET stock = stock - 5 WHERE id = ?").bind(colorId).run();
		// ...and the owner counts 120 against the 100 they saw.
		const sizeId = inv.sizes[0].id;
		const res = await put(id, { inventory: { sizes: [size({
			id: sizeId, colors: [color({ id: colorId, stock: 120, stock_loaded: 100 })]
		})] } });
		expect(res.status).toBe(200);

		inv = await inventoryOf(id);
		expect(inv.sizes[0].colors[0].stock).toBe(115);
		expect(await all("SELECT change_amount, new_stock, reason FROM stock_movements WHERE color_id = ? ORDER BY id", colorId)).toEqual([
			{ change_amount: 100, new_stock: 100, reason: "INITIAL" },
			{ change_amount: 20, new_stock: 115, reason: "MANUAL_EDIT" }
		]);

		// Saving again with nothing changed adds no movement.
		await put(id, { inventory: { sizes: [size({
			id: sizeId, colors: [color({ id: colorId, stock: 115, stock_loaded: 115 })]
		})] } });
		expect(await count("stock_movements")).toBe(2);
	});

	it("archives removed sizes and colors instead of deleting them", async () => {
		const id = await seedProduct({ sku: "TE001" });
		await put(id, { inventory: { sizes: [
			size({ ref: "s1", label: "25 g", colors: [
				color({ ref: "c1", name: "Red", sku: "A", stock: 10 }),
				color({ ref: "c2", name: "Blue", sku: "B" })
			] }),
			size({ ref: "s2", label: "50 g", sort_order: 1, colors: [color({ ref: "c3", name: "Red", sku: "C" })] })
		] } });
		const before = await inventoryOf(id);
		const s1 = before.sizes[0];
		const movementsBefore = await count("stock_movements");

		// Second save keeps only 25 g / Red.
		const res = await put(id, { inventory: { sizes: [
			size({ id: s1.id, ref: "s1", label: "25 g", colors: [
				color({ id: s1.colors[0].id, ref: "c1", name: "Red", sku: "A", stock: 10, stock_loaded: 10 })
			] })
		] } });
		expect(res.status).toBe(200);

		const after = await inventoryOf(id);
		expect(after.sizes).toHaveLength(1);
		expect(after.sizes[0].colors.map((c: any) => c.name)).toEqual(["Red"]);

		expect(await count("product_sizes")).toBe(2);
		expect(await count("product_colors")).toBe(3);
		const archived = await all("SELECT label FROM product_sizes WHERE archived_at IS NOT NULL");
		expect(archived).toEqual([{ label: "50 g" }]);
		expect((await all("SELECT COUNT(*) AS n FROM product_colors WHERE archived_at IS NOT NULL"))[0].n).toBe(2);
		expect(await count("stock_movements")).toBe(movementsBefore);
	});

	it("lets a removed color's SKU and name be used again", async () => {
		const id = await seedProduct({ sku: "TE001" });
		await put(id, { inventory: { sizes: [size({ colors: [color({ name: "Red", sku: "R-1" })] })] } });
		const inv = await inventoryOf(id);

		const res = await put(id, { inventory: { sizes: [size({
			id: inv.sizes[0].id, colors: [color({ ref: "c9", name: "Red", sku: "R-1" })]
		})] } });
		expect(res.status).toBe(200);
		expect(await count("product_colors")).toBe(2);
		expect((await inventoryOf(id)).sizes[0].colors).toHaveLength(1);
	});

	it("answers 409 naming the SKU when another product's color has it, and writes nothing", async () => {
		const a = await seedProduct({ sku: "TE001" });
		await put(a, { inventory: { sizes: [size({ colors: [color({ sku: "DUP-1" })] })] } });
		const b = await seedProduct({ sku: "TE002", name: "Other" });

		const res = await put(b, { name: "Renamed", inventory: { sizes: [size({ colors: [color({ sku: "DUP-1" })] })] } });
		expect(res.status).toBe(409);
		expect(((await res.json()) as any).error).toContain("DUP-1");

		expect((await productRow(b)).name).toBe("Other");
		expect((await inventoryOf(b)).sizes).toEqual([]);
	});

	it("rejects bad input with 400 and writes nothing", async () => {
		const id = await seedProduct({ name: "Original" });
		const bad: [string, any][] = [
			["no sizes", { sizes: [] }],
			["negative price", { sizes: [size({ prices: [-1, 0, 0, 0, 0] })] }],
			["fractional stock", { sizes: [size({ colors: [color({ stock: 1.5 })] })] }],
			["duplicate size labels", { sizes: [size(), size({ ref: "s2", colors: [color({ ref: "c2", sku: "Z" })] })] }]
		];
		for (const [label, inventory] of bad) {
			const res = await put(id, { name: "Changed", inventory });
			expect(res.status, label).toBe(400);
		}
		expect((await productRow(id)).name).toBe("Original");
		expect(await count("product_sizes")).toBe(0);
	});

	it("rejects a size or color id that belongs to another product", async () => {
		const a = await seedProduct({ sku: "TE001" });
		await put(a);
		const aInv = await inventoryOf(a);
		const b = await seedProduct({ sku: "TE002" });

		const stolenSize = await put(b, { inventory: { sizes: [size({ id: aInv.sizes[0].id, colors: [color({ sku: "X" })] })] } });
		expect(stolenSize.status).toBe(400);

		await put(b, { inventory: { sizes: [size({ colors: [color({ sku: "Y" })] })] } });
		const bInv = await inventoryOf(b);
		const stolenColor = await put(b, { inventory: { sizes: [size({
			id: bInv.sizes[0].id, colors: [color({ id: aInv.sizes[0].colors[0].id, stock_loaded: 0, sku: "Q" })]
		})] } });
		expect(stolenColor.status).toBe(400);
	});

	it("rejects an image that points at an unknown size", async () => {
		const id = await seedProduct({ name: "Original" });
		const res = await put(id, { name: "Changed", images: [{ image_key: "k", size_ref: "nope" }] });
		expect(res.status).toBe(400);
		expect((await productRow(id)).name).toBe("Original");
	});

	it("behaves exactly as before when no inventory block is sent", async () => {
		const id = await seedProduct();
		const res = await call("PUT", `/products/${id}`, {
			name: "Plain", description: "d", category: "needles", categories: ["needles"], moq: "10",
			price_1: 700, price_2: 600, price_3: 500, price_4: 0, price_5: 0, is_visible: true,
			images: [{ image_key: "g", attribute_type: "gallery", attribute_value: "" }]
		});
		expect(res.status).toBe(200);
		const p = await productRow(id);
		expect([p.price_1, p.price_2, p.price_3, p.moq]).toEqual([700, 600, 500, "10"]);
		expect(p.price).toBe(500);
		expect(await count("product_sizes")).toBe(0);
		expect(await count("product_images")).toBe(1);
	});
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run --config vitest.local.config.mts test/product-inventory.spec.ts`
Expected: FAIL — `GET /products/:id/inventory` returns 404, PUT ignores `inventory` (so assertions on sizes fail).

- [ ] **Step 3: Append the database layer to `src/product-inventory.ts`.** First delete the last two lines of the file (the comment `// Database access, statement building…` and `export { chunk, placeholders };`), then append:

```ts
// ── Database layer ──────────────────────────────────────────────────────────

export interface ExistingInventory {
	sizeIds: Set<number>;
	// color id -> the id of the size it currently belongs to
	colorSizes: Map<number, number>;
}

export interface PreparedInventory {
	inventory: InventoryInput;
	existing: ExistingInventory;
	// null = the request carried no images, so the product's images are left alone
	images: MirroredImage[] | null;
	basePrices: number[];
}

export async function loadExisting(db: D1Database, productId: number): Promise<ExistingInventory> {
	const [sizes, colors] = await db.batch([
		db.prepare("SELECT id FROM product_sizes WHERE product_id = ? AND archived_at IS NULL").bind(productId),
		db.prepare(
			`SELECT c.id, c.size_id FROM product_colors c
			 JOIN product_sizes s ON s.id = c.size_id
			 WHERE s.product_id = ? AND s.archived_at IS NULL AND c.archived_at IS NULL`
		).bind(productId)
	]);
	return {
		sizeIds: new Set((sizes.results as any[]).map((r) => r.id as number)),
		colorSizes: new Map((colors.results as any[]).map((r) => [r.id as number, r.size_id as number]))
	};
}

// A SKU may stay on the color that already has it, or move off a color this save archives;
// it may not take a SKU from a live color of any other product.
async function findSkuClash(db: D1Database, existing: ExistingInventory, inv: InventoryInput): Promise<string | null> {
	const skus = inv.sizes.flatMap((s) => s.colors.map((c) => c.sku)).filter((sku): sku is string => !!sku);
	for (const part of chunk(skus)) {
		const { results } = await db
			.prepare(`SELECT id, sku FROM product_colors WHERE archived_at IS NULL AND sku IN (${placeholders(part.length)})`)
			.bind(...part)
			.all<{ id: number; sku: string }>();
		const foreign = results.find((r) => !existing.colorSizes.has(r.id));
		if (foreign) return foreign.sku;
	}
	return null;
}

/**
 * Everything that can reject a request, done before the caller writes anything: shape,
 * ownership of the ids, SKU clashes, and resolving every image to its label. The caller
 * passes productId = null when the product does not exist yet.
 */
export async function prepareInventory(
	db: D1Database,
	productId: number | null,
	rawInventory: unknown,
	rawImages: unknown
): Promise<Checked<PreparedInventory>> {
	const checked = validateInventory(rawInventory);
	if (!checked.ok) return checked;
	const inventory = checked.value;

	const existing: ExistingInventory = productId === null
		? { sizeIds: new Set(), colorSizes: new Map() }
		: await loadExisting(db, productId);

	for (const s of inventory.sizes) {
		if (s.id !== null && !existing.sizeIds.has(s.id)) return fail(`Size "${s.label}" does not belong to this product`);
		for (const c of s.colors) {
			if (c.id !== null && (s.id === null || existing.colorSizes.get(c.id) !== s.id)) {
				return fail(`Color "${c.name}" does not belong to size "${s.label}"`);
			}
		}
	}

	const clash = await findSkuClash(db, existing, inventory);
	if (clash) return fail(`SKU ${clash} is already used by another color`, 409);

	let images: MirroredImage[] | null = null;
	if (Array.isArray(rawImages)) {
		const mirrored = mirrorImages(inventory, rawImages);
		if (!mirrored.ok) return mirrored;
		images = mirrored.value;
	}

	return { ok: true, value: { inventory, existing, images, basePrices: mirrorBasePrices(inventory) } };
}

/**
 * The writes for one save, in an order that lets a save reuse a label or SKU that a row
 * it removes was holding: archive first, then update, then insert. Run them with
 * applyInventory so they land as one atomic batch.
 */
export function inventoryStatements(db: D1Database, productId: number, prepared: PreparedInventory): D1PreparedStatement[] {
	const { inventory, existing, images } = prepared;
	const statements: D1PreparedStatement[] = [];

	const keepSizes = new Set(inventory.sizes.flatMap((s) => (s.id === null ? [] : [s.id])));
	const keepColors = new Set(inventory.sizes.flatMap((s) => s.colors.flatMap((c) => (c.id === null ? [] : [c.id]))));
	const dropColors = [...existing.colorSizes.keys()].filter((id) => !keepColors.has(id));
	const dropSizes = [...existing.sizeIds].filter((id) => !keepSizes.has(id));

	for (const part of chunk(dropColors)) {
		statements.push(db.prepare(
			`UPDATE product_colors SET archived_at = CURRENT_TIMESTAMP WHERE archived_at IS NULL AND id IN (${placeholders(part.length)})`
		).bind(...part));
	}
	for (const part of chunk(dropSizes)) {
		statements.push(db.prepare(
			`UPDATE product_sizes SET archived_at = CURRENT_TIMESTAMP WHERE archived_at IS NULL AND id IN (${placeholders(part.length)})`
		).bind(...part));
	}

	const updateSize = db.prepare(
		`UPDATE product_sizes SET label = ?, label_th = ?, sort_order = ?, box_cost = ?,
		 price_1 = ?, price_2 = ?, price_3 = ?, price_4 = ?, price_5 = ? WHERE id = ? AND product_id = ?`
	);
	const insertSize = db.prepare(
		`INSERT INTO product_sizes (product_id, label, label_th, sort_order, box_cost, price_1, price_2, price_3, price_4, price_5)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	);
	for (const s of inventory.sizes) {
		statements.push(s.id === null
			? insertSize.bind(productId, s.label, s.label_th, s.sort_order, s.box_cost, ...s.prices)
			: updateSize.bind(s.label, s.label_th, s.sort_order, s.box_cost, ...s.prices, s.id, productId));
	}

	const updateColor = db.prepare(
		`UPDATE product_colors SET name = ?, name_th = ?, hex = ?, sku = ?, is_visible = ?, sort_order = ?
		 WHERE id = ? AND size_id = ?`
	);
	const adjustStock = db.prepare("UPDATE product_colors SET stock = stock + ? WHERE id = ?");
	const logChange = db.prepare(
		`INSERT INTO stock_movements (color_id, change_amount, new_stock, reason)
		 SELECT id, ?, stock, ? FROM product_colors WHERE id = ?`
	);
	for (const s of inventory.sizes) {
		// A size added in this save has no id yet; find it by its (product, label) pair.
		const sizeIdSql = s.id === null
			? "(SELECT id FROM product_sizes WHERE product_id = ? AND label = ? AND archived_at IS NULL)"
			: "?";
		const sizeIdBind: unknown[] = s.id === null ? [productId, s.label] : [s.id];

		for (const c of s.colors) {
			if (c.id !== null) {
				statements.push(updateColor.bind(c.name, c.name_th, c.hex, c.sku, c.is_visible ? 1 : 0, c.sort_order, c.id, s.id));
				// Only the difference from what the editor loaded is applied, so a sale that
				// landed since then is kept.
				const delta = c.stock - c.stock_loaded;
				if (delta !== 0) {
					statements.push(adjustStock.bind(delta, c.id));
					statements.push(logChange.bind(delta, "MANUAL_EDIT", c.id));
				}
				continue;
			}
			statements.push(db.prepare(
				`INSERT INTO product_colors (size_id, name, name_th, hex, sku, stock, is_visible, sort_order)
				 VALUES (${sizeIdSql}, ?, ?, ?, ?, ?, ?, ?)`
			).bind(...sizeIdBind, c.name, c.name_th, c.hex, c.sku, c.stock, c.is_visible ? 1 : 0, c.sort_order));
			if (c.stock !== 0) {
				statements.push(db.prepare(
					`INSERT INTO stock_movements (color_id, change_amount, new_stock, reason)
					 SELECT id, stock, stock, 'INITIAL' FROM product_colors
					 WHERE size_id = ${sizeIdSql} AND name = ? AND archived_at IS NULL`
				).bind(...sizeIdBind, c.name));
			}
		}
	}

	if (images) {
		const insertImage = db.prepare(
			`INSERT INTO product_images (product_id, image_key, attribute_type, attribute_value, is_main,
			 price_1, price_2, price_3, price_4, price_5) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		);
		statements.push(db.prepare("DELETE FROM product_images WHERE product_id = ?").bind(productId));
		for (const img of images) {
			statements.push(insertImage.bind(
				productId, img.image_key, img.attribute_type, img.attribute_value, img.is_main, ...img.prices));
		}
	}

	return statements;
}

/** Runs one save as a single batch. A unique-index failure that slips past the pre-check (a race) becomes a 409. */
export async function applyInventory(db: D1Database, productId: number, prepared: PreparedInventory): Promise<void> {
	try {
		await db.batch(inventoryStatements(db, productId, prepared));
	} catch (e: any) {
		const message = String(e?.message || "");
		if (message.includes("product_colors.sku")) {
			throw new InventoryError("A color SKU is already used by another product", 409);
		}
		if (message.includes("product_sizes.product_id") || message.includes("product_colors.size_id")) {
			throw new InventoryError("Two sizes, or two colors of one size, have the same name", 409);
		}
		throw e;
	}
}

/** The sizes and colors behind the editor, archived rows left out. */
export async function readInventory(db: D1Database, productId: number) {
	const [sizes, colors] = await db.batch([
		db.prepare(
			`SELECT id, label, label_th, sort_order, box_cost, price_1, price_2, price_3, price_4, price_5
			 FROM product_sizes WHERE product_id = ? AND archived_at IS NULL ORDER BY sort_order, id`
		).bind(productId),
		db.prepare(
			`SELECT c.id, c.size_id, c.name, c.name_th, c.hex, c.sku, c.stock, c.is_visible, c.sort_order
			 FROM product_colors c JOIN product_sizes s ON s.id = c.size_id
			 WHERE s.product_id = ? AND s.archived_at IS NULL AND c.archived_at IS NULL
			 ORDER BY c.sort_order, c.id`
		).bind(productId)
	]);

	const bySize = new Map<number, any[]>();
	for (const c of colors.results as any[]) {
		const list = bySize.get(c.size_id) ?? [];
		list.push({
			id: c.id, name: c.name, name_th: c.name_th, hex: c.hex, sku: c.sku,
			stock: c.stock, is_visible: c.is_visible !== 0, sort_order: c.sort_order
		});
		bySize.set(c.size_id, list);
	}

	return {
		sizes: (sizes.results as any[]).map((s) => ({
			id: s.id, label: s.label, label_th: s.label_th, sort_order: s.sort_order, box_cost: s.box_cost,
			prices: [s.price_1, s.price_2, s.price_3, s.price_4, s.price_5],
			colors: bySize.get(s.id) ?? []
		}))
	};
}
```

- [ ] **Step 4: Wire the Worker.** In `hidden-water-ed9d/src/index.ts`:

(a) Add to the imports at the top (after the `order-view` import):

```ts
import { InventoryError, applyInventory, prepareInventory, readInventory } from "./product-inventory";
```

(b) Add the GET route immediately before the comment `// Bulk Hide/Show for the admin inventory page.` (it is in the protected section):

```ts
			// The sizes, colors and stock behind the admin product editor (product-inventory.ts).
			const inventoryMatch = url.pathname.match(/^\/products\/(\d+)\/inventory$/);
			if (inventoryMatch && request.method === "GET") {
				return corsResponse(await readInventory(env.DB, Number(inventoryMatch[1])));
			}

```

(c) In the `PUT /products/:id` handler, replace

```ts
				const categoryList = normalizeCategoryList(categories, category);
				const primaryCategory = categoryList[0] || category || null;
				const activePrice = price_3 || price || 0;

				if (!primaryCategory) {
					return corsResponse({ error: "At least one category is required" }, { status: 400 });
				}

				await env.DB.prepare(
					"UPDATE products SET name=?, name_th=?, description=?, description_th=?, price=?, category=?, image_key=?, usage=?, usage_th=?, attribute=?, attribute_th=?, varieties=?, sizes=?, colors=?, price_1=?, price_2=?, price_3=?, price_4=?, price_5=?, moq=?, is_visible=? WHERE id=?"
				).bind(
					dbValue(name), dbValue(name_th), dbValue(description), dbValue(body.description_th || null), activePrice, primaryCategory,
					dbValue(image_key), dbValue(usage), dbValue(body.usage_th || null), dbValue(body.attribute || null), dbValue(body.attribute_th || null), dbValue(varieties), dbValue(sizes), dbValue(colors),
					price_1 ?? 0, price_2 ?? 0, price_3 ?? 0, price_4 ?? 0, price_5 ?? 0, dbValue(moq), is_visible === false ? 0 : 1, id
				).run();
```

with

```ts
				const categoryList = normalizeCategoryList(categories, category);
				const primaryCategory = categoryList[0] || category || null;

				if (!primaryCategory) {
					return corsResponse({ error: "At least one category is required" }, { status: 400 });
				}

				// Sizes, colors and stock arrive as an optional `inventory` block. Everything that
				// can reject it is checked here, before anything is written.
				const prepared = body.inventory == null
					? null
					: await prepareInventory(env.DB, Number(id), body.inventory, images);
				if (prepared && !prepared.ok) {
					return corsResponse({ error: prepared.error }, { status: prepared.status });
				}
				const inventory = prepared && prepared.ok ? prepared.value : null;
				// With an inventory block the storefront's base prices are mirrored from it.
				const prices = inventory
					? inventory.basePrices
					: [price_1 ?? 0, price_2 ?? 0, price_3 ?? 0, price_4 ?? 0, price_5 ?? 0];
				const activePrice = (inventory ? prices[2] : price_3) || price || 0;

				await env.DB.prepare(
					"UPDATE products SET name=?, name_th=?, description=?, description_th=?, price=?, category=?, image_key=?, usage=?, usage_th=?, attribute=?, attribute_th=?, varieties=?, sizes=?, colors=?, price_1=?, price_2=?, price_3=?, price_4=?, price_5=?, moq=?, is_visible=? WHERE id=?"
				).bind(
					dbValue(name), dbValue(name_th), dbValue(description), dbValue(body.description_th || null), activePrice, primaryCategory,
					dbValue(image_key), dbValue(usage), dbValue(body.usage_th || null), dbValue(body.attribute || null), dbValue(body.attribute_th || null), dbValue(varieties), dbValue(sizes), dbValue(colors),
					...prices, dbValue(moq), is_visible === false ? 0 : 1, id
				).run();
```

(d) In the same handler, replace

```ts
				// Update images: simplest way is to delete and re-insert, batched into
				// one atomic round-trip instead of a DELETE plus one INSERT per image.
				if (images && Array.isArray(images)) {
```

with

```ts
				// Update images: simplest way is to delete and re-insert, batched into
				// one atomic round-trip instead of a DELETE plus one INSERT per image.
				// With an inventory block the sizes, colors and images go in one batch instead.
				if (inventory) {
					await applyInventory(env.DB, Number(id), inventory);
				} else if (images && Array.isArray(images)) {
```

(e) In the outer `catch (e: any) {` at the bottom of `fetch`, add as the first line of the block:

```ts
				if (e instanceof InventoryError) return corsResponse({ error: e.message }, { status: e.status });
```

- [ ] **Step 5: Run the new tests**

Run: `npx vitest run --config vitest.local.config.mts test/product-inventory.spec.ts`
Expected: PASS for every test in the file. If the unique-index tests report a 500 instead of 409, print the error text with a temporary `console.log(await res.text())` and widen the `message.includes(...)` checks in `applyInventory` to what SQLite actually says (the pre-check should catch these first, so this only matters for races).

- [ ] **Step 6: Run the whole Worker suite**

Run: `npx vitest run --config vitest.local.config.mts`
Expected: all files pass; nothing from the earlier 185 tests regressed (they never send `inventory`).

**Checkpoint:** `PUT` with inventory works end to end against D1; `GET` returns the read model.

---

### Task 4: Worker — `POST /products` with an inventory block, and the website-price cross-check

**Files:**
- Modify: `hidden-water-ed9d/src/index.ts` (POST handler)
- Modify: `hidden-water-ed9d/test/product-inventory.spec.ts` (append two `describe` blocks)

**Interfaces:**
- Consumes (Task 3): `prepareInventory`, `applyInventory`, `InventoryError` mapping.
- Produces: `POST /products` accepts `inventory`; on any failure no product row is left behind.

- [ ] **Step 1: Append the failing tests** to `test/product-inventory.spec.ts`. First extend the imports at the top of the file:

```ts
import { env, SELF, fetchMock } from "cloudflare:test";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ADMIN_TEST_TOKEN, resetDb, seedProduct, getOrder, getOrderItems } from "./helpers/db";
```

then append:

```ts
describe("POST /products with an inventory block", () => {
	beforeEach(resetDb);

	it("creates the product, its sizes and colors, and mirrors the box prices", async () => {
		const res = await call("POST", "/products", body({
			sku: "TE010",
			inventory: { sizes: [size({ colors: [color({ sku: "TE010-100-STA", stock: 40 })] })] },
			images: [{ image_key: "i1", size_ref: "s1", color_name: null }]
		}));
		expect(res.status).toBe(200);
		const created = (await res.json()) as any;
		expect(created.sku).toBe("TE010");

		const p = await productRow(created.id);
		expect([p.price_1, p.price_3, p.price_5, p.moq]).toEqual([2000, 1200, 1000, "100 pcs"]);
		expect(p.slug).toBe(`needle-${created.id}`);

		const inv = await inventoryOf(created.id);
		expect(inv.sizes[0].colors[0]).toMatchObject({ sku: "TE010-100-STA", stock: 40 });
		expect(await all("SELECT attribute_value, price_1 FROM product_images WHERE product_id = ?", created.id))
			.toEqual([{ attribute_value: "100 pcs", price_1: 2000 }]);
		expect(await count("stock_movements")).toBe(1);
	});

	it("answers 409 and creates no product when a color SKU is taken", async () => {
		const a = await seedProduct({ sku: "TE001" });
		await put(a, { inventory: { sizes: [size({ colors: [color({ sku: "DUP-1" })] })] } });
		const before = await count("products");

		const res = await call("POST", "/products", body({
			sku: "TE011", inventory: { sizes: [size({ colors: [color({ sku: "DUP-1" })] })] }
		}));
		expect(res.status).toBe(409);
		expect(await count("products")).toBe(before);
	});

	it("rejects a size id on create", async () => {
		const before = await count("products");
		const res = await call("POST", "/products", body({
			sku: "TE012", inventory: { sizes: [size({ id: 5 })] }
		}));
		expect(res.status).toBe(400);
		expect(await count("products")).toBe(before);
	});

	it("still creates a plain product when no inventory block is sent", async () => {
		const res = await call("POST", "/products", {
			name: "Plain", description: "d", category: "needles", categories: ["needles"], sku: "TE013",
			price_1: 700, price_2: 600, price_3: 500, moq: "10", is_visible: true
		});
		expect(res.status).toBe(200);
		const p = await productRow(((await res.json()) as any).id);
		expect([p.price_1, p.price_3, p.price]).toEqual([700, 500, 500]);
	});
});

// The editor shows "Per piece ฿" = box price ÷ pieces per box. The website must charge exactly that.
describe("what the editor shows is what the website charges", () => {
	beforeEach(async () => {
		await resetDb();
		fetchMock.activate();
		fetchMock.disableNetConnect();
		fetchMock
			.get("https://api.line.me")
			.intercept({ path: "/v2/bot/message/push", method: "POST" })
			.reply(200, () => ({}))
			.persist();
	});
	afterEach(() => fetchMock.deactivate());

	const order = (id: number, quantity: number) => {
		const form = new FormData();
		form.append("customerName", "Somchai");
		form.append("phoneNumber", "0812345678");
		form.append("shippingAddress", "123 Sampeng, Bangkok");
		form.append("cartItems", JSON.stringify([{
			id, name: "Needle", name_th: null, selectedSize: "Standard", selectedColor: "Default", quantity
		}]));
		return SELF.fetch("https://example.com/order/submit", { method: "POST", body: form });
	};

	it.each([
		[1, 20],   // under 20 pieces: level 1, 2000 / 100
		[20, 15],  // from 20 pieces: level 2, 1500 / 100
		[50, 12],  // from 50 pieces: level 3, 1200 / 100
		[100, 12]
	])("%i pieces are charged %d each", async (quantity, perPiece) => {
		const id = await seedProduct({ sku: "TE001" });
		await put(id); // box prices 2000/1500/1200/1100/1000, moq "100 pcs"

		const res = await order(id, quantity);
		expect(res.status).toBe(200);
		const { orderId } = (await res.json()) as any;
		expect((await getOrderItems(orderId))[0].price).toBe(perPiece);
		expect((await getOrder(orderId)).total_amount).toBe(perPiece * quantity);
	});
});
```

- [ ] **Step 2: Run to verify the POST tests fail**

Run: `npx vitest run --config vitest.local.config.mts test/product-inventory.spec.ts -t "POST /products"`
Expected: FAIL — the product is created but `GET inventory` is empty / the 409 case returns 200.

- [ ] **Step 3: Edit the POST handler** in `src/index.ts`. Replace

```ts
				const categoryList = normalizeCategoryList(categories, category);
				const primaryCategory = categoryList[0] || category || null;
				const activePrice = price || price_3 || 0;
				let productId: number | null = null;

				if (!primaryCategory) {
					return corsResponse({ error: "At least one category is required" }, { status: 400 });
				}

				try {
					const sku = await allocateProductSku(env, primaryCategory, body.sku);

					const { meta } = await env.DB.prepare(
						"INSERT INTO products (name, name_th, description, description_th, price, category, image_key, usage, usage_th, attribute, attribute_th, varieties, sizes, colors, price_1, price_2, price_3, price_4, price_5, moq, is_visible, sku) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
					).bind(
						dbValue(name), dbValue(name_th), dbValue(description), dbValue(body.description_th || null), activePrice, primaryCategory,
						dbValue(image_key), dbValue(usage), dbValue(body.usage_th || null), dbValue(body.attribute || null), dbValue(body.attribute_th || null), dbValue(varieties), dbValue(sizes), dbValue(colors),
						price_1 ?? 0, price_2 ?? 0, price_3 ?? 0, price_4 ?? 0, price_5 ?? 0, dbValue(moq), is_visible === false ? 0 : 1, sku
					).run();
```

with

```ts
				const categoryList = normalizeCategoryList(categories, category);
				const primaryCategory = categoryList[0] || category || null;
				let productId: number | null = null;

				if (!primaryCategory) {
					return corsResponse({ error: "At least one category is required" }, { status: 400 });
				}

				// Sizes, colors and stock arrive as an optional `inventory` block; reject a bad one
				// before the product row exists (see product-inventory.ts).
				const prepared = body.inventory == null
					? null
					: await prepareInventory(env.DB, null, body.inventory, images);
				if (prepared && !prepared.ok) {
					return corsResponse({ error: prepared.error }, { status: prepared.status });
				}
				const inventory = prepared && prepared.ok ? prepared.value : null;
				const prices = inventory
					? inventory.basePrices
					: [price_1 ?? 0, price_2 ?? 0, price_3 ?? 0, price_4 ?? 0, price_5 ?? 0];
				const activePrice = price || prices[2] || 0;

				try {
					const sku = await allocateProductSku(env, primaryCategory, body.sku);

					const { meta } = await env.DB.prepare(
						"INSERT INTO products (name, name_th, description, description_th, price, category, image_key, usage, usage_th, attribute, attribute_th, varieties, sizes, colors, price_1, price_2, price_3, price_4, price_5, moq, is_visible, sku) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
					).bind(
						dbValue(name), dbValue(name_th), dbValue(description), dbValue(body.description_th || null), activePrice, primaryCategory,
						dbValue(image_key), dbValue(usage), dbValue(body.usage_th || null), dbValue(body.attribute || null), dbValue(body.attribute_th || null), dbValue(varieties), dbValue(sizes), dbValue(colors),
						...prices, dbValue(moq), is_visible === false ? 0 : 1, sku
					).run();
```

and replace

```ts
					if (images && Array.isArray(images) && productId) {
						const validImages = images.filter((img: any) => isValidImageKey(img?.image_key));
```

with

```ts
					if (inventory && productId) {
						await applyInventory(env.DB, productId, inventory);
					} else if (images && Array.isArray(images) && productId) {
						const validImages = images.filter((img: any) => isValidImageKey(img?.image_key));
```

(The existing `catch (insertError)` deletes the just-inserted product row and rethrows; the rethrown `InventoryError` reaches the outer catch from Task 3 and becomes a 409.)

- [ ] **Step 4: Run the new file, then the whole suite**

Run: `npx vitest run --config vitest.local.config.mts test/product-inventory.spec.ts`
Expected: PASS.
Run: `npx vitest run --config vitest.local.config.mts`
Expected: all Worker test files pass.

- [ ] **Step 5: Type-check the new module**

Run (from `hidden-water-ed9d/`): `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -n "product-inventory" || echo "no type errors in product-inventory"`
Expected: `no type errors in product-inventory`. (Pre-existing errors elsewhere are not this task's concern; fix any in the new file, typically a missing cast on `results`.)

**Checkpoint:** the Worker side of Part A is complete and covered; the website-price cross-check passes.

---

### Task 5: Frontend logic — price formula, per piece, pieces per box, margin, stock, SKUs

**Files:**
- Create: `frontend/kitweb/src/utils/adminProductEdit.js`
- Create: `frontend/kitweb/src/utils/adminProductEdit.spec.js`

**Interfaces:**
- Consumes: `parseMoq`, `roundHalfUp`, `toPerPiece` from `utils/productPricing.js` (existing).
- Produces (exports used by Tasks 6–11), all pure:
  - constants `LEVELS = 5`, `DEFAULT_PERCENTS = [200, 180, 160, 130]`
  - `parsePercents(text): number[4] | null`, `formatPercents(percents): string`, `multiplierLabel(percent): string` (`'×1.8'`), `loadPercents(): number[4]`, `savePercents(percents): void`
  - `formulaPrice(l5, percent): number`, `detectManual(prices, percents): boolean[5]`, `autoFill(size, percents): size`, `setPrice(size, level0, raw, percents): size` (keeps a partial number such as `'12.'` as typed)
  - `cleanDecimal(raw): string`, `cleanInteger(raw): string` — what the numeric text fields keep of what was typed
  - `normalizePieces(v): number | null`, `piecesFromMoq(moq): number | ''`, `moqText(original, pieces): string | null`, `pieceRow(prices, piecesPerBox): (number|null)[5]`
  - `marginPct(size): number | null`, `sizeStock(size): number`, `productStock(draft): number`
  - `colorSku(productSku, sizeLabel, colorName, taken?: Set<string>): string`, `refreshSkus(sizes, productSku): sizes`
  - builders `blankColor(name?)`, `blankSize(label?)`
- Shapes. **size**: `{ ref, id, label, labelTh, boxCost, prices: (number|null)[5], manual: boolean[5], colors }`. **color**: `{ ref, id, name, nameTh, hex, sku, skuManual, stock, stockLoaded, isVisible }`. `ref` is a client key: `s<id>`/`c<id>` for saved rows, `ns<n>`/`nc<n>` for new ones.

- [ ] **Step 1: Write the failing tests** — `frontend/kitweb/src/utils/adminProductEdit.spec.js`:

```js
import { describe, it, expect } from 'vitest';
import {
    DEFAULT_PERCENTS, parsePercents, formatPercents, multiplierLabel, formulaPrice, detectManual,
    autoFill, setPrice, normalizePieces, piecesFromMoq, moqText, pieceRow, marginPct,
    sizeStock, productStock, colorSku, refreshSkus, blankColor, blankSize, cleanDecimal, cleanInteger,
} from './adminProductEdit';

describe('price formula', () => {
    it('defaults to the owner formula: x2, x1.8, x1.6, x1.3', () => {
        expect(DEFAULT_PERCENTS).toEqual([200, 180, 160, 130]);
        expect(DEFAULT_PERCENTS.map(multiplierLabel)).toEqual(['×2', '×1.8', '×1.6', '×1.3']);
    });

    it('parses exactly four positive percentages', () => {
        expect(parsePercents('200, 180, 160, 130')).toEqual([200, 180, 160, 130]);
        expect(parsePercents(' 150,120 ,110,105.5 ')).toEqual([150, 120, 110, 105.5]);
        for (const bad of ['', null, undefined, '200, 180, 160', '200, 180, 160, 130, 120', '200, x, 160, 130', '200, 0, 160, 130', '200, -1, 160, 130']) {
            expect(parsePercents(bad), String(bad)).toBeNull();
        }
        expect(formatPercents([200, 180, 160, 130])).toBe('200, 180, 160, 130');
    });

    it('fills L1-L4 from L5 = 1000 as 2000 / 1800 / 1600 / 1300', () => {
        const next = setPrice(blankSize('100 pcs'), 4, '1000', DEFAULT_PERCENTS);
        expect(next.prices).toEqual([2000, 1800, 1600, 1300, 1000]);
    });

    it('rounds formula prices half up to 2 decimals', () => {
        expect(formulaPrice(35, 130)).toBe(45.5);
        expect(formulaPrice(33.33, 180)).toBe(59.99);
        expect(formulaPrice(10.01, 130)).toBe(13.01);
    });

    it('typing in an auto level makes it manual, and it survives a new L5', () => {
        let size = setPrice(blankSize(), 4, '1000', DEFAULT_PERCENTS);
        size = setPrice(size, 0, '2500', DEFAULT_PERCENTS);
        expect(size.manual).toEqual([true, false, false, false, true]);
        size = setPrice(size, 4, '2000', DEFAULT_PERCENTS);
        expect(size.prices).toEqual([2500, 3600, 3200, 2600, 2000]);
    });

    it('clearing a manual level hands it back to the formula', () => {
        let size = setPrice(blankSize(), 4, '1000', DEFAULT_PERCENTS);
        size = setPrice(size, 1, '1700', DEFAULT_PERCENTS);
        expect(size.prices[1]).toBe(1700);
        size = setPrice(size, 1, '', DEFAULT_PERCENTS);
        expect(size.manual[1]).toBe(false);
        expect(size.prices[1]).toBe(1800);
    });

    it('blanks the auto levels when L5 is cleared, but keeps manual ones', () => {
        let size = setPrice(blankSize(), 4, '1000', DEFAULT_PERCENTS);
        size = setPrice(size, 2, '1500', DEFAULT_PERCENTS);
        size = setPrice(size, 4, '', DEFAULT_PERCENTS);
        expect(size.prices).toEqual([null, null, 1500, null, null]);
    });

    it('autoFill leaves manual levels alone when the percentages change', () => {
        let size = setPrice(blankSize(), 4, '1000', DEFAULT_PERCENTS);
        size = setPrice(size, 3, '1250', DEFAULT_PERCENTS);
        const refilled = autoFill(size, [150, 120, 110, 105]);
        expect(refilled.prices).toEqual([1500, 1200, 1100, 1250, 1000]);
    });

    it('detectManual calls a loaded price auto only when it equals the formula', () => {
        expect(detectManual([2000, 1800, 1600, 1300, 1000], DEFAULT_PERCENTS)).toEqual([false, false, false, false, true]);
        expect(detectManual([2000, 1500, 1200, 1100, 1000], DEFAULT_PERCENTS)).toEqual([false, true, true, true, true]);
        expect(detectManual([null, null, null, null, null], DEFAULT_PERCENTS)).toEqual([false, false, false, false, true]);
        // no L5: every filled level is the owner's own
        expect(detectManual([800, null, null, null, null], DEFAULT_PERCENTS)).toEqual([true, false, false, false, true]);
    });
});

describe('typed numbers', () => {
    it('keeps a partial price as typed, so the field is not rewritten under the cursor', () => {
        let size = setPrice(blankSize(), 4, '12.', DEFAULT_PERCENTS);
        expect(size.prices[4]).toBe('12.');
        expect(size.prices[0]).toBe(24);               // the formula already reads it as 12
        size = setPrice(size, 4, '12.50', DEFAULT_PERCENTS);
        expect(size.prices[4]).toBe('12.50');
        expect(size.prices[1]).toBe(22.5);
        size = setPrice(size, 4, '12.5', DEFAULT_PERCENTS);
        expect(size.prices[4]).toBe(12.5);
        size = setPrice(size, 4, '.5', DEFAULT_PERCENTS);
        expect(size.prices[4]).toBe('.5');
    });

    it('cleanDecimal keeps digits and one dot', () => {
        expect(cleanDecimal('12.5')).toBe('12.5');
        expect(cleanDecimal('฿1,200.50')).toBe('1200.50');
        expect(cleanDecimal('1.2.3')).toBe('1.23');
        expect(cleanDecimal('.5')).toBe('.5');
        expect(cleanDecimal('abc')).toBe('');
        expect(cleanDecimal(null)).toBe('');
    });

    it('cleanInteger keeps digits and a leading minus', () => {
        expect(cleanInteger('120')).toBe('120');
        expect(cleanInteger('a1b2')).toBe('12');
        expect(cleanInteger('-12')).toBe('-12');
        expect(cleanInteger('--5')).toBe('-5');
        expect(cleanInteger('-')).toBe('');
        expect(cleanInteger('')).toBe('');
        expect(cleanInteger(undefined)).toBe('');
    });
});

describe('pieces per box and the per-piece row', () => {
    it("shows the owner's needle box: 2000/1500/1200/1100/1000 with 100 per box is 20/15/12/11/10", () => {
        expect(pieceRow([2000, 1500, 1200, 1100, 1000], 100)).toEqual([20, 15, 12, 11, 10]);
    });

    it('leaves blank levels blank and treats no box size as one piece', () => {
        expect(pieceRow([50, null, 0, '', 80], '')).toEqual([50, null, null, null, 80]);
        expect(pieceRow([50], null)).toEqual([50]);
    });

    it('rounds half up to 2 decimals like the storefront', () => {
        expect(pieceRow([50, 100], 8)).toEqual([6.25, 12.5]);
        expect(pieceRow([100], 3)).toEqual([33.33]);
        expect(pieceRow([10], 8)).toEqual([1.25]);
    });

    it('normalizePieces accepts whole numbers of 1 or more only', () => {
        expect(normalizePieces(100)).toBe(100);
        expect(normalizePieces('20')).toBe(20);
        expect(normalizePieces(20.9)).toBe(20);
        for (const bad of ['', null, undefined, 0, -3, 'abc', '   ']) expect(normalizePieces(bad), String(bad)).toBeNull();
    });

    it('reads the box size out of the stored moq text', () => {
        expect(piecesFromMoq('20 pcs')).toBe(20);
        expect(piecesFromMoq('20')).toBe(20);
        expect(piecesFromMoq('1')).toBe(1);
        expect(piecesFromMoq('')).toBe('');
        expect(piecesFromMoq(null)).toBe('');
        expect(piecesFromMoq('as needed')).toBe(1);
    });

    it('keeps the original moq text byte for byte when the number is unchanged', () => {
        expect(moqText('20 pcs', 20)).toBe('20 pcs');
        expect(moqText('20', '20')).toBe('20');
        expect(moqText('as needed', 1)).toBe('as needed');
    });

    it('writes "<n> pcs" when the number changed or there was no text', () => {
        expect(moqText('20 pcs', 25)).toBe('25 pcs');
        expect(moqText(null, 100)).toBe('100 pcs');
        expect(moqText('', 100)).toBe('100 pcs');
    });

    it('writes NULL for a blank box size', () => {
        expect(moqText('20 pcs', '')).toBeNull();
        expect(moqText(null, null)).toBeNull();
        expect(moqText('20 pcs', 0)).toBeNull();
    });
});

describe('margin and stock', () => {
    it('margin is measured at the lowest price (L5) against the box factory cost', () => {
        const size = { ...blankSize(), boxCost: '22', prices: [70, 63, 53, 39, 35] };
        expect(marginPct(size)).toBe(37);
    });

    it('has no margin without a cost or without an L5 price', () => {
        expect(marginPct({ ...blankSize(), boxCost: '', prices: [1, 1, 1, 1, 35] })).toBeNull();
        expect(marginPct({ ...blankSize(), boxCost: '22', prices: [null, null, null, null, null] })).toBeNull();
        expect(marginPct({ ...blankSize(), boxCost: '0', prices: [1, 1, 1, 1, 35] })).toBeNull();
    });

    it('totals stock per size and per product, ignoring blanks', () => {
        const a = { ...blankSize('A'), colors: [{ ...blankColor('Red'), stock: 120 }, { ...blankColor('Navy'), stock: '80' }] };
        const b = { ...blankSize('B'), colors: [{ ...blankColor('Red'), stock: '' }, { ...blankColor('Cream'), stock: 45.9 }] };
        expect(sizeStock(a)).toBe(200);
        expect(sizeStock(b)).toBe(45);
        expect(productStock({ sizes: [a, b] })).toBe(245);
    });
});

describe('color SKUs', () => {
    it('builds <product SKU>-<SIZE>-<COL>', () => {
        expect(colorSku('YN-014', '25 g', 'Red')).toBe('YN-014-25G-RED');
        expect(colorSku('NE004', '4.5"', 'Navy blue')).toBe('NE004-45-NAV');
        expect(colorSku('NE004', '#200 1x4', 'Standard')).toBe('NE004-2001X4-STA');
    });

    it('falls back when a label has no Latin letters or digits, and needs a product SKU', () => {
        expect(colorSku('NE004', 'ใหญ่', 'แดง')).toBe('NE004-SZ-CLR');
        expect(colorSku('', '25 g', 'Red')).toBe('');
        expect(colorSku(null, '25 g', 'Red')).toBe('');
    });

    it('adds -2, -3 when the code is taken (case-insensitive)', () => {
        const taken = new Set(['yn-014-25g-nav']);
        expect(colorSku('YN-014', '25 g', 'Navy', taken)).toBe('YN-014-25G-NAV-2');
        taken.add('yn-014-25g-nav-2');
        expect(colorSku('YN-014', '25 g', 'Navy', taken)).toBe('YN-014-25G-NAV-3');
    });

    it('refreshSkus fills automatic SKUs and keeps ones the owner typed', () => {
        const size = {
            ...blankSize('25 g'),
            colors: [
                { ...blankColor('Red') },
                { ...blankColor('Navy'), sku: 'MY-NAVY', skuManual: true },
                { ...blankColor('Navy blue') },
            ],
        };
        const [out] = refreshSkus([size], 'YN-014');
        expect(out.colors.map((c) => c.sku)).toEqual(['YN-014-25G-RED', 'MY-NAVY', 'YN-014-25G-NAV']);
    });

    it('refreshSkus follows a renamed size or color, and does nothing without a product SKU', () => {
        let sizes = refreshSkus([{ ...blankSize('25 g'), colors: [blankColor('Red')] }], 'YN-014');
        sizes = [{ ...sizes[0], label: '50 g', colors: [{ ...sizes[0].colors[0], name: 'Rose' }] }];
        expect(refreshSkus(sizes, 'YN-014')[0].colors[0].sku).toBe('YN-014-50G-ROS');
        expect(refreshSkus(sizes, '')).toBe(sizes);
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run (from `frontend/kitweb/`): `npx vitest run src/utils/adminProductEdit.spec.js`
Expected: FAIL — `Failed to resolve import "./adminProductEdit"`.

- [ ] **Step 3: Implement** — `frontend/kitweb/src/utils/adminProductEdit.js`:

```js
// Pure logic behind the Edit product panel: no DOM and no network, so the pricing and
// payload rules can be tested on their own. The panel keeps one `draft` object (see
// blankDraft); every function here either reads it or returns a new piece of it.
//
// Prices are per BOX, the unit the database and the website already use. The website
// shows box price ÷ pieces per box (products.moq) per piece and sells whole boxes only.
import { parseMoq, roundHalfUp, toPerPiece } from './productPricing';

export const LEVELS = 5;
// L1-L4 as a percentage of the L5 price: the owner's formula, x2 / x1.8 / x1.6 / x1.3.
export const DEFAULT_PERCENTS = [200, 180, 160, 130];
const PERCENTS_KEY = 'kc-price-percents';

const str = (v) => (v === null || v === undefined ? '' : String(v));
// Blank or non-numeric -> null, so "0" and "" stay different things.
const num = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

let refCounter = 0;
const nextRef = (prefix) => `${prefix}${++refCounter}`;

// ── Price formula ─────────────────────────────────────────────────

export const parsePercents = (text) => {
    if (text === null || text === undefined) return null;
    const parts = String(text).split(',').map((s) => parseFloat(s.trim()));
    return parts.length === 4 && parts.every((n) => Number.isFinite(n) && n > 0) ? parts : null;
};

export const formatPercents = (percents) => percents.join(', ');

export const multiplierLabel = (percent) => `×${roundHalfUp(percent / 100, 2)}`;

// Remembered per browser; storage can throw or be missing (private window, prerender).
export const loadPercents = () => {
    try {
        return parsePercents(window.localStorage.getItem(PERCENTS_KEY)) || [...DEFAULT_PERCENTS];
    } catch {
        return [...DEFAULT_PERCENTS];
    }
};

export const savePercents = (percents) => {
    try {
        window.localStorage.setItem(PERCENTS_KEY, formatPercents(percents));
    } catch {
        // kept for this visit only
    }
};

export const formulaPrice = (l5, percent) => roundHalfUp((l5 * percent) / 100, 2);

// A level is "auto" while it still equals what the formula gives from L5, "manual" once it
// differs (or L5 is unknown). L5 itself is always typed, so it counts as manual.
export const detectManual = (prices, percents) => {
    const l5 = num(prices[4]);
    return prices.map((p, i) => {
        if (i === 4) return true;
        if (num(p) === null) return false;
        if (l5 === null || l5 <= 0) return true;
        return num(p) !== formulaPrice(l5, percents[i]);
    });
};

// Re-fills the auto levels from L5; manual ones are never touched. With no usable L5 the
// auto levels go blank instead of keeping a stale number.
export const autoFill = (size, percents) => {
    const l5 = num(size.prices[4]);
    const usable = l5 !== null && l5 > 0;
    const prices = size.prices.map((p, i) => {
        if (i === 4 || size.manual[i]) return p;
        return usable ? formulaPrice(l5, percents[i]) : null;
    });
    return { ...size, prices };
};

// While a number is still being typed ("12.", "0.50", ".5") the field keeps the text exactly
// as typed, so re-rendering never rewrites it under the cursor. Everything that reads a price
// goes through num(), which reads both.
const keepTyped = (raw) => {
    const n = num(raw);
    if (n === null) return null;
    return String(n) === String(raw).trim() ? n : String(raw).trim();
};

// level is 0-based. Typing any level except L5 makes it manual; clearing it hands it back
// to the formula.
export const setPrice = (size, level, raw, percents) => {
    const prices = [...size.prices];
    const manual = [...size.manual];
    prices[level] = keepTyped(raw);
    if (level !== 4) manual[level] = prices[level] !== null;
    return autoFill({ ...size, prices, manual }, percents);
};

// The numeric fields are text inputs (a number input hides half-typed text from the page);
// these keep only what can be part of a number.
export const cleanDecimal = (raw) => {
    const [whole, ...rest] = String(raw ?? '').replace(/[^\d.]/g, '').split('.');
    return rest.length ? `${whole}.${rest.join('')}` : whole;
};

export const cleanInteger = (raw) => {
    const text = String(raw ?? '');
    const digits = text.replace(/\D/g, '');
    return text.trim().startsWith('-') && digits ? `-${digits}` : digits;
};

// ── Pieces per box ────────────────────────────────────────────────

// A whole number of 1 or more, or null for blank / unusable.
export const normalizePieces = (v) => {
    if (v === null || v === undefined || String(v).trim() === '') return null;
    const n = Math.floor(Number(v));
    return Number.isFinite(n) && n >= 1 ? n : null;
};

// products.moq is free text ("20 pcs"); the editor shows only the number.
export const piecesFromMoq = (moq) => (str(moq).trim() === '' ? '' : parseMoq(moq));

// What to store in products.moq. An unchanged number keeps the original text exactly (the
// website reads only its leading integer, but a re-save should not rewrite what it did not
// change); a changed number is "<n> pcs"; blank is NULL.
export const moqText = (original, pieces) => {
    const n = normalizePieces(pieces);
    if (n === null) return null;
    const before = str(original).trim();
    return before && parseMoq(before) === n ? original : `${n} pcs`;
};

// What the website shows per piece at each level: box price ÷ pieces per box.
export const pieceRow = (prices, piecesPerBox) => {
    const box = normalizePieces(piecesPerBox) || 1;
    return prices.map((p) => (num(p) > 0 ? toPerPiece(p, box) : null));
};

// ── Margin and stock ──────────────────────────────────────────────

// Margin at the lowest price (L5) against the factory cost of a box.
export const marginPct = (size) => {
    const cost = num(size.boxCost);
    const l5 = num(size.prices[4]);
    if (!cost || !l5 || l5 <= 0) return null;
    return Math.round(((l5 - cost) / l5) * 100);
};

export const sizeStock = (size) =>
    size.colors.reduce((sum, c) => sum + (Math.trunc(Number(c.stock)) || 0), 0);

export const productStock = (draft) => draft.sizes.reduce((sum, s) => sum + sizeStock(s), 0);

// ── New rows and SKUs ─────────────────────────────────────────────

export const blankColor = (name = 'Standard') => ({
    ref: nextRef('nc'), id: null, name, nameTh: '', hex: '', sku: '', skuManual: false,
    stock: 0, stockLoaded: 0, isVisible: true,
});

export const blankSize = (label = '') => ({
    ref: nextRef('ns'), id: null, label, labelTh: '', boxCost: '',
    prices: [null, null, null, null, null], manual: [false, false, false, false, true],
    colors: [blankColor()],
});

const alnum = (text) => str(text).toUpperCase().replace(/[^A-Z0-9]/g, '');

// <product SKU>-<SIZE>-<COL>, e.g. YN-014-25G-RED. `taken` holds lower-case SKUs already in
// use in this product; a clash gets -2, -3, ... Thai-only labels fall back to SZ / CLR.
export const colorSku = (productSku, sizeLabel, colorName, taken = new Set()) => {
    const base = str(productSku).trim();
    if (!base) return '';
    const candidate = `${base}-${alnum(sizeLabel) || 'SZ'}-${alnum(colorName).slice(0, 3) || 'CLR'}`;
    let sku = candidate;
    for (let n = 2; taken.has(sku.toLowerCase()); n++) sku = `${candidate}-${n}`;
    return sku;
};

// Re-derives every automatic SKU (skuManual false) so it follows renamed sizes and colors;
// SKUs the owner typed are kept and reserved first. Returns the same array when there is
// no product SKU yet.
export const refreshSkus = (sizes, productSku) => {
    if (!str(productSku).trim()) return sizes;
    const taken = new Set(sizes.flatMap((s) =>
        s.colors.filter((c) => c.skuManual && c.sku.trim()).map((c) => c.sku.trim().toLowerCase())));
    return sizes.map((s) => ({
        ...s,
        colors: s.colors.map((c) => {
            if (c.skuManual) return c;
            const sku = colorSku(productSku, s.label, c.name, taken);
            taken.add(sku.toLowerCase());
            return { ...c, sku };
        }),
    }));
};
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/utils/adminProductEdit.spec.js`
Expected: PASS.

- [ ] **Step 5: Run the whole frontend suite**

Run: `npx vitest run`
Expected: `Test Files 17 passed (17)`; tests 212 plus the new ones.

**Checkpoint:** formula, per-piece, moq, margin, stock and SKU rules are tested.

---

### Task 6: Frontend logic — legacy import, draft, images, completeness, validation, payload, dirty check

**Files:**
- Modify: `frontend/kitweb/src/utils/adminProductEdit.js` (append)
- Modify: `frontend/kitweb/src/utils/adminProductEdit.spec.js` (append, and extend the import list)

**Interfaces:**
- Consumes (Task 5): `blankSize`, `blankColor`, `detectManual`, `refreshSkus`, `piecesFromMoq`, `moqText`, `normalizePieces`, `num`/`str` (module-private helpers already in the file).
- Produces:
  - `USAGE_OPTIONS`, `parseUsage(raw, rawTh)`, `serializeUsage(entries)` → `{ usage, usageTh }`
  - `blankDraft()`, `buildDraft(product, inventory | null, percents?)`, `importLegacy(product, percents?)`
  - `imageCard(img?, over?)`, `setMain(images, uid)`, `findColor(sizes, colorRef)`, `colorOptions(sizes, sizeRef)`, `withSize(img, sizeRef, sizes)`, `reconcileImages(images, sizes)`, `attributionOf(label, sizes)`
  - `completeness(draft)` → `{ checks: {info, image, prices, stock}, percent, complete }`, `unorderableSizes(draft): number`, `validateDraft(draft)` → `{ key, arg? } | null`
  - `snapshot(draft): string`, `isDirty(draft, originalSnapshot): boolean`, `buildPayload(draft)`
- **draft** shape: `{ id, sku, name, nameTh, description, descriptionTh, attribute, attributeTh, usage, usageTh, categories: string[], isVisible, varieties, legacySizes, legacyColors, moqOriginal, piecesPerBox, baseFromLegacy: number[5] | null, sizes, images }`.
- **image card**: `{ uid, image_key, isMain, inRows, isNew, file, preview, sizeRef, colorRef, passthrough: { attribute_type, attribute_value, prices } | null }`. `inRows` = "this image has (or will get) a `product_images` row"; the main image of a legacy product usually has none, because the old form kept the main photo in `products.image_key` only.
- Payload image entries: `{ image_key, is_main, size_ref, color_name }` or `{ image_key, is_main, passthrough: true, attribute_type, attribute_value, price_1..price_5 }` — exactly what Task 3's Worker reads.

- [ ] **Step 1: Extend the spec.** In `adminProductEdit.spec.js` change the import to also pull in the new names:

```js
import {
    DEFAULT_PERCENTS, parsePercents, formatPercents, multiplierLabel, formulaPrice, detectManual,
    autoFill, setPrice, normalizePieces, piecesFromMoq, moqText, pieceRow, marginPct,
    sizeStock, productStock, colorSku, refreshSkus, blankColor, blankSize,
    USAGE_OPTIONS, parseUsage, serializeUsage, blankDraft, buildDraft, importLegacy, imageCard, setMain,
    findColor, colorOptions, withSize, reconcileImages, attributionOf, completeness, unorderableSizes,
    validateDraft, snapshot, isDirty, buildPayload,
} from './adminProductEdit';
```

then append:

```js
const product = (over = {}) => ({
    id: 7, sku: 'NE004', name: 'Needle', name_th: 'เข็ม', description: 'A needle', description_th: null,
    attribute: null, attribute_th: null, usage: null, usage_th: null, category: 'needles', categories: ['needles'],
    is_visible: 1, image_key: 'main-key', varieties: null, sizes: null, colors: null, moq: '20',
    price_1: 800, price_2: 0, price_3: 0, price_4: 0, price_5: 0, images: [], ...over,
});
const row = (id, key, type, label, prices = {}) => ({
    id, image_key: key, attribute_type: type, attribute_value: label,
    price_1: null, price_2: null, price_3: null, price_4: null, price_5: null, ...prices,
});
const variant = (id, key, label, prices) => row(id, key, 'variant_link', label, prices);

describe('usage', () => {
    it('offers the 12 usage types the storefront knows', () => {
        expect(USAGE_OPTIONS).toHaveLength(12);
        expect(USAGE_OPTIONS[0]).toEqual({ en: 'sewing', th: 'งานเย็บ' });
    });

    it('reads the JSON format and the legacy comma list', () => {
        const json = JSON.stringify([{ type: 'sewing', example: 'hems' }]);
        const jsonTh = JSON.stringify([{ type: 'งานเย็บ', example: 'ชายเสื้อ' }]);
        expect(parseUsage(json, jsonTh)).toEqual([{ en: 'sewing', th: 'งานเย็บ', example: 'hems', example_th: 'ชายเสื้อ' }]);
        expect(parseUsage('sewing, crafting', '')).toEqual([
            { en: 'sewing', th: 'งานเย็บ', example: '', example_th: '' },
            { en: 'crafting', th: 'งานประดิษฐ์', example: '', example_th: '' },
        ]);
        expect(parseUsage('', '')).toEqual([]);
    });

    it('serialises back to the [{type, example}] JSON the storefront reads', () => {
        const entries = [{ en: 'sewing', th: 'งานเย็บ', example: 'hems', example_th: '' }];
        expect(serializeUsage(entries)).toEqual({
            usage: JSON.stringify([{ type: 'sewing', example: 'hems' }]),
            usageTh: JSON.stringify([{ type: 'งานเย็บ', example: '' }]),
        });
        expect(serializeUsage([])).toEqual({ usage: '', usageTh: '' });
    });
});

describe('importLegacy', () => {
    it('gives a product with no variants one "Standard" size from its base prices', () => {
        const { sizes, images, baseFromLegacy } = importLegacy(product({ price_1: 800, price_3: 600 }));
        expect(sizes).toHaveLength(1);
        expect(sizes[0].label).toBe('Standard');
        expect(sizes[0].prices).toEqual([800, null, 600, null, null]);
        expect(sizes[0].colors.map((c) => c.name)).toEqual(['Standard']);
        expect(images).toEqual([]);
        expect(baseFromLegacy).toBeNull();
    });

    it('makes one size per distinct variant label, prices copied, shared labels merged', () => {
        const { sizes, images, baseFromLegacy } = importLegacy(product({
            price_1: 800, price_2: 700,
            images: [
                variant(1, 'v1', '4.5"', { price_1: 900, price_2: 850 }),
                variant(2, 'v2', 'Plain'),                    // no override: inherits the base prices
                variant(3, 'v3', '4.5"', { price_1: 999 }),   // same label: one size, two images
                row(4, 'g1', 'gallery', ''),
            ],
        }));
        expect(sizes.map((s) => s.label)).toEqual(['4.5"', 'Plain']);
        expect(sizes[0].prices).toEqual([900, 850, null, null, null]);
        expect(sizes[1].prices).toEqual([800, 700, null, null, null]);
        expect(images.map((i) => [i.image_key, i.sizeRef])).toEqual([
            ['v1', sizes[0].ref], ['v2', sizes[1].ref], ['v3', sizes[0].ref], ['g1', null],
        ]);
        expect(baseFromLegacy).toEqual([800, 700, 0, 0, 0]);
    });

    it('treats a row that sets only L4/L5 as not overriding', () => {
        const { sizes } = importLegacy(product({ price_1: 800, images: [variant(1, 'v1', 'A', { price_4: 5 })] }));
        expect(sizes[0].prices).toEqual([800, null, null, null, null]);
    });

    it('passes a variant with an empty label through untouched', () => {
        const { images, sizes } = importLegacy(product({
            images: [variant(1, 'v1', 'A'), variant(2, 'v2', '', { price_1: 5 })],
        }));
        expect(sizes.map((s) => s.label)).toEqual(['A']);
        expect(images[1].sizeRef).toBeNull();
        expect(images[1].passthrough).toEqual({
            attribute_type: 'variant_link', attribute_value: '', prices: [5, null, null, null, null],
        });
    });

    it('marks prices that already follow the formula as auto', () => {
        const { sizes } = importLegacy(product({ price_1: 2000, price_2: 1800, price_3: 1600, price_4: 1300, price_5: 1000 }));
        expect(sizes[0].manual).toEqual([false, false, false, false, true]);
    });
});

describe('buildDraft', () => {
    it('reads the product fields and the box size', () => {
        const d = buildDraft(product({ moq: '20 pcs', is_visible: 0, usage: '[]' }), null);
        expect(d).toMatchObject({
            id: 7, sku: 'NE004', name: 'Needle', nameTh: 'เข็ม', description: 'A needle', categories: ['needles'],
            isVisible: false, piecesPerBox: 20, moqOriginal: '20 pcs', usage: '[]',
        });
    });

    it('treats a blank moq as no box size', () => {
        expect(buildDraft(product({ moq: null }), null).piecesPerBox).toBe('');
    });

    it('shows products.image_key as the main image even when it has no row', () => {
        const d = buildDraft(product({ image_key: 'main-key', images: [row(1, 'g1', 'gallery', '')] }), null);
        expect(d.images.map((i) => [i.image_key, i.isMain, i.inRows])).toEqual([['main-key', true, false], ['g1', false, true]]);
    });

    it('marks the matching row as main when image_key is also a row', () => {
        const d = buildDraft(product({ image_key: 'g1', images: [row(1, 'g1', 'gallery', ''), row(2, 'g2', 'gallery', '')] }), null);
        expect(d.images.map((i) => [i.image_key, i.isMain])).toEqual([['g1', true], ['g2', false]]);
        expect(d.images[0].inRows).toBe(true);
    });

    it('fills automatic color SKUs from the product SKU', () => {
        const d = buildDraft(product({ sku: 'NE004' }), null);
        expect(d.sizes[0].colors[0].sku).toBe('NE004-STANDARD-STA');
    });

    it('loads saved sizes instead of importing, and resolves variant labels back to sizes and colors', () => {
        const inventory = { sizes: [
            { id: 11, label: '25 g', label_th: null, box_cost: 22, prices: [70, 63, 53, 39, 35],
              colors: [{ id: 21, name: 'Red', name_th: null, hex: '#c0392b', sku: 'YN-25G-RED', stock: 120, is_visible: true },
                       { id: 22, name: 'Navy', name_th: null, hex: null, sku: 'YN-25G-NAV', stock: 80, is_visible: 0 }] },
            { id: 12, label: '50 g', label_th: null, box_cost: null, prices: [140, 126, 106, 78, 70],
              colors: [{ id: 23, name: 'Red', name_th: null, hex: null, sku: 'YN-50G-RED', stock: 0, is_visible: true }] },
        ] };
        const d = buildDraft(product({
            price_1: 70, image_key: null,
            images: [
                variant(1, 'i1', 'Red / 25 g'), variant(2, 'i2', '50 g'), variant(3, 'i3', 'Red'),
                variant(4, 'i4', 'Mystery'), row(5, 'i5', 'gallery', ''),
            ],
        }), inventory);

        expect(d.sizes.map((s) => [s.ref, s.id, s.label, s.boxCost])).toEqual([['s11', 11, '25 g', 22], ['s12', 12, '50 g', '']]);
        expect(d.sizes[0].colors.map((c) => [c.ref, c.stock, c.stockLoaded, c.isVisible, c.skuManual])).toEqual([
            ['c21', 120, 120, true, true], ['c22', 80, 80, false, true],
        ]);
        expect(d.baseFromLegacy).toBeNull();

        const [i1, i2, i3, i4, i5] = d.images;
        expect([i1.sizeRef, i1.colorRef]).toEqual(['s11', 'c21']);
        expect([i2.sizeRef, i2.colorRef]).toEqual(['s12', null]);
        expect([i3.sizeRef, i3.colorRef]).toEqual([null, 'c21']);
        expect(i4.passthrough).toMatchObject({ attribute_value: 'Mystery' });
        expect([i5.sizeRef, i5.colorRef, i5.passthrough]).toEqual([null, null, null]);
    });
});

describe('blankDraft', () => {
    it('starts with one empty size holding a Standard color', () => {
        const d = blankDraft();
        expect(d.sizes).toHaveLength(1);
        expect(d.sizes[0].colors).toHaveLength(1);
        expect(d.categories).toEqual([]);
        expect(d.isVisible).toBe(true);
        expect(d.images).toEqual([]);
    });
});

describe('image attribution', () => {
    const sizes = [
        { ...blankSize('25 g'), ref: 's1', colors: [{ ...blankColor('Red'), ref: 'c1' }, { ...blankColor('Navy'), ref: 'c2' }] },
        { ...blankSize('50 g'), ref: 's2', colors: [{ ...blankColor('Red'), ref: 'c3' }] },
    ];

    it('reads a variant label back into size and color', () => {
        expect(attributionOf('25 g', sizes)).toEqual({ sizeRef: 's1', colorRef: null });
        expect(attributionOf('Navy / 25 g', sizes)).toEqual({ sizeRef: 's1', colorRef: 'c2' });
        expect(attributionOf('Red', sizes)).toEqual({ sizeRef: null, colorRef: 'c1' });
        expect(attributionOf('Green / 25 g', sizes)).toBeNull();
        expect(attributionOf('', sizes)).toBeNull();
    });

    it('prefers a size whose label contains a slash over splitting it', () => {
        const odd = [{ ...blankSize('Red / 25 g'), ref: 's9' }];
        expect(attributionOf('Red / 25 g', odd)).toEqual({ sizeRef: 's9', colorRef: null });
    });

    it('offers the colors of one size, or each distinct name across all sizes', () => {
        expect(colorOptions(sizes, 's1').map((c) => c.ref)).toEqual(['c1', 'c2']);
        expect(colorOptions(sizes, null).map((c) => [c.ref, c.name])).toEqual([['c1', 'Red'], ['c2', 'Navy']]);
        expect(colorOptions(sizes, 'missing')).toEqual([]);
    });

    it('finds a color anywhere', () => {
        expect(findColor(sizes, 'c3').size.ref).toBe('s2');
        expect(findColor(sizes, 'nope')).toBeNull();
    });

    it('moves a color to the same-named color when the size changes, else drops it', () => {
        const img = imageCard({ image_key: 'k' }, { sizeRef: 's1', colorRef: 'c1' });
        expect(withSize(img, 's2', sizes)).toMatchObject({ sizeRef: 's2', colorRef: 'c3' });
        const navy = imageCard({ image_key: 'k' }, { sizeRef: 's1', colorRef: 'c2' });
        expect(withSize(navy, 's2', sizes)).toMatchObject({ sizeRef: 's2', colorRef: null });
        expect(withSize(img, '', sizes)).toMatchObject({ sizeRef: null, colorRef: 'c1' });
    });

    it('detaches attributions that point at something removed', () => {
        const images = [
            imageCard({ image_key: 'a' }, { sizeRef: 'gone', colorRef: 'c1' }),
            imageCard({ image_key: 'b' }, { sizeRef: 's1', colorRef: 'c3' }),   // color is in another size
            imageCard({ image_key: 'c' }, { sizeRef: null, colorRef: 'gone' }),
            imageCard({ image_key: 'd' }, { sizeRef: 's2', colorRef: 'c3' }),   // still valid
            imageCard({ image_key: 'e' }, { passthrough: { attribute_type: 'variant_link', attribute_value: 'X', prices: [] } }),
        ];
        const out = reconcileImages(images, sizes);
        expect(out.map((i) => [i.sizeRef, i.colorRef])).toEqual([[null, null], ['s1', null], [null, null], ['s2', 'c3'], [null, null]]);
        expect(out[3]).toBe(images[3]);
        expect(out[4]).toBe(images[4]);
    });

    it('setMain leaves exactly one main image', () => {
        const images = [imageCard({ image_key: 'a' }, { isMain: true }), imageCard({ image_key: 'b' })];
        const out = setMain(images, images[1].uid);
        expect(out.map((i) => i.isMain)).toEqual([false, true]);
    });
});

describe('completeness', () => {
    const full = () => {
        const d = buildDraft(product({ price_1: 2000, price_2: 1500, price_3: 1200, price_4: 1100, price_5: 1000, moq: '100 pcs' }), null);
        d.sizes[0].prices = [2000, 1500, 1200, 1100, 1000];
        return d;
    };

    it('is 100% when name, description, main image, five prices + box size and SKUs are all there', () => {
        const c = completeness(full());
        expect(c).toEqual({ checks: { info: true, image: true, prices: true, stock: true }, percent: 100, complete: true });
    });

    it('flags each missing piece', () => {
        const d = full();
        d.description = ''; d.descriptionTh = '';
        d.images = [];
        d.sizes[0].prices[3] = null;
        d.sizes[0].colors[0].sku = '';
        expect(completeness(d)).toEqual({ checks: { info: false, image: false, prices: false, stock: false }, percent: 0, complete: false });
    });

    it('needs the box size for the price check', () => {
        const d = full();
        d.piecesPerBox = '';
        expect(completeness(d).checks.prices).toBe(false);
        expect(completeness(d).percent).toBe(75);
    });

    it('accepts a Thai description in place of an English one', () => {
        const d = full();
        d.description = ''; d.descriptionTh = 'เข็มเย็บผ้า';
        expect(completeness(d).checks.info).toBe(true);
    });

    it('counts sizes that have no photo once the product uses variant photos', () => {
        const d = buildDraft(product({}), null);
        d.sizes = [{ ...blankSize('A'), ref: 'sa' }, { ...blankSize('B'), ref: 'sb' }];
        expect(unorderableSizes(d)).toBe(0);                     // no variant photos at all: sold as one base product
        d.images.push(imageCard({ image_key: 'x' }, { sizeRef: 'sa' }));
        expect(unorderableSizes(d)).toBe(1);                     // B has no photo
        d.images.push(imageCard({ image_key: 'y' }, { sizeRef: 'sb' }));
        expect(unorderableSizes(d)).toBe(0);
    });
});

describe('validateDraft', () => {
    const ok = () => {
        const d = buildDraft(product({}), null);
        d.sizes[0].label = 'Standard';
        return d;
    };

    it('passes a complete draft', () => {
        expect(validateDraft(ok())).toBeNull();
    });

    it('reports the first problem', () => {
        let d = ok(); d.name = '  ';
        expect(validateDraft(d)).toEqual({ key: 'name' });
        d = ok(); d.categories = [];
        expect(validateDraft(d)).toEqual({ key: 'category' });
        d = ok(); d.piecesPerBox = 0;
        expect(validateDraft(d)).toEqual({ key: 'pieces' });
        d = ok(); d.sizes[0].label = ' ';
        expect(validateDraft(d)).toEqual({ key: 'sizeLabel' });
        d = ok(); d.sizes.push({ ...blankSize('Standard') });
        expect(validateDraft(d)).toEqual({ key: 'sizeDuplicate', arg: 'Standard' });
        d = ok(); d.sizes[0].colors[0].name = '';
        expect(validateDraft(d)).toEqual({ key: 'colorName', arg: 'Standard' });
        d = ok(); d.sizes[0].colors.push({ ...blankColor('Standard') });
        expect(validateDraft(d)).toEqual({ key: 'colorDuplicate', arg: 'Standard' });
        d = ok(); d.sizes[0].colors = [];
        expect(validateDraft(d)).toEqual({ key: 'colorNone', arg: 'Standard' });
        d = ok(); d.sizes[0].colors.push({ ...blankColor('Red'), sku: d.sizes[0].colors[0].sku });
        expect(validateDraft(d)).toEqual({ key: 'skuDuplicate', arg: d.sizes[0].colors[0].sku });
    });
});

describe('dirty check', () => {
    it('is clean until something changes, and ignores previews and file objects', () => {
        const d = buildDraft(product({ images: [row(1, 'g1', 'gallery', '')] }), null);
        const original = snapshot(d);
        expect(isDirty(d, original)).toBe(false);
        d.images[0].preview = 'blob:abc';
        d.images[0].file = { name: 'x.png' };
        expect(isDirty(d, original)).toBe(false);
        d.name = 'Needle 2';
        expect(isDirty(d, original)).toBe(true);
    });

    it('notices a new image, a price and a color change', () => {
        const d = buildDraft(product({}), null);
        const original = snapshot(d);
        d.images.push(imageCard({}, { isNew: true }));
        expect(isDirty(d, original)).toBe(true);
        const e = buildDraft(product({}), null);
        const base = snapshot(e);
        e.sizes[0].prices[0] = 1;
        expect(isDirty(e, base)).toBe(true);
        const f = buildDraft(product({}), null);
        const baseF = snapshot(f);
        f.sizes[0].colors[0].stock = 5;
        expect(isDirty(f, baseF)).toBe(true);
    });
});

describe('buildPayload', () => {
    const needle = () => {
        const d = blankDraft();
        d.sku = 'NE004'; d.name = ' Needle '; d.description = 'A needle'; d.categories = ['needles'];
        d.piecesPerBox = 100; d.moqOriginal = null;
        d.sizes[0].label = '100 pcs';
        d.sizes[0].prices = [2000, 1500, 1200, 1100, 1000];
        d.sizes[0].colors[0].sku = 'NE004-100-STA';
        d.images = [imageCard({ image_key: 'main' }, { isMain: true, inRows: false })];
        return d;
    };

    it("carries the owner's needle example: box prices unchanged, moq '100 pcs', per piece 20/15/12/11/10", () => {
        const p = buildPayload(needle());
        expect([p.price_1, p.price_2, p.price_3, p.price_4, p.price_5]).toEqual([2000, 1500, 1200, 1100, 1000]);
        expect(p.price).toBe(1200);
        expect(p.moq).toBe('100 pcs');
        expect(p.inventory.sizes[0].prices).toEqual([2000, 1500, 1200, 1100, 1000]);
        expect(pieceRow(p.inventory.sizes[0].prices, 100)).toEqual([20, 15, 12, 11, 10]);
    });

    it('sends the product fields the way the old form did', () => {
        const p = buildPayload(needle());
        expect(p).toMatchObject({
            name: 'Needle', name_th: null, description: 'A needle', description_th: null,
            category: 'needles', categories: ['needles'], image_key: 'main', is_visible: true, sku: 'NE004',
            usage: null, usage_th: null, attribute: null, attribute_th: null,
            varieties: null, sizes: null, colors: null,
        });
    });

    it('hands the legacy varieties / sizes / colors text back unchanged', () => {
        const d = needle();
        Object.assign(d, { varieties: 'v', legacySizes: 's', legacyColors: 'c' });
        expect(buildPayload(d)).toMatchObject({ varieties: 'v', sizes: 's', colors: 'c' });
    });

    it('leaves sku out for a product that has none yet', () => {
        const d = needle(); d.sku = '';
        expect(buildPayload(d).sku).toBeUndefined();
    });

    it('sizes and colors carry refs, order, the stock basis and trimmed text', () => {
        const d = needle();
        d.sizes[0].labelTh = ' ใหญ่ '; d.sizes[0].boxCost = '1500';
        d.sizes[0].colors = [
            { ...blankColor('Red'), id: 21, ref: 'c21', stock: '120', stockLoaded: 100, sku: ' R ', hex: '#c0392b', nameTh: 'แดง' },
            { ...blankColor('Navy'), stock: 5, stockLoaded: 999, sku: 'N', isVisible: false },
        ];
        const [size] = buildPayload(d).inventory.sizes;
        expect(size).toMatchObject({ ref: d.sizes[0].ref, id: null, label: '100 pcs', label_th: 'ใหญ่', sort_order: 0, box_cost: 1500 });
        expect(size.colors).toEqual([
            { ref: 'c21', id: 21, name: 'Red', name_th: 'แดง', hex: '#c0392b', sku: 'R', stock: 120, stock_loaded: 100, is_visible: true, sort_order: 0 },
            { ref: d.sizes[0].colors[1].ref, id: null, name: 'Navy', name_th: null, hex: null, sku: 'N', stock: 5, stock_loaded: 0, is_visible: false, sort_order: 1 },
        ]);
    });

    it('uses the first size for the base prices, unless a legacy base is pinned', () => {
        const d = needle();
        d.sizes.push({ ...blankSize('200 pcs'), prices: [9, 9, 9, 9, 9], colors: [{ ...blankColor('Standard'), sku: 'Z' }] });
        expect(buildPayload(d).price_1).toBe(2000);
        expect(buildPayload(d).inventory.base_prices).toBeNull();

        d.baseFromLegacy = [800, 0, 0, 0, 0];
        const p = buildPayload(d);
        expect([p.price_1, p.price_2, p.price]).toEqual([800, 0, 0]);
        expect(p.inventory.base_prices).toEqual([800, 0, 0, 0, 0]);
    });

    it('writes blank levels as 0 in the legacy fields but null in the size', () => {
        const d = needle();
        d.sizes[0].prices = [2000, null, null, null, null];
        const p = buildPayload(d);
        expect([p.price_1, p.price_2]).toEqual([2000, 0]);
        expect(p.inventory.sizes[0].prices).toEqual([2000, null, null, null, null]);
    });

    it('keeps the main photo out of the image rows unless it already was one or is attributed', () => {
        const d = needle();
        d.images = [
            imageCard({ image_key: 'main' }, { isMain: true, inRows: false }),
            imageCard({ image_key: 'old-main' }, { inRows: false }),               // was the main, now a gallery photo
            imageCard({ image_key: 'row-main' }, { isMain: false, inRows: true }),
        ];
        const keys = (x) => buildPayload(x).images.map((i) => i.image_key);
        expect(keys(d)).toEqual(['old-main', 'row-main']);
        expect(buildPayload(d).image_key).toBe('main');

        d.images[0].sizeRef = d.sizes[0].ref;                                      // attributed -> must be a row
        expect(keys(d)).toEqual(['main', 'old-main', 'row-main']);
    });

    it('turns refs into what the Worker reads: size_ref and the color name', () => {
        const d = needle();
        const red = { ...blankColor('Red'), sku: 'R' };
        d.sizes[0].colors.push(red);
        d.images = [
            imageCard({ image_key: 'a' }, { sizeRef: d.sizes[0].ref, colorRef: red.ref }),
            imageCard({ image_key: 'b' }, { colorRef: red.ref }),
            imageCard({ image_key: 'c' }),
        ];
        expect(buildPayload(d).images).toEqual([
            { image_key: 'a', is_main: false, size_ref: d.sizes[0].ref, color_name: 'Red' },
            { image_key: 'b', is_main: false, size_ref: null, color_name: 'Red' },
            { image_key: 'c', is_main: false, size_ref: null, color_name: null },
        ]);
    });

    it('sends an unattributed legacy variant as a passthrough row', () => {
        const d = needle();
        d.images = [imageCard({ image_key: 'p' }, {
            passthrough: { attribute_type: 'variant_link', attribute_value: '', prices: [5, null, null, null, null] },
        })];
        expect(buildPayload(d).images).toEqual([{
            image_key: 'p', is_main: false, passthrough: true, attribute_type: 'variant_link', attribute_value: '',
            price_1: 5, price_2: null, price_3: null, price_4: null, price_5: null,
        }]);
    });

    it('drops attributions that point at removed colors instead of sending a bad request', () => {
        const d = needle();
        d.images = [imageCard({ image_key: 'a' }, { sizeRef: 'gone', colorRef: 'gone' })];
        expect(buildPayload(d).images).toEqual([{ image_key: 'a', is_main: false, size_ref: null, color_name: null }]);
    });

    it('refuses to build while an image has not been uploaded', () => {
        const d = needle();
        d.images = [imageCard({}, { isNew: true })];
        expect(() => buildPayload(d)).toThrow(/uploaded/);
    });

    it('an untouched import keeps the moq text and the original base prices', () => {
        const d = buildDraft(product({
            moq: '20', price_1: 800,
            images: [variant(1, 'v1', '4.5"', { price_1: 900 }), variant(2, 'v2', 'Plain')],
        }), null);
        const p = buildPayload(d);
        expect(p.moq).toBe('20');
        expect(p.price_1).toBe(800);
        expect(p.inventory.base_prices).toEqual([800, 0, 0, 0, 0]);
        expect(p.inventory.sizes.map((s) => [s.label, s.prices[0]])).toEqual([['4.5"', 900], ['Plain', 800]]);
        expect(p.images.map((i) => [i.image_key, i.size_ref])).toEqual([
            ['v1', d.sizes[0].ref], ['v2', d.sizes[1].ref],
        ]);
    });
});
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `npx vitest run src/utils/adminProductEdit.spec.js`
Expected: the Task 5 describes still pass; every new describe fails with `... is not a function` / `undefined`.

- [ ] **Step 3: Append the implementation** to `adminProductEdit.js`:

```js
// ── Usage (the storefront reads products.usage as [{ type, example }] JSON) ──

export const USAGE_OPTIONS = [
    { en: 'sewing', th: 'งานเย็บ' },
    { en: 'crafting', th: 'งานประดิษฐ์' },
    { en: 'school activity', th: 'กิจกรรมโรงเรียน' },
    { en: 'temple activity', th: 'กิจกรรมวัด' },
    { en: 'decorating', th: 'ตกแต่ง' },
    { en: 'crocheting', th: 'งานถักโครเช' },
    { en: 'beading', th: 'งานร้อย' },
    { en: 'origami', th: 'งานกระดาษพับ' },
    { en: 'ribbon crafting', th: 'งานริบบิ้น' },
    { en: 'ribbon folding', th: 'งานพับเหรียญ' },
    { en: 'hand hemming', th: 'งานสอย' },
    { en: 'punching', th: 'งานตอก' },
];

const parseUsageSide = (text) => {
    if (!text) return [];
    try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return parsed;
    } catch {
        // older rows hold a comma-separated list
    }
    return String(text).split(',').map((s) => s.trim()).filter(Boolean).map((type) => ({ type, example: '' }));
};

// Entries are { en, th, example, example_th }, one per selected usage type.
export const parseUsage = (raw, rawTh) => {
    const en = parseUsageSide(raw);
    const th = parseUsageSide(rawTh);
    return en.map((entry, i) => {
        const option = USAGE_OPTIONS.find((o) => o.en === entry.type);
        return {
            en: entry.type || '',
            th: th[i]?.type || option?.th || entry.type || '',
            example: entry.example || '',
            example_th: th[i]?.example || '',
        };
    });
};

export const serializeUsage = (entries) => (entries.length === 0
    ? { usage: '', usageTh: '' }
    : {
        usage: JSON.stringify(entries.map((e) => ({ type: e.en, example: e.example || '' }))),
        usageTh: JSON.stringify(entries.map((e) => ({ type: e.th || e.en, example: e.example_th || '' }))),
    });

// ── Images ────────────────────────────────────────────────────────

const categoriesOf = (p) => {
    if (Array.isArray(p.categories) && p.categories.length) return p.categories.filter(Boolean);
    return p.category ? [p.category] : [];
};

// One card in the image grid. `inRows`: the photo has (or will get) a product_images row.
export const imageCard = (img = {}, over = {}) => ({
    uid: img.id ? `i${img.id}` : nextRef('ni'),
    image_key: img.image_key || null,
    isMain: false, inRows: true, isNew: false, file: null, preview: null,
    sizeRef: null, colorRef: null, passthrough: null,
    ...over,
});

export const setMain = (images, uid) => images.map((img) => ({ ...img, isMain: img.uid === uid }));

export const findColor = (sizes, colorRef) => {
    for (const size of sizes) {
        const color = size.colors.find((c) => c.ref === colorRef);
        if (color) return { size, color };
    }
    return null;
};

// What the color select offers: one size's colors, or each distinct name across all sizes.
export const colorOptions = (sizes, sizeRef) => {
    const pick = (c) => ({ ref: c.ref, name: c.name, hex: c.hex });
    if (sizeRef) return (sizes.find((s) => s.ref === sizeRef)?.colors || []).map(pick);
    const seen = new Set();
    const out = [];
    for (const s of sizes) {
        for (const c of s.colors) {
            if (c.name.trim() && !seen.has(c.name)) {
                seen.add(c.name);
                out.push(pick(c));
            }
        }
    }
    return out;
};

// Changing an image's size keeps its color when that size has one of the same name.
export const withSize = (img, sizeRef, sizes) => {
    const next = { ...img, sizeRef: sizeRef || null };
    if (!next.sizeRef || !next.colorRef) return next;
    const size = sizes.find((s) => s.ref === next.sizeRef);
    if (!size || size.colors.some((c) => c.ref === next.colorRef)) return next;
    const current = findColor(sizes, next.colorRef);
    const same = current && size.colors.find((c) => c.name === current.color.name);
    return { ...next, colorRef: same ? same.ref : null };
};

// After sizes or colors were removed: an image that pointed at one of them falls back to
// "all" instead of keeping a reference the Worker would reject.
export const reconcileImages = (images, sizes) => images.map((img) => {
    if (img.passthrough) return img;
    let { sizeRef, colorRef } = img;
    const size = sizeRef ? sizes.find((s) => s.ref === sizeRef) : null;
    if (sizeRef && !size) {
        sizeRef = null;
        colorRef = null;
    }
    if (colorRef) {
        const hit = findColor(sizes, colorRef);
        if (!hit || (size && hit.size.ref !== size.ref)) colorRef = null;
    }
    return sizeRef === img.sizeRef && colorRef === img.colorRef ? img : { ...img, sizeRef, colorRef };
});

// The inverse of the Worker's label rule: "<color> / <size>", "<size>" or "<color>".
export const attributionOf = (label, sizes) => {
    const text = str(label).trim();
    if (!text) return null;
    const bySize = (l) => sizes.find((s) => s.label === l);
    const whole = bySize(text);
    if (whole) return { sizeRef: whole.ref, colorRef: null };
    const cut = text.lastIndexOf(' / ');
    if (cut > 0) {
        const size = bySize(text.slice(cut + 3));
        const color = size?.colors.find((c) => c.name === text.slice(0, cut));
        if (size && color) return { sizeRef: size.ref, colorRef: color.ref };
    }
    for (const s of sizes) {
        const color = s.colors.find((c) => c.name === text);
        if (color) return { sizeRef: null, colorRef: color.ref };
    }
    return null;
};

// ── Building a draft ──────────────────────────────────────────────

const rowPrices = (row) => [1, 2, 3, 4, 5].map((n) => num(row?.[`price_${n}`]));
// 0 on the product itself means "not set".
const basePricesOf = (p) => rowPrices(p).map((v) => (v ? v : null));
const legacyRow = (img) => ({
    attribute_type: img.attribute_type, attribute_value: img.attribute_value ?? '', prices: rowPrices(img),
});

const sizeWith = (label, prices, percents) => ({ ...blankSize(label), prices, manual: detectManual(prices, percents) });

/**
 * A product that has never been saved with sizes: one size per distinct variant label
 * (prices copied from that row when it sets any of L1-L3, else the product's base prices),
 * or one "Standard" size when it has no variants. Nothing is divided or rounded.
 */
export const importLegacy = (product, percents = DEFAULT_PERCENTS) => {
    const rows = product.images || [];
    const labelled = rows.filter((img) => img.attribute_type === 'variant_link' && str(img.attribute_value).trim());
    const base = basePricesOf(product);

    const sizes = [];
    const refByLabel = new Map();
    for (const rowImg of labelled) {
        const label = str(rowImg.attribute_value).trim();
        if (refByLabel.has(label)) continue;
        const overrides = [rowImg.price_1, rowImg.price_2, rowImg.price_3].some((p) => p !== null && p !== undefined);
        const size = sizeWith(label, overrides ? rowPrices(rowImg) : base, percents);
        refByLabel.set(label, size.ref);
        sizes.push(size);
    }
    if (sizes.length === 0) sizes.push(sizeWith('Standard', base, percents));

    const images = rows.map((img) => {
        if (img.attribute_type !== 'variant_link') return imageCard(img);
        const label = str(img.attribute_value).trim();
        return label ? imageCard(img, { sizeRef: refByLabel.get(label) }) : imageCard(img, { passthrough: legacyRow(img) });
    });

    // The product's own base prices are what the storefront falls back to, so a product with
    // variants keeps them until the owner edits the first size.
    const baseFromLegacy = labelled.length ? rowPrices(product).map((v) => v ?? 0) : null;
    return { sizes, images, baseFromLegacy };
};

const sizesFromInventory = (data, percents) => (data.sizes || []).map((s) => {
    const prices = [0, 1, 2, 3, 4].map((i) => num(s.prices?.[i]));
    return {
        ref: `s${s.id}`, id: s.id, label: s.label, labelTh: str(s.label_th), boxCost: s.box_cost ?? '',
        prices, manual: detectManual(prices, percents),
        colors: (s.colors || []).map((c) => ({
            ref: `c${c.id}`, id: c.id, name: c.name, nameTh: str(c.name_th), hex: str(c.hex), sku: str(c.sku), skuManual: true,
            stock: c.stock, stockLoaded: c.stock, isVisible: c.is_visible !== false && c.is_visible !== 0,
        })),
    };
});

const fromSaved = (product, inventory, percents) => {
    const sizes = sizesFromInventory(inventory, percents);
    const images = (product.images || []).map((img) => {
        if (img.attribute_type !== 'variant_link') return imageCard(img);
        const hit = attributionOf(img.attribute_value, sizes);
        return hit ? imageCard(img, hit) : imageCard(img, { passthrough: legacyRow(img) });
    });
    return { sizes, images, baseFromLegacy: null };
};

// products.image_key is the main photo. It usually has no product_images row, so it becomes
// a card of its own; when a row already uses that key, that row is the main card.
const withMain = (images, mainKey) => {
    if (!mainKey) return images;
    const hit = images.findIndex((i) => i.image_key === mainKey);
    if (hit >= 0) return images.map((img, i) => ({ ...img, isMain: i === hit }));
    return [imageCard({ image_key: mainKey }, { isMain: true, inRows: false }), ...images];
};

export const blankDraft = () => ({
    id: null, sku: '',
    name: '', nameTh: '', description: '', descriptionTh: '', attribute: '', attributeTh: '',
    usage: '', usageTh: '',
    categories: [], isVisible: true,
    varieties: null, legacySizes: null, legacyColors: null,
    moqOriginal: null, piecesPerBox: '',
    baseFromLegacy: null,
    sizes: [blankSize()],
    images: [],
});

/**
 * The panel's working copy of a product. `inventory` is GET /products/:id/inventory, or
 * null/empty for a product that was never saved with sizes (it is imported instead).
 */
export const buildDraft = (product, inventory, percents = DEFAULT_PERCENTS) => {
    const saved = Boolean(inventory?.sizes?.length);
    const source = saved ? fromSaved(product, inventory, percents) : importLegacy(product, percents);
    const sku = str(product.sku);
    return {
        id: product.id, sku,
        name: str(product.name), nameTh: str(product.name_th),
        description: str(product.description), descriptionTh: str(product.description_th),
        attribute: str(product.attribute), attributeTh: str(product.attribute_th),
        usage: str(product.usage), usageTh: str(product.usage_th),
        categories: categoriesOf(product),
        isVisible: !(product.is_visible === 0 || product.is_visible === false),
        varieties: product.varieties ?? null, legacySizes: product.sizes ?? null, legacyColors: product.colors ?? null,
        moqOriginal: product.moq ?? null, piecesPerBox: piecesFromMoq(product.moq),
        baseFromLegacy: source.baseFromLegacy,
        sizes: refreshSkus(source.sizes, sku),
        images: withMain(source.images, product.image_key),
    };
};

// ── Status, validation, dirty check ───────────────────────────────

// Whether an image becomes a product_images row. A main photo that was never a row and
// belongs to no size or color stays in products.image_key only, as the old form kept it.
const attributed = (img) => Boolean(img.sizeRef || img.colorRef || img.passthrough);
const writesRow = (img) => !(img.isMain && !img.inRows && !attributed(img));

export const completeness = (draft) => {
    const checks = {
        info: Boolean(draft.name.trim() && (draft.description.trim() || draft.descriptionTh.trim())),
        image: draft.images.some((i) => i.isMain),
        prices: draft.sizes.length > 0
            && draft.sizes.every((s) => s.prices.every((p) => num(p) > 0))
            && normalizePieces(draft.piecesPerBox) !== null,
        stock: draft.sizes.length > 0
            && draft.sizes.every((s) => s.colors.length > 0 && s.colors.every((c) => c.sku.trim() && num(c.stock) !== null)),
    };
    const done = Object.values(checks).filter(Boolean).length;
    return { checks, percent: Math.round((done / 4) * 100), complete: done === 4 };
};

// The website lists a product by its photos: once any photo is tied to a size or color, a
// size without its own photo can be invoiced but not ordered online. Returns how many.
export const unorderableSizes = (draft) => {
    const rows = draft.images.filter(writesRow);
    const usesVariants = rows.some((i) => i.sizeRef || i.colorRef || i.passthrough?.attribute_type === 'variant_link');
    if (!usesVariants) return 0;
    return draft.sizes.filter((s) => !rows.some((i) => i.sizeRef === s.ref)).length;
};

// First problem that would make the Worker refuse the save, as { key, arg? } (the key names
// a message in adminProductEditText), or null.
export const validateDraft = (draft) => {
    if (!draft.name.trim()) return { key: 'name' };
    if (draft.categories.length === 0) return { key: 'category' };
    if (str(draft.piecesPerBox).trim() !== '' && normalizePieces(draft.piecesPerBox) === null) return { key: 'pieces' };
    const labels = new Set();
    const skus = new Set();
    for (const s of draft.sizes) {
        const label = s.label.trim();
        if (!label) return { key: 'sizeLabel' };
        if (labels.has(label)) return { key: 'sizeDuplicate', arg: label };
        labels.add(label);
        if (s.colors.length === 0) return { key: 'colorNone', arg: label };
        const names = new Set();
        for (const c of s.colors) {
            const name = c.name.trim();
            if (!name) return { key: 'colorName', arg: label };
            if (names.has(name)) return { key: 'colorDuplicate', arg: name };
            names.add(name);
            const sku = c.sku.trim();
            if (sku) {
                if (skus.has(sku)) return { key: 'skuDuplicate', arg: sku };
                skus.add(sku);
            }
        }
    }
    return null;
};

// A string copy of everything the owner can edit (no File objects or blob URLs), so
// "unsaved changes" is a string comparison.
export const snapshot = (draft) => JSON.stringify({
    ...draft,
    images: draft.images.map(({ file, preview, ...rest }) => rest),
});

export const isDirty = (draft, original) => snapshot(draft) !== original;

// ── The save request ──────────────────────────────────────────────

const imagePayload = (img, sizes) => {
    if (!img.image_key) throw new Error('An image has not been uploaded yet');
    const base = { image_key: img.image_key, is_main: Boolean(img.isMain) };
    if (img.passthrough) {
        const p = img.passthrough;
        return {
            ...base, passthrough: true, attribute_type: p.attribute_type, attribute_value: p.attribute_value,
            price_1: p.prices[0], price_2: p.prices[1], price_3: p.prices[2], price_4: p.prices[3], price_5: p.prices[4],
        };
    }
    return { ...base, size_ref: img.sizeRef, color_name: img.colorRef ? findColor(sizes, img.colorRef).color.name : null };
};

/**
 * The body for POST /products or PUT /products/:id. Every image must already have its
 * image_key (the panel uploads new files first). Prices are per box, exactly as typed.
 */
export const buildPayload = (draft) => {
    const sizes = draft.sizes.map((s, si) => ({
        ref: s.ref, id: s.id, label: s.label.trim(), label_th: s.labelTh.trim() || null, sort_order: si,
        box_cost: num(s.boxCost),
        prices: s.prices.map(num),
        colors: s.colors.map((c, ci) => ({
            ref: c.ref, id: c.id, name: c.name.trim(), name_th: c.nameTh.trim() || null, hex: c.hex || null,
            sku: c.sku.trim() || null, stock: Math.trunc(Number(c.stock) || 0),
            stock_loaded: c.id === null ? 0 : c.stockLoaded, is_visible: c.isVisible, sort_order: ci,
        })),
    }));

    const base = draft.baseFromLegacy || sizes[0]?.prices || [];
    const baseAt = (i) => num(base[i]) ?? 0;
    const images = reconcileImages(draft.images, draft.sizes);
    const main = images.find((i) => i.isMain);

    return {
        name: draft.name.trim(),
        name_th: draft.nameTh.trim() || null,
        description: draft.description,
        description_th: draft.descriptionTh || null,
        price: baseAt(2),
        category: draft.categories[0],
        categories: draft.categories,
        image_key: main?.image_key || null,
        usage: draft.usage || null,
        usage_th: draft.usageTh || null,
        attribute: draft.attribute || null,
        attribute_th: draft.attributeTh || null,
        varieties: draft.varieties,
        sizes: draft.legacySizes,
        colors: draft.legacyColors,
        price_1: baseAt(0), price_2: baseAt(1), price_3: baseAt(2), price_4: baseAt(3), price_5: baseAt(4),
        moq: moqText(draft.moqOriginal, draft.piecesPerBox),
        is_visible: draft.isVisible,
        sku: draft.sku || undefined,
        inventory: { sizes, base_prices: draft.baseFromLegacy },
        images: images.filter(writesRow).map((img) => imagePayload(img, draft.sizes)),
    };
};
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/utils/adminProductEdit.spec.js`
Expected: PASS for the whole file.

- [ ] **Step 5: Run the whole frontend suite**

Run: `npx vitest run`
Expected: all pass.

**Checkpoint:** all draft/payload logic is covered, including the owner's needle example and the untouched-import invariants.

---

### Task 7: Frontend copy — EN / ไทย text util and the inventory toast

**Files:**
- Create: `frontend/kitweb/src/utils/adminProductEditText.js`
- Create: `frontend/kitweb/src/utils/adminProductEditText.spec.js`
- Modify: `frontend/kitweb/src/utils/adminInventoryText.js` (add `toastSaved` to `en` and `th`)

**Interfaces:**
- Produces: `productEditText(lang): Record<string, string | ((...args) => string)>` — the same keys in both languages. Components read `t.<key>` and call function keys as `t.key(arg)`. Keys are listed in the code below; later tasks use exactly these names.

- [ ] **Step 1: Write the failing spec** — `adminProductEditText.spec.js`:

```js
import { describe, it, expect } from 'vitest';
import { productEditText } from './adminProductEditText';
import { inventoryText } from './adminInventoryText';

describe('productEditText', () => {
    const en = productEditText('en');
    const th = productEditText('th');

    it('has the same keys in both languages', () => {
        expect(Object.keys(th).sort()).toEqual(Object.keys(en).sort());
    });

    it('has no empty entry, and every function entry returns text', () => {
        for (const [name, t] of [['en', en], ['th', th]]) {
            for (const [key, value] of Object.entries(t)) {
                if (typeof value === 'function') expect(String(value(2, 3)), `${name}.${key}`).not.toBe('');
                else expect(value, `${name}.${key}`).toBeTruthy();
            }
        }
    });

    it('names the five levels as the owner does', () => {
        expect([en.lvl1, en.lvl2, en.lvl3, en.lvl4, en.lvl5]).toEqual(['Retail', 'Small wholesale', 'Wholesale', 'Special A', 'Special B']);
    });

    it('falls back to English for an unknown language', () => {
        expect(productEditText('xx')).toBe(en);
    });

    it('says plainly that removing archives', () => {
        expect(en.removedNote).toMatch(/archived/i);
        expect(en.removedNote).not.toMatch(/delete[^d]/i);
    });
});

describe('inventoryText.toastSaved', () => {
    it('exists in both languages', () => {
        expect(inventoryText('en').toastSaved).toBeTruthy();
        expect(inventoryText('th').toastSaved).toBeTruthy();
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/utils/adminProductEditText.spec.js`
Expected: FAIL — cannot resolve `./adminProductEditText`.

- [ ] **Step 3: Write the copy** — `adminProductEditText.js`:

```js
// Copy for the Edit product slide-over, English and Thai side by side so the two can't
// drift (adminProductEditText.spec.js checks both have the same entries). Staff-only, so it
// lives here and not in the site's i18n files.
//
// Wording rule: nothing here promises or threatens a deletion. Removing a size or color
// archives it.

const en = {
  titleEdit: 'Edit product',
  titleAdd: 'Add product',
  crumb: 'Standard Inventory',
  close: 'Close',
  loading: 'Loading product…',
  loadError: 'Could not load the sizes and colors of this product.',
  retry: 'Try again',
  cancel: 'Cancel',
  archive: 'Archive',
  saveDraft: 'Save as draft',
  update: 'Update product',
  add: 'Add product',
  saving: 'Saving…',
  uploading: 'Uploading photos…',
  discardTitle: 'Discard your changes?',
  discardBody: 'You have edits that are not saved yet.',
  keepEditing: 'Keep editing',
  discard: 'Discard',
  saveFailed: (message) => `Could not save: ${message}`,
  skuFailed: 'Could not get a new SKU. Try again.',
  uploadFailed: 'A photo could not be uploaded. Nothing was saved.',

  problemName: 'Add a product name.',
  problemCategory: 'Choose at least one category.',
  problemPieces: 'Pieces per box must be a whole number of 1 or more.',
  problemSizeLabel: 'Every size needs a name, like “25 g”.',
  problemSizeDuplicate: (label) => `There are two sizes called “${label}”.`,
  problemColorNone: (label) => `Size “${label}” needs at least one color.`,
  problemColorName: (label) => `Every color in “${label}” needs a name.`,
  problemColorDuplicate: (name) => `There are two colors called “${name}” in one size.`,
  problemSkuDuplicate: (sku) => `The SKU ${sku} is used twice.`,

  statusTitle: 'Product status',
  statusAllGood: 'All required info is complete. Ready to update.',
  ckInfo: 'Product name & description',
  ckImage: 'Main image',
  ckPrices: 'Box prices (Levels 1–5) & pieces per box',
  ckStock: 'Stock & SKU on every color',
  hintNoPhoto: (n) => (n === 1
    ? '1 size has no photo. It can be invoiced, but customers cannot order it on the website.'
    : `${n} sizes have no photo. They can be invoiced, but customers cannot order them on the website.`),

  displayTitle: 'Display on website',
  displayOn: 'Visible to customers on the storefront',
  displayOff: 'Hidden from the storefront (staff only)',

  catTitle: 'Categories & SKU',
  catAdd: '+ Add category…',
  catHint: 'The first (brown) category generates the SKU.',
  catRemove: 'Remove category',
  skuBase: 'SKU base',
  skuPending: 'Chosen when you pick a category',
  skuExample: (sku) => `Size and color codes are added automatically, e.g. ${sku}-25G-RED.`,

  basicTitle: 'Basic info',
  basicSub: 'Each material is its own product. Sizes and colors are set below.',
  nameEn: 'Product name (English)',
  nameTh: 'Product name (ไทย)',
  desc: 'Description',
  descHint: 'Languages left empty are translated automatically.',
  attr: 'Attribute',
  attrPh: 'Material, weight, length…',
  usage: 'Usage',
  usageNone: 'Choose how customers use it',
  usageN: (n) => `${n} selected`,
  usageSearch: 'Search usages…',
  usageExample: 'Describe an example of this usage…',
  langEn: 'EN',
  langTh: 'ไทย',

  imgTitle: 'Images',
  imgSub: 'Mark one image as Main. For every other image, choose which size and color it belongs to.',
  imgMain: '★ Main',
  imgMakeMain: 'Make main',
  imgRemove: 'Remove image',
  imgAdd: 'Add images',
  imgDrop: 'or drop files here',
  imgAllSizes: 'All sizes',
  imgAllColors: 'All colors',
  imgSize: 'Size',
  imgColor: 'Color',
  imgPreview: 'View larger',
  imgPassthrough: (label) => `Linked to “${label}” (unchanged)`,
  imgClose: 'Close preview',

  szTitle: 'Sizes, colors & pricing',
  szSub: 'A size sets the box prices; a color sets the stock and SKU. Type the Level 5 price and the higher levels fill in from the formula.',
  szLevels: '⚙ Price levels',
  szAddSize: '+ Add size',
  szPieces: 'Pieces per box',
  szPiecesHint: 'Customers can only order whole boxes.',
  szPiecesExample: (pieces, perPiece) => `${pieces} per box → the website shows ฿${perPiece} per piece at Level 1`,
  szSizeLabel: 'Size / pack',
  szSizeTh: 'Size name (ไทย)',
  szCost: 'Factory cost ฿ per box',
  szOptional: 'optional',
  szMargin: (pct) => `Margin at Level 5: ${pct}%`,
  szTotalStock: 'Total stock',
  szProductStock: (n) => `All sizes: ${n} pcs`,
  szRemoveSize: 'Remove size',
  lvl1: 'Retail',
  lvl2: 'Small wholesale',
  lvl3: 'Wholesale',
  lvl4: 'Special A',
  lvl5: 'Special B',
  lvlStart: 'start here',
  lvlSub: (n, mult) => `Level ${n} · ${mult}`,
  rowBox: 'Box price ฿',
  rowPiece: 'Per piece ฿',
  rowHint: 'Grey prices follow the formula. Type over one to set it yourself; clear it to hand it back.',

  colTitle: 'Colors & stock',
  colSummary: (n, stock) => `${n} ${n === 1 ? 'color' : 'colors'} · ${stock} in stock`,
  colHeadColor: 'Color',
  colHeadSku: 'SKU',
  colHeadStock: 'Stock (pcs)',
  colHeadShow: 'Show',
  colAdd: '+ Add color',
  colRemove: 'Remove color',
  colNameTh: 'ไทย',
  colSwatch: 'Swatch color',
  colHiddenNote: 'A hidden color is off the website, and its photos move to the gallery.',
  removedNote: 'Removed sizes and colors are archived, not deleted.',

  fmTitle: 'Price levels',
  fmBody: 'Type the Level 5 price and Levels 1–4 fill in as a percentage of it. Prices you type yourself are never overwritten.',
  fmLabel: 'Percentages for Levels 1, 2, 3 and 4',
  fmPreview: (l5, list) => `Level 5 = ${l5} → Levels 1–4: ${list}`,
  fmInvalid: 'Enter four numbers above 0, separated by commas, e.g. 200, 180, 160, 130.',
  fmReset: 'Reset to 200, 180, 160, 130',
  fmSave: 'Save formula',
};

const th = {
  titleEdit: 'แก้ไขสินค้า',
  titleAdd: 'เพิ่มสินค้า',
  crumb: 'คลังสินค้ามาตรฐาน',
  close: 'ปิด',
  loading: 'กำลังโหลดสินค้า…',
  loadError: 'โหลดขนาดและสีของสินค้านี้ไม่สำเร็จ',
  retry: 'ลองอีกครั้ง',
  cancel: 'ยกเลิก',
  archive: 'เก็บถาวร',
  saveDraft: 'บันทึกเป็นฉบับร่าง',
  update: 'อัปเดตสินค้า',
  add: 'เพิ่มสินค้า',
  saving: 'กำลังบันทึก…',
  uploading: 'กำลังอัปโหลดรูป…',
  discardTitle: 'ทิ้งการเปลี่ยนแปลงหรือไม่?',
  discardBody: 'คุณมีการแก้ไขที่ยังไม่ได้บันทึก',
  keepEditing: 'แก้ไขต่อ',
  discard: 'ทิ้ง',
  saveFailed: (message) => `บันทึกไม่สำเร็จ: ${message}`,
  skuFailed: 'ขอ SKU ใหม่ไม่สำเร็จ ลองอีกครั้ง',
  uploadFailed: 'อัปโหลดรูปไม่สำเร็จ ยังไม่มีอะไรถูกบันทึก',

  problemName: 'กรุณาใส่ชื่อสินค้า',
  problemCategory: 'กรุณาเลือกอย่างน้อยหนึ่งหมวดหมู่',
  problemPieces: 'จำนวนชิ้นต่อกล่องต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป',
  problemSizeLabel: 'ทุกขนาดต้องมีชื่อ เช่น “25 g”',
  problemSizeDuplicate: (label) => `มีขนาดชื่อ “${label}” สองรายการ`,
  problemColorNone: (label) => `ขนาด “${label}” ต้องมีอย่างน้อยหนึ่งสี`,
  problemColorName: (label) => `ทุกสีในขนาด “${label}” ต้องมีชื่อ`,
  problemColorDuplicate: (name) => `มีสีชื่อ “${name}” สองรายการในขนาดเดียวกัน`,
  problemSkuDuplicate: (sku) => `SKU ${sku} ซ้ำกัน`,

  statusTitle: 'สถานะสินค้า',
  statusAllGood: 'ข้อมูลที่จำเป็นครบแล้ว พร้อมอัปเดต',
  ckInfo: 'ชื่อและคำอธิบายสินค้า',
  ckImage: 'รูปหลัก',
  ckPrices: 'ราคาต่อกล่อง (ระดับ 1–5) และจำนวนชิ้นต่อกล่อง',
  ckStock: 'สต็อกและ SKU ของทุกสี',
  hintNoPhoto: (n) => `${n} ขนาดยังไม่มีรูป ออกใบแจ้งหนี้ได้ แต่ลูกค้ายังสั่งซื้อบนเว็บไซต์ไม่ได้`,

  displayTitle: 'แสดงบนเว็บไซต์',
  displayOn: 'ลูกค้าเห็นสินค้านี้บนหน้าร้าน',
  displayOff: 'ซ่อนจากหน้าร้าน (เฉพาะพนักงาน)',

  catTitle: 'หมวดหมู่และ SKU',
  catAdd: '+ เพิ่มหมวดหมู่…',
  catHint: 'หมวดหมู่แรก (สีน้ำตาล) ใช้สร้าง SKU',
  catRemove: 'เอาหมวดหมู่ออก',
  skuBase: 'SKU หลัก',
  skuPending: 'จะกำหนดเมื่อเลือกหมวดหมู่',
  skuExample: (sku) => `รหัสขนาดและสีจะเพิ่มให้อัตโนมัติ เช่น ${sku}-25G-RED`,

  basicTitle: 'ข้อมูลพื้นฐาน',
  basicSub: 'วัสดุแต่ละอย่างเป็นสินค้าแยกกัน ตั้งขนาดและสีด้านล่าง',
  nameEn: 'ชื่อสินค้า (English)',
  nameTh: 'ชื่อสินค้า (ไทย)',
  desc: 'คำอธิบาย',
  descHint: 'ภาษาที่เว้นว่างไว้จะถูกแปลให้อัตโนมัติ',
  attr: 'คุณสมบัติ',
  attrPh: 'วัสดุ น้ำหนัก ความยาว…',
  usage: 'การใช้งาน',
  usageNone: 'เลือกวิธีที่ลูกค้าใช้งาน',
  usageN: (n) => `เลือกแล้ว ${n}`,
  usageSearch: 'ค้นหาการใช้งาน…',
  usageExample: 'อธิบายตัวอย่างของการใช้งานนี้…',
  langEn: 'EN',
  langTh: 'ไทย',

  imgTitle: 'รูปภาพ',
  imgSub: 'เลือกหนึ่งรูปเป็นรูปหลัก ส่วนรูปอื่นให้เลือกว่าเป็นของขนาดและสีใด',
  imgMain: '★ รูปหลัก',
  imgMakeMain: 'ตั้งเป็นรูปหลัก',
  imgRemove: 'เอารูปออก',
  imgAdd: 'เพิ่มรูป',
  imgDrop: 'หรือลากไฟล์มาวาง',
  imgAllSizes: 'ทุกขนาด',
  imgAllColors: 'ทุกสี',
  imgSize: 'ขนาด',
  imgColor: 'สี',
  imgPreview: 'ดูรูปใหญ่',
  imgPassthrough: (label) => `ผูกกับ “${label}” (ไม่เปลี่ยนแปลง)`,
  imgClose: 'ปิดตัวอย่าง',

  szTitle: 'ขนาด สี และราคา',
  szSub: 'ขนาดกำหนดราคาต่อกล่อง ส่วนสีกำหนดสต็อกและ SKU ใส่ราคาระดับ 5 แล้วระดับที่สูงกว่าจะคำนวณให้ตามสูตร',
  szLevels: '⚙ ระดับราคา',
  szAddSize: '+ เพิ่มขนาด',
  szPieces: 'จำนวนชิ้นต่อกล่อง',
  szPiecesHint: 'ลูกค้าสั่งได้เฉพาะเป็นกล่องเต็ม',
  szPiecesExample: (pieces, perPiece) => `${pieces} ชิ้นต่อกล่อง → เว็บไซต์แสดง ฿${perPiece} ต่อชิ้นที่ระดับ 1`,
  szSizeLabel: 'ขนาด / แพ็ก',
  szSizeTh: 'ชื่อขนาด (ไทย)',
  szCost: 'ต้นทุนโรงงาน ฿ ต่อกล่อง',
  szOptional: 'ไม่บังคับ',
  szMargin: (pct) => `กำไรที่ระดับ 5: ${pct}%`,
  szTotalStock: 'สต็อกรวม',
  szProductStock: (n) => `ทุกขนาด: ${n} ชิ้น`,
  szRemoveSize: 'เอาขนาดออก',
  lvl1: 'ขายปลีก',
  lvl2: 'ขายส่งย่อย',
  lvl3: 'ขายส่ง',
  lvl4: 'พิเศษ A',
  lvl5: 'พิเศษ B',
  lvlStart: 'เริ่มที่นี่',
  lvlSub: (n, mult) => `ระดับ ${n} · ${mult}`,
  rowBox: 'ราคาต่อกล่อง ฿',
  rowPiece: 'ต่อชิ้น ฿',
  rowHint: 'ราคาสีเทาคำนวณตามสูตร พิมพ์ทับเพื่อกำหนดเอง ลบออกเพื่อให้กลับไปใช้สูตร',

  colTitle: 'สีและสต็อก',
  colSummary: (n, stock) => `${n} สี · คงเหลือ ${stock}`,
  colHeadColor: 'สี',
  colHeadSku: 'SKU',
  colHeadStock: 'สต็อก (ชิ้น)',
  colHeadShow: 'แสดง',
  colAdd: '+ เพิ่มสี',
  colRemove: 'เอาสีออก',
  colNameTh: 'ไทย',
  colSwatch: 'สีตัวอย่าง',
  colHiddenNote: 'สีที่ซ่อนจะไม่แสดงบนเว็บไซต์ และรูปของสีนั้นจะย้ายไปอยู่ในแกลเลอรี',
  removedNote: 'ขนาดและสีที่เอาออกจะถูกเก็บถาวร ไม่ถูกลบ',

  fmTitle: 'ระดับราคา',
  fmBody: 'ใส่ราคาระดับ 5 แล้วระดับ 1–4 จะคำนวณเป็นเปอร์เซ็นต์ของราคานั้น ราคาที่คุณพิมพ์เองจะไม่ถูกเขียนทับ',
  fmLabel: 'เปอร์เซ็นต์ของระดับ 1, 2, 3 และ 4',
  fmPreview: (l5, list) => `ระดับ 5 = ${l5} → ระดับ 1–4: ${list}`,
  fmInvalid: 'ใส่ตัวเลข 4 ค่าที่มากกว่า 0 คั่นด้วยจุลภาค เช่น 200, 180, 160, 130',
  fmReset: 'กลับเป็น 200, 180, 160, 130',
  fmSave: 'บันทึกสูตร',
};

export const productEditText = (lang) => (lang === 'th' ? th : en);
```

- [ ] **Step 4: Add the page toast.** In `adminInventoryText.js`, in `en` after `toastDuplicated: …` add `toastSaved: 'Product saved.',` and in `th` after its `toastDuplicated` add `toastSaved: 'บันทึกสินค้าแล้ว',`.

- [ ] **Step 5: Run the text specs and the whole suite**

Run: `npx vitest run src/utils/adminProductEditText.spec.js src/utils/adminInventoryText.spec.js`
Expected: PASS (the existing inventory text spec checks key parity, so `toastSaved` must be in both).
Run: `npx vitest run`
Expected: all green.

**Checkpoint:** all logic and copy for Part A's frontend is done and tested; only Vue components remain.

---

### Task 8: API call, stylesheet, switch, status card, categories card, basic info card

**Files:**
- Modify: `frontend/kitweb/src/services/api.js`
- Create: `frontend/kitweb/src/assets/admin-product-edit.css`
- Create: `frontend/kitweb/src/components/admin/product-edit/ProductSwitch.vue`
- Create: `frontend/kitweb/src/components/admin/product-edit/ProductStatusCard.vue`
- Create: `frontend/kitweb/src/components/admin/product-edit/ProductCategoriesCard.vue`
- Create: `frontend/kitweb/src/components/admin/product-edit/ProductBasicInfo.vue`

**Interfaces:**
- Consumes (Tasks 5–7): `completeness`, `unorderableSizes`, `USAGE_OPTIONS`, `parseUsage`, `serializeUsage` from `utils/adminProductEdit.js`; text keys from `productEditText`.
- Produces:
  - `api.getProductInventory(id): Promise<{ sizes: [...] }>` (admin; throws the usual `status: 401` error on an expired session)
  - `<ProductSwitch v-model="boolean" :label="string">`
  - `<ProductStatusCard :draft :t>`
  - `<ProductCategoriesCard :draft :categories :is-editing :lang :t @category-change @sku-change>`
  - `<ProductBasicInfo :draft :lang :t>`
  - the `.pe-*` classes every later component uses.
- Components receive the panel's one reactive `draft` object and edit its fields directly (`v-model="draft.name"`); only the panel replaces the whole draft.

There are no component tests (the repo has no Vue test utilities installed). Each component is checked by compiling it (Step 7), by Task 12's full-panel run, and by the logic specs behind it.

- [ ] **Step 1: Add the API call.** In `services/api.js`, directly after the `deleteProduct` method add:

```js
  // The sizes, colors and stock behind the admin product editor (admin only).
  async getProductInventory(id) {
    return getJson(`${API_URL}/products/${id}/inventory`, 'Failed to load sizes and colors', { auth: true });
  },
```

- [ ] **Step 2: Create the stylesheet** `assets/admin-product-edit.css`:

```css
/* Edit product slide-over (components/admin/product-edit). Everything is namespaced .pe-*
   and reads the --adm-* tokens that .adm-shell defines; nothing here touches the public
   site. App.vue forces fonts with !important, so the font rules are written one step
   higher, the same way admin-ui.css does for the other admin surfaces. */

html[lang][lang] :is(.pe-panel, .pe-dialog-back, .pe-lightbox, .pe-toast),
html[lang][lang] :is(.pe-panel, .pe-dialog-back, .pe-lightbox, .pe-toast) *,
html[lang][lang] :is(.pe-panel, .pe-dialog-back, .pe-lightbox, .pe-toast) *::before,
html[lang][lang] :is(.pe-panel, .pe-dialog-back, .pe-lightbox, .pe-toast) *::after {
  font-family: 'Work Sans', 'Noto Sans Thai', sans-serif !important;
}
html[lang][lang] .pe-panel .pe-serif { font-family: Lora, 'Noto Sans Thai', serif !important; }
.pe-panel *, .pe-dialog-back *, .pe-lightbox *, .pe-toast * { box-sizing: border-box; }

/* ── Shell ─────────────────────────────────────────────────── */
.pe-backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, .35); z-index: 200; }
.pe-panel {
  position: fixed; top: 0; right: 0; bottom: 0; z-index: 201;
  width: min(1180px, 96vw); display: flex; flex-direction: column;
  background: var(--adm-bg); color: var(--adm-text); font-size: 14px; line-height: 1.45;
  box-shadow: -6px 0 28px rgba(0, 0, 0, .18);
}
.pe-slide-enter-active { transition: transform .3s ease-out; }
.pe-slide-leave-active { transition: transform .3s ease-in; }
.pe-slide-enter-from, .pe-slide-leave-to { transform: translateX(100%); }
@media (prefers-reduced-motion: reduce) {
  .pe-slide-enter-active, .pe-slide-leave-active { transition: none; }
}

.pe-head, .pe-foot {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 10px 24px; background: rgba(255, 255, 255, .95);
}
.pe-head { border-bottom: 1px solid var(--adm-border); }
.pe-foot { border-top: 1px solid var(--adm-border); }
.pe-head-title { margin: 0; font-size: 20px; font-weight: 700; }
.pe-crumb { color: var(--adm-muted); font-size: 13px; }
.pe-crumb b { color: var(--adm-text); font-weight: 600; }
.pe-head-spacer { flex: 1 1 auto; }
.pe-iconbtn {
  width: 44px; height: 44px; border-radius: 10px; border: 1px solid var(--adm-border);
  background: #fff; font-size: 22px; line-height: 1; cursor: pointer; color: var(--adm-text);
}
.pe-iconbtn:hover { border-color: var(--adm-brand); }

.pe-scroll { flex: 1 1 auto; overflow-y: auto; padding: 24px; }
.pe-layout { max-width: 1360px; margin: 0 auto; display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; }
.pe-side { flex: 1 1 300px; max-width: 340px; display: flex; flex-direction: column; gap: 14px; }
.pe-main { flex: 999 1 560px; min-width: 0; display: flex; flex-direction: column; gap: 20px; }
.pe-center { padding: 64px 0; text-align: center; color: var(--adm-muted-2); display: flex; flex-direction: column; align-items: center; gap: 12px; }
@media (max-width: 900px) {
  .pe-side { max-width: none; flex-basis: 100%; }
  .pe-scroll { padding: 16px; }
  .pe-head, .pe-foot { padding: 10px 16px; }
}

/* ── Cards and form controls ───────────────────────────────── */
.pe-card { background: var(--adm-surface); border: 1px solid var(--adm-border); border-radius: 14px; padding: 22px; }
.pe-card-tight { padding: 16px; }
.pe-h { margin: 0; font-size: 18px; font-weight: 700; }
.pe-card-tight .pe-h { font-size: 15px; margin-bottom: 10px; }
.pe-sub { color: var(--adm-muted); font-size: 13px; margin: 4px 0 16px; }
.pe-hint { color: var(--adm-muted); font-size: 12px; margin-top: 6px; }
.pe-error { color: var(--adm-danger); font-size: 13px; margin: 8px 0 0; }
.pe-lab { display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px; }
.pe-opt { font-weight: 400; color: var(--adm-muted); font-size: 11px; }
.pe-in {
  width: 100%; border: 1px solid var(--adm-border); background: #fcfbf9; border-radius: 10px;
  padding: 10px 12px; font: inherit; color: inherit; min-height: 44px;
}
textarea.pe-in { min-height: 70px; resize: vertical; }
textarea.pe-tall { min-height: 96px; }
.pe-in:focus-visible, .pe-sel:focus-visible, .pe-cin:focus-visible, .pe-lg input:focus-visible,
.pe-btn:focus-visible, .pe-iconbtn:focus-visible, .pe-sw:focus-visible {
  outline: 2px solid var(--adm-brand); outline-offset: 1px;
}
.pe-in[readonly] { background: #f1ede6; color: var(--adm-muted-2); }
.pe-mb { margin-bottom: 16px; }
.pe-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
@media (max-width: 700px) { .pe-grid-2 { grid-template-columns: minmax(0, 1fr); } }
.pe-row-between { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.pe-row-gap { display: flex; gap: 8px; flex-wrap: wrap; }
.pe-spacer { flex: 1 1 auto; }
.pe-hidden { display: none; }
.pe-scroll-x { overflow-x: auto; }

.pe-btn {
  display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 16px;
  border: 1px solid var(--adm-border); background: #fff; border-radius: 10px; color: var(--adm-text);
  font-size: 14px; font-weight: 500; cursor: pointer;
}
.pe-btn:hover { border-color: var(--adm-brand); }
.pe-btn:disabled { opacity: .55; cursor: not-allowed; }
.pe-btn:disabled:hover { border-color: var(--adm-border); }
.pe-btn-sm { min-height: 36px; }
.pe-btn-pri { background: var(--adm-brand); border-color: var(--adm-brand); color: #fff; font-weight: 600; }
.pe-btn-pri:hover { background: var(--adm-brand-dark); border-color: var(--adm-brand-dark); }
.pe-x {
  width: 32px; height: 32px; border-radius: 8px; border: 1px solid transparent; background: transparent;
  font-size: 18px; line-height: 1; color: var(--adm-muted-2); cursor: pointer;
}
.pe-x:hover:not(:disabled) { border-color: var(--adm-border); color: var(--adm-danger); }
.pe-x:disabled { opacity: .35; cursor: not-allowed; }

.pe-sw {
  position: relative; flex: none; width: 46px; height: 26px; padding: 0; border: 0; border-radius: 999px;
  background: #cfc7ba; cursor: pointer;
}
.pe-sw::after {
  content: ''; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%;
  background: #fff; transition: left .15s;
}
.pe-sw.is-on { background: var(--adm-ok); }
.pe-sw.is-on::after { left: 23px; }
.pe-switch-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }

/* ── Status card ───────────────────────────────────────────── */
.pe-progress { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.pe-bar { flex: 1; height: 8px; border-radius: 99px; background: #eee8df; overflow: hidden; }
.pe-bar-fill { height: 100%; background: var(--adm-brand); transition: width .2s; }
.pe-bar-fill.is-complete { background: var(--adm-ok); }
.pe-note { border-radius: 10px; padding: 8px 10px; font-size: 12.5px; margin-bottom: 6px; }
.pe-note-ok { background: #e3f2ec; color: var(--adm-ok); }
.pe-note-warn { background: var(--adm-warn-bg); color: var(--adm-warn-fg); }
.pe-ck { display: flex; gap: 8px; align-items: flex-start; padding: 5px 6px; font-size: 13px; line-height: 1.3; }
.pe-ic {
  width: 18px; height: 18px; border-radius: 50%; flex: none; margin-top: 1px; font-size: 11px; font-weight: 700;
  display: inline-flex; align-items: center; justify-content: center; background: #e3f2ec; color: var(--adm-ok);
}
.pe-ic.is-todo { background: #eee8df; color: var(--adm-muted-2); }

/* ── Categories ────────────────────────────────────────────── */
.pe-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.pe-chip {
  display: inline-flex; align-items: center; gap: 6px; padding: 4px 6px 4px 12px; border-radius: 999px;
  background: #eee8df; color: var(--adm-text-2); font-size: 13px;
}
.pe-chip.is-first { background: var(--adm-brand); color: #fff; }
.pe-chip-x { border: 0; background: transparent; color: inherit; font-size: 16px; line-height: 1; cursor: pointer; padding: 0 4px; opacity: .8; }
.pe-chip-x:hover { opacity: 1; }

/* ── Basic info ────────────────────────────────────────────── */
.pe-seg { display: inline-flex; padding: 3px; border: 1px solid var(--adm-border); background: var(--adm-surface); border-radius: 12px; }
.pe-seg-btn { min-height: 32px; padding: 0 12px; border: 0; border-radius: 9px; background: transparent; font-size: 13px; font-weight: 500; color: var(--adm-text-2); cursor: pointer; }
.pe-seg-btn.is-on { background: var(--adm-brand-tint); color: var(--adm-brand-dark); font-weight: 600; }
.pe-usage { position: relative; }
.pe-pick { display: flex; align-items: center; justify-content: space-between; text-align: left; cursor: pointer; }
.pe-pick.is-empty { color: var(--adm-muted); }
.pe-scrim { position: fixed; inset: 0; z-index: 4; }
.pe-menu {
  position: absolute; left: 0; right: 0; top: calc(100% + 4px); z-index: 5; background: var(--adm-surface);
  border: 1px solid var(--adm-border); border-radius: 12px; box-shadow: 0 12px 32px rgba(40, 28, 10, .18); padding: 8px;
}
.pe-menu-list { max-height: 240px; overflow-y: auto; margin-top: 6px; }
.pe-menu-row { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 8px; cursor: pointer; }
.pe-menu-row:hover { background: #faf6f0; }
.pe-menu-row input { width: 16px; height: 16px; }
.pe-menu-th { color: var(--adm-muted); }
.pe-usage-ex { margin-top: 10px; }
.pe-usage-ex label { font-weight: 600; font-size: 13px; display: block; margin-bottom: 4px; }
.pe-usage-ex textarea { min-height: 44px; }

/* ── Images ────────────────────────────────────────────────── */
.pe-imgs { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 14px; align-items: start; }
.pe-img { position: relative; border: 1px solid var(--adm-border); border-radius: 12px; overflow: hidden; background: #fff; }
.pe-img-thumb { display: block; width: 100%; aspect-ratio: 1 / 1; object-fit: cover; background: #f1ede6; cursor: zoom-in; }
.pe-badge-main {
  position: absolute; top: 8px; left: 8px; z-index: 1; background: var(--adm-brand); color: #fff;
  font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px;
}
.pe-img-tools { position: absolute; top: 8px; right: 8px; z-index: 1; display: flex; gap: 6px; }
.pe-img-btn {
  min-height: 28px; padding: 0 8px; border: 1px solid var(--adm-border); border-radius: 8px;
  background: rgba(255, 255, 255, .95); font-size: 12px; font-weight: 600; cursor: pointer; color: var(--adm-text);
}
.pe-img-btn:hover { border-color: var(--adm-brand); }
.pe-img-x { width: 28px; padding: 0; font-size: 16px; line-height: 1; }
.pe-img-cap {
  display: flex; flex-direction: column; gap: 6px; padding: 10px; background: #faf8f5;
  border-top: 1px solid var(--adm-border); font-size: 12px; color: var(--adm-muted);
}
.pe-sel {
  width: 100%; min-height: 36px; padding: 0 8px; border: 1px solid var(--adm-border); border-radius: 8px;
  background: #fff; font: inherit; font-size: 12.5px; color: var(--adm-text);
}
.pe-drop {
  min-height: 250px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
  border: 2px dashed var(--adm-border); border-radius: 12px; background: #fcfbf9; color: var(--adm-muted);
  text-align: center; cursor: pointer;
}
.pe-drop:hover, .pe-drop.is-over { border-color: var(--adm-brand); background: var(--adm-brand-tint); }
.pe-drop-plus { font-size: 26px; line-height: 1; }

/* ── Sizes, levels, colors ─────────────────────────────────── */
.pe-pieces { display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 18px; }
.pe-pieces-field { width: 180px; }
.pe-pieces-hint { flex: 1 1 260px; margin: 0 0 12px; font-size: 13px; }
.pe-size { border: 1px solid var(--adm-border); border-radius: 12px; overflow: hidden; margin-bottom: 14px; }
.pe-size-head { padding: 14px 16px 12px; background: #faf8f5; border-bottom: 1px solid var(--adm-border); }
.pe-size-top { display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 14px; }
.pe-w150 { width: 150px; }
.pe-w190 { width: 190px; }
.pe-margin { margin: 0 0 10px; }
.pe-total { margin-left: auto; text-align: right; font-size: 12px; color: var(--adm-muted); }
.pe-total b { display: block; font-size: 20px; font-weight: 700; color: var(--adm-text); }
.pe-lg { display: grid; grid-template-columns: 92px repeat(5, minmax(104px, 1fr)); gap: 6px 8px; align-items: center; min-width: 700px; }
.pe-lg input {
  width: 100%; text-align: right; border: 1px solid var(--adm-brand); border-radius: 8px; padding: 8px; background: #fff;
  font: inherit; min-height: 38px;
}
.pe-lg input.is-auto { border-color: var(--adm-border); background: #f1ede6; color: var(--adm-muted-2); }
.pe-lg input.is-l5 { background: #fffaf1; box-shadow: 0 0 0 2px rgba(140, 106, 63, .18); }
.pe-lh b { display: block; font-size: 13px; }
.pe-lh small { color: var(--adm-muted); font-size: 11px; }
.pe-rowlab { font-size: 11px; color: var(--adm-muted); }
.pe-piece { text-align: right; padding: 8px; color: var(--adm-muted-2); font-variant-numeric: tabular-nums; }
.pe-colhead { display: flex; gap: 8px; align-items: center; padding: 11px 16px; font-size: 13px; }
.pe-colhead .pe-hint { margin: 0 0 0 auto; }
.pe-ctab { border-collapse: collapse; width: 100%; min-width: 620px; }
.pe-ctab th {
  font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--adm-muted); text-align: left;
  padding: 6px 12px; font-weight: 500; border-top: 1px solid var(--adm-border-soft);
}
.pe-ctab td { padding: 6px 12px; border-top: 1px solid var(--adm-border-soft); vertical-align: middle; }
.pe-colorcell { display: flex; align-items: center; gap: 10px; }
.pe-swatch {
  position: relative; flex: none; width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--adm-border);
  overflow: hidden; cursor: pointer;
}
.pe-swatch input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; border: 0; padding: 0; }
.pe-cin { width: 100%; min-width: 80px; border: 1px solid var(--adm-border); background: #fcfbf9; border-radius: 8px; padding: 6px 8px; font: inherit; min-height: 36px; }
.pe-cin-th { max-width: 90px; }
.pe-num { text-align: right; max-width: 110px; }
.pe-colfoot { padding: 10px 16px 14px; border-top: 1px solid var(--adm-border-soft); }
.pe-colfoot-note { padding: 0 16px 10px; }

/* ── Dialogs, lightbox, toast ──────────────────────────────── */
.pe-dialog-back {
  position: fixed; inset: 0; z-index: 260; background: rgba(0, 0, 0, .45);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.pe-dialog {
  width: min(460px, 100%); background: var(--adm-surface); border-radius: 14px; padding: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, .3);
}
.pe-dialog h2 { margin: 0 0 6px; font-size: 20px; }
.pe-dialog p { margin: 0 0 14px; color: var(--adm-muted-2); }
.pe-dialog-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 18px; }
.pe-lightbox {
  position: fixed; inset: 0; z-index: 280; background: rgba(0, 0, 0, .82);
  display: flex; align-items: center; justify-content: center; padding: 24px;
}
.pe-lightbox img { max-width: 92vw; max-height: 92vh; border-radius: 8px; background: #fff; }
.pe-lightbox-x {
  position: absolute; top: 16px; right: 16px; width: 44px; height: 44px; border-radius: 50%; border: 0;
  background: rgba(255, 255, 255, .95); font-size: 24px; line-height: 1; cursor: pointer;
}
.pe-toast {
  position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 270; max-width: min(520px, 92vw);
  background: #2b2620; color: #fff; padding: 12px 18px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0, 0, 0, .3);
  font-size: 14px;
}
.pe-toast.is-error { background: #7b241c; }
```

- [ ] **Step 3: Create `ProductSwitch.vue`:**

```vue
<script setup>
// The on/off switch used for "Display on website" and each color's Show.
defineProps({
  modelValue: { type: Boolean, default: false },
  label: { type: String, required: true },
});
defineEmits(['update:modelValue']);
</script>

<template>
  <button
    type="button"
    role="switch"
    class="pe-sw"
    :class="{ 'is-on': modelValue }"
    :aria-checked="modelValue"
    :aria-label="label"
    @click="$emit('update:modelValue', !modelValue)"
  ></button>
</template>
```

- [ ] **Step 4: Create `ProductStatusCard.vue`:**

```vue
<script setup>
// Completeness bar and the four-item checklist from the design, plus a hint when sizes
// would be invoiceable but not orderable on the website. Read-only: it only reads the draft.
import { computed } from 'vue';
import { completeness, unorderableSizes } from '../../../utils/adminProductEdit';

const props = defineProps({
  draft: { type: Object, required: true },
  t: { type: Object, required: true },
});

const status = computed(() => completeness(props.draft));
const rows = computed(() => [
  ['info', props.t.ckInfo],
  ['image', props.t.ckImage],
  ['prices', props.t.ckPrices],
  ['stock', props.t.ckStock],
]);
const noPhoto = computed(() => unorderableSizes(props.draft));
</script>

<template>
  <section class="pe-card pe-card-tight">
    <h2 class="pe-h pe-serif">{{ t.statusTitle }}</h2>
    <div class="pe-progress">
      <div class="pe-bar">
        <div class="pe-bar-fill" :class="{ 'is-complete': status.complete }" :style="{ width: status.percent + '%' }"></div>
      </div>
      <b>{{ status.percent }}%</b>
    </div>
    <div v-if="status.complete" class="pe-note pe-note-ok">{{ t.statusAllGood }}</div>
    <div v-for="[key, label] in rows" :key="key" class="pe-ck">
      <span class="pe-ic" :class="{ 'is-todo': !status.checks[key] }">{{ status.checks[key] ? '✓' : '•' }}</span>
      <span>{{ label }}</span>
    </div>
    <div v-if="noPhoto" class="pe-note pe-note-warn" style="margin-top: 8px">{{ t.hintNoPhoto(noPhoto) }}</div>
  </section>
</template>
```

- [ ] **Step 5: Create `ProductCategoriesCard.vue`:**

```vue
<script setup>
// Category chips (the first one generates the SKU) and the SKU base. A saved product's SKU
// is read-only; a new product's is fetched by the panel when the first category is chosen.
import { computed } from 'vue';

const props = defineProps({
  draft: { type: Object, required: true },
  categories: { type: Array, default: () => [] },
  isEditing: { type: Boolean, default: false },
  lang: { type: String, default: 'en' },
  t: { type: Object, required: true },
});
const emit = defineEmits(['category-change', 'sku-change']);

const labelOf = (c) => (props.lang === 'th' && c.name_th ? c.name_th : c.name);
const nameOf = (path) => {
  const found = props.categories.find((c) => c.path === path);
  return found ? labelOf(found) : path;
};
const available = computed(() => props.categories.filter((c) => !props.draft.categories.includes(c.path)));
const exampleSku = computed(() => props.draft.sku || 'YN-014');

const add = (event) => {
  const path = event.target.value;
  event.target.value = '';
  if (!path) return;
  props.draft.categories.push(path);
  emit('category-change');
};
const remove = (path) => {
  props.draft.categories = props.draft.categories.filter((p) => p !== path);
  emit('category-change');
};
const onSku = (event) => {
  props.draft.sku = event.target.value.trim();
  emit('sku-change');
};
</script>

<template>
  <section class="pe-card pe-card-tight">
    <h2 class="pe-h pe-serif">{{ t.catTitle }}</h2>
    <div v-if="draft.categories.length" class="pe-chips">
      <span v-for="(path, i) in draft.categories" :key="path" class="pe-chip" :class="{ 'is-first': i === 0 }">
        {{ nameOf(path) }}
        <button type="button" class="pe-chip-x" :aria-label="t.catRemove" @click="remove(path)">×</button>
      </span>
    </div>
    <select class="pe-in" :aria-label="t.catAdd" @change="add">
      <option value="">{{ t.catAdd }}</option>
      <option v-for="c in available" :key="c.path" :value="c.path">{{ labelOf(c) }}</option>
    </select>
    <div class="pe-hint" style="margin-bottom: 14px">{{ t.catHint }}</div>
    <label class="pe-lab" for="pe-sku">{{ t.skuBase }}</label>
    <input
      id="pe-sku" class="pe-in" type="text" :value="draft.sku" :readonly="isEditing"
      :placeholder="t.skuPending" autocomplete="off" @input="onSku"
    />
    <div class="pe-hint">{{ t.skuExample(exampleSku) }}</div>
  </section>
</template>
```

- [ ] **Step 6: Create `ProductBasicInfo.vue`:**

```vue
<script setup>
// Names, description, attribute and usage. One EN | ไทย switch decides which language the
// description, attribute and usage examples are being edited in; both names are always shown.
// Usage is the storefront's [{ type, example }] JSON, built from a picker of 12 usage types.
import { computed, ref } from 'vue';
import { USAGE_OPTIONS, parseUsage, serializeUsage } from '../../../utils/adminProductEdit';

const props = defineProps({
  draft: { type: Object, required: true },
  lang: { type: String, default: 'en' },
  t: { type: Object, required: true },
});

const content = ref(props.lang === 'th' ? 'th' : 'en');
const entries = ref(parseUsage(props.draft.usage, props.draft.usageTh));
const usageOpen = ref(false);
const usageQuery = ref('');

const options = computed(() => {
  const q = usageQuery.value.trim().toLowerCase();
  return q ? USAGE_OPTIONS.filter((u) => u.en.toLowerCase().includes(q) || u.th.includes(q)) : USAGE_OPTIONS;
});
const isChosen = (en) => entries.value.some((e) => e.en === en);

// The draft's usage text is only rewritten when the owner touches the picker or an example,
// so an untouched product keeps exactly what it had.
const syncUsage = () => {
  const { usage, usageTh } = serializeUsage(entries.value);
  props.draft.usage = usage;
  props.draft.usageTh = usageTh;
};
const toggleUsage = (u) => {
  const at = entries.value.findIndex((e) => e.en === u.en);
  if (at >= 0) entries.value.splice(at, 1);
  else entries.value.push({ en: u.en, th: u.th, example: '', example_th: '' });
  syncUsage();
};
</script>

<template>
  <section class="pe-card">
    <div class="pe-row-between">
      <h2 class="pe-h pe-serif">{{ t.basicTitle }}</h2>
      <div class="pe-seg" role="group">
        <button type="button" class="pe-seg-btn" :class="{ 'is-on': content === 'en' }" :aria-pressed="content === 'en'" @click="content = 'en'">{{ t.langEn }}</button>
        <button type="button" class="pe-seg-btn" :class="{ 'is-on': content === 'th' }" :aria-pressed="content === 'th'" @click="content = 'th'">{{ t.langTh }}</button>
      </div>
    </div>
    <p class="pe-sub">{{ t.basicSub }}</p>

    <div class="pe-grid-2 pe-mb">
      <div>
        <label class="pe-lab" for="pe-name">{{ t.nameEn }}</label>
        <input id="pe-name" v-model="draft.name" class="pe-in" type="text" autocomplete="off" />
      </div>
      <div>
        <label class="pe-lab" for="pe-name-th">{{ t.nameTh }}</label>
        <input id="pe-name-th" v-model="draft.nameTh" class="pe-in" type="text" autocomplete="off" />
      </div>
    </div>

    <div class="pe-mb">
      <label class="pe-lab" for="pe-desc">{{ t.desc }}</label>
      <textarea v-if="content === 'en'" id="pe-desc" v-model="draft.description" class="pe-in pe-tall"></textarea>
      <textarea v-else id="pe-desc" v-model="draft.descriptionTh" class="pe-in pe-tall"></textarea>
      <div class="pe-hint">{{ t.descHint }}</div>
    </div>

    <div class="pe-grid-2">
      <div>
        <label class="pe-lab" for="pe-attr">{{ t.attr }}</label>
        <textarea v-if="content === 'en'" id="pe-attr" v-model="draft.attribute" class="pe-in" :placeholder="t.attrPh"></textarea>
        <textarea v-else id="pe-attr" v-model="draft.attributeTh" class="pe-in" :placeholder="t.attrPh"></textarea>
      </div>

      <div class="pe-usage">
        <span class="pe-lab">{{ t.usage }}</span>
        <button type="button" class="pe-in pe-pick" :class="{ 'is-empty': !entries.length }" :aria-expanded="usageOpen" @click="usageOpen = !usageOpen">
          <span>{{ entries.length ? t.usageN(entries.length) : t.usageNone }}</span>
          <span aria-hidden="true">{{ usageOpen ? '▴' : '▾' }}</span>
        </button>
        <div v-if="usageOpen" class="pe-scrim" @click="usageOpen = false"></div>
        <div v-if="usageOpen" class="pe-menu">
          <input v-model="usageQuery" class="pe-in" type="text" :placeholder="t.usageSearch" :aria-label="t.usageSearch" />
          <div class="pe-menu-list">
            <label v-for="u in options" :key="u.en" class="pe-menu-row">
              <input type="checkbox" :checked="isChosen(u.en)" @change="toggleUsage(u)" />
              <span>{{ u.en }} <span class="pe-menu-th">({{ u.th }})</span></span>
            </label>
          </div>
        </div>
        <div v-for="entry in entries" :key="entry.en" class="pe-usage-ex">
          <label :for="`pe-ux-${entry.en}`">{{ content === 'th' ? entry.th : entry.en }}</label>
          <textarea v-if="content === 'en'" :id="`pe-ux-${entry.en}`" v-model="entry.example" class="pe-in" :placeholder="t.usageExample" @input="syncUsage"></textarea>
          <textarea v-else :id="`pe-ux-${entry.en}`" v-model="entry.example_th" class="pe-in" :placeholder="t.usageExample" @input="syncUsage"></textarea>
        </div>
      </div>
    </div>
  </section>
</template>
```

- [ ] **Step 7: Compile-check the new components.** Create `C:\Users\herby\AppData\Local\Temp\claude\d--GitHub-KitWeb\b10560a1-4312-41cf-ad87-aae427786aa0\scratchpad\check-sfc.mjs` (outside the repo):

```js
// Compiles each .vue file given on the command line (script + template) and prints any error.
// Run from frontend/kitweb so @vue/compiler-sfc resolves from its node_modules.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(`${process.cwd()}/package.json`);
const { parse, compileScript, compileTemplate } = require('@vue/compiler-sfc');

let failed = false;
for (const file of process.argv.slice(2)) {
  const { descriptor, errors } = parse(readFileSync(file, 'utf8'), { filename: file });
  const problems = [...errors];
  try {
    const script = compileScript(descriptor, { id: 'check' });
    if (descriptor.template) {
      const out = compileTemplate({
        source: descriptor.template.content, filename: file, id: 'check',
        compilerOptions: { bindingMetadata: script.bindings },
      });
      problems.push(...out.errors);
    }
  } catch (e) {
    problems.push(e);
  }
  if (problems.length) {
    failed = true;
    console.error(`FAIL ${file}`);
    for (const p of problems) console.error('  ', p.message || p);
  } else {
    console.log(`ok   ${file}`);
  }
}
process.exit(failed ? 1 : 0);
```

Run (from `frontend/kitweb/`):
```
node "C:/Users/herby/AppData/Local/Temp/claude/d--GitHub-KitWeb/b10560a1-4312-41cf-ad87-aae427786aa0/scratchpad/check-sfc.mjs" src/components/admin/product-edit/ProductSwitch.vue src/components/admin/product-edit/ProductStatusCard.vue src/components/admin/product-edit/ProductCategoriesCard.vue src/components/admin/product-edit/ProductBasicInfo.vue
```
Expected: four `ok` lines, exit 0.

- [ ] **Step 8: Run the frontend suite** — `npx vitest run` — all green (nothing imports the new components yet).

**Checkpoint:** stylesheet and the three simple cards compile.

---

### Task 9: Images card

**Files:**
- Create: `frontend/kitweb/src/components/admin/product-edit/ProductImages.vue`

**Interfaces:**
- Consumes: `imageCard`, `setMain`, `withSize`, `colorOptions` from `utils/adminProductEdit.js`; `getProductImageUrl` from `utils/productImages.js`.
- Produces: `<ProductImages :draft :t @zoom="(src: string) => void">`. New files become cards with `{ isNew: true, inRows: false, file, preview: <blob URL> }`; the panel uploads them on save. The first image added to a product with no main photo becomes the main photo.

- [ ] **Step 1: Create `ProductImages.vue`:**

```vue
<script setup>
// The image grid: one card per photo, ★ Main on exactly one, and for every other photo the
// size and color it belongs to. A photo tied to a size becomes that size's website variant
// photo (see product-inventory.ts on the Worker); one tied to nothing is a gallery photo.
import { onBeforeUnmount, ref } from 'vue';
import { getProductImageUrl } from '../../../utils/productImages';
import { colorOptions, imageCard, setMain, withSize } from '../../../utils/adminProductEdit';

const props = defineProps({
  draft: { type: Object, required: true },
  t: { type: Object, required: true },
});
const emit = defineEmits(['zoom']);

const fileInput = ref(null);
const over = ref(false);

const thumb = (img) => img.preview || getProductImageUrl(img.image_key, 'thumb');
const large = (img) => img.preview || getProductImageUrl(img.image_key, 'large');

const indexOf = (img) => props.draft.images.findIndex((i) => i.uid === img.uid);

const addFiles = (list) => {
  const files = Array.from(list || []).filter((f) => f.type && f.type.startsWith('image/'));
  for (const file of files) {
    props.draft.images.push(imageCard({}, { isNew: true, inRows: false, file, preview: URL.createObjectURL(file) }));
  }
  if (files.length && !props.draft.images.some((i) => i.isMain)) {
    props.draft.images = setMain(props.draft.images, props.draft.images[0].uid);
  }
};
const onPick = (event) => {
  addFiles(event.target.files);
  event.target.value = '';
};
const onDrop = (event) => {
  over.value = false;
  addFiles(event.dataTransfer?.files);
};

const makeMain = (img) => {
  props.draft.images = setMain(props.draft.images, img.uid);
};
const remove = (img) => {
  if (img.preview && img.preview.startsWith('blob:')) URL.revokeObjectURL(img.preview);
  props.draft.images = props.draft.images.filter((i) => i.uid !== img.uid);
};
const onSize = (img, value) => {
  const at = indexOf(img);
  if (at >= 0) props.draft.images[at] = withSize(props.draft.images[at], value, props.draft.sizes);
};
const onColor = (img, value) => {
  const at = indexOf(img);
  if (at >= 0) props.draft.images[at] = { ...props.draft.images[at], colorRef: value || null };
};

onBeforeUnmount(() => {
  for (const img of props.draft.images) {
    if (img.preview && img.preview.startsWith('blob:')) URL.revokeObjectURL(img.preview);
  }
});
</script>

<template>
  <section class="pe-card">
    <h2 class="pe-h pe-serif">{{ t.imgTitle }}</h2>
    <p class="pe-sub">{{ t.imgSub }}</p>

    <div class="pe-imgs">
      <div v-for="img in draft.images" :key="img.uid" class="pe-img">
        <span v-if="img.isMain" class="pe-badge-main">{{ t.imgMain }}</span>
        <div class="pe-img-tools">
          <button v-if="!img.isMain" type="button" class="pe-img-btn" @click="makeMain(img)">{{ t.imgMakeMain }}</button>
          <button type="button" class="pe-img-btn pe-img-x" :aria-label="t.imgRemove" :title="t.imgRemove" @click="remove(img)">×</button>
        </div>
        <img class="pe-img-thumb" :src="thumb(img)" alt="" :title="t.imgPreview" @click="emit('zoom', large(img))" />

        <div v-if="img.passthrough" class="pe-img-cap">{{ t.imgPassthrough(img.passthrough.attribute_value || '—') }}</div>
        <div v-else class="pe-img-cap">
          <select class="pe-sel" :aria-label="t.imgSize" :value="img.sizeRef || ''" @change="onSize(img, $event.target.value)">
            <option value="">{{ t.imgAllSizes }}</option>
            <option v-for="s in draft.sizes" :key="s.ref" :value="s.ref">{{ s.label || '—' }}</option>
          </select>
          <select class="pe-sel" :aria-label="t.imgColor" :value="img.colorRef || ''" @change="onColor(img, $event.target.value)">
            <option value="">{{ t.imgAllColors }}</option>
            <option v-for="c in colorOptions(draft.sizes, img.sizeRef)" :key="c.ref" :value="c.ref">{{ c.name }}</option>
          </select>
        </div>
      </div>

      <div
        class="pe-drop" :class="{ 'is-over': over }" role="button" tabindex="0"
        @click="fileInput && fileInput.click()"
        @keydown.enter.prevent="fileInput && fileInput.click()"
        @keydown.space.prevent="fileInput && fileInput.click()"
        @dragover.prevent="over = true"
        @dragleave="over = false"
        @drop.prevent="onDrop"
      >
        <span class="pe-drop-plus" aria-hidden="true">+</span>
        <span>{{ t.imgAdd }}<br /><small>{{ t.imgDrop }}</small></span>
      </div>
    </div>
    <input ref="fileInput" type="file" accept="image/*" multiple class="pe-hidden" @change="onPick" />
  </section>
</template>
```

- [ ] **Step 2: Compile-check** — run the Task 8 Step 7 command against `src/components/admin/product-edit/ProductImages.vue`. Expected: `ok`.

**Checkpoint:** images card compiles.

---

### Task 10: Sizes, colors & pricing card

**Files:**
- Create: `frontend/kitweb/src/components/admin/product-edit/ProductSizesPricing.vue`

**Interfaces:**
- Consumes (Tasks 5–6): `DEFAULT_PERCENTS`, `blankColor`, `blankSize`, `autoFill`, `cleanDecimal`, `cleanInteger`, `formatPercents`, `formulaPrice`, `marginPct`, `multiplierLabel`, `parsePercents`, `pieceRow`, `productStock`, `reconcileImages`, `refreshSkus`, `savePercents`, `setPrice`, `sizeStock`, `normalizePieces`.
- Produces: `<ProductSizesPricing :draft :percents :t @update:percents="(p: number[]) => void">`.
- Behaviour: editing the first size's price clears `draft.baseFromLegacy`; removing the first size does too; removing a size or color reconciles `draft.images`; any rename or SKU edit calls `refreshSkus`.

- [ ] **Step 1: Create `ProductSizesPricing.vue`:**

```vue
<script setup>
// Sizes, colors and pricing, laid out as in the design: per size a header (name, factory
// cost, margin, stock), the five-level price grid, and a colors table. Prices are per BOX;
// the "Per piece" row shows what the website will display (box price ÷ pieces per box).
import { computed, nextTick, ref } from 'vue';
import ProductSwitch from './ProductSwitch.vue';
import {
  DEFAULT_PERCENTS, autoFill, blankColor, blankSize, cleanDecimal, cleanInteger, formatPercents,
  formulaPrice, marginPct, multiplierLabel, normalizePieces, parsePercents, pieceRow, productStock,
  reconcileImages, refreshSkus, savePercents, setPrice, sizeStock,
} from '../../../utils/adminProductEdit';

const props = defineProps({
  draft: { type: Object, required: true },
  percents: { type: Array, required: true },
  t: { type: Object, required: true },
});
const emit = defineEmits(['update:percents']);

const levels = [0, 1, 2, 3, 4];
const levelNames = computed(() => [props.t.lvl1, props.t.lvl2, props.t.lvl3, props.t.lvl4, props.t.lvl5]);
const levelSub = (i) => (i === 4
  ? props.t.lvlSub(5, props.t.lvlStart)
  : props.t.lvlSub(i + 1, multiplierLabel(props.percents[i])));

// "100 per box → the website shows ฿20 per piece at Level 1", from the first size.
const example = computed(() => {
  const pieces = normalizePieces(props.draft.piecesPerBox);
  const first = props.draft.sizes[0];
  if (!pieces || !first) return '';
  const perPiece = pieceRow(first.prices, pieces)[0];
  return perPiece === null ? '' : props.t.szPiecesExample(pieces, perPiece);
});

// ── Edits ─────────────────────────────────────────────────────────
const refresh = () => {
  props.draft.sizes = refreshSkus(props.draft.sizes, props.draft.sku);
};

const onPieces = (event) => {
  const clean = cleanInteger(event.target.value).replace('-', '');
  event.target.value = clean;
  props.draft.piecesPerBox = clean;
};

const onLabel = (size, value) => {
  size.label = value;
  refresh();
};
const onCost = (size, event) => {
  size.boxCost = cleanDecimal(event.target.value);
  event.target.value = size.boxCost;
};
const onPrice = (si, level, event) => {
  const clean = cleanDecimal(event.target.value);
  event.target.value = clean;
  props.draft.sizes[si] = setPrice(props.draft.sizes[si], level, clean, props.percents);
  // The base prices the website falls back to follow the first size once it is edited.
  if (si === 0) props.draft.baseFromLegacy = null;
};

const onColorName = (color, value) => {
  color.name = value;
  refresh();
};
const onSku = (color, value) => {
  color.sku = value;
  color.skuManual = value.trim() !== '';
  if (!color.skuManual) refresh();
};
const onStock = (color, event) => {
  color.stock = cleanInteger(event.target.value);
  event.target.value = color.stock;
};

const addSize = () => {
  props.draft.sizes.push(blankSize());
  refresh();
};
const removeSize = (si) => {
  if (props.draft.sizes.length < 2) return;
  props.draft.sizes.splice(si, 1);
  if (si === 0) props.draft.baseFromLegacy = null;
  props.draft.images = reconcileImages(props.draft.images, props.draft.sizes);
  refresh();
};
const addColor = (size) => {
  size.colors.push(blankColor(''));
  refresh();
};
const removeColor = (size, color) => {
  if (size.colors.length < 2) return;
  size.colors = size.colors.filter((c) => c.ref !== color.ref);
  props.draft.images = reconcileImages(props.draft.images, props.draft.sizes);
  refresh();
};

// ── Price levels dialog ───────────────────────────────────────────
const fmOpen = ref(false);
const fmText = ref('');
const fmInput = ref(null);

const parsed = computed(() => parsePercents(fmText.value));
const fmBad = computed(() => fmText.value.trim() !== '' && parsed.value === null);
const fmPreview = computed(() => {
  if (!parsed.value) return '';
  const typed = Number(props.draft.sizes[0]?.prices[4]);
  const l5 = typed > 0 ? typed : 1000;
  return props.t.fmPreview(l5, parsed.value.map((p) => formulaPrice(l5, p)).join(' / '));
});

const openFormula = async () => {
  fmText.value = formatPercents(props.percents);
  fmOpen.value = true;
  await nextTick();
  fmInput.value?.focus();
};
const saveFormula = () => {
  if (!parsed.value) return;
  emit('update:percents', parsed.value);
  savePercents(parsed.value);
  // Grey (automatic) prices follow the new percentages; typed prices stay.
  props.draft.sizes = props.draft.sizes.map((s) => autoFill(s, parsed.value));
  fmOpen.value = false;
};
</script>

<template>
  <section class="pe-card">
    <div class="pe-row-between">
      <h2 class="pe-h pe-serif">{{ t.szTitle }}</h2>
      <div class="pe-row-gap">
        <button type="button" class="pe-btn pe-btn-sm" @click="openFormula">{{ t.szLevels }}</button>
        <button type="button" class="pe-btn pe-btn-sm" @click="addSize">{{ t.szAddSize }}</button>
      </div>
    </div>
    <p class="pe-sub">{{ t.szSub }}</p>

    <div class="pe-pieces">
      <div class="pe-pieces-field">
        <label class="pe-lab" for="pe-pieces">{{ t.szPieces }}</label>
        <input
          id="pe-pieces" class="pe-in" type="text" inputmode="numeric" placeholder="100"
          :value="draft.piecesPerBox" autocomplete="off" @input="onPieces"
        />
      </div>
      <div class="pe-hint pe-pieces-hint">
        {{ t.szPiecesHint }}
        <b v-if="example">{{ example }}</b>
      </div>
    </div>

    <div v-for="(size, si) in draft.sizes" :key="size.ref" class="pe-size">
      <div class="pe-size-head">
        <div class="pe-size-top">
          <div class="pe-w150">
            <label class="pe-lab" :for="`pe-sl-${size.ref}`">{{ t.szSizeLabel }}</label>
            <input :id="`pe-sl-${size.ref}`" class="pe-in" type="text" :value="size.label" autocomplete="off" @input="onLabel(size, $event.target.value)" />
          </div>
          <div class="pe-w150">
            <label class="pe-lab" :for="`pe-st-${size.ref}`">{{ t.szSizeTh }}</label>
            <input :id="`pe-st-${size.ref}`" v-model="size.labelTh" class="pe-in" type="text" autocomplete="off" />
          </div>
          <div class="pe-w190">
            <label class="pe-lab" :for="`pe-sc-${size.ref}`">{{ t.szCost }} <span class="pe-opt">{{ t.szOptional }}</span></label>
            <input :id="`pe-sc-${size.ref}`" class="pe-in" type="text" inputmode="decimal" :value="size.boxCost" autocomplete="off" @input="onCost(size, $event)" />
          </div>
          <div v-if="marginPct(size) !== null" class="pe-hint pe-margin">{{ t.szMargin(marginPct(size)) }}</div>
          <div class="pe-total">
            {{ t.szTotalStock }}<b>{{ sizeStock(size) }}</b>
          </div>
          <button type="button" class="pe-btn pe-btn-sm" :disabled="draft.sizes.length < 2" @click="removeSize(si)">{{ t.szRemoveSize }}</button>
        </div>

        <div class="pe-scroll-x">
          <div class="pe-lg">
            <div></div>
            <div v-for="i in levels" :key="`h${i}`" class="pe-lh"><b>{{ levelNames[i] }}</b><small>{{ levelSub(i) }}</small></div>

            <div class="pe-rowlab">{{ t.rowBox }}</div>
            <input
              v-for="i in levels" :key="`p${i}`" type="text" inputmode="decimal" autocomplete="off"
              :class="{ 'is-auto': i < 4 && !size.manual[i], 'is-l5': i === 4 }"
              :aria-label="`${levelNames[i]} — ${t.rowBox}`"
              :value="size.prices[i] ?? ''"
              @input="onPrice(si, i, $event)"
            />

            <div class="pe-rowlab">{{ t.rowPiece }}</div>
            <div v-for="(p, i) in pieceRow(size.prices, draft.piecesPerBox)" :key="`m${i}`" class="pe-piece">{{ p === null ? '—' : p }}</div>
          </div>
        </div>
        <div class="pe-hint">{{ t.rowHint }}</div>
      </div>

      <div class="pe-colhead">
        <b>{{ t.colTitle }}</b>
        <span class="pe-hint">{{ t.colSummary(size.colors.length, sizeStock(size)) }}</span>
      </div>
      <div class="pe-scroll-x">
        <table class="pe-ctab">
          <thead>
            <tr>
              <th>{{ t.colHeadColor }}</th>
              <th>{{ t.colHeadSku }}</th>
              <th>{{ t.colHeadStock }}</th>
              <th>{{ t.colHeadShow }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in size.colors" :key="c.ref">
              <td>
                <span class="pe-colorcell">
                  <label class="pe-swatch" :style="{ background: c.hex || '#ffffff' }">
                    <input type="color" :value="c.hex || '#cccccc'" :aria-label="t.colSwatch" @input="c.hex = $event.target.value" />
                  </label>
                  <input class="pe-cin" type="text" :value="c.name" :aria-label="t.colHeadColor" autocomplete="off" @input="onColorName(c, $event.target.value)" />
                  <input v-model="c.nameTh" class="pe-cin pe-cin-th" type="text" :placeholder="t.colNameTh" :aria-label="t.colNameTh" autocomplete="off" />
                </span>
              </td>
              <td><input class="pe-cin" type="text" :value="c.sku" :aria-label="t.colHeadSku" autocomplete="off" @input="onSku(c, $event.target.value)" /></td>
              <td><input class="pe-cin pe-num" type="text" inputmode="numeric" :value="c.stock" :aria-label="t.colHeadStock" autocomplete="off" @input="onStock(c, $event)" /></td>
              <td><ProductSwitch v-model="c.isVisible" :label="t.colHeadShow" /></td>
              <td>
                <button type="button" class="pe-x" :disabled="size.colors.length < 2" :aria-label="t.colRemove" :title="t.colRemove" @click="removeColor(size, c)">×</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="size.colors.some((c) => !c.isVisible)" class="pe-hint pe-colfoot-note">{{ t.colHiddenNote }}</div>
      <div class="pe-colfoot">
        <button type="button" class="pe-btn pe-btn-sm" @click="addColor(size)">{{ t.colAdd }}</button>
      </div>
    </div>

    <p v-if="draft.sizes.length > 1" class="pe-hint">{{ t.szProductStock(productStock(draft)) }}</p>
    <p class="pe-hint">{{ t.removedNote }}</p>

    <div v-if="fmOpen" class="pe-dialog-back" @click.self="fmOpen = false">
      <form class="pe-dialog" role="dialog" aria-modal="true" :aria-label="t.fmTitle" @submit.prevent="saveFormula" @keydown.esc.stop="fmOpen = false">
        <h2 class="pe-serif">{{ t.fmTitle }}</h2>
        <p>{{ t.fmBody }}</p>
        <label class="pe-lab" for="pe-fm">{{ t.fmLabel }}</label>
        <input id="pe-fm" ref="fmInput" v-model="fmText" class="pe-in" type="text" placeholder="200, 180, 160, 130" autocomplete="off" />
        <p v-if="fmPreview" class="pe-hint">{{ fmPreview }}</p>
        <p v-if="fmBad" class="pe-error">{{ t.fmInvalid }}</p>
        <div class="pe-dialog-actions">
          <button type="button" class="pe-btn" @click="fmText = formatPercents(DEFAULT_PERCENTS)">{{ t.fmReset }}</button>
          <span class="pe-spacer"></span>
          <button type="button" class="pe-btn" @click="fmOpen = false">{{ t.cancel }}</button>
          <button type="submit" class="pe-btn pe-btn-pri" :disabled="!parsed">{{ t.fmSave }}</button>
        </div>
      </form>
    </div>
  </section>
</template>
```

- [ ] **Step 2: Compile-check** — run the Task 8 Step 7 command against `src/components/admin/product-edit/ProductSizesPricing.vue`. Expected: `ok`.

**Checkpoint:** the heaviest card compiles; every import it uses exists in `adminProductEdit.js`.

---

### Task 11: The panel shell, page wiring, and removal of the old form

**Files:**
- Create: `frontend/kitweb/src/components/admin/product-edit/ProductEditPanel.vue`
- Modify: `frontend/kitweb/src/views/admin/AdminInventoryPage.vue`
- Delete: `frontend/kitweb/src/components/admin-product-form.vue`

**Interfaces:**
- Consumes: everything from Tasks 5–10; `api.getProductInventory`, `api.getNextSku`, `api.uploadImage`, `api.addProduct`, `api.updateProduct`; `processProductImage`; `useAdminLang`.
- Produces: `<ProductEditPanel :open :product :categories @close @saved @archive="(productId) => void" @session-expired>` — same contract as the old form plus `archive`. The panel never shows an archived product (the page already refuses to open one).

- [ ] **Step 1: Create `ProductEditPanel.vue`:**

```vue
<script setup>
// The Edit product slide-over: loads the product's sizes and colors, holds one reactive
// `draft` for the cards, uploads new photos, saves through POST/PUT /products and asks before
// throwing away edits. It never deletes: "Archive" hands off to the Inventory page's own
// confirmed, Undo-able archive.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { api } from '../../../services/api';
import { processProductImage } from '../../../services/image-processor';
import { useAdminLang } from '../../../composables/useAdminLang';
import { productEditText } from '../../../utils/adminProductEditText';
import {
  blankDraft, buildDraft, buildPayload, isDirty, loadPercents, refreshSkus, snapshot, validateDraft,
} from '../../../utils/adminProductEdit';
import ProductStatusCard from './ProductStatusCard.vue';
import ProductSwitch from './ProductSwitch.vue';
import ProductCategoriesCard from './ProductCategoriesCard.vue';
import ProductBasicInfo from './ProductBasicInfo.vue';
import ProductImages from './ProductImages.vue';
import ProductSizesPricing from './ProductSizesPricing.vue';
import '../../../assets/admin-product-edit.css';

const props = defineProps({
  open: { type: Boolean, default: false },
  // The product row from GET /products, or null to add a new one.
  product: { type: Object, default: null },
  categories: { type: Array, default: () => [] },
});
const emit = defineEmits(['close', 'saved', 'archive', 'session-expired']);

const { lang } = useAdminLang();
const t = computed(() => productEditText(lang.value));
const isEditing = computed(() => Boolean(props.product));

const draft = ref(null);
const original = ref('');
const percents = ref(loadPercents());
const session = ref(0); // changes on every open, so the cards start from fresh state
const loading = ref(false);
const loadFailed = ref(false);
const saving = ref(false);
const savingLabel = ref('');
const zoomSrc = ref(null);
const pendingAction = ref(null); // set while the "discard changes?" dialog is up
const toast = ref(null);
let toastTimer = null;

const flash = (message, error = false) => {
  clearTimeout(toastTimer);
  toast.value = { message, error };
  toastTimer = setTimeout(() => { toast.value = null; }, 6000);
};

// ── Opening ───────────────────────────────────────────────────────
let openToken = 0;

const begin = async () => {
  const token = ++openToken;
  session.value += 1;
  loadFailed.value = false;
  toast.value = null;
  percents.value = loadPercents();

  if (!props.product) {
    draft.value = blankDraft();
    original.value = snapshot(draft.value);
    return;
  }

  draft.value = null;
  loading.value = true;
  try {
    const inventory = await api.getProductInventory(props.product.id);
    if (token !== openToken) return;
    draft.value = buildDraft(props.product, inventory, percents.value);
    original.value = snapshot(draft.value);
  } catch (error) {
    if (token !== openToken) return;
    if (error?.status === 401) emit('session-expired');
    else loadFailed.value = true;
  } finally {
    if (token === openToken) loading.value = false;
  }
};

watch(() => [props.open, props.product], ([open]) => {
  if (open) begin();
}, { immediate: true });

// ── New product: SKU follows the first category ───────────────────
let skuToken = 0;

const onCategoryChange = async () => {
  const d = draft.value;
  if (!d || isEditing.value) return;
  const token = ++skuToken;
  const first = d.categories[0];
  if (!first) {
    d.sku = '';
    for (const s of d.sizes) for (const c of s.colors) if (!c.skuManual) c.sku = '';
    return;
  }
  try {
    const { sku } = await api.getNextSku(first);
    if (token !== skuToken || draft.value !== d) return;
    d.sku = sku;
    d.sizes = refreshSkus(d.sizes, sku);
  } catch (error) {
    if (token !== skuToken) return;
    if (error?.status === 401) emit('session-expired');
    else flash(t.value.skuFailed, true);
  }
};

const onSkuChange = () => {
  if (draft.value) draft.value.sizes = refreshSkus(draft.value.sizes, draft.value.sku);
};

// ── Saving ────────────────────────────────────────────────────────
const problemText = (problem) => {
  const entry = t.value[`problem${problem.key[0].toUpperCase()}${problem.key.slice(1)}`];
  return typeof entry === 'function' ? entry(problem.arg) : entry;
};

// Photos are processed in the browser and uploaded one by one, as the old form did.
const uploadNewImages = async (d) => {
  let gallery = 1;
  for (const img of d.images) {
    if (!img.isNew) continue;
    const baseName = `${d.sku}${img.isMain ? '' : `-g${gallery++}`}-${Date.now()}`;
    const files = await processProductImage(img.file, baseName);
    await api.uploadImage(files);
    img.image_key = baseName;
    img.isNew = false;
    img.file = null;
  }
};

const save = async ({ asDraft = false } = {}) => {
  const d = draft.value;
  if (!d || saving.value) return;

  const problem = validateDraft(d);
  if (problem) {
    flash(problemText(problem), true);
    return;
  }

  saving.value = true;
  try {
    if (!d.sku) {
      d.sku = (await api.getNextSku(d.categories[0])).sku;
      d.sizes = refreshSkus(d.sizes, d.sku);
    }
    if (d.images.some((i) => i.isNew)) {
      savingLabel.value = t.value.uploading;
      try {
        await uploadNewImages(d);
      } catch (error) {
        if (error?.status === 401) throw error;
        flash(t.value.uploadFailed, true);
        return;
      }
    }
    savingLabel.value = t.value.saving;
    const payload = buildPayload({ ...d, isVisible: asDraft ? false : d.isVisible });
    if (isEditing.value) await api.updateProduct(props.product.id, payload);
    else await api.addProduct(payload);
    emit('saved');
    emit('close');
  } catch (error) {
    if (error?.status === 401) emit('session-expired');
    else flash(t.value.saveFailed(error?.message || ''), true);
  } finally {
    saving.value = false;
    savingLabel.value = '';
  }
};

// ── Closing ───────────────────────────────────────────────────────
const dirty = computed(() => Boolean(draft.value) && isDirty(draft.value, original.value));
const guarded = (action) => {
  if (dirty.value) pendingAction.value = action;
  else action();
};
const requestClose = () => guarded(() => emit('close'));
const requestArchive = () => guarded(() => emit('archive', props.product.id));
const confirmDiscard = () => {
  const action = pendingAction.value;
  pendingAction.value = null;
  if (action) action();
};

const keepButton = ref(null);
const lightbox = ref(null);
watch(pendingAction, async (value) => {
  if (!value) return;
  await nextTick();
  keepButton.value?.focus();
});
watch(zoomSrc, async (value) => {
  if (!value) return;
  await nextTick();
  lightbox.value?.focus();
});

// Esc closes the panel, unless a dialog or the photo preview is open: those close themselves.
const onKey = (event) => {
  if (event.key !== 'Escape' || !props.open) return;
  if (document.querySelector('.pe-dialog-back, .pe-lightbox')) return;
  requestClose();
};
onMounted(() => document.addEventListener('keydown', onKey));
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey);
  clearTimeout(toastTimer);
});
</script>

<template>
  <div v-if="open" class="pe-backdrop" @click="requestClose"></div>

  <transition name="pe-slide">
    <section v-if="open" class="pe-panel" role="dialog" aria-modal="true" :aria-label="isEditing ? t.titleEdit : t.titleAdd">
      <header class="pe-head">
        <h2 class="pe-head-title pe-serif">{{ isEditing ? t.titleEdit : t.titleAdd }}</h2>
        <div class="pe-crumb">{{ t.crumb }} / <b>{{ isEditing ? t.titleEdit : t.titleAdd }}</b></div>
        <span class="pe-head-spacer"></span>
        <button type="button" class="pe-iconbtn" :aria-label="t.close" :title="t.close" @click="requestClose">×</button>
      </header>

      <div class="pe-scroll">
        <div v-if="loading" class="pe-center" role="status">{{ t.loading }}</div>
        <div v-else-if="loadFailed" class="pe-center">
          <p>{{ t.loadError }}</p>
          <button type="button" class="pe-btn" @click="begin">{{ t.retry }}</button>
        </div>
        <div v-else-if="draft" :key="session" class="pe-layout">
          <aside class="pe-side">
            <ProductStatusCard :draft="draft" :t="t" />
            <section class="pe-card pe-card-tight">
              <div class="pe-switch-row">
                <div>
                  <b>{{ t.displayTitle }}</b>
                  <div class="pe-hint" style="margin-top: 2px">{{ draft.isVisible ? t.displayOn : t.displayOff }}</div>
                </div>
                <ProductSwitch v-model="draft.isVisible" :label="t.displayTitle" />
              </div>
            </section>
            <ProductCategoriesCard
              :draft="draft" :categories="categories" :is-editing="isEditing" :lang="lang" :t="t"
              @category-change="onCategoryChange" @sku-change="onSkuChange"
            />
          </aside>
          <main class="pe-main">
            <ProductBasicInfo :draft="draft" :lang="lang" :t="t" />
            <ProductImages :draft="draft" :t="t" @zoom="zoomSrc = $event" />
            <ProductSizesPricing :draft="draft" :percents="percents" :t="t" @update:percents="percents = $event" />
          </main>
        </div>
      </div>

      <footer class="pe-foot">
        <button type="button" class="pe-btn" @click="requestClose">{{ t.cancel }}</button>
        <button v-if="isEditing" type="button" class="pe-btn" :disabled="saving" @click="requestArchive">{{ t.archive }}</button>
        <span class="pe-head-spacer"></span>
        <span v-if="saving" class="pe-hint" role="status">{{ savingLabel }}</span>
        <button type="button" class="pe-btn" :disabled="!draft || saving" @click="save({ asDraft: true })">{{ t.saveDraft }}</button>
        <button type="button" class="pe-btn pe-btn-pri" :disabled="!draft || saving" @click="save()">{{ isEditing ? t.update : t.add }}</button>
      </footer>
    </section>
  </transition>

  <div v-if="pendingAction" class="pe-dialog-back" @click.self="pendingAction = null">
    <div class="pe-dialog" role="alertdialog" aria-modal="true" :aria-label="t.discardTitle" @keydown.esc.stop="pendingAction = null">
      <h2 class="pe-serif">{{ t.discardTitle }}</h2>
      <p>{{ t.discardBody }}</p>
      <div class="pe-dialog-actions">
        <span class="pe-spacer"></span>
        <button ref="keepButton" type="button" class="pe-btn pe-btn-pri" @click="pendingAction = null">{{ t.keepEditing }}</button>
        <button type="button" class="pe-btn" @click="confirmDiscard">{{ t.discard }}</button>
      </div>
    </div>
  </div>

  <div v-if="zoomSrc" ref="lightbox" class="pe-lightbox" tabindex="-1" role="dialog" aria-modal="true" @click.self="zoomSrc = null" @keydown.esc.stop="zoomSrc = null">
    <button type="button" class="pe-lightbox-x" :aria-label="t.imgClose" @click="zoomSrc = null">×</button>
    <img :src="zoomSrc" alt="" />
  </div>

  <div v-if="toast && open" role="status" class="pe-toast" :class="{ 'is-error': toast.error }">{{ toast.message }}</div>
</template>
```

- [ ] **Step 2: Wire the Inventory page.** In `views/admin/AdminInventoryPage.vue`:

(a) Replace the import `import AdminProductForm from '../../components/admin-product-form.vue';` with

```js
import ProductEditPanel from '../../components/admin/product-edit/ProductEditPanel.vue';
```

(b) In the "Product form" section, directly after `closeForm`, add:

```js
// Saved from the panel: say so, and reload the list so it shows the new prices and options.
const onSaved = () => {
  flash(t.value.toastSaved);
  load({ silent: true });
};
// Archive from inside the panel runs the page's own confirmed, Undo-able archive.
const onPanelArchive = (id) => {
  closeForm();
  askArchive([id]);
};
```

(c) Replace the `<AdminProductForm … />` element at the bottom of the template with

```vue
  <ProductEditPanel
    :open="formOpen"
    :product="editing"
    :categories="categories"
    @close="closeForm"
    @saved="onSaved"
    @archive="onPanelArchive"
    @session-expired="handleAuthError({ status: 401 })"
  />
```

- [ ] **Step 3: Confirm nothing else uses the old form, then delete it.**

Run (repo root): `grep -rn "admin-product-form\|AdminProductForm" frontend/kitweb/src`
Expected: no matches (the page import was the only user). Then delete `frontend/kitweb/src/components/admin-product-form.vue` (`git rm` is not needed; the file is tracked, so removing it shows as a deletion in `git status`).

- [ ] **Step 4: Compile-check the panel and the page**

Run (from `frontend/kitweb/`): the Task 8 Step 7 command against `src/components/admin/product-edit/ProductEditPanel.vue src/views/admin/AdminInventoryPage.vue`
Expected: both `ok`.

- [ ] **Step 5: Run the frontend suite** — `npx vitest run` — all green.

**Checkpoint:** the new panel replaces the old form; everything compiles; unit suites are green.

---

### Task 12: Verify end to end

**Files:** none changed (fixes found here go back into the file that owns them).

- [ ] **Step 1: Full unit suites**

Run (from `hidden-water-ed9d/`): `npx vitest run --config vitest.local.config.mts` — expected: all files pass.
Run (from `frontend/kitweb/`): `npx vitest run` — expected: all files pass.

- [ ] **Step 2: Bundle the frontend once** to catch import/resolve mistakes the SFC check cannot.

Run (from `frontend/kitweb/`): `npx vite build --outDir "C:/Users/herby/AppData/Local/Temp/claude/d--GitHub-KitWeb/b10560a1-4312-41cf-ad87-aae427786aa0/scratchpad/dist-check" --emptyOutDir`
Expected: `✓ built in …` with no errors. If it fails for a reason that does not mention `product-edit`, `admin-product-edit.css` or `AdminInventoryPage`, note it as pre-existing and continue; do not run `npm run build` (it is vite-ssg and prerenders every page over the network).

- [ ] **Step 3: Local run against a throwaway database.** (Requires only the local tools; no Cloudflare login.)

3a. Create a seed file `C:/Users/herby/AppData/Local/Temp/claude/d--GitHub-KitWeb/b10560a1-4312-41cf-ad87-aae427786aa0/scratchpad/seed-local.sql` containing the table DDL the Worker needs (copy the `DDL` array contents of `hidden-water-ed9d/test/helpers/db.ts` as plain SQL statements, plus `CREATE TABLE admin_sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);`), then this seed (token `local-test-token`; its SHA-256 hex is computed in the next command):

```sql
INSERT INTO categories (name, name_th, path) VALUES ('Needles', 'เข็ม', 'needles'), ('Yarn', 'ไหมพรม', 'yarn');
INSERT INTO products (name, name_th, description, sku, moq, price_1, price_2, price_3, price_4, price_5, category, image_key, is_visible, slug)
  VALUES ('Acrylic Yarn', 'ไหมอะคริลิก', 'Soft acrylic yarn.', 'YN-014', '20 pcs', 70, 63, 53, 39, 35, 'yarn', NULL, 1, 'acrylic-yarn-1'),
         ('Hand Needles', 'เข็มเย็บมือ', 'Needles.', 'NE004', '100', 2000, 1500, 1200, 1100, 1000, 'needles', NULL, 1, 'hand-needles-2');
INSERT INTO product_categories (product_id, category_path) VALUES (1, 'yarn'), (2, 'needles');
INSERT INTO product_images (product_id, image_key, attribute_type, attribute_value, price_1) VALUES
  (1, 'yarn-red', 'variant_link', 'Red', 70), (1, 'yarn-navy', 'variant_link', 'Navy', NULL), (2, 'needle-1', 'gallery', '', NULL);
```

3b. Apply it and start the Worker (from `hidden-water-ed9d/`; use the localtest config because the real one needs a login for the `ai` binding):

```
HASH=$(node -e "console.log(require('crypto').createHash('sha256').update('local-test-token').digest('hex'))")
npx wrangler d1 execute product-db --local --persist-to ../.tmp-local-d1 -c wrangler.localtest.jsonc --file "<seed-local.sql path>"
npx wrangler d1 execute product-db --local --persist-to ../.tmp-local-d1 -c wrangler.localtest.jsonc --command "INSERT INTO admin_sessions (token_hash, expires_at) VALUES ('$HASH', 4102444800000)"
npx wrangler dev -c wrangler.localtest.jsonc --persist-to ../.tmp-local-d1 --port 8787
```
(`../.tmp-local-d1` is inside the repo folder; delete it when finished, and do not commit it.)

3c. Start Vite in another terminal (from `frontend/kitweb/`): `VITE_API_URL=http://127.0.0.1:8787 npx vite --port 5173`.

3d. Drive it with a browser. If Playwright is available (`npx playwright --version`, or `playwright-core` plus a system Chrome as in the earlier local-testing recipe), script: set `localStorage.admin_token = 'local-test-token'` before load, open `http://localhost:5173/en/admin/inventory`, click **Edit** on "Hand Needles", and check:
  - the panel slides in from the right; status card shows a percentage; the sizes card shows one size "Standard", **Pieces per box = 100**, box prices 2000 / 1500 / 1200 / 1100 / 1000, **Per piece = 20 / 15 / 12 / 11 / 10**, and L1–L4 are *not* grey (they differ from the formula);
  - change L5 to 900 → nothing else changes (manual prices); clear L1, then type 900 into L5 → L1 refills to 1800 (grey);
  - add a size "200 pcs", type 800 in its L5 → its L1–L4 fill 1600 / 1440 / 1280 / 1040;
  - add a color, give it a name and stock 50; the SKU appears as `NE004-STANDARD-<COL>`;
  - **Update product** → panel closes, "Product saved." toast, list reloads;
  - reopen the product: sizes/colors are back, stock 50; then check the database: `npx wrangler d1 execute product-db --local --persist-to ../.tmp-local-d1 -c wrangler.localtest.jsonc --command "SELECT price_1,price_5,moq FROM products WHERE id=2"` shows the first size's box prices and `moq` still `100`;
  - open "Acrylic Yarn" (variants Red/Navy, moq `20 pcs`): two sizes appear, **Save as draft** without touching anything → `products.price_1` is still 70 and `moq` is still `20 pcs`, `is_visible` is 0;
  - Cancel with an edit → "Discard your changes?" appears; Esc closes only the dialog;
  - take screenshots at 1440 px and 390 px wide and compare with the mockup folder.
If no browser tooling is available, do the same checks with `curl` against the Worker (GET `/products/2/inventory`, PUT with a payload built by `buildPayload`), say plainly in the report that the visual check was **not** performed, and leave the manual list above for the owner.

3e. Stop both servers and remove `../.tmp-local-d1`.

- [ ] **Step 4: Update the spec status.** In both spec files change the `**Status:**` line to `Implemented locally; not deployed (see plan Task 13)` (Part A) and leave Part B untouched.

**Checkpoint:** automated suites green; local end-to-end run done (or its gap reported honestly).

---

### Task 13: Roll out to production (needs the owner's go-ahead and a fresh `wrangler login`)

**Do not run this task on your own.** It changes the live database and live site. The owner has not yet said to deploy. Ask for the go-ahead, and ask them to run `npx wrangler login` first (the stored token expired on 2026-10-23: "Authentication error [code: 10000]").

**Files:** none.

Order matters (from the deploy-workflow note): migration → Worker → frontend. A Worker deployed before the migration would fail on the new tables; a frontend deployed before the Worker would send an `inventory` block the old Worker ignores (and silently lose sizes/colors).

- [ ] **Step 1: Back up the live database** (from `hidden-water-ed9d/`; the owner's shell is PowerShell 5.1, so chain with `;` and check `$LASTEXITCODE`, and call `./node_modules/.bin/wrangler` if `npx` asks for a newer wrangler):
`npx wrangler d1 export product-db --remote --output C:\Users\herby\product-db-pre-0023.sql`
Expected: a file of tens of KB or more; open its first lines to confirm it has `CREATE TABLE` statements and the 145 products.

- [ ] **Step 2: Apply the migration** (never `migrations apply`; it would re-run old migrations including seed files):
`npx wrangler d1 execute product-db --remote --file=migrations/0023_product_sizes_colors.sql`
Verify: `npx wrangler d1 execute product-db --remote --command "SELECT name FROM sqlite_master WHERE name IN ('product_sizes','product_colors','stock_movements') ORDER BY name"` returns the three tables.

- [ ] **Step 3: Deploy the Worker** (`npm run deploy` in `hidden-water-ed9d/`, i.e. `wrangler deploy`). Verify: `GET https://hidden-water-ed9d.shop-backend-kitweb.workers.dev/products/1/inventory` without a token returns 401 (the route exists and is protected), and the public storefront `GET /products` still returns products.

- [ ] **Step 4: Build and deploy the frontend by hand** (a git push deploys nothing). From `frontend/kitweb/`, with **no** `VITE_API_URL` set (it is the local-testing override and would point the bundle at 127.0.0.1):
```
npm run build
npx wrangler pages deploy dist --project-name kitweb --branch main
```
Verify on the live admin: open a product, **Update product** without changing anything, and confirm on the public product page that the price range and the order dialog's box step are unchanged.

- [ ] **Step 5: Tell the owner what changed and how to roll back** (restore from `product-db-pre-0023.sql` is not needed for the additive tables; to revert the feature, redeploy the previous Worker and Pages versions: `wrangler rollback` for the Worker).

---

## Self-review (run after writing; findings fixed inline above)

**Spec coverage** — every section of the (Task 0-amended) spec maps to a task: Problem/pricing explanation → Global Constraints; Decisions table → Tasks 2–6; Data model → Task 1; Legacy import → Task 6 (`importLegacy`, `buildDraft`); Mirror rules 1–6 → Tasks 2–4 (rule 3, the moq text, is `moqText` in Task 5); API → Tasks 3–4 plus `getProductInventory` (Task 8); Frontend tree and mockup→implementation table → Tasks 8–11; "features the mockup lacks" → pieces per box (Task 10), Thai content (Task 8 BasicInfo, Task 10 size/color Thai fields), usage picker (Task 8), Archive (Task 11), toasts instead of `alert()` (Task 11); Testing → Tasks 2–6 and 12; Rollout → Task 13; Out of scope items are not implemented anywhere.

**Placeholder scan** — no TBD/TODO; every code step has its code. Task 12's seed SQL says "copy the DDL array from `test/helpers/db.ts`" rather than repeating ~80 lines of DDL; that file is in the repo and the copy is mechanical.

**Type consistency** — names used across tasks: `inventory.sizes[].colors[]` fields (`stock_loaded`, `is_visible`, `sort_order`), image payload keys (`size_ref`, `color_name`, `passthrough`, `price_1..5`), draft fields (`piecesPerBox`, `moqOriginal`, `baseFromLegacy`, `legacySizes`, `legacyColors`), card fields (`sizeRef`, `colorRef`, `inRows`, `isNew`, `passthrough`), text keys (`problem<Key>`, `lvl1..5`, `fm*`, `sz*`, `col*`, `img*`) and function names match between the util (Tasks 5–6), the text util (Task 7) and the components (Tasks 8–11).
