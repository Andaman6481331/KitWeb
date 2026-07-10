<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { api, API_URL} from '../services/api';
import { groupByDisplayGroup } from '@/utils/catalogCategories';

const { t, locale } = useI18n();
const route = useRoute();

// State
const categoriesGrouped = ref({});
const products = ref([]);
const loading = ref(true);
const error = ref(null);
const selectedItems = ref(new Set()); // set of product IDs
const rfqQuantities = ref({}); // product ID -> quantity

// Section navigator (right-side mini-map rail)
const activeSection = ref(null);
const catalogSections = computed(() => Object.keys(categoriesGrouped.value));
let sectionObserver = null;

// RFQ Modal State
const showRfqModal = ref(false);
const submittingRfq = ref(false);
const rfqSuccess = ref(false);
const rfqError = ref(null);
const submittedOrderId = ref('');

const rfqForm = ref({
  customerName: '',
  organization: '',
  email: '',
  phoneNumber: '',
  shippingAddress: '',
  notes: ''
});

// Locale-aware product field accessors (mirrors tProduct in CategoryView.vue).
// Show Thai name/description when the Thai locale is active, fall back to English.
const tName = (p) =>
  (locale.value === 'th' && p.name_th) ? p.name_th : p.title;

const tDesc = (p) =>
  (locale.value === 'th' && p.description_th) ? p.description_th : p.description;

const getImageUrl = (key, variant = 'large') => {
  if (!key) return 'https://m.media-amazon.com/images/I/610a5LpNbTL.jpg';
  const keyStr = String(key);
  if (keyStr.startsWith('http')) return keyStr;
  if (keyStr.includes('.')) return `${API_URL}/images/${keyStr}`;
  return `${API_URL}/images/${keyStr}-${variant}.webp`;
};

// Resolves a display-group key (e.g. 'threadString') to its translated heading,
// mirroring the headings used on the retail catalog. Falls back to the raw key
// (title-cased) for any slug not part of a defined group.
const groupLabel = (key) => {
  if (!key) return '';
  return t(`categories.${key}`, key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
};

// Fetch data
const fetchCatalog = async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await api.getInstitutionalCatalog();
    if (response && response.success) {
      products.value = response.products || [];

      // Regroup products into the same display groups used on the retail catalog
      categoriesGrouped.value = groupByDisplayGroup(products.value, p => p.category_id);
      
      // Initialize default quantities
      products.value.forEach(p => {
        rfqQuantities.value[p.id] = 10; // B2B default initial count
      });
    } else {
      throw new Error('API returned unsuccessful response');
    }
  } catch (err) {
    console.error('Failed to load institutional catalog:', err);
    error.value = 'Failed to load the catalog data. Please try again later.';
  } finally {
    loading.value = false;
  }
};

