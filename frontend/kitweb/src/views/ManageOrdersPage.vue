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
        saving: false,
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
            <span class="status-badge" :class="'status-' + (o.status || 'PENDING')">
              {{ statusLabel(o.status) }}
            </span>
          </div>

          <div class="order-meta">
            <span class="customer">{{ o.customer_name || '—' }}</span>
            <span class="total">฿{{ Number(o.total_amount || 0).toFixed(2) }}</span>
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

.order-meta {
  display: flex;
  justify-content: space-between;
  margin: 12px 0 8px;
}
.customer { color: #4a3728; font-weight: 600; }
.total { color: #DD876E; font-weight: 700; }

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
</style>
