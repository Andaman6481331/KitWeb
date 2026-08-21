<script setup>
// The add-to-order dialog, lifted out of CategoryView so the product grid and the
// product page share one implementation of the tier/MOQ maths instead of two.
// Open it by passing a product; it emits `close` when the customer is done.
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { cartStore } from '../stores/cartStore';
import { getProductImageUrl } from '../utils/productImages';
import { parseMoq, roundHalfUp, toPerPiece } from '../utils/productPricing';
import { isPriced } from '../utils/cartPricing';

const props = defineProps({
    product: {
        type: Object,
        default: null
    }
});

const emit = defineEmits(['close']);

const { t, locale } = useI18n();

const productName = computed(() => {
    const p = props.product;
    if (!p) return '';
    return (String(locale.value).toLowerCase() === 'th' ? (p.name_th || p.name) : p.name) || '';
});

// Per-variant quantity selection
const variantQuantities = ref({});
const variantQtyWarnings = ref({});
const showImageLightbox = ref(false);
const lightboxImageKey = ref(null);
const showNotification = ref(false);
const notificationMessage = ref('');

// Variant rows: real variant_link images, or a single implicit "base" row (using
// the product's own image/pricing) if none exist.
const variantsForCart = computed(() => {
    const product = props.product;
    if (!product) return [];
    const variantImages = (product.images || []).filter(img => img.attribute_type === 'variant_link');
    if (variantImages.length === 0) {
        return [{
            rowKey: 'base',
            imageKey: product.image_key,
            // DIY kits live in their own bucket and carry no image_key, so callers can
            // hand us an already-resolved URL to use instead.
            imageUrl: product.image || null,
            label: null,
            price_1: product.price_1,
            price_2: product.price_2,
            price_3: product.price_3
        }];
    }
    return variantImages.map(img => {
        const hasOverride = [img.price_1, img.price_2, img.price_3].some(p => p !== null && p !== undefined);
        return {
            rowKey: img.id,
            imageKey: img.image_key,
            imageUrl: null,
            label: img.attribute_value || null,
            price_1: hasOverride ? img.price_1 : product.price_1,
            price_2: hasOverride ? img.price_2 : product.price_2,
            price_3: hasOverride ? img.price_3 : product.price_3
        };
    });
});

const moqNumber = computed(() => parseMoq(props.product?.moq));

const totalVolumeForCart = computed(() =>
    Object.values(variantQuantities.value).reduce((sum, q) => sum + (Number(q) || 0), 0)
);

// Only L1-L3 are customer-facing (L4/L5 are staff-only and ignored here).
const activeTierForCart = computed(() => {
    const total = totalVolumeForCart.value;
    return total >= 50 ? 3 : total >= 20 ? 2 : 1;
});

// Resolves the active tier's box price for a row, falling back to the next
// LOWER tier only if the target tier's own price is missing/0 (never up).
const tierBoxPriceForRow = (row) => {
    const p1 = Number(row.price_1) || 0;
    const p2 = Number(row.price_2) || 0;
    const p3 = Number(row.price_3) || 0;
    const tier = activeTierForCart.value;
    if (tier === 3) return p3 > 0 ? p3 : (p2 > 0 ? p2 : p1);
    if (tier === 2) return p2 > 0 ? p2 : p1;
    return p1;
};

const cartRowsView = computed(() =>
    variantsForCart.value.map(row => {
        const qty = variantQuantities.value[row.rowKey] ?? 0;
        const boxPrice = tierBoxPriceForRow(row);
        const perPiecePrice = toPerPiece(boxPrice, moqNumber.value);
        // No tier populated means the price hasn't been uploaded yet. Showing ฿0.00
        // would read as free, so the row is marked and priced by staff later.
        const unpriced = !isPriced(perPiecePrice);
        return {
            ...row,
            qty,
            boxPrice,
            perPiecePrice,
            unpriced,
            rowTotal: unpriced ? 0 : roundHalfUp(perPiecePrice * qty, 2),
            warning: variantQtyWarnings.value[row.rowKey] || null
        };
    })
);

