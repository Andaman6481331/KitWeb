<script setup>
import { ref, computed } from 'vue';
import { getUtilsUrl } from '@/services/api';
import { useI18n } from 'vue-i18n';
import InfoBanner from '../components/info-banner.vue';
import SectionNav from '../components/section-nav.vue';

const { t } = useI18n();

// Hero text is now handled via i18n in the template

// Section navigator (right-side mini-map rail)
const sections = computed(() => [
  { id: 'partner-stats',     label: t('partner.nav.overview') },
  { id: 'partner-reasons',   label: t('partner.nav.reasons') },
  { id: 'partner-delivery',  label: t('partner.nav.delivery') },
  { id: 'partner-community', label: t('partner.nav.community') },
  { id: 'partner-cta',       label: t('partner.nav.contact') },
]);

const stats = ref([
    { number: '180+', label: 'Retail Partners' },
    { number: '42', label: 'Thai Provinces' },
    { number: '40+', label: 'Years Operating' },
    { number: '8', label: 'Countries Served' }
]);

const wallSection = ref({
    title: 'Our Thriving Community',
    subtitle: 'Celebrating the success of our partners and the creativity of our customers across the globe'
});

const wallImages = [
    getUtilsUrl('front01-large.webp'),
    getUtilsUrl('front02-large.webp'),
    getUtilsUrl('front03-large.webp'),
    getUtilsUrl('front04-large.webp'),
    getUtilsUrl('front05-large.webp'),
    getUtilsUrl('front06-large.webp'),
    getUtilsUrl('front07-large.webp'),
    getUtilsUrl('front08-large.webp'),
    getUtilsUrl('front09-large.webp'),
    getUtilsUrl('front10-large.webp'),
    getUtilsUrl('front11-large.webp'),
    getUtilsUrl('front12-large.webp'),
    getUtilsUrl('front13-large.webp'),
    getUtilsUrl('front14-large.webp')
];



function createCargoGroup(cargoCount, expressCount) {
    const group = {};
    
    // Generate the standard cargo keys (cargo1, cargo2...)
    for (let i = 1; i <= cargoCount; i++) {
        group[`cargo${i}`] = true;
    }
    
    // Generate the express keys (express1, express2...)
    for (let i = 1; i <= expressCount; i++) {
        group[`express${i}`] = true;
    }
    
    return group;
}

const deliveries = ref([
    {
        cargo: {
            // local has 5 cargo lines, 3 express lines
            local: createCargoGroup(5, 3), 
            // international has 9 cargo lines, 2 express lines
            international: createCargoGroup(9, 2),
        },
    },
]);

const reasons = ref([
    {
        number: '01',
        title: t('partner.reasonsTitle1'),
        description: t('partner.reasonsDescription1')
    },
    {
        number: '02',
        title: t('partner.reasonsTitle2'),
        description: t('partner.reasonsDescription2')
    },
    {
        number: '03',
        title: t('partner.reasonsTitle3'),
        description: t('partner.reasonsDescription3')
    },
    {
        number: '04',
        title: t('partner.reasonsTitle4'),
        description: t('partner.reasonsDescription4')
    }
]);

const cta = ref({
    title: 'Ready to Grow Together?',
    text: `Whether you're an established retailer or just starting out, we'd love to explore how we can support your business. Our team is here to answer questions, discuss possibilities, and build a partnership that works for you.`
});

const handleContactClick = () => {
    console.log('Contact button clicked');
    // Add your contact logic here
};

const handleLearnMoreClick = () => {
    console.log('Learn more button clicked');
    // Add your learn more logic here
};
</script>


