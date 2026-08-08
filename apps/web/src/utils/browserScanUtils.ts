import type {
	DicomWorkstationClientFacts,
	MigrationLocalSourceDiscoveryResponse,
} from "@dental/shared";
import { showToast } from "../components/GlobalToast";
import { actionFailureToast } from "../lib/panelStateText";
import { countLabel } from "../lib/russianPlural";
import {
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../lib/safeLocalStorage";
import { logger } from "../utils/logger";
import {
	localConvenienceRetentionMs,
	localSavedAtFresh,
	organizationScopedLocalStorageKey,
} from "./localStorageHelpers";

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

export function classifyBrowserImagingFileName(
	fileName: string,
): "dicom" | "archive" | "model" | "image" | "other" {
	const lowerName = fileName.toLowerCase();
	const extension = lowerName.includes(".")
		? lowerName.slice(lowerName.lastIndexOf(".") + 1)
		: "";
	if (["dcm", "dicom", "ima"].includes(extension) || lowerName === "dicomdir")
		return "dicom";
	if (["zip", "7z", "rar"].includes(extension)) return "archive";
	if (["stl", "obj", "ply", "glb", "gltf", "3mf"].includes(extension))
		return "model";
	if (["jpg", "jpeg", "png", "tif", "tiff", "bmp", "webp"].includes(extension))
		return "image";
	return "other";
}

export function classifyBrowserMigrationFileName(
	fileName: string,
): BrowserMigrationFileKind {
	const lowerName = fileName.toLowerCase();
	const extension = lowerName.includes(".")
		? lowerName.slice(lowerName.lastIndexOf(".") + 1)
		: "";
	if (
		lowerName === "dicomdir" ||
		["dcm", "dicom", "ima", "dc3", "acr"].includes(extension)
	)
		return "dicom";
	if (
		[
			"fdb",
			"gdb",
			"ib",
			"mdb",
			"accdb",
			"sqlite",
			"sqlite3",
			"db",
			"dbf",
			"dbt",
			"fpt",
			"cdx",
			"idx",
			"ntx",
			"ndx",
			"mdx",
			"1cd",
			"mdf",
			"ldf",
			"sdf",
			"myd",
			"myi",
			"frm",
			"ibd",
		].includes(extension)
	)
		return "database";
	if (
		[
			"fbk",
			"ibk",
			"gbk",
			"bak",
			"backup",
			"dump",
			"sql",
			"psql",
			"pgsql",
			"dt",
		].includes(extension)
	)
		return "dump";
	if (
		[
			"csv",
			"tsv",
			"xls",
			"xlsx",
			"xlsm",
			"xlsb",
			"ods",
			"xml",
			"json",
		].includes(extension)
	)
		return "table";
	if (["zip", "7z", "rar", "tar", "gz"].includes(extension)) return "archive";
	if (["stl", "obj", "ply", "glb", "gltf", "3mf"].includes(extension))
		return "model";
	if (["jpg", "jpeg", "png", "tif", "tiff", "bmp", "webp"].includes(extension))
		return "image";
	return "other";
}

export function browserMigrationFolderHintScore(value: string): number {
	const normalized = value.toLowerCase();
	let score = 0;
	if (
		/dental|denta|clinic|stom|стом|mis|crm|legacy|migration|миграц|перенос|backup|dump|export|выгруз|стар/.test(
			normalized,
		)
	)
		score += 0.14;
	if (
		browserLegacyMisTextPattern.test(normalized) ||
		/sql|firebird|interbase|access|sqlite/.test(normalized)
	)
		score += 0.2;
	if (
		/sidexis|romexis|planmeca|vatech|carestream|ondemand|invivo|digora|soredex|trophy|visiodent|dbswin|vistasoft|durr|dürr|morita|i[-\s]?dixel|newtom|\bnnt\b|myray|owandy|quick\s*vision|quickvision|dexis|kavo|gendex|acteon|sopro|sopix|pspix|x[-\s]?mind|dolphin|3shape|medit|exocad/.test(
			normalized,
		)
	)
		score += 0.18;
	if (
		/dicom|dicomdir|cbct|кт|ккт|rvg|opg|оптг|xray|x-ray|рентген|сним|pacs|orthanc|dcm4chee/.test(
			normalized,
		)
	)
		score += 0.18;
	return score;
}

export function browserMigrationSourceKindFromStats(
	stats: BrowserMigrationFolderStats,
): BrowserMigrationSourceKind {
	const text = stats.folderHint.toLowerCase();
	if (
		/sidexis|romexis|planmeca|vatech|carestream|ondemand|invivo|digora|soredex|trophy|visiodent|dbswin|vistasoft|morita|i[-\s]?dixel|newtom|\bnnt\b|myray|owandy|quick\s*vision|quickvision|dexis|kavo|gendex|acteon|sopro|sopix|pspix|x[-\s]?mind|dolphin|3shape|medit|exocad/.test(
			text,
		)
	)
		return "vendor_imaging_system";
	if (
		stats.hasDicomDir ||
		stats.dicomLikeFiles > 0 ||
		/dicom|cbct|кт|ккт/.test(text)
	)
		return "dicom_folder";
	if (
		stats.imageFiles >= 6 ||
		stats.modelFiles > 0 ||
		/rvg|opg|оптг|xray|рентген|сним/.test(text)
	)
		return "xray_image_archive";
	if (/\.fdb|\.gdb|\.fbk|\.ib\b|\.ibk|\.gbk|firebird|interbase/.test(text))
		return "firebird_database";
	if (/\.mdb|\.accdb|access/.test(text)) return "access_database";
	if (
		/\.dbf|\.dbt|\.fpt|\.cdx|\.idx|\.ntx|\.ndx|\.mdx|dbase|foxpro|clipper|paradox/.test(
			text,
		)
	)
		return "mis_database";
	if (/\.sqlite|\.sqlite3|sqlite|\.db\b/.test(text)) return "sqlite_database";
	if (
		/mysql|mariadb|postgres|postgresql|pgsql|psql|\.myd|\.myi|\.frm|\.ibd/.test(
			text,
		)
	)
		return "mis_database";
	if (
		stats.dumpFiles > 0 ||
		/\.sql|\.dump|\.bak|\.dt|\.mdf|\.ldf|\.sdf|sql server|mssql/.test(text)
	)
		return "sql_dump";
	if (stats.tableFiles > 0)
		return /\.csv|\.tsv/.test(text) ? "csv_export" : "spreadsheet_export";
	if (stats.archiveFiles > 0) return "archive_export";
	if (browserLegacyMisTextPattern.test(text)) return "mis_database";
	if (stats.databaseFiles > 0) return "mis_database";
	return "unknown_legacy_source";
}

export function buildBrowserMigrationDiscovery(input: {
	rootName: string;
	sourceLabel: string;
	scannedFolders: number;
	scannedFiles: number;
	folderStats: BrowserMigrationFolderStats[];
	warnings: string[];
}): MigrationLocalSourceDiscoveryResponse {
	const candidates = input.folderStats
		.map((stats) => {
			const matchedFiles =
				stats.databaseFiles +
				stats.dumpFiles +
				stats.tableFiles +
				stats.archiveFiles +
				stats.dicomLikeFiles +
				stats.imageFiles +
				stats.modelFiles;
			const hintScore = browserMigrationFolderHintScore(stats.folderHint);
			const confidence = Math.min(
				1,
				hintScore +
					(stats.databaseFiles ? 0.5 : 0) +
					(stats.dumpFiles ? 0.42 : 0) +
					(stats.tableFiles ? 0.28 : 0) +
					(stats.archiveFiles ? 0.2 : 0) +
					(stats.dicomLikeFiles ? 0.46 : 0) +
					(stats.hasDicomDir ? 0.24 : 0) +
					(stats.imageFiles >= 8 ? 0.22 : stats.imageFiles > 0 ? 0.08 : 0) +
					(stats.modelFiles ? 0.1 : 0),
			);
			if (matchedFiles === 0 && hintScore < 0.28) return null;
			const sourceKind = browserMigrationSourceKindFromStats(stats);
			const fingerprint = browserPickedFolderFingerprint(
				`${input.rootName}:${stats.folderKey}:${matchedFiles}:${stats.totalBytes}`,
			);
			const reasons: string[] = [];
			// Счёт со склонением: «1 файлов старой базы» читается как ошибка программы.
			if (stats.databaseFiles)
				reasons.push(
					`${countLabel(stats.databaseFiles, "файл", "файла", "файлов")} старой базы`,
				);
			if (stats.dumpFiles)
				reasons.push(
					`${countLabel(stats.dumpFiles, "файл", "файла", "файлов")} резервной копии`,
				);
			if (stats.tableFiles)
				reasons.push(
					`${countLabel(stats.tableFiles, "табличная выгрузка", "табличные выгрузки", "табличных выгрузок")}`,
				);
			if (stats.archiveFiles)
				reasons.push(
					`${countLabel(stats.archiveFiles, "архив", "архива", "архивов")}`,
				);
			if (stats.dicomLikeFiles)
				reasons.push(`${stats.dicomLikeFiles} признаков снимков или серий КТ`);
			if (stats.imageFiles) reasons.push(`${stats.imageFiles} изображений`);
			if (stats.modelFiles)
				reasons.push(`${stats.modelFiles} 3D-моделей зубов`);
			if (hintScore > 0)
				reasons.push("название папки похоже на старую CRM/снимки/миграцию");
			return {
				sourceRef: `browser-local:${fingerprint}`,
				safeDisplayName: `${browserMigrationSourceTitles[sourceKind]} #${fingerprint}`,
				sourceKind,
				sourceLabel: input.sourceLabel,
				sourceFingerprint: fingerprint,
				depth: stats.depth,
				confidence: Number(confidence.toFixed(2)),
				matchedFiles,
				databaseFiles: stats.databaseFiles,
				dumpFiles: stats.dumpFiles,
				tableFiles: stats.tableFiles,
				archiveFiles: stats.archiveFiles,
				dicomLikeFiles: stats.dicomLikeFiles,
				imageFiles: stats.imageFiles + stats.modelFiles,
				hasDicomDir: stats.hasDicomDir,
				latestModifiedAt: stats.latestModifiedAt,
				reasons,
				warnings: [
					"Выбранная через браузер папка не дает полного пути; для автоматического переноса нужен локальный модуль или ручной путь администратора.",
				],
				smartImportLine: `Источник старой системы: ${browserMigrationSourceTitles[sourceKind]}; код источника browser-local:${fingerprint}; файлов=${matchedFiles}; старых баз=${stats.databaseFiles}; копий=${stats.dumpFiles}; таблиц=${stats.tableFiles}; КТ/снимков=${stats.dicomLikeFiles}; изображений=${stats.imageFiles}; моделей=${stats.modelFiles}`,
			};
		})
		.filter(
			(
				candidate,
			): candidate is MigrationLocalSourceDiscoveryResponse["candidates"][number] =>
				Boolean(candidate),
		)
		.sort(
			(left, right) =>
				right.confidence - left.confidence ||
				right.matchedFiles - left.matchedFiles ||
				(right.latestModifiedAt ?? "").localeCompare(
					left.latestModifiedAt ?? "",
				),
		)
		.slice(0, 18);

	return {
		version: "dental-crm-migration-local-discovery-v1",
		generatedAt: new Date().toISOString(),
		roots: [
			`browser-local:${browserPickedFolderFingerprint(`${input.rootName}:${input.scannedFiles}:${input.scannedFolders}`)}`,
		],
		scannedFolders: input.scannedFolders,
		candidates,
		warnings: [
			...input.warnings,
			"Браузерный список читает только выбранную папку/файлы и не раскрывает серверу полный локальный путь.",
			...(candidates.length
				? []
				: [
						"В выбранной папке не найдено старых баз, снимков, архивов или выгрузок в пределах лимитов.",
					]),
		],
		nextAction: candidates.length
			? "Откройте план по найденному кандидату из браузера или отправьте его в умный разбор как список найденных файлов."
			: "Выберите корень старой МИС/снимков выше уровнем или запустите локальный модуль миграции для полного автопоиска по ПК.",
	};
}

export async function browserFileHasDicomMagic(file: File): Promise<boolean> {
	if (file.size < 132) return false;
	try {
		const bytes = new Uint8Array(await file.slice(128, 132).arrayBuffer());
		return (
			bytes[0] === 0x44 &&
			bytes[1] === 0x49 &&
			bytes[2] === 0x43 &&
			bytes[3] === 0x4d
		);
	} catch {
		return false;
	}
}

export function browserImagingScanNowMs(): number {
	return typeof performance !== "undefined" &&
		typeof performance.now === "function"
		? performance.now()
		: Date.now();
}

export function createBrowserImagingScanRuntime(
	startedAt: string,
): BrowserImagingScanRuntime {
	const now = browserImagingScanNowMs();
	return {
		startedAt,
		startedAtMs: now,
		processedUnits: 0,
		lastYieldAtMs: now,
		lastProgressAtMs: now,
	};
}

export function browserImagingScanElapsedFromIso(
	startedAt: string,
	updatedAt: string,
): number {
	const start = Date.parse(startedAt);
	const end = Date.parse(updatedAt);
	if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
	return end - start;
}

export function throwIfBrowserImagingScanAborted(signal?: AbortSignal): void {
	if (!signal?.aborted) return;
	const error = new Error("Browser imaging scan cancelled");
	error.name = "AbortError";
	throw error;
}

export function isBrowserImagingScanAbortError(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"name" in error &&
		String((error as { name?: unknown }).name) === "AbortError"
	);
}

