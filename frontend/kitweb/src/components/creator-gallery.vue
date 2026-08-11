<script setup>
// Photos from workshops and from makers, with a credit line and — where one was
// recorded — a link to the product in the shot. Reads the `gallery` table, which
// also backs the same treatment beside a product or an article; pass productId or
// projectId to narrow it to those.
import { ref, computed, onMounted, onServerPrefetch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { api, getGalleryImageUrl } from '../services/api';
import { defaultLang } from '../utils/localeRoutes';

const props = defineProps({
    productId: { type: [Number, String], default: null },
    projectId: { type: [Number, String], default: null },
    limit: { type: Number, default: null },
    // The section renders its own heading by default; a host page that already has
    // one can turn it off.
    showHeading: { type: Boolean, default: true },
    // "Creator Gallery" on KitCraft, "From our customers" beside a product. Pass an
    // empty subtitleKey to render the title alone.
    titleKey: { type: String, default: 'gallery.title' },
    subtitleKey: { type: String, default: 'gallery.subtitle' },
    // Drop the band's own background, padding and width cap so the component can
    // sit inside a section the host page already owns.
    bare: { type: Boolean, default: false },
    // The "tag us" line belongs on a page about the community, not beside a
    // product's price.
    showSubmitPrompt: { type: Boolean, default: true }
});

const route = useRoute();
const { locale } = useI18n();
const currentLang = computed(() => route.params.lang || defaultLang);
const isThai = computed(() => String(locale.value).toLowerCase() === 'th');

const items = ref([]);
const products = ref([]);
const hasLoaded = ref(false);

async function load() {
    try {
        items.value = await api.getGallery({
            productId: props.productId,
            projectId: props.projectId,
            limit: props.limit
        });
    } catch (error) {
        console.error('Error loading gallery:', error);
        items.value = [];
        return;
    } finally {
        hasLoaded.value = true;
    }

    // Only pay for the product list when a photo actually credits one — most
    // community shots name a maker, not a SKU.
    if (!items.value.some(item => item.product_id)) return;
    try {
        products.value = await api.getProducts();
    } catch {
        products.value = [];
    }
}

onServerPrefetch(load);
onMounted(() => { if (!hasLoaded.value) load(); });

const productById = computed(() => {
    const map = new Map();
    products.value.forEach(p => map.set(Number(p.id), p));
    return map;
});

const linkedProduct = (item) => {
    if (!item.product_id) return null;
    const product = productById.value.get(Number(item.product_id));
    // A product can be deleted or hidden after a photo credits it; drop the chip
    // rather than linking at a 404.
    return product && product.slug && product.category ? product : null;
};

const productName = (product) => (isThai.value ? (product.name_th || product.name) : product.name) || '';

const caption = (item) => (isThai.value && item.caption_th ? item.caption_th : item.caption) || '';
</script>

<template>
    <section v-if="items.length" class="creator-gallery" :class="{ bare }">
        <div class="cg-inner">
            <div v-if="showHeading" class="cg-header">
                <h2>{{ $t(titleKey) }}</h2>
                <p v-if="subtitleKey">{{ $t(subtitleKey) }}</p>
            </div>

            <div class="cg-grid">
                <figure v-for="item in items" :key="item.id" class="cg-item">
                    <img :src="getGalleryImageUrl(item.image_key)" :alt="caption(item)" loading="lazy" />

                    <figcaption class="cg-caption">
                        <span v-if="caption(item)" class="cg-text">{{ caption(item) }}</span>

                        <a
                            v-if="item.credit_handle && item.credit_url"
                            class="cg-credit"
                            :href="item.credit_url"
                            target="_blank"
                            rel="noopener nofollow"
                        >@{{ item.credit_handle }}</a>
                        <span v-else-if="item.credit_handle" class="cg-credit">@{{ item.credit_handle }}</span>
                        <span v-else-if="item.credit_name" class="cg-credit">{{ item.credit_name }}</span>

                        <router-link
                            v-if="linkedProduct(item)"
                            class="cg-shop"
                            :to="{ name: 'catalog', params: {
                                lang: currentLang,
                                category: linkedProduct(item).category,
                                productSlug: linkedProduct(item).slug
                            } }"
                        >
                            {{ $t('gallery.shopThis') }}
                            <span aria-hidden="true">&rarr;</span>
                        </router-link>
                    </figcaption>
                </figure>
            </div>

            <p v-if="showSubmitPrompt" class="cg-submit">
                {{ $t('gallery.submitPrompt') }}
                <a href="https://www.instagram.com/kit_craft376/" target="_blank" rel="noopener">@kit_craft376</a>
            </p>
        </div>
    </section>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400;600&family=Work+Sans:wght@300;400;500;600&display=swap');

