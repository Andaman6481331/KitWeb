import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { ADMIN_TEST_TOKEN, resetDb } from "./helpers/db";
import { bangkokDay, cashSaleRef, parseCashSale } from "../src/cash-sale";

const AUTH = { "Content-Type": "application/json", "Authorization": ADMIN_TEST_TOKEN };

const post = (body: any, headers: Record<string, string> = AUTH) =>
	SELF.fetch("https://example.com/cashsales", { method: "POST", headers, body: JSON.stringify(body) });
const list = (query = "", headers: Record<string, string> = AUTH) =>
	SELF.fetch(`https://example.com/cashsales${query}`, { headers });

const sale = (over: Record<string, unknown> = {}) => ({
	client_id: `sale-${Math.random().toString(36).slice(2, 12)}`,
	items: [
		{ name: "กรรไกร", price: 45, qty: 3 },
		{ name: "ลูกปัดมุก", name_en: "Pearl beads", price: 12.5, qty: 2, custom: true }
	],
	received: 200, note: "Mr Somchai", copy_lang: "en",
	...over
});

describe("parseCashSale", () => {
	it("works the total out from the lines, not from the page", () => {
		const out = parseCashSale({ ...sale(), total_amount: 1 });
		expect(out.ok && out.sale.total).toBe(160);
		expect(out.ok && out.sale.pieces).toBe(5);
	});

	it("keeps the English name and the custom flag, and tidies text", () => {
		const out = parseCashSale(sale({ note: "  a   b  " }));
		expect(out.ok && out.sale.lines[1]).toMatchObject({ nameEn: "Pearl beads", isCustom: true });
		expect(out.ok && out.sale.lines[0]).toMatchObject({ nameEn: null, isCustom: false });
		expect(out.ok && out.sale.note).toBe("a b");
	});

	it.each([
		["no client id", { client_id: "" }],
		["no items", { items: [] }],
		["a blank name", { items: [{ name: "  ", price: 5, qty: 1 }] }],
		["a zero price", { items: [{ name: "x", price: 0, qty: 1 }] }],
		["a fractional quantity", { items: [{ name: "x", price: 5, qty: 1.5 }] }],
		["a huge quantity", { items: [{ name: "x", price: 5, qty: 10001 }] }],
		["too many lines", { items: Array.from({ length: 201 }, () => ({ name: "x", price: 1, qty: 1 })) }]
	])("rejects %s", (_label, over) => {
		expect(parseCashSale(sale(over)).ok).toBe(false);
	});

	it("ignores a bad received amount and unknown languages", () => {
		const out = parseCashSale(sale({ received: "lots", copy_lang: "fr" }));
		expect(out.ok && out.sale.received).toBeNull();
		expect(out.ok && out.sale.copyLang).toBe("th");
	});
});

describe("dates and references", () => {
	it("names a sale by its Bangkok date, even just after midnight UTC+7", () => {
		// 2026-10-31 18:00 UTC is 01:00 on 1 Nov in Bangkok.
		expect(cashSaleRef(new Date("2026-10-31T18:00:00Z"), "a1b2c3d4-0000-4000-8000-000000000000"))
			.toBe("INV-261101-A1B2C3");
	});

	it("spans a Bangkok day in UTC", () => {
		expect(bangkokDay("2026-11-01")).toEqual({
			day: "2026-11-01", from: "2026-10-31T17:00:00.000Z", to: "2026-11-01T17:00:00.000Z"
		});
	});

	it("defaults to today in Bangkok and rejects non-dates", () => {
		expect(bangkokDay(null, new Date("2026-10-31T18:00:00Z"))?.day).toBe("2026-11-01");
		expect(bangkokDay("2026-02-30")).toBeNull();
		expect(bangkokDay("yesterday")).toBeNull();
	});
});

