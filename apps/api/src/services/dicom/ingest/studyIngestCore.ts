/**
 * studyIngestCore.ts — Ядро сквозного приема, сохранения в PACS-хранилище,
 * дедупликации срезов и регистрации DICOM-исследований в PostgreSQL 18.
 */

import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { and, eq, inArray, sql } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import * as schema from "../../../db/schema.js";
import {
	PathTraversalError,
	getPacsTenantStorageDir,
	toNormalizedRelativePacsStoragePath,
} from "../../imaging/localPacsSanitizer.js";
import { wsBroker } from "../../websocketBroker.js";
import { readFilePrefixAsync } from "../../../routes/imaging/dicomParsingModules/dicomFileIoAndSafety.js";
import { dicomIngestLogger } from "./dicomIngestLogger.js";
import {
	mapModalityKindToStudyKind,
	parseDicomIngestBuffer,
	parseUniqueDicomSlices,
	recordSanpinRadiationDose,
	sanitizeDicomUidForPath,
} from "./metadataParser.js";
import {
	bindPatientFromDicomMetadata,
	ensureSeriesRecord,
	ensureStudyRecord,
	mirrorIntraoralXrayScan,
} from "../dicomPatientAutoBinder.js";
import type {
	IngestBatchResult,
	IngestDicomOptions,
	IngestDicomResult,
} from "./types.js";

