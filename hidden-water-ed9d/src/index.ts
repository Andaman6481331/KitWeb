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
			newResp.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
			newResp.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
			return newResp;
		};

		// 1. Handle CORS Preflight
		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
				const { results } = await env.DB.prepare(query).bind(...params).all();
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
				const { name, description, price, category, image_key, usage, use_for, varieties, sizes, colors, price_1, price_2, price_3, price_4, price_5 } = await request.json() as any;
				// Default 'price' to price_3 if not provided
				const activePrice = price || price_3 || 0;
				await env.DB.prepare(
					"INSERT INTO products (name, description, price, category, image_key, usage, use_for, varieties, sizes, colors, price_1, price_2, price_3, price_4, price_5) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
				).bind(name, description, activePrice, category, image_key, usage, use_for, varieties, sizes, colors, price_1, price_2, price_3, price_4, price_5).run();
				return corsResponse({ success: true });
			}

			if (url.pathname.startsWith("/products/") && request.method === "PUT") {
				const id = url.pathname.split("/products/")[1];
				const { name, description, price, category, image_key, usage, use_for, varieties, sizes, colors, price_1, price_2, price_3, price_4, price_5 } = await request.json() as any;
				const activePrice = price_3 || price || 0;
				await env.DB.prepare(
					"UPDATE products SET name=?, description=?, price=?, category=?, image_key=?, usage=?, use_for=?, varieties=?, sizes=?, colors=?, price_1=?, price_2=?, price_3=?, price_4=?, price_5=? WHERE id=?"
				).bind(name, description, activePrice, category, image_key, usage, use_for, varieties, sizes, colors, price_1, price_2, price_3, price_4, price_5, id).run();
				return corsResponse({ success: true });
			}

			if (url.pathname.startsWith("/products/") && request.method === "DELETE") {
				const id = url.pathname.split("/products/")[1];
				await env.DB.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
				return corsResponse({ success: true });
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

			return corsResponse("Not Found", { status: 404 });
		} catch (e: any) {
			return corsResponse({ error: e.message }, { status: 500 });
		}
	},
} satisfies ExportedHandler<Env>;
