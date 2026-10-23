// Pure logic behind the Edit product panel: no DOM and no network, so the pricing and
// payload rules can be tested on their own. The panel keeps one `draft` object (see
// blankDraft); every function here either reads it or returns a new piece of it.
//
// Prices are per BOX, the unit the database and the website already use. The website
// shows box price ÷ pieces per box (products.moq) per piece and sells whole boxes only.
import { parseMoq, roundHalfUp, toPerPiece } from './productPricing';

export const LEVELS = 5;
// L1-L4 as a percentage of the L5 price: the owner's formula, x2 / x1.8 / x1.6 / x1.3.
export const DEFAULT_PERCENTS = [200, 180, 160, 130];
const PERCENTS_KEY = 'kc-price-percents';

const str = (v) => (v === null || v === undefined ? '' : String(v));
// Blank or non-numeric -> null, so "0" and "" stay different things.
const num = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

let refCounter = 0;
const nextRef = (prefix) => `${prefix}${++refCounter}`;

// ── Price formula ─────────────────────────────────────────────────

export const parsePercents = (text) => {
    if (text === null || text === undefined) return null;
    const parts = String(text).split(',').map((s) => parseFloat(s.trim()));
    return parts.length === 4 && parts.every((n) => Number.isFinite(n) && n > 0) ? parts : null;
};

export const formatPercents = (percents) => percents.join(', ');

export const multiplierLabel = (percent) => `×${roundHalfUp(percent / 100, 2)}`;

// Remembered per browser; storage can throw or be missing (private window, prerender).
export const loadPercents = () => {
    try {
        return parsePercents(window.localStorage.getItem(PERCENTS_KEY)) || [...DEFAULT_PERCENTS];
    } catch {
        return [...DEFAULT_PERCENTS];
    }
};

export const savePercents = (percents) => {
    try {
        window.localStorage.setItem(PERCENTS_KEY, formatPercents(percents));
    } catch {
        // kept for this visit only
    }
};

export const formulaPrice = (l5, percent) => roundHalfUp((l5 * percent) / 100, 2);

// A level is "auto" while it still equals what the formula gives from L5, "manual" once it
// differs (or L5 is unknown). L5 itself is always typed, so it counts as manual.
export const detectManual = (prices, percents) => {
    const l5 = num(prices[4]);
    return prices.map((p, i) => {
        if (i === 4) return true;
        if (num(p) === null) return false;
        if (l5 === null || l5 <= 0) return true;
        return num(p) !== formulaPrice(l5, percents[i]);
    });
};

// Re-fills the auto levels from L5; manual ones are never touched. With no usable L5 the
// auto levels go blank instead of keeping a stale number.
export const autoFill = (size, percents) => {
    const l5 = num(size.prices[4]);
    const usable = l5 !== null && l5 > 0;
    const prices = size.prices.map((p, i) => {
        if (i === 4 || size.manual[i]) return p;
        return usable ? formulaPrice(l5, percents[i]) : null;
    });
    return { ...size, prices };
};

// While a number is still being typed ("12.", "0.50", ".5") the field keeps the text exactly
// as typed, so re-rendering never rewrites it under the cursor. Everything that reads a price
// goes through num(), which reads both.
const keepTyped = (raw) => {
    const n = num(raw);
    if (n === null) return null;
    return String(n) === String(raw).trim() ? n : String(raw).trim();
};

// level is 0-based. Typing any level except L5 makes it manual; clearing it hands it back
// to the formula.
export const setPrice = (size, level, raw, percents) => {
    const prices = [...size.prices];
    const manual = [...size.manual];
    prices[level] = keepTyped(raw);
    if (level !== 4) manual[level] = prices[level] !== null;
    return autoFill({ ...size, prices, manual }, percents);
};

// The numeric fields are text inputs (a number input hides half-typed text from the page);
// these keep only what can be part of a number.
export const cleanDecimal = (raw) => {
    const [whole, ...rest] = String(raw ?? '').replace(/[^\d.]/g, '').split('.');
    return rest.length ? `${whole}.${rest.join('')}` : whole;
};

export const cleanInteger = (raw) => {
    const text = String(raw ?? '');
    const digits = text.replace(/\D/g, '');
    return text.trim().startsWith('-') && digits ? `-${digits}` : digits;
};

