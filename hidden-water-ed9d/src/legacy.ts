// Read-only queries over the Access history imported by legacy-import/ (tables from migration
// 0027). There is deliberately no write function here: legacy rows are history, never edited.

const MAX_INVOICES = 5000;

export async function listLegacyCustomers(db: D1Database) {
	const { results } = await db.prepare(
		`SELECT c.id, c.name, c.phone, c.status,
		        COUNT(i.id) AS orders,
		        COALESCE(SUM(i.total), 0) AS spent,
		        COALESCE(SUM(CASE WHEN i.paid = 0 THEN i.total ELSE 0 END), 0) AS outstanding,
		        MAX(i.sold_on) AS last_order_on
		 FROM legacy_customers c
		 LEFT JOIN legacy_invoices i ON i.customer_id = c.id
		 WHERE c.status <> 'archived'
		 GROUP BY c.id
		 ORDER BY c.name, c.id`
	).all();
	return results;
}

export async function getLegacyCustomer(db: D1Database, id: string) {
	const customer = await db.prepare("SELECT * FROM legacy_customers WHERE id = ?").bind(id).first();
	if (!customer) return null;
	const [invoices, topProducts] = await Promise.all([
		db.prepare(
			`SELECT id, order_no, sold_on, paid, total, line_count
			 FROM legacy_invoices WHERE customer_id = ? ORDER BY sold_on DESC, id DESC`
		).bind(id).all(),
		db.prepare(
			`SELECT l.product_name, l.unit, COUNT(*) AS lines, SUM(l.qty) AS qty
			 FROM legacy_invoice_lines l
			 JOIN legacy_invoices i ON i.id = l.invoice_id
			 WHERE i.customer_id = ? AND l.line_kind = 'product'
			 GROUP BY l.product_name, l.unit
			 ORDER BY lines DESC, qty DESC, l.product_name
			 LIMIT 20`
		).bind(id).all(),
	]);
	return { customer, invoices: invoices.results, top_products: topProducts.results };
}

export async function listLegacyInvoices(db: D1Database, filters: { q?: string | null; paid?: string | null }) {
	const where: string[] = [];
	const binds: unknown[] = [];
	const q = (filters.q ?? "").trim().slice(0, 100);
	if (q) {
		where.push("(order_no = ? OR customer_name LIKE ? ESCAPE '\\')");
		binds.push(q, `%${q.replace(/[\\%_]/g, "\\$&")}%`);
	}
	if (filters.paid === "paid") where.push("paid = 1");
	if (filters.paid === "unpaid") where.push("paid = 0");
	const { results } = await db.prepare(
		`SELECT id, order_no, customer_id, customer_name, sold_on, paid, total, line_count, access_type
		 FROM legacy_invoices ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
		 ORDER BY sold_on DESC, id DESC LIMIT ${MAX_INVOICES}`
	).bind(...binds).all();
	return results;
}

export async function getLegacyInvoice(db: D1Database, id: string) {
	const invoice = await db.prepare("SELECT * FROM legacy_invoices WHERE id = ?").bind(id).first();
	if (!invoice) return null;
	const { results } = await db.prepare(
		`SELECT l.id, l.line_no, l.product_name, l.unit, l.qty, l.unit_price, l.line_total, l.line_kind, l.paid,
		        l.legacy_product_id, p.group_name
		 FROM legacy_invoice_lines l
		 LEFT JOIN legacy_products p ON p.id = l.legacy_product_id
		 WHERE l.invoice_id = ? ORDER BY l.line_no`
	).bind(id).all();
	return { invoice, lines: results };
}
