/**
 * Escapes a cell value for standard CSV format.
 */
export function escapeCsvCell(value: string | number | undefined | null): string {
	if (value === undefined || value === null) return "";
	if (typeof value === "number") {
		return Number.isFinite(value) ? String(value) : "";
	}
	const raw = String(value);
	// Neutralize spreadsheet formula injection (=, +, @, leading tab/CR, or non-numeric leading -)
	const safe =
		/^[\t\r]*[=+@]/.test(raw) || /^[\t\r]*-(?!\d+(?:[.,]\d+)?$)/.test(raw)
			? `'${raw}`
			: raw;
	if (safe.includes(";") || safe.includes('"') || safe.includes("\n") || safe.includes("\r")) {
		return `"${safe.replace(/"/g, '""')}"`;
	}
	return safe;
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
