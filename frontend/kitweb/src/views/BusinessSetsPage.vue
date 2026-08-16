<script setup>
// Ready-to-sell wholesale bundles: fixed combinations at fixed quantities, so a
// shop makes one decision instead of picking dozens of SKUs.
import { ref, computed, onMounted, onServerPrefetch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useHead } from '@unhead/vue';
import { api, getProjectImageUrl } from '../services/api';
import { rollUpSet } from '../utils/setPricing';
import BreadcrumbBar from '../components/breadcrumb-bar.vue';
import { defaultLang } from '../utils/localeRoutes';

const route = useRoute();
const { t, locale } = useI18n();
const currentLang = computed(() => route.params.lang || defaultLang);

const sets = ref([]);
const loading = ref(true);

const isThai = computed(() => String(locale.value).toLowerCase() === 'th');
const tName = (s) => (isThai.value && s.name_th ? s.name_th : s.name) || '';

// Price is rolled up here rather than server-side so productPricing.js stays the
// single definition of the box -> per-piece rule.
const priced = computed(() => sets.value.map(s => ({ ...s, rollUp: rollUpSet(s) })));

const load = async () => {
    loading.value = true;
    try {
        sets.value = await api.getBusinessSets();
    } catch {
        sets.value = [];
    } finally {
        loading.value = false;
    }
};

onServerPrefetch(load);
onMounted(() => { if (!sets.value.length) load(); });

const crumbs = computed(() => [
    { label: t('nav.home'), to: { name: 'home', params: { lang: currentLang.value } } },
    { label: t('businessSets.title') }
]);

useHead(() => ({
    title: `${t('businessSets.title')} | KitCraft`,
    meta: [{ name: 'description', content: t('businessSets.subtitle') }]
}));
</script>

<template>
    <div class="sets-page">
        <BreadcrumbBar :items="crumbs" />

        <header class="sets-header">
            <h1>{{ $t('businessSets.title') }}</h1>
            <p>{{ $t('businessSets.subtitle') }}</p>
        </header>

        <div v-if="loading" class="sets-state">{{ $t('businessSets.loading') }}</div>
        <div v-else-if="!priced.length" class="sets-state">{{ $t('businessSets.empty') }}</div>

        <div v-else class="sets-grid">
            <router-link
                v-for="s in priced"
                :key="s.id"
                :to="{ name: 'business-set', params: { lang: currentLang, slug: s.slug } }"
                class="set-card"
            >
                <img v-if="s.cover_image_key" :src="getProjectImageUrl(s.cover_image_key)" :alt="tName(s)" />
                <div class="set-card-body">
                    <h2>{{ tName(s) }}</h2>
                    <p class="set-card-count">{{ $t('businessSets.itemCount', { count: s.items.length }) }}</p>
                    <p class="set-card-price">฿{{ s.rollUp.total.toFixed(2) }}</p>
                </div>
            </router-link>
        </div>
    </div>
</template>

<style scoped>
.sets-page { max-width: 1200px; margin: 0 auto; padding: 0 16px 64px; }
.sets-header { text-align: center; padding: 32px 0; }
.sets-header h1 { font-size: 2rem; margin: 0 0 8px; }
.sets-state { text-align: center; padding: 48px 0; color: #666; }
.sets-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 24px; }
.set-card { display: block; border: 1px solid #e5e5e5; border-radius: 12px; overflow: hidden; text-decoration: none; color: inherit; background: #fff; }
.set-card img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; display: block; }
.set-card-body { padding: 16px; }
.set-card-body h2 { font-size: 1.1rem; margin: 0 0 6px; }
.set-card-count { color: #777; font-size: 0.9rem; margin: 0 0 8px; }
.set-card-price { font-size: 1.25rem; font-weight: 700; margin: 0; }
</style>
