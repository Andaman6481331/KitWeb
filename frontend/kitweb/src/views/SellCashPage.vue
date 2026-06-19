<script setup>
import { ref, computed, watch } from 'vue';
import { api } from '../services/api';
import generatePayload from 'promptpay-qr';
import QRCode from 'qrcode';

// ⚠️ Replace with the shop's real PromptPay mobile number (e.g. '0812345678').
const PROMPTPAY_ID = '0894886877';

const SHOP_NAME = 'ร้านกิจเจริญสำเพ็ง';
const SHOP_SITE = 'kitcharoensampeng.com';
const PRODUCT_TYPES = ['กรรไกร', 'ก้ามปู', 'กิ้ป', 'เกสร', 'กำมะหยี่', 'กระดุม', 'กาวแท่ง' ];

// --- Auth gate (reuses the admin password, same as AdminDashboard) ---
const isAuthenticated = ref(!!api.getToken());
const password = ref('');
const loginError = ref('');

const handleLogin = async () => {
  const result = await api.adminLogin(password.value);
  if (result.success) {
    isAuthenticated.value = true;
    loginError.value = '';
  } else {
    loginError.value = 'Incorrect password';
  }
};

// --- POS cart (local, ephemeral) ---
const selectedType = ref(PRODUCT_TYPES[0]);
const priceInput = ref('');
const cart = ref([]); // [{ id, product_type, input_price, quantity }]

const total = computed(() =>
  cart.value.reduce((sum, item) => sum + item.input_price * item.quantity, 0)
);

const addToCart = () => {
  const price = parseFloat(priceInput.value);
  if (!selectedType.value || !(price > 0)) return;
  cart.value.push({
    id: Date.now() + Math.random(),
    product_type: selectedType.value,
    input_price: Math.round(price * 100) / 100,
    quantity: 1
  });
  priceInput.value = '';
};

const increaseQty = (id) => {
  const item = cart.value.find((i) => i.id === id);
  if (item) item.quantity += 1;
};

const decreaseQty = (id) => {
  const item = cart.value.find((i) => i.id === id);
  if (!item) return;
  if (item.quantity <= 1) {
    removeFromCart(id); // drop the line when subtracting past 1
  } else {
    item.quantity -= 1;
  }
};

const removeFromCart = (id) => {
  cart.value = cart.value.filter((item) => item.id !== id);
};

const clearCart = () => {
  cart.value = [];
};

// --- Dynamic PromptPay QR ---
const qrDataUrl = ref('');

watch(total, async (amount) => {
  if (amount > 0) {
    try {
      const payload = generatePayload(PROMPTPAY_ID, { amount });
      qrDataUrl.value = await QRCode.toDataURL(payload, { margin: 1, width: 240 });
    } catch (e) {
      qrDataUrl.value = '';
    }
  } else {
    qrDataUrl.value = '';
  }
});

// --- Receipt meta ---
const receiptDate = ref('');

const printReceipt = () => {
  receiptDate.value = new Date().toLocaleString();
  // ensure the date renders before the print dialog opens
  requestAnimationFrame(() => window.print());
};

// --- Finalize / save sale to D1 ---
const isSaving = ref(false);
const savedOrderId = ref('');
const saveError = ref('');

const finalizeSale = async () => {
  if (cart.value.length === 0) return;
  isSaving.value = true;
  saveError.value = '';
  try {
    const result = await api.submitCashSale({
      total_amount: total.value,
      // expand each line into `quantity` rows so the data matches the
      // pos_order_items schema (order_id, product_type, input_price) — no qty column
      items: cart.value.flatMap((item) =>
        Array.from({ length: item.quantity }, () => ({
          product_type: item.product_type,
          input_price: item.input_price
        }))
      )
    });
    savedOrderId.value = result.order_id;
    clearCart();
  } catch (e) {
    saveError.value = e.message || 'Failed to save sale';
  } finally {
    isSaving.value = false;
  }
};

const formatPrice = (n) => `฿${n.toFixed(2)}`;
</script>

