<script setup>
import { computed } from 'vue'
import { formatBaht } from '../utils/orderView'

// Money for an order, in one place: items, delivery, and the amount to pay once
// both are known. Delivery is quoted by staff after the customer confirms, so
// until then it reads "we'll quote it" rather than a number that looks final.
const props = defineProps({
  // Items subtotal in baht; null when an unpriced quote has no total yet.
  itemsTotal: { type: Number, default: null },
  // Quoted delivery in baht; null = not quoted yet, 0 = no charge.
  deliveryFee: { type: Number, default: null },
})

const grandTotal = computed(() =>
  props.itemsTotal !== null && props.deliveryFee !== null ? props.itemsTotal + props.deliveryFee : null
)
</script>

<template>
  <dl class="ot">
    <div class="ot-row">
      <dt>{{ $t('orderTotals.itemsSubtotal') }}</dt>
      <dd v-if="itemsTotal !== null">{{ formatBaht(itemsTotal) }}</dd>
      <dd v-else class="ot-muted">{{ $t('orderTotals.itemsPending') }}</dd>
    </div>

    <div class="ot-row">
      <dt>{{ $t('orderTotals.delivery') }}</dt>
      <dd v-if="deliveryFee === null" class="ot-muted">{{ $t('orderTotals.deliveryPending') }}</dd>
      <dd v-else-if="deliveryFee === 0">{{ $t('orderTotals.deliveryFree') }}</dd>
      <dd v-else>{{ formatBaht(deliveryFee) }}</dd>
    </div>

    <div class="ot-row ot-total">
      <dt>{{ $t('orderTotals.amountToPay') }}</dt>
      <dd v-if="grandTotal !== null" class="ot-amount">{{ formatBaht(grandTotal) }}</dd>
      <dd v-else class="ot-muted ot-pending">{{ $t('orderTotals.amountPending') }}</dd>
    </div>
  </dl>
</template>

<style scoped>
.ot {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 14px;
}

.ot-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
}

.ot-row dt {
  color: #8C7B6E;
  flex-shrink: 0;
}

.ot-row dd {
  margin: 0;
  text-align: right;
  font-weight: 600;
  color: #3D2B1F;
  overflow-wrap: anywhere;
}

.ot-muted {
  font-weight: 500 !important;
  color: #8C7B6E !important;
  font-size: 13px;
}

.ot-total {
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px dashed #E6E0D9;
}

.ot-total dt {
  color: #3D2B1F;
  font-weight: 700;
}

.ot-amount {
  font-size: 18px;
  color: #3D2B1F;
}

.ot-pending {
  max-width: 62%;
  line-height: 1.4;
}
</style>
