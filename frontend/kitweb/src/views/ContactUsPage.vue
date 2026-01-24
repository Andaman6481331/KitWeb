<script setup>
import { ref } from 'vue';

const aboutInfo = ref({
    title: 'Contact Kitcharoen',
    subtitle: 'Your Trusted Handicraft Partner Since 1995',
    description: 'At Kitcharoen, we believe in the beauty of handmade artistry. For over 25 years, we have been providing quality yarns, beads, and craft supplies to artisans, hobbyists, and creative souls across Bangkok and beyond.',
    mission: 'Our mission is to inspire creativity and preserve the art of traditional handicrafts while embracing modern techniques. We curate the finest materials from around the world, ensuring every project you create is a masterpiece.',
    features: [
        {
            icon: '🧶',
            title: 'Premium Materials',
            description: 'Carefully selected yarns and beads from trusted suppliers'
        },
        {
            icon: '🎨',
            title: 'Expert Guidance',
            description: 'Free workshops and tutorials for all skill levels'
        },
        {
            icon: '💝',
            title: 'Community Focus',
            description: 'Supporting local artisans and craft communities'
        },
        {
            icon: '🌟',
            title: 'Quality Assured',
            description: '100% satisfaction guarantee on all products'
        }
    ],
    contact: {
        address: '376 Wanich 1, Chakkrawat, Samphantawong, Bangkok 10100',
        phone: '+66 2 222 3456',
        email: 'info@kitcharoen.com',
        hours: 'Mon-Sat: 9:00 AM - 6:00 PM'
    }
});

// Google Maps embed URL (you'll need to replace with your actual location)
const mapUrl = ref('https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3875.7238744842397!2d100.50747631483044!3d13.739716990349886!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x30e299155bf89a8b%3A0x9a280a6e4e3fc7d0!2sSamphanthawong%2C%20Bangkok!5e0!3m2!1sen!2sth!4v1234567890123!5m2!1sen!2sth');
</script>

<template>
    <section class="about-section">
        <div class="container">
            <!-- Left Side - About Us Information -->
            <div class="text-content">
                <div class="eyebrow">Talk to Us</div>
                <h2 class="title">{{ aboutInfo.title }}</h2>
                <p class="subtitle">{{ aboutInfo.subtitle }}</p>

                <div class="description">
                    <p>{{ aboutInfo.description }}</p>
                    <p>{{ aboutInfo.mission }}</p>
                </div>
                <div class="line"></div>
            </div>

            <!-- Right Side - Google Map -->
            <div class="map-content">
                <div class="map-container">
                    <iframe :src="mapUrl" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy"
                        referrerpolicy="no-referrer-when-downgrade"></iframe>
                </div>
                <div class="map-badge">
                    <div class="badge-icon">📍</div>
                    <div class="badge-text">
                        <div class="badge-title">Find Us Here</div>
                        <div class="badge-subtitle">Click to get directions</div>
                    </div>
                </div>
            </div>
        </div>


        <!-- Four Properties -->
        <div class="features-grid">
            <div v-for="feature in aboutInfo.features" :key="feature.title" class="feature-item">
                <div class="feature-icon">{{ feature.icon }}</div>
                <div class="feature-content">
                    <h4>{{ feature.title }}</h4>
                    <p>{{ feature.description }}</p>
                </div>
            </div>
        </div>
        <div class="contact-info">
            <h3>Visit Us</h3>
            <div class="contact-item">
                <span class="icon">📍</span>
                <span>{{ aboutInfo.contact.address }}</span>
            </div>
            <div class="contact-item">
                <span class="icon">📞</span>
                <span>{{ aboutInfo.contact.phone }}</span>
            </div>
            <div class="contact-item">
                <span class="icon">✉️</span>
                <span>{{ aboutInfo.contact.email }}</span>
            </div>
            <div class="contact-item">
                <span class="icon">🕒</span>
                <span>{{ aboutInfo.contact.hours }}</span>
            </div>
        </div>
    </section>
