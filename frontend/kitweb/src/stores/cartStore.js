import { reactive, watch } from 'vue';

const CART_STORAGE_KEY = 'kitweb_cart';

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const state = reactive({
    cart: isBrowser ? JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]') : []
});

watch(() => state.cart, (newCart) => {
    if (!isBrowser) return;
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newCart));
}, { deep: true });

export const cartStore = {
    get cart() {
        return state.cart;
    },
    set cart(value) {
        state.cart = value;
    },
    addToCart(product, selection, quantity = 1) {
        const cartItemKey = `${product.id}-${selection.size}-${selection.color}`;
        const existingItem = state.cart.find(item => item.cartItemKey === cartItemKey);
        const unitPrice = (selection.price !== undefined && selection.price !== null) ? selection.price : product.price;

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            state.cart.push({
                ...product,
                name_th: product.name_th || null,
                cartItemKey,
                selectedSize: selection.size,
                selectedColor: selection.color,
                price: unitPrice,
                quantity
            });
        }
    },
    removeFromCart(cartItemKey) {
        const index = state.cart.findIndex(item => item.cartItemKey === cartItemKey);
        if (index > -1) {
            state.cart.splice(index, 1);
        }
    },
    updateQuantity(cartItemKey, delta) {
        const item = state.cart.find(i => i.cartItemKey === cartItemKey);
        if (item) {
            item.quantity += delta;
            if (item.quantity <= 0) {
                this.removeFromCart(cartItemKey);
            }
        }
    },
    clearCart() {
        state.cart = [];
    },
    get cartTotal() {
        return state.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    },
    get cartItemCount() {
        return state.cart.reduce((count, item) => count + item.quantity, 0);
    }
};
