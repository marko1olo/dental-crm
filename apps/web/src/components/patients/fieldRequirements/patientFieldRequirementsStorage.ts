import {
	DEFAULT_PATIENT_FIELD_REQUIREMENTS,
	PATIENT_FIELD_REQUIREMENTS_STORAGE_KEY,
	type PatientFieldRequirements,
	patientFieldRequirementsSchema,
} from "@dental/shared";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../../lib/safeLocalStorage";

export function loadPatientFieldRequirements(): PatientFieldRequirements {
	try {
		const raw = safeLocalStorageGetItem(PATIENT_FIELD_REQUIREMENTS_STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw);
			const validated = patientFieldRequirementsSchema.safeParse(parsed);
			if (validated.success) return validated.data;
		}
	} catch {
		// fallback
	}
	return { ...DEFAULT_PATIENT_FIELD_REQUIREMENTS };
}

export function savePatientFieldRequirements(requirements: PatientFieldRequirements): void {
	const validated = patientFieldRequirementsSchema.parse(requirements);
	safeLocalStorageSetItem(PATIENT_FIELD_REQUIREMENTS_STORAGE_KEY, JSON.stringify(validated));
}
