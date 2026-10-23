<script setup>
// The Edit product slide-over: loads the product's sizes and colors, holds one reactive
// `draft` for the cards, uploads new photos, saves through POST/PUT /products and asks before
// throwing away edits. It never deletes: "Archive" hands off to the Inventory page's own
// confirmed, Undo-able archive.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { api } from '../../../services/api';
import { processProductImage } from '../../../services/image-processor';
import { useAdminLang } from '../../../composables/useAdminLang';
import { productEditText } from '../../../utils/adminProductEditText';
import {
  blankDraft, buildDraft, buildPayload, isDirty, loadPercents, refreshSkus, snapshot, validateDraft,
} from '../../../utils/adminProductEdit';
import ProductStatusCard from './ProductStatusCard.vue';
import ProductSwitch from './ProductSwitch.vue';
import ProductCategoriesCard from './ProductCategoriesCard.vue';
import ProductBasicInfo from './ProductBasicInfo.vue';
import ProductImages from './ProductImages.vue';
import ProductSizesPricing from './ProductSizesPricing.vue';
import '../../../assets/admin-product-edit.css';

const props = defineProps({
  open: { type: Boolean, default: false },
  // The product row from GET /products, or null to add a new one.
  product: { type: Object, default: null },
  categories: { type: Array, default: () => [] },
});
const emit = defineEmits(['close', 'saved', 'archive', 'session-expired']);

const { lang } = useAdminLang();
const t = computed(() => productEditText(lang.value));
const isEditing = computed(() => Boolean(props.product));

const draft = ref(null);
const original = ref('');
const percents = ref(loadPercents());
const session = ref(0); // changes on every open, so the cards start from fresh state
const loading = ref(false);
const loadFailed = ref(false); // false, 'error', or 'outdated' (the Worker has no sizes route yet)
const saving = ref(false);
const savingLabel = ref('');
const zoomSrc = ref(null);
const pendingAction = ref(null); // set while the "discard changes?" dialog is up
const toast = ref(null);
let toastTimer = null;

const flash = (message, error = false) => {
  clearTimeout(toastTimer);
  toast.value = { message, error };
  toastTimer = setTimeout(() => { toast.value = null; }, 6000);
};

// ── Opening ───────────────────────────────────────────────────────
let openToken = 0;

const begin = async () => {
  const token = ++openToken;
  session.value += 1;
  loadFailed.value = false;
  toast.value = null;
  percents.value = loadPercents();

  draft.value = null;
  loading.value = true;
  try {
    // A new product has no sizes to load, but the same call (id 0 is always empty) proves the
    // Worker understands sizes and colors. Against an older Worker the save would silently
    // drop them, so both Add and Edit stop here instead.
    const inventory = await api.getProductInventory(props.product ? props.product.id : 0);
    if (token !== openToken) return;
    draft.value = props.product ? buildDraft(props.product, inventory, percents.value) : blankDraft();
    original.value = snapshot(draft.value);
  } catch (error) {
    if (token !== openToken) return;
    if (error?.status === 401) emit('session-expired');
    else loadFailed.value = error?.status === 404 ? 'outdated' : 'error';
  } finally {
    if (token === openToken) loading.value = false;
  }
};

watch(() => [props.open, props.product], ([open]) => {
  if (open) begin();
}, { immediate: true });

// ── New product: SKU follows the first category ───────────────────
let skuToken = 0;

const onCategoryChange = async () => {
  const d = draft.value;
  if (!d || isEditing.value) return;
  const token = ++skuToken;
  const first = d.categories[0];
  if (!first) {
    d.sku = '';
    for (const s of d.sizes) for (const c of s.colors) if (!c.skuManual) c.sku = '';
    return;
  }
  try {
    const { sku } = await api.getNextSku(first);
    if (token !== skuToken || draft.value !== d) return;
    d.sku = sku;
    d.sizes = refreshSkus(d.sizes, sku);
  } catch (error) {
    if (token !== skuToken) return;
    if (error?.status === 401) emit('session-expired');
    else flash(t.value.skuFailed, true);
  }
};

