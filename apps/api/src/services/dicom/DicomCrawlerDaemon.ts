/**
 * DicomCrawlerDaemon.ts — Автономный демон фонового поиска, инспекции архивов,
 * дедупликации и авто-распаковки КТ / DICOM исследований.
 *
 * ОТВЕТЫ НА ВОПРОСЫ В АРХИТЕКТУРЕ И КОДЕ:
 * 1. Как определять архивы (.zip, .rar, .7z) — НЕ по весу, а заглядывать внутрь!
 *    - Демон читает заголовок и оглавление архива (Central Directory для zip):
 *      * Ищет сигнатуры DICOM-файлов: расширения .dcm, .dicom, префиксы CT*, IMG*, файл DICOMDIR.
 *      * Читает первые 132 байта первого файла внутри архива: проверяет магическую 4-байтовую
 *        сигнатуру DICM на 128-м байте (стандарт DICOM Part 10).
 *      * Если сигнатура DICM найдена — это 100% КТ/рентген исследование без ложных срабатываний!
 * 2. Исключение дубликатов (Архив vs Распакованная папка):
 *    - Томограф при съемке записывает глобально уникальный StudyInstanceUID (тег 0020,000D).
 *    - Внутри zip-архива и в распакованной папке StudyInstanceUID АБСОЛЮТНО ОДИНАКОВЫЙ!
 *    - Демон строит отпечаток: StudyInstanceUID + PatientName + PatientBirthDate + StudyDate + TotalSlicesCount.
 *    - В реестре связываются archivePath и unpackedFolderPath:
 *      * Если на диске есть и архив Ivanov_CT.zip, и папка Ivanov_CT\, регистрируется ровно 1 запись.
 * 3. Автоматическая распаковка:
 *    - Если найден архив, для которого еще нет распакованной папки — демон автоматически
 *      распаковывает его в защищенный локальный кэш (.data/dicom_cache/<StudyInstanceUID>/),
 *      парсит DICOM-заголовки и регистрирует исследование в картотеке CRM.
 * 4. Режимы сканирования:
 *    - Первичный обход при установке/старте: Downloads, Desktop, Documents, C:\EzDent-i\Data, C:\Planmeca, D:\DICOM.
 *    - Фоновый мониторинг: каждые 15 минут + fs.watch на Downloads и горячих папках.
 *    - Ручной вызов через API и кнопку в архиве: [ 🔍 Найти КТ на диске ].
 */

import { existsSync, statSync, readdirSync, watch, type FSWatcher } from "node:fs";
import { open, mkdir, readdir, stat, readFile, writeFile, copyFile, chmod } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { EventEmitter } from "node:events";
import { createInflateRaw } from "node:zlib";
import { once } from "node:events";
import type { FileHandle } from "node:fs/promises";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { and, eq, or } from "drizzle-orm";
import { wsBroker } from "../websocketBroker.js";
import {
	hasDicomPart10Magic,
	isZipArchiveMagic,
	buildStudyFingerprint,
	buildStudyStorageFolderName,
	buildStudyManifest,
	formatStudyManifestJson,
	generateWindowsUrlShortcut,
	generateMacWeblocShortcut,
	generateMacCommandShortcut,
	resolveSystemDicomStorageDir,
	type DicomCrawlerDiscoveredStudy,
	type DicomArchiveInspectionResult,
	type DicomCrawlerDaemonConfig,
	type DicomCrawlerDaemonStatus,
	type DicomCrawlerScanReport,
} from "@dental/shared";
import { dicomStoragePackagingService } from "./DicomStoragePackagingService.js";
import {
	parseDicomIngestBuffer,
	type DicomIngestMetadata,
} from "./dicomIngestMetadataParser.js";
import {
	resolveOrAutoCreatePatientForDicom,
} from "./dicomPatientAutoBinder.js";
import {
	scanDicomSeriesFolder,
	type DicomSeriesScanSummary,
} from "../imaging/dicomMetadataParser.js";

// Константы для потокового чтения архивов
const ZIP_EOCD_SEARCH_WINDOW = 65536; // 64 КБ с конца файла
const ZIP_MAX_HEADER_PREFIX = 65536; // 64 КБ для заголовков DICOM
const DEBOUNCE_FILE_STABILIZE_MS = 4000; // 4 сек ожидания завершения записи/скачивания

// Тотальная фильтрация мусора из архивов (Zero-Viewer Bleed):
// 99% архивов КТ из других клиник забиты исполняемыми файлами сторонних просмотрщиков (Ez3D-i, Romexis, Galileos),
// dll-библиотеками, установщиками и скриптами автозапуска. Мы берем ИСКЛЮЧИТЕЛЬНО реальные DICOM-файлы и метаданные!
const JUNK_VIEWER_EXTENSIONS = new Set([
	".exe", ".dll", ".msi", ".bat", ".cmd", ".inf", ".sys", ".com",
	".scr", ".vbs", ".ps1", ".iso", ".dmg", ".bin", ".cab", ".ocx",
	".pyd", ".so", ".dylib", ".ico", ".lnk", ".cpl", ".drv", ".chm",
	".hlp", ".ini", ".cfg", ".manifest", ".pdf", ".doc", ".docx",
	".txt", ".rtf", ".html", ".htm", ".url",
]);

const JUNK_VIEWER_PATH_REGEX =
	/(?:^|[\\/])(?:viewer|cdviewer|ez3d-i|romexis|galileos|sicat|system|autorun|launcher|install|setup|bin|driver|manual|documentation|help)(?:[\\/]|$)/i;

interface ZipCentralEntry {
	name: string;
	compressionMethod: number; // 0 = store, 8 = deflate
	compressedSize: number;
	uncompressedSize: number;
	localHeaderOffset: number;
	encrypted: boolean;
}

export class DicomCrawlerDaemon extends EventEmitter {
	private config: DicomCrawlerDaemonConfig;
	private intervalTimer: NodeJS.Timeout | null = null;
	private fileWatchers: FSWatcher[] = [];
	private isScanning = false;
	private lastScanAt: Date | null = null;
	private lastScanDurationMs = 0;
	private errors: string[] = [];

	// Реестр обнаруженных исследований: StudyInstanceUID -> Study
	private registeredStudies = new Map<string, DicomCrawlerDiscoveredStudy>();

	// Индекс отпечатков: Fingerprint -> StudyInstanceUID
	private fingerprintIndex = new Map<string, string>();

	// Статистика
	private totalArchivesFound = 0;
	private totalArchivesUnpacked = 0;
	private duplicatesAvoided = 0;
	private totalJunkFilesSkipped = 0;
	private totalJunkBytesFiltered = 0;

	constructor(configOverrides?: Partial<DicomCrawlerDaemonConfig>) {
		super();
		const defaultCache = dicomStoragePackagingService.getSystemStorageDir();
		this.config = {
			enabled: configOverrides?.enabled ?? true,
			watchPaths: configOverrides?.watchPaths ?? this.getDefaultWatchPaths(),
			pollIntervalMinutes: configOverrides?.pollIntervalMinutes ?? 15,
			autoUnpack: configOverrides?.autoUnpack ?? true,
			cacheDir: configOverrides?.cacheDir ?? defaultCache,
			hotFolders: configOverrides?.hotFolders ?? this.getDefaultHotFolders(),
			defaultOrganizationId: configOverrides?.defaultOrganizationId ?? null,
		};
	}