export async function browserImagingScanYield(): Promise<void> {
	const scheduler = (
		globalThis as typeof globalThis & {
			scheduler?: { yield?: () => Promise<void> };
		}
	).scheduler;
	if (typeof scheduler?.yield === "function") {
		await scheduler.yield();
		return;
	}
	await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

export function browserImagingScanProgressFromStats(
	stats: BrowserPickedImagingScanStats,
	runtime: BrowserImagingScanRuntime,
	phase: BrowserImagingScanPhase,
	currentItem: string | null,
): BrowserImagingScanProgress {
	const now = browserImagingScanNowMs();
	return {
		...stats,
		warnings: [...stats.warnings],
		phase,
		currentItem,
		startedAt: runtime.startedAt,
		updatedAt: new Date().toISOString(),
		elapsedMs: Math.max(0, Math.round(now - runtime.startedAtMs)),
		processedUnits: runtime.processedUnits,
		fileLimit: browserImagingScanFileLimit,
		folderLimit: browserImagingScanFolderLimit,
		magicReadLimit: browserImagingScanMagicReadLimit,
	};
}

export function publishBrowserImagingScanProgress(
	stats: BrowserPickedImagingScanStats,
	options: BrowserImagingScanOptions,
	runtime: BrowserImagingScanRuntime,
	currentItem: string | null,
	phase: BrowserImagingScanPhase = "scanning",
	force = false,
): void {
	if (!options.onProgress) return;
	const now = browserImagingScanNowMs();
	const shouldPublish =
		force ||
		runtime.processedUnits % browserImagingScanProgressEveryUnits === 0 ||
		now - runtime.lastProgressAtMs >= browserImagingScanProgressEveryMs;
	if (!shouldPublish) return;
	runtime.lastProgressAtMs = now;
	options.onProgress(
		browserImagingScanProgressFromStats(stats, runtime, phase, currentItem),
	);
}

export async function maybeYieldBrowserImagingScan(
	runtime: BrowserImagingScanRuntime,
	signal?: AbortSignal,
): Promise<void> {
	throwIfBrowserImagingScanAborted(signal);
	const now = browserImagingScanNowMs();
	const shouldYield =
		runtime.processedUnits % browserImagingScanYieldEveryUnits === 0 ||
		now - runtime.lastYieldAtMs >= browserImagingScanYieldEveryMs;
	if (!shouldYield) return;
	runtime.lastYieldAtMs = now;
	await browserImagingScanYield();
	throwIfBrowserImagingScanAborted(signal);
}

export function createBrowserMigrationScanRuntime(
	startedAt: string,
): BrowserMigrationScanRuntime {
	const now = browserImagingScanNowMs();
	return {
		startedAt,
		startedAtMs: now,
		processedUnits: 0,
		lastYieldAtMs: now,
		lastProgressAtMs: now,
	};
}

export function throwIfBrowserMigrationScanAborted(signal?: AbortSignal): void {
	if (!signal?.aborted) return;
	const error = new Error("Browser migration scan cancelled");
	error.name = "AbortError";
	throw error;
}

export function isBrowserMigrationScanAbortError(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"name" in error &&
		String((error as { name?: unknown }).name) === "AbortError"
	);
}