const onSkuChange = () => {
  if (draft.value) draft.value.sizes = refreshSkus(draft.value.sizes, draft.value.sku);
};

// ── Saving ────────────────────────────────────────────────────────
const problemText = (problem) => {
  const entry = t.value[`problem${problem.key[0].toUpperCase()}${problem.key.slice(1)}`];
  return typeof entry === 'function' ? entry(problem.arg) : entry;
};

// Photos are processed in the browser and uploaded one by one, as the old form did.
const uploadNewImages = async (d) => {
  let gallery = 1;
  for (const img of d.images) {
    if (!img.isNew) continue;
    const baseName = `${d.sku}${img.isMain ? '' : `-g${gallery++}`}-${Date.now()}`;
    const files = await processProductImage(img.file, baseName);
    await api.uploadImage(files);
    img.image_key = baseName;
    img.isNew = false;
    img.file = null;
  }
};

const save = async ({ asDraft = false } = {}) => {
  const d = draft.value;
  if (!d || saving.value) return;

  const problem = validateDraft(d);
  if (problem) {
    flash(problemText(problem), true);
    return;
  }

  saving.value = true;
  try {
    if (!d.sku) {
      d.sku = (await api.getNextSku(d.categories[0])).sku;
      d.sizes = refreshSkus(d.sizes, d.sku);
    }
    if (d.images.some((i) => i.isNew)) {
      savingLabel.value = t.value.uploading;
      try {
        await uploadNewImages(d);
      } catch (error) {
        if (error?.status === 401) throw error;
        flash(t.value.uploadFailed, true);
        return;
      }
    }
    savingLabel.value = t.value.saving;
    const payload = buildPayload({ ...d, isVisible: asDraft ? false : d.isVisible });
    if (isEditing.value) await api.updateProduct(props.product.id, payload);
    else await api.addProduct(payload);
    emit('saved');
    emit('close');
  } catch (error) {
    if (error?.status === 401) emit('session-expired');
    else flash(t.value.saveFailed(error?.message || ''), true);
  } finally {
    saving.value = false;
    savingLabel.value = '';
  }
};

// ── Closing ───────────────────────────────────────────────────────
const dirty = computed(() => Boolean(draft.value) && isDirty(draft.value, original.value));
const guarded = (action) => {
  if (dirty.value) pendingAction.value = action;
  else action();
};
const requestClose = () => guarded(() => emit('close'));
const requestArchive = () => guarded(() => emit('archive', props.product.id));
const confirmDiscard = () => {
  const action = pendingAction.value;
  pendingAction.value = null;
  if (action) action();
};

const keepButton = ref(null);
const lightbox = ref(null);
watch(pendingAction, async (value) => {
  if (!value) return;
  await nextTick();
  keepButton.value?.focus();
});
watch(zoomSrc, async (value) => {
  if (!value) return;
  await nextTick();
  lightbox.value?.focus();
});

// Esc closes the panel, unless a dialog or the photo preview is open: those close themselves.
const onKey = (event) => {
  if (event.key !== 'Escape' || !props.open) return;
  if (document.querySelector('.pe-dialog-back, .pe-lightbox')) return;
  requestClose();
};
onMounted(() => document.addEventListener('keydown', onKey));
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey);
  clearTimeout(toastTimer);
});
</script>

