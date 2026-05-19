<script setup>
import ProductStock from '../components/products-stock.vue';
import DiyProductKit from '../components/diy-product-kit.vue';
import { getUtilsUrl } from '@/services/api';

const toggleCart = () => {

}

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


    <div class="section-header" v-reveal style="padding-top: 2rem;">
        <span class="section-tag">{{ $t('productstocks.tag') }}</span>
        <h2 class="section-title">{{ $t('productstocks.title') }}</h2>
        <p class="section-description">
            {{ $t('productstocks.description') }}
        </p>
    </div>

    <!-- Main Stock -->
    <ProductStock />

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
    /* background-image: url('../assets/shop06.png'); */
    background-size: cover;
    background-position: center;
    text-align: center;
    position: relative;
    color: white;
    overflow: hidden;
}

.overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
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
    color: #e8dcc8;
    letter-spacing: 4px;
    margin-bottom: 15px;
    text-transform: uppercase;
}

.catalog-title {
    font-family: 'ZCOOL XiaoWei', serif;
    font-size: 4.5rem;
    color: white;
    margin: 0 auto 25px;
    line-height: 1.1;
    font-weight: 500;
}

.catalog-subtitle {
    font-family: 'Work Sans', sans-serif;
    font-size: 1.35rem;
    color: rgba(255, 255, 255, 0.9);
    max-width: 800px;
    margin: 0 auto;
    line-height: 1.6;
}

.desktop-only {
    display: block;
}

.section-header {
    padding: 0px 0 30px 0;
    text-align: left;
    background-color: #FBF7F2;
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
}
</style>