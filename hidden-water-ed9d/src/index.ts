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
						categories: parseProductCategories(p.categories, p.category),
						images: typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || [])
					};
				});

				return corsResponse(parsedProducts);
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
				if (!env.EASYSLIP_API_KEY) {
					return corsResponse({ error: "EasySlip API key not configured" }, { status: 500 });
				}
				if (!env.PROMPTPAY_ACCOUNT) {
					return corsResponse({ error: "PromptPay account not configured" }, { status: 500 });
				}

				const formData = await request.formData();
				const customerName = formData.get("customerName") as string;
				const phoneNumber = formData.get("phoneNumber") as string;
				const shippingAddress = formData.get("shippingAddress") as string;
				const totalAmount = parseFloat(formData.get("totalAmount") as string);
				const lineUserId = (formData.get("lineUserId") as string) || "";
				const cartItemsRaw = formData.get("cartItems") as string;
				const slipFile = formData.get("slipImage") as File;

				if (!customerName || !slipFile || isNaN(totalAmount)) {
					return corsResponse({ error: "Missing required fields" }, { status: 400 });
				}

				const cartItems: any[] = JSON.parse(cartItemsRaw || "[]");

				// Convert slip to base64 (stack-safe reduce — do NOT spread Uint8Array)
				const arrayBuffer = await slipFile.arrayBuffer();
				const base64String = btoa(
					new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
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
				if (!receiverAccount.replace(/[-\s]/g, "").includes(env.PROMPTPAY_ACCOUNT.replace(/[-\s]/g, ""))) {
					return corsResponse({ error: "WRONG_ACCOUNT" }, { status: 400 });
				}

				// Check duplicate transaction ref
				const transRef: string =
					slipData?.data?.transRef ?? slipData?.transRef ?? crypto.randomUUID();
				const dupCheck = await env.DB.prepare(
					"SELECT id FROM orders WHERE slip_transaction_ref = ?"
				).bind(transRef).first();
				if (dupCheck) {
					return corsResponse({ error: "DUPLICATE" }, { status: 400 });
				}

				// Generate order ID
				const now = new Date();
				const random = Math.floor(Math.random() * 99999).toString().padStart(5, "0");
				const orderId = `WH-${now.getFullYear()}-${random}`;

				// Upload slip to R2
				const slipKey = `slips/${orderId}-${Date.now()}.jpg`;
				await env.SLIPS.put(slipKey, arrayBuffer, {
					httpMetadata: { contentType: slipFile.type || "image/jpeg" }
				});
				const slipUrl = `slips/${slipKey}`;

				// Persist order to D1
				await env.DB.prepare(
					"INSERT INTO orders (id, customer_name, total_amount, payment_method, note, customer_id, phone_number, shipping_address, slip_url, line_user_id, slip_transaction_ref) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
				).bind(orderId, customerName, totalAmount, "PromptPay", "", null, phoneNumber, shippingAddress, slipUrl, lineUserId || null, transRef).run();

				// Persist order items + update stock
				for (const item of cartItems) {
					const productName = item.name_th || item.name;
					await env.DB.prepare(
						"INSERT INTO order_items (order_id, product_id, product_name, size, color, quantity, price) VALUES (?, ?, ?, ?, ?, ?, ?)"
					).bind(orderId, item.id, productName, item.selectedSize, item.selectedColor, item.quantity, item.price).run();

					const isDiy = typeof item.id === "string" && item.id.startsWith("diy-");
					const dbTable = isDiy ? "diy_products" : "products";
					const productId = isDiy ? parseInt((item.id as string).substring(4), 10) : item.id;

					const p = await env.DB.prepare(`SELECT stock FROM ${dbTable} WHERE id = ?`).bind(productId).first() as any;
					if (p) {
						const newStock = p.stock - item.quantity;
						await env.DB.prepare(`UPDATE ${dbTable} SET stock = ? WHERE id = ?`).bind(newStock, productId).run();
						if (!isDiy) {
							await env.DB.prepare(
								"INSERT INTO stock_history (product_id, admin_id, change_amount, new_stock, reason) VALUES (?, ?, ?, ?, ?)"
							).bind(productId, "SYSTEM", -item.quantity, newStock, `ORDER_${orderId}`).run();
						}
					}
				}

				// Build staff LINE notification (use name_th)
				let lineMsg = `🧾 คำสั่งซื้อใหม่ (เว็บไซต์)\n`;
				lineMsg += `รหัส: ${orderId}\n`;
				lineMsg += `ชื่อ: ${customerName}  โทร: ${phoneNumber}\n`;
				lineMsg += `ที่อยู่: ${shippingAddress}\n\n`;
				cartItems.forEach((item: any, i: number) => {
					const name = item.name_th || item.name;
					lineMsg += `${i + 1}) ${name}\n`;
					lineMsg += `   ขนาด: ${item.selectedSize} | สี: ${item.selectedColor}\n`;
					lineMsg += `   จำนวน: ${item.quantity} ชิ้น × ${item.price} บาท\n`;
					lineMsg += `   รวม: ${(item.price * item.quantity).toFixed(2)} บาท\n\n`;
				});
				lineMsg += `รวมทั้งหมด: ${totalAmount.toFixed(2)} บาท\n`;
				lineMsg += `หลักฐานการโอน: ${slipUrl}`;

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

				// Push an order-confirmation Flex Message to the customer.
				// This opens a 1:1 chat with them in the OA console and delivers their receipt.
				if (lineUserId) {
					const itemRows = cartItems.map((item: any) => {
						const name = item.name_th || item.name;
						const lineTotal = (item.price * item.quantity).toFixed(2);
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
						owner_name: user.owner_name
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
				const { name, name_th, description, price, category, categories, image_key, usage, varieties, sizes, colors, price_1, price_2, price_3, price_4, price_5, moq, is_visible, images, stock } = body;
				const categoryList = normalizeCategoryList(categories, category);
				const primaryCategory = categoryList[0] || category || null;
				const activePrice = price || price_3 || 0;
				const initialStock = stock || 0;
				let productId: number | null = null;

				if (!primaryCategory) {
					return corsResponse({ error: "At least one category is required" }, { status: 400 });
				}

				try {
					const sku = await allocateProductSku(env, primaryCategory, body.sku);

					const { meta } = await env.DB.prepare(
						"INSERT INTO products (name, name_th, description, description_th, price, category, image_key, usage, usage_th, attribute, attribute_th, varieties, sizes, colors, price_1, price_2, price_3, price_4, price_5, moq, is_visible, stock, sku) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
					).bind(
						dbValue(name), dbValue(name_th), dbValue(description), dbValue(body.description_th || null), activePrice, primaryCategory,
						dbValue(image_key), dbValue(usage), dbValue(body.usage_th || null), dbValue(body.attribute || null), dbValue(body.attribute_th || null), dbValue(varieties), dbValue(sizes), dbValue(colors),
						price_1 ?? 0, price_2 ?? 0, price_3 ?? 0, price_4 ?? 0, price_5 ?? 0, dbValue(moq), is_visible === false ? 0 : 1, initialStock, sku
					).run();

					productId = meta.last_row_id;

					if (productId) {
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
				const { name, name_th, description, price, category, categories, image_key, usage, varieties, sizes, colors, price_1, price_2, price_3, price_4, price_5, moq, is_visible, images, stock } = body;
				const categoryList = normalizeCategoryList(categories, category);
				const primaryCategory = categoryList[0] || category || null;
				const activePrice = price_3 || price || 0;

				if (!primaryCategory) {
					return corsResponse({ error: "At least one category is required" }, { status: 400 });
				}

				const currentProduct = await env.DB.prepare("SELECT stock FROM products WHERE id = ?").bind(id).first() as any;

				await env.DB.prepare(
					"UPDATE products SET name=?, name_th=?, description=?, description_th=?, price=?, category=?, image_key=?, usage=?, usage_th=?, attribute=?, attribute_th=?, varieties=?, sizes=?, colors=?, price_1=?, price_2=?, price_3=?, price_4=?, price_5=?, moq=?, is_visible=?, stock=? WHERE id=?"
				).bind(
					dbValue(name), dbValue(name_th), dbValue(description), dbValue(body.description_th || null), activePrice, primaryCategory,
					dbValue(image_key), dbValue(usage), dbValue(body.usage_th || null), dbValue(body.attribute || null), dbValue(body.attribute_th || null), dbValue(varieties), dbValue(sizes), dbValue(colors),
					price_1 ?? 0, price_2 ?? 0, price_3 ?? 0, price_4 ?? 0, price_5 ?? 0, dbValue(moq), is_visible === false ? 0 : 1, stock ?? 0, id
				).run();

				await saveProductCategories(env, Number(id), categoryList);

				if (currentProduct && stock !== undefined && currentProduct.stock !== stock) {
					const change = stock - currentProduct.stock;
					await env.DB.prepare(
						"INSERT INTO stock_history (product_id, admin_id, change_amount, new_stock, reason) VALUES (?, ?, ?, ?, ?)"
					).bind(id, 'admin', change, stock, 'PRODUCT_UPDATE').run();
				}

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

			// Stock Adjustment Endpoint
			if (url.pathname.match(/^\/products\/\d+\/stock$/) && request.method === "POST") {
				const id = url.pathname.split("/")[2];
				const { change, admin_id, reason } = await request.json() as any;

				// 1. Get current stock
				const product = await env.DB.prepare("SELECT stock FROM products WHERE id = ?").bind(id).first() as any;
				if (!product) return corsResponse({ error: "Product not found" }, { status: 404 });

				const newStock = product.stock + change;

				// 2. Update stock
				await env.DB.prepare("UPDATE products SET stock = ? WHERE id = ?").bind(newStock, id).run();

				// 3. Log history
				await env.DB.prepare(
					"INSERT INTO stock_history (product_id, admin_id, change_amount, new_stock, reason) VALUES (?, ?, ?, ?, ?)"
				).bind(id, admin_id, change, newStock, reason || 'MANUAL_ADJUSTMENT').run();

				return corsResponse({ success: true, newStock });
			}

			if (url.pathname === "/diy/products" && request.method === "POST") {
				const body = await request.json() as any;
				const { name, name_th, description, price_1, price_2, price_3, images, stock } = body;
				const initialStock = stock || 0;

				let seqVal = 0;
				const seqResult = await env.DB.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'diy_products'").first() as any;
				if (seqResult && seqResult.seq !== undefined && seqResult.seq !== null) {
					seqVal = seqResult.seq;
				}
				const sku = body.sku || generateDiySKU(seqVal);

				const serializedImages = JSON.stringify(images || []);

				const { meta } = await env.DB.prepare(
					"INSERT INTO diy_products (name, name_th, description, price_1, price_2, price_3, images, stock, sku) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
				).bind(name, name_th, description, price_1 || 0, price_2 || 0, price_3 || 0, serializedImages, initialStock, sku).run();

				return corsResponse({ success: true, id: meta.last_row_id, sku });
			}

			if (url.pathname.startsWith("/diy/products/") && request.method === "PUT") {
				const id = url.pathname.split("/diy/products/")[1];
				const body = await request.json() as any;
				const { name, name_th, description, price_1, price_2, price_3, images, stock } = body;

				const serializedImages = JSON.stringify(images || []);

				await env.DB.prepare(
					"UPDATE diy_products SET name=?, name_th=?, description=?, price_1=?, price_2=?, price_3=?, images=?, stock=? WHERE id=?"
				).bind(name, name_th, description, price_1 || 0, price_2 || 0, price_3 || 0, serializedImages, stock || 0, id).run();

				return corsResponse({ success: true });
			}

			if (request.method === "DELETE") {
				if (url.pathname.startsWith("/products/")) {
					const id = url.pathname.split("/products/")[1];
					const imageKeys = await collectProductImageKeys(env, id);
					await deleteR2Images(env.IMAGES, imageKeys);
					// Set referencing order_items product_id to NULL to preserve order history without violating FK constraints
					await env.DB.prepare("UPDATE order_items SET product_id = NULL WHERE product_id = ?").bind(id).run();
					// Explicitly clean up related images and stock history
					await env.DB.prepare("DELETE FROM product_images WHERE product_id = ?").bind(id).run();
					await env.DB.prepare("DELETE FROM product_variants WHERE product_id = ?").bind(id).run();
					await env.DB.prepare("DELETE FROM stock_history WHERE product_id = ?").bind(id).run();
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