// ── Section navigator: click-to-scroll + track the section currently in view ──
const scrollToSection = (groupName) => {
  const el = document.getElementById(`catalog-section-${groupName}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const setupSectionObserver = () => {
  if (sectionObserver) sectionObserver.disconnect();
  // A section becomes "active" once it crosses into the middle band of the viewport.
  sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) activeSection.value = entry.target.dataset.section;
      });
    },
    { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
  );

  catalogSections.value.forEach((name) => {
    const el = document.getElementById(`catalog-section-${name}`);
    if (el) sectionObserver.observe(el);
  });

  // Default the highlight to the first section until the user scrolls.
  if (!activeSection.value) activeSection.value = catalogSections.value[0] || null;
};

// Rebuild the observers whenever the grouped catalog changes (i.e. after data loads).
watch(categoriesGrouped, async () => {
  await nextTick();
  setupSectionObserver();
});

onBeforeUnmount(() => {
  if (sectionObserver) sectionObserver.disconnect();
});

onMounted(() => {
  fetchCatalog();
  
  // Set B2B SEO metadata
  document.title = locale.value === 'th' 
    ? 'รายการแคตตาล็อกสถาบันและองค์กร | KitCraft B2B' 
    : 'Institutional Master Catalog | KitCraft B2B Portal';
    
  let descriptionMeta = document.querySelector('meta[name="description"]');
  if (descriptionMeta) {
    descriptionMeta.setAttribute('content', locale.value === 'th'
      ? 'จัดหาสื่อการเรียนการสอน งานฝีมือ และอุปกรณ์ศิลปะสำหรับโรงเรียนและครู ราคา B2B และใบเสนอราคาพิเศษ'
      : 'Source crafting materials and DIY project kits for schools, teachers, and organizations. Get custom B2B quotes today.');
  }
});

// Helper for resolving image paths
const resolveProductImage = (url) => {
  if (!url) return getImageUrl('placeholder.png'); // Fallback placeholder
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  return getImageUrl(url);
};

// RFQ Selection Handlers
const toggleRfqSelection = (productId) => {
  if (selectedItems.value.has(productId)) {
    selectedItems.value.delete(productId);
  } else {
    selectedItems.value.add(productId);
  }
};

const clearRfqList = () => {
  selectedItems.value.clear();
};

const selectedProductsList = computed(() => {
  return products.value.filter(p => selectedItems.value.has(p.id));
});

// Submit RFQ Form
const handleRfqSubmit = async () => {
  if (selectedItems.value.size === 0) return;
  
  submittingRfq.value = true;
  rfqError.value = null;
  
  const payload = {
    customerName: rfqForm.value.customerName,
    organization: rfqForm.value.organization,
    email: rfqForm.value.email,
    phoneNumber: rfqForm.value.phoneNumber,
    shippingAddress: rfqForm.value.shippingAddress,
    notes: rfqForm.value.notes,
    items: selectedProductsList.value.map(p => ({
      id: p.id,
      sku: p.sku,
      title: p.title,
      quantity: rfqQuantities.value[p.id] || 10
    }))
  };
  
  try {
    const res = await api.submitRfq(payload);
    if (res && res.success) {
      rfqSuccess.value = true;
      submittedOrderId.value = res.orderId;
      clearRfqList();
      // Reset form
      rfqForm.value = {
        customerName: '',
        organization: '',
        email: '',
        phoneNumber: '',
        shippingAddress: '',
        notes: ''
      };
    } else {
      throw new Error(res.error || 'Failed to submit RFQ');
    }
  } catch (err) {
    console.error('Error submitting RFQ:', err);
    rfqError.value = err.message || 'An error occurred during submission. Please try again.';
  } finally {
    submittingRfq.value = false;
  }
};

// Generate Print-Friendly Sourcing Checklist (Save to PDF)
const handlePdfDownload = () => {
  if (products.value.length === 0) return;
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to download the sourcing checklist.');
    return;
  }
  
  const title = locale.value === 'th' 
    ? 'รายการตรวจเช็ควัสดุงานฝีมือ - Kitcharoen B2B' 
    : 'KitCraft Institutional Sourcing Checklist';
  
  const headerText = locale.value === 'th'
    ? 'รายการตรวจสอบการจัดหาวัสดุแบบขายส่งสถาบัน'
    : 'B2B Wholesale Sourcing Checklist';
    
  let html = `
    <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: 'Inter', -apple-system, sans-serif;
            color: #2D241E;
            padding: 30px;
            background: #fff;
          }
          .header {
            border-bottom: 2px solid #604539;
            padding-bottom: 15px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .header h1 {
            color: #604539;
            font-size: 24px;
            margin: 0 0 5px 0;
          }
          .header p {
            margin: 0;
            color: #6B5D54;
            font-size: 14px;
          }
          .meta-info {
            text-align: right;
            font-size: 12px;
            color: #8b6f47;
          }
          .category-section {
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          .category-title {
            color: #604539;
            font-size: 18px;
            border-bottom: 1px solid #EADFD3;
            padding-bottom: 5px;
            margin-bottom: 15px;
            font-weight: bold;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th {
            background-color: #FDF3E6;
            color: #604539;
            text-align: left;
            padding: 10px;
            font-size: 12px;
            border: 1px solid #EADFD3;
            text-transform: uppercase;
          }
          td {
            padding: 10px;
            font-size: 13px;
            border: 1px solid #EADFD3;
          }
          .sku-col { width: 12%; font-family: monospace; }
          .check-box {
            width: 25px;
            height: 25px;
            border: 1px solid #604539;
            margin: auto;
          }
          .footer-note {
            margin-top: 40px;
            font-size: 11px;
            color: #9e8272;
            text-align: center;
            border-top: 1px solid #EADFD3;
            padding-top: 15px;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>${headerText}</h1>
            <p>Kitcharoen Premium Crafts | B2B Portal Gateway</p>
          </div>
          <div class="meta-info">
            <p>Date: ${new Date().toLocaleDateString()}</p>
            <p>Status: Net-30 PO Accepted</p>
          </div>
        </div>
        
        <p style="margin-bottom: 25px; font-size: 13px; color: #5d4037;">
          Use this checklist to identify and inspect activities/materials. Mark the requested products and quantities, then submit to your procurement team or scan and send to Kitcharoen for a direct quotation.
        </p>
  `;
  
  // Group products locally for print view
  const printGroups = groupByDisplayGroup(products.value, p => p.category_id);

  Object.keys(printGroups).forEach(category => {
    html += `
      <div class="category-section">
        <div class="category-title">${groupLabel(category)}</div>
        <table>
          <thead>
            <tr>
              <th style="width: 5%; text-align: center;">[ ✔ ]</th>
              <th class="sku-col">SKU / ID</th>
              <th style="width: 30%;">Product Title</th>
              <th>Description / Use Case</th>
              <th style="width: 15%;">Requested Qty</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    printGroups[category].forEach(p => {
      html += `
        <tr>
          <td style="text-align: center;"><div class="check-box"></div></td>
          <td class="sku-col">${p.sku || 'N/A'}</td>
          <td><strong>${tName(p)}</strong></td>
          <td style="color: #5d4037;">${tDesc(p) || 'Suitable for institutional art projects and workshops.'}</td>
          <td>___________</td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
      </div>
    `;
  });
  
  html += `
        <div class="footer-note">
          <p>Net-30 Purchase Orders Accepted | Tax-Exempt Accounts Supported</p>
          <p>Kitcharoen craft and sewing supplies - Bangkok Sampeng Market. Trusted materials since 1984.</p>
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        <\/script>
      </body>
    </html>
  `;
  
  printWindow.document.write(html);
  printWindow.document.close();
};
// End of PDF download handler

// ─────────────────────────────────────────────────────────────────────────────
// Drop-in replacement for handlePdfDownload
// Requires in your package.json (or install once):
//   npm install docx file-saver
//
// Add to your imports at the top of the <script setup>:
//   import { saveAs } from 'file-saver';
//   import {
//     Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
//     ImageRun, AlignmentType, BorderStyle, WidthType, ShadingType,
//     HeadingLevel, VerticalAlign
//   } from 'docx';
// ─────────────────────────────────────────────────────────────────────────────

// Fetches an image URL and returns { data: Uint8Array, type: 'png'|'jpg' }
// Falls back to null if fetch fails so the row still renders without image.
const fetchImageAsBuffer = async (url) => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const type = blob.type.includes('png') ? 'png' : 'jpg';
    const arrayBuffer = await blob.arrayBuffer();
    return { data: new Uint8Array(arrayBuffer), type };
  } catch {
    return null;
  }
};

const handleDocxDownload = async () => {
  if (products.value.length === 0) return;

  // Dynamically import so they're not in the main bundle if you prefer,
  // or remove the dynamic import if you added them as static imports above.
  const { saveAs } = await import('file-saver');
  const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    ImageRun, AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign
  } = await import('docx');

  // ── helpers ──────────────────────────────────────────────────────────────
  const BRAND   = '#604539';   // hex without # for docx color strings
  const LIGHT   = 'FDF3E6';
  const BORDER_COLOR = 'EADFD3';
  const cell_border = { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR };
  const borders = { top: cell_border, bottom: cell_border, left: cell_border, right: cell_border };
  const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

  const makeCell = (children, opts = {}) =>
    new TableCell({
      borders,
      width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
      shading: opts.shading ? { fill: opts.shading, type: ShadingType.CLEAR } : undefined,
      verticalAlign: VerticalAlign.CENTER,
      margins: cellMargins,
      children,
    });

  const txt = (text, opts = {}) =>
    new TextRun({ text: String(text ?? ''), font: 'Arial', size: opts.size ?? 22,
      bold: opts.bold, color: opts.color, italics: opts.italics });

  const para = (runs, opts = {}) =>
    new Paragraph({ alignment: opts.align ?? AlignmentType.LEFT, spacing: { after: 0 }, children: Array.isArray(runs) ? runs : [runs] });

  // ── header row for each category table ───────────────────────────────────
  // Columns:  Image | SKU | Product Title | Description | Qty
  // Widths (DXA, total = 9360 for 1-inch margins on Letter):
  const COL = { img: 1800, sku: 900, title: 2500, desc: 3560, qty: 1000 };
  // sum = 9360 ✓

  const headerRow = () =>
    new TableRow({
      tableHeader: true,
      children: [
        makeCell([para(txt('Image',         { bold: true, size: 28, color: '604539' }))], { width: COL.img,   shading: LIGHT }),
        makeCell([para(txt('SKU / ID',      { bold: true, size: 18, color: '604539' }))], { width: COL.sku,   shading: LIGHT }),
        makeCell([para(txt('Product Title', { bold: true, size: 18, color: '604539' }))], { width: COL.title, shading: LIGHT }),
        makeCell([para(txt('Description',   { bold: true, size: 18, color: '604539' }))], { width: COL.desc,  shading: LIGHT }),
        makeCell([para(txt('Req. Qty',      { bold: true, size: 18, color: '604539' }), { align: AlignmentType.CENTER })], { width: COL.qty, shading: LIGHT }),
      ],
    });

  // ── group products same as PDF ────────────────────────────────────────────
  const printGroups = groupByDisplayGroup(products.value, p => p.category_id);

  // ── pre-fetch ALL images in parallel ─────────────────────────────────────
  const allProducts = products.value;
  const imageMap = {};   // product.id -> { data, type } | null

  await Promise.all(
    allProducts.map(async (p) => {
      const url = resolveProductImage(p.image_url);
      imageMap[p.id] = await fetchImageAsBuffer(url);
    })
  );

  // ── build document sections ───────────────────────────────────────────────
  const children = [];

  // — Document title —
  children.push(
    new Paragraph({
      spacing: { after: 60 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '604539', space: 4 } },
      children: [
        txt(
          locale.value === 'th'
            ? 'รายการตรวจสอบการจัดหาวัสดุแบบขายส่งสถาบัน'
            : 'B2B Wholesale Sourcing Checklist',
          { bold: true, size: 36, color: '604539' }
        ),
      ],
    }),
    new Paragraph({
      spacing: { after: 40 },
      children: [txt('Kitcharoen Premium Crafts  |  B2B Portal Gateway', { size: 20, color: '8b6f47' })],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        txt(`Date: ${new Date().toLocaleDateString()}`, { size: 18, color: '8b6f47' }),
        txt('      Status: Net-30 PO Accepted',          { size: 18, color: '8b6f47' }),
      ],
    }),
    new Paragraph({
      spacing: { after: 300 },
      children: [
        txt(
          'Use this checklist to identify and inspect activities/materials. ' +
          'Mark the requested products and quantities, then submit to your procurement team ' +
          'or scan and send to Kitcharoen for a direct quotation.',
          { size: 20, color: '5d4037' }
        ),
      ],
    }),
  );

  // — One table per category —
  for (const [category, catProducts] of Object.entries(printGroups)) {
    // Category heading
    children.push(
      new Paragraph({
        spacing: { before: 280, after: 100 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR, space: 2 } },
        children: [txt(groupLabel(category), { bold: true, size: 26, color: '604539' })],
      })
    );

    const rows = [headerRow()];

    for (const p of catProducts) {
      const imgBuf = imageMap[p.id];

      // Image cell content
      const imgCellChildren = imgBuf
        ? [para(new ImageRun({
            data: imgBuf.data,
            type: imgBuf.type,
            transformation: { width: 120, height: 120 },
          }))]
        : [para(txt('—', { color: 'AAAAAA' }))];

      rows.push(
        new TableRow({
          children: [
            makeCell(imgCellChildren, { width: COL.img }),
            makeCell([para(txt(p.sku || 'N/A', { size: 18, color: '604539', italics: true }))], { width: COL.sku }),
            makeCell([para(txt(tName(p), { bold: true, size: 20 }))], { width: COL.title }),
            makeCell([para(txt(tDesc(p) || 'Suitable for institutional art projects and workshops.', { size: 18, color: '5d4037' }))], { width: COL.desc }),
            // Empty qty box — user fills in manually
            makeCell([para(txt('', { size: 20 }), { align: AlignmentType.CENTER })], { width: COL.qty }),
          ],
        })
      );
    }

    children.push(
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [COL.img, COL.sku, COL.title, COL.desc, COL.qty],
        rows,
      })
    );
  }

  // — Footer —
  children.push(
    new Paragraph({ spacing: { before: 400 }, children: [] }), // spacer
    new Paragraph({
      spacing: { before: 160, after: 60 },
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR, space: 4 } },
      children: [txt('Net-30 Purchase Orders Accepted  |  Tax-Exempt Accounts Supported', { size: 18, color: '9e8272' })],
    }),
    new Paragraph({
      children: [txt('Kitcharoen craft and sewing supplies - Bangkok Sampeng Market. Trusted materials since 1984.', { size: 18, color: '9e8272' })],
    }),
  );

  // ── assemble & save ───────────────────────────────────────────────────────
  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 22 } } },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },           // US Letter
          margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 }, // 0.75-inch margins
        },
      },
      children,
    }],
  });

  const buffer = await Packer.toBlob(doc);
  const filename = locale.value === 'th'
    ? 'รายการตรวจสอบวัสดุ-KitCraft-B2B.docx'
    : 'KitCraft-B2B-Sourcing-Checklist.docx';

  saveAs(buffer, filename);
};

