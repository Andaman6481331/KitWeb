<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import VideoCard from '../components/video-card.vue';
import InstagramSection from '../components/InstagramSection.vue';
// import RecommendedItemSlider from '../components/recommended-item-slider.vue';
// import CalenderSection from '../components/calender-section.vue';
import AboutKitcharoen from '../components/AboutKitcharoen.vue';
import AutoScrollBanner from '../components/auto-scroll-banner.vue';
import FeaturedCategories from '../components/featured-categories.vue';
import customerReview from '../components/customer-review.vue';
import { api, getUtilsUrl } from '../services/api';
import { codeToPath, defaultLang } from '../utils/localeRoutes';

const products = ref([]);
const route = useRoute();
const currentLang = computed(() => route.params.lang || defaultLang);
const loading = ref(true);

onMounted(async () => {
  try {
    products.value = await api.getProducts();
  } catch (error) {
    console.error('Error loading products:', error);
  } finally {
    loading.value = false;
  }
});
</script>
<template>
  <div class="content">

    <!-- Hero Section -->
    <img :src="getUtilsUrl('shop02-large.webp')" fetchpriority="high" aria-hidden="true" style="position: absolute; width: 0; height: 0; overflow: hidden; z-index: -1;">
    <section class="hero-section" :style="{ backgroundImage: `url(${getUtilsUrl('shop02-large.webp')})` }">
      <div class="hero-content">
        <div class="hero-text">
          <div class="hero-eyebrow">{{ $t('home.eyebrow') }}</div>
          <h1 class="hero-title">{{ $t('home.heroTitle') }}</h1>
          <p class="hero-subtitle">{{ $t('home.heroSubtitle') }}
          </p>
          <div class="hero-buttons">
            <router-link :to="{ name: 'orderpage', params: { lang: currentLang } }" class="no-style">
              <button class="cta-primary">{{ $t('home.shopNow') }}</button>
            </router-link>
            <router-link :to="{ name: 'catalog', params: { lang: currentLang } }" class="no-style">
              <button class="cta-secondary">{{ $t('home.viewCatalog') }}</button>
            </router-link>
          </div>
        </div>
        <div class="hero-decoration">
          <div class="floating-card-container container-group-1">
            <div class="floating-card card-1">
              <img :src="getUtilsUrl('card-img09-thumb.webp')" alt="">
            </div>
            <div class="floating-card card-2">
              <img :src="getUtilsUrl('card-img01-thumb.webp')" alt="">
            </div>
            <div class="floating-card card-3">
              <img :src="getUtilsUrl('card-img07-thumb.webp')" alt="">
            </div>
            <!-- <div class="floating-card card-4">
              <img src="../assets/card-img06.webp" alt="">
            </div> -->
          </div>
          <div class="floating-card-container container-group-2">
            <div class="floating-card card-5">
              <img :src="getUtilsUrl('card-img09-thumb.webp')" alt="">
            </div>
            <div class="floating-card card-6">
              <img :src="getUtilsUrl('card-img06-thumb.webp')" alt="">
            </div>
          </div>
          <div class="floating-card-container container-group-3">
            <div class="floating-card card-7">
              <img :src="getUtilsUrl('card-img09-thumb.webp')" alt="">
            </div>
            <div class="floating-card card-8">
              <img :src="getUtilsUrl('card-img09-thumb.webp')" alt="">
            </div>
            <div class="floating-card card-9">
              <img :src="getUtilsUrl('card-img09-thumb.webp')" alt="">
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- About us / History / Location -->
    <AboutKitcharoen />

    <!-- Video Card Display -->
    <VideoCard />

    <!-- <RecommendedItemSlider /> -->

    <!-- Featured Categories -->
    <FeaturedCategories />

    <!-- KitCraft Instagram Ads -->
    <InstagramSection />

    <!-- Auto Item Scroll Banner -->
    <AutoScrollBanner />

    <!-- Customer Review -->
    <customerReview />

    <!-- Promotional Banner -->
    <section class="promo-section">
      <div class="promo-content">
        <h1>{{ $t('home.specialOffer') }}</h1>
        <p>{{ $t('home.promoText') }}</p>
        <button class="promo-button">{{ $t('home.shopSale') }}</button>
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

/* ===== HERO SECTION ===== */
.hero-section {
    /* background: url('../assets/shop02.jpg'); */
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center center;
    min-height: 600px;
    height: auto;
    padding: 60px 0;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
}

.hero-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to right, rgba(53, 35, 29, 0.85) 0%, rgba(53, 35, 29, 0.5) 35%, transparent 100%);
  z-index: 1;
}

.hero-content {
  max-width: 1180px;
  width: 100%;
  display: grid;
  grid-template-columns: 4fr 1fr;
  gap: 40px;
  position: relative;
  z-index: 2;
  padding: 0 40px;
}

.hero-text {
  flex: 1;
  min-width: 280px;
  color: #ffffff;
  padding-right: 16px;
}
.hero-eyebrow {
  color: #ffffff;
  font-weight: 600;
  font-size: clamp(1rem, 2.2vw, 1.35rem);
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 8px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.hero-title {
  font-family: 'Crimson Pro', serif;
  font-size: clamp(2.2rem, 6vw, 3.6rem);
  font-weight: 600;
  line-height: 1.1;
  margin: 0 0 20px 0;
  text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.3);
  animation: fadeInUp 0.8s ease;
  max-width: 720px;
}