<template>
  <!-- Login gate -->
  <div v-if="!isAuthenticated" class="sellcash-page">
    <div class="login-box">
      <h1>Cashier Login</h1>
      <input
        v-model="password"
        type="password"
        placeholder="Password"
        @keyup.enter="handleLogin"
      />
      <button @click="handleLogin">Sign In</button>
      <p v-if="loginError" class="error">{{ loginError }}</p>
    </div>
  </div>

  <!-- POS UI -->
  <div v-else class="sellcash-page">
    <div class="pos-grid no-print">
      <!-- Left: entry + cart -->
      <section class="panel">
        <h1 class="title">Sell / Cash Checkout</h1>

        <label class="field-label">Product Type</label>
        <div class="type-chips">
          <button
            v-for="type in PRODUCT_TYPES"
            :key="type"
            class="chip"
            :class="{ active: selectedType === type }"
            @click="selectedType = type"
          >
            {{ type }}
          </button>
        </div>

        <label class="field-label">Price</label>
        <div class="price-row">
          <input
            v-model="priceInput"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            @keyup.enter="addToCart"
          />
          <button class="add-btn" @click="addToCart">Add to Cart</button>
        </div>

        <div class="cart">
          <h2>Cart</h2>
          <p v-if="cart.length === 0" class="empty">No items yet.</p>
          <ul v-else>
            <li v-for="item in cart" :key="item.id">
              <span class="cart-type">{{ item.product_type }}</span>
              <span class="cart-unit">{{ formatPrice(item.input_price) }}</span>
              <div class="qty-controls">
                <button class="qty-btn" @click="decreaseQty(item.id)">−</button>
                <span class="qty-value">{{ item.quantity }}</span>
                <button class="qty-btn" @click="increaseQty(item.id)">+</button>
              </div>
              <span class="cart-price">{{ formatPrice(item.input_price * item.quantity) }}</span>
              <button class="remove" @click="removeFromCart(item.id)">✕</button>
            </li>
          </ul>
          <div class="total-row">
            <span>Total</span>
            <span class="total-amount">{{ formatPrice(total) }}</span>
          </div>
        </div>

        <div class="actions">
          <button class="ghost" :disabled="cart.length === 0" @click="printReceipt">
            Print Receipt
          </button>
          <button class="primary" :disabled="cart.length === 0 || isSaving" @click="finalizeSale">
            {{ isSaving ? 'Saving…' : 'Finalize Sale' }}
          </button>
        </div>

        <p v-if="savedOrderId" class="success">Sale saved. Order ID: {{ savedOrderId }}</p>
        <p v-if="saveError" class="error">{{ saveError }}</p>
      </section>

      <!-- Right: live QR -->
      <section class="panel qr-panel">
        <h2>PromptPay QR</h2>
        <p v-if="!qrDataUrl" class="empty">Add items to generate a QR code.</p>
        <template v-else>
          <img :src="qrDataUrl" alt="PromptPay QR code" class="qr-img" />
          <p class="qr-amount">{{ formatPrice(total) }}</p>
          <p class="qr-hint">Scan to pay {{ SHOP_NAME }}</p>
        </template>
      </section>
    </div>

    <!-- Receipt (hidden on screen, shown only when printing).
         Two copies side by side on landscape A4: left has the QR, right does not. -->
    <div class="receipt">
      <div v-for="(isLeft, idx) in [true, false]" :key="idx" class="receipt-copy">
        <hr style="width: 70%; margin:20px auto 0;"/>
        <p class="r-date">{{ receiptDate }}</p>
        <hr />
        <ul class="r-items">
          <li v-for="item in cart" :key="item.id">
            <svg v-if="isLeft" class="r-check" viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="8" cy="8" r="6.5" fill="#fff" stroke="#000" stroke-width="1" />
            </svg>
            <div style="flex: 1; display: grid; grid-template-columns: 1fr 1fr;">
              <span>{{ item.product_type }}</span><small>x{{ item.quantity }}</small>
            </div>
            <span>{{ formatPrice(item.input_price * item.quantity) }}</span>
          </li>
        </ul>
        <hr />
        <p class="r-total">
          <span>รวมเงิน</span>
          <span>{{ formatPrice(total) }}</span>
        </p>
        <img v-if="isLeft && qrDataUrl" :src="qrDataUrl" alt="PromptPay QR" class="r-qr" />
        <p class="r-thanks">ยินดีให้บริการ!</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sellcash-page {
  min-height: 100vh;
  background: #f4f7f6;
  padding: 30px;
  font-family: 'Inter', sans-serif;
  width: 100%;
  box-sizing: border-box;
}

