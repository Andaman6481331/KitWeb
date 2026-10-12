<script setup>
// "Step 2" of a web order: the customer sends us their order number on LINE or
// WhatsApp. We never contact them first, so until this message arrives staff
// treat the order as unverified. Used on the thank-you page and under an
// unconfirmed order in Track Orders.
//
// Every class here is prefixed `oc-`: App.vue ships unscoped rules for
// .confirm-actions / .confirm-card / .confirm-icon (the logout dialog), and
// scoped styles do not stop a global rule from also matching the element.
import { ref, onUnmounted } from 'vue';
import {
    LINE_OA_ID, LINE_OA_URL, confirmationText, lineConfirmUrl, whatsappConfirmUrl
} from '../utils/orderConfirmation';

const props = defineProps({
    orderId: { type: String, required: true },
    // Tighter spacing for the Track Orders sidebar.
    compact: { type: Boolean, default: false }
});

// Which copy button just fired ('message' | 'id'), so only that one flips to "Copied".
const copiedKey = ref('');
let copiedTimer = null;

// Desktop LINE does not always honour the pre-filled link, so the message (and
// the OA id) can be copied and pasted into either app by hand.
const copy = async (key, text) => {
    try {
        await navigator.clipboard.writeText(text);
        copiedKey.value = key;
        clearTimeout(copiedTimer);
        copiedTimer = setTimeout(() => { copiedKey.value = ''; }, 1800);
    } catch {
        // Clipboard blocked (insecure context / permissions): the text is on
        // screen and selectable, so nothing is lost.
    }
};

onUnmounted(() => clearTimeout(copiedTimer));
</script>

<template>
    <section class="oc" :class="{ 'oc-compact': compact }">
        <h2 class="oc-title">{{ $t('orderConfirm.title') }}</h2>
        <p class="oc-intro">{{ $t('orderConfirm.intro') }}</p>

        <div class="oc-id-box">
            <div class="oc-id-text">
                <span class="oc-id-label">{{ $t('orderConfirm.orderNumber') }}</span>
                <strong class="oc-id">{{ orderId }}</strong>
            </div>
            <button type="button" class="oc-copy-btn" @click="copy('message', confirmationText(orderId))">
                {{ copiedKey === 'message' ? $t('orderConfirm.copied') : $t('orderConfirm.copyMessage') }}
            </button>
        </div>

        <div class="oc-buttons">
            <a :href="lineConfirmUrl(orderId)" target="_blank" rel="noopener" class="oc-btn oc-btn-line">
                <svg width="22" height="22" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                    <rect width="40" height="40" rx="10" fill="#fff" />
                    <path
                        d="M20 8C13.4 8 8 12.5 8 18c0 3.7 2.4 6.9 6 8.8l-.8 3.9 4.5-2.4c.7.1 1.5.2 2.3.2 6.6 0 12-4.5 12-10S26.6 8 20 8z"
                        fill="#06C755" />
                </svg>
                <span>{{ $t('orderConfirm.viaLine') }}</span>
            </a>
            <a :href="whatsappConfirmUrl(orderId)" target="_blank" rel="noopener" class="oc-btn oc-btn-whatsapp">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                    <path
                        d="M12.04 2a9.9 9.9 0 0 0-8.5 14.9L2 22l5.3-1.4A9.9 9.9 0 1 0 12.04 2zm0 1.8a8.1 8.1 0 1 1-4.2 15l-.3-.2-3.1.8.8-3-.2-.3A8.1 8.1 0 0 1 12.04 3.8zm-3 3.7c-.2 0-.5.1-.7.4-.3.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.9 4.5 3.9 2.2.9 2.7.7 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.6-.4l-1.8-.9c-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.3-.1-1.1-.4-2.1-1.3-.8-.7-1.3-1.5-1.4-1.8-.1-.2 0-.4.1-.5l.4-.5.3-.4v-.5l-.8-2c-.2-.5-.4-.4-.6-.4z" />
                </svg>
                <span>{{ $t('orderConfirm.viaWhatsapp') }}</span>
            </a>
        </div>

        <p class="oc-desktop-hint">{{ $t('orderConfirm.desktopHint', { lineId: LINE_OA_ID }) }}</p>

        <!-- Fallback for customers who don't follow the steps above: adding the OA
             as a friend and chatting is something everyone already knows how to do. -->
        <div class="oc-help">
            <p class="oc-help-title">{{ $t('orderConfirm.helpTitle') }}</p>
            <p class="oc-help-text">{{ $t('orderConfirm.helpText') }}</p>
            <div class="oc-help-row">
                <span class="oc-line-id">{{ LINE_OA_ID }}</span>
                <button type="button" class="oc-copy-btn" @click="copy('id', LINE_OA_ID)">
                    {{ copiedKey === 'id' ? $t('orderConfirm.copied') : $t('orderConfirm.copyId') }}
                </button>
                <a :href="LINE_OA_URL" target="_blank" rel="noopener" class="oc-help-link">
                    {{ $t('orderConfirm.addOnLine') }}
                </a>
            </div>
        </div>
    </section>
