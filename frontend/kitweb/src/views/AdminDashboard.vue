<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../services/api';

const products = ref([]);
const isAuthenticated = ref(!!api.getToken());
const password = ref('');
const loginError = ref(false);
const isEditing = ref(false);
const editingId = ref(null);

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
  price_5: 0
});
const selectedFile = ref(null);
const uploading = ref(false);

onMounted(async () => {
  if (isAuthenticated.value) {
    loadProducts();
  }
});

const loadProducts = async () => {
  try {
    products.value = await api.getProducts();
  } catch (error) {
    console.error('Failed to load products', error);
  }
};

const handleLogin = async () => {
  const result = await api.adminLogin(password.value);
  if (result.success) {
    isAuthenticated.value = true;
    loginError.value = false;
    loadProducts();
  } else {
    loginError.value = 'Incorrect password. Please try again.';
  }
};

const handleFileUpload = (event) => {
  selectedFile.value = event.target.files[0];
};

const resetForm = () => {
  newProduct.value = {
    name: '', description: '', price: 0, category: '', image_key: '',
    usage: '', use_for: '', varieties: '', sizes: '', colors: '',
    price_1: 0, price_2: 0, price_3: 0, price_4: 0, price_5: 0
  };
  selectedFile.value = null;
  isEditing.value = false;
  editingId.value = null;
};

