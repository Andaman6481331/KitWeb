<script setup>
// Editor for the `events` table — workshops and market appearances, plus the
// "coming soon" teaser card. These used to be a hardcoded array in EventPage.vue,
// which meant a stale teaser could only be fixed by a developer.
import { ref, computed, onMounted } from 'vue';
import { api, API_URL, getEventMediaUrl } from '../services/api';

const events = ref([]);
const loading = ref(true);
const saving = ref(false);
const uploading = ref(false);
const errorMessage = ref('');

const blankForm = () => ({
    id: null,
    title: '',
    title_th: '',
    date_label: '',
    date_label_th: '',
    cover_image_key: '',
    description: '',
    description_th: '',
    location: '',
    location_th: '',
    participants: '',
    participants_th: '',
    gallery: [],
    is_upcoming: false,
    is_visible: true,
    starts_on: ''
});

const form = ref(blankForm());
const panelOpen = ref(false);

const isEditing = computed(() => form.value.id !== null);

const load = async () => {
    loading.value = true;
    try {
        events.value = await api.getEvents({ includeHidden: true });
    } catch (err) {
        errorMessage.value = err.message;
    } finally {
        loading.value = false;
    }
};

onMounted(load);

const openNew = () => {
    form.value = blankForm();
    panelOpen.value = true;
};

const openEdit = (event) => {
    form.value = {
        ...blankForm(),
        ...event,
        gallery: (event.gallery || []).map(m => ({ ...m })),
        starts_on: event.starts_on ? String(event.starts_on).slice(0, 10) : ''
    };
    panelOpen.value = true;
};

const closePanel = () => {
    panelOpen.value = false;
    errorMessage.value = '';
};

