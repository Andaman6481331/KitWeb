<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api } from '../services/api'
import { authStore } from '../stores/authStore'
import { defaultLang } from '@/utils/localeRoutes'
import OrderDetail from '../components/order-detail.vue'
import {
    formatBaht, isAwaitingCustomer, orderStateKey, orderViewFromRow, parseDbDate,
} from '../utils/orderView'

// One place to look at an order, whoever you are:
//  - logged in  -> your orders, newest first
//  - a guest    -> order number + phone (or the private link from LINE / the
//                  thank-you page, which opens the order straight away)
// Both end in the same detail panel.

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
const currentLang = computed(() => route.params.lang || defaultLang)
const isLoggedIn = computed(() => authStore.isAuthenticated)

const orders = ref([])
const selected = ref(null)
const isLoadingList = ref(false)
const isLookingUp = ref(false)
const lookupError = ref('')

const lookupOrderId = ref('')
const lookupPhone = ref('')
const showGuestLookup = ref(false)

// What proved the selected order, kept so it can be refreshed without asking again.
let proof = null
const detailEl = ref(null)

const dateTag = computed(() => ({ th: 'th-TH', ja: 'ja-JP', zh: 'zh-CN' }[locale.value] || 'en-GB'))
const shortDate = (value) => {
    const d = parseDbDate(value)
    return d ? d.toLocaleDateString(dateTag.value, { day: 'numeric', month: 'short', year: 'numeric' }) : ''
}

const amountLabel = (order) => {
    if (order.grand_total !== null) return formatBaht(order.grand_total)
    if (order.items_total !== null) return formatBaht(order.items_total)
    return t('orderTotals.itemsPending')
}

const itemSummary = (order) => {
    if (!order.items.length) return ''
    const first = order.items[0].product_name
    return order.items.length > 1 ? `${first} +${order.items.length - 1}` : first
}

const fetchOrders = async () => {
    if (!isLoggedIn.value) return
    isLoadingList.value = true
    try {
        const rows = await api.getOrders(authStore.user?.id)
        orders.value = rows.map(orderViewFromRow)
        if (selected.value) {
            const fresh = orders.value.find(o => o.id === selected.value.id)
            if (fresh) selected.value = fresh
        }
    } catch (error) {
        console.error('Error fetching orders:', error)
    } finally {
        isLoadingList.value = false
    }
}

const runLookup = async (credentials) => {
    isLookingUp.value = true
    lookupError.value = ''
    try {
        const found = await api.lookupOrder(credentials)
        if (found) {
            selected.value = found
            proof = credentials
            return true
        }
        return false
    } catch (error) {
        console.error('Order lookup failed:', error)
        lookupError.value = t('orderLookup.failed')
        return null
    } finally {
        isLookingUp.value = false
    }
}

// Arriving from the thank-you page or a LINE receipt: the key in the link is the proof.
const openFromLink = async () => {
    const orderId = String(route.query.orderId || '').trim()
    const key = String(route.query.key || '').trim()
    if (!orderId || !key) return
    lookupOrderId.value = orderId
    const ok = await runLookup({ orderId, key })
    if (ok === false) lookupError.value = t('orderLookup.invalidLink')
}

const submitLookup = async () => {
    const orderId = lookupOrderId.value.trim().toUpperCase()
    const phone = lookupPhone.value.trim()
    if (!orderId || !phone) return
    const ok = await runLookup({ orderId, phone })
    if (ok === false) lookupError.value = t('orderLookup.notFound')
}

