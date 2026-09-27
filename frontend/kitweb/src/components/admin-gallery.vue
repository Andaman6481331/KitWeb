<script setup>
// Editor for the `gallery` table — community photos with a credit. Rows appear in
// the Creator Gallery on KitCraft, and any row that names a product can also be
// shown beside it in the catalog.
//
// Credits are a permissions question, not a data-entry one: only post a photo you
// have been given permission to use, and credit the person who made it.
import { ref, computed, onMounted } from 'vue';
import { api, API_URL, getGalleryImageUrl } from '../services/api';
// Bare product keys are served as `<key>-thumb.webp`; getImageUrl would 404.
import { getProductImageUrl } from '../utils/productImages';

const items = ref([]);
const products = ref([]);
const projects = ref([]);
const loading = ref(true);
const saving = ref(false);
const uploading = ref(false);
const errorMessage = ref('');

const blankForm = () => ({
    id: null,
    image_key: '',
    caption: '',
    caption_th: '',
    credit_name: '',
    credit_handle: '',
    credit_url: '',
    product_id: '',
    project_id: '',
    is_visible: true,
    sort_order: 0
});

const form = ref(blankForm());
const panelOpen = ref(false);
const photoFile = ref(null);
const photoPreview = ref('');
const productSearch = ref('');

const isEditing = computed(() => form.value.id !== null);

const filteredProducts = computed(() => {
    const q = productSearch.value.trim().toLowerCase();
    if (!q) return products.value.slice(0, 30);
    return products.value
        .filter(p => `${p.name || ''} ${p.name_th || ''} ${p.sku || ''}`.toLowerCase().includes(q))
        .slice(0, 30);
});

const selectedProduct = computed(() =>
    products.value.find(p => Number(p.id) === Number(form.value.product_id)) || null
);

const load = async () => {
    loading.value = true;
    try {
        const [rows, prods, posts] = await Promise.all([
            api.getGallery({ includeHidden: true }),
            api.getProducts(null, { includeHidden: true }),
            api.getProjects({ includeUnpublished: true })
        ]);
        items.value = rows;
        products.value = prods;
        projects.value = posts;
    } catch (err) {
        errorMessage.value = err.message;
    } finally {
        loading.value = false;
    }
};

onMounted(load);

const openNew = () => {
    form.value = blankForm();
    // Append by default: new photos land at the end of the curated order.
    form.value.sort_order = items.value.length ? Math.max(...items.value.map(i => i.sort_order || 0)) + 10 : 10;
    photoFile.value = null;
    photoPreview.value = '';
    panelOpen.value = true;
};

const openEdit = (item) => {
    form.value = {
        ...blankForm(),
        ...item,
        product_id: item.product_id ?? '',
        project_id: item.project_id ?? ''
    };
    photoFile.value = null;
    photoPreview.value = '';
    panelOpen.value = true;
};

const closePanel = () => {
    panelOpen.value = false;
    errorMessage.value = '';
};

const onPhotoPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    photoFile.value = file;
    photoPreview.value = URL.createObjectURL(file);
};

