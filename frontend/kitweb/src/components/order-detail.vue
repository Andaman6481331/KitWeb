<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import OrderProgress from './order-progress.vue'
import OrderConfirmActions from './order-confirm-actions.vue'
import OrderTotals from './order-totals.vue'
import PriceNotice from './price-notice.vue'
import { formatBaht, isAwaitingCustomer, nextStepKey, orderStage, orderStateKey, parseDbDate } from '../utils/orderView'

// One order, as the customer should see it: where it is, what happens next, what
// it contains and what it costs. Used by Track Orders for logged-in customers and
// for a guest's lookup alike, so both read the same.
const props = defineProps({
  // An OrderView (see utils/orderView.js)
  order: { type: Object, required: true },
})

const { t, locale } = useI18n()

const state = computed(() => orderStateKey(props.order))
const awaiting = computed(() => isAwaitingCustomer(props.order))
const cancelled = computed(() => state.value === 'cancelled')
const nextKey = computed(() => nextStepKey(props.order))

const placedOn = computed(() => {
  const d = parseDbDate(props.order.created_at)
  if (!d) return ''
  const tag = { th: 'th-TH', ja: 'ja-JP', zh: 'zh-CN' }[locale.value] || 'en-GB'
  return d.toLocaleDateString(tag, { day: 'numeric', month: 'short', year: 'numeric' })
})

// The compact rail shows dots only; this names the step the order is on.
const STAGE_KEYS = { 3: 'confirm', 4: 'finish' }
const stageLabelKey = computed(() => `orderSteps.${STAGE_KEYS[orderStage(props.order)]}`)

const lineTotal = (item) =>
  item.price === null ? null : item.price * item.quantity
</script>

<template>
  <section class="od">
    <header class="od-head">
      <div class="od-head-text">
        <span class="od-label">{{ $t('order.orderNumber') }}</span>
        <span class="od-id">{{ order.id }}</span>
        <span v-if="placedOn" class="od-date">{{ $t('orderDetail.placedOn', { date: placedOn }) }}</span>
      </div>
      <span class="od-state" :class="`is-${state}`">{{ $t(`orderDetail.state.${state}`) }}</span>
    </header>

    <div v-if="!cancelled" class="od-stage">
      <OrderProgress :current="orderStage(order)" compact />
      <p class="od-stage-label">{{ $t(stageLabelKey) }}</p>
    </div>

    <!-- Waiting on the customer: the one thing they can act on. -->
    <OrderConfirmActions v-if="awaiting" :order-id="order.id" compact />
    <p v-else class="od-next">{{ $t(`orderDetail.next.${nextKey}`) }}</p>

    <p v-if="order.tracking_number" class="od-tracking">
      <span>{{ $t('orderDetail.tracking') }}</span>
      <strong>{{ order.tracking_number }}</strong>
    </p>

    <h3 class="od-section">{{ $t('orderDetail.items') }}</h3>
    <ul v-if="order.items.length" class="od-items">
      <li v-for="(item, i) in order.items" :key="i" class="od-item">
        <div class="od-item-main">
          <span class="od-item-name">{{ item.product_name }}</span>
          <span class="od-item-meta">
            <template v-if="item.size || item.color">{{ [item.size, item.color].filter(Boolean).join(' / ') }} · </template>×{{ item.quantity }}
          </span>
        </div>
        <span v-if="lineTotal(item) !== null" class="od-item-total">{{ formatBaht(lineTotal(item)) }}</span>
        <span v-else class="od-item-total od-muted">{{ $t('orderTotals.itemsPending') }}</span>
      </li>
    </ul>
    <p v-else class="od-muted">{{ $t('orderDetail.noItems') }}</p>

    <OrderTotals :items-total="order.items_total" :delivery-fee="order.delivery_fee" class="od-totals" />

    <PriceNotice class="od-notice" />
  </section>
</template>

<style scoped>
.od {
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: #3D2B1F;
  font-family: 'Work Sans', sans-serif;
}

.od-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px 12px;
}

.od-head-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.od-stage {
  margin-top: -2px;
}

.od-stage-label {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #3D2B1F;
}

.od-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: #8C7B6E;
}

.od-id {
  font-family: 'Crimson Pro', serif;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
  user-select: all;
  white-space: nowrap;
}

.od-date {
  margin-top: 2px;
  font-size: 13px;
  color: #8C7B6E;
}

.od-state {
  flex-shrink: 0;
  padding: 4px 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  background: #FFF3D6;
  border: 1px solid #F2D58A;
  color: #8A5A00;
}

.od-state.is-confirmed,
.od-state.is-paid,
.od-state.is-shipped,
.od-state.is-delivered {
  background: #EAF4EC;
  border-color: #BFDCC5;
  color: #2F6B3C;
}

.od-state.is-cancelled {
  background: #F3EEE9;
  border-color: #E6E0D9;
  color: #8C7B6E;
}

.od-next {
  margin: 0;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid #EAE1D7;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.55;
}

.od-tracking {
  margin: 0;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 14px;
  color: #8C7B6E;
}

.od-tracking strong {
  color: #3D2B1F;
  user-select: all;
}

.od-section {
  margin: 4px 0 -4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: #8C7B6E;
}

.od-items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.od-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #EAE1D7;
}

.od-item:last-child {
  border-bottom: none;
}

.od-item-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.od-item-name {
  font-size: 14px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.od-item-meta {
  font-size: 13px;
  color: #8C7B6E;
}

.od-item-total {
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 600;
}

.od-muted {
  color: #8C7B6E;
  font-weight: 500;
  font-size: 13px;
}
</style>
