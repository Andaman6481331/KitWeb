// Contact-detail checks for /order/submit. The shop confirms every web order when
// the customer messages us first, so this is not identity verification — it only
// stops lazy or accidental junk ("ss", a phone with its leading 0 dropped) and
// keeps field lengths inside what a single LINE text message can carry.

export type ContactError = "INVALID_NAME" | "INVALID_PHONE" | "INVALID_ADDRESS";

export type ContactResult =
	| { ok: true; phone: string }
	| { ok: false; error: ContactError };

const NAME_MAX = 100;
const ADDRESS_MIN = 10;
const ADDRESS_MAX = 500;

// Returns the phone in a canonical form, or null when it is not a usable number.
//   0812345678   Thai mobile (10 digits)        021234567   Thai landline (9 digits)
//   800065007    mobile with the 0 dropped  ->  0800065007
//   +66812345678 / 66812345678                  international
export function normalizePhone(raw: string): string | null {
	const input = (raw || "").trim();
	const hasPlus = input.startsWith("+");
	const digits = input.replace(/\D/g, "");
	if (!digits) return null;
	// One repeated digit (0000000000, 1111111111) is a keyboard smash, not a number.
	if (/^(\d)\1+$/.test(digits)) return null;

	if (hasPlus) {
		return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
	}
	// 66 + 9 digits is a Thai number written without the "+".
	if (digits.startsWith("66") && digits.length >= 11 && digits.length <= 12) {
		return `+${digits}`;
	}
	// Thai local numbers start with 0: 9 digits (landline) or 10 (mobile).
	if (digits.startsWith("0")) {
		return digits.length === 9 || digits.length === 10 ? digits : null;
	}
	// A mobile number typed without its 0. Only mobile prefixes (6/8/9) are
	// repaired; an 8-digit landline missing its 0 is ambiguous, so it is refused.
	if (digits.length === 9 && /^[689]/.test(digits)) {
		return `0${digits}`;
	}
	return null;
}

export function validateContact(
	input: { name: string; phone: string; address: string }
): ContactResult {
	const name = (input.name || "").trim();
	if (name.length < 2 || name.length > NAME_MAX || !/\p{L}/u.test(name)) {
		return { ok: false, error: "INVALID_NAME" };
	}

	const phone = normalizePhone(input.phone);
	if (!phone) return { ok: false, error: "INVALID_PHONE" };

	const address = (input.address || "").trim();
	if (address.length < ADDRESS_MIN || address.length > ADDRESS_MAX) {
		return { ok: false, error: "INVALID_ADDRESS" };
	}

	return { ok: true, phone };
}