</script>

<template>
  <div class="b2b-wrapper">
    <!-- Informational Top Banner -->
    <div class="info-banner">
      <div class="banner-content">
        <span class="banner-badge">{{ t('institutional.bannerBadge') }}</span>
        <span class="banner-text">{{ t('institutional.bannerText') }}</span>
      </div>
    </div>

    <!-- Page Header Hero Section -->
    <div class="b2b-hero">
      <div class="b2b-hero-overlay"></div>
      <div class="b2b-hero-content">
        <h1 class="hero-title">{{ t('institutional.heroTitle') }}</h1>
        <p class="hero-subtitle">
          {{ t('institutional.heroSubtitle') }}
        </p>
        <div class="hero-actions-wrapper">
          <div class="hero-actions">
            <button @click="handlePdfDownload" class="btn-primary" :disabled="loading || products.length === 0">
              <ion-icon name="document-text-outline" class="btn-icon"></ion-icon>
              {{ t('institutional.downloadPdf') }}
            </button>
          </div>
          <div class="hero-actions">
            <button @click="handleDocxDownload" class="btn-primary" :disabled="loading || products.length === 0">
              <ion-icon name="document-text-outline" class="btn-icon"></ion-icon>
              {{ t('institutional.downloadDocx') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="b2b-container">
      <!-- Loading State -->
      <div v-if="loading" class="state-container">
        <div class="spinner"></div>
        <p class="state-text">{{ t('institutional.loading') }}</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="state-container error-card">
        <ion-icon name="alert-circle-outline" class="error-icon"></ion-icon>
        <p class="state-text">{{ error }}</p>
        <button @click="fetchCatalog" class="btn-retry">{{ t('institutional.retry') }}</button>
      </div>

      <!-- Catalog Main Content -->
      <div v-else class="catalog-grid-wrapper">
        <div
          v-for="(groupProducts, groupName) in categoriesGrouped"
          :key="groupName"
          :id="`catalog-section-${groupName}`"
          :data-section="groupName"
          class="category-block"
        >
          <div class="category-block-header">
            <h2 class="category-block-title">{{ groupLabel(groupName) }}</h2>
            <div class="title-line"></div>
          </div>

          <div class="dense-grid">
            <div 
              v-for="product in groupProducts" 
              :key="product.id" 
              class="b2b-card"
              :class="{ 'card-selected': selectedItems.has(product.id) }"
            >
              <div class="card-img-wrap">
                <img
                  :src="resolveProductImage(product.image_url)"
                  :alt="tName(product)"
                  class="card-img"
                  loading="lazy"
                />
                <div v-if="selectedItems.has(product.id)" class="selection-check-indicator">
                  <ion-icon name="checkmark-circle"></ion-icon>
                </div>
              </div>

              <div class="card-info">
                <span class="card-sku">SKU: {{ product.sku || 'N/A' }}</span>
                <h3 class="card-title">{{ tName(product) }}</h3>
                <p class="card-desc">
                  {{ tDesc(product) || t('institutional.descFallback') }}
                </p>
              </div>

              <div class="card-footer">
                <!-- RFQ Quantity selector inside card when checked -->
                <div v-if="selectedItems.has(product.id)" class="qty-control">
                  <span class="qty-label">{{ t('institutional.qty') }}</span>
                  <input 
                    type="number" 
                    v-model.number="rfqQuantities[product.id]" 
                    min="1" 
                    max="10000"
                    class="qty-input" 
                  />
                </div>
                
                <button 
                  @click="toggleRfqSelection(product.id)" 
                  class="btn-rfq-toggle" 
                  :class="{ 'btn-rfq-added': selectedItems.has(product.id) }"
                >
                  <span class="rfq-btn-text">
                    {{ selectedItems.has(product.id) ? t('institutional.addedToRfq') : t('institutional.addToRfq') }}
                  </span>
                  <input 
                    type="checkbox" 
                    :checked="selectedItems.has(product.id)" 
                    class="rfq-checkbox"
                    @click.stop
                    @change="toggleRfqSelection(product.id)"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Section Navigator: slim right-side mini-map rail -->
    <nav
      v-if="!loading && !error && catalogSections.length > 1"
      class="section-nav"
      aria-label="Catalog sections"
    >
      <button
        v-for="groupName in catalogSections"
        :key="groupName"
        type="button"
        class="section-nav-item"
        :class="{ 'is-active': activeSection === groupName }"
        :title="groupLabel(groupName)"
        @click="scrollToSection(groupName)"
      >
        <span class="section-nav-label">{{ groupLabel(groupName) }}</span>
        <span class="section-nav-dot"></span>
      </button>
    </nav>

    <!-- Floating RFQ List Drawer (Bottom Sheet) -->
    <Transition name="drawer-slide">
      <div v-if="selectedItems.size > 0" class="rfq-drawer">
        <div class="drawer-container">
          <div class="drawer-left">
            <ion-icon name="cart-outline" class="drawer-cart-icon"></ion-icon>
            <div class="drawer-info">
              <span class="drawer-count">{{ t('institutional.drawerCount', { count: selectedItems.size }) }}</span>
              <span class="drawer-help">{{ t('institutional.drawerHelp') }}</span>
            </div>
          </div>
          <div class="drawer-right">
            <button @click="clearRfqList" class="btn-secondary">
              <ion-icon name="trash-outline"></ion-icon>
              {{ t('institutional.clearList') }}
            </button>
            <button @click="showRfqModal = true" class="btn-accent">
              {{ t('institutional.requestQuote') }}
              <ion-icon name="arrow-forward-outline"></ion-icon>
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- RFQ Submission Modal Form -->
    <Transition name="modal-fade">
      <div v-if="showRfqModal" class="modal-overlay" @click.self="showRfqModal = false">
        <div class="modal-card">
          <div class="modal-header">
            <h3>{{ t('institutional.modalTitle') }}</h3>
            <button @click="showRfqModal = false" class="btn-close-modal">
              <ion-icon name="close-outline"></ion-icon>
            </button>
          </div>

          <!-- Successful Submission State -->
          <div v-if="rfqSuccess" class="modal-body success-state">
            <ion-icon name="checkmark-circle-outline" class="success-icon"></ion-icon>
            <h4>{{ t('institutional.successTitle') }}</h4>
            <p class="success-subtitle">{{ t('institutional.successSubtitle') }}</p>
            <div class="order-ref-box">
              <span class="ref-label">{{ t('institutional.quotationIdRef') }}</span>
              <span class="ref-id">{{ submittedOrderId }}</span>
            </div>
            <p class="success-footer">{{ t('institutional.successFooter') }}</p>
            <button @click="showRfqModal = false; rfqSuccess = false;" class="btn-modal-close-action">
              {{ t('institutional.done') }}
            </button>
          </div>

          <!-- Submission Form -->
          <form v-else @submit.prevent="handleRfqSubmit" class="modal-body">
            <div v-if="rfqError" class="modal-error-banner">
              <ion-icon name="warning-outline"></ion-icon>
              <span>{{ rfqError }}</span>
            </div>

            <p class="modal-intro-text">
              {{ t('institutional.formIntro') }}
            </p>

            <div class="form-row">
              <div class="form-group">
                <label for="orgName">{{ t('institutional.orgNameLabel') }}</label>
                <input
                  type="text"
                  id="orgName"
                  v-model="rfqForm.organization"
                  :placeholder="t('institutional.orgNamePlaceholder')"
                  required
                />
              </div>
              <div class="form-group">
                <label for="custName">{{ t('institutional.contactNameLabel') }}</label>
                <input
                  type="text"
                  id="custName"
                  v-model="rfqForm.customerName"
                  :placeholder="t('institutional.contactNamePlaceholder')"
                  required
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="custEmail">{{ t('institutional.emailLabel') }}</label>
                <input
                  type="email"
                  id="custEmail"
                  v-model="rfqForm.email"
                  :placeholder="t('institutional.emailPlaceholder')"
                  required
                />
              </div>
              <div class="form-group">
                <label for="custPhone">{{ t('institutional.phoneLabel') }}</label>
                <input
                  type="tel"
                  id="custPhone"
                  v-model="rfqForm.phoneNumber"
                  :placeholder="t('institutional.phonePlaceholder')"
                />
              </div>
            </div>

            <div class="form-group">
              <label for="shippingAddr">{{ t('institutional.shippingLabel') }}</label>
              <textarea
                id="shippingAddr"
                v-model="rfqForm.shippingAddress"
                :placeholder="t('institutional.shippingPlaceholder')"
                rows="2"
              ></textarea>
            </div>

            <div class="form-group">
              <label for="rfqNotes">{{ t('institutional.notesLabel') }}</label>
              <textarea
                id="rfqNotes"
                v-model="rfqForm.notes"
                :placeholder="t('institutional.notesPlaceholder')"
                rows="2"
              ></textarea>
            </div>

            <!-- Preview items in quote -->
            <div class="quote-preview-section">
              <span class="preview-section-title">{{ t('institutional.selectedItems', { count: selectedProductsList.length }) }}</span>
              <div class="preview-items-list">
                <div v-for="item in selectedProductsList" :key="item.id" class="preview-item-row">
                  <span class="item-title-col"><strong>{{ item.title }}</strong> &nbsp;<span class="item-sku">({{ item.sku }})</span></span>
                  <span class="item-qty-col">{{ t('institutional.qty') }} {{ rfqQuantities[item.id] || 10 }}</span>
                </div>
              </div>
            </div>

            <div class="modal-footer-actions">
              <button type="button" @click="showRfqModal = false" class="btn-cancel" :disabled="submittingRfq">
                {{ t('institutional.cancel') }}
              </button>
              <button type="submit" class="btn-submit-rfq" :disabled="submittingRfq">
                <span v-if="submittingRfq" class="mini-spinner"></span>
                <span v-else>{{ t('institutional.submitQuote') }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Color tokens */
.b2b-wrapper {
  --b2b-primary: #604539;
  --b2b-secondary: #8b6f47;
  --b2b-light: #FBF7F2;
  --b2b-beige: #FDF3E6;
  --b2b-dark: #2D241E;
  --b2b-mute: #9e8272;
  --b2b-accent: #DD876E;
  --b2b-border: #EADFD3;

  background-color: var(--b2b-light);
  min-height: 100vh;
  font-family: 'Inter', sans-serif;
  color: var(--b2b-dark);
  padding-bottom: 120px; /* Spacer for bottom drawer */
}

/* 1. Global B2B Banner */
.info-banner {
  background: linear-gradient(135deg, #604539 0%, #4a3429 100%);
  color: #FFFFFF;
  padding: 10px 20px;
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--b2b-border);
  animation: slideDown 0.5s ease-out;
}

.banner-content {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  max-width: 1200px;
  margin: 0 auto;
}

.banner-badge {
  background-color: var(--b2b-accent);
  color: #FFFFFF;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 4px;
  letter-spacing: 1px;
}

/* 2. Hero Section */
.b2b-hero {
  position: relative;
  background-color: var(--b2b-beige);
  background-image: radial-gradient(circle at 10% 20%, rgba(243, 233, 218, 0.4) 0%, rgba(251, 247, 242, 0.8) 90%);
  padding: 60px 4% 50px 4%;
  text-align: center;
  border-bottom: 1px solid var(--b2b-border);
}

.b2b-hero-content {
  max-width: 850px;
  margin: 0 auto;
  position: relative;
  z-index: 2;
}

.hero-title {
  font-family: 'ZCOOL XiaoWei', serif;
  font-size: 3rem;
  color: var(--b2b-primary);
  margin-bottom: 15px;
  line-height: 1.2;
}

.hero-subtitle {
  font-size: 1.1rem;
  line-height: 1.6;
  color: #5d4037;
  margin-bottom: 25px;
}

.hero-actions-wrapper {
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
}

.hero-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
}

/* Buttons */
.btn-primary {
  background-color: var(--b2b-primary);
  color: #FFFFFF;
  border: none;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(96, 69, 57, 0.15);
}

.btn-primary:hover:not(:disabled) {
  background-color: #4a3429;
  transform: translateY(-2px);
  box-shadow: 0 6px 10px rgba(96, 69, 57, 0.25);
}

.btn-primary:disabled {
  background-color: var(--b2b-border);
  color: var(--b2b-mute);
  cursor: not-allowed;
  box-shadow: none;
}

.btn-icon {
  font-size: 18px;
}

/* 3. Main Container */
.b2b-container {
  max-width: 1300px;
  margin: 0 auto;
  padding: 40px 20px;
}

/* Category Block */
.category-block {
  margin-bottom: 50px;
  scroll-margin-top: 90px; /* Keep heading clear of any fixed header when scrolled to */
}

/* Section Navigator (right-side mini-map rail) */
.section-nav {
  position: fixed;
  top: 50%;
  right: 18px;
  transform: translateY(-50%);
  z-index: 90;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  padding: 10px 8px;
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(8px);
  border: 1px solid var(--b2b-border);
  border-radius: 30px;
  box-shadow: 0 4px 16px rgba(96, 69, 57, 0.1);
}

.section-nav-item {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  width: 100%;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 5px 4px;
}

.section-nav-label {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  color: var(--b2b-primary);
  max-width: 0;
  opacity: 0;
  overflow: hidden;
  transition: max-width 0.3s ease, opacity 0.3s ease;
}

/* Reveal all labels while hovering the rail */
.section-nav:hover .section-nav-label {
  max-width: 200px;
  opacity: 1;
}

.section-nav-dot {
  width: 9px;
  height: 9px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--b2b-border);
  transition: transform 0.25s ease, background 0.25s ease, box-shadow 0.25s ease;
}

.section-nav-item:hover .section-nav-dot {
  background: var(--b2b-secondary);
}

.section-nav-item.is-active .section-nav-dot {
  background: var(--b2b-accent);
  transform: scale(1.4);
  box-shadow: 0 0 0 4px rgba(221, 135, 110, 0.18);
}

.section-nav-item.is-active .section-nav-label {
  color: var(--b2b-accent);
}

.category-block-header {
  display: flex;
  align-items: center;
  margin-bottom: 25px;
}

.category-block-title {
  color: var(--b2b-primary);
  font-size: 1.5rem;
  font-weight: 700;
  margin-right: 20px;
  white-space: nowrap;
}

.title-line {
  flex-grow: 1;
  height: 2px;
  background-color: var(--b2b-border);
}

/* Dense structured card grid */
.dense-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 25px;
}

