import { ref } from 'vue';
import { invoiceRows } from '../utils/adminInvoices';

// The single place the Invoices page gets its data. Today that is placeholder rows;
// to wire the real thing, make load() fetch from the Worker and `isPlaceholder` false.
// The page needs no other change.
export function useInvoices() {
  const invoices = ref([]);
  const loading = ref(true);
  const isPlaceholder = true;

  const load = async () => {
    loading.value = true;
    invoices.value = invoiceRows(Date.now());
    loading.value = false;
  };

  return { invoices, loading, isPlaceholder, load };
}
