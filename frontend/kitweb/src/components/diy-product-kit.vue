<script setup>
import { ref, onMounted, onServerPrefetch, computed } from 'vue';
import { api, getDiyImageUrl } from '../services/api';
import { cartStore } from '../stores/cartStore';
import { useI18n } from 'vue-i18n';
import { useRouter, useRoute } from 'vue-router';
import translationStore from '../stores/translationStore';
import { codeToPath, defaultLang } from '@/utils/localeRoutes';

const { locale, t } = useI18n();
const router = useRouter();
const route = useRoute();
const currentLang = computed(() => route.params.lang || defaultLang);

const diyProducts = ref([]);
const isLoading = ref(true);
const hasLoaded = ref(false);

const selectedProduct = ref(null);
const showDetailsPopup = ref(false);
const activeImageIndex = ref(0);

const openDetailsPopup = (product) => {
    selectedProduct.value = product;
    activeImageIndex.value = 0;
    showDetailsPopup.value = true;
};

const closeDetailsPopup = () => {
    selectedProduct.value = null;
    showDetailsPopup.value = false;
};

const loadDiyProducts = async () => {
    try {
        isLoading.value = true;
        diyProducts.value = await api.getDiyProducts();
        hasLoaded.value = true;
    } catch (error) {
        console.error('Failed to load DIY products:', error);
    } finally {
        isLoading.value = false;
    }
};

onServerPrefetch(loadDiyProducts);

onMounted(() => {
    if (!hasLoaded.value && diyProducts.value.length === 0) {
        loadDiyProducts();
    }
});

const tProduct = (item, field) => {
    if (!item) return '';
    const lang = locale.value.toLowerCase();

    // 1. Manual Thai Name Priority if provided
    const thField = `${field}_th`;
    if (lang === 'th' && item[thField]) {
        return item[thField];
    }

    // 2. Auto-translation for metadata fields (name, description)
    const autoFields = ['name', 'description'];
    if (autoFields.includes(field) && lang !== 'en') {
        const text = item[field];
        if (text) {
            translationStore.getTranslation(`diy-${item.id}`, field, text, lang);
            const key = `diy-${item.id}-${field}-${lang}`;
            return translationStore.translations[key] || text; // Show original while loading
        }
    }

    return item[field] || '';
};

const handleAddToCart = (product) => {
    const cartProduct = {
        id: `diy-${product.id}`, // Scope prefixed ID to prevent collision in cart
        name: product.name,
        name_th: product.name_th,
        price: product.price_1, // Display Level 1 price as requested by user
        image_key: product.images && product.images.length > 0 ? product.images[0] : '',
        category: 'DIY Kit',
        sku: product.sku
    };

    cartStore.addToCart(cartProduct, { size: 'Default', color: 'Default' });
    alert(`${tProduct(product, 'name')} added to cart!`);
    router.push({ name: 'orderpage', params: { lang: currentLang } });
};
</script>

