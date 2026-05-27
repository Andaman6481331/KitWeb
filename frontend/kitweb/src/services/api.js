// Service to communicate with Cloudflare Backend
// const API_URL = 'http://127.0.0.1:8787';
export const API_URL = 'https://hidden-water-ed9d.shop-backend-kitweb.workers.dev';
export const getImageUrl = (filename) => `${API_URL}/images/${filename}`;
export const getUtilsUrl = (filename) => `${API_URL}/utils/${filename}`;

export const getCategoryImageUrl = (category) => {
  if (!category) return '';
  const slug = category.toLowerCase().trim().replace(/\s+/g, '');
  return getUtilsUrl(`cat-${slug}-large.png`);
};
export const getDiyImageUrl = (filename, variant = 'thumb') => {
  if (!filename) return 'https://m.media-amazon.com/images/I/610a5LpNbTL.jpg';
  const keyStr = String(filename);
  if (keyStr.startsWith('http')) return keyStr;
  if (keyStr.includes('.')) return `${API_URL}/kit-image/${keyStr}`;
  return `${API_URL}/kit-image/${keyStr}-${variant}.webp`;
};

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const api = {
  getToken() {
    if (!isBrowser) return null;
    return localStorage.getItem('admin_token') || localStorage.getItem('kitweb_auth_token');
  },

  async adminLogin(password) {
    const response = await fetch(`${API_URL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await response.json();
    if (data.success) {
      localStorage.setItem('admin_token', data.token);
    }
    return data;
  },

  async signup(customerData) {
    const response = await fetch(`${API_URL}/customer/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerData)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Signup failed');
    return data;
  },

  async login(credentials) {
    const response = await fetch(`${API_URL}/customer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Login failed');
    return data;
  },

  async getProducts(category = null) {
    let url = `${API_URL}/products`;
    if (category) url += `?category=${encodeURIComponent(category)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch products');
    return await response.json();
  },

  async addProduct(productData) {
    const response = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.getToken()
      },
      body: JSON.stringify(productData)
    });
    if (!response.ok) throw new Error(`Add product failed: ${response.status} ${response.statusText}`);
    return await response.json();
  },

  async updateProduct(id, productData) {
    const response = await fetch(`${API_URL}/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.getToken()
      },
      body: JSON.stringify(productData)
    });
    if (!response.ok) throw new Error(`Update product failed: ${response.status} ${response.statusText}`);
    return await response.json();
  },

  async deleteProduct(id) {
    const response = await fetch(`${API_URL}/products/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': this.getToken()
      }
    });
    if (!response.ok) throw new Error(`Delete product failed: ${response.status} ${response.statusText}`);
    return await response.json();
  },

  async getImages() {
    const response = await fetch(`${API_URL}/images`, {
      headers: { 'Authorization': this.getToken() }
    });
    if (!response.ok) throw new Error('Failed to fetch images');
    return await response.json();
  },

  async uploadImage(files) {
    const formData = new FormData();
    if (Array.isArray(files)) {
      files.forEach(file => formData.append('file', file));
    } else {
      formData.append('file', files);
    }
    
    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: { 'Authorization': this.getToken() },
      body: formData
    });
    if (!response.ok) throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    return await response.json();
  },

  async getCategories() {
    const response = await fetch(`${API_URL}/categories`);
    return await response.json();
  },

  async addCategory(categoryData) {
    const response = await fetch(`${API_URL}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.getToken()
      },
      body: JSON.stringify(categoryData)
    });
    return await response.json();
  },

  async deleteCategory(id) {
    const response = await fetch(`${API_URL}/categories/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': this.getToken()
      }
    });
    return await response.json();
  },

  async submitOrder(message, orderData = null) {
    const response = await fetch(`${API_URL}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, orderData })
    });
    return await response.json();
  },

  async getOrders(customerId = null) {
    let url = `${API_URL}/orders`;
    if (customerId) url += `?customer_id=${encodeURIComponent(customerId)}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': this.getToken()
      }
    });
    if (!response.ok) throw new Error('Failed to fetch orders');
    return await response.json();
  },

  async adjustStock(productId, change, reason = 'MANUAL_ADJUSTMENT') {
    const response = await fetch(`${API_URL}/products/${productId}/stock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.getToken()
      },
      body: JSON.stringify({ change, reason, admin_id: 'admin' }) // admin_id can be dynamic if you have multiple admins
    });
    return await response.json();
  },

  async translateText(text, targetLang, sourceLang = 'en') {
    const response = await fetch(`${API_URL}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang, sourceLang })
    });
    if (!response.ok) throw new Error('Translation failed');
    const data = await response.json();
    return data.translated_text;
  },

  async getDiyProducts() {
    const response = await fetch(`${API_URL}/diy/products`);
    if (!response.ok) throw new Error('Failed to fetch DIY products');
    return await response.json();
  },

  async addDiyProduct(productData) {
    const response = await fetch(`${API_URL}/diy/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.getToken()
      },
      body: JSON.stringify(productData)
    });
    if (!response.ok) throw new Error(`Add DIY product failed: ${response.status}`);
    return await response.json();
  },

  async updateDiyProduct(id, productData) {
    const response = await fetch(`${API_URL}/diy/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.getToken()
      },
      body: JSON.stringify(productData)
    });
    if (!response.ok) throw new Error(`Update DIY product failed: ${response.status}`);
    return await response.json();
  },

  async deleteDiyProduct(id) {
    const response = await fetch(`${API_URL}/diy/products/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': this.getToken()
      }
    });
    if (!response.ok) throw new Error(`Delete DIY product failed: ${response.status}`);
    return await response.json();
  },

  async uploadDiyImage(files) {
    const formData = new FormData();
    if (Array.isArray(files)) {
      files.forEach(file => formData.append('file', file));
    } else {
      formData.append('file', files);
    }
    
    const response = await fetch(`${API_URL}/diy/upload`, {
      method: 'POST',
      headers: { 'Authorization': this.getToken() },
      body: formData
    });
    if (!response.ok) throw new Error(`DIY Upload failed: ${response.status}`);
    return await response.json();
  },

  async getNextSku(category) {
    const response = await fetch(`${API_URL}/products/next-sku?category=${encodeURIComponent(category)}`, {
      headers: { 'Authorization': this.getToken() }
    });
    if (!response.ok) throw new Error('Failed to fetch next SKU');
    return await response.json();
  },

  async getNextDiySku() {
    const response = await fetch(`${API_URL}/diy/products/next-sku`, {
      headers: { 'Authorization': this.getToken() }
    });
    if (!response.ok) throw new Error('Failed to fetch next DIY SKU');
    return await response.json();
  }
};