/* --- Login box (mirrors AdminDashboard) --- */
.login-box {
  background: white;
  padding: 40px;
  border-radius: 24px;
  text-align: center;
  max-width: 400px;
  margin: 100px auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
}
.login-box h1 {
  color: #2d3436;
  margin-bottom: 10px;
}
.login-box input {
  width: 100%;
  padding: 12px;
  margin: 20px 0;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-sizing: border-box;
}
.login-box button {
  width: 100%;
  padding: 12px;
  background: #8b6f47;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

/* --- POS layout --- */
.pos-grid {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
  max-width: 960px;
  margin: 0 auto;
}
.panel {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}
.title {
  color: #2d3436;
  margin: 0 0 20px;
}
.field-label {
  display: block;
  font-weight: 600;
  color: #636e72;
  margin: 16px 0 8px;
  font-size: 14px;
}
.type-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip {
  padding: 10px 16px;
  border: 1px solid #e1e8ed;
  border-radius: 999px;
  background: #fafafa;
  color: #2d3436;
  cursor: pointer;
  font-weight: 500;
}
.chip.active {
  background: #8b6f47;
  color: white;
  border-color: #8b6f47;
}
.price-row {
  display: flex;
  gap: 10px;
}
.price-row input {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
}
.add-btn {
  padding: 12px 18px;
  background: #2d3436;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  white-space: nowrap;
}

.cart {
  margin-top: 24px;
}
.cart h2 {
  font-size: 18px;
  color: #2d3436;
}
.cart .empty,
.qr-panel .empty {
  color: #b2bec3;
  font-style: italic;
}
.cart ul {
  list-style: none;
  padding: 0;
  margin: 12px 0;
}
.cart li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #f1f2f6;
}
.cart-type {
  flex: 1;
  color: #2d3436;
}
.cart-unit {
  color: #b2bec3;
  font-size: 13px;
  min-width: 56px;
  text-align: right;
}
.qty-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}
.qty-btn {
  width: 26px;
  height: 26px;
  border: 1px solid #e1e8ed;
  background: #fafafa;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  color: #2d3436;
  display: flex;
  align-items: center;
  justify-content: center;
}
.qty-btn:hover {
  background: #f1f2f6;
}
.qty-value {
  min-width: 22px;
  text-align: center;
  font-weight: 600;
  color: #2d3436;
}
.cart-price {
  font-weight: 600;
  color: #2d3436;
  min-width: 64px;
  text-align: right;
}
.remove {
  background: none;
  border: none;
  color: #ff7675;
  cursor: pointer;
  font-size: 16px;
}
.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 2px solid #2d3436;
  font-weight: 700;
  font-size: 18px;
  color: #2d3436;
}
.total-amount {
  color: #8b6f47;
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}
.actions button {
  flex: 1;
  padding: 14px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  border: none;
}
.actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.ghost {
  background: #f1f2f6;
  color: #2d3436;
}
.primary {
  background: #00b894;
  color: white;
}

.success {
  color: #00b894;
  font-weight: 600;
  margin-top: 16px;
}
.error {
  color: #d63031;
  font-weight: 600;
  margin-top: 16px;
}

/* --- QR panel --- */
.qr-panel {
  text-align: center;
  height: fit-content;
}
.qr-panel h2 {
  color: #2d3436;
  font-size: 18px;
}
.qr-img {
  width: 240px;
  max-width: 100%;
  margin: 12px auto;
  display: block;
}
.qr-amount {
  font-size: 22px;
  font-weight: 700;
  color: #8b6f47;
  margin: 8px 0 0;
}
.qr-hint {
  color: #636e72;
  font-size: 13px;
}

/* --- Receipt: hidden on screen --- */
.receipt {
  display: none;
}

@media (max-width: 720px) {
  .pos-grid {
    grid-template-columns: 1fr;
  }
  .qr-panel {
    order: -1;
  }
}

/* --- Print: show ONLY the receipt --- */
@media print {
  @page {
    size: A5 landscape;
    margin: 8mm;
  }
  /* Hide all app chrome with display:none (NOT visibility:hidden) so these
     elements take up zero space — otherwise the sticky nav, the 100vh page
     wrapper and the tall footer reserve height and spill onto a blank 2nd page. */
  :global(.NavBar),
  :global(.footer) {
    display: none !important;
  }
  .no-print {
    display: none !important;
  }
  /* The page wrapper holds the receipt: strip the full-viewport height/padding
     that was forcing extra pages, but keep it displayed. */
  .sellcash-page {
    min-height: 0 !important;
    padding: 0 !important;
  }
  /* full landscape sheet, split into two halves by a dashed center line.
     min-height stays under the A5-landscape printable area (~132mm) to keep it to one page. */
  .receipt {
    display: flex;
    align-items: stretch;
    width: 100%;
    min-height: 128mm;
    margin: 0;
    font-family: 'Inter', sans-serif;
    color: #000;
    font-size: 13px;
    box-sizing: border-box;
  }
  .receipt-copy {
    flex: 1 1 50%;
    width: 50%;
    padding: 8px 16px;
    box-sizing: border-box;
  }
  .receipt-copy:first-child {
    border-right: 1px dashed #000; /* vertical divider down the middle */
  }
  .receipt hr {
    border: none;
    border-top: 1px dashed #000;
    margin: 8px 0;
  }
  .r-shop {
    text-align: center;
    margin: 0;
    font-size: 18px;
  }
  .r-site,
  .r-date {
    text-align: center;
    margin: 2px 0;
    font-size: 11px;
  }
  .r-items {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .r-items li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 2px 0;
  }
  .r-check {
    width: 11px;
    height: 11px;
    flex: 0 0 auto;
    margin-right: 6px;
  }
  /* push the line price to the far right */
  .r-items li > span:last-child {
    margin-left: auto;
  }
  .r-total {
    display: flex;
    justify-content: space-between;
    font-weight: 700;
    font-size: 15px;
    margin: 4px 0;
  }
  .r-qr {
    display: block;
    width: 100px;
    margin: 10px auto 4px;
  }
  .r-thanks {
    text-align: center;
    margin: 4px 0 0;
  }
}
</style>