/* Cards */
.b2b-card {
  background-color: #FFFFFF;
  border: 1px solid var(--b2b-border);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
  transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
  position: relative;
}

.b2b-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(96, 69, 57, 0.08);
  border-color: #cbbba9;
}

.card-selected {
  border-color: var(--b2b-accent);
  box-shadow: 0 4px 15px rgba(221, 135, 110, 0.15);
}

.card-img-wrap {
  position: relative;
  padding-top: 80%; /* Consistent aspect ratio */
  background-color: var(--b2b-beige);
  border-bottom: 1px solid var(--b2b-border);
  display: flex;
  justify-content: center;
  align-items: center;
}

.card-img {
  position: absolute;
  top: 5%;
  left: 5%;
  width: 90%;
  height: 90%;
  object-fit: contain;
  transition: transform 0.4s ease;
}

.b2b-card:hover .card-img {
  transform: scale(1.05);
}

.selection-check-indicator {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 24px;
  color: var(--b2b-accent);
  background-color: #FFFFFF;
  border-radius: 50%;
  display: flex;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  z-index: 3;
}

.card-info {
  padding: 18px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.card-sku {
  font-family: monospace;
  font-size: 11px;
  color: var(--b2b-secondary);
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.card-title {
  color: var(--b2b-primary);
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.3;
  margin-top: 0;
  margin-bottom: 8px;
  min-height: 2.6rem; /* Lock title height for alignment */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-desc {
  font-size: 13px;
  color: #6B5D54;
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  padding: 12px 18px 18px 18px;
  border-top: 1px solid var(--b2b-beige);
  background-color: #FFFFFF;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Quantity selection inside card (displays when checked) */
.qty-control {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--b2b-beige);
  border: 1px solid var(--b2b-border);
  border-radius: 4px;
  padding: 4px 8px;
  animation: fadeIn 0.25s ease-out;
}

.qty-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--b2b-primary);
  text-transform: uppercase;
}

.qty-input {
  width: 70px;
  border: 1px solid var(--b2b-border);
  border-radius: 3px;
  padding: 2px 6px;
  text-align: center;
  font-weight: 600;
  color: var(--b2b-dark);
}

.qty-input:focus {
  outline: none;
  border-color: var(--b2b-primary);
}

/* RFQ Toggle button */
.btn-rfq-toggle {
  width: 100%;
  background-color: #FFFFFF;
  color: var(--b2b-primary);
  border: 1.5px solid var(--b2b-primary);
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.25s ease;
}

.btn-rfq-toggle:hover {
  background-color: var(--b2b-beige);
}

.btn-rfq-added {
  background-color: var(--b2b-accent);
  color: #FFFFFF;
  border-color: var(--b2b-accent);
}

.btn-rfq-added:hover {
  background-color: #cf7c63;
}

.rfq-checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--b2b-accent);
  cursor: pointer;
}

