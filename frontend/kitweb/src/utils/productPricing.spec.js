import { describe, it, expect } from 'vitest';
import { MAX_ORDER_QTY, clampTypedQty, stepQty } from './productPricing';

describe('clampTypedQty', () => {
    it('leaves a quantity that already fills whole boxes alone', () => {
        expect(clampTypedQty(40, 20)).toEqual({ qty: 40, reason: null });
    });

    it('rounds a partial box UP, so the customer is never quoted a box they cannot buy', () => {
        expect(clampTypedQty(21, 20)).toEqual({ qty: 40, reason: 'rounded' });
    });

    it('rounds up from a single piece to one full box', () => {
        expect(clampTypedQty(1, 20)).toEqual({ qty: 20, reason: 'rounded' });
    });

    it('treats zero as a deliberate "none of this variant", not a rounding error', () => {
        expect(clampTypedQty(0, 20)).toEqual({ qty: 0, reason: null });
    });

    it('floors a negative typed quantity to zero rather than inverting the order total', () => {
        expect(clampTypedQty(-5, 20)).toEqual({ qty: 0, reason: null });
    });

    it('drops a typed decimal to whole pieces before boxing it', () => {
        expect(clampTypedQty(20.7, 20)).toEqual({ qty: 40, reason: 'rounded' });
    });

    it('reads a pasted or malformed value as zero instead of NaN', () => {
        expect(clampTypedQty('abc', 20)).toEqual({ qty: 0, reason: null });
        expect(clampTypedQty(NaN, 20)).toEqual({ qty: 0, reason: null });
        expect(clampTypedQty(null, 20)).toEqual({ qty: 0, reason: null });
    });

    it('caps an absurd quantity at the maximum instead of accepting it', () => {
        expect(clampTypedQty(999999999, 1)).toEqual({ qty: MAX_ORDER_QTY, reason: 'capped' });
    });

    it('caps DOWN to a whole box, so the cap never leaves a partial box behind', () => {
        // 10000 is not a multiple of 300; rounding up would exceed the cap, so the
        // last whole box under it (9900) is the honest answer.
        expect(clampTypedQty(999999, 300)).toEqual({ qty: 9900, reason: 'capped' });
    });

    it('reports capped rather than rounded when a value does both', () => {
        expect(clampTypedQty(20001, 20)).toEqual({ qty: 10000, reason: 'capped' });
    });

    it('still yields one box when the box itself is larger than the cap', () => {
        expect(clampTypedQty(50000, 20000)).toEqual({ qty: 20000, reason: 'capped' });
    });

    it('treats a missing box size as single pieces', () => {
        expect(clampTypedQty(7, 1)).toEqual({ qty: 7, reason: null });
    });
});

describe('stepQty', () => {
    it('adds a whole box, so the cart agrees with the dialog about box sizes', () => {
        expect(stepQty(20, 1, 20)).toBe(40);
    });

    it('removes a whole box', () => {
        expect(stepQty(40, -1, 20)).toBe(20);
    });

    it('steps a single piece when the product has no box grouping', () => {
        expect(stepQty(3, 1, 1)).toBe(4);
    });

    it('returns zero when stepping down off the last box, so the caller can drop the line', () => {
        expect(stepQty(20, -1, 20)).toBe(0);
    });

    it('never goes negative', () => {
        expect(stepQty(10, -1, 20)).toBe(0);
    });

    it('realigns a legacy off-box quantity onto the box grid when stepping up', () => {
        // Carts saved before the cart stepper respected MOQ can hold 21 of a 20-box
        // product; stepping up should land on 40, not 41.
        expect(stepQty(21, 1, 20)).toBe(40);
    });

    it('realigns an off-box quantity DOWN to the box below when stepping down', () => {
        expect(stepQty(21, -1, 20)).toBe(20);
    });

    it('will not step past the maximum', () => {
        expect(stepQty(MAX_ORDER_QTY, 1, 20)).toBe(MAX_ORDER_QTY);
    });
});
