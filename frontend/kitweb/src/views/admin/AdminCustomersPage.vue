<script setup>
// Customers, in the Standard Inventory design language. The rows come from useCustomers():
// the customers imported from the old Access database (read-only, tagged Legacy), plus
// anyone added this visit, kept in memory.
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import AddCustomerDialog from '../../components/admin/customers/AddCustomerDialog.vue';
import LegacyCustomerPanel from '../../components/admin/customers/LegacyCustomerPanel.vue';
import { legacyText } from '../../utils/adminLegacyText';
import { useAdminLang } from '../../composables/useAdminLang';
import { useCustomers } from '../../composables/useCustomers';
import { customersText } from '../../utils/adminMockText';
import { filterCustomers, sortCustomers, customerSegmentChips, initials } from '../../utils/adminCustomers';
import { LEVEL_COLORS } from '../../utils/adminInvoiceEdit';

const { lang, isThai, setLang } = useAdminLang();
const t = computed(() => customersText(lang.value));
const lt = computed(() => legacyText(lang.value));
const { customers, loading, error, isPlaceholder, load, addCustomer } = useCustomers();
const detailsId = ref('');
const route = useRoute();
const routeLang = computed(() => route.params.lang || 'en');

const adding = ref(false);
const toast = ref(null);
let toastTimer = null;
const saveNew = (form) => {
  const created = addCustomer(form);
  adding.value = false;
  filters.query = '';
  filters.segment = 'all';
  sort.value = { key: 'recent', dir: 'desc' };
  toast.value = { message: t.value.added(isThai.value ? created.nameTh : created.name), customerId: created.id };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.value = null; }, 8000);
};
onUnmounted(() => clearTimeout(toastTimer));
const invoiceLink = (id) => ({ name: 'admin-invoice-new', params: { lang: routeLang.value }, query: { customer: id } });
const levelStyle = (r) => (r.levelUnset
  ? { background: '#eeeae3', color: '#6b6358' }
  : { background: LEVEL_COLORS[r.level][0], color: LEVEL_COLORS[r.level][1] });
const levelLabel = (r) => (r.levelUnset ? t.value.levelUnset : t.value.levels[r.level]);

const filters = reactive({ query: '', segment: 'all' });
const sort = ref({ key: 'recent', dir: 'desc' });
const view = ref('grid');

const shown = computed(() => sortCustomers(filterCustomers(customers.value, filters), sort.value, lang.value));
const chips = computed(() => customerSegmentChips(customers.value));

const sortDefs = computed(() => [
  ['name', t.value.sortName, 'asc'], ['orders', t.value.sortOrders, 'desc'],
  ['spent', t.value.sortSpent, 'desc'], ['recent', t.value.sortRecent, 'desc'],
]);
const arrow = (key) => (sort.value.key === key ? (sort.value.dir === 'asc' ? ' ↑' : ' ↓') : '');
const pickSort = (key, dir) => {
  sort.value = sort.value.key === key
    ? { key, dir: sort.value.dir === 'asc' ? 'desc' : 'asc' }
    : { key, dir };
};

const chipLabel = (key) => (key === 'all' ? t.value.all : t.value.segment[key]);
const money = (n) => `฿${Number(n).toLocaleString('en-US')}`;
const customerName = (r) => (isThai.value ? r.nameTh : r.name);
const daysAgo = (ms) => Math.max(0, Math.floor((Date.now() - ms) / (24 * 60 * 60 * 1000)));
const lastOrderText = (r) => (r.lastOrderAt ? t.value.lastOrder(daysAgo(r.lastOrderAt)) : t.value.noOrders);
const clearFilters = () => { filters.query = ''; filters.segment = 'all'; };

onMounted(load);
</script>

<template>
  <div class="adm-page">
    <div class="adm-head">
      <div class="adm-head-text">
        <h1 class="adm-title adm-serif">{{ t.title }}</h1>
        <div class="adm-sub">{{ t.subtitle }}</div>
      </div>
      <div class="adm-actions">
        <div role="group" aria-label="Language" class="adm-seg">
          <button type="button" class="adm-seg-btn is-lang" :class="{ 'is-on': !isThai }" :aria-pressed="!isThai" @click="setLang('en')">EN</button>
          <button type="button" class="adm-seg-btn is-lang" :class="{ 'is-on': isThai }" :aria-pressed="isThai" @click="setLang('th')">ไทย</button>
        </div>
        <button type="button" class="adm-btn adm-btn-primary" @click="adding = true">
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>
          {{ t.newCustomer }}
        </button>
      </div>
    </div>

    <div v-if="isPlaceholder" class="adm-banner" role="note">{{ t.preview }}</div>
    <div v-if="error" class="adm-error" role="alert">{{ error }}</div>

    <div class="adm-toolbar">
      <div class="adm-row">
        <div class="adm-search">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8a8176" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>
          <input v-model="filters.query" type="search" :aria-label="t.search" :placeholder="t.search" />
        </div>
        <div role="group" aria-label="View" class="adm-seg">
          <button type="button" class="adm-seg-btn" :class="{ 'is-on': view === 'grid' }" :aria-pressed="view === 'grid'" @click="view = 'grid'">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect></svg>
            {{ t.grid }}
          </button>
          <button type="button" class="adm-seg-btn" :class="{ 'is-on': view === 'list' }" :aria-pressed="view === 'list'" @click="view = 'list'">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"></path></svg>
            {{ t.list }}
          </button>
        </div>
      </div>
      <div role="group" aria-label="Type" class="adm-chips">
        <button
          v-for="c in chips"
          :key="c.key"
          type="button"
          class="adm-chip"
          :class="{ 'is-on': filters.segment === c.key }"
          :aria-pressed="filters.segment === c.key"
          @click="filters.segment = c.key"
        >
          <span>{{ chipLabel(c.key) }}</span>
          <span class="adm-chip-count">{{ c.count }}</span>
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
        <div class="adm-count">{{ t.showing(shown.length, customers.length) }}</div>
      </div>
    </div>

    <div v-if="loading" class="adm-grid" aria-busy="true">
      <div v-for="n in 8" :key="n" class="adm-skeleton" style="height: 190px"></div>
    </div>

    <div v-else-if="shown.length === 0" class="adm-empty">
      <div class="adm-empty-title adm-serif">{{ t.noResult }}</div>
      <div class="adm-empty-sub">{{ t.noResultSub }}</div>
      <button type="button" class="adm-btn adm-btn-link" style="margin-top: 8px" @click="clearFilters">{{ t.clear }}</button>
    </div>

    <div v-else-if="view === 'grid'" class="adm-grid">
      <div v-for="r in shown" :key="r.id" class="adm-card">
        <div style="display: flex; align-items: center; gap: 12px">
          <span class="adm-avatar">{{ initials(customerName(r)) }}</span>
          <div style="min-width: 0">
            <div class="adm-card-name">{{ customerName(r) }}</div>
            <div class="adm-card-meta">{{ r.contact }} · {{ r.phone }}</div>
          </div>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px">
          <span class="adm-pill" :class="{ 'is-legacy': r.source === 'legacy' }">{{ t.segment[r.segment] }}</span>
          <span class="adm-level" :style="levelStyle(r)">{{ levelLabel(r) }}</span>
        </div>
        <div class="adm-card-pricing">
          <span class="adm-price adm-serif">{{ money(r.spent) }}</span>
          <span class="adm-box">{{ t.ordersN(r.orders) }}</span>
        </div>
        <div v-if="r.outstanding > 0" class="adm-owes">{{ t.hBalance }}: {{ money(r.outstanding) }}</div>
        <div class="adm-card-foot">
          <span class="adm-card-added">{{ lastOrderText(r) }}</span>
          <button v-if="r.source === 'legacy'" type="button" class="adm-btn adm-btn-link" @click="detailsId = r.id">{{ t.details }}</button>
          <router-link class="adm-card-link" :to="invoiceLink(r.id)">{{ t.newInvoiceFor }}</router-link>
        </div>
      </div>
    </div>

    <div v-else class="adm-table-wrap">
      <div class="adm-table is-wide">
        <div class="adm-tr is-customers is-head">
          <button type="button" class="adm-th-btn" @click="pickSort('name', 'asc')">{{ t.hCustomer + arrow('name') }}</button>
          <span>{{ t.hSegment }}</span>
          <span>{{ t.hLevel }}</span>
          <span>{{ t.hPhone }}</span>
          <span>{{ t.hBalance }}</span>
          <button type="button" class="adm-th-btn" @click="pickSort('spent', 'desc')">{{ t.hSpent + arrow('spent') }}</button>
          <button type="button" class="adm-th-btn" @click="pickSort('recent', 'desc')">{{ t.hLast + arrow('recent') }}</button>
          <span></span>
        </div>
        <div v-for="r in shown" :key="r.id" class="adm-tr is-customers is-row">
          <div class="adm-cell-product">
            <span class="adm-avatar">{{ initials(customerName(r)) }}</span>
            <div style="min-width: 0">
              <div class="adm-cell-name">{{ customerName(r) }}</div>
              <div class="adm-cell-file">{{ r.contact }} · {{ t.ordersN(r.orders) }}</div>
            </div>
          </div>
          <span><span class="adm-pill" :class="{ 'is-legacy': r.source === 'legacy' }">{{ t.segment[r.segment] }}</span></span>
          <span><span class="adm-level" :style="levelStyle(r)">{{ levelLabel(r) }}</span></span>
          <span class="adm-cell-text">{{ r.phone }}</span>
          <span :class="r.outstanding > 0 ? 'adm-owes' : 'adm-cell-dim'">{{ r.outstanding > 0 ? money(r.outstanding) : '—' }}</span>
          <span class="adm-price adm-serif">{{ money(r.spent) }}</span>
          <span class="adm-cell-dim">{{ lastOrderText(r) }}</span>
          <span>
            <button v-if="r.source === 'legacy'" type="button" class="adm-btn adm-btn-link" @click="detailsId = r.id">{{ t.details }}</button>
            <router-link class="adm-card-link" style="margin-left: 0" :to="invoiceLink(r.id)">{{ t.newInvoiceFor }}</router-link>
          </span>
        </div>
      </div>
    </div>

    <LegacyCustomerPanel v-if="detailsId" :t="lt" :customer-id="detailsId" :is-thai="isThai" @close="detailsId = ''" />
    <AddCustomerDialog v-if="adding" :t="t" :customers="customers" @save="saveNew" @cancel="adding = false" />

    <div v-if="toast" class="adm-toast" role="status">
      <span>{{ toast.message }}</span>
      <router-link class="adm-toast-undo" :to="invoiceLink(toast.customerId)">{{ t.newInvoiceFor }}</router-link>
    </div>
  </div>
</template>
