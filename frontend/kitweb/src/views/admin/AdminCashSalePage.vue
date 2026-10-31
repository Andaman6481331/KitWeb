<script setup>
// Cash Sale, in the admin design language: a walk-in point of sale. Staff key in items
// (type, price, quantity), take payment, and "Print & save" writes the sale to the
// database and then prints the two-copy receipt. Checkout shows that receipt on screen
// first so staff can check it, and picks the language of the customer copy. The cart,
// the keyboard flow and the copy live here and in utils/adminCashSale*.js; the receipt
// itself is components/admin/CashReceipt.vue.
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { api } from '../../services/api';
import generatePayload from 'promptpay-qr';
import QRCode from 'qrcode';
import CashReceipt from '../../components/admin/CashReceipt.vue';
import { useAdminLang } from '../../composables/useAdminLang';
import { useAdminSession } from '../../composables/useAdminSession';
import { cashSaleText } from '../../utils/adminCashSaleText';
import {
  CASH_TYPES, frequentTypes, matchTypes, money, sanitizePrice, sanitizeQty, lineTotal, cartTotal, pieceCount,
  changeDue, quickAmounts, addLine as addToCart, removeLine, setLineQty, restoreLine, salePayload, saleFromRecord, newClientId, localDay,
  clockTime, readJson, writeJson, pushSale, todaysSales, salesTotal, SALES_KEY, LAST_PRICES_KEY, COPY_LANG_KEY,
  NEW_NAMES_KEY, NAME_MAX, addNewName, bumpNameUse, customTypes,
} from '../../utils/adminCashSale';

// ⚠️ Replace with the shop's real PromptPay mobile number (e.g. '0812345678').
const PROMPTPAY_ID = '0894886877';

const { lang, isThai, setLang } = useAdminLang();
const { handleAuthError } = useAdminSession();
const t = computed(() => cashSaleText(lang.value));

// --- Where the sale is: items -> checkout -> done ---
const stage = ref('entry');
let stageChangedAt = 0;
const setStage = (next) => {
  stageChangedAt = Date.now();
  stage.value = next;
};
const stepIndex = computed(() => ({ entry: 0, checkout: 1, done: 2 })[stage.value]);

// --- Entry: the three boxes ---
const q = ref(''); // what is typed in the Type box
const picked = ref(null); // the chosen type, once there is one
const price = ref('');
const qty = ref('1');
const hl = ref(0); // highlighted match
const focus = ref('type');

const cart = ref([]); // [{ k, name, price, qty }]
let nextKey = 1;
const lastPrices = ref({}); // name -> the price it last sold at, on this browser
const sales = ref([]); // saved sales, newest first, kept in this browser
const lastSale = ref(null); // the sale just saved, shown on the Done screen

const priceNum = computed(() => parseFloat(price.value) || 0);
const qtyNum = computed(() => parseInt(qty.value, 10) || 0);

const newNames = ref([]); // every name added at the till, newest first, kept in this browser
const allTypes = computed(() => [...CASH_TYPES, ...customTypes(newNames.value)]);
const list = computed(() => matchTypes(picked.value ? '' : q.value, allTypes.value));
const searching = computed(() => !picked.value && q.value.trim() !== '');
const hlIndex = computed(() => Math.min(hl.value, Math.max(0, list.value.length - 1)));
const frequent = frequentTypes();

const lastPrice = computed(() => (picked.value ? lastPrices.value[picked.value.name] : null));
const addOff = computed(() => !picked.value || !(priceNum.value > 0) || !(qtyNum.value >= 1));
const previewReady = computed(() => picked.value && priceNum.value > 0 && qtyNum.value > 0);
const previewLine = computed(() => (previewReady.value
  ? `${picked.value.name} · ${money(priceNum.value)} × ${qtyNum.value} = ${money(priceNum.value * qtyNum.value)}`
  : t.value.idleLine));

const keyHints = computed(() => {
  const x = t.value;
  if (focus.value === 'price') return [['↵', x.keyToQty], ['⇧ ↵', x.keyAddNow], ['Esc', x.keyClear]];
  if (focus.value === 'qty') return [['↵', x.keyAddToCart], ['↑ ↓', x.keyChangeQty]];
  return [['↵', x.keyPickType], ['↑ ↓', x.keyMoveInList], ['↵', x.keyEmptyCheckout], ['Esc', x.keyClear]];
});

const focusEl = (id) => nextTick(() => {
  const el = document.getElementById(id);
  if (!el) return;
  el.focus();
  if (el.tagName === 'INPUT') el.select();
});

// The highlighted match follows the arrow keys even when the list scrolls.
watch(hlIndex, () => nextTick(() => {
  document.querySelector('#cs-types [aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
}));

// --- Toast (also carries "Undo" for a removed line) ---
const toast = ref(null); // { message, undo?: line, error?: true }
let toastTimer;
const flash = (message, ms = 3500, extra = {}) => {
  clearTimeout(toastTimer);
  toast.value = { message, ...extra };
  toastTimer = setTimeout(() => { toast.value = null; }, ms);
};

const pickType = (type) => {
  picked.value = type;
  q.value = type.name;
  price.value = lastPrices.value[type.name] ? String(lastPrices.value[type.name]) : '';
  qty.value = '1';
  hl.value = 0;
  focusEl('cs-price');
};

const clearEntry = () => {
  q.value = '';
  picked.value = null;
  price.value = '';
  qty.value = '1';
  hl.value = 0;
};

const onQ = (e) => {
  q.value = e.target.value;
  picked.value = null;
  hl.value = 0;
  price.value = '';
};
// A controlled box: write the cleaned text back, or a rejected letter would stay on screen.
const onPrice = (e) => { price.value = e.target.value = sanitizePrice(e.target.value); };
const onQty = (e) => { qty.value = e.target.value = sanitizeQty(e.target.value); };

const onTypeKey = (e) => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const n = list.value.length;
    if (n) hl.value = (hlIndex.value + (e.key === 'ArrowDown' ? 1 : n - 1)) % n;
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (picked.value) focusEl('cs-price');
    else if (q.value.trim()) {
      const match = list.value[hlIndex.value];
      if (match) pickType(match);
      else openNameDialog();
    } else if (cart.value.length) goCheckout();
  } else if (e.key === 'Escape') {
    clearEntry();
  }
};

const onPriceKey = (e) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  if (!(priceNum.value > 0)) return flash(t.value.priceAbove);
  if (e.shiftKey) addLine(1);
  else focusEl('cs-qty');
};

const onQtyKey = (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addLine();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    qty.value = String(qtyNum.value + 1);
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    qty.value = String(Math.max(1, qtyNum.value - 1));
  }
};