const selectOrder = (order) => {
    selected.value = order
    // proof only matters for orders opened by lookup; list orders refresh via the list
    proof = null
    // In a single column the panel sits below the list.
    if (window.matchMedia?.('(max-width: 1100px)').matches) {
        requestAnimationFrame(() => detailEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
}

// The customer comes back from LINE after sending their message: refresh whatever
// is open so it flips without a manual reload.
const refreshSelected = async () => {
    if (!selected.value || !isAwaitingCustomer(selected.value)) return
    if (proof) await runLookup(proof)
    else if (isLoggedIn.value) await fetchOrders()
}
const onVisible = () => { if (!document.hidden) refreshSelected() }

const goToNewOrder = () => {
    router.push({ name: 'orderpage', params: { lang: currentLang.value } })
}
const goToLogin = () => {
    router.push({ path: `/${currentLang.value}/login` })
}

onMounted(async () => {
    document.addEventListener('visibilitychange', onVisible)
    await openFromLink()
    await fetchOrders()
    // A single glance should show something: the newest order if none was asked for.
    if (!selected.value && orders.value.length) selected.value = orders.value[0]
})

onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisible))

watch(() => [route.query.orderId, route.query.key], openFromLink)
</script>

<template>
    <div class="order-page">
        <!-- Page Header -->
        <div class="headers-wrapper">
            <div class="page-header">
                <div class="header-content">
                    <h1 v-reveal>{{ t('order.title') }}</h1>
                    <p v-reveal class="delay2">
                        {{ isLoggedIn
                            ? t('order.welcomeBack', { name: authStore.user?.businessName || authStore.user?.ownerName })
                            : t('orderLookup.subtitle') }}
                    </p>
                </div>

                <!-- Secondary Navbar -->
                <div class="secondary-navbar">
                    <router-link class="nav-item" exact-active-class="active"
                        :to="{ name: 'orderpage', params: { lang: currentLang } }">
                        {{ t('order.newOrder') }}
                    </router-link>
                    <router-link class="nav-item" exact-active-class="active"
                        :to="{ name: 'ordertracking', params: { lang: currentLang } }">
                        {{ t('order.trackOrders') }}
                    </router-link>
                </div>
            </div>
        </div>

        <div class="content-wrapper">
            <!-- Left: who you are decides what you see -->
            <div class="history-section">
                <template v-if="isLoggedIn">
                    <div class="history-header">
                        <h2>{{ t('orderLookup.yourOrders') }}</h2>
                    </div>

                    <p v-if="isLoadingList" class="muted">{{ t('orderLookup.loading') }}</p>

                    <div v-else-if="orders.length === 0" class="empty-orders-state">
                        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="1" aria-hidden="true">
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                        </svg>
                        <h3>{{ t('order.noOrdersFound') }}</h3>
                        <p>{{ t('order.noOrdersSubtitle') }}</p>
                        <button class="primary-btn" @click="goToNewOrder">{{ t('order.shopNow') }}</button>
                    </div>

                    <ul v-else class="order-list">
                        <li v-for="order in orders" :key="order.id">
                            <button class="order-row" :class="{ 'is-selected': selected && selected.id === order.id }"
                                :aria-pressed="selected && selected.id === order.id" @click="selectOrder(order)">
                                <span class="row-top">
                                    <span class="row-id">{{ order.id }}</span>
                                    <span class="row-state" :class="`is-${orderStateKey(order)}`">
                                        {{ t(`orderDetail.state.${orderStateKey(order)}`) }}
                                    </span>
                                </span>
                                <span class="row-name">{{ itemSummary(order) || t('orderDetail.noItems') }}</span>
                                <span class="row-meta">
                                    <span>{{ shortDate(order.created_at) }}</span>
                                    <span class="row-amount">{{ amountLabel(order) }}</span>
                                </span>
                            </button>
                        </li>
                    </ul>

                    <button class="text-btn" @click="showGuestLookup = !showGuestLookup">
                        {{ t('orderLookup.guestToggle') }}
                    </button>
                </template>

                <!-- The one lookup form: the whole left column for a guest, a folded
                     extra for a logged-in customer with an older guest order. -->
                <form v-if="!isLoggedIn || showGuestLookup" class="lookup" @submit.prevent="submitLookup">
                    <div v-if="!isLoggedIn" class="history-header">
                        <h2>{{ t('orderLookup.title') }}</h2>
                    </div>

                    <label class="field">
                        <span>{{ t('orderLookup.orderNumber') }}</span>
                        <input v-model="lookupOrderId" type="text" autocomplete="off" autocapitalize="characters"
                            :placeholder="t('orderLookup.orderNumberPlaceholder')" />
                    </label>
                    <label class="field">
                        <span>{{ t('orderLookup.phone') }}</span>
                        <input v-model="lookupPhone" type="tel" autocomplete="tel"
                            :placeholder="t('orderLookup.phonePlaceholder')" />
                    </label>

                    <p v-if="lookupError" class="lookup-error" role="alert">{{ lookupError }}</p>

                    <button class="primary-btn" type="submit"
                        :disabled="isLookingUp || !lookupOrderId.trim() || !lookupPhone.trim()">
                        {{ isLookingUp ? t('orderLookup.searching') : t('orderLookup.submit') }}
                    </button>

                    <button v-if="!isLoggedIn" class="text-btn" type="button" @click="goToLogin">
                        {{ t('orderLookup.loginHint') }}
                    </button>
                </form>
            </div>

            <!-- Right: the same detail panel for both -->
            <aside class="history-sidebar" ref="detailEl">
                <div v-if="selected" class="detail-card">
                    <OrderDetail :order="selected" />
                </div>
                <div v-else class="detail-empty">
                    <p>{{ t('orderLookup.selectHint') }}</p>
                </div>
            </aside>
        </div>
    </div>
