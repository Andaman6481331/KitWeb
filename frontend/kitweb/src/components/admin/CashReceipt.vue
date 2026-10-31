<script setup>
// The Cash Sale receipt: two copies side by side on one A5 landscape sheet. The shop
// copy is fixed; the customer copy follows `copyLang`. The page shows it on screen for a
// last check and prints the very same markup, so what is checked is what comes out.
import { computed } from 'vue';
import { money } from '../../utils/adminCashSale';
import { merchantReceiptText, customerReceiptText } from '../../utils/adminCashSaleText';
import { englishName } from '../../utils/adminCashSaleNamesEn';

const props = defineProps({
  // { ref, at, items: [{ name, price, qty }], total, note, qr }
  receipt: { type: Object, required: true },
  copyLang: { type: String, default: 'th' },
});

const copies = computed(() => [
  { merchant: true, s: merchantReceiptText },
  { merchant: false, s: customerReceiptText(props.copyLang) },
]);

// Item names are Thai; the English customer copy shows the English name where one is set.
const itemName = (copy, item) => (!copy.merchant && props.copyLang === 'en' ? englishName(item.name) : item.name);
</script>

<template>
  <div class="receipt">
    <div v-for="copy in copies" :key="copy.merchant ? 'shop' : 'customer'" class="receipt-copy">
      <h3 class="r-title">{{ copy.s.title }}</h3>
      <hr/>
      <p class="r-meta">{{ receipt.ref }} | {{ receipt.at }}</p>
      <hr />


      <br/>
      <table class="r-table">
        <thead>
          <tr>
            <template v-if="copy.merchant">
              <th class="r-col-check-box"></th>
            </template>
            <th class="r-col-item">{{ copy.s.colItem }}</th>
            <th class="r-col-qty">{{ copy.s.colQty }}</th>
            <th class="r-col-price">{{ copy.s.colPrice }}</th>
            <th class="r-col-amt">{{ copy.s.colAmount }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in receipt.items" :key="item.name + item.price">
            <template v-if="copy.merchant">
              <td class="r-col-check-box"><span class="r-box"></span></td>
            </template> 
            <td class="r-col-item">{{ itemName(copy, item) }}</td>
            <td class="r-col-qty">{{ item.qty }}</td>
            <td class="r-col-price">{{ money(item.price) }}</td>
            <td class="r-col-amt">{{ money(item.price * item.qty) }}</td>
          </tr>
        </tbody>
      </table>



      <div class="r-bottom">
        <template v-if="copy.merchant">
        <hr />
        <p class="r-line r-grand"><span>{{ copy.s.grand }}</span><span>{{ money(receipt.total) }}</span></p>
        <hr/>
        <br/>
        <!-- Shop copy: payment status, the scan-to-pay QR beside it, and the hand-written notes -->
          <div class="r-pay-row">
            <div class="r-payment">
              <p class="r-payment-title">{{ copy.s.payTitle }}</p>
              <p class="r-check-line"><span class="r-box"></span> {{ copy.s.cash }}</p>
              <p class="r-check-line"><span class="r-box"></span> {{ copy.s.promptpay }}</p>
            </div>
            <!-- next to the PromptPay tick box: scan it, then tick the box -->
            <div v-if="receipt.qr" class="r-qr-block">
              <img :src="receipt.qr" alt="PromptPay QR" class="r-qr" />
              <p class="r-qr-caption">{{ copy.s.scan }}</p>
            </div>
            <!-- blank area for staff to jot extra info by hand (shop copy only) -->
            <div class="r-note">
              <span class="r-note-label">{{ copy.s.notes }}</span>
              <span v-if="receipt.note" class="r-note-text">{{ receipt.note }}</span>
            </div>
          </div>
          <p class="r-internal">{{ receipt.ref }}</p>
        </template>
        <!-- Customer copy: the total and thanks; the QR is on the shop copy -->
        <template v-else>
          <hr />
          <p class="r-line r-grand"><span>{{ copy.s.grand }}</span><span>{{ money(receipt.total) }}</span></p>
          <hr/>
          <br/>
          <p class="r-thanks">{{ copy.s.thanks }}</p>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Sized for the printed sheet (A5 landscape, 8mm margins); the screen preview scales it down. */
.receipt {
  display: flex;
  align-items: stretch;
  width: 100%;
  min-height: 128mm;
  margin: 0;
  font-family: 'Inter', sans-serif;
  color: #000;
  font-size: 13px;
  box-sizing: border-box;
}
.receipt-copy {
  flex: 1 1 50%;
  width: 50%;
  padding: 0 16px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}
.receipt-copy:first-child {
  border-right: 1px dashed #000; /* vertical divider down the middle */
}
.receipt hr {
  border: none;
  border-top: 1px dashed #000;
  margin: 5px 0;
}
.r-title {
  text-align: center;
  margin: 0 0 2px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.3px;
}
.r-meta {
  text-align: center;
  margin: 1px 0;
  font-size: 10px;
}
/* blank hand-writing area near the top of the shop copy */
.r-note {
  flex: 1 1 0;
  min-width: 0;
  border: 1px dashed #999;
  border-radius: 4px;
  min-height: 72px;
  margin: 4px 0 10px;
  padding: 4px 8px;
}
.r-pay-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.r-payment {
  flex: 0 0 auto;
}
.r-qr-block {
  flex: 0 0 auto;
  width: 76px;
  margin: 4px 0 10px;
  text-align: center;
}
.r-qr-caption {
  margin: 0;
  font-size: 8px;
  line-height: 1.2;
}
.r-note-label {
  font-size: 9px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
/* what the cashier typed in "Note on shop copy" */
.r-note-text {
  display: block;
  font-size: 12px;
}
/* totals / payment / QR block: pinned to the bottom of each copy */
.r-bottom {
  margin-top: auto;
}
.r-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.r-table th {
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  padding: 0 0 4px;
  border-bottom: 1px solid #000;
}
.r-table td {
  padding: 4px 0;
  vertical-align: top;
  font-size: 12px;
}
/* open box to tick off each item by hand when the goods are checked */
.r-col-check-box {
  width: 22px;
}
.r-col-check-box .r-box {
  display: block;
  margin-top: 2px;
}
.r-col-qty {
  text-align: center;
  width: 12%;
}
.r-col-price,
.r-col-amt {
  text-align: right;
  width: 22%;
}
.r-line {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin: 3px 0;
  font-size: 12px;
}
.r-line > span:first-child {
  font-weight: 600;
}
.r-grand {
  font-weight: 700;
  font-size: 18px;
  margin-top: 6px;
}
.r-payment-title {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 600;
}
.r-check-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 5px 0;
  font-size: 12px;
}
.r-box {
  width: 11px;
  height: 11px;
  border: 1px solid #000;
  flex: 0 0 auto;
}
.r-internal {
  text-align: center;
  font-size: 12px;
  letter-spacing: 0.5px;
}
.r-qr {
  display: block;
  width: 60px;
  margin: 0 auto 2px;
}
.r-thanks {
  text-align: center;
  font-weight: 700;
  font-size: 13px;
  margin-top: 5px;
}
</style>
