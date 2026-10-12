import { env, SELF, fetchMock } from "cloudflare:test";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resetDb, getOrder } from "./helpers/db";

// A customer's message to the OA arrives as a signed POST. These tests pin what a
// message may and may not do to an order, and that nothing unsigned gets through.

const SECRET = "test-line-channel-secret";

let pushes: any[] = [];
let replies: any[] = [];

function interceptLine() {
	fetchMock.activate();
	fetchMock.disableNetConnect();
	const line = fetchMock.get("https://api.line.me");
	line.intercept({ path: "/v2/bot/message/push", method: "POST" })
		.reply(200, (opts: any) => { pushes.push(JSON.parse(opts.body as string)); return {}; })
		.persist();
	line.intercept({ path: "/v2/bot/message/reply", method: "POST" })
		.reply(200, (opts: any) => { replies.push(JSON.parse(opts.body as string)); return {}; })
		.persist();
}

async function sign(body: string, secret = SECRET): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
	);
	const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
	let bin = "";
	for (const b of mac) bin += String.fromCharCode(b);
	return btoa(bin);
}

async function deliver(payload: any, opts: { signature?: string | null } = {}) {
	const body = JSON.stringify(payload);
	const headers: Record<string, string> = { "Content-Type": "application/json" };
	const signature = opts.signature === undefined ? await sign(body) : opts.signature;
	if (signature !== null) headers["x-line-signature"] = signature;
	return SELF.fetch("https://example.com/line/webhook", { method: "POST", headers, body });
}

const textEvent = (text: string, userId = "Ucustomer123", replyToken = "reply-token-1") => ({
	type: "message", replyToken, source: { type: "user", userId },
	message: { type: "text", id: "1", text }
});

