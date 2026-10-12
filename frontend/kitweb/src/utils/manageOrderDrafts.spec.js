import { describe, it, expect } from 'vitest';
import { draftFromOrder, reconcileDraft } from './manageOrderDrafts';

const order = (over = {}) => ({
  id: 'WH-2026-00001',
  status: 'PENDING',
  tracking_number: null,
  delivery_fee: null,
  customer_name: 'Somchai',
  phone_number: '0812345678',
  shipping_address: '1 Main Rd',
  line_display_name: '',
  note: '',
  items: [{ product_id: 7, product_name: 'Kit', size: 'M', color: 'Red', quantity: 2, price: 50 }],
  ...over,
});

describe('draftFromOrder', () => {
  it('distinguishes "not quoted" from a quote of zero', () => {
    expect(draftFromOrder(order({ delivery_fee: null })).deliveryFee).toBe('');
    expect(draftFromOrder(order({ delivery_fee: 0 })).deliveryFee).toBe('0');
    expect(draftFromOrder(order({ delivery_fee: 85 })).deliveryFee).toBe('85');
  });
});

describe('reconcileDraft', () => {
  it('builds a fresh draft for a manual load, even over a touched one', () => {
    const current = draftFromOrder(order());
    current.deliveryFee = '120';
    const out = reconcileDraft({ order: order(), previousOrder: order(), current, silent: false });
    expect(out).not.toBe(current);
    expect(out.deliveryFee).toBe('');
  });

  it('builds a draft for an order seen for the first time', () => {
    const out = reconcileDraft({ order: order(), previousOrder: undefined, current: undefined, silent: true });
    expect(out.status).toBe('PENDING');
  });

  it('refreshes an untouched draft with the new server values', () => {
    const current = draftFromOrder(order());
    current.message = 'Saved';
    const updated = order({ status: 'PAID', tracking_number: 'TH123' });
    const out = reconcileDraft({ order: updated, previousOrder: order(), current, silent: true });
    expect(out.status).toBe('PAID');
    expect(out.trackingNumber).toBe('TH123');
    expect(out.message).toBe('Saved');
  });

  it('keeps a draft staff have typed into', () => {
    const current = draftFromOrder(order());
    current.deliveryFee = '120';
    const out = reconcileDraft({
      order: order({ status: 'PAID' }), previousOrder: order(), current, silent: true,
    });
    expect(out).toBe(current);
    expect(out.deliveryFee).toBe('120');
  });

  it('keeps a draft whose items were edited', () => {
    const current = draftFromOrder(order());
    current.items[0].quantity = 5;
    const out = reconcileDraft({ order: order(), previousOrder: order(), current, silent: true });
    expect(out).toBe(current);
  });

  it('keeps a draft that is open for editing or mid-save, even if no field changed', () => {
    for (const flag of ['editing', 'saving', 'savingDelivery', 'savingEdit']) {
      const current = draftFromOrder(order());
      current[flag] = true;
      const out = reconcileDraft({ order: order(), previousOrder: order(), current, silent: true });
      expect(out).toBe(current);
    }
  });

  it('treats a draft that still matches the saved order as untouched after a save', () => {
    // After "Save delivery" the row is updated in place, so the previous copy of
    // the order already carries the fee the draft shows.
    const saved = order({ delivery_fee: 120 });
    const current = draftFromOrder(saved);
    const out = reconcileDraft({
      order: order({ delivery_fee: 120, status: 'SHIPPED' }), previousOrder: saved, current, silent: true,
    });
    expect(out).not.toBe(current);
    expect(out.status).toBe('SHIPPED');
  });
});
