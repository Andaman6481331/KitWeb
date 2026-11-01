<script setup>
// The left column of the New invoice page: the five-step checklist, the money summary
// with the internal margin, and the payment/stock note with "Mark as paid".
defineProps({
  t: { type: Object, required: true },
  checks: { type: Array, required: true }, // [{ key, state, label, detail }]
  pct: { type: Number, required: true },
  totals: { type: Object, required: true }, // computeInvoice() result
  status: { type: String, required: true },
  payNote: { type: String, required: true },
});
defineEmits(['mark-paid']);

const money = (n) => `฿${Number(n).toLocaleString('en-US')}`;
const icon = { ok: '✓', todo: '!', err: '✕' };
</script>

<template>
  <aside class="adm-inv-side">
    <section class="adm-inv-card is-small" :aria-label="t.invStatus">
      <h2 class="adm-serif">{{ t.invStatus }}</h2>
      <div class="adm-inv-progress">
        <div class="adm-inv-bar"><div :class="{ 'is-done': pct === 100 }" :style="{ width: pct + '%' }"></div></div>
        <b style="font-size: 13px">{{ pct }}%</b>
      </div>
      <div v-for="c in checks" :key="c.key" class="adm-inv-check" :class="'is-' + c.state">
        <span class="adm-inv-icon" aria-hidden="true">{{ icon[c.state] }}</span>
        <span><b>{{ c.label }}</b><small>{{ c.detail }}</small></span>
      </div>
    </section>

    <section class="adm-inv-card is-small" :aria-label="t.summary">
      <h2 class="adm-serif">{{ t.summary }}</h2>
      <div class="adm-inv-sum"><span>{{ t.subtotal }}</span><span>{{ money(totals.subtotal) }}</span></div>
      <div class="adm-inv-sum"><span>{{ t.discount }}</span><span>{{ totals.discount ? '−' + money(totals.discount) : money(0) }}</span></div>
      <div class="adm-inv-sum"><span>{{ t.shipping }}</span><span>{{ money(totals.shipping) }}</span></div>
      <div class="adm-inv-total"><b>{{ t.total }}</b><strong class="adm-serif">{{ money(totals.total) }}</strong></div>
      <div style="color: var(--adm-muted); font-size: 12px">{{ t.noVat }}</div>
      <div class="adm-inv-internal">
        <small>{{ t.internal }}</small>
        {{ t.margin }} <b>{{ money(totals.margin) }}</b> <span style="color: var(--adm-muted)">({{ totals.marginPct }}%)</span>
      </div>
    </section>

    <section class="adm-inv-card is-small" :aria-label="t.payStock">
      <h2 class="adm-serif">{{ t.payStock }}</h2>
      <p style="margin: 0 0 12px; color: var(--adm-muted-2); font-size: 13px">{{ payNote }}</p>
      <button type="button" class="adm-btn adm-btn-primary" style="width: 100%; justify-content: center" :disabled="status !== 'sent'" @click="$emit('mark-paid')">
        {{ status === 'paid' ? t.paidDone : t.markPaid }}
      </button>
    </section>
  </aside>
</template>
