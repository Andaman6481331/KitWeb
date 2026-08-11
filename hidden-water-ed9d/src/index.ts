/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

interface Env {
	DB: D1Database;
	IMAGES: R2Bucket;
	WEB_UTILS: R2Bucket;
	KIT_IMAGE: R2Bucket;
	SLIPS: R2Bucket;
	AI: any;
	LINE_CHANNEL_ACCESS_TOKEN?: string;
	LINE_NOTIFY_TOKEN?: string;
	LINE_USER_ID?: string;
	LINE_LOGIN_CHANNEL_ID?: string;
	LINE_LOGIN_CHANNEL_SECRET?: string;
	EASYSLIP_API_KEY?: string;
	PROMPTPAY_ACCOUNT?: string;
	// Feature flag: "true" turns on EasySlip slip verification. Unset/other = off (manual payment via LINE OA).
	SLIP_VERIFICATION_ENABLED?: string;
	ADMIN_PASSWORD?: string;
	JWT_SECRET?: string;
}

// Password hashing helper using Web Crypto API
async function hashPassword(password: string): Promise<string> {
	const msgBuffer = new TextEncoder().encode(password);
	const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function getSkuPrefix(category: string): string {
	const parts = (category || "UK").trim().split(/\s+/);
	if (parts.length >= 2) {
		return (parts[0][0] + parts[1][0]).toUpperCase();
	}
	return (category || "UK").substring(0, 2).toUpperCase().padEnd(2, 'X');
}

function formatProductSku(prefix: string, sequence: number): string {
	return `${prefix}${sequence.toString().padStart(3, '0')}`;
}

/**
 * Build a URL slug for a product.
 *
 * The storefront used to do this in the browser, but its regex stripped every
 * non-ASCII character, so a Thai-only name produced a bare "-42". Product URLs are
 * prerendered now, so we fall back through name -> sku -> id until something
 * usable survives.
 */
function generateProductSlug(name: string | null, sku: string | null, id: number | string): string {
	const ascii = (name || "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	if (ascii) return `${ascii}-${id}`;

	const skuPart = (sku || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
	if (skuPart) return `${skuPart}-${id}`;

	return `product-${id}`;
}

/** Slug for editorial content. Falls back to a dated stub when the title is non-Latin. */
function generateProjectSlug(title: string, id?: number | string): string {
	const ascii = (title || "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	if (ascii) return id ? `${ascii}-${id}` : ascii;
	return `project-${id ?? Date.now()}`;
}

/** Parse the projects.product_ids JSON column into a number array, tolerating bad data. */
function parseProductIds(raw: any): number[] {
	if (Array.isArray(raw)) return raw.map(Number).filter((n) => Number.isFinite(n));
	if (typeof raw !== "string" || !raw.trim()) return [];
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed.map(Number).filter((n) => Number.isFinite(n)) : [];
	} catch {
		return [];
	}
}

/** Shape a raw projects row for the API. */
function mapProjectRow(row: any) {
	return {
		...row,
		product_ids: parseProductIds(row.product_ids),
		is_featured: Number(row.is_featured) === 1,
		is_published: row.is_published === null || row.is_published === undefined ? true : Number(row.is_published) === 1
	};
}

/** Shape a raw spotlights row for the API. */
function mapSpotlightRow(row: any) {
	return {
		...row,
		product_ids: parseProductIds(row.product_ids),
		is_active: Number(row.is_active) === 1
	};
}

/** Shape a raw gallery row for the API. */
function mapGalleryRow(row: any) {
	return {
		...row,
		product_id: row.product_id === null || row.product_id === undefined ? null : Number(row.product_id),
		project_id: row.project_id === null || row.project_id === undefined ? null : Number(row.project_id),
		is_visible: row.is_visible === null || row.is_visible === undefined ? true : Number(row.is_visible) === 1
	};
}

/**
 * Parse the events.gallery JSON column into a media array, dropping anything that
 * is not a usable {type, src} pair rather than letting it reach the template.
 */
function parseEventGallery(raw: any): any[] {
	const list = Array.isArray(raw) ? raw : (() => {
		if (typeof raw !== "string" || !raw.trim()) return [];
		try {
			const parsed = JSON.parse(raw);
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	})();

	return list
		.filter((m: any) => m && typeof m.src === "string" && m.src.trim())
		.map((m: any) => ({
			type: m.type === "video" ? "video" : "image",
			src: String(m.src).trim(),
			title: typeof m.title === "string" ? m.title : ""
		}));
}

/** Shape a raw events row for the API. */
function mapEventRow(row: any) {
	return {
		...row,
		gallery: parseEventGallery(row.gallery),
		is_upcoming: Number(row.is_upcoming) === 1,
		is_visible: row.is_visible === null || row.is_visible === undefined ? true : Number(row.is_visible) === 1
	};
}

/** Allocate the next unused base product SKU for a category prefix (e.g. tools -> TO001). */
async function allocateProductSku(env: Env, category: string, preferredSku?: string | null): Promise<string> {
	if (preferredSku) {
		const taken = await env.DB.prepare("SELECT id FROM products WHERE sku = ?").bind(preferredSku).first();
		if (!taken) return preferredSku;
	}

	const prefix = getSkuPrefix(category);
	const { results } = await env.DB.prepare(
		"SELECT sku FROM products WHERE sku GLOB ?"
	).bind(`${prefix}[0-9][0-9][0-9]`).all();

	let maxSequence = 0;
	const pattern = new RegExp(`^${prefix}(\\d{3})$`);
	for (const row of results) {
		const match = String(row.sku).match(pattern);
		if (match) {
			maxSequence = Math.max(maxSequence, parseInt(match[1], 10));
		}
	}

	for (let seq = maxSequence + 1; seq <= maxSequence + 1000; seq++) {
		const candidate = formatProductSku(prefix, seq);
		const taken = await env.DB.prepare("SELECT id FROM products WHERE sku = ?").bind(candidate).first();
		if (!taken) return candidate;
	}

	throw new Error("Unable to allocate a unique SKU");
}

function generateDiySKU(count: number): string {
	const prefix = "diyset";
	let suffix = "";
	let temp = count;
	while (temp >= 0) {
		suffix = String.fromCharCode((temp % 26) + 97) + suffix;
		temp = Math.floor(temp / 26) - 1;
	}
	return `${prefix}${suffix}`;
}

function parseRange(encoded: string | null, size: number) {
	if (encoded === null) return null;
	const parts = encoded.split("bytes=")[1]?.split("-");
	if (!parts) return null;
	const start = parseInt(parts[0], 10);
	const end = parseInt(parts[1], 10) || size - 1;
	
	if (isNaN(start)) return null;
	
	return { 
		offset: start, 
		length: end - start + 1 
	};
}

function r2KeysForImageKey(imageKey: string): string[] {
	if (!imageKey || imageKey.startsWith("http")) return [];

	if (imageKey.includes(".")) {
		const base = imageKey.replace(/\.[^.]+$/, "");
		return [imageKey, `${base}.webp`, `${base}.avif`];
	}

	return [`${imageKey}-large.webp`, `${imageKey}-thumb.webp`];
}

async function deleteR2Images(bucket: R2Bucket, imageKeys: Iterable<string>) {
	const objectKeys = new Set<string>();
	for (const key of imageKeys) {
		for (const r2Key of r2KeysForImageKey(key)) {
			objectKeys.add(r2Key);
		}
	}
	await Promise.all([...objectKeys].map((key) => bucket.delete(key)));
}

async function collectProductImageKeys(env: Env, productId: string): Promise<Set<string>> {
	const keys = new Set<string>();

	const product = await env.DB.prepare("SELECT image_key FROM products WHERE id = ?").bind(productId).first() as any;
	if (product?.image_key) keys.add(product.image_key);

	const { results: galleryImages } = await env.DB.prepare(
		"SELECT image_key FROM product_images WHERE product_id = ?"
	).bind(productId).all();
	for (const img of galleryImages) {
		if (img.image_key) keys.add(img.image_key as string);
	}

	const { results: variants } = await env.DB.prepare(
		"SELECT image_key FROM product_variants WHERE product_id = ?"
	).bind(productId).all();
	for (const variant of variants) {
		if (variant.image_key) keys.add(variant.image_key as string);
	}

	const { results: colors } = await env.DB.prepare(
		`SELECT vc.image_key FROM variant_colors vc
		 JOIN product_variants pv ON vc.variant_id = pv.id
		 WHERE pv.product_id = ?`
	).bind(productId).all();
	for (const color of colors) {
		if (color.image_key) keys.add(color.image_key as string);
	}

	return keys;
}

function parseProductCategories(raw: unknown, fallbackCategory: string | null): string[] {
	if (typeof raw === "string") {
		try {
			const parsed = JSON.parse(raw).filter((c: unknown) => typeof c === "string" && c);
			if (parsed.length > 0) return parsed;
		} catch {
			// ignore malformed JSON
		}
	} else if (Array.isArray(raw)) {
		const paths = raw.filter((c): c is string => typeof c === "string" && !!c);
		if (paths.length > 0) return paths;
	}
	return fallbackCategory ? [fallbackCategory] : [];
}

function normalizeCategoryList(categories: unknown, primaryCategory: string | null): string[] {
	if (Array.isArray(categories)) {
		const paths = categories.filter((c): c is string => typeof c === "string" && !!c.trim());
		if (paths.length > 0) return paths;
	}
	return primaryCategory ? [primaryCategory] : [];
}

function dbValue(value: unknown) {
	return value === undefined ? null : value;
}

function isValidImageKey(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

async function saveProductCategories(env: Env, productId: number, categories: string[]) {
	await env.DB.prepare("DELETE FROM product_categories WHERE product_id = ?").bind(productId).run();
	for (const path of categories) {
		await env.DB.prepare(
			"INSERT OR IGNORE INTO product_categories (product_id, category_path) VALUES (?, ?)"
		).bind(productId, path).run();
	}
}

async function handleR2Request(
	bucket: R2Bucket, 
	key: string, 
	request: Request, 
	negotiate: boolean = true
): Promise<Response> {
	const acceptHeader = request.headers.get("Accept") || "";
	let bestKey = key;

	// Content Negotiation for Images
	// Only negotiate if it's a standard image format and the user didn't already ask for a specific modern format
	const isNegotiatable = /\.(png|jpg|jpeg)$/i.test(key);
	if (negotiate && isNegotiatable) {
		const baseKey = key.replace(/\.[^.]+$/, "");
		
		// 1. Try AVIF
		if (acceptHeader.includes("image/avif")) {
			const avifKey = `${baseKey}.avif`;
			const head = await bucket.head(avifKey);
			if (head) bestKey = avifKey;
		} 
		
		// 2. Try WebP if AVIF not found or not supported
		if (bestKey === key && acceptHeader.includes("image/webp")) {
			const webpKey = `${baseKey}.webp`;
			const head = await bucket.head(webpKey);
			if (head) bestKey = webpKey;
		}
	}

	const rangeHeader = request.headers.get("Range");
	
	// Handle Range Requests (important for video/large assets)
	if (rangeHeader && request.method === "GET") {
		const head = await bucket.head(bestKey);
		if (!head) return new Response("Not Found", { status: 404 });
		
		const range = parseRange(rangeHeader, head.size);
		if (range) {
			const object = await bucket.get(bestKey, { range });
			if (!object) return new Response("Not Found", { status: 404 });
			
			const headers = new Headers();
			object.writeHttpMetadata(headers);
			headers.set("Access-Control-Allow-Origin", "*");
			headers.set("Accept-Ranges", "bytes");
			headers.set("Content-Range", `bytes ${range.offset}-${range.offset + (range.length || 0) - 1}/${head.size}`);
			headers.set("Cache-Control", "public, max-age=31536000, immutable");
			
			return new Response(object.body, { headers, status: 206 });
		}
	}

	// Default GET/HEAD
	const object = await bucket.get(bestKey);
	if (!object) return new Response("Not Found", { status: 404 });

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set("Access-Control-Allow-Origin", "*");
	headers.set("Accept-Ranges", "bytes");
	headers.set("Cache-Control", "public, max-age=31536000, immutable");
	
	return new Response(request.method === "HEAD" ? null : object.body, { headers });
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);

		// Helper to wrap responses with CORS
		const corsResponse = (body: any, init?: ResponseInit) => {
			const origin = request.headers.get("Origin");
			const allowedOrigins = [
				"https://kitcharoensampeng.com",
				"https://www.kitcharoensampeng.com",
				"http://localhost:5173",
				"http://127.0.0.1:5173"
			];
			
			const responseOrigin = (origin && allowedOrigins.includes(origin)) ? origin : allowedOrigins[0];

			let resp: Response;
			if (body instanceof Response) {
				resp = body;
			} else if (body === null) {
				resp = new Response(null, init);
			} else {
				resp = Response.json(body, init);
			}

			const newResp = new Response(resp.body, resp);
			newResp.headers.set("Access-Control-Allow-Origin", responseOrigin);
			newResp.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
			newResp.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
			newResp.headers.set("Access-Control-Allow-Credentials", "true");
			return newResp;
		};

		// 1. Handle CORS Preflight
		if (request.method === "OPTIONS") {
			const origin = request.headers.get("Origin");
			const allowedOrigins = [
				"https://kitcharoensampeng.com",
				"https://www.kitcharoensampeng.com",
				"http://localhost:5173",
				"http://127.0.0.1:5173"
			];
			const responseOrigin = (origin && allowedOrigins.includes(origin)) ? origin : allowedOrigins[0];

			return new Response(null, {
				status: 204,
				headers: {
					"Access-Control-Allow-Origin": responseOrigin,
					"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type, Authorization",
					"Access-Control-Max-Age": "86400",
					"Access-Control-Allow-Credentials": "true"
				},
			});
		}

		try {
			// 1. PUBLIC ROUTES
			if (url.pathname === "/translate" && request.method === "POST") {
				const { text, sourceLang = "en", targetLang } = await request.json() as any;

				if (!text || !targetLang) {
					return corsResponse({ error: "Missing text or targetLang" }, { status: 400 });
				}

				try {
					const ai = (env as any).AI;
					const response = await ai.run("@cf/meta/m2m100-1.2b", {
						text: text,
						source_lang: sourceLang,
						target_lang: targetLang,
					});

					return corsResponse({ translated_text: response.translated_text });
				} catch (aiError: any) {
					console.error("AI Translation Error:", aiError);
					return corsResponse({ error: "Translation failed", details: aiError.message }, { status: 500 });
				}
			}

			if (url.pathname === "/products" && request.method === "GET") {
				const category = url.searchParams.get("category");
				// Admin views pass include_hidden=1 to also retrieve products hidden from the storefront
				const includeHidden = url.searchParams.get("include_hidden") === "1";
				let query = `
					SELECT 
						p.*,
						(SELECT json_group_array(pc.category_path) FROM product_categories pc WHERE pc.product_id = p.id) as categories,
						(SELECT json_group_array(json_object(
							'id', i.id,
							'image_key', i.image_key,
							'attribute_type', i.attribute_type,
							'attribute_value', i.attribute_value,
							'is_main', i.is_main,
							'price_1', i.price_1,
							'price_2', i.price_2,
							'price_3', i.price_3,
							'price_4', i.price_4,
							'price_5', i.price_5
						)) FROM product_images i WHERE i.product_id = p.id) as images
					FROM products p
				`;
				let params: any[] = [];
				const conditions: string[] = [];
				if (category) {
					conditions.push(`(
						p.category = ?
						OR EXISTS (
							SELECT 1 FROM product_categories pc
							WHERE pc.product_id = p.id AND pc.category_path = ?
						)
					)`);
					params.push(category, category);
				}
				if (!includeHidden) {
					// Treat NULL as visible so existing rows stay on the storefront
					conditions.push("(p.is_visible IS NULL OR p.is_visible = 1)");
				}
				if (conditions.length > 0) {
					query += " WHERE " + conditions.join(" AND ");
				}
				query += " ORDER BY p.created_at DESC";
				const { results: products } = await env.DB.prepare(query).bind(...params).all();

				// Map and parse nested JSON
				const parsedProducts = products.map((p: any) => {
					return {
						...p,
						// Prefer the persisted slug; older rows predate the column, so
						// derive one on read rather than shipping a null to the router.
						slug: p.slug || generateProductSlug(p.name, p.sku, p.id),
						categories: parseProductCategories(p.categories, p.category),
						images: typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || [])
					};
				});

				return corsResponse(parsedProducts);
			}

			// ── Projects (editorial content) ──────────────────────────────
			// Query params:
			//   featured=1     -> the single homepage slot (falls back to newest)
			//   product_id=12  -> projects that link this product (product page)
			//   limit=3        -> cap results (teasers)
			//   include_unpublished=1 (admin lists; still safe to expose read-only)
			if (url.pathname === "/projects" && request.method === "GET") {
				const featured = url.searchParams.get("featured") === "1";
				const productId = url.searchParams.get("product_id");
				const limitParam = parseInt(url.searchParams.get("limit") || "", 10);
				const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : null;
				const includeUnpublished = url.searchParams.get("include_unpublished") === "1";

				const conditions: string[] = [];
				if (!includeUnpublished) {
					conditions.push("(is_published IS NULL OR is_published = 1)");
				}

				let query = "SELECT * FROM projects";
				if (conditions.length) query += " WHERE " + conditions.join(" AND ");
				query += " ORDER BY published_at DESC, id DESC";

				const { results } = await env.DB.prepare(query).all();
				let rows = (results || []).map(mapProjectRow);

				// Linked-product filter is applied here rather than in SQL because
				// product_ids is a JSON column, not a junction table.
				if (productId) {
					const wanted = Number(productId);
					rows = rows.filter((r: any) => r.product_ids.includes(wanted));
				}

				if (featured) {
					const flagged = rows.filter((r: any) => r.is_featured);
					// Never return an empty homepage slot: fall back to the newest post.
					rows = flagged.length ? [flagged[0]] : rows.slice(0, 1);
				}

				if (limit) rows = rows.slice(0, limit);

				return corsResponse(rows);
			}

			if (url.pathname.startsWith("/projects/") && request.method === "GET") {
				const slug = decodeURIComponent(url.pathname.slice("/projects/".length));
				if (!slug) return corsResponse({ error: "Slug required" }, { status: 400 });

				const row = await env.DB.prepare("SELECT * FROM projects WHERE slug = ?").bind(slug).first();
				if (!row) return corsResponse({ error: "Not found" }, { status: 404 });

				return corsResponse(mapProjectRow(row));
			}

			// ── Color of the Month ────────────────────────────────────────
			// active=1 returns just the current color (falls back to the newest
			// row, so the homepage band is never empty). No param returns the
			// full list, newest first, for the admin panel and the archive.
			if (url.pathname === "/spotlights" && request.method === "GET") {
				const activeOnly = url.searchParams.get("active") === "1";

				const { results } = await env.DB.prepare(
					"SELECT * FROM spotlights ORDER BY starts_on DESC, id DESC"
				).all();
				let rows = (results || []).map(mapSpotlightRow);

				if (activeOnly) {
					const flagged = rows.filter((r: any) => r.is_active);
					rows = flagged.length ? [flagged[0]] : rows.slice(0, 1);
				}

				// products.colors is empty for the whole catalog right now, so
				// curated product_ids is the real source. This fallback costs one
				// query per unlinked row and makes the section fill itself in as
				// soon as staff start recording colors on products.
				for (const row of rows as any[]) {
					if (row.product_ids.length) continue;
					const { results: matched } = await env.DB.prepare(
						"SELECT id FROM products WHERE is_visible = 1 AND colors LIKE ? LIMIT 8"
					).bind(`%${row.color_name}%`).all();
					row.product_ids = (matched || []).map((p: any) => Number(p.id));
				}

				return corsResponse(rows);
			}

			// ── Creator gallery ───────────────────────────────────────────
			// Query params:
			//   product_id=12 / project_id=3 -> photos attached to one thing
			//   limit=8                      -> cap results (home teaser)
			//   include_hidden=1             -> admin list
			if (url.pathname === "/gallery" && request.method === "GET") {
				const productId = url.searchParams.get("product_id");
				const projectId = url.searchParams.get("project_id");
				const limitParam = parseInt(url.searchParams.get("limit") || "", 10);
				const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 60) : null;
				const includeHidden = url.searchParams.get("include_hidden") === "1";

				const conditions: string[] = [];
				const binds: any[] = [];
				if (!includeHidden) conditions.push("(is_visible IS NULL OR is_visible = 1)");
				if (productId) {
					conditions.push("product_id = ?");
					binds.push(Number(productId));
				}
				if (projectId) {
					conditions.push("project_id = ?");
					binds.push(Number(projectId));
				}

				let query = "SELECT * FROM gallery";
				if (conditions.length) query += " WHERE " + conditions.join(" AND ");
				// sort_order is the curated running order; id breaks ties newest-first.
				query += " ORDER BY sort_order ASC, id DESC";
				if (limit) query += ` LIMIT ${limit}`;

				const { results } = await env.DB.prepare(query).bind(...binds).all();
				return corsResponse((results || []).map(mapGalleryRow));
			}

			// ── Workshops & market appearances ────────────────────────────
			// Chronological, with anything flagged upcoming pushed to the end so the
			// grid finishes on what is next rather than what is over.
			if (url.pathname === "/events" && request.method === "GET") {
				const includeHidden = url.searchParams.get("include_hidden") === "1";

				let query = "SELECT * FROM events";
				if (!includeHidden) query += " WHERE (is_visible IS NULL OR is_visible = 1)";
				query += " ORDER BY is_upcoming ASC, starts_on ASC, id ASC";

				const { results } = await env.DB.prepare(query).all();
				return corsResponse((results || []).map(mapEventRow));
			}

			if (url.pathname === "/diy/products" && request.method === "GET") {
				const { results: diyProducts } = await env.DB.prepare(
					"SELECT * FROM diy_products ORDER BY created_at DESC"
				).all();

				const parsed = diyProducts.map((p: any) => ({
					...p,
					images: typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || [])
				}));

				return corsResponse(parsed);
			}

			if (url.pathname === "/categories" && request.method === "GET") {
				const { results } = await env.DB.prepare("SELECT * FROM categories ORDER BY name ASC").all();
				return corsResponse(results);
			}

			if (url.pathname === "/institutional/catalog" && request.method === "GET") {
				try {
					// 1. Try querying the exact requested schema (product and product_img)
					const query = `
						SELECT 
							p.id, 
							p.sku, 
							p.title, 
							p.description, 
							p.category_id,
							img.image_key AS image_url
						FROM product p
						LEFT JOIN product_img img ON p.id = img.product_id
					`;
					const { results } = await env.DB.prepare(query).all();
					
					// Perform grouping by category_id
					const grouped: { [key: string]: any[] } = {};
					results.forEach((p: any) => {
						const cat = p.category_id || "Other";
						if (!grouped[cat]) {
							grouped[cat] = [];
						}
						grouped[cat].push(p);
					});

					return corsResponse({
						success: true,
						grouped,
						products: results
					});
				} catch (err: any) {
					console.warn("D1 query on product/product_img failed, falling back to products/product_images: ", err.message);
					
					// 2. Fallback to existing products / product_images tables
					// Fetch from products mapping name -> title, category -> category_id, image_key -> image_url
					const query = `
						SELECT
							p.id,
							p.sku,
							p.name AS title,
							p.name_th,
							p.description,
							p.description_th,
							p.category AS category_id,
							p.image_key AS image_url
						FROM products p
						WHERE p.is_visible = 1 OR p.is_visible IS NULL
					`;
					const { results } = await env.DB.prepare(query).all();
					
					// Perform grouping by category_id
					const grouped: { [key: string]: any[] } = {};
					results.forEach((p: any) => {
						const cat = p.category_id || "Other";
						if (!grouped[cat]) {
							grouped[cat] = [];
						}
						grouped[cat].push(p);
					});

					return corsResponse({
						success: true,
						grouped,
						products: results
					});
				}
			}

			if (url.pathname.startsWith("/images/") && (request.method === "GET" || request.method === "HEAD")) {
				const key = decodeURIComponent(url.pathname.split("/images/")[1]);
				return await handleR2Request(env.IMAGES, key, request, true);
			}

			if (url.pathname.startsWith("/utils/") && (request.method === "GET" || request.method === "HEAD")) {
				const key = decodeURIComponent(url.pathname.split("/utils/")[1]);
				return await handleR2Request(env.WEB_UTILS, key, request, true);
			}

			if (url.pathname.startsWith("/kit-image/") && (request.method === "GET" || request.method === "HEAD")) {
				const key = decodeURIComponent(url.pathname.split("/kit-image/")[1]);
				return await handleR2Request(env.KIT_IMAGE, key, request, true);
			}

			// LINE Login code → userId exchange
			if (url.pathname === "/line/exchange" && request.method === "POST") {
				const body = await request.json() as any;
				const { code, redirectUri } = body;

				if (!code || !redirectUri) {
					return corsResponse({ error: "code and redirectUri are required" }, { status: 400 });
				}
				if (!env.LINE_LOGIN_CHANNEL_ID || !env.LINE_LOGIN_CHANNEL_SECRET) {
					return corsResponse({ error: "LINE Login channel credentials not configured" }, { status: 500 });
				}

				// Step 1: Exchange code for access token
				const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
					method: "POST",
					headers: { "Content-Type": "application/x-www-form-urlencoded" },
					body: new URLSearchParams({
						grant_type: "authorization_code",
						code,
						redirect_uri: redirectUri,
						client_id: env.LINE_LOGIN_CHANNEL_ID,
						client_secret: env.LINE_LOGIN_CHANNEL_SECRET,
					}).toString()
				});
				if (!tokenRes.ok) {
					const err = await tokenRes.json().catch(() => ({})) as any;
					return corsResponse({ error: "Token exchange failed", detail: err }, { status: 400 });
				}
				const tokenData = await tokenRes.json() as any;
				const accessToken = tokenData.access_token;

				// Step 2: GET user profile
				const profileRes = await fetch("https://api.line.me/v2/profile", {
					method: "GET",
					headers: { "Authorization": `Bearer ${accessToken}` }
				});
				if (!profileRes.ok) {
					return corsResponse({ error: "Profile fetch failed" }, { status: 400 });
				}
				const profile = await profileRes.json() as any;
				return corsResponse({ userId: profile.userId, displayName: profile.displayName });
			}

			// Verified order submission with PromptPay slip
			if (url.pathname === "/order/submit" && request.method === "POST") {
				const token = env.LINE_CHANNEL_ACCESS_TOKEN || env.LINE_NOTIFY_TOKEN;
				const staffUserId = env.LINE_USER_ID;

				if (!token || !staffUserId) {
					return corsResponse({ error: "LINE Messaging API credentials not configured" }, { status: 500 });
				}

				// Slip verification (EasySlip) is gated behind a flag so we can launch with
				// manual / LINE-OA payment now and switch on automated slip checks later.
				// Enabled ONLY when the var is exactly "true"; anything else (incl. unset) = off.
				const slipVerificationEnabled = env.SLIP_VERIFICATION_ENABLED === "true";

				if (slipVerificationEnabled) {
					if (!env.EASYSLIP_API_KEY) {
						return corsResponse({ error: "EasySlip API key not configured" }, { status: 500 });
					}
					if (!env.PROMPTPAY_ACCOUNT) {
						return corsResponse({ error: "PromptPay account not configured" }, { status: 500 });
					}
				}

				const formData = await request.formData();
				const customerName = formData.get("customerName") as string;
				const phoneNumber = formData.get("phoneNumber") as string;
				const shippingAddress = formData.get("shippingAddress") as string;
				const orderNote = (formData.get("orderNote") as string) || "";
				const lineUserId = (formData.get("lineUserId") as string) || "";
				const lineDisplayName = (formData.get("lineDisplayName") as string) || "";
				const customerId = (formData.get("customerId") as string) || null;
				const cartItemsRaw = formData.get("cartItems") as string;
				// Only treat slipImage as a slip if it's an actual uploaded file. When the
				// frontend has no slip it may append the string "null"/"" — ignore that.
				const slipFileRaw = formData.get("slipImage");
				const slipFile = (slipFileRaw && typeof (slipFileRaw as any).arrayBuffer === "function")
					? (slipFileRaw as File)
					: null;

				// Name, phone and address are required; a slip is required only when verification is on.
				if (!customerName || !phoneNumber || !shippingAddress || (slipVerificationEnabled && !slipFile)) {
					return corsResponse({ error: "Missing required fields" }, { status: 400 });
				}

				const cartItems: any[] = JSON.parse(cartItemsRaw || "[]");
				if (cartItems.length === 0) {
					return corsResponse({ error: "Cart is empty" }, { status: 400 });
				}

				// Price every line from the DB — client-sent prices/total are NOT trusted.
				// Regular products: products.price; DIY kits (id "diy-N"): diy_products.price_1.
				const pricedItems: { item: any; unitPrice: number; orderItemProductId: any }[] = [];
				let totalAmount = 0;
				for (const item of cartItems) {
					const isDiy = typeof item.id === "string" && item.id.startsWith("diy-");
					let unitPrice: number | null = null;
					let orderItemProductId: any = null;
					if (isDiy) {
						const diyId = parseInt((item.id as string).substring(4), 10);
						const p = await env.DB.prepare("SELECT price_1 FROM diy_products WHERE id = ?").bind(diyId).first() as any;
						if (p) unitPrice = Number(p.price_1) || 0;
					} else {
						const p = await env.DB.prepare("SELECT price FROM products WHERE id = ?").bind(item.id).first() as any;
						if (p) { unitPrice = Number(p.price) || 0; orderItemProductId = item.id; }
					}
					if (unitPrice === null) {
						return corsResponse({ error: "PRODUCT_UNAVAILABLE", detail: item.name || String(item.id) }, { status: 400 });
					}
					const qty = Math.max(0, Number(item.quantity) || 0);
					totalAmount += unitPrice * qty;
					pricedItems.push({ item, unitPrice, orderItemProductId });
				}

				// Read the uploaded slip bytes once (used by verification and/or storage).
				const arrayBuffer = slipFile ? await slipFile.arrayBuffer() : null;
				let transRef = crypto.randomUUID();

				if (slipVerificationEnabled) {
					// Convert slip to base64 (stack-safe reduce — do NOT spread Uint8Array)
					const base64String = btoa(
						new Uint8Array(arrayBuffer!).reduce((data, byte) => data + String.fromCharCode(byte), "")
					);
					const dataUri = `data:image/jpeg;base64,${base64String}`;

					// Call EasySlip API v2
					const easySlipRes = await fetch("https://api.easyslip.com/v2/verify/bank", {
						method: "POST",
						headers: {
							"Authorization": `Bearer ${env.EASYSLIP_API_KEY}`,
							"Content-Type": "application/json"
						},
						body: JSON.stringify({ base64: dataUri })
					});

					if (!easySlipRes.ok) {
						const errBody = await easySlipRes.json().catch(() => ({})) as any;
						console.error("EasySlip error:", easySlipRes.status, errBody);
						return corsResponse({ error: "SLIP_INVALID" }, { status: 400 });
					}

					const slipData = await easySlipRes.json() as any;

					// Validate amount
					const slipAmount = slipData?.data?.amount ?? slipData?.amount;
					if (Math.abs(parseFloat(slipAmount) - totalAmount) > 0.01) {
						return corsResponse({ error: "AMOUNT_MISMATCH" }, { status: 400 });
					}

					// Validate receiver account
					const receiverAccount =
						slipData?.data?.receiver?.accountNo ??
						slipData?.data?.receiver?.promptpay ??
						slipData?.receiver?.accountNo ?? "";
					if (!receiverAccount.replace(/[-\s]/g, "").includes(env.PROMPTPAY_ACCOUNT!.replace(/[-\s]/g, ""))) {
						return corsResponse({ error: "WRONG_ACCOUNT" }, { status: 400 });
					}

					// Check duplicate transaction ref
					transRef = slipData?.data?.transRef ?? slipData?.transRef ?? crypto.randomUUID();
					const dupCheck = await env.DB.prepare(
						"SELECT id FROM orders WHERE slip_transaction_ref = ?"
					).bind(transRef).first();
					if (dupCheck) {
						return corsResponse({ error: "DUPLICATE" }, { status: 400 });
					}
				}

				// Generate order ID
				const now = new Date();
				const random = Math.floor(Math.random() * 99999).toString().padStart(5, "0");
				const orderId = `WH-${now.getFullYear()}-${random}`;

				// Store the uploaded slip (if any) — kept even when unverified so staff can review it.
				let slipUrl: string | null = null;
				if (arrayBuffer && slipFile) {
					const slipKey = `slips/${orderId}-${Date.now()}.jpg`;
					await env.SLIPS.put(slipKey, arrayBuffer, {
						httpMetadata: { contentType: slipFile.type || "image/jpeg" }
					});
					slipUrl = `slips/${slipKey}`;
				}

				// Persist order to D1 (server-computed total; linked to the account when logged in)
				await env.DB.prepare(
					"INSERT INTO orders (id, customer_name, total_amount, payment_method, note, customer_id, phone_number, shipping_address, slip_url, line_user_id, line_display_name, slip_transaction_ref) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
				).bind(orderId, customerName, totalAmount, slipVerificationEnabled ? "PromptPay" : "PromptPay (manual)", orderNote, customerId, phoneNumber, shippingAddress, slipUrl, lineUserId || null, lineDisplayName || null, transRef).run();

				// Persist order items with server-side prices
				for (const { item, unitPrice, orderItemProductId } of pricedItems) {
					const productName = item.name_th || item.name;
					await env.DB.prepare(
						"INSERT INTO order_items (order_id, product_id, product_name, size, color, quantity, price) VALUES (?, ?, ?, ?, ?, ?, ?)"
					).bind(orderId, orderItemProductId, productName, item.selectedSize, item.selectedColor, item.quantity, unitPrice).run();
				}

				// Build staff LINE notification (use name_th)
				let lineMsg = `🧾 คำสั่งซื้อใหม่ (เว็บไซต์)\n`;
				lineMsg += `รหัส: ${orderId}\n`;
				lineMsg += `ชื่อ: ${customerName}  โทร: ${phoneNumber}\n`;
				if (lineDisplayName) lineMsg += `LINE: ${lineDisplayName}\n`;
				lineMsg += `ที่อยู่: ${shippingAddress}\n\n`;
				pricedItems.forEach(({ item, unitPrice }, i: number) => {
					const name = item.name_th || item.name;
					lineMsg += `${i + 1}) ${name}\n`;
					lineMsg += `   ขนาด: ${item.selectedSize} | สี: ${item.selectedColor}\n`;
					lineMsg += `   จำนวน: ${item.quantity} ชิ้น × ${unitPrice} บาท\n`;
					lineMsg += `   รวม: ${(unitPrice * item.quantity).toFixed(2)} บาท\n\n`;
				});
				lineMsg += `รวมทั้งหมด: ${totalAmount.toFixed(2)} บาท\n`;
				if (orderNote) lineMsg += `หมายเหตุ: ${orderNote}\n`;
				lineMsg += slipUrl
					? `หลักฐานการโอน: ${slipUrl}`
					: `การชำระเงิน: รอชำระ/ตรวจสอบโดยเจ้าหน้าที่`;

				// The order is already saved — don't let a LINE push failure 500 the request
				// (that would make the customer retry and create duplicate orders).
				try {
					await fetch("https://api.line.me/v2/bot/message/push", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"Authorization": `Bearer ${token}`
						},
						body: JSON.stringify({
							to: staffUserId,
							messages: [{ type: "text", text: lineMsg }]
						})
					});
				} catch (err) {
					console.error(`Staff LINE push failed for order ${orderId}:`, err);
				}

				// Push an order-confirmation Flex Message to the customer.
				// This opens a 1:1 chat with them in the OA console and delivers their receipt.
				if (lineUserId) {
					const itemRows = pricedItems.map(({ item, unitPrice }) => {
						const name = item.name_th || item.name;
						const lineTotal = (unitPrice * item.quantity).toFixed(2);
						return {
							type: "box",
							layout: "horizontal",
							margin: "md",
							contents: [
								{
									type: "text",
									text: `${name}\n${item.selectedSize} / ${item.selectedColor} ×${item.quantity}`,
									size: "sm",
									color: "#555555",
									flex: 5,
									wrap: true
								},
								{
									type: "text",
									text: `฿${lineTotal}`,
									size: "sm",
									color: "#111111",
									align: "end",
									flex: 2
								}
							]
						};
					});

					const flexMessage = {
						type: "flex",
						altText: `คำสั่งซื้อ ${orderId} ได้รับแล้ว`,
						contents: {
							type: "bubble",
							body: {
								type: "box",
								layout: "vertical",
								contents: [
									{ type: "text", text: "Kitcharoen", weight: "bold", color: "#DD876E", size: "sm" },
									{ type: "text", text: "ยืนยันคำสั่งซื้อ", weight: "bold", size: "xl", margin: "md" },
									{ type: "text", text: `รหัส: ${orderId}`, size: "sm", color: "#888888", margin: "sm" },
									{ type: "text", text: `ชื่อ: ${customerName}`, size: "sm", color: "#888888" },
									{ type: "separator", margin: "lg" },
									{
										type: "box",
										layout: "vertical",
										margin: "lg",
										spacing: "sm",
										contents: itemRows
									},
									{ type: "separator", margin: "lg" },
									{
										type: "box",
										layout: "horizontal",
										margin: "lg",
										contents: [
											{ type: "text", text: "รวมทั้งหมด", size: "md", weight: "bold", flex: 3 },
											{ type: "text", text: `฿${totalAmount.toFixed(2)}`, size: "md", weight: "bold", color: "#DD876E", align: "end", flex: 2 }
										]
									},
									{ type: "text", text: "เราได้รับคำสั่งซื้อของคุณแล้ว และจะจัดส่งให้เร็วที่สุด ขอบคุณค่ะ 🧵", size: "xs", color: "#888888", margin: "lg", wrap: true }
								]
							}
						}
					};

					// Flag-and-log if the push fails (e.g. customer connected LINE Login but
					// never added the OA as a friend, so they're unreachable). The order still
					// succeeds; line_push_failed lets staff see who can't be contacted on LINE.
					try {
						const pushResp = await fetch("https://api.line.me/v2/bot/message/push", {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								"Authorization": `Bearer ${token}`
							},
							body: JSON.stringify({
								to: lineUserId,
								messages: [flexMessage]
							})
						});
						if (!pushResp.ok) {
							const errBody = await pushResp.text();
							console.error(`LINE customer push failed for order ${orderId} (user ${lineUserId}): ${pushResp.status} ${errBody}`);
							await env.DB.prepare("UPDATE orders SET line_push_failed = 1 WHERE id = ?").bind(orderId).run();
						}
					} catch (err) {
						console.error(`LINE customer push error for order ${orderId} (user ${lineUserId}):`, err);
						await env.DB.prepare("UPDATE orders SET line_push_failed = 1 WHERE id = ?").bind(orderId).run();
					}
				}

				return corsResponse({ success: true, orderId });
			}

			if (url.pathname === "/rfq/submit" && request.method === "POST") {
				try {
					const body = await request.json() as any;
					const { customerName, organization, email, phoneNumber, shippingAddress, notes, items } = body;

					if (!customerName || !email || !items || !Array.isArray(items) || items.length === 0) {
						return corsResponse({ error: "Missing required fields" }, { status: 400 });
					}

					// Generate a unique RFQ ID
					const rfqId = `RFQ_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

					// Insert order
					const noteText = `RFQ Contact Email: ${email}\nPhone: ${phoneNumber || 'N/A'}\nShipping Address: ${shippingAddress || 'N/A'}\nNotes: ${notes || 'None'}`;
					
					await env.DB.prepare(
						"INSERT INTO orders (id, customer_name, total_amount, status, payment_method, note) VALUES (?, ?, ?, ?, ?, ?)"
					).bind(
						rfqId,
						`${organization || 'Individual'} - ${customerName}`,
						0.0,
						"PENDING",
						"RFQ",
						noteText
					).run();

					// Insert items
					for (const item of items) {
						await env.DB.prepare(
							"INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES (?, ?, ?, ?, ?)"
						).bind(
							rfqId,
							item.id || null,
							item.title || "Unknown Product",
							parseInt(item.quantity) || 1,
							0.0
						).run();
					}

					return corsResponse({ success: true, orderId: rfqId });
				} catch (err: any) {
					console.error("RFQ Submit Error:", err);
					return corsResponse({ error: "Failed to submit RFQ", details: err.message }, { status: 500 });
				}
			}

			// 2. CUSTOMER AUTH
			if (url.pathname === "/customer/signup" && request.method === "POST") {
				const body = await request.json() as any;
				const { email, password, businessName, ownerName, phone, taxId } = body;

				if (!email || !password) {
					return corsResponse({ error: "Email and password are required" }, { status: 400 });
				}

				// Check if user exists
				const existing = await env.DB.prepare("SELECT id FROM customers WHERE email = ?").bind(email).first();
				if (existing) {
					return corsResponse({ error: "Email already registered" }, { status: 400 });
				}

				const id = crypto.randomUUID();
				const passwordHash = await hashPassword(password);

				await env.DB.prepare(
					"INSERT INTO customers (id, email, password_hash, business_name, owner_name, phone, tax_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
				).bind(id, email, passwordHash, businessName, ownerName, phone, taxId).run();

				return corsResponse({ success: true, user: { id, email, businessName, ownerName } });
			}

			if (url.pathname === "/customer/login" && request.method === "POST") {
				const body = await request.json() as any;
				const { email, password } = body;

				if (!email || !password) {
					return corsResponse({ error: "Email and password are required" }, { status: 400 });
				}

				const user = await env.DB.prepare("SELECT * FROM customers WHERE email = ?").bind(email).first() as any;
				if (!user) {
					return corsResponse({ error: "Invalid email or password" }, { status: 401 });
				}

				const passwordHash = await hashPassword(password);
				if (user.password_hash !== passwordHash) {
					return corsResponse({ error: "Invalid email or password" }, { status: 401 });
				}

				// For now, we return the user and a "token" (just the user ID for simplicity)
				// In a real app, use a proper JWT.
				return corsResponse({
					success: true,
					token: user.id,
					user: {
						id: user.id,
						email: user.email,
						businessName: user.business_name,
						ownerName: user.owner_name,
						owner_name: user.owner_name,
						phone: user.phone,
						shippingAddress: user.shipping_address,
						lineDisplayName: user.line_display_name,
						lineUserId: user.line_user_id
					}
				});
			}

			// Update the logged-in customer's profile (prefill/save at checkout).
			// Token is the user id (see login), passed in the Authorization header.
			if (url.pathname === "/customer/update" && request.method === "POST") {
				const userId = request.headers.get("Authorization");
				if (!userId) {
					return corsResponse({ error: "Unauthorized" }, { status: 401 });
				}
				const existing = await env.DB.prepare("SELECT id FROM customers WHERE id = ?").bind(userId).first();
				if (!existing) {
					return corsResponse({ error: "Unauthorized" }, { status: 401 });
				}
				const body = await request.json() as any;
				// COALESCE keeps the existing value when a field isn't provided.
				await env.DB.prepare(
					"UPDATE customers SET business_name = COALESCE(?, business_name), owner_name = COALESCE(?, owner_name), phone = COALESCE(?, phone), shipping_address = COALESCE(?, shipping_address), line_display_name = COALESCE(?, line_display_name), line_user_id = COALESCE(?, line_user_id) WHERE id = ?"
				).bind(
					body.businessName ?? null,
					body.ownerName ?? null,
					body.phone ?? null,
					body.shippingAddress ?? null,
					body.lineDisplayName ?? null,
					body.lineUserId ?? null,
					userId
				).run();
				const updated = await env.DB.prepare("SELECT * FROM customers WHERE id = ?").bind(userId).first() as any;
				return corsResponse({
					success: true,
					user: {
						id: updated.id,
						email: updated.email,
						businessName: updated.business_name,
						ownerName: updated.owner_name,
						owner_name: updated.owner_name,
						phone: updated.phone,
						shippingAddress: updated.shipping_address,
						lineDisplayName: updated.line_display_name,
						lineUserId: updated.line_user_id
					}
				});
			}

			// 2. ADMIN LOGIN
			if (url.pathname === "/admin/login" && request.method === "POST") {
				const body = await request.json() as any;
				const received = (body.password || "").trim();
				const expected = (env.ADMIN_PASSWORD || "").trim();
				if (received === expected) {
					return corsResponse({ success: true, token: received });
				}
				return corsResponse({ success: false }, { status: 401 });
			}

			if (url.pathname === "/orders" && request.method === "GET") {
				const customerId = url.searchParams.get("customer_id");
				const auth = request.headers.get("Authorization");
				
				// Allow if admin password matches OR if customerId matches the token (which is user.id for now)
				const isAdmin = auth === (env.ADMIN_PASSWORD || "").trim();
				const isCustomer = customerId && auth === customerId;

				if (!isAdmin && !isCustomer) {
					return corsResponse("Unauthorized", { status: 401 });
				}

				let query = "SELECT * FROM orders";
				let params: any[] = [];

				if (customerId) {
					query += " WHERE customer_id = ?";
					params.push(customerId);
				}

				query += " ORDER BY created_at DESC";

				const { results: orders } = await env.DB.prepare(query).bind(...params).all();

				const orderIds = orders.map((o: any) => o.id);
				let allItems: any[] = [];
				if (orderIds.length > 0) {
					const placeholders = orderIds.map(() => "?").join(",");
					const { results: itemResults } = await env.DB.prepare(
						`SELECT * FROM order_items WHERE order_id IN (${placeholders})`
					).bind(...orderIds).all();
					allItems = itemResults;
				}

				const ordersWithItems = orders.map((o: any) => ({
					...o,
					items: allItems.filter((i: any) => i.order_id === o.id)
				}));

				return corsResponse(ordersWithItems);
			}

			// 3. PROTECTED ROUTES
			const auth = request.headers.get("Authorization");
			if (auth !== (env.ADMIN_PASSWORD || "").trim()) {
				return corsResponse("Unauthorized", { status: 401 });
			}

			// ── Projects: create / update ─────────────────────────────────
			// Sending an id updates that row; omitting it inserts a new one.
			if (url.pathname === "/projects" && request.method === "POST") {
				const body = await request.json() as any;
				const title = (body.title || "").trim();
				if (!title) return corsResponse({ error: "title is required" }, { status: 400 });

				const productIds = JSON.stringify(parseProductIds(body.product_ids));
				const isFeatured = body.is_featured ? 1 : 0;
				const isPublished = body.is_published === false ? 0 : 1;
				const publishedAt = (body.published_at || "").trim() || new Date().toISOString();

				// Only one project can hold the homepage slot.
				if (isFeatured) {
					await env.DB.prepare("UPDATE projects SET is_featured = 0").run();
				}

				if (body.id) {
					await env.DB.prepare(
						`UPDATE projects SET title = ?, title_th = ?, cover_image_key = ?, excerpt = ?,
						 excerpt_th = ?, body = ?, body_th = ?, video_url = ?, product_ids = ?,
						 is_featured = ?, is_published = ?, published_at = ? WHERE id = ?`
					).bind(
						title, body.title_th || null, body.cover_image_key || null, body.excerpt || null,
						body.excerpt_th || null, body.body || null, body.body_th || null, body.video_url || null,
						productIds, isFeatured, isPublished, publishedAt, body.id
					).run();

					const updated = await env.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(body.id).first();
					return corsResponse(mapProjectRow(updated));
				}

				// Insert with a placeholder slug, then rewrite it with the row id
				// appended so slugs stay unique even when two posts share a title.
				const placeholder = `pending-${crypto.randomUUID()}`;
				const inserted = await env.DB.prepare(
					`INSERT INTO projects (title, title_th, slug, cover_image_key, excerpt, excerpt_th,
					 body, body_th, video_url, product_ids, is_featured, is_published, published_at)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
				).bind(
					title, body.title_th || null, placeholder, body.cover_image_key || null, body.excerpt || null,
					body.excerpt_th || null, body.body || null, body.body_th || null, body.video_url || null,
					productIds, isFeatured, isPublished, publishedAt
				).first() as any;

				const newId = inserted.id;
				const slug = generateProjectSlug(title, newId);
				await env.DB.prepare("UPDATE projects SET slug = ? WHERE id = ?").bind(slug, newId).run();

				const created = await env.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(newId).first();
				return corsResponse(mapProjectRow(created));
			}

			if (url.pathname === "/projects/delete" && request.method === "POST") {
				const body = await request.json() as any;
				if (!body.id) return corsResponse({ error: "id is required" }, { status: 400 });
				await env.DB.prepare("DELETE FROM projects WHERE id = ?").bind(body.id).run();
				return corsResponse({ success: true });
			}

			// ── Color of the Month: create / update ───────────────────────
			// Sending an id updates that row; omitting it inserts a new one.
			if (url.pathname === "/spotlights" && request.method === "POST") {
				const body = await request.json() as any;
				const colorName = (body.color_name || "").trim();
				if (!colorName) return corsResponse({ error: "color_name is required" }, { status: 400 });

				const hex = (body.hex || "").trim() || "#C4694E";
				const productIds = JSON.stringify(parseProductIds(body.product_ids));
				const isActive = body.is_active ? 1 : 0;
				const startsOn = (body.starts_on || "").trim() || new Date().toISOString();

				// Only one color can be the current one.
				if (isActive) {
					await env.DB.prepare("UPDATE spotlights SET is_active = 0").run();
				}

				if (body.id) {
					await env.DB.prepare(
						`UPDATE spotlights SET color_name = ?, color_name_th = ?, hex = ?, blurb = ?,
						 blurb_th = ?, product_ids = ?, is_active = ?, starts_on = ? WHERE id = ?`
					).bind(
						colorName, body.color_name_th || null, hex, body.blurb || null,
						body.blurb_th || null, productIds, isActive, startsOn, body.id
					).run();

					const updated = await env.DB.prepare("SELECT * FROM spotlights WHERE id = ?").bind(body.id).first();
					return corsResponse(mapSpotlightRow(updated));
				}

				const inserted = await env.DB.prepare(
					`INSERT INTO spotlights (color_name, color_name_th, hex, blurb, blurb_th,
					 product_ids, is_active, starts_on)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
				).bind(
					colorName, body.color_name_th || null, hex, body.blurb || null,
					body.blurb_th || null, productIds, isActive, startsOn
				).first() as any;

				const created = await env.DB.prepare("SELECT * FROM spotlights WHERE id = ?").bind(inserted.id).first();
				return corsResponse(mapSpotlightRow(created));
			}

			if (url.pathname === "/spotlights/delete" && request.method === "POST") {
				const body = await request.json() as any;
				if (!body.id) return corsResponse({ error: "id is required" }, { status: 400 });
				await env.DB.prepare("DELETE FROM spotlights WHERE id = ?").bind(body.id).run();
				return corsResponse({ success: true });
			}

			// ── Creator gallery: create / update ──────────────────────────
			// Sending an id updates that row; omitting it inserts a new one.
			if (url.pathname === "/gallery" && request.method === "POST") {
				const body = await request.json() as any;
				const imageKey = (body.image_key || "").trim();
				if (!imageKey) return corsResponse({ error: "image_key is required" }, { status: 400 });

				// A blank select in the admin form posts "" — store NULL, not 0, or the
				// row would claim to belong to a product that does not exist.
				const productId = body.product_id ? Number(body.product_id) : null;
				const projectId = body.project_id ? Number(body.project_id) : null;
				const isVisible = body.is_visible === false ? 0 : 1;
				const sortOrder = Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0;
				// Handles are stored bare; the client renders the '@'.
				const handle = (body.credit_handle || "").trim().replace(/^@+/, "") || null;

				if (body.id) {
					await env.DB.prepare(
						`UPDATE gallery SET image_key = ?, caption = ?, caption_th = ?, credit_name = ?,
						 credit_handle = ?, credit_url = ?, product_id = ?, project_id = ?,
						 is_visible = ?, sort_order = ? WHERE id = ?`
					).bind(
						imageKey, body.caption || null, body.caption_th || null, body.credit_name || null,
						handle, body.credit_url || null, productId, projectId,
						isVisible, sortOrder, body.id
					).run();

					const updated = await env.DB.prepare("SELECT * FROM gallery WHERE id = ?").bind(body.id).first();
					return corsResponse(mapGalleryRow(updated));
				}

				const inserted = await env.DB.prepare(
					`INSERT INTO gallery (image_key, caption, caption_th, credit_name, credit_handle,
					 credit_url, product_id, project_id, is_visible, sort_order)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
				).bind(
					imageKey, body.caption || null, body.caption_th || null, body.credit_name || null,
					handle, body.credit_url || null, productId, projectId, isVisible, sortOrder
				).first() as any;

				const created = await env.DB.prepare("SELECT * FROM gallery WHERE id = ?").bind(inserted.id).first();
				return corsResponse(mapGalleryRow(created));
			}

			if (url.pathname === "/gallery/delete" && request.method === "POST") {
				const body = await request.json() as any;
				if (!body.id) return corsResponse({ error: "id is required" }, { status: 400 });
				await env.DB.prepare("DELETE FROM gallery WHERE id = ?").bind(body.id).run();
				return corsResponse({ success: true });
			}

			// ── Workshops: create / update ────────────────────────────────
			// Sending an id updates that row; omitting it inserts a new one.
			if (url.pathname === "/events" && request.method === "POST") {
				const body = await request.json() as any;
				const title = (body.title || "").trim();
				if (!title) return corsResponse({ error: "title is required" }, { status: 400 });

				// Re-serialise rather than trusting the posted string: a malformed
				// gallery would otherwise sit in the column until it broke the page.
				const gallery = JSON.stringify(parseEventGallery(body.gallery));
				const isUpcoming = body.is_upcoming ? 1 : 0;
				const isVisible = body.is_visible === false ? 0 : 1;
				const startsOn = (body.starts_on || "").trim() || null;

				if (body.id) {
					await env.DB.prepare(
						`UPDATE events SET title = ?, title_th = ?, date_label = ?, date_label_th = ?,
						 cover_image_key = ?, description = ?, description_th = ?, location = ?, location_th = ?,
						 participants = ?, participants_th = ?, gallery = ?, is_upcoming = ?, is_visible = ?,
						 starts_on = ? WHERE id = ?`
					).bind(
						title, body.title_th || null, body.date_label || null, body.date_label_th || null,
						body.cover_image_key || null, body.description || null, body.description_th || null,
						body.location || null, body.location_th || null, body.participants || null,
						body.participants_th || null, gallery, isUpcoming, isVisible, startsOn, body.id
					).run();

					const updated = await env.DB.prepare("SELECT * FROM events WHERE id = ?").bind(body.id).first();
					return corsResponse(mapEventRow(updated));
				}

				const inserted = await env.DB.prepare(
					`INSERT INTO events (title, title_th, date_label, date_label_th, cover_image_key,
					 description, description_th, location, location_th, participants, participants_th,
					 gallery, is_upcoming, is_visible, starts_on)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
				).bind(
					title, body.title_th || null, body.date_label || null, body.date_label_th || null,
					body.cover_image_key || null, body.description || null, body.description_th || null,
					body.location || null, body.location_th || null, body.participants || null,
					body.participants_th || null, gallery, isUpcoming, isVisible, startsOn
				).first() as any;

				const created = await env.DB.prepare("SELECT * FROM events WHERE id = ?").bind(inserted.id).first();
				return corsResponse(mapEventRow(created));
			}

			if (url.pathname === "/events/delete" && request.method === "POST") {
				const body = await request.json() as any;
				if (!body.id) return corsResponse({ error: "id is required" }, { status: 400 });
				await env.DB.prepare("DELETE FROM events WHERE id = ?").bind(body.id).run();
				return corsResponse({ success: true });
			}

			// One-shot: persist a slug for every product that predates the column.
			// Safe to re-run; it only touches rows where slug IS NULL.
			if (url.pathname === "/products/backfill-slugs" && request.method === "POST") {
				const { results } = await env.DB.prepare(
					"SELECT id, name, sku FROM products WHERE slug IS NULL OR TRIM(slug) = ''"
				).all();

				let updated = 0;
				for (const p of (results || []) as any[]) {
					const slug = generateProductSlug(p.name, p.sku, p.id);
					await env.DB.prepare("UPDATE products SET slug = ? WHERE id = ?").bind(slug, p.id).run();
					updated++;
				}

				return corsResponse({ success: true, updated });
			}

			// Update an order's status + tracking number, and notify the customer on LINE
			// (in the same 1:1 OA thread) if they connected their LINE account at checkout.
			if (url.pathname === "/orders/status" && request.method === "POST") {
				const body = await request.json() as any;
				const orderId = (body.orderId as string || "").trim();
				const status = (body.status as string || "").trim();
				const trackingNumber = (body.trackingNumber as string || "").trim();

				if (!orderId || !status) {
					return corsResponse({ error: "orderId and status are required" }, { status: 400 });
				}

				await env.DB.prepare(
					"UPDATE orders SET status = ?, tracking_number = ? WHERE id = ?"
				).bind(status, trackingNumber || null, orderId).run();

				const order = await env.DB.prepare(
					"SELECT id, customer_name, line_user_id, total_amount FROM orders WHERE id = ?"
				).bind(orderId).first() as any;

				if (!order) {
					return corsResponse({ error: "Order not found" }, { status: 404 });
				}

				let customerNotified = false;
				const token = env.LINE_CHANNEL_ACCESS_TOKEN || env.LINE_NOTIFY_TOKEN;
				if (order.line_user_id && token) {
					const statusLabels: Record<string, string> = {
						PENDING: "รอดำเนินการ",
						PAID: "ชำระเงินแล้ว",
						SHIPPED: "จัดส่งแล้ว",
						DELIVERED: "จัดส่งสำเร็จ",
						CANCELLED: "ยกเลิกแล้ว"
					};
					const statusTh = statusLabels[status] || status;

					const bodyContents: any[] = [
						{ type: "text", text: "Kitcharoen", weight: "bold", color: "#DD876E", size: "sm" },
						{ type: "text", text: "อัปเดตคำสั่งซื้อ", weight: "bold", size: "xl", margin: "md" },
						{ type: "text", text: `รหัส: ${order.id}`, size: "sm", color: "#888888", margin: "sm" },
						{ type: "separator", margin: "lg" },
						{
							type: "box",
							layout: "horizontal",
							margin: "lg",
							contents: [
								{ type: "text", text: "สถานะ", size: "md", color: "#555555", flex: 2 },
								{ type: "text", text: statusTh, size: "md", weight: "bold", color: "#DD876E", align: "end", flex: 3, wrap: true }
							]
						}
					];

					if (trackingNumber) {
						bodyContents.push({
							type: "box",
							layout: "horizontal",
							margin: "md",
							contents: [
								{ type: "text", text: "เลขพัสดุ / Tracking", size: "md", color: "#555555", flex: 3, wrap: true },
								{ type: "text", text: trackingNumber, size: "md", weight: "bold", color: "#111111", align: "end", flex: 3, wrap: true }
							]
						});
					}

					bodyContents.push({
						type: "text",
						text: "ขอบคุณที่อุดหนุนร้านกิจเจริญค่ะ 🧵",
						size: "xs",
						color: "#888888",
						margin: "lg",
						wrap: true
					});

					const statusFlex = {
						type: "flex",
						altText: `อัปเดตคำสั่งซื้อ ${order.id}: ${statusTh}`,
						contents: {
							type: "bubble",
							body: { type: "box", layout: "vertical", contents: bodyContents }
						}
					};

					try {
						const pushResp = await fetch("https://api.line.me/v2/bot/message/push", {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								"Authorization": `Bearer ${token}`
							},
							body: JSON.stringify({
								to: order.line_user_id,
								messages: [statusFlex]
							})
						});
						if (pushResp.ok) {
							customerNotified = true;
						} else {
							const errBody = await pushResp.text();
							console.error(`LINE status push failed for order ${order.id} (user ${order.line_user_id}): ${pushResp.status} ${errBody}`);
							await env.DB.prepare("UPDATE orders SET line_push_failed = 1 WHERE id = ?").bind(order.id).run();
						}
					} catch (err) {
						console.error(`LINE status push error for order ${order.id} (user ${order.line_user_id}):`, err);
						await env.DB.prepare("UPDATE orders SET line_push_failed = 1 WHERE id = ?").bind(order.id).run();
					}
				}

				return corsResponse({ success: true, customerNotified });
			}

			// Staff full order edit: customer/fulfilment fields + line items.
			// Prices/total are recomputed server-side from the DB when a product id is present.
			if (url.pathname === "/orders/update" && request.method === "POST") {
				const body = await request.json() as any;
				const orderId = (body.orderId as string || "").trim();
				if (!orderId) {
					return corsResponse({ error: "orderId is required" }, { status: 400 });
				}
				const existing = await env.DB.prepare("SELECT id FROM orders WHERE id = ?").bind(orderId).first();
				if (!existing) {
					return corsResponse({ error: "Order not found" }, { status: 404 });
				}

				// Update editable fields (COALESCE keeps existing values when omitted).
				await env.DB.prepare(
					"UPDATE orders SET customer_name = COALESCE(?, customer_name), phone_number = COALESCE(?, phone_number), shipping_address = COALESCE(?, shipping_address), line_display_name = COALESCE(?, line_display_name), note = COALESCE(?, note), status = COALESCE(?, status), tracking_number = COALESCE(?, tracking_number) WHERE id = ?"
				).bind(
					body.customerName ?? null,
					body.phoneNumber ?? null,
					body.shippingAddress ?? null,
					body.lineDisplayName ?? null,
					body.note ?? null,
					body.status ?? null,
					body.trackingNumber ?? null,
					orderId
				).run();

				// If an items array is supplied, replace the line items and recompute the total.
				if (Array.isArray(body.items)) {
					let newTotal = 0;
					const priced: { item: any; unitPrice: number; orderItemProductId: any }[] = [];
					for (const item of body.items) {
						const isDiy = typeof item.id === "string" && item.id.startsWith("diy-");
						let unitPrice: number | null = null;
						let orderItemProductId: any = null;
						if (isDiy) {
							const diyId = parseInt((item.id as string).substring(4), 10);
							const p = await env.DB.prepare("SELECT price_1 FROM diy_products WHERE id = ?").bind(diyId).first() as any;
							if (p) unitPrice = Number(p.price_1) || 0;
						} else if (item.id !== null && item.id !== undefined && item.id !== "") {
							const p = await env.DB.prepare("SELECT price FROM products WHERE id = ?").bind(item.id).first() as any;
							if (p) { unitPrice = Number(p.price) || 0; orderItemProductId = item.id; }
						}
						// Custom/manual line (no resolvable product): fall back to the staff-entered price.
						if (unitPrice === null) unitPrice = Number(item.price) || 0;
						const qty = Math.max(0, Number(item.quantity) || 0);
						newTotal += unitPrice * qty;
						priced.push({ item, unitPrice, orderItemProductId });
					}

					await env.DB.prepare("DELETE FROM order_items WHERE order_id = ?").bind(orderId).run();
					for (const { item, unitPrice, orderItemProductId } of priced) {
						await env.DB.prepare(
							"INSERT INTO order_items (order_id, product_id, product_name, size, color, quantity, price) VALUES (?, ?, ?, ?, ?, ?, ?)"
						).bind(orderId, orderItemProductId, item.name_th || item.name || "", item.selectedSize || null, item.selectedColor || null, item.quantity, unitPrice).run();
					}
					await env.DB.prepare("UPDATE orders SET total_amount = ? WHERE id = ?").bind(newTotal, orderId).run();
				}

				return corsResponse({ success: true });
			}

			// POS in-store cash sale: records a walk-in sale into pos_orders / pos_order_items
			if (url.pathname === "/sellcash/submit" && request.method === "POST") {
				const body = await request.json() as any;
				const items = Array.isArray(body.items) ? body.items : [];
				if (items.length === 0) {
					return corsResponse({ error: "No items" }, { status: 400 });
				}
				const orderId = crypto.randomUUID();
				const totalAmount = Number(body.total_amount) || 0;

				const statements = [
					env.DB.prepare(
						"INSERT INTO pos_orders (order_id, total_amount) VALUES (?, ?)"
					).bind(orderId, totalAmount),
					...items.map((it: any) =>
						env.DB.prepare(
							"INSERT INTO pos_order_items (order_id, product_type, input_price) VALUES (?, ?, ?)"
						).bind(orderId, String(it.product_type || ""), Number(it.input_price) || 0)
					)
				];
				await env.DB.batch(statements);

				return corsResponse({ success: true, order_id: orderId });
			}

			if (url.pathname === "/products/next-sku" && request.method === "GET") {
				const category = url.searchParams.get("category");
				if (!category) return corsResponse({ error: "Category is required" }, { status: 400 });
				const sku = await allocateProductSku(env, category);
				return corsResponse({ sku });
			}

			if (url.pathname === "/diy/products/next-sku" && request.method === "GET") {
				let seqVal = 0;
				const seqResult = await env.DB.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'diy_products'").first() as any;
				if (seqResult && seqResult.seq !== undefined && seqResult.seq !== null) {
					seqVal = seqResult.seq;
				}
				const sku = generateDiySKU(seqVal);
				return corsResponse({ sku });
			}

			if (url.pathname === "/products" && request.method === "POST") {
				const body = await request.json() as any;
				const { name, name_th, description, price, category, categories, image_key, usage, varieties, sizes, colors, price_1, price_2, price_3, price_4, price_5, moq, is_visible, images } = body;
				const categoryList = normalizeCategoryList(categories, category);
				const primaryCategory = categoryList[0] || category || null;
				const activePrice = price || price_3 || 0;
				let productId: number | null = null;

				if (!primaryCategory) {
					return corsResponse({ error: "At least one category is required" }, { status: 400 });
				}

				try {
					const sku = await allocateProductSku(env, primaryCategory, body.sku);

					const { meta } = await env.DB.prepare(
						"INSERT INTO products (name, name_th, description, description_th, price, category, image_key, usage, usage_th, attribute, attribute_th, varieties, sizes, colors, price_1, price_2, price_3, price_4, price_5, moq, is_visible, sku) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
					).bind(
						dbValue(name), dbValue(name_th), dbValue(description), dbValue(body.description_th || null), activePrice, primaryCategory,
						dbValue(image_key), dbValue(usage), dbValue(body.usage_th || null), dbValue(body.attribute || null), dbValue(body.attribute_th || null), dbValue(varieties), dbValue(sizes), dbValue(colors),
						price_1 ?? 0, price_2 ?? 0, price_3 ?? 0, price_4 ?? 0, price_5 ?? 0, dbValue(moq), is_visible === false ? 0 : 1, sku
					).run();

					productId = meta.last_row_id;

					if (productId) {
						// Slug needs the row id, so it is written straight after insert.
						await env.DB.prepare("UPDATE products SET slug = ? WHERE id = ?")
							.bind(generateProductSlug(name, sku, productId), productId).run();
						await saveProductCategories(env, productId, categoryList);
					}

					if (images && Array.isArray(images) && productId) {
						for (const img of images) {
							if (!isValidImageKey(img?.image_key)) continue;
							await env.DB.prepare(
								"INSERT INTO product_images (product_id, image_key, attribute_type, attribute_value, is_main, price_1, price_2, price_3, price_4, price_5) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
							).bind(
								productId, img.image_key, dbValue(img.attribute_type), dbValue(img.attribute_value), img.is_main ? 1 : 0,
								dbValue(img.price_1), dbValue(img.price_2), dbValue(img.price_3), dbValue(img.price_4), dbValue(img.price_5)
							).run();
						}
					}

					return corsResponse({ success: true, id: productId, sku });
				} catch (insertError: any) {
					if (productId) {
						await env.DB.prepare("DELETE FROM products WHERE id = ?").bind(productId).run();
					}
					throw insertError;
				}
			}

			if (url.pathname.startsWith("/products/") && request.method === "PUT") {
				const id = url.pathname.split("/products/")[1];
				const body = await request.json() as any;
				const { name, name_th, description, price, category, categories, image_key, usage, varieties, sizes, colors, price_1, price_2, price_3, price_4, price_5, moq, is_visible, images } = body;
				const categoryList = normalizeCategoryList(categories, category);
				const primaryCategory = categoryList[0] || category || null;
				const activePrice = price_3 || price || 0;

				if (!primaryCategory) {
					return corsResponse({ error: "At least one category is required" }, { status: 400 });
				}

				await env.DB.prepare(
					"UPDATE products SET name=?, name_th=?, description=?, description_th=?, price=?, category=?, image_key=?, usage=?, usage_th=?, attribute=?, attribute_th=?, varieties=?, sizes=?, colors=?, price_1=?, price_2=?, price_3=?, price_4=?, price_5=?, moq=?, is_visible=? WHERE id=?"
				).bind(
					dbValue(name), dbValue(name_th), dbValue(description), dbValue(body.description_th || null), activePrice, primaryCategory,
					dbValue(image_key), dbValue(usage), dbValue(body.usage_th || null), dbValue(body.attribute || null), dbValue(body.attribute_th || null), dbValue(varieties), dbValue(sizes), dbValue(colors),
					price_1 ?? 0, price_2 ?? 0, price_3 ?? 0, price_4 ?? 0, price_5 ?? 0, dbValue(moq), is_visible === false ? 0 : 1, id
				).run();

				// Keep the slug in step with a renamed product. The id suffix means
				// the URL stays unique; old links 404 rather than silently mismatching.
				// SKU is read back from the row because the edit form does not always
				// send it, and it is the fallback when the name has no Latin characters.
				const existing = await env.DB.prepare("SELECT sku FROM products WHERE id = ?").bind(id).first() as any;
				await env.DB.prepare("UPDATE products SET slug = ? WHERE id = ?")
					.bind(generateProductSlug(name, existing?.sku || null, id), id).run();

				await saveProductCategories(env, Number(id), categoryList);

				// Update images: simplest way is to delete and re-insert
				if (images && Array.isArray(images)) {
					await env.DB.prepare("DELETE FROM product_images WHERE product_id = ?").bind(id).run();
					for (const img of images) {
						if (!isValidImageKey(img?.image_key)) continue;
						await env.DB.prepare(
							"INSERT INTO product_images (product_id, image_key, attribute_type, attribute_value, is_main, price_1, price_2, price_3, price_4, price_5) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
						).bind(
							id, img.image_key, dbValue(img.attribute_type), dbValue(img.attribute_value), img.is_main ? 1 : 0,
							dbValue(img.price_1), dbValue(img.price_2), dbValue(img.price_3), dbValue(img.price_4), dbValue(img.price_5)
						).run();
					}
				}

				return corsResponse({ success: true });
			}

			if (url.pathname === "/categories" && request.method === "POST") {
				const { name, name_th, path, default_usage, default_use_for } = await request.json() as any;
				await env.DB.prepare(
					"INSERT INTO categories (name, name_th, path, default_usage, default_use_for) VALUES (?, ?, ?, ?, ?)"
				).bind(name, name_th || null, path, default_usage, default_use_for).run();
				return corsResponse({ success: true });
			}

			if (url.pathname === "/diy/products" && request.method === "POST") {
				const body = await request.json() as any;
				const { name, name_th, description, price_1, price_2, price_3, images } = body;

				let seqVal = 0;
				const seqResult = await env.DB.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'diy_products'").first() as any;
				if (seqResult && seqResult.seq !== undefined && seqResult.seq !== null) {
					seqVal = seqResult.seq;
				}
				const sku = body.sku || generateDiySKU(seqVal);

				const serializedImages = JSON.stringify(images || []);

				const { meta } = await env.DB.prepare(
					"INSERT INTO diy_products (name, name_th, description, price_1, price_2, price_3, images, sku) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
				).bind(name, name_th, description, price_1 || 0, price_2 || 0, price_3 || 0, serializedImages, sku).run();

				return corsResponse({ success: true, id: meta.last_row_id, sku });
			}

			if (url.pathname.startsWith("/diy/products/") && request.method === "PUT") {
				const id = url.pathname.split("/diy/products/")[1];
				const body = await request.json() as any;
				const { name, name_th, description, price_1, price_2, price_3, images } = body;

				const serializedImages = JSON.stringify(images || []);

				await env.DB.prepare(
					"UPDATE diy_products SET name=?, name_th=?, description=?, price_1=?, price_2=?, price_3=?, images=? WHERE id=?"
				).bind(name, name_th, description, price_1 || 0, price_2 || 0, price_3 || 0, serializedImages, id).run();

				return corsResponse({ success: true });
			}

			if (request.method === "DELETE") {
				if (url.pathname.startsWith("/products/")) {
					const id = url.pathname.split("/products/")[1];
					const imageKeys = await collectProductImageKeys(env, id);
					await deleteR2Images(env.IMAGES, imageKeys);
					// Set referencing order_items product_id to NULL to preserve order history without violating FK constraints
					await env.DB.prepare("UPDATE order_items SET product_id = NULL WHERE product_id = ?").bind(id).run();
					// Explicitly clean up related images
					await env.DB.prepare("DELETE FROM product_images WHERE product_id = ?").bind(id).run();
					await env.DB.prepare("DELETE FROM product_variants WHERE product_id = ?").bind(id).run();
					// Delete standard product
					await env.DB.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
					return corsResponse({ success: true });
				}
				if (url.pathname.startsWith("/diy/products/")) {
					const id = url.pathname.split("/diy/products/")[1];
					const diyProductId = `diy-${id}`;
					const diyProduct = await env.DB.prepare("SELECT images FROM diy_products WHERE id = ?").bind(id).first() as any;
					const diyImageKeys = new Set<string>();
					if (diyProduct?.images) {
						const images = typeof diyProduct.images === "string" ? JSON.parse(diyProduct.images) : diyProduct.images;
						if (Array.isArray(images)) {
							for (const img of images) {
								if (typeof img === "string" && img) {
									diyImageKeys.add(img);
								}
							}
						}
					}
					await deleteR2Images(env.KIT_IMAGE, diyImageKeys);
					// Set referencing order_items product_id to NULL to preserve order history without violating FK constraints
					await env.DB.prepare("UPDATE order_items SET product_id = NULL WHERE product_id = ?").bind(diyProductId).run();
					// Delete DIY product
					await env.DB.prepare("DELETE FROM diy_products WHERE id = ?").bind(id).run();
					return corsResponse({ success: true });
				}
				if (url.pathname.startsWith("/categories/")) {
					const id = url.pathname.split("/categories/")[1];
					await env.DB.prepare("DELETE FROM categories WHERE id = ?").bind(id).run();
					return corsResponse({ success: true });
				}
			}

			if (url.pathname === "/upload" && request.method === "POST") {
				const formData = await request.formData();
				const files = formData.getAll("file") as File[];
				const results = [];

				for (const file of files) {
					// Respect the filename provided by the client (allows thumb/large suffixes)
					const key = file.name;
					await env.IMAGES.put(key, await file.arrayBuffer(), {
						httpMetadata: { contentType: file.type }
					});
					results.push({ key, success: true });
				}
				
				return corsResponse(results.length === 1 ? results[0] : results);
			}

			if (url.pathname === "/diy/upload" && request.method === "POST") {
				const formData = await request.formData();
				const files = formData.getAll("file") as File[];
				const results = [];

				for (const file of files) {
					const key = file.name;
					await env.KIT_IMAGE.put(key, await file.arrayBuffer(), {
						httpMetadata: { contentType: file.type }
					});
					results.push({ key, success: true });
				}
				
				return corsResponse(results.length === 1 ? results[0] : results);
			}

			if (url.pathname === "/images") {
				const objects = await env.IMAGES.list();
				return corsResponse(objects);
			}



			return corsResponse("Not Found", { status: 404 });
		} catch (e: any) {
			const message = e?.message || "Internal server error";
			const friendly = message.includes("UNIQUE constraint failed: products.sku")
				? "This SKU already exists. Please try again."
				: message.includes("NOT NULL constraint failed: product_images.image_key")
					? "Gallery image is missing its uploaded file. Remove empty gallery slots or re-upload."
					: message;
			return corsResponse({ error: friendly }, { status: 500 });
		}
	},
} satisfies ExportedHandler<Env>;
