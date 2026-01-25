<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const reviews = ref([
    {
        id: 1,
        name: 'Siriwan P.',
        role: 'Small Business Owner',
        avatar: 'https://i.pravatar.cc/150?img=1',
        rating: 5,
        date: 'January 2025',
        review: 'KitCraft has transformed my business! The quality of their yarns is exceptional, and the wholesale prices allow me to maintain healthy margins. Their customer service is outstanding - always responsive and helpful.',
        image: 'src/assets/customer/customer-img01.jpg',
        product: 'Premium Yarn Collection'
    },
    {
        id: 2,
        name: 'Michael Chen',
        role: 'Craft Workshop Instructor',
        avatar: 'https://i.pravatar.cc/150?img=12',
        rating: 5,
        date: 'December 2024',
        review: 'I\'ve been running workshops for 3 years and KitCraft is my go-to supplier. The beads are vibrant, the materials are consistent, and they never let me down on delivery. My students love the quality!',
        image: 'src/assets/customer/customer-img02.jpg',
        product: 'Beaded Craft Supplies'
    },
    {
        id: 3,
        name: 'Natthida K.',
        role: 'Online Retailer',
        avatar: 'https://i.pravatar.cc/150?img=5',
        rating: 5,
        date: 'November 2024',
        review: 'As an online seller, reliable suppliers are crucial. KitCraft not only offers great products but also helps with packaging suggestions and marketing materials. They truly care about their partners\' success!',
        image: 'https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=600',
        product: 'DIY Craft Kits'
    },
    {
        id: 4,
        name: 'James Wilson',
        role: 'Retail Store Manager',
        avatar: 'https://i.pravatar.cc/150?img=15',
        rating: 4,
        date: 'October 2024',
        review: 'Great selection and competitive pricing. We\'ve been ordering from KitCraft for our store for over a year. The variety of products keeps our customers coming back. Would love to see more eco-friendly options!',
        image: 'https://images.unsplash.com/photo-1611337388484-18fb1b726dd6?w=600',
        product: 'Macramé Materials'
    },
    {
        id: 5,
        name: 'Pimchanok S.',
        role: 'DIY Enthusiast',
        avatar: 'https://i.pravatar.cc/150?img=9',
        rating: 5,
        date: 'September 2024',
        review: 'I attended their workshop and was so impressed I became a wholesale customer! The quality is unmatched and the team is incredibly knowledgeable. They even helped me start my own small craft business.',
        image: 'https://images.unsplash.com/photo-1452696193712-6cabf5103b63?w=600',
        product: 'Embroidery Supplies'
    }
]);

const currentIndex = ref(0);
const isAutoPlaying = ref(true);
let autoPlayInterval = null;

const currentReview = computed(() => reviews.value[currentIndex.value]);

const nextReview = () => {
    currentIndex.value = (currentIndex.value + 1) % reviews.value.length;
};

const prevReview = () => {
    currentIndex.value = currentIndex.value === 0 ? reviews.value.length - 1 : currentIndex.value - 1;
};

const goToReview = (index) => {
    currentIndex.value = index;
};

const startAutoPlay = () => {
    if (autoPlayInterval) clearInterval(autoPlayInterval);
    autoPlayInterval = setInterval(() => {
        if (isAutoPlaying.value) {
            nextReview();
        }
    }, 8000);
};

const toggleAutoPlay = () => {
    isAutoPlaying.value = !isAutoPlaying.value;
    if (isAutoPlaying.value) {
        startAutoPlay();
    }
};

onMounted(() => {
    startAutoPlay();
});

onUnmounted(() => {
    if (autoPlayInterval) clearInterval(autoPlayInterval);
});

const getStars = (rating) => {
    return '⭐'.repeat(rating);
};
</script>

<template>
    <section class="review-section">
        <div class="container">
            <div class="carousel-wrapper">
                <!-- Main Review Card -->
                <div class="review-card" :key="currentReview.id">
                    <div class="card-grid">
                        <!-- Left Side - Image -->
                        <div class="review-image">
                            <img :src="currentReview.image" :alt="currentReview.product" />
                            <div class="image-overlay">
                                <span class="product-tag">{{ currentReview.product }}</span>
                            </div>
                        </div>

                        <!-- Right Side - Content -->
                        <div class="review-content">

                            <div class="rating">
                                <span class="stars">{{ getStars(currentReview.rating) }}</span>
                                <span class="date">{{ currentReview.date }}</span>
                            </div>

                            <p class="review-text">{{ currentReview.review }}</p>

                            <div class="reviewer-info">
                                <img :src="currentReview.avatar" :alt="currentReview.name" class="avatar" />
                                <div class="reviewer-details">
                                    <h4 class="reviewer-name">{{ currentReview.name }}</h4>
                                    <p class="reviewer-role">{{ currentReview.role }}</p>
                                </div>
                                <div class="verified-badge">
                                    <span class="badge-icon">✓</span>
                                    Verified
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Navigation Controls -->
                <div class="carousel-controls">
                    <button class="nav-btn prev" @click="prevReview" aria-label="Previous review">
                        ‹
                    </button>

                    <div class="dots-container">
                        <button v-for="(review, index) in reviews" :key="review.id" class="dot"
                            :class="{ active: index === currentIndex }" @click="goToReview(index)"
                            :aria-label="`Go to review ${index + 1}`"></button>
                    </div>

                    <button class="nav-btn next" @click="nextReview" aria-label="Next review">
                        ›
                    </button>
                </div>

                <!-- Auto-play Toggle -->
                <button class="autoplay-toggle" @click="toggleAutoPlay" :class="{ paused: !isAutoPlaying }">
                    {{ isAutoPlaying ? '⏸' : '▶' }}
                </button>
            </div>

            <!-- Stats Section -->
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-number">5,000+</div>
                    <div class="stat-label">Happy Customers</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">4.9/5</div>
                    <div class="stat-label">Average Rating</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">98%</div>
                    <div class="stat-label">Satisfaction Rate</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">10+</div>
                    <div class="stat-label">Years in Business</div>
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
.review-section {
    padding: 20px 0;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 40px;
}

