<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { api, API_URL, getDiyImageUrl } from '../services/api';
import { processProductImage } from '../services/image-processor';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const products = ref([]);
const categories = ref([]);
const isAuthenticated = ref(!!api.getToken());
const password = ref('');
const loginError = ref(false);
const isEditing = ref(false);
const editingId = ref(null);
const showCategoryManager = ref(false);

// New Category form
const newCat = ref({ name: '', path: '', default_usage: '', default_use_for: '' });

// Filtering
const activeFilter = ref('all');

// New product form
const newProduct = ref({
  name: '',
  name_th: '',
  description: '',
  description_th: '',
  price: 0,
  category: '',
  image_key: '',
  usage: '',
  usage_th: '',
  use_for: '',
  use_for_th: '',
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
  stock: 0
});

const selectedFile = ref(null);
const imagePreview = ref(null);
const uploading = ref(false);
const stockAdjustment = ref(0);

const galleryImages = ref([]); // Array of { key, file, preview, attribute_type, attribute_value, is_new: boolean }
const galleryFileInput = ref(null);

// Variant states derived from gallery image link roles
const sizeVariants = ref([]); // list of { name, price_1, price_2, price_3, price_4, price_5, stock, image_key }
const initialVariantNames = ref([]); // track loaded variants

const detectedSizes = computed(() => {
  const sizes = new Set();
  galleryImages.value.forEach(img => {
    if (img.attribute_type === 'size' && img.attribute_value) {
      sizes.add(img.attribute_value.trim());
    }
  });
  return Array.from(sizes);
});

const detectedColors = computed(() => {
  const colors = new Set();
  galleryImages.value.forEach(img => {
    if (img.attribute_type === 'color' && img.attribute_value) {
      colors.add(img.attribute_value.trim());
    }
  });
  return Array.from(colors);
});

watch(
  [
    () => galleryImages.value.map(img => `${img.attribute_type}:${img.attribute_value}`),
    () => [...initialVariantNames.value]
  ],
  () => {
    const detected = new Set();
    galleryImages.value.forEach(img => {
      if (img.attribute_type === 'size' && img.attribute_value) {
        const trimmed = img.attribute_value.trim();
        if (trimmed) {
          detected.add(trimmed);
        }
      }
    });

    const allSizeNames = Array.from(new Set([...initialVariantNames.value, ...detected]));

    const updated = allSizeNames.map(size => {
      const existing = sizeVariants.value.find(sv => sv.name === size);
      if (existing) return existing;
      
      // Check if the loaded product had this variant (for edit mode)
      if (isEditing.value && newProduct.value.variants) {
        const match = newProduct.value.variants.find(v => v.variant_name === size);
        if (match) {
          return {
            name: size,
            price_1: match.price_1 || 0,
            price_2: match.price_2 || 0,
            price_3: match.price_3 || 0,
            price_4: match.price_4 || 0,
            price_5: match.price_5 || 0,
            stock: match.stock || 0,
            image_key: match.image_key || ''
          };
        }
      }

      return {
        name: size,
        price_1: newProduct.value.price_1 || 0,
        price_2: newProduct.value.price_2 || 0,
        price_3: newProduct.value.price_3 || 0,
        price_4: newProduct.value.price_4 || 0,
        price_5: newProduct.value.price_5 || 0,
        stock: 0,
        image_key: ''
      };
    });
    sizeVariants.value = updated;
  },
  { deep: true, immediate: true }
);

const removeSizeVariant = (sizeName) => {
  initialVariantNames.value = initialVariantNames.value.filter(n => n !== sizeName);

  // Untag any gallery images that have this size name
  galleryImages.value.forEach(img => {
    if (img.attribute_type === 'size' && img.attribute_value?.trim() === sizeName) {
      img.attribute_type = 'gallery';
      img.attribute_value = '';
    }
  });

  // Filter it from sizeVariants
  sizeVariants.value = sizeVariants.value.filter(sv => sv.name !== sizeName);
};

const updateStockAdjustment = (amount) => {
  stockAdjustment.value += amount;
  validateStockAdjustment();
};

const validateStockAdjustment = () => {
  const currentStock = newProduct.value.stock || 0;
  if (currentStock + stockAdjustment.value < 0) {
    stockAdjustment.value = -currentStock;
  }
};

const showFormulaPopup = ref(false);
const formulaInput = ref("200, 180, 160, 130");

const fileInput = ref(null);
const triggerFileUpload = () => {
  fileInput.value?.click();
};

onMounted(async () => {
  if (isAuthenticated.value) {
    loadAll();
  }
});

const loadAll = async () => {
  await Promise.all([loadProducts(), loadCategories(), loadDiyProducts()]);
};

const loadProducts = async () => {
  try {
    products.value = await api.getProducts();
  } catch (error) {
    console.error('Failed to load products', error);
  }
};

const loadCategories = async () => {
  try {
    categories.value = await api.getCategories();
  } catch (error) {
    console.error('Failed to load categories', error);
  }
};

const filteredProducts = computed(() => {
  if (activeFilter.value === 'all') return products.value;
  return products.value.filter(p => p.category === activeFilter.value);
});

const handleLogin = async () => {
  const result = await api.adminLogin(password.value);
  if (result.success) {
    isAuthenticated.value = true;
    loginError.value = false;
    loadAll();
  } else {
    loginError.value = t('admin.incorrectPassword');
  }
};

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

