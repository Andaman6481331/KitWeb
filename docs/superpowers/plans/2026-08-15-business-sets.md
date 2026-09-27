# KITCRAFT Business Sets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a wholesale buyer request a fixed bundle of products at fixed quantities as a single unit, instead of selecting dozens of SKUs by hand.

**Architecture:** Two new D1 tables (`product_sets`, `product_set_items`) behind four Cloudflare Worker endpoints that return each set with its component prices already denormalized. The frontend computes the rolled-up price using the existing `productPricing.js` helpers, so the box→per-piece maths lives in exactly one place. "Request this set" reuses the existing RFQ pipeline unchanged — a set submits as its component lines, so `orders`, `order_items`, the cart and fulfilment are untouched.

**Tech Stack:** Cloudflare Workers (TypeScript) + D1, Vue 3 `<script setup>`, vue-router, vue-i18n, vite-ssg, vitest (`@cloudflare/vitest-pool-workers` for the worker; plain vitest newly added for the frontend).

**Spec:** `docs/superpowers/specs/2026-08-15-business-sets-design.md`

## Global Constraints

- **Price tiers 1–3 only.** `price_4` and `price_5` are staff-only and must never reach a customer-facing total. Reject `price_tier` outside 1–3 with a 400.
- **Quantities are pieces, snapped to MOQ multiples.** Snapping happens in the admin editor at entry time. Public pages never re-snap.
- **`productPricing.js` is not modified.** All new maths builds on `parseMoq`, `toPerPiece`, `roundHalfUp` from `frontend/kitweb/src/utils/productPricing.js`.
- **`/rfq/submit` is not modified.** Its payload is already `items: [{ id, title, quantity }]`.
- **No set stock, no set SKU, no cart path for sets, no retail-catalog exposure.**
- **`projects` and `product_ids` are not touched.**
- Bilingual fields follow the existing convention: `name` / `name_th`, Thai used when `locale === 'th'` and the `_th` value is non-empty, English otherwise.
- Admin worker routes go **after** the blanket auth gate at `hidden-water-ed9d/src/index.ts:1283-1287`; public routes go before it.

---

### Task 1: Repair the worker test baseline and build a D1 test harness

The suite is currently red: `test/index.spec.ts` is the untouched Hello World scaffold asserting `"Hello World!"` while the worker returns `"Unauthorized"` for `/`. Nothing else in this plan can be verified until this is fixed. The two stale tests are deleted, not repaired — they assert behaviour the worker never had.

`applyD1Migrations` is **not** used: `migrations/` has duplicate numeric prefixes (`0002`, `0013`, `0014`, `0015` each appear twice), so ordering is ambiguous. The harness applies an explicit, minimal set of DDL instead.

**Files:**
- Delete: `hidden-water-ed9d/test/index.spec.ts`
- Create: `hidden-water-ed9d/test/helpers/db.ts`
- Create: `hidden-water-ed9d/test/health.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `resetDb(): Promise<void>` and `seedProduct(p: Partial<ProductSeed>): Promise<number>` from `test/helpers/db.ts`, used by every later worker test. `ProductSeed` fields: `name`, `name_th`, `sku`, `moq`, `price_1`, `price_2`, `price_3`, `is_visible`, `image_key`.

- [ ] **Step 1: Delete the stale scaffold test**

```bash
rm hidden-water-ed9d/test/index.spec.ts
```

- [ ] **Step 2: Write the DB helper**

Create `hidden-water-ed9d/test/helpers/db.ts`:

```ts
import { env } from "cloudflare:test";

// Explicit DDL rather than applyD1Migrations: migrations/ has duplicate numeric
// prefixes (0002, 0013, 0014, 0015 each appear twice), so migration order is
// ambiguous. These are the only tables the business-set endpoints touch.
const DDL = [
	`CREATE TABLE IF NOT EXISTS products (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL, description TEXT, price REAL DEFAULT 0.0,
		image_key TEXT, category TEXT, stock INTEGER DEFAULT 0,
		usage TEXT, use_for TEXT, varieties TEXT, sizes TEXT, colors TEXT,
		price_1 REAL, price_2 REAL, price_3 REAL, price_4 REAL, price_5 REAL,
		name_th TEXT, sku TEXT UNIQUE, moq TEXT,
		is_visible INTEGER DEFAULT 1,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	)`,
	`CREATE TABLE IF NOT EXISTS product_variants (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		product_id INTEGER NOT NULL, variant_name TEXT NOT NULL, sku TEXT UNIQUE NOT NULL,
		price_1 REAL DEFAULT 0.0, price_2 REAL DEFAULT 0.0, price_3 REAL DEFAULT 0.0,
		price_4 REAL DEFAULT 0.0, price_5 REAL DEFAULT 0.0,
		stock INTEGER DEFAULT 0, image_key TEXT
	)`,
	`CREATE TABLE IF NOT EXISTS product_sets (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL, name_th TEXT, slug TEXT NOT NULL UNIQUE,
		cover_image_key TEXT, description TEXT, description_th TEXT,
		price_tier INTEGER DEFAULT 1, discount_pct REAL DEFAULT 0,
		is_published INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	)`,
	`CREATE TABLE IF NOT EXISTS product_set_items (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		set_id INTEGER NOT NULL, product_id INTEGER NOT NULL, variant_id INTEGER,
		quantity INTEGER NOT NULL, sort_order INTEGER DEFAULT 0,
		FOREIGN KEY (set_id) REFERENCES product_sets(id) ON DELETE CASCADE
	)`
];

const TABLES = ["product_set_items", "product_sets", "product_variants", "products"];

export async function resetDb(): Promise<void> {
	for (const table of TABLES) {
		await env.DB.prepare(`DROP TABLE IF EXISTS ${table}`).run();
	}
	for (const ddl of DDL) {
		await env.DB.prepare(ddl).run();
	}
}

export interface ProductSeed {
	name: string; name_th: string | null; sku: string; moq: string;
	price_1: number; price_2: number; price_3: number;
	is_visible: number; image_key: string | null;
}

