<script setup>
// Completeness bar and the four-item checklist from the design, plus a hint when sizes
// would be invoiceable but not orderable on the website. Read-only: it only reads the draft.
import { computed } from 'vue';
import { completeness, unorderableSizes } from '../../../utils/adminProductEdit';

const props = defineProps({
  draft: { type: Object, required: true },
  t: { type: Object, required: true },
});

const status = computed(() => completeness(props.draft));
const rows = computed(() => [
  ['info', props.t.ckInfo],
  ['image', props.t.ckImage],
  ['prices', props.t.ckPrices],
  ['stock', props.t.ckStock],
]);
const noPhoto = computed(() => unorderableSizes(props.draft));
</script>

<template>
  <section class="pe-card pe-card-tight">
    <h2 class="pe-h pe-serif">{{ t.statusTitle }}</h2>
    <div class="pe-progress">
      <div class="pe-bar">
        <div class="pe-bar-fill" :class="{ 'is-complete': status.complete }" :style="{ width: status.percent + '%' }"></div>
      </div>
      <b>{{ status.percent }}%</b>
    </div>
    <div v-if="status.complete" class="pe-note pe-note-ok">{{ t.statusAllGood }}</div>
    <div v-for="[key, label] in rows" :key="key" class="pe-ck">
      <span class="pe-ic" :class="{ 'is-todo': !status.checks[key] }">{{ status.checks[key] ? '✓' : '•' }}</span>
      <span>{{ label }}</span>
    </div>
    <div v-if="noPhoto" class="pe-note pe-note-warn" style="margin-top: 8px">{{ t.hintNoPhoto(noPhoto) }}</div>
  </section>
</template>
