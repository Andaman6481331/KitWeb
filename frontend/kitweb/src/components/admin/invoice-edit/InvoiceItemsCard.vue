<script setup>
// The line-item table. Each line shows which price level applied and why, lets staff
// type a price by hand (marked "Edited", with a reset), and warns about low stock and
// prices below cost. All the numbers come from computeInvoice(); this only draws them.
import { upsellHint } from '../../../utils/adminInvoiceEdit';

const props = defineProps({
  t: { type: Object, required: true },
  lines: { type: Array, required: true }, // computeInvoice().lines
  levelNames: { type: Array, required: true },
  locked: { type: Boolean, default: false },
  hasCustomer: { type: Boolean, default: false },
  isThai: { type: Boolean, default: false },
});
const emit = defineEmits(['open-drawer', 'set-qty', 'set-price', 'reset-price', 'remove']);

const money = (n) => `฿${Number(n).toLocaleString('en-US')}`;
const name = (v) => (props.isThai ? v.nameTh : v.name);
const label = (v) => (props.isThai ? `${v.sizeTh} · ${v.colorTh}` : `${v.size} · ${v.color}`);

const levelTitle = (l) => (l.edited ? props.t.customPrice : props.levelNames[l.level]);
const why = (l) => {
  if (l.edited) return props.t.why.custom;
  if (l.unlockedByQty) return props.t.why.byQty(l.variant.moq[l.level]);
  return props.hasCustomer ? props.t.why.customer : props.t.why.none;
};
const hint = (l) => {
  if (l.edited) return '';
  const next = upsellHint(l.variant, l.qty, l.level);
  return next ? props.t.hint(next.more, props.levelNames[next.level], money(next.price)) : '';
};
const stockWarn = (l) => {
  if (l.stock === 'out') return props.t.stockOut;
  if (l.stock === 'over') return props.t.stockOnly(l.variant.stock);
  return '';
};
const priceValue = (l) => (l.edited ? l.override : String(l.auto));
const digits = (event) => event.target.value.replace(/[^0-9]/g, '');
</script>

<template>
  <section class="adm-inv-card">
    <div class="adm-inv-row" style="justify-content: space-between; align-items: center">
      <h2 class="adm-serif">{{ t.items }}</h2>
      <button type="button" class="adm-btn adm-btn-primary" :disabled="locked" @click="emit('open-drawer')">{{ t.addProducts }}</button>
    </div>
    <p class="adm-inv-sub">{{ t.itemsSub }}</p>

    <div v-if="lines.length === 0" class="adm-inv-empty">{{ t.noItems }}</div>

    <div v-else class="adm-inv-lines">
      <div>
        <div class="adm-inv-line is-head">
          <span>{{ t.hProduct }}</span><span>{{ t.hLevel }}</span><span class="r">{{ t.hUnit }}</span><span class="r">{{ t.hQty }}</span><span class="r">{{ t.hTotal }}</span><span></span>
        </div>
        <div v-for="l in lines" :key="l.key" class="adm-inv-line">
          <div style="min-width: 0">
            <div style="font-weight: 600; line-height: 1.3">{{ name(l.variant) }}</div>
            <div class="adm-inv-variant"><span class="adm-inv-dot" :style="{ background: l.variant.hex }"></span>{{ label(l.variant) }} · {{ l.variant.sku }}</div>
            <div v-if="stockWarn(l)" class="adm-inv-warn" :class="{ 'is-out': l.stock === 'out' }">{{ stockWarn(l) }}</div>
          </div>
          <div>
            <div style="font-weight: 600; font-size: 13px">{{ levelTitle(l) }}</div>
            <div style="color: var(--adm-muted); font-size: 12px">{{ why(l) }}</div>
            <div v-if="hint(l)" class="adm-inv-hint">{{ hint(l) }}</div>
          </div>
          <div>
            <input
              class="adm-inv-field is-num"
              :class="{ 'is-edited': l.edited }"
              inputmode="decimal"
              :aria-label="t.unitAria"
              :value="priceValue(l)"
              :disabled="locked"
              @input="emit('set-price', l.key, $event.target.value)"
            />
            <button v-if="l.edited" type="button" class="adm-inv-reset" :disabled="locked" @click="emit('reset-price', l.key)">{{ t.editedReset }}</button>
            <div v-if="l.belowCost" class="adm-inv-below">{{ t.belowCost(money(l.variant.cost)) }}</div>
          </div>
          <input
            class="adm-inv-field is-num"
            inputmode="numeric"
            :aria-label="t.qtyAria"
            :value="l.qtyText"
            :disabled="locked"
            @input="emit('set-qty', l.key, digits($event))"
          />
          <div class="r" style="font-weight: 600; padding-top: 11px">{{ money(l.total) }}</div>
          <button type="button" class="adm-inv-x" :aria-label="t.removeItem" :title="t.removeItem" :disabled="locked" @click="emit('remove', l.key)">×</button>
        </div>
      </div>
    </div>
  </section>
</template>