const resetForm = () => {
  newProduct.value = {
    name: '', name_th: '', description: '', description_th: '', price: 0, category: '', image_key: '',
    usage: '', usage_th: '', use_for: '', use_for_th: '', varieties: '', varieties_th: '', sizes: '', sizes_th: '', colors: '', colors_th: '',
    price_1: 0, price_2: 0, price_3: 0, price_4: 0, price_5: 0, stock: 0
  };
  selectedFile.value = null;
  imagePreview.value = null;
  galleryImages.value = [];
  sizeVariants.value = [];
  initialVariantNames.value = [];
  isEditing.value = false;
  editingId.value = null;
  stockAdjustment.value = 0;
};

const editProduct = (product) => {
  isEditing.value = true;
  editingId.value = product.id;
  newProduct.value = { ...product };
  imagePreview.value = null; // Clear local preview to show saved image

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

  // Load variants directly to sizeVariants and initialVariantNames
  if (product.variants && product.variants.length > 0) {
    initialVariantNames.value = product.variants
      .map(v => v.variant_name)
      .filter(name => name !== 'Default');
    sizeVariants.value = product.variants.map(v => ({
      name: v.variant_name,
      price_1: v.price_1 || 0,
      price_2: v.price_2 || 0,
      price_3: v.price_3 || 0,
      price_4: v.price_4 || 0,
      price_5: v.price_5 || 0,
      stock: v.stock || 0,
      image_key: v.image_key || ''
    })).filter(v => v.name !== 'Default');
  } else {
    initialVariantNames.value = [];
    sizeVariants.value = [];
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  stockAdjustment.value = 0;
};

const deleteProduct = async (id) => {
  if (confirm(t('admin.confirmDeleteProduct'))) {
    try {
      await api.deleteProduct(id);
      loadProducts();
    } catch (error) {
      alert(t('admin.errorDeleteProduct', { message: error.message }));
    }
  }
};

const handleAddCategory = async () => {
  if (!newCat.value.name || !newCat.value.path) return;
  try {
    await api.addCategory(newCat.value);
    newCat.value = { name: '', path: '', default_usage: '', default_use_for: '' };
    loadCategories();
  } catch (error) {
    alert(t('admin.errorDeleteCategory'));
  }
};

const deleteCategory = async (id) => {
  if (confirm(t('admin.confirmDeleteCategory'))) {
    try {
      await api.deleteCategory(id);
      loadCategories();
    } catch (error) {
      alert(t('admin.errorDeleteCategory'));
    }
  }
};

const handleSubmit = async () => {
  try {
    uploading.value = true;

    let sku = newProduct.value.sku;
    if (!sku) {
      const skuRes = await api.getNextSku(newProduct.value.category);
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
    for (const img of galleryImages.value) {
      if (img.is_new) {
        const baseKey = await prepareAndUpload(img.file, `-g${galleryIndex++}`);
        img.image_key = baseKey; // save back to helper ref
        img.is_new = false;
        finalImages.push({
          image_key: baseKey,
          attribute_type: img.attribute_type,
          attribute_value: img.attribute_value,
          is_main: false
        });
      } else {
        finalImages.push({
          image_key: img.image_key,
          attribute_type: img.attribute_type,
          attribute_value: img.attribute_value,
          is_main: img.is_main
        });
      }
    }

    // Add images to payload
    newProduct.value.images = finalImages;

    // 3. Build variants payload
    const variantsPayload = [];
    const colorsList = detectedColors.value;

    if (sizeVariants.value.length > 0) {
      for (const sv of sizeVariants.value) {
        // Find size variant image key
        const sizeImageObj = galleryImages.value.find(img => img.attribute_type === 'size' && img.attribute_value?.trim() === sv.name);
        const sizeImageKey = sizeImageObj ? sizeImageObj.image_key : null;

        // Generate variant specific SKU slug
        const sizeSlug = sv.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 5);
        const variantSku = `${sku}-${sizeSlug}`;

        const variantColors = colorsList.map(colorName => {
          const colorImageObj = galleryImages.value.find(img => img.attribute_type === 'color' && img.attribute_value?.trim() === colorName);
          const colorImageKey = colorImageObj ? colorImageObj.image_key : null;
          return {
            color_name: colorName,
            image_key: colorImageKey,
            stock: sv.stock || 0
          };
        });

        variantsPayload.push({
          variant_name: sv.name,
          sku: variantSku,
          price_1: parseFloat(sv.price_1) || 0,
          price_2: parseFloat(sv.price_2) || 0,
          price_3: parseFloat(sv.price_3) || 0,
          price_4: parseFloat(sv.price_4) || 0,
          price_5: parseFloat(sv.price_5) || 0,
          stock: parseInt(sv.stock) || 0,
          image_key: sizeImageKey,
          colors: variantColors
        });
      }
    } else if (colorsList.length > 0) {
      // Colors only, no sizes -> create a single default variant
      const variantColors = colorsList.map(colorName => {
        const colorImageObj = galleryImages.value.find(img => img.attribute_type === 'color' && img.attribute_value?.trim() === colorName);
        const colorImageKey = colorImageObj ? colorImageObj.image_key : null;
        return {
          color_name: colorName,
          image_key: colorImageKey,
          stock: parseInt(newProduct.value.stock) || 0
        };
      });

      variantsPayload.push({
        variant_name: 'Default',
        sku: `${sku}-DFT`,
        price_1: parseFloat(newProduct.value.price_1) || 0,
        price_2: parseFloat(newProduct.value.price_2) || 0,
        price_3: parseFloat(newProduct.value.price_3) || 0,
        price_4: parseFloat(newProduct.value.price_4) || 0,
        price_5: parseFloat(newProduct.value.price_5) || 0,
        stock: parseInt(newProduct.value.stock) || 0,
        image_key: null,
        colors: variantColors
      });
    }

    newProduct.value.variants = variantsPayload;

    if (isEditing.value) {
      newProduct.value.stock = Math.max(0, (newProduct.value.stock || 0) + stockAdjustment.value);
      await api.updateProduct(editingId.value, newProduct.value);
      alert(t('admin.alertUpdated'));
    } else {
      await api.addProduct(newProduct.value);
      alert(t('admin.alertAdded'));
    }
    resetForm();
    loadProducts();
  } catch (error) {
    console.error('Submit error:', error);
    alert('Error: ' + error.message);
  } finally {
    uploading.value = false;
  }
};

const logout = () => {
  localStorage.removeItem('admin_token');
  isAuthenticated.value = false;
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

  if (sizeVariants.value.length > 0) {
    let appliedCount = 0;
    sizeVariants.value.forEach(sv => {
      const p5 = parseFloat(sv.price_5);
      if (!isNaN(p5) && p5 > 0) {
        sv.price_1 = Number((p5 * percentages[0] / 100).toFixed(2));
        sv.price_2 = Number((p5 * percentages[1] / 100).toFixed(2));
        sv.price_3 = Number((p5 * percentages[2] / 100).toFixed(2));
        sv.price_4 = Number((p5 * percentages[3] / 100).toFixed(2));
        appliedCount++;
      }
    });
    if (appliedCount === 0) {
      alert("Please set a valid Level 5 price on at least one variant first.");
      return;
    }
  } else {
    const p5 = parseFloat(newProduct.value.price_5);
    if (isNaN(p5) || p5 <= 0) {
      alert("Please set a valid Level 5 price first.");
      return;
    }
    newProduct.value.price_1 = Number((p5 * percentages[0] / 100).toFixed(2));
    newProduct.value.price_2 = Number((p5 * percentages[1] / 100).toFixed(2));
    newProduct.value.price_3 = Number((p5 * percentages[2] / 100).toFixed(2));
    newProduct.value.price_4 = Number((p5 * percentages[3] / 100).toFixed(2));
  }

  showFormulaPopup.value = false;
};

const onCategoryChange = () => {
  if (isEditing.value) return; // Don't overwrite existing product data when editing

  const selectedCat = categories.value.find(c => c.path === newProduct.value.category);
  if (selectedCat) {
    if (selectedCat.default_usage) {
      newProduct.value.usage = selectedCat.default_usage;
    }
    if (selectedCat.default_use_for) {
      newProduct.value.use_for = selectedCat.default_use_for;
    }
  }
};

const adjustStock = async (product, change) => {
  try {
    const result = await api.adjustStock(product.id, change);
    if (result.success) {
      product.stock = result.newStock;
    }
  } catch (error) {
    alert('Failed to adjust stock');
  }
};

// DIY reactive states
const diyProducts = ref([]);
const isDiyEditing = ref(false);
const diyEditingId = ref(null);
const activeAdminSection = ref('standard');
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
    alert('Error: ' + error.message);
  } finally {
    uploading.value = false;
  }
};

