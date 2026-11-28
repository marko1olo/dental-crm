import yauzl from "yauzl";
import {
	ByteLimitTransform,
	iterateZipEntries,
	readLimitedStreamToBuffer,
	safeFileLabel,
	ZipBombLimitError,
} from "../../ingestion/docExtractor/zipReader.js";
import { streamXmlTagElements } from "./streamingXmlRowScanner.js";

/**
 * Чтение книг Excel (.xlsx) и OpenDocument (.ods) в виде строк с колонками
 * потоково на базе yauzl + streamXmlTagElements без загрузки XML листов в память.
 *
 * ЗАЧЕМ ОТДЕЛЬНО ОТ extractXlsx В documentExtractor.ts
 * В формате OpenXML пустая ячейка не записывается вовсе — её позиция известна
 * только из атрибута r="B2". Здесь адрес ячейки читается всегда, и пустые
 * позиции сохраняются (иначе телефон встаёт в колонку даты рождения).
 */

export interface SpreadsheetSheet {
	name: string;
	/** Строки, выровненные по колонкам: длина каждой равна числу колонок листа. */
	rows: string[][];
}

export interface SpreadsheetParseResult {
	sheets: SpreadsheetSheet[];
	warnings: string[];
}

export interface StreamedXlsxBatch {
	sheetName: string;
	sheetIndex: number;
	columns: string[];
	rows: string[][];
	firstRowNumber: number;
	warnings: string[];
}

const MAX_SHARED_STRINGS_BYTES = 64 * 1024 * 1024;
const MAX_STYLES_OR_WORKBOOK_BYTES = 16 * 1024 * 1024;
const MAX_WORKSHEET_XML_BYTES = 512 * 1024 * 1024;
const MAX_ODS_CONTENT_BYTES = 128 * 1024 * 1024;

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

/**
 * Форматы, по которым видно, что число в ячейке — дата. Excel хранит даты
 * числом, и без разбора formatCode дата 15.03.1992 приезжает как «33683».
 */
function parseDateStyleIndexesFromXml(xml: string): Set<number> {
	const dateStyles = new Set<number>();
	if (!xml) return dateStyles;

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

function parseSheetNamesFromXml(
	workbookXml: string,
	relsXml: string,
): Map<string, string> {
	const names = new Map<string, string>();
	if (!workbookXml || !relsXml) return names;

	const relTargets = new Map<string, string>();
	for (const match of relsXml.matchAll(
		/<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g,
	)) {
		if (match[1]) {
			relTargets.set(match[1], (match[2] ?? "").replace(/^\/?(xl\/)?/, ""));
		}
	}

	for (const match of workbookXml.matchAll(/<sheet\b[^>]*\/>|<sheet\b[^>]*>/g)) {
		const tag = match[0];
		const name = xmlDecodeEntities(/name="([^"]*)"/.exec(tag)?.[1] ?? "");
		const relId = /r:id="([^"]+)"/.exec(tag)?.[1];
		if (!name || !relId) continue;
		const target = relTargets.get(relId);
		if (target) names.set(target, name);
	}
	return names;
}