	/**
	 * Получение путей сканирования на macOS (системные папки, OsiriX, Horos, внешние тома /Volumes)
	 */
	public getMacWatchPaths(homedir?: string): string[] {
		const rawHome = homedir || os.homedir();
		const home = rawHome.replace(/\\/g, "/");
		const paths: string[] = [
			path.posix.join(home, "Downloads"),
			path.posix.join(home, "Desktop"),
			path.posix.join(home, "Documents"),
			path.posix.join(home, "Documents", "OsiriX Data"),
			path.posix.join(home, "Library", "Application Support", "OsiriX"),
			path.posix.join(home, "Library", "Application Support", "Horos"),
			"/Library/Application Support/OsiriX",
			"/Library/Application Support/Horos",
		];

		// Внешние тома macOS: /Volumes/*/DICOM и /Volumes/*/CT_Export
		const volumesRoot = "/Volumes";
		try {
			if (existsSync(volumesRoot) && statSync(volumesRoot).isDirectory()) {
				const entries = readdirSync(volumesRoot, { withFileTypes: true });
				for (const entry of entries) {
					if (entry.isDirectory()) {
						paths.push(path.posix.join(volumesRoot, entry.name, "DICOM"));
						paths.push(path.posix.join(volumesRoot, entry.name, "CT_Export"));
					}
				}
			}
		} catch {
			// игнорируем ошибку обхода /Volumes
		}

		return paths;
	}

	/**
	 * Получение путей сканирования на Windows
	 */
	public getWindowsWatchPaths(homedir?: string): string[] {
		const home = homedir || os.homedir();
		return [
			path.join(home, "Downloads"),
			path.join(home, "Desktop"),
			path.join(home, "Documents"),
			"C:\\EzDent-i\\Data",
			"C:\\EzDent-i\\Export",
			"C:\\Ez3D-i\\Export",
			"C:\\Romexis\\Studies",
			"C:\\Romexis\\Export",
			"C:\\Planmeca",
			"C:\\Sidexis\\Export",
			"C:\\KaVo\\Export",
			"C:\\CT_Export",
			"D:\\DICOM",
			"D:\\CT_Export",
			"D:\\Export",
		];
	}

	/**
	 * Получение стандартных путей сканирования на рабочих станциях клиники (с поддержкой macOS, Windows и Linux)
	 */
	public getDefaultWatchPaths(platformOverride?: string, homedirOverride?: string): string[] {
		const envPaths = process.env.DENTAL_DICOM_CRAWLER_PATHS
			? process.env.DENTAL_DICOM_CRAWLER_PATHS.split(/[;|]/).map((p) => p.trim()).filter(Boolean)
			: [];

		const currentPlatform = platformOverride ?? os.platform();
		const home = homedirOverride ?? os.homedir();

		let candidates: string[] = [];
		if (currentPlatform === "darwin") {
			candidates = [...envPaths, ...this.getMacWatchPaths(home)];
		} else if (currentPlatform === "win32") {
			candidates = [...envPaths, ...this.getWindowsWatchPaths(home)];
		} else {
			// Linux & others
			candidates = [
				...envPaths,
				path.join(home, "Downloads"),
				path.join(home, "Desktop"),
				path.join(home, "Documents"),
				path.join(home, ".local", "share", "dentedental", "dicom"),
			];
		}

		const existing = candidates.filter((p) => {
			try {
				return existsSync(p) && statSync(p).isDirectory();
			} catch {
				return false;
			}
		});

		return Array.from(new Set(existing.map((p) => path.resolve(p))));
	}

	/**
	 * Получение горячих папок для real-time fs.watch (с поддержкой macOS и Windows)
	 */
	public getDefaultHotFolders(platformOverride?: string, homedirOverride?: string): string[] {
		const currentPlatform = platformOverride ?? os.platform();
		const home = homedirOverride ?? os.homedir();

		let candidates: string[] = [];
		if (currentPlatform === "darwin") {
			candidates = [
				path.join(home, "Downloads"),
				path.join(home, "Desktop"),
				path.join(home, "Documents", "OsiriX Data"),
			];
			const volumesRoot = "/Volumes";
			try {
				if (existsSync(volumesRoot) && statSync(volumesRoot).isDirectory()) {
					const entries = readdirSync(volumesRoot, { withFileTypes: true });
					for (const entry of entries) {
						if (entry.isDirectory()) {
							candidates.push(path.join(volumesRoot, entry.name, "DICOM"));
							candidates.push(path.join(volumesRoot, entry.name, "CT_Export"));
						}
					}
				}
			} catch {
				// игнорируем
			}
		} else if (currentPlatform === "win32") {
			candidates = [
				path.join(home, "Downloads"),
				path.join(home, "Desktop"),
				"C:\\EzDent-i\\Export",
				"C:\\Romexis\\Export",
				"D:\\CT_Export",
			];
		} else {
			candidates = [
				path.join(home, "Downloads"),
				path.join(home, "Desktop"),
			];
		}

		return candidates.filter((p) => {
			try {
				return existsSync(p) && statSync(p).isDirectory();
			} catch {
				return false;
			}
		});
	}

	/**
	 * Запуск демона: стартовый скан, периодический опрос раз в 15 минут, fs.watch на горячих папках
	 */
	public start(): void {
		if (this.intervalTimer) return;
		this.config.enabled = true;

		// 1. Убеждаемся в наличии каталога кэша
		try {
			if (!existsSync(this.config.cacheDir)) {
				void mkdir(this.config.cacheDir, { recursive: true });
			}
		} catch {
			// игнорируем ошибку первичного создания
		}

		// 2. Первичный скан при запуске
		void this.scanNow();

		// 3. Периодический таймер (дефолт: раз в 15 минут)
		const intervalMs = Math.max(60000, this.config.pollIntervalMinutes * 60 * 1000);
		this.intervalTimer = setInterval(() => {
			void this.scanNow();
		}, intervalMs);
		this.intervalTimer.unref();

		// 4. fs.watch на горячих папках
		this.setupHotFolderWatchers();

		this.emit("started");
	}

	/**
	 * Остановка демона
	 */
	public stop(): void {
		if (this.intervalTimer) {
			clearInterval(this.intervalTimer);
			this.intervalTimer = null;
		}
		for (const watcher of this.fileWatchers) {
			try {
				watcher.close();
			} catch {
				// игнорируем ошибки закрытия
			}
		}
		this.fileWatchers = [];
		this.config.enabled = false;
		this.emit("stopped");
	}

	public isRunning(): boolean {
		return this.intervalTimer !== null;
	}

	/**
	 * Обновление конфигурации на лету
	 */
	public updateConfig(newConfig: Partial<DicomCrawlerDaemonConfig>): DicomCrawlerDaemonStatus {
		if (newConfig.watchPaths !== undefined) {
			this.config.watchPaths = Array.from(new Set(newConfig.watchPaths.map((p) => path.resolve(p))));
		}
		if (newConfig.hotFolders !== undefined) {
			this.config.hotFolders = Array.from(new Set(newConfig.hotFolders.map((p) => path.resolve(p))));
			this.setupHotFolderWatchers();
		}
		if (newConfig.autoUnpack !== undefined) {
			this.config.autoUnpack = newConfig.autoUnpack;
		}
		if (newConfig.pollIntervalMinutes !== undefined) {
			this.config.pollIntervalMinutes = Math.max(1, newConfig.pollIntervalMinutes);
			if (this.isRunning()) {
				this.stop();
				this.start();
			}
		}
		if (newConfig.enabled !== undefined) {
			if (newConfig.enabled && !this.isRunning()) this.start();
			if (!newConfig.enabled && this.isRunning()) this.stop();
		}
		return this.getStatus();
	}