const addLine = (qtyOverride) => {
  const amount = qtyOverride || qtyNum.value;
  if (!picked.value) { flash(t.value.pickTypeFirst); focusEl('cs-type'); return; }
  if (!(priceNum.value > 0)) { flash(t.value.priceAbove); focusEl('cs-price'); return; }
  if (!(amount >= 1)) { flash(t.value.qtyMin); focusEl('cs-qty'); return; }
  cart.value = addToCart(cart.value, { k: nextKey++, name: picked.value.name, price: priceNum.value, qty: amount, custom: Boolean(picked.value.custom) });
  lastPrices.value = { ...lastPrices.value, [picked.value.name]: priceNum.value };
  writeJson(LAST_PRICES_KEY, lastPrices.value);
  if (picked.value.custom) {
    newNames.value = bumpNameUse(readJson(NEW_NAMES_KEY, newNames.value), picked.value.name);
    writeJson(NEW_NAMES_KEY, newNames.value);
  }
  clearEntry();
  toast.value = null;
  focusEl('cs-type');
};

// --- Cart ---
const saleOver = computed(() => stage.value === 'done' && lastSale.value);
const shownItems = computed(() => (saleOver.value
  ? lastSale.value.items.map((l, i) => ({ k: `done-${i}`, ...l }))
  : cart.value));
const editable = computed(() => stage.value === 'entry');
const total = computed(() => (saleOver.value ? lastSale.value.total : cartTotal(cart.value)));
const pieces = computed(() => pieceCount(shownItems.value));

const dropLine = (line) => {
  cart.value = removeLine(cart.value, line.k);
  flash(t.value.removed(line.name), 6000, { undo: line });
};
const stepQty = (line, by) => {
  if (line.qty + by < 1) dropLine(line);
  else cart.value = setLineQty(cart.value, line.k, line.qty + by);
};
const editLine = (line) => {
  const type = allTypes.value.find((x) => x.name === line.name) || { name: line.name, sc: '', freq: false };
  cart.value = removeLine(cart.value, line.k);
  picked.value = type;
  q.value = type.name;
  price.value = String(line.price);
  qty.value = String(line.qty);
  focusEl('cs-price');
};
const undoRemove = () => {
  const line = toast.value?.undo;
  if (!line) return;
  cart.value = restoreLine(cart.value, line);
  toast.value = null;
};

// --- Live PromptPay QR for the cart's total ---
const qrDataUrl = ref('');
let qrRun = 0;

const makeQr = async (amount) => {
  try {
    return await QRCode.toDataURL(generatePayload(PROMPTPAY_ID, { amount }), { margin: 1, width: 240 });
  } catch {
    return '';
  }
};

watch(total, async (amount) => {
  const run = ++qrRun;
  const url = amount > 0 ? await makeQr(amount) : '';
  if (run === qrRun) qrDataUrl.value = url;
}, { immediate: true });

// --- Checkout ---
const received = ref('');
const note = ref('');
const checkoutAt = ref('');
const saveError = ref(null); // null, or the Worker's message (possibly empty) after a failed save
const saving = ref(false);

const receivedNum = computed(() => parseFloat(received.value) || 0);
const change = computed(() => changeDue(receivedNum.value, total.value));
const paidInFull = computed(() => receivedNum.value > 0 && receivedNum.value >= total.value);
const quick = computed(() => quickAmounts(total.value).map((a) => ({
  value: a.value,
  label: a.kind === 'exact' ? t.value.exact(money(a.value)) : money(a.value),
})));

const onReceived = (e) => { received.value = e.target.value = sanitizePrice(e.target.value); };

// Language of the customer copy. Remembered on this device; the shop copy is always Thai.
const copyLang = ref('th');
const setCopyLang = (next) => {
  copyLang.value = next;
  writeJson(COPY_LANG_KEY, next);
};

// What the on-screen receipt shows while the sale is still a cart: same shape as the
// printed one, with the invoice number still to come.
const previewReceipt = computed(() => ({
  ref: 'INV-······',
  at: checkoutAt.value,
  items: cart.value.map(({ name, price: unit, qty: count }) => ({ name, price: unit, qty: count })),
  total: total.value,
  note: note.value.trim(),
  qr: qrDataUrl.value,
}));

// The receipt is laid out at the printed sheet's size; the preview scales that to the column.
const SHEET_W = 794; // an A5 landscape sheet at 96 dpi
const wrapEl = ref(null);
const sheetEl = ref(null);
const sheetScale = ref(1);
const sheetHeight = ref(0);
const sheetLeft = ref(0);
const SHEET_MAT = 14; // the mat's padding around the sheet, px
let sheetObserver;
const fitSheet = () => {
  if (!wrapEl.value || !sheetEl.value) return;
  const width = wrapEl.value.clientWidth;
  const scale = Math.min(1, (width - 2 * SHEET_MAT) / SHEET_W);
  sheetScale.value = scale;
  sheetLeft.value = Math.max(0, (width - SHEET_W * scale) / 2);
  sheetHeight.value = Math.ceil(sheetEl.value.offsetHeight * scale + 2 * SHEET_MAT);
};
watch([wrapEl, sheetEl], () => {
  sheetObserver?.disconnect();
  if (!wrapEl.value || !sheetEl.value) return;
  fitSheet();
  if (typeof ResizeObserver === 'undefined') return;
  sheetObserver = new ResizeObserver(fitSheet);
  sheetObserver.observe(wrapEl.value);
  sheetObserver.observe(sheetEl.value);
}, { flush: 'post' });

// One id per checkout, sent with the sale: if the answer is lost and Print & save is pressed
// again, the Worker returns the sale it already has instead of saving a second one.
let saleId = '';

const goCheckout = () => {
  if (!cart.value.length) return;
  saleId = newClientId();
  received.value = '';
  note.value = '';
  saveError.value = null;
  checkoutAt.value = new Date().toLocaleString();
  setStage('checkout');
  focusEl('cs-checkout');
};

const backToItems = () => {
  setStage('entry');
  focusEl('cs-type');
};

// --- Receipt (the print layout reads this, never the live cart) ---
const receipt = ref({ ref: '', at: '', items: [], total: 0, note: '', qr: '', lang: 'th' });

const printSale = async (sale) => {
  receipt.value = {
    lang: sale.copyLang === 'en' ? 'en' : 'th',
    ref: sale.ref,
    at: new Date(sale.savedAt).toLocaleString(),
    items: sale.items,
    total: sale.total,
    note: sale.note,
    qr: await makeQr(sale.total),
  };
  await nextTick();
  // let the receipt render before the print dialog opens
  requestAnimationFrame(() => window.print());
};