<template>
    <div class="partners-reach-page">
        <!-- Info Banner -->
        <InfoBanner :badge="$t('partner.bannerBadge')" :text="$t('partner.bannerText')" />

        <!-- Hero Section -->
        <section class="hero" :style="{ backgroundImage: `url(${getUtilsUrl('shop03-large.webp')})` }">
            <div class="hero-content">
                <h1 v-reveal>{{ $t('partner.heroTitle') }}</h1>
                <p class="subtitle" v-reveal delay="0.5s">{{ $t('partner.heroSubtitle') }}</p>
            </div>
        </section>

        <!-- Statistics Section -->
        <section class="stats-section" id="partner-stats">
            <div class="container">
                <div class="stats-grid">
                    <div v-for="(stat, index) in stats" :key="index" class="stat">
                        <div class="stat-number">{{ stat.number }}</div>
                        <div class="stat-label">{{ stat.label }}</div>
                    </div>
                </div>
            </div>
        </section>
        
        <!-- Reasons We Work With Partners -->
        <section class="reasons-section" id="partner-reasons">
            <div class="container">
                <div class="section-header">
                    <p class="section-eyebrow">{{ $t('partner.reasonsEyebrow') }}</p>
                    <h2 class="section-title">{{ $t('partner.reasonsTitle') }}</h2>
                    <p class="section-subtitle">{{ $t('partner.reasonsSubtitle') }}</p>
                </div>
                <div class="reasons-steps">
                    <div v-for="reason in reasons" :key="reason.number" class="reasons-step">
                        <div class="reasons-step-number">{{ reason.number }}</div>
                        <div style="justify-content: flex-start; margin-left: 1.5rem; gap: 2rem;">
                            <div class="reasons-step-title">{{ reason.title }}</div>
                            <p class="reasons-step-description">{{ reason.description }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
        <div class="line-divider"></div>

        <!-- Delivery Section -->
        <section class="delivery-section" id="partner-delivery">
            <div class="container">
                <div class="section-header" style="text-align: center!important;">
                    <p class="section-eyebrow" style="margin-left: auto; margin-right: auto;">{{ $t('partner.deliveryEyebrow') }}</p>
                    <h2 class="section-title" style="margin-left: auto; margin-right: auto;">{{ $t('partner.deliveryTitle') }}</h2>
                    <p class="section-subtitle" style="margin-left: auto; margin-right: auto;">{{ $t('partner.deliverySubtitle') }}</p>
                </div>
                <div style="padding: 2rem 0;">
                    <div v-for="(delivery, deliveryIndex) in deliveries" :key="deliveryIndex" class="delivery-row-container">
                        <template v-for="(cargoGroup, groupName) in delivery.cargo" :key="groupName">
                            <div class="delivery-column">
                                <h1 style="font-size: 1.5rem; font-weight: 400; color: var(--accent-warm); margin: 0; text-align: center;">
                                    {{ $t(`partner.cargo.${groupName}.title`) }}
                                </h1>
                                <div style="display: flex; flex-direction: column; gap: 1rem;" class="delivery">
                                    <div>
                                        <h2 style="font-size: 1rem; font-weight: 600; color: var(--accent-warm); margin: 0 0 1rem 0;">
                                            {{ $t(`partner.cargo.${groupName}.subtitle`) }}
                                        </h2>
                                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem 0.5rem;">
                                            <template v-for="(companyValue, companyName) in cargoGroup" :key="companyName">
                                                <div v-if="companyName.startsWith('cargo')" class="cargo">
                                                    <p class="cargo-description">
                                                        {{ $t(`partner.cargo.${groupName}.${companyName}`) }}
                                                    </p>
                                                </div>
                                            </template>
                                        </div>
                                    </div>
                                    
                                </div>
                            </div>
                        </template>
                    </div>
                    <div style="border: 1px solid rgba(0, 0, 0, 0.1); padding: 1rem; border-radius: 1rem;">
                        <div v-for="(delivery, deliveryIndex) in deliveries" :key="deliveryIndex">
                            <template v-for="(cargoGroup, groupName) in delivery.cargo" :key="groupName">
                                <h2 style="font-size: 1.5rem; font-weight: 600; color: var(--accent-warm); margin: 0 0 1rem 0;">
                                    {{ $t(`partner.cargo.${groupName}.subtitle2`) }}
                                </h2>
                                <div style="display: flex; justify-content: center; gap: 2rem;">
                                    <template v-for="(companyValue, companyName) in cargoGroup" :key="companyName">
                                        <div v-if="companyName.startsWith('express')" class="express">
                                            <p class="cargo-description">
                                                {{ $t(`partner.cargo.${groupName}.${companyName}`) }}
                                            </p>
                                        </div>
                                    </template>
                                </div>
                            </template>
                        </div>
                    </div>
                    <div style="margin: 2rem auto 0;">
                        <p><span style="font-weight: 600;">{{ $t('partner.protipTitle') }}</span> {{ $t('partner.protipText') }}
                        </p>
                    </div>                   
                </div>
            </div>
        </section>
        <div class="line-divider"></div>

        <!-- Customer Image Wall -->
        <section class="image-wall-section" id="partner-community">
            <div class="container-fluid">
                <div class="container">
                    <div class="section-header">
                        <h2 class="section-title">{{ wallSection.title }}</h2>
                        <p style="margin: 0;">{{ wallSection.subtitle }}</p>
                    </div>
                </div>
                <div class="image-wall-container">
                    <!-- Row 1: Primary Row -->
                    <div class="image-wall-row row-1">
                        <div class="image-wall">
                            <div v-for="(img, index) in [...wallImages, ...wallImages]" :key="'r1-' + index"
                                class="wall-item">
                                <img :src="img" :alt="'Partner ' + index" loading="lazy" />
                            </div>
                        </div>
                    </div>
                    <!-- Row 2: Reversed, different speed -->
                    <div class="image-wall-row row-2">
                        <div class="image-wall">
                            <div v-for="(img, index) in [...wallImages.slice().reverse(), ...wallImages.slice().reverse()]"
                                :key="'r2-' + index" class="wall-item">
                                <img :src="img" :alt="'Partner ' + index" loading="lazy" />
                            </div>
                        </div>
                    </div>
                    <!-- Row 3: Slower, primary direction -->
                    <div class="image-wall-row row-3">
                        <div class="image-wall">
                            <div v-for="(img, index) in [...wallImages.slice(5), ...wallImages.slice(0, 5), ...wallImages.slice(5), ...wallImages.slice(0, 5)]"
                                :key="'r3-' + index" class="wall-item">
                                <img :src="img" :alt="'Partner ' + index" loading="lazy" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
        <div class="line-divider"></div>


        <!-- Call to Action -->
        <section class="cta-section" id="partner-cta">
            <div class="container">
                <div class="cta-content">
                    <h2 class="cta-title">{{ cta.title }}</h2>
                    <p class="cta-text">{{ cta.text }}</p>
                    <div class="cta-buttons">
                        <button @click="handleContactClick" class="btn btn-primary">Become a Partner</button>
                        <button @click="handleLearnMoreClick" class="btn btn-secondary">Learn More</button>
                    </div>
                </div>
            </div>
        </section>

        <!-- Section Navigator: right-side mini-map rail -->
        <SectionNav :sections="sections" />
    </div>
</template>


<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400;600&family=Work+Sans:wght@300;400;500;600&display=swap');

.partners-reach-page {
    --earth-dark: #4a3f35;
    --earth-medium: #8b7355;
    --earth-light: #c4a882;
    --earth-pale: #e8dcc8;
    --earth-cream: #f5f0e8;
    --accent-warm: #d4814e;
    --text-dark: #2d2520;
    --text-medium: #5d4e42;

    font-family: 'Work Sans', sans-serif;
    color: var(--text-dark);
    background: var(--earth-cream);
    line-height: 1.7;
    position: relative;

    /* Retint the shared section-nav rail to this page's warm accent */
    --sn-accent: var(--accent-warm);
}

/* Keep section headings clear of the sticky navbar when scrolled to via the rail */
.stats-section,
.reasons-section,
.delivery-section,
.image-wall-section,
.cta-section {
    scroll-margin-top: 90px;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

/* Same contract as the Events and Contact heroes. `contain` with no
   background-repeat tiled the image down the page on narrow viewports. */
.hero {
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    min-height: 60svh;
    display: flex;
    justify-content: center;
    flex-direction: column;
    align-items: center;
    text-align: center;
    position: relative;
    padding: 40px 20px;
}

@media (max-width: 768px) {
    .hero {
        min-height: 52svh;
        padding: 32px 18px;
    }
}

.hero::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
        radial-gradient(
            circle at center,
            rgba(250, 244, 236, 0.838) 0%,
            rgba(80, 60, 45, 0.18) 50%,
            rgba(40, 28, 20, 0.337) 100%
        );

    z-index: 1;
}


.hero-content {
    max-width: 900px;
    margin: 0 auto;
    position: relative;
    z-index: 1;
}



h1 {
    font-family: 'Crimson Pro', serif;
    font-size: 2.5rem;
    font-weight: 400;
    margin-bottom: 1.5rem;
    line-height: 1.2;
    letter-spacing: -0.02em;
    color: #604539;
}
.line-divider {
    height: 1px;
    margin: 0 10%;
    background: rgba(0, 0, 0, 0.06);
}
.subtitle {
    font-size: 1.3rem;
    font-weight: 300;
    opacity: 0.95;
    max-width: 700px;
    margin: 0 auto;
    color: #604539e0;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
}

.stats-section {
    background: white;
    padding: 4rem 2rem;
    margin-top: -3rem;
    position: relative;
    z-index: 2;
    box-shadow: 0 10px 40px rgba(74, 63, 53, 0.08);
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 3rem;
    max-width: 1000px;
    margin: 0 auto;
}

.stat {
    text-align: center;
    animation: fadeInUp 0.6s ease-out backwards;
}

.stat:nth-child(1) {
    animation-delay: 0.1s;
}

.stat:nth-child(2) {
    animation-delay: 0.2s;
}

.stat:nth-child(3) {
    animation-delay: 0.3s;
}

.stat:nth-child(4) {
    animation-delay: 0.4s;
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

.stat-number {
    font-family: 'Crimson Pro', serif;
    font-size: 3.5rem;
    font-weight: 600;
    color: var(--accent-warm);
    line-height: 1;
    margin-bottom: 0.5rem;
}

.stat-label {
    font-size: 0.95rem;
    color: var(--text-medium);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 500;
}

.image-wall-section {
    overflow: hidden;
    margin-top: 2rem;
}


.image-wall-container {
    width: 100%;
    overflow: hidden;
    padding: 0 0 3rem 0;
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 24px;
    object-fit: contain;
}

.image-wall-container::before,
.image-wall-container::after {
    content: '';
    position: absolute;
    top: 0;
    width: 20px;
    height: 100%;
    z-index: 2;
    pointer-events: none;
}

.image-wall-container::before {
    left: 0;
    background: linear-gradient(to right, var(--earth-pale), transparent);
}

.image-wall-container::after {
    right: 0;
    background: linear-gradient(to left, var(--earth-pale), transparent);
}

.image-wall-row {
    width: 100%;
}

.image-wall {
    display: flex;
    gap: 24px;
    width: max-content;
    padding-right: 24px;
}

.row-1 .image-wall {
    animation: scroll 65s linear infinite;
}

.row-2 .image-wall {
    animation: scroll 55s linear infinite reverse;
}

.row-3 .image-wall {
    animation: scroll 70s linear infinite;
}

.wall-item {
    position: relative;
    overflow: hidden;
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(74, 63, 53, 0.1);
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 0;
}

/* Different heights per row to create Masonry effect */
.row-1 .wall-item {
    height: 200px;
}

.row-2 .wall-item {
    height: 180px;
}

.row-3 .wall-item {
    height: 240px;
}


.wall-item img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    transition: transform 1s ease;
}


@keyframes scroll {
    0% {
        transform: translateX(0);
    }

    100% {
        transform: translateX(-50%);
    }
}

.delivery-section {
    padding: 2rem;
    text-align: center;
}

.delivery-section h2 {
    font-size: 42px;
    font-weight: 700;
    color: var(--text-dark-color);
    letter-spacing: -0.5px;
}

.delivery-row-container {
    display: flex; 
    flex-direction: row; 
    gap: 1.5rem; /* Increased gap for cleaner professional spacing */
    width: 100%;
}

.delivery-column {
    display: flex; 
    flex-direction: column; 
    gap: 1rem; 
    margin-bottom: 1rem;
    flex: 1;          /* Forces columns to share space 50/50 or 33/33 perfectly */
    min-width: 0;     /* Prevents text overflow from expanding the column width */
}

.delivery {
    border: 1px solid rgba(0, 0, 0, 0.1);
    padding: 0.5rem 1rem;
    border-radius: 6px;
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}

.cargo-description {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-medium);
    margin-bottom: 0.5rem;
    border-radius: 0.5rem;
    padding: 0.5rem;
    background-color: rgba(232, 220, 200, 0.5);
    &:hover {
        cursor: pointer;
    }
}



