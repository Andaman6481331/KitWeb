# KITCRAFT Business Sets — Design

**Date:** 2026-08-15
**Status:** Approved, ready for implementation planning

## Problem

Wholesale buyers ordering a themed bundle currently have to find and select dozens of
individual SKUs across the catalog and work out quantities themselves. KITCRAFT wants
to sell **fixed combinations at fixed quantities** — one decision instead of thirty.

Example: an *Amigurumi Starter Set* of Cloud Yarn ×20, Safety Eyes ×50 pairs,
Stuffing ×2 kg, Crochet Hooks ×5, Stitch Markers ×10, Packaging Bags ×50, requested
as a single unit.

## Why not the article system

The article system (`projects`) was evaluated first and rejected.

`projects.product_ids` stores a bare id array (`[12,45]`, `0013_add_projects.sql:23`)
with nowhere to record a quantity — and quantity is the entire premise of a set.
Reshaping that column to `[{id, qty}]` would break `parseProductIds` (`index.ts:85`),
the `?product_id=` filter behind "which articles use this product" (`index.ts:543`),
`color-spotlight.vue:68`, `admin-projects.vue`, and `admin-spotlights.vue`, which
reuses the same column name and shape.

Beyond quantity, articles have no price, no MOQ, and no purchase action —
`ProjectPage.vue:135-140` renders linked products as plain links into the catalog.

The real near-neighbour is the **institutional RFQ flow**, which already collects
per-product quantities and submits them (`InstitutionalCatalogPage.vue`,
`/rfq/submit` at `index.ts:1081`). A Business Set is best modelled as a
shop-curated, saved RFQ preset.

The article system still has a role: an editorial post *about* a set, linking to it.
Editorial drives the set; it does not model it.

## Decisions

| Question | Decision |
|---|---|
| Pricing | Rolled up from component tier prices, with an optional discount % |
| Quantity unit | Pieces, snapped up to MOQ (box) multiples |
| Stock | None — sets are quoted manually via RFQ |
| Placement | Own route `/:lang/business-sets` + detail page, plus a band on the institutional catalog |
| Roll-up computation | Server denormalizes component prices; client computes via `productPricing.js` |

## Data model

New migration `0017_add_business_sets.sql`.

```sql
CREATE TABLE IF NOT EXISTS product_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_th TEXT,
    slug TEXT NOT NULL UNIQUE,
    cover_image_key TEXT,
    description TEXT,
    description_th TEXT,
    price_tier INTEGER DEFAULT 1,      -- 1..3; L4/L5 remain staff-only
    discount_pct REAL DEFAULT 0,
    is_published INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_set_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    set_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    variant_id INTEGER,                -- optional; pins a specific variant's prices
    quantity INTEGER NOT NULL,         -- pieces, already snapped to an MOQ multiple
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (set_id) REFERENCES product_sets(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_product_sets_published
    ON product_sets (is_published, sort_order);
CREATE INDEX IF NOT EXISTS idx_product_set_items_set ON product_set_items (set_id);
```

A junction table rather than a JSON column: unlike `projects.product_ids`, these rows
carry a quantity and are joined for denormalization — the case JSON was rejected for.

`product_set_items.product_id` deliberately has **no** `ON DELETE CASCADE`. A deleted
product must break loudly rather than silently shrink a set.

Slugs are generated server-side on insert, following the precedent in
`0013_add_projects.sql:6-8` — Thai-only names slugged in the browser collapse to `-42`.

## API

All routes in `hidden-water-ed9d/src/index.ts`, following the `/projects` shape.

**Public** (before the auth gate at `index.ts:1283`):

- `GET /business-sets` — published sets, each with denormalized lines carrying
  `product_id`, `variant_id`, `quantity`, `name`, `name_th`, `moq`, `price_1..3`,
  `image_key`. Two queries plus an in-memory join; not N+1. Sets computed as
  incomplete (see Roll-up rule 2) are **omitted from this list entirely** — hiding is
  the endpoint's job, not the page's, so every consumer behaves the same.
- `GET /business-sets/:slug` — one set, same shape. Returns 404 when the set is
  absent, unpublished, **or incomplete**; a set with a missing component has no
  correct price, so it must not render at all.

**Admin** (after the auth gate — the blanket
`Authorization === env.ADMIN_PASSWORD` check at `index.ts:1284-1287` covers
everything below it, so no new guard is needed):

- `POST /business-sets` — upsert, mirroring `/projects` at `index.ts:1291`. Sending
  an `id` updates; omitting it inserts. Replaces the whole item list on save.
- `POST /business-sets/delete` — by id; items cascade.

Write validation (400 on failure): `name` non-empty; `price_tier` an integer in 1–3
(never 4 or 5, which are staff-only prices and must not reach a customer-facing
total); `discount_pct` a number in 0–100; every line `quantity` a positive integer.
A set with zero lines may be saved but is treated as unpublished.

