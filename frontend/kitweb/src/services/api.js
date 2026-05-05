// Service to communicate with Cloudflare Backend
const API_URL = 'http://127.0.0.1:8787';

export const api = {
  getToken() {
    return localStorage.getItem('admin_token');
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
    return await response.json();
  },

  async deleteProduct(id) {
    const response = await fetch(`${API_URL}/products/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': this.getToken()
      }
    });
    return await response.json();
  },

  async getImages() {
    const response = await fetch(`${API_URL}/images`, {
      headers: { 'Authorization': this.getToken() }
    });
    if (!response.ok) throw new Error('Failed to fetch images');
    return await response.json();
  },

  async uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: { 'Authorization': this.getToken() },
      body: formData
    });
    return await response.json();
  }
};
