import { describe, it, expect } from "vitest";
import { normalizePhone, validateContact } from "../src/order-validation";

describe("normalizePhone", () => {
	it("keeps a well-formed Thai mobile number", () => {
		expect(normalizePhone("0812345678")).toBe("0812345678");
	});

	it("strips spaces, dashes, dots and brackets", () => {
		expect(normalizePhone("081-234-5678")).toBe("0812345678");
		expect(normalizePhone("081 234 5678")).toBe("0812345678");
		expect(normalizePhone("(081) 234.5678")).toBe("0812345678");
	});

	it("restores the leading 0 a customer dropped from a mobile number", () => {
		expect(normalizePhone("800065007")).toBe("0800065007");
		expect(normalizePhone("812345678")).toBe("0812345678");
	});

	it("accepts a Bangkok landline", () => {
		expect(normalizePhone("02 123 4567")).toBe("021234567");
	});

	it("accepts international numbers with a +", () => {
		expect(normalizePhone("+66 81 234 5678")).toBe("+66812345678");
		expect(normalizePhone("+1 415 555 2671")).toBe("+14155552671");
	});

	it("treats 66-prefixed digits as a Thai international number", () => {
		expect(normalizePhone("66812345678")).toBe("+66812345678");
	});

	it("rejects things that are not phone numbers", () => {
		for (const bad of ["", "   ", "12345", "abcdefghij", "08123", "0812345678901234567"]) {
			expect(normalizePhone(bad), bad).toBeNull();
		}
	});

	it("rejects an 8-digit landline missing its 0 rather than guessing", () => {
		expect(normalizePhone("21234567")).toBeNull();
	});

	it("rejects a number made of one repeated digit", () => {
		expect(normalizePhone("0000000000")).toBeNull();
		expect(normalizePhone("1111111111")).toBeNull();
	});
});

describe("validateContact", () => {
	const good = { name: "Somchai", phone: "081-234-5678", address: "123 Sampeng, Bangkok" };

	it("passes good details and returns the normalised phone", () => {
		expect(validateContact(good)).toEqual({ ok: true, phone: "0812345678" });
	});

	it("fixes the dropped-zero phone from the real 'kayla' order", () => {
		const r = validateContact({ ...good, name: "kayla", phone: "800065007" });
		expect(r).toEqual({ ok: true, phone: "0800065007" });
	});

	it("rejects a one-letter name", () => {
		expect(validateContact({ ...good, name: "k" })).toEqual({ ok: false, error: "INVALID_NAME" });
	});

	it("rejects a name with no letters in it", () => {
		expect(validateContact({ ...good, name: "12345" })).toEqual({ ok: false, error: "INVALID_NAME" });
	});

	it("accepts a Thai name", () => {
		expect(validateContact({ ...good, name: "สมชาย" }).ok).toBe(true);
	});

	it("rejects a too-short address", () => {
		expect(validateContact({ ...good, address: "ss" })).toEqual({ ok: false, error: "INVALID_ADDRESS" });
		expect(validateContact({ ...good, address: "123456789" })).toEqual({ ok: false, error: "INVALID_ADDRESS" });
		expect(validateContact({ ...good, address: "1234567890" }).ok).toBe(true);
	});

	it("rejects an unusable phone", () => {
		expect(validateContact({ ...good, phone: "12345" })).toEqual({ ok: false, error: "INVALID_PHONE" });
	});

	it("caps field lengths so a push to LINE cannot overflow its text limit", () => {
		expect(validateContact({ ...good, name: "a".repeat(101) })).toEqual({ ok: false, error: "INVALID_NAME" });
		expect(validateContact({ ...good, address: "a".repeat(501) })).toEqual({ ok: false, error: "INVALID_ADDRESS" });
	});
});
