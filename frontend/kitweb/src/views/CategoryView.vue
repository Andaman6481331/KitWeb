<script setup>
import { ref, computed, onMounted, onServerPrefetch, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, API_URL } from '../services/api';
import { useI18n } from 'vue-i18n';
import { useHead } from '@unhead/vue';
import translationStore from '../stores/translationStore';
import { cartStore } from '../stores/cartStore';
import { codeToPath, defaultLang, localizedRoute } from '@/utils/localeRoutes';
import { resolveCategoryGroup } from '@/utils/catalogCategories';

const props = defineProps({
  category: {
    type: String,
    default: null
  },
  sortBy: {
    type: String,
    default: null
  }
});

// MOQ doubles as the "box size"; stored as free text (e.g. "20 pcs"), so
// pull out the leading integer and fall back to 1 (no box grouping).
const parseMoq = (raw) => {
    if (!raw) return 1;
    const match = String(raw).match(/\d+/);
    const n = match ? parseInt(match[0], 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 1;
};

const roundHalfUp = (value, decimals = 2) => {
    const factor = 10 ** decimals;
    return Math.floor(value * factor + 0.5 + Number.EPSILON * factor) / factor;
};

// Box price -> per-piece display price (never show raw box prices to customers).
const toPerPiece = (boxPrice, moq) => {
    const p = Number(boxPrice) || 0;
    return p ? roundHalfUp(p / (moq || 1), 2) : 0;
};

// Lowest available per-piece price across the three customer-facing tiers
// (L1-L3; L4/L5 are staff-only and never shown here).
const getCheapestPricePerPiece = (item) => {
    if (!item) return 0;
    const boxPrices = [item.price_1, item.price_2, item.price_3]
        .map(Number)
        .filter(p => p > 0);
    return boxPrices.length ? toPerPiece(Math.min(...boxPrices), parseMoq(item.moq)) : 0;
};

const generateSlug = (name, id) => {
    if (!name) return String(id);
    const slugified = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    return `${slugified}-${id}`;
};

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const currentLang = computed(() => route.params.lang || defaultLang);

// Helper to translate product fields
const tProduct = (item, field) => {
    if (!item) return '';
    const lang = locale.value.toLowerCase();

    if (lang === 'th') {
        if (field === 'name' && item.name_th) return item.name_th;
        if (field === 'description' && item.description_th) return item.description_th;
        if (field === 'usage' && item.usage_th) return item.usage_th;
        if (field === 'attribute' && item.attribute_th) return item.attribute_th;
    }

    // 2. Auto-translation for metadata fields
    // const autoFields = ['description', 'usage', 'attribute', 'varieties', 'sizes', 'colors'];
    // if (autoFields.includes(field) && lang !== 'en') {
    //     const text = item[field];
    //     if (text) {
    //         translationStore.getTranslation(item.id, field, text, lang);
    //         const key = `${item.id}-${field}-${lang}`;
    //         return translationStore.translations[key] || text; // Show original while loading
    //     }
    // }

    // Default fallback
    return item[field] || '';
};

// Resolves a group key (e.g. 'threadString') or a raw product slug (e.g. 'scissors')
// to its translated label, falling back to the original string if no key exists.
const tCategory = (catName) => {
    if (!catName) return '';
    const lower = catName.toLowerCase().trim();
    return t(`categories.${lower}`, catName);
};

const tCategoryDesc = (catName) => {
    if (!catName) return '';
    const lower = catName.toLowerCase().trim();
    return t(`categories.${lower}Desc`, t('catalog.categoryDescriptions.Default'));
};

const products = ref([]);
const loading = ref(true);
const hasLoaded = ref(false);
const showPopup = ref(false);
const selectedProduct = ref(null);
const internalSortBy = ref('popular');
const activeSortBy = computed(() => props.sortBy || internalSortBy.value);

// Cart & Confirmation Modal
const showConfirmModal = ref(false);
const selectedProductForCart = ref(null);
const showNotification = ref(false);
const notificationMessage = ref('');

// Per-variant quantity selection inside the confirm modal
const variantQuantities = ref({});
const variantQtyWarnings = ref({});
const showImageLightbox = ref(false);
const lightboxImageKey = ref(null);

// Variant rows for the confirm modal: real variant_link images, or a single
// implicit "base" row (using the product's own image/pricing) if none exist.
const variantsForCart = computed(() => {
    const product = selectedProductForCart.value;
    if (!product) return [];
    const variantImages = (product.images || []).filter(img => img.attribute_type === 'variant_link');
    if (variantImages.length === 0) {
        return [{
            rowKey: 'base',
            imageKey: product.image_key,
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
            label: img.attribute_value || null,
            price_1: hasOverride ? img.price_1 : product.price_1,
            price_2: hasOverride ? img.price_2 : product.price_2,
            price_3: hasOverride ? img.price_3 : product.price_3
        };
    });
});

const moqNumber = computed(() => parseMoq(selectedProductForCart.value?.moq));

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
        return {
            ...row,
            qty,
            boxPrice,
            perPiecePrice,
            rowTotal: roundHalfUp(perPiecePrice * qty, 2),
            warning: variantQtyWarnings.value[row.rowKey] || null
        };
    })
);

