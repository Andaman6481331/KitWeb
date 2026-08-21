<script setup>
import { ref, reactive, onMounted } from 'vue';
import { api } from '../services/api';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const isAuthenticated = ref(!!api.getToken());
const password = ref('');
const loginError = ref(false);

const orders = ref([]);
const isLoading = ref(false);
const loadError = ref('');

// Per-order editable draft + UI state, keyed by order id.
const drafts = reactive({});

const STATUS_OPTIONS = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

const statusLabel = (s) => t(`manageOrders.status.${s}`, s || 'PENDING');

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString();
};

// An order still waiting on staff to fill in prices. Set by the Worker when the
// cart contained a product whose catalog price hadn't been uploaded yet.
const isQuote = (o) => o.payment_method === 'QUOTE';

// Reachability of the customer on LINE OA, used for the indicator badge.
const lineState = (o) => {
  if (!o.line_user_id) return 'none';
  return Number(o.line_push_failed) === 1 ? 'unreachable' : 'reachable';
};

const loadOrders = async () => {
  isLoading.value = true;
  loadError.value = '';
  try {
    const data = await api.getOrders();
    orders.value = Array.isArray(data) ? data : [];
    for (const o of orders.value) {
      drafts[o.id] = {
        status: o.status || 'PENDING',
        trackingNumber: o.tracking_number || '',
        editing: false,
        customerName: o.customer_name || '',
        phoneNumber: o.phone_number || '',
        shippingAddress: o.shipping_address || '',
        lineDisplayName: o.line_display_name || '',
        note: o.note || '',
        items: (o.items || []).map((it) => ({
          id: it.product_id ?? null,
          name: it.product_name || '',
          selectedSize: it.size || '',
          selectedColor: it.color || '',
          quantity: Number(it.quantity) || 1,
          price: Number(it.price) || 0,
        })),
        saving: false,
        savingEdit: false,
        message: '',
        error: false,
      };
    }
  } catch (e) {
    loadError.value = e?.message || t('manageOrders.loadFailed');
  } finally {
    isLoading.value = false;
  }
};

const handleLogin = async () => {
  const result = await api.adminLogin(password.value);
  if (result.success) {
    isAuthenticated.value = true;
    loginError.value = false;
    loadOrders();
  } else {
    loginError.value = true;
  }
};

const updateOrder = async (order) => {
  const draft = drafts[order.id];
  if (!draft) return;
  draft.saving = true;
  draft.message = '';
  draft.error = false;
  try {
    const res = await api.updateOrderStatus({
      orderId: order.id,
      status: draft.status,
      trackingNumber: draft.trackingNumber,
    });
    // Reflect the saved values back onto the row.
    order.status = draft.status;
    order.tracking_number = draft.trackingNumber;
    draft.message = res?.customerNotified
      ? t('manageOrders.savedNotified')
      : t('manageOrders.saved');
  } catch (e) {
    draft.error = true;
    draft.message = e?.message || t('manageOrders.saveFailed');
  } finally {
    draft.saving = false;
  }
};

const toggleEdit = (o) => {
  const d = drafts[o.id];
  if (d) d.editing = !d.editing;
};

const addItem = (o) => {
  drafts[o.id]?.items.push({ id: null, name: '', selectedSize: '', selectedColor: '', quantity: 1, price: 0 });
};

const removeItem = (o, idx) => {
  drafts[o.id]?.items.splice(idx, 1);
};

// Full edit: customer/fulfilment fields + line items. The backend recomputes the
// total (and per-item prices for real products) from the catalog on save.
const saveFullOrder = async (o) => {
  const d = drafts[o.id];
  if (!d) return;
  d.savingEdit = true;
  d.error = false;
  d.message = '';
  try {
    const res = await api.updateOrder({
      orderId: o.id,
      customerName: d.customerName,
      phoneNumber: d.phoneNumber,
      shippingAddress: d.shippingAddress,
      lineDisplayName: d.lineDisplayName,
      note: d.note,
      status: d.status,
      trackingNumber: d.trackingNumber,
      items: d.items.map((it) => ({
        id: it.id,
        name: it.name,
        selectedSize: it.selectedSize,
        selectedColor: it.selectedColor,
        quantity: Number(it.quantity) || 0,
        price: Number(it.price) || 0,
      })),
    });
    // Only set when pricing up a quote actually reached the customer on LINE.
    const notified = res?.customerNotified;
    // Reload to reflect the server-recomputed total and saved items.
    await loadOrders();
    // loadOrders() rebuilds drafts, so the message has to be set after it.
    if (drafts[o.id]) {
      drafts[o.id].message = notified
        ? t('manageOrders.savedNotified')
        : t('manageOrders.saved');
    }
  } catch (e) {
    d.error = true;
    d.message = e?.message || t('manageOrders.saveFailed');
    d.savingEdit = false;
  }
};

