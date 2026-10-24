import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const WORKER = 'https://hidden-water-ed9d.shop-backend-kitweb.workers.dev';

// api.js decides "am I in a browser" once, at import time, so each test sets the
// globals first and imports a fresh copy. `catalogVersion` is what the fake Worker
// answers on /catalog-version: a number, null, 404, 'garbage' or 'offline'.
const setup = async ({ catalogVersion = 7, browser = true, store = {} } = {}) => {
  const state = { catalogVersion };
  const calls = [];

  if (browser) {
    const localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = v; },
      removeItem: (k) => { delete store[k]; },
    };
    vi.stubGlobal('window', { localStorage });
    vi.stubGlobal('localStorage', localStorage);
  }

  vi.stubGlobal('fetch', vi.fn(async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).endsWith('/catalog-version')) {
      if (state.catalogVersion === 'offline') throw new TypeError('Failed to fetch');
      if (state.catalogVersion === 404) return new Response('Not Found', { status: 404 });
      // A Worker from before this change has no such route and answers 401 to unknown GETs.
      if (state.catalogVersion === 401) return new Response('Unauthorized', { status: 401 });
      if (state.catalogVersion === 'garbage') return new Response('<html>', { status: 200 });
      return Response.json({ version: state.catalogVersion });
    }
    return Response.json([]);
  }));

  vi.resetModules();
  const { api } = await import('./api.js');
  return { api, calls, state, urls: () => calls.map((c) => c.url) };
};

const versionCalls = (calls) => calls.filter((c) => c.url.endsWith('/catalog-version'));

