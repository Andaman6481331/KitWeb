import { env, SELF, fetchMock } from "cloudflare:test";
import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import { resetDb, seedOrderableProduct, getOrder, getOrderItems } from "./helpers/db";

const AUTH = { "Content-Type": "application/json", "Authorization": env.ADMIN_PASSWORD as string };

const update = (body: any) =>
	SELF.fetch("https://example.com/orders/update", {
		method: "POST", headers: AUTH, body: JSON.stringify(body)
	});

// Seed an order directly: /order/submit needs LINE mocking, and these tests are
// about what the admin editor does to an order that already exists.
async function seedOrder(paymentMethod: string, total: number, items: any[], lineUserId: string | null = null) {
	const orderId = `WH-2026-${Math.floor(Math.random() * 99999)}`;
	await env.DB.prepare(
		"INSERT INTO orders (id, customer_name, total_amount, status, payment_method, line_user_id) VALUES (?, ?, ?, ?, ?, ?)"
	).bind(orderId, "Somchai", total, "PENDING", paymentMethod, lineUserId).run();
	for (const it of items) {
		await env.DB.prepare(
			"INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES (?, ?, ?, ?, ?)"
		).bind(orderId, it.productId, it.name || "Cotton Thread", it.quantity, it.price).run();
	}
	return orderId;
}

const editLine = (id: number | null, quantity: number, price: number) => ({
	id, name: "Cotton Thread", selectedSize: "Standard", selectedColor: "Default", quantity, price
});

describe("POST /orders/update — pricing up a quote", () => {
	beforeEach(resetDb);

	it("rejects an unauthenticated write", async () => {
		const res = await SELF.fetch("https://example.com/orders/update", {
			method: "POST", headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ orderId: "WH-1" })
		});
		expect(res.status).toBe(401);
	});

	it("accepts a staff price for a catalog product that has none yet", async () => {
		const p = await seedOrderableProduct(null);
		const orderId = await seedOrder("QUOTE", 0, [{ productId: p, quantity: 2, price: null }]);

		const res = await update({ orderId, items: [editLine(p, 2, 50)] });
		expect(res.status).toBe(200);

		const items = await getOrderItems(orderId);
		expect(items[0].price).toBe(50);
	});

	it("flips a fully priced quote back into a normal order", async () => {
		const p = await seedOrderableProduct(null);
		const orderId = await seedOrder("QUOTE", 0, [{ productId: p, quantity: 2, price: null }]);

		await update({ orderId, items: [editLine(p, 2, 50)] });

		const order = await getOrder(orderId);
		expect(order.payment_method).toBe("PromptPay (manual)");
		expect(order.total_amount).toBe(100);
	});

	it("keeps the order a quote while any line is still unpriced", async () => {
		const a = await seedOrderableProduct(null);
		const b = await seedOrderableProduct(null);
		const orderId = await seedOrder("QUOTE", 0, [
			{ productId: a, quantity: 2, price: null },
			{ productId: b, quantity: 1, price: null }
		]);

		await update({ orderId, items: [editLine(a, 2, 50), editLine(b, 1, 0)] });

		const order = await getOrder(orderId);
		expect(order.payment_method).toBe("QUOTE");
		// A partial sum stored as the total would read as a final price.
		expect(order.total_amount).toBe(0);
		const items = await getOrderItems(orderId);
		expect(items[0].price).toBe(50);
		expect(items[1].price).toBeNull();
	});

	it("still prefers the catalog price over a staff-typed one for a priced product", async () => {
		const p = await seedOrderableProduct(90);
		const orderId = await seedOrder("PromptPay (manual)", 180, [{ productId: p, quantity: 2, price: 90 }]);

		await update({ orderId, items: [editLine(p, 2, 5)] });

		const items = await getOrderItems(orderId);
		expect(items[0].price).toBe(90);
		expect((await getOrder(orderId)).total_amount).toBe(180);
	});

	it("leaves a normal order's payment method alone", async () => {
		const p = await seedOrderableProduct(90);
		const orderId = await seedOrder("PromptPay", 180, [{ productId: p, quantity: 2, price: 90 }]);

		await update({ orderId, items: [editLine(p, 2, 90)] });

		expect((await getOrder(orderId)).payment_method).toBe("PromptPay");
	});

	it("still prices a custom line with no product from the staff-entered price", async () => {
		const orderId = await seedOrder("PromptPay (manual)", 0, []);

		await update({ orderId, items: [editLine(null, 3, 25)] });

		const items = await getOrderItems(orderId);
		expect(items[0].price).toBe(25);
		expect((await getOrder(orderId)).total_amount).toBe(75);
	});
});

