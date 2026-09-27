import { env, SELF, fetchMock } from "cloudflare:test";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resetDb, seedProduct, getOrder, getOrderItems } from "./helpers/db";

// The storefront shows a PER-PIECE price: the tier's box price divided by the MOQ
// (which doubles as the box size). The Worker has to arrive at the same number, or
// the customer is quoted one price and charged another.

function interceptLinePushes() {
	fetchMock.activate();
	fetchMock.disableNetConnect();
	fetchMock
		.get("https://api.line.me")
		.intercept({ path: "/v2/bot/message/push", method: "POST" })
		.reply(200, () => ({}))
		.persist();
}

const submit = (cartItems: any[]) => {
	const form = new FormData();
	form.append("customerName", "Somchai");
	form.append("phoneNumber", "0812345678");
	form.append("shippingAddress", "123 Sampeng, Bangkok");
	form.append("cartItems", JSON.stringify(cartItems));
	return SELF.fetch("https://example.com/order/submit", { method: "POST", body: form });
};

const line = (id: any, quantity: number, over: Record<string, any> = {}) => ({
	id, name: "Cotton Thread", name_th: null,
	selectedSize: "Standard", selectedColor: "Default", quantity, ...over
});

const submitAndRead = async (cartItems: any[]) => {
	const res = await submit(cartItems);
	expect(res.status).toBe(200);
	const { orderId } = await res.json() as any;
	return { order: await getOrder(orderId), items: await getOrderItems(orderId), orderId };
};

describe("POST /order/submit — tier and MOQ pricing", () => {
	beforeEach(async () => {
		await resetDb();
		interceptLinePushes();
	});
	afterEach(() => fetchMock.deactivate());

	it("charges the per-piece price rather than the box price", async () => {
		// A box of 8 costs ฿50, so the storefront shows ฿6.25/piece. Charging the box
		// price per piece would bill ฿400 for one box — a 8x overcharge.
		const p = await seedProduct({ moq: "8", price_1: 50 });

		const { order, items } = await submitAndRead([line(p, 8)]);

		expect(items[0].price).toBe(6.25);
		expect(order.total_amount).toBe(50);
	});

	it("reads the box size out of a free-text MOQ", async () => {
		const p = await seedProduct({ moq: "20 pcs", price_1: 800 });

		const { order } = await submitAndRead([line(p, 20)]);

		expect(order.total_amount).toBe(800);
	});

	it("drops to the tier-2 price at 20 pieces", async () => {
		const p = await seedProduct({ moq: "10", price_1: 100, price_2: 80 });

		const { items, order } = await submitAndRead([line(p, 20)]);

		expect(items[0].price).toBe(8);
		expect(order.total_amount).toBe(160);
	});

	it("drops to the tier-3 price at 50 pieces", async () => {
		const p = await seedProduct({ moq: "10", price_1: 100, price_2: 80, price_3: 60 });

		const { items, order } = await submitAndRead([line(p, 50)]);

		expect(items[0].price).toBe(6);
		expect(order.total_amount).toBe(300);
	});

	it("keeps the tier-1 price below 20 pieces", async () => {
		const p = await seedProduct({ moq: "10", price_1: 100, price_2: 80 });

		const { items } = await submitAndRead([line(p, 10)]);

		expect(items[0].price).toBe(10);
	});

	it("falls back to a lower tier when the reached tier has no price set", async () => {
		// Never fall UP: an unset tier-2 must not cost the customer more than tier 1.
		const p = await seedProduct({ moq: "10", price_1: 100, price_2: 0, price_3: 0 });

		const { items, order } = await submitAndRead([line(p, 20)]);

		expect(items[0].price).toBe(10);
		expect(order.total_amount).toBe(200);
	});

	it("picks the tier from the combined quantity of one product across cart lines", async () => {
		// Two variants of the same product are one volume as far as tiers go — this is
		// what the add-to-order modal shows when it sums its variant rows.
		const p = await seedProduct({ moq: "10", price_1: 100, price_2: 80 });

		const { items, order } = await submitAndRead([
			line(p, 10, { selectedSize: "Small" }),
			line(p, 10, { selectedSize: "Large" })
		]);

		expect(items.map(i => i.price)).toEqual([8, 8]);
		expect(order.total_amount).toBe(160);
	});

	it("does not pool quantities across different products", async () => {
		const a = await seedProduct({ moq: "10", price_1: 100, price_2: 80 });
		const b = await seedProduct({ moq: "10", price_1: 100, price_2: 80 });

		const { items } = await submitAndRead([line(a, 10), line(b, 10)]);

		expect(items.map(i => i.price)).toEqual([10, 10]);
	});

	it("rounds the per-piece price half-up to two decimals", async () => {
		// ฿65 across a box of 8 is ฿8.125 — a price needs to be a real money amount.
		const p = await seedProduct({ moq: "8", price_1: 65 });

		const { items } = await submitAndRead([line(p, 8)]);

		expect(items[0].price).toBe(8.13);
	});

	it("treats a product with no tier price at all as unpriced", async () => {
		const p = await seedProduct({ moq: "10", price_1: 0, price_2: 0, price_3: 0 });

		const res = await submit([line(p, 10)]);
		const { isQuote, orderId } = await res.json() as any;

		expect(isQuote).toBe(true);
		expect((await getOrder(orderId)).payment_method).toBe("QUOTE");
	});

	it("prices a DIY kit from its tiers at one piece per box", async () => {
		const res = await env.DB.prepare(
			"INSERT INTO diy_products (name, price_1, price_2, price_3) VALUES (?, ?, ?, ?)"
		).bind("Starter Kit", 120, 0, 0).run();
		const diyId = Number(res.meta.last_row_id);

		const { items, order } = await submitAndRead([line(`diy-${diyId}`, 2)]);

		expect(items[0].price).toBe(120);
		expect(order.total_amount).toBe(240);
	});

	it("gives a DIY kit its volume tier too", async () => {
		const res = await env.DB.prepare(
			"INSERT INTO diy_products (name, price_1, price_2, price_3) VALUES (?, ?, ?, ?)"
		).bind("Starter Kit", 120, 90, 0).run();
		const diyId = Number(res.meta.last_row_id);

		const { items } = await submitAndRead([line(`diy-${diyId}`, 20)]);

		expect(items[0].price).toBe(90);
	});
});