describe("POST /cashsales", () => {
	beforeEach(resetDb);

	it("needs an admin session", async () => {
		expect((await post(sale(), { "Content-Type": "application/json" })).status).toBe(401);
		expect((await list("", {})).status).toBe(401);
	});

	it("saves the sale and one row per line", async () => {
		const res = await post(sale());
		expect(res.status).toBe(201);
		const body = await res.json() as any;
		expect(body.sale.invoice_ref).toMatch(/^INV-\d{6}-[0-9A-F]{6}$/);
		expect(body.sale).toMatchObject({ total_amount: 160, piece_count: 5, received_amount: 200, copy_lang: "en", note: "Mr Somchai" });
		expect(body.sale.items).toEqual([
			{ name: "กรรไกร", name_en: null, unit_price: 45, quantity: 3, line_total: 135, is_custom: 0 },
			{ name: "ลูกปัดมุก", name_en: "Pearl beads", unit_price: 12.5, quantity: 2, line_total: 25, is_custom: 1 }
		]);
		const rows = await env.DB.prepare("SELECT COUNT(*) AS n FROM cash_sale_items").first<{ n: number }>();
		expect(rows?.n).toBe(2);
	});

	it("does not touch the old pos tables", async () => {
		await env.DB.prepare("CREATE TABLE IF NOT EXISTS pos_orders (order_id TEXT PRIMARY KEY, total_amount REAL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)").run();
		await post(sale());
		const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM pos_orders").first<{ n: number }>();
		expect(n?.n).toBe(0);
	});

	it("saves a retried sale once", async () => {
		const body = sale();
		const first = await (await post(body)).json() as any;
		const again = await post(body);
		expect(again.status).toBe(200);
		const second = await again.json() as any;
		expect(second.created).toBe(false);
		expect(second.sale.id).toBe(first.sale.id);
		const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM cash_sales").first<{ n: number }>();
		expect(n?.n).toBe(1);
	});

	it("rejects a bad sale and saves nothing", async () => {
		const res = await post(sale({ items: [{ name: "x", price: -5, qty: 1 }] }));
		expect(res.status).toBe(400);
		const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM cash_sales").first<{ n: number }>();
		expect(n?.n).toBe(0);
	});
});

describe("PUT /cashsales/:id/exclude", () => {
	beforeEach(resetDb);

	const exclude = (id: string, body: any, headers: Record<string, string> = AUTH) =>
		SELF.fetch(`https://example.com/cashsales/${id}/exclude`, { method: "PUT", headers, body: JSON.stringify(body) });

	it("tags a sale as excluded, keeps it and its lines, and can clear the tag", async () => {
		const saved = await (await post(sale())).json() as any;
		const id = saved.sale.id;
		expect(saved.sale.excluded_at).toBeNull();

		const res = await exclude(id, { excluded: true, reason: "  typed wrong  " });
		expect(res.status).toBe(200);
		const tagged = (await res.json() as any).sale;
		expect(tagged.excluded_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		expect(tagged.exclude_reason).toBe("typed wrong");
		expect(tagged.items).toHaveLength(2);

		const listed = (await (await list()).json() as any).sales;
		expect(listed).toHaveLength(1);
		expect(listed[0].excluded_at).toBe(tagged.excluded_at);

		const cleared = (await (await exclude(id, { excluded: false })).json() as any).sale;
		expect(cleared.excluded_at).toBeNull();
		expect(cleared.exclude_reason).toBeNull();
		const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM cash_sales").first<{ n: number }>();
		expect(n?.n).toBe(1);
	});

	it("needs an admin session, a real sale and a true/false flag", async () => {
		const saved = await (await post(sale())).json() as any;
		expect((await exclude(saved.sale.id, { excluded: true }, { "Content-Type": "application/json" })).status).toBe(401);
		expect((await exclude("no-such-sale", { excluded: true })).status).toBe(404);
		expect((await exclude(saved.sale.id, { excluded: "yes" })).status).toBe(400);
	});
});

describe("GET /cashsales", () => {
	beforeEach(resetDb);

	it("lists today's sales with their lines, newest first", async () => {
		await post(sale({ items: [{ name: "first", price: 10, qty: 1 }] }));
		await post(sale({ items: [{ name: "second", price: 20, qty: 2 }] }));
		const body = await (await list()).json() as any;
		expect(body.sales).toHaveLength(2);
		expect(body.sales[0].items[0].name).toBe("second");
		expect(body.sales[1].items).toHaveLength(1);
	});

	it("only lists the day asked for", async () => {
		await post(sale());
		const body = await (await list("?date=2001-01-01")).json() as any;
		expect(body).toEqual({ day: "2001-01-01", sales: [] });
	});

	it("rejects a bad date", async () => {
		expect((await list("?date=soon")).status).toBe(400);
	});
});
