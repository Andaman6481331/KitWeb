// Service to communicate with Cloudflare Backend
// const API_URL = 'http://127.0.0.1:8787';
export const API_URL = 'https://hidden-water-ed9d.shop-backend-kitweb.workers.dev';
export const getImageUrl = (filename) => `${API_URL}/images/${filename}`;
// Pass a version (e.g. getUtilsUrl('x.webp', 2)) to bust browser/CDN cache after
// re-uploading a file under the same name. The worker serves utils as immutable,
// so a new ?v= value is the only way to force a fresh fetch. Bump it on re-upload.
export const getUtilsUrl = (filename, version) =>
  `${API_URL}/utils/${filename}${version != null ? `?v=${version}` : ''}`;

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

const parseApiError = async (response, fallback) => {
  const text = await response.text();
  if (!text) return fallback;
  try {
    const err = JSON.parse(text);
    if (typeof err === 'string') return err;
    if (err?.error) return err.error;
  } catch {
    return text;
  }
  return fallback;
};

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

  // POS in-store cash sale. payload: { total_amount, items: [{ product_type, input_price }] }
  async submitCashSale(payload) {
    const response = await fetch(`${API_URL}/sellcash/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': this.getToken() },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(await parseApiError(response, 'Sale failed'));
    return await response.json();
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

  // Update the logged-in customer's saved profile (address / LINE name / phone / owner name).
  async updateCustomer(profile) {
    const response = await fetch(`${API_URL}/customer/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.getToken()
      },
      body: JSON.stringify(profile)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to update profile');
    return data;
  },

  async getProducts(category = null, { includeHidden = false } = {}) {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (includeHidden) params.set('include_hidden', '1');
    const qs = params.toString();
    const url = qs ? `${API_URL}/products?${qs}` : `${API_URL}/products`;
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
    if (!response.ok) {
      throw new Error(await parseApiError(response, `Add product failed: ${response.status} ${response.statusText}`));
    }
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
    if (!response.ok) {
      throw new Error(await parseApiError(response, `Update product failed: ${response.status} ${response.statusText}`));
    }
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

  async submitOrderWithSlip(formData) {
    // FormData with slipImage file — browser sets multipart boundary automatically
    const response = await fetch(`${API_URL}/order/submit`, {
      method: 'POST',
      body: formData
    });
    return await response.json();
  },

  async exchangeLineCode(code, redirectUri) {
    const response = await fetch(`${API_URL}/line/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri })
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

  // Admin: update an order's status + tracking number. The backend also pushes a
  // status update to the customer on LINE if they connected at checkout.
  async updateOrderStatus({ orderId, status, trackingNumber }) {
    const response = await fetch(`${API_URL}/orders/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.getToken()
      },
      body: JSON.stringify({ orderId, status, trackingNumber })
    });
    if (!response.ok) {
      throw new Error(await parseApiError(response, 'Failed to update order'));
    }
    return await response.json();
  },

  // Admin: full order edit — customer/fulfilment fields + line items.
  // The backend recomputes the total server-side from DB prices.
  async updateOrder(payload) {
    const response = await fetch(`${API_URL}/orders/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.getToken()
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new Error(await parseApiError(response, 'Failed to update order'));
    }
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
  },

  async getInstitutionalCatalog() {
    const response = await fetch(`${API_URL}/institutional/catalog`);
    if (!response.ok) throw new Error('Failed to fetch institutional catalog');
    return await response.json();
  },

  async submitRfq(rfqPayload) {
    const response = await fetch(`${API_URL}/rfq/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rfqPayload)
    });
    if (!response.ok) throw new Error('Failed to submit RFQ');
    return await response.json();
  }
};
