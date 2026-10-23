<script setup>
// The ⋯ button and its menu on a product card or row. Presentational: it only says
// what was picked; the page decides what that does. An archived product offers
// Restore alone, so there is no way to edit or re-publish it by accident.
defineProps({
  item: { type: Object, required: true },
  open: { type: Boolean, default: false },
  // 'up' opens above the button (cards sit at the bottom of their tile), 'down' below it.
  placement: { type: String, default: 'down' },
  t: { type: Object, required: true },
});
defineEmits(['toggle', 'edit', 'duplicate', 'flip', 'archive', 'restore']);
</script>

<template>
  <div class="adm-menu-wrap">
    <button
      type="button"
      class="adm-ibtn"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-label="t.more"
      :title="t.more"
      @click.stop="$emit('toggle')"
    >
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="5" cy="12" r="1.8"></circle><circle cx="12" cy="12" r="1.8"></circle><circle cx="19" cy="12" r="1.8"></circle>
      </svg>
    </button>

    <div v-if="open" role="menu" class="adm-menu" :class="placement === 'up' ? 'is-up' : 'is-down'" @click.stop>
      <template v-if="item.isArchived">
        <button type="button" role="menuitem" class="adm-mi" @click="$emit('restore')">{{ t.restore }}</button>
      </template>
      <template v-else>
        <button type="button" role="menuitem" class="adm-mi" @click="$emit('edit')">{{ t.edit }}</button>
        <button type="button" role="menuitem" class="adm-mi" @click="$emit('duplicate')">{{ t.dup }}</button>
        <button type="button" role="menuitem" class="adm-mi" @click="$emit('flip')">
          {{ item.isVisible ? t.hide : t.show }}
        </button>
        <button type="button" role="menuitem" class="adm-mi is-danger" @click="$emit('archive')">{{ t.archive }}</button>
      </template>
    </div>
  </div>
</template>
