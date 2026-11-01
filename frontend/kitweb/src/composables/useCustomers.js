import { ref, computed } from 'vue';
import { customerRows, newCustomer } from '../utils/adminCustomers';
import { mockDirectory } from './useMockDirectory';

// The single place the Customers page (and the invoice customer picker) gets its data.
// Today that is placeholder rows plus whatever was added this visit; to wire the real
// thing, make load() fetch from the Worker, make addCustomer() post to it, and set
// `isPlaceholder` false. The pages need no other change.
const sample = ref([]);

export function useCustomers() {
  const loading = ref(true);
  const isPlaceholder = true;
  const customers = computed(() => sample.value.concat(mockDirectory.customers));

  const load = async () => {
    loading.value = true;
    if (!sample.value.length) sample.value = customerRows(Date.now());
    loading.value = false;
  };

  const addCustomer = (form) => {
    const created = newCustomer(customers.value, form);
    mockDirectory.customers.push(created);
    return created;
  };

  return { customers, loading, isPlaceholder, load, addCustomer };
}
