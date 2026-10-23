/**
 * Escapes a cell value for RFC 4180 CSV compliance.
 */
export function escapeCsvCell(value: unknown, delimiter = ";"): string {
	if (value === null || value === undefined) return "";
	const str = String(value);
	if (
		str.includes(delimiter) ||
		str.includes('"') ||
		str.includes("\n") ||
		str.includes("\r")
	) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

/**
 * Universal CSV / TSV text to matrix parser (RFC 4180 compliant with UTF-8 BOM stripping).
 */
export function parseCsvToMatrix(text: string): string[][] {
	const cleaned = text
		.replace(/^\uFEFF/, "")
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n");
	const lines = cleaned.split("\n");
	if (lines.length === 0) return [];

	const sample = lines.slice(0, 10).join("\n");
	const semicolonCount = (sample.match(/;/g) || []).length;
	const commaCount = (sample.match(/,/g) || []).length;
	const tabCount = (sample.match(/\t/g) || []).length;

	let delimiter = ";";
	if (tabCount > semicolonCount && tabCount > commaCount) delimiter = "\t";
	else if (commaCount > semicolonCount && commaCount > tabCount) delimiter = ",";

	const result: string[][] = [];
	for (const line of lines) {
		if (!line.trim()) continue;
		const row: string[] = [];
		let inQuotes = false;
		let currentCell = "";
		for (let i = 0; i < line.length; i++) {
			const char = line[i];
			if (char === '"') {
				if (inQuotes && line[i + 1] === '"') {
					currentCell += '"';
					i++;
				} else {
					inQuotes = !inQuotes;
				}
			} else if (char === delimiter && !inQuotes) {
				row.push(currentCell.trim());
				currentCell = "";
			} else {
				currentCell += char;
			}
		}
		row.push(currentCell.trim());
		result.push(row);
	}
	return result;
}