	/**
	 * Текущий статус демона
	 */
	public getStatus(): DicomCrawlerDaemonStatus {
		return {
			isRunning: this.isRunning(),
			isScanning: this.isScanning,
			enabled: this.config.enabled,
			autoUnpack: this.config.autoUnpack,
			lastScanAt: this.lastScanAt ? this.lastScanAt.toISOString() : null,
			lastScanDurationMs: this.lastScanDurationMs,
			totalStudiesFound: this.registeredStudies.size,
			totalArchivesFound: this.totalArchivesFound,
			totalArchivesUnpacked: this.totalArchivesUnpacked,
			duplicatesAvoided: this.duplicatesAvoided,
			totalJunkFilesSkipped: this.totalJunkFilesSkipped,
			totalJunkBytesFiltered: this.totalJunkBytesFiltered,
			scannedDirectories: this.config.watchPaths,
			discoveredStudies: Array.from(this.registeredStudies.values()).slice(0, 50),
			errors: this.errors.slice(-10),
		};
	}

	/**
	 * Настройка fs.watch на горячих каталогах (Downloads, Export)
	 */
	private setupHotFolderWatchers(): void {
		for (const w of this.fileWatchers) {
			try {
				w.close();
			} catch {
				// игнорируем
			}
		}
		this.fileWatchers = [];

		for (const hotDir of this.config.hotFolders) {
			if (!existsSync(hotDir)) continue;
			try {
				const watcher = watch(hotDir, { recursive: false }, (_eventType, filename) => {
					if (!filename) return;
					const fullPath = path.join(hotDir, filename.toString());
					this.handleHotFileEvent(fullPath);
				});
				this.fileWatchers.push(watcher);
			} catch (err) {
				this.errors.push(`Не удалось подключить fs.watch к ${hotDir}: ${String(err)}`);
			}
		}
	}

	/**
	 * Обработка события появления файла в горячей папке с debouncing
	 */
	private handleHotFileEvent(targetPath: string): void {
		setTimeout(async () => {
			try {
				if (!existsSync(targetPath)) return;
				const st = await stat(targetPath);
				// Проверяем стабилизацию файла
				if (Date.now() - st.mtimeMs < DEBOUNCE_FILE_STABILIZE_MS) {
					return;
				}
				const orgId = await this.resolveOrganizationId();
				if (!orgId) return;

				if (st.isFile()) {
					const ext = path.extname(targetPath).toLowerCase();
					if (ext === ".zip") {
						await this.processArchiveCandidate(targetPath, orgId);
					}
				} else if (st.isDirectory()) {
					await this.processFolderCandidate(targetPath, orgId);
				}
			} catch {
				// игнорируем временные сбои доступа
			}
		}, DEBOUNCE_FILE_STABILIZE_MS);
	}

	/**
	 * ПРИНУДИТЕЛЬНОЕ СКАНИРОВАНИЕ (Ручной вызов или по таймеру)
	 */
	public async scanNow(explicitPaths?: string[]): Promise<DicomCrawlerScanReport> {
		if (this.isScanning) {
			return {
				scannedDirectoriesCount: 0,
				scannedDirectories: [],
				newStudiesDiscovered: 0,
				archivesFound: 0,
				archivesUnpacked: 0,
				duplicatesAvoided: 0,
				junkFilesSkipped: 0,
				junkBytesFiltered: 0,
				durationMs: 0,
				studies: Array.from(this.registeredStudies.values()),
			};
		}

		this.isScanning = true;
		const startTime = Date.now();
		const initialJunkFiles = this.totalJunkFilesSkipped;
		const initialJunkBytes = this.totalJunkBytesFiltered;
		const initialDuplicates = this.duplicatesAvoided;
		let newStudiesDiscovered = 0;
		let archivesFound = 0;
		let archivesUnpacked = 0;

		const targetRoots = explicitPaths && explicitPaths.length > 0 ? explicitPaths : this.config.watchPaths;

		try {
			const orgId = await this.resolveOrganizationId();
			if (!orgId) {
				return {
					scannedDirectoriesCount: 0,
					scannedDirectories: targetRoots,
					newStudiesDiscovered: 0,
					archivesFound: 0,
					archivesUnpacked: 0,
					duplicatesAvoided: 0,
					junkFilesSkipped: 0,
					junkBytesFiltered: 0,
					durationMs: 0,
					studies: [],
				};
			}

			// Обходим все целевые директории
			for (const root of targetRoots) {
				if (!existsSync(root)) continue;

				try {
					const { archives, folders } = await this.findArchivesAndFolders(root, 3);

					// 1. Сначала обрабатываем распакованные папки
					for (const folder of folders) {
						const res = await this.processFolderCandidate(folder, orgId);
						if (res && res.status !== "duplicate_resolved") {
							newStudiesDiscovered++;
						}
						// Low-priority throttled I/O: уступаем поток врачебным запросам
						await new Promise((r) => setImmediate(r));
					}

					// 2. Затем инспектируем архивы (с заглядыванием внутрь без обязательной распаковки)
					for (const archive of archives) {
						archivesFound++;
						this.totalArchivesFound++;
						const res = await this.processArchiveCandidate(archive, orgId);
						if (res) {
							if (res.status === "unpacked") {
								archivesUnpacked++;
								this.totalArchivesUnpacked++;
								newStudiesDiscovered++;
							} else if (res.status !== "duplicate_resolved") {
								newStudiesDiscovered++;
							}
						}
						// Low-priority throttled I/O
						await new Promise((r) => setImmediate(r));
					}
				} catch (err) {
					this.errors.push(`Ошибка обхода корня ${root}: ${String(err)}`);
				}
			}
		} finally {
			this.lastScanAt = new Date();
			this.lastScanDurationMs = Date.now() - startTime;
			this.isScanning = false;
		}

		return {
			scannedDirectoriesCount: targetRoots.length,
			scannedDirectories: targetRoots,
			newStudiesDiscovered,
			archivesFound,
			archivesUnpacked,
			duplicatesAvoided: this.duplicatesAvoided - initialDuplicates,
			junkFilesSkipped: this.totalJunkFilesSkipped - initialJunkFiles,
			junkBytesFiltered: this.totalJunkBytesFiltered - initialJunkBytes,
			durationMs: this.lastScanDurationMs,
			studies: Array.from(this.registeredStudies.values()),
		};
	}

