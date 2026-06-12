<script setup>
import ProductStock from '../components/products-stock.vue';
import DiyProductKit from '../components/diy-product-kit.vue';
import CategoryView from '../views/CategoryView.vue';
import { getUtilsUrl } from '@/services/api';
import { useRoute, useRouter } from 'vue-router';
import { computed } from 'vue';
import { codeToPath, defaultLang } from '@/utils/localeRoutes';

const route = useRoute();
const router = useRouter();

const currentLang = computed(() => route.params.lang || defaultLang);
const currentCategory = computed(() => route.params.category || "needles");

const categories = [
  'yarn', 'needles', 'thread', 'tools',
  'beads','decorative', 'flora'
];

const selectCategory = (cat) => {
  router.push({
    name: 'catalog',
    params: { lang: currentLang.value, category: cat }
  });
};

</script>
<template>
    <!-- Page Header -->
    <img :src="getUtilsUrl('shop06-large.webp')" fetchpriority="high" aria-hidden="true"
        style="position: absolute; width: 0; height: 0; overflow: hidden; z-index: -1;">
    <div class="catalog-header" :style="{ backgroundImage: `url(${getUtilsUrl('shop06-large.webp')})` }">
        <div class="overlay"></div>
        <div class="header-content">
            <span class="since-badge" v-reveal delay="0.2s">{{ $t('catalog.since') }}</span>
            <h1 class="catalog-title" v-reveal>{{ $t('catalog.title') }}</h1>
            <p class="catalog-subtitle" v-reveal delay="0.6s">
                {{ $t('catalog.subtitle') }}
            </p>
        </div>
    </div>
    <div class="category-navbar-container">
        <nav class="category-navbar">
            <button
            v-for="cat in categories"
            :key="cat"
            class="cat-nav-btn"
            :class="{ active: currentCategory === cat }"
            @click="selectCategory(cat)"
            >
            {{ $t(`categories.${cat}`) }}   <!-- reuse your existing i18n keys -->
            </button>
        </nav>
    </div>

    <!-- Main Stock -->
    <!-- <ProductStock /> -->
    <CategoryView 
    v-if="currentCategory"
    :category="currentCategory"
    />
    
    <!-- DIY Kit -->
    <div class="section-header" v-reveal>
        <span class="section-tag">{{ $t('diyKits.tag') }}</span>
        <h2 class="section-title">{{ $t('diyKits.title') }}</h2>
        <p class="section-description">
            {{ $t('diyKits.description') }}
        </p>
    </div>

    <!--DIY Kit -->
    <DiyProductKit /> 

</template>
<style scoped>
/* Catalog Header */
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

.category-navbar-container {
  overflow-x: hidden;
}

.category-navbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 18px;
  background-color: #FDF3E6;
  border-radius: 0 16px 0 16px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  justify-content: center;
}

.category-navbar button {
  background: transparent;
  border: none;
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 500;
  font-size: 1rem;
  background-color: white;
  color: #5d4037;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.category-navbar button.active {
  background: #DD876E;
  color: white;
  box-shadow: 0 4px 10px rgba(139, 111, 71, 0.2);
}

.category-navbar button:hover:not(.active) {
  background: #8b6f4746;
  color: #2d3436;
}

.desktop-only {
    display: block;
}

.section-header {
    padding: 0px 0 30px 0;
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

@media (max-width: 768px) {
    .catalog-header {
        height: 40vh;
        padding: 50px 5% 50px 5%;
    }

    .catalog-title {
        font-size: 2.5rem;
    }

    .catalog-subtitle {
        font-size: 1rem;
    }

    .desktop-only {
        display: none;
    }

    .section-title {
        font-size: 36px;
    }

    .category-navbar button {
    padding: 8px 14px;
    font-size: 0.875rem;
  }
}

@media (max-width: 480px) {
  .category-navbar button {
    padding: 7px 12px;
    font-size: 0.8rem;
  }
}
</style>