import type { MigrationSourceKind } from "@dental/shared";

/** Строк в партии. 1000 при 20 колонках — порядка единиц мегабайт на партию. */
export const STREAM_BATCH_ROWS = 1000;

/** Сколько байт читать для определения формата, разделителя и заголовка. */
export const HEAD_PROBE_BYTES = 512 * 1024;

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

export interface DbfField {
	name: string;
	type: string;
	length: number;
}

export interface DbfMeta {
	headerLength: number;
	recordLength: number;
	declaredRecords: number;
	fields: DbfField[];
	columns: string[];
	encoding: string;
	encodingFromHeader: boolean;
	warnings: string[];
}

export const DBF_LANGUAGE_ENCODINGS: Record<number, string> = {
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

export interface DetectSourceShapeInput {
	filePath: string;
	fileName: string;
	byteSize: number;
	forcedKind?: MigrationSourceKind | undefined;
	/** Таблица базы, выбранная оператором. Для SQLite и прочих многотабличных. */
	preferredTable?: string | undefined;
}

export interface StreamSourceRowsInput {
	filePath: string;
	fileName: string;
	shape: SourceShape;
	batchRows?: number;
}

export interface StreamDbfBatch {
	rows: string[][];
	skippedDeleted: number;
}

export interface StreamDelimitedBatch {
	rows: string[][];
}
