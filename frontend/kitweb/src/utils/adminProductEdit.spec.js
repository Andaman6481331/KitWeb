import { describe, it, expect } from 'vitest';
import {
    DEFAULT_PERCENTS, parsePercents, formatPercents, multiplierLabel, formulaPrice, detectManual,
    autoFill, setPrice, normalizePieces, piecesFromMoq, moqText, pieceRow, marginPct,
    sizeStock, productStock, colorSku, refreshSkus, blankColor, blankSize, cleanDecimal, cleanInteger,
    USAGE_OPTIONS, parseUsage, serializeUsage, blankDraft, buildDraft, importLegacy, imageCard, setMain,
    findColor, colorOptions, withSize, reconcileImages, attributionOf, completeness, unorderableSizes,
    validateDraft, snapshot, isDirty, buildPayload,
} from './adminProductEdit';

describe('price formula', () => {
    it('defaults to the owner formula: x2, x1.8, x1.6, x1.3', () => {
        expect(DEFAULT_PERCENTS).toEqual([200, 180, 160, 130]);
        expect(DEFAULT_PERCENTS.map(multiplierLabel)).toEqual(['×2', '×1.8', '×1.6', '×1.3']);
    });

    it('parses exactly four positive percentages', () => {
        expect(parsePercents('200, 180, 160, 130')).toEqual([200, 180, 160, 130]);
        expect(parsePercents(' 150,120 ,110,105.5 ')).toEqual([150, 120, 110, 105.5]);
        for (const bad of ['', null, undefined, '200, 180, 160', '200, 180, 160, 130, 120', '200, x, 160, 130', '200, 0, 160, 130', '200, -1, 160, 130']) {
            expect(parsePercents(bad), String(bad)).toBeNull();
        }
        expect(formatPercents([200, 180, 160, 130])).toBe('200, 180, 160, 130');
    });

    it('fills L1-L4 from L5 = 1000 as 2000 / 1800 / 1600 / 1300', () => {
        const next = setPrice(blankSize('100 pcs'), 4, '1000', DEFAULT_PERCENTS);
        expect(next.prices).toEqual([2000, 1800, 1600, 1300, 1000]);
    });

    it('rounds formula prices half up to 2 decimals', () => {
        expect(formulaPrice(35, 130)).toBe(45.5);
        expect(formulaPrice(33.33, 180)).toBe(59.99);
        expect(formulaPrice(10.01, 130)).toBe(13.01);
    });

    it('typing in an auto level makes it manual, and it survives a new L5', () => {
        let size = setPrice(blankSize(), 4, '1000', DEFAULT_PERCENTS);
        size = setPrice(size, 0, '2500', DEFAULT_PERCENTS);
        expect(size.manual).toEqual([true, false, false, false, true]);
        size = setPrice(size, 4, '2000', DEFAULT_PERCENTS);
        expect(size.prices).toEqual([2500, 3600, 3200, 2600, 2000]);
    });

    it('clearing a manual level hands it back to the formula', () => {
        let size = setPrice(blankSize(), 4, '1000', DEFAULT_PERCENTS);
        size = setPrice(size, 1, '1700', DEFAULT_PERCENTS);
        expect(size.prices[1]).toBe(1700);
        size = setPrice(size, 1, '', DEFAULT_PERCENTS);
        expect(size.manual[1]).toBe(false);
        expect(size.prices[1]).toBe(1800);
    });

    it('blanks the auto levels when L5 is cleared, but keeps manual ones', () => {
        let size = setPrice(blankSize(), 4, '1000', DEFAULT_PERCENTS);
        size = setPrice(size, 2, '1500', DEFAULT_PERCENTS);
        size = setPrice(size, 4, '', DEFAULT_PERCENTS);
        expect(size.prices).toEqual([null, null, 1500, null, null]);
    });

    it('autoFill leaves manual levels alone when the percentages change', () => {
        let size = setPrice(blankSize(), 4, '1000', DEFAULT_PERCENTS);
        size = setPrice(size, 3, '1250', DEFAULT_PERCENTS);
        const refilled = autoFill(size, [150, 120, 110, 105]);
        expect(refilled.prices).toEqual([1500, 1200, 1100, 1250, 1000]);
    });

    it('detectManual calls a loaded price auto only when it equals the formula', () => {
        expect(detectManual([2000, 1800, 1600, 1300, 1000], DEFAULT_PERCENTS)).toEqual([false, false, false, false, true]);
        expect(detectManual([2000, 1500, 1200, 1100, 1000], DEFAULT_PERCENTS)).toEqual([false, true, true, true, true]);
        expect(detectManual([null, null, null, null, null], DEFAULT_PERCENTS)).toEqual([false, false, false, false, true]);
        // no L5: every filled level is the owner's own
        expect(detectManual([800, null, null, null, null], DEFAULT_PERCENTS)).toEqual([true, false, false, false, true]);
    });
});