export class DicomStudyIngestService {
	/**
	 * Прием и обработка единичного DICOM-среза из бинарного буфера (сеть C-STORE или загрузка файла).
	 * С полной защитой от дублирования по SOPInstanceUID и автопривязкой к пациенту.
	 */
	async ingestBuffer(buffer: Buffer, options: IngestDicomOptions): Promise<IngestDicomResult> {
		const {
			organizationId,
			visitId = null,
			doctorId = null,
			sourceKind = "pacs",
			sourceName = "Vatech DICOM Receiver",
			autoCreateDraftIfNotFound = true,
			toothCode = null,
			region = null,
		} = options;

		if (!organizationId) {
			throw new Error("Не передан обязательный organizationId для изоляции хранилища PACS.");
		}

		// 1. Быстрый разбор метаданных DICOM
		const metadata = parseDicomIngestBuffer(buffer);

		// 2. Сохранение файла на диск в изолированный tenant-каталог
		const tenantDir = getPacsTenantStorageDir(organizationId);
		const safeStudyUid = sanitizeDicomUidForPath(metadata.studyInstanceUid);
		const safeSeriesUid = sanitizeDicomUidForPath(metadata.seriesInstanceUid);
		const safeSopUid = sanitizeDicomUidForPath(metadata.sopInstanceUid);

		const targetDir = path.join(tenantDir, safeStudyUid, safeSeriesUid);
		await fs.mkdir(targetDir, { recursive: true });

		const fullFilePath = path.join(targetDir, `${safeSopUid}.dcm`);
		await fs.writeFile(fullFilePath, buffer);

		const relativeStoragePath = toNormalizedRelativePacsStoragePath(organizationId, fullFilePath, "pacs");

		// 3. Определение модальности для базы
		const studyKind = mapModalityKindToStudyKind(metadata.modalityKind);

		// ACID Транзакция внутри RLS tenant context
		let patientBinding;
		let studyId: string;
		let seriesId: string;
		let instanceId: string;
		let isDuplicate: boolean;
		let xrayScanId: string | null;
		try {
			const txResult = await withTenantCtx(organizationId, async (tx) => {
				const binding = await bindPatientFromDicomMetadata(
					organizationId,
					metadata,
					autoCreateDraftIfNotFound,
					tx,
				);

				const { studyId: currentStudyId, isNewStudy } = await ensureStudyRecord({
					organizationId,
					visitId,
					doctorId,
					sourceKind,
					sourceName,
					toothCode,
					region,
					studyKind,
					storagePath: relativeStoragePath,
					initialSliceCount: 1,
					initialFileSizeBytes: buffer.length,
					metadata,
					patientBinding: binding,
				}, tx);

				const currentSeriesId = await ensureSeriesRecord(organizationId, currentStudyId, metadata, tx);

				// 4. СТРОГАЯ ДЕДУПЛИКАЦИЯ: Поиск существующего экземпляра (imaging_instances)
				const [existingInstance] = await tx
					.select()
					.from(schema.imagingInstances)
					.where(
						and(
							eq(schema.imagingInstances.organizationId, organizationId),
							eq(schema.imagingInstances.seriesId, currentSeriesId),
							eq(schema.imagingInstances.dicomSopInstanceUid, metadata.sopInstanceUid),
						),
					)
					.limit(1);

				let currentInstanceId: string;
				let duplicateFlag = false;

				if (existingInstance) {
					currentInstanceId = existingInstance.id;
					duplicateFlag = true;
				} else {
					const [insertedInstance] = await tx
						.insert(schema.imagingInstances)
						.values({
							organizationId,
							seriesId: currentSeriesId,
							dicomSopInstanceUid: metadata.sopInstanceUid,
							sopInstanceUid: metadata.sopInstanceUid,
							instanceNumber: metadata.instanceNumber ?? 1,
							sopClassUid: metadata.sopClassUid,
							storagePath: relativeStoragePath,
							fileSizeBytes: buffer.length,
							sliceLocation: metadata.sliceLocation,
							windowCenter: metadata.windowCenter,
							windowWidth: metadata.windowWidth,
							rows: metadata.rows,
							columns: metadata.columns,
							cols: metadata.columns,
						})
						.returning({ id: schema.imagingInstances.id });

					if (!insertedInstance) {
						throw new Error("Не удалось создать запись DICOM-экземпляра в PostgreSQL.");
					}
					currentInstanceId = insertedInstance.id;

					if (!isNewStudy) {
						await tx
							.update(schema.imagingStudies)
							.set({
								sliceCount: sql`COALESCE(${schema.imagingStudies.sliceCount}, 0) + 1`,
								fileSizeBytes: sql`COALESCE(${schema.imagingStudies.fileSizeBytes}, 0) + ${buffer.length}`,
							})
							.where(
								and(
									eq(schema.imagingStudies.organizationId, organizationId),
									eq(schema.imagingStudies.id, currentStudyId),
								),
							);
					}

					if (binding.patientId) {
						await recordSanpinRadiationDose(organizationId, binding.patientId, metadata, doctorId, tx);
					}
				}

				// 5. Зеркалирование для визиографов (modality = intraoral) в xray_scans
				const mirroredXrayScanId = await mirrorIntraoralXrayScan({
					organizationId,
					patientId: binding.patientId,
					visitId,
					studyId: currentStudyId,
					relativeStoragePath,
					fileSizeBytes: buffer.length,
					toothCode,
					metadata,
				}, tx);

				return {
					patientBinding: binding,
					studyId: currentStudyId,
					seriesId: currentSeriesId,
					instanceId: currentInstanceId,
					isDuplicate: duplicateFlag,
					xrayScanId: mirroredXrayScanId,
				};
			});
			({ patientBinding, studyId, seriesId, instanceId, isDuplicate, xrayScanId } = txResult);
		} catch (txErr) {
			await fs.unlink(fullFilePath).catch((unlinkErr) => {
				dicomIngestLogger.warn(`Не удалось удалить DICOM-файл при откате: ${fullFilePath}`, unlinkErr);
			});
			throw txErr;
		}

		// 7. Оповещение WebSocket брокера для мгновенного обновления интерфейса врача
		wsBroker.broadcastToOrganization(organizationId, {
			type: "IMAGING_STUDY_INGESTED",
			payload: {
				studyId,
				seriesId,
				instanceId,
				xrayScanId,
				patientId: patientBinding.patientId,
				patientFullName: patientBinding.patientFullName,
				studyInstanceUid: metadata.studyInstanceUid,
				modality: metadata.modalityKind,
				title: metadata.suggestedStudyTitle,
				isNewPatientCreated: patientBinding.isNewPatientCreated,
				bindingStatus: patientBinding.bindingStatus,
				sourceName,
			},
		});

		return {
			studyId,
			seriesId,
			instanceId,
			xrayScanId,
			patientId: patientBinding.patientId,
			patientFullName: patientBinding.patientFullName,
			studyInstanceUid: metadata.studyInstanceUid,
			seriesInstanceUid: metadata.seriesInstanceUid,
			sopInstanceUid: metadata.sopInstanceUid,
			modality: metadata.modalityRaw ?? metadata.modalityKind.toUpperCase(),
			modalityKind: metadata.modalityKind,
			studyKind,
			storagePath: relativeStoragePath,
			fileSizeBytes: buffer.length,
			bindingStatus: patientBinding.bindingStatus,
			bindingConfidence: patientBinding.bindingConfidence,
			isNewPatientCreated: patientBinding.isNewPatientCreated,
			isDuplicate,
			metadata,
		};
	}

