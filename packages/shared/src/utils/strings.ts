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

/**
 * Санитизация векторной подписи SVG перед вставкой в HTML: удаляет скрипты,
 * foreignObject, обработчики on*=, javascript:/vbscript:/data:text/html.
 */
export function sanitizeSignatureSvg(rawSvg: string): string {
	const trimmed = String(rawSvg ?? "").trim();
	if (!/^<svg[\s>]/i.test(trimmed)) return "";
	return trimmed
		.replace(/<script[\s\S]*?<\/script>/gi, "")
		.replace(/<script\b[^>]*\/?>/gi, "")
		.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
		.replace(/<foreignObject\b[^>]*\/?>/gi, "")
		.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
		.replace(/(?:href|xlink:href)\s*=\s*(?:"\s*(?:javascript|vbscript|data:text\/html)[^"]*"|'\s*(?:javascript|vbscript|data:text\/html)[^']*')/gi, "")
		.replace(/(?:javascript|vbscript|data:text\/html)\s*:/gi, "blocked:");
}

/**
 * Валидация и экранирование src для <img> подписи (data:image/png|jpeg|webp|svg+xml или безопасный https:/относительный путь).
 */
export function sanitizeImageDataUrl(rawUrl: string): string {
	const trimmed = String(rawUrl ?? "").trim();
	if (!trimmed) return "";
	if (/^data:image\/(?:png|jpe?g|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=\s]+$/i.test(trimmed)) {
		return escapeHtml(trimmed);
	}
	if (/^https:\/\/[^\s"'<>]+$/i.test(trimmed) || /^\/[^/\s"'<>][^\s"'<>]*$/.test(trimmed)) {
		return escapeHtml(trimmed);
	}
	return "";
}

export interface PassportStringPayload {
	readonly passportSeries?: string | null | undefined;
	readonly passportNumber?: string | null | undefined;
	readonly passportIssuedBy?: string | null | undefined;
	readonly passportIssuedDate?: string | null | undefined;
	readonly passportDepartmentCode?: string | null | undefined;
	readonly passportRaw?: string | null | undefined;
}

export function formatPassportString(p?: PassportStringPayload | null | undefined): string {
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
