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
const formPanelOpen = ref(false);
const showCategoryManager = ref(false);

// New Category form
const newCat = ref({ name: '', name_th: '', path: '', default_usage: '', default_use_for: '' });

// Filtering
const activeFilter = ref('all');
const searchQuery = ref('');
const showThai = ref(true);
const adminSortBy = ref('upload');
const adminSortOpen = ref(false);

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
const stockAdjustment = ref(0);

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
    products.value = await api.getProducts(null, { includeHidden: true });
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

const formatProductCategories = (product) => {
  const paths = product.categories?.length
    ? product.categories
    : (product.category ? [product.category] : []);
  return paths.map((path) => {
    const cat = categories.value.find((c) => c.path === path);
    if (!cat) return path;
    return cat.name_th ? `${cat.name} (${cat.name_th})` : cat.name;
  }).join(', ');
};

const filteredProducts = computed(() => {
  let filtered = products.value;

  // Apply category filter
  if (activeFilter.value !== 'all') {
    filtered = filtered.filter(p => {
      if (p.categories && p.categories.length > 0) {
        return p.categories.includes(activeFilter.value);
      }
      return p.category === activeFilter.value;
    });
  }

  // Apply search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(p => {
      const nameMatch = (p.name || '').toLowerCase().includes(query);
      const nameThMatch = (p.name_th || '').toLowerCase().includes(query);
      const skuMatch = (p.sku || '').toLowerCase().includes(query);
      return nameMatch || nameThMatch || skuMatch;
    });
  }

  // Apply sort
  filtered = [...filtered];
  if (adminSortBy.value === 'sku') {
    filtered.sort((a, b) => (a.sku || '').localeCompare(b.sku || '', undefined, { numeric: true }));
  } else if (adminSortBy.value === 'alpha') {
    const bcp47 = showThai.value ? 'th-TH' : 'en';
    filtered.sort((a, b) => {
      const nameA = (showThai.value ? (a.name_th || a.name) : a.name) || '';
      const nameB = (showThai.value ? (b.name_th || b.name) : b.name) || '';
      return nameA.localeCompare(nameB, bcp47);
    });
  }
  // 'upload' = default DB order, no sort needed

  return filtered;
});

