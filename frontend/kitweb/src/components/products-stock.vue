<script setup>
import { ref } from 'vue';
// 1. Define your data array
const items = ref([
    {
        id: 1,
        category: 'Yarn',
        title: 'Premium Yarn Collection',
        price: '฿199',
        image: 'https://m.media-amazon.com/images/I/610a5LpNbTL.jpg',
        alt: 'yarn'
    },
    {
        id: 2,
        category: 'Buttons',
        title: 'Designer Buttons Set',
        price: '฿89',
        image: 'https://m.media-amazon.com/images/I/81U7rrsM8zL._AC_UF894,1000_QL80_.jpg',
        alt: 'buttons'
    },
    {
        id: 3,
        category: 'Needles',
        title: 'Professional Needle Kit',
        price: '฿149',
        image: 'https://cdn.sparkfun.com/assets/parts/4/8/7/5/10405-04b.jpg',
        alt: 'needle'
    },
    {
        id: 4,
        category: 'Needles',
        title: 'Professional Needle Kit',
        price: '฿149',
        image: 'https://cdn.sparkfun.com/assets/parts/4/8/7/5/10405-04b.jpg',
        alt: 'needle'
    },
    // ... add as many as you need
]);
</script>


<template>
    <!-- All Products / Stocks -->
    <section class="stock-sec">
        <div class="section-header-wrapper">
            <div class="section-header">
                <h2 class="section-title">All Products</h2>
                <p class="section-subtitle">Browse our complete collection</p>
            </div>
            <div class="search-bar">
                <ion-icon name="search-outline"></ion-icon>
                <input type="text" placeholder="Search products...">
            </div>
        </div>
        <div class="itemlist">
            <div v-for="item in items" :key="item.id" class="item">
                <div class="item-image">
                    <img :src="item.image" :alt="item.alt">
                    <div class="item-overlay">
                        <button class="quick-view" @click="handleQuickView(item)">
                            Quick View
                        </button>
                    </div>
                </div>
                <div class="item-content">
                    <span class="item-category">{{ item.category }}</span>
                    <h4 class="item-title">{{ item.title }}</h4>
                    <div class="item-price">From {{ item.price }}</div>
                </div>
            </div>
        </div>
    </section>
</template>

<style>
/* ===== STOCK/ALL PRODUCTS SECTION ===== */
.stock-sec {
    padding: 60px 0;
    background: white;
}

.section-header-wrapper {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 5%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 40px;
}

.section-header-wrapper .section-header {
    text-align: left;
    margin: 0;
}

.search-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    background: #f5f5f5;
    padding: 12px 20px;
    border-radius: 12px;
    border: 2px solid transparent;
    transition: all 0.3s ease;
}

.search-bar:focus-within {
    border-color: #b89968;
    background: white;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.search-bar ion-icon {
    font-size: 20px;
    color: #999;
}

.search-bar input {
    border: none;
    background: transparent;
    font-size: 15px;
    outline: none;
    width: 250px;
    font-family: 'Inter', sans-serif;
}

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
}

.item:hover {
    transform: translateY(-6px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

.item-image {
    position: relative;
    overflow: hidden;
    height: 280px;
}

.item-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.4s ease;
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
    margin: 0 0 10px 0;
}

.item-price {
    font-size: 20px;
    font-weight: 700;
    color: #8b6f47;
    margin: 0;
}
</style>