<script setup>
// Editor for the `spotlights` table — Color of the Month. One row is active and
// fills the homepage band; the rest are the archive of past months. Deliberately
// lighter than the projects editor: a color, a sentence, and some products.
import { ref, computed, onMounted } from 'vue';
import { api } from '../services/api';
// Bare product keys are served as `<key>-thumb.webp`; getImageUrl would 404.
import { getProductImageUrl } from '../utils/productImages';

// Quick-pick palette so staff don't have to know hex codes. The native color
// input is still there for anything not on this list.
const PRESETS = [
    { name: 'Terracotta', hex: '#C4694E' },
    { name: 'Dusty Rose', hex: '#D8A0A6' },
    { name: 'Butter Yellow', hex: '#E8C86A' },
    { name: 'Sage Green', hex: '#8A9A7B' },
    { name: 'Sky Blue', hex: '#8FB8D8' },
    { name: 'Indigo', hex: '#4E5D8C' },
    { name: 'Ivory White', hex: '#EFE7DA' },
    { name: 'Charcoal', hex: '#4A4441' }
];

const spotlights = ref([]);
const products = ref([]);
const loading = ref(true);
const saving = ref(false);
const errorMessage = ref('');

const blankForm = () => ({
    id: null,
    color_name: '',
    color_name_th: '',
    hex: '#C4694E',
    blurb: '',
    blurb_th: '',
    product_ids: [],
    is_active: false,
    starts_on: ''
});

const form = ref(blankForm());
const panelOpen = ref(false);
const productSearch = ref('');

const isEditing = computed(() => form.value.id !== null);

const filteredProducts = computed(() => {
    const q = productSearch.value.trim().toLowerCase();
    if (!q) return products.value.slice(0, 40);
    return products.value
        .filter(p => `${p.name || ''} ${p.name_th || ''} ${p.sku || ''}`.toLowerCase().includes(q))
        .slice(0, 40);
});

const selectedProducts = computed(() =>
    form.value.product_ids
        .map(id => products.value.find(p => Number(p.id) === Number(id)))
        .filter(Boolean)
);

const load = async () => {
    loading.value = true;
    try {
        const [rows, prods] = await Promise.all([
            api.getSpotlights(),
            api.getProducts(null, { includeHidden: true })
        ]);
        spotlights.value = rows;
        products.value = prods;
    } catch (err) {
        errorMessage.value = err.message;
    } finally {
        loading.value = false;
    }
};

onMounted(load);

const openNew = () => {
    form.value = blankForm();
    // Default to the first of the current month — this is a monthly slot.
    const now = new Date();
    form.value.starts_on = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    panelOpen.value = true;
};

const openEdit = (s) => {
    form.value = {
        ...blankForm(),
        ...s,
        product_ids: [...(s.product_ids || [])],
        starts_on: s.starts_on ? String(s.starts_on).slice(0, 10) : ''
    };
    panelOpen.value = true;
};

const closePanel = () => {
    panelOpen.value = false;
    errorMessage.value = '';
};

const applyPreset = (preset) => {
    form.value.hex = preset.hex;
    if (!form.value.color_name.trim()) form.value.color_name = preset.name;
};

const toggleProduct = (id) => {
    const idx = form.value.product_ids.findIndex(x => Number(x) === Number(id));
    if (idx >= 0) form.value.product_ids.splice(idx, 1);
    else form.value.product_ids.push(Number(id));
};

const isSelected = (id) => form.value.product_ids.some(x => Number(x) === Number(id));

const save = async () => {
    if (!form.value.color_name.trim()) {
        errorMessage.value = 'Color name is required.';
        return;
    }
    saving.value = true;
    errorMessage.value = '';
    try {
        await api.saveSpotlight({
            ...form.value,
            // A bare date has no time zone; anchor it to UTC midnight so the month
            // label can't slip backwards for viewers west of Bangkok.
            starts_on: form.value.starts_on
                ? new Date(`${form.value.starts_on}T00:00:00.000Z`).toISOString()
                : undefined
        });
        await load();
        panelOpen.value = false;
    } catch (err) {
        errorMessage.value = err.message;
    } finally {
        saving.value = false;
    }
};

const remove = async (s) => {
    if (!confirm(`Delete "${s.color_name}"? This cannot be undone.`)) return;
    try {
        await api.deleteSpotlight(s.id);
        await load();
    } catch (err) {
        errorMessage.value = err.message;
    }
};

const monthLabel = (v) => {
    if (!v) return '';
    const d = new Date(v);
    return Number.isNaN(d.getTime())
        ? ''
        : d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};
</script>

