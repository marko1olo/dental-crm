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