// ── Pieces per box ────────────────────────────────────────────────

// A whole number of 1 or more, or null for blank / unusable.
export const normalizePieces = (v) => {
    if (v === null || v === undefined || String(v).trim() === '') return null;
    const n = Math.floor(Number(v));
    return Number.isFinite(n) && n >= 1 ? n : null;
};

// products.moq is free text ("20 pcs"); the editor shows only the number.
export const piecesFromMoq = (moq) => (str(moq).trim() === '' ? '' : parseMoq(moq));

// What to store in products.moq. An unchanged number keeps the original text exactly (the
// website reads only its leading integer, but a re-save should not rewrite what it did not
// change); a changed number is "<n> pcs"; blank is NULL.
export const moqText = (original, pieces) => {
    const n = normalizePieces(pieces);
    if (n === null) return null;
    const before = str(original).trim();
    return before && parseMoq(before) === n ? original : `${n} pcs`;
};

// What the website shows per piece at each level: box price ÷ pieces per box.
export const pieceRow = (prices, piecesPerBox) => {
    const box = normalizePieces(piecesPerBox) || 1;
    return prices.map((p) => (num(p) > 0 ? toPerPiece(p, box) : null));
};

// ── Margin and stock ──────────────────────────────────────────────

// Margin at the lowest price (L5) against the factory cost of a box.
export const marginPct = (size) => {
    const cost = num(size.boxCost);
    const l5 = num(size.prices[4]);
    if (!cost || !l5 || l5 <= 0) return null;
    return Math.round(((l5 - cost) / l5) * 100);
};

export const sizeStock = (size) =>
    size.colors.reduce((sum, c) => sum + (Math.trunc(Number(c.stock)) || 0), 0);

export const productStock = (draft) => draft.sizes.reduce((sum, s) => sum + sizeStock(s), 0);

// ── New rows and SKUs ─────────────────────────────────────────────

export const blankColor = (name = 'Standard') => ({
    ref: nextRef('nc'), id: null, name, nameTh: '', hex: '', sku: '', skuManual: false,
    stock: 0, stockLoaded: 0, isVisible: true,
});

export const blankSize = (label = '') => ({
    ref: nextRef('ns'), id: null, label, labelTh: '', boxCost: '',
    prices: [null, null, null, null, null], manual: [false, false, false, false, true],
    colors: [blankColor()],
});

const alnum = (text) => str(text).toUpperCase().replace(/[^A-Z0-9]/g, '');

// <product SKU>-<SIZE>-<COL>, e.g. YN-014-25G-RED. `taken` holds lower-case SKUs already in
// use in this product; a clash gets -2, -3, ... Thai-only labels fall back to SZ / CLR.
export const colorSku = (productSku, sizeLabel, colorName, taken = new Set()) => {
    const base = str(productSku).trim();
    if (!base) return '';
    const candidate = `${base}-${alnum(sizeLabel) || 'SZ'}-${alnum(colorName).slice(0, 3) || 'CLR'}`;
    let sku = candidate;
    for (let n = 2; taken.has(sku.toLowerCase()); n++) sku = `${candidate}-${n}`;
    return sku;
};

// Re-derives every automatic SKU (skuManual false) so it follows renamed sizes and colors;
// SKUs the owner typed are kept and reserved first. Returns the same array when there is
// no product SKU yet.
export const refreshSkus = (sizes, productSku) => {
    if (!str(productSku).trim()) return sizes;
    const taken = new Set(sizes.flatMap((s) =>
        s.colors.filter((c) => c.skuManual && c.sku.trim()).map((c) => c.sku.trim().toLowerCase())));
    return sizes.map((s) => ({
        ...s,
        colors: s.colors.map((c) => {
            if (c.skuManual) return c;
            const sku = colorSku(productSku, s.label, c.name, taken);
            taken.add(sku.toLowerCase());
            return { ...c, sku };
        }),
    }));
};

// ── Usage (the storefront reads products.usage as [{ type, example }] JSON) ──

