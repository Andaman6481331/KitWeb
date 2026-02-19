<script setup>
import { ref } from 'vue';

const diyProducts = ref([
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
    <!-- DIY Product Kits Section -->
    <section class="products-section">
        <div style="width: 100%; overflow: hidden; line-height: 0;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 120" preserveAspectRatio="none"
                style="width: 100%; height: 120px; display: block;">
                <path fill="#ffff"
                    d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,58.7C960,64,1056,64,1152,58.7C1248,53,1344,43,1392,37.3L1440,32L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z">
                </path>
            </svg>
        </div>
        <div class="container">

            <div class="section-header-wrapper">
                <div class="section-header">
                    <h2 class="section-title">Product Categories</h2>
                    <p class="section-subtitle">Browse by category</p>
                </div>
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
                            <div class="price">฿{{ product.price }}</div>
                            <button class="view-btn">View Details</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
/* Products Section */
.products-section {
    background-color: var(--primary-color);
    padding-bottom: 20px;
}

.products-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 32px;
    max-width: 1200px;
    margin: 0 auto;
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
    justify-content: space-between;
    align-items: center;
}

.price {
    font-size: 1.8rem;
    font-weight: 700;
    color: #ff6b6b;
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