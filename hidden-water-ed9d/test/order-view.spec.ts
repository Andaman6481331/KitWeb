import { describe, it, expect } from "vitest";
import {
	extractOrderIds, newViewKey, phonesMatch, secretsMatch, toOrderView, verifyLineSignature
} from "../src/order-view";

// The rules that decide who may see an order and which LINE messages may confirm
// one live in order-view.ts as pure functions, so they are pinned here without a
// request in the way.

async function sign(body: string, secret: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
	);
	const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
	let bin = "";
	for (const b of mac) bin += String.fromCharCode(b);
	return btoa(bin);
}

describe("extractOrderIds", () => {
	it("finds the order number inside the one-tap message and free text", () => {
		expect(extractOrderIds("Hi, my order is WH-2026-33355")).toEqual(["WH-2026-33355"]);
		expect(extractOrderIds("สวัสดีค่ะ ออเดอร์ wh-2026-00042 นะคะ")).toEqual(["WH-2026-00042"]);
	});

	it("returns each order once, in order, capped", () => {
		const text = "WH-2026-00001 WH-2026-00002 WH-2026-00001 WH-2026-00003 WH-2026-00004";
		expect(extractOrderIds(text)).toEqual(["WH-2026-00001", "WH-2026-00002", "WH-2026-00003"]);
	});

	it("ignores text without an order number", () => {
		expect(extractOrderIds("ราคาเท่าไหร่คะ")).toEqual([]);
		expect(extractOrderIds("WH-26-1")).toEqual([]);
		expect(extractOrderIds("")).toEqual([]);
	});
});

describe("phonesMatch", () => {
	it("treats local and international spellings of one number as equal", () => {
		expect(phonesMatch("0812345678", "081-234-5678")).toBe(true);
		expect(phonesMatch("0812345678", "+66812345678")).toBe(true);
		expect(phonesMatch("+66812345678", "0812345678")).toBe(true);
		expect(phonesMatch("0812345678", "812345678")).toBe(true);
	});

	it("rejects a different number and unusable input", () => {
		expect(phonesMatch("0812345678", "0812345679")).toBe(false);
		expect(phonesMatch("0812345678", "")).toBe(false);
		expect(phonesMatch(null, "0812345678")).toBe(false);
		expect(phonesMatch("0812345678", "12345")).toBe(false);
	});
});

describe("secretsMatch / newViewKey", () => {
	it("matches only identical, non-empty secrets", () => {
		expect(secretsMatch("abc", "abc")).toBe(true);
		expect(secretsMatch("abc", "abd")).toBe(false);
		expect(secretsMatch("abc", "abcd")).toBe(false);
		expect(secretsMatch("", "")).toBe(false);
		expect(secretsMatch(null, "abc")).toBe(false);
	});

	it("makes long, unique keys", () => {
		const a = newViewKey();
		expect(a).toMatch(/^[0-9a-f]{32}$/);
		expect(newViewKey()).not.toBe(a);
	});
});

describe("toOrderView", () => {
	const row = {
		id: "WH-2026-00001", status: "PENDING", payment_method: "PromptPay (manual)",
		total_amount: 500, delivery_fee: null, customer_name: "Somchai",
		phone_number: "0812345678", shipping_address: "123 Sampeng", line_user_id: "Uabc",
		slip_url: "slips/x.jpg", view_key: "secretkey", slip_transaction_ref: "ref",
		contact_confirmed_at: null, created_at: "2026-10-12 10:00:00", tracking_number: null
	};

	it("exposes only what the customer needs", () => {
		const view = toOrderView(row, [{ product_name: "Thread", size: "S", color: "Red", quantity: 2, price: 250, order_id: "x" }]);
		const json = JSON.stringify(view);
		for (const secret of ["0812345678", "123 Sampeng", "Uabc", "slips/x.jpg", "secretkey", "ref"]) {
			expect(json).not.toContain(secret);
		}
		expect(view.items).toEqual([{ product_name: "Thread", size: "S", color: "Red", quantity: 2, price: 250 }]);
	});

	it("keeps delivery 'not quoted' distinct from a free delivery", () => {
		expect(toOrderView(row, []).delivery_fee).toBeNull();
		expect(toOrderView(row, []).grand_total).toBeNull();
		expect(toOrderView({ ...row, delivery_fee: 0 }, []).delivery_fee).toBe(0);
		expect(toOrderView({ ...row, delivery_fee: 0 }, []).grand_total).toBe(500);
		expect(toOrderView({ ...row, delivery_fee: 80 }, []).grand_total).toBe(580);
	});

	it("never shows a total for an unpriced quote", () => {
		const view = toOrderView({ ...row, payment_method: "QUOTE", total_amount: 0, delivery_fee: 80 }, []);
		expect(view.is_quote).toBe(true);
		expect(view.items_total).toBeNull();
		expect(view.grand_total).toBeNull();
	});
});

describe("verifyLineSignature", () => {
	const secret = "channel-secret";
	const body = JSON.stringify({ events: [] });

	it("accepts the signature LINE would send", async () => {
		expect(await verifyLineSignature(body, await sign(body, secret), secret)).toBe(true);
	});

	it("rejects a tampered body, a wrong secret and a missing header", async () => {
		const good = await sign(body, secret);
		expect(await verifyLineSignature(body + " ", good, secret)).toBe(false);
		expect(await verifyLineSignature(body, await sign(body, "other"), secret)).toBe(false);
		expect(await verifyLineSignature(body, null, secret)).toBe(false);
		expect(await verifyLineSignature(body, good, "")).toBe(false);
	});
});