	/**
	 * Пакетный прием серии DICOM-срезов (например, КЛКТ томографа на 400+ срезов).
	 * Выполняет единовременную батчевую вставку в imaging_instances, атомарно обновляет sliceCount
	 * и гарантирует 100% защиту от дублирования при повторной отправке.
	 */
	async ingestBatch(buffers: Buffer[], options: IngestDicomOptions): Promise<IngestBatchResult> {
		if (!buffers || buffers.length === 0) {
			throw new Error("Передан пустой массив буферов для пакетного импорта DICOM.");
		}

		const {
			organizationId,
			visitId = null,
			doctorId = null,
			sourceKind = "pacs",
			sourceName = "Vatech Batch Receiver",
			autoCreateDraftIfNotFound = true,
			toothCode = null,
			region = null,
		} = options;

		if (!organizationId) {
			throw new Error("Не передан обязательный organizationId для изоляции хранилища PACS.");
		}

		// 1. Быстрый разбор метаданных всех срезов и дедупликация в оперативной памяти
		const uniqueInstancesMap = parseUniqueDicomSlices(buffers);
		const firstItem = uniqueInstancesMap.values().next().value;
		if (uniqueInstancesMap.size === 0 || !firstItem) {
			throw new Error("Ни один из переданных буферов не является валидным DICOM файлом.");
		}

		const baseMeta = firstItem.metadata;
		const studyKind = mapModalityKindToStudyKind(baseMeta.modalityKind);
		const tenantDir = getPacsTenantStorageDir(organizationId);
		const safeStudyUid = sanitizeDicomUidForPath(baseMeta.studyInstanceUid);
		const safeSeriesUid = sanitizeDicomUidForPath(baseMeta.seriesInstanceUid);
		const targetDir = path.join(tenantDir, safeStudyUid, safeSeriesUid);
		const studyRelPath = toNormalizedRelativePacsStoragePath(organizationId, targetDir, "pacs");

		// 2. ACID Транзакция внутри RLS tenant context с очисткой новых файлов при откате
		const writtenFilePaths: string[] = [];
		let patientBinding;
		let studyId: string;
		let seriesId: string;
		let newSlicesInserted: number;
		let duplicateSlicesSkipped: number;
		let finalFileSizeBytes: number;
		try {
			const txResult = await withTenantCtx(organizationId, async (tx) => {
				const binding = await bindPatientFromDicomMetadata(
					organizationId,
					baseMeta,
					autoCreateDraftIfNotFound,
					tx,
				);

				const { studyId: currentStudyId } = await ensureStudyRecord({
					organizationId,
					visitId,
					doctorId,
					sourceKind,
					sourceName,
					toothCode,
					region,
					studyKind,
					storagePath: studyRelPath,
					initialSliceCount: 0,
					initialFileSizeBytes: 0,
					metadata: baseMeta,
					patientBinding: binding,
				}, tx);

				const currentSeriesId = await ensureSeriesRecord(organizationId, currentStudyId, baseMeta, tx);

				// 3. Проверка существующих экземпляров в базе данных (Deduplication Gate)
				const incomingUids = Array.from(uniqueInstancesMap.keys());
				const existingInstances = await tx
					.select({ sopUid: schema.imagingInstances.dicomSopInstanceUid })
					.from(schema.imagingInstances)
					.where(
						and(
							eq(schema.imagingInstances.organizationId, organizationId),
							eq(schema.imagingInstances.seriesId, currentSeriesId),
							inArray(schema.imagingInstances.dicomSopInstanceUid, incomingUids),
						),
					);

				const existingUidSet = new Set(existingInstances.map((i) => i.sopUid));
				await fs.mkdir(targetDir, { recursive: true });

				const newInstancesRows: Array<typeof schema.imagingInstances.$inferInsert> = [];
				let newBytesTotal = 0;

				for (const [sopUid, item] of uniqueInstancesMap.entries()) {
					if (existingUidSet.has(sopUid)) {
						continue;
					}

					const safeSopUid = sanitizeDicomUidForPath(sopUid);
					const fullFilePath = path.join(targetDir, `${safeSopUid}.dcm`);
					await fs.writeFile(fullFilePath, item.buffer);
					writtenFilePaths.push(fullFilePath);

					const relativePath = toNormalizedRelativePacsStoragePath(organizationId, fullFilePath, "pacs");
					newBytesTotal += item.buffer.length;

					newInstancesRows.push({
						organizationId,
						seriesId: currentSeriesId,
						dicomSopInstanceUid: sopUid,
						sopInstanceUid: sopUid,
						instanceNumber: item.metadata.instanceNumber ?? 1,
						sopClassUid: item.metadata.sopClassUid,
						storagePath: relativePath,
						fileSizeBytes: item.buffer.length,
						sliceLocation: item.metadata.sliceLocation,
						windowCenter: item.metadata.windowCenter,
						windowWidth: item.metadata.windowWidth,
						rows: item.metadata.rows,
						columns: item.metadata.columns,
						cols: item.metadata.columns,
					});
				}

				const insertedCount = newInstancesRows.length;
				const skippedCount = buffers.length - insertedCount;

				// 4. Батчевая вставка новых экземпляров в imaging_instances
				if (insertedCount > 0) {
					const CHUNK_SIZE = 200;
					for (let i = 0; i < newInstancesRows.length; i += CHUNK_SIZE) {
						const chunk = newInstancesRows.slice(i, i + CHUNK_SIZE);
						await tx.insert(schema.imagingInstances).values(chunk);
					}

					await tx
						.update(schema.imagingStudies)
						.set({
							sliceCount: sql`COALESCE(${schema.imagingStudies.sliceCount}, 0) + ${insertedCount}`,
							fileSizeBytes: sql`COALESCE(${schema.imagingStudies.fileSizeBytes}, 0) + ${newBytesTotal}`,
						})
						.where(
							and(
								eq(schema.imagingStudies.organizationId, organizationId),
								eq(schema.imagingStudies.id, currentStudyId),
							),
						);

					if (binding.patientId) {
						await recordSanpinRadiationDose(organizationId, binding.patientId, baseMeta, doctorId, tx);
					}
				}

				const [finalStudyRow] = await tx
					.select({ fileSizeBytes: schema.imagingStudies.fileSizeBytes })
					.from(schema.imagingStudies)
					.where(
						and(
							eq(schema.imagingStudies.organizationId, organizationId),
							eq(schema.imagingStudies.id, currentStudyId),
						),
					)
					.limit(1);

				return {
					patientBinding: binding,
					studyId: currentStudyId,
					seriesId: currentSeriesId,
					newSlicesInserted: insertedCount,
					duplicateSlicesSkipped: skippedCount,
					finalFileSizeBytes: finalStudyRow?.fileSizeBytes ?? newBytesTotal,
				};
			});
			({ patientBinding, studyId, seriesId, newSlicesInserted, duplicateSlicesSkipped, finalFileSizeBytes } = txResult);
		} catch (txErr) {
			await Promise.all(
				writtenFilePaths.map((p) =>
					fs.unlink(p).catch((unlinkErr) => {
						dicomIngestLogger.warn(`Не удалось удалить DICOM-файл при откате: ${p}`, unlinkErr);
					}),
				),
			);
			throw txErr;
		}

		// 6. Оповещение WebSocket брокера о результатах пакетного импорта
		wsBroker.broadcastToOrganization(organizationId, {
			type: "IMAGING_STUDY_INGESTED",
			payload: {
				studyId,
				seriesId,
				patientId: patientBinding.patientId,
				patientFullName: patientBinding.patientFullName,
				studyInstanceUid: baseMeta.studyInstanceUid,
				modality: baseMeta.modalityKind,
				title: baseMeta.suggestedStudyTitle,
				totalSlicesReceived: buffers.length,
				newSlicesInserted,
				duplicateSlicesSkipped,
				isNewPatientCreated: patientBinding.isNewPatientCreated,
				bindingStatus: patientBinding.bindingStatus,
				sourceName,
			},
		});

		return {
			studyId,
			seriesId,
			patientId: patientBinding.patientId,
			patientFullName: patientBinding.patientFullName,
			studyInstanceUid: baseMeta.studyInstanceUid,
			seriesInstanceUid: baseMeta.seriesInstanceUid,
			modalityKind: baseMeta.modalityKind,
			studyKind,
			totalSlicesReceived: buffers.length,
			newSlicesInserted,
			duplicateSlicesSkipped,
			totalFileSizeBytes: finalFileSizeBytes,
			bindingStatus: patientBinding.bindingStatus,
			bindingConfidence: patientBinding.bindingConfidence,
			isNewPatientCreated: patientBinding.isNewPatientCreated,
			metadata: baseMeta,
		};
	}