// --- Print & save: the sale is saved first; if that fails, nothing prints ---
const confirmSale = async () => {
  if (stage.value !== 'checkout' || !cart.value.length || saving.value) return;
  saving.value = true;
  saveError.value = null;
  let sale;
  try {
    const saleTotal = cartTotal(cart.value);
    const result = await api.submitCashSale(salePayload(cart.value, {
      clientId: saleId,
      received: receivedNum.value >= saleTotal ? receivedNum.value : null,
      note: note.value.trim(),
      copyLang: copyLang.value,
    }));
    sale = saleFromRecord(result.sale);
  } catch (e) {
    saving.value = false;
    // A rejected session sends the whole admin back to the sign-in; anything else shows here.
    if (!handleAuthError(e)) saveError.value = e.message || '';
    return;
  }
  sales.value = pushSale(readJson(SALES_KEY, sales.value), sale);
  writeJson(SALES_KEY, sales.value);
  lastSale.value = sale;
  cart.value = [];
  saving.value = false;
  setStage('done');
  focusEl('cs-done');
  printSale(sale);
};

const reprint = (sale) => printSale(sale);

// Today's sales come from the shop's database, so every till sees the same list. The copy kept
// on this device is what shows if the Worker can't be reached.
const salesOffline = ref(false);
const loadSales = async () => {
  try {
    const { sales: rows } = await api.listCashSales(localDay());
    sales.value = rows.map(saleFromRecord);
    writeJson(SALES_KEY, sales.value);
    salesOffline.value = false;
  } catch (e) {
    if (!handleAuthError(e)) salesOffline.value = true;
  }
};

const newSale = () => {
  cart.value = [];
  lastSale.value = null;
  received.value = '';
  note.value = '';
  clearEntry();
  setStage('entry');
  focusEl('cs-type');
};

const mainAction = () => {
  if (stage.value === 'entry') goCheckout();
  else if (stage.value === 'checkout') confirmSale();
  else newSale();
};
const mainLabel = computed(() => (stage.value === 'entry' ? t.value.checkout : stage.value === 'checkout' ? t.value.printSave : t.value.newSale));
const mainHint = computed(() => (stage.value === 'entry' ? t.value.hintEntry : stage.value === 'checkout' ? t.value.hintCheckout : t.value.hintDone));
const mainOff = computed(() => stage.value !== 'done' && (cart.value.length === 0 || saving.value));

// --- New product names: a small dialog, then the name is picked like any type ---
const nameDialog = ref(false);
const nameDraft = ref('');
const nameError = ref('');

const openNameDialog = () => {
  nameDraft.value = picked.value ? '' : q.value.trim();
  nameError.value = '';
  nameDialog.value = true;
  focusEl('cs-newname');
};

const closeNameDialog = () => {
  nameDialog.value = false;
  focusEl('cs-type');
};

const confirmName = () => {
  const out = addNewName(readJson(NEW_NAMES_KEY, newNames.value), nameDraft.value);
  if (!out.type) {
    nameError.value = t.value.nameEmpty;
    focusEl('cs-newname');
    return;
  }
  if (out.isNew) {
    newNames.value = out.records;
    writeJson(NEW_NAMES_KEY, newNames.value);
  }
  nameDialog.value = false;
  pickType(out.type);
  flash(out.isNew ? t.value.nameAdded(out.type.name) : t.value.nameExists(out.type.name));
};

const onNameKey = (e) => {
  if (e.key === 'Enter') { e.preventDefault(); confirmName(); }
  else if (e.key === 'Escape') { e.preventDefault(); closeNameDialog(); }
};

const nameRows = computed(() => newNames.value.map((r) => ({
  ...r,
  when: new Date(r.addedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    + ` ${clockTime(new Date(r.addedAt))}`,
})));

const copyNames = async () => {
  try {
    await navigator.clipboard.writeText(newNames.value.map((r) => r.name).join('\n'));
    flash(t.value.namesCopied);
  } catch {
    flash(t.value.namesCopyFailed, 5000, { error: true });
  }
};

// --- Records sidebar: today's sales and the new names ---
const panelOpen = ref(false);
const closePanel = () => {
  panelOpen.value = false;
  focusEl('cs-records-btn');
};
watch(panelOpen, (open) => {
  if (!open) return;
  focusEl('cs-records-close');
  loadSales();
});

// --- Today's sales on this till ---
const todays = computed(() => todaysSales(sales.value));
const todayRows = computed(() => todays.value.map((sale) => ({
  sale,
  time: clockTime(new Date(sale.savedAt)),
  pieces: pieceCount(sale.items),
})));

// --- Keys that work anywhere on the page, per stage ---
const onWindowKey = (e) => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  // with the sidebar open the keys belong to it, not to the sale behind it
  if (panelOpen.value) {
    if (e.key === 'Escape' && !nameDialog.value) closePanel();
    return;
  }
  // the Enter that moved to a new stage must not also act on it
  if (Date.now() - stageChangedAt < 300) return;
  const tag = e.target?.tagName;
  const typing = tag === 'INPUT' || tag === 'TEXTAREA';
  if (stage.value === 'checkout') {
    if (e.key === 'Enter' && tag !== 'BUTTON') { e.preventDefault(); confirmSale(); }
    else if (e.key === 'Escape') backToItems();
  } else if (stage.value === 'done') {
    if (e.key === 'Enter' && tag !== 'BUTTON') { e.preventDefault(); newSale(); }
    else if (!typing && (e.key === 'r' || e.key === 'R') && lastSale.value) reprint(lastSale.value);
  }
};

onMounted(() => {
  sales.value = readJson(SALES_KEY, []);
  lastPrices.value = readJson(LAST_PRICES_KEY, {});
  newNames.value = readJson(NEW_NAMES_KEY, []);
  copyLang.value = readJson(COPY_LANG_KEY, 'th') === 'en' ? 'en' : 'th';
  loadSales();
  window.addEventListener('keydown', onWindowKey);
  focusEl('cs-type');
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onWindowKey);
  sheetObserver?.disconnect();
  clearTimeout(toastTimer);
});
</script>

