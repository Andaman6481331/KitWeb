<script setup>
import { ref, computed } from 'vue'

// Sample product data - replace with your actual menu items
const products = ref([
    {
        id: 1,
        name: 'Pad Thai',
        description: 'Classic stir-fried rice noodles',
        price: 120,
        image: 'https://via.placeholder.com/300x200/93735E/FFFFFF?text=Pad+Thai',
        category: 'Noodles',
        inStock: true
    },
    {
        id: 2,
        name: 'Tom Yum Soup',
        description: 'Spicy & sour Thai soup',
        price: 150,
        image: 'https://via.placeholder.com/300x200/5E4535/FFFFFF?text=Tom+Yum',
        category: 'Soup',
        inStock: true
    },
    {
        id: 3,
        name: 'Green Curry',
        description: 'Aromatic Thai green curry',
        price: 180,
        image: 'https://via.placeholder.com/300x200/93735E/FFFFFF?text=Green+Curry',
        category: 'Curry',
        inStock: true
    },
    {
        id: 4,
        name: 'Mango Sticky Rice',
        description: 'Sweet coconut rice with mango',
        price: 90,
        image: 'https://via.placeholder.com/300x200/5E4535/FFFFFF?text=Mango+Rice',
        category: 'Dessert',
        inStock: true
    },
    {
        id: 5,
        name: 'Papaya Salad',
        description: 'Fresh & spicy salad',
        price: 80,
        image: 'https://via.placeholder.com/300x200/93735E/FFFFFF?text=Papaya+Salad',
        category: 'Salad',
        inStock: true
    },
    {
        id: 6,
        name: 'Spring Rolls',
        description: 'Crispy vegetable rolls',
        price: 70,
        image: 'https://via.placeholder.com/300x200/5E4535/FFFFFF?text=Spring+Rolls',
        category: 'Appetizer',
        inStock: false
    },
    {
        id: 7,
        name: 'Massaman Curry',
        description: 'Rich peanut curry',
        price: 200,
        image: 'https://via.placeholder.com/300x200/93735E/FFFFFF?text=Massaman',
        category: 'Curry',
        inStock: true
    },
    {
        id: 8,
        name: 'Thai Iced Tea',
        description: 'Sweet & creamy iced tea',
        price: 50,
        image: 'https://via.placeholder.com/300x200/5E4535/FFFFFF?text=Thai+Tea',
        category: 'Beverage',
        inStock: true
    }
])

const cart = ref([])
const searchQuery = ref('')
const selectedCategory = ref('All')
const showCart = ref(false)
const showNotification = ref(false)
const notificationMessage = ref('')

// Categories
const categories = computed(() => {
    const cats = ['All', ...new Set(products.value.map(p => p.category))]
    return cats
})

// Filtered products
const filteredProducts = computed(() => {
    let filtered = products.value

    // Filter by category
    if (selectedCategory.value !== 'All') {
        filtered = filtered.filter(p => p.category === selectedCategory.value)
    }

    // Filter by search
    if (searchQuery.value) {
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
            p.description.toLowerCase().includes(searchQuery.value.toLowerCase())
        )
    }

    return filtered
})

// Cart calculations
const cartTotal = computed(() => {
    return cart.value.reduce((total, item) => total + (item.price * item.quantity), 0)
})

const cartItemCount = computed(() => {
    return cart.value.reduce((count, item) => count + item.quantity, 0)
})

// Add to cart
const addToCart = (product) => {
    const existingItem = cart.value.find(item => item.id === product.id)

    if (existingItem) {
        existingItem.quantity++
    } else {
        cart.value.push({
            ...product,
            quantity: 1
        })
    }

    showNotificationMsg(`${product.name} added to cart! 🛒`)
}

// Update quantity
const updateQuantity = (itemId, delta) => {
    const item = cart.value.find(i => i.id === itemId)
    if (item) {
        item.quantity += delta
        if (item.quantity <= 0) {
            removeFromCart(itemId)
        }
    }
}

// Remove from cart
const removeFromCart = (itemId) => {
    const index = cart.value.findIndex(i => i.id === itemId)
    if (index > -1) {
        const itemName = cart.value[index].name
        cart.value.splice(index, 1)
        showNotificationMsg(`${itemName} removed from cart`)
    }
}

// Clear cart
const clearCart = () => {
    if (confirm('Are you sure you want to clear your cart?')) {
        cart.value = []
        showNotificationMsg('Cart cleared')
    }
}

// Checkout
const checkout = () => {
    if (cart.value.length === 0) {
        showNotificationMsg('Your cart is empty!')
        return
    }

    // Here you would typically send the order to your backend
    alert(`Order placed! Total: ฿${cartTotal.value}\n\nThank you for your order! 🎉`)
    cart.value = []
    showCart.value = false
}

