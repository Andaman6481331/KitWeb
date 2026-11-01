import { ref, computed } from 'vue';
import { newCustomer } from '../utils/adminCustomers';
import { legacyCustomerRow } from '../utils/adminLegacy';
import { api } from '../services/api';
import { mockDirectory } from './useMockDirectory';

// The single place the Customers page (and the invoice customer picker) gets its data.
// Today that is the customers imported from the old Access database (read-only, tagged
// legacy) plus anyone added this visit, which is kept in memory only. To store new
// customers for real, make addCustomer() post to the Worker; the pages need no other change.
const legacy = ref([]);
let loaded = false;

export function useCustomers() {
  const loading = ref(!loaded);
  const error = ref('');
  const isPlaceholder = false;
  const customers = computed(() => legacy.value.concat(mockDirectory.customers));

  const load = async () => {
    if (loaded) { loading.value = false; return; }
    loading.value = true;
    error.value = '';
    try {
      legacy.value = (await api.listLegacyCustomers()).map(legacyCustomerRow);
      loaded = true;
    } catch (err) {
      error.value = err.message || 'Could not load the customers';
    } finally {
      loading.value = false;
    }
  };

  const addCustomer = (form) => {
    const created = newCustomer(customers.value, form);
    mockDirectory.customers.push(created);
    return created;
  };

  return { customers, loading, error, isPlaceholder, load, addCustomer };
}
