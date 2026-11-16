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
 * Мандат 8e / 8n / DEF-SAN-02: Медицинская карта фиксирует клиническое лечение (SOAP),
 * а не санитарную отчетность Роспотребнадзора. Ноль бюрократического мусора в дневнике.
 */
export function buildEmergencySterilizationAdmissionNote(_barcode: string): string {
	return "";
}

/**
 * Мандат 8e / 8n / DEF-SAN-02: Сохраняет клиническую чистоту протокола SOAP.
 * Не засоряет описание лечения СанПиН-бюрократией.
 */
export function applyEmergencySterilizationToDiaryTreatment(
	currentTreatment: string | null | undefined,
	_barcode: string,
): string {
	return (currentTreatment ?? "").trim();
}
