/**
 * ingestPipeline.ts — Layer 3: Конвейер дедупликации, авто-распаковки,
 * связывания с пациентом, регистрации в БД и WebSocket-оповещения врача.
 */

import path from "node:path";
import { db } from "../../../db/client.js";
import * as schema from "../../../db/schema.js";
import { wsBroker } from "../../websocketBroker.js";
import {
	buildStudyFingerprint,
	buildStudyStorageFolderName,
	type DicomCrawlerDiscoveredStudy,
} from "@dental/shared";
import { scanDicomSeriesFolder } from "../../imaging/dicomMetadataParser.js";
import { inspectZipForDicom, unpackZipArchive } from "./archiveInspector.js";
import {
	findExistingStudyByUid,
	findExistingStudyByUidOrPath,
	matchOrCreatePatient,
} from "./studyMatcher.js";
import type { CrawlerPipelineContext } from "./types.js";

/**
 * Обработка найденного архива .zip:
 * инспекция, проверка дедупликации, распаковка в защищенный кэш и регистрация в CRM.
 */
export async function processArchiveCandidate(
	archivePath: string,
	orgId: string,
	context: CrawlerPipelineContext,
): Promise<DicomCrawlerDiscoveredStudy | null> {
	const inspection = await inspectZipForDicom(archivePath, context.errors);
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
	const existingInRegistry = context.registeredStudies.get(studyUid);
	if (existingInRegistry) {
		if (!existingInRegistry.archivePath) {
			existingInRegistry.archivePath = archivePath;
		}
		existingInRegistry.status = "duplicate_resolved";
		context.incrementDuplicatesAvoided();
		context.emitEvent("duplicateAvoided", { studyUid, archivePath });
		return existingInRegistry;
	}

	// 2. ДЕДУПЛИКАЦИЯ: Проверяем базу данных PostgreSQL
	const existingDb = await findExistingStudyByUid(orgId, studyUid);
	if (existingDb) {
		context.incrementDuplicatesAvoided();
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
		context.registeredStudies.set(studyUid, discovered);
		context.fingerprintIndex.set(fingerprint, studyUid);
		return discovered;
	}

	// 3. АВТО-РАСПАКОВКА В КЭШ
	const folderName = buildStudyStorageFolderName({
		studyDate: inspection.studyDate,
		patientName: inspection.patientName,
		modality: inspection.modality,
		sliceCount: inspection.sliceCount,
		studyInstanceUid: studyUid,
	});
	const targetCacheDir = path.join(context.config.cacheDir, folderName);

	let unpackedPath: string | null = null;
	if (context.config.autoUnpack) {
		try {
			await unpackZipArchive(
				archivePath,
				targetCacheDir,
				{
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
				},
				{
					onJunkSkipped: (bytes: number) => context.incrementJunkSkipped(bytes),
				},
				context.errors,
			);
			unpackedPath = targetCacheDir;
		} catch (err) {
			context.errors.push(`Сбой распаковки архива ${archivePath}: ${String(err)}`);
		}
	}

	// 4. Связывание с пациентом CRM
	const patientBinding = await matchOrCreatePatient(orgId, {
		patientFullName: inspection.patientName,
		patientChartNumber: inspection.patientId,
		patientBirthDate: inspection.patientBirthDate,
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

	context.registeredStudies.set(studyUid, studyRecord);
	context.fingerprintIndex.set(fingerprint, studyUid);

	// Оповещаем фронтенд через WebSocket
	wsBroker.broadcastToOrganization(orgId, {
		type: "DICOM_CRAWLER_STUDY_DISCOVERED",
		payload: studyRecord,
	});

	context.emitEvent("studyDiscovered", studyRecord);
	return studyRecord;
}

/**
 * Обработка распакованной папки исследования томографа:
 * чтение срезов, сопоставление с базой, дедупликация и регистрация.
 */
export async function processFolderCandidate(
	folderPath: string,
	orgId: string,
	context: CrawlerPipelineContext,
): Promise<DicomCrawlerDiscoveredStudy | null> {
	const seriesSummary = await scanDicomSeriesFolder(folderPath);
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

	// 1. ДЕДУПЛИКАЦИЯ: Проверяем реестр в памяти
	const existingInRegistry = context.registeredStudies.get(studyUid);
	if (existingInRegistry) {
		if (!existingInRegistry.unpackedFolderPath) {
			existingInRegistry.unpackedFolderPath = folderPath;
		}
		existingInRegistry.status = "duplicate_resolved";
		context.incrementDuplicatesAvoided();
		context.emitEvent("duplicateAvoided", { studyUid, folderPath });
		return existingInRegistry;
	}

	// 2. ДЕДУПЛИКАЦИЯ: Проверяем базу данных PostgreSQL
	const existingDb = await findExistingStudyByUidOrPath(orgId, studyUid, folderPath);
	if (existingDb) {
		context.incrementDuplicatesAvoided();
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
		context.registeredStudies.set(studyUid, discovered);
		context.fingerprintIndex.set(fingerprint, studyUid);
		return discovered;
	}

	// 3. Связывание с пациентом CRM
	const patientBinding = await matchOrCreatePatient(orgId, {
		patientFullName: seriesSummary.patientName,
		patientChartNumber: seriesSummary.patientId,
		patientBirthDate: seriesSummary.patientBirthDate,
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

	context.registeredStudies.set(studyUid, studyRecord);
	context.fingerprintIndex.set(fingerprint, studyUid);

	wsBroker.broadcastToOrganization(orgId, {
		type: "DICOM_CRAWLER_STUDY_DISCOVERED",
		payload: studyRecord,
	});

	context.emitEvent("studyDiscovered", studyRecord);
	return studyRecord;
}
