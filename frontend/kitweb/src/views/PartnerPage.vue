<template>
    <div class="partners-reach-page">
        <!-- Hero Section -->
        <section class="hero">
            <div class="hero-content">
                <h1 v-reveal>{{ $t('partner.heroTitle') }}</h1>
                <p class="subtitle" v-reveal delay="0.5s">{{ $t('partner.heroSubtitle') }}</p>
            </div>
        </section>

        <!-- Statistics Section -->
        <section class="stats-section">
            <div class="container">
                <div class="stats-grid">
                    <div v-for="(stat, index) in stats" :key="index" class="stat">
                        <div class="stat-number">{{ stat.number }}</div>
                        <div class="stat-label">{{ stat.label }}</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Customer Image Wall -->
        <section class="image-wall-section">
            <div class="container-fluid">
                <h2 class="section-title">{{ wallSection.title }}</h2>
                <p class="section-subtitle">{{ wallSection.subtitle }}</p>
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


        <!-- Operations Photos -->
        <section class="operations-section">
            <div class="container">
                <h2 class="section-title">Behind the Scenes</h2>
                <p class="section-subtitle">A glimpse into our daily operations and commitment to quality</p>
                <div class="operations-grid">
                    <div v-for="(operation, index) in operations" :key="index" class="operation-card">
                        <div class="operation-image">{{ operation.icon }}</div>
                        <div class="operation-content">
                            <h3 class="operation-title">{{ operation.title }}</h3>
                            <p class="operation-description">{{ operation.description }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Testimonials -->
        <section class="testimonials-section">
            <div class="container">
                <h2 class="section-title">What Our Partners Say</h2>
                <p class="section-subtitle">Real experiences from retail partners across our network</p>
                <div class="testimonials-grid">
                    <div v-for="(testimonial, index) in testimonials" :key="index" class="testimonial">
                        <p class="testimonial-quote">"{{ testimonial.quote }}"</p>
                        <p class="testimonial-author">{{ testimonial.author }}</p>
                        <p class="testimonial-location">{{ testimonial.location }}</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- How We Work Process -->
        <section class="process-section">
            <div class="container">
                <h2 class="section-title">How We Work With Partners</h2>
                <p class="section-subtitle">A simple, transparent process built on trust and mutual growth</p>
                <div class="process-steps">
                    <div v-for="step in processSteps" :key="step.number" class="process-step">
                        <div class="step-number">{{ step.number }}</div>
                        <h3 class="step-title">{{ step.title }}</h3>
                        <p class="step-description">{{ step.description }}</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Call to Action -->
        <section class="cta-section">
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
    </div>
</template>

<script setup>
import { ref } from 'vue';

// Hero text is now handled via i18n in the template

const stats = ref([
    { number: '180+', label: 'Retail Partners' },
    { number: '42', label: 'Thai Provinces' },
    { number: '12', label: 'Years Operating' },
    { number: '8', label: 'Countries Served' }
]);

const wallSection = ref({
    title: 'Our Thriving Community',
    subtitle: 'Celebrating the success of our partners and the creativity of our customers across the globe'
});

import front01 from '@/assets/customer/front01.jpg';
import front02 from '@/assets/customer/front02.jpg';
import front03 from '@/assets/customer/front03.jpg';
import front04 from '@/assets/customer/front04.jpg';
import front05 from '@/assets/customer/front05.jpg';
import front06 from '@/assets/customer/front06.jpg';
import front07 from '@/assets/customer/front07.jpg';
import front08 from '@/assets/customer/front08.jpg';
import front09 from '@/assets/customer/front09.jpg';
import front10 from '@/assets/customer/front10.jpg';
import front11 from '@/assets/customer/front11.jpg';
import front12 from '@/assets/customer/front12.jpg';
import front13 from '@/assets/customer/front13.jpg';
import front14 from '@/assets/customer/front14.jpg';
import res01 from '@/assets/customer/res01.jpg';

const wallImages = [
    front01, front02, front03, front04, front05, front06, front07, front08, front09, front10, front11, front12, front13, front14
];


const operations = ref([
    {
        icon: '📦',
        title: 'Order Fulfillment',
        description: 'Our team carefully packing orders with attention to detail, ensuring every product reaches partners in perfect condition.'
    },
    {
        icon: '🏪',
        title: 'Warehouse Operations',
        description: 'Climate-controlled storage facilities in Bangkok maintaining optimal conditions for all product categories.'
    },
    {
        icon: '👥',
        title: 'Our Team at Work',
        description: 'Dedicated professionals managing partnerships, logistics, and customer service with a personal touch.'
    }
]);

const testimonials = ref([
    {
        quote: `We've been working together for 7 years now. Their consistency in quality and delivery times has made them our most reliable supplier. Even during challenging times, they always find a way to support us.`,
        author: 'Somchai Prasert',
        location: 'Retail Manager, Chiang Mai'
    },
    {
        quote: 'What sets them apart is the personal attention. They understand our local market needs in Isan and adjust their support accordingly. It feels like working with family, not just a supplier.',
        author: 'Niran Boonmee',
        location: 'Store Owner, Khon Kaen'
    },
    {
        quote: 'As a new retailer in Phuket, their onboarding process made everything easy. They walked us through every step and continue to check in regularly. Professional yet genuinely caring.',
        author: 'Apinya Chindarat',
        location: 'Boutique Owner, Phuket'
    }
]);

const processSteps = ref([
    {
        number: 1,
        title: 'Initial Contact',
        description: `Reach out through phone, email, or our website. We'll schedule a conversation to understand your business needs and goals.`
    },
    {
        number: 2,
        title: 'Consultation',
        description: 'We discuss product selection, pricing, delivery schedules, and support services tailored to your market and customers.'
    },
    {
        number: 3,
        title: 'Partnership Setup',
        description: 'Simple onboarding with clear terms, training on our systems, and introduction to your dedicated account manager.'
    },
    {
        number: 4,
        title: 'Ongoing Support',
        description: 'Regular check-ins, responsive communication, flexible ordering, and continuous partnership development as you grow.'
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
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

.hero {
    background: url('../assets/shop03.png');
    background-size: contain;
    background-position: center;
    min-height: 600px;
    display: flex;
    justify-content: center;
    flex-direction: column;
    align-items: center;
    text-align: center;
    position: relative;
    color: white;
}

.hero::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(to right, rgba(53, 35, 29, 0.703) 0%, rgba(53, 35, 29, 0.632) 10%, transparent 100%);
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
    font-size: 3.2rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
    line-height: 1.2;
    letter-spacing: -0.02em;
}

.subtitle {
    font-size: 1.3rem;
    font-weight: 300;
    opacity: 0.95;
    max-width: 700px;
    margin: 0 auto;
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
    padding: 5rem 0;
    background: var(--earth-pale);
    overflow: hidden;
}

.image-wall-container {
    width: 100%;
    overflow: hidden;
    padding: 3rem 0;
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
    height: 220px;
}

.row-2 .wall-item {
    height: 200px;
}

.row-3 .wall-item {
    height: 280px;
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


.operations-section {
    padding: 5rem 2rem;
    background: var(--earth-pale);
}

.operations-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin-top: 3rem;
}

.operation-card {
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(74, 63, 53, 0.08);
    transition: transform 0.3s ease;
}

.operation-card:hover {
    transform: translateY(-5px);
}

.operation-image {
    width: 100%;
    height: 250px;
    background: linear-gradient(135deg, var(--earth-light) 0%, var(--earth-medium) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 3rem;
    opacity: 0.8;
}

.operation-content {
    padding: 1.5rem;
}

.operation-title {
    font-family: 'Crimson Pro', serif;
    font-size: 1.3rem;
    font-weight: 600;
    color: var(--earth-dark);
    margin-bottom: 0.5rem;
}

.operation-description {
    color: var(--text-medium);
    font-size: 0.95rem;
}

.testimonials-section {
    padding: 5rem 2rem;
    background: white;
}

.testimonials-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 2rem;
    margin-top: 3rem;
}

.testimonial {
    background: var(--earth-cream);
    padding: 2rem;
    border-radius: 6px;
    position: relative;
    border-top: 3px solid var(--earth-light);
}

.testimonial-quote {
    font-style: italic;
    color: var(--text-dark);
    margin-bottom: 1.5rem;
    line-height: 1.8;
}

.testimonial-author {
    font-weight: 600;
    color: var(--earth-dark);
    margin-bottom: 0.3rem;
}

.testimonial-location {
    font-size: 0.9rem;
    color: var(--text-medium);
}

.process-section {
    padding: 5rem 2rem;
    background: var(--earth-dark);
    color: var(--earth-cream);
}

.process-section .section-title {
    color: var(--earth-cream);
}

.process-section .section-subtitle {
    color: var(--earth-pale);
}

.process-steps {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 3rem;
    margin-top: 3rem;
    max-width: 1100px;
    margin-left: auto;
    margin-right: auto;
}

.process-step {
    text-align: center;
    position: relative;
}

.step-number {
    width: 60px;
    height: 60px;
    background: var(--accent-warm);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Crimson Pro', serif;
    font-size: 1.8rem;
    font-weight: 600;
    margin: 0 auto 1.5rem;
}

.step-title {
    font-family: 'Crimson Pro', serif;
    font-size: 1.4rem;
    font-weight: 600;
    margin-bottom: 0.8rem;
}

.step-description {
    font-size: 0.95rem;
    color: var(--earth-pale);
    line-height: 1.7;
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
        font-size: 2rem;
    }

    .stat-number {
        font-size: 2.5rem;
    }

    .stats-grid {
        gap: 2rem;
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
</style>