import {
	readZipEntries,
	type ZipEntry,
} from "../../ingestion/documentExtractor.js";

/**
 * Чтение книг Excel (.xlsx) и OpenDocument (.ods) в виде строк с колонками.
 *
 * ЗАЧЕМ ОТДЕЛЬНО ОТ extractXlsx В documentExtractor.ts
 * Тот разбор склеивает ячейки строки в порядке появления тега <c>:
 *
 *     .map((cellMatch) => extractCellValue(...)).join("\t")
 *
 * В формате OpenXML пустая ячейка НЕ записывается вовсе — её позиция известна
 * только из атрибута r="B2". Поэтому строка «Иванов | (пусто) | 89001234567»
 * склеивается в «Иванов→89001234567», и телефон встаёт в колонку даты рождения.
 * Для чтения текста документа это терпимо; для переноса базы это порча данных,
 * которую никто не заметит: колонки просто съезжают на одну влево у части строк.
 *
 * Здесь адрес ячейки читается всегда, и пустые позиции сохраняются.
 */

interface SpreadsheetSheet {
	name: string;
	/** Строки, выровненные по колонкам: длина каждой равна числу колонок листа. */
	rows: string[][];
}

export interface SpreadsheetParseResult {
	sheets: SpreadsheetSheet[];
	warnings: string[];
}

/** «BC» → 55. Адреса в OpenXML буквенные, база 26 без нуля. */
export function columnLettersToIndex(letters: string): number {
	let index = 0;
	for (const char of letters.toUpperCase()) {
		const value = char.charCodeAt(0) - 64;
		if (value < 1 || value > 26) return -1;
		index = index * 26 + value;
	}
	return index - 1;
}

function xmlDecodeEntities(value: string): string {
	return (
		value
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&quot;/g, '"')
			.replace(/&apos;/g, "'")
			.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
				String.fromCodePoint(Number.parseInt(hex, 16)),
			)
			.replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
			// Амперсанд последним, иначе «&amp;lt;» развернётся дважды.
			.replace(/&amp;/g, "&")
	);
}

/** Текст внутри элемента без разметки. Для <si> и <is> с несколькими <t>. */
function elementText(xml: string): string {
	const pieces = Array.from(xml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)).map(
		(match) => match[1] ?? "",
	);
	if (pieces.length > 0) return xmlDecodeEntities(pieces.join(""));
	return xmlDecodeEntities(xml.replace(/<[^>]*>/g, ""));
}

function readSharedStrings(entries: ZipEntry[]): string[] {
	const entry = entries.find((candidate) =>
		/(?:^|\/)xl\/sharedStrings\.xml$/.test(candidate.name),
	);
	if (!entry) return [];
	const xml = entry.data.toString("utf8");
	return Array.from(
		xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>|<si\b[^>]*\/>/g),
	).map((match) => (match[1] === undefined ? "" : elementText(match[1])));
}

/**
 * Форматы, по которым видно, что число в ячейке — дата. Excel хранит даты
 * числом, и без разбора formatCode дата 15.03.1992 приезжает как «33683».
 * Числовой формат берётся из styles.xml по индексу стиля ячейки.
 */