<template>
    <section class="as">
        <div class="as-head">
            <div>
                <h2>Color of the Month</h2>
                <p class="as-sub">
                    The active color fills the band on the homepage. Only one can be active at a time.
                </p>
            </div>
            <button class="as-primary" @click="openNew">
                <ion-icon name="add-outline"></ion-icon> New color
            </button>
        </div>

        <p v-if="errorMessage && !panelOpen" class="as-error">{{ errorMessage }}</p>
        <p v-if="loading" class="as-empty">Loading...</p>
        <p v-else-if="!spotlights.length" class="as-empty">No colors yet. Create the first one.</p>

        <div v-else class="as-list">
            <article v-for="s in spotlights" :key="s.id" class="as-row">
                <div class="as-swatch" :style="{ background: s.hex }"></div>
                <div class="as-info">
                    <div class="as-badges">
                        <span v-if="s.is_active" class="as-badge as-badge--live">● Live</span>
                        <span class="as-date">{{ monthLabel(s.starts_on) }}</span>
                    </div>
                    <h3>{{ s.color_name }}</h3>
                    <p v-if="s.color_name_th" class="as-th">{{ s.color_name_th }}</p>
                    <p class="as-meta">
                        {{ s.hex }} &middot; {{ (s.product_ids || []).length }} linked product(s)
                    </p>
                </div>
                <div class="as-actions">
                    <button @click="openEdit(s)">Edit</button>
                    <button class="as-danger" @click="remove(s)">Delete</button>
                </div>
            </article>
        </div>

        <!-- Editor panel -->
        <div v-if="panelOpen" class="as-backdrop" @click="closePanel"></div>
        <aside v-if="panelOpen" class="as-panel">
            <header class="as-panel-head">
                <h3>{{ isEditing ? 'Edit color' : 'New color' }}</h3>
                <button class="as-close" @click="closePanel">&times;</button>
            </header>

            <div class="as-panel-body">
                <label class="as-label">Color</label>
                <div class="as-presets">
                    <button
                        v-for="preset in PRESETS"
                        :key="preset.hex"
                        class="as-preset"
                        :class="{ picked: form.hex.toLowerCase() === preset.hex.toLowerCase() }"
                        :style="{ background: preset.hex }"
                        :title="preset.name"
                        @click="applyPreset(preset)"
                    ></button>
                </div>
                <div class="as-hexrow">
                    <input v-model="form.hex" type="color" class="as-colorpick" />
                    <input v-model="form.hex" class="as-input" placeholder="#C4694E" />
                </div>

                <label class="as-label">Name (EN) *</label>
                <input v-model="form.color_name" class="as-input" placeholder="Terracotta" />

                <label class="as-label">Name (TH)</label>
                <input v-model="form.color_name_th" class="as-input" placeholder="สีดินเผา" />

                <label class="as-label">Blurb (EN)</label>
                <textarea v-model="form.blurb" class="as-input" rows="4"
                    placeholder="Two or three sentences on why this color, this month."></textarea>

                <label class="as-label">Blurb (TH)</label>
                <textarea v-model="form.blurb_th" class="as-input" rows="4"></textarea>

                <label class="as-label">Products in this color</label>
                <div v-if="selectedProducts.length" class="as-chips">
                    <button
                        v-for="p in selectedProducts"
                        :key="p.id"
                        class="as-chip"
                        @click="toggleProduct(p.id)"
                    >{{ p.name }} &times;</button>
                </div>
                <input v-model="productSearch" class="as-input" placeholder="Search products to link..." />
                <div class="as-picker">
                    <button
                        v-for="p in filteredProducts"
                        :key="p.id"
                        class="as-pick"
                        :class="{ picked: isSelected(p.id) }"
                        @click="toggleProduct(p.id)"
                    >
                        <img v-if="p.image_key" :src="getProductImageUrl(p.image_key, 'thumb')" :alt="p.name" />
                        <span>{{ p.name }}</span>
                        <small>{{ p.sku }}</small>
                    </button>
                </div>
                <p class="as-hint">
                    Leave empty to fall back to any product whose Colors field mentions this
                    color name.
                </p>

                <label class="as-label">Month</label>
                <input v-model="form.starts_on" type="date" class="as-input" />

                <div class="as-toggles">
                    <label><input type="checkbox" v-model="form.is_active" /> Show on homepage (live)</label>
                </div>

                <p v-if="errorMessage" class="as-error">{{ errorMessage }}</p>
            </div>

            <footer class="as-panel-foot">
                <button class="as-ghost" @click="closePanel">Cancel</button>
                <button class="as-primary" :disabled="saving" @click="save">
                    {{ saving ? 'Saving...' : (isEditing ? 'Update' : 'Create') }}
                </button>
            </footer>
        </aside>
    </section>
</template>

<style scoped>
.as { padding: 4px 0 40px 0; }

.as-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 20px;
}

