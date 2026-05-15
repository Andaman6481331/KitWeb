<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { getUtilsUrl } from '@/services/api';

const { t } = useI18n();

const aboutInfo = computed(() => ({
    title: t('contact.title'),
    subtitle: t('contact.subtitle'),
    description: t('contact.description'),
    mission: t('contact.mission'),
    features: [
        {
            icon: '🧶',
            title: t('contact.premiumMaterials'),
            description: t('contact.premiumMaterialsDesc')
        },
        {
            icon: '🎨',
            title: t('contact.expertGuidance'),
            description: t('contact.expertGuidanceDesc')
        },
        {
            icon: '💝',
            title: t('contact.communityFocus'),
            description: t('contact.communityFocusDesc')
        },
        {
            icon: '🌟',
            title: t('contact.qualityAssured'),
            description: t('contact.qualityAssuredDesc')
        }
    ],
    contact: {
        address: '376 Wanich 1, Chakkrawat, Samphantawong, Bangkok 10100',
        phone: '+66 2 222 3456',
        line: 'https://lin.ee/8pn4sZi',
        hours: 'Mon-Sat: 8:30 AM - 4:30 PM'
    }
}));

// Form state
const form = ref({
    name: '',
    email: '',
    subject: 'Wholesale Inquiry',
    message: ''
});

const isSubmitting = ref(false);

const handleSubmit = () => {
    isSubmitting.value = true;
    // Simulate API call
    setTimeout(() => {
        alert(t('contact.form.successMessage'));
        form.value = {
            name: '',
            email: '',
            subject: t('contact.form.subjects.wholesale'),
            message: ''
        };
        isSubmitting.value = false;
    }, 1500);
};

// Google Maps embed URL
const mapUrl = ref('https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3875.7238744842397!2d100.50747631483044!3d13.739716990349886!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x30e299155bf89a8b%3A0x9a280a6e4e3fc7d0!2sSamphanthawong%2C%20Bangkok!5e0!3m2!1sen!2sth!4v1234567890123!5m2!1sen!2sth');
</script>

