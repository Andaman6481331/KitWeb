import { describe, it, expect } from 'vitest';
import {
  cleanName, NAME_MAX, addNewName, bumpNameUse, customTypes,
  CASH_TYPES, frequentTypes, matchTypes, money, sanitizePrice, sanitizeQty, lineTotal, cartTotal, pieceCount,
  changeDue, quickAmounts, addLine, removeLine, setLineQty, restoreLine, salePayload, saleFromRecord, localDay, invoiceRef, clockTime,
  readJson, writeJson, pushSale, todaysSales, countedSales, salesTotal, HISTORY_LIMIT, removeNewName,
} from './adminCashSale';
import { EN_NAMES } from './adminCashSaleNamesEn';

const names = (list) => list.map((t) => t.name);

describe('product types', () => {
  it('lists each type once, so they can be keyed by name', () => {
    expect(new Set(names(CASH_TYPES)).size).toBe(CASH_TYPES.length);
  });

  it('offers a short frequent list', () => {
    expect(names(frequentTypes())).toEqual(['กรรไกร', 'กระดุม', 'เข็มมุด', 'ริบบิ้น', 'ไหมนก', 'ลูกปัด']);
  });
});

describe('matchTypes', () => {
  it('lists everything for an empty search', () => {
    expect(matchTypes('')).toHaveLength(CASH_TYPES.length);
    expect(matchTypes('   ')).toHaveLength(CASH_TYPES.length);
  });

  it('finds a type by its shortcut', () => {
    expect(names(matchTypes('กก'))).toContain('กรรไกร');
    expect(names(matchTypes('ขม'))).toEqual(['เข็มมุด']);
  });

  it('finds a type by part of its name', () => {
    expect(names(matchTypes('ซาติน'))).toEqual(['ริบบิ้นซาติน']);
  });

  it('lists every type that shares a shortcut', () => {
    expect(names(matchTypes('กด'))).toEqual(expect.arrayContaining(['กระดาษ', 'กระดุม', 'กระดิ่ง']));
  });

  it('puts a shortcut typed in full ahead of longer ones', () => {
    const found = names(matchTypes('รบ'));
    expect(found[0]).toBe('ริบบิ้น');
    expect(found).toContain('ริบบิ้นซาติน');
  });

  it('never matches the write-in rows by an empty shortcut', () => {
    expect(names(matchTypes('ก')).every((n) => !n.startsWith('วัสดุ'))).toBe(true);
  });

  it('finds nothing for text that matches no type', () => {
    expect(matchTypes('zzz')).toEqual([]);
  });
});

describe('money', () => {
  it('drops the decimals from whole amounts only', () => {
    expect(money(120)).toBe('฿120');
    expect(money(12.5)).toBe('฿12.50');
    expect(money(1250)).toBe('฿1,250');
    expect(money(0.1 + 0.2)).toBe('฿0.30');
  });

  it('keeps a typed price to a number', () => {
    expect(sanitizePrice('a1b2.5')).toBe('12.5');
    expect(sanitizePrice('1.2.3')).toBe('1.23');
    expect(sanitizePrice('3.14159')).toBe('3.14');
    expect(sanitizePrice('')).toBe('');
    expect(sanitizeQty('1a2.')).toBe('12');
  });
});

describe('cart', () => {
  const line = (k, name, price, qty) => ({ k, name, price, qty });

  it('adds up lines without floating-point crumbs', () => {
    const cart = [line(1, 'a', 0.1, 3), line(2, 'b', 0.2, 1)];
    expect(lineTotal(cart[0])).toBe(0.3);
    expect(cartTotal(cart)).toBe(0.5);
    expect(pieceCount(cart)).toBe(4);
    expect(cartTotal([])).toBe(0);
  });

  it('merges the same type at the same price into one line', () => {
    const once = addLine([], line(1, 'ริบบิ้น', 20, 2));
    const twice = addLine(once, line(2, 'ริบบิ้น', 20, 3));
    expect(twice).toEqual([line(1, 'ริบบิ้น', 20, 5)]);
  });

  it('keeps a different price as its own line', () => {
    const cart = addLine([line(1, 'ริบบิ้น', 20, 2)], line(2, 'ริบบิ้น', 25, 1));
    expect(cart).toHaveLength(2);
  });

  it('does not change the cart it was given', () => {
    const cart = [line(1, 'a', 5, 1)];
    addLine(cart, line(2, 'a', 5, 1));
    setLineQty(cart, 1, 4);
    expect(cart).toEqual([line(1, 'a', 5, 1)]);
  });

  it('removes a line when its quantity drops below one', () => {
    const cart = [line(1, 'a', 5, 1), line(2, 'b', 6, 2)];
    expect(setLineQty(cart, 2, 3)[1].qty).toBe(3);
    expect(setLineQty(cart, 1, 0)).toEqual([line(2, 'b', 6, 2)]);
    expect(removeLine(cart, 2)).toEqual([line(1, 'a', 5, 1)]);
  });

  it('puts an undone line back in its original place', () => {
    const cart = [line(1, 'a', 5, 1), line(3, 'c', 7, 1)];
    expect(restoreLine(cart, line(2, 'b', 6, 1)).map((l) => l.k)).toEqual([1, 2, 3]);
  });
});

