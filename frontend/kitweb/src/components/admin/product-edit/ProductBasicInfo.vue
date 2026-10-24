<script setup>
// Names, description, attribute and usage. Every text field is shown in English and in Thai
// side by side, so nothing hides behind a language switch. Only the usage tags are single:
// they read in the admin's own language.
// Usage is the storefront's [{ type, example }] JSON, built from a picker of 12 usage types.
import { computed, ref } from 'vue';
import { USAGE_OPTIONS, parseUsage, serializeUsage } from '../../../utils/adminProductEdit';

const props = defineProps({
  draft: { type: Object, required: true },
  lang: { type: String, default: 'en' },
  t: { type: Object, required: true },
});

const entries = ref(parseUsage(props.draft.usage, props.draft.usageTh));
const usageOpen = ref(false);
const usageQuery = ref('');

const options = computed(() => {
  const q = usageQuery.value.trim().toLowerCase();
  return q ? USAGE_OPTIONS.filter((u) => u.en.toLowerCase().includes(q) || u.th.includes(q)) : USAGE_OPTIONS;
});
const isChosen = (en) => entries.value.some((e) => e.en === en);
const tagName = (entry) => (props.lang === 'th' ? entry.th : entry.en);

// Esc closes an open menu first; the panel's own Esc handler (close the whole panel) only
// sees the key when the menu is already shut.
const onUsageEsc = (event) => {
  if (!usageOpen.value) return;
  event.stopPropagation();
  usageOpen.value = false;
};

// The draft's usage text is only rewritten when the owner touches the picker, so an untouched
// product keeps exactly what it had. The form no longer edits the per-usage example text, but
// examples already saved ride along unchanged in `entries`.
const syncUsage = () => {
  const { usage, usageTh } = serializeUsage(entries.value);
  props.draft.usage = usage;
  props.draft.usageTh = usageTh;
};
const toggleUsage = (u) => {
  const at = entries.value.findIndex((e) => e.en === u.en);
  if (at >= 0) entries.value.splice(at, 1);
  else entries.value.push({ en: u.en, th: u.th, example: '', example_th: '' });
  syncUsage();
};
</script>

<template>
  <section class="pe-card">
    <h2 class="pe-h pe-serif">{{ t.basicTitle }}</h2>
    <p class="pe-sub">{{ t.basicSub }}</p>

    <div class="pe-grid-2 pe-mb">
      <div>
        <label class="pe-lab" for="pe-name">{{ t.nameEn }}</label>
        <input id="pe-name" v-model="draft.name" class="pe-in" type="text" autocomplete="off" />
      </div>
      <div>
        <label class="pe-lab" for="pe-name-th">{{ t.nameTh }}</label>
        <input id="pe-name-th" v-model="draft.nameTh" class="pe-in" type="text" autocomplete="off" />
      </div>
    </div>

    <div class="pe-mb">
      <div class="pe-grid-2">
        <div>
          <label class="pe-lab" for="pe-desc">{{ t.descEn }}</label>
          <textarea id="pe-desc" v-model="draft.description" class="pe-in pe-tall"></textarea>
        </div>
        <div>
          <label class="pe-lab" for="pe-desc-th">{{ t.descTh }}</label>
          <textarea id="pe-desc-th" v-model="draft.descriptionTh" class="pe-in pe-tall"></textarea>
        </div>
      </div>
      <div class="pe-hint">{{ t.descHint }}</div>
    </div>

    <div class="pe-grid-2 pe-mb">
      <div>
        <label class="pe-lab" for="pe-attr">{{ t.attrEn }}</label>
        <textarea id="pe-attr" v-model="draft.attribute" class="pe-in" :placeholder="t.attrPh"></textarea>
      </div>
      <div>
        <label class="pe-lab" for="pe-attr-th">{{ t.attrTh }}</label>
        <textarea id="pe-attr-th" v-model="draft.attributeTh" class="pe-in" :placeholder="t.attrPh"></textarea>
      </div>
    </div>

    <div class="pe-usage" @keydown.esc="onUsageEsc">
      <span id="pe-usage-lab" class="pe-lab">{{ t.usage }}</span>
      <div class="pe-usage-field">
        <!-- The chosen usages sit as small tags inside the field, so picking more never adds a row of inputs. -->
        <div class="pe-in pe-tagbox" :class="{ 'is-open': usageOpen }" @click.self="usageOpen = !usageOpen">
          <span v-for="entry in entries" :key="entry.en" class="pe-tag">
            {{ tagName(entry) }}
            <button type="button" class="pe-tag-x" :aria-label="t.usageRemove(tagName(entry))" @click="toggleUsage(entry)">×</button>
          </span>
          <button
            type="button" class="pe-tagbox-toggle" :class="{ 'is-empty': !entries.length }"
            aria-labelledby="pe-usage-lab" :aria-expanded="usageOpen" @click="usageOpen = !usageOpen"
          >
            <span>{{ entries.length ? '' : t.usageNone }}</span>
            <span aria-hidden="true">{{ usageOpen ? '▴' : '▾' }}</span>
          </button>
        </div>
        <div v-if="usageOpen" class="pe-scrim" @click="usageOpen = false"></div>
        <div v-if="usageOpen" class="pe-menu">
          <input v-model="usageQuery" class="pe-in" type="text" :placeholder="t.usageSearch" :aria-label="t.usageSearch" />
          <div class="pe-menu-list">
            <label v-for="u in options" :key="u.en" class="pe-menu-row">
              <input type="checkbox" :checked="isChosen(u.en)" @change="toggleUsage(u)" />
              <span>{{ u.en }} <span class="pe-menu-th">({{ u.th }})</span></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
