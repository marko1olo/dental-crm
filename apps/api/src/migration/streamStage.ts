import { createReadStream } from "node:fs";
import { open } from "node:fs/promises";
import { TextDecoder } from "node:util";
import type { MigrationSourceKind } from "@dental/shared";
import { decodeSourceBuffer, normalizeDecodedText } from "./encoding.js";
import {
	findMemoFile,
	type MemoFile,
	openMemoFile,
	parseMemoPointer,
} from "./formats/dbfMemo.js";
import {
	inspectSqlite,
	rankTablesByRelevance,
	readSqliteSample,
	streamSqliteTable,
} from "./formats/sqlite.js";
import { looksLikeDbf } from "./parsers/dbf.js";
import { detectDelimiter, parseDelimited } from "./parsers/delimited.js";
import { type ParsedTable, parseSource } from "./parsers/index.js";
import { readUploadFully, readUploadHead } from "./uploadStore.js";

/**
 * Потоковое чтение источника: строки выдаются партиями, файл целиком в память
 * не поднимается.
 *
 * ЗАЧЕМ ОТДЕЛЬНО ОТ parsers/index.ts
 * parseSource читает источник целиком и возвращает все строки массивом. Это
 * правильно для предпросмотра и для файлов обычного размера, но на выгрузке в
 * триста мегабайт массив строк занимает в памяти кратно больше самого файла:
 * каждая ячейка — отдельная JS-строка со своим заголовком объекта. Двести тысяч
 * строк по двадцать колонок — это четыре миллиона строковых объектов.
 *
 * Здесь источник читается порциями, и вызывающий получает партии по N строк.
 * Расход памяти определяется размером партии, а не размером файла.
 *
 * ЧТО СТРИМИТСЯ, А ЧТО НЕТ — ЧЕСТНО
 * DBF и текстовые табличные форматы читаются потоком: у первого записи
 * фиксированной длины по известным смещениям, у второго границы строк находятся
 * по ходу чтения.
 *
 * XLSX, ODS, JSON и XML потоком НЕ читаются, и это не лень. Книга Excel — это
 * ZIP, у которого оглавление лежит в конце файла; JSON и XML — деревья, у
 * которых нельзя разобрать середину, не прочитав начало. Разбор их по частям
 * требует другого класса парсеров (SAX для XML, потоковый JSON-токенизатор), и
 * подделывать это нечестно. Для них действует предел размера, о котором
 * вызывающий узнаёт заранее, а не в момент падения по памяти.
 */

/** Читает ASCII-строку из буфера — для сравнения сигнатур. */
function asciiHead(buffer: Buffer, offset: number, length: number): string {
	if (buffer.length < offset + length) return "";
	return buffer.subarray(offset, offset + length).toString("latin1");
}

/** Строк в партии. 1000 при 20 колонках — порядка единиц мегабайт на партию. */
export const STREAM_BATCH_ROWS = 1000;

/** Сколько байт читать для определения формата, разделителя и заголовка. */
const HEAD_PROBE_BYTES = 512 * 1024;

/**
 * Предел для форматов, которые читаются только целиком. 64 МБ книги Excel —
 * это порядка полумиллиона строк, что выше любой реальной выгрузки из
 * стоматологической системы.
 */
export const WHOLE_FILE_FORMAT_LIMIT_BYTES = 64 * 1024 * 1024;

export interface SourceShape {
	sourceKind: MigrationSourceKind;
	detectedEncoding: string;
	encodingConfidence: number;
	delimiter: string | null;
	columns: string[];
	/** Имя таблицы внутри источника. */
	tableName: string;
	/** Первые строки для портрета колонок и предпросмотра. */
	sampleRows: string[][];
	warnings: string[];
	/** true — формат читается потоком; false — только целиком. */
	streamable: boolean;
	/**
	 * Таблицы базы, если источник — база с несколькими таблицами (SQLite).
	 * Пусто для одиночных таблиц и текстовых выгрузок.
	 */
	availableTables?: Array<{ name: string; rowCount: number; columns: number }>;
	/** Выбранная таблица базы. */
	selectedTable?: string;
}

