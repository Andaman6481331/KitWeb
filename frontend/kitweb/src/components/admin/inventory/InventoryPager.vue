<script setup>
// Previous / 1 2 … 8 / Next. It only reports the page the person asked for; the Inventory
// page owns the current page and the 20-per-page cut. The page shows it twice: full size under
// the list, and `compact` (arrows instead of words, smaller buttons) in the toolbar beside the count.
import { computed } from 'vue';
import { pageNumbers } from '../../../utils/adminInventory';

const props = defineProps({
  // { page, pageCount } as returned by paginate()
  pager: { type: Object, required: true },
  t: { type: Object, required: true },
  compact: { type: Boolean, default: false },
});
defineEmits(['go']);

const numbers = computed(() => pageNumbers(props.pager.page, props.pager.pageCount));
</script>

<template>
  <nav v-if="pager.pageCount > 1" class="adm-pager" :class="{ 'is-compact': compact }" :aria-label="t.pagesLabel">
    <button type="button" class="adm-pager-btn" :disabled="pager.page <= 1" :aria-label="t.pagePrev" @click="$emit('go', pager.page - 1)">
      <template v-if="compact">‹</template>
      <template v-else>‹ {{ t.pagePrev }}</template>
    </button>
    <template v-for="(n, i) in numbers" :key="i">
      <span v-if="n === '…'" class="adm-pager-gap" aria-hidden="true">…</span>
      <button
        v-else
        type="button"
        class="adm-pager-btn"
        :class="{ 'is-on': n === pager.page }"
        :aria-current="n === pager.page ? 'page' : undefined"
        :aria-label="t.goToPage(n)"
        @click="$emit('go', n)"
      >{{ n }}</button>
    </template>
    <button type="button" class="adm-pager-btn" :disabled="pager.page >= pager.pageCount" :aria-label="t.pageNext" @click="$emit('go', pager.page + 1)">
      <template v-if="compact">›</template>
      <template v-else>{{ t.pageNext }} ›</template>
    </button>
  </nav>
</template>