/* 4. Bottom Drawer B2B Panel */
.rfq-drawer {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  background-color: #FFFFFF;
  box-shadow: 0 -8px 25px rgba(96, 69, 57, 0.15);
  border-top: 2px solid var(--b2b-primary);
  z-index: 99;
}

.drawer-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
}

.drawer-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.drawer-cart-icon {
  font-size: 32px;
  color: var(--b2b-primary);
}

.drawer-info {
  display: flex;
  flex-direction: column;
}

.drawer-count {
  font-size: 16px;
  font-weight: 700;
  color: var(--b2b-primary);
}

.drawer-help {
  font-size: 12px;
  color: var(--b2b-mute);
}

.drawer-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-secondary {
  background: transparent;
  color: var(--b2b-primary);
  border: 1px solid var(--b2b-border);
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.3s;
}

.btn-secondary:hover {
  background-color: var(--b2b-beige);
}

.btn-accent {
  background-color: var(--b2b-accent);
  color: #FFFFFF;
  border: none;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 700;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
  box-shadow: 0 4px 6px rgba(221, 135, 110, 0.2);
}

.btn-accent:hover {
  background-color: #cf7c63;
  transform: translateY(-2px);
}

/* 5. Modal Overlay & Cards */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(45, 36, 30, 0.6);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  animation: fadeIn 0.3s ease;
}

