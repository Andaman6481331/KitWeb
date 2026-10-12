<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { authStore } from '../stores/authStore'
import { api } from '../services/api'
import { LINE_OA_URL } from '../utils/orderConfirmation'
import OrderConfirmActions from '../components/order-confirm-actions.vue'
import OrderProgress from '../components/order-progress.vue'
import OrderTotals from '../components/order-totals.vue'
import PriceNotice from '../components/price-notice.vue'
import { isAwaitingCustomer, nextStepKey, orderStateKey } from '../utils/orderView'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const orderId = computed(() => route.query.orderId || '')
// The private half of the order link. Without it (an old bookmark) the page can
// still show the confirm card, it just can't know the order's live state.
const viewKey = computed(() => String(route.query.key || ''))

// The order as the server sees it. Null until the first lookup lands, in which case
// the page behaves as "still waiting" — the state every new order starts in.
const order = ref(null)

const customerName = computed(
  () => order.value?.customer_name || route.query.name
    || authStore.user?.businessName || authStore.user?.ownerName || ''
)
const currentLang = computed(() => route.params.lang || 'th')
// Set by OrderPage from the server's own answer — a quote has no agreed total,
// so it must not be confirmed with the usual "we'll ship shortly" copy.
const isQuote = computed(() => order.value ? order.value.is_quote : route.query.quote === '1')

// Once the customer's LINE message has been matched, this page stops asking them
// to do anything and says what we are doing instead.
const confirmed = computed(() => !!order.value && !isAwaitingCustomer(order.value))
const stateKey = computed(() => order.value ? orderStateKey(order.value) : 'awaiting')
const nextKey = computed(() => order.value ? nextStepKey(order.value) : 'awaiting')

const loadOrder = async () => {
  if (!orderId.value || !viewKey.value) return
  try {
    const found = await api.lookupOrder({ orderId: String(orderId.value), key: viewKey.value })
    if (found) order.value = found
  } catch {
    // Keep showing what we have; the next poll tries again.
  }
}

// The customer leaves for LINE, sends the message, and comes back: check as soon as
// the tab is visible again, and meanwhile every few seconds for a while.
const POLL_MS = 8000
const POLL_WINDOW_MS = 15 * 60 * 1000
let pollTimer = null
let pollStarted = 0

const stopPolling = () => {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
}

const tick = async () => {
  if (document.hidden) return
  await loadOrder()
  if (confirmed.value || Date.now() - pollStarted > POLL_WINDOW_MS) stopPolling()
}

const onVisible = () => {
  if (!document.hidden && !confirmed.value) loadOrder()
}

onMounted(async () => {
  if (!orderId.value || !viewKey.value) return
  await loadOrder()
  if (confirmed.value) return
  pollStarted = Date.now()
  pollTimer = setInterval(tick, POLL_MS)
  document.addEventListener('visibilitychange', onVisible)
})

onBeforeUnmount(() => {
  stopPolling()
  document.removeEventListener('visibilitychange', onVisible)
})

const goShop = () => {
  router.push({ name: 'catalog', params: { lang: currentLang.value } })
}
const goTrack = () => {
  // Carry the private link along so a guest lands on this very order.
  const query = orderId.value && viewKey.value
    ? { orderId: String(orderId.value), key: viewKey.value }
    : undefined
  router.push({ name: 'ordertracking', params: { lang: currentLang.value }, query })
}
</script>

<template>
  <!-- Same frame as the order page (page header, content + side card) so this
       reads as a step inside ordering rather than a separate screen. -->
  <div class="ty-page">
    <header class="ty-header">
      <div class="ty-header-text">
        <h1 v-if="confirmed">{{ t('thankYou.confirmedTitle') }}</h1>
        <h1 v-else>{{ isQuote ? t('thankYou.quoteTitle') : t('thankYou.title') }}</h1>
        <p v-if="confirmed">{{ t('thankYou.confirmedProcessing') }}</p>
        <p v-else>{{ isQuote ? t('thankYou.quoteProcessing') : t('thankYou.processing') }}</p>
      </div>

      <!-- Message matched: a calm "received" chip. Until then there is no success
           tick anywhere on this page — the order is only a request, so it must not
           look "done". -->
      <div v-if="confirmed" class="received-badge">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {{ t('thankYou.confirmedBadge') }}
      </div>
      <div v-else class="pending-badge">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        {{ t('thankYou.pendingBadge') }}
      </div>
    </header>

    <!-- Step 3 until their message arrives, then it's our move (step 4). -->
    <OrderProgress :current="confirmed ? 4 : 3" />

    <div class="ty-content">
      <main class="ty-main">
        <!-- Step 2: the customer messages us first. Until that arrives staff treat the
             order as unverified, so this is the page's main action. -->
        <section v-if="confirmed" class="ty-received">
          <h2>{{ t(`orderDetail.state.${stateKey}`) }}</h2>
          <p>{{ t(`orderDetail.next.${nextKey}`) }}</p>
        </section>
        <OrderConfirmActions v-else-if="orderId" :order-id="String(orderId)" />

        <!-- Reached without an order id (bookmark / refresh): fall back to the OA link. -->
        <a v-else :href="LINE_OA_URL" target="_blank" rel="noopener" class="line-cta-btn">
          <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="10" fill="#06C755" />
            <path
              d="M20 8C13.4 8 8 12.5 8 18c0 3.7 2.4 6.9 6 8.8l-.8 3.9 4.5-2.4c.7.1 1.5.2 2.3.2 6.6 0 12-4.5 12-10S26.6 8 20 8z"
              fill="white" />
          </svg>
          {{ t('thankYou.lineCtaButton') }}
        </a>

        <PriceNotice class="ty-notice" />
      </main>

      <aside class="ty-side">
        <div class="ty-side-head">
          <span class="ty-side-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M6 2h12a1 1 0 0 1 1 1v18l-3-2-3 2-3-2-3 2V3a1 1 0 0 1 1-1z" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="9" y1="12" x2="15" y2="12" />
            </svg>
          </span>
          <h2>{{ t('thankYou.summaryTitle') }}</h2>
        </div>

        <dl class="ty-summary">
          <div v-if="orderId" class="ty-summary-row">
            <dt>{{ t('thankYou.orderNumber') }}</dt>
            <dd class="ty-order-id">{{ orderId }}</dd>
          </div>
          <div v-if="customerName" class="ty-summary-row">
            <dt>{{ t('thankYou.name') }}</dt>
            <dd>{{ customerName }}</dd>
          </div>
          <div class="ty-summary-row">
            <dt>{{ t('thankYou.status') }}</dt>
            <dd>
              <span class="ty-status" :class="{ 'is-confirmed': confirmed }">
                {{ confirmed ? t('thankYou.statusConfirmed') : t('thankYou.statusWaiting') }}
              </span>
            </dd>
          </div>
        </dl>

        <!-- Money, once the server has told us: items now, delivery when we quote it. -->
        <OrderTotals v-if="order" class="ty-totals" :items-total="order.items_total"
          :delivery-fee="order.delivery_fee" />

        <button class="ty-primary-btn" @click="goShop">
          {{ t('thankYou.continueShopping') }}
        </button>
        <button class="ty-link-btn" @click="goTrack">
          {{ t('order.trackOrders') }}
        </button>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.ty-page {
  min-height: 100vh;
  background-color: #FBF7F2;
  padding-bottom: 48px;
  font-family: 'Work Sans', sans-serif;
  color: #3D2B1F;
}

