<template>
    <div class="partners-reach-page">
        <!-- Hero Section -->
        <section class="hero">
            <div class="hero-content">
                <h1 v-reveal>{{ hero.title }}</h1>
                <p class="subtitle" v-reveal delay="0.5s">{{ hero.subtitle }}</p>
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

        <!-- Map Section -->
        <section class="map-section">
            <div class="container">
                <h2 class="section-title">{{ mapSection.title }}</h2>
                <p class="section-subtitle">{{ mapSection.subtitle }}</p>
                <div class="map-container">
                    <div class="map-placeholder">
                        [Interactive Network Map - Bangkok Hub with Connection Lines to Thai Regions & International
                        Destinations]
                    </div>
                </div>
            </div>
        </section>

        <!-- Partners by Region -->
        <section class="partners-section">
            <div class="container">
                <h2 class="section-title">Our Partner Network</h2>
                <p class="section-subtitle">Working with trusted retailers and distributors across key regions</p>
                <div class="partner-regions">
                    <div v-for="(region, index) in regions" :key="index" class="region-card">
                        <h3 class="region-name">{{ region.name }}</h3>
                        <ul class="partner-list">
                            <li v-for="(partner, pIndex) in region.partners" :key="pIndex">
                                {{ partner }}
                            </li>
                        </ul>
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

const hero = ref({
    title: 'Trusted Partners Across Thailand & Beyond',
    subtitle: 'Building reliable retail partnerships from Bangkok to every corner of Thailand and across international borders'
});

const stats = ref([
    { number: '180+', label: 'Retail Partners' },
    { number: '42', label: 'Thai Provinces' },
    { number: '12', label: 'Years Operating' },
    { number: '8', label: 'Countries Served' }
]);

const mapSection = ref({
    title: 'Our Network Reaches Far & Wide',
    subtitle: `From our hub in Bangkok, we connect with partners across Thailand's regions and select international markets`
});

const regions = ref([
    {
        name: 'Central Thailand',
        partners: [
            'Bangkok Metropolitan Partners (38)',
            'Nonthaburi & Pathum Thani (12)',
            'Ayutthaya Distributors (8)',
            'Samut Prakan Retailers (6)'
        ]
    },
    {
        name: 'Northern Region',
        partners: [
            'Chiang Mai Partners (15)',
            'Chiang Rai Retailers (9)',
            'Lampang Distributors (7)',
            'Phitsanulok Network (6)'
        ]
    },
    {
        name: 'Northeastern (Isan)',
        partners: [
            'Nakhon Ratchasima Partners (11)',
            'Khon Kaen Retailers (10)',
            'Udon Thani Distributors (8)',
            'Ubon Ratchathani Network (5)'
        ]
    },
    {
        name: 'Southern Region',
        partners: [
            'Phuket & Krabi Partners (13)',
            'Hat Yai Distributors (9)',
            'Surat Thani Retailers (7)',
            'Songkhla Network (6)'
        ]
    },
    {
        name: 'Eastern Seaboard',
        partners: [
            'Chonburi & Pattaya Partners (14)',
            'Rayong Distributors (8)',
            'Chanthaburi Retailers (5)',
            'Trat Network (3)'
        ]
    },
    {
        name: 'International Markets',
        partners: [
            'Singapore Partners (3)',
            'Malaysia Distributors (2)',
            'Vietnam Retailers (2)',
            'Laos Network (1)'
        ]
    }
]);

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

.map-section {
    padding: 5rem 2rem;
    background: var(--earth-pale);
}

.section-title {
    font-family: 'Crimson Pro', serif;
    font-size: 2.5rem;
    font-weight: 600;
    text-align: center;
    margin-bottom: 1rem;
    color: var(--earth-dark);
}

.section-subtitle {
    text-align: center;
    color: var(--text-medium);
    font-size: 1.1rem;
    margin-bottom: 3rem;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
}

.map-container {
    max-width: 900px;
    margin: 0 auto;
    background: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(74, 63, 53, 0.1);
    text-align: center;
}

.map-placeholder {
    width: 100%;
    height: 500px;
    background: linear-gradient(135deg, var(--earth-pale) 0%, var(--earth-cream) 100%);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--earth-medium);
    font-style: italic;
    border: 2px dashed var(--earth-light);
}

.partners-section {
    padding: 5rem 2rem;
    background: white;
}

.partner-regions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 2rem;
    margin-top: 3rem;
}

.region-card {
    background: var(--earth-cream);
    padding: 2rem;
    border-radius: 6px;
    border-left: 4px solid var(--earth-light);
    transition: all 0.3s ease;
}

.region-card:hover {
    border-left-color: var(--accent-warm);
    transform: translateX(5px);
    box-shadow: 0 4px 20px rgba(74, 63, 53, 0.08);
}

.region-name {
    font-family: 'Crimson Pro', serif;
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--earth-dark);
    margin-bottom: 1rem;
}

.partner-list {
    list-style: none;
    font-size: 0.95rem;
    color: var(--text-medium);
}

.partner-list li {
    padding: 0.4rem 0;
    border-bottom: 1px solid rgba(139, 115, 85, 0.15);
}

.partner-list li:last-child {
    border-bottom: none;
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

    .map-placeholder {
        height: 350px;
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