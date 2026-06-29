<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { api } from '../services/api';
import generatePayload from 'promptpay-qr';
import QRCode from 'qrcode';

// ⚠️ Replace with the shop's real PromptPay mobile number (e.g. '0812345678').
const PROMPTPAY_ID = '0894886877';

const SHOP_NAME = 'ร้านกิจเจริญสำเพ็ง';
const SHOP_SITE = 'kitcharoensampeng.com';
const PRODUCT_TYPES = ['กรรไกร','กระดาษ', 'กระพรวน', 'กาวแท่ง', 'ก้านลูกโป่ง', 'กล่อง', 'ก้ามปู', 'กากเพชร', 'กำมะหยี่', 'กิ๊ป', 'เกสร', 'กระดุม', 'กระดิ่ง', 'เข็มมุด', 'เข็มสอย', 'เข็มเนา', 'เข็มควัก', 'ด้ายหลอด', 'ด้ายวีสปัน', 'ด้ายแกน', "ยางแผง", "ยางม้วน", "ยางหลอด", "ริบบิ้น","ริบบิ้นซาติน", "ริบบิ้นไนล่อน", "ริบบิ้นผ้า", "ริบบิพับเหรียญ", "ริบบิ้นฟาง", "ลวด", "ลวดพันก้าน", "ล้วดต้น", "ล้วดวง", "ไหมนก", "ไหมวีนัส", "ไหมเส้นใหญ่", "ไหมซัมเมอร์", "ไหมเบบี้", "ไหมญีปุ่น", "ลูกปัด", "ใบไม้", "มีดคว้าน", "เชือกเทียน","ห่วงเงิน","ห่วงทอง" ];

// Typing shortcuts: the leading consonant of each syllable (preposed vowels เ แ โ ใ ไ skipped).
// e.g. "กก" -> กรรไกร, "ขม" -> เข็มมุด. Several words can share a shortcut; all matches are shown.
const TYPE_SHORTCUTS = {
  'กรรไกร': 'กก',
  'กระดาษ': 'กด',
  'กระพรวน': 'กพ',
  'กาวแท่ง': 'กท',
  'ก้านลูกโป่ง': 'กลป',
  'กล่อง': 'ก',
  'ก้ามปู': 'กป',
  'กากเพชร': 'กพ',
  'กำมะหยี่': 'กมห',
  'กิ๊ป': 'ก',
  'เกสร': 'กส',
  'กระดุม': 'กด',
  'กระดิ่ง': 'กด',
  'เข็มมุด': 'ขม',
  'เข็มสอย': 'ขส',
  'เข็มเนา': 'ขน',
  'เข็มควัก': 'ขค',
  'ด้ายหลอด': 'ดห',
  'ด้ายวีสปัน': 'ดวส',
  'ด้ายแกน': 'ดก',
  'ยางแผง': 'ยผ',
  'ยางม้วน': 'ยม',
  'ยางหลอด': 'ยห',
  'ริบบิ้น': 'รบ',
  'ริบบิ้นซาติน': 'รบซต',
  'ริบบิ้นไนล่อน': 'รบนล',
  'ริบบิ้นผ้า': 'รบผ',
  'ริบบิพับเหรียญ': 'รบพห',
  'ริบบิ้นฟาง': 'รบฟ',
  'ลวด': 'ล',
  'ลวดพันก้าน': 'ลพก',
  'ล้วดต้น': 'ลต',
  'ล้วดวง': 'ลว',
  'ไหมนก': 'หน',
  'ไหมวีนัส': 'หวน',
  'ไหมเส้นใหญ่': 'หสห',
  'ไหมซัมเมอร์': 'หซม',
  'ไหมเบบี้': 'หบบ',
  'ไหมญีปุ่น': 'หญป',
  'ลูกปัด': 'ลป',
  'ใบไม้': 'บม',
  'มีดคว้าน': 'มค',
  'เชือกเทียน': 'ชท',
  'ห่วงเงิน' : 'หง',
  'ห่วงทอง' : 'หท'
};

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
const selectedType = ref('');
const priceInput = ref('');
const qtyInput = ref(1);
const cart = ref([]); // [{ id, product_type, input_price, quantity }]

// --- Guided entry tabs: type -> price -> qty ---
const activeTab = ref('type');
const searchRef = ref(null);
const priceRef = ref(null);
const qtyRef = ref(null);

