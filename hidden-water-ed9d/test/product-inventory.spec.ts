import { env, SELF, fetchMock } from "cloudflare:test";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ADMIN_TEST_TOKEN, resetDb, seedProduct, getOrder, getOrderItems } from "./helpers/db";

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

// The editor shows "Per piece" = box price / pieces per box. The website must charge exactly that.
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
