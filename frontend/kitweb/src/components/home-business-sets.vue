<script setup>
// Homepage teaser for Business Sets. The bundles otherwise live behind the
// institutional catalog, which a shop owner only reaches if they already know we
// sell wholesale — this band puts three of them on the front page instead.
// Three cards, like the articles teaser: prove the sets exist, then hand off to
// the index page.
import { ref, computed, onMounted, onServerPrefetch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { api, getProjectImageUrl } from '../services/api';
import { getProductImageUrl } from '../utils/productImages';
import { rollUpSet } from '../utils/setPricing';
import { defaultLang } from '../utils/localeRoutes';

const route = useRoute();
const { locale } = useI18n();
const currentLang = computed(() => route.params.lang || defaultLang);

// The band hides itself when there are no sets, so the homepage's section rail
// would otherwise keep an entry pointing at nothing. Tell it what we found.
const emit = defineEmits(['loaded']);

const sets = ref([]);

const isThai = computed(() => String(locale.value).toLowerCase() === 'th');
const tName = (s) => (isThai.value && s.name_th ? s.name_th : s.name) || '';
const tDesc = (s) => (isThai.value && s.description_th ? s.description_th : s.description) || '';

const load = async () => {
    try {
        sets.value = await api.getBusinessSets();
    } catch {
        // Supplementary band: a failed fetch hides it, it never breaks the homepage.
        sets.value = [];
    }
    emit('loaded', sets.value.length);
};

onServerPrefetch(load);
onMounted(() => { if (!sets.value.length) load(); });

// Priced here rather than server-side so productPricing.js stays the single
// definition of the box -> per-piece rule.
const teasers = computed(() =>
    sets.value.slice(0, 3).map(s => ({ ...s, rollUp: rollUpSet(s) }))
);

// A set whose admin never uploaded a cover still needs a picture, so fall back to
// the component products' own images.
const thumbs = (s) => (s.items || []).filter(i => i.image_key).slice(0, 4);

// discount_pct is a REAL, so 10 must not render as "10.0" nor 12.5 as "13".
const pct = (n) => String(Number(n) || 0);
</script>

<template>
    <section v-if="teasers.length" class="home-sets">
        <div class="hs-head">
            <div>
                <p class="hs-eyebrow">{{ $t('home.setsEyebrow') }}</p>
                <h2 class="hs-title">{{ $t('home.setsTitle') }}</h2>
            </div>
            <router-link
                :to="{ name: 'business-sets', params: { lang: currentLang } }"
                class="hs-viewall"
            >
                {{ $t('businessSets.viewAll') }}
                <span aria-hidden="true">&rarr;</span>
            </router-link>
        </div>

        <div class="hs-grid">
            <router-link
                v-for="s in teasers"
                :key="s.id"
                :to="{ name: 'business-set', params: { lang: currentLang, slug: s.slug } }"
                class="hs-card"
            >
                <!-- Always rendered: with nothing to show it stays an empty beige
                     tile, which keeps every row's text on the same left edge. -->
                <div class="hs-media">
                    <img
                        v-if="s.cover_image_key"
                        class="hs-cover"
                        :src="getProjectImageUrl(s.cover_image_key)"
                        :alt="tName(s)"
                        loading="lazy"
                    />
                    <div v-else class="hs-collage" :class="`hs-collage--${thumbs(s).length}`">
                        <img
                            v-for="i in thumbs(s)"
                            :key="i.id"
                            :src="getProductImageUrl(i.image_key, 'thumb')"
                            alt=""
                            loading="lazy"
                        />
                    </div>
                </div>

                <div class="hs-body">
                    <h3 class="hs-name">{{ tName(s) }}</h3>
                    <p v-if="tDesc(s)" class="hs-desc">{{ tDesc(s) }}</p>

                    <div class="hs-meta">
                        <span class="hs-count">{{ $t('businessSets.itemCount', { count: s.items.length }) }}</span>
                        <span v-if="s.discount_pct > 0" class="hs-badge">
                            {{ $t('businessSets.savePct', { pct: pct(s.discount_pct) }) }}
                        </span>
                    </div>

                    <div class="hs-price">
                        <span class="hs-now">&#3647;{{ s.rollUp.total.toFixed(2) }}</span>
                        <span v-if="s.rollUp.discountAmount > 0" class="hs-was">
                            &#3647;{{ s.rollUp.subtotal.toFixed(2) }}
                        </span>
                    </div>
                </div>
            </router-link>
        </div>
    </section>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400;600&family=Work+Sans:wght@300;400;500;600&display=swap');

/* Deliberately lighter than the tile bands above it. Featured, New Arrivals and
   Categories are already big-card sections; a fourth one turns the page into a
   wall of cards, so the sets read as a compact strip instead. */
.home-sets {
    padding: clamp(30px, 3.5vw, 48px) clamp(18px, 5%, 40px);
    background: #FBF7F2;
}

.hs-head {
    max-width: 1300px;
    margin: 0 auto 16px auto;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
}

.hs-eyebrow {
    margin: 0 0 4px 0;
    font-family: 'Work Sans', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #8b6f47;
}

.hs-title {
    margin: 0;
    font-family: 'Crimson Pro', serif;
    font-size: clamp(1.35rem, 2vw, 1.7rem);
    font-weight: 600;
    color: #4a3529;
    line-height: 1.15;
}

.hs-viewall {
    flex-shrink: 0;
    font-family: 'Work Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: #8b6f47;
    text-decoration: none;
    white-space: nowrap;
    transition: color 0.2s;
}

.hs-viewall:hover { color: #DD876E; }

.hs-grid {
    max-width: 1300px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 14px;
}

/* Thumbnail beside the text, not above it: the row is about a third the height of
   a stacked card, and the price stays on the first screenful. */
.hs-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px;
    background: #fff;
    border: 1px solid #eee0d0;
    border-radius: 12px;
    text-decoration: none;
    color: inherit;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.hs-card:hover {
    border-color: #DD876E;
    box-shadow: 0 4px 14px rgba(96, 69, 57, 0.09);
}

.hs-media {
    width: 84px;
    height: 84px;
    flex: none;
    border-radius: 9px;
    overflow: hidden;
    background: #f3e7d7;
}

.hs-cover,
.hs-collage img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

/* No cover uploaded: tile the component products instead of showing a blank box. */
.hs-collage {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-auto-rows: 1fr;
    gap: 2px;
    width: 100%;
    height: 100%;
}

.hs-collage--1 { grid-template-columns: 1fr; }
/* Three thumbnails: the first spans the left column so the tile stays square. */
.hs-collage--3 img:first-child { grid-row: span 2; }

.hs-body {
    min-width: 0;
    flex: 1;
}

.hs-name {
    margin: 0;
    font-family: 'Crimson Pro', serif;
    font-size: 1.05rem;
    font-weight: 600;
    color: #4a3529;
    line-height: 1.3;
    /* Set names are admin-written; one line keeps every row the same height. */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.hs-desc {
    margin: 2px 0 0 0;
    font-family: 'Work Sans', sans-serif;
    font-size: 13px;
    line-height: 1.45;
    color: #9d8877;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.hs-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 6px 0 4px 0;
}

.hs-count {
    font-family: 'Work Sans', sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: #a8907e;
}

/* Inline with the item count rather than overlaid on an 84px thumbnail, where it
   would cover most of the picture. */
.hs-badge {
    padding: 2px 8px;
    border-radius: 999px;
    background: #fbe7e0;
    color: #c26a4f;
    font-family: 'Work Sans', sans-serif;
    font-size: 11px;
    font-weight: 700;
}

.hs-price {
    display: flex;
    align-items: baseline;
    gap: 8px;
}

.hs-now {
    font-family: 'Work Sans', sans-serif;
    font-size: 1.05rem;
    font-weight: 700;
    color: #604539;
}

.hs-was {
    font-family: 'Work Sans', sans-serif;
    font-size: 12px;
    color: #b3a091;
    text-decoration: line-through;
}

@media (max-width: 640px) {
    .hs-head {
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
    }
}
</style>