const cartGrandTotal = computed(() => cartRowsView.value.reduce((sum, r) => sum + r.rowTotal, 0));
const isConfirmDisabled = computed(() => cartRowsView.value.every(row => (row.qty ?? 0) === 0));

const currentCategory = computed(() => props.category || route.params.category);

// A display group bundles one or more backend category slugs (e.g. the
// 'threadString' group merges 'thread' + 'strings'). Raw slugs resolve to a
// single-slug group via the fallback in resolveCategoryGroup.
const group = computed(() => resolveCategoryGroup(currentCategory.value));

async function loadData() {
    loading.value = true;
    try {
        if (group.value) {
            let merged;
            if (group.value.key === 'all') {
                merged = await api.getProducts(null);
            } else {
                // Fetch every slug in the group, then merge and de-duplicate by id.
                const lists = await Promise.all(group.value.slugs.map(s => api.getProducts(s)));
                const seen = new Set();
                merged = lists.flat().filter(p => !seen.has(p.id) && seen.add(p.id));
            }
            products.value = merged.map(p => ({
                ...p,
                slug: p.slug || generateSlug(p.name, p.id)
            }));
            hasLoaded.value = true;
        }
    } catch (error) {
        console.error('Error loading data:', error);
    } finally {
        loading.value = false;
    }
}

onServerPrefetch(loadData);

onMounted(() => {
    if (!hasLoaded.value && products.value.length === 0) {
        loadData();
    }
});

watch(() => props.category, () => {
    letterFilter.value = null;
    hasLoaded.value = false;
    loadData();
});

const currentImageKey = ref(null);

const handleQuickView = (item) => {
    router.push({
        name: 'catalog',
        params: { lang: currentLang.value, category: currentCategory.value, productSlug: item.slug }
        });
};

const closePopupState = () => {
    showPopup.value = false;
    selectedProduct.value = null;
    currentImageKey.value = null;
};

const closePopup = () => {
    router.push({
  name: 'catalog',
  params: { lang: currentLang.value, category: currentCategory.value }
});
};

// Watch for product slug in route parameters to trigger popup
watch(
    [() => route.params.productSlug, products],
    ([newSlug, currentProducts]) => {
        if (newSlug) {
            if (currentProducts && currentProducts.length > 0) {
                const product = currentProducts.find(p => p.slug === newSlug);
                if (product) {
                    selectedProduct.value = product;
                    currentImageKey.value = product.image_key;
                    showPopup.value = true;
                } else {
                    closePopupState();
                }
            }
        } else {
            closePopupState();
        }
    },
    { immediate: true }
);

const truncateMetaDescription = (text, maxLength = 160) => {
    if (!text) return '';
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= maxLength) return cleaned;
    return `${cleaned.slice(0, maxLength - 1).trim()}…`;
};

const productSeoFallback = (product) => {
    const prodName = tProduct(product, 'name');
    if (currentLang.value === 'th') {
        return `ซื้อ ${prodName} ออนไลน์ อุปกรณ์เย็บปักถักร้อยและวัสดุงานฝีมือคุณภาพสูงจากตลาดสำเพ็ง ราคาเป็นกันเอง`;
    }
    return `Buy ${prodName} online. High-quality sewing, tailoring, and craft supplies from Bangkok's Sampeng Market.`;
};

// Dynamic SEO tags using useHead
const seoTitle = computed(() => {
    if (selectedProduct.value) {
        const isThai = currentLang.value === 'th';
        const storeName = isThai ? 'กิจเจริญ สำเพ็ง' : 'Kitcharoen Sampeng Market';
        const prodName = tProduct(selectedProduct.value, 'name');
        return `${prodName} | ${storeName}`;
    }
    const isThai = currentLang.value === 'th';
    const storeName = isThai ? 'กิจเจริญ สำเพ็ง' : 'Kitcharoen Sampeng Market';
    const catName = tCategory(currentCategory.value);
    return `${catName} - ${storeName}`;
});

const seoDescription = computed(() => {
    // Re-run when async product translations finish loading
    translationStore.translations;

    if (selectedProduct.value) {
        const productDescription = tProduct(selectedProduct.value, 'description');
        if (productDescription) {
            return truncateMetaDescription(productDescription);
        }
        return productSeoFallback(selectedProduct.value);
    }
    return tCategoryDesc(currentCategory.value);
});

useHead(() => ({
    title: seoTitle.value,
    meta: [
        { name: 'description', content: seoDescription.value, key: 'description' }
    ]
}));

const setMainImage = (key) => {
    currentImageKey.value = key;
};

// Price tiers to display: a VariantLink image's own price_1..5 override the
// base product price_1..5 when that image is the one currently shown.
const displayPrice = computed(() => {
    const product = selectedProduct.value;
    if (!product) return {};
    const images = product.images || [];
    const match = currentImageKey.value
        ? images.find(img => img.image_key === currentImageKey.value && img.attribute_type === 'variant_link')
        : null;
    const hasOverride = match && [match.price_1, match.price_2, match.price_3, match.price_4, match.price_5]
        .some(p => p !== null && p !== undefined);
    if (hasOverride) {
        return { price_1: match.price_1, price_2: match.price_2, price_3: match.price_3, variantLabel: match.attribute_value || null };
    }
    return { price_1: product.price_1, price_2: product.price_2, price_3: product.price_3, variantLabel: null };
});

