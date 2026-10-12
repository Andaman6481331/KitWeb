// Pure helpers for the customer-facing order view and the LINE webhook. Kept out
// of index.ts so the rules that decide who may see an order (and which LINE
// messages may confirm one) can be tested without standing up a request.

import { normalizePhone } from "./order-validation";

// Order ids are WH-<year>-<5 digits>. The pattern is global so one message that
// quotes several orders confirms each of them.
const ORDER_ID_PATTERN = /WH-\d{4}-\d{5}/gi;

/** Distinct, upper-cased order ids found in free text, in order of appearance. */
export function extractOrderIds(text: string, limit = 3): string[] {
	const found = (text || "").match(ORDER_ID_PATTERN) || [];
	return [...new Set(found.map((id) => id.toUpperCase()))].slice(0, limit);
}

/** 128 random bits as hex — the secret half of a "view my order" link. */
export function newViewKey(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Compare two secrets without leaking, through timing, how much of them matched. */
export function secretsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
	if (!a || !b) return false;
	const enc = new TextEncoder();
	const x = enc.encode(a);
	const y = enc.encode(b);
	let diff = x.length ^ y.length;
	for (let i = 0; i < Math.max(x.length, y.length); i++) {
		diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
	}
	return diff === 0;
}

// 0812345678, 66812345678 and +66812345678 are the same Thai number.
function localDigits(phone: string | null | undefined): string | null {
	const canonical = normalizePhone(phone || "");
	if (!canonical) return null;
	const digits = canonical.replace(/\D/g, "");
	return digits.startsWith("66") ? `0${digits.slice(2)}` : digits;
}

/** True when `given` is the phone the order was placed with, however it is written. */
export function phonesMatch(stored: string | null | undefined, given: string | null | undefined): boolean {
	const a = localDigits(stored);
	const b = localDigits(given);
	return !!a && !!b && secretsMatch(a, b);
}

export interface OrderView {
	id: string;
	status: string;
	created_at: string | null;
	contact_confirmed_at: string | null;
	is_quote: boolean;
	customer_name: string | null;
	items: { product_name: string; size: string | null; color: string | null; quantity: number; price: number | null }[];
	/** Sum of the lines; null while a quote still has unpriced lines. */
	items_total: number | null;
	/** null = delivery not quoted yet. */
	delivery_fee: number | null;
	/** items + delivery; null until both are known. */
	grand_total: number | null;
	tracking_number: string | null;
}

const toNumberOrNull = (v: unknown): number | null => {
	if (v === null || v === undefined || v === "") return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
};

/**
 * What a customer may see of their own order. Deliberately a whitelist: no phone,
 * address, slip, LINE ids or internal flags ever leave the Worker through here.
 */
export function toOrderView(order: any, items: any[]): OrderView {
	const isQuote = order.payment_method === "QUOTE";
	const itemsTotal = isQuote ? null : toNumberOrNull(order.total_amount);
	const deliveryFee = toNumberOrNull(order.delivery_fee);
	return {
		id: order.id,
		status: order.status || "PENDING",
		created_at: order.created_at ?? null,
		contact_confirmed_at: order.contact_confirmed_at ?? null,
		is_quote: isQuote,
		customer_name: order.customer_name ?? null,
		items: (items || []).map((i) => ({
			product_name: i.product_name,
			size: i.size ?? null,
			color: i.color ?? null,
			quantity: Number(i.quantity) || 0,
			price: toNumberOrNull(i.price)
		})),
		items_total: itemsTotal,
		delivery_fee: deliveryFee,
		grand_total: itemsTotal !== null && deliveryFee !== null ? itemsTotal + deliveryFee : null,
		tracking_number: order.tracking_number ?? null
	};
}

/** LINE signs the raw request body: base64(HMAC-SHA256(body, channel secret)). */
export async function verifyLineSignature(
	rawBody: string,
	signature: string | null,
	channelSecret: string
): Promise<boolean> {
	if (!signature || !channelSecret) return false;
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(channelSecret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"]
	);
	const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
	let binary = "";
	for (const b of new Uint8Array(mac)) binary += String.fromCharCode(b);
	return secretsMatch(btoa(binary), signature);
}
