// The storefront's public reads (products, projects, gallery) are cached by the
// browser for an hour. A browser cache can't be told "that changed", so the cache
// key has to: callers append ?v=<catalogue version> to those URLs, and every
// successful admin write to that content bumps the number. An edit therefore
// reaches customers on their next page view, not an hour later.
//
// Callers that send no version (an older frontend) keep the short window they had.

export const CATALOG_CACHE_SECONDS = 60 * 60;

// Content whose public reads are cached under a version. Anything else an admin
// writes (orders, uploads, categories) leaves the cached responses unchanged.
const CATALOG_PREFIXES = ["/products", "/projects", "/gallery"];

export function isCatalogWrite(method: string, pathname: string): boolean {
	if (method === "GET" || method === "HEAD" || method === "OPTIONS") return false;
	return CATALOG_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

// A plain integer: anything else is not a version this module ever handed out, so
// it gets no long cache.
const VERSION_PARAM = /^\d{1,12}$/;

// Headers for a public read that may be cached for the full hour, or null when the
// request carries no usable version. Vary: Origin because the CORS header echoes
// the caller's origin, and www and the bare domain share one browser cache.
export function versionedCacheHeaders(url: URL): Record<string, string> | null {
	const v = url.searchParams.get("v");
	if (!v || !VERSION_PARAM.test(v)) return null;
	return { "Cache-Control": `public, max-age=${CATALOG_CACHE_SECONDS}`, "Vary": "Origin" };
}

// null when migrations/0024_catalog_version.sql has not been applied yet. The
// frontend then simply doesn't send a version, so the Worker can ship first.
export async function readCatalogVersion(db: D1Database): Promise<number | null> {
	try {
		const row = await db.prepare("SELECT version FROM catalog_version WHERE id = 1")
			.first<{ version: number }>();
		return row ? Number(row.version) : null;
	} catch {
		return null;
	}
}

// Best effort: the write that triggered this has already succeeded and must not be
// reported as failed because the counter could not move. The worst case is that the
// storefront shows the old content until its cached copy expires.
export async function bumpCatalogVersion(db: D1Database): Promise<void> {
	try {
		await db.prepare(
			`INSERT INTO catalog_version (id, version) VALUES (1, 2)
			 ON CONFLICT(id) DO UPDATE SET version = version + 1`
		).run();
	} catch (error) {
		console.error("Could not bump the catalogue version:", error);
	}
}
