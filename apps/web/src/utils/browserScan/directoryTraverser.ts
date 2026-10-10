import type { MigrationLocalSourceDiscoveryResponse } from "@dental/shared";
import { countLabel } from "../../lib/russianPlural";
import { browserPickedFolderFingerprint } from "./dicomDiscovery.js";
import {
	throwIfBrowserImagingScanAborted,
	throwIfBrowserMigrationScanAborted,
} from "./errorClassifiers.js";
import type {
	BrowserImagingScanOptions,
	BrowserImagingScanPhase,
	BrowserImagingScanProgress,
	BrowserImagingScanRuntime,
	BrowserMigrationFileKind,
	BrowserMigrationFolderStats,
	BrowserMigrationScanOptions,
	BrowserMigrationScanPhase,
	BrowserMigrationScanProgress,
	BrowserMigrationScanRuntime,
	BrowserMigrationScanStats,
	BrowserMigrationSourceKind,
	BrowserPickedImagingScanStats,
} from "./types.js";
import {
	browserImagingScanFileLimit,
	browserImagingScanFolderLimit,
	browserImagingScanMagicReadLimit,
	browserImagingScanProgressEveryMs,
	browserImagingScanProgressEveryUnits,
	browserImagingScanYieldEveryMs,
	browserImagingScanYieldEveryUnits,
	browserLegacyMisTextPattern,
	browserMigrationScanFileLimit,
	browserMigrationScanFolderLimit,
	browserMigrationScanMagicReadLimit,
	browserMigrationScanProgressEveryMs,
	browserMigrationScanProgressEveryUnits,
	browserMigrationScanYieldEveryMs,
	browserMigrationScanYieldEveryUnits,
	browserMigrationSourceTitles,
} from "./types.js";

export function classifyBrowserMigrationFileName(
	fileName: string,
): BrowserMigrationFileKind {
	const lowerName = fileName.toLowerCase();
	const extension = lowerName.includes(".")
		? lowerName.slice(lowerName.lastIndexOf(".") + 1)
		: "";
	if (lowerName === "dicomdir" || ["dcm", "dicom", "ima", "dc3", "acr"].includes(extension))
		return "dicom";
	if (
		[
			"fdb", "gdb", "ib", "mdb", "accdb", "sqlite", "sqlite3", "db",
			"dbf", "dbt", "fpt", "cdx", "idx", "ntx", "ndx", "mdx", "1cd",
			"mdf", "ldf", "sdf", "myd", "myi", "frm", "ibd",
		].includes(extension)
	)
		return "database";
	if (["fbk", "ibk", "gbk", "bak", "backup", "dump", "sql", "psql", "pgsql", "dt"].includes(extension))
		return "dump";
	if (["csv", "tsv", "xls", "xlsx", "xlsm", "xlsb", "ods", "xml", "json"].includes(extension))
		return "table";
	if (["zip", "7z", "rar", "tar", "gz"].includes(extension)) return "archive";
	if (["stl", "obj", "ply", "glb", "gltf", "3mf"].includes(extension)) return "model";
	if (["jpg", "jpeg", "png", "tif", "tiff", "bmp", "webp"].includes(extension)) return "image";
	return "other";
}

export function browserMigrationFolderHintScore(value: string): number {
	const normalized = value.toLowerCase();
	let score = 0;
	if (/dental|denta|clinic|stom|стом|mis|crm|legacy|migration|миграц|перенос|backup|dump|export|выгруз|стар/.test(normalized))
		score += 0.14;
	if (browserLegacyMisTextPattern.test(normalized) || /sql|firebird|interbase|access|sqlite/.test(normalized))
		score += 0.2;
	if (/sidexis|romexis|planmeca|vatech|carestream|ondemand|invivo|digora|soredex|trophy|visiodent|dbswin|vistasoft|durr|dürr|morita|i[-\s]?dixel|newtom|\bnnt\b|myray|owandy|quick\s*vision|quickvision|dexis|kavo|gendex|acteon|sopro|sopix|pspix|x[-\s]?mind|dolphin|3shape|medit|exocad/.test(normalized))
		score += 0.18;
	if (/dicom|dicomdir|cbct|кт|ккт|rvg|opg|оптг|xray|x-ray|рентген|сним|pacs|orthanc|dcm4chee/.test(normalized))
		score += 0.18;
	return score;
}

