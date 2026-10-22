import { getNationalPhoneDigits, normalizePhoneDigits } from "./phoneNormalization.js";

/**
 * Phone Number Clinical UI Display & Privacy Masking (152-ФЗ)
 */

export function formatPhoneDisplay(phone: string | null | undefined): string {
	if (!phone) return "—";
	const digits = normalizePhoneDigits(phone);
	if (digits.length === 11) {
		const country = digits.startsWith("8") ? "+7" : `+${digits[0]}`;
		const area = digits.slice(1, 4);
		const p1 = digits.slice(4, 7);
		const p2 = digits.slice(7, 9);
		const p3 = digits.slice(9, 11);
		return `${country} (${area}) ${p1}-${p2}-${p3}`;
	}
	if (digits.length === 10) {
		const area = digits.slice(0, 3);
		const p1 = digits.slice(3, 6);
		const p2 = digits.slice(6, 8);
		const p3 = digits.slice(8, 10);
		return `+7 (${area}) ${p1}-${p2}-${p3}`;
	}
	return phone.trim();
}

export function formatPhoneNumber(value: string | null | undefined): string {
	if (!value) return "";
	const rawDigits = String(value).replace(/\D/g, "");
	if (rawDigits.length === 0) return "";

	let prefix = "+7 ";
	let rest = rawDigits;

	if (rawDigits.startsWith("7") || rawDigits.startsWith("8")) {
		rest = rawDigits.substring(1);
	} else if (rawDigits.startsWith("9")) {
		rest = rawDigits;
	} else if (rawDigits.length >= 10) {
		if (rawDigits.length === 11 && (rawDigits.startsWith("7") || rawDigits.startsWith("8"))) {
			rest = rawDigits.substring(1);
		} else {
			rest = rawDigits.slice(-10);
		}
	} else {
		prefix = "+";
	}

	rest = rest.slice(0, 10);
	if (rest.length === 0) return prefix;

	let formatted = `${prefix}(${rest.substring(0, 3)}`;
	if (rest.length >= 4) {
		formatted += `) ${rest.substring(3, 6)}`;
	}
	if (rest.length >= 7) {
		formatted += `-${rest.substring(6, 8)}`;
	}
	if (rest.length >= 9) {
		formatted += `-${rest.substring(8, 10)}`;
	}
	return formatted;
}

export const formatRussianPhone = formatPhoneNumber;
export const formatPhoneRu = formatPhoneNumber;

export function maskPhoneDisplay(phone: string | null | undefined): string {
	if (!phone) return "—";
	const digits = normalizePhoneDigits(phone);
	if (digits.length < 10) return "+7 (***) ***-**-**";
	const main = digits.slice(-10);
	const code = main.slice(0, 3);
	const last2 = main.slice(-2);
	return `+7 (${code}) ***-**-${last2}`;
}
