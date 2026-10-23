import { describe, it, expect } from 'vitest';
import { adminNav, adminNavLabel, ADMIN_PATH } from './adminNav';
import { adminShellRoute, legacyAdminRedirects } from '../router/adminRoutes';

// Walk the admin part of the route table the way the router does.
const namedRoutes = () => {
  const found = new Map();
  const walk = (list, prefix) => {
    for (const r of list) {
      const full = `${prefix}/${r.path}`.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
      if (r.name) found.set(r.name, { path: full, route: r });
      if (r.children) walk(r.children, full);
    }
  };
  walk([{ path: '/:lang', children: [adminShellRoute, ...legacyAdminRedirects] }], '');
  return found;
};

describe('adminNav', () => {
  const named = namedRoutes();

  it('points every entry at a route that exists', () => {
    for (const item of adminNav) {
      expect(named.has(item.name), `route ${item.name}`).toBe(true);
    }
  });

  it('keeps every admin route under /:lang/admin', () => {
    for (const item of adminNav) {
      expect(named.get(item.name).path, item.name).toBe(`/:lang/${ADMIN_PATH}/${item.slug}`);
    }
  });

  it('has an English and a Thai label for each entry', () => {
    for (const item of adminNav) {
      expect(item.en && item.th, item.name).toBeTruthy();
    }
  });

  it('puts the three redesigned pages first, in the design order', () => {
    expect(adminNav.slice(0, 3).map((i) => i.name))
      .toEqual(['admin-inventory', 'admin-invoices', 'admin-customers']);
  });

  it('has no duplicate routes or slugs', () => {
    expect(new Set(adminNav.map((i) => i.name)).size).toBe(adminNav.length);
    expect(new Set(adminNav.map((i) => i.slug)).size).toBe(adminNav.length);
  });

  it('keeps every old admin tab reachable on its own route', () => {
    expect(adminNav.map((i) => i.slug)).toEqual(expect.arrayContaining([
      'diy-set-collection', 'project-article', 'color-of-the-month',
      'creator-gallery', 'workshops-events', 'business-sets', 'categories', 'orders', 'cash-sale',
    ]));
  });

  it('picks the label for the active language', () => {
    expect(adminNavLabel(adminNav[0], 'en')).toBe('Inventory');
    expect(adminNavLabel(adminNav[0], 'th')).toBe('คลังสินค้า');
  });
});

describe('admin route table', () => {
  it('hosts the admin pages in one shell that hides the public site', () => {
    expect(adminShellRoute.path).toBe(ADMIN_PATH);
    expect(adminShellRoute.meta.adminShell).toBe(true);
    expect(typeof adminShellRoute.component).toBe('function');
  });

  it('opens the inventory by default', () => {
    const index = adminShellRoute.children.find((r) => r.path === '');
    expect(index.redirect({ params: { lang: 'th' } }))
      .toMatchObject({ name: 'admin-inventory', params: { lang: 'th' } });
  });

  it('lets old pages choose how the shell frames them', () => {
    const meta = (slug) => adminShellRoute.children.find((r) => r.path === slug).meta;
    expect(meta('inventory').frame).toBe('page');
    expect(meta('project-article').frame).toBe('legacy');
    expect(meta('orders').frame).toBe('full');
  });

  it('keeps the old order and cash-sale URLs working', () => {
    const to = { params: { lang: 'en' }, query: { a: '1' }, hash: '' };
    const redirect = (name) => legacyAdminRedirects.find((r) => r.name === name).redirect(to);
    expect(redirect('manageorders')).toMatchObject({ name: 'admin-orders', params: { lang: 'en' }, query: { a: '1' } });
    expect(redirect('sellcash')).toMatchObject({ name: 'admin-cash-sale', params: { lang: 'en' } });
  });
});
