<script setup>
// Invoices, in the Standard Inventory design language. The rows come from useInvoices():
// the history imported from the old Access database (read-only, tagged Legacy), plus
// invoices saved from the New invoice page this visit (in memory, shown first).
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAdminLang } from '../../composables/useAdminLang';
import { useInvoices } from '../../composables/useInvoices';
import { invoicesText } from '../../utils/adminMockText';
import { filterInvoices, sortInvoices, summarizeInvoices, invoiceStatusChips } from '../../utils/adminInvoices';
import { paginate } from '../../utils/adminInventory';
import InventoryPager from '../../components/admin/inventory/InventoryPager.vue';

const { lang, isThai, setLang } = useAdminLang();
const t = computed(() => invoicesText(lang.value));
const { invoices, loading, error, isPlaceholder, load } = useInvoices();
const route = useRoute();
const routeLang = computed(() => route.params.lang || 'en');
const newLink = computed(() => ({ name: 'admin-invoice-new', params: { lang: routeLang.value } }));
// Only invoices saved this visit carry their editor state; the sample rows can't be opened.
const openLink = (r) => ({ name: 'admin-invoice-open', params: { lang: routeLang.value, number: r.id } });
const legacyLink = (r) => ({ name: 'admin-legacy-invoice', params: { lang: routeLang.value, id: r.id } });

const filters = reactive({ query: '', status: 'all' });
const sort = ref({ key: 'issued', dir: 'desc' });

const shown = computed(() => sortInvoices(filterInvoices(invoices.value, filters), sort.value, lang.value));
// Only one page of `shown` is drawn (20 rows, like the product list), not all of the history.
const pageNum = ref(1);
const pager = computed(() => paginate(shown.value, pageNum.value));
const pageItems = computed(() => pager.value.items);
const chips = computed(() => invoiceStatusChips(invoices.value));
const summary = computed(() => summarizeInvoices(invoices.value, Date.now()));

const sortDefs = computed(() => [
  ['issued', t.value.sortIssued, 'desc'], ['amount', t.value.sortAmount, 'desc'], ['customer', t.value.sortCustomer, 'asc'],
]);
const arrow = (key) => (sort.value.key === key ? (sort.value.dir === 'asc' ? ' ↑' : ' ↓') : '');
const pickSort = (key, dir) => {
  sort.value = sort.value.key === key
    ? { key, dir: sort.value.dir === 'asc' ? 'desc' : 'asc' }
    : { key, dir };
};

const chipLabel = (key) => (key === 'all' ? t.value.all : t.value.status[key]);
const money = (n) => `฿${Number(n).toLocaleString('en-US')}`;
const date = (ms) => (ms == null
  ? '—'
  : new Date(ms).toLocaleDateString(isThai.value ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
const customerName = (r) => (isThai.value ? r.customerTh : r.customer);
const statusClass = (status) => ({ paid: 'is-ok', overdue: 'is-danger', unpaid: 'is-danger', draft: 'is-hidden', sent: '' }[status]);
const clearFilters = () => { filters.query = ''; filters.status = 'all'; };

// Anything that changes which invoices are listed, or in what order, starts again at page one.
watch(() => [filters.query, filters.status, sort.value, lang.value], () => { pageNum.value = 1; });
// If the list shrinks under the current page, paginate() shows the nearest page that exists;
// keep the stored number in step with it.
watch(() => pager.value.page, (page) => { pageNum.value = page; });
const goToPage = (page) => {
  pageNum.value = page;
  // The controls are at the bottom of a long list; bring the new page into view.
  if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
};

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
        <router-link class="adm-btn adm-btn-primary" :to="newLink">
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>
          {{ t.newInvoice }}
        </router-link>
      </div>
    </div>

    <div v-if="isPlaceholder" class="adm-banner" role="note">{{ t.preview }}</div>
    <div v-if="error" class="adm-error" role="alert">{{ error }}</div>

    <div class="adm-tiles">
      <div class="adm-tile">
        <span class="adm-tile-label">{{ t.tileOutstanding }}</span>
        <span class="adm-tile-value adm-serif">{{ money(summary.outstanding) }}</span>
        <span class="adm-tile-note">{{ t.invoicesN(summary.outstandingCount) }}</span>
      </div>
      <div class="adm-tile">
        <span class="adm-tile-label">{{ t.tileOverdue }}</span>
        <span class="adm-tile-value adm-serif" style="color: var(--adm-danger)">{{ money(summary.overdue) }}</span>
        <span class="adm-tile-note">{{ t.invoicesN(summary.overdueCount) }}</span>
      </div>
      <div class="adm-tile">
        <span class="adm-tile-label">{{ t.tilePaid }}</span>
        <span class="adm-tile-value adm-serif" style="color: var(--adm-ok)">{{ money(summary.paidRecently) }}</span>
        <span class="adm-tile-note">{{ t.invoicesN(summary.paidRecentlyCount) }}</span>
      </div>
    </div>
    <div v-if="invoices.some((r) => r.source === 'legacy')" class="adm-sub">{{ t.summaryNote }}</div>

    <div class="adm-toolbar">
      <div class="adm-row">
        <div class="adm-search">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8a8176" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>
          <input v-model="filters.query" type="search" :aria-label="t.search" :placeholder="t.search" />
        </div>
      </div>
      <div role="group" aria-label="Status" class="adm-chips">
        <button
          v-for="c in chips"
          :key="c.key"
          type="button"
          class="adm-chip"
          :class="{ 'is-on': filters.status === c.key }"
          :aria-pressed="filters.status === c.key"
          @click="filters.status = c.key"
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
        <div class="adm-count-group">
          <div class="adm-count">{{ t.showingRange(pager.from, pager.to, shown.length, invoices.length) }}</div>
          <InventoryPager compact :pager="pager" :t="t" @go="goToPage" />
        </div>
      </div>
    </div>

    <div v-if="loading" class="adm-skeleton" style="height: 320px" aria-busy="true"></div>

    <div v-else-if="shown.length === 0" class="adm-empty">
      <div class="adm-empty-title adm-serif">{{ t.noResult }}</div>
      <div class="adm-empty-sub">{{ t.noResultSub }}</div>
      <button type="button" class="adm-btn adm-btn-link" style="margin-top: 8px" @click="clearFilters">{{ t.clear }}</button>
    </div>

    <div v-else class="adm-table-wrap">
      <div class="adm-table is-narrow">
        <div class="adm-tr is-invoices is-head">
          <span>{{ t.hNumber }}</span>
          <button type="button" class="adm-th-btn" @click="pickSort('customer', 'asc')">{{ t.hCustomer + arrow('customer') }}</button>
          <button type="button" class="adm-th-btn" @click="pickSort('issued', 'desc')">{{ t.hIssued + arrow('issued') }}</button>
          <span>{{ t.hDue }}</span>
          <button type="button" class="adm-th-btn" @click="pickSort('amount', 'desc')">{{ t.hAmount + arrow('amount') }}</button>
          <span>{{ t.hStatus }}</span>
        </div>
        <div v-for="r in pageItems" :key="r.id" class="adm-tr is-invoices is-row">
          <span v-if="r.source === 'legacy'" class="adm-cell-text">
            <router-link class="adm-card-link" style="margin-left: 0" :to="legacyLink(r)">{{ t.orderN(r.number) }}</router-link>
            <span class="adm-badge is-flat is-legacy" style="margin-left: 6px">{{ t.legacy }}</span>
          </span>
          <router-link v-else-if="r.draft" class="adm-cell-text adm-card-link" style="margin-left: 0" :to="openLink(r)">{{ r.id }}</router-link>
          <span v-else class="adm-cell-text" style="font-weight: 600">{{ r.id }}</span>
          <span class="adm-cell-name">{{ customerName(r) }}</span>
          <span class="adm-cell-text">{{ date(r.issuedAt) }}</span>
          <span class="adm-cell-text">{{ date(r.dueAt) }}</span>
          <span class="adm-price adm-serif">{{ money(r.amount) }}</span>
          <span><span class="adm-badge is-flat" :class="statusClass(r.status)">{{ t.status[r.status] }}</span></span>
        </div>
      </div>
    </div>

    <InventoryPager v-if="!loading" :pager="pager" :t="t" @go="goToPage" />
  </div>
</template>
