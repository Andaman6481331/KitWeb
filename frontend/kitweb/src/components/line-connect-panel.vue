<script setup>
// The LINE connect card from the checkout form, extracted so it can be rendered in
// two different places without existing twice in the DOM. At desktop width it sits
// beside the name/phone fields inside the shipping card; below 1100px it stays a
// full-width card at the bottom of the form. CSS cannot reparent an element and a
// duplicate would mean two checkboxes bound to one piece of state, so OrderPage
// mounts this component into whichever slot the current width calls for.
import { getUtilsUrl } from '@/services/api';

// The shop's own OA — the same account ThankYouPage links to and ContactUsPage
// shows a QR for. Reusing that asset keeps one QR to update if the OA ever moves.
const LINE_OA_ID = '@oar4837p';
const LINE_OA_URL = 'https://line.me/ti/p/@oar4837p';
const LINE_OA_QR = 'LineOfficialQR-large.webp';

const enabled = defineModel({ type: Boolean });

defineProps({
    // A quote has no price yet, so LINE stops being optional convenience and
    // becomes the channel staff reply on. Say so rather than leaving it implied.
    isQuote: { type: Boolean, default: false },
    lineUserId: { type: [String, Number], default: null },
    lineDisplayName: { type: String, default: '' },
    connecting: { type: Boolean, default: false },
    // Beside the form the card is narrow and tall; on its own it is wide and short.
    compact: { type: Boolean, default: false }
});

defineEmits(['connect']);
</script>

<template>
    <div class="form-card line-connect-section" :class="{ 'line-highlight': isQuote, 'line-compact': compact }">
        <label class="line-toggle-label">
            <input type="checkbox" v-model="enabled" class="line-toggle-checkbox" />
            <span class="line-toggle-text">{{ $t('order.lineConnectPrompt') }}</span>
        </label>
        <p class="line-reason" v-if="isQuote">{{ $t('order.lineQuoteReason') }}</p>

        <!-- The QR is the path for customers who never log in: scanning adds the OA
             so staff can reach them, with no account and no OAuth round trip. -->
        <div class="line-oa">
            <a class="line-oa-qr" :href="LINE_OA_URL" target="_blank" rel="noopener">
                <img :src="getUtilsUrl(LINE_OA_QR)" alt="" width="96" height="96" loading="lazy" />
            </a>
            <div class="line-oa-text">
                <span class="line-oa-label">{{ $t('order.lineAddOa') }}</span>
                <a class="line-oa-id" :href="LINE_OA_URL" target="_blank" rel="noopener">{{ LINE_OA_ID }}</a>
            </div>
        </div>

        <div v-if="enabled" class="line-connect-action">
            <button v-if="!lineUserId" type="button" class="line-connect-btn" @click="$emit('connect')"
                :disabled="connecting">
                <svg width="18" height="18" viewBox="0 0 40 40" fill="none">
                    <rect width="40" height="40" rx="8" fill="#06C755" />
                    <path
                        d="M20 8C13.4 8 8 12.5 8 18c0 3.7 2.4 6.9 6 8.8l-.8 3.9 4.5-2.4c.7.1 1.5.2 2.3.2 6.6 0 12-4.5 12-10S26.6 8 20 8z"
                        fill="white" />
                </svg>
                {{ connecting ? $t('order.lineConnecting') : $t('order.connectLine') }}
            </button>
            <div v-else class="line-connected-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06C755" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12" />
                </svg>
                {{ $t('order.lineConnected') }}: {{ lineDisplayName }}
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Mirrors .form-card in OrderPage — scoped styles do not cross into a child, so
   the card's own shape lives here with it. */
.form-card {
    background: white;
    border: 1px solid #F4EDE6;
    border-radius: 16px;
    padding: 24px;
}

.line-connect-section {
    background: #F0FFF6;
    border: 1px solid #C3EFD4;
}

.line-highlight {
    border: 1px solid #06C755;
    box-shadow: 0 0 0 3px rgba(6, 199, 85, 0.08);
}

/* Beside the form fields there is far less width to spend. */
.line-compact {
    padding: 18px;
    height: 100%;
    box-sizing: border-box;
}

.line-toggle-label {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    cursor: pointer;
    font-weight: 500;
    font-size: 14px;
    color: #2d6a4f;
    user-select: none;
}

.line-toggle-checkbox {
    width: auto;
    margin-top: 2px;
    flex-shrink: 0;
}

.line-toggle-text {
    line-height: 1.4;
}

.line-reason {
    margin: 8px 0 0;
    font-size: 13px;
    line-height: 1.5;
    color: #6B584A;
}

.line-oa {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid #C3EFD4;
}

.line-oa-qr {
    flex-shrink: 0;
    display: block;
    line-height: 0;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #C3EFD4;
    background: white;
}

.line-oa-qr img {
    display: block;
    width: 96px;
    height: 96px;
    object-fit: contain;
}

.line-oa-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
}

.line-oa-label {
    font-size: 13px;
    line-height: 1.4;
    color: #2d6a4f;
}

.line-oa-id {
    font-size: 15px;
    font-weight: 700;
    color: #06C755;
    text-decoration: none;
    word-break: break-all;
}

.line-oa-id:hover {
    text-decoration: underline;
}

.line-connect-action {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #C3EFD4;
}

.line-connect-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #06C755;
    color: white;
    border: none;
    padding: 10px 18px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s;
}

.line-connect-btn:hover {
    background: #05a847;
}

.line-connect-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.line-connected-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 600;
    color: #2d6a4f;
}

/* Stacked under the narrow card the QR would crowd the text out. */
@media (max-width: 420px) {
    .line-oa {
        flex-direction: column;
        align-items: flex-start;
    }
}
</style>
