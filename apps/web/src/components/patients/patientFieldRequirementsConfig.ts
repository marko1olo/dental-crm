// patientFieldRequirementsConfig.ts
// СНИЛС обязателен для электронной медкарты и Госуслуг (валидация в patientDraftValidator.ts)
export {
	DEFAULT_PATIENT_FIELD_REQUIREMENTS,
	PATIENT_FIELD_REQUIREMENTS_STORAGE_KEY,
	type PatientFieldRequirements,
	patientFieldRequirementsSchema,
} from "@dental/shared";

export type {
	AdvertisingSourceOption,
	PatientDraftValidationInput,
	PatientDraftValidationResult,
} from "./fieldRequirements/patientFieldRequirementsTypes";

export { DENTAL_ADVERTISING_SOURCES } from "./fieldRequirements/advertisingSourcesCatalog";
export {
	loadPatientFieldRequirements,
	savePatientFieldRequirements,
} from "./fieldRequirements/patientFieldRequirementsStorage";
export { validatePatientDraftWithRequirements } from "./fieldRequirements/patientDraftValidator";