const goToTab = (tab) => {
  activeTab.value = tab;
  nextTick(() => {
    if (tab === 'type' && searchRef.value) searchRef.value.focus();
    if (tab === 'price' && priceRef.value) priceRef.value.focus();
    if (tab === 'qty' && qtyRef.value) qtyRef.value.focus();
  });
};

// --- Product type search/filter ---
const typeSearch = ref('');
const filteredTypes = computed(() => {
  const q = typeSearch.value.trim().toLowerCase();
  if (!q) return PRODUCT_TYPES;
  return PRODUCT_TYPES.filter((type) => {
    if (type.toLowerCase().includes(q)) return true;
    const shortcut = TYPE_SHORTCUTS[type];
    return shortcut ? shortcut.startsWith(q) : false; // prefix match feels instant
  });
});

const selectType = (type) => {
  selectedType.value = type;
  goToTab('price'); // auto-advance to price after picking a type
};

// Enter in the search box selects the first (or only) match
const selectFirstMatch = () => {
  if (filteredTypes.value.length > 0) {
    selectType(filteredTypes.value[0]);
    typeSearch.value = '';
  }
};

// Price step -> advance to qty (only with a valid price)
const confirmPrice = () => {
  if (parseFloat(priceInput.value) > 0) goToTab('qty');
};

const incQty = () => { qtyInput.value = (parseInt(qtyInput.value) || 0) + 1; };
const decQty = () => { qtyInput.value = Math.max(1, (parseInt(qtyInput.value) || 1) - 1); };

const total = computed(() =>
  cart.value.reduce((sum, item) => sum + item.input_price * item.quantity, 0)
);

