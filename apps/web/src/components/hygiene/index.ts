/**
 * @dental/web/components/hygiene/index.ts
 *
 * DENTE Dental CRM — Канонический экспорт модуля профессиональной гигиены и индекса OHI-S.
 * Мандаты: 8b, 8e, 8n, 8am, 8ze.
 */

export { HygieneStudioModal, type HygieneStudioModalProps } from "./HygieneStudioModal";
export { default as DirectHygieneLauncher, DirectHygieneLauncher as HygieneLauncher } from "./DirectHygieneLauncher";

export {
	OHI_S_PRESETS,
	CLEANING_PROTOCOLS,
	HOME_CARE_PLANS,
	type OhiSLevel,
	type OhiSPreset,
	type CleaningProtocol,
	type CleaningServiceItem,
	type HomeCarePlan,
	commitHygieneVisitProtocol,
	printHygieneHomeCareMemo,
	dispatchHygieneInvoiceAndServices,
	deductWarehouseHygieneConsumables,
} from "./hygieneCatalogData";

export {
	HygieneIndicesPanel,
	type HygieneIndicesPanelProps,
	type ActiveHygieneIndexTab,
	type ExtendedToothAssessment,
	type SilnessLoeResult,
	type FedorovVolodkinaResult,
	type PhpResult,
	calculateSilnessLoeScore,
	calculateFedorovVolodkinaScore,
	calculatePhpScore,
	CLINICAL_DEEP_FLUORIDATION_SUMMARY_RU,
	CLINICAL_TOOTH_MOUSSE_SUMMARY_RU,
	CLINICAL_PERIO_ANTISEPTIC_SUMMARY_RU,
	HYGIENE_EXPRESS_SERVICES,
	createDeepFluoridationProtocolText,
	createToothMousseProtocolText,
	createPerioAntisepticProtocolText,
} from "./HygieneIndicesPanel";

export {
	HygieneExpressPresetsStrip,
	type HygieneExpressPresetsStripProps,
} from "./HygieneExpressPresetsStrip";
