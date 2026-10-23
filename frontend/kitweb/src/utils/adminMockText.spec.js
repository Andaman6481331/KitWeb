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
