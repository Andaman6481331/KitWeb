<script setup>
// A single editorial post: tutorial body, cover, and the products it uses.
import { ref, computed, onMounted, onServerPrefetch, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useHead } from '@unhead/vue';
import { api, getProjectImageUrl } from '../services/api';
// Bare product keys are served as `<key>-thumb.webp`; getImageUrl would 404.
import { getProductImageUrl } from '../utils/productImages';
import BreadcrumbBar from '../components/breadcrumb-bar.vue';
import { defaultLang } from '../utils/localeRoutes';
import { getCheapestPricePerPiece } from '../utils/productPricing';

const route = useRoute();
const { t, locale } = useI18n();
const currentLang = computed(() => route.params.lang || defaultLang);

const project = ref(null);
const linkedProducts = ref([]);
const loading = ref(true);
const notFound = ref(false);

const isThai = computed(() => String(locale.value).toLowerCase() === 'th');

// Thai copy where it exists, English otherwise. zh/ja have no translated bodies
// yet, so they read the English source rather than an empty page.
const tp = (field) => {
    if (!project.value) return '';
    if (isThai.value && project.value[`${field}_th`]) return project.value[`${field}_th`];
    return project.value[field] || '';
};

const tProductName = (p) => (isThai.value ? (p.name_th || p.name) : p.name) || '';

// Body is stored as plain text; blank lines separate paragraphs.
const paragraphs = computed(() =>
    tp('body').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean)
);

