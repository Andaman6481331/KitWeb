<script setup>
import { ref, computed, onMounted, onServerPrefetch, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, API_URL } from '../services/api';
import { categoryHeroImages } from '../services/categoryImages';
import { useI18n } from 'vue-i18n';
import { useHead } from '@unhead/vue';
import translationStore from '../stores/translationStore';
import { cartStore } from '../stores/cartStore';
import { codeToPath, defaultLang, localizedRoute } from '@/utils/localeRoutes';

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

    // 1. Manual Thai Name Priority (as requested: "add only thai product name field in product table")
    if (field === 'name' && lang === 'th' && item.name_th) {
        return item.name_th;
    }

    // 2. Auto-translation for metadata fields
    const autoFields = ['description', 'usage', 'use_for', 'varieties', 'sizes', 'colors'];
    if (autoFields.includes(field) && lang !== 'en') {
        const text = item[field];
        if (text) {
            translationStore.getTranslation(item.id, field, text, lang);
            const key = `${item.id}-${field}-${lang}`;
            return translationStore.translations[key] || text; // Show original while loading
        }
    }

    // Default fallback
    return item[field] || '';
};

const tCategory = (catName) => {
    if (!catName) return '';
    const mapping = {
        'yarn': 'Yarn',
        'yarns': 'Yarn',
        'needles': 'Needles',
        'needle': 'Needles',
        'threads': 'Threads',
        'thread': 'Threads',
        'tools': 'Tools',
        'tool': 'Tools',
        'beads': 'Beads',
        'bead': 'Beads',
        'ribbons': 'Ribbons',
        'ribbon': 'Ribbons',
        'buttons': 'Buttons',
        'button': 'Buttons',
        'accessories': 'Accessories',
        'accessory': 'Accessories',
        'artificialflowers': 'ArtificialFlowers',
        'artificialflower': 'ArtificialFlowers',
        'artificial flowers': 'ArtificialFlowers'
    };
    const lower = catName.toLowerCase().trim();
    const key = mapping[lower];
    if (key) {
        return t(`categories.${key}`);
    }
    return t(`categories.${catName}`, catName);
};

const tCategoryDesc = (catName) => {
    if (!catName) return '';
    const mapping = {
        'yarn': 'YarnDesc',
        'yarns': 'YarnDesc',
        'needles': 'NeedlesDesc',
        'needle': 'NeedlesDesc',
        'threads': 'ThreadsDesc',
        'thread': 'ThreadsDesc',
        'tools': 'ToolsDesc',
        'tool': 'ToolsDesc',
        'beads': 'BeadsDesc',
        'bead': 'BeadsDesc',
        'ribbons': 'RibbonsDesc',
        'ribbon': 'RibbonsDesc',
        'buttons': 'ButtonsDesc',
        'button': 'ButtonsDesc',
        'accessories': 'AccessoriesDesc',
        'accessory': 'AccessoriesDesc',
        'artificialflowers': 'ArtificialFlowersDesc',
        'artificialflower': 'ArtificialFlowersDesc',
        'artificial flowers': 'ArtificialFlowersDesc'
    };
    const lower = catName.toLowerCase().trim();
    const key = mapping[lower];
    if (key) {
        return t(`categories.${key}`);
    }
    return t(`categories.${catName}Desc`, t('catalog.categoryDescriptions.Default'));
};

const products = ref([]);
const loading = ref(true);
const hasLoaded = ref(false);
const showPopup = ref(false);
const selectedProduct = ref(null);
const sortBy = ref('popular');

// Cart & Confirmation Modal
const showConfirmModal = ref(false);
const selectedProductForCart = ref(null);
const showNotification = ref(false);
const notificationMessage = ref('');

const currentCategory = computed(() => route.params.category);

const heroImage = computed(() => {
    const catKey = currentCategory.value?.toLowerCase();
    if (catKey && categoryHeroImages[catKey]) {
        return categoryHeroImages[catKey];
    }

    // Fallback to first product image if no manual mapping found
    if (products.value.length > 0 && products.value[0].image_key) {
        return getImageUrl(products.value[0].image_key);
    }
    return '';
});

