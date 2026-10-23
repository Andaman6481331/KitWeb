// Pure logic behind the admin Standard Inventory page: turning API product rows into
// the shape the page shows, filtering and sorting them, and the optimistic updates
// applied after a bulk action. No Vue and no network in here, so all of it is tested
// in adminInventory.spec.js.
//
// Money rule: prices come from price_1..3 divided by the box size (getPriceRange).
// The legacy products.price column is never read.
import { getPriceRange, parseMoq } from './productPricing';

const DAY_MS = 24 * 60 * 60 * 1000;
const COLLAPSED_CHIPS = 9;

// D1 stores CURRENT_TIMESTAMP as 'YYYY-MM-DD HH:MM:SS' in UTC with no zone marker.
const parseDbDate = (value) => {
    if (!value) return null;
    const text = String(value).trim();
    const iso = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(text) ? text : `${text.replace(' ', 'T')}Z`;
    const ms = Date.parse(iso);
    return Number.isNaN(ms) ? null : ms;
};

export const daysSince = (createdAt, now = Date.now()) => {
    const ms = parseDbDate(createdAt);
    if (ms === null) return null;
    return Math.max(0, Math.floor((now - ms) / DAY_MS));
};

const categoriesOf = (p) => {
    if (Array.isArray(p.categories) && p.categories.length) return p.categories.filter(Boolean);
    return p.category ? [p.category] : [];
};

// Variants are stored as variant_link gallery rows with one label each, so options
// can be counted but not split into sizes and colours.
const optionCountOf = (p) => new Set(
    (p.images || [])
        .filter((img) => img.attribute_type === 'variant_link')
        .map((img) => String(img.attribute_value || '').trim())
        .filter(Boolean)
).size;

export const toInventoryItem = (p, now = Date.now()) => {
    const priceRange = getPriceRange(p);
    const nameTh = String(p.name_th || '').trim();
    const incomplete = !p.image_key || !nameTh;
    const noPrice = priceRange === null;
    return {
        id: p.id,
        // The row exactly as the API sent it. The edit form saves this back with PUT,
        // so every optimistic update below keeps it in step with the fields it changes.
        raw: p,
        sku: p.sku || '',
        name: p.name || '',
        nameTh,
        imageKey: p.image_key || null,
        categories: categoriesOf(p),
        optionCount: optionCountOf(p),
        priceRange,
        boxSize: parseMoq(p.moq),
        isVisible: !(p.is_visible === 0 || p.is_visible === false),
        isArchived: Boolean(p.archived_at),
        archivedAt: p.archived_at || null,
        createdAtMs: parseDbDate(p.created_at),
        addedDays: daysSince(p.created_at, now),
        noPrice,
        incomplete,
        needsAttention: noPrice || incomplete,
    };
};

// ── Filtering ─────────────────────────────────────────────────────

// filters: { query, category: 'all' | path, price: 'all'|'has'|'none',
//            website: 'all'|'shown'|'hidden'|'archived', attention: boolean }
// Archived products only appear under website: 'archived'.
export const filterItems = (items, filters) => {
    const q = filters.query.trim().toLowerCase();
    return items.filter((i) =>
        (filters.website === 'archived' ? i.isArchived : !i.isArchived) &&
        (filters.category === 'all' || i.categories.includes(filters.category)) &&
        (!q || i.name.toLowerCase().includes(q) || i.nameTh.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)) &&
        (filters.price === 'all' || (filters.price === 'has' ? !i.noPrice : i.noPrice)) &&
        (filters.website === 'all' || filters.website === 'archived' ||
            (filters.website === 'shown' ? i.isVisible : !i.isVisible)) &&
        (!filters.attention || i.needsAttention)
    );
};

// ── Sorting ───────────────────────────────────────────────────────

const UNPRICED = 1e9;

// sort: { key: 'sku'|'name'|'price'|'box'|'upload', dir: 'asc'|'desc' }
export const sortItems = (items, sort, lang) => {
    const sign = sort.dir === 'asc' ? 1 : -1;
    const th = lang === 'th';
    const compare = {
        sku: (a, b) => a.sku.localeCompare(b.sku, 'en', { numeric: true, sensitivity: 'base' }),
        name: (a, b) => (th ? (a.nameTh || a.name).localeCompare(b.nameTh || b.name, 'th') : a.name.localeCompare(b.name, 'en')),
        price: (a, b) => (a.priceRange ? a.priceRange.min : UNPRICED) - (b.priceRange ? b.priceRange.min : UNPRICED),
        box: (a, b) => a.boxSize - b.boxSize,
        upload: (a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0),
    }[sort.key] || (() => 0);
    return items.slice().sort((a, b) => sign * compare(a, b) || a.id - b.id);
};

// ── Category chips ────────────────────────────────────────────────

export const categoryChips = (items, categories, lang) => {
    const live = items.filter((i) => !i.isArchived);
    const th = lang === 'th';
    return [{ key: 'all', label: th ? 'ทั้งหมด' : 'All', count: live.length }].concat(
        categories.map((c) => ({
            key: c.path,
            label: th && c.name_th ? c.name_th : c.name,
            count: live.filter((i) => i.categories.includes(c.path)).length,
        }))
    );
};

