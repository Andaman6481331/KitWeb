import { describe, it, expect } from 'vitest';
import { invoiceEditText } from './adminInvoiceText';

// Walk both languages together: same keys at every depth, nothing empty, and every
// function returns text for sample arguments.
const compare = (en, th, path = '') => {
    expect(Object.keys(th).sort(), `keys at ${path || 'root'}`).toEqual(Object.keys(en).sort());
    for (const key of Object.keys(en)) {
        const where = `${path}${key}`;
        expect(typeof th[key], where).toBe(typeof en[key]);
        if (typeof en[key] === 'function') {
            expect(String(en[key](2, 'x', 3)), where).not.toBe('');
            expect(String(th[key](2, 'x', 3)), where).not.toBe('');
        } else if (typeof en[key] === 'object') {
            compare(en[key], th[key], `${where}.`);
        } else {
            expect(en[key], where).toBeTruthy();
            expect(th[key], where).toBeTruthy();
        }
    }
};

describe('invoiceEditText', () => {
    it('has the same non-empty entries in English and Thai', () => {
        compare(invoiceEditText('en'), invoiceEditText('th'));
    });
    it('covers every checklist step and invoice status', () => {
        const en = invoiceEditText('en');
        for (const k of ['customer', 'items', 'valid', 'margin', 'stock']) expect(en.checks[k].label, k).toBeTruthy();
        for (const s of ['draft', 'sent', 'paid']) expect(en.status[s], s).toBeTruthy();
    });
    it('offers every payment term', () => {
        const en = invoiceEditText('en');
        for (const d of ['0', '7', '15', '30']) expect(en.termOptions[d], d).toBeTruthy();
    });
    it('tells staff nothing is saved to the system yet', () => {
        expect(invoiceEditText('en').preview).toMatch(/not connected/i);
    });
});
