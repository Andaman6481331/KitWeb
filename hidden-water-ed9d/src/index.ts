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
	AI: any;
	LINE_CHANNEL_ACCESS_TOKEN?: string;
	LINE_NOTIFY_TOKEN?: string;
	LINE_USER_ID?: string;
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

function generateSKU(category: string, countInCategory: number): string {
	const parts = (category || "UK").trim().split(/\s+/);
	let prefix = "";
	if (parts.length >= 2) {
		prefix = (parts[0][0] + parts[1][0]).toUpperCase();
	} else {
		// Use first two letters, pad with 'X' if too short
		prefix = (category || "UK").substring(0, 2).toUpperCase().padEnd(2, 'X');
	}
	const suffix = (countInCategory + 1).toString().padStart(3, '0');
	return `${prefix}${suffix}`;
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
				let query = `
					SELECT 
						p.*,
						(SELECT json_group_array(json_object(
							'id', v.id,
							'variant_name', v.variant_name,
							'sku', v.sku,
							'price_1', v.price_1,
							'price_2', v.price_2,
							'price_3', v.price_3,
							'price_4', v.price_4,
							'price_5', v.price_5,
							'stock', v.stock,
							'image_key', v.image_key,
							'colors', (
								SELECT json_group_array(json_object(
									'id', c.id,
									'color_name', c.color_name,
									'image_key', c.image_key,
									'stock', c.stock
								)) FROM variant_colors c WHERE c.variant_id = v.id
							)
						)) FROM product_variants v WHERE v.product_id = p.id) as variants,
						(SELECT json_group_array(json_object(
							'id', i.id,
							'image_key', i.image_key,
							'attribute_type', i.attribute_type,
							'attribute_value', i.attribute_value,
							'is_main', i.is_main
						)) FROM product_images i WHERE i.product_id = p.id) as images
					FROM products p
				`;
				let params: any[] = [];
				if (category) {
					query += " WHERE p.category = ? ORDER BY p.created_at DESC";
					params.push(category);
				} else {
					query += " ORDER BY p.created_at DESC";
				}
				const { results: products } = await env.DB.prepare(query).bind(...params).all();

				// Map and parse nested JSON
				const parsedProducts = products.map((p: any) => {
					let parsedVariants = [];
					if (typeof p.variants === 'string') {
						try {
							parsedVariants = JSON.parse(p.variants);
							parsedVariants = parsedVariants.map((v: any) => ({
								...v,
								colors: typeof v.colors === 'string' ? JSON.parse(v.colors) : (v.colors || [])
							}));
						} catch (err) {
							console.error("Failed to parse variants JSON:", err);
						}
					}
					return {
						...p,
						images: typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []),
						variants: parsedVariants
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

			if (url.pathname === "/notify" && request.method === "POST") {
				const body = await request.json() as any;
				const { message, orderData } = body;
				const token = env.LINE_CHANNEL_ACCESS_TOKEN || env.LINE_NOTIFY_TOKEN;
				const userId = env.LINE_USER_ID;

				if (!token || !userId) {
					return corsResponse({ error: "LINE Messaging API credentials (LINE_CHANNEL_ACCESS_TOKEN and LINE_USER_ID) not configured" }, { status: 500 });
				}

				// 1. Persist order if orderData is provided
				if (orderData) {
					try {
						const { id, customerName, totalAmount, paymentMethod, note, cartItems } = orderData;

						// Insert order metadata
						await env.DB.prepare(
							"INSERT INTO orders (id, customer_name, total_amount, payment_method, note, customer_id) VALUES (?, ?, ?, ?, ?, ?)"
						).bind(id, customerName, totalAmount, paymentMethod, note, orderData.customerId || null).run();

						// Insert order items and update stock
						for (const item of cartItems) {
							await env.DB.prepare(
								"INSERT INTO order_items (order_id, product_id, product_name, size, color, quantity, price) VALUES (?, ?, ?, ?, ?, ?, ?)"
							).bind(id, item.id, item.name, item.selectedSize, item.selectedColor, item.quantity, item.price).run();

							// Update stock
							const isDiy = typeof item.id === 'string' && item.id.startsWith('diy-');
							const dbTable = isDiy ? 'diy_products' : 'products';
							const productId = isDiy ? parseInt(item.id.substring(4), 10) : item.id;

							const p = await env.DB.prepare(`SELECT stock FROM ${dbTable} WHERE id = ?`).bind(productId).first() as any;
							if (p) {
								const newStock = p.stock - item.quantity;
								await env.DB.prepare(`UPDATE ${dbTable} SET stock = ? WHERE id = ?`).bind(newStock, productId).run();

								// Log history
								if (!isDiy) {
									await env.DB.prepare(
										"INSERT INTO stock_history (product_id, admin_id, change_amount, new_stock, reason) VALUES (?, ?, ?, ?, ?)"
									).bind(productId, 'SYSTEM', -item.quantity, newStock, `ORDER_${id}`).run();
								}
							}
						}
					} catch (dbError: any) {
						console.error("Database error saving order:", dbError);
						// We continue with notification even if DB fails for now, 
						// but in production you might want to handle this more strictly.
					}
				}

				// 2. Send LINE Notification using Messaging API
				const response = await fetch("https://api.line.me/v2/bot/message/push", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Authorization": `Bearer ${token}`
					},
					body: JSON.stringify({
						to: userId,
						messages: [
							{
								type: "text",
								text: message
							}
						]
					})
				});

				const result = await response.json().catch(() => ({})) as any;
				console.log("LINE API Response:", { status: response.status, result });
				return corsResponse({ success: response.ok, ...result, persisted: !!orderData }, { status: response.status });
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

			if (url.pathname === "/products/next-sku" && request.method === "GET") {
				const category = url.searchParams.get("category");
				if (!category) return corsResponse({ error: "Category is required" }, { status: 400 });
				const { count } = await env.DB.prepare("SELECT COUNT(*) as count FROM products WHERE category = ?").bind(category).first() as any;
				const sku = generateSKU(category, count || 0);
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
				const { name, name_th, description, price, category, image_key, usage, use_for, varieties, sizes, colors, price_1, price_2, price_3, price_4, price_5, images, stock, variants } = body;
				const activePrice = price || price_3 || 0;
				const initialStock = stock || 0;

				// Generate SKU
				const { count } = await env.DB.prepare("SELECT COUNT(*) as count FROM products WHERE category = ?").bind(category).first() as any;
				const sku = body.sku || generateSKU(category, count || 0);

				const { meta } = await env.DB.prepare(
					"INSERT INTO products (name, name_th, description, price, category, image_key, usage, use_for, varieties, sizes, colors, price_1, price_2, price_3, price_4, price_5, stock, sku) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
				).bind(name, name_th, description, activePrice, category, image_key, usage, use_for, varieties, sizes, colors, price_1, price_2, price_3, price_4, price_5, initialStock, sku).run();

				const productId = meta.last_row_id;

				if (images && Array.isArray(images) && productId) {
					for (const img of images) {
						await env.DB.prepare(
							"INSERT INTO product_images (product_id, image_key, attribute_type, attribute_value, is_main) VALUES (?, ?, ?, ?, ?)"
						).bind(productId, img.image_key, img.attribute_type, img.attribute_value, img.is_main ? 1 : 0).run();
					}
				}

				// Save new structured variants & variant colors
				if (variants && Array.isArray(variants) && productId) {
					for (const v of variants) {
						const vResult = await env.DB.prepare(
							"INSERT INTO product_variants (product_id, variant_name, sku, price_1, price_2, price_3, price_4, price_5, stock, image_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
						).bind(productId, v.variant_name, v.sku, v.price_1 || 0, v.price_2 || 0, v.price_3 || 0, v.price_4 || 0, v.price_5 || 0, v.stock || 0, v.image_key || null).run();

						const variantId = vResult.meta.last_row_id;

						if (v.colors && Array.isArray(v.colors) && variantId) {
							for (const c of v.colors) {
								await env.DB.prepare(
									"INSERT INTO variant_colors (variant_id, color_name, image_key, stock) VALUES (?, ?, ?, ?)"
								).bind(variantId, c.color_name, c.image_key || null, c.stock || 0).run();
							}
						}
					}
				}

				return corsResponse({ success: true, id: productId });
			}

			if (url.pathname.startsWith("/products/") && request.method === "PUT") {
				const id = url.pathname.split("/products/")[1];
				const body = await request.json() as any;
				const { name, name_th, description, price, category, image_key, usage, use_for, varieties, sizes, colors, price_1, price_2, price_3, price_4, price_5, images, stock, variants } = body;
				const activePrice = price_3 || price || 0;

				const currentProduct = await env.DB.prepare("SELECT stock FROM products WHERE id = ?").bind(id).first() as any;

				await env.DB.prepare(
					"UPDATE products SET name=?, name_th=?, description=?, price=?, category=?, image_key=?, usage=?, use_for=?, varieties=?, sizes=?, colors=?, price_1=?, price_2=?, price_3=?, price_4=?, price_5=?, stock=? WHERE id=?"
				).bind(name, name_th, description, activePrice, category, image_key, usage, use_for, varieties, sizes, colors, price_1, price_2, price_3, price_4, price_5, stock, id).run();

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
						await env.DB.prepare(
							"INSERT INTO product_images (product_id, image_key, attribute_type, attribute_value, is_main) VALUES (?, ?, ?, ?, ?)"
						).bind(id, img.image_key, img.attribute_type, img.attribute_value, img.is_main ? 1 : 0).run();
					}
				}

				// Update variants & variant colors: delete and re-insert
				if (variants && Array.isArray(variants)) {
					// Delete existing variants (will cascade delete variant_colors)
					await env.DB.prepare("DELETE FROM product_variants WHERE product_id = ?").bind(id).run();

					for (const v of variants) {
						const vResult = await env.DB.prepare(
							"INSERT INTO product_variants (product_id, variant_name, sku, price_1, price_2, price_3, price_4, price_5, stock, image_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
						).bind(id, v.variant_name, v.sku, v.price_1 || 0, v.price_2 || 0, v.price_3 || 0, v.price_4 || 0, v.price_5 || 0, v.stock || 0, v.image_key || null).run();

						const variantId = vResult.meta.last_row_id;

						if (v.colors && Array.isArray(v.colors) && variantId) {
							for (const c of v.colors) {
								await env.DB.prepare(
									"INSERT INTO variant_colors (variant_id, color_name, image_key, stock) VALUES (?, ?, ?, ?)"
								).bind(variantId, c.color_name, c.image_key || null, c.stock || 0).run();
							}
						}
					}
				}

				return corsResponse({ success: true });
			}

			if (url.pathname === "/categories" && request.method === "POST") {
				const { name, path, default_usage, default_use_for } = await request.json() as any;
				await env.DB.prepare("INSERT INTO categories (name, path, default_usage, default_use_for) VALUES (?, ?, ?, ?)").bind(name, path, default_usage, default_use_for).run();
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
					// Set referencing order_items product_id to NULL to preserve order history without violating FK constraints
					await env.DB.prepare("UPDATE order_items SET product_id = NULL WHERE product_id = ?").bind(id).run();
					// Explicitly clean up related images and stock history
					await env.DB.prepare("DELETE FROM product_images WHERE product_id = ?").bind(id).run();
					await env.DB.prepare("DELETE FROM stock_history WHERE product_id = ?").bind(id).run();
					// Delete standard product
					await env.DB.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
					return corsResponse({ success: true });
				}
				if (url.pathname.startsWith("/diy/products/")) {
					const id = url.pathname.split("/diy/products/")[1];
					const diyProductId = `diy-${id}`;
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
			return corsResponse({ error: e.message }, { status: 500 });
		}
	},
} satisfies ExportedHandler<Env>;