describe('payment', () => {
  it('works out change, and none when the cash falls short', () => {
    expect(changeDue(500, 320)).toBe(180);
    expect(changeDue(320, 320)).toBe(0);
    expect(changeDue(100, 320)).toBe(0);
    expect(changeDue(1, 0.7)).toBe(0.3);
  });

  it('offers the exact amount and up to two banknotes that cover it', () => {
    expect(quickAmounts(320)).toEqual([
      { kind: 'exact', value: 320 }, { kind: 'note', value: 500 }, { kind: 'note', value: 1000 },
    ]);
    expect(quickAmounts(60).map((q) => q.value)).toEqual([60, 100, 500]);
    expect(quickAmounts(1000)).toEqual([{ kind: 'exact', value: 1000 }]);
    expect(quickAmounts(100).map((q) => q.value)).toEqual([100, 500, 1000]);
  });
});

describe('saving a sale', () => {
  it('sends one entry per line, with its quantity, the English name and the custom flag', () => {
    const payload = salePayload(
      [{ k: 1, name: 'ชื่อทดสอบ', price: 20, qty: 2 }, { k: 2, name: 'ลูกปัดมุก', price: 35.5, qty: 1, custom: true }],
      { clientId: 'abc-123', received: 100, note: 'hi', copyLang: 'en' },
    );
    expect(payload).toEqual({
      client_id: 'abc-123',
      items: [
        { name: 'ชื่อทดสอบ', name_en: null, price: 20, qty: 2, custom: false },
        { name: 'ลูกปัดมุก', name_en: null, price: 35.5, qty: 1, custom: true },
      ],
      received: 100,
      note: 'hi',
      copy_lang: 'en',
    });
  });

  it('sends the English name when one is set', () => {
    const [thai, english] = EN_NAMES.find(([, en]) => en);
    const payload = salePayload([{ k: 1, name: thai, price: 5, qty: 1 }], { clientId: 'abc-123' });
    expect(payload.items[0].name_en).toBe(english);
  });

  it('turns a saved sale from the Worker back into the shape the page keeps', () => {
    const sale = saleFromRecord({
      id: 'id-1', invoice_ref: 'INV-261031-A1B2C3', sold_at: '2026-10-31T06:00:00.000Z', total_amount: 75.5,
      received_amount: null, note: null, copy_lang: 'en',
      items: [{ name: 'ริบบิ้น', name_en: null, unit_price: 20, quantity: 2, line_total: 40, is_custom: 0 }],
    });
    expect(sale).toEqual({
      ref: 'INV-261031-A1B2C3', orderId: 'id-1', savedAt: '2026-10-31T06:00:00.000Z',
      items: [{ name: 'ริบบิ้น', price: 20, qty: 2 }], total: 75.5, received: 0, note: '', copyLang: 'en',
      excludedAt: null, excludeReason: '',
    });
  });

  it('carries the excluded tag from the Worker', () => {
    const sale = saleFromRecord({
      id: 'id-2', invoice_ref: 'INV-1', sold_at: '2026-10-31T06:00:00.000Z', total_amount: 10, items: [],
      excluded_at: '2026-10-31T07:00:00.000Z', exclude_reason: 'typed wrong',
    });
    expect(sale.excludedAt).toBe('2026-10-31T07:00:00.000Z');
    expect(sale.excludeReason).toBe('typed wrong');
  });

  it('names the day to ask for in the device own time', () => {
    expect(localDay(new Date(2026, 0, 2, 23, 59))).toBe('2026-01-02');
  });

  it('builds the invoice reference from the date and the saved order id', () => {
    const when = new Date(2026, 9, 31, 9, 5);
    expect(invoiceRef(when, 'a1b2c3d4-0000-4000-8000-000000000000')).toBe('INV-261031-A1B2C3');
    expect(invoiceRef(new Date(2026, 0, 2), 'ffeedd11-0000')).toBe('INV-260102-FFEEDD');
    expect(clockTime(when)).toBe('09:05');
  });
});

