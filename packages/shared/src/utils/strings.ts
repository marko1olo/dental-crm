import { isValidSnils } from "./snils.js";
import { validateRussianInn } from "../finance/taxDeduction.js";

export function splitLine(line: string, delimiter: string) {
	const values: string[] = [];
	let current = "";
	let inQuotes = false;
	for (let index = 0; index < line.length; index += 1) {
		const char = line[index];
		if (char === '"') {
			inQuotes = !inQuotes;
			continue;
		}
		if (char === delimiter && !inQuotes) {
			values.push(current.trim());
			current = "";
			continue;
		}
		current += char;
	}
	values.push(current.trim());
	return values;
}

export function isValidRussianSnils(
	snilsRaw: string | null | undefined,
): boolean {
	if (!snilsRaw) return true;
	return isValidSnils(snilsRaw);
}

export function isValidRussianInn(innRaw: string | null | undefined): boolean {
	if (!innRaw) return true;
	return validateRussianInn(innRaw).isValid;
}

export function isValidRussianPassport(
	passportRaw: string | null | undefined,
): boolean {
	if (!passportRaw) return true;
	const digits = passportRaw.replace(/\D/g, "");
	return digits.length === 10;
}

export {
	isValidRussianPhone,
	formatPhoneNumber,
	formatRussianPhone,
	formatPhoneRu,
	normalizePhoneToNational,
	normalizePhoneToE164,
	formatPhoneDisplay,
} from "../telephony/formatters.js";


export function escapeHtml(value: unknown): string {
	if (value === null || value === undefined) return "";
	return String(value)
		.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

export function formatPassportString(p?: {
	passportSeries?: string | null;
	passportNumber?: string | null;
	passportIssuedBy?: string | null;
	passportIssuedDate?: string | null;
	passportDepartmentCode?: string | null;
	passportRaw?: string | null;
	[key: string]: unknown;
} | null): string {
	if (!p) return "серия ______ № __________, выдан ____________________________________________________, дата «___» _________ _____ г., код подразделения: _________";
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
