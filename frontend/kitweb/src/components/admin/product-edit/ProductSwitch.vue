<script setup>
// The on/off switch used for "Display on website" and each color's Show.
defineProps({
  modelValue: { type: Boolean, default: false },
  label: { type: String, required: true },
});
defineEmits(['update:modelValue']);
</script>

<template>
  <button
    type="button"
    role="switch"
    class="pe-sw"
    :class="{ 'is-on': modelValue }"
    :aria-checked="modelValue"
    :aria-label="label"
    @click="$emit('update:modelValue', !modelValue)"
  ></button>
</template>