// Same route as project covers: /upload keys by filename, so rename to something
// unique first or two photos called "IMG_1234.jpg" overwrite each other.
const uploadPhoto = async () => {
    if (!photoFile.value) return form.value.image_key;
    uploading.value = true;
    try {
        const original = photoFile.value.name || 'photo.jpg';
        const ext = original.includes('.') ? original.split('.').pop().toLowerCase() : 'jpg';
        const key = `gallery-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const fd = new FormData();
        fd.append('file', new File([photoFile.value], key, { type: photoFile.value.type }));

        const res = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            headers: { 'Authorization': api.getToken() },
            body: fd
        });
        if (!res.ok) throw new Error('Photo upload failed');
        const data = await res.json();
        return data.key || key;
    } finally {
        uploading.value = false;
    }
};

const save = async () => {
    saving.value = true;
    errorMessage.value = '';
    try {
        const imageKey = await uploadPhoto();
        if (!imageKey) throw new Error('A photo is required.');
        await api.saveGalleryItem({ ...form.value, image_key: imageKey });
        await load();
        panelOpen.value = false;
    } catch (err) {
        errorMessage.value = err.message;
    } finally {
        saving.value = false;
    }
};

const remove = async (item) => {
    if (!confirm('Delete this photo from the gallery? This cannot be undone.')) return;
    try {
        await api.deleteGalleryItem(item.id);
        await load();
    } catch (err) {
        errorMessage.value = err.message;
    }
};

const productName = (id) => products.value.find(p => Number(p.id) === Number(id))?.name || `#${id}`;
const projectTitle = (id) => projects.value.find(p => Number(p.id) === Number(id))?.title || `#${id}`;
</script>

<template>
    <section class="ag">
        <div class="ag-head">
            <div>
                <h2>Creator Gallery</h2>
                <p class="ag-sub">
                    Photos from workshops and from makers. Only post what you have permission
                    to use, and credit the person who made it.
                </p>
            </div>
            <button class="ag-primary" @click="openNew">
                <ion-icon name="add-outline"></ion-icon> Add photo
            </button>
        </div>

        <p v-if="errorMessage && !panelOpen" class="ag-error">{{ errorMessage }}</p>
        <p v-if="loading" class="ag-empty">Loading...</p>
        <p v-else-if="!items.length" class="ag-empty">No photos yet. Add the first one.</p>

        <div v-else class="ag-grid">
            <article v-for="item in items" :key="item.id" class="ag-tile" :class="{ hidden: !item.is_visible }">
                <img :src="getGalleryImageUrl(item.image_key)" :alt="item.caption || ''" />
                <div class="ag-tile-body">
                    <p v-if="item.caption" class="ag-caption">{{ item.caption }}</p>
                    <p class="ag-credit">
                        <span v-if="item.credit_handle">@{{ item.credit_handle }}</span>
                        <span v-else-if="item.credit_name">{{ item.credit_name }}</span>
                        <span v-else class="ag-warn">No credit</span>
                    </p>
                    <p class="ag-links">
                        <span v-if="item.product_id">🛍 {{ productName(item.product_id) }}</span>
                        <span v-if="item.project_id">📖 {{ projectTitle(item.project_id) }}</span>
                        <span v-if="!item.is_visible" class="ag-warn">Hidden</span>
                    </p>
                    <div class="ag-actions">
                        <button @click="openEdit(item)">Edit</button>
                        <button class="ag-danger" @click="remove(item)">Delete</button>
                    </div>
                </div>
            </article>
        </div>

        <!-- Editor panel -->
        <div v-if="panelOpen" class="ag-backdrop" @click="closePanel"></div>
        <aside v-if="panelOpen" class="ag-panel">
            <header class="ag-panel-head">
                <h3>{{ isEditing ? 'Edit photo' : 'Add photo' }}</h3>
                <button class="ag-close" @click="closePanel">&times;</button>
            </header>

            <div class="ag-panel-body">
                <label class="ag-label">Photo *</label>
                <img
                    v-if="photoPreview || form.image_key"
                    class="ag-preview"
                    :src="photoPreview || getGalleryImageUrl(form.image_key)"
                    alt=""
                />
                <input type="file" accept="image/*" class="ag-input" @change="onPhotoPick" />

                <label class="ag-label">Caption (EN)</label>
                <input v-model="form.caption" class="ag-input" placeholder="Beaded charms from the December workshop" />

                <label class="ag-label">Caption (TH)</label>
                <input v-model="form.caption_th" class="ag-input" />

                <label class="ag-label">Credit name</label>
                <input v-model="form.credit_name" class="ag-input" placeholder="Ploy" />

                <label class="ag-label">Instagram handle</label>
                <input v-model="form.credit_handle" class="ag-input" placeholder="ploy.makes" />

                <label class="ag-label">Link to their profile / post</label>
                <input v-model="form.credit_url" class="ag-input" placeholder="https://instagram.com/..." />

                <label class="ag-label">Product in the photo</label>
                <div v-if="selectedProduct" class="ag-chips">
                    <button class="ag-chip" @click="form.product_id = ''">{{ selectedProduct.name }} &times;</button>
                </div>
                <input v-model="productSearch" class="ag-input" placeholder="Search products to link..." />
                <div class="ag-picker">
                    <button
                        v-for="p in filteredProducts"
                        :key="p.id"
                        class="ag-pick"
                        :class="{ picked: Number(form.product_id) === Number(p.id) }"
                        @click="form.product_id = p.id"
                    >
                        <img v-if="p.image_key" :src="getProductImageUrl(p.image_key, 'thumb')" :alt="p.name" />
                        <span>{{ p.name }}</span>
                        <small>{{ p.sku }}</small>
                    </button>
                </div>

                <label class="ag-label">From this article</label>
                <select v-model="form.project_id" class="ag-input">
                    <option value="">— none —</option>
                    <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.title }}</option>
                </select>

                <label class="ag-label">Sort order (lower shows first)</label>
                <input v-model.number="form.sort_order" type="number" class="ag-input" />

                <div class="ag-toggles">
                    <label><input type="checkbox" v-model="form.is_visible" /> Show on the site</label>
                </div>

                <p v-if="errorMessage" class="ag-error">{{ errorMessage }}</p>
            </div>

            <footer class="ag-panel-foot">
                <button class="ag-ghost" @click="closePanel">Cancel</button>
                <button class="ag-primary" :disabled="saving || uploading" @click="save">
                    {{ saving || uploading ? 'Saving...' : (isEditing ? 'Update' : 'Create') }}
                </button>
            </footer>
        </aside>
    </section>
