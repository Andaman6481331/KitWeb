import { describe, it, expect } from 'vitest';
import { inventoryText } from './adminInventoryText';

const keysOf = (t) => Object.keys(t).sort();

describe('inventoryText', () => {
    const en = inventoryText('en');
    const th = inventoryText('th');

    it('has exactly the same entries in English and Thai', () => {
        expect(keysOf(th)).toEqual(keysOf(en));
    });

    it('never leaves an entry empty', () => {
        for (const t of [en, th]) {
            for (const [key, value] of Object.entries(t)) {
                if (typeof value === 'function') expect(String(value(2, 'x')), key).not.toBe('');
                else expect(value, key).toBeTruthy();
            }
        }
    });

    it('falls back to English for an unknown language', () => {
        expect(inventoryText('fr').title).toBe(en.title);
    });

    it('keeps the design copy', () => {
        expect(en.title).toBe('Standard Inventory');
        expect(th.title).toBe('คลังสินค้ามาตรฐาน');
        expect(en.subtitle).toBe('Ready-stock materials sold by size and color');
    });

    it('says archive, never delete, and promises restore', () => {
        expect(en.confirmBody).toMatch(/nothing is deleted/i);
        expect(en.confirmBody).toMatch(/restore/i);
        expect(en.typeWord).toBe('archive');
        expect(en.bulkArchive).not.toMatch(/delete/i);
    });

    it('pluralises counts in English and not in Thai', () => {
        expect(en.optionsN(1)).toBe('1 option');
        expect(en.optionsN(3)).toBe('3 options');
        expect(th.optionsN(3)).toBe('3 ตัวเลือก');
        expect(en.selectedN(2)).toBe('2 selected');
    });

    it('says which products are on screen, and how many there are in all', () => {
        expect(en.showingRange(21, 40, 118, 118)).toBe('Showing 21–40 of 118 products');
        expect(en.showingRange(1, 20, 118, 145)).toBe('Showing 1–20 of 118 products · 145 in total');
        expect(en.showingRange(0, 0, 0, 145)).toBe('Showing 0 of 145 products');
        expect(th.showingRange(21, 40, 118, 118)).toBe('แสดง 21–40 จาก 118 รายการ');
        expect(th.showingRange(1, 20, 118, 145)).toBe('แสดง 1–20 จาก 118 รายการ · ทั้งหมด 145');
        expect(th.showingRange(0, 0, 0, 145)).toBe('แสดง 0 จาก 145 รายการ');
    });

    it('labels the page controls', () => {
        expect(en.pagePrev).toBe('Previous');
        expect(en.pageNext).toBe('Next');
        expect(en.pagesLabel).toBe('Pages');
        expect(en.goToPage(3)).toBe('Go to page 3');
        expect(th.goToPage(3)).toBe('ไปหน้า 3');
    });

    it('names what an action did', () => {
        expect(en.toastHidden(1)).toBe('1 product hidden from website');
        expect(en.toastShown(2)).toBe('2 products now on website');
        expect(en.toastArchived(1, 'Pony Beads')).toBe('Archived “Pony Beads”');
        expect(en.toastArchived(3)).toBe('Archived 3 products');
        expect(en.toastRestored(2)).toBe('Restored 2 products. They stay hidden until you show them.');
        expect(en.toastAddedToCategory(2, 'Beads')).toBe('Added 2 products to Beads');
    });
});
