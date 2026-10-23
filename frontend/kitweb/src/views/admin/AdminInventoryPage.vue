<script setup>
// Standard Inventory: the redesigned product list. It reads the live catalogue and
// makes only additive changes to it: Hide/Show flips is_visible, "Add to category"
// adds a link, Archive hides a product and stamps it, Duplicate creates a hidden copy.
// There is no delete anywhere on this page, and no call touches the image bucket.
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../../services/api';
import { useAdminSession } from '../../composables/useAdminSession';
import { useAdminLang } from '../../composables/useAdminLang';
import { inventoryText } from '../../utils/adminInventoryText';
import {
  toInventoryItem, filterItems, sortItems, categoryChips, visibleCategories, attentionCount,
  withVisibility, withArchived, withRestored, withCategory, buildDuplicatePayload,
} from '../../utils/adminInventory';
import InventoryCard from '../../components/admin/inventory/InventoryCard.vue';
import InventoryRow from '../../components/admin/inventory/InventoryRow.vue';
import InventoryBulkBar from '../../components/admin/inventory/InventoryBulkBar.vue';
import InventoryArchiveDialog from '../../components/admin/inventory/InventoryArchiveDialog.vue';
import AdminProductForm from '../../components/admin-product-form.vue';

const route = useRoute();
const router = useRouter();
const { handleAuthError } = useAdminSession();
const { lang, isThai, setLang } = useAdminLang();
const t = computed(() => inventoryText(lang.value));

// ── State ─────────────────────────────────────────────────────────
const loading = ref(true);
const loadError = ref(false);
const items = ref([]);
const categories = ref([]);

const filters = reactive({ query: '', category: 'all', price: 'all', website: 'all', attention: false });
const sort = ref({ key: 'sku', dir: 'asc' });
const view = ref('grid');
const moreCats = ref(false);

const selected = ref([]);
const menuId = ref(null);
const archiveIds = ref(null); // products waiting on the typed confirmation
const busy = ref(false);
const toast = ref(null); // { message, undo, error }
let toastTimer = null;

const formOpen = ref(false);
const editing = ref(null); // raw product row, or null for a new product

// ── Derived ───────────────────────────────────────────────────────
const byId = computed(() => new Map(items.value.map((i) => [i.id, i])));
const shown = computed(() => sortItems(filterItems(items.value, filters), sort.value, lang.value));
const chips = computed(() => categoryChips(items.value, categories.value, lang.value));
const shownChips = computed(() => visibleCategories(chips.value, filters.category, moreCats.value));
const hiddenChipCount = computed(() => Math.max(0, chips.value.length - 9));
const attnCount = computed(() => attentionCount(items.value));
const archivedView = computed(() => filters.website === 'archived');
const totalInView = computed(() =>
  items.value.filter((i) => (archivedView.value ? i.isArchived : !i.isArchived)).length);

const categoryLabels = computed(() => new Map(categories.value.map((c) => [
  c.path, lang.value === 'th' && c.name_th ? c.name_th : c.name,
])));
const categoryOptions = computed(() => categories.value.map((c) => ({ key: c.path, label: categoryLabels.value.get(c.path) })));
const labelFor = (item) => {
  const [first, ...rest] = item.categories;
  if (!first) return '';
  const base = categoryLabels.value.get(first) || first;
  return rest.length ? `${base} +${rest.length}` : base;
};
const displayName = (item) => (lang.value === 'th' ? item.nameTh || item.name : item.name);

const selectedSet = computed(() => new Set(selected.value));
const allSelected = computed(() => shown.value.length > 0 && shown.value.every((i) => selectedSet.value.has(i.id)));
const isFiltered = computed(() => filters.query.trim() || filters.category !== 'all' || filters.price !== 'all'
  || filters.website !== 'all' || filters.attention);

const sortDefs = computed(() => [
  ['sku', t.value.sortSku, 'asc'], ['name', t.value.sortName, 'asc'], ['price', t.value.sortPrice, 'asc'],
  ['box', t.value.sortBox, 'asc'], ['upload', t.value.sortUpload, 'desc'],
]);
const arrow = (key) => (sort.value.key === key ? (sort.value.dir === 'asc' ? ' ↑' : ' ↓') : '');
const pickSort = (key, dir) => {
  sort.value = sort.value.key === key
    ? { key, dir: sort.value.dir === 'asc' ? 'desc' : 'asc' }
    : { key, dir };
};

