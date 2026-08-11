<script setup>
// Product detail as a real page rather than a modal over the grid. The route is
// unchanged (`catalog/:category/:productSlug`) — CatalogPage swaps this in for the
// sidebar layout when a slug is present, so every existing link keeps working and
// the canonical/sitemap logic needs no special case.
import { ref, computed, onMounted, onServerPrefetch, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useHead } from '@unhead/vue';
import { api, getProjectImageUrl } from '../services/api';
import AddToOrderModal from '../components/add-to-order-modal.vue';
import BreadcrumbBar from '../components/breadcrumb-bar.vue';
import CreatorGallery from '../components/creator-gallery.vue';
import { defaultLang } from '../utils/localeRoutes';
import { resolveCategoryGroup } from '../utils/catalogCategories';
import { getProductImageUrl } from '../utils/productImages';
import { parseMoq, toPerPiece, getCheapestPricePerPiece } from '../utils/productPricing';

const route = useRoute();
const { t, te, locale } = useI18n();

const currentLang = computed(() => route.params.lang || defaultLang);
const currentCategory = computed(() => route.params.category || 'all');
const currentSlug = computed(() => route.params.productSlug);

const product = ref(null);
const siblings = ref([]);
const projects = ref([]);
const loading = ref(true);
const notFound = ref(false);
const hasLoaded = ref(false);
const currentImageKey = ref(null);

const isThai = computed(() => String(locale.value).toLowerCase() === 'th');

const tProduct = (item, field) => {
    if (!item) return '';
    if (isThai.value) {
        if (field === 'name' && item.name_th) return item.name_th;
        if (field === 'description' && item.description_th) return item.description_th;
        if (field === 'usage' && item.usage_th) return item.usage_th;
        if (field === 'attribute' && item.attribute_th) return item.attribute_th;
    }
    return item[field] || '';
};

// Group keys are camelCase, raw product slugs lowercase; try both before giving up
// and showing the raw value. `te` checks 'en' because it is the complete locale.
const tCategory = (catName) => {
    if (!catName) return '';
    const raw = String(catName).trim();
    if (te(`categories.${raw}`, 'en')) return t(`categories.${raw}`);
    const lower = raw.toLowerCase();
    if (te(`categories.${lower}`, 'en')) return t(`categories.${lower}`);
    return catName;
};

// ── Loading ──────────────────────────────────────────────────────
// The category list gives us the product AND its shelf-mates in one request, so
// related products cost nothing extra and the grid behind us is already warm.
async function loadProduct() {
    loading.value = true;
    notFound.value = false;
    try {
        const group = resolveCategoryGroup(currentCategory.value);
        let list;
        if (!group || group.key === 'all') {
            list = await api.getProducts(null);
        } else {
            const lists = await Promise.all(group.slugs.map(s => api.getProducts(s)));
            const seen = new Set();
            list = lists.flat().filter(p => !seen.has(p.id) && seen.add(p.id));
        }

        let found = list.find(p => p.slug === currentSlug.value);

        // A product can be reached under a category it no longer belongs to (an
        // old link, or a category edit). Fall back to the full catalog before
        // calling it missing.
        if (!found && group && group.key !== 'all') {
            list = await api.getProducts(null);
            found = list.find(p => p.slug === currentSlug.value);
        }

        if (!found) {
            product.value = null;
            siblings.value = [];
            projects.value = [];
            notFound.value = true;
            return;
        }

        product.value = found;
        siblings.value = list;

        // Editorial posts that link this product. Failing to load them must not
        // take the whole page down — they are a bonus, not the point.
        try {
            projects.value = await api.getProjects({ productId: found.id });
        } catch {
            projects.value = [];
        }
    } catch (error) {
        console.error('Error loading product:', error);
        notFound.value = true;
    } finally {
        loading.value = false;
        hasLoaded.value = true;
    }
}

onServerPrefetch(loadProduct);
onMounted(() => { if (!hasLoaded.value) loadProduct(); });
watch(() => route.params.productSlug, (slug) => {
    if (!slug) return;
    currentImageKey.value = null;
    loadProduct();
});

// ── Gallery ──────────────────────────────────────────────────────
const galleryImageKeys = computed(() => {
    if (!product.value) return [];
    const keys = [product.value.image_key];
    (product.value.images || []).forEach(img => {
        if (img.image_key) keys.push(img.image_key);
    });
    return keys.filter(Boolean);
});

