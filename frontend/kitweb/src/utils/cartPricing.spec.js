import { describe, it, expect } from 'vitest';
import { isPriced, isUnpricedItem, cartHasUnpriced } from './cartPricing';

const item = (over = {}) => ({
    id: 1, name: 'Cloud Yarn', selectedSize: 'Standard', selectedColor: 'Default',
    price: 42, quantity: 20, ...over
});

describe('isPriced', () => {
    it('accepts a positive price', () => {
        expect(isPriced(42)).toBe(true);
    });

    it('rejects zero, because an unpriced product is not a free one', () => {
        expect(isPriced(0)).toBe(false);
    });

    it('rejects a missing price', () => {
        expect(isPriced(null)).toBe(false);
        expect(isPriced(undefined)).toBe(false);
    });

    it('rejects a negative or non-numeric price', () => {
        expect(isPriced(-5)).toBe(false);
        expect(isPriced('abc')).toBe(false);
    });
});

describe('isUnpricedItem', () => {
    it('flags a cart line whose price never loaded', () => {
        expect(isUnpricedItem(item({ price: 0 }))).toBe(true);
    });

    it('leaves a normally priced line alone', () => {
        expect(isUnpricedItem(item())).toBe(false);
    });
});

describe('cartHasUnpriced', () => {
    it('is false for a fully priced cart', () => {
        expect(cartHasUnpriced([item(), item({ price: 90 })])).toBe(false);
    });

    it('is true when a single line is unpriced', () => {
        expect(cartHasUnpriced([item(), item({ price: 0 })])).toBe(true);
    });

    it('is false for an empty cart', () => {
        expect(cartHasUnpriced([])).toBe(false);
    });
});