// ── Loading ───────────────────────────────────────────────────────
let openedFromQuery = false;

const load = async ({ silent = false } = {}) => {
  if (!silent) loading.value = true;
  loadError.value = false;
  try {
    const [products, cats] = await Promise.all([
      api.getProducts(null, { includeHidden: true }),
      api.getCategories(),
    ]);
    const now = Date.now();
    items.value = products.map((p) => toInventoryItem(p, now));
    categories.value = Array.isArray(cats) ? cats : [];
    selected.value = selected.value.filter((id) => byId.value.has(id));
    openFromQuery();
  } catch (error) {
    if (handleAuthError(error)) return;
    loadError.value = true;
  } finally {
    loading.value = false;
  }
};

// /admin/inventory?new=1 and ?edit=<id> open the product form straight away.
const openFromQuery = () => {
  if (openedFromQuery) return;
  openedFromQuery = true;
  if (route.query.new) openNew();
  else if (route.query.edit) {
    const item = byId.value.get(Number(route.query.edit));
    if (item && !item.isArchived) openEdit(item);
  }
};

// ── Toast ─────────────────────────────────────────────────────────
const flash = (message, { undo = null, error = false } = {}) => {
  clearTimeout(toastTimer);
  toast.value = { message, undo, error };
  toastTimer = setTimeout(() => { toast.value = null; }, 6000);
};
const undoToast = () => {
  const undo = toast.value?.undo;
  clearTimeout(toastTimer);
  toast.value = null;
  if (undo) undo();
};

// ── Changing products ─────────────────────────────────────────────
// Shows the change at once, then asks the Worker. If the Worker refuses, the list goes
// back to exactly how it was and the page says nothing changed.
const run = async (optimistic, request) => {
  const before = items.value;
  items.value = optimistic(before);
  busy.value = true;
  try {
    await request();
    return true;
  } catch (error) {
    items.value = before;
    if (!handleAuthError(error)) flash(t.value.toastError, { error: true });
    return false;
  } finally {
    busy.value = false;
  }
};

const stamp = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const liveIds = (ids) => ids.filter((id) => byId.value.has(id) && !byId.value.get(id).isArchived);

// announce: false is for Undo, which just puts things back without another toast.
const setVisibility = async (ids, visible, { announce = true } = {}) => {
  menuId.value = null;
  if (busy.value) return;
  const changing = liveIds(ids).filter((id) => byId.value.get(id).isVisible !== visible);
  if (!changing.length) return;
  const ok = await run(
    (list) => withVisibility(list, changing, visible),
    () => api.setProductsVisibility(changing, visible),
  );
  if (!ok || !announce) return;
  flash(visible ? t.value.toastShown(changing.length) : t.value.toastHidden(changing.length), {
    undo: () => setVisibility(changing, !visible, { announce: false }),
  });
};

const askArchive = (ids) => {
  menuId.value = null;
  const live = liveIds(ids);
  if (live.length) archiveIds.value = live;
};

const archiveTitle = computed(() => {
  const ids = archiveIds.value || [];
  const name = ids.length === 1 && byId.value.get(ids[0]) ? displayName(byId.value.get(ids[0])) : '';
  return t.value.archiveTitle(ids.length, name);
});

const confirmArchive = async () => {
  const ids = archiveIds.value;
  archiveIds.value = null;
  if (!ids?.length || busy.value) return;
  // Remember how each product was, so Undo brings it back the same way.
  const previous = ids.map((id) => ({ id, is_visible: byId.value.get(id).isVisible }));
  const name = ids.length === 1 ? displayName(byId.value.get(ids[0])) : undefined;
  const ok = await run(
    (list) => withArchived(list, ids, stamp()),
    () => api.archiveProducts(ids),
  );
  if (!ok) return;
  selected.value = selected.value.filter((id) => !ids.includes(id));
  flash(t.value.toastArchived(ids.length, name), { undo: () => restoreList(previous, { announce: false }) });
};

