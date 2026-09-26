/**
 * Universal CSV & Delimited Format Parser for Clinical Migrations.
 *
 * Provides robust delimiter detection (;, ,, \t, |), RFC-4180 compliant quoting,
 * header normalization, multi-encoding tolerance (BOM stripping), and alias mapping.
 */

export interface CsvParseOptions {
	delimiter?: string;
	skipEmptyLines?: boolean;
	trimValues?: boolean;
	maxRows?: number;
}

export interface CsvParseResult<T = Record<string, string>> {
	delimiter: string;
	headers: string[];
	rows: T[];
	rawRows: string[][];
	totalRows: number;
	warnings: string[];
}

/**
 * Автоматическое определение разделителя по первой осмысленной строке CSV
 */
export function detectCsvDelimiter(text: string): string {
	const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
	if (!lines.length) return ";";

	const headerCandidate = lines[0] ?? "";
	const semicolons = (headerCandidate.match(/;/g) || []).length;
	const commas = (headerCandidate.match(/,/g) || []).length;
	const tabs = (headerCandidate.match(/\t/g) || []).length;
	const pipes = (headerCandidate.match(/\|/g) || []).length;

	if (semicolons >= commas && semicolons >= tabs && semicolons >= pipes && semicolons > 0)
		return ";";
	if (commas >= semicolons && commas >= tabs && commas >= pipes && commas > 0)
		return ",";
	if (tabs >= semicolons && tabs >= commas && tabs >= pipes && tabs > 0)
		return "\t";
	if (pipes >= semicolons && pipes >= commas && pipes >= tabs && pipes > 0)
		return "|";

	return ";";
}

/**
 * Нормализация заголовка (удаление спецсимволов, пробелов, приведение к нижнему регистру)
 */
export function normalizeCsvHeader(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[\ufeff\s_\-./\\()[\]"']+/g, "");
}

/**
 * Разбор строки CSV с учетом кавычек RFC-4180
 */
export function parseCsvLine(line: string, delimiter: string): string[] {
	const values: string[] = [];
	let current = "";
	let inQuotes = false;
	const length = line.length;

	for (let i = 0; i < length; i++) {
		const char = line[i];
		if (char === '"') {
			if (inQuotes && i + 1 < length && line[i + 1] === '"') {
				current += '"';
				i++; // Пропускаем экранированную кавычку
			} else {
				inQuotes = !inQuotes;
			}
		} else if (char === delimiter && !inQuotes) {
			values.push(current);
			current = "";
		} else {
			current += char;
		}
	}
	values.push(current);
	return values;
}

/**
 * Потоковый / пакетный разбор CSV контента на массив сырых строк
 */
export function parseCsvRows(content: string, delimiter?: string): string[][] {
	const clean = content.replace(/^\ufeff/, "");
	const delim = delimiter || detectCsvDelimiter(clean);
	const rawLines = clean.split(/\r?\n/);
	const rows: string[][] = [];

	let pendingLine: string | null = null;

	for (const rawLine of rawLines) {
		if (rawLine.trim().length === 0 && pendingLine === null) continue;

		const current = pendingLine !== null ? `${pendingLine}\n${rawLine}` : rawLine;
		const quoteCount = (current.match(/"/g) || []).length;

		// Если число кавычек нечетное — строка перенеслась внутри ячейки
		if (quoteCount % 2 !== 0) {
			pendingLine = current;
			continue;
		}

		pendingLine = null;
		rows.push(parseCsvLine(current, delim));
	}

	if (pendingLine !== null) {
		rows.push(parseCsvLine(pendingLine, delim));
	}

	return rows;
}

/**
 * Построение карты индексов колонок по словарю алиасов
 */
export function buildColumnMapping<T extends string>(
	headers: string[],
	aliasMap: Record<T, string[]>,
): Record<T, number | null> {
	const mapping = {} as Record<T, number | null>;
	const normalizedHeaders = headers.map((h) => normalizeCsvHeader(h));

	for (const [key, aliases] of Object.entries(aliasMap) as [T, string[]][]) {
		let foundIndex: number | null = null;
		for (const alias of aliases) {
			const normAlias = normalizeCsvHeader(alias);
			const idx = normalizedHeaders.findIndex((h) => h === normAlias || h.includes(normAlias));
			if (idx !== -1) {
				foundIndex = idx;
				break;
			}
		}
		mapping[key] = foundIndex;
	}

	return mapping;
}

/**
 * Преобразование сырой строки CSV в объект на основе карты колонок
 */
export function mapRowByColumnMapping<T extends string>(
	row: string[],
	mapping: Record<T, number | null>,
): Partial<Record<T, string>> {
	const result = {} as Partial<Record<T, string>>;
	for (const [key, index] of Object.entries(mapping) as [T, number | null][]) {
		if (index !== null && index >= 0 && index < row.length) {
			const val = row[index]?.trim();
			if (val) {
				result[key] = val;
			}
		}
	}
	return result;
}

/**
 * Универсальный разбор CSV в типизированный результат
 */
export function parseCsv<T = Record<string, string>>(
	content: string,
	options: CsvParseOptions = {},
): CsvParseResult<T> {
	const warnings: string[] = [];
	const rawRows = parseCsvRows(content, options.delimiter);

	if (rawRows.length === 0) {
		return {
			delimiter: options.delimiter || ";",
			headers: [],
			rows: [],
			rawRows: [],
			totalRows: 0,
			warnings: ["CSV контент пуст."],
		};
	}

	const headers = (rawRows[0] ?? []).map((h) => (options.trimValues ? h.trim() : h));
	const dataRows = rawRows.slice(1);
	const rows: T[] = [];

	const limit = options.maxRows ? Math.min(dataRows.length, options.maxRows) : dataRows.length;

	for (let i = 0; i < limit; i++) {
		const rawRow = dataRows[i] ?? [];
		if (options.skipEmptyLines && rawRow.every((c) => !c.trim())) continue;

		const obj = {} as Record<string, string>;
		headers.forEach((h, colIdx) => {
			const cell = rawRow[colIdx] ?? "";
			obj[h] = options.trimValues ? cell.trim() : cell;
		});
		rows.push(obj as unknown as T);
	}

	return {
		delimiter: options.delimiter || detectCsvDelimiter(content),
		headers,
		rows,
		rawRows,
		totalRows: rows.length,
		warnings,
	};
}
