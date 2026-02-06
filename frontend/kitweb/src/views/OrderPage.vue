<script setup>
import { ref, computed } from 'vue'


// Sample product data with size and color options
const products = ref([
    {
        id: 1,
        name: 'Premium Yarn Collection',
        description: 'High-quality premium yarn',
        price: 199,
        image: 'https://m.media-amazon.com/images/I/610a5LpNbTL.jpg',
        category: 'Yarn',
        inStock: true,
        sizes: ['50g', '100g', '200g', '500g'],
        colors: ['White', 'Blue', 'Green', 'Red', 'Grey']
    },
    {
        id: 2,
        name: 'Designer Buttons Set',
        description: 'Elegant designer buttons',
        price: 89,
        image: 'https://m.media-amazon.com/images/I/81U7rrsM8zL._AC_UF894,1000_QL80_.jpg',
        category: 'Buttons',
        inStock: true,
        sizes: ['10mm', '15mm', '20mm', '25mm'],
        colors: ['Black', 'White', 'Gold', 'Silver', 'Bronze']
    },
    {
        id: 3,
        name: 'Professional Needle Kit',
        description: 'Complete professional needle set',
        price: 149,
        image: 'https://cdn.sparkfun.com/assets/parts/4/8/7/5/10405-04b.jpg',
        category: 'Needles',
        inStock: true,
        sizes: ['Size 5', 'Size 7', 'Size 9', 'Size 10'],
        colors: ['Silver', 'Gold']
    },
    {
        id: 4,
        name: 'Cotton Fabric Roll',
        description: 'Premium cotton fabric',
        price: 250,
        image: 'https://via.placeholder.com/80x80/93735E/FFFFFF?text=Fabric',
        category: 'Fabric',
        inStock: true,
        sizes: ['1m', '2m', '5m', '10m'],
        colors: ['White', 'Beige', 'Navy', 'Pink', 'Yellow']
    },
    {
        id: 5,
        name: 'Embroidery Thread Set',
        description: 'Colorful embroidery threads',
        price: 120,
        image: 'https://via.placeholder.com/80x80/5E4535/FFFFFF?text=Thread',
        category: 'Thread',
        inStock: false,
        sizes: ['Standard'],
        colors: ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange']
    },
    {
        id: 6,
        name: 'Crochet Hooks Set',
        description: 'Ergonomic crochet hooks',
        price: 180,
        image: 'https://via.placeholder.com/80x80/93735E/FFFFFF?text=Hooks',
        category: 'Tools',
        inStock: true,
        sizes: ['2mm', '3mm', '4mm', '5mm', '6mm'],
        colors: ['Silver', 'Multicolor']
    },
    {
        id: 7,
        name: 'Knitting Needles',
        description: 'Bamboo knitting needles',
        price: 95,
        image: 'https://via.placeholder.com/80x80/5E4535/FFFFFF?text=Knitting',
        category: 'Tools',
        inStock: true,
        sizes: ['3.5mm', '4mm', '5mm', '6mm'],
        colors: ['Natural', 'Dark']
    },
    {
        id: 8,
        name: 'Zipper Pack',
        description: 'Assorted zipper lengths',
        price: 65,
        image: 'https://via.placeholder.com/80x80/93735E/FFFFFF?text=Zipper',
        category: 'Notions',
        inStock: true,
        sizes: ['15cm', '20cm', '30cm', '50cm'],
        colors: ['Black', 'White', 'Navy', 'Brown']
    }
])

const cart = ref([])
const searchQuery = ref('')
const selectedCategory = ref('All')
const showCart = ref(false)
const showNotification = ref(false)
const notificationMessage = ref('')
const showCheckoutPopup = ref(false)
const customerName = ref('')
const paymentMethod = ref('Bank Transfer')
const orderNote = ref('')
const isSubmittingOrder = ref(false)

// Track selected size and color for each product
const productSelections = ref({})

// Initialize selections for each product
products.value.forEach(product => {
    productSelections.value[product.id] = {
        size: product.sizes[0],
        color: product.colors[0]
    }
})

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
            p.description.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
            p.category.toLowerCase().includes(searchQuery.value.toLowerCase())
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