// Per-piece prices for the popup's price-tier cards (never show raw box prices).
const displayPricePerPiece = computed(() => {
    const moq = parseMoq(selectedProduct.value?.moq);
    return {
        price_1: toPerPiece(displayPrice.value.price_1, moq),
        price_2: toPerPiece(displayPrice.value.price_2, moq),
        price_3: toPerPiece(displayPrice.value.price_3, moq)
    };
});

// Ordered list of all image keys for the popup gallery (main first, then extras)
const galleryImageKeys = computed(() => {
    if (!selectedProduct.value) return [];
    const keys = [selectedProduct.value.image_key];
    if (selectedProduct.value.images && selectedProduct.value.images.length > 0) {
        selectedProduct.value.images.forEach(img => {
            if (img.image_key) keys.push(img.image_key);
        });
    }
    return keys.filter(Boolean);
});

// Usage is stored as JSON ([{type, example}]); older products may still have
// the legacy comma-separated list, which we fall back to (no example text).
const usageEntries = computed(() => {
    const raw = tProduct(selectedProduct.value, 'usage');
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed
                .filter(e => e && e.type)
                .map(e => ({ type: e.type, example: e.example || '' }));
        }
    } catch {
        // Legacy comma-separated list
    }
    return raw.split(',').map(s => s.trim()).filter(Boolean).map(type => ({ type, example: '' }));
});

const navigateImage = (step) => {
    const keys = galleryImageKeys.value;
    if (keys.length <= 1) return;
    const activeKey = currentImageKey.value || selectedProduct.value?.image_key;
    let index = keys.indexOf(activeKey);
    if (index === -1) index = 0;
    const nextIndex = (index + step + keys.length) % keys.length;
    currentImageKey.value = keys[nextIndex];
};

// Cursor-following zoom for the main popup image
const ZOOM_SCALE = 2.2;
const isZooming = ref(false);
const zoomOrigin = ref('50% 50%');

const handleZoomMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 80;
    const y = ((e.clientY - rect.top) / rect.height) * 80;
    zoomOrigin.value = `${Math.max(0, Math.min(80, x))}% ${Math.max(0, Math.min(80, y))}%`;
};

const enableZoom = () => {
    isZooming.value = true;
};

const disableZoom = () => {
    isZooming.value = false;
    zoomOrigin.value = '50% 50%';
};

// Cart Logic
const handleAddToCartClick = (item) => {
    selectedProductForCart.value = item;
    showConfirmModal.value = true;

    const seeded = {};
    variantsForCart.value.forEach(row => { seeded[row.rowKey] = moqNumber.value; });
    variantQuantities.value = seeded;
    variantQtyWarnings.value = {};
};