export const USAGE_OPTIONS = [
    { en: 'sewing', th: 'งานเย็บ' },
    { en: 'crafting', th: 'งานประดิษฐ์' },
    { en: 'school activity', th: 'กิจกรรมโรงเรียน' },
    { en: 'temple activity', th: 'กิจกรรมวัด' },
    { en: 'decorating', th: 'ตกแต่ง' },
    { en: 'crocheting', th: 'งานถักโครเช' },
    { en: 'beading', th: 'งานร้อย' },
    { en: 'origami', th: 'งานกระดาษพับ' },
    { en: 'ribbon crafting', th: 'งานริบบิ้น' },
    { en: 'ribbon folding', th: 'งานพับเหรียญ' },
    { en: 'hand hemming', th: 'งานสอย' },
    { en: 'punching', th: 'งานตอก' },
];

const parseUsageSide = (text) => {
    if (!text) return [];
    try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return parsed;
    } catch {
        // older rows hold a comma-separated list
    }
    return String(text).split(',').map((s) => s.trim()).filter(Boolean).map((type) => ({ type, example: '' }));
};

// Entries are { en, th, example, example_th }, one per selected usage type.
export const parseUsage = (raw, rawTh) => {
    const en = parseUsageSide(raw);
    const th = parseUsageSide(rawTh);
    return en.map((entry, i) => {
        const option = USAGE_OPTIONS.find((o) => o.en === entry.type);
        return {
            en: entry.type || '',
            th: th[i]?.type || option?.th || entry.type || '',
            example: entry.example || '',
            example_th: th[i]?.example || '',
        };
    });
};

export const serializeUsage = (entries) => (entries.length === 0
    ? { usage: '', usageTh: '' }
    : {
        usage: JSON.stringify(entries.map((e) => ({ type: e.en, example: e.example || '' }))),
        usageTh: JSON.stringify(entries.map((e) => ({ type: e.th || e.en, example: e.example_th || '' }))),
    });

// ── Images ────────────────────────────────────────────────────────

const categoriesOf = (p) => {
    if (Array.isArray(p.categories) && p.categories.length) return p.categories.filter(Boolean);
    return p.category ? [p.category] : [];
};

// One card in the image grid. `inRows`: the photo has (or will get) a product_images row.
export const imageCard = (img = {}, over = {}) => ({
    uid: img.id ? `i${img.id}` : nextRef('ni'),
    image_key: img.image_key || null,
    isMain: false, inRows: true, isNew: false, file: null, preview: null,
    sizeRef: null, colorRef: null, passthrough: null,
    ...over,
});

export const setMain = (images, uid) => images.map((img) => ({ ...img, isMain: img.uid === uid }));

export const findColor = (sizes, colorRef) => {
    for (const size of sizes) {
        const color = size.colors.find((c) => c.ref === colorRef);
        if (color) return { size, color };
    }
    return null;
};

// What the color select offers: one size's colors, or each distinct name across all sizes.
export const colorOptions = (sizes, sizeRef) => {
    const pick = (c) => ({ ref: c.ref, name: c.name, hex: c.hex });
    if (sizeRef) return (sizes.find((s) => s.ref === sizeRef)?.colors || []).map(pick);
    const seen = new Set();
    const out = [];
    for (const s of sizes) {
        for (const c of s.colors) {
            if (c.name.trim() && !seen.has(c.name)) {
                seen.add(c.name);
                out.push(pick(c));
            }
        }
    }
    return out;
};

// Changing an image's size keeps its color when that size has one of the same name.
export const withSize = (img, sizeRef, sizes) => {
    const next = { ...img, sizeRef: sizeRef || null };
    if (!next.sizeRef || !next.colorRef) return next;
    const size = sizes.find((s) => s.ref === next.sizeRef);
    if (!size || size.colors.some((c) => c.ref === next.colorRef)) return next;
    const current = findColor(sizes, next.colorRef);
    const same = current && size.colors.find((c) => c.name === current.color.name);
    return { ...next, colorRef: same ? same.ref : null };
};

// After sizes or colors were removed: an image that pointed at one of them falls back to
// "all" instead of keeping a reference the Worker would reject.
export const reconcileImages = (images, sizes) => images.map((img) => {
    if (img.passthrough) return img;
    let { sizeRef, colorRef } = img;
    const size = sizeRef ? sizes.find((s) => s.ref === sizeRef) : null;
    if (sizeRef && !size) {
        sizeRef = null;
        colorRef = null;
    }
    if (colorRef) {
        const hit = findColor(sizes, colorRef);
        if (!hit || (size && hit.size.ref !== size.ref)) colorRef = null;
    }
    return sizeRef === img.sizeRef && colorRef === img.colorRef ? img : { ...img, sizeRef, colorRef };
});

