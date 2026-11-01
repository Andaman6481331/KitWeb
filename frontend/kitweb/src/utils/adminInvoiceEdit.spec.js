import { describe, it, expect } from 'vitest';
import {
    LEVEL_NAMES, priceAt, qtyLevel, effectiveLevel, upsellHint, computeLine, computeInvoice,
    invoiceChecks, dueDate, nextInvoiceNumber, stockState,
} from './adminInvoiceEdit';

// Same shape as the mock catalogue: five tier prices come from anchor x multiplier,
// and moq holds the quantity at which each of the first three levels unlocks.
const yarn = { id: 'y', anchor: 35, cost: 22, stock: 120, moq: [1, 12, 50, 100, 300] };
const handPriced = { id: 'h', anchor: 65, cost: 44, stock: 60, moq: [1, 6, 24, 100, 300], manual: { 0: 135 } };
const byId = { y: yarn, h: handPriced };

describe('priceAt', () => {
    it('steps down the five levels from the anchor price', () => {
        expect([0, 1, 2, 3, 4].map((i) => priceAt(yarn, i))).toEqual([70, 63, 53, 39, 35]);
    });
    it('lets a hand-set price replace one level', () => {
        expect(priceAt(handPriced, 0)).toBe(135);
        expect(priceAt(handPriced, 1)).toBe(117);
    });
});

describe('qtyLevel / effectiveLevel', () => {
    it('unlocks Small wholesale and Wholesale by quantity, never Special', () => {
        expect(qtyLevel(yarn, 1)).toBe(0);
        expect(qtyLevel(yarn, 12)).toBe(1);
        expect(qtyLevel(yarn, 50)).toBe(2);
        expect(qtyLevel(yarn, 300)).toBe(2);
    });
    it('never drops below the customer level', () => {
        expect(effectiveLevel(yarn, 1, 3)).toBe(3);
        expect(effectiveLevel(yarn, 60, 1)).toBe(2);
        expect(effectiveLevel(yarn, 60, 4)).toBe(4);
    });
});

describe('upsellHint', () => {
    it('says how many more pieces reach the next level', () => {
        expect(upsellHint(yarn, 5, 0)).toEqual({ level: 1, more: 7, price: 63 });
        expect(upsellHint(yarn, 12, 1)).toEqual({ level: 2, more: 38, price: 53 });
    });
    it('is silent at Wholesale and above, or with no quantity', () => {
        expect(upsellHint(yarn, 60, 2)).toBeNull();
        expect(upsellHint(yarn, 0, 0)).toBeNull();
    });
});

describe('stockState', () => {
    it('separates out, over, low and fine', () => {
        expect(stockState({ stock: 0 }, 1)).toBe('out');
        expect(stockState({ stock: 30 }, 31)).toBe('over');
        expect(stockState({ stock: 7 }, 2)).toBe('low');
        expect(stockState({ stock: 120 }, 60)).toBe('ok');
    });
});

describe('computeLine', () => {
    it('prices at the quantity-unlocked level', () => {
        const l = computeLine(yarn, { qty: '60', override: null }, 0);
        expect(l).toMatchObject({ qty: 60, level: 2, unit: 53, total: 3180, edited: false });
    });
    it('uses a typed price and marks it edited', () => {
        const l = computeLine(yarn, { qty: '10', override: '30' }, 0);
        expect(l).toMatchObject({ unit: 30, total: 300, edited: true });
    });
    it('flags below cost and bad lines', () => {
        expect(computeLine(yarn, { qty: '10', override: '20' }, 0).belowCost).toBe(true);
        expect(computeLine(yarn, { qty: '', override: null }, 0).bad).toBe(true);
        expect(computeLine(yarn, { qty: '5', override: '0' }, 0).bad).toBe(true);
    });
});