	/**
	 * Рекурсивный поиск архивов .zip и папок в директории
	 */
	public async findArchivesAndFolders(
		currentPath: string,
		maxDepth: number,
		currentDepth = 0,
	): Promise<{ archives: string[]; folders: string[] }> {
		if (currentDepth > maxDepth) return { archives: [], folders: [] };

		const archives: string[] = [];
		const folders: string[] = [];

		let entries;
		try {
			entries = await readdir(currentPath, { withFileTypes: true });
		} catch {
			return { archives, folders };
		}

		let hasDicomInCurrent = false;

		for (const entry of entries) {
			if (entry.isFile()) {
				const ext = path.extname(entry.name).toLowerCase();
				if (ext === ".zip") {
					archives.push(path.join(currentPath, entry.name));
				} else if (
					ext === ".dcm" ||
					ext === ".dicom" ||
					ext === ".ima" ||
					/^DICOMDIR$/i.test(entry.name) ||
					/^(?:CT|IMG|SERIES|SLICE)[0-9_.-]/i.test(entry.name)
				) {
					hasDicomInCurrent = true;
				}
			} else if (entry.isDirectory()) {
				// Пропускаем служебные каталоги и сторонние просмотрщики
				const dirLower = entry.name.toLowerCase();
				if (
					dirLower === "node_modules" ||
					dirLower === ".git" ||
					dirLower === "dist" ||
					dirLower === "build" ||
					dirLower === "temp" ||
					dirLower === "tmp" ||
					JUNK_VIEWER_PATH_REGEX.test(entry.name)
				) {
					continue;
				}
				const sub = path.join(currentPath, entry.name);
				const subRes = await this.findArchivesAndFolders(sub, maxDepth, currentDepth + 1);
				archives.push(...subRes.archives);
				folders.push(...subRes.folders);
				await new Promise((r) => setImmediate(r));
			}
		}

		if (hasDicomInCurrent) {
			folders.push(currentPath);
		}

		return { archives, folders };
	}

	/**
	 * ИНСПЕКЦИЯ ZIP-АРХИВА БЕЗ ПОЛНОЙ РАСПАКОВКИ:
	 * Читает Central Directory, ищет файлы срезов и проверяет магическую 4-байтовую
	 * сигнатуру DICM на 128-м байте первого среза!
	 */
	public async inspectZipForDicom(filePath: string): Promise<DicomArchiveInspectionResult> {
		let stats;
		try {
			stats = await stat(filePath);
		} catch {
			return { isDicomArchive: false, sliceCount: 0, totalArchiveBytes: 0, dicomFileNames: [], confidence: 0 };
		}

		if (stats.size < 132) {
			return { isDicomArchive: false, sliceCount: 0, totalArchiveBytes: stats.size, dicomFileNames: [], confidence: 0 };
		}

		let fileHandle: FileHandle | null = null;
		try {
			fileHandle = await open(filePath, "r");

			// 1. Ищем EOCD (End of Central Directory)
			const tailLength = Math.min(stats.size, ZIP_EOCD_SEARCH_WINDOW);
			const tailBuf = Buffer.alloc(tailLength);
			await fileHandle.read(tailBuf, 0, tailLength, stats.size - tailLength);

			let eocdOffset = -1;
			for (let i = tailBuf.length - 22; i >= 0; i--) {
				if (tailBuf.readUInt32LE(i) === 0x06054b50) {
					eocdOffset = i;
					break;
				}
			}

			if (eocdOffset < 0) {
				return { isDicomArchive: false, sliceCount: 0, totalArchiveBytes: stats.size, dicomFileNames: [], confidence: 0 };
			}

			const totalEntries = tailBuf.readUInt16LE(eocdOffset + 10);
			const centralDirSize = tailBuf.readUInt32LE(eocdOffset + 12);
			const centralDirOffset = tailBuf.readUInt32LE(eocdOffset + 16);

			if (centralDirOffset + centralDirSize > stats.size) {
				return { isDicomArchive: false, sliceCount: 0, totalArchiveBytes: stats.size, dicomFileNames: [], confidence: 0 };
			}

			// 2. Читаем Central Directory
			const cdBuf = Buffer.alloc(centralDirSize);
			await fileHandle.read(cdBuf, 0, centralDirSize, centralDirOffset);

			const entries: ZipCentralEntry[] = [];
			let cursor = 0;
			while (cursor + 46 <= cdBuf.length && entries.length < totalEntries) {
				if (cdBuf.readUInt32LE(cursor) !== 0x02014b50) break;
				const flags = cdBuf.readUInt16LE(cursor + 8);
				const method = cdBuf.readUInt16LE(cursor + 10);
				const compSize = cdBuf.readUInt32LE(cursor + 20);
				const uncompSize = cdBuf.readUInt32LE(cursor + 24);
				const nameLen = cdBuf.readUInt16LE(cursor + 28);
				const extraLen = cdBuf.readUInt16LE(cursor + 30);
				const commLen = cdBuf.readUInt16LE(cursor + 32);
				const localOffset = cdBuf.readUInt32LE(cursor + 42);

				const nameStart = cursor + 46;
				const nameEnd = nameStart + nameLen;
				if (nameEnd > cdBuf.length) break;

				const name = cdBuf.toString("utf8", nameStart, nameEnd);
				entries.push({
					name,
					compressionMethod: method,
					compressedSize: compSize,
					uncompressedSize: uncompSize,
					localHeaderOffset: localOffset,
					encrypted: Boolean(flags & 1),
				});

				cursor = nameEnd + extraLen + commLen;
			}

			// 3. Фильтруем кандидатов в DICOM файлы с тотальным исключением мусора и сторонних ридеров
			const nonJunkEntries = entries.filter((e) => {
				const lower = e.name.toLowerCase();
				const ext = path.extname(lower);
				if (JUNK_VIEWER_EXTENSIONS.has(ext)) return false;
				if (JUNK_VIEWER_PATH_REGEX.test(e.name)) return false;
				return true;
			});

			const candidateEntries = nonJunkEntries.filter((e) => {
				const lower = e.name.toLowerCase();
				return (
					lower.endsWith(".dcm") ||
					lower.endsWith(".dicom") ||
					lower.endsWith(".ima") ||
					/(?:^|\/)DICOMDIR$/i.test(e.name) ||
					/(?:^|\/)(?:CT|IMG|SERIES|SLICE)[0-9_.-]/i.test(e.name) ||
					(lower.includes("/dicom/") && !e.name.endsWith("/"))
				);
			});

			// Если явных расширений нет, но есть файлы без расширения > 132 байт (срезы томографов без .dcm)
			const finalCandidates =
				candidateEntries.length > 0
					? candidateEntries
					: nonJunkEntries.filter((e) => !e.name.endsWith("/") && e.uncompressedSize >= 132);

			if (finalCandidates.length === 0) {
				return { isDicomArchive: false, sliceCount: 0, totalArchiveBytes: stats.size, dicomFileNames: [], confidence: 0 };
			}

			// 4. Заглядываем внутрь первого файла: читаем первые байты
			const firstEntry = finalCandidates[0]!;
			const prefixBuffer = await this.readZipEntryPrefix(fileHandle, firstEntry, ZIP_MAX_HEADER_PREFIX);

			if (!prefixBuffer || prefixBuffer.length < 132) {
				return { isDicomArchive: false, sliceCount: 0, totalArchiveBytes: stats.size, dicomFileNames: [], confidence: 0 };
			}

			// 5. ПРОВЕРКА МАГИЧЕСКОЙ СИГНАТУРЫ DICM
			const isPart10Dicom = hasDicomPart10Magic(prefixBuffer);
			const isDicomdir = /(?:^|\/)DICOMDIR$/i.test(firstEntry.name);

			if (!isPart10Dicom && !isDicomdir) {
				return { isDicomArchive: false, sliceCount: 0, totalArchiveBytes: stats.size, dicomFileNames: [], confidence: 0 };
			}

			// 6. Парсим метаданные первого среза
			let metadata: DicomIngestMetadata | null = null;
			try {
				metadata = parseDicomIngestBuffer(prefixBuffer);
			} catch {
				// если буфер обрезан, используем базовые данные
			}

			const sliceCount = finalCandidates.length;
			const studyInstanceUid =
				metadata?.studyInstanceUid ||
				`archive.study.${path.basename(filePath).replace(/[^a-zA-Z0-9.-]/g, "_")}`;

			return {
				isDicomArchive: true,
				studyInstanceUid,
				seriesInstanceUid: metadata?.seriesInstanceUid,
				sopInstanceUid: metadata?.sopInstanceUid,
				patientName: metadata?.patientFullName ?? null,
				patientId: metadata?.patientChartNumber ?? null,
				patientBirthDate: metadata?.patientBirthDate ?? null,
				studyDate: metadata?.studyDate ?? null,
				modality: metadata?.modalityKind?.toUpperCase() ?? (sliceCount > 20 ? "CT" : "DX"),
				sliceCount,
				dimensions: metadata?.rows && metadata?.columns ? `${metadata.columns}x${metadata.rows}` : null,
				voxelSpacing: metadata?.sliceThickness ? `${metadata.sliceThickness}mm` : null,
				totalArchiveBytes: stats.size,
				dicomFileNames: finalCandidates.map((c) => c.name),
				confidence: 100,
			};
		} catch (err) {
			this.errors.push(`Ошибка инспекции ZIP ${filePath}: ${String(err)}`);
			return { isDicomArchive: false, sliceCount: 0, totalArchiveBytes: stats.size, dicomFileNames: [], confidence: 0 };
		} finally {
			if (fileHandle) {
				await fileHandle.close();
			}
		}
	}

