import { ref } from 'vue';
import { customerRows } from '../utils/adminCustomers';

// The single place the Customers page gets its data. Today that is placeholder rows;
// to wire the real thing, make load() fetch from the Worker and `isPlaceholder` false.
// The page needs no other change.
export function useCustomers() {
  const customers = ref([]);
  const loading = ref(true);
  const isPlaceholder = true;

  const load = async () => {
    loading.value = true;
    customers.value = customerRows(Date.now());
    loading.value = false;
  };

  return { customers, loading, isPlaceholder, load };
}
