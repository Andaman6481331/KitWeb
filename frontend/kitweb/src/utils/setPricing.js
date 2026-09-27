// Roll-up maths for Business Sets. Builds on productPricing.js rather than
// repeating it, so the box -> per-piece rule has exactly one definition.
import { parseMoq, toPerPiece, roundHalfUp } from './productPricing';

// Customer-facing tiers only. price_4/price_5 are staff-only and must never
// reach a set total.
const CUSTOMER_TIERS = [1, 2, 3];

// The line's box price at `tier`, falling back down through lower tiers when the
// requested one is unset. Mirrors tierBoxPriceForRow in add-to-order-modal.vue.
export const tierBoxPrice = (line, tier) => {
    if (!line) return 0;
    const start = CUSTOMER_TIERS.includes(Number(tier)) ? Number(tier) : 1;
    for (let t = start; t >= 1; t--) {
        const price = Number(line[`price_${t}`]) || 0;
        if (price > 0) return price;
    }
    return 0;
};

export const rollUpSet = (set) => {
    const items = set?.items || [];
    const tier = set?.price_tier ?? 1;

    const lines = items.map((line) => {
        const perPiecePrice = toPerPiece(tierBoxPrice(line, tier), parseMoq(line.moq));
        return {
            ...line,
            perPiecePrice,
            lineTotal: roundHalfUp(perPiecePrice * (Number(line.quantity) || 0), 2)
        };
    });

    const subtotal = roundHalfUp(lines.reduce((sum, l) => sum + l.lineTotal, 0), 2);
    const discountPct = Number(set?.discount_pct) || 0;
    const discountAmount = roundHalfUp(subtotal * (discountPct / 100), 2);

    return { lines, subtotal, discountAmount, total: roundHalfUp(subtotal - discountAmount, 2) };
};
