// One description of "what state is this order in" for every place a customer sees
// an order: the thank-you page, the Track Orders list and detail, and the guest
// lookup. The Worker's /orders/lookup already returns this shape; /orders (the
// logged-in list) returns raw rows, which orderViewFromRow converts.

const toNumber = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

// SQLite stamps are UTC without a zone ("2026-10-12 10:00:00"). Without saying so
// the browser would read them as local time and show orders hours in the past.
export function parseDbDate(value) {
    if (!value) return null;
    const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(value)
        ? `${value.replace(' ', 'T')}Z`
        : value;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
}

export function orderViewFromRow(row) {
    const isQuote = row.payment_method === 'QUOTE';
    const itemsTotal = isQuote ? null : toNumber(row.total_amount);
    const deliveryFee = toNumber(row.delivery_fee);
    return {
        id: row.id,
        status: row.status || 'PENDING',
        created_at: row.created_at ?? null,
        // undefined means the column predates the confirmation flow: that order was
        // handled the old way, so it is not waiting on anything.
        contact_confirmed_at: row.contact_confirmed_at === undefined
            ? (row.created_at ?? 'legacy')
            : row.contact_confirmed_at,
        is_quote: isQuote,
        customer_name: row.customer_name ?? null,
        items: (row.items || []).map((i) => ({
            product_name: i.product_name,
            size: i.size ?? null,
            color: i.color ?? null,
            quantity: Number(i.quantity) || 0,
            price: toNumber(i.price),
        })),
        items_total: itemsTotal,
        delivery_fee: deliveryFee,
        grand_total: itemsTotal !== null && deliveryFee !== null ? itemsTotal + deliveryFee : null,
        tracking_number: row.tracking_number ?? null,
    };
}

// Strictly null: the column is NULL until the customer's message is matched.
export const isAwaitingCustomer = (order) =>
    !!order && order.contact_confirmed_at === null && order.status !== 'CANCELLED';

export function orderStateKey(order) {
    if (order.status === 'CANCELLED') return 'cancelled';
    if (order.status === 'DELIVERED') return 'delivered';
    if (order.status === 'SHIPPED') return 'shipped';
    if (order.status === 'PAID') return 'paid';
    return isAwaitingCustomer(order) ? 'awaiting' : 'confirmed';
}

// Position on the shared progress rail: still waiting for the customer's message
// is step 3; once it has arrived, the next move is ours (step 4).
export const orderStage = (order) => (isAwaitingCustomer(order) ? 3 : 4);

// Which "what happens next" sentence applies. Only a confirmed, not yet paid order
// splits further, by how much of the price we have settled.
export function nextStepKey(order) {
    const state = orderStateKey(order);
    if (state !== 'confirmed') return state;
    if (order.is_quote) return 'quote';
    return order.delivery_fee === null ? 'deliveryPending' : 'pay';
}

export function formatBaht(n) {
    if (n === null || n === undefined) return '';
    return `฿${Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
