/**
 * Клинические протоколы и стандарты Формы 043/у (Координатор-Фасад).
 * Декомпозиция по Мандату 8b: легкий фасад (<= 200 строк), модули <= 500 строк.
 * 100% обратная совместимость типов и констант.
 */

export {
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

import type { FastClinicalPreset } from "./protocols/protocolTypes.js";
import { THERAPY_FAST_PRESETS } from "./protocols/therapyProtocols.js";
import { SURGERY_FAST_PRESETS } from "./protocols/surgeryProtocols.js";
import { PROSTHO_FAST_PRESETS } from "./protocols/prosthoProtocols.js";
import { HYGIENE_FAST_PRESETS } from "./protocols/perioAndHygieneProtocols.js";

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