const activeImageKey = computed(() => currentImageKey.value || product.value?.image_key);

const setMainImage = (key) => { currentImageKey.value = key; };

const navigateImage = (step) => {
    const keys = galleryImageKeys.value;
    if (keys.length <= 1) return;
    let index = keys.indexOf(activeImageKey.value);
    if (index === -1) index = 0;
    currentImageKey.value = keys[(index + step + keys.length) % keys.length];
};

// Cursor-following zoom on the main image.
const ZOOM_SCALE = 2.2;
const isZooming = ref(false);
const zoomOrigin = ref('50% 50%');

const handleZoomMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 80;
    const y = ((e.clientY - rect.top) / rect.height) * 80;
    zoomOrigin.value = `${Math.max(0, Math.min(80, x))}% ${Math.max(0, Math.min(80, y))}%`;
};

// ── Pricing ──────────────────────────────────────────────────────
// A variant_link image carries its own price_1..5, which override the base
// product's tiers while that image is the one on screen.
const displayPrice = computed(() => {
    const p = product.value;
    if (!p) return {};
    const match = currentImageKey.value
        ? (p.images || []).find(img => img.image_key === currentImageKey.value && img.attribute_type === 'variant_link')
        : null;
    const hasOverride = match && [match.price_1, match.price_2, match.price_3, match.price_4, match.price_5]
        .some(v => v !== null && v !== undefined);
    if (hasOverride) {
        return { price_1: match.price_1, price_2: match.price_2, price_3: match.price_3, variantLabel: match.attribute_value || null };
    }
    return { price_1: p.price_1, price_2: p.price_2, price_3: p.price_3, variantLabel: null };
});

// Customers are quoted per piece, never the raw box price.
const displayPricePerPiece = computed(() => {
    const moq = parseMoq(product.value?.moq);
    return {
        price_1: toPerPiece(displayPrice.value.price_1, moq),
        price_2: toPerPiece(displayPrice.value.price_2, moq),
        price_3: toPerPiece(displayPrice.value.price_3, moq)
    };
});

// Usage is stored as JSON ([{type, example}]); older rows still hold the legacy
// comma-separated list, which we fall back to (no example text).
const usageEntries = computed(() => {
    const raw = tProduct(product.value, 'usage');
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed.filter(e => e && e.type).map(e => ({ type: e.type, example: e.example || '' }));
        }
    } catch {
        // Legacy comma-separated list
    }
    return raw.split(',').map(s => s.trim()).filter(Boolean).map(type => ({ type, example: '' }));
});

// Clicking a variety/size/color tag jumps the gallery to the matching image.
const handleAttributeClick = (type, value) => {
    const match = (product.value?.images || []).find(img =>
        img.attribute_type === type &&
        img.attribute_value?.trim().toLowerCase() === value.trim().toLowerCase()
    );
    if (match) currentImageKey.value = match.image_key;
};

const hasAnyDetail = computed(() =>
    Boolean(tProduct(product.value, 'description') || tProduct(product.value, 'attribute') ||
        usageEntries.value.length || tProduct(product.value, 'varieties') ||
        tProduct(product.value, 'sizes') || tProduct(product.value, 'colors'))
);

// ── Related products ─────────────────────────────────────────────
// Category overlap, not purchase history: honest about what it knows. Falls back
// to the primary category when a product has no multi-category rows.
const relatedProducts = computed(() => {
    const p = product.value;
    if (!p) return [];
    const own = new Set([...(p.categories || []), p.category].filter(Boolean));
    return siblings.value
        .filter(other => Number(other.id) !== Number(p.id))
        .filter(other => [...(other.categories || []), other.category]
            .some(c => c && own.has(c)))
        .slice(0, 6);
});

// ── Editorial ────────────────────────────────────────────────────
// A post with a video is a tutorial; the rest are inspiration. Same table, split
// on the one field that actually distinguishes them.
const tutorials = computed(() => projects.value.filter(p => p.video_url));
const inspiration = computed(() => projects.value.filter(p => !p.video_url));

const tp = (project, field) => {
    if (!project) return '';
    if (isThai.value && project[`${field}_th`]) return project[`${field}_th`];
    return project[field] || '';
};

