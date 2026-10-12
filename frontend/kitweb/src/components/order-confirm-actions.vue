<script setup>
// "Step 2" of a web order: the customer sends us their order number on LINE or
// WhatsApp. We never contact them first, so until this message arrives staff
// treat the order as unverified. Used on the thank-you page and under an
// unconfirmed order in Track Orders.
import { ref, onUnmounted } from 'vue';
import {
    LINE_OA_ID, confirmationText, lineConfirmUrl, whatsappConfirmUrl
} from '../utils/orderConfirmation';

const props = defineProps({
    orderId: { type: String, required: true },
    // Tighter spacing for the Track Orders sidebar.
    compact: { type: Boolean, default: false }
});

const copied = ref(false);
let copiedTimer = null;

// Desktop LINE does not always honour the pre-filled link, so the message can be
// copied and pasted into either app by hand.
const copyMessage = async () => {
    try {
        await navigator.clipboard.writeText(confirmationText(props.orderId));
        copied.value = true;
        clearTimeout(copiedTimer);
        copiedTimer = setTimeout(() => { copied.value = false; }, 1800);
    } catch {
        // Clipboard blocked (insecure context / permissions): the order number is
        // on screen and selectable, so nothing is lost.
    }
};

onUnmounted(() => clearTimeout(copiedTimer));
</script>

<template>
    <section class="confirm-actions" :class="{ 'is-compact': compact }">
        <h2 class="confirm-title">{{ $t('orderConfirm.title') }}</h2>
        <p class="confirm-intro">{{ $t('orderConfirm.intro') }}</p>

        <div class="confirm-id-box">
            <div class="confirm-id-text">
                <span class="confirm-id-label">{{ $t('orderConfirm.orderNumber') }}</span>
                <strong class="confirm-id">{{ orderId }}</strong>
            </div>
            <button type="button" class="confirm-copy-btn" @click="copyMessage">
                {{ copied ? $t('orderConfirm.copied') : $t('orderConfirm.copyMessage') }}
            </button>
        </div>

        <div class="confirm-buttons">
            <a :href="lineConfirmUrl(orderId)" target="_blank" rel="noopener" class="confirm-btn confirm-btn-line">
                <svg width="20" height="20" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                    <rect width="40" height="40" rx="10" fill="#fff" />
                    <path
                        d="M20 8C13.4 8 8 12.5 8 18c0 3.7 2.4 6.9 6 8.8l-.8 3.9 4.5-2.4c.7.1 1.5.2 2.3.2 6.6 0 12-4.5 12-10S26.6 8 20 8z"
                        fill="#06C755" />
                </svg>
                {{ $t('orderConfirm.viaLine') }}
            </a>
            <a :href="whatsappConfirmUrl(orderId)" target="_blank" rel="noopener"
                class="confirm-btn confirm-btn-whatsapp">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                    <path
                        d="M12.04 2a9.9 9.9 0 0 0-8.5 14.9L2 22l5.3-1.4A9.9 9.9 0 1 0 12.04 2zm0 1.8a8.1 8.1 0 1 1-4.2 15l-.3-.2-3.1.8.8-3-.2-.3A8.1 8.1 0 0 1 12.04 3.8zm-3 3.7c-.2 0-.5.1-.7.4-.3.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.9 4.5 3.9 2.2.9 2.7.7 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.6-.4l-1.8-.9c-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.3-.1-1.1-.4-2.1-1.3-.8-.7-1.3-1.5-1.4-1.8-.1-.2 0-.4.1-.5l.4-.5.3-.4v-.5l-.8-2c-.2-.5-.4-.4-.6-.4z" />
                </svg>
                {{ $t('orderConfirm.viaWhatsapp') }}
            </a>
        </div>

        <p class="confirm-hint">{{ $t('orderConfirm.desktopHint', { lineId: LINE_OA_ID }) }}</p>
    </section>
</template>

<style scoped>
.confirm-actions {
    background: #FFF8F0;
    border: 1px solid #F0DCC6;
    border-radius: 16px;
    padding: 22px 20px;
    text-align: left;
}

.confirm-title {
    font-family: 'Crimson Pro', serif;
    font-size: 22px;
    font-weight: 700;
    color: #3D2B1F;
    margin: 0 0 8px;
}

.confirm-intro {
    font-size: 14px;
    line-height: 1.6;
    color: #6b5145;
    margin: 0 0 16px;
}

.confirm-id-box {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: #fff;
    border: 1px dashed #D9BFA4;
    border-radius: 12px;
    padding: 12px 14px;
    margin-bottom: 14px;
}

.confirm-id-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.confirm-id-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: #8C7B6E;
}

.confirm-id {
    font-size: 17px;
    color: #3D2B1F;
    letter-spacing: 0.3px;
    overflow-wrap: anywhere;
    user-select: all;
}

.confirm-copy-btn {
    flex-shrink: 0;
    padding: 8px 14px;
    border: 1px solid #D1C7BD;
    border-radius: 10px;
    background: #fff;
    color: #3D2B1F;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
}

.confirm-copy-btn:hover {
    background: #F9F5F0;
}

.confirm-buttons {
    display: flex;
    gap: 10px;
}

.confirm-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 10px;
    border-radius: 12px;
    color: #fff;
    font-size: 15px;
    font-weight: 700;
    text-decoration: none;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.confirm-btn:hover {
    transform: translateY(-2px);
}

.confirm-btn-line {
    background: #06C755;
}

.confirm-btn-line:hover {
    box-shadow: 0 6px 18px rgba(6, 199, 85, 0.25);
}

.confirm-btn-whatsapp {
    background: #25D366;
}

.confirm-btn-whatsapp:hover {
    box-shadow: 0 6px 18px rgba(37, 211, 102, 0.25);
}

.confirm-hint {
    font-size: 12px;
    line-height: 1.5;
    color: #8C7B6E;
    margin: 12px 0 0;
}

.is-compact {
    padding: 16px 14px;
}

.is-compact .confirm-title {
    font-size: 18px;
}

.is-compact .confirm-buttons {
    flex-direction: column;
}

@media (max-width: 480px) {
    .confirm-buttons {
        flex-direction: column;
    }
}
</style>
