<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { getUtilsUrl } from '@/services/api';

const { t } = useI18n();

const faqs = ref([
    {
        id: 1,
        category: 'ordering',
        question: t('faq.q1'),
        answer: t('faq.a1'),
        open: false,
    },
    {
        id: 2,
        category: 'ordering',
        question: t('faq.q2'),
        answer: t('faq.a2'),
        open: false,
    },
    {
        id: 3,
        category: 'products',
        question: t('faq.q3'),
        answer: t('faq.a3'),
        open: false,
    },
    {
        id: 4,
        category: 'products',
        question: t('faq.q4'),
        answer: t('faq.a4'),
        open: false,
    },
    {
        id: 5,
        category: 'products',
        question: t('faq.q5'),
        answer: t('faq.a5'),
        open: false,
    },
    {
        id: 6,
        category: 'products',
        question: t('faq.q6'),
        answer: t('faq.a6'),
        open: false,
    },
    {
        id: 7,
        category: 'shipping',
        question: t('faq.q7'),
        answer: t('faq.a7'),
        open: false,
    },
    {
        id: 8,
        category: 'shipping',
        question: t('faq.q8'),
        answer: t('faq.a8'),
        open: false,
    },
    {
        id: 9,
        category: 'shipping',
        question: t('faq.q9'),
        answer: t('faq.a9'),
        open: false,
    },
    {
        id: 10,
        category: 'general',
        question: t('faq.q10'),
        answer: t('faq.a10'),
        open: false,
    },
    {
        id: 11,
        category: 'general',
        question: t('faq.q11'),
        answer: t('faq.a11'),
        open: false,
    },
    {
        id: 12,
        category: 'general',
        question: t('faq.q12'),
        answer: t('faq.a12'),
        open: false,
    },
    {
        id: 13,
        category: 'general',
        question: t('faq.q13'),
        answer: t('faq.a13'),
        open: false,
    },
    {
        id: 14,
        category: 'workshops',
        question: t('faq.q14'),
        answer: t('faq.a14'),
        open: false,
    },
    {
        id: 15,
        category: 'workshops',
        question: t('faq.q15'),
        answer: t('faq.a15'),
        open: false,
    },
    {
        id: 16,
        category: 'workshops',
        question: t('faq.q16'),
        answer: t('faq.a16'),
        open: false,
    },
]);

const activeCategory = ref('all');

const categoryTabs = [
    { key: 'all',       label: t('faq.catAll') },
    { key: 'ordering',  label: t('faq.catOrdering') },
    { key: 'shipping',  label: t('faq.catShipping') },
    { key: 'products',  label: t('faq.catProducts') },
    { key: 'general',   label: t('faq.catGeneral') },
    { key: 'workshops', label: t('faq.catWorkshops') },
];

const filteredFaqs = () =>
    activeCategory.value === 'all'
        ? faqs.value
        : faqs.value.filter(f => f.category === activeCategory.value);

const toggle = (faq) => { faq.open = !faq.open; };
</script>

<template>
    <div class="faq-page">
        <!-- Hero -->
        <section class="faq-hero">
            <div class="faq-hero-inner">
                <p class="hero-eyebrow">{{ $t('faq.eyebrow') }}</p>
                <h1 class="hero-title">{{ $t('faq.title') }}</h1>
                <p class="hero-subtitle">{{ $t('faq.subtitle') }}</p>
            </div>
        </section>

        <!-- FAQ Content -->
        <section class="faq-content">
            <!-- Category Tabs -->
            <div class="category-tabs" v-reveal>
                <button
                    v-for="tab in categoryTabs"
                    :key="tab.key"
                    class="tab-btn"
                    :class="{ active: activeCategory === tab.key }"
                    @click="activeCategory = tab.key"
                >
                    {{ tab.label }}
                </button>
            </div>

            <!-- Accordion -->
            <div class="faq-list" v-reveal>
                <div
                    v-for="faq in filteredFaqs()"
                    :key="faq.id"
                    class="faq-item"
                    :class="{ open: faq.open }"
                >
                    <button class="faq-question" @click="toggle(faq)">
                        <span>{{ faq.question }}</span>
                        <span class="faq-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="6 9 12 15 18 9"/>
                            </svg>
                        </span>
                    </button>
                    <Transition name="faq-expand">
                        <div v-if="faq.open" class="faq-answer">
                            <p>{{ faq.answer }}</p>
                        </div>
                    </Transition>
                </div>
            </div>

            <!-- Still have questions CTA -->
            <div class="faq-cta" v-reveal>
                <p class="cta-label">{{ $t('faq.ctaLabel') }}</p>
                <h3 class="cta-title">{{ $t('faq.ctaTitle') }}</h3>
                <p class="cta-desc">{{ $t('faq.ctaDesc') }}</p>
                <router-link :to="{ name: 'contactus', params: { lang: $route.params.lang || 'en' } }" class="cta-btn">
                    {{ $t('faq.ctaBtn') }}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                        <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                </router-link>
            </div>
        </section>
    </div>