const archiveQuietly = (ids) => run(
  (list) => withArchived(list, ids, stamp()),
  () => api.archiveProducts(ids),
);

// restore: [{ id, is_visible }]. Restoring from the Archived view brings products back
// hidden, so nothing reappears on the website until someone chooses to show it.
const restoreList = async (restore, { announce }) => {
  menuId.value = null;
  if (busy.value || !restore.length) return false;
  const ok = await run(
    (list) => withRestored(list, restore),
    () => api.restoreProducts(restore),
  );
  if (ok && announce) {
    const ids = restore.map((r) => r.id);
    selected.value = selected.value.filter((id) => !ids.includes(id));
    flash(t.value.toastRestored(ids.length), { undo: () => archiveQuietly(ids) });
  }
  return ok;
};
const restoreIds = (ids) => {
  const archived = ids.filter((id) => byId.value.get(id)?.isArchived);
  return restoreList(archived.map((id) => ({ id, is_visible: false })), { announce: true });
};

const addToCategory = async (path) => {
  const ids = liveIds(selected.value);
  if (!ids.length || busy.value) return;
  const label = categoryLabels.value.get(path) || path;
  const ok = await run(
    (list) => withCategory(list, ids, path),
    () => api.addProductsToCategory(ids, path),
  );
  if (ok) flash(t.value.toastAddedToCategory(ids.length, label));
};

const duplicate = async (item) => {
  menuId.value = null;
  if (busy.value) return;
  busy.value = true;
  try {
    await api.addProduct(buildDuplicatePayload(item.raw));
    flash(t.value.toastDuplicated);
    await load({ silent: true });
  } catch (error) {
    if (!handleAuthError(error)) flash(t.value.toastError, { error: true });
  } finally {
    busy.value = false;
  }
};

// ── Product form (the existing add/edit panel) ────────────────────
const openNew = () => {
  menuId.value = null;
  editing.value = null;
  formOpen.value = true;
};
const openEdit = (item) => {
  menuId.value = null;
  editing.value = item.raw;
  formOpen.value = true;
};
const closeForm = () => {
  formOpen.value = false;
  editing.value = null;
  if (route.query.new || route.query.edit) router.replace({ query: {} });
};

// ── Selection ─────────────────────────────────────────────────────
const toggleSelect = (id) => {
  selected.value = selectedSet.value.has(id) ? selected.value.filter((i) => i !== id) : [...selected.value, id];
};
const selectAllShown = () => {
  selected.value = [...new Set([...selected.value, ...shown.value.map((i) => i.id)])];
};
const toggleAll = () => {
  const ids = shown.value.map((i) => i.id);
  selected.value = allSelected.value
    ? selected.value.filter((id) => !ids.includes(id))
    : [...new Set([...selected.value, ...ids])];
};
const clearFilters = () => {
  filters.query = '';
  filters.category = 'all';
  filters.price = 'all';
  filters.website = 'all';
  filters.attention = false;
};

// Switching between live and archived products drops the selection, so a bulk action
// can never apply to the other kind.
watch(() => filters.website, () => { selected.value = []; });

const onKeydown = (event) => { if (event.key === 'Escape') menuId.value = null; };
onMounted(() => {
  load();
  document.addEventListener('keydown', onKeydown);
});
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown);
  clearTimeout(toastTimer);
});
</script>

