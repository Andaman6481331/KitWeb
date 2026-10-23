<script setup>
// One product row in the list view (the design's table row).
import { computed } from 'vue';
import { getProductImageUrl } from '../../../utils/productImages';
import { badgesFor, formatPriceRange, formatMoq, formatAdded } from '../../../utils/adminInventory';
import InventoryMenu from './InventoryMenu.vue';

const props = defineProps({
  item: { type: Object, required: true },
  t: { type: Object, required: true },
  lang: { type: String, default: 'en' },
  categoryLabel: { type: String, default: '' },
  selected: { type: Boolean, default: false },
  menuOpen: { type: Boolean, default: false },
});
defineEmits(['select', 'menu', 'edit', 'duplicate', 'flip', 'archive', 'restore']);

const name = computed(() => (props.lang === 'th' ? props.item.nameTh || props.item.name : props.item.name));
const badges = computed(() => badgesFor(props.item));
const dim = computed(() => !props.item.isVisible || props.item.isArchived);
const price = computed(() => formatPriceRange(props.item.priceRange));
const badgeLabel = (kind) => ({
  noPrice: props.t.bNoPrice, incomplete: props.t.bIncomplete, hidden: props.t.bHidden, archived: props.t.bArchived,
}[kind]);
const badgeClass = (kind) => (kind === 'hidden' || kind === 'archived' ? 'is-hidden' : '');
</script>

<template>
  <div class="adm-tr is-row" :class="{ 'is-selected': selected }">
    <input type="checkbox" class="adm-cell-check" :aria-label="t.select" :checked="selected" @change="$emit('select')" />

    <div class="adm-cell-product">
      <div class="adm-thumb" :class="{ 'is-dim': dim }">
        <img v-if="item.imageKey" :src="getProductImageUrl(item.imageKey, 'thumb')" :alt="name" loading="lazy" />
      </div>
      <div style="min-width: 0">
        <div class="adm-cell-name">{{ name }}</div>
        <div class="adm-cell-file">{{ item.imageKey || t.noImage }}</div>
      </div>
    </div>

    <span class="adm-cell-text">{{ item.sku }}</span>
    <span><span class="adm-pill">{{ categoryLabel || t.noCategory }}</span></span>
    <span class="adm-cell-text" style="color: var(--adm-muted-2)">{{ item.optionCount ? t.optionsN(item.optionCount) : t.noOptions }}</span>
    <span v-if="price" class="adm-price adm-serif">{{ price }}</span>
    <span v-else class="adm-price is-missing">{{ t.noPrice }}</span>
    <span class="adm-box">{{ formatMoq(item.boxSize, lang) }}</span>

    <div class="adm-cell-badges">
      <span v-for="b in badges" :key="b.kind" class="adm-badge is-flat" :class="badgeClass(b.kind)">{{ badgeLabel(b.kind) }}</span>
    </div>

    <span class="adm-cell-dim">{{ formatAdded(item.addedDays, lang, { short: true }) }}</span>

    <div class="adm-cell-actions">
      <button v-if="!item.isArchived" type="button" class="adm-ibtn is-edit" :aria-label="t.edit" :title="t.edit" @click="$emit('edit')">
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"></path></svg>
      </button>
      <InventoryMenu
        :item="item"
        :open="menuOpen"
        placement="down"
        :t="t"
        @toggle="$emit('menu')"
        @edit="$emit('edit')"
        @duplicate="$emit('duplicate')"
        @flip="$emit('flip')"
        @archive="$emit('archive')"
        @restore="$emit('restore')"
      />
    </div>
  </div>
</template>
