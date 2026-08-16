<script setup>
// The Request-for-Quote form. Extracted from InstitutionalCatalogPage so that
// Business Sets can reuse it with a fixed, non-editable item list.
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { api } from '../services/api';

const props = defineProps({
    open: { type: Boolean, default: false },
    // [{ id, sku, title, quantity }] — already resolved by the caller.
    items: { type: Array, default: () => [] },
    // Prepended to the submitted notes, e.g. "Business Set: Amigurumi Starter Set".
    contextNote: { type: String, default: '' }
});
const emit = defineEmits(['close', 'submitted']);

const { t } = useI18n();

const submitting = ref(false);
const success = ref(false);
const error = ref(null);
const submittedOrderId = ref('');

const blankForm = () => ({
    customerName: '', organization: '', email: '',
    phoneNumber: '', shippingAddress: '', notes: ''
});
const form = ref(blankForm());

// Reopening after a success must not show the previous receipt.
watch(() => props.open, (isOpen) => {
    if (isOpen) {
        success.value = false;
        error.value = null;
    }
});

const handleSubmit = async () => {
    if (!props.items.length) return;

    submitting.value = true;
    error.value = null;

    const notes = props.contextNote
        ? `${props.contextNote}\n${form.value.notes}`.trim()
        : form.value.notes;

    try {
        const res = await api.submitRfq({
            customerName: form.value.customerName,
            organization: form.value.organization,
            email: form.value.email,
            phoneNumber: form.value.phoneNumber,
            shippingAddress: form.value.shippingAddress,
            notes,
            items: props.items.map(i => ({
                id: i.id, sku: i.sku, title: i.title, quantity: i.quantity
            }))
        });
        if (!res || !res.success) throw new Error(res?.error || 'Failed to submit RFQ');

        success.value = true;
        submittedOrderId.value = res.orderId;
        form.value = blankForm();
        emit('submitted', res.orderId);
    } catch (err) {
        console.error('Error submitting RFQ:', err);
        error.value = err.message || 'An error occurred during submission. Please try again.';
    } finally {
        submitting.value = false;
    }
};
</script>

<template>
  <!-- RFQ Submission Modal Form -->
  <Transition name="modal-fade">
    <div v-if="props.open" class="modal-overlay" @click.self="emit('close')">
      <div class="modal-card">
        <div class="modal-header">
          <h3>{{ t('institutional.modalTitle') }}</h3>
          <button @click="emit('close')" class="btn-close-modal">
            <ion-icon name="close-outline"></ion-icon>
          </button>
        </div>

        <!-- Successful Submission State -->
        <div v-if="success" class="modal-body success-state">
          <ion-icon name="checkmark-circle-outline" class="success-icon"></ion-icon>
          <h4>{{ t('institutional.successTitle') }}</h4>
          <p class="success-subtitle">{{ t('institutional.successSubtitle') }}</p>
          <div class="order-ref-box">
            <span class="ref-label">{{ t('institutional.quotationIdRef') }}</span>
            <span class="ref-id">{{ submittedOrderId }}</span>
          </div>
          <p class="success-footer">{{ t('institutional.successFooter') }}</p>
          <button @click="emit('close')" class="btn-modal-close-action">
            {{ t('institutional.done') }}
          </button>
        </div>

        <!-- Submission Form -->
        <form v-else @submit.prevent="handleSubmit" class="modal-body">
          <div v-if="error" class="modal-error-banner">
            <ion-icon name="warning-outline"></ion-icon>
            <span>{{ error }}</span>
          </div>

          <p class="modal-intro-text">
            {{ t('institutional.formIntro') }}
          </p>

          <div class="form-row">
            <div class="form-group">
              <label for="orgName">{{ t('institutional.orgNameLabel') }}</label>
              <input
                type="text"
                id="orgName"
                v-model="form.organization"
                :placeholder="t('institutional.orgNamePlaceholder')"
                required
              />
            </div>
            <div class="form-group">
              <label for="custName">{{ t('institutional.contactNameLabel') }}</label>
              <input
                type="text"
                id="custName"
                v-model="form.customerName"
                :placeholder="t('institutional.contactNamePlaceholder')"
                required
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="custEmail">{{ t('institutional.emailLabel') }}</label>
              <input
                type="email"
                id="custEmail"
                v-model="form.email"
                :placeholder="t('institutional.emailPlaceholder')"
                required
              />
            </div>
            <div class="form-group">
              <label for="custPhone">{{ t('institutional.phoneLabel') }}</label>
              <input
                type="tel"
                id="custPhone"
                v-model="form.phoneNumber"
                :placeholder="t('institutional.phonePlaceholder')"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="shippingAddr">{{ t('institutional.shippingLabel') }}</label>
            <textarea
              id="shippingAddr"
              v-model="form.shippingAddress"
              :placeholder="t('institutional.shippingPlaceholder')"
              rows="2"
            ></textarea>
          </div>

          <div class="form-group">
            <label for="rfqNotes">{{ t('institutional.notesLabel') }}</label>
            <textarea
              id="rfqNotes"
              v-model="form.notes"
              :placeholder="t('institutional.notesPlaceholder')"
              rows="2"
            ></textarea>
          </div>

          <!-- Preview items in quote -->
          <div class="quote-preview-section">
            <span class="preview-section-title">{{ t('institutional.selectedItems', { count: props.items.length }) }}</span>
            <div class="preview-items-list">
              <div v-for="item in props.items" :key="item.id" class="preview-item-row">
                <span class="item-title-col"><strong>{{ item.title }}</strong> &nbsp;<span v-if="item.sku" class="item-sku">({{ item.sku }})</span></span>
                <span class="item-qty-col">{{ t('institutional.qty') }} {{ item.quantity }}</span>
              </div>
            </div>
          </div>

          <div class="modal-footer-actions">
            <button type="button" @click="emit('close')" class="btn-cancel" :disabled="submitting">
              {{ t('institutional.cancel') }}
            </button>
            <button type="submit" class="btn-submit-rfq" :disabled="submitting">
              <span v-if="submitting" class="mini-spinner"></span>
              <span v-else>{{ t('institutional.submitQuote') }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Modal Overlay & Cards */
.modal-overlay {
  /* The same tokens InstitutionalCatalogPage defines on .b2b-wrapper. Declared
     here too so the modal stands alone: Business Sets renders it outside that
     wrapper, where the inherited values would be missing. */
  --b2b-primary: #604539;
  --b2b-secondary: #8b6f47;
  --b2b-light: #FBF7F2;
  --b2b-beige: #FDF3E6;
  --b2b-dark: #2D241E;
  --b2b-mute: #9e8272;
  --b2b-accent: #DD876E;
  --b2b-border: #EADFD3;

  position: fixed;
  inset: 0;
  background-color: rgba(45, 36, 30, 0.6);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  animation: fadeIn 0.3s ease;
}

.modal-card {
  background-color: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 650px;
  max-height: 90vh;
  overflow-y: auto;
  animation: scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--b2b-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--b2b-beige);
}

