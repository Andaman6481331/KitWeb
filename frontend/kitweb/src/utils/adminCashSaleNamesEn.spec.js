import { describe, it, expect } from 'vitest';
import { EN_NAMES, englishName } from './adminCashSaleNamesEn';
import { CASH_TYPES } from './adminCashSale';

describe('English type names', () => {
  // The write-in rows ("อุปกรณ์จักร ......") are finished by hand, so they have no English name to list.
  it('lists every listed type once, by its exact Thai name', () => {
    expect(EN_NAMES.map(([thai]) => thai)).toEqual(CASH_TYPES.filter((t) => t.sc !== '').map((t) => t.name));
  });

  it('keeps each entry a [thai, english] pair of text', () => {
    for (const pair of EN_NAMES) {
      expect(pair).toHaveLength(2);
      expect(typeof pair[0]).toBe('string');
      expect(typeof pair[1]).toBe('string');
    }
  });

  it('falls back to the Thai name when no English name is set', () => {
    expect(englishName('กรรไกร')).toBe(EN_NAMES.find(([thai]) => thai === 'กรรไกร')[1] || 'กรรไกร');
    expect(englishName('something else')).toBe('something else');
  });
});
