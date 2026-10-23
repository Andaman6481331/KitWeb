import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// api.js decides "am I in a browser" once, at import time, so each test stubs the
// browser globals first and imports a fresh copy of the module.
const loadApi = async (store, status) => {
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
  };
  vi.stubGlobal('window', { localStorage });
  vi.stubGlobal('localStorage', localStorage);
  vi.stubGlobal('fetch', vi.fn(async () => new Response(status === 200 ? '[]' : 'Unauthorized', { status })));
  vi.resetModules();
  return (await import('./api.js')).api;
};

describe('admin session handling', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllGlobals());

  it('drops a token the Worker no longer recognises and flags the 401', async () => {
    // e.g. the password saved by the old password-as-token login
    const store = { admin_token: 'old-password' };
    const api = await loadApi(store, 401);

    await expect(api.getOrders()).rejects.toMatchObject({ status: 401 });
    expect(store.admin_token).toBeUndefined();
  });

  it('does the same for the admin order actions', async () => {
    for (const call of [
      (api) => api.updateOrderStatus({ orderId: 'WH-2026-00001', status: 'PAID', trackingNumber: '' }),
      (api) => api.confirmOrderContact({ orderId: 'WH-2026-00001' }),
      (api) => api.updateOrder({ orderId: 'WH-2026-00001', deliveryFee: 50 }),
    ]) {
      const store = { admin_token: 'stale' };
      const api = await loadApi(store, 401);
      await expect(call(api)).rejects.toMatchObject({ status: 401 });
      expect(store.admin_token).toBeUndefined();
    }
  });

  it("leaves a customer's own login alone when their order list is refused", async () => {
    const store = { kitweb_auth_token: 'cust-1', admin_token: 'still-ok' };
    const api = await loadApi(store, 401);

    await expect(api.getOrders('cust-1')).rejects.toThrow('Failed to fetch orders');
    expect(store.admin_token).toBe('still-ok');
    expect(store.kitweb_auth_token).toBe('cust-1');
  });

  it('keeps the token when the request succeeds', async () => {
    const store = { admin_token: 'valid-session' };
    const api = await loadApi(store, 200);

    await expect(api.getOrders()).resolves.toEqual([]);
    expect(store.admin_token).toBe('valid-session');
  });
});

describe('admin token', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is the admin session only, never a customer login', async () => {
    const api = await loadApi({ kitweb_auth_token: 'cust-1' }, 200);
    expect(api.getAdminToken()).toBeNull();
    // getToken keeps its customer fallback for the order pages that rely on it
    expect(api.getToken()).toBe('cust-1');
  });

  it('returns the admin session when there is one', async () => {
    const api = await loadApi({ admin_token: 'session-token', kitweb_auth_token: 'cust-1' }, 200);
    expect(api.getAdminToken()).toBe('session-token');
  });
});

describe('API base URL', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('defaults to the deployed Worker', async () => {
    await loadApi({}, 200);
    const { API_URL } = await import('./api.js');
    expect(API_URL).toBe('https://hidden-water-ed9d.shop-backend-kitweb.workers.dev');
  });

  it('can be pointed at a local Worker with VITE_API_URL', async () => {
    vi.stubEnv('VITE_API_URL', 'http://127.0.0.1:8787');
    await loadApi({}, 200);
    const { API_URL } = await import('./api.js');
    expect(API_URL).toBe('http://127.0.0.1:8787');
  });
});

describe('inventory bulk actions', () => {
  afterEach(() => vi.unstubAllGlobals());

  const actions = [
    ['setProductsVisibility', (api) => api.setProductsVisibility([1, 2], false),
      '/products/visibility', { ids: [1, 2], is_visible: false }],
    ['addProductsToCategory', (api) => api.addProductsToCategory([3], 'beads'),
      '/products/categories', { ids: [3], category_path: 'beads' }],
    ['archiveProducts', (api) => api.archiveProducts([4, 5]),
      '/products/archive', { ids: [4, 5] }],
    ['restoreProducts', (api) => api.restoreProducts([{ id: 4, is_visible: true }]),
      '/products/restore', { items: [{ id: 4, is_visible: true }] }],
  ];

  it.each(actions)('%s posts JSON with the admin session', async (_name, call, path, body) => {
    const api = await loadApi({ admin_token: 'session-token' }, 200);
    await call(api);

    const [url, init] = fetch.mock.calls[0];
    expect(url.endsWith(path)).toBe(true);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'session-token' });
    expect(JSON.parse(init.body)).toEqual(body);
  });

  it.each(actions)('%s turns a 401 into a session-expired error', async (_name, call) => {
    const store = { admin_token: 'stale' };
    const api = await loadApi(store, 401);
    await expect(call(api)).rejects.toMatchObject({ status: 401 });
    expect(store.admin_token).toBeUndefined();
  });

  it('surfaces the Worker error message', async () => {
    const api = await loadApi({ admin_token: 'session-token' }, 200);
    fetch.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Unknown category' }), { status: 400 }));
    await expect(api.addProductsToCategory([1], 'nope')).rejects.toThrow('Unknown category');
  });
});

describe('admin-only list reads', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('send the admin token, because the Worker answers these 401 without it', async () => {
    const reads = [
      (api) => api.getProducts(null, { includeHidden: true }),
      (api) => api.getProjects({ includeUnpublished: true }),
      (api) => api.getBusinessSets({ includeUnpublished: true }),
      (api) => api.getGallery({ includeHidden: true }),
      (api) => api.getEvents({ includeHidden: true }),
    ];
    for (const read of reads) {
      const store = { admin_token: 'session-token' };
      const api = await loadApi(store, 200);
      await read(api);
      expect(fetch.mock.calls[0][1]?.headers).toEqual({ Authorization: 'session-token' });
    }
  });

  it('send nothing extra on the public storefront reads', async () => {
    const store = { admin_token: 'session-token', kitweb_auth_token: 'cust-1' };
    const api = await loadApi(store, 200);
    await api.getProducts(null);
    await api.getEvents();
    for (const call of fetch.mock.calls) expect(call[1]).toBeUndefined();
  });

  it('turn a 401 into a session-expired error', async () => {
    const store = { admin_token: 'old-password' };
    const api = await loadApi(store, 401);
    await expect(api.getProducts(null, { includeHidden: true })).rejects.toMatchObject({ status: 401 });
    expect(store.admin_token).toBeUndefined();
  });
});

describe('product inventory (sizes and colors)', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllGlobals());

  it('reports a Worker that lacks the route as status 404 and keeps the session', async () => {
    const store = { admin_token: 'valid-session' };
    const api = await loadApi(store, 404);

    await expect(api.getProductInventory(155)).rejects.toMatchObject({ status: 404 });
    expect(store.admin_token).toBe('valid-session');
  });
});