const addToCart = () => {
  const price = parseFloat(priceInput.value);
  const qty = Math.max(1, parseInt(qtyInput.value) || 1);
  if (!selectedType.value || !(price > 0)) return;
  cart.value.push({
    id: Date.now() + Math.random(),
    product_type: selectedType.value,
    input_price: Math.round(price * 100) / 100,
    quantity: qty
  });
  // reset entry and jump back to the type step for the next item
  priceInput.value = '';
  qtyInput.value = 1;
  selectedType.value = '';
  typeSearch.value = '';
  goToTab('type');
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
const receiptInvoice = ref('');

const pad = (n, len) => String(n).padStart(len, '0');

const printReceipt = () => {
  const now = new Date();
  receiptDate.value = now.toLocaleString();
  // INV-YYMMDD-REF  (e.g. INV-260623-A1B2C3)
  const ymd = `${pad(now.getFullYear() % 100, 2)}${pad(now.getMonth() + 1, 2)}${pad(now.getDate(), 2)}`;
  // use a short slice of the saved order's UUID when available; otherwise
  // (printing before the sale is finalized) fall back to a HHMMSS time code
  const ref = savedOrderId.value
    ? savedOrderId.value.replace(/-/g, '').slice(0, 6).toUpperCase()
    : `${pad(now.getHours(), 2)}${pad(now.getMinutes(), 2)}${pad(now.getSeconds(), 2)}`;
  receiptInvoice.value = `INV-${ymd}-${ref}`;
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
      <!-- Left: guided entry (Type -> Price -> Qty) -->
      <section class="panel entry-panel">
        <h1 class="title">Sell / Cash Checkout</h1>

        <!-- Step tabs -->
        <div class="step-tabs">
          <button
            class="step-tab"
            :class="{ active: activeTab === 'type', done: selectedType }"
            @click="goToTab('type')"
          >
            <span class="step-num">1</span>
            <span class="step-label">Type</span>
            <span class="step-val" v-if="selectedType">{{ selectedType }}</span>
          </button>
          <button
            class="step-tab"
            :class="{ active: activeTab === 'price', done: parseFloat(priceInput) > 0 }"
            :disabled="!selectedType"
            @click="selectedType && goToTab('price')"
          >
            <span class="step-num">2</span>
            <span class="step-label">Price</span>
            <span class="step-val" v-if="parseFloat(priceInput) > 0">{{ formatPrice(parseFloat(priceInput)) }}</span>
          </button>
          <button
            class="step-tab"
            :class="{ active: activeTab === 'qty' }"
            :disabled="!(selectedType && parseFloat(priceInput) > 0)"
            @click="selectedType && parseFloat(priceInput) > 0 && goToTab('qty')"
          >
            <span class="step-num">3</span>
            <span class="step-label">Qty</span>
            <span class="step-val">× {{ qtyInput }}</span>
          </button>
        </div>

        <!-- Step 1: Type -->
        <div v-show="activeTab === 'type'" class="tab-pane">
          <div class="type-search">
            <span class="search-icon">🔍</span>
            <input
              ref="searchRef"
              v-model="typeSearch"
              type="text"
              placeholder="Search product type… / ค้นหาประเภทสินค้า"
              @keyup.enter="selectFirstMatch"
            />
            <button v-if="typeSearch" class="clear-search" @click="typeSearch = ''">✕</button>
          </div>
          <div class="type-chips">
            <button
              v-for="type in filteredTypes"
              :key="type"
              class="chip"
              :class="{ active: selectedType === type }"
              @click="selectType(type)"
            >
              {{ type }}
            </button>
            <p v-if="filteredTypes.length === 0" class="no-match">
              No type matches “{{ typeSearch }}”.
            </p>
          </div>
        </div>

        <!-- Step 2: Price -->
        <div v-show="activeTab === 'price'" class="tab-pane">
          <p class="entry-summary">{{ selectedType }}</p>
          <label class="field-label">Price (฿)</label>
          <input
            ref="priceRef"
            v-model="priceInput"
            class="big-input"
            type="number"
            min="0"
            step="0.01"
            inputmode="decimal"
            placeholder="0.00"
            @keyup.enter="confirmPrice"
          />
          <div class="pane-nav">
            <button class="ghost" @click="goToTab('type')">← Type</button>
            <button class="primary" :disabled="!(parseFloat(priceInput) > 0)" @click="confirmPrice">
              Qty →
            </button>
          </div>
        </div>

        <!-- Step 3: Qty -->
        <div v-show="activeTab === 'qty'" class="tab-pane">
          <p class="entry-summary">{{ selectedType }} · {{ formatPrice(parseFloat(priceInput) || 0) }}</p>
          <label class="field-label">Quantity</label>
          <div class="qty-entry">
            <button class="qty-btn big" @click="decQty">−</button>
            <input
              ref="qtyRef"
              v-model.number="qtyInput"
              class="big-input qty-num"
              type="number"
              min="1"
              inputmode="numeric"
              @keyup.enter="addToCart"
            />
            <button class="qty-btn big" @click="incQty">+</button>
          </div>
          <p class="line-preview">
            = {{ formatPrice((parseFloat(priceInput) || 0) * (parseInt(qtyInput) || 1)) }}
          </p>
          <div class="pane-nav">
            <button class="ghost" @click="goToTab('price')">← Price</button>
            <button class="add-btn full" @click="addToCart">Add to Cart</button>
          </div>
        </div>
      </section>

      <!-- Right: cart + actions, then QR -->
      <div class="right-col">
        <section class="panel cart-panel">
          <div class="cart">
            <h2>Cart</h2>
            <p v-if="cart.length === 0" class="empty">No items yet.</p>
            <ul v-else>
              <li v-for="item in cart" :key="item.id">
                <span class="cart-type">{{ item.product_type }}</span>
                <span class="cart-unit">{{ formatPrice(item.input_price) }} × {{ item.quantity }}</span>
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
          </div>
        </section>

        <!-- Live QR -->
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
    </div>

    <!-- Finalize Sale: full-width bar at the bottom of the page -->
    <div class="finalize-bar no-print">
      <p v-if="savedOrderId" class="success">Sale saved. Order ID: {{ savedOrderId }}</p>
      <p v-if="saveError" class="error">{{ saveError }}</p>
      <button class="primary finalize-btn" :disabled="cart.length === 0 || isSaving" @click="finalizeSale">
        {{ isSaving ? 'Saving…' : `Finalize Sale · ${formatPrice(total)}` }}
      </button>
    </div>

    <!-- Receipt (hidden on screen, shown only when printing).
         Two copies side by side on landscape A4: left has the QR, right does not. -->
    <div class="receipt">
      <div v-for="(isMerchant, idx) in [true, false]" :key="idx" class="receipt-copy">
        <h3 class="r-title">
          {{ isMerchant ? 'MERCHANT COPY / สำเนาสำหรับร้านค้า' : 'CUSTOMER COPY / สำเนาสำหรับลูกค้า' }}
        </h3>
        <hr />
        <p class="r-meta">{{ receiptInvoice }} | {{ receiptDate }}</p>
        <hr />

        <!-- blank area for staff to jot extra info by hand (merchant copy only) -->
        <div v-if="isMerchant" class="r-note"><span class="r-note-label">บันทึก / Notes</span></div>

        <table class="r-table">
          <thead>
            <tr>
              <th class="r-col-item">รายการ / สินค้า</th>
              <th class="r-col-qty">จำนวน</th>
              <th class="r-col-price">ราคาต่อหน่วย</th>
              <th class="r-col-amt">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in cart" :key="item.id">
              <td class="r-col-item">{{ item.product_type }}</td>
              <td class="r-col-qty">{{ item.quantity }}</td>
              <td class="r-col-price">{{ formatPrice(item.input_price) }}</td>
              <td class="r-col-amt">{{ formatPrice(item.input_price * item.quantity) }}</td>
            </tr>
          </tbody>
        </table>

        <div class="r-bottom">
          <hr />
          <!-- Merchant copy: subtotal, grand total, payment status, internal note -->
          <template v-if="isMerchant">
            <p class="r-line r-grand"><span>ยอดสุทธิ:</span><span>{{ formatPrice(total) }}</span></p>
            <div class="r-payment">
              <p class="r-payment-title">สถานะการชำระเงิน:</p>
              <p class="r-check-line"><span class="r-box"></span> Cash / เงินสด</p>
              <p class="r-check-line"><span class="r-box"></span> PromptPay / โอนเงิน (DYNAMIC)</p>
            </div>
            <p class="r-internal">FOR INTERNAL ACCOUNTING USE</p>
          </template>

          <!-- Customer copy: total paid, scan-to-pay QR, thank you -->
          <template v-else>
            <p class="r-line r-grand"><span>ยอดชำระทั้งหมด:</span><span>{{ formatPrice(total) }}</span></p>
            <p class="r-scan-title">SCAN TO PAY (PROMPTPAY)</p>
            <img v-if="qrDataUrl" :src="qrDataUrl" alt="PromptPay QR" class="r-qr" />
            <p class="r-thanks">ยินดีให้บริการ! / THANK YOU!</p>
            </template>
        </div>
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
  grid-template-columns: 1fr 340px;
  gap: 24px;
  max-width: 1100px;
  margin: 0 auto;
  align-items: start;
}
.right-col {
  display: flex;
  flex-direction: column;
  gap: 24px;
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

/* --- Step tabs (Type / Price / Qty) --- */
.step-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 20px;
}
.step-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 6px;
  border: 1px solid #e1e8ed;
  border-radius: 12px;
  background: #fafafa;
  cursor: pointer;
  transition: all 0.15s;
  min-width: 0;
}
.step-tab:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.step-tab.active {
  background: #8b6f47;
  border-color: #8b6f47;
  color: #fff;
}
.step-tab.done:not(.active) {
  border-color: #8b6f47;
  background: #f6f1ea;
}
.step-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}
.step-tab.active .step-num {
  background: rgba(255, 255, 255, 0.25);
}
.step-label {
  font-size: 13px;
  font-weight: 600;
}
.step-val {
  font-size: 11px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.85;
}

