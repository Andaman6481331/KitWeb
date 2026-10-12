// Manage Orders keeps an editable "draft" next to every order. The page also
// refreshes itself in the background, and that refresh must never throw away
// what staff are in the middle of typing — these helpers decide per order
// whether its draft may be rebuilt from fresh server data.

// The editable copy of one order that the form fields bind to.
export function draftFromOrder(o) {
  return {
    status: o.status || 'PENDING',
    trackingNumber: o.tracking_number || '',
    // '' = not quoted yet; a number (including 0 = no charge) is a real quote.
    deliveryFee: o.delivery_fee === null || o.delivery_fee === undefined ? '' : String(o.delivery_fee),
    savingDelivery: false,
    editing: false,
    customerName: o.customer_name || '',
    phoneNumber: o.phone_number || '',
    shippingAddress: o.shipping_address || '',
    lineDisplayName: o.line_display_name || '',
    note: o.note || '',
    items: (o.items || []).map((it) => ({
      id: it.product_id ?? null,
      name: it.product_name || '',
      selectedSize: it.size || '',
      selectedColor: it.color || '',
      quantity: Number(it.quantity) || 1,
      price: Number(it.price) || 0,
    })),
    saving: false,
    savingEdit: false,
    message: '',
    error: false,
  };
}

// Everything staff can type into, so a draft can be compared with the order it
// was built from to tell whether anyone has touched it.
const editableSnapshot = (d) =>
  JSON.stringify([d.status, d.trackingNumber, d.deliveryFee, d.customerName, d.phoneNumber,
    d.shippingAddress, d.lineDisplayName, d.note, d.items]);

const isBusy = (d) => !!(d.editing || d.saving || d.savingDelivery || d.savingEdit);

// The draft to store for `order` after a fetch.
//   - A manual load (silent = false) and any order seen for the first time get a
//     fresh draft.
//   - A background refresh (silent = true) rebuilds the draft only when it is idle
//     and still equals what the previous copy of the order produced; otherwise
//     the draft staff are working on is returned unchanged.
export function reconcileDraft({ order, previousOrder, current, silent }) {
  const fresh = draftFromOrder(order);
  if (!silent || !current) return fresh;

  const untouched = !!previousOrder
    && !isBusy(current)
    && editableSnapshot(current) === editableSnapshot(draftFromOrder(previousOrder));
  if (!untouched) return current;

  // Keep the "Saved" / error line that is already showing.
  fresh.message = current.message;
  fresh.error = current.error;
  return fresh;
}