<template>
  <div class="adm-page">
    <!-- Header -->
    <div class="adm-head">
      <div class="adm-head-text">
        <h1 class="adm-title adm-serif">{{ t.title }}</h1>
        <div class="adm-sub">{{ t.subtitle }}</div>
      </div>
      <div class="adm-actions">
        <button type="button" class="adm-btn" @click="openNew">
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"></path></svg>
          {{ t.upload }}
        </button>
        <div role="group" aria-label="Language" class="adm-seg">
          <button type="button" class="adm-seg-btn is-lang" :class="{ 'is-on': !isThai }" :aria-pressed="!isThai" @click="setLang('en')">EN</button>
          <button type="button" class="adm-seg-btn is-lang" :class="{ 'is-on': isThai }" :aria-pressed="isThai" @click="setLang('th')">ไทย</button>
        </div>
        <button type="button" class="adm-btn adm-btn-primary" @click="openNew">
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>
          {{ t.add }}
        </button>
      </div>
    </div>

    <!-- Sticky toolbar: search + view, categories, controls -->
    <div class="adm-toolbar">
      <div class="adm-row">
        <div class="adm-search">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8a8176" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>
          <input v-model="filters.query" type="search" :aria-label="t.search" :placeholder="t.search" />
        </div>
        <div role="group" aria-label="View" class="adm-seg">
          <button type="button" class="adm-seg-btn" :class="{ 'is-on': view === 'grid' }" :aria-pressed="view === 'grid'" @click="view = 'grid'; menuId = null">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect></svg>
            {{ t.grid }}
          </button>
          <button type="button" class="adm-seg-btn" :class="{ 'is-on': view === 'list' }" :aria-pressed="view === 'list'" @click="view = 'list'; menuId = null">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"></path></svg>
            {{ t.list }}
          </button>
        </div>
      </div>

      <div role="group" aria-label="Category" class="adm-chips">
        <button
          v-for="c in shownChips"
          :key="c.key"
          type="button"
          class="adm-chip"
          :class="{ 'is-on': filters.category === c.key }"
          :aria-pressed="filters.category === c.key"
          @click="filters.category = c.key"
        >
          <span>{{ c.label }}</span>
          <span class="adm-chip-count">{{ c.count }}</span>
        </button>
        <button v-if="hiddenChipCount > 0" type="button" class="adm-chip adm-chip-more" :aria-expanded="moreCats" @click="moreCats = !moreCats">
          {{ moreCats ? t.less : t.moreN(hiddenChipCount) }}
        </button>
      </div>

      <div class="adm-row-tight">
        <span class="adm-label">{{ t.sortBy }}</span>
        <div role="group" :aria-label="t.sortBy" class="adm-sortset">
          <button
            v-for="s in sortDefs"
            :key="s[0]"
            type="button"
            class="adm-sort"
            :class="{ 'is-on': sort.key === s[0] }"
            :aria-pressed="sort.key === s[0]"
            @click="pickSort(s[0], s[2])"
          >{{ s[1] + arrow(s[0]) }}</button>
        </div>
        <span class="adm-divider"></span>
        <select v-model="filters.price" class="adm-select" :aria-label="t.priceLabel">
          <option value="all">{{ t.priceAll }}</option>
          <option value="has">{{ t.priceHas }}</option>
          <option value="none">{{ t.priceNone }}</option>
        </select>
        <select v-model="filters.website" class="adm-select" :aria-label="t.visLabel">
          <option value="all">{{ t.visAll }}</option>
          <option value="shown">{{ t.visShown }}</option>
          <option value="hidden">{{ t.visHidden }}</option>
          <option value="archived">{{ t.visArchived }}</option>
        </select>
        <button type="button" class="adm-attn" :class="{ 'is-on': filters.attention }" :aria-pressed="filters.attention" @click="filters.attention = !filters.attention">
          <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l10 18H2zM12 10v5M12 18h.01"></path></svg>
          {{ t.attention }}
          <span class="adm-attn-count" :class="{ has: attnCount > 0 }">{{ attnCount }}</span>
        </button>
        <div class="adm-count">{{ t.showing(shown.length, totalInView) }}</div>
      </div>
    </div>

    <!-- Loading / error -->
    <div v-if="loading" class="adm-grid" aria-busy="true" :aria-label="t.loading">
      <div v-for="n in 8" :key="n" class="adm-skeleton" style="height: 360px"></div>
    </div>

    <div v-else-if="loadError" class="adm-empty">
      <div class="adm-empty-title adm-serif">{{ t.loadError }}</div>
      <button type="button" class="adm-btn adm-btn-link" style="margin-top: 8px" @click="load()">{{ t.retry }}</button>
    </div>

    <!-- Empty state -->
    <div v-else-if="shown.length === 0" class="adm-empty">
      <div class="adm-empty-title adm-serif">{{ archivedView && !isFiltered ? t.noArchived : t.noResult }}</div>
      <div class="adm-empty-sub">{{ archivedView && !isFiltered ? t.noArchivedSub : t.noResultSub }}</div>
      <button v-if="isFiltered" type="button" class="adm-btn adm-btn-link" style="margin-top: 8px" @click="clearFilters">{{ t.clear }}</button>
    </div>

    <!-- Grid view -->
    <div v-else-if="view === 'grid'" class="adm-grid">
      <InventoryCard
        v-for="item in shown"
        :key="item.id"
        :item="item"
        :t="t"
        :lang="lang"
        :category-label="labelFor(item)"
        :selected="selectedSet.has(item.id)"
        :menu-open="menuId === item.id"
        @select="toggleSelect(item.id)"
        @menu="menuId = menuId === item.id ? null : item.id"
        @edit="openEdit(item)"
        @duplicate="duplicate(item)"
        @flip="setVisibility([item.id], !item.isVisible)"
        @archive="askArchive([item.id])"
        @restore="restoreIds([item.id])"
      />
    </div>

    <!-- List view -->
    <div v-else class="adm-table-wrap">
      <div class="adm-table" :class="{ 'has-menu': menuId !== null }">
        <div class="adm-tr is-head">
          <input type="checkbox" class="adm-cell-check" :aria-label="t.selectAll" :checked="allSelected" @change="toggleAll" />
          <button type="button" class="adm-th-btn" @click="pickSort('name', 'asc')">{{ t.hName + arrow('name') }}</button>
          <button type="button" class="adm-th-btn" @click="pickSort('sku', 'asc')">{{ 'SKU' + arrow('sku') }}</button>
          <span>{{ t.hCat }}</span>
          <span>{{ t.hVar }}</span>
          <button type="button" class="adm-th-btn" @click="pickSort('price', 'asc')">{{ t.hPrice + arrow('price') }}</button>
          <button type="button" class="adm-th-btn" @click="pickSort('box', 'asc')">{{ t.hBox + arrow('box') }}</button>
          <span>{{ t.hStatus }}</span>
          <button type="button" class="adm-th-btn" @click="pickSort('upload', 'desc')">{{ t.hAdded + arrow('upload') }}</button>
          <span></span>
        </div>
        <InventoryRow
          v-for="item in shown"
          :key="item.id"
          :item="item"
          :t="t"
          :lang="lang"
          :category-label="labelFor(item)"
          :selected="selectedSet.has(item.id)"
          :menu-open="menuId === item.id"
          @select="toggleSelect(item.id)"
          @menu="menuId = menuId === item.id ? null : item.id"
          @edit="openEdit(item)"
          @duplicate="duplicate(item)"
          @flip="setVisibility([item.id], !item.isVisible)"
          @archive="askArchive([item.id])"
          @restore="restoreIds([item.id])"
        />
      </div>
    </div>

    <!-- Bulk action bar -->
    <InventoryBulkBar
      v-if="selected.length > 0"
      :count="selected.length"
      :t="t"
      :categories="categoryOptions"
      :archived-view="archivedView"
      :busy="busy"
      @select-all="selectAllShown"
      @show="setVisibility(selected, true)"
      @hide="setVisibility(selected, false)"
      @add-category="addToCategory"
      @archive="askArchive(selected)"
      @restore="restoreIds(selected)"
      @clear="selected = []"
    />
  </div>

  <!-- Click-away layer for open ⋯ menus -->
  <div v-if="menuId !== null" class="adm-scrim" @click="menuId = null"></div>

  <!-- Undo / status toast -->
  <div v-if="toast" role="status" class="adm-toast" :class="{ 'is-error': toast.error }">
    <span>{{ toast.message }}</span>
    <button v-if="toast.undo" type="button" class="adm-toast-undo" @click="undoToast">{{ t.undo }}</button>
  </div>

  <InventoryArchiveDialog
    v-if="archiveIds"
    :title="archiveTitle"
    :t="t"
    @confirm="confirmArchive"
    @cancel="archiveIds = null"
  />

  <AdminProductForm
    :open="formOpen"
    :product="editing"
    :categories="categories"
    @close="closeForm"
    @saved="load({ silent: true })"
    @session-expired="handleAuthError({ status: 401 })"
  />
</template>
