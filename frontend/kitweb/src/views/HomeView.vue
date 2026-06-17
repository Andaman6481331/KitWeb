<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import VideoCard from '../components/video-card.vue';
import InstagramSection from '../components/InstagramSection.vue';
import AboutKitcharoen from '../components/AboutKitcharoen.vue';
import AutoScrollBanner from '../components/auto-scroll-banner.vue';
import FeaturedCategories from '../components/featured-categories.vue';
import customerReview from '../components/customer-review.vue';
import { api, getUtilsUrl } from '../services/api';
import { codeToPath, defaultLang } from '../utils/localeRoutes';
import ProductStock from '../components/products-stock.vue';

const products = ref([]);
const route = useRoute();
const currentLang = computed(() => route.params.lang || defaultLang);
const loading = ref(true);

// ── Hero Carousel ──────────────────────────────
const slides = [
  '/banner-main.png',
  '/banner-needles.png',
  '/banner-thread.png',
  '/banner-tools.png',
  '/banner-yarn.png',
];

const currentSlide = ref(0);
let slideInterval = null;
let touchStartX = 0;

const nextSlide = () => { currentSlide.value = (currentSlide.value + 1) % slides.length; };
const prevSlide = () => { currentSlide.value = (currentSlide.value - 1 + slides.length) % slides.length; };
const goToSlide = (i) => { currentSlide.value = i; };

const restartSlideInterval = () => {
  if (slideInterval) clearInterval(slideInterval);
  slideInterval = setInterval(nextSlide, 5000);
};

const onTouchStart = (e) => { touchStartX = e.touches[0].clientX; };
const onTouchEnd = (e) => {
  const diff = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 50) diff > 0 ? nextSlide() : prevSlide();
  restartSlideInterval();
};

