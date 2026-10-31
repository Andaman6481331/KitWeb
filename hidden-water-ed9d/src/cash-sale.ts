// Walk-in cash sales from the admin Cash Sale page. Pure checks and formatting live here
// so they can be tested without a database; the routes in index.ts do the reads and writes.
//
// The Worker works out the total from the lines itself. The page's total is never trusted.

export const MAX_LINES = 200;
const MAX_NAME = 120;
const MAX_NOTE = 500;
const MAX_PRICE = 1_000_000;
const MAX_QTY = 10_000;
const MAX_MONEY = 10_000_000;

export interface CashSaleLine {
	name: string;
	nameEn: string | null;
	price: number;
	qty: number;
	isCustom: boolean;
}

export interface CashSaleInput {
	clientId: string;
	lines: CashSaleLine[];
	received: number | null;
	note: string;
	copyLang: "th" | "en";
	total: number;
	pieces: number;
}

export type ParsedCashSale = { ok: true; sale: CashSaleInput } | { ok: false; error: string };

const cents = (n: number) => Math.round(n * 100) / 100;

const text = (value: unknown, max: number): string =>
	(typeof value === "string" ? value : "").replace(/\s+/g, " ").trim().slice(0, max);

export function parseCashSale(body: any): ParsedCashSale {
	const clientId = typeof body?.client_id === "string" ? body.client_id.trim() : "";
	if (!/^[A-Za-z0-9-]{8,64}$/.test(clientId)) {
		return { ok: false, error: "client_id is required (8-64 letters, digits or dashes)" };
	}

	const rawItems = Array.isArray(body?.items) ? body.items : [];
	if (rawItems.length === 0) return { ok: false, error: "No items" };
	if (rawItems.length > MAX_LINES) return { ok: false, error: `At most ${MAX_LINES} lines per sale` };

	const lines: CashSaleLine[] = [];
	for (const [i, raw] of rawItems.entries()) {
		const name = text(raw?.name, MAX_NAME);
		const price = Number(raw?.price);
		const qty = Number(raw?.qty);
		if (!name) return { ok: false, error: `Item ${i + 1}: name is required` };
		if (!Number.isFinite(price) || price <= 0 || price > MAX_PRICE) {
			return { ok: false, error: `Item ${i + 1}: price must be above 0 and at most ${MAX_PRICE}` };
		}
		if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
			return { ok: false, error: `Item ${i + 1}: quantity must be a whole number from 1 to ${MAX_QTY}` };
		}
		lines.push({
			name,
			nameEn: text(raw?.name_en, MAX_NAME) || null,
			price: cents(price),
			qty,
			isCustom: raw?.custom === true
		});
	}

	const total = cents(lines.reduce((sum, l) => sum + cents(l.price * l.qty), 0));
	if (total > MAX_MONEY) return { ok: false, error: "Sale total is too large" };

	const received = Number(body?.received);
	return {
		ok: true,
		sale: {
			clientId,
			lines,
			received: body?.received != null && Number.isFinite(received) && received >= 0 && received <= MAX_MONEY
				? cents(received) : null,
			note: text(body?.note, MAX_NOTE),
			copyLang: body?.copy_lang === "en" ? "en" : "th",
			total,
			pieces: lines.reduce((sum, l) => sum + l.qty, 0)
		}
	};
}

// The shop is in Thailand, which has no daylight saving: UTC+7 all year.
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const pad2 = (n: number) => String(n).padStart(2, "0");

