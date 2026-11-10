/**
 * packages/shared/src/patients/dentePatientTagsCatalog.ts
 * Canonical DENTE Patient Tags & Clinical Presets Catalog (Mandates 8e, 8n, 8ap).
 */
import {
	PATIENT_TAG_CATEGORIES,
	PATIENT_TAG_CODES,
	PATIENT_TAGS_CATALOG,
	PATIENT_TAGS_MAP,
	type PatientTagCategory,
	type PatientTagCode,
	type PatientTagMeta,
	isRedAlertPatientTag,
} from "./tagsModules/tagDefinitions.js";

export type DentePatientTagPreset = PatientTagMeta;
export const DENTE_PATIENT_TAG_PRESETS: readonly DentePatientTagPreset[] = PATIENT_TAGS_CATALOG;

export {
	PATIENT_TAG_CATEGORIES,
	PATIENT_TAG_CODES,
	PATIENT_TAGS_CATALOG,
	PATIENT_TAGS_MAP,
	type PatientTagCategory,
	type PatientTagCode,
	type PatientTagMeta,
	isRedAlertPatientTag,
};

export * from "./patientTagsCatalog.js";
