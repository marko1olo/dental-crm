/**
 * crawlerDaemon.ts — Layer 4: Координатор фонового демона мониторинга DICOM (DicomCrawlerDaemon).
 * Интегрирует наблюдателей директорий, инспектор архивов и конвейер импорта КТ.
 */

import { existsSync, watch, type FSWatcher } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { EventEmitter } from "node:events";
import type { FileHandle } from "node:fs/promises";
import { db } from "../../../db/client.js";
import * as schema from "../../../db/schema.js";
import { dicomStoragePackagingService } from "../DicomStoragePackagingService.js";
import {
	DEBOUNCE_FILE_STABILIZE_MS,
	type DicomCrawlerDiscoveredStudy,
	type DicomArchiveInspectionResult,
	type DicomCrawlerDaemonConfig,
	type DicomCrawlerDaemonStatus,
	type DicomCrawlerScanReport,
	type ZipCentralEntry,
	type StudyUnpackMetadata,
	type CrawlerPipelineContext,
} from "./types.js";
import {
	inspectZipForDicom as inspectZip,
	readZipEntryPrefix as readPrefix,
	unpackZipArchive as unpackZip,
} from "./archiveInspector.js";
import {
	getMacWatchPaths as getMacPaths,
	getWindowsWatchPaths as getWinPaths,
	getDefaultWatchPaths as getDefaultPaths,
	getDefaultHotFolders as getDefaultHot,
	findArchivesAndFolders as findFolders,
} from "./directoryWatcher.js";
import {
	processArchiveCandidate as processArchive,
	processFolderCandidate as processFolder,
} from "./ingestPipeline.js";

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

	public getMacWatchPaths(homedir?: string): string[] {
		return getMacPaths(homedir);
	}

	public getWindowsWatchPaths(homedir?: string): string[] {
		return getWinPaths(homedir);
	}

	public getDefaultWatchPaths(platformOverride?: string, homedirOverride?: string): string[] {
		return getDefaultPaths(platformOverride, homedirOverride);
	}

	public getDefaultHotFolders(platformOverride?: string, homedirOverride?: string): string[] {
		return getDefaultHot(platformOverride, homedirOverride);
	}

	public start(): void {
		if (this.intervalTimer) return;
		this.config.enabled = true;

		try {
			if (!existsSync(this.config.cacheDir)) {
				void mkdir(this.config.cacheDir, { recursive: true });
			}
		} catch {
			// игнорируем ошибку первичного создания
		}

		void this.scanNow();

		const intervalMs = Math.max(60000, this.config.pollIntervalMinutes * 60 * 1000);
		this.intervalTimer = setInterval(() => {
			void this.scanNow();
		}, intervalMs);
		this.intervalTimer.unref();

		this.setupHotFolderWatchers();
		this.emit("started");
	}

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

	private handleHotFileEvent(targetPath: string): void {
		setTimeout(async () => {
			try {
				if (!existsSync(targetPath)) return;
				const st = await stat(targetPath);
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

			for (const root of targetRoots) {
				if (!existsSync(root)) continue;

				try {
					const { archives, folders } = await this.findArchivesAndFolders(root, 3);

					for (const folder of folders) {
						const res = await this.processFolderCandidate(folder, orgId);
						if (res && res.status !== "duplicate_resolved") {
							newStudiesDiscovered++;
						}
						await new Promise((r) => setImmediate(r));
					}

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

	public async findArchivesAndFolders(
		currentPath: string,
		maxDepth: number,
		currentDepth = 0,
	): Promise<{ archives: string[]; folders: string[] }> {
		return findFolders(currentPath, maxDepth, currentDepth);
	}

	public async inspectZipForDicom(filePath: string): Promise<DicomArchiveInspectionResult> {
		return inspectZip(filePath, this.errors);
	}

	public async readZipEntryPrefix(
		fileHandle: FileHandle,
		entry: ZipCentralEntry,
		maxBytes: number,
	): Promise<Buffer | null> {
		return readPrefix(fileHandle, entry, maxBytes);
	}

	public async unpackZipArchive(
		zipPath: string,
		destinationDir: string,
		studyMetadata?: StudyUnpackMetadata,
	): Promise<string[]> {
		return unpackZip(
			zipPath,
			destinationDir,
			studyMetadata,
			{
				onJunkSkipped: (bytes: number) => {
					this.totalJunkFilesSkipped++;
					this.totalJunkBytesFiltered += bytes;
				},
			},
			this.errors,
		);
	}

	public async processArchiveCandidate(
		archivePath: string,
		orgId: string,
	): Promise<DicomCrawlerDiscoveredStudy | null> {
		return processArchive(archivePath, orgId, this.createPipelineContext());
	}

	public async processFolderCandidate(
		folderPath: string,
		orgId: string,
	): Promise<DicomCrawlerDiscoveredStudy | null> {
		return processFolder(folderPath, orgId, this.createPipelineContext());
	}

	private createPipelineContext(): CrawlerPipelineContext {
		return {
			config: this.config,
			registeredStudies: this.registeredStudies,
			fingerprintIndex: this.fingerprintIndex,
			errors: this.errors,
			incrementDuplicatesAvoided: () => {
				this.duplicatesAvoided++;
			},
			incrementJunkSkipped: (bytes: number) => {
				this.totalJunkFilesSkipped++;
				this.totalJunkBytesFiltered += bytes;
			},
			emitEvent: (event: string, ...args: unknown[]) => {
				this.emit(event, ...args);
			},
		};
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
