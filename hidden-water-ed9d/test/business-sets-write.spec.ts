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
