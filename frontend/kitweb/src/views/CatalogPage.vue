<script setup>
import ProductStock from '../components/products-stock.vue';
import DiyProductKit from '../components/diy-product-kit.vue';
import CategoryView from '../views/CategoryView.vue';
import { getUtilsUrl } from '@/services/api';
import { useRoute, useRouter } from 'vue-router';
import { computed, ref } from 'vue';
import { codeToPath, defaultLang } from '@/utils/localeRoutes';
import { catalogGroups } from '@/utils/catalogCategories';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const currentLang = computed(() => route.params.lang || defaultLang);
const currentCategory = computed(() => route.params.category || "all");

const sortBy = ref('popular');
const sidebarOpen = ref(false);
const sortDropdownOpen = ref(false);

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
  window.scrollTo({ top: 400, behavior: 'smooth' });
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
                <div class="sidebar-heading-row">
                    <h3 class="sidebar-heading">{{ $t('catalog.allCategories') || 'Categories' }}</h3>
                    <div class="sort-dropdown-wrapper">
                        <button
                            class="sort-btn"
                            :class="{ active: sortBy !== 'popular' }"
                            :title="$t('catalog.sortBy')"
                            @click="sortDropdownOpen = !sortDropdownOpen"
                        >
                            <ion-icon name="swap-vertical-outline"></ion-icon>
                        </button>
                        <transition name="sort-drop">
                            <div v-if="sortDropdownOpen" class="sort-dropdown-menu" @click.stop>
                                <label
                                    v-for="opt in sortOptions"
                                    :key="opt.value"
                                    class="sort-dropdown-option"
                                    @click="sortDropdownOpen = false"
                                >
                                    <input type="radio" :value="opt.value" v-model="sortBy">
                                    <span>{{ opt.label }}</span>
                                </label>
                            </div>
                        </transition>
                    </div>
                </div>
                <ul class="sidebar-category-list">
                    <li v-for="group in catalogGroups" :key="group.key">
                        <button
                            class="sidebar-cat-item"
                            :class="{ active: currentCategory === group.key }"
                            @click="selectCategory(group.key); sidebarOpen = false"
                        >
                            <ion-icon v-if="group.svgSrc" :src="group.svgSrc"></ion-icon>
                            <ion-icon v-else-if="group.icon" :name="group.icon"></ion-icon>
                            <span>{{ $t(`categories.${group.key}`) }}</span>
                            <ion-icon name="chevron-forward-outline" class="arrow-icon"></ion-icon>
                        </button>
                    </li>
                </ul>
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
    padding: 24px 10px;
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
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.07);
    /* overflow: hidden;
    max-height: calc(100vh - 100px); */
    /* overflow-y: auto; */
}

/* .catalog-sidebar::-webkit-scrollbar {
    width: 4px;
}
.catalog-sidebar::-webkit-scrollbar-thumb {
    background: #d4b896;
    border-radius: 4px;
} */

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
    margin: 0;
}

.sidebar-heading-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
}

.sort-dropdown-wrapper {
    position: relative;
}

.sort-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: 1.5px solid #e4d5c6;
    border-radius: 6px;
    background: transparent;
    color: #9e8272;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.sort-btn:hover,
.sort-btn.active {
    background: #DD876E;
    border-color: #DD876E;
    color: #fff;
}

.sort-dropdown-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    min-width: 180px;
    background: #fff;
    border: 1px solid #f0e6da;
    border-radius: 10px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.12);
    padding: 6px;
    z-index: 300;
}

.sort-dropdown-option {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 8px 10px;
    cursor: pointer;
    font-size: 13px;
    color: #5d4037;
    border-radius: 7px;
    transition: background 0.13s;
}

.sort-dropdown-option:hover {
    background: #FDF3E6;
}

.sort-dropdown-option input[type="radio"] {
    accent-color: #DD876E;
    width: 14px;
    height: 14px;
    cursor: pointer;
    flex-shrink: 0;
}

.sort-drop-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.sort-drop-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.sort-drop-enter-from, .sort-drop-leave-to { opacity: 0; transform: translateY(-4px); }

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
