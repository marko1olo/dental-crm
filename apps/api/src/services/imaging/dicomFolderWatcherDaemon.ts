/**
 * dicomFolderWatcherDaemon.ts — Фоновый демон автодетекта томографов (DICOM Folder Watcher Daemon).
 *
 * ФУНКЦИОНАЛ:
 * 1. Автоматический мониторинг сетевых и локальных папок экспорта томографов:
 *    - Vatech EzDent-i: D:\CT_Export\, C:\Ez3D-i\Export\
 *    - Planmeca Romexis: C:\Romexis\Studies\
 *    - Dentsply Sirona Sidexis: C:\Sidexis\Export\
 *    - Сетевые папки: \\TOMO-SERVER\Export
 * 2. Debouncing записи томографа: ожидание полной выгрузки всех срезов перед фиксацией.
 * 3. Извлечение метаданных серий КТ (dicomMetadataParser).
 * 4. Стохастический матчинг с пациентами CRM (dicomPatientMatcher):
 *    - > 85%: автопривязка (auto_bound) к пациенту и ЭМК 043/у
 *    - 60–85%: предложение 1-клик подтверждения в CRM (pending_review)
 *    - < 60%: нераспознанные КТ (unassigned)
 * 5. Контроль состояния, ручной запуск, обновление путей на лету.
 */

