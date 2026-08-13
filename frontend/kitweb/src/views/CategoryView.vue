<script setup>
// The product grid for one category. Product detail used to open as a modal from
// here; it is now its own page (views/ProductPage.vue), so this file is back to
// doing one thing: list, sort and filter.
import { ref, computed, onMounted, onServerPrefetch, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../services/api';
import { useI18n } from 'vue-i18n';
import { useHead } from '@unhead/vue';
import AddToOrderModal from '../components/add-to-order-modal.vue';
import { defaultLang } from '@/utils/localeRoutes';
import { resolveCategoryGroup } from '@/utils/catalogCategories';
import { getProductImageUrl, getProductImageSrcset } from '@/utils/productImages';
// Per-piece price maths is shared with the homepage's New Arrivals strip.
import { getCheapestPricePerPiece } from '@/utils/productPricing';

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

const generateSlug = (name, id) => {
    if (!name) return String(id);
    const slugified = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    return `${slugified}-${id}`;
};

const { t, te, locale } = useI18n();
const route = useRoute();
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
// to its translated label. Group keys are camelCase and product slugs are lowercase,
// so try the name as-is first, then fall back to the lowercased form. `te` is checked
// against 'en' (the most complete locale) so t() still applies per-locale fallback.
const tCategory = (catName) => {
    if (!catName) return '';
    const raw = catName.trim();
    if (te(`categories.${raw}`, 'en')) return t(`categories.${raw}`);
    const lower = raw.toLowerCase();
    if (te(`categories.${lower}`, 'en')) return t(`categories.${lower}`);
    return catName;
};

const tCategoryDesc = (catName) => {
    if (!catName) return '';
    const raw = catName.trim();
    if (te(`categories.${raw}Desc`, 'en')) return t(`categories.${raw}Desc`);
    const lower = raw.toLowerCase();
    if (te(`categories.${lower}Desc`, 'en')) return t(`categories.${lower}Desc`);
    return t('catalog.categoryDescriptions.Default');
};

const products = ref([]);
const loading = ref(true);
const hasLoaded = ref(false);
const internalSortBy = ref('popular');
const activeSortBy = computed(() => props.sortBy || internalSortBy.value);

// Set to open the shared add-to-order dialog; the component owns the tier maths.
const productForCart = ref(null);

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

// SEO for the category listing. The product-level title/description moved to
// ProductPage along with the detail view.
const seoTitle = computed(() => {
    const storeName = currentLang.value === 'th' ? 'กิจเจริญ สำเพ็ง' : 'Kitcharoen Sampeng Market';
    return `${tCategory(currentCategory.value)} - ${storeName}`;
});

const seoDescription = computed(() => tCategoryDesc(currentCategory.value));

useHead(() => ({
    title: seoTitle.value,
    meta: [
        { name: 'description', content: seoDescription.value, key: 'description' }
    ]
}));

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

// The backend has no pagination — /products returns the whole catalog in one
// response — so the grid pages on the client. That is where the cost actually
// was: 'all' is ~150 products, and rendering every card up front meant ~150
// product images on first paint. The JSON itself is only ~57KB gzipped.
// Crawlers are unaffected: every product URL is listed in dist/sitemap.xml by
// scripts/append-sitemap.js, so discovery never depended on this grid.
const PAGE_SIZE = 20;
const visibleCount = ref(PAGE_SIZE);

const pagedProducts = computed(() => displayedProducts.value.slice(0, visibleCount.value));
const remainingCount = computed(() => displayedProducts.value.length - pagedProducts.value.length);

const loadMore = () => {
    visibleCount.value += PAGE_SIZE;
};

// Any change to what the list contains or how it is ordered starts a new list,
// so it starts at page one. Sorting is included deliberately: keeping the old
// offset after a re-sort would show page 3 of a list the user has never seen
// page 1 of. `locale` is here because the 'name' sort is locale-collated.
watch([currentCategory, letterFilter, activeSortBy, locale], () => {
    visibleCount.value = PAGE_SIZE;
});

// The bar is a single scrolling row on phones, so the active letter can end up
// off-screen — bring it back into view when it changes.
const letterBarEl = ref(null);
watch(letterFilter, (letter) => {
    if (!letter || typeof window === 'undefined') return;
    nextTick(() => {
        const el = letterBarEl.value?.querySelector(`[data-letter="${CSS.escape(letter)}"]`);
        el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    });
});
</script>

<template>
    <div class="category-page">
        <!-- Compact category header -->
        <div class="category-bar" id="category-bar">
            <div class="category-bar-left">
                <div class="category-bar-image">
                    <ion-icon v-if="group?.svgSrc" :src="group.svgSrc"></ion-icon>
                    <ion-icon v-else-if="group?.icon" :name="group.icon"></ion-icon>
                </div>
                <div>
                    <!-- h1: with the photo hero gone, this is the page's only title. -->
                    <h1 class="category-bar-title">{{ tCategory(currentCategory) }}</h1>
                    <p class="category-bar-desc">{{ tCategoryDesc(currentCategory) }}</p>
                </div>
            </div>
            <span class="product-count-badge">
                <!-- The grid pages, so the badge reports both numbers rather than
                     implying the whole category is on screen. -->
                {{ remainingCount > 0
                    ? $t('catalog.showingOf', { shown: pagedProducts.length, total: displayedProducts.length })
                    : $t('catalog.showing', { count: displayedProducts.length }) }}
                <span v-if="letterFilter" class="letter-active-badge">{{ letterFilter }}</span>
            </span>
        </div>

        <!-- Letter filter bar. One scrolling row on phones rather than four
             wrapped ones — and six under Thai, whose alphabet runs to ~44
             initial consonants. -->
        <div v-if="availableLetters.length > 1" class="letter-filter-bar" ref="letterBarEl">
            <button
                class="letter-btn"
                :class="{ active: letterFilter === null }"
                @click="letterFilter = null"
            >{{ $t('catalog.allLetters') }}</button>
            <button
                v-for="letter in availableLetters"
                :key="letter"
                class="letter-btn"
                :class="{ active: letterFilter === letter }"
                :data-letter="letter"
                @click="letterFilter = (letterFilter === letter ? null : letter)"
            >{{ letter }}</button>
        </div>

        <!-- Product Grid -->
        <div class="product-grid">
            <div v-if="loading" class="loading-state"
                style="grid-column: 1/-1; text-align: center; padding: 60px 0;">
                <div class="loader"></div>
                <p style="color: #6b5d54; font-weight: 600; margin-top: 15px;">{{ $t('catalog.loading') }}</p>
            </div>
            <template v-else>
                <!-- Linked under the product's own category, not the grid's. The
                     grid can be a merged group ('threadString') or 'all', which
                     would otherwise give one product three indexable URLs. -->
                <router-link
                    v-for="(item, index) in pagedProducts"
                    :key="item.id"
                    :to="{ name: 'catalog', params: { lang: currentLang, category: item.category, productSlug: item.slug } }"
                    class="product-card"
                >
                    <div class="card-image">
                        <div class="badge" v-if="item.price_1">{{ $t('catalog.artisanChoice') }}</div>
                        <!-- Intrinsic size + a square box means the grid reserves
                             the right space before the image lands, instead of
                             reflowing as each one arrives. `sizes` tracks the
                             grid ladder below, so the browser can settle for the
                             250px thumb wherever the slot is small enough.
                             The first row is above the fold on every layout, so
                             it loads eagerly rather than waiting on the lazy pass. -->
                        <img :src="getProductImageUrl(item.image_key)"
                            :srcset="getProductImageSrcset(item.image_key)"
                            sizes="(max-width: 768px) 46vw, (max-width: 1024px) 23vw, 230px"
                            :alt="tProduct(item, 'name')"
                            width="400" height="400"
                            :loading="index < 4 ? 'eager' : 'lazy'" decoding="async">
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
                                <button class="add-btn" @click.prevent.stop="productForCart = item">
                                    <ion-icon name="cart"></ion-icon> {{ $t('catalog.addToOrderShort') }}
                                </button>
                            </div>
                        </div>
                    </div>
                </router-link>
            </template>
        </div>

        <!-- Load more. A button, not an infinite scroller: this page has a DIY
             section and a footer under it that auto-loading would keep pushing
             out of reach. -->
        <div v-if="!loading && remainingCount > 0" class="load-more-row">
            <button class="load-more-btn" @click="loadMore">
                <ion-icon name="chevron-down-outline"></ion-icon>
                {{ $t('catalog.loadMore') }}
                <span class="load-more-remaining">{{ remainingCount }}</span>
            </button>
        </div>

        <!-- Add-to-order dialog, toast and variant lightbox all live here. -->
        <AddToOrderModal :product="productForCart" @close="productForCart = null" />
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

@media (hover: hover) {
    .letter-btn:hover:not(.active) {
        background: #FDF3E6;
        border-color: #d4b896;
    }
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
    gap: 12px;
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

@media (hover: hover) {
    .product-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
    }
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

/* LOAD MORE */
.load-more-row {
    display: flex;
    justify-content: center;
    padding: 26px 1rem 6px;
}

.load-more-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 46px;
    padding: 0 26px;
    border: 1.5px solid #e4d5c6;
    border-radius: 24px;
    background: #fff;
    color: #7a5c4a;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.18s, border-color 0.18s, color 0.18s;
}

.load-more-btn ion-icon {
    font-size: 16px;
}

@media (hover: hover) {
    .load-more-btn:hover {
        background: #DD876E;
        border-color: #DD876E;
        color: #fff;
    }

    .load-more-btn:hover .load-more-remaining {
        background: rgba(255, 255, 255, 0.24);
        color: #fff;
    }
}

.load-more-remaining {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 20px;
    padding: 0 6px;
    border-radius: 10px;
    background: #FDF3E6;
    color: #9e8272;
    font-size: 11px;
    font-weight: 700;
    transition: background 0.18s, color 0.18s;
}

/* RESPONSIVE */
@media (max-width: 1024px) {
    .category-bar-desc {
        display: none;
    }

    .product-grid {
        grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
        gap: 10px;
    }
}

@media (max-width: 768px) {
    /* Two real columns. The old `repeat(3, 1fr)` was a hard floor with nothing
       below it, which left ~97px columns at 375px carrying a two-line title, a
       1.35rem price, an MOQ line and a pill button. */
    .product-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
        padding: 0 12px;
    }

    .card-content {
        padding: 8px;
    }

    .card-title {
        font-size: 0.8rem;
    }

    .price-value {
        font-size: 1.05rem;
    }

    .badge {
        top: 8px;
        left: 8px;
        padding: 3px 7px;
        font-size: 9px;
    }

    /* One tap target, not a 26px sliver. */
    .add-btn {
        width: 100%;
        min-height: 40px;
        justify-content: center;
    }

    /* Full-width so it is unmissable at the end of a thumb-scroll. */
    .load-more-row {
        padding: 20px 12px 4px;
    }

    .load-more-btn {
        width: 100%;
        min-height: 48px;
    }

    /* One scrolling row instead of four wrapped ones, pinned under the header
       so the letters stay reachable while the grid scrolls past. */
    .letter-filter-bar {
        position: sticky;
        top: var(--nav-h, 64px);
        z-index: 5;
        flex-wrap: nowrap;
        overflow-x: auto;
        scroll-snap-type: x proximity;
        overscroll-behavior-x: contain;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        gap: 6px;
        padding: 10px 14px;
        /* Hints that there is more to the right. */
        -webkit-mask-image: linear-gradient(to right, #000 88%, transparent 100%);
        mask-image: linear-gradient(to right, #000 88%, transparent 100%);
    }

    .letter-filter-bar::-webkit-scrollbar {
        display: none;
    }

    .letter-btn {
        flex: 0 0 auto;
        min-width: 40px;
        height: 40px;
        scroll-snap-align: center;
        font-size: 14px;
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
}

@media (max-width: 400px) {
    .product-grid {
        gap: 8px;
        padding: 0 10px;
    }

    .card-title {
        font-size: 0.78rem;
    }

    .price-value {
        font-size: 0.98rem;
    }

    .add-btn {
        font-size: 0.65rem;
        padding: 8px 6px;
    }
}</style>