</template>

<style scoped>
.order-page {
    min-height: 100vh;
    background-color: #FBF7F2;
    padding-bottom: 40px;
    font-family: 'Work Sans', sans-serif;
    color: #3D2B1F;
}

/* Page Header — same recipe as the order page */
.page-header {
    padding: 16px 10% 0 5%;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: 4px 24px;
    border-bottom: 1px solid #EAE1D7;
    margin-bottom: 20px;
}

.header-content {
    padding-bottom: 11px;
}

.header-content h1 {
    font-family: 'Crimson Pro', serif;
    font-size: 34px;
    font-weight: 700;
    margin: 0;
    color: #3D2B1F;
    letter-spacing: -0.5px;
}

.header-content p {
    font-size: 14px;
    margin: 6px 0 0;
    color: #8C7B6E;
}

.headers-wrapper {
    padding: 0;
    display: block;
}

/* Segmented control — kept identical to OrderPage so switching tabs doesn't
   change how the tabs look. */
.secondary-navbar {
    display: flex;
    gap: 4px;
    padding: 4px;
    margin: 0 0 12px;
    flex-shrink: 0;
    background: #F1EAE3;
    border-radius: 12px;
}

.nav-item {
    background: none;
    border: none;
    padding: 9px 18px;
    border-radius: 9px;
    font-family: 'Work Sans', sans-serif;
    font-size: 13px;
    font-weight: 700;
    color: #8C7B6E;
    cursor: pointer;
    text-decoration: none;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    white-space: nowrap;
    transition: color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
    display: inline-block;
}

.nav-item:hover {
    color: #3D2B1F;
}

.nav-item.active {
    background: #3D2B1F;
    color: #fff;
    box-shadow: 0 2px 8px rgba(61, 43, 31, 0.2);
}

/* Content — same 1fr + 360px split as the order page */
.content-wrapper {
    padding: 0 5%;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 380px;
    gap: 28px;
    align-items: start;
}

.history-section {
    background: #fff;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 2px 10px rgba(61, 43, 31, 0.05);
}

.history-header {
    margin-bottom: 16px;
}

.history-header h2 {
    font-family: 'Crimson Pro', serif;
    font-size: 26px;
    font-weight: 700;
    margin: 0;
}

.muted {
    color: #8C7B6E;
    font-size: 14px;
}

