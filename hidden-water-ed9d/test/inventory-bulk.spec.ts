import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { ADMIN_TEST_TOKEN, resetDb, seedProduct } from "./helpers/db";

const AUTH = { "Content-Type": "application/json", "Authorization": ADMIN_TEST_TOKEN };
const NO_AUTH = { "Content-Type": "application/json" };

const post = (path: string, body: any, headers: Record<string, string> = AUTH) =>
	SELF.fetch(`https://example.com${path}`, { method: "POST", headers, body: JSON.stringify(body) });

async function row(id: number): Promise<any> {
	return await env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(id).first();
}

async function count(table: string): Promise<number> {
	const r = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first() as any;
	return r.n;
}

async function seedCategory(path: string) {
	await env.DB.prepare("INSERT INTO categories (name, path) VALUES (?, ?)").bind(path, path).run();
}

async function linkCategory(productId: number, path: string) {
	await env.DB.prepare("INSERT INTO product_categories (product_id, category_path) VALUES (?, ?)")
		.bind(productId, path).run();
}

async function seedImage(productId: number, key: string) {
	await env.DB.prepare(
		"INSERT INTO product_images (product_id, image_key, attribute_type) VALUES (?, ?, 'gallery')"
	).bind(productId, key).run();
}

// None of the inventory endpoints may remove a row, whatever they are asked to do.
async function snapshotCounts() {
	return {
		products: await count("products"),
		images: await count("product_images"),
		links: await count("product_categories"),
		categories: await count("categories")
	};
}

describe("POST /products/visibility", () => {
	beforeEach(resetDb);

	it("rejects an unauthenticated write", async () => {
		const id = await seedProduct();
		const res = await post("/products/visibility", { ids: [id], is_visible: false }, NO_AUTH);
		expect(res.status).toBe(401);
		expect((await row(id)).is_visible).toBe(1);
	});

	it.each([
		["no ids", { ids: [], is_visible: false }],
		["non-array ids", { ids: "1", is_visible: false }],
		["non-integer ids", { ids: [1.5], is_visible: false }],
		["missing is_visible", { ids: [1] }],
		["non-boolean is_visible", { ids: [1], is_visible: "no" }],
		["more than 500 ids", { ids: Array.from({ length: 501 }, (_, i) => i + 1), is_visible: false }]
	])("rejects %s", async (_label, body) => {
		const res = await post("/products/visibility", body);
		expect(res.status).toBe(400);
	});

	it("hides only the listed products and touches nothing else on them", async () => {
		const a = await seedProduct({ sku: "A", name: "A", price_1: 800, moq: "20 pcs" });
		const b = await seedProduct({ sku: "B", name: "B" });
		await seedImage(a, "a-large.webp");
		const before = await row(a);

		const res = await post("/products/visibility", { ids: [a], is_visible: false });
		expect(res.status).toBe(200);
		expect((await res.json() as any).updated).toBe(1);

		const after = await row(a);
		expect(after.is_visible).toBe(0);
		expect({ ...after, is_visible: 1 }).toEqual({ ...before, is_visible: 1 });
		expect((await row(b)).is_visible).toBe(1);
		expect(await count("product_images")).toBe(1);
	});

	it("shows hidden products again", async () => {
		const a = await seedProduct({ is_visible: 0 });
		const res = await post("/products/visibility", { ids: [a], is_visible: true });
		expect(res.status).toBe(200);
		expect((await row(a)).is_visible).toBe(1);
	});

	it("will not make an archived product visible", async () => {
		const a = await seedProduct({ is_visible: 0 });
		await env.DB.prepare("UPDATE products SET archived_at = '2026-01-01' WHERE id = ?").bind(a).run();

		const res = await post("/products/visibility", { ids: [a], is_visible: true });
		expect(res.status).toBe(200);
		expect((await res.json() as any).updated).toBe(0);
		expect((await row(a)).is_visible).toBe(0);
	});

	it("handles more ids than one D1 statement can bind", async () => {
		const ids: number[] = [];
		for (let i = 0; i < 120; i++) ids.push(await seedProduct({ sku: `BULK-${i}` }));

		const res = await post("/products/visibility", { ids, is_visible: false });
		expect(res.status).toBe(200);
		expect((await res.json() as any).updated).toBe(120);
		const hidden = await env.DB.prepare("SELECT COUNT(*) AS n FROM products WHERE is_visible = 0").first() as any;
		expect(hidden.n).toBe(120);
	});
});