export async function seedProduct(p: Partial<ProductSeed> = {}): Promise<number> {
	const row = {
		name: "Test Product", name_th: null, sku: `SKU-${Math.random().toString(36).slice(2, 9)}`,
		moq: "20 pcs", price_1: 800, price_2: 0, price_3: 0, is_visible: 1, image_key: null,
		...p
	};
	const res = await env.DB.prepare(
		`INSERT INTO products (name, name_th, sku, moq, price_1, price_2, price_3, is_visible, image_key)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).bind(row.name, row.name_th, row.sku, row.moq, row.price_1, row.price_2, row.price_3,
		row.is_visible, row.image_key).run();
	return Number(res.meta.last_row_id);
}
```

- [ ] **Step 3: Write a real health test that fails for the right reason**

Create `hidden-water-ed9d/test/health.spec.ts`:

```ts
import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, seedProduct } from "./helpers/db";

describe("test harness", () => {
	beforeEach(resetDb);

	it("gives each test an isolated DB with the business-set tables present", async () => {
		const id = await seedProduct({ name: "Cloud Yarn", moq: "20 pcs", price_1: 840 });
		const row = await env.DB.prepare("SELECT name, moq FROM products WHERE id = ?").bind(id).first();
		expect(row).toEqual({ name: "Cloud Yarn", moq: "20 pcs" });

		const sets = await env.DB.prepare("SELECT COUNT(*) AS n FROM product_sets").first();
		expect(sets).toEqual({ n: 0 });
	});

	it("rejects unauthenticated admin routes", async () => {
		const res = await SELF.fetch("https://example.com/business-sets", { method: "POST" });
		expect(res.status).toBe(401);
	});
});
```

- [ ] **Step 4: Run and confirm the harness passes but the 401 test fails**

Run: `cd hidden-water-ed9d && npx vitest run`
Expected: the isolation test PASSES; the 401 test FAILS (the route does not exist yet, so the worker falls through to its 404/other handler). This is the correct starting state — Task 3 makes it pass.

If the isolation test fails, stop and fix the harness before continuing.

- [ ] **Step 5: Commit**

```bash
git add hidden-water-ed9d/test/
git commit -m "Replace the scaffold worker tests with a real D1 harness"
```

---

### Task 2: Frontend test runner and the set roll-up module

The frontend has no test runner at all. This task adds one and uses it immediately for the roll-up maths — the place where a wrong number becomes a wrong wholesale quote.

**Files:**
- Modify: `frontend/kitweb/package.json` (add `test` script + vitest devDependency)
- Create: `frontend/kitweb/vitest.config.js`
- Create: `frontend/kitweb/src/utils/setPricing.js`
- Test: `frontend/kitweb/src/utils/setPricing.spec.js`

**Interfaces:**
- Consumes: `parseMoq`, `toPerPiece`, `roundHalfUp` from `src/utils/productPricing.js` (unchanged).
- Produces:
  - `tierBoxPrice(line, tier) -> number` — the line's box price at `tier`, falling back down through lower tiers, else 0.
  - `rollUpSet(set) -> { lines, subtotal, discountAmount, total }` where each entry of `lines` is the input line plus `perPiecePrice` and `lineTotal`.

- [ ] **Step 1: Add vitest to the frontend**

In `frontend/kitweb/package.json`, add to `scripts`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

and to `devDependencies`:

```json
"vitest": "~3.2.0"
```

Then install:

```bash
cd frontend/kitweb && npm install
```

- [ ] **Step 2: Add the vitest config**

Create `frontend/kitweb/vitest.config.js`:

```js
import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/*.spec.js']
    },
    resolve: {
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
    }
});
```

- [ ] **Step 3: Write the failing tests**

Create `frontend/kitweb/src/utils/setPricing.spec.js`:

```js
import { describe, it, expect } from 'vitest';
import { tierBoxPrice, rollUpSet } from './setPricing';

const line = (over = {}) => ({
    product_id: 1, variant_id: null, quantity: 20, name: 'Cloud Yarn',
    moq: '20 pcs', price_1: 840, price_2: 0, price_3: 0, ...over
});

describe('tierBoxPrice', () => {
    it('returns the requested tier when it is populated', () => {
        expect(tierBoxPrice(line({ price_1: 840, price_2: 800, price_3: 760 }), 3)).toBe(760);
    });

    it('falls back down to the next populated tier', () => {
        expect(tierBoxPrice(line({ price_1: 840, price_2: 800, price_3: 0 }), 3)).toBe(800);
    });

    it('returns 0 when no tier is populated', () => {
        expect(tierBoxPrice(line({ price_1: 0, price_2: 0, price_3: 0 }), 1)).toBe(0);
    });
});

describe('rollUpSet', () => {
    it('prices a line per piece and multiplies by quantity', () => {
        // 840 per box of 20 -> 42.00 per piece; 20 pieces -> 840.00
        const out = rollUpSet({ price_tier: 1, discount_pct: 0, items: [line()] });
        expect(out.lines[0].perPiecePrice).toBe(42);
        expect(out.lines[0].lineTotal).toBe(840);
        expect(out.subtotal).toBe(840);
        expect(out.total).toBe(840);
    });

    it('sums multiple lines', () => {
        const out = rollUpSet({
            price_tier: 1, discount_pct: 0,
            items: [line(), line({ name: 'Safety Eyes', moq: '50 pcs', price_1: 160, quantity: 50 })]
        });
        expect(out.subtotal).toBe(1000);
    });

    it('applies the discount percentage to the subtotal', () => {
        const out = rollUpSet({ price_tier: 1, discount_pct: 5, items: [line()] });
        expect(out.discountAmount).toBe(42);
        expect(out.total).toBe(798);
    });

    it('treats a line with no populated tier as zero rather than NaN', () => {
        const out = rollUpSet({
            price_tier: 1, discount_pct: 0,
            items: [line({ price_1: 0, price_2: 0, price_3: 0 })]
        });
        expect(out.lines[0].lineTotal).toBe(0);
        expect(out.subtotal).toBe(0);
    });

    it('defaults a missing moq to a box of 1 rather than dividing by zero', () => {
        const out = rollUpSet({
            price_tier: 1, discount_pct: 0,
            items: [line({ moq: null, price_1: 15, quantity: 3 })]
        });
        expect(out.lines[0].perPiecePrice).toBe(15);
        expect(out.lines[0].lineTotal).toBe(45);
    });

    it('returns a zero total for a set with no items', () => {
        const out = rollUpSet({ price_tier: 1, discount_pct: 10, items: [] });
        expect(out.subtotal).toBe(0);
        expect(out.total).toBe(0);
    });
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `cd frontend/kitweb && npx vitest run src/utils/setPricing.spec.js`
Expected: FAIL — `Failed to resolve import "./setPricing"`.

- [ ] **Step 5: Write the implementation**

Create `frontend/kitweb/src/utils/setPricing.js`:

```js
// Roll-up maths for Business Sets. Builds on productPricing.js rather than
// repeating it, so the box -> per-piece rule has exactly one definition.
import { parseMoq, toPerPiece, roundHalfUp } from './productPricing';

// Customer-facing tiers only. price_4/price_5 are staff-only and must never
// reach a set total.
const CUSTOMER_TIERS = [1, 2, 3];

// The line's box price at `tier`, falling back down through lower tiers when the
// requested one is unset. Mirrors tierBoxPriceForRow in add-to-order-modal.vue.
export const tierBoxPrice = (line, tier) => {
    if (!line) return 0;
    const start = CUSTOMER_TIERS.includes(Number(tier)) ? Number(tier) : 1;
    for (let t = start; t >= 1; t--) {
        const price = Number(line[`price_${t}`]) || 0;
        if (price > 0) return price;
    }
    return 0;
};

export const rollUpSet = (set) => {
    const items = set?.items || [];
    const tier = set?.price_tier ?? 1;

    const lines = items.map((line) => {
        const perPiecePrice = toPerPiece(tierBoxPrice(line, tier), parseMoq(line.moq));
        return {
            ...line,
            perPiecePrice,
            lineTotal: roundHalfUp(perPiecePrice * (Number(line.quantity) || 0), 2)
        };
    });

    const subtotal = roundHalfUp(lines.reduce((sum, l) => sum + l.lineTotal, 0), 2);
    const discountPct = Number(set?.discount_pct) || 0;
    const discountAmount = roundHalfUp(subtotal * (discountPct / 100), 2);

    return { lines, subtotal, discountAmount, total: roundHalfUp(subtotal - discountAmount, 2) };
};
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd frontend/kitweb && npx vitest run src/utils/setPricing.spec.js`
Expected: PASS, 7 tests.

- [ ] **Step 7: Commit**

```bash
git add frontend/kitweb/package.json frontend/kitweb/package-lock.json \
        frontend/kitweb/vitest.config.js frontend/kitweb/src/utils/setPricing.js \
        frontend/kitweb/src/utils/setPricing.spec.js
git commit -m "Add a frontend test runner and the set roll-up maths"
```

---

### Task 3: Migration and public read endpoints

**Files:**
- Create: `hidden-water-ed9d/migrations/0017_add_business_sets.sql`
- Modify: `hidden-water-ed9d/src/index.ts` (helpers near the other `map*Row` functions around line 98–124; routes near the `/projects` GET at line 520)
- Test: `hidden-water-ed9d/test/business-sets-read.spec.ts`

**Interfaces:**
- Consumes: `resetDb`, `seedProduct` from Task 1.
- Produces: `GET /business-sets` and `GET /business-sets/:slug`, returning the set shape consumed by Tasks 5, 7 and 8:
  ```
  { id, name, name_th, slug, cover_image_key, description, description_th,
    price_tier, discount_pct, is_published, sort_order, created_at,
    is_incomplete, items: [ { id, product_id, variant_id, quantity, sort_order,
      name, name_th, moq, price_1, price_2, price_3, image_key, missing } ] }
  ```

- [ ] **Step 1: Write the migration**

Create `hidden-water-ed9d/migrations/0017_add_business_sets.sql`:

```sql
-- Business Sets: fixed wholesale bundles at fixed quantities. A set is a
-- shop-curated RFQ preset, not a SKU -- it has no stock and no cart path, and is
-- requested through the existing /rfq/submit pipeline as its component lines.
--
-- A junction table rather than a JSON column (as projects.product_ids uses):
-- these rows carry a quantity and get joined for price denormalization, which is
-- exactly what the JSON approach cannot do.

CREATE TABLE IF NOT EXISTS product_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_th TEXT,
    slug TEXT NOT NULL UNIQUE,
    cover_image_key TEXT,
    description TEXT,
    description_th TEXT,
    -- 1..3 only; price_4/price_5 are staff-only and never reach a customer total.
    price_tier INTEGER DEFAULT 1,
    discount_pct REAL DEFAULT 0,
    is_published INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_set_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    set_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    -- Optional: pins a specific variant, whose prices win over the parent's.
    variant_id INTEGER,
    -- Pieces, already snapped to an MOQ multiple by the admin editor.
    quantity INTEGER NOT NULL,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (set_id) REFERENCES product_sets(id) ON DELETE CASCADE,
    -- Deliberately no ON DELETE CASCADE: a deleted product must break the set
    -- loudly (is_incomplete) rather than silently shrink it.
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_product_sets_published
    ON product_sets (is_published, sort_order);
CREATE INDEX IF NOT EXISTS idx_product_set_items_set
    ON product_set_items (set_id);
```

- [ ] **Step 2: Write the failing tests**

Create `hidden-water-ed9d/test/business-sets-read.spec.ts`:

```ts
import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, seedProduct } from "./helpers/db";

async function seedSet(over: Record<string, any> = {}) {
	const row = {
		name: "Amigurumi Starter Set", name_th: null, slug: "amigurumi-starter-set-1",
		price_tier: 1, discount_pct: 0, is_published: 1, sort_order: 0, ...over
	};
	const res = await env.DB.prepare(
		`INSERT INTO product_sets (name, name_th, slug, price_tier, discount_pct, is_published, sort_order)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`
	).bind(row.name, row.name_th, row.slug, row.price_tier, row.discount_pct,
		row.is_published, row.sort_order).run();
	return Number(res.meta.last_row_id);
}

async function seedItem(setId: number, productId: number, quantity: number, variantId: number | null = null) {
	await env.DB.prepare(
		"INSERT INTO product_set_items (set_id, product_id, variant_id, quantity) VALUES (?, ?, ?, ?)"
	).bind(setId, productId, variantId, quantity).run();
}

describe("GET /business-sets", () => {
	beforeEach(resetDb);

	it("returns published sets with denormalized component prices", async () => {
		const yarn = await seedProduct({ name: "Cloud Yarn", moq: "20 pcs", price_1: 840 });
		const setId = await seedSet();
		await seedItem(setId, yarn, 20);

		const res = await SELF.fetch("https://example.com/business-sets");
		expect(res.status).toBe(200);
		const body = await res.json() as any[];

		expect(body).toHaveLength(1);
		expect(body[0].slug).toBe("amigurumi-starter-set-1");
		expect(body[0].is_incomplete).toBe(false);
		expect(body[0].items).toHaveLength(1);
		expect(body[0].items[0]).toMatchObject({
			product_id: yarn, quantity: 20, name: "Cloud Yarn", moq: "20 pcs", price_1: 840
		});
	});

	it("omits unpublished sets", async () => {
		const p = await seedProduct();
		const setId = await seedSet({ is_published: 0 });
		await seedItem(setId, p, 20);

		const res = await SELF.fetch("https://example.com/business-sets");
		expect(await res.json()).toEqual([]);
	});

	it("omits sets whose component was hidden", async () => {
		const hidden = await seedProduct({ is_visible: 0 });
		const setId = await seedSet();
		await seedItem(setId, hidden, 20);

		const res = await SELF.fetch("https://example.com/business-sets");
		expect(await res.json()).toEqual([]);
	});

	it("prefers variant prices when a line pins a variant", async () => {
		const parent = await seedProduct({ name: "Crochet Hook", moq: "5 pcs", price_1: 500 });
		const v = await env.DB.prepare(
			`INSERT INTO product_variants (product_id, variant_name, sku, price_1, image_key)
			 VALUES (?, ?, ?, ?, ?)`
		).bind(parent, "4 inches", "HOOK-4IN", 300, "hook-4in").run();
		const variantId = Number(v.meta.last_row_id);

		const setId = await seedSet();
		await seedItem(setId, parent, 5, variantId);

		const res = await SELF.fetch("https://example.com/business-sets");
		const body = await res.json() as any[];
		// moq always comes from the parent; prices and image from the variant.
		expect(body[0].items[0]).toMatchObject({ variant_id: variantId, price_1: 300, moq: "5 pcs" });
	});

	it("orders sets by sort_order", async () => {
		const p = await seedProduct();
		const second = await seedSet({ slug: "second", sort_order: 2 });
		const first = await seedSet({ slug: "first", sort_order: 1 });
		await seedItem(second, p, 20);
		await seedItem(first, p, 20);

		const res = await SELF.fetch("https://example.com/business-sets");
		const body = await res.json() as any[];
		expect(body.map((s) => s.slug)).toEqual(["first", "second"]);
	});
});

describe("GET /business-sets/:slug", () => {
	beforeEach(resetDb);

	it("returns one set by slug", async () => {
		const p = await seedProduct({ name: "Cloud Yarn" });
		const setId = await seedSet();
		await seedItem(setId, p, 20);

		const res = await SELF.fetch("https://example.com/business-sets/amigurumi-starter-set-1");
		expect(res.status).toBe(200);
		expect((await res.json() as any).name).toBe("Amigurumi Starter Set");
	});

	it("404s an unknown slug", async () => {
		const res = await SELF.fetch("https://example.com/business-sets/nope");
		expect(res.status).toBe(404);
	});

	it("404s an incomplete set, because it has no correct price", async () => {
		const gone = await seedProduct();
		const setId = await seedSet();
		await seedItem(setId, gone, 20);
		await env.DB.prepare("DELETE FROM products WHERE id = ?").bind(gone).run();

		const res = await SELF.fetch("https://example.com/business-sets/amigurumi-starter-set-1");
		expect(res.status).toBe(404);
	});
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd hidden-water-ed9d && npx vitest run test/business-sets-read.spec.ts`
Expected: FAIL — the routes do not exist, so responses are not 200/404 as asserted.

- [ ] **Step 4: Add the helpers**

In `hidden-water-ed9d/src/index.ts`, after `mapGalleryRow` (around line 124), add:

```ts
/** Slug for a business set. Mirrors generateProjectSlug's non-Latin fallback. */
function generateSetSlug(name: string, id?: number | string): string {
	const ascii = (name || "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	if (ascii) return id ? `${ascii}-${id}` : ascii;
	return `set-${id ?? Date.now()}`;
}

/**
 * Load sets with their lines, denormalizing each component's name, MOQ and box
 * prices so the client can roll up a price without fetching the whole catalog.
 * Two queries and an in-memory join, never N+1.
 *
 * A line is `missing` when its product was deleted or hidden; a set with any
 * missing line is `is_incomplete` and has no correct price.
 */
async function loadSets(env: any, opts: { slug?: string; includeUnpublished?: boolean } = {}) {
	const conditions: string[] = [];
	const binds: any[] = [];
	if (opts.slug) {
		conditions.push("slug = ?");
		binds.push(opts.slug);
	}
	if (!opts.includeUnpublished) {
		conditions.push("(is_published IS NULL OR is_published = 1)");
	}

	let query = "SELECT * FROM product_sets";
	if (conditions.length) query += " WHERE " + conditions.join(" AND ");
	query += " ORDER BY sort_order ASC, id ASC";

	const { results: setRows } = await env.DB.prepare(query).bind(...binds).all();
	const sets = (setRows || []) as any[];
	if (!sets.length) return [];

	const placeholders = sets.map(() => "?").join(",");
	const { results: itemRows } = await env.DB.prepare(
		`SELECT i.id, i.set_id, i.product_id, i.variant_id, i.quantity, i.sort_order,
		        p.id AS p_id, p.name, p.name_th, p.moq, p.image_key AS p_image_key, p.is_visible,
		        p.price_1 AS p_price_1, p.price_2 AS p_price_2, p.price_3 AS p_price_3,
		        v.id AS v_id, v.variant_name, v.image_key AS v_image_key,
		        v.price_1 AS v_price_1, v.price_2 AS v_price_2, v.price_3 AS v_price_3
		 FROM product_set_items i
		 LEFT JOIN products p ON p.id = i.product_id
		 LEFT JOIN product_variants v ON v.id = i.variant_id
		 WHERE i.set_id IN (${placeholders})
		 ORDER BY i.sort_order ASC, i.id ASC`
	).bind(...sets.map((s) => s.id)).all();

	const bySet = new Map<number, any[]>();
	for (const r of (itemRows || []) as any[]) {
		// Deleted product -> no join row; hidden product -> is_visible 0.
		const missing = r.p_id === null || Number(r.is_visible) === 0;
		const useVariant = r.v_id !== null;
		const line = {
			id: Number(r.id),
			product_id: Number(r.product_id),
			variant_id: r.variant_id === null ? null : Number(r.variant_id),
			quantity: Number(r.quantity),
			sort_order: Number(r.sort_order) || 0,
			// Variant name is appended so a set line reads "Crochet Hook (4 inches)".
			name: useVariant && r.name ? `${r.name} (${r.variant_name})` : r.name,
			name_th: r.name_th,
			// MOQ is the box size and always lives on the parent product.
			moq: r.moq,
			price_1: Number(useVariant ? r.v_price_1 : r.p_price_1) || 0,
			price_2: Number(useVariant ? r.v_price_2 : r.p_price_2) || 0,
			price_3: Number(useVariant ? r.v_price_3 : r.p_price_3) || 0,
			image_key: (useVariant ? r.v_image_key : r.p_image_key) || null,
			missing
		};
		const list = bySet.get(Number(r.set_id)) || [];
		list.push(line);
		bySet.set(Number(r.set_id), list);
	}

	return sets.map((s) => {
		const items = bySet.get(Number(s.id)) || [];
		return {
			...s,
			price_tier: Number(s.price_tier) || 1,
			discount_pct: Number(s.discount_pct) || 0,
			is_published: s.is_published === null || s.is_published === undefined
				? true
				: Number(s.is_published) === 1,
			sort_order: Number(s.sort_order) || 0,
			is_incomplete: items.some((i) => i.missing),
			items
		};
	});
}
```

- [ ] **Step 5: Add the public routes**

In `hidden-water-ed9d/src/index.ts`, immediately after the `/projects/:slug` GET block (which ends around line 565), add:

```ts
// ── Business Sets ─────────────────────────────────────────────
// Fixed wholesale bundles. Incomplete sets (a component was deleted or
// hidden) are suppressed here rather than by each page, so every consumer
// behaves the same and no page can render a set with no correct price.
if (url.pathname === "/business-sets" && request.method === "GET") {
	const sets = await loadSets(env);
	return corsResponse(sets.filter((s: any) => !s.is_incomplete));
}

if (url.pathname.startsWith("/business-sets/") && request.method === "GET") {
	const slug = decodeURIComponent(url.pathname.slice("/business-sets/".length));
	if (!slug) return corsResponse({ error: "Slug required" }, { status: 400 });

	const [set] = await loadSets(env, { slug });
	if (!set || set.is_incomplete) return corsResponse({ error: "Not found" }, { status: 404 });

	return corsResponse(set);
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd hidden-water-ed9d && npx vitest run test/business-sets-read.spec.ts`
Expected: PASS, 8 tests.

- [ ] **Step 7: Commit**

```bash
git add hidden-water-ed9d/migrations/0017_add_business_sets.sql \
        hidden-water-ed9d/src/index.ts hidden-water-ed9d/test/business-sets-read.spec.ts
git commit -m "Add the business_sets tables and their read endpoints"
```

---

### Task 4: Admin write endpoints

**Files:**
- Modify: `hidden-water-ed9d/src/index.ts` (after the auth gate at line 1283, near the `/projects` POST at line 1291)
- Test: `hidden-water-ed9d/test/business-sets-write.spec.ts`

**Interfaces:**
- Consumes: `loadSets`, `generateSetSlug` from Task 3; `resetDb`, `seedProduct` from Task 1.
- Produces: `POST /business-sets` (upsert) and `POST /business-sets/delete`, plus `GET /business-sets?include_unpublished=1` for the admin list, which returns incomplete sets rather than hiding them.

- [ ] **Step 1: Write the failing tests**

Create `hidden-water-ed9d/test/business-sets-write.spec.ts`:

```ts
import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, seedProduct } from "./helpers/db";

const AUTH = { "Content-Type": "application/json", "Authorization": env.ADMIN_PASSWORD as string };

const post = (path: string, body: any, headers: Record<string, string> = AUTH) =>
	SELF.fetch(`https://example.com${path}`, { method: "POST", headers, body: JSON.stringify(body) });

describe("POST /business-sets", () => {
	beforeEach(resetDb);

	it("rejects an unauthenticated write", async () => {
		const res = await post("/business-sets", { name: "X" }, { "Content-Type": "application/json" });
		expect(res.status).toBe(401);
	});

	it("creates a set and generates a slug", async () => {
		const p = await seedProduct();
		const res = await post("/business-sets", {
			name: "Amigurumi Starter Set", price_tier: 1, discount_pct: 5,
			items: [{ product_id: p, quantity: 20 }]
		});
		expect(res.status).toBe(200);
		const body = await res.json() as any;
		expect(body.slug).toBe("amigurumi-starter-set-1");
		expect(body.items).toHaveLength(1);
		expect(body.discount_pct).toBe(5);
	});

	it("generates a dated stub slug for a Thai-only name", async () => {
		const p = await seedProduct();
		const res = await post("/business-sets", {
			name: "ชุดเริ่มต้น", items: [{ product_id: p, quantity: 20 }]
		});
		const body = await res.json() as any;
		expect(body.slug).toMatch(/^set-\d+$/);
	});

	it("updates in place when an id is sent, replacing the item list", async () => {
		const a = await seedProduct({ sku: "A" });
		const b = await seedProduct({ sku: "B" });
		const created = await (await post("/business-sets", {
			name: "Set", items: [{ product_id: a, quantity: 20 }]
		})).json() as any;

		const updated = await (await post("/business-sets", {
			id: created.id, name: "Set Renamed", items: [{ product_id: b, quantity: 40 }]
		})).json() as any;

		expect(updated.id).toBe(created.id);
		expect(updated.name).toBe("Set Renamed");
		expect(updated.items).toHaveLength(1);
		expect(updated.items[0]).toMatchObject({ product_id: b, quantity: 40 });
	});

	it("rejects a staff-only price tier", async () => {
		const p = await seedProduct();
		const res = await post("/business-sets", {
			name: "Set", price_tier: 4, items: [{ product_id: p, quantity: 20 }]
		});
		expect(res.status).toBe(400);
	});

	it("rejects a discount outside 0-100", async () => {
		const p = await seedProduct();
		const res = await post("/business-sets", {
			name: "Set", discount_pct: 150, items: [{ product_id: p, quantity: 20 }]
		});
		expect(res.status).toBe(400);
	});

	it("rejects a non-positive quantity", async () => {
		const p = await seedProduct();
		const res = await post("/business-sets", {
			name: "Set", items: [{ product_id: p, quantity: 0 }]
		});
		expect(res.status).toBe(400);
	});

	it("rejects an empty name", async () => {
		const res = await post("/business-sets", { name: "  ", items: [] });
		expect(res.status).toBe(400);
	});

	it("saves a set with no lines but treats it as unpublished", async () => {
		const res = await post("/business-sets", { name: "Empty Set", items: [] });
		expect(res.status).toBe(200);
		expect((await res.json() as any).is_published).toBe(false);
	});
});

describe("admin listing and delete", () => {
	beforeEach(resetDb);

	it("include_unpublished=1 returns incomplete sets instead of hiding them", async () => {
		const gone = await seedProduct();
		await post("/business-sets", { name: "Set", items: [{ product_id: gone, quantity: 20 }] });
		await env.DB.prepare("DELETE FROM products WHERE id = ?").bind(gone).run();

		const publicRes = await SELF.fetch("https://example.com/business-sets");
		expect(await publicRes.json()).toEqual([]);

		const adminRes = await SELF.fetch("https://example.com/business-sets?include_unpublished=1");
		const body = await adminRes.json() as any[];
		expect(body).toHaveLength(1);
		expect(body[0].is_incomplete).toBe(true);
		expect(body[0].items[0].missing).toBe(true);
	});

	it("deletes a set and cascades its items", async () => {
		const p = await seedProduct();
		const created = await (await post("/business-sets", {
			name: "Set", items: [{ product_id: p, quantity: 20 }]
		})).json() as any;

		const res = await post("/business-sets/delete", { id: created.id });
		expect(res.status).toBe(200);

		const items = await env.DB.prepare(
			"SELECT COUNT(*) AS n FROM product_set_items WHERE set_id = ?"
		).bind(created.id).first();
		expect(items).toEqual({ n: 0 });
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd hidden-water-ed9d && npx vitest run test/business-sets-write.spec.ts`
Expected: FAIL — routes do not exist.

Note: if `env.ADMIN_PASSWORD` is undefined in the test environment, add `"vars": { "ADMIN_PASSWORD": "test-admin" }` to a `defineWorkersConfig` `miniflare` block in `vitest.config.mts` rather than weakening the worker's auth check.

- [ ] **Step 3: Extend the public GET to accept include_unpublished**

In the `GET /business-sets` block added in Task 3, replace the body with:

```ts
if (url.pathname === "/business-sets" && request.method === "GET") {
	// Admin lists need drafts and broken sets so they can be fixed; the
	// storefront must never see either. Read-only, so it is safe to expose.
	const includeUnpublished = url.searchParams.get("include_unpublished") === "1";
	const sets = await loadSets(env, { includeUnpublished });
	return corsResponse(includeUnpublished ? sets : sets.filter((s: any) => !s.is_incomplete));
}
```

- [ ] **Step 4: Add the write routes**

In `hidden-water-ed9d/src/index.ts`, after the `/projects/delete` block (around line 1347), add:

```ts
// ── Business Sets: create / update ────────────────────────────
// Sending an id updates that row; omitting it inserts a new one. The item
// list is replaced wholesale rather than diffed -- a set is small and always
// edited as a whole.
if (url.pathname === "/business-sets" && request.method === "POST") {
	const body = await request.json() as any;

	const name = (body.name || "").trim();
	if (!name) return corsResponse({ error: "name is required" }, { status: 400 });

	const priceTier = body.price_tier === undefined ? 1 : Number(body.price_tier);
	if (!Number.isInteger(priceTier) || priceTier < 1 || priceTier > 3) {
		return corsResponse({ error: "price_tier must be 1, 2 or 3" }, { status: 400 });
	}

	const discountPct = body.discount_pct === undefined ? 0 : Number(body.discount_pct);
	if (!Number.isFinite(discountPct) || discountPct < 0 || discountPct > 100) {
		return corsResponse({ error: "discount_pct must be between 0 and 100" }, { status: 400 });
	}

	const rawItems = Array.isArray(body.items) ? body.items : [];
	const items = rawItems.map((it: any) => ({
		product_id: Number(it.product_id),
		variant_id: it.variant_id === null || it.variant_id === undefined ? null : Number(it.variant_id),
		quantity: Number(it.quantity)
	}));
	for (const it of items) {
		if (!Number.isInteger(it.product_id) || it.product_id <= 0) {
			return corsResponse({ error: "each item needs a product_id" }, { status: 400 });
		}
		if (!Number.isInteger(it.quantity) || it.quantity <= 0) {
			return corsResponse({ error: "each item quantity must be a positive integer" }, { status: 400 });
		}
	}

	// A set with no lines has nothing to quote, so it cannot go live.
	const isPublished = items.length === 0 ? 0 : (body.is_published === false ? 0 : 1);
	const sortOrder = Number(body.sort_order) || 0;

	let setId: number;
	if (body.id) {
		setId = Number(body.id);
		await env.DB.prepare(
			`UPDATE product_sets SET name = ?, name_th = ?, cover_image_key = ?, description = ?,
			 description_th = ?, price_tier = ?, discount_pct = ?, is_published = ?, sort_order = ?
			 WHERE id = ?`
		).bind(
			name, body.name_th || null, body.cover_image_key || null, body.description || null,
			body.description_th || null, priceTier, discountPct, isPublished, sortOrder, setId
		).run();
	} else {
		const res = await env.DB.prepare(
			`INSERT INTO product_sets (name, name_th, slug, cover_image_key, description,
			 description_th, price_tier, discount_pct, is_published, sort_order)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		).bind(
			name, body.name_th || null, `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
			body.cover_image_key || null, body.description || null, body.description_th || null,
			priceTier, discountPct, isPublished, sortOrder
		).run();
		setId = Number(res.meta.last_row_id);
		// Slug needs the id, so it is written once the row exists -- same order
		// as /projects.
		await env.DB.prepare("UPDATE product_sets SET slug = ? WHERE id = ?")
			.bind(generateSetSlug(name, setId), setId).run();
	}

	await env.DB.prepare("DELETE FROM product_set_items WHERE set_id = ?").bind(setId).run();
	for (let i = 0; i < items.length; i++) {
		const it = items[i];
		await env.DB.prepare(
			`INSERT INTO product_set_items (set_id, product_id, variant_id, quantity, sort_order)
			 VALUES (?, ?, ?, ?, ?)`
		).bind(setId, it.product_id, it.variant_id, it.quantity, i).run();
	}

	const row = (await loadSets(env, { includeUnpublished: true }))
		.find((s: any) => Number(s.id) === setId);
	return corsResponse(row);
}

if (url.pathname === "/business-sets/delete" && request.method === "POST") {
	const body = await request.json() as any;
	if (!body.id) return corsResponse({ error: "id is required" }, { status: 400 });
	await env.DB.prepare("DELETE FROM product_set_items WHERE set_id = ?").bind(body.id).run();
	await env.DB.prepare("DELETE FROM product_sets WHERE id = ?").bind(body.id).run();
	return corsResponse({ success: true });
}
```

Note on the delete: items are removed explicitly rather than relying on `ON DELETE CASCADE`, because D1 does not enable `PRAGMA foreign_keys` by default.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd hidden-water-ed9d && npx vitest run`
Expected: PASS — all worker specs green, including the 401 test from Task 1.

- [ ] **Step 6: Commit**

```bash
git add hidden-water-ed9d/src/index.ts hidden-water-ed9d/test/business-sets-write.spec.ts
git commit -m "Add the business-set admin write endpoints"
```

---

### Task 5: API service methods

**Files:**
- Modify: `frontend/kitweb/src/services/api.js` (add after `deleteProject`, around line 186)

**Interfaces:**
- Consumes: the endpoints from Tasks 3 and 4.
- Produces: `api.getBusinessSets({ includeUnpublished })`, `api.getBusinessSet(slug)`, `api.saveBusinessSet(payload)`, `api.deleteBusinessSet(id)`.

- [ ] **Step 1: Add the methods**

In `frontend/kitweb/src/services/api.js`, after `deleteProject`, add:

```js
  // ── Business Sets (fixed wholesale bundles) ───────────────────
  async getBusinessSets({ includeUnpublished = false } = {}) {
    const qs = includeUnpublished ? '?include_unpublished=1' : '';
    return getJson(`${API_URL}/business-sets${qs}`, 'Failed to fetch business sets');
  },

  async getBusinessSet(slug) {
    return getJson(`${API_URL}/business-sets/${encodeURIComponent(slug)}`, 'Failed to fetch business set');
  },

  // Create when payload has no id, update when it does.
  async saveBusinessSet(payload) {
    const response = await fetch(`${API_URL}/business-sets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': this.getToken() },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(await parseApiError(response, 'Failed to save business set'));
    return await response.json();
  },

  async deleteBusinessSet(id) {
    const response = await fetch(`${API_URL}/business-sets/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': this.getToken() },
      body: JSON.stringify({ id })
    });
    if (!response.ok) throw new Error(await parseApiError(response, 'Failed to delete business set'));
    return await response.json();
  },
```

- [ ] **Step 2: Verify the build still compiles**

Run: `cd frontend/kitweb && npx vite build --mode development 2>&1 | tail -5`
Expected: build completes without an error mentioning `api.js`.

- [ ] **Step 3: Commit**

```bash
git add frontend/kitweb/src/services/api.js
git commit -m "Add the business-set API client methods"
```

---

### Task 6: Extract the RFQ modal into a shared component

The modal currently lives inside `InstitutionalCatalogPage.vue` (1827 lines). Two callers now need it, so it moves to its own component. Behaviour must not change — this is a move, not a redesign.

**Files:**
- Create: `frontend/kitweb/src/components/rfq-modal.vue`
- Modify: `frontend/kitweb/src/views/InstitutionalCatalogPage.vue` (remove the modal markup at lines 792–917, the RFQ form state at lines 24–38, and `handleRfqSubmit` at lines 168–214)

**Interfaces:**
- Consumes: `api.submitRfq` (unchanged).
- Produces: `<RfqModal>` with props `open: Boolean`, `items: Array` (each `{ id, sku, title, quantity }`), `contextNote: String` (prepended to the submitted notes, empty by default); emits `close` and `submitted (orderId)`.

- [ ] **Step 1: Create the component**

Create `frontend/kitweb/src/components/rfq-modal.vue`. Move the `<div v-if="showRfqModal" class="modal-overlay">` block from `InstitutionalCatalogPage.vue:794-916` into the template verbatim, replacing `showRfqModal = false` with `emit('close')` and `selectedProductsList` with `props.items`. The script:

```vue
<script setup>
// The Request-for-Quote form. Extracted from InstitutionalCatalogPage so that
// Business Sets can reuse it with a fixed, non-editable item list.
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { api } from '../services/api';

const props = defineProps({
    open: { type: Boolean, default: false },
    // [{ id, sku, title, quantity }] — already resolved by the caller.
    items: { type: Array, default: () => [] },
    // Prepended to the submitted notes, e.g. "Business Set: Amigurumi Starter Set".
    contextNote: { type: String, default: '' }
});
const emit = defineEmits(['close', 'submitted']);

const { t } = useI18n();

const submitting = ref(false);
const success = ref(false);
const error = ref(null);
const submittedOrderId = ref('');

const blankForm = () => ({
    customerName: '', organization: '', email: '',
    phoneNumber: '', shippingAddress: '', notes: ''
});
const form = ref(blankForm());

// Reopening after a success must not show the previous receipt.
watch(() => props.open, (isOpen) => {
    if (isOpen) {
        success.value = false;
        error.value = null;
    }
});

const handleSubmit = async () => {
    if (!props.items.length) return;

    submitting.value = true;
    error.value = null;

    const notes = props.contextNote
        ? `${props.contextNote}\n${form.value.notes}`.trim()
        : form.value.notes;

    try {
        const res = await api.submitRfq({
            customerName: form.value.customerName,
            organization: form.value.organization,
            email: form.value.email,
            phoneNumber: form.value.phoneNumber,
            shippingAddress: form.value.shippingAddress,
            notes,
            items: props.items.map(i => ({
                id: i.id, sku: i.sku, title: i.title, quantity: i.quantity
            }))
        });
        if (!res || !res.success) throw new Error(res?.error || 'Failed to submit RFQ');

        success.value = true;
        submittedOrderId.value = res.orderId;
        form.value = blankForm();
        emit('submitted', res.orderId);
    } catch (err) {
        console.error('Error submitting RFQ:', err);
        error.value = err.message || 'An error occurred during submission. Please try again.';
    } finally {
        submitting.value = false;
    }
};
</script>
```

Move the modal's CSS (`.modal-overlay`, `.modal-card`, `.modal-header`, `.modal-body`, `.modal-footer-actions`, `.btn-cancel`, `.btn-submit-rfq`, `.mini-spinner`, `.quote-preview-section`, `.preview-item-row`, `.modal-error-banner`, `.success-state`, `.modal-intro-text`, `.btn-close-modal`, `.btn-modal-close-action`, `.modal-fade-*`) from `InstitutionalCatalogPage.vue` into this component's `<style scoped>`.

- [ ] **Step 2: Wire it into the institutional page**

In `InstitutionalCatalogPage.vue`, delete the modal markup, the RFQ form refs, and `handleRfqSubmit`. Keep `showRfqModal`, `selectedItems`, `rfqQuantities`, `selectedProductsList`, `toggleRfqSelection` and `clearRfqList`. Add the import and render:

```vue
<RfqModal
    :open="showRfqModal"
    :items="rfqItems"
    @close="showRfqModal = false"
    @submitted="clearRfqList()"
/>
```

with:

```js
import RfqModal from '../components/rfq-modal.vue';

const rfqItems = computed(() => selectedProductsList.value.map(p => ({
    id: p.id, sku: p.sku, title: p.title, quantity: rfqQuantities.value[p.id] || 10
})));
```

- [ ] **Step 3: Verify the institutional flow by hand**

Run: `cd frontend/kitweb && npm run dev`
Open `/en/institutional-catalog`, add two products to the quote list, change a quantity, open the modal, and confirm: the selected items and quantities appear in the preview; submitting with a name and email returns a quotation id; the list clears afterwards. Then reopen the modal and confirm it shows the form, not the previous success screen.

- [ ] **Step 4: Commit**

```bash
git add frontend/kitweb/src/components/rfq-modal.vue \
        frontend/kitweb/src/views/InstitutionalCatalogPage.vue
git commit -m "Extract the RFQ modal so business sets can reuse it"
```

---

### Task 7: Public Business Sets pages and routes

**Files:**
- Create: `frontend/kitweb/src/views/BusinessSetsPage.vue`
- Create: `frontend/kitweb/src/views/BusinessSetPage.vue`
- Modify: `frontend/kitweb/src/router/index.js` (add two routes among the `/:lang` children, after line 25)

**Interfaces:**
- Consumes: `api.getBusinessSets`, `api.getBusinessSet` (Task 5); `rollUpSet` (Task 2); `<RfqModal>` (Task 6); `getProductImageUrl` from `src/utils/productImages`; `getProjectImageUrl` from `src/services/api` for covers (covers are uploaded through the same `/upload` endpoint as project covers).
- Produces: routes named `business-sets` and `business-set`.

- [ ] **Step 1: Add the routes**

In `frontend/kitweb/src/router/index.js`, after the `institutional-catalog` route (line 25):

```js
      { path: 'business-sets', name: 'business-sets', component: () => import('../views/BusinessSetsPage.vue') },
      { path: 'business-sets/:slug', name: 'business-set', component: () => import('../views/BusinessSetPage.vue') },
```

- [ ] **Step 2: Create the index page**

Create `frontend/kitweb/src/views/BusinessSetsPage.vue`:

```vue
<script setup>
// Ready-to-sell wholesale bundles: fixed combinations at fixed quantities, so a
// shop makes one decision instead of picking dozens of SKUs.
import { ref, computed, onMounted, onServerPrefetch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useHead } from '@unhead/vue';
import { api, getProjectImageUrl } from '../services/api';
import { rollUpSet } from '../utils/setPricing';
import BreadcrumbBar from '../components/breadcrumb-bar.vue';
import { defaultLang } from '../utils/localeRoutes';

const route = useRoute();
const { t, locale } = useI18n();
const currentLang = computed(() => route.params.lang || defaultLang);

const sets = ref([]);
const loading = ref(true);

const isThai = computed(() => String(locale.value).toLowerCase() === 'th');
const tName = (s) => (isThai.value && s.name_th ? s.name_th : s.name) || '';

// Price is rolled up here rather than server-side so productPricing.js stays the
// single definition of the box -> per-piece rule.
const priced = computed(() => sets.value.map(s => ({ ...s, rollUp: rollUpSet(s) })));

const load = async () => {
    loading.value = true;
    try {
        sets.value = await api.getBusinessSets();
    } catch {
        sets.value = [];
    } finally {
        loading.value = false;
    }
};

onServerPrefetch(load);
onMounted(() => { if (!sets.value.length) load(); });

const crumbs = computed(() => [
    { label: t('nav.home'), to: { name: 'home', params: { lang: currentLang.value } } },
    { label: t('businessSets.title') }
]);

useHead(() => ({
    title: `${t('businessSets.title')} | KitCraft`,
    meta: [{ name: 'description', content: t('businessSets.subtitle') }]
}));
</script>

<template>
    <div class="sets-page">
        <BreadcrumbBar :items="crumbs" />

        <header class="sets-header">
            <h1>{{ $t('businessSets.title') }}</h1>
            <p>{{ $t('businessSets.subtitle') }}</p>
        </header>

        <div v-if="loading" class="sets-state">{{ $t('businessSets.loading') }}</div>
        <div v-else-if="!priced.length" class="sets-state">{{ $t('businessSets.empty') }}</div>

        <div v-else class="sets-grid">
            <router-link
                v-for="s in priced"
                :key="s.id"
                :to="{ name: 'business-set', params: { lang: currentLang, slug: s.slug } }"
                class="set-card"
            >
                <img v-if="s.cover_image_key" :src="getProjectImageUrl(s.cover_image_key)" :alt="tName(s)" />
                <div class="set-card-body">
                    <h2>{{ tName(s) }}</h2>
                    <p class="set-card-count">{{ $t('businessSets.itemCount', { count: s.items.length }) }}</p>
                    <p class="set-card-price">฿{{ s.rollUp.total.toFixed(2) }}</p>
                </div>
            </router-link>
        </div>
    </div>
</template>

<style scoped>
.sets-page { max-width: 1200px; margin: 0 auto; padding: 0 16px 64px; }
.sets-header { text-align: center; padding: 32px 0; }
.sets-header h1 { font-size: 2rem; margin: 0 0 8px; }
.sets-state { text-align: center; padding: 48px 0; color: #666; }
.sets-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 24px; }
.set-card { display: block; border: 1px solid #e5e5e5; border-radius: 12px; overflow: hidden; text-decoration: none; color: inherit; background: #fff; }
.set-card img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; display: block; }
.set-card-body { padding: 16px; }
.set-card-body h2 { font-size: 1.1rem; margin: 0 0 6px; }
.set-card-count { color: #777; font-size: 0.9rem; margin: 0 0 8px; }
.set-card-price { font-size: 1.25rem; font-weight: 700; margin: 0; }
</style>
```

- [ ] **Step 3: Create the detail page**

Create `frontend/kitweb/src/views/BusinessSetPage.vue`:

```vue
<script setup>
// One business set: its fixed contents, the rolled-up price, and a button that
// submits the whole thing as an RFQ with quantities locked.
import { ref, computed, onMounted, onServerPrefetch, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useHead } from '@unhead/vue';
import { api, getProjectImageUrl } from '../services/api';
import { getProductImageUrl } from '../utils/productImages';
import { rollUpSet } from '../utils/setPricing';
import BreadcrumbBar from '../components/breadcrumb-bar.vue';
import RfqModal from '../components/rfq-modal.vue';
import { defaultLang } from '../utils/localeRoutes';

const route = useRoute();
const { t, locale } = useI18n();
const currentLang = computed(() => route.params.lang || defaultLang);

const set = ref(null);
const loading = ref(true);
const notFound = ref(false);
const showRfq = ref(false);

const isThai = computed(() => String(locale.value).toLowerCase() === 'th');
const tName = (s) => (isThai.value && s?.name_th ? s.name_th : s?.name) || '';
const tLine = (l) => (isThai.value && l.name_th ? l.name_th : l.name) || '';

const rollUp = computed(() => (set.value ? rollUpSet(set.value) : null));

// Quantities are fixed by the set — that is the whole point, so the modal gets
// them as-is and offers no way to change them.
const rfqItems = computed(() =>
    (rollUp.value?.lines || []).map(l => ({
        id: l.product_id, sku: null, title: l.name, quantity: l.quantity
    }))
);

const load = async () => {
    loading.value = true;
    notFound.value = false;
    try {
        set.value = await api.getBusinessSet(route.params.slug);
    } catch {
        notFound.value = true;
        set.value = null;
    } finally {
        loading.value = false;
    }
};

onServerPrefetch(load);
onMounted(() => { if (!set.value) load(); });
watch(() => route.params.slug, load);

const crumbs = computed(() => {
    const items = [
        { label: t('nav.home'), to: { name: 'home', params: { lang: currentLang.value } } },
        { label: t('businessSets.title'), to: { name: 'business-sets', params: { lang: currentLang.value } } }
    ];
    if (set.value) items.push({ label: tName(set.value) });
    return items;
});

useHead(() => ({
    title: set.value ? `${tName(set.value)} | KitCraft` : undefined
}));
</script>

<template>
    <div class="set-page">
        <BreadcrumbBar :items="crumbs" />

        <div v-if="loading" class="set-state">{{ $t('businessSets.loading') }}</div>
        <div v-else-if="notFound" class="set-state">{{ $t('businessSets.notFound') }}</div>

        <article v-else-if="set" class="set-article">
            <img v-if="set.cover_image_key" class="set-cover" :src="getProjectImageUrl(set.cover_image_key)" :alt="tName(set)" />

            <h1>{{ tName(set) }}</h1>
            <p v-if="set.description" class="set-description">
                {{ isThai && set.description_th ? set.description_th : set.description }}
            </p>

            <table class="set-contents">
                <thead>
                    <tr>
                        <th>{{ $t('businessSets.item') }}</th>
                        <th>{{ $t('businessSets.quantity') }}</th>
                        <th>{{ $t('businessSets.perPiece') }}</th>
                        <th>{{ $t('businessSets.lineTotal') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="line in rollUp.lines" :key="line.id">
                        <td class="line-name">
                            <img v-if="line.image_key" :src="getProductImageUrl(line.image_key)" :alt="tLine(line)" />
                            <span>{{ tLine(line) }}</span>
                        </td>
                        <td>{{ line.quantity }}</td>
                        <td>฿{{ line.perPiecePrice.toFixed(2) }}</td>
                        <td>฿{{ line.lineTotal.toFixed(2) }}</td>
                    </tr>
                </tbody>
            </table>

            <div class="set-totals">
                <div><span>{{ $t('businessSets.subtotal') }}</span><span>฿{{ rollUp.subtotal.toFixed(2) }}</span></div>
                <div v-if="rollUp.discountAmount > 0" class="set-discount">
                    <span>{{ $t('businessSets.discount', { pct: set.discount_pct }) }}</span>
                    <span>-฿{{ rollUp.discountAmount.toFixed(2) }}</span>
                </div>
                <div class="set-total"><span>{{ $t('businessSets.total') }}</span><span>฿{{ rollUp.total.toFixed(2) }}</span></div>
            </div>

            <button class="set-request" @click="showRfq = true">{{ $t('businessSets.requestSet') }}</button>
        </article>

        <RfqModal
            :open="showRfq"
            :items="rfqItems"
            :context-note="set ? `Business Set: ${set.name}` : ''"
            @close="showRfq = false"
        />
    </div>
</template>

<style scoped>
.set-page { max-width: 900px; margin: 0 auto; padding: 0 16px 64px; }
.set-state { text-align: center; padding: 48px 0; color: #666; }
.set-cover { width: 100%; border-radius: 12px; margin-bottom: 24px; }
.set-article h1 { font-size: 2rem; margin: 0 0 12px; }
.set-description { color: #555; line-height: 1.7; margin-bottom: 24px; }
.set-contents { width: 100%; border-collapse: collapse; }
.set-contents th, .set-contents td { text-align: left; padding: 12px 8px; border-bottom: 1px solid #eee; }
.set-contents th:not(:first-child), .set-contents td:not(:first-child) { text-align: right; }
.line-name { display: flex; align-items: center; gap: 12px; }
.line-name img { width: 44px; height: 44px; object-fit: cover; border-radius: 6px; }
.set-totals { margin: 24px 0; margin-left: auto; max-width: 320px; }
.set-totals > div { display: flex; justify-content: space-between; padding: 6px 0; }
.set-discount { color: #2e7d32; }
.set-total { font-size: 1.25rem; font-weight: 700; border-top: 2px solid #333; padding-top: 12px; }
.set-request { display: block; width: 100%; padding: 16px; font-size: 1.05rem; font-weight: 600; border: none; border-radius: 10px; background: #333; color: #fff; cursor: pointer; }

@media (max-width: 600px) {
    .set-contents thead { display: none; }
    .set-contents tr { display: grid; grid-template-columns: 1fr auto; padding: 12px 0; border-bottom: 1px solid #eee; }
    .set-contents td { border: none; padding: 2px 0; }
    .set-totals { max-width: none; }
}
</style>
```

- [ ] **Step 4: Verify both pages by hand**

Run: `cd frontend/kitweb && npm run dev`
Create a set through the admin panel first if none exists (Task 9), or insert one directly. Then open `/en/business-sets`, confirm the card grid renders with a price, click through to the detail page, confirm the contents table and total, and open the request modal to confirm the locked quantities appear in the preview.

- [ ] **Step 5: Commit**

```bash
git add frontend/kitweb/src/views/BusinessSetsPage.vue \
        frontend/kitweb/src/views/BusinessSetPage.vue \
        frontend/kitweb/src/router/index.js
git commit -m "Add the public Business Sets pages"
```

---

### Task 8: Business Sets band on the institutional catalog

**Files:**
- Modify: `frontend/kitweb/src/views/InstitutionalCatalogPage.vue`

**Interfaces:**
- Consumes: `api.getBusinessSets` (Task 5), `rollUpSet` (Task 2), the `business-set` route (Task 7).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Load sets alongside the catalog**

In `InstitutionalCatalogPage.vue`, add to the script:

```js
import { rollUpSet } from '@/utils/setPricing';

const businessSets = ref([]);

const loadBusinessSets = async () => {
    try {
        const sets = await api.getBusinessSets();
        businessSets.value = sets.map(s => ({ ...s, rollUp: rollUpSet(s) }));
    } catch {
        // The band is supplementary; a failure here must not blank the catalog.
        businessSets.value = [];
    }
};
```

and call it from the existing `onMounted` alongside `fetchCatalog()`.

- [ ] **Step 2: Render the band above the category grid**

Immediately before the catalog's first category section, add:

```vue
<section v-if="businessSets.length" class="sets-band">
    <h2>{{ t('businessSets.title') }}</h2>
    <p class="sets-band-sub">{{ t('businessSets.subtitle') }}</p>
    <div class="sets-band-grid">
        <router-link
            v-for="s in businessSets"
            :key="s.id"
            :to="{ name: 'business-set', params: { lang: $route.params.lang, slug: s.slug } }"
            class="sets-band-card"
        >
            <span class="sets-band-name">{{ locale === 'th' && s.name_th ? s.name_th : s.name }}</span>
            <span class="sets-band-count">{{ t('businessSets.itemCount', { count: s.items.length }) }}</span>
            <span class="sets-band-price">฿{{ s.rollUp.total.toFixed(2) }}</span>
        </router-link>
    </div>
</section>
```

with styles:

```css
.sets-band { margin: 0 0 40px; padding: 24px; background: #faf7f2; border-radius: 12px; }
.sets-band h2 { margin: 0 0 4px; font-size: 1.4rem; }
.sets-band-sub { margin: 0 0 16px; color: #666; }
.sets-band-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.sets-band-card { display: flex; flex-direction: column; gap: 4px; padding: 14px; background: #fff; border: 1px solid #e8e2d8; border-radius: 10px; text-decoration: none; color: inherit; }
.sets-band-name { font-weight: 600; }
.sets-band-count { font-size: 0.85rem; color: #777; }
.sets-band-price { font-weight: 700; }
```

- [ ] **Step 3: Verify**

Run: `cd frontend/kitweb && npm run dev`, open `/en/institutional-catalog`, confirm the band appears above the categories and each card links to its detail page. Confirm the catalog still renders when `/business-sets` returns an empty list.

- [ ] **Step 4: Commit**

```bash
git add frontend/kitweb/src/views/InstitutionalCatalogPage.vue
git commit -m "Surface business sets on the institutional catalog"
```

---

### Task 9: Admin editor

**Files:**
- Create: `frontend/kitweb/src/components/admin-business-sets.vue`
- Modify: `frontend/kitweb/src/views/AdminDashboard.vue` (import near line 11; tab button near line 777; render near line 787)

**Interfaces:**
- Consumes: `api.getBusinessSets`, `api.saveBusinessSet`, `api.deleteBusinessSet` (Task 5); `api.getProducts` with `includeHidden`; `parseMoq` from `productPricing.js`; `rollUpSet` from `setPricing.js` (Task 2).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Create the editor**

Create `frontend/kitweb/src/components/admin-business-sets.vue`, modelled on `admin-projects.vue`. Key behaviours, all of which must be present:

```vue
<script setup>
// Editor for product_sets — fixed wholesale bundles. Modelled on admin-projects.vue.
// Quantities snap to the product's MOQ here, at entry time, so stored quantities
// are always valid box multiples and the public pages never have to re-snap.
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { api, getProjectImageUrl, API_URL } from '../services/api';
import { parseMoq } from '../utils/productPricing';
import { rollUpSet } from '../utils/setPricing';

const { t } = useI18n();

const sets = ref([]);
const products = ref([]);
const loading = ref(true);
const saving = ref(false);
const errorMessage = ref('');

const blankForm = () => ({
    id: null, name: '', name_th: '', description: '', description_th: '',
    cover_image_key: '', price_tier: 1, discount_pct: 0,
    is_published: true, sort_order: 0,
    // [{ product_id, variant_id, quantity }]
    items: []
});

const form = ref(blankForm());
const panelOpen = ref(false);
const productSearch = ref('');
const qtyWarnings = ref({});
const coverFile = ref(null);
const coverPreview = ref('');
const uploadingCover = ref(false);

const onCoverPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    coverFile.value = file;
    coverPreview.value = URL.createObjectURL(file);
};

const productById = computed(() => {
    const map = new Map();
    products.value.forEach(p => map.set(Number(p.id), p));
    return map;
});

const filteredProducts = computed(() => {
    const q = productSearch.value.trim().toLowerCase();
    if (!q) return products.value.slice(0, 40);
    return products.value
        .filter(p => `${p.name || ''} ${p.name_th || ''} ${p.sku || ''}`.toLowerCase().includes(q))
        .slice(0, 40);
});

// Live roll-up so the price is visible before publishing. Shaped like the API
// response so it can go straight through rollUpSet.
const preview = computed(() => rollUpSet({
    price_tier: form.value.price_tier,
    discount_pct: form.value.discount_pct,
    items: form.value.items.map(it => {
        const p = productById.value.get(Number(it.product_id)) || {};
        return {
            ...it, name: p.name, moq: p.moq,
            price_1: p.price_1, price_2: p.price_2, price_3: p.price_3
        };
    })
}));

const load = async () => {
    loading.value = true;
    try {
        const [setRows, prods] = await Promise.all([
            api.getBusinessSets({ includeUnpublished: true }),
            api.getProducts(null, { includeHidden: true })
        ]);
        sets.value = setRows;
        products.value = prods;
    } catch (err) {
        errorMessage.value = err.message;
    } finally {
        loading.value = false;
    }
};

onMounted(load);

const addLine = (productId) => {
    if (form.value.items.some(i => Number(i.product_id) === Number(productId))) return;
    const moq = parseMoq(productById.value.get(Number(productId))?.moq);
    form.value.items.push({ product_id: Number(productId), variant_id: null, quantity: moq });
};

const removeLine = (index) => {
    form.value.items.splice(index, 1);
};

// Round up to the next whole box, matching add-to-order-modal.vue's rule and copy.
const snapQuantity = (index) => {
    const line = form.value.items[index];
    const moq = parseMoq(productById.value.get(Number(line.product_id))?.moq);
    const raw = Math.max(0, Math.floor(Number(line.quantity) || 0));

    if (raw <= 0) {
        line.quantity = moq;
        qtyWarnings.value[index] = t('catalog.qtyRoundedToBox', { moq });
        return;
    }
    if (raw % moq !== 0) {
        line.quantity = Math.ceil(raw / moq) * moq;
        qtyWarnings.value[index] = t('catalog.qtyRoundedToBox', { moq });
        return;
    }
    line.quantity = raw;
    delete qtyWarnings.value[index];
};

const save = async () => {
    saving.value = true;
    errorMessage.value = '';
    try {
        const coverKey = await uploadCover();
        await api.saveBusinessSet({ ...form.value, cover_image_key: coverKey || null });
        panelOpen.value = false;
        await load();
    } catch (err) {
        errorMessage.value = err.message;
    } finally {
        saving.value = false;
        uploadingCover.value = false;
    }
};

// Literal English copy, matching admin-projects.vue:166 and admin-events.vue:149 —
// the admin panel is staff-only and is not translated.
const remove = async (s) => {
    if (!confirm(`Delete "${s.name}"? This cannot be undone.`)) return;
    await api.deleteBusinessSet(s.id);
    await load();
};
</script>
```

Also copy `uploadCover` from `admin-projects.vue:116-135` verbatim, changing only the key prefix from `project-` to `set-`, and call it from `save()` to resolve `form.value.cover_image_key` before posting.

The template:

```vue
<template>
    <div class="admin-sets">
        <div class="sets-toolbar">
            <h2>Business Sets</h2>
            <button type="button" @click="form = blankForm(); panelOpen = true;">New Set</button>
        </div>

        <p v-if="errorMessage" class="sets-error">{{ errorMessage }}</p>
        <p v-if="loading">Loading...</p>

        <ul v-else class="sets-list">
            <li v-for="s in sets" :key="s.id" :class="{ 'set-broken': s.is_incomplete }">
                <div class="set-row-main">
                    <strong>{{ s.name }}</strong>
                    <span class="set-row-meta">
                        /{{ s.slug }} &middot; {{ s.items.length }} line(s)
                        <span v-if="!s.is_published"> &middot; draft</span>
                    </span>
                    <!-- A missing component means the set has no correct price, so it
                         is hidden from the storefront until this is fixed. -->
                    <span v-if="s.is_incomplete" class="set-broken-flag">
                        Hidden — missing component:
                        {{ s.items.filter(i => i.missing).map(i => i.name || `product #${i.product_id}`).join(', ') }}
                    </span>
                </div>
                <div class="set-row-actions">
                    <button type="button" @click="openEdit(s)">Edit</button>
                    <button type="button" @click="remove(s)">Delete</button>
                </div>
            </li>
        </ul>

        <div v-if="panelOpen" class="set-panel">
            <label>Name (EN)<input v-model="form.name" type="text" /></label>
            <label>Name (TH)<input v-model="form.name_th" type="text" /></label>
            <label>Description (EN)<textarea v-model="form.description" rows="3"></textarea></label>
            <label>Description (TH)<textarea v-model="form.description_th" rows="3"></textarea></label>

            <label>Cover image<input type="file" accept="image/*" @change="onCoverPick" /></label>
            <img v-if="coverPreview || form.cover_image_key"
                 :src="coverPreview || getProjectImageUrl(form.cover_image_key)" class="set-cover-preview" alt="" />

            <div class="set-panel-row">
                <!-- Tiers 4 and 5 are staff-only and must never price a customer-facing set. -->
                <label>Price tier
                    <select v-model.number="form.price_tier">
                        <option :value="1">Level 1</option>
                        <option :value="2">Level 2</option>
                        <option :value="3">Level 3</option>
                    </select>
                </label>
                <label>Discount %<input v-model.number="form.discount_pct" type="number" min="0" max="100" step="0.5" /></label>
                <label>Sort order<input v-model.number="form.sort_order" type="number" /></label>
                <label class="set-check"><input v-model="form.is_published" type="checkbox" /> Published</label>
            </div>

            <div class="set-picker">
                <input v-model="productSearch" type="text" placeholder="Search products..." />
                <ul class="set-picker-list">
                    <li v-for="p in filteredProducts" :key="p.id">
                        <span>{{ p.name }} <em>{{ p.sku }}</em> <span class="moq-hint">box of {{ parseMoq(p.moq) }}</span></span>
                        <button type="button" @click="addLine(p.id)">Add</button>
                    </li>
                </ul>
            </div>

            <table class="set-lines">
                <tbody>
                    <tr v-for="(line, i) in form.items" :key="line.product_id">
                        <td>{{ productById.get(Number(line.product_id))?.name || `product #${line.product_id}` }}</td>
                        <td>
                            <input v-model.number="line.quantity" type="number" min="1"
                                   :step="parseMoq(productById.get(Number(line.product_id))?.moq)"
                                   @change="snapQuantity(i)" />
                            <small v-if="qtyWarnings[i]" class="qty-warning">{{ qtyWarnings[i] }}</small>
                        </td>
                        <td>฿{{ (preview.lines[i]?.perPiecePrice ?? 0).toFixed(2) }} / pc</td>
                        <td>฿{{ (preview.lines[i]?.lineTotal ?? 0).toFixed(2) }}</td>
                        <td><button type="button" @click="removeLine(i)">Remove</button></td>
                    </tr>
                </tbody>
            </table>

            <!-- Live roll-up: the number has to be visible before publishing. -->
            <div class="set-preview">
                <div><span>Subtotal</span><span>฿{{ preview.subtotal.toFixed(2) }}</span></div>
                <div v-if="preview.discountAmount > 0">
                    <span>Discount ({{ form.discount_pct }}%)</span><span>-฿{{ preview.discountAmount.toFixed(2) }}</span>
                </div>
                <div class="set-preview-total"><span>Set price</span><span>฿{{ preview.total.toFixed(2) }}</span></div>
            </div>

            <div class="set-panel-actions">
                <button type="button" @click="panelOpen = false">Cancel</button>
                <button type="button" :disabled="saving" @click="save">{{ saving ? 'Saving...' : 'Save' }}</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.sets-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.sets-error { color: #c62828; }
.sets-list { list-style: none; padding: 0; }
.sets-list li { display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #eee; }
.set-broken { background: #fff4f4; }
.set-broken-flag { display: block; color: #c62828; font-size: 0.85rem; }
.set-row-meta { color: #777; font-size: 0.85rem; margin-left: 8px; }
.set-panel { margin-top: 24px; padding: 20px; border: 1px solid #ddd; border-radius: 10px; display: grid; gap: 12px; }
.set-panel label { display: grid; gap: 4px; font-size: 0.9rem; }
.set-panel-row { display: flex; gap: 16px; flex-wrap: wrap; }
.set-check { flex-direction: row; align-items: center; gap: 6px; }
.set-cover-preview { max-width: 220px; border-radius: 8px; }
.set-picker-list { list-style: none; padding: 0; max-height: 220px; overflow-y: auto; border: 1px solid #eee; }
.set-picker-list li { display: flex; justify-content: space-between; padding: 6px 10px; }
.moq-hint { color: #888; font-size: 0.8rem; }
.set-lines { width: 100%; border-collapse: collapse; }
.set-lines td { padding: 8px 6px; border-bottom: 1px solid #f0f0f0; }
.qty-warning { display: block; color: #b26a00; font-size: 0.75rem; }
.set-preview { margin-left: auto; min-width: 260px; }
.set-preview > div { display: flex; justify-content: space-between; padding: 4px 0; }
.set-preview-total { font-weight: 700; border-top: 2px solid #333; padding-top: 8px; }
.set-panel-actions { display: flex; justify-content: flex-end; gap: 12px; }
</style>
```

Note the template calls `parseMoq` and `blankForm` directly, so both must be exposed from `<script setup>` (they already are — `script setup` bindings are template-visible). `openEdit(s)` maps an API row onto the form:

```js
const openEdit = (s) => {
    form.value = {
        ...blankForm(),
        ...s,
        items: (s.items || []).map(i => ({
            product_id: Number(i.product_id),
            variant_id: i.variant_id === null ? null : Number(i.variant_id),
            quantity: Number(i.quantity)
        }))
    };
    coverFile.value = null;
    coverPreview.value = '';
    qtyWarnings.value = {};
    panelOpen.value = true;
};
```

- [ ] **Step 2: Wire the tab into AdminDashboard**

In `AdminDashboard.vue`, add the import beside the others (~line 11):

```js
import AdminBusinessSets from '../components/admin-business-sets.vue';
```

a tab button beside the existing ones (~line 777):

```vue
<button type="button" :class="{ active: activeAdminSection === 'sets' }" @click="activeAdminSection = 'sets'; resetForm();">
  {{ $t('admin.businessSets') }}
</button>
```

and the render beside the others (~line 787):

```vue
<AdminBusinessSets v-if="activeAdminSection === 'sets'" />
```

- [ ] **Step 3: Verify the round trip by hand**

Run: `cd frontend/kitweb && npm run dev`, log into `/en/admin`, open the Business Sets tab and:
- create a set with two products, confirming the quantity snaps up to the MOQ multiple and shows the warning;
- confirm the live total matches the detail page after saving;
- set a discount and confirm it reduces the total;
- delete a product used by the set in another tab, reload, and confirm the set shows in red with the missing line labelled, and disappears from `/en/business-sets`.

- [ ] **Step 4: Commit**

```bash
git add frontend/kitweb/src/components/admin-business-sets.vue \
        frontend/kitweb/src/views/AdminDashboard.vue
git commit -m "Add the business-set admin editor"
```

---

### Task 10: Translations

**Files:**
- Modify: `frontend/kitweb/src/locales/en.json`, `th.json`, `zh.json`, `ja.json`

**Interfaces:**
- Consumes: nothing.
- Produces: the `businessSets.*` namespace and `admin.businessSets`, used by Tasks 7, 8 and 9.

- [ ] **Step 1: Add the English keys**

In `frontend/kitweb/src/locales/en.json`, add a top-level `businessSets` object:

```json
"businessSets": {
  "title": "Business Sets",
  "subtitle": "Ready-to-sell craft material bundles at fixed quantities.",
  "loading": "Loading sets...",
  "empty": "No sets are available right now.",
  "notFound": "That set could not be found.",
  "itemCount": "{count} items",
  "item": "Item",
  "quantity": "Qty",
  "perPiece": "Per piece",
  "lineTotal": "Total",
  "subtotal": "Subtotal",
  "discount": "Set discount ({pct}%)",
  "total": "Set price",
  "requestSet": "Request this set"
}
```

and add `"businessSets": "Business Sets"` to the existing `admin` object.

- [ ] **Step 2: Add the Thai keys**

In `th.json`, the same shape with Thai copy:

```json
"businessSets": {
  "title": "ชุดสำหรับร้านค้า",
  "subtitle": "ชุดวัตถุดิบงานฝีมือพร้อมขาย กำหนดจำนวนไว้แล้ว",
  "loading": "กำลังโหลดชุดสินค้า...",
  "empty": "ยังไม่มีชุดสินค้าในขณะนี้",
  "notFound": "ไม่พบชุดสินค้านี้",
  "itemCount": "{count} รายการ",
  "item": "รายการ",
  "quantity": "จำนวน",
  "perPiece": "ต่อชิ้น",
  "lineTotal": "รวม",
  "subtotal": "ยอดรวม",
  "discount": "ส่วนลดชุด ({pct}%)",
  "total": "ราคาชุด",
  "requestSet": "ขอใบเสนอราคาชุดนี้"
}
```

and `"businessSets": "ชุดสำหรับร้านค้า"` in `admin`.

- [ ] **Step 3: Add the zh and ja keys**

`zh.json` and `ja.json` follow the same shape. Existing practice is that these locales fall back to English for untranslated bodies, so copying the English `businessSets` block verbatim into both is acceptable and keeps the key set complete — a missing key renders the raw path, which is worse than English text.

- [ ] **Step 4: Verify no key is missing**

Run:

```bash
cd frontend/kitweb/src/locales && node -e "
const langs=['en','th','zh','ja'].map(l=>[l,require('./'+l+'.json')]);
const keys=Object.keys(langs[0][1].businessSets);
for (const [l,j] of langs) {
  const missing = keys.filter(k => !(j.businessSets||{})[k]);
  console.log(l, missing.length ? 'MISSING: '+missing.join(',') : 'ok', (j.admin||{}).businessSets ? '' : '| admin.businessSets MISSING');
}"
```

Expected: `ok` for all four locales, with no `admin.businessSets MISSING`.

- [ ] **Step 5: Commit**

```bash
git add frontend/kitweb/src/locales/
git commit -m "Translate the Business Sets copy"
```

---

### Task 11: Full verification

**Files:** none created or modified unless a failure is found.

- [ ] **Step 1: Run the worker suite**

Run: `cd hidden-water-ed9d && npx vitest run`
Expected: all specs PASS. No failures, no stale snapshots.

- [ ] **Step 2: Run the frontend suite**

Run: `cd frontend/kitweb && npm test`
Expected: `setPricing.spec.js` PASSES, 7 tests.

- [ ] **Step 3: Run the production build**

Run: `cd frontend/kitweb && npm run build`
Expected: `vite-ssg build` completes, then `fix-root-canonical.js`, `append-sitemap.js` and `verify-canonicals.js` all succeed. The two new routes are dynamic (`:slug`) and are not prerendered — confirm `verify-canonicals.js` reports no error.

- [ ] **Step 4: Confirm the RFQ pipeline is genuinely untouched**

Run: `git diff main --stat -- hidden-water-ed9d/src/index.ts` and confirm the `/rfq/submit` handler (around line 1081) is unchanged. Then confirm no migration or code change touches `orders`, `order_items`, `cartStore.js`, or `projects`:

```bash
git diff main --stat -- frontend/kitweb/src/stores/cartStore.js frontend/kitweb/src/components/admin-projects.vue
```

Expected: empty output for both.

- [ ] **Step 5: Apply the migration to the remote database**

Run: `cd hidden-water-ed9d && npx wrangler d1 execute product-db --remote --file=./migrations/0017_add_business_sets.sql`
Expected: both tables and both indexes created. Confirm with:

```bash
npx wrangler d1 execute product-db --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'product_set%'"
```

- [ ] **Step 6: Deploy the worker**

Run: `cd hidden-water-ed9d && npx wrangler deploy`
Expected: deploy succeeds. Then verify the live endpoint returns an empty array rather than an error:

```bash
curl -s https://hidden-water-ed9d.shop-backend-kitweb.workers.dev/business-sets
```

Expected: `[]`.

- [ ] **Step 7: Commit any fixes**

If steps 1–6 required changes, commit them:

```bash
git add -A && git commit -m "Fix issues found in Business Sets verification"
```
