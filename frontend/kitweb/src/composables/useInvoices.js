import { ref, computed } from 'vue';
import { invoiceRows } from '../utils/adminInvoices';
import { nextInvoiceNumber } from '../utils/adminInvoiceEdit';
import { mockDirectory } from './useMockDirectory';

// The single place the Invoices page and the New invoice page get their data. Today that
// is placeholder rows plus the invoices saved this visit (kept in memory); to wire the
// real thing, make load() fetch from the Worker, make saveInvoice() post to it, and set
// `isPlaceholder` false. The pages need no other change.
//
// A saved invoice is a list row (id, customer, customerTh, status, amount, issuedAt,
// dueAt) plus `draft`, the editor state needed to reopen it.
const sample = ref([]);

export function useInvoices() {
  const loading = ref(true);
  const isPlaceholder = true;
  const invoices = computed(() => mockDirectory.invoices.concat(sample.value));

  const load = async () => {
    loading.value = true;
    if (!sample.value.length) sample.value = invoiceRows(Date.now());
    loading.value = false;
  };

  const findInvoice = (id) => mockDirectory.invoices.find((r) => r.id === id) || null;

  const saveInvoice = (record) => {
    const at = mockDirectory.invoices.findIndex((r) => r.id === record.id);
    if (at >= 0) mockDirectory.invoices.splice(at, 1, record);
    else mockDirectory.invoices.unshift(record);
    return record;
  };

  const nextNumber = (year = new Date().getFullYear()) => {
    if (!sample.value.length) sample.value = invoiceRows(Date.now());
    return nextInvoiceNumber(invoices.value.map((r) => r.id), year);
  };

  return { invoices, loading, isPlaceholder, load, findInvoice, saveInvoice, nextNumber };
}
