<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api, API_URL, getDiyImageUrl } from '../services/api'
import { useProducts } from '../composables/useProducts';
import { cartStore } from '../stores/cartStore';
import { authStore } from '../stores/authStore';
import { codeToPath, defaultLang } from '@/utils/localeRoutes';

const route = useRoute();
const currentLang = computed(() => route.params.lang || defaultLang);
const { t, te, locale } = useI18n()

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
        inStock: p.stock !== undefined ? p.stock > 0 : true,
        image: p.image_key ? `${API_URL}/images/${p.image_key}-thumb.webp` : 'https://via.placeholder.com/100x100/F9F5F0/3D2B1F?text=Product'
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
        inStock: p.stock !== undefined ? p.stock > 0 : true,
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
    fetchOrders()
})

const cart = computed(() => cartStore.cart)
const searchQuery = ref('')
const selectedCategory = ref('All')
const showCart = ref(false)
const showNotification = ref(false)
const notificationMessage = ref('')
const showCheckoutPopup = ref(false)
const showClearConfirm = ref(false)
const customerName = ref(authStore.user?.businessName || authStore.user?.ownerName || '')
const paymentMethod = ref('Bank Transfer')
const orderNote = ref('')
const isSubmittingOrder = ref(false)
const activeTab = ref('new-order')
const showOrderDetails = ref(false)
const selectedOrder = ref(null)

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
            image: order.items && order.items.length > 0 ? getProductImage(order.items[0].product_id) : 'https://via.placeholder.com/100x100/F9F5F0/3D2B1F?text=Order'
        }))
    } catch (error) {
        console.error('Error fetching orders:', error)
    } finally {
        isFetchingOrders.value = false
    }
}