const closeConfirmModal = () => {
    showConfirmModal.value = false;
    selectedProductForCart.value = null;
    variantQuantities.value = {};
    variantQtyWarnings.value = {};
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

const openImageLightbox = (row) => {
    lightboxImageKey.value = row.imageKey;
    showImageLightbox.value = true;
};

const closeImageLightbox = () => {
    showImageLightbox.value = false;
    lightboxImageKey.value = null;
};

const confirmAddToCart = () => {
    const product = selectedProductForCart.value;
    if (!product) return;

    const rowsToAdd = cartRowsView.value.filter(row => row.qty > 0);
    if (rowsToAdd.length === 0) return;

    rowsToAdd.forEach(row => {
        cartStore.addToCart(
            product,
            { size: row.label || 'Standard', color: 'Default', price: row.perPiecePrice },
            row.qty
        );
    });

    showNotificationMsg(`${tProduct(product, 'name')} added to cart! 🛒`);
    closeConfirmModal();
};

const showNotificationMsg = (msg) => {
    notificationMessage.value = msg;
    showNotification.value = true;
    setTimeout(() => {
        showNotification.value = false;
    }, 2000);
};


// Logic to find an image matching a specific attribute value
const handleAttributeClick = (type, value) => {
    if (!selectedProduct.value || !selectedProduct.value.images) return;

    // Find image that matches this attribute value
    const match = selectedProduct.value.images.find(img =>
        img.attribute_type === type &&
        img.attribute_value?.trim().toLowerCase() === value.trim().toLowerCase()
    );

    if (match) {
        currentImageKey.value = match.image_key;
    }
};

const getImageUrl = (key, variant = 'large') => {
    if (!key) return 'https://m.media-amazon.com/images/I/610a5LpNbTL.jpg';
    const keyStr = String(key);
    if (keyStr.startsWith('http')) return keyStr;
    if (keyStr.includes('.')) return `${API_URL}/images/${keyStr}`;
    return `${API_URL}/images/${keyStr}-${variant}.webp`;
};


const sortedProducts = computed(() => {
    let sorted = [...products.value];
    // "all" defaults to alphabetical; explicit sort options still work.
    const isAll = currentCategory.value === 'all';
    const effectiveSort = (isAll && activeSortBy.value === 'popular') ? 'name' : activeSortBy.value;

    if (effectiveSort === 'price_asc') {
        sorted.sort((a, b) => (getCheapestPricePerPiece(a) || a.price || 0) - (getCheapestPricePerPiece(b) || b.price || 0));
    } else if (effectiveSort === 'price_desc') {
        sorted.sort((a, b) => (getCheapestPricePerPiece(b) || b.price || 0) - (getCheapestPricePerPiece(a) || a.price || 0));
    } else if (effectiveSort === 'name') {
        const bcp47 = locale.value === 'th' ? 'th-TH' : 'en';
        sorted.sort((a, b) => {
            const nameA = (locale.value === 'th' ? (a.name_th || a.name) : a.name) || '';
            const nameB = (locale.value === 'th' ? (b.name_th || b.name) : b.name) || '';
            return nameA.localeCompare(nameB, bcp47);
        });
    }
    return sorted;
});

const letterFilter = ref(null);

const getDisplayName = (p) =>
    ((locale.value === 'th' ? (p.name_th || p.name) : p.name) || '').trim();

const availableLetters = computed(() => {
    const letters = new Set();
    sortedProducts.value.forEach(p => {
        const first = getDisplayName(p).charAt(0);
        if (first) letters.add(first.toUpperCase());
    });
    const bcp47 = locale.value === 'th' ? 'th-TH' : 'en';
    return [...letters].sort((a, b) => a.localeCompare(b, bcp47));
});

const displayedProducts = computed(() => {
    if (!letterFilter.value) return sortedProducts.value;
    return sortedProducts.value.filter(p =>
        getDisplayName(p).charAt(0).toUpperCase() === letterFilter.value
    );
});
</script>

<template>
    <div class="category-page">
        <!-- Compact category header -->
        <div class="category-bar">
            <div class="category-bar-left">
                <div class="category-bar-image">
                    <ion-icon v-if="group?.svgSrc" :src="group.svgSrc"></ion-icon>
                    <ion-icon v-else-if="group?.icon" :name="group.icon"></ion-icon>
                </div>
                <div>
                    <h2 class="category-bar-title">{{ tCategory(currentCategory) }}</h2>
                    <p class="category-bar-desc">{{ tCategoryDesc(currentCategory) }}</p>
                </div>
            </div>
            <span class="product-count-badge">
                {{ $t('catalog.showing', { count: displayedProducts.length }) }}
                <span v-if="letterFilter" class="letter-active-badge">{{ letterFilter }}</span>
            </span>
        </div>

        <!-- Letter filter bar -->
        <div v-if="availableLetters.length > 1" class="letter-filter-bar">
            <button
                class="letter-btn"
                :class="{ active: letterFilter === null }"
                @click="letterFilter = null"
            >All</button>
            <button
                v-for="letter in availableLetters"
                :key="letter"
                class="letter-btn"
                :class="{ active: letterFilter === letter }"
                @click="letterFilter = (letterFilter === letter ? null : letter)"
            >{{ letter }}</button>
        </div>

        <!-- Product Grid -->
        <div class="product-grid">
            <div v-if="loading" class="loading-state"
                style="grid-column: 1/-1; text-align: center; padding: 60px 0;">
                <div class="loader"></div>
                <p style="color: #6b5d54; font-weight: 600; margin-top: 15px;">Loading products...</p>
            </div>
            <template v-else>
                <router-link
                    v-for="item in displayedProducts"
                    :key="item.id"
                    :to="{ name: 'catalog', params: { lang: currentLang, category: currentCategory, productSlug: item.slug } }"
                    class="product-card"
                >
                    <div class="card-image">
                        <div class="badge" v-if="item.price_1">{{ $t('catalog.artisanChoice') }}</div>
                        <img :src="getImageUrl(item.image_key)" :alt="tProduct(item, 'name')">
                    </div>
                    <div class="card-content">
                        <h3 class="card-title">{{ tProduct(item, 'name') }}</h3>
                        <div class="card-bottom">
                            <div class="card-desc">
                                <div class="card-price" v-if="getCheapestPricePerPiece(item)">
                                    <span class="cheapest-label">{{ $t('catalog.cheapestAt') }}</span>
                                    <span class="price-value">฿{{ getCheapestPricePerPiece(item).toFixed(2) }}<span class="price-unit"> / {{ $t('catalog.piece') }}</span></span>
                                </div>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
                                <div class="card-moq" v-if="item.moq">
                                    {{ $t('catalog.moq') }}: {{ item.moq }}
                                </div>
                                <button class="add-btn" @click.prevent.stop="handleAddToCartClick(item)">
                                    <ion-icon name="cart"></ion-icon> {{ $t('catalog.addToOrderShort') }}
                                </button>
                            </div>
                        </div>
                    </div>
                </router-link>
            </template>
        </div>

        <!-- Product Details Popup -->
        <div v-if="showPopup" class="popup-overlay" @click="closePopup">
            <div class="popup-content" @click.stop v-if="selectedProduct">
                <button class="close-button" @click="closePopup">
                    <ion-icon name="close-outline"></ion-icon>
                </button>

                <div class="popup-body">
                    <div class="popup-image">
                        <div class="main-image-display">
                            <button v-if="galleryImageKeys.length > 1" class="image-nav prev"
                                @click.stop="navigateImage(-1)" aria-label="Previous image">
                                <ion-icon name="chevron-back-outline"></ion-icon>
                            </button>
                            <div class="zoom-frame" @mouseenter="enableZoom" @mousemove="handleZoomMove"
                                @mouseleave="disableZoom">
                                <img :src="getImageUrl(currentImageKey || selectedProduct.image_key)"
                                    :alt="tProduct(selectedProduct, 'name')"
                                    :style="{ transformOrigin: zoomOrigin, transform: isZooming ? `scale(${ZOOM_SCALE})` : 'scale(1)' }">
                            </div>
                            <button v-if="galleryImageKeys.length > 1" class="image-nav next"
                                @click.stop="navigateImage(1)" aria-label="Next image">
                                <ion-icon name="chevron-forward-outline"></ion-icon>
                            </button>
                        </div>

                        <!-- Gallery Thumbnails -->
                        <div class="gallery-thumbnails"
                            v-if="selectedProduct.images && selectedProduct.images.length > 0">
                            <div class="thumb"
                                :class="{ active: currentImageKey === selectedProduct.image_key || !currentImageKey }"
                                @click="setMainImage(selectedProduct.image_key)">
                                <img :src="getImageUrl(selectedProduct.image_key)" alt="Main">
                            </div>
                            <div v-for="img in selectedProduct.images" :key="img.id" class="thumb"
                                :class="{ active: currentImageKey === img.image_key }"
                                @click="setMainImage(img.image_key)">
                                <img :src="getImageUrl(img.image_key, 'thumb')" :alt="img.attribute_value || 'Gallery'">
                            </div>
                        </div>
                    </div>

                    <div class="popup-details">
                        <div class="popup-info-header">
                            <span class="popup-category">{{ tCategory(selectedProduct.category) }}</span>
                            <h2 class="popup-title">{{ tProduct(selectedProduct, 'name') }}</h2>
                        </div>
                        <div class="detail-section price-section"
                            v-if="displayPrice.price_1 || displayPrice.price_2 || displayPrice.price_3">
                            <h3 class="detail-heading">
                                <ion-icon name="pricetags-outline"></ion-icon>
                                {{ $t('catalog.pricing') }}<span v-if="displayPrice.variantLabel">
                                    ({{ displayPrice.variantLabel }})</span>
                            </h3>
                            <div class="price-tiers">
                                <div class="price-tier" v-if="displayPrice.price_1">
                                    <span class="price-tier-value">฿{{ displayPricePerPiece.price_1.toFixed(2) }}</span>
                                    <span class="price-tier-box">(฿{{ displayPrice.price_1 }} / box)</span>
                                    <span class="price-tier-note">{{ $t('catalog.priceTier1') }}</span>
                                </div>
                                <div class="price-tier" v-if="displayPrice.price_2">
                                    <span class="price-tier-value">฿{{ displayPricePerPiece.price_2.toFixed(2) }}</span>
                                    <span class="price-tier-box">(฿{{ displayPrice.price_2 }} / box)</span>
                                    <span class="price-tier-note">{{ $t('catalog.priceTier2') }}</span>
                                </div>
                                <div class="price-tier" v-if="displayPrice.price_3">
                                    <span class="price-tier-value">฿{{ displayPricePerPiece.price_3.toFixed(2) }}</span>
                                    <span class="price-tier-box">(฿{{ displayPrice.price_3 }} / box)</span>
                                    <span class="price-tier-note">{{ $t('catalog.priceTier3') }}</span>
                                </div>
                            </div>
                        </div>
                        <p class="popup-description" v-if="tProduct(selectedProduct, 'description')">{{ tProduct(selectedProduct, 'description') }}</p>

                        <div class="detail-section" v-if="tProduct(selectedProduct, 'attribute')" style="margin:0; display:flex; border-bottom: 1px solid #eee; justify-content:end;">
                            <!-- <h3 class="detail-heading">
                                <ion-icon name="information-circle-outline"></ion-icon>
                            </h3> -->
                            <p class="detail-text">{{ $t('catalog.attribute') }} : {{ tProduct(selectedProduct, 'attribute') }}</p>
                        </div>

                        <div class="detail-section" v-if="usageEntries.length > 0" style="margin-bottom:10px">
                            <h3 class="detail-heading" style="margin-top: 10px;">
                                <ion-icon name="hammer-outline"></ion-icon>
                                {{ $t('catalog.howItsUsed') }}
                            </h3>
                            <ul class="usage-list">
                                <li v-for="entry in usageEntries" :key="entry.type">
                                    {{ entry.type }}<span v-if="entry.example"> : {{ entry.example }}</span>
                                </li>
                            </ul>
                        </div>

                        <div class="detail-section" v-if="tProduct(selectedProduct, 'varieties')">
                            <h3 class="detail-heading">
                                <ion-icon name="grid-outline"></ion-icon>
                                {{ $t('catalog.varieties') }}
                            </h3>
                            <div class="tags-container">
                                <span v-for="variety in tProduct(selectedProduct, 'varieties').split(',')"
                                    :key="variety" class="tag" @click="handleAttributeClick('variety', variety)">
                                    {{ variety.trim() }}
                                </span>
                            </div>
                        </div>

                        <div class="detail-section" v-if="tProduct(selectedProduct, 'sizes')">
                            <h3 class="detail-heading">
                                <ion-icon name="resize-outline"></ion-icon>
                                {{ $t('catalog.availableSizes') }}
                            </h3>
                            <div class="tags-container">
                                <span v-for="size in tProduct(selectedProduct, 'sizes').split(',')" :key="size"
                                    class="tag size-tag" @click="handleAttributeClick('size', size)">
                                    {{ size.trim() }}
                                </span>
                            </div>
                        </div>

                        <div class="detail-section" v-if="tProduct(selectedProduct, 'colors')">
                            <h3 class="detail-heading">
                                <ion-icon name="color-palette-outline"></ion-icon>
                                {{ $t('catalog.availableColors') }}
                            </h3>
                            <div class="tags-container">
                                <span v-for="color in tProduct(selectedProduct, 'colors').split(',')" :key="color"
                                    class="tag color-tag" @click="handleAttributeClick('color', color)">
                                    {{ color.trim() }}
                                </span>
                            </div>
                        </div>
                        <div class="card-footer" style="justify-content: center; margin-top: 20px;">
                            <button class="add-btn" @click.prevent.stop="handleAddToCartClick(selectedProduct)">
                                <ion-icon name="cart"></ion-icon> {{ $t('catalog.addToOrder') }}
                            </button>
                        </div>
                        <div v-if="!tProduct(selectedProduct, 'description') && !tProduct(selectedProduct, 'attribute') && usageEntries.length === 0 && !tProduct(selectedProduct, 'varieties') && !tProduct(selectedProduct, 'sizes') && !tProduct(selectedProduct, 'colors')" class="no-details-message">
                            <p>{{ $t('catalog.noAdditionalDetails') || 'No additional details available for this product.' }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Confirmation Modal -->
        <div v-if="showConfirmModal" class="popup-overlay" @click="closeConfirmModal">
            <div class="confirm-modal confirm-modal-wide" @click.stop v-if="selectedProductForCart">
                <div class="confirm-header">
                    <div class="confirm-icon">🛒</div>
                    <h2>{{ tProduct(selectedProductForCart, 'name') }}</h2>
                </div>
                <div class="confirm-body">
                    <p class="confirm-message">{{ $t('catalog.confirmQtyMessage') }}</p>
                    <div class="variant-tier-banner" v-if="totalVolumeForCart > 0">
                        {{ $t('catalog.currentTierNote', { tier: activeTierForCart, total: totalVolumeForCart }) }}
                    </div>
                    <div class="variant-rows">
                        <div class="variant-row" v-for="row in cartRowsView" :key="row.rowKey">
                            <button class="variant-thumb thumb" type="button" @click="openImageLightbox(row)">
                                <img :src="getImageUrl(row.imageKey, 'thumb')"
                                    :alt="row.label || tProduct(selectedProductForCart, 'name')">
                            </button>
                            <div class="variant-row-info">
                                <span class="variant-label">{{ row.label || $t('catalog.standardVariant') }}</span>
                                <span class="variant-unit-price">
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
                            <div class="variant-row-total">฿{{ row.rowTotal.toFixed(2) }}</div>
                        </div>
                    </div>
                    <div class="confirm-grand-total">{{ $t('catalog.grandTotal') }}: ฿{{ cartGrandTotal.toFixed(2) }}</div>
                </div>
                <div class="confirm-footer">
                    <button class="btn-cancel" @click="closeConfirmModal">{{ $t('catalog.cancel') }}</button>
                    <button class="btn-confirm" :disabled="isConfirmDisabled" @click="confirmAddToCart">
                        {{ $t('catalog.confirm') }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Variant Image Lightbox -->
        <div v-if="showImageLightbox" class="lightbox-overlay" @click="closeImageLightbox">
            <button class="lightbox-close" @click="closeImageLightbox">
                <ion-icon name="close-outline"></ion-icon>
            </button>
            <img class="lightbox-image" :src="getImageUrl(lightboxImageKey)" alt="" @click.stop>
        </div>

        <!-- Notification Toast -->
        <transition name="slide-up">
            <div v-if="showNotification" class="notification">
                <div class="notification-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                </div>
                <div class="notification-content">
                    {{ notificationMessage }}
                </div>
            </div>
        </transition>
    </div>
</template>

<style scoped>
.category-page {
    /* background: #FBF7F2; */
    /* min-height: 100vh; */
    padding-bottom: 40px;
}

/* COMPACT CATEGORY BAR */
.category-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px 20px;
    background-color: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    flex-wrap: wrap;
}

.category-bar-left {
    display: flex;
    align-items: center;
    gap: 14px;
}

.category-bar-image {
    width: 60px;
    height: 60px;
    border-radius: 1rem;
    overflow: hidden;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 3px solid black;
}

.category-bar-image ion-icon {
    font-size: 30px;
    color: #8b6f47;
}

.category-bar-title {
    font-family: 'ZCOOL XiaoWei', serif;
    font-size: 1.4rem;
    color: #35231d;
    margin: 0 0 4px;
    line-height: 1.2;
}

.category-bar-desc {
    font-size: 12px;
    color: #8b6f47;
    margin: 0;
    max-width: 400px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.letter-filter-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    padding: 10px 20px 12px;
    background: #FDF3E6;
    margin-bottom: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.letter-btn {
    min-width: 32px;
    height: 30px;
    padding: 0 9px;
    border: 1.5px solid #e4d5c6;
    border-radius: 7px;
    background-color: white;
    color: #7a5c4a;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.14s, color 0.14s, border-color 0.14s;
    line-height: 1;
}

.letter-btn:hover:not(.active) {
    background: #FDF3E6;
    border-color: #d4b896;
}

.letter-btn.active {
    background: #DD876E;
    border-color: #DD876E;
    color: #fff;
}

.letter-active-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    background: #DD876E;
    color: #fff;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
    margin-left: 5px;
    vertical-align: middle;
}

.product-count-badge {
    font-size: 12px;
    font-weight: 600;
    color: #9e8272;
    background: #FDF3E6;
    padding: 5px 12px;
    border-radius: 20px;
    white-space: nowrap;
    flex-shrink: 0;
}

/* PRODUCT GRID */
.product-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    margin: 0 auto;
    padding: 0 1rem;
    gap: 2px;
}

/* Spinner Loader styling */
.loader {
    border: 4px solid #f3f3f3;
    border-top: 4px solid #8b6f47;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin: 0 auto;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}

.product-card {
    background: #fdfcfb;
    overflow: hidden;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03);
    border: 1px solid #f1f2f6;
    transition: all 0.3s ease;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    text-decoration: none;
    color: inherit;
}

.product-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
}

