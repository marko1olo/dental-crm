/**
 * csvParser.ts — Парсер CSV файлов с автоопределением разделителей для импорта данных.
 * Мандаты: 8b (<= 120 строк), 8n (соло-практика: легкий импорт без ИТ-специалиста).
 */

export function parseCsvRows(rawContent: string, explicitDelimiter?: string): { headers: string[]; rows: Record<string, string>[] } {
	const lines = rawContent
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter(Boolean);

	if (lines.length === 0) return { headers: [], rows: [] };

	const firstLine = lines[0] ?? "";
	let delimiter = explicitDelimiter;
	if (!delimiter) {
		const semiCount = (firstLine.match(/;/g) || []).length;
		const commaCount = (firstLine.match(/,/g) || []).length;
		const tabCount = (firstLine.match(/\t/g) || []).length;

		if (semiCount >= commaCount && semiCount >= tabCount && semiCount > 0) delimiter = ";";
		else if (tabCount > commaCount && tabCount > 0) delimiter = "\t";
		else delimiter = ",";
	}

	function parseLine(line: string, delim: string): string[] {
		const result: string[] = [];
		let current = "";
		let inQuotes = false;

		for (let i = 0; i < line.length; i++) {
			const char = line[i];
			if (char === '"') {
				if (inQuotes && line[i + 1] === '"') {
					current += '"';
					i++;
				} else {
					inQuotes = !inQuotes;
				}
			} else if (char === delim && !inQuotes) {
				result.push(current.trim());
				current = "";
			} else {
				current += char;
			}
		}
		result.push(current.trim());
		return result;
	}

	const headers = parseLine(firstLine, delimiter).map((h) => h.toLowerCase().replace(/["\r\n]/g, "").trim());
	const rows: Record<string, string>[] = [];
	for (let i = 1; i < lines.length; i++) {
		const currentLine = lines[i];
		if (!currentLine) continue;
		const values = parseLine(currentLine, delimiter);
		const rowObj: Record<string, string> = {};
		for (let hIdx = 0; hIdx < headers.length; hIdx++) {
			const headerName = headers[hIdx];
			if (headerName !== undefined) rowObj[headerName] = values[hIdx] ?? "";
		}
		rows.push(rowObj);
	}

	return { headers, rows };
}
