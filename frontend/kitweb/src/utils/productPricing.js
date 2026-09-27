// Shared per-piece price maths. Customers are never shown raw box prices, so every
// surface that displays a price has to divide by the box size first — keeping that
// in one place stops the catalog and the homepage disagreeing about a price.

// MOQ doubles as the "box size"; stored as free text (e.g. "20 pcs"), so pull out
// the leading integer and fall back to 1 (no box grouping).
export const parseMoq = (raw) => {
    if (!raw) return 1;
    const match = String(raw).match(/\d+/);
    const n = match ? parseInt(match[0], 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 1;
};

export const roundHalfUp = (value, decimals = 2) => {
    const factor = 10 ** decimals;
    return Math.floor(value * factor + 0.5 + Number.EPSILON * factor) / factor;
};

// Box price -> per-piece display price.
export const toPerPiece = (boxPrice, moq) => {
    const p = Number(boxPrice) || 0;
    return p ? roundHalfUp(p / (moq || 1), 2) : 0;
};

// ---- Quantity bounds ---------------------------------------------------------
// Quantities are sold by the box, so every quantity the customer can reach — typed
// into the dialog or stepped in the cart — has to land on a multiple of the box
// size. Keeping both paths here stops the cart from undoing what the dialog
// enforced (a 20-piece box quietly becoming 21).

// Well above any real order (tier 3 starts at 50 pieces), low enough that a
// mistyped 999999999 is caught rather than sent to staff as a quote.
export const MAX_ORDER_QTY = 10000;

// The largest whole number of boxes that fits under the cap. Never less than one
// box: a product whose box is bigger than the cap can still be ordered once.
const maxWholeBoxes = (moq) => Math.max(moq, Math.floor(MAX_ORDER_QTY / moq) * moq);

// Normalises a typed quantity to a whole number of boxes within the bounds.
// Returns the reason so the caller can explain the change instead of silently
// overwriting what the customer typed.
export const clampTypedQty = (raw, moq = 1) => {
    const box = parseMoq(moq);
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) return { qty: 0, reason: null };

    // Round UP: a partial box has to become the box that covers it, since a
    // fraction of a box is not something the customer can be sold.
    const boxed = Math.ceil(value / box) * box;
    if (boxed > MAX_ORDER_QTY) {
        // Cap DOWN to a whole box — rounding up here would breach the cap.
        return { qty: maxWholeBoxes(box), reason: 'capped' };
    }
    return { qty: boxed, reason: boxed !== value ? 'rounded' : null };
};

// One box up or down. Off-grid quantities (carts saved before the stepper
// respected MOQ) are realigned onto the box grid rather than carried forward.
export const stepQty = (current, direction, moq = 1) => {
    const box = parseMoq(moq);
    const cur = Math.max(0, Number(current) || 0);
    const next = direction > 0
        ? Math.floor(cur / box) * box + box
        : Math.ceil(cur / box) * box - box;
    return Math.min(Math.max(0, next), maxWholeBoxes(box));
};

// Lowest available per-piece price across the three customer-facing tiers
// (L1-L3; L4/L5 are staff-only and never shown on the storefront).
export const getCheapestPricePerPiece = (item) => {
    if (!item) return 0;
    const boxPrices = [item.price_1, item.price_2, item.price_3]
        .map(Number)
        .filter(p => p > 0);
    return boxPrices.length ? toPerPiece(Math.min(...boxPrices), parseMoq(item.moq)) : 0;
};