// Add to cart with selected size and color
const addToCart = (product) => {
    const selection = productSelections.value[product.id]
    const cartItemKey = `${product.id}-${selection.size}-${selection.color}`
    
    const existingItem = cart.value.find(item => 
        item.id === product.id && 
        item.selectedSize === selection.size && 
        item.selectedColor === selection.color
    )

    if (existingItem) {
        existingItem.quantity++
    } else {
        cart.value.push({
            ...product,
            cartItemKey,
            selectedSize: selection.size,
            selectedColor: selection.color,
            quantity: 1
        })
    }

    showNotificationMsg(`${product.name} (${selection.size}, ${selection.color}) added to cart! 🛒`)
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
        item.quantity += delta
        if (item.quantity <= 0) {
            removeFromCart(cartItemKey)
        }
    }
}

// Remove from cart
const removeFromCart = (cartItemKey) => {
    const index = cart.value.findIndex(i => i.cartItemKey === cartItemKey)
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

const formatOrderMessage = () => {
    const orderId = generateOrderId()
    let message = `🧾 New Order (Website)\n`
    message += `Order ID: ${orderId}\n`
    message += `Customer: ${customerName.value || 'Guest'}\n\n`
    
    cart.value.forEach((item, index) => {
        message += `${index + 1}) ${item.name}\n`
        message += `   Size: ${item.selectedSize} | Color: ${item.selectedColor}\n`
        message += `   Qty: ${item.quantity}\n`
        message += `   Unit: ${item.price.toFixed(2)}\n`
        message += `   Subtotal: ${(item.price * item.quantity).toFixed(2)}\n\n`
    })
    
    message += `Total: ${cartTotal.value.toFixed(2)}\n`
    message += `Payment: ${paymentMethod.value}\n`
    if (orderNote.value) {
        message += `Note: ${orderNote.value}\n`
    }
    
    return message
}

const submitOrder = async () => {
    if (!customerName.value.trim()) {
        showNotificationMsg('Please enter your name')
        return
    }
    
    isSubmittingOrder.value = true
    
    try {
        const orderMessage = formatOrderMessage()
        
        // LINE Notify API endpoint
        const lineNotifyToken = 'YOUR_LINE_NOTIFY_TOKEN_HERE' // Replace with your actual token
        
        const formData = new FormData()
        formData.append('message', orderMessage)
        
        const response = await fetch('https://notify-api.line.me/api/notify', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${lineNotifyToken}`
            },
            body: formData
        })
        
        if (response.ok) {
            showNotificationMsg('Order sent successfully! 🎉')
            cart.value = []
            customerName.value = ''
            paymentMethod.value = 'Bank Transfer'
            orderNote.value = ''
            showCheckoutPopup.value = false
        } else {
            throw new Error('Failed to send order')
        }
    } catch (error) {
        console.error('Error sending order:', error)
        showNotificationMsg('Failed to send order. Please try again.')
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
    }, 3000)
}

// Toggle cart
const toggleCart = () => {
    showCart.value = !showCart.value
}

const isProductInCart = (productId) => {
    return cart.value.some(item => item.id === productId)
}
</script>

<template>
    <div class="order-page">
        <!-- Page Header -->
        <div class="page-header">
            <div class="header-content">
                <h1>🛍️ Order Products</h1>
                <p>Select your items with preferred size and color</p>
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
                <input v-model="searchQuery" type="text" placeholder="Search products..." class="search-input" />
            </div>

            <div class="category-filters">
                <button class="category-btn" :class="{ active: selectedCategory === 'All' }" :key="'All'" @click="selectedCategory = 'All'">
                    All
                </button>
                <button v-for="category in categories" :key="category" class="category-btn"
                    :class="{ active: selectedCategory === category }" @click="selectedCategory = category">
                    {{ category }}
                </button>
            </div>
        </div>

        <!-- Main Content -->
        <div class="content-wrapper">
            <!-- Products Table -->
            <div class="products-section">
                <div class="products-table">
                    <!-- Table Header -->
                    <div class="table-header">
                        <div class="th-image">Image</div>
                        <div class="th-product">Product</div>
                        <div class="th-category">Category</div>
                        <div class="th-size">Size</div>
                        <div class="th-color">Color</div>
                        <div class="th-price">Price</div>
                        <div class="th-action">Action</div>
                    </div>

                    <!-- Table Body -->
                    <div class="table-body">
                        <div v-for="product in filteredProducts" :key="product.id" 
                            class="table-row" 
                            :class="{ 
                                'out-of-stock': !product.inStock,
                                'in-cart': isProductInCart(product.id)
                            }">
                            
                            <!-- Image -->
                            <div class="td-image">
                                <img :src="product.image" :alt="product.name" class="product-thumb" />
                                <div v-if="!product.inStock" class="stock-badge">Out of Stock</div>
                            </div>

                            <!-- Product Info -->
                            <div class="td-product">
                                <h3 class="product-name">{{ product.name }}</h3>
                                <p class="product-desc">{{ product.description }}</p>
                            </div>

                            <!-- Category -->
                            <div class="td-category">
                                <span class="category-badge">{{ product.category }}</span>
                            </div>

                            <!-- Size Selector -->
                            <div class="td-size">
                                <select 
                                    v-model="productSelections[product.id].size"
                                    @change="updateSize(product.id, $event.target.value)"
                                    class="size-select"
                                    :disabled="!product.inStock">
                                    <option v-for="size in product.sizes" :key="size" :value="size">
                                        {{ size }}
                                    </option>
                                </select>
                            </div>

                            <!-- Color Selector -->
                            <div class="td-color">
                                <select 
                                    v-model="productSelections[product.id].color"
                                    @change="updateColor(product.id, $event.target.value)"
                                    class="color-select"
                                    :disabled="!product.inStock">
                                    <option v-for="color in product.colors" :key="color" :value="color">
                                        {{ color }}
                                    </option>
                                </select>
                            </div>

                            <!-- Price -->
                            <div class="td-price">
                                <span class="price-tag">฿{{ product.price }}</span>
                            </div>

                            <!-- Action Button -->
                            <div class="td-action">
                                <button 
                                    class="add-btn" 
                                    :disabled="!product.inStock"
                                    @click="addToCart(product)">
                                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                                        <path d="M10 5V15M5 10H15" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
                                    </svg>
                                    Add to Cart
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Empty State -->
                <div v-if="filteredProducts.length === 0" class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <h3>No products found</h3>
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
                    <div v-for="item in cart" :key="item.cartItemKey" class="cart-item">
                        <img :src="item.image" :alt="item.name" class="cart-item-image" />

                        <div class="cart-item-details">
                            <h4>{{ item.name }}</h4>
                            <p class="cart-item-specs">{{ item.selectedSize }} • {{ item.selectedColor }}</p>
                            <p class="cart-item-price">฿{{ item.price }}</p>
                        </div>

                        <div class="quantity-controls">
                            <button @click="updateQuantity(item.cartItemKey, -1)" class="qty-btn">−</button>
                            <span class="quantity">{{ item.quantity }}</span>
                            <button @click="updateQuantity(item.cartItemKey, 1)" class="qty-btn">+</button>
                        </div>

                        <button @click="removeFromCart(item.cartItemKey)" class="remove-btn">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Empty Cart -->
                <div v-else class="empty-cart">
                    <div class="empty-cart-icon">🛒</div>
                    <h3>Your cart is empty</h3>
                    <p>Add some products to get started!</p>
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
                        <!-- Customer Information -->
                        <div class="form-group">
                            <label>Name <span class="required">*</span></label>
                            <input 
                                v-model="customerName" 
                                type="text" 
                                placeholder="Enter your name"
                                class="form-input"
                            />
                        </div>
                        
                        <div class="form-group">
                            <label>Payment Method</label>
                            <select v-model="paymentMethod" class="form-select">
                                <option>Bank Transfer</option>
                                <option>Cash on Delivery</option>
                                <option>Credit Card</option>
                                <option>PromptPay</option>
                            </select>
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
        <!-- Checkout Popup -->
<div v-if="showCheckoutPopup" class="checkout-overlay" @click="closeCheckoutPopup">
    <div class="checkout-popup" @click.stop>
        <button class="popup-close-btn" @click="closeCheckoutPopup">✕</button>
        
        <div class="popup-header">
            <h2>🧾 Complete Your Order</h2>
            <p>Review your order and provide details</p>
        </div>
        
        <div class="popup-body">
            
            <!-- Order Summary -->
            <div class="order-summary-section">
                <div class="order-summary-header">
                    <h3>Order Summary</h3>
                    <h3>Qty</h3>
                    <h3>Price</h3>
                    <h3>Total</h3>
                </div>
                <div class="summary-items">
                    <div v-for="item in cart" :key="item.cartItemKey" class="summary-item">
                        <div class="summary-item-info">
                            <strong>{{ item.name }}</strong>
                            <span class="summary-specs">{{ item.selectedSize }} • {{ item.selectedColor }}</span>
                        </div>
                        <div class="summary-item-calc">
                            <span>{{ item.quantity }}</span>
                            <span>•</span>
                            <span>{{ item.price }}</span>
                            <strong>฿{{ item.quantity * item.price }}</strong>
                        </div>
                    </div>
                </div>
                
                <div class="summary-total">
                    <div class="total-row">
                        <span>Subtotal</span>
                        <span>฿{{ cartTotal }}</span>
                    </div>
                    <div class="total-row">
                        <span>Delivery</span>
                        <span>฿30</span>
                    </div>
                    <div class="total-row grand-total">
                        <span>Grand Total</span>
                        <span>฿{{ cartTotal + 30 }}</span>
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label>Order Note (Optional)</label>
                <textarea 
                    v-model="orderNote" 
                    placeholder="Special requests or delivery instructions..."
                    class="form-textarea"
                    rows="3"
                ></textarea>
            </div>
        </div>
        
        <div class="popup-footer">
            <button @click="closeCheckoutPopup" class="cancel-btn">Cancel</button>
            <button 
                @click="submitOrder" 
                class="submit-order-btn"
                :disabled="isSubmittingOrder"
            >
                <span v-if="!isSubmittingOrder">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    Send Order to LINE
                </span>
                <span v-else>Sending...</span>
            </button>
        </div>
    </div>
</div>
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
    background:
        linear-gradient(
            135deg,
            rgba(94, 69, 53, 0.75),
            rgba(147, 115, 94, 0.75)
        ),
        url('../assets/texture-bg01.jpg');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;

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

/* Products Table */
.products-section {
    width: 100%;
}

.products-table {
    background: white;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(94, 69, 53, 0.1);
}

.table-header {
    display: grid;
    grid-template-columns: 100px 2fr 1fr 120px 120px 100px 180px;
    gap: 16px;
    padding: 20px 24px;
    background: linear-gradient(135deg, #5E4535, #93735E);
    color: white;
    font-weight: 700;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.table-body {
    max-height: calc(100vh - 100px);
    overflow-y: auto;
}

.table-row {
    display: grid;
    grid-template-columns: 100px 2fr 1fr 120px 120px 100px 180px;
    gap: 16px;
    padding: 20px 24px;
    border-bottom: 2px solid #f5ebe0;
    align-items: center;
    transition: all 0.3s ease;
}

.table-row:hover {
    background: #fffaf5;
}

.table-row.out-of-stock {
    opacity: 0.5;
    background: #f8f8f8;
}

.table-row.in-cart {
    background: linear-gradient(90deg, rgba(147, 115, 94, 0.08) 0%, rgba(184, 153, 104, 0.05) 100%);
    border-left: 4px solid #93735E;
}

.table-row.in-cart:hover {
    background: linear-gradient(90deg, rgba(147, 115, 94, 0.12) 0%, rgba(184, 153, 104, 0.08) 100%);
}

/* Table Cells */
.td-image {
    position: relative;
}

.product-thumb {
    width: 80px;
    height: 80px;
    object-fit: cover;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stock-badge {
    position: absolute;
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%);
    background: #ff6b6b;
    color: white;
    font-size: 10px;
    font-weight: 700;
    padding: 4px 8px;
    border-radius: 8px;
    white-space: nowrap;
}

.td-product {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.product-name {
    font-size: 16px;
    font-weight: 700;
    color: #5E4535;
    margin: 0;
}

.product-desc {
    font-size: 13px;
    color: #93735E;
    margin: 0;
}

.td-category {
    text-align: center;
}

.category-badge {
    display: inline-block;
    background: linear-gradient(135deg, #8b6f47, #b89968);
    color: white;
    padding: 6px 14px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.size-select,
.color-select {
    width: 100%;
    padding: 10px 12px;
    border: 2px solid rgba(147, 115, 94, 0.3);
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    color: #5E4535;
    background: white;
    cursor: pointer;
    transition: all 0.3s ease;
}

.size-select:hover,
.color-select:hover {
    border-color: #93735E;
}

.size-select:focus,
.color-select:focus {
    outline: none;
    border-color: #5E4535;
    box-shadow: 0 0 0 3px rgba(147, 115, 94, 0.1);
}

.size-select:disabled,
.color-select:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
}

.td-price {
    text-align: center;
}

.price-tag {
    font-size: 20px;
    font-weight: 700;
    color: #5E4535;
}

.add-btn {
    width: 100%;
    padding: 12px 16px;
    background: linear-gradient(135deg, #5E4535, #93735E);
    color: white;
    border: none;
    border-radius: 10px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.3s ease;
}

.add-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(94, 69, 53, 0.3);
}

.add-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
}

/* Cart Sidebar */
.cart-sidebar {
    position: sticky;
    top: 100px;
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
    font-size: 15px;
    font-weight: 600;
    color: #5E4535;
    margin: 0 0 4px 0;
}

.cart-item-specs {
    font-size: 12px;
    color: #93735E;
    margin: 0 0 4px 0;
    font-weight: 600;
}

.cart-item-price {
    font-size: 14px;
    font-weight: 700;
    color: #5E4535;
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
    background: white;
    border-radius: 16px;
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

/* Custom Scrollbar */
.table-body::-webkit-scrollbar,
.cart-items::-webkit-scrollbar {
    width: 8px;
}

.table-body::-webkit-scrollbar-track,
.cart-items::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
}

.table-body::-webkit-scrollbar-thumb,
.cart-items::-webkit-scrollbar-thumb {
    background: #93735E;
    border-radius: 10px;
}

/* Responsive Design */
@media (max-width: 1200px) {
    .table-header,
    .table-row {
        grid-template-columns: 80px 1.5fr 100px 100px 100px 80px 150px;
        gap: 12px;
        padding: 16px 20px;
    }

    .product-thumb {
        width: 60px;
        height: 60px;
    }

    .product-name {
        font-size: 14px;
    }

    .product-desc {
        font-size: 12px;
    }
}

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
        font-size: 28px;
    }

    .filter-bar {
        flex-direction: column;
    }

    .search-box {
        width: 100%;
    }

    /* Mobile table - Stack cells vertically */
    .table-header {
        display: none;
    }

    .table-row {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 20px;
        border: 2px solid #f5ebe0;
        border-radius: 12px;
        margin-bottom: 16px;
    }

    .td-image,
    .td-product,
    .td-category,
    .td-size,
    .td-color,
    .td-price,
    .td-action {
        width: 100%;
    }

    .product-thumb {
        width: 100%;
        height: 200px;
        object-fit: cover;
    }

    .td-category {
        text-align: left;
    }

    .td-price {
        text-align: left;
    }

    .price-tag {
        font-size: 24px;
    }
}
/* Checkout Popup */
.checkout-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10002;
    padding: 20px;
    animation: fadeIn 0.3s ease;
}

.checkout-popup {
    background: white;
    border-radius: 20px;
    max-width: 700px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
    animation: slideUp 0.3s ease;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideUp {
    from {
        transform: translateY(30px);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}

.popup-close-btn {
    position: absolute;
    top: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #f5f5f5;
    border: none;
    font-size: 24px;
    cursor: pointer;
    transition: all 0.3s ease;
    z-index: 10;
}

.popup-close-btn:hover {
    background: #e0e0e0;
    transform: rotate(90deg);
}

.popup-header {
    padding: 40px 40px 24px 40px;
    border-bottom: 2px solid #f5ebe0;
}

.popup-header h2 {
    font-size: 28px;
    font-weight: 700;
    color: #5E4535;
    margin: 0 0 8px 0;
}

.popup-header p {
    font-size: 14px;
    color: #93735E;
    margin: 0;
}

.popup-body {
    padding: 30px 40px;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.form-section {
    margin-bottom: 30px;
}

.form-section h3 {
    font-size: 18px;
    font-weight: 700;
    color: #5E4535;
    margin: 0 0 16px 0;
}

.form-group {
    margin-bottom: 16px;
}

.form-group label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #5E4535;
    margin-bottom: 8px;
}

.required {
    color: #ff6b6b;
}

.form-input,
.form-select,
.form-textarea {
    width: 94%;
    padding: 12px 16px;
    border: 2px solid rgba(147, 115, 94, 0.3);
    border-radius: 10px;
    font-size: 15px;
    font-family: inherit;
    transition: all 0.3s ease;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
    outline: none;
    border-color: #93735E;
    box-shadow: 0 0 0 3px rgba(147, 115, 94, 0.1);
}

.form-textarea {
    resize: vertical;
}

.order-summary-section {
    background: #f5ebe0;
    padding: 20px;
    border-radius: 12px;
}

.order-summary-header {
    display: grid;
    grid-template-columns: 5fr 1fr 2fr 2fr;
    justify-content: space-between;
    text-align: right;
    font-size: 14px;
    color: #5E4535;
}
.order-summary-header :first-child {
    text-align: left;
}

.order-summary-section h3 {
    font-size: 18px;
    font-weight: 700;
    color: #5E4535;
    margin: 0 0 16px 0;
}

.summary-items {
    margin-bottom: 16px;
}

.summary-item {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    padding: 12px 0;
    border-bottom: 1px solid rgba(94, 69, 53, 0.1);
}

.summary-item:last-child {
    border-bottom: none;
}

.summary-item-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 8px;
}

.summary-item-info strong {
    font-size: 15px;
    color: #5E4535;
}

.summary-specs {
    font-size: 13px;
    color: #93735E;
}

.summary-item-calc {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 2fr;
    justify-content: space-between;
    text-align: right;
    font-size: 14px;
    color: #5E4535;
}

.summary-total {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 2px solid rgba(94, 69, 53, 0.2);
}

.total-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    font-size: 15px;
    color: #5E4535;
}

.grand-total {
    font-size: 20px;
    font-weight: 700;
    margin-top: 8px;
    padding-top: 12px;
    border-top: 2px solid rgba(94, 69, 53, 0.3);
}

.popup-footer {
    padding: 24px 40px;
    border-top: 2px solid #f5ebe0;
    display: flex;
    gap: 12px;
}

.cancel-btn {
    flex: 1;
    padding: 14px;
    border: 2px solid #93735E;
    background: white;
    color: #5E4535;
    border-radius: 10px;
    font-weight: 600;
    font-size: 15px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.cancel-btn:hover {
    background: #f5ebe0;
}

.submit-order-btn {
    flex: 2;
    padding: 14px;
    border: none;
    background: linear-gradient(135deg, #5E4535, #93735E);
    color: white;
    border-radius: 10px;
    font-weight: 600;
    font-size: 15px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.3s ease;
}

.submit-order-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(94, 69, 53, 0.3);
}

.submit-order-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

@media (max-width: 768px) {
    .checkout-popup {
        max-width: 100%;
        margin: 0;
        border-radius: 20px 20px 0 0;
        max-height: 95vh;
    }
    
    .popup-header,
    .popup-body,
    .popup-footer {
        padding-left: 24px;
        padding-right: 24px;
    }
}
</style>