// The inverse of the Worker's label rule: "<color> / <size>", "<size>" or "<color>".
export const attributionOf = (label, sizes) => {
    const text = str(label).trim();
    if (!text) return null;
    const bySize = (l) => sizes.find((s) => s.label === l);
    const whole = bySize(text);
    if (whole) return { sizeRef: whole.ref, colorRef: null };
    const cut = text.lastIndexOf(' / ');
    if (cut > 0) {
        const size = bySize(text.slice(cut + 3));
        const color = size?.colors.find((c) => c.name === text.slice(0, cut));
        if (size && color) return { sizeRef: size.ref, colorRef: color.ref };
    }
    for (const s of sizes) {
        const color = s.colors.find((c) => c.name === text);
        if (color) return { sizeRef: null, colorRef: color.ref };
    }
    return null;
};

// ── Building a draft ──────────────────────────────────────────────

const rowPrices = (row) => [1, 2, 3, 4, 5].map((n) => num(row?.[`price_${n}`]));
// 0 on the product itself means "not set".
const basePricesOf = (p) => rowPrices(p).map((v) => (v ? v : null));
const legacyRow = (img) => ({
    attribute_type: img.attribute_type, attribute_value: img.attribute_value ?? '', prices: rowPrices(img),
});

const sizeWith = (label, prices, percents) => ({ ...blankSize(label), prices, manual: detectManual(prices, percents) });

/**
 * A product that has never been saved with sizes: one size per distinct variant label
 * (prices copied from that row when it sets any of L1-L3, else the product's base prices),
 * or one "Standard" size when it has no variants. Nothing is divided or rounded.
 */
export const importLegacy = (product, percents = DEFAULT_PERCENTS) => {
    const rows = product.images || [];
    const labelled = rows.filter((img) => img.attribute_type === 'variant_link' && str(img.attribute_value).trim());
    const base = basePricesOf(product);

    const sizes = [];
    const refByLabel = new Map();
    for (const rowImg of labelled) {
        const label = str(rowImg.attribute_value).trim();
        if (refByLabel.has(label)) continue;
        const overrides = [rowImg.price_1, rowImg.price_2, rowImg.price_3].some((p) => p !== null && p !== undefined);
        const size = sizeWith(label, overrides ? rowPrices(rowImg) : base, percents);
        refByLabel.set(label, size.ref);
        sizes.push(size);
    }
    if (sizes.length === 0) sizes.push(sizeWith('Standard', base, percents));

    const images = rows.map((img) => {
        if (img.attribute_type !== 'variant_link') return imageCard(img);
        const label = str(img.attribute_value).trim();
        return label ? imageCard(img, { sizeRef: refByLabel.get(label) }) : imageCard(img, { passthrough: legacyRow(img) });
    });

    // The product's own base prices are what the storefront falls back to, so a product with
    // variants keeps them until the owner edits the first size.
    const baseFromLegacy = labelled.length ? rowPrices(product).map((v) => v ?? 0) : null;
    return { sizes, images, baseFromLegacy };
};

const sizesFromInventory = (data, percents) => (data.sizes || []).map((s) => {
    const prices = [0, 1, 2, 3, 4].map((i) => num(s.prices?.[i]));
    return {
        ref: `s${s.id}`, id: s.id, label: s.label, labelTh: str(s.label_th), boxCost: s.box_cost ?? '',
        prices, manual: detectManual(prices, percents),
        colors: (s.colors || []).map((c) => ({
            ref: `c${c.id}`, id: c.id, name: c.name, nameTh: str(c.name_th), hex: str(c.hex), sku: str(c.sku), skuManual: true,
            stock: c.stock, stockLoaded: c.stock, isVisible: c.is_visible !== false && c.is_visible !== 0,
        })),
    };
});

