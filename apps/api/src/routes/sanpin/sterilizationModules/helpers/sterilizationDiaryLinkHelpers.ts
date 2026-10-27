import { computeDiaryHash } from "../../../../services/clinical/DiarySigningCeremonyService.js";
import type { DiaryHashInput } from "../sterilizationSchemas.js";

export function computeDiaryHashForTrayLink(row: DiaryHashInput): string {
	return computeDiaryHash(
		row.visitId,
		row.patientId ?? "",
		row.anamnesis,
		row.statusLocalis,
		row.treatmentDescription,
		row.diagnosisIcd10,
		row.diagnosisTooth,
		row.complications,
		row.comorbidities,
		row.instrumentTrayBarcode,
	);
}

/**
 * Мандат 8e / 8n: Запись мягкого клинического допуска в дневник по экстренным показаниям.
 */
export function buildEmergencySterilizationAdmissionNote(barcode: string): string {
	return `[Стерилизация: мягкий допуск крафт-пакета ${barcode.trim()} по экстренным показаниям под личную ответственность врача (СанПиН 3.3686-21)]`;
}

/**
 * Добавляет отметку о допуске в описание лечения без дублирования.
 */
export function applyEmergencySterilizationToDiaryTreatment(
	currentTreatment: string | null | undefined,
	barcode: string,
): string {
	const emergencyNote = buildEmergencySterilizationAdmissionNote(barcode);
	const base = (currentTreatment ?? "").trim();
	if (!base) return emergencyNote;
	if (
		base.includes(emergencyNote.trim()) ||
		(base.includes(barcode.trim()) && (base.includes("мягкий допуск") || base.includes("Стерилизация")))
	) {
		return base;
	}
	return `${base}\n${emergencyNote}`;
}