.card-image {
    aspect-ratio: 1 / 1;
    position: relative;
    overflow: hidden;
    background: #f5f6fa;
}

.card-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
}

.product-card:hover .card-image img {
    transform: scale(1.05);
}

.badge {
    position: absolute;
    top: 15px;
    left: 15px;
    background: #008080;
    color: white;
    padding: 4px 12px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1px;
    border-radius: 4px;
    z-index: 2;
}

.no-details-message {
    padding: 30px 0;
    text-align: center;
    color: #999;
    font-style: italic;
}

.no-details-message p {
    margin: 0;
    font-size: 15px;
    line-height: 1.6;
}

.card-content {
    padding: 10px;
    flex: 1;
    display: flex;
    flex-direction: column;
}

.card-title {
    font-size: 0.85rem;
    color: #2d3436;
    margin: 0 0 10px;
    font-weight: 500;
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-height: calc(0.85rem * 1.35 * 2);
}

.card-bottom {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    /* align-items: flex-end; */
    gap: 10px;
    margin-top: auto;
}

.card-desc {
    flex: 1;
    min-width: 0;
    margin-left: 0.2rem;
}

.card-price {
    display: flex;
    flex-direction: column;
    line-height: 1.1;
    margin: 0;
}

.cheapest-label {
    font-size: 0.6rem;
    color: #9e8272;
    font-weight: 500;
}