export interface RowBatch {
	tableName: string;
	columns: string[];
	rows: string[][];
	/** Номер первой строки партии в источнике (с учётом строки заголовка). */
	firstRowNumber: number;
}

/**
 * Определяет форму источника по его началу.
 *
 * Читается только голова файла, поэтому вызов дешёвый независимо от размера.
 * Выборка строк для портрета колонок берётся из этой же головы — то есть
 * подряд, а не с шагом по всему файлу. Это осознанный компромисс: строгая
 * выборка с шагом потребовала бы полного прохода, а на определение типов
 * колонок первые две тысячи строк отвечают не хуже.
 */
export async function detectSourceShape(input: {
	filePath: string;
	fileName: string;
	byteSize: number;
	forcedKind?: MigrationSourceKind | undefined;
	/** Таблица базы, выбранная оператором. Для SQLite и прочих многотабличных. */
	preferredTable?: string | undefined;
}): Promise<SourceShape> {
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

// ---------------------------------------------------------------------------
// DBF потоком
// ---------------------------------------------------------------------------

interface DbfMeta {
	headerLength: number;
	recordLength: number;
	declaredRecords: number;
	fields: Array<{ name: string; type: string; length: number }>;
	columns: string[];
	encoding: string;
	encodingFromHeader: boolean;
	warnings: string[];
}

const DBF_LANGUAGE_ENCODINGS: Record<number, string> = {
	1: "ibm437",
	2: "ibm850",
	3: "windows-1252",
	100: "ibm852",
	101: "ibm866",
	102: "ibm865",
	106: "ibm737",
	107: "ibm857",
	200: "windows-1250",
	201: "windows-1251",
	202: "windows-1254",
	203: "windows-1253",
};

/** Читает только заголовок DBF: размер файла при этом не важен. */
async function readDbfMeta(filePath: string): Promise<DbfMeta> {
	const handle = await open(filePath, "r");
	try {
		const headerStart = Buffer.alloc(32);
		await handle.read(headerStart, 0, 32, 0);

		const declaredRecords = headerStart.readUInt32LE(4);
		const headerLength = headerStart.readUInt16LE(8);
		const recordLength = headerStart.readUInt16LE(10);
		const languageDriver = headerStart[29]!;

		if (headerLength < 64 || recordLength === 0) {
			throw new Error(
				"Заголовок DBF повреждён: не согласуются длины заголовка и записи.",
			);
		}

		const descriptors = Buffer.alloc(headerLength - 32);
		await handle.read(descriptors, 0, descriptors.length, 32);

		const warnings: string[] = [];
		let encoding = DBF_LANGUAGE_ENCODINGS[languageDriver] ?? "";
		const encodingFromHeader = Boolean(encoding);
		if (!encoding) {
			encoding = "windows-1251";
			warnings.push(
				`В заголовке файла не указана кодовая страница (байт 29 = 0x${languageDriver.toString(16)}). Текст прочитан как windows-1251 — проверьте ФИО в предпросмотре.`,
			);
		}

		const ascii = new TextDecoder("ascii");
		const fields: DbfMeta["fields"] = [];
		for (let offset = 0; offset + 32 <= descriptors.length; offset += 32) {
			if (descriptors[offset] === 0x0d) break;
			const name = ascii
				.decode(descriptors.subarray(offset, offset + 11))
				.replace(/\0.*$/, "")
				.trim();
			if (!name) continue;
			fields.push({
				name,
				type: String.fromCharCode(descriptors[offset + 11] ?? 0x43),
				length: descriptors[offset + 16]!,
			});
		}

		if (fields.length === 0)
			throw new Error("В заголовке DBF не найдено ни одного описания поля.");

		return {
			headerLength,
			recordLength,
			declaredRecords,
			fields,
			columns: fields.map((field) => field.name),
			encoding,
			encodingFromHeader,
			warnings,
		};
	} finally {
		await handle.close();
	}
}

/** Декодирует одну запись DBF. Логика типов та же, что в parsers/dbf.ts. */
function decodeDbfRecord(
	record: Buffer,
	meta: DbfMeta,
	decoder: TextDecoder,
): string[] {
	const values: string[] = [];
	let offset = 1;
	for (const field of meta.fields) {
		const raw = record.subarray(offset, offset + field.length);
		offset += field.length;

		switch (field.type) {
			case "I":
				values.push(raw.length >= 4 ? String(raw.readInt32LE(0)) : "");
				break;
			case "L": {
				const char = String.fromCharCode(raw[0] ?? 0x20).toUpperCase();
				values.push(
					char === "T" || char === "Y"
						? "1"
						: char === "F" || char === "N"
							? "0"
							: "",
				);
				break;
			}
			case "D": {
				const text = decoder.decode(raw).replace(/\0/g, "").trim();
				values.push(/^\d{8}$/.test(text) && text !== "00000000" ? text : "");
				break;
			}
			case "Y": {
				if (raw.length < 8) {
					values.push("");
					break;
				}
				// Деньги: восемь байт целого с четырьмя знаками, через BigInt.
				const scaled = raw.readBigInt64LE(0);
				const negative = scaled < 0n;
				const absolute = negative ? -scaled : scaled;
				values.push(
					`${negative ? "-" : ""}${absolute / 10000n}.${(absolute % 10000n).toString().padStart(4, "0")}`,
				);
				break;
			}
			case "B":
			case "O":
				values.push(raw.length >= 8 ? String(raw.readDoubleLE(0)) : "");
				break;
			case "+":
				values.push(raw.length >= 4 ? String(raw.readUInt32LE(0)) : "");
				break;
			case "T":
			case "@": {
				if (raw.length < 8) {
					values.push("");
					break;
				}
				const julianDay = raw.readInt32LE(0);
				const millis = raw.readInt32LE(4);
				if (julianDay === 0) {
					values.push("");
					break;
				}
				const date = new Date((julianDay - 2440588) * 86_400_000 + millis);
				values.push(
					Number.isNaN(date.getTime())
						? ""
						: date.toISOString().replace(".000Z", "Z"),
				);
				break;
			}
			default:
				values.push(decoder.decode(raw).replace(/\0/g, "").trim());
				break;
		}
	}
	return values;
}

/** Первые N живых записей — для портрета колонок. */
async function collectDbfSample(
	filePath: string,
	meta: DbfMeta,
	limit: number,
): Promise<string[][]> {
	const rows: string[][] = [];
	for await (const batch of streamDbfRows(
		filePath,
		meta,
		Math.min(limit, STREAM_BATCH_ROWS),
	)) {
		for (const row of batch.rows) {
			rows.push(row);
			if (rows.length >= limit) return rows;
		}
	}
	return rows;
}

/**
 * Выдаёт записи DBF партиями.
 *
 * Читает файл дескриптором по смещениям, поэтому в памяти живёт одна партия.
 * Записи с признаком удаления пропускаются, как и в разборе целиком: удаление в
 * DBF ленивое, и файл может содержать десятилетия вычеркнутых записей.
 */
async function* streamDbfRows(
	filePath: string,
	meta: DbfMeta,
	batchRows: number,
): AsyncGenerator<{ rows: string[][]; skippedDeleted: number }> {
	const decoder = new TextDecoder(meta.encoding);
	const handle = await open(filePath, "r");
	try {
		const fileSize = (await handle.stat()).size;
		const availableRecords = Math.floor(
			(fileSize - meta.headerLength) / meta.recordLength,
		);
		const totalRecords =
			meta.declaredRecords === 0
				? availableRecords
				: Math.min(meta.declaredRecords, availableRecords);

		const chunkBuffer = Buffer.alloc(meta.recordLength * batchRows);
		let processed = 0;

		while (processed < totalRecords) {
			const recordsToRead = Math.min(batchRows, totalRecords - processed);
			const bytesToRead = recordsToRead * meta.recordLength;
			const position = meta.headerLength + processed * meta.recordLength;
			const { bytesRead } = await handle.read(
				chunkBuffer,
				0,
				bytesToRead,
				position,
			);
			if (bytesRead <= 0) break;

			const rows: string[][] = [];
			let skippedDeleted = 0;
			const fullRecords = Math.floor(bytesRead / meta.recordLength);

			for (let index = 0; index < fullRecords; index += 1) {
				const start = index * meta.recordLength;
				const record = chunkBuffer.subarray(start, start + meta.recordLength);
				const flag = record[0]!;
				// 0x1A — маркер конца файла в старых DBF; всё после него мусор.
				if (flag === 0x1a) {
					processed = totalRecords;
					break;
				}
				if (flag === 0x2a) {
					skippedDeleted += 1;
					continue;
				}
				rows.push(decodeDbfRecord(record, meta, decoder));
			}

			processed += fullRecords;
			if (rows.length > 0 || skippedDeleted > 0) yield { rows, skippedDeleted };
		}
	} finally {
		await handle.close();
	}
}

// ---------------------------------------------------------------------------
// Текстовая таблица потоком
// ---------------------------------------------------------------------------

/**
 * Разбивает поток текста на строки таблицы, соблюдая кавычки через границы чанков.
 *
 * Именно здесь проходит разница между «читаю построчно» и «читаю по правилам
 * RFC 4180». Значение с переводом строки внутри кавычек — обычное дело для
 * колонки «Жалобы» — растягивается на несколько физических строк файла и может
 * попасть на границу чанка. Состояние кавычек живёт между чанками, поэтому такая
 * запись не разрывается.
 */
class DelimitedRowAccumulator {
	private buffer = "";
	private inQuotes = false;

	constructor(private readonly delimiter: string) {}

	/** Добавляет текст и возвращает завершённые строки. */
	push(text: string): string[][] {
		this.buffer += text;
		return this.drain(false);
	}

	/** Отдаёт остаток после конца файла. */
	flush(): string[][] {
		return this.drain(true);
	}

	private drain(final: boolean): string[][] {
		const rows: string[][] = [];
		let row: string[] = [];
		let field = "";
		let consumedTo = 0;

		for (let index = 0; index < this.buffer.length; index += 1) {
			const char = this.buffer[index]!;

			if (this.inQuotes) {
				if (char === '"') {
					if (this.buffer[index + 1] === '"') {
						field += '"';
						index += 1;
						continue;
					}
					this.inQuotes = false;
					continue;
				}
				field += char;
				continue;
			}

			if (char === '"') {
				// Открывающей считается только кавычка в начале поля.
				if (field.length === 0) this.inQuotes = true;
				else field += char;
				continue;
			}

			if (char === this.delimiter) {
				row.push(field);
				field = "";
				continue;
			}

			if (char === "\n") {
				row.push(field);
				field = "";
				rows.push(row);
				row = [];
				// Позиция, до которой буфер разобран без остатка.
				consumedTo = index + 1;
				continue;
			}

			field += char;
		}

		if (final) {
			if (field.length > 0 || row.length > 0) {
				row.push(field);
				rows.push(row);
			}
			this.buffer = "";
			return rows.filter((candidate) =>
				candidate.some((cell) => cell.trim() !== ""),
			);
		}

		/**
		 * Незавершённый хвост остаётся в буфере: он либо оборван посередине строки,
		 * либо находится внутри кавычек. Состояние inQuotes при этом надо вернуть к
		 * тому, каким оно было на позиции consumedTo, — иначе следующий чанк будет
		 * разобран с неверным флагом.
		 */
		const tail = this.buffer.slice(consumedTo);
		this.buffer = tail;
		this.inQuotes = quoteStateOf(tail);

		return rows.filter((candidate) =>
			candidate.some((cell) => cell.trim() !== ""),
		);
	}
}

/** Состояние кавычек в конце фрагмента: внутри значения или нет. */
function quoteStateOf(fragment: string): boolean {
	let inQuotes = false;
	let fieldEmpty = true;
	for (let index = 0; index < fragment.length; index += 1) {
		const char = fragment[index]!;
		if (inQuotes) {
			if (char === '"') {
				if (fragment[index + 1] === '"') {
					index += 1;
					continue;
				}
				inQuotes = false;
			}
			continue;
		}
		if (char === '"' && fieldEmpty) {
			inQuotes = true;
			fieldEmpty = false;
			continue;
		}
		fieldEmpty =
			char === "," ||
			char === ";" ||
			char === "\t" ||
			char === "|" ||
			char === "\n";
	}
	return inQuotes;
}

/**
 * Выдаёт строки текстовой таблицы партиями.
 *
 * Кодировка определяется по голове файла один раз, а декодирование идёт
 * потоково через TextDecoder со stream: true — иначе многобайтовый символ,
 * попавший на границу чанка, превратился бы в вопросительный ромб.
 */
async function* streamDelimitedRows(
	filePath: string,
	encoding: string,
	delimiter: string,
	hasHeader: boolean,
	batchRows: number,
): AsyncGenerator<{ rows: string[][] }> {
	let decoder: TextDecoder;
	try {
		decoder = new TextDecoder(encoding, { fatal: false });
	} catch {
		decoder = new TextDecoder("utf-8", { fatal: false });
	}

	const accumulator = new DelimitedRowAccumulator(delimiter);
	let pending: string[][] = [];
	let headerDropped = !hasHeader;
	let first = true;

	const stream = createReadStream(filePath, { highWaterMark: 1024 * 1024 });

	for await (const chunk of stream) {
		let text = decoder.decode(chunk as Buffer, { stream: true });
		if (first) {
			// BOM удаляется один раз: иначе он приклеится к имени первой колонки.
			text = normalizeDecodedText(text);
			first = false;
		} else {
			text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
		}

		for (const row of accumulator.push(text)) {
			if (!headerDropped) {
				headerDropped = true;
				continue;
			}
			pending.push(row);
		}

		while (pending.length >= batchRows) {
			yield { rows: pending.slice(0, batchRows) };
			pending = pending.slice(batchRows);
		}
	}

	const tailText = decoder.decode();
	if (tailText) {
		for (const row of accumulator.push(
			tailText.replace(/\r\n/g, "\n").replace(/\r/g, "\n"),
		)) {
			if (!headerDropped) {
				headerDropped = true;
				continue;
			}
			pending.push(row);
		}
	}

	for (const row of accumulator.flush()) {
		if (!headerDropped) {
			headerDropped = true;
			continue;
		}
		pending.push(row);
	}

	while (pending.length > 0) {
		yield { rows: pending.slice(0, batchRows) };
		pending = pending.slice(batchRows);
	}
}

/**
 * Единый поток строк источника, независимо от формата.
 *
 * Для форматов, читаемых только целиком, строки выдаются теми же партиями —
 * вызывающий не различает случаи, но расход памяти для них ограничен пределом
 * WHOLE_FILE_FORMAT_LIMIT_BYTES, о котором detectSourceShape сообщает заранее.
 */
export async function* streamSourceRows(input: {
	filePath: string;
	fileName: string;
	shape: SourceShape;
	batchRows?: number;
}): AsyncGenerator<RowBatch> {
	const batchRows = input.batchRows ?? STREAM_BATCH_ROWS;
	const columnCount = input.shape.columns.length;

	/** Выравнивает строку по числу колонок, не отбрасывая содержимое. */
	const align = (row: string[]): string[] => {
		if (row.length === columnCount) return row;
		if (row.length < columnCount)
			return [...row, ...Array<string>(columnCount - row.length).fill("")];
		// Хвост склеивается в последнюю колонку — текст не теряется.
		const head = row.slice(0, columnCount - 1);
		return [
			...head,
			row.slice(columnCount - 1).join(input.shape.delimiter ?? " "),
		];
	};

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
				rows: batch.rows.map(align),
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
					for (const row of batch.rows) {
						for (const fieldIndex of memoFieldIndexes) {
							const pointer = parseMemoPointer(row[fieldIndex] ?? "");
							row[fieldIndex] = pointer > 0 ? await memo.read(pointer) : "";
						}
					}
				}

				yield {
					tableName: input.shape.tableName,
					columns: input.shape.columns,
					rows: batch.rows.map(align),
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
				rows: batch.rows.map(align),
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