// The first few chips, plus the selected one if it would otherwise be hidden.
export const visibleCategories = (chips, selectedKey, expanded, limit = COLLAPSED_CHIPS) => {
    if (expanded) return chips;
    const shown = chips.slice(0, limit);
    const selected = chips.find((c) => c.key === selectedKey);
    return selected && !shown.includes(selected) ? shown.concat([selected]) : shown;
};

export const attentionCount = (items) => items.filter((i) => !i.isArchived && i.needsAttention).length;

// ── Display text ──────────────────────────────────────────────────

const money = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

export const formatPriceRange = (range) => {
    if (!range) return null;
    return range.min === range.max ? `฿${money(range.min)}` : `฿${money(range.min)}–${money(range.max)}`;
};

export const formatMoq = (boxSize, lang) => {
    if (boxSize > 1) return lang === 'th' ? `กล่องละ ${boxSize}` : `Box of ${boxSize}`;
    return lang === 'th' ? 'รายชิ้น' : 'Per piece';
};

// short: the bare "3d ago" the narrow list column uses; the card spells out "Added 3d ago".
export const formatAdded = (days, lang, { short = false } = {}) => {
    if (days === null || days === undefined) return '';
    if (short) {
        if (days === 0) return lang === 'th' ? 'วันนี้' : 'Today';
        return lang === 'th' ? `${days} วันก่อน` : `${days}d ago`;
    }
    if (days === 0) return lang === 'th' ? 'เพิ่มวันนี้' : 'Added today';
    return lang === 'th' ? `เพิ่ม ${days} วันก่อน` : `Added ${days}d ago`;
};

// What is worth a second look on a product; an archived one only says that.
export const badgesFor = (item) => {
    if (item.isArchived) return [{ kind: 'archived' }];
    const badges = [];
    if (item.noPrice) badges.push({ kind: 'noPrice' });
    if (item.incomplete) badges.push({ kind: 'incomplete' });
    if (!item.isVisible) badges.push({ kind: 'hidden' });
    return badges;
};

// ── Optimistic updates (each returns a new array; inputs are never mutated) ──

const touching = (items, ids, change) => {
    const wanted = new Set(ids);
    return items.map((i) => (wanted.has(i.id) ? change(i) : i));
};

export const withVisibility = (items, ids, isVisible) =>
    touching(items, ids, (i) => (i.isArchived
        ? i
        : { ...i, isVisible, raw: { ...i.raw, is_visible: isVisible ? 1 : 0 } }));

export const withArchived = (items, ids, stamp) =>
    touching(items, ids, (i) => (i.isArchived
        ? i
        : {
            ...i, isArchived: true, archivedAt: stamp, isVisible: false,
            raw: { ...i.raw, archived_at: stamp, is_visible: 0 },
        }));

// restore: [{ id, is_visible }] — the visibility each product had before it was archived.
export const withRestored = (items, restore) => {
    const byId = new Map(restore.map((r) => [r.id, r.is_visible]));
    return items.map((i) => (byId.has(i.id) && i.isArchived
        ? {
            ...i, isArchived: false, archivedAt: null, isVisible: byId.get(i.id),
            raw: { ...i.raw, archived_at: null, is_visible: byId.get(i.id) ? 1 : 0 },
        }
        : i));
};

export const withCategory = (items, ids, path) =>
    touching(items, ids, (i) => {
        if (i.categories.includes(path)) return i;
        const categories = [...i.categories, path];
        return { ...i, categories, raw: { ...i.raw, categories } };
    });

// ── Duplicate ─────────────────────────────────────────────────────

const orNull = (value) => (value === undefined ? null : value);

// The POST /products body for a copy of a product. The copy starts hidden, asks the
// Worker for a fresh SKU, and points at the same stored image files (nothing here
// uploads or removes a file). Row ids, slug and dates are deliberately left out.
export const buildDuplicatePayload = (p) => {
    const categories = categoriesOf(p);
    return {
        name: `${p.name} (copy)`,
        name_th: p.name_th ? `${p.name_th} (สำเนา)` : null,
        description: p.description,
        description_th: p.description_th,
        price: p.price,
        category: categories[0] || p.category,
        categories,
        image_key: p.image_key,
        usage: p.usage,
        usage_th: p.usage_th,
        attribute: p.attribute,
        attribute_th: p.attribute_th,
        varieties: p.varieties,
        sizes: p.sizes,
        colors: p.colors,
        price_1: p.price_1,
        price_2: p.price_2,
        price_3: p.price_3,
        price_4: p.price_4,
        price_5: p.price_5,
        moq: p.moq,
        is_visible: false,
        images: (p.images || []).map((img) => ({
            image_key: img.image_key,
            attribute_type: img.attribute_type,
            attribute_value: img.attribute_value,
            is_main: Boolean(img.is_main),
            price_1: orNull(img.price_1),
            price_2: orNull(img.price_2),
            price_3: orNull(img.price_3),
            price_4: orNull(img.price_4),
            price_5: orNull(img.price_5),
        })),
    };
};