const fromSaved = (product, inventory, percents) => {
    const sizes = sizesFromInventory(inventory, percents);
    const images = (product.images || []).map((img) => {
        if (img.attribute_type !== 'variant_link') return imageCard(img);
        const hit = attributionOf(img.attribute_value, sizes);
        return hit ? imageCard(img, hit) : imageCard(img, { passthrough: legacyRow(img) });
    });
    return { sizes, images, baseFromLegacy: null };
};

// products.image_key is the main photo. It usually has no product_images row, so it becomes
// a card of its own; when a row already uses that key, that row is the main card.
const withMain = (images, mainKey) => {
    if (!mainKey) return images;
    const hit = images.findIndex((i) => i.image_key === mainKey);
    if (hit >= 0) return images.map((img, i) => ({ ...img, isMain: i === hit }));
    return [imageCard({ image_key: mainKey }, { isMain: true, inRows: false }), ...images];
};

export const blankDraft = () => ({
    id: null, sku: '',
    name: '', nameTh: '', description: '', descriptionTh: '', attribute: '', attributeTh: '',
    usage: '', usageTh: '',
    categories: [], isVisible: true,
    varieties: null, legacySizes: null, legacyColors: null,
    moqOriginal: null, piecesPerBox: '',
    baseFromLegacy: null,
    sizes: [blankSize()],
    images: [],
});

/**
 * The panel's working copy of a product. `inventory` is GET /products/:id/inventory, or
 * null/empty for a product that was never saved with sizes (it is imported instead).
 */
export const buildDraft = (product, inventory, percents = DEFAULT_PERCENTS) => {
    const saved = Boolean(inventory?.sizes?.length);
    const source = saved ? fromSaved(product, inventory, percents) : importLegacy(product, percents);
    const sku = str(product.sku);
    return {
        id: product.id, sku,
        name: str(product.name), nameTh: str(product.name_th),
        description: str(product.description), descriptionTh: str(product.description_th),
        attribute: str(product.attribute), attributeTh: str(product.attribute_th),
        usage: str(product.usage), usageTh: str(product.usage_th),
        categories: categoriesOf(product),
        isVisible: !(product.is_visible === 0 || product.is_visible === false),
        varieties: product.varieties ?? null, legacySizes: product.sizes ?? null, legacyColors: product.colors ?? null,
        moqOriginal: product.moq ?? null, piecesPerBox: piecesFromMoq(product.moq),
        baseFromLegacy: source.baseFromLegacy,
        sizes: refreshSkus(source.sizes, sku),
        images: withMain(source.images, product.image_key),
    };
};

// ── Status, validation, dirty check ───────────────────────────────

// Whether an image becomes a product_images row. A main photo that was never a row and
// belongs to no size or color stays in products.image_key only, as the old form kept it.
const attributed = (img) => Boolean(img.sizeRef || img.colorRef || img.passthrough);
const writesRow = (img) => !(img.isMain && !img.inRows && !attributed(img));

export const completeness = (draft) => {
    const checks = {
        info: Boolean(draft.name.trim() && (draft.description.trim() || draft.descriptionTh.trim())),
        image: draft.images.some((i) => i.isMain),
        prices: draft.sizes.length > 0
            && draft.sizes.every((s) => s.prices.every((p) => num(p) > 0))
            && normalizePieces(draft.piecesPerBox) !== null,
        stock: draft.sizes.length > 0
            && draft.sizes.every((s) => s.colors.length > 0 && s.colors.every((c) => c.sku.trim() && num(c.stock) !== null)),
    };
    const done = Object.values(checks).filter(Boolean).length;
    return { checks, percent: Math.round((done / 4) * 100), complete: done === 4 };
};

// The website lists a product by its photos: once any photo is tied to a size or color, a
// size without its own photo can be invoiced but not ordered online. Returns how many.
export const unorderableSizes = (draft) => {
    const rows = draft.images.filter(writesRow);
    const usesVariants = rows.some((i) => i.sizeRef || i.colorRef || i.passthrough?.attribute_type === 'variant_link');
    if (!usesVariants) return 0;
    return draft.sizes.filter((s) => !rows.some((i) => i.sizeRef === s.ref)).length;
};

