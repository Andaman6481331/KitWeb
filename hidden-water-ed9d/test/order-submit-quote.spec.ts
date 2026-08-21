import { env, SELF, fetchMock } from "cloudflare:test";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resetDb, seedOrderableProduct, getOrder, getOrderItems } from "./helpers/db";

// Every LINE push the endpoint makes is captured here so the assertions can look
// at what the customer would actually have received.
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
	for (const [k, v] of Object.entries(extra)) form.append(k, v);
	return SELF.fetch("https://example.com/order/submit", { method: "POST", body: form });
};

const line = (id: number, quantity = 2, over: Record<string, any> = {}) => ({
	id, name: "Cotton Thread", name_th: null,
	selectedSize: "Standard", selectedColor: "Default", quantity, ...over
});

// The push aimed at the customer, not the staff account.
const customerPush = () => linePushes.find(p => p.to !== "Utest-staff");
const staffPush = () => linePushes.find(p => p.to === "Utest-staff");

describe("POST /order/submit — unpriced items become a quote", () => {
	beforeEach(async () => {
		await resetDb();
		linePushes = [];
		interceptLinePushes();
	});
	afterEach(() => fetchMock.deactivate());

	it("still prices a fully-priced cart as a normal order", async () => {
		const p = await seedOrderableProduct(90);
		const res = await submit([line(p, 2)]);

		expect(res.status).toBe(200);
		const { orderId } = await res.json() as any;
		const order = await getOrder(orderId);
		expect(order.total_amount).toBe(180);
		expect(order.payment_method).toBe("PromptPay (manual)");
	});

	it("marks the order as a quote when a product has no price yet", async () => {
		const p = await seedOrderableProduct(null);
		const res = await submit([line(p, 2)]);

		expect(res.status).toBe(200);
		const { orderId, isQuote } = await res.json() as any;
		expect(isQuote).toBe(true);

		const order = await getOrder(orderId);
		expect(order.payment_method).toBe("QUOTE");
		expect(order.status).toBe("PENDING");
		expect(order.total_amount).toBe(0);
	});

	it("treats a zero price as not-yet-priced rather than free", async () => {
		const p = await seedOrderableProduct(0);
		const res = await submit([line(p, 2)]);

		const { orderId } = await res.json() as any;
		expect((await getOrder(orderId)).payment_method).toBe("QUOTE");
	});

	it("stores a NULL line price for the unpriced item and keeps real prices on the rest", async () => {
		const priced = await seedOrderableProduct(90);
		const unpriced = await seedOrderableProduct(null);
		const res = await submit([line(priced, 2), line(unpriced, 3)]);

		const { orderId } = await res.json() as any;
		const items = await getOrderItems(orderId);
		expect(items).toHaveLength(2);
		expect(items[0].price).toBe(90);
		expect(items[1].price).toBeNull();
		expect((await getOrder(orderId)).total_amount).toBe(0);
	});

	it("never sends the customer a receipt showing a price we have not agreed", async () => {
		const p = await seedOrderableProduct(null);
		await submit([line(p, 2)], { lineUserId: "Ucustomer123" });

		const push = customerPush();
		expect(push).toBeDefined();
		expect(push.messages[0].type).toBe("text");
		expect(JSON.stringify(push)).not.toContain("฿0.00");
	});

	it("sends the customer the normal flex receipt for a fully-priced order", async () => {
		const p = await seedOrderableProduct(90);
		await submit([line(p, 2)], { lineUserId: "Ucustomer123" });

		expect(customerPush().messages[0].type).toBe("flex");
	});

	it("tells staff the quote needs pricing and names the unpriced item", async () => {
		const p = await seedOrderableProduct(null);
		await submit([line(p, 2)]);

		const text = staffPush().messages[0].text;
		expect(text).toContain("รอใส่ราคา");
		expect(text).toContain("Cotton Thread");
	});

	it("still rejects a cart holding a product that does not exist", async () => {
		const res = await submit([line(999999, 2)]);

		expect(res.status).toBe(400);
		expect((await res.json() as any).error).toBe("PRODUCT_UNAVAILABLE");
	});

	it("treats a DIY kit with no price as unpriced too", async () => {
		const res = await env.DB.prepare(
			"INSERT INTO diy_products (name, price_1) VALUES (?, ?)"
		).bind("Kit", null).run();
		const diyId = Number(res.meta.last_row_id);

		const submitted = await submit([line(`diy-${diyId}` as any, 1)]);
		const { orderId } = await submitted.json() as any;
		expect((await getOrder(orderId)).payment_method).toBe("QUOTE");
	});
});