<template>
    <!-- Page Header -->
    <div class="catalog-header" :style="{ backgroundImage: `url(${getUtilsUrl('shop04.png')})` }">
        <div class="header-content">
            <span class="since-badge">SINCE 1984</span>
            <h1 class="catalog-title">{{ $t('contact.headerTitle') }}</h1>
            <p class="catalog-subtitle">{{ $t('contact.headerDefinition') }}</p>
        </div>
    </div>
    <section class="about-section">

        <div class="container">
            <!-- Left Side - About Us Information -->
            <div class="text-content">
                <div class="eyebrow" v-reveal>{{ $t('contact.eyebrow') }}</div>
                <h2 class="title" v-reveal>{{ aboutInfo.title }}</h2>
                <p class="subtitle" v-reveal delay="0.2s">{{ aboutInfo.subtitle }}</p>

                <div class="description" style="text-indent: 2rem; text-align: justify;">
                    <p v-reveal delay="0.4s">{{ aboutInfo.description }}</p>
                    <p v-reveal delay="0.6s">{{ aboutInfo.mission }}</p>
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
                        <div class="badge-title">{{ $t('contact.findUsHere') }}</div>
                        <div class="badge-subtitle">{{ $t('contact.clickDirections') }}</div>
                    </div>
                </div>
            </div>
        </div>


        <!-- Contact & Inquiry Section -->
        <div class="contact-inquiry-container" v-reveal>
            <div class="contact-grid">
                <!-- Left: Heritage Hub -->
                <div class="heritage-hub">
                    <div class="info-card">
                        <h2 class="hub-title">{{ $t('contact.hub.title') }}</h2>

                        <div class="hub-item">
                            <div class="hub-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                    stroke-width="2">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                    <circle cx="12" cy="10" r="3"></circle>
                                </svg>
                            </div>
                            <div class="hub-text">
                                <strong>{{ $t('contact.hub.address') }}</strong>
                                <p>{{ aboutInfo.contact.address }}</p>
                            </div>
                        </div>

                        <div class="hub-item">
                            <div class="hub-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                    stroke-width="2">
                                    <path
                                        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z">
                                    </path>
                                </svg>
                            </div>
                            <div class="hub-text">
                                <strong>{{ $t('contact.hub.phone') }}</strong>
                                <p>{{ aboutInfo.contact.phone }}</p>
                            </div>
                        </div>

                        <div class="hub-item">
                            <div class="hub-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                    stroke-width="2">
                                    <path
                                        d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z">
                                    </path>
                                    <polyline points="22,6 12,13 2,6"></polyline>
                                </svg>
                            </div>
                            <div class="hub-text">
                                <strong>{{ $t('contact.hub.email') }}</strong>
                                <p>{{ $t('contact.hub.emailValue') }}</p>
                            </div>
                        </div>

                        <div class="social-connect">
                            <strong>{{ $t('contact.hub.connect') }}</strong>
                            <div class="social-icons">
                                <a href="#" class="social-btn">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                        stroke-width="2">
                                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z">
                                        </path>
                                    </svg>
                                </a>
                                <a href="#" class="social-btn">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                        stroke-width="2">
                                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                                    </svg>
                                </a>
                                <a href="#" class="social-btn">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                        stroke-width="2">
                                        <path
                                            d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z">
                                        </path>
                                    </svg>
                                </a>
                            </div>
                        </div>
                    </div>

                    <!-- Quote Image Card -->
                    <div class="quote-card">
                        <img :src="getUtilsUrl('shop02.jpg')" alt="Heritage Store" class="quote-bg" />
                        <div class="quote-overlay">
                            <p>"{{ $t('contact.hub.quote') }}"</p>
                        </div>
                    </div>
                </div>

                <!-- Right: Inquiry Form -->
                <div class="inquiry-form-card">
                    <h2 class="form-title">{{ $t('contact.form.title') }}</h2>
                    <p class="form-subtitle">{{ $t('contact.form.subtitle') }}</p>

                    <form @submit.prevent="handleSubmit" class="hub-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label>{{ $t('contact.form.name') }}</label>
                                <input type="text" v-model="form.name" :placeholder="$t('contact.form.namePlaceholder')"
                                    required />
                            </div>
                            <div class="form-group">
                                <label>{{ $t('contact.form.email') }}</label>
                                <input type="email" v-model="form.email"
                                    :placeholder="$t('contact.form.emailPlaceholder')" required />
                            </div>
                        </div>

                        <div class="form-group">
                            <label>{{ $t('contact.form.subject') }}</label>
                            <select v-model="form.subject">
                                <option>{{ $t('contact.form.subjects.wholesale') }}</option>
                                <option>{{ $t('contact.form.subjects.product') }}</option>
                                <option>{{ $t('contact.form.subjects.shipping') }}</option>
                                <option>{{ $t('contact.form.subjects.other') }}</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>{{ $t('contact.form.message') }}</label>
                            <textarea v-model="form.message" :placeholder="$t('contact.form.messagePlaceholder')"
                                rows="6"></textarea>
                        </div>

                        <div class="form-actions">
                            <button type="submit" class="submit-btn" :disabled="isSubmitting">
                                {{ isSubmitting ? $t('contact.form.sending') : $t('contact.form.send') }}
                                <svg v-if="!isSubmitting" width="20" height="20" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" stroke-width="2">
                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                </svg>
                            </button>
                            <span class="response-time">{{ $t('contact.form.responseTime') }}</span>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
/* Catalog Header */
.catalog-header {
    /* background: url('../assets/shop04.png'); */
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

.catalog-header::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4));
}

.catalog-header>* {
    position: relative;
    z-index: 2;
}

.since-badge {
    display: block;
    font-size: 14px;
    font-weight: 700;
    color: #e8dcc8;
    letter-spacing: 4px;
    margin-bottom: 15px;
}

.catalog-title {
    font-family: 'ZCOOL XiaoWei', serif;
    font-size: 4rem;
    color: #ffffff;
    margin: 15px auto;
    line-height: 1.1;
    animation: fadeInUp 0.8s ease;
}

.catalog-subtitle {
    font-size: 1.2rem;
    color: #ffffff;
    max-width: 800px;
    margin: 0 auto;
    line-height: 1.6;
    opacity: 0.9;
    animation: fadeInUp 0.8s ease 0.2s backwards;
}

@media (max-width: 768px) {
    .catalog-title {
        font-size: 2.5rem;
    }

    .catalog-subtitle {
        font-size: 1rem;
    }
}

@media (max-width: 768px) {
    .mobile-only {
        display: block;
    }
}

