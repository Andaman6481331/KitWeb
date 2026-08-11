<script setup>
// One breadcrumb bar for the catalog, product and project pages. Each item is
// `{ label, to? }`; an item without `to` renders as the current page, so the last
// crumb never links back at itself.
defineProps({
    items: {
        type: Array,
        default: () => []
    }
});
</script>

<template>
    <nav class="breadcrumb-bar" :aria-label="$t('catalog.breadcrumb')">
        <ol class="breadcrumb-list">
            <template v-for="(item, i) in items" :key="item.label">
                <li v-if="i > 0" aria-hidden="true" class="breadcrumb-sep">
                    <ion-icon name="chevron-forward-outline"></ion-icon>
                </li>
                <li v-if="item.to">
                    <RouterLink :to="item.to">{{ item.label }}</RouterLink>
                </li>
                <li v-else class="breadcrumb-current" aria-current="page">{{ item.label }}</li>
            </template>
        </ol>
    </nav>
</template>

<style scoped>
.breadcrumb-bar {
    background: #FBF7F2;
    border-bottom: 1px solid #f0e6da;
    padding: 0 clamp(12px, 5%, 48px);
}

.breadcrumb-list {
    display: flex;
    align-items: center;
    gap: 7px;
    height: 42px;
    max-width: 1400px;
    margin: 0 auto;
    padding: 0;
    list-style: none;
    font-family: 'Work Sans', sans-serif;
    font-size: 13px;
    /* Long product names scroll rather than wrap the bar to two lines. */
    overflow-x: auto;
    scrollbar-width: none;
    white-space: nowrap;
}

.breadcrumb-list::-webkit-scrollbar {
    display: none;
}

.breadcrumb-list a {
    color: #9e8272;
    text-decoration: none;
    transition: color 0.15s;
}

.breadcrumb-list a:hover {
    color: #DD876E;
}

.breadcrumb-sep {
    display: flex;
    align-items: center;
    color: #c9b8a8;
    font-size: 11px;
}

.breadcrumb-current {
    color: #5d4037;
    font-weight: 600;
}

@media (max-width: 768px) {
    .breadcrumb-list {
        height: 38px;
        font-size: 12px;
    }
}
</style>
