import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { ADMIN_TEST_TOKEN, resetDb, seedProduct } from "./helpers/db";
import { isCatalogWrite } from "../src/catalog-version";

const AUTH = { "Content-Type": "application/json", "Authorization": ADMIN_TEST_TOKEN };
const NO_AUTH = { "Content-Type": "application/json" };

const get = (path: string, headers: Record<string, string> = {}) =>
	SELF.fetch(`https://example.com${path}`, { headers });

const post = (path: string, body: any, headers: Record<string, string> = AUTH) =>
	SELF.fetch(`https://example.com${path}`, { method: "POST", headers, body: JSON.stringify(body) });

async function version(): Promise<number | null> {
	return ((await (await get("/catalog-version")).json()) as any).version;
}

// resetDb() only builds the product tables. These two are only read here, and only
// their headers matter, so the bare minimum of columns is enough.
async function resetContentTables() {
	await env.DB.prepare("DROP TABLE IF EXISTS gallery").run();
	await env.DB.prepare("DROP TABLE IF EXISTS projects").run();
	await env.DB.prepare(
		`CREATE TABLE gallery (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER, project_id INTEGER,
			is_visible INTEGER, sort_order INTEGER DEFAULT 0)`
	).run();
	await env.DB.prepare(
		`CREATE TABLE projects (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT, product_ids TEXT,
			is_featured INTEGER, is_published INTEGER, published_at TEXT)`
	).run();
}

describe("GET /catalog-version", () => {
	beforeEach(resetDb);

	it("is public and never cached, since it is what makes the cached reads fresh", async () => {
		const res = await get("/catalog-version");
		expect(res.status).toBe(200);
		expect(res.headers.get("Cache-Control")).toBe("no-store");
		expect(await res.json()).toEqual({ version: 1 });
	});

	it("reports null until the migration has created the table", async () => {
		await env.DB.prepare("DROP TABLE catalog_version").run();
		const res = await get("/catalog-version");
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ version: null });
	});
});

describe("the catalogue version", () => {
	beforeEach(resetDb);

	it("rises by one after a successful admin write", async () => {
		const id = await seedProduct();
		const res = await post("/products/visibility", { ids: [id], is_visible: false });
		expect(res.status).toBe(200);
		expect(await version()).toBe(2);
	});

	it("rises again for every write, so no two states share a number", async () => {
		const id = await seedProduct();
		await post("/products/visibility", { ids: [id], is_visible: false });
		await post("/products/visibility", { ids: [id], is_visible: true });
		expect(await version()).toBe(3);
	});

	it("stays put when the write is refused", async () => {
		const id = await seedProduct();
		const unauthorised = await post("/products/visibility", { ids: [id], is_visible: false }, NO_AUTH);
		const malformed = await post("/products/visibility", { ids: [], is_visible: false });
		expect(unauthorised.status).toBe(401);
		expect(malformed.status).toBe(400);
		expect(await version()).toBe(1);
	});

	it("stays put on reads, including the admin ones", async () => {
		await seedProduct();
		await get("/products");
		await get("/products?include_hidden=1", { Authorization: ADMIN_TEST_TOKEN });
		await get("/catalog-version");
		expect(await version()).toBe(1);
	});

	it("never fails an admin write because the table is missing", async () => {
		const id = await seedProduct();
		await env.DB.prepare("DROP TABLE catalog_version").run();
		const res = await post("/products/visibility", { ids: [id], is_visible: false });
		expect(res.status).toBe(200);
		const row = await env.DB.prepare("SELECT is_visible FROM products WHERE id = ?").bind(id).first() as any;
		expect(row.is_visible).toBe(0);
	});
});

describe("isCatalogWrite", () => {
	it.each([
		["POST", "/products"],
		["PUT", "/products/12"],
		["DELETE", "/products/12"],
		["POST", "/products/visibility"],
		["POST", "/products/archive"],
		["POST", "/products/backfill-slugs"],
		["POST", "/projects"],
		["POST", "/projects/delete"],
		["POST", "/gallery"],
		["POST", "/gallery/delete"],
	])("%s %s changes what the storefront shows", (method, path) => {
		expect(isCatalogWrite(method, path)).toBe(true);
	});

	it.each([
		["GET", "/products"],
		["GET", "/projects/some-post"],
		["HEAD", "/gallery"],
		["OPTIONS", "/products"],
		["POST", "/order/submit"],
		["POST", "/orders/status"],
		["POST", "/upload"],
		["POST", "/categories"],
		["POST", "/productsx"],
		["POST", "/gallery-extra"],
	])("%s %s does not", (method, path) => {
		expect(isCatalogWrite(method, path)).toBe(false);
	});
});

describe("GET /products cache headers", () => {
	beforeEach(resetDb);

	it("lets the browser keep a versioned URL for an hour", async () => {
		const res = await get("/products?v=7");
		expect(res.headers.get("Cache-Control")).toBe("public, max-age=3600");
	});

	it("tells the cache the answer depends on who is asking, because CORS echoes the Origin", async () => {
		const res = await get("/products?v=7", { Origin: "https://kitcharoensampeng.com" });
		expect(res.headers.get("Vary")).toContain("Origin");
		expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://kitcharoensampeng.com");
	});

	it("keeps the old 30 second window for callers that send no version", async () => {
		const res = await get("/products");
		expect(res.headers.get("Cache-Control")).toBe("public, max-age=30");
		expect(res.headers.get("Vary")).toContain("Origin");
	});

	it.each(["abc", "", "7;x", "-1", "99999999999999999999"])("does not trust v=%j", async (v) => {
		const res = await get(`/products?v=${encodeURIComponent(v)}`);
		expect(res.headers.get("Cache-Control")).toBe("public, max-age=30");
	});

	it("never caches the admin list, version or not", async () => {
		const res = await get("/products?include_hidden=1&v=7", { Authorization: ADMIN_TEST_TOKEN });
		expect(res.status).toBe(200);
		expect(res.headers.get("Cache-Control")).toBeNull();
	});
});

describe("GET /gallery and /projects cache headers", () => {
	beforeEach(async () => {
		await resetDb();
		await resetContentTables();
	});

	it.each(["/gallery", "/projects"])("%s is cached for an hour only when versioned", async (path) => {
		expect((await get(`${path}?v=3`)).headers.get("Cache-Control")).toBe("public, max-age=3600");
		expect((await get(path)).headers.get("Cache-Control")).toBeNull();
	});

	it.each([
		["/gallery?include_hidden=1&v=3"],
		["/projects?include_unpublished=1&v=3"],
	])("%s is never cached, since it is the admin view", async (path) => {
		const res = await get(path, { Authorization: ADMIN_TEST_TOKEN });
		expect(res.status).toBe(200);
		expect(res.headers.get("Cache-Control")).toBeNull();
	});

	it("caches a single project by its versioned URL, and an unknown one not at all", async () => {
		await env.DB.prepare("INSERT INTO projects (slug, product_ids, is_featured, is_published) VALUES ('hello', '[]', 0, 1)").run();

		const found = await get("/projects/hello?v=3");
		expect(found.status).toBe(200);
		expect(found.headers.get("Cache-Control")).toBe("public, max-age=3600");

		const missing = await get("/projects/nope?v=3");
		expect(missing.status).toBe(404);
		expect(missing.headers.get("Cache-Control")).toBeNull();
	});
});
