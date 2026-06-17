<script setup>
import { ref } from 'vue';
import { getUtilsUrl } from '@/services/api';

const reviews = ref([
    {
        id: 1,
        tab: 'Craft Shop',
        name: 'Sabrina',
        role: 'Handicraft Shop Owner, France',
        review: '"Kitcharoen took the time to understand exactly what my shop needs. The threads are beautiful, strong, and consistently high quality. The pre-sales advice and ongoing support really stood out — they committed to working side-by-side with us and have more than delivered on that promise."',
        image: getUtilsUrl('customer-img01-large.webp'),
        stats: [
            { value: '10+', label: 'years sourcing craft supplies from Kitcharoen' },
            { value: '5★', label: 'rating across every single order placed' },
        ],
    },
    {
        id: 2,
        tab: 'Instructor',
        name: 'คุณ หน่อย',
        role: 'Craft Workshop Instructor, Thailand',
        review: '"ฉันจัดเวิร์กช็อปงานฝีมือมาหลายปีแล้ว และร้านกิจเจริญคือร้านที่สั่งประจำ ลูกปัดสีสวย วัสดุมีคุณภาพสม่ำเสมอ และจัดส่งตรงเวลาตลอด นักเรียนของฉันก็ชอบคุณภาพสินค้ามากค่ะ"',
        image: getUtilsUrl('customer-img02-large.webp'),
        stats: [
            { value: '30+', label: 'students served every month using these supplies' },
            { value: '100%', label: 'on-time delivery across all workshop orders' },
        ],
    },
    {
        id: 3,
        tab: 'Craft Studio',
        name: 'Sao Samui',
        role: 'Stationery, Craft & Café Owner, Thailand',
        review: '"เป็นลูกค้ากับทางร้านมาตั้งแต่รุ่นคุณแม่จนตอนนี้เป็นรุ่นลูกแล้วค่ะ สินค้ามีให้เลือกเยอะมากทั้งอุปกรณ์งานฝีมือและไหมพรมคุณภาพดี ราคาเป็นกันเอง ประทับใจมากค่ะ"',
        image: getUtilsUrl('customer-img03-large.webp'),
        stats: [
            { value: '2', label: 'generations of our family loyal to Kitcharoen' },
            { value: '40+', label: 'years of trusted partnership together' },
        ],
    },
    {
        id: 4,
        tab: 'Retail Store',
        name: 'Emily Carter',
        role: 'Retail Store Manager, United States',
        review: '"Great selection and very competitive pricing. We\'ve been ordering from Kitcharoen for our store for over a year now. The variety of products keeps our customers coming back — truly a reliable international partner we can count on."',
        image: getUtilsUrl('customer-img04-large.webp'),
        stats: [
            { value: '1 yr+', label: 'of consistent international orders fulfilled' },
            { value: '98%', label: 'customer satisfaction rate in our store' },
        ],
    },
]);

const currentIndex = ref(0);
</script>

