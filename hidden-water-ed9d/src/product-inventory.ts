// Sizes, colors and stock for the admin product editor.
//
// The editor models a product as sizes -> colors, but the storefront still reads the
// flat legacy fields (products.price_1..5 and the variant_link rows in product_images).
// Everything that turns the first shape into the second lives in this file, so there is
// one place to read when a price on the website looks wrong. Nothing here DELETEs a row:
// removed sizes and colors are archived (the owner's no-delete rule).

export const MAX_SIZES = 30;
export const MAX_COLORS_PER_SIZE = 40;
export const MAX_COLORS_TOTAL = 200;
const MAX_LABEL = 60;
const MAX_SKU = 64;
const LEVELS = 5;
// D1 allows at most 100 bound parameters per statement.
const IDS_PER_STATEMENT = 90;

export interface ColorInput {
	ref: string;
	id: number | null;
	name: string;
	name_th: string | null;
	hex: string | null;
	sku: string | null;
	stock: number;
	stock_loaded: number;
	is_visible: boolean;
	sort_order: number;
}

export interface SizeInput {
	ref: string;
	id: number | null;
	label: string;
	label_th: string | null;
	sort_order: number;
	box_cost: number | null;
	// Per BOX, level 1..5; null = not set.
	prices: (number | null)[];
	colors: ColorInput[];
}

export interface InventoryInput {
	sizes: SizeInput[];
	// Optional override for the product-level base prices (see mirrorBasePrices).
	base_prices: (number | null)[] | null;
}

export interface MirroredImage {
	image_key: string;
	is_main: 0 | 1;
	attribute_type: string | null;
	attribute_value: string | null;
	prices: (number | null)[];
}

export type Checked<T> = { ok: true; value: T } | { ok: false; status: 400 | 409; error: string };

/** A failure that should reach the caller as a plain 400/409 instead of a 500. */
export class InventoryError extends Error {
	status: 400 | 409;
	constructor(message: string, status: 400 | 409) {
		super(message);
		this.status = status;
	}
}

const fail = (error: string, status: 400 | 409 = 400): { ok: false; status: 400 | 409; error: string } =>
	({ ok: false, status, error });

const cleanText = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const nullableText = (v: unknown): string | null => cleanText(v) || null;

// null = blank, undefined = invalid. Accepts numbers and numeric strings; a price or cost
// is never negative.
function money(v: unknown): number | null | undefined {
	if (v === null || v === undefined || v === "") return null;
	const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
	return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function chunk<T>(items: T[], size = IDS_PER_STATEMENT): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
	return out;
}

const placeholders = (n: number) => new Array(n).fill("?").join(",");

function parsePrices(raw: unknown, what: string): { ok: true; value: (number | null)[] } | { ok: false; error: string } {
	const list = Array.isArray(raw) ? raw : [];
	if (list.length > LEVELS) return { ok: false, error: `${what} has more than ${LEVELS} prices` };
	const prices: (number | null)[] = [];
	for (let i = 0; i < LEVELS; i++) {
		const p = money(list[i]);
		if (p === undefined) return { ok: false, error: `${what}: level ${i + 1} must be a number of 0 or more` };
		prices.push(p);
	}
	return { ok: true, value: prices };
}

const optionalId = (v: unknown): number | null | undefined =>
	v === null || v === undefined ? null : Number.isInteger(v) && (v as number) > 0 ? (v as number) : undefined;