.section-header {
    padding: 1rem 0;
    text-align: left;
    display: flex;
    flex-direction: column;
}

.section-eyebrow {
    display: inline-flex;
    gap: 1rem;
    font-size: 1rem;
    color: var(--text-medium);
    margin: 0 0 10px 0;
    letter-spacing: 0.05em;
}

.section-title {
    display: inline-flex;
    gap: 1rem;
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-dark-color);
    margin: 0 0 10px 0;
    letter-spacing: -0.5px;
}

.section-subtitle {
    display: inline-flex;
    color: var(--text-medium);
    margin: 0;
}

.reasons-section {
    text-align: center;
}

.reasons-steps {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin-left: auto;
    margin-right: auto;
    padding-bottom: 2rem;
    gap: 1rem;
}

.reasons-step {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    margin: auto;
    padding: 1rem;
    text-align: justify;
    margin-bottom: 0.5rem;
    border-radius: 1rem;
    border: 1px solid rgba(0, 0, 0, 0.1);
}

.reasons-step-number {
    width: 90px !important;
    height: 60px !important;
    padding: 0.5rem;
    background: var(--earth-pale);
    color: white;
    border-radius: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.8rem;
    font-weight: 600;
}

.reasons-step-title {
    color: var(--text-dark-color);
    display: flex;
    font-family: 'Crimson Pro', serif;
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
}

