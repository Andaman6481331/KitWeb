<script setup>
// The add/edit panel for a standard product, slid in over whichever page opens it.
// Moved out of the old AdminDashboard unchanged: same fields, same save payload, same
// Worker routes (POST /products, PUT /products/:id). It never deletes anything.
import { ref, watch, computed } from 'vue';
import { api, API_URL } from '../services/api';
import { processProductImage } from '../services/image-processor';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  open: { type: Boolean, default: false },
  // The raw product row to edit, or null to add a new one.
  product: { type: Object, default: null },
  categories: { type: Array, default: () => [] },
});
const emit = defineEmits(['close', 'saved', 'session-expired']);

const { t } = useI18n();

const handleAuthError = (error) => {
  if (error?.status !== 401) return false;
  emit('session-expired');
  return true;
};

const isEditing = ref(false);
const editingId = ref(null);

// Dropdown states for form
const categoryDropdownOpen = ref(false);
const categorySearchQuery = ref('');
const usageDropdownOpen = ref(false);
const usageSearchQuery = ref('');

// New product form
const newProduct = ref({
  name: '',
  name_th: '',
  description: '',
  description_th: '',
  price: 0,
  category: '',
  categories: [],
  image_key: '',
  usage: '',
  usage_th: '',
  attribute: '',
  attribute_th: '',
  varieties: '',
  varieties_th: '',
  sizes: '',
  sizes_th: '',
  colors: '',
  colors_th: '',
  price_1: 0,
  price_2: 0,
  price_3: 0,
  price_4: 0,
  price_5: 0,
  moq: '',
  is_visible: true,
  stock: 0
});

const selectedFile = ref(null);
const imagePreview = ref(null);
const uploading = ref(false);

const galleryImages = ref([]); // Array of { key, file, preview, attribute_type, attribute_value, price_1..5, is_new: boolean }
const galleryFileInput = ref(null);

// Single shared EN/TH toggle for description, attribute, and usage examples
const showThaiFields = ref(true);
const usageOptions = [
  { en: 'sewing',           th: 'งานเย็บ' },
  { en: 'crafting',         th: 'งานประดิษฐ์' },
  { en: 'school activity',  th: 'กิจกรรมโรงเรียน' },
  { en: 'temple activity',  th: 'กิจกรรมวัด' },
  { en: 'decorating',       th: 'ตกแต่ง' },
  { en: 'crocheting',       th: 'งานถักโครเช' },
  { en: 'beading',          th: 'งานร้อย' },
  { en: 'origami',          th: 'งานกระดาษพับ' },
  { en: 'ribbon crafting',  th: 'งานริบบิ้น' },
  { en: 'ribbon folding',   th: 'งานพับเหรียญ' },
  { en: 'hand hemming',     th: 'งานสอย' },
  { en: 'punching',         th: 'งานตอก' }
];

// Each entry: { en, th, example, example_th } — one per selected usage type,
// with a small example text the admin writes describing that usage for this product.
const usageEntries = ref([]);

const isUsageSelected = (en) => usageEntries.value.some(e => e.en === en);

const toggleUsageOption = (u) => {
  const idx = usageEntries.value.findIndex(e => e.en === u.en);
  if (idx >= 0) {
    usageEntries.value.splice(idx, 1);
  } else {
    usageEntries.value.push({ en: u.en, th: u.th, example: '', example_th: '' });
  }
};

// Accepts either the new JSON format ([{type, example}]) or the legacy
// comma-separated string format, and normalizes both into usageEntries.
const parseUsageRaw = (raw, rawTh) => {
  const parseSide = (str) => {
    if (!str) return [];
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Legacy comma-separated list
    }
    return str.split(',').map(s => s.trim()).filter(Boolean).map(type => ({ type, example: '' }));
  };
  const enList = parseSide(raw);
  const thList = parseSide(rawTh);
  return enList.map((entry, i) => {
    const opt = usageOptions.find(o => o.en === entry.type);
    return {
      en: entry.type || '',
      th: thList[i]?.type || opt?.th || entry.type || '',
      example: entry.example || '',
      example_th: thList[i]?.example || ''
    };
  });
};

// Sync FROM newProduct.usage -> usageEntries (e.g. on editProduct load)
watch(() => newProduct.value.usage, (val) => {
  usageEntries.value = parseUsageRaw(val, newProduct.value.usage_th);
}, { immediate: true });

// Sync TO newProduct when entries/examples change
watch(usageEntries, (val) => {
  if (val.length === 0) {
    newProduct.value.usage = '';
    newProduct.value.usage_th = '';
  } else {
    newProduct.value.usage = JSON.stringify(val.map(e => ({ type: e.en, example: e.example || '' })));
    newProduct.value.usage_th = JSON.stringify(val.map(e => ({ type: e.th || e.en, example: e.example_th || '' })));
  }
}, { deep: true, flush: 'sync' });

const showFormulaPopup = ref(false);
const formulaInput = ref("200, 180, 160, 130");

const previewImageSrc = ref(null);
const openImagePreview = (img) => {
  // Newly picked local files have no server-side variants yet — their preview
  // (an object URL) is already full resolution. Saved images only have a thumb
  // rendered in the grid, so fetch the large variant for the lightbox.
  previewImageSrc.value = img.is_new ? img.preview : getImageUrl(img.image_key, 'large');
};
const closeImagePreview = () => {
  previewImageSrc.value = null;
};

const fileInput = ref(null);
const triggerFileUpload = () => {
  fileInput.value?.click();
};

const filteredCategories = computed(() => {
  if (!categorySearchQuery.value.trim()) return props.categories;
  const query = categorySearchQuery.value.toLowerCase();
  return props.categories.filter(cat => {
    const nameMatch = (cat.name || '').toLowerCase().includes(query);
    const nameThMatch = (cat.name_th || '').toLowerCase().includes(query);
    const pathMatch = (cat.path || '').toLowerCase().includes(query);
    return nameMatch || nameThMatch || pathMatch;
  });
});

const filteredUsages = computed(() => {
  if (!usageSearchQuery.value.trim()) return usageOptions;
  const query = usageSearchQuery.value.toLowerCase();
  return usageOptions.filter(u => {
    const enMatch = (u.en || '').toLowerCase().includes(query);
    const thMatch = (u.th || '').toLowerCase().includes(query);
    return enMatch || thMatch;
  });
});

const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (file) {
    selectedFile.value = file;
    imagePreview.value = URL.createObjectURL(file);
  }
};

const handleGalleryUpload = (event) => {
  const files = Array.from(event.target.files);
  files.forEach(file => {
    galleryImages.value.push({
      file,
      preview: URL.createObjectURL(file),
      attribute_type: 'gallery',
      attribute_value: '',
      price_1: null,
      price_2: null,
      price_3: null,
      price_4: null,
      price_5: null,
      is_new: true
    });
  });
  // Reset input
  event.target.value = '';
};

const removeGalleryImage = (index) => {
  galleryImages.value.splice(index, 1);
};

const triggerGalleryUpload = () => {
  galleryFileInput.value?.click();
};

const resetFields = () => {
  newProduct.value = {
    name: '', name_th: '', description: '', description_th: '', price: 0, category: '', categories: [], image_key: '',
    usage: '', usage_th: '', attribute: '', attribute_th: '', varieties: '', varieties_th: '', sizes: '', sizes_th: '', colors: '', colors_th: '',
    price_1: 0, price_2: 0, price_3: 0, price_4: 0, price_5: 0, moq: '', is_visible: true, stock: 0
  };
  selectedFile.value = null;
  imagePreview.value = null;
  galleryImages.value = [];
  isEditing.value = false;
  editingId.value = null;
  showThaiFields.value = true;
};

const resetForm = () => {
  resetFields();
  emit('close');
};

const loadProduct = (product) => {
  isEditing.value = true;
  editingId.value = product.id;
  newProduct.value = { ...product };
  // Normalize DB integer (1/0/null) to a boolean for the toggle
  newProduct.value.is_visible = product.is_visible !== 0;
  showThaiFields.value = true;
  imagePreview.value = null; // Clear local preview to show saved image

  if (!newProduct.value.categories || newProduct.value.categories.length === 0) {
    newProduct.value.categories = newProduct.value.category
      ? [newProduct.value.category]
      : [];
  } else if (typeof newProduct.value.categories === 'string') {
    try {
      newProduct.value.categories = JSON.parse(newProduct.value.categories);
    } catch {
      newProduct.value.categories = newProduct.value.category ? [newProduct.value.category] : [];
    }
  }
  // Load gallery images
  if (product.images) {
    galleryImages.value = product.images.map(img => ({
      ...img,
      preview: getImageUrl(img.image_key),
      is_new: false
    }));
  } else {
    galleryImages.value = [];
  }
};

const handleSubmit = async () => {
  try {
    uploading.value = true;

    if (!newProduct.value.categories || newProduct.value.categories.length === 0) {
      alert(t('admin.selectAtLeastOneCategory'));
      return;
    }

    newProduct.value.category = newProduct.value.categories[0];

    let sku = newProduct.value.sku;
    if (!sku) {
      const skuRes = await api.getNextSku(newProduct.value.categories[0]);
      sku = skuRes.sku;
      newProduct.value.sku = sku;
    }

    const prepareAndUpload = async (file, suffix = '') => {
      const baseName = `${sku}${suffix}-${Date.now()}`;
      const processedFiles = await processProductImage(file, baseName);
      await api.uploadImage(processedFiles);
      return baseName;
    };

    // 1. Upload Main Image if changed
    if (selectedFile.value) {
      const baseKey = await prepareAndUpload(selectedFile.value);
      newProduct.value.image_key = baseKey;
    }

    // 2. Upload Gallery Images if new, saving keys directly to the gallery array
    const finalImages = [];
    let galleryIndex = 1;
    const priceOrNull = (v) => {
      const n = parseFloat(v);
      return Number.isNaN(n) ? null : n;
    };

    for (const img of galleryImages.value) {
      const isLinked = img.attribute_type === 'variant_link';
      const priceFields = {
        price_1: isLinked ? priceOrNull(img.price_1) : null,
        price_2: isLinked ? priceOrNull(img.price_2) : null,
        price_3: isLinked ? priceOrNull(img.price_3) : null,
        price_4: isLinked ? priceOrNull(img.price_4) : null,
        price_5: isLinked ? priceOrNull(img.price_5) : null
      };
      if (img.is_new) {
        const baseKey = await prepareAndUpload(img.file, `-g${galleryIndex++}`);
        img.image_key = baseKey; // save back to helper ref
        img.is_new = false;
        finalImages.push({
          image_key: baseKey,
          attribute_type: img.attribute_type,
          attribute_value: img.attribute_value,
          is_main: false,
          ...priceFields
        });
      } else {
        finalImages.push({
          image_key: img.image_key,
          attribute_type: img.attribute_type,
          attribute_value: img.attribute_value,
          is_main: img.is_main,
          ...priceFields
        });
      }
    }

    // Add images to payload
    newProduct.value.images = finalImages.filter(img => img.image_key);

    const productPayload = {
      name: newProduct.value.name,
      name_th: newProduct.value.name_th || null,
      description: newProduct.value.description,
      description_th: newProduct.value.description_th || null,
      price: newProduct.value.price_3 || newProduct.value.price || 0,
      category: newProduct.value.category,
      categories: newProduct.value.categories,
      image_key: newProduct.value.image_key || null,
      usage: newProduct.value.usage || null,
      usage_th: newProduct.value.usage_th || null,
      attribute: newProduct.value.attribute || null,
      attribute_th: newProduct.value.attribute_th || null,
      varieties: newProduct.value.varieties || null,
      sizes: newProduct.value.sizes || null,
      colors: newProduct.value.colors || null,
      price_1: newProduct.value.price_1,
      price_2: newProduct.value.price_2,
      price_3: newProduct.value.price_3,
      price_4: newProduct.value.price_4,
      price_5: newProduct.value.price_5,
      moq: newProduct.value.moq || null,
      is_visible: newProduct.value.is_visible !== false,
      sku: newProduct.value.sku || undefined,
      images: finalImages.filter(img => img.image_key)
    };

    if (isEditing.value) {
      await api.updateProduct(editingId.value, productPayload);
      alert(t('admin.alertUpdated'));
    } else {
      await api.addProduct(productPayload);
      alert(t('admin.alertAdded'));
    }
    emit('saved');
    resetForm();
  } catch (error) {
    console.error('Submit error:', error);
    if (handleAuthError(error)) return;
    if (!isEditing.value) {
      newProduct.value.sku = '';
    }
    alert('Error: ' + error.message);
  } finally {
    uploading.value = false;
  }
};

const getImageUrl = (key, variant = 'thumb') => {
  if (!key) return 'https://m.media-amazon.com/images/I/610a5LpNbTL.jpg';
  
  const keyStr = String(key);
  // If it's already a full URL, return it
  if (keyStr.startsWith('http')) return keyStr;
  
  // If the key already has an extension, it's likely a legacy key (e.g. .jpg) or already has a variant
  if (keyStr.includes('.')) return `${API_URL}/images/${keyStr}`;
  
  // New-style base keys expect a variant suffix (e.g. 12345-thumb.webp)
  return `${API_URL}/images/${keyStr}-${variant}.webp`;
};

const applyPriceFormula = () => {
  const percentages = formulaInput.value.split(',').map(s => parseFloat(s.trim()));
  if (percentages.length < 4 || percentages.some(isNaN)) {
    alert("Please enter 4 valid percentages separated by commas (e.g. 200, 180, 160, 130)");
    return;
  }

  const p5 = parseFloat(newProduct.value.price_5);
  if (isNaN(p5) || p5 <= 0) {
    alert("Please set a valid Level 5 price first.");
    return;
  }
  newProduct.value.price_1 = Number((p5 * percentages[0] / 100).toFixed(2));
  newProduct.value.price_2 = Number((p5 * percentages[1] / 100).toFixed(2));
  newProduct.value.price_3 = Number((p5 * percentages[2] / 100).toFixed(2));
  newProduct.value.price_4 = Number((p5 * percentages[3] / 100).toFixed(2));

  showFormulaPopup.value = false;
};

const onCategoriesChange = () => {
  if (isEditing.value) return;

  const firstPath = newProduct.value.categories[0];
  if (!firstPath) {
    newProduct.value.category = '';
    return;
  }

  newProduct.value.category = firstPath;
  if (!isEditing.value) {
    newProduct.value.sku = '';
  }
};
// Opening the panel loads the product being edited, or a blank form for a new one.
// Registered last because loadProduct leans on helpers defined above.
watch(() => [props.open, props.product], ([open, product]) => {
  if (!open) return;
  if (product) loadProduct(product);
  else resetFields();
}, { immediate: true });

</script>

<template>
  <div v-if="open" class="form-panel-backdrop" @click="resetForm"></div>

  <transition name="form-panel">
    <section v-if="open" class="form-section">
              <div class="form-header">
                <div class="header-title-group">
                  <h2 style="padding: 0; margin: 0;">{{ isEditing ? $t('admin.editProduct') : $t('admin.addProduct') }}</h2>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                  <button type="button" @click="showThaiFields = !showThaiFields"
                    style="font-size:11px; padding:2px 8px; border-radius:12px; border:1px solid #b2bec3; background: #f1f2f6; cursor:pointer; color:#636e72;">
                    {{ showThaiFields ? 'TH' : 'EN' }}
                  </button>
                  <button @click="resetForm" class="cancel-btn">
                    <ion-icon name="close-circle-outline"></ion-icon> {{ isEditing ? $t('admin.cancelEdit') : $t('admin.cancel') }}
                  </button>
                </div>
              </div>

              <form id="product-form" @submit.prevent="handleSubmit">
              <div class="product-main-row">
                <div class="form-group name-field">
                  <label>{{ $t('admin.productNameEn') }}</label>
                  <input v-model="newProduct.name" type="text" required placeholder="e.g. Premium Cotton Thread" />
                </div>
                <div class="form-group name-field">
                  <label>{{ $t('admin.productNameTh') }}</label>
                  <input v-model="newProduct.name_th" type="text" placeholder="ชื่อสินค้าภาษาไทย..." />
                </div>
              </div>


              <div class="form-row">
                <div>
                  <div class="product-image-uploader" @click="triggerFileUpload" :title="$t('admin.clickToUpload')">
                    <img v-if="newProduct.image_key || imagePreview"
                      :src="imagePreview || getImageUrl(newProduct.image_key, 'large')" alt="preview" />
                    <div v-else class="upload-placeholder">
                      <ion-icon name="camera-outline"></ion-icon>
                      <span>{{ $t('admin.addImage') }}</span>
                    </div>
                    <input type="file" ref="fileInput" class="hidden-input" @change="handleFileUpload" accept="image/*" />
                  </div>
                  <div class="form-group" style="margin-top:10px;">
                    <label>{{ $t('admin.attribute') }}</label>
                    <textarea v-if="!showThaiFields" v-model="newProduct.attribute" rows="2"
                      :placeholder="$t('admin.placeholderAttribute')"></textarea>
                    <textarea v-if="showThaiFields" v-model="newProduct.attribute_th" rows="2"
                      placeholder="คุณสมบัติของสินค้า..."></textarea>
                  </div>
                </div>
                <div>
                  <div class="form-group">
                    <label>{{ $t('admin.categoriesLabel') }}</label>
                    <div class="dropdown-wrapper">
                      <button
                        type="button"
                        class="dropdown-toggle"
                        @click="categoryDropdownOpen = !categoryDropdownOpen"
                      >
                        <span v-if="newProduct.categories?.length > 0" class="dropdown-value">
                          {{ newProduct.categories.length }} selected
                        </span>
                        <span v-else class="dropdown-placeholder">Select categories...</span>
                        <ion-icon :name="categoryDropdownOpen ? 'chevron-up-outline' : 'chevron-down-outline'"></ion-icon>
                      </button>
                      <transition name="dropdown-fade">
                        <div v-if="categoryDropdownOpen" class="dropdown-menu">
                          <div class="dropdown-search">
                            <input
                              v-model="categorySearchQuery"
                              type="text"
                              placeholder="Search categories..."
                              class="dropdown-search-input"
                            />
                          </div>
                          <div class="dropdown-options">
                            <label v-for="cat in filteredCategories" :key="cat.id" class="dropdown-option">
                              <input
                                type="checkbox"
                                :value="cat.path"
                                v-model="newProduct.categories"
                                @change="onCategoriesChange"
                                style="width: 16px;"
                              />
                              <span>{{ cat.name }}</span>
                              <span v-if="cat.name_th" class="cat-th-label">({{ cat.name_th }})</span>
                            </label>
                          </div>
                        </div>
                      </transition>
                    </div>
                    <small class="auto-hint">{{ $t('admin.categoriesHint') }}</small>
                  </div>
                  <div class="form-group">
                    <label>{{ $t('admin.description') }}</label>
                    <textarea v-if="!showThaiFields" required v-model="newProduct.description" rows="10"
                      placeholder="English description..."></textarea>
                    <textarea v-if="showThaiFields" v-model="newProduct.description_th" rows="10"
                      placeholder="คำอธิบายภาษาไทย..."
                      ></textarea>
                    <small class="auto-hint">{{ $t('admin.autoTranslateHint') }}</small>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label>{{ $t('admin.usage') }}</label>
                <div class="dropdown-wrapper">
                  <button
                    type="button"
                    class="dropdown-toggle"
                    @click="usageDropdownOpen = !usageDropdownOpen"
                  >
                    <span v-if="usageEntries.length > 0" class="dropdown-value">
                      {{ usageEntries.length }} selected
                    </span>
                    <span v-else class="dropdown-placeholder">Select usages...</span>
                    <ion-icon :name="usageDropdownOpen ? 'chevron-up-outline' : 'chevron-down-outline'"></ion-icon>
                  </button>
                  <transition name="dropdown-fade">
                    <div v-if="usageDropdownOpen" class="dropdown-menu">
                      <div class="dropdown-search">
                        <input
                          v-model="usageSearchQuery"
                          type="text"
                          placeholder="Search usages..."
                          class="dropdown-search-input"
                        />
                      </div>
                      <div class="dropdown-options">
                        <label v-for="u in filteredUsages" :key="u.en" class="dropdown-option">
                          <input
                            type="checkbox"
                            :checked="isUsageSelected(u.en)"
                            @change="toggleUsageOption(u)"
                            style="width: 16px;"
                          />
                          <span>{{ u.en }} <span class="cat-th-label">({{ u.th }})</span></span>
                        </label>
                      </div>
                    </div>
                  </transition>
                </div>

                <!-- One small example text area per selected usage type -->
                <div v-if="usageEntries.length > 0" class="usage-examples" style="margin-top:12px; display:flex; flex-direction:column; gap:10px;">
                  <div v-for="entry in usageEntries" :key="entry.en" class="usage-example-item">
                    <label style="font-weight:600; font-size:13px;">
                      {{ showThaiFields ? entry.th : entry.en }}
                    </label>
                    <textarea v-if="!showThaiFields" v-model="entry.example" rows="1"
                      :placeholder="$t('admin.usageExamplePlaceholder')"></textarea>
                    <textarea v-if="showThaiFields" v-model="entry.example_th" rows="1"
                      placeholder="อธิบายตัวอย่างของการใช้งานนี้..."></textarea>
                  </div>
                </div>
              </div>

            </form>

            <!-- Price Formula Modal -->
            <transition name="fade">
              <div v-if="showFormulaPopup" class="modal-overlay" @click.self="showFormulaPopup = false">
                <div class="modal-content">
                  <div class="modal-header">
                    <h3>{{ $t('admin.priceFormula') }}</h3>
                    <button @click="showFormulaPopup = false" class="close-modal">&times;</button>
                  </div>
                  <div class="modal-body">
                    <p>{{ $t('admin.formulaDesc') }}</p>
                    <div class="formula-info">
                      <span class="info-tag">{{ $t('admin.currentL5', { price: newProduct.price_5 || '0.00' }) }}</span>
                    </div>
                    <div class="input-group">
                      <label>{{ $t('admin.percentages') }}</label>
                      <input v-model="formulaInput" placeholder="200, 180, 160, 130" @keyup.enter="applyPriceFormula" />
                    </div>
                    <p class="formula-hint">{{ $t('admin.formulaHint') }}
                    </p>
                  </div>
                  <div class="modal-footer">
                    <button @click="showFormulaPopup = false" class="btn-secondary">{{ $t('admin.cancel') }}</button>
                    <button @click="applyPriceFormula" class="btn-primary">{{ $t('admin.applyFormula') }}</button>
                  </div>
                </div>
              </div>
            </transition>

            <!-- Image Preview Lightbox -->
            <transition name="fade">
              <div v-if="previewImageSrc" class="image-preview-overlay" @click.self="closeImagePreview">
                <button type="button" class="image-preview-close" @click="closeImagePreview">&times;</button>
                <img :src="previewImageSrc" class="image-preview-img" alt="Preview" />
              </div>
            </transition>
                      <!-- Gallery & Variant Manager (For Standard section) -->
            <div class="gallery-variant-manager">
            <div class="workspace-header">
              <h2><ion-icon name="images-outline"></ion-icon>{{$t('admin.galleryTitle')}}</h2>
              <button type="button" class="add-gallery-btn" @click="triggerGalleryUpload">
                <ion-icon name="cloud-upload-outline"></ion-icon> {{$t('admin.addImages')}}
              </button>
              <input type="file" ref="galleryFileInput" class="hidden-input" @change="handleGalleryUpload" accept="image/*" multiple />
            </div>

            <!-- Gallery Grid Workspace -->
            <div class="gallery-workspace-grid" v-if="galleryImages.length > 0">
              <div v-for="(img, index) in galleryImages" :key="index" class="gallery-card">
                <div class="card-thumb">
                  <img :src="img.preview" @click="openImagePreview(img)" />
                  <button type="button" class="remove-card-btn" @click="removeGalleryImage(index)">&times;</button>
                </div>
                <div class="card-controls">
                  <label>Link Role</label>
                  <select v-model="img.attribute_type">
                    <option value="gallery">{{$t('admin.galleryOnly')}}</option>
                    <option value="variant_link">{{$t('admin.variantLink')}}</option>
                  </select>
                  <input v-if="img.attribute_type === 'variant_link'" v-model="img.attribute_value"
                    placeholder="e.g. Red / Large" class="card-input" />
                  <div v-if="img.attribute_type === 'variant_link'" class="card-price-tiers">
                    <input type="number" step="1" v-model="img.price_1" class="card-input" :placeholder="$t('admin.level1')" />
                    <input type="number" step="1" v-model="img.price_2" class="card-input" :placeholder="$t('admin.level2')" />
                    <input type="number" step="1" v-model="img.price_3" class="card-input" :placeholder="$t('admin.level3')" />
                    <input type="number" step="1" v-model="img.price_4" class="card-input" :placeholder="$t('admin.level4')" />
                    <input type="number" step="1" v-model="img.price_5" class="card-input" :placeholder="$t('admin.level5')" />
                  </div>
                </div>
              </div>
            </div>
            <!-- Pricing & Stock Matrix -->
            <div class="pricing-matrix-workspace">
              <div class="matrix-header-row">
                <h3>{{$t('admin.pricingStockConfig')}}</h3>
                <button type="button" class="config-btn" @click="showFormulaPopup = true">
                  <ion-icon name="settings-outline"></ion-icon> {{ $t('admin.config') }}
                </button>
              </div>
              <p class="matrix-info-text">
                {{$t('admin.matrixInfoText')}}
              </p>
              <div class="matrix-scrollable">
                <table class="matrix-table">
                  <thead>
                    <tr>
                      <th>{{$t('admin.variantName')}}</th>
                      <th>{{$t('admin.level1')}}</th>
                      <th>{{$t('admin.level2')}}</th>
                      <th>{{$t('admin.level3')}}</th>
                      <th>{{$t('admin.level4')}}</th>
                      <th>{{$t('admin.level5')}}</th>
                      <th style="width: 50px;"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td class="variant-name-cell">
                        <strong>{{$t('admin.baseProduct')}}</strong>
                      </td>
                      <td><input type="number" step="1" v-model="newProduct.price_1" class="matrix-input" /></td>
                      <td><input type="number" step="1" v-model="newProduct.price_2" class="matrix-input" /></td>
                      <td><input type="number" step="1" v-model="newProduct.price_3" class="matrix-input" /></td>
                      <td><input type="number" step="1" v-model="newProduct.price_4" class="matrix-input" /></td>
                      <td><input type="number" step="1" v-model="newProduct.price_5" class="matrix-input" /></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="moq-visibility-row" style="margin-top: 16px;">
                <div class="form-group moq-field">
                  <label>{{ $t('admin.moq') || 'Minimum Order Quantity (MOQ)' }}</label>
                  <input v-model="newProduct.moq" type="text" placeholder="e.g. 20 pcs" />
                </div>
                <div class="visibility-row">
                  <div class="visibility-label">
                    <label>{{ $t('admin.displayOnWebsite') || 'Display on Website' }}</label>
                    <span class="visibility-hint">
                      {{ newProduct.is_visible
                        ? ($t('admin.displayOnHint') || 'Visible to customers on the storefront')
                        : ($t('admin.displayOffHint') || 'Hidden from the storefront (staff only)') }}
                    </span>
                  </div>
                  <label class="toggle-switch">
                    <input type="checkbox" v-model="newProduct.is_visible" />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>

            </div>
            </div>

            <!-- Submit Button at the bottom of the page -->
            <button type="submit" form="product-form" :disabled="uploading" :class="['submit-btn', isEditing ? 'update' : '']" style="margin-top: 30px; font-size: 16px;">
              {{ uploading ? $t('admin.processing') : (isEditing ? $t('admin.submitUpdate') : $t('admin.submitAdd')) }}
            </button>
    </section>
  </transition>
</template>

<style scoped src="../assets/admin-legacy.css"></style>