<template>
    <section class="diy-kits-section">
        <div class="container">

            <div class="kits-grid">
                <div v-if="isLoading" class="loading-state"
                    style="grid-column: 1/-1; text-align: center; padding: 60px 0;">
                    <div class="loader"></div>
                    <p style="color: #6b5d54; font-weight: 600; margin-top: 15px;">Loading DIY Kits Collection...</p>
                </div>

                <template v-else-if="diyProducts.length > 0">
                    <div v-for="(product, index) in diyProducts" :key="product.id" class="kit-card" v-reveal
                        :style="{ animationDelay: (index * 0.15) + 's' }" @click="openDetailsPopup(product)"
                        style="cursor: pointer;">

                        <div class="kit-image-wrapper">
                            <img :src="getDiyImageUrl(product.images && product.images.length > 0 ? product.images[0] : '', 'large')"
                                :alt="tProduct(product, 'name')" class="kit-image" />
                            <div class="kit-badge beginner">
                                DIY KIT
                            </div>
                        </div>

                        <div class="kit-content">
                            <div class="kit-header" style="display: block; margin-bottom: 12px; text-align: left;">
                                <h3 class="kit-name" style="margin: 0;">{{ tProduct(product, 'name') }}</h3>
                                <p class="kit-description">{{ tProduct(product, 'description') }}</p>
                                <div style="display: flex; justify-content: right; align-items: center;">
                                    <span style="font-size: 22px; color: #2D241E; font-weight: 800;">฿{{ product.price_1
                                    }}</span>
                                </div>
                            </div>


                            <div class="kit-features"
                                style="margin-top: auto; border-top: 1px solid #E8E2DD; padding-top: 15px;">
                                <div class="feature">
                                    <ion-icon name="ribbon-outline"></ion-icon>
                                    <span>Premium Quality</span>
                                </div>
                            </div>

                            <button class="kit-btn" @click.stop="handleAddToCart(product)">
                                <ion-icon name="cart-outline"></ion-icon>
                                {{ $t('catalog.addToOrder') || 'Add to Order Cart' }}
                            </button>
                        </div>
                    </div>
                </template>
                <div v-else class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 60px 0;">
                    <p style="color: #6b5d54; font-size: 16px; font-weight: 600;">No DIY Kits currently available in the
                        showcase.</p>
                </div>
            </div>
        </div>

        <!-- DIY Product Details Popup Modal -->
        <transition name="fade">
            <div v-if="showDetailsPopup && selectedProduct" class="modal-overlay" @click.self="closeDetailsPopup">
                <div class="modal-card">
                    <button class="modal-close-btn" @click="closeDetailsPopup">
                        <ion-icon name="close-outline"></ion-icon>
                    </button>

                    <div class="modal-body-layout">
                        <!-- Left Side: Dynamic Gallery -->
                        <div class="modal-gallery-side">
                            <div class="main-image-box">
                                <img :src="getDiyImageUrl(selectedProduct.images && selectedProduct.images.length > 0 ? selectedProduct.images[activeImageIndex] : '', 'large')"
                                    :alt="tProduct(selectedProduct, 'name')" />
                            </div>
                            <!-- Thumbnails list -->
                            <div v-if="selectedProduct.images && selectedProduct.images.length > 1"
                                class="thumbnail-row">
                                <div v-for="(img, idx) in selectedProduct.images" :key="idx"
                                    :class="['thumbnail-box', { active: activeImageIndex === idx }]"
                                    @click="activeImageIndex = idx">
                                    <img :src="getDiyImageUrl(img, 'thumb')" alt="thumbnail" />
                                </div>
                            </div>
                        </div>

                        <!-- Right Side: Details and Cart -->
                        <div class="modal-details-side">
                            <span class="modal-tag">DIY Special Kit</span>
                            <h2 class="modal-product-name">{{ tProduct(selectedProduct, 'name') }}</h2>

                            <div class="modal-price-row">
                                <span class="price-val">฿{{ selectedProduct.price_1 }}</span>
                            </div>

                            <div class="modal-description-box">
                                <label>Description</label>
                                <p>{{ tProduct(selectedProduct, 'description') }}</p>
                            </div>

                            <div class="modal-sku-box"
                                style="margin-top: 15px; font-size: 13px; color: #8b6f47; font-weight: 700;">
                                <span>SKU: {{ selectedProduct.sku }}</span>
                            </div>

                            <button class="modal-buy-btn" @click="handleAddToCart(selectedProduct)">
                                <ion-icon name="cart-outline"></ion-icon>
                                {{ $t('catalog.addToOrder') || 'Add to Order Cart' }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </transition>
    </section>
</template>

<style scoped>
.diy-kits-section {
    padding: 20px 5% 100px 5%;
    background-color: #FDF3E6;
    position: relative;
    overflow: hidden;
}

.container {
    max-width: 1300px;
    margin: 0 auto;
}



/* Grid Layout */
.kits-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    max-width: 1300px;
    margin: 0 auto;
    padding: 0 5%;
}

/* Card Design */
.kit-card {
    background: #FFFAF6;
    border-radius: 24px;
    overflow: hidden;
    transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
    border: 1px solid #F3EEEA;
    display: flex;
    flex-direction: column;
    /* max-width: 320px; */
    width: 100%;
    margin: 0 auto;
}

.kit-card:hover {
    transform: translateY(-12px);
    box-shadow: 0 25px 50px -12px rgba(84, 61, 47, 0.15);
    border-color: #00666633;
}

.kit-image-wrapper {
    position: relative;
    width: 100%;
    aspect-ratio: 1 / 1;
    overflow: hidden;
}

.kit-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.6s ease;
}

.kit-card:hover .kit-image {
    transform: scale(1.08);
}

.kit-badge {
    position: absolute;
    top: 20px;
    right: 20px;
    padding: 8px 18px;
    background: white;
    border-radius: 50px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #2D241E;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.kit-badge.beginner {
    color: #006666;
}

.kit-badge.intermediate {
    color: #8b6f47;
}

.kit-content {
    padding: 1rem 2rem 2rem 2rem;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
}

.kit-header {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 5px;

}

.kit-name {
    font-family: 'ZCOOL XiaoWei', serif;
    font-size: 26px;
    color: #2D241E;
    flex: 1;
}

.kit-description {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 15px;
    color: #6B5D54;
    line-height: 1.6;
    margin: 0;
    flex-grow: 1;
}

.kit-features {
    display: flex;
    gap: 25px;
    margin-bottom: 30px;
    padding-top: 20px;
    border-top: 1px solid #E8E2DD;
}

.feature {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    font-weight: 600;
    color: #A0948C;
}

.feature ion-icon {
    font-size: 18px;
    color: #8b6f47;
}

.kit-btn {
    width: 100%;
    padding: 18px;
    background: transparent;
    border: 1px solid #006666;
    border-radius: 50px;
    color: #006666;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    transition: all 0.3s ease;
}

