<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api, API_URL, getDiyImageUrl } from '../services/api'
import { useProducts } from '../composables/useProducts';
import { cartStore } from '../stores/cartStore';
import { authStore } from '../stores/authStore';
import { codeToPath, defaultLang } from '@/utils/localeRoutes';

const route = useRoute();
const router = useRouter();
const currentLang = computed(() => route.params.lang || defaultLang);
const { t, te, locale } = useI18n()

const isMobile = ref(typeof window !== 'undefined' ? window.innerWidth <= 768 : false)

// The category chip row scrolls horizontally (touch/drag already works). Map a
// vertical mouse wheel onto that horizontal scroll so desktop users can reach
// the chips that fade off under the right-edge mask.
const categoryFiltersEl = ref(null)
const onCategoryWheel = (e) => {
    const el = categoryFiltersEl.value
    if (!el || el.scrollWidth <= el.clientWidth) return
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return // let real horizontal gestures pass through
    el.scrollLeft += e.deltaY
    e.preventDefault()
}

// Local inline placeholder (no external network dependency)
const placeholderImg = (label = '') => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#F9F5F0"/><text x="50" y="54" font-family="Work Sans, Arial, sans-serif" font-size="11" fill="#3D2B1F" text-anchor="middle">${label}</text></svg>`
    return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

// Helper to translate product fields
const tProduct = (item, field) => {
    if (!item) return '';
    const lang = locale.value.toLowerCase();

    const thField = `${field}_th`;
    if (lang === 'th' && item[thField]) {
        return item[thField];
    }

    return item[field] || '';
};

// Helper to translate product arrays
const tArray = (item, field) => {
    const text = tProduct(item, field);
    if (!text) return [];
    return typeof text === 'string' ? text.split(',').map(x => x.trim()) : (Array.isArray(text) ? text : []);
};


// Sample product data with size and color options
const { products: rawProducts, isLoading, fetchProducts: revalidateProducts } = useProducts()
const rawDiyProducts = ref([])

const products = computed(() => {
    const regularMapped = rawProducts.value.map(p => ({
        ...p,
        sizes: p.sizes ? (typeof p.sizes === 'string' ? p.sizes.split(',').map(s => s.trim()) : p.sizes) : ['Standard'],
        sizes_th: p.sizes_th ? (typeof p.sizes_th === 'string' ? p.sizes_th.split(',').map(s => s.trim()) : p.sizes_th) : null,
        colors: p.colors ? (typeof p.colors === 'string' ? p.colors.split(',').map(c => c.trim()) : p.colors) : ['Default'],
        colors_th: p.colors_th ? (typeof p.colors_th === 'string' ? p.colors_th.split(',').map(c => c.trim()) : p.colors_th) : null,
        varieties: p.varieties ? (typeof p.varieties === 'string' ? p.varieties.split(',').map(v => v.trim()) : p.varieties) : null,
        varieties_th: p.varieties_th ? (typeof p.varieties_th === 'string' ? p.varieties_th.split(',').map(v => v.trim()) : p.varieties_th) : null,
        inStock: true,
        image: p.image_key ? `${API_URL}/images/${p.image_key}-thumb.webp` : placeholderImg('Product')
    }))

    const diyMapped = rawDiyProducts.value.map(p => ({
        ...p,
        id: `diy-${p.id}`,
        sizes: ['Default'],
        sizes_th: null,
        colors: ['Default'],
        colors_th: null,
        varieties: null,
        varieties_th: null,
        inStock: true,
        price: p.price_1 || 0,
        category: 'DIY Kit',
        image: getDiyImageUrl(p.images && p.images.length > 0 ? p.images[0] : '', 'thumb')
    }))

    return [...regularMapped, ...diyMapped]
})

// Watch products to pre-initialize selections immediately when products are available reactively
watch(products, (newProducts) => {
    if (newProducts && newProducts.length > 0) {
        newProducts.forEach(product => {
            if (product && product.id && !productSelections.value[product.id]) {
                productSelections.value[product.id] = {
                    size: product.sizes ? product.sizes[0] : 'Standard',
                    color: product.colors ? product.colors[0] : 'Default'
                }
            }
        })
    }
}, { immediate: true })

const fetchProducts = async () => {
    await revalidateProducts()
    try {
        rawDiyProducts.value = await api.getDiyProducts()
    } catch (error) {
        console.error('Failed to fetch DIY products:', error)
    }
}

onMounted(() => {
    fetchProducts()
})

const cart = computed(() => cartStore.cart)
const searchQuery = ref('')
const selectedCategory = ref('All')
const showNotification = ref(false)
const notificationMessage = ref('')
const showClearConfirm = ref(false)

// Track selected size and color for each product
const productSelections = ref({})

// Selections are initialized in fetchProducts

// Categories
const getProductCategoryPaths = (product) => {
    if (product.categories?.length) return product.categories;
    return product.category ? [product.category] : [];
};

const categories = computed(() => {
    const paths = products.value.flatMap(getProductCategoryPaths);
    return ['All', ...new Set(paths.filter(Boolean))];
});

const tCategory = (cat) => {
    if (!cat) return '';
    if (cat === 'All') return t('order.all');
    if (cat === 'DIY Kit') return te('diyKits.title') ? t('diyKits.title') : 'DIY Kit';

    const mapping = {
        'yarn': 'Yarn',
        'yarns': 'Yarn',
        'needles': 'Needles',
        'needle': 'Needles',
        'threads': 'Threads',
        'thread': 'Threads',
        'tools': 'Tools',
        'tool': 'Tools',
        'beads': 'Beads',
        'bead': 'Beads',
        'ribbons': 'Ribbons',
        'ribbon': 'Ribbons',
        'buttons': 'Buttons',
        'button': 'Buttons',
        'accessories': 'Accessories',
        'accessory': 'Accessories',
        'artificialflowers': 'ArtificialFlowers',
        'artificialflower': 'ArtificialFlowers',
        'artificial flowers': 'ArtificialFlowers'
    };
    const lower = cat.toLowerCase().trim();
    const key = mapping[lower];
    if (key && te(`categories.${key}`)) {
        return t(`categories.${key}`);
    }
    if (te(`categories.${cat}`)) {
        return t(`categories.${cat}`);
    }
    return cat;
};

// Filtered products
const filteredProducts = computed(() => {
    let filtered = products.value

    // Filter by category
    if (selectedCategory.value !== 'All') {
        filtered = filtered.filter(p => getProductCategoryPaths(p).includes(selectedCategory.value))
    }

    // Filter by search
    if (searchQuery.value) {
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
            p.description.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
            getProductCategoryPaths(p).some(cat => cat.toLowerCase().includes(searchQuery.value.toLowerCase()))
        )
    }

    return filtered
})

