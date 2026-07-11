<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api, API_URL, getDiyImageUrl } from '../services/api'
import { useProducts } from '../composables/useProducts'
import { authStore } from '../stores/authStore'
import { defaultLang } from '@/utils/localeRoutes'

const route = useRoute()
const router = useRouter()
const currentLang = computed(() => route.params.lang || defaultLang)
const { t, locale } = useI18n()

// Local inline placeholder (no external network dependency)
const placeholderImg = (label = '') => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#F9F5F0"/><text x="50" y="54" font-family="Work Sans, Arial, sans-serif" font-size="11" fill="#3D2B1F" text-anchor="middle">${label}</text></svg>`
    return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

// Products list — only used to resolve order thumbnails
const { products: rawProducts, fetchProducts: revalidateProducts } = useProducts()
const rawDiyProducts = ref([])

const products = computed(() => {
    const regularMapped = rawProducts.value.map(p => ({
        ...p,
        image: p.image_key ? `${API_URL}/images/${p.image_key}-thumb.webp` : placeholderImg('Product')
    }))

    const diyMapped = rawDiyProducts.value.map(p => ({
        ...p,
        id: `diy-${p.id}`,
        image: getDiyImageUrl(p.images && p.images.length > 0 ? p.images[0] : '', 'thumb')
    }))

    return [...regularMapped, ...diyMapped]
})

// Helper to get image for a product ID
const getProductImage = (productId) => {
    const product = products.value.find(p => p.id === productId);
    const key = product ? (product.image_key || product.image) : null;

    if (!key) {
        if (typeof productId === 'string' && productId.startsWith('diy-')) {
            return 'https://m.media-amazon.com/images/I/610a5LpNbTL.jpg';
        }
        return placeholderImg('Product');
    }

    const keyStr = String(key);
    if (keyStr.startsWith('http')) return keyStr;
    if (keyStr.includes('.')) {
        if (typeof productId === 'string' && productId.startsWith('diy-')) {
            return `${API_URL}/kit-image/${keyStr}`;
        }
        return `${API_URL}/images/${keyStr}`;
    }
    if (typeof productId === 'string' && productId.startsWith('diy-')) {
        return `${API_URL}/kit-image/${keyStr}-thumb.webp`;
    }
    return `${API_URL}/images/${keyStr}-thumb.webp`;
};

// Order history data
const orders = ref([])
const isFetchingOrders = ref(false)

