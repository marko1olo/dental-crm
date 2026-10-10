/**
 * patientAutoBinder.ts — Модуль связывания DICOM-исследований с амбулаторными картами пациентов
 * (поиск по ФИО/транслиту/дате рождения/ID, авто-создание карты по Мандату 8e,
 * идемпотентная регистрация исследования/серии с привязкой к пациенту и зеркалирование в xray_scans).
 */

import { and, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import * as schema from "../../../db/schema.js";
import {
	type PatientBindingResult,
	type PatientResolutionInput,
	rebindStudyToPatient,
	resolveOrAutoCreatePatientForDicom,
	unbindStudy,
} from "../dicomPatientAutoBinder.js";
import {
	formatStudyDimensions,
	formatStudyVoxelSpacing,
	formatTechnicalDoseNote,
	parseStudyCapturedAtDate,
} from "./metadataParser.js";
import type {
	DicomIngestMetadata,
	ImagingSourceKindValue,
	ImagingStudyKindValue,
} from "./types.js";

export {
	rebindStudyToPatient,
	resolveOrAutoCreatePatientForDicom,
	unbindStudy,
	type PatientBindingResult,
	type PatientResolutionInput,
};

export interface EnsureStudyRecordParams {
	organizationId: string;
	visitId: string | null;
	doctorId: string | null;
	sourceKind: ImagingSourceKindValue;
	sourceName: string;
	toothCode: string | null;
	region: string | null;
	studyKind: ImagingStudyKindValue;
	storagePath: string;
	initialSliceCount: number;
	initialFileSizeBytes: number;
	metadata: DicomIngestMetadata;
	patientBinding: PatientBindingResult;
}

/**
 * Разрешение или автоматическое создание карточки пациента на основе разобранных метаданных DICOM.
 */
export async function bindPatientFromDicomMetadata(
	organizationId: string,
	metadata: DicomIngestMetadata,
	autoCreateDraftIfNotFound: boolean,
): Promise<PatientBindingResult> {
	return resolveOrAutoCreatePatientForDicom(organizationId, {
		patientFullName: metadata.patientFullName,
		patientChartNumber: metadata.patientChartNumber,
		patientBirthDate: metadata.patientBirthDate,
		patientSex: metadata.patientSex,
		autoCreateDraftIfNotFound,
	});
}

/**
 * Обновление привязки существующего исследования, если ранее пациент не был определен,
 * а в новом срезе серии данные пациента были идентифицированы.
 */
export async function syncExistingStudyPatientBinding(
	studyId: string,
	existingPatientId: string | null,
	patientBinding: PatientBindingResult,
): Promise<void> {
	if (existingPatientId === null && patientBinding.patientId) {
		await db
			.update(schema.imagingStudies)
			.set({
				patientId: patientBinding.patientId,
				bindingStatus: patientBinding.bindingStatus,
				bindingConfidence: patientBinding.bindingConfidence,
				status: "available",
			})
			.where(eq(schema.imagingStudies.id, studyId));
	}
}

/**
 * Идемпотентный поиск или создание записи исследования в таблице imaging_studies с привязкой к пациенту.
 */
export async function ensureStudyRecord(
	params: EnsureStudyRecordParams,
): Promise<{ studyId: string; isNewStudy: boolean }> {
	const {
		organizationId,
		visitId,
		doctorId,
		sourceKind,
		sourceName,
		toothCode,
		region,
		studyKind,
		storagePath,
		initialSliceCount,
		initialFileSizeBytes,
		metadata,
		patientBinding,
	} = params;

	const [existingStudy] = await db
		.select()
		.from(schema.imagingStudies)
		.where(
			and(
				eq(schema.imagingStudies.organizationId, organizationId),
				eq(schema.imagingStudies.studyInstanceUid, metadata.studyInstanceUid),
			),
		)
		.limit(1);

	if (existingStudy) {
		await syncExistingStudyPatientBinding(
			existingStudy.id,
			existingStudy.patientId,
			patientBinding,
		);
		return { studyId: existingStudy.id, isNewStudy: false };
	}

	const initialStudyStatus =
		patientBinding.bindingStatus === "unassigned" ? "needs_review" : "available";
	const capturedAtDate = parseStudyCapturedAtDate(metadata);
	const dimensionsStr = formatStudyDimensions(metadata);
	const voxelSpacingStr = formatStudyVoxelSpacing(metadata);
	const technicalDoseNote = formatTechnicalDoseNote(metadata);

	const [insertedStudy] = await db
		.insert(schema.imagingStudies)
		.values({
			organizationId,
			patientId: patientBinding.patientId,
			visitId,
			doctorId,
			kind: studyKind,
			title: metadata.suggestedStudyTitle,
			toothCode,
			region,
			capturedAt: capturedAtDate,
			sourceKind,
			sourceName,
			status: initialStudyStatus,
			storagePath,
			dicomStudyUid: metadata.studyInstanceUid,
			studyInstanceUid: metadata.studyInstanceUid,
			seriesInstanceUid: metadata.seriesInstanceUid,
			modality: metadata.modalityRaw ?? metadata.modalityKind.toUpperCase(),
			seriesDescription: metadata.seriesDescription ?? technicalDoseNote,
			studyDate: metadata.studyDate,
			sliceCount: initialSliceCount,
			dimensions: dimensionsStr,
			voxelSpacing: voxelSpacingStr,
			fileSizeBytes: initialFileSizeBytes,
			bindingStatus: patientBinding.bindingStatus,
			bindingConfidence: patientBinding.bindingConfidence,
			dicomPatientName: metadata.patientFullName,
			dicomPatientId: metadata.patientChartNumber,
			dicomBirthDate: metadata.patientBirthDate,
		})
		.returning({ id: schema.imagingStudies.id });

	if (!insertedStudy) {
		throw new Error("Не удалось создать запись исследования в PostgreSQL.");
	}

	return { studyId: insertedStudy.id, isNewStudy: true };
}

/**
 * Идемпотентный поиск или создание записи серии в таблице imaging_series.
 */
export async function ensureSeriesRecord(
	organizationId: string,
	studyId: string,
	metadata: DicomIngestMetadata,
): Promise<string> {
	const [existingSeries] = await db
		.select()
		.from(schema.imagingSeries)
		.where(
			and(
				eq(schema.imagingSeries.organizationId, organizationId),
				eq(schema.imagingSeries.studyId, studyId),
				eq(schema.imagingSeries.dicomSeriesUid, metadata.seriesInstanceUid),
			),
		)
		.limit(1);

	if (existingSeries) {
		return existingSeries.id;
	}

	const [insertedSeries] = await db
		.insert(schema.imagingSeries)
		.values({
			organizationId,
			studyId,
			dicomSeriesUid: metadata.seriesInstanceUid,
			seriesNumber: 1,
			modality: metadata.modalityRaw ?? metadata.modalityKind.toUpperCase(),
			bodyPartExamined: "JAW",
			seriesDescription: metadata.seriesDescription ?? metadata.suggestedStudyTitle,
		})
		.returning({ id: schema.imagingSeries.id });

	if (!insertedSeries) {
		throw new Error("Не удалось создать запись серии в PostgreSQL.");
	}

	return insertedSeries.id;
}

/**
 * Зеркалирование прицельных снимков визиографа (modality = intraoral) в таблицу xray_scans
 * для мгновенного отображения в клиническом дневнике 043/у пациента.
 */
export async function mirrorIntraoralXrayScan(params: {
	organizationId: string;
	patientId: string | null;
	visitId: string | null;
	studyId: string;
	relativeStoragePath: string;
	fileSizeBytes: number;
	toothCode: string | null;
	metadata: DicomIngestMetadata;
}): Promise<string | null> {
	const {
		organizationId,
		patientId,
		visitId,
		studyId,
		relativeStoragePath,
		fileSizeBytes,
		toothCode,
		metadata,
	} = params;

	if (metadata.modalityKind !== "intraoral" || !patientId) {
		return null;
	}

	const [existingXray] = await db
		.select({ id: schema.xrayScans.id })
		.from(schema.xrayScans)
		.where(
			and(
				eq(schema.xrayScans.organizationId, organizationId),
				eq(schema.xrayScans.patientId, patientId),
				eq(schema.xrayScans.originalFilename, `${metadata.sopInstanceUid}.dcm`),
			),
		)
		.limit(1);

	if (existingXray) {
		return existingXray.id;
	}

	const kvpNote = metadata.kvp ? ` ${metadata.kvp} кВ` : "";
	const maNote = metadata.ma ? ` ${metadata.ma} мА` : "";
	const expNote = metadata.exposureTimeMs ? ` ${metadata.exposureTimeMs} мс` : "";
	const dapNote = metadata.doseAreaProductDap ? ` (DAP: ${metadata.doseAreaProductDap})` : "";
	const technicalNote = `Визиограф EzSensor:${kvpNote}${maNote}${expNote}${dapNote}`.trim();

	const [insertedXray] = await db
		.insert(schema.xrayScans)
		.values({
			organizationId,
			patientId,
			visitId,
			storagePath: relativeStoragePath,
			fileUrl: `/api/imaging/studies/${studyId}/file`,
			fileSizeBytes,
			originalFilename: `${metadata.sopInstanceUid}.dcm`,
			mimeType: "application/dicom",
			status: "done",
			kind: "periapical",
			toothCode,
			notes: technicalNote,
		})
		.returning({ id: schema.xrayScans.id });

	return insertedXray?.id ?? null;
}