describe('typed numbers', () => {
    it('keeps a partial price as typed, so the field is not rewritten under the cursor', () => {
        let size = setPrice(blankSize(), 4, '12.', DEFAULT_PERCENTS);
        expect(size.prices[4]).toBe('12.');
        expect(size.prices[0]).toBe(24);               // the formula already reads it as 12
        size = setPrice(size, 4, '12.50', DEFAULT_PERCENTS);
        expect(size.prices[4]).toBe('12.50');
        expect(size.prices[1]).toBe(22.5);
        size = setPrice(size, 4, '12.5', DEFAULT_PERCENTS);
        expect(size.prices[4]).toBe(12.5);
        size = setPrice(size, 4, '.5', DEFAULT_PERCENTS);
        expect(size.prices[4]).toBe('.5');
    });

    it('cleanDecimal keeps digits and one dot', () => {
        expect(cleanDecimal('12.5')).toBe('12.5');
        expect(cleanDecimal('฿1,200.50')).toBe('1200.50');
        expect(cleanDecimal('1.2.3')).toBe('1.23');
        expect(cleanDecimal('.5')).toBe('.5');
        expect(cleanDecimal('abc')).toBe('');
        expect(cleanDecimal(null)).toBe('');
    });

    it('cleanInteger keeps digits and a leading minus', () => {
        expect(cleanInteger('120')).toBe('120');
        expect(cleanInteger('a1b2')).toBe('12');
        expect(cleanInteger('-12')).toBe('-12');
        expect(cleanInteger('--5')).toBe('-5');
        expect(cleanInteger('-')).toBe('');
        expect(cleanInteger('')).toBe('');
        expect(cleanInteger(undefined)).toBe('');
    });
});

describe('pieces per box and the per-piece row', () => {
    it("shows the owner's needle box: 2000/1500/1200/1100/1000 with 100 per box is 20/15/12/11/10", () => {
        expect(pieceRow([2000, 1500, 1200, 1100, 1000], 100)).toEqual([20, 15, 12, 11, 10]);
    });

    it('leaves blank levels blank and treats no box size as one piece', () => {
        expect(pieceRow([50, null, 0, '', 80], '')).toEqual([50, null, null, null, 80]);
        expect(pieceRow([50], null)).toEqual([50]);
    });

    it('rounds half up to 2 decimals like the storefront', () => {
        expect(pieceRow([50, 100], 8)).toEqual([6.25, 12.5]);
        expect(pieceRow([100], 3)).toEqual([33.33]);
        expect(pieceRow([10], 8)).toEqual([1.25]);
    });

    it('normalizePieces accepts whole numbers of 1 or more only', () => {
        expect(normalizePieces(100)).toBe(100);
        expect(normalizePieces('20')).toBe(20);
        expect(normalizePieces(20.9)).toBe(20);
        for (const bad of ['', null, undefined, 0, -3, 'abc', '   ']) expect(normalizePieces(bad), String(bad)).toBeNull();
    });

    it('reads the box size out of the stored moq text', () => {
        expect(piecesFromMoq('20 pcs')).toBe(20);
        expect(piecesFromMoq('20')).toBe(20);
        expect(piecesFromMoq('1')).toBe(1);
        expect(piecesFromMoq('')).toBe('');
        expect(piecesFromMoq(null)).toBe('');
        expect(piecesFromMoq('as needed')).toBe(1);
    });

    it('keeps the original moq text byte for byte when the number is unchanged', () => {
        expect(moqText('20 pcs', 20)).toBe('20 pcs');
        expect(moqText('20', '20')).toBe('20');
        expect(moqText('as needed', 1)).toBe('as needed');
    });

    it('writes "<n> pcs" when the number changed or there was no text', () => {
        expect(moqText('20 pcs', 25)).toBe('25 pcs');
        expect(moqText(null, 100)).toBe('100 pcs');
        expect(moqText('', 100)).toBe('100 pcs');
    });

    it('writes NULL for a blank box size', () => {
        expect(moqText('20 pcs', '')).toBeNull();
        expect(moqText(null, null)).toBeNull();
        expect(moqText('20 pcs', 0)).toBeNull();
    });
});

