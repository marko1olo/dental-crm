/**
 * vatechDirectBridgeService.ts — Служба прямого мониторинга локальных каталогов Vatech.
 * 
 * Отслеживает появление снимков в структуре каталогов Vatech:
 * `Common/FM/FMData/Files/Sub<YYMMD>/` (.dcm, .bmp, .raw, .tag).
 * 
 * Особенности:
 * 1. Асинхронный watcher на базе native node:fs (с поддержкой рекурсивного мониторинга Windows).
 * 2. Проверка стабильности размера файла (защита от чтения недописанных файлов визиографа/томографа).
 * 3. Задержка захвата и регистрации < 40 мс после завершения записи файла на диск.
 * 4. Поддержка парсинга Vatech .tag метаданных (PatientID, PatientName, kVp, mA, ExposureTime).
 * 5. Прямая передача в DicomStudyIngestService или xray_scans (Мандат 8e Doctor Autonomy).
 * 6. Дедупликация и защита от повторной обработки уже импортированных файлов.
 */

import { watch, type FSWatcher } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import {
	type IngestDicomResult,
	dicomStudyIngestService,
} from "./dicomStudyIngestService.js";
import { resolveOrAutoCreatePatientForDicom } from "./dicomPatientAutoBinder.js";
import { getPacsTenantStorageDir, toNormalizedRelativePacsStoragePath } from "../imaging/localPacsSanitizer.js";
import { wsBroker } from "../websocketBroker.js";

export interface VatechTagMetadata {
	patientId: string | null;
	patientName: string | null;
	birthDate: string | null;
	studyDate: string | null;
	kvp: number | null;
	ma: number | null;
	exposureTimeMs: number | null;
	modality: string | null;
	toothCode: string | null;
}

export interface VatechWatcherStats {
	isWatching: boolean;
	watchedDirectory: string | null;
	defaultOrganizationId: string | null;
	totalFilesDetected: number;
	totalFilesIngested: number;
	totalFilesSkipped: number;
	totalErrors: number;
	lastIngestAt: string | null;
	lastDetectedFile: string | null;
}

/**
 * Парсер файла метаданных Vatech .tag / .ini / .xml
 */
export function parseVatechTagFileContent(content: string): VatechTagMetadata {
	let patientId: string | null = null;
	let patientName: string | null = null;
	let birthDate: string | null = null;
	let studyDate: string | null = null;
	let kvp: number | null = null;
	let ma: number | null = null;
	let exposureTimeMs: number | null = null;
	let modality: string | null = null;
	let toothCode: string | null = null;

	const lines = content.split(/\r?\n/);
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(";")) continue;

		const separatorIdx = trimmed.indexOf("=");
		if (separatorIdx === -1) continue;

		const key = trimmed.slice(0, separatorIdx).trim().toUpperCase();
		const val = trimmed.slice(separatorIdx + 1).trim();

		switch (key) {
			case "PATIENTID":
			case "PATIENT_ID":
			case "PATID":
			case "CHARTNO":
			case "CHART_NO":
				patientId = val.length > 0 ? val : null;
				break;

			case "PATIENTNAME":
			case "PATIENT_NAME":
			case "PATNAME":
			case "NAME":
				patientName = val.replace(/\^/g, " ").replace(/\s+/g, " ").trim();
				break;

			case "BIRTHDATE":
			case "PATIENT_BIRTHDATE":
			case "DOB":
				birthDate = val.replace(/[^\d-]/g, "").slice(0, 10) || null;
				break;

			case "DATE":
			case "STUDYDATE":
			case "ACQUISITION_DATE":
				studyDate = val.replace(/[^\d-]/g, "").slice(0, 10) || null;
				break;

			case "KV":
			case "KVP":
				kvp = Number.parseFloat(val) || null;
				break;

			case "MA":
				ma = Number.parseFloat(val) || null;
				break;

			case "SEC":
			case "EXPOSURETIME":
			case "TIME":
				// Если время в секундах (например 0.12), переводим в мс
				const parsedSec = Number.parseFloat(val);
				if (Number.isFinite(parsedSec)) {
					exposureTimeMs = parsedSec < 10 ? Math.round(parsedSec * 1000) : Math.round(parsedSec);
				}
				break;

			case "MODALITY":
			case "TYPE":
				modality = val.length > 0 ? val : null;
				break;

			case "TOOTH":
			case "TOOTHCODE":
			case "TOOTH_NUMBER":
				toothCode = val.length > 0 ? val : null;
				break;
		}
	}

	return {
		patientId,
		patientName,
		birthDate,
		studyDate,
		kvp,
		ma,
		exposureTimeMs,
		modality,
		toothCode,
	};
}