/* Content Section */
.about-section {
    background-color: #FBF7F2;
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

/* Contact & Inquiry Grid */
.contact-inquiry-container {
    margin: 80px auto 0;
    padding: 0 20px;
    max-width: 1300px;
}

.contact-grid {
    display: grid;
    grid-template-columns: 400px 1fr;
    gap: 30px;
    align-items: stretch;
}

/* Heritage Hub Styling */
.heritage-hub {
    display: flex;
    flex-direction: column;
    gap: 30px;
}

.info-card {
    background: #ffffff;
    padding: 40px;
    border-radius: 20px;
    box-shadow: 0 4px 30px rgba(94, 69, 53, 0.05);
    border: 1px solid rgba(94, 69, 53, 0.1);
}

.hub-title {
    font-family: 'ZCOOL XiaoWei', serif;
    font-size: 2.2rem;
    color: #5E4535;
    margin-bottom: 30px;
}

.hub-item {
    display: flex;
    gap: 20px;
    margin-bottom: 25px;
}

.hub-icon {
    width: 44px;
    height: 44px;
    background: #fdfaf7;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #006064;
    flex-shrink: 0;
    border: 1px solid rgba(0, 96, 100, 0.1);
}

.hub-text strong {
    display: block;
    font-size: 1rem;
    color: #5E4535;
    margin-bottom: 4px;
    text-transform: none;
}

.hub-text p {
    font-size: 0.95rem;
    color: #7a7a7a;
    line-height: 1.5;
    margin: 0;
}

.social-connect {
    margin-top: 40px;
    padding-top: 30px;
    border-top: 1px solid #f0f0f0;
}

.social-connect strong {
    display: block;
    font-size: 1rem;
    color: #5E4535;
    margin-bottom: 15px;
}

.social-icons {
    display: flex;
    gap: 12px;
}

.social-btn {
    width: 40px;
    height: 40px;
    background: #f5f5f5;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #5E4535;
    transition: all 0.3s ease;
}

.social-btn:hover {
    background: #006064;
    color: #ffffff;
    transform: translateY(-3px);
}

/* Quote Card Styling */
.quote-card {
    position: relative;
    height: 240px;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.quote-bg {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.quote-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 25px;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
    color: #ffffff;
}

.quote-overlay p {
    font-size: 1.1rem;
    font-style: italic;
    margin: 0;
    line-height: 1.4;
}

/* Inquiry Form Styling */
.inquiry-form-card {
    background: #ffffff;
    padding: 50px;
    border-radius: 20px;
    box-shadow: 0 4px 30px rgba(94, 69, 53, 0.05);
    border: 1px solid rgba(94, 69, 53, 0.1);
}

.form-title {
    font-family: 'ZCOOL XiaoWei', serif;
    font-size: 2.2rem;
    color: #5E4535;
    margin-bottom: 10px;
}

.form-subtitle {
    color: #7a7a7a;
    font-size: 1.1rem;
    margin-bottom: 40px;
    line-height: 1.5;
}

.hub-form {
    display: flex;
    flex-direction: column;
    gap: 25px;
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.form-group label {
    font-size: 0.85rem;
    font-weight: 700;
    color: #5E4535;
    letter-spacing: 1px;
}

.form-group input,
.form-group select,
.form-group textarea {
    padding: 14px 18px;
    background: #FDFBFA;
    border: 1px solid #e8e0d5;
    border-radius: 12px;
    font-size: 1rem;
    color: #2d2d2d;
    transition: all 0.3s ease;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
    outline: none;
    border-color: #006064;
    background: #ffffff;
    box-shadow: 0 0 0 4px rgba(0, 96, 100, 0.05);
}

.form-actions {
    margin-top: 15px;
    display: flex;
    align-items: center;
    gap: 25px;
}

.submit-btn {
    background: #006064;
    color: #ffffff;
    border: none;
    padding: 16px 35px;
    border-radius: 50px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 12px;
    transition: all 0.3s ease;
}

.submit-btn:hover:not(:disabled) {
    background: #004d40;
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 96, 100, 0.2);
}

.submit-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.response-time {
    color: #9c9c9c;
    font-size: 0.95rem;
    font-style: italic;
}

/* Animations */
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

    .contact-grid {
        grid-template-columns: 1fr;
    }

    .heritage-hub {
        order: 2;
    }

    .inquiry-form-card {
        order: 1;
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

    .form-row {
        grid-template-columns: 1fr;
    }

    .inquiry-form-card {
        padding: 30px 20px;
    }

    .form-actions {
        flex-direction: column;
        align-items: stretch;
        gap: 15px;
    }

    .submit-btn {
        width: 100%;
        justify-content: center;
    }

    .response-time {
        text-align: center;
    }

    .contact-inquiry-container {
        margin-top: 40px;
    }
}
</style>