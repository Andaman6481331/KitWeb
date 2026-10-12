import { env, SELF, fetchMock } from "cloudflare:test";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resetDb, seedOrderableProduct, getOrder } from "./helpers/db";

// The shop never contacts customers first: an order is only a request until the
// customer messages the OA / WhatsApp with their order number. These tests pin
// the three places that model shows up on the server — input validation, the
// wording of the two LINE pushes, and the staff "mark confirmed" endpoint.

const SHOP_WHATSAPP = "66894886877";

let linePushes: any[] = [];

function interceptLinePushes() {
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

const customerPush = () => linePushes.find(p => p.to !== "Utest-staff");
const staffPush = () => linePushes.find(p => p.to === "Utest-staff");

describe("POST /order/submit — contact validation", () => {
	beforeEach(async () => {
		await resetDb();
		linePushes = [];
		interceptLinePushes();
	});
	afterEach(() => fetchMock.deactivate());

	it("rejects the 'ss' address from the real junk order", async () => {
		const p = await seedOrderableProduct(90);
		const res = await submit([line(p)], { shippingAddress: "ss" });

		expect(res.status).toBe(400);
		expect((await res.json() as any).error).toBe("INVALID_ADDRESS");
	});

	it("rejects an unusable phone number", async () => {
		const p = await seedOrderableProduct(90);
		const res = await submit([line(p)], { phoneNumber: "12345" });

		expect(res.status).toBe(400);
		expect((await res.json() as any).error).toBe("INVALID_PHONE");
	});

	it("rejects a one-letter name", async () => {
		const p = await seedOrderableProduct(90);
		const res = await submit([line(p)], { customerName: "k" });

		expect(res.status).toBe(400);
		expect((await res.json() as any).error).toBe("INVALID_NAME");
	});

	it("creates no order and sends no LINE push when the contact is rejected", async () => {
		const p = await seedOrderableProduct(90);
		await submit([line(p)], { shippingAddress: "ss" });

		const { results } = await env.DB.prepare("SELECT id FROM orders").all();
		expect(results).toHaveLength(0);
		expect(linePushes).toHaveLength(0);
	});

	it("stores the corrected phone when the leading 0 was dropped", async () => {
		const p = await seedOrderableProduct(90);
		const res = await submit([line(p)], { phoneNumber: "800065007" });

		expect(res.status).toBe(200);
		const { orderId } = await res.json() as any;
		expect((await getOrder(orderId)).phone_number).toBe("0800065007");
	});
});

describe("POST /order/submit — an order starts unconfirmed", () => {
	beforeEach(async () => {
		await resetDb();
		linePushes = [];
		interceptLinePushes();
	});
	afterEach(() => fetchMock.deactivate());

	it("leaves contact_confirmed_at empty on a new order", async () => {
		const p = await seedOrderableProduct(90);
		const { orderId } = await (await submit([line(p)])).json() as any;

		expect((await getOrder(orderId)).contact_confirmed_at).toBeNull();
	});

	it("tells staff not to act until the customer messages, and where to look", async () => {
		const p = await seedOrderableProduct(90);
		const { orderId } = await (await submit([line(p)])).json() as any;

		const text = staffPush().messages[0].text;
		expect(text).toContain(orderId);
		expect(text).toContain("รอลูกค้าส่งข้อความยืนยัน");
		expect(text).toContain("WhatsApp");
		expect(text).toContain(SHOP_WHATSAPP);
	});

	it("gives the customer a receipt that asks for confirmation instead of promising shipping", async () => {
		const p = await seedOrderableProduct(90);
		await submit([line(p)], { lineUserId: "Ucustomer123" });

		const json = JSON.stringify(customerPush());
		expect(json).not.toContain("ยืนยันคำสั่งซื้อ\",\"weight"); // old title
		expect(json).not.toContain("จะจัดส่งให้เร็วที่สุด");
		expect(json).toContain("ได้รับคำสั่งซื้อแล้ว");
	});

	it("puts a one-tap message button on the receipt that sends the order number", async () => {
		const p = await seedOrderableProduct(90);
		const { orderId } = await (await submit([line(p)], { lineUserId: "Ucustomer123" })).json() as any;

		const bubble = customerPush().messages[0].contents;
		const buttons = JSON.stringify(bubble);
		expect(buttons).toContain("\"type\":\"button\"");
		expect(buttons).toContain("\"type\":\"message\"");
		expect(buttons).toContain(`Hi, my order is ${orderId}`);

		// LINE rejects a button label over 20 characters outright.
		const labels = [...buttons.matchAll(/"label":"([^"]*)"/g)].map(m => m[1]);
		expect(labels.length).toBeGreaterThan(0);
		for (const label of labels) expect([...label].length).toBeLessThanOrEqual(20);
	});

	it("asks a quote customer to reply with the order number", async () => {
		const p = await seedOrderableProduct(null);
		const { orderId } = await (await submit([line(p)], { lineUserId: "Ucustomer123" })).json() as any;

		const push = customerPush();
		expect(push.messages[0].type).toBe("text");
		expect(push.messages[0].text).toContain(orderId);
		expect(push.messages[0].text).toContain("ตอบกลับ");
	});
});

describe("POST /orders/confirm-contact", () => {
	const AUTH = { "Content-Type": "application/json", "Authorization": env.ADMIN_PASSWORD as string };

	const confirm = (body: any, headers: Record<string, string> = AUTH) =>
		SELF.fetch("https://example.com/orders/confirm-contact", {
			method: "POST", headers, body: JSON.stringify(body)
		});

	async function seedOrder(): Promise<string> {
		const orderId = `WH-2026-${Math.floor(Math.random() * 99999)}`;
		await env.DB.prepare(
			"INSERT INTO orders (id, customer_name, total_amount, status, payment_method) VALUES (?, ?, ?, ?, ?)"
		).bind(orderId, "Somchai", 100, "PENDING", "PromptPay (manual)").run();
		return orderId;
	}

	beforeEach(resetDb);

	it("rejects an unauthenticated call", async () => {
		const orderId = await seedOrder();
		const res = await confirm({ orderId }, { "Content-Type": "application/json" });
		expect(res.status).toBe(401);
		expect((await getOrder(orderId)).contact_confirmed_at).toBeNull();
	});

	it("stamps the order as confirmed", async () => {
		const orderId = await seedOrder();
		const res = await confirm({ orderId });

		expect(res.status).toBe(200);
		expect((await getOrder(orderId)).contact_confirmed_at).not.toBeNull();
	});

	it("can un-confirm an order marked by mistake", async () => {
		const orderId = await seedOrder();
		await confirm({ orderId });
		const res = await confirm({ orderId, confirmed: false });

		expect(res.status).toBe(200);
		expect((await getOrder(orderId)).contact_confirmed_at).toBeNull();
	});

	it("404s on an unknown order", async () => {
		const res = await confirm({ orderId: "WH-NOPE" });
		expect(res.status).toBe(404);
	});

	it("400s when no order id is given", async () => {
		const res = await confirm({});
		expect(res.status).toBe(400);
	});

	it("exposes the flag on GET /orders so Manage Orders and Track Orders can read it", async () => {
		const orderId = await seedOrder();
		await confirm({ orderId });

		const res = await SELF.fetch("https://example.com/orders", { headers: AUTH });
		const orders = await res.json() as any[];
		expect(orders.find(o => o.id === orderId).contact_confirmed_at).not.toBeNull();
	});
});