export function browserMigrationScanProgressFromStats(
	stats: BrowserMigrationScanStats,
	runtime: BrowserMigrationScanRuntime,
	phase: BrowserMigrationScanPhase,
	currentItem: string | null,
): BrowserMigrationScanProgress {
	const now = browserImagingScanNowMs();
	return {
		...stats,
		warnings: [...stats.warnings],
		phase,
		currentItem,
		startedAt: runtime.startedAt,
		updatedAt: new Date().toISOString(),
		elapsedMs: Math.max(0, Math.round(now - runtime.startedAtMs)),
		processedUnits: runtime.processedUnits,
		fileLimit: browserMigrationScanFileLimit,
		folderLimit: browserMigrationScanFolderLimit,
		magicReadLimit: browserMigrationScanMagicReadLimit,
	};
}

export function publishBrowserMigrationScanProgress(
	stats: BrowserMigrationScanStats,
	options: BrowserMigrationScanOptions,
	runtime: BrowserMigrationScanRuntime,
	currentItem: string | null,
	phase: BrowserMigrationScanPhase = "scanning",
	force = false,
): void {
	if (!options.onProgress) return;
	const now = browserImagingScanNowMs();
	const shouldPublish =
		force ||
		runtime.processedUnits % browserMigrationScanProgressEveryUnits === 0 ||
		now - runtime.lastProgressAtMs >= browserMigrationScanProgressEveryMs;
	if (!shouldPublish) return;
	runtime.lastProgressAtMs = now;
	options.onProgress(
		browserMigrationScanProgressFromStats(stats, runtime, phase, currentItem),
	);
}

