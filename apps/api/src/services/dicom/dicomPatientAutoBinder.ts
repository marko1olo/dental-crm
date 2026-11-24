/**
 * dicomPatientAutoBinder.ts — Единый SSOT автопривязки и регистрации DICOM-исследований к пациентам в PostgreSQL 18
 * (поиск по UUID/номеру карты/ФИО, авто-создание карты, регистрация study/series и зеркалирование в xray_scans).
 */

import { and, eq, sql } from "drizzle-orm";
import { db, type TenantDb } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import * as schema from "../../db/schema.js";
import { matchPatientForDicom } from "../../routes/imaging/patientFioBindingEngine.js";
import {
	formatStudyDimensions,
	formatStudyVoxelSpacing,
	formatTechnicalDoseNote,
	parseStudyCapturedAtDate,
} from "./ingest/metadataParser.js";
import type {
	DicomIngestMetadata,
	ImagingSourceKindValue,
	ImagingStudyKindValue,
} from "./ingest/types.js";

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface PatientBindingResult {
	patientId: string | null;
	patientFullName: string | null;
	isNewPatientCreated: boolean;
	bindingStatus: "auto_bound" | "manual_bound" | "pending_review" | "unassigned";
	bindingConfidence: number;
	matchMethod: string;
	matchDetails: string;
}

export interface PatientResolutionInput {
	patientFullName: string | null;
	patientChartNumber: string | null;
	patientBirthDate: string | null;
	patientSex?: "male" | "female" | null;
	autoCreateDraftIfNotFound?: boolean;
}

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
 * Резолвинг или авто-создание пациента для входящего DICOM-исследования.
 */
