<script setup>
// Slim right-side "mini-map" rail. Lists a page's sections, highlights whichever
// one is currently in the viewport (via IntersectionObserver), and smooth-scrolls
// to a section on click. Extracted from InstitutionalCatalogPage.vue so Home,
// Partner, and the B2B catalog can share one implementation.
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';

const props = defineProps({
  // [{ id, label }] — `id` is the DOM id of the section to observe & scroll to,
  // `label` is the already-translated text shown on hover.
  sections: {
    type: Array,
    required: true,
  },
});

const activeId = ref(null);
let observer = null;

// Click-to-scroll: land the section heading clear of the sticky navbar.
const scrollTo = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const setupObserver = () => {
  if (observer) observer.disconnect();

  // A section becomes "active" once it crosses into the middle band of the viewport.
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) activeId.value = entry.target.id;
      });
    },
    { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
  );

  props.sections.forEach(({ id }) => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });

  // Default the highlight to the first section until the user scrolls.
  if (!activeId.value) activeId.value = props.sections[0]?.id || null;
};

// Rebuild observers whenever the section list changes (e.g. locale switch or
// async data load in the host page).
watch(
  () => props.sections,
  async () => {
    await nextTick();
    setupObserver();
  }
);

onMounted(async () => {
  await nextTick();
  setupObserver();
});

onBeforeUnmount(() => {
  if (observer) observer.disconnect();
});
</script>

<template>
  <nav
    v-if="sections.length > 1"
    class="section-nav"
    aria-label="Section navigation"
  >
    <button
      v-for="s in sections"
      :key="s.id"
      type="button"
      class="section-nav-item"
      :class="{ 'is-active': activeId === s.id }"
      :title="s.label"
      @click="scrollTo(s.id)"
    >
      <span class="section-nav-label">{{ s.label }}</span>
      <span class="section-nav-dot"></span>
    </button>
  </nav>
</template>

<style scoped>
/* Right-side mini-map rail. Colors come from overridable custom properties so a
   host page can retint the rail (e.g. --sn-accent) while defaulting to the brand
   palette. */
.section-nav {
  position: fixed;
  top: 50%;
  right: 18px;
  transform: translateY(-50%);
  z-index: 90;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  padding: 10px 8px;
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(8px);
  border: 1px solid var(--sn-border, #EADFD3);
  border-radius: 30px;
  box-shadow: 0 4px 16px rgba(96, 69, 57, 0.1);
}

.section-nav-item {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  width: 100%;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 5px 4px;
}

.section-nav-label {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  color: var(--sn-primary, #604539);
  max-width: 0;
  opacity: 0;
  overflow: hidden;
  transition: max-width 0.3s ease, opacity 0.3s ease;
}

/* Reveal all labels while hovering the rail */
.section-nav:hover .section-nav-label {
  max-width: 200px;
  opacity: 1;
}

.section-nav-dot {
  width: 9px;
  height: 9px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--sn-border, #EADFD3);
  transition: transform 0.25s ease, background 0.25s ease, box-shadow 0.25s ease;
}

.section-nav-item:hover .section-nav-dot {
  background: var(--sn-secondary, #8b6f47);
}

.section-nav-item.is-active .section-nav-dot {
  background: var(--sn-accent, #DD876E);
  transform: scale(1.4);
  box-shadow: 0 0 0 4px rgba(221, 135, 110, 0.18);
}

.section-nav-item.is-active .section-nav-label {
  color: var(--sn-accent, #DD876E);
}

/* The mini-map rail needs horizontal room; hide it only on phone-width screens
   (tablets and up keep it). */
@media (max-width: 640px) {
  .section-nav {
    display: none;
  }
}
</style>
