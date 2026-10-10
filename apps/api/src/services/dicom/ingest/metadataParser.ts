/**
 * metadataParser.ts — Извлечение тегов DICOM, классификация модальности,
 * нормализация параметров исследования и учет дозовой нагрузки по СанПиН 2.6.1.1192-03.
 */

import crypto from "node:crypto";
import {
	calculateAnnualRadiationDose,
	type DentalRadiologyStudyType,
	type RadiationDoseSheetPayload,
	type RadiationExposureEntry,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import * as schema from "../../../db/schema.js";
import {
	classifyDicomModality,
	cleanDicomString,
	type DicomIngestMetadata,
	type IngestModalityKind,
	parseDicomIngestBuffer,
} from "../dicomIngestMetadataParser.js";
import type {
	ImagingStudyKindValue,
	ParsedSliceBufferItem,
} from "./types.js";

export {
	classifyDicomModality,
	cleanDicomString,
	parseDicomIngestBuffer,
};

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
 * Вычисление даты и времени съемки из тегов StudyDate / StudyTime.
 */
export function parseStudyCapturedAtDate(metadata: DicomIngestMetadata): Date {
	let capturedAtDate = new Date();
	if (metadata.studyDate) {
		const timeStr = metadata.studyTime ? `T${metadata.studyTime}` : "T00:00:00";
		const parsedDate = new Date(`${metadata.studyDate}${timeStr}`);
		if (!Number.isNaN(parsedDate.getTime())) {
			capturedAtDate = parsedDate;
		}
	}
	return capturedAtDate;
}

/**
 * Форматирование разрешения матрицы снимка (Columns x Rows).
 */
export function formatStudyDimensions(metadata: DicomIngestMetadata): string | null {
	return metadata.rows && metadata.columns ? `${metadata.columns}x${metadata.rows}` : null;
}

/**
 * Форматирование шага вокселя / толщины среза.
 */
export function formatStudyVoxelSpacing(metadata: DicomIngestMetadata): string | null {
	if (metadata.pixelSpacing) {
		return `${metadata.pixelSpacing[0]}x${metadata.pixelSpacing[1]}`;
	}
	if (metadata.sliceThickness) {
		return `${metadata.sliceThickness}mm`;
	}
	return null;
}

/**
 * Формирование технического описания экспозиции и дозы для серии.
 */
export function formatTechnicalDoseNote(metadata: DicomIngestMetadata): string {
	return metadata.kvp
		? `${metadata.suggestedStudyTitle} (${metadata.kvp} кВ, ${metadata.ma ?? 7} мА${metadata.doseAreaProductDap ? `, DAP: ${metadata.doseAreaProductDap}` : ""})`
		: metadata.suggestedStudyTitle;
}

/**
 * Санитизация DICOM UID для безопасного использования в путях файловой системы.
 */
export function sanitizeDicomUidForPath(uid: string): string {
	return uid.replace(/[^a-zA-Z0-9.-]/g, "_");
}

/**
 * Пакетный разбор буферов срезов с дедупликацией по SOPInstanceUID в оперативной памяти.
 */
export function parseUniqueDicomSlices(buffers: Buffer[]): Map<string, ParsedSliceBufferItem> {
	const uniqueInstancesMap = new Map<string, ParsedSliceBufferItem>();

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

	return uniqueInstancesMap;
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
