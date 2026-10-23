import { env } from "cloudflare:test";

// Explicit DDL rather than applyD1Migrations: migrations/ has duplicate numeric
// prefixes (0002, 0013, 0014, 0015 each appear twice), so migration order is
// ambiguous. These are the only tables the business-set endpoints touch.
const DDL = [
	`CREATE TABLE IF NOT EXISTS products (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL, description TEXT, price REAL DEFAULT 0.0,
		image_key TEXT, category TEXT, stock INTEGER DEFAULT 0,
		usage TEXT, use_for TEXT, varieties TEXT, sizes TEXT, colors TEXT,
		price_1 REAL, price_2 REAL, price_3 REAL, price_4 REAL, price_5 REAL,
		name_th TEXT, sku TEXT UNIQUE, moq TEXT,
		is_visible INTEGER DEFAULT 1,
		archived_at TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	)`,
	`CREATE TABLE IF NOT EXISTS product_images (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		product_id INTEGER NOT NULL, image_key TEXT,
		attribute_type TEXT, attribute_value TEXT, is_main INTEGER DEFAULT 0,
		price_1 REAL, price_2 REAL, price_3 REAL, price_4 REAL, price_5 REAL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	)`,
	`CREATE TABLE IF NOT EXISTS product_categories (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		product_id INTEGER NOT NULL, category_path TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(product_id, category_path)
	)`,
	`CREATE TABLE IF NOT EXISTS categories (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL, name_th TEXT, path TEXT NOT NULL,
		default_usage TEXT, default_use_for TEXT
	)`,
	`CREATE TABLE IF NOT EXISTS product_variants (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		product_id INTEGER NOT NULL, variant_name TEXT NOT NULL, sku TEXT UNIQUE NOT NULL,
		price_1 REAL DEFAULT 0.0, price_2 REAL DEFAULT 0.0, price_3 REAL DEFAULT 0.0,
		price_4 REAL DEFAULT 0.0, price_5 REAL DEFAULT 0.0,
		stock INTEGER DEFAULT 0, image_key TEXT
	)`,
	`CREATE TABLE IF NOT EXISTS product_sets (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL, name_th TEXT, slug TEXT NOT NULL UNIQUE,
		cover_image_key TEXT, description TEXT, description_th TEXT,
		price_tier INTEGER DEFAULT 1, discount_pct REAL DEFAULT 0,
		is_published INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	)`,
	`CREATE TABLE IF NOT EXISTS product_set_items (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		set_id INTEGER NOT NULL, product_id INTEGER NOT NULL, variant_id INTEGER,
		quantity INTEGER NOT NULL, sort_order INTEGER DEFAULT 0,
		FOREIGN KEY (set_id) REFERENCES product_sets(id) ON DELETE CASCADE
	)`,
	`CREATE TABLE IF NOT EXISTS diy_products (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL, name_th TEXT,
		price_1 REAL DEFAULT 0.0, price_2 REAL DEFAULT 0.0, price_3 REAL DEFAULT 0.0,
		description TEXT, images TEXT, stock INTEGER DEFAULT 0, sku TEXT UNIQUE,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	)`,
	`CREATE TABLE IF NOT EXISTS orders (
		id TEXT PRIMARY KEY,
		customer_name TEXT, total_amount REAL, status TEXT DEFAULT 'PENDING',
		payment_method TEXT, note TEXT, tracking_number TEXT,
		line_push_failed INTEGER DEFAULT 0, customer_id TEXT, phone_number TEXT,
		shipping_address TEXT, slip_url TEXT, line_user_id TEXT,
		line_display_name TEXT, slip_transaction_ref TEXT,
		contact_confirmed_at DATETIME, contact_confirmed_via TEXT,
		delivery_fee REAL, view_key TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	)`,
	`CREATE TABLE IF NOT EXISTS order_items (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		order_id TEXT, product_id INTEGER, product_name TEXT,
		size TEXT, color TEXT, quantity INTEGER, price REAL,
		FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
	)`
];

const TABLES = [
	"order_items", "orders", "diy_products",
	"product_set_items", "product_sets", "product_variants", "product_images",
	"product_categories", "categories", "products", "admin_sessions"
];

// Raw bearer token for protected routes in tests. resetDb() stores its hash as a live
// session, so each test starts already signed in. Admin login itself is covered in
// admin-session.spec.ts.
export const ADMIN_TEST_TOKEN = "test-admin-session";

async function sha256Hex(input: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function resetDb(): Promise<void> {
	for (const table of TABLES) {
		await env.DB.prepare(`DROP TABLE IF EXISTS ${table}`).run();
	}
	for (const ddl of DDL) {
		await env.DB.prepare(ddl).run();
	}
	await env.DB.prepare(
		`CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL)`
	).run();
	await env.DB.prepare("INSERT INTO admin_sessions (token_hash, expires_at) VALUES (?, ?)")
		.bind(await sha256Hex(ADMIN_TEST_TOKEN), Date.now() + 60 * 60 * 1000).run();
}

export interface ProductSeed {
	name: string; name_th: string | null; sku: string; moq: string;
	price_1: number; price_2: number; price_3: number;
	is_visible: number; image_key: string | null;
}

export async function seedProduct(p: Partial<ProductSeed> = {}): Promise<number> {
	const row = {
		name: "Test Product", name_th: null, sku: `SKU-${Math.random().toString(36).slice(2, 9)}`,
		moq: "20 pcs", price_1: 800, price_2: 0, price_3: 0, is_visible: 1, image_key: null,
		...p
	};
	const res = await env.DB.prepare(
		`INSERT INTO products (name, name_th, sku, moq, price_1, price_2, price_3, is_visible, image_key)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).bind(row.name, row.name_th, row.sku, row.moq, row.price_1, row.price_2, row.price_3,
		row.is_visible, row.image_key).run();
	return Number(res.meta.last_row_id);
}

// /order/submit prices from the tier columns (price_1..3) divided by MOQ — the same
// per-piece maths the storefront displays. This helper takes the price a customer
// actually sees per piece and derives the stored box price from it. Pass null to
// model a product whose price hasn't been uploaded yet.
export async function seedOrderableProduct(perPiece: number | null, moq = 1): Promise<number> {
	return await seedProduct({
		moq: String(moq),
		price_1: perPiece === null ? 0 : perPiece * moq,
		price_2: 0,
		price_3: 0
	});
}

export async function getOrder(orderId: string): Promise<any> {
	return await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first();
}

export async function getOrderItems(orderId: string): Promise<any[]> {
	const res = await env.DB.prepare(
		"SELECT * FROM order_items WHERE order_id = ? ORDER BY id"
	).bind(orderId).all();
	return res.results as any[];
}
