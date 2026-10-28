/**
 * apps/web/src/lib/clinicalProtocols.ts
 *
 * Канонический координатор и фасад клинических протоколов стоматологического приёма
 * и медицинской карты (Мандаты 8e — автономия врача, 8n — соло-врач, 8x — чистый русский язык).
 *
 * 100% обратная совместимость типов, констант и функций.
 */

import {
	synthesizeProtocolFromOrder804nService,
	enrichDiaryFrom804nServices,
	ORDER_804N_PROTOCOL_DEFINITIONS,
	type Order804nProtocolDefinition,
	type InformedConsent1051nOptions,
	generateInformedConsent1051nText,
	generateInformedConsent1051nHtml,
	renderInformedConsent1051nHtml,
} from "@dental/shared";

export {
	synthesizeProtocolFromOrder804nService,
	enrichDiaryFrom804nServices,
	ORDER_804N_PROTOCOL_DEFINITIONS,
	type Order804nProtocolDefinition,
	type InformedConsent1051nOptions,
	generateInformedConsent1051nText,
	generateInformedConsent1051nHtml,
	renderInformedConsent1051nHtml,
};

export {
	type DiaryState,
	type ToothSurfaceKey,
	type OdontogramFindingInput,
	type ClinicalProtocolSoap,
	type ClinicalProtocol043,
	type MergeStrategy,
	type MergeSoapOptions,
	type PatientRecommendationItem,
	PATIENT_RECOMMENDATIONS,
	type FastClinicalPreset,
} from "./protocols/protocolTypes.js";

export {
	getToothAnatomicalNameRu,
	getToothFolkAndAnatomicalNameRu,
	formatSurfacesRu,
	normalizeFdiToothList,
} from "./protocols/fdiAnatomy.js";

export {
	type RestorationWarrantyConfig,
	type RestorationWarrantyResult,
	calculateCompositeRestorationWarranty,
	appendCompositeWarrantyToSoap,
	type EndoWorkingLengthEntry,
	type EndoSealerOption,
	ENDO_SEALER_OPTIONS,
	type EndoObturationMethodOption,
	ENDO_OBTURATION_METHOD_OPTIONS,
	generateEndoWorkingLengthTable,
	formatEndoProtocolQuickSnippet,
	appendEndoProtocolToSoap,
	generateTherapySoap,
	THERAPY_FAST_PRESETS,
} from "./protocols/therapyProtocols.js";

export {
	generateSurgerySoap,
	SURGERY_FAST_PRESETS,
} from "./protocols/surgeryProtocols.js";

export {
	generateProsthoSoap,
	PROSTHO_FAST_PRESETS,
} from "./protocols/prosthoProtocols.js";

export {
	type PerioPathologyPreset,
	PERIO_PATHOLOGY_PRESETS,
	generatePerioSoap,
	HYGIENE_FAST_PRESETS,
} from "./protocols/perioAndHygieneProtocols.js";

export {
	type AnesthesiaQuickPreset,
	ANESTHESIA_QUICK_PRESETS,
	extractSomaticRiskProfileFromText,
	checkSomaticAnesthesiaCompatibility,
	calculatePediatricAnesthesiaLimit,
	appendAnesthesiaToSoap,
	type CarpuleAnesthesiaPreset,
	STANDARD_ANESTHESIA_NORM_PRESET_RU,
	STANDARD_ANESTHESIA_NORM_FULL_043,
	CARPULE_ANESTHESIA_PRESETS,
	type AnesthesiaRiskEvaluation,
	evaluateAnesthesiaRisk,
	type AnesthesiaCarpuleCalculation,
	calculateAnesthesiaCarpulesSafety,
	generatePediatricSoap,
} from "./protocols/anesthesiaAndPediatrics.js";

export {
	type PostOpMemoId,
	type PostOpPatientMemo,
	POST_OP_PATIENT_MEMOS,
	type PatientMemoRenderOptions,
	getPostOpPatientMemo,
	generatePatientMemoText,
	appendPatientMemoToSoap,
	renderPatientMemoPrintHtml,
	type ClinicalPhotoAttachment,
	generatePhotoProtocolAttachmentsStatement,
} from "./protocols/patientMemosAndPhoto.js";

