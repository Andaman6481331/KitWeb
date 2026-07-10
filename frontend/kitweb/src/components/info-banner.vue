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
.info-banner {
    background: linear-gradient(135deg, #604539 0%, #4a3429 100%);
    color: #fff;
    padding: 10px 20px;
    text-align: center;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.5px;
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

.banner-badge {
    background-color: #DD876E;
    color: #fff;
    font-size: 10px;
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
