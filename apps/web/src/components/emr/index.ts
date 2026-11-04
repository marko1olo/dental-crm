/**
 * apps/web/src/components/emr/index.ts
 *
 * Канонический входной фасад подсистемы ЭМК, дневников приёма и медицинских карт DENTE CRM.
 * Мандаты 8e (Автономия врача), 8n (Соло-врач), 8x/8ap (Чистый живой доменный язык).
 */

export * from "./medicalRecordCatalogData";
export * from "./medicalCardCatalogData";
export * from "./MedicalRecordStudioModal";
export * from "./MedicalCardPrintModal";
export * from "./types/recordDataTypes";
export * from "./types/recordConfigTypes";
export * from "./clinicalDiaryMath";
export * from "./templates";

// Секции вкладок медицинской карты
export * from "./record/tabs/RecordPassportTab";
export * from "./record/tabs/RecordAnamnesisTab";
export * from "./record/tabs/RecordOdontogramTab";
export * from "./record/tabs/RecordDiariesTab";
export * from "./record/tabs/RecordEpicrisisTab";

// Обратная совместимость имен компонентов
export {
	MedicalRecordStudioModal as Form043PrintModal,
	MedicalRecordStudioModal as ClinicalDiaryPrintModal,
} from "./MedicalRecordStudioModal";

// Протоколы и генераторы клинических дневников
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
	blackCavityClassLabels,
	clinicalSpecialtyLabels,
	blackCavityClassSchema,
	clinicalSpecialtyKindSchema,
	localAnesthesiaTypeSchema,
	anestheticDrugSchema,
	EmrProtocolGeneratorModal,
	CORE_1CLICK_PRESETS,
	type EmrProtocolGeneratorModalProps,
	type ClinicalDiarySynthesisRequest,
	type VisitDiaryEntry043,
	type FdiToothRecord,
	type ToothSurface,
	type Statutory043ComplianceReport,
	type Statutory043Issue,
	type ClinicalProtocolTemplate,
	type ClinicalSpecialtyKind,
	type BlackCavityClass,
	type LocalAnesthesiaType,
	type AnestheticDrug,
} from "./protocolGenerator/index";