<template>
  <div class="adm-page cs-page">
    <div class="cs-screen no-print">
      <div class="adm-head">
        <div class="adm-head-text">
          <h1 class="adm-title adm-serif">{{ t.title }}</h1>
          <div class="adm-sub">{{ t.subtitle }}</div>
        </div>
        <div class="adm-actions">
          <ol class="cs-steps" :aria-label="t.stepsAria">
            <li
              v-for="(label, i) in t.steps"
              :key="i"
              class="cs-step"
              :class="{ 'is-on': i === stepIndex, 'is-past': i < stepIndex }"
              :aria-current="i === stepIndex ? 'step' : null"
            ><span class="cs-step-num">{{ i + 1 }}</span>{{ label }}</li>
          </ol>
          <button id="cs-records-btn" type="button" class="adm-btn cs-records-btn" :aria-expanded="panelOpen" aria-controls="cs-records" @click="panelOpen = !panelOpen">
            {{ t.records }}<span class="cs-count">{{ todays.length + newNames.length }}</span>
          </button>
          <div role="group" aria-label="Language" class="adm-seg">
            <button type="button" class="adm-seg-btn is-lang" :class="{ 'is-on': !isThai }" :aria-pressed="!isThai" @click="setLang('en')">EN</button>
            <button type="button" class="adm-seg-btn is-lang" :class="{ 'is-on': isThai }" :aria-pressed="isThai" @click="setLang('th')">ไทย</button>
          </div>
        </div>
      </div>

      <div class="cs-grid">
        <!-- LEFT: entry / checkout / done, then today's sales -->
        <div class="cs-main">
          <!-- ENTRY -->
          <section v-if="stage === 'entry'" class="cs-card cs-pad">
            <div class="cs-fields">
              <div>
                <label for="cs-type" class="cs-label"><span class="cs-num" :class="{ 'is-active': focus === 'type', 'is-done': picked }">1</span>{{ t.fType }}</label>
                <input
                  id="cs-type"
                  class="cs-in"
                  :class="{ 'is-done': picked }"
                  autocomplete="off"
                  role="combobox"
                  :aria-expanded="!picked"
                  :aria-controls="picked ? null : 'cs-types'"
                  :placeholder="t.typePh"
                  :value="q"
                  @input="onQ"
                  @keydown="onTypeKey"
                  @focus="focus = 'type'"
                />
              </div>
              <div>
                <label for="cs-price" class="cs-label"><span class="cs-num" :class="{ 'is-active': focus === 'price', 'is-done': priceNum > 0 }">2</span>{{ t.fPrice }}</label>
                <input
                  id="cs-price"
                  class="cs-in cs-nums"
                  :class="{ 'is-done': priceNum > 0 }"
                  inputmode="decimal"
                  autocomplete="off"
                  placeholder="0"
                  :value="price"
                  @input="onPrice"
                  @keydown="onPriceKey"
                  @focus="focus = 'price'"
                />
                <div v-if="lastPrice" class="cs-sub">{{ t.lastPrice(money(lastPrice)) }}</div>
              </div>
              <div>
                <label for="cs-qty" class="cs-label"><span class="cs-num" :class="{ 'is-active': focus === 'qty', 'is-done': priceNum > 0 && qtyNum > 0 }">3</span>{{ t.fQty }}</label>
                <input
                  id="cs-qty"
                  class="cs-in cs-nums"
                  :class="{ 'is-done': priceNum > 0 && qtyNum > 0 }"
                  inputmode="numeric"
                  autocomplete="off"
                  :value="qty"
                  @input="onQty"
                  @keydown="onQtyKey"
                  @focus="focus = 'qty'"
                />
              </div>
            </div>

            <div class="cs-addrow">
              <div class="cs-preview" :class="{ 'is-ready': previewReady }">{{ previewLine }}</div>
              <button type="button" class="adm-btn adm-btn-primary" :disabled="addOff" @click="addLine()">
                {{ t.add }} <kbd class="cs-kbd is-inverse">↵</kbd>
              </button>
            </div>

            <div v-if="!picked" id="cs-types" role="listbox" class="cs-types">
              <template v-if="searching">
                <div class="cs-types-head">
                  <div class="cs-sub">{{ t.matches }} · <kbd class="cs-kbd">↑</kbd> <kbd class="cs-kbd">↓</kbd> {{ t.toChoose }}, <kbd class="cs-kbd">↵</kbd> {{ t.toPick }}</div>
                  <button type="button" class="adm-btn cs-btn-small cs-add-name" @click="openNameDialog">+ {{ t.addName }}</button>
                </div>
                <div class="cs-chips cs-chips-scroll">
                  <button
                    v-for="(c, i) in list"
                    :key="c.name"
                    type="button"
                    role="option"
                    class="cs-chip"
                    :class="{ 'is-hl': i === hlIndex }"
                    :aria-selected="i === hlIndex"
                    @click="pickType(c)"
                  >{{ c.name }}<span v-if="c.sc" class="cs-chip-sc">{{ c.sc }}</span><span v-if="c.custom" class="cs-chip-new">{{ t.newBadge }}</span></button>
                </div>
                <div v-if="list.length === 0" class="cs-nomatch">{{ t.noMatchAdd(q) }}</div>
              </template>
              <template v-else>
                <div class="cs-types-head">
                  <div class="cs-eyebrow">{{ t.frequent }}</div>
                  <button type="button" class="adm-btn cs-btn-small cs-add-name" @click="openNameDialog">+ {{ t.addName }}</button>
                </div>
                <div class="cs-chips">
                  <button v-for="c in frequent" :key="c.name" type="button" role="option" class="cs-chip" @click="pickType(c)">{{ c.name }}</button>
                </div>
              </template>
            </div>

            <div class="cs-keys">
              <span v-for="(k, i) in keyHints" :key="i"><kbd class="cs-kbd">{{ k[0] }}</kbd> {{ k[1] }}</span>
            </div>
          </section>

          <!-- CHECKOUT -->
          <section v-if="stage === 'checkout'" id="cs-checkout" tabindex="-1" class="cs-card cs-pad cs-bare">
            <div class="cs-preview-head">
              <div>
                <h2 class="cs-h2 adm-serif">{{ t.checkReceipt }}</h2>
                <div class="adm-sub">{{ t.checkReceiptSub }}</div>
              </div>
              <div class="cs-copy-tags">
                <span class="cs-tag">{{ t.shopCopy }} · {{ t.alwaysThai }}</span>
                <span class="cs-tag is-on">{{ t.customerCopy }} · {{ copyLang === 'en' ? t.langEnglish : t.langThai }}</span>
              </div>
            </div>
            <div ref="wrapEl" class="cs-sheet-wrap" :style="{ height: sheetHeight ? `${sheetHeight}px` : undefined }">
              <div ref="sheetEl" class="cs-sheet" :style="{ width: `${SHEET_W}px`, transform: `translate(${sheetLeft}px, ${SHEET_MAT}px) scale(${sheetScale})` }">
                <CashReceipt :receipt="previewReceipt" :copy-lang="copyLang" />
              </div>
            </div>
            <div class="cs-sub">{{ t.refNote }}</div>
          </section>

          <!-- DONE -->
          <section v-if="stage === 'done' && lastSale" id="cs-done" tabindex="-1" class="cs-card cs-pad cs-bare cs-done">
            <div class="cs-done-head">
              <span class="cs-tick" aria-hidden="true">✓</span>
              <div>
                <h2 class="cs-h2 adm-serif">{{ t.saved }}</h2>
                <div class="cs-muted">{{ lastSale.ref }} · {{ new Date(lastSale.savedAt).toLocaleString() }}</div>
              </div>
            </div>
            <div class="cs-done-figures">
              <div>
                <div class="adm-sub">{{ t.total }}</div>
                <div class="cs-big adm-serif cs-nums">{{ money(lastSale.total) }}</div>
              </div>
              <template v-if="lastSale.received > 0">
                <div>
                  <div class="adm-sub">{{ t.received }}</div>
                  <div class="cs-mid cs-nums">{{ money(lastSale.received) }}</div>
                </div>
                <div>
                  <div class="adm-sub">{{ t.change }}</div>
                  <div class="cs-mid cs-nums cs-ok">{{ money(changeDue(lastSale.received, lastSale.total)) }}</div>
                </div>
              </template>
            </div>
            <div class="cs-buttons">
              <button type="button" class="adm-btn adm-btn-primary cs-btn-big" @click="newSale">{{ t.newSale }} <kbd class="cs-kbd is-inverse">↵</kbd></button>
              <button type="button" class="adm-btn cs-btn-big" @click="reprint(lastSale)">{{ t.reprint }} <kbd class="cs-kbd">R</kbd></button>
            </div>
          </section>
        </div>

        <!-- RIGHT: cart (sticky) and QR -->
        <aside class="cs-aside" :class="{ 'is-checkout': stage === 'checkout' }">
          <!-- CHECKOUT: language, note, change, then print -->
          <section v-if="stage === 'checkout'" class="cs-card cs-pad-cart cs-pay">
            <div class="cs-pay-total">
              <b>{{ t.total }}</b>
              <b class="cs-total-amount adm-serif cs-nums">{{ money(total) }}</b>
            </div>

            <div class="cs-block">
              <div class="cs-label-plain" id="cs-lang-label">{{ t.copyLang }}</div>
              <div role="group" aria-labelledby="cs-lang-label" class="adm-seg cs-seg-wide">
                <button type="button" class="adm-seg-btn" :class="{ 'is-on': copyLang === 'th' }" :aria-pressed="copyLang === 'th'" @click="setCopyLang('th')">{{ t.langThai }}</button>
                <button type="button" class="adm-seg-btn" :class="{ 'is-on': copyLang === 'en' }" :aria-pressed="copyLang === 'en'" @click="setCopyLang('en')">{{ t.langEnglish }}</button>
              </div>
              <div class="cs-sub">{{ t.copyLangHelp }}</div>
            </div>

            <div class="cs-block">
              <label for="cs-note" class="cs-label-plain">{{ t.note }} <span class="cs-opt">· {{ t.optional }}</span></label>
              <input id="cs-note" v-model="note" class="cs-in cs-in-small" autocomplete="off" :placeholder="t.notePh" />
            </div>

            <div class="cs-block cs-cash">
              <label for="cs-recv" class="cs-label-plain">{{ t.received }} <span class="cs-opt">· {{ t.optional }}</span></label>
              <div class="cs-pair">
                <input id="cs-recv" class="cs-in cs-in-small cs-nums" inputmode="decimal" autocomplete="off" placeholder="0" :value="received" @input="onReceived" />
                <div class="cs-change" :class="{ 'is-ok': paidInFull }">
                  <span class="cs-small">{{ t.change }}</span>
                  <span class="cs-change-amount adm-serif cs-nums">{{ money(change) }}</span>
                </div>
              </div>
              <div class="cs-chips cs-quick">
                <button v-for="c in quick" :key="c.label" type="button" class="cs-chip" @click="received = String(c.value)">{{ c.label }}</button>
              </div>
              <div class="cs-sub">{{ t.receivedHelp }}</div>
            </div>

            <div v-if="saveError !== null" class="adm-error cs-save-error" role="alert">{{ t.saveFailed }} {{ saveError }}</div>

            <button type="button" class="adm-btn adm-btn-primary cs-main-btn" :disabled="mainOff" @click="confirmSale">
              {{ saving ? t.saving : t.printSave }} <kbd v-if="!saving" class="cs-kbd is-inverse">↵</kbd>
            </button>
            <button type="button" class="adm-btn cs-back-btn" :disabled="saving" @click="backToItems">{{ t.backItems }} <kbd class="cs-kbd">Esc</kbd></button>
            <div class="cs-main-hint">{{ t.confirmNote }}</div>
          </section>

          <section v-else class="cs-card cs-pad-cart">
            <div class="cs-cart-head">
              <h2 class="cs-h3 adm-serif">{{ saleOver ? t.sold : t.cart }}</h2>
              <span v-if="pieces" class="adm-sub">{{ t.cartCount(shownItems.length, pieces) }}</span>
            </div>

            <div v-if="shownItems.length === 0" class="cs-empty">{{ t.noItems }}</div>

            <div class="cs-lines">
              <div v-for="l in shownItems" :key="l.k" class="cs-row cs-line">
                <div class="cs-line-name">
                  <div class="cs-line-title">{{ l.name }}</div>
                  <div class="cs-nums cs-line-unit">{{ money(l.price) }} {{ t.each }}</div>
                </div>
                <div v-if="editable" class="cs-stepper">
                  <button type="button" class="cs-sq" :aria-label="t.minus" @click="stepQty(l, -1)">−</button>
                  <span class="cs-nums cs-stepper-qty">{{ l.qty }}</span>
                  <button type="button" class="cs-sq" :aria-label="t.plus" @click="stepQty(l, 1)">+</button>
                </div>
                <span v-else class="cs-nums cs-fixed-qty">× {{ l.qty }}</span>
                <b class="cs-nums cs-line-total">{{ money(lineTotal(l)) }}</b>
                <div v-if="editable" class="cs-line-actions">
                  <button type="button" class="cs-sq is-edit" :aria-label="t.edit" :title="t.edit" @click="editLine(l)">✎</button>
                  <button type="button" class="cs-sq is-remove" :aria-label="t.remove" :title="t.remove" @click="dropLine(l)">✕</button>
                </div>
              </div>
            </div>

            <div class="cs-total-row">
              <b>{{ t.total }}</b>
              <b class="cs-total-amount adm-serif cs-nums">{{ money(total) }}</b>
            </div>

            <button type="button" class="adm-btn adm-btn-primary cs-main-btn" :disabled="mainOff" @click="mainAction">
              {{ mainLabel }} <kbd class="cs-kbd is-inverse">↵</kbd>
            </button>
            <div class="cs-main-hint">{{ mainHint }}</div>
          </section>

          <section v-if="stage === 'entry' && total > 0 && qrDataUrl" class="cs-card cs-qr">
            <div class="cs-qr-head"><span>PromptPay</span><span class="cs-nums cs-brand">{{ money(total) }}</span></div>
            <img :src="qrDataUrl" alt="PromptPay QR" class="cs-qr-img" />
            <div class="cs-small">{{ t.scan }}</div>
          </section>
        </aside>
      </div>
    </div>

    <div v-if="panelOpen" class="cs-scrim is-side no-print" @mousedown.self="closePanel">
      <aside id="cs-records" class="cs-drawer" role="dialog" aria-modal="true" aria-labelledby="cs-records-title">
        <div class="cs-drawer-head">
          <h2 id="cs-records-title" class="cs-h2 adm-serif">{{ t.records }}</h2>
          <button id="cs-records-close" type="button" class="adm-btn cs-btn-small" @click="closePanel">{{ t.close }} <kbd class="cs-kbd">Esc</kbd></button>
        </div>
    <!-- TODAY'S SALES -->
    <section class="cs-card cs-pad-sm cs-panel-sec">
      <div class="cs-today-head">
        <div>
          <h2 class="cs-h3 adm-serif">{{ t.today }}</h2>
          <div class="adm-sub">{{ salesOffline ? t.salesOffline : t.todayNote }}</div>
        </div>
        <div v-if="todays.length" class="cs-muted">{{ t.salesSummary(todays.length, money(salesTotal(todays))) }}</div>
      </div>
      <div v-if="todays.length === 0" class="cs-empty">{{ t.noSales }}</div>
      <div v-for="row in todayRows" :key="row.sale.ref" class="cs-row cs-sale">
        <div class="cs-sale-ref">
          <div class="cs-strong">{{ row.sale.ref }}</div>
          <div class="adm-sub">{{ row.time }} · {{ t.pcs(row.pieces) }}</div>
        </div>
        <span class="cs-sale-note">{{ row.sale.note }}</span>
        <b class="cs-nums cs-right">{{ money(row.sale.total) }}</b>
        <button type="button" class="adm-btn cs-btn-small" @click="reprint(row.sale)">{{ t.reprint }}</button>
      </div>
    </section>

    <!-- NEW PRODUCT NAMES: everything added at the till, to add to the code later -->
    <section class="cs-card cs-pad-sm cs-panel-sec">
      <div class="cs-today-head">
        <div>
          <h2 class="cs-h3 adm-serif">{{ t.newNames }}</h2>
          <div class="adm-sub">{{ t.newNamesNote }}</div>
        </div>
        <button v-if="nameRows.length" type="button" class="adm-btn cs-btn-small" @click="copyNames">{{ t.copyNames }}</button>
      </div>
      <div v-if="nameRows.length === 0" class="cs-empty">{{ t.noNewNames }}</div>
      <div v-else class="cs-names">
        <div v-for="r in nameRows" :key="r.name" class="cs-row cs-name-row">
          <b class="cs-name-text">{{ r.name }}</b>
          <span class="adm-sub">{{ t.addedAt(r.when) }} · {{ t.usedTimes(r.uses || 0) }}</span>
        </div>
      </div>
    </section>
      </aside>
    </div>

    <div v-if="nameDialog" class="cs-scrim no-print" @mousedown.self="closeNameDialog">
      <div class="cs-dialog" role="dialog" aria-modal="true" aria-labelledby="cs-dialog-title">
        <h2 id="cs-dialog-title" class="cs-h2 adm-serif">{{ t.nameDialogTitle }}</h2>
        <div class="adm-sub">{{ t.nameDialogHelp }}</div>
        <label for="cs-newname" class="cs-label-plain cs-dialog-label">{{ t.nameLabel }}</label>
        <input
          id="cs-newname"
          v-model="nameDraft"
          class="cs-in"
          autocomplete="off"
          :maxlength="NAME_MAX"
          :placeholder="t.namePh"
          @input="nameError = ''"
          @keydown="onNameKey"
        />
        <div v-if="nameError" class="adm-error cs-save-error" role="alert">{{ nameError }}</div>
        <div class="cs-buttons">
          <button type="button" class="adm-btn" @click="closeNameDialog">{{ t.nameCancel }} <kbd class="cs-kbd">Esc</kbd></button>
          <div class="cs-spacer"></div>
          <button type="button" class="adm-btn adm-btn-primary" @click="confirmName">{{ t.nameConfirm }} <kbd class="cs-kbd is-inverse">↵</kbd></button>
        </div>
      </div>
    </div>

    <div v-if="toast" role="status" class="adm-toast no-print" :class="{ 'is-error': toast.error }">
      <span>{{ toast.message }}</span>
      <button v-if="toast.undo" type="button" class="adm-toast-undo" @click="undoRemove">{{ t.undo }}</button>
    </div>

    <!-- What gets printed: the same receipt as the checkout preview, hidden on screen. -->
    <div class="receipt-print">
      <CashReceipt :receipt="receipt" :copy-lang="receipt.lang" />
    </div>
  </div>