async function loadData() {
    loading.value = true;
    try {
        if (currentCategory.value) {
            const data = await api.getProducts(currentCategory.value);
            products.value = data.map(p => ({
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

watch(() => route.params.category, () => {
    hasLoaded.value = false;
    loadData();
});

const currentImageKey = ref(null);

const handleQuickView = (item) => {
    router.push({
        name: 'category-products',
        params: {
            lang: currentLang.value,
            category: currentCategory.value,
            productSlug: item.slug
        }
    });
};

const closePopupState = () => {
    showPopup.value = false;
    selectedProduct.value = null;
    currentImageKey.value = null;
};

const closePopup = () => {
    router.push({
        name: 'category-products',
        params: {
            lang: currentLang.value,
            category: currentCategory.value
        }
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

// Cart Logic
const handleAddToCartClick = (item) => {
    selectedProductForCart.value = item;
    showConfirmModal.value = true;
};

const closeConfirmModal = () => {
    showConfirmModal.value = false;
    selectedProductForCart.value = null;
};

const confirmAddToCart = () => {
    if (!selectedProductForCart.value) return;

    const product = selectedProductForCart.value;

    // Default variations (like in OrderPage)
    const sizes = product.sizes ? (typeof product.sizes === 'string' ? product.sizes.split(',').map(s => s.trim()) : product.sizes) : ['Standard'];
    const colors = product.colors ? (typeof product.colors === 'string' ? product.colors.split(',').map(c => c.trim()) : product.colors) : ['Default'];

    const selection = {
        size: sizes[0],
        color: colors[0]
    };

    cartStore.addToCart(product, selection);

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

const backToCatalog = () => {
    router.push(
        localizedRoute(route, 'catalog', { category: currentCategory.value })
    );
};

const sortedProducts = computed(() => {
    let sorted = [...products.value];
    if (sortBy.value === 'price_asc') {
        sorted.sort((a, b) => (a.price_1 || a.price || 0) - (b.price_1 || b.price || 0));
    } else if (sortBy.value === 'price_desc') {
        sorted.sort((a, b) => (b.price_1 || b.price || 0) - (a.price_1 || a.price || 0));
    } else if (sortBy.value === 'name') {
        sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
});
</script>

<template>
    <div class="category-page">
        <div style="background-color: #E5E2DD;">
            <!-- Back Navigation -->
            <div class="nav-container">
                <button class="back-link" @click="backToCatalog">
                    <ion-icon name="arrow-back-outline"></ion-icon> {{ $t('catalog.backToCatalog') }}
                </button>
            </div>

            <!-- Hero Section -->
            <div class="hero-section">
                <div class="hero-text">
                    <div class="since-badge">
                        <ion-icon name="star"></ion-icon> {{ $t('catalog.since') }}
                    </div>
                    <h1 class="hero-title">{{ $t('catalog.collection', { category: tCategory(currentCategory) }) }}</h1>
                    <p class="hero-desc">{{ tCategoryDesc(currentCategory) }}</p>
                </div>
                <div class="hero-image-container">
                    <img v-if="heroImage" :src="heroImage" alt="Category Hero" />
                    <div v-else class="hero-placeholder"></div>
                </div>
            </div>
        </div>

        <div class="controls-section">
            <div class="product-count">
                {{ $t('catalog.showing', { count: products.length }) }}
            </div>
            <div class="sort-control">
                <label>{{ $t('catalog.sortBy') }}</label>
                <select v-model="sortBy">
                    <option value="popular">{{ $t('catalog.sortPopular') }}</option>
                    <option value="price_asc">{{ $t('catalog.sortPriceAsc') }}</option>
                    <option value="price_desc">{{ $t('catalog.sortPriceDesc') }}</option>
                    <option value="name">{{ $t('catalog.sortName') }}</option>
                </select>
            </div>
        </div>

        <!-- Product Grid -->
        <div class="product-grid">
            <router-link 
                v-for="item in sortedProducts" 
                :key="item.id" 
                :to="{ name: 'category-products', params: { lang: currentLang, category: currentCategory, productSlug: item.slug } }"
                class="product-card"
            >
                <div class="card-image">
                    <div class="badge" v-if="item.price_1">{{ $t('catalog.artisanChoice') }}</div>
                    <img :src="getImageUrl(item.image_key)" :alt="tProduct(item, 'name')">
                </div>
                <div class="card-content">
                    <h3 class="card-title">{{ tProduct(item, 'name') }}</h3>
                    <p class="card-desc">{{ tProduct(item, 'description') || $t('catalog.categoryDescriptions.Default')
                        }}</p>
                    <div class="card-footer">
                        <button class="add-btn" @click.prevent.stop="handleAddToCartClick(item)">
                            <ion-icon name="cart"></ion-icon> {{ $t('catalog.addToOrder') }}
                        </button>
                    </div>
                </div>
            </router-link>
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
                            <img :src="getImageUrl(currentImageKey || selectedProduct.image_key)"
                                :alt="tProduct(selectedProduct, 'name')">
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
                        <p class="popup-description" v-if="tProduct(selectedProduct, 'description')">{{ tProduct(selectedProduct, 'description') }}</p>

                        <div class="detail-section" v-if="tProduct(selectedProduct, 'usage')">
                            <h3 class="detail-heading">
                                <ion-icon name="hammer-outline"></ion-icon>
                                {{ $t('catalog.howItsUsed') }}
                            </h3>
                            <p class="detail-text">{{ tProduct(selectedProduct, 'usage') }}</p>
                        </div>

                        <div class="detail-section" v-if="tProduct(selectedProduct, 'use_for')">
                            <h3 class="detail-heading">
                                <ion-icon name="checkmark-circle-outline"></ion-icon>
                                {{ $t('catalog.whatItsFor') }}
                            </h3>
                            <p class="detail-text">{{ tProduct(selectedProduct, 'use_for') }}</p>
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
                        <div v-if="!tProduct(selectedProduct, 'description') && !tProduct(selectedProduct, 'usage') && !tProduct(selectedProduct, 'use_for') && !tProduct(selectedProduct, 'varieties') && !tProduct(selectedProduct, 'sizes') && !tProduct(selectedProduct, 'colors')" class="no-details-message">
                            <p>{{ $t('catalog.noAdditionalDetails') || 'No additional details available for this product.' }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Confirmation Modal -->
        <div v-if="showConfirmModal" class="popup-overlay" @click="closeConfirmModal">
            <div class="confirm-modal" @click.stop v-if="selectedProductForCart">
                <div class="confirm-header">
                    <div class="confirm-icon">🛒</div>
                    <h2>{{ $t('catalog.confirmAddToCart') || 'Add to Order?' }}</h2>
                </div>
                <div class="confirm-body">
                    <div class="confirm-product-info">
                        <img :src="getImageUrl(selectedProductForCart.image_key)"
                            :alt="tProduct(selectedProductForCart, 'name')">
                        <div class="confirm-text">
                            <h3>{{ tProduct(selectedProductForCart, 'name') }}</h3>
                            <p class="category-tag">{{ tCategory(selectedProductForCart.category) }}</p>
                        </div>
                    </div>
                    <p class="confirm-message">
                        {{ $t('catalog.confirmMessage') || 'Would you like to add this item to your order list ? ' }}
                    </p>
                </div>
                <div class="confirm-footer">
                    <button class="btn-cancel" @click="closeConfirmModal">{{ $t('catalog.cancel') || 'Cancel'
                    }}</button>
                    <button class="btn-confirm" @click="confirmAddToCart">
                        {{ $t('catalog.confirm') || 'Yes, Add to Order' }}
                    </button>
                </div>
            </div>
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
    background: #fafafa;
    min-height: 100vh;
    padding-bottom: 60px;
}

.nav-container {
    max-width: 1300px;
    margin: 0 auto;
    padding: 20px 5%;
}

.back-link {
    background: none;
    border: none;
    color: #8b6f47;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
}

.back-link:hover {
    color: #5d4037;
    transform: translateX(-4px);
}

/* HERO SECTION */
.hero-section {
    max-width: 1300px;
    margin: 0 auto;
    padding: 0 5% 50px 5%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px;
    align-items: center;
    margin-bottom: 50px;
    background-color: #E5E2DD;
}


.hero-text {
    flex: 1;
}

.since-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #fdfaf6;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 700;
    color: #5d4037;
    letter-spacing: 1px;
    margin-bottom: 20px;
    border: 1px solid #f0e6d2;
}

.since-badge ion-icon {
    font-size: 14px;
    color: #b89968;
}

.hero-title {
    font-family: 'ZCOOL XiaoWei', serif;
    font-size: 3.5rem;
    color: #35231d;
    margin: 0 0 20px 0;
    line-height: 1.1;
}

.hero-desc {
    font-size: 1.1rem;
    color: #5d4037;
    line-height: 1.8;
    opacity: 0.85;
}

.hero-image-container {
    flex: 1.2;
    height: 400px;
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

.hero-image-container img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.hero-placeholder {
    width: 100%;
    height: 100%;
    background: #e9ecef;
}

/* CONTROLS SECTION */
.controls-section {
    max-width: 1300px;
    margin: 0 auto;
    padding: 20px 5%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    border-bottom: 1px solid #eee;
    padding-bottom: 20px;
}

.product-count {
    color: #636e72;
    font-size: 14px;
    font-weight: 600;
}

.sort-control {
    display: flex;
    align-items: center;
    gap: 10px;
}

.sort-control label {
    font-size: 14px;
    color: #636e72;
    font-weight: 600;
}

.sort-control select {
    border: none;
    background: transparent;
    font-size: 14px;
    font-weight: 600;
    color: #2d3436;
    cursor: pointer;
    outline: none;
    border-bottom: 2px solid transparent;
    padding-bottom: 4px;
    transition: all 0.2s;
}

.sort-control select:hover {
    border-bottom-color: #008080;
}

/* PRODUCT GRID */
.product-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 30px;
    max-width: 1300px;
    margin: 0 auto;
    padding: 0 5%;
}

.product-card {
    background: #fdfcfb;
    border-radius: 16px;
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
    height: 280px;
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
    padding: 24px;
    flex: 1;
    display: flex;
    flex-direction: column;
}

.card-title {
    font-size: 20px;
    color: #2d3436;
    margin: 0 0 10px 0;
    font-weight: 600;
}

.card-desc {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 14px;
    color: #636e72;
    line-height: 1.6;
    margin-bottom: 20px;
    flex: 1;
}

.card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: auto;
}

.card-price {
    display: none;
}

.add-btn {
    background: #008080;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    transition: all 0.2s;
}

.add-btn:hover {
    background: #006666;
    transform: scale(1.05);
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
    border-radius: 20px;
    max-width: 900px;
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
    grid-template-columns: 1fr 1fr;
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
    width: 100%;
    height: 400px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 30px;
}

.main-image-display img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: 12px;
}

.gallery-thumbnails {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(70px, 1fr));
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
    font-size: 28px;
    font-weight: 700;
    color: #2d2d2d;
    margin: 0 0 16px 0;
    line-height: 1.2;
}

.popup-description {
    font-size: 16px;
    color: #666;
    line-height: 1.6;
    margin-bottom: 30px;
}

.detail-section {
    margin-bottom: 28px;
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
    padding-left: 30px;
}

.tag {
    background: #f5f5f5;
    color: #2d2d2d;
    padding: 8px 16px;
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

.confirm-header {
    margin-bottom: 25px;
}

.confirm-icon {
    font-size: 40px;
    margin-bottom: 15px;
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
    margin-bottom: 30px;
}

.confirm-footer {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: 15px;
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

.btn-cancel:hover {
    background: #dfe4ea;
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

@media (max-width: 900px) {

    .product-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .hero-section {
        flex-direction: column;
        text-align: center;
    }

    .since-badge {
        margin: 0 auto 20px auto;
    }

    .hero-image-container {
        width: 100%;
        height: 300px;
    }

    .popup-body {
        grid-template-columns: 1fr;
    }

    .popup-image {
        border-radius: 20px 20px 0 0;
    }
}

@media (max-width: 600px) {
    .product-grid {
        grid-template-columns: 1fr;
    }

    .controls-section {
        flex-direction: column;
        align-items: flex-start;
        gap: 15px;
    }
}
</style>
