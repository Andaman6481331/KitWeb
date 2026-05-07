<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../services/api';

const router = useRouter();

const products = ref([]);
const loading = ref(true);

onMounted(loadData);

async function loadData() {
    loading.value = true;
    try {
        products.value = await api.getProducts();
    } catch (error) {
        console.error('Error loading data:', error);
    } finally {
        loading.value = false;
    }
}

const categoryDescriptions = {
    'Yarns': 'Hand-dyed cotton and northern Thai silk, perfect for weaving stories into every stitch.',
    'Ribbons': 'Bespoke satin and velvet trims, gathered from the finest looms across Southeast Asia.',
    'Threads': 'Industrial strength and artisanal color palettes, crafted for longevity and vibrant detail.',
    'Needles': 'Precision-engineered tools for the traditional tailor and the modern craft enthusiast.',
    'Fabrics': 'Premium linens and heritage weaves, sourced from independent looms and master weavers.',
    'Buttons': 'Hand-carved wood, mother-of-pearl, and signature metal closures for distinct finishes.',
    'Tools': 'Professional-grade shears, needles, and measuring tools for the serious craftsperson.'
};

const categories = computed(() => {
    const categoryMap = new Map();
    products.value.forEach(p => {
        if (!p.category) return;
        if (categoryMap.has(p.category)) {
            categoryMap.get(p.category).count++;
        } else {
            categoryMap.set(p.category, {
                name: p.category,
                count: 1,
                image: p.image_key ? `http://127.0.0.1:8787/images/${p.image_key}` : 'https://m.media-amazon.com/images/I/610a5LpNbTL.jpg',
                description: categoryDescriptions[p.category] || 'Explore our curated selection of high-quality craft materials.'
            });
        }
    });
    // Ensure we show at least the categories in the reference if possible
    // (This part might be tricky if data is dynamic, but we can stick to what we have)
    return Array.from(categoryMap.values());
});

const selectCategory = (categoryName) => {
    router.push(`/catalog/${categoryName}`);
};

// Helper for image URLs
const getImageUrl = (key) => {
    if (!key) return 'https://m.media-amazon.com/images/I/610a5LpNbTL.jpg';
    if (key.startsWith('http')) return key;
    return `http://127.0.0.1:8787/images/${key}`;
};

</script>

<template>
    <!-- Categories View -->
    <section class="stock-sec">
        <div class="category-grid-container">
            <div class="category-list">
                <div v-for="(category, index) in categories" :key="category.name" class="category-card"
                    @click="selectCategory(category.name)" v-reveal :style="{ animationDelay: (index * 0.15) + 's' }">
                    <div class="category-image-wrapper">
                        <img :src="category.image" :alt="category.name" class="category-img">
                    </div>
                    <div class="category-info">
                        <h3 class="category-title-text">{{ category.name }}</h3>
                        <p class="category-description-text">{{ category.description }}</p>
                        <div class="category-action">
                            <span class="shop-now-link">Shop Category <ion-icon
                                    name="arrow-forward-outline"></ion-icon></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
/* ===== NEW CATEGORY GRID STYLES ===== */
.stock-sec {
    padding: 20px 0 50px 0;
    background: #FBF7F2;
}

.category-grid-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 5%;
}

.category-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 40px;
}

.category-card {
    background: #FFFAF6;
    border-radius: 20px;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1), box-shadow 0.4s ease;
    border: 1px solid rgba(139, 111, 71, 0.1);
    display: flex;
    flex-direction: column;
    padding: 0;
}

.category-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 20px 40px rgba(53, 35, 29, 0.08);
}

.category-image-wrapper {
    width: 100%;
    aspect-ratio: 16 / 10;
    overflow: hidden;
    padding: 0;
}

.category-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 20px 20px 0 0;
    transition: transform 0.6s ease;
}

.category-card:hover .category-img {
    transform: scale(1.05);
}

.category-info {
    padding: 30px 40px 40px;
    text-align: left;
}