// Show notification
const showNotificationMsg = (msg) => {
    notificationMessage.value = msg
    showNotification.value = true
    setTimeout(() => {
        showNotification.value = false
    }, 3000)
}

// Toggle cart
const toggleCart = () => {
    showCart.value = !showCart.value
}
</script>

<template>
    <div class="order-page">
        <!-- Page Header -->
        <div class="page-header">
            <div class="header-content">
                <h1>🍜 Order Now</h1>
                <p>Select your favorite dishes and create your perfect meal</p>
            </div>

            <!-- Cart Button (Mobile) -->
            <button class="cart-toggle mobile-only" @click="toggleCart">
                🛒
                <span v-if="cartItemCount > 0" class="cart-badge">{{ cartItemCount }}</span>
            </button>
        </div>

        <!-- Search & Filter Bar -->
        <div class="filter-bar">
            <div class="search-box">
                <svg class="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="2" />
                    <path d="M14 14L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                </svg>
                <input v-model="searchQuery" type="text" placeholder="Search dishes..." class="search-input" />
            </div>

            <div class="category-filters">
                <button v-for="category in categories" :key="category" class="category-btn"
                    :class="{ active: selectedCategory === category }" @click="selectedCategory = category">
                    {{ category }}
                </button>
            </div>
        </div>

        <!-- Main Content -->
        <div class="content-wrapper">
            <!-- Products Grid -->
            <div class="products-section">
                <div class="products-grid">
                    <div v-for="product in filteredProducts" :key="product.id" class="product-card"
                        :class="{ 'out-of-stock': !product.inStock }">
                        <div class="product-image-wrapper">
                            <img :src="product.image" :alt="product.name" class="product-image" />
                            <div v-if="!product.inStock" class="out-of-stock-badge">Out of Stock</div>
                        </div>

                        <div class="product-info">
                            <h3 class="product-name">{{ product.name }}</h3>
                            <p class="product-description">{{ product.description }}</p>

                            <div class="product-footer">
                                <span class="product-price">฿{{ product.price }}</span>
                                <button class="add-to-cart-btn" :disabled="!product.inStock"
                                    @click="addToCart(product)">
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M10 5V15M5 10H15" stroke="currentColor" stroke-width="2"
                                            stroke-linecap="round" />
                                    </svg>
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Empty State -->
                <div v-if="filteredProducts.length === 0" class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <h3>No dishes found</h3>
                    <p>Try adjusting your search or filters</p>
                </div>
            </div>

            <!-- Shopping Cart Sidebar -->
            <div class="cart-sidebar" :class="{ 'show': showCart }">
                <div class="cart-header">
                    <h2>🛒 Your Cart</h2>
                    <button class="close-cart mobile-only" @click="toggleCart">✕</button>
                </div>

                <!-- Cart Items -->
                <div class="cart-items" v-if="cart.length > 0">
                    <div v-for="item in cart" :key="item.id" class="cart-item">
                        <img :src="item.image" :alt="item.name" class="cart-item-image" />

                        <div class="cart-item-details">
                            <h4>{{ item.name }}</h4>
                            <p class="cart-item-price">฿{{ item.price }}</p>
                        </div>

                        <div class="quantity-controls">
                            <button @click="updateQuantity(item.id, -1)" class="qty-btn">−</button>
                            <span class="quantity">{{ item.quantity }}</span>
                            <button @click="updateQuantity(item.id, 1)" class="qty-btn">+</button>
                        </div>

                        <button @click="removeFromCart(item.id)" class="remove-btn">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path
                                    d="M2 4h12M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1m2 0v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h10z" />
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Empty Cart -->
                <div v-else class="empty-cart">
                    <div class="empty-cart-icon">🛒</div>
                    <h3>Your cart is empty</h3>
                    <p>Add some delicious dishes to get started!</p>
                </div>

                <!-- Cart Footer -->
                <div class="cart-footer" v-if="cart.length > 0">
                    <div class="cart-summary">
                        <div class="summary-row">
                            <span>Subtotal</span>
                            <span>฿{{ cartTotal }}</span>
                        </div>
                        <div class="summary-row">
                            <span>Delivery</span>
                            <span>฿30</span>
                        </div>
                        <div class="summary-row total">
                            <span>Total</span>
                            <span>฿{{ cartTotal + 30 }}</span>
                        </div>
                    </div>

                    <div class="cart-actions">
                        <button @click="clearCart" class="clear-btn">Clear Cart</button>
                        <button @click="checkout" class="checkout-btn">
                            Checkout
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M6 12l4-4-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Notification Toast -->
        <transition name="slide-up">
            <div v-if="showNotification" class="notification">
                {{ notificationMessage }}
            </div>
        </transition>

        <!-- Cart Overlay (Mobile) -->
        <div v-if="showCart" class="cart-overlay mobile-only" @click="toggleCart"></div>
    </div>