.kit-card:hover .kit-btn {
    background: #006666;
    color: white;
}

@media (max-width: 768px) {


    .desktop-only {
        display: none;
    }

    .kits-grid {
        grid-template-columns: 1fr;
    }
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

/* Modal overlay styling */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(45, 36, 30, 0.6);
    backdrop-filter: blur(8px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
    padding: 20px;
}

/* Modal card layout */
.modal-card {
    background: #FFFAF6;
    border-radius: 28px;
    width: 100%;
    max-width: 850px;
    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.25);
    position: relative;
    overflow: hidden;
    /* Added back to clip rounded corners and prevent content overflow */
    animation: zoomIn 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
}

@keyframes zoomIn {
    from {
        opacity: 0;
        transform: scale(0.95);
    }

    to {
        opacity: 1;
        transform: scale(1);
    }
}

/* Close button styling */
.modal-close-btn {
    position: absolute;
    top: 20px;
    right: 20px;
    background: #8b6f47;
    /* Set distinct brand color background so it pops! */
    border: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 22px;
    color: white;
    /* White icon on brand color background for maximum visibility */
    box-shadow: 0 4px 12px rgba(139, 111, 71, 0.35);
    transition: all 0.3s ease;
    z-index: 100;
    /* Extremely high z-index to sit on top of everything! */
}

.modal-close-btn:hover {
    background: #2D241E;
    color: white;
    transform: rotate(90deg) scale(1.08);
}

/* Layout split */
.modal-body-layout {
    display: grid;
    grid-template-columns: 1.1fr 1fr;
}

@media (max-width: 850px) {
    .modal-card {
        max-height: 90vh;
        overflow-y: auto;
    }

    .modal-body-layout {
        grid-template-columns: 1fr;
    }

    .modal-close-btn {
        top: 15px;
        right: 15px;
        background: rgba(45, 36, 30, 0.85);
        /* Slightly darker semi-transparent background on mobile so it stands out on images */
    }
}

/* Left side (images) */
.modal-gallery-side {
    background: #F8F4EF;
    padding: 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 0;
    /* Prevents CSS Grid auto-expansion from stretching the column */
}

.main-image-box {
    width: 100%;
    height: 380px;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
    background: white;
}

.main-image-box img {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.thumbnail-row {
    display: flex;
    gap: 12px;
    margin-top: 20px;
    width: 100%;
    max-width: 100%;
    /* Restrict row width to parent container boundaries */
    overflow-x: auto;
    /* Allow horizontal scrolling */
    flex-wrap: nowrap;
    /* Keep all thumbnails on a single row */
    padding-bottom: 8px;
    /* Leave space for scrollbar visual clearance */
    box-sizing: border-box;
}

.thumbnail-box {
    width: 65px;
    height: 65px;
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    border: 2px solid transparent;
    transition: all 0.3s ease;
    flex-shrink: 0;
}

.thumbnail-box.active {
    border-color: #8b6f47;
    transform: translateY(-3px);
}

.thumbnail-box img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* Right side (details) */
.modal-details-side {
    padding: 50px 40px;
    display: flex;
    flex-direction: column;
    min-width: 0;
    /* Prevents details column from being squeezed to zero width */
}

.modal-tag {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #8b6f47;
    margin-bottom: 8px;
}

.modal-product-name {
    font-family: 'ZCOOL XiaoWei', serif;
    font-size: 32px;
    color: #2D241E;
    margin-bottom: 15px;
    line-height: 1.2;
}

.modal-price-row {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 25px;
}

.price-val {
    font-size: 28px;
    font-weight: 800;
    color: #2D241E;
}

.stock-badge {
    background: rgba(46, 204, 113, 0.1);
    color: #2ecc71;
    font-weight: 700;
    padding: 5px 12px;
    border-radius: 30px;
    font-size: 12px;
}

.stock-badge.out-of-stock {
    background: rgba(231, 76, 60, 0.1);
    color: #e74c3c;
}

.modal-description-box {
    flex-grow: 1;
}

.modal-description-box label {
    display: block;
    font-size: 13px;
    font-weight: 700;
    color: #A0948C;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 6px;
}

.modal-description-box p {
    font-size: 15px;
    color: #6B5D54;
    line-height: 1.6;
    word-break: break-word;
    /* Ensure extremely long descriptions wrap gracefully without breaking layouts */
}

.modal-buy-btn {
    width: 100%;
    padding: 18px;
    background: #006666;
    border: none;
    border-radius: 50px;
    color: white;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    transition: all 0.3s ease;
    margin-top: 30px;
    box-shadow: 0 10px 20px rgba(0, 102, 102, 0.2);
}

.modal-buy-btn:hover:not(:disabled) {
    background: #004d4d;
    transform: translateY(-2px);
    box-shadow: 0 15px 30px rgba(0, 102, 102, 0.3);
}

.modal-buy-btn:disabled {
    background: #dcdde1;
    color: #a1a2a6;
    cursor: not-allowed;
    box-shadow: none;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>