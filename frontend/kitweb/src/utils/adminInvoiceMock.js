// PLACEHOLDER product catalogue for the New invoice page: the 17 variants from the
// design file. These are not the shop's real products or stock. When the invoice page
// is wired to real data, composables/useInvoiceCatalog.js is the one place that changes.
//
// anchor: price at Special B; the other levels are anchor x a fixed multiplier.
// cost:   factory cost per piece (internal, drives the margin).
// moq:    quantity at which Retail / Small wholesale / Wholesale unlock (then two unused).
// manual: optional hand-set price for one level, replacing the multiplier.
const PIECES = [1, 12, 50, 100, 300];
const YARN_50 = [1, 6, 24, 100, 300];

const v = (id, name, nameTh, sku, size, sizeTh, color, colorTh, hex, stock, anchor, cost, extra = {}) => ({
  id, name, nameTh, sku, size, sizeTh, color, colorTh, hex, stock, anchor, cost, moq: PIECES, ...extra,
});

export const MOCK_VARIANTS = [
  v('yn25red', 'Acrylic Yarn', 'ไหมพรมอะคริลิก', 'YN-014-25G-RED', '25 g', '25 กรัม', 'Red', 'แดง', '#c0392b', 120, 35, 22),
  v('yn25nav', 'Acrylic Yarn', 'ไหมพรมอะคริลิก', 'YN-014-25G-NAV', '25 g', '25 กรัม', 'Navy', 'กรมท่า', '#1f3a68', 80, 35, 22),
  v('yn25cre', 'Acrylic Yarn', 'ไหมพรมอะคริลิก', 'YN-014-25G-CRE', '25 g', '25 กรัม', 'Cream', 'ครีม', '#f3e9d2', 45, 35, 22),
  v('yn50red', 'Acrylic Yarn', 'ไหมพรมอะคริลิก', 'YN-014-50G-RED', '50 g', '50 กรัม', 'Red', 'แดง', '#c0392b', 60, 65, 44, { moq: YARN_50, manual: { 0: 135 } }),
  v('yn50nav', 'Acrylic Yarn', 'ไหมพรมอะคริลิก', 'YN-014-50G-NAV', '50 g', '50 กรัม', 'Navy', 'กรมท่า', '#1f3a68', 0, 65, 44, { moq: YARN_50, manual: { 0: 135 } }),
  v('yn50cre', 'Acrylic Yarn', 'ไหมพรมอะคริลิก', 'YN-014-50G-CRE', '50 g', '50 กรัม', 'Cream', 'ครีม', '#f3e9d2', 30, 65, 44, { moq: YARN_50, manual: { 0: 135 } }),
  v('rbpink', 'Satin Ribbon', 'ริบบิ้นซาติน', 'RB009-10M-PNK', '10 m roll', 'ม้วน 10 ม.', 'Pink', 'ชมพู', '#e9a3b4', 180, 30, 18),
  v('rbwhite', 'Satin Ribbon', 'ริบบิ้นซาติน', 'RB009-10M-WHT', '10 m roll', 'ม้วน 10 ม.', 'White', 'ขาว', '#f6f3ee', 150, 30, 18),
  v('rbgold', 'Satin Ribbon', 'ริบบิ้นซาติน', 'RB009-10M-GLD', '10 m roll', 'ม้วน 10 ม.', 'Gold', 'ทอง', '#d4a94a', 12, 30, 18),
  v('bd500', 'Pony Beads Mix', 'ลูกปัดโพนี่คละสี', 'BD012-500G-MIX', '500 g bag', 'ถุง 500 ก.', 'Mixed', 'คละสี', '#ef6f8f', 310, 55, 33),
  v('btnat', 'Wooden Buttons', 'กระดุมไม้', 'BT003-P50-NAT', 'Pack of 50', 'แพ็ค 50', 'Natural', 'ธรรมชาติ', '#c9a36b', 400, 25, 14),
  v('btdark', 'Wooden Buttons', 'กระดุมไม้', 'BT003-P50-DRK', 'Pack of 50', 'แพ็ค 50', 'Dark', 'น้ำตาลเข้ม', '#6b4a2b', 40, 25, 14),
  v('thwhite', 'Polyester Thread', 'ด้ายโพลีเอสเตอร์', 'TH011-1000Y-WHT', '1000 yd', '1000 หลา', 'White', 'ขาว', '#f6f3ee', 7, 15, 8),
  v('thblack', 'Polyester Thread', 'ด้ายโพลีเอสเตอร์', 'TH011-1000Y-BLK', '1000 yd', '1000 หลา', 'Black', 'ดำ', '#2b2620', 90, 15, 8),
  v('thred', 'Polyester Thread', 'ด้ายโพลีเอสเตอร์', 'TH011-1000Y-RED', '1000 yd', '1000 หลา', 'Red', 'แดง', '#c0392b', 60, 15, 8),
  v('sc8', 'Zigzag Scissors', 'กรรไกรซิกแซก', 'SC004-8IN', '8 inch', '8 นิ้ว', 'Standard', 'มาตรฐาน', '#b8b8bd', 52, 120, 75),
  v('fl12', 'Floral Tape, row of 12', 'ฟลอราเทป (แถว 12 ม้วน)', 'FL017-R12-GRN', '20 yd', '20 หลา', 'Green', 'เขียว', '#4f6b34', 36, 200, 130),
  v('de100', 'Balloon Stoppers', 'จุกลูกโป่ง', 'DE025-P100-MIX', 'Pack of 100', 'แพ็ค 100', 'Mixed', 'คละสี', '#e0527a', 220, 60, 35),
];

export const MOCK_VARIANTS_BY_ID = Object.fromEntries(MOCK_VARIANTS.map((x) => [x.id, x]));