describe("POST /products/categories", () => {
	beforeEach(resetDb);

	it("rejects an unauthenticated write", async () => {
		const id = await seedProduct();
		await seedCategory("beads");
		const res = await post("/products/categories", { ids: [id], category_path: "beads" }, NO_AUTH);
		expect(res.status).toBe(401);
		expect(await count("product_categories")).toBe(0);
	});

	it("rejects a category that does not exist", async () => {
		const id = await seedProduct();
		const res = await post("/products/categories", { ids: [id], category_path: "nope" });
		expect(res.status).toBe(400);
		expect(await count("product_categories")).toBe(0);
	});

	it("rejects bad ids or a missing path", async () => {
		await seedCategory("beads");
		expect((await post("/products/categories", { ids: [], category_path: "beads" })).status).toBe(400);
		expect((await post("/products/categories", { ids: [1] })).status).toBe(400);
	});

	it("adds the category and keeps every existing link and the primary category", async () => {
		const id = await seedProduct();
		await env.DB.prepare("UPDATE products SET category = 'yarn' WHERE id = ?").bind(id).run();
		await seedCategory("yarn");
		await seedCategory("beads");
		await linkCategory(id, "yarn");

		const res = await post("/products/categories", { ids: [id], category_path: "beads" });
		expect(res.status).toBe(200);
		expect((await res.json() as any).added).toBe(1);

		const links = await env.DB.prepare(
			"SELECT category_path FROM product_categories WHERE product_id = ? ORDER BY category_path"
		).bind(id).all();
		expect(links.results.map((r: any) => r.category_path)).toEqual(["beads", "yarn"]);
		expect((await row(id)).category).toBe("yarn");
	});

	it("is idempotent", async () => {
		const id = await seedProduct();
		await seedCategory("beads");
		await post("/products/categories", { ids: [id], category_path: "beads" });
		const again = await post("/products/categories", { ids: [id], category_path: "beads" });

		expect(again.status).toBe(200);
		expect((await again.json() as any).added).toBe(0);
		expect(await count("product_categories")).toBe(1);
	});

	it("ignores ids that are not products", async () => {
		const id = await seedProduct();
		await seedCategory("beads");
		const res = await post("/products/categories", { ids: [id, 9999], category_path: "beads" });
		expect(res.status).toBe(200);
		expect(await count("product_categories")).toBe(1);
	});
});

describe("POST /products/archive and /products/restore", () => {
	beforeEach(resetDb);

	it("rejects unauthenticated writes", async () => {
		const id = await seedProduct();
		expect((await post("/products/archive", { ids: [id] }, NO_AUTH)).status).toBe(401);
		expect((await post("/products/restore", { items: [{ id, is_visible: true }] }, NO_AUTH)).status).toBe(401);
		expect((await row(id)).archived_at).toBeNull();
	});

	it("rejects bad input", async () => {
		expect((await post("/products/archive", { ids: [] })).status).toBe(400);
		expect((await post("/products/restore", { items: [] })).status).toBe(400);
		expect((await post("/products/restore", { items: [{ id: 1 }] })).status).toBe(400);
		expect((await post("/products/restore", { items: [{ id: "x", is_visible: true }] })).status).toBe(400);
	});

	it("archives: hides from the site, stamps archived_at, keeps every row", async () => {
		const a = await seedProduct({ sku: "A" });
		const b = await seedProduct({ sku: "B" });
		await seedImage(a, "a-large.webp");
		await seedCategory("beads");
		await linkCategory(a, "beads");
		const before = await snapshotCounts();

		const res = await post("/products/archive", { ids: [a] });
		expect(res.status).toBe(200);
		expect((await res.json() as any).updated).toBe(1);

		const archived = await row(a);
		expect(archived.is_visible).toBe(0);
		expect(archived.archived_at).toEqual(expect.any(String));
		expect((await row(b)).archived_at).toBeNull();
		expect((await row(b)).is_visible).toBe(1);
		expect(await snapshotCounts()).toEqual(before);
	});

	it("does not move the archive date when archiving twice", async () => {
		const a = await seedProduct();
		await env.DB.prepare("UPDATE products SET archived_at = '2026-01-01 00:00:00', is_visible = 0 WHERE id = ?")
			.bind(a).run();
		const res = await post("/products/archive", { ids: [a] });
		expect((await res.json() as any).updated).toBe(0);
		expect((await row(a)).archived_at).toBe("2026-01-01 00:00:00");
	});

	it("restores with the visibility the caller remembered", async () => {
		const shown = await seedProduct({ sku: "S" });
		const hidden = await seedProduct({ sku: "H", is_visible: 0 });
		await post("/products/archive", { ids: [shown, hidden] });

		const res = await post("/products/restore", {
			items: [{ id: shown, is_visible: true }, { id: hidden, is_visible: false }]
		});
		expect(res.status).toBe(200);
		expect((await res.json() as any).updated).toBe(2);

		const a = await row(shown);
		const b = await row(hidden);
		expect(a.archived_at).toBeNull();
		expect(a.is_visible).toBe(1);
		expect(b.archived_at).toBeNull();
		expect(b.is_visible).toBe(0);
	});

	it("restore leaves products that were never archived alone", async () => {
		const id = await seedProduct({ is_visible: 0 });
		const res = await post("/products/restore", { items: [{ id, is_visible: true }] });
		expect((await res.json() as any).updated).toBe(0);
		expect((await row(id)).is_visible).toBe(0);
	});
});

describe("admin product list", () => {
	beforeEach(resetDb);

	it("includes archived_at so the page can tell archived products apart", async () => {
		const id = await seedProduct();
		await post("/products/archive", { ids: [id] });

		const res = await SELF.fetch("https://example.com/products?include_hidden=1", {
			headers: { Authorization: ADMIN_TEST_TOKEN }
		});
		expect(res.status).toBe(200);
		const list = await res.json() as any[];
		expect(list.find((p) => p.id === id).archived_at).toEqual(expect.any(String));
	});

	it("keeps archived products off the public storefront", async () => {
		const id = await seedProduct();
		await post("/products/archive", { ids: [id] });

		const res = await SELF.fetch("https://example.com/products");
		const list = await res.json() as any[];
		expect(list.find((p) => p.id === id)).toBeUndefined();
	});
});
