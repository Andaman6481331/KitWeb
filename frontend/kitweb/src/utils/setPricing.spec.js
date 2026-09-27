import { describe, it, expect } from 'vitest';
import { tierBoxPrice, rollUpSet } from './setPricing';

const line = (over = {}) => ({
    product_id: 1, variant_id: null, quantity: 20, name: 'Cloud Yarn',
    moq: '20 pcs', price_1: 840, price_2: 0, price_3: 0, ...over
});

describe('tierBoxPrice', () => {
    it('returns the requested tier when it is populated', () => {
        expect(tierBoxPrice(line({ price_1: 840, price_2: 800, price_3: 760 }), 3)).toBe(760);
    });

    it('falls back down to the next populated tier', () => {
        expect(tierBoxPrice(line({ price_1: 840, price_2: 800, price_3: 0 }), 3)).toBe(800);
    });

    it('returns 0 when no tier is populated', () => {
        expect(tierBoxPrice(line({ price_1: 0, price_2: 0, price_3: 0 }), 1)).toBe(0);
    });
});

describe('rollUpSet', () => {
    it('prices a line per piece and multiplies by quantity', () => {
        // 840 per box of 20 -> 42.00 per piece; 20 pieces -> 840.00
        const out = rollUpSet({ price_tier: 1, discount_pct: 0, items: [line()] });
        expect(out.lines[0].perPiecePrice).toBe(42);
        expect(out.lines[0].lineTotal).toBe(840);
        expect(out.subtotal).toBe(840);
        expect(out.total).toBe(840);
    });

    it('sums multiple lines', () => {
        const out = rollUpSet({
            price_tier: 1, discount_pct: 0,
            items: [line(), line({ name: 'Safety Eyes', moq: '50 pcs', price_1: 160, quantity: 50 })]
        });
        expect(out.subtotal).toBe(1000);
    });

    it('applies the discount percentage to the subtotal', () => {
        const out = rollUpSet({ price_tier: 1, discount_pct: 5, items: [line()] });
        expect(out.discountAmount).toBe(42);
        expect(out.total).toBe(798);
    });

    it('treats a line with no populated tier as zero rather than NaN', () => {
        const out = rollUpSet({
            price_tier: 1, discount_pct: 0,
            items: [line({ price_1: 0, price_2: 0, price_3: 0 })]
        });
        expect(out.lines[0].lineTotal).toBe(0);
        expect(out.subtotal).toBe(0);
    });

    it('defaults a missing moq to a box of 1 rather than dividing by zero', () => {
        const out = rollUpSet({
            price_tier: 1, discount_pct: 0,
            items: [line({ moq: null, price_1: 15, quantity: 3 })]
        });
        expect(out.lines[0].perPiecePrice).toBe(15);
        expect(out.lines[0].lineTotal).toBe(45);
    });

    it('returns a zero total for a set with no items', () => {
        const out = rollUpSet({ price_tier: 1, discount_pct: 10, items: [] });
        expect(out.subtotal).toBe(0);
        expect(out.total).toBe(0);
    });
});