<template>
    <section class="review-section">
        <!-- Section Header -->
        <div class="section-header" v-reveal>
            <p class="eyebrow">{{ $t('customerReview.eyebrow') || 'CUSTOMER STORIES' }}</p>
            <h2 class="section-title">{{ $t('customerReview.title') || 'What Our Customers Say' }}</h2>
        </div>

        <!-- Tabs -->
        <div class="tabs-row" v-reveal>
            <button
                v-for="(r, i) in reviews"
                :key="r.id"
                class="tab-btn"
                :class="{ active: i === currentIndex }"
                @click="currentIndex = i"
            >
                {{ r.tab }}
            </button>
        </div>

        <!-- Card -->
        <div class="card-outer" v-reveal>
            <Transition name="fade" mode="out-in">
                <div class="review-card" :key="reviews[currentIndex].id">
                    <!-- Left: photo -->
                    <div class="card-photo">
                        <img :src="reviews[currentIndex].image" :alt="reviews[currentIndex].name" />
                    </div>

                    <!-- Right: content -->
                    <div class="card-content">
                        <div class="quote-body">
                            <p class="review-text">{{ reviews[currentIndex].review }}</p>

                            <div class="reviewer-info">
                                <strong class="reviewer-name">{{ reviews[currentIndex].name }}</strong>
                                <span class="reviewer-role">{{ reviews[currentIndex].role }}</span>
                            </div>
                        </div>

                        <!-- Stats row inside card -->
                        <div class="card-stats">
                            <div
                                v-for="(stat, si) in reviews[currentIndex].stats"
                                :key="si"
                                class="stat-col"
                                :class="{ 'has-divider': si < reviews[currentIndex].stats.length - 1 }"
                            >
                                <span class="stat-value">{{ stat.value }}</span>
                                <span class="stat-label">{{ stat.label }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </Transition>
        </div>
    </section>
</template>

<style scoped>
.review-section {
    background: #FBF7F2;
    padding: 80px 0 80px;
}

/* ── Header ─────────────────────────────────── */
.section-header {
    text-align: center;
    padding: 0 24px;
    margin-bottom: 40px;
}

.eyebrow {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: #8b6f47;
    margin: 0 0 12px;
}

.section-title {
    font-family: 'ZCOOL XiaoWei', serif;
    font-size: 2.6rem;
    color: #604539;
    font-weight: 400;
    margin: 0;
    letter-spacing: -0.3px;
}

/* ── Tabs ────────────────────────────────────── */
.tabs-row {
    display: flex;
    justify-content: center;
    gap: 4px;
    margin-bottom: 28px;
    padding: 0 24px;
    flex-wrap: wrap;
}

.tab-btn {
    padding: 10px 28px;
    font-size: 0.9rem;
    font-weight: 500;
    color: #9e8272;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s ease;
    letter-spacing: 0.3px;
}

.tab-btn:hover {
    color: #604539;
}

.tab-btn.active {
    color: #3d2b1f;
    font-weight: 600;
    border-bottom-color: #DD876E;
}

/* ── Card Outer ──────────────────────────────── */
.card-outer {
    max-width: 1000px;
    margin: 0 auto;
    padding: 0 24px;
}

/* ── Review Card ─────────────────────────────── */
.review-card {
    display: grid;
    grid-template-columns: 420px 1fr;
    background: #fff;
    border-radius: 16px;
    border: 1px solid #ede4d9;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(80, 55, 35, 0.07);
}

/* ── Left Photo ──────────────────────────────── */
.card-photo {
    overflow: hidden;
    min-height: 420px;
}

.card-photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

/* ── Right Content ───────────────────────────── */
.card-content {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}

.quote-body {
    padding: 48px 44px 32px;
    flex: 1;
}

.review-text {
    font-size: 1.05rem;
    line-height: 1.85;
    color: #4a3728;
    margin: 0 0 32px;
}

.reviewer-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.reviewer-name {
    font-size: 1rem;
    font-weight: 700;
    color: #3d2b1f;
}

.reviewer-role {
    font-size: 0.85rem;
    color: #DD876E;
}

/* ── Stats Row (inside card) ─────────────────── */
.card-stats {
    display: flex;
    border-top: 1px solid #ede4d9;
    margin: 0 44px;
    padding: 28px 0 36px;
    gap: 0;
}

.stat-col {
    flex: 1;
    padding: 0 24px 0 0;
}

.stat-col.has-divider {
    border-right: 1px solid #ede4d9;
    margin-right: 24px;
}

.stat-value {
    display: block;
    font-family: 'ZCOOL XiaoWei', serif;
    font-size: 2.4rem;
    font-weight: 400;
    color: #3d2b1f;
    line-height: 1.1;
    margin-bottom: 6px;
}

.stat-label {
    display: block;
    font-size: 0.8rem;
    color: #9e8272;
    line-height: 1.4;
}

/* ── Transition ──────────────────────────────── */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

/* ── Responsive ──────────────────────────────── */
@media (max-width: 860px) {
    .review-card {
        grid-template-columns: 1fr;
    }

    .card-photo {
        min-height: 280px;
        max-height: 320px;
    }
}

@media (max-width: 600px) {
    .section-title { font-size: 2rem; }

    .tab-btn {
        padding: 8px 16px;
        font-size: 0.82rem;
    }

    .quote-body { padding: 32px 24px 24px; }

    .card-stats {
        margin: 0 24px;
        padding: 20px 0 28px;
        flex-direction: column;
        gap: 20px;
    }

    .stat-col.has-divider {
        border-right: none;
        border-bottom: 1px solid #ede4d9;
        padding-bottom: 20px;
        margin-right: 0;
    }

    .stat-value { font-size: 2rem; }
}
</style>