describe('today’s sales', () => {
  const fakeStorage = () => {
    const data = {};
    return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v; } };
  };
  const sale = (savedAt, total) => ({ ref: `INV-${total}`, savedAt: savedAt.toISOString(), total, items: [] });

  it('reads back what it wrote', () => {
    const store = fakeStorage();
    writeJson('k', [{ a: 1 }], store);
    expect(readJson('k', [], store)).toEqual([{ a: 1 }]);
  });

  it('falls back when storage is empty, broken or missing', () => {
    expect(readJson('k', ['none'], fakeStorage())).toEqual(['none']);
    const broken = { getItem: () => '{not json', setItem: () => { throw new Error('full'); } };
    expect(readJson('k', ['none'], broken)).toEqual(['none']);
    expect(() => writeJson('k', 1, broken)).not.toThrow();
    expect(readJson('k', 7, undefined)).toBe(7);
  });

  it('keeps the newest sales first and caps the history', () => {
    let sales = [];
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) sales = pushSale(sales, sale(new Date(), i));
    expect(sales).toHaveLength(HISTORY_LIMIT);
    expect(sales[0].total).toBe(HISTORY_LIMIT + 4);
  });

  it('counts only sales made today', () => {
    const now = new Date(2026, 9, 31, 15, 0);
    const sales = [
      sale(new Date(2026, 9, 31, 9, 0), 100),
      sale(new Date(2026, 9, 30, 23, 59), 999),
      sale(new Date(2026, 9, 31, 14, 0), 50.5),
    ];
    const today = todaysSales(sales, now);
    expect(today.map((s) => s.total)).toEqual([100, 50.5]);
    expect(salesTotal(today)).toBe(150.5);
    expect(salesTotal([])).toBe(0);
  });

  it('leaves excluded sales out of the count and the total, but not out of the list', () => {
    const now = new Date(2026, 9, 31, 15, 0);
    const sales = [
      sale(new Date(2026, 9, 31, 9, 0), 100),
      { ...sale(new Date(2026, 9, 31, 10, 0), 40), excludedAt: '2026-10-31T04:00:00Z' },
    ];
    const today = todaysSales(sales, now);
    expect(today).toHaveLength(2);
    expect(countedSales(today).map((s) => s.total)).toEqual([100]);
    expect(salesTotal(today)).toBe(100);
  });
});

describe('new product names', () => {
  const now = new Date('2026-10-31T09:30:00Z');

  it('removes one recorded name and leaves the rest', () => {
    const records = [{ name: 'A', uses: 1 }, { name: 'B', uses: 0 }];
    expect(removeNewName(records, 'A')).toEqual([{ name: 'B', uses: 0 }]);
    expect(removeNewName(records, 'zzz')).toEqual(records);
  });

  it('tidies what was typed', () => {
    expect(cleanName('  ริบบิ้น   ลาย  ')).toBe('ริบบิ้น ลาย');
    expect(cleanName('x'.repeat(100))).toHaveLength(NAME_MAX);
    expect(cleanName(null)).toBe('');
  });

  it('records a new name and returns it as a pickable type', () => {
    const out = addNewName([], 'ลูกปัดมุก', now);
    expect(out.isNew).toBe(true);
    expect(out.records).toEqual([{ name: 'ลูกปัดมุก', addedAt: now.toISOString(), uses: 0 }]);
    expect(out.type).toEqual({ name: 'ลูกปัดมุก', sc: '', freq: false, custom: true });
  });

  it('keeps the newest name first and never drops old ones', () => {
    let records = [];
    for (let i = 0; i < 80; i++) records = addNewName(records, `name ${i}`, now).records;
    expect(records).toHaveLength(80);
    expect(records[0].name).toBe('name 79');
  });

  it('records nothing for an empty name', () => {
    expect(addNewName([], '   ', now)).toEqual({ records: [], type: null, isNew: false });
  });

  it('picks the built-in type instead of recording a duplicate', () => {
    const out = addNewName([], 'กรรไกร', now);
    expect(out.isNew).toBe(false);
    expect(out.records).toEqual([]);
    expect(out.type.name).toBe('กรรไกร');
  });

  it('treats a recorded name as the same whatever its case or spacing', () => {
    const first = addNewName([], 'Gold  Thread', now).records;
    const again = addNewName(first, 'gold thread', now);
    expect(again.isNew).toBe(false);
    expect(again.records).toBe(first);
    expect(again.type.name).toBe('Gold Thread');
  });

  it('counts uses of a recorded name only', () => {
    const records = addNewName([], 'ลูกปัดมุก', now).records;
    expect(bumpNameUse(records, 'ลูกปัดมุก')[0].uses).toBe(1);
    expect(bumpNameUse(records, 'กรรไกร')).toEqual(records);
  });

  it('lets a recorded name be found by search like any type', () => {
    const types = [...CASH_TYPES, ...customTypes(addNewName([], 'ลูกปัดมุก', now).records)];
    expect(matchTypes('มุก', types).map((t) => t.name)).toContain('ลูกปัดมุก');
  });
});
