import type {
	DicomWorkstationClientFacts,
	MigrationLocalSourceDiscoveryResponse,
} from "@dental/shared";

export type BrowserFileSystemFileHandle = {
	kind: "file";
	name: string;
	getFile: () => Promise<File>;
};

export type BrowserFileSystemDirectoryHandle = {
	kind: "directory";
	name: string;
	entries: () => AsyncIterable<[string, BrowserFileSystemHandle]>;
};

export type BrowserFileSystemHandle =
	| BrowserFileSystemFileHandle
	| BrowserFileSystemDirectoryHandle;

export type BrowserDirectoryPickerWindow = Window & {
	showDirectoryPicker?: (options?: {
		id?: string;
		mode?: "read" | "readwrite";
		startIn?: string;
	}) => Promise<BrowserFileSystemDirectoryHandle>;
};

export type DentalDesktopRuntimeWindow = BrowserDirectoryPickerWindow & {
	dentalCrmDesktop?: { dicomBridge?: unknown; localFileBridge?: unknown };
	__DENTAL_CRM_DESKTOP__?: unknown;
	__TAURI__?: unknown;
	electronAPI?: unknown;
};

export type BrowserPickedImagingFolderPreview = {
	version: 1;
	safeDisplayName: string;
	sourceLabel: string;
	sourceKind: "browser_directory_picker" | "browser_file_input";
	folderFingerprint: string;
	rootName: string;
	scannedFiles: number;
	scannedFolders: number;
	dicomLikeFiles: number;
	archiveFiles: number;
	modelFiles: number;
	imageFiles: number;
	totalBytes: number;
	createdAt: string;
	nextAction: string;
	warnings: string[];
};

export type BrowserPickedImagingScanStats = {
	rootName: string;
	sourceKind: BrowserPickedImagingFolderPreview["sourceKind"];
	scannedFiles: number;
	scannedFolders: number;
	dicomLikeFiles: number;
	archiveFiles: number;
	modelFiles: number;
	imageFiles: number;
	totalBytes: number;
	warnings: string[];
};

export type BrowserImagingScanPhase = "scanning" | "done" | "cancelled";

export type BrowserImagingScanProgress = BrowserPickedImagingScanStats & {
	phase: BrowserImagingScanPhase;
	currentItem: string | null;
	startedAt: string;
	updatedAt: string;
	elapsedMs: number;
	processedUnits: number;
	fileLimit: number;
	folderLimit: number;
	magicReadLimit: number;
};

export type BrowserImagingScanOptions = {
	signal?: AbortSignal;
	startedAt: string;
	onProgress?: (progress: BrowserImagingScanProgress) => void;
};

export type BrowserImagingScanRuntime = {
	startedAt: string;
	startedAtMs: number;
	processedUnits: number;
	lastYieldAtMs: number;
	lastProgressAtMs: number;
};

export type LocalDicomOperationOptions = {
	signal?: AbortSignal;
};

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

export const browserImagingScanFileLimit = 900;

export const browserImagingScanFolderLimit = 260;

export const browserImagingScanDirectoryEntryLimit = 1600;

export const browserImagingScanMagicReadLimit = 180;

export const browserImagingScanYieldEveryUnits = 24;

export const browserImagingScanYieldEveryMs = 20;

export const browserImagingScanProgressEveryUnits = 12;

export const browserImagingScanProgressEveryMs = 96;

export const browserPickedImagingFolderStorageKey =
	"dental-crm:browser-picked-imaging-folder:last";

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

export const browserLegacyMisTextPattern =
	/1c|1с|\.1cd\b|мис|инфоклиника|infoclinica|infodent|инфодент|дента\s*офис|denta\s*office|clinic\s*cards|cliniccards|dental\s*4\s*windows|d4w|dental4windows|dental\s*pro|dentpro|dental\s*soft|dentasoft|dental\s*cloud|clinic\s*365|clinic365|medangel|медангел|medialog|медиалог|arnica|арника|sycret\s*dent|secret\s*dent|адента|adenta|dent\s*crm\s*24|dentcrm24|dent\.crm24|клиентикс|clientix|klientix|2v.*(?:стоматолог|dental)|future\s*it\s*dent|futureitdent|32\s*top|32top|medods|медодс|dental\s*tap|dentaltap|(?:^|[\\/])ident(?:[\\/]|$)|\bident\b|stomx|stom\s*x|стомx|стомикс|i[-\s]?stom|ай\s*стом|q[-\s]?stoma|кью\s*стома|бит\.?\s*стоматолог|bit\.?\s*stomatolog|1c.*стоматолог|1с.*стоматолог|mac\s*dent|macdent|stom\s*box|stombox|open\s*dent(?:al)?|opendental|opendent|open\s*dent\s*images|atoz|dentrix|eaglesoft|patterson|softdent|practice\s*works|curve\s*dental|denticon|tab32|dolphin\s*(?:imaging|management)|legacy|старая\s+баз/i;
