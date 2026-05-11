<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, API_URL } from '../services/api';

const route = useRoute();
const router = useRouter();

const products = ref([]);
const loading = ref(true);
const showPopup = ref(false);
const selectedProduct = ref(null);
const sortBy = ref('popular');

const currentCategory = computed(() => route.params.category);

const categoryDescriptions = {
    'Yarns': 'Sourced directly from the vibrant heart of Sampeng Market, our curated selection represents four decades of haberdashery excellence. Every spool is hand-picked for quality and character.',
    'Ribbons': 'Sourced directly from the vibrant heart of Sampeng Market, our curated selection represents four decades of haberdashery excellence. Every ribbon is hand-picked for quality and character.',
    'Threads': 'Sourced directly from the vibrant heart of Sampeng Market, our curated selection represents four decades of haberdashery excellence. Every thread is hand-picked for quality and character.',
    'Needles': 'Precision tools sourced directly from the vibrant heart of Sampeng Market, curated for the modern maker and traditional tailor.',
    'Fabrics': 'Premium materials sourced directly from the vibrant heart of Sampeng Market, hand-picked for quality and character.'
};

const defaultDescription = 'Sourced directly from the vibrant heart of Sampeng Market, our curated selection represents four decades of haberdashery excellence. Every item is hand-picked for quality and character.';

const heroImage = computed(() => {
    if (products.value.length > 0 && products.value[0].image_key) {
        return getImageUrl(products.value[0].image_key);
    }
    return '';
});

onMounted(loadData);
watch(() => route.params.category, loadData);

async function loadData() {
    loading.value = true;
    try {
        if (currentCategory.value) {
            products.value = await api.getProducts(currentCategory.value);
        }
    } catch (error) {
        console.error('Error loading data:', error);
    } finally {
        loading.value = false;
    }
}

const currentImageKey = ref(null);

const handleQuickView = (item) => {
    selectedProduct.value = item;
    currentImageKey.value = item.image_key; // default to main
    showPopup.value = true;
};

const closePopup = () => {
    showPopup.value = false;
    selectedProduct.value = null;
    currentImageKey.value = null;
};

const setMainImage = (key) => {
    currentImageKey.value = key;
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

const getImageUrl = (key) => {
    if (!key) return 'https://m.media-amazon.com/images/I/610a5LpNbTL.jpg';
    return `${API_URL}/images/${key}`;
};

const backToCatalog = () => {
    router.push('/catalog');
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
                    <ion-icon name="arrow-back-outline"></ion-icon> Back to Categories
                </button>
            </div>

            <!-- Hero Section -->
            <div class="hero-section">
                <div class="hero-text">
                    <div class="since-badge">
                        <ion-icon name="star"></ion-icon> SINCE 1984
                    </div>
                    <h1 class="hero-title">{{ currentCategory }} Collection</h1>
                    <p class="hero-desc">{{ categoryDescriptions[currentCategory] || defaultDescription }}</p>
                </div>
                <div class="hero-image-container">
                    <img v-if="heroImage" :src="heroImage" alt="Category Hero" />
                    <div v-else class="hero-placeholder"></div>
                </div>
            </div>
        </div>

        <!-- Controls Section -->
        <div class="controls-section">
            <div class="product-count">
                Showing {{ products.length }} products
            </div>
            <div class="sort-control">
                <label>Sort by:</label>
                <select v-model="sortBy">
                    <option value="popular">Most Popular</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="name">Name</option>
                </select>
            </div>
        </div>

        <!-- Product Grid -->
        <div class="product-grid">
            <div v-for="item in sortedProducts" :key="item.id" class="product-card" @click="handleQuickView(item)">
                <div class="card-image">
                    <div class="badge" v-if="item.price_1">ARTISAN CHOICE</div>
                    <img :src="getImageUrl(item.image_key)" :alt="item.name">
                </div>
                <div class="card-content">
                    <h3 class="card-title">{{ item.name }}</h3>
                    <p class="card-desc">{{ item.description || 'Premium quality material sourced for the modern maker.'
                        }}</p>
                    <div class="card-footer">
                        <button class="add-btn" @click.stop="handleQuickView(item)">
                            <ion-icon name="cart"></ion-icon> Add to Order
                        </button>
                    </div>
                </div>
            </div>
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
                            <img :src="getImageUrl(currentImageKey || selectedProduct.image_key)" :alt="selectedProduct.name">
                        </div>

                        <!-- Gallery Thumbnails -->
                        <div class="gallery-thumbnails" v-if="selectedProduct.images && selectedProduct.images.length > 0">
                            <div class="thumb" 
                                 :class="{ active: currentImageKey === selectedProduct.image_key || !currentImageKey }"
                                 @click="setMainImage(selectedProduct.image_key)">
                                <img :src="getImageUrl(selectedProduct.image_key)" alt="Main">
                            </div>
                            <div v-for="img in selectedProduct.images" :key="img.id" 
                                 class="thumb"
                                 :class="{ active: currentImageKey === img.image_key }"
                                 @click="setMainImage(img.image_key)">
                                <img :src="getImageUrl(img.image_key)" :alt="img.attribute_value || 'Gallery'">
                            </div>
                        </div>
                    </div>

                    <div class="popup-details">
                        <div class="popup-info-header">
                            <span class="popup-category">{{ selectedProduct.category }}</span>
                            <h2 class="popup-title">{{ selectedProduct.name }}</h2>
                        </div>
                        <p class="popup-description">{{ selectedProduct.description }}</p>

                        <div class="detail-section" v-if="selectedProduct.usage">
                            <h3 class="detail-heading">
                                <ion-icon name="hammer-outline"></ion-icon>
                                How It's Used
                            </h3>
                            <p class="detail-text">{{ selectedProduct.usage }}</p>
                        </div>

                        <div class="detail-section" v-if="selectedProduct.use_for">
                            <h3 class="detail-heading">
                                <ion-icon name="checkmark-circle-outline"></ion-icon>
                                What It's For
                            </h3>
                            <p class="detail-text">{{ selectedProduct.use_for }}</p>
                        </div>

                        <div class="detail-section" v-if="selectedProduct.varieties">
                            <h3 class="detail-heading">
                                <ion-icon name="grid-outline"></ion-icon>
                                Varieties
                            </h3>
                            <div class="tags-container">
                                <span v-for="variety in selectedProduct.varieties.split(',')" :key="variety"
                                    class="tag" @click="handleAttributeClick('variety', variety)">
                                    {{ variety.trim() }}
                                </span>
                            </div>
                        </div>

                        <div class="detail-section" v-if="selectedProduct.sizes">
                            <h3 class="detail-heading">
                                <ion-icon name="resize-outline"></ion-icon>
                                Available Sizes
                            </h3>
                            <div class="tags-container">
                                <span v-for="size in selectedProduct.sizes.split(',')" :key="size" class="tag size-tag"
                                    @click="handleAttributeClick('size', size)">
                                    {{ size.trim() }}
                                </span>
                            </div>
                        </div>

                        <div class="detail-section" v-if="selectedProduct.colors">
                            <h3 class="detail-heading">
                                <ion-icon name="color-palette-outline"></ion-icon>
                                Available Colors
                            </h3>
                            <div class="tags-container">
                                <span v-for="color in selectedProduct.colors.split(',')" :key="color"
                                    class="tag color-tag" @click="handleAttributeClick('color', color)">
                                    {{ color.trim() }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
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
    display: flex;
    gap: 60px;
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
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding: 5px 2px 15px 2px;
    width: 100%;
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