</template>

<style scoped>
.order-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #fff9f1 0%, #f5ebe0 100%);
    padding-bottom: 40px;
}

/* Page Header */
.page-header {
    /* background: linear-gradient(135deg, rgba(94, 69, 53, 0.95), rgba(147, 115, 94, 0.95)); */
    background-image: url('../assets/texture-bg01.jpg');
    color: #fff9f1;
    padding: 40px 5%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.header-content h1 {
    font-size: 42px;
    font-weight: 700;
    margin: 0 0 10px 0;
    letter-spacing: -0.5px;
}

.header-content p {
    font-size: 16px;
    margin: 0;
    opacity: 0.9;
}

.cart-toggle {
    display: none;
    position: relative;
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 12px;
    padding: 12px 20px;
    font-size: 24px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.cart-toggle:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.05);
}

.cart-badge {
    position: absolute;
    top: -5px;
    right: -5px;
    background: #ff6b6b;
    color: white;
    font-size: 12px;
    font-weight: 700;
    padding: 4px 8px;
    border-radius: 10px;
    min-width: 20px;
}

/* Filter Bar */
.filter-bar {
    max-width: 1400px;
    margin: 30px auto;
    padding: 0 5%;
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
}

.search-box {
    position: relative;
    flex: 1;
    min-width: 250px;
}

.search-icon {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    color: #93735E;
    pointer-events: none;
}

.search-input {
    width: 100%;
    padding: 14px 16px 14px 48px;
    border: 2px solid rgba(147, 115, 94, 0.2);
    border-radius: 12px;
    font-size: 15px;
    background: white;
    transition: all 0.3s ease;
}

.search-input:focus {
    outline: none;
    border-color: #93735E;
    box-shadow: 0 4px 12px rgba(147, 115, 94, 0.1);
}

.category-filters {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.category-btn {
    padding: 10px 20px;
    border: 2px solid rgba(147, 115, 94, 0.3);
    background: white;
    border-radius: 20px;
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
    color: #5E4535;
    transition: all 0.3s ease;
}

.category-btn:hover {
    border-color: #93735E;
    background: rgba(147, 115, 94, 0.1);
}

.category-btn.active {
    background: linear-gradient(135deg, #5E4535, #93735E);
    color: white;
    border-color: transparent;
}

/* Content Wrapper */
.content-wrapper {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 5%;
    display: grid;
    grid-template-columns: 1fr 400px;
    gap: 30px;
    align-items: start;
}

/* Products Grid */
.products-section {
    width: 100%;
}

.products-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 24px;
}

.product-card {
    background: white;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(94, 69, 53, 0.1);
    transition: all 0.3s ease;
    cursor: pointer;
}

.product-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 24px rgba(94, 69, 53, 0.15);
}

.product-card.out-of-stock {
    opacity: 0.6;
}

.product-image-wrapper {
    position: relative;
    width: 100%;
    height: 200px;
    overflow: hidden;
}

.product-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
}

.product-card:hover .product-image {
    transform: scale(1.05);
}

.out-of-stock-badge {
    position: absolute;
    top: 12px;
    right: 12px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
}

.product-info {
    padding: 20px;
}

.product-name {
    font-size: 20px;
    font-weight: 700;
    color: #5E4535;
    margin: 0 0 8px 0;
}

.product-description {
    font-size: 14px;
    color: #93735E;
    margin: 0 0 16px 0;
    line-height: 1.5;
}

.product-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.product-price {
    font-size: 24px;
    font-weight: 700;
    color: #5E4535;
}

.add-to-cart-btn {
    background: linear-gradient(135deg, #5E4535, #93735E);
    color: white;
    border: none;
    border-radius: 10px;
    padding: 10px 20px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.3s ease;
}

.add-to-cart-btn:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(94, 69, 53, 0.3);
}

.add-to-cart-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
}

/* Cart Sidebar */
.cart-sidebar {
    position: sticky;
    top: 20px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(94, 69, 53, 0.1);
    height: fit-content;
    max-height: calc(100vh - 40px);
    display: flex;
    flex-direction: column;
}

.cart-header {
    padding: 24px;
    border-bottom: 2px solid #f5ebe0;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.cart-header h2 {
    font-size: 24px;
    font-weight: 700;
    color: #5E4535;
    margin: 0;
}

.close-cart {
    display: none;
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #93735E;
}

.cart-items {
    flex: 1;
    overflow-y: auto;
    padding: 16px 24px;
    max-height: 400px;
}