const editDiyProduct = (prod) => {
  isDiyEditing.value = true;
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
      alert('Failed to delete DIY product: ' + error.message);
    }
  }
};
</script>

<template>
  <div class="admin-container">
    <div v-if="!isAuthenticated" class="login-box">
      <h1>{{ $t('admin.loginTitle') }}</h1>
      <input v-model="password" type="password" :placeholder="$t('admin.passwordPlaceholder')"
        @keyup.enter="handleLogin" />
      <button @click="handleLogin">{{ $t('admin.signIn') }}</button>
      <p v-if="loginError" class="error">{{ loginError }}</p>
    </div>

    <div v-else class="admin-panel">
      <header>
        <div class="header-left">
          <h1>{{ $t('admin.dashboard') }}</h1>
          <p class="stats">{{ $t('admin.statsItems', { count: products.length }) }} | {{ $t('admin.statsCategories', {
            count: categories.length }) }}</p>
        </div>
        <div class="header-actions">
          <button class="cat-btn" @click="showCategoryManager = !showCategoryManager">
            <ion-icon name="list-outline"></ion-icon> {{ $t('admin.editCategories') }}
          </button>
          <button class="logout-btn" @click="logout">{{ $t('admin.logout') }}</button>
        </div>
      </header>

      <!-- Section Sub-Tabs to toggle Standard Products vs DIY Sets -->
      <div class="admin-sub-tabs">
        <button type="button" :class="{ active: activeAdminSection === 'standard' }" @click="activeAdminSection = 'standard'; resetForm();">
          <ion-icon name="grid-outline"></ion-icon> Standard Inventory
        </button>
        <button type="button" :class="{ active: activeAdminSection === 'diy' }" @click="activeAdminSection = 'diy'; resetDiyForm();">
          <ion-icon name="construct-outline"></ion-icon> DIY Sets Collection
        </button>
      </div>

      <!-- Category Manager Section (Togglable) -->
      <transition name="slide-fade">
        <section v-if="showCategoryManager" class="category-manager">
          <div class="cat-manager-content">
            <h3>{{ $t('admin.manageCategories') }}</h3>
            <div class="cat-add-row">
              <input v-model="newCat.name" :placeholder="$t('admin.categoryName')" />
              <input v-model="newCat.path" :placeholder="$t('admin.path')" />
            </div>
            <div class="cat-add-row">
              <input v-model="newCat.default_usage" :placeholder="$t('admin.defaultUsage')" />
              <input v-model="newCat.default_use_for" :placeholder="$t('admin.defaultUseFor')" />
              <button @click="handleAddCategory">{{ $t('admin.add') }}</button>
            </div>
            <div class="cat-list">
              <div v-for="cat in categories" :key="cat.id" class="cat-tag">
                <div class="cat-tag-info">
                  <strong>{{ cat.name }}</strong> ({{ cat.path }})
                  <div class="cat-defaults" v-if="cat.default_usage || cat.default_use_for">
                    <span v-if="cat.default_usage">U: {{ cat.default_usage }}</span>
                    <span v-if="cat.default_use_for">F: {{ cat.default_use_for }}</span>
                  </div>
                </div>
                <button @click="deleteCategory(cat.id)">&times;</button>
              </div>
            </div>
          </div>
        </section>
      </transition>

      <div class="dashboard-grid">
        <section class="form-section">
          <template v-if="activeAdminSection === 'standard'">
            <div class="form-header">
              <div class="header-title-group">
                <h2 style="padding: 0; margin: 0;">{{ isEditing ? $t('admin.editProduct') : $t('admin.addProduct') }}</h2>
              </div>
              <button v-if="isEditing" @click="resetForm" class="cancel-btn">
                <ion-icon name="close-circle-outline"></ion-icon> {{ $t('admin.cancelEdit') }}
              </button>
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
              </div>
              <div>
                <div class="form-group">
                  <label>{{ $t('admin.category') }}</label>
                  <select v-model="newProduct.category" required @change="onCategoryChange">
                    <option value="" disabled>{{ $t('admin.selectCategory') }}</option>
                    <option v-for="cat in categories" :key="cat.id" :value="cat.path">
                      {{ cat.name }}
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label>{{ $t('admin.description') }}</label>
                  <textarea required v-model="newProduct.description" rows="8"
                    :placeholder="$t('admin.descriptionPlaceholder')"></textarea>
                  <small class="auto-hint">{{ $t('admin.autoTranslateHint') }}</small>
                </div>
              </div>
            </div>


            <div class="form-row">
              <div class="form-group">
                <label>{{ $t('admin.usage') }}</label>
                <input v-model="newProduct.usage" :placeholder="$t('admin.placeholderUsage')" />
              </div>
              <div class="form-group">
                <label>{{ $t('admin.useFor') }}</label>
                <input v-model="newProduct.use_for" :placeholder="$t('admin.placeholderUseFor')" />
              </div>
            </div>



          </form>
          </template>

          <template v-else-if="activeAdminSection === 'diy'">
            <div class="form-header">
              <div class="header-title-group">
                <h2 style="padding: 0; margin: 0;">{{ isDiyEditing ? 'Edit DIY Product' : 'Add New DIY Product' }}</h2>
              </div>
              <button v-if="isDiyEditing" @click="resetDiyForm" class="cancel-btn">
                <ion-icon name="close-circle-outline"></ion-icon> Cancel Edit
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
                    <input v-model="newDiyProduct.price_1" type="number" step="0.01" placeholder="0.00" required />
                  </div>
                  <div class="price-input-box">
                    <span class="label">Level 2 (Medium Wholesale)</span>
                    <input v-model="newDiyProduct.price_2" type="number" step="0.01" placeholder="0.00" required />
                  </div>
                  <div class="price-input-box">
                    <span class="label">Level 3 (Bulk Wholesale)</span>
                    <input v-model="newDiyProduct.price_3" type="number" step="0.01" placeholder="0.00" required />
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label>Description</label>
                <textarea required v-model="newDiyProduct.description" rows="6" placeholder="Describe the DIY kit contents, difficulty level, or instructions..."></textarea>
              </div>

              <div class="form-group">
                <label>Stock Count</label>
                <input v-model.number="newDiyProduct.stock" type="number" min="0" placeholder="0" required />
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
                <p v-else class="gallery-empty">No DIY images added yet. Click Add Images above to upload.</p>
              </div>

              <button type="submit" :disabled="uploading" :class="['submit-btn', isDiyEditing ? 'update' : '']">
                {{ uploading ? $t('admin.processing') : (isDiyEditing ? 'Update DIY Product' : 'Add DIY Product') }}
              </button>
            </form>
          </template>

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
                    <span class="info-tag" v-if="sizeVariants.length === 0">{{ $t('admin.currentL5', { price: newProduct.price_5 || '0.00' }) }}</span>
                    <span class="info-tag" v-else>Applying to all variants with a set Level 5 price</span>
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
        </section>

        <section class="list-section">
          <template v-if="activeAdminSection === 'standard'">
            <div class="list-header">
              <h2>{{ $t('admin.inventory') }}</h2>
              <!-- Filter Tabs -->
              <div class="filter-tabs">
                <button :class="{ active: activeFilter === 'all' }" @click="activeFilter = 'all'">{{ $t('admin.all')
                  }}</button>
                <button v-for="cat in categories" :key="cat.id" :class="{ active: activeFilter === cat.path }"
                  @click="activeFilter = cat.path">
                  {{ cat.name }}
                </button>
              </div>
            </div>

            <div class="inventory-scroll">
              <div v-for="product in filteredProducts" :key="product.id" class="product-item">
                <div class="item-img">
                  <img :src="getImageUrl(product.image_key || product.image)" :alt="product.name">
                </div>
                <div class="item-info">
                  <strong>{{ product.name_th ? `${product.name} (${product.name_th})` : product.name }}</strong>
                  <span class="p-meta">SKU: {{ product.sku }} | {{ product.category }} | ${{ product.price_1 || product.price }}</span>
                  <div class="stock-control">
                    <span :class="['stock-count', 
                      product.stock === 0 ? 'low' : (product.stock > 0 && product.stock <= 5 ? 'warning' : '')
                    ]">{{ $t('admin.inStock', {
                      count:
                      product.stock || 0 }) }}</span>
                  </div>
                </div>
                <div class="item-actions">
                  <button class="action-btn edit" @click="editProduct(product)"><ion-icon
                      name="create-outline"></ion-icon></button>
                  <button class="action-btn del" @click="deleteProduct(product.id)"><ion-icon
                      name="trash-outline"></ion-icon></button>
                </div>
              </div>
            </div>
          </template>

          <template v-else-if="activeAdminSection === 'diy'">
            <div class="list-header">
              <h2>DIY Kits Collection ({{ diyProducts.length }} items)</h2>
            </div>

            <div class="inventory-scroll">
              <div v-for="prod in diyProducts" :key="prod.id" class="product-item">
                <div class="item-img">
                  <img :src="getDiyImageUrl(prod.images && prod.images.length > 0 ? prod.images[0] : '')" :alt="prod.name">
                </div>
                <div class="item-info">
                  <strong>{{ prod.name_th ? `${prod.name} (${prod.name_th})` : prod.name }}</strong>
                  <span class="p-meta">SKU: {{ prod.sku }} | ฿{{ prod.price_1 }}</span>
                  <div class="stock-control">
                    <span :class="['stock-count', prod.stock === 0 ? 'low' : (prod.stock > 0 && prod.stock <= 5 ? 'warning' : '')]">
                      {{ prod.stock || 0 }} in stock
                    </span>
                  </div>
                </div>
                <div class="item-actions">
                  <button class="action-btn edit" @click="editDiyProduct(prod)">
                    <ion-icon name="create-outline"></ion-icon>
                  </button>
                  <button class="action-btn del" @click="deleteDiyProduct(prod.id)">
                    <ion-icon name="trash-outline"></ion-icon>
                  </button>
                </div>
              </div>
            </div>
          </template>
        </section>
      </div>

      <!-- Gallery & Variant Manager (Full Width at Bottom for Standard section) -->
      <transition name="slide-fade">
        <section class="gallery-variant-manager" v-if="activeAdminSection === 'standard'">
          <div class="workspace-header">
            <h2><ion-icon name="images-outline"></ion-icon> Gallery & Variant Manager</h2>
            <button type="button" class="add-gallery-btn" @click="triggerGalleryUpload">
              <ion-icon name="cloud-upload-outline"></ion-icon> Add Images
            </button>
            <input type="file" ref="galleryFileInput" class="hidden-input" @change="handleGalleryUpload" accept="image/*" multiple />
          </div>

          <!-- Gallery Grid Workspace -->
          <div class="gallery-workspace-grid" v-if="galleryImages.length > 0">
            <div v-for="(img, index) in galleryImages" :key="index" class="gallery-card">
              <div class="card-thumb">
                <img :src="img.preview" />
                <button type="button" class="remove-card-btn" @click="removeGalleryImage(index)">&times;</button>
              </div>
              <div class="card-controls">
                <label>Link Role</label>
                <select v-model="img.attribute_type">
                  <option value="gallery">Gallery Only</option>
                  <option value="color">Color Link</option>
                  <option value="size">Size Link</option>
                </select>
                <input v-if="img.attribute_type !== 'gallery'" v-model="img.attribute_value" 
                  :placeholder="img.attribute_type === 'color' ? 'e.g. Red' : 'e.g. 4 inches'" class="card-input" />
              </div>
            </div>
          </div>
          <!-- Pricing & Stock Matrix -->
          <div class="pricing-matrix-workspace">
            <div class="matrix-header-row">
              <h3>Pricing & Stock Configuration</h3>
              <button type="button" class="config-btn" @click="showFormulaPopup = true">
                <ion-icon name="settings-outline"></ion-icon> {{ $t('admin.config') }}
              </button>
            </div>
            <p class="matrix-info-text">
              Configure wholesale pricing and stock. 
              <span v-if="sizeVariants.length > 0">Colors will automatically inherit these price levels.</span>
            </p>
            <div class="matrix-scrollable">
              <table class="matrix-table">
                <thead>
                  <tr>
                    <th>Variant Name</th>
                    <th>Level 1</th>
                    <th>Level 2</th>
                    <th>Level 3</th>
                    <th>Level 4</th>
                    <th>Level 5</th>
                    <th>Stock</th>
                    <th style="width: 50px;"></th>
                  </tr>
                </thead>
                <tbody>
                  <!-- Case 1: Has Size Variants -->
                  <template v-if="sizeVariants.length > 0">
                    <tr v-for="(sv, idx) in sizeVariants" :key="idx">
                      <td class="variant-name-cell">
                        <strong>{{ sv.name }}</strong>
                      </td>
                      <td><input type="number" step="0.01" v-model="sv.price_1" class="matrix-input" /></td>
                      <td><input type="number" step="0.01" v-model="sv.price_2" class="matrix-input" /></td>
                      <td><input type="number" step="0.01" v-model="sv.price_3" class="matrix-input" /></td>
                      <td><input type="number" step="0.01" v-model="sv.price_4" class="matrix-input" /></td>
                      <td><input type="number" step="0.01" v-model="sv.price_5" class="matrix-input" /></td>
                      <td><input type="number" v-model.number="sv.stock" class="matrix-input stock-input" /></td>
                      <td style="text-align: center;">
                        <button type="button" class="action-btn del" @click="removeSizeVariant(sv.name)" title="Remove Variant">
                          <ion-icon name="trash-outline"></ion-icon>
                        </button>
                      </td>
                    </tr>
                  </template>
                  <!-- Case 2: No Size Variants (Base Product) -->
                  <template v-else>
                    <tr>
                      <td class="variant-name-cell">
                        <strong>Base Product</strong>
                      </td>
                      <td><input type="number" step="0.01" v-model="newProduct.price_1" class="matrix-input" /></td>
                      <td><input type="number" step="0.01" v-model="newProduct.price_2" class="matrix-input" /></td>
                      <td><input type="number" step="0.01" v-model="newProduct.price_3" class="matrix-input" /></td>
                      <td><input type="number" step="0.01" v-model="newProduct.price_4" class="matrix-input" /></td>
                      <td><input type="number" step="0.01" v-model="newProduct.price_5" class="matrix-input" /></td>
                      <td>
                        <div v-if="!isEditing">
                          <input type="number" v-model.number="newProduct.stock" class="matrix-input stock-input" min="0" />
                        </div>
                        <div v-else style="display: flex; align-items: center; gap: 6px;">
                          <input type="number" readonly :value="Math.max(0, (newProduct.stock || 0) + stockAdjustment)" class="matrix-input stock-input" style="background:#f1f2f6; width: 60px;" />
                          <div class="stock-control edit-stock-control" style="margin: 0; gap: 3px;">
                            <button type="button" @click="updateStockAdjustment(-1)" class="stock-btn minus" style="width:16px; height:16px; font-size:9px;">-1</button>
                            <input type="number" v-model.number="stockAdjustment" @input="validateStockAdjustment" class="stock-adjust-input" style="width:36px; padding:0; font-size:11px;" />
                            <button type="button" @click="updateStockAdjustment(1)" class="stock-btn plus" style="width:16px; height:16px; font-size:9px;">+1</button>
                          </div>
                        </div>
                      </td>
                      <td></td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Submit Button at the bottom of the page -->
          <button type="submit" form="product-form" :disabled="uploading" :class="['submit-btn', isEditing ? 'update' : '']" style="margin-top: 30px; font-size: 16px;">
            {{ uploading ? $t('admin.processing') : (isEditing ? $t('admin.submitUpdate') : $t('admin.submitAdd')) }}
          </button>
        </section>
      </transition>
    </div>
  </div>
