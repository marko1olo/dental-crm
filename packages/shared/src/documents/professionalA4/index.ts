/**
 * index.ts
 *
 * Layer 5: Barrel реэкспорта всех компонентов профессионального движка документов A4.
 */

export type {
	A4ClinicRequisites,
	A4PatientRequisites,
	A4CustomerRequisites,
	A4DocumentServiceItem,
	A4DocumentContractData,
	A4DocumentActData,
	A4TreatmentPlanStageItem,
	A4DocumentTreatmentPlanData,
	A4DocumentMedicalCardData,
	A4DocumentInformedConsentData,
	A4DocumentPersonalDataConsentData,
} from "./types.js";

export {
	formatRubles,
	formatAmountInWordsRu,
	formatPassportString,
	formatAddressString,
	formatPhoneString,
	formatSnilsString,
	formatPolicyString,
	formatDateString,
	formatSignatoryString,
} from "./formatters.js";

export {
	A4_PRINT_BASE_STYLES,
} from "./styles.js";

export {
	generateA4PaidContractHtml,
} from "./contractBuilder.js";

export {
	generateA4InformedConsentHtml,
	generateA4PersonalDataConsentHtml,
} from "./consentBuilders.js";

export {
	generateA4CompletedWorksActHtml,
	generateA4TreatmentPlanHtml,
} from "./actAndPlanBuilders.js";

export {
	generateA4MedicalCardDiaryHtml,
} from "./medicalCardBuilder.js";