async function seedOrder(over: Record<string, any> = {}): Promise<string> {
	const row = {
		id: "WH-2026-33355", customer_name: "Somchai", total_amount: 180, status: "PENDING",
		payment_method: "PromptPay (manual)", phone_number: "0812345678",
		line_user_id: null, contact_confirmed_at: null, line_push_failed: 0, ...over
	};
	await env.DB.prepare(
		`INSERT INTO orders (id, customer_name, total_amount, status, payment_method, phone_number,
			line_user_id, contact_confirmed_at, line_push_failed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).bind(row.id, row.customer_name, row.total_amount, row.status, row.payment_method,
		row.phone_number, row.line_user_id, row.contact_confirmed_at, row.line_push_failed).run();
	return row.id;
}

describe("POST /line/webhook — signature", () => {
	beforeEach(async () => { await resetDb(); pushes = []; replies = []; interceptLine(); });
	afterEach(() => fetchMock.deactivate());

	it("refuses an unsigned request and touches nothing", async () => {
		const id = await seedOrder();
		const res = await deliver({ events: [textEvent(`Hi, my order is ${id}`)] }, { signature: null });

		expect(res.status).toBe(401);
		expect((await getOrder(id)).contact_confirmed_at).toBeNull();
		expect(replies).toHaveLength(0);
	});

	it("refuses a request signed with the wrong secret", async () => {
		const id = await seedOrder();
		const payload = { events: [textEvent(`Hi, my order is ${id}`)] };
		const res = await deliver(payload, { signature: await sign(JSON.stringify(payload), "wrong") });

		expect(res.status).toBe(401);
		expect((await getOrder(id)).contact_confirmed_at).toBeNull();
	});

	it("answers LINE's verification ping (no events) with 200", async () => {
		const res = await deliver({ destination: "Uxxx", events: [] });
		expect(res.status).toBe(200);
	});
});

describe("POST /line/webhook — confirming an order", () => {
	beforeEach(async () => { await resetDb(); pushes = []; replies = []; interceptLine(); });
	afterEach(() => fetchMock.deactivate());

	it("confirms the order from the one-tap message", async () => {
		const id = await seedOrder();
		const res = await deliver({ events: [textEvent(`Hi, my order is ${id}`)] });

		expect(res.status).toBe(200);
		const row = await getOrder(id);
		expect(row.contact_confirmed_at).not.toBeNull();
		expect(row.contact_confirmed_via).toBe("line-webhook");
	});

	it("links the sender's LINE account so later status pushes reach a guest", async () => {
		const id = await seedOrder({ line_push_failed: 1 });
		await deliver({ events: [textEvent(`Hi, my order is ${id}`, "Uguest999")] });

		const row = await getOrder(id);
		expect(row.line_user_id).toBe("Uguest999");
		expect(row.line_push_failed).toBe(0);
	});

	it("replies to the customer right away using the reply token", async () => {
		const id = await seedOrder();
		await deliver({ events: [textEvent(`Hi, my order is ${id}`, "Ucustomer123", "tok-42")] });

		expect(replies).toHaveLength(1);
		expect(replies[0].replyToken).toBe("tok-42");
		expect(replies[0].messages[0].text).toContain(id);
		expect(replies[0].messages[0].text).toContain("ได้รับข้อความยืนยัน");
	});

	it("alerts staff once that the customer confirmed", async () => {
		const id = await seedOrder();
		await deliver({ events: [textEvent(`Hi, my order is ${id}`)] });

		const staff = pushes.filter(p => p.to === "Utest-staff");
		expect(staff).toHaveLength(1);
		expect(staff[0].messages[0].text).toContain(id);
	});

	it("is idempotent when LINE redelivers the same event", async () => {
		const id = await seedOrder();
		const payload = { events: [textEvent(`Hi, my order is ${id}`)] };
		await deliver(payload);
		const firstStamp = (await getOrder(id)).contact_confirmed_at;
		pushes = [];

		await deliver(payload);
		expect((await getOrder(id)).contact_confirmed_at).toBe(firstStamp);
		expect(pushes.filter(p => p.to === "Utest-staff")).toHaveLength(0);
	});

	it("does not overwrite a confirmation staff already recorded", async () => {
		const id = await seedOrder({ contact_confirmed_at: "2026-10-12 09:00:00" });
		await env.DB.prepare("UPDATE orders SET contact_confirmed_via = 'staff' WHERE id = ?").bind(id).run();
		await deliver({ events: [textEvent(`Hi, my order is ${id}`)] });

		const row = await getOrder(id);
		expect(row.contact_confirmed_at).toBe("2026-10-12 09:00:00");
		expect(row.contact_confirmed_via).toBe("staff");
	});

	it("confirms every order number quoted in one message", async () => {
		const a = await seedOrder({ id: "WH-2026-00001" });
		const b = await seedOrder({ id: "WH-2026-00002" });
		await deliver({ events: [textEvent(`${a} และ ${b} ค่ะ`)] });

		expect((await getOrder(a)).contact_confirmed_at).not.toBeNull();
		expect((await getOrder(b)).contact_confirmed_at).not.toBeNull();
	});
});

describe("POST /line/webhook — what it must not confirm", () => {
	beforeEach(async () => { await resetDb(); pushes = []; replies = []; interceptLine(); });
	afterEach(() => fetchMock.deactivate());

	it("leaves an order alone when another LINE account quotes its number", async () => {
		const id = await seedOrder({ line_user_id: "Uowner" });
		await deliver({ events: [textEvent(`Hi, my order is ${id}`, "Ustranger")] });

		const row = await getOrder(id);
		expect(row.contact_confirmed_at).toBeNull();
		expect(row.line_user_id).toBe("Uowner");
		// Staff are told to look; the stranger gets a neutral reply that reveals nothing.
		expect(pushes.find(p => p.to === "Utest-staff").messages[0].text).toContain("ตรวจสอบเอง");
		expect(replies[0].messages[0].text).not.toContain("ยืนยันของคุณแล้ว");
	});

	it("does not confirm a cancelled order", async () => {
		const id = await seedOrder({ status: "CANCELLED" });
		await deliver({ events: [textEvent(`Hi, my order is ${id}`)] });

		expect((await getOrder(id)).contact_confirmed_at).toBeNull();
	});

	it("says nothing about an order number that does not exist", async () => {
		await deliver({ events: [textEvent("Hi, my order is WH-2026-99999")] });

		expect(replies).toHaveLength(0);
		expect(pushes).toHaveLength(0);
	});

	it("ignores messages with no order number, and non-text events", async () => {
		const id = await seedOrder();
		await deliver({ events: [
			textEvent("ราคาเท่าไหร่คะ"),
			{ type: "follow", replyToken: "t", source: { type: "user", userId: "Ucustomer123" } },
			{ type: "message", replyToken: "t", source: { type: "user", userId: "Ucustomer123" },
				message: { type: "sticker", id: "9", packageId: "1", stickerId: "1" } }
		] });

		expect((await getOrder(id)).contact_confirmed_at).toBeNull();
		expect(replies).toHaveLength(0);
	});
});
