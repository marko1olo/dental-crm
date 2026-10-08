import type {
	DocumentIngestionResponse,
	DocumentIngestionTarget,
	ImportSourceKind,
	MigrationLocalSourceDiscoveryResponse,
	SmartImportMode,
} from "@dental/shared";

export type BrowserMigrationSourceKind =
	MigrationLocalSourceDiscoveryResponse["candidates"][number]["sourceKind"];

export type BrowserMigrationFileKind =
	| "database"
	| "dump"
	| "table"
	| "archive"
	| "dicom"
	| "image"
	| "model"
	| "other";

export type BrowserMigrationFolderStats = {
	folderKey: string;
	folderHint: string;
	depth: number;
	databaseFiles: number;
	dumpFiles: number;
	tableFiles: number;
	archiveFiles: number;
	dicomLikeFiles: number;
	imageFiles: number;
	modelFiles: number;
	hasDicomDir: boolean;
	latestModifiedAt: string | null;
	totalBytes: number;
};

export type BrowserMigrationScanStats = {
	rootName: string;
	sourceKind: "browser_directory_picker" | "browser_file_input";
	scannedFiles: number;
	scannedFolders: number;
	databaseFiles: number;
	dumpFiles: number;
	tableFiles: number;
	archiveFiles: number;
	dicomLikeFiles: number;
	imageFiles: number;
	modelFiles: number;
	totalBytes: number;
	warnings: string[];
};

export type BrowserMigrationScanPhase = "scanning" | "done" | "cancelled";

export type BrowserMigrationScanProgress = BrowserMigrationScanStats & {
	phase: BrowserMigrationScanPhase;
	currentItem: string | null;
	startedAt: string;
	updatedAt: string;
	elapsedMs: number;
	processedUnits: number;
	fileLimit: number;
	folderLimit: number;
	magicReadLimit: number;
};

export type BrowserMigrationScanOptions = {
	signal?: AbortSignal;
	startedAt: string;
	onProgress?: (progress: BrowserMigrationScanProgress) => void;
};

export type BrowserMigrationScanRuntime = {
	startedAt: string;
	startedAtMs: number;
	processedUnits: number;
	lastYieldAtMs: number;
	lastProgressAtMs: number;
};

export const browserMigrationScanFileLimit = 1200;

export const browserMigrationScanFolderLimit = 320;

export const browserMigrationScanDirectoryEntryLimit = 1600;

export const browserMigrationScanMagicReadLimit = 220;

export const browserMigrationScanYieldEveryUnits = 24;

export const browserMigrationScanYieldEveryMs = 20;

export const browserMigrationScanProgressEveryUnits = 12;

export const browserMigrationScanProgressEveryMs = 96;

export const browserMigrationSourceTitles: Record<
	BrowserMigrationSourceKind,
	string
> = {
	mis_database: "Старая МИС или CRM",
	firebird_database: "Старая серверная база программы",
	access_database: "Старая настольная база",
	sqlite_database: "Локальная база программы",
	sql_dump: "Резервная копия старой базы",
	spreadsheet_export: "Табличная выгрузка",
	csv_export: "табличная выгрузка",
	archive_export: "Архив выгрузки",
	pacs_dicom: "архив снимков",
	dicom_folder: "папка КЛКТ/КТ",
	xray_image_archive: "Архив RVG/ОПТГ/фото",
	vendor_imaging_system: "Программа снимков",
	network_share: "Сетевая папка обмена",
	unknown_legacy_source: "Неопознанный источник старой системы",
};

export { browserLegacyMisTextPattern } from "../utils/browserScanUtils";

export const smartImportModeLabels: Record<
	SmartImportMode,
	{ title: string; detail: string }
> = {
	auto: {
		title: "Авто",
		detail: "Автоматически классифицирует пациентов, снимки и сопутствующие данные.",
	},
	mixed: {
		title: "Смешанный экспорт",
		detail: "Пациенты + снимки из одной старой программы.",
	},
	patients: {
		title: "Только пациенты",
		detail: "Принудительно отправить строки в базу пациентов.",
	},
	imaging: {
		title: "Только снимки",
		detail: "Принудительно разобрать как RVG/ОПТГ/КТ.",
	},
};

export const importSourceLabels: Record<
	ImportSourceKind,
	{ title: string; detail: string }
> = {
	csv_text: {
		title: "Таблица / Excel",
		detail: "Копипаст таблицы или списка с разделителями.",
	},
	xlsx_copy: {
		title: "Excel-вставка",
		detail: "Строки из Excel или Google Sheets без ручной подготовки.",
	},
	mis_export: {
		title: "Экспорт старой МИС",
		detail:
			"32top, IDENT, Cliniccards, Open Dental и другие форматы через адаптеры.",
	},
	image_ocr: {
		title: "Фото журнала",
		detail:
			"OCR/vision распознает фото бумажного журнала, затем показывает предпросмотр.",
	},
	voice_dictation: {
		title: "Диктовка",
		detail: "Надиктовка администратора превращается в строки пациентов.",
	},
	free_text: {
		title: "Свободный текст",
		detail: "Умный разбор: ФИО, телефон, дата рождения, комментарий.",
	},
};

export const ingestionTargetLabels: Record<DocumentIngestionTarget, string> = {
	smart_import: "Умный импорт",
	patients: "Пациенты",
	imaging: "Снимки",
	pricelist: "Прайс",
	plain_text: "Текст",
};

export const documentIngestionQualityLabels: Record<
	DocumentIngestionResponse["quality"]["extractionQuality"],
	string
> = {
	ready: "Можно открыть предпросмотр",
	review: "Нужна ручная проверка",
	ocr_required: "Нужен OCR / vision",
	unsupported: "Формат не разобран",
};

export const documentDetectedKindLabels: Record<string, string> = {
	archive: "архив",
	csv: "таблица",
	docx: "документ Word",
	html: "веб-страница",
	image: "изображение",
	json: "структурированный текст",
	legacy_database: "старая база",
	legacy_dump: "резервная копия старой базы",
	ods: "таблица",
	odt: "документ",
	pdf: "PDF",
	pptx: "презентация",
	rtf: "текстовый документ",
	spreadsheet: "таблица",
	text: "текст",
	unknown: "не определено",
	xlsx: "таблица Excel",
	xml: "структурированный текст",
	zip: "архив",
};
