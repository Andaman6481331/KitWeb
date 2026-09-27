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