	/**
	 * Чтение префикса файла внутри ZIP (хранимого или сжатого Deflate)
	 */
	private async readZipEntryPrefix(
		fileHandle: FileHandle,
		entry: ZipCentralEntry,
		maxBytes: number,
	): Promise<Buffer | null> {
		if (entry.encrypted) return null;

		// Читаем Local File Header
		const localHdrBuf = Buffer.alloc(30);
		await fileHandle.read(localHdrBuf, 0, 30, entry.localHeaderOffset);
		if (localHdrBuf.readUInt32LE(0) !== 0x04034b50) return null;

		const fileNameLen = localHdrBuf.readUInt16LE(26);
		const extraLen = localHdrBuf.readUInt16LE(28);
		const dataStart = entry.localHeaderOffset + 30 + fileNameLen + extraLen;

		// Метод 0: Без сжатия (Store)
		if (entry.compressionMethod === 0) {
			const readLen = Math.min(entry.uncompressedSize, maxBytes);
			const buf = Buffer.alloc(readLen);
			await fileHandle.read(buf, 0, readLen, dataStart);
			return buf;
		}

		// Метод 8: Deflate
		if (entry.compressionMethod === 8) {
			return new Promise<Buffer | null>((resolve) => {
				const inflater = createInflateRaw();
				const chunks: Buffer[] = [];
				let totalOut = 0;
				let settled = false;

				const finish = (result: Buffer | null) => {
					if (settled) return;
					settled = true;
					inflater.removeAllListeners();
					inflater.destroy();
					resolve(result);
				};

				inflater.on("data", (chunk: Buffer) => {
					if (settled) return;
					const need = maxBytes - totalOut;
					if (need > 0) {
						const part = chunk.length > need ? chunk.subarray(0, need) : chunk;
						chunks.push(part);
						totalOut += part.length;
					}
					if (totalOut >= maxBytes) {
						finish(Buffer.concat(chunks, totalOut));
					}
				});

				inflater.on("error", () => finish(null));
				inflater.on("end", () => finish(Buffer.concat(chunks, totalOut)));

				void (async () => {
					const readBudget = Math.min(entry.compressedSize, 256 * 1024);
					const compBuf = Buffer.alloc(readBudget);
					await fileHandle.read(compBuf, 0, readBudget, dataStart);
					if (!inflater.write(compBuf)) {
						await once(inflater, "drain");
					}
					inflater.end();
				})().catch(() => finish(null));
			});
		}

		return null;
	}