// Helper to get image for a product ID
const getProductImage = (productId) => {
    const product = products.value.find(p => p.id === productId);
    const key = product ? (product.image_key || product.image) : null;

    if (!key) {
        if (typeof productId === 'string' && productId.startsWith('diy-')) {
            return 'https://m.media-amazon.com/images/I/610a5LpNbTL.jpg';
        }
        return 'https://via.placeholder.com/100x100/F9F5F0/3D2B1F?text=Product';
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

// Recommendations data
const recommendations = ref([])

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

// Cart calculations
const cartTotal = computed(() => cartStore.cartTotal)
const cartItemCount = computed(() => cartStore.cartItemCount)

// Add to cart with selected size and color
const addToCart = (product) => {
    if (!product.inStock) {
        showNotificationMsg(t('order.outOfStock'))
        return
    }

    const selection = productSelections.value[product.id]

    // Total already in cart for this product (across all size/color combos)
    const totalInCart = cart.value
        .filter(i => i.id === product.id)
        .reduce((sum, i) => sum + i.quantity, 0)

    if (product.stock !== undefined && product.stock !== null && totalInCart >= product.stock) {
        showNotificationMsg(t('order.outOfStock')) // Or a more specific message if available
        return
    }

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
        if (delta > 0) {
            // Check stock limit
            const product = products.value.find(p => p.id === item.id)
            const totalInCart = cart.value
                .filter(i => i.id === item.id)
                .reduce((sum, i) => sum + i.quantity, 0)
            if (product && product.stock !== undefined && product.stock !== null && totalInCart >= product.stock) {
                showNotificationMsg(t('order.outOfStock'))
                return
            }
        }
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

// Checkout
const checkout = () => {
    if (cart.value.length === 0) {
        showNotificationMsg(t('order.cartEmptyError'))
        return
    }

    // Open checkout popup instead of immediate alert
    showCheckoutPopup.value = true
}

const closeCheckoutPopup = () => {
    showCheckoutPopup.value = false
}

const generateOrderId = () => {
    const now = new Date()
    const year = now.getFullYear()
    const random = Math.floor(Math.random() * 99999).toString().padStart(5, '0')
    return `WH-${year}-${random}`
}

const formatOrderMessage = (orderId) => {
    let message = `🧾 New Order (Website)\n`
    message += `รหัส Order: ${orderId}\n`
    message += `ชื่อลูกค้า: ${customerName.value || 'Guest'}\n\n`

    cart.value.forEach((item, index) => {
        message += `${index + 1}) ${item.name}\n`
        message += `   ขนาด: ${item.selectedSize} | สี: ${item.selectedColor}\n`
        message += `   จำนวน: ${item.quantity}\n`
        message += `   ชิ้น: ${item.price.toFixed(2)}\n`
        message += `   ราคารวม: ${(item.price * item.quantity).toFixed(2)}\n\n`
    })

    message += `รวมทั้งหมด: ${cartTotal.value.toFixed(2)}\n`
    message += `วิธีการชำระเงิน: ${paymentMethod.value}\n`
    if (orderNote.value) {
        message += `หมายเหตุ: ${orderNote.value}\n`
    }

    return message
}

const submitOrder = async () => {
    if (!customerName.value.trim()) {
        showNotificationMsg(t('order.pleaseEnterName'))
        return
    }
    isSubmittingOrder.value = true
    const orderId = generateOrderId()

    try {
        console.log('start try catch')
        const orderMessage = formatOrderMessage(orderId)
        console.log(orderMessage)

        // Prepare structured data for persistence
        const orderData = {
            id: orderId,
            customerName: customerName.value,
            customerId: authStore.user?.id || null,
            totalAmount: cartTotal.value,
            paymentMethod: paymentMethod.value,
            note: orderNote.value,
            cartItems: cart.value.map(item => ({
                id: item.id,
                name: item.name,
                selectedSize: item.selectedSize,
                selectedColor: item.selectedColor,
                quantity: item.quantity,
                price: item.price
            }))
        }

        const result = await api.submitOrder(orderMessage, orderData)
        console.log(result.message)
        if (result.status === 200 || result.success || result.message === 'ok') {
            showNotificationMsg(t('order.orderSuccess'))
            cartStore.clearCart()
            customerName.value = ''
            paymentMethod.value = 'Bank Transfer'
            orderNote.value = ''
            showCheckoutPopup.value = false

            // Refresh order history
            fetchOrders()
        } else {
            throw new Error(result.error || 'Failed to send order')
        }
    } catch (error) {
        console.error('Error sending order:', error)
        showNotificationMsg(t('order.orderFailed'))
    } finally {
        isSubmittingOrder.value = false
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

// Toggle cart
const toggleCart = () => {
    showCart.value = !showCart.value
}

const isProductInCart = (productId) => {
    return cart.value.some(item => item.id === productId)
}

const selectOrderDetails = (order) => {
    selectedOrder.value = order
    showOrderDetails.value = true
}

const closeOrderDetails = () => {
    showOrderDetails.value = false
    selectedOrder.value = null
}



</script>

<template>
    <div class="order-page">
        <!-- Page Header -->
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

            <!-- Action Buttons (Logout & Cart) -->
            <div class="header-actions">

                <button class="cart-toggle mobile-only" @click="toggleCart">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4H6zM3 6h18M16 10a4 4 0 01-8 0" />
                    </svg>
                    <span v-if="cartItemCount > 0" class="cart-badge">{{ cartItemCount }}</span>
                </button>
            </div>
        </div>

        <!-- Secondary Navbar -->
        <div class="secondary-navbar">
            <button class="nav-item" :class="{ active: activeTab === 'new-order' }" @click="activeTab = 'new-order'">
                {{ t('order.newOrder') }}
            </button>
            <button class="nav-item" :class="{ active: activeTab === 'track-orders' }"
                @click="activeTab = 'track-orders'">
                {{ t('order.trackOrders') }}
            </button>
        </div>

        <!-- Search & Filter Bar (Only for New Order) -->
        <div v-if="activeTab === 'new-order'" class="filter-bar">
            <div class="search-box">
                <svg class="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="2" />
                    <path d="M14 14L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                </svg>
                <input v-model="searchQuery" type="text" :placeholder="t('order.searchPlaceholder')"
                    class="search-input" />
            </div>

            <div class="category-filters">
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

        <!-- Main Content -->
        <div class="content-wrapper">
            <!-- Products Table Section -->
            <template v-if="activeTab === 'new-order'">
                <div class="products-section">
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
                                <RecycleScroller class="scroller" :items="filteredProducts" :item-size="160"
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
                            </template>
                        </div>
                    </div>

                    <!-- Empty State -->
                    <div v-if="filteredProducts.length === 0" class="empty-state">
                        <div class="empty-icon">🔍</div>
                        <h2>{{ t('order.noProductsFound') }}</h2>
                        <p>{{ t('order.adjustFilters') }}</p>
                    </div>
                </div>

                <!-- Shopping Cart Sidebar -->
                <div class="cart-sidebar" :class="{ 'show': showCart }">
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
                        <!-- <button class="close-cart mobile-only" @click="toggleCart">✕</button> -->
                    </div>

                    <!-- Cart Items -->
                    <div class="cart-items" v-if="cart.length > 0">
                        <div v-for="item in cart" :key="item.cartItemKey" class="cart-item-modern">
                            <img :src="item.image" :alt="item.name" class="cart-item-image" />

                            <div class="cart-item-details">
                                <h4>{{ item.name }}</h4>
                                <p class="cart-item-specs">{{ item.selectedSize }} • {{ item.selectedColor }}</p>
                                <p class="cart-item-price">฿{{ item.price }}</p>
                            </div>

                            <div class="quantity-controls-modern">
                                <button @click="updateQuantity(item.cartItemKey, -1)" class="qty-btn">−</button>
                                <span class="quantity">{{ item.quantity }}</span>
                                <button @click="updateQuantity(item.cartItemKey, 1)" class="qty-btn">+</button>
                            </div>

                            <button @click="removeFromCart(item.cartItemKey)" class="remove-btn-modern">✕</button>
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
                            <div style="display: flex; justify-content: center; gap: 2rem;">
                                <div class="summary-row">
                                    <span>{{ t('order.subtotal') }}</span>
                                    <span> ฿{{ cartTotal }}</span>
                                </div>
                                <div class="summary-row">
                                    <span>{{ t('order.delivery') }}</span>
                                    <span> ฿30</span>
                                </div>
                            </div>
                            <div class="summary-row total">
                                <span>{{ t('order.total') }}</span>
                                <span> ฿{{ cartTotal + 30 }}</span>
                            </div>
                        </div>

                        <div class="cart-actions-modern">
                            <button @click="checkout" class="checkout-btn-modern">
                                {{ t('order.secureCheckout') }}
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
            </template>

            <!-- Track Orders View -->
            <template v-else>
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
                                @click="activeTab = 'new-order'">{{ t('order.shopNow') }}</button>
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

                <!-- Sidebar for Track Orders -->
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
            </template>
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

    <!-- Cart Overlay (Mobile) -->
    <div v-if="showCart" class="cart-overlay mobile-only" @click="toggleCart"></div>

    <!-- Checkout Popup -->
    <div v-if="showCheckoutPopup" class="checkout-overlay" @click="closeCheckoutPopup">
        <div class="checkout-popup" @click.stop>
            <button class="popup-close-btn" @click="closeCheckoutPopup">✕</button>

            <div class="popup-header">
                <h2>{{ t('order.completeOrder') }}</h2>
                <p>{{ t('order.completeOrderSubtitle') }}</p>
            </div>

            <div class="popup-body">

                <!-- Order Summary -->
                <div class="order-summary-section">
                    <div class="order-summary-header">
                        <h3>{{ t('order.orderSummary') }}</h3>
                        <h3>{{ t('order.qty') }}</h3>
                        <h3>{{ t('order.price') }}</h3>
                        <h3>{{ t('order.total') }}</h3>
                    </div>
                    <div class="summary-items">
                        <div v-for="item in cart" :key="item.cartItemKey" class="summary-item">
                            <div class="summary-item-info">
                                <strong>{{ item.name }}</strong>
                                <span class="summary-specs">{{ item.selectedSize }} • {{ item.selectedColor
                                }}</span>
                            </div>
                            <div class="summary-item-quantity">
                                <span>x {{ item.quantity }}</span>
                            </div>
                            <div class="summary-item-price">
                                <span>{{ item.price }}</span>
                            </div>
                            <div class="summary-item-total">
                                <strong>{{ item.quantity * item.price }} ฿</strong>
                            </div>
                        </div>
                    </div>

                    <div class="summary-total">
                        <div class="total-row">
                            <span>{{ t('order.subtotal') }}</span>
                            <span>฿{{ cartTotal }}</span>
                        </div>
                        <div class="total-row">
                            <span>{{ t('order.delivery') }}</span>
                            <span>฿30</span>
                        </div>
                        <div class="total-row grand-total">
                            <span>{{ t('order.grandTotal') }}</span>
                            <span>฿{{ cartTotal + 30 }}</span>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label>{{ t('order.fullName') }}</label>
                    <input v-model="customerName" type="text" :placeholder="t('order.fullNamePlaceholder')"
                        class="form-input" required />
                </div>

                <div class="form-group">
                    <label>{{ t('order.orderNote') }}</label>
                    <textarea v-model="orderNote" :placeholder="t('order.orderNotePlaceholder')" class="form-textarea"
                        rows="3"></textarea>
                </div>
            </div>

            <div class="popup-footer">
                <button @click="closeCheckoutPopup" class="cancel-btn">{{ t('order.cancel') }}</button>
                <button @click="submitOrder" class="submit-order-btn" :disabled="isSubmittingOrder">
                    <span v-if="!isSubmittingOrder">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                                stroke="currentColor" stroke-width="2" />
                        </svg>
                        {{ t('order.sendToLine') }}
                    </span>
                    <span v-else>{{ t('order.sending') }}</span>
                </button>
            </div>
        </div>
    </div>

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
    padding: 20px 5% 20px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
}

.header-content h1 {
    font-family: 'Crimson Pro', serif;
    font-size: 48px;
    font-weight: 700;
    margin: 0;
    color: #3D2B1F;
}

.header-content p {
    font-size: 16px;
    margin: 0;
    color: #8C7B6E;
}

/* Filter Bar Modern */
.filter-bar {
    max-width: 1400px;
    margin: 0 auto 40px;
    padding: 0 5%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
}

.search-box {
    display: flex;
    position: relative;
    width: 300px;
}

.search-input {
    width: 100%;
    padding: 12px 16px 12px 44px;
    border: 1px solid #E6E0D9;
    border-radius: 8px;
    font-size: 14px;
    background: white;
    transition: all 0.3s ease;
}

.search-input:focus {
    outline: none;
    border-color: #3D2B1F;
}

.search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #8C7B6E;
    pointer-events: none;
}

.category-filters {
    display: flex;
    gap: 8px;
}

.category-btn {
    padding: 8px 16px;
    border: 1px solid #E6E0D9;
    background: white;
    border-radius: 20px;
    cursor: pointer;
    font-weight: 500;
    font-size: 14px;
    color: #8C7B6E;
    transition: all 0.3s ease;
}

.category-btn.active {
    background: #3D2B1F;
    color: white;
    border-color: #3D2B1F;
}

/* Content Wrapper */
.content-wrapper {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 5%;
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 40px;
    align-items: start;
}

/* Products Section */
.products-container {
    background: white;
    border-radius: 20px;
    border: 1px solid #F4EDE6;
    overflow: hidden;
}

.table-header {
    display: grid;
    grid-template-columns: 140px 2fr 180px 100px 120px;
    padding: 20px 30px;
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
    grid-template-columns: 140px 2fr 180px 100px 120px;
    padding: 20px 30px;
    border-bottom: 1px solid #F4EDE6;
    align-items: center;
    transition: background 0.3s ease;
    height: 160px;
    box-sizing: border-box;
}

.product-row:last-child {
    border-bottom: none;
}

.product-row:hover {
    background: #FCFAF8;
}

.image-wrapper {
    width: 100px;
    height: 100px;
    background: #F9F5F0;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.product-thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.td-details {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.product-tag {
    display: inline-block;
    width: fit-content;
    padding: 4px 10px;
    background: #E0F7F9;
    color: #4DB6C1;
    font-size: 10px;
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
    width: 140px;
    padding: 8px 12px;
    background: #F9F5F0;
    color: #8C7B6E;
    font-size: 13px;
    font-weight: 500;
    border-radius: 8px;
    text-align: center;
    border: 1px solid #E6E0D9;
    box-sizing: border-box;
}

.product-name {
    font-family: 'Crimson Pro', serif;
    font-size: 20px;
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
    font-size: 14px;
    color: #8C7B6E;
    line-height: 1.5;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
}

.td-variations {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.variation-select {
    width: 140px;
    padding: 8px 12px;
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
    font-size: 18px;
    font-weight: 700;
}

.price-amount {
    font-family: 'Crimson Pro', serif;
    font-size: 24px;
    font-weight: 700;
}

.add-to-cart-btn {
    padding: 10px 20px;
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
    border-radius: 20px;
    padding: 30px;
    position: sticky;
    top: 40px;
}

.cart-header-modern {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
}

.cart-title-group {
    display: flex;
    align-items: center;
    gap: 12px;
}

.cart-icon-bg {
    width: 40px;
    height: 40px;
    background: #E6E0D9;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #3D2B1F;
}

.cart-header-modern h2 {
    font-family: 'Crimson Pro', serif;
    font-size: 20px;
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
    padding: 16px;
    background: #3D2B1F;
    color: white;
    border: none;
    border-radius: 12px;
    font-weight: 700;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.checkout-btn-modern:hover {
    background: #543D2F;
    transform: translateY(-2px);
}

/* Cart Trust Badges */
.cart-trust-badges {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    margin-top: 30px;
    padding-top: 20px;
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

/* Existing Cart Item Styles Updated */
.cart-item-modern {
    display: flex;
    gap: 12px;
    padding: 16px;
    background: white;
    border-radius: 12px;
    margin-bottom: 12px;
    position: relative;
}

.cart-item-image {
    width: 60px;
    height: 60px;
    border-radius: 8px;
    object-fit: cover;
}

.cart-item-details h4 {
    font-size: 14px;
    font-weight: 700;
    margin: 0 0 4px 0;
}

.cart-item-specs {
    font-size: 12px;
    color: #8C7B6E;
    margin: 0 0 4px 0;
}

.cart-item-price {
    font-weight: 700;
    font-size: 14px;
}

.quantity-controls-modern {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 8px;
}

.remove-btn-modern {
    position: absolute;
    top: 10px;
    right: 10px;
    background: none;
    border: none;
    color: #B2A69B;
    cursor: pointer;
    font-size: 12px;
}

/* Secondary Navbar */
.secondary-navbar {
    display: flex;
    gap: 40px;
    padding: 0 5%;
    background: #FBF7F2;
    border-bottom: 1px solid #E6E0D9;
    margin-bottom: 30px;
}

.nav-item {
    background: none;
    border: none;
    padding: 20px 0;
    font-family: 'Work Sans', sans-serif;
    font-size: 14px;
    font-weight: 700;
    color: #8C7E71;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 1px;
    position: relative;
    transition: all 0.3s ease;
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
    background: #8C7E71;
}

/* History Section */
.history-section {
    flex: 1;
    background: white;
    border-radius: 20px;
    padding: 40px;
    box-shadow: 0 4px 20px rgba(61, 43, 31, 0.05);
}

.history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
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
    border-radius: 16px;
    padding: 24px;
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
    gap: 20px;
    margin-bottom: 20px;
}

.order-img-container {
    width: 100px;
    height: 100px;
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
    width: 380px;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.recommendations-container {
    background: white;
    border-radius: 20px;
    padding: 30px;
    box-shadow: 0 4px 20px rgba(61, 43, 31, 0.05);
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
    border-radius: 20px;
    padding: 30px;
    box-shadow: 0 4px 20px rgba(61, 43, 31, 0.05);
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

/* Responsive Modern */
@media (max-width: 1100px) {
    .content-wrapper {
        grid-template-columns: 1fr;
    }

    .cart-sidebar {
        position: static;
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

    .product-row {
        grid-template-columns: 1fr;
        gap: 20px;
    }

    .table-header {
        display: none;
    }

    .image-wrapper {
        width: 100%;
        height: 200px;
    }
}

/* Checkout Popup Modern */
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

.checkout-popup {
    background: white;
    border-radius: 5px;
    max-width: 1000px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.popup-header {
    padding: 10px;
    border-bottom: 1px solid #F4EDE6;
    text-align: center;
}

.popup-header h2 {
    font-family: 'Crimson Pro', serif;
    font-size: 32px;
    font-weight: 700;
    color: #3D2B1F;
    margin: 0 0 10px 0;
}

.popup-body {
    padding: 40px;
}

.form-group {
    margin-bottom: 24px;
}

.form-group label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #3D2B1F;
    margin-bottom: 8px;
}

.form-input,
.form-textarea,
.form-select {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid #E6E0D9;
    border-radius: 8px;
    font-family: 'Work Sans', sans-serif;
    font-size: 14px;
}

.order-summary-section {
    background: #F9F5F0;
    padding: 24px;
    border-radius: 16px;
    margin-bottom: 24px;
}

.order-summary-header {
    display: grid;
    grid-template-columns: 3fr 1fr 2fr 1fr;
    text-align: center;
}

.summary-item {
    display: grid;
    grid-template-columns: 3fr 1fr 2fr 1fr;
    padding: 12px 0;
    border-bottom: 1px solid #E6E0D9;
    text-align: center;
}

.summary-item-info {
    text-align: left;
    display: flex;
    flex-direction: column;
    padding-left: 20px;
}

.summary-item:last-child {
    border-bottom: none;
}


.summary-total {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 2px solid #E6E0D9;
}

.total-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
}

.grand-total {
    font-family: 'Crimson Pro', serif;
    font-size: 20px;
    font-weight: 700;
    color: #3D2B1F;
}

.popup-footer {
    padding: 0 40px 40px;
    display: flex;
    gap: 16px;
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

.submit-order-btn {
    flex: 2;
    padding: 14px;
    background: #3D2B1F;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 700;
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

.status-tag.pending {
    background: #FFF9E6;
    color: #B28900;
}

@media (max-width: 768px) {
    .history-sidebar {
        display: none;
    }
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

.header-actions {
    display: flex;
    align-items: center;
    gap: 15px;
}

</style>
