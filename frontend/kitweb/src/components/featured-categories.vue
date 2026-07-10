<script setup>
import { useRoute } from 'vue-router';
import { defaultLang } from '../utils/localeRoutes';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { getUtilsUrl } from '@/services/api';
// card-img05-large.webp is not present on the backend /utils (404),
// so use the bundled local asset for this card instead.
import cardImg05 from '@/assets/card-img05.webp';

const route = useRoute();
const currentLang = computed(() => route.params.lang || defaultLang);
const { t } = useI18n();

const topCategories = [
    { id: 1, key: 'yarn',    image: getUtilsUrl('card-img01-large.webp') },
    { id: 2, key: 'needles', image: getUtilsUrl('card-img06-large.webp') },
    { id: 3, key: 'thread',  image: getUtilsUrl('card-img03-large.webp') },
];

const bottomLeft = [
    { id: 4, key: 'tools', image: getUtilsUrl('card-img10-large.webp') },
    { id: 5, key: 'beads', image: getUtilsUrl('card-img04-large.webp') },
];

const bottomRight = [
    { id: 6, key: 'decorative', image: cardImg05 },
    { id: 7, key: 'flora',      image: getUtilsUrl('card-img07-large.webp') },
];
</script>

<template>
    <section class="categories-section">
        <div v-reveal class="section-header">
            <p class="section-eyebrow">{{ $t('featuredCategories.eyebrow') || 'OUR COLLECTIONS' }}</p>
            <h2 class="section-title">{{ $t('featuredCategories.title') }}</h2>
            <p class="section-subtitle">{{ $t('featuredCategories.subtitle') }}</p>
        </div>

        <div class="catalog-grid" v-reveal>
            <!-- Top row: 3 main categories -->
            <div class="top-row">
                <router-link
                    v-for="cat in topCategories"
                    :key="cat.id"
                    :to="{ path: `/${currentLang}/catalog/${cat.key}` }"
                    class="cat-card large"
                >
                    <img :src="cat.image" :alt="$t(`featuredCategories.items.${cat.key}.name`)" class="cat-img" />
                    <div class="cat-overlay">
                        <div class="cat-info">
                            <span class="cat-name">{{ $t(`featuredCategories.items.${cat.key}.name`) }}</span>
                            <span class="cat-explore">{{ $t('featuredCategories.explore') }} <span class="arrow">→</span></span>
                        </div>
                    </div>
                </router-link>
            </div>

            <!-- Bottom section: 2 labeled groups -->
            <div class="bottom-section">
                <div class="bottom-group">
                    <div class="group-label">{{ $t('featuredCategories.groupCrafting') || 'Crafting Tools & Supplies' }}</div>
                    <div class="bottom-row">
                        <router-link
                            v-for="cat in bottomLeft"
                            :key="cat.id"
                            :to="{ path: `/${currentLang}/catalog/${cat.key}` }"
                            class="cat-card small"
                        >
                            <img :src="cat.image" :alt="$t(`featuredCategories.items.${cat.key}.name`)" class="cat-img" />
                            <div class="cat-overlay">
                                <div class="cat-info">
                                    <span class="cat-name">{{ $t(`featuredCategories.items.${cat.key}.name`) }}</span>
                                    <span class="cat-explore">{{ $t('featuredCategories.explore') }} <span class="arrow">→</span></span>
                                </div>
                            </div>
                        </router-link>
                    </div>
                </div>

                <div class="bottom-group">
                    <div class="group-label">{{ $t('featuredCategories.groupDecor') || 'Decorative & Flora' }}</div>
                    <div class="bottom-row">
                        <router-link
                            v-for="cat in bottomRight"
                            :key="cat.id"
                            :to="{ path: `/${currentLang}/catalog/${cat.key}` }"
                            class="cat-card small"
                        >
                            <img :src="cat.image" :alt="$t(`featuredCategories.items.${cat.key}.name`)" class="cat-img" />
                            <div class="cat-overlay">
                                <div class="cat-info">
                                    <span class="cat-name">{{ $t(`featuredCategories.items.${cat.key}.name`) }}</span>
                                    <span class="cat-explore">{{ $t('featuredCategories.explore') }} <span class="arrow">→</span></span>
                                </div>
                            </div>
                        </router-link>
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
.categories-section {
    padding: 2rem;
    background: #FBF7F2;
    overflow: hidden;
}