// The desktop list is virtualised by RecycleScroller, so it only ever builds the
// rows on screen. The mobile branch has no scroller and renders every row, so it
// pages instead — same 20-at-a-time contract as the catalog grid.
const PAGE_SIZE = 20;
const visibleCount = ref(PAGE_SIZE);

const pagedProducts = computed(() => filteredProducts.value.slice(0, visibleCount.value));
const remainingCount = computed(() => filteredProducts.value.length - pagedProducts.value.length);

const loadMore = () => {
    visibleCount.value += PAGE_SIZE;
};

// Searching or switching category makes a new list, so it starts at page one.
watch([selectedCategory, searchQuery], () => {
    visibleCount.value = PAGE_SIZE;
});

// Cart calculations (no delivery fee — the total is the items subtotal; staff
// arrange any shipping cost manually over LINE).
const cartTotal = computed(() => cartStore.cartTotal)
const cartItemCount = computed(() => cartStore.cartItemCount)

// Add to cart with selected size and color
const addToCart = (product) => {
    const selection = productSelections.value[product.id]
    cartStore.addToCart(product, selection);
    showNotificationMsg(t('order.addedToCart', { name: product.name }))
}

// Update size selection
const updateSize = (productId, size) => {
    productSelections.value[productId].size = size
}

// Update color selection
const updateColor = (productId, color) => {
    productSelections.value[productId].color = color
}

// Update quantity
const updateQuantity = (cartItemKey, delta) => {
    const item = cart.value.find(i => i.cartItemKey === cartItemKey)
    if (item) {
        cartStore.updateQuantity(cartItemKey, delta);
    }
}

// Remove from cart
const removeFromCart = (cartItemKey) => {
    const item = cart.value.find(i => i.cartItemKey === cartItemKey)
    if (item) {
        const itemName = item.name
        cartStore.removeFromCart(cartItemKey);
        showNotificationMsg(t('order.removedFromCart', { name: itemName }))
    }
}

// Clear cart
const clearCart = () => {
    showClearConfirm.value = true
}

const confirmClearCart = () => {
    cartStore.clearCart();
    showClearConfirm.value = false
    showNotificationMsg(t('order.cartCleared'))
}

// Use an existing translation key when present, otherwise a readable fallback.
const tt = (key, fallback) => (te(key) ? t(key) : fallback)

// Checkout — swap the left column into the checkout form in place.
// The right-hand cart summary stays put so the flow feels continuous.
const isCheckoutView = ref(false)

const checkout = () => {
    if (cart.value.length === 0) {
        showNotificationMsg(t('order.cartEmptyError'))
        return
    }
    isCheckoutView.value = true
    if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }
}

const exitCheckout = () => {
    isCheckoutView.value = false
}

// If the cart empties while checking out (e.g. user removes the last item),
// fall back to the product browser.
watch(() => cart.value.length, (len) => {
    if (len === 0 && isCheckoutView.value) {
        isCheckoutView.value = false
    }
})

// ---- Checkout form fields (in-place, replaces the product browser) ----
// Accounts are optional; when logged in we prefill from the saved profile.
const isLoggedIn = computed(() => authStore.isAuthenticated)
const acct = authStore.user || {}
const customerName = ref(acct.businessName || acct.ownerName || '')
const phoneNumber = ref(acct.phone || '')
const shippingAddress = ref(acct.shippingAddress || '')
const orderNote = ref('')
const saveToAccount = ref(false)
const slipImage = ref(null)
const slipPreview = ref(null)
const isSubmittingOrder = ref(false)
// When slip verification is off (default), the payment slip is optional — the order
// goes to the LINE OA and staff handle payment manually. Mirrors the Worker's flag.
const slipRequired = import.meta.env.VITE_SLIP_VERIFICATION_ENABLED === 'true'

// LINE: an optional typed display name (staff use it to find the customer) plus the
// optional one-tap Connect (OAuth) that also yields a real userId for auto messages.
const lineUserId = ref(acct.lineUserId || '')
const lineDisplayName = ref(acct.lineDisplayName || '')
const lineLoginEnabled = ref(false)
const lineConnecting = ref(false)

const handleSlipUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
        slipImage.value = file
        slipPreview.value = URL.createObjectURL(file)
    }
}

const triggerLineLogin = () => {
    const channelId = import.meta.env.VITE_LINE_LOGIN_CHANNEL_ID
    if (!channelId) {
        showNotificationMsg(tt('order.lineConfigMissing', 'LINE login is not configured yet.'))
        return
    }

    const state = crypto.randomUUID()
    // Use localStorage (shared across same-origin tabs/popup), not sessionStorage:
    // the popup opens on LINE's origin first, so it never inherits this tab's
    // sessionStorage and would otherwise read an empty state on return.
    localStorage.setItem('line_oauth_state', state)
    const redirectUri = encodeURIComponent(`${window.location.origin}/line-callback`)
    const url =
        `https://access.line.me/oauth2/v2.1/authorize?response_type=code` +
        `&client_id=${channelId}` +
        `&redirect_uri=${redirectUri}` +
        `&state=${state}` +
        `&scope=profile%20openid` +
        `&bot_prompt=aggressive`

    const popup = window.open(url, 'lineLogin', 'width=500,height=700')
    if (!popup) {
        showNotificationMsg(tt('order.linePopupBlocked', 'Please allow pop-ups to connect LINE.'))
        return
    }

    lineConnecting.value = true
    let settled = false
    let pollId = null

    const cleanup = () => {
        window.removeEventListener('message', handler)
        if (pollId) clearInterval(pollId)
        lineConnecting.value = false
    }

    const handler = (e) => {
        if (e.origin !== window.location.origin) return
        if (e.data?.type === 'LINE_AUTH') {
            settled = true
            lineUserId.value = e.data.lineUserId
            lineDisplayName.value = e.data.displayName
            cleanup()
            popup?.close()
            showNotificationMsg(tt('order.lineConnected', 'LINE connected'))
        } else if (e.data?.type === 'LINE_AUTH_ERROR') {
            settled = true
            cleanup()
            popup?.close()
            showNotificationMsg(tt('order.lineConnectFailed', 'Could not connect to LINE. Please try again.'))
        }
    }
    window.addEventListener('message', handler)

    // Catch the user closing the popup without finishing — either a manual cancel
    // or LINE's own error page (e.g. a channel-status 400 that never reaches our callback).
    pollId = setInterval(() => {
        if (popup.closed) {
            clearInterval(pollId)
            if (!settled) {
                cleanup()
                showNotificationMsg(tt('order.lineConnectCancelled', 'LINE connection was cancelled.'))
            }
        }
    }, 600)
}

