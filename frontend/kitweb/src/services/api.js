// Service to communicate with Cloudflare Backend.
// Always the deployed Worker unless VITE_API_URL says otherwise: set it to
// http://127.0.0.1:8787 (with `wrangler dev` running) to try admin changes against a
// local database instead of production.
export const API_URL = import.meta.env?.VITE_API_URL || 'https://hidden-water-ed9d.shop-backend-kitweb.workers.dev';
export const getImageUrl = (filename) => `${API_URL}/images/${filename}`;
// Pass a version (e.g. getUtilsUrl('x.webp', 2)) to bust browser/CDN cache after
// re-uploading a file under the same name. The worker serves utils as immutable,
// so a new ?v= value is the only way to force a fresh fetch. Bump it on re-upload.
export const getUtilsUrl = (filename, version) =>
  `${API_URL}/utils/${filename}${version != null ? `?v=${version}` : ''}`;

// Project covers come from two places: rows seeded with a full URL, and rows whose
// cover was uploaded through the admin panel (a bare IMAGES key). Handle both.
export const getProjectImageUrl = (key) => {
  if (!key) return '';
  const str = String(key);
  return str.startsWith('http') ? str : getImageUrl(str);
};

// Gallery photos follow the same rule as project covers: a seeded full URL, or a
// bare key uploaded through the admin panel.
export const getGalleryImageUrl = getProjectImageUrl;

// Event media lives in the web-utils bucket (that is where the workshop photos and
// clips were uploaded), so a bare key resolves under /utils/ rather than /images/.
export const getEventMediaUrl = (key) => {
  if (!key) return '';
  const str = String(key);
  return str.startsWith('http') ? str : getUtilsUrl(str);
};

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

// Static prerendering renders every locale of every product page in one process,
// so the same handful of read-only endpoints would be fetched hundreds of times.
// Memoise them for the life of the build. Never in the browser: there staleness
// is a bug, and the stores already own their own caching.
const ssrGetCache = isBrowser ? null : new Map();

// ── Catalogue version ─────────────────────────────────────────────
// The Worker lets the browser keep the public product / project / gallery reads for an
// hour, but only under a URL that carries the catalogue version (?v=7). Every admin
// write bumps that version, so the next read asks for a URL the browser has never
// seen and gets fresh data. The lookup is tiny and never cached.
//
// It is remembered for 30 s so a page that reads several lists asks once, and
// forgotten after any catalogue write so the admin's own change shows at once.
// Without a version (old Worker, migration not applied, offline) reads go out plain
// and keep the Worker's short 30 s window. Never used while prerendering.
const VERSION_FRESH_MS = 30 * 1000;
let versionLookup = null; // { at, promise }

const forgetCatalogVersion = () => { versionLookup = null; };

const catalogVersion = () => {
  if (!isBrowser) return Promise.resolve(null);
  if (versionLookup && Date.now() - versionLookup.at < VERSION_FRESH_MS) return versionLookup.promise;

  const lookup = { at: Date.now(), promise: null };
  lookup.promise = (async () => {
    try {
      const response = await fetch(`${API_URL}/catalog-version`, { cache: 'no-store' });
      if (!response.ok) return null;
      const { version } = await response.json();
      return Number.isInteger(version) ? version : null;
    } catch {
      return null;
    }
  })().then((version) => {
    // A failed lookup is not remembered: the next read tries again.
    if (version === null && versionLookup === lookup) versionLookup = null;
    return version;
  });
  versionLookup = lookup;
  return lookup.promise;
};

const withCatalogVersion = async (url) => {
  const version = await catalogVersion();
  if (version === null) return url;
  return `${url}${url.includes('?') ? '&' : '?'}v=${version}`;
};

// Every write that changes what the storefront shows (products, projects, gallery)
// goes through here. Forgotten once the Worker has answered, success or not, because
// a failed write may still have changed something.
const catalogWrite = async (url, init) => {
  try {
    return await fetch(url, init);
  } finally {
    forgetCatalogVersion();
  }
};

