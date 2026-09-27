<script setup>
// Thin announcement strip shown at the top of a page. Badge + text are passed
// in (already translated) so each page can supply its own message.
defineProps({
    badge: { type: String, default: '' },
    text: { type: String, default: '' }
});
</script>

<template>
    <div class="info-banner">
        <div class="banner-content">
            <span v-if="badge" class="banner-badge">{{ badge }}</span>
            <span class="banner-text">{{ text }}</span>
        </div>
    </div>
</template>

<style scoped>
/* Deliberately low-contrast: this strip sits above the page title, so it must
   not out-shout it. Warm cream ground, brown text, hairline rule. */
.info-banner {
    background: #F0E4D4;
    color: #6b5145;
    padding: 8px 20px;
    text-align: center;
    font-size: 12.5px;
    font-weight: 500;
    letter-spacing: 0.3px;
    border-bottom: 1px solid #e2d2bd;
    animation: slideDown 0.5s ease-out;
}

@keyframes slideDown {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
}

.banner-content {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    max-width: 1200px;
    margin: 0 auto;
}

/* The badge keeps the accent colour but as an outline, not a solid fill. */
.banner-badge {
    background-color: transparent;
    color: #C4694E;
    border: 1px solid #e3b7a6;
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 4px;
    letter-spacing: 1px;
    flex-shrink: 0;
}

@media (max-width: 600px) {
    .info-banner {
        font-size: 12px;
        padding: 9px 14px;
    }

    .banner-content {
        gap: 8px;
    }
}
</style>