export async function resolveOrAutoCreatePatientForDicom(
	organizationId: string,
	input: PatientResolutionInput,
	targetDb: TenantDb = db,
): Promise<PatientBindingResult> {
	const {
		patientFullName,
		patientChartNumber,
		patientBirthDate,
		patientSex,
		autoCreateDraftIfNotFound = true,
	} = input;

	const runResolve = async (tx: TenantDb): Promise<PatientBindingResult> => {
		// 1. Поиск по прямому номеру карты Vatech / амбулаторной карте (pat_chartno / patient_id)
		if (patientChartNumber && patientChartNumber.trim().length > 0) {
			const rawChart = patientChartNumber.trim();

			// Если это валидный UUID нашего CRM
			if (UUID_SHAPE.test(rawChart)) {
				const [directUuidMatch] = await tx
					.select({
						id: schema.patients.id,
						fullName: schema.patients.fullName,
						mergedIntoPatientId: schema.patients.mergedIntoPatientId,
					})
					.from(schema.patients)
					.where(
						and(
							eq(schema.patients.organizationId, organizationId),
							eq(schema.patients.id, rawChart),
						),
					)
					.limit(1);

				if (directUuidMatch) {
					const effectiveId = directUuidMatch.mergedIntoPatientId ?? directUuidMatch.id;
					return {
						patientId: effectiveId,
						patientFullName: directUuidMatch.fullName,
						isNewPatientCreated: false,
						bindingStatus: "auto_bound",
						bindingConfidence: 100,
						matchMethod: "exact_uuid_match",
						matchDetails: `Прямое совпадение по UUID пациента: ${directUuidMatch.fullName}`,
					};
				}
			}

			// Поиск по administrativeProfile->chartNumber, vatechPatId или medicalCardNumber
			const [chartMatch] = await tx
				.select({
					id: schema.patients.id,
					fullName: schema.patients.fullName,
					mergedIntoPatientId: schema.patients.mergedIntoPatientId,
				})
				.from(schema.patients)
				.where(
					and(
						eq(schema.patients.organizationId, organizationId),
						sql`(${schema.patients.administrativeProfile}->>'chartNumber' = ${rawChart} 
							OR ${schema.patients.administrativeProfile}->>'vatechPatId' = ${rawChart}
							OR ${schema.patients.administrativeProfile}->>'medicalCardNumber' = ${rawChart})`,
					),
				)
				.limit(1);

			if (chartMatch) {
				const effectiveId = chartMatch.mergedIntoPatientId ?? chartMatch.id;
				return {
					patientId: effectiveId,
					patientFullName: chartMatch.fullName,
					isNewPatientCreated: false,
					bindingStatus: "auto_bound",
					bindingConfidence: 100,
					matchMethod: "exact_chart_number_match",
					matchDetails: `Точное совпадение по номеру карты/ID аппарата (${rawChart}): ${chartMatch.fullName}`,
				};
			}
		}

		// 2. Интеллектуальный поиск по ФИО и дате рождения через patientFioBindingEngine
		if (patientFullName && patientFullName.trim().length > 0) {
			const autoBindRes = await matchPatientForDicom(
				organizationId,
				{
					dicomPatientName: patientFullName,
					dicomPatientId: patientChartNumber,
					dicomBirthDate: patientBirthDate,
				},
				tx,
			);

			if (autoBindRes.patientId && autoBindRes.status === "auto_bound") {
				return {
					patientId: autoBindRes.patientId,
					patientFullName: autoBindRes.patientFullName,
					isNewPatientCreated: false,
					bindingStatus: "auto_bound",
					bindingConfidence: autoBindRes.confidence,
					matchMethod: autoBindRes.matchMethod,
					matchDetails: autoBindRes.matchDetails,
				};
			}

			// Если уверенность частичная (pending_review), возвращаем кандидата
			if (autoBindRes.patientId && autoBindRes.status === "pending_review") {
				return {
					patientId: autoBindRes.patientId,
					patientFullName: autoBindRes.patientFullName,
					isNewPatientCreated: false,
					bindingStatus: "pending_review",
					bindingConfidence: autoBindRes.confidence,
					matchMethod: autoBindRes.matchMethod,
					matchDetails: autoBindRes.matchDetails,
				};
			}
		}

		// 3. Авто-создание карточки пациента при прямом приеме с аппарата
		if (autoCreateDraftIfNotFound && (patientFullName || patientChartNumber)) {
			const generatedFullName =
				patientFullName && patientFullName.trim().length > 0
					? patientFullName.trim()
					: `Пациент карты ${patientChartNumber ?? new Date().toLocaleDateString("ru-RU")}`;

			const adminProfile = (patientChartNumber || patientSex) ? {
				chartNumber: patientChartNumber ?? null,
				medicalCardNumber: patientChartNumber ?? null,
				vatechPatId: patientChartNumber ?? null,
				gender: patientSex ?? null,
			} : null;

			const [newPatient] = await tx
				.insert(schema.patients)
				.values({
					organizationId,
					fullName: generatedFullName,
					birthDate: patientBirthDate,
					status: "active",
					isSynced: false,
					notes: "Автоматически создан при прямом приеме снимка с аппарата лучевой диагностики.",
					administrativeProfile: adminProfile,
				})
				.returning({
					id: schema.patients.id,
					fullName: schema.patients.fullName,
				});

			if (newPatient) {
				return {
					patientId: newPatient.id,
					patientFullName: newPatient.fullName,
					isNewPatientCreated: true,
					bindingStatus: "auto_bound",
					bindingConfidence: 95,
					matchMethod: "auto_created_from_dicom",
					matchDetails: `Создана новая амбулаторная карточка пациента: ${newPatient.fullName}`,
				};
			}
		}

		// 4. Пациент не идентифицирован — исследование уходит в неразобранную очередь PACS
		return {
			patientId: null,
			patientFullName: null,
			isNewPatientCreated: false,
			bindingStatus: "unassigned",
			bindingConfidence: 0,
			matchMethod: "unassigned",
			matchDetails: "Данные пациента не совпали с картотекой клиники (направлено в очередь неразобранных снимков).",
		};
	};

	if (targetDb !== db) {
		return runResolve(targetDb);
	}
	return withTenantCtx(organizationId, async (tx) => runResolve(tx));
}

/**
 * Разрешение или автоматическое создание карточки пациента на основе разобранных метаданных DICOM.
 */
export async function bindPatientFromDicomMetadata(
	organizationId: string,
	metadata: DicomIngestMetadata,
	autoCreateDraftIfNotFound: boolean,
	executor: TenantDb = db,
): Promise<PatientBindingResult> {
	return resolveOrAutoCreatePatientForDicom(
		organizationId,
		{
			patientFullName: metadata.patientFullName,
			patientChartNumber: metadata.patientChartNumber,
			patientBirthDate: metadata.patientBirthDate,
			patientSex: metadata.patientSex,
			autoCreateDraftIfNotFound,
		},
		executor,
	);
}

/**
 * Обновление привязки существующего исследования, если ранее пациент не был определен.
 */
