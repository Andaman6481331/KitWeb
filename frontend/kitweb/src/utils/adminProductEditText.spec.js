import { describe, it, expect } from 'vitest';
import { productEditText } from './adminProductEditText';
import { inventoryText } from './adminInventoryText';

describe('productEditText', () => {
    const en = productEditText('en');
    const th = productEditText('th');

    it('has the same keys in both languages', () => {
        expect(Object.keys(th).sort()).toEqual(Object.keys(en).sort());
    });

    it('has no empty entry, and every function entry returns text', () => {
        for (const [name, t] of [['en', en], ['th', th]]) {
            for (const [key, value] of Object.entries(t)) {
                if (typeof value === 'function') expect(String(value(2, 3)), `${name}.${key}`).not.toBe('');
                else expect(value, `${name}.${key}`).toBeTruthy();
            }
        }
    });

    it('names the five levels as the owner does', () => {
        expect([en.lvl1, en.lvl2, en.lvl3, en.lvl4, en.lvl5]).toEqual(['Retail', 'Small wholesale', 'Wholesale', 'Special A', 'Special B']);
    });

    it('falls back to English for an unknown language', () => {
        expect(productEditText('xx')).toBe(en);
    });

    it('says plainly that removing archives', () => {
        expect(en.removedNote).toMatch(/archived/i);
        expect(en.removedNote).not.toMatch(/delete[^d]/i);
    });
});

describe('inventoryText.toastSaved', () => {
    it('exists in both languages', () => {
        expect(inventoryText('en').toastSaved).toBeTruthy();
        expect(inventoryText('th').toastSaved).toBeTruthy();
    });
});
