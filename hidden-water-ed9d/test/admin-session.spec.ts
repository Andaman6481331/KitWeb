import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { ADMIN_TEST_TOKEN, resetDb } from "./helpers/db";

const login = (password: string) =>
	SELF.fetch("https://example.com/admin/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ password })
	});

// POST /projects is a protected route; with a valid session it reaches validation (400)
// instead of the auth check (401).
const callProtected = (authorization: string) =>
	SELF.fetch("https://example.com/projects", {
		method: "POST",
		headers: { "Content-Type": "application/json", "Authorization": authorization },
		body: JSON.stringify({})
	});

describe("admin-only reads", () => {
	beforeEach(resetDb);

	it("hides include_hidden products from anonymous callers", async () => {
		const res = await SELF.fetch("https://example.com/products?include_hidden=1");
		expect(res.status).toBe(401);
	});

	// The test DB only has the product tables, so a request that passes the gate can
	// still 500 on other tables. These assert only that the gate lets it through.
	it("lets a valid admin session past the gate", async () => {
		const res = await SELF.fetch("https://example.com/products?include_hidden=1", {
			headers: { "Authorization": ADMIN_TEST_TOKEN }
		});
		expect(res.status).not.toBe(401);
	});

	it("keeps the storefront product list public", async () => {
		const res = await SELF.fetch("https://example.com/products");
		expect(res.status).not.toBe(401);
	});

	it("gates include_unpublished on projects and business sets", async () => {
		expect((await SELF.fetch("https://example.com/projects?include_unpublished=1")).status).toBe(401);
		expect((await SELF.fetch("https://example.com/business-sets?include_unpublished=1")).status).toBe(401);
		expect((await SELF.fetch("https://example.com/projects")).status).not.toBe(401);
	});

	it("gates include_hidden on the gallery", async () => {
		expect((await SELF.fetch("https://example.com/gallery?include_hidden=1")).status).toBe(401);
		expect((await SELF.fetch("https://example.com/gallery")).status).not.toBe(401);
	});
});

describe("admin login sessions", () => {
	beforeEach(resetDb);

	it("returns a random session token, never the password itself", async () => {
		const res = await login(env.ADMIN_PASSWORD as string);
		const body = await res.json() as any;
		expect(res.status).toBe(200);
		expect(body.success).toBe(true);
		expect(body.token).toBeTruthy();
		expect(body.token).not.toBe(env.ADMIN_PASSWORD);
	});

	it("rejects a wrong password", async () => {
		const res = await login("not-the-password");
		expect(res.status).toBe(401);
	});

	it("rejects an empty password even if the secret were empty", async () => {
		const res = await login("");
		expect(res.status).toBe(401);
	});

	it("accepts the issued session token on protected routes", async () => {
		const body = await (await login(env.ADMIN_PASSWORD as string)).json() as any;
		expect((await callProtected(body.token)).status).toBe(400);
		expect((await callProtected(`Bearer ${body.token}`)).status).toBe(400);
	});

	it("no longer accepts the raw password as a bearer credential", async () => {
		expect((await callProtected(env.ADMIN_PASSWORD as string)).status).toBe(401);
	});

	it("stops working after logout", async () => {
		const body = await (await login(env.ADMIN_PASSWORD as string)).json() as any;
		const out = await SELF.fetch("https://example.com/admin/logout", {
			method: "POST",
			headers: { "Authorization": body.token }
		});
		expect(out.status).toBe(200);
		expect((await callProtected(body.token)).status).toBe(401);
	});

	it("rejects a session past its expiry", async () => {
		const body = await (await login(env.ADMIN_PASSWORD as string)).json() as any;
		await env.DB.prepare("UPDATE admin_sessions SET expires_at = ?").bind(Date.now() - 1).run();
		expect((await callProtected(body.token)).status).toBe(401);
	});

	it("stores only a hash of the session token", async () => {
		const body = await (await login(env.ADMIN_PASSWORD as string)).json() as any;
		const rows = await env.DB.prepare("SELECT token_hash FROM admin_sessions").all();
		const hashes = rows.results.map((r: any) => r.token_hash);
		expect(hashes).not.toContain(body.token);
	});
});
