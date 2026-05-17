<script setup>
import { ref } from 'vue';
import { getUtilsUrl } from '@/services/api';

const isPaused = ref(false);
</script>
<template>
    <div class="banner-section">
        <!-- Alternative: Reverse Direction Banner -->
        <div class="scroll-banner" :class="{ paused: isPaused }">
            <div class="scroll-track">

                <!-- Duplicate set -->
                <div class="banner-item">
                    <img :src="getUtilsUrl('shop-card01-large.webp')" alt="" />
                </div>
                <div class="banner-item">
                    <img :src="getUtilsUrl('shop-card02-large.webp')" alt="" />
                </div>
                <div class="banner-item">
                    <img :src="getUtilsUrl('shop-card03-large.webp')" alt="" />
                </div>
                <div class="banner-item">
                    <img :src="getUtilsUrl('shop-card04-large.webp')" alt="" />
                </div>
                <div class="banner-item">
                    <img :src="getUtilsUrl('shop-card01-large.webp')" alt="" />
                </div>
                <div class="banner-item">
                    <img :src="getUtilsUrl('shop-card02-large.webp')" alt="" />
                </div>
                <div class="banner-item">
                    <img :src="getUtilsUrl('shop-card03-large.webp')" alt="" />
                </div>
                <div class="banner-item">
                    <img :src="getUtilsUrl('shop-card04-large.webp')" alt="" />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Scrolling Banner Container */
* {
    user-select: none;
}

.scroll-banner {
    width: 100%;
    overflow: hidden;
    position: relative;
    margin-top: 24px;
    margin-bottom: 24px;
}

.scroll-banner::before,
.scroll-banner::after {
    content: '';
    position: absolute;
    top: 0;
    width: 100px;
    height: 100%;
    z-index: 10;
    pointer-events: none;
}

.scroll-banner::before {
    left: 0;
    background: linear-gradient(to right, #f8f9fa, transparent);
}

.scroll-banner::after {
    right: 0;
    background: linear-gradient(to left, #f8f9fa, transparent);
}

/* Scroll Track */
.scroll-track {
    display: flex;
    gap: 20px;
    animation: scroll 30s linear infinite;
    width: fit-content;
}

.scroll-banner.reverse .scroll-track {
    animation: scrollReverse 30s linear infinite;
}

/* Scroll Animations */
@keyframes scroll {
    0% {
        transform: translateX(0);
    }

    100% {
        transform: translateX(-50%);
    }
}

/* Banner Item */
.banner-item {
    flex-shrink: 0;
    width: 350px;
    height: 500px;
    border-radius: 20px;
    overflow: hidden;
    position: relative;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    cursor: pointer;
}

.banner-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
}

/* Overlay */
.overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
    padding: 16px;
    opacity: 0;
    transition: opacity 0.3s ease;
}


.label {
    color: white;
    font-size: 0.95rem;
    font-weight: 600;
}

/* Responsive */
@media (max-width: 768px) {
    .banner-header {
        flex-direction: column;
        gap: 16px;
        text-align: center;
    }

    .banner-header h3 {
        font-size: 1.5rem;
    }

    .banner-item {
        width: 200px;
        height: 120px;
    }

    .scroll-track {
        gap: 12px;
    }
}

@media (max-width: 480px) {
    .banner-item {
        width: 160px;
        height: 100px;
    }

    .scroll-banner::before,
    .scroll-banner::after {
        width: 50px;
    }
}
</style>