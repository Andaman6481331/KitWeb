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

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);

		// Helper to wrap responses with CORS
		const corsResponse = (body: any, init?: ResponseInit) => {
			let resp: Response;
			if (body instanceof Response) {
				resp = body;
			} else if (body === null) {
				resp = new Response(null, init);
			} else {
				resp = Response.json(body, init);
			}

			const newResp = new Response(resp.body, resp);
			newResp.headers.set("Access-Control-Allow-Origin", "*");
			newResp.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
			newResp.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
			return newResp;
		};

		// 1. Handle CORS Preflight
		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type, Authorization",
					"Access-Control-Max-Age": "86400",
				},
			});
		}

		try {
			// 1. PUBLIC ROUTES
			if (url.pathname === "/products" && request.method === "GET") {
				const category = url.searchParams.get("category");
				let query = "SELECT * FROM products";
				let params: any[] = [];
				if (category) {
					query += " WHERE category = ? ORDER BY created_at DESC";
					params.push(category);
				} else {
					query += " ORDER BY created_at DESC";
				}
				const { results: products } = await env.DB.prepare(query).bind(...params).all();

				// Fetch associated images
				const productIds = products.map((p: any) => p.id);
				let images: any[] = [];
				if (productIds.length > 0) {
					const placeholders = productIds.map(() => "?").join(",");
					const { results: imageResults } = await env.DB.prepare(
						`SELECT * FROM product_images WHERE product_id IN (${placeholders})`
					).bind(...productIds).all();
					images = imageResults;
				}

				// Map images to products
				const productsWithImages = products.map((p: any) => ({
					...p,
					images: images.filter((img: any) => img.product_id === p.id)
				}));

				return corsResponse(productsWithImages);
			}

			if (url.pathname === "/categories" && request.method === "GET") {
				const { results } = await env.DB.prepare("SELECT * FROM categories ORDER BY name ASC").all();
				return corsResponse(results);
			}

			if (url.pathname.startsWith("/images/") && request.method === "GET") {
				const key = decodeURIComponent(url.pathname.split("/images/")[1]);
				const object = await env.IMAGES.get(key);
				if (!object) return corsResponse("Not Found", { status: 404 });
				const headers = new Headers();
				object.writeHttpMetadata(headers);
				headers.set("Access-Control-Allow-Origin", "*");
				return new Response(object.body, { headers });
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
							"INSERT INTO orders (id, customer_name, total_amount, payment_method, note) VALUES (?, ?, ?, ?, ?)"
						).bind(id, customerName, totalAmount, paymentMethod, note).run();

						// Insert order items and update stock
						for (const item of cartItems) {
							await env.DB.prepare(
								"INSERT INTO order_items (order_id, product_id, product_name, size, color, quantity, price) VALUES (?, ?, ?, ?, ?, ?, ?)"
							).bind(id, item.id, item.name, item.selectedSize, item.selectedColor, item.quantity, item.price).run();

							// Update stock
							const p = await env.DB.prepare("SELECT stock FROM products WHERE id = ?").bind(item.id).first() as any;
							if (p) {
								const newStock = p.stock - item.quantity;
								await env.DB.prepare("UPDATE products SET stock = ? WHERE id = ?").bind(newStock, item.id).run();

								// Log history
								await env.DB.prepare(
									"INSERT INTO stock_history (product_id, admin_id, change_amount, new_stock, reason) VALUES (?, ?, ?, ?, ?)"
								).bind(item.id, 'SYSTEM', -item.quantity, newStock, `ORDER_${id}`).run();
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

			// 3. PROTECTED ROUTES
			const auth = request.headers.get("Authorization");
			if (auth !== (env.ADMIN_PASSWORD || "").trim()) {
				return corsResponse("Unauthorized", { status: 401 });
			}

			if (url.pathname === "/products" && request.method === "POST") {
				const body = await request.json() as any;
				const { name, description, price, category, image_key, usage, use_for, varieties, sizes, colors, price_1, price_2, price_3, price_4, price_5, images, stock } = body;
				const activePrice = price || price_3 || 0;
				const initialStock = stock || 0;

				const { meta } = await env.DB.prepare(
					"INSERT INTO products (name, description, price, category, image_key, usage, use_for, varieties, sizes, colors, price_1, price_2, price_3, price_4, price_5, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
				).bind(name, description, activePrice, category, image_key, usage, use_for, varieties, sizes, colors, price_1, price_2, price_3, price_4, price_5, initialStock).run();

				const productId = meta.last_row_id;

				if (images && Array.isArray(images) && productId) {
					for (const img of images) {
						await env.DB.prepare(
							"INSERT INTO product_images (product_id, image_key, attribute_type, attribute_value, is_main) VALUES (?, ?, ?, ?, ?)"
						).bind(productId, img.image_key, img.attribute_type, img.attribute_value, img.is_main ? 1 : 0).run();
					}
				}

				return corsResponse({ success: true, id: productId });
			}

			if (url.pathname.startsWith("/products/") && request.method === "PUT") {
				const id = url.pathname.split("/products/")[1];
				const body = await request.json() as any;
				const { name, description, price, category, image_key, usage, use_for, varieties, sizes, colors, price_1, price_2, price_3, price_4, price_5, images, stock } = body;
				const activePrice = price_3 || price || 0;

				const currentProduct = await env.DB.prepare("SELECT stock FROM products WHERE id = ?").bind(id).first() as any;

				await env.DB.prepare(
					"UPDATE products SET name=?, description=?, price=?, category=?, image_key=?, usage=?, use_for=?, varieties=?, sizes=?, colors=?, price_1=?, price_2=?, price_3=?, price_4=?, price_5=?, stock=? WHERE id=?"
				).bind(name, description, activePrice, category, image_key, usage, use_for, varieties, sizes, colors, price_1, price_2, price_3, price_4, price_5, stock, id).run();

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

			if (request.method === "DELETE") {
				if (url.pathname.startsWith("/products/")) {
					const id = url.pathname.split("/products/")[1];
					await env.DB.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
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
				const file = formData.get("file") as File;
				const key = `${Date.now()}-${file.name}`;
				await env.IMAGES.put(key, await file.arrayBuffer(), {
					httpMetadata: { contentType: file.type }
				});
				return corsResponse({ key, success: true });
			}

			if (url.pathname === "/images") {
				const objects = await env.IMAGES.list();
				return corsResponse(objects);
			}

			if (url.pathname === "/orders" && request.method === "GET") {
				const { results: orders } = await env.DB.prepare(
					"SELECT * FROM orders ORDER BY created_at DESC"
				).all();

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


			return corsResponse("Not Found", { status: 404 });
		} catch (e: any) {
			return corsResponse({ error: e.message }, { status: 500 });
		}
	},
} satisfies ExportedHandler<Env>;