const filteredCategories = computed(() => {
  if (!categorySearchQuery.value.trim()) return categories.value;
  const query = categorySearchQuery.value.toLowerCase();
  return categories.value.filter(cat => {
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

const resetForm = () => {
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
  stockAdjustment.value = 0;
  showThaiFields.value = true;
  formPanelOpen.value = false;
};

const editProduct = (product) => {
  isEditing.value = true;
  formPanelOpen.value = true;
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

  // window.scrollTo({ top: 0, behavior: 'smooth' });
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
    newCat.value = { name: '', name_th: '', path: '', default_usage: '', default_use_for: '' };
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
      stock: newProduct.value.stock,
      sku: newProduct.value.sku || undefined,
      images: finalImages.filter(img => img.image_key)
    };

    if (isEditing.value) {
      productPayload.stock = Math.max(0, (newProduct.value.stock || 0) + stockAdjustment.value);
      await api.updateProduct(editingId.value, productPayload);
      alert(t('admin.alertUpdated'));
    } else {
      await api.addProduct(productPayload);
      alert(t('admin.alertAdded'));
    }
    resetForm();
    loadProducts();
  } catch (error) {
    console.error('Submit error:', error);
    if (!isEditing.value) {
      newProduct.value.sku = '';
    }
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
              <input v-model="newCat.name_th" :placeholder="$t('admin.categoryNameTh')" />
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
                  <strong>{{ cat.name }}</strong>
                  <span v-if="cat.name_th"> ({{ cat.name_th }})</span>
                  <span class="cat-path">({{ cat.path }})</span>
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

      <!-- Form Panel Backdrop -->
      <div v-if="formPanelOpen" class="form-panel-backdrop" @click="activeAdminSection === 'diy' ? resetDiyForm() : resetForm()"></div>

      <!-- Slide-in Form Panel -->
      <transition name="form-panel">
        <section v-if="formPanelOpen" class="form-section">
          <template v-if="activeAdminSection === 'standard'">
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
          </template>

          <template v-else-if="activeAdminSection === 'diy'">
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
                <p v-else class="gallery-empty">{{$t('admin.gImagesEmpty')}}</p>
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
          <div v-if="activeAdminSection === 'standard'" class="gallery-variant-manager">
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
                    <th>{{$t('admin.stock')}}</th>
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

      <section class="list-section">
          <template v-if="activeAdminSection === 'standard'">
            <div class="list-header">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h2 style="padding:0; margin:0;">{{ $t('admin.inventory') }}</h2>
                <div style="display:flex; gap:12px; align-items:center;">
                  <!-- Sort dropdown -->
                  <div style="position:relative;">
                    <button
                      :class="['lang-toggle', { active: adminSortBy !== 'upload' }]"
                      :title="'Sort products'"
                      @click="adminSortOpen = !adminSortOpen"
                      style="display:flex; align-items:center; gap:5px;"
                    >
                      <ion-icon name="swap-vertical-outline"></ion-icon>
                      {{ adminSortBy === 'upload' ? 'Upload' : adminSortBy === 'sku' ? 'SKU' : 'A–Z' }}
                    </button>
                    <div v-if="adminSortOpen" @click.stop style="position:absolute; top:calc(100% + 6px); right:0; min-width:140px; background:#fff; border:1px solid #e0d5c8; border-radius:10px; box-shadow:0 6px 20px rgba(0,0,0,0.12); padding:6px; z-index:300;">
                      <label v-for="opt in [{ value:'upload', label:'Upload order' }, { value:'sku', label:'SKU' }, { value:'alpha', label:'Alphabetical' }]" :key="opt.value"
                        style="display:flex; align-items:center; gap:8px; padding:7px 10px; cursor:pointer; font-size:13px; color:#5d4037; border-radius:7px; transition:background 0.13s;"
                        @mouseenter="$event.currentTarget.style.background='#FDF3E6'"
                        @mouseleave="$event.currentTarget.style.background=''"
                        @click="adminSortBy = opt.value; adminSortOpen = false"
                      >
                        <input type="radio" :value="opt.value" v-model="adminSortBy" style="accent-color:#DD876E; width:13px; height:13px; flex-shrink:0;">
                        <span>{{ opt.label }}</span>
                      </label>
                    </div>
                  </div>
                  <button :class="['lang-toggle', { active: showThai }]" @click="showThai = !showThai">
                    {{ showThai ? 'ไทย' : 'ENG' }}
                  </button>
                  <button class="add-product-btn" @click="resetForm(); formPanelOpen = true">
                    <ion-icon name="add-circle-outline"></ion-icon> {{ $t('admin.addProduct') }}
                  </button>
                </div>
              </div>
              <!-- Search Bar -->
              <div style="margin-bottom:15px;">
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Search by name, SKU..."
                  class="search-input"
                />
              </div>
              <!-- Filter Tabs -->
              <div class="filter-tabs">
                <button :class="{ active: activeFilter === 'all' }" @click="activeFilter = 'all'; searchQuery = ''">{{ $t('admin.all')
                  }}</button>
                <button v-for="cat in categories" :key="cat.id" :class="{ active: activeFilter === cat.path }"
                  @click="activeFilter = cat.path; searchQuery = ''">
                  {{ cat.name_th ? `${cat.name} (${cat.name_th})` : cat.name }}
                </button>
              </div>
            </div>

            <div class="inventory-scroll">
              <div v-for="product in filteredProducts" :key="product.id" class="product-item" @click="editProduct(product)">
                <div class="item-img">
                  <img :src="getImageUrl(product.image_key || product.image)" :alt="product.name">
                </div>
                <div class="item-info">
                  <div>
                    <strong>
                    {{ showThai && product.name_th ? product.name_th : product.name }}
                    <span v-if="product.is_visible === 0" class="hidden-badge">
                      {{ $t('admin.hidden') || 'Hidden' }}
                    </span>
                  </strong>
                  <span class="p-meta">SKU: {{ product.sku }} | {{ formatProductCategories(product) }} | ${{ product.price_1 || product.price }}</span>
                  </div>
                  <div class="stock-control">
                    <span :class="['stock-count', 
                      product.stock === 0 ? 'low' : (product.stock > 0 && product.stock <= 5 ? 'warning' : '')
                    ]">{{ $t('admin.inStock', {
                      count:
                      product.stock || 0 }) }}
                    </span>
                    <div class="item-actions">
                      <button class="action-btn edit"><ion-icon
                          name="create-outline"></ion-icon></button>
                      <button class="action-btn del" @click="deleteProduct(product.id)"><ion-icon
                          name="trash-outline"></ion-icon></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <template v-else-if="activeAdminSection === 'diy'">
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
                  <div class="stock-control">
                    <span :class="['stock-count', prod.stock === 0 ? 'low' : (prod.stock > 0 && prod.stock <= 5 ? 'warning' : '')]">
                      {{ prod.stock || 0 }} in stock
                    </span>
                  </div>
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
          </template>
        </section>
      <!-- </transition> -->
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
  /* background: #f4f7f6; */
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

