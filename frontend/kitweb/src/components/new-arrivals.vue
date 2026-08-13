<script setup>
// Newest stock, straight from products.created_at. No editorial upkeep at all —
// it refreshes itself every time something is added in the admin panel, which is
// what makes it worth a homepage slot.
import { ref, computed, onMounted, onServerPrefetch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { api} from '../services/api';
import { getProductImageUrl } from '@/utils/productImages';
import { defaultLang } from '../utils/localeRoutes';
import { getCheapestPricePerPiece } from '../utils/productPricing';

const LIMIT = 8;

const route = useRoute();
const { locale } = useI18n();
const currentLang = computed(() => route.params.lang || defaultLang);

const products = ref([]);
const loading = ref(true);

const isThai = computed(() => String(locale.value).toLowerCase() === 'th');
const tName = (p) => (isThai.value ? (p.name_th || p.name) : p.name) || '';

const load = async () => {
    try {
        // The API already sorts by created_at DESC, so this is just the head of it.
        const all = await api.getProducts();
        products.value = all.slice(0, LIMIT);
    } catch (err) {
        console.error('Failed to load new arrivals:', err);
    } finally {
        loading.value = false;
    }
};

onServerPrefetch(load);
onMounted(() => { if (!products.value.length) load(); });
</script>

<template>
    <section v-if="loading || products.length" class="new-arrivals">
        <div class="na-head">
            <div>
                <p class="na-eyebrow">{{ $t('home.newArrivalsEyebrow') }}</p>
                <h2 class="na-title">{{ $t('home.newArrivalsTitle') }}</h2>
            </div>
            <router-link
                :to="{ name: 'catalog', params: { lang: currentLang, category: 'all' } }"
                class="na-viewall"
            >
                {{ $t('nav.viewAll') }}
                <span aria-hidden="true">&rarr;</span>
            </router-link>
        </div>

        <!-- A marquee, like the KitCraft banner: the row drifts on its own so the
             section reads as live, and pauses on hover or keyboard focus so a card
             can actually be clicked. -->
        <div class="na-rail">
            <!-- Too few products and the two sets are narrower than the viewport,
                 so the loop would show a gap sweeping across. Sit still instead. -->
            <div class="na-track" :class="{ 'na-track-static': products.length < 5 }">
                <div class="na-set">
                    <router-link
                        v-for="p in products"
                        :key="p.id"
                        :to="{ name: 'catalog', params: { lang: currentLang, category: p.category, productSlug: p.slug } }"
                        class="na-card"
                    >
                        <div class="na-card-img">
                            <img :src="getProductImageUrl(p.image_key)" :alt="tName(p)" loading="lazy" />
                        </div>
                        <div class="na-card-body">
                            <span class="na-card-name">{{ tName(p) }}</span>
                            <span v-if="getCheapestPricePerPiece(p)" class="na-card-price">
                                ฿{{ getCheapestPricePerPiece(p).toFixed(2) }}
                                <span class="na-card-unit">/ {{ $t('catalog.piece') }}</span>
                            </span>
                        </div>
                    </router-link>
                </div>

                <!-- The second copy is what makes the loop seamless. It is hidden
                     from assistive tech and taken out of the tab order, so the same
                     eight products are not announced or tabbed through twice. -->
                <div class="na-set" aria-hidden="true">
                    <router-link
                        v-for="p in products"
                        :key="`dup-${p.id}`"
                        :to="{ name: 'catalog', params: { lang: currentLang, category: p.category, productSlug: p.slug } }"
                        class="na-card"
                        tabindex="-1"
                    >
                        <div class="na-card-img">
                            <img :src="getProductImageUrl(p.image_key)" alt="" loading="lazy" />
                        </div>
                        <div class="na-card-body">
                            <span class="na-card-name">{{ tName(p) }}</span>
                            <span v-if="getCheapestPricePerPiece(p)" class="na-card-price">
                                ฿{{ getCheapestPricePerPiece(p).toFixed(2) }}
                                <span class="na-card-unit">/ {{ $t('catalog.piece') }}</span>
                            </span>
                        </div>
                    </router-link>
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400;600&family=Work+Sans:wght@300;400;500;600&display=swap');

.new-arrivals {
    padding: clamp(40px, 5vw, 64px) 0 clamp(40px, 5vw, 64px) 0;
    background: #FBF7F2;
}

.na-head {
    max-width: 1300px;
    margin: 0 auto 24px auto;
    padding: 0 clamp(18px, 5%, 40px);
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
}

.na-eyebrow {
    margin: 0 0 6px 0;
    font-family: 'Work Sans', sans-serif;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #8b6f47;
}

.na-title {
    margin: 0;
    font-family: 'Crimson Pro', serif;
    font-size: clamp(1.7rem, 3vw, 2.3rem);
    font-weight: 600;
    color: #4a3529;
    line-height: 1.15;
}

.na-viewall {
    flex-shrink: 0;
    font-family: 'Work Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: #8b6f47;
    text-decoration: none;
    white-space: nowrap;
    transition: color 0.2s;
}

.na-viewall:hover { color: #DD876E; }

.na-rail {
    --na-gap: 18px;
    overflow: hidden;
    /* Room for the card's hover lift, which would otherwise clip. */
    padding: 6px 0 14px 0;
}

.na-track {
    display: flex;
    gap: var(--na-gap);
    width: max-content;
}

.na-set {
    display: flex;
    gap: var(--na-gap);
}

/* The drift only exists where there is a pointer to pause it with. See the
   swipeable variant below for touch. */
@media (min-width: 769px) {
    .na-rail {
        /* Fades both ends without hard-coding the section's background colour.
           Scoped to the animated case: a mask over a wide transform-animated
           child is what makes iOS Safari drop the composited layer mid-cycle. */
        -webkit-mask-image: linear-gradient(to right, transparent, #000 5%, #000 95%, transparent);
        mask-image: linear-gradient(to right, transparent, #000 5%, #000 95%, transparent);
    }

    .na-track:not(.na-track-static) {
        animation: na-marquee 45s linear infinite;
        /* Keep the layer promoted for the whole cycle rather than letting the
           compositor pick it up and drop it. */
        will-change: transform;
        backface-visibility: hidden;
    }

    /* Stop for anyone reading or reaching for a card. */
    .na-rail:hover .na-track,
    .na-rail:focus-within .na-track {
        animation-play-state: paused;
    }
}

/* The track is two equal sets plus one gap between them, so a bare -50% would
   land half a gap short and jump on every loop. */
@keyframes na-marquee {
    from { transform: translateX(0); }
    to { transform: translateX(calc(-50% - var(--na-gap) / 2)); }
}

/* A hand-scrollable rail: what a touch screen gets, and what anyone who asked
   for less motion gets at any width. Hover-to-pause never fires on touch, and
   the drifting version's overflow:hidden left it impossible to scrub by hand. */
@media (max-width: 768px), (prefers-reduced-motion: reduce) {
    .na-rail {
        overflow-x: auto;
        padding-left: clamp(18px, 5%, 40px);
        padding-right: clamp(18px, 5%, 40px);
        scroll-snap-type: x proximity;
        overscroll-behavior-x: contain;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        -webkit-mask-image: none;
        mask-image: none;
    }

    .na-rail::-webkit-scrollbar { display: none; }
    .na-track { animation: none; }
    .na-card { scroll-snap-align: start; }
}

.na-card {
    flex: 0 0 208px;
    background: #fff;
    border: 1px solid #efe3d6;
    border-radius: 14px;
    overflow: hidden;
    text-decoration: none;
    transition: transform 0.22s, box-shadow 0.22s;
}

@media (hover: hover) {
    .na-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 10px 26px rgba(96, 69, 57, 0.13);
    }
}

.na-card-img {
    width: 100%;
    aspect-ratio: 1 / 1;
    overflow: hidden;
    background: #f6efe6;
}

.na-card-img img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.na-card-body {
    padding: 12px 14px 16px 14px;
}

.na-card-name {
    display: block;
    font-family: 'Work Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: #4a3529;
    line-height: 1.4;
    margin-bottom: 6px;
    /* Two lines max so every card in the rail stays the same height. */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.na-card-price {
    font-family: 'Work Sans', sans-serif;
    font-size: 14px;
    font-weight: 700;
    color: #C4694E;
}

.na-card-unit {
    font-weight: 500;
    font-size: 12px;
    color: #9e8272;
}

@media (max-width: 640px) {
    .na-rail { --na-gap: 12px; }
    .na-card { flex-basis: 158px; }
    /* Narrower cards mean a shorter track; keep the drift at a similar speed. */
    .na-track { animation-duration: 34s; }
}
</style>
