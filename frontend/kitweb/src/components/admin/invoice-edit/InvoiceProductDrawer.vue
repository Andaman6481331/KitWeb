<script setup>
// The "Add products" drawer: search the catalogue and tap Add. Each tap adds one piece
// (or one more of a product already on the invoice). Prices are shown at the selected
// customer's level, so staff can see what they are about to charge.
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { priceAt, stockState } from '../../../utils/adminInvoiceEdit';

const props = defineProps({
  t: { type: Object, required: true },
  variants: { type: Array, required: true },
  lines: { type: Array, required: true }, // [{ variantId, qty }]
  customer: { type: Object, default: null },
  levelNames: { type: Array, required: true },
  isThai: { type: Boolean, default: false },
});
const emit = defineEmits(['add', 'close']);

const query = ref('');
const search = ref(null);
const level = computed(() => (props.customer ? props.customer.level : 0));
const money = (n) => `฿${Number(n).toLocaleString('en-US')}`;
const name = (v) => (props.isThai ? v.nameTh : v.name);
const label = (v) => (props.isThai ? `${v.sizeTh} · ${v.colorTh}` : `${v.size} · ${v.color}`);

const shown = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return props.variants;
  return props.variants.filter((v) => `${v.name} ${v.nameTh} ${v.sku} ${v.color} ${v.colorTh} ${v.size}`.toLowerCase().includes(q));
});
const onLine = (v) => props.lines.find((l) => l.variantId === v.id) || null;
const stockText = (v) => {
  const s = stockState(v, 0);
  if (s === 'out') return props.t.stockLabel.out;
  return s === 'low' ? props.t.stockLabel.low(v.stock) : props.t.stockLabel.ok(v.stock);
};
const addText = (v) => {
  const line = onLine(v);
  return line ? props.t.addedN(parseInt(line.qty, 10) || 0) : props.t.add;
};
const hintText = computed(() => (props.customer
  ? props.t.drawerHintFor(props.isThai ? props.customer.nameTh : props.customer.name, props.levelNames[level.value])
  : props.t.drawerHintNone));

const onKey = (event) => { if (event.key === 'Escape') emit('close'); };
onMounted(() => {
  search.value?.focus();
  document.addEventListener('keydown', onKey);
});
onUnmounted(() => document.removeEventListener('keydown', onKey));
</script>

<template>
  <div class="adm-inv-drawer">
    <div class="adm-inv-drawer-back" @click="emit('close')"></div>
    <div class="adm-inv-drawer-panel" role="dialog" aria-modal="true" :aria-label="t.addProductsT">
      <div class="adm-inv-drawer-head">
        <div class="adm-inv-row" style="justify-content: space-between; align-items: center; flex-wrap: nowrap">
          <h2 class="adm-serif" style="margin: 0; font-size: 20px">{{ t.addProductsT }}</h2>
          <button type="button" class="adm-ibtn" :aria-label="t.close" @click="emit('close')">×</button>
        </div>
        <div style="color: var(--adm-muted); font-size: 12.5px; margin: 2px 0 12px">{{ hintText }}</div>
        <input ref="search" v-model="query" class="adm-inv-field" type="search" :aria-label="t.searchProducts" :placeholder="t.searchProducts" />
      </div>
      <div class="adm-inv-drawer-list">
        <div v-for="v in shown" :key="v.id" class="adm-inv-pick">
          <span class="adm-inv-dot" :style="{ background: v.hex, width: '28px', height: '28px', borderRadius: '8px' }"></span>
          <div style="flex: 1; min-width: 0">
            <div style="font-weight: 600; line-height: 1.3">{{ name(v) }}</div>
            <div style="color: var(--adm-muted); font-size: 12px">{{ label(v) }} · {{ v.sku }}</div>
            <div class="adm-inv-stock" :class="{ 'is-low': stockState(v, 0) === 'low', 'is-out': stockState(v, 0) === 'out' }">{{ stockText(v) }}</div>
          </div>
          <div style="text-align: right">
            <div style="font-weight: 600">{{ money(priceAt(v, level)) }}</div>
            <div style="color: var(--adm-muted); font-size: 11px">{{ levelNames[level] }}</div>
          </div>
          <button type="button" class="adm-btn" style="min-width: 84px; justify-content: center" :class="{ 'is-added': onLine(v) }" @click="emit('add', v.id)">{{ addText(v) }}</button>
        </div>
        <div v-if="shown.length === 0" style="padding: 40px; text-align: center; color: var(--adm-muted)">{{ t.noMatch(query) }}</div>
      </div>
      <div class="adm-inv-drawer-foot">
        <span style="color: var(--adm-muted-2); font-size: 13px">{{ t.drawerCount(lines.length) }}</span>
        <div style="flex: 1"></div>
        <button type="button" class="adm-btn adm-btn-primary" @click="emit('close')">{{ t.done }}</button>
      </div>
    </div>
  </div>
</template>
