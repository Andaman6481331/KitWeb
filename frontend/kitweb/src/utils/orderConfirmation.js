// The shop never contacts web customers first: an order is only a request until
// the customer sends its order number to the OA or WhatsApp. These are the links
// that make that one tap. The Worker words the LINE receipt button identically
// (confirmationText in hidden-water-ed9d/src/index.ts) so staff search one phrase.

export const LINE_OA_ID = '@oar4837p';
export const LINE_OA_URL = `https://line.me/ti/p/${LINE_OA_ID}`;
// International digits, no "+" — what wa.me requires.
export const WHATSAPP_NUMBER = '66894886877';

export const confirmationText = (orderId) => `Hi, my order is ${orderId}`;

// Opens LINE with the message pre-filled in the OA chat; the customer taps Send.
// Desktop LINE does not always honour it, hence the Copy button beside it.
export const lineConfirmUrl = (orderId) =>
    `https://line.me/R/oaMessage/${LINE_OA_ID}/?${encodeURIComponent(confirmationText(orderId))}`;

export const whatsappConfirmUrl = (orderId) =>
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(confirmationText(orderId))}`;