describe('margin and stock', () => {
    it('margin is measured at the lowest price (L5) against the box factory cost', () => {
        const size = { ...blankSize(), boxCost: '22', prices: [70, 63, 53, 39, 35] };
        expect(marginPct(size)).toBe(37);
    });

    it('has no margin without a cost or without an L5 price', () => {
        expect(marginPct({ ...blankSize(), boxCost: '', prices: [1, 1, 1, 1, 35] })).toBeNull();
        expect(marginPct({ ...blankSize(), boxCost: '22', prices: [null, null, null, null, null] })).toBeNull();
        expect(marginPct({ ...blankSize(), boxCost: '0', prices: [1, 1, 1, 1, 35] })).toBeNull();
    });

    it('totals stock per size and per product, ignoring blanks', () => {
        const a = { ...blankSize('A'), colors: [{ ...blankColor('Red'), stock: 120 }, { ...blankColor('Navy'), stock: '80' }] };
        const b = { ...blankSize('B'), colors: [{ ...blankColor('Red'), stock: '' }, { ...blankColor('Cream'), stock: 45.9 }] };
        expect(sizeStock(a)).toBe(200);
        expect(sizeStock(b)).toBe(45);
        expect(productStock({ sizes: [a, b] })).toBe(245);
    });
});

describe('color SKUs', () => {
    it('builds <product SKU>-<SIZE>-<COL>', () => {
        expect(colorSku('YN-014', '25 g', 'Red')).toBe('YN-014-25G-RED');
        expect(colorSku('NE004', '4.5"', 'Navy blue')).toBe('NE004-45-NAV');
        expect(colorSku('NE004', '#200 1x4', 'Standard')).toBe('NE004-2001X4-STA');
    });

    it('falls back when a label has no Latin letters or digits, and needs a product SKU', () => {
        expect(colorSku('NE004', 'ใหญ่', 'แดง')).toBe('NE004-SZ-CLR');
        expect(colorSku('', '25 g', 'Red')).toBe('');
        expect(colorSku(null, '25 g', 'Red')).toBe('');
    });

    it('adds -2, -3 when the code is taken (case-insensitive)', () => {
        const taken = new Set(['yn-014-25g-nav']);
        expect(colorSku('YN-014', '25 g', 'Navy', taken)).toBe('YN-014-25G-NAV-2');
        taken.add('yn-014-25g-nav-2');
        expect(colorSku('YN-014', '25 g', 'Navy', taken)).toBe('YN-014-25G-NAV-3');
    });

    it('refreshSkus fills automatic SKUs and keeps ones the owner typed', () => {
        const size = {
            ...blankSize('25 g'),
            colors: [
                { ...blankColor('Red') },
                { ...blankColor('Navy'), sku: 'MY-NAVY', skuManual: true },
                { ...blankColor('Navy blue') },
            ],
        };
        const [out] = refreshSkus([size], 'YN-014');
        expect(out.colors.map((c) => c.sku)).toEqual(['YN-014-25G-RED', 'MY-NAVY', 'YN-014-25G-NAV']);
    });

    it('refreshSkus follows a renamed size or color, and does nothing without a product SKU', () => {
        let sizes = refreshSkus([{ ...blankSize('25 g'), colors: [blankColor('Red')] }], 'YN-014');
        sizes = [{ ...sizes[0], label: '50 g', colors: [{ ...sizes[0].colors[0], name: 'Rose' }] }];
        expect(refreshSkus(sizes, 'YN-014')[0].colors[0].sku).toBe('YN-014-50G-ROS');
        expect(refreshSkus(sizes, '')).toBe(sizes);
    });
});

const product = (over = {}) => ({
    id: 7, sku: 'NE004', name: 'Needle', name_th: 'เข็ม', description: 'A needle', description_th: null,
    attribute: null, attribute_th: null, usage: null, usage_th: null, category: 'needles', categories: ['needles'],
    is_visible: 1, image_key: 'main-key', varieties: null, sizes: null, colors: null, moq: '20',
    price_1: 800, price_2: 0, price_3: 0, price_4: 0, price_5: 0, images: [], ...over,
});
const row = (id, key, type, label, prices = {}) => ({
    id, image_key: key, attribute_type: type, attribute_value: label,
    price_1: null, price_2: null, price_3: null, price_4: null, price_5: null, ...prices,
});
const variant = (id, key, label, prices) => row(id, key, 'variant_link', label, prices);

describe('usage', () => {
    it('offers the 12 usage types the storefront knows', () => {
        expect(USAGE_OPTIONS).toHaveLength(12);
        expect(USAGE_OPTIONS[0]).toEqual({ en: 'sewing', th: 'งานเย็บ' });
    });

    it('reads the JSON format and the legacy comma list', () => {
        const json = JSON.stringify([{ type: 'sewing', example: 'hems' }]);
        const jsonTh = JSON.stringify([{ type: 'งานเย็บ', example: 'ชายเสื้อ' }]);
        expect(parseUsage(json, jsonTh)).toEqual([{ en: 'sewing', th: 'งานเย็บ', example: 'hems', example_th: 'ชายเสื้อ' }]);
        expect(parseUsage('sewing, crafting', '')).toEqual([
            { en: 'sewing', th: 'งานเย็บ', example: '', example_th: '' },
            { en: 'crafting', th: 'งานประดิษฐ์', example: '', example_th: '' },
        ]);
        expect(parseUsage('', '')).toEqual([]);
    });

    it('serialises back to the [{type, example}] JSON the storefront reads', () => {
        const entries = [{ en: 'sewing', th: 'งานเย็บ', example: 'hems', example_th: '' }];
        expect(serializeUsage(entries)).toEqual({
            usage: JSON.stringify([{ type: 'sewing', example: 'hems' }]),
            usageTh: JSON.stringify([{ type: 'งานเย็บ', example: '' }]),
        });
        expect(serializeUsage([])).toEqual({ usage: '', usageTh: '' });
    });
});