## Roll-up rules

Per line: `toPerPiece(boxPriceForTier, parseMoq(moq)) × quantity`, using
`frontend/kitweb/src/utils/productPricing.js` **unchanged**. Set subtotal is the sum;
total is `subtotal × (1 − discount_pct/100)` via the existing `roundHalfUp`.

Edge cases:

1. **Tier price missing.** If the chosen tier is 0, fall back to the next populated
   tier downward, matching `tierBoxPriceForRow` (`add-to-order-modal.vue:79`). If no
   tier has a price, the line contributes 0 and the set is flagged in admin — never
   silently mispriced.
2. **Component deleted or hidden.** A set is *incomplete* when any of its lines
   references a product that no longer exists or has `is_visible = 0`. Public
   endpoints suppress incomplete sets as described above. The admin endpoint always
   returns them, with `is_incomplete: true` and the offending lines marked, so they
   can be listed in red and fixed.
3. **`variant_id` present.** Prices come from `product_variants.price_1..3` rather
   than the parent product, since variants carry their own tiers.

Quantities are snapped in the **admin editor** at entry time, so stored quantities are
always valid multiples and the public pages never re-snap.

## Public UI

- `/:lang/business-sets` → `BusinessSetsPage.vue`: card grid — cover, name, line
  count, rolled-up price.
- `/:lang/business-sets/:slug` → `BusinessSetPage.vue`: cover, description, fixed
  contents table (line, per-piece price, line total), discount line, total, and a
  **Request this set** button.
- A "Business Sets" band at the top of `InstitutionalCatalogPage.vue`, above the
  category grid, linking to the detail pages.

Both routes are lang-scoped children of `/:lang` like every other route, with
`BreadcrumbBar` and `useHead`, following `ProjectPage.vue`.

Note: `/institutional/catalog` returns no prices (`index.ts:668-678` selects only
`id, sku, title, description, category_id, image_url`, from a different table set),
which is why the sets endpoint must carry its own component prices.

## RFQ integration

**Request this set** opens the existing RFQ modal with the set's lines prefilled and
quantities **locked** — a shop must not have to re-pick them.

It posts to `/rfq/submit` **unchanged**. The payload is already
`items: [{ id, title, quantity }]` (`index.ts:1108-1118`), so a set submits as its
component lines. The set name is prepended to `notes` as
`Business Set: <name>` so the order shows what was requested.

Consequence: **no changes to `orders`, `order_items`, the cart, or fulfilment.** A set
order is indistinguishable downstream from a hand-built RFQ — already a known process.

One refactor is in scope: extracting the RFQ modal out of `InstitutionalCatalogPage.vue`
(1827 lines) into a shared `rfq-modal.vue`, since two callers now need it.

## Admin

New `admin-business-sets.vue` tab in `AdminDashboard.vue`, modelled on
`admin-projects.vue`: metadata fields, cover upload, a product picker that adds lines,
and a per-line quantity input that snaps to the MOQ multiple reusing the order modal's
rounding and warning copy (`catalog.qtyRoundedToBox`). A live price panel shows the
roll-up while editing, so the number is visible before publishing.

## Testing

**The current baseline is red, and this must be fixed before new tests mean anything.**

- `hidden-water-ed9d/test/index.spec.ts` is the untouched Hello World scaffold. Both
  its tests fail: they assert `"Hello World!"` while the worker returns
  `"Unauthorized"` for `/`. Verified by running `npx vitest run` on 2026-08-15.
  These two stale tests are to be deleted, not fixed — they assert behaviour the
  worker never had.
- **The frontend has no test runner at all** — `frontend/kitweb/package.json` has no
  test script and no vitest dependency. Adding roll-up unit tests requires adding
  vitest to the frontend. This is real, previously unflagged scope.
- Worker tests need the schema applied to the test D1. `vitest.config.mts` already
  uses `defineWorkersConfig` with `wrangler.jsonc`, so the `DB` binding resolves, but
  migrations are not applied automatically — a setup step must apply them.
- **Risk:** `migrations/` has duplicate numeric prefixes (`0002`, `0013`, `0014`,
  `0015` each appear twice), so `applyD1Migrations` ordering is ambiguous. The plan
  must either resolve the duplicates or apply `schema.sql` plus the new migration
  directly in test setup. This is a pre-existing condition, not caused by this work.

Coverage once green:

- Worker: set CRUD round-trip; slug generation from a Thai-only name; denormalization
  shape; cascade on set delete; the deleted-component `is_incomplete` path; 401 for
  unauthenticated admin routes.
- Frontend: roll-up maths — tier fallback, discount application, MOQ snapping, and the
  zero-price line.

## Out of scope

No set stock, no set SKU, no cart or checkout path for sets, no retail-catalog or
homepage exposure, and no change to `projects` or `product_ids`. Sets remain an
RFQ-only B2B surface until that proves too limiting.