// Fetch orders from database
const fetchOrders = async () => {
    isFetchingOrders.value = true
    try {
        // Only fetch orders for the logged-in customer if applicable
        const data = await api.getOrders(authStore.user?.id)
        orders.value = data.map(order => ({
            ...order,
            date: new Date(order.created_at).toLocaleDateString(locale.value === 'th' ? 'th-TH' : 'en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            }),
            price: order.total_amount,
            // Fallback for UI if items list is empty but count is needed
            itemsCount: order.items ? order.items.length : 0,
            image: order.items && order.items.length > 0 ? getProductImage(order.items[0].product_id) : placeholderImg('Order')
        }))
    } catch (error) {
        console.error('Error fetching orders:', error)
    } finally {
        isFetchingOrders.value = false
    }
}

// Fetch products purely so order thumbnails can be resolved
const fetchProductsForImages = async () => {
    await revalidateProducts()
    try {
        rawDiyProducts.value = await api.getDiyProducts()
    } catch (error) {
        console.error('Failed to fetch DIY products:', error)
    }
}

onMounted(() => {
    fetchProductsForImages()
    fetchOrders()
})

// Recommendations data
const recommendations = ref([])

// Order details sidebar
const showOrderDetails = ref(false)
const selectedOrder = ref(null)

const selectOrderDetails = (order) => {
    selectedOrder.value = order
    showOrderDetails.value = true
}

const closeOrderDetails = () => {
    showOrderDetails.value = false
    selectedOrder.value = null
}

const goToNewOrder = () => {
    router.push({ name: 'orderpage', params: { lang: currentLang.value } })
}
</script>

<template>
    <div class="order-page">
        <!-- Page Header -->
        <div class="headers-wrapper">
            <div class="page-header">
                <div class="header-content">
                    <h1 v-reveal>{{ t('order.title') }}</h1>
                    <p v-reveal class="delay2">
                        {{ authStore.isAuthenticated ? t('order.welcomeBack', {
                            name: authStore.user?.businessName ||
                                authStore.user?.ownerName
                        }) :
                            t('order.heroSubtitle') }}
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

        <!-- Main Content -->
        <div class="content-wrapper">
            <div class="history-section">
                <div class="history-header">
                    <div class="history-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2"></svg>
                        <h2>{{ t('order.orderHistory') }}</h2>
                    </div>
                    <button class="download-statements">{{ t('order.downloadStatements') }}</button>
                </div>

                <div class="orders-history-list">
                    <div v-if="orders.length === 0" class="empty-orders-state">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="1" style="opacity: 0.3; margin-bottom: 20px;">
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                        </svg>
                        <h3>{{ t('order.noOrdersFound') }}</h3>
                        <p>{{ t('order.noOrdersSubtitle') }}</p>
                        <button class="checkout-btn-modern" style="max-width: 200px; margin-top: 20px;"
                            @click="goToNewOrder">{{ t('order.shopNow') }}</button>
                    </div>
                    <div v-else v-for="order in orders" :key="order.id" class="order-history-card">
                        <div class="order-main-info">
                            <div class="order-img-container">
                                <img :src="order.image" :alt="order.name">
                            </div>
                            <div class="order-text-info">
                                <div class="order-id-status">
                                    <span class="order-id">{{ t('order.orderNumber') }}{{ order.id }}</span>
                                    <span v-if="order.status === 'SHIPPED'" class="status-tag shipped">{{
                                        t('order.shipped') }}</span>
                                    <span v-else class="status-tag pending">{{ order.status }}</span>
                                </div>
                                <h3 class="order-name">{{ order.items && order.items.length > 0 ?
                                    order.items[0].product_name : 'New Order' }}</h3>
                                <p class="order-meta">{{ t('order.placedOn') }} {{ order.date }} • {{
                                    order.itemsCount }} {{ t('order.itemsCount') }} •
                                    ฿{{
                                        order.price.toLocaleString() }}</p>
                            </div>
                        </div>

                        <!-- Tracking Bar (Only for Shipped) -->
                        <div v-if="order.status === 'SHIPPED'" class="tracking-timeline">
                            <div class="timeline-header">
                                <span class="arrival-time">{{ order.deliveryStatus }}</span>
                                <span class="current-location">{{ order.location }}</span>
                            </div>
                            <div class="timeline-bar">
                                <div class="bar-progress" style="width: 70%"></div>
                            </div>
                        </div>

                        <div class="order-card-actions">
                            <button class="track-btn" v-if="order.status === 'SHIPPED'">{{ t('order.trackShipment')
                            }}</button>
                            <button class="order-details-btn" @click="selectOrderDetails(order)">{{
                                t('order.orderDetails') }}</button>
                            <button class="buy-again-btn" v-if="order.status === 'DELIVERED'">{{ t('order.buyAgain')
                            }}</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sidebar -->
            <div class="history-sidebar">
                <!-- Recommended For You (Default) -->
                <div v-if="!showOrderDetails" class="recommendations-container">
                    <h3>{{ t('order.recommendedForYou') }}</h3>
                    <div class="rec-list">
                        <div v-for="rec in recommendations" :key="rec.id" class="rec-item">
                            <img :src="rec.image" :alt="rec.name">
                            <div class="rec-info">
                                <h4>{{ rec.name }}</h4>
                                <p>฿{{ rec.price }}{{ rec.unit || '' }}</p>
                            </div>
                            <button class="add-rec-btn">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                    stroke-width="2">
                                    <circle cx="9" cy="21" r="1" />
                                    <circle cx="20" cy="21" r="1" />
                                    <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <button class="view-all-recs">{{ t('order.viewRecommendations') }}</button>
                </div>

                <!-- Order Details (Toggled) -->
                <div v-else class="order-details-sidebar">
                    <div class="details-header">
                        <h3>{{ t('order.orderDetails') }}</h3>
                        <button @click="closeOrderDetails" class="close-details">✕</button>
                    </div>
                    <div v-if="selectedOrder" class="details-content">
                        <div class="order-summary-mini">
                            <p><strong>{{ t('order.orderNumber') }}</strong> {{ selectedOrder.id }}</p>
                            <p><strong>{{ t('order.status') }}:</strong> {{ selectedOrder.status }}</p>
                            <p><strong>{{ t('order.total') }}:</strong> ฿{{ selectedOrder.price.toLocaleString() }}
                            </p>
                        </div>
                        <div class="order-items-mini">
                            <div v-for="item in selectedOrder.items" :key="item.id" class="mini-item">
                                <p><strong>{{ item.product_name }}</strong> x {{ item.quantity }}</p>
                                <p class="mini-meta">{{ item.size }} | {{ item.color }}</p>
                            </div>
                        </div>
                        <button class="checkout-btn-modern">{{ t('order.goCheckout') }}</button>
                    </div>
                </div>
            </div>
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

/* Page Header */
.page-header {
    padding: 16px 10% 0 5%;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: 4px 24px;
    border-bottom: 1px solid #EAE1D7;
    margin-bottom: 12px;
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

/* Content Wrapper */
.content-wrapper {
    padding: 0 5%;
    display: grid;
    grid-template-columns: 1fr 360px;
    gap: 28px;
    align-items: start;
}

/* Secondary Navbar */
.secondary-navbar {
    display: flex;
    gap: 28px;
    padding: 0;
    margin: 0;
    flex-shrink: 0;
}

.nav-item {
    background: none;
    border: none;
    padding: 11px 0;
    font-family: 'Work Sans', sans-serif;
    font-size: 20px;
    font-weight: 600;
    color: #A0917F;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 1px;
    position: relative;
    transition: color 0.2s ease;
    text-decoration: none;
    display: inline-block;
}

.nav-item:hover {
    color: #3D2B1F;
}

.nav-item.active {
    color: #3D2B1F;
}

.nav-item.active::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 100%;
    height: 2px;
    background: #3D2B1F;
    border-radius: 2px 2px 0 0;
}

.checkout-btn-modern {
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, #DD876E, #e6957c);
    color: white;
    border: none;
    border-radius: 10px;
    font-weight: 700;
    font-size: 15px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.checkout-btn-modern:hover {
    opacity: 0.92;
    transform: translateY(-2px);
}

/* History Section */
.history-section {
    flex: 1;
    background: white;
    border-radius: 14px;
    padding: 28px;
    box-shadow: 0 2px 10px rgba(61, 43, 31, 0.05);
}

.history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.history-title {
    display: flex;
    align-items: center;
    gap: 12px;
    color: #3D2B1F;
}

.history-title h2 {
    font-family: 'Crimson Pro', serif;
    font-size: 28px;
    font-weight: 700;
    margin: 0;
}

.download-statements {
    background: none;
    border: none;
    color: #4DB6C1;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    text-decoration: underline;
}

/* Order History Cards */
.orders-history-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.order-history-card {
    background: #FBF7F2;
    border: 1px solid #E6E0D9;
    border-radius: 14px;
    padding: 18px;
    transition: all 0.3s ease;
}

.order-history-card:hover {
    box-shadow: 0 4px 12px rgba(61, 43, 31, 0.08);
    border-color: #D1C7BD;
}

@media (max-width: 600px) {
    .order-main-info {
        flex-direction: column;
        align-items: center;
        text-align: center;
    }

    .order-img-container {
        width: 140px;
        height: 140px;
    }

    .order-card-actions {
        flex-direction: column;
    }

    .order-card-actions button {
        width: 100%;
    }
}

.order-main-info {
    display: flex;
    gap: 16px;
    margin-bottom: 14px;
}

.order-img-container {
    width: 84px;
    height: 84px;
    background: white;
    border-radius: 12px;
    overflow: hidden;
    flex-shrink: 0;
}

.order-img-container img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.order-text-info {
    flex: 1;
}

.order-id-status {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.order-id {
    font-size: 13px;
    font-weight: 600;
    color: #8C7E71;
}

.status-tag {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
}

.status-tag.shipped {
    background: #E0F7F9;
    color: #4DB6C1;
}

.status-tag.pending {
    background: #FFF9E6;
    color: #B28900;
}

.order-name {
    font-family: 'Crimson Pro', serif;
    font-size: 18px;
    font-weight: 700;
    color: #3D2B1F;
    margin: 0 0 4px 0;
}

.order-meta {
    font-size: 13px;
    color: #8C7E71;
    margin: 0;
}

/* Tracking Timeline */
.tracking-timeline {
    background: white;
    padding: 20px;
    border-radius: 12px;
    margin-bottom: 20px;
}

.timeline-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
    font-size: 14px;
    font-weight: 600;
}

.arrival-time {
    color: #3D2B1F;
}

.current-location {
    color: #4DB6C1;
}

.timeline-bar {
    height: 4px;
    background: #F4EDE6;
    border-radius: 2px;
    position: relative;
}

.bar-progress {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background: #4DB6C1;
    border-radius: 2px;
}

/* Order Card Actions */
.order-card-actions {
    display: flex;
    gap: 12px;
}

.track-btn {
    flex: 1;
    background: #006D77;
    color: white;
    border: none;
    padding: 12px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
}

.order-details-btn {
    flex: 1;
    background: white;
    border: 1px solid #3D2B1F;
    color: #3D2B1F;
    padding: 12px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
}

.buy-again-btn {
    background: white;
    border: 1px solid #E6E0D9;
    color: #8C7E71;
    padding: 10px 20px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
}

/* History Sidebar */
.history-sidebar {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.recommendations-container {
    background: white;
    border-radius: 14px;
    padding: 20px;
    box-shadow: 0 2px 10px rgba(61, 43, 31, 0.05);
}

.recommendations-container h3 {
    font-size: 14px;
    font-weight: 700;
    color: #3D2B1F;
    letter-spacing: 1px;
    margin: 0 0 20px 0;
}

.rec-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 24px;
}

.rec-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border-radius: 12px;
    background: #FBF7F2;
}

.rec-item img {
    width: 60px;
    height: 60px;
    border-radius: 8px;
    object-fit: cover;
}

.rec-info {
    flex: 1;
}

.rec-info h4 {
    font-size: 14px;
    font-weight: 600;
    color: #3D2B1F;
    margin: 0 0 4px 0;
}

.rec-info p {
    font-size: 13px;
    color: #4DB6C1;
    font-weight: 700;
    margin: 0;
}

.add-rec-btn {
    background: none;
    border: none;
    color: #8C7E71;
    cursor: pointer;
    padding: 8px;
}

.view-all-recs {
    width: 100%;
    padding: 12px;
    background: white;
    border: 1px solid #4DB6C1;
    color: #006D77;
    border-radius: 8px;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
}

/* Order Details Sidebar */
.order-details-sidebar {
    background: white;
    border-radius: 14px;
    padding: 20px;
    box-shadow: 0 2px 10px rgba(61, 43, 31, 0.05);
}

.details-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.details-header h3 {
    font-family: 'Crimson Pro', serif;
    font-size: 20px;
    font-weight: 700;
    margin: 0;
}

.close-details {
    background: none;
    border: none;
    font-size: 18px;
    color: #8C7E71;
    cursor: pointer;
}

.details-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.order-summary-mini {
    background: #FBF7F2;
    padding: 16px;
    border-radius: 12px;
    font-size: 14px;
}

.order-summary-mini p {
    margin: 8px 0;
    color: #3D2B1F;
}

.order-items-mini {
    font-size: 13px;
    color: #8C7E71;
}

.mini-item {
    padding: 10px 0;
    border-bottom: 1px solid #F0ECE7;
}

.mini-item:last-child {
    border-bottom: none;
}

.mini-meta {
    font-size: 11px;
    opacity: 0.7;
    margin-top: 2px;
}

.empty-orders-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 20px;
    text-align: center;
    background: white;
    border-radius: 12px;
    border: 1px dashed #E6E0D9;
}

.empty-orders-state h3 {
    font-family: 'ZCOOL XiaoWei', serif;
    font-size: 24px;
    color: #3D2B1F;
    margin-bottom: 10px;
}

.empty-orders-state p {
    color: #8C7E71;
    max-width: 400px;
    line-height: 1.6;
}

/* Responsive */
@media (max-width: 1100px) {
    .content-wrapper {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 1024px) {
    .history-sidebar {
        width: 100%;
    }
}

@media (max-width: 768px) {
    .secondary-navbar {
        gap: 20px;
    }

    .header-content h1 {
        font-size: 28px;
    }

    .order-main-info {
        flex-direction: column;
    }

    .order-img-container {
        width: 100%;
        height: 150px;
    }

    .order-card-actions {
        flex-direction: column;
    }

    .history-sidebar {
        display: none;
    }
}

/* Custom Scrollbar */
::-webkit-scrollbar {
    width: 8px;
}

::-webkit-scrollbar-track {
    background: #F9F5F0;
}

::-webkit-scrollbar-thumb {
    background: #E6E0D9;
    border-radius: 10px;
}

::-webkit-scrollbar-thumb:hover {
    background: #D1C7BD;
}
</style>
