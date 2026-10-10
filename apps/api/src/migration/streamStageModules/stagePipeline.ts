import { decodeSourceBuffer } from "../encoding.js";
import {
	findMemoFile,
	type MemoFile,
	openMemoFile,
} from "../formats/dbfMemo.js";
import {
	inspectSqlite,
	rankTablesByRelevance,
	readSqliteSample,
	streamSqliteTable,
} from "../formats/sqlite.js";
import { looksLikeDbf } from "../parsers/dbf.js";
import { detectDelimiter, parseDelimited } from "../parsers/delimited.js";
import { type ParsedTable, parseSource } from "../parsers/index.js";
import { readUploadFully, readUploadHead } from "../uploadStore.js";
import { alignRow, applyDbfMemoFields } from "./batchTransformer.js";
import {
	asciiHead,
	collectDbfSample,
	readDbfMeta,
	streamDbfRows,
	streamDelimitedRows,
} from "./streamReader.js";
import {
	HEAD_PROBE_BYTES,
	STREAM_BATCH_ROWS,
	WHOLE_FILE_FORMAT_LIMIT_BYTES,
	type DetectSourceShapeInput,
	type RowBatch,
	type SourceShape,
	type StreamSourceRowsInput,
} from "./types.js";

/**
 * Определяет форму источника по его началу.
 *
 * Читается только голова файла, поэтому вызов дешёвый независимо от размера.
 * Выборка строк для портрета колонок берётся из этой же головы — то есть
 * подряд, а не с шагом по всему файлу. Это осознанный компромисс: строгая
 * выборка с шагом потребовала бы полного прохода, а на определение типов
 * колонок первые две тысячи строк отвечают не хуже.
 */
export async function detectSourceShape(
	input: DetectSourceShapeInput,
): Promise<SourceShape> {
	const head = await readUploadHead(
		input.filePath,
		Math.min(HEAD_PROBE_BYTES, input.byteSize),
	);

	// ---- DBF: определяется по заголовку, читается потоком.
	if (
		input.forcedKind === "dbf" ||
		(input.forcedKind === undefined && looksLikeDbf(head))
	) {
		const meta = await readDbfMeta(input.filePath);
		const sample = await collectDbfSample(input.filePath, meta, 2000);
		return {
			sourceKind: "dbf",
			detectedEncoding: meta.encoding,
			encodingConfidence: meta.encodingFromHeader ? 1 : 0.5,
			delimiter: null,
			columns: meta.columns,
			tableName: input.fileName,
			sampleRows: sample,
			warnings: meta.warnings,
			streamable: true,
		};
	}

	/**
	 * SQLite: читается настоящей встроенной читалкой. База может содержать
	 * несколько таблиц, и переносить надо ту, где пациенты, — поэтому таблицы
	 * перечисляются и упорядочиваются по осмысленности, а оператор может выбрать
	 * другую параметром.
	 */
	if (asciiHead(head, 0, 15) === "SQLite format 3") {
		const inspection = inspectSqlite(input.filePath);
		const ranked = rankTablesByRelevance(inspection.tables);
		const chosen = input.preferredTable
			? (inspection.tables.find(
					(table) => table.name === input.preferredTable,
				) ?? ranked[0])
			: ranked[0];

		if (!chosen) {
			throw new Error(
				`В базе SQLite нет таблиц с данными. ${inspection.warnings.join(" ")}`.trim(),
			);
		}

		const sample = readSqliteSample(input.filePath, chosen.name, 2000);
		const warnings = [...inspection.warnings];
		if (ranked.length > 1) {
			warnings.push(
				`В базе ${ranked.length} таблиц(ы) с данными: ${ranked
					.slice(0, 8)
					.map((table) => `${table.name} (${table.rowCount})`)
					.join(
						", ",
					)}. Переносится «${chosen.name}»; другую можно выбрать при сопоставлении.`,
			);
		}

		return {
			sourceKind: "api",
			detectedEncoding: "utf-8",
			encodingConfidence: 1,
			delimiter: null,
			columns: sample.columns,
			tableName: chosen.name,
			sampleRows: sample.rows,
			warnings,
			streamable: true,
			availableTables: ranked.map((table) => ({
				name: table.name,
				rowCount: table.rowCount,
				columns: table.columns.length,
			})),
			selectedTable: chosen.name,
		};
	}

	// ---- Прочие двоичные контейнеры (XLSX/ODS) и деревья (JSON/XML): целиком.
	const looksZip = head.length >= 2 && head[0] === 0x50 && head[1] === 0x4b;
	const decodedHead = decodeSourceBuffer(head);
	const headText = decodedHead.text.trimStart();
	const looksTree =
		headText.startsWith("{") ||
		headText.startsWith("[") ||
		headText.startsWith("<");

	if (
		looksZip ||
		looksTree ||
		(input.forcedKind !== undefined &&
			input.forcedKind !== "delimited" &&
			input.forcedKind !== "clipboard")
	) {
		if (input.byteSize > WHOLE_FILE_FORMAT_LIMIT_BYTES) {
			throw new Error(
				`Формат этого файла (книга Excel, JSON или XML) разбирается только целиком, а его размер ${Math.round(
					input.byteSize / (1024 * 1024),
				)} МБ превышает предел ${Math.round(WHOLE_FILE_FORMAT_LIMIT_BYTES / (1024 * 1024))} МБ. ` +
					"Выгрузите данные в CSV или DBF — эти форматы читаются потоком без ограничения размера.",
			);
		}
		const content = await readUploadFully(input.filePath);
		const parsed = parseSource({
			sourceName: input.fileName,
			content,
			...(input.forcedKind === undefined
				? {}
				: { forcedKind: input.forcedKind }),
		});
		const table: ParsedTable = parsed.tables[0] ?? {
			name: input.fileName,
			columns: [],
			rows: [],
			suspectRowNumbers: [],
		};
		return {
			sourceKind: parsed.sourceKind,
			detectedEncoding: parsed.detectedEncoding,
			encodingConfidence: parsed.encodingConfidence,
			delimiter: parsed.delimiter,
			columns: table.columns,
			tableName: table.name,
			sampleRows: table.rows.slice(0, 2000),
			warnings: parsed.warnings,
			streamable: false,
		};
	}

	// ---- Текстовая таблица: читается потоком.
	const delimiter = detectDelimiter(decodedHead.text).delimiter;
	const headParsed = parseDelimited(decodedHead.text, delimiter);
	return {
		sourceKind: "delimited",
		detectedEncoding: decodedHead.encoding,
		encodingConfidence: decodedHead.confidence,
		delimiter,
		columns: headParsed.columns,
		tableName: input.fileName,
		// Последняя строка головы может быть обрезана посередине — отбрасываем её.
		sampleRows: headParsed.rows.slice(
			0,
			Math.max(0, Math.min(2000, headParsed.rows.length - 1)),
		),
		warnings: [...decodedHead.warnings, ...headParsed.warnings],
		streamable: true,
	};
}

