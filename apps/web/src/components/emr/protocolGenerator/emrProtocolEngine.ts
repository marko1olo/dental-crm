/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EMR FORM 043/U CLINICAL PROTOCOL ENGINE & DIARY GENERATOR
 * Order of the Ministry of Health of the Russian Federation № 834n
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
	type VisitDiaryEntry043,
	type ClinicalDiarySynthesisRequest,
	type Statutory043ComplianceReport,
	type Statutory043Issue,
	type ClinicalProtocolTemplate,
	type FdiToothRecord,
	type ToothSurface,
	type BlackCavityClass,
	type ClinicalSpecialtyKind,
	type AnestheticDrug,
	type StatutoryAnestheticDrug,
	type LocalAnesthesiaType,
	synthesizeClinicalDiary,
	synthesizeDiariesFromOdontogram,
	validateForm043uCompliance,
	getClinicalProtocolTemplate,
	deduceBlackClassFromSurfaces,
	deduceBlackCavityClassFromSurfaces,
	isValidFdiToothNumber,
	STATUTORY_EMR_PROTOCOL_CATALOG,
	COMPANION_ICD10_CODES,
	anestheticDrugLabels,
	statutoryAnestheticDrugLabels,
	blackCavityClassLabels,
	clinicalSpecialtyLabels,
	blackCavityClassSchema,
	clinicalSpecialtyKindSchema,
	localAnesthesiaTypeSchema,
	anestheticDrugSchema,
	statutoryAnestheticDrugSchema,
} from "@dental/shared";

export {
	synthesizeClinicalDiary,
	synthesizeDiariesFromOdontogram,
	validateForm043uCompliance,
	getClinicalProtocolTemplate,
	deduceBlackClassFromSurfaces,
	deduceBlackCavityClassFromSurfaces,
	isValidFdiToothNumber,
	STATUTORY_EMR_PROTOCOL_CATALOG,
	COMPANION_ICD10_CODES,
	anestheticDrugLabels,
	statutoryAnestheticDrugLabels,
	blackCavityClassLabels,
	clinicalSpecialtyLabels,
	blackCavityClassSchema,
	clinicalSpecialtyKindSchema,
	localAnesthesiaTypeSchema,
	anestheticDrugSchema,
	statutoryAnestheticDrugSchema,
};

export type {
	VisitDiaryEntry043,
	ClinicalDiarySynthesisRequest,
	Statutory043ComplianceReport,
	Statutory043Issue,
	ClinicalProtocolTemplate,
	FdiToothRecord,
	ToothSurface,
	BlackCavityClass,
	ClinicalSpecialtyKind,
	AnestheticDrug,
	StatutoryAnestheticDrug,
	LocalAnesthesiaType,
};


/** Форматирование протокола SOAP в читаемый текстовый блок для предварительного просмотра */
export function formatStatutorySoapSummary(diary: VisitDiaryEntry043): string {
	const toothInfo = diary.toothNumber ? ` [Зуб ${diary.toothNumber}]` : "";
	return [
		`══════════════════════════════════════════════════════════════════`,
		`ДНЕВНИК ПРИЁМА ФОРМЫ 043/у (Приказ Минздрава № 834н)${toothInfo}`,
		`Дата/время: ${diary.entryDate} ${diary.entryTime || ""}`,
		`Врач: ${diary.doctorFullName} (${diary.doctorSpecialty || "Врач-стоматолог"})`,
		`──────────────────────────────────────────────────────────────────`,
		`S (ЖАЛОБЫ):`,
		diary.subjectiveComplaints,
		``,
		`O (STATUS LOCALIS):`,
		diary.objectiveStatusLocalis,
		`Перкуссия: верт. ${diary.percussionVertical === "negative" ? "отрицательная" : "положительная"}, гор. ${diary.percussionHorizontal === "negative" ? "отрицательная" : "положительная"} | Зондирование: ${diary.probingTenderness || "безболезненно"}`,
		diary.eodMicroamperes !== null && diary.eodMicroamperes !== undefined ? `ЭОД: ${diary.eodMicroamperes} мкА` : null,
		``,
		`A (ДИАГНОЗ МКБ-10):`,
		`${diary.assessmentIcd10Code} — ${diary.assessmentDiagnosisText}`,
		``,
		`P (ПРОТОКОЛ ВМЕШАТЕЛЬСТВА):`,
		diary.procedureProtocol,
		diary.anesthesiaDetails ? `Анестезия: ${diary.anesthesiaDetails}` : null,
		diary.appliedMaterials ? `Использованные материалы: ${diary.appliedMaterials}` : null,
		diary.homeCareRecommendations ? `Рекомендации: ${diary.homeCareRecommendations}` : null,
		diary.prescribedMedications ? `Назначения: ${diary.prescribedMedications}` : null,
		`══════════════════════════════════════════════════════════════════`,
	]
		.filter((line): line is string => line !== null)
		.join("\n");
}
