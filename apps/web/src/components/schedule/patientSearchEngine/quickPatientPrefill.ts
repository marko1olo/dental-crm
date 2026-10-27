/**
 * quickPatientPrefill.ts — Parses search query strings into prefill data for 1-click quick patient creation.
 * Mandate 8e & 8n: Zero Dead-Ends for Solo Doctor and Small Clinic Reception.
 */

import type { QuickPatientPrefill } from "./searchEngineTypes";

function formatPhoneForInput(raw: string, digits: string): string {
	if (digits.length === 10) {
		return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 10)}`;
	}
	if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
		const core = digits.slice(1);
		return `+7 (${core.slice(0, 3)}) ${core.slice(3, 6)}-${core.slice(6, 8)}-${core.slice(8, 10)}`;
	}
	return raw.startsWith("+") ? raw : `+7 ${raw}`;
}

export function parseSearchQueryForQuickPatient(rawQuery: string): QuickPatientPrefill {
	const query = (rawQuery || "").trim();
	if (!query) {
		return { fullName: "", phone: "" };
	}

	const digits = query.replace(/\D/g, "");
	const hasLetters = /[a-zA-Zа-яА-ЯёЁ]/.test(query);

	// 1. Pure phone numbers or digit fragments (no letters)
	if (!hasLetters && digits.length >= 3) {
		return {
			fullName: "",
			phone: formatPhoneForInput(query, digits),
		};
	}

	// 2. Combined query: name + phone (e.g. "Иванов +79161234567" or "Иван 89260001122")
	if (hasLetters && digits.length >= 7) {
		const phoneMatch =
			query.match(/(?:\+?7|8)?[\s\-(]*\d{3}[\s\-)]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}/) ||
			query.match(/\+?\d{7,11}/);

		if (phoneMatch) {
			const phonePart = phoneMatch[0];
			const namePart = query.replace(phonePart, "").replace(/[+,;]/g, " ").trim();
			const phoneDigits = phonePart.replace(/\D/g, "");
			return {
				fullName: namePart,
				phone: formatPhoneForInput(phonePart, phoneDigits),
			};
		}
	}

	// 3. Primarily letters / name
	return {
		fullName: query,
		phone: "",
	};
}