/* --- Tab panes --- */
.tab-pane {
  min-height: 260px;
}
.entry-summary {
  font-size: 15px;
  font-weight: 700;
  color: #8b6f47;
  margin: 0 0 4px;
}
.big-input {
  width: 100%;
  padding: 16px;
  border: 1px solid #ddd;
  border-radius: 12px;
  font-size: 26px;
  font-weight: 700;
  text-align: center;
  box-sizing: border-box;
}
.big-input:focus {
  outline: none;
  border-color: #8b6f47;
  box-shadow: 0 0 0 3px rgba(139, 111, 71, 0.12);
}
.qty-entry {
  display: flex;
  align-items: center;
  gap: 12px;
}
.qty-entry .qty-num {
  flex: 1;
}
.qty-btn.big {
  width: 56px;
  height: 56px;
  font-size: 28px;
  border-radius: 12px;
  flex-shrink: 0;
}
.line-preview {
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  color: #2d3436;
  margin: 14px 0;
}
.pane-nav {
  display: flex;
  gap: 12px;
  margin-top: 18px;
}
.pane-nav button {
  flex: 1;
  padding: 14px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: 15px;
}
.pane-nav button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.add-btn.full {
  flex: 1.4;
}
.field-label {
  display: block;
  font-weight: 600;
  color: #636e72;
  margin: 16px 0 8px;
  font-size: 14px;
}
.selected-pill {
  display: inline-block;
  margin-left: 8px;
  padding: 4px 16px;
  background: #8b6f47;
  color: #fff;
  border-radius: 999px;
  font-size: 0.9rem;
  font-weight: 500;
  vertical-align: middle;
}

