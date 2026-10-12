import { env, SELF, fetchMock } from "cloudflare:test";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ADMIN_TEST_TOKEN, resetDb, seedOrderableProduct, getOrder } from "./helpers/db";

// Delivery is quoted per order by staff and added afterwards, and a customer gets
// back to their order through a private link (or order number + phone). These
// tests pin the Worker side of both.

let linePushes: any[] = [];

function interceptLine() {
	fetchMock.activate();
	fetchMock.disableNetConnect();
	fetchMock
		.get("https://api.line.me")
		.intercept({ path: "/v2/bot/message/push", method: "POST" })
		.reply(200, (opts: any) => {
			linePushes.push(JSON.parse(opts.body as string));
			return {};
		})
		.persist();
}

const ADMIN = { "Content-Type": "application/json", "Authorization": ADMIN_TEST_TOKEN };
const JSON_HEADERS = { "Content-Type": "application/json" };

const submit = (cartItems: any[], extra: Record<string, string> = {}) => {
	const form = new FormData();
	form.append("customerName", "Somchai");
	form.append("phoneNumber", "0812345678");
	form.append("shippingAddress", "123 Sampeng, Bangkok");
	form.append("cartItems", JSON.stringify(cartItems));
	for (const [k, v] of Object.entries(extra)) form.set(k, v);
	return SELF.fetch("https://example.com/order/submit", { method: "POST", body: form });
};

const line = (id: number, quantity = 2) => ({
	id, name: "Cotton Thread", name_th: null,
	selectedSize: "Standard", selectedColor: "Default", quantity
});

const lookup = (body: any) =>
	SELF.fetch("https://example.com/orders/lookup", {
		method: "POST", headers: JSON_HEADERS, body: JSON.stringify(body)
	});

const update = (body: any) =>
	SELF.fetch("https://example.com/orders/update", {
		method: "POST", headers: ADMIN, body: JSON.stringify(body)
	});

async function placeOrder(extra: Record<string, string> = {}, perPiece: number | null = 90) {
	const p = await seedOrderableProduct(perPiece);
	const res = await submit([line(p)], extra);
	return await res.json() as any;
}

describe("POST /order/submit — private order link", () => {
	beforeEach(async () => { await resetDb(); linePushes = []; interceptLine(); });
	afterEach(() => fetchMock.deactivate());

	it("returns a view key and stores it on the order", async () => {
		const { orderId, viewKey } = await placeOrder();

		expect(viewKey).toMatch(/^[0-9a-f]{32}$/);
		expect((await getOrder(orderId)).view_key).toBe(viewKey);
	});

	it("starts with no delivery fee quoted", async () => {
		const { orderId } = await placeOrder();
		expect((await getOrder(orderId)).delivery_fee).toBeNull();
	});

	it("puts a view-order link with the key on the customer's LINE receipt", async () => {
		const { orderId, viewKey } = await placeOrder({ lineUserId: "Ucustomer123", lang: "en" });

		const receipt = JSON.stringify(linePushes.find(p => p.to === "Ucustomer123"));
		expect(receipt).toContain(`/en/ordertracking?orderId=${orderId}`);
		expect(receipt).toContain(`key=${viewKey}`);
	});

	it("tells the customer prices may be old and delivery is quoted separately", async () => {
		await placeOrder({ lineUserId: "Ucustomer123" });

		const receipt = JSON.stringify(linePushes.find(p => p.to === "Ucustomer123"));
		expect(receipt).toContain("หลายรายการยังเป็นราคาเดิม");
		expect(receipt).toContain("แจ้งให้ทราบภายหลัง");
		expect(receipt).toContain("ไม่บวกเพิ่ม");
		expect(receipt).not.toContain("ยอดที่ต้องชำระ");
	});
});

describe("POST /orders/lookup", () => {
	beforeEach(async () => { await resetDb(); linePushes = []; interceptLine(); });
	afterEach(() => fetchMock.deactivate());

	it("returns the order to whoever holds the private key", async () => {
		const { orderId, viewKey } = await placeOrder();
		const res = await lookup({ orderId, key: viewKey });

		expect(res.status).toBe(200);
		const { order } = await res.json() as any;
		expect(order.id).toBe(orderId);
		expect(order.items).toHaveLength(1);
		expect(order.items_total).toBe(180);
		expect(order.delivery_fee).toBeNull();
		expect(order.contact_confirmed_at).toBeNull();
	});

	it("accepts the order's phone number written another way", async () => {
		const { orderId } = await placeOrder();
		const res = await lookup({ orderId, phone: "+66 81 234 5678" });
		expect(res.status).toBe(200);
	});

	it("never returns contact details, slips or internal keys", async () => {
		const { orderId, viewKey } = await placeOrder({ lineUserId: "Ucustomer123" });
		const text = await (await lookup({ orderId, key: viewKey })).text();

		for (const secret of ["0812345678", "123 Sampeng", "Ucustomer123", viewKey]) {
			expect(text).not.toContain(secret);
		}
	});

	it("answers every miss with the same 404", async () => {
		const { orderId, viewKey } = await placeOrder();

		const wrongKey = await lookup({ orderId, key: "0".repeat(32) });
		const wrongPhone = await lookup({ orderId, phone: "0899999999" });
		const unknown = await lookup({ orderId: "WH-2026-99999", key: viewKey });

		for (const res of [wrongKey, wrongPhone, unknown]) {
			expect(res.status).toBe(404);
			expect(await res.json()).toEqual({ error: "NOT_FOUND" });
		}
	});

	it("refuses a request that offers no proof at all", async () => {
		const { orderId } = await placeOrder();
		expect((await lookup({ orderId })).status).toBe(400);
		expect((await lookup({ key: "abc" })).status).toBe(400);
	});

	it("does not treat an order with no stored key as unlockable by an empty key", async () => {
		await env.DB.prepare(
			"INSERT INTO orders (id, customer_name, total_amount, status, payment_method, phone_number) VALUES (?, ?, ?, ?, ?, ?)"
		).bind("WH-2026-00007", "Old Customer", 100, "PENDING", "PromptPay (manual)", "0811111111").run();

		expect((await lookup({ orderId: "WH-2026-00007", key: "" , phone: "" })).status).toBe(400);
		expect((await lookup({ orderId: "WH-2026-00007", key: "undefined" })).status).toBe(404);
		expect((await lookup({ orderId: "WH-2026-00007", phone: "0811111111" })).status).toBe(200);
	});
});