</template>

<style scoped>
/* Reset and Global component styles */
* {
  box-sizing: border-box;
}

.auto-hint {
  display: block;
  margin-top: 5px;
  font-size: 11px;
  color: #8b6f47;
  font-style: italic;
  opacity: 0.8;
}

.admin-container {
  min-height: 100vh;
  background: #f4f7f6;
  padding: 30px;
  font-family: 'Inter', sans-serif;
  width: 100%;
}

.login-box {
  background: white;
  padding: 40px;
  border-radius: 24px;
  text-align: center;
  max-width: 400px;
  margin: 100px auto;
}

.login-box input {
  width: 100%;
  padding: 12px;
  margin: 20px 0;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.login-box button {
  width: 100%;
  padding: 12px;
  background: #8b6f47;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.admin-panel {
  max-width: 1400px;
  margin: 0 auto;
}

.header-left {
  display: flex;
  gap: 2rem;
}

.stats {
  margin: auto 0;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-title-group {
  display: flex;
  align-items: center;
  gap: 15px;
}

.lang-cycle-btn {
  background: white;
  border: 1px solid #edf2f7;
  padding: 8px 16px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  min-width: 60px;
}

.lang-cycle-btn:hover {
  background: #f8f9fa;
  border-color: #8b6f47;
  transform: translateY(-1px);
}

.lang-label {
  font-weight: 800;
  font-size: 14px;
  color: #3D2B1F;
  letter-spacing: 0.5px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.cat-btn {
  background: #636e72;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}

.logout-btn {
  background: #ff7675;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 8px;
  cursor: pointer;
}

.category-manager {
  background: #2d3436;
  color: white;
  padding: 20px;
  border-radius: 15px;
  margin-bottom: 20px;
}

.cat-add-row {
  display: flex;
  gap: 10px;
  margin: 15px 0;
}

.cat-add-row input {
  flex: 1;
  padding: 8px;
  border-radius: 5px;
  border: none;
}

.cat-add-row button {
  background: #00b894;
  color: white;
  border: none;
  padding: 0 20px;
  border-radius: 5px;
  cursor: pointer;
}

.cat-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.cat-tag {
  background: rgba(255, 255, 255, 0.1);
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.cat-tag button {
  background: none;
  border: none;
  color: #ff7675;
  cursor: pointer;
  font-size: 18px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 30px;
  width: 100%;
}

.form-section,
.list-section {
  background: white;
  padding: 30px;
  border-radius: 24px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  min-width: 0;
  /* Important for grid items */
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.product-main-row {
  display: flex;
  gap: 20px;
  align-items: flex-end;
  margin-bottom: 20px;
}

.name-field {
  flex: 1;
  margin-bottom: 0 !important;
}

.product-image-uploader {
  width: 100%;
  height: 100%;
  border-radius: 16px;
  overflow: hidden;
  border: 2px dashed #d1d8e0;
  background: #f8f9fa;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
}

.product-image-uploader:hover {
  border-color: #8b6f47;
  background: #fffaf0;
  transform: scale(1.02);
}

.product-image-uploader img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #a5b1c2;
}

.upload-placeholder ion-icon {
  font-size: 24px;
}

.upload-placeholder span {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
}

.hidden-input {
  display: none;
}

/* Gallery Styles */
.gallery-section {
  background: #fdfcfb;
  padding: 20px;
  border-radius: 16px;
  border: 1px solid #f1ece7;
  margin-bottom: 25px;
}

.gallery-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.add-gallery-btn {
  background: #008080;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.add-gallery-btn:hover {
  background: #006666;
  transform: translateY(-1px);
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 15px;
}

.gallery-item {
  background: white;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #eee;
  display: flex;
  flex-direction: column;
}

.gallery-thumb {
  position: relative;
  height: 120px;
}

.gallery-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-thumb {
  position: absolute;
  top: 5px;
  right: 5px;
  background: rgba(255, 118, 117, 0.9);
  color: white;
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.gallery-meta {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.gallery-meta select,
.gallery-meta input {
  font-size: 11px;
  padding: 6px;
  border-radius: 4px;
}

.gallery-empty {
  text-align: center;
  color: #a5b1c2;
  font-size: 13px;
  padding: 20px;
  border: 2px dashed #eee;
  border-radius: 10px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  width: 100%;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 700;
  font-size: 13px;
}

input,
textarea,
select {
  width: 100%;
  padding: 12px;
  border: 1px solid #edf2f7;
  border-radius: 12px;
  background: #f9f9f9;
  font-family: inherit;
}

.price-levels {
  background: #fffaf0;
  padding: 20px;
  border-radius: 16px;
  margin-bottom: 25px;
  border: 1px solid #f9ebda;
  position: relative;
}

.price-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.price-header-row label {
  margin-bottom: 0;
}

.config-btn {
  background: #8b6f47;
  color: white;
  border: none;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}

.config-btn:hover {
  background: #705a39;
  transform: translateY(-1px);
}

.price-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}

.price-input-box {
  text-align: center;
  min-width: 0;
  /* Prevents overflow */
}

.price-input-box input {
  padding: 8px 4px;
  font-size: 13px;
  text-align: center;
}

.price-input-box .label {
  font-size: 10px;
  color: #8b6f47;
  display: block;
}

.price-input-box.active input {
  border-color: #8b6f47;
  border-width: 2px;
}

.submit-btn {
  width: 100%;
  padding: 15px;
  border-radius: 12px;
  border: none;
  background: #00b894;
  color: white;
  font-weight: 700;
  cursor: pointer;
  margin-top: 10px;
}

.submit-btn.update {
  background: #0984e3;
}

.cancel-btn {
  background: #f1f2f6;
  border: 1px solid #dfe6e9;
  color: #636e72;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 5px;
  height: fit-content;
  margin: auto 0;
}

.cancel-btn:hover {
  background: #ff7675;
  color: white;
  border-color: #ff7675;
  box-shadow: 0 4px 12px rgba(255, 118, 117, 0.2);
}

.list-header {
  margin-bottom: 15px;
}

.filter-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.filter-tabs button {
  background: #f0f2f5;
  border: none;
  padding: 6px 12px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.filter-tabs button.active {
  background: #8b6f47;
  color: white;
}

.inventory-scroll {
  overflow-y: auto;
}

.product-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f1f2f6;
}

.item-img {
  width: 45px;
  height: 45px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.item-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-info strong {
  display: block;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.p-meta {
  font-size: 11px;
  color: #636e72;
}

.stock-control {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 5px;
}

.stock-btn {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid #ddd;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  color: #666;
  transition: all 0.2s;
}

.stock-btn:hover {
  border-color: #8b6f47;
  color: #8b6f47;
}

.stock-count {
  font-size: 11px;
  font-weight: 600;
  color: #2d3436;
}

.stock-count.low {
  color: #d63031;
}

.stock-count.warning {
  color: #e67e22;
}

.edit-stock-control {
  margin-top: 5px;
  gap: 5px;
}

.stock-adjust-input {
  width: 50px;
  text-align: center;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 2px;
  font-size: 13px;
  color: #2d3436;
}

.stock-adjust-input::-webkit-outer-spin-button,
.stock-adjust-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.stock-adjust-input[type=number] {
  appearance: textfield;
}

.stock-preview {
  margin-top: 8px;
  font-size: 12px;
  color: #636e72;
}

.stock-preview.low {
  color: #d63031;
}

.stock-preview.warning {
  color: #e67e22;
}

.item-actions {
  display: flex;
  gap: 5px;
}

.action-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.action-btn.edit {
  background: #e3f2fd;
  color: #1976d2;
}

.action-btn.del {
  background: #ffebee;
  color: #d32f2f;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  width: 90%;
  max-width: 450px;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  animation: modalPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modalPop {
  from {
    transform: scale(0.9);
    opacity: 0;
  }

  to {
    transform: scale(1);
    opacity: 1;
  }
}

.modal-header {
  padding: 20px;
  background: #fcf8f3;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  color: #8b6f47;
  font-size: 1.1rem;
}

.close-modal {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
}

.modal-body {
  padding: 24px;
}

.modal-body p {
  margin: 0 0 15px 0;
  color: #666;
  font-size: 0.9rem;
}

.formula-info {
  margin-bottom: 20px;
}

.info-tag {
  background: #f0f0f0;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #444;
}

.input-group label {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: #888;
  letter-spacing: 0.5px;
}

.input-group input {
  margin-top: 5px;
  border: 2px solid #f0f0f0;
  transition: border-color 0.2s;
}

.input-group input:focus {
  border-color: #8b6f47;
  outline: none;
}

.formula-hint {
  font-size: 0.75rem !important;
  color: #999 !important;
  margin-top: 10px !important;
}

.modal-footer {
  padding: 15px 24px;
  background: #fafafa;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid #eee;
}

.btn-secondary {
  background: #eee;
  border: none;
  padding: 10px 18px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
}

.btn-primary {
  background: #8b6f47;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.cat-tag-info {
  flex: 1;
}

.cat-defaults {
  font-size: 10px;
  color: #00b894;
  margin-top: 4px;
  display: flex;
  gap: 10px;
}

.cat-defaults span {
  background: rgba(0, 184, 148, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

/* Custom styles for DIY administration sub-tabs */
.admin-sub-tabs {
  display: flex;
  gap: 15px;
  margin-bottom: 25px;
  background: white;
  padding: 12px 18px;
  border-radius: 16px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

.admin-sub-tabs button {
  background: transparent;
  border: none;
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 14px;
  color: #636e72;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.admin-sub-tabs button.active {
  background: #8b6f47;
  color: white;
  box-shadow: 0 4px 10px rgba(139, 111, 71, 0.2);
}

.admin-sub-tabs button:hover:not(.active) {
  background: #f1f2f6;
  color: #2d3436;
}

/* Gallery & Variant Manager Styling */
.gallery-variant-manager {
  background: white;
  padding: 30px;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  margin-top: 30px;
  width: 100%;
}

.workspace-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  border-bottom: 2px solid #f1f2f6;
  padding-bottom: 15px;
}

.workspace-header h2 {
  font-size: 1.4rem;
  color: #2d3436;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
}

.add-gallery-btn {
  background: #8b6f47;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.add-gallery-btn:hover {
  background: #735c3a;
  transform: translateY(-2px);
}

.gallery-workspace-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.gallery-card {
  background: #fafafa;
  border: 1px solid #f1f2f6;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  display: flex;
  flex-direction: column;
}

.card-thumb {
  position: relative;
  width: 100%;
  padding-top: 100%; /* Square */
  background: #eee;
}

.card-thumb img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-card-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(214, 48, 49, 0.9);
  color: white;
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
}

.card-controls {
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card-controls label {
  font-size: 11px;
  text-transform: uppercase;
  color: #8b6f47;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.card-controls select,
.card-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #e1e8ed;
  border-radius: 8px;
  font-size: 13px;
  color: #2d3436;
  background: white;
}

.card-input::placeholder {
  color: #b2bec3;
}

.gallery-workspace-empty {
  text-align: center;
  padding: 40px 20px;
  color: #b2bec3;
  font-style: italic;
}

/* Pricing Matrix Workspace Styling */
.pricing-matrix-workspace {
  margin-top: 30px;
  border-top: 2px solid #f1f2f6;
  padding-top: 25px;
}

.matrix-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.pricing-matrix-workspace h3 {
  font-size: 1.2rem;
  color: #2d3436;
  margin: 0;
}

.matrix-info-text {
  font-size: 13px;
  color: #636e72;
  margin: 0 0 20px 0;
}

.matrix-scrollable {
  overflow-x: auto;
  border: 1px solid #f1f2f6;
  border-radius: 12px;
}

.matrix-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 14px;
}

.matrix-table th,
.matrix-table td {
  padding: 15px;
  border-bottom: 1px solid #f1f2f6;
}

.matrix-table th {
  background: #fafafa;
  font-weight: 700;
  color: #2d3436;
}

.variant-name-cell {
  color: #8b6f47;
  font-size: 15px;
}

.matrix-input {
  width: 90px;
  padding: 8px 12px;
  border: 1px solid #e1e8ed;
  border-radius: 8px;
  font-size: 14px;
  color: #2d3436;
  transition: all 0.2s ease;
}

.matrix-input:focus {
  border-color: #8b6f47;
  outline: none;
  box-shadow: 0 0 0 3px rgba(139, 111, 71, 0.1);
}

.matrix-input.stock-input {
  width: 80px;
}
</style>
