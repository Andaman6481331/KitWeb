<script setup>
// The DIY kit collection: list, add and edit. Moved out of the old AdminDashboard
// unchanged; it keeps its original controls and the /diy/products Worker routes.
import { ref, onMounted } from 'vue';
import { api, getDiyImageUrl } from '../services/api';
import { processProductImage } from '../services/image-processor';

const emit = defineEmits(['session-expired']);
const handleAuthError = (error) => {
  if (error?.status !== 401) return false;
  emit('session-expired');
  return true;
};

const formPanelOpen = ref(false);
const uploading = ref(false);

// DIY reactive states
const diyProducts = ref([]);
const isDiyEditing = ref(false);
const diyEditingId = ref(null);
const diyFileInput = ref(null);
const diyImages = ref([]);

const newDiyProduct = ref({
  name: '',
  name_th: '',
  description: '',
  price_1: 0,
  price_2: 0,
  price_3: 0,
  stock: 0,
  sku: ''
});

const loadDiyProducts = async () => {
  try {
    diyProducts.value = await api.getDiyProducts();
  } catch (error) {
    if (handleAuthError(error)) return;
    console.error('Failed to load DIY products', error);
  }
};

const handleDiyImageUpload = (event) => {
  const files = Array.from(event.target.files);
  files.forEach(file => {
    diyImages.value.push({
      file,
      preview: URL.createObjectURL(file),
      is_new: true,
      key: ''
    });
  });
  event.target.value = '';
};

const removeDiyImage = (index) => {
  diyImages.value.splice(index, 1);
};

const resetDiyForm = () => {
  newDiyProduct.value = { name: '', name_th: '', description: '', price_1: 0, price_2: 0, price_3: 0, stock: 0, sku: '' };
  diyImages.value = [];
  isDiyEditing.value = false;
  diyEditingId.value = null;
  formPanelOpen.value = false;
};

const handleDiySubmit = async () => {
  try {
    uploading.value = true;

    let sku = newDiyProduct.value.sku;
    if (!sku) {
      const skuRes = await api.getNextDiySku();
      sku = skuRes.sku;
      newDiyProduct.value.sku = sku;
    }

    const prepareAndUploadDiy = async (file, suffix = '') => {
      const baseName = `${sku}${suffix}-${Date.now()}`;
      const processedFiles = await processProductImage(file, baseName);
      await api.uploadDiyImage(processedFiles);
      return baseName;
    };

    const finalImages = [];
    let galleryIndex = 1;
    for (const img of diyImages.value) {
      if (img.is_new) {
        const baseKey = await prepareAndUploadDiy(img.file, `-g${galleryIndex++}`);
        finalImages.push(baseKey);
      } else {
        finalImages.push(img.key);
      }
    }

    const payload = {
      ...newDiyProduct.value,
      images: finalImages
    };

    if (isDiyEditing.value) {
      await api.updateDiyProduct(diyEditingId.value, payload);
      alert('DIY Product updated successfully!');
    } else {
      await api.addDiyProduct(payload);
      alert('DIY Product added successfully!');
    }
    resetDiyForm();
    await loadDiyProducts();
  } catch (error) {
    console.error('Submit error:', error);
    if (handleAuthError(error)) return;
    alert('Error: ' + error.message);
  } finally {
    uploading.value = false;
  }
};

