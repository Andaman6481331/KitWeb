<script setup>
import ProductStock from '../components/products-stock.vue';
import DiyProductKit from '../components/diy-product-kit.vue';

const toggleCart = () => {

}

</script>
<template>
    <!-- Page Header -->
    <div class="catalog-header">
        <div class="header-content">
            <span class="since-badge" v-reveal delay="0.2s">SINCE 1984</span>
            <h1 class="catalog-title" v-reveal>Browse Our Collection</h1>
            <p class="catalog-subtitle" v-reveal delay="0.6s">
                Four decades of artisanal quality, curated by category for the modern <br class="desktop-only">
                maker and the traditional tailor.
            </p>
        </div>
    </div>

    <!-- Main Stock -->
    <ProductStock />

    <!--DIY Kit -->
    <DiyProductKit />

</template>
<style scoped>
/* Catalog Header */
.catalog-header {
    padding: 80px 5% 60px 5%;
    background-color: #FBF7F2;
    text-align: center;
}

.since-badge {
    display: block;
    font-family: 'Work Sans', sans-serif;
    font-size: 14px;
    font-weight: 700;
    color: #8b6f47;
    letter-spacing: 4px;
    margin-bottom: 15px;
    text-transform: uppercase;
}

.catalog-title {
    font-family: 'ZCOOL XiaoWei', serif;
    font-size: 4rem;
    color: #3d2b1f;
    margin: 0 auto 25px;
    line-height: 1.1;
    font-weight: 500;
}

.catalog-subtitle {
    font-family: 'Work Sans', sans-serif;
    font-size: 1.25rem;
    color: #5d4037;
    max-width: 800px;
    margin: 0 auto;
    line-height: 1.6;
    opacity: 0.9;
}

.desktop-only {
    display: block;
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
}
</style>