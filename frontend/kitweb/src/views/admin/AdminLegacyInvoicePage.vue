<script setup>
// One imported Access invoice, read-only: every line exactly as it was typed in the old
// database (name, unit, quantity, price), tagged Legacy. It never opens the New invoice editor.
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAdminLang } from '../../composables/useAdminLang';
import { api } from '../../services/api';
import { legacyText } from '../../utils/adminLegacyText';

const { lang, isThai, setLang } = useAdminLang();
const t = computed(() => legacyText(lang.value));
const route = useRoute();
const routeLang = computed(() => route.params.lang || 'en');
const backLink = computed(() => ({ name: 'admin-invoices', params: { lang: routeLang.value } }));

const data = ref(null);
const loading = ref(true);
const error = ref('');

const money = (n) => `฿${Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const qty = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 3 });
const date = (day) => new Date(`${day}T00:00:00+07:00`).toLocaleDateString(isThai.value ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

onMounted(async () => {
  try {
    data.value = await api.getLegacyInvoice(String(route.params.id));
  } catch (err) {
    error.value = /not found/i.test(err.message) ? t.value.notFound : err.message;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="adm-page">
    <div class="adm-head">
      <div class="adm-head-text">
        <router-link class="adm-card-link" style="margin-left: 0" :to="backLink">{{ t.back }}</router-link>
        <h1 class="adm-title adm-serif">
          {{ data ? t.invoiceTitle(data.invoice.order_no) : t.loading }}
          <span v-if="data" class="adm-badge is-flat is-legacy" style="vertical-align: middle">{{ t.badge }}</span>
        </h1>
        <div class="adm-sub">{{ t.readOnly }}</div>
      </div>
      <div class="adm-actions">
        <div role="group" aria-label="Language" class="adm-seg">
          <button type="button" class="adm-seg-btn is-lang" :class="{ 'is-on': !isThai }" :aria-pressed="!isThai" @click="setLang('en')">EN</button>
          <button type="button" class="adm-seg-btn is-lang" :class="{ 'is-on': isThai }" :aria-pressed="isThai" @click="setLang('th')">ไทย</button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="adm-skeleton" style="height: 240px" aria-busy="true"></div>
    <div v-else-if="error" class="adm-error" role="alert">{{ error }}</div>

    <template v-else>
      <dl class="adm-legacy-meta">
        <div>
          <dt>{{ t.customer }}</dt>
          <dd>{{ data.invoice.customer_name }}</dd>
          <dd v-if="!data.invoice.customer_id" class="adm-cell-dim" style="font-size: 12px">{{ t.unmatched }}</dd>
        </div>
        <div><dt>{{ t.date }}</dt><dd>{{ date(data.invoice.sold_on) }}</dd></div>
        <div>
          <dt>{{ t.status }}</dt>
          <dd><span class="adm-badge is-flat" :class="data.invoice.paid ? 'is-ok' : 'is-danger'">{{ data.invoice.paid ? t.paid : t.unpaid }}</span></dd>
        </div>
        <div v-if="data.invoice.access_type"><dt>{{ t.type }}</dt><dd>{{ data.invoice.access_type }}</dd></div>
        <div v-if="data.invoice.vat_bill_no"><dt>{{ t.vatBill }}</dt><dd>{{ data.invoice.vat_bill_no }}</dd></div>
        <div><dt>{{ t.lines(data.lines.length) }}</dt><dd class="adm-serif" style="font-size: 20px; font-weight: 700">{{ money(data.invoice.total) }}</dd></div>
      </dl>

      <div class="adm-table-wrap">
        <div class="adm-table is-lines">
          <div class="adm-tr is-legacy-lines is-head">
            <span>{{ t.hProduct }}</span><span>{{ t.hUnit }}</span><span>{{ t.hQty }}</span><span>{{ t.hPrice }}</span><span>{{ t.hTotal }}</span>
          </div>
          <div
            v-for="l in data.lines"
            :key="l.id"
            class="adm-tr is-legacy-lines is-row"
            :class="{ 'is-adjust': l.line_kind === 'adjustment' }"
          >
            <div style="min-width: 0">
              <div class="adm-cell-name">{{ l.product_name }}</div>
              <div v-if="l.group_name" class="adm-cell-file">{{ l.group_name }}</div>
              <span v-if="l.line_kind === 'adjustment'" class="adm-badge is-flat is-hidden">{{ t.adjustment }}</span>
            </div>
            <span class="adm-cell-text">{{ l.unit || '—' }}</span>
            <span class="adm-cell-text">{{ qty(l.qty) }}</span>
            <span class="adm-cell-text">{{ money(l.unit_price) }}</span>
            <span class="adm-price adm-serif">{{ money(l.line_total) }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
