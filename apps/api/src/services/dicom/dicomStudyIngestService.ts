/**
 * dicomStudyIngestService.ts — Сервис сквозного приема и сохранения DICOM-исследований.
 * 
 * Отвечает за:
 * 1. Парсинг бинарного буфера DICOM (метаданные, доза, геометрия).
 * 2. Автоматическое связывание с пациентом или авто-создание карты (Мандат 8e Doctor Autonomy).
 * 3. Сохранение файла в изолированное PACS-хранилище клиники (152-ФЗ / multi-tenant).
 * 4. Запись в таблицы PostgreSQL 18: imaging_studies, imaging_series, imaging_instances.
 * 5. Батчевый прием серий срезов КТ (до 400+ срезов) с единовременной вставкой в imaging_instances
 *    и защитой от дублирования по SOPInstanceUID.
 * 6. Автоматическая фиксация лучевой нагрузки (kVp, mA, время, DAP) в официальном журнале по СанПиН 2.6.1.1192-03.
 * 7. Для визиографов (modality = intraoral) — зеркалирование в xray_scans для мгновенного отображения в дневнике 043/у.
 * 8. Оповещение интерфейса через WebSocket Broker без задержек.
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
	calculateAnnualRadiationDose,
	type DentalRadiologyStudyType,
	type RadiationDoseSheetPayload,
	type RadiationExposureEntry,
} from "@dental/shared";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import {
	getPacsTenantStorageDir,
	toNormalizedRelativePacsStoragePath,
} from "../imaging/localPacsSanitizer.js";
import { wsBroker } from "../websocketBroker.js";
import {
	type DicomIngestMetadata,
	type IngestModalityKind,
	parseDicomIngestBuffer,
} from "./dicomIngestMetadataParser.js";
import {
	type PatientBindingResult,
	resolveOrAutoCreatePatientForDicom,
} from "./dicomPatientAutoBinder.js";

export type ImagingStudyKindValue = "periapical" | "bitewing" | "opg" | "ceph" | "cbct" | "photo" | "other";
export type ImagingSourceKindValue = "manual_upload" | "dicom_file" | "dicomweb" | "pacs" | "twain_wia" | "sensor_bridge" | "folder_watch";

export interface IngestDicomOptions {
	organizationId: string;
	visitId?: string | null | undefined;
	doctorId?: string | null | undefined;
	sourceKind?: ImagingSourceKindValue | undefined;
	sourceName?: string | undefined;
	autoCreateDraftIfNotFound?: boolean | undefined;
	toothCode?: string | null | undefined;
	region?: string | null | undefined;
}

export interface IngestDicomResult {
	studyId: string;
	seriesId: string;
	instanceId: string;
	xrayScanId: string | null;
	patientId: string | null;
	patientFullName: string | null;
	studyInstanceUid: string;
	seriesInstanceUid: string;
	sopInstanceUid: string;
	modality: string;
	modalityKind: IngestModalityKind;
	studyKind: ImagingStudyKindValue;
	storagePath: string;
	fileSizeBytes: number;
	bindingStatus: string;
	bindingConfidence: number;
	isNewPatientCreated: boolean;
	isDuplicate: boolean;
	metadata: DicomIngestMetadata;
}

export interface IngestBatchResult {
	studyId: string;
	seriesId: string;
	patientId: string | null;
	patientFullName: string | null;
	studyInstanceUid: string;
	seriesInstanceUid: string;
	modalityKind: IngestModalityKind;
	studyKind: ImagingStudyKindValue;
	totalSlicesReceived: number;
	newSlicesInserted: number;
	duplicateSlicesSkipped: number;
	totalFileSizeBytes: number;
	bindingStatus: string;
	bindingConfidence: number;
	isNewPatientCreated: boolean;
	metadata: DicomIngestMetadata;
}

/**
 * Преобразование внутренней классификации модальности в enum базы данных imaging_study_kind.
 */