<template>
  <transition name="pe-slide">
    <section v-if="open" class="pe-panel" role="dialog" aria-modal="true" :aria-label="isEditing ? t.titleEdit : t.titleAdd">
      <header class="pe-head">
        <button type="button" class="pe-back" :aria-label="t.backLabel" @click="requestClose">{{ t.back }}</button>
        <div class="pe-crumb">{{ t.crumb }} /</div>
        <h2 class="pe-head-title pe-serif">{{ isEditing ? t.titleEdit : t.titleAdd }}</h2>
        <span class="pe-head-spacer"></span>
        <button type="button" class="pe-iconbtn" :aria-label="t.close" :title="t.close" @click="requestClose">×</button>
      </header>

      <div class="pe-scroll">
        <div v-if="loading" class="pe-center" role="status">{{ t.loading }}</div>
        <div v-else-if="loadFailed" class="pe-center">
          <p>{{ loadFailed === 'outdated' ? t.loadOutdated : t.loadError }}</p>
          <button type="button" class="pe-btn" @click="begin">{{ t.retry }}</button>
        </div>
        <div v-else-if="draft" :key="session" class="pe-layout">
          <aside class="pe-side pe-side-left">
            <ProductStatusCard :draft="draft" :t="t" />
            <section class="pe-card pe-card-tight">
              <div class="pe-switch-row">
                <div>
                  <b>{{ t.displayTitle }}</b>
                  <div class="pe-hint" style="margin-top: 2px">{{ draft.isVisible ? t.displayOn : t.displayOff }}</div>
                </div>
                <ProductSwitch v-model="draft.isVisible" :label="t.displayTitle" />
              </div>
            </section>
            <ProductCategoriesCard
              :draft="draft" :categories="categories" :is-editing="isEditing" :lang="lang" :t="t"
              @category-change="onCategoryChange" @sku-change="onSkuChange"
            />
          </aside>
          <div class="pe-main">
            <ProductBasicInfo class="pe-basic" :draft="draft" :lang="lang" :t="t" />
            <ProductSizesPricing class="pe-sizes" :draft="draft" :percents="percents" :t="t" @update:percents="percents = $event" />
          </div>
          <aside class="pe-side pe-side-right">
            <ProductImages :draft="draft" :t="t" @zoom="zoomSrc = $event" />
          </aside>
        </div>
      </div>

      <footer class="pe-foot">
        <button type="button" class="pe-btn" @click="requestClose">{{ t.cancel }}</button>
        <button v-if="isEditing" type="button" class="pe-btn" :disabled="saving" @click="requestArchive">{{ t.archive }}</button>
        <span class="pe-head-spacer"></span>
        <span v-if="saving" class="pe-hint" role="status">{{ savingLabel }}</span>
        <button type="button" class="pe-btn" :disabled="!draft || saving" @click="save({ asDraft: true })">{{ t.saveDraft }}</button>
        <button type="button" class="pe-btn pe-btn-pri" :disabled="!draft || saving" @click="save()">{{ isEditing ? t.update : t.add }}</button>
      </footer>
    </section>
  </transition>

  <div v-if="pendingAction" class="pe-dialog-back" @click.self="pendingAction = null">
    <div class="pe-dialog" role="alertdialog" aria-modal="true" :aria-label="t.discardTitle" @keydown.esc.stop="pendingAction = null">
      <h2 class="pe-serif">{{ t.discardTitle }}</h2>
      <p>{{ t.discardBody }}</p>
      <div class="pe-dialog-actions">
        <span class="pe-spacer"></span>
        <button ref="keepButton" type="button" class="pe-btn pe-btn-pri" @click="pendingAction = null">{{ t.keepEditing }}</button>
        <button type="button" class="pe-btn" @click="confirmDiscard">{{ t.discard }}</button>
      </div>
    </div>
  </div>

  <div v-if="zoomSrc" ref="lightbox" class="pe-lightbox" tabindex="-1" role="dialog" aria-modal="true" @click.self="zoomSrc = null" @keydown.esc.stop="zoomSrc = null">
    <button type="button" class="pe-lightbox-x" :aria-label="t.imgClose" @click="zoomSrc = null">×</button>
    <img :src="zoomSrc" alt="" />
  </div>

  <div v-if="toast && open" role="status" class="pe-toast" :class="{ 'is-error': toast.error }">{{ toast.message }}</div>
</template>
