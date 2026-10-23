import { describe, it, expect } from 'vitest';
import {
    customerRows, filterCustomers, sortCustomers, customerSegmentChips, initials, CUSTOMER_SEGMENTS,
} from './adminCustomers';

const NOW = Date.parse('2026-10-23T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const row = (over) => ({
    id: 'C-1', name: 'Somchai Jaidee', nameTh: 'สมชาย ใจดี', phone: '081-234-5678', line: 'somchai.j',
    segment: 'retail', orders: 3, spent: 4500, lastOrderAt: NOW - 5 * DAY, ...over,
});

describe('customerRows (placeholder data)', () => {
    const rows = customerRows(NOW);

    it('is a believable list covering every segment', () => {
        expect(rows.length).toBeGreaterThanOrEqual(10);
        for (const segment of CUSTOMER_SEGMENTS) expect(rows.some((r) => r.segment === segment), segment).toBe(true);
    });

    it('has unique ids and plausible numbers', () => {
        expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
        expect(rows.every((r) => r.orders >= 1 && r.spent > 0 && r.lastOrderAt <= NOW)).toBe(true);
    });

    it('keeps the contact details to obviously fake numbers', () => {
        expect(rows.every((r) => /^0\d{2}-000-\d{4}$/.test(r.phone))).toBe(true);
    });
});

describe('filterCustomers', () => {
    const rows = [
        row({ id: 'A', name: 'Alpha School', nameTh: 'โรงเรียนอัลฟา', segment: 'school', phone: '081-000-1111' }),
        row({ id: 'B', name: 'Beta Temple', nameTh: 'วัดเบต้า', segment: 'temple', line: 'beta.temple' }),
        row({ id: 'C', name: 'Gamma Shop', segment: 'wholesale' }),
    ];
    const ids = (f) => filterCustomers(rows, { query: '', segment: 'all', ...f }).map((r) => r.id);

    it('returns everything with no filters', () => expect(ids({})).toEqual(['A', 'B', 'C']));
    it('filters by segment', () => expect(ids({ segment: 'temple' })).toEqual(['B']));
    it('searches name in either language, phone and LINE id', () => {
        expect(ids({ query: 'gamma' })).toEqual(['C']);
        expect(ids({ query: 'โรงเรียน' })).toEqual(['A']);
        expect(ids({ query: '1111' })).toEqual(['A']);
        expect(ids({ query: 'beta.temple' })).toEqual(['B']);
    });
});

describe('sortCustomers', () => {
    const rows = [
        row({ id: 'A', name: 'Zeta', orders: 9, spent: 100, lastOrderAt: NOW - 20 * DAY }),
        row({ id: 'B', name: 'alpha', orders: 2, spent: 900, lastOrderAt: NOW - 1 * DAY }),
        row({ id: 'C', name: 'Mu', orders: 5, spent: 500, lastOrderAt: NOW - 8 * DAY }),
    ];
    const order = (key, dir) => sortCustomers(rows, { key, dir }, 'en').map((r) => r.id);

    it('sorts names ignoring case', () => expect(order('name', 'asc')).toEqual(['B', 'C', 'A']));
    it('sorts by number of orders', () => expect(order('orders', 'desc')).toEqual(['A', 'C', 'B']));
    it('sorts by lifetime spend', () => expect(order('spent', 'desc')).toEqual(['B', 'C', 'A']));
    it('puts the most recent buyer first', () => expect(order('recent', 'desc')).toEqual(['B', 'C', 'A']));
});

describe('customerSegmentChips', () => {
    it('counts each segment with All first', () => {
        const chips = customerSegmentChips([row({ segment: 'school' }), row({ segment: 'school' }), row({ segment: 'retail' })]);
        expect(chips[0]).toEqual({ key: 'all', count: 3 });
        expect(chips.find((c) => c.key === 'school').count).toBe(2);
        expect(chips.find((c) => c.key === 'temple').count).toBe(0);
    });
});

describe('initials', () => {
    it('takes the first letter of up to two words', () => {
        expect(initials('Somchai Jaidee')).toBe('SJ');
        expect(initials('Wat')).toBe('W');
        expect(initials('  ')).toBe('?');
    });
    it('copes with Thai names', () => {
        expect(initials('สมชาย ใจดี')).toBe('สใ');
    });
});
