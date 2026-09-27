<script setup>
// Editor for the `projects` table — the content type behind the homepage's
// featured slot, the KitCraft archive, and the tutorial blocks on product pages.
// Self-contained so AdminDashboard only has to render it under a tab.
import { ref, computed, onMounted } from 'vue';
import { api, getProjectImageUrl, API_URL } from '../services/api';

const projects = ref([]);
const products = ref([]);
const loading = ref(true);
const saving = ref(false);
const errorMessage = ref('');

const blankForm = () => ({
    id: null,
    title: '',
    title_th: '',
    excerpt: '',
    excerpt_th: '',
    body: '',
    body_th: '',
    cover_image_key: '',
    video_url: '',
    product_ids: [],
    is_featured: false,
    is_published: true,
    published_at: ''
});

const form = ref(blankForm());
const panelOpen = ref(false);
const productSearch = ref('');
const coverFile = ref(null);
const coverPreview = ref('');
const uploadingCover = ref(false);

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
        // include_unpublished so drafts are visible here but not on the storefront.
        const [proj, prods] = await Promise.all([
            api.getProjects({ includeUnpublished: true }),
            api.getProducts(null, { includeHidden: true })
        ]);
        projects.value = proj;
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
    coverFile.value = null;
    coverPreview.value = '';
    panelOpen.value = true;
};

const openEdit = (p) => {
    form.value = {
        ...blankForm(),
        ...p,
        product_ids: [...(p.product_ids || [])],
        // datetime-local needs "YYYY-MM-DDTHH:mm"
        published_at: p.published_at ? String(p.published_at).slice(0, 16).replace(' ', 'T') : ''
    };
    coverFile.value = null;
    coverPreview.value = '';
    panelOpen.value = true;
};

const closePanel = () => {
    panelOpen.value = false;
    errorMessage.value = '';
};

const toggleProduct = (id) => {
    const idx = form.value.product_ids.findIndex(x => Number(x) === Number(id));
    if (idx >= 0) form.value.product_ids.splice(idx, 1);
    else form.value.product_ids.push(Number(id));
};

const isSelected = (id) => form.value.product_ids.some(x => Number(x) === Number(id));

const onCoverPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    coverFile.value = file;
    coverPreview.value = URL.createObjectURL(file);
};

