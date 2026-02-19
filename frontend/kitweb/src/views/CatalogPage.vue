<script setup>
import DiyProductKit from '../components/diy-product-kit.vue';
import ProductStock from '../components/products-stock.vue';

const toggleCart = () => {

}

</script>
<template>
    <!-- Page Header -->
    <div class="page-header">
        <div class="header-content">
            <h1 v-reveal>🍜 Order Now</h1>
            <p v-reveal class="delay2">Select your favorite dishes and create your perfect meal</p>
        </div>

        <!-- Cart Button (Mobile) -->
        <button class="cart-toggle mobile-only" @click="toggleCart">
            🛒
            <span v-if="cartItemCount > 0" class="cart-badge">{{ cartItemCount }}</span>
        </button>
    </div>

    <!-- Main Stock -->
    <ProductStock />

    <DiyProductKit />

</template>
<style scoped>
/* Page Header */
.page-header {
    background:
        linear-gradient(135deg,
            rgba(94, 69, 53, 0.75),
            rgba(147, 115, 94, 0.75)),
        url('../assets/texture-bg02.jpg');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;

    color: #fff9f1;
    padding: 40px 5%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.header-content h1 {
    font-size: 42px;
    font-weight: 700;
    margin: 0 0 10px 0;
    letter-spacing: -0.5px;
}

.header-content p {
    font-size: 16px;
    margin: 0;
    opacity: 0.9;
}

.cart-toggle {
    display: none;
    position: relative;
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 12px;
    padding: 12px 20px;
    font-size: 24px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.cart-toggle:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.05);
}

.cart-badge {
    position: absolute;
    top: -5px;
    right: -5px;
    background: #ff6b6b;
    color: white;
    font-size: 12px;
    font-weight: 700;
    padding: 4px 8px;
    border-radius: 10px;
    min-width: 20px;
}


@media (max-width: 768px) {
    .mobile-only {
        display: block;
    }
}
</style>