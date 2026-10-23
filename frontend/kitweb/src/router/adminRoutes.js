// Every admin page lives under /:lang/admin/<slug>, inside one shell (AdminLayout)
// that supplies the login gate and the shared navbar and hides the public site's
// header and footer. Kept apart from router/index.js, which eagerly imports every
// public page, so this table can be read (and tested) on its own: the components
// below are lazy and only load when their route is visited.
import { ADMIN_PATH, adminNav } from '../utils/adminNav';

const pages = {
  'admin-inventory': () => import('../views/admin/AdminInventoryPage.vue'),
  'admin-invoices': () => import('../views/admin/AdminInvoicesPage.vue'),
  'admin-customers': () => import('../views/admin/AdminCustomersPage.vue'),
  'admin-orders': () => import('../views/ManageOrdersPage.vue'),
  'admin-diy-sets': () => import('../components/admin-diy-sets.vue'),
  'admin-projects': () => import('../components/admin-projects.vue'),
  'admin-colors': () => import('../components/admin-spotlights.vue'),
  'admin-gallery': () => import('../components/admin-gallery.vue'),
  'admin-events': () => import('../components/admin-events.vue'),
  'admin-business-sets': () => import('../components/admin-business-sets.vue'),
  'admin-categories': () => import('../components/admin-categories.vue'),
  'admin-cash-sale': () => import('../views/SellCashPage.vue'),
};

const toInventory = (to) => ({ name: 'admin-inventory', params: { lang: to.params.lang } });

export const adminShellRoute = {
  path: ADMIN_PATH,
  component: () => import('../layouts/AdminLayout.vue'),
  meta: { adminShell: true },
  children: [
    { path: '', redirect: toInventory },
    ...adminNav.map((item) => ({
      path: item.slug,
      name: item.name,
      component: pages[item.name],
      meta: { frame: item.frame },
    })),
  ],
};

// The order and cash-sale pages used to sit at their own top-level paths; bookmarks
// and anything already sent to staff keep working.
const moved = (name, to) => ({
  name,
  redirect: (route) => ({ name: to, params: { lang: route.params.lang }, query: route.query, hash: route.hash }),
});

export const legacyAdminRedirects = [
  { path: 'manageorders', ...moved('manageorders', 'admin-orders') },
  { path: 'sellcash', ...moved('sellcash', 'admin-cash-sale') },
];
