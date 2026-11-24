/**
 * pacsDbRegistration.ts — Атомарная регистрация рентген-снимков и DICOM исследований в БД.
 * Декомпозиция монолита LocalPacsStorageService (Мандат 8b & 8bo).
 * Гарантирует атомарную транзакцию триады (study -> series -> instance) без глухих catch.
 */

import { and, desc, eq } from "drizzle-orm";
import { withTenantCtx } from "../../db/rls.js";
import { imagingInstances, imagingSeries, imagingStudies, patients, visits } from "../../db/schema.js";
import type { LocalRadiologyScanInput, LocalRadiologyScanResult } from "./pacsTypes.js";

export class PacsDbRegistration {
	/**
	 * Атомарная регистрация триады PACS (imaging_studies -> imaging_series -> imaging_instances)
	 * в единой транзакции (Мандат 8bo). Никаких глухих catch: при сбое серии или инстанса
	 * происходит полный откат транзакции.
	 */
	public static async registerLocalRadiologyScanInDb(
		input: LocalRadiologyScanInput,
		params: {
			studyUid: string;
			normalizedStoragePath: string;
			fileSizeBytes: number;
			fileSizeMb: number;
			fileExistsLocally: boolean;
			isMultiGigabyteScan: boolean;
		},
	): Promise<LocalRadiologyScanResult> {
		const now = new Date();
		const capturedAtIso = now.toISOString();

		const resultStudy = await withTenantCtx(input.organizationId, async (tx) => {
			// 1. Проверка владения пациентом
			const [ownedPatient] = await tx
				.select({ id: patients.id })
				.from(patients)
				.where(and(eq(patients.organizationId, input.organizationId), eq(patients.id, input.patientId)))
				.limit(1);

			if (!ownedPatient) {
				throw new Error("Пациент не принадлежит организации: сохранение снимка отклонено.");
			}

			// 2. Проверка владения приёмом (если указан)
			if (input.visitId) {
				const [ownedVisit] = await tx
					.select({ id: visits.id })
					.from(visits)
					.where(
						and(
							eq(visits.organizationId, input.organizationId),
							eq(visits.id, input.visitId),
							eq(visits.patientId, input.patientId),
						),
					)
					.limit(1);

				if (!ownedVisit) {
					throw new Error("Приём не принадлежит организации или пациенту: сохранение снимка отклонено.");
				}
			}

			const title = input.title.trim() || `Снимок ${input.kind.toUpperCase()}`;
			const seriesUid = input.dicomSeriesUid || `${params.studyUid}.1`;
			const sopUid = input.dicomSopInstanceUid || `${seriesUid}.1`;

			const kindUpper = input.kind.toUpperCase();
			const modality =
				kindUpper === "CBCT" || kindUpper === "CT"
					? "CT"
					: kindUpper === "RVG" || input.kind === "periapical"
						? "IO"
						: kindUpper === "OPG" || input.kind === "opg"
							? "PX"
							: "OT";

			// 3. Создание канонического исследования imaging_studies со статусом 'available'
			const [studyRecord] = await tx
				.insert(imagingStudies)
				.values({
					organizationId: input.organizationId,
					patientId: input.patientId,
					visitId: input.visitId || null,
					doctorId: input.doctorId || null,
					kind: input.kind,
					title: title.length > 180 ? title.slice(0, 180) : title,
					toothCode: input.toothCode || null,
					region: input.region || null,
					capturedAt: now,
					sourceKind: "dicom_file",
					sourceName: input.sourceName || "Local Station PACS",
					status: "available",
					aiSummary: input.localThumbnailDataUri
						? "Снимок готов к приему. Локальный кэш сформирован."
						: null,
					storagePath: params.normalizedStoragePath,
					dicomStudyUid: params.studyUid,
					studyInstanceUid: params.studyUid,
					seriesInstanceUid: seriesUid,
					modality,
					fileSizeBytes: params.fileSizeBytes || null,
					bindingStatus: "manual_bound",
					bindingConfidence: 100,
				})
				.returning();

			if (!studyRecord) {
				throw new Error("Не удалось создать запись исследования imaging_studies.");
			}

			// 4. Обязательное создание серии DICOM imaging_series
			const [seriesRow] = await tx
				.insert(imagingSeries)
				.values({
					organizationId: input.organizationId,
					studyId: studyRecord.id,
					dicomSeriesUid: seriesUid,
					seriesNumber: 1,
					modality,
					bodyPartExamined: input.region || "HEAD / JAW",
					seriesDescription: title,
				})
				.returning();

			if (!seriesRow) {
				throw new Error("Не удалось создать серию снимков imaging_series.");
			}

			// 5. Обязательное создание инстанса imaging_instances
			await tx.insert(imagingInstances).values({
				organizationId: input.organizationId,
				seriesId: seriesRow.id,
				dicomSopInstanceUid: sopUid,
				sopInstanceUid: sopUid,
				instanceNumber: 1,
				storagePath: params.normalizedStoragePath,
				storageKey: params.normalizedStoragePath,
				fileSizeBytes: params.fileSizeBytes || null,
			});

			return studyRecord;
		});

		return {
			studyId: resultStudy.id,
			organizationId: input.organizationId,
			patientId: input.patientId,
			visitId: input.visitId || null,
			kind: input.kind,
			title: resultStudy.title || input.title,
			toothCode: input.toothCode || null,
			region: input.region || null,
			localFilePath: params.normalizedStoragePath,
			localOfflineAvailable: true,
			cloudSyncStatus: "local_only",
			canStartConsultationImmediately: true,
			capturedAt: capturedAtIso,
			dicomStudyUid: params.studyUid,
			diagnostics: {
				fileSizeMb: params.fileSizeMb,
				fileExistsLocally: params.fileExistsLocally,
				localReadinessScore: params.fileExistsLocally ? 1.0 : 0.0,
				thumbnailAvailable: Boolean(input.localThumbnailDataUri),
				isMultiGigabyteScan: params.isMultiGigabyteScan,
			},
		};
	}

	/**
	 * Получение исследования из БД для консультации
	 */
	public static async getStudyByIdFromDb(organizationId: string, studyId: string) {
		const [study] = await withTenantCtx(organizationId, async (tx) =>
			tx
				.select()
				.from(imagingStudies)
				.where(and(eq(imagingStudies.id, studyId), eq(imagingStudies.organizationId, organizationId)))
				.limit(1),
		);
		return study ?? null;
	}

	/**
	 * Получение списка последних снимков организации для очереди синхронизации
	 */
	public static async listRecentStudiesFromDb(organizationId: string, limit = 50) {
		return withTenantCtx(organizationId, async (tx) =>
			tx
				.select({
					id: imagingStudies.id,
					patientId: imagingStudies.patientId,
					title: imagingStudies.title,
					storagePath: imagingStudies.storagePath,
					createdAt: imagingStudies.createdAt,
				})
				.from(imagingStudies)
				.where(eq(imagingStudies.organizationId, organizationId))
				.orderBy(desc(imagingStudies.createdAt))
				.limit(limit),
		);
	}
}
