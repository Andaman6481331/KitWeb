<script setup>
// Sizes, colors and pricing, laid out as in the design: per size a header (name, factory
// cost, margin, stock), the five-level price grid, and a colors table. Prices are per BOX;
// the "Per piece" row shows what the website will display (box price ÷ pieces per box).
import { computed, nextTick, ref } from 'vue';
import ProductSwitch from './ProductSwitch.vue';
import {
  DEFAULT_PERCENTS, autoFill, blankColor, blankSize, cleanDecimal, cleanInteger, formatPercents,
  formulaPrice, marginPct, multiplierLabel, normalizePieces, parsePercents, pieceRow, productStock,
  reconcileImages, refreshSkus, savePercents, setPrice, sizeStock,
} from '../../../utils/adminProductEdit';

const props = defineProps({
  draft: { type: Object, required: true },
  percents: { type: Array, required: true },
  t: { type: Object, required: true },
});
const emit = defineEmits(['update:percents']);

const levels = [0, 1, 2, 3, 4];
const levelNames = computed(() => [props.t.lvl1, props.t.lvl2, props.t.lvl3, props.t.lvl4, props.t.lvl5]);
const levelSub = (i) => (i === 4
  ? props.t.lvlSub(5, props.t.lvlStart)
  : props.t.lvlSub(i + 1, multiplierLabel(props.percents[i])));

// "100 per box → the website shows ฿20 per piece at Level 1", from the first size.
const example = computed(() => {
  const pieces = normalizePieces(props.draft.piecesPerBox);
  const first = props.draft.sizes[0];
  if (!pieces || !first) return '';
  const perPiece = pieceRow(first.prices, pieces)[0];
  return perPiece === null ? '' : props.t.szPiecesExample(pieces, perPiece);
});

// ── Edits ─────────────────────────────────────────────────────────
const refresh = () => {
  props.draft.sizes = refreshSkus(props.draft.sizes, props.draft.sku);
};

const onPieces = (event) => {
  const clean = cleanInteger(event.target.value).replace('-', '');
  event.target.value = clean;
  props.draft.piecesPerBox = clean;
};

const onLabel = (size, value) => {
  size.label = value;
  refresh();
};
const onCost = (size, event) => {
  size.boxCost = cleanDecimal(event.target.value);
  event.target.value = size.boxCost;
};
const onPrice = (si, level, event) => {
  const clean = cleanDecimal(event.target.value);
  event.target.value = clean;
  props.draft.sizes[si] = setPrice(props.draft.sizes[si], level, clean, props.percents);
  // The base prices the website falls back to follow the first size once it is edited.
  if (si === 0) props.draft.baseFromLegacy = null;
};

const onColorName = (color, value) => {
  color.name = value;
  refresh();
};
const onSku = (color, value) => {
  color.sku = value;
  color.skuManual = value.trim() !== '';
  if (!color.skuManual) refresh();
};
const onStock = (color, event) => {
  color.stock = cleanInteger(event.target.value);
  event.target.value = color.stock;
};

const addSize = () => {
  props.draft.sizes.push(blankSize());
  refresh();
};
const removeSize = (si) => {
  if (props.draft.sizes.length < 2) return;
  props.draft.sizes.splice(si, 1);
  if (si === 0) props.draft.baseFromLegacy = null;
  props.draft.images = reconcileImages(props.draft.images, props.draft.sizes);
  refresh();
};
const addColor = (size) => {
  size.colors.push(blankColor(''));
  refresh();
};
const removeColor = (size, color) => {
  if (size.colors.length < 2) return;
  size.colors = size.colors.filter((c) => c.ref !== color.ref);
  props.draft.images = reconcileImages(props.draft.images, props.draft.sizes);
  refresh();
};

// ── Price levels dialog ───────────────────────────────────────────
const fmOpen = ref(false);
const fmText = ref('');
const fmInput = ref(null);

const parsed = computed(() => parsePercents(fmText.value));
const fmBad = computed(() => fmText.value.trim() !== '' && parsed.value === null);
const fmPreview = computed(() => {
  if (!parsed.value) return '';
  const typed = Number(props.draft.sizes[0]?.prices[4]);
  const l5 = typed > 0 ? typed : 1000;
  return props.t.fmPreview(l5, parsed.value.map((p) => formulaPrice(l5, p)).join(' / '));
});

const openFormula = async () => {
  fmText.value = formatPercents(props.percents);
  fmOpen.value = true;
  await nextTick();
  fmInput.value?.focus();
};
const saveFormula = () => {
  if (!parsed.value) return;
  emit('update:percents', parsed.value);
  savePercents(parsed.value);
  // Grey (automatic) prices follow the new percentages; typed prices stay.
  props.draft.sizes = props.draft.sizes.map((s) => autoFill(s, parsed.value));
  fmOpen.value = false;
};
</script>

<template>
  <section class="pe-card">
    <div class="pe-row-between">
      <h2 class="pe-h pe-serif">{{ t.szTitle }}</h2>
      <div class="pe-row-gap">
        <button type="button" class="pe-btn pe-btn-sm" @click="openFormula">{{ t.szLevels }}</button>
        <button type="button" class="pe-btn pe-btn-sm" @click="addSize">{{ t.szAddSize }}</button>
      </div>
    </div>
    <p class="pe-sub">{{ t.szSub }}</p>

    <div class="pe-pieces">
      <div class="pe-pieces-field">
        <label class="pe-lab" for="pe-pieces">{{ t.szPieces }}</label>
        <input
          id="pe-pieces" class="pe-in" type="text" inputmode="numeric" placeholder="100"
          :value="draft.piecesPerBox" autocomplete="off" @input="onPieces"
        />
      </div>
      <div class="pe-hint pe-pieces-hint">
        {{ t.szPiecesHint }}
        <b v-if="example">{{ example }}</b>
      </div>
    </div>

    <div v-for="(size, si) in draft.sizes" :key="size.ref" class="pe-size">
      <div class="pe-size-head">
        <div class="pe-size-top">
          <div class="pe-w150">
            <label class="pe-lab" :for="`pe-sl-${size.ref}`">{{ t.szSizeLabel }}</label>
            <input :id="`pe-sl-${size.ref}`" class="pe-in" type="text" :value="size.label" autocomplete="off" @input="onLabel(size, $event.target.value)" />
          </div>
          <div class="pe-w150">
            <label class="pe-lab" :for="`pe-st-${size.ref}`">{{ t.szSizeTh }}</label>
            <input :id="`pe-st-${size.ref}`" v-model="size.labelTh" class="pe-in" type="text" autocomplete="off" />
          </div>
          <div class="pe-w190">
            <label class="pe-lab" :for="`pe-sc-${size.ref}`">{{ t.szCost }} <span class="pe-opt">{{ t.szOptional }}</span></label>
            <input :id="`pe-sc-${size.ref}`" class="pe-in" type="text" inputmode="decimal" :value="size.boxCost" autocomplete="off" @input="onCost(size, $event)" />
          </div>
          <div v-if="marginPct(size) !== null" class="pe-hint pe-margin">{{ t.szMargin(marginPct(size)) }}</div>
          <div class="pe-total">
            {{ t.szTotalStock }}<b>{{ sizeStock(size) }}</b>
          </div>
          <button type="button" class="pe-btn pe-btn-sm" :disabled="draft.sizes.length < 2" @click="removeSize(si)">{{ t.szRemoveSize }}</button>
        </div>

        <div class="pe-scroll-x">
          <div class="pe-lg">
            <div></div>
            <div v-for="i in levels" :key="`h${i}`" class="pe-lh"><b>{{ levelNames[i] }}</b><small>{{ levelSub(i) }}</small></div>

            <div class="pe-rowlab">{{ t.rowBox }}</div>
            <input
              v-for="i in levels" :key="`p${i}`" type="text" inputmode="decimal" autocomplete="off"
              :class="{ 'is-auto': i < 4 && !size.manual[i], 'is-l5': i === 4 }"
              :aria-label="`${levelNames[i]} — ${t.rowBox}`"
              :value="size.prices[i] ?? ''"
              @input="onPrice(si, i, $event)"
            />

            <div class="pe-rowlab">{{ t.rowPiece }}</div>
            <div v-for="(p, i) in pieceRow(size.prices, draft.piecesPerBox)" :key="`m${i}`" class="pe-piece">{{ p === null ? '—' : p }}</div>
          </div>
        </div>
        <div class="pe-hint">{{ t.rowHint }}</div>
      </div>

      <div class="pe-colhead">
        <b>{{ t.colTitle }}</b>
        <span class="pe-hint">{{ t.colSummary(size.colors.length, sizeStock(size)) }}</span>
      </div>
      <div class="pe-scroll-x">
        <table class="pe-ctab">
          <thead>
            <tr>
              <th>{{ t.colHeadColor }}</th>
              <th>{{ t.colHeadSku }}</th>
              <th>{{ t.colHeadStock }}</th>
              <th>{{ t.colHeadShow }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in size.colors" :key="c.ref">
              <td>
                <span class="pe-colorcell">
                  <label class="pe-swatch" :style="{ background: c.hex || '#ffffff' }">
                    <input type="color" :value="c.hex || '#cccccc'" :aria-label="t.colSwatch" @input="c.hex = $event.target.value" />
                  </label>
                  <input class="pe-cin" type="text" :value="c.name" :aria-label="t.colHeadColor" autocomplete="off" @input="onColorName(c, $event.target.value)" />
                  <input v-model="c.nameTh" class="pe-cin pe-cin-th" type="text" :placeholder="t.colNameTh" :aria-label="t.colNameTh" autocomplete="off" />
                </span>
              </td>
              <td><input class="pe-cin" type="text" :value="c.sku" :aria-label="t.colHeadSku" autocomplete="off" @input="onSku(c, $event.target.value)" /></td>
              <td><input class="pe-cin pe-num" type="text" inputmode="numeric" :value="c.stock" :aria-label="t.colHeadStock" autocomplete="off" @input="onStock(c, $event)" /></td>
              <td><ProductSwitch v-model="c.isVisible" :label="t.colHeadShow" /></td>
              <td>
                <button type="button" class="pe-x" :disabled="size.colors.length < 2" :aria-label="t.colRemove" :title="t.colRemove" @click="removeColor(size, c)">×</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="size.colors.some((c) => !c.isVisible)" class="pe-hint pe-colfoot-note">{{ t.colHiddenNote }}</div>
      <div class="pe-colfoot">
        <button type="button" class="pe-btn pe-btn-sm" @click="addColor(size)">{{ t.colAdd }}</button>
      </div>
    </div>

    <p v-if="draft.sizes.length > 1" class="pe-hint">{{ t.szProductStock(productStock(draft)) }}</p>
    <p class="pe-hint">{{ t.removedNote }}</p>

    <div v-if="fmOpen" class="pe-dialog-back" @click.self="fmOpen = false">
      <form class="pe-dialog" role="dialog" aria-modal="true" :aria-label="t.fmTitle" @submit.prevent="saveFormula" @keydown.esc.stop="fmOpen = false">
        <h2 class="pe-serif">{{ t.fmTitle }}</h2>
        <p>{{ t.fmBody }}</p>
        <label class="pe-lab" for="pe-fm">{{ t.fmLabel }}</label>
        <input id="pe-fm" ref="fmInput" v-model="fmText" class="pe-in" type="text" placeholder="200, 180, 160, 130" autocomplete="off" />
        <p v-if="fmPreview" class="pe-hint">{{ fmPreview }}</p>
        <p v-if="fmBad" class="pe-error">{{ t.fmInvalid }}</p>
        <div class="pe-dialog-actions">
          <button type="button" class="pe-btn" @click="fmText = formatPercents(DEFAULT_PERCENTS)">{{ t.fmReset }}</button>
          <span class="pe-spacer"></span>
          <button type="button" class="pe-btn" @click="fmOpen = false">{{ t.cancel }}</button>
          <button type="submit" class="pe-btn pe-btn-pri" :disabled="!parsed">{{ t.fmSave }}</button>
        </div>
      </form>
    </div>
  </section>
</template>