/* ── Section Header ───────────────────────────── */
.section-header {
    text-align: center;
    padding: 0 40px;
    margin-bottom: 48px;
}

.section-eyebrow {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: #8b6f47;
    margin: 0 0 12px;
}

.section-title {
    font-family: 'ZCOOL XiaoWei', serif;
    font-size: 2.8rem;
    color: #604539;
    letter-spacing: -0.5px;
    margin: 0 0 12px;
    font-weight: 400;
}

.section-subtitle {
    color: #8b6f47;
    font-size: 1rem;
    margin: 0;
    font-weight: 400;
}

/* ── Grid Structure ───────────────────────────── */
.catalog-grid {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.top-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
}

.bottom-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    padding: 28px 40px 56px;
    background: #FBF7F2;
}

.bottom-group {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.group-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #9e8272;
    padding-bottom: 12px;
    border-bottom: 1px solid #e0d4c8;
}

.bottom-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
}

/* ── Category Card ────────────────────────────── */
.cat-card {
    position: relative;
    overflow: hidden;
    display: block;
    text-decoration: none;
    background: #c9b9a8;
}

.cat-card.large  { height: 340px; }
.cat-card.small  { height: 210px; }

.cat-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.6s ease;
}

.cat-card:hover .cat-img {
    transform: scale(1.06);
}

/* ── Overlay ──────────────────────────────────── */
.cat-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
        to top,
        rgba(40, 25, 15, 0.75) 0%,
        rgba(40, 25, 15, 0.08) 50%,
        transparent 100%
    );
    display: flex;
    align-items: flex-end;
    padding: 20px 22px;
    transition: background 0.3s ease;
}

.cat-card:hover .cat-overlay {
    background: linear-gradient(
        to top,
        rgba(40, 25, 15, 0.88) 0%,
        rgba(40, 25, 15, 0.3) 65%,
        transparent 100%
    );
}

.cat-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 8px;
}

.cat-name {
    font-family: 'Work Sans', sans-serif;
    font-size: 0.95rem;
    font-weight: 700;
    color: white;
    letter-spacing: 1px;
    text-transform: uppercase;
}

.cat-card.small .cat-name {
    font-size: 0.8rem;
}

.cat-explore {
    font-size: 0.75rem;
    font-weight: 600;
    color: #E7C9A2;
    opacity: 0;
    transform: translateX(-6px);
    transition: opacity 0.28s ease, transform 0.28s ease;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 3px;
    flex-shrink: 0;
}

.cat-card:hover .cat-explore {
    opacity: 1;
    transform: translateX(0);
}

.arrow {
    display: inline-block;
    transition: transform 0.28s ease;
}

.cat-card:hover .arrow {
    transform: translateX(3px);
}

/* ── Responsive ───────────────────────────────── */
@media (max-width: 1024px) {
    .cat-card.large { height: 280px; }
    .cat-card.small { height: 180px; }

    .bottom-section {
        gap: 24px;
        padding: 24px 24px 48px;
    }
}

@media (max-width: 768px) {
    .categories-section { padding-top: 60px; }

    .section-title { font-size: 2.2rem; }

    .top-row { grid-template-columns: 1fr; }
    .cat-card.large { height: 220px; }

    .bottom-section {
        grid-template-columns: 1fr;
        gap: 28px;
        padding: 20px 16px 40px;
    }

    .cat-card.small { height: 170px; }
}

@media (max-width: 480px) {
    .bottom-row { grid-template-columns: 1fr; }
    .cat-card.small { height: 190px; }
}
</style>