const editProduct = (product) => {
  isEditing.value = true;
  editingId.value = product.id;
  newProduct.value = { ...product };
  // Scroll to form
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const deleteProduct = async (id) => {
  if (confirm('Are you sure you want to delete this product?')) {
    try {
      await api.deleteProduct(id);
      loadProducts();
    } catch (error) {
      alert('Delete failed: ' + error.message);
    }
  }
};

const handleSubmit = async () => {
  try {
    uploading.value = true;
    
    // 1. Upload image if selected
    if (selectedFile.value) {
      const uploadResult = await api.uploadImage(selectedFile.value);
      newProduct.value.image_key = uploadResult.key;
    }
    
    // 2. Save or Update
    if (isEditing.value) {
      await api.updateProduct(editingId.value, newProduct.value);
      alert('Product updated successfully!');
    } else {
      await api.addProduct(newProduct.value);
      alert('Product added successfully!');
    }
    
    // 3. Reset and refresh
    resetForm();
    loadProducts();
  } catch (error) {
    alert('Error saving product: ' + error.message);
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
  if (key.startsWith('http')) return key;
  return `http://127.0.0.1:8787/images/${key}`;
};
</script>

<template>
  <div class="admin-container">
    <!-- Login Form -->
    <div v-if="!isAuthenticated" class="login-box">
      <h1>Admin Login</h1>
      <p>Enter your private password to manage KitWeb</p>
      <input 
        v-model="password" 
        type="password" 
        placeholder="Private Password" 
        @keyup.enter="handleLogin"
      />
      <button @click="handleLogin">Sign In</button>
      <p v-if="loginError" class="error">{{ loginError }}</p>
    </div>

    <!-- Admin Panel -->
    <div v-else class="admin-panel">
      <header>
        <div class="header-left">
          <h1>Admin Dashboard</h1>
          <p class="stats">Managing {{ products.length }} products</p>
        </div>
        <button class="logout-btn" @click="logout">Logout</button>
      </header>

      <div class="dashboard-grid">
        <!-- Add/Edit Product Form (Larger Section) -->
        <section class="form-section">
          <div class="form-header">
            <h2>{{ isEditing ? 'Edit Product' : 'Add New Product' }}</h2>
            <button v-if="isEditing" @click="resetForm" class="cancel-btn">Cancel Edit</button>
          </div>
          
          <form @submit.prevent="handleSubmit">
            <div class="form-group">
              <label>Product Name</label>
              <input v-model="newProduct.name" type="text" required placeholder="Enter product title..." />
            </div>

            <div class="form-group">
              <label>Description</label>
              <textarea v-model="newProduct.description" rows="3" placeholder="Describe your product..."></textarea>
            </div>

            <!-- 5 Price Levels -->
            <div class="price-levels">
              <label>Pricing Strategy (5 Levels)</label>
              <div class="price-grid">
                <div class="price-input-box">
                  <span class="label">Lvl 1</span>
                  <input v-model="newProduct.price_1" type="number" step="0.01" />
                </div>
                <div class="price-input-box">
                  <span class="label">Lvl 2</span>
                  <input v-model="newProduct.price_2" type="number" step="0.01" />
                </div>
                <div class="price-input-box active">
                  <span class="label">Lvl 3 (Display)</span>
                  <input v-model="newProduct.price_3" type="number" step="0.01" />
                </div>
                <div class="price-input-box">
                  <span class="label">Lvl 4</span>
                  <input v-model="newProduct.price_4" type="number" step="0.01" />
                </div>
                <div class="price-input-box">
                  <span class="label">Lvl 5</span>
                  <input v-model="newProduct.price_5" type="number" step="0.01" />
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Category (Path)</label>
                <input v-model="newProduct.category" type="text" placeholder="e.g. beads" />
              </div>
              <div class="form-group">
                <label>Product Image</label>
                <div class="file-input-wrapper">
                  <input type="file" @change="handleFileUpload" accept="image/*" />
                  <span v-if="newProduct.image_key" class="has-image">Current: {{ newProduct.image_key.substring(0,10) }}...</span>
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Usage</label>
                <input v-model="newProduct.usage" type="text" placeholder="How it's used" />
              </div>
              <div class="form-group">
                <label>Use For</label>
                <input v-model="newProduct.use_for" type="text" placeholder="Target audience" />
              </div>
            </div>

            <div class="form-group">
              <label>Varieties (Comma separated)</label>
              <input v-model="newProduct.varieties" type="text" placeholder="Wool, Silk, Cotton..." />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Sizes</label>
                <input v-model="newProduct.sizes" type="text" placeholder="Small, Large..." />
              </div>
              <div class="form-group">
                <label>Colors</label>
                <input v-model="newProduct.colors" type="text" placeholder="Red, Blue..." />
              </div>
            </div>

            <button type="submit" :disabled="uploading" :class="['submit-btn', isEditing ? 'update' : '']">
              <ion-icon :name="isEditing ? 'sync-outline' : 'add-circle-outline'"></ion-icon>
              {{ uploading ? 'Processing...' : (isEditing ? 'Update Product' : 'Add Product') }}
            </button>
          </form>
        </section>

        <!-- Current Inventory (Shrunk Section) -->
        <section class="list-section">
          <h2>Inventory</h2>
          <div class="inventory-scroll">
            <div v-for="product in products" :key="product.id" class="product-item">
              <div class="item-img">
                <img :src="getImageUrl(product.image_key)" alt="p">
              </div>
              <div class="item-info">
                <strong>{{ product.name }}</strong>
                <span class="p-meta">{{ product.category }} | ${{ product.price_3 || product.price }}</span>
              </div>
              <div class="item-actions">
                <button class="action-btn edit" @click="editProduct(product)" title="Edit">
                  <ion-icon name="create-outline"></ion-icon>
                </button>
                <button class="action-btn del" @click="deleteProduct(product.id)" title="Delete">
                  <ion-icon name="trash-outline"></ion-icon>
                </button>
              </div>
            </div>
            <div v-if="products.length === 0" class="empty-state">
              No products found.
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-container {
  min-height: 100vh;
  background: #f4f7f6;
  padding: 30px;
  display: flex;
  justify-content: center;
  font-family: 'Inter', sans-serif;
  color: #2d3436;
}

.login-box {
  background: white;
  padding: 40px;
  border-radius: 24px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.1);
  text-align: center;
  max-width: 400px;
  width: 100%;
  align-self: center;
}

.login-box h1 { color: #8b6f47; margin-bottom: 10px; }
.login-box input {
  width: 100%;
  padding: 14px;
  margin: 20px 0;
  border: 2px solid #edf2f7;
  border-radius: 12px;
  outline: none;
  transition: border 0.3s;
}
.login-box input:focus { border-color: #8b6f47; }
.login-box button {
  width: 100%;
  padding: 14px;
  background: #8b6f47;
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 700;
  transition: transform 0.2s;
}
.login-box button:active { transform: scale(0.98); }

.admin-panel { width: 100%; max-width: 1400px; }
header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
.header-left h1 { margin: 0; color: #2d3436; font-size: 32px; }
.stats { margin: 5px 0 0; color: #636e72; font-weight: 500; }

.logout-btn { background: #ff7675; color: white; border: none; padding: 10px 20px; border-radius: 10px; cursor: pointer; font-weight: 600; }

.dashboard-grid { display: grid; grid-template-columns: 1.8fr 1fr; gap: 30px; align-items: start; }

.form-section, .list-section { 
  background: white; 
  padding: 30px; 
  border-radius: 24px; 
  box-shadow: 0 4px 20px rgba(0,0,0,0.04); 
}

.form-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
.cancel-btn { background: #dfe6e9; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; }

.form-group { margin-bottom: 20px; }
label { display: block; margin-bottom: 8px; font-weight: 700; font-size: 14px; color: #2d3436; }

input, textarea { 
  width: 100%; 
  padding: 12px 15px; 
  border: 1.5px solid #edf2f7; 
  border-radius: 12px; 
  background: #f8fafc;
  transition: all 0.3s;
}
input:focus, textarea:focus { 
  background: white; 
  border-color: #8b6f47; 
  outline: none; 
  box-shadow: 0 0 0 4px rgba(139, 111, 71, 0.1);
}

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

/* Price Grid */
.price-levels { margin-bottom: 25px; background: #fdf2e9; padding: 20px; border-radius: 16px; }
.price-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
.price-input-box { display: flex; flex-direction: column; gap: 5px; }
.price-input-box .label { font-size: 11px; font-weight: 700; color: #a18e74; text-transform: uppercase; }
.price-input-box input { padding: 8px; font-size: 14px; text-align: center; }
.price-input-box.active input { border-color: #8b6f47; background: white; font-weight: 700; }

.submit-btn { 
  width: 100%; 
  background: #00b894; 
  color: white; 
  border: none; 
  padding: 16px; 
  border-radius: 14px; 
  cursor: pointer; 
  font-weight: 800; 
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.3s;
}
.submit-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(0, 184, 148, 0.2); }
.submit-btn.update { background: #0984e3; }

/* Inventory List */
.inventory-scroll { max-height: 700px; overflow-y: auto; padding-right: 10px; }
.product-item { 
  display: flex; 
  align-items: center; 
  gap: 15px; 
  padding: 15px; 
  border-bottom: 1px solid #f1f2f6; 
  transition: background 0.2s;
}
.product-item:hover { background: #f8f9fa; }

.item-img { width: 50px; height: 50px; border-radius: 8px; overflow: hidden; flex-shrink: 0; }
.item-img img { width: 100%; height: 100%; object-fit: cover; }

.item-info { flex-grow: 1; min-width: 0; }
.item-info strong { display: block; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.p-meta { font-size: 12px; color: #636e72; }

.item-actions { display: flex; gap: 8px; }
.action-btn { 
  width: 32px; 
  height: 32px; 
  border-radius: 8px; 
  border: none; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  cursor: pointer;
  transition: all 0.2s;
}
.action-btn.edit { background: #e3f2fd; color: #1976d2; }
.action-btn.del { background: #ffebee; color: #d32f2f; }
.action-btn:hover { transform: scale(1.1); }

.empty-state { text-align: center; padding: 40px; color: #b2bec3; font-style: italic; }

@media (max-width: 1024px) {
  .dashboard-grid { grid-template-columns: 1fr; }
}
</style>
