import type { Patient } from "@dental/shared";

export * from "./telephonyTypes";
export * from "./telephonyClinical";

/**
 * Normalizes phone string to clean numeric digits.
 */
export function normalizePhoneDigits(phone: string | null | undefined): string {
	if (!phone) return "";
	return phone.replace(/\D/g, "");
}

/**
 * Extracts the 10-digit national number suffix for Russian and standard phone numbers.
 * E.g., "+7 (916) 123-45-67" -> "9161234567"
 *       "89269876543"        -> "9269876543"
 *       "9161234567"         -> "9161234567"
 */
export function getNationalPhoneDigits(
	phone: string | null | undefined,
): string {
	const digits = normalizePhoneDigits(phone);
	if (digits.length >= 10) {
		return digits.slice(-10);
	}
	return digits;
}

/**
 * Performs fuzzy phone number matching across different notations:
 * +7 / 8 / 7 / no prefix, spaces, brackets, dashes, leading zero-padding.
 */
export function fuzzyMatchPhone(
	phoneA: string | null | undefined,
	phoneB: string | null | undefined,
): boolean {
	if (!phoneA || !phoneB) return false;
	const digitsA = normalizePhoneDigits(phoneA);
	const digitsB = normalizePhoneDigits(phoneB);

	if (digitsA.length === 0 || digitsB.length === 0) return false;

	// Exact digits match
	if (digitsA === digitsB) return true;

	// National 10-digit suffix match (Russia +7 / 8 prefix handling)
	const natA = getNationalPhoneDigits(phoneA);
	const natB = getNationalPhoneDigits(phoneB);

	if (natA.length === 10 && natB.length === 10 && natA === natB) {
		return true;
	}

	// 7-digit local number match only if both numbers are local 7-digit numbers
	if (digitsA.length === 7 && digitsB.length === 7) {
		return digitsA === digitsB;
	}

	return false;
}

/**
 * Formats a phone number for clinical UI presentation.
 * Example: "79991234567" -> "+7 (999) 123-45-67"
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

/**
 * Extracts 2-letter uppercase initials from full name.
 * Example: "Иванов Иван Иванович" -> "ИИ"
 */
export function formatPatientInitials(
	fullName: string | null | undefined,
): string {
	if (!fullName || !fullName.trim()) return "??";
	const parts = fullName.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "??";
	if (parts.length === 1) {
		const single = parts[0] ?? "";
		return single.slice(0, 2).toUpperCase();
	}
	const first = parts[0] ?? "";
	const second = parts[1] ?? "";
	if (first[0] && second[0]) {
		return (first[0] + second[0]).toUpperCase();
	}
	return (first.slice(0, 2) || "??").toUpperCase();
}

/**
 * Deterministic color palette generation for patient avatar.
 */
export function getAvatarColor(name: string | null | undefined): {
	bg: string;
	text: string;
	border: string;
} {
	const palettes = [
		{ bg: "rgba(15, 118, 110, 0.15)", text: "#0f766e", border: "#14b8a6" }, // Teal
		{ bg: "rgba(2, 132, 199, 0.15)", text: "#0284c7", border: "#38bdf8" }, // Sky
		{ bg: "rgba(99, 102, 241, 0.15)", text: "#6366f1", border: "#818cf8" }, // Indigo
		{ bg: "rgba(168, 85, 247, 0.15)", text: "#a855f7", border: "#c084fc" }, // Purple
		{ bg: "rgba(236, 72, 153, 0.15)", text: "#ec4899", border: "#f472b6" }, // Pink
		{ bg: "rgba(245, 158, 11, 0.15)", text: "#d97706", border: "#fbbf24" }, // Amber
		{ bg: "rgba(168, 85, 247, 0.15)", text: "#059669", border: "#34d399" }, // Emerald
	];

	if (!name) return palettes[0]!;
	let hash = 0;
	for (let i = 0; i < name.length; i++) {
		hash = (hash << 5) - hash + name.charCodeAt(i);
		hash |= 0;
	}
	const index = Math.abs(hash) % palettes.length;
	return palettes[index] ?? palettes[0]!;
}

/**
 * Searches and resolves a patient by phone number against a list of patients using fuzzy matching.
 * Checks primary phone and legal representative phone.
 */
export function resolvePatientFromPhone(
	patientsList: Patient[] | undefined | null,
	phone: string | null | undefined,
): Patient | null {
	if (!patientsList || !phone) return null;
	const cleanSearch = normalizePhoneDigits(phone);
	if (cleanSearch.length < 7) return null;

	for (const patient of patientsList) {
		// 1. Match primary patient phone
		if (patient.phone && fuzzyMatchPhone(patient.phone, phone)) {
			return patient;
		}

		// 2. Match legal representative phone in administrative profile
		const repPhone = patient.administrativeProfile?.legalRepresentativePhone;
		if (repPhone && fuzzyMatchPhone(repPhone, phone)) {
			return patient;
		}
	}
	return null;
}