export function mapModalityKindToStudyKind(modalityKind: IngestModalityKind): ImagingStudyKindValue {
	switch (modalityKind) {
		case "ct":
			return "cbct";
		case "intraoral":
			return "periapical";
		case "panoramic":
			return "opg";
		case "cephalometric":
			return "ceph";
		case "secondary_capture":
		case "other":
		default:
			return "other";
	}
}

/**
 * Преобразование модальности DICOM в тип исследования СанПиН 2.6.1.1192-03.
 */
export function mapDicomToSanpinStudyType(modalityKind: IngestModalityKind): DentalRadiologyStudyType {
	switch (modalityKind) {
		case "ct":
			return "cbct_full_maxillofacial_15x15";
		case "intraoral":
			return "intraoral_radiovisiography";
		case "panoramic":
			return "optg_digital_panoramic";
		case "cephalometric":
			return "trg_cephalometric_lateral";
		default:
			return "intraoral_radiovisiography";
	}
}

/**
 * Регистрация дозовой нагрузки исследования в официальном листе радиационного контроля (СанПиН 2.6.1.1192-03)
 */
export async function recordSanpinRadiationDose(
	organizationId: string,
	patientId: string,
	metadata: DicomIngestMetadata,
	_doctorId?: string | null,
): Promise<void> {
	if (!patientId || !organizationId) return;

	try {
		// 1. Извлекаем данные пациента
		const [patient] = await db
			.select({
				id: schema.patients.id,
				fullName: schema.patients.fullName,
				birthDate: schema.patients.birthDate,
				administrativeProfile: schema.patients.administrativeProfile,
			})
			.from(schema.patients)
			.where(
				and(
					eq(schema.patients.organizationId, organizationId),
					eq(schema.patients.id, patientId),
				),
			)
			.limit(1);

		if (!patient) return;

		const reportingYear = metadata.studyDate
			? Number.parseInt(metadata.studyDate.slice(0, 4), 10) || new Date().getFullYear()
			: new Date().getFullYear();

		const adminProfile = (patient.administrativeProfile ?? {}) as Record<string, unknown>;
		const cardNum =
			(typeof adminProfile.chartNumber === "string" && adminProfile.chartNumber.trim()) ||
			(typeof adminProfile.medicalCardNumber === "string" && adminProfile.medicalCardNumber.trim()) ||
			(typeof adminProfile.vatechPatId === "string" && adminProfile.vatechPatId.trim()) ||
			metadata.patientChartNumber ||
			"043/у";

		const gender = adminProfile.gender === "female" ? "female" : "male";

		// 2. Ищем существующий лист дозовых нагрузок за текущий отчетный год
		const existingDocs = await db
			.select()
			.from(schema.generatedDocuments)
			.where(
				and(
					eq(schema.generatedDocuments.organizationId, organizationId),
					eq(schema.generatedDocuments.patientId, patientId),
					eq(schema.generatedDocuments.kind, "radiation_dose_sheet"),
				),
			);

		const targetDoc = existingDocs.find((d) => d.taxYear === reportingYear) ?? existingDocs[0];

		const studyType = mapDicomToSanpinStudyType(metadata.modalityKind);
		let anatomicalArea = "Челюстно-лицевая область и ВНЧС (КЛКТ)";
		if (metadata.modalityKind === "intraoral") {
			anatomicalArea = "Прицельная радиовизиография зуба";
		} else if (metadata.modalityKind === "panoramic") {
			anatomicalArea = "Зубочелюстная система (ОПТГ)";
		} else if (metadata.modalityKind === "cephalometric") {
			anatomicalArea = "Череп в боковой проекции (ТРГ)";
		}

		const effectiveDoseMsv = metadata.estimatedEffectiveDoseMsv ?? 0.055;
		const effectiveDoseMicrosieverts = Number((effectiveDoseMsv * 1000).toFixed(1));

		const newEntry: RadiationExposureEntry = {
			id: crypto.randomUUID(),
			studyDate: metadata.studyDate ?? new Date().toISOString().slice(0, 10),
			studyType,
			anatomicalArea,
			apparatusModel: metadata.manufacturerModelName || metadata.manufacturer || "Vatech / Picasso",
			tubeVoltageKv: metadata.kvp ?? 85,
			tubeCurrentMa: metadata.ma ?? 7,
			exposureTimeSeconds: metadata.exposureTimeMs ? Number((metadata.exposureTimeMs / 1000).toFixed(3)) : 0.12,
			effectiveDoseMsv,
			effectiveDoseMicrosieverts,
			radiologistFullName: "Врач-рентгенолог",
			notes: `Исследование DICOM UID: ${metadata.studyInstanceUid}${metadata.doseAreaProductDap ? `, DAP: ${metadata.doseAreaProductDap}` : ""}`,
		};

		if (targetDoc && targetDoc.payloadJson) {
			let currentPayload: Record<string, unknown> = {};
			try {
				currentPayload = JSON.parse(targetDoc.payloadJson);
			} catch {
				currentPayload = {};
			}

			const currentEntries: RadiationExposureEntry[] = Array.isArray(currentPayload.exposureEntries)
				? (currentPayload.exposureEntries as RadiationExposureEntry[])
				: [];

			// Защита от дубликатов по studyInstanceUid в примечании
			const isAlreadyLogged = currentEntries.some((e) =>
				typeof e.notes === "string" && e.notes.includes(metadata.studyInstanceUid),
			);

			if (!isAlreadyLogged) {
				const updatedEntries = [...currentEntries, newEntry];
				const annualSummary = calculateAnnualRadiationDose(updatedEntries, reportingYear);

				const updatedPayload: RadiationDoseSheetPayload = {
					formNumber: "Лист дозовых нагрузок",
					clinicLegalName: typeof currentPayload.clinicLegalName === "string" ? currentPayload.clinicLegalName : "ООО ДЕНТЕ КЛИНИК",
					clinicAddress: typeof currentPayload.clinicAddress === "string" ? currentPayload.clinicAddress : undefined,
					clinicOgrn: typeof currentPayload.clinicOgrn === "string" ? currentPayload.clinicOgrn : undefined,
					clinicLicenseNumber: typeof currentPayload.clinicLicenseNumber === "string" ? currentPayload.clinicLicenseNumber : undefined,
					patientFullName: patient.fullName,
					patientBirthDate: patient.birthDate || "1990-01-01",
					patientSex: gender,
					medicalCardNumber: cardNum,
					reportingYear,
					exposureEntries: updatedEntries,
					annualSummary,
					responsibleOfficerFullName: typeof currentPayload.responsibleOfficerFullName === "string" ? currentPayload.responsibleOfficerFullName : "Врач-рентгенолог",
				};

				await db
					.update(schema.generatedDocuments)
					.set({
						payloadJson: JSON.stringify(updatedPayload),
						totalAmountRub: annualSummary.totalDoseYearMsv,
						taxYear: reportingYear,
					})
					.where(eq(schema.generatedDocuments.id, targetDoc.id));
			}
		} else {
			// Создаем новый документ журнала доз
			const initialEntries = [newEntry];
			const annualSummary = calculateAnnualRadiationDose(initialEntries, reportingYear);

			const newPayload: RadiationDoseSheetPayload = {
				formNumber: "Лист дозовых нагрузок",
				clinicLegalName: "ООО ДЕНТЕ КЛИНИК",
				patientFullName: patient.fullName,
				patientBirthDate: patient.birthDate || "1990-01-01",
				patientSex: gender,
				medicalCardNumber: cardNum,
				reportingYear,
				exposureEntries: initialEntries,
				annualSummary,
				responsibleOfficerFullName: "Врач-рентгенолог",
			};

			await db.insert(schema.generatedDocuments).values({
				organizationId,
				patientId,
				visitId: null,
				kind: "radiation_dose_sheet",
				status: "draft",
				title: `Лист учета дозовых нагрузок (${reportingYear} г.) — ${patient.fullName}`,
				taxYear: reportingYear,
				totalAmountRub: annualSummary.totalDoseYearMsv,
				payloadJson: JSON.stringify(newPayload),
			});
		}
	} catch (err) {
		// Ошибка логирования дозы не блокирует сохранение снимка
		console.error("Ошибка сохранения записи в журнал лучевой нагрузки:", err);
	}
}

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
		const patientBinding: PatientBindingResult = await resolveOrAutoCreatePatientForDicom(
			organizationId,
			{
				patientFullName: metadata.patientFullName,
				patientChartNumber: metadata.patientChartNumber,
				patientBirthDate: metadata.patientBirthDate,
				patientSex: metadata.patientSex,
				autoCreateDraftIfNotFound,
			},
		);

		// 3. Сохранение файла на диск в изолированный tenant-каталог
		const tenantDir = getPacsTenantStorageDir(organizationId);
		const safeStudyUid = metadata.studyInstanceUid.replace(/[^a-zA-Z0-9.-]/g, "_");
		const safeSeriesUid = metadata.seriesInstanceUid.replace(/[^a-zA-Z0-9.-]/g, "_");
		const safeSopUid = metadata.sopInstanceUid.replace(/[^a-zA-Z0-9.-]/g, "_");

		const targetDir = path.join(tenantDir, safeStudyUid, safeSeriesUid);
		await fs.mkdir(targetDir, { recursive: true });

		const fullFilePath = path.join(targetDir, `${safeSopUid}.dcm`);
		await fs.writeFile(fullFilePath, buffer);

		const relativeStoragePath = toNormalizedRelativePacsStoragePath(organizationId, fullFilePath, "pacs");

		// 4. Определение модальности для базы
		const studyKind = mapModalityKindToStudyKind(metadata.modalityKind);
		const initialStudyStatus =
			patientBinding.bindingStatus === "unassigned" ? "needs_review" : "available";

		// 5. Персистентность в PostgreSQL 18
		// 5.1. Поиск или создание исследования (БЕЗ предварительного инкремента sliceCount)
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

		let studyId: string;
		let isNewStudy = false;

		if (existingStudy) {
			studyId = existingStudy.id;
			// Если пациент не был привязан, а сейчас определился
			if (existingStudy.patientId === null && patientBinding.patientId) {
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
		} else {
			isNewStudy = true;
			// Вычисляем дату съемки
			let capturedAtDate = new Date();
			if (metadata.studyDate) {
				const timeStr = metadata.studyTime ? `T${metadata.studyTime}` : "T00:00:00";
				const parsedDate = new Date(`${metadata.studyDate}${timeStr}`);
				if (!Number.isNaN(parsedDate.getTime())) {
					capturedAtDate = parsedDate;
				}
			}

			const dimensionsStr =
				metadata.rows && metadata.columns ? `${metadata.columns}x${metadata.rows}` : null;
			const voxelSpacingStr = metadata.pixelSpacing
				? `${metadata.pixelSpacing[0]}x${metadata.pixelSpacing[1]}`
				: metadata.sliceThickness
					? `${metadata.sliceThickness}mm`
					: null;

			const technicalDoseNote = metadata.kvp
				? `${metadata.suggestedStudyTitle} (${metadata.kvp} кВ, ${metadata.ma ?? 7} мА${metadata.doseAreaProductDap ? `, DAP: ${metadata.doseAreaProductDap}` : ""})`
				: metadata.suggestedStudyTitle;

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
					storagePath: relativeStoragePath,
					dicomStudyUid: metadata.studyInstanceUid,
					studyInstanceUid: metadata.studyInstanceUid,
					seriesInstanceUid: metadata.seriesInstanceUid,
					modality: metadata.modalityRaw ?? metadata.modalityKind.toUpperCase(),
					seriesDescription: metadata.seriesDescription ?? technicalDoseNote,
					studyDate: metadata.studyDate,
					sliceCount: 1,
					dimensions: dimensionsStr,
					voxelSpacing: voxelSpacingStr,
					fileSizeBytes: buffer.length,
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
			studyId = insertedStudy.id;
		}

		// 5.2. Поиск или создание серии (imaging_series)
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

		let seriesId: string;
		if (existingSeries) {
			seriesId = existingSeries.id;
		} else {
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
			seriesId = insertedSeries.id;
		}

		// 5.3. СТРОГАЯ ДЕДУПЛИКАЦИЯ: Поиск существующего экземпляра (imaging_instances)
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
			// Экземпляр уже существует! Никакого инкремента sliceCount и никаких дублирующих строк
			instanceId = existingInstance.id;
			isDuplicate = true;
		} else {
			// Новый срез: сохраняем экземпляр
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

			// Если исследование уже существовало до этого среза, атомарно инкрементируем счетчик срезов
			if (!isNewStudy) {
				await db
					.update(schema.imagingStudies)
					.set({
						sliceCount: sql`COALESCE(${schema.imagingStudies.sliceCount}, 0) + 1`,
						fileSizeBytes: sql`COALESCE(${schema.imagingStudies.fileSizeBytes}, 0) + ${buffer.length}`,
					})
					.where(eq(schema.imagingStudies.id, studyId));
			}

			// Фиксация в журнале лучевой нагрузки по СанПиН 2.6.1.1192-03
			if (patientBinding.patientId) {
				await recordSanpinRadiationDose(organizationId, patientBinding.patientId, metadata, doctorId);
			}
		}

		// 5.4. Зеркалирование для визиографов (modality = intraoral) в xray_scans
		let xrayScanId: string | null = null;
		if (metadata.modalityKind === "intraoral" && patientBinding.patientId) {
			// Проверяем, нет ли уже такого снимка
			const [existingXray] = await db
				.select({ id: schema.xrayScans.id })
				.from(schema.xrayScans)
				.where(
					and(
						eq(schema.xrayScans.organizationId, organizationId),
						eq(schema.xrayScans.patientId, patientBinding.patientId),
						eq(schema.xrayScans.originalFilename, `${metadata.sopInstanceUid}.dcm`),
					),
				)
				.limit(1);

			if (existingXray) {
				xrayScanId = existingXray.id;
			} else {
				const kvpNote = metadata.kvp ? ` ${metadata.kvp} кВ` : "";
				const maNote = metadata.ma ? ` ${metadata.ma} мА` : "";
				const expNote = metadata.exposureTimeMs ? ` ${metadata.exposureTimeMs} мс` : "";
				const dapNote = metadata.doseAreaProductDap ? ` (DAP: ${metadata.doseAreaProductDap})` : "";
				const technicalNote = `Визиограф EzSensor:${kvpNote}${maNote}${expNote}${dapNote}`.trim();

				const [insertedXray] = await db
					.insert(schema.xrayScans)
					.values({
						organizationId,
						patientId: patientBinding.patientId,
						visitId,
						storagePath: relativeStoragePath,
						fileUrl: `/api/imaging/studies/${studyId}/file`,
						fileSizeBytes: buffer.length,
						originalFilename: `${metadata.sopInstanceUid}.dcm`,
						mimeType: "application/dicom",
						status: "done",
						kind: "periapical",
						toothCode,
						notes: technicalNote,
					})
					.returning({ id: schema.xrayScans.id });

				if (insertedXray) {
					xrayScanId = insertedXray.id;
				}
			}
		}

		// 6. Оповещение WebSocket брокера для мгновенного обновления интерфейса врача
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
		const uniqueInstancesMap = new Map<string, { buffer: Buffer; metadata: DicomIngestMetadata }>();

		for (const buf of buffers) {
			try {
				const meta = parseDicomIngestBuffer(buf);
				if (!uniqueInstancesMap.has(meta.sopInstanceUid)) {
					uniqueInstancesMap.set(meta.sopInstanceUid, { buffer: buf, metadata: meta });
				}
			} catch (err) {
				console.warn("Пропуск поврежденного DICOM-буфера в пакете:", err);
			}
		}

		if (uniqueInstancesMap.size === 0) {
			throw new Error("Ни один из переданных буферов не является валидным DICOM файлом.");
		}

		// Базовые метаданные берем из первого разобранного среза
		const firstItem = uniqueInstancesMap.values().next().value!;
		const baseMeta = firstItem.metadata;

		// 2. Интеллектуальное связывание с пациентом или авто-создание карточки (Мандат 8e)
		const patientBinding = await resolveOrAutoCreatePatientForDicom(
			organizationId,
			{
				patientFullName: baseMeta.patientFullName,
				patientChartNumber: baseMeta.patientChartNumber,
				patientBirthDate: baseMeta.patientBirthDate,
				patientSex: baseMeta.patientSex,
				autoCreateDraftIfNotFound,
			},
		);

		const studyKind = mapModalityKindToStudyKind(baseMeta.modalityKind);
		const initialStudyStatus =
			patientBinding.bindingStatus === "unassigned" ? "needs_review" : "available";

		// 3. Поиск или создание исследования в PostgreSQL 18
		const [existingStudy] = await db
			.select()
			.from(schema.imagingStudies)
			.where(
				and(
					eq(schema.imagingStudies.organizationId, organizationId),
					eq(schema.imagingStudies.studyInstanceUid, baseMeta.studyInstanceUid),
				),
			)
			.limit(1);

		let studyId: string;
		let isNewStudy = false;

		if (existingStudy) {
			studyId = existingStudy.id;
			if (existingStudy.patientId === null && patientBinding.patientId) {
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
		} else {
			isNewStudy = true;
			let capturedAtDate = new Date();
			if (baseMeta.studyDate) {
				const timeStr = baseMeta.studyTime ? `T${baseMeta.studyTime}` : "T00:00:00";
				const parsedDate = new Date(`${baseMeta.studyDate}${timeStr}`);
				if (!Number.isNaN(parsedDate.getTime())) {
					capturedAtDate = parsedDate;
				}
			}

			const dimensionsStr =
				baseMeta.rows && baseMeta.columns ? `${baseMeta.columns}x${baseMeta.rows}` : null;
			const voxelSpacingStr = baseMeta.pixelSpacing
				? `${baseMeta.pixelSpacing[0]}x${baseMeta.pixelSpacing[1]}`
				: baseMeta.sliceThickness
					? `${baseMeta.sliceThickness}mm`
					: null;

			const technicalDoseNote = baseMeta.kvp
				? `${baseMeta.suggestedStudyTitle} (${baseMeta.kvp} кВ, ${baseMeta.ma ?? 7} мА${baseMeta.doseAreaProductDap ? `, DAP: ${baseMeta.doseAreaProductDap}` : ""})`
				: baseMeta.suggestedStudyTitle;

			const tenantDir = getPacsTenantStorageDir(organizationId);
			const safeStudyUid = baseMeta.studyInstanceUid.replace(/[^a-zA-Z0-9.-]/g, "_");
			const safeSeriesUid = baseMeta.seriesInstanceUid.replace(/[^a-zA-Z0-9.-]/g, "_");
			const studyRelPath = toNormalizedRelativePacsStoragePath(
				organizationId,
				path.join(tenantDir, safeStudyUid, safeSeriesUid),
				"pacs",
			);

			const [insertedStudy] = await db
				.insert(schema.imagingStudies)
				.values({
					organizationId,
					patientId: patientBinding.patientId,
					visitId,
					doctorId,
					kind: studyKind,
					title: baseMeta.suggestedStudyTitle,
					toothCode,
					region,
					capturedAt: capturedAtDate,
					sourceKind,
					sourceName,
					status: initialStudyStatus,
					storagePath: studyRelPath,
					dicomStudyUid: baseMeta.studyInstanceUid,
					studyInstanceUid: baseMeta.studyInstanceUid,
					seriesInstanceUid: baseMeta.seriesInstanceUid,
					modality: baseMeta.modalityRaw ?? baseMeta.modalityKind.toUpperCase(),
					seriesDescription: baseMeta.seriesDescription ?? technicalDoseNote,
					studyDate: baseMeta.studyDate,
					sliceCount: 0, // будет обновлен после дедупликации
					dimensions: dimensionsStr,
					voxelSpacing: voxelSpacingStr,
					fileSizeBytes: 0,
					bindingStatus: patientBinding.bindingStatus,
					bindingConfidence: patientBinding.bindingConfidence,
					dicomPatientName: baseMeta.patientFullName,
					dicomPatientId: baseMeta.patientChartNumber,
					dicomBirthDate: baseMeta.patientBirthDate,
				})
				.returning({ id: schema.imagingStudies.id });

			if (!insertedStudy) {
				throw new Error("Не удалось создать запись исследования в PostgreSQL.");
			}
			studyId = insertedStudy.id;
		}

		// 4. Поиск или создание серии
		const [existingSeries] = await db
			.select()
			.from(schema.imagingSeries)
			.where(
				and(
					eq(schema.imagingSeries.organizationId, organizationId),
					eq(schema.imagingSeries.studyId, studyId),
					eq(schema.imagingSeries.dicomSeriesUid, baseMeta.seriesInstanceUid),
				),
			)
			.limit(1);

		let seriesId: string;
		if (existingSeries) {
			seriesId = existingSeries.id;
		} else {
			const [insertedSeries] = await db
				.insert(schema.imagingSeries)
				.values({
					organizationId,
					studyId,
					dicomSeriesUid: baseMeta.seriesInstanceUid,
					seriesNumber: 1,
					modality: baseMeta.modalityRaw ?? baseMeta.modalityKind.toUpperCase(),
					bodyPartExamined: "JAW",
					seriesDescription: baseMeta.seriesDescription ?? baseMeta.suggestedStudyTitle,
				})
				.returning({ id: schema.imagingSeries.id });

			if (!insertedSeries) {
				throw new Error("Не удалось создать запись серии в PostgreSQL.");
			}
			seriesId = insertedSeries.id;
		}

		// 5. Проверка существующих экземпляров в базе данных (Deduplication Gate)
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
		const tenantDir = getPacsTenantStorageDir(organizationId);
		const safeStudyUid = baseMeta.studyInstanceUid.replace(/[^a-zA-Z0-9.-]/g, "_");
		const safeSeriesUid = baseMeta.seriesInstanceUid.replace(/[^a-zA-Z0-9.-]/g, "_");
		const targetDir = path.join(tenantDir, safeStudyUid, safeSeriesUid);
		await fs.mkdir(targetDir, { recursive: true });

		const newInstancesRows: Array<typeof schema.imagingInstances.$inferInsert> = [];
		let newBytesTotal = 0;

		for (const [sopUid, item] of uniqueInstancesMap.entries()) {
			if (existingUidSet.has(sopUid)) {
				// Срез уже в базе — пропускаем
				continue;
			}

			const safeSopUid = sopUid.replace(/[^a-zA-Z0-9.-]/g, "_");
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

		// 6. Батчевая вставка новых экземпляров в imaging_instances
		if (newSlicesInserted > 0) {
			// Вставка пачками до 200 строк во избежание переполнения параметров SQL
			const CHUNK_SIZE = 200;
			for (let i = 0; i < newInstancesRows.length; i += CHUNK_SIZE) {
				const chunk = newInstancesRows.slice(i, i + CHUNK_SIZE);
				await db.insert(schema.imagingInstances).values(chunk);
			}

			// Атомарное обновление sliceCount и размера исследования
			await db
				.update(schema.imagingStudies)
				.set({
					sliceCount: sql`COALESCE(${schema.imagingStudies.sliceCount}, 0) + ${newSlicesInserted}`,
					fileSizeBytes: sql`COALESCE(${schema.imagingStudies.fileSizeBytes}, 0) + ${newBytesTotal}`,
				})
				.where(eq(schema.imagingStudies.id, studyId));

			// Фиксация в журнале лучевой нагрузки по СанПиН 2.6.1.1192-03 (единожды на всю серию КЛКТ)
			if (patientBinding.patientId) {
				await recordSanpinRadiationDose(organizationId, patientBinding.patientId, baseMeta, doctorId);
			}
		}

		// 7. Оповещение WebSocket брокера о результатах пакетного импорта
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

		// Запрос актуального состояния исследования
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

		// Читаем все файлы параллельно через Promise.all
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