const formattedDate = computed(() => {
    if (!project.value?.published_at) return '';
    const d = new Date(project.value.published_at);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(isThai.value ? 'th-TH' : 'en-GB', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
});

const loadProject = async () => {
    loading.value = true;
    notFound.value = false;
    try {
        project.value = await api.getProject(route.params.slug);

        // Linked products are fetched separately: the projects endpoint stores only
        // ids, and the full product list is already cached for most visitors.
        const ids = project.value?.product_ids || [];
        if (ids.length) {
            const all = await api.getProducts();
            linkedProducts.value = ids
                .map(id => all.find(p => Number(p.id) === Number(id)))
                .filter(Boolean);
        } else {
            linkedProducts.value = [];
        }
    } catch {
        notFound.value = true;
        project.value = null;
    } finally {
        loading.value = false;
    }
};

onServerPrefetch(loadProject);
onMounted(() => { if (!project.value) loadProject(); });
watch(() => route.params.slug, loadProject);

const crumbs = computed(() => {
    const items = [
        { label: t('nav.home'), to: { name: 'home', params: { lang: currentLang.value } } },
        { label: t('projects.sectionTitle'), to: { name: 'event', params: { lang: currentLang.value } } }
    ];
    if (project.value) items.push({ label: tp('title') });
    return items;
});

useHead(() => ({
    title: project.value ? `${tp('title')} | KitCraft` : undefined,
    meta: project.value
        ? [{ name: 'description', content: tp('excerpt').slice(0, 160) }]
        : []
}));
</script>

<template>
    <div class="project-page">
        <BreadcrumbBar :items="crumbs" />

        <div v-if="loading" class="project-state">{{ $t('projects.loading') }}</div>

        <div v-else-if="notFound" class="project-state">
            <p>{{ $t('projects.notFound') }}</p>
            <router-link :to="{ name: 'event', params: { lang: currentLang } }" class="project-cta">
                {{ $t('projects.viewAll') }}
            </router-link>
        </div>

        <article v-else-if="project" class="project-article">
            <header class="project-header">
                <p v-if="formattedDate" class="project-date">{{ formattedDate }}</p>
                <h1 class="project-title">{{ tp('title') }}</h1>
                <p v-if="tp('excerpt')" class="project-excerpt">{{ tp('excerpt') }}</p>
            </header>

            <img
                v-if="project.cover_image_key"
                class="project-cover"
                :src="getProjectImageUrl(project.cover_image_key)"
                :alt="tp('title')"
            />

            <div v-if="project.video_url" class="project-video">
                <video :src="project.video_url" controls playsinline></video>
            </div>

            <div class="project-body">
                <p v-for="(para, i) in paragraphs" :key="i">{{ para }}</p>
            </div>

            <!-- What you need: the products this post actually uses. This is the
                 link between editorial content and the catalog. -->
            <section v-if="linkedProducts.length" class="project-products">
                <h2 class="project-products-title">{{ $t('projects.whatYouNeed') }}</h2>
                <div class="project-products-grid">
                    <router-link
                        v-for="p in linkedProducts"
                        :key="p.id"
                        :to="{ name: 'catalog', params: { lang: currentLang, category: p.category, productSlug: p.slug } }"
                        class="linked-product"
                    >
                        <img :src="getProductImageUrl(p.image_key, 'thumb')" :alt="tProductName(p)" />
                        <div class="linked-product-info">
                            <span class="linked-product-name">{{ tProductName(p) }}</span>
                            <span v-if="getCheapestPricePerPiece(p)" class="linked-product-price">
                                ฿{{ getCheapestPricePerPiece(p).toFixed(2) }} / {{ $t('catalog.piece') }}
                            </span>
                        </div>
                    </router-link>
                </div>
            </section>

            <router-link :to="{ name: 'event', params: { lang: currentLang } }" class="project-cta">
                {{ $t('projects.viewAll') }}
            </router-link>
        </article>
    </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400;600&family=Work+Sans:wght@300;400;500;600&display=swap');

.project-page {
    background: #FBF7F2;
    min-height: 60vh;
}

.project-state {
    max-width: 720px;
    margin: 0 auto;
    padding: 80px 24px;
    text-align: center;
    font-family: 'Work Sans', sans-serif;
    color: #8b6f47;
}

/* ── Article ────────────────────────────────────────── */
.project-article {
    max-width: 760px;
    margin: 0 auto;
    padding: 48px 24px 90px 24px;
}

.project-date {
    margin: 0 0 12px 0;
    font-family: 'Work Sans', sans-serif;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #a8917f;
}

.project-title {
    margin: 0 0 16px 0;
    font-family: 'Crimson Pro', serif;
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 600;
    line-height: 1.15;
    color: #4a3529;
}

.project-excerpt {
    margin: 0 0 32px 0;
    font-family: 'Work Sans', sans-serif;
    font-size: 1.05rem;
    line-height: 1.7;
    color: #7a6355;
}

.project-cover {
    width: 100%;
    border-radius: 14px;
    margin-bottom: 36px;
    aspect-ratio: 16 / 9;
    object-fit: cover;
}

.project-video {
    margin-bottom: 36px;
}

.project-video video {
    width: 100%;
    border-radius: 14px;
    display: block;
}

.project-body p {
    font-family: 'Work Sans', sans-serif;
    font-size: 1.02rem;
    line-height: 1.85;
    color: #55463c;
    margin: 0 0 22px 0;
}

/* ── Linked products ────────────────────────────────── */
.project-products {
    margin: 48px 0 36px 0;
    padding-top: 36px;
    border-top: 1px solid #ebdccb;
}

.project-products-title {
    margin: 0 0 20px 0;
    font-family: 'Crimson Pro', serif;
    font-size: 1.6rem;
    font-weight: 600;
    color: #4a3529;
}

.project-products-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 16px;
}

.linked-product {
    display: block;
    background: #fff;
    border: 1px solid #efe3d6;
    border-radius: 12px;
    overflow: hidden;
    text-decoration: none;
    transition: transform 0.2s, box-shadow 0.2s;
}

.linked-product:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 22px rgba(96, 69, 57, 0.12);
}

.linked-product img {
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    display: block;
}

.linked-product-info {
    padding: 11px 13px 14px 13px;
}

.linked-product-name {
    display: block;
    font-family: 'Work Sans', sans-serif;
    font-size: 13.5px;
    font-weight: 600;
    color: #4a3529;
    line-height: 1.35;
    margin-bottom: 5px;
}

.linked-product-price {
    display: block;
    font-family: 'Work Sans', sans-serif;
    font-size: 12.5px;
    color: #C4694E;
    font-weight: 600;
}

.project-cta {
    display: inline-block;
    padding: 11px 26px;
    background: #604539;
    color: #fff;
    border-radius: 12px;
    font-family: 'Work Sans', sans-serif;
    font-size: 14.5px;
    font-weight: 600;
    text-decoration: none;
    transition: background 0.2s, transform 0.2s;
}

.project-cta:hover {
    background: #8b6f47;
    transform: translateY(-2px);
}

@media (max-width: 640px) {
    .project-article { padding: 32px 18px 64px 18px; }
    .project-products-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
}
</style>