</template>

<style scoped>
.faq-page {
    background: #FBF7F2;
    min-height: 100vh;
}

/* ── Hero ────────────────────────────────────── */
.faq-hero {
    background: linear-gradient(135deg, #604539 0%, #8b6f47 100%);
    padding: 100px 5% 80px;
    text-align: center;
    position: relative;
    overflow: hidden;
}

.faq-hero::before {
    content: '';
    position: absolute;
    inset: 0;
    background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}

.faq-hero-inner {
    position: relative;
    z-index: 1;
    max-width: 680px;
    margin: 0 auto;
}

.hero-eyebrow {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: #E7C9A2;
    margin: 0 0 14px;
}

.hero-title {
    font-family: 'ZCOOL XiaoWei', serif;
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 400;
    color: white;
    margin: 0 0 16px;
    line-height: 1.15;
}

.hero-subtitle {
    font-size: 1.05rem;
    color: rgba(255, 255, 255, 0.75);
    margin: 0;
    line-height: 1.6;
}

/* ── Content ─────────────────────────────────── */
.faq-content {
    max-width: 800px;
    margin: 0 auto;
    padding: 64px 24px 80px;
}

/* ── Category Tabs ───────────────────────────── */
.category-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 40px;
}

.tab-btn {
    padding: 8px 18px;
    border-radius: 20px;
    border: 1.5px solid #e0d0c0;
    background: white;
    color: #8b6f47;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.18s ease;
}

.tab-btn:hover {
    border-color: #DD876E;
    color: #DD876E;
}

.tab-btn.active {
    background: #DD876E;
    border-color: #DD876E;
    color: white;
}

/* ── FAQ List ────────────────────────────────── */
.faq-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 64px;
}

.faq-item {
    background: white;
    border-radius: 12px;
    border: 1px solid #ede4da;
    overflow: hidden;
    transition: box-shadow 0.2s ease;
}

.faq-item.open {
    box-shadow: 0 4px 20px rgba(80, 55, 35, 0.08);
    border-color: #d4b896;
}

.faq-question {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 20px 22px;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    font-size: 15px;
    font-weight: 600;
    color: #3d2b1f;
    line-height: 1.4;
    transition: color 0.15s;
}

.faq-item.open .faq-question {
    color: #604539;
}

.faq-icon {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    color: #DD876E;
    transition: transform 0.25s ease;
}

.faq-icon svg { width: 100%; height: 100%; }

.faq-item.open .faq-icon {
    transform: rotate(180deg);
}

.faq-answer {
    padding: 0 22px 20px;
    border-top: 1px solid #f4ede3;
    margin-top: 0;
}

.faq-answer p {
    font-size: 14.5px;
    line-height: 1.75;
    color: #5d4037;
    margin: 16px 0 0;
}

/* ── Expand Transition ───────────────────────── */
.faq-expand-enter-active,
.faq-expand-leave-active {
    transition: opacity 0.22s ease, max-height 0.28s ease;
    max-height: 400px;
    overflow: hidden;
}

.faq-expand-enter-from,
.faq-expand-leave-to {
    opacity: 0;
    max-height: 0;
}

/* ── CTA ─────────────────────────────────────── */
.faq-cta {
    text-align: center;
    padding: 48px 40px;
    background: white;
    border-radius: 20px;
    border: 1px solid #ede4da;
}

.cta-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #8b6f47;
    margin: 0 0 12px;
}

.cta-title {
    font-family: 'ZCOOL XiaoWei', serif;
    font-size: 1.9rem;
    color: #604539;
    font-weight: 400;
    margin: 0 0 12px;
}

.cta-desc {
    font-size: 0.95rem;
    color: #8b6f47;
    margin: 0 0 28px;
    line-height: 1.6;
}

.cta-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #DD876E, #e6957c);
    color: white;
    text-decoration: none;
    padding: 13px 32px;
    border-radius: 30px;
    font-size: 15px;
    font-weight: 700;
    transition: all 0.2s ease;
    box-shadow: 0 4px 16px rgba(221, 135, 110, 0.3);
}

.cta-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(221, 135, 110, 0.4);
}

@media (max-width: 640px) {
    .faq-hero { padding: 80px 5% 60px; }
    .faq-content { padding: 48px 16px 60px; }
    .faq-cta { padding: 36px 24px; }
    .cta-title { font-size: 1.5rem; }
}
</style>