describe("POST /orders/update — tier and MOQ pricing", () => {
	const AUTH = {
		"Content-Type": "application/json",
		"Authorization": env.ADMIN_PASSWORD as string
	};

	beforeEach(resetDb);

	const seedOrder = async (paymentMethod: string, items: any[]) => {
		const orderId = `WH-2026-${Math.floor(Math.random() * 99999)}`;
		await env.DB.prepare(
			"INSERT INTO orders (id, customer_name, total_amount, status, payment_method) VALUES (?, ?, ?, ?, ?)"
		).bind(orderId, "Somchai", 0, "PENDING", paymentMethod).run();
		for (const it of items) {
			await env.DB.prepare(
				"INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES (?, ?, ?, ?, ?)"
			).bind(orderId, it.productId, "Cotton Thread", it.quantity, it.price).run();
		}
		return orderId;
	};

	it("recomputes a staff edit from the tiers, not the legacy price column", async () => {
		const p = await seedProduct({ moq: "8", price_1: 50 });
		const orderId = await seedOrder("PromptPay (manual)", [{ productId: p, quantity: 8, price: 6.25 }]);

		const res = await SELF.fetch("https://example.com/orders/update", {
			method: "POST",
			headers: AUTH,
			body: JSON.stringify({
				orderId,
				items: [{ id: p, name: "Cotton Thread", selectedSize: "Standard", selectedColor: "Default", quantity: 8, price: 999 }]
			})
		});
		expect(res.status).toBe(200);

		const items = await getOrderItems(orderId);
		expect(items[0].price).toBe(6.25);
		expect((await getOrder(orderId)).total_amount).toBe(50);
	});

	it("re-tiers a line when staff change its quantity", async () => {
		const p = await seedProduct({ moq: "10", price_1: 100, price_2: 80 });
		const orderId = await seedOrder("PromptPay (manual)", [{ productId: p, quantity: 10, price: 10 }]);

		await SELF.fetch("https://example.com/orders/update", {
			method: "POST",
			headers: AUTH,
			body: JSON.stringify({
				orderId,
				items: [{ id: p, name: "Cotton Thread", selectedSize: "Standard", selectedColor: "Default", quantity: 20, price: 0 }]
			})
		});

		const items = await getOrderItems(orderId);
		expect(items[0].price).toBe(8);
		expect((await getOrder(orderId)).total_amount).toBe(160);
	});
});
