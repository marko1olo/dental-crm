import type { DocumentTemplateVariableSpec } from "./types.js";
import { PATIENT_DOCUMENT_TEMPLATE_VARIABLES } from "./patientVariables.js";
import { REPRESENTATIVE_DOCUMENT_TEMPLATE_VARIABLES } from "./representativeVariables.js";
import { CLINIC_DOCUMENT_TEMPLATE_VARIABLES } from "./clinicVariables.js";
import { DOCTOR_DOCUMENT_TEMPLATE_VARIABLES } from "./doctorVariables.js";
import { CLINICAL_DOCUMENT_TEMPLATE_VARIABLES } from "./clinicalVariables.js";
import { FINANCIAL_DOCUMENT_TEMPLATE_VARIABLES } from "./financialVariables.js";

/**
 * Полный канонический реестр стандартизированных токенов подстановки
 * для печатных форм и медицинских документов Минздрава РФ.
 * Layer 2: Consolidated Master Registry.
 */
export const ALL_DOCUMENT_TEMPLATE_VARIABLES: readonly DocumentTemplateVariableSpec[] = [
	...PATIENT_DOCUMENT_TEMPLATE_VARIABLES,
	...REPRESENTATIVE_DOCUMENT_TEMPLATE_VARIABLES,
	...CLINIC_DOCUMENT_TEMPLATE_VARIABLES,
	...DOCTOR_DOCUMENT_TEMPLATE_VARIABLES,
	...CLINICAL_DOCUMENT_TEMPLATE_VARIABLES,
	...FINANCIAL_DOCUMENT_TEMPLATE_VARIABLES,
];