onMounted(() => {
  if (isAuthenticated.value) loadOrders();
});
</script>

<template>
  <div class="manage-container">
    <!-- Login gate -->
    <div v-if="!isAuthenticated" class="login-box">
      <h1>{{ t('manageOrders.title') }}</h1>
      <input
        v-model="password"
        type="password"
        :placeholder="t('manageOrders.passwordPlaceholder')"
        @keyup.enter="handleLogin"
      />
      <button @click="handleLogin">{{ t('manageOrders.signIn') }}</button>
      <p v-if="loginError" class="error">{{ t('manageOrders.incorrectPassword') }}</p>
    </div>

    <!-- Orders panel -->
    <div v-else class="manage-panel">
      <header class="panel-header">
        <h1>{{ t('manageOrders.title') }}</h1>
        <button class="refresh-btn" @click="loadOrders" :disabled="isLoading">
          {{ isLoading ? t('manageOrders.loading') : t('manageOrders.refresh') }}
        </button>
      </header>

      <p v-if="loadError" class="error">{{ loadError }}</p>
      <p v-else-if="!isLoading && orders.length === 0" class="empty">
        {{ t('manageOrders.noOrders') }}
      </p>

      <div class="order-list">
        <article v-for="o in orders" :key="o.id" class="order-card">
          <div class="order-top">
            <div class="order-id-block">
              <span class="order-id">{{ o.id }}</span>
              <span class="order-date">{{ formatDate(o.created_at) }}</span>
            </div>
            <div class="badge-group">
              <span v-if="isQuote(o)" class="quote-badge">{{ t('manageOrders.awaitingPricing', 'Awaiting pricing') }}</span>
              <span class="status-badge" :class="'status-' + (o.status || 'PENDING')">
                {{ statusLabel(o.status) }}
              </span>
            </div>
          </div>

          <div class="order-meta">
            <span class="customer">{{ o.customer_name || '—' }}</span>
            <span class="total total-quote" v-if="isQuote(o)">{{ t('manageOrders.awaitingPricing', 'Awaiting pricing') }}</span>
            <span class="total" v-else>฿{{ Number(o.total_amount || 0).toFixed(2) }}</span>
          </div>

          <!-- LINE reachability -->
          <div class="line-state" :class="'line-' + lineState(o)">
            <template v-if="lineState(o) === 'reachable'">🟢 {{ t('manageOrders.lineReachable') }}</template>
            <template v-else-if="lineState(o) === 'unreachable'">🔴 {{ t('manageOrders.lineUnreachable') }}</template>
            <template v-else>⚪ {{ t('manageOrders.lineNotConnected') }}</template>
          </div>

          <!-- Items -->
          <ul v-if="o.items && o.items.length" class="item-list">
            <li v-for="it in o.items" :key="it.id">
              {{ it.product_name }}
              <span class="item-variant">{{ it.size }} / {{ it.color }} ×{{ it.quantity }}</span>
            </li>
          </ul>

          <!-- Update controls -->
          <div v-if="drafts[o.id]" class="update-row">
            <select v-model="drafts[o.id].status" class="status-select">
              <option v-for="s in STATUS_OPTIONS" :key="s" :value="s">{{ statusLabel(s) }}</option>
            </select>
            <input
              v-model="drafts[o.id].trackingNumber"
              type="text"
              class="tracking-input"
              :placeholder="t('manageOrders.trackingPlaceholder')"
            />
            <button class="update-btn" :disabled="drafts[o.id].saving" @click="updateOrder(o)">
              {{ drafts[o.id].saving ? t('manageOrders.saving') : t('manageOrders.updateNotify') }}
            </button>
            <button class="edit-toggle-btn" @click="toggleEdit(o)">
              {{ drafts[o.id].editing ? 'Close editor' : 'Edit details' }}
            </button>
          </div>

          <!-- Full editor: customer info + line items -->
          <div v-if="drafts[o.id] && drafts[o.id].editing" class="order-editor">
            <div class="edit-fields">
              <label>Name<input v-model="drafts[o.id].customerName" type="text" /></label>
              <label>Phone<input v-model="drafts[o.id].phoneNumber" type="text" /></label>
              <label>LINE name<input v-model="drafts[o.id].lineDisplayName" type="text" /></label>
              <label class="full">Address<textarea v-model="drafts[o.id].shippingAddress" rows="2"></textarea></label>
              <label class="full">Note<textarea v-model="drafts[o.id].note" rows="2"></textarea></label>
            </div>

            <div class="edit-items">
              <div class="edit-items-head">Items</div>
              <div v-for="(it, idx) in drafts[o.id].items" :key="idx" class="edit-item-row">
                <input v-model="it.name" type="text" class="ei-name" placeholder="Product name" />
                <input v-model="it.selectedSize" type="text" class="ei-sm" placeholder="Size" />
                <input v-model="it.selectedColor" type="text" class="ei-sm" placeholder="Color" />
                <input v-model.number="it.quantity" type="number" min="0" class="ei-qty" title="Qty" />
                <input v-model.number="it.price" type="number" min="0" class="ei-price"
                  title="Unit ฿ — used for custom lines and for products with no catalog price yet" />
                <button class="ei-remove" @click="removeItem(o, idx)" title="Remove">✕</button>
              </div>
              <button class="add-item-btn" @click="addItem(o)">+ Add item</button>
            </div>

            <button class="save-edit-btn" :disabled="drafts[o.id].savingEdit" @click="saveFullOrder(o)">
              {{ drafts[o.id].savingEdit ? t('manageOrders.saving') : 'Save changes' }}
            </button>
            <p class="edit-hint">Prices for catalog products are recalculated on save. The ฿ field is used for custom lines and for products whose catalog price isn't uploaded yet — filling in every line turns a quote into a normal order.</p>
          </div>

          <p
            v-if="drafts[o.id] && drafts[o.id].message"
            class="update-msg"
            :class="{ 'is-error': drafts[o.id].error }"
          >
            {{ drafts[o.id].message }}
          </p>
        </article>
      </div>
    </div>
  </div>
