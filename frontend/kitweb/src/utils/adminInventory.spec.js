import { describe, it, expect } from 'vitest';
import {
    toInventoryItem, daysSince, filterItems, sortItems, categoryChips, attentionCount,
    formatPriceRange, formatMoq, formatAdded, badgesFor, visibleCategories,
    withVisibility, withArchived, withRestored, withCategory, buildDuplicatePayload,
} from './adminInventory';

const NOW = Date.parse('2026-10-23T12:00:00Z');
const CATEGORIES = [
    { id: 1, path: 'beads', name: 'Beads', name_th: 'ลูกปัด' },
    { id: 2, path: 'yarn', name: 'Yarn', name_th: 'ไหมพรม' },
    { id: 3, path: 'flora', name: 'Artificial Flowers', name_th: null },
];

const raw = (over = {}) => ({
    id: 1, sku: 'BD012', name: 'Pony Beads Mix', name_th: 'ลูกปัดโพนี่คละสี',
    image_key: 'BD012-1700000000000', category: 'beads', categories: ['beads'],
    moq: '20 pcs', price_1: 800, price_2: 0, price_3: 0,
    is_visible: 1, archived_at: null, created_at: '2026-10-20 12:00:00', images: [],
    ...over,
});
const item = (over) => toInventoryItem(raw(over), NOW);

describe('daysSince', () => {
    it('counts whole days from the UTC timestamp D1 stores', () => {
        expect(daysSince('2026-10-20 12:00:00', NOW)).toBe(3);
        expect(daysSince('2026-10-23 11:00:00', NOW)).toBe(0);
    });
    it('never goes negative when the clocks disagree', () => {
        expect(daysSince('2026-10-24 12:00:00', NOW)).toBe(0);
    });
    it('is null for a missing or unreadable date', () => {
        expect(daysSince(null, NOW)).toBeNull();
        expect(daysSince('not a date', NOW)).toBeNull();
    });
});

describe('toInventoryItem', () => {
    it('carries the identity and display fields', () => {
        expect(item()).toMatchObject({
            id: 1, sku: 'BD012', name: 'Pony Beads Mix', nameTh: 'ลูกปัดโพนี่คละสี',
            imageKey: 'BD012-1700000000000', categories: ['beads'], addedDays: 3,
        });
    });

    it('falls back to the primary category when the junction list is empty', () => {
        expect(item({ categories: [], category: 'yarn' }).categories).toEqual(['yarn']);
        expect(item({ categories: [], category: null }).categories).toEqual([]);
    });

    it('reads visibility and archive state', () => {
        expect(item().isVisible).toBe(true);
        expect(item({ is_visible: 0 }).isVisible).toBe(false);
        expect(item({ is_visible: null }).isVisible).toBe(true);
        expect(item({ archived_at: '2026-10-22 08:00:00' }).isArchived).toBe(true);
        expect(item().isArchived).toBe(false);
        // an old Worker without the column sends nothing
        expect(item({ archived_at: undefined }).isArchived).toBe(false);
    });

    it('counts distinct non-empty variant labels as options', () => {
        const images = [
            { attribute_type: 'gallery', attribute_value: '' },
            { attribute_type: 'variant_link', attribute_value: '3"' },
            { attribute_type: 'variant_link', attribute_value: '3"' },
            { attribute_type: 'variant_link', attribute_value: '5"' },
            { attribute_type: 'variant_link', attribute_value: '' },
        ];
        expect(item({ images }).optionCount).toBe(2);
        expect(item().optionCount).toBe(0);
    });

    it('prices from the tier columns and flags a product with none', () => {
        expect(item().priceRange).toEqual({ min: 40, max: 40 });
        expect(item().noPrice).toBe(false);
        // the legacy price column must never stand in for a missing tier price
        const unpriced = item({ price_1: 0, price: 500 });
        expect(unpriced.priceRange).toBeNull();
        expect(unpriced.noPrice).toBe(true);
    });

    it('reads the box size from MOQ', () => {
        expect(item().boxSize).toBe(20);
        expect(item({ moq: null }).boxSize).toBe(1);
    });

    it('flags a product with no image or no Thai name as incomplete', () => {
        expect(item().incomplete).toBe(false);
        expect(item({ image_key: null }).incomplete).toBe(true);
        expect(item({ name_th: '  ' }).incomplete).toBe(true);
    });

    it('needs attention when unpriced or incomplete, not merely hidden', () => {
        expect(item().needsAttention).toBe(false);
        expect(item({ price_1: 0 }).needsAttention).toBe(true);
        expect(item({ image_key: null }).needsAttention).toBe(true);
        expect(item({ is_visible: 0 }).needsAttention).toBe(false);
    });
});