function readDateStyleIndexes(entries: ZipEntry[]): Set<number> {
	const dateStyles = new Set<number>();
	const entry = entries.find((candidate) =>
		/(?:^|\/)xl\/styles\.xml$/.test(candidate.name),
	);
	if (!entry) return dateStyles;
	const xml = entry.data.toString("utf8");

	/**
	 * Встроенные форматы дат по спецификации ECMA-376: 14–17 и 22 — даты,
	 * 45–47 — время, 27–36 и 50–58 — региональные календарные форматы.
	 */
	const builtInDateFormats = new Set([
		14, 15, 16, 17, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50,
		51, 52, 53, 54, 55, 56, 57, 58,
	]);

	const customDateFormats = new Set<number>();
	for (const match of xml.matchAll(
		/<numFmt\b[^>]*numFmtId="(\d+)"[^>]*formatCode="([^"]*)"/g,
	)) {
		const id = Number(match[1]);
		const code = xmlDecodeEntities(match[2] ?? "");
		// Признак даты в формате: d/m/y вне литералов, при отсутствии знака валюты.
		const stripped = code.replace(/"[^"]*"/g, "").replace(/\[[^\]]*\]/g, "");
		if (
			/[dmyhs]/i.test(stripped) &&
			/[dmy]/i.test(stripped) &&
			!/[#0]/.test(stripped)
		) {
			customDateFormats.add(id);
		}
	}

	const cellXfsBlock =
		/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(xml)?.[1] ?? "";
	const xfEntries = Array.from(
		cellXfsBlock.matchAll(/<xf\b[^>]*>|<xf\b[^>]*\/>/g),
	);
	xfEntries.forEach((match, index) => {
		const numFmtId = Number(
			/numFmtId="(\d+)"/.exec(match[0] ?? "")?.[1] ?? "0",
		);
		if (builtInDateFormats.has(numFmtId) || customDateFormats.has(numFmtId)) {
			dateStyles.add(index);
		}
	});

	return dateStyles;
}

/** Серийная дата Excel → ISO. Та же эпоха, что в valueNormalize. */
function excelSerialToIso(serial: number): string | null {
	if (!Number.isFinite(serial) || serial <= 0 || serial > 2_958_465)
		return null;
	const wholeDays = Math.floor(serial);
	const date = new Date(Date.UTC(1899, 11, 30) + wholeDays * 86_400_000);
	if (Number.isNaN(date.getTime())) return null;
	return date.toISOString().slice(0, 10);
}

function readSheetNames(entries: ZipEntry[]): Map<string, string> {
	/**
	 * Имя листа лежит в workbook.xml и связано с файлом через r:id в
	 * workbook.xml.rels. Без этого листы называются sheet1.xml, и оператор не
	 * понимает, какой из них «Пациенты», а какой «Платежи».
	 */
	const names = new Map<string, string>();
	const workbook = entries.find((candidate) =>
		/(?:^|\/)xl\/workbook\.xml$/.test(candidate.name),
	);
	const rels = entries.find((candidate) =>
		/(?:^|\/)xl\/_rels\/workbook\.xml\.rels$/.test(candidate.name),
	);
	if (!workbook || !rels) return names;

	const relTargets = new Map<string, string>();
	for (const match of rels.data
		.toString("utf8")
		.matchAll(/<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		relTargets.set(match[1]!, (match[2] ?? "").replace(/^\/?(xl\/)?/, ""));
	}

	for (const match of workbook.data
		.toString("utf8")
		.matchAll(/<sheet\b[^>]*\/>|<sheet\b[^>]*>/g)) {
		const tag = match[0];
		const name = xmlDecodeEntities(/name="([^"]*)"/.exec(tag)?.[1] ?? "");
		const relId = /r:id="([^"]+)"/.exec(tag)?.[1];
		if (!name || !relId) continue;
		const target = relTargets.get(relId);
		if (target) names.set(target, name);
	}
	return names;
}