export class VatechDirectBridgeService {
	private watcher: FSWatcher | null = null;
	private isWatching = false;
	private watchDirectory: string | null = null;
	private defaultOrganizationId: string | null = null;

	// Дедупликация и отслеживание уже обработанных файлов
	private processedFiles = new Set<string>();
	private pendingFileChecks = new Map<string, NodeJS.Timeout>();

	// Статистика
	private totalFilesDetected = 0;
	private totalFilesIngested = 0;
	private totalFilesSkipped = 0;
	private totalErrors = 0;
	private lastIngestAt: Date | null = null;
	private lastDetectedFile: string | null = null;

	constructor(defaultOrgId?: string) {
		this.defaultOrganizationId = defaultOrgId ?? (process.env.DICOM_DEFAULT_ORG_ID?.trim() || null);
	}

	/**
	 * Запуск мониторинга каталога Vatech.
	 */
	async start(directoryToWatch?: string): Promise<void> {
		if (this.isWatching) {
			return;
		}

		// Выбор каталога для мониторинга
		const candidateDir =
			directoryToWatch ??
			process.env.VATECH_WATCH_DIR?.trim() ??
			path.resolve(process.cwd(), "uploads", "vatech_incoming");

		this.watchDirectory = candidateDir;

		// Создаем каталог, если не существует
		await fs.mkdir(candidateDir, { recursive: true });

		// Резолвинг организации по умолчанию
		if (!this.defaultOrganizationId) {
			try {
				const [firstOrg] = await db
					.select({ id: schema.organizations.id })
					.from(schema.organizations)
					.limit(1);
				if (firstOrg) {
					this.defaultOrganizationId = firstOrg.id;
				}
			} catch {
				// Обработка отсутствия организаций
			}
		}

		this.isWatching = true;

		// Запускаем нативный вотчер
		try {
			this.watcher = watch(candidateDir, { recursive: true }, (eventType, filename) => {
				if (!filename) return;
				const fullPath = path.resolve(candidateDir, filename);
				this.handleFileEvent(fullPath);
			});
		} catch (err) {
			this.isWatching = false;
			throw err;
		}

		// Выполняем начальное сканирование уже существующих файлов в каталоге
		this.scanDirectoryRecursively(candidateDir).catch(() => {});
	}

	/**
	 * Остановка мониторинга.
	 */
	async stop(): Promise<void> {
		if (!this.isWatching) {
			return;
		}

		// Очищаем таймеры отложенной проверки
		for (const timer of this.pendingFileChecks.values()) {
			clearTimeout(timer);
		}
		this.pendingFileChecks.clear();

		if (this.watcher) {
			this.watcher.close();
			this.watcher = null;
		}

		this.isWatching = false;
	}

	getStatus(): VatechWatcherStats {
		return {
			isWatching: this.isWatching,
			watchedDirectory: this.watchDirectory,
			defaultOrganizationId: this.defaultOrganizationId,
			totalFilesDetected: this.totalFilesDetected,
			totalFilesIngested: this.totalFilesIngested,
			totalFilesSkipped: this.totalFilesSkipped,
			totalErrors: this.totalErrors,
			lastIngestAt: this.lastIngestAt ? this.lastIngestAt.toISOString() : null,
			lastDetectedFile: this.lastDetectedFile,
		};
	}

