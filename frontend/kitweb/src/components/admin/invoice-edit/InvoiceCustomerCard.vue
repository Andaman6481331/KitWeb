<script setup>
// "Bill to": picks the customer, whose price level sets the starting price of every line.
import { LEVEL_COLORS } from '../../../utils/adminInvoiceEdit';

defineProps({
  t: { type: Object, required: true },
  customers: { type: Array, required: true },
  customerId: { type: String, required: true },
  customer: { type: Object, default: null },
  levelNames: { type: Array, required: true },
  locked: { type: Boolean, default: false },
  isThai: { type: Boolean, default: false },
  browseTo: { type: Object, required: true },
});
defineEmits(['update:customerId']);

const money = (n) => `฿${Number(n).toLocaleString('en-US')}`;
</script>

<template>
  <section class="adm-inv-card">
    <h2 class="adm-serif">{{ t.customer }}</h2>
    <p class="adm-inv-sub">{{ t.customerSub }}</p>
    <div class="adm-inv-row">
      <div style="flex: 1 1 280px">
        <label class="adm-inv-lab" for="inv-cust">{{ t.billTo }}</label>
        <select id="inv-cust" class="adm-inv-field" :value="customerId" :disabled="locked" @change="$emit('update:customerId', $event.target.value)">
          <option value="">{{ t.selectCust }}</option>
          <option v-for="c in customers" :key="c.id" :value="c.id">{{ isThai ? c.nameTh : c.name }} · {{ levelNames[c.level] }}</option>
        </select>
      </div>
      <router-link class="adm-btn" :to="browseTo" target="_blank">{{ t.browse }}</router-link>
    </div>
    <div v-if="customer" class="adm-inv-strip">
      <div><small>{{ t.contact }}</small><b>{{ customer.contact }}</b></div>
      <div>
        <small>{{ t.priceLevel }}</small>
        <span class="adm-level" :style="{ background: LEVEL_COLORS[customer.level][0], color: LEVEL_COLORS[customer.level][1] }">{{ levelNames[customer.level] }}</span>
      </div>
      <div><small>{{ t.outBal }}</small><b>{{ money(customer.outstanding) }}</b></div>
    </div>
  </section>
</template>