/* Page header — same recipe as .page-header on the order page */
.ty-header {
  padding: 16px 10% 0 5%;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 8px 24px;
  border-bottom: 1px solid #EAE1D7;
  margin-bottom: 20px;
}

.ty-header-text {
  padding-bottom: 14px;
  max-width: 640px;
}

.ty-header h1 {
  font-family: 'Crimson Pro', serif;
  font-size: 34px;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.5px;
  margin: 0;
  color: #3D2B1F;
}

.ty-header p {
  font-size: 14px;
  line-height: 1.55;
  margin: 6px 0 0;
  color: #8C7B6E;
}

.pending-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  margin-bottom: 14px;
  background: #FFF3D6;
  border: 1px solid #F2D58A;
  border-radius: 999px;
  color: #8A5A00;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.received-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  margin-bottom: 14px;
  background: #EAF4EC;
  border: 1px solid #BFDCC5;
  border-radius: 999px;
  color: #2F6B3C;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.2px;
}

/* Content — same 1fr + 360px split as the order page */
.ty-content {
  padding: 0 5%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 28px;
  align-items: start;
}

.ty-main {
  min-width: 0;
}

/* Side card — same surface as .cart-sidebar */
.ty-side {
  background: #F9F5F0;
  border-radius: 16px;
  padding: 20px;
  position: sticky;
  top: 24px;
}

.ty-side-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.ty-side-icon {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #E6E0D9;
  border-radius: 9px;
  color: #3D2B1F;
}

.ty-side-head h2 {
  font-family: 'Crimson Pro', serif;
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.ty-summary {
  margin: 0 0 18px;
  padding: 14px 0;
  border-top: 1px solid #E6E0D9;
  border-bottom: 1px solid #E6E0D9;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ty-summary-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
  font-size: 14px;
}

.ty-summary-row dt {
  color: #8C7B6E;
  flex-shrink: 0;
}

.ty-summary-row dd {
  margin: 0;
  text-align: right;
  font-weight: 600;
  color: #3D2B1F;
  overflow-wrap: anywhere;
}

.ty-order-id {
  font-size: 15px;
  letter-spacing: 0.3px;
  user-select: all;
}

.ty-status {
  display: inline-block;
  padding: 3px 10px;
  background: #FFF3D6;
  border: 1px solid #F2D58A;
  border-radius: 999px;
  color: #8A5A00;
  font-size: 12px;
  font-weight: 700;
}

.ty-status.is-confirmed {
  background: #EAF4EC;
  border-color: #BFDCC5;
  color: #2F6B3C;
}

.ty-totals {
  margin-bottom: 18px;
}

.ty-received {
  padding: 22px;
  background: #fff;
  border: 1px solid #EAE1D7;
  border-radius: 16px;
}

.ty-received h2 {
  margin: 0 0 8px;
  font-family: 'Crimson Pro', serif;
  font-size: 22px;
  font-weight: 700;
}

.ty-received p {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: #5E4C40;
}

.ty-notice {
  margin-top: 16px;
}

.ty-primary-btn {
  width: 100%;
  padding: 14px;
  background: #3D2B1F;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.ty-primary-btn:hover {
  background: #543D2F;
}

.ty-link-btn {
  display: block;
  width: 100%;
  margin-top: 10px;
  padding: 10px;
  background: none;
  border: none;
  color: #8C7B6E;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.ty-link-btn:hover {
  color: #3D2B1F;
}

/* No order id: plain OA link */
.line-cta-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 16px;
  background: #06C755;
  color: white;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.25s ease;
}

.line-cta-btn:hover {
  background: #05a847;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(6, 199, 85, 0.25);
}

@media (max-width: 1100px) {
  .ty-content {
    grid-template-columns: 1fr;
  }

  .ty-side {
    position: static;
  }
}

@media (max-width: 768px) {
  .ty-header {
    padding: 16px 20px 0;
  }

  .ty-header h1 {
    font-size: 28px;
  }

  .ty-content {
    padding: 0 20px;
  }
}
</style>
