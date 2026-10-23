<script setup>
// The image grid: one card per photo, ★ Main on exactly one, and for every other photo the
// size and color it belongs to. A photo tied to a size becomes that size's website variant
// photo (see product-inventory.ts on the Worker); one tied to nothing is a gallery photo.
import { onBeforeUnmount, ref } from 'vue';
import { getProductImageUrl } from '../../../utils/productImages';
import { colorOptions, imageCard, setMain, withSize } from '../../../utils/adminProductEdit';

const props = defineProps({
  draft: { type: Object, required: true },
  t: { type: Object, required: true },
});
const emit = defineEmits(['zoom']);

const fileInput = ref(null);
const over = ref(false);

const thumb = (img) => img.preview || getProductImageUrl(img.image_key, 'thumb');
const large = (img) => img.preview || getProductImageUrl(img.image_key, 'large');

const indexOf = (img) => props.draft.images.findIndex((i) => i.uid === img.uid);

const addFiles = (list) => {
  const files = Array.from(list || []).filter((f) => f.type && f.type.startsWith('image/'));
  for (const file of files) {
    props.draft.images.push(imageCard({}, { isNew: true, inRows: false, file, preview: URL.createObjectURL(file) }));
  }
  if (files.length && !props.draft.images.some((i) => i.isMain)) {
    props.draft.images = setMain(props.draft.images, props.draft.images[0].uid);
  }
};
const onPick = (event) => {
  addFiles(event.target.files);
  event.target.value = '';
};
const onDrop = (event) => {
  over.value = false;
  addFiles(event.dataTransfer?.files);
};

const makeMain = (img) => {
  props.draft.images = setMain(props.draft.images, img.uid);
};
const remove = (img) => {
  if (img.preview && img.preview.startsWith('blob:')) URL.revokeObjectURL(img.preview);
  props.draft.images = props.draft.images.filter((i) => i.uid !== img.uid);
};
const onSize = (img, value) => {
  const at = indexOf(img);
  if (at >= 0) props.draft.images[at] = withSize(props.draft.images[at], value, props.draft.sizes);
};
const onColor = (img, value) => {
  const at = indexOf(img);
  if (at >= 0) props.draft.images[at] = { ...props.draft.images[at], colorRef: value || null };
};

onBeforeUnmount(() => {
  for (const img of props.draft.images) {
    if (img.preview && img.preview.startsWith('blob:')) URL.revokeObjectURL(img.preview);
  }
});
</script>

<template>
  <section class="pe-card">
    <h2 class="pe-h pe-serif">{{ t.imgTitle }}</h2>
    <p class="pe-sub">{{ t.imgSub }}</p>

    <div class="pe-imgs">
      <div v-for="img in draft.images" :key="img.uid" class="pe-img">
        <span v-if="img.isMain" class="pe-badge-main">{{ t.imgMain }}</span>
        <div class="pe-img-tools">
          <button v-if="!img.isMain" type="button" class="pe-img-btn" @click="makeMain(img)">{{ t.imgMakeMain }}</button>
          <button type="button" class="pe-img-btn pe-img-x" :aria-label="t.imgRemove" :title="t.imgRemove" @click="remove(img)">×</button>
        </div>
        <img class="pe-img-thumb" :src="thumb(img)" alt="" :title="t.imgPreview" @click="emit('zoom', large(img))" />

        <div v-if="img.passthrough" class="pe-img-cap">{{ t.imgPassthrough(img.passthrough.attribute_value || '—') }}</div>
        <div v-else class="pe-img-cap">
          <select class="pe-sel" :aria-label="t.imgSize" :value="img.sizeRef || ''" @change="onSize(img, $event.target.value)">
            <option value="">{{ t.imgAllSizes }}</option>
            <option v-for="s in draft.sizes" :key="s.ref" :value="s.ref">{{ s.label || '—' }}</option>
          </select>
          <select class="pe-sel" :aria-label="t.imgColor" :value="img.colorRef || ''" @change="onColor(img, $event.target.value)">
            <option value="">{{ t.imgAllColors }}</option>
            <option v-for="c in colorOptions(draft.sizes, img.sizeRef)" :key="c.ref" :value="c.ref">{{ c.name }}</option>
          </select>
        </div>
      </div>

      <div
        class="pe-drop" :class="{ 'is-over': over }" role="button" tabindex="0"
        @click="fileInput && fileInput.click()"
        @keydown.enter.prevent="fileInput && fileInput.click()"
        @keydown.space.prevent="fileInput && fileInput.click()"
        @dragover.prevent="over = true"
        @dragleave="over = false"
        @drop.prevent="onDrop"
      >
        <span class="pe-drop-plus" aria-hidden="true">+</span>
        <span>{{ t.imgAdd }}<br /><small>{{ t.imgDrop }}</small></span>
      </div>
    </div>
    <input ref="fileInput" type="file" accept="image/*" multiple class="pe-hidden" @change="onPick" />
  </section>
</template>