export function browserMigrationSourceKindFromStats(
	stats: BrowserMigrationFolderStats,
): BrowserMigrationSourceKind {
	const text = stats.folderHint.toLowerCase();
	if (/sidexis|romexis|planmeca|vatech|carestream|ondemand|invivo|digora|soredex|trophy|visiodent|dbswin|vistasoft|morita|i[-\s]?dixel|newtom|\bnnt\b|myray|owandy|quick\s*vision|quickvision|dexis|kavo|gendex|acteon|sopro|sopix|pspix|x[-\s]?mind|dolphin|3shape|medit|exocad/.test(text))
		return "vendor_imaging_system";
	if (stats.hasDicomDir || stats.dicomLikeFiles > 0 || /dicom|cbct|кт|ккт/.test(text))
		return "dicom_folder";
	if (stats.imageFiles >= 6 || stats.modelFiles > 0 || /rvg|opg|оптг|xray|рентген|сним/.test(text))
		return "xray_image_archive";
	if (/\.fdb|\.gdb|\.fbk|\.ib\b|\.ibk|\.gbk|firebird|interbase/.test(text))
		return "firebird_database";
	if (/\.mdb|\.accdb|access/.test(text)) return "access_database";
	if (/\.dbf|\.dbt|\.fpt|\.cdx|\.idx|\.ntx|\.ndx|\.mdx|dbase|foxpro|clipper|paradox/.test(text))
		return "mis_database";
	if (/\.sqlite|\.sqlite3|sqlite|\.db\b/.test(text)) return "sqlite_database";
	if (/mysql|mariadb|postgres|postgresql|pgsql|psql|\.myd|\.myi|\.frm|\.ibd/.test(text))
		return "mis_database";
	if (stats.dumpFiles > 0 || /\.sql|\.dump|\.bak|\.dt|\.mdf|\.ldf|\.sdf|sql server|mssql/.test(text))
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
				reasons.push(`${countLabel(stats.databaseFiles, "файл", "файла", "файлов")} старой базы`);
			if (stats.dumpFiles)
				reasons.push(`${countLabel(stats.dumpFiles, "файл", "файла", "файлов")} резервной копии`);
			if (stats.tableFiles)
				reasons.push(`${countLabel(stats.tableFiles, "табличная выгрузка", "табличные выгрузки", "табличных выгрузок")}`);
			if (stats.archiveFiles)
				reasons.push(`${countLabel(stats.archiveFiles, "архив", "архива", "архивов")}`);
			if (stats.dicomLikeFiles)
				reasons.push(`${stats.dicomLikeFiles} признаков снимков или серий КТ`);
			if (stats.imageFiles) reasons.push(`${stats.imageFiles} изображений`);
			if (stats.modelFiles) reasons.push(`${stats.modelFiles} 3D-моделей зубов`);
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
			(candidate): candidate is MigrationLocalSourceDiscoveryResponse["candidates"][number] =>
				Boolean(candidate),
		)
		.sort(
			(left, right) =>
				right.confidence - left.confidence ||
				right.matchedFiles - left.matchedFiles ||
				(right.latestModifiedAt ?? "").localeCompare(left.latestModifiedAt ?? ""),
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
				: ["В выбранной папке не найдено старых баз, снимков, архивов или выгрузок в пределах лимитов."]),
		],
		nextAction: candidates.length
			? "Откройте план по найденному кандидату из браузера или отправьте его в умный разбор как список найденных файлов."
			: "Выберите корень старой МИС/снимков выше уровнем или запустите локальный модуль миграции для полного автопоиска по ПК.",
	};
}

export function browserImagingScanNowMs(): number {
	return typeof performance !== "undefined" && typeof performance.now === "function"
		? performance.now()
		: Date.now();
}

export function createBrowserImagingScanRuntime(startedAt: string): BrowserImagingScanRuntime {
	const now = browserImagingScanNowMs();
	return {
		startedAt,
		startedAtMs: now,
		processedUnits: 0,
		lastYieldAtMs: now,
		lastProgressAtMs: now,
	};
}

export function browserImagingScanElapsedFromIso(startedAt: string, updatedAt: string): number {
	const start = Date.parse(startedAt);
	const end = Date.parse(updatedAt);
	if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
	return end - start;
}

export async function browserImagingScanYield(): Promise<void> {
	const scheduler = (
		globalThis as typeof globalThis & { scheduler?: { yield?: () => Promise<void> } }
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
	options.onProgress(browserImagingScanProgressFromStats(stats, runtime, phase, currentItem));
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

export function createBrowserMigrationScanRuntime(startedAt: string): BrowserMigrationScanRuntime {
	const now = browserImagingScanNowMs();
	return {
		startedAt,
		startedAtMs: now,
		processedUnits: 0,
		lastYieldAtMs: now,
		lastProgressAtMs: now,
	};
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
	options.onProgress(browserMigrationScanProgressFromStats(stats, runtime, phase, currentItem));
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
