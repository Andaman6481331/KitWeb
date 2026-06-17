<script setup>
import ProductStock from '../components/products-stock.vue';
import DiyProductKit from '../components/diy-product-kit.vue';
import CategoryView from '../views/CategoryView.vue';
import { getUtilsUrl } from '@/services/api';
import { useRoute, useRouter } from 'vue-router';
import { computed, ref } from 'vue';
import { codeToPath, defaultLang } from '@/utils/localeRoutes';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const currentLang = computed(() => route.params.lang || defaultLang);
const currentCategory = computed(() => route.params.category || "needles");

const sortBy = ref('popular');
const sidebarOpen = ref(false);

const categories = [
  'yarn', 'needles', 'thread', 'tools',
  'beads', 'decorative', 'flora'
];

const categoryIcons = {
  yarn: 'color-wand-outline',
  needles: 'cut-outline',
  thread: 'git-network-outline',
  tools: 'construct-outline',
  beads: 'radio-button-on-outline',
  decorative: 'sparkles-outline',
  flora: 'leaf-outline',
};

const sortOptions = computed(() => [
  { value: 'popular', label: t('catalog.sortPopular') },
  { value: 'price_asc', label: t('catalog.sortPriceAsc') },
  { value: 'price_desc', label: t('catalog.sortPriceDesc') },
  { value: 'name', label: t('catalog.sortName') },
]);

const selectCategory = (cat) => {
  router.push({
    name: 'catalog',
    params: { lang: currentLang.value, category: cat }
  });
};
</script>

<template>
    <!-- Preload hero image -->
    <img :src="getUtilsUrl('shop06-large.webp')" fetchpriority="high" aria-hidden="true"
        style="position: absolute; width: 0; height: 0; overflow: hidden; z-index: -1;">

    <!-- Page Header -->
    <div class="catalog-header" :style="{ backgroundImage: `url(${getUtilsUrl('shop06-large.webp')})` }">
        <div class="overlay"></div>
        <div class="header-content">
            <span class="since-badge" v-reveal delay="0.2s">{{ $t('catalog.since') }}</span>
            <h1 class="catalog-title" v-reveal>{{ $t('catalog.title') }}</h1>
            <p class="catalog-subtitle" v-reveal delay="0.6s">{{ $t('catalog.subtitle') }}</p>
        </div>
    </div>

    <!-- Mobile filter bar -->
    <div class="mobile-filter-bar">
        <button class="mobile-filter-btn" @click="sidebarOpen = !sidebarOpen">
            <ion-icon name="funnel-outline"></ion-icon>
            {{ $t('catalog.filter') || 'Filter & Categories' }}
        </button>
        <span class="mobile-current-cat">{{ $t(`categories.${currentCategory}`) }}</span>
    </div>

    <!-- Sidebar overlay (mobile) -->
    <div v-if="sidebarOpen" class="sidebar-overlay" @click="sidebarOpen = false"></div>

    <!-- Main layout: sidebar + content -->
    <div class="catalog-layout">

        <!-- Sidebar -->
        <aside class="catalog-sidebar" :class="{ open: sidebarOpen }">
            <button class="sidebar-close-btn" @click="sidebarOpen = false">
                <ion-icon name="close-outline"></ion-icon>
            </button>

            <!-- Category Navigation -->
            <div class="sidebar-section">
                <h3 class="sidebar-heading">{{ $t('catalog.allCategories') || 'Categories' }}</h3>
                <ul class="sidebar-category-list">
                    <li v-for="cat in categories" :key="cat">
                        <button
                            class="sidebar-cat-item"
                            :class="{ active: currentCategory === cat }"
                            @click="selectCategory(cat); sidebarOpen = false"
                        >
                            <ion-icon :name="categoryIcons[cat] || 'grid-outline'" class="cat-icon"></ion-icon>
                            <span>{{ $t(`categories.${cat}`) }}</span>
                            <ion-icon name="chevron-forward-outline" class="arrow-icon"></ion-icon>
                        </button>
                    </li>
                </ul>
            </div>

            <!-- Sort Section -->
            <div class="sidebar-section">
                <h3 class="sidebar-heading">{{ $t('catalog.sortBy') || 'Sort By' }}</h3>
                <div class="sidebar-sort-options">
                    <label v-for="opt in sortOptions" :key="opt.value" class="sort-option">
                        <input type="radio" :value="opt.value" v-model="sortBy">
                        <span>{{ opt.label }}</span>
                    </label>
                </div>
            </div>
        </aside>

        <!-- Main content -->
        <main class="catalog-main">
            <CategoryView
                v-if="currentCategory"
                :category="currentCategory"
                :sort-by="sortBy"
            />
        </main>
    </div>

    <!-- DIY Kit -->
    <div class="section-header" v-reveal>
        <span class="section-tag">{{ $t('diyKits.tag') }}</span>
        <h2 class="section-title">{{ $t('diyKits.title') }}</h2>
        <p class="section-description">{{ $t('diyKits.description') }}</p>
    </div>
    <DiyProductKit />
</template>

<style scoped>
/* ── Page Header ─────────────────────────────────────── */
.catalog-header {
    padding: 120px 5% 100px 5%;
    background-size: cover;
    background-position: center;
    text-align: center;
    position: relative;
    overflow: hidden;
}

.overlay {
    position: absolute;
    inset: 0;
    background:
        radial-gradient(
            circle at center,
            rgba(250, 244, 236, 0.838) 0%,
            rgba(80, 60, 45, 0.18) 60%,
            rgba(40, 28, 20, 0.337) 100%
        );
    z-index: 1;
}

.header-content {
    position: relative;
    z-index: 2;
    max-width: 1000px;
    margin: 0 auto;
}

