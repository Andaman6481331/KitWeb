import { reactive } from 'vue';

// PLACEHOLDER store shared by the Customers, Invoices and New invoice pages while there
// is no backend: customers added and invoices saved live here, in memory, so the three
// pages agree with each other. Everything is lost on reload, by design. Nothing reads or
// writes the database. When the real data exists, useCustomers.js and useInvoices.js
// load from the Worker instead and this file goes away.
export const mockDirectory = reactive({
  customers: [],
  invoices: [],
});

export const resetMockDirectory = () => {
  mockDirectory.customers = [];
  mockDirectory.invoices = [];
};
