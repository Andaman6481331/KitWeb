// The admin navbar and the admin route table are both built from this list, so a page
// can't be in one and missing from the other (adminNav.spec.js checks they agree).
//
// group: 'main' sits on the bar itself; 'more' lives under the "More" menu.
// frame: how the shell wraps the page.
//   'page'   the new design, which lays itself out
//   'legacy' an old-UI panel, given the padded container the old dashboard gave it
//   'full'   an old standalone page that already lays itself out
export const ADMIN_PATH = 'admin';

export const adminNav = [
  { name: 'admin-inventory', slug: 'inventory', en: 'Inventory', th: 'คลังสินค้า', group: 'main', frame: 'page' },
  { name: 'admin-invoices', slug: 'invoices', en: 'Invoices', th: 'ใบแจ้งหนี้', group: 'main', frame: 'page' },
  { name: 'admin-customers', slug: 'customers', en: 'Customers', th: 'ลูกค้า', group: 'main', frame: 'page' },
  { name: 'admin-orders', slug: 'orders', en: 'Orders', th: 'คำสั่งซื้อ', group: 'main', frame: 'full' },
  { name: 'admin-diy-sets', slug: 'diy-set-collection', en: 'DIY Sets', th: 'ชุด DIY', group: 'more', frame: 'legacy' },
  { name: 'admin-projects', slug: 'project-article', en: 'Projects & Articles', th: 'โปรเจกต์และบทความ', group: 'more', frame: 'legacy' },
  { name: 'admin-colors', slug: 'color-of-the-month', en: 'Color of the Month', th: 'สีประจำเดือน', group: 'more', frame: 'legacy' },
  { name: 'admin-gallery', slug: 'creator-gallery', en: 'Creator Gallery', th: 'แกลเลอรีผู้สร้าง', group: 'more', frame: 'legacy' },
  { name: 'admin-events', slug: 'workshops-events', en: 'Workshops & Events', th: 'เวิร์กชอปและอีเวนต์', group: 'more', frame: 'legacy' },
  { name: 'admin-business-sets', slug: 'business-sets', en: 'Business Sets', th: 'เซตธุรกิจ', group: 'more', frame: 'legacy' },
  { name: 'admin-categories', slug: 'categories', en: 'Categories', th: 'หมวดหมู่', group: 'more', frame: 'legacy' },
  { name: 'admin-cash-sale', slug: 'cash-sale', en: 'Cash Sale', th: 'ขายเงินสด', group: 'more', frame: 'full' },
];

export const adminNavLabel = (item, lang) => (lang === 'th' ? item.th : item.en);