const submitOrder = async () => {
    // Name, phone and address are required; the LINE display name is optional.
    if (!customerName.value.trim() || !phoneNumber.value.trim() || !shippingAddress.value.trim()) {
        showNotificationMsg(tt('order.pleaseFillRequired', 'Please fill in your name, phone and address.'))
        return
    }
    if (slipRequired && !slipImage.value) {
        showNotificationMsg(t('order.pleaseUploadSlip'))
        return
    }
    isSubmittingOrder.value = true

    const formData = new FormData()
    formData.append('customerName', customerName.value)
    formData.append('phoneNumber', phoneNumber.value)
    formData.append('shippingAddress', shippingAddress.value)
    formData.append('orderNote', orderNote.value)
    formData.append('lineUserId', lineUserId.value)
    formData.append('lineDisplayName', lineDisplayName.value)
    // Link the order to the account when logged in (so it appears under Track Orders).
    if (isLoggedIn.value && authStore.user?.id) {
        formData.append('customerId', authStore.user.id)
    }
    // The backend prices every line from the DB — prices are not sent from the client.
    formData.append('cartItems', JSON.stringify(cart.value.map(item => ({
        id: item.id,
        name: item.name,
        name_th: item.name_th || null,
        selectedSize: item.selectedSize,
        selectedColor: item.selectedColor,
        quantity: item.quantity
    }))))
    // Only attach a slip when one was actually uploaded — appending a null/empty value
    // stringifies to "null" and breaks the backend's file handling.
    if (slipImage.value) {
        formData.append('slipImage', slipImage.value)
    }

    try {
        // Optionally persist contact details back to the account for next time.
        if (saveToAccount.value && isLoggedIn.value) {
            await saveProfile(true)
        }
        const result = await api.submitOrderWithSlip(formData)
        if (result.success) {
            cartStore.clearCart()
            router.push({
                name: 'thank-you',
                params: { lang: currentLang.value },
                query: { orderId: result.orderId }
            })
        } else {
            // Log the raw backend response so unmapped errors are diagnosable in the console.
            console.error('Order submit failed:', result)
            const errMap = {
                SLIP_INVALID: t('order.slipInvalid'),
                AMOUNT_MISMATCH: t('order.amountMismatch'),
                WRONG_ACCOUNT: t('order.wrongAccount'),
                DUPLICATE: t('order.duplicateSlip'),
                PRODUCT_UNAVAILABLE: tt('order.productUnavailable', 'A product in your cart is no longer available.'),
            }
            showNotificationMsg(errMap[result.error] || t('order.orderFailed'))
        }
    } catch (error) {
        console.error('Error submitting order:', error)
        showNotificationMsg(t('order.orderFailed'))
    } finally {
        isSubmittingOrder.value = false
    }
}

// Save the current contact details to the logged-in customer's account.
const saveProfile = async (silent = false) => {
    if (!isLoggedIn.value) return
    try {
        const result = await api.updateCustomer({
            phone: phoneNumber.value,
            shippingAddress: shippingAddress.value,
            lineDisplayName: lineDisplayName.value,
            lineUserId: lineUserId.value || undefined
        })
        if (result?.user) {
            authStore.login(result.user, authStore.token)
        }
        if (!silent) showNotificationMsg(tt('order.profileSaved', 'Saved to your account.'))
    } catch (e) {
        console.error('Failed to save profile:', e)
        if (!silent) showNotificationMsg(t('order.orderFailed'))
    }
}

// Show notification
const showNotificationMsg = (msg) => {
    notificationMessage.value = msg
    showNotification.value = true
    setTimeout(() => {
        showNotification.value = false
    }, 1500)
}