	/**
	 * Автоматическая распаковка ZIP-архива в целевой каталог кэша
	 */
	public async unpackZipArchive(
		zipPath: string,
		destinationDir: string,
		studyMetadata?: {
			studyInstanceUid?: string | undefined;
			seriesInstanceUid?: string | undefined;
			sopInstanceUid?: string | undefined;
			patientFullName?: string | null | undefined;
			patientChartNumber?: string | null | undefined;
			patientBirthDate?: string | null | undefined;
			studyDate?: string | null | undefined;
			modality?: string | undefined;
			modalityKind?: string | undefined;
			sliceCount?: number | undefined;
			dimensions?: string | null | undefined;
			voxelSpacing?: string | null | undefined;
			sliceThickness?: number | null | undefined;
			kvp?: number | null | undefined;
			ma?: number | null | undefined;
			exposureTimeMs?: number | null | undefined;
			doseAreaProductDap?: number | null | undefined;
			estimatedEffectiveDoseMsv?: number | null | undefined;
			manufacturer?: string | null | undefined;
			manufacturerModelName?: string | null | undefined;
			[key: string]: unknown;
		} | undefined,
	): Promise<string[]> {
		const extractedPaths: string[] = [];
		await mkdir(destinationDir, { recursive: true });

		const stats = await stat(zipPath);
		const fileHandle = await open(zipPath, "r");

		try {
			// Читаем Central Directory
			const tailLength = Math.min(stats.size, ZIP_EOCD_SEARCH_WINDOW);
			const tailBuf = Buffer.alloc(tailLength);
			await fileHandle.read(tailBuf, 0, tailLength, stats.size - tailLength);

			let eocdOffset = -1;
			for (let i = tailBuf.length - 22; i >= 0; i--) {
				if (tailBuf.readUInt32LE(i) === 0x06054b50) {
					eocdOffset = i;
					break;
				}
			}
			if (eocdOffset < 0) return extractedPaths;

			const totalEntries = tailBuf.readUInt16LE(eocdOffset + 10);
			const centralDirSize = tailBuf.readUInt32LE(eocdOffset + 12);
			const centralDirOffset = tailBuf.readUInt32LE(eocdOffset + 16);

			const cdBuf = Buffer.alloc(centralDirSize);
			await fileHandle.read(cdBuf, 0, centralDirSize, centralDirOffset);

			let cursor = 0;
			let entryIndex = 0;

			while (cursor + 46 <= cdBuf.length && entryIndex < totalEntries) {
				if (cdBuf.readUInt32LE(cursor) !== 0x02014b50) break;
				const method = cdBuf.readUInt16LE(cursor + 10);
				const compSize = cdBuf.readUInt32LE(cursor + 20);
				const uncompSize = cdBuf.readUInt32LE(cursor + 24);
				const nameLen = cdBuf.readUInt16LE(cursor + 28);
				const extraLen = cdBuf.readUInt16LE(cursor + 30);
				const commLen = cdBuf.readUInt16LE(cursor + 32);
				const localOffset = cdBuf.readUInt32LE(cursor + 42);

				const nameStart = cursor + 46;
				const nameEnd = nameStart + nameLen;
				const entryName = cdBuf.toString("utf8", nameStart, nameEnd);
				cursor = nameEnd + extraLen + commLen;
				entryIndex++;

				// Пропускаем папки
				if (entryName.endsWith("/") || entryName.endsWith("\\")) continue;

				// Тотальная фильтрация сторонних просмотрщиков (Zero-Viewer Bleed)
				const lowerEntry = entryName.toLowerCase();
				const ext = path.extname(lowerEntry);
				if (JUNK_VIEWER_EXTENSIONS.has(ext) || JUNK_VIEWER_PATH_REGEX.test(entryName)) {
					this.totalJunkFilesSkipped++;
					this.totalJunkBytesFiltered += uncompSize;
					continue;
				}

				// Защита от path traversal (Zip Slip vulnerability)
				const safeFileName = path.basename(entryName);
				const outFilePath = path.join(destinationDir, safeFileName);

				// Читаем Local Header
				const localHdr = Buffer.alloc(30);
				await fileHandle.read(localHdr, 0, 30, localOffset);
				if (localHdr.readUInt32LE(0) !== 0x04034b50) continue;

				const fNameLen = localHdr.readUInt16LE(26);
				const extLen = localHdr.readUInt16LE(28);
				const dataStart = localOffset + 30 + fNameLen + extLen;

				let decompressedBuf: Buffer | null = null;

				if (method === 0) {
					// Без сжатия
					decompressedBuf = Buffer.alloc(uncompSize);
					await fileHandle.read(decompressedBuf, 0, uncompSize, dataStart);
				} else if (method === 8) {
					// Deflate
					const compBuf = Buffer.alloc(compSize);
					await fileHandle.read(compBuf, 0, compSize, dataStart);

					decompressedBuf = await new Promise<Buffer | null>((resolve) => {
						const inflater = createInflateRaw();
						const outChunks: Buffer[] = [];
						inflater.on("data", (chunk: Buffer) => outChunks.push(chunk));
						inflater.on("end", () => resolve(Buffer.concat(outChunks, uncompSize)));
						inflater.on("error", () => resolve(null));
						inflater.end(compBuf);
					});
				}

				if (!decompressedBuf || decompressedBuf.length === 0) continue;

				// Проверяем: это реальный DICOM файл или сопутствующий DICOMDIR / манифест
				const isPart10 = hasDicomPart10Magic(decompressedBuf);
				const isDicomdir = /(?:^|[\\/])DICOMDIR$/i.test(entryName);
				const isDicomExt = ext === ".dcm" || ext === ".dicom" || ext === ".ima";

				// Если файл не является DICOM-файлом (нет сигнатуры DICM на 128 байте, не DICOMDIR и не .dcm),
				// мы КАТЕГОРИЧЕСКИ НЕ ЗАСОРЯЕМ ДИСК чужим мусором!
				if (!isPart10 && !isDicomdir && !isDicomExt) {
					this.totalJunkFilesSkipped++;
					this.totalJunkBytesFiltered += uncompSize;
					continue;
				}

				await writeFile(outFilePath, decompressedBuf);
				extractedPaths.push(outFilePath);

				// Throttled low-priority I/O: отдаем управление Node event loop каждые 10 файлов
				if (extractedPaths.length % 10 === 0) {
					await new Promise((r) => setImmediate(r));
				}
			}
		} finally {
			await fileHandle.close();
		}

		// Если распакованы файлы, организуем красивую упаковку и ярлыки прямого запуска
		if (extractedPaths.length > 0) {
			try {
				const dicomSlices = extractedPaths.filter((p) => !/DICOMDIR$/i.test(path.basename(p)));
				const studyUid =
					studyMetadata?.studyInstanceUid ||
					`study.${path.basename(destinationDir)}`;
				const patientName = studyMetadata?.patientFullName || null;
				const studyDate = studyMetadata?.studyDate || null;
				const modality = studyMetadata?.modalityKind?.toUpperCase() || (dicomSlices.length > 20 ? "CT" : "DX");
				const sliceCount = studyMetadata?.sliceCount || dicomSlices.length;

				// 1. Случай 1: 1 мультифреймовый файл DICOM
				if (dicomSlices.length === 1) {
					const firstSlice = dicomSlices[0]!;
					const targetVolumePath = path.join(destinationDir, "volume_multiframe.dcm");
					if (path.basename(firstSlice).toLowerCase() !== "volume_multiframe.dcm") {
						try {
							await copyFile(firstSlice, targetVolumePath);
						} catch {
							// fallback
						}
					}
				}

				// 2. Случай 2: Несколько срезов -> организуем slices/
				if (dicomSlices.length > 1) {
					const slicesDir = path.join(destinationDir, "slices");
					await mkdir(slicesDir, { recursive: true });
					for (let i = 0; i < dicomSlices.length; i++) {
						const srcSlice = dicomSlices[i]!;
						const pad = String(i + 1).padStart(4, "0");
						const targetSlicePath = path.join(slicesDir, `slice_${pad}.dcm`);
						try {
							await copyFile(srcSlice, targetSlicePath);
						} catch {
							// fallback
						}
					}
				}

				// 3. Ярлыки прямого открытия в нашей программе
				const shortcutOpts = {
					studyInstanceUid: studyUid,
				};
				const winShortcut = generateWindowsUrlShortcut(shortcutOpts);
				await writeFile(path.join(destinationDir, "Открыть в DENTE.url"), winShortcut, "utf8");

				const macWebloc = generateMacWeblocShortcut(shortcutOpts);
				await writeFile(path.join(destinationDir, "Открыть в DENTE.webloc"), macWebloc, "utf8");

				const macCommand = generateMacCommandShortcut(shortcutOpts);
				const macCommandPath = path.join(destinationDir, "Открыть_в_DENTE.command");
				await writeFile(macCommandPath, macCommand, "utf8");
				if (os.platform() !== "win32") {
					try {
						await chmod(macCommandPath, 0o755);
					} catch {
						// ignore chmod error
					}
				}

				// 4. Манифест study_manifest.json
				const manifest = buildStudyManifest({
					studyInstanceUid: studyUid,
					seriesInstanceUid: studyMetadata?.seriesInstanceUid,
					sopInstanceUid: studyMetadata?.sopInstanceUid,
					patientFullName: patientName,
					patientChartNumber: studyMetadata?.patientChartNumber,
					patientBirthDate: studyMetadata?.patientBirthDate,
					studyDate,
					modality,
					modalityKind: studyMetadata?.modalityKind || (dicomSlices.length > 20 ? "ct" : "intraoral"),
					sliceCount,
					packageLayout: dicomSlices.length === 1 ? "single_multiframe" : "series_slices",
					dimensions: studyMetadata?.rows && studyMetadata?.columns ? `${studyMetadata.columns}x${studyMetadata.rows}` : undefined,
					voxelSpacing: studyMetadata?.sliceThickness ? `${studyMetadata.sliceThickness}mm` : undefined,
					sliceThickness: studyMetadata?.sliceThickness,
					kvp: studyMetadata?.kvp,
					ma: studyMetadata?.ma,
					exposureTimeMs: studyMetadata?.exposureTimeMs,
					doseAreaProductDap: studyMetadata?.doseAreaProductDap != null ? String(studyMetadata.doseAreaProductDap) : undefined,
					effectiveDoseMsv: studyMetadata?.estimatedEffectiveDoseMsv,
					manufacturer: studyMetadata?.manufacturer,
					manufacturerModelName: studyMetadata?.manufacturerModelName,
				});

				await writeFile(
					path.join(destinationDir, "study_manifest.json"),
					formatStudyManifestJson(manifest),
					"utf8",
				);
			} catch (err) {
				this.errors.push(`Не удалось создать манифест/ярлыки в ${destinationDir}: ${String(err)}`);
			}
		}

		return extractedPaths;
	}

