<script setup>
import { ref, onMounted, computed } from 'vue';
import { api, API_URL } from '../services/api';

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
  description: '',
  price: 0,
  category: '',
  image_key: '',
  usage: '',
  use_for: '',
  varieties: '',
  sizes: '',
  colors: '',
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

const galleryImages = ref([]); // Array of { key, file, preview, attribute_type, attribute_value, is_new: boolean }
const galleryFileInput = ref(null);

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
  await Promise.all([loadProducts(), loadCategories()]);
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
    loginError.value = 'Incorrect password. Please try again.';
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
    name: '', description: '', price: 0, category: '', image_key: '',
    usage: '', use_for: '', varieties: '', sizes: '', colors: '',
    price_1: 0, price_2: 0, price_3: 0, price_4: 0, price_5: 0, stock: 0
  };
  selectedFile.value = null;
  imagePreview.value = null;
  galleryImages.value = [];
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

  window.scrollTo({ top: 0, behavior: 'smooth' });
  stockAdjustment.value = 0;
};

const deleteProduct = async (id) => {
  if (confirm('Are you sure?')) {
    try {
      await api.deleteProduct(id);
      loadProducts();
    } catch (error) {
      alert('Delete failed: ' + error.message);
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
    alert('Failed to add category');
  }
};

const deleteCategory = async (id) => {
  if (confirm('Delete this category?')) {
    try {
      await api.deleteCategory(id);
      loadCategories();
    } catch (error) {
      alert('Failed to delete');
    }
  }
};

const handleSubmit = async () => {
  try {
    uploading.value = true;

    // 1. Upload Main Image if changed
    if (selectedFile.value) {
      const uploadResult = await api.uploadImage(selectedFile.value);
      newProduct.value.image_key = uploadResult.key;
    }

    // 2. Upload Gallery Images if new
    const finalImages = [];
    for (const img of galleryImages.value) {
      if (img.is_new) {
        const uploadResult = await api.uploadImage(img.file);
        finalImages.push({
          image_key: uploadResult.key,
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

    if (isEditing.value) {
      newProduct.value.stock = Math.max(0, (newProduct.value.stock || 0) + stockAdjustment.value);
      await api.updateProduct(editingId.value, newProduct.value);
      alert('Updated!');
    } else {
      await api.addProduct(newProduct.value);
      alert('Added!');
    }
    resetForm();
    loadProducts();
  } catch (error) {
    alert('Error: ' + error.message);
  } finally {
    uploading.value = false;
  }
};

const logout = () => {
  localStorage.removeItem('admin_token');
  isAuthenticated.value = false;
};

const getImageUrl = (key) => {
  if (!key) return 'https://m.media-amazon.com/images/I/610a5LpNbTL.jpg';
  return `${API_URL}/images/${key}`;
};

const applyPriceFormula = () => {
  const p5 = parseFloat(newProduct.value.price_5);
  if (isNaN(p5) || p5 <= 0) {
    alert("Please set a valid Level 5 price first.");
    return;
  }

  const percentages = formulaInput.value.split(',').map(s => parseFloat(s.trim()));
  if (percentages.length < 4 || percentages.some(isNaN)) {
    alert("Please enter 4 valid percentages separated by commas (e.g. 200, 180, 160, 130)");
    return;
  }

  newProduct.value.price_1 = Number((p5 * percentages[0] / 100).toFixed(2));
  newProduct.value.price_2 = Number((p5 * percentages[1] / 100).toFixed(2));
  newProduct.value.price_3 = Number((p5 * percentages[2] / 100).toFixed(2));
  newProduct.value.price_4 = Number((p5 * percentages[3] / 100).toFixed(2));

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
</script>

<template>
  <div class="admin-container">
    <div v-if="!isAuthenticated" class="login-box">
      <h1>Admin Login</h1>
      <input v-model="password" type="password" placeholder="Password" @keyup.enter="handleLogin" />
      <button @click="handleLogin">Sign In</button>
      <p v-if="loginError" class="error">{{ loginError }}</p>
    </div>

    <div v-else class="admin-panel">
      <header>
        <div class="header-left">
          <h1>Admin Dashboard</h1>
          <p class="stats">{{ products.length }} items | {{ categories.length }} categories</p>
        </div>
        <div class="header-actions">
          <button class="cat-btn" @click="showCategoryManager = !showCategoryManager">
            <ion-icon name="list-outline"></ion-icon> Edit Categories
          </button>
          <button class="logout-btn" @click="logout">Logout</button>
        </div>
      </header>

      <!-- Category Manager Section (Togglable) -->
      <transition name="slide-fade">
        <section v-if="showCategoryManager" class="category-manager">
          <div class="cat-manager-content">
            <h3>Manage Categories</h3>
            <div class="cat-add-row">
              <input v-model="newCat.name" placeholder="Category Name (e.g. Beads)" />
              <input v-model="newCat.path" placeholder="Path (e.g. beads)" />
            </div>
            <div class="cat-add-row">
              <input v-model="newCat.default_usage" placeholder="Default Usage Placeholder" />
              <input v-model="newCat.default_use_for" placeholder="Default Use For Placeholder" />
              <button @click="handleAddCategory">Add</button>
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
          <div class="form-header">
            <h2 style="padding: 0; margin: 0;">{{ isEditing ? 'Edit Product' : 'Add New Product' }}</h2>
            <button v-if="isEditing" @click="resetForm" class="cancel-btn">
              <ion-icon name="close-circle-outline"></ion-icon> Cancel Edit
            </button>
          </div>

          <form @submit.prevent="handleSubmit">
            <div class="product-main-row">
              <div class="form-group name-field">
                <label>Product Name</label>
                <input v-model="newProduct.name" type="text" required placeholder="e.g. Premium Cotton Thread" />
              </div>
            </div>

            <div class="price-levels">
              <div class="price-header-row">
                <label>Prices (Level 1 is Displayed)</label>
                <button type="button" class="config-btn" @click="showFormulaPopup = true">
                  <ion-icon name="settings-outline"></ion-icon> Config
                </button>
              </div>
              <div class="price-grid">
                <div v-for="i in 5" :key="i" :class="['price-input-box', i === 1 ? 'active' : '']">
                  <span class="label">L{{ i }}</span>
                  <input v-model="newProduct['price_' + i]" type="number" step="0.01" placeholder="0.00" />
                </div>
              </div>
            </div>

            <div class="form-row">
              <div>
                <div class="product-image-uploader" @click="triggerFileUpload" title="Click to upload image">
                  <img v-if="newProduct.image_key || imagePreview"
                    :src="imagePreview || getImageUrl(newProduct.image_key)" alt="preview" />
                  <div v-else class="upload-placeholder">
                    <ion-icon name="camera-outline"></ion-icon>
                    <span>Add Image</span>
                  </div>
                  <input type="file" ref="fileInput" class="hidden-input" @change="handleFileUpload" accept="image/*" />
                </div>
                <!-- <div class="form-group">
                  <label>Image</label>
                  <input type="file" @change="handleFileUpload" accept="image/*" />
                </div> -->
              </div>
              <div>
                <div class="form-group">
                  <label>Category</label>
                  <select v-model="newProduct.category" required @change="onCategoryChange">
                    <option value="" disabled>Select a category</option>
                    <option v-for="cat in categories" :key="cat.id" :value="cat.path">
                      {{ cat.name }}
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Description</label>
                  <textarea v-model="newProduct.description" rows="8"
                    placeholder="Describe the quality, material, or source..."></textarea>
                </div>
              </div>
            </div>


            <div class="form-row">
              <div class="form-group">
                <label>Usage</label>
                <input v-model="newProduct.usage" placeholder="e.g. Hand knitting, Machine embroidery" />
              </div>
              <div class="form-group">
                <label>Use For</label>
                <input v-model="newProduct.use_for" placeholder="e.g. Clothing, Home decor" />
              </div>
            </div>

            <div class="form-group">
              <label>Varieties (Comma separated)</label>
              <input v-model="newProduct.varieties" placeholder="e.g. 2-ply, 4-ply, Mercerized" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Sizes (Comma separated)</label>
                <input v-model="newProduct.sizes" placeholder="e.g. 50g, 100m, Small" />
              </div>
              <div class="form-group">
                <label>Colors (Comma separated)</label>
                <input v-model="newProduct.colors" placeholder="e.g. Red, Sky Blue, Green" />
              </div>
              <div class="form-group" v-if="!isEditing">
                <label>Initial Stock</label>
                <input v-model.number="newProduct.stock" type="number" min="0" placeholder="0" />
              </div>
              <div class="form-group stock-form-group" v-else>
                <label>Update Stock (Current: {{ newProduct.stock || 0 }})</label>
                <div class="stock-control edit-stock-control">
                  <button type="button" @click="updateStockAdjustment(-2)" class="stock-btn minus">-2</button>
                  <button type="button" @click="updateStockAdjustment(-1)" class="stock-btn minus">-1</button>
                  
                  <input type="number" v-model.number="stockAdjustment" @input="validateStockAdjustment" class="stock-adjust-input" />
                  
                  <button type="button" @click="updateStockAdjustment(1)" class="stock-btn plus">+1</button>
                  <button type="button" @click="updateStockAdjustment(2)" class="stock-btn plus">+2</button>
                </div>
                <div class="stock-preview" :class="{ 'low': (newProduct.stock + stockAdjustment) <= 5 }">
                  Resulting Stock: <strong>{{ Math.max(0, (newProduct.stock || 0) + stockAdjustment) }}</strong>
                </div>
              </div>
            </div>

            <!-- Gallery Section -->
            <div class="gallery-section">
              <div class="gallery-header">
                <label>Product Gallery & Variations</label>
                <button type="button" class="add-gallery-btn" @click="triggerGalleryUpload">
                  <ion-icon name="add-circle-outline"></ion-icon> Add Images
                </button>
                <input type="file" ref="galleryFileInput" class="hidden-input" @change="handleGalleryUpload"
                  accept="image/*" multiple />
              </div>

              <div class="gallery-grid" v-if="galleryImages.length > 0">
                <div v-for="(img, index) in galleryImages" :key="index" class="gallery-item">
                  <div class="gallery-thumb">
                    <img :src="img.preview" />
                    <button type="button" class="remove-thumb" @click="removeGalleryImage(index)">&times;</button>
                  </div>
                  <div class="gallery-meta">
                    <select v-model="img.attribute_type">
                      <option value="gallery">General Gallery</option>
                      <option value="color">Color Variant</option>
                      <option value="size">Size Variant</option>
                      <option value="variety">Variety Variant</option>
                    </select>
                    <input v-if="img.attribute_type !== 'gallery'" v-model="img.attribute_value"
                      :placeholder="'Enter ' + img.attribute_type" />
                  </div>
                </div>
              </div>
              <p v-else class="gallery-empty">No gallery images added yet.</p>
            </div>

            <button type="submit" :disabled="uploading" :class="['submit-btn', isEditing ? 'update' : '']">
              {{ uploading ? 'Processing...' : (isEditing ? 'Update Product' : 'Add Product') }}
            </button>
          </form>

          <!-- Price Formula Modal -->
          <transition name="fade">
            <div v-if="showFormulaPopup" class="modal-overlay" @click.self="showFormulaPopup = false">
              <div class="modal-content">
                <div class="modal-header">
                  <h3>Price Formula</h3>
                  <button @click="showFormulaPopup = false" class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                  <p>Calculate L1-L4 based on a % of L5 price.</p>
                  <div class="formula-info">
                    <span class="info-tag">Current L5: ${{ newProduct.price_5 || '0.00' }}</span>
                  </div>
                  <div class="input-group">
                    <label>Percentages (L1, L2, L3, L4)</label>
                    <input v-model="formulaInput" placeholder="200, 180, 160, 130" @keyup.enter="applyPriceFormula" />
                  </div>
                  <p class="formula-hint">Example: "200, 180, 160, 130" means L1 is 200% of L5, L2 is 180% of L5, etc.
                  </p>
                </div>
                <div class="modal-footer">
                  <button @click="showFormulaPopup = false" class="btn-secondary">Cancel</button>
                  <button @click="applyPriceFormula" class="btn-primary">Apply Formula</button>
                </div>
              </div>
            </div>
          </transition>
        </section>

        <section class="list-section">
          <div class="list-header">
            <h2>Inventory</h2>
            <!-- Filter Tabs -->
            <div class="filter-tabs">
              <button :class="{ active: activeFilter === 'all' }" @click="activeFilter = 'all'">All</button>
              <button v-for="cat in categories" :key="cat.id" :class="{ active: activeFilter === cat.path }"
                @click="activeFilter = cat.path">
                {{ cat.name }}
              </button>
            </div>
          </div>

          <div class="inventory-scroll">
            <div v-for="product in filteredProducts" :key="product.id" class="product-item">
              <div class="item-img"><img :src="getImageUrl(product.image_key)"></div>
              <div class="item-info">
                <strong>{{ product.name }}</strong>
                <span class="p-meta">{{ product.category }} | ${{ product.price_1 || product.price }}</span>
                <div class="stock-control">
                  <span :class="['stock-count', product.stock <= 5 ? 'low' : '']">{{ product.stock || 0 }} in stock</span>
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
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Reset and Global component styles */
* {
  box-sizing: border-box;
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
</style>