const cartGrandTotal = computed(() => cartRowsView.value.reduce((sum, r) => sum + r.rowTotal, 0));
// Any unpriced row selected means there is no total to quote yet.
const hasUnpricedSelection = computed(() =>
    cartRowsView.value.some(row => row.unpriced && (row.qty ?? 0) > 0)
);
const isConfirmDisabled = computed(() => cartRowsView.value.every(row => (row.qty ?? 0) === 0));

// Seed one MOQ per row each time a product is opened, so the common case is a
// single confirm click.
watch(() => props.product, (product) => {
    if (!product) return;
    const seeded = {};
    variantsForCart.value.forEach(row => { seeded[row.rowKey] = moqNumber.value; });
    variantQuantities.value = seeded;
    variantQtyWarnings.value = {};
}, { immediate: true });

const close = () => {
    variantQuantities.value = {};
    variantQtyWarnings.value = {};
    emit('close');
};

const incrementRowQty = (rowKey) => {
    variantQuantities.value[rowKey] = (variantQuantities.value[rowKey] ?? 0) + moqNumber.value;
    variantQtyWarnings.value[rowKey] = null;
};

const decrementRowQty = (rowKey) => {
    variantQuantities.value[rowKey] = Math.max(0, (variantQuantities.value[rowKey] ?? 0) - moqNumber.value);
    variantQtyWarnings.value[rowKey] = null;
};

const handleRowQtyBlur = (rowKey) => {
    const moq = moqNumber.value;
    const clamped = Math.max(0, Math.floor(Number(variantQuantities.value[rowKey]) || 0));
    if (clamped === 0) {
        variantQuantities.value[rowKey] = 0;
        variantQtyWarnings.value[rowKey] = null;
    } else if (clamped % moq !== 0) {
        const rounded = Math.ceil(clamped / moq) * moq;
        variantQuantities.value[rowKey] = rounded;
        variantQtyWarnings.value[rowKey] = t('catalog.qtyRoundedToBox', { moq });
    } else {
        variantQuantities.value[rowKey] = clamped;
        variantQtyWarnings.value[rowKey] = null;
    }
};

// Prefer a real image_key (which can be served at full size); fall back to whatever
// URL the caller pre-resolved for us.
const rowImage = (row, variant = 'thumb') =>
    row.imageKey ? getProductImageUrl(row.imageKey, variant) : (row.imageUrl || '');

const lightboxImageUrl = ref('');

const openImageLightbox = (row) => {
    lightboxImageKey.value = row.imageKey;
    lightboxImageUrl.value = rowImage(row, 'large');
    showImageLightbox.value = true;
};

const closeImageLightbox = () => {
    showImageLightbox.value = false;
    lightboxImageKey.value = null;
    lightboxImageUrl.value = '';
};

const confirmAddToCart = () => {
    const product = props.product;
    if (!product) return;

    const rowsToAdd = cartRowsView.value.filter(row => row.qty > 0);
    if (rowsToAdd.length === 0) return;

    const name = productName.value;

    rowsToAdd.forEach(row => {
        cartStore.addToCart(
            product,
            { size: row.label || 'Standard', color: 'Default', price: row.perPiecePrice },
            row.qty
        );
    });

    notificationMessage.value = `${name} added to cart! 🛒`;
    showNotification.value = true;
    setTimeout(() => { showNotification.value = false; }, 2000);

    close();
};
</script>