.hero-subtitle {
  font-family: 'Work Sans', sans-serif;
  font-size: clamp(0.9rem, 2.0vw, 1.2rem);
  font-weight: 400;
  line-height: 1.6;
  margin: 0 0 32px 0;
  opacity: 0.95;
  animation: fadeInUp 0.8s ease 0.2s backwards;
  max-width: 620px;
  text-indent: 1rem;
}

.hero-buttons {
  display: flex;
  gap: 20px;
  animation: fadeInUp 0.8s ease 0.4s backwards;
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
  background: white;
  color: #8b6f47;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.cta-primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
}

.cta-secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  backdrop-filter: blur(10px);
}

.cta-secondary:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-3px);
}

.hero-decoration {
  flex: 1;
  position: relative;
  height: 400px;
}

.floating-card-container {
  position: absolute;
  top: 0;
  left: -40px;
  width: 100%;
  height: 100%;
  opacity: 0;
  /* Hidden by default */
  /* 16s total duration (8s per group), infinite loop */
  animation: fade-in-up-sequence 24s infinite;
}

/* Group 2 starts halfway through the 16s cycle */
.container-group-2 {
  animation-delay: 8s;
}

.container-group-3 {
  animation-delay: 16s;
}

@keyframes fade-in-up-sequence {

  /* 0-5%: Fade In and Move Up */
  0% {
    opacity: 0;
    transform: translateY(30px);
    pointer-events: none;
  }

  5% {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }

  /* 5-28%: Stay Visible */
  30% {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }

  /* 28-33%: Fade Out and continue moving Down slightly */
  33% {
    opacity: 0;
    transform: translateY(20px);
    pointer-events: none;
  }

  /* 33-100%: Remain Hidden while other groups play */
  100% {
    opacity: 0;
    pointer-events: none;
  }
}

.floating-card {
  position: absolute;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  animation: float 6s ease-in-out infinite;
  overflow: hidden;
  display: flex;
  z-index: 99;
}

.floating-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-1 {
  width: 280px;
  height: 320px;
  top: 40px;
  right: -10px;
  animation-delay: 0s;
}

.card-2 {
  width: 250px;
  height: 280px;
  top: 200px;
  right: -120px;
  animation-delay: 2s;
}

.card-3 {
  width: 200px;
  height: 220px;
  top: 310px;
  right: 100px;
  animation-delay: 1.5s;
}

.card-4 {
  width: 200px;
  height: 200px;
  top: 410px;
  right: -20px;
  animation-delay: 1s;
}

.card-5 {
  width: 250px;
  height: 400px;
  top: 40px;
  right: -40px;
  animation-delay: 1s;
}

.card-6 {
  width: 200px;
  height: 200px;
  top: 280px;
  right: -120px;
  animation-delay: 2s;
}

.card-7 {
  width: 220px;
  height: 280px;
  top: 40px;
  right: -40px;
  animation-delay: 1s;
}

.card-8 {
  width: 220px;
  height: 220px;
  top: 180px;
  right: 130px;
  animation-delay: 2s;
}

.card-9 {
  width: 210px;
  height: 170px;
  top: 300px;
  right: 20px;
  animation-delay: 1.5s;
}

@keyframes float {

  0%,
  100% {
    transform: translateY(0px);
  }

  50% {
    transform: translateY(-10px);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
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
  background: linear-gradient(135deg, #ff6b6b, #ff9f43);
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
  color: #ff6b6b;
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
@media (max-width: 1200px) {
  .hero-content {
    padding: 0 32px;
    gap: 24px;
  }

  .hero-decoration {
    flex: 0.9;
  }
}

@media (max-width: 992px) {
  .hero-section {
    min-height: 520px;
    padding: 50px 0;
  }

  .hero-content {
    align-items: flex-start;
  }

  .hero-decoration {
    transform: scale(0.75);
    flex: 0.85;
  }
}

@media (max-width: 768px) {
  .hero-section {
    min-height: 470px;
    padding: 40px 0;
  }

  .hero-content {
    flex-direction: column;
    text-align: center;
    padding: 0 20px;
  }

  .hero-text {
    padding-right: 0;
  }

  .hero-title {
    font-size: clamp(1.9rem, 7vw, 2.6rem);
    margin-bottom: 18px;
  }

  .hero-subtitle {
    font-size: clamp(0.95rem, 3.2vw, 1.2rem);
    margin-bottom: 26px;
  }

  .hero-decoration {
    display: none;
  }

  .hero-buttons {
    justify-content: center;
    flex-wrap: wrap;
  }

  .cta-primary,
  .cta-secondary {
    padding: 12px 28px;
    font-size: 15px;
  }
}

@media (max-width: 480px) {
  .hero-title {
    font-size: 1.85rem;
  }

  .hero-buttons {
    flex-direction: column;
    width: 100%;
  }

  .cta-primary,
  .cta-secondary {
    width: 100%;
  }
}
</style>