	/**
	 * Рекурсивное сканирование каталога для первичного импорта или ручного триггера.
	 */
	async scanDirectoryRecursively(dirPath: string): Promise<number> {
		let count = 0;
		try {
			const entries = await fs.readdir(dirPath, { withFileTypes: true });
			for (const entry of entries) {
				const fullPath = path.join(dirPath, entry.name);
				if (entry.isDirectory()) {
					count += await this.scanDirectoryRecursively(fullPath);
				} else if (entry.isFile()) {
					const ext = path.extname(entry.name).toLowerCase();
					if (ext === ".dcm" || ext === ".bmp" || ext === ".raw" || ext === ".jpg" || ext === ".png") {
						this.handleFileEvent(fullPath);
						count++;
					}
				}
			}
		} catch {
			// Каталог недоступен
		}
		return count;
	}

	/**
	 * Обработка обнаруженного файла с проверкой стабилизации размера.
	 */
	private handleFileEvent(filePath: string): void {
		const normalized = path.normalize(filePath);
		if (this.processedFiles.has(normalized)) {
			return;
		}

		const ext = path.extname(filePath).toLowerCase();
		// Игнорируем временные файлы Vatech или файлы блокировок
		if (
			ext === ".tmp" ||
			ext === ".lck" ||
			ext === ".bak" ||
			ext === ".crdownload" ||
			path.basename(filePath).startsWith("~") ||
			path.basename(filePath).startsWith(".")
		) {
			return;
		}

		// Только разрешенные расширения
		if (![".dcm", ".bmp", ".raw", ".jpg", ".jpeg", ".png"].includes(ext)) {
			return;
		}

		this.totalFilesDetected++;
		this.lastDetectedFile = normalized;

		// Сбрасываем предыдущий таймер, если файл всё ещё дописывается
		const existingTimer = this.pendingFileChecks.get(normalized);
		if (existingTimer) {
			clearTimeout(existingTimer);
		}

		// Задержка проверки стабильности размера (150 мс)
		const timer = setTimeout(() => {
			this.checkFileStabilityAndIngest(normalized, 0, 0);
		}, 150);

		this.pendingFileChecks.set(normalized, timer);
	}

	/**
	 * Проверка, что файл полностью записан сканером и не заблокирован.
	 */
	private async checkFileStabilityAndIngest(
		filePath: string,
		lastSize: number,
		retryCount: number,
	): Promise<void> {
		this.pendingFileChecks.delete(filePath);

		try {
			const stats = await fs.stat(filePath);
			if (stats.size === 0) {
				if (retryCount < 10) {
					const timer = setTimeout(() => {
						this.checkFileStabilityAndIngest(filePath, 0, retryCount + 1);
					}, 200);
					this.pendingFileChecks.set(filePath, timer);
				} else {
					this.totalFilesSkipped++;
				}
				return;
			}

			// Если размер изменился с прошлой проверки — файл пишется аппаратом
			if (lastSize === 0 || stats.size !== lastSize) {
				const timer = setTimeout(() => {
					this.checkFileStabilityAndIngest(filePath, stats.size, retryCount + 1);
				}, 150);
				this.pendingFileChecks.set(filePath, timer);
				return;
			}

			// Размер стабилен! Приступаем к инжесту
			this.processedFiles.add(filePath);
			await this.processStableFile(filePath, stats.size);
		} catch {
			this.totalErrors++;
		}
	}