<template>
    <!-- Confirmation modal -->
    <div v-if="product" class="popup-overlay" @click="close">
        <div class="confirm-modal confirm-modal-wide" @click.stop>
            <div class="confirm-header">
                <div class="confirm-icon">🛒</div>
                <h2>{{ productName }}</h2>
            </div>
            <div class="confirm-body">
                <p class="confirm-message">{{ $t('catalog.confirmQtyMessage') }}</p>
                <div class="variant-tier-banner" v-if="totalVolumeForCart > 0">
                    {{ $t('catalog.currentTierNote', { tier: activeTierForCart, total: totalVolumeForCart }) }}
                </div>
                <div class="variant-rows">
                    <div class="variant-row" v-for="row in cartRowsView" :key="row.rowKey">
                        <button class="variant-thumb thumb" type="button" @click="openImageLightbox(row)">
                            <img :src="rowImage(row)" :alt="row.label || productName">
                        </button>
                        <div class="variant-row-info">
                            <span class="variant-label">{{ row.label || $t('catalog.standardVariant') }}</span>
                            <span class="variant-unit-price variant-unit-price-tbc" v-if="row.unpriced">
                                {{ $t('catalog.priceToBeConfirmed') }}
                            </span>
                            <span class="variant-unit-price" v-else>
                                ฿{{ row.perPiecePrice.toFixed(2) }} / {{ $t('catalog.piece') }}
                                <span class="variant-box-price">(฿{{ row.boxPrice.toFixed(2) }} / box)</span>
                            </span>
                            <p class="variant-qty-warning" v-if="row.warning">{{ row.warning }}</p>
                        </div>
                        <div class="variant-qty-stepper qty-entry">
                            <button class="qty-btn" type="button" @click="decrementRowQty(row.rowKey)">−</button>
                            <input class="qty-num" type="number" min="0" :step="moqNumber"
                                v-model.number="variantQuantities[row.rowKey]"
                                @input="variantQtyWarnings[row.rowKey] = null"
                                @blur="handleRowQtyBlur(row.rowKey)">
                            <button class="qty-btn" type="button" @click="incrementRowQty(row.rowKey)">+</button>
                        </div>
                        <div class="variant-row-total" v-if="row.unpriced">—</div>
                        <div class="variant-row-total" v-else>฿{{ row.rowTotal.toFixed(2) }}</div>
                    </div>
                </div>
                <div class="confirm-grand-total" v-if="hasUnpricedSelection">
                    {{ $t('catalog.grandTotal') }}: {{ $t('order.quoteTotalPending') }}
                </div>
                <div class="confirm-grand-total" v-else>{{ $t('catalog.grandTotal') }}: ฿{{ cartGrandTotal.toFixed(2) }}</div>
            </div>
            <div class="confirm-footer">
                <button class="btn-cancel" @click="close">{{ $t('catalog.cancel') }}</button>
                <button class="btn-confirm" :disabled="isConfirmDisabled" @click="confirmAddToCart">
                    {{ $t('catalog.confirm') }}
                </button>
            </div>
        </div>
    </div>

    <!-- Variant image lightbox -->
    <div v-if="showImageLightbox" class="lightbox-overlay" @click="closeImageLightbox">
        <button class="lightbox-close" @click="closeImageLightbox">
            <ion-icon name="close-outline"></ion-icon>
        </button>
        <img class="lightbox-image" :src="lightboxImageUrl" alt="" @click.stop>
    </div>

    <!-- Notification toast. Lives here rather than in the caller so the message
         survives the modal closing. -->
    <transition name="slide-up">
        <div v-if="showNotification" class="notification">
            <div class="notification-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
            </div>
            <div class="notification-content">{{ notificationMessage }}</div>
        </div>
    </transition>
</template>