// `auth: true` is for the admin-only reads (include_hidden / include_unpublished):
// the Worker answers those 401 unless the admin session token is sent.
// `versioned: true` is for the public reads the Worker caches (see above); never
// combine it with `auth`, since admin reads must always show the latest data.
const getJson = (url, errorMessage, { auth = false, versioned = false } = {}) => {
  const cached = ssrGetCache?.get(url);
  if (cached) return cached;

  const request = (async () => {
    const token = auth ? api.getToken() : null;
    const target = versioned ? await withCatalogVersion(url) : url;
    const response = await fetch(target, token ? { headers: { 'Authorization': token } } : undefined);
    if (response.status === 401) throw sessionExpiredError();
    if (!response.ok) {
      // The status lets a caller tell "the Worker does not have this route" (404) from a hiccup.
      const err = new Error(errorMessage);
      err.status = response.status;
      throw err;
    }
    return await response.json();
  })();

  // Drop failures so one flaky request during a build doesn't poison every
  // later render of the same URL.
  ssrGetCache?.set(url, request);
  request.catch(() => ssrGetCache?.delete(url));

  return request;
};

// An admin session the Worker no longer recognises: it expired (12 h), was ended
// elsewhere, or was issued by the old password-as-token login. The dead token is
// dropped so the page can fall back to its sign-in form instead of failing on
// every request, and the error carries `status` so callers can tell.
export const sessionExpiredError = () => {
  if (isBrowser) localStorage.removeItem('admin_token');
  const err = new Error('Session expired');
  err.status = 401;
  return err;
};

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

  // The admin session alone. getToken() falls back to a customer login, which is
  // right for the order pages but must never count as "signed in to the admin".
  getAdminToken() {
    if (!isBrowser) return null;
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

  // Ends the admin session: the Worker forgets the token, then the browser does.
  // The local copy is dropped even if the call fails, so the UI never stays "in".
  async adminLogout() {
    const token = isBrowser ? localStorage.getItem('admin_token') : null;
    if (isBrowser) localStorage.removeItem('admin_token');
    if (!token) return;
    try {
      await fetch(`${API_URL}/admin/logout`, {
        method: 'POST',
        headers: { 'Authorization': token }
      });
    } catch {
      // Offline or Worker down: the session simply expires on its own.
    }
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

  // ── Projects (editorial content) ──────────────────────────────
  // opts: { featured, productId, limit, includeUnpublished }
  async getProjects({ featured = false, productId = null, limit = null, includeUnpublished = false } = {}) {
    const params = new URLSearchParams();
    if (featured) params.set('featured', '1');
    if (productId) params.set('product_id', String(productId));
    if (limit) params.set('limit', String(limit));
    if (includeUnpublished) params.set('include_unpublished', '1');
    const qs = params.toString();
    return getJson(qs ? `${API_URL}/projects?${qs}` : `${API_URL}/projects`, 'Failed to fetch projects',
      { auth: includeUnpublished, versioned: !includeUnpublished });
  },

  async getProject(slug) {
    return getJson(`${API_URL}/projects/${encodeURIComponent(slug)}`, 'Failed to fetch project',
      { versioned: true });
  },

  // Create when payload has no id, update when it does.
  async saveProject(payload) {
    const response = await catalogWrite(`${API_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': this.getToken() },
      body: JSON.stringify(payload)
    });
    if (response.status === 401) throw sessionExpiredError();
    if (!response.ok) throw new Error(await parseApiError(response, 'Failed to save project'));
    return await response.json();
  },

  async deleteProject(id) {
    const response = await catalogWrite(`${API_URL}/projects/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': this.getToken() },
      body: JSON.stringify({ id })
    });
    if (response.status === 401) throw sessionExpiredError();
    if (!response.ok) throw new Error(await parseApiError(response, 'Failed to delete project'));
    return await response.json();
  },

  // ── Business Sets (fixed wholesale bundles) ───────────────────
  async getBusinessSets({ includeUnpublished = false } = {}) {
    const qs = includeUnpublished ? '?include_unpublished=1' : '';
    return getJson(`${API_URL}/business-sets${qs}`, 'Failed to fetch business sets', { auth: includeUnpublished });
  },

  async getBusinessSet(slug) {
    return getJson(`${API_URL}/business-sets/${encodeURIComponent(slug)}`, 'Failed to fetch business set');
  },

  // Create when payload has no id, update when it does.
  async saveBusinessSet(payload) {
    const response = await fetch(`${API_URL}/business-sets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': this.getToken() },
      body: JSON.stringify(payload)
    });
    if (response.status === 401) throw sessionExpiredError();
    if (!response.ok) throw new Error(await parseApiError(response, 'Failed to save business set'));
    return await response.json();
  },

  async deleteBusinessSet(id) {
    const response = await fetch(`${API_URL}/business-sets/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': this.getToken() },
      body: JSON.stringify({ id })
    });
    if (response.status === 401) throw sessionExpiredError();
    if (!response.ok) throw new Error(await parseApiError(response, 'Failed to delete business set'));
    return await response.json();
  },

  // ── Color of the Month ────────────────────────────────────────
  // active: true -> just the current color; false -> the full list for admin.
  async getSpotlights({ active = false } = {}) {
    return getJson(active ? `${API_URL}/spotlights?active=1` : `${API_URL}/spotlights`, 'Failed to fetch spotlights');
  },

  // Create when payload has no id, update when it does.
  async saveSpotlight(payload) {
    const response = await fetch(`${API_URL}/spotlights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': this.getToken() },
      body: JSON.stringify(payload)
    });
    if (response.status === 401) throw sessionExpiredError();
    if (!response.ok) throw new Error(await parseApiError(response, 'Failed to save color'));
    return await response.json();
  },

  async deleteSpotlight(id) {
    const response = await fetch(`${API_URL}/spotlights/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': this.getToken() },
      body: JSON.stringify({ id })
    });
    if (response.status === 401) throw sessionExpiredError();
    if (!response.ok) throw new Error(await parseApiError(response, 'Failed to delete color'));
    return await response.json();
  },

  // ── Creator gallery ───────────────────────────────────────────
  // opts: { productId, projectId, limit, includeHidden }
  async getGallery({ productId = null, projectId = null, limit = null, includeHidden = false } = {}) {
    const params = new URLSearchParams();
    if (productId) params.set('product_id', String(productId));
    if (projectId) params.set('project_id', String(projectId));
    if (limit) params.set('limit', String(limit));
    if (includeHidden) params.set('include_hidden', '1');
    const qs = params.toString();
    return getJson(qs ? `${API_URL}/gallery?${qs}` : `${API_URL}/gallery`, 'Failed to fetch gallery',
      { auth: includeHidden, versioned: !includeHidden });
  },

  // Create when payload has no id, update when it does.
  async saveGalleryItem(payload) {
    const response = await catalogWrite(`${API_URL}/gallery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': this.getToken() },
      body: JSON.stringify(payload)
    });
    if (response.status === 401) throw sessionExpiredError();
    if (!response.ok) throw new Error(await parseApiError(response, 'Failed to save photo'));
    return await response.json();
  },

  async deleteGalleryItem(id) {
    const response = await catalogWrite(`${API_URL}/gallery/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': this.getToken() },
      body: JSON.stringify({ id })
    });
    if (response.status === 401) throw sessionExpiredError();
    if (!response.ok) throw new Error(await parseApiError(response, 'Failed to delete photo'));
    return await response.json();
  },

  // ── Workshops & market appearances ────────────────────────────
  async getEvents({ includeHidden = false } = {}) {
    return getJson(
      includeHidden ? `${API_URL}/kitcraft?include_hidden=1` : `${API_URL}/kitcraft`,
      'Failed to fetch events',
      { auth: includeHidden }
    );
  },

  // Create when payload has no id, update when it does.
  async saveEvent(payload) {
    const response = await fetch(`${API_URL}/kitcraft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': this.getToken() },
      body: JSON.stringify(payload)
    });
    if (response.status === 401) throw sessionExpiredError();
    if (!response.ok) throw new Error(await parseApiError(response, 'Failed to save event'));
    return await response.json();
  },

  async deleteEvent(id) {
    const response = await fetch(`${API_URL}/kitcraft/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': this.getToken() },
      body: JSON.stringify({ id })
    });
    if (response.status === 401) throw sessionExpiredError();
    if (!response.ok) throw new Error(await parseApiError(response, 'Failed to delete event'));
    return await response.json();
  },

  async getProducts(category = null, { includeHidden = false } = {}) {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (includeHidden) params.set('include_hidden', '1');
    const qs = params.toString();
    return getJson(qs ? `${API_URL}/products?${qs}` : `${API_URL}/products`, 'Failed to fetch products',
      { auth: includeHidden, versioned: !includeHidden });
  },

  async addProduct(productData) {
    const response = await catalogWrite(`${API_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.getToken()
      },
      body: JSON.stringify(productData)
    });
    if (response.status === 401) throw sessionExpiredError();
    if (!response.ok) {
      throw new Error(await parseApiError(response, `Add product failed: ${response.status} ${response.statusText}`));
    }
    return await response.json();
  },

  async updateProduct(id, productData) {
    const response = await catalogWrite(`${API_URL}/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.getToken()
      },
      body: JSON.stringify(productData)
    });
    if (response.status === 401) throw sessionExpiredError();
    if (!response.ok) {
      throw new Error(await parseApiError(response, `Update product failed: ${response.status} ${response.statusText}`));
    }
    return await response.json();
  },

  async deleteProduct(id) {
    const response = await catalogWrite(`${API_URL}/products/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': this.getToken()
      }
    });
    if (response.status === 401) throw sessionExpiredError();
    if (!response.ok) throw new Error(`Delete product failed: ${response.status} ${response.statusText}`);
    return await response.json();
  },

  // The sizes, colors and stock behind the admin product editor (admin only).
  async getProductInventory(id) {
    return getJson(`${API_URL}/products/${id}/inventory`, 'Failed to load sizes and colors', { auth: true });
  },

  // ── Admin inventory bulk actions ──────────────────────────────────
  // Narrow, additive Worker routes: they flip a flag or add a category link and
  // never remove anything. Prefer them over updateProduct() for bulk changes, since
  // PUT /products/:id rewrites the whole row.
  async postProductAction(path, body, errorMessage) {
    const response = await catalogWrite(`${API_URL}/products/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.getToken()
      },
      body: JSON.stringify(body)
    });
    if (response.status === 401) throw sessionExpiredError();
    if (!response.ok) throw new Error(await parseApiError(response, errorMessage));
    return await response.json();
  },

  setProductsVisibility(ids, isVisible) {
    return this.postProductAction('visibility', { ids, is_visible: isVisible }, 'Failed to update visibility');
  },

  addProductsToCategory(ids, categoryPath) {
    return this.postProductAction('categories', { ids, category_path: categoryPath }, 'Failed to add to category');
  },

  archiveProducts(ids) {
    return this.postProductAction('archive', { ids }, 'Failed to archive');
  },

  // items: [{ id, is_visible }] — the visibility each product had before it was archived.
  restoreProducts(items) {
    return this.postProductAction('restore', { items }, 'Failed to restore');
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
    if (response.status === 401) throw sessionExpiredError();
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
    if (response.status === 401) throw sessionExpiredError();
    return await response.json();
  },

  async deleteCategory(id) {
    const response = await fetch(`${API_URL}/categories/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': this.getToken()
      }
    });
    if (response.status === 401) throw sessionExpiredError();
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
    // With a customerId the caller is a customer, not an admin session.
    if (response.status === 401 && !customerId) throw sessionExpiredError();
    if (!response.ok) throw new Error('Failed to fetch orders');
    return await response.json();
  },

  // Public: one order, proven by the private link key or the order's own phone
  // number. Resolves null when nothing matches — the Worker answers every miss the
  // same way, so "no such order" and "wrong key" are indistinguishable by design.
  async lookupOrder({ orderId, key = '', phone = '' }) {
    const response = await fetch(`${API_URL}/orders/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, key, phone })
    });
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(await parseApiError(response, 'Failed to look up order'));
    }
    return (await response.json()).order;
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
    if (response.status === 401) throw sessionExpiredError();
    if (!response.ok) {
      throw new Error(await parseApiError(response, 'Failed to update order'));
    }
    return await response.json();
  },

  // Admin: mark a web order as confirmed once the customer's message (with the
  // order number) has reached the OA chat / WhatsApp. confirmed:false undoes it.
  async confirmOrderContact({ orderId, confirmed = true }) {
    const response = await fetch(`${API_URL}/orders/confirm-contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.getToken()
      },
      body: JSON.stringify({ orderId, confirmed })
    });
    if (response.status === 401) throw sessionExpiredError();
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
    if (response.status === 401) throw sessionExpiredError();
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
    if (response.status === 401) throw sessionExpiredError();
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
    if (response.status === 401) throw sessionExpiredError();
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
    if (response.status === 401) throw sessionExpiredError();
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
    if (response.status === 401) throw sessionExpiredError();
    if (!response.ok) throw new Error(`DIY Upload failed: ${response.status}`);
    return await response.json();
  },

  async getNextSku(category) {
    const response = await fetch(`${API_URL}/products/next-sku?category=${encodeURIComponent(category)}`, {
      headers: { 'Authorization': this.getToken() }
    });
    if (response.status === 401) throw sessionExpiredError();
    if (!response.ok) throw new Error('Failed to fetch next SKU');
    return await response.json();
  },

  async getNextDiySku() {
    const response = await fetch(`${API_URL}/diy/products/next-sku`, {
      headers: { 'Authorization': this.getToken() }
    });
    if (response.status === 401) throw sessionExpiredError();
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
