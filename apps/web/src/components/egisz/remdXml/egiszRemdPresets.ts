/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD CDA R2 PRESETS & OID DICTIONARIES — DENTE DENTAL CRM
 * Russian Ministry of Health Statutory Registries & CDA R2 OIDs (043/u)
 * Facade module re-exporting atomic submodules (Mandate 8b: <= 120 lines)
 * ═══════════════════════════════════════════════════════════════════════════
 */

export {
	EGISZ_REMD_OIDS,
	EGISZ_DENTAL_SEMD_TYPES,
	type EgiszDentalSemdCode,
	FRMR_DOCTOR_POSITIONS,
} from "./remdOidsAndTypes";

export {
	FDI_ADULT_TEETH,
	FDI_CHILD_TEETH,
	ALL_FDI_TEETH,
	DENTAL_TOOTH_STATUS_DICTIONARY,
	DENTAL_SURFACES,
	COMMON_DENTAL_ICD10,
	COMMON_804N_DENTAL_SERVICES,
} from "./remdDentalDictionaries";

export {
	validateRussianSnils,
	validateRussianOgrn,
	validateRussianInn,
	validateOidFormat,
} from "./remdStatutoryValidators";

export {
	DEFAULT_EGISZ_CLINIC_PRESET,
	DEFAULT_EGISZ_DOCTOR_PRESET,
	SAMPLE_043U_PATIENT_PRESET,
} from "./remdDefaultPresets";