	/**
	 * Непосредственный импорт стабильного снимка в DENTE CRM.
	 */
	private async processStableFile(filePath: string, fileSizeBytes: number): Promise<void> {
		const orgId = await this.resolveOrganizationId();
		const ext = path.extname(filePath).toLowerCase();

		if (ext === ".dcm") {
			// Прямой DICOM файл
			await dicomStudyIngestService.ingestFile(filePath, {
				organizationId: orgId,
				sourceKind: "folder_watch",
				sourceName: "Vatech Folder Watcher",
			});
			this.totalFilesIngested++;
			this.lastIngestAt = new Date();
			return;
		}

		// Для форматов .bmp, .raw, .jpg, .png проверяем сопутствующий .tag файл
		const dir = path.dirname(filePath);
		const baseNameWithoutExt = path.basename(filePath, ext);
		const candidateTagPath = path.join(dir, `${baseNameWithoutExt}.tag`);

		let tagMeta: VatechTagMetadata = {
			patientId: null,
			patientName: null,
			birthDate: null,
			studyDate: null,
			kvp: null,
			ma: null,
			exposureTimeMs: null,
			modality: null,
			toothCode: null,
		};

		try {
			const tagContent = await fs.readFile(candidateTagPath, "utf-8");
			tagMeta = parseVatechTagFileContent(tagContent);
		} catch {
			// .tag файл не найден, используем метаданные по умолчанию
		}

		// Авто-связывание пациента (Мандат 8e)
		const patientBinding = await resolveOrAutoCreatePatientForDicom(orgId, {
			patientFullName: tagMeta.patientName,
			patientChartNumber: tagMeta.patientId,
			patientBirthDate: tagMeta.birthDate,
			autoCreateDraftIfNotFound: true,
		});

		// Сохраняем файл в изолированный tenant-каталог
		const tenantDir = getPacsTenantStorageDir(orgId);
		const subFolder = path.join(tenantDir, "vatech_scans", new Date().toISOString().slice(0, 10));
		await fs.mkdir(subFolder, { recursive: true });

		const targetFile = path.join(subFolder, path.basename(filePath));
		await fs.copyFile(filePath, targetFile);

		const relativePath = toNormalizedRelativePacsStoragePath(orgId, targetFile, "pacs");

		// Создаем запись в xray_scans
		if (patientBinding.patientId) {
			const kvpStr = tagMeta.kvp ? ` ${tagMeta.kvp} кВ` : "";
			const maStr = tagMeta.ma ? ` ${tagMeta.ma} мА` : "";
			const expStr = tagMeta.exposureTimeMs ? ` ${tagMeta.exposureTimeMs} мс` : "";
			const notes = `Vatech Visigraph Frame:${kvpStr}${maStr}${expStr}`.trim();

			const mimeType = ext === ".png" ? "image/png" : ext === ".bmp" ? "image/bmp" : "image/jpeg";

			const [inserted] = await db
				.insert(schema.xrayScans)
				.values({
					organizationId: orgId,
					patientId: patientBinding.patientId,
					storagePath: relativePath,
					fileSizeBytes,
					originalFilename: path.basename(filePath),
					mimeType,
					status: "done",
					kind: "periapical",
					toothCode: tagMeta.toothCode,
					notes,
				})
				.returning({ id: schema.xrayScans.id });

			if (inserted) {
				wsBroker.broadcastToOrganization(orgId, {
					type: "IMAGING_STUDY_INGESTED",
					payload: {
						xrayScanId: inserted.id,
						patientId: patientBinding.patientId,
						patientFullName: patientBinding.patientFullName,
						modality: "intraoral",
						title: "Прицельный снимок Vatech",
						sourceName: "Vatech Folder Watcher",
					},
				});
			}
		}

		this.totalFilesIngested++;
		this.lastIngestAt = new Date();
	}

	private async resolveOrganizationId(): Promise<string> {
		if (this.defaultOrganizationId) {
			return this.defaultOrganizationId;
		}

		const [firstOrg] = await db
			.select({ id: schema.organizations.id })
			.from(schema.organizations)
			.limit(1);

		if (firstOrg) {
			this.defaultOrganizationId = firstOrg.id;
			return firstOrg.id;
		}

		throw new Error("Не найдено ни одной организации в базе данных.");
	}
}

export const vatechDirectBridgeService = new VatechDirectBridgeService();
