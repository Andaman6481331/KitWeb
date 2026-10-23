<script setup>
// The typed confirmation before archiving. The design asked for the word "delete";
// this asks for "archive" and says plainly that nothing is deleted.
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  title: { type: String, required: true },
  t: { type: Object, required: true },
});
const emit = defineEmits(['confirm', 'cancel']);

const typed = ref('');
const input = ref(null);
const ok = computed(() => typed.value.trim().toLowerCase() === props.t.typeWord);

const confirm = () => { if (ok.value) emit('confirm'); };
const onKey = (event) => { if (event.key === 'Escape') emit('cancel'); };

onMounted(() => {
  input.value?.focus();
  document.addEventListener('keydown', onKey);
});
onUnmounted(() => document.removeEventListener('keydown', onKey));
</script>

<template>
  <div class="adm-modal-back">
    <form role="alertdialog" aria-modal="true" :aria-label="title" class="adm-modal" @submit.prevent="confirm">
      <h2 class="adm-serif">{{ title }}</h2>
      <p>{{ t.confirmBody }}</p>
      <label>
        <span>{{ t.typeLabel }}</span>
        <input ref="input" v-model="typed" class="adm-input" type="text" :placeholder="t.typeWord" autocomplete="off" />
      </label>
      <div class="adm-modal-actions">
        <button type="button" class="adm-btn" @click="$emit('cancel')">{{ t.cancel }}</button>
        <button type="submit" class="adm-btn adm-btn-danger" :disabled="!ok">{{ t.archive }}</button>
      </div>
    </form>
  </div>
</template>
