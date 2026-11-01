<script setup>
// New invoice / open a saved invoice, from the New invoice design. UI only: customers
// come from useCustomers(), products from useInvoiceCatalog() and saved invoices go to
// useInvoices(), all placeholder sources today (kept in memory, lost on reload). Nothing
// here reads or writes the database. The sums live in utils/adminInvoiceEdit.js.
import { reactive, ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAdminLang } from '../../composables/useAdminLang';
import { useCustomers } from '../../composables/useCustomers';
import { useInvoices } from '../../composables/useInvoices';
import { useInvoiceCatalog } from '../../composables/useInvoiceCatalog';
import { invoiceEditText } from '../../utils/adminInvoiceText';
import {
  LEVEL_NAMES, computeInvoice, invoiceChecks, canSend, dueDate, todayIso,
} from '../../utils/adminInvoiceEdit';
import InvoiceSidebar from '../../components/admin/invoice-edit/InvoiceSidebar.vue';
import InvoiceCustomerCard from '../../components/admin/invoice-edit/InvoiceCustomerCard.vue';
import InvoiceItemsCard from '../../components/admin/invoice-edit/InvoiceItemsCard.vue';
import InvoiceProductDrawer from '../../components/admin/invoice-edit/InvoiceProductDrawer.vue';

const route = useRoute();
const router = useRouter();
const routeLang = computed(() => route.params.lang || 'en');

const { lang, isThai, setLang } = useAdminLang();
const t = computed(() => invoiceEditText(lang.value));
const levelNames = computed(() => LEVEL_NAMES[lang.value]);

const { customers, load: loadCustomers } = useCustomers();
const { variants, variantsById, isPlaceholder } = useInvoiceCatalog();
const { findInvoice, saveInvoice, nextNumber } = useInvoices();

const number = ref('');
const issued = ref(todayIso());
// The moment the invoice was started, so the list orders it correctly against others from the same day.
const issuedAtMs = ref(Date.now());
const notFound = ref(false);
const drawer = ref(false);
const toast = ref('');
let toastTimer = null;

const form = reactive({
  customerId: '', terms: '7', discount: '0', shipping: '0', notes: '',
  lines: [], nextKey: 1, status: 'draft',
});

const locked = computed(() => form.status !== 'draft');
const customer = computed(() => customers.value.find((c) => c.id === form.customerId) || null);
const customerName = computed(() => (customer.value ? (isThai.value ? customer.value.nameTh : customer.value.name) : ''));
const due = computed(() => dueDate(issued.value, Number(form.terms) || 0));

const totals = computed(() => computeInvoice({
  lines: form.lines,
  variants: variantsById,
  customerLevel: customer.value ? customer.value.level : 0,
  discount: form.discount,
  shipping: form.shipping,
}));

const checkInput = computed(() => ({ hasCustomer: !!customer.value, lineCount: form.lines.length, counts: totals.value.counts }));
const checks = computed(() => invoiceChecks(checkInput.value).map((c) => {
  const text = t.value.checks[c.key];
  let detail = text[c.state];
  if (c.key === 'customer' && c.state === 'ok') detail = text.ok(customerName.value, levelNames.value[customer.value.level]);
  else if (typeof detail === 'function') detail = detail(c.n);
  return { key: c.key, state: c.state, label: text.label, detail };
}));
const pct = computed(() => Math.round((checks.value.filter((c) => c.state === 'ok').length / checks.value.length) * 100));
const sendOff = computed(() => !canSend(checkInput.value));

const payNote = computed(() => {
  const n = form.lines.length;
  if (form.status === 'draft') return t.value.payNote.draft;
  return form.status === 'sent' ? t.value.payNote.sent(n) : t.value.payNote.paid(n);
});

const showDate = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(
  isThai.value ? 'th-TH' : 'en-GB',
  { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' },
);

const flash = (message) => {
  toast.value = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.value = ''; }, 5000);
};

