// Mirrors the Worker's usablePrice(): a product row can exist before its price
// has been uploaded, so a missing or non-positive price means "not priced yet",
// never "free". Display only — the server re-derives this at /order/submit.

export function isPriced(price) {
    const n = Number(price);
    return Number.isFinite(n) && n > 0;
}

export function isUnpricedItem(item) {
    return !isPriced(item?.price);
}

export function cartHasUnpriced(cart) {
    return (cart || []).some(isUnpricedItem);
}