.reasons-step-description {
    color: var(--text-medium);
    font-size: 0.95rem;
    line-height: 1.2rem;
}

.cta-section {
    padding: 5rem 2rem;
    background: var(--earth-pale);
    text-align: center;
}

.cta-content {
    max-width: 700px;
    margin: 0 auto;
}

.cta-title {
    font-family: 'Crimson Pro', serif;
    font-size: 2.5rem;
    font-weight: 600;
    color: var(--earth-dark);
    margin-bottom: 1.5rem;
}

.cta-text {
    font-size: 1.1rem;
    color: var(--text-medium);
    margin-bottom: 2.5rem;
    line-height: 1.8;
}

.cta-buttons {
    display: flex;
    gap: 1.5rem;
    justify-content: center;
    flex-wrap: wrap;
}

.btn {
    padding: 1rem 2.5rem;
    font-family: 'Work Sans', sans-serif;
    font-size: 1rem;
    font-weight: 500;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    text-decoration: none;
    display: inline-block;
    transition: all 0.3s ease;
    letter-spacing: 0.03em;
}

.btn-primary {
    background: var(--accent-warm);
    color: white;
}

.btn-primary:hover {
    background: #c47244;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(212, 129, 78, 0.3);
}

.btn-secondary {
    background: transparent;
    color: var(--earth-dark);
    border: 2px solid var(--earth-medium);
}