	private validateIngestFilesystemPath(rawPath: string): string {
		if (!rawPath || rawPath.includes("\0") || rawPath.split(/[\\/]/).includes("..")) {
			throw new PathTraversalError(`Недопустимый путь для импорта DICOM: ${rawPath}`);
		}
		const resolved = path.resolve(rawPath);
		const lower = resolved.toLowerCase();
		const blockedTokens = [".env", ".git", ".ssh", "id_rsa", "id_ed25519", "\\windows\\system32", "/etc/"];
		if (blockedTokens.some((tok) => lower.includes(tok))) {
			throw new PathTraversalError(`Доступ к системному или конфиденциальному пути запрещен: ${rawPath}`);
		}
		return resolved;
	}

	/**
	 * Потоковое чтение метаданных DICOM-среза с чтением только заголовка (64 КБ префикс)
	 * без загрузки пиксельного объема КТ/КЛКТ в оперативную память.
	 */
	private async parseHeaderMetadataFromFile(filePath: string): Promise<{
		filePath: string;
		fileSizeBytes: number;
		metadata: ReturnType<typeof parseDicomIngestBuffer>;
	} | null> {
		const DICOM_HEADER_PREFIX_BYTES = 64 * 1024;
		const st = await fs.stat(filePath);
		if (st.size < 132) return null;

		const prefix = await readFilePrefixAsync(filePath, DICOM_HEADER_PREFIX_BYTES);
		if (prefix.length < 132) return null;

		try {
			const meta = parseDicomIngestBuffer(prefix, { untilTag: "x7fe00010" });
			if (
				!meta.sopInstanceUid.startsWith("generated.sop.") &&
				!meta.studyInstanceUid.startsWith("generated.study.")
			) {
				return { filePath, fileSizeBytes: st.size, metadata: meta };
			}
		} catch {
			// Если заголовок > 64 КБ (крупные private tags) — безопасный fallback на полное чтение одного файла
		}

		const fullBuf = await fs.readFile(filePath);
		const metadata = parseDicomIngestBuffer(fullBuf);
		return { filePath, fileSizeBytes: st.size, metadata };
	}

