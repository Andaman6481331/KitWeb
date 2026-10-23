import { describe, it, expect } from "vitest";
import {
	validateInventory, mirrorBasePrices, mirrorImages,
	MAX_SIZES, MAX_COLORS_PER_SIZE, MAX_COLORS_TOTAL
} from "../src/product-inventory";

const color = (over: Record<string, any> = {}) => ({
	ref: "c1", id: null, name: "Standard", name_th: null, hex: null, sku: "TE001-100-STA",
	stock: 0, stock_loaded: 0, is_visible: true, sort_order: 0, ...over
});
const size = (over: Record<string, any> = {}) => ({
	ref: "s1", id: null, label: "100 pcs", label_th: null, sort_order: 0, box_cost: null,
	prices: [2000, 1500, 1200, 1100, 1000], colors: [color()], ...over
});

function ok(raw: unknown) {
	const r = validateInventory(raw);
	if (!r.ok) throw new Error(`expected valid, got: ${r.error}`);
	return r.value;
}

describe("validateInventory — accepts", () => {
	it("normalises a clean payload", () => {
		const v = ok({
			sizes: [size({ label: "  25 g  ", box_cost: "", prices: [100], colors: [color({ sku: " A-1 ", hex: "#C0392B" })] })]
		});
		expect(v.sizes[0].label).toBe("25 g");
		expect(v.sizes[0].box_cost).toBeNull();
		expect(v.sizes[0].prices).toEqual([100, null, null, null, null]);
		expect(v.sizes[0].colors[0]).toMatchObject({ sku: "A-1", hex: "#C0392B", stock: 0, is_visible: true });
		expect(v.base_prices).toBeNull();
	});

	it("keeps stock_loaded for existing colors and forces 0 for new ones", () => {
		const v = ok({
			sizes: [size({ id: 7, colors: [
				color({ id: 9, ref: "c9", stock: 120, stock_loaded: 100 }),
				color({ ref: "c10", name: "Red", sku: "R", stock: 5, stock_loaded: 99 })
			] })]
		});
		expect(v.sizes[0].colors[0].stock_loaded).toBe(100);
		expect(v.sizes[0].colors[1].stock_loaded).toBe(0);
	});

	it("reads base_prices when the editor sends them", () => {
		const v = ok({ sizes: [size()], base_prices: [800, 0, null, null, null] });
		expect(v.base_prices).toEqual([800, 0, null, null, null]);
	});
});

describe("validateInventory — rejects with 400", () => {
	const twoSizes = (over: Record<string, any>) => [
		size(), size({ ref: "s2", label: "200 pcs", colors: [color({ ref: "c2", sku: "TE001-200-STA" })], ...over })
	];
	const manySizes = (n: number) => Array.from({ length: n }, (_, i) => size({
		ref: `s${i}`, label: `L${i}`, colors: [color({ ref: `c${i}`, sku: `SKU-${i}` })]
	}));
	const manyColors = (n: number, prefix = "k") => Array.from({ length: n }, (_, i) => color({
		ref: `${prefix}${i}`, name: `Color ${i}`, sku: `${prefix}-${i}`
	}));

	it.each([
		["no body", undefined],
		["sizes not an array", { sizes: "x" }],
		["no sizes", { sizes: [] }],
		[`more than ${MAX_SIZES} sizes`, { sizes: manySizes(MAX_SIZES + 1) }],
		["blank size label", { sizes: [size({ label: "   " })] }],
		["size label over 60 characters", { sizes: [size({ label: "x".repeat(61) })] }],
		["duplicate size labels", { sizes: twoSizes({ label: "100 pcs" }) }],
		["reused ref", { sizes: twoSizes({ ref: "s1" }) }],
		["bad size id", { sizes: [size({ id: 0 })] }],
		["negative price", { sizes: [size({ prices: [-1, 0, 0, 0, 0] })] }],
		["non-numeric price", { sizes: [size({ prices: ["abc", 0, 0, 0, 0] })] }],
		["more than five prices", { sizes: [size({ prices: [1, 2, 3, 4, 5, 6] })] }],
		["negative factory cost", { sizes: [size({ box_cost: -5 })] }],
		["size without colors", { sizes: [size({ colors: [] })] }],
		[`more than ${MAX_COLORS_PER_SIZE} colors in a size`, { sizes: [size({ colors: manyColors(MAX_COLORS_PER_SIZE + 1) })] }],
		[`more than ${MAX_COLORS_TOTAL} colors in a product`, { sizes: Array.from({ length: 6 }, (_, i) =>
			size({ ref: `s${i}`, label: `L${i}`, colors: manyColors(MAX_COLORS_PER_SIZE, `p${i}`) })) }],
		["blank color name", { sizes: [size({ colors: [color({ name: " " })] })] }],
		["duplicate color names in a size", { sizes: [size({ colors: [color(), color({ ref: "c2", sku: "B" })] })] }],
		["malformed hex", { sizes: [size({ colors: [color({ hex: "red" })] })] }],
		["SKU over 64 characters", { sizes: [size({ colors: [color({ sku: "S".repeat(65) })] })] }],
		["fractional stock", { sizes: [size({ colors: [color({ stock: 1.5 })] })] }],
		["text stock", { sizes: [size({ colors: [color({ stock: "5" })] })] }],
		["existing color without stock_loaded", { sizes: [size({ id: 3, colors: [color({ id: 4, stock_loaded: undefined })] })] }],
		["bad base_prices", { sizes: [size()], base_prices: [1, 2, "x", 4, 5] }]
	])("%s", (_label, raw) => {
		const r = validateInventory(raw);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.status).toBe(400);
	});
});

