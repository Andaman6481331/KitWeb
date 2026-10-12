import { describe, it, expect } from 'vitest';
import {
    orderViewFromRow, isAwaitingCustomer, orderStateKey, orderStage, nextStepKey, formatBaht, parseDbDate,
} from './orderView';

const row = (over = {}) => ({
    id: 'WH-2026-00001', status: 'PENDING', payment_method: 'PromptPay (manual)',
    total_amount: 500, delivery_fee: null, contact_confirmed_at: null,
    customer_name: 'Somchai', created_at: '2026-10-12 10:00:00', items: [], ...over,
});

describe('orderViewFromRow', () => {
    it('keeps "delivery not quoted" distinct from free delivery', () => {
        expect(orderViewFromRow(row()).delivery_fee).toBeNull();
        expect(orderViewFromRow(row({ delivery_fee: 0 })).delivery_fee).toBe(0);
        expect(orderViewFromRow(row({ delivery_fee: '85.5' })).delivery_fee).toBe(85.5);
    });

    it('adds items and delivery only when both are known', () => {
        expect(orderViewFromRow(row()).grand_total).toBeNull();
        expect(orderViewFromRow(row({ delivery_fee: 80 })).grand_total).toBe(580);
    });

    it('never gives an unpriced quote a total', () => {
        const v = orderViewFromRow(row({ payment_method: 'QUOTE', total_amount: 0, delivery_fee: 80 }));
        expect(v.is_quote).toBe(true);
        expect(v.items_total).toBeNull();
        expect(v.grand_total).toBeNull();
    });

    it('treats an order from before the confirmation column as not waiting', () => {
        const legacy = row();
        delete legacy.contact_confirmed_at;
        expect(isAwaitingCustomer(orderViewFromRow(legacy))).toBe(false);
    });
});

describe('order state', () => {
    const view = (over) => orderViewFromRow(row(over));

    it('is awaiting until the customer message is matched', () => {
        expect(orderStateKey(view())).toBe('awaiting');
        expect(orderStage(view())).toBe(3);
    });

    it('moves to the shop-side step once confirmed', () => {
        const v = view({ contact_confirmed_at: '2026-10-12 10:05:00' });
        expect(orderStateKey(v)).toBe('confirmed');
        expect(orderStage(v)).toBe(4);
    });

    it('lets fulfilment status win over the confirmation flag', () => {
        for (const [status, key] of [['PAID', 'paid'], ['SHIPPED', 'shipped'], ['DELIVERED', 'delivered'], ['CANCELLED', 'cancelled']]) {
            expect(orderStateKey(view({ status, contact_confirmed_at: 'x' }))).toBe(key);
        }
    });

    it('does not call a cancelled order "awaiting"', () => {
        expect(isAwaitingCustomer(view({ status: 'CANCELLED' }))).toBe(false);
    });
});

describe('nextStepKey', () => {
    const confirmed = { contact_confirmed_at: '2026-10-12 10:05:00' };

    it('explains pricing, then delivery, then payment', () => {
        expect(nextStepKey(orderViewFromRow(row({ ...confirmed, payment_method: 'QUOTE' })))).toBe('quote');
        expect(nextStepKey(orderViewFromRow(row(confirmed)))).toBe('deliveryPending');
        expect(nextStepKey(orderViewFromRow(row({ ...confirmed, delivery_fee: 80 })))).toBe('pay');
    });

    it('falls back to the state itself outside the confirmed phase', () => {
        expect(nextStepKey(orderViewFromRow(row()))).toBe('awaiting');
        expect(nextStepKey(orderViewFromRow(row({ ...confirmed, status: 'SHIPPED' })))).toBe('shipped');
    });
});

describe('formatting', () => {
    it('formats baht with thousands separators and trims empty decimals', () => {
        expect(formatBaht(1234)).toBe('฿1,234');
        expect(formatBaht(80.5)).toBe('฿80.5');
        expect(formatBaht(0)).toBe('฿0');
        expect(formatBaht(null)).toBe('');
    });

    it('reads SQLite timestamps as UTC', () => {
        expect(parseDbDate('2026-10-12 10:00:00').toISOString()).toBe('2026-10-12T10:00:00.000Z');
        expect(parseDbDate('not a date')).toBeNull();
        expect(parseDbDate(null)).toBeNull();
    });
});
