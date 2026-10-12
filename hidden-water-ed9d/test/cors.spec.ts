import { SELF } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { resetDb } from "./helpers/db";

// The browser only accepts a response when Access-Control-Allow-Origin equals the
// page's own origin, so the Worker echoes the origin back when it is on the
// allow-list and otherwise answers with the production domain (which the browser
// then rejects). Pages deployments get their own <hash>.kitweb.pages.dev origin,
// and those must be allowed or a preview build can't log in or load products.

const PRODUCTION = "https://kitcharoensampeng.com";

const preflight = (origin: string) =>
	SELF.fetch("https://example.com/customer/login", {
		method: "OPTIONS",
		headers: { Origin: origin, "Access-Control-Request-Method": "POST" }
	});

const actual = (origin: string) =>
	SELF.fetch("https://example.com/products", { headers: { Origin: origin } });

const allowOrigin = (res: Response) => res.headers.get("Access-Control-Allow-Origin");

describe("CORS allow-list", () => {
	beforeEach(async () => {
		await resetDb();
	});

	it.each([
		PRODUCTION,
		"https://www.kitcharoensampeng.com",
		"http://localhost:5173",
		"https://kitweb.pages.dev",
		"https://82baf8c7.kitweb.pages.dev",
		"https://feature-branch.kitweb.pages.dev"
	])("echoes the allowed origin %s on preflight and on real responses", async (origin) => {
		expect(allowOrigin(await preflight(origin))).toBe(origin);
		expect(allowOrigin(await actual(origin))).toBe(origin);
	});

	it.each([
		"https://evil.example.com",
		"https://kitweb.pages.dev.evil.com",
		"https://evilkitweb.pages.dev",
		"https://a.b.kitweb.pages.dev",
		"http://82baf8c7.kitweb.pages.dev",
		"https://kitcharoensampeng.com.evil.com"
	])("does not echo the foreign origin %s", async (origin) => {
		expect(allowOrigin(await preflight(origin))).toBe(PRODUCTION);
		expect(allowOrigin(await actual(origin))).toBe(PRODUCTION);
	});
});