// ── SEO ──────────────────────────────────────────────────────────
const truncateMetaDescription = (text, maxLength = 160) => {
    if (!text) return '';
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= maxLength) return cleaned;
    return `${cleaned.slice(0, maxLength - 1).trim()}…`;
};

const seoTitle = computed(() => {
    const storeName = isThai.value ? 'กิจเจริญ สำเพ็ง' : 'Kitcharoen Sampeng Market';
    if (!product.value) return undefined;
    return `${tProduct(product.value, 'name')} | ${storeName}`;
});

const seoDescription = computed(() => {
    if (!product.value) return '';
    const description = tProduct(product.value, 'description');
    if (description) return truncateMetaDescription(description);
    const prodName = tProduct(product.value, 'name');
    return isThai.value
        ? `ซื้อ ${prodName} ออนไลน์ อุปกรณ์เย็บปักถักร้อยและวัสดุงานฝีมือคุณภาพสูงจากตลาดสำเพ็ง ราคาเป็นกันเอง`
        : `Buy ${prodName} online. High-quality sewing, tailoring, and craft supplies from Bangkok's Sampeng Market.`;
});

useHead(() => ({
    ...(seoTitle.value ? { title: seoTitle.value } : {}),
    meta: product.value
        ? [{ name: 'description', content: seoDescription.value, key: 'description' }]
        : []
}));

// ── Add to order ─────────────────────────────────────────────────
const productForCart = ref(null);

// Home / Products / Category / Product. Drawn here rather than in CatalogPage
// because the product's name only exists once this view has loaded it.
const crumbs = computed(() => {
    const items = [
        { label: t('nav.home'), to: { name: 'home', params: { lang: currentLang.value } } },
        { label: t('nav.products'), to: { name: 'catalog', params: { lang: currentLang.value, category: 'all' } } },
        {
            label: tCategory(currentCategory.value),
            to: { name: 'catalog', params: { lang: currentLang.value, category: currentCategory.value } }
        }
    ];
    if (product.value) items.push({ label: tProduct(product.value, 'name') });
    return items;
});
</script>