// INV-YYMMDD-XXXXXX: the Bangkok date of the sale and the start of its id.
export function cashSaleRef(soldAt: Date, id: string): string {
	const local = new Date(soldAt.getTime() + BANGKOK_OFFSET_MS);
	return `INV-${pad2(local.getUTCFullYear() % 100)}${pad2(local.getUTCMonth() + 1)}${pad2(local.getUTCDate())}`
		+ `-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

// The UTC span of one Bangkok calendar day ("YYYY-MM-DD", or today when omitted).
// Returns null for text that is not a real date.
export function bangkokDay(day: string | null, now: Date = new Date()): { day: string; from: string; to: string } | null {
	let label = day;
	if (!label) {
		const local = new Date(now.getTime() + BANGKOK_OFFSET_MS);
		label = `${local.getUTCFullYear()}-${pad2(local.getUTCMonth() + 1)}-${pad2(local.getUTCDate())}`;
	}
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(label);
	if (!m) return null;
	const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
	const start = Date.UTC(y, mo - 1, d);
	const check = new Date(start);
	if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
	const from = start - BANGKOK_OFFSET_MS;
	return { day: label, from: new Date(from).toISOString(), to: new Date(from + 24 * 60 * 60 * 1000).toISOString() };
}

// ---- storage (cash_sales / cash_sale_items, migrations/0025_cash_sales.sql) -----------------

export interface CashSaleItemRow {
	name: string;
	name_en: string | null;
	unit_price: number;
	quantity: number;
	line_total: number;
	is_custom: number;
}

export interface CashSaleRecord {
	id: string;
	invoice_ref: string;
	sold_at: string;
	total_amount: number;
	piece_count: number;
	received_amount: number | null;
	note: string | null;
	copy_lang: string;
	items: CashSaleItemRow[];
}

const SALE_COLUMNS = "id, invoice_ref, sold_at, total_amount, piece_count, received_amount, note, copy_lang";

async function findByClientId(db: D1Database, clientId: string): Promise<CashSaleRecord | null> {
	const sale = await db.prepare(`SELECT ${SALE_COLUMNS} FROM cash_sales WHERE client_id = ?`)
		.bind(clientId).first<Omit<CashSaleRecord, "items">>();
	if (!sale) return null;
	const items = await db.prepare(
		`SELECT name, name_en, unit_price, quantity, line_total, is_custom
		 FROM cash_sale_items WHERE sale_id = ? ORDER BY line_no`
	).bind(sale.id).all<CashSaleItemRow>();
	return { ...sale, items: items.results };
}

// Saves a sale and its lines together. A sale sent again with the same client_id (a retry
// after a dropped connection) comes back as the one already saved instead of a second sale.
export async function saveCashSale(
	db: D1Database, sale: CashSaleInput, now: Date = new Date()
): Promise<{ record: CashSaleRecord; created: boolean }> {
	const found = await findByClientId(db, sale.clientId);
	if (found) return { record: found, created: false };

	const id = crypto.randomUUID();
	try {
		await db.batch([
			db.prepare(
				`INSERT INTO cash_sales
				 (id, client_id, invoice_ref, sold_at, total_amount, line_count, piece_count, received_amount, note, copy_lang)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			).bind(id, sale.clientId, cashSaleRef(now, id), now.toISOString(), sale.total, sale.lines.length,
				sale.pieces, sale.received, sale.note || null, sale.copyLang),
			...sale.lines.map((l, i) => db.prepare(
				`INSERT INTO cash_sale_items (sale_id, line_no, name, name_en, unit_price, quantity, line_total, is_custom)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
			).bind(id, i + 1, l.name, l.nameEn, l.price, l.qty, cents(l.price * l.qty), l.isCustom ? 1 : 0))
		]);
	} catch (e) {
		// Two requests with one client_id at once: the other one won, so return its sale.
		const raced = await findByClientId(db, sale.clientId);
		if (raced) return { record: raced, created: false };
		throw e;
	}
	return { record: (await findByClientId(db, sale.clientId))!, created: true };
}

// Sales saved between two instants (ISO strings), newest first.
export async function listCashSales(db: D1Database, from: string, to: string): Promise<CashSaleRecord[]> {
	const sales = await db.prepare(
		`SELECT ${SALE_COLUMNS} FROM cash_sales WHERE sold_at >= ? AND sold_at < ? ORDER BY sold_at DESC LIMIT 500`
	).bind(from, to).all<Omit<CashSaleRecord, "items">>();
	const items = await db.prepare(
		`SELECT i.sale_id, i.name, i.name_en, i.unit_price, i.quantity, i.line_total, i.is_custom
		 FROM cash_sale_items i JOIN cash_sales s ON s.id = i.sale_id
		 WHERE s.sold_at >= ? AND s.sold_at < ? ORDER BY i.sale_id, i.line_no`
	).bind(from, to).all<CashSaleItemRow & { sale_id: string }>();
	const bySale = new Map<string, CashSaleItemRow[]>();
	for (const { sale_id, ...item } of items.results) {
		bySale.set(sale_id, [...(bySale.get(sale_id) ?? []), item]);
	}
	return sales.results.map((s) => ({ ...s, items: bySale.get(s.id) ?? [] }));
}
