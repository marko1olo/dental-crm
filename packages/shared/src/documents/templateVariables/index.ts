/**
 * Фасад реестра переменных шаблонов документов.
 * Layer 5: Public API Barrel.
 */

export type { DocumentTemplateVariableSpec } from "./types.js";
export { ALL_DOCUMENT_TEMPLATE_VARIABLES } from "./allVariables.js";

export { PATIENT_DOCUMENT_TEMPLATE_VARIABLES } from "./patientVariables.js";
export { REPRESENTATIVE_DOCUMENT_TEMPLATE_VARIABLES } from "./representativeVariables.js";
export { CLINIC_DOCUMENT_TEMPLATE_VARIABLES } from "./clinicVariables.js";
export { DOCTOR_DOCUMENT_TEMPLATE_VARIABLES } from "./doctorVariables.js";
export { FINANCIAL_DOCUMENT_TEMPLATE_VARIABLES } from "./financialVariables.js";
export {
	CLINICAL_DOCUMENT_TEMPLATE_VARIABLES,
	ALL_FDI_TEETH_NUMBERS,
	TEETH_DOCUMENT_TEMPLATE_VARIABLES,
} from "./clinicalVariables.js";