describe('filterItems', () => {
    const items = [
        item({ id: 1, sku: 'BD012', name: 'Pony Beads Mix', categories: ['beads'] }),
        item({ id: 2, sku: 'YN014', name: 'Acrylic Yarn', name_th: 'ไหมพรมอะคริลิก', categories: ['yarn'], price_1: 0 }),
        item({ id: 3, sku: 'YN015', name: 'Wool Yarn', categories: ['yarn', 'beads'], is_visible: 0 }),
        item({ id: 4, sku: 'OLD001', name: 'Old Thing', archived_at: '2026-10-01 00:00:00', is_visible: 0 }),
    ];
    const none = { query: '', category: 'all', price: 'all', website: 'all', attention: false };
    const ids = (f) => filterItems(items, { ...none, ...f }).map((i) => i.id);

    it('hides archived products unless asked for them', () => {
        expect(ids({})).toEqual([1, 2, 3]);
        expect(ids({ website: 'archived' })).toEqual([4]);
    });

    it('searches name, Thai name and SKU, ignoring case', () => {
        expect(ids({ query: 'pony' })).toEqual([1]);
        expect(ids({ query: 'yn01' })).toEqual([2, 3]);
        expect(ids({ query: 'ไหมพรม' })).toEqual([2]);
        expect(ids({ query: '  WOOL ' })).toEqual([3]);
    });

    it('matches a category through any of the product links', () => {
        expect(ids({ category: 'beads' })).toEqual([1, 3]);
        expect(ids({ category: 'yarn' })).toEqual([2, 3]);
    });

    it('filters by price presence', () => {
        expect(ids({ price: 'has' })).toEqual([1, 3]);
        expect(ids({ price: 'none' })).toEqual([2]);
    });

    it('filters by website visibility', () => {
        expect(ids({ website: 'shown' })).toEqual([1, 2]);
        expect(ids({ website: 'hidden' })).toEqual([3]);
    });

    it('limits to products needing attention', () => {
        expect(ids({ attention: true })).toEqual([2]);
    });

    it('combines filters', () => {
        expect(ids({ category: 'yarn', website: 'shown' })).toEqual([2]);
    });
});

describe('sortItems', () => {
    const a = item({ id: 1, sku: 'BD002', name: 'Zebra', name_th: 'ข', price_1: 400, moq: '20', created_at: '2026-10-01 00:00:00' });
    const b = item({ id: 2, sku: 'BD010', name: 'apple', name_th: 'ก', price_1: 0, moq: '100', created_at: '2026-10-22 00:00:00' });
    const c = item({ id: 3, sku: 'BD001', name: 'Mango', name_th: 'ค', price_1: 100, moq: '1', created_at: '2026-10-10 00:00:00' });
    const order = (key, dir = 'asc', lang = 'en') =>
        sortItems([a, b, c], { key, dir }, lang).map((i) => i.id);

    it('sorts SKUs naturally, not alphabetically', () => {
        expect(order('sku')).toEqual([3, 1, 2]);
        expect(order('sku', 'desc')).toEqual([2, 1, 3]);
    });

    it('sorts names by the active language', () => {
        expect(order('name')).toEqual([2, 3, 1]);
        expect(order('name', 'asc', 'th')).toEqual([2, 1, 3]);
    });

    it('sorts by cheapest price with unpriced products last', () => {
        expect(order('price')).toEqual([1, 3, 2]);
    });

    it('sorts by box size', () => {
        expect(order('box')).toEqual([3, 1, 2]);
    });

    it('sorts by upload date, newest first when descending', () => {
        expect(order('upload', 'desc')).toEqual([2, 3, 1]);
    });

    it('does not mutate the input', () => {
        const input = [a, b, c];
        sortItems(input, { key: 'sku', dir: 'asc' }, 'en');
        expect(input.map((i) => i.id)).toEqual([1, 2, 3]);
    });
});

describe('categoryChips', () => {
    const items = [
        item({ id: 1, categories: ['beads'] }),
        item({ id: 2, categories: ['beads', 'yarn'] }),
        item({ id: 3, categories: ['yarn'], archived_at: '2026-10-01 00:00:00' }),
    ];

    it('leads with All and counts only live products', () => {
        const chips = categoryChips(items, CATEGORIES, 'en');
        expect(chips[0]).toEqual({ key: 'all', label: 'All', count: 2 });
        expect(chips.find((c) => c.key === 'beads').count).toBe(2);
        expect(chips.find((c) => c.key === 'yarn').count).toBe(1);
    });

    it('keeps empty categories so they can still be picked', () => {
        expect(categoryChips(items, CATEGORIES, 'en').find((c) => c.key === 'flora').count).toBe(0);
    });

    it('labels with the Thai name when asked, falling back to English', () => {
        const chips = categoryChips(items, CATEGORIES, 'th');
        expect(chips[0].label).toBe('ทั้งหมด');
        expect(chips.find((c) => c.key === 'beads').label).toBe('ลูกปัด');
        expect(chips.find((c) => c.key === 'flora').label).toBe('Artificial Flowers');
    });
});

