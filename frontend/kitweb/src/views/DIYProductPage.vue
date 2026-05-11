<script setup>
import { ref } from 'vue';
// import RecommendedItem from '../components/recommended-item-slider.vue'
import customerReview from '../components/customer-review.vue';

const diyProducts = ref([
    {
        id: 1,
        name: 'Macramé Wall Hanging Kit',
        image: 'https://images.unsplash.com/photo-1611337388484-18fb1b726dd6?w=500',
        price: 599,
        difficulty: 'Beginner',
        duration: '2-3 hours',
        includes: ['3mm Cotton Cord (50m)', 'Wooden Dowel', 'Instructions', 'Pattern Guide'],
        description: 'Create a beautiful bohemian wall hanging with our complete kit.'
    },
    {
        id: 2,
        name: 'Beaded Bracelet Set',
        image: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=500',
        price: 399,
        difficulty: 'Beginner',
        duration: '1-2 hours',
        includes: ['Assorted Beads (200pcs)', 'Elastic Cord', 'Charms', 'Storage Box'],
        description: 'Design your own unique bracelets with colorful beads and charms.'
    },
    {
        id: 3,
        name: 'Crochet Tote Bag Kit',
        image: 'https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=500',
        price: 799,
        difficulty: 'Intermediate',
        duration: '4-6 hours',
        includes: ['T-Shirt Yarn (3 rolls)', 'Crochet Hook', 'Video Tutorial', 'Pattern'],
        description: 'Crochet a stylish and eco-friendly tote bag perfect for shopping.'
    },
    {
        id: 4,
        name: 'Embroidery Starter Set',
        image: 'https://images.unsplash.com/photo-1452696193712-6cabf5103b63?w=500',
        price: 499,
        difficulty: 'Beginner',
        duration: '3-4 hours',
        includes: ['Embroidery Hoop', '12 Thread Colors', 'Needles', 'Fabric', 'Pattern Sheets'],
        description: 'Learn the art of embroidery with modern floral patterns.'
    }
]);
</script>

<template>
    <!-- Page Header -->
    <div class="page-header">
        <div class="header-content">
            <h2>What Our Customers Say</h2>
            <p>Trusted by thousands of businesses and artisans nationwide</p>
        </div>

        <!-- Cart Button (Mobile) -->
        <button class="cart-toggle mobile-only" @click="toggleCart">
            🛒
            <span v-if="cartItemCount > 0" class="cart-badge">{{ cartItemCount }}</span>
        </button>
    </div>



    <!-- DIY Product Kits Section -->
    <section class="products-section">
        <div class="container">
            <div class="section-header">
                <h2>DIY Product Kits</h2>
                <p>Everything you need to create beautiful handmade crafts at home</p>
            </div>

            <div class="products-grid">
                <div v-for="product in diyProducts" :key="product.id" class="product-card"
                    @click="viewProduct(product)">
                    <div class="product-image">
                        <img :src="product.image" :alt="product.name" />
                        <div class="difficulty-badge" :class="product.difficulty.toLowerCase()">
                            {{ product.difficulty }}
                        </div>
                    </div>
                    <div class="product-details">
                        <h3>{{ product.name }}</h3>
                        <p class="product-desc">{{ product.description }}</p>
                        <div class="product-meta">
                            <span class="meta-item">
                                <span class="icon">⏱️</span>
                                {{ product.duration }}
                            </span>
                            <span class="meta-item">
                                <span class="icon">📦</span>
                                {{ product.includes.length }} items
                            </span>
                        </div>
                        <div class="product-footer">
                            <button class="view-btn">View Details</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>
<style scoped>
/* Page Header */
.page-header {
    /* background: linear-gradient(135deg, rgba(94, 69, 53, 0.95), rgba(147, 115, 94, 0.95)); */
    background-image: url('../assets/texture-bg01.jpg');
    color: black;
    padding: 40px 5%;
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    text-align: center;
}

.header-content h1 {
    font-size: 42px;
    font-weight: 700;
    margin: 0 auto 10px;
    letter-spacing: -0.5px;
}

.header-content p {
    font-size: 16px;
    margin: 0 auto;
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


/* Products Section */
.products-section {
    padding: 100px 0;
    background: white;
}

.products-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 32px;
}

.product-card {
    background: white;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
    cursor: pointer;
}

.product-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.product-image {
    position: relative;
    height: 250px;
    overflow: hidden;
}

.product-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
}

.product-card:hover .product-image img {
    transform: scale(1.1);
}

.difficulty-badge {
    position: absolute;
    top: 12px;
    right: 12px;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
    background: white;
    color: #2d2d2d;
}

.difficulty-badge.beginner {
    background: #4ecdc4;
    color: white;
}

.difficulty-badge.intermediate {
    background: #ff9f43;
    color: white;
}

.product-details {
    padding: 24px;
}

.product-details h3 {
    font-size: 1.4rem;
    color: #2d2d2d;
    margin-bottom: 8px;
}

.product-desc {
    font-size: 0.95rem;
    color: #666;
    margin-bottom: 16px;
    line-height: 1.5;
}

.product-meta {
    display: flex;
    gap: 16px;
    margin-bottom: 20px;
}

.meta-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.9rem;
    color: #666;
}

.meta-item .icon {
    font-size: 1.1rem;
}

.product-footer {
    display: flex;
    justify-content: flex-end;
    align-items: center;
}

.view-btn {
    padding: 10px 24px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.view-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}
</style>