</template>

<style scoped>
.about-section {
    background: linear-gradient(135deg, #f5f7fa 0%, #e8ebe8 100%);
    padding: 50px 0 100px;
    position: relative;
    overflow: hidden;
}

.wave-top {
    position: absolute;
    top: 0;
    left: 0;
    width: 100vw;
    line-height: 0;
}

.wave-bottom {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100vw;
    line-height: 0;
}

.wave-top svg,
.wave-bottom svg {
    display: block;
    width: 100%;
    height: 60px;
}

.container {
    max-width: 1300px;
    margin: 0 auto;
    padding: 0 40px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    align-items: start;
    position: relative;
    z-index: 1;
}

/* Left Side - Text Content */
.text-content {
    max-width: 600px;
}

.eyebrow {
    color: var(--text-dark-color2);
    font-weight: 600;
    font-size: 0.9rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.eyebrow::before {
    content: '';
    width: 40px;
    height: 2px;
    background: var(--text-dark-color2);
}

.line {
    width: 85%;
    height: 2px;
    background: var(--text-dark-color2);
    margin: 20px auto 0;
}

.title {
    font-size: 3rem;
    font-weight: 700;
    color: #2d2d2d;
    margin-bottom: 16px;
    line-height: 1.2;
}

.subtitle {
    font-size: 1.3rem;
    color: #8b6f47;
    margin-bottom: 24px;
    font-weight: 500;
}

.description {
    margin-bottom: 40px;
}

.description p {
    font-size: 1.1rem;
    color: #555;
    line-height: 1.8;
    margin-bottom: 16px;
}

.features-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin: 40px 5rem;
}

.feature-item {
    display: flex;
    gap: 12px;
    align-items: flex-start;
}

.feature-icon {
    font-size: 2rem;
    flex-shrink: 0;
}

.feature-content h4 {
    font-size: 1.1rem;
    font-weight: 600;
    color: #2d2d2d;
    margin-bottom: 4px;
}

.feature-content p {
    font-size: 0.9rem;
    color: #666;
    line-height: 1.5;
}

.contact-info {
    background: white;
    padding: 2rem;
    margin: 2rem 10rem 0;
    border-radius: 25px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.contact-info h3 {
    font-size: 1.5rem;
    color: #2d2d2d;
    margin-bottom: 20px;
    font-weight: 700;
}

.contact-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid #f0f0f0;
    font-size: 1rem;
    color: #555;
}

.contact-item:last-child {
    border-bottom: none;
}

.contact-item .icon {
    font-size: 1.3rem;
    width: 30px;
    text-align: center;
}

/* Right Side - Map */
.map-content {
    position: relative;
    height: 100%;
    min-height: 600px;
}

.map-container {
    width: 100%;
    height: 100%;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
    position: sticky;
    top: 100px;
}

.map-container iframe {
    display: block;
}

.map-badge {
    position: absolute;
    bottom: 30px;
    left: 30px;
    background: white;
    padding: 16px 20px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    z-index: 10;
}

.badge-icon {
    font-size: 2rem;
}

.badge-title {
    font-weight: 700;
    color: #2d2d2d;
    font-size: 1rem;
}

.badge-subtitle {
    font-size: 0.85rem;
    color: #666;
}

/* Responsive */
@media (max-width: 1024px) {
    .container {
        grid-template-columns: 1fr;
        gap: 50px;
    }

    .map-content {
        min-height: 500px;
    }

    .map-container {
        position: relative;
        top: 0;
    }

    .title {
        font-size: 2.5rem;
    }

    .features-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 640px) {
    .container {
        padding: 0 20px;
    }

    .title {
        font-size: 2rem;
    }

    .subtitle {
        font-size: 1.1rem;
    }

    .description p {
        font-size: 1rem;
    }

    .map-content {
        min-height: 400px;
    }

    .map-badge {
        left: 20px;
        bottom: 20px;
        padding: 12px 16px;
    }
}
</style>