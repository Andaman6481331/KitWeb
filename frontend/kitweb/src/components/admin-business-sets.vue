<script setup>
// Editor for product_sets — fixed wholesale bundles. Modelled on admin-projects.vue.
// Quantities snap to the product's MOQ here, at entry time, so stored quantities
// are always valid box multiples and the public pages never have to re-snap.
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { api, getProjectImageUrl, API_URL } from '../services/api';
import { parseMoq } from '../utils/productPricing';
import { rollUpSet } from '../utils/setPricing';

const { t } = useI18n();

const sets = ref([]);
const products = ref([]);
const loading = ref(true);
const saving = ref(false);
const errorMessage = ref('');

const blankForm = () => ({
    id: null, name: '', name_th: '', description: '', description_th: '',
    cover_image_key: '', price_tier: 1, discount_pct: 0,
    is_published: true, sort_order: 0,
    // [{ product_id, variant_id, quantity }]
    items: []
});

const form = ref(blankForm());
const panelOpen = ref(false);
const productSearch = ref('');
const qtyWarnings = ref({});
const coverFile = ref(null);
const coverPreview = ref('');
const uploadingCover = ref(false);

const onCoverPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    coverFile.value = file;
    coverPreview.value = URL.createObjectURL(file);
};

// Covers go through the same /upload endpoint products use, into the IMAGES bucket.
// That endpoint keys objects by the uploaded filename, so the file is renamed to a
// unique "set-<timestamp>-<rand>.<ext>" first — two covers both named "cover.jpg"
// would otherwise overwrite each other.
const uploadCover = async () => {
    if (!coverFile.value) return form.value.cover_image_key;
    uploadingCover.value = true;
    try {
        const original = coverFile.value.name || 'cover.jpg';
        const ext = original.includes('.') ? original.split('.').pop().toLowerCase() : 'jpg';
        const key = `set-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const fd = new FormData();
        fd.append('file', new File([coverFile.value], key, { type: coverFile.value.type }));

        const res = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            headers: { 'Authorization': api.getToken() },
            body: fd
        });
        if (!res.ok) throw new Error('Cover upload failed');
        const data = await res.json();
        return data.key || key;
    } finally {
        uploadingCover.value = false;
    }
};

const productById = computed(() => {
    const map = new Map();
    products.value.forEach(p => map.set(Number(p.id), p));
    return map;
});

const filteredProducts = computed(() => {
    const q = productSearch.value.trim().toLowerCase();
    if (!q) return products.value.slice(0, 40);
    return products.value
        .filter(p => `${p.name || ''} ${p.name_th || ''} ${p.sku || ''}`.toLowerCase().includes(q))
        .slice(0, 40);
});

// Live roll-up so the price is visible before publishing. Shaped like the API
// response so it can go straight through rollUpSet.
const preview = computed(() => rollUpSet({
    price_tier: form.value.price_tier,
    discount_pct: form.value.discount_pct,
    items: form.value.items.map(it => {
        const p = productById.value.get(Number(it.product_id)) || {};
        return {
            ...it, name: p.name, moq: p.moq,
            price_1: p.price_1, price_2: p.price_2, price_3: p.price_3
        };
    })
}));

const load = async () => {
    loading.value = true;
    try {
        const [setRows, prods] = await Promise.all([
            api.getBusinessSets({ includeUnpublished: true }),
            api.getProducts(null, { includeHidden: true })
        ]);
        sets.value = setRows;
        products.value = prods;
    } catch (err) {
        errorMessage.value = err.message;
    } finally {
        loading.value = false;
    }
};

onMounted(load);

const addLine = (productId) => {
    if (form.value.items.some(i => Number(i.product_id) === Number(productId))) return;
    const moq = parseMoq(productById.value.get(Number(productId))?.moq);
    form.value.items.push({ product_id: Number(productId), variant_id: null, quantity: moq });
};

const removeLine = (index) => {
    form.value.items.splice(index, 1);
};

// Round up to the next whole box, matching add-to-order-modal.vue's rule and copy.
const snapQuantity = (index) => {
    const line = form.value.items[index];
    const moq = parseMoq(productById.value.get(Number(line.product_id))?.moq);
    const raw = Math.max(0, Math.floor(Number(line.quantity) || 0));

    if (raw <= 0) {
        line.quantity = moq;
        qtyWarnings.value[index] = t('catalog.qtyRoundedToBox', { moq });
        return;
    }
    if (raw % moq !== 0) {
        line.quantity = Math.ceil(raw / moq) * moq;
        qtyWarnings.value[index] = t('catalog.qtyRoundedToBox', { moq });
        return;
    }
    line.quantity = raw;
    delete qtyWarnings.value[index];
};

const openEdit = (s) => {
    form.value = {
        ...blankForm(),
        ...s,
        items: (s.items || []).map(i => ({
            product_id: Number(i.product_id),
            variant_id: i.variant_id === null ? null : Number(i.variant_id),
            quantity: Number(i.quantity)
        }))
    };
    coverFile.value = null;
    coverPreview.value = '';
    qtyWarnings.value = {};
    panelOpen.value = true;
};

const save = async () => {
    saving.value = true;
    errorMessage.value = '';
    try {
        const coverKey = await uploadCover();
        await api.saveBusinessSet({ ...form.value, cover_image_key: coverKey || null });
        panelOpen.value = false;
        await load();
    } catch (err) {
        errorMessage.value = err.message;
    } finally {
        saving.value = false;
        uploadingCover.value = false;
    }
};

// Literal English copy, matching admin-projects.vue:166 and admin-events.vue:149 —
// the admin panel is staff-only and is not translated.
const remove = async (s) => {
    if (!confirm(`Delete "${s.name}"? This cannot be undone.`)) return;
    await api.deleteBusinessSet(s.id);
    await load();
};
</script>

<template>
    <div class="admin-sets">
        <div class="sets-toolbar">
            <h2>Business Sets</h2>
            <button type="button" @click="form = blankForm(); panelOpen = true;">New Set</button>
        </div>

        <p v-if="errorMessage" class="sets-error">{{ errorMessage }}</p>
        <p v-if="loading">Loading...</p>

        <ul v-else class="sets-list">
            <li v-for="s in sets" :key="s.id" :class="{ 'set-broken': s.is_incomplete }">
                <div class="set-row-main">
                    <strong>{{ s.name }}</strong>
                    <span class="set-row-meta">
                        /{{ s.slug }} &middot; {{ s.items.length }} line(s)
                        <span v-if="!s.is_published"> &middot; draft</span>
                    </span>
                    <!-- A missing component means the set has no correct price, so it
                         is hidden from the storefront until this is fixed. -->
                    <span v-if="s.is_incomplete" class="set-broken-flag">
                        Hidden — missing component:
                        {{ s.items.filter(i => i.missing).map(i => i.name || `product #${i.product_id}`).join(', ') }}
                    </span>
                </div>
                <div class="set-row-actions">
                    <button type="button" @click="openEdit(s)">Edit</button>
                    <button type="button" @click="remove(s)">Delete</button>
                </div>
            </li>
        </ul>

        <div v-if="panelOpen" class="set-panel">
            <label>Name (EN)<input v-model="form.name" type="text" /></label>
            <label>Name (TH)<input v-model="form.name_th" type="text" /></label>
            <label>Description (EN)<textarea v-model="form.description" rows="3"></textarea></label>
            <label>Description (TH)<textarea v-model="form.description_th" rows="3"></textarea></label>

            <label>Cover image<input type="file" accept="image/*" @change="onCoverPick" /></label>
            <img v-if="coverPreview || form.cover_image_key"
                 :src="coverPreview || getProjectImageUrl(form.cover_image_key)" class="set-cover-preview" alt="" />

            <div class="set-panel-row">
                <!-- Tiers 4 and 5 are staff-only and must never price a customer-facing set. -->
                <label>Price tier
                    <select v-model.number="form.price_tier">
                        <option :value="1">Level 1</option>
                        <option :value="2">Level 2</option>
                        <option :value="3">Level 3</option>
                    </select>
                </label>
                <label>Discount %<input v-model.number="form.discount_pct" type="number" min="0" max="100" step="0.5" /></label>
                <label>Sort order<input v-model.number="form.sort_order" type="number" /></label>
                <label class="set-check"><input v-model="form.is_published" type="checkbox" /> Published</label>
            </div>

            <div class="set-picker">
                <input v-model="productSearch" type="text" placeholder="Search products..." />
                <ul class="set-picker-list">
                    <li v-for="p in filteredProducts" :key="p.id">
                        <span>{{ p.name }} <em>{{ p.sku }}</em> <span class="moq-hint">box of {{ parseMoq(p.moq) }}</span></span>
                        <button type="button" @click="addLine(p.id)">Add</button>
                    </li>
                </ul>
            </div>

            <table class="set-lines">
                <tbody>
                    <tr v-for="(line, i) in form.items" :key="line.product_id">
                        <td>{{ productById.get(Number(line.product_id))?.name || `product #${line.product_id}` }}</td>
                        <td>
                            <input v-model.number="line.quantity" type="number" min="1"
                                   :step="parseMoq(productById.get(Number(line.product_id))?.moq)"
                                   @change="snapQuantity(i)" />
                            <small v-if="qtyWarnings[i]" class="qty-warning">{{ qtyWarnings[i] }}</small>
                        </td>
                        <td>฿{{ (preview.lines[i]?.perPiecePrice ?? 0).toFixed(2) }} / pc</td>
                        <td>฿{{ (preview.lines[i]?.lineTotal ?? 0).toFixed(2) }}</td>
                        <td><button type="button" @click="removeLine(i)">Remove</button></td>
                    </tr>
                </tbody>
            </table>

            <!-- Live roll-up: the number has to be visible before publishing. -->
            <div class="set-preview">
                <div><span>Subtotal</span><span>฿{{ preview.subtotal.toFixed(2) }}</span></div>
                <div v-if="preview.discountAmount > 0">
                    <span>Discount ({{ form.discount_pct }}%)</span><span>-฿{{ preview.discountAmount.toFixed(2) }}</span>
                </div>
                <div class="set-preview-total"><span>Set price</span><span>฿{{ preview.total.toFixed(2) }}</span></div>
            </div>

            <div class="set-panel-actions">
                <button type="button" @click="panelOpen = false">Cancel</button>
                <button type="button" :disabled="saving" @click="save">{{ saving ? 'Saving...' : 'Save' }}</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.sets-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.sets-error { color: #c62828; }
.sets-list { list-style: none; padding: 0; }
.sets-list li { display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #eee; }
.set-broken { background: #fff4f4; }
.set-broken-flag { display: block; color: #c62828; font-size: 0.85rem; }
.set-row-meta { color: #777; font-size: 0.85rem; margin-left: 8px; }
.set-panel { margin-top: 24px; padding: 20px; border: 1px solid #ddd; border-radius: 10px; display: grid; gap: 12px; }
.set-panel label { display: grid; gap: 4px; font-size: 0.9rem; }
.set-panel-row { display: flex; gap: 16px; flex-wrap: wrap; }
.set-check { flex-direction: row; align-items: center; gap: 6px; }
.set-cover-preview { max-width: 220px; border-radius: 8px; }
.set-picker-list { list-style: none; padding: 0; max-height: 220px; overflow-y: auto; border: 1px solid #eee; }
.set-picker-list li { display: flex; justify-content: space-between; padding: 6px 10px; }
.moq-hint { color: #888; font-size: 0.8rem; }
.set-lines { width: 100%; border-collapse: collapse; }
.set-lines td { padding: 8px 6px; border-bottom: 1px solid #f0f0f0; }
.qty-warning { display: block; color: #b26a00; font-size: 0.75rem; }
.set-preview { margin-left: auto; min-width: 260px; }
.set-preview > div { display: flex; justify-content: space-between; padding: 4px 0; }
.set-preview-total { font-weight: 700; border-top: 2px solid #333; padding-top: 8px; }
.set-panel-actions { display: flex; justify-content: flex-end; gap: 12px; }
</style>
