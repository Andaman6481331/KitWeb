import { describe, it, expect } from 'vitest';
import { invoicesText, customersText } from './adminMockText';

const sameEntries = (make) => {
    const en = make('en');
    const th = make('th');
    expect(Object.keys(th).sort()).toEqual(Object.keys(en).sort());
    for (const t of [en, th]) {
        for (const [key, value] of Object.entries(t)) {
            if (typeof value === 'function') expect(String(value(2, 3)), key).not.toBe('');
            else expect(value, key).toBeTruthy();
        }
    }
    return { en, th };
};

describe('page controls text', () => {
    it('words the range like the product list, in both languages', () => {
        const inv = { en: invoicesText('en'), th: invoicesText('th') };
        expect(inv.en.showingRange(21, 40, 3224, 3224)).toBe('Showing 21–40 of 3224 invoices');
        expect(inv.en.showingRange(1, 20, 118, 3224)).toBe('Showing 1–20 of 118 invoices · 3224 in total');
        expect(inv.en.showingRange(0, 0, 0, 3224)).toBe('Showing 0 of 3224 invoices');
        expect(inv.th.showingRange(21, 40, 3224, 3224)).toBe('แสดง 21–40 จาก 3224 ฉบับ');
        const cus = { en: customersText('en'), th: customersText('th') };
        expect(cus.en.showingRange(1, 20, 651, 651)).toBe('Showing 1–20 of 651 customers');
        expect(cus.th.showingRange(1, 20, 12, 651)).toBe('แสดง 1–20 จาก 12 ราย · ทั้งหมด 651');
        for (const t of [inv.en, inv.th, cus.en, cus.th]) {
            expect(t.goToPage(3)).toMatch(/3/);
            for (const key of ['pagesLabel', 'pagePrev', 'pageNext']) expect(t[key], key).toBeTruthy();
        }
    });
});

describe('invoicesText', () => {
    it('has the same non-empty entries in both languages', () => {
        sameEntries(invoicesText);
    });
    it('labels every status', () => {
        const { en } = sameEntries(invoicesText);
        for (const s of ['paid', 'sent', 'overdue', 'draft']) expect(en.status[s], s).toBeTruthy();
    });
    it('tells staff the data is not real yet', () => {
        expect(invoicesText('en').preview).toMatch(/not connected/i);
    });
});

describe('customersText', () => {
    it('has the same non-empty entries in both languages', () => {
        sameEntries(customersText);
    });
    it('labels every segment', () => {
        const { en } = sameEntries(customersText);
        for (const s of ['retail', 'wholesale', 'school', 'temple']) expect(en.segment[s], s).toBeTruthy();
    });
    it('tells staff the data is not real yet', () => {
        expect(customersText('en').preview).toMatch(/not connected/i);
    });
});
