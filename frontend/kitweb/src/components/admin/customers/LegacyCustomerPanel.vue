<script setup>
// Read-only details for one customer imported from the old Access database: the fields the
// Customers page has no column for, what they bought most, and their invoices.
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../../../services/api';

const props = defineProps({
  t: { type: Object, required: true },
  customerId: { type: String, required: true },
  isThai: { type: Boolean, default: false },
});
const emit = defineEmits(['close']);

const route = useRoute();
const routeLang = computed(() => route.params.lang || 'en');
const invoiceLink = (id) => ({ name: 'admin-legacy-invoice', params: { lang: routeLang.value, id } });

const data = ref(null);
const loading = ref(true);
const error = ref('');

const money = (n) => `฿${Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const qty = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 3 });
const date = (day) => new Date(`${day}T00:00:00+07:00`).toLocaleDateString(props.isThai ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const fields = computed(() => {
  const c = data.value?.customer;
  if (!c) return [];
  return [
    ['phone', c.phone], ['email', c.email], ['address', [c.address, c.province].filter(Boolean).join(' ')],
    ['taxId', c.tax_id], ['vatName', c.vat_name], ['branch', c.branch], ['transport', c.transport],
    ['lineNote', c.line_note], ['note', c.note],
  ].filter(([, value]) => value);
});

const onKey = (event) => { if (event.key === 'Escape') emit('close'); };
onMounted(async () => {
  document.addEventListener('keydown', onKey);
  try {
    data.value = await api.getLegacyCustomer(props.customerId);
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
});
onUnmounted(() => document.removeEventListener('keydown', onKey));
</script>

<template>
  <div class="adm-modal-back" @click.self="$emit('close')">
    <div role="dialog" aria-modal="true" :aria-label="t.detailsTitle" class="adm-modal is-legacy">
      <h2 class="adm-serif">
        {{ data ? data.customer.name : t.loading }}
        <span class="adm-badge is-flat is-legacy" style="vertical-align: middle">{{ t.badge }}</span>
      </h2>
      <p>{{ t.readOnly }}</p>

      <div v-if="loading" class="adm-skeleton" style="height: 160px" aria-busy="true"></div>
      <div v-else-if="error" class="adm-error" role="alert">{{ error }}</div>

      <template v-else>
        <dl class="adm-legacy-meta">
          <div v-for="[key, value] in fields" :key="key"><dt>{{ t[key] }}</dt><dd>{{ value }}</dd></div>
          <div><dt>{{ t.statusLabel }}</dt><dd>{{ t.recordStatus[data.customer.status] }}</dd></div>
        </dl>

        <h3>{{ t.topProducts }}</h3>
        <ul v-if="data.top_products.length" class="adm-legacy-list">
          <li v-for="p in data.top_products" :key="p.product_name + '|' + p.unit">
            <span>{{ p.product_name }}</span>
            <span class="adm-cell-dim">{{ qty(p.qty) }} {{ p.unit }} · {{ t.linesTimes(p.lines) }}</span>
          </li>
        </ul>
        <p v-else class="adm-cell-dim">{{ t.topProductsEmpty }}</p>

        <h3>{{ t.invoiceList }}</h3>
        <ul v-if="data.invoices.length" class="adm-legacy-list">
          <li v-for="i in data.invoices" :key="i.id">
            <router-link class="adm-card-link" style="margin-left: 0" :to="invoiceLink(i.id)">{{ t.invoiceTitle(i.order_no) }} · {{ date(i.sold_on) }}</router-link>
            <span>{{ money(i.total) }} · {{ i.paid ? t.paid : t.unpaid }}</span>
          </li>
        </ul>
        <p v-else class="adm-cell-dim">{{ t.invoiceListEmpty }}</p>
      </template>

      <div class="adm-modal-actions" style="margin-top: 18px">
        <button type="button" class="adm-btn" @click="$emit('close')">{{ t.close }}</button>
      </div>
    </div>
  </div>
</template>