.cat-path {
  opacity: 0.7;
  margin-left: 4px;
}

.category-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem; /* Standardized modern tight gap spacing */
  margin-top: 0.5rem;
}

.category-checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem 0.5rem;
  
  /* Subtle, professional neutral colors */
  background: #f4f4f5; /* Tailwind zinc-100 */
  border: 1px solid transparent; /* Smooth transitions without layout snapping */
  border-radius: 9999px; /* Pill-shaped edges look incredibly sleek */
  
  color: #71717a; /* Muted slate text color */
  font-size: 0.6rem;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s cubic-bezier(0.165, 0.84, 0.44, 1);
}

/* 1. Completely hide the native browser checkbox square */
.category-checkbox input[type="checkbox"] {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  margin: 0;
}

/* 2. Hover state for unselected items */
.category-checkbox:hover {
  background: #e4e4e7; /* Slight contrast drop */
  color: #18181b;
}

/* 3. The Activated Selected State (The Professional Glow) */
.category-checkbox:has(input:checked) {
  background: #18181b; /* Sleek high-contrast dark selection (or use your var(--accent-warm)) */
  color: #ffffff;
  border-color: #18181b;
  box-shadow: 0 4px 12px rgba(24, 24, 27, 0.12); /* Micro-depth */
}

/* Secondary language tag logic */
.cat-th-label {
  font-size: 0.75rem;
  opacity: 0.8;
  margin-left: 0.25rem;
}
.cat-th-label {
  color: #636e72;
  font-size: 13px;
}

/* Form panel — fixed right-side drawer */
.form-panel-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 200;
}

.form-section {
  position: fixed;
  top: 80px; /*Consider NavBar Height*/
  right: 0;
  width: 680px;
  max-width: 92vw;
  min-width: 50vw;
  height: calc(100vh - 80px);
  overflow-y: scroll;
  background: #fff;
  z-index: 201;
  padding: 32px 30px;
  box-shadow: -6px 0 28px rgba(0, 0, 0, 0.18);
}

/* Slide-in / slide-out for the form panel */
.form-panel-enter-active {
  transition: transform 0.3s ease-out;
}
.form-panel-leave-active {
  transition: transform 0.3s ease-in;
}
.form-panel-enter-from,
.form-panel-leave-to {
  transform: translateX(100%);
}

.list-section {
  width: 100%;
  padding: 30px;
  border: rgb(237, 250, 255) 1px solid;
  border-radius: 20px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

.add-product-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #8b6f47;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}
.add-product-btn:hover {
  background: #6d5035;
}

.lang-toggle {
  padding: 6px 12px;
  background: #f0f1f3;
  border: 1px solid #d1d8e0;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  color: #636e72;
}

.lang-toggle.active {
  background: #8b6f47;
  color: #fff;
  border-color: #8b6f47;
}

.lang-toggle:hover {
  border-color: #8b6f47;
}

.search-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #e0e6ed;
  border-radius: 10px;
  font-size: 14px;
  background: #f8f9fa;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #8b6f47;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(139, 111, 71, 0.1);
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
  aspect-ratio: 1/1;
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

/* Dropdown Styles */
.dropdown-wrapper {
  position: relative;
}

.dropdown-toggle {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #e0e6ed;
  border-radius: 10px;
  background: #f8f9fa;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
  text-align: left;
  color: #2d3436;
}

.dropdown-toggle:hover {
  border-color: #8b6f47;
  background: #fff;
}

.dropdown-toggle:focus {
  outline: none;
  border-color: #8b6f47;
  box-shadow: 0 0 0 3px rgba(139, 111, 71, 0.1);
}

.dropdown-placeholder {
  color: #b2bec3;
}

.dropdown-value {
  font-weight: 500;
  color: #2d3436;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e0e6ed;
  border-top: none;
  border-radius: 0 0 10px 10px;
  margin-top: -1px;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  max-height: 300px;
  overflow-y: auto;
}

.dropdown-search {
  padding: 8px;
  border-bottom: 1px solid #f1f2f6;
  position: sticky;
  top: 0;
}

.dropdown-search-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #e0e6ed;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
}

