import { ref, computed } from 'vue';
import { nextInvoiceNumber } from '../utils/adminInvoiceEdit';
import { legacyInvoiceRow } from '../utils/adminLegacy';
import { api } from '../services/api';
import { mockDirectory } from './useMockDirectory';
import { useAdminSession } from './useAdminSession';

// The single place the Invoices page and the New invoice page get their data. Today that
// is the invoices imported from the old Access database (read-only, tagged legacy) plus the
// invoices saved this visit on the New invoice page, which are kept in memory only. To store
// those for real, make saveInvoice() post to the Worker; the pages need no other change.
//
// A saved invoice is a list row (id, customer, customerTh, status, amount, issuedAt,
// dueAt) plus `draft`, the editor state needed to reopen it.
//
// The history is fetched once per visit and then kept. While a fetch is running, every caller
// shares it, so opening the page twice quickly asks D1 once.
const legacy = ref([]);
let loaded = false;
let pending = null;

const fetchOnce = () => {
  pending ??= api.listLegacyInvoices()
    .then((rows) => { legacy.value = rows.map(legacyInvoiceRow); loaded = true; })
    .finally(() => { pending = null; });
  return pending;
};

export function useInvoices() {
  const loading = ref(!loaded);
  const error = ref('');
  const isPlaceholder = false;
  const invoices = computed(() => mockDirectory.invoices.concat(legacy.value));

  const { handleAuthError } = useAdminSession();

  const load = async () => {
    if (loaded) { loading.value = false; return; }
    loading.value = true;
    error.value = '';
    try {
      await fetchOnce();
    } catch (err) {
      // A rejected session sends the whole admin back to the login gate, not a red banner.
      if (!handleAuthError(err)) error.value = err.message || 'Could not load the invoices';
    } finally {
      loading.value = false;
    }
  };

  const findInvoice = (id) => mockDirectory.invoices.find((r) => r.id === id) || null;

  const saveInvoice = (record) => {
    const at = mockDirectory.invoices.findIndex((r) => r.id === record.id);
    if (at >= 0) mockDirectory.invoices.splice(at, 1, record);
    else mockDirectory.invoices.unshift(record);
    return record;
  };

  const nextNumber = (year = new Date().getFullYear()) =>
    nextInvoiceNumber(invoices.value.map((r) => r.id), year);

  return { invoices, loading, error, isPlaceholder, load, findInvoice, saveInvoice, nextNumber };
}