</template>

<style scoped>
.manage-container {
  min-height: 100vh;
  background: #FBF7F2;
  padding: 24px 16px 64px;
}

/* Login */
.login-box {
  max-width: 360px;
  margin: 80px auto;
  background: #fff;
  border: 1px solid #ede4d9;
  border-radius: 14px;
  padding: 32px 28px;
  text-align: center;
  box-shadow: 0 4px 24px rgba(80, 55, 35, 0.07);
}
.login-box h1 { font-size: 1.4rem; color: #604539; margin: 0 0 20px; }
.login-box input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #ddd2c4;
  border-radius: 8px;
  margin-bottom: 14px;
  font-size: 1rem;
}
.login-box button {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background: #DD876E;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
.error { color: #c0392b; margin-top: 12px; font-size: 0.9rem; }
.empty { text-align: center; color: #9e8272; margin-top: 40px; }

/* Panel */
.manage-panel { max-width: 920px; margin: 0 auto; }
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}
.panel-header h1 { font-size: 1.6rem; color: #604539; margin: 0; }
.refresh-btn {
  padding: 8px 18px;
  border: 1px solid #DD876E;
  background: #fff;
  color: #DD876E;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}
.refresh-btn:disabled { opacity: 0.6; cursor: default; }

/* Cards */
.order-list { display: flex; flex-direction: column; gap: 16px; }
.order-card {
  background: #fff;
  border: 1px solid #ede4d9;
  border-radius: 14px;
  padding: 20px 22px;
  box-shadow: 0 2px 12px rgba(80, 55, 35, 0.05);
}
.order-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.order-id-block { display: flex; flex-direction: column; }
.order-id { font-weight: 700; color: #3d2b1f; }
.order-date { font-size: 0.8rem; color: #9e8272; margin-top: 2px; }

.status-badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 999px;
  white-space: nowrap;
}
.status-PENDING { background: #f4ecd9; color: #9a7d2e; }
.status-PAID { background: #e3eefc; color: #2f6fb0; }
.status-SHIPPED { background: #e2f3e6; color: #2e9a52; }
.status-DELIVERED { background: #d8efe0; color: #1f7a45; }
.status-CANCELLED { background: #f7e2e2; color: #b03a3a; }

.badge-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.quote-badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 999px;
  white-space: nowrap;
  background: #fbe9df;
  color: #b5652f;
}

.order-meta {
  display: flex;
  justify-content: space-between;
  margin: 12px 0 8px;
}
.customer { color: #4a3728; font-weight: 600; }
.total { color: #DD876E; font-weight: 700; }
.total-quote {
  font-style: italic;
  font-weight: 600;
  color: #b5652f;
}

.line-state { font-size: 0.82rem; margin-bottom: 10px; }
.line-unreachable { color: #b03a3a; }
.line-reachable { color: #2e9a52; }
.line-none { color: #9e8272; }

.item-list {
  list-style: none;
  padding: 12px 0;
  margin: 0 0 8px;
  border-top: 1px solid #f0e8dd;
  font-size: 0.88rem;
  color: #4a3728;
}
.item-list li { padding: 2px 0; }
.item-variant { color: #9e8272; font-size: 0.8rem; margin-left: 6px; }

/* Update controls */
.update-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  border-top: 1px solid #f0e8dd;
  padding-top: 14px;
}
.status-select {
  padding: 9px 12px;
  border: 1px solid #ddd2c4;
  border-radius: 8px;
  background: #fff;
  font-size: 0.9rem;
}
.tracking-input {
  flex: 1;
  min-width: 160px;
  padding: 9px 12px;
  border: 1px solid #ddd2c4;
  border-radius: 8px;
  font-size: 0.9rem;
}
.update-btn {
  padding: 9px 20px;
  border: none;
  border-radius: 8px;
  background: #DD876E;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
.update-btn:disabled { opacity: 0.6; cursor: default; }
.update-msg { margin: 10px 0 0; font-size: 0.85rem; color: #2e9a52; }
.update-msg.is-error { color: #c0392b; }

/* Full editor */
.edit-toggle-btn {
  padding: 9px 16px;
  border: 1px solid #ddd2c4;
  border-radius: 8px;
  background: #fff;
  color: #7a6a5c;
  font-weight: 600;
  cursor: pointer;
}
.order-editor {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed #e6dccf;
}
.edit-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 12px;
}
.edit-fields label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.78rem;
  font-weight: 600;
  color: #7a6a5c;
}
.edit-fields label.full { grid-column: 1 / -1; }
.edit-fields input,
.edit-fields textarea {
  padding: 8px 10px;
  border: 1px solid #ddd2c4;
  border-radius: 7px;
  font-size: 0.9rem;
  font-family: inherit;
  resize: vertical;
}
.edit-items { margin-top: 14px; }
.edit-items-head { font-size: 0.78rem; font-weight: 700; color: #7a6a5c; margin-bottom: 8px; }
.edit-item-row {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
  align-items: center;
}
.edit-item-row input {
  padding: 7px 8px;
  border: 1px solid #ddd2c4;
  border-radius: 6px;
  font-size: 0.85rem;
  min-width: 0;
}
.ei-name { flex: 3; }
.ei-sm { flex: 1; }
.ei-qty { width: 54px; flex: none; }
.ei-price { width: 68px; flex: none; }
.ei-remove {
  border: none;
  background: #f7e2e2;
  color: #b03a3a;
  border-radius: 6px;
  width: 28px;
  height: 30px;
  cursor: pointer;
  flex: none;
}
.add-item-btn {
  margin-top: 4px;
  padding: 7px 14px;
  border: 1px dashed #c9b8a8;
  background: #fff;
  color: #7a6a5c;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}
.save-edit-btn {
  margin-top: 14px;
  padding: 10px 22px;
  border: none;
  border-radius: 8px;
  background: #3D2B1F;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}
.save-edit-btn:disabled { opacity: 0.6; cursor: default; }
.edit-hint { margin: 8px 0 0; font-size: 0.78rem; color: #9e8272; }
</style>