function parseRowCells(
	rowXml: string,
	shared: readonly string[],
	dateStyles: ReadonlySet<number>,
): { cells: Map<number, string>; maxColumnIndex: number } {
	const cells = new Map<number, string>();
	let maxColumnIndex = -1;
	let fallbackColumn = 0;

	for (const cellMatch of rowXml.matchAll(
		/<c\b([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g,
	)) {
		const attributes = cellMatch[1] ?? "";
		const body = cellMatch[2] ?? "";

		const reference = /\br="([A-Z]+)(\d+)"/i.exec(attributes);
		const columnIndex = reference?.[1]
			? columnLettersToIndex(reference[1])
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
			value = xmlDecodeEntities(/<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "");
		} else if (type === "b") {
			const raw = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "";
			value = raw === "1" ? "1" : "0";
		} else if (type === "e") {
			value = xmlDecodeEntities(/<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "");
		} else if (type === "d") {
			value = xmlDecodeEntities(/<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "");
		} else {
			const raw = xmlDecodeEntities(/<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "");
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

	return { cells, maxColumnIndex };
}

interface XlsxMetadataPassResult {
	shared: string[];
	dateStyles: Set<number>;
	sheetNames: Map<string, string>;
	sheetEntryNames: string[];
	warnings: string[];
	visitedCount: number;
}

async function readXlsxMetadataPass(
	source: Buffer | string,
): Promise<XlsxMetadataPassResult> {
	const shared: string[] = [];
	let stylesXml = "";
	let workbookXml = "";
	let relsXml = "";
	const sheetEntryNames: string[] = [];

	const { warnings, visitedCount } = await iterateZipEntries(
		source,
		async (entry) => {
			if (/(?:^|\/)xl\/sharedStrings\.xml$/.test(entry.name)) {
				const stream = await entry.openStream(MAX_SHARED_STRINGS_BYTES);
				for await (const siEl of streamXmlTagElements(stream, "si")) {
					shared.push(siEl.innerXml ? elementText(siEl.innerXml) : "");
				}
			} else if (/(?:^|\/)xl\/styles\.xml$/.test(entry.name)) {
				const buf = await readLimitedStreamToBuffer(
					await entry.openStream(MAX_STYLES_OR_WORKBOOK_BYTES),
				);
				stylesXml = buf.toString("utf8");
			} else if (/(?:^|\/)xl\/workbook\.xml$/.test(entry.name)) {
				const buf = await readLimitedStreamToBuffer(
					await entry.openStream(MAX_STYLES_OR_WORKBOOK_BYTES),
				);
				workbookXml = buf.toString("utf8");
			} else if (/(?:^|\/)xl\/_rels\/workbook\.xml\.rels$/.test(entry.name)) {
				const buf = await readLimitedStreamToBuffer(
					await entry.openStream(MAX_STYLES_OR_WORKBOOK_BYTES),
				);
				relsXml = buf.toString("utf8");
			} else if (/(?:^|\/)xl\/worksheets\/sheet\d+\.xml$/.test(entry.name)) {
				sheetEntryNames.push(entry.name);
			}
		},
		{
			maxEntryBytes: MAX_SHARED_STRINGS_BYTES,
			maxTotalBytes: MAX_SHARED_STRINGS_BYTES + MAX_STYLES_OR_WORKBOOK_BYTES * 3,
			// В проходе 1 sheet*.xml не читаются — не отсекаем архив по их суммарному размеру
			checkDeclaredSize: false,
		},
	);

	sheetEntryNames.sort((left, right) =>
		left.localeCompare(right, "en", { numeric: true }),
	);

	return {
		shared,
		dateStyles: parseDateStyleIndexesFromXml(stylesXml),
		sheetNames: parseSheetNamesFromXml(workbookXml, relsXml),
		sheetEntryNames,
		warnings: warnings.map((code) => `Архив книги Excel: ${code}.`),
		visitedCount,
	};
}

function resolveSheetDisplayName(
	entryName: string,
	sheetNames: ReadonlyMap<string, string>,
): string {
	const relativeName = entryName.replace(
		/^.*?(worksheets\/sheet\d+\.xml)$/,
		"$1",
	);
	return (
		sheetNames.get(relativeName) ??
		sheetNames.get(entryName) ??
		relativeName
	);
}

export async function readXlsxSheetNames(source: Buffer | string): Promise<string[]> {
	const meta = await readXlsxMetadataPass(source);
	return meta.sheetEntryNames.map((entryName) =>
		resolveSheetDisplayName(entryName, meta.sheetNames),
	);
}

/**
 * Истинно потоковый ленивый генератор батчей XLSX (yauzl lazyEntries -> ByteLimitTransform -> XML SAX):
 * каждый батч отдаётся вызывающему коду немедленно через `yield` без накопления листа или батчей в ОЗУ.
 */
export async function* streamXlsxSheetBatches(
	source: Buffer | string,
	options?: {
		readonly batchRows?: number | undefined;
		readonly maxRowsPerSheet?: number | undefined;
		readonly sheetIndex?: number | undefined;
	},
): AsyncGenerator<StreamedXlsxBatch, void, undefined> {
	const batchRows = options?.batchRows ?? 1000;
	const maxRowsPerSheet = options?.maxRowsPerSheet ?? Number.POSITIVE_INFINITY;

	const meta = await readXlsxMetadataPass(source);
	if (meta.sheetEntryNames.length === 0) return;

	const targetSheetNames =
		options?.sheetIndex !== undefined
			? meta.sheetEntryNames.slice(options.sheetIndex, options.sheetIndex + 1)
			: meta.sheetEntryNames;

	for (let sIdx = 0; sIdx < targetSheetNames.length; sIdx += 1) {
		const targetEntryName = targetSheetNames[sIdx];
		if (!targetEntryName) continue;
		const displayName = resolveSheetDisplayName(targetEntryName, meta.sheetNames);

		let columns: string[] = [];
		let headerCaptured = false;
		let pendingCells: Array<Map<number, string>> = [];
		let observedMaxCol = -1;
		let totalDataRowsEmitted = 0;
		let emittedAnyBatch = false;
		let hitLimit = false;
		const passWarnings: string[] = [];

		const flushPending = (isFirstHeaderBatch: boolean): StreamedXlsxBatch | null => {
			if (pendingCells.length === 0) return null;
			const width = Math.max(columns.length, observedMaxCol + 1);
			if (!headerCaptured && pendingCells.length > 0) {
				const firstMap = pendingCells.shift();
				if (firstMap) {
					columns = Array.from(
						{ length: width },
						(_, colIdx) => firstMap.get(colIdx) ?? "",
					);
				}
				headerCaptured = true;
			}
			if (pendingCells.length === 0) return null;

			const rows = pendingCells.map((cellMap) =>
				Array.from({ length: width }, (_, colIdx) => cellMap.get(colIdx) ?? ""),
			);
			const firstRowNumber = totalDataRowsEmitted + 2;
			totalDataRowsEmitted += rows.length;
			pendingCells = [];
			return {
				sheetName: displayName,
				sheetIndex: options?.sheetIndex ?? sIdx,
				columns: columns.length === width
					? columns
					: [...columns, ...Array<string>(width - columns.length).fill("")],
				rows,
				firstRowNumber,
				warnings: isFirstHeaderBatch ? [...meta.warnings] : [],
			};
		};

		if (Buffer.isBuffer(source) && source.length < 22) {
			passWarnings.push("Архив книги Excel: zip_buffer_too_small.");
		} else {
			let zipfile: yauzl.ZipFile | undefined;
			const sharedBudget = { used: 0, maxTotal: MAX_WORKSHEET_XML_BYTES * 2 };
			try {
				zipfile = Buffer.isBuffer(source)
					? await yauzl.fromBufferPromise(source, { lazyEntries: true })
					: await yauzl.openPromise(source, { lazyEntries: true });

				for await (const entry of zipfile.eachEntry()) {
					const name = entry.fileName.replace(/\\/g, "/");
					if (name !== targetEntryName) continue;
					if (entry.isEncrypted()) {
						passWarnings.push(
							`Архив книги Excel: zip_encrypted_entry:${safeFileLabel(name, "Файл архива")}.`,
						);
						break;
					}

					const rawStream = await zipfile.openReadStreamPromise(entry);
					const limiter = new ByteLimitTransform(MAX_WORKSHEET_XML_BYTES, sharedBudget);
					rawStream.on("error", (err) => limiter.destroy(err));
					limiter.on("close", () => {
						if (!rawStream.destroyed) rawStream.destroy();
					});
					const stream = rawStream.pipe(limiter);

					try {
						for await (const rowEl of streamXmlTagElements(stream, "row")) {
							const { cells, maxColumnIndex } = parseRowCells(
								rowEl.innerXml,
								meta.shared,
								meta.dateStyles,
							);
							if (cells.size === 0) continue;
							if (maxColumnIndex > observedMaxCol) observedMaxCol = maxColumnIndex;

							pendingCells.push(cells);

							const dataCountPending = headerCaptured
								? pendingCells.length
								: Math.max(0, pendingCells.length - 1);

							if (dataCountPending >= batchRows) {
								const batch = flushPending(!emittedAnyBatch);
								if (batch) {
									emittedAnyBatch = true;
									yield batch;
								}
							}

							if (totalDataRowsEmitted + pendingCells.length >= maxRowsPerSheet + 1) {
								hitLimit = true;
								stream.destroy();
								break;
							}
						}
					} catch (streamErr: unknown) {
						if (streamErr instanceof ZipBombLimitError) {
							passWarnings.push("Архив книги Excel: zip_bomb_size_limit_exceeded.");
						} else {
							const reason =
								streamErr instanceof Error ? streamErr.message : "inflate_error";
							passWarnings.push(
								`Архив книги Excel: zip_entry_inflate_failed:${safeFileLabel(name, "Файл архива")}:${reason}.`,
							);
						}
					}
					break;
				}
			} catch (zipErr: unknown) {
				passWarnings.push(
					`Архив книги Excel: zip_read_error:${zipErr instanceof Error ? zipErr.message : "corrupted_zip"}.`,
				);
			} finally {
				try {
					zipfile?.close();
				} catch {
					// yauzl уже закрыт
				}
			}
		}

		if (!hitLimit || pendingCells.length > 0) {
			const tailBatch = flushPending(!emittedAnyBatch);
			if (tailBatch) {
				if (passWarnings.length > 0) {
					tailBatch.warnings.push(...passWarnings);
				}
				emittedAnyBatch = true;
				yield tailBatch;
			}
		}
	}
}

export async function parseXlsx(
	source: Buffer | string,
): Promise<SpreadsheetParseResult> {
	const meta = await readXlsxMetadataPass(source);
	const warnings = [...meta.warnings];

	if (meta.visitedCount === 0) {
		return {
			sheets: [],
			warnings: [
				...warnings,
				"Книга Excel не открылась: контейнер ZIP не прочитан.",
			],
		};
	}

	const sheets: SpreadsheetSheet[] = [];
	const targetSet = new Set(meta.sheetEntryNames);
	const parsedByEntry = new Map<
		string,
		{
			displayName: string;
			sparseRows: Map<number, Map<number, string>>;
			maxColumnIndex: number;
		}
	>();

	const pass2 = await iterateZipEntries(
		source,
		async (entry) => {
			if (!targetSet.has(entry.name)) return;
			const displayName = resolveSheetDisplayName(entry.name, meta.sheetNames);
			const sparseRows = new Map<number, Map<number, string>>();
			let maxColumnIndex = -1;

			const stream = await entry.openStream(MAX_WORKSHEET_XML_BYTES);
			for await (const rowEl of streamXmlTagElements(stream, "row")) {
				const declaredRow = Number(
					/\br="(\d+)"/.exec(rowEl.attrs)?.[1] ?? "0",
				);
				const rowIndex = declaredRow > 0 ? declaredRow - 1 : sparseRows.size;

				const parsedRow = parseRowCells(
					rowEl.innerXml,
					meta.shared,
					meta.dateStyles,
				);
				if (parsedRow.cells.size > 0) {
					sparseRows.set(rowIndex, parsedRow.cells);
					if (parsedRow.maxColumnIndex > maxColumnIndex) {
						maxColumnIndex = parsedRow.maxColumnIndex;
					}
				}
			}

			parsedByEntry.set(entry.name, {
				displayName,
				sparseRows,
				maxColumnIndex,
			});
		},
		{
			maxEntryBytes: MAX_WORKSHEET_XML_BYTES,
			maxTotalBytes: MAX_WORKSHEET_XML_BYTES * 2,
			checkDeclaredSize: false,
		},
	);

	for (const code of pass2.warnings) {
		const formatted = `Архив книги Excel: ${code}.`;
		if (!warnings.includes(formatted)) warnings.push(formatted);
	}

	for (const entryName of meta.sheetEntryNames) {
		const sheetData = parsedByEntry.get(entryName);
		if (!sheetData || sheetData.sparseRows.size === 0) continue;

		const width = sheetData.maxColumnIndex + 1;
		const orderedRowIndexes = [...sheetData.sparseRows.keys()].sort(
			(left, right) => left - right,
		);
		const rows = orderedRowIndexes.map((rowIndex) => {
			const cells = sheetData.sparseRows.get(rowIndex);
			return Array.from(
				{ length: width },
				(_, columnIndex) => cells?.get(columnIndex) ?? "",
			);
		});
		sheets.push({ name: sheetData.displayName, rows });
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

const MAX_ODS_ROWS_PER_SHEET = 50_000;

export interface ParseOdsOptions {
	readonly maxRowsPerSheet?: number | undefined;
	readonly selectedSheetIndex?: number | undefined;
}

/**
 * OpenDocument (.ods) — потоковый разбор через yauzl + streamXmlTagElements("table:table").
 */
export async function parseOds(
	source: Buffer | string,
	options?: ParseOdsOptions,
): Promise<SpreadsheetParseResult> {
	const sheets: SpreadsheetSheet[] = [];
	let contentFound = false;
	const maxRowsPerSheet = Math.max(
		1,
		Math.min(options?.maxRowsPerSheet ?? MAX_ODS_ROWS_PER_SHEET, MAX_ODS_ROWS_PER_SHEET),
	);
	const selectedSheetIndex = options?.selectedSheetIndex;
	let rowLimitReached = false;

	const { warnings } = await iterateZipEntries(
		source,
		async (entry) => {
			if (!/(?:^|\/)content\.xml$/.test(entry.name)) return;
			contentFound = true;
			const stream = await entry.openStream(MAX_ODS_CONTENT_BYTES);

			let sheetIndex = 0;
			for await (const tableEl of streamXmlTagElements(stream, "table:table")) {
				const currentIndex = sheetIndex;
				sheetIndex += 1;
				const name = xmlDecodeEntities(
					/table:name="([^"]*)"/.exec(tableEl.attrs)?.[1] ??
						`Лист ${sheets.length + 1}`,
				);
				if (selectedSheetIndex !== undefined && currentIndex !== selectedSheetIndex) {
					sheets.push({ name, rows: [] });
					continue;
				}
				const body = tableEl.innerXml;
				const rows: string[][] = [];

				for (const rowMatch of body.matchAll(
					/<table:table-row\b([^>]*)>([\s\S]*?)<\/table:table-row>|<table:table-row\b([^>]*)\/>/g,
				)) {
					if (rows.length >= maxRowsPerSheet) {
						rowLimitReached = true;
						break;
					}
					const rowAttributes = rowMatch[1] ?? rowMatch[3] ?? "";
					const rowBody = rowMatch[2] ?? "";
					const remainingBudget = Math.max(0, maxRowsPerSheet - rows.length);
					const rawRowRepeat = Number(
						/table:number-rows-repeated="(\d+)"/.exec(rowAttributes)?.[1] ?? "1",
					);
					const rowRepeat = Math.min(rawRowRepeat, 10_000, remainingBudget);
					if (rawRowRepeat > remainingBudget) {
						rowLimitReached = true;
					}
					if (rowRepeat <= 0) {
						rowLimitReached = true;
						break;
					}

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

						const dateValue = /office:date-value="([^"]*)"/.exec(
							attributes,
						)?.[1];
						const numberValue = /office:value="([^"]*)"/.exec(
							attributes,
						)?.[1];
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

					while (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
					if (cells.length === 0) continue;
					for (let index = 0; index < rowRepeat; index += 1)
						rows.push([...cells]);
				}

				if (rows.length === 0) {
					if (selectedSheetIndex !== undefined) sheets.push({ name, rows: [] });
					continue;
				}
				let width = 0;
				for (const row of rows) {
					if (row.length > width) width = row.length;
				}
				sheets.push({
					name,
					rows: rows.map((row) => [
						...row,
						...Array<string>(width - row.length).fill(""),
					]),
				});
			}
			return "stop";
		},
		{
			maxEntryBytes: MAX_ODS_CONTENT_BYTES,
			maxTotalBytes: MAX_ODS_CONTENT_BYTES * 2,
			checkDeclaredSize: false,
		},
	);

	const formattedWarnings = warnings.map((code) => `Архив ODS: ${code}.`);
	if (rowLimitReached) {
		formattedWarnings.push(
			`Лист ODS усечён до безопасного лимита ${maxRowsPerSheet} строк.`,
		);
	}
	if (!contentFound) {
		return {
			sheets: [],
			warnings: [
				...formattedWarnings,
				"Файл ODS не открылся: content.xml не найден.",
			],
		};
	}

	if (sheets.length === 0) {
		formattedWarnings.push(
			"В файле ODS не найдено ни одной заполненной таблицы.",
		);
	}
	return { sheets, warnings: formattedWarnings };
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