// The original event media was uploaded straight into the web-utils bucket, so a
// bare key still resolves under /utils/. The admin /upload endpoint writes to the
// images bucket instead — store its result as a full URL so both kinds of key keep
// working side by side.
const uploadMedia = async (file) => {
    const original = file.name || 'media';
    const ext = original.includes('.') ? original.split('.').pop().toLowerCase() : 'jpg';
    const key = `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const fd = new FormData();
    fd.append('file', new File([file], key, { type: file.type }));

    const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { 'Authorization': api.getToken() },
        body: fd
    });
    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    return `${API_URL}/images/${data.key || key}`;
};

const onCoverPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploading.value = true;
    errorMessage.value = '';
    try {
        form.value.cover_image_key = await uploadMedia(file);
    } catch (err) {
        errorMessage.value = err.message;
    } finally {
        uploading.value = false;
    }
};

const addMedia = () => form.value.gallery.push({ type: 'image', src: '', title: '' });
const removeMedia = (idx) => form.value.gallery.splice(idx, 1);

const onMediaPick = async (e, idx) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploading.value = true;
    errorMessage.value = '';
    try {
        form.value.gallery[idx].src = await uploadMedia(file);
        if (file.type.startsWith('video')) form.value.gallery[idx].type = 'video';
    } catch (err) {
        errorMessage.value = err.message;
    } finally {
        uploading.value = false;
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
        await api.saveEvent({
            ...form.value,
            // Rows with a blank src would render an empty tile; drop them here
            // rather than making the worker guess what was meant.
            gallery: form.value.gallery.filter(m => (m.src || '').trim())
        });
        await load();
        panelOpen.value = false;
    } catch (err) {
        errorMessage.value = err.message;
    } finally {
        saving.value = false;
    }
};

const remove = async (event) => {
    if (!confirm(`Delete "${event.title}"? This cannot be undone.`)) return;
    try {
        await api.deleteEvent(event.id);
        await load();
    } catch (err) {
        errorMessage.value = err.message;
    }
};
</script>

<template>
    <section class="ae">
        <div class="ae-head">
            <div>
                <h2>Workshops &amp; Events</h2>
                <p class="ae-sub">
                    The grid on the KitCraft page. Mark one as upcoming to show the
                    "coming soon" card — and take it down once it has happened.
                </p>
            </div>
            <button class="ae-primary" @click="openNew">
                <ion-icon name="add-outline"></ion-icon> New event
            </button>
        </div>

        <p v-if="errorMessage && !panelOpen" class="ae-error">{{ errorMessage }}</p>
        <p v-if="loading" class="ae-empty">Loading...</p>
        <p v-else-if="!events.length" class="ae-empty">No events yet. Create the first one.</p>

        <div v-else class="ae-list">
            <article v-for="event in events" :key="event.id" class="ae-row" :class="{ hidden: !event.is_visible }">
                <img v-if="event.cover_image_key" :src="getEventMediaUrl(event.cover_image_key)" :alt="event.title" />
                <div v-else class="ae-nocover">No cover</div>

                <div class="ae-info">
                    <div class="ae-badges">
                        <span v-if="event.is_upcoming" class="ae-badge ae-badge--soon">● Coming soon</span>
                        <span v-if="!event.is_visible" class="ae-badge ae-badge--hidden">Hidden</span>
                        <span class="ae-date">{{ event.date_label }}</span>
                    </div>
                    <h3>{{ event.title }}</h3>
                    <p v-if="event.title_th" class="ae-th">{{ event.title_th }}</p>
                    <p class="ae-meta">
                        {{ event.location }} &middot; {{ (event.gallery || []).length }} media item(s)
                    </p>
                </div>

                <div class="ae-actions">
                    <button @click="openEdit(event)">Edit</button>
                    <button class="ae-danger" @click="remove(event)">Delete</button>
                </div>
            </article>
        </div>

        <!-- Editor panel -->
        <div v-if="panelOpen" class="ae-backdrop" @click="closePanel"></div>
        <aside v-if="panelOpen" class="ae-panel">
            <header class="ae-panel-head">
                <h3>{{ isEditing ? 'Edit event' : 'New event' }}</h3>
                <button class="ae-close" @click="closePanel">&times;</button>
            </header>

            <div class="ae-panel-body">
                <label class="ae-label">Title (EN) *</label>
                <input v-model="form.title" class="ae-input" placeholder="KitCraft DIY Workshop | Libi Home Cafe" />

                <label class="ae-label">Title (TH)</label>
                <input v-model="form.title_th" class="ae-input" />

                <label class="ae-label">Date shown (EN)</label>
                <input v-model="form.date_label" class="ae-input" placeholder="December 13-14, 2025" />

                <label class="ae-label">Date shown (TH)</label>
                <input v-model="form.date_label_th" class="ae-input" placeholder="13-14 ธันวาคม 2568" />

                <label class="ae-label">Sort date (not shown)</label>
                <input v-model="form.starts_on" type="date" class="ae-input" />

                <label class="ae-label">Cover photo</label>
                <img v-if="form.cover_image_key" class="ae-preview" :src="getEventMediaUrl(form.cover_image_key)" alt="" />
                <input type="file" accept="image/*" class="ae-input" @change="onCoverPick" />

                <label class="ae-label">Description (EN)</label>
                <textarea v-model="form.description" class="ae-input" rows="3"></textarea>

                <label class="ae-label">Description (TH)</label>
                <textarea v-model="form.description_th" class="ae-input" rows="3"></textarea>

                <label class="ae-label">Location (EN)</label>
                <input v-model="form.location" class="ae-input" placeholder="Libi Home Cafe, Bangkok" />

                <label class="ae-label">Location (TH)</label>
                <input v-model="form.location_th" class="ae-input" />

                <label class="ae-label">Attendance (EN)</label>
                <input v-model="form.participants" class="ae-input" placeholder="50+  /  Limited Seats" />

                <label class="ae-label">Attendance (TH)</label>
                <input v-model="form.participants_th" class="ae-input" />

                <label class="ae-label">Media gallery</label>
                <div v-for="(media, idx) in form.gallery" :key="idx" class="ae-media-row">
                    <select v-model="media.type" class="ae-input ae-type">
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                    </select>
                    <input v-model="media.src" class="ae-input" placeholder="file key or URL" />
                    <input v-model="media.title" class="ae-input" placeholder="Caption (optional)" />
                    <input type="file" accept="image/*,video/*" class="ae-input ae-file" @change="onMediaPick($event, idx)" />
                    <button class="ae-danger ae-remove" @click="removeMedia(idx)">&times;</button>
                </div>
                <button class="ae-ghost ae-addmedia" @click="addMedia">+ Add media</button>

                <div class="ae-toggles">
                    <label><input type="checkbox" v-model="form.is_upcoming" /> Coming soon (teaser card)</label>
                    <label><input type="checkbox" v-model="form.is_visible" /> Show on the site</label>
                </div>

                <p v-if="errorMessage" class="ae-error">{{ errorMessage }}</p>
            </div>

            <footer class="ae-panel-foot">
                <button class="ae-ghost" @click="closePanel">Cancel</button>
                <button class="ae-primary" :disabled="saving || uploading" @click="save">
                    {{ saving || uploading ? 'Saving...' : (isEditing ? 'Update' : 'Create') }}
                </button>
            </footer>
        </aside>
    </section>
</template>

<style scoped>
.ae { padding: 4px 0 40px 0; }

.ae-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 20px;
}

.ae-head h2 { margin: 0 0 4px 0; font-size: 1.5rem; color: #4a3529; }
.ae-sub { margin: 0; max-width: 60ch; font-size: 13px; line-height: 1.55; color: #8b7565; }

.ae-primary {
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

.ae-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.ae-primary:hover:not(:disabled) { background: #8b6f47; }

.ae-empty, .ae-error { padding: 16px 0; font-size: 14px; color: #8b7565; }
.ae-error { color: #c0392b; font-weight: 600; }

.ae-list { display: flex; flex-direction: column; gap: 12px; }

.ae-row {
    display: grid;
    grid-template-columns: 120px 1fr auto;
    gap: 16px;
    align-items: center;
    padding: 12px;
    background: #fff;
    border: 1px solid #ece0d3;
    border-radius: 12px;
}

.ae-row.hidden { opacity: 0.55; }

.ae-row img {
    width: 120px;
    height: 80px;
    object-fit: cover;
    border-radius: 10px;
    background: #f5ede3;
}

.ae-nocover {
    width: 120px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: #f5ede3;
    font-size: 12px;
    color: #a8917f;
}

.ae-info h3 { margin: 4px 0 2px 0; font-size: 1.05rem; color: #4a3529; }
.ae-th { margin: 0 0 4px 0; font-size: 13px; color: #7a6355; }
.ae-meta { margin: 0; font-size: 12px; color: #a8917f; }

.ae-badges { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.ae-badge {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    padding: 3px 8px;
    border-radius: 5px;
}

.ae-badge--soon { background: #fdeae4; color: #c0563a; }
.ae-badge--hidden { background: #eee; color: #777; }
.ae-date { font-size: 11px; color: #a8917f; }

.ae-actions { display: flex; gap: 8px; }

.ae-actions button {
    padding: 7px 14px;
    border: 1px solid #ddcbb9;
    background: #fff;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #604539;
    cursor: pointer;
}

.ae-actions button:hover { background: #f8f1e9; }
.ae-danger { color: #c0392b !important; border-color: #e8bdb5 !important; }

/* ── Editor panel ─────────────────────────────────── */
.ae-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(43, 33, 27, 0.45);
    z-index: 900;
}

.ae-panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: min(620px, 100%);
    background: #FBF7F2;
    z-index: 901;
    display: flex;
    flex-direction: column;
    box-shadow: -8px 0 32px rgba(0, 0, 0, 0.18);
}

.ae-panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 22px;
    border-bottom: 1px solid #ece0d3;
}

.ae-panel-head h3 { margin: 0; font-size: 1.2rem; color: #4a3529; }

.ae-close {
    background: none;
    border: none;
    font-size: 1.6rem;
    line-height: 1;
    color: #8b7565;
    cursor: pointer;
}

.ae-panel-body { flex: 1; overflow-y: auto; padding: 20px 22px; }

.ae-panel-foot {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 16px 22px;
    border-top: 1px solid #ece0d3;
}

.ae-ghost {
    padding: 10px 18px;
    background: #fff;
    border: 1px solid #ddcbb9;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    color: #604539;
    cursor: pointer;
}

.ae-label {
    display: block;
    margin: 16px 0 6px 0;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #8b6f47;
}

.ae-input {
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

.ae-input:focus { outline: 2px solid #e3c3ae; outline-offset: -1px; }

.ae-preview {
    width: 100%;
    max-height: 200px;
    object-fit: cover;
    border-radius: 10px;
    margin-bottom: 10px;
    background: #f5ede3;
}

/* One media item per row; it wraps rather than shrinking the inputs to nothing. */
.ae-media-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    padding: 8px;
    margin-bottom: 8px;
    background: #fff;
    border: 1px solid #ece0d3;
    border-radius: 9px;
}

.ae-media-row .ae-input { flex: 1 1 140px; width: auto; padding: 7px 10px; font-size: 13px; }
.ae-type { flex: 0 0 96px !important; }
.ae-file { flex: 1 1 100% !important; border: none !important; padding: 4px 0 !important; }

.ae-remove {
    flex: 0 0 auto;
    width: 32px;
    height: 32px;
    border: 1px solid #e8bdb5;
    background: #fff;
    border-radius: 8px;
    font-size: 1.1rem;
    line-height: 1;
    cursor: pointer;
}

.ae-addmedia { margin-top: 4px; }

.ae-toggles {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 18px;
    font-size: 14px;
    color: #4a3529;
}

.ae-toggles label { display: flex; align-items: center; gap: 8px; cursor: pointer; }

@media (max-width: 700px) {
    .ae-row { grid-template-columns: 1fr; }
    .ae-row img, .ae-nocover { width: 100%; height: 120px; }
}
</style>