// Scroll to the cart (mobile sticky bar)
const scrollToCart = () => {
    document.getElementById('cartSidebar')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const isProductInCart = (productId) => {
    return cart.value.some(item => item.id === productId)
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
            <!-- Search & Filter Bar (hidden while checking out) -->
            <div class="filter-bar" v-if="!isCheckoutView">
                <div class="search-box">
                    <svg class="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="2" />
                        <path d="M14 14L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                    </svg>
                    <input v-model="searchQuery" type="text" :placeholder="t('order.searchPlaceholder')"
                        class="search-input" />
                </div>

                <div class="category-filters" ref="categoryFiltersEl" @wheel="onCategoryWheel">
                    <!-- <button class="category-btn" :class="{ active: selectedCategory === 'All' }" :key="'All'"
                        @click="selectedCategory = 'All'">
                        All
                    </button> -->
                    <button v-for="category in categories" :key="category" class="category-btn"
                        :class="{ active: selectedCategory === category }" @click="selectedCategory = category">
                        {{ tCategory(category) }}
                    </button>
                </div>
            </div>
        </div>
        <!-- Main Content -->
        <div class="content-wrapper">
            <!-- Products Table Section (default left column) -->
                <div class="products-section" v-if="!isCheckoutView">
                    <div class="products-container">
                        <!-- Table Header -->
                        <div class="table-header">
                            <div class="th-image">{{ t('order.tableHeader.image') }}</div>
                            <div class="th-details">{{ t('order.tableHeader.details') }}</div>
                            <div class="th-variations">{{ t('order.tableHeader.variations') }}</div>
                            <div class="th-price">{{ t('order.tableHeader.price') }}</div>
                            <div class="th-action">{{ t('order.tableHeader.action') }}</div>
                        </div>

                        <!-- Table Body -->
                        <div class="products-list">
                            <div v-if="isLoading" class="loading-products">
                                <div class="loader"></div>
                                <p>{{ t('order.loadingProducts') }}</p>
                            </div>
                            <template v-else>
                                <RecycleScroller v-if="!isMobile" class="scroller" :items="filteredProducts" :item-size="104"
                                    key-field="id" v-slot="{ item: product }">
                                    <div v-if="product"
                                        class="product-row" :class="{
                                            'out-of-stock': !product.inStock,
                                            'in-cart': isProductInCart(product.id)
                                        }">

                                        <!-- Image -->
                                        <div class="td-image">
                                            <div class="image-wrapper">
                                                <img :src="product.image" :alt="tProduct(product, 'name')"
                                                    class="product-thumb" />
                                                <div v-if="!product.inStock" class="stock-badge">{{
                                                    t('order.outOfStock') }}</div>
                                            </div>
                                        </div>

                                        <!-- Product Info -->
                                        <div class="td-details">
                                            <span :class="['product-tag', { 'diy-tag': product.category === 'DIY Kit' }]">{{ product.category }}</span>
                                            <h3 class="product-name">{{ tProduct(product, 'name') }}</h3>
                                            <p class="product-desc">{{ tProduct(product, 'description') }}</p>
                                        </div>

                                        <!-- Variations -->
                                        <div class="td-variations" v-if="productSelections[product.id]">
                                            <template v-if="product.category === 'DIY Kit'">
                                                <span class="standard-spec-badge">{{ t('order.standard') || 'Standard' }}</span>
                                            </template>
                                            <template v-else>
                                                <select v-model="productSelections[product.id].size"
                                                    @change="updateSize(product.id, $event.target.value)"
                                                    class="variation-select" :disabled="!product.inStock">
                                                    <option v-for="(size, idx) in product.sizes" :key="size" :value="size">
                                                        {{ tArray(product, 'sizes')[idx] || size }}
                                                    </option>
                                                </select>
                                                <select v-model="productSelections[product.id].color"
                                                    @change="updateColor(product.id, $event.target.value)"
                                                    class="variation-select" :disabled="!product.inStock">
                                                    <option v-for="(color, idx) in product.colors" :key="color"
                                                        :value="color">
                                                        {{ tArray(product, 'colors')[idx] || color }}
                                                    </option>
                                                </select>
                                            </template>
                                        </div>

                                        <!-- Price -->
                                        <div class="td-price">
                                            <span class="price-currency">฿</span>
                                            <span class="price-amount">{{ product.price }}</span>
                                        </div>

                                        <!-- Action Button -->
                                        <div class="td-action">
                                            <button class="add-to-cart-btn" :disabled="!product.inStock"
                                                @click="addToCart(product)">
                                                <span class="btn-icon">+</span>
                                                {{ t('order.add') }}
                                            </button>
                                        </div>
                                    </div>
                                </RecycleScroller>
                                <div v-else>
                                    <div v-for="product in pagedProducts" :key="product.id" class="product-row" :class="{'out-of-stock': !product.inStock, 'in-cart': isProductInCart(product.id)}">
                                        <!-- Image -->
                                        <div class="td-image">
                                            <div class="image-wrapper">
                                                <img :src="product.image" :alt="tProduct(product, 'name')"
                                                    class="product-thumb" />
                                                <div v-if="!product.inStock" class="stock-badge">{{
                                                    t('order.outOfStock') }}</div>
                                            </div>
                                        </div>

                                        <!-- Product Info -->
                                        <div class="td-details">
                                            <span :class="['product-tag', { 'diy-tag': product.category === 'DIY Kit' }]">{{ product.category }}</span>
                                            <h3 class="product-name">{{ tProduct(product, 'name') }}</h3>
                                            <p class="product-desc">{{ tProduct(product, 'description') }}</p>
                                        </div>

                                        <!-- Variations -->
                                        <div class="td-variations" v-if="productSelections[product.id]">
                                            <template v-if="product.category === 'DIY Kit'">
                                                <span class="standard-spec-badge">{{ t('order.standard') || 'Standard' }}</span>
                                            </template>
                                            <template v-else>
                                                <select v-model="productSelections[product.id].size"
                                                    @change="updateSize(product.id, $event.target.value)"
                                                    class="variation-select" :disabled="!product.inStock">
                                                    <option v-for="(size, idx) in product.sizes" :key="size" :value="size">
                                                        {{ tArray(product, 'sizes')[idx] || size }}
                                                    </option>
                                                </select>
                                                <select v-model="productSelections[product.id].color"
                                                    @change="updateColor(product.id, $event.target.value)"
                                                    class="variation-select" :disabled="!product.inStock">
                                                    <option v-for="(color, idx) in product.colors" :key="color"
                                                        :value="color">
                                                        {{ tArray(product, 'colors')[idx] || color }}
                                                    </option>
                                                </select>
                                            </template>
                                        </div>

                                        <!-- Price -->
                                        <div class="td-price">
                                            <span class="price-currency">฿</span>
                                            <span class="price-amount">{{ product.price }}</span>
                                        </div>

                                        <!-- Action Button -->
                                        <div class="td-action">
                                            <button class="add-to-cart-btn" :disabled="!product.inStock"
                                                @click="addToCart(product)">
                                                <span class="btn-icon">+</span>
                                                {{ t('order.add') }}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </div>
                    </div>

                    <!-- Load more. Mobile only: the desktop scroller virtualises
                         the list and has nothing to page. -->
                    <div v-if="isMobile && !isLoading && remainingCount > 0" class="load-more-row">
                        <button class="load-more-btn" @click="loadMore">
                            {{ t('catalog.loadMore') }}
                            <span class="load-more-remaining">{{ remainingCount }}</span>
                        </button>
                    </div>

                    <!-- Empty State -->
                    <div v-if="filteredProducts.length === 0" class="empty-state">
                        <div class="empty-icon">🔍</div>
                        <h2>{{ t('order.noProductsFound') }}</h2>
                        <p>{{ t('order.adjustFilters') }}</p>
                    </div>
                </div>

                <!-- Checkout Form (replaces the product browser once checkout starts) -->
                <div class="form-col" v-else>
                    <button class="back-link" @click="exitCheckout">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        {{ tt('order.backToShopping', 'Back to shopping') }}
                    </button>

                    <!-- Shipping information -->
                    <div class="form-card">
                        <h2 class="card-title">{{ tt('order.shippingInformation', 'Shipping Information') }}</h2>

                        <div class="form-group">
                            <label>{{ t('order.fullName') }} <span class="required-star">*</span></label>
                            <input v-model="customerName" type="text" :placeholder="t('order.fullNamePlaceholder')"
                                class="form-input" required />
                        </div>

                        <div class="form-group">
                            <label>{{ t('order.phoneNumber') }} <span class="required-star">*</span></label>
                            <input v-model="phoneNumber" type="tel" :placeholder="t('order.phoneNumberPlaceholder')"
                                class="form-input" required />
                        </div>

                        <div class="form-group">
                            <label>{{ t('order.shippingAddress') }} <span class="required-star">*</span></label>
                            <textarea v-model="shippingAddress" :placeholder="t('order.shippingAddressPlaceholder')"
                                class="form-textarea" rows="3" required></textarea>
                        </div>

                        <div class="form-group">
                            <label>{{ tt('order.lineDisplayName', 'LINE display name') }}</label>
                            <input v-model="lineDisplayName" type="text"
                                :placeholder="tt('order.lineDisplayNamePlaceholder', 'So staff can reach you on LINE (optional)')"
                                class="form-input" />
                        </div>

                        <div class="form-group" :class="{ 'no-margin': !isLoggedIn }">
                            <label>{{ t('order.orderNote') }}</label>
                            <textarea v-model="orderNote" :placeholder="t('order.orderNotePlaceholder')"
                                class="form-textarea" rows="2"></textarea>
                        </div>

                        <label v-if="isLoggedIn" class="save-account-label">
                            <input type="checkbox" v-model="saveToAccount" />
                            <span>{{ tt('order.saveToAccount', 'Save these details to my account') }}</span>
                        </label>
                    </div>

                    <!-- Payment slip — shown only when slip verification is enabled -->
                    <div class="form-card" v-if="slipRequired">
                        <h2 class="card-title">{{ tt('order.paymentTitle', 'Payment') }}</h2>
                        <div class="form-group no-margin">
                            <label>{{ t('order.uploadSlip') }} <span class="required-star">*</span></label>
                            <div class="slip-upload-zone" @click="$refs.slipInput.click()">
                                <img v-if="slipPreview" :src="slipPreview" class="slip-preview-img"
                                    alt="Slip preview" />
                                <div v-else class="slip-placeholder">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8C7B6E"
                                        stroke-width="1.5">
                                        <rect x="3" y="3" width="18" height="18" rx="3" />
                                        <path d="M3 9l4-4 4 4 4-6 4 6" />
                                    </svg>
                                    <span>{{ t('order.uploadSlip') }}</span>
                                </div>
                                <input type="file" ref="slipInput" class="hidden-input" accept="image/*"
                                    @change="handleSlipUpload" />
                            </div>
                        </div>
                    </div>

                    <!-- Optional LINE connect -->
                    <div class="form-card line-connect-section">
                        <label class="line-toggle-label">
                            <input type="checkbox" v-model="lineLoginEnabled" class="line-toggle-checkbox" />
                            <span class="line-toggle-text">{{ t('order.lineConnectPrompt') }}</span>
                        </label>
                        <div v-if="lineLoginEnabled" class="line-connect-action">
                            <button v-if="!lineUserId" type="button" class="line-connect-btn"
                                @click="triggerLineLogin" :disabled="lineConnecting">
                                <svg width="18" height="18" viewBox="0 0 40 40" fill="none">
                                    <rect width="40" height="40" rx="8" fill="#06C755" />
                                    <path
                                        d="M20 8C13.4 8 8 12.5 8 18c0 3.7 2.4 6.9 6 8.8l-.8 3.9 4.5-2.4c.7.1 1.5.2 2.3.2 6.6 0 12-4.5 12-10S26.6 8 20 8z"
                                        fill="white" />
                                </svg>
                                {{ lineConnecting ? tt('order.lineConnecting', 'Connecting…') : t('order.connectLine') }}
                            </button>
                            <div v-else class="line-connected-badge">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06C755"
                                    stroke-width="2.5">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                {{ t('order.lineConnected') }}: {{ lineDisplayName }}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Shopping Cart Sidebar -->
                <div class="cart-sidebar" id="cartSidebar">
                    <div class="cart-header-modern">
                        <div class="cart-title-group">
                            <div class="cart-icon-bg">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                    stroke-width="2">
                                    <path
                                        d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4H6zM3 6h18M16 10a4 4 0 01-8 0" />
                                </svg>
                            </div>
                            <h2>{{ t('order.yourCart') }}</h2>
                            <div class="items-badge">{{ cartItemCount }} {{ t('order.items') }}</div>
                        </div>
                        <button v-if="cart.length > 0" @click="clearCart" class="clear-all-btn">{{ t('order.clearAll')
                        }}</button>
                    </div>

                    <!-- Cart Items -->
                    <div class="cart-items" v-if="cart.length > 0">
                        <div v-for="item in cart" :key="item.cartItemKey" class="cart-item-modern">
                            <img :src="item.image" :alt="item.name" class="cart-item-image" />

                            <div class="cart-item-body">
                                <div class="cart-item-top">
                                    <div class="cart-item-details">
                                        <h4>{{ item.name }}</h4>
                                        <p class="cart-item-specs">{{ item.selectedSize }} • {{ item.selectedColor }}</p>
                                    </div>
                                    <button @click="removeFromCart(item.cartItemKey)" class="remove-btn-modern">✕</button>
                                </div>
                                <div class="cart-item-bottom">
                                    <span class="cart-item-price">฿{{ item.price }}</span>
                                    <div class="quantity-controls-modern">
                                        <button @click="updateQuantity(item.cartItemKey, -1)" class="qty-btn">−</button>
                                        <span class="quantity">{{ item.quantity }}</span>
                                        <button @click="updateQuantity(item.cartItemKey, 1)" class="qty-btn">+</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Empty Cart Modern -->
                    <div v-else class="empty-cart-modern">
                        <div class="empty-cart-circle">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="1.5">
                                <circle cx="9" cy="21" r="1" />
                                <circle cx="20" cy="21" r="1" />
                                <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
                            </svg>
                        </div>
                        <h3>{{ t('order.cartEmpty') }}</h3>
                        <p>{{ t('order.cartEmptySubtitle') }}</p>
                        <router-link :to="{ name: 'catalog', params: { lang: route.params.lang || currentLang } }" class="no-style">
                            <button class="browse-collections-btn">{{ t('order.browseCollections') }}</button>
                        </router-link>
                    </div>

                    <!-- Cart Footer Modern -->
                    <div class="cart-footer-modern" v-if="cart.length > 0">
                        <div class="cart-summary-modern">
                            <div class="summary-row total">
                                <span>{{ t('order.total') }}</span>
                                <span>฿{{ cartTotal }}</span>
                            </div>
                        </div>

                        <div class="cart-actions-modern">
                            <button v-if="!isCheckoutView" @click="checkout" class="checkout-btn-modern">
                                {{ t('order.secureCheckout') }}
                            </button>
                            <button v-else @click="submitOrder" class="checkout-btn-modern"
                                :disabled="isSubmittingOrder">
                                <span v-if="!isSubmittingOrder">{{ slipRequired ? t('order.verifyAndOrder') : tt('order.placeOrder', 'Place Order') }}</span>
                                <span v-else>{{ t('order.sending') }}</span>
                            </button>
                        </div>
                    </div>

                    <!-- Bottom Trust Badges -->
                    <div class="cart-trust-badges">
                        <div class="badge-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                            {{ t('order.secureCheckout') }}
                        </div>
                        <div class="badge-dot">•</div>
                        <div class="badge-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M2 12h20M12 2a15.3 15.3 0 010 20 15.3 15.3 0 010-20z" />
                            </svg>
                            {{ t('order.globalShipping') }}
                        </div>
                    </div>
                </div>
        </div>
    </div>

    <!-- Notification Toast -->
    <transition name="slide-up">
        <div v-if="showNotification" class="notification">
            <div class="notification-content">
                <div class="notification-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                </div>
                {{ notificationMessage }}
            </div>
        </div>
    </transition>

    <!-- Mobile sticky "view cart" bar -->
    <button v-if="cart.length > 0" class="mobile-cart-bar" @click="scrollToCart">
        <span class="mcb-count">{{ cartItemCount }}</span>
        <span class="mcb-label">{{ t('order.yourCart') }}</span>
        <span class="mcb-total">฿{{ cartTotal }}</span>
    </button>

    <!-- Clear Cart Confirmation Modal -->
    <div v-if="showClearConfirm" class="checkout-overlay" @click="showClearConfirm = false">
        <div class="confirm-popup" @click.stop>
            <div class="confirm-icon-box">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path
                        d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                </svg>
            </div>
            <h3>{{ t('order.clearCartConfirm') }}</h3>
            <p>{{ t('order.clearCartSubtitle') }}</p>
            <div class="confirm-actions">
                <button class="cancel-btn" @click="showClearConfirm = false">{{ t('order.keepItems') }}</button>
                <button class="clear-confirm-btn" @click="confirmClearCart">{{ t('order.yesClearCart') }}</button>
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

/* Filter Bar Modern */
.filter-bar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 2px 5% 10px;
    margin: 0 0 6px;
}