.dropdown-search-input:focus {
  border-color: #8b6f47;
  background: #fff;
}

.dropdown-options {
  padding: 4px;
}

.dropdown-option {
  display: flex;
  align-items: center;
  justify-content: left;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 13px;
  color: #2d3436;
}

.dropdown-option:hover {
  background: #f8f9fa;
}

.dropdown-option input[type="checkbox"] {
  cursor: pointer;
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.dropdown-fade-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}

.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
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
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  padding: 4px 0;
}

.product-item {
  display: flex;
  flex-direction: column;
  padding: 14px;
  border: 1px solid #f1f2f6;
  border-radius: 12px;
  background: #fafbfc;
  transition: all 0.2s;
}

.product-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: #dfe6e9;
  cursor: pointer;
}

.item-img {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 10px;
}

.item-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.item-info strong {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #2d3436;
  line-height: 1.3;
  word-break: break-word;
}

.p-meta {
  font-size: 11px;
  color: #636e72;
  line-height: 1.3;
  display: block;
}

.stock-control {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  gap: 8px;
  margin-top: 12px;
  justify-content: center;
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
.action-btn.del:hover {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 512 512'%3E%3Cpath fill='%23d32f2f' d='M400 113.3h-80v-20c0-16.2-13.1-29.3-29.3-29.3h-69.3C205.1 64 192 77.1 192 93.3v20h-80V144h288v-30.7zM224 113.3v-20h64v20H224zM80 176l37.5 282.3c2.4 18 17.8 31.7 36 31.7h205c18.2 0 33.6-13.7 36-31.7L432 176H80z'/%3E%3C/svg%3E") 10 2, pointer;
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

/* Image Preview Lightbox */
.image-preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  padding: 40px;
}

.image-preview-img {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
  animation: modalPop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.image-preview-close {
  position: absolute;
  top: 20px;
  right: 30px;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: #fff;
  font-size: 32px;
  line-height: 1;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.image-preview-close:hover {
  background: rgba(255, 255, 255, 0.3);
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
  margin-top: 20px;
  border-top: 1px solid #f1f2f6;
  padding-top: 16px;
  width: 100%;
}

.workspace-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  gap: 10px;
  flex-wrap: wrap;
}

.workspace-header h2 {
  font-size: 1rem;
  color: #2d3436;
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
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
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
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
  cursor: zoom-in;
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
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
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

.card-price-tiers {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
}

.card-price-tiers .card-input {
  padding: 6px;
  font-size: 12px;
}

.gallery-workspace-empty {
  text-align: center;
  padding: 40px 20px;
  color: #b2bec3;
  font-style: italic;
}

/* Pricing Matrix Workspace Styling */
.pricing-matrix-workspace {
  margin-top: 16px;
  padding-top: 0;
}

.matrix-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.pricing-matrix-workspace h3 {
  font-size: 0.95rem;
  color: #2d3436;
  margin: 0;
  font-weight: 600;
}

.matrix-info-text {
  font-size: 12px;
  color: #636e72;
  margin: 0 0 12px 0;
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
  width: 70px;
  padding: 8px 4px;
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

.hidden-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #b03030;
  background: #fdecec;
  border-radius: 10px;
  vertical-align: middle;
}

/* MOQ + visibility side by side */
.moq-visibility-row {
  display: flex;
  align-items: flex-end;
  gap: 24px;
  flex-wrap: wrap;
}

.moq-visibility-row .moq-field {
  flex: 1;
  min-width: 220px;
  margin: 0;
}

.moq-visibility-row .visibility-row {
  flex: 1;
  min-width: 260px;
}

/* Visibility toggle */
.visibility-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.visibility-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.visibility-hint {
  font-size: 12px;
  color: #8b6f47;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 28px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: #cfd4da;
  border-radius: 28px;
  transition: background 0.25s ease;
}

.toggle-slider::before {
  content: "";
  position: absolute;
  height: 22px;
  width: 22px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: transform 0.25s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle-switch input:checked + .toggle-slider {
  background: #008080;
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(22px);
}
</style>
