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
