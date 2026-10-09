/**
 * formatters.ts
 *
 * Layer 0: Чистые функции форматирования и локализации для документов A4.
 * Включает склонение валют РФ прописью (рубли / копейки) и Blank Line Invariant.
 */

import { integerToRussianWords } from "../../sanpin/sanpinRegistryEngine.js";
import type { A4PatientRequisites } from "./types.js";

export function escapeHtml(str: unknown): string {
	if (str === null || str === undefined) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

export function formatRubles(amount: number): string {
	return (Number(amount) || 0)
		.toLocaleString("ru-RU", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		})
		.replace(/[\u00A0\u202F]/g, " ");
}

export function formatAmountInWordsRu(amount: number): string {
	const n = Math.max(0, Math.floor(amount));
	const kopecks = Math.round((Math.abs(amount) - n) * 100);
	const words = integerToRussianWords(n);
	const capitalized = words.charAt(0).toUpperCase() + words.slice(1);

	let rubWord = "рублей";
	const mod10 = n % 10;
	const mod100 = n % 100;
	if (mod10 === 1 && mod100 !== 11) rubWord = "рубль";
	else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) rubWord = "рубля";

	let kopWord = "копеек";
	const kMod10 = kopecks % 10;
	const kMod100 = kopecks % 100;
	if (kMod10 === 1 && kMod100 !== 11) kopWord = "копейка";
	else if (kMod10 >= 2 && kMod10 <= 4 && (kMod100 < 10 || kMod100 >= 20)) kopWord = "копейки";

	return `${capitalized} ${rubWord} ${String(kopecks).padStart(2, "0")} ${kopWord}`;
}

export function formatPassportString(p: A4PatientRequisites): string {
	if (p.passportSeries && p.passportNumber) {
		const issuedBy = p.passportIssuedBy ? `, выдан ${p.passportIssuedBy}` : "";
		const date = p.passportIssuedDate ? `, дата: ${p.passportIssuedDate}` : "";
		const code = p.passportDepartmentCode ? `, код подразделения: ${p.passportDepartmentCode}` : "";
		return `серия ${p.passportSeries} № ${p.passportNumber}${issuedBy}${date}${code}`;
	}
	if (p.passportRaw && p.passportRaw.trim()) return p.passportRaw.trim();
	return "серия ______ № __________, выдан ____________________________________________________, дата «___» _________ _____ г., код подразделения: _________";
}

export function formatAddressString(addr?: string | null): string {
	if (addr && addr.trim()) return addr.trim();
	return "____________________________________________________________________________________";
}

export function formatPhoneString(phone?: string | null): string {
	if (phone && phone.trim()) return phone.trim();
	return "+7 (____) ___-__-__";
}

export function formatSnilsString(snils?: string | null): string {
	if (snils && snils.trim()) return snils.trim();
	return "___-___-___ __";
}

export function formatPolicyString(polis?: string | null): string {
	if (polis && polis.trim()) return polis.trim();
	return "____________________________________";
}

export function formatDateString(date?: string | null): string {
	if (date && date.trim()) return date.trim();
	return "«___» _________ 20__ г.";
}

export function formatSignatoryString(name?: string | null): string {
	if (name && name.trim()) return name.trim();
	return "____________________________________";
}
