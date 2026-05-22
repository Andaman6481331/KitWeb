<script setup>
import { useRoute } from 'vue-router';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
// Instagram embedding is handled in the instagram-card child component
import instagramCard from './instragram-card.vue';
import { codeToPath, defaultLang } from '@/utils/localeRoutes';

const { t } = useI18n();
const route = useRoute();
const currentLang = computed(() => route.params.lang || defaultLang);

const handleStartCrafting = () => {
    // Basic logic for the button if needed, otherwise just keeps the @click reference
};
</script>
<template>
    <section class="kitcraft-section">
        <div class="text-content">
            <div v-reveal class="eyebrow">{{ $t('kitcraft.eyebrow') }}</div>
            <h2 v-reveal>{{ $t('kitcraft.title') }}</h2>
            <p v-reveal class="subtitle">
                {{ $t('kitcraft.subtitle') }}
            </p>

            <div v-reveal class="benefits">
                <div class="benefit-item">
                    <div class="benefit-icon">✓</div>
                    <div class="benefit-text">
                        <div class="benefit-title">{{ $t('kitcraft.benefits.beginner.title') }}</div>
                        <div class="benefit-desc delay2">{{ $t('kitcraft.benefits.beginner.desc') }}</div>
                    </div>
                </div>
                <div class="benefit-item">
                    <div class="benefit-icon">✓</div>
                    <div class="benefit-text">
                        <div class="benefit-title">{{ $t('kitcraft.benefits.affordable.title') }}</div>
                        <div class="benefit-desc delay2">{{ $t('kitcraft.benefits.affordable.desc') }}</div>
                    </div>
                </div>
                <div class="benefit-item">
                    <div class="benefit-icon">✓</div>
                    <div class="benefit-text">
                        <div class="benefit-title">{{ $t('kitcraft.benefits.creative.title') }}</div>
                        <div class="benefit-desc delay2">{{ $t('kitcraft.benefits.creative.desc') }}</div>
                    </div>
                </div>
            </div>

            <div class="cta-group">
                <router-link :to="{ name: 'contactus', params: { lang: currentLang } }" class="btn-primary">{{ $t('kitcraft.startCrafting') }}</router-link>
                <router-link :to="{ name: 'event', params: { lang: currentLang } }" class="btn-secondary">{{ $t('kitcraft.learnMore') }}</router-link>
            </div>
        </div>

        <instagramCard />
    </section>
</template>
<style scoped>
.kitcraft-section {
    max-width: 1200px;
    margin: 0 auto;
    padding: 80px 40px;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    gap: 60px;
    align-items: center;
}

.text-content {
    max-width: 600px;
}

.eyebrow {
    color: #e91e63;
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
    background: #e91e63;
}

h2 {
    font-size: 2.5rem;
    color: #1a1a1a;
    line-height: 1.2;
    margin-bottom: 24px;
    font-weight: 700;
}

.subtitle {
    font-size: 1.1rem;
    color: #666;
    line-height: 1.6;
    margin-bottom: 2rem;
}

.benefits {
    margin-bottom: 40px;
}

.benefit-item {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 20px;
}

.benefit-icon {
    width: 24px;
    height: 24px;
    background: linear-gradient(135deg, #e91e63, #f06292);
    border-radius: 50%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 14px;
}

.benefit-text {
    flex: 1;
}

.benefit-title {
    font-weight: 600;
    color: #1a1a1a;
    margin-bottom: 4px;
    font-size: 1.1rem;
}

.benefit-desc {
    color: #666;
    font-size: 0.95rem;
    line-height: 1.5;
}

.cta-group {
    display: flex;
    gap: 16px;
    align-items: center;
}

.btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    background: linear-gradient(135deg, #e91e63, #f06292);
    color: white;
    border: none;
    padding: 16px 36px;
    border-radius: 50px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(233, 30, 99, 0.3);
}

.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(233, 30, 99, 0.4);
}

.btn-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    background: transparent;
    color: #e91e63;
    border: 2px solid #e91e63;
    padding: 14px 34px;
    border-radius: 50px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn-secondary:hover {
    background: #e91e63;
    color: white;
}

@media (max-width: 1200px) {
    .kitcraft-section {
        padding: 60px 40px;
        gap: 40px;
    }
}

@media (max-width: 1024px) {
    .kitcraft-section {
        flex-direction: column;
        text-align: center;
    }

    .text-content {
        max-width: 100%;
    }

    .eyebrow {
        justify-content: center;
    }

    h2 {
        font-size: 2.5rem;
    }

    .benefit-item {
        text-align: left;
    }

    .cta-group {
        justify-content: center;
    }
}

@media (max-width: 640px) {
    .kitcraft-section {
        padding: 40px 20px;
    }

    h2 {
        font-size: 2rem;
    }

    .subtitle {
        font-size: 1.1rem;
    }

    .cta-group {
        flex-direction: column;
        align-items: stretch;
    }

    .btn-primary,
    .btn-secondary {
        width: 100%;
        text-align: center;
    }
}
</style>