<script setup>
// The two things a customer must know before reading any number on the site:
// listed prices are partly out of date, and delivery is never in the total (we
// quote the carrier's real cost afterwards, with no markup). One component so the
// wording is identical in the cart, the thank-you page, the tracking detail and
// the catalog.
defineProps({
  // 'both' | 'prices' | 'delivery'
  kind: { type: String, default: 'both' },
  // A plain muted line instead of a boxed note — for the catalog and product pages.
  inline: { type: Boolean, default: false },
})
</script>

<template>
  <div class="pn" :class="{ 'pn-inline': inline }" role="note">
    <svg v-if="!inline" class="pn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
    <p class="pn-text">
      <template v-if="inline">{{ $t('priceNotice.short') }}</template>
      <template v-else>
        <span v-if="kind !== 'delivery'">{{ $t('priceNotice.prices') }}</span>
        <template v-if="kind === 'both'">{{ ' ' }}</template>
        <span v-if="kind !== 'prices'">{{ $t('priceNotice.delivery') }}</span>
      </template>
    </p>
  </div>
</template>

<style scoped>
.pn {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 11px 13px;
  background: #FFF8EC;
  border: 1px solid #F0DDB0;
  border-radius: 12px;
  color: #7A5200;
}

.pn-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.pn-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
}

.pn-inline {
  padding: 0;
  background: none;
  border: none;
  color: #8C7B6E;
}

.pn-inline .pn-text {
  font-size: 13px;
}
</style>