describe("POST /orders/update — telling the customer their confirmed price", () => {
	let pushes: any[] = [];
	// One persisted interceptor for the whole block: registering a fresh one per
	// test leaves the earlier ones in place, and the first match wins — so a
	// per-test 400 would be shadowed by a 200 from a previous test.
	let replyStatus = 200;

	beforeAll(() => {
		fetchMock.activate();
		fetchMock.disableNetConnect();
		fetchMock
			.get("https://api.line.me")
			.intercept({ path: "/v2/bot/message/push", method: "POST" })
			.reply((opts: any) => {
				pushes.push(JSON.parse(opts.body as string));
				return { statusCode: replyStatus, data: {} };
			})
			.persist();
	});
	afterAll(() => fetchMock.deactivate());

	beforeEach(async () => {
		await resetDb();
		pushes = [];
		replyStatus = 200;
	});

	it("sends the confirmed total once every line is priced", async () => {
		const p = await seedOrderableProduct(null);
		const orderId = await seedOrder("QUOTE", 0, [{ productId: p, quantity: 2, price: null }], "Ucustomer123");

		const res = await update({ orderId, items: [editLine(p, 2, 50)] });
		expect((await res.json() as any).customerNotified).toBe(true);

		expect(pushes).toHaveLength(1);
		expect(pushes[0].to).toBe("Ucustomer123");
		expect(JSON.stringify(pushes[0])).toContain("100.00");
	});

	it("stays quiet while the quote is still missing a price", async () => {
		const a = await seedOrderableProduct(null);
		const b = await seedOrderableProduct(null);
		const orderId = await seedOrder("QUOTE", 0, [
			{ productId: a, quantity: 2, price: null },
			{ productId: b, quantity: 1, price: null }
		], "Ucustomer123");

		await update({ orderId, items: [editLine(a, 2, 50), editLine(b, 1, 0)] });

		expect(pushes).toHaveLength(0);
	});

	it("stays quiet when an ordinary order is edited", async () => {
		const p = await seedOrderableProduct(90);
		const orderId = await seedOrder("PromptPay (manual)", 180, [{ productId: p, quantity: 2, price: 90 }], "Ucustomer123");

		await update({ orderId, items: [editLine(p, 2, 90)] });

		expect(pushes).toHaveLength(0);
	});

	it("stays quiet when the customer never connected LINE", async () => {
		const p = await seedOrderableProduct(null);
		const orderId = await seedOrder("QUOTE", 0, [{ productId: p, quantity: 2, price: null }], null);

		const res = await update({ orderId, items: [editLine(p, 2, 50)] });
		expect((await res.json() as any).customerNotified).toBe(false);
		expect(pushes).toHaveLength(0);
	});

	it("flags the order unreachable when the confirmation push fails", async () => {
		replyStatus = 400;
		const p = await seedOrderableProduct(null);
		const orderId = await seedOrder("QUOTE", 0, [{ productId: p, quantity: 2, price: null }], "Ucustomer123");

		await update({ orderId, items: [editLine(p, 2, 50)] });

		const order = await getOrder(orderId);
		expect(order.line_push_failed).toBe(1);
		// The pricing itself must still stick even though the customer wasn't reached.
		expect(order.payment_method).toBe("PromptPay (manual)");
		expect(order.total_amount).toBe(100);
	});
});
