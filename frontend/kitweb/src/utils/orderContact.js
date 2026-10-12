// Client-side mirror of hidden-water-ed9d/src/order-validation.ts. The Worker is
// authoritative; this copy exists so the customer sees an inline error on the field
// instead of a failed submit. Keep the two in step.

const NAME_MAX = 100;
const ADDRESS_MIN = 10;
const ADDRESS_MAX = 500;

// Canonical phone, or null when it is not a usable number.
//   0812345678   Thai mobile        021234567    Thai landline
//   800065007    mobile with its 0 dropped -> 0800065007
//   +66812345678 / 66812345678      international
export function normalizePhone(raw) {
    const input = String(raw || '').trim();
    const hasPlus = input.startsWith('+');
    const digits = input.replace(/\D/g, '');
    if (!digits) return null;
    // One repeated digit is a keyboard smash, not a number.
    if (/^(\d)\1+$/.test(digits)) return null;

    if (hasPlus) {
        return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
    }
    if (digits.startsWith('66') && digits.length >= 11 && digits.length <= 12) {
        return `+${digits}`;
    }
    if (digits.startsWith('0')) {
        return digits.length === 9 || digits.length === 10 ? digits : null;
    }
    if (digits.length === 9 && /^[689]/.test(digits)) {
        return `0${digits}`;
    }
    return null;
}

// Unlike the Worker (first error wins) this reports every bad field, keyed by the
// form's own field names, so the checkout can mark them all in one pass.
export function validateContact({ name, phone, address }) {
    const errors = {};

    const trimmedName = String(name || '').trim();
    if (trimmedName.length < 2 || trimmedName.length > NAME_MAX || !/\p{L}/u.test(trimmedName)) {
        errors.customerName = 'INVALID_NAME';
    }

    const normalized = normalizePhone(phone);
    if (!normalized) errors.phoneNumber = 'INVALID_PHONE';

    const trimmedAddress = String(address || '').trim();
    if (trimmedAddress.length < ADDRESS_MIN || trimmedAddress.length > ADDRESS_MAX) {
        errors.shippingAddress = 'INVALID_ADDRESS';
    }

    const ok = Object.keys(errors).length === 0;
    return ok ? { ok, phone: normalized, errors } : { ok, errors };
}