<style scoped>
.popup-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
    animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideUp {
    from { transform: translateY(30px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}

/* CONFIRMATION MODAL */
.confirm-modal {
    background: white;
    border-radius: 24px;
    max-width: 450px;
    width: 90%;
    padding: 30px;
    animation: slideUp 0.3s ease;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
    text-align: center;
}

.confirm-modal-wide {
    max-width: 800px;
    max-height: 90vh;
    overflow-y: auto;
}

.confirm-header {
    margin-bottom: 25px;
}

.confirm-icon {
    font-size: 40px;
}

.confirm-header h2 {
    font-size: 24px;
    color: #2d3436;
    margin: 0;
    font-family: 'ZCOOL XiaoWei', serif;
}

.confirm-message {
    font-size: 15px;
    color: #636e72;
    line-height: 1.6;
    margin-bottom: 16px;
}

.variant-tier-banner {
    background: #FDF3E6;
    color: #8b6f47;
    font-size: 13px;
    font-weight: 600;
    text-align: center;
    padding: 8px 12px;
    border-radius: 10px;
    margin-bottom: 16px;
}

.variant-rows {
    display: flex;
    flex-direction: column;
    gap: 14px;
    text-align: left;
    overflow-y: auto;
    max-height: 45vh;
    padding-right: 4px;
    margin-bottom: 16px;
}

.variant-row {
    display: grid;
    grid-template-columns: 90px 1fr auto auto;
    align-items: center;
    gap: 14px;
    background: #f8f9fa;
    padding: 12px;
    border-radius: 14px;
}

.thumb {
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    border: 2px solid transparent;
    transition: all 0.2s;
    background: white;
}

.thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.variant-thumb {
    width: 90px;
    height: 90px;
    padding: 0;
}

.variant-row-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
}

.variant-label {
    font-size: 22px;
    font-weight: 700;
    color: #2d3436;
}

.variant-unit-price {
    font-size: 16px;
    color: #008080;
    font-weight: 600;
}

.variant-unit-price-tbc {
    font-style: italic;
    color: #8C7B6E;
}

.variant-box-price {
    color: #8b6f47;
    font-weight: 500;
}

.variant-qty-warning {
    font-size: 12px;
    color: #d35400;
    margin: 2px 0 0 0;
}

.variant-qty-stepper {
    display: flex;
    align-items: center;
    gap: 8px;
}

.qty-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid #e1e8ed;
    background: #fafafa;
    color: #2d3436;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
}

.qty-btn:hover {
    background: #FDF3E6;
    border-color: #b89968;
}

.qty-num {
    width: 56px;
    text-align: center;
    padding: 6px 4px;
    border: 1px solid #e1e8ed;
    border-radius: 8px;
    font-size: 18px;
    font-weight: 600;
    color: #2d3436;
}

.variant-row-total {
    font-size: 18px;
    font-weight: 800;
    color: #2d3436;
    text-align: right;
    white-space: nowrap;
}

.confirm-grand-total {
    text-align: right;
    font-size: 16px;
    font-weight: 800;
    color: #008080;
    padding-top: 10px;
    border-top: 1px solid #eee;
}

.confirm-footer {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: 15px;
    margin-top: 20px;
}

.btn-cancel {
    background: #f1f2f6;
    color: #2d3436;
    border: none;
    padding: 12px;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-cancel:hover {
    background: #dfe4ea;
}

.btn-confirm {
    background: #008080;
    color: white;
    border: none;
    padding: 12px;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-confirm:hover {
    background: #006666;
    transform: translateY(-2px);
}

.btn-confirm:disabled {
    background: #b0b0b0;
    cursor: not-allowed;
    transform: none;
}

/* VARIANT IMAGE LIGHTBOX */
.lightbox-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
    padding: 40px;
    animation: fadeIn 0.2s ease;
}

.lightbox-image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.lightbox-close {
    position: absolute;
    top: 20px;
    right: 20px;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.9);
    color: #2d3436;
    font-size: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
}

/* NOTIFICATION TOAST */
.notification {
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    background: #35231d;
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 2000;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.notification-icon {
    color: #b89968;
}

.slide-up-enter-active,
.slide-up-leave-active {
    transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
    transform: translate(-50%, 100%);
    opacity: 0;
}

@media (max-width: 600px) {
    .variant-row {
        grid-template-columns: 64px 1fr;
        grid-template-areas:
            "thumb info"
            "qty   total";
        row-gap: 10px;
    }

    .variant-thumb { width: 64px; height: 64px; grid-area: thumb; }
    .variant-row-info { grid-area: info; }
    .variant-qty-stepper { grid-area: qty; }
    .variant-row-total { grid-area: total; }
    .variant-label { font-size: 17px; }
}
</style>
