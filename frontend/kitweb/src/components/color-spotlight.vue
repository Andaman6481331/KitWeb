<script setup>
// Color of the Month. One curated color story at a time, with the products that
// carry that color. The band tints itself from the row's hex, so changing the
// color in admin visibly changes the homepage — that is the whole point of the
// section: proof that someone was here this month.
import { ref, computed, onMounted, onServerPrefetch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { api } from '../services/api';
// Not getImageUrl: product keys are stored bare and served as `<key>-thumb.webp` /
// `<key>-large.webp`. Requesting the bare key 404s.
import { getProductImageUrl } from '../utils/productImages';
import { defaultLang } from '../utils/localeRoutes';

const route = useRoute();
const { locale } = useI18n();
const currentLang = computed(() => route.params.lang || defaultLang);

const spotlight = ref(null);
const products = ref([]);

const isThai = computed(() => String(locale.value).toLowerCase() === 'th');
const tName = (p) => (isThai.value ? (p.name_th || p.name) : p.name) || '';

const colorName = computed(() => {
    if (!spotlight.value) return '';
    return (isThai.value ? spotlight.value.color_name_th : null) || spotlight.value.color_name;
});

const blurb = computed(() => {
    if (!spotlight.value) return '';
    return (isThai.value ? spotlight.value.blurb_th : null) || spotlight.value.blurb || '';
});

const hex = computed(() => spotlight.value?.hex || '#C4694E');

// Intl gives us "August 2026" / "สิงหาคม 2569" for free. Wrapped because a build
// running on a Node without full ICU would otherwise take the section down.
const localeTags = { en: 'en-GB', th: 'th-TH', zh: 'zh-CN', ja: 'ja-JP' };
const monthLabel = computed(() => {
    const raw = spotlight.value?.starts_on;
    if (!raw) return '';
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return '';
    try {
        return date.toLocaleDateString(localeTags[String(locale.value).toLowerCase()] || 'en-GB', {
            month: 'long',
            year: 'numeric'
        });
    } catch {
        return '';
    }
});

const load = async () => {
    try {
        const [rows, all] = await Promise.all([
            api.getSpotlights({ active: true }),
            api.getProducts()
        ]);
        const current = rows?.[0];
        if (!current) return;
        spotlight.value = current;

        // Preserve the curated order rather than the catalog's created_at order —
        // the first product is the one staff picked to lead the rail.
        const byId = new Map(all.map((p) => [Number(p.id), p]));
        products.value = current.product_ids.map((id) => byId.get(Number(id))).filter(Boolean);
    } catch (err) {
        console.error('Failed to load color of the month:', err);
    }
};

onServerPrefetch(load);
onMounted(() => { if (!spotlight.value) load(); });
</script>

<template>
    <section
        v-if="spotlight"
        class="color-spotlight"
        :style="{ '--cs-color': hex, '--cs-tint': `${hex}1f` }"
    >
        <div class="cs-inner">
            <div class="cs-intro">
                <div class="cs-swatch" aria-hidden="true" />
                <div>
                    <p class="cs-eyebrow">
                        {{ $t('spotlight.eyebrow') }}
                        <span v-if="monthLabel" class="cs-month">· {{ monthLabel }}</span>
                    </p>
                    <h2 class="cs-name">{{ colorName }}</h2>
                    <p v-if="blurb" class="cs-blurb">{{ blurb }}</p>
                </div>
            </div>

            <div v-if="products.length" class="cs-rail">
                <router-link
                    v-for="p in products"
                    :key="p.id"
                    :to="{ name: 'catalog', params: { lang: currentLang, category: p.category, productSlug: p.slug } }"
                    class="cs-card"
                >
                    <div class="cs-card-img">
                        <img :src="getProductImageUrl(p.image_key, 'thumb')" :alt="tName(p)" loading="lazy" />
                    </div>
                    <span class="cs-card-name">{{ tName(p) }}</span>
                </router-link>
            </div>
            <p v-else class="cs-empty">{{ $t('spotlight.noProducts') }}</p>
        </div>
    </section>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400;600&family=Work+Sans:wght@300;400;500;600&display=swap');

.color-spotlight {
    /* Tinted from the row's own hex, so the band reads as the color it names. */
    background: linear-gradient(180deg, var(--cs-tint) 0%, #FBF7F2 100%);
    border-top: 1px solid #eee0d0;
    padding: clamp(44px, 5vw, 70px) clamp(18px, 5%, 40px);
}

.cs-inner {
    max-width: 1300px;
    margin: 0 auto;
}

.cs-intro {
    display: flex;
    align-items: flex-start;
    gap: 22px;
    margin-bottom: 28px;
}

.cs-swatch {
    flex-shrink: 0;
    width: 82px;
    height: 82px;
    border-radius: 18px;
    background: var(--cs-color);
    box-shadow: 0 8px 22px color-mix(in srgb, var(--cs-color) 45%, transparent);
}

.cs-eyebrow {
    margin: 0 0 6px 0;
    font-family: 'Work Sans', sans-serif;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #8b6f47;
}

.cs-month {
    font-weight: 500;
    letter-spacing: 1px;
    color: #a08a76;
}

.cs-name {
    margin: 0 0 10px 0;
    font-family: 'Crimson Pro', serif;
    font-size: clamp(1.9rem, 3.4vw, 2.6rem);
    font-weight: 600;
    color: #4a3529;
    line-height: 1.1;
}

.cs-blurb {
    margin: 0;
    max-width: 640px;
    font-family: 'Work Sans', sans-serif;
    font-size: 15px;
    line-height: 1.75;
    color: #7d6555;
}

/* Same horizontal rail as New Arrivals: one row tall at every breakpoint. */
.cs-rail {
    display: flex;
    gap: 18px;
    overflow-x: auto;
    padding-bottom: 10px;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
}

.cs-rail::-webkit-scrollbar { display: none; }

.cs-card {
    flex: 0 0 200px;
    scroll-snap-align: start;
    text-decoration: none;
}

.cs-card-img {
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: 14px;
    overflow: hidden;
    background: #f6efe6;
    border: 2px solid transparent;
    transition: border-color 0.22s, transform 0.22s;
}

.cs-card:hover .cs-card-img {
    border-color: var(--cs-color);
    transform: translateY(-4px);
}

.cs-card-img img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.cs-card-name {
    display: block;
    margin-top: 10px;
    font-family: 'Work Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: #4a3529;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.cs-empty {
    margin: 0;
    font-family: 'Work Sans', sans-serif;
    font-size: 14px;
    color: #9e8272;
}

@media (max-width: 640px) {
    .cs-intro { gap: 16px; }
    .cs-swatch { width: 58px; height: 58px; border-radius: 14px; }
    .cs-card { flex-basis: 150px; }
}
</style>