.modal-card {
  background-color: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 650px;
  max-height: 90vh;
  overflow-y: auto;
  animation: scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--b2b-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--b2b-beige);
}

.modal-header h3 {
  margin: 0;
  color: var(--b2b-primary);
  font-size: 1.25rem;
  font-weight: 700;
}

.btn-close-modal {
  background: transparent;
  border: none;
  font-size: 24px;
  color: var(--b2b-primary);
  cursor: pointer;
}

.modal-body {
  padding: 24px;
}

.modal-intro-text {
  font-size: 13.5px;
  color: #6B5D54;
  line-height: 1.5;
  margin-bottom: 20px;
}

.form-row {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  margin-bottom: 15px;
}

.form-row .form-group {
  flex: 1;
  min-width: 250px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 15px;
}

.form-group label {
  font-size: 12px;
  font-weight: 700;
  color: var(--b2b-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-group input,
.form-group textarea {
  border: 1px solid var(--b2b-border);
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 14px;
  color: var(--b2b-dark);
  background-color: var(--b2b-light);
  transition: border-color 0.3s;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--b2b-accent);
  background-color: #FFFFFF;
}

.modal-error-banner {
  background-color: #fcebeb;
  border: 1px solid #f7c8c8;
  color: #b03a3a;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 500;
}

/* Quote preview list */
.quote-preview-section {
  margin-top: 25px;
  border: 1px solid var(--b2b-border);
  border-radius: 6px;
  overflow: hidden;
}

.preview-section-title {
  display: block;
  background-color: var(--b2b-beige);
  color: var(--b2b-primary);
  font-size: 11px;
  font-weight: 700;
  padding: 8px 12px;
  border-bottom: 1px solid var(--b2b-border);
  text-transform: uppercase;
}

.preview-items-list {
  max-height: 140px;
  overflow-y: auto;
  padding: 5px 0;
  background-color: #FFFFFF;
}

.preview-item-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  font-size: 13px;
  border-bottom: 1px dashed var(--b2b-beige);
}