.cart-item {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 16px;
    background: #f5ebe0;
    border-radius: 12px;
    margin-bottom: 12px;
    transition: all 0.3s ease;
}

.cart-item:hover {
    background: #ede0d4;
}

.cart-item-image {
    width: 60px;
    height: 60px;
    border-radius: 8px;
    object-fit: cover;
}

.cart-item-details {
    flex: 1;
}

.cart-item-details h4 {
    font-size: 16px;
    font-weight: 600;
    color: #5E4535;
    margin: 0 0 4px 0;
}

.cart-item-price {
    font-size: 14px;
    font-weight: 700;
    color: #93735E;
    margin: 0;
}

.quantity-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    background: white;
    border-radius: 8px;
    padding: 4px;
}

.qty-btn {
    width: 28px;
    height: 28px;
    border: none;
    background: #5E4535;
    color: white;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 700;
    transition: all 0.2s ease;
}

.qty-btn:hover {
    background: #93735E;
    transform: scale(1.1);
}

.quantity {
    min-width: 30px;
    text-align: center;
    font-weight: 600;
    color: #5E4535;
}

.remove-btn {
    background: none;
    border: none;
    color: #ff6b6b;
    cursor: pointer;
    padding: 8px;
    border-radius: 6px;
    transition: all 0.2s ease;
}

.remove-btn:hover {
    background: rgba(255, 107, 107, 0.1);
    transform: scale(1.1);
}

/* Empty Cart */
.empty-cart {
    padding: 60px 24px;
    text-align: center;
}

.empty-cart-icon {
    font-size: 64px;
    margin-bottom: 16px;
    opacity: 0.5;
}

.empty-cart h3 {
    font-size: 20px;
    font-weight: 600;
    color: #5E4535;
    margin: 0 0 8px 0;
}

.empty-cart p {
    font-size: 14px;
    color: #93735E;
    margin: 0;
}

/* Cart Footer */
.cart-footer {
    padding: 24px;
    border-top: 2px solid #f5ebe0;
}

.cart-summary {
    margin-bottom: 20px;
}

.summary-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    font-size: 15px;
    color: #5E4535;
}

.summary-row.total {
    font-size: 20px;
    font-weight: 700;
    padding-top: 12px;
    border-top: 2px solid #f5ebe0;
    margin-top: 8px;
}

.cart-actions {
    display: flex;
    gap: 12px;
}

.clear-btn {
    flex: 1;
    padding: 14px;
    border: 2px solid #93735E;
    background: white;
    color: #5E4535;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.clear-btn:hover {
    background: #f5ebe0;
}

.checkout-btn {
    flex: 2;
    padding: 14px;
    border: none;
    background: linear-gradient(135deg, #5E4535, #93735E);
    color: white;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.3s ease;
}

.checkout-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(94, 69, 53, 0.3);
}

/* Empty State */
.empty-state {
    text-align: center;
    padding: 80px 20px;
}

.empty-icon {
    font-size: 72px;
    margin-bottom: 20px;
    opacity: 0.3;
}

.empty-state h3 {
    font-size: 24px;
    font-weight: 600;
    color: #5E4535;
    margin: 0 0 8px 0;
}

.empty-state p {
    font-size: 16px;
    color: #93735E;
    margin: 0;
}

/* Notification */
.notification {
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #5E4535, #93735E);
    color: white;
    padding: 16px 32px;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    font-weight: 600;
    z-index: 10000;
}

.slide-up-enter-active,
.slide-up-leave-active {
    transition: all 0.3s ease;
}

.slide-up-enter-from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
}

.slide-up-leave-to {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
}

.cart-overlay {
    display: none;
}

.mobile-only {
    display: none;
}

/* Responsive Design */
@media (max-width: 1024px) {
    .content-wrapper {
        grid-template-columns: 1fr;
    }

    .cart-sidebar {
        position: fixed;
        top: 0;
        right: -100%;
        width: 90%;
        max-width: 400px;
        height: 100vh;
        max-height: 100vh;
        z-index: 10001;
        transition: right 0.3s ease;
        border-radius: 0;
    }

    .cart-sidebar.show {
        right: 0;
    }

    .cart-toggle {
        display: flex;
    }

    .close-cart {
        display: block;
    }

    .mobile-only {
        display: block;
    }

    .cart-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100vh;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: block;
    }
}

@media (max-width: 768px) {
    .page-header {
        padding: 30px 5%;
    }

    .header-content h1 {
        font-size: 32px;
    }

    .products-grid {
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 16px;
    }

    .filter-bar {
        flex-direction: column;
    }

    .search-box {
        width: 100%;
    }
}

@media (max-width: 480px) {
    .products-grid {
        grid-template-columns: 1fr;
    }
}
</style>
