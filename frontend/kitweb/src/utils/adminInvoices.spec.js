import { describe, it, expect } from 'vitest';
import {
    invoiceRows, filterInvoices, sortInvoices, summarizeInvoices, invoiceStatusChips, INVOICE_STATUSES,
} from './adminInvoices';

const NOW = Date.parse('2026-10-23T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const row = (over) => ({
    id: 'INV-1', customer: 'Alpha School', customerTh: 'โรงเรียนอัลฟา', status: 'sent',
    amount: 1000, issuedAt: NOW - 3 * DAY, dueAt: NOW + 10 * DAY, ...over,
});

describe('invoiceRows (placeholder data)', () => {
    const rows = invoiceRows(NOW);

    it('is a believable list covering every status', () => {
        expect(rows.length).toBeGreaterThanOrEqual(10);
        for (const status of INVOICE_STATUSES) expect(rows.some((r) => r.status === status), status).toBe(true);
    });

    it('has unique invoice numbers and positive amounts', () => {
        expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
        expect(rows.every((r) => r.amount > 0)).toBe(true);
    });

    it('keeps overdue invoices actually past due, and open ones not', () => {
        for (const r of rows) {
            if (r.status === 'overdue') expect(r.dueAt, r.id).toBeLessThan(NOW);
            if (r.status === 'sent') expect(r.dueAt, r.id).toBeGreaterThanOrEqual(NOW);
        }
    });

    it('dates everything relative to now, so the page never looks stale', () => {
        const later = invoiceRows(NOW + 30 * DAY);
        expect(later[0].issuedAt - rows[0].issuedAt).toBe(30 * DAY);
    });
});

describe('filterInvoices', () => {
    const rows = [
        row({ id: 'INV-1', customer: 'Alpha School', status: 'paid' }),
        row({ id: 'INV-2', customer: 'Beta Temple', customerTh: 'วัดเบต้า', status: 'overdue' }),
        row({ id: 'INV-3', customer: 'Gamma Shop', status: 'sent' }),
    ];
    const ids = (f) => filterInvoices(rows, { query: '', status: 'all', ...f }).map((r) => r.id);

    it('returns everything with no filters', () => expect(ids({})).toEqual(['INV-1', 'INV-2', 'INV-3']));
    it('filters by status', () => expect(ids({ status: 'overdue' })).toEqual(['INV-2']));
    it('searches customer (either language) and invoice number', () => {
        expect(ids({ query: 'gamma' })).toEqual(['INV-3']);
        expect(ids({ query: 'วัด' })).toEqual(['INV-2']);
        expect(ids({ query: 'inv-1' })).toEqual(['INV-1']);
    });
});

describe('sortInvoices', () => {
    const rows = [
        row({ id: 'A', customer: 'Zeta', amount: 500, issuedAt: NOW - 1 * DAY }),
        row({ id: 'B', customer: 'alpha', amount: 900, issuedAt: NOW - 9 * DAY }),
        row({ id: 'C', customer: 'Mu', amount: 100, issuedAt: NOW - 5 * DAY }),
    ];
    const order = (key, dir, lang = 'en') => sortInvoices(rows, { key, dir }, lang).map((r) => r.id);

    it('puts the newest invoice first by default', () => expect(order('issued', 'desc')).toEqual(['A', 'C', 'B']));
    it('sorts by amount', () => expect(order('amount', 'desc')).toEqual(['B', 'A', 'C']));
    it('sorts customers ignoring case', () => expect(order('customer', 'asc')).toEqual(['B', 'C', 'A']));
});

describe('summarizeInvoices', () => {
    it('adds up what is still owed, what is late, and what was paid recently', () => {
        const rows = [
            row({ status: 'sent', amount: 1000 }),
            row({ status: 'overdue', amount: 400 }),
            row({ status: 'paid', amount: 700, issuedAt: NOW - 10 * DAY }),
            row({ status: 'paid', amount: 9999, issuedAt: NOW - 90 * DAY }),
            row({ status: 'draft', amount: 5000 }),
        ];
        expect(summarizeInvoices(rows, NOW)).toEqual({
            outstanding: 1400, outstandingCount: 2, overdue: 400, overdueCount: 1, paidRecently: 700, paidRecentlyCount: 1,
        });
    });
});

describe('invoiceStatusChips', () => {
    it('counts each status with All first', () => {
        const rows = [row({ status: 'paid' }), row({ status: 'paid' }), row({ status: 'draft' })];
        const chips = invoiceStatusChips(rows);
        expect(chips[0]).toEqual({ key: 'all', count: 3 });
        expect(chips.find((c) => c.key === 'paid').count).toBe(2);
        expect(chips.find((c) => c.key === 'overdue').count).toBe(0);
    });
});
