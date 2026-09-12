/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EMR FORM 043/U CLINICAL PROTOCOL ENGINE & DIARY GENERATOR
 * Order of the Ministry of Health of the Russian Federation № 834n
 * (WEB CLIENT FACADE - MANDATE 8s: All logic consolidated in @dental/shared)
 * ═══════════════════════════════════════════════════════════════════════════
 */

export {
	synthesizeClinicalDiary,
	synthesizeDiariesFromOdontogram,
	validateForm043uCompliance,
	getClinicalProtocolTemplate,
	deduceBlackClassFromSurfaces,
	deduceBlackCavityClassFromSurfaces,
	isValidFdiToothNumber,
	formatStatutorySoapSummary,
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
} from "@dental/shared";