.preview-item-row:last-child {
  border-bottom: none;
}

.item-sku {
  color: var(--b2b-secondary);
  font-family: monospace;
}

.item-qty-col {
  font-weight: 600;
  color: var(--b2b-primary);
}

.modal-footer-actions {
  margin-top: 25px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-cancel {
  background-color: transparent;
  color: #6B5D54;
  border: 1px solid var(--b2b-border);
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}

.btn-cancel:hover {
  background-color: var(--b2b-light);
}

.btn-submit-rfq {
  background-color: var(--b2b-primary);
  color: #FFFFFF;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-submit-rfq:hover:not(:disabled) {
  background-color: #4a3429;
}

.btn-submit-rfq:disabled {
  background-color: var(--b2b-border);
  color: var(--b2b-mute);
  cursor: not-allowed;
}

/* Success state modal styling */
.success-state {
  text-align: center;
  padding: 40px 20px;
}

.success-icon {
  font-size: 64px;
  color: #2e9a52;
  margin-bottom: 15px;
}

.success-subtitle {
  font-size: 14px;
  color: #6B5D54;
  margin-top: 8px;
}

.order-ref-box {
  background-color: var(--b2b-beige);
  border: 1px solid var(--b2b-border);
  padding: 12px;
  border-radius: 6px;
  display: inline-flex;
  flex-direction: column;
  margin: 20px 0;
}

.ref-label {
  font-size: 11px;
  text-transform: uppercase;
  color: var(--b2b-secondary);
  font-weight: 600;
}

.ref-id {
  font-size: 16px;
  font-weight: bold;
  color: var(--b2b-primary);
  font-family: monospace;
  margin-top: 4px;
}

.success-footer {
  font-size: 12px;
  color: var(--b2b-mute);
}

.btn-modal-close-action {
  background-color: var(--b2b-primary);
  color: #FFFFFF;
  border: none;
  padding: 10px 30px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  margin-top: 15px;
}

/* 6. Utility States */
.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--b2b-border);
  border-top-color: var(--b2b-primary);
  border-radius: 50%;
  animation: spin 1s infinite linear;
}

.mini-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--b2b-border);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s infinite linear;
}

.state-text {
  font-size: 14px;
  color: var(--b2b-secondary);
  margin-top: 15px;
}

.error-card {
  background-color: #FFFFFF;
  border: 1px solid #f7c8c8;
  border-radius: 8px;
  max-width: 500px;
  margin: 40px auto;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.error-icon {
  font-size: 48px;
  color: #b03a3a;
}

.btn-retry {
  background-color: var(--b2b-primary);
  color: #FFFFFF;
  border: none;
  padding: 8px 18px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 15px;
}

/* Transitions */
.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.35s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateY(100%);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

/* Keyframes */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes slideDown {
  from { transform: translateY(-100%); }
  to { transform: translateY(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleUp {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* Responsive adjustment */
@media (max-width: 768px) {
  .hero-title { font-size: 2.2rem; }
  .hero-subtitle { font-size: 0.95rem; }
  .drawer-container { flex-direction: column; text-align: center; }
  .drawer-left { flex-direction: column; gap: 5px; }
  .drawer-right { width: 100%; justify-content: center; }
}

/* The mini-map rail needs horizontal room; hide it on smaller screens */
@media (max-width: 1024px) {
  .section-nav { display: none; }
}
</style>
