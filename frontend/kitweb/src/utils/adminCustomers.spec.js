import { describe, it, expect } from 'vitest';
import {
    customerRows, filterCustomers, sortCustomers, customerSegmentChips, initials, CUSTOMER_SEGMENTS,
    newCustomer, isDuplicateName,
} from './adminCustomers';

const NOW = Date.parse('2026-10-23T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const row = (over) => ({
    id: 'C-1', name: 'Somchai Jaidee', nameTh: 'สมชาย ใจดี', phone: '081-234-5678', line: 'somchai.j',
    segment: 'retail', orders: 3, spent: 4500, lastOrderAt: NOW - 5 * DAY,
    contact: 'Khun Somchai', level: 0, outstanding: 0, ...over,
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

describe('placeholder customers carry what invoices need', () => {
    const rows = customerRows(NOW);
    it('has a contact person, a price level 0-4 and a balance', () => {
        expect(rows.every((r) => r.contact && Number.isInteger(r.level) && r.level >= 0 && r.level <= 4 && r.outstanding >= 0)).toBe(true);
    });
    it('covers several levels and at least one customer with a balance', () => {
        expect(new Set(rows.map((r) => r.level)).size).toBeGreaterThanOrEqual(3);
        expect(rows.some((r) => r.outstanding > 0)).toBe(true);
    });
});

describe('isDuplicateName', () => {
    const rows = [row({ name: 'Alpha Shop', nameTh: 'อัลฟา' })];
    it('ignores case and surrounding spaces, in either language', () => {
        expect(isDuplicateName(rows, '  alpha shop ')).toBe(true);
        expect(isDuplicateName(rows, 'อัลฟา')).toBe(true);
    });
    it('is false for a new or empty name', () => {
        expect(isDuplicateName(rows, 'Beta')).toBe(false);
        expect(isDuplicateName(rows, '   ')).toBe(false);
    });
});

describe('newCustomer', () => {
    const rows = [row({ id: 'C-1001' }), row({ id: 'C-1007' })];
    const made = newCustomer(rows, { name: '  Nong Mai  ', contact: ' Khun Mai ', phone: '', level: '3' }, NOW);

    it('trims the fields and uses the name for both languages', () => {
        expect(made).toMatchObject({ name: 'Nong Mai', nameTh: 'Nong Mai', contact: 'Khun Mai', level: 3 });
    });
    it('starts with no orders, spend or balance and shows missing fields as a dash', () => {
        expect(made).toMatchObject({ orders: 0, spent: 0, outstanding: 0, phone: '—', line: '—', lastOrderAt: null });
    });
    it('gets the next free id and a segment that follows the level', () => {
        expect(made.id).toBe('C-1008');
        expect(made.segment).toBe('wholesale');
        expect(newCustomer(rows, { name: 'X', level: '0' }, NOW).segment).toBe('retail');
    });
    it('defaults the level to Small wholesale like the design and rejects junk levels', () => {
        expect(newCustomer(rows, { name: 'X' }, NOW).level).toBe(1);
        expect(newCustomer(rows, { name: 'X', level: '9' }, NOW).level).toBe(1);
    });
});
