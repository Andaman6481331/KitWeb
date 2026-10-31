import { describe, it, expect } from 'vitest';
import { cashSaleText, merchantReceiptText, customerReceiptText } from './adminCashSaleText';

describe('cashSaleText', () => {
  const en = cashSaleText('en');
  const th = cashSaleText('th');

  it('has the same entries in both languages', () => {
    expect(Object.keys(th).sort()).toEqual(Object.keys(en).sort());
  });

  it('has no empty copy', () => {
    for (const t of [en, th]) {
      for (const [key, value] of Object.entries(t)) {
        if (typeof value === 'function') expect(String(value(2, 'x')), key).not.toBe('');
        else expect(value, key).toBeTruthy();
      }
    }
  });

  it('names the three steps in both languages', () => {
    expect(en.steps).toHaveLength(3);
    expect(th.steps).toHaveLength(3);
  });

  it('pluralises English counts', () => {
    expect(en.cartCount(1, 1)).toBe('1 line · 1 pcs');
    expect(en.cartCount(2, 5)).toBe('2 lines · 5 pcs');
    expect(en.salesSummary(1, '฿10')).toBe('1 sale · ฿10');
    expect(en.salesSummary(3, '฿10')).toBe('3 sales · ฿10');
  });

  it('falls back to English for an unknown language', () => {
    expect(cashSaleText('fr')).toBe(en);
  });

  describe('receipt text', () => {
    it('gives the Thai and English customer copy the same lines', () => {
      expect(Object.keys(customerReceiptText('en')).sort()).toEqual(Object.keys(customerReceiptText('th')).sort());
    });

    it('writes the English copy without Thai', () => {
      for (const value of Object.values(customerReceiptText('en'))) expect(value).not.toMatch(/[฀-๿]/);
    });

    it('defaults the customer copy to Thai', () => {
      expect(customerReceiptText()).toBe(customerReceiptText('th'));
      expect(customerReceiptText('th').title).toMatch(/[฀-๿]/);
    });

    it('keeps the shop copy in one fixed wording', () => {
      expect(merchantReceiptText.title).toContain('สำเนาสำหรับร้านค้า');
    });
  });
});