describe('importLegacy', () => {
    it('gives a product with no variants one "Standard" size from its base prices', () => {
        const { sizes, images, baseFromLegacy } = importLegacy(product({ price_1: 800, price_3: 600 }));
        expect(sizes).toHaveLength(1);
        expect(sizes[0].label).toBe('Standard');
        expect(sizes[0].prices).toEqual([800, null, 600, null, null]);
        expect(sizes[0].colors.map((c) => c.name)).toEqual(['Standard']);
        expect(images).toEqual([]);
        expect(baseFromLegacy).toBeNull();
    });

    it('makes one size per distinct variant label, prices copied, shared labels merged', () => {
        const { sizes, images, baseFromLegacy } = importLegacy(product({
            price_1: 800, price_2: 700,
            images: [
                variant(1, 'v1', '4.5"', { price_1: 900, price_2: 850 }),
                variant(2, 'v2', 'Plain'),                    // no override: inherits the base prices
                variant(3, 'v3', '4.5"', { price_1: 999 }),   // same label: one size, two images
                row(4, 'g1', 'gallery', ''),
            ],
        }));
        expect(sizes.map((s) => s.label)).toEqual(['4.5"', 'Plain']);
        expect(sizes[0].prices).toEqual([900, 850, null, null, null]);
        expect(sizes[1].prices).toEqual([800, 700, null, null, null]);
        expect(images.map((i) => [i.image_key, i.sizeRef])).toEqual([
            ['v1', sizes[0].ref], ['v2', sizes[1].ref], ['v3', sizes[0].ref], ['g1', null],
        ]);
        expect(baseFromLegacy).toEqual([800, 700, 0, 0, 0]);
    });

    it('treats a row that sets only L4/L5 as not overriding', () => {
        const { sizes } = importLegacy(product({ price_1: 800, images: [variant(1, 'v1', 'A', { price_4: 5 })] }));
        expect(sizes[0].prices).toEqual([800, null, null, null, null]);
    });

    it('passes a variant with an empty label through untouched', () => {
        const { images, sizes } = importLegacy(product({
            images: [variant(1, 'v1', 'A'), variant(2, 'v2', '', { price_1: 5 })],
        }));
        expect(sizes.map((s) => s.label)).toEqual(['A']);
        expect(images[1].sizeRef).toBeNull();
        expect(images[1].passthrough).toEqual({
            attribute_type: 'variant_link', attribute_value: '', prices: [5, null, null, null, null],
        });
    });

    it('marks prices that already follow the formula as auto', () => {
        const { sizes } = importLegacy(product({ price_1: 2000, price_2: 1800, price_3: 1600, price_4: 1300, price_5: 1000 }));
        expect(sizes[0].manual).toEqual([false, false, false, false, true]);
    });
});