.price-value {
    font-size: 1.35rem;
    font-weight: 700;
    color: #ee4d2d;
}

.price-unit {
    font-size: 0.7rem;
    font-weight: 500;
    color: #9e8272;
}

.card-moq {
    font-size: 0.65rem;
    color: #9e8272;
    margin: 3px 0 0;
}

.card-footer {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: auto;
}

.add-btn {
    background: #008080;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 20px;
    font-size: 0.7rem;
    font-weight: 400;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    transition: all 0.2s;
}

.add-btn:hover {
    background: #006666;
    transform: scale(1.05);
    cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24'%3E%3Cpath fill='%23ffffff' d='M11 9h2V6h3V4h-3V1h-2v3H8v2h3v3zm-4 9c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2zm-9.83-3.25l.03-.12.9-1.63H15.55c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0019.88 4H5.21L4.27 2H1v2h2l3.6 7.59-1.35 2.44C5 14.62 5 15 5 15c0 1.1.9 2 2 2h12v-2H7.42a.25.25 0 01-.25-.25z'/%3E%3C/svg%3E") 2 2, pointer;
}

/* POPUP (Reused) */
.popup-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
    animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

.popup-content {
    background: white;
    max-width: 1050px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
    animation: slideUp 0.3s ease;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

@keyframes slideUp {
    from {
        transform: translateY(30px);
        opacity: 0;
    }

    to {
        transform: translateY(0);
        opacity: 1;
    }
}

.close-button {
    position: absolute;
    top: 20px;
    right: 20px;
    background: white;
    border: none;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    z-index: 10;
}

.close-button:hover {
    background: #f5f5f5;
    transform: rotate(90deg);
}

.close-button ion-icon {
    font-size: 24px;
    color: #2d2d2d;
}

.popup-body {
    display: grid;
    grid-template-columns: 3fr 2fr;
    gap: 0;
}

.popup-image {
    background: #f8f8f8;
    display: flex;
    flex-direction: column;
    padding: 40px;
    border-radius: 20px 0 0 20px;
}

.main-image-display {
    position: relative;
    width: 100%;
    height: 400px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 30px;
}

.image-nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 5;
    transition: all 0.2s ease;
}