.btn-secondary:hover {
    background: var(--earth-medium);
    color: white;
    transform: translateY(-2px);
}

@media (max-width: 768px) {
    h1 {
        font-size: 2.2rem;
    }

    .subtitle {
        font-size: 1.1rem;
    }

    .section-title {
        color: var(--text-dark-color);
        font-size: 2rem;
    }

    .stat-number {
        font-size: 2rem;
    }

    .stats-grid {
        gap: 2rem;
        grid-template-columns: 1fr 1fr;
    }

    .image-wall-container {
        gap: 12px;
        padding: 2rem 0;
    }

    .image-wall {
        gap: 12px;
        padding-right: 12px;
    }

    /* Reduce to 2 rows on mobile or just smaller rows */
    .row-3 {
        display: none;
    }

    .row-1 .wall-item {
        height: 180px;
    }

    .row-2 .wall-item {
        height: 150px;
    }

    .wall-item:nth-child(5n+1) {
        width: 150px;
    }

    .wall-item:nth-child(5n+2) {
        width: 220px;
    }

    .wall-item:nth-child(5n+3) {
        width: 190px;
    }

    .wall-item:nth-child(5n+4) {
        width: 260px;
    }

    .wall-item:nth-child(5n+5) {
        width: 210px;
    }

    .cta-buttons {
        flex-direction: column;
        align-items: center;
    }

    .btn {
        width: 100%;
        max-width: 300px;
    }
}
@media (max-width: 480px) {
    .stats-grid {
        grid-template-columns: 1fr 1fr;
    }
    .stat-number {
        font-size: 2rem;
    }
    .stat-label {
        font-size: 0.75rem;
    }
    .section-title {
        font-size: 1.5rem;
    }
    .section-subtitle {
        font-size: 0.75rem;
    }
    .section-eyebrow {
        font-size: 0.75rem;
    }
    .reasons-step-title {
        font-size: 1rem;
    }
    .reasons-step-description {
        font-size: 0.75rem;
    }
    .reasons-step-number {
        font-size: 1rem;
    }
    .delivery-row-container {
        flex-direction: column;
    }
    .delivery-column {
        flex: 1;
    }
    .delivery {
        padding: 0.5rem;
    }
}
</style>