describe('buildDraft', () => {
    it('reads the product fields and the box size', () => {
        const d = buildDraft(product({ moq: '20 pcs', is_visible: 0, usage: '[]' }), null);
        expect(d).toMatchObject({
            id: 7, sku: 'NE004', name: 'Needle', nameTh: 'เข็ม', description: 'A needle', categories: ['needles'],
            isVisible: false, piecesPerBox: 20, moqOriginal: '20 pcs', usage: '[]',
        });
    });

    it('treats a blank moq as no box size', () => {
        expect(buildDraft(product({ moq: null }), null).piecesPerBox).toBe('');
    });

    it('shows products.image_key as the main image even when it has no row', () => {
        const d = buildDraft(product({ image_key: 'main-key', images: [row(1, 'g1', 'gallery', '')] }), null);
        expect(d.images.map((i) => [i.image_key, i.isMain, i.inRows])).toEqual([['main-key', true, false], ['g1', false, true]]);
    });

    it('marks the matching row as main when image_key is also a row', () => {
        const d = buildDraft(product({ image_key: 'g1', images: [row(1, 'g1', 'gallery', ''), row(2, 'g2', 'gallery', '')] }), null);
        expect(d.images.map((i) => [i.image_key, i.isMain])).toEqual([['g1', true], ['g2', false]]);
        expect(d.images[0].inRows).toBe(true);
    });

    it('fills automatic color SKUs from the product SKU', () => {
        const d = buildDraft(product({ sku: 'NE004' }), null);
        expect(d.sizes[0].colors[0].sku).toBe('NE004-STANDARD-STA');
    });

    it('loads saved sizes instead of importing, and resolves variant labels back to sizes and colors', () => {
        const inventory = { sizes: [
            { id: 11, label: '25 g', label_th: null, box_cost: 22, prices: [70, 63, 53, 39, 35],
              colors: [{ id: 21, name: 'Red', name_th: null, hex: '#c0392b', sku: 'YN-25G-RED', stock: 120, is_visible: true },
                       { id: 22, name: 'Navy', name_th: null, hex: null, sku: 'YN-25G-NAV', stock: 80, is_visible: 0 }] },
            { id: 12, label: '50 g', label_th: null, box_cost: null, prices: [140, 126, 106, 78, 70],
              colors: [{ id: 23, name: 'Red', name_th: null, hex: null, sku: 'YN-50G-RED', stock: 0, is_visible: true }] },
        ] };
        const d = buildDraft(product({
            price_1: 70, image_key: null,
            images: [
                variant(1, 'i1', 'Red / 25 g'), variant(2, 'i2', '50 g'), variant(3, 'i3', 'Red'),
                variant(4, 'i4', 'Mystery'), row(5, 'i5', 'gallery', ''),
            ],
        }), inventory);

        expect(d.sizes.map((s) => [s.ref, s.id, s.label, s.boxCost])).toEqual([['s11', 11, '25 g', 22], ['s12', 12, '50 g', '']]);
        expect(d.sizes[0].colors.map((c) => [c.ref, c.stock, c.stockLoaded, c.isVisible, c.skuManual])).toEqual([
            ['c21', 120, 120, true, true], ['c22', 80, 80, false, true],
        ]);
        expect(d.baseFromLegacy).toBeNull();

        const [i1, i2, i3, i4, i5] = d.images;
        expect([i1.sizeRef, i1.colorRef]).toEqual(['s11', 'c21']);
        expect([i2.sizeRef, i2.colorRef]).toEqual(['s12', null]);
        expect([i3.sizeRef, i3.colorRef]).toEqual([null, 'c21']);
        expect(i4.passthrough).toMatchObject({ attribute_value: 'Mystery' });
        expect([i5.sizeRef, i5.colorRef, i5.passthrough]).toEqual([null, null, null]);
    });
});

describe('blankDraft', () => {
    it('starts with one empty size holding a Standard color', () => {
        const d = blankDraft();
        expect(d.sizes).toHaveLength(1);
        expect(d.sizes[0].colors).toHaveLength(1);
        expect(d.categories).toEqual([]);
        expect(d.isVisible).toBe(true);
        expect(d.images).toEqual([]);
    });
});

describe('image attribution', () => {
    const sizes = [
        { ...blankSize('25 g'), ref: 's1', colors: [{ ...blankColor('Red'), ref: 'c1' }, { ...blankColor('Navy'), ref: 'c2' }] },
        { ...blankSize('50 g'), ref: 's2', colors: [{ ...blankColor('Red'), ref: 'c3' }] },
    ];

    it('reads a variant label back into size and color', () => {
        expect(attributionOf('25 g', sizes)).toEqual({ sizeRef: 's1', colorRef: null });
        expect(attributionOf('Navy / 25 g', sizes)).toEqual({ sizeRef: 's1', colorRef: 'c2' });
        expect(attributionOf('Red', sizes)).toEqual({ sizeRef: null, colorRef: 'c1' });
        expect(attributionOf('Green / 25 g', sizes)).toBeNull();
        expect(attributionOf('', sizes)).toBeNull();
    });

    it('prefers a size whose label contains a slash over splitting it', () => {
        const odd = [{ ...blankSize('Red / 25 g'), ref: 's9' }];
        expect(attributionOf('Red / 25 g', odd)).toEqual({ sizeRef: 's9', colorRef: null });
    });

    it('offers the colors of one size, or each distinct name across all sizes', () => {
        expect(colorOptions(sizes, 's1').map((c) => c.ref)).toEqual(['c1', 'c2']);
        expect(colorOptions(sizes, null).map((c) => [c.ref, c.name])).toEqual([['c1', 'Red'], ['c2', 'Navy']]);
        expect(colorOptions(sizes, 'missing')).toEqual([]);
    });

    it('finds a color anywhere', () => {
        expect(findColor(sizes, 'c3').size.ref).toBe('s2');
        expect(findColor(sizes, 'nope')).toBeNull();
    });

    it('moves a color to the same-named color when the size changes, else drops it', () => {
        const img = imageCard({ image_key: 'k' }, { sizeRef: 's1', colorRef: 'c1' });
        expect(withSize(img, 's2', sizes)).toMatchObject({ sizeRef: 's2', colorRef: 'c3' });
        const navy = imageCard({ image_key: 'k' }, { sizeRef: 's1', colorRef: 'c2' });
        expect(withSize(navy, 's2', sizes)).toMatchObject({ sizeRef: 's2', colorRef: null });
        expect(withSize(img, '', sizes)).toMatchObject({ sizeRef: null, colorRef: 'c1' });
    });

    it('detaches attributions that point at something removed', () => {
        const images = [
            imageCard({ image_key: 'a' }, { sizeRef: 'gone', colorRef: 'c1' }),
            imageCard({ image_key: 'b' }, { sizeRef: 's1', colorRef: 'c3' }),   // color is in another size
            imageCard({ image_key: 'c' }, { sizeRef: null, colorRef: 'gone' }),
            imageCard({ image_key: 'd' }, { sizeRef: 's2', colorRef: 'c3' }),   // still valid
            imageCard({ image_key: 'e' }, { passthrough: { attribute_type: 'variant_link', attribute_value: 'X', prices: [] } }),
        ];
        const out = reconcileImages(images, sizes);
        expect(out.map((i) => [i.sizeRef, i.colorRef])).toEqual([[null, null], ['s1', null], [null, null], ['s2', 'c3'], [null, null]]);
        expect(out[3]).toBe(images[3]);
        expect(out[4]).toBe(images[4]);
    });

    it('setMain leaves exactly one main image', () => {
        const images = [imageCard({ image_key: 'a' }, { isMain: true }), imageCard({ image_key: 'b' })];
        const out = setMain(images, images[1].uid);
        expect(out.map((i) => i.isMain)).toEqual([false, true]);
    });
});

describe('completeness', () => {
    const full = () => {
        const d = buildDraft(product({ price_1: 2000, price_2: 1500, price_3: 1200, price_4: 1100, price_5: 1000, moq: '100 pcs' }), null);
        d.sizes[0].prices = [2000, 1500, 1200, 1100, 1000];
        return d;
    };

    it('is 100% when name, description, main image, five prices + box size and SKUs are all there', () => {
        const c = completeness(full());
        expect(c).toEqual({ checks: { info: true, image: true, prices: true, stock: true }, percent: 100, complete: true });
    });

    it('flags each missing piece', () => {
        const d = full();
        d.description = ''; d.descriptionTh = '';
        d.images = [];
        d.sizes[0].prices[3] = null;
        d.sizes[0].colors[0].sku = '';
        expect(completeness(d)).toEqual({ checks: { info: false, image: false, prices: false, stock: false }, percent: 0, complete: false });
    });

    it('needs the box size for the price check', () => {
        const d = full();
        d.piecesPerBox = '';
        expect(completeness(d).checks.prices).toBe(false);
        expect(completeness(d).percent).toBe(75);
    });

    it('accepts a Thai description in place of an English one', () => {
        const d = full();
        d.description = ''; d.descriptionTh = 'เข็มเย็บผ้า';
        expect(completeness(d).checks.info).toBe(true);
    });

    it('counts sizes that have no photo once the product uses variant photos', () => {
        const d = buildDraft(product({}), null);
        d.sizes = [{ ...blankSize('A'), ref: 'sa' }, { ...blankSize('B'), ref: 'sb' }];
        expect(unorderableSizes(d)).toBe(0);                     // no variant photos at all: sold as one base product
        d.images.push(imageCard({ image_key: 'x' }, { sizeRef: 'sa' }));
        expect(unorderableSizes(d)).toBe(1);                     // B has no photo
        d.images.push(imageCard({ image_key: 'y' }, { sizeRef: 'sb' }));
        expect(unorderableSizes(d)).toBe(0);
    });
});

describe('validateDraft', () => {
    const ok = () => {
        const d = buildDraft(product({}), null);
        d.sizes[0].label = 'Standard';
        return d;
    };

    it('passes a complete draft', () => {
        expect(validateDraft(ok())).toBeNull();
    });

    it('reports the first problem', () => {
        let d = ok(); d.name = '  ';
        expect(validateDraft(d)).toEqual({ key: 'name' });
        d = ok(); d.categories = [];
        expect(validateDraft(d)).toEqual({ key: 'category' });
        d = ok(); d.piecesPerBox = 0;
        expect(validateDraft(d)).toEqual({ key: 'pieces' });
        d = ok(); d.sizes[0].label = ' ';
        expect(validateDraft(d)).toEqual({ key: 'sizeLabel' });
        d = ok(); d.sizes.push({ ...blankSize('Standard') });
        expect(validateDraft(d)).toEqual({ key: 'sizeDuplicate', arg: 'Standard' });
        d = ok(); d.sizes[0].colors[0].name = '';
        expect(validateDraft(d)).toEqual({ key: 'colorName', arg: 'Standard' });
        d = ok(); d.sizes[0].colors.push({ ...blankColor('Standard') });
        expect(validateDraft(d)).toEqual({ key: 'colorDuplicate', arg: 'Standard' });
        d = ok(); d.sizes[0].colors = [];
        expect(validateDraft(d)).toEqual({ key: 'colorNone', arg: 'Standard' });
        d = ok(); d.sizes[0].colors.push({ ...blankColor('Red'), sku: d.sizes[0].colors[0].sku });
        expect(validateDraft(d)).toEqual({ key: 'skuDuplicate', arg: d.sizes[0].colors[0].sku });
    });
});