export {
	type Form043PhysiologicalNormData,
	FORM_043_PHYSIOLOGICAL_NORM,
	createForm043PhysiologicalNorm,
	createIntactOdontogramRecords,
	createSanitizedOdontogramRecords,
	createWisdomExtractedOdontogramRecords,
} from "./protocols/form043Norm.js";

export {
	mergeSoapDiaryState,
	applyOrder804nServiceToSoapDiary,
	appendRecommendationToSoap,
} from "./protocols/protocolMerge.js";

export {
	generateSoapFromOdontogramFinding,
	generateSoapFromOdontogramStates,
	getIcdPriority,
} from "./protocols/odontogramSoapAggregator.js";

import type { FastClinicalPreset, ClinicalProtocolSoap } from "./protocols/protocolTypes.js";
import { THERAPY_FAST_PRESETS } from "./protocols/therapyProtocols.js";
import { SURGERY_FAST_PRESETS } from "./protocols/surgeryProtocols.js";
import { PROSTHO_FAST_PRESETS } from "./protocols/prosthoProtocols.js";
import { HYGIENE_FAST_PRESETS } from "./protocols/perioAndHygieneProtocols.js";
import {
	FORM_043_PHYSIOLOGICAL_NORM,
	createForm043PhysiologicalNorm,
	type Form043PhysiologicalNormData,
} from "./protocols/form043Norm.js";
import { resolveServicePriceFromCatalog } from "./protocols/multiStageEndoEngine.js";


/** Чистые доменные алиасы медицинской карты и информированного согласия (Мандат 8ap) */
export type ClinicalProtocol = ClinicalProtocolSoap;
export type MedicalCardPhysiologicalNormData = Form043PhysiologicalNormData;
export const MEDICAL_CARD_PHYSIOLOGICAL_NORM = FORM_043_PHYSIOLOGICAL_NORM;
export const createMedicalCardPhysiologicalNorm = createForm043PhysiologicalNorm;
export const generateInformedConsentText: typeof generateInformedConsent1051nText = (...args) =>
	generateInformedConsent1051nText(...args);
export const generateInformedConsentHtml: typeof generateInformedConsent1051nHtml = (...args) =>
	generateInformedConsent1051nHtml(...args);
export const renderInformedConsentHtml: typeof renderInformedConsent1051nHtml = (...args) =>
	renderInformedConsent1051nHtml(...args);
export type InformedConsentOptions = InformedConsent1051nOptions;
export const getServicePrice: typeof resolveServicePriceFromCatalog = (...args) =>
	resolveServicePriceFromCatalog(...args);


/** 7 ключевых клинических протоколов стоматологического приёма */
export const CLINICAL_FAST_PRESETS: readonly FastClinicalPreset[] = [
	THERAPY_FAST_PRESETS[0]!, // caries_dentin
	THERAPY_FAST_PRESETS[1]!, // pulpitis
	THERAPY_FAST_PRESETS[2]!, // periodontitis
	SURGERY_FAST_PRESETS[0]!, // extraction
	HYGIENE_FAST_PRESETS[0]!, // hygiene
	PROSTHO_FAST_PRESETS[0]!, // implant_crown_zirconia
	THERAPY_FAST_PRESETS[3]!, // enamel_wear_erosion
];

export {
	ORDER_804N_ENDO_CODES,
	DEFAULT_STAGE1_SERVICE_TITLE,
	DEFAULT_STAGE2_OBTURATION_TITLE,
	DEFAULT_STAGE2_RESTORATION_TITLE,
	BASELINE_PRICES_RUB,
	type LastVisitSoapSnapshot,
	type MultiStageEndoTransformResult,
	resolveServicePriceFromCatalog,
	clearEndoHistoryIndex,
	formatVisitDateRu,
	isEndodonticIndication,
	buildPatientPreviousVisitsEndoIndex,
	getUnfinishedEndoSnapshot,
	transformEndoStage1ToStage2,
} from "./protocols/multiStageEndoEngine.js";
