<script setup>
import { ref, onMounted } from 'vue';
import VideoCard from '../components/video-card.vue';
import KitCraftAds from '../components/kitcraft-ads.vue';
// import RecommendedItemSlider from '../components/recommended-item-slider.vue';
import CalenderSection from '../components/calender-section.vue';
import HistoryMap from '../components/history-map.vue';
import AutoScrollBanner from '../components/auto-scroll-banner.vue';
import FeaturedCategories from '../components/featured-categories.vue';

// Function for the button
const handleQuickView = (item) => {
  console.log('Viewing:', item.title);
};
</script>
<template>
  <div class="content">

    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-content">
        <div class="hero-text">
          <h1 class="hero-title">Kitcharoen Craft & Sewing Supplies</h1>
          <p class="hero-subtitle">Trusted materials, honest prices, and friendly service from Sampeng Market, Bangkok.
            Since 1984
          </p>
          <div class="hero-buttons">
            <router-link :to="'/orderpage'" class="no-style">
              <button class="cta-primary">Shop Now</button>
            </router-link>
            <router-link :to="'/catalog'" class="no-style">
              <button class="cta-secondary">View Catalog</button>
            </router-link>
          </div>
        </div>
        <div class="hero-decoration">
          <div class="floating-card-container container-group-1">
            <div class="floating-card card-1">
              <img src="../assets/card-img09.jpg" alt="">
            </div>
            <div class="floating-card card-2">
              <img src="../assets/card-img01.jpg" alt="">
            </div>
            <div class="floating-card card-3">
              <img src="../assets/card-img07.jpg" alt="">
            </div>
            <!-- <div class="floating-card card-4">
              <img src="../assets/card-img06.jpg" alt="">
            </div> -->
          </div>
          <div class="floating-card-container container-group-2">
            <div class="floating-card card-5">
              <img src="../assets/card-img09.jpg" alt="">
            </div>
            <div class="floating-card card-6">
              <img src="../assets/card-img06.jpg" alt="">
            </div>
          </div>
          <div class="floating-card-container container-group-3">
            <div class="floating-card card-7">
              <img src="../assets/card-img09.jpg" alt="">
            </div>
            <div class="floating-card card-8">
              <img src="../assets/card-img09.jpg" alt="">
            </div>
            <div class="floating-card card-9">
              <img src="../assets/card-img09.jpg" alt="">
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- About us / History / Location -->
    <HistoryMap />

    <!-- Video Card Display -->
    <VideoCard />

    <!-- <RecommendedItemSlider /> -->

    <!-- Featured Categories -->
    <FeaturedCategories />

    <!-- KitCraft Instagram Ads -->
    <KitCraftAds />

    <!-- Auto Item Scroll Banner -->
    <AutoScrollBanner />

    <!-- Calender -->
    <CalenderSection />

    <!-- Promotional Banner -->
    <section class="promo-section">
      <div class="promo-content">
        <h1>Special Offer!</h1>
        <p>Get 20% off on all yarn products this week</p>
        <button class="promo-button">Shop Sale Items</button>
      </div>
    </section>
  </div>
</template>


<style scoped>
* {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.content {
  padding: 0;
  margin: 0;
  background: #fafafa;
}

/* ===== HERO SECTION ===== */
.hero-section {
  /* background: linear-gradient(135deg, #8b6f47 0%, #b89968 50%, #d4a574 100%); */
  background: url('../assets/shop02.jpg');
  background-size: contain;
  background-position: center;
  min-height: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  /* overflow: hidden; */
}

.hero-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="2" fill="rgba(255,255,255,0.1)"/></svg>');
  opacity: 0.3;
}

.hero-content {
  max-width: 1300px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 40px;
  position: relative;
  z-index: 1;
}

.hero-text {
  flex: 1;
  color: black;
}

.hero-title {
  font-size: 64px;
  font-weight: 800;
  line-height: 1.2;
  margin: 0 0 20px 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
  animation: fadeInUp 0.8s ease;
}

.hero-subtitle {
  font-size: 20px;
  font-weight: 400;
  line-height: 1.6;
  margin: 0 0 40px 0;
  opacity: 0.95;
  animation: fadeInUp 0.8s ease 0.2s backwards;
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
  border: 2px solid white;
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
@media (max-width: 768px) {
  .hero-content {
    flex-direction: column;
    text-align: center;
  }

  .hero-title {
    font-size: 36px;
  }

  .hero-decoration {
    display: none;
  }

  .section-header-wrapper {
    flex-direction: column;
    gap: 20px;
  }

  .search-bar input {
    width: 200px;
  }
}
</style>