.modal-header h3 {
  margin: 0;
  color: var(--b2b-primary);
  font-size: 1.25rem;
  font-weight: 700;
}

.btn-close-modal {
  background: transparent;
  border: none;
  font-size: 24px;
  color: var(--b2b-primary);
  cursor: pointer;
}

.modal-body {
  padding: 24px;
}

.modal-intro-text {
  font-size: 13.5px;
  color: #6B5D54;
  line-height: 1.5;
  margin-bottom: 20px;
}

.form-row {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  margin-bottom: 15px;
}

.form-row .form-group {
  flex: 1;
  min-width: 250px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 15px;
}

.form-group label {
  font-size: 12px;
  font-weight: 700;
  color: var(--b2b-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-group input,
.form-group textarea {
  border: 1px solid var(--b2b-border);
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 14px;
  color: var(--b2b-dark);
  background-color: var(--b2b-light);
  transition: border-color 0.3s;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--b2b-accent);
  background-color: #FFFFFF;
}

.modal-error-banner {
  background-color: #fcebeb;
  border: 1px solid #f7c8c8;
  color: #b03a3a;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 500;
}

/* Quote preview list */
.quote-preview-section {
  margin-top: 25px;
  border: 1px solid var(--b2b-border);
  border-radius: 6px;
  overflow: hidden;
}

.preview-section-title {
  display: block;
  background-color: var(--b2b-beige);
  color: var(--b2b-primary);
  font-size: 11px;
  font-weight: 700;
  padding: 8px 12px;
  border-bottom: 1px solid var(--b2b-border);
  text-transform: uppercase;
}

.preview-items-list {
  max-height: 140px;
  overflow-y: auto;
  padding: 5px 0;
  background-color: #FFFFFF;
}

.preview-item-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  font-size: 13px;
  border-bottom: 1px dashed var(--b2b-beige);
}

.preview-item-row:last-child {
  border-bottom: none;
}

.item-sku {
  color: var(--b2b-secondary);
  font-family: monospace;
}

.item-qty-col {
  font-weight: 600;
  color: var(--b2b-primary);
}

.modal-footer-actions {
  margin-top: 25px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-cancel {
  background-color: transparent;
  color: #6B5D54;
  border: 1px solid var(--b2b-border);
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}

.btn-cancel:hover {
  background-color: var(--b2b-light);
}

.btn-submit-rfq {
  background-color: var(--b2b-primary);
  color: #FFFFFF;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-submit-rfq:hover:not(:disabled) {
  background-color: #4a3429;
}

.btn-submit-rfq:disabled {
  background-color: var(--b2b-border);
  color: var(--b2b-mute);
  cursor: not-allowed;
}

/* Success state modal styling */
.success-state {
  text-align: center;
  padding: 40px 20px;
}

.success-icon {
  font-size: 64px;
  color: #2e9a52;
  margin-bottom: 15px;
}

.success-subtitle {
  font-size: 14px;
  color: #6B5D54;
  margin-top: 8px;
}

.order-ref-box {
  background-color: var(--b2b-beige);
  border: 1px solid var(--b2b-border);
  padding: 12px;
  border-radius: 6px;
  display: inline-flex;
  flex-direction: column;
  margin: 20px 0;
}

.ref-label {
  font-size: 11px;
  text-transform: uppercase;
  color: var(--b2b-secondary);
  font-weight: 600;
}

.ref-id {
  font-size: 16px;
  font-weight: bold;
  color: var(--b2b-primary);
  font-family: monospace;
  margin-top: 4px;
}

.success-footer {
  font-size: 12px;
  color: var(--b2b-mute);
}

.btn-modal-close-action {
  background-color: var(--b2b-primary);
  color: #FFFFFF;
  border: none;
  padding: 10px 30px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  margin-top: 15px;
}

.mini-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--b2b-border);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s infinite linear;
}

/* Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

/* Keyframes shared with InstitutionalCatalogPage.vue (.spinner uses spin,
   .qty-control uses fadeIn) — duplicated here since scoped styles don't
   cross component boundaries. */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleUp {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>