onMounted(async () => {
  restartSlideInterval();
  try {
    products.value = await api.getProducts();
  } catch (error) {
    console.error('Error loading products:', error);
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => { if (slideInterval) clearInterval(slideInterval); });
</script>
<template>
  <div class="content">

    <!-- Hero Carousel -->
    <section
      class="hero-carousel"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <!-- Slide backgrounds -->
      <div
        v-for="(slide, i) in slides"
        :key="slide"
        class="carousel-slide"
        :class="{ active: i === currentSlide }"
        :style="{ backgroundImage: `url(${slide})` }"
      />

      <!-- Gradient overlay -->
      <div class="carousel-overlay" />

      <!-- Hero content -->
      <div class="hero-content">
        <div class="hero-text">
          <div class="hero-eyebrow">{{ $t('home.eyebrow') }}</div>
          <h1 class="hero-title">{{ $t('home.heroTitle') }}</h1>
          <p class="hero-subtitle">{{ $t('home.heroSubtitle') }}</p>
          <div class="hero-buttons">
            <router-link :to="{ name: 'orderpage', params: { lang: currentLang } }" class="no-style">
              <button class="cta-primary">{{ $t('home.shopNow') }}</button>
            </router-link>
            <router-link :to="{ name: 'catalog', params: { lang: currentLang } }" class="no-style">
              <button class="cta-secondary">{{ $t('home.viewCatalog') }}</button>
            </router-link>
          </div>
        </div>
      </div>

      <!-- Arrow buttons -->
      <button class="carousel-arrow carousel-arrow--prev" @click="prevSlide(); restartSlideInterval()" aria-label="Previous slide">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <button class="carousel-arrow carousel-arrow--next" @click="nextSlide(); restartSlideInterval()" aria-label="Next slide">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>

      <!-- Dot indicators -->
      <div class="carousel-dots">
        <button
          v-for="(_, i) in slides"
          :key="i"
          class="carousel-dot"
          :class="{ active: i === currentSlide }"
          @click="goToSlide(i); restartSlideInterval()"
          :aria-label="`Go to slide ${i + 1}`"
        />
      </div>
    </section>
      <div class="feature-bar">
    <div class="feature-item">
      <div class="icon-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            d="M3 10.5L12 3l9 7.5"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M5.5 9.5V20h13V9.5"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
      <div class="feature-text">
        <h4>{{$t('home.feature1Title')}}</h4>
        <p>{{$t('home.feature1Desc')}}</p>
      </div>
    </div>

    <div class="feature-item">
      <div class="icon-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="8.5" stroke-width="1.8" />
          <path
            d="M9.5 12l1.7 1.7L15 10"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
      <div class="feature-text">
        <h4>{{$t('home.feature2Title')}}</h4>
        <p>{{$t('home.feature2Desc')}}</p>
      </div>
    </div>

    <div class="feature-item">
      <div class="icon-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <!-- truck body -->
    <path
      d="M2.5 7.5h11v8h-11z"
      stroke-width="1.8"
      stroke-linejoin="round"
    />

    <!-- front cabin -->
    <path
      d="M13.5 10h4l3 3v2.5h-7z"
      stroke-width="1.8"
      stroke-linejoin="round"
    />

    <!-- wheels -->
    <circle cx="7" cy="18" r="1.8" fill="currentColor" />
    <circle cx="18" cy="18" r="1.8" fill="currentColor" />

    <!-- bottom line -->
    <path
      d="M2.5 18h2.7M8.8 18h7.4M19.8 18H21"
      stroke-width="1.8"
      stroke-linecap="round"
    />
  </svg>
      </div>
      <div class="feature-text">
        <h4>{{$t('home.feature3Title')}}</h4>
        <p>{{$t('home.feature3Desc')}}</p>
      </div>
    </div>

    <div class="feature-item">
      <div class="icon-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            d="M12 20s-6.5-4.3-8.5-8C1.7 8.8 3.5 5 7.5 5c2 0 3.2 1 4.5 2.5C13.3 6 14.5 5 16.5 5c4 0 5.8 3.8 4 7-2 3.7-8.5 8-8.5 8z"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
      <div class="feature-text">
        <h4>{{$t('home.feature4Title')}}</h4>
        <p>{{$t('home.feature4Desc')}}</p>
      </div>
    </div>
  </div>

    <!-- Featured Categories -->
    <FeaturedCategories />

    <!-- About us / History / Location -->
    <AboutKitcharoen />

    <!-- Video Card Display -->
    <VideoCard />

    <!-- Auto Item Scroll Banner -->
    <AutoScrollBanner />

    <!-- KitCraft Instagram Ads -->
    <InstagramSection />

    <!-- Customer Review -->
    <customerReview />

    <!-- Promotional Banner -->
    <section class="promo-section">
      <div class="promo-content">
        <h2>{{ $t('home.specialOffer') }}</h2>
        <p>{{ $t('home.promoText') }}</p>
        <router-link :to="{ name: 'catalog', params: { lang: currentLang } }" class="no-style">
          <button class="promo-button">{{ $t('home.shopSale') }}</button>
        </router-link>
      </div>
    </section>
  </div>
</template>


<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400;600&family=Work+Sans:wght@300;400;500;600&display=swap');

* {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}


.content {
  padding: 0;
  margin: 0;
  background-color: #FBF7F2;
}

/* ===== HERO CAROUSEL ===== */
.hero-carousel {
  position: relative;
  min-height: 620px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.carousel-slide {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0;
  transition: opacity 0.9s ease;
  will-change: opacity;
}

.carousel-slide.active {
  opacity: 1;
}

.carousel-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, rgba(243, 231, 215, 0.72) 0%, rgba(243, 231, 215, 0.2) 60%, transparent 100%);
  z-index: 1;
}

.hero-content {
  position: relative;
  z-index: 2;
  max-width: 1200px;
  width: 100%;
  padding: 80px 40px;
}

.hero-text {
  max-width: 600px;
}

.hero-eyebrow {
  color: #604539e0;
  font-weight: 600;
  font-size: clamp(0.9rem, 1.5vw, 1.2rem);
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 8px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.hero-eyebrow::before {
  content: '';
  width: 40px;
  height: 2px;
  background: #E7C9A2;
}

.hero-title {
  font-family: 'Crimson Pro', serif;
  font-size: clamp(2.2rem, 6vw, 3.6rem);
  color: #604539;
  font-weight: 500;
  line-height: 1.1;
  margin: 0 0 20px 0;
  max-width: 720px;
}

.hero-subtitle {
  font-family: 'Work Sans', sans-serif;
  font-size: clamp(0.9rem, 2vw, 1.2rem);
  color: #604539e0;
  font-weight: 400;
  line-height: 1.6;
  margin: 0 0 32px 0;
  max-width: 560px;
  text-indent: 1rem;
}

.hero-buttons {
  display: flex;
  gap: 20px;
}

.cta-primary,
.cta-secondary {
  padding: 16px 40px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.cta-primary {
  background: linear-gradient(135deg, #DD876E, #e6957c);
  color: white;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.cta-primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
}

.cta-secondary {
  background: rgba(255, 255, 255, 0.2);
  color: #604539;
  backdrop-filter: blur(10px);
  border: 1px solid #d9b585;
}

.cta-secondary:hover {
  background: rgba(255, 255, 255, 0.35);
  transform: translateY(-3px);
}

/* ── Arrow buttons ────────────────────────────── */
.carousel-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 3;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(6px);
  color: #604539;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.carousel-arrow svg { width: 20px; height: 20px; }

.carousel-arrow:hover {
  background: rgba(255, 255, 255, 0.55);
  border-color: rgba(255, 255, 255, 0.9);
}

.carousel-arrow--prev { left: 20px; }
.carousel-arrow--next { right: 20px; }

/* ── Dot indicators ───────────────────────────── */
.carousel-dots {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  display: flex;
  gap: 8px;
}

.carousel-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 0;
  transition: all 0.3s ease;
}

.carousel-dot.active {
  width: 24px;
  border-radius: 4px;
  background: #fff;
}

.carousel-dot:hover:not(.active) {
  background: rgba(255, 255, 255, 0.8);
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

.feature-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 40px;
  padding: 20px 10%;
  background: #f3e7d7;
  border-bottom: 1px solid #e7d9cb;
  
}

.feature-item {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  align-items: center;
  gap: 18px;
  background-color: #ffffff5a;
  border-radius: 12px;
  padding: 12px;
}

.icon-wrap {
  width: 2rem;
  height: 2rem;
  min-width: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8a6b56;
}

.icon-wrap svg {
  width: 26px;
  height: 26px;
}

.feature-text h4 {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: #5f493b;
  line-height: 1.3;
}

.feature-text p {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: #8f7a6b;
}

/* ===== SECTION HEADERS ===== */
.section-header {
  text-align: center;
  margin-bottom: 40px;
}

.section-title {
  font-size: 42px;
  font-weight: 700;
  color: #2d2d2d;
  margin: 0 0 10px 0;
}

.section-subtitle {
  font-size: 18px;
  color: #666;
  margin: 0;
  font-weight: 400;
}

/* ===== PROMO SECTION ===== */
.promo-section {
  background: linear-gradient(135deg, #604539, #8b6f47);
  padding: 80px 5%;
  text-align: center;
  color: white;
}

.promo-content h2 {
  font-size: 48px;
  font-weight: 800;
  margin: 0 0 16px 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
}

.promo-content p {
  font-size: 22px;
  margin: 0 0 32px 0;
  opacity: 0.95;
}

.promo-button {
  padding: 16px 48px;
  background: white;
  color: #604539;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.promo-button:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
}

/* ===== RESPONSIVE ===== */
@media (max-width: 992px) {
  .hero-carousel { min-height: 520px; }
  .feature-bar { grid-template-columns: repeat(2, 1fr); }
  .carousel-arrow { width: 40px; height: 40px; }
}

@media (max-width: 768px) {
  .hero-carousel { min-height: 460px; }

  .hero-content { padding: 60px 20px; text-align: center; }

  .hero-eyebrow { justify-content: center; }

  .hero-title {
    font-size: clamp(1.9rem, 7vw, 2.6rem);
    margin-bottom: 16px;
  }

  .hero-subtitle {
    font-size: clamp(0.9rem, 3.2vw, 1.1rem);
    text-indent: 0;
    margin-bottom: 24px;
  }

  .hero-buttons { justify-content: center; flex-wrap: wrap; }

  .cta-primary,
  .cta-secondary { padding: 12px 28px; font-size: 15px; }

  .carousel-arrow { display: none; }

  .feature-bar {
    grid-template-columns: 1fr;
    padding: 30px 24px;
  }
}

@media (max-width: 480px) {
  .hero-title { font-size: 1.85rem; }

  .hero-buttons { flex-direction: column; width: 100%; }

  .cta-primary,
  .cta-secondary { width: 100%; }
}
</style>
