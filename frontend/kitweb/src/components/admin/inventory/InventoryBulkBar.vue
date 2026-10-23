<script setup>
// The dark action bar that floats at the bottom while products are selected.
// Archived products can only be restored, live ones can be shown, hidden, filed under
// another category or archived; `archivedView` switches between the two.
defineProps({
  count: { type: Number, required: true },
  t: { type: Object, required: true },
  categories: { type: Array, default: () => [] }, // [{ key, label }]
  archivedView: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
});
const emit = defineEmits(['select-all', 'show', 'hide', 'add-category', 'archive', 'restore', 'clear']);

const onCategory = (event) => {
  const path = event.target.value;
  event.target.value = '';
  if (path) emit('add-category', path);
};
</script>

<template>
  <div role="toolbar" :aria-label="t.bulk" class="adm-bulk">
    <b>{{ t.selectedN(count) }}</b>
    <button type="button" class="adm-bulk-link" @click="$emit('select-all')">{{ t.selectAllN }}</button>

    <template v-if="archivedView">
      <button type="button" class="adm-bulk-btn" :disabled="busy" @click="$emit('restore')">{{ t.bulkRestore }}</button>
    </template>
    <template v-else>
      <button type="button" class="adm-bulk-btn" :disabled="busy" @click="$emit('show')">{{ t.bulkShow }}</button>
      <button type="button" class="adm-bulk-btn" :disabled="busy" @click="$emit('hide')">{{ t.bulkHide }}</button>
      <select class="adm-bulk-select" :aria-label="t.bulkCat" :disabled="busy" value="" @change="onCategory">
        <option value="">{{ t.bulkCat }}</option>
        <option v-for="c in categories" :key="c.key" :value="c.key">{{ c.label }}</option>
      </select>
      <button type="button" class="adm-bulk-btn adm-bulk-danger" :disabled="busy" @click="$emit('archive')">{{ t.bulkArchive }}</button>
    </template>

    <button type="button" class="adm-bulk-x" :aria-label="t.clearSel" :title="t.clearSel" @click="$emit('clear')">
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg>
    </button>
  </div>
</template>