</template>

<style scoped>
/* Colours come from the admin tokens on .adm-shell (see assets/admin-ui.css). */
.cs-screen { display: flex; flex-direction: column; gap: 18px; }

/* --- Step indicator --- */
.cs-steps { display: flex; flex-wrap: wrap; gap: 8px; list-style: none; margin: 0; padding: 0; }
.cs-step {
  display: inline-flex; align-items: center; gap: 8px; min-height: 36px; padding: 0 14px 0 6px; border-radius: 999px;
  font-weight: 500; border: 1px solid var(--adm-border); background: var(--adm-surface); color: var(--adm-muted);
}
.cs-step.is-on { font-weight: 600; border-color: var(--adm-brand); background: var(--adm-brand-tint); color: var(--adm-brand-dark); }
.cs-step-num {
  display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%;
  font-size: 12px; font-weight: 700; background: #eeeae3; color: var(--adm-muted);
}
.cs-step.is-on .cs-step-num, .cs-step.is-past .cs-step-num { background: var(--adm-brand); color: #fff; }

/* --- Layout --- */
.cs-grid { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; }
.cs-main { flex: 1 1 560px; min-width: 0; display: flex; flex-direction: column; gap: 20px; }
.cs-aside {
  flex: 0 1 460px; min-width: 320px; position: sticky; top: 16px; display: flex; flex-direction: column; gap: 16px;
}
.cs-card { background: var(--adm-surface); border: 1px solid var(--adm-border); border-radius: 14px; }
.cs-pad { padding: 22px; }
.cs-pad-sm { padding: 18px 22px; }
.cs-pad-cart { padding: 18px 20px; }
.cs-bare { outline: none; }
.cs-nums { font-variant-numeric: tabular-nums; }
.cs-sub { margin-top: 4px; font-size: 12px; color: var(--adm-muted); }
.cs-small { font-size: 12px; }
.cs-muted { color: var(--adm-muted-2); font-size: 13px; }
.cs-strong { font-weight: 600; }
.cs-right { text-align: right; }
.cs-brand { color: var(--adm-brand-dark); }
.cs-ok { color: var(--adm-ok); }
.cs-spacer { flex: 1; }
.cs-h2 { margin: 0; font-size: 22px; font-weight: 700; }
.cs-h3 { margin: 0; font-size: 18px; font-weight: 700; }
.cs-big { font-size: 40px; font-weight: 700; line-height: 1.1; color: var(--adm-brand-dark); }
.cs-mid { font-size: 22px; font-weight: 600; }
.cs-empty { padding: 18px 0 6px; color: var(--adm-muted); text-align: center; }

/* --- Entry: Type / Price / Qty --- */
.cs-fields { display: grid; grid-template-columns: minmax(0, 2.4fr) minmax(0, 1fr) minmax(0, .8fr); gap: 14px; align-items: start; }
.cs-label { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-weight: 600; font-size: 13px; }
.cs-label-plain { display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px; }
.cs-opt { font-weight: 400; color: var(--adm-muted); }
.cs-num {
  display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%;
  font-size: 11px; font-weight: 700; background: #eeeae3; color: var(--adm-brand-dark);
}
.cs-num.is-active { background: var(--adm-brand-tint); }
.cs-num.is-done { background: var(--adm-brand); color: #fff; }
.cs-in {
  width: 100%; min-height: 56px; padding: 0 14px; border: 1px solid var(--adm-border); background: #fcfbf9;
  border-radius: 10px; font-weight: 500; font-size: 20px; color: var(--adm-text);
}
.cs-in:focus { background: #fff; }
.cs-in.is-done:not(:focus) { border-color: #d9c7a7; background: #fffaf1; }
#cs-type.is-done { font-weight: 700; color: var(--adm-brand-dark); }
.cs-in-small { min-height: 48px; font-size: 16px; }

.cs-addrow { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-top: 14px; min-height: 44px; }
.cs-preview { font-size: 14px; color: var(--adm-muted); }
.cs-preview.is-ready { font-weight: 600; color: var(--adm-brand-dark); }

.cs-types { margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--adm-border-soft); }
.cs-eyebrow { margin-bottom: 6px; font-size: 12px; font-weight: 600; color: var(--adm-muted); text-transform: uppercase; letter-spacing: .05em; }
.cs-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.cs-chips-scroll { max-height: 120px; overflow-y: auto; padding: 2px; margin-top: 8px; }
.cs-chip {
  display: inline-flex; align-items: center; gap: 6px; min-height: 34px; padding: 0 12px; border-radius: 999px;
  border: 1px solid var(--adm-border); background: var(--adm-surface); font-weight: 500; font-size: 14px;
  color: var(--adm-text); cursor: pointer;
}
.cs-chip:hover { border-color: var(--adm-brand); background: #fcf8f1; }
.cs-chip.is-hl { border-color: var(--adm-brand); background: var(--adm-brand-tint); box-shadow: 0 0 0 2px rgba(140, 106, 63, .25); }
.cs-chip-sc { font-size: 11px; color: var(--adm-muted); font-weight: 500; }
.cs-nomatch { padding: 18px; text-align: center; color: var(--adm-muted); }
.cs-types-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.cs-types-head .cs-eyebrow { margin-bottom: 0; }
.cs-add-name { border-style: dashed; color: var(--adm-brand-dark); }
.cs-chip-new {
  padding: 1px 7px; border-radius: 999px; background: var(--adm-brand-tint); color: var(--adm-brand-dark);
  font-size: 11px; font-weight: 600;
}

/* --- New product name dialog --- */
.cs-scrim {
  position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center;
  padding: 16px; background: rgba(40, 32, 20, .45);
}
.cs-dialog {
  width: min(460px, 100%); padding: 24px; border-radius: 14px; background: var(--adm-surface);
  border: 1px solid var(--adm-border); box-shadow: 0 20px 60px rgba(40, 32, 20, .3);
}
.cs-dialog .cs-in { margin-top: 0; }
.cs-dialog-label { margin-top: 18px; }
.cs-records-btn { gap: 8px; }
.cs-count {
  min-width: 22px; padding: 1px 7px; border-radius: 999px; background: var(--adm-brand-tint); color: var(--adm-brand-dark);
  font-size: 12px; font-weight: 700; text-align: center;
}
.cs-scrim.is-side { justify-content: flex-end; align-items: stretch; padding: 0; }
.cs-drawer {
  width: min(460px, 100%); height: 100%; overflow-y: auto; display: flex; flex-direction: column; gap: 16px;
  padding: 20px; background: var(--adm-bg); border-left: 1px solid var(--adm-border);
  box-shadow: -12px 0 40px rgba(40, 32, 20, .18);
}
.cs-drawer .cs-sale { grid-template-columns: minmax(0, 1fr) auto auto; grid-template-areas: "ref total btn" "note note note"; }
.cs-drawer .cs-sale-ref { grid-area: ref; }
.cs-drawer .cs-sale > .cs-right { grid-area: total; }
.cs-drawer .cs-sale > .adm-btn { grid-area: btn; }
.cs-drawer .cs-sale-note { grid-area: note; white-space: normal; }
.cs-drawer .cs-sale-note:empty { display: none; }
.cs-drawer-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.cs-names { max-height: 260px; overflow-y: auto; margin-top: 8px; }
.cs-name-row {
  display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap;
  padding: 8px 0; border-top: 1px solid var(--adm-border-soft);
}
.cs-name-text { overflow-wrap: anywhere; }

.cs-keys {
  display: flex; flex-wrap: wrap; gap: 6px 18px; margin-top: 16px; padding-top: 12px;
  border-top: 1px solid var(--adm-border-soft); font-size: 12.5px; color: var(--adm-muted-2);
}
.cs-kbd {
  display: inline-block; min-width: 20px; padding: 1px 7px; border: 1px solid #d9d2c5; border-bottom-width: 2px;
  border-radius: 6px; background: #fff; font-weight: 600; font-size: 12px; color: var(--adm-text-2); text-align: center;
}
.cs-kbd.is-inverse { background: rgba(255, 255, 255, .2); border-color: rgba(255, 255, 255, .4); color: #fff; }

/* --- Checkout / done --- */
.cs-pair { margin-top: 18px; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; align-items: stretch; }
.cs-change { display: flex; flex-direction: column; justify-content: center; padding: 4px 14px; border-radius: 10px; background: #faf8f5; color: var(--adm-muted); }
.cs-change.is-ok { background: #e3f2ec; color: var(--adm-ok); }
.cs-change-amount { font-size: 24px; font-weight: 700; line-height: 1.15; }
.cs-quick { margin-top: 10px; gap: 8px; }
.cs-save-error { margin-top: 16px; }
.cs-buttons { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 22px; align-items: center; }
.cs-btn-big { min-height: 56px; padding: 0 28px; font-size: 16px; }
.cs-done { border-color: #c9e3d4; padding: 28px; }
.cs-done-head { display: flex; align-items: center; gap: 14px; }
.cs-tick {
  display: inline-flex; align-items: center; justify-content: center; width: 52px; height: 52px; border-radius: 50%;
  background: #e3f2ec; color: var(--adm-ok); font-size: 26px; font-weight: 700;
}
.cs-done .cs-h2 { font-size: 24px; }
.cs-done-figures { display: flex; gap: 28px; flex-wrap: wrap; margin-top: 20px; }
.cs-done .cs-big { font-size: 34px; }

/* --- Today's sales --- */
.cs-today-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.cs-row:hover { background: #fcfaf6; }
.cs-sale {
  display: grid; grid-template-columns: minmax(130px, 1.4fr) minmax(0, 1fr) 100px auto; gap: 12px; align-items: center;
  padding: 6px 0; border-top: 1px solid var(--adm-border-soft); margin-top: 8px;
}
.cs-sale-ref { min-width: 0; }
.cs-sale-note { font-size: 12.5px; color: var(--adm-muted-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cs-btn-small { min-height: 40px; }

/* --- Cart --- */
.cs-cart-head { display: flex; justify-content: space-between; align-items: baseline; }
.cs-lines { max-height: 340px; overflow-y: auto; margin-top: 8px; }
.cs-line {
  display: grid; grid-template-columns: minmax(0, 1fr) auto auto auto; gap: 8px; align-items: center;
  padding: 10px 4px; border-top: 1px solid var(--adm-border-soft);
}
.cs-line-name { min-width: 0; }
.cs-line-title { font-weight: 600; font-size: 16px; line-height: 1.3; }
.cs-line-unit { font-size: 13.5px; color: var(--adm-muted); }
.cs-line-total { min-width: 60px; text-align: right; font-size: 16px; }
.cs-fixed-qty { font-size: 15px; color: var(--adm-muted-2); }
.cs-stepper { display: inline-flex; align-items: center; gap: 2px; }
.cs-stepper-qty { min-width: 26px; text-align: center; font-weight: 600; font-size: 16px; }
.cs-line-actions { display: inline-flex; gap: 2px; }
.cs-sq {
  width: 30px; height: 30px; padding: 0; border: 1px solid var(--adm-border); background: var(--adm-surface);
  border-radius: 8px; font-size: 16px; line-height: 1; cursor: pointer; color: var(--adm-text);
}
.cs-sq:hover { border-color: var(--adm-brand); }
.cs-sq.is-edit { color: var(--adm-brand-dark); font-size: 14px; }
.cs-sq.is-remove { color: var(--adm-danger); font-size: 13px; }
.cs-total-row {
  display: flex; justify-content: space-between; align-items: baseline; margin-top: 10px; padding-top: 12px;
  border-top: 2px solid var(--adm-text); font-size: 15px;
}
.cs-total-amount { font-size: 34px; font-weight: 700; color: var(--adm-brand-dark); }
.cs-main-btn { width: 100%; justify-content: center; margin-top: 14px; min-height: 56px; font-size: 16px; }
.cs-main-hint { margin-top: 8px; font-size: 12px; color: var(--adm-muted); text-align: center; }

/* --- QR --- */
.cs-qr { padding: 16px 20px; text-align: center; }
.cs-qr-head { display: flex; justify-content: space-between; margin-bottom: 8px; font-weight: 600; font-size: 13px; }
.cs-qr-img {
  width: 196px; height: 196px; display: block; margin: 0 auto 8px; padding: 8px; box-sizing: border-box;
  border: 1px solid var(--adm-border); border-radius: 10px; background: #fff;
}
.cs-qr .cs-small { color: var(--adm-muted-2); }

@media (max-width: 640px) {
  .cs-fields, .cs-pair { grid-template-columns: 1fr; }
  .cs-sale { grid-template-columns: minmax(0, 1fr) auto; }
  .cs-sale-note { display: none; }
  .cs-aside { position: static; flex-basis: 100%; min-width: 0; }
  .cs-big { font-size: 34px; }
}

/* --- Checkout: receipt preview --- */
.cs-preview-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.cs-copy-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.cs-tag {
  display: inline-flex; align-items: center; min-height: 28px; padding: 0 12px; border-radius: 999px;
  border: 1px solid var(--adm-border); background: var(--adm-surface); font-size: 12.5px; font-weight: 500; color: var(--adm-muted);
}
.cs-tag.is-on { border-color: var(--adm-brand); background: var(--adm-brand-tint); color: var(--adm-brand-dark); font-weight: 600; }
/* a desk-coloured mat with the sheet on it; the sheet keeps its printed size and is scaled down to fit */
.cs-sheet-wrap {
  position: relative; overflow: hidden; padding: 0; border-radius: 10px;
  background: var(--adm-border-soft); border: 1px solid var(--adm-border);
}
.cs-sheet {
  box-sizing: border-box; padding: 8mm; background: #fff; transform-origin: top left;
  box-shadow: 0 1px 2px rgba(60, 45, 20, .12), 0 8px 24px rgba(60, 45, 20, .10);
}

/* --- Checkout: payment column --- */
.cs-aside.is-checkout { flex-basis: 400px; }
.cs-pay-total { display: flex; justify-content: space-between; align-items: baseline; padding-bottom: 14px; border-bottom: 2px solid var(--adm-text); }
.cs-block { margin-top: 16px; }
.cs-seg-wide { display: flex; width: 100%; margin-bottom: 0; }
.cs-seg-wide .adm-seg-btn { flex: 1; justify-content: center; min-height: 44px; font-size: 15px; }
.cs-block .cs-sub { margin-top: 6px; }
.cs-cash { padding-top: 16px; border-top: 1px solid var(--adm-border-soft); }
.cs-cash .cs-pair { margin-top: 0; }
.cs-back-btn { width: 100%; justify-content: center; margin-top: 10px; }

/* --- Receipt: hidden on screen, shown only when printing --- */
.receipt-print {
  display: none;
}

/* --- Print: show ONLY the receipt --- */
@media print {
  @page {
    size: A5 landscape;
    margin: 8mm;
  }
  /* Hide all app chrome with display:none (NOT visibility:hidden) so these
     elements take up zero space; the sticky nav, the 100vh page wrapper and the
     tall footer would otherwise spill onto a blank 2nd page. The admin navbar is
     hidden in assets/admin-ui.css. */
  :global(.NavBar),
  :global(.footer) {
    display: none !important;
  }
  .no-print {
    display: none !important;
  }
  /* The page wrapper holds the receipt: strip the padding that was forcing
     extra pages, but keep it displayed. */
  .cs-page {
    min-height: 0 !important;
    padding: 0 !important;
  }
  .receipt-print {
    display: block;
  }
}
</style>
