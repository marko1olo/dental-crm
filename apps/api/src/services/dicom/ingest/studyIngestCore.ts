/**
 * studyIngestCore.ts — Ядро сквозного приема, сохранения в PACS-хранилище,
 * дедупликации срезов и регистрации DICOM-исследований в PostgreSQL 18.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../../db/client.js";
import * as schema from "../../../db/schema.js";
import {
	getPacsTenantStorageDir,
	toNormalizedRelativePacsStoragePath,
} from "../../imaging/localPacsSanitizer.js";
import { wsBroker } from "../../websocketBroker.js";
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
} from "./patientAutoBinder.js";
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

		// 2. Интеллектуальное связывание с пациентом или авто-создание карточки (Мандат 8e)
		const patientBinding = await bindPatientFromDicomMetadata(
			organizationId,
			metadata,
			autoCreateDraftIfNotFound,
		);

		// 3. Сохранение файла на диск в изолированный tenant-каталог
		const tenantDir = getPacsTenantStorageDir(organizationId);
		const safeStudyUid = sanitizeDicomUidForPath(metadata.studyInstanceUid);
		const safeSeriesUid = sanitizeDicomUidForPath(metadata.seriesInstanceUid);
		const safeSopUid = sanitizeDicomUidForPath(metadata.sopInstanceUid);

		const targetDir = path.join(tenantDir, safeStudyUid, safeSeriesUid);
		await fs.mkdir(targetDir, { recursive: true });

		const fullFilePath = path.join(targetDir, `${safeSopUid}.dcm`);
		await fs.writeFile(fullFilePath, buffer);

		const relativeStoragePath = toNormalizedRelativePacsStoragePath(organizationId, fullFilePath, "pacs");

		// 4. Определение модальности для базы и регистрация исследования/серии
		const studyKind = mapModalityKindToStudyKind(metadata.modalityKind);
		const { studyId, isNewStudy } = await ensureStudyRecord({
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
			patientBinding,
		});

		const seriesId = await ensureSeriesRecord(organizationId, studyId, metadata);

		// 5. СТРОГАЯ ДЕДУПЛИКАЦИЯ: Поиск существующего экземпляра (imaging_instances)
		const [existingInstance] = await db
			.select()
			.from(schema.imagingInstances)
			.where(
				and(
					eq(schema.imagingInstances.organizationId, organizationId),
					eq(schema.imagingInstances.seriesId, seriesId),
					eq(schema.imagingInstances.dicomSopInstanceUid, metadata.sopInstanceUid),
				),
			)
			.limit(1);

		let instanceId: string;
		let isDuplicate = false;

		if (existingInstance) {
			instanceId = existingInstance.id;
			isDuplicate = true;
		} else {
			const [insertedInstance] = await db
				.insert(schema.imagingInstances)
				.values({
					organizationId,
					seriesId,
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
			instanceId = insertedInstance.id;

			if (!isNewStudy) {
				await db
					.update(schema.imagingStudies)
					.set({
						sliceCount: sql`COALESCE(${schema.imagingStudies.sliceCount}, 0) + 1`,
						fileSizeBytes: sql`COALESCE(${schema.imagingStudies.fileSizeBytes}, 0) + ${buffer.length}`,
					})
					.where(eq(schema.imagingStudies.id, studyId));
			}

			if (patientBinding.patientId) {
				await recordSanpinRadiationDose(organizationId, patientBinding.patientId, metadata, doctorId);
			}
		}

		// 6. Зеркалирование для визиографов (modality = intraoral) в xray_scans
		const xrayScanId = await mirrorIntraoralXrayScan({
			organizationId,
			patientId: patientBinding.patientId,
			visitId,
			studyId,
			relativeStoragePath,
			fileSizeBytes: buffer.length,
			toothCode,
			metadata,
		});

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
		if (uniqueInstancesMap.size === 0) {
			throw new Error("Ни один из переданных буферов не является валидным DICOM файлом.");
		}

		const firstItem = uniqueInstancesMap.values().next().value!;
		const baseMeta = firstItem.metadata;

		// 2. Интеллектуальное связывание с пациентом или авто-создание карточки (Мандат 8e)
		const patientBinding = await bindPatientFromDicomMetadata(
			organizationId,
			baseMeta,
			autoCreateDraftIfNotFound,
		);

		const studyKind = mapModalityKindToStudyKind(baseMeta.modalityKind);
		const tenantDir = getPacsTenantStorageDir(organizationId);
		const safeStudyUid = sanitizeDicomUidForPath(baseMeta.studyInstanceUid);
		const safeSeriesUid = sanitizeDicomUidForPath(baseMeta.seriesInstanceUid);
		const targetDir = path.join(tenantDir, safeStudyUid, safeSeriesUid);
		const studyRelPath = toNormalizedRelativePacsStoragePath(organizationId, targetDir, "pacs");

		// 3. Поиск или создание исследования и серии в PostgreSQL 18
		const { studyId } = await ensureStudyRecord({
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
			patientBinding,
		});

		const seriesId = await ensureSeriesRecord(organizationId, studyId, baseMeta);

		// 4. Проверка существующих экземпляров в базе данных (Deduplication Gate)
		const incomingUids = Array.from(uniqueInstancesMap.keys());
		const existingInstances = await db
			.select({ sopUid: schema.imagingInstances.dicomSopInstanceUid })
			.from(schema.imagingInstances)
			.where(
				and(
					eq(schema.imagingInstances.organizationId, organizationId),
					eq(schema.imagingInstances.seriesId, seriesId),
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

			const relativePath = toNormalizedRelativePacsStoragePath(organizationId, fullFilePath, "pacs");
			newBytesTotal += item.buffer.length;

			newInstancesRows.push({
				organizationId,
				seriesId,
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

		const newSlicesInserted = newInstancesRows.length;
		const duplicateSlicesSkipped = buffers.length - newSlicesInserted;

		// 5. Батчевая вставка новых экземпляров в imaging_instances
		if (newSlicesInserted > 0) {
			const CHUNK_SIZE = 200;
			for (let i = 0; i < newInstancesRows.length; i += CHUNK_SIZE) {
				const chunk = newInstancesRows.slice(i, i + CHUNK_SIZE);
				await db.insert(schema.imagingInstances).values(chunk);
			}

			await db
				.update(schema.imagingStudies)
				.set({
					sliceCount: sql`COALESCE(${schema.imagingStudies.sliceCount}, 0) + ${newSlicesInserted}`,
					fileSizeBytes: sql`COALESCE(${schema.imagingStudies.fileSizeBytes}, 0) + ${newBytesTotal}`,
				})
				.where(eq(schema.imagingStudies.id, studyId));

			if (patientBinding.patientId) {
				await recordSanpinRadiationDose(organizationId, patientBinding.patientId, baseMeta, doctorId);
			}
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

		const [finalStudy] = await db
			.select()
			.from(schema.imagingStudies)
			.where(eq(schema.imagingStudies.id, studyId))
			.limit(1);

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
			totalFileSizeBytes: finalStudy?.fileSizeBytes ?? newBytesTotal,
			bindingStatus: patientBinding.bindingStatus,
			bindingConfidence: patientBinding.bindingConfidence,
			isNewPatientCreated: patientBinding.isNewPatientCreated,
			metadata: baseMeta,
		};
	}

	/**
	 * Пакетный прием серии DICOM файлов напрямую из каталога на диске
	 * (например, папка исследования томографа из 400 срезов).
	 */
	async ingestSeriesFolder(folderPath: string, options: IngestDicomOptions): Promise<IngestBatchResult> {
		const entries = await fs.readdir(folderPath, { withFileTypes: true });
		const filePaths: string[] = [];

		for (const entry of entries) {
			if (entry.isFile()) {
				const ext = path.extname(entry.name).toLowerCase();
				if (ext === ".dcm" || ext === "" || ext === ".dicom") {
					filePaths.push(path.join(folderPath, entry.name));
				}
			}
		}

		if (filePaths.length === 0) {
			throw new Error(`В каталоге ${folderPath} не найдено ни одного файла DICOM.`);
		}

		const readResults = await Promise.all(
			filePaths.map(async (fp) => {
				try {
					const buf = await fs.readFile(fp);
					return buf.length >= 132 ? buf : null;
				} catch (err) {
					console.warn(`Не удалось прочитать файл ${fp}:`, err);
					return null;
				}
			}),
		);
		const buffers = readResults.filter((b): b is NonNullable<typeof b> => b !== null) as Buffer[];

		return this.ingestBatch(buffers, options);
	}

	/**
	 * Прием DICOM-файла с диска
	 */
	async ingestFile(filePath: string, options: IngestDicomOptions): Promise<IngestDicomResult> {
		const buffer = await fs.readFile(filePath);
		return this.ingestBuffer(buffer, options);
	}
}

export const dicomStudyIngestService = new DicomStudyIngestService();