.category-title-text {
    font-family: 'ZCOOL XiaoWei', serif !important;
    font-size: 2rem;
    color: #3d2b1f;
    margin: 0 0 12px 0;
    font-weight: 600;
}

.category-description-text {
    font-family: 'Work Sans', sans-serif !important;
    font-size: 0.8rem;
    color: #6d5838;
    line-height: 1.6;
    margin-bottom: 25px;
    opacity: 0.9;
}

.category-action {
    display: flex;
    align-items: center;
}

.shop-now-link {
    font-family: 'Work Sans', sans-serif !important;
    font-size: 1rem;
    font-weight: 700;
    color: #008080;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: gap 0.3s ease, color 0.3s ease;
}

.category-card:hover .shop-now-link {
    gap: 12px;
    color: #006666;
}

@media (max-width: 992px) {
    .category-list {
        grid-template-columns: 1fr;
        max-width: 700px;
        margin: 0 auto;
    }

    .category-title-text {
        font-size: 1.8rem;
    }
}

/* ===== ITEM LIST ===== */
.itemlist {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 30px;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 5%;
}

.item {
    background: white;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 2px 15px rgba(0, 0, 0, 0.08);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    min-height: 400px;
    /* Ensures all cards are at least this tall */
}

.item:hover {
    transform: translateY(-6px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

.item-image {
    position: relative;
    overflow: hidden;
    height: 300px;
    /* Fixed height for consistency */
    width: 100%;
    background: #f8f8f8;
}

.item-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    /* This ensures the image fills the area without distortion */
    transition: transform 0.4s ease;
}

.popup-price {
    font-size: 24px;
    font-weight: 700;
    color: #2d2d2d;
    background: #fdf2e9;
    padding: 4px 12px;
    border-radius: 8px;
}

.item:hover .item-image img {
    transform: scale(1.1);
}

.item-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.item:hover .item-overlay {
    opacity: 1;
}

.quick-view {
    padding: 12px 28px;
    background: white;
    color: #2d2d2d;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transform: translateY(10px);
    transition: all 0.3s ease;
}

.item:hover .quick-view {
    transform: translateY(0);
}

.item-content {
    padding: 20px;
}

.item-category {
    display: inline-block;
    background: linear-gradient(135deg, #8b6f47, #b89968);
    color: white;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 10px;
}

.item-title {
    font-size: 18px;
    font-weight: 600;
    color: #2d2d2d;
    margin: 0;
}

/* ===== POPUP MODAL ===== */
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
    padding: 40px;
    justify-content: center;
    align-items: center;
    border-radius: 20px 0 0 20px;
}

.popup-image img {
    width: 100%;
    height: auto;
    max-height: 500px;
    object-fit: contain;
    border-radius: 12px;
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
    transition: all 0.2s ease;
    border: 2px solid transparent;
}

.tag:hover {
    background: #8b6f47;
    color: white;
    transform: translateY(-2px);
}

.size-tag {
    background: #e3f2fd;
    color: #1976d2;
}

.size-tag:hover {
    background: #1976d2;
    color: white;
}

.color-tag {
    background: #fff3e0;
    color: #f57c00;
}

.color-tag:hover {
    background: #f57c00;
    color: white;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .section-header-wrapper {
        flex-direction: column;
        align-items: flex-start;
        gap: 20px;
    }

    .search-bar input {
        width: 200px;
    }

    .category-list,
    .itemlist {
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    }

    .popup-body {
        grid-template-columns: 1fr;
    }

    .popup-image {
        border-radius: 20px 20px 0 0;
        padding: 30px;
    }

    .popup-details {
        padding: 30px;
    }

    .popup-title {
        font-size: 24px;
    }
}

/* Custom scrollbar for popup */
.popup-content::-webkit-scrollbar {
    width: 8px;
}

.popup-content::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
}

.popup-content::-webkit-scrollbar-thumb {
    background: #8b6f47;
    border-radius: 10px;
}

.popup-content::-webkit-scrollbar-thumb:hover {
    background: #6d5838;
}
</style>