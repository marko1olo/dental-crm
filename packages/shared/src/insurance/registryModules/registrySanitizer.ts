/**
 * Escapes a cell value for standard CSV format.
 */
export function escapeCsvCell(value: string | number | undefined | null): string {
	if (value === undefined || value === null) return "";
	const str = String(value);
	if (str.includes(";") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

/**
 * Normalizes date to ISO YYYY-MM-DD or clinical DD.MM.YYYY.
 */
export function formatClinicalDateRu(dateIso: string): string {
	if (!dateIso) return "";
	const parts = dateIso.slice(0, 10).split("-");
	if (parts.length === 3) {
		return `${parts[2]}.${parts[1]}.${parts[0]}`;
	}
	return dateIso;
}

/**
 * Sanitizes registry string value by stripping invalid control characters.
 */
export function sanitizeRegistryString(str: string): string {
	if (!str) return "";
	return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
}