describe('cached public reads', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('ask for the catalogue version first, then read under it', async () => {
    const { api, urls } = await setup();
    await api.getProducts(null);
    expect(urls()).toEqual([`${WORKER}/catalog-version`, `${WORKER}/products?v=7`]);
  });

  it('never let the browser cache the version lookup itself', async () => {
    const { api, calls } = await setup();
    await api.getProducts(null);
    expect(calls[0].init).toEqual({ cache: 'no-store' });
  });

  it('keep the other query parameters', async () => {
    const { api, urls } = await setup();
    await api.getProducts('beads');
    expect(urls()[1]).toBe(`${WORKER}/products?category=beads&v=7`);
  });

  it('cover the public project and gallery reads', async () => {
    const { api, urls } = await setup();
    await api.getProjects({ limit: 3 });
    await api.getProject('hello world');
    await api.getGallery({ productId: 5 });
    expect(urls().filter((u) => !u.endsWith('/catalog-version'))).toEqual([
      `${WORKER}/projects?limit=3&v=7`,
      `${WORKER}/projects/hello%20world?v=7`,
      `${WORKER}/gallery?product_id=5&v=7`,
    ]);
  });

  it('leave every other read alone', async () => {
    const { api, urls } = await setup();
    await api.getEvents();
    await api.getSpotlights({ active: true });
    await api.getBusinessSets();
    expect(urls()).toEqual([
      `${WORKER}/kitcraft`,
      `${WORKER}/spotlights?active=1`,
      `${WORKER}/business-sets`,
    ]);
  });

  it('ask once for reads made at the same time', async () => {
    const { api, calls } = await setup();
    await Promise.all([api.getProducts(null), api.getProjects(), api.getGallery(), api.getProducts('beads')]);
    expect(versionCalls(calls)).toHaveLength(1);
  });

  it('reuse the version for 30 seconds, then ask again', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-24T10:00:00Z'));
    const { api, calls, state } = await setup();

    await api.getProducts(null);
    state.catalogVersion = 8;
    vi.setSystemTime(new Date('2026-10-24T10:00:29Z'));
    await api.getProducts('beads');
    expect(versionCalls(calls)).toHaveLength(1);
    expect(calls.at(-1).url).toBe(`${WORKER}/products?category=beads&v=7`);

    vi.setSystemTime(new Date('2026-10-24T10:00:31Z'));
    await api.getProducts('beads');
    expect(versionCalls(calls)).toHaveLength(2);
    expect(calls.at(-1).url).toBe(`${WORKER}/products?category=beads&v=8`);
  });

  it.each([
    ['updateProduct', (api) => api.updateProduct(1, { name: 'x' })],
    ['addProduct', (api) => api.addProduct({ name: 'x' })],
    ['deleteProduct', (api) => api.deleteProduct(1)],
    ['archiveProducts', (api) => api.archiveProducts([1])],
    ['setProductsVisibility', (api) => api.setProductsVisibility([1], false)],
    ['saveProject', (api) => api.saveProject({ title: 'x' })],
    ['deleteProject', (api) => api.deleteProject(1)],
    ['saveGalleryItem', (api) => api.saveGalleryItem({ image_key: 'x' })],
    ['deleteGalleryItem', (api) => api.deleteGalleryItem(1)],
  ])('forget the version after %s, so the admin sees the change at once', async (_name, write) => {
    const { api, calls, state } = await setup({ store: { admin_token: 'session-token' } });
    await api.getProducts(null);

    await write(api);
    state.catalogVersion = 8; // the Worker bumped it while handling the write
    await api.getProducts(null);

    expect(versionCalls(calls)).toHaveLength(2);
    expect(calls.at(-1).url).toBe(`${WORKER}/products?v=8`);
  });

  it('forget the version even when the write fails, since part of it may have landed', async () => {
    const { api, calls, state } = await setup({ store: { admin_token: 'session-token' } });
    await api.getProducts(null);

    fetch.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'boom' }), { status: 500 }));
    await expect(api.archiveProducts([1])).rejects.toThrow('boom');
    state.catalogVersion = 8;
    await api.getProducts(null);

    expect(calls.at(-1).url).toBe(`${WORKER}/products?v=8`);
  });

  it.each([
    ['a Worker without the route', 404],
    ['a table that is not there yet', null],
    ['an unreadable answer', 'garbage'],
    ['no connection', 'offline'],
  ])('fall back to the plain URL given %s', async (_label, catalogVersion) => {
    const { api, urls } = await setup({ catalogVersion });
    await expect(api.getProducts(null)).resolves.toEqual([]);
    expect(urls()).toEqual([`${WORKER}/catalog-version`, `${WORKER}/products`]);
  });

  it('do not log the admin out when an older Worker answers the lookup with 401', async () => {
    // The frontend may ship before the Worker. That 401 is "no such route", not "bad session".
    const store = { admin_token: 'session-token' };
    const { api, urls } = await setup({ catalogVersion: 401, store });
    await expect(api.getProducts(null)).resolves.toEqual([]);
    expect(store.admin_token).toBe('session-token');
    expect(urls()).toEqual([`${WORKER}/catalog-version`, `${WORKER}/products`]);
  });

  it('look the version up again after a failed lookup instead of remembering the failure', async () => {
    const { api, calls, state } = await setup({ catalogVersion: 404 });
    await api.getProducts(null);
    state.catalogVersion = 7;
    await api.getProducts(null);
    expect(versionCalls(calls)).toHaveLength(2);
    expect(calls.at(-1).url).toBe(`${WORKER}/products?v=7`);
  });

  it('never version the admin reads, which must show the latest data', async () => {
    const { api, urls } = await setup({ store: { admin_token: 'session-token' } });
    await api.getProducts(null, { includeHidden: true });
    await api.getProjects({ includeUnpublished: true });
    await api.getGallery({ includeHidden: true });
    expect(urls()).toEqual([
      `${WORKER}/products?include_hidden=1`,
      `${WORKER}/projects?include_unpublished=1`,
      `${WORKER}/gallery?include_hidden=1`,
    ]);
  });

  it('are not versioned while the site is prerendered, where nothing is cached', async () => {
    const { api, urls } = await setup({ browser: false });
    await api.getProducts(null);
    expect(urls()).toEqual([`${WORKER}/products`]);
  });
});