describe('dirty check', () => {
    it('is clean until something changes, and ignores previews and file objects', () => {
        const d = buildDraft(product({ images: [row(1, 'g1', 'gallery', '')] }), null);
        const original = snapshot(d);
        expect(isDirty(d, original)).toBe(false);
        d.images[0].preview = 'blob:abc';
        d.images[0].file = { name: 'x.png' };
        expect(isDirty(d, original)).toBe(false);
        d.name = 'Needle 2';
        expect(isDirty(d, original)).toBe(true);
    });

    it('notices a new image, a price and a color change', () => {
        const d = buildDraft(product({}), null);
        const original = snapshot(d);
        d.images.push(imageCard({}, { isNew: true }));
        expect(isDirty(d, original)).toBe(true);
        const e = buildDraft(product({}), null);
        const base = snapshot(e);
        e.sizes[0].prices[0] = 1;
        expect(isDirty(e, base)).toBe(true);
        const f = buildDraft(product({}), null);
        const baseF = snapshot(f);
        f.sizes[0].colors[0].stock = 5;
        expect(isDirty(f, baseF)).toBe(true);
    });
});

describe('buildPayload', () => {
    const needle = () => {
        const d = blankDraft();
        d.sku = 'NE004'; d.name = ' Needle '; d.description = 'A needle'; d.categories = ['needles'];
        d.piecesPerBox = 100; d.moqOriginal = null;
        d.sizes[0].label = '100 pcs';
        d.sizes[0].prices = [2000, 1500, 1200, 1100, 1000];
        d.sizes[0].colors[0].sku = 'NE004-100-STA';
        d.images = [imageCard({ image_key: 'main' }, { isMain: true, inRows: false })];
        return d;
    };

    it("carries the owner's needle example: box prices unchanged, moq '100 pcs', per piece 20/15/12/11/10", () => {
        const p = buildPayload(needle());
        expect([p.price_1, p.price_2, p.price_3, p.price_4, p.price_5]).toEqual([2000, 1500, 1200, 1100, 1000]);
        expect(p.price).toBe(1200);
        expect(p.moq).toBe('100 pcs');
        expect(p.inventory.sizes[0].prices).toEqual([2000, 1500, 1200, 1100, 1000]);
        expect(pieceRow(p.inventory.sizes[0].prices, 100)).toEqual([20, 15, 12, 11, 10]);
    });

    it('sends the product fields the way the old form did', () => {
        const p = buildPayload(needle());
        expect(p).toMatchObject({
            name: 'Needle', name_th: null, description: 'A needle', description_th: null,
            category: 'needles', categories: ['needles'], image_key: 'main', is_visible: true, sku: 'NE004',
            usage: null, usage_th: null, attribute: null, attribute_th: null,
            varieties: null, sizes: null, colors: null,
        });
    });

    it('hands the legacy varieties / sizes / colors text back unchanged', () => {
        const d = needle();
        Object.assign(d, { varieties: 'v', legacySizes: 's', legacyColors: 'c' });
        expect(buildPayload(d)).toMatchObject({ varieties: 'v', sizes: 's', colors: 'c' });
    });

    it('leaves sku out for a product that has none yet', () => {
        const d = needle(); d.sku = '';
        expect(buildPayload(d).sku).toBeUndefined();
    });

    it('sizes and colors carry refs, order, the stock basis and trimmed text', () => {
        const d = needle();
        d.sizes[0].labelTh = ' ใหญ่ '; d.sizes[0].boxCost = '1500';
        d.sizes[0].colors = [
            { ...blankColor('Red'), id: 21, ref: 'c21', stock: '120', stockLoaded: 100, sku: ' R ', hex: '#c0392b', nameTh: 'แดง' },
            { ...blankColor('Navy'), stock: 5, stockLoaded: 999, sku: 'N', isVisible: false },
        ];
        const [size] = buildPayload(d).inventory.sizes;
        expect(size).toMatchObject({ ref: d.sizes[0].ref, id: null, label: '100 pcs', label_th: 'ใหญ่', sort_order: 0, box_cost: 1500 });
        expect(size.colors).toEqual([
            { ref: 'c21', id: 21, name: 'Red', name_th: 'แดง', hex: '#c0392b', sku: 'R', stock: 120, stock_loaded: 100, is_visible: true, sort_order: 0 },
            { ref: d.sizes[0].colors[1].ref, id: null, name: 'Navy', name_th: null, hex: null, sku: 'N', stock: 5, stock_loaded: 0, is_visible: false, sort_order: 1 },
        ]);
    });

    it('uses the first size for the base prices, unless a legacy base is pinned', () => {
        const d = needle();
        d.sizes.push({ ...blankSize('200 pcs'), prices: [9, 9, 9, 9, 9], colors: [{ ...blankColor('Standard'), sku: 'Z' }] });
        expect(buildPayload(d).price_1).toBe(2000);
        expect(buildPayload(d).inventory.base_prices).toBeNull();

        d.baseFromLegacy = [800, 0, 0, 0, 0];
        const p = buildPayload(d);
        expect([p.price_1, p.price_2, p.price]).toEqual([800, 0, 0]);
        expect(p.inventory.base_prices).toEqual([800, 0, 0, 0, 0]);
    });

    it('writes blank levels as 0 in the legacy fields but null in the size', () => {
        const d = needle();
        d.sizes[0].prices = [2000, null, null, null, null];
        const p = buildPayload(d);
        expect([p.price_1, p.price_2]).toEqual([2000, 0]);
        expect(p.inventory.sizes[0].prices).toEqual([2000, null, null, null, null]);
    });

    it('keeps the main photo out of the image rows unless it already was one or is attributed', () => {
        const d = needle();
        d.images = [
            imageCard({ image_key: 'main' }, { isMain: true, inRows: false }),
            imageCard({ image_key: 'old-main' }, { inRows: false }),               // was the main, now a gallery photo
            imageCard({ image_key: 'row-main' }, { isMain: false, inRows: true }),
        ];
        const keys = (x) => buildPayload(x).images.map((i) => i.image_key);
        expect(keys(d)).toEqual(['old-main', 'row-main']);
        expect(buildPayload(d).image_key).toBe('main');

        d.images[0].sizeRef = d.sizes[0].ref;                                      // attributed -> must be a row
        expect(keys(d)).toEqual(['main', 'old-main', 'row-main']);
    });

    it('turns refs into what the Worker reads: size_ref and the color name', () => {
        const d = needle();
        const red = { ...blankColor('Red'), sku: 'R' };
        d.sizes[0].colors.push(red);
        d.images = [
            imageCard({ image_key: 'a' }, { sizeRef: d.sizes[0].ref, colorRef: red.ref }),
            imageCard({ image_key: 'b' }, { colorRef: red.ref }),
            imageCard({ image_key: 'c' }),
        ];
        expect(buildPayload(d).images).toEqual([
            { image_key: 'a', is_main: false, size_ref: d.sizes[0].ref, color_name: 'Red' },
            { image_key: 'b', is_main: false, size_ref: null, color_name: 'Red' },
            { image_key: 'c', is_main: false, size_ref: null, color_name: null },
        ]);
    });

    it('sends an unattributed legacy variant as a passthrough row', () => {
        const d = needle();
        d.images = [imageCard({ image_key: 'p' }, {
            passthrough: { attribute_type: 'variant_link', attribute_value: '', prices: [5, null, null, null, null] },
        })];
        expect(buildPayload(d).images).toEqual([{
            image_key: 'p', is_main: false, passthrough: true, attribute_type: 'variant_link', attribute_value: '',
            price_1: 5, price_2: null, price_3: null, price_4: null, price_5: null,
        }]);
    });

    it('drops attributions that point at removed colors instead of sending a bad request', () => {
        const d = needle();
        d.images = [imageCard({ image_key: 'a' }, { sizeRef: 'gone', colorRef: 'gone' })];
        expect(buildPayload(d).images).toEqual([{ image_key: 'a', is_main: false, size_ref: null, color_name: null }]);
    });

    it('refuses to build while an image has not been uploaded', () => {
        const d = needle();
        d.images = [imageCard({}, { isNew: true })];
        expect(() => buildPayload(d)).toThrow(/uploaded/);
    });

    it('an untouched import keeps the moq text and the original base prices', () => {
        const d = buildDraft(product({
            moq: '20', price_1: 800,
            images: [variant(1, 'v1', '4.5"', { price_1: 900 }), variant(2, 'v2', 'Plain')],
        }), null);
        const p = buildPayload(d);
        expect(p.moq).toBe('20');
        expect(p.price_1).toBe(800);
        expect(p.inventory.base_prices).toEqual([800, 0, 0, 0, 0]);
        expect(p.inventory.sizes.map((s) => [s.label, s.prices[0]])).toEqual([['4.5"', 900], ['Plain', 800]]);
        expect(p.images.map((i) => [i.image_key, i.size_ref])).toEqual([
            ['v1', d.sizes[0].ref], ['v2', d.sizes[1].ref],
        ]);
    });
});
