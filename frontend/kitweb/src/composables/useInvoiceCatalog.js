import { MOCK_VARIANTS, MOCK_VARIANTS_BY_ID } from '../utils/adminInvoiceMock';

// The products an invoice line can pick. Today: the placeholder catalogue from the design
// file. To use the real inventory, return its variants here in the same shape.
export function useInvoiceCatalog() {
  return { variants: MOCK_VARIANTS, variantsById: MOCK_VARIANTS_BY_ID, isPlaceholder: true };
}