.image-nav:hover {
    background: #008080;
    transform: translateY(-50%) scale(1.08);
}

.image-nav:hover ion-icon {
    color: white;
}

.image-nav ion-icon {
    font-size: 24px;
    color: #2d2d2d;
}

.image-nav.prev {
    left: 0;
}

.image-nav.next {
    right: 0;
}

.zoom-frame {
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: 12px;
    cursor: zoom-in;
}

.main-image-display img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: 12px;
    transition: transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);
    will-change: transform;
}

.gallery-thumbnails {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(70px, max-content));
    gap: 8px;
}

.thumb {
    width: 70px;
    height: 70px;
    flex-shrink: 0;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    border: 2px solid transparent;
    transition: all 0.2s;
    background: white;
}

.thumb:hover {
    border-color: #b89968;
    transform: translateY(-2px);
}

.thumb.active {
    border-color: #008080;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.popup-info-header {
    margin-bottom: 25px;
    width: 100%;
}

.popup-details {
    padding: 40px;
    overflow-y: auto;
}

.popup-category {
    display: inline-block;
    background: linear-gradient(135deg, #8b6f47, #b89968);
    color: white;
    padding: 6px 16px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 12px;
}

.popup-price {
    display: none;
}

.popup-title {
    font-size: 1rem;
    font-weight: 700;
    color: #2d2d2d;
    margin: 0 0 16px 0;
    line-height: 1.2;
}

.popup-description {
    font-size: 16px;
    color: #666;
    line-height: 1.6;
    text-align: justify;
    margin-bottom: 0;
}

.detail-section {
    padding-bottom: 14px;
    margin-bottom: 14px;
    border-bottom: 1px solid #eee;
}

.detail-heading {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 16px;
    font-weight: 700;
    color: #2d2d2d;
    margin: 0 0 12px 0;
}

.detail-heading ion-icon {
    font-size: 20px;
    color: #8b6f47;
}

.detail-text {
    font-size: 15px;
    color: #555;
    line-height: 1.7;
    margin: 0;
    padding-left: 30px;
}

.tags-container {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.tag {
    background: #f5f5f5;
    color: #2d2d2d;
    padding: 4px 8px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    border: 2px solid transparent;
}

.size-tag {
    background: #e3f2fd;
    color: #1976d2;
}

.color-tag {
    background: #fff3e0;
    color: #f57c00;
}

.usage-list {
    margin: 0;
    padding-left: 30px;
}

.usage-list li {
    font-size: 15px;
    color: #555;
    line-height: 1.7;
}

.usage-list li strong {
    color: #2d2d2d;
    text-transform: capitalize;
    font-weight: 600;
}

.usage-list li::marker {
    color: #8b6f47;
}

.price-tiers {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    flex: 1;
}

.price-tier {
    flex: 1;
    min-width: 50px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 12px 8px;
    background: #f8f8f8;
    border: 1px solid #eee;
    border-radius: 12px;
    text-align: center;
}

.price-tier-note {
    font-size: 12px;
    font-weight: 600;
    color: #8b6f47;
    text-transform: uppercase;
    letter-spacing: 0.3px;
}

.price-tier-value {
    font-size: 22px;
    font-weight: 800;
    color: #008080;
}

.price-tier-box {
    font-size: 11px;
    font-weight: 500;
    color: #9e8272;
}

/* RESPONSIVE */
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
    margin-bottom: 0;
}

.confirm-header h2 {
    font-size: 24px;
    color: #2d3436;
    margin: 0;
    font-family: 'ZCOOL XiaoWei', serif;
}

.confirm-product-info {
    display: flex;
    align-items: center;
    gap: 20px;
    background: #f8f9fa;
    padding: 15px;
    border-radius: 16px;
    margin-bottom: 20px;
    text-align: left;
}

.confirm-product-info img {
    width: 70px;
    height: 70px;
    object-fit: cover;
    border-radius: 12px;
}

.confirm-text h3 {
    font-size: 16px;
    margin: 0 0 4px 0;
    color: #2d3436;
}

.category-tag {
    font-size: 12px;
    color: #8b6f47;
    margin: 0;
    font-weight: 600;
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

.variant-thumb {
    width: 90px;
    height: 90px;
    padding: 0;
    border: 2px solid transparent;
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

.btn-cancel:hover {
    background: #dfe4ea;
}

/* VARIANT IMAGE LIGHTBOX */
.lightbox-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
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

.slide-up-enter-from {
    transform: translate(-50%, 100%);
    opacity: 0;
}

.slide-up-leave-to {
    transform: translate(-50%, 100%);
    opacity: 0;
}
/* RESPONSIVE */
@media (max-width: 900px) {
    .category-bar-desc {
        display: none;
    }

    .popup-body {
        grid-template-columns: 1fr;
    }

    .popup-image {
        border-radius: 20px 20px 0 0;
    }
}

@media (max-width: 900px) {
    .product-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
    }

    .card-image {
        height: 200px;
    }
}

@media (max-width: 600px) {
    .category-bar {
        padding: 12px 14px;
        gap: 10px;
    }

    .category-bar-image {
        width: 44px;
        height: 44px;
    }

    .category-bar-image ion-icon {
        font-size: 22px;
    }

    .category-bar-title {
        font-size: 1.1rem;
    }
}</style>