.since-badge {
    display: block;
    font-family: 'Work Sans', sans-serif;
    font-size: 14px;
    font-weight: 700;
    color: #604539e0;
    letter-spacing: 4px;
    margin-bottom: 15px;
    text-transform: uppercase;
}

.catalog-title {
    font-family: 'ZCOOL XiaoWei', serif;
    font-size: 4rem;
    color: #604539;
    margin: 0 auto 25px;
    line-height: 1.1;
    font-weight: 400;
}

.catalog-subtitle {
    font-family: 'Work Sans', sans-serif;
    font-size: 1.35rem;
    color: #604539e0;
    max-width: 800px;
    margin: 0 auto;
    line-height: 1.6;
}

/* ── Mobile filter bar ───────────────────────────────── */
.mobile-filter-bar {
    display: none;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    background: #fff;
    border-bottom: 1px solid #f0ebe3;
    position: sticky;
    top: 0;
    z-index: 50;
}

.mobile-filter-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: transparent;
    border: 1.5px solid #DD876E;
    color: #DD876E;
    padding: 7px 16px;
    border-radius: 20px;
    cursor: pointer;
    font-weight: 600;
    font-size: 13px;
}

.mobile-current-cat {
    font-size: 14px;
    font-weight: 600;
    color: #5d4037;
}

/* ── Overlay (mobile) ────────────────────────────────── */
.sidebar-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 98;
}

/* ── Layout ──────────────────────────────────────────── */
.catalog-layout {
    display: flex;
    max-width: 1400px;
    margin: 0 auto;
    padding: 24px 20px;
    gap: 20px;
    align-items: flex-start;
    background: #FBF7F2;
}

/* ── Sidebar ─────────────────────────────────────────── */
.catalog-sidebar {
    width: 230px;
    flex-shrink: 0;
    position: sticky;
    top: 80px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.07);
    overflow: hidden;
    max-height: calc(100vh - 100px);
    overflow-y: auto;
}

.catalog-sidebar::-webkit-scrollbar {
    width: 4px;
}
.catalog-sidebar::-webkit-scrollbar-thumb {
    background: #d4b896;
    border-radius: 4px;
}

.sidebar-close-btn {
    display: none;
    justify-content: flex-end;
    padding: 12px 14px 4px;
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 24px;
    color: #5d4037;
    width: 100%;
}

.sidebar-section {
    padding: 16px;
    border-bottom: 1px solid #f4ede3;
}

.sidebar-section:last-child {
    border-bottom: none;
}

.sidebar-heading {
    font-family: 'Work Sans', sans-serif;
    font-size: 11px;
    font-weight: 700;
    color: #9e8272;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin: 0 0 10px 0;
}

/* ── Category list ───────────────────────────────────── */
.sidebar-category-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.sidebar-cat-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 9px 10px;
    border: none;
    background: transparent;
    border-radius: 8px;
    cursor: pointer;
    color: #5d4037;
    font-size: 13.5px;
    font-weight: 500;
    transition: background 0.18s, color 0.18s;
    text-align: left;
}

.sidebar-cat-item:hover:not(.active) {
    background: #FDF3E6;
}

.sidebar-cat-item.active {
    background: #DD876E;
    color: #fff;
    font-weight: 600;
}

.cat-icon {
    font-size: 16px;
    flex-shrink: 0;
}

.arrow-icon {
    margin-left: auto;
    font-size: 13px;
    opacity: 0.45;
}

.sidebar-cat-item.active .arrow-icon {
    opacity: 0.7;
}

/* ── Sort options ────────────────────────────────────── */
.sidebar-sort-options {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.sort-option {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 8px 6px;
    cursor: pointer;
    font-size: 13.5px;
    color: #5d4037;
    border-radius: 6px;
    transition: background 0.15s;
}

.sort-option:hover {
    background: #FDF3E6;
}

.sort-option input[type="radio"] {
    accent-color: #DD876E;
    width: 15px;
    height: 15px;
    cursor: pointer;
}

/* ── Main content ────────────────────────────────────── */
.catalog-main {
    flex: 1;
    min-width: 0;
}

/* ── DIY Kit section ─────────────────────────────────── */
.section-header {
    padding: 0 0 30px;
    text-align: left;
    background-color: #FDF3E6;
    justify-content: center;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.section-tag {
    display: block;
    font-size: 13px;
    font-weight: 700;
    color: #8b6f47;
    letter-spacing: 4px;
}

.section-title {
    font-family: 'ZCOOL XiaoWei', serif;
    font-size: 48px;
    color: #2D241E;
    margin: 0;
}

.section-description {
    font-size: 18px;
    color: #6B5D54;
    line-height: 1.6;
    margin: 0 auto;
}

/* ── Responsive ──────────────────────────────────────── */
@media (max-width: 900px) {
    .mobile-filter-bar {
        display: flex;
    }

    .sidebar-overlay {
        display: block;
    }

    .catalog-sidebar {
        position: fixed;
        top: 0;
        left: -290px;
        width: 280px;
        height: 100vh;
        max-height: 100vh;
        border-radius: 0;
        z-index: 99;
        transition: left 0.28s ease;
        box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15);
    }

    .catalog-sidebar.open {
        left: 0;
    }

    .sidebar-close-btn {
        display: flex;
    }

    .catalog-layout {
        padding: 12px;
    }
}

@media (max-width: 768px) {
    .catalog-header {
        height: 40vh;
        padding: 50px 5%;
    }

    .catalog-title {
        font-size: 2.5rem;
    }

    .catalog-subtitle {
        font-size: 1rem;
    }

    .section-title {
        font-size: 36px;
    }
}
</style>
