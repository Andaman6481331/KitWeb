<script setup>
// Customers, in the Standard Inventory design language. There is no admin customer
// backend yet: the rows come from useCustomers(), which today returns placeholder
// data, and the page says so. Nothing here reads or writes the database.
import { ref, reactive, computed, onMounted } from 'vue';
import { useAdminLang } from '../../composables/useAdminLang';
import { useCustomers } from '../../composables/useCustomers';
import { customersText } from '../../utils/adminMockText';
import { filterCustomers, sortCustomers, customerSegmentChips, initials } from '../../utils/adminCustomers';

const { lang, isThai, setLang } = useAdminLang();
const t = computed(() => customersText(lang.value));
const { customers, loading, isPlaceholder, load } = useCustomers();

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
        <button type="button" class="adm-btn adm-btn-primary" disabled :title="t.comingSoon">
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>
          {{ t.newCustomer }}
        </button>
      </div>
    </div>

    <div v-if="isPlaceholder" class="adm-banner" role="note">{{ t.preview }}</div>

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
            <div class="adm-card-meta">{{ r.phone }} · LINE {{ r.line }}</div>
          </div>
        </div>
        <div><span class="adm-pill">{{ t.segment[r.segment] }}</span></div>
        <div class="adm-card-pricing">
          <span class="adm-price adm-serif">{{ money(r.spent) }}</span>
          <span class="adm-box">{{ t.ordersN(r.orders) }}</span>
        </div>
        <div class="adm-card-foot">
          <span class="adm-card-added">{{ t.lastOrder(daysAgo(r.lastOrderAt)) }}</span>
        </div>
      </div>
    </div>

    <div v-else class="adm-table-wrap">
      <div class="adm-table is-narrow">
        <div class="adm-tr is-customers is-head">
          <button type="button" class="adm-th-btn" @click="pickSort('name', 'asc')">{{ t.hCustomer + arrow('name') }}</button>
          <span>{{ t.hSegment }}</span>
          <span>{{ t.hPhone }}</span>
          <button type="button" class="adm-th-btn" @click="pickSort('orders', 'desc')">{{ t.hOrders + arrow('orders') }}</button>
          <button type="button" class="adm-th-btn" @click="pickSort('spent', 'desc')">{{ t.hSpent + arrow('spent') }}</button>
          <button type="button" class="adm-th-btn" @click="pickSort('recent', 'desc')">{{ t.hLast + arrow('recent') }}</button>
        </div>
        <div v-for="r in shown" :key="r.id" class="adm-tr is-customers is-row">
          <div class="adm-cell-product">
            <span class="adm-avatar">{{ initials(customerName(r)) }}</span>
            <div style="min-width: 0">
              <div class="adm-cell-name">{{ customerName(r) }}</div>
              <div class="adm-cell-file">LINE {{ r.line }}</div>
            </div>
          </div>
          <span><span class="adm-pill">{{ t.segment[r.segment] }}</span></span>
          <span class="adm-cell-text">{{ r.phone }}</span>
          <span class="adm-cell-text">{{ r.orders }}</span>
          <span class="adm-price adm-serif">{{ money(r.spent) }}</span>
          <span class="adm-cell-dim">{{ t.lastOrder(daysAgo(r.lastOrderAt)) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
