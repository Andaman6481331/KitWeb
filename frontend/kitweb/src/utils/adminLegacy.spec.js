import { describe, it, expect } from 'vitest';
import { legacyCustomerRow, legacyInvoiceRow, isLegacy } from './adminLegacy';
import { filterInvoices, summarizeInvoices, invoiceStatusChips } from './adminInvoices';
import { filterCustomers, customerSegmentChips } from './adminCustomers';

const customer = { id: 'LC-1', name: 'ร้านเอ', phone: '', orders: 2, spent: 350, outstanding: 100, last_order_on: '2026-09-01', status: 'unverified' };
const invoice = { id: 'LI-60136-20260821-1', order_no: '60136', customer_id: 'LC-1', customer_name: 'ร้านเอ', sold_on: '2026-08-21', paid: 1, total: 250, line_count: 3, access_type: 'Order' };

describe('legacyCustomerRow', () => {
    it('tags the row and fills the page shape without inventing data', () => {
        const row = legacyCustomerRow(customer);
        expect(row).toMatchObject({
            id: 'LC-1', name: 'ร้านเอ', nameTh: 'ร้านเอ', segment: 'legacy', source: 'legacy', levelUnset: true,
            contact: '—', phone: '—', line: '—', orders: 2, spent: 350, outstanding: 100,
        });
        expect(row.lastOrderAt).toBe(Date.parse('2026-09-01T00:00:00+07:00'));
        expect(isLegacy(row)).toBe(true);
    });
    it('has no last order when the customer never bought', () => {
        expect(legacyCustomerRow({ ...customer, orders: 0, last_order_on: null }).lastOrderAt).toBeNull();
    });
});

describe('legacyInvoiceRow', () => {
    it('maps paid and unpaid, with no due date', () => {
        expect(legacyInvoiceRow(invoice)).toMatchObject({ number: '60136', status: 'paid', amount: 250, dueAt: null, source: 'legacy', lineCount: 3 });
        expect(legacyInvoiceRow({ ...invoice, paid: 0 }).status).toBe('unpaid');
    });
});

describe('lists with legacy rows', () => {
    const rows = [legacyInvoiceRow(invoice), legacyInvoiceRow({ ...invoice, id: 'LI-2', order_no: '2', paid: 0, sold_on: '2026-09-01' })];
    const native = { id: 'INV-2026-0001', customer: 'Khun A', customerTh: 'คุณเอ', status: 'sent', amount: 500, issuedAt: Date.now(), dueAt: Date.now() + 1e8 };

    it('finds a legacy invoice by its order number and by the legacy chip', () => {
        const all = rows.concat(native);
        expect(filterInvoices(all, { query: '60136', status: 'all' }).map((r) => r.id)).toEqual(['LI-60136-20260821-1']);
        expect(filterInvoices(all, { query: '', status: 'legacy' })).toHaveLength(2);
        expect(filterInvoices(all, { query: '', status: 'unpaid' }).map((r) => r.id)).toEqual(['LI-2']);
    });

    it('keeps legacy rows out of the summary cards', () => {
        const s = summarizeInvoices(rows.concat(native), Date.now());
        expect(s.outstanding).toBe(500);
        expect(s.paidRecently).toBe(0);
    });

    it('adds Unpaid and Legacy chips only when legacy rows exist', () => {
        expect(invoiceStatusChips([native]).map((c) => c.key)).not.toContain('legacy');
        const keys = invoiceStatusChips(rows).map((c) => c.key);
        expect(keys).toEqual(expect.arrayContaining(['unpaid', 'legacy']));
        expect(invoiceStatusChips(rows).find((c) => c.key === 'legacy').count).toBe(2);
    });

    it('adds a Legacy customer chip and filters by it', () => {
        const list = [legacyCustomerRow(customer), { id: 'C-1', name: 'A', nameTh: 'เอ', phone: '1', line: 'a', segment: 'retail' }];
        expect(customerSegmentChips(list).find((c) => c.key === 'legacy').count).toBe(1);
        expect(customerSegmentChips(list.slice(1)).some((c) => c.key === 'legacy')).toBe(false);
        expect(filterCustomers(list, { query: '', segment: 'legacy' }).map((r) => r.id)).toEqual(['LC-1']);
    });
});
