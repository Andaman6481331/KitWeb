<script setup>
import { ref } from 'vue';

const products = ref([
    {
        id: 1,
        badge: 'Best Seller',
        badgeClass: '',
        image: 'https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg',
        name: 'Eagle Yarn Premium',
        description: 'Pure quality yarn for all projects',
        stars: '⭐⭐⭐⭐⭐',
        ratingCount: 128,
        price: 299
    },
    {
        id: 2,
        badge: 'New Arrival',
        badgeClass: 'new',
        image: 'https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg',
        name: 'Silk Blend Yarn',
        description: 'Luxurious silk-cotton blend',
        stars: '⭐⭐⭐⭐⭐',
        ratingCount: 95,
        price: 399
    },
    {
        id: 3,
        badge: 'Sale',
        badgeClass: 'sale',
        image: 'https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg',
        name: 'Cotton Comfort Yarn',
        description: 'Soft and breathable cotton',
        stars: '⭐⭐⭐⭐',
        ratingCount: 203,
        oldPrice: 250,
        price: 199
    },
    {
        id: 4,
        image: 'https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg',
        name: 'Merino Wool Yarn',
        description: 'Premium merino wool blend',
        stars: '⭐⭐⭐⭐⭐',
        ratingCount: 156,
        price: 449
    },
    {
        id: 5,
        image: 'https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg',
        name: 'Acrylic Pro Yarn',
        description: 'Durable and vibrant colors',
        stars: '⭐⭐⭐⭐',
        ratingCount: 87,
        price: 179
    }
]);

const currentIndex = ref(2); // Start with card-3 (index 2) in center

const getCardPosition = (index) => {
    const diff = index - currentIndex.value;
    return {
        scale: diff === 0 ? 1 : Math.abs(diff) === 1 ? 0.8 : 0.7,
        translateX: diff * 15,
        zIndex: 20 - Math.abs(diff)
    };
};

const moveLeft = () => {
    if (currentIndex.value > 0) {
        currentIndex.value--;
    }
};

const moveRight = () => {
    if (currentIndex.value < products.value.length - 1) {
        currentIndex.value++;
    }
};
</script>
<template>
    <!-- Today's Recommendations -->
    <section class="recommendation-sec">
        <div class="section-header">
            <h2 class="section-title">Today's Recommendations</h2>
            <p class="section-subtitle">Handpicked products just for you</p>
        </div>
        <div class="scroller">
            <div class="recommended-card" v-for="product in products" :key="product.id" :class="`card-${product.id}`">
                <div v-if="product.badge" class="product-badge" :class="product.badgeClass">
                    {{ product.badge }}
                </div>
                <img :src="product.image" :alt="product.name">
                <div class="product-info">
                    <div class="product-name">{{ product.name }}</div>
                    <div class="product-description">{{ product.description }}</div>
                    <div class="product-rating">
                        <span class="stars">{{ product.stars }}</span>
                        <span class="rating-count">({{ product.ratingCount }})</span>
                    </div>
                    <div class="product-footer">
                        <div class="product-price">
                            <span v-if="product.oldPrice" class="old-price">฿{{ product.oldPrice }}</span>
                            ฿{{ product.price }}
                        </div>
                        <button class="buy-button">Add to Cart</button>
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>

<style>
/* ===== RECOMMENDATIONS SECTION ===== */
.recommendation-sec {
    padding: 60px 0;
    background: linear-gradient(135deg, #faf8f5 0%, #f0ebe3 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
}

.scroller {
    display: flex;
    overflow-x: auto;
    padding: 20px;
    height: 500px;
}

.recommended-card {
    width: 350px;
    background: white;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease-in-out;
    position: absolute;
    margin-left: -175px;
    /* Half of card width to center */
}

.card-1 {
    scale: 0.7;
    transform: translateX(-30rem);
    z-index: 18;
}

.card-2 {
    scale: 0.8;
    transform: translateX(-15rem);
    z-index: 19;
}

.card-3 {
    scale: 1;
    transform: translateX(0rem);
    z-index: 20;
}

.card-4 {
    scale: 0.8;
    transform: translateX(15rem);
    z-index: 19;
}

.card-5 {
    scale: 0.7;
    transform: translateX(30rem);
    z-index: 18;
}

.recommended-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.product-badge {
    position: absolute;
    top: 15px;
    right: 15px;
    background: #ff6b6b;
    color: white;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    z-index: 10;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.product-badge.new {
    background: #4ecdc4;
}

.product-badge.sale {
    background: #ff9f43;
}

.recommended-card img {
    width: 100%;
    height: 280px;
    object-fit: cover;
    transition: transform 0.3s ease;
}

.recommended-card:hover img {
    transform: scale(1.05);
}

.product-info {
    padding: 24px;
}

.product-name {
    font-size: 22px;
    font-weight: 700;
    color: #2d2d2d;
    margin-bottom: 8px;
}

.product-description {
    font-size: 14px;
    color: #666;
    margin-bottom: 12px;
}

.product-rating {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
}

.stars {
    font-size: 14px;
    letter-spacing: 2px;
}

.rating-count {
    font-size: 13px;
    color: #999;
}

.product-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 16px;
}

.product-price {
    font-size: 28px;
    font-weight: 700;
    color: #8b6f47;
}

.old-price {
    font-size: 18px;
    color: #999;
    text-decoration: line-through;
    margin-right: 8px;
}

.buy-button {
    padding: 12px 24px;
    background: linear-gradient(135deg, #8b6f47, #b89968);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(139, 111, 71, 0.3);
}

.buy-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(139, 111, 71, 0.4);
}
</style>