const editDiyProduct = (prod) => {
  isDiyEditing.value = true;
  formPanelOpen.value = true;
  diyEditingId.value = prod.id;
  newDiyProduct.value = {
    name: prod.name,
    name_th: prod.name_th,
    description: prod.description,
    price_1: prod.price_1,
    price_2: prod.price_2,
    price_3: prod.price_3,
    stock: prod.stock,
    sku: prod.sku || ''
  };
  if (prod.images) {
    diyImages.value = prod.images.map(imgKey => ({
      key: imgKey,
      preview: getDiyImageUrl(imgKey),
      is_new: false
    }));
  } else {
    diyImages.value = [];
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const deleteDiyProduct = async (id) => {
  if (confirm('Are you sure you want to delete this DIY product?')) {
    try {
      await api.deleteDiyProduct(id);
      await loadDiyProducts();
    } catch (error) {
      if (handleAuthError(error)) return;
      alert('Failed to delete DIY product: ' + error.message);
    }
  }
};

onMounted(loadDiyProducts);
</script>

<template>
  <div v-if="formPanelOpen" class="form-panel-backdrop" @click="resetDiyForm"></div>

  <transition name="form-panel">
    <section v-if="formPanelOpen" class="form-section">
            <div class="form-header">
              <div class="header-title-group">
                <h2 style="padding: 0; margin: 0;">{{ isDiyEditing ? 'Edit DIY Product' : 'Add New DIY Product' }}</h2>
              </div>
              <button @click="resetDiyForm" class="cancel-btn">
                <ion-icon name="close-circle-outline"></ion-icon> {{ isDiyEditing ? 'Cancel Edit' : $t('admin.cancel') }}
              </button>
            </div>

            <form @submit.prevent="handleDiySubmit">
              <div class="product-main-row">
                <div class="form-group name-field">
                  <label>DIY Product Name (EN)</label>
                  <input v-model="newDiyProduct.name" type="text" required placeholder="e.g. Premium Crochet Tote Bag Set" />
                </div>
                <div class="form-group name-field">
                  <label>DIY Product Name (TH)</label>
                  <input v-model="newDiyProduct.name_th" type="text" placeholder="ชื่อสินค้าภาษาไทย..." />
                </div>
              </div>

              <div class="price-levels">
                <div class="price-header-row">
                  <label>Wholesale Prices (3 Levels)</label>
                </div>
                <div class="price-grid" style="grid-template-columns: repeat(3, 1fr);">
                  <div class="price-input-box active">
                    <span class="label">Level 1 (Retail/Display)</span>
                    <input v-model="newDiyProduct.price_1" type="number" step="1" placeholder="0.00" required />
                  </div>
                  <div class="price-input-box">
                    <span class="label">Level 2 (Medium Wholesale)</span>
                    <input v-model="newDiyProduct.price_2" type="number" step="1" placeholder="0.00" required />
                  </div>
                  <div class="price-input-box">
                    <span class="label">Level 3 (Bulk Wholesale)</span>
                    <input v-model="newDiyProduct.price_3" type="number" step="1" placeholder="0.00" required />
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label>Description</label>
                <textarea required v-model="newDiyProduct.description" rows="8" placeholder="Describe the DIY kit contents, difficulty level, or instructions..."></textarea>
              </div>


              <!-- DIY Images Gallery -->
              <div class="gallery-section">
                <div class="gallery-header">
                  <label>DIY Images (First image is main display)</label>
                  <button type="button" class="add-gallery-btn" @click="diyFileInput?.click()">
                    <ion-icon name="add-circle-outline"></ion-icon> Add Images
                  </button>
                  <input type="file" ref="diyFileInput" class="hidden-input" @change="handleDiyImageUpload" accept="image/*" multiple />
                </div>

                <div class="gallery-grid" v-if="diyImages.length > 0">
                  <div v-for="(img, index) in diyImages" :key="index" class="gallery-item">
                    <div class="gallery-thumb">
                      <img :src="img.preview" />
                      <button type="button" class="remove-thumb" @click="removeDiyImage(index)">&times;</button>
                    </div>
                    <div class="gallery-meta" style="font-size: 11px; text-align: center; color: #636e72; padding: 5px;">
                      {{ index === 0 ? '★ Main Image' : `Gallery Image ${index + 1}` }}
                    </div>
                  </div>
                </div>
                <p v-else class="gallery-empty">{{$t('admin.gImagesEmpty')}}</p>
              </div>

              <button type="submit" :disabled="uploading" :class="['submit-btn', isDiyEditing ? 'update' : '']">
                {{ uploading ? $t('admin.processing') : (isDiyEditing ? 'Update DIY Product' : 'Add DIY Product') }}
              </button>
            </form>
    </section>
  </transition>

  <section class="list-section">
            <div class="list-header">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h2 style="padding:0; margin:0;">DIY Kits Collection ({{ diyProducts.length }} items)</h2>
                <button class="add-product-btn" @click="resetDiyForm(); formPanelOpen = true">
                  <ion-icon name="add-circle-outline"></ion-icon> Add DIY Product
                </button>
              </div>
            </div>

            <div class="inventory-scroll">
              <div v-for="prod in diyProducts" :key="prod.id" class="product-item" @click="editDiyProduct(prod)">
                <div class="item-img">
                  <img :src="getDiyImageUrl(prod.images && prod.images.length > 0 ? prod.images[0] : '')" :alt="prod.name">
                </div>
                <div class="item-info">
                  <strong>{{ prod.name_th ? `${prod.name} (${prod.name_th})` : prod.name }}</strong>
                  <span class="p-meta">SKU: {{ prod.sku }} | ฿{{ prod.price_1 }}</span>
                </div>
                <div class="item-actions">
                  <button class="action-btn edit">
                    <ion-icon name="create-outline"></ion-icon>
                  </button>
                  <button class="action-btn del" @click="deleteDiyProduct(prod.id)">
                    <ion-icon name="trash-outline"></ion-icon>
                  </button>
                </div>
              </div>
            </div>
  </section>
</template>

<style scoped src="../assets/admin-legacy.css"></style>
