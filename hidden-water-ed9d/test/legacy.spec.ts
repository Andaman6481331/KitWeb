import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { ADMIN_TEST_TOKEN, resetDb } from "./helpers/db";

const AUTH = { "Authorization": ADMIN_TEST_TOKEN };
const get = (path: string, headers: Record<string, string> = AUTH) =>
	SELF.fetch(`https://example.com${path}`, { headers });

async function seed() {
	const db = env.DB;
	await db.batch([
		db.prepare("INSERT INTO legacy_customers (id, access_ref, name, phone, address, line_note) VALUES ('LC-1','1','ร้านเอ','081','12 ถ.สุข','LINE Official')"),
		db.prepare("INSERT INTO legacy_customers (id, access_ref, name) VALUES ('LC-2','2','ร้านบี')"),
		db.prepare("INSERT INTO legacy_products (id, access_ref, name, group_name) VALUES ('LP-a','{A}','เข็มควัก','เข็ม - ควัก')"),
		db.prepare("INSERT INTO legacy_invoices (id, order_no, customer_id, customer_name, sold_on, paid, access_type, total, line_count) VALUES ('LI-1-20260801-1','1','LC-1','ร้านเอ','2026-08-01',1,'Order',250,2)"),
		db.prepare("INSERT INTO legacy_invoices (id, order_no, customer_id, customer_name, sold_on, paid, access_type, total, line_count) VALUES ('LI-2-20260901-1','2','LC-1','ร้านเอ','2026-09-01',0,'Order',100,1)"),
		db.prepare("INSERT INTO legacy_invoices (id, order_no, customer_id, customer_name, sold_on, paid, total, line_count) VALUES ('LI-3-20260905-1','3',NULL,'ชื่อไม่ตรง','2026-09-05',1,40,1)"),
		db.prepare("INSERT INTO legacy_invoice_lines (access_id, invoice_id, line_no, product_name, unit, qty, unit_price, line_total, line_kind, paid, legacy_product_id) VALUES (10,'LI-1-20260801-1',1,'เข็มควัก','โหล',2,100,200,'product',1,'LP-a')"),
		db.prepare("INSERT INTO legacy_invoice_lines (access_id, invoice_id, line_no, product_name, unit, qty, unit_price, line_total, line_kind, paid) VALUES (11,'LI-1-20260801-1',2,'ไหมพรม นก no.1','ห่อ',1,50,50,'product',1)"),
		db.prepare("INSERT INTO legacy_invoice_lines (access_id, invoice_id, line_no, product_name, unit, qty, unit_price, line_total, line_kind, paid) VALUES (12,'LI-2-20260901-1',1,'เข็มควัก','โหล',1,100,100,'product',0)"),
		db.prepare("INSERT INTO legacy_invoice_lines (access_id, invoice_id, line_no, product_name, unit, qty, unit_price, line_total, line_kind, paid) VALUES (13,'LI-3-20260905-1',1,'จ่ายก่อน','บิล',1,40,40,'adjustment',1)"),
	]);
}

describe("legacy routes", () => {
	beforeEach(async () => { await resetDb(); await seed(); });

	it.each(["/legacy/customers", "/legacy/customers/LC-1", "/legacy/invoices", "/legacy/invoices/LI-1-20260801-1"])(
		"%s needs an admin session", async (path) => {
			expect((await get(path, {})).status).toBe(401);
		});

	it("lists customers with orders, spent, outstanding and last order", async () => {
		const rows: any[] = await (await get("/legacy/customers")).json();
		const a = rows.find((r) => r.id === "LC-1");
		expect(a).toMatchObject({ name: "ร้านเอ", phone: "081", orders: 2, spent: 350, outstanding: 100, last_order_on: "2026-09-01" });
		expect(rows.find((r) => r.id === "LC-2")).toMatchObject({ orders: 0, spent: 0, outstanding: 0, last_order_on: null });
	});

	it("returns a customer with their invoices and top products, adjustments excluded", async () => {
		const res = await get("/legacy/customers/LC-1");
		expect(res.status).toBe(200);
		const body: any = await res.json();
		expect(body.customer).toMatchObject({ id: "LC-1", address: "12 ถ.สุข", line_note: "LINE Official", status: "unverified" });
		expect(body.invoices.map((i: any) => i.order_no)).toEqual(["2", "1"]);
		expect(body.top_products[0]).toMatchObject({ product_name: "เข็มควัก", unit: "โหล", lines: 2, qty: 3 });
		expect(body.top_products).toHaveLength(2);
	});

	it("lists invoices newest first and filters by text and paid state", async () => {
		const all: any[] = await (await get("/legacy/invoices")).json();
		expect(all.map((i) => i.order_no)).toEqual(["3", "2", "1"]);
		expect(all[0]).toMatchObject({ customer_id: null, customer_name: "ชื่อไม่ตรง", paid: 1, total: 40 });
		const unpaid: any[] = await (await get("/legacy/invoices?paid=unpaid")).json();
		expect(unpaid.map((i) => i.order_no)).toEqual(["2"]);
		const byName: any[] = await (await get(`/legacy/invoices?q=${encodeURIComponent("เอ")}`)).json();
		expect(byName.map((i) => i.order_no)).toEqual(["2", "1"]);
		const byNo: any[] = await (await get("/legacy/invoices?q=3")).json();
		expect(byNo.map((i) => i.order_no)).toEqual(["3"]);
	});

	it("returns an invoice with its lines in order and the linked product group", async () => {
		const body: any = await (await get("/legacy/invoices/LI-1-20260801-1")).json();
		expect(body.invoice).toMatchObject({ order_no: "1", paid: 1, total: 250 });
		expect(body.lines.map((l: any) => l.product_name)).toEqual(["เข็มควัก", "ไหมพรม นก no.1"]);
		expect(body.lines[0]).toMatchObject({ unit: "โหล", qty: 2, line_total: 200, group_name: "เข็ม - ควัก", line_kind: "product" });
		expect(body.lines[1].group_name).toBeNull();
	});

	it("returns 404 for unknown ids and accepts no writes", async () => {
		expect((await get("/legacy/invoices/nope")).status).toBe(404);
		expect((await get("/legacy/customers/nope")).status).toBe(404);
		const post = await SELF.fetch("https://example.com/legacy/invoices", { method: "POST", headers: AUTH, body: "{}" });
		expect(post.status).not.toBe(200);
		expect(post.status).not.toBe(201);
	});
});