export function validateInventory(raw: unknown): Checked<InventoryInput> {
	const input = raw as any;
	if (!input || typeof input !== "object" || !Array.isArray(input.sizes)) return fail("inventory.sizes must be an array");
	if (input.sizes.length === 0) return fail("A product needs at least one size");
	if (input.sizes.length > MAX_SIZES) return fail(`A product can have at most ${MAX_SIZES} sizes`);

	const refs = new Set<string>();
	const labels = new Set<string>();
	const skus = new Set<string>();
	let colorTotal = 0;
	const sizes: SizeInput[] = [];

	for (let si = 0; si < input.sizes.length; si++) {
		const s = input.sizes[si];
		if (!s || typeof s !== "object") return fail("Each size must be an object");

		const ref = cleanText(s.ref);
		if (!ref || refs.has(ref)) return fail("Each size needs a unique ref");
		refs.add(ref);

		const label = cleanText(s.label);
		if (!label || label.length > MAX_LABEL) return fail(`A size label is required and can be at most ${MAX_LABEL} characters`);
		if (labels.has(label)) return fail(`Size "${label}" appears twice`);
		labels.add(label);

		const id = optionalId(s.id);
		if (id === undefined) return fail(`Size "${label}" has an invalid id`);

		const cost = money(s.box_cost);
		if (cost === undefined) return fail(`Factory cost of "${label}" must be a number of 0 or more`);

		const prices = parsePrices(s.prices, `Size "${label}"`);
		if (!prices.ok) return fail(prices.error);

		const rawColors = Array.isArray(s.colors) ? s.colors : [];
		if (rawColors.length === 0) return fail(`Size "${label}" needs at least one color`);
		if (rawColors.length > MAX_COLORS_PER_SIZE) return fail(`A size can have at most ${MAX_COLORS_PER_SIZE} colors`);
		colorTotal += rawColors.length;
		if (colorTotal > MAX_COLORS_TOTAL) return fail(`A product can have at most ${MAX_COLORS_TOTAL} colors`);

		const names = new Set<string>();
		const colors: ColorInput[] = [];
		for (let ci = 0; ci < rawColors.length; ci++) {
			const c = rawColors[ci];
			if (!c || typeof c !== "object") return fail("Each color must be an object");

			const cref = cleanText(c.ref);
			if (!cref || refs.has(cref)) return fail("Each color needs a unique ref");
			refs.add(cref);

			const name = cleanText(c.name);
			if (!name || name.length > MAX_LABEL) return fail(`A color name is required and can be at most ${MAX_LABEL} characters`);
			if (names.has(name)) return fail(`Color "${name}" appears twice in size "${label}"`);
			names.add(name);

			const cid = optionalId(c.id);
			if (cid === undefined) return fail(`Color "${name}" has an invalid id`);

			const hex = nullableText(c.hex);
			if (hex !== null && !/^#[0-9a-fA-F]{6}$/.test(hex)) return fail(`Color "${name}" has an invalid swatch color`);

			const sku = nullableText(c.sku);
			if (sku !== null) {
				if (sku.length > MAX_SKU) return fail(`SKU ${sku.slice(0, 20)}… is longer than ${MAX_SKU} characters`);
				if (skus.has(sku)) return fail(`SKU ${sku} is used twice in this product`, 409);
				skus.add(sku);
			}

			if (typeof c.stock !== "number" || !Number.isInteger(c.stock) || Math.abs(c.stock) > 1_000_000_000) {
				return fail(`Stock of "${name}" must be a whole number`);
			}
			let stockLoaded = 0;
			if (cid !== null) {
				if (typeof c.stock_loaded !== "number" || !Number.isInteger(c.stock_loaded)) {
					return fail(`Color "${name}" must say which stock it was edited from (stock_loaded)`);
				}
				stockLoaded = c.stock_loaded;
			}

			colors.push({
				ref: cref, id: cid, name, name_th: nullableText(c.name_th), hex, sku,
				stock: c.stock, stock_loaded: stockLoaded, is_visible: c.is_visible !== false,
				sort_order: Number.isInteger(c.sort_order) ? c.sort_order : ci
			});
		}

		sizes.push({
			ref, id, label, label_th: nullableText(s.label_th),
			sort_order: Number.isInteger(s.sort_order) ? s.sort_order : si,
			box_cost: cost, prices: prices.value, colors
		});
	}

	let basePrices: (number | null)[] | null = null;
	if (input.base_prices !== undefined && input.base_prices !== null) {
		const parsed = parsePrices(input.base_prices, "base_prices");
		if (!parsed.ok) return fail(parsed.error);
		basePrices = parsed.value;
	}

	return { ok: true, value: { sizes, base_prices: basePrices } };
}

/**
 * products.price_1..5 for the storefront: the first size's box prices (or the editor's
 * explicit base_prices), with blanks written as 0 exactly as the current save does.
 */
export function mirrorBasePrices(inv: InventoryInput): number[] {
	const first = [...inv.sizes].sort((a, b) => a.sort_order - b.sort_order)[0];
	return (inv.base_prices ?? first.prices).map((p) => p ?? 0);
}

const numberOrNull = (v: unknown): number | null => {
	if (v === null || v === undefined || v === "") return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
};

/**
 * product_images rows for the storefront. An image attributed to a size becomes a
 * variant_link row labelled "<color> / <size>" (or just "<size>") that carries the size's
 * box prices; an image attributed only to a color is labelled with the color and carries no
 * prices (so the base prices apply); everything else, including photos of a hidden color,
 * is a plain gallery photo. A legacy row the editor could not attribute is passed through.
 */
export function mirrorImages(inv: InventoryInput, images: unknown[]): Checked<MirroredImage[]> {
	const sizeByRef = new Map(inv.sizes.map((s) => [s.ref, s]));
	const out: MirroredImage[] = [];
	const noPrices = () => new Array<number | null>(LEVELS).fill(null);

	for (const raw of images) {
		const img = (raw ?? {}) as Record<string, unknown>;
		const key = typeof img.image_key === "string" ? img.image_key : "";
		if (!key.trim()) continue;
		const is_main: 0 | 1 = img.is_main ? 1 : 0;

		if (img.passthrough === true) {
			out.push({
				image_key: key, is_main,
				attribute_type: nullableText(img.attribute_type),
				attribute_value: typeof img.attribute_value === "string" ? img.attribute_value : null,
				prices: [1, 2, 3, 4, 5].map((n) => numberOrNull(img[`price_${n}`]))
			});
			continue;
		}

		const sizeRef = nullableText(img.size_ref);
		const colorName = nullableText(img.color_name);

		let size: SizeInput | null = null;
		if (sizeRef) {
			size = sizeByRef.get(sizeRef) ?? null;
			if (!size) return fail("An image points at a size that is not in this product");
		}

		let colorVisible = true;
		if (colorName) {
			const pool = size ? [size] : inv.sizes;
			const matches = pool.flatMap((s) => s.colors.filter((c) => c.name === colorName));
			if (matches.length === 0) return fail(`An image points at the color "${colorName}", which is not in this product`);
			// A color shown in at least one size keeps its photos on the website.
			colorVisible = matches.some((c) => c.is_visible);
		}

		if (!colorVisible || (!size && !colorName)) {
			out.push({ image_key: key, is_main, attribute_type: "gallery", attribute_value: null, prices: noPrices() });
		} else if (size) {
			out.push({
				image_key: key, is_main, attribute_type: "variant_link",
				attribute_value: colorName ? `${colorName} / ${size.label}` : size.label,
				prices: [...size.prices]
			});
		} else {
			out.push({ image_key: key, is_main, attribute_type: "variant_link", attribute_value: colorName, prices: noPrices() });
		}
	}

	return { ok: true, value: out };
}

// ── Database layer ──────────────────────────────────────────────────────────

export interface ExistingInventory {
	sizeIds: Set<number>;
	// color id -> the id of the size it currently belongs to
	colorSizes: Map<number, number>;
}

export interface PreparedInventory {
	inventory: InventoryInput;
	existing: ExistingInventory;
	// null = the request carried no images, so the product's images are left alone
	images: MirroredImage[] | null;
	basePrices: number[];
}

export async function loadExisting(db: D1Database, productId: number): Promise<ExistingInventory> {
	const [sizes, colors] = await db.batch([
		db.prepare("SELECT id FROM product_sizes WHERE product_id = ? AND archived_at IS NULL").bind(productId),
		db.prepare(
			`SELECT c.id, c.size_id FROM product_colors c
			 JOIN product_sizes s ON s.id = c.size_id
			 WHERE s.product_id = ? AND s.archived_at IS NULL AND c.archived_at IS NULL`
		).bind(productId)
	]);
	return {
		sizeIds: new Set((sizes.results as any[]).map((r) => r.id as number)),
		colorSizes: new Map((colors.results as any[]).map((r) => [r.id as number, r.size_id as number]))
	};
}

// A SKU may stay on the color that already has it, or move off a color this save archives;
// it may not take a SKU from a live color of any other product.
async function findSkuClash(db: D1Database, existing: ExistingInventory, inv: InventoryInput): Promise<string | null> {
	const skus = inv.sizes.flatMap((s) => s.colors.map((c) => c.sku)).filter((sku): sku is string => !!sku);
	for (const part of chunk(skus)) {
		const { results } = await db
			.prepare(`SELECT id, sku FROM product_colors WHERE archived_at IS NULL AND sku IN (${placeholders(part.length)})`)
			.bind(...part)
			.all<{ id: number; sku: string }>();
		const foreign = results.find((r) => !existing.colorSizes.has(r.id));
		if (foreign) return foreign.sku;
	}
	return null;
}

/**
 * Everything that can reject a request, done before the caller writes anything: shape,
 * ownership of the ids, SKU clashes, and resolving every image to its label. The caller
 * passes productId = null when the product does not exist yet.
 */
export async function prepareInventory(
	db: D1Database,
	productId: number | null,
	rawInventory: unknown,
	rawImages: unknown
): Promise<Checked<PreparedInventory>> {
	const checked = validateInventory(rawInventory);
	if (!checked.ok) return checked;
	const inventory = checked.value;

	const existing: ExistingInventory = productId === null
		? { sizeIds: new Set(), colorSizes: new Map() }
		: await loadExisting(db, productId);

	for (const s of inventory.sizes) {
		if (s.id !== null && !existing.sizeIds.has(s.id)) return fail(`Size "${s.label}" does not belong to this product`);
		for (const c of s.colors) {
			if (c.id !== null && (s.id === null || existing.colorSizes.get(c.id) !== s.id)) {
				return fail(`Color "${c.name}" does not belong to size "${s.label}"`);
			}
		}
	}

	const clash = await findSkuClash(db, existing, inventory);
	if (clash) return fail(`SKU ${clash} is already used by another color`, 409);

	let images: MirroredImage[] | null = null;
	if (Array.isArray(rawImages)) {
		const mirrored = mirrorImages(inventory, rawImages);
		if (!mirrored.ok) return mirrored;
		images = mirrored.value;
	}

	return { ok: true, value: { inventory, existing, images, basePrices: mirrorBasePrices(inventory) } };
}

/**
 * The writes for one save, in an order that lets a save reuse a label or SKU that a row
 * it removes was holding: archive first, then update, then insert. Run them with
 * applyInventory so they land as one atomic batch.
 */
export function inventoryStatements(db: D1Database, productId: number, prepared: PreparedInventory): D1PreparedStatement[] {
	const { inventory, existing, images } = prepared;
	const statements: D1PreparedStatement[] = [];

	const keepSizes = new Set(inventory.sizes.flatMap((s) => (s.id === null ? [] : [s.id])));
	const keepColors = new Set(inventory.sizes.flatMap((s) => s.colors.flatMap((c) => (c.id === null ? [] : [c.id]))));
	const dropColors = [...existing.colorSizes.keys()].filter((id) => !keepColors.has(id));
	const dropSizes = [...existing.sizeIds].filter((id) => !keepSizes.has(id));

	for (const part of chunk(dropColors)) {
		statements.push(db.prepare(
			`UPDATE product_colors SET archived_at = CURRENT_TIMESTAMP WHERE archived_at IS NULL AND id IN (${placeholders(part.length)})`
		).bind(...part));
	}
	for (const part of chunk(dropSizes)) {
		statements.push(db.prepare(
			`UPDATE product_sizes SET archived_at = CURRENT_TIMESTAMP WHERE archived_at IS NULL AND id IN (${placeholders(part.length)})`
		).bind(...part));
	}

	const updateSize = db.prepare(
		`UPDATE product_sizes SET label = ?, label_th = ?, sort_order = ?, box_cost = ?,
		 price_1 = ?, price_2 = ?, price_3 = ?, price_4 = ?, price_5 = ? WHERE id = ? AND product_id = ?`
	);
	const insertSize = db.prepare(
		`INSERT INTO product_sizes (product_id, label, label_th, sort_order, box_cost, price_1, price_2, price_3, price_4, price_5)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	);
	for (const s of inventory.sizes) {
		statements.push(s.id === null
			? insertSize.bind(productId, s.label, s.label_th, s.sort_order, s.box_cost, ...s.prices)
			: updateSize.bind(s.label, s.label_th, s.sort_order, s.box_cost, ...s.prices, s.id, productId));
	}

	const updateColor = db.prepare(
		`UPDATE product_colors SET name = ?, name_th = ?, hex = ?, sku = ?, is_visible = ?, sort_order = ?
		 WHERE id = ? AND size_id = ?`
	);
	const adjustStock = db.prepare("UPDATE product_colors SET stock = stock + ? WHERE id = ?");
	const logChange = db.prepare(
		`INSERT INTO stock_movements (color_id, change_amount, new_stock, reason)
		 SELECT id, ?, stock, ? FROM product_colors WHERE id = ?`
	);
	for (const s of inventory.sizes) {
		// A size added in this save has no id yet; find it by its (product, label) pair.
		const sizeIdSql = s.id === null
			? "(SELECT id FROM product_sizes WHERE product_id = ? AND label = ? AND archived_at IS NULL)"
			: "?";
		const sizeIdBind: unknown[] = s.id === null ? [productId, s.label] : [s.id];

		for (const c of s.colors) {
			if (c.id !== null) {
				statements.push(updateColor.bind(c.name, c.name_th, c.hex, c.sku, c.is_visible ? 1 : 0, c.sort_order, c.id, s.id));
				// Only the difference from what the editor loaded is applied, so a sale that
				// landed since then is kept.
				const delta = c.stock - c.stock_loaded;
				if (delta !== 0) {
					statements.push(adjustStock.bind(delta, c.id));
					statements.push(logChange.bind(delta, "MANUAL_EDIT", c.id));
				}
				continue;
			}
			statements.push(db.prepare(
				`INSERT INTO product_colors (size_id, name, name_th, hex, sku, stock, is_visible, sort_order)
				 VALUES (${sizeIdSql}, ?, ?, ?, ?, ?, ?, ?)`
			).bind(...sizeIdBind, c.name, c.name_th, c.hex, c.sku, c.stock, c.is_visible ? 1 : 0, c.sort_order));
			if (c.stock !== 0) {
				statements.push(db.prepare(
					`INSERT INTO stock_movements (color_id, change_amount, new_stock, reason)
					 SELECT id, stock, stock, 'INITIAL' FROM product_colors
					 WHERE size_id = ${sizeIdSql} AND name = ? AND archived_at IS NULL`
				).bind(...sizeIdBind, c.name));
			}
		}
	}

	if (images) {
		const insertImage = db.prepare(
			`INSERT INTO product_images (product_id, image_key, attribute_type, attribute_value, is_main,
			 price_1, price_2, price_3, price_4, price_5) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		);
		statements.push(db.prepare("DELETE FROM product_images WHERE product_id = ?").bind(productId));
		for (const img of images) {
			statements.push(insertImage.bind(
				productId, img.image_key, img.attribute_type, img.attribute_value, img.is_main, ...img.prices));
		}
	}

	return statements;
}