// Covers go through the same /upload endpoint products use, into the IMAGES bucket.
// That endpoint keys objects by the uploaded filename, so the file is renamed to a
// unique "project-<timestamp>-<rand>.<ext>" first — two covers both named
// "cover.jpg" would otherwise overwrite each other.
const uploadCover = async () => {
    if (!coverFile.value) return form.value.cover_image_key;
    uploadingCover.value = true;
    try {
        const original = coverFile.value.name || 'cover.jpg';
        const ext = original.includes('.') ? original.split('.').pop().toLowerCase() : 'jpg';
        const key = `project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

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

const save = async () => {
    if (!form.value.title.trim()) {
        errorMessage.value = 'Title is required.';
        return;
    }
    saving.value = true;
    errorMessage.value = '';
    try {
        const coverKey = await uploadCover();
        await api.saveProject({
            ...form.value,
            cover_image_key: coverKey || null,
            published_at: form.value.published_at
                ? new Date(form.value.published_at).toISOString()
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

const remove = async (p) => {
    if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    try {
        await api.deleteProject(p.id);
        await load();
    } catch (err) {
        errorMessage.value = err.message;
    }
};

const formatDate = (v) => {
    if (!v) return '';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB');
};
</script>

<template>
    <section class="ap">
        <div class="ap-head">
            <div>
                <h2>Projects &amp; Articles</h2>
                <p class="ap-sub">
                    The starred project fills the homepage slot. Only one can be starred at a time.
                </p>
            </div>
            <button class="ap-primary" @click="openNew">
                <ion-icon name="add-outline"></ion-icon> New project
            </button>
        </div>

        <p v-if="errorMessage && !panelOpen" class="ap-error">{{ errorMessage }}</p>
        <p v-if="loading" class="ap-empty">Loading...</p>
        <p v-else-if="!projects.length" class="ap-empty">No projects yet. Create the first one.</p>

        <div v-else class="ap-list">
            <article v-for="p in projects" :key="p.id" class="ap-row">
                <div class="ap-thumb">
                    <img v-if="p.cover_image_key" :src="getProjectImageUrl(p.cover_image_key)" :alt="p.title" />
                </div>
                <div class="ap-info">
                    <div class="ap-badges">
                        <span v-if="p.is_featured" class="ap-badge ap-badge--star">★ Homepage</span>
                        <span v-if="!p.is_published" class="ap-badge ap-badge--draft">Draft</span>
                        <span class="ap-date">{{ formatDate(p.published_at) }}</span>
                    </div>
                    <h3>{{ p.title }}</h3>
                    <p v-if="p.title_th" class="ap-th">{{ p.title_th }}</p>
                    <p class="ap-meta">
                        /{{ p.slug }} &middot; {{ (p.product_ids || []).length }} linked product(s)
                    </p>
                </div>
                <div class="ap-actions">
                    <button @click="openEdit(p)">Edit</button>
                    <button class="ap-danger" @click="remove(p)">Delete</button>
                </div>
            </article>
        </div>

        <!-- Editor panel -->
        <div v-if="panelOpen" class="ap-backdrop" @click="closePanel"></div>
        <aside v-if="panelOpen" class="ap-panel">
            <header class="ap-panel-head">
                <h3>{{ isEditing ? 'Edit project' : 'New project' }}</h3>
                <button class="ap-close" @click="closePanel">&times;</button>
            </header>

            <div class="ap-panel-body">
                <label class="ap-label">Title (EN) *</label>
                <input v-model="form.title" class="ap-input" placeholder="Crochet a Market Tote" />

                <label class="ap-label">Title (TH)</label>
                <input v-model="form.title_th" class="ap-input" placeholder="ถักกระเป๋าตลาด" />

                <label class="ap-label">Excerpt (EN)</label>
                <textarea v-model="form.excerpt" class="ap-input" rows="2"
                    placeholder="One or two sentences shown on cards."></textarea>

                <label class="ap-label">Excerpt (TH)</label>
                <textarea v-model="form.excerpt_th" class="ap-input" rows="2"></textarea>

                <label class="ap-label">Body (EN)</label>
                <textarea v-model="form.body" class="ap-input" rows="9"
                    placeholder="Leave a blank line between paragraphs."></textarea>

                <label class="ap-label">Body (TH)</label>
                <textarea v-model="form.body_th" class="ap-input" rows="9"></textarea>

                <label class="ap-label">Cover image</label>
                <div class="ap-cover">
                    <img
                        v-if="coverPreview || form.cover_image_key"
                        :src="coverPreview || getProjectImageUrl(form.cover_image_key)"
                        alt="Cover preview"
                    />
                    <input type="file" accept="image/*" @change="onCoverPick" />
                </div>

                <label class="ap-label">Video URL (optional)</label>
                <input v-model="form.video_url" class="ap-input" placeholder="https://..." />

                <label class="ap-label">Linked products</label>
                <div v-if="selectedProducts.length" class="ap-chips">
                    <button
                        v-for="p in selectedProducts"
                        :key="p.id"
                        class="ap-chip"
                        @click="toggleProduct(p.id)"
                    >{{ p.name }} &times;</button>
                </div>
                <input v-model="productSearch" class="ap-input" placeholder="Search products to link..." />
                <div class="ap-picker">
                    <button
                        v-for="p in filteredProducts"
                        :key="p.id"
                        class="ap-pick"
                        :class="{ picked: isSelected(p.id) }"
                        @click="toggleProduct(p.id)"
                    >
                        <span>{{ p.name }}</span>
                        <small>{{ p.sku }}</small>
                    </button>
                </div>

                <label class="ap-label">Publish date</label>
                <input v-model="form.published_at" type="datetime-local" class="ap-input" />

                <div class="ap-toggles">
                    <label><input type="checkbox" v-model="form.is_featured" /> Show on homepage (★)</label>
                    <label><input type="checkbox" v-model="form.is_published" /> Published</label>
                </div>

                <p v-if="errorMessage" class="ap-error">{{ errorMessage }}</p>
            </div>

            <footer class="ap-panel-foot">
                <button class="ap-ghost" @click="closePanel">Cancel</button>
                <button class="ap-primary" :disabled="saving || uploadingCover" @click="save">
                    {{ saving || uploadingCover ? 'Saving...' : (isEditing ? 'Update' : 'Create') }}
                </button>
            </footer>
        </aside>
    </section>
</template>

<style scoped>
.ap { padding: 4px 0 40px 0; }

.ap-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 20px;
}

.ap-head h2 { margin: 0 0 4px 0; font-size: 1.5rem; color: #4a3529; }
.ap-sub { margin: 0; font-size: 13px; color: #8b7565; }

.ap-primary {
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

.ap-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.ap-primary:hover:not(:disabled) { background: #8b6f47; }

.ap-empty, .ap-error {
    padding: 16px 0;
    font-size: 14px;
    color: #8b7565;
}

.ap-error { color: #c0392b; font-weight: 600; }

.ap-list { display: flex; flex-direction: column; gap: 12px; }

.ap-row {
    display: grid;
    grid-template-columns: 96px 1fr auto;
    gap: 16px;
    align-items: center;
    padding: 12px;
    background: #fff;
    border: 1px solid #ece0d3;
    border-radius: 12px;
}

.ap-thumb {
    width: 96px;
    height: 68px;
    border-radius: 8px;
    overflow: hidden;
    background: #f5ede3;
}

.ap-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }

.ap-info h3 { margin: 4px 0 2px 0; font-size: 1.05rem; color: #4a3529; }
.ap-th { margin: 0 0 4px 0; font-size: 13px; color: #7a6355; }
.ap-meta { margin: 0; font-size: 12px; color: #a8917f; }

.ap-badges { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.ap-badge {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    padding: 3px 8px;
    border-radius: 5px;
}

.ap-badge--star { background: #f6e3d8; color: #C4694E; }
.ap-badge--draft { background: #ece7e2; color: #7a6355; }
.ap-date { font-size: 11px; color: #a8917f; }

.ap-actions { display: flex; gap: 8px; }

.ap-actions button {
    padding: 7px 14px;
    border: 1px solid #ddcbb9;
    background: #fff;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #604539;
    cursor: pointer;
}

.ap-actions button:hover { background: #f8f1e9; }
.ap-danger { color: #c0392b !important; border-color: #e8bdb5 !important; }

/* ── Editor panel ─────────────────────────────────── */
.ap-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(43, 33, 27, 0.45);
    z-index: 900;
}

.ap-panel {
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

.ap-panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 22px;
    border-bottom: 1px solid #ece0d3;
}

.ap-panel-head h3 { margin: 0; font-size: 1.2rem; color: #4a3529; }

.ap-close {
    background: none;
    border: none;
    font-size: 1.6rem;
    line-height: 1;
    color: #8b7565;
    cursor: pointer;
}

.ap-panel-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px 22px;
}

.ap-panel-foot {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 16px 22px;
    border-top: 1px solid #ece0d3;
}

.ap-ghost {
    padding: 10px 18px;
    background: #fff;
    border: 1px solid #ddcbb9;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    color: #604539;
    cursor: pointer;
}

.ap-label {
    display: block;
    margin: 16px 0 6px 0;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #8b6f47;
}

.ap-input {
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

.ap-input:focus { outline: 2px solid #e3c3ae; outline-offset: -1px; }

.ap-cover img {
    width: 100%;
    max-height: 190px;
    object-fit: cover;
    border-radius: 9px;
    margin-bottom: 8px;
    display: block;
}

.ap-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }

.ap-chip {
    padding: 5px 10px;
    background: #f2e2d4;
    border: none;
    border-radius: 20px;
    font-size: 12px;
    color: #604539;
    cursor: pointer;
}

.ap-picker {
    margin-top: 8px;
    max-height: 190px;
    overflow-y: auto;
    border: 1px solid #ece0d3;
    border-radius: 9px;
    background: #fff;
}

.ap-pick {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 9px 12px;
    background: none;
    border: none;
    border-bottom: 1px solid #f4ece3;
    font-size: 13px;
    text-align: left;
    color: #4a3529;
    cursor: pointer;
}

.ap-pick:hover { background: #faf4ed; }
.ap-pick.picked { background: #f2e2d4; font-weight: 600; }
.ap-pick small { color: #a8917f; flex-shrink: 0; }

.ap-toggles {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 18px;
    font-size: 14px;
    color: #4a3529;
}

.ap-toggles label { display: flex; align-items: center; gap: 8px; cursor: pointer; }

@media (max-width: 700px) {
    .ap-row { grid-template-columns: 1fr; }
    .ap-thumb { width: 100%; height: 130px; }
}
</style>