describe('computeInvoice', () => {
    const lines = [{ key: 1, variantId: 'y', qty: '60', override: null }, { key: 2, variantId: 'h', qty: '10', override: null }];
    const inv = computeInvoice({ lines, variants: byId, customerLevel: 0, discount: '100', shipping: '60' });

    it('adds up subtotal, discount, shipping and total', () => {
        // yarn 60 @ L2 53 = 3180; handPriced 10 @ L1 (qty>=6) 117 = 1170
        expect(inv.subtotal).toBe(4350);
        expect(inv.total).toBe(4350 - 100 + 60);
    });
    it('works out the internal margin on the discounted goods', () => {
        expect(inv.cost).toBe(60 * 22 + 10 * 44);
        expect(inv.margin).toBe(4250 - inv.cost);
        expect(inv.marginPct).toBe(Math.round((inv.margin / 4250) * 100));
    });
    it('never lets a discount push the goods below zero', () => {
        const big = computeInvoice({ lines, variants: byId, customerLevel: 0, discount: '999999', shipping: '0' });
        expect(big.total).toBe(0);
    });
    it('treats junk money fields as zero', () => {
        const junk = computeInvoice({ lines, variants: byId, customerLevel: 0, discount: 'abc', shipping: '' });
        expect(junk.total).toBe(4350);
    });
    it('keeps what was typed in the quantity box, even when it is empty', () => {
        const typed = computeInvoice({
            lines: [{ key: 1, variantId: 'y', qty: '', override: null }, { key: 2, variantId: 'y', qty: '07', override: '30' }],
            variants: byId, customerLevel: 0, discount: '0', shipping: '0',
        });
        expect(typed.lines.map((l) => l.qtyText)).toEqual(['', '07']);
        expect(typed.lines[1].override).toBe('30');
    });
    it('counts problem lines', () => {
        const mixed = computeInvoice({
            lines: [{ key: 1, variantId: 'y', qty: '200', override: null }, { key: 2, variantId: 'y', qty: '0', override: null }],
            variants: byId, customerLevel: 0, discount: '0', shipping: '0',
        });
        expect(mixed.counts).toEqual({ over: 1, below: 0, bad: 1 });
    });
});

describe('invoiceChecks', () => {
    const base = { hasCustomer: true, lineCount: 2, counts: { over: 0, below: 0, bad: 0 } };
    const state = (over) => Object.fromEntries(invoiceChecks({ ...base, ...over }).map((c) => [c.key, c.state]));

    it('is complete when everything is fine', () => {
        const checks = invoiceChecks(base);
        expect(checks.every((c) => c.state === 'ok')).toBe(true);
        expect(checks.map((c) => c.key)).toEqual(['customer', 'items', 'valid', 'margin', 'stock']);
    });
    it('asks for a customer and items', () => {
        expect(state({ hasCustomer: false, lineCount: 0 })).toMatchObject({ customer: 'todo', items: 'todo' });
    });
    it('treats bad lines as an error and the rest as advice', () => {
        expect(state({ counts: { over: 1, below: 2, bad: 3 } })).toMatchObject({ valid: 'err', margin: 'todo', stock: 'todo' });
    });
});

describe('dueDate', () => {
    it('adds the payment terms to the issue date', () => {
        expect(dueDate('2026-10-12', 7)).toBe('2026-10-19');
        expect(dueDate('2026-10-28', 7)).toBe('2026-11-04');
        expect(dueDate('2026-12-30', 7)).toBe('2027-01-06');
        expect(dueDate('2026-10-12', 0)).toBe('2026-10-12');
    });
});

describe('nextInvoiceNumber', () => {
    it('continues from the highest number in the year', () => {
        expect(nextInvoiceNumber(['INV-2026-0112', 'INV-2026-0101'], 2026)).toBe('INV-2026-0113');
    });
    it('starts the year at 0001 and ignores other years', () => {
        expect(nextInvoiceNumber([], 2026)).toBe('INV-2026-0001');
        expect(nextInvoiceNumber(['INV-2025-0300'], 2026)).toBe('INV-2026-0001');
    });
});

describe('LEVEL_NAMES', () => {
    it('names five levels in both languages', () => {
        expect(LEVEL_NAMES.en).toHaveLength(5);
        expect(LEVEL_NAMES.th).toHaveLength(5);
    });
});