.search-box {
    position: relative;
    width: 320px;
    flex-shrink: 0;
}

.search-input {
    width: 100%;
    padding: 11px 16px 11px 44px;
    border: 1px solid #E6E0D9;
    border-radius: 10px;
    font-size: 14px;
    color: #3D2B1F;
    background: white;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.search-input::placeholder {
    color: #A99C8F;
}

.search-input:focus {
    outline: none;
    border-color: #3D2B1F;
    box-shadow: 0 0 0 3px rgba(61, 43, 31, 0.10);
}

.search-icon {
    position: absolute;
    left: 15px;
    top: 50%;
    transform: translateY(-50%);
    color: #A99C8F;
    pointer-events: none;
}

/* Category chips — single scrolling row */
.category-filters {
    display: flex;
    flex-wrap: nowrap;
    gap: 8px;
    flex: 1;
    min-width: 0;
    overflow-x: auto;
    padding: 4px 2px;
    scrollbar-width: none;
    -ms-overflow-style: none;
    -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 36px), transparent);
    mask-image: linear-gradient(to right, #000 calc(100% - 36px), transparent);
}

.category-filters::-webkit-scrollbar {
    display: none;
}

.category-btn {
    flex-shrink: 0;
    white-space: nowrap;
    padding: 8px 16px;
    border: 1px solid #E6E0D9;
    background: white;
    border-radius: 999px;
    cursor: pointer;
    font-weight: 500;
    font-size: 13px;
    color: #7A6A5C;
    transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.category-btn:hover {
    border-color: #C9B8A8;
    color: #3D2B1F;
    background: #FCF9F5;
}

.category-btn.active {
    background: #3D2B1F;
    color: white;
    border-color: #3D2B1F;
    box-shadow: 0 2px 8px rgba(61, 43, 31, 0.18);
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

/* Products Section */
.products-container {
    background: white;
    /* border-radius: 20px; */
    border: 1px solid #F4EDE6;
    overflow: hidden;
}

.table-header {
    display: grid;
    grid-template-columns: 84px minmax(0, 2.2fr) 150px 88px 104px;
    gap: 16px;
    align-items: center;
    padding: 14px 24px;
    background: #F9F5F0;
    border-bottom: 1px solid #F4EDE6;
    color: #8C7B6E;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.05em;
}

.scroller {
    height: 700px;
}

.product-row {
    display: grid;
    grid-template-columns: 84px minmax(0, 2.2fr) 150px 88px 104px;
    gap: 16px;
    padding: 14px 24px;
    border-bottom: 1px solid #F4EDE6;
    align-items: center;
    transition: background 0.3s ease;
    height: 104px;
    box-sizing: border-box;
}

/* Item already in cart — subtle accent so it's obvious */
.product-row.in-cart {
    background: #FBF7F2;
    box-shadow: inset 3px 0 0 #DD876E;
}

.product-row:last-child {
    border-bottom: none;
}

.product-row:hover {
    background: #FCFAF8;
}

.image-wrapper {
    width: 72px;
    height: 72px;
    background: #F9F5F0;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.product-thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.td-details {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
}

.product-tag {
    display: inline-block;
    width: fit-content;
    padding: 3px 8px;
    background: #E0F7F9;
    color: #4DB6C1;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    border-radius: 4px;
    letter-spacing: 0.05em;
}

.product-tag.diy-tag {
    background: #F5EFEB;
    color: #8b6f47;
}

.standard-spec-badge {
    display: inline-block;
    width: 120px;
    padding: 6px 10px;
    background: #F9F5F0;
    color: #8C7B6E;
    font-size: 12px;
    font-weight: 500;
    border-radius: 8px;
    text-align: center;
    border: 1px solid #E6E0D9;
    box-sizing: border-box;
}

.product-name {
    font-family: 'Crimson Pro', serif;
    font-size: 16px;
    font-weight: 700;
    color: #3D2B1F;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
}

.product-desc {
    font-size: 12px;
    color: #8C7B6E;
    line-height: 1.4;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
}

.td-variations {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.variation-select {
    width: 120px;
    padding: 6px 10px;
    border: 1px solid #E6E0D9;
    border-radius: 8px;
    font-size: 13px;
    color: #3D2B1F;
    background: white;
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238C7B6E' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
}

.td-price {
    display: flex;
    align-items: baseline;
    gap: 2px;
}

.price-currency {
    font-family: 'Crimson Pro', serif;
    font-size: 14px;
    font-weight: 700;
}

.price-amount {
    font-family: 'Crimson Pro', serif;
    font-size: 19px;
    font-weight: 700;
}

.add-to-cart-btn {
    padding: 9px 16px;
    background: #3D2B1F;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s ease;
}

.add-to-cart-btn:hover:not(:disabled) {
    background: #543D2F;
}

.add-to-cart-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* Loading State */
.loading-products {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 100px 0;
    width: 100%;
}

.loader {
    width: 48px;
    height: 48px;
    border: 5px solid #E6E0D9;
    border-bottom-color: #3D2B1F;
    border-radius: 50%;
    display: inline-block;
    box-sizing: border-box;
    animation: rotation 1s linear infinite;
    margin-bottom: 20px;
}

@keyframes rotation {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}

.loading-products p {
    color: #8C7B6E;
    font-style: italic;
}

/* Empty State */
/* Load more (mobile list only) */
.load-more-row {
    display: flex;
    justify-content: center;
    padding: 16px 0 4px;
}

.load-more-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    min-height: 48px;
    padding: 0 24px;
    border: 1px solid #E6E0D9;
    border-radius: 999px;
    background: white;
    color: #7A6A5C;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.load-more-btn:hover {
    background: #3D2B1F;
    border-color: #3D2B1F;
    color: white;
}

.load-more-btn:hover .load-more-remaining {
    background: rgba(255, 255, 255, 0.22);
    color: white;
}

.load-more-remaining {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 20px;
    padding: 0 6px;
    border-radius: 10px;
    background: #F9F5F0;
    color: #8C7B6E;
    font-size: 11px;
    font-weight: 700;
    transition: background-color 0.2s ease, color 0.2s ease;
}

.empty-state {
    padding: 60px 40px;
    text-align: center;
    background: white;
    border-radius: 20px;
    border: 1px dashed #E6E0D9;
    margin-top: 20px;
}

.empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
}

.empty-state h2 {
    font-family: 'Crimson Pro', serif;
    font-size: 28px;
    color: #3D2B1F;
    margin: 0 0 12px 0 !important;
}

.empty-state p {
    color: #8C7B6E;
    font-size: 16px;
    margin: 0 !important;
}

/* Cart Sidebar Modern */
.cart-sidebar {
    background: #F9F5F0;
    border-radius: 16px;
    padding: 20px;
    position: sticky;
    top: 24px;
}

.cart-header-modern {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.cart-title-group {
    display: flex;
    align-items: center;
    gap: 12px;
}

.cart-icon-bg {
    width: 34px;
    height: 34px;
    background: #E6E0D9;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #3D2B1F;
    flex-shrink: 0;
}

.cart-header-modern h2 {
    font-family: 'Crimson Pro', serif;
    font-size: 18px;
    font-weight: 700;
    margin: 0;
}

.items-badge {
    font-size: 10px;
    font-weight: 700;
    color: #8C7B6E;
    background: #E6E0D9;
    padding: 4px 8px;
    border-radius: 10px;
}

/* Empty Cart Modern */
.empty-cart-modern {
    text-align: center;
    padding: 60px 0;
}

.empty-cart-circle {
    width: 80px;
    height: 80px;
    background: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 24px;
    color: #E6E0D9;
}

.empty-cart-modern h3 {
    font-family: 'Crimson Pro', serif;
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 12px 0;
}

.empty-cart-modern p {
    font-size: 14px;
    color: #8C7B6E;
    line-height: 1.6;
    margin: 0 0 30px 0;
}

.browse-collections-btn {
    width: 100%;
    padding: 16px;
    background: #3D2B1F;
    color: white;
    border: none;
    border-radius: 12px;
    font-weight: 700;
    font-size: 16px;
    cursor: pointer;
    transition: background 0.3s ease;
}

.browse-collections-btn:hover {
    background: #543D2F;
}

.clear-all-btn {
    background: none;
    border: none;
    color: #8C7B6E;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    text-decoration: underline;
    letter-spacing: 0.5px;
    padding: 0;
}

.clear-all-btn:hover {
    color: #3D2B1F;
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

/* Cart Trust Badges */
.cart-trust-badges {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    margin-top: 18px;
    padding-top: 16px;
    border-top: 1px solid #E6E0D9;
}

.badge-item {
    font-size: 10px;
    font-weight: 700;
    color: #B2A69B;
    display: flex;
    align-items: center;
    gap: 6px;
}

.badge-dot {
    color: #B2A69B;
    font-size: 10px;
}

/* Cart Item Card */
.cart-item-modern {
    display: grid;
    grid-template-columns: 48px 1fr;
    gap: 12px;
    padding: 12px;
    background: white;
    border-radius: 12px;
    margin-bottom: 10px;
}

.cart-item-image {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    object-fit: cover;
    background: #F9F5F0;
}

.cart-item-body {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.cart-item-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
}

.cart-item-details {
    min-width: 0;
}

.cart-item-details h4 {
    font-size: 13px;
    font-weight: 700;
    margin: 0 0 2px 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.cart-item-specs {
    font-size: 11px;
    color: #8C7B6E;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.cart-item-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.cart-item-price {
    font-weight: 700;
    font-size: 14px;
    color: #3D2B1F;
}

.quantity-controls-modern {
    display: flex;
    align-items: center;
    gap: 8px;
}

.qty-btn {
    width: 24px;
    height: 24px;
    border: 1px solid #E6E0D9;
    background: #FBF7F2;
    color: #3D2B1F;
    border-radius: 6px;
    font-size: 15px;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
}

.qty-btn:hover {
    background: #DD876E;
    border-color: #DD876E;
    color: #fff;
}

.quantity {
    min-width: 20px;
    text-align: center;
    font-size: 13px;
    font-weight: 700;
    color: #3D2B1F;
}

.remove-btn-modern {
    background: none;
    border: none;
    color: #B2A69B;
    cursor: pointer;
    font-size: 12px;
    line-height: 1;
    padding: 2px;
    flex-shrink: 0;
    transition: color 0.2s ease;
}

.remove-btn-modern:hover {
    color: #D63031;
}

/* Cart Footer Summary */
.cart-footer-modern {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #E6E0D9;
}

.cart-summary-modern {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
}

.summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    color: #8C7B6E;
}

.summary-row.total {
    margin-top: 8px;
    padding-top: 12px;
    border-top: 1px dashed #E6E0D9;
    font-size: 16px;
    font-weight: 700;
    color: #3D2B1F;
}

.checkout-btn-modern:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
}

/* ---- In-place checkout form (left column) ---- */
.form-col {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.back-link {
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    gap: 6px;
    background: none;
    border: none;
    color: #8C7B6E;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
    transition: color 0.2s ease;
}

.back-link:hover {
    color: #3D2B1F;
}

.form-card {
    background: white;
    border: 1px solid #F4EDE6;
    border-radius: 16px;
    padding: 24px;
}

.card-title {
    font-family: 'Crimson Pro', serif;
    font-size: 20px;
    font-weight: 700;
    color: #3D2B1F;
    margin: 0 0 18px 0;
}

.form-group {
    margin-bottom: 16px;
}

.form-group.no-margin {
    margin-bottom: 0;
}

.form-group label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #3D2B1F;
    margin-bottom: 8px;
}

.form-input,
.form-textarea {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid #E6E0D9;
    border-radius: 8px;
    font-family: 'Work Sans', sans-serif;
    font-size: 14px;
    color: #3D2B1F;
    background: white;
    box-sizing: border-box;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-textarea {
    resize: vertical;
}

.form-input:focus,
.form-textarea:focus {
    outline: none;
    border-color: #3D2B1F;
    box-shadow: 0 0 0 3px rgba(61, 43, 31, 0.10);
}

.required-star {
    color: #d63031;
    margin-left: 2px;
}

.field-hint {
    font-size: 12px;
    color: #8C7B6E;
    line-height: 1.4;
    margin: -2px 0 12px;
}

.save-account-label {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 14px;
    font-size: 13px;
    color: #7A6A5C;
    cursor: pointer;
    user-select: none;
}

.save-account-label input {
    width: auto;
    margin: 0;
    flex-shrink: 0;
}

.hidden-input {
    display: none;
}

/* Slip upload */
.slip-upload-zone {
    border: 2px dashed #E6E0D9;
    border-radius: 12px;
    background: #FDFAF7;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 120px;
    overflow: hidden;
    transition: border-color 0.2s;
}

.slip-upload-zone:hover {
    border-color: #8C7B6E;
}

.slip-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: #8C7B6E;
    font-size: 13px;
    padding: 20px;
}

.slip-preview-img {
    width: 100%;
    max-height: 240px;
    object-fit: contain;
}

/* LINE connect */
.line-connect-section {
    background: #F0FFF6;
    border: 1px solid #C3EFD4;
}

.line-toggle-label {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    cursor: pointer;
    font-weight: 500;
    font-size: 14px;
    color: #2d6a4f;
    user-select: none;
}

.line-toggle-checkbox {
    width: auto;
    margin-top: 2px;
    flex-shrink: 0;
}

.line-toggle-text {
    line-height: 1.4;
}

.line-connect-action {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #C3EFD4;
}

.line-connect-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #06C755;
    color: white;
    border: none;
    padding: 10px 18px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s;
}

.line-connect-btn:hover {
    background: #05a847;
}

.line-connect-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.line-connected-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 600;
    color: #2d6a4f;
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

/* Responsive Modern */
@media (max-width: 1100px) {
    .content-wrapper {
        grid-template-columns: 1fr;
    }

    .cart-sidebar {
        position: static;
    }
}

@media (max-width: 768px) {
    .secondary-navbar {
        gap: 20px;
    }

    .header-content h1 {
        font-size: 28px;
    }

    .filter-bar {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
    }

    .search-box {
        width: 100%;
    }

    .category-filters {
        -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent);
        mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent);
    }

    .table-header {
        display: none;
    }

    .scroller {
        height: 600px;
    }

    .product-row {
        display: grid;
        grid-template-columns: 80px 1fr auto;
        grid-template-rows: auto auto;
        height: auto;
        min-height: unset;
        padding: 12px;
        gap: 10px;
    }

    .product-desc{
        font-size: 12px !important;
    }

    /* Fix 1: shrink image to fit its column */
    .image-wrapper {
        width: 80px;
        height: 80px;
    }

    /* Fix 2: prevent grid children from overflowing */
    .td-details,
    .td-variations {
        min-width: 0;
        /* font-size: 6px !important; */
    }

    /* Fix 3: stack variations vertically, full width selects */
    .td-variations {
        flex-direction: row;
    }

    .variation-select,
    .standard-spec-badge {
        width: 100%;
        font-size: 12px !important;
        padding: 5px 10px;
    }

    /* Fix 4: shrink button text on mobile */
    .add-to-cart-btn {
        padding: 8px 10px;
        font-size: 12px;
        white-space: nowrap;
    }

    .td-image { grid-column: 1; grid-row: 1 / 3; }
    .td-details { grid-column: 2; grid-row: 1; }
    .td-variations { grid-column: 2; grid-row: 2; }
    .td-price { grid-column: 3; grid-row: 1; align-self: end; }
    .td-action { grid-column: 3; grid-row: 2; align-self: end; }
}