/** Runs one save as a single batch. A unique-index failure that slips past the pre-check (a race) becomes a 409. */
export async function applyInventory(db: D1Database, productId: number, prepared: PreparedInventory): Promise<void> {
	try {
		await db.batch(inventoryStatements(db, productId, prepared));
	} catch (e: any) {
		const message = String(e?.message || "");
		if (message.includes("product_colors.sku")) {
			throw new InventoryError("A color SKU is already used by another product", 409);
		}
		if (message.includes("product_sizes.product_id") || message.includes("product_colors.size_id")) {
			throw new InventoryError("Two sizes, or two colors of one size, have the same name", 409);
		}
		throw e;
	}
}

/** The sizes and colors behind the editor, archived rows left out. */
export async function readInventory(db: D1Database, productId: number) {
	const [sizes, colors] = await db.batch([
		db.prepare(
			`SELECT id, label, label_th, sort_order, box_cost, price_1, price_2, price_3, price_4, price_5
			 FROM product_sizes WHERE product_id = ? AND archived_at IS NULL ORDER BY sort_order, id`
		).bind(productId),
		db.prepare(
			`SELECT c.id, c.size_id, c.name, c.name_th, c.hex, c.sku, c.stock, c.is_visible, c.sort_order
			 FROM product_colors c JOIN product_sizes s ON s.id = c.size_id
			 WHERE s.product_id = ? AND s.archived_at IS NULL AND c.archived_at IS NULL
			 ORDER BY c.sort_order, c.id`
		).bind(productId)
	]);

	const bySize = new Map<number, any[]>();
	for (const c of colors.results as any[]) {
		const list = bySize.get(c.size_id) ?? [];
		list.push({
			id: c.id, name: c.name, name_th: c.name_th, hex: c.hex, sku: c.sku,
			stock: c.stock, is_visible: c.is_visible !== 0, sort_order: c.sort_order
		});
		bySize.set(c.size_id, list);
	}

	return {
		sizes: (sizes.results as any[]).map((s) => ({
			id: s.id, label: s.label, label_th: s.label_th, sort_order: s.sort_order, box_cost: s.box_cost,
			prices: [s.price_1, s.price_2, s.price_3, s.price_4, s.price_5],
			colors: bySize.get(s.id) ?? []
		}))
	};
}