import { existsSync, statSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { EventEmitter } from "node:events";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { and, eq, inArray, isNull, or, desc } from "drizzle-orm";
import { scanDicomSeriesFolder, type DicomSeriesScanSummary } from "./dicomMetadataParser.js";
import { matchStudyToPatients, type PatientCandidateItem } from "./dicomPatientMatcher.js";

export interface DicomWatcherConfig {
	enabled: boolean;
	watchPaths: string[];
	pollIntervalMs: number; // дефолт: 30000 (30 сек)
	debounceDelayMs: number; // дефолт: 4000 (4 сек ожидания стабилизации размера)
	defaultOrganizationId?: string | null | undefined;
}

export type DicomWatcherConfigUpdate = {
	enabled?: boolean | undefined;
	watchPaths?: string[] | undefined;
	pollIntervalMs?: number | undefined;
	debounceDelayMs?: number | undefined;
	defaultOrganizationId?: string | null | undefined;
};

export interface DicomDaemonStatus {
	isRunning: boolean;
	enabled: boolean;
	watchPaths: string[];
	activeRoots: string[];
	lastScanAt: string | null;
	lastScanDurationMs: number;
	totalDiscoveredFolders: number;
	autoBoundCount: number;
	pendingReviewCount: number;
	unassignedCount: number;
	recentStudies: Array<{
		id: string;
		folderPath: string;
		title: string;
		patientName: string | null;
		status: string;
		confidence: number;
		detectedAt: string;
	}>;
	errors: string[];
}

export interface DiscoveredStudyEvent {
	studyId: string;
	folderPath: string;
	patientId: string | null;
	patientFullName: string | null;
	confidence: number;
	status: "auto_bound" | "pending_review" | "unassigned";
	sliceCount: number;
}

export class DicomFolderWatcherDaemon extends EventEmitter {
	private config: DicomWatcherConfig;
	private timer: NodeJS.Timeout | null = null;
	private isScanning = false;
	private lastScanAt: Date | null = null;
	private lastScanDurationMs = 0;
	private errors: string[] = [];

	// Кеш проверенных папок: folderPath -> { mtimeMs: number, studyId: string }
	private processedCache = new Map<string, { mtimeMs: number; studyId: string }>();

	// Статистика
	private autoBoundCount = 0;
	private pendingReviewCount = 0;
	private unassignedCount = 0;
	private recentStudies: DicomDaemonStatus["recentStudies"] = [];

	constructor(initialConfig?: DicomWatcherConfigUpdate) {
		super();
		this.config = {
			enabled: initialConfig?.enabled ?? true,
			watchPaths: initialConfig?.watchPaths ?? this.getDefaultWatchPaths(),
			pollIntervalMs: initialConfig?.pollIntervalMs ?? 30000,
			debounceDelayMs: initialConfig?.debounceDelayMs ?? 4000,
			defaultOrganizationId: initialConfig?.defaultOrganizationId ?? null,
		};
	}

	/**
	 * Стандартные пути поиска томографов в российских стоматологиях
	 */
	public getDefaultWatchPaths(): string[] {
		const envPaths = process.env.DENTAL_DICOM_WATCH_PATHS
			? process.env.DENTAL_DICOM_WATCH_PATHS.split(/[;|]/).map((p) => p.trim()).filter(Boolean)
			: [];

		const home = os.homedir();
		const candidates = [
			...envPaths,
			"D:\\CT_Export",
			"D:\\Export",
			"C:\\CT_Export",
			"C:\\Ez3D-i\\Export",
			"C:\\EzDent-i\\Export",
			"C:\\Romexis\\Studies",
			"C:\\Romexis\\Export",
			"C:\\Sidexis\\Export",
			"C:\\KaVo\\Export",
			"C:\\Morita\\Export",
			path.join(home, "Downloads"),
			path.join(home, "Desktop"),
			path.join(home, "Documents"),
		];

		// Оставляем только уникальные физически доступные пути
		const valid = candidates.filter((p) => {
			try {
				return existsSync(p) && statSync(p).isDirectory();
			} catch {
				return false;
			}
		});

		return Array.from(new Set(valid.map((p) => path.resolve(p))));
	}

	/**
	 * Запуск демона
	 */
	public start(): void {
		if (this.timer) return;
		this.config.enabled = true;

		// Первый прогон сразу
		void this.scanNow();

		this.timer = setInterval(() => {
			void this.scanNow();
		}, this.config.pollIntervalMs);

		// Не блокировать завершение процесса Node.js
		this.timer.unref();
		this.emit("started");
	}

	/**
	 * Остановка демона
	 */
	public stop(): void {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
		this.config.enabled = false;
		this.emit("stopped");
	}

	public isRunning(): boolean {
		return this.timer !== null;
	}

	/**
	 * Обновление конфигурации демона
	 */
	public updateConfig(newConfig: DicomWatcherConfigUpdate): DicomDaemonStatus {
		if (newConfig.watchPaths !== undefined) {
			this.config.watchPaths = Array.from(new Set(newConfig.watchPaths.map((p) => path.resolve(p))));
		}
		if (newConfig.pollIntervalMs !== undefined) {
			this.config.pollIntervalMs = Math.max(5000, newConfig.pollIntervalMs);
			if (this.isRunning()) {
				this.stop();
				this.start();
			}
		}
		if (newConfig.debounceDelayMs !== undefined) {
			this.config.debounceDelayMs = newConfig.debounceDelayMs;
		}
		if (newConfig.enabled !== undefined) {
			if (newConfig.enabled && !this.isRunning()) this.start();
			if (!newConfig.enabled && this.isRunning()) this.stop();
		}
		return this.getStatus();
	}

	/**
	 * Получение текущего статуса демона
	 */
	public getStatus(): DicomDaemonStatus {
		const activeRoots = this.config.watchPaths.filter((p) => {
			try {
				return existsSync(p) && statSync(p).isDirectory();
			} catch {
				return false;
			}
		});

		return {
			isRunning: this.isRunning(),
			enabled: this.config.enabled,
			watchPaths: this.config.watchPaths,
			activeRoots,
			lastScanAt: this.lastScanAt ? this.lastScanAt.toISOString() : null,
			lastScanDurationMs: this.lastScanDurationMs,
			totalDiscoveredFolders: this.processedCache.size,
			autoBoundCount: this.autoBoundCount,
			pendingReviewCount: this.pendingReviewCount,
			unassignedCount: this.unassignedCount,
			recentStudies: this.recentStudies.slice(0, 15),
			errors: this.errors.slice(-10),
		};
	}

	/**
	 * Принудительное ручное сканирование отслеживаемых директорий
	 */
	public async scanNow(explicitPaths?: string[]): Promise<{
		scannedRoots: number;
		newStudiesDiscovered: number;
		autoBound: number;
		pendingReview: number;
		unassigned: number;
	}> {
		if (this.isScanning) {
			return { scannedRoots: 0, newStudiesDiscovered: 0, autoBound: 0, pendingReview: 0, unassigned: 0 };
		}

		this.isScanning = true;
		const startTime = Date.now();
		let newStudiesDiscovered = 0;
		let autoBound = 0;
		let pendingReview = 0;
		let unassigned = 0;

		const targetRoots = explicitPaths && explicitPaths.length > 0 ? explicitPaths : this.config.watchPaths;

		try {
			// Получаем ID организации клиники
			const orgId = await this.resolveOrganizationId();
			if (!orgId) {
				return { scannedRoots: 0, newStudiesDiscovered: 0, autoBound: 0, pendingReview: 0, unassigned: 0 };
			}

			// Загружаем список активных пациентов клиники для нечеткого матчинга
			const clinicPatients: PatientCandidateItem[] = await db
				.select({
					id: schema.patients.id,
					fullName: schema.patients.fullName,
					birthDate: schema.patients.birthDate,
					phone: schema.patients.phone,
				})
				.from(schema.patients)
				.where(eq(schema.patients.organizationId, orgId));

			for (const root of targetRoots) {
				if (!existsSync(root)) continue;

				try {
					const rootStat = await stat(root);
					if (!rootStat.isDirectory()) continue;

					// Сканируем поддиректории первого и второго уровня глубины
					const candidateFolders = await this.findStudyFolders(root, 2);

					for (const folder of candidateFolders) {
						const res = await this.processFolderCandidate(folder, orgId, clinicPatients);
						if (res) {
							newStudiesDiscovered++;
							if (res.status === "auto_bound") autoBound++;
							else if (res.status === "pending_review") pendingReview++;
							else unassigned++;
						}
					}
				} catch (err) {
					this.errors.push(`Ошибка сканирования папки ${root}: ${String(err)}`);
				}
			}

			this.autoBoundCount += autoBound;
			this.pendingReviewCount += pendingReview;
			this.unassignedCount += unassigned;
		} finally {
			this.lastScanAt = new Date();
			this.lastScanDurationMs = Date.now() - startTime;
			this.isScanning = false;
		}

		return {
			scannedRoots: targetRoots.length,
			newStudiesDiscovered,
			autoBound,
			pendingReview,
			unassigned,
		};
	}

	/**
	 * Рекурсивный поиск папок с КТ-снимками
	 */
	private async findStudyFolders(currentPath: string, maxDepth: number, currentDepth = 0): Promise<string[]> {
		if (currentDepth > maxDepth) return [];

		const results: string[] = [];
		let entries;
		try {
			entries = await readdir(currentPath, { withFileTypes: true });
		} catch {
			return results;
		}

		let hasDicomFilesInCurrent = false;

		for (const entry of entries) {
			if (entry.isFile()) {
				const ext = path.extname(entry.name).toLowerCase();
				if (ext === ".dcm" || ext === ".dicom" || ext === ".ima" || /^DICOMDIR$/i.test(entry.name)) {
					hasDicomFilesInCurrent = true;
				}
			} else if (entry.isDirectory()) {
				const sub = path.join(currentPath, entry.name);
				const subResults = await this.findStudyFolders(sub, maxDepth, currentDepth + 1);
				results.push(...subResults);
			}
		}

		// Если в текущей папке есть файлы снимков, добавляем её
		if (hasDicomFilesInCurrent) {
			results.push(currentPath);
		}

		return results;
	}

	/**
	 * Обработка найденной папки КТ
	 */
	private async processFolderCandidate(
		folderPath: string,
		orgId: string,
		patients: PatientCandidateItem[],
	): Promise<DiscoveredStudyEvent | null> {
		let folderStat;
		try {
			folderStat = await stat(folderPath);
		} catch {
			return null;
		}

		const mtimeMs = folderStat.mtimeMs;

		// 1. Проверяем кеш — если папка уже обрабатывалась и не менялась, пропускаем
		const cached = this.processedCache.get(folderPath);
		if (cached && Math.abs(cached.mtimeMs - mtimeMs) < 1000) {
			return null;
		}

		// 2. Debouncing: если папка менялась менее debounceDelayMs назад — томограф еще выгружает срезы
		const now = Date.now();
		if (now - mtimeMs < this.config.debounceDelayMs) {
			return null;
		}

		// 3. Быстрое чтение метаданных срезов КТ
		const seriesSummary: DicomSeriesScanSummary | null = await scanDicomSeriesFolder(folderPath);
		if (!seriesSummary || seriesSummary.sliceCount === 0) {
			return null;
		}

		// 4. Стохастический матчинг с пациентами клиники
		const matchResult = matchStudyToPatients(
			{
				patientName: seriesSummary.patientName,
				patientId: seriesSummary.patientId,
				birthDate: seriesSummary.patientBirthDate,
				folderPath,
			},
			patients,
		);

		// 5. Запись или обновление в БД PostgreSQL (imaging_studies)
		const baseTitle = seriesSummary.seriesDescription ||
			`КЛКТ ${seriesSummary.patientName ?? path.basename(folderPath)} (${seriesSummary.sliceCount} ср.)`;

		const capturedAtDate = seriesSummary.studyDate
			? new Date(seriesSummary.studyDate)
			: new Date(folderStat.mtime);

		let studyRecordId: string;

		// Проверяем, существует ли уже запись по seriesInstanceUid или storagePath
		const existing = await db
			.select({ id: schema.imagingStudies.id })
			.from(schema.imagingStudies)
			.where(
				and(
					eq(schema.imagingStudies.organizationId, orgId),
					or(
						seriesSummary.seriesInstanceUid
							? eq(schema.imagingStudies.seriesInstanceUid, seriesSummary.seriesInstanceUid)
							: undefined,
						eq(schema.imagingStudies.storagePath, folderPath),
					),
				),
			)
			.limit(1);

		if (existing.length > 0 && existing[0]) {
			studyRecordId = existing[0].id;
			await db
				.update(schema.imagingStudies)
				.set({
					patientId: matchResult.patientId,
					bindingStatus: matchResult.status,
					bindingConfidence: matchResult.confidence,
					sliceCount: seriesSummary.sliceCount,
					dimensions: seriesSummary.dimensions,
					voxelSpacing: seriesSummary.voxelSpacing,
					fileSizeBytes: seriesSummary.totalSizeBytes,
					dicomPatientName: seriesSummary.patientName,
					dicomPatientId: seriesSummary.patientId,
					dicomBirthDate: seriesSummary.patientBirthDate,
					aiSummary: `Автодетект томографа: ${seriesSummary.manufacturer ?? "Томограф"}. Совпадение: ${matchResult.confidence}%. ${matchResult.matchDetails}`,
				})
				.where(eq(schema.imagingStudies.id, studyRecordId));
		} else {
			const [inserted] = await db
				.insert(schema.imagingStudies)
				.values({
					organizationId: orgId,
					patientId: matchResult.patientId,
					kind: seriesSummary.sliceCount > 20 ? "cbct" : "periapical",
					title: baseTitle,
					capturedAt: capturedAtDate,
					sourceKind: "folder_watch",
					sourceName: seriesSummary.manufacturer ?? "Автопоиск томографа",
					status: "available",
					storagePath: folderPath,
					studyInstanceUid: seriesSummary.studyInstanceUid,
					seriesInstanceUid: seriesSummary.seriesInstanceUid,
					modality: seriesSummary.modality,
					seriesDescription: seriesSummary.seriesDescription,
					studyDate: seriesSummary.studyDate,
					sliceCount: seriesSummary.sliceCount,
					dimensions: seriesSummary.dimensions,
					voxelSpacing: seriesSummary.voxelSpacing,
					fileSizeBytes: seriesSummary.totalSizeBytes,
					bindingStatus: matchResult.status,
					bindingConfidence: matchResult.confidence,
					dicomPatientName: seriesSummary.patientName,
					dicomPatientId: seriesSummary.patientId,
					dicomBirthDate: seriesSummary.patientBirthDate,
					aiSummary: `Обнаружено демоном томографа. Аппарат: ${seriesSummary.manufacturer ?? "Стандартный DICOM"}. Скор: ${matchResult.confidence}%. ${matchResult.matchDetails}`,
				})
				.returning({ id: schema.imagingStudies.id });

			studyRecordId = inserted?.id ?? "";
		}

		// Кешируем
		this.processedCache.set(folderPath, { mtimeMs, studyId: studyRecordId });

		const event: DiscoveredStudyEvent = {
			studyId: studyRecordId,
			folderPath,
			patientId: matchResult.patientId,
			patientFullName: matchResult.patientFullName,
			confidence: matchResult.confidence,
			status: matchResult.status,
			sliceCount: seriesSummary.sliceCount,
		};

		this.recentStudies.unshift({
			id: studyRecordId,
			folderPath,
			title: baseTitle,
			patientName: matchResult.patientFullName ?? seriesSummary.patientName,
			status: matchResult.status,
			confidence: matchResult.confidence,
			detectedAt: new Date().toISOString(),
		});

		this.emit("studyDiscovered", event);
		return event;
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

// Синглтон демона для всего бэкенда
export const dicomWatcherDaemon = new DicomFolderWatcherDaemon();