describe('visibleCategories', () => {
    const chips = Array.from({ length: 12 }, (_, i) => ({ key: `c${i}`, label: `C${i}`, count: i }));

    it('shows the first nine chips until expanded', () => {
        expect(visibleCategories(chips, 'all', false)).toHaveLength(9);
        expect(visibleCategories(chips, 'all', true)).toHaveLength(12);
    });

    it('keeps the selected chip visible even when it is past the cut', () => {
        const shown = visibleCategories(chips, 'c11', false);
        expect(shown).toHaveLength(10);
        expect(shown[9].key).toBe('c11');
    });
});

describe('attentionCount', () => {
    it('counts live products that need attention', () => {
        const items = [
            item({ id: 1, price_1: 0 }),
            item({ id: 2 }),
            item({ id: 3, price_1: 0, archived_at: '2026-10-01 00:00:00' }),
        ];
        expect(attentionCount(items)).toBe(1);
    });
});

describe('formatters', () => {
    it('formats a price range in baht', () => {
        expect(formatPriceRange({ min: 40, max: 40 })).toBe('฿40');
        expect(formatPriceRange({ min: 30, max: 40 })).toBe('฿30–40');
        expect(formatPriceRange({ min: 3.33, max: 3.5 })).toBe('฿3.33–3.50');
        expect(formatPriceRange(null)).toBeNull();
    });

    it('describes the box size in both languages', () => {
        expect(formatMoq(20, 'en')).toBe('Box of 20');
        expect(formatMoq(20, 'th')).toBe('กล่องละ 20');
        expect(formatMoq(1, 'en')).toBe('Per piece');
        expect(formatMoq(1, 'th')).toBe('รายชิ้น');
    });

    it('describes how long ago a product was added', () => {
        expect(formatAdded(0, 'en')).toBe('Added today');
        expect(formatAdded(3, 'en')).toBe('Added 3d ago');
        expect(formatAdded(3, 'th')).toBe('เพิ่ม 3 วันก่อน');
        expect(formatAdded(null, 'en')).toBe('');
    });

    it('has a short form for narrow list columns', () => {
        expect(formatAdded(0, 'en', { short: true })).toBe('Today');
        expect(formatAdded(3, 'en', { short: true })).toBe('3d ago');
        expect(formatAdded(3, 'th', { short: true })).toBe('3 วันก่อน');
        expect(formatAdded(0, 'th', { short: true })).toBe('วันนี้');
        expect(formatAdded(null, 'en', { short: true })).toBe('');
    });
});

describe('badgesFor', () => {
    it('lists what is wrong with a product, most important first', () => {
        const kinds = (over) => badgesFor(item(over)).map((b) => b.kind);
        expect(kinds({})).toEqual([]);
        expect(kinds({ price_1: 0, image_key: null, is_visible: 0 })).toEqual(['noPrice', 'incomplete', 'hidden']);
        expect(kinds({ archived_at: '2026-10-01 00:00:00', is_visible: 0 })).toEqual(['archived']);
    });
});