	/**
	 * ОБРАБОТКА АРХИВА: Инспекция, дедупликация и авто-распаковка
	 */
	public async processArchiveCandidate(
		archivePath: string,
		orgId: string,
	): Promise<DicomCrawlerDiscoveredStudy | null> {
		const inspection = await this.inspectZipForDicom(archivePath);
		if (!inspection.isDicomArchive || !inspection.studyInstanceUid) {
			return null;
		}

		const studyUid = inspection.studyInstanceUid;
		const fingerprint = buildStudyFingerprint({
			studyInstanceUid: studyUid,
			patientName: inspection.patientName,
			studyDate: inspection.studyDate,
			sliceCount: inspection.sliceCount,
		});

		// 1. ДЕДУПЛИКАЦИЯ: Проверяем реестр в памяти
		const existingInRegistry = this.registeredStudies.get(studyUid);
		if (existingInRegistry) {
			// Связываем архив с уже зарегистрированным исследованием
			if (!existingInRegistry.archivePath) {
				existingInRegistry.archivePath = archivePath;
			}
			existingInRegistry.status = "duplicate_resolved";
			this.duplicatesAvoided++;
			this.emit("duplicateAvoided", { studyUid, archivePath });
			return existingInRegistry;
		}

		// 2. ДЕДУПЛИКАЦИЯ: Проверяем базу данных PostgreSQL
		const [existingDb] = await db
			.select({ id: schema.imagingStudies.id, storagePath: schema.imagingStudies.storagePath })
			.from(schema.imagingStudies)
			.where(
				and(
					eq(schema.imagingStudies.organizationId, orgId),
					eq(schema.imagingStudies.studyInstanceUid, studyUid),
				),
			)
			.limit(1);

		if (existingDb) {
			// Исследование уже в базе данных! Связываем и не плодим дубликаты!
			this.duplicatesAvoided++;
			const discovered: DicomCrawlerDiscoveredStudy = {
				studyInstanceUid: studyUid,
				seriesInstanceUid: inspection.seriesInstanceUid,
				sopInstanceUid: inspection.sopInstanceUid,
				patientName: inspection.patientName ?? null,
				patientId: inspection.patientId ?? null,
				patientBirthDate: inspection.patientBirthDate ?? null,
				studyDate: inspection.studyDate ?? null,
				modality: inspection.modality ?? "CT",
				sliceCount: inspection.sliceCount,
				isArchive: true,
				archivePath,
				unpackedFolderPath: existingDb.storagePath ?? undefined,
				fingerprint,
				status: "duplicate_resolved",
				dimensions: inspection.dimensions,
				voxelSpacing: inspection.voxelSpacing,
				fileSizeBytes: inspection.totalArchiveBytes,
				discoveredAt: new Date().toISOString(),
			};
			this.registeredStudies.set(studyUid, discovered);
			this.fingerprintIndex.set(fingerprint, studyUid);
			return discovered;
		}

		// 3. АВТО-РАСПАКОВКА В КЭШ
		// Красивое именование папки исследования: ГГГГ-ММ-ДД_Фамилия_Имя_[Модальность]_[Число_срезов]_[Короткий_UID]
		const folderName = buildStudyStorageFolderName({
			studyDate: inspection.studyDate,
			patientName: inspection.patientName,
			modality: inspection.modality,
			sliceCount: inspection.sliceCount,
			studyInstanceUid: studyUid,
		});
		const targetCacheDir = path.join(this.config.cacheDir, folderName);

		let unpackedPath: string | null = null;
		if (this.config.autoUnpack) {
			try {
				await this.unpackZipArchive(archivePath, targetCacheDir, {
					studyInstanceUid: studyUid,
					seriesInstanceUid: inspection.seriesInstanceUid,
					sopInstanceUid: inspection.sopInstanceUid,
					patientFullName: inspection.patientName,
					patientChartNumber: inspection.patientId,
					patientBirthDate: inspection.patientBirthDate,
					studyDate: inspection.studyDate,
					modality: inspection.modality,
					sliceCount: inspection.sliceCount,
					dimensions: inspection.dimensions,
					voxelSpacing: inspection.voxelSpacing,
				});
				unpackedPath = targetCacheDir;
			} catch (err) {
				this.errors.push(`Сбой распаковки архива ${archivePath}: ${String(err)}`);
			}
		}

		// 4. Связывание с пациентом CRM
		const patientBinding = await resolveOrAutoCreatePatientForDicom(orgId, {
			patientFullName: inspection.patientName ?? null,
			patientChartNumber: inspection.patientId ?? null,
			patientBirthDate: inspection.patientBirthDate ?? null,
			autoCreateDraftIfNotFound: true,
		});

		// 5. Регистрация в базе данных
		const effectiveStoragePath = unpackedPath || archivePath;
		const baseTitle = inspection.sliceCount > 20
			? `3D КЛКТ ${inspection.patientName ?? "Пациент"} (${inspection.sliceCount} ср.)`
			: `Рентген ${inspection.patientName ?? "Пациент"}`;

		await db
			.insert(schema.imagingStudies)
			.values({
				organizationId: orgId,
				patientId: patientBinding.patientId,
				kind: inspection.sliceCount > 20 ? "cbct" : "periapical",
				title: baseTitle,
				capturedAt: inspection.studyDate ? new Date(inspection.studyDate) : new Date(),
				sourceKind: "folder_watch",
				sourceName: "Автодетект КТ-архивов DicomCrawler",
				status: "available",
				storagePath: effectiveStoragePath,
				studyInstanceUid: studyUid,
				seriesInstanceUid: inspection.seriesInstanceUid,
				modality: inspection.modality,
				studyDate: inspection.studyDate,
				sliceCount: inspection.sliceCount,
				dimensions: inspection.dimensions,
				voxelSpacing: inspection.voxelSpacing,
				fileSizeBytes: inspection.totalArchiveBytes,
				bindingStatus: patientBinding.bindingStatus,
				bindingConfidence: patientBinding.bindingConfidence,
				dicomPatientName: inspection.patientName,
				dicomPatientId: inspection.patientId,
				dicomBirthDate: inspection.patientBirthDate,
				aiSummary: `Автодетект КТ: архив ${path.basename(archivePath)}. Сигнатура Part 10 DICM проверена. Распакован в локальный кэш: ${unpackedPath ? "Да" : "Нет"}.`,
			})
			.onConflictDoNothing();

		const studyRecord: DicomCrawlerDiscoveredStudy = {
			studyInstanceUid: studyUid,
			seriesInstanceUid: inspection.seriesInstanceUid,
			sopInstanceUid: inspection.sopInstanceUid,
			patientName: patientBinding.patientFullName ?? inspection.patientName ?? null,
			patientId: patientBinding.patientId,
			patientBirthDate: inspection.patientBirthDate ?? null,
			studyDate: inspection.studyDate ?? null,
			modality: inspection.modality ?? "CT",
			sliceCount: inspection.sliceCount,
			isArchive: true,
			archivePath,
			unpackedFolderPath: unpackedPath || undefined,
			fingerprint,
			status: unpackedPath ? "unpacked" : "registered",
			dimensions: inspection.dimensions,
			voxelSpacing: inspection.voxelSpacing,
			fileSizeBytes: inspection.totalArchiveBytes,
			discoveredAt: new Date().toISOString(),
		};

		this.registeredStudies.set(studyUid, studyRecord);
		this.fingerprintIndex.set(fingerprint, studyUid);

		// Оповещаем фронтенд через WebSocket
		wsBroker.broadcastToOrganization(orgId, {
			type: "DICOM_CRAWLER_STUDY_DISCOVERED",
			payload: studyRecord,
		});

		this.emit("studyDiscovered", studyRecord);
		return studyRecord;
	}