.creator-gallery {
    background: #F6EDE1;
    padding: clamp(48px, 6vw, 84px) 5%;
}

.cg-inner {
    max-width: 1200px;
    margin: 0 auto;
}

/* Embedded: the host section already provides the ground, gutters and width, and
   its other headings are left-aligned — a centred serif title would read as a
   different page. */
.creator-gallery.bare {
    background: none;
    padding: 0;
}

.creator-gallery.bare .cg-inner {
    max-width: none;
}

.creator-gallery.bare .cg-header {
    text-align: left;
    margin-bottom: 18px;
}

.creator-gallery.bare .cg-header h2 {
    font-size: clamp(1.25rem, 2.2vw, 1.6rem);
}

.cg-header {
    text-align: center;
    margin-bottom: 36px;
}

.cg-header h2 {
    margin: 0 0 10px 0;
    font-family: 'Crimson Pro', serif;
    font-size: clamp(1.8rem, 3.2vw, 2.5rem);
    font-weight: 600;
    color: #4a3529;
}

.cg-header p {
    margin: 0;
    font-family: 'Work Sans', sans-serif;
    font-size: 1rem;
    color: #7a6355;
}

.cg-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
    gap: 16px;
}

.cg-item {
    position: relative;
    margin: 0;
    border-radius: 14px;
    overflow: hidden;
    background: #eadfd0;
    aspect-ratio: 1 / 1;
    box-shadow: 0 6px 18px rgba(96, 69, 57, 0.1);
}

.cg-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.5s ease;
}

.cg-item:hover img { transform: scale(1.05); }

/* The caption sits on the photo permanently rather than on hover: touch devices
   have no hover, and an uncredited photo is worse than a busy one. */
.cg-caption {
    position: absolute;
    inset: auto 0 0 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: 28px 14px 12px 14px;
    background: linear-gradient(to top, rgba(45, 32, 25, 0.88), rgba(45, 32, 25, 0));
    font-family: 'Work Sans', sans-serif;
    color: #fff;
}

.cg-text {
    font-size: 12.5px;
    line-height: 1.4;
    /* Two lines keeps a long caption from covering the photo it describes. */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.cg-credit {
    font-size: 11.5px;
    font-weight: 600;
    color: #f0d9c6;
    text-decoration: none;
}

a.cg-credit:hover { color: #fff; text-decoration: underline; }

.cg-shop {
    margin-top: 4px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 11px;
    background: rgba(255, 255, 255, 0.92);
    border-radius: 20px;
    font-size: 11.5px;
    font-weight: 600;
    color: #604539;
    text-decoration: none;
    transition: background 0.2s;
}

.cg-shop:hover { background: #fff; }

.cg-submit {
    margin: 28px 0 0 0;
    text-align: center;
    font-family: 'Work Sans', sans-serif;
    font-size: 14px;
    color: #7a6355;
}

.cg-submit a {
    color: #C4694E;
    font-weight: 600;
    text-decoration: none;
}

.cg-submit a:hover { text-decoration: underline; }

@media (max-width: 640px) {
    .cg-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
    .cg-text { -webkit-line-clamp: 1; line-clamp: 1; }
}
</style>
