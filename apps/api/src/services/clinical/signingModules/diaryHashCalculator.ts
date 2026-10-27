import crypto from "node:crypto";

/**
 * Вычисление детерминированного SHA-256 хеша протокола приёма и инструментального лотка.
 */
export function computeDiaryHash(
	visitId: string,
	patientId: string,
	anamnesis: string | null | undefined,
	statusLocalis: string | null | undefined,
	treatmentDescription: string | null | undefined,
	diagnosisIcd10?: string | null | undefined,
	diagnosisTooth?: string | null | undefined,
	complications?: string | null | undefined,
	comorbidities?: string | null | undefined,
	instrumentTrayBarcode?: string | null | undefined,
): string {
	const raw = [
		visitId,
		patientId,
		anamnesis ?? "",
		statusLocalis ?? "",
		treatmentDescription ?? "",
		diagnosisIcd10 ?? "",
		diagnosisTooth ?? "",
		complications ?? "",
		comorbidities ?? "",
		instrumentTrayBarcode ?? "",
	].join("|");
	return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Формирование диагноза ЭМК из МКБ-10 и формулы зуба.
 */
export function buildEmkDiagnosisText(
	diagnosisIcd10?: string | null,
	diagnosisTooth?: string | null,
): string | null {
	const icd = (diagnosisIcd10 ?? "").trim();
	const tooth = (diagnosisTooth ?? "").trim();
	if (!icd) return null;
	if (tooth) return `${icd} | Зуб ${tooth}`;
	return icd;
}

/**
 * Валидатор количества для складских проводок.
 */
export function isDeductibleQuantity(value: number): boolean {
	return Number.isFinite(value) && value > 0;
}