describe("validateInventory — SKU clashes inside one payload are 409", () => {
	it("names the SKU", () => {
		const r = validateInventory({
			sizes: [size({ colors: [color(), color({ ref: "c2", name: "Red", sku: "TE001-100-STA" })] })]
		});
		expect(r.ok).toBe(false);
		if (!r.ok) {
			expect(r.status).toBe(409);
			expect(r.error).toContain("TE001-100-STA");
		}
	});
});

describe("mirrorBasePrices", () => {
	it("copies the first size's box prices, blanks as 0", () => {
		const inv = ok({ sizes: [size({ prices: [2000, null, 1200, null, null] })] });
		expect(mirrorBasePrices(inv)).toEqual([2000, 0, 1200, 0, 0]);
	});

	it("uses the size with the lowest sort_order, not the first listed", () => {
		const inv = ok({ sizes: [
			size({ sort_order: 1, prices: [9, 9, 9, 9, 9] }),
			size({ ref: "s2", label: "B", sort_order: 0, prices: [1, 2, 3, 4, 5], colors: [color({ ref: "c2", sku: "B" })] })
		] });
		expect(mirrorBasePrices(inv)).toEqual([1, 2, 3, 4, 5]);
	});

	it("lets base_prices win when present", () => {
		const inv = ok({ sizes: [size()], base_prices: [800, null, null, null, null] });
		expect(mirrorBasePrices(inv)).toEqual([800, 0, 0, 0, 0]);
	});
});

describe("mirrorImages", () => {
	const inv = ok({ sizes: [
		size({ ref: "s1", label: "25 g", prices: [100, 90, 80, 70, 60], colors: [
			color({ ref: "c1", name: "Red", sku: "A" }),
			color({ ref: "c2", name: "Blue", sku: "B", is_visible: false })
		] }),
		size({ ref: "s2", label: "50 g", prices: [200, 180, 160, 140, 120], colors: [
			color({ ref: "c3", name: "Red", sku: "C" }),
			color({ ref: "c4", name: "Blue", sku: "D", is_visible: false })
		] })
	] });
	const one = (img: Record<string, any>) => {
		const r = mirrorImages(inv, [{ image_key: "k", ...img }]);
		if (!r.ok) throw new Error(r.error);
		return r.value[0];
	};

	it("labels a size + color image '<color> / <size>' with that size's box prices", () => {
		expect(one({ size_ref: "s1", color_name: "Red" })).toMatchObject({
			attribute_type: "variant_link", attribute_value: "Red / 25 g", prices: [100, 90, 80, 70, 60]
		});
	});

	it("labels a size-only image with just the size", () => {
		expect(one({ size_ref: "s2" })).toMatchObject({
			attribute_type: "variant_link", attribute_value: "50 g", prices: [200, 180, 160, 140, 120]
		});
	});

	it("labels an all-sizes color image with the color and no prices", () => {
		expect(one({ color_name: "Red" })).toMatchObject({
			attribute_type: "variant_link", attribute_value: "Red", prices: [null, null, null, null, null]
		});
	});

	it("writes an image that belongs to nothing as a gallery photo", () => {
		expect(one({})).toMatchObject({ attribute_type: "gallery", attribute_value: null, prices: [null, null, null, null, null] });
	});

	it("writes an image of a hidden color as a gallery photo", () => {
		expect(one({ size_ref: "s1", color_name: "Blue" })).toMatchObject({ attribute_type: "gallery", attribute_value: null });
		expect(one({ color_name: "Blue" })).toMatchObject({ attribute_type: "gallery" });
	});

	it("carries is_main through as 0 or 1", () => {
		expect(one({ is_main: true }).is_main).toBe(1);
		expect(one({}).is_main).toBe(0);
	});

	it("passes a legacy row through untouched", () => {
		expect(one({
			passthrough: true, attribute_type: "variant_link", attribute_value: "",
			price_1: 5, price_2: null, price_3: 0, price_4: undefined, price_5: "7"
		})).toMatchObject({
			attribute_type: "variant_link", attribute_value: "", prices: [5, null, 0, null, 7]
		});
	});

	it("fails on an unknown size or color", () => {
		expect(mirrorImages(inv, [{ image_key: "k", size_ref: "nope" }]).ok).toBe(false);
		expect(mirrorImages(inv, [{ image_key: "k", color_name: "Green" }]).ok).toBe(false);
		expect(mirrorImages(inv, [{ image_key: "k", size_ref: "s1", color_name: "Green" }]).ok).toBe(false);
	});

	it("skips an entry without an image key, like the existing save does", () => {
		const r = mirrorImages(inv, [{ image_key: "  " }, { size_ref: "s1" }, { image_key: "ok" }]);
		expect(r.ok && r.value.map((i) => i.image_key)).toEqual(["ok"]);
	});
});
