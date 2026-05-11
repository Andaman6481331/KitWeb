<script setup>
import { RouterLink } from 'vue-router';
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const aboutInfo = computed(() => ({
    title: t('about.title'),
    subtitle: t('about.subtitle'),
    description: t('about.description'),
    mission: t('about.mission'),
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
        }
    ],
    contact: {
        address: '376 Wanich 1, Chakkrawat, Samphantawong, Bangkok 10100',
        phone: '+66 2 222 3456',
        email: 'info@kitcharoen.com',
        hours: 'Mon-Sat: 9:00 AM - 6:00 PM'
    }
}));

</script>

<template>
    <section class="about-section">
        <div class="container">
            <!-- Left Side - Image -->
            <div v-reveal class="image-content">
                <img src="../assets/card-img02.jpg" alt="">
            </div>
            <!-- Right Side - About Us Information -->
            <div class="text-content">
                <div v-reveal class="eyebrow">{{ $t('about.eyebrow') }}</div>
                <h2 v-reveal class="title delay2">{{ aboutInfo.title }}</h2>
                <p v-reveal class="subtitle delay4">{{ aboutInfo.subtitle }}</p>

                <div v-reveal class="description delay6">
                    <p>{{ aboutInfo.description }}</p>
                    <p>{{ aboutInfo.mission }}</p>
                </div>
                <div v-reveal class="cta-buttons">
                    <router-link :to="'/orderpage'" class="no-style">
                        <button class="cta-primary">{{ $t('home.shopNow') }}</button>
                    </router-link>
                    <router-link :to="'/catalog'" class="no-style">
                        <button class="cta-primary">{{ $t('home.viewCatalog') }}</button>
                    </router-link>
                </div>
            </div>

        </div>
    </section>
</template>

<style scoped>
.about-section {
    padding: 50px 0;
    position: relative;
    overflow: hidden;
}

.container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 40px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
    align-items: start;
    position: relative;
    z-index: 1;
}

/* Left Side - Text Content */
.text-content {
    max-width: 600px;
}

.eyebrow {
    color: #8b6f47;
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
    background: #8b6f47;
}

.title {
    font-size: 3rem;
    font-weight: 700;
    color: #2d2d2d;
    margin: 24px 0 16px;
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
    text-indent: 2rem;
    text-align: justify;
    font-size: 1rem;
    color: #555;
    line-height: 1.8;
    margin-bottom: 16px;
}

.features-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
    margin-bottom: 40px;
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

/* Right Side - Image */
.image-content {
    max-width: 600px;
    max-height: 700px;
    object-fit: contain;
    overflow: hidden;
    border-radius: 50px;
    position: relative;
}

.image-content img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: translateY(-100px);
}

/* Buttons */
.cta-buttons {
    display: flex;
    gap: 20px;
    margin-top: 10px;
}

.cta-primary {
    padding: 8px 20px;
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


/* Responsive */
@media (max-width: 1024px) {
    .container {
        grid-template-columns: 1fr;
        gap: 50px;
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
}
</style>