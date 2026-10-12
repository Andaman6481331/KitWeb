<script setup>
import { computed } from 'vue'

// One progress rail for the whole ordering journey, so the order page and the
// thank-you page read as the same flow. `current` is the step the customer is
// on right now: earlier steps render as done, later ones as upcoming.
const props = defineProps({
  current: { type: Number, required: true },
  // For a narrow panel (a sidebar card): name only the current step, no page gutter.
  compact: { type: Boolean, default: false },
})

const STEPS = ['pick', 'details', 'confirm', 'finish']

const steps = computed(() =>
  STEPS.map((key, i) => {
    const n = i + 1
    return {
      key,
      n,
      state: n < props.current ? 'done' : n === props.current ? 'current' : 'upcoming',
    }
  })
)
</script>

<template>
  <ol class="op" :class="{ 'op-compact': compact }" :aria-label="$t('orderSteps.label')">
    <li v-for="step in steps" :key="step.key" class="op-step" :class="`is-${step.state}`"
      :aria-current="step.state === 'current' ? 'step' : undefined">
      <span class="op-dot">
        <svg v-if="step.state === 'done'" width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <template v-else>{{ step.n }}</template>
      </span>
      <span class="op-label">{{ $t(`orderSteps.${step.key}`) }}</span>
    </li>
  </ol>
</template>

<style scoped>
.op {
  list-style: none;
  display: flex;
  align-items: center;
  margin: 0 0 24px;
  padding: 0 5%;
}

.op-step {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #A0917F;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.25;
}

.op-step:not(:last-child) {
  flex: 1;
}

/* Connector to the next step */
.op-step:not(:last-child)::after {
  content: '';
  flex: 1;
  min-width: 12px;
  height: 2px;
  margin: 0 14px;
  background: #E6E0D9;
  border-radius: 2px;
}

.op-step.is-done:not(:last-child)::after {
  background: #3D2B1F;
}

.op-dot {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #E6E0D9;
  border-radius: 50%;
  background: #fff;
  font-size: 13px;
  font-weight: 700;
  color: #A0917F;
}

.op-step.is-done {
  color: #3D2B1F;
}

.op-step.is-done .op-dot {
  background: #3D2B1F;
  border-color: #3D2B1F;
  color: #fff;
}

.op-step.is-current {
  color: #3D2B1F;
}

.op-step.is-current .op-dot {
  background: #DD876E;
  border-color: #DD876E;
  color: #fff;
  box-shadow: 0 0 0 4px rgba(221, 135, 110, 0.2);
}

.op-compact {
  padding: 0;
  margin-bottom: 16px;
}

.op-compact .op-label {
  display: none;
}

.op-compact .op-step:not(:last-child)::after {
  min-width: 24px;
  margin: 0 10px;
}

/* Four labels stop fitting beside their connectors on a tablet: let the dots and
   connectors carry the progress and name only the step the customer is on. */
@media (max-width: 900px) {
  .op-step:not(.is-current) .op-label {
    display: none;
  }

  /* Keep every connector visible even beside the wrapped current label. */
  .op-step:not(:last-child)::after {
    min-width: 24px;
  }
}

@media (max-width: 768px) {
  .op {
    padding: 0 20px;
    margin-bottom: 20px;
  }

  .op-step:not(:last-child)::after {
    margin: 0 10px;
  }
}
</style>