// First problem that would make the Worker refuse the save, as { key, arg? } (the key names
// a message in adminProductEditText), or null.
export const validateDraft = (draft) => {
    if (!draft.name.trim()) return { key: 'name' };
    if (draft.categories.length === 0) return { key: 'category' };
    if (str(draft.piecesPerBox).trim() !== '' && normalizePieces(draft.piecesPerBox) === null) return { key: 'pieces' };
    const labels = new Set();
    const skus = new Set();
    for (const s of draft.sizes) {
        const label = s.label.trim();
        if (!label) return { key: 'sizeLabel' };
        if (labels.has(label)) return { key: 'sizeDuplicate', arg: label };
        labels.add(label);
        if (s.colors.length === 0) return { key: 'colorNone', arg: label };
        const names = new Set();
        for (const c of s.colors) {
            const name = c.name.trim();
            if (!name) return { key: 'colorName', arg: label };
            if (names.has(name)) return { key: 'colorDuplicate', arg: name };
            names.add(name);
            const sku = c.sku.trim();
            if (sku) {
                if (skus.has(sku)) return { key: 'skuDuplicate', arg: sku };
                skus.add(sku);
            }
        }
    }
    return null;
};

// A string copy of everything the owner can edit (no File objects or blob URLs), so
// "unsaved changes" is a string comparison.
export const snapshot = (draft) => JSON.stringify({
    ...draft,
    images: draft.images.map(({ file, preview, ...rest }) => rest),
});

export const isDirty = (draft, original) => snapshot(draft) !== original;

// ── The save request ──────────────────────────────────────────────

const imagePayload = (img, sizes) => {
    if (!img.image_key) throw new Error('An image has not been uploaded yet');
    const base = { image_key: img.image_key, is_main: Boolean(img.isMain) };
    if (img.passthrough) {
        const p = img.passthrough;
        return {
            ...base, passthrough: true, attribute_type: p.attribute_type, attribute_value: p.attribute_value,
            price_1: p.prices[0], price_2: p.prices[1], price_3: p.prices[2], price_4: p.prices[3], price_5: p.prices[4],
        };
    }
    return { ...base, size_ref: img.sizeRef, color_name: img.colorRef ? findColor(sizes, img.colorRef).color.name : null };
};

/**
 * The body for POST /products or PUT /products/:id. Every image must already have its
 * image_key (the panel uploads new files first). Prices are per box, exactly as typed.
 */
export const buildPayload = (draft) => {
    const sizes = draft.sizes.map((s, si) => ({
        ref: s.ref, id: s.id, label: s.label.trim(), label_th: s.labelTh.trim() || null, sort_order: si,
        box_cost: num(s.boxCost),
        prices: s.prices.map(num),
        colors: s.colors.map((c, ci) => ({
            ref: c.ref, id: c.id, name: c.name.trim(), name_th: c.nameTh.trim() || null, hex: c.hex || null,
            sku: c.sku.trim() || null, stock: Math.trunc(Number(c.stock) || 0),
            stock_loaded: c.id === null ? 0 : c.stockLoaded, is_visible: c.isVisible, sort_order: ci,
        })),
    }));

    const base = draft.baseFromLegacy || sizes[0]?.prices || [];
    const baseAt = (i) => num(base[i]) ?? 0;
    const images = reconcileImages(draft.images, draft.sizes);
    const main = images.find((i) => i.isMain);

    return {
        name: draft.name.trim(),
        name_th: draft.nameTh.trim() || null,
        description: draft.description,
        description_th: draft.descriptionTh || null,
        price: baseAt(2),
        category: draft.categories[0],
        categories: draft.categories,
        image_key: main?.image_key || null,
        usage: draft.usage || null,
        usage_th: draft.usageTh || null,
        attribute: draft.attribute || null,
        attribute_th: draft.attributeTh || null,
        varieties: draft.varieties,
        sizes: draft.legacySizes,
        colors: draft.legacyColors,
        price_1: baseAt(0), price_2: baseAt(1), price_3: baseAt(2), price_4: baseAt(3), price_5: baseAt(4),
        moq: moqText(draft.moqOriginal, draft.piecesPerBox),
        is_visible: draft.isVisible,
        sku: draft.sku || undefined,
        inventory: { sizes, base_prices: draft.baseFromLegacy },
        images: images.filter(writesRow).map((img) => imagePayload(img, draft.sizes)),
    };
};