describe("POST /orders/update — delivery fee", () => {
	beforeEach(async () => { await resetDb(); linePushes = []; interceptLine(); });
	afterEach(() => fetchMock.deactivate());

	it("stores the quoted fee and shows it, with the grand total, on the lookup", async () => {
		const { orderId, viewKey } = await placeOrder();
		const res = await update({ orderId, deliveryFee: 85.5 });

		expect(res.status).toBe(200);
		expect((await getOrder(orderId)).delivery_fee).toBe(85.5);

		const { order } = await (await lookup({ orderId, key: viewKey })).json() as any;
		expect(order.delivery_fee).toBe(85.5);
		expect(order.grand_total).toBe(265.5);
	});

	it("tells the customer on LINE the delivery cost and the amount to pay", async () => {
		const { orderId } = await placeOrder({ lineUserId: "Ucustomer123" });
		linePushes = [];

		const res = await update({ orderId, deliveryFee: 80 });
		expect((await res.json() as any).customerNotified).toBe(true);

		const push = linePushes.find(p => p.to === "Ucustomer123");
		const json = JSON.stringify(push);
		expect(json).toContain("แจ้งค่าจัดส่งแล้ว");
		expect(json).toContain("฿80.00");
		expect(json).toContain("฿260.00"); // 180 items + 80 delivery
	});

	it("accepts 0 as a real quote — free delivery is not 'not quoted'", async () => {
		const { orderId } = await placeOrder();
		await update({ orderId, deliveryFee: 0 });
		expect((await getOrder(orderId)).delivery_fee).toBe(0);
	});

	it("clears a fee back to 'not quoted' with null, and leaves it alone when omitted", async () => {
		const { orderId } = await placeOrder();
		await update({ orderId, deliveryFee: 80 });

		await update({ orderId, note: "unrelated edit" });
		expect((await getOrder(orderId)).delivery_fee).toBe(80);

		await update({ orderId, deliveryFee: null });
		expect((await getOrder(orderId)).delivery_fee).toBeNull();
	});

	it("rejects a negative or non-numeric fee without changing anything", async () => {
		const { orderId } = await placeOrder();
		await update({ orderId, deliveryFee: 80 });

		for (const bad of [-5, "abc"]) {
			const res = await update({ orderId, deliveryFee: bad, customerName: "Changed" });
			expect(res.status).toBe(400);
		}
		const row = await getOrder(orderId);
		expect(row.delivery_fee).toBe(80);
		expect(row.customer_name).toBe("Somchai");
	});

	it("does not message the customer while the order is still an unpriced quote", async () => {
		const { orderId } = await placeOrder({ lineUserId: "Ucustomer123" }, null);
		linePushes = [];

		const res = await update({ orderId, deliveryFee: 80 });
		expect(res.status).toBe(200);
		expect(linePushes.filter(p => p.to === "Ucustomer123")).toHaveLength(0);
	});

	it("does not message the customer again when the fee is unchanged", async () => {
		const { orderId } = await placeOrder({ lineUserId: "Ucustomer123" });
		await update({ orderId, deliveryFee: 80 });
		linePushes = [];

		await update({ orderId, deliveryFee: 80 });
		expect(linePushes.filter(p => p.to === "Ucustomer123")).toHaveLength(0);
	});
});

describe("POST /orders/confirm-contact — customer is told", () => {
	beforeEach(async () => { await resetDb(); linePushes = []; interceptLine(); });
	afterEach(() => fetchMock.deactivate());

	const confirm = (body: any) =>
		SELF.fetch("https://example.com/orders/confirm-contact", {
			method: "POST", headers: ADMIN, body: JSON.stringify(body)
		});

	it("sends a received message the first time, and records that staff did it", async () => {
		const { orderId } = await placeOrder({ lineUserId: "Ucustomer123" });
		linePushes = [];

		const res = await confirm({ orderId });
		expect((await res.json() as any).customerNotified).toBe(true);
		expect(linePushes.filter(p => p.to === "Ucustomer123")).toHaveLength(1);
		expect((await getOrder(orderId)).contact_confirmed_via).toBe("staff");
	});

	it("stays silent on a repeat press and on undo", async () => {
		const { orderId } = await placeOrder({ lineUserId: "Ucustomer123" });
		await confirm({ orderId });
		linePushes = [];

		await confirm({ orderId });
		await confirm({ orderId, confirmed: false });
		expect(linePushes).toHaveLength(0);
		expect((await getOrder(orderId)).contact_confirmed_via).toBeNull();
	});

	it("still confirms an order whose customer has no LINE linked", async () => {
		const { orderId } = await placeOrder();
		const res = await confirm({ orderId });

		expect(res.status).toBe(200);
		expect((await res.json() as any).customerNotified).toBe(false);
		expect((await getOrder(orderId)).contact_confirmed_at).not.toBeNull();
	});
});