</template>

<style scoped>
/* Surfaces and tokens follow OrderPage: white panel, #F4EDE6 / #E6E0D9 borders,
   #F9F5F0 inset areas, #3D2B1F text. The two messaging buttons keep their brand
   greens because customers recognise LINE / WhatsApp by colour. */
.oc {
    display: block;
    background: #fff;
    border: 1px solid #EAE1D7;
    border-radius: 16px;
    padding: 28px 28px 24px;
    text-align: left;
    box-shadow: 0 2px 12px rgba(61, 43, 31, 0.04);
}

.oc-title {
    font-family: 'Crimson Pro', serif;
    font-size: 24px;
    font-weight: 700;
    line-height: 1.25;
    color: #3D2B1F;
    margin: 0 0 8px;
}

.oc-intro {
    font-size: 14px;
    line-height: 1.6;
    color: #8C7B6E;
    margin: 0 0 20px;
}

.oc-id-box {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px 12px;
    background: #F9F5F0;
    border: 1px solid #E6E0D9;
    border-radius: 12px;
    padding: 14px 16px;
    margin-bottom: 14px;
}

.oc-id-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}

.oc-id-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #8C7B6E;
}

.oc-id {
    font-size: 20px;
    color: #3D2B1F;
    letter-spacing: 0.3px;
    white-space: nowrap;
    user-select: all;
}

.oc-copy-btn {
    flex-shrink: 0;
    padding: 9px 14px;
    border: 1px solid #D9CFC4;
    border-radius: 10px;
    background: #fff;
    color: #3D2B1F;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
    transition: background-color 0.2s ease, border-color 0.2s ease;
}

.oc-copy-btn:hover {
    background: #FCF9F5;
    border-color: #3D2B1F;
}

/* Two columns when there is room (thank-you page), stacked in the narrow Track
   Orders sidebar and on phones. */
.oc-buttons {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 10px;
}

.oc-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 15px 16px;
    border-radius: 12px;
    color: #fff;
    font-size: 16px;
    font-weight: 700;
    text-decoration: none;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.oc-btn:hover {
    transform: translateY(-2px);
}

.oc-btn-line {
    background: #06C755;
}

.oc-btn-line:hover {
    box-shadow: 0 6px 18px rgba(6, 199, 85, 0.25);
}

.oc-btn-whatsapp {
    background: #25D366;
}

.oc-btn-whatsapp:hover {
    box-shadow: 0 6px 18px rgba(37, 211, 102, 0.25);
}

.oc-desktop-hint {
    font-size: 12px;
    line-height: 1.5;
    color: #A0917F;
    margin: 12px 0 0;
}

.oc-help {
    margin-top: 20px;
    padding-top: 18px;
    border-top: 1px solid #EAE1D7;
}

.oc-help-title {
    font-size: 14px;
    font-weight: 700;
    color: #3D2B1F;
    margin: 0 0 4px;
}

.oc-help-text {
    font-size: 13px;
    line-height: 1.55;
    color: #8C7B6E;
    margin: 0 0 12px;
}

.oc-help-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
}

.oc-line-id {
    padding: 9px 12px;
    background: #F9F5F0;
    border: 1px solid #E6E0D9;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 700;
    color: #3D2B1F;
    user-select: all;
}

.oc-help-link {
    margin-left: auto;
    font-size: 13px;
    font-weight: 700;
    color: #3D2B1F;
    text-decoration: underline;
    text-underline-offset: 3px;
}

.oc-help-link:hover {
    color: #DD876E;
}

.oc-compact {
    padding: 16px 14px;
    box-shadow: none;
}

.oc-compact .oc-title {
    font-size: 18px;
}

.oc-compact .oc-id {
    font-size: 16px;
}

@media (max-width: 480px) {
    .oc {
        padding: 20px 16px;
    }

    .oc-help-link {
        margin-left: 0;
    }
}
</style>