/**
 * Единый поток строк источника, независимо от формата.
 *
 * Для форматов, читаемых только целиком, строки выдаются теми же партиями —
 * вызывающий не различает случаи, но расход памяти для них ограничен пределом
 * WHOLE_FILE_FORMAT_LIMIT_BYTES, о котором detectSourceShape сообщает заранее.
 */
export async function* streamSourceRows(
	input: StreamSourceRowsInput,
): AsyncGenerator<RowBatch> {
	const batchRows = input.batchRows ?? STREAM_BATCH_ROWS;
	const columnCount = input.shape.columns.length;

	// Первая строка данных: 2 при наличии заголовка, 1 без него.
	let rowNumber =
		input.shape.sourceKind === "dbf" || input.shape.selectedTable !== undefined
			? 1
			: 2;

	/**
	 * SQLite. Таблица читается курсором партиями, база открыта только на чтение.
	 * Имя таблицы берётся из формы источника: оно уже выбрано на этапе опознания
	 * либо задано оператором.
	 */
	if (input.shape.selectedTable !== undefined) {
		for await (const batch of streamSqliteTable(
			input.filePath,
			input.shape.selectedTable,
			batchRows,
		)) {
			if (batch.rows.length === 0) continue;
			yield {
				tableName: input.shape.tableName,
				columns: batch.columns,
				rows: batch.rows.map((row) =>
					alignRow(row, columnCount, input.shape.delimiter),
				),
				firstRowNumber: rowNumber,
			};
			rowNumber += batch.rows.length;
		}
		return;
	}

	if (input.shape.sourceKind === "dbf") {
		const meta = await readDbfMeta(input.filePath);

		/**
		 * Memo-файл рядом с таблицей. Поле типа M хранит номер блока, а не текст:
		 * без .fpt/.dbt в карточку пациента попала бы строка «14» вместо анамнеза.
		 * Именно в memo у стоматологических систем лежат жалобы, анамнез и описание
		 * лечения — то, ради чего историю и переносят.
		 */
		const memoFieldIndexes = meta.fields
			.map((field, index) => ({ field, index }))
			.filter((entry) => entry.field.type === "M")
			.map((entry) => entry.index);

		let memo: MemoFile | null = null;
		if (memoFieldIndexes.length > 0) {
			const memoPath = await findMemoFile(input.filePath);
			if (memoPath) {
				try {
					memo = await openMemoFile(memoPath, meta.encoding);
				} catch {
					// Повреждённый memo не должен остановить перенос остальных полей.
					memo = null;
				}
			}
		}

		try {
			for await (const batch of streamDbfRows(
				input.filePath,
				meta,
				batchRows,
			)) {
				if (batch.rows.length === 0) continue;

				if (memo && memoFieldIndexes.length > 0) {
					await applyDbfMemoFields(batch.rows, memoFieldIndexes, memo);
				}

				yield {
					tableName: input.shape.tableName,
					columns: input.shape.columns,
					rows: batch.rows.map((row) =>
						alignRow(row, columnCount, input.shape.delimiter),
					),
					firstRowNumber: rowNumber,
				};
				rowNumber += batch.rows.length;
			}
		} finally {
			await memo?.close();
		}
		return;
	}

	if (input.shape.streamable) {
		for await (const batch of streamDelimitedRows(
			input.filePath,
			input.shape.detectedEncoding,
			input.shape.delimiter ?? ";",
			true,
			batchRows,
		)) {
			if (batch.rows.length === 0) continue;
			yield {
				tableName: input.shape.tableName,
				columns: input.shape.columns,
				rows: batch.rows.map((row) =>
					alignRow(row, columnCount, input.shape.delimiter),
				),
				firstRowNumber: rowNumber,
			};
			rowNumber += batch.rows.length;
		}
		return;
	}

	// ---- Форматы, разбираемые целиком.
	const content = await readUploadFully(input.filePath);
	const parsed = parseSource({ sourceName: input.fileName, content });
	for (const table of parsed.tables) {
		let tableRowNumber = 2;
		for (let offset = 0; offset < table.rows.length; offset += batchRows) {
			const rows = table.rows.slice(offset, offset + batchRows);
			yield {
				tableName: table.name,
				columns: table.columns,
				rows,
				firstRowNumber: tableRowNumber,
			};
			tableRowNumber += rows.length;
		}
	}
}
