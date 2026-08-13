<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import InstagramSection from '../components/InstagramSection.vue';
import FeaturedCategories from '../components/featured-categories.vue';
import customerReview from '../components/customer-review.vue';
import InfoBanner from '../components/info-banner.vue';
import SectionNav from '../components/section-nav.vue';
import FeaturedProject from '../components/featured-project.vue';
import NewArrivals from '../components/new-arrivals.vue';
import LatestProjects from '../components/latest-projects.vue';
import ColorSpotlight from '../components/color-spotlight.vue';
import CreatorGallery from '../components/creator-gallery.vue';
import { getUtilsUrl } from '../services/api';
import { defaultLang } from '../utils/localeRoutes';

const { t } = useI18n();
const route = useRoute();
const currentLang = computed(() => route.params.lang || defaultLang);

// Section navigator (right-side mini-map rail)
const sections = computed(() => [
  { id: 'home-featured',   label: t('home.nav.featured') },
  { id: 'home-new',        label: t('home.nav.newArrivals') },
  { id: 'home-categories', label: t('home.nav.categories') },
  { id: 'home-color',      label: t('home.nav.color') },
  { id: 'home-articles',   label: t('home.nav.articles') },
  { id: 'home-reviews',    label: t('home.nav.makers') },
  { id: 'home-promo',      label: t('home.nav.promo') },
]);

// ── Hero Carousel ──────────────────────────────
// Bump BANNER_VERSION whenever you re-upload a banner to R2 under the same name.
// Four slides, not six: at a 10s interval nobody ever reached the last two.
const BANNER_VERSION = 4;
const slides = [
  getUtilsUrl('banner-main-large.webp', BANNER_VERSION),
  getUtilsUrl('banner-yarn-large.webp', BANNER_VERSION),
  getUtilsUrl('banner-beads-large.webp', BANNER_VERSION),
  getUtilsUrl('banner-tools-large.webp', BANNER_VERSION)
];

const currentSlide = ref(0);
let slideInterval = null;
let touchStartX = 0;

const nextSlide = () => { currentSlide.value = (currentSlide.value + 1) % slides.length; };
const prevSlide = () => { currentSlide.value = (currentSlide.value - 1 + slides.length) % slides.length; };
const goToSlide = (i) => { currentSlide.value = i; };

const restartSlideInterval = () => {
  if (slideInterval) clearInterval(slideInterval);
  slideInterval = setInterval(nextSlide, 10000);
};

const onTouchStart = (e) => { touchStartX = e.touches[0].clientX; };
const onTouchEnd = (e) => {
  const diff = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 50) diff > 0 ? nextSlide() : prevSlide();
  restartSlideInterval();
};

onMounted(() => { restartSlideInterval(); });

onUnmounted(() => { if (slideInterval) clearInterval(slideInterval); });
</script>
<template>
  <div class="content">

    <!-- Info Banner -->
    <InfoBanner :badge="$t('home.bannerBadge')" :text="$t('home.bannerText')" />

    <!-- The hero is this page's LCP but it is a CSS background, which the
         preload scanner never sees. This hidden copy gets it fetched early, the
         same trick EventPage and ContactUsPage already use. -->
    <img :src="slides[0]" fetchpriority="high" aria-hidden="true" alt=""
      style="position: absolute; width: 0; height: 0; overflow: hidden; z-index: -1;">

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

    <!-- Weekly Featured Project: the page's freshness anchor, straight below the
         hero so a returning visitor sees what changed without scrolling. -->
    <div id="home-featured" class="home-anchor">
      <FeaturedProject />
    </div>

    <!-- New Arrivals: derived from products.created_at, so it refreshes itself. -->
    <div id="home-new" class="home-anchor">
      <NewArrivals />
    </div>

    <!-- Featured Categories -->
    <div id="home-categories" class="home-anchor">
      <FeaturedCategories />
    </div>

    <!-- Color of the Month: one admin action changes it, and the band tints
         itself from the chosen hex, so the change is visible at a glance. -->
    <div id="home-color" class="home-anchor">
      <ColorSpotlight />
    </div>

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

    <!-- Heritage strip. The full story lives on the About page; here it gets only
         enough room to establish provenance and point onward. -->
    <section id="home-about" class="about-strip">
      <p class="about-strip-eyebrow">{{ $t('about.eyebrow') }}</p>
      <p class="about-strip-line">{{ $t('about.subtitle') }}</p>
      <router-link :to="{ name: 'about', params: { lang: currentLang } }" class="about-strip-link">
        {{ $t('about.readStory') }}
        <span aria-hidden="true">&rarr;</span>
      </router-link>
    </section>

    <!-- Latest from KitCraft: three-card teaser, full archive on the events page -->
    <div id="home-articles" class="home-anchor">
      <LatestProjects />
    </div>

    <!-- KitCraft Instagram Ads -->
    <div id="home-instagram" class="home-anchor">
      <InstagramSection />
    </div>

    <!-- From our makers. Community photos and customer words are the same claim
         made two ways, so they share one band and one heading instead of becoming
         a third social block below the Instagram one. -->
    <section id="home-reviews" class="home-anchor makers-band">
      <div class="makers-head">
        <p class="makers-eyebrow">{{ $t('home.makersEyebrow') }}</p>
        <h2 class="makers-title">{{ $t('home.makersTitle') }}</h2>
      </div>

      <CreatorGallery
        class="makers-gallery"
        :limit="8"
        :show-heading="false"
        :show-submit-prompt="false"
        bare
      />

      <customerReview />
    </section>

    <!-- Wholesale. This slot used to carry a generic "special offer" pointing at
         the catalog; wholesale is the actual business, so it says so and routes
         to the partners page. -->
    <section class="promo-section" id="home-promo">
      <div class="promo-content">
        <h2>{{ $t('home.wholesaleTitle') }}</h2>
        <p>{{ $t('home.wholesaleText') }}</p>
        <router-link :to="{ name: 'partners', params: { lang: currentLang } }" class="no-style">
          <button class="promo-button">{{ $t('home.wholesaleCta') }}</button>
        </router-link>
      </div>
    </section>

    <!-- Section Navigator: right-side mini-map rail -->
    <SectionNav :sections="sections" />
  </div>