export async function syncExistingStudyPatientBinding(
	studyId: string,
	existingPatientId: string | null,
	patientBinding: PatientBindingResult,
	executor: TenantDb = db,
): Promise<void> {
	if (existingPatientId === null && patientBinding.patientId) {
		await executor
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
 * Идемпотентный поиск или создание записи исследования в таблице imaging_studies.
 */
export async function ensureStudyRecord(
	params: EnsureStudyRecordParams,
	executor: TenantDb = db,
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

	const [existingStudy] = await executor
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
			executor,
		);
		return { studyId: existingStudy.id, isNewStudy: false };
	}

	const initialStudyStatus =
		patientBinding.bindingStatus === "unassigned" ? "needs_review" : "available";
	const capturedAtDate = parseStudyCapturedAtDate(metadata);
	const dimensionsStr = formatStudyDimensions(metadata);
	const voxelSpacingStr = formatStudyVoxelSpacing(metadata);
	const technicalDoseNote = formatTechnicalDoseNote(metadata);

	const [insertedStudy] = await executor
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
	executor: TenantDb = db,
): Promise<string> {
	const [existingSeries] = await executor
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

	const [insertedSeries] = await executor
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
 * Зеркалирование прицельных снимков визиографа в таблицу xray_scans.
 */
export async function mirrorIntraoralXrayScan(
	params: {
		organizationId: string;
		patientId: string | null;
		visitId: string | null;
		studyId: string;
		relativeStoragePath: string;
		fileSizeBytes: number;
		toothCode: string | null;
		metadata: DicomIngestMetadata;
	},
	executor: TenantDb = db,
): Promise<string | null> {
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

	const [existingXray] = await executor
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

	const [insertedXray] = await executor
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

/**
 * Ручная перепривязка исследования к другому пациенту из картотеки.
 */
export async function rebindStudyToPatient(
	organizationId: string,
	studyId: string,
	targetPatientId: string,
): Promise<{
	success: boolean;
	studyId: string;
	patientId: string;
	patientFullName: string;
	bindingStatus: "manual_bound";
	bindingConfidence: number;
	matchMethod: "manual_bound_by_doctor";
	matchDetails: string;
}> {
	if (!UUID_SHAPE.test(studyId)) {
		throw new Error(`Невалидный UUID исследования: ${studyId}`);
	}
	if (!UUID_SHAPE.test(targetPatientId)) {
		throw new Error(`Невалидный UUID пациента: ${targetPatientId}`);
	}

	return withTenantCtx(organizationId, async (tx) => {
		const [patient] = await tx
			.select({
				id: schema.patients.id,
				fullName: schema.patients.fullName,
				mergedIntoPatientId: schema.patients.mergedIntoPatientId,
			})
			.from(schema.patients)
			.where(
				and(
					eq(schema.patients.organizationId, organizationId),
					eq(schema.patients.id, targetPatientId),
				),
			)
			.limit(1);

		if (!patient) {
			throw new Error(`Пациент с ID ${targetPatientId} не найден в базе клиники.`);
		}

		const effectivePatientId = patient.mergedIntoPatientId ?? patient.id;

		const [updatedStudy] = await tx
			.update(schema.imagingStudies)
			.set({
				patientId: effectivePatientId,
				bindingStatus: "manual_bound",
				bindingConfidence: 100,
				aiSummary: `Вручную привязано врачом к пациенту: ${patient.fullName}`,
			})
			.where(
				and(
					eq(schema.imagingStudies.organizationId, organizationId),
					eq(schema.imagingStudies.id, studyId),
				),
			)
			.returning({ id: schema.imagingStudies.id });

		if (!updatedStudy) {
			throw new Error(`Исследование с ID ${studyId} не найдено в базе клиники.`);
		}

		return {
			success: true,
			studyId,
			patientId: effectivePatientId,
			patientFullName: patient.fullName,
			bindingStatus: "manual_bound",
			bindingConfidence: 100,
			matchMethod: "manual_bound_by_doctor",
			matchDetails: `Исследование КТ успешно перепривязано врачом к пациенту ${patient.fullName}.`,
		};
	});
}

/**
 * Ручная отвязка исследования от пациента (перевод в неразобранную очередь).
 */
export async function unbindStudy(
	organizationId: string,
	studyId: string,
): Promise<{
	success: boolean;
	studyId: string;
	patientId: null;
	bindingStatus: "unassigned";
}> {
	if (!UUID_SHAPE.test(studyId)) {
		throw new Error(`Невалидный UUID исследования: ${studyId}`);
	}

	return withTenantCtx(organizationId, async (tx) => {
		const [updatedStudy] = await tx
			.update(schema.imagingStudies)
			.set({
				patientId: null,
				bindingStatus: "unassigned",
				bindingConfidence: 0,
				aiSummary: "Исследование отвязано от пациента врачом",
			})
			.where(
				and(
					eq(schema.imagingStudies.organizationId, organizationId),
					eq(schema.imagingStudies.id, studyId),
				),
			)
			.returning({ id: schema.imagingStudies.id });

		if (!updatedStudy) {
			throw new Error(`Исследование с ID ${studyId} не найдено в базе клиники.`);
		}

		return {
			success: true,
			studyId,
			patientId: null,
			bindingStatus: "unassigned",
		};
	});
}
