import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const load = async (store) => {
  vi.resetModules();
  vi.stubGlobal('localStorage', {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = v; },
  });
  vi.stubGlobal('window', { localStorage });
  return (await import('./useAdminLang')).useAdminLang();
};

describe('useAdminLang', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllGlobals());

  it('defaults to English', async () => {
    const lang = await load({});
    lang.restore();
    expect(lang.lang.value).toBe('en');
    expect(lang.isThai.value).toBe(false);
  });

  it('restores a saved Thai choice, using the same key as the design', async () => {
    const lang = await load({ 'kc-lang': 'th' });
    lang.restore();
    expect(lang.lang.value).toBe('th');
    expect(lang.isThai.value).toBe(true);
  });

  it('ignores a junk saved value', async () => {
    const lang = await load({ 'kc-lang': 'xx' });
    lang.restore();
    expect(lang.lang.value).toBe('en');
  });

  it('saves the choice when it changes', async () => {
    const store = {};
    const lang = await load(store);
    lang.setLang('th');
    expect(lang.lang.value).toBe('th');
    expect(store['kc-lang']).toBe('th');
  });

  it('refuses a language it does not have', async () => {
    const lang = await load({});
    lang.setLang('fr');
    expect(lang.lang.value).toBe('en');
  });

  it('survives storage that throws (private windows)', async () => {
    vi.resetModules();
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } });
    vi.stubGlobal('window', { localStorage });
    const lang = (await import('./useAdminLang')).useAdminLang();
    expect(() => lang.restore()).not.toThrow();
    expect(() => lang.setLang('th')).not.toThrow();
    expect(lang.lang.value).toBe('th');
  });
});