.type-search {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}
.type-search .search-icon {
  position: absolute;
  left: 12px;
  font-size: 14px;
  opacity: 0.6;
  pointer-events: none;
}
.type-search input {
  width: 100%;
  padding: 11px 36px 11px 36px;
  border: 1px solid #ddd;
  border-radius: 10px;
  font-size: 15px;
  box-sizing: border-box;
}
.type-search input:focus {
  outline: none;
  border-color: #8b6f47;
  box-shadow: 0 0 0 3px rgba(139, 111, 71, 0.12);
}
.clear-search {
  position: absolute;
  right: 8px;
  width: 24px;
  height: 24px;
  border: none;
  background: #eceae6;
  color: #636e72;
  border-radius: 50%;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.clear-search:hover {
  background: #ddd9d2;
}

.type-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
  padding: 4px;
  border: 1px solid #f1f2f6;
  border-radius: 10px;
  background: #fcfcfb;
}
.no-match {
  color: #b2bec3;
  font-style: italic;
  margin: 8px;
  width: 100%;
}
.chip {
  padding: 10px 16px;
  border: 1px solid #e1e8ed;
  border-radius: 999px;
  background: #fafafa;
  color: #2d3436;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.8rem;
}
.chip:hover {
  background: #ffcb835b;
}
.chip.active {
  background: #8b6f47;
  color: white;
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
  margin-top: 0;
}
.cart h2 {
  margin-top: 0;
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

/* --- Finalize bar (bottom of page) --- */
.finalize-bar {
  max-width: 1100px;
  margin: 24px auto 0;
  text-align: center;
}
.finalize-bar .success,
.finalize-bar .error {
  margin: 0 0 12px;
}
.finalize-btn {
  width: 100%;
  padding: 18px;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
}
.finalize-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
    padding: 0 16px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
  }
  /* blank hand-writing area near the top of each copy */
  .r-note {
    border: 1px dashed #999;
    border-radius: 4px;
    min-height: 56px;
    margin: 4px 0 10px;
    padding: 4px 8px;
  }
  .r-note-label {
    font-size: 9px;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  /* totals / payment / QR block: pinned to the bottom so the product
     table sits cleanly under the note area with open space between */
  .r-bottom {
    margin-top: auto;
  }
  .receipt-copy:first-child {
    border-right: 1px dashed #000; /* vertical divider down the middle */
  }
  .receipt hr {
    border: none;
    border-top: 1px dashed #000;
    margin: 5px 0;
  }
  .r-title {
    text-align: center;
    margin: 0 0 2px;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.3px;
  }
  .r-meta {
    text-align: center;
    margin: 1px 0;
    font-size: 10px;
  }
  /* line-item table */
  .r-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  .r-table th {
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    padding: 0 0 4px;
    border-bottom: 1px solid #000;
  }
  .r-table td {
    padding: 4px 0;
    vertical-align: top;
  }
  .r-col-qty {
    text-align: center;
    width: 12%;
  }
  .r-col-price,
  .r-col-amt {
    text-align: right;
    width: 22%;
  }
  /* totals lines (subtotal / grand total / amount paid) */
  .r-line {
    display: flex;
    justify-content: flex-end;
    gap: 16px;
    margin: 3px 0;
    font-size: 12px;
  }
  .r-line > span:first-child {
    font-weight: 600;
  }
  .r-grand {
    font-weight: 700;
    font-size: 14px;
    margin-top: 6px;
  }
  /* merchant payment-status block */
  .r-payment {
    margin-top: 16px;
  }
  .r-payment-title {
    margin: 0 0 6px;
    font-size: 12px;
    font-weight: 600;
  }
  .r-check-line {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 5px 0;
    font-size: 12px;
  }
  .r-box {
    width: 11px;
    height: 11px;
    border: 1px solid #000;
    flex: 0 0 auto;
  }
  .r-internal {
    text-align: center;
    margin-top: 18px;
    font-size: 12px;
    letter-spacing: 0.5px;
  }
  /* customer scan-to-pay block */
  .r-scan-title {
    text-align: center;
    font-weight: 700;
    font-size: 13px;
    margin: 8px 0 4px;
  }
  .r-qr {
    display: block;
    width: 96px;
    margin: 2px auto;
  }
  .r-thanks {
    text-align: center;
    font-weight: 700;
    font-size: 13px;
    margin-top: 5px;
  }
  .r-dynamic {
    text-align: center;
    font-size: 9px;
    margin: 0;
  }
}
</style>