.as-head h2 { margin: 0 0 4px 0; font-size: 1.5rem; color: #4a3529; }
.as-sub { margin: 0; font-size: 13px; color: #8b7565; }

.as-primary {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 10px 18px;
    background: #604539;
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
}

.as-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.as-primary:hover:not(:disabled) { background: #8b6f47; }

.as-empty, .as-error {
    padding: 16px 0;
    font-size: 14px;
    color: #8b7565;
}

.as-error { color: #c0392b; font-weight: 600; }

.as-list { display: flex; flex-direction: column; gap: 12px; }

.as-row {
    display: grid;
    grid-template-columns: 68px 1fr auto;
    gap: 16px;
    align-items: center;
    padding: 12px;
    background: #fff;
    border: 1px solid #ece0d3;
    border-radius: 12px;
}

.as-swatch {
    width: 68px;
    height: 68px;
    border-radius: 12px;
    border: 1px solid rgba(0, 0, 0, 0.06);
}

.as-info h3 { margin: 4px 0 2px 0; font-size: 1.05rem; color: #4a3529; }
.as-th { margin: 0 0 4px 0; font-size: 13px; color: #7a6355; }
.as-meta { margin: 0; font-size: 12px; color: #a8917f; }

.as-badges { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.as-badge {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    padding: 3px 8px;
    border-radius: 5px;
}

.as-badge--live { background: #e2efe0; color: #4f7a49; }
.as-date { font-size: 11px; color: #a8917f; }

.as-actions { display: flex; gap: 8px; }

.as-actions button {
    padding: 7px 14px;
    border: 1px solid #ddcbb9;
    background: #fff;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #604539;
    cursor: pointer;
}

.as-actions button:hover { background: #f8f1e9; }
.as-danger { color: #c0392b !important; border-color: #e8bdb5 !important; }

/* ── Editor panel ─────────────────────────────────── */
.as-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(43, 33, 27, 0.45);
    z-index: 900;
}

.as-panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: min(560px, 100%);
    background: #FBF7F2;
    z-index: 901;
    display: flex;
    flex-direction: column;
    box-shadow: -8px 0 32px rgba(0, 0, 0, 0.18);
}

.as-panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 22px;
    border-bottom: 1px solid #ece0d3;
}

.as-panel-head h3 { margin: 0; font-size: 1.2rem; color: #4a3529; }

.as-close {
    background: none;
    border: none;
    font-size: 1.6rem;
    line-height: 1;
    color: #8b7565;
    cursor: pointer;
}

.as-panel-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px 22px;
}

.as-panel-foot {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 16px 22px;
    border-top: 1px solid #ece0d3;
}

.as-ghost {
    padding: 10px 18px;
    background: #fff;
    border: 1px solid #ddcbb9;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    color: #604539;
    cursor: pointer;
}

.as-label {
    display: block;
    margin: 16px 0 6px 0;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #8b6f47;
}

.as-input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #ddcbb9;
    border-radius: 9px;
    font-size: 14px;
    font-family: inherit;
    background: #fff;
    color: #4a3529;
    resize: vertical;
}

.as-input:focus { outline: 2px solid #e3c3ae; outline-offset: -1px; }

.as-presets { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }

.as-preset {
    width: 34px;
    height: 34px;
    border-radius: 9px;
    border: 2px solid transparent;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
    cursor: pointer;
}

.as-preset.picked { border-color: #604539; }

.as-hexrow { display: flex; align-items: center; gap: 10px; }

.as-colorpick {
    flex-shrink: 0;
    width: 46px;
    height: 40px;
    padding: 2px;
    border: 1px solid #ddcbb9;
    border-radius: 9px;
    background: #fff;
    cursor: pointer;
}

.as-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }

.as-chip {
    padding: 5px 10px;
    background: #f2e2d4;
    border: none;
    border-radius: 20px;
    font-size: 12px;
    color: #604539;
    cursor: pointer;
}

.as-picker {
    margin-top: 8px;
    max-height: 220px;
    overflow-y: auto;
    border: 1px solid #ece0d3;
    border-radius: 9px;
    background: #fff;
}

.as-pick {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 12px;
    background: none;
    border: none;
    border-bottom: 1px solid #f4ece3;
    font-size: 13px;
    text-align: left;
    color: #4a3529;
    cursor: pointer;
}

/* A color picker needs to show the color: thumbnails, not just names. */
.as-pick img {
    width: 34px;
    height: 34px;
    border-radius: 7px;
    object-fit: cover;
    flex-shrink: 0;
    background: #f5ede3;
}

.as-pick span { flex: 1; }
.as-pick:hover { background: #faf4ed; }
.as-pick.picked { background: #f2e2d4; font-weight: 600; }
.as-pick small { color: #a8917f; flex-shrink: 0; }

.as-hint {
    margin: 8px 0 0 0;
    font-size: 12px;
    line-height: 1.55;
    color: #a8917f;
}

.as-toggles {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 18px;
    font-size: 14px;
    color: #4a3529;
}

.as-toggles label { display: flex; align-items: center; gap: 8px; cursor: pointer; }

@media (max-width: 700px) {
    .as-row { grid-template-columns: 1fr; }
    .as-swatch { width: 100%; height: 60px; }
}
</style>