/* Order list */
.order-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.order-row {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px 16px;
    text-align: left;
    background: #FBF7F2;
    border: 1px solid #E6E0D9;
    border-radius: 14px;
    font-family: inherit;
    color: inherit;
    cursor: pointer;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.order-row:hover {
    border-color: #D1C7BD;
    box-shadow: 0 4px 12px rgba(61, 43, 31, 0.07);
}

.order-row.is-selected {
    border-color: #DD876E;
    box-shadow: 0 0 0 3px rgba(221, 135, 110, 0.18);
}

.row-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
}

.row-id {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.2px;
}

.row-state {
    flex-shrink: 0;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    background: #FFF3D6;
    border: 1px solid #F2D58A;
    color: #8A5A00;
}

.row-state.is-confirmed,
.row-state.is-paid,
.row-state.is-shipped,
.row-state.is-delivered {
    background: #EAF4EC;
    border-color: #BFDCC5;
    color: #2F6B3C;
}

.row-state.is-cancelled {
    background: #F3EEE9;
    border-color: #E6E0D9;
    color: #8C7B6E;
}

.row-name {
    font-size: 14px;
    color: #5E4C40;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.row-meta {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    font-size: 13px;
    color: #8C7B6E;
}

.row-amount {
    font-weight: 700;
    color: #3D2B1F;
}

/* Empty state */
.empty-orders-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 28px 8px;
    color: #8C7B6E;
}

.empty-orders-state svg {
    opacity: 0.3;
    margin-bottom: 16px;
}

.empty-orders-state h3 {
    margin: 0 0 6px;
    color: #3D2B1F;
}

.empty-orders-state p {
    margin: 0 0 18px;
    font-size: 14px;
}

/* Lookup form */
.lookup {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-top: 6px;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.field span {
    font-size: 13px;
    font-weight: 600;
    color: #5E4C40;
}

.field input {
    padding: 13px 14px;
    border: 1px solid #E6E0D9;
    border-radius: 10px;
    background: #FBF7F2;
    font-family: inherit;
    font-size: 15px;
    color: #3D2B1F;
}

.field input:focus {
    outline: none;
    border-color: #DD876E;
    box-shadow: 0 0 0 3px rgba(221, 135, 110, 0.18);
}

.lookup-error {
    margin: 0;
    padding: 10px 12px;
    background: #FCEDEA;
    border: 1px solid #F0C4BB;
    border-radius: 10px;
    color: #9B2C1B;
    font-size: 13px;
    line-height: 1.5;
}

.primary-btn {
    padding: 14px;
    background: #3D2B1F;
    color: #fff;
    border: none;
    border-radius: 12px;
    font-family: inherit;
    font-weight: 700;
    font-size: 15px;
    cursor: pointer;
    transition: background 0.2s ease;
}

.primary-btn:hover:not(:disabled) {
    background: #543D2F;
}

.primary-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

.text-btn {
    align-self: flex-start;
    margin-top: 14px;
    padding: 4px 0;
    background: none;
    border: none;
    color: #8C7B6E;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
}

.lookup .text-btn {
    margin-top: 0;
}

.text-btn:hover {
    color: #3D2B1F;
}

/* Detail panel */
.history-sidebar {
    position: sticky;
    top: 24px;
}

.detail-card {
    background: #F9F5F0;
    border-radius: 16px;
    padding: 20px;
}

.detail-empty {
    padding: 28px 20px;
    background: #F9F5F0;
    border-radius: 16px;
    text-align: center;
    color: #8C7B6E;
    font-size: 14px;
    line-height: 1.55;
}

.detail-empty p {
    margin: 0;
}

@media (max-width: 1100px) {
    .content-wrapper {
        grid-template-columns: 1fr;
    }

    .history-sidebar {
        position: static;
    }
}

@media (max-width: 768px) {
    .page-header {
        padding: 16px 20px 0;
    }

    .header-content h1 {
        font-size: 28px;
    }

    .content-wrapper {
        padding: 0 20px;
    }

    .history-section {
        padding: 18px;
    }
}
</style>
