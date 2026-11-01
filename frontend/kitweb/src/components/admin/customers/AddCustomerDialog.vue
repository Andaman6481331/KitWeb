<script setup>
// The Add customer form, from the Customers design. It only collects the fields and
// hands them to the page; the page decides where they go (today: an in-memory list).
import { reactive, computed, ref, onMounted, onUnmounted } from 'vue';
import { isDuplicateName } from '../../../utils/adminCustomers';

const props = defineProps({
  t: { type: Object, required: true },
  customers: { type: Array, required: true },
});
const emit = defineEmits(['save', 'cancel']);

const form = reactive({ name: '', contact: '', phone: '', level: '1' });
const nameInput = ref(null);
const empty = computed(() => form.name.trim() === '');
const dupe = computed(() => isDuplicateName(props.customers, form.name));

const save = () => { if (!empty.value) emit('save', { ...form }); };
const onKey = (event) => { if (event.key === 'Escape') emit('cancel'); };

onMounted(() => {
  nameInput.value?.focus();
  document.addEventListener('keydown', onKey);
});
onUnmounted(() => document.removeEventListener('keydown', onKey));
</script>

<template>
  <div class="adm-modal-back" @click.self="$emit('cancel')">
    <form role="dialog" aria-modal="true" :aria-label="t.addTitle" class="adm-modal is-form" @submit.prevent="save">
      <h2 class="adm-serif">{{ t.addTitle }}</h2>
      <p>{{ t.addSub }}</p>
      <label>
        <span>{{ t.fName }}</span>
        <input ref="nameInput" v-model="form.name" class="adm-input" type="text" autocomplete="off" />
      </label>
      <div class="adm-form-pair">
        <label>
          <span>{{ t.fContact }}</span>
          <input v-model="form.contact" class="adm-input" type="text" autocomplete="off" />
        </label>
        <label>
          <span>{{ t.fPhone }}</span>
          <input v-model="form.phone" class="adm-input" type="tel" autocomplete="off" />
        </label>
      </div>
      <label>
        <span>{{ t.fLevel }}</span>
        <select v-model="form.level" class="adm-input">
          <option v-for="(name, i) in t.levels" :key="i" :value="String(i)">{{ name }}</option>
        </select>
      </label>
      <p v-if="Number(form.level) >= 3" class="adm-form-note">{{ t.specialNote }}</p>
      <p v-if="dupe" class="adm-form-warn" role="alert">{{ t.dupe }}</p>
      <div class="adm-modal-actions">
        <button type="button" class="adm-btn" @click="$emit('cancel')">{{ t.cancel }}</button>
        <button type="submit" class="adm-btn adm-btn-primary" :disabled="empty">{{ t.saveCust }}</button>
      </div>
    </form>
  </div>
</template>
