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
