<script setup>
import { ref, computed, onMounted, onServerPrefetch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, API_URL, getCategoryImageUrl } from '../services/api';
import { useI18n } from 'vue-i18n';
import { codeToPath, defaultLang, localizedRoute } from '@/utils/localeRoutes';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const currentLang = computed(() => route.params.lang || defaultLang);

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

async function loadData() {
    loading.value = true;
    try {
        products.value = await api.getProducts();
        hasLoaded.value = true;
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


const categories = computed(() => {
    const categoryMap = new Map();
    products.value.forEach(p => {
        const paths = p.categories?.length ? p.categories : (p.category ? [p.category] : []);
        paths.forEach(catPath => {
            if (!catPath) return;
            if (categoryMap.has(catPath)) {
                categoryMap.get(catPath).count++;
            } else {
                categoryMap.set(catPath, {
                    name: catPath,
                    count: 1,
                    image: getCategoryImageUrl(catPath) || (p.image_key ? (p.image_key.includes('.') ? `${API_URL}/images/${p.image_key}` : `${API_URL}/images/${p.image_key}-thumb.webp`) : 'https://m.media-amazon.com/images/I/610a5LpNbTL.jpg'),
                });
            }
        });
    });
    return Array.from(categoryMap.values());
});

const selectCategory = (categoryName) => {
  router.push(
    localizedRoute(route, 'category-products', { category: categoryName })
  );
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
                        <h3 class="category-title-text">{{ tCategory(category.name) }}</h3>
                        <p class="category-description-text">{{ tCategoryDesc(category.name) }}</p>
                        <div class="category-action">
                            <span class="shop-now-link">{{ $t('catalog.shopCategory') }} <ion-icon
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
    margin: 0 auto;
}

.category-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    padding: 0 1rem;
    gap: 1rem;
}

.category-card {
    background: #FFFAF6;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1), box-shadow 0.4s ease;
    border: 1px solid rgba(139, 111, 71, 0.1);
    display: flex;
    flex-direction: column;
    padding: 0;
    box-shadow: 0 20px 40px rgba(53, 35, 29, 0.08);
}

.category-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 20px 40px rgba(53, 35, 29, 0.379);
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
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
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
        grid-template-columns: repeat(2, 1fr);
        max-width: 700px;
        margin: 0 auto;
    }

    .category-title-text {
        font-size: 1.8rem;
    }
}

@media (max-width: 600px) {
    .category-list {
        grid-template-columns: 1fr;
    }
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

    .category-list {
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