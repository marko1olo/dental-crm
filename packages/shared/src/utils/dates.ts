/**
 * Normalizes Russian (DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY) or ISO (YYYY-MM-DD)
 * date representations into canonical YYYY-MM-DD.
 * Returns null for null, undefined, empty, or unparseable strings.
 */
export function normalizeDate(value: string | null | undefined): string | null {
	if (!value) return null;
	const trimmed = String(value).trim();
	if (!trimmed) return null;

	// Russian: DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY
	const ruMatch = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/.exec(trimmed);
	if (ruMatch) {
		const day = (ruMatch[1] ?? "01").padStart(2, "0");
		const month = (ruMatch[2] ?? "01").padStart(2, "0");
		const year = ruMatch[3] ?? "2000";
		return `${year}-${month}-${day}`;
	}

	// ISO: YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD
	const isoMatch = /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/.exec(trimmed);
	if (isoMatch) {
		const year = isoMatch[1] ?? "2000";
		const month = (isoMatch[2] ?? "01").padStart(2, "0");
		const day = (isoMatch[3] ?? "01").padStart(2, "0");
		return `${year}-${month}-${day}`;
	}

	return null;
}