	/**
	 * Пакетный прием серии DICOM файлов напрямую из каталога на диске
	 * (например, папка исследования томографа из 400+ срезов) без OOM.
	 */
	async ingestSeriesFolder(folderPath: string, options: IngestDicomOptions): Promise<IngestBatchResult> {
		const safeFolder = await fs.realpath(this.validateIngestFilesystemPath(folderPath));
		const entries = await fs.readdir(safeFolder, { withFileTypes: true });
		const filePaths: string[] = [];

		for (const entry of entries) {
			if (entry.isFile()) {
				const ext = path.extname(entry.name).toLowerCase();
				if (ext === ".dcm" || ext === "" || ext === ".dicom") {
					const candidate = path.resolve(safeFolder, entry.name);
					if (candidate.startsWith(safeFolder + path.sep)) {
						filePaths.push(candidate);
					}
				}
			}
		}

		if (filePaths.length === 0) {
			throw new Error(`В каталоге ${folderPath} не найдено ни одного файла DICOM.`);
		}

		const {
			organizationId,
			visitId = null,
			doctorId = null,
			sourceKind = "pacs",
			sourceName = "Vatech Batch Receiver",
			autoCreateDraftIfNotFound = true,
			toothCode = null,
			region = null,
		} = options;

		if (!organizationId) {
			throw new Error("Не передан обязательный organizationId для изоляции хранилища PACS.");
		}

		// 1. Потоковая индексация заголовков (батчи по 8 файлов, 64 КБ префикс -> 0 пиков RAM)
		const INDEX_CHUNK_SIZE = 8;
		const uniqueSliceFiles = new Map<
			string,
			{ filePath: string; fileSizeBytes: number; metadata: ReturnType<typeof parseDicomIngestBuffer> }
		>();
		let totalSlicesReceived = 0;

		for (let i = 0; i < filePaths.length; i += INDEX_CHUNK_SIZE) {
			const batchPaths = filePaths.slice(i, i + INDEX_CHUNK_SIZE);
			const batchResults = await Promise.all(
				batchPaths.map(async (fp) => {
					try {
						return await this.parseHeaderMetadataFromFile(fp);
					} catch (err) {
						dicomIngestLogger.warn(`Не удалось прочитать файл ${fp}`, err);
						return null;
					}
				}),
			);
			for (const item of batchResults) {
				if (!item) continue;
				totalSlicesReceived++;
				if (!uniqueSliceFiles.has(item.metadata.sopInstanceUid)) {
					uniqueSliceFiles.set(item.metadata.sopInstanceUid, item);
				}
			}
		}

		const firstItem = uniqueSliceFiles.values().next().value;
		if (uniqueSliceFiles.size === 0 || !firstItem) {
			throw new Error("Ни один из переданных файлов не является валидным DICOM файлом.");
		}

		const baseMeta = firstItem.metadata;
		const studyKind = mapModalityKindToStudyKind(baseMeta.modalityKind);
		const tenantDir = getPacsTenantStorageDir(organizationId);
		const safeStudyUid = sanitizeDicomUidForPath(baseMeta.studyInstanceUid);
		const safeSeriesUid = sanitizeDicomUidForPath(baseMeta.seriesInstanceUid);
		const targetDir = path.join(tenantDir, safeStudyUid, safeSeriesUid);
		const studyRelPath = toNormalizedRelativePacsStoragePath(organizationId, targetDir, "pacs");

		// 2. ACID Транзакция с потоковым копированием новых срезов без загрузки серии в RAM
		const writtenFilePaths: string[] = [];
		let patientBinding;
		let studyId: string;
		let seriesId: string;
		let newSlicesInserted: number;
		let duplicateSlicesSkipped: number;
		let finalFileSizeBytes: number;
		try {
			const txResult = await withTenantCtx(organizationId, async (tx) => {
				const binding = await bindPatientFromDicomMetadata(
					organizationId,
					baseMeta,
					autoCreateDraftIfNotFound,
					tx,
				);

				const { studyId: currentStudyId } = await ensureStudyRecord(
					{
						organizationId,
						visitId,
						doctorId,
						sourceKind,
						sourceName,
						toothCode,
						region,
						studyKind,
						storagePath: studyRelPath,
						initialSliceCount: 0,
						initialFileSizeBytes: 0,
						metadata: baseMeta,
						patientBinding: binding,
					},
					tx,
				);

				const currentSeriesId = await ensureSeriesRecord(organizationId, currentStudyId, baseMeta, tx);

				const incomingUids = Array.from(uniqueSliceFiles.keys());
				const existingInstances = await tx
					.select({ sopUid: schema.imagingInstances.dicomSopInstanceUid })
					.from(schema.imagingInstances)
					.where(
						and(
							eq(schema.imagingInstances.organizationId, organizationId),
							eq(schema.imagingInstances.seriesId, currentSeriesId),
							inArray(schema.imagingInstances.dicomSopInstanceUid, incomingUids),
						),
					);

				const existingUidSet = new Set(existingInstances.map((i) => i.sopUid));
				await fs.mkdir(targetDir, { recursive: true });

				const newInstancesRows: Array<typeof schema.imagingInstances.$inferInsert> = [];
				let newBytesTotal = 0;

				const pendingSlices = Array.from(uniqueSliceFiles.entries()).filter(
					([sopUid]) => !existingUidSet.has(sopUid),
				);
				const COPY_CONCURRENCY = 4;
				for (let i = 0; i < pendingSlices.length; i += COPY_CONCURRENCY) {
					const chunk = pendingSlices.slice(i, i + COPY_CONCURRENCY);
					await Promise.all(
						chunk.map(async ([sopUid, item]) => {
							const safeSopUid = sanitizeDicomUidForPath(sopUid);
							const fullFilePath = path.join(targetDir, `${safeSopUid}.dcm`);
							await pipeline(
								fsSync.createReadStream(item.filePath, { highWaterMark: 64 * 1024 }),
								fsSync.createWriteStream(fullFilePath),
							);
							writtenFilePaths.push(fullFilePath);

							const relativePath = toNormalizedRelativePacsStoragePath(organizationId, fullFilePath, "pacs");
							newBytesTotal += item.fileSizeBytes;

							newInstancesRows.push({
								organizationId,
								seriesId: currentSeriesId,
								dicomSopInstanceUid: sopUid,
								sopInstanceUid: sopUid,
								instanceNumber: item.metadata.instanceNumber ?? 1,
								sopClassUid: item.metadata.sopClassUid,
								storagePath: relativePath,
								fileSizeBytes: item.fileSizeBytes,
								sliceLocation: item.metadata.sliceLocation,
								windowCenter: item.metadata.windowCenter,
								windowWidth: item.metadata.windowWidth,
								rows: item.metadata.rows,
								columns: item.metadata.columns,
								cols: item.metadata.columns,
							});
						}),
					);
				}

				const insertedCount = newInstancesRows.length;
				const skippedCount = totalSlicesReceived - insertedCount;

				if (insertedCount > 0) {
					const CHUNK_SIZE = 200;
					for (let i = 0; i < newInstancesRows.length; i += CHUNK_SIZE) {
						const chunk = newInstancesRows.slice(i, i + CHUNK_SIZE);
						await tx.insert(schema.imagingInstances).values(chunk);
					}

					await tx
						.update(schema.imagingStudies)
						.set({
							sliceCount: sql`COALESCE(${schema.imagingStudies.sliceCount}, 0) + ${insertedCount}`,
							fileSizeBytes: sql`COALESCE(${schema.imagingStudies.fileSizeBytes}, 0) + ${newBytesTotal}`,
						})
						.where(
							and(
								eq(schema.imagingStudies.organizationId, organizationId),
								eq(schema.imagingStudies.id, currentStudyId),
							),
						);

					if (binding.patientId) {
						await recordSanpinRadiationDose(organizationId, binding.patientId, baseMeta, doctorId, tx);
					}
				}

				const [finalStudyRow] = await tx
					.select({ fileSizeBytes: schema.imagingStudies.fileSizeBytes })
					.from(schema.imagingStudies)
					.where(
						and(
							eq(schema.imagingStudies.organizationId, organizationId),
							eq(schema.imagingStudies.id, currentStudyId),
						),
					)
					.limit(1);

				return {
					patientBinding: binding,
					studyId: currentStudyId,
					seriesId: currentSeriesId,
					newSlicesInserted: insertedCount,
					duplicateSlicesSkipped: skippedCount,
					finalFileSizeBytes: finalStudyRow?.fileSizeBytes ?? newBytesTotal,
				};
			});
			({ patientBinding, studyId, seriesId, newSlicesInserted, duplicateSlicesSkipped, finalFileSizeBytes } = txResult);
		} catch (txErr) {
			await Promise.all(
				writtenFilePaths.map((p) =>
					fs.unlink(p).catch((unlinkErr) => {
						dicomIngestLogger.warn(`Не удалось удалить DICOM-файл при откате: ${p}`, unlinkErr);
					}),
				),
			);
			throw txErr;
		}

		wsBroker.broadcastToOrganization(organizationId, {
			type: "IMAGING_STUDY_INGESTED",
			payload: {
				studyId,
				seriesId,
				patientId: patientBinding.patientId,
				patientFullName: patientBinding.patientFullName,
				studyInstanceUid: baseMeta.studyInstanceUid,
				modality: baseMeta.modalityKind,
				title: baseMeta.suggestedStudyTitle,
				totalSlicesReceived,
				newSlicesInserted,
				duplicateSlicesSkipped,
				isNewPatientCreated: patientBinding.isNewPatientCreated,
				bindingStatus: patientBinding.bindingStatus,
				sourceName,
			},
		});

		return {
			studyId,
			seriesId,
			patientId: patientBinding.patientId,
			patientFullName: patientBinding.patientFullName,
			studyInstanceUid: baseMeta.studyInstanceUid,
			seriesInstanceUid: baseMeta.seriesInstanceUid,
			modalityKind: baseMeta.modalityKind,
			studyKind,
			totalSlicesReceived,
			newSlicesInserted,
			duplicateSlicesSkipped,
			totalFileSizeBytes: finalFileSizeBytes,
			bindingStatus: patientBinding.bindingStatus,
			bindingConfidence: patientBinding.bindingConfidence,
			isNewPatientCreated: patientBinding.isNewPatientCreated,
			metadata: baseMeta,
		};
	}

	/**
	 * Прием DICOM-файла с диска
	 */
	async ingestFile(filePath: string, options: IngestDicomOptions): Promise<IngestDicomResult> {
		const safeFile = await fs.realpath(this.validateIngestFilesystemPath(filePath));
		const buffer = await fs.readFile(safeFile);
		return this.ingestBuffer(buffer, options);
	}
}

export const dicomStudyIngestService = new DicomStudyIngestService();