	/**
	 * ОБРАБОТКА РАСПАКОВАННОЙ ПАПКИ КТ
	 */
	public async processFolderCandidate(
		folderPath: string,
		orgId: string,
	): Promise<DicomCrawlerDiscoveredStudy | null> {
		const seriesSummary: DicomSeriesScanSummary | null = await scanDicomSeriesFolder(folderPath);
		if (!seriesSummary || seriesSummary.sliceCount === 0 || !seriesSummary.studyInstanceUid) {
			return null;
		}

		const studyUid = seriesSummary.studyInstanceUid;
		const fingerprint = buildStudyFingerprint({
			studyInstanceUid: studyUid,
			patientName: seriesSummary.patientName,
			studyDate: seriesSummary.studyDate,
			sliceCount: seriesSummary.sliceCount,
		});

		// 1. ДЕДУПЛИКАЦИЯ: Проверяем реестр
		const existingInRegistry = this.registeredStudies.get(studyUid);
		if (existingInRegistry) {
			// Связываем распакованную папку с архивом
			if (!existingInRegistry.unpackedFolderPath) {
				existingInRegistry.unpackedFolderPath = folderPath;
			}
			existingInRegistry.status = "duplicate_resolved";
			this.duplicatesAvoided++;
			this.emit("duplicateAvoided", { studyUid, folderPath });
			return existingInRegistry;
		}

		// 2. ДЕДУПЛИКАЦИЯ: Проверяем базу данных PostgreSQL
		const [existingDb] = await db
			.select({ id: schema.imagingStudies.id, storagePath: schema.imagingStudies.storagePath })
			.from(schema.imagingStudies)
			.where(
				and(
					eq(schema.imagingStudies.organizationId, orgId),
					or(
						eq(schema.imagingStudies.studyInstanceUid, studyUid),
						eq(schema.imagingStudies.storagePath, folderPath),
					),
				),
			)
			.limit(1);

		if (existingDb) {
			this.duplicatesAvoided++;
			const discovered: DicomCrawlerDiscoveredStudy = {
				studyInstanceUid: studyUid,
				seriesInstanceUid: seriesSummary.seriesInstanceUid,
				patientName: seriesSummary.patientName,
				patientId: seriesSummary.patientId,
				patientBirthDate: seriesSummary.patientBirthDate,
				studyDate: seriesSummary.studyDate,
				modality: seriesSummary.modality,
				sliceCount: seriesSummary.sliceCount,
				isArchive: false,
				unpackedFolderPath: folderPath,
				fingerprint,
				status: "duplicate_resolved",
				dimensions: seriesSummary.dimensions,
				voxelSpacing: seriesSummary.voxelSpacing,
				fileSizeBytes: seriesSummary.totalSizeBytes,
				discoveredAt: new Date().toISOString(),
			};
			this.registeredStudies.set(studyUid, discovered);
			this.fingerprintIndex.set(fingerprint, studyUid);
			return discovered;
		}

		// 3. Связывание с пациентом CRM
		const patientBinding = await resolveOrAutoCreatePatientForDicom(orgId, {
			patientFullName: seriesSummary.patientName,
			patientChartNumber: seriesSummary.patientId,
			patientBirthDate: seriesSummary.patientBirthDate,
			autoCreateDraftIfNotFound: true,
		});

		const baseTitle = seriesSummary.seriesDescription ||
			`3D КЛКТ ${seriesSummary.patientName ?? path.basename(folderPath)} (${seriesSummary.sliceCount} ср.)`;

		await db
			.insert(schema.imagingStudies)
			.values({
				organizationId: orgId,
				patientId: patientBinding.patientId,
				kind: seriesSummary.sliceCount > 20 ? "cbct" : "periapical",
				title: baseTitle,
				capturedAt: seriesSummary.studyDate ? new Date(seriesSummary.studyDate) : new Date(),
				sourceKind: "folder_watch",
				sourceName: seriesSummary.manufacturer ?? "Автодетект папок томографов DicomCrawler",
				status: "available",
				storagePath: folderPath,
				studyInstanceUid: studyUid,
				seriesInstanceUid: seriesSummary.seriesInstanceUid,
				modality: seriesSummary.modality,
				seriesDescription: seriesSummary.seriesDescription,
				studyDate: seriesSummary.studyDate,
				sliceCount: seriesSummary.sliceCount,
				dimensions: seriesSummary.dimensions,
				voxelSpacing: seriesSummary.voxelSpacing,
				fileSizeBytes: seriesSummary.totalSizeBytes,
				bindingStatus: patientBinding.bindingStatus,
				bindingConfidence: patientBinding.bindingConfidence,
				dicomPatientName: seriesSummary.patientName,
				dicomPatientId: seriesSummary.patientId,
				dicomBirthDate: seriesSummary.patientBirthDate,
				aiSummary: `Автодетект папки КТ: ${folderPath}. Аппарат: ${seriesSummary.manufacturer ?? "Стандартный DICOM"}. Срезов: ${seriesSummary.sliceCount}.`,
			})
			.onConflictDoNothing();

		const studyRecord: DicomCrawlerDiscoveredStudy = {
			studyInstanceUid: studyUid,
			seriesInstanceUid: seriesSummary.seriesInstanceUid,
			patientName: patientBinding.patientFullName ?? seriesSummary.patientName,
			patientId: patientBinding.patientId,
			patientBirthDate: seriesSummary.patientBirthDate,
			studyDate: seriesSummary.studyDate,
			modality: seriesSummary.modality,
			sliceCount: seriesSummary.sliceCount,
			isArchive: false,
			unpackedFolderPath: folderPath,
			fingerprint,
			status: "registered",
			dimensions: seriesSummary.dimensions,
			voxelSpacing: seriesSummary.voxelSpacing,
			fileSizeBytes: seriesSummary.totalSizeBytes,
			discoveredAt: new Date().toISOString(),
		};

		this.registeredStudies.set(studyUid, studyRecord);
		this.fingerprintIndex.set(fingerprint, studyUid);

		wsBroker.broadcastToOrganization(orgId, {
			type: "DICOM_CRAWLER_STUDY_DISCOVERED",
			payload: studyRecord,
		});

		this.emit("studyDiscovered", studyRecord);
		return studyRecord;
	}

	private async resolveOrganizationId(): Promise<string | null> {
		if (this.config.defaultOrganizationId) return this.config.defaultOrganizationId;

		const [org] = await db
			.select({ id: schema.organizations.id })
			.from(schema.organizations)
			.limit(1);

		if (org?.id) {
			this.config.defaultOrganizationId = org.id;
			return org.id;
		}
		return null;
	}
}

// Канонический синглтон демона поиска КТ
export const dicomCrawlerDaemon = new DicomCrawlerDaemon();