<template>
    <div class="product-page">
        <BreadcrumbBar :items="crumbs" class="product-breadcrumb" />

        <div v-if="loading" class="product-state">
            <div class="loader"></div>
        </div>

        <div v-else-if="notFound" class="product-state">
            <p>{{ $t('catalog.productNotFound') }}</p>
            <router-link
                class="product-cta"
                :to="{ name: 'catalog', params: { lang: currentLang, category: currentCategory } }"
            >{{ $t('catalog.backToCatalog') }}</router-link>
        </div>

        <template v-else-if="product">
            <div class="product-main">
                <!-- Gallery -->
                <div class="product-gallery">
                    <div class="main-image-display">
                        <button v-if="galleryImageKeys.length > 1" class="image-nav prev"
                            @click="navigateImage(-1)" aria-label="Previous image">
                            <ion-icon name="chevron-back-outline"></ion-icon>
                        </button>
                        <div class="zoom-frame" @mouseenter="isZooming = true" @mousemove="handleZoomMove"
                            @mouseleave="isZooming = false; zoomOrigin = '50% 50%'">
                            <img :src="getProductImageUrl(activeImageKey)" :alt="tProduct(product, 'name')"
                                :style="{ transformOrigin: zoomOrigin, transform: isZooming ? `scale(${ZOOM_SCALE})` : 'scale(1)' }">
                        </div>
                        <button v-if="galleryImageKeys.length > 1" class="image-nav next"
                            @click="navigateImage(1)" aria-label="Next image">
                            <ion-icon name="chevron-forward-outline"></ion-icon>
                        </button>
                    </div>

                    <div class="gallery-thumbnails" v-if="product.images && product.images.length > 0">
                        <div class="thumb" :class="{ active: activeImageKey === product.image_key }"
                            @click="setMainImage(product.image_key)">
                            <img :src="getProductImageUrl(product.image_key, 'thumb')" alt="Main">
                        </div>
                        <div v-for="img in product.images" :key="img.id" class="thumb"
                            :class="{ active: activeImageKey === img.image_key }"
                            @click="setMainImage(img.image_key)">
                            <img :src="getProductImageUrl(img.image_key, 'thumb')" :alt="img.attribute_value || 'Gallery'">
                        </div>
                    </div>
                </div>

                <!-- Details -->
                <div class="product-details">
                    <span class="product-category">{{ tCategory(product.category) }}</span>
                    <!-- The page's h1. The category heading is gone on this view. -->
                    <h1 class="product-title">{{ tProduct(product, 'name') }}</h1>

                    <div class="detail-section price-section"
                        v-if="displayPrice.price_1 || displayPrice.price_2 || displayPrice.price_3">
                        <h2 class="detail-heading">
                            <ion-icon name="pricetags-outline"></ion-icon>
                            {{ $t('catalog.pricing') }}<span v-if="displayPrice.variantLabel"> ({{ displayPrice.variantLabel }})</span>
                        </h2>
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
                        <p class="product-moq" v-if="product.moq">{{ $t('catalog.moq') }}: {{ product.moq }}</p>
                    </div>

                    <button class="add-btn add-btn-lg" @click="productForCart = product">
                        <ion-icon name="cart"></ion-icon> {{ $t('catalog.addToOrder') }}
                    </button>

                    <p class="product-description" v-if="tProduct(product, 'description')">
                        {{ tProduct(product, 'description') }}
                    </p>

                    <div class="detail-section attribute-row" v-if="tProduct(product, 'attribute')">
                        <p class="detail-text">{{ $t('catalog.attribute') }} : {{ tProduct(product, 'attribute') }}</p>
                    </div>

                    <div class="detail-section" v-if="usageEntries.length > 0">
                        <h2 class="detail-heading">
                            <ion-icon name="hammer-outline"></ion-icon>
                            {{ $t('catalog.howItsUsed') }}
                        </h2>
                        <ul class="usage-list">
                            <li v-for="entry in usageEntries" :key="entry.type">
                                {{ entry.type }}<span v-if="entry.example"> : {{ entry.example }}</span>
                            </li>
                        </ul>
                    </div>

                    <div class="detail-section" v-if="tProduct(product, 'varieties')">
                        <h2 class="detail-heading">
                            <ion-icon name="grid-outline"></ion-icon>
                            {{ $t('catalog.varieties') }}
                        </h2>
                        <div class="tags-container">
                            <span v-for="variety in tProduct(product, 'varieties').split(',')" :key="variety"
                                class="tag" @click="handleAttributeClick('variety', variety)">{{ variety.trim() }}</span>
                        </div>
                    </div>

                    <div class="detail-section" v-if="tProduct(product, 'sizes')">
                        <h2 class="detail-heading">
                            <ion-icon name="resize-outline"></ion-icon>
                            {{ $t('catalog.availableSizes') }}
                        </h2>
                        <div class="tags-container">
                            <span v-for="size in tProduct(product, 'sizes').split(',')" :key="size"
                                class="tag size-tag" @click="handleAttributeClick('size', size)">{{ size.trim() }}</span>
                        </div>
                    </div>

                    <div class="detail-section" v-if="tProduct(product, 'colors')">
                        <h2 class="detail-heading">
                            <ion-icon name="color-palette-outline"></ion-icon>
                            {{ $t('catalog.availableColors') }}
                        </h2>
                        <div class="tags-container">
                            <span v-for="color in tProduct(product, 'colors').split(',')" :key="color"
                                class="tag color-tag" @click="handleAttributeClick('color', color)">{{ color.trim() }}</span>
                        </div>
                    </div>

                    <p v-if="!hasAnyDetail" class="no-details-message">
                        {{ $t('catalog.noAdditionalDetails') }}
                    </p>
                </div>
            </div>

            <!-- Tutorial: a linked post that carries a video. -->
            <section v-if="tutorials.length" class="product-section">
                <h2 class="product-section-title">{{ $t('catalog.tutorialTitle') }}</h2>
                <div class="editorial-grid">
                    <router-link v-for="post in tutorials" :key="post.id" class="editorial-card"
                        :to="{ name: 'project', params: { lang: currentLang, slug: post.slug } }">
                        <div class="editorial-cover">
                            <img v-if="post.cover_image_key" :src="getProjectImageUrl(post.cover_image_key)" :alt="tp(post, 'title')">
                            <span class="editorial-play"><ion-icon name="play-circle-outline"></ion-icon></span>
                        </div>
                        <div class="editorial-info">
                            <span class="editorial-title">{{ tp(post, 'title') }}</span>
                            <span class="editorial-link">{{ $t('projects.readTutorial') }}</span>
                        </div>
                    </router-link>
                </div>
            </section>

            <!-- Project inspiration: what other people made with this. -->
            <section v-if="inspiration.length" class="product-section">
                <h2 class="product-section-title">{{ $t('catalog.inspirationTitle') }}</h2>
                <div class="editorial-grid">
                    <router-link v-for="post in inspiration" :key="post.id" class="editorial-card"
                        :to="{ name: 'project', params: { lang: currentLang, slug: post.slug } }">
                        <div class="editorial-cover">
                            <img v-if="post.cover_image_key" :src="getProjectImageUrl(post.cover_image_key)" :alt="tp(post, 'title')">
                        </div>
                        <div class="editorial-info">
                            <span class="editorial-title">{{ tp(post, 'title') }}</span>
                            <span v-if="tp(post, 'excerpt')" class="editorial-excerpt">{{ tp(post, 'excerpt') }}</span>
                        </div>
                    </router-link>
                </div>
            </section>

            <!-- Customer gallery: the same `gallery` rows the KitCraft page shows,
                 narrowed to the ones that credit this product. The component drops
                 itself when no photo names this product, which is most of them
                 today — so there is no wrapper here to leave an empty band. -->
            <CreatorGallery
                class="product-section"
                :product-id="product.id"
                title-key="catalog.customerGalleryTitle"
                subtitle-key=""
                :show-submit-prompt="false"
                bare
            />

            <!-- Related products -->
            <section v-if="relatedProducts.length" class="product-section">
                <h2 class="product-section-title">{{ $t('catalog.relatedTitle') }}</h2>
                <div class="related-grid">
                    <router-link v-for="item in relatedProducts" :key="item.id" class="related-card"
                        :to="{ name: 'catalog', params: { lang: currentLang, category: item.category, productSlug: item.slug } }">
                        <img :src="getProductImageUrl(item.image_key, 'thumb')" :alt="tProduct(item, 'name')">
                        <div class="related-info">
                            <span class="related-name">{{ tProduct(item, 'name') }}</span>
                            <span v-if="getCheapestPricePerPiece(item)" class="related-price">
                                ฿{{ getCheapestPricePerPiece(item).toFixed(2) }} / {{ $t('catalog.piece') }}
                            </span>
                        </div>
                    </router-link>
                </div>
            </section>

            <router-link class="product-cta"
                :to="{ name: 'catalog', params: { lang: currentLang, category: currentCategory } }">
                <ion-icon name="arrow-back-outline"></ion-icon>
                {{ $t('catalog.backToCatalog') }}
            </router-link>
        </template>

        <AddToOrderModal :product="productForCart" @close="productForCart = null" />
    </div>