export async function maybeYieldBrowserMigrationScan(
	runtime: BrowserMigrationScanRuntime,
	signal?: AbortSignal,
): Promise<void> {
	throwIfBrowserMigrationScanAborted(signal);
	const now = browserImagingScanNowMs();
	const shouldYield =
		runtime.processedUnits % browserMigrationScanYieldEveryUnits === 0 ||
		now - runtime.lastYieldAtMs >= browserMigrationScanYieldEveryMs;
	if (!shouldYield) return;
	runtime.lastYieldAtMs = now;
	await browserImagingScanYield();
	throwIfBrowserMigrationScanAborted(signal);
}

export function addBrowserMigrationKindToScanStats(
	stats: BrowserMigrationScanStats,
	kind: BrowserMigrationFileKind,
	fileSize: number,
): void {
	stats.totalBytes += fileSize;
	if (kind === "database") stats.databaseFiles += 1;
	else if (kind === "dump") stats.dumpFiles += 1;
	else if (kind === "table") stats.tableFiles += 1;
	else if (kind === "archive") stats.archiveFiles += 1;
	else if (kind === "dicom") stats.dicomLikeFiles += 1;
	else if (kind === "image") stats.imageFiles += 1;
	else if (kind === "model") stats.modelFiles += 1;
}

export function localImagingFolderFingerprint(folderPath: string): string {
	let hash = 2166136261;
	for (let index = 0; index < folderPath.length; index += 1) {
		hash ^= folderPath.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return (hash >>> 0).toString(16).padStart(8, "0").toUpperCase();
}

export function browserPickedFolderFingerprint(input: string): string {
	return localImagingFolderFingerprint(input || "browser-local-imaging-folder");
}

export function saveBrowserPickedImagingFolderPreview(
	preview: BrowserPickedImagingFolderPreview,
	organizationId: string | null | undefined = null,
): void {
	if (typeof window === "undefined") return;
	try {
		safeLocalStorageSetItem(
			organizationScopedLocalStorageKey(
				browserPickedImagingFolderStorageKey,
				organizationId,
			),
			JSON.stringify(preview),
		);
	} catch (error) {
		showToast(
			actionFailureToast(
				"Ошибка выполнения операции",
				(error as { status?: number })?.status ?? null,
			),
			"error",
		);
		logger.error("Failed to save browser picked imaging folder preview", error);
		// Browser-picked folder summaries are best-effort and contain no raw local path.
	}
}

export function loadBrowserPickedImagingFolderPreview(
	organizationId: string | null | undefined = null,
): BrowserPickedImagingFolderPreview | null {
	if (typeof window === "undefined") return null;
	try {
		const localKey = organizationScopedLocalStorageKey(
			browserPickedImagingFolderStorageKey,
			organizationId,
		);
		const raw =
			safeLocalStorageGetItem(localKey) ??
			(organizationId
				? safeLocalStorageGetItem(browserPickedImagingFolderStorageKey)
				: null);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as BrowserPickedImagingFolderPreview;
		if (parsed?.version !== 1 || !parsed.folderFingerprint || !parsed.createdAt)
			return null;
		if (!localSavedAtFresh(parsed.createdAt, localConvenienceRetentionMs)) {
			safeLocalStorageRemoveItem(localKey);
			if (organizationId)
				safeLocalStorageRemoveItem(browserPickedImagingFolderStorageKey);
			return null;
		}
		return parsed;
	} catch (error) {
		showToast(
			actionFailureToast(
				"Ошибка выполнения операции",
				(error as { status?: number })?.status ?? null,
			),
			"error",
		);
		logger.error(
			"Failed to remove browser picked imaging folder preview",
			error,
		);
		return null;
	}
}

export function removeBrowserPickedImagingFolderPreview(
	organizationId: string | null | undefined = null,
): void {
	if (typeof window === "undefined") return;
	try {
		safeLocalStorageRemoveItem(
			organizationScopedLocalStorageKey(
				browserPickedImagingFolderStorageKey,
				organizationId,
			),
		);
		if (organizationId)
			safeLocalStorageRemoveItem(browserPickedImagingFolderStorageKey);
	} catch {
		// ignore unavailable storage
	}
}

export function buildBrowserPickedImagingFolderPreview(
	stats: BrowserPickedImagingScanStats,
): BrowserPickedImagingFolderPreview {
	const fingerprint = browserPickedFolderFingerprint(
		[
			stats.rootName,
			stats.scannedFiles,
			stats.scannedFolders,
			stats.dicomLikeFiles,
			stats.archiveFiles,
			stats.modelFiles,
			stats.imageFiles,
			stats.totalBytes,
		].join(":"),
	);
	const hasDicom = stats.dicomLikeFiles > 0;
	const hasModels = stats.modelFiles > 0;
	const nextAction = hasDicom
		? "Найдены файлы КТ/снимков. Для тяжелой КТ откройте эту же папку в локальном модуле клиники или в полноценном просмотрщике КТ."
		: hasModels
			? "Найдены стоматологические 3D-модели. До подключения просмотрщика 3D-моделей держим это как метаданные органайзера."
			: "В ограниченном браузерном сканировании файлы снимков не найдены.";
	return {
		version: 1,
		safeDisplayName: `${hasDicom ? "Браузерная КТ-папка" : "Браузерная папка снимков"} #${fingerprint}`,
		sourceLabel:
			stats.sourceKind === "browser_directory_picker"
				? "Выбор папки браузером"
				: "Выбор файлов браузером",
		sourceKind: stats.sourceKind,
		folderFingerprint: fingerprint,
		rootName: stats.rootName || "Выбранная папка",
		scannedFiles: stats.scannedFiles,
		scannedFolders: stats.scannedFolders,
		dicomLikeFiles: stats.dicomLikeFiles,
		archiveFiles: stats.archiveFiles,
		modelFiles: stats.modelFiles,
		imageFiles: stats.imageFiles,
		totalBytes: stats.totalBytes,
		createdAt: new Date().toISOString(),
		nextAction,
		warnings: stats.warnings,
	};
}

export function hasDentalDesktopShellBridge(): boolean {
	if (typeof window === "undefined") return false;
	const runtimeWindow = window as DentalDesktopRuntimeWindow;
	return Boolean(
		runtimeWindow.dentalCrmDesktop?.dicomBridge ||
			runtimeWindow.dentalCrmDesktop?.localFileBridge ||
			runtimeWindow.__DENTAL_CRM_DESKTOP__ ||
			runtimeWindow.__TAURI__ ||
			runtimeWindow.electronAPI,
	);
}

export function detectDicomRuntimeSurfaceHint(): DicomWorkstationClientFacts["runtimeSurfaceHint"] {
	if (typeof navigator === "undefined") return "unknown";
	if (hasDentalDesktopShellBridge()) return "desktop_app";
	const text =
		`${navigator.platform || ""} ${navigator.userAgent || ""}`.toLowerCase();
	if (/ipad|tablet/.test(text)) return "tablet_web";
	if (/android|iphone|ipod|mobile|phone/.test(text)) return "mobile_web";
	if (/win|mac|linux|x11|desktop/.test(text)) return "desktop_web";
	return "unknown";
}

export async function collectDicomWorkstationClientFacts(): Promise<DicomWorkstationClientFacts> {
	let webgl2Supported = false;
	let webglVendor: string | null = null;
	let webglRenderer: string | null = null;
	let maxTextureSize: number | null = null;
	let max3dTextureSize: number | null = null;
	let maxRenderbufferSize: number | null = null;
	try {
		const canvas = document.createElement("canvas");
		const gl = canvas.getContext("webgl2");
		webgl2Supported = Boolean(gl);
		if (gl) {
			maxTextureSize = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || null;
			max3dTextureSize =
				Number(gl.getParameter(gl.MAX_3D_TEXTURE_SIZE)) || null;
			maxRenderbufferSize =
				Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)) || null;
			const debugInfo = gl.getExtension("WEBGL_debug_renderer_info") as {
				UNMASKED_VENDOR_WEBGL: number;
				UNMASKED_RENDERER_WEBGL: number;
			} | null;
			if (debugInfo) {
				webglVendor =
					String(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) ?? "").slice(
						0,
						180,
					) || null;
				webglRenderer =
					String(
						gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? "",
					).slice(0, 240) || null;
			}
		}
	} catch {
		webgl2Supported = false;
	}

	const navigatorWithMemory = navigator as Navigator & {
		deviceMemory?: number;
	};
	let storageQuotaMb: number | null = null;
	let storageUsageMb: number | null = null;
	try {
		const estimate = await navigator.storage?.estimate?.();
		storageQuotaMb = estimate?.quota
			? Math.floor(estimate.quota / 1024 / 1024)
			: null;
		storageUsageMb = estimate?.usage
			? Math.floor(estimate.usage / 1024 / 1024)
			: null;
	} catch {
		storageQuotaMb = null;
		storageUsageMb = null;
	}

	const directoryPickerSupported =
		typeof window !== "undefined" &&
		typeof (window as BrowserDirectoryPickerWindow).showDirectoryPicker ===
			"function";
	const desktopShellBridgeSupported = hasDentalDesktopShellBridge();

	return {
		deviceMemoryGb: navigatorWithMemory.deviceMemory ?? null,
		hardwareConcurrency: navigator.hardwareConcurrency || null,
		webgl2Supported,
		webglVendor,
		webglRenderer,
		maxTextureSize,
		max3dTextureSize,
		maxRenderbufferSize,
		devicePixelRatio: window.devicePixelRatio || null,
		offscreenCanvasSupported: typeof OffscreenCanvas !== "undefined",
		webWorkerSupported: typeof Worker !== "undefined",
		indexedDbSupported: typeof indexedDB !== "undefined",
		storageQuotaMb,
		storageUsageMb,
		online: navigator.onLine,
		runtimeSurfaceHint: detectDicomRuntimeSurfaceHint(),
		desktopShellBridgeSupported,
		directoryPickerSupported,
		directoryHandlePersistence: directoryPickerSupported
			? "session_only"
			: "unsupported",
		userAgent: navigator.userAgent.slice(0, 300),
		platform: navigator.platform || null,
	};
}