@media (max-width: 480px) {
    .td-variations {
        flex: 1 1 100%;
    }

    .variation-select,
    .standard-spec-badge {
        max-width: 130px;
    }

    .add-to-cart-btn {
        padding: 7px 10px;
        font-size: 12px;
    }
}

/* Shared modal overlay (used by the clear-cart confirmation) */
.checkout-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(61, 43, 31, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10002;
    padding: 20px;
}

.cancel-btn {
    flex: 1;
    padding: 14px;
    background: white;
    border: 1px solid #E6E0D9;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
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

/* Notification Popup Modern */
.notification {
    position: fixed;
    bottom: 40px;
    left: 40px;
    background: white;
    color: #3D2B1F;
    padding: 30px 40px;
    border-radius: 20px;
    box-shadow: 0 25px 60px rgba(61, 43, 31, 0.25);
    z-index: 100000;
    /* Extremely high z-index to stay on top */
    font-weight: 700;
    font-size: 18px;
    text-align: center;
    border: 1px solid #E6E0D9;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    min-width: 340px;
    max-width: 90%;
    pointer-events: auto;
    /* Allow interactions if needed, though mostly for display */
}

.notification-icon {
    width: 56px;
    height: 56px;
    background: #E0F7F9;
    color: #4DB6C1;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 4px;
}

.notification-content {
    line-height: 1.4;
}

/* Slide Up Transition for Notification */
.slide-up-enter-active {
    animation: notification-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

.slide-up-leave-active {
    animation: notification-pop 0.4s cubic-bezier(0.6, -0.28, 0.735, 0.045) reverse forwards;
}

@keyframes notification-pop {
    0% {
        transform: translateY(20px) scale(0.85);
        opacity: 0;
    }

    100% {
        transform: translateY(0) scale(1);
        opacity: 1;
    }
}

@media (max-width: 480px) {
    .notification {
        left: 20px;
        bottom: 20px;
        min-width: 0;
        width: calc(100% - 40px);
        padding: 20px;
        font-size: 16px;
    }
}

/* Confirmation Popup */
.confirm-popup {
    background: white;
    border-radius: 24px;
    padding: 40px;
    max-width: 400px;
    width: 90%;
    text-align: center;
    box-shadow: 0 20px 60px rgba(61, 43, 31, 0.3);
    animation: modalPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.confirm-icon-box {
    width: 70px;
    height: 70px;
    background: #FFF5F5;
    color: #FF7675;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 24px;
}

.confirm-popup h3 {
    font-family: 'Crimson Pro', serif;
    font-size: 24px;
    font-weight: 700;
    color: #3D2B1F;
    margin: 0 0 12px 0;
}

.confirm-popup p {
    font-size: 14px;
    color: #8C7E71;
    line-height: 1.6;
    margin: 0 0 30px 0;
}

.confirm-actions {
    display: flex;
    gap: 12px;
}

.clear-confirm-btn {
    flex: 1;
    padding: 14px;
    background: #FF7675;
    color: white;
    border: none;
    border-radius: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s ease;
}

.clear-confirm-btn:hover {
    background: #D63031;
    transform: translateY(-2px);
}

@keyframes modalPop {
    from {
        transform: scale(0.9);
        opacity: 0;
    }

    to {
        transform: scale(1);
        opacity: 1;
    }
}

/* Mobile sticky "view cart" bar */
.mobile-cart-bar {
    display: none;
}

@media (max-width: 1100px) {
    .mobile-cart-bar {
        display: flex;
        align-items: center;
        gap: 12px;
        position: fixed;
        left: 16px;
        right: 16px;
        bottom: 16px;
        z-index: 9000;
        padding: 14px 18px;
        border: none;
        border-radius: 14px;
        background: linear-gradient(135deg, #DD876E, #e6957c);
        color: #fff;
        font-weight: 700;
        font-size: 15px;
        cursor: pointer;
        box-shadow: 0 8px 24px rgba(221, 135, 110, 0.4);
    }

    .mcb-count {
        min-width: 24px;
        height: 24px;
        padding: 0 6px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.25);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
    }

    .mcb-label {
        flex: 1;
        text-align: left;
    }

    .mcb-total {
        font-size: 16px;
    }
}

</style>