.carousel-wrapper {
    position: relative;
    margin-bottom: 20px;
}

/* Review Card */
.review-card {
    background: white;
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 10px 50px rgba(0, 0, 0, 0.1);
    animation: fadeSlideIn 0.5s ease;
}

@keyframes fadeSlideIn {
    from {
        opacity: 0;
        transform: translateY(20px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.card-grid {
    display: grid;
    grid-template-columns: 400px 1fr;
    height: 450px;
}

.review-image {
    position: relative;
    overflow: hidden;
}

.review-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.image-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 24px;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
}

.product-tag {
    display: inline-block;
    background: white;
    color: #2d2d2d;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 600;
}

.review-content {
    padding: 48px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: relative;
}

.rating {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
}

.stars {
    font-size: 1.3rem;
    letter-spacing: 4px;
}

.date {
    font-size: 0.9rem;
    color: #999;
}

.review-text {
    font-size: 1.15rem;
    line-height: 1.8;
    color: #444;
    margin-bottom: 32px;
    font-style: italic;
    position: relative;
    z-index: 1;
}

.reviewer-info {
    display: flex;
    align-items: center;
    gap: 16px;
}

.avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    object-fit: cover;
    border: 3px solid #e9ecef;
}

.reviewer-details {
    flex: 1;
}

.reviewer-name {
    font-size: 1.2rem;
    color: #2d2d2d;
    margin-bottom: 4px;
    font-weight: 700;
}

.reviewer-role {
    font-size: 0.95rem;
    color: #666;
}

.verified-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #e7f5ff;
    color: #1971c2;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
}

.badge-icon {
    width: 18px;
    height: 18px;
    background: #1971c2;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
}

/* Carousel Controls */
.carousel-controls {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 24px;
    margin-top: 32px;
}

.nav-btn {
    width: 50px;
    height: 50px;
    background: white;
    border: 2px solid #e9ecef;
    border-radius: 50%;
    font-size: 2rem;
    color: #2d2d2d;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
}

.nav-btn:hover {
    background: linear-gradient(135deg, #8b6f47, #b89968);
    color: white;
    border-color: #8b6f47;
    transform: scale(1.1);
}

.nav-btn.prev {
    padding-right: 3px;
}

.nav-btn.next {
    padding-left: 3px;
}

.dots-container {
    display: flex;
    gap: 12px;
}

.dot {
    width: 12px;
    height: 12px;
    background: #d9d9d9;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.3s ease;
}

.dot.active {
    background: linear-gradient(135deg, #8b6f47, #b89968);
    width: 32px;
    border-radius: 6px;
}

.dot:hover {
    background: #b89968;
}

.autoplay-toggle {
    position: absolute;
    top: 20px;
    right: 20px;
    width: 44px;
    height: 44px;
    background: white;
    border: 2px solid #e9ecef;
    border-radius: 50%;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.autoplay-toggle:hover {
    background: #f8f9fa;
    transform: scale(1.05);
}

.autoplay-toggle.paused {
    border-color: #8b6f47;
    color: #8b6f47;
}

/* Stats Grid */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 32px;
    padding: 40px;
    background: white;
    border-radius: 20px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.stat-item {
    text-align: center;
}

.stat-number {
    font-size: 2.5rem;
    font-weight: 700;
    background: linear-gradient(135deg, #8b6f47, #b89968);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 8px;
}

.stat-label {
    font-size: 1rem;
    color: #666;
    font-weight: 500;
}

/* Responsive */
@media (max-width: 1024px) {
    .card-grid {
        grid-template-columns: 1fr;
    }

    .review-image {
        height: 300px;
    }

    .review-content {
        padding: 32px;
    }

    .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 24px;
    }
}

@media (max-width: 640px) {
    .container {
        padding: 0 20px;
    }

    .section-header h2 {
        font-size: 2rem;
    }

    .review-content {
        padding: 24px;
    }

    .quote-icon {
        font-size: 4rem;
        top: 16px;
        right: 24px;
    }

    .review-text {
        font-size: 1rem;
    }

    .carousel-controls {
        gap: 16px;
    }

    .nav-btn {
        width: 44px;
        height: 44px;
        font-size: 1.5rem;
    }

    .stats-grid {
        grid-template-columns: 1fr;
        padding: 24px;
    }

    .stat-number {
        font-size: 2rem;
    }
}
</style>