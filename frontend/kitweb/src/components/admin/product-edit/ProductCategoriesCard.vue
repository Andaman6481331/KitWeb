<script setup>
// Category chips (the first one generates the SKU) and the SKU base. A saved product's SKU
// is read-only; a new product's is fetched by the panel when the first category is chosen.
import { computed } from 'vue';

const props = defineProps({
  draft: { type: Object, required: true },
  categories: { type: Array, default: () => [] },
  isEditing: { type: Boolean, default: false },
  lang: { type: String, default: 'en' },
  t: { type: Object, required: true },
});
const emit = defineEmits(['category-change', 'sku-change']);

const labelOf = (c) => (props.lang === 'th' && c.name_th ? c.name_th : c.name);
const nameOf = (path) => {
  const found = props.categories.find((c) => c.path === path);
  return found ? labelOf(found) : path;
};
const available = computed(() => props.categories.filter((c) => !props.draft.categories.includes(c.path)));
const exampleSku = computed(() => props.draft.sku || 'YN-014');

const add = (event) => {
  const path = event.target.value;
  event.target.value = '';
  if (!path) return;
  props.draft.categories.push(path);
  emit('category-change');
};
const remove = (path) => {
  props.draft.categories = props.draft.categories.filter((p) => p !== path);
  emit('category-change');
};
const onSku = (event) => {
  props.draft.sku = event.target.value.trim();
  emit('sku-change');
};
</script>

<template>
  <section class="pe-card pe-card-tight">
    <h2 class="pe-h pe-serif">{{ t.catTitle }}</h2>
    <div v-if="draft.categories.length" class="pe-chips">
      <span v-for="(path, i) in draft.categories" :key="path" class="pe-chip" :class="{ 'is-first': i === 0 }">
        {{ nameOf(path) }}
        <button type="button" class="pe-chip-x" :aria-label="t.catRemove" @click="remove(path)">×</button>
      </span>
    </div>
    <select class="pe-in" :aria-label="t.catAdd" @change="add">
      <option value="">{{ t.catAdd }}</option>
      <option v-for="c in available" :key="c.path" :value="c.path">{{ labelOf(c) }}</option>
    </select>
    <div class="pe-hint" style="margin-bottom: 14px">{{ t.catHint }}</div>
    <label class="pe-lab" for="pe-sku">{{ t.skuBase }}</label>
    <input
      id="pe-sku" class="pe-in" type="text" :value="draft.sku" :readonly="isEditing"
      :placeholder="t.skuPending" autocomplete="off" @input="onSku"
    />
    <div class="pe-hint">{{ t.skuExample(exampleSku) }}</div>
  </section>
</template>