</template>


<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400;600&family=Prompt:wght@300;400;500;600;700&family=Work+Sans:wght@300;400;500;600&display=swap');

* {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}


.content {
  padding: 0;
  margin: 0;
  background-color: #FBF7F2;
}

/* Keep section headings clear of the sticky navbar when scrolled to via the rail */
.home-anchor,
.about-strip,
.promo-section {
  scroll-margin-top: 90px;
}

/* ===== FROM OUR MAKERS ===== */
/* One band, two kinds of proof: photos of what people made, then what they said
   about it. customerReview brings its own padding, so this only owns the header
   and the gallery strip above it. */
.makers-band {
  background: #FBF7F2;
  padding-top: clamp(40px, 5vw, 70px);
}

.makers-head {
  max-width: 1200px;
  margin: 0 auto 22px auto;
  padding: 0 5%;
  text-align: center;
}

.makers-eyebrow {
  margin: 0 0 8px 0;
  font-family: 'Work Sans', sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #8b6f47;
}

.makers-title {
  margin: 0;
  font-family: 'Crimson Pro', serif;
  font-size: clamp(1.7rem, 3vw, 2.3rem);
  font-weight: 600;
  line-height: 1.15;
  color: #4a3529;
}

.makers-gallery {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 5%;
}

/* ===== HERITAGE STRIP ===== */
/* Deliberately small. It exists to say "since 1984" and hand off to the About
   page, not to retell the story on a page that has products to show. */
.about-strip {
  padding: 40px 5%;
  text-align: center;
  background: #FBF7F2;
  border-top: 1px solid #eee0d0;
  border-bottom: 1px solid #eee0d0;
}

.about-strip-eyebrow {
  margin: 0 0 10px 0;
  font-family: 'Work Sans', sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #8b6f47;
}

.about-strip-line {
  margin: 0 auto 16px auto;
  max-width: 620px;
  font-family: 'Crimson Pro', serif;
  font-size: 26px;
  line-height: 1.35;
  color: #604539;
}

.about-strip-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: 'Work Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #8b6f47;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: color 0.2s, border-color 0.2s;
}

.about-strip-link:hover {
  color: #DD876E;
  border-bottom-color: #DD876E;
}

@media (max-width: 640px) {
  .about-strip {
    padding: 30px 20px;
  }

  .about-strip-line {
    font-size: 21px;
  }
}

/* ===== HERO CAROUSEL ===== */
.hero-carousel {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  /* The floor matters: with only an aspect ratio, a narrow viewport shrinks the
     section to width/1.78 (about 219px on a phone) while the content still asks
     for its padding, heading, subtitle and buttons — which then overflow and get
     clipped by the overflow:hidden above. */
  min-height: 440px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  image-rendering: high-quality;
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
  font-weight: 400;
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
@media (max-width: 1024px) {
  .hero-carousel { max-height: 70vh; }
  .feature-bar { grid-template-columns: repeat(2, 1fr); }
  .carousel-arrow { width: 40px; height: 40px; }
}

@media (max-width: 768px) {
  /* Height follows the viewport rather than the image ratio, the way the Events
     hero already does it, so the section can never collapse under its content. */
  .hero-carousel {
    aspect-ratio: auto;
    min-height: 68svh;
    max-height: none;
  }

  /* The base overlay fades left-to-right, which suited left-aligned copy. The
     text is centred at this width, so it would sit over the transparent half —
     switch to the radial the Events hero uses. */
  .carousel-overlay {
    background: radial-gradient(
      circle at center,
      rgba(250, 244, 236, 0.84) 0%,
      rgba(80, 60, 45, 0.18) 60%,
      rgba(40, 28, 20, 0.34) 100%
    );
  }

  .hero-content {
    padding: 40px 20px;
    text-align: center;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .hero-text { max-width: 100%; }

  .hero-eyebrow { justify-content: center; }

  .hero-title {
    font-size: clamp(1.9rem, 7vw, 2.6rem);
    margin-bottom: 12px;
  }

  .hero-subtitle {
    font-size: clamp(0.9rem, 3.2vw, 1.1rem);
    text-indent: 0;
    margin-bottom: 20px;
    margin-left: auto;
    margin-right: auto;
  }

  .hero-buttons { justify-content: center; flex-wrap: wrap; gap: 12px; }

  .cta-primary,
  .cta-secondary { padding: 12px 28px; font-size: 15px; }

  .carousel-arrow { display: none; }

  .feature-bar {
    grid-template-columns: 1fr;
    padding: 30px 24px;
  }
}

@media (max-width: 480px) {
  .hero-carousel { min-height: 72svh; }

  .hero-content { padding: 32px 18px; }

  .hero-title { font-size: 1.85rem; }

  .hero-buttons { flex-direction: column; width: 100%; }

  .cta-primary,
  .cta-secondary { width: 100%; }
}

@media (hover: none) {
  .cta-primary:hover,
  .cta-secondary:hover { transform: none; }
}
</style>