</template>

<style scoped>
.product-page {
    background: #FBF7F2;
    padding: 0 clamp(12px, 5%, 48px) 60px;
}

/* Cancel the page gutter so the breadcrumb's bottom rule spans full width, the
   same as it does on the catalog grid. */
.product-breadcrumb {
    margin: 0 calc(-1 * clamp(12px, 5%, 48px)) 0;
}

.product-state {
    max-width: 700px;
    margin: 0 auto;
    padding: 90px 20px;
    text-align: center;
    color: #8b6f47;
    font-weight: 600;
}

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
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* ── Main two-column block ───────────────────────────── */
.product-main {
    display: grid;
    grid-template-columns: 3fr 2fr;
    gap: 0;
    max-width: 1400px;
    margin: 0 auto;
    background: #fff;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.product-gallery {
    background: #f8f8f8;
    display: flex;
    flex-direction: column;
    padding: 40px;
}

.main-image-display {
    position: relative;
    width: 100%;
    height: 440px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 24px;
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

.image-nav:hover ion-icon { color: white; }
.image-nav ion-icon { font-size: 24px; color: #2d2d2d; }
.image-nav.prev { left: 0; }
.image-nav.next { right: 0; }

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

/* ── Details column ──────────────────────────────────── */
.product-details {
    padding: 40px;
}

.product-category {
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

.product-title {
    font-family: 'ZCOOL XiaoWei', serif;
    font-size: 1.6rem;
    font-weight: 700;
    color: #2d2d2d;
    margin: 0 0 20px 0;
    line-height: 1.25;
}

.detail-section {
    padding-bottom: 14px;
    margin-bottom: 14px;
    border-bottom: 1px solid #eee;
}

.attribute-row {
    display: flex;
    justify-content: flex-end;
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
}

.price-tiers {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
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

.price-tier-note {
    font-size: 12px;
    font-weight: 600;
    color: #8b6f47;
    text-transform: uppercase;
    letter-spacing: 0.3px;
}

.product-moq {
    margin: 12px 0 0;
    font-size: 12.5px;
    color: #9e8272;
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

.add-btn-lg {
    width: 100%;
    justify-content: center;
    padding: 14px;
    font-size: 0.95rem;
    font-weight: 600;
    margin-bottom: 20px;
}

.add-btn:hover {
    background: #006666;
    transform: scale(1.02);
}

.product-description {
    font-size: 16px;
    color: #666;
    line-height: 1.7;
    text-align: justify;
    margin: 0 0 14px;
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
    cursor: pointer;
}

.size-tag { background: #e3f2fd; color: #1976d2; }
.color-tag { background: #fff3e0; color: #f57c00; }

.usage-list {
    margin: 0;
    padding-left: 24px;
}

.usage-list li {
    font-size: 15px;
    color: #555;
    line-height: 1.7;
}

.usage-list li::marker { color: #8b6f47; }

.no-details-message {
    padding: 20px 0;
    text-align: center;
    color: #999;
    font-style: italic;
    margin: 0;
}

/* ── Sections below the fold ─────────────────────────── */
.product-section {
    max-width: 1400px;
    margin: 40px auto 0;
}

.product-section-title {
    font-family: 'ZCOOL XiaoWei', serif;
    font-size: 1.5rem;
    color: #35231d;
    margin: 0 0 18px;
}

.editorial-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
    gap: 16px;
}

.editorial-card {
    background: #fff;
    border: 1px solid #efe3d6;
    border-radius: 12px;
    overflow: hidden;
    text-decoration: none;
    color: inherit;
    transition: transform 0.2s, box-shadow 0.2s;
}

.editorial-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 22px rgba(96, 69, 57, 0.12);
}

.editorial-cover {
    position: relative;
    aspect-ratio: 16 / 9;
    background: #f0e9e0;
}

.editorial-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.editorial-play {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 46px;
    color: #fff;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
    pointer-events: none;
}

.editorial-info {
    padding: 12px 14px 16px;
}

.editorial-title {
    display: block;
    font-size: 14.5px;
    font-weight: 600;
    color: #4a3529;
    line-height: 1.35;
    margin-bottom: 5px;
}

.editorial-excerpt {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-size: 13px;
    color: #7a6355;
    line-height: 1.5;
}

.editorial-link {
    font-size: 12.5px;
    font-weight: 600;
    color: #C4694E;
}

.related-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 14px;
}

.related-card {
    background: #fff;
    border: 1px solid #f1f2f6;
    border-radius: 12px;
    overflow: hidden;
    text-decoration: none;
    color: inherit;
    transition: transform 0.2s, box-shadow 0.2s;
}

.related-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 26px rgba(0, 0, 0, 0.08);
}

.related-card img {
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    display: block;
}

.related-info {
    padding: 10px 12px 14px;
}

.related-name {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-size: 13px;
    font-weight: 500;
    color: #2d3436;
    line-height: 1.35;
    margin-bottom: 5px;
}

.related-price {
    font-size: 12.5px;
    font-weight: 700;
    color: #ee4d2d;
}

.product-cta {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin-top: 36px;
    padding: 11px 24px;
    background: #604539;
    color: #fff;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
    transition: background 0.2s, transform 0.2s;
}

.product-cta:hover {
    background: #8b6f47;
    transform: translateY(-2px);
}

/* ── Responsive ──────────────────────────────────────── */
@media (max-width: 900px) {
    .product-main {
        grid-template-columns: 1fr;
    }

    .product-gallery {
        padding: 20px;
    }

    .main-image-display {
        height: 300px;
    }

    .product-details {
        padding: 24px 20px 32px;
    }

    .product-title {
        font-size: 1.3rem;
    }
}
</style>
