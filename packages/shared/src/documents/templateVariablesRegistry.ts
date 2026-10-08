/**
 * Полный канонический реестр 74+ стандартизированных токенов подстановки
 * для печатных форм и медицинских документов Минздрава РФ.
 * Layer 5: Canonical Backward-Compatibility Facade (<50 lines).
 */

export type { DocumentTemplateVariableSpec } from "./templateVariables/index.js";
export {
	ALL_DOCUMENT_TEMPLATE_VARIABLES,
	PATIENT_DOCUMENT_TEMPLATE_VARIABLES,
	REPRESENTATIVE_DOCUMENT_TEMPLATE_VARIABLES,
	CLINIC_DOCUMENT_TEMPLATE_VARIABLES,
	DOCTOR_DOCUMENT_TEMPLATE_VARIABLES,
	FINANCIAL_DOCUMENT_TEMPLATE_VARIABLES,
	CLINICAL_DOCUMENT_TEMPLATE_VARIABLES,
	ALL_FDI_TEETH_NUMBERS,
	TEETH_DOCUMENT_TEMPLATE_VARIABLES,
} from "./templateVariables/index.js";