describe('optimistic updates', () => {
    const items = [item({ id: 1 }), item({ id: 2 }), item({ id: 3, is_visible: 0 })];

    it('withVisibility changes only the named products and leaves the input alone', () => {
        const next = withVisibility(items, [1, 3], false);
        expect(next.map((i) => i.isVisible)).toEqual([false, true, false]);
        expect(items[0].isVisible).toBe(true);
    });

    it('withVisibility will not show an archived product', () => {
        const archived = [item({ id: 1, archived_at: '2026-10-01 00:00:00', is_visible: 0 })];
        expect(withVisibility(archived, [1], true)[0].isVisible).toBe(false);
    });

    it('withArchived hides and stamps the products', () => {
        const next = withArchived(items, [1, 2], '2026-10-23 12:00:00');
        expect(next.map((i) => i.isArchived)).toEqual([true, true, false]);
        expect(next[0].isVisible).toBe(false);
        expect(next[0].archivedAt).toBe('2026-10-23 12:00:00');
    });

    it('withRestored brings products back with the visibility they had', () => {
        const archived = withArchived(items, [1, 3], '2026-10-23 12:00:00');
        const next = withRestored(archived, [{ id: 1, is_visible: true }, { id: 3, is_visible: false }]);
        expect(next.map((i) => [i.isArchived, i.isVisible])).toEqual([[false, true], [false, true], [false, false]]);
    });

    // The edit form saves the raw row back with PUT, so a stale raw row would silently
    // undo a Hide or Archive the moment someone edits that product.
    it('keeps the raw row the edit form saves in step with every update', () => {
      const hidden = withVisibility(items, [1], false)[0].raw;
      expect(hidden.is_visible).toBe(0);
      expect(withVisibility(withVisibility(items, [1], false), [1], true)[0].raw.is_visible).toBe(1);

      const archived = withArchived(items, [1], '2026-10-23 12:00:00')[0].raw;
      expect(archived).toMatchObject({ is_visible: 0, archived_at: '2026-10-23 12:00:00' });

      const restored = withRestored(withArchived(items, [1], 'x'), [{ id: 1, is_visible: true }])[0].raw;
      expect(restored).toMatchObject({ is_visible: 1, archived_at: null });

      expect(withCategory(items, [1], 'yarn')[0].raw.categories).toEqual(['beads', 'yarn']);
    });

    it('exposes the raw row it was built from', () => {
      expect(item({ id: 7 }).raw).toMatchObject({ id: 7, sku: 'BD012' });
    });

    it('withCategory adds a link without duplicating or dropping one', () => {
        const next = withCategory(items, [1], 'yarn');
        expect(next[0].categories).toEqual(['beads', 'yarn']);
        expect(withCategory(next, [1], 'yarn')[0].categories).toEqual(['beads', 'yarn']);
        expect(next[1].categories).toEqual(['beads']);
    });
});

describe('buildDuplicatePayload', () => {
    const source = raw({
        id: 9, sku: 'BD012', name: 'Pony Beads Mix', name_th: 'ลูกปัด', slug: 'pony-beads-9',
        description: 'Bright', description_th: 'สดใส', usage: '[{"type":"beading"}]', attribute: 'Plastic',
        categories: ['beads', 'yarn'], category: 'beads', price: 40, price_1: 800, price_2: 700, price_3: 600,
        price_4: 500, price_5: 400, moq: '20 pcs', stock: 5, created_at: '2026-10-20 12:00:00',
        images: [
            { id: 1, image_key: 'a-large.webp', attribute_type: 'gallery', attribute_value: '', is_main: 1, price_1: null },
            { id: 2, image_key: 'b-large.webp', attribute_type: 'variant_link', attribute_value: '3"', is_main: 0, price_1: 0, price_3: 20 },
        ],
    });
    const copy = buildDuplicatePayload(source);

    it('starts hidden, so a copy never reaches the website by accident', () => {
        expect(copy.is_visible).toBe(false);
    });

    it('asks the Worker for a fresh SKU instead of reusing the original', () => {
        expect(copy.sku).toBeUndefined();
    });

    it('marks the names as copies in both languages', () => {
        expect(copy.name).toBe('Pony Beads Mix (copy)');
        expect(copy.name_th).toBe('ลูกปัด (สำเนา)');
    });

    it('leaves a missing Thai name missing', () => {
        expect(buildDuplicatePayload(raw({ name_th: null })).name_th).toBeNull();
    });

    it('carries the content, prices, box size and categories over', () => {
        expect(copy).toMatchObject({
            description: 'Bright', description_th: 'สดใส', usage: '[{"type":"beading"}]', attribute: 'Plastic',
            categories: ['beads', 'yarn'], category: 'beads', image_key: 'BD012-1700000000000',
            price_1: 800, price_2: 700, price_3: 600, price_4: 500, price_5: 400, moq: '20 pcs',
        });
    });

    it('keeps the gallery and variant images, pointing at the same stored files', () => {
        expect(copy.images).toEqual([
            { image_key: 'a-large.webp', attribute_type: 'gallery', attribute_value: '', is_main: true,
              price_1: null, price_2: null, price_3: null, price_4: null, price_5: null },
            { image_key: 'b-large.webp', attribute_type: 'variant_link', attribute_value: '3"', is_main: false,
              price_1: 0, price_2: null, price_3: 20, price_4: null, price_5: null },
        ]);
    });

    it('does not carry over row ids, slug or dates', () => {
        for (const key of ['id', 'slug', 'created_at', 'archived_at']) expect(copy).not.toHaveProperty(key);
    });

    it('copes with a product that has no images or categories', () => {
        const bare = buildDuplicatePayload(raw({ images: undefined, categories: [], category: 'yarn' }));
        expect(bare.images).toEqual([]);
        expect(bare.categories).toEqual(['yarn']);
    });
});
