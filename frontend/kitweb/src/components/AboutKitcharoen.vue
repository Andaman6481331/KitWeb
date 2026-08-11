<script setup>
import { RouterLink, useRoute } from 'vue-router';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { getUtilsUrl } from '@/services/api';
import { defaultLang } from '@/utils/localeRoutes';

const { t } = useI18n();
const route = useRoute();
const currentLang = computed(() => route.params.lang || defaultLang);

const aboutInfo = computed(() => ({
    title: t('about.title'),
    subtitle: t('about.subtitle'),
    description: t('about.description'),
    mission: t('about.mission')
}));

</script>

<template>
    <section class="about-section">
        <div class="container">
            <!-- Left Side - Image -->
            <div v-reveal class="image-content">
                <img :src="getUtilsUrl('card-img02-large.webp')" alt="">
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
                    <router-link :to="{ name: 'orderpage', params: { lang: currentLang } }" class="no-style">
                        <button class="cta-primary">{{ $t('home.shopNow') }}</button>
                    </router-link>
                    <router-link :to="{ name: 'catalog', params: { lang: currentLang } }" class="no-style">
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
    max-width: 1300px;
    margin: 0 auto;
    padding: 0 40px;
    display: flex;
    flex-direction: row;
    gap: 60px;
    align-items: center;
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
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.eyebrow::before {
    content: '';
    width: 40px;
    height: 2px;
    background: #E7C9A2;
}

.title {
    font-size: 3rem;
    font-weight: 700;
    color: #604539;
    margin: 16px 0 8px;
    line-height: 1.2;
}

.subtitle {
    font-size: 1.3rem;
    color: #8b6f47;
    margin: 0;
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

/* Right Side - Image */
.image-content {
    flex: 1;
    max-width: 600px;
    height: 600px;
    overflow: hidden;
    position: relative;
    box-shadow: 0 20px 40px rgba(74, 63, 53, 0.15);
}

.image-content img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.6s ease;
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
        flex-direction: column;
        gap: 40px;
        text-align: center;
    }

    .image-content {
        width: 100%;
        height: 500px;
    }

    .eyebrow {
        justify-content: center;
    }

    .title {
        font-size: 2.5rem;
    }

    .cta-buttons {
        justify-content: center;
    }
}

@media (max-width: 640px) {
    .container {
        padding: 0 20px;
    }

    .image-content {
        height: 400px;
        border-radius: 30px;
    }

    .title {
        font-size: 2rem;
    }

    .description p {
        text-indent: 0;
        text-align: center;
    }
}
</style>