// ── lines ────────────────────────────────────────────────
const patchLine = (key, change) => {
  const at = form.lines.findIndex((l) => l.key === key);
  if (at >= 0) form.lines.splice(at, 1, { ...form.lines[at], ...change });
};
const addVariant = (variantId) => {
  const existing = form.lines.find((l) => l.variantId === variantId);
  if (existing) patchLine(existing.key, { qty: String((parseInt(existing.qty, 10) || 0) + 1) });
  else { form.lines.push({ key: form.nextKey, variantId, qty: '1', override: null }); form.nextKey += 1; }
};
const setQty = (key, text) => patchLine(key, { qty: text });
const setPrice = (key, text) => patchLine(key, { override: text === '' ? null : text });
const resetPrice = (key) => patchLine(key, { override: null });
const removeLine = (key) => { form.lines = form.lines.filter((l) => l.key !== key); };
const onMoney = (field) => (event) => { form[field] = event.target.value.replace(/[^0-9.]/g, ''); };

// ── saving (in memory only) ──────────────────────────────
const toRecord = (status) => ({
  id: number.value,
  customer: customer.value ? customer.value.name : '—',
  customerTh: customer.value ? customer.value.nameTh : '—',
  status,
  amount: totals.value.total,
  issuedAt: issuedAtMs.value,
  dueAt: Date.parse(`${due.value}T00:00:00Z`),
  draft: {
    customerId: form.customerId, terms: form.terms, discount: form.discount, shipping: form.shipping,
    notes: form.notes, lines: JSON.parse(JSON.stringify(form.lines)), nextKey: form.nextKey, issued: issued.value,
  },
});

const saveDraft = () => {
  saveInvoice(toRecord('draft'));
  flash(t.value.toast.draft(number.value));
};
const send = () => {
  if (sendOff.value) return;
  form.status = 'sent';
  saveInvoice(toRecord('sent'));
  flash(t.value.toast.sent(number.value, customerName.value));
};
const markPaid = () => {
  if (form.status !== 'sent') return;
  form.status = 'paid';
  saveInvoice(toRecord('paid'));
  flash(t.value.toast.paid(form.lines.length));
};

const listLink = computed(() => ({ name: 'admin-invoices', params: { lang: routeLang.value } }));
const customersLink = computed(() => ({ name: 'admin-customers', params: { lang: routeLang.value } }));
const statusClass = computed(() => ({ draft: 'is-hidden', sent: '', paid: 'is-ok' }[form.status]));

onMounted(async () => {
  await loadCustomers();
  if (route.params.number) {
    const saved = findInvoice(String(route.params.number));
    if (!saved) { notFound.value = true; return; }
    number.value = saved.id;
    form.status = saved.status;
    Object.assign(form, {
      customerId: saved.draft.customerId, terms: saved.draft.terms, discount: saved.draft.discount,
      shipping: saved.draft.shipping, notes: saved.draft.notes, nextKey: saved.draft.nextKey,
      lines: JSON.parse(JSON.stringify(saved.draft.lines)),
    });
    issued.value = saved.draft.issued;
    issuedAtMs.value = saved.issuedAt;
    return;
  }
  number.value = nextNumber();
  const wanted = String(route.query.customer || '');
  if (customers.value.some((c) => c.id === wanted)) form.customerId = wanted;
});
onUnmounted(() => clearTimeout(toastTimer));

const goBack = () => router.push(listLink.value);
</script>

<template>
  <div class="adm-page">
    <div class="adm-inv-top">
      <router-link class="adm-btn" :to="listLink">{{ t.back }}</router-link>
      <div class="adm-inv-crumb">{{ t.crumb }} <b>{{ number || t.newInvoice }}</b></div>
      <span v-if="!notFound" class="adm-badge is-flat" :class="statusClass">{{ t.status[form.status] }}</span>
      <div style="flex: 1"></div>
      <div role="group" aria-label="Language" class="adm-seg">
        <button type="button" class="adm-seg-btn is-lang" :class="{ 'is-on': !isThai }" :aria-pressed="!isThai" @click="setLang('en')">EN</button>
        <button type="button" class="adm-seg-btn is-lang" :class="{ 'is-on': isThai }" :aria-pressed="isThai" @click="setLang('th')">ไทย</button>
      </div>
    </div>

    <div v-if="isPlaceholder" class="adm-banner" role="note">{{ t.preview }}</div>

    <div v-if="notFound" class="adm-empty">
      <div class="adm-empty-title adm-serif">{{ t.notFound }}</div>
      <router-link class="adm-btn adm-btn-link" style="margin-top: 8px" :to="listLink">{{ t.backToInvoices }}</router-link>
    </div>

    <template v-else>
      <div class="adm-inv-body">
        <InvoiceSidebar
          :t="t"
          :checks="checks"
          :pct="pct"
          :totals="totals"
          :status="form.status"
          :pay-note="payNote"
          @mark-paid="markPaid"
        />

        <main class="adm-inv-main">
          <InvoiceCustomerCard
            v-model:customer-id="form.customerId"
            :t="t"
            :customers="customers"
            :customer="customer"
            :level-names="levelNames"
            :locked="locked"
            :is-thai="isThai"
            :browse-to="customersLink"
          />

          <section class="adm-inv-card">
            <h2 class="adm-serif">{{ t.details }}</h2>
            <p class="adm-inv-sub">{{ t.detailsSub }}</p>
            <div class="adm-inv-grid">
              <div><label class="adm-inv-lab" for="inv-no">{{ t.invNo }}</label><input id="inv-no" class="adm-inv-field" :value="number" disabled /></div>
              <div><label class="adm-inv-lab" for="inv-issued">{{ t.issueDate }}</label><input id="inv-issued" class="adm-inv-field" :value="showDate(issued)" disabled /></div>
              <div>
                <label class="adm-inv-lab" for="inv-terms">{{ t.terms }}</label>
                <select id="inv-terms" v-model="form.terms" class="adm-inv-field" :disabled="locked">
                  <option v-for="(label, days) in t.termOptions" :key="days" :value="String(days)">{{ label }}</option>
                </select>
              </div>
              <div><label class="adm-inv-lab" for="inv-due">{{ t.dueDate }}</label><input id="inv-due" class="adm-inv-field" :value="showDate(due)" disabled /></div>
            </div>
          </section>

          <InvoiceItemsCard
            :t="t"
            :lines="totals.lines"
            :level-names="levelNames"
            :locked="locked"
            :has-customer="!!customer"
            :is-thai="isThai"
            @open-drawer="drawer = true"
            @set-qty="setQty"
            @set-price="setPrice"
            @reset-price="resetPrice"
            @remove="removeLine"
          />

          <section class="adm-inv-card">
            <h2 class="adm-serif">{{ t.extras }}</h2>
            <p class="adm-inv-sub">{{ t.extrasSub }}</p>
            <div class="adm-inv-pair">
              <div>
                <label class="adm-inv-lab" for="inv-disc">{{ t.discountB }}</label>
                <input id="inv-disc" class="adm-inv-field is-num" inputmode="decimal" :value="form.discount" :disabled="locked" @input="onMoney('discount')($event)" />
              </div>
              <div>
                <label class="adm-inv-lab" for="inv-ship">{{ t.shippingB }}</label>
                <input id="inv-ship" class="adm-inv-field is-num" inputmode="decimal" :value="form.shipping" :disabled="locked" @input="onMoney('shipping')($event)" />
              </div>
            </div>
            <label class="adm-inv-lab" for="inv-notes">{{ t.noteTo }} <span style="font-weight: 400; color: var(--adm-muted); font-size: 11px">{{ t.optional }}</span></label>
            <textarea id="inv-notes" v-model="form.notes" class="adm-inv-field" :placeholder="t.notePh" :disabled="locked"></textarea>
          </section>
        </main>
      </div>

      <div class="adm-inv-foot">
        <button type="button" class="adm-btn" @click="goBack">{{ locked ? t.backToInvoices : t.cancel }}</button>
        <div class="grow"></div>
        <template v-if="!locked">
          <button type="button" class="adm-btn" @click="saveDraft">{{ t.saveDraft }}</button>
          <button type="button" class="adm-btn adm-btn-primary" :disabled="sendOff" @click="send">{{ t.saveSend }}</button>
        </template>
      </div>
    </template>

    <InvoiceProductDrawer
      v-if="drawer"
      :t="t"
      :variants="variants"
      :lines="form.lines"
      :customer="customer"
      :level-names="levelNames"
      :is-thai="isThai"
      @add="addVariant"
      @close="drawer = false"
    />

    <div v-if="toast" class="adm-toast" role="status" style="bottom: 84px">{{ toast }}</div>
  </div>
</template>
