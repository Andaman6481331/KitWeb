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

// Lowest available per-piece price across the three customer-facing tiers
// (L1-L3; L4/L5 are staff-only and never shown on the storefront).
export const getCheapestPricePerPiece = (item) => {
    if (!item) return 0;
    const boxPrices = [item.price_1, item.price_2, item.price_3]
        .map(Number)
        .filter(p => p > 0);
    return boxPrices.length ? toPerPiece(Math.min(...boxPrices), parseMoq(item.moq)) : 0;
};