</template>

<style scoped>
.ag { padding: 4px 0 40px 0; }

.ag-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 20px;
}

.ag-head h2 { margin: 0 0 4px 0; font-size: 1.5rem; color: #4a3529; }
.ag-sub { margin: 0; max-width: 60ch; font-size: 13px; line-height: 1.55; color: #8b7565; }

.ag-primary {
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

.ag-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.ag-primary:hover:not(:disabled) { background: #8b6f47; }

.ag-empty, .ag-error { padding: 16px 0; font-size: 14px; color: #8b7565; }
.ag-error { color: #c0392b; font-weight: 600; }
.ag-warn { color: #c0392b; font-weight: 600; }

.ag-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
    gap: 14px;
}

.ag-tile {
    background: #fff;
    border: 1px solid #ece0d3;
    border-radius: 12px;
    overflow: hidden;
}

.ag-tile.hidden { opacity: 0.55; }

.ag-tile img {
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    display: block;
    background: #f5ede3;
}

.ag-tile-body { padding: 10px 12px 12px 12px; }

.ag-caption {
    margin: 0 0 5px 0;
    font-size: 13px;
    line-height: 1.4;
    color: #4a3529;
}

.ag-credit { margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #8b6f47; }

.ag-links {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 0 0 10px 0;
    font-size: 11.5px;
    color: #a8917f;
}

.ag-actions { display: flex; gap: 8px; }

.ag-actions button {
    flex: 1;
    padding: 6px 10px;
    border: 1px solid #ddcbb9;
    background: #fff;
    border-radius: 8px;
    font-size: 12.5px;
    font-weight: 600;
    color: #604539;
    cursor: pointer;
}

.ag-actions button:hover { background: #f8f1e9; }
.ag-danger { color: #c0392b !important; border-color: #e8bdb5 !important; }

/* ── Editor panel ─────────────────────────────────── */
.ag-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(43, 33, 27, 0.45);
    z-index: 900;
}

.ag-panel {
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

.ag-panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 22px;
    border-bottom: 1px solid #ece0d3;
}

.ag-panel-head h3 { margin: 0; font-size: 1.2rem; color: #4a3529; }

.ag-close {
    background: none;
    border: none;
    font-size: 1.6rem;
    line-height: 1;
    color: #8b7565;
    cursor: pointer;
}

.ag-panel-body { flex: 1; overflow-y: auto; padding: 20px 22px; }

.ag-panel-foot {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 16px 22px;
    border-top: 1px solid #ece0d3;
}

.ag-ghost {
    padding: 10px 18px;
    background: #fff;
    border: 1px solid #ddcbb9;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    color: #604539;
    cursor: pointer;
}

.ag-label {
    display: block;
    margin: 16px 0 6px 0;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #8b6f47;
}

.ag-input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #ddcbb9;
    border-radius: 9px;
    font-size: 14px;
    font-family: inherit;
    background: #fff;
    color: #4a3529;
}

.ag-input:focus { outline: 2px solid #e3c3ae; outline-offset: -1px; }

.ag-preview {
    width: 100%;
    max-height: 240px;
    object-fit: cover;
    border-radius: 10px;
    margin-bottom: 10px;
    background: #f5ede3;
}

.ag-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }

.ag-chip {
    padding: 5px 10px;
    background: #f2e2d4;
    border: none;
    border-radius: 20px;
    font-size: 12px;
    color: #604539;
    cursor: pointer;
}

.ag-picker {
    margin-top: 8px;
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid #ece0d3;
    border-radius: 9px;
    background: #fff;
}

.ag-pick {
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

.ag-pick img {
    width: 34px;
    height: 34px;
    border-radius: 7px;
    object-fit: cover;
    flex-shrink: 0;
    background: #f5ede3;
}

.ag-pick span { flex: 1; }
.ag-pick:hover { background: #faf4ed; }
.ag-pick.picked { background: #f2e2d4; font-weight: 600; }
.ag-pick small { color: #a8917f; flex-shrink: 0; }

.ag-toggles {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 18px;
    font-size: 14px;
    color: #4a3529;
}

.ag-toggles label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
</style>
