import type {
	DocumentIngestionKind,
	DocumentIngestionQuality,
	DocumentIngestionRequest,
	DocumentIngestionResponse,
	DocumentIngestionRoute,
	DocumentIngestionTarget,
} from "@dental/shared";

/**
 * Экспортируется для движка переноса (migration/parsers/spreadsheet.ts): книга
 * Excel там разбирается по адресам ячеек, а не по их порядку, и повторять чтение
 * ZIP-контейнера во втором месте незачем.
 */
export type ZipEntry = {
	name: string;
	data: Buffer;
};

export type ExtractedDocument = {
	text: string;
	tableCount: number;
	warnings: string[];
	parserNotes: string[];
};

export type ExtractedArchiveFile = {
	fileName: string;
	detectedKind: DocumentIngestionKind;
	rowCount: number;
	tableCount: number;
	textPreview: string;
	warnings: string[];
};

export const maxExtractedTextChars = 280_000;