export function parseXlsx(buffer: Buffer): SpreadsheetParseResult {
	const zip = readZipEntries(buffer);
	const warnings = zip.warnings.map((code) => `Архив книги Excel: ${code}.`);
	if (zip.entries.length === 0) {
		return {
			sheets: [],
			warnings: [
				...warnings,
				"Книга Excel не открылась: контейнер ZIP не прочитан.",
			],
		};
	}

	const shared = readSharedStrings(zip.entries);
	const dateStyles = readDateStyleIndexes(zip.entries);
	const sheetNames = readSheetNames(zip.entries);

	const sheetEntries = zip.entries
		.filter((entry) =>
			/(?:^|\/)xl\/worksheets\/sheet\d+\.xml$/.test(entry.name),
		)
		.sort((left, right) =>
			left.name.localeCompare(right.name, "en", { numeric: true }),
		);

	const sheets: SpreadsheetSheet[] = [];

	for (const entry of sheetEntries) {
		const xml = entry.data.toString("utf8");
		const relativeName = entry.name.replace(
			/^.*?(worksheets\/sheet\d+\.xml)$/,
			"$1",
		);
		const displayName =
			sheetNames.get(relativeName) ??
			sheetNames.get(entry.name) ??
			relativeName;

		const sparseRows = new Map<number, Map<number, string>>();
		let maxColumnIndex = -1;

		for (const rowMatch of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
			const rowAttributes = rowMatch[1] ?? "";
			const rowXml = rowMatch[2] ?? "";
			// Номер строки из атрибута r: пропущенные строки не должны сдвигать таблицу.
			const declaredRow = Number(/\br="(\d+)"/.exec(rowAttributes)?.[1] ?? "0");
			const rowIndex = declaredRow > 0 ? declaredRow - 1 : sparseRows.size;

			const cells = new Map<number, string>();
			let fallbackColumn = 0;

			for (const cellMatch of xml === ""
				? []
				: rowXml.matchAll(/<c\b([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
				const attributes = cellMatch[1] ?? "";
				const body = cellMatch[2] ?? "";

				// Адрес ячейки — источник истины о номере колонки.
				const reference = /\br="([A-Z]+)(\d+)"/i.exec(attributes);
				const columnIndex = reference
					? // biome-ignore lint/style/noNonNullAssertion: automated suppression
						columnLettersToIndex(reference[1]!)
					: fallbackColumn;
				if (columnIndex < 0) continue;
				fallbackColumn = columnIndex + 1;

				const type = /\bt="([^"]+)"/.exec(attributes)?.[1] ?? "n";
				const styleIndex = Number(/\bs="(\d+)"/.exec(attributes)?.[1] ?? "-1");

				let value: string;
				if (type === "inlineStr") {
					const inline = /<is\b[^>]*>([\s\S]*?)<\/is>/.exec(body)?.[1] ?? body;
					value = elementText(inline);
				} else if (type === "s") {
					const rawIndex = Number(/<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "");
					value = Number.isInteger(rawIndex) ? (shared[rawIndex] ?? "") : "";
				} else if (type === "str") {
					// Результат формулы как строка.
					value = xmlDecodeEntities(/<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "");
				} else if (type === "b") {
					const raw = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "";
					value = raw === "1" ? "1" : "0";
				} else if (type === "e") {
					// Ошибка формулы (#N/A, #DIV/0!) — не данные, но и не пустота.
					value = xmlDecodeEntities(/<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "");
				} else if (type === "d") {
					// ISO-дата в явном виде (Excel 2010+).
					value = xmlDecodeEntities(/<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "");
				} else {
					const raw = xmlDecodeEntities(
						/<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "",
					);
					if (raw !== "" && dateStyles.has(styleIndex)) {
						const iso = excelSerialToIso(Number(raw));
						value = iso ?? raw;
					} else {
						value = raw;
					}
				}

				cells.set(columnIndex, value);
				if (columnIndex > maxColumnIndex) maxColumnIndex = columnIndex;
			}

			if (cells.size > 0) sparseRows.set(rowIndex, cells);
		}

		if (sparseRows.size === 0) continue;

		const width = maxColumnIndex + 1;
		const orderedRowIndexes = [...sparseRows.keys()].sort(
			(left, right) => left - right,
		);
		const rows = orderedRowIndexes.map((rowIndex) => {
			// biome-ignore lint/style/noNonNullAssertion: automated suppression
			const cells = sparseRows.get(rowIndex)!;
			// Пустые позиции восстанавливаются как пустые строки, а не пропускаются.
			return Array.from(
				{ length: width },
				(_, columnIndex) => cells.get(columnIndex) ?? "",
			);
		});

		sheets.push({ name: displayName, rows });
	}

	if (sheets.length === 0) {
		warnings.push("В книге Excel не найдено ни одной заполненной таблицы.");
	}
	if (sheets.length > 1) {
		warnings.push(
			`В книге ${sheets.length} лист(ов): ${sheets.map((sheet) => sheet.name).join(", ")}. Перенос выполняется по каждому листу отдельно.`,
		);
	}

	return { sheets, warnings };
}

/**
 * OpenDocument (.ods). Формат проще: ячейки идут по порядку, но повторы
 * сжимаются атрибутом number-columns-repeated, и его нужно разворачивать —
 * иначе колонки съезжают точно так же, как в xlsx с пустыми ячейками.
 */
export function parseOds(buffer: Buffer): SpreadsheetParseResult {
	const zip = readZipEntries(buffer);
	const warnings = zip.warnings.map((code) => `Архив ODS: ${code}.`);
	const content = zip.entries.find((entry) =>
		/(?:^|\/)content\.xml$/.test(entry.name),
	);
	if (!content) {
		return {
			sheets: [],
			warnings: [...warnings, "Файл ODS не открылся: content.xml не найден."],
		};
	}

	const xml = content.data.toString("utf8");
	const sheets: SpreadsheetSheet[] = [];

	for (const tableMatch of xml.matchAll(
		/<table:table\b([^>]*)>([\s\S]*?)<\/table:table>/g,
	)) {
		const name = xmlDecodeEntities(
			/table:name="([^"]*)"/.exec(tableMatch[1] ?? "")?.[1] ??
				`Лист ${sheets.length + 1}`,
		);
		const body = tableMatch[2] ?? "";
		const rows: string[][] = [];

		for (const rowMatch of body.matchAll(
			/<table:table-row\b([^>]*)>([\s\S]*?)<\/table:table-row>|<table:table-row\b([^>]*)\/>/g,
		)) {
			const rowAttributes = rowMatch[1] ?? rowMatch[3] ?? "";
			const rowBody = rowMatch[2] ?? "";
			const rowRepeat = Math.min(
				Number(
					/table:number-rows-repeated="(\d+)"/.exec(rowAttributes)?.[1] ?? "1",
				),
				10_000,
			);

			const cells: string[] = [];
			for (const cellMatch of rowBody.matchAll(
				/<table:table-cell\b([^>]*)>([\s\S]*?)<\/table:table-cell>|<table:table-cell\b([^>]*)\/>/g,
			)) {
				const attributes = cellMatch[1] ?? cellMatch[3] ?? "";
				const cellBody = cellMatch[2] ?? "";
				const repeat = Math.min(
					Number(
						/table:number-columns-repeated="(\d+)"/.exec(attributes)?.[1] ??
							"1",
					),
					4096,
				);

				// Дата и число хранятся в атрибутах, текст — в <text:p>.
				const dateValue = /office:date-value="([^"]*)"/.exec(attributes)?.[1];
				const numberValue = /office:value="([^"]*)"/.exec(attributes)?.[1];
				const text = Array.from(
					cellBody.matchAll(/<text:p\b[^>]*>([\s\S]*?)<\/text:p>/g),
				)
					.map((match) =>
						xmlDecodeEntities((match[1] ?? "").replace(/<[^>]*>/g, "")),
					)
					.join("\n");

				const value = dateValue
					? dateValue.slice(0, 10)
					: text !== ""
						? text
						: (numberValue ?? "");
				for (let index = 0; index < repeat; index += 1) cells.push(value);
			}

			// Хвост из повторяющихся пустых ячеек не несёт данных.
			while (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
			if (cells.length === 0) continue;
			for (let index = 0; index < rowRepeat; index += 1) rows.push([...cells]);
		}

		if (rows.length === 0) continue;
		const width = Math.max(...rows.map((row) => row.length));
		sheets.push({
			name,
			rows: rows.map((row) => [
				...row,
				...Array<string>(width - row.length).fill(""),
			]),
		});
	}

	if (sheets.length === 0)
		warnings.push("В файле ODS не найдено ни одной заполненной таблицы.");
	return { sheets, warnings };
}

/** Признак ZIP-контейнера OpenXML/OpenDocument. */
export function looksLikeZipContainer(buffer: Buffer): boolean {
	return (
		buffer.length >= 4 &&
		buffer[0] === 0x50 &&
		buffer[1] === 0x4b &&
		(buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07)
	);
}
