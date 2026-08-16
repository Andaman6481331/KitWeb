<script setup>
// One business set: its fixed contents, the rolled-up price, and a button that
// submits the whole thing as an RFQ with quantities locked.
import { ref, computed, onMounted, onServerPrefetch, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useHead } from '@unhead/vue';
import { api, getProjectImageUrl } from '../services/api';
import { getProductImageUrl } from '../utils/productImages';
import { rollUpSet } from '../utils/setPricing';
import BreadcrumbBar from '../components/breadcrumb-bar.vue';
import RfqModal from '../components/rfq-modal.vue';
import { defaultLang } from '../utils/localeRoutes';

const route = useRoute();
const { t, locale } = useI18n();
const currentLang = computed(() => route.params.lang || defaultLang);

const set = ref(null);
const loading = ref(true);
const notFound = ref(false);
const showRfq = ref(false);

const isThai = computed(() => String(locale.value).toLowerCase() === 'th');
const tName = (s) => (isThai.value && s?.name_th ? s.name_th : s?.name) || '';
const tLine = (l) => (isThai.value && l.name_th ? l.name_th : l.name) || '';

const rollUp = computed(() => (set.value ? rollUpSet(set.value) : null));

// Quantities are fixed by the set — that is the whole point, so the modal gets
// them as-is and offers no way to change them.
const rfqItems = computed(() =>
    (rollUp.value?.lines || []).map(l => ({
        id: l.product_id, sku: null, title: l.name, quantity: l.quantity
    }))
);

const load = async () => {
    loading.value = true;
    notFound.value = false;
    try {
        set.value = await api.getBusinessSet(route.params.slug);
    } catch {
        notFound.value = true;
        set.value = null;
    } finally {
        loading.value = false;
    }
};

onServerPrefetch(load);
onMounted(() => { if (!set.value) load(); });
watch(() => route.params.slug, load);

const crumbs = computed(() => {
    const items = [
        { label: t('nav.home'), to: { name: 'home', params: { lang: currentLang.value } } },
        { label: t('businessSets.title'), to: { name: 'business-sets', params: { lang: currentLang.value } } }
    ];
    if (set.value) items.push({ label: tName(set.value) });
    return items;
});

useHead(() => ({
    title: set.value ? `${tName(set.value)} | KitCraft` : undefined
}));
</script>

<template>
    <div class="set-page">
        <BreadcrumbBar :items="crumbs" />

        <div v-if="loading" class="set-state">{{ $t('businessSets.loading') }}</div>
        <div v-else-if="notFound" class="set-state">{{ $t('businessSets.notFound') }}</div>

        <article v-else-if="set" class="set-article">
            <img v-if="set.cover_image_key" class="set-cover" :src="getProjectImageUrl(set.cover_image_key)" :alt="tName(set)" />

            <h1>{{ tName(set) }}</h1>
            <p v-if="set.description" class="set-description">
                {{ isThai && set.description_th ? set.description_th : set.description }}
            </p>

            <table class="set-contents">
                <thead>
                    <tr>
                        <th>{{ $t('businessSets.item') }}</th>
                        <th>{{ $t('businessSets.quantity') }}</th>
                        <th>{{ $t('businessSets.perPiece') }}</th>
                        <th>{{ $t('businessSets.lineTotal') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="line in rollUp.lines" :key="line.id">
                        <td class="line-name">
                            <img v-if="line.image_key" :src="getProductImageUrl(line.image_key)" :alt="tLine(line)" />
                            <span>{{ tLine(line) }}</span>
                        </td>
                        <td>{{ line.quantity }}</td>
                        <td>฿{{ line.perPiecePrice.toFixed(2) }}</td>
                        <td>฿{{ line.lineTotal.toFixed(2) }}</td>
                    </tr>
                </tbody>
            </table>

            <div class="set-totals">
                <div><span>{{ $t('businessSets.subtotal') }}</span><span>฿{{ rollUp.subtotal.toFixed(2) }}</span></div>
                <div v-if="rollUp.discountAmount > 0" class="set-discount">
                    <span>{{ $t('businessSets.discount', { pct: set.discount_pct }) }}</span>
                    <span>-฿{{ rollUp.discountAmount.toFixed(2) }}</span>
                </div>
                <div class="set-total"><span>{{ $t('businessSets.total') }}</span><span>฿{{ rollUp.total.toFixed(2) }}</span></div>
            </div>

            <button class="set-request" @click="showRfq = true">{{ $t('businessSets.requestSet') }}</button>
        </article>

        <RfqModal
            :open="showRfq"
            :items="rfqItems"
            :context-note="set ? `Business Set: ${set.name}` : ''"
            @close="showRfq = false"
        />
    </div>
</template>

<style scoped>
.set-page { max-width: 900px; margin: 0 auto; padding: 0 16px 64px; }
.set-state { text-align: center; padding: 48px 0; color: #666; }
.set-cover { width: 100%; border-radius: 12px; margin-bottom: 24px; }
.set-article h1 { font-size: 2rem; margin: 0 0 12px; }
.set-description { color: #555; line-height: 1.7; margin-bottom: 24px; }
.set-contents { width: 100%; border-collapse: collapse; }
.set-contents th, .set-contents td { text-align: left; padding: 12px 8px; border-bottom: 1px solid #eee; }
.set-contents th:not(:first-child), .set-contents td:not(:first-child) { text-align: right; }
.line-name { display: flex; align-items: center; gap: 12px; }
.line-name img { width: 44px; height: 44px; object-fit: cover; border-radius: 6px; }
.set-totals { margin: 24px 0; margin-left: auto; max-width: 320px; }
.set-totals > div { display: flex; justify-content: space-between; padding: 6px 0; }
.set-discount { color: #2e7d32; }
.set-total { font-size: 1.25rem; font-weight: 700; border-top: 2px solid #333; padding-top: 12px; }
.set-request { display: block; width: 100%; padding: 16px; font-size: 1.05rem; font-weight: 600; border: none; border-radius: 10px; background: #333; color: #fff; cursor: pointer; }

@media (max-width: 600px) {
    .set-contents thead { display: none; }
    .set-contents tr { display: grid; grid-template-columns: 1fr auto; padding: 12px 0; border-bottom: 1px solid #eee; }
    .set-contents td { border: none; padding: 2px 0; }
    .set-totals { max-width: none; }
}
</style>
