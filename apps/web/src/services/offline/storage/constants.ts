import {
	calibrateClockSkew,
	generateUuidV7,
	getAdjustedNowIso,
	getAdjustedNowMs,
	getGlobalClockSkew,
	isUuidV7,
	resetGlobalClockSkew,
	setGlobalClockSkew,
} from "@dental/shared";

export {
	calibrateClockSkew,
	generateUuidV7,
	getAdjustedNowIso,
	getAdjustedNowMs,
	getGlobalClockSkew,
	isUuidV7,
	resetGlobalClockSkew,
	setGlobalClockSkew,
};

export const OFFLINE_DB_NAME = "dente-crm-offline-outbox";
export const OFFLINE_DB_VERSION = 3;
export const MUTATIONS_STORE_NAME = "mutations";
export const DRAFTS_STORE_NAME = "drafts";
export const CLINICAL_CACHE_STORE_NAME = "clinical_cache";
export const SCHEDULES_CACHE_STORE_NAME = "schedules_cache";
export const PATIENTS_CACHE_STORE_NAME = "patients_cache";
export const ODONTOGRAM_CACHE_STORE_NAME = "odontogram_cache";
export const PRICELIST_CACHE_STORE_NAME = "pricelist_804n_cache";
export const ICD10_CACHE_STORE_NAME = "icd10_cache";

export const LOCAL_STORAGE_MUTATIONS_KEY = "dente_offline_mutations_v1";
export const LOCAL_STORAGE_DRAFTS_PREFIX = "dente_offline_draft_v1:";

export const VISIT_DRAFT_KEY_PREFIX = "dente_diary_draft_";
export const FORM_043_DRAFT_KEY_PREFIX = "dente_form043_draft_";
export const ODONTOGRAM_DRAFT_KEY_PREFIX = "dente_odontogram_draft_";
export const PRESCRIPTION_DRAFT_KEY_PREFIX = "dente_prescription_draft_";
export const CASH_RECEIPT_DRAFT_KEY_PREFIX = "dente_receipt_draft_";
export const APPOINTMENT_DRAFT_KEY_PREFIX = "dente_appointment_draft_";

export const DEFAULT_CLINICAL_AUTOSAVE_DEBOUNCE_MS = 3000;

export const LOCAL_STORAGE_CLINICAL_CACHE_PREFIX = "dente_clinical_cache_v1:";
export const LOCAL_STORAGE_SCHEDULES_PREFIX = "dente_schedule_cache_v1:";
export const LOCAL_STORAGE_PATIENTS_PREFIX = "dente_patient_cache_v1:";
export const LOCAL_STORAGE_ODONTOGRAM_PREFIX = "dente_odontogram_cache_v1:";
export const LOCAL_STORAGE_PRICELIST_PREFIX = "dente_pricelist_cache_v1:";
export const LOCAL_STORAGE_ICD10_PREFIX = "dente_icd10_cache_v1:";
export const DEFAULT_ICD10_DICTIONARY_ID = "icd10_dental_catalog";

export const DENTE_CACHED_DASHBOARD_KEY = "dente_cached_dashboard_v1";
export const DENTE_CACHED_CLINIC_PROFILE_KEY = "dente_cached_clinic_profile";
export const DENTE_CACHED_STAFF_LIST_KEY = "dente_cached_staff_list";
export const DENTE_CACHED_ACTIVE_STAFF_USER_KEY = "dente_cached_active_staff_user";
export const DENTE_OFFLINE_AUTONOMY_MODE_KEY = "dente_offline_autonomy